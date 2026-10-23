"""Guida WMS: selezione persistente, endpoint, consegna e correzione sui dati del ciclo provato."""
from pathlib import Path
import sys
import json
import re
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests._client import app, docente, entra, csrf
from app.report import Lavoro
from app.esercizi import ESERCIZI
from app.db import db, Utente, Consegna

def config(html):
    return json.loads(re.search(r'window.MSA_GUIDA = (.*?);</script>', html).group(1))

c = docente()
h = c.get('/vuoto/').get_data(as_text=True)
assert 'Esercitazione ragioneria con WMS' in h
assert config(h)['esercizio'] == 'dicembre-wms'
assert c.get('/static/guida/esercizi/ragioneria-wms.js').status_code == 200
assert c.get('/static/guida/ragioneria.js').status_code == 200
page = c.get('/vuoto/s4/dati/').get_data(as_text=True)
assert page.index('/static/guida/ragioneria.js') < page.index('/static/guida/pannello.js')
pdf = c.get('/materiali/Esercitazione_Ragioneria_con_WMS.pdf')
assert pdf.status_code == 200 and pdf.data.startswith(b'%PDF')
assert config(c.get('/vuoto/s4/dati/?esercizio_guida=s4-integrato').get_data(as_text=True))['esercizio'] == 's4-integrato'
assert config(c.get('/vuoto/m/wms').get_data(as_text=True))['esercizio'] == 's4-integrato'
assert config(c.get('/vuoto/?esercizio_guida=ragioneria-wms').get_data(as_text=True))['esercizio'] == 'ragioneria-wms'
assert config(c.get('/vuoto/m/mm?esercizio_guida=non-valido').get_data(as_text=True))['esercizio'] == 'ragioneria-wms'  # resta la scelta fatta
g = config(c.get('/vuoto/m/pp').get_data(as_text=True))
src = c.get('/static/guida/esercizi/ragioneria-wms.js').get_data(as_text=True)
prefixes = dict(re.findall(r"([A-Z])='(erp_\w+\.)'", src))
endpoints = [prefixes[p]+name for p,name in re.findall(r"ep:([A-Z])\+'(\w+)'", src)] + ['allievo.consegna']
for ep in endpoints:
    assert ep in g['url'], ep
    r = c.get(g['url'][ep])
    assert r.status_code == 200, (ep, r.status_code)
    if ep != 'allievo.consegna':
        assert config(r.get_data(as_text=True))['esercizio'] == 'ragioneria-wms'

stato = (Path(__file__).parent / 'ragioneria-wms-finale.json').read_text()
ind = Lavoro(json.loads(stato)).indicatori()
for k, label, att, tol in ESERCIZI['ragioneria-wms']['attesi']:
    assert k in ind, k
    assert (ind[k] == att if tol is None else abs(ind[k]-att) <= tol), (k, ind[k], att)

with app.app_context():
    u = Utente(username='prova.ragwms', nome='Prova Ragioneria WMS', deve_cambiare_password=False)
    u.imposta_password('password-test-locale')
    db.session.add(u)
    db.session.commit()
    uid = u.id
a = entra('prova.ragwms', 'password-test-locale')
sync = json.loads(re.search(r'window.MSA_SYNC = (.*?);</script>', a.get('/vuoto/').get_data(as_text=True)).group(1))
assert a.post('/api/stato/erp-ft', json={'csrf':sync['csrf'], 'stato':stato}).status_code == 200
h = a.get('/area/consegna').get_data(as_text=True)
assert 'value="ragioneria-wms"' in h
r = a.post('/area/consegna', data={'csrf':csrf(h), 'versione':'erp-ft', 'esercizio':'ragioneria-wms'})
assert r.status_code == 302
assert a.get(r.headers['Location']).status_code == 200
with app.app_context():
    x = Consegna.query.filter_by(utente_id=uid).one()
    assert x.esercizio == 'ragioneria-wms' and x.dati == stato
    prove = json.loads(x.dati)['msaRagioneria']
    assert prove['esiti'] and not prove['coda']
    assert len(prove['esiti']) == len(json.loads(x.dati)['registrazioni'])
    assert all(e['corretto'] and not e['conAiuto'] for e in prove['esiti'])
p2 = Path(__file__).parent / 'ragioneria-chiusura-finale.json'
if p2.exists():
    ind2 = Lavoro(json.loads(p2.read_text())).indicatori()
    for k, label, att, tol in ESERCIZI['ragioneria-wms']['attesi'] + ESERCIZI['ragioneria-wms-chiusura']['attesi']:
        assert k in ind2, k
        assert (ind2[k] == att if tol is None else abs(ind2[k]-att) <= tol), ('seconda parte', k, ind2[k], att)
print(f'OK: selezione persistente, {len(endpoints)} collegamenti guida, 18 indicatori finali e consegna allievo' + (', 14 indicatori della seconda parte e i 18 della prima ancora giusti dopo la chiusura' if p2.exists() else ''))
