"""Accesso unico dal portale MASTERSAPSTYLE al servizio FI/CO (STYLESAPFICO, Fase B).

Il portale firma un biglietto con la SECRET_KEY del FI/CO (variabile
MASTERLEDGER_FICO_SECRET_KEY, nota a entrambi perché girano nello stesso
servizio). Il biglietto dura 2 minuti e si usa UNA volta sola. Qui si crea o
aggiorna l'utente FI/CO collegato («portale-<id>») e si apre la sessione.

Allievi del portale = utenti «operatore» confinati nella propria azienda
didattica (vedi guardia_allievi). Docente del portale = «commercialista».
"""
import secrets
from datetime import datetime

from flask import abort, current_app, redirect, request, session, url_for
from flask_login import current_user
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from extensions import db
from models import AcademyBridgeTicket, AcademySession, InvoiceInstallment, JournalEntry, User

SALT = "mastersapstyle-ponte-fico-v1"
DURATA_SECONDI = 120
PREFISSO = "portale-"


def serializer(secret):
    return URLSafeTimedSerializer(secret, salt=SALT)


def leggi_biglietto(token):
    try:
        data = serializer(current_app.config["SECRET_KEY"]).loads(token, max_age=DURATA_SECONDI)
    except SignatureExpired:
        raise ValueError("Collegamento scaduto: torna al portale e riapri il programma FI/CO.")
    except BadSignature:
        raise ValueError("Collegamento non valido.")
    if not isinstance(data, dict) or not all(k in data for k in ("uid", "nome", "ruolo", "nonce")):
        raise ValueError("Collegamento non valido.")
    if AcademyBridgeTicket.query.filter_by(nonce=str(data["nonce"])).first():
        raise ValueError("Collegamento già usato: torna al portale e riapri il programma FI/CO.")
    db.session.add(AcademyBridgeTicket(nonce=str(data["nonce"])[:64], portal_user_id=int(data["uid"])))
    return data


def utente_da_portale(data):
    username = f"{PREFISSO}{int(data['uid'])}"
    role = "commercialista" if data["ruolo"] == "docente" else "operatore"
    u = User.query.filter_by(username=username).first()
    if u is None:
        u = User(username=username, full_name=str(data["nome"])[:120] or username, role=role, portal="ledger")
        u.set_password(secrets.token_urlsafe(32))  # password inutilizzabile: si entra solo dal portale
        db.session.add(u)
    u.full_name = str(data["nome"])[:120] or username
    u.role = role
    u.portal = "ledger"
    u.is_active_flag = True
    db.session.commit()
    return u


def is_allievo(user):
    return (getattr(user, "is_authenticated", False) and str(user.username).startswith(PREFISSO)
            and user.role != "commercialista")


def sessione_corrente(user):
    return (AcademySession.query.filter_by(user_id=user.id, is_active=True)
            .order_by(AcademySession.updated_at.desc(), AcademySession.id.desc()).first())


# Pagine che un allievo può usare: quelle del percorso. Tutto il resto del
# gestionale (configurazione, MM/SD, paghe, AI, integrazioni) resta chiuso.
SEMPRE = {"academy", "static"}
SEMPRE_EP = {"auth.logout", "auth.login"}
OPERATIVE = {
    "ar.customer_invoice", "ap.supplier_invoice",
    "gl.scadenzario", "gl.scadenzario_paga", "gl.journal_entry", "gl.journal_list", "gl.entry_detail",
    "gl.entry_reverse", "gl.libro_mastro", "gl.piano_conti", "gl.mastrino_conto", "gl.partitario",
    "gl.cost_centers_list", "gl.cost_center_ledger", "costs.report", "costs.cost_centers",
    "chiusure.bilancio_verifica", "chiusure.bilancio", "tcode.elenco", "tcode.vai",
}


def guardia_allievi():
    """before_request: confina l'allievo nella sua azienda didattica."""
    if not is_allievo(current_user):
        return None
    from services.azienda_corrente import SESSION_KEY
    ep = request.endpoint or ""
    s = sessione_corrente(current_user)
    if s is not None:
        session[SESSION_KEY] = s.company_id       # nessuna scelta «Tutte le aziende» o azienda altrui
    else:
        session.pop(SESSION_KEY, None)
    if ep.split(".")[0] in SEMPRE or ep in SEMPRE_EP:
        return None
    if ep not in OPERATIVE:
        abort(403)
    if s is None:
        return redirect(url_for("academy.percorsi"))
    # documenti aperti per numero: solo quelli della propria azienda
    entry_id = (request.view_args or {}).get("entry_id")
    if entry_id is not None:
        e = db.session.get(JournalEntry, entry_id)
        if e is None or e.company_id != s.company_id:
            abort(404)
    if ep == "gl.scadenzario_paga":
        ids = request.form.getlist("installment_id[]", type=int) or request.args.getlist("installment_id", type=int)
        for inst in InvoiceInstallment.query.filter(InvoiceInstallment.id.in_(ids)).all() if ids else []:
            if inst.entry is None or inst.entry.company_id != s.company_id:
                abort(404)
    return None


def aziende_visibili(user):
    """Per il selettore in alto: l'allievo vede solo le proprie aziende didattiche."""
    from models import Company
    if is_allievo(user):
        ids = [x.company_id for x in AcademySession.query.filter_by(user_id=user.id, is_active=True)]
        return Company.query.filter(Company.id.in_(ids)).all() if ids else []
    return Company.query.filter_by(active=True).order_by(Company.name).all()
