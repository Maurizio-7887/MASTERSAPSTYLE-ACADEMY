"""Blueprint «Sincronia» — il lavoro dell'allievo segue l'allievo, non il browser; misura del tempo di collegamento.

- /api/stato/<versione>  GET / POST: lo stato del simulatore (lo stesso JSON del localStorage) salvato nel database
- /api/battito          POST ogni minuto dalla pagina aperta e in uso: allunga la sessione di collegamento
"""
import json

from flask import Blueprint, jsonify, request

from ...accesso import csrf_valido, utente_corrente
from ...db import Sessione, StatoLavoro, adesso, db
from ...pagine import LAB_SLOTS, VERSIONI

SLOT_VALIDI = set(VERSIONI) | set(LAB_SLOTS)   # versioni del simulatore e laboratori

bp = Blueprint("sincronia", __name__, template_folder="templates", static_folder="static", static_url_path="/static/sincronia")

PAUSA_MAX = 300      # oltre 5 minuti senza battito si apre una nuova sessione
BATTITO_MAX = 120    # un battito non conta mai più di 2 minuti


def chiave_storage(versione):
    return f"ferro-transenne-fi-2026-{versione}-civilistico"


def stato_salvato(utente, versione):
    if utente is None:
        return None
    return StatoLavoro.query.filter_by(utente_id=utente.id, versione=versione).first()


@bp.app_template_global()
def config_sincronia(versione):
    """Dati per sincronia.js: incorporati nella pagina, così lo stato è in localStorage prima che parta il simulatore."""
    u = utente_corrente()
    if u is None or versione not in SLOT_VALIDI:
        return None
    s = stato_salvato(u, versione)
    return {"versione": versione, "chiave": chiave_storage(versione), "utente": u.id, "csrf": _csrf(),
            "rev": s.rev if s else 0, "stato": s.dati if s else None,
            "urlStato": f"/api/stato/{versione}", "urlBattito": "/api/battito", "battito": not u.docente}


def _csrf():
    from ...accesso import csrf_token
    return csrf_token()


def _corpo():
    try:
        return json.loads(request.get_data(as_text=True) or "{}")
    except ValueError:
        return {}


def _controlla(corpo):
    tok = request.headers.get("X-CSRF") or corpo.get("csrf")
    return csrf_valido(tok)


@bp.route("/api/stato/<versione>", methods=["GET", "POST"])
def stato(versione):
    if versione not in SLOT_VALIDI:
        return jsonify(errore="versione sconosciuta"), 404
    u = utente_corrente()
    s = stato_salvato(u, versione)
    if request.method == "GET":
        return jsonify(rev=s.rev if s else 0, stato=s.dati if s else None)
    corpo = _corpo()
    if not _controlla(corpo):
        return jsonify(errore="token non valido"), 403
    dati = corpo.get("stato")
    if not isinstance(dati, str):
        return jsonify(errore="stato mancante"), 400
    try:
        json.loads(dati)
    except ValueError:
        return jsonify(errore="stato non valido"), 400
    if s is None:
        s = StatoLavoro(utente_id=u.id, versione=versione, dati=dati, rev=1)
        db.session.add(s)
    elif s.dati != dati:
        s.dati, s.rev, s.aggiornato = dati, s.rev + 1, adesso()
    db.session.commit()
    return jsonify(rev=s.rev)


def registra_battito(u, pagina="", ora=None):
    ora = ora or adesso()
    ses = Sessione.query.filter_by(utente_id=u.id).order_by(Sessione.ultimo.desc()).first()
    gap = (ora - ses.ultimo).total_seconds() if ses else None
    if ses is None or gap is None or gap > PAUSA_MAX or gap < 0:
        ses = Sessione(utente_id=u.id, inizio=ora, ultimo=ora, secondi_attivi=0, battiti=1, ultima_pagina=pagina)
        db.session.add(ses)
    else:
        ses.secondi_attivi += int(min(gap, BATTITO_MAX))
        ses.ultimo, ses.battiti, ses.ultima_pagina = ora, ses.battiti + 1, pagina
    u.ultimo_accesso = ora
    db.session.commit()
    return ses


@bp.route("/api/battito", methods=["POST"])
def battito():
    u = utente_corrente()
    corpo = _corpo()
    if not _controlla(corpo):
        return jsonify(errore="token non valido"), 403
    if u.docente:
        return jsonify(ok=True)
    ses = registra_battito(u, str(corpo.get("pagina") or "")[:200])
    return jsonify(ok=True, secondi=ses.secondi_attivi)
