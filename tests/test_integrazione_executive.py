"""MasterExecutive Academy chiede l'account del gestionale per le sue iscritte (API executive_api): compaiono nel pannello
docente nel gruppo «Executive Assistant (online)»."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
CHIAVE = "chiave-di-prova-lunga-almeno-24-caratteri"
os.environ["EXECUTIVE_API_KEY"] = CHIAVE
from tests._client import app, docente, entra   # noqa: E402

c = app.test_client()
url = "/api/iscrizioni/executive"
assert c.post(url, json={"email": "anna.verdi@example.it"}).status_code == 403
assert c.post(url, json={"email": "non-email", "nome": "Anna"}, headers={"X-Api-Key": CHIAVE}).status_code == 400
r = c.post(url, json={"email": "Anna.Verdi@example.it", "nome": "Anna", "cognome": "Verdi"}, headers={"X-Api-Key": CHIAVE})
assert r.status_code == 201, r.status_code
d = r.get_json()
assert d["username"] == "exa-anna.verdi" and d["password"] and not d["gia_presente"]
r2 = c.post(url, json={"email": "anna.verdi@example.it", "nome": "Anna"}, headers={"X-Api-Key": CHIAVE}).get_json()
assert r2["gia_presente"] and r2["username"] == "exa-anna.verdi" and r2["password"] == ""   # niente doppioni né nuova password
a = entra("exa-anna.verdi", d["password"])
assert "password" in a.get("/vuoto/").headers.get("Location", ""), "al primo accesso deve cambiare la password"
doc = docente()
h = doc.get("/docente/?gruppo=executive").get_data(as_text=True)
assert "Anna Verdi" in h and "Executive Assistant (online)" in h
h = doc.get("/docente/?gruppo=aula").get_data(as_text=True)
assert "Anna Verdi" not in h
print("✅ integrazione MasterExecutive: account del gestionale e gruppo nel pannello docente")
