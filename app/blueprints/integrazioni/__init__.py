"""Collegamenti con gli altri corsi.

POST /api/iscrizioni/executive — MasterExecutive Academy chiede l'account del gestionale ERP per una sua iscritta.
Protetto dalla chiave condivisa EXECUTIVE_API_KEY (intestazione X-Api-Key). Crea un allievo del gruppo «Executive Assistant (online)»
con password provvisoria da cambiare al primo accesso; se l'account con quell'email esiste già, restituisce solo il nome utente."""
import hmac
import os
import re
import secrets

from flask import Blueprint, jsonify, request

from ...db import GruppoAllievo, Utente, db

bp = Blueprint("integrazioni", __name__)


def _chiave_ok():
    attesa = os.environ.get("EXECUTIVE_API_KEY", "")
    return bool(attesa) and hmac.compare_digest(request.headers.get("X-Api-Key", ""), attesa)


def _username(email):
    base = re.sub(r"[^a-z0-9._-]", "", email.split("@")[0].lower())[:40] or "allieva"
    nome, n = base, 1
    while Utente.query.filter_by(username=nome).first():
        n += 1
        nome = f"{base}{n}"
    return nome


@bp.post("/api/iscrizioni/executive")
def iscrizione_executive():
    if not os.environ.get("EXECUTIVE_API_KEY"):
        return jsonify(errore="collegamento non configurato (EXECUTIVE_API_KEY)"), 503
    if not _chiave_ok():
        return jsonify(errore="chiave non valida"), 403
    d = request.get_json(silent=True) or {}
    email = str(d.get("email") or "").strip().lower()
    nome = " ".join(x for x in (str(d.get("nome") or "").strip(), str(d.get("cognome") or "").strip()) if x)
    if not re.match(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$", email):
        return jsonify(errore="email non valida"), 400
    u = Utente.query.filter(db.func.lower(Utente.email) == email, Utente.ruolo == "allievo").first()
    if u is not None:
        if db.session.get(GruppoAllievo, u.id) is None:
            db.session.add(GruppoAllievo(utente_id=u.id, gruppo="executive", origine="MasterExecutive Academy"))
            db.session.commit()
        return jsonify(gia_presente=True, username=u.username)
    pw = "erp-" + secrets.token_hex(3) + "-" + secrets.token_hex(2)
    u = Utente(username=_username(email), nome=nome or email, email=email, ruolo="allievo", deve_cambiare_password=True)
    u.imposta_password(pw)
    db.session.add(u)
    db.session.flush()
    db.session.add(GruppoAllievo(utente_id=u.id, gruppo="executive", origine="MasterExecutive Academy"))
    db.session.commit()
    return jsonify(gia_presente=False, username=u.username, password=pw), 201
