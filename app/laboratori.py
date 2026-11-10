"""Pagine dei laboratori di produzione: stessa shell del portale, motore JS a parte, lavoro salvato in uno «slot» proprio."""
from flask import g, render_template, url_for, request, session
from .accesso import utente_corrente

from .pagine import LABORATORI, MODULI, VERSIONI, modulo


def render_lab(blueprint, endpoint):
    lab = LABORATORI[blueprint]
    pagina = next(p for p in lab["pagine"] if p["endpoint"] == endpoint)
    codice = lab.get("codice") or {"alta_varieta": "hmlv", "ripetitiva": "rem"}[blueprint]
    # Il docente può provare Firenze e Pistoia senza toccare il proprio
    # archivio aziendale principale. Le classi/allievi esistenti non migrano:
    # per loro rimane lo slot storico erp-ft e nessun progresso va perso.
    slot = lab["slot"]
    corso = request.args.get("esercizio_guida") or session.get("guida_integrata")
    u = utente_corrente()
    if slot == "erp-ft" and u is not None and u.docente:
        if corso == "magazziniere-5":
            slot = "erp-ft-docente-pistoia"
        elif corso == "firenze-30":
            slot = "erp-ft-docente-firenze"
    config = {"chiave": f"ferro-transenne-fi-2026-{slot}-civilistico", "pagina": endpoint, "slot": slot}
    return render_template(f"{blueprint}/{endpoint}.html", lab=lab, pagina=pagina, blueprint=blueprint, config=config,
                           versione=g.versione, versioni=VERSIONI, moduli=MODULI, modulo_attivo=modulo(codice),
                           endpoint_corrente=f"{blueprint}.{endpoint}", app_attiva=pagina["titolo"],
                           js=[url_for(f[0], filename=f[1]) if isinstance(f, tuple) else url_for(f"{blueprint}.static", filename=f)
                               for f in lab["js"]])
