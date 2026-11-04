"""Correttore digitale: dalla consegna genera una bozza di correzione e un voto proposto; l'invio resta al docente."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _client import app, csrf, docente  # noqa: E402
from app.db import Consegna, Utente, db  # noqa: E402

AQ = Path(__file__).resolve().parent
giusto = (AQ / "magazziniere-finale.json").read_text(encoding="utf-8")
guasto = json.loads(giusto)
guasto["registrazioni"] = guasto["registrazioni"][:-6]   # lavoro incompleto
guasto = json.dumps(guasto)

with app.app_context():
    u = Utente(username="prova.correttore", nome="Prova Correttore", deve_cambiare_password=False)
    u.imposta_password("password-test-locale")
    db.session.add(u)
    db.session.commit()
    ids = []
    for dati in (giusto, guasto):
        c = Consegna(utente_id=u.id, versione="erp-ft", esercizio="magazziniere-5", dati=dati)
        db.session.add(c)
        db.session.commit()
        ids.append(c.id)

d = docente()
for cid, atteso_voto, atteso_testo in ((ids[0], "10/10", "Numeri esatti"), (ids[1], None, "DA RIVEDERE")):
    pagina = d.get(f"/docente/consegna/{cid}").get_data(as_text=True)
    assert "Genera la correzione automatica" in pagina, "bottone del correttore digitale presente"
    r = d.post(f"/docente/consegna/{cid}", data={"csrf": csrf(pagina), "azione": "genera", "risposta": "", "voto": ""})
    assert r.status_code == 302
    with app.app_context():
        c = db.session.get(Consegna, cid)
        assert "CORREZIONE AUTOMATICA" in c.risposta and atteso_testo in c.risposta, c.risposta[:300]
        assert c.stato == "da_correggere", "la bozza non viene inviata all'allievo"
        assert c.voto and c.voto.endswith("/10"), c.voto
        if atteso_voto:
            assert c.voto == atteso_voto, c.voto
        else:
            assert float(c.voto.split("/")[0].replace(",", ".")) < 10, c.voto
        assert "atteso" in c.risposta or atteso_voto, "elenca i numeri sbagliati con atteso e ottenuto"
# rigenerare non duplica il testo e non perde il commento del docente
pagina = d.get(f"/docente/consegna/{ids[1]}").get_data(as_text=True)
with app.app_context():
    c = db.session.get(Consegna, ids[1])
    prima = c.risposta
d.post(f"/docente/consegna/{ids[1]}", data={"csrf": csrf(pagina), "azione": "genera", "risposta": prima + "BRAVO sul magazzino", "voto": ""})
with app.app_context():
    c = db.session.get(Consegna, ids[1])
    assert c.risposta.count("CORREZIONE AUTOMATICA") == 1
# l'invio è del docente
pagina = d.get(f"/docente/consegna/{ids[1]}").get_data(as_text=True)
d.post(f"/docente/consegna/{ids[1]}", data={"csrf": csrf(pagina), "azione": "invia", "risposta": "Correzione rivista", "voto": "7/10"})
with app.app_context():
    c = db.session.get(Consegna, ids[1])
    assert c.stato == "corretta" and c.voto == "7/10"
print("OK correttore digitale: bozza dai numeri esatti, voto proposto, invio solo del docente")
