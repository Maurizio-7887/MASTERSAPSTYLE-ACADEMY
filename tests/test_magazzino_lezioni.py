"""Smoke test route e programmi delle lezioni in MASTER SAP STYLE."""
from tests._client import docente
from app.blueprints.portale.lezioni_magazzino_contenuti import LEZIONI, PERCORSI, PISTOIA_APPROFONDIMENTI

assert len(PERCORSI["firenze"]["ordine"]) == 7
assert len(PERCORSI["pistoia"]["ordine"]) == 11
assert PERCORSI["firenze"]["esercizio"] == "firenze-30"
assert PERCORSI["pistoia"]["esercizio"] == "magazziniere-5"
assert "flussi" in PERCORSI["firenze"]["ordine"]
assert "valori" in PERCORSI["firenze"]["ordine"]
assert "valori" in PERCORSI["pistoia"]["ordine"]
assert set(PISTOIA_APPROFONDIMENTI) == set(PERCORSI["pistoia"]["ordine"])
assert all(len(LEZIONI[k]["teoria"]) > 250 and LEZIONI[k]["esempio"] and LEZIONI[k]["quiz"]
           for p in PERCORSI.values() for k in p["ordine"])
c = docente()
launch = c.get("/vuoto/")
assert launch.status_code == 200
assert 'lezioni-magazzino/firenze' in launch.get_data(as_text=True)
assert 'lezioni-magazzino/pistoia' in launch.get_data(as_text=True)
for tipo, programma in PERCORSI.items():
    for slug in programma["ordine"]:
        page = c.get(f"/vuoto/lezioni-magazzino/{tipo}?lezione={slug}")
        assert page.status_code == 200, (tipo, slug, page.status_code)
        html = page.get_data(as_text=True)
        assert LEZIONI[slug]["titolo"] in html
        assert "Esempio concreto" in html and "Domande per controllare" in html
        assert "Approfondimento Pistoia" in html if tipo == "pistoia" else "Approfondimento Pistoia" not in html
        assert 'esercizio_guida=' + programma["esercizio"] in html
        assert 'msa-pratica-fissa' in html
        assert 'target="_blank"' in html and 'rel="noopener"' in html
        assert 'ESERCITAZIONE — SEMPRE DISPONIBILE' in html
        assert 'semilavorati in corso (WIP)' in html and 'Ordini clienti (SD)' in html
        assert '<div class="msa-sim">' not in html
assert c.get("/vuoto/lezioni-magazzino/inesistente").status_code == 404
assert c.get("/vuoto/lezioni-magazzino/firenze?lezione=qualita").status_code == 404
print("OK: 7 lezioni Firenze, 11 lezioni Pistoia, ogni pagina collegata al rispettivo tutor")
