from datetime import datetime, date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from calendar import monthrange
from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user

from extensions import db
from models import Account, AccountMapping, Asset, CostCenter, FiscalParameter, JournalEntry
from services.posting import post_journal_entry, UnbalancedEntryError
from services.co import validate_co_assignment, COValidationError
from services.azienda_corrente import get_azienda_corrente

assets_bp = Blueprint("assets", __name__, template_folder="../../templates/assets")


def _get_account_by_code(code):
    acc = Account.query.filter_by(code=code).first()
    if acc is None:
        raise ValueError(f"Conto {code} non trovato. Esegui 'flask seed' prima di continuare.")
    return acc


def _fiscal_param(key, default=None):
    p = FiscalParameter.query.filter_by(key=key).first()
    return p.value if p else default


@assets_bp.route("/")
@login_required
def asset_list():
    assets = Asset.query.filter_by(active=True).order_by(Asset.code).all()
    return render_template("assets/asset_list.html", assets=assets)


@assets_bp.route("/asset_create", methods=["GET", "POST"])
@login_required
def asset_create():
    """Capitalizzazione cespite — Creazione anagrafica cespite e capitalizzazione."""
    # L'aliquota di default proposta viene dal pannello del Commercialista —
    # l'operatore la vede precompilata ma può cambiarla per il singolo cespite
    # se il Commercialista ha indicato un caso diverso (giudizio professionale).
    default_rate_impianti = _fiscal_param("ammortamento_aliquota_impianti", "10")
    cost_centers = CostCenter.query.filter_by(active=True).order_by(CostCenter.name).all()
    azienda = get_azienda_corrente()

    if request.method == "POST":
        description = request.form.get("description", "").strip()
        category = request.form.get("category", "Impianti e Macchinari")
        cost_center_id = request.form.get("cost_center_id", type=int) or None
        try:
            value = Decimal(request.form.get("value", "0").replace(",", "."))
            vat_rate = Decimal(request.form.get("vat_rate", "22").replace(",", "."))
            useful_life = int(request.form.get("useful_life", "10"))
            acq_date_str = request.form.get("acquisition_date")
            acq_date = datetime.strptime(acq_date_str, "%Y-%m-%d").date() if acq_date_str else date.today()
        except (InvalidOperation, ValueError, TypeError):
            flash("Valore, aliquota, vita utile o data non validi.", "danger")
            return render_template("assets/asset_create.html", default_rate=default_rate_impianti,
                                   cost_centers=cost_centers)

        if not description or not value.is_finite() or value <= 0:
            flash("Descrizione e valore positivo sono obbligatori.", "danger")
            return render_template("assets/asset_create.html", default_rate=default_rate_impianti,
                                   cost_centers=cost_centers)
        if not vat_rate.is_finite() or vat_rate < 0 or vat_rate > 100 or useful_life <= 0:
            flash("Aliquota IVA (0-100) e vita utile positiva non validi.", "danger")
            return render_template("assets/asset_create.html", default_rate=default_rate_impianti,
                                   cost_centers=cost_centers)

        value = value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        vat = (value * vat_rate / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        asset_code = f"A-{Asset.query.count() + 1:05d}"
        asset = Asset(
            code=asset_code, description=description, acquisition_value=value,
            acquisition_date=acq_date, asset_category=category, useful_life_years=useful_life,
            cost_center_id=cost_center_id, company_id=azienda.id if azienda else None,
        )
        db.session.add(asset)
        db.session.flush()

        try:
            asset_account = AccountMapping.get_or_error("cespiti_impianti")
            vat_account = AccountMapping.get_or_error("iva_credito")
            ap_account = AccountMapping.get_or_error("debiti_fornitori")

            lines = [
                {"account_id": asset_account.id, "dare": value, "avere": 0},
                {"account_id": vat_account.id, "dare": vat, "avere": 0},
                {"account_id": ap_account.id, "dare": 0, "avere": value + vat},
            ]
            entry = post_journal_entry(
                doc_type="Cespiti", prefix="20",
                doc_date=acq_date, description=f"Capitalizzazione Cespite {asset_code} — {description}",
                lines=lines, source_module="LEDGER", reference=asset_code, created_by_id=current_user.id,
                commit=False, company_id=azienda.id if azienda else None,
            )
            db.session.commit()
            flash(f"Cespite {asset_code} capitalizzato. Doc. {entry.doc_number} — Valore {value:.2f} €.", "success")
            return redirect(url_for("assets.asset_list"))
        except (UnbalancedEntryError, ValueError) as e:
            db.session.rollback()
            flash(str(e), "danger")

    return render_template("assets/asset_create.html", default_rate=default_rate_impianti,
                           cost_centers=cost_centers)


@assets_bp.route("/depreciation", methods=["GET", "POST"])
@login_required
def depreciation():
    """Ammortamenti — Ammortamento periodico su tutti i cespiti attivi."""
    azienda = get_azienda_corrente()
    assets_query = Asset.query.filter_by(active=True)
    if azienda:
        assets_query = assets_query.filter(Asset.company_id == azienda.id)
    assets = assets_query.all()

    if request.method == "POST":
        try:
            period = int(request.form.get("period", "12"))
            year = int(request.form.get("year", str(date.today().year)))
            if period < 1 or period > 12 or year < 1900 or year > 9999:
                raise ValueError
        except (TypeError, ValueError):
            flash("Periodo o esercizio non valido.", "danger")
            return redirect(url_for("assets.depreciation"))

        reference = f"{period:02d}/{year}"
        # Il controllo "già contabilizzato" è per AZIENDA: lo stesso periodo
        # 06/2026 va ammortizzato una volta per Iron Segnaletica e una volta
        # per Iron Wood, sono due libri giornale distinti — senza il filtro
        # company_id qui, la seconda azienda risulterebbe bloccata a torto.
        # Nessuna azienda selezionata = comportamento di sempre (un'unica
        # sequenza, nessuna azienda), stesso principio non invasivo usato
        # in tutto il resto del sistema.
        if JournalEntry.query.filter_by(doc_type="AF", reference=reference, is_reversed=False,
                                        company_id=azienda.id if azienda else None).first():
            flash(f"L'ammortamento del periodo {reference}"
                  f"{' per ' + azienda.name if azienda else ''} è già stato contabilizzato.", "warning")
            return redirect(url_for("assets.depreciation"))

        period_end = date(year, period, monthrange(year, period)[1])
        total_dep = Decimal("0")
        affected = 0
        dep_by_cost_center = {}  # {cost_center_id or None: Decimal}
        for a in assets:
            if a.acquisition_date and a.acquisition_date > period_end:
                continue
            value = Decimal(str(a.acquisition_value or 0))
            accumulated = Decimal(str(a.accumulated_depreciation or 0))
            remaining = max(Decimal("0"), value - accumulated)
            if remaining == 0:
                continue
            monthly_dep = (value / (max(a.useful_life_years, 1) * 12)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
            dep = min(monthly_dep, remaining)
            if dep <= 0:
                continue
            total_dep += dep
            a.accumulated_depreciation = accumulated + dep
            affected += 1
            dep_by_cost_center[a.cost_center_id] = dep_by_cost_center.get(a.cost_center_id, Decimal("0")) + dep

        if total_dep <= 0:
            flash("Nessun cespite ammortizzabile nel periodo selezionato.", "warning")
            return redirect(url_for("assets.depreciation"))

        try:
            dep_account = AccountMapping.get_or_error("ammortamenti_costo")
            fund_account = AccountMapping.get_or_error("fondo_ammortamento")
            # Una riga Dare per ogni Centro di Costo/Ricavo (ASA) coinvolto,
            # non un'unica riga aggregata su tutti i cespiti: altrimenti
            # l'ammortamento di una saldatrice di CC-SALD-01 e di un
            # macchinario di CC-CARP-01 finirebbero mescolati, rendendo
            # inutile il margine per ASA che il centro di costo dovrebbe dare.
            # Un cespite senza centro assegnato blocca con un errore chiaro
            # (stesso principio già in Fatturazione DDT/Entrata Merci) invece
            # di finire silenziosamente in "Non assegnato".
            lines = []
            for cc_id, dep in dep_by_cost_center.items():
                _, cost_center = validate_co_assignment(dep_account.id, cc_id)
                lines.append({"account_id": dep_account.id, "dare": dep, "avere": 0,
                              "description": f"Ammortamento {reference}"
                                            + (f" — {cost_center.name}" if cost_center else ""),
                              "cost_center_id": cost_center.id if cost_center else None})
            lines.append({"account_id": fund_account.id, "dare": 0, "avere": total_dep})
            entry = post_journal_entry(
                doc_type="AF", prefix="21", doc_date=period_end,
                description=f"Ammortamento mensile — Periodo {reference}"
                            + (f" — {azienda.name}" if azienda else ""),
                lines=lines, source_module="LEDGER", reference=reference,
                created_by_id=current_user.id, commit=False, company_id=azienda.id if azienda else None,
            )
            db.session.commit()
            flash(f"Ammortamento {reference} completato. Doc. {entry.doc_number} — "
                  f"totale {total_dep:.2f} € su {affected} cespiti.", "success")
            return redirect(url_for("gl.entry_detail", entry_id=entry.id))
        except (UnbalancedEntryError, ValueError, COValidationError) as e:
            db.session.rollback()
            flash(str(e), "danger")

    return render_template("assets/depreciation.html", assets=assets, current_year=date.today().year)
