"""Controllo degli accessi: chi è collegato, quali pagine sono pubbliche, protezione dei moduli (CSRF)."""
import secrets
from functools import wraps

from flask import abort, g, jsonify, redirect, request, session, url_for

from .db import Utente, Impostazione, db

# pagine visibili senza accesso
PUBBLICHE = {"accessi.accesso", "integrazioni.iscrizione_executive", "portale.home", "portale.health", "portale.materiale", "static",
             # corsi online per privati: programma, iscrizione, acquisto e verifica degli attestati
             "privati.corso_pubblico", "privati.prova", "privati.iscriviti", "privati.acquista", "privati.verifica", "privati.verifica_form",
             "privati.static", "executive_api.iscrivi_executive", "public_stats.allievi_count"}


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


CORSI_GUIDE = {
    "magazzino-firenze": {"dicembre-magazzino-30", "firenze-30"},
    "magazzino-pistoia": {"dicembre-magazzino", "magazziniere-5"},
    "ragioneria": {"dicembre-wms", "ragioneria-wms", "ragioneria-wms-chiusura", "guidato-dic-2026", "s4-integrato", "completo-formas"},
}


def corsi_assegnati(u):
    if not u or u.docente:
        return None
    record = db.session.get(Impostazione, f"corsi-aula-{u.id}")
    return None if record is None else set(record.valore.split(",")) & set(CORSI_GUIDE)


def guida_autorizzata(u, esercizio):
    corsi = corsi_assegnati(u)
    return corsi is None or any(esercizio in CORSI_GUIDE[c] for c in corsi)


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
    corsi = corsi_assegnati(u)
    if corsi is not None:
        if ep.startswith(("ragioneria_quiz.", "ragioneria_internazionale.")) and "ragioneria" not in corsi:
            abort(403, "Corso non autorizzato dal docente.")
        scelta = request.args.get("esercizio_guida") or request.form.get("esercizio") if not api else request.args.get("esercizio_guida")
        if scelta and not guida_autorizzata(u, scelta):
            abort(403, "Corso non autorizzato dal docente.")
        if ep == "guida.registra_progresso" and not guida_autorizzata(u, (request.view_args or {}).get("esercizio")):
            return jsonify(errore="Corso non autorizzato"), 403
        if ep == "portale.lezioni_magazzino" and "magazzino-" + (request.view_args or {}).get("percorso", "") not in corsi:
            abort(403)
        if ep.startswith("portale.uf9_") and "magazzino-pistoia" not in corsi:
            abort(403)
    from .blueprints.privati import controlla_prova     # corsi per privati: in prova solo programma e prime lezioni
    return controlla_prova(u)


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
