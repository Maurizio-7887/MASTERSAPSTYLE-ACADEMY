"""Regressione: le schede Firenze 30 e Pistoia 80 non devono scambiarsi.
La selezione esplicita nell'URL ha precedenza sulla sessione precedente.
Il test non avvia né azzera l'azienda e non crea documenti ERP.
"""
from tests._client import docente

client = docente()
for precedente, attuale, etichetta, guida in [
    ("firenze-30", "magazziniere-5", "PISTOIA · 80 ORE", "magazziniere-5"),
    ("magazziniere-5", "firenze-30", "FIRENZE · 30 ORE", "firenze-30"),
]:
    prima = client.get(f"/vuoto/s4/dati/?esercizio_guida={precedente}&riprendi=1")
    assert prima.status_code == 200, prima.status_code
    response = client.get(f"/vuoto/s4/dati/?esercizio_guida={attuale}&riprendi=1")
    assert response.status_code == 200, response.status_code
    html = response.get_data(as_text=True)
    assert etichetta in html, (attuale, "etichetta errata")
    assert f'"esercizio": "{guida}"' in html or f'"esercizio":"{guida}"' in html, (attuale, "tutor errato")
    altra = "FIRENZE · 30 ORE" if attuale == "magazziniere-5" else "PISTOIA · 80 ORE"
    assert altra not in html, (attuale, "etichetta del corso precedente")
    assert 'aria-label="Pagine del laboratorio"' not in html
print("OK: scambio Firenze/Pistoia eliminato sulla pagina iniziale dell'esercizio.")
