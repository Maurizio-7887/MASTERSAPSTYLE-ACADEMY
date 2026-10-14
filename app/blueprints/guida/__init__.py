"""Blueprint «Guida» — la finestra «Esercizio passo passo» sopra il simulatore.

- static/esercizi/<esercizio>.js  i passi dell'esercizio (testo della guida PDF + controllo automatico)
- static/pannello.js / .css       la finestra, uguale su tutte le pagine
- templates/guida/_pannello.html  da includere in fondo alle pagine del simulatore e del launchpad
"""
from flask import Blueprint, url_for

from ...accesso import utente_corrente
from ...pagine import tutte_le_pagine

bp = Blueprint("guida", __name__, template_folder="templates", static_folder="static", static_url_path="/static/guida")

# esercizio guidato disponibile per ogni versione del simulatore
ESERCIZIO_PER_VERSIONE = {"vuoto": "guidato-dic-2026", "completo": "guidato-dic-2026"}   # nella completa dopo il preset «Azienda nuova»


@bp.app_template_global()
def config_guida(versione):
    esercizio = ESERCIZIO_PER_VERSIONE.get(versione)
    if not esercizio or utente_corrente() is None:
        return None
    url = {f"{a['blueprint']}.{p['endpoint']}": url_for(f"{a['blueprint']}.{p['endpoint']}", versione=versione) for a, p in tutte_le_pagine()}
    url["allievo.consegna"] = url_for("allievo.consegna")
    return {"esercizio": esercizio, "versione": versione, "chiave": f"ferro-transenne-fi-2026-{versione}-civilistico", "url": url}
