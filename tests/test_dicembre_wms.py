"""Guida «Dicembre: dalla costituzione alla riapertura»: selezione dal launchpad, pagine della guida, indicatori e consegna."""
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
assert 'Dicembre: dalla costituzione alla riapertura' in h and 'esercizio_guida=dicembre-wms' in h
assert c.get('/static/guida/esercizi/dicembre-wms.js').status_code == 200
assert config(c.get('/vuoto/s4/dati/?esercizio_guida=dicembre-wms').get_data(as_text=True))['esercizio'] == 'dicembre-wms'
assert config(c.get('/vuoto/m/wms').get_data(as_text=True))['esercizio'] == 'dicembre-wms'   # la scelta resta nella sessione
g = config(c.get('/vuoto/m/pp').get_data(as_text=True))
src = c.get('/static/guida/esercizi/dicembre-wms.js').get_data(as_text=True)
prefixes = dict(re.findall(r"([A-Z])='(erp_\w+\.)'", src))
endpoints = sorted(set(prefixes[p] + name for p, name in re.findall(r"ep:([A-Z])\+'(\w+)'", src))) + ['allievo.consegna']
for ep in endpoints:
    assert ep in g['url'], ep
    r = c.get(g['url'][ep])
    assert r.status_code == 200, (ep, r.status_code)
    if ep != 'allievo.consegna':
        assert config(r.get_data(as_text=True))['esercizio'] == 'dicembre-wms', ep
for nuova in ('/vuoto/s4/contabilita-s4/passive', '/vuoto/s4/contabilita-s4/sopravvenienze', '/vuoto/s4/tesoreria/anticipi', '/vuoto/s4/chiusura/assestamenti'):
    assert c.get(nuova).status_code == 200, nuova
assert config(c.get('/vuoto/?esercizio_guida=ragioneria-wms').get_data(as_text=True))['esercizio'] == 'ragioneria-wms'

stato = (Path(__file__).parent / 'dicembre-wms-finale.json').read_text()
ind = Lavoro(json.loads(stato)).indicatori()
for k, label, att, tol in attesi_esercizio('dicembre-wms', json.loads(stato)):
    assert k in ind, k
    assert (ind[k] == att if tol is None else abs(ind[k] - att) <= tol), (k, ind[k], att)

assert json.loads(stato)['produzioneModello'] == 'wip-fasi-v1'
assert all(r['ok'] for r in Lavoro(json.loads(stato)).confronto('dicembre-wms'))
# Fotografie precedenti: stesso codice di consegna, attesi storici e guida storica.
legacy_path = Path(__file__).parent / 'fixtures' / 'dicembre-wms-legacy.json'
legacy = json.loads(legacy_path.read_text())
assert 'produzioneModello' not in legacy
assert attesi_esercizio('dicembre-wms', legacy) is ESERCIZI['dicembre-wms']['attesi']
legacy_righe = Lavoro(legacy).confronto('dicembre-wms')
assert len(legacy_righe) == 23 and all(r['ok'] for r in legacy_righe), legacy_righe
assert Lavoro(legacy).indicatori()['dc_scorte'] == '740/9/10/0'

with app.app_context():
    u = Utente(username='prova.dicembre', nome='Prova Dicembre WMS', deve_cambiare_password=False)
    u.imposta_password('password-test-locale')
    db.session.add(u)
    db.session.commit()
    uid = u.id
a = entra('prova.dicembre', 'password-test-locale')
sync = json.loads(re.search(r'window.MSA_SYNC = (.*?);</script>', a.get('/vuoto/').get_data(as_text=True)).group(1))
assert a.post('/api/stato/erp-ft', json={'csrf': sync['csrf'], 'stato': stato}).status_code == 200
h = a.get('/area/consegna').get_data(as_text=True)
assert 'value="dicembre-wms"' in h
r = a.post('/area/consegna', data={'csrf': csrf(h), 'versione': 'erp-ft', 'esercizio': 'dicembre-wms'})
assert r.status_code == 302
with app.app_context():
    x = Consegna.query.filter_by(utente_id=uid).one()
    assert x.esercizio == 'dicembre-wms' and x.dati == stato
print(f'OK dicembre: {len(endpoints)} pagine della guida, {len(ESERCIZI["dicembre-wms"]["attesi"])} indicatori e consegna allievo')
