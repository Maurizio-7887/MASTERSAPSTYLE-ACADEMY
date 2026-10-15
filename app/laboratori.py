"""Pagine dei laboratori di produzione: stessa shell del portale, motore JS a parte, lavoro salvato in uno «slot» proprio."""
from flask import g, render_template, url_for

from .pagine import LABORATORI, MODULI, VERSIONI, modulo


def render_lab(blueprint, endpoint):
    lab = LABORATORI[blueprint]
    pagina = next(p for p in lab["pagine"] if p["endpoint"] == endpoint)
    codice = lab.get("codice") or {"alta_varieta": "hmlv", "ripetitiva": "rem"}[blueprint]
    config = {"chiave": f"ferro-transenne-fi-2026-{lab['slot']}-civilistico", "pagina": endpoint, "slot": lab["slot"]}
    return render_template(f"{blueprint}/{endpoint}.html", lab=lab, pagina=pagina, blueprint=blueprint, config=config,
                           versione=g.versione, versioni=VERSIONI, moduli=MODULI, modulo_attivo=modulo(codice),
                           endpoint_corrente=f"{blueprint}.{endpoint}", app_attiva=pagina["titolo"],
                           js=[url_for(f[0], filename=f[1]) if isinstance(f, tuple) else url_for(f"{blueprint}.static", filename=f)
                               for f in lab["js"]])
