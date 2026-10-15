"""Regressione navigazione: WMS al primo livello accanto a SD, MM e PP.

Solo client Flask con database temporaneo; nessun servizio esterno.
"""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from flask import url_for
from tests._client import app, docente
from app.pagine import MODULI, VERSIONI, app_modulo, modulo


class Navigazione(HTMLParser):
    def __init__(self):
        super().__init__()
        self.gruppo = None
        self.moduli = []
        self.operativi = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'section':
            self.gruppo = a.get('aria-labelledby')
        if tag == 'a':
            self.links.append(a.get('href'))
            if 'data-modulo' in a:
                self.moduli.append(a['data-modulo'])
                if self.gruppo == 'moduli-operativi':
                    self.operativi.append(a['data-modulo'])

    def handle_endtag(self, tag):
        if tag == 'section':
            self.gruppo = None


c = docente()
checks = 0
for versione in VERSIONI:
    r = c.get(f'/{versione}/')
    assert r.status_code == 200
    nav = Navigazione()
    nav.feed(r.get_data(as_text=True))
    assert nav.operativi == ['sd', 'mm', 'pp', 'wms'], nav.operativi
    assert nav.moduli[:4] == nav.operativi
    assert Counter(nav.moduli) == Counter(m['codice'] for m in MODULI)
    assert nav.moduli.count('wms') == 1
    checks += 5

    w = c.get(f'/{versione}/m/wms')
    assert w.status_code == 200
    html = w.get_data(as_text=True)
    assert 'g-magazzino' in html
    assert 'WMS · Sistema integrato' in html
    assert 'collegate allo stesso ambiente del WMS' in html
    assert 'data-kpi="None"' not in r.get_data(as_text=True)
    wn = Navigazione()
    wn.feed(html)
    checks += 5
    with app.test_request_context():
        urls = [url_for(t['endpoint'], versione=versione, **t['args'])
                for t in app_modulo(modulo('wms'))]
        urls += [url_for(ep, versione=versione) for ep in (
            'erp_dati.avvio', 'erp_vendite.ordini',
            'erp_acquisti.ordini', 'erp_produzione.ordini')]
    for u in urls:
        assert u in wn.links, u
        assert c.get(u).status_code == 200, u
        checks += 2
print(f'OK: {checks} controlli WMS/launchpad sulle due versioni')
