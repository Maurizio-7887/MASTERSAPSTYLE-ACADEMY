"""Corsi online per privati costruiti sul sistema integrato: programma, prova gratuita, domande d'esame.

Una sola fonte per ore, moduli, lezioni collegate («Che situazione hai?») e app del simulatore di ogni modulo.
L'esame unisce teoria (domande estratte) e pratica: il confronto automatico del lavoro salvato nel sistema
integrato con i numeri attesi dell'esercizio guidato del corso (esercizi.ESERCIZI).
"""
from .blueprints.formazione.wms_testi import VERIFICA

# modulo: (titolo, ore, contenuti, lezioni «Che situazione hai?», app del simulatore [(endpoint, etichetta)])
MODULI_ERP = [
    ("Avvio, costituzione e dati di base", 6,
     "L'azienda nasce dal notaio: capitale, anagrafiche di clienti, fornitori e materiali, condizioni di prezzo, ruoli e autorizzazioni.",
     ["ciclo-completo", "chi-fa-cosa"], [("erp_dati.avvio", "Avvio dell'azienda"), ("erp_dati.anagrafiche", "Anagrafiche"), ("erp_dati.ruoli", "Ruoli")]),
    ("Contabilità generale (FI)", 10,
     "Registrazioni in partita doppia, fatture attive e passive, IVA e SDI, storni, libro giornale, mastri e bilancio di verifica.",
     ["fattura-sbagliata"], [("erp_fi.giornale", "Libro giornale"), ("erp_fi.fatture", "Fatture"), ("erp_fi.storni", "Storni"), ("erp_fi.mastro", "Mastri")]),
    ("Vendite (SD)", 9,
     "Ordine cliente, consegna, fattura e incasso; listini e prezzi speciali, acconti, resi e abbuoni, controllo del fido.",
     ["prezzi-sconti", "acconti", "resi-abbuoni"], [("erp_vendite.ordini", "Ordini cliente"), ("erp_vendite.consegne", "Consegne"), ("erp_vendite.fatture", "Fatture di vendita"), ("erp_vendite.resi", "Resi")]),
    ("Acquisti e magazzino (MM)", 9,
     "Richiesta d'acquisto, offerte, ordine al fornitore, entrata merci (MIGO) e fattura (MIRO) con le differenze prezzo; merce danneggiata e rottamazioni.",
     ["merce-danneggiata", "valorizzazione"], [("erp_acquisti.richieste", "Richieste d'acquisto"), ("erp_acquisti.ordini", "Ordini d'acquisto"), ("erp_acquisti.entrate", "Entrate merci"), ("erp_acquisti.fatture", "Fatture d'acquisto")]),
    ("Produzione (PP)", 10,
     "Distinta base e ciclo, ordini di produzione a operazioni, prelievi, dichiarazioni di fase, versamenti e semilavorati a scorta.",
     ["ordini-lunghi", "wip-fine-mese", "lead-time"], [("erp_produzione.ordini", "Ordini di produzione"), ("erp_produzione.avanzamento", "Avanzamento e dichiarazioni")]),
    ("Magazzino operativo (WMS)", 8,
     "Struttura e ubicazioni, compiti di magazzino con la pistola RF, merce bloccata, prelievo, imballo con SSCC, trasporto e DDT.",
     ["dove-merce", "processo-spedizione", "ddt-sscc"], [("erp_magazzino.mappa", "Mappa del magazzino"), ("erp_magazzino.rf", "Pistola RF"), ("erp_spedizione.monitor", "Monitor delle consegne"), ("erp_spedizione.ddt", "DDT")]),
    ("Controllo di gestione (CO)", 8,
     "Centri di costo, calcolo del costo standard con i sovraccosti, chiusura degli ordini e varianze, redditività per cliente (CO-PA).",
     ["sovraccosti", "varianze", "redditivita-clienti"], [("erp_controllo.centri", "Centri di costo"), ("erp_costi.calcolo", "Costo standard"), ("erp_costi.chiusura", "Chiusura ordini"), ("erp_copa.ke30", "Redditività")]),
    ("Tesoreria, valute e personale", 6,
     "Pagamenti e incassi, estratti conto, Ri.Ba. e factoring; fatture in dollari e differenze cambio; cedolini e costo del personale.",
     ["previsione-cassa", "valute-estere", "costo-personale"], [("erp_tesoreria.pagamenti", "Pagamenti"), ("erp_valute.documenti", "Documenti in valuta"), ("erp_paghe.cedolino", "Cedolini")]),
    ("Cespiti, chiusura e riapertura", 8,
     "Acquisto, ammortamento e cessione dei cespiti; ratei, risconti e assestamenti; liquidazione IVA, IRES e IRAP; chiusura e riapertura dei conti.",
     [], [("erp_cespiti.registro", "Registro cespiti"), ("erp_chiusura.assestamenti", "Assestamenti"), ("erp_chiusura.imposte", "Imposte"), ("erp_chiusura.riapertura", "Riapertura")]),
    ("Esercizio annuale guidato e consegna", 6,
     "«Dicembre: dalla costituzione alla riapertura»: oltre 450 passi guidati con controllo automatico, poi la consegna con il confronto dei numeri attesi.",
     [], [("erp_dati.avvio", "Apri l'esercizio passo passo")]),
]

MODULI_MAG = [
    ("UF 8 · Contabilità di magazzino", 6,
     "Entrate merci e fatture (MIGO e MIRO), differenze prezzo, consumi, rottamazioni, resi, scheda di magazzino e valorizzazione delle rimanenze.",
     ["valorizzazione", "dove-merce", "merce-danneggiata"], [("erp_inventario.valorizzazione", "Valorizzazione"), ("erp_acquisti.entrate", "Entrate merci"), ("erp_fi.giornale", "Libro giornale")]),
    ("UF 9 · Inventari fisici e contabili", 5,
     "Documento d'inventario, conta cieca e riconta, differenze e loro registrazione, inventario a rotazione con la classificazione ABC.",
     ["inventario-differenze", "inventario-rotazione"], [("erp_inventario.documenti", "Documenti d'inventario"), ("erp_inventario.lista", "Lista di conta"), ("erp_inventario.differenze", "Differenze"), ("erp_inventario.abc", "ABC")]),
    ("UF 10 · Sistemi informativi per la logistica", 6,
     "Il WMS integrato con vendite, acquisti e produzione: pistola RF, quarantena, approvvigionamento della linea, picking, imballo SSCC, trasporto e DDT.",
     ["processo-spedizione", "prelievo-errori", "ddt-sscc"], [("erp_magazzino.rf", "Pistola RF"), ("erp_spedizione.monitor", "Monitor delle consegne"), ("erp_spedizione.imballo", "Imballo e SSCC"), ("erp_spedizione.ddt", "DDT")]),
    ("UF 11 · Innovazione del magazzino 5.0", 3.5,
     "Slotting, ondate di prelievo e cross-docking, varco RFID e KPI del magazzino.",
     ["magazziniere-cammina", "misurare-magazzino", "rfid-automazione"], [("erp_innovazione.slotting", "Slotting"), ("erp_innovazione.ondate", "Ondate"), ("erp_innovazione.rfid", "Varco RFID"), ("erp_innovazione.kpi", "KPI")]),
    ("Esercizio «Magazziniere 5.0: un mese di magazzino»", 3,
     "Oltre 60 passi controllati in automatico nel sistema integrato e la ricostruzione delle scritture, con la consegna finale.",
     [], [("erp_magazzino.monitor", "Apri l'esercizio passo passo")]),
    ("Scorte, previsioni, KPI e lean · MasterSupplyChain Academy", 36.5,
     "I 16 moduli del percorso «Magazzino e Magazziniere 5.0» sulla piattaforma MasterSupplyChain: scorte e riordino, ricevimento, "
     "magazzino operativo, trasporti, resi, KPI, finanza, previsioni, tecnologie, sostenibilità, lean e rischio, con quiz ed esercitazioni.",
     [], []),
]

CORSI = {
    "erp": {
        "titolo": "ERP in stile SAP: dal ciclo attivo alla produzione", "breve": "Corso ERP", "prefisso": "ERP",
        "prezzo": 297, "prezzo_pieno": 347, "moduli": MODULI_ERP, "esercizio": "dicembre-wms",
        "gratis": ["ciclo-completo", "chi-fa-cosa", "prezzi-sconti"],
        "sottotitolo": "Un ERP didattico integrato con un solo libro giornale: costituisci Ferro & Transenne e la porti fino alla riapertura "
                       "dei conti lavorando in vendite (SD), acquisti e magazzino (MM), produzione (PP), WMS, contabilità (FI) e controllo (CO).",
    },
    "magazzino": {
        "titolo": "Magazzino e Magazziniere 5.0: WMS, inventari e spedizioni", "breve": "Corso Magazziniere 5.0", "prefisso": "MAG",
        "prezzo": 297, "prezzo_pieno": 347, "moduli": MODULI_MAG, "esercizio": "magazziniere-5",
        "gratis": ["valorizzazione", "dove-merce", "inventario-differenze"],
        "scm": True,
        "sottotitolo": "Un mese nel magazzino di Ferro & Transenne in quattro unità (contabilità di magazzino, inventari, WMS e spedizioni, "
                       "innovazione 5.0), più i 16 moduli di scorte, KPI e lean della MasterSupplyChain Academy.",
    },
}
for _c in CORSI.values():
    _c["ore"] = sum(m[1] for m in _c["moduli"])

SOGLIA_TEORIA = 0.7       # 70% delle domande
SOGLIA_PRATICA = 0.8      # 80% dei numeri attesi dell'esercizio
DOMANDE_ESAME = 20
TENTATIVI = 3
DURATA_MIN = 45

# (testo, opzioni, indice giusto, spiegazione)
DOMANDE_ERP = [
    ("In un ERP integrato, una entrata merci da ordine d'acquisto…", ["Non genera scritture", "Genera subito la scrittura magazzino a fatture da ricevere", "Genera la fattura del fornitore", "Si registra solo a fine mese"], 1, "Ogni documento logistico ha la sua scrittura contabile."),
    ("La transazione MIGO serve a…", ["Registrare movimenti di magazzino come l'entrata merci", "Creare l'ordine cliente", "Pagare il fornitore", "Calcolare l'IRES"], 0, "MIGO è il movimento merci."),
    ("La MIRO registra…", ["L'ordine d'acquisto", "La fattura del fornitore abbinata a ordine ed entrata merci", "La consegna al cliente", "Il cedolino"], 1, "Controllo a tre vie: ordine, entrata, fattura."),
    ("Se la fattura del fornitore ha un prezzo più alto dello standard, con il costo standard la differenza va…", ["Nel magazzino", "In un conto di differenze prezzo", "Al cliente", "Nel capitale"], 1, "Il magazzino resta a standard."),
    ("Il ciclo attivo in SD segue l'ordine…", ["Fattura, consegna, ordine", "Ordine, consegna, fattura, incasso", "Incasso, ordine, fattura", "Consegna, ordine, incasso"], 1, "Order to cash."),
    ("Con la VA01 si crea…", ["L'ordine cliente", "L'ordine d'acquisto", "L'ordine di produzione", "Il DDT"], 0, "Ordine di vendita."),
    ("Un acconto incassato dal cliente prima della consegna è…", ["Un ricavo", "Un debito verso il cliente fino alla fattura", "Un costo", "Una riserva"], 1, "Si detrae nella fattura finale."),
    ("Un reso del cliente in un ERP genera…", ["Solo una nota di credito", "Il rientro della merce e la nota di credito", "Nulla", "Un nuovo ordine d'acquisto"], 1, "Flusso logistico e contabile insieme."),
    ("Il blocco del fido scatta quando…", ["Il cliente supera il limite di credito concesso", "Il magazzino è vuoto", "Il fornitore è in ritardo", "Finisce l'anno"], 0, "Lo sblocca chi ne ha l'autorità."),
    ("La separazione dei compiti significa che…", ["Tutti possono fare tutto", "Chi fa un'operazione non la approva da solo", "Solo il docente usa il sistema", "Si usano due ERP"], 1, "Ruoli e autorizzazioni."),
    ("La distinta base indica…", ["I clienti del prodotto", "I componenti e le quantità per fare un prodotto", "Il prezzo di vendita", "Le ferie del personale"], 1, "Bill of materials."),
    ("Il ciclo di lavoro indica…", ["Le fasi, i centri di lavoro e i tempi", "I fornitori", "Le fatture", "Le scorte di sicurezza"], 0, "Routing."),
    ("In un ordine di produzione a operazioni le fasi intermedie…", ["Generano sempre carichi di semilavorati", "Si dichiarano sull'ordine senza caricare semilavorati a magazzino", "Non si registrano", "Si fatturano"], 1, "Il 101 carica solo i pezzi finiti."),
    ("Il movimento 101 da ordine di produzione è…", ["Il prelievo di materiale", "Il versamento a magazzino del prodotto", "La vendita", "Il trasferimento tra depositi"], 1, "Entrata merci da produzione."),
    ("Il WIP (lavori in corso) è…", ["Il valore della merce venduta", "Il costo accumulato su ordini non ancora completati", "Un debito verso fornitori", "Il fatturato del mese"], 1, "Si legge a fine periodo."),
    ("Le varianze di produzione si calcolano…", ["All'apertura dell'ordine", "Alla chiusura dell'ordine, confrontando consuntivo e standard", "Mai", "Sulla fattura del cliente"], 1, "Materiale, tempi, lotto."),
    ("Un'ubicazione del WMS è…", ["Il codice del cliente", "Il posto preciso dove sta la merce", "Il prezzo", "Il documento di trasporto"], 1, "Corsia, campata, livello."),
    ("Il codice SSCC identifica…", ["Un articolo", "Un collo o un pallet spedito", "Un fornitore", "Una fattura"], 1, "Serial Shipping Container Code."),
    ("Il DDT accompagna…", ["La merce durante il trasporto", "Il bonifico", "La dichiarazione IVA", "Il bilancio"], 0, "Documento di trasporto."),
    ("La pistola RF serve a…", ["Stampare le fatture", "Confermare i compiti di magazzino leggendo codici e ubicazioni", "Calcolare gli ammortamenti", "Inviare email"], 1, "Conferma sul posto."),
    ("Un centro di costo raccoglie…", ["I ricavi di un cliente", "I costi di un'area di responsabilità", "Le giacenze", "Le fatture attive"], 1, "Controllo per responsabilità."),
    ("I sovraccosti nel calcolo del costo standard servono a…", ["Aumentare il prezzo a caso", "Includere i costi generali (magazzino, acquisti, struttura)", "Ridurre le tasse", "Calcolare l'IVA"], 1, "Altrimenti il margine sembra più alto."),
    ("Il CO-PA (KE30) mostra…", ["La redditività per cliente, prodotto o mercato", "Le presenze", "I cespiti", "Le ubicazioni"], 0, "Conto economico per segmenti."),
    ("Una fattura di vendita in dollari, incassata quando il cambio è cambiato, genera…", ["Nulla", "Una differenza cambio attiva o passiva", "Un reso", "Un nuovo cliente"], 1, "Utile o perdita su cambi."),
    ("La Ri.Ba. è…", ["Una ricevuta bancaria per incassare dai clienti tramite banca", "Un tipo di cespite", "Un'imposta", "Un ordine d'acquisto"], 0, "Strumento di incasso."),
    ("Il costo aziendale di un dipendente comprende…", ["Solo il netto in busta", "Lordo, contributi a carico azienda e TFR", "Solo i contributi", "Solo il TFR"], 1, "È il costo per l'azienda."),
    ("L'ammortamento ripartisce…", ["Il costo di un cespite negli anni di utilizzo", "Il fatturato tra i clienti", "Le scorte tra i depositi", "Le ferie"], 0, "Principio di competenza."),
    ("Cedere un cespite a un prezzo più alto del valore netto contabile genera…", ["Una minusvalenza", "Una plusvalenza", "Un risconto", "Un rateo"], 1, "Prezzo − valore netto."),
    ("Un premio assicurativo pagato in anticipo per l'anno dopo diventa a fine anno…", ["Un rateo passivo", "Un risconto attivo", "Un debito", "Un ricavo"], 1, "Costo rinviato all'anno successivo."),
    ("Un fitto di competenza dell'anno ma pagato l'anno dopo è…", ["Un risconto attivo", "Un rateo passivo", "Un credito", "Un ricavo"], 1, "Costo maturato non ancora pagato."),
    ("La chiusura dell'esercizio…", ["Cancella i dati", "Determina utile o perdita e chiude i conti", "Crea nuovi clienti", "Blocca il magazzino per sempre"], 1, "Poi si riaprono i conti patrimoniali."),
    ("Alla riapertura dei conti si riportano…", ["I costi e i ricavi", "I saldi patrimoniali (attività, passività, netto)", "Solo la banca", "Nulla"], 1, "I conti economici ripartono da zero."),
    ("Per correggere una fattura già registrata si usa…", ["La cancellazione", "Lo storno con un documento che la annulla", "La modifica dell'importo", "Un nuovo cliente"], 1, "Il sistema mantiene la traccia."),
    ("Un sistema ERP integrato ha…", ["Un libro giornale per modulo", "Un solo libro giornale alimentato da tutti i moduli", "Nessuna contabilità", "Solo il magazzino"], 1, "Ogni documento scrive nello stesso giornale."),
    ("Il bilancio di verifica quadra quando…", ["Il totale dare è uguale al totale avere", "La banca è positiva", "Ci sono utili", "Il magazzino è pieno"], 0, "Partita doppia."),
    ("Il simulatore del corso è…", ["Un prodotto SAP certificato", "Un simulatore didattico in stile SAP", "Un gestionale per la produzione reale", "Un foglio Excel"], 1, "Non è un prodotto SAP."),
]

DOMANDE_MAG = [(d[1], d[2], d[3], d[4]) for d in VERIFICA] + [
    ("Il FEFO fa uscire per primo…", ["Il lotto entrato per primo", "Il lotto che scade per primo", "Il lotto più grande", "Il lotto più vicino alla porta"], 1, "First expired, first out."),
    ("La conta cieca significa che chi conta…", ["Non vede la giacenza del sistema", "Conta senza luce", "Conta solo i pallet", "Non firma la lista"], 0, "Così non si «aggiusta» la conta."),
    ("Lo slotting mette vicino alle baie…", ["Gli articoli meno richiesti", "Gli articoli con più prelievi", "I pallet vuoti", "La merce bloccata"], 1, "Meno metri percorsi."),
    ("La merce in quarantena…", ["Si può spedire", "C'è ma non è disponibile finché non viene liberata", "Non si registra", "Va subito al cliente"], 1, "Stock bloccato o in controllo."),
    ("Una differenza inventariale negativa a costo standard si registra come…", ["Ricavo", "Costo per differenze inventariali", "Capitale", "IVA"], 1, "Rettifica del magazzino."),
]

DOMANDE = {"erp": DOMANDE_ERP, "magazzino": DOMANDE_MAG}


def corso(slug):
    return CORSI.get(slug)
