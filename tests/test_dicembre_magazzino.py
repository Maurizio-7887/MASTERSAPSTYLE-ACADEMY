"""«Dicembre in magazzino» (magazzinieri, senza ragioneria): launchpad, script della guida nell'ordine giusto,
menu solo SD/MM/PP/WMS, pagine della guida, numeri di controllo e consegna. La versione con ragioneria non cambia."""
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


def script_guida(html):
    return re.findall(r"/static/guida/esercizi/([\w-]+)\.js", html)


c = docente()
lp = c.get('/vuoto/').get_data(as_text=True)
assert 'esercizio_guida=dicembre-magazzino' in lp and 'per MAGAZZINIERI (senza ragioneria)' in lp
assert 'esercizio_guida=dicembre-wms' in lp and 'CON ragioneria' in lp
for f in ('Esercitazione_Dicembre_Magazzino.docx', 'Esercitazione_Dicembre_Magazzino.pdf'):
    assert c.get('/materiali/' + f).status_code == 200, f

h = c.get('/vuoto/s4/dati/?esercizio_guida=dicembre-magazzino').get_data(as_text=True)
g = config(h)
assert g['esercizio'] == 'dicembre-magazzino' and g['progress_version'] == 'erp-ft'
s = script_guida(h)
assert s.index('dicembre-wms') < s.index('dicembre-wms-semplice') < s.index('dicembre-magazzino'), s
assert 'cpm-formas' not in s and 'dicembre-wms-legacy' not in s, s
# come gli altri corsi di magazzino: niente menu dei moduli contabili, barra del corso Pistoia con le lezioni e la prova UF9
m = c.get('/vuoto/m/wms').get_data(as_text=True)
assert config(m)['esercizio'] == 'dicembre-magazzino'   # la scelta resta nella sessione
d = c.get('/vuoto/s4/dati/?esercizio_guida=dicembre-magazzino').get_data(as_text=True)
assert 'PISTOIA · 80 ORE' in d and 'uf9-pistoia/laboratorio' in d and 'msa-attivita tabs' not in d
assert 'window.MSA_CORSO_GUIDA = "dicembre-magazzino"' in d
sigle = ['SD', 'MM', 'PP', 'WMS']
# Firenze 30 ore: la versione essenziale, con la catena di script completa
f = c.get('/vuoto/s4/dati/?esercizio_guida=dicembre-magazzino-30').get_data(as_text=True)
assert config(f)['esercizio'] == 'dicembre-magazzino-30' and 'FIRENZE · 30 ORE' in f and 'uf9-pistoia/laboratorio' not in f
s30 = script_guida(f)
assert s30.index('dicembre-wms') < s30.index('dicembre-wms-semplice') < s30.index('dicembre-magazzino') < s30.index('dicembre-magazzino-30'), s30
# i pulsanti dei due corsi
from app.blueprints.portale.lezioni_magazzino_contenuti import PERCORSI
assert PERCORSI['pistoia']['esercizio'] == 'dicembre-magazzino' and PERCORSI['firenze']['esercizio'] == 'dicembre-magazzino-30'
assert 'esercizio_guida=dicembre-magazzino-30' in c.get('/vuoto/lezioni-magazzino/firenze').get_data(as_text=True)
# prove del docente in archivi nuovi e separati
assert json.loads(re.search(r'window.LAB_PAGINA = (.*?);</script>', d).group(1))['slot'] == 'erp-ft-doc-dic-pistoia'
assert json.loads(re.search(r'window.LAB_PAGINA = (.*?);</script>', f).group(1))['slot'] == 'erp-ft-doc-dic-firenze'
c.get('/vuoto/s4/dati/?esercizio_guida=dicembre-magazzino')

# le pagine della guida (dalla versione con ragioneria, filtrata) esistono e aprono la stessa guida
src = c.get('/static/guida/esercizi/dicembre-wms.js').get_data(as_text=True)
prefissi = dict(re.findall(r"([A-Z])='(erp_\w+\.)'", src))
mag = c.get('/static/guida/esercizi/dicembre-magazzino.js').get_data(as_text=True)
assert "verificaRagioneria: false" in mag
eps = {'erp_magazzino.monitor', 'allievo.consegna'}
for ep in sorted(eps | {prefissi[p] + n for p, n in re.findall(r"ep:([A-Z])\+'(\w+)'", src)}):
    if ep.split('.')[0] in ('erp_fi', 'erp_cespiti', 'erp_chiusura', 'erp_paghe', 'erp_finanza', 'erp_tesoreria', 'erp_costi'):
        continue   # pagine solo della versione con ragioneria
    assert ep in g['url'], ep
    r = c.get(g['url'][ep])
    assert r.status_code == 200, (ep, r.status_code)

# la versione con ragioneria resta com'è
h2 = c.get('/vuoto/s4/dati/?esercizio_guida=dicembre-wms').get_data(as_text=True)
assert config(h2)['esercizio'] == 'dicembre-wms'
assert 'dicembre-magazzino' not in script_guida(h2)

# numeri di controllo: solo quantità e documenti
att = ESERCIZI['dicembre-magazzino']['attesi']
assert len(att) == 15 and not any(k.startswith(('dc_rimanenze', 'dc_utile', 'dc_ires', 'dc_banca')) for k, *_ in att)
stato = (Path(__file__).parent / 'fixtures' / 'dicembre-magazzino-finale.json').read_text()
risultato = Lavoro(json.loads(stato)).confronto('dicembre-magazzino')
assert all(r['ok'] for r in risultato), [r for r in risultato if not r['ok']]
assert attesi_esercizio('dicembre-magazzino', json.loads(stato)) == att

with app.app_context():
    u = Utente(username='prova.dicembre.mag', nome='Prova Dicembre Magazzino', deve_cambiare_password=False)
    u.imposta_password('password-test-locale')
    db.session.add(u)
    db.session.commit()
    uid = u.id
a = entra('prova.dicembre.mag', 'password-test-locale')
sync = json.loads(re.search(r'window.MSA_SYNC = (.*?);</script>', a.get('/vuoto/').get_data(as_text=True)).group(1))
assert a.post('/api/stato/erp-ft', json={'csrf': sync['csrf'], 'stato': stato}).status_code == 200
fh = a.get('/area/consegna?esercizio=dicembre-magazzino').get_data(as_text=True)
assert 'value="dicembre-magazzino" selected' in fh
r = a.post('/area/consegna', data={'csrf': csrf(fh), 'versione': 'erp-ft', 'esercizio': 'dicembre-magazzino'})
assert r.status_code == 302
with app.app_context():
    x = Consegna.query.filter_by(utente_id=uid, esercizio='dicembre-magazzino').one()
    assert x.dati == stato
# Firenze 30 ore: numeri di controllo dell'essenziale
stato30 = (Path(__file__).parent / 'fixtures' / 'dicembre-magazzino-30-finale.json').read_text()
r30 = Lavoro(json.loads(stato30)).confronto('dicembre-magazzino-30')
assert len(r30) == 14 and all(r['ok'] for r in r30), [r for r in r30 if not r['ok']]
fh30 = a.get('/area/consegna?esercizio=dicembre-magazzino-30').get_data(as_text=True)
assert 'value="dicembre-magazzino-30" selected' in fh30

# chi aveva già iniziato il vecchio percorso logistico continua con la sua guida, e viceversa
vecchio = (Path(__file__).parent / 'magazziniere-finale.json').read_text()
with app.app_context():
    for nome in ('prova.vecchio.mag', 'prova.nuovo.mag'):
        x = Utente(username=nome, nome=nome, deve_cambiare_password=False)
        x.imposta_password('password-test-locale')
        db.session.add(x)
    db.session.commit()
v = entra('prova.vecchio.mag', 'password-test-locale')
sv = json.loads(re.search(r'window.MSA_SYNC = (.*?);</script>', v.get('/vuoto/').get_data(as_text=True)).group(1))
assert v.post('/api/stato/erp-ft', json={'csrf': sv['csrf'], 'stato': vecchio}).status_code == 200
assert config(v.get('/vuoto/s4/dati/?esercizio_guida=dicembre-magazzino').get_data(as_text=True))['esercizio'] == 'magazziniere-5'
assert config(v.get('/vuoto/s4/dati/?esercizio_guida=dicembre-magazzino-30').get_data(as_text=True))['esercizio'] == 'firenze-30'
nu = entra('prova.nuovo.mag', 'password-test-locale')
sn = json.loads(re.search(r'window.MSA_SYNC = (.*?);</script>', nu.get('/vuoto/').get_data(as_text=True)).group(1))
assert config(nu.get('/vuoto/s4/dati/?esercizio_guida=dicembre-magazzino').get_data(as_text=True))['esercizio'] == 'dicembre-magazzino'   # account vuoto
assert nu.post('/api/stato/erp-ft', json={'csrf': sn['csrf'], 'stato': stato}).status_code == 200
assert config(nu.get('/vuoto/s4/dati/?esercizio_guida=magazziniere-5').get_data(as_text=True))['esercizio'] == 'dicembre-magazzino'   # link vecchio (UF9)
assert config(nu.get('/vuoto/s4/dati/?esercizio_guida=firenze-30').get_data(as_text=True))['esercizio'] == 'dicembre-magazzino-30'

print(f'OK dicembre in magazzino: {len(att)} numeri di controllo, moduli {sigle}, consegna allievo')
