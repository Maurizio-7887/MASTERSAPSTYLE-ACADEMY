"""Configurazione, asset, navigazione e materiali su database temporaneo di test."""
import json,re,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from tests._client import app, docente
from flask import url_for
R=Path(__file__).resolve().parents[1]
c=docente();n=0
for versione in ['vuoto','completo']:
    r=c.get(f'/{versione}/s4/dati/avvio?esercizio_guida=completo-formas')
    if r.status_code!=200:
        with app.test_request_context():
            u=url_for('erp_dati.avvio',versione=versione,esercizio_guida='completo-formas')
        r=c.get(u)
    assert r.status_code==200
    html=r.get_data(as_text=True)
    assert '"esercizio": "completo-formas"' in html
    assets=['dicembre-wms-legacy.js','cpm-formas.js','dicembre-wms.js','magazzino-formas.js','laboratori-completi.js','uso-programma.js','completo-formas.js','ragioneria.js','pannello.js']
    for a,b in zip(assets,assets[1:]): assert html.index(a)<html.index(b),(a,b)
    n+=len(assets)
    endpoints=json.loads((R/'tests/_completo/endpoints.json').read_text())
    assert {'erp_costi.scheda','erp_costi.calcolo','erp_fi.giornale','erp_fi.mastro'} <= set(endpoints)
    with app.test_request_context():
        urls=[url_for(ep,versione=versione) for ep in endpoints]
    for u in urls:
        rr=c.get(u);assert rr.status_code==200,(u,rr.status_code);n+=1
    # Tornare alla vecchia guida non aggiunge i nuovi laboratori.
    with app.test_request_context(): old=url_for('erp_dati.avvio',versione=versione,esercizio_guida='dicembre-wms')
    h=c.get(old).get_data(as_text=True)
    assert 'magazzino-formas.js' not in h
    n+=1
    for u in [f'/{versione}/',f'/{versione}/formazione/formas']:
        h=c.get(u).get_data(as_text=True);assert 'Esercitazione_Completa_FORMAS.pdf' in h;assert 'completo-formas' in h;n+=1
for name in ['Esercitazione_Completa_FORMAS.pdf','Esercitazione_Completa_FORMAS.md']:
    r=c.get('/materiali/'+name);assert r.status_code==200;assert len(r.data)>1000;n+=1
assert c.get('/materiali/non-autorizzato.txt').status_code==404;n+=1
print(f'OK: {n} controlli rotte, guide, materiali e isolamento della selezione.')
