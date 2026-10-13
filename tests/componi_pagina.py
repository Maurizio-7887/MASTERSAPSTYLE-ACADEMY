"""Rende una pagina del portale (Flask test client) e incolla dentro i file JS/CSS,
così il test jsdom esegue ESATTAMENTE i file spezzati, nell'ordine servito ai browser.

Uso: python tests/componi_pagina.py /vuoto/tutto tests/_pagina.html
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from wsgi import app  # noqa: E402

STATIC = Path(app.static_folder)


def statico(url):
    """Contenuto di un file statico (dell'app o di un blueprint), letto attraverso Flask come lo riceve il browser."""
    r = app.test_client().get(url)
    if r.status_code != 200:
        sys.exit(f"{url}: HTTP {r.status_code}")
    return r.get_data(as_text=True)


def main(url, destinazione):
    r = app.test_client().get(url)
    if r.status_code != 200:
        sys.exit(f"{url}: HTTP {r.status_code}")
    html = r.get_data(as_text=True)
    html = re.sub(r'<script src="([^"]+)"></script>', lambda m: "<script>" + statico(m.group(1)).replace("</script", "<\\/script") + "</script>", html)
    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: "<style>" + statico(m.group(1)) + "</style>", html)
    Path(destinazione).write_text(html, encoding="utf-8")
    print(f"{url} → {destinazione} ({len(html)//1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
