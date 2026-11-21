"""Accesso unico portale → FI/CO nel servizio unico (wsgi:app con /fico montato).
Uso: python tests/test_fico_ponte.py"""
import os
import re
import sys
import tempfile
from pathlib import Path

tmp = tempfile.mkdtemp()
os.environ.update({
    "MASTERLEDGER_FICO_ENABLED": "1",
    "MASTERLEDGER_FICO_DATABASE_URL": f"sqlite:///{tmp}/fico.db",
    "MASTERLEDGER_FICO_SECRET_KEY": "chiave-fico-test",
    "SECRET_KEY": "chiave-portale-test",
    "ACADEMY_DATI": tmp,
    "DOCENTE_USERNAME": "docente", "DOCENTE_PASSWORD": "Docente-Test-1", "DOCENTE_RESET_PASSWORD": "1",
})
os.environ.pop("DATABASE_URL", None)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from werkzeug.test import Client  # noqa: E402

import wsgi  # noqa: E402
from app.db import Utente, db  # noqa: E402

with wsgi.firenze_app.app_context():
    a = Utente(username="allieva1", nome="Allieva Uno", ruolo="allievo", deve_cambiare_password=False)
    a.imposta_password("Allieva-Test-1")
    db.session.add(a)
    db.session.commit()

errori = []


def check(cond, msg):
    if not cond:
        errori.append(msg)


def accedi(username, password):
    c = Client(wsgi.app)
    html = c.get("/accesso").get_data(as_text=True)
    token = re.search(r'name="csrf" value="([^"]+)"', html).group(1)
    r = c.post("/accesso", data={"csrf": token, "username": username, "password": password})
    check(r.status_code == 302, f"accesso {username}: HTTP {r.status_code}")
    return c


# senza accesso al portale non si entra nel FI/CO
anon = Client(wsgi.app)
check(anon.get("/fico-accesso").status_code == 302, "fico-accesso senza login deve rimandare all'accesso")

c = accedi("allieva1", "Allieva-Test-1")
r = c.get("/fico-accesso")
check(r.status_code == 302 and "/fico/academy-fico/ponte?t=" in r.headers.get("Location", ""), "manca il redirect al ponte")
r2 = c.get(r.headers["Location"])
check(r2.status_code == 302 and r2.headers.get("Location", "").endswith("/fico/academy-fico/percorso"), f"ponte: {r2.status_code}")
r3 = c.get("/fico/academy-fico/percorso")
check(r3.status_code == 200 and "La mia esercitazione" in r3.get_data(as_text=True), f"percorsi: {r3.status_code}")
# il biglietto è monouso
check(c.get(r.headers["Location"]).status_code == 400, "biglietto riusabile")
# l'allieva non apre la configurazione del FI/CO
check(c.get("/fico/gl/account-mapping").status_code == 403, "allieva non confinata")
# pulsante visibile nella home dell'allieva
check("fico-accesso" in c.get("/riprendi/").get_data(as_text=True), "manca il pulsante FI/CO nella home allieva")

# docente: entra come commercialista e vede la classe
d = accedi("docente", "Docente-Test-1")
loc = d.get("/fico-accesso").headers["Location"]
d.get(loc)
check(d.get("/fico/academy-fico/percorso/classe").status_code == 200, "vista classe docente")

# uscita coordinata: il portale cancella anche il cookie del FI/CO
html = c.get("/riprendi/").get_data(as_text=True)
m = re.search(r'name="csrf" value="([^"]+)"', html)
tok = m.group(1) if m else ""
out = c.post("/esci", data={"csrf": tok})
check(out.status_code == 200, f"uscita: HTTP {out.status_code}")
cookies = out.headers.getlist("Set-Cookie")
check(any(x.startswith("masterledger_fico_session=;") and "Path=/fico" in x for x in cookies), f"cookie FI/CO non cancellato: {cookies}")

if errori:
    print("❌", *errori, sep="\n  ")
    sys.exit(1)
print("✅ accesso unico portale → FI/CO verificato")
