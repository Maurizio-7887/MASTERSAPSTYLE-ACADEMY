"""Verifica Flask: il docente può aprire Pistoia e Firenze in archivi
PostgreSQL/logici distinti dal suo archivio principale.
Nessun reset, nessuna scrittura contabile e nessun servizio esterno.
"""
import json
import re
from tests._client import docente

client = docente()

def get_config(html, name):
    match = re.search(r"window\." + re.escape(name) + r"\s*=\s*(\{[^\n]*\});", html)
    assert match, "Manca configurazione " + name
    return json.loads(match.group(1))

def pagina(esercizio):
    response = client.get("/vuoto/s4/dati/?esercizio_guida=" + esercizio + "&riprendi=1")
    assert response.status_code == 200, (esercizio, response.status_code)
    html = response.get_data(as_text=True)
    config = get_config(html, "LAB_PAGINA")
    sync = get_config(html, "MSA_SYNC")
    guida = get_config(html, "MSA_GUIDA")
    assert config["slot"] == sync["versione"], esercizio
    assert config["chiave"] == sync["chiave"], esercizio
    assert guida["chiave"] == config["chiave"], esercizio
    assert guida["esercizio"] == esercizio, esercizio
    return config, html

p, ph = pagina("magazziniere-5")
assert p["slot"] == "erp-ft-doc-pistoia", p
assert "PISTOIA · 80 ORE" in ph
assert "FIRENZE · 30 ORE" not in ph

f, fh = pagina("firenze-30")
assert f["slot"] == "erp-ft-doc-firenze", f
assert "FIRENZE · 30 ORE" in fh
assert "PISTOIA · 80 ORE" not in fh

p2, ph2 = pagina("magazziniere-5")
assert p2["slot"] == p["slot"]
assert p["chiave"] != f["chiave"]

with client.session_transaction() as ses:
    ses.pop("guida_integrata", None)
principale = client.get("/vuoto/s4/dati/")
assert principale.status_code == 200
cmain = get_config(principale.get_data(as_text=True), "LAB_PAGINA")
assert cmain["slot"] == "erp-ft", cmain
assert cmain["chiave"] not in (p["chiave"], f["chiave"])

for version in (p["slot"], f["slot"]):
    r = client.get("/api/stato/" + version)
    assert r.status_code == 200, (version, r.status_code)

print("OK: docente Pistoia, Firenze e ERP principale con tre archivi separati.")
