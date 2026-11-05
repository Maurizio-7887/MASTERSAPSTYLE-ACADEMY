"""Blocco pilota pubblico «Il tuo primo ordine cliente» di Master ERP Enterprise. Logica pura, nessun dato salvato.

Prima di confermare un ordine di vendita il sistema controlla il credito (fido contro esposizione) e la disponibilità della merce
(si confermano solo le quantità libere). Dati e regole sono quelli di Ferro & Transenne: listino 60/72/55 €, sconto per quantità
2% da 100 pezzi e 4% da 300, IVA 22%."""

IVA = 22
ARTICOLI = {
    "TR-STD": {"nome": "Transenna standard", "prezzo": 6000, "giacenza": 500, "impegnato": 340},
    "TR-ALTA": {"nome": "Transenna alta", "prezzo": 7200, "giacenza": 200, "impegnato": 0},
    "TR-PED": {"nome": "Transenna pedonale", "prezzo": 5500, "giacenza": 300, "impegnato": 120},
}
CLIENTI = {
    "C100": {"nome": "Beta Costruzioni Srl", "fido": 6000000, "aperte": 0},
    "C400": {"nome": "Edil Sigma Srl", "fido": 1500000, "aperte": 980000},
}
CASI = [
    ("ok", "Ordine che passa", "C100", "TR-STD", 50, "50 transenne standard a Beta Costruzioni: credito e magazzino sono a posto."),
    ("fido", "Blocco sul credito", "C400", "TR-ALTA", 100, "100 transenne alte a Edil Sigma: la merce c'è, ma il fido non basta."),
    ("magazzino", "Merce non sufficiente", "C100", "TR-STD", 200, "200 transenne standard: il credito regge, ma ne sono libere solo 160."),
]


class ErroreProva(ValueError):
    pass


def disponibile(art):
    a = ARTICOLI[art]
    return a["giacenza"] - a["impegnato"]


def sconto_pct(qta):
    return 4 if qta >= 300 else 2 if qta >= 100 else 0


def controlla(cliente, art, qta):
    if cliente not in CLIENTI or art not in ARTICOLI:
        raise ErroreProva("Scegli un cliente e un articolo.")
    if qta != int(qta) or qta <= 0 or qta > 100000:
        raise ErroreProva("Scrivi una quantità intera maggiore di zero.")
    qta = int(qta)
    cl, a = CLIENTI[cliente], ARTICOLI[art]
    lordo = a["prezzo"] * qta
    sc = sconto_pct(qta)
    netto = lordo - round(lordo * sc / 100)
    totale = netto + round(netto * IVA / 100)
    dopo = cl["aperte"] + totale
    disp = disponibile(art)
    confermabile = min(qta, disp)
    return {"cliente": cl["nome"], "articolo": a["nome"], "codice": art, "qta": qta, "lordo": lordo, "sconto": sc, "netto": netto, "totale": totale,
            "aperte": cl["aperte"], "fido": cl["fido"], "dopo": dopo, "cred_ok": dopo <= cl["fido"],
            "disponibile": disp, "confermabile": confermabile, "mag_ok": disp >= qta,
            "registrato": dopo <= cl["fido"] and disp >= qta}


def vista():
    return ([{"codice": k, "nome": v["nome"], "fido": v["fido"], "aperte": v["aperte"], "libero": v["fido"] - v["aperte"]} for k, v in CLIENTI.items()],
            [{"codice": k, "nome": v["nome"], "prezzo": v["prezzo"], "giacenza": v["giacenza"], "impegnato": v["impegnato"], "disponibile": disponibile(k)}
             for k, v in ARTICOLI.items()])
