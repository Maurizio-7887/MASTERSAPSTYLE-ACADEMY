"""Esercizi che l'allievo può consegnare e i numeri di controllo con cui confrontare il suo lavoro.

Per aggiungere un compito (es. «l'azienda nasce il 1° novembre») basta una nuova voce in ESERCIZI:
gli indicatori disponibili sono quelli di report.indicatori().
"""

ESERCIZI = {
    "guidato-dic-2026": {
        "titolo": "Esercizio guidato — costituzione 01/12/2026 (guida PDF)",
        "versione": "vuoto",
        "attesi": [
            # (indicatore, etichetta, valore atteso, tolleranza)
            ("costituzione", "Data di costituzione", "2026-12-01", None),
            ("costo_std", "Costo standard transenna €/pz", 31.40, 0.005),
            ("capitale", "Capitale sociale versato", 80000.00, 0.005),
            ("ordini_pp", "Ordini di produzione (tre fasi)", 3, 0),
            ("varianze_61", "Varianze di efficienza CO88 (conto 61)", 476.00, 0.005),
            ("plusvalenze", "Plusvalenza cessione Sega (conto 45)", 3100.00, 0.005),
            ("minusvalenze", "Minusvalenza cessione Saldatrice (conto 46)", 1933.33, 0.005),
            ("iva_liquidata", "IVA a debito liquidata a dicembre (conto 28)", 765.60, 0.005),
            ("ante_imposte", "Risultato prima delle imposte 2026", 2120.30, 0.005),
            ("ires", "IRES di competenza 2026 (conto 56)", 508.87, 0.005),
            ("utile", "Utile d'esercizio 2026", 1611.43, 0.005),
            ("banca_fine_anno", "Banca al 31/12/2026", 57988.40, 0.005),
            ("chiusura", "Esercizio 2026 chiuso e riaperto", "sì", None),
            ("banca_finale", "Banca all'ultima data registrata (30/06/2027)", 74095.13, 0.005),
            ("contratti_aperti", "Contratti RiBa / factoring ancora aperti", 0, 0),
        ],
    },
    "libero": {"titolo": "Lavoro libero (senza numeri di controllo)", "versione": None, "attesi": []},
}


def scelte(versione=None):
    return [(k, e["titolo"]) for k, e in ESERCIZI.items() if not versione or e["versione"] in (None, versione)]
