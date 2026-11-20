"""Anagrafica unica dei soggetti economici."""
from flask import Blueprint, render_template, redirect, url_for, request, flash
from flask_login import login_required
from decimal import Decimal, InvalidOperation
from extensions import db
from models import EconomicSubject, PaymentTerm, PaymentTermInstallment

parties_bp = Blueprint("parties", __name__, template_folder="../../templates/parties")


def _save_subject(subject=None):
    code = request.form.get("code", "").strip().upper()
    name = request.form.get("name", "").strip()
    is_customer = request.form.get("is_customer") == "on"
    is_supplier = request.form.get("is_supplier") == "on"
    if not code or not name:
        return None, "Codice e denominazione sono obbligatori."
    if not is_customer and not is_supplier:
        return None, "Seleziona almeno un ruolo: cliente o fornitore."
    duplicate = EconomicSubject.query.filter(EconomicSubject.code == code)
    if subject:
        duplicate = duplicate.filter(EconomicSubject.id != subject.id)
    if duplicate.first():
        return None, f"Esiste già il soggetto {code}."
    if subject is None:
        subject = EconomicSubject(code=code, name=name)
        db.session.add(subject)
    for field in ("name", "subject_type", "piva", "codice_fiscale", "indirizzo", "cap", "comune",
                  "provincia", "nazione", "email", "pec", "telefono", "codice_destinatario",
                  "payment_terms", "iban"):
        value = request.form.get(field, "").strip()
        setattr(subject, field, value or None)
    subject.code = code
    subject.nazione = subject.nazione or "IT"
    subject.codice_destinatario = (subject.codice_destinatario or "0000000").upper()
    subject.payment_terms = subject.payment_terms or "Netto 30gg"
    credit_limit_str = request.form.get("credit_limit", "").strip().replace(",", ".")
    if credit_limit_str:
        try:
            subject.credit_limit = Decimal(credit_limit_str)
        except InvalidOperation:
            return None, "Castelletto non valido — usa un numero (es. 5000 o 5000,50)."
    else:
        subject.credit_limit = None
    subject.split_payment = request.form.get("split_payment") == "on"
    payment_term_id = request.form.get("payment_term_id", type=int)
    subject.payment_term_id = payment_term_id if payment_term_id and PaymentTerm.query.get(payment_term_id) else None
    subject.is_customer = is_customer
    subject.is_supplier = is_supplier
    subject.active = request.form.get("active") == "on"
    return subject, None


@parties_bp.route("/", methods=["GET", "POST"])
@login_required
def party_list():
    if request.method == "POST":
        party, error = _save_subject()
        if error:
            flash(error, "danger")
        else:
            db.session.commit()
            flash(f"Soggetto economico {party.code} creato.", "success")
            return redirect(url_for("parties.party_list"))
    parties = EconomicSubject.query.order_by(EconomicSubject.name).all()
    payment_terms = PaymentTerm.query.filter_by(active=True).order_by(PaymentTerm.code).all()
    return render_template("parties/list.html", parties=parties, payment_terms=payment_terms)


@parties_bp.route("/<int:party_id>", methods=["GET", "POST"])
@login_required
def party_edit(party_id):
    party = EconomicSubject.query.get_or_404(party_id)
    if request.method == "POST":
        party, error = _save_subject(party)
        if error:
            flash(error, "danger")
        else:
            db.session.commit()
            flash("Soggetto economico aggiornato.", "success")
            return redirect(url_for("parties.party_list"))
    payment_terms = PaymentTerm.query.filter_by(active=True).order_by(PaymentTerm.code).all()
    return render_template("parties/edit.html", party=party, payment_terms=payment_terms)


# ══════════════════════════════════════════════════════════════
# TERMINI DI PAGAMENTO — anagrafica strutturata (più rate, giorni,
# fine mese) che guida DAVVERO il calcolo delle scadenze quando si
# registra una fattura (vedi services/payments.py::schedule_da_termine).
# ══════════════════════════════════════════════════════════════
@parties_bp.route("/termini-pagamento", methods=["GET", "POST"])
@login_required
def payment_term_list():
    if request.method == "POST":
        code = request.form.get("code", "").strip().upper()
        description = request.form.get("description", "").strip()
        payment_type = request.form.get("payment_type", "").strip()
        if not code or not description:
            flash("Codice e descrizione sono obbligatori.", "danger")
            return redirect(url_for("parties.payment_term_list"))
        if PaymentTerm.query.filter_by(code=code).first():
            flash(f"Il termine {code} esiste già.", "danger")
            return redirect(url_for("parties.payment_term_list"))

        numeri = request.form.getlist("rata_numero[]")
        percentuali = request.form.getlist("rata_percentuale[]")
        giorni_list = request.form.getlist("rata_giorni[]")
        fine_mese_list = request.form.getlist("rata_fine_mese[]")  # solo gli indici spuntati

        righe = []
        totale_pct = Decimal("0")
        for i, (num, pct, giorni) in enumerate(zip(numeri, percentuali, giorni_list)):
            if not pct or not giorni:
                continue
            try:
                pct_dec = Decimal(pct.replace(",", "."))
                giorni_int = int(giorni)
            except (InvalidOperation, ValueError):
                flash(f"Rata {num}: percentuale o giorni non validi.", "danger")
                return redirect(url_for("parties.payment_term_list"))
            totale_pct += pct_dec
            righe.append((int(num), pct_dec, giorni_int, str(i) in fine_mese_list))

        if not righe:
            flash("Inserisci almeno una rata.", "danger")
            return redirect(url_for("parties.payment_term_list"))
        if totale_pct != Decimal("100"):
            flash(f"Le percentuali delle rate devono sommare a 100 — ora sommano a {totale_pct}.", "danger")
            return redirect(url_for("parties.payment_term_list"))

        term = PaymentTerm(code=code, description=description, payment_type=payment_type or None)
        db.session.add(term)
        db.session.flush()
        for numero, pct, giorni, fine_mese in righe:
            db.session.add(PaymentTermInstallment(
                payment_term_id=term.id, numero_rata=numero, percentuale=pct,
                giorni=giorni, fine_mese=fine_mese,
            ))
        db.session.commit()
        flash(f"Termine di pagamento {code} creato con {len(righe)} rata/e.", "success")
        return redirect(url_for("parties.payment_term_list"))

    terms = PaymentTerm.query.order_by(PaymentTerm.code).all()
    return render_template("parties/payment_terms.html", terms=terms)


@parties_bp.route("/termini-pagamento/<int:term_id>/elimina", methods=["POST"])
@login_required
def payment_term_delete(term_id):
    term = PaymentTerm.query.get_or_404(term_id)
    in_uso = EconomicSubject.query.filter_by(payment_term_id=term.id).count()
    if in_uso:
        flash(f"Impossibile eliminare {term.code}: usato da {in_uso} soggetto/i economico/i. "
              "Cambia prima il loro termine di pagamento.", "danger")
        return redirect(url_for("parties.payment_term_list"))
    db.session.delete(term)
    db.session.commit()
    flash(f"Termine di pagamento {term.code} eliminato.", "success")
    return redirect(url_for("parties.payment_term_list"))
