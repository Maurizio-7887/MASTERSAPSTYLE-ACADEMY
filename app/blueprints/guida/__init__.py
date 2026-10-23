"""Blueprint «Guida» — la finestra «Esercizio passo passo» sopra il simulatore.

- static/esercizi/<esercizio>.js  i passi dell'esercizio (testo della guida PDF + controllo automatico)
- static/pannello.js / .css       la finestra, uguale su tutte le pagine
- templates/guida/_pannello.html  da includere in fondo alle pagine del simulatore e del launchpad
"""
from flask import Blueprint, url_for, request, session

from ...accesso import utente_corrente
from ...pagine import LABORATORI, tutte_le_pagine

bp = Blueprint("guida", __name__, template_folder="templates", static_folder="static", static_url_path="/static/guida")

# esercizio guidato disponibile per ogni versione del simulatore
ESERCIZIO_PER_VERSIONE = {"vuoto": "guidato-dic-2026", "completo": "guidato-dic-2026"}   # nella completa dopo il preset «Azienda nuova»


@bp.app_template_global()
def config_guida(versione, esercizio=None, chiave=None):
    esercizio = esercizio or ESERCIZIO_PER_VERSIONE.get(versione)
    if esercizio == "s4-integrato":
        scelte = {"ragioneria-wms", "dicembre-wms", "s4-integrato", "completo-formas"}
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
    return {"esercizio": esercizio, "versione": versione, "chiave": chiave or f"ferro-transenne-fi-2026-{versione}-civilistico", "url": url}


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
