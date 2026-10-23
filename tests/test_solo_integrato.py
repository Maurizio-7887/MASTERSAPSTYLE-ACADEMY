"""Percorso ordinario soltanto integrato; archivi conservati separatamente."""
from pathlib import Path
from html.parser import HTMLParser
import json
import re
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from flask import url_for
from tests._client import app, docente
from app.pagine import MODULI, LABORATORI, MODULI_ARCHIVIO

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.hrefs.append(dict(attrs).get('href', ''))

def config(html, name):
    match = re.search(r'window\.' + name + r' = (.*?);</script>', html)
    assert match, name
    return json.loads(match.group(1))

c = docente()
assert '<option value="erp-ft" selected>' in c.get('/docente/passa').get_data(as_text=True)
checks = 0
for v in ['vuoto', 'completo']:
    pages = ['/', f'/{v}/', f'/{v}/formazione/']
    pages += [f'/{v}/m/{m["codice"]}' for m in MODULI]
    for u in pages:
        r = c.get(u)
        assert r.status_code == 200, u
        html = r.get_data(as_text=True)
        links = Links()
        links.feed(html)
        assert 'passa a ' not in html
        assert 'scegli la versione' not in html
        for href in links.hrefs:
            if not href.startswith('/'):
                continue
            ep, args = app.url_map.bind('localhost').match(href.split('?')[0])
            assert ep.split('.')[0] not in {
                'contabilita', 'vendite_acquisti', 'produzione', 'pianificazione',
                'controllo', 'reportistica', 'impostazioni', 'personale',
                'alta_varieta', 'ripetitiva'}, (u, href)
            assert ep != 'portale.tutto', (u, href)
            if ep == 'portale.materiale':
                assert args.get('file') in {'Esercitazione_Ragioneria_con_WMS.pdf', 'Esercitazione_Ragioneria_con_WMS.docx', 'Esercitazione_Dicembre_2026.docx', 'Esercitazione_Completa_FORMAS.pdf'}, (u, href)
            assert args.get('codice') not in {'s4', 'hmlv', 'rem', 'pian', 'rep'}, (u, href)
        if '/m/' in u or u == f'/{v}/':
            assert config(html, 'MSA_SYNC')['versione'] == 'erp-ft'
            guide = config(html, 'MSA_GUIDA')
            assert guide['esercizio'] == 'dicembre-wms', u  # uso libero: dicembre 2026 con riapertura
            assert guide['chiave'] == 'ferro-transenne-fi-2026-erp-ft-civilistico'
        checks += 1

    with app.test_request_context():
        for bp, lab in LABORATORI.items():
            if lab['slot'] != 'erp-ft':
                continue
            for page in lab['pagine']:
                u = url_for(page['ep'], versione=v)
                r = c.get(u)
                assert r.status_code == 200, u
                html = r.get_data(as_text=True)
                assert config(html, 'LAB_PAGINA')['slot'] == 'erp-ft', u
                assert config(html, 'MSA_SYNC')['versione'] == 'erp-ft', u
                assert config(html, 'MSA_GUIDA')['esercizio'] == 'dicembre-wms', u
                assert f'/m/{lab["codice"]}' in html, u
                assert lab['codice'] in {m['codice'] for m in MODULI}
                assert 'separato dal simulatore principale' not in html, u
                checks += 1

# Accessi storici ancora funzionanti, nessuna rimozione distruttiva.
for u in ['/vuoto/tutto', '/vuoto/alta-varieta/', '/vuoto/ripetitiva/',
          '/materiali/Guida-esercizio-integrato.pdf']:
    assert c.get(u).status_code == 200, u
    checks += 1
assert len(MODULI_ARCHIVIO) > len(MODULI)
print(f'OK: {checks} pagine e configurazioni del percorso unico integrato')


# Allievo nuovo: nessuna opzione classica, salvataggio unico e consegna integrata.
from tests._client import entra, csrf
from app.db import db, Utente, StatoLavoro, Consegna
with app.app_context():
    u = Utente(username='prova.integrato', nome='Prova Integrato', deve_cambiare_password=False)
    u.imposta_password('password-test-locale')
    db.session.add(u)
    db.session.commit()
    uid = u.id
a = entra('prova.integrato', 'password-test-locale')
html = a.get('/area/').get_data(as_text=True)
assert 'Il mio sistema integrato' in html
assert 'Versione vuoto' not in html and 'Versione completo' not in html
html = a.get('/area/consegna').get_data(as_text=True)
assert 'value="erp-ft"' in html
assert 'value="vuoto"' not in html and 'value="lab-hmlv"' not in html
assert 's4-magazzino' in html and 'guidato-dic-2026' not in html

fixture = Path(__file__).parent / 'lab-erp-finale.json'
stato = fixture.read_text()
sync = config(a.get('/vuoto/').get_data(as_text=True), 'MSA_SYNC')
r = a.post('/api/stato/erp-ft', json={'csrf': sync['csrf'], 'stato': stato})
assert r.status_code == 200
for url in ['/vuoto/', '/completo/', '/vuoto/m/sd', '/vuoto/m/mm', '/vuoto/m/pp', '/vuoto/m/wms',
            '/vuoto/s4/vendite/', '/vuoto/s4/acquisti/', '/vuoto/s4/produzione/']:
    r = a.get(url)
    assert r.status_code == 200, url
    saved = config(r.get_data(as_text=True), 'MSA_SYNC')
    assert saved['stato'] == stato and saved['versione'] == 'erp-ft', url

html = a.get('/area/consegna').get_data(as_text=True)
r = a.post('/area/consegna', data={'csrf': csrf(html), 'versione': 'erp-ft', 'esercizio': 's4-magazzino'})
assert r.status_code == 302 and '/area/consegna/' in r.headers['Location']
with app.app_context():
    consegna = Consegna.query.filter_by(utente_id=uid).one()
    assert consegna.versione == 'erp-ft' and consegna.dati == stato
    # Un vecchio salvataggio non viene cancellato o mescolato al nuovo.
    storico = json.dumps({'registrazioni': [], 'nota': 'archivio da preservare'})
    db.session.add(StatoLavoro(utente_id=uid, versione='vuoto', dati=storico))
    db.session.commit()
html = a.get('/area/consegna').get_data(as_text=True)
assert 'Archivio storico' in html and 'value="vuoto"' in html
assert 'value="completo"' not in html
with app.app_context():
    assert StatoLavoro.query.filter_by(utente_id=uid, versione='vuoto').one().dati == storico
    assert StatoLavoro.query.filter_by(utente_id=uid, versione='erp-ft').one().dati == stato
print('OK: area allievo, persistenza condivisa SD/MM/PP/WMS, consegna e conservazione archivio')
