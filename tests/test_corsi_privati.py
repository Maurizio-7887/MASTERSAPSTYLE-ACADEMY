"""Corsi online per privati (ERP e Magazziniere 5.0): programma pubblico, prova gratuita, acquisto, attivazione,
esame (teoria + numeri dell'esercizio) e attestato con verifica pubblica. Le classi in aula non cambiano."""
from pathlib import Path
import json
import re
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests._client import app, docente, entra, csrf
from app.corsi_privati import CORSI, DOMANDE
from app.blueprints.formazione import CASO
from app.db import db, Attestato, Iscrizione, StatoLavoro, TentativoEsame, Utente

assert CORSI["erp"]["ore"] == 80 and CORSI["magazzino"]["ore"] == 60
for slug, c in CORSI.items():
    for m in c["moduli"]:
        for s in m[3]:
            assert s in CASO, (slug, s)
    assert all(s in CASO for s in c["gratis"]) and len(DOMANDE[slug]) >= 30
    for d in DOMANDE[slug]:
        assert 0 <= d[2] < len(d[1]), d[0]

pub = app.test_client()
for slug in CORSI:
    h = pub.get(f"/corsi/{slug}").get_data(as_text=True)
    assert "Prova gratis le prime lezioni" in h and "Il programma" in h and "€ 297,00" in h, slug
    a = pub.get(f"/corsi/{slug}/acquista").get_data(as_text=True)
    assert "bonifico" in a and "PayPal" in a
assert pub.get("/corsi/inesistente").status_code == 404

# iscrizione con prova gratuita
c = app.test_client()
t = csrf(c.get("/corsi/erp/iscriviti").get_data(as_text=True))
r = c.post("/corsi/erp/iscriviti", data={"csrf": t, "nome": "Lia", "cognome": "Rossi", "email": "lia@test.it",
                                         "password": "password1", "privacy": "1"})
assert r.status_code == 302 and "/corsi/erp/area" in r.headers["Location"]
h = c.get("/corsi/erp/area").get_data(as_text=True)
assert "Prova gratuita" in h and "🔒" in h
assert c.get("/vuoto/formazione/ciclo-completo").status_code == 200          # lezione gratuita
for path in ("/vuoto/formazione/varianze", "/vuoto/", "/vuoto/m/wms", "/area/consegna", "/corsi/erp/esame"):
    r = c.get(path)
    assert r.status_code == 302 and "/corsi/erp/acquista" in r.headers["Location"], (path, r.status_code, r.headers.get("Location"))
# doppia iscrizione con la stessa email
t = csrf(pub.get("/corsi/magazzino/iscriviti").get_data(as_text=True))
assert pub.post("/corsi/magazzino/iscriviti", data={"csrf": t, "nome": "X", "cognome": "Y", "email": "lia@test.it",
                                                     "password": "password1", "privacy": "1"}).status_code == 400

# il docente attiva dopo il pagamento
d = docente()
assert "lia@test.it" in d.get("/corsi/docente").get_data(as_text=True)
with app.app_context():
    u = Utente.query.filter_by(username="lia@test.it").first()
    isc = Iscrizione.query.filter_by(utente_id=u.id).first()
    iid, uid = isc.id, u.id
r = d.post(f"/corsi/docente/{iid}/attiva", data={"csrf": csrf(d.get("/corsi/docente").get_data(as_text=True))})
assert r.status_code == 302
assert c.get("/vuoto/").status_code == 200 and c.get("/vuoto/formazione/varianze").status_code == 200
h = c.get("/corsi/erp/area").get_data(as_text=True)
assert "Apri il sistema integrato" in h and "Iscritto" in h

# accesso con email: si arriva al corso
c2 = entra("lia@test.it", "password1")
assert "/corsi/" in c2.get("/accesso").headers.get("Location", "")

# esame: senza il lavoro la pratica non passa; con il lavoro finale dell'esercizio e la teoria giusta sì
stato = (Path(__file__).parent / "dicembre-wms-finale.json").read_text()
with app.app_context():
    db.session.add(StatoLavoro(utente_id=uid, versione="erp-ft", dati=stato))
    db.session.commit()
h = c.get("/corsi/erp/esame").get_data(as_text=True)
assert "Inizia l'esame" in h
t = csrf(h)
assert c.post("/corsi/erp/esame", data={"csrf": t, "azione": "inizia"}).status_code == 302
h = c.get("/corsi/erp/esame").get_data(as_text=True)
with app.app_context():
    te = TentativoEsame.query.filter_by(utente_id=uid, chiuso=None).first()
    scelte = json.loads(te.domande)
dati = {"csrf": csrf(h), "azione": "consegna"}
dati.update({f"d{i}": str(DOMANDE["erp"][i][2]) for i in scelte})
h = c.post("/corsi/erp/esame", data=dati).get_data(as_text=True)
assert "ESAME SUPERATO" in h, re.findall(r"<p>.*?</p>", h)[:3]
codice = re.search(r"(ERP-[A-Z0-9]{8})", h).group(1)
pdf = c.get(f"/corsi/attestato/{codice}.pdf")
assert pdf.status_code == 200 and pdf.data[:4] == b"%PDF"
v = pub.get(f"/corsi/verifica/{codice}").get_data(as_text=True)
assert "Attestato valido" in v and "Lia Rossi" in v
assert "Nessun attestato" in pub.get("/corsi/verifica/ERP-NONESISTE").get_data(as_text=True)
assert pub.get(f"/corsi/attestato/{codice}.pdf").status_code == 302           # serve l'accesso

# un allievo di classe (senza iscrizione) non è toccato dalla prova gratuita
with app.app_context():
    a = Utente(username="aula1", nome="Aula", ruolo="allievo", deve_cambiare_password=False)
    a.imposta_password("password1")
    db.session.add(a)
    db.session.commit()
ca = entra("aula1", "password1")
assert ca.get("/vuoto/").status_code == 200 and ca.get("/area/").status_code == 200
print("corsi privati: ok")
