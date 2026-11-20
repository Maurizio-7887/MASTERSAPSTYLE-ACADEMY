"""
blueprints/bank_advances/routes.py — RiBa "salvo buon fine" e Anticipo
Fatture (vedi services/bank_advances.py per la logica contabile).

  - /banche/anticipi                → lista distinte + rate ancora aperte da anticipare
  - /banche/anticipi/nuovo          → crea una nuova distinta (RiBa SBF o Anticipo Fatture)
  - /banche/anticipi/<id>           → dettaglio distinta, righe con esito
  - /banche/anticipi/riga/<id>/buon-fine  → registra il buon fine di UNA riga
  - /banche/anticipi/riga/<id>/insoluto   → registra l'insoluto di UNA riga
"""
from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, render_template, request, redirect, url_for, flash, Response
from flask_login import login_required, current_user

from extensions import db
from models import BankAdvance, BankAdvanceLine, InvoiceInstallment, JournalEntry
from services.bank_advances import presenta_distinta, registra_buon_fine, registra_insoluto, BankAdvanceError
from services.riba_cbi import genera_flusso_riba_cbi, RibaCbiError
from services.azienda_corrente import get_azienda_corrente

bank_advances_bp = Blueprint("bank_advances", __name__, template_folder="../../templates/bank_advances")


def _rate_clienti_anticipabili():
    """Rate cliente (fatture DR) ancora aperte e NON già dentro una
    distinta di anticipo ancora in corso — le uniche selezionabili per
    una nuova distinta."""
    gia_in_distinta = {
        l.installment_id for l in BankAdvanceLine.query.filter_by(esito="in_corso").all()
    }
    rate = (
        InvoiceInstallment.query.join(JournalEntry)
        .filter(JournalEntry.doc_type == "DR", JournalEntry.is_reversed.is_(False),
                InvoiceInstallment.residual_amount > 0)
        .order_by(InvoiceInstallment.due_date)
        .all()
    )
    return [r for r in rate if r.id not in gia_in_distinta]


@bank_advances_bp.route("/anticipi")
@login_required
def lista():
    azienda = get_azienda_corrente()
    query = BankAdvance.query
    if azienda:
        query = query.filter(BankAdvance.company_id == azienda.id)
    distinte = query.order_by(BankAdvance.doc_date.desc()).all()
    return render_template("bank_advances/lista.html", distinte=distinte)


@bank_advances_bp.route("/anticipi/nuovo", methods=["GET", "POST"])
@login_required
def nuovo():
    azienda = get_azienda_corrente()
    rate_disponibili = _rate_clienti_anticipabili()

    if request.method == "POST":
        tipo = request.form.get("tipo")
        oneri = request.form.get("bank_charges_amount", "0")
        raw_ids = request.form.getlist("installment_ids[]")

        righe = []
        for iid in raw_ids:
            amount_raw = request.form.get(f"amount_{iid}", "")
            try:
                inst_id = int(iid)
            except (TypeError, ValueError):
                continue
            row = {"installment_id": inst_id}
            if amount_raw.strip():
                try:
                    row["amount"] = Decimal(amount_raw.replace(",", "."))
                except InvalidOperation:
                    flash(f"Importo non valido per la rata #{iid}.", "danger")
                    return redirect(url_for("bank_advances.nuovo"))
            righe.append(row)

        try:
            advance = presenta_distinta(
                tipo=tipo, righe=righe,
                bank_charges_amount=oneri, doc_date=date.today(),
                created_by_id=current_user.id, company_id=azienda.id if azienda else None,
            )
            flash(f"Distinta {advance.doc_number} presentata in banca — netto accreditato {advance.net_credited:.2f} €.", "success")
            return redirect(url_for("bank_advances.dettaglio", advance_id=advance.id))
        except BankAdvanceError as e:
            db.session.rollback()
            flash(str(e), "danger")

    return render_template("bank_advances/nuovo.html", rate_disponibili=rate_disponibili)


@bank_advances_bp.route("/anticipi/<int:advance_id>")
@login_required
def dettaglio(advance_id):
    advance = BankAdvance.query.get_or_404(advance_id)
    return render_template("bank_advances/dettaglio.html", advance=advance)


@bank_advances_bp.route("/anticipi/<int:advance_id>/flusso-cbi")
@login_required
def flusso_cbi(advance_id):
    advance = BankAdvance.query.get_or_404(advance_id)
    try:
        contenuto = genera_flusso_riba_cbi(advance)
    except RibaCbiError as e:
        flash(str(e), "danger")
        return redirect(url_for("bank_advances.dettaglio", advance_id=advance_id))
    return Response(
        contenuto, mimetype="text/plain",
        headers={"Content-Disposition": f"attachment; filename=RIBA_{advance.doc_number}.CBI"},
    )


@bank_advances_bp.route("/anticipi/riga/<int:line_id>/buon-fine", methods=["POST"])
@login_required
def buon_fine(line_id):
    line = BankAdvanceLine.query.get_or_404(line_id)
    try:
        registra_buon_fine(line_id, created_by_id=current_user.id)
        flash("Buon fine registrato — credito cliente e debito verso la banca chiusi.", "success")
    except BankAdvanceError as e:
        db.session.rollback()
        flash(str(e), "danger")
    return redirect(url_for("bank_advances.dettaglio", advance_id=line.advance_id))


@bank_advances_bp.route("/anticipi/riga/<int:line_id>/insoluto", methods=["POST"])
@login_required
def insoluto(line_id):
    line = BankAdvanceLine.query.get_or_404(line_id)
    try:
        registra_insoluto(line_id, created_by_id=current_user.id)
        flash("Insoluto registrato — il credito verso il cliente è di nuovo aperto.", "warning")
    except BankAdvanceError as e:
        db.session.rollback()
        flash(str(e), "danger")
    return redirect(url_for("bank_advances.dettaglio", advance_id=line.advance_id))
