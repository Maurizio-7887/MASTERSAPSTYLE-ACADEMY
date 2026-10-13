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
