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
