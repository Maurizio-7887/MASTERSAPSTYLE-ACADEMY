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
    "s4-vendite-copa": {
        "titolo": "Sistema integrato S/4 — vendite, resi, acconti e redditività (gennaio)",
        "versione": "erp-ft",
        "attesi": [
            ("ordini_or", "Ordini cliente (VA01)", 4, 0),
            ("acconti_chiusi", "Conto 19 Acconti da clienti dopo la fattura", 0.00, 0.005),
            ("note_credito", "Note di credito emesse (reso RE + abbuono G2)", 2, 0),
            ("ricavi_netti_copa", "Ricavi netti dopo rettifiche (KE30)", 44773.00, 0.005),
            ("mdc1", "Margine di contribuzione I (KE30)", 19946.00, 0.005),
            ("mdc2", "Margine di contribuzione II (KE30)", 18593.81, 0.005),
            ("crediti_clienti", "Crediti verso clienti aperti (conto 11)", 35969.26, 0.005),
            ("banca_finale", "Banca a fine gennaio", 68653.80, 0.005),
        ],
    },
    "s4-costi-ml": {
        "titolo": "Sistema integrato S/4 — costi del prodotto e Material Ledger (febbraio)",
        "versione": "erp-ft",
        "attesi": [
            ("std_tr_std", "Nuovo costo standard TR-STD con i sovraccosti (CK24)", 34.47, 0.005),
            ("rivalutazione", "Rivalutazione del magazzino al rilascio (conto 64)", 670.90, 0.005),
            ("pd_acquisti", "Differenze prezzo sull'acquisto del ferro di febbraio", 450.00, 0.005),
            ("varianza_lotto", "Varianza di lotto dell'ordine TR-ALTA (100 pz)", 61.60, 0.005),
            ("varianze_ordini", "Varianze liquidate sugli ordini (KO88)", 611.73, 0.005),
            ("ml_venduto", "Differenze prezzo al venduto (conto 42)", 186.33, 0.005),
            ("prezzo_effettivo_ped", "Prezzo effettivo periodico TR-PED (Material Ledger)", 34.11, 0.005),
            ("mdc1_febbraio", "MdC I di febbraio a costo effettivo (KE30)", 9339.87, 0.005),
        ],
    },
    "s4-magazzino": {
        "titolo": "Sistema integrato S/4 — magazzino WMS e inventario (marzo, UF 9)",
        "versione": "erp-ft",
        "attesi": [
            ("wm_attivo", "Magazzino W100 attivo", "sì", None),
            ("compiti_confermati", "Compiti di magazzino confermati (messe a posto)", 5, 0),
            ("udc_ferro", "Fasci di ferro in catasta", 8, 0),
            ("inventari_chiusi", "Documenti d'inventario chiusi", 1, 0),
            ("riconte", "Posizioni ricontate (oltre tolleranza)", 2, 0),
            ("differenze_65", "Differenze inventariali registrate (conto 65)", 68.94, 0.005),
            ("giacenza_tr_std", "Giacenza TR-STD dopo l'inventario", 68, 0),
            ("quadratura_im_wm", "Quadratura contabilità di magazzino – WMS", "sì", None),
        ],
    },
    "libero": {"titolo": "Lavoro libero (senza numeri di controllo)", "versione": None, "attesi": []},
}


def scelte(versione=None):
    return [(k, e["titolo"]) for k, e in ESERCIZI.items() if not versione or e["versione"] in (None, versione)]
