"""Banca dei quesiti di ragioneria (Firenze · Amministrazione).

Un file per gruppo di unità. Ogni quesito ha un ID stabile, le opzioni hanno ID
stabili (o1, o2, ...) e la chiave resta sul server: al browser arrivano solo testi.

Due tipi:
  T(...)  teoria / scelta tra frasi (singola o "seleziona tutte le corrette")
  S(...)  scrittura: si sceglie la tabella Dare/Avere corretta fra quattro

Al caricamento il validatore controlla: ID unici, conti esistenti nel piano,
scritture corrette in pareggio, distrattori diversi dalla soluzione e fra loro,
spiegazione per ogni alternativa sbagliata.
"""
from collections import OrderedDict

VERSIONE_BANCA = "2026.11-r2"

# ── PIANO DEI CONTI DIDATTICO (nome → natura) ─────────────────────────────────
# AT = attività · PA = passività · PN = patrimonio netto · CO = costo · RI = ricavo
# RA = rettifica di attività (fondo) · RR = rettifica di ricavo · RC = rettifica di costo · PR = perdite (riducono il PN)
# BI = saldo variabile (Erario c/IVA: credito o debito) · VR = variazione rimanenze (componente economico) · TE = conto tecnico
PIANO = OrderedDict([
    # liquidità
    ("Cassa", "AT"), ("Banca c/c", "AT"),
    # crediti
    ("Crediti v/clienti", "AT"), ("Crediti insoluti", "AT"), ("Fornitori c/anticipi", "AT"),
    ("Fatture da emettere", "AT"), ("Soci c/sottoscrizione", "AT"), ("Depositi cauzionali attivi", "AT"),
    ("IVA ns/credito", "AT"), ("Erario c/acconti d'imposta", "AT"),
    # immobilizzazioni e fondi
    ("Impianti e macchinari", "AT"), ("Automezzi", "AT"), ("Arredamento", "AT"),
    ("F.do amm. impianti e macchinari", "RA"), ("F.do amm. automezzi", "RA"), ("F.do amm. arredamento", "RA"),
    ("Fondo svalutazione crediti", "RA"),
    # rimanenze e ratei/risconti attivi
    ("Merci", "AT"), ("Materie prime", "AT"), ("Prodotti finiti", "AT"),
    ("Ratei attivi", "AT"), ("Risconti attivi", "AT"),
    # debiti
    ("Debiti v/fornitori", "PA"), ("Clienti c/anticipi", "PA"), ("Fatture da ricevere", "PA"),
    ("IVA ns/debito", "PA"), ("Erario c/IVA", "BI"),
    ("Mutui passivi", "PA"), ("Banche c/anticipi su fatture", "PA"),
    ("Personale c/retribuzioni", "PA"), ("Erario c/ritenute", "PA"), ("Istituti previdenziali", "PA"),
    ("Debiti per TFR", "PA"), ("Debiti tributari", "PA"), ("Debiti v/soci per dividendi", "PA"),
    ("Ratei passivi", "PA"), ("Risconti passivi", "PA"),
    # patrimonio netto
    ("Capitale sociale", "PN"), ("Riserva legale", "PN"), ("Utili portati a nuovo", "PN"),
    ("Utile d'esercizio", "PN"), ("Perdita d'esercizio", "PR"),
    # costi
    ("Merci c/acquisti", "CO"), ("Materie prime c/acquisti", "CO"), ("Energia elettrica", "CO"),
    ("Consulenze", "CO"), ("Premi di assicurazione", "CO"), ("Cancelleria", "CO"),
    ("Canoni di leasing", "CO"), ("Fitti passivi", "CO"),
    ("Salari e stipendi", "CO"), ("Oneri sociali", "CO"), ("TFR", "CO"),
    ("Interessi passivi bancari", "CO"), ("Interessi passivi su mutui", "CO"), ("Oneri bancari", "CO"),
    ("Ammortamento impianti e macchinari", "CO"), ("Ammortamento automezzi", "CO"), ("Ammortamento arredamento", "CO"),
    ("Svalutazione crediti", "CO"), ("Perdite su crediti", "CO"), ("Minusvalenze", "CO"),
    ("Imposte dell'esercizio", "CO"), ("Differenze inventariali", "CO"),
    ("Ribassi e abbuoni passivi", "RR"),
    # ricavi e rettifiche
    ("Merci c/vendite", "RI"), ("Prodotti c/vendite", "RI"), ("Fitti attivi", "RI"), ("Interessi attivi bancari", "RI"),
    ("Plusvalenze", "RI"), ("Sopravvenienze attive", "RI"), ("Ribassi e abbuoni attivi", "RC"), ("Resi su acquisti", "RC"),
    ("Resi su vendite", "RR"),
    ("Variazione rimanenze merci", "VR"), ("Variazione rimanenze prodotti finiti", "VR"),
    # conti di chiusura e riapertura
    ("Conto economico", "TE"), ("Stato patrimoniale finale", "TE"), ("Stato patrimoniale iniziale", "TE"),
])

NATURA = {"AT": "Attività", "PA": "Passività", "PN": "Patrimonio netto", "PR": "Rettifica negativa del patrimonio netto (perdite)",
          "BI": "Conto a saldo variabile (credito o debito)", "CO": "Costo", "RC": "Rettifica di costo (resi, ribassi e abbuoni su acquisti)",
          "RI": "Ricavo", "RR": "Rettifica di ricavo (resi, ribassi e abbuoni su vendite)", "VR": "Variazione delle rimanenze (componente economico)",
          "RA": "Rettifica di attività (fondo)", "TE": "Conto tecnico di chiusura e riapertura"}

# ordine dei gruppi nell'appendice e regola Dare/Avere di ciascuno (uguale in manuale e piano dei conti)
ORDINE_NATURA = ["AT", "RA", "PA", "BI", "PN", "PR", "CO", "RC", "RI", "RR", "VR", "TE"]
REGOLA_NATURA = {"AT": "Aumenta in Dare", "RA": "Aumenta in Avere: riduce l'attività a cui si riferisce",
                 "PA": "Aumenta in Avere", "BI": "Dare se è un credito verso l'Erario, Avere se è un debito: si espone secondo il saldo",
                 "PN": "Aumenta in Avere", "PR": "Saldo Dare: la perdita riduce il patrimonio netto",
                 "CO": "Aumenta in Dare", "RC": "Si registra in Avere: riduce il costo d'acquisto, non è un ricavo autonomo",
                 "RI": "Aumenta in Avere", "RR": "Si registra in Dare: riduce i ricavi di vendita",
                 "VR": "Rimanenze iniziali in Dare, finali in Avere: entra nel Conto economico (voci A2 e B11)",
                 "TE": "Solo per epilogo, chiusura e riapertura dei conti"}

UNITA = OrderedDict()      # "Q01" → {titolo, studio:[...], esempio, domande:[...]}
QUESITI = {}               # id → quesito normalizzato


def unita(codice, titolo, studio, esempio=None):
    UNITA[codice] = {"codice": codice, "titolo": titolo, "studio": studio, "esempio": esempio, "domande": []}
    return UNITA[codice]


def _cent(x):
    return int(round(float(x) * 100))


def _righe(righe):
    out = []
    for conto, sez, imp in righe:
        out.append({"conto": conto, "sez": sez.upper()[0], "cent": _cent(imp)})
    return out


def _firma(righe):
    """Sostanza della scrittura: ordine delle righe indifferente, righe uguali sommate."""
    tot = {}
    for r in righe:
        k = (r["conto"], r["sez"])
        tot[k] = tot.get(k, 0) + r["cent"]
    return tuple(sorted(tot.items()))


def _aggiungi(cod, q):
    q["unita"] = cod
    UNITA[cod]["domande"].append(q)
    if q["id"] in QUESITI:
        raise ValueError(f"ID quesito duplicato: {q['id']}")
    QUESITI[q["id"]] = q


def T(cod, qid, livello, testo, giuste, sbagliate, spiegazione, origine=None, multi=False, area="teoria"):
    """Teoria. giuste: testo o lista di testi; sbagliate: lista (testo, perché è sbagliata)."""
    if isinstance(giuste, str):
        giuste = [giuste]
    opz = [{"id": f"o{i+1}", "testo": t, "ok": True, "perche": ""} for i, t in enumerate(giuste)]
    for t, p in sbagliate:
        opz.append({"id": f"o{len(opz)+1}", "testo": t, "ok": False, "perche": p})
    _aggiungi(cod, {"id": qid, "tipo": "teoria", "area": area, "livello": livello, "testo": testo, "opzioni": opz,
                    "multi": bool(multi or len(giuste) > 1), "spiegazione": spiegazione, "origine": origine})


def S(cod, qid, livello, testo, righe, errori, spiegazione, origine=None):
    """Scrittura completa. righe: [(conto, 'D'|'A', importo)]; errori: [(righe_sbagliate, perché)].
    Se gli errori sono meno di tre si aggiunge la scrittura con le sezioni invertite."""
    giusta = _righe(righe)
    opz = [{"id": "o1", "righe": giusta, "ok": True, "perche": ""}]
    for rr, p in errori:
        opz.append({"id": f"o{len(opz)+1}", "righe": _righe(rr), "ok": False, "perche": p})
    if len(opz) < 4:
        presenti = {_firma(o["righe"]) for o in opz}
        inv = [{"conto": r["conto"], "sez": "A" if r["sez"] == "D" else "D", "cent": r["cent"]} for r in giusta]
        if _firma(inv) not in presenti:
            opz.append({"id": f"o{len(opz)+1}", "righe": inv, "ok": False,
                        "perche": "Le sezioni sono invertite: i conti sono giusti ma Dare e Avere sono scambiati, "
                                  "quindi ogni conto si muove nel verso opposto a quello reale."})
        else:
            alt = _conto_confuso(giusta, presenti)
            if alt:
                righe_alt, perche = alt
                opz.append({"id": f"o{len(opz)+1}", "righe": righe_alt, "ok": False, "perche": perche})
    _aggiungi(cod, {"id": qid, "tipo": "scrittura", "area": "applicazione", "livello": livello, "testo": testo, "opzioni": opz,
                    "multi": False, "spiegazione": spiegazione, "origine": origine})


# confusioni tipiche usate per il quarto distrattore quando l'inversione è già fra le alternative
CONFUSIONI = [
    ("Banca c/c", "Cassa", "banca e cassa sono conti separati: conta dove si muove davvero il denaro."),
    ("Cassa", "Banca c/c", "banca e cassa sono conti separati: conta dove si muove davvero il denaro."),
    ("Conto economico", "Stato patrimoniale finale", "nel Conto economico vanno solo costi e ricavi; i conti patrimoniali si chiudono nello stato patrimoniale."),
    ("Stato patrimoniale finale", "Conto economico", "i conti patrimoniali si chiudono nello Stato patrimoniale finale, non nel Conto economico."),
    ("Stato patrimoniale iniziale", "Conto economico", "alla riapertura si usa lo Stato patrimoniale iniziale: il Conto economico del nuovo anno parte da zero."),
    ("Risconti attivi", "Ratei attivi", "il rateo riguarda ciò che è maturato e non ancora pagato/incassato; qui si rinvia un importo già registrato."),
    ("Risconti passivi", "Ratei passivi", "il rateo riguarda ciò che è maturato e non ancora pagato; qui si rinvia un ricavo già registrato."),
    ("Ratei passivi", "Risconti passivi", "il risconto rinvia un importo già registrato; qui il costo è maturato e non ancora pagato."),
    ("IVA ns/debito", "IVA ns/credito", "l'IVA delle vendite è a debito, quella degli acquisti a credito: non vanno scambiate."),
    ("IVA ns/credito", "IVA ns/debito", "l'IVA degli acquisti è a credito, quella delle vendite a debito: non vanno scambiate."),
    ("Crediti v/clienti", "Merci c/vendite", "il credito verso il cliente non è il ricavo: il ricavo è già registrato con la fattura."),
    ("Debiti v/fornitori", "Merci c/acquisti", "il debito verso il fornitore non è il costo: il costo nasce con la fattura."),
    ("Merci", "Merci c/acquisti", "le rimanenze sono un'attività patrimoniale (Merci), non un nuovo acquisto."),
    ("Variazione rimanenze merci", "Merci c/vendite", "le rimanenze rettificano i costi: non sono vendite."),
    ("Personale c/retribuzioni", "Salari e stipendi", "il costo del lavoro è già registrato: qui si muove il debito verso il dipendente."),
    ("TFR", "Salari e stipendi", "la quota di TFR ha un conto di costo proprio, distinto dalla retribuzione del mese."),
    ("Debiti per TFR", "Banca c/c", "il TFR maturato non si paga oggi: è un debito che resta fino alla fine del rapporto."),
    ("Erario c/acconti d'imposta", "Imposte dell'esercizio", "l'acconto è un credito verso l'Erario, non il costo delle imposte."),
    ("Debiti tributari", "Imposte dell'esercizio", "il costo delle imposte è già rilevato: qui si muove il debito."),
    ("Premi di assicurazione", "Merci c/acquisti", "l'assicurazione ha un conto di costo proprio."),
    ("Canoni di leasing", "Impianti e macchinari", "nel metodo patrimoniale il bene in leasing non è tuo: il canone è un costo."),
    ("Banche c/anticipi su fatture", "Crediti v/clienti", "con l'anticipo il credito resta tuo: si muove il debito verso la banca."),
    ("Utili portati a nuovo", "Capitale sociale", "la copertura delle perdite usa le riserve deliberate, non il capitale."),
    ("Perdita d'esercizio", "Conto economico", "la perdita è già stata rilevata dal Conto economico."),
    ("Merci c/vendite", "Utile d'esercizio", "i ricavi passano prima dal Conto economico: l'utile è la differenza tra ricavi e costi."),
    ("Utile d'esercizio", "Riserva legale", "la destinazione a riserva la decide l'assemblea dopo l'approvazione del bilancio."),
    ("Fatture da ricevere", "Debiti v/fornitori", "senza fattura il debito si rileva in Fatture da ricevere."),
    ("Merci c/acquisti", "Debiti v/fornitori", "il costo d'acquisto va chiuso con il suo saldo: il debito verso il fornitore è un conto patrimoniale."),
]


def _conto_confuso(giusta, presenti):
    conti = {r["conto"] for r in giusta}
    for da, a, nota in CONFUSIONI:
        if a in conti:
            continue
        for i, r in enumerate(giusta):
            if r["conto"] == da:
                nuove = [dict(x) for x in giusta]
                nuove[i]["conto"] = a
                if _firma(nuove) not in presenti:
                    return nuove, f"Conto sbagliato: qui serve «{da}», non «{a}»: {nota}"
    return None


def valida():
    errori = []
    for qid, q in QUESITI.items():
        ok = [o for o in q["opzioni"] if o["ok"]]
        if not ok:
            errori.append(f"{qid}: nessuna risposta corretta")
        if not q["multi"] and len(ok) != 1:
            errori.append(f"{qid}: scelta singola con {len(ok)} risposte corrette")
        if len(q["opzioni"]) < 3:
            errori.append(f"{qid}: servono almeno 3 alternative")
        for o in q["opzioni"]:
            if not o["ok"] and not o["perche"].strip():
                errori.append(f"{qid}/{o['id']}: alternativa sbagliata senza spiegazione")
        if q["tipo"] == "teoria":
            testi = [o["testo"].strip().lower() for o in q["opzioni"]]
            if len(set(testi)) != len(testi):
                errori.append(f"{qid}: alternative con lo stesso testo")
        else:
            firme = []
            for o in q["opzioni"]:
                for r in o["righe"]:
                    if r["conto"] not in PIANO:
                        errori.append(f"{qid}/{o['id']}: conto inesistente «{r['conto']}»")
                    if r["sez"] not in ("D", "A") or r["cent"] <= 0:
                        errori.append(f"{qid}/{o['id']}: riga non valida {r}")
                firme.append(_firma(o["righe"]))
            g = q["opzioni"][0]["righe"]
            d = sum(r["cent"] for r in g if r["sez"] == "D")
            a = sum(r["cent"] for r in g if r["sez"] == "A")
            if d != a:
                errori.append(f"{qid}: la scrittura corretta non quadra (D {d/100} ≠ A {a/100})")
            if len(set(firme)) != len(firme):
                errori.append(f"{qid}: due alternative contabilmente equivalenti")
    from .aiuti import AIUTI
    for qid in QUESITI:
        if not AIUTI.get(qid, "").strip():
            errori.append(f"{qid}: manca il suggerimento specifico (banca/aiuti.py)")
    for qid in AIUTI:
        if qid not in QUESITI:
            errori.append(f"aiuti.py: suggerimento per una domanda inesistente {qid}")
    for cod, u in UNITA.items():
        if not u["domande"]:
            errori.append(f"{cod}: unità senza domande")
    if errori:
        raise ValueError("Banca ragioneria non valida:\n  " + "\n  ".join(errori))


def quadra(righe):
    d = sum(r["cent"] for r in righe if r["sez"] == "D")
    a = sum(r["cent"] for r in righe if r["sez"] == "A")
    return d == a


from . import u01_05, u06_10, u11_15, u16_20  # noqa: E402,F401
from .aiuti import AIUTI  # noqa: E402

for _qid, _q in QUESITI.items():   # il suggerimento specifico della domanda (mostrato con «Mi serve un aiuto»)
    _q["aiuto"] = AIUTI.get(_qid, "")

valida()


def riepilogo():
    tot = len(QUESITI)
    teoria = sum(1 for q in QUESITI.values() if q["area"] == "teoria")
    scritture = sum(1 for q in QUESITI.values() if q["tipo"] == "scrittura")
    return {"versione": VERSIONE_BANCA, "unita": len(UNITA), "quesiti": tot, "teoria": teoria,
            "applicazione": tot - teoria, "scritture": scritture}
