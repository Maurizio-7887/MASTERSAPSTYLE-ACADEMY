"""Esercizi che l'allievo può consegnare e i numeri di controllo con cui confrontare il suo lavoro.

Per aggiungere un compito (es. «l'azienda nasce il 1° novembre») basta una nuova voce in ESERCIZI:
gli indicatori disponibili sono quelli di report.indicatori().
"""

ESERCIZI = {
    "dicembre-wms": {
        "titolo": "Dicembre: dalla costituzione alla riapertura — azienda nuova con WMS e produzione",
        "versione": "erp-ft",
        "attesi": [
            ("dc_costituzione", "Data di costituzione", "2026-12-01", None),
            ("dc_capitale_versato", "Capitale sociale versato", 80000.00, 0.005),
            ("dc_ordini_pp", "Ordini di produzione (taglio, piega, saldatura)", 3, 0),
            ("dc_scorte", "Scorte finali: ferro kg / SL-TAGLIO / SL-PIEGA / TR-STD", "740/9/10/0", None),
            ("dc_rimanenze", "Rimanenze al 31/12 (ferro + semilavorati + finiti)", 1036.40, 0.005),
            ("rw_compiti_aperti", "Compiti WMS ancora aperti", 0, 0),
            ("quadratura_im_wm", "Quantità IM e WMS riconciliate", "sì", None),
            ("dc_colli", "Colli con SSCC spediti", 7, 0),
            ("dc_rottamazione", "Ferro schiacciato rottamato (555)", 190.00, 0.005),
            ("dc_differenza_inventario", "Differenza inventariale (1 kit tagliato)", 14.60, 0.005),
            ("dc_plusvalenza", "Plusvalenza (sega circolare)", 816.67, 0.005),
            ("dc_minusvalenza", "Minusvalenza (carrello elevatore)", 1300.00, 0.005),
            ("dc_sopravvenienza", "Sopravvenienza attiva (indennizzo)", 500.00, 0.005),
            ("dc_risconto", "Risconto attivo sull'assicurazione", 1098.08, 0.005),
            ("dc_rateo", "Rateo passivo sul fitto", 1033.33, 0.005),
            ("dc_ammortamenti", "Ammortamenti di dicembre (comprese le cessioni)", 458.34, 0.005),
            ("dc_credito_iva", "Credito IVA riportato al 2027", 3432.00, 0.005),
            ("dc_ires", "IRES 2026", 617.60, 0.005),
            ("dc_irap", "IRAP 2026", 100.36, 0.005),
            ("dc_utile", "Utile d'esercizio 2026", 1855.36, 0.005),
            ("dc_chiuso", "Esercizio 2026 chiuso", "sì", None),
            ("dc_riaperto", "Conti riaperti al 1° gennaio 2027", "sì", None),
            ("dc_banca_31_12", "Banca al 31/12/2026", 51886.42, 0.005),
        ],
    },
    "ragioneria-wms-chiusura": {
        "titolo": "Ragioneria con WMS — seconda parte: cespiti, Ri.Ba., factoring, IVA, IRES, chiusura e riapertura",
        "versione": "erp-ft",
        "attesi": [
            ("rc_cespiti_netto", "Cespiti netti al 31/12 (saldatrice 12.000 − fondo 800)", 11200.00, 0.005),
            ("rc_ammortamenti", "Ammortamenti 2027", 1733.33, 0.005),
            ("rc_minusvalenza", "Minusvalenza sulla cessione del carrello", 566.67, 0.005),
            ("rc_ricavi_servizi", "Ricavi per servizi (noleggi)", 13000.00, 0.005),
            ("rc_oneri_factoring", "Commissione di factoring", 195.20, 0.005),
            ("rc_iva_t1_versata", "IVA del 1° trimestre versata (senza interessi)", 6309.60, 0.005),
            ("rc_credito_iva", "Credito IVA riportato al 2028", 110.00, 0.005),
            ("rc_ires", "IRES 2027 (con gli ammortamenti oltre il limite fiscale)", 6389.92, 0.005),
            ("rc_irap", "IRAP 2027 (3,9% sul valore della produzione)", 1048.44, 0.005),
            ("rc_anticipate", "Crediti per imposte anticipate", 55.80, 0.005),
            ("rc_utile", "Utile d'esercizio 2027", 19042.11, 0.005),
            ("rc_chiuso", "Esercizio 2027 chiuso", "sì", None),
            ("rc_riaperto", "Conti riaperti al 1° gennaio 2028", "sì", None),
            ("rc_banca_2028", "Banca all'apertura del 2028", 77807.70, 0.005),
        ],
    },
    "ragioneria-wms": {
        "titolo": "Ragioneria con WMS — acquisto, produzione, vendita e banca",
        "versione": "erp-ft",
        "attesi": [
            ("wm_attivo", "Magazzino W100 attivo", "sì", None),
            ("quadratura_im_wm", "Quantità IM e WMS riconciliate", "sì", None),
            ("rw_compiti_aperti", "Compiti WMS ancora aperti", 0, 0),
            ("rw_compiti_confermati", "Compiti WMS confermati", 17, 0),
            ("rw_ferro", "Ferro finale kg", 2200, 0.001),
            ("rw_std", "TR-STD finale pz", 50, 0),
            ("rw_alta", "TR-ALTA finale pz", 200, 0),
            ("rw_ped", "TR-PED finale pz", 300, 0),
            ("rw_ferro_valore", "Valore contabile ferro dopo ML", 2200, 0.005),
            ("rw_pf_valore", "Valore contabile PF dopo ML", 17842.37, 0.005),
            ("rw_cogs", "Costo del venduto dopo ML", 19331.03, 0.005),
            ("rw_banca", "Banca dopo riconciliazione", 84989.60, 0.005),
            ("rw_clienti", "Residuo clienti", 0, 0.005),
            ("rw_fornitori", "Residuo fornitori", 0, 0.005),
            ("rw_were", "Transitorio WE/RE", 0, 0.005),
            ("rw_transito", "Banca in transito", 0, 0.005),
            ("rw_colli", "Colli con SSCC", 11, 0),
            ("rw_ddt", "DDT emessi", 1, 0),
        ],
    },
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
            ("compiti_confermati", "Compiti di magazzino confermati a marzo (messe a posto)", 5, 0),
            ("udc_ferro", "Fasci di ferro in catasta", 8, 0),
            ("inventari_chiusi", "Documenti d'inventario chiusi", 1, 0),
            ("riconte", "Posizioni ricontate (oltre tolleranza)", 2, 0),
            ("differenze_65_marzo", "Differenze inventariali registrate a marzo (conto 65)", 68.94, 0.005),
            ("giacenza_tr_std", "Giacenza TR-STD a fine marzo, dopo l'inventario", 68, 0),
            ("quadratura_im_wm", "Quadratura contabilità di magazzino – WMS", "sì", None),
        ],
    },
    "s4-spedizione": {
        "titolo": "Sistema integrato S/4 — spedizione: prelievo, imballo, trasporto, DDT (aprile, UF 10)",
        "versione": "erp-ft",
        "attesi": [
            ("consegne_wm_uscite", "Consegne uscite dal magazzino a ubicazioni", 2, 0),
            ("compiti_prelievo", "Compiti di prelievo confermati (con la differenza)", 8, 0),
            ("colli", "Colli imballati con SSCC", 7, 0),
            ("peso_lordo", "Peso lordo spedito (kg)", 3145, 0.005),
            ("trasporti_partiti", "Trasporti partiti", 1, 0),
            ("ddt", "DDT emessi", 2, 0),
            ("differenze_65", "Differenze inventariali (inventario + prelievo)", 133.72, 0.005),
            ("giacenza_tr_ped", "Giacenza TR-PED dopo la spedizione", 148, 0),
        ],
    },
    "s4-innovazione": {
        "titolo": "Sistema integrato S/4 — innovazione del magazzino: slotting, ondate, RFID (maggio, UF 11)",
        "versione": "erp-ft",
        "attesi": [
            ("slotting", "Trasferimenti di slotting confermati", 3, 0),
            ("ondata_compiti", "Compiti dell'ondata", 4, 0),
            ("ondata_metri", "Metri del giro a ondata", 22, 0.005),
            ("ondata_metri_ordine", "Metri con un giro per consegna", 34, 0.005),
            ("rfid_letture", "Colli letti dal varco RFID", 4, 0),
            ("colli_maggio", "Colli imballati a maggio", 4, 0),
            ("consegne_maggio", "Consegne di maggio uscite", 2, 0),
            ("giacenza_tr_ped_maggio", "Giacenza TR-PED a fine maggio", 28, 0),
        ],
    },
    "s4-tesoreria-paghe": {
        "titolo": "Sistema integrato S/4 — tesoreria e paghe (giugno)",
        "versione": "erp-ft",
        "attesi": [
            ("f110_totale", "Pagamenti F110 eseguiti", 10980.00, 0.005),
            ("righe_automatiche", "Righe dell'estratto abbinate in automatico", 6, 0),
            ("estratto_completo", "Estratto conto registrato per intero", "sì", None),
            ("banca_15_06", "Saldo della banca al 15/06", 103535.81, 0.005),
            ("crediti_30_06", "Crediti verso clienti al 30/06", 49752.91, 0.005),
            ("netti_giugno", "Netti in busta di giugno", 5594.55, 0.005),
            ("irpef_giugno", "IRPEF trattenuta a giugno", 730.97, 0.005),
            ("costo_personale_giugno", "Costo del personale di giugno (80 + 81 + 82)", 9792.99, 0.005),
        ],
    },
    "s4-valute": {
        "titolo": "Sistema integrato S/4 — valute estere e F24 (luglio)",
        "versione": "erp-ft",
        "attesi": [
            ("fatture_valuta", "Fatture in valuta registrate", 3, 0),
            ("ricavi_servizi", "Ricavi per servizi in euro (conto 44)", 30000.00, 0.005),
            ("iva_reverse_charge", "IVA in reverse charge sulla fattura estera", 1100.00, 0.005),
            ("utili_cambi", "Utili su cambi realizzati", 370.37, 0.005),
            ("perdite_cambi", "Perdite su cambi realizzate", 45.87, 0.005),
            ("perdita_valutazione", "Perdita su cambi non realizzata al 31/07", 178.57, 0.005),
            ("credito_usd_aperto", "Credito in USD ancora aperto", 11000.00, 0.005),
            ("f24_versato", "F24 versato a luglio", 3603.92, 0.005),
        ],
    },
    "s4-controlli": {
        "titolo": "Sistema integrato S/4 — ruoli, crediti, storni e SdI, acquisti approvati, lotti e seriali, tredicesima (agosto – dicembre)",
        "versione": "erp-ft",
        "attesi": [
            ("ordini_rilasciati_vkm1", "Ordini rilasciati dal responsabile crediti (VKM1)", 1, 0),
            ("fatture_stornate_ago", "Fatture stornate prima dell'invio allo SdI (VF11)", 1, 0),
            ("documenti_sdi", "Documenti trasmessi allo SdI", 3, 0),
            ("nota_credito_td04", "Nota di credito TD04 a Delta (IVA compresa)", 244.00, 0.005),
            ("rda_ordinate", "Richieste d'acquisto approvate e ordinate", 1, 0),
            ("ferro_colata_0816", "Ferro della colata COL-0816 in giacenza dopo la rottamazione (kg)", 3000, 0.005),
            ("seriali_presso_clienti", "Transenne alte con numero di serie presso i clienti", 320, 0),
            ("tredicesima_dicembre", "Tredicesime pagate a dicembre", 6950.00, 0.005),
        ],
    },
    "libero": {"titolo": "Lavoro libero (senza numeri di controllo)", "versione": None, "attesi": []},
}


def scelte(versione=None):
    return [(k, e["titolo"]) for k, e in ESERCIZI.items() if not versione or e["versione"] in (None, versione)]


# Dicembre: il vecchio schema resta valido per fotografie e aziende già salvate.
# Il modello nuovo elimina 56 euro di attività (7.336 -> 7.280) e conserva lo
# stesso ferro consumato e COGS; ante imposte 2.573,32 - 56 = 2.517,32.
_DICEMBRE_WIP_ATTESI = {
    "dc_ordini_pp": ("Ordini indipendenti: TR-STD a fasi + HALB a scorta", 2),
    "dc_scorte": ("Scorte finali: ferro kg / SL-TAGLIO / TR-STD", "740/19/0"),
    "dc_rimanenze": ("Rimanenze al 31/12 (ferro 703 + HALB 277,40)", 980.40),
    "dc_ires": ("IRES 2026", 604.16),
    "dc_irap": ("IRAP 2026", 98.18),
    "dc_utile": ("Utile d'esercizio 2026", 1814.98),
}
ESERCIZI["dicembre-wms"]["attesi_per_modello"] = {
    "wip-fasi-v1": [
        (k, *_DICEMBRE_WIP_ATTESI[k], tol) if k in _DICEMBRE_WIP_ATTESI else (k, label, valore, tol)
        for k, label, valore, tol in ESERCIZI["dicembre-wms"]["attesi"]
    ],
}


def attesi_esercizio(codice, stato=None):
    """Numeri di controllo secondo il modello salvato, senza migrare l'archivio."""
    esercizio = ESERCIZI.get(codice) or ESERCIZI["libero"]
    modello = (stato or {}).get("produzioneModello")
    return esercizio.get("attesi_per_modello", {}).get(modello, esercizio["attesi"])
