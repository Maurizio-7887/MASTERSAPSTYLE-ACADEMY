"""Controllo rapido delle rotte: ogni pagina di ogni blueprint risponde, contiene la
sua scheda e carica tutti i file JS del simulatore. Uso: python tests/test_rotte.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from flask import g, url_for  # noqa: E402

from app.pagine import VERSIONI, tutte_le_pagine  # noqa: E402
from app.simulatore import meta  # noqa: E402
from tests._client import app, docente  # noqa: E402

errori, n = [], 0
c = docente()
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
for url in ["/", "/health", "/vuoto/tutto", "/vuoto/", "/materiali/Guida-esercizio-integrato.pdf", "/docente/", "/docente/tempi"]:
    n += 1
    if c.get(url).status_code != 200:
        errori.append(f"{url}: non risponde")
# launchpad a due livelli: ogni modulo e ogni sua app
from app.pagine import MODULI, app_modulo  # noqa: E402
for v in VERSIONI:
    for m in MODULI:
        n += 1
        url = f"/{v}/m/{m['codice']}"
        r = c.get(url)
        if r.status_code != 200:
            errori.append(f"{url}: HTTP {r.status_code}")
            continue
        for t in app_modulo(m):
            with app.test_request_context():
                g.versione = v
                u = url_for(t["endpoint"], versione=v, **t["args"])
            n += 1
            if u.replace("&", "&amp;") not in r.get_data(as_text=True):
                errori.append(f"{url}: manca la mattonella {u}")
            rr = c.get(u)
            if rr.status_code != 200:
                errori.append(f"{u}: HTTP {rr.status_code}")
            for k in ("sd", "pp"):
                if k in t["args"] and f'"{k}": "{t["args"][k]}"' not in rr.get_data(as_text=True):
                    errori.append(f"{u}: la pagina non apre la schermata {t['args'][k]}")
print("\n".join(errori) or f"✅ {n} rotte verificate")
sys.exit(1 if errori else 0)
