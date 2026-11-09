"""Blueprint «Guida» — la finestra «Esercizio passo passo» sopra il simulatore.

- static/esercizi/<esercizio>.js  i passi dell'esercizio (testo della guida PDF + controllo automatico)
- static/pannello.js / .css       la finestra, uguale su tutte le pagine
- templates/guida/_pannello.html  da includere in fondo alle pagine del simulatore e del launchpad
"""
from flask import Blueprint, url_for, request, session, jsonify

from ...accesso import utente_corrente, csrf_valido, csrf_token
from ...pagine import LABORATORI, tutte_le_pagine
from ...db import AvanzamentoGuida, adesso, db

bp = Blueprint("guida", __name__, template_folder="templates", static_folder="static", static_url_path="/static/guida")

# esercizio guidato disponibile per ogni versione del simulatore
ESERCIZIO_PER_VERSIONE = {"vuoto": "guidato-dic-2026", "completo": "guidato-dic-2026"}   # nella completa dopo il preset «Azienda nuova»



def _avanzamento(utente, esercizio, versione):
    if not utente or not esercizio:
        return None
    return AvanzamentoGuida.query.filter_by(
        utente_id=utente.id, esercizio=esercizio, versione=versione).first()


@bp.route("/api/guida/progresso/<esercizio>", methods=["POST"])
def registra_progresso(esercizio):
    """Save the actual step cursor immediately, independently of simulator state.

    Step check marks are client observations, not official accounting validation.
    Teacher annotations are never accepted from a student request.
    """
    u = utente_corrente()
    if not u or u.docente or len(esercizio) > 80:
        return jsonify(errore="non autorizzato"), 403
    payload = request.get_json(silent=True) or {}
    if not csrf_valido(request.headers.get("X-CSRF") or payload.get("csrf")):
        return jsonify(errore="token non valido"), 403
    versione = str(payload.get("versione") or "erp-ft")[:25]
    try:
        pos = int(payload["posizione"])
        totale = int(payload["totale"])
    except (KeyError, ValueError, TypeError):
        return jsonify(errore="posizione non valida"), 400
    if totale < 1 or totale > 1200 or not 0 <= pos < totale:
        return jsonify(errore="posizione fuori intervallo"), 400
    dati = payload.get("passi")
    if not isinstance(dati, list) or len(dati) != totale:
        return jsonify(errore="lista passi non valida"), 400
    cleaned = {}
    for i, step in enumerate(dati):
        if not isinstance(step, dict):
            return jsonify(errore="passo non valido"), 400
        status = step.get("stato") or ""
        if status not in ("", "auto", "mano"):
            return jsonify(errore="esito non valido"), 400
        cleaned[str(i)] = {
            "titolo": str(step.get("titolo") or "")[:220],
            "gruppo": str(step.get("gruppo") or "")[:90],
            "stato": status
        }
    row = _avanzamento(u, esercizio, versione)
    if row is None:
        row = AvanzamentoGuida(utente_id=u.id, esercizio=esercizio, versione=versione)
        db.session.add(row)
    row.posizione = pos
    row.posizione_massima = max(row.posizione_massima or 0, pos)
    row.totale = totale
    row.passi = cleaned
    row.aggiornato = adesso()
    db.session.commit()
    return jsonify(ok=True, posizione=row.posizione, massimo=row.posizione_massima)


@bp.app_template_global()
def config_guida(versione, esercizio=None, chiave=None):
    esercizio = esercizio or ESERCIZIO_PER_VERSIONE.get(versione)
    if esercizio == "s4-integrato":
        scelte = {"ragioneria-wms", "dicembre-wms", "s4-integrato", "completo-formas", "magazziniere-5", "executive-assistant"}
        scelta = request.args.get("esercizio_guida")
        if scelta in scelte:
            session["guida_integrata"] = scelta
        esercizio = session.get("guida_integrata", "dicembre-wms")   # uso libero: l’esercizio di dicembre 2026 con riapertura
        if esercizio not in scelte:
            esercizio = "dicembre-wms"
    if not esercizio or utente_corrente() is None:
        return None
    url = {f"{a['blueprint']}.{p['endpoint']}": url_for(f"{a['blueprint']}.{p['endpoint']}", versione=versione) for a, p in tutte_le_pagine()}
    for bp_lab, lab in LABORATORI.items():
        for p in lab["pagine"]:
            url[f"{bp_lab}.{p['endpoint']}"] = url_for(f"{bp_lab}.{p['endpoint']}", versione=versione)
    url["allievo.consegna"] = url_for("allievo.consegna")
    progresso = _avanzamento(utente_corrente(), esercizio, "erp-ft" if versione in ("vuoto", "completo") and esercizio in {"dicembre-wms", "s4-integrato", "completo-formas", "magazziniere-5", "executive-assistant", "ragioneria-wms"} else versione)
    return {"esercizio": esercizio, "versione": versione, "chiave": chiave or f"ferro-transenne-fi-2026-{versione}-civilistico", "url": url,
            "progress_url": url_for("guida.registra_progresso", esercizio=esercizio),
            "progress_version": "erp-ft" if versione in ("vuoto", "completo") and esercizio in {"dicembre-wms", "s4-integrato", "completo-formas", "magazziniere-5", "executive-assistant", "ragioneria-wms"} else versione,
            "progress_csrf": csrf_token(), "progress_notes": progresso.osservazioni if progresso else {}, "progress": {"posizione": progresso.posizione, "massimo": progresso.posizione_massima} if progresso else None}


@bp.app_template_global()
def config_guida_modulo(versione, codice):
    """Sulle mattonelle di un laboratorio la finestra mostra l'esercizio di quel laboratorio."""
    from ...pagine import MODULI
    if codice in {m["codice"] for m in MODULI}:
        return config_guida(versione, esercizio="s4-integrato", chiave="ferro-transenne-fi-2026-erp-ft-civilistico")
    for lab in LABORATORI.values():
        if lab.get("codice", lab["sigla"].lower()) == codice:
            return config_guida(versione, esercizio=lab["esercizio"], chiave=f"ferro-transenne-fi-2026-{lab['slot']}-civilistico")
    return config_guida(versione)
