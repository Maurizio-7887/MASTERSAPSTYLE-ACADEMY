"""Guida «Magazziniere 5.0: un mese di magazzino»: selezione dal launchpad, pagine della guida, indicatori e consegna."""
from pathlib import Path
import sys
import json
import re
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests._client import app, docente, entra, csrf
from app.report import Lavoro
from app.esercizi import ESERCIZI, attesi_esercizio
from app.db import db, Utente, Consegna


def config(html):
    return json.loads(re.search(r'window.MSA_GUIDA = (.*?);</script>', html).group(1))


c = docente()
h = c.get('/vuoto/').get_data(as_text=True)
assert 'Magazziniere 5.0: un mese di magazzino' in h and 'esercizio_guida=magazziniere-5' in h
assert c.get('/static/guida/esercizi/magazziniere-5.js').status_code == 200
assert config(c.get('/vuoto/s4/dati/?esercizio_guida=magazziniere-5').get_data(as_text=True))['esercizio'] == 'magazziniere-5'
g = config(c.get('/vuoto/m/wms').get_data(as_text=True))
assert g['esercizio'] == 'magazziniere-5'   # la scelta resta nella sessione
src = c.get('/static/guida/esercizi/magazziniere-5.js').get_data(as_text=True)
prefissi = dict(re.findall(r"([A-Z]) = '(erp_\w+\.)'", src))
endpoints = sorted(set(prefissi[p] + nome for p, nome in re.findall(r"ep: ([A-Z]) \+ '(\w+)'", src)) | {'allievo.consegna'})
assert len(endpoints) >= 20, endpoints
for ep in endpoints:
    assert ep in g['url'], ep
    r = c.get(g['url'][ep])
    assert r.status_code == 200, (ep, r.status_code)
    if ep != 'allievo.consegna':
        assert config(r.get_data(as_text=True))['esercizio'] == 'magazziniere-5', ep

stato = (Path(__file__).parent / 'magazziniere-finale.json').read_text()
ind = Lavoro(json.loads(stato)).indicatori()
for k, label, att, tol in attesi_esercizio('magazziniere-5', json.loads(stato)):
    assert k in ind, k
    assert (ind[k] == att if tol is None else abs(ind[k] - att) <= tol), (k, ind[k], att)
assert all(r['ok'] for r in Lavoro(json.loads(stato)).confronto('magazziniere-5'))

with app.app_context():
    u = Utente(username='prova.magazziniere', nome='Prova Magazziniere', deve_cambiare_password=False)
    u.imposta_password('password-test-locale')
    db.session.add(u)
    db.session.commit()
    uid = u.id
a = entra('prova.magazziniere', 'password-test-locale')
sync = json.loads(re.search(r'window.MSA_SYNC = (.*?);</script>', a.get('/vuoto/').get_data(as_text=True)).group(1))
assert a.post('/api/stato/erp-ft', json={'csrf': sync['csrf'], 'stato': stato}).status_code == 200
h = a.get('/area/consegna').get_data(as_text=True)
assert 'value="magazziniere-5"' in h
r = a.post('/area/consegna', data={'csrf': csrf(h), 'versione': 'erp-ft', 'esercizio': 'magazziniere-5'})
assert r.status_code == 302
with app.app_context():
    x = Consegna.query.filter_by(utente_id=uid).one()
    assert x.esercizio == 'magazziniere-5' and x.dati == stato
print(f'OK magazziniere: {len(endpoints)} pagine della guida, {len(ESERCIZI["magazziniere-5"]["attesi"])} indicatori e consegna allievo')
