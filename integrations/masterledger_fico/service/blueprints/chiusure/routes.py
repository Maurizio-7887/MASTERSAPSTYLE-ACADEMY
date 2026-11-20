"""Fase 2 FI: bilanci, IVA, chiusure, ratei e risconti, FB02, pareggi."""
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from flask import Blueprint, render_template, request, redirect, url_for, flash, abort
from flask_login import login_required, current_user

from extensions import db
from models import Account, CostCenter, EconomicSubject, JournalEntry
from blueprints.decorators import commercialista_required
from services.azienda_corrente import get_azienda_corrente
from services.posting import UnbalancedEntryError, PeriodClosedError

chiusure_bp = Blueprint("chiusure", __name__)
ERRORI = (ValueError, UnbalancedEntryError, PeriodClosedError)


def _azienda_id():
    a = get_azienda_corrente()
    return a.id if a else None


def _data(nome, default):
    raw = (request.values.get(nome) or "").strip()
    if not raw:
        return default
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        flash(f"Data non valida: {raw}", "danger")
        return default


def _intero(nome, default):
    try:
        return int(request.values.get(nome) or default)
    except (TypeError, ValueError):
        return default


# ── Bilancio di verifica e bilancio ─────────────────────────────

@chiusure_bp.get("/bilancio-verifica")
@login_required
def bilancio_verifica():
    from services.bilancio import bilancio_di_verifica
    oggi = date.today()
    dal = _data("dal", date(oggi.year, 1, 1))
    al = _data("al", oggi)
    includi = request.args.get("includi_chiusure") == "1"
    try:
        bv = bilancio_di_verifica(dal, al, _azienda_id(), escludi_chiusure=not includi)
    except ValueError as exc:
        flash(str(exc), "danger")
        return redirect(url_for("chiusure.bilancio_verifica"))
    return render_template("chiusure/bilancio_verifica.html", bv=bv, includi=includi)


@chiusure_bp.get("/bilancio")
@login_required
def bilancio():
    from services.bilancio import bilancio as calcola
    oggi = date.today()
    al = _data("al", oggi)
    return render_template("chiusure/bilancio.html", b=calcola(al, _azienda_id()))


# ── IVA ─────────────────────────────────────────────────────────

@chiusure_bp.get("/registri-iva")
@login_required
def registri_iva():
    from services.iva import registri, IvaError
    oggi = date.today()
    dal = _data("dal", date(oggi.year, oggi.month, 1))
    al = _data("al", oggi)
    try:
        r = registri(dal, al, _azienda_id())
    except IvaError as exc:
        flash(str(exc), "danger")
        r = None
    return render_template("chiusure/registri_iva.html", r=r, dal=dal, al=al)


@chiusure_bp.route("/liquidazione-iva", methods=["GET", "POST"])
@login_required
def liquidazione_iva():
    from services.iva import calcola_liquidazione, registra_liquidazione, annulla_liquidazione, periodicita, IvaError
    from services.chiusura import richiedi_azienda
    oggi = date.today()
    tipo = periodicita()
    anno = _intero("anno", oggi.year)
    numero = _intero("numero", oggi.month if tipo == "mensile" else (oggi.month - 1) // 3 + 1)
    if request.method == "POST":
        if not current_user.is_commercialista:
            abort(403)
        try:
            richiedi_azienda(_azienda_id())
            if request.form.get("azione") == "annulla":
                s = annulla_liquidazione(anno, numero, _azienda_id(), current_user.id)
                flash(f"Liquidazione annullata con lo storno {s.doc_number}.", "success")
            else:
                entry, calc = registra_liquidazione(anno, numero, _azienda_id(), current_user.id)
                flash(f"Liquidazione {calc['etichetta']} registrata: documento {entry.doc_number}.", "success")
        except ERRORI as exc:
            db.session.rollback()
            flash(str(exc), "danger")
        return redirect(url_for("chiusure.liquidazione_iva", anno=anno, numero=numero))
    try:
        calc = calcola_liquidazione(anno, numero, _azienda_id(), tipo)
    except IvaError as exc:
        flash(str(exc), "danger")
        calc = None
    return render_template("chiusure/liquidazione_iva.html", calc=calc, anno=anno, numero=numero, tipo=tipo)


# ── Chiusura e riapertura esercizio ─────────────────────────────

@chiusure_bp.route("/esercizio", methods=["GET", "POST"])
@login_required
def esercizio():
    from services.chiusura import anteprima, stato, chiudi_esercizio, annulla_chiusura
    anno = _intero("anno", date.today().year - 1)
    if request.method == "POST":
        if not current_user.is_commercialista:
            abort(403)
        try:
            if request.form.get("azione") == "annulla":
                docs = annulla_chiusura(anno, _azienda_id(), current_user.id)
                flash(f"Chiusura {anno} annullata: stornati {len(docs)} documenti.", "success")
            else:
                creati, _ = chiudi_esercizio(anno, _azienda_id(), current_user.id)
                numeri = ", ".join(d.doc_number for d in creati.values())
                flash(f"Esercizio {anno} chiuso e riaperto al 1/1/{anno + 1}: documenti {numeri}.", "success")
        except ERRORI as exc:
            db.session.rollback()
            flash(str(exc), "danger")
        return redirect(url_for("chiusure.esercizio", anno=anno))
    return render_template("chiusure/esercizio.html", anno=anno, prev=anteprima(anno, _azienda_id()),
                           st=stato(anno, _azienda_id()))


# ── Ratei e risconti (FBS1) e storno automatico (F.81) ──────────

@chiusure_bp.route("/ratei-risconti", methods=["GET", "POST"])
@login_required
def ratei_risconti():
    from services.ratei import TIPI, registra, da_stornare, quota_giorni, RateiError
    oggi = date.today()
    calcolo = None
    if request.method == "POST" and request.form.get("azione") == "calcola":
        try:
            calcolo = quota_giorni(Decimal(request.form.get("totale") or "0"),
                                   _data("periodo_dal", oggi), _data("periodo_al", oggi),
                                   _data("competenza_al", date(oggi.year, 12, 31)),
                                   "futura" if request.form.get("tipo", "").startswith("risconto") else "maturata")
        except (RateiError, InvalidOperation) as exc:
            flash(str(exc) or "Importo non valido.", "danger")
    elif request.method == "POST":
        try:
            e = registra(request.form.get("tipo"), _data("data", date(oggi.year, 12, 31)),
                         _data("data_storno", None), request.form.get("account_id", type=int),
                         request.form.get("importo"), (request.form.get("descrizione") or "").strip(),
                         request.form.get("cost_center_id", type=int), _azienda_id(), current_user.id)
            flash(f"Registrato {e.doc_number}, storno automatico al {e.reversal_date:%d/%m/%Y}.", "success")
            return redirect(url_for("chiusure.ratei_risconti"))
        except (RateiError, InvalidOperation) + ERRORI as exc:
            db.session.rollback()
            flash(str(exc), "danger")
    conti = Account.query.filter(Account.active.is_(True), Account.account_type.in_(("costo", "ricavo"))) \
        .order_by(Account.code).all()
    centri = CostCenter.query.filter_by(active=True).order_by(CostCenter.code).all()
    q = JournalEntry.query.filter(JournalEntry.doc_type == "RR", JournalEntry.reverses_id.is_(None))
    if _azienda_id():
        q = q.filter(JournalEntry.company_id == _azienda_id())
    registrati = q.order_by(JournalEntry.posting_date.desc()).limit(100).all()
    return render_template("chiusure/ratei_risconti.html", tipi=TIPI, conti=conti, centri=centri,
                           registrati=registrati, calcolo=calcolo, form=request.form,
                           in_scadenza=len(da_stornare(oggi, _azienda_id())), oggi=oggi)


@chiusure_bp.post("/ratei-risconti/storni")
@login_required
def ratei_storni():
    from services.ratei import esegui_storni
    fino_al = _data("fino_al", date.today())
    try:
        fatti = esegui_storni(fino_al, _azienda_id(), current_user.id)
        flash(f"F.81: generati {len(fatti)} storni fino al {fino_al:%d/%m/%Y}.", "success" if fatti else "info")
    except ERRORI as exc:
        db.session.rollback()
        flash(str(exc), "danger")
    return redirect(url_for("chiusure.ratei_risconti"))


# ── FB02 modifica documento ─────────────────────────────────────

@chiusure_bp.route("/documento/<int:entry_id>/modifica", methods=["GET", "POST"])
@login_required
def modifica_documento(entry_id):
    from services.documenti import modifica_testi, DocumentoError, RIFERIMENTO_BLOCCATO
    entry = db.session.get(JournalEntry, entry_id) or abort(404)
    az = _azienda_id()
    if az and entry.company_id != az:
        abort(404)
    if request.method == "POST":
        testi = {}
        for k, v in request.form.items():
            if k.startswith("riga_"):
                try:
                    testi[int(k[5:])] = v
                except ValueError:
                    continue
        try:
            n = modifica_testi(entry, request.form.get("description"), request.form.get("reference"),
                               testi, current_user.id)
            flash(f"Documento {entry.doc_number}: {n} campi modificati." if n else "Nessuna modifica.",
                  "success" if n else "info")
            return redirect(url_for("chiusure.modifica_documento", entry_id=entry.id))
        except DocumentoError as exc:
            db.session.rollback()
            flash(str(exc), "danger")
    return render_template("chiusure/fb02.html", entry=entry, rif_bloccato=entry.doc_type in RIFERIMENTO_BLOCCATO)


@chiusure_bp.get("/documento")
@login_required
def cerca_documento():
    numero = (request.args.get("numero") or "").strip()
    if not numero:
        return render_template("chiusure/fb02.html", entry=None, rif_bloccato=False)
    q = JournalEntry.query.filter_by(doc_number=numero)
    if _azienda_id():
        q = q.filter(JournalEntry.company_id == _azienda_id())
    trovati = q.all()
    if len(trovati) == 1:
        return redirect(url_for("chiusure.modifica_documento", entry_id=trovati[0].id))
    flash("Documento non trovato." if not trovati else
          "Più documenti con questo numero: seleziona l'azienda in alto.", "warning")
    return render_template("chiusure/fb02.html", entry=None, rif_bloccato=False)


# ── Pareggio partite (F-32 clienti, F-44 fornitori) ─────────────

@chiusure_bp.route("/pareggio/<lato>", methods=["GET", "POST"])
@login_required
def pareggio(lato):
    from services.pareggio import LATI, note_aperte, rate_aperte, pareggia, annulla, importo_nota, PareggioError
    if lato not in LATI:
        abort(404)
    if request.method == "POST":
        nota_id = request.form.get("nota_id", type=int)
        try:
            if request.form.get("azione") == "annulla":
                annulla(nota_id, current_user.id)
                flash("Pareggio annullato.", "success")
            else:
                importi = {int(k[5:]): v for k, v in request.form.items() if k.startswith("rata_") and v.strip()}
                tot = pareggia(lato, nota_id, importi, current_user.id, _azienda_id())
                flash(f"Pareggio registrato: {tot} € compensati.", "success")
                return redirect(url_for("chiusure.pareggio", lato=lato))
        except (PareggioError, ValueError) as exc:
            db.session.rollback()
            flash(str(exc), "danger")
        return redirect(url_for("chiusure.pareggio", lato=lato, nota_id=nota_id))
    note = note_aperte(lato, _azienda_id())
    nota = None
    nota_id = request.args.get("nota_id", type=int)
    if nota_id:
        nota = next((n for n in note if n.id == nota_id), None)
    rate = rate_aperte(lato, nota.economic_subject_id, _azienda_id()) if nota else []
    from models import PaymentAllocation
    pareggiate_q = (JournalEntry.query.filter(JournalEntry.id.in_(
        db.session.query(PaymentAllocation.payment_entry_id).filter(PaymentAllocation.reversed.is_(False))))
        .filter(JournalEntry.doc_type == ("DG" if lato == "clienti" else "KR")))
    if _azienda_id():
        pareggiate_q = pareggiate_q.filter(JournalEntry.company_id == _azienda_id())
    pareggiate = [e for e in pareggiate_q.all() if lato == "clienti" or (e.gross_amount or 0) < 0]
    return render_template("chiusure/pareggio.html", lato=lato, note=note, nota=nota, rate=rate,
                           importo_nota=importo_nota, pareggiate=pareggiate)
