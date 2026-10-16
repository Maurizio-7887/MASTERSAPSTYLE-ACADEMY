"""Registro unico di attività e pagine del simulatore.

Ogni attività è un blueprint (una cartella in app/blueprints/); ogni pagina è un
file HTML del suo blueprint. Da qui nascono il menu, i collegamenti fra pagine
usati dal JavaScript (window.PAGINA) e le verifiche dei test.

Campi di una pagina:
  endpoint   nome della funzione nel blueprint (= nome del file HTML)
  titolo     voce di menu
  vista      scheda del simulatore originale mostrata dalla pagina (data-vista)
  modulo     per le pagine FI/CO/HR: area di FIModules da aprire (gl, aa, ar…)
  sd / pp    schermata iniziale del launchpad SD/MM o PP (facoltativa)

Mattonelle (tile) del launchpad, stile SAP Fiori — dizionario TILE qui sotto:
  icona      simbolo della mattonella
  tcode      transazioni SAP di riferimento (sottotitolo)
  kpi        indicatore calcolato dal browser sui dati dello studente (static/js/launchpad.js)
"""

VERSIONI = {
    "vuoto": "Versione vuota — l'azienda la costruisci tu (per l'esercizio guidato)",
    "completo": "Versione completa — con clienti di esempio già caricati",
}

ATTIVITA = [
    {"blueprint": "impostazioni", "titolo": "📖 Impostazioni", "pagine": [
        {"endpoint": "impostazioni", "titolo": "Azienda, centri, distinta base", "vista": "impostazioni"},
    ]},
    {"blueprint": "pianificazione", "titolo": "📈 Pianificazione", "pagine": [
        {"endpoint": "budget", "titolo": "Budget annuo", "vista": "budget"},
        {"endpoint": "previsionale", "titolo": "Bilancio previsionale", "vista": "previsionale"},
        {"endpoint": "fabbisogno", "titolo": "Fabbisogno PP / MM", "vista": "fabbisogno-pm"},
    ]},
    {"blueprint": "contabilita", "titolo": "🏛️ Contabilità FI", "pagine": [
        {"endpoint": "moduli", "titolo": "Tutti i moduli", "vista": "fi", "modulo": "home"},
        {"endpoint": "fi_gl", "titolo": "FI-GL Contabilità generale", "vista": "fi", "modulo": "gl"},
        {"endpoint": "fi_aa", "titolo": "FI-AA Cespiti", "vista": "fi", "modulo": "aa"},
        {"endpoint": "fi_ar", "titolo": "FI-AR Clienti", "vista": "fi", "modulo": "ar"},
        {"endpoint": "fi_ap", "titolo": "FI-AP Fornitori", "vista": "fi", "modulo": "ap"},
        {"endpoint": "fi_bl", "titolo": "FI-BL Banche, RiBa, factoring", "vista": "fi", "modulo": "bl"},
        {"endpoint": "fiscale", "titolo": "IVA e imposte", "vista": "fi", "modulo": "tax"},
        {"endpoint": "sicurezza", "titolo": "Impostazioni FI e backup", "vista": "fi", "modulo": "admin"},
        {"endpoint": "registrazione", "titolo": "Scrittura libera FB50", "vista": "registrazione"},
    ]},
    {"blueprint": "controllo", "titolo": "📊 Controllo CO", "pagine": [
        {"endpoint": "co_cca", "titolo": "CO-CCA Budget dei centri", "vista": "fi", "modulo": "co"},
        {"endpoint": "centri_costo", "titolo": "Report centri di costo", "vista": "centri-costo"},
        {"endpoint": "commesse", "titolo": "Report commesse", "vista": "commesse-report"},
        {"endpoint": "mensile", "titolo": "Controllo mensile", "vista": "mensile"},
    ]},
    {"blueprint": "personale", "titolo": "👤 Personale HR", "pagine": [
        {"endpoint": "hr", "titolo": "Dipendenti e paghe", "vista": "fi", "modulo": "hr"},
    ]},
    {"blueprint": "vendite_acquisti", "titolo": "🏢 Vendite e acquisti SD / MM", "pagine": [
        {"endpoint": "sdmm", "titolo": "Launchpad SD / MM", "vista": "sdmm"},
    ]},
    {"blueprint": "produzione", "titolo": "🏭 Produzione PP", "pagine": [
        {"endpoint": "pp", "titolo": "Launchpad PP", "vista": "pp"},
    ]},
    {"blueprint": "reportistica", "titolo": "📚 Libri e bilancio", "pagine": [
        {"endpoint": "giornale", "titolo": "Libro giornale", "vista": "giornale"},
        {"endpoint": "mastro", "titolo": "Mastro", "vista": "mastro"},
        {"endpoint": "bilancio_verifica", "titolo": "Bilancio di verifica", "vista": "bilancio"},
    ]},
]


def pagina(blueprint, endpoint):
    for a in ATTIVITA:
        if a["blueprint"] == blueprint:
            for p in a["pagine"]:
                if p["endpoint"] == endpoint:
                    return a, p
    raise KeyError(f"{blueprint}.{endpoint}")


def tutte_le_pagine():
    for a in ATTIVITA:
        for p in a["pagine"]:
            yield a, p


# endpoint -> (icona, transazioni, indicatore). Indicatori: vedi static/js/launchpad.js
TILE = {
    "impostazioni": ("🏗️", "OKKP · KS01 · CS01 · CA01", "centri"),
    "budget": ("📈", "KP06 · LTP", "budget"),
    "previsionale": ("📑", "CE · SP previsionali", "budget"),
    "fabbisogno": ("🧭", "MD04 · ME51N", "ordiniSD"),
    "moduli": ("🏛️", "FI · CO · HR", "registrazioni"),
    "fi_gl": ("📒", "FB50 · F.01 · AJAB", "risultato"),
    "fi_aa": ("🏭", "AS01 · F-90 · AFAB · ABAVN", "cespiti"),
    "fi_ar": ("👥", "FBL5N · F-28", "clienti"),
    "fi_ap": ("🧾", "FBL1N · F-53", "fornitori"),
    "fi_bl": ("🏦", "FF7A · F-36 · RiBa · factoring", "banca"),
    "fiscale": ("⚖️", "FB41 · IVA · IRES", "iva"),
    "sicurezza": ("🛡️", "Backup · Azienda nuova", "costituzione"),
    "registrazione": ("✍️", "FB50", "registrazioni"),
    "co_cca": ("📊", "KP06 · KSB1", "budgetCO"),
    "centri_costo": ("🎯", "S_ALR_87013611", "centri"),
    "commesse": ("📋", "CJI3 · KKBC", "commesse"),
    "mensile": ("📆", "Budget vs reale", "registrazioni"),
    "hr": ("👤", "PA30 · PC00_M99_CIPE", "dipendenti"),
    "sdmm": ("🏢", "VA01 · VL02N · VF01 · ME21N · MIGO · MIRO", "ordiniSD"),
    "pp": ("🏭", "CO01 · CO11N · MB31 · CO88", "ordiniPP"),
    "giornale": ("📚", "FB03 · S_ALR_87012287", "registrazioni"),
    "mastro": ("📇", "FAGLL03", "registrazioni"),
    "bilancio_verifica": ("⚖️", "F.08 · S_ALR_87012277", "quadratura"),
}


def tile(endpoint):
    icona, tcode, kpi = TILE.get(endpoint, ("▫️", "", ""))
    return {"icona": icona, "tcode": tcode, "kpi": kpi}


# ── Launchpad a due livelli: prima si sceglie il MODULO, poi l'app (stile SAP Fiori «spaces») ──
# app: (blueprint.endpoint, schermata interna o None, titolo, icona, transazioni, indicatore)
#   la schermata interna apre direttamente una funzione del launchpad SD/MM (?sd=…) o PP (?pp=…)
SD, PP_ = "vendite_acquisti.sdmm", "produzione.pp"
SCHERMATE_SD = {"home", "ordini", "ctrl", "pick", "ddt", "fatt", "rfq", "po", "migo", "miro", "tm", "flusso", "anag", "credit"}
SCHERMATE_PP = {"home", "md01", "md04", "md16", "cm01", "anag", "co01", "coois", "co03", "mb261", "co11n", "mb101", "co88", "mb51", "mb52"}

MODULI = [
    {"codice": "fi", "breve": "Contabilità", "sigla": "FI", "titolo": "Contabilità finanziaria", "icona": "🏛️", "colore": "contabilita", "kpi": "registrazioni",
     "descrizione": "Contabilità generale, cespiti, clienti, fornitori, banche, IVA e imposte", "app": [
        ("contabilita.moduli", None, "Panoramica FI", "🏛️", "FI · CO · HR", "registrazioni"),
        ("contabilita.fi_gl", None, "Contabilità generale", "📒", "FB50 · F.01 · AJAB", "risultato"),
        ("contabilita.registrazione", None, "Scrittura libera", "✍️", "FB50", "registrazioni"),
        ("contabilita.fi_aa", None, "Cespiti", "🏭", "AS01 · F-90 · AFAB", "cespiti"),
        ("contabilita.fi_ar", None, "Clienti", "👥", "FBL5N · F-28", "clienti"),
        ("contabilita.fi_ap", None, "Fornitori", "🧾", "FBL1N · F-53", "fornitori"),
        ("contabilita.fi_bl", None, "Banche, RiBa, factoring", "🏦", "FF7A · F-36", "banca"),
        ("contabilita.fiscale", None, "IVA e imposte", "⚖️", "FB41 · IVA · IRES", "iva"),
     ]},
    {"codice": "co", "breve": "Controllo", "sigla": "CO", "titolo": "Controllo di gestione", "icona": "📊", "colore": "controllo", "kpi": "centri",
     "descrizione": "Budget dei centri, report centri di costo, commesse, controllo mensile", "app": [
        ("controllo.co_cca", None, "Budget dei centri", "📊", "KP06 · KSB1", "budgetCO"),
        ("controllo.centri_costo", None, "Report centri di costo", "🎯", "S_ALR_87013611", "centri"),
        ("controllo.commesse", None, "Report commesse", "📋", "CJI3 · KKBC", "commesse"),
        ("controllo.mensile", None, "Controllo mensile", "📆", "Budget vs reale", "registrazioni"),
        (PP_, "co88", "Chiusura di periodo PP", "🧮", "CO88 · KKAX · KKS2", "ordiniPP"),
     ]},
    {"codice": "sd", "breve": "Vendite", "sigla": "SD", "titolo": "Vendite", "icona": "🛍️", "colore": "vendite_acquisti", "kpi": "ordiniSD",
     "descrizione": "Ordine di vendita, ATP e credito, picking, DDT, fattura", "app": [
        (SD, "ordini", "Ordini di vendita", "📋", "VA01 · VA03", "ordiniSD"),
        (SD, "ctrl", "ATP, credito, conferma", "🔍", "VA02 · VKM4", "ordiniSD"),
        (SD, "credit", "Credit Manager", "💳", "VKM4 · UKM_CASE · FD32", "clienti"),
        (SD, "pick", "Picking", "📦", "LT03 · VL02N", None),
        (SD, "ddt", "DDT e uscita merci", "🚚", "VL01N · 601", "ddt"),
        (SD, "fatt", "Fatturazione attiva", "🧾", "VF01 · VF03", "fatture"),
        (SD, "anag", "Anagrafiche clienti", "👥", "XD01", "clienti"),
     ]},
    {"codice": "mm", "breve": "Acquisti", "sigla": "MM", "titolo": "Acquisti e magazzino", "icona": "🛒", "colore": "acquisti", "kpi": "po",
     "descrizione": "Richieste di offerta, ordini d'acquisto, entrata merci, fattura fornitore, giacenze", "app": [
        (SD, "rfq", "RFQ e offerte", "✉️", "ME41 · ME47 · ME49", "rfq"),
        (SD, "po", "Ordini di acquisto", "🛒", "ME21N · ME23N", "po"),
        (SD, "migo", "Entrata merci", "📥", "MIGO 101", "migo"),
        (SD, "miro", "Fattura fornitore", "🧮", "MIRO", "miro"),
        (SD, "tm", "Triple match e controlli", "🔗", "TM", None),
        (PP_, "mb52", "Giacenze", "🏬", "MB52 · MMBE", None),
        (PP_, "mb51", "Documenti materiale", "🧾", "MB51", None),
        (SD, "anag", "Anagrafiche fornitori", "🏷️", "XK01", "fornitori"),
     ]},
    {"codice": "pp", "breve": "Produzione", "sigla": "PP", "titolo": "Produzione", "icona": "🏭", "colore": "produzione", "kpi": "ordiniPP",
     "descrizione": "Dati di base, MRP, ordine di produzione in tre fasi, conferme, chiusura", "app": [
        (PP_, "anag", "Materiali, distinta, ciclo", "📋", "MM03 · CK11N · CS03", None),
        (PP_, "md01", "Pianificazione MRP", "🧠", "MD01", None),
        (PP_, "md04", "Lista fabbisogni", "📈", "MD04", None),
        (PP_, "md16", "Ordini pianificati", "🗓️", "MD16 · CO40 · ME59N", None),
        (PP_, "cm01", "Carico dei centri", "⚙️", "CM01", None),
        (PP_, "co01", "Crea ordine", "🆕", "CO01", "ordiniPP"),
        (PP_, "coois", "Lista ordini", "📑", "COOIS · CO03", "ordiniPP"),
        (PP_, "mb261", "Prelievo componenti", "📤", "MIGO 261", None),
        (PP_, "co11n", "Conferma", "⏱️", "CO11N", None),
        (PP_, "mb101", "Entrata merci da ordine", "📥", "MIGO 101", None),
        (PP_, "co88", "Chiusura di periodo", "📆", "CO88", None),
        ("pianificazione.fabbisogno", None, "Fabbisogno PP / MM", "🧭", "MD04 · ME51N", None),
     ]},
    {"codice": "wms", "breve": "Magazzino", "sigla": "WMS", "titolo": "Magazzino WMS", "icona": "🏬", "colore": "magazzino", "kpi": None,
     "descrizione": "Magazzino a ubicazioni in logica SAP: entrate, pistola RF, compiti, lotti, inventari e spedizioni. Accesso diretto alle funzioni del sistema integrato.", "app": [
        ("erp_magazzino.struttura", None, "Struttura e attivazione", "🏬", "W100 · tipi · ubicazioni", None, "1 · Struttura del magazzino"),
        ("erp_magazzino.mappa", None, "Mappa delle ubicazioni", "🗺️", "LS26 · LX03", None, "1 · Struttura del magazzino"),
        ("erp_magazzino.etichette", None, "Etichette barcode e QR", "🏷️", "Code 128 · QR", None, "1 · Struttura del magazzino"),
        ("erp_acquisti.entrate", None, "Entrata merci (controllo DDT e danni)", "📥", "MIGO 101", None, "2 · Entrata merci e messa a posto"),
        ("erp_magazzino.rf", None, "Pistola RF", "🔫", "LM00 · /SCWM/RFUI", None, "2 · Entrata merci e messa a posto"),
        ("erp_magazzino.bloccato", None, "Merce bloccata e danneggiata", "🚫", "MIGO 344 · 343 · 555", None, "2 · Entrata merci e messa a posto"),
        ("erp_magazzino.compiti", None, "Compiti di magazzino", "📋", "LT10 · LT12 · LT22", None, "3 · Giacenze, lotti e movimenti interni"),
        ("erp_magazzino.monitor", None, "Monitor e quadratura IM–WMS", "📈", "/SCWM/MON · LX23", None, "3 · Giacenze, lotti e movimenti interni"),
        ("erp_magazzino.lotti", None, "Lotti, numeri di serie, tracciabilità", "🧬", "MSC3N · MB56 · IQ03", None, "3 · Giacenze, lotti e movimenti interni"),
        ("erp_produzione.avanzamento", None, "Prelievi per la produzione", "🏭", "MIGO 261 · PSA", None, "3 · Giacenze, lotti e movimenti interni"),
        ("erp_inventario.documenti", None, "Documenti d'inventario", "📝", "LI01N · LI11N · LI14 · LI20", None, "4 · Inventario fisico e contabile (UF 9)"),
        ("erp_inventario.lista", None, "Lista di conta da stampare", "🖨️", "LI04", None, "4 · Inventario fisico e contabile (UF 9)"),
        ("erp_inventario.differenze", None, "Differenze inventariali", "⚖️", "LI21 · 711 / 712", None, "4 · Inventario fisico e contabile (UF 9)"),
        ("erp_inventario.abc", None, "Inventario a rotazione ABC", "🔄", "ABC · ciclo", None, "4 · Inventario fisico e contabile (UF 9)"),
        ("erp_inventario.valorizzazione", None, "Valorizzazione delle rimanenze", "💶", "FIFO · LIFO · CMP", None, "4 · Inventario fisico e contabile (UF 9)"),
        ("erp_vendite.consegne", None, "Consegne e uscita merci", "🚚", "VL01N · VL02N · 601", None, "5 · Uscita merci e spedizione (UF 10)"),
        ("erp_spedizione.prelievo", None, "Prelievo", "📦", "LT03 · lista di prelievo", None, "5 · Uscita merci e spedizione (UF 10)"),
        ("erp_spedizione.imballo", None, "Imballo e SSCC", "🎁", "HU · SSCC · GS1-128", None, "5 · Uscita merci e spedizione (UF 10)"),
        ("erp_spedizione.trasporti", None, "Trasporti e carico", "🚛", "VT01N · VT02N", None, "5 · Uscita merci e spedizione (UF 10)"),
        ("erp_spedizione.ddt", None, "DDT", "📄", "DDT · documento di trasporto", None, "5 · Uscita merci e spedizione (UF 10)"),
        ("erp_spedizione.monitor", None, "Monitor della spedizione", "🛰️", "VL06O", None, "5 · Uscita merci e spedizione (UF 10)"),
        ("erp_innovazione.kpi", None, "KPI di magazzino", "📊", "KPI", None, "6 · Innovazione del magazzino (UF 11)"),
        ("erp_innovazione.slotting", None, "Slotting ABC", "🧭", "/SCWM/SLOT", None, "6 · Innovazione del magazzino (UF 11)"),
        ("erp_innovazione.ondate", None, "Prelievo a ondate e cross-docking", "🌊", "/SCWM/WAVE", None, "6 · Innovazione del magazzino (UF 11)"),
        ("erp_innovazione.rfid", None, "Varco RFID", "📡", "EPC SSCC-96", None, "6 · Innovazione del magazzino (UF 11)"),
        ("formazione.formas", None, "Il percorso del corso FORMAS", "🗓️", "UF 9 · 10 · 11", None, "7 · Formazione del magazziniere"),
        ("formazione.wms_glossario", None, "Glossario del magazziniere", "📖", "parole e transazioni", None, "7 · Formazione del magazziniere"),
        ("formazione.wms_verifica", None, "Verifica: quiz del magazziniere", "✅", "30 domande · UF 9 · 10 · 11", None, "7 · Formazione del magazziniere"),
        ("formazione.dove_merce", None, "Non sai dove è la merce?", "🗺️", "lezione", None, "7 · Formazione del magazziniere"),
        ("formazione.merce_danneggiata", None, "Arriva merce rotta?", "🚫", "lezione", None, "7 · Formazione del magazziniere"),
        ("formazione.inventario_differenze", None, "Lo scaffale non torna col sistema?", "📝", "lezione", None, "7 · Formazione del magazziniere"),
        ("formazione.prelievo_errori", None, "Il prelievo è lento e pieno di errori?", "📋", "lezione", None, "7 · Formazione del magazziniere"),
        ("formazione.ddt_sscc", None, "DDT ed etichette scritti a mano?", "📄", "lezione", None, "7 · Formazione del magazziniere"),
        ("formazione.magazziniere_cammina", None, "Il magazziniere cammina troppo?", "🧭", "lezione", None, "7 · Formazione del magazziniere"),
     ]},
    {"codice": "hr", "breve": "Personale", "sigla": "HR", "titolo": "Personale", "icona": "👤", "colore": "personale", "kpi": "dipendenti",
     "descrizione": "Dipendenti, paghe, contributi e TFR verso FI e CO", "app": [
        ("personale.hr", None, "Dipendenti e paghe", "👤", "PA30 · PC00_M99_CIPE", "dipendenti"),
     ]},
    {"codice": "pian", "breve": "Pianificazione", "sigla": "BPC", "titolo": "Pianificazione", "icona": "📈", "colore": "pianificazione", "kpi": "budget",
     "descrizione": "Budget annuo, bilancio previsionale, fabbisogno", "app": [
        ("pianificazione.budget", None, "Budget annuo", "📈", "KP06 · LTP", "budget"),
        ("pianificazione.previsionale", None, "Bilancio previsionale", "📑", "CE · SP previsionali", "budget"),
        ("pianificazione.fabbisogno", None, "Fabbisogno PP / MM", "🧭", "MD04 · ME51N", None),
     ]},
    {"codice": "rep", "breve": "Libri e bilancio", "sigla": "REP", "titolo": "Libri e bilancio", "icona": "📚", "colore": "reportistica", "kpi": "quadratura",
     "descrizione": "Libro giornale, mastro, bilancio di verifica, flusso documenti", "app": [
        ("reportistica.giornale", None, "Libro giornale", "📚", "FB03 · S_ALR_87012287", "registrazioni"),
        ("reportistica.mastro", None, "Mastro", "📇", "FAGLL03", "registrazioni"),
        ("reportistica.bilancio_verifica", None, "Bilancio di verifica", "⚖️", "F.08", "quadratura"),
        (SD, "flusso", "Flusso documenti SD / MM", "🗂️", "FB03", None),
     ]},
    {"codice": "img", "breve": "Impostazioni", "sigla": "IMG", "titolo": "Impostazioni", "icona": "⚙️", "colore": "impostazioni", "kpi": "costituzione",
     "descrizione": "Azienda, centri di costo, distinta base, impostazioni FI e backup", "app": [
        ("impostazioni.impostazioni", None, "Azienda, centri, distinta base", "🏗️", "OKKP · KS01 · CS01 · CA01", "centri"),
        ("contabilita.sicurezza", None, "Impostazioni FI e backup", "🛡️", "Backup · Azienda nuova", "costituzione"),
     ]},
]


def modulo(codice):
    return next((m for m in MODULI if m["codice"] == codice), None) or next((m for m in MODULI_ARCHIVIO if m["codice"] == codice), None)


def app_modulo(m):
    """Le app di un modulo pronte per il template: endpoint, parametri dell'URL, testi."""
    out = []
    for endpoint, schermata, titolo, icona, tcode, kpi, *gruppo in m["app"]:
        args = {}
        if schermata:
            args["sd" if endpoint == SD else "pp"] = schermata
        out.append({"endpoint": endpoint, "args": args, "titolo": titolo, "icona": icona, "tcode": tcode, "kpi": kpi or "", "gruppo": gruppo[0] if gruppo else ""})
    return out


CASA = {PP_: "pp", SD: "sd", "pianificazione.fabbisogno": "pian"}   # a parità di app, il modulo «di casa» della pagina


def modulo_di(endpoint, schermata=None):
    """Modulo e app del launchpad a cui appartiene una pagina (con l'eventuale schermata SD/PP).
    Serve alla barra dei moduli e al percorso in cima a ogni pagina del simulatore."""
    def scegli(cand):
        return next((c for c in cand if c[0]["codice"] == CASA.get(endpoint)), cand[0]) if cand else None
    esatti, base, vicini = [], [], []
    for m in MODULI:
        for a in m["app"]:
            if a[0] != endpoint:
                continue
            if a[1] == schermata:
                esatti.append((m, a[2]))
            elif a[1] in (None, "home"):
                base.append((m, a[2]))
            vicini.append((m, None))
    return scegli(esatti) or scegli(base) or scegli(vicini) or (None, None)


# ── Laboratori di produzione: stessa azienda, motore a parte (non toccano il simulatore principale) ──
# slot = nome con cui il lavoro si salva sul portale (come «vuoto» e «completo»)
LABORATORI = {
    "alta_varieta": {"slot": "lab-hmlv", "titolo": "Alta varietà e disaccoppiamento", "sigla": "HMLV", "esercizio": "hmlv-disaccoppiamento",
                     "js": ["hmlv-logica.js", "hmlv-pagine.js"], "pagine": [
        {"endpoint": "anagrafica", "titolo": "Anagrafica e strategie", "icona": "🎯", "tcode": "MM03 · MRP 3 · CK11N"},
        {"endpoint": "ordini", "titolo": "Ordini di produzione", "icona": "🏭", "tcode": "CO01 · 261 · CO11N · 101 · TECO"},
        {"endpoint": "vendite", "titolo": "Ordini cliente e consegne", "icona": "📋", "tcode": "VA01 · ATP · 601"},
        {"endpoint": "chiusura", "titolo": "Chiusura di periodo", "icona": "📆", "tcode": "CO88 · KKAX · KKS2"},
        {"endpoint": "cruscotto", "titolo": "Cruscotto e buffer DDMRP", "icona": "🛟", "tcode": "KPI · DDMRP"},
        {"endpoint": "giornale", "titolo": "Libro giornale", "icona": "📚", "tcode": "FB03 · F.08"},
    ]},
    "ripetitiva": {"slot": "lab-rem", "titolo": "Produzione ripetitiva (modello trattore)", "sigla": "REM", "esercizio": "rem-trattore",
                   "js": ["rem-logica.js", "rem-pagine.js"], "pagine": [
        {"endpoint": "pianificazione", "titolo": "Budget, piano e versioni", "icona": "📈", "tcode": "MD61 · C223 · MF50"},
        {"endpoint": "collettori", "titolo": "Collettori costi", "icona": "🗂️", "tcode": "KKF6N"},
        {"endpoint": "consuntivazione", "titolo": "Conferma a consuntivo", "icona": "✅", "tcode": "MFBF · MB1A"},
        {"endpoint": "chiusura", "titolo": "Chiusura di periodo", "icona": "📆", "tcode": "KKS6 · KK87"},
        {"endpoint": "cruscotto", "titolo": "Cruscotto e confronto", "icona": "📊", "tcode": "KPI"},
        {"endpoint": "giornale", "titolo": "Libro giornale", "icona": "📚", "tcode": "FB03 · F.08"},
    ]},
}
# ── SISTEMA INTEGRATO S/4: più blueprint (un modulo SAP per cartella), un solo stato «erp-ft» e un solo libro giornale ──
_ERP_COMUNI = [("static", "js/erp/nucleo.js"), ("static", "js/erp/ui.js"), ("erp_vendite.static", "sd-logica.js"), ("erp_copa.static", "copa-logica.js"),
               ("erp_acquisti.static", "mm-logica.js"), ("erp_produzione.static", "pp-logica.js"), ("erp_costi.static", "copc-logica.js"),
               ("erp_magazzino.static", "wm-logica.js"), ("erp_magazzino.static", "lotti-logica.js"), ("erp_inventario.static", "inv-logica.js"), ("erp_spedizione.static", "sp-logica.js"), ("erp_innovazione.static", "in-logica.js"),
               ("erp_tesoreria.static", "tes-logica.js"), ("erp_valute.static", "val-logica.js"), ("erp_paghe.static", "py-logica.js"), ("erp_fi.static", "storni-logica.js"), ("erp_fi.static", "fs-logica.js"),
               ("erp_cespiti.static", "ce-logica.js"), ("erp_tesoreria.static", "rb-logica.js"), ("erp_chiusura.static", "ch-logica.js"), ("static", "js/erp/ruoli.js"), ("static", "js/lab-copioni.js"),
               ("static", "js/erp/lettore.js"), ("static", "vendor/jsbarcode-3.11.6.min.js"), ("static", "vendor/qrcode-generator-1.4.4.js"), ("static", "js/erp/etichette.js")]
# gruppi delle mattonelle del modulo S/4 (ogni gruppo è una cartella-blueprint)
_ERP_GRUPPI = {"erp_dati": "Dati di base", "erp_vendite": "Vendite (SD)", "erp_acquisti": "Acquisti (MM)", "erp_produzione": "Produzione (PP)",
               "erp_costi": "Costi del prodotto (CO-PC) e Material Ledger", "erp_magazzino": "Magazzino a ubicazioni (WMS)",
               "erp_inventario": "Inventari fisici e contabili", "erp_spedizione": "Spedizione (prelievo, imballo, trasporto, DDT)",
               "erp_innovazione": "Innovazione logistica (KPI, slotting, ondate, RFID)",
               "erp_tesoreria": "Tesoreria (cassa, pagamenti, estratti conto)", "erp_valute": "Valute estere", "erp_paghe": "Paghe e costo del personale",
               "erp_copa": "Redditività (CO-PA)", "erp_fi": "Contabilità (FI)", "erp_cespiti": "Cespiti (FI-AA)",
               "erp_chiusura": "IVA, imposte, chiusura e riapertura"}
_ERP_PAGINE = {
    "erp_dati": [{"endpoint": "avvio", "titolo": "Avvio del sistema", "icona": "🚀", "tcode": "saldi di apertura · 561"},
                 {"endpoint": "anagrafiche", "titolo": "Clienti e materiali", "icona": "👥", "tcode": "XD03 · MM03 · MMBE"},
                 {"endpoint": "condizioni", "titolo": "Condizioni di prezzo", "icona": "🏷️", "tcode": "VK11 · VK13 · V/08"},
                 {"endpoint": "ruoli", "titolo": "Ruoli e autorizzazioni", "icona": "🔐", "tcode": "PFCG · SU01 · SU53"}],
    "erp_vendite": [{"endpoint": "ordini", "titolo": "Ordini cliente", "icona": "📝", "tcode": "VA01 · VA05"},
                    {"endpoint": "crediti", "titolo": "Gestione crediti e disponibilità", "icona": "💳", "tcode": "VKM1 · FD32 · FD33 · V_V2"},
                    {"endpoint": "acconti", "titolo": "Acconti clienti", "icona": "💰", "tcode": "F-37 · F-29"},
                    {"endpoint": "consegne", "titolo": "Consegne", "icona": "🚚", "tcode": "VL01N · 601"},
                    {"endpoint": "fatture", "titolo": "Fatturazione", "icona": "🧾", "tcode": "VF01 · VF05"},
                    {"endpoint": "resi", "titolo": "Resi e note di credito", "icona": "↩️", "tcode": "RE · 651 · G2"},
                    {"endpoint": "incassi", "titolo": "Incassi e partite", "icona": "🏦", "tcode": "F-28 · FBL5N"},
                    {"endpoint": "flusso", "titolo": "Flusso documenti", "icona": "🔗", "tcode": "VA03"}],
    "erp_acquisti": [{"endpoint": "richieste", "titolo": "Richieste d'acquisto e approvazione", "icona": "🙋", "tcode": "ME51N · ME54N · ME5A"},
                     {"endpoint": "ordini", "titolo": "Ordini d'acquisto e rilascio", "icona": "🛒", "tcode": "ME21N · ME29N · ME2N"},
                     {"endpoint": "entrate", "titolo": "Entrata merci", "icona": "📥", "tcode": "MIGO 101 · MMBE"},
                     {"endpoint": "fatture", "titolo": "Fatture fornitore", "icona": "🧾", "tcode": "MIRO"}],
    "erp_produzione": [{"endpoint": "ordini", "titolo": "Ordini di produzione", "icona": "🏭", "tcode": "CO01 · COOIS"},
                       {"endpoint": "avanzamento", "titolo": "Prelievi, conferme, entrate", "icona": "⏱️", "tcode": "261 · CO11N · 101 · TECO"}],
    "erp_costi": [{"endpoint": "scheda", "titolo": "Scheda di calcolo e sovraccosti", "icona": "🧮", "tcode": "KZS2 · KZZ2 · KP26"},
                  {"endpoint": "calcolo", "titolo": "Calcolo del costo standard", "icona": "🏷️", "tcode": "CK11N · CK24 · CK13N"},
                  {"endpoint": "chiusura", "titolo": "Chiusura degli ordini e varianze", "icona": "⚖️", "tcode": "KGI2 · KKS2 · KO88"},
                  {"endpoint": "ml", "titolo": "Material Ledger", "icona": "📒", "tcode": "CKM3 · CKMLCP"}],
    "erp_magazzino": [{"endpoint": "struttura", "titolo": "Struttura e attivazione", "icona": "🏬", "tcode": "W100 · tipi · ubicazioni · strategie"},
                      {"endpoint": "mappa", "titolo": "Mappa delle ubicazioni", "icona": "🗺️", "tcode": "LS26 · LX03 · /SCWM/MON"},
                      {"endpoint": "rf", "titolo": "Pistola RF", "icona": "🔫", "tcode": "LM00 · /SCWM/RFUI"},
                      {"endpoint": "compiti", "titolo": "Compiti di magazzino", "icona": "📋", "tcode": "LT10 · LT12 · LT22"},
                      {"endpoint": "monitor", "titolo": "Monitor del magazzino", "icona": "📈", "tcode": "/SCWM/MON · LX23"},
                      {"endpoint": "etichette", "titolo": "Etichette barcode e QR", "icona": "🏷️", "tcode": "Code 128 · QR"},
                      {"endpoint": "bloccato", "titolo": "Merce bloccata e danneggiata", "icona": "🚫", "tcode": "MIGO 344 · 343 · 555"},
                      {"endpoint": "lotti", "titolo": "Lotti, numeri di serie e tracciabilità", "icona": "🧬", "tcode": "MSC3N · MB56 · IQ03"}],
    "erp_inventario": [{"endpoint": "documenti", "titolo": "Documenti d'inventario", "icona": "📝", "tcode": "LI01N · LI11N · LI14 · LI20"},
                       {"endpoint": "lista", "titolo": "Lista di conta da stampare", "icona": "🖨️", "tcode": "LI04"},
                       {"endpoint": "differenze", "titolo": "Differenze inventariali", "icona": "⚖️", "tcode": "LI21 · 711/712"},
                       {"endpoint": "abc", "titolo": "Classificazione ABC", "icona": "🔤", "tcode": "MC40 · inventario a rotazione"},
                       {"endpoint": "valorizzazione", "titolo": "Valorizzazione delle rimanenze", "icona": "💶", "tcode": "FIFO · LIFO · CMP · standard"}],
    "erp_spedizione": [{"endpoint": "monitor", "titolo": "Monitor delle consegne in uscita", "icona": "🚚", "tcode": "VL06O · /SCWM/PRDO"},
                       {"endpoint": "prelievo", "titolo": "Lista di prelievo", "icona": "📋", "tcode": "LT21 · prelievo FIFO"},
                       {"endpoint": "imballo", "titolo": "Imballo e etichette SSCC", "icona": "📦", "tcode": "VL02N · /SCWM/PACK"},
                       {"endpoint": "trasporti", "titolo": "Trasporti e carico", "icona": "🚛", "tcode": "VT01N · VT02N"},
                       {"endpoint": "ddt", "titolo": "Documento di trasporto (DDT)", "icona": "📄", "tcode": "DDT · D.P.R. 472/96"}],
    "erp_innovazione": [{"endpoint": "kpi", "titolo": "KPI di magazzino", "icona": "📈", "tcode": "accuratezza · ordini perfetti · dock-to-stock"},
                        {"endpoint": "slotting", "titolo": "Slotting ABC", "icona": "🧭", "tcode": "/SCWM/SLOT · ricollocazione"},
                        {"endpoint": "ondate", "titolo": "Prelievo a ondate e cross-docking", "icona": "🌊", "tcode": "/SCWM/WAVE · VL35"},
                        {"endpoint": "rfid", "titolo": "Varco RFID", "icona": "📡", "tcode": "EPC SSCC-96 · SAP AII"}],
    "erp_tesoreria": [{"endpoint": "posizione", "titolo": "Posizione di cassa e previsione", "icona": "💧", "tcode": "FF7A · FF7B"},
                      {"endpoint": "partite", "titolo": "Partite aperte e scadenze", "icona": "📒", "tcode": "FBL5N · FBL1N · anzianità"},
                      {"endpoint": "pagamenti", "titolo": "Pagamenti automatici", "icona": "💸", "tcode": "F110 · SEPA pain.001"},
                      {"endpoint": "estratti", "titolo": "Estratto conto elettronico", "icona": "🏦", "tcode": "FF_5 · FEBAN"},
                      {"endpoint": "riba", "titolo": "Ri.Ba. salvo buon fine", "icona": "🧾", "tcode": "distinta Ri.Ba. · SBF · insoluti"},
                      {"endpoint": "factoring", "titolo": "Factoring", "icona": "🤝", "tcode": "pro soluto · pro solvendo"},
                      {"endpoint": "anticipi", "titolo": "Anticipo su fatture", "icona": "⏩", "tcode": "anticipo fatture · conto 38"}],
    "erp_valute": [{"endpoint": "tassi", "titolo": "Tassi di cambio", "icona": "💱", "tcode": "OB08"},
                   {"endpoint": "documenti", "titolo": "Fatture in valuta", "icona": "🧾", "tcode": "FB70 · FB60"},
                   {"endpoint": "regolazioni", "titolo": "Incassi e pagamenti in valuta", "icona": "🏦", "tcode": "F-28 · F-53"},
                   {"endpoint": "valutazione", "titolo": "Valutazione di fine periodo", "icona": "📆", "tcode": "FAGL_FCV"}],
    "erp_paghe": [{"endpoint": "dipendenti", "titolo": "Dipendenti e parametri", "icona": "👷", "tcode": "PA30"},
                  {"endpoint": "cedolino", "titolo": "Presenze e cedolino", "icona": "🧾", "tcode": "PC00_M15_CALC · CEDT"},
                  {"endpoint": "contabilita", "titolo": "Registrazione, stipendi e F24", "icona": "📒", "tcode": "PC00_M99_CIPE · F24"}],
    "erp_copa": [{"endpoint": "ke30", "titolo": "Redditività per segmento", "icona": "📊", "tcode": "KE30"},
                 {"endpoint": "ke24", "titolo": "Righe singole CO-PA", "icona": "🧮", "tcode": "KE24"}],
    "erp_cespiti": [{"endpoint": "registro", "titolo": "Registro dei cespiti", "icona": "🏭", "tcode": "AW01N · AR01"},
                    {"endpoint": "acquisto", "titolo": "Acquisto di un cespite", "icona": "🆕", "tcode": "AS01 · F-90"},
                    {"endpoint": "ammortamenti", "titolo": "Ammortamenti", "icona": "🧮", "tcode": "AFAB"},
                    {"endpoint": "cessione", "titolo": "Cessione di un cespite", "icona": "🔁", "tcode": "ABAVN · F-92"}],
    "erp_chiusura": [{"endpoint": "iva", "titolo": "Liquidazione IVA e F24", "icona": "🧮", "tcode": "registro IVA · liquidazione · F24"},
                     {"endpoint": "imposte", "titolo": "Imposte (IRES, IRAP, anticipate)", "icona": "🧾", "tcode": "IRES · IRAP · OIC 25"},
                     {"endpoint": "assestamenti", "titolo": "Ratei e risconti", "icona": "📐", "tcode": "assestamento · storno al 1° gennaio"},
                     {"endpoint": "chiusura", "titolo": "Chiusura dell'esercizio", "icona": "🔒", "tcode": "epilogo · FAGLGVTR"},
                     {"endpoint": "riapertura", "titolo": "Riapertura e destinazione dell'utile", "icona": "🔓", "tcode": "1° gennaio · F.16"}],
    "erp_fi": [{"endpoint": "giornale", "titolo": "Libro giornale", "icona": "📚", "tcode": "FB03"},
               {"endpoint": "bilancio", "titolo": "Bilancio di verifica", "icona": "⚖️", "tcode": "F.08"},
               {"endpoint": "fatture", "titolo": "Fatture di servizi", "icona": "🧾", "tcode": "FB70"},
               {"endpoint": "passive", "titolo": "Fatture passive di servizi e pagamenti", "icona": "📥", "tcode": "FB60 · F-53"},
               {"endpoint": "sopravvenienze", "titolo": "Sopravvenienze attive", "icona": "🌩️", "tcode": "indennizzi · A 84"},
               {"endpoint": "sdi", "titolo": "Fattura elettronica (SdI)", "icona": "📤", "tcode": "FatturaPA · TD01 · TD04"},
               {"endpoint": "storni", "titolo": "Storni e annullamenti", "icona": "↩️", "tcode": "VF11 · VL09 · MBST · MR8M · FB08"}],
}
_ERP_JS = {"erp_dati": "dati-pagine.js", "erp_vendite": "sd-pagine.js", "erp_copa": "copa-pagine.js", "erp_fi": "fi-pagine.js",
           "erp_acquisti": "mm-pagine.js", "erp_produzione": "pp-pagine.js", "erp_costi": "copc-pagine.js",
           "erp_magazzino": "wm-pagine.js", "erp_inventario": "inv-pagine.js", "erp_spedizione": "sp-pagine.js", "erp_innovazione": "in-pagine.js",
           "erp_tesoreria": "tes-pagine.js", "erp_valute": "val-pagine.js", "erp_paghe": "py-pagine.js",
           "erp_cespiti": "ce-pagine.js", "erp_chiusura": "ch-pagine.js"}
_WMS = {"erp_magazzino", "erp_inventario", "erp_spedizione", "erp_innovazione"}   # pagine che stanno «di casa» nel modulo WMS
for _bp, _pp in _ERP_PAGINE.items():
    for _p in _pp:
        _p["ep"] = f"{_bp}.{_p['endpoint']}"
        _p["gruppo"] = _ERP_GRUPPI[_bp]
_ERP_NAV = [p for g in _ERP_GRUPPI for p in _ERP_PAGINE[g]]   # mattonelle del modulo, nell'ordine dei gruppi
for _bp, _pp in _ERP_PAGINE.items():
    LABORATORI[_bp] = {"slot": "erp-ft", "titolo": "Sistema integrato S/4", "sigla": "S/4", "codice": "wms" if _bp in _WMS else "s4", "esercizio": "s4-integrato",
                       "js": _ERP_COMUNI + [(f"{_bp}.static", _ERP_JS[_bp])], "pagine": _pp, "nav": _pp, "copione": "SD4", "area": _ERP_GRUPPI[_bp]}
for _k, _lab in LABORATORI.items():
    for _p in _lab["pagine"]:
        _p.setdefault("ep", f"{_k}.{_p['endpoint']}")
    _lab.setdefault("nav", _lab["pagine"])
LAB_SLOTS = {v["slot"]: v["titolo"] for v in LABORATORI.values()}

MODULI += [
    {"codice": "hmlv", "sigla": "HMLV", "breve": "Alta varietà", "titolo": "Alta varietà e disaccoppiamento", "icona": "🧩", "colore": "laboratorio", "kpi": None,
     "descrizione": "Laboratorio: tre transenne sullo stesso telaio, semilavorati a scorta (strategia 70), WIP, varianze, buffer DDMRP",
     "app": [(f"alta_varieta.{p['endpoint']}", None, p["titolo"], p["icona"], p["tcode"], None) for p in LABORATORI["alta_varieta"]["pagine"]]},
    {"codice": "rem", "sigla": "REM", "breve": "Ripetitiva", "titolo": "Produzione ripetitiva (modello trattore)", "icona": "🚜", "colore": "laboratorio", "kpi": None,
     "descrizione": "Laboratorio: budget 4.000 transenne, linea unica, collettori costi per periodo, backflush, WIP al target",
     "app": [(f"ripetitiva.{p['endpoint']}", None, p["titolo"], p["icona"], p["tcode"], None) for p in LABORATORI["ripetitiva"]["pagine"]]},
    {"codice": "s4", "sigla": "S/4", "breve": "Sistema integrato", "titolo": "Sistema integrato S/4", "icona": "🏢", "colore": "laboratorio", "kpi": None,
     "descrizione": "Un solo libro giornale: vendite e resi, CO-PA; acquisti, produzione, costo standard, varianze di lotto, Material Ledger; magazzino a ubicazioni con pistola RF, inventari e spedizione; tesoreria, valute e paghe",
     "app": [(p["ep"], None, p["titolo"], p["icona"], p["tcode"], None, p["gruppo"]) for p in _ERP_NAV]},
]

# ── «Che situazione hai?»: lezioni che portano ai laboratori (prima la spiegazione, poi la prova) ──
MODULI.insert(0, {"codice": "casi", "sigla": "CASI", "breve": "Che situazione hai?", "titolo": "Che situazione hai? — lezioni e casi aziendali", "icona": "🎓",
    "colore": "formazione", "kpi": None,
    "descrizione": "Riconosci la situazione dell'azienda: prima la lezione da spiegare, poi il laboratorio pronto al punto giusto",
    "app": [("formazione.formas", None, "Corso FORMAS · il percorso", "🗓️", "UF 8 · 9 · 10 · 11", None),
            ("formazione.ordini_lunghi", None, "Ordini aperti per mesi?", "⏳", "commessa lunga · disaccoppiamento", None),
            ("formazione.wip_fine_mese", None, "Costi senza ricavi a fine mese?", "📆", "WIP · CO88 · KKAX", None),
            ("formazione.varianze", None, "Varianze che nessuno spiega?", "🔬", "KKS2 · categorie", None),
            ("formazione.lead_time", None, "Il cliente aspetta troppo?", "🚚", "ATO · strategia 50/70", None),
            ("formazione.scorte_semilavorati", None, "Quanti semilavorati a scorta?", "🛟", "DDMRP · buffer", None),
            ("formazione.linea_ripetitiva", None, "Pochi modelli su una linea?", "🚜", "REM · collettore", None),
            ("formazione.backflush", None, "Il backflush falsa il magazzino?", "⚖️", "MFBF · WIP al target", None),
            ("formazione.prezzi_sconti", None, "Prezzi e sconti a mano?", "🏷️", "VK11 · condizioni", None),
            ("formazione.acconti", None, "Acconti dai clienti?", "💰", "F-37 · F-29 · AZWB", None),
            ("formazione.resi_abbuoni", None, "Resi e abbuoni?", "↩️", "RE · 651 · G2", None),
            ("formazione.redditivita_clienti", None, "Quanto guadagni per cliente?", "📊", "CO-PA · KE30", None),
            ("formazione.sovraccosti", None, "Lo standard non copre i costi generali?", "🧮", "CK11N · sovraccosti", None),
            ("formazione.varianza_lotto", None, "I lotti piccoli costano di più?", "📏", "KKS2 · varianza di lotto", None),
            ("formazione.material_ledger", None, "Il costo standard non è quello vero?", "📒", "Material Ledger · CKMLCP", None),
            ("formazione.dove_merce", None, "Non sai dove è la merce?", "🗺️", "WMS · ubicazioni · RF", None),
            ("formazione.inventario_differenze", None, "Lo scaffale non torna col sistema?", "📝", "inventario fisico · 999", None),
            ("formazione.inventario_rotazione", None, "Fermi tutto per l'inventario?", "🔄", "rotazione · ABC", None),
            ("formazione.valorizzazione", None, "Come valorizzi le rimanenze?", "💶", "FIFO · LIFO · CMP", None),
            ("formazione.merce_danneggiata", None, "Arriva merce rotta?", "🚫", "stock bloccato · 344 · 555", None),
            ("formazione.processo_spedizione", None, "Spedisci senza sapere cosa sale sul camion?", "🚛", "consegna · carico · uscita merci", None),
            ("formazione.prelievo_errori", None, "Il prelievo è lento e pieno di errori?", "📋", "FIFO · RF · differenze", None),
            ("formazione.ddt_sscc", None, "DDT ed etichette scritti a mano?", "📄", "DDT · SSCC · GS1-128", None),
            ("formazione.magazziniere_cammina", None, "Il magazziniere cammina troppo?", "🧭", "slotting · ondate", None),
            ("formazione.misurare_magazzino", None, "Come misuri il tuo magazzino?", "📈", "KPI di magazzino", None),
            ("formazione.rfid_automazione", None, "Leggere tutto in un colpo?", "📡", "RFID · automazione · cross-docking", None),
            ("formazione.previsione_cassa", None, "Non sai quanta cassa avrai?", "💧", "tesoreria · F110 · estratto conto", None),
            ("formazione.valute_estere", None, "Vendi e compri in dollari?", "💱", "cambi · FAGL_FCV", None),
            ("formazione.costo_personale", None, "Quanto costa davvero un dipendente?", "🧾", "cedolino · F24 · CdC", None),
            ("formazione.fattura_sbagliata", None, "Hai sbagliato una fattura?", "↩️", "storno · SdI · nota di credito", None),
            ("formazione.chi_fa_cosa", None, "Tutti possono fare tutto?", "🔐", "ruoli · fido · approvazioni", None),
            ("formazione.ciclo_completo", None, "Il ciclo completo?", "🏛️", "esercizio guidato", None)]})


# Percorso ordinario unico. I blueprint e gli slot storici restano intatti.
MODULI_ARCHIVIO = MODULI
def _integrato(codice, sigla, titolo, icona, colore, gruppi):
    return {"codice": codice, "sigla": sigla, "breve": titolo, "titolo": titolo,
            "icona": icona, "colore": colore, "kpi": None,
            "descrizione": "Sistema integrato: stessa azienda, stessi dati e un solo libro giornale.",
            "app": [(p["ep"], None, p["titolo"], p["icona"], p["tcode"], None,
                     _ERP_GRUPPI[bp]) for bp in gruppi for p in _ERP_PAGINE[bp]]}

_casi_esclusi = {
    "ordini_lunghi", "wip_fine_mese", "varianze", "lead_time", "scorte_semilavorati",
    "linea_ripetitiva", "backflush", "ciclo_completo"}
_casi = next(m for m in MODULI_ARCHIVIO if m["codice"] == "casi")
MODULI = [
    _integrato("sd", "SD", "Vendite", "🛍️", "vendite_acquisti", ["erp_vendite"]),
    _integrato("mm", "MM", "Acquisti", "🛒", "acquisti", ["erp_acquisti"]),
    _integrato("pp", "PP", "Produzione", "🏭", "produzione", ["erp_produzione"]),
    next(m for m in MODULI_ARCHIVIO if m["codice"] == "wms"),
    _integrato("img", "DATI", "Avvio e dati di base", "⚙️", "impostazioni", ["erp_dati"]),
    _integrato("fi", "FI", "Contabilità", "🏛️", "contabilita", ["erp_fi", "erp_cespiti", "erp_chiusura"]),
    _integrato("co", "CO", "Costi e redditività", "📊", "controllo", ["erp_costi", "erp_copa"]),
    _integrato("tes", "TES", "Tesoreria", "🏦", "contabilita", ["erp_tesoreria"]),
    _integrato("val", "FX", "Valute estere", "💱", "contabilita", ["erp_valute"]),
    _integrato("hr", "HR", "Paghe e personale", "👤", "personale", ["erp_paghe"]),
    {**_casi, "app": [a for a in _casi["app"] if a[0].split(".")[-1] not in _casi_esclusi]},
]
for _bp, _lab in LABORATORI.items():
    if _lab["slot"] == "erp-ft":
        _lab["codice"] = ({"erp_dati": "img", "erp_vendite": "sd", "erp_acquisti": "mm",
                           "erp_produzione": "pp", "erp_costi": "co", "erp_copa": "co",
                           "erp_fi": "fi", "erp_tesoreria": "tes", "erp_valute": "val",
                           "erp_paghe": "hr", "erp_cespiti": "fi", "erp_chiusura": "fi"}).get(_bp, "wms")
