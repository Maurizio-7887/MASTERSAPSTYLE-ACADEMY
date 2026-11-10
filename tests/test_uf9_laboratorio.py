"""Regressione del laboratorio UF9 Pistoia: più merci e valutazione /100."""
from tests._client import docente
from app.blueprints.portale.uf9_esame import PROGRAMMA_ORE, VALUTAZIONE, LIVELLI
from app.blueprints.portale.uf9_laboratorio import POSIZIONI, DISTINTE, CALCOLI, TRASFERIMENTO

assert sum(x["ore"] for x in PROGRAMMA_ORE) == 40
assert len(VALUTAZIONE) == 4
assert len(LIVELLI) == 5
assert [(x["da"], x["a"]) for x in LIVELLI] == [(1,5),(6,10),(11,15),(16,20),(21,25)]
assert len(POSIZIONI) >= 10
assert len({x["art"] for x in POSIZIONI}) >= 4
assert len({x["id"] for x in POSIZIONI}) == len(POSIZIONI)
assert any(x["fisico"] < x["teorico"] for x in POSIZIONI)
assert any(x["fisico"] > x["teorico"] for x in POSIZIONI)
assert any(x["fisico"] == x["teorico"] for x in POSIZIONI)
assert all(x["costo"] > 0 and x["teorico"] >= 0 and x["fisico"] >= 0 for x in POSIZIONI)
assert len(DISTINTE) == 2
assert len({z for d in DISTINTE for z in d["sscc"]}) == sum(len(d["sscc"]) for d in DISTINTE)
assert all(len(v) == 18 for d in DISTINTE for v in d["sscc"])
assert sum(d["attesi"] for d in DISTINTE) == 10
assert sum(len(d["scansionati"]) for d in DISTINTE) == 9
assert CALCOLI == {"prelievo_kg":120,"residuo_kg":80,"fifo":96.0,"lifo":80.0,"medio":88.0}
assert TRASFERIMENTO["in_viaggio_valore"] == 100*TRASFERIMENTO["costo_unitario"]
assert (TRASFERIMENTO["w100"] + TRASFERIMENTO["in_viaggio"] +
        TRASFERIMENTO["d200"]) == TRASFERIMENTO["totale_rete"]
c=docente()
for url in ["/vuoto/uf9-pistoia", "/vuoto/uf9-pistoia/laboratorio"]:
    response=c.get(url)
    assert response.status_code==200,(url,response.status_code)
lab=c.get("/vuoto/uf9-pistoia/laboratorio").get_data(as_text=True)
assert "Conta cieca" in lab
assert "Pistoia" in lab
assert "uf9_laboratorio.js" in lab
assert "u9-recount-area" in lab
assert "u9-shipcheck" in lab and "u9-valuationcheck" in lab
assert "u9-scoretotal" in lab and "1–5 insufficiente" in lab
assert "Non modifica mai le giacenze" in lab
exam=c.get("/vuoto/uf9-pistoia").get_data(as_text=True)
assert "uf9-pistoia/laboratorio" in exam
launch=c.get("/vuoto/").get_data(as_text=True)
assert "uf9-pistoia/laboratorio" in launch
lessons=c.get("/vuoto/lezioni-magazzino/pistoia").get_data(as_text=True)
assert "uf9-pistoia/laboratorio" in lessons
assert "uf9-pistoia/laboratorio" not in c.get("/vuoto/lezioni-magazzino/firenze").get_data(as_text=True)
assert c.get("/not-a-version/uf9-pistoia/laboratorio").status_code==404
print("OK UF9: 40 ore, 4 materiali / 10 ubicazioni, documenti di trasporto, conte, valorizzazione, 4 indicatori")

# I link del corso sono in UNA sola barra didattica dell'ERP, non nel tutor.
from pathlib import Path
root = Path(__file__).resolve().parent.parent
pannello = (root / 'app/blueprints/guida/static/pannello.js').read_text(encoding='utf-8')
shell = (root / 'app/templates/simulatore/_shell.html').read_text(encoding='utf-8')
assert 'APRI LE LEZIONI DEL MIO CORSO' not in pannello
assert 'ESAME INTERMEDIO INVENTARIALE (40 ORE)' not in pannello
assert "m.codice in ['sd', 'mm', 'pp', 'wms']" in shell

pistoia = c.get("/vuoto/s4/dati/?esercizio_guida=magazziniere-5")
assert pistoia.status_code == 200
pistoia_html = pistoia.get_data(as_text=True)
assert "PISTOIA · 80 ORE" in pistoia_html
assert "Lezioni teoriche" in pistoia_html
assert "Prova inventariale UF 9" in pistoia_html
assert 'uf9-pistoia/laboratorio' in pistoia_html
assert "FI</b>" not in pistoia_html
assert "Contabilità finanziaria" not in pistoia_html
assert "Altri moduli" not in pistoia_html  # vista allievo essenziale, senza menu ERP

firenze = c.get("/vuoto/s4/dati/?esercizio_guida=firenze-30")
assert firenze.status_code == 200
firenze_html = firenze.get_data(as_text=True)
assert "FIRENZE · 30 ORE" in firenze_html
assert "Lezioni teoriche" in firenze_html
assert "Prova inventariale UF 9" not in firenze_html
assert "PISTOIA · 80 ORE" not in firenze_html

# La pagina avvio ha la barra compatta soltanto una volta.
assert pistoia_html.count('aria-label="Strumenti del corso di magazzino"') == 1
assert firenze_html.count('aria-label="Strumenti del corso di magazzino"') == 1
