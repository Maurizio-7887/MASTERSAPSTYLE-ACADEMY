"""Guida «Executive Assistant: il primo mese di un negozio di informatica»: launchpad, pagine della guida, indicatori,
consegna dell'allievo e corso per privati /corsi/executive."""
from pathlib import Path
import sys
import json
import re
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests._client import app, docente, entra, csrf
from app.report import Lavoro
from app.esercizi import ESERCIZI, attesi_esercizio
from app.corsi_privati import CORSI, DOMANDE, DOMANDE_ESAME
from app.db import db, Utente, Consegna


def config(html):
    return json.loads(re.search(r'window.MSA_GUIDA = (.*?);</script>', html).group(1))


c = docente()
h = c.get('/vuoto/').get_data(as_text=True)
assert 'Executive Assistant: quattro mesi di un negozio' in h and 'esercizio_guida=executive-assistant' in h
assert c.get('/static/guida/esercizi/executive-assistant.js').status_code == 200
assert config(c.get('/vuoto/s4/dati/?esercizio_guida=executive-assistant').get_data(as_text=True))['esercizio'] == 'executive-assistant'
g = config(c.get('/vuoto/m/wms').get_data(as_text=True))
assert g['esercizio'] == 'executive-assistant'   # la scelta resta nella sessione
src = c.get('/static/guida/esercizi/executive-assistant.js').get_data(as_text=True)
prefissi = dict(re.findall(r"([A-Z]) = '(erp_\w+\.)'", src))
endpoints = sorted(set(prefissi[p] + nome for p, nome in re.findall(r"ep: ([A-Z]) \+ '(\w+)'", src)) | {'allievo.consegna'})
assert len(endpoints) >= 15, endpoints
for ep in endpoints:
    assert ep in g['url'], ep
    r = c.get(g['url'][ep])
    assert r.status_code == 200, (ep, r.status_code)
    if ep != 'allievo.consegna':
        assert config(r.get_data(as_text=True))['esercizio'] == 'executive-assistant', ep

stato = (Path(__file__).parent / 'executive-finale.json').read_text()
ind = Lavoro(json.loads(stato)).indicatori()
for k, label, att, tol in attesi_esercizio('executive-assistant', json.loads(stato)):
    assert k in ind, k
    assert (ind[k] == att if tol is None else abs(ind[k] - att) <= tol), (k, ind[k], att)
assert all(r['ok'] for r in Lavoro(json.loads(stato)).confronto('executive-assistant'))

with app.app_context():
    u = Utente(username='prova.executive', nome='Prova Executive', deve_cambiare_password=False)
    u.imposta_password('password-test-locale')
    db.session.add(u)
    db.session.commit()
    uid = u.id
a = entra('prova.executive', 'password-test-locale')
sync = json.loads(re.search(r'window.MSA_SYNC = (.*?);</script>', a.get('/vuoto/').get_data(as_text=True)).group(1))
assert a.post('/api/stato/erp-ft', json={'csrf': sync['csrf'], 'stato': stato}).status_code == 200
h = a.get('/area/consegna').get_data(as_text=True)
assert 'value="executive-assistant"' in h
r = a.post('/area/consegna', data={'csrf': csrf(h), 'versione': 'erp-ft', 'esercizio': 'executive-assistant'})
assert r.status_code == 302
with app.app_context():
    x = Consegna.query.filter_by(utente_id=uid).one()
    assert x.esercizio == 'executive-assistant' and x.dati == stato

# corso per privati: programma pubblico, senza produzione, con domande d'esame sufficienti
ex = CORSI['executive']
assert ex['esercizio'] == 'executive-assistant' and ex['ore'] == 32
assert not any('produzione' in m[0].lower() or 'erp_produzione' in str(m[4]) for m in ex['moduli'])
assert len(DOMANDE['executive']) >= DOMANDE_ESAME
assert not any('distinta' in d[0].lower() or 'WIP' in d[0] for d in DOMANDE['executive'])
pub = app.test_client().get('/corsi/executive')
assert pub.status_code == 200 and 'Executive Assistant' in pub.get_data(as_text=True), pub.status_code
print(f'OK executive assistant: {len(endpoints)} pagine della guida, {len(ESERCIZI["executive-assistant"]["attesi"])} indicatori, consegna allievo e corso /corsi/executive')
