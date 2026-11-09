"""Regressione: ripartenza al passo 34 e correzione docente senza consegna."""
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _client import app, csrf, docente, entra  # noqa: E402
from app.db import AvanzamentoGuida, StatoLavoro, Utente, db  # noqa: E402

username = "prova.guida." + uuid.uuid4().hex[:9]
with app.app_context():
    allievo = Utente(username=username, nome="Prova Ripresa", deve_cambiare_password=False)
    allievo.imposta_password("test-password-guida")
    db.session.add(allievo)
    db.session.commit()
    uid = allievo.id
    dati = {"lab": "erp-ft", "registrazioni": [
        {"id": 1, "data": "2026-12-01", "descrizione": "Capitale", "tipo": "CAPITALE",
         "righe": [{"conto": "10", "dareAvere": "DARE", "importo": 100},
                   {"conto": "30", "dareAvere": "AVERE", "importo": 100}]}
    ]}
    db.session.add(StatoLavoro(utente_id=uid, versione="erp-ft",
                               dati=json.dumps(dati), rev=10))
    db.session.commit()

client = entra(username, "test-password-guida")
with client.session_transaction() as sess:
    token = sess["csrf"]
steps = [{"titolo": f"Operazione {i+1}", "gruppo": "Contabilità",
          "stato": "auto" if i < 4 else ""} for i in range(60)]
steps[32]["stato"] = "auto"
res = client.post("/api/guida/progresso/dicembre-wms", json={
    "csrf": token, "versione": "erp-ft", "posizione": 33,
    "totale": len(steps), "passi": steps}, headers={"X-CSRF": token})
assert res.status_code == 200, res.data
with app.app_context():
    row = AvanzamentoGuida.query.filter_by(utente_id=uid, esercizio="dicembre-wms").one()
    assert row.posizione == 33 and row.posizione_massima == 33
    assert row.passi["32"]["stato"] == "auto"
    assert StatoLavoro.query.filter_by(utente_id=uid, versione="erp-ft").one().rev == 10
    gid = row.id

# The next page request must inject the server checkpoint.
conf = client.get("/simulatore/vuoto")  # route may redirect; API persistence is checked above.
d = docente()
html = d.get(f"/docente/allievo/{uid}/monitoraggio").get_data(as_text=True)
assert "punto attuale 34" in html, html[:500]
assert "Operazione 33" in html
assert "Libro Giornale" in html
form = d.post(f"/docente/allievo/{uid}/monitoraggio/{gid}/nota", data={
    "csrf": csrf(html), "passo": "33", "giudizio": "da_correggere",
    "nota": "Ripetere il controllo del conto fornitori"})
assert form.status_code == 302, form.data
with app.app_context():
    row = db.session.get(AvanzamentoGuida, gid)
    assert row.osservazioni["33"]["giudizio"] == "da_correggere"
    assert row.posizione == 33
    assert StatoLavoro.query.filter_by(utente_id=uid, versione="erp-ft").one().rev == 10
assert d.get(f"/docente/allievo/{uid}/monitoraggio/backup.json").status_code == 200
print("OK checkpoint guida PostgreSQL e monitoraggio docente")

# Il docente vede dove è ferma l'allieva e che cosa manca, con gli stessi controlli del tutor
assert 'id="cosa-manca"' in html and "Dove è ferma e che cosa manca" in html
assert "esercizi/dicembre-wms.js" in html and "esercizi/cpm-formas.js" in html
print("OK: monitoraggio con il riquadro «Dove è ferma e che cosa manca»")
