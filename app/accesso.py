"""Controllo degli accessi: chi è collegato, quali pagine sono pubbliche, protezione dei moduli (CSRF)."""
import secrets
from functools import wraps

from flask import abort, g, jsonify, redirect, request, session, url_for

from .db import Utente, db

# pagine visibili senza accesso
PUBBLICHE = {"accessi.accesso", "portale.home", "portale.health", "portale.materiale", "static"}


def utente_corrente():
    if "utente" not in g:
        uid = session.get("uid")
        u = db.session.get(Utente, uid) if uid else None
        if u is not None and (not u.attivo or session.get("ver") != _impronta(u)):
            session.clear()
            u = None
        g.utente = u
    return g.utente


def _impronta(u):
    """Cambia quando cambia la password: le sessioni vecchie decadono."""
    return u.password_hash[-16:]


def apri_sessione(u):
    session.clear()
    session.permanent = True
    session["uid"] = u.id
    session["ver"] = _impronta(u)
    session["csrf"] = secrets.token_urlsafe(24)


def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(24)
    return session["csrf"]


def csrf_valido(token):
    atteso = session.get("csrf")
    return bool(atteso) and bool(token) and secrets.compare_digest(str(atteso), str(token))


def controlla_accesso():
    """before_request: login obbligatorio fuori dalle pagine pubbliche; POST protetti da CSRF."""
    ep = request.endpoint or ""
    if ep in PUBBLICHE or ep.endswith(".static"):
        return None
    u = utente_corrente()
    api = request.path.startswith("/api/")
    if u is None:
        if api:
            return jsonify(errore="accesso scaduto"), 401
        return redirect(url_for("accessi.accesso", prossima=request.full_path.rstrip("?") if request.method == "GET" else None))
    if request.method == "POST" and not api:
        if not csrf_valido(request.form.get("csrf")):
            abort(400, "Modulo scaduto: ricarica la pagina e riprova.")
    if u.deve_cambiare_password and ep not in {"accessi.password", "accessi.esci"} and not api:
        return redirect(url_for("accessi.password"))
    return None


def solo_docente(f):
    @wraps(f)
    def wrapper(*a, **k):
        u = utente_corrente()
        if u is None or not u.docente:
            abort(403)
        return f(*a, **k)
    return wrapper


def durata(secondi):
    secondi = int(secondi or 0)
    h, m = divmod(secondi // 60, 60)
    return f"{h} h {m:02d} min" if h else f"{m} min"
