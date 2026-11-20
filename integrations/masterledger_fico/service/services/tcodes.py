"""Catalogo dei codici transazione stile SAP.

Ogni codice punta a una pagina esistente di MasterLedger (endpoint Flask).
I codici "previsti" sono riconosciuti dal campo comandi ma non hanno ancora
una pagina: l'utente riceve un messaggio chiaro invece di "codice sconosciuto".

Regole del campo comandi, come in SAP GUI:
- FB50, /nFB50  -> apre la transazione nella finestra corrente
- /oFB50        -> apre la transazione in una nuova finestra (gestito lato browser)
- /n            -> torna alla pagina iniziale
"""

MODULI = [
    ("FI-GL", "Contabilità generale"),
    ("FI-AP", "Contabilità fornitori"),
    ("FI-AR", "Contabilità clienti"),
    ("FI-BL", "Banche"),
    ("FI-AA", "Cespiti"),
    ("CO", "Controlling"),
    ("MM", "Acquisti e materiali"),
    ("SD", "Vendite"),
    ("HR", "Paghe"),
]

# codice: (modulo, descrizione SAP, endpoint, nota per l'utente o None)
TCODES = {
    # ── FI-GL ────────────────────────────────────────────────────
    "FB50": ("FI-GL", "Registrazione conto Co.Ge.", "gl.journal_entry", None),
    "F-02": ("FI-GL", "Registrazione generale", "gl.journal_entry", None),
    "FB01": ("FI-GL", "Registrazione documento", "gl.journal_entry", None),
    "FB03": ("FI-GL", "Visualizzazione documento", "gl.journal_list",
             "Apri il documento dal Giornale."),
    "FB08": ("FI-GL", "Storno documento", "gl.journal_list",
             "Apri il documento dal Giornale e usa Storna."),
    "FS00": ("FI-GL", "Anagrafica conto Co.Ge. (crea / modifica)", "gl.fs00", None),
    "FS03": ("FI-GL", "Visualizzazione conto Co.Ge.", "gl.piano_conti", None),
    "FS10N": ("FI-GL", "Saldi conto Co.Ge.", "gl.libro_mastro", None),
    "FAGLB03": ("FI-GL", "Saldi conto Co.Ge.", "gl.libro_mastro", None),
    "FBL3N": ("FI-GL", "Partite conto Co.Ge.", "gl.piano_conti",
              "Scegli il conto per aprire il mastrino."),
    "FAGLL03": ("FI-GL", "Partite conto Co.Ge.", "gl.piano_conti",
                "Scegli il conto per aprire il mastrino."),
    "OB52": ("FI-GL", "Periodi contabili aperti e chiusi", "gl.periods", None),
    "OBYC": ("FI-GL", "Determinazione automatica conti", "gl.account_mapping", None),
    "FTXP": ("FI-GL", "Codici e parametri IVA", "dashboard.config_fiscale", None),

    # ── FI-AP ────────────────────────────────────────────────────
    "FK01": ("FI-AP", "Creazione fornitore", "parties.party_list", None),
    "XK01": ("FI-AP", "Creazione fornitore (centrale)", "parties.party_list", None),
    "FK03": ("FI-AP", "Visualizzazione fornitore", "parties.party_list", None),
    "FB60": ("FI-AP", "Registrazione fattura fornitore", "ap.supplier_invoice", None),
    "F-43": ("FI-AP", "Registrazione fattura fornitore", "ap.supplier_invoice", None),
    "FB65": ("FI-AP", "Nota di credito fornitore", "ap.supplier_invoice",
             "Registra la nota di credito come fattura fornitore di segno opposto."),
    "F-53": ("FI-AP", "Pagamento fornitore", "ap.supplier_payment", None),
    "F110": ("FI-AP", "Programma di pagamento", "gl.scadenzario",
             "Pagamento dallo scadenzario, partita per partita."),
    "FBL1N": ("FI-AP", "Partite fornitore", "parties.party_list",
              "Apri il soggetto e premi Partitario."),

    # ── FI-AR ────────────────────────────────────────────────────
    "FD01": ("FI-AR", "Creazione cliente", "parties.party_list", None),
    "XD01": ("FI-AR", "Creazione cliente (centrale)", "parties.party_list", None),
    "FD03": ("FI-AR", "Visualizzazione cliente", "parties.party_list", None),
    "BP": ("FI-AR", "Business Partner", "parties.party_list", None),
    "OBB8": ("FI-AR", "Condizioni di pagamento", "parties.payment_term_list", None),
    "FB70": ("FI-AR", "Registrazione fattura cliente", "ar.customer_invoice", None),
    "F-22": ("FI-AR", "Registrazione fattura cliente", "ar.customer_invoice", None),
    "FB75": ("FI-AR", "Nota di credito cliente", "ar.customer_credit_note", None),
    "F-37": ("FI-AR", "Richiesta di acconto cliente", "ar.customer_advance_invoice", None),
    "F-28": ("FI-AR", "Incasso cliente", "ar.customer_payment", None),
    "FBL5N": ("FI-AR", "Partite cliente", "parties.party_list",
              "Apri il soggetto e premi Partitario."),

    # ── FI-BL ────────────────────────────────────────────────────
    "FF67": ("FI-BL", "Estratto conto manuale", "gl.bank_reconciliation", None),
    "FEBAN": ("FI-BL", "Rielaborazione estratto conto", "gl.bank_reconciliation", None),
    "FF_5": ("FI-BL", "Importazione estratto conto", "gl.bank_reconciliation", None),
    "FBWE": ("FI-BL", "Effetti: RiBa s.b.f. e anticipo fatture", "bank_advances.lista", None),

    # ── FI-AA ────────────────────────────────────────────────────
    "AS01": ("FI-AA", "Creazione cespite", "assets.asset_create", None),
    "AS03": ("FI-AA", "Visualizzazione cespite", "assets.asset_list", None),
    "AW01N": ("FI-AA", "Asset Explorer", "assets.asset_list", None),
    "AR01": ("FI-AA", "Lista cespiti", "assets.asset_list", None),
    "AFAB": ("FI-AA", "Esecuzione ammortamenti", "assets.depreciation", None),

    # ── CO ───────────────────────────────────────────────────────
    "KS01": ("CO", "Creazione centro di costo", "costs.cost_centers", None),
    "KS03": ("CO", "Visualizzazione centro di costo", "gl.cost_centers_list", None),
    "KSB1": ("CO", "Partite effettive centro di costo", "gl.cost_centers_list",
             "Scegli il centro di costo per aprire le partite."),
    "S_ALR_87013611": ("CO", "Report centri di costo", "costs.report", None),
    "KE30": ("CO", "Analisi di redditività", "sd.margini", None),

    # ── MM ───────────────────────────────────────────────────────
    "MM01": ("MM", "Creazione materiale", "materials.material_list", None),
    "MM02": ("MM", "Modifica materiale", "materials.material_list", None),
    "MM03": ("MM", "Visualizzazione materiale", "materials.material_list", None),
    "ME41": ("MM", "Richiesta di offerta (RFQ)", "mm.rfqs", None),
    "ME47": ("MM", "Inserimento offerta fornitore", "mm.rfqs", None),
    "ME21N": ("MM", "Creazione ordine d'acquisto", "mm.purchase_orders", None),
    "ME23N": ("MM", "Visualizzazione ordine d'acquisto", "mm.purchase_orders", None),
    "MIGO": ("MM", "Entrata merci (movimento 101)", "mm.goods_receipts", None),
    "MBST": ("MM", "Storno entrata merci", "mm.goods_receipts", None),
    "MIRO": ("MM", "Verifica fattura logistica", "mm.invoice_verification", None),
    "MB52": ("MM", "Giacenze di magazzino", "logistics.magazzino", None),
    "MD04": ("MM", "Situazione fabbisogni e scorte", "logistics.magazzino", None),

    # ── SD ───────────────────────────────────────────────────────
    "VA21": ("SD", "Creazione offerta", "sd.quotations", None),
    "VA01": ("SD", "Creazione ordine cliente", "sd.orders", None),
    "VA03": ("SD", "Visualizzazione ordine cliente", "sd.orders", None),
    "VL01N": ("SD", "Consegna e uscita merci (601)", "sd.deliveries", None),
    "VL09": ("SD", "Storno uscita merci", "sd.deliveries", None),
    "VF01": ("SD", "Creazione fattura", "sd.billing", None),
    "VF04": ("SD", "Lista documenti da fatturare", "sd.fatture_da_emettere", None),
    "VF11": ("SD", "Storno fattura", "sd.fatture_da_emettere", None),

    # ── HR ───────────────────────────────────────────────────────
    "PC00_M99_CIPE": ("HR", "Registrazione risultati paghe in FI", "payroll.index", None),
}

# Codici della Fase 2 (bilanci, IVA, chiusure)
TCODES.update({
    "FB02": ("FI-GL", "Modifica documento (solo testi)", "chiusure.cerca_documento", None),
    "S_ALR_87012277": ("FI-GL", "Bilancio di verifica", "chiusure.bilancio_verifica", None),
    "F.08": ("FI-GL", "Bilancio di verifica", "chiusure.bilancio_verifica", None),
    "F.01": ("FI-GL", "Bilancio (Stato patrimoniale e Conto economico)", "chiusure.bilancio", None),
    "S_ALR_87012357": ("FI-GL", "Registri IVA", "chiusure.registri_iva", None),
    "F.12": ("FI-GL", "Liquidazione IVA", "chiusure.liquidazione_iva", None),
    "FAGLGVTR": ("FI-GL", "Chiusura e riporto saldi a nuovo esercizio", "chiusure.esercizio", None),
    "F.16": ("FI-GL", "Chiusura e riporto saldi a nuovo esercizio", "chiusure.esercizio", None),
    "FBS1": ("FI-GL", "Registrazione ratei e risconti", "chiusure.ratei_risconti", None),
    "F.81": ("FI-GL", "Storno ratei e risconti", "chiusure.ratei_risconti", None),
    "F-32": ("FI-AR", "Pareggio cliente (nota di credito con fatture)", "chiusure.pareggio", None),
    "F-44": ("FI-AP", "Pareggio fornitore (nota di credito con fatture)", "chiusure.pareggio", None),
})

# Parametri dell'URL per i codici che aprono la stessa pagina in modalità diverse
TCODE_ARGS = {"F-32": {"lato": "clienti"}, "F-44": {"lato": "fornitori"}}

# Codici riconosciuti ma non ancora realizzati: codice -> (modulo, descrizione, fase)
PREVISTI = {
    "F-03": ("FI-GL", "Pareggio conto Co.Ge. (partite aperte su conti generali)", "Fase 3"),
    "KP06": ("CO", "Pianificazione costi (budget)", "Fase 3"),
    "KO01": ("CO", "Creazione ordine interno", "Fase 3"),
    "KE51": ("CO", "Creazione centro di profitto", "Fase 3"),
    "KSU5": ("CO", "Ripartizione costi", "Fase 3"),
    "KSV5": ("CO", "Distribuzione costi", "Fase 3"),
    "CK11N": ("CO", "Calcolo costo standard", "Fase 3"),
}

# Blueprint riservati al portale Ledger (stessa regola di app.py)
LEDGER_ONLY_BLUEPRINTS = {"gl", "ap", "ar", "assets", "costs", "payroll", "chiusure"}


def parse_command(raw):
    """Restituisce (codice, nuova_finestra). Codice vuoto = pagina iniziale."""
    cmd = (raw or "").strip().upper().replace(" ", "")
    new_window = False
    if cmd.startswith("/O"):
        new_window, cmd = True, cmd[2:]
    elif cmd.startswith("/N"):
        cmd = cmd[2:]
    return cmd, new_window


def catalogo_per_modulo():
    """Elenco ordinato per la pagina dei codici transazione."""
    gruppi = []
    for mod, etichetta in MODULI:
        attivi = sorted((c, v[1], v[2], v[3]) for c, v in TCODES.items() if v[0] == mod)
        previsti = sorted((c, v[1], v[2]) for c, v in PREVISTI.items() if v[0] == mod)
        gruppi.append({"modulo": mod, "etichetta": etichetta,
                       "attivi": attivi, "previsti": previsti})
    return gruppi
