"""UF 9 Pistoia, 40 ore: programma dell'ente e prova pratica inventariale.

Fonte: progetto dell'ente fornito dal docente il 10/11/2026.
I quattro indicatori sono una GRIGLIA OPERATIVA PROPOSTA per applicare il
metodo a 4 indicatori x 25 indicato dall'ente, non titoli ufficiali dell'ente.
"""
TITOLO = "UF 9 · Inventari fisici e contabili – procedure operative (40 ore)"
OBIETTIVI_ENTE = {
    "conoscenze": "Informatica di base per estrarre dal sistema di gestione delle spedizioni i dati necessari alla programmazione dei ritiri delle merci",
    "capacita": [
        "Verificare la corrispondenza tra i colli caricati sul mezzo di trasporto ed i colli indicati sulla distinta di carico per assicurarsi della completezza della spedizione",
        "Controllare che ogni spedizione sia completa verificando la corrispondenza tra il numero dei colli destinati ad ogni cliente con i dati riportati sui documenti di trasporto",
    ],
}
CONTENUTI_ENTE = [
    "Le scritture di inventario, registrazioni e movimentazione merce",
    "Metodologie di valutazione dell’inventario (Lifo, Fifo, costo medio)",
    "Valorizzazione delle merci in viaggio",
    "L’inventario inframese e di fine anno",
    "L’inventario fisico e scritture di assestamento",
    "Rettifiche inventariali",
]
# Scansione proposta dal docente, non monte ore per argomento imposto dall'ente.
PROGRAMMA_ORE = [
    {"ore": 6, "titolo": "Fondamenti e scritture di magazzino", "lezione": "fondamenti", "passi": "1–17",
     "attivita": "Articolo, UdC, ubicazioni, movimenti 101/261/555, estrazione e lettura saldi e documenti."},
    {"ore": 6, "titolo": "FIFO, LIFO e costo medio", "lezione": "valori", "passi": "77",
     "attivita": "Scheda a lotti con prezzi diversi; determinazione costo degli scarichi e rimanenze, confronto con costo standard."},
    {"ore": 4, "titolo": "Merce in viaggio e valorizzazione", "lezione": "valori", "passi": "72–76",
     "attivita": "Trasferimento W100 → D200, uscita 351, merce in viaggio, entrata 101; verifica che 200 + 100 = 300 TR-PED."},
    {"ore": 5, "titolo": "Inventario inframese e di fine anno", "lezione": "inventario", "passi": "64–66",
     "attivita": "Programmare inventari ciclici e di chiusura: data di cut-off, stampa conta cieca, movimenti aperti, scorte bloccate."},
    {"ore": 7, "titolo": "Controllo fisico e assestamenti", "lezione": "inventario", "passi": "65–71",
     "attivita": "LI01N → conta cieca RF → LI11N → riconta LI14 → LI20 → differenza LI21/711; analisi scarto di 12 kg."},
    {"ore": 4, "titolo": "Rettifiche inventariali e quadratura", "lezione": "inventario", "passi": "70–71, 78",
     "attivita": "Autorizzazione, evidenza del motivo, monitor giacenze IM/WMS e riconciliazione quantità e valore."},
    {"ore": 4, "titolo": "Distinta di carico, colli e DDT", "lezione": "spedizioni", "passi": "38–51, 59–63",
     "attivita": "Estrazione dati consegne, SSCC, trasporto, confronto 7 Beta + 3 Delta = 10 colli e DDT per cliente."},
    {"ore": 4, "titolo": "Simulazione completa e prova intermedia", "lezione": "inventario", "passi": "38–51, 64–78",
     "attivita": "Eseguire i controlli e produrre le evidenze richieste; discussione delle anomalie e valutazione 4 × 25."},
]
assert sum(x["ore"] for x in PROGRAMMA_ORE) == 40

PROVA = {
    "titolo": "Prova intermedia UF 9 — simulazione di un processo inventariale",
    "durata_suggerita": "90–120 minuti, compresa verifica documenti (indicativa, non specificata dall'ente)",
    "contesto": (
        "Ferro & Transenne S.r.l., scenario gennaio 2027 di MASTER SAP STYLE. "
        "La prova si svolge dopo la pratica guidata: utilizza le operazioni reali del gestionale, "
        "senza inventare giacenze né ripetere i movimenti già registrati. "
        "Il docente raccoglie schermate, codici documento, conte e prospetti; "
        "non si assume che questa pagina certifichi automaticamente il lavoro nel database."
    ),
}
FASI_ESAME = [
    {
        "codice": "A", "titolo": "Estrazione dati di spedizione e controllo dei colli",
        "passi": "38–51 (Beta/Delta); 59–63 (Gamma)",
        "consegna": (
            "Dal sistema delle spedizioni individua gli ordini e le consegne di Beta e Delta. "
            "Esporta o trascrivi una distinta con cliente, consegna, articolo, pezzi previsti, "
            "colli previsti, SSCC e stato di carico. Confronta i 7 colli di Beta con "
            "i 3 di Delta (10 totali) e verifica la corrispondenza con trasporto e DDT. "
            "Annota ogni differenza riscontrata e spiega come si risolverebbe senza ripartire da zero."
        ),
        "evidenze": [
            "Distinta di carico o estratto del gestionale, con numero trasporto",
            "Controllo 7 colli Beta + 3 colli Delta = 10 colli previsti",
            "SSCC distinti, carico RF/RFID e corrispondenza per ciascun cliente ai DDT",
        ],
    },
    {
        "codice": "B", "titolo": "Inventario fisico: documento, conta e riconta",
        "passi": "64–70",
        "consegna": (
            "Prepara la conta di F-01, F-02 e 01-05-1 con LI01N. "
            "Mostra la lista di conta cieca e registra le quantità lette. "
            "Per F-02 rileva la quantità fisica di 438 kg rispetto ai 450 kg previsti: "
            "la differenza è -12 kg. Esegui la riconta con LI14 e documenta l'esito "
            "prima della chiusura WMS con LI20. "
            "Spiega perché la rettifica non si deve fare prima della riconta."
        ),
        "evidenze": [
            "Identificativo del documento LI01N, lista di conta e stato ubicazioni",
            "Conta 438 kg, teorico 450 kg, differenza -12 kg sulla F-02",
            "Riconta LI14 e chiusura LI20 verificata",
        ],
    },
    {
        "codice": "C", "titolo": "Rettifica, valorizzazione e merce in viaggio",
        "passi": "71–78",
        "consegna": (
            "Registra, solo quando autorizzato, la differenza inventariale con LI21 "
            "e dimostra la quadratura IM/WMS nel monitor. "
            "Verifica il trasferimento W100 → D200 di 100 TR-PED: "
            "all'uscita il sistema deve distinguere 200 pezzi a W100 e 100 in viaggio, "
            "all'arrivo 200 a W100 e 100 a D200, per un totale 300. "
            "Prepara il prospetto di valore del ferro al costo standard di 0,95 euro/kg "
            "e confronta FIFO, LIFO e costo medio usando DUE lotti con prezzi diversi, "
            "come esercizio su carta senza creare acquisti aggiuntivi."
        ),
        "evidenze": [
            "Riferimento LI21/711, differenza -12 kg e relativa valorizzazione",
            "Quadratura del monitor IM/WMS; estratto merce in viaggio e documento 351/101",
            "Valore ferro 438 × 0,95 = 416,10 euro; prospetto FIFO/LIFO/medio a due lotti",
        ],
    },
    {
        "codice": "D", "titolo": "Relazione conclusiva e documentazione",
        "passi": "51, 70–71, 75–78",
        "consegna": (
            "Produci una breve relazione conclusiva con: scorte teoriche e fisiche, "
            "differenze e causali, documenti generati, colli attesi e caricati, "
            "completezza DDT, valore del materiale e posizione delle merci in viaggio. "
            "Distingui le attività effettuate nel gestionale dai calcoli svolti su carta. "
            "Descrivi i controlli utili per inventari inframese e di fine anno."
        ),
        "evidenze": [
            "Prospetto riassuntivo firmato con data e nominativo dell'allievo",
            "Elenco dei codici documento e delle anomalie riconciliate",
            "Spiegazione dei controlli per inventario ciclico e di chiusura esercizio",
        ],
    },
]
VALUTAZIONE = [
    {
        "numero": 1, "titolo": "Preparazione ed estrazione corretta dei dati",
        "descrizione": "Ricerca su sistema, distinta di carico, abbinamento consegne e clienti, leggibilità e completezza delle evidenze.",
    },
    {
        "numero": 2, "titolo": "Correttezza dell'inventario fisico",
        "descrizione": "Documento LI01N, conta cieca, verifica differenza, riconta indipendente, chiusura WMS e tracciabilità.",
    },
    {
        "numero": 3, "titolo": "Correttezza dei movimenti e della valorizzazione",
        "descrizione": "Rettifiche LI21, saldo IM/WMS, FIFO/LIFO/medio, valorizzazione delle merci in viaggio senza duplicazioni.",
    },
    {
        "numero": 4, "titolo": "Completezza spedizione e controllo documentale",
        "descrizione": "Confronto colli caricati/distinta e DDT per cliente; motivazione, segnalazione e gestione differenze.",
    },
]
LIVELLI = [
    {"da": 1, "a": 5, "label": "Insufficiente"},
    {"da": 6, "a": 10, "label": "Parzialmente sufficiente"},
    {"da": 11, "a": 15, "label": "Sufficiente"},
    {"da": 16, "a": 20, "label": "Buono"},
    {"da": 21, "a": 25, "label": "Ottimo"},
]
