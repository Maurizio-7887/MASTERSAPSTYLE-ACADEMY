"""Il docente può sbloccare dal portale le domande di ragioneria rimaste aperte nel lavoro di un allievo."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _client import app, csrf, docente  # noqa: E402
from app.db import ArchivioLavoro, StatoLavoro, Utente, db  # noqa: E402

stato = {"lab": "erp", "registrazioni": [{"id": 1, "numero": "100000010", "data": "2026-12-04", "righe": []}],
         "msaRagioneria": {"versione": 1, "visti": [], "esiti": [], "coda": [{"chiave": "k", "documento": {"numero": "100000010", "data": "2026-12-04", "tipo": "MIGO", "righe": []}, "risposte": [], "tentativi": 0, "rifiuti": 2}]}}
with app.app_context():
    u = Utente(username="prova.sblocca", nome="Prova Sblocca", deve_cambiare_password=False)
    u.imposta_password("password-test-locale")
    db.session.add(u)
    db.session.commit()
    db.session.add(StatoLavoro(utente_id=u.id, versione="erp-ft", dati=json.dumps(stato), rev=5))
    db.session.commit()
    uid = u.id

d = docente()
pag = d.get(f"/docente/allievo/{uid}").get_data(as_text=True)
assert "Sblocca le domande" in pag and "100000010" in pag and "2 tentativi non acquisiti" in pag
r = d.post(f"/docente/allievo/{uid}/sblocca-quiz", data={"csrf": csrf(pag), "versione": "erp-ft"})
assert r.status_code == 302
with app.app_context():
    st = StatoLavoro.query.filter_by(utente_id=uid, versione="erp-ft").first()
    o = json.loads(st.dati)
    assert o["msaRagioneria"]["coda"] == [] and o["msaRagioneria"]["esiti"][0]["sbloccatoDalDocente"] is True
    assert len(o["registrazioni"]) == 1, "le registrazioni restano"
    assert st.rev == 6, "rev aumentata: il browser dell'allievo prende il lavoro del server"
    assert ArchivioLavoro.query.filter_by(utente_id=uid).count() == 1, "copia di sicurezza prima dello sblocco"
pag = d.get(f"/docente/allievo/{uid}").get_data(as_text=True)
assert "Sblocca le domande" not in pag
print("OK sblocco domande di ragioneria dal portale docente")
