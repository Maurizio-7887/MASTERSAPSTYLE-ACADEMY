"""I blocchi del questionario seguono i 20 capitoli del Manuale di ragioneria, dall'inizio alla fine.

Blocco C01 = capitolo 1, …, C20 = capitolo 20. Le domande mantengono il loro ID storico (Q01-01, Q15-02, …): risposte,
ripasso degli errori e statistiche dei quesiti restano validi. Il vecchio raggruppamento Q01–Q20 rimane solo per leggere
le prove già fatte (unità «storiche»).
"""

# codice → (titolo del blocco = titolo del capitolo, regole da ricordare, esempio o None)
BLOCCHI = [
    ("C01", "L'azienda, il patrimonio e il reddito", [
        "Il patrimonio è la differenza tra attività e passività: è il patrimonio netto, cioè i mezzi propri.",
        "Il reddito è la differenza tra ricavi e costi di competenza dell'esercizio, non tra incassi e pagamenti.",
        "Competenza: un costo o un ricavo appartiene all'anno in cui avviene il fatto economico (consegna dei beni, servizio reso), non a quello del pagamento.",
        "Operazioni permutative (incassi, pagamenti, prestiti) non cambiano il reddito; operazioni modificative (costi e ricavi) sì.",
    ], None),
    ("C02", "Il conto e il metodo della partita doppia", [
        "Ogni operazione si registra con almeno due conti: il totale Dare è sempre uguale al totale Avere.",
        "Attività e costi aumentano in Dare; passività, patrimonio netto e ricavi aumentano in Avere.",
        "Il pareggio è necessario ma non basta: conti e sezioni devono descrivere ciò che è successo davvero.",
    ], {"testo": "Prelevi 500 € dalla banca per il fondo cassa.", "righe": [("Cassa", "D", 500), ("Banca c/c", "A", 500)]}),
    ("C03", "Il piano dei conti", [
        "Conti patrimoniali (attività, passività, patrimonio netto) restano aperti da un anno all'altro; conti economici (costi e ricavi) ripartono da zero.",
        "Il conto deve descrivere la natura dell'operazione: energia, assicurazioni, consulenze hanno conti propri, non «Merci c/acquisti».",
        "Fondi ammortamento e svalutazione rettificano un'attività; resi e abbuoni rettificano costi o ricavi; le perdite riducono il patrimonio netto.",
    ], None),
    ("C04", "I libri contabili: giornale, mastro, partitari e bilancio di verifica", [
        "Il giornale registra tutto in ordine cronologico; il mastro raccoglie i movimenti di ogni conto e ne calcola il saldo.",
        "Il partitario mostra il credito o il debito di ogni cliente e fornitore: la somma dei partitari è uguale al conto generale.",
        "Il bilancio di verifica elenca i saldi: totale saldi dare = totale saldi avere.",
        "Un errore si corregge con lo storno (scrittura opposta) e la registrazione giusta; lo stesso fatto si registra in modo diverso in ad hoc, Business Central e SAP, ma le regole sono le stesse.",
    ], None),
    ("C05", "La costituzione e il capitale sociale", [
        "Sottoscrizione: Soci c/sottoscrizione in Dare, Capitale sociale in Avere. Versamento: Banca in Dare, Soci c/sottoscrizione in Avere.",
        "Se sottoscrizione e versamento sono contestuali si registra direttamente Banca / Capitale sociale.",
        "Un finanziamento dei soci da restituire è un debito, non capitale.",
    ], {"testo": "Atto costitutivo: i soci sottoscrivono 10.000 € di capitale.", "righe": [("Soci c/sottoscrizione", "D", 10000), ("Capitale sociale", "A", 10000)]}),
    ("C06", "Il meccanismo dell'IVA", [
        "L'IVA sugli acquisti è un credito verso l'Erario (IVA ns/credito); quella sulle vendite un debito (IVA ns/debito).",
        "Un'operazione esente non ha IVA: costo e debito per l'importo intero.",
        "L'IVA indetraibile non va in IVA ns/credito: diventa parte del costo.",
    ], None),
    ("C07", "Gli acquisti e i rapporti con i fornitori", [
        "Fattura d'acquisto: costo per natura per l'imponibile, IVA ns/credito, Debiti v/fornitori per il totale.",
        "Il pagamento chiude il debito: nessun nuovo costo.",
        "Nota di credito del fornitore: Debiti in Dare, Resi su acquisti (rettifica del costo) e IVA in Avere; l'acconto pagato prima della consegna è un credito (Fornitori c/anticipi).",
        "Nel gestionale SAP la merce entra prima della fattura (MIGO, conto ponte Fatture da ricevere) e la fattura chiude il ponte (MIRO).",
    ], {"testo": "Fattura d'acquisto merci 5.000 € + IVA 22%.", "righe": [("Merci c/acquisti", "D", 5000), ("IVA ns/credito", "D", 1100), ("Debiti v/fornitori", "A", 6100)]}),
    ("C08", "Le vendite e i rapporti con i clienti", [
        "Fattura di vendita: Crediti v/clienti per il totale, ricavo per l'imponibile, IVA ns/debito per l'imposta.",
        "Nota di credito al cliente: Resi su vendite e IVA in Dare, Crediti in Avere.",
        "L'acconto incassato prima della consegna è un debito (Clienti c/anticipi), non un ricavo.",
    ], {"testo": "Fattura al cliente 8.000 € + IVA 22%.", "righe": [("Crediti v/clienti", "D", 9760), ("Merci c/vendite", "A", 8000), ("IVA ns/debito", "A", 1760)]}),
    ("C09", "Il regolamento: incassi, pagamenti, cassa e banca", [
        "Incasso: Banca in Dare, Crediti in Avere. Pagamento: Debiti in Dare, Banca in Avere. Nessun costo o ricavo nuovo.",
        "Un girofondo tra cassa e banca cambia solo la forma della liquidità; la cassa non può avere saldo avere.",
        "Riconciliazione: le spese addebitate dalla banca e non ancora registrate si registrano; l'insoluto va in Crediti insoluti.",
    ], None),
    ("C10", "La liquidazione e il versamento dell'IVA", [
        "Liquidazione: IVA ns/debito in Dare, IVA ns/credito in Avere, la differenza su Erario c/IVA (Avere se è da versare, Dare se è un credito).",
        "Il versamento F24 chiude Erario c/IVA.",
        "Reverse charge: l'IVA si integra a credito e a debito per lo stesso importo.",
    ], {"testo": "Liquidazione: IVA a debito 1.760, a credito 1.100.", "righe": [("IVA ns/debito", "D", 1760), ("IVA ns/credito", "A", 1100), ("Erario c/IVA", "A", 660)]}),
    ("C11", "Il personale", [
        "Costo del lavoro = lordo + contributi a carico dell'azienda; le trattenute (IRPEF, contributi del dipendente) sono debiti.",
        "Il pagamento del netto chiude il debito verso il dipendente; l'F24 chiude ritenute e contributi.",
        "La quota di TFR dell'anno è un costo e un debito che si paga alla fine del rapporto.",
    ], None),
    ("C12", "I beni strumentali: acquisto e costo", [
        "Un bene che serve per più anni è un'immobilizzazione: il costo comprende trasporto, montaggio e collaudo.",
        "L'ammortamento parte quando il bene è pronto per l'uso; valore netto contabile = costo − fondo.",
        "L'ammortamento è un costo che non fa uscire denaro.",
    ], None),
    ("C13", "Il leasing", [
        "Metodo patrimoniale: il canone è un costo; il bene non si iscrive e non si ammortizza finché non lo riscatti.",
        "Il maxicanone si risconta per la parte che riguarda gli anni futuri; il deposito cauzionale è un credito.",
        "Al riscatto il bene entra nelle immobilizzazioni per il prezzo di riscatto.",
    ], None),
    ("C14", "I finanziamenti bancari: mutuo, anticipo fatture, factoring", [
        "Erogazione del mutuo: Banca in Dare, Mutui passivi in Avere; la rata: quota capitale (riduce il debito) + interessi (costo).",
        "Anticipo su fatture: la banca presta denaro (Banche c/anticipi su fatture), il credito verso il cliente resta.",
        "Interessi e commissioni sono costi finanziari; nel factoring pro soluto il rischio passa al factor se il contratto lo trasferisce davvero.",
    ], None),
    ("C15", "La cessione e la dismissione dei cespiti", [
        "Vendita: il cespite esce al costo storico (Avere), il fondo si chiude (Dare), IVA sul prezzo.",
        "Prezzo > valore netto contabile: plusvalenza; prezzo < valore netto: minusvalenza.",
        "Prima della vendita si ammortizza fino alla data di cessione.",
    ], None),
    ("C16", "Ritenute e imposte durante l'anno", [
        "La parcella si registra come una fattura di servizi; la ritenuta d'acconto si trattiene al pagamento ed è un debito verso l'Erario.",
        "Gli acconti d'imposta versati sono crediti verso l'Erario da compensare con l'imposta dell'anno.",
        "Saldo da pagare = imposta dell'anno − acconti.",
    ], None),
    ("C17", "Il magazzino e la produzione", [
        "Metodo italiano (periodico): gli acquisti vanno a costo; a fine anno si rilevano le rimanenze finali (Merci / Variazione rimanenze).",
        "Chiusura delle scorte: rilevazione, epilogo della variazione nel Conto economico, chiusura di Merci nello Stato patrimoniale finale.",
        "Riapertura: Merci dallo Stato patrimoniale iniziale, poi le rimanenze iniziali tornano a costo (Variazione rimanenze / Merci).",
        "Valore: costo medio ponderato = valore dei carichi ÷ quantità caricate; nei gestionali a magazzino permanente (SAP, Business Central) le scorte sono già a valore: non si rilevano due volte.",
    ], {"testo": "31/12, metodo periodico: inventario delle merci 3.000 €.", "righe": [("Merci", "D", 3000), ("Variazione rimanenze merci", "A", 3000)]}),
    ("C18", "Le scritture di assestamento", [
        "Fatture da ricevere e da emettere: costo o ricavo dell'anno in attesa del documento (con DDT e fattura differita l'IVA delle vendite è di dicembre).",
        "Rateo: quota maturata di un costo o ricavo comune a più esercizi, da pagare o incassare; risconto: parte di un importo già registrato che riguarda l'anno dopo.",
        "Ammortamento, svalutazione dei crediti, TFR e imposte dell'esercizio completano i conti al 31/12.",
    ], {"testo": "31/12: premio annuo 1.200 € pagato il 1/10, 9 mesi sono dell'anno dopo.", "righe": [("Risconti attivi", "D", 900), ("Premi di assicurazione", "A", 900)]}),
    ("C19", "La chiusura dei conti e il bilancio d'esercizio", [
        "Ordine: assestamenti → epilogo dei conti economici nel Conto economico → risultato → chiusura dei patrimoniali nello Stato patrimoniale finale.",
        "Costi in Avere e ricavi in Dare all'epilogo; utile: Conto economico in Dare, Utile d'esercizio in Avere.",
        "Attività in Avere verso lo Stato patrimoniale finale; passività e patrimonio netto in Dare.",
    ], None),
    ("C20", "La riapertura dei conti e la destinazione dell'utile", [
        "Il 1° gennaio si riaprono solo i conti patrimoniali, con il giro opposto alla chiusura (Stato patrimoniale iniziale).",
        "Dopo la riapertura: rimanenze iniziali e risconti tornano a costo; ratei e fatture da ricevere si chiudono al pagamento.",
        "L'assemblea destina l'utile: almeno il 5% a riserva legale, dividendi (debito verso i soci), utili a nuovo; la perdita si copre con le riserve.",
    ], None),
]

# capitolo di default di ogni vecchia unità
DA_UNITA = {"Q01": "C02", "Q02": "C03", "Q03": "C04", "Q04": "C05", "Q05": "C07", "Q06": "C08", "Q07": "C09", "Q08": "C10",
            "Q09": "C11", "Q10": "C14", "Q11": "C13", "Q12": "C14", "Q13": "C12", "Q14": "C15", "Q15": "C17", "Q16": "C18",
            "Q17": "C18", "Q18": "C16", "Q19": "C19", "Q20": "C20"}

# domande che il manuale tratta in un altro capitolo
SPOSTA = {
    # capitolo 1: patrimonio, reddito, competenza, operazioni permutative e modificative
    "Q01-05": "C01", "Q01-08": "C01", "Q04-12": "C01", "Q19-12": "C01", "Q10-11": "C01", "Q07-11": "C01",
    "Q13-11": "C01", "Q20-07": "C01", "Q06-05": "C01", "Q05-08": "C01",
    "Q03-08": "C02",
    "Q20-08": "C04", "Q20-10": "C04", "Q20-11": "C04",
    "Q01-09": "C05",
    "Q05-09": "C06", "Q06-06": "C06", "Q08-12": "C06", "Q08-10": "C06", "Q08-05": "C06",
    "Q03-12": "C12", "Q05-03": "C12",
    "Q13-01": "C18", "Q13-03": "C18", "Q13-08": "C18", "Q18-01": "C18", "Q18-03": "C18", "Q18-04": "C18", "Q18-09": "C18", "Q10-04": "C18",
    "Q04-04": "C20", "Q04-05": "C20", "Q04-06": "C20", "Q04-07": "C20", "Q04-09": "C20", "Q16-09": "C20", "Q10-12": "C20",
}


def blocco_di(qid, unita_storica):
    return SPOSTA.get(qid) or DA_UNITA[unita_storica]
