"""Blocco pilota pubblico «Il tuo primo ordine cliente» (Master ERP Enterprise). Uso: python tests/test_prova_ordine.py"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests._client import app  # noqa: E402
from app import prova_ordine as p  # noqa: E402
from app.db import Utente  # noqa: E402

ok = 0


def verifica(cond, msg):
    global ok
    if not cond:
        print("✘", msg)
        sys.exit(1)
    ok += 1


r = p.controlla("C100", "TR-STD", 50)
verifica(r["cred_ok"] and r["mag_ok"] and r["registrato"] and r["totale"] == 366000, "caso 1: passa (50 × 60 € + IVA = 3.660 €)")
r = p.controlla("C400", "TR-ALTA", 100)
verifica(not r["cred_ok"] and r["mag_ok"] and r["sconto"] == 2 and r["totale"] == 860832 and r["dopo"] == 1840832, "caso 2: blocco sul credito, sconto 2%")
r = p.controlla("C100", "TR-STD", 200)
verifica(r["cred_ok"] and not r["mag_ok"] and r["confermabile"] == 160, "caso 3: confermabili 160 su 200")
verifica(p.controlla("C100", "TR-PED", 300)["sconto"] == 4 and p.controlla("C100", "TR-PED", 300)["mag_ok"] is False, "sconto 4% da 300; libere 180")
for args in (("C100", "TR-STD", 0), ("C100", "TR-STD", 2.5), ("C999", "TR-STD", 1), ("C100", "XX", 1)):
    try:
        p.controlla(*args)
        verifica(False, f"rifiutato {args}")
    except p.ErroreProva:
        verifica(True, f"rifiutato {args}")

with app.app_context():
    prima = Utente.query.count()
c = app.test_client()
h = c.get("/corsi/erp/prova").get_data(as_text=True)
verifica("Il tuo primo ordine cliente" in h and "Credito ancora libero" in h and "Merce non sufficiente" in h, "pagina pubblica")
h = c.get("/corsi/erp/prova?cliente=C400&art=TR-ALTA&qta=100").get_data(as_text=True)
verifica("Controllo del credito: NON superato" in h and "Controllo della disponibilità: superato" in h, "pagina: blocco sul credito")
h = c.get("/corsi/erp/prova?cliente=C100&art=TR-STD&qta=200").get_data(as_text=True)
verifica("Il sistema conferma solo <b>160 pz</b>" in h, "pagina: conferma parziale")
h = c.get("/corsi/erp/prova?cliente=C100&art=TR-STD&qta=50").get_data(as_text=True)
verifica("Ordine confermato" in h, "pagina: ordine confermato")
verifica("quantità valida" in c.get("/corsi/erp/prova?cliente=C100&art=TR-STD&qta=abc").get_data(as_text=True), "quantità non valida")
verifica(c.get("/corsi/magazzino/prova").status_code == 404, "corso magazzino: 404")
verifica("Prova subito" in c.get("/corsi/erp").get_data(as_text=True), "pulsante nella pagina del corso")
verifica("Prova subito" not in c.get("/corsi/magazzino").get_data(as_text=True), "nessun pulsante nel corso magazzino")
with app.app_context():
    verifica(Utente.query.count() == prima, "nessun dato salvato")
print(f"OK: {ok} controlli")
