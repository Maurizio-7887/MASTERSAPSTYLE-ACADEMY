"""Three distinct visible course-access tiles, sharing one existing ERP engine."""
from html.parser import HTMLParser
from tests._client import docente
from app.pagine import VERSIONI

class Tiles(HTMLParser):
    def __init__(self):
        super().__init__()
        self.found = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "a" and "data-corso" in a:
            self.found.append((a["data-corso"], a.get("href", "")))

c = docente()
expected = {
    "firenze-magazzino-30": "/vuoto/lezioni-magazzino/firenze",
    "pistoia-magazzino-80": "/vuoto/lezioni-magazzino/pistoia",
    "firenze-amministrazione": "/vuoto/s4/dati/?esercizio_guida=dicembre-wms",
}
for url in ("/", "/vuoto/"):
    response = c.get(url)
    assert response.status_code == 200
    landing = response.get_data(as_text=True)
    parser = Tiles()
    parser.feed(landing)
    actual = dict(parser.found)
    assert len(parser.found) == 3, (url, parser.found)
    assert actual == expected, (url, actual)
    for _, target in parser.found:
        assert c.get(target).status_code == 200, target
    # Le due tile dei magazzinieri includono gia' la teoria completa,
    # con l'accesso al corretto esercizio operativo in altra scheda.
    for slug, script in [('firenze', 'dicembre-magazzino-30'), ('pistoia', 'dicembre-magazzino')]:
        theory_page = c.get(f'/vuoto/lezioni-magazzino/{slug}').get_data(as_text=True)
        assert 'Indice delle lezioni' in theory_page
        assert 'ESERCITAZIONE — SEMPRE DISPONIBILE' in theory_page
        assert 'esercizio_guida=' + script in theory_page
    assert landing.index('data-corso="firenze-magazzino-30"') < landing.index('data-corso="pistoia-magazzino-80"')
    assert landing.index('data-corso="pistoia-magazzino-80"') < landing.index('data-corso="firenze-amministrazione"')
    assert "PISTOIA · MAGAZZINO 80 ORE" in landing
    assert "FIRENZE · MAGAZZINO 30 ORE" in landing
    assert "FIRENZE · AMMINISTRAZIONE" in landing
    assert "Cambiare pulsante" in landing or "Cambiare guida" in landing
    if url == "/":
        for obsolete in ("Entra nel sistema integrato", "Avvio e ripresa del lavoro", "Corso FORMAS Pistoia"):
            assert obsolete not in landing, obsolete
        assert landing.count('data-corso="') == 3
print("OK: three separate course tiles with correct guided access on Home and Launchpad")
