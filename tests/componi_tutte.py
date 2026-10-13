"""Compone TUTTE le pagine dei blueprint (versione vuota) in tests/_pagine/, con JS e CSS incollati,
più un indice url → file. Serve al test multipagina: l'esercizio passa davvero da una pagina all'altra.
Uso: python tests/componi_tutte.py"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from flask import g, url_for  # noqa: E402

from app.pagine import tutte_le_pagine  # noqa: E402
from tests.componi_pagina import main as componi  # noqa: E402
from tests._client import app  # noqa: E402

DEST = Path(__file__).resolve().parent / "_pagine"
DEST.mkdir(exist_ok=True)
indice = {}
with app.test_request_context():
    g.versione = "vuoto"
    urls = [url_for(f"{a['blueprint']}.{p['endpoint']}", versione="vuoto") for a, p in tutte_le_pagine()]
for u in urls:
    nome = u.strip("/").replace("/", "_") + ".html"
    componi(u, str(DEST / nome))
    indice[u] = nome
(DEST / "indice.json").write_text(json.dumps(indice, indent=1), encoding="utf-8")
