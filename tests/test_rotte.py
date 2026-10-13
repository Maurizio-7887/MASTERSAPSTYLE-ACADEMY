"""Controllo rapido delle rotte: ogni pagina di ogni blueprint risponde, contiene la
sua scheda e carica tutti i file JS del simulatore. Uso: python tests/test_rotte.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from flask import g, url_for  # noqa: E402

from app.pagine import VERSIONI, tutte_le_pagine  # noqa: E402
from app.simulatore import meta  # noqa: E402
from wsgi import app  # noqa: E402

errori, n = [], 0
c = app.test_client()
for v in VERSIONI:
    with app.test_request_context():
        g.versione = v
        pagine = [(a, p, url_for(f"{a['blueprint']}.{p['endpoint']}", versione=v)) for a, p in tutte_le_pagine()]
    for a, p, url in pagine:
        n += 1
        r = c.get(url)
        html = r.get_data(as_text=True)
        if r.status_code != 200:
            errori.append(f"{url}: HTTP {r.status_code}")
            continue
        if p["vista"] != "fabbisogno-pm" and f'data-vista="{p["vista"]}"' not in html:
            errori.append(f"{url}: manca la scheda {p['vista']}")
        mancanti = [s["file"] for s in meta(v)["script"] if s["file"] not in html]
        if mancanti:
            errori.append(f"{url}: script mancanti {mancanti}")
for url in ["/", "/health", "/vuoto/tutto", "/materiali/Guida-esercizio-integrato.pdf"]:
    n += 1
    if c.get(url).status_code != 200:
        errori.append(f"{url}: non risponde")
print("\n".join(errori) or f"✅ {n} rotte verificate")
sys.exit(1 if errori else 0)
