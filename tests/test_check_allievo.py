"""⚡ Check rapido del docente: pulsanti, pagina con i dati dell'allievo e la catena di script della sua guida; vietato agli allievi."""
from pathlib import Path
import json, re, sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests._client import app, docente, entra
from app.db import db, Utente, StatoLavoro, AvanzamentoGuida, DiarioAzione

stato = (Path(__file__).parent / 'fixtures' / 'dicembre-magazzino-finale.json').read_text()
with app.app_context():
    u = Utente(username='prova.check', nome='Prova Check', ruolo='allievo', deve_cambiare_password=False)
    u.imposta_password('password-test-locale'); db.session.add(u); db.session.commit(); uid = u.id
    db.session.add(StatoLavoro(utente_id=uid, versione='erp-ft', dati=stato))
    db.session.add(AvanzamentoGuida(utente_id=uid, esercizio='dicembre-magazzino', versione='erp-ft', posizione=38, posizione_massima=38, totale=92, passi={}))
    db.session.add(DiarioAzione(utente_id=uid, tipo='errore', testo='Quantità non valida', passo='39. prova'))
    db.session.commit()
c = docente()
assert f'/docente/allievo/{uid}/check' in c.get('/docente/').get_data(as_text=True)
assert f'/docente/allievo/{uid}/check' in c.get(f'/docente/allievo/{uid}').get_data(as_text=True)
h = c.get(f'/docente/allievo/{uid}/check').get_data(as_text=True)
assert 'fermo al passo 39' in h and 'check-allievo.js' in h
s = re.findall(r"esercizi/([\w-]+)\.js", h)
assert s.index('dicembre-wms') < s.index('dicembre-wms-semplice') < s.index('dicembre-magazzino'), s
ck = json.loads(re.search(r'window.CK = (.*?); window.CK.stato', h).group(1))
assert ck['pos'] == 38 and ck['diario'][0]['testo'] == 'Quantità non valida'
a = entra('prova.check', 'password-test-locale')
assert a.get(f'/docente/allievo/{uid}/check').status_code in (302, 403)   # solo il docente
print('OK check rapido: pulsanti, pagina, guida e diario; riservato al docente')
