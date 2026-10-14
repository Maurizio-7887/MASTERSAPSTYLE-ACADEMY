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
    "hmlv-disaccoppiamento": {
        "titolo": "Laboratorio Alta varietà — semilavorati a scorta e disaccoppiamento",
        "versione": "lab-hmlv",
        "attesi": [
            ("strategie", "Strategie: SL-PIEGA 70, transenne 50", "sì", None),
            ("wip_novembre", "WIP a fine novembre (telaio in lavorazione)", 3900.00, 0.005),
            ("costo_venduto", "Costo del venduto delle tre consegne", 17790.00, 0.005),
            ("lead_time", "Lead time verso il cliente (giorni)", 5, 0),
            ("wip_finale", "WIP dopo la chiusura di dicembre", 0.00, 0.005),
            ("varianze_61", "Varianze di produzione totali (conto 61)", 252.00, 0.005),
            ("ferro_finale", "Ferro rimasto (kg)", 300, 0.005),
            ("buffer_rifornito", "Buffer DDMRP del telaio rifornito (675 pz)", "sì", None),
        ],
    },
    "rem-trattore": {
        "titolo": "Laboratorio Produzione ripetitiva — modello trattore (4.000 transenne)",
        "versione": "lab-rem",
        "attesi": [
            ("budget_totale", "Budget annuo", 4000, 0),
            ("piano", "Piano mensile TR-STD/TR-ALTA/TR-PED", "167/100/67", None),
            ("collettori", "Collettori costi aperti", 3, 0),
            ("wip_gennaio", "WIP al target a fine gennaio", 404.00, 0.005),
            ("varianze_gennaio", "Varianze di periodo di gennaio", 132.20, 0.005),
            ("output_gennaio", "Output di gennaio a costo standard", 10698.65, 0.005),
            ("varianze_febbraio", "Varianze di periodo di febbraio", 0.00, 0.005),
            ("ferro_finale", "Ferro rimasto (kg)", 733, 0.005),
        ],
    },
    "libero": {"titolo": "Lavoro libero (senza numeri di controllo)", "versione": None, "attesi": []},
}


def scelte(versione=None):
    return [(k, e["titolo"]) for k, e in ESERCIZI.items() if not versione or e["versione"] in (None, versione)]
