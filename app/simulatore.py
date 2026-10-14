"""Utilità comuni ai blueprint del simulatore: versione nell'URL e rendering delle pagine."""
import json
from functools import lru_cache
from pathlib import Path

from flask import abort, current_app, g, render_template, url_for

from .pagine import ATTIVITA, MODULI, VERSIONI, modulo_di, pagina, tutte_le_pagine

STATIC = Path(__file__).resolve().parent / "static"


@lru_cache(maxsize=4)
def meta(versione):
    return json.loads((STATIC / "sim" / versione / "meta.json").read_text(encoding="utf-8"))


def collega_versione(bp):
    """Ogni blueprint del simulatore vive sotto /<versione>/...: la valida e la propaga negli url_for."""

    @bp.url_value_preprocessor
    def _estrai(endpoint, values):
        v = (values or {}).pop("versione", None)
        if v not in VERSIONI:
            abort(404)
        g.versione = v

    @bp.url_defaults
    def _aggiungi(endpoint, values):
        if "versione" not in values and getattr(g, "versione", None):
            values["versione"] = g.versione


def mappa_url(versione):
    """URL di ogni scheda e di ogni area FI: servono al ponte JS per passare da una pagina all'altra."""
    vista, modulo = {}, {}
    for a, p in tutte_le_pagine():
        url = url_for(f"{a['blueprint']}.{p['endpoint']}", versione=versione)
        if p.get("modulo"):
            modulo.setdefault(p["modulo"], url)
        vista.setdefault(p["vista"], url)
    return vista, modulo


def render_pagina(blueprint, endpoint, sezioni=None, **extra):
    attivita, p = pagina(blueprint, endpoint)
    m = meta(g.versione)
    url_vista, url_modulo = mappa_url(g.versione)
    config = {
        "versione": g.versione,
        "pagina": f"{blueprint}.{endpoint}",
        "vista": p["vista"],
        "modulo": p.get("modulo"),
        "sd": extra.pop("sd", None),
        "pp": extra.pop("pp", None),
        "urlVista": url_vista,
        "urlModulo": url_modulo,
        "idStatici": m["id_statici"],
    }
    modulo_attivo, app_attiva = modulo_di(f"{blueprint}.{endpoint}", config["sd"] or config["pp"])
    return render_template(
        f"{blueprint}/{endpoint}.html",
        moduli=MODULI, modulo_attivo=modulo_attivo, app_attiva=app_attiva or p["titolo"],
        attivita=attivita, pagina=p, attivita_tutte=ATTIVITA, versioni=VERSIONI,
        meta=m, config=config, **extra)
