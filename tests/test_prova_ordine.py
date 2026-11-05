"""Blocco pilota pubblico «Il tuo primo ordine cliente» (Master ERP Enterprise). Uso: python tests/test_prova_ordine.py"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tests._client import app  # noqa: E402
from app import prova_ordine as p  # noqa: E402

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

from app.blueprints import privati as pv  # noqa: E402
from tests._client import csrf  # noqa: E402

# senza account: porta alla registrazione, che chiede il consenso alla pubblicità
pub = app.test_client()
r = pub.get("/corsi/erp/prova")
verifica(r.status_code == 302 and "/corsi/erp/iscriviti" in r.headers["Location"] and "da=prova" in r.headers["Location"], "senza account: porta alla registrazione")
h = pub.get("/corsi/erp/iscriviti?da=prova").get_data(as_text=True)
verifica('name="pubblicita"' in h and "email informative e promozionali" in h and 'name="da" value="prova"' in h, "il modulo chiede il consenso alla pubblicità")
t = csrf(h)
dati = {"csrf": t, "nome": "Lia", "cognome": "Bianchi", "email": "lia.b@test.it", "password": "password1", "privacy": "1", "da": "prova"}
r = pub.post("/corsi/erp/iscriviti", data=dati)
verifica(r.status_code == 400 and "consenso a ricevere email" in r.get_data(as_text=True), "senza consenso alla pubblicità non si entra")
inviati = []
pv._invia_crm = inviati.append
r = pub.post("/corsi/erp/iscriviti", data={**dati, "pubblicita": "1"})
verifica(r.status_code == 302 and "/corsi/erp/prova" in r.headers["Location"], "con consenso: entra e va alla prova")
verifica(len(inviati) == 1 and inviati[0]["categoria_crm"] == "Privato" and inviati[0]["consenso_newsletter"] is True
         and inviati[0]["email"] == "lia.b@test.it" and inviati[0]["nome"] == "Lia Bianchi" and "prova gratuita" in inviati[0]["fonte"].lower()
         and "pubblicità" in inviati[0]["consenso_dettaglio"] and inviati[0]["tipo_anagrafica"] == "Lead", "il contatto va alla lista Privati del CRM con il consenso")

# con l'account in prova la pagina funziona
c = pub
h = c.get("/corsi/erp/prova").get_data(as_text=True)
verifica("Il tuo primo ordine cliente" in h and "Credito ancora libero" in h and "Merce non sufficiente" in h, "pagina della prova (con account)")
h = c.get("/corsi/erp/prova?cliente=C400&art=TR-ALTA&qta=100").get_data(as_text=True)
verifica("Controllo del credito: NON superato" in h and "Controllo della disponibilità: superato" in h, "pagina: blocco sul credito")
h = c.get("/corsi/erp/prova?cliente=C100&art=TR-STD&qta=200").get_data(as_text=True)
verifica("Il sistema conferma solo <b>160 pz</b>" in h, "pagina: conferma parziale")
h = c.get("/corsi/erp/prova?cliente=C100&art=TR-STD&qta=50").get_data(as_text=True)
verifica("Ordine confermato" in h, "pagina: ordine confermato")
verifica("quantità valida" in c.get("/corsi/erp/prova?cliente=C100&art=TR-STD&qta=abc").get_data(as_text=True), "quantità non valida")
verifica(c.get("/corsi/magazzino/prova").status_code == 404, "corso magazzino: 404")
verifica("Prova subito" in app.test_client().get("/corsi/erp").get_data(as_text=True), "pulsante nella pagina del corso")
verifica("Prova subito" not in app.test_client().get("/corsi/magazzino").get_data(as_text=True), "nessun pulsante nel corso magazzino")
print(f"OK: {ok} controlli")
