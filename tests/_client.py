"""App di test: database SQLite temporaneo e client già entrato come docente.
Va importato PRIMA di wsgi/app (imposta le variabili d'ambiente)."""
import os
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.pop("DATABASE_URL", None)
os.environ.setdefault("ACADEMY_DATI", tempfile.mkdtemp(prefix="msa-test-"))
os.environ.setdefault("DOCENTE_USERNAME", "docente")
os.environ.setdefault("DOCENTE_PASSWORD", "docente-di-prova")
os.environ.setdefault("SECRET_KEY", "chiave-di-prova")

from wsgi import app  # noqa: E402

app.config["TESTING"] = True


def csrf(html):
    m = re.search(r'name="csrf" value="([^"]+)"', html)
    return m.group(1) if m else None


def entra(username=None, password=None, client=None):
    c = client or app.test_client()
    t = csrf(c.get("/accesso").get_data(as_text=True))
    r = c.post("/accesso", data={"csrf": t, "username": username or os.environ["DOCENTE_USERNAME"],
                                 "password": password or os.environ["DOCENTE_PASSWORD"]})
    assert r.status_code == 302, f"accesso non riuscito per {username}: HTTP {r.status_code}"
    return c


_docente = None


def docente():
    global _docente
    if _docente is None:
        _docente = entra()
    return _docente
