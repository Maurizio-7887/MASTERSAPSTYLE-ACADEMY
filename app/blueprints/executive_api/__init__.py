"""Provisioning ERP didattico per allievi Executive Assistant iscritti.
Endpoint solo server-to-server con chiave condivisa; nessun accesso pubblico senza chiave.
"""
import os
import re
import secrets

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from ...db import Utente, db

bp = Blueprint("executive_api", __name__)


def _username(email):
    local=email.split("@",1)[0].lower()
    local=re.sub(r"[^a-z0-9.-]", "-",local).strip(".-")
    local=local[:34] or "allievo"
    return "exa-" + local


@bp.post("/api/iscrizioni/executive")
def iscrivi_executive():
    expected=os.environ.get("EXECUTIVE_API_KEY", "")
    provided=request.headers.get("X-Api-Key", "")
    if len(expected)<24 or not secrets.compare_digest(expected,provided):
        return jsonify(errore="Chiave API non valida"), 403
    if not request.is_json:
        return jsonify(errore="Usa application/json"), 415
    data=request.get_json(silent=True) or {}
    email=str(data.get("email") or "").strip().lower()
    nome=str(data.get("nome") or "").strip()
    cognome=str(data.get("cognome") or "").strip()
    if len(email)>160 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+",email) or not nome or len(nome)>60 or len(cognome)>60:
        return jsonify(errore="Dati allievo incompleti o non validi"), 400

    existing=Utente.query.filter_by(email=email).first()
    if existing:
        # Idempotenza: non reimpostiamo mai la password di un account esistente.
        return jsonify(username=existing.username,password="",gia_presente=True), 200

    base=_username(email)
    username=base[:60]
    for n in range(1,100):
        if not Utente.query.filter_by(username=username).first():
            break
        username=base[:54]+"-"+str(n)
    else:
        return jsonify(errore="Non è stato possibile assegnare un nome utente"), 409

    # La password viene restituita una sola volta al servizio chiamante.
    pw=secrets.token_urlsafe(18)
    nuovo=Utente(username=username,nome=(nome+" "+cognome).strip()[:120],email=email,
                ruolo="allievo",attivo=True,deve_cambiare_password=True)
    nuovo.imposta_password(pw)
    db.session.add(nuovo)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(errore="Registrazione concorrente: riprova"),409
    return jsonify(username=username,password=pw,gia_presente=False),201
