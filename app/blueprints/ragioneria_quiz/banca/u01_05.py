"""Unità Q01–Q05: fondamenti, piano dei conti, giornale e mastrini, costituzione, acquisti."""
from . import S, T, unita

# ═════════════════════════════════════════════════════════════════════════════
unita("Q01", "Fondamenti e Dare/Avere", [
    "Ogni operazione si registra con almeno due conti: il totale Dare è sempre uguale al totale Avere (partita doppia).",
    "Attività e costi AUMENTANO in Dare e diminuiscono in Avere.",
    "Passività, patrimonio netto e ricavi AUMENTANO in Avere e diminuiscono in Dare.",
    "Costo e pagamento sono cose diverse: il costo nasce con la fattura (competenza), il pagamento riduce solo debito e banca.",
    "Una scrittura che pareggia può essere sbagliata: conti e sezioni devono descrivere ciò che è successo davvero.",
], {"testo": "I soci versano 10.000 € in banca come capitale.", "righe": [("Banca c/c", "D", 10000), ("Capitale sociale", "A", 10000)]})

q = lambda *a, **k: T("Q01", *a, **k)
s = lambda *a, **k: S("Q01", *a, **k)

q("Q01-01", 1, "In quale sezione AUMENTA un conto di attività come «Banca c/c»?",
  "In Dare",
  [("In Avere", "In Avere un conto di attività diminuisce: è il caso di un pagamento."),
   ("Indifferentemente in Dare o in Avere", "La sezione non è una scelta libera: decide il segno della variazione."),
   ("Solo a fine anno, nel bilancio", "Le variazioni si registrano quando avviene l'operazione, non a fine anno.")],
  "Le attività (banca, cassa, crediti, beni) aumentano in Dare e diminuiscono in Avere.")
q("Q01-02", 1, "In quale sezione AUMENTA un debito, ad esempio «Debiti v/fornitori»?",
  "In Avere",
  [("In Dare", "In Dare il debito diminuisce: succede quando lo paghi."),
   ("In Dare se il fornitore è italiano, in Avere se è estero", "La nazionalità della controparte non cambia le regole della partita doppia."),
   ("Mai: i debiti si scrivono solo nel bilancio", "I debiti si registrano nel giornale quando nascono e quando si estinguono.")],
  "Passività e patrimonio netto aumentano in Avere e diminuiscono in Dare.")
q("Q01-03", 1, "Un costo (es. «Energia elettrica») si registra normalmente in…",
  "Dare",
  [("Avere", "In Avere un costo si registra solo quando lo si rettifica o lo si chiude a fine anno."),
   ("Dare per l'imponibile e Avere per l'IVA", "L'IVA ha un conto suo (IVA ns/credito): non è una sezione del costo."),
   ("Avere, perché esce denaro", "L'uscita di denaro riguarda la banca (Avere), non il costo.")],
  "I costi sono componenti negativi del reddito: si registrano in Dare.")
q("Q01-04", 1, "Un ricavo (es. «Merci c/vendite») si registra normalmente in…",
  "Avere",
  [("Dare", "In Dare un ricavo si registra solo per stornarlo o chiuderlo a fine anno."),
   ("Dare, perché entra denaro", "L'entrata di denaro riguarda la banca o il credito, non il ricavo."),
   ("Avere solo quando il cliente paga", "Il ricavo nasce con la vendita (fattura), anche se il cliente paga dopo.")],
  "I ricavi sono componenti positivi del reddito: si registrano in Avere.")
q("Q01-05", 2, "Paghi con bonifico una fattura fornitore già registrata. Che cosa succede?",
  "Diminuiscono il debito verso il fornitore e la banca: nessun nuovo costo",
  [("Nasce un nuovo costo pari al bonifico", "Il costo era già nato con la fattura: registrarlo di nuovo lo raddoppierebbe."),
   ("Aumentano i ricavi", "Pagare non produce ricavi."),
   ("Aumentano le rimanenze", "Le rimanenze dipendono dalle merci in giacenza, non dai pagamenti.")],
  "Il pagamento è un fatto finanziario: Debiti v/fornitori in Dare (si riduce), Banca c/c in Avere (si riduce).",
  origine="M03")
q("Q01-06", 2, "Una scrittura ha Dare 1.220 e Avere 1.220. Si può dire che è sicuramente corretta?",
  "No: il pareggio è necessario ma non basta, conti e sezioni devono essere giusti",
  [("Sì: se pareggia è corretta", "Anche invertendo tutte le sezioni o sbagliando conto la scrittura pareggia."),
   ("Sì, purché ci sia l'IVA", "La presenza dell'IVA non dice nulla sulla correttezza degli altri conti."),
   ("No: una scrittura corretta non pareggia mai", "Ogni scrittura corretta in partita doppia pareggia.")],
  "Il pareggio controlla solo l'aritmetica. La correttezza dipende da conto, sezione e importo di ogni riga.")
q("Q01-07", 2, "Quali di questi conti aumentano in Avere? (seleziona tutte le risposte corrette)",
  ["Capitale sociale", "Debiti v/fornitori", "Merci c/vendite"],
  [("Crediti v/clienti", "È un'attività: aumenta in Dare."),
   ("Salari e stipendi", "È un costo: aumenta in Dare.")],
  "Aumentano in Avere: patrimonio netto (Capitale sociale), passività (Debiti) e ricavi (Merci c/vendite).", multi=True)
q("Q01-08", 2, "Che differenza c'è tra «credito» e «ricavo»?",
  "Il ricavo misura la vendita nel conto economico; il credito è il diritto a incassare, nello stato patrimoniale",
  [("Sono sinonimi", "Una vendita pagata subito ha il ricavo ma nessun credito: non sono la stessa cosa."),
   ("Il credito è un costo", "Il credito è un'attività, non un costo."),
   ("Il ricavo nasce solo quando si incassa il credito", "Il ricavo nasce con la vendita; l'incasso estingue il credito.")],
  "Non usare la scorciatoia «credito = ricavo»: un fatto economico (ricavo) e uno finanziario (credito) possono nascere insieme ma restano diversi.")
s("Q01-09", 1, "I soci versano in banca 10.000 € di capitale sociale (sottoscrizione e versamento contestuali).",
  [("Banca c/c", "D", 10000), ("Capitale sociale", "A", 10000)],
  [([("Banca c/c", "D", 10000), ("Merci c/vendite", "A", 10000)], "Il capitale non è un ricavo: è un apporto dei soci, va nel patrimonio netto."),
   ([("Cassa", "D", 10000), ("Capitale sociale", "A", 10000)], "Il versamento è avvenuto in banca, non in contanti: il conto movimentato è Banca c/c.")],
  "Entra liquidità (Banca in Dare) e aumenta il patrimonio netto (Capitale sociale in Avere).", origine="M01")
s("Q01-10", 1, "Prelevi 500 € dalla banca per il fondo cassa dell'ufficio.",
  [("Cassa", "D", 500), ("Banca c/c", "A", 500)],
  [([("Cassa", "D", 500), ("Oneri bancari", "A", 500)], "Il prelievo non è un onere bancario: è uno spostamento di denaro tra due conti di liquidità."),
   ([("Oneri bancari", "D", 500), ("Banca c/c", "A", 500)], "Nessun costo: il denaro resta all'azienda, cambia solo «contenitore».")],
  "È un girofondo: aumenta la Cassa (Dare), diminuisce la Banca (Avere). Nessun costo, nessun ricavo.", origine="M17")
s("Q01-11", 2, "La banca addebita 30 € di spese di tenuta conto.",
  [("Oneri bancari", "D", 30), ("Banca c/c", "A", 30)],
  [([("Interessi passivi su mutui", "D", 30), ("Banca c/c", "A", 30)], "Non c'è nessun mutuo: le spese di tenuta conto sono oneri bancari."),
   ([("Oneri bancari", "D", 30), ("Debiti v/fornitori", "A", 30)], "La banca addebita direttamente sul conto: si riduce Banca c/c, non nasce un debito verso fornitori.")],
  "Costo in Dare (Oneri bancari), riduzione della banca in Avere.", origine="M11")
s("Q01-12", 2, "Acquisti carta e penne per 50 € pagando in contanti (ipotesi del caso: scontrino senza IVA detraibile).",
  [("Cancelleria", "D", 50), ("Cassa", "A", 50)],
  [([("Merci c/acquisti", "D", 50), ("Cassa", "A", 50)], "Le «merci» sono beni da rivendere: la cancelleria usata in ufficio ha un conto suo."),
   ([("Cancelleria", "D", 50), ("Banca c/c", "A", 50)], "Hai pagato in contanti: diminuisce la Cassa, non la Banca.")],
  "Costo di consumo (Cancelleria) in Dare, uscita di contanti in Avere.", origine="M20")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q02", "Piano dei conti", [
    "Il piano dei conti è l'elenco ordinato dei conti che l'azienda usa: patrimoniali (attività, passività, patrimonio netto) ed economici (costi, ricavi).",
    "I conti patrimoniali restano aperti da un anno all'altro; i conti economici si chiudono a fine anno nel Conto economico.",
    "Esistono conti di rettifica: i fondi ammortamento e il fondo svalutazione crediti riducono il valore di un'attività senza toccarla direttamente.",
    "Scegli sempre il conto più preciso: utenze, assicurazioni, consulenze e cancelleria NON sono «merci c/acquisti».",
    "Clienti e fornitori hanno un conto generale (Crediti v/clienti, Debiti v/fornitori) e un partitario per ciascuno.",
])
q = lambda *a, **k: T("Q02", *a, **k)
s = lambda *a, **k: S("Q02", *a, **k)

q("Q02-01", 1, "«Crediti v/clienti» è un conto…",
  "patrimoniale di attività",
  [("economico di ricavo", "Il ricavo è «Merci c/vendite»; il credito è un diritto di incasso, cioè un'attività."),
   ("patrimoniale di passività", "Le passività sono debiti dell'azienda; qui è il cliente che deve pagare."),
   ("di patrimonio netto", "Il patrimonio netto riguarda i mezzi propri dei soci.")],
  "Il credito è un'attività dello stato patrimoniale.")
q("Q02-02", 1, "«Salari e stipendi» è un conto…",
  "economico di costo",
  [("patrimoniale di passività", "Il debito verso i dipendenti è «Personale c/retribuzioni»; «Salari e stipendi» misura il costo."),
   ("economico di ricavo", "Pagare il personale non genera ricavi."),
   ("di rettifica dell'attivo", "I conti di rettifica sono i fondi (ammortamento, svalutazione).")],
  "Il costo del lavoro va nel conto economico.")
q("Q02-03", 2, "A che cosa serve «F.do amm. impianti e macchinari»?",
  "Ridurre indirettamente il valore del macchinario, accumulando le quote di ammortamento",
  [("È un debito verso la banca per l'acquisto del macchinario", "Il fondo ammortamento non è un debito: non va restituito a nessuno."),
   ("È un deposito di denaro per ricomprare il macchinario", "Il fondo non è liquidità: è una rettifica contabile del valore."),
   ("È un costo dell'esercizio", "Il costo dell'anno è «Ammortamento impianti e macchinari»; il fondo ne accumula le quote.")],
  "Il valore netto del cespite = costo storico − fondo ammortamento.")
q("Q02-04", 2, "Quali conti si chiudono nel «Conto economico» a fine esercizio? (seleziona tutte le risposte corrette)",
  ["Merci c/vendite", "Fitti passivi", "Ammortamento impianti e macchinari"],
  [("Banca c/c", "È patrimoniale: passa allo stato patrimoniale finale e si riapre l'anno dopo."),
   ("Debiti v/fornitori", "È patrimoniale: il debito resta da pagare anche l'anno dopo.")],
  "Si chiudono nel Conto economico solo i conti di costo e di ricavo.", multi=True)
q("Q02-05", 2, "Ricevi la bolletta della luce dell'ufficio. Quale conto di costo è il più appropriato?",
  "Energia elettrica",
  [("Merci c/acquisti", "La luce non è un bene da rivendere: usare «merci» falsa il costo del venduto."),
   ("Materie prime c/acquisti", "Le materie prime entrano nel prodotto; l'energia dell'ufficio no."),
   ("Oneri bancari", "Riguarda la banca, non il fornitore di energia.")],
  "Il conto deve descrivere la natura del costo: utenze → Energia elettrica.", origine="M16")
q("Q02-06", 2, "La banca accredita 200 € di interessi sul conto. Quale conto di ricavo usi?",
  "Interessi attivi bancari",
  [("Merci c/vendite", "Non è una vendita di merci: è un provento finanziario."),
   ("Ribassi e abbuoni attivi", "Gli abbuoni riguardano riduzioni di prezzo sugli acquisti."),
   ("Plusvalenze", "Le plusvalenze nascono dalla vendita di un cespite a più del suo valore netto.")],
  "Proventi finanziari → Interessi attivi bancari.", origine="M37")
q("Q02-07", 3, "Perché un conto analitico per ogni cliente (partitario) oltre al conto generale «Crediti v/clienti»?",
  "Per sapere quanto deve ciascun cliente; la somma dei partitari è uguale al saldo del conto generale",
  [("Per pagare meno IVA", "I partitari non cambiano l'IVA dovuta."),
   ("Perché il conto generale non entra nel bilancio", "Il conto generale entra nel bilancio; i partitari ne mostrano il dettaglio."),
   ("Per registrare due volte i ricavi", "Ogni fattura si registra una sola volta: il partitario è un dettaglio, non un doppione.")],
  "Il partitario permette di gestire scadenze, solleciti e residui cliente per cliente.")
q("Q02-08", 1, "«Utile d'esercizio» appartiene al…",
  "patrimonio netto",
  [("conto economico come ricavo", "L'utile è il saldo del conto economico, ma si iscrive nel patrimonio netto."),
   ("passivo come debito verso i soci", "Diventa debito solo se l'assemblea delibera di distribuirlo come dividendo."),
   ("attivo come liquidità", "L'utile non è denaro in banca: può esserci utile anche con la banca vuota.")],
  "L'utile aumenta i mezzi propri dell'impresa: patrimonio netto.")
q("Q02-09", 2, "Quale conto è di rettifica dei crediti?",
  "Fondo svalutazione crediti",
  [("Perdite su crediti", "È un costo che si rileva quando un credito diventa definitivamente inesigibile."),
   ("Crediti insoluti", "È un'attività: il credito scaduto e non pagato, ancora da recuperare."),
   ("Svalutazione crediti", "È il costo dell'accantonamento; il fondo è la rettifica che si accumula.")],
  "Il fondo svalutazione riduce il valore dei crediti a quello che si stima di incassare.")
q("Q02-10", 3, "Perché «Resi su vendite» non è un costo vero e proprio?",
  "Perché rettifica in diminuzione i ricavi di vendita già registrati",
  [("Perché è un debito verso il cliente", "Il debito verso il cliente (o la riduzione del credito) è un'altra riga della scrittura."),
   ("Perché è un'attività di magazzino", "Le merci rientrate incidono sulle rimanenze, non sul conto dei resi."),
   ("Perché si registra solo nel bilancio", "Il reso si registra con la nota di credito, quando avviene.")],
  "Resi su vendite riduce i ricavi: nel conto economico va a sottrarsi alle vendite.")
s("Q02-11", 2, "Paghi con bonifico il premio annuo di assicurazione dell'automezzo: 1.200 € (operazione esente IVA).",
  [("Premi di assicurazione", "D", 1200), ("Banca c/c", "A", 1200)],
  [([("Merci c/acquisti", "D", 1200), ("Banca c/c", "A", 1200)], "Un'assicurazione non è una merce: ha un conto di costo dedicato."),
   ([("Premi di assicurazione", "D", 983.61), ("IVA ns/credito", "D", 216.39), ("Banca c/c", "A", 1200)], "Le assicurazioni sono esenti IVA: non c'è IVA da scorporare.")],
  "Costo specifico in Dare, banca in Avere, nessuna IVA.", origine="M19")
s("Q02-12", 2, "Ricevi la fattura della luce: imponibile 200 € + IVA 22% = 244 €, da pagare.",
  [("Energia elettrica", "D", 200), ("IVA ns/credito", "D", 44), ("Debiti v/fornitori", "A", 244)],
  [([("Merci c/acquisti", "D", 200), ("IVA ns/credito", "D", 44), ("Debiti v/fornitori", "A", 244)], "Conto improprio: la luce non è una merce da rivendere."),
   ([("Energia elettrica", "D", 244), ("Debiti v/fornitori", "A", 244)], "L'IVA detraibile non è un costo: va in IVA ns/credito.")],
  "Costo per natura + IVA a credito in Dare; debito verso il fornitore per il totale in Avere.", origine="M16")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q03", "Giornale, mastrini e partitari", [
    "Il libro giornale registra le operazioni in ordine di data: ogni articolo ha data, descrizione, conti, Dare e Avere.",
    "Il mastrino raccoglie tutti i movimenti di UN conto: il saldo è la differenza tra totale Dare e totale Avere.",
    "Saldo «dare» = Dare > Avere (tipico di attività e costi); saldo «avere» = Avere > Dare (passività, PN, ricavi).",
    "Il partitario cliente/fornitore mostra fatture, incassi/pagamenti e residuo aperto di ciascuna controparte.",
    "Un incasso parziale chiude solo una parte della fattura: il residuo resta aperto.",
])
q = lambda *a, **k: T("Q03", *a, **k)
s = lambda *a, **k: S("Q03", *a, **k)

q("Q03-01", 1, "Che cosa contiene il libro giornale?",
  "Tutte le scritture in ordine cronologico, con data, descrizione, conti, Dare e Avere",
  [("Solo il saldo finale di ogni conto", "I saldi sono nei mastrini e nel bilancio di verifica."),
   ("Solo le fatture di vendita", "Il giornale contiene tutte le operazioni: acquisti, vendite, pagamenti, rettifiche."),
   ("L'elenco dei clienti e fornitori", "Quella è l'anagrafica; i movimenti per controparte sono nei partitari.")],
  "Il giornale è la registrazione cronologica; i mastrini sono la registrazione per conto.")
q("Q03-02", 2, "Mastrino Banca c/c: Dare 10.000 + 9.760; Avere 6.100 + 3.000. Qual è il saldo?",
  "10.660 dare",
  [("10.660 avere", "Il totale Dare (19.760) è maggiore dell'Avere (9.100): il saldo è dare."),
   ("28.860 dare", "Hai sommato Dare e Avere invece di fare la differenza."),
   ("19.760 dare", "Hai considerato solo il Dare, dimenticando le uscite in Avere.")],
  "Saldo = 19.760 − 9.100 = 10.660 in Dare: la banca ha disponibilità per 10.660 €.", area="applicazione")
q("Q03-03", 2, "Partitario cliente Rossi: fattura 1.220 €; incasso 700 €. Quanto resta aperto e in quale sezione?",
  "520 € in Dare (il cliente deve ancora pagare)",
  [("520 € in Avere", "In Avere il saldo indicherebbe che sei tu a dovere qualcosa al cliente."),
   ("1.220 € in Dare", "Hai dimenticato l'incasso di 700 € che riduce il credito."),
   ("700 € in Dare", "700 è l'incasso, non il residuo.")],
  "Credito 1.220 − incasso 700 = residuo 520 a saldo dare.", area="applicazione")
q("Q03-04", 2, "Il conto «Debiti v/fornitori» a fine mese ha saldo avere 3.050 €. Che cosa significa?",
  "L'azienda deve ancora pagare 3.050 € ai fornitori",
  [("I fornitori devono 3.050 € all'azienda", "Un saldo avere su un conto di debito indica un debito ancora aperto."),
   ("L'azienda ha speso 3.050 € in costi", "Il debito non coincide con il costo: parte dei costi può essere già pagata."),
   ("C'è un errore: un debito non può avere saldo avere", "È il saldo normale di un debito.")],
  "Passività: saldo avere = debito residuo.")
q("Q03-05", 2, "Il mastrino «Crediti v/clienti» ha saldo AVERE. Che cosa devi sospettare per prima cosa?",
  "Un incasso registrato due volte o un anticipo del cliente registrato nel conto sbagliato",
  [("Nulla: è il saldo normale dei crediti", "I crediti hanno normalmente saldo dare."),
   ("Che le vendite siano aumentate", "Le vendite si leggono in Merci c/vendite, non nel segno dei crediti."),
   ("Che la banca abbia sbagliato l'estratto conto", "Prima si controllano le proprie registrazioni.")],
  "Un saldo «anomalo» è un campanello d'allarme: controlla incassi doppi, anticipi e note di credito.")
q("Q03-06", 3, "Che cos'è il bilancio di verifica?",
  "L'elenco dei saldi di tutti i conti: il totale dei saldi dare deve uguagliare quello dei saldi avere",
  [("Il bilancio da depositare al registro imprese", "Quello è il bilancio d'esercizio, preparato dopo assestamenti e chiusure."),
   ("Il controllo della banca sul conto corrente", "La riconciliazione bancaria è un'altra cosa."),
   ("La somma di tutte le fatture dell'anno", "Il bilancio di verifica usa i saldi dei conti, non le fatture.")],
  "Il bilancio di verifica controlla il pareggio complessivo prima delle scritture di chiusura.")
q("Q03-07", 2, "Fornitore Delta: fattura 2.440 €, pagamento 1.000 €, nota di credito 244 €. Debito residuo?",
  "1.196 €",
  [("1.440 €", "Hai dimenticato la nota di credito che riduce ulteriormente il debito."),
   ("2.196 €", "Hai dimenticato il pagamento di 1.000 €."),
   ("3.684 €", "La nota di credito e il pagamento riducono il debito: non si sommano.")],
  "2.440 − 1.000 − 244 = 1.196 € ancora da pagare.", area="applicazione")
q("Q03-08", 1, "In un mastrino, quale colonna aumenta per un conto di costo?",
  "Dare",
  [("Avere", "In Avere un costo si riduce (storno, rettifica, chiusura)."),
   ("Nessuna: i costi non hanno mastrino", "Ogni conto del piano ha il suo mastrino."),
   ("Saldo", "Il saldo è il risultato delle due colonne, non una sezione di registrazione.")],
  "Costi: movimenti in Dare, saldo dare.")
s("Q03-09", 2, "Il cliente Rossi paga con bonifico 700 € in acconto sulla fattura di 1.220 € già registrata.",
  [("Banca c/c", "D", 700), ("Crediti v/clienti", "A", 700)],
  [([("Banca c/c", "D", 700), ("Merci c/vendite", "A", 700)], "Il ricavo era già nato con la fattura: l'incasso estingue (in parte) il credito."),
   ([("Banca c/c", "D", 1220), ("Crediti v/clienti", "A", 1220)], "L'incasso è parziale: si registra solo quanto entra davvero, 700 €.")],
  "Entra denaro (Banca Dare 700), diminuisce il credito (Avere 700). Residuo aperto 520.")
s("Q03-10", 2, "Il cliente Beta paga con bonifico l'intera fattura di 9.760 € già registrata.",
  [("Banca c/c", "D", 9760), ("Crediti v/clienti", "A", 9760)],
  [([("Banca c/c", "D", 8000), ("IVA ns/debito", "D", 1760), ("Crediti v/clienti", "A", 9760)], "L'IVA a debito non si tocca all'incasso: si chiude solo con la liquidazione."),
   ([("Cassa", "D", 9760), ("Crediti v/clienti", "A", 9760)], "Il pagamento è avvenuto con bonifico: si muove la Banca, non la Cassa.")],
  "Incasso: Banca in Dare, Crediti v/clienti in Avere per il totale fattura.", origine="M06")
s("Q03-11", 3, "Ti accorgi che un incasso di 500 € dal cliente Neri è stato registrato due volte. Come lo correggi?",
  [("Crediti v/clienti", "D", 500), ("Banca c/c", "A", 500)],
  [([("Banca c/c", "D", 500), ("Crediti v/clienti", "A", 500)], "Così registri un terzo incasso: l'errore raddoppia invece di sparire."),
   ([("Perdite su crediti", "D", 500), ("Banca c/c", "A", 500)], "Non c'è nessuna perdita: è solo una registrazione doppia da stornare.")],
  "Lo storno è la scrittura opposta a quella sbagliata: ripristina credito e banca.")
s("Q03-12", 2, "Compri una scrivania per l'ufficio: 800 € + IVA 22% = 976 €, da pagare a 30 giorni.",
  [("Arredamento", "D", 800), ("IVA ns/credito", "D", 176), ("Debiti v/fornitori", "A", 976)],
  [([("Cancelleria", "D", 800), ("IVA ns/credito", "D", 176), ("Debiti v/fornitori", "A", 976)], "La scrivania dura più anni: è un cespite (Arredamento), non materiale di consumo."),
   ([("Arredamento", "D", 976), ("Debiti v/fornitori", "A", 976)], "L'IVA detraibile va in IVA ns/credito, non nel costo del bene.")],
  "Bene durevole → immobilizzazione; IVA a credito; debito verso fornitore.", origine="M04")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q04", "Costituzione e patrimonio netto", [
    "Alla costituzione i soci SOTTOSCRIVONO il capitale (si impegnano) e poi lo VERSANO: Soci c/sottoscrizione → Banca.",
    "Il capitale sociale è patrimonio netto: aumenta in Avere. Non è un ricavo e non è un debito.",
    "L'utile approvato si destina con delibera: prima la riserva legale (5% dell'utile, finché la riserva arriva a un quinto del capitale), poi dividendi o utili a nuovo.",
    "La riserva legale NON si distribuisce ai soci e non passa automaticamente nel capitale.",
    "La perdita si copre con riserve disponibili (es. utili portati a nuovo) per delibera dell'assemblea.",
], {"testo": "Sottoscrizione del capitale 10.000 €.", "righe": [("Soci c/sottoscrizione", "D", 10000), ("Capitale sociale", "A", 10000)]})
q = lambda *a, **k: T("Q04", *a, **k)
s = lambda *a, **k: S("Q04", *a, **k)

s("Q04-01", 1, "Atto costitutivo: i soci sottoscrivono 10.000 € di capitale sociale (non ancora versato).",
  [("Soci c/sottoscrizione", "D", 10000), ("Capitale sociale", "A", 10000)],
  [([("Banca c/c", "D", 10000), ("Capitale sociale", "A", 10000)], "Il denaro non è ancora entrato: oggi c'è solo l'impegno dei soci (credito verso soci)."),
   ([("Soci c/sottoscrizione", "D", 10000), ("Debiti v/soci per dividendi", "A", 10000)], "Il capitale è patrimonio netto, non un debito verso i soci.")],
  "Nasce un credito verso i soci (Dare) e il capitale sociale (Avere).")
s("Q04-02", 1, "I soci versano in banca i 10.000 € sottoscritti.",
  [("Banca c/c", "D", 10000), ("Soci c/sottoscrizione", "A", 10000)],
  [([("Banca c/c", "D", 10000), ("Capitale sociale", "A", 10000)], "Il capitale era già stato registrato alla sottoscrizione: così lo raddoppi."),
   ([("Banca c/c", "D", 10000), ("Merci c/vendite", "A", 10000)], "Il versamento dei soci non è una vendita.")],
  "Entra il denaro e si chiude il credito verso i soci.", origine="M01")
q("Q04-03", 1, "Il capitale sociale è…",
  "una voce del patrimonio netto: i mezzi apportati dai soci",
  [("un ricavo dell'esercizio", "Non nasce da vendite o prestazioni: non entra nel conto economico."),
   ("un debito da restituire ai soci a fine anno", "Il capitale resta vincolato nella società; non è un prestito."),
   ("il denaro presente in banca", "Il denaro può essere stato speso; il capitale resta come fonte di finanziamento.")],
  "Capitale sociale = fonte propria di finanziamento, nel patrimonio netto.")
q("Q04-04", 2, "Utile d'esercizio 10.000 €, capitale 50.000 €, riserva legale 0. Quanto va almeno a riserva legale?",
  "500 € (5% dell'utile)",
  [("2.000 € (20% dell'utile)", "Il 20% è il limite che la riserva deve raggiungere rispetto al capitale, non la quota annua."),
   ("10.000 € (tutto l'utile)", "Basta il 5%: il resto è a disposizione dell'assemblea."),
   ("Niente: la riserva legale è facoltativa", "Per le società di capitali l'accantonamento del 5% è obbligatorio (art. 2430 c.c.).")],
  "Almeno il 5% dell'utile, finché la riserva raggiunge un quinto del capitale.", area="applicazione")
s("Q04-05", 3, "L'assemblea approva l'utile di 10.000 €: 500 € a riserva legale, 6.000 € di dividendi (da pagare), 3.500 € portati a nuovo. Ipotesi: nessuna ritenuta.",
  [("Utile d'esercizio", "D", 10000), ("Riserva legale", "A", 500), ("Debiti v/soci per dividendi", "A", 6000), ("Utili portati a nuovo", "A", 3500)],
  [([("Utile d'esercizio", "D", 10000), ("Riserva legale", "A", 500), ("Banca c/c", "A", 6000), ("Utili portati a nuovo", "A", 3500)], "La delibera non è il pagamento: oggi nasce il debito verso i soci, il bonifico arriverà dopo."),
   ([("Riserva legale", "D", 6000), ("Debiti v/soci per dividendi", "A", 6000), ("Utile d'esercizio", "D", 4000), ("Utili portati a nuovo", "A", 4000)], "La riserva legale non si distribuisce ai soci: i dividendi vengono dall'utile."),
   ([("Utile d'esercizio", "D", 10000), ("Merci c/vendite", "A", 10000)], "L'utile non torna nel conto economico: si destina con conti di patrimonio netto e di debito.")],
  "Si chiude l'utile (Dare) e si iscrivono riserva, debito per dividendi e utili a nuovo (Avere).", origine="M44")
s("Q04-06", 2, "Paghi con bonifico i 6.000 € di dividendi deliberati.",
  [("Debiti v/soci per dividendi", "D", 6000), ("Banca c/c", "A", 6000)],
  [([("Utile d'esercizio", "D", 6000), ("Banca c/c", "A", 6000)], "L'utile era già stato chiuso alla delibera: ora si estingue il debito."),
   ([("Salari e stipendi", "D", 6000), ("Banca c/c", "A", 6000)], "I dividendi remunerano il capitale, non il lavoro: non sono un costo.")],
  "Si estingue il debito verso i soci e si riduce la banca.", origine="M54")
s("Q04-07", 3, "L'assemblea copre la perdita d'esercizio di 2.000 € utilizzando gli utili portati a nuovo.",
  [("Utili portati a nuovo", "D", 2000), ("Perdita d'esercizio", "A", 2000)],
  [([("Riserva legale", "D", 2000), ("Perdita d'esercizio", "A", 2000)], "La riserva legale si usa solo dopo le riserve disponibili; qui l'assemblea ha scelto gli utili a nuovo."),
   ([("Perdita d'esercizio", "D", 2000), ("Utili portati a nuovo", "A", 2000)], "Così aumenti la perdita invece di coprirla.")],
  "La perdita (saldo dare) si chiude in Avere; la riserva usata diminuisce in Dare.", origine="M55")
q("Q04-08", 2, "Un socio versa 5.000 € come FINANZIAMENTO fruttifero da restituire. Dove si iscrive?",
  "Tra i debiti (finanziamento soci), non nel capitale",
  [("Nel capitale sociale", "Un prestito da restituire non è capitale: il capitale cambia solo con delibera."),
   ("Tra i ricavi", "Ricevere un prestito non è un ricavo."),
   ("Nella riserva legale", "La riserva legale si forma solo con gli utili.")],
  "Finanziamento dei soci = debito; versamento in conto capitale o aumento di capitale = patrimonio netto.")
q("Q04-09", 2, "Che cosa NON si può fare con la riserva legale?",
  "Distribuirla ai soci come dividendo",
  [("Usarla per coprire perdite", "Si può usare per coprire perdite, dopo le altre riserve."),
   ("Lasciarla nel patrimonio netto", "È proprio la sua destinazione normale."),
   ("Incrementarla con il 5% dell'utile", "È così che si forma.")],
  "La riserva legale è indisponibile per la distribuzione: protegge i creditori.", origine="M44")
s("Q04-10", 2, "L'assemblea delibera un aumento di capitale di 15.000 €, sottoscritto e versato subito in banca.",
  [("Banca c/c", "D", 15000), ("Capitale sociale", "A", 15000)],
  [([("Banca c/c", "D", 15000), ("Riserva legale", "A", 15000)], "La riserva legale si forma con gli utili, non con nuovi versamenti."),
   ([("Banca c/c", "D", 15000), ("Mutui passivi", "A", 15000)], "Un aumento di capitale non è un prestito bancario.")],
  "Entra liquidità e aumenta il capitale.", origine="M56")
q("Q04-11", 3, "La riserva legale di 3.100 € può essere girata «automaticamente» a capitale sociale a fine anno?",
  "No: serve una delibera di aumento gratuito del capitale, non è un'operazione automatica",
  [("Sì, sempre a fine anno", "Non esiste un travaso automatico: il capitale cambia solo con delibera dell'assemblea straordinaria."),
   ("Sì, ma solo se c'è utile", "L'utile non c'entra: è sempre necessaria la delibera."),
   ("No, perché la riserva legale è un debito", "La riserva legale è patrimonio netto, non un debito.")],
  "Riserve e capitale sono voci diverse del patrimonio netto: si passano solo per delibera.", origine="M30")
q("Q04-12", 1, "Il patrimonio netto è…",
  "la differenza tra attività e passività",
  [("la somma di attività e passività", "Si sottrae, non si somma."),
   ("il saldo della banca", "La banca è solo una delle attività."),
   ("il totale dei ricavi", "I ricavi sono nel conto economico.")],
  "Attività − Passività = Patrimonio netto (capitale, riserve, utile).")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q05", "Acquisti e fornitori", [
    "Fattura di acquisto: costo per natura (Dare) + IVA ns/credito (Dare) = Debiti v/fornitori (Avere) per il totale.",
    "Un bene che dura più anni (macchinario, mobile, automezzo) è un CESPITE: va nelle immobilizzazioni, non tra i costi.",
    "Reso o nota di credito del fornitore: si riduce il debito (Dare) e si rettificano costo e IVA (Avere).",
    "Acconto al fornitore con fattura d'acconto: Fornitori c/anticipi + IVA in Dare; poi si compensa con la fattura finale.",
    "Abbuono ottenuto dopo la fattura: Ribassi e abbuoni attivi in Avere.",
], {"testo": "Fattura merci 5.000 € + IVA 22%.", "righe": [("Merci c/acquisti", "D", 5000), ("IVA ns/credito", "D", 1100), ("Debiti v/fornitori", "A", 6100)]})
q = lambda *a, **k: T("Q05", *a, **k)
s = lambda *a, **k: S("Q05", *a, **k)

s("Q05-01", 1, "Ricevi la fattura del fornitore Global Tech per merci: imponibile 5.000 € + IVA 22% = 6.100 €.",
  [("Merci c/acquisti", "D", 5000), ("IVA ns/credito", "D", 1100), ("Debiti v/fornitori", "A", 6100)],
  [([("Merci c/acquisti", "D", 6100), ("Debiti v/fornitori", "A", 6100)], "L'IVA detraibile non è un costo: va separata in IVA ns/credito."),
   ([("Merci c/acquisti", "D", 5000), ("IVA ns/debito", "D", 1100), ("Debiti v/fornitori", "A", 6100)], "Sugli acquisti l'IVA è a credito; l'IVA a debito riguarda le vendite.")],
  "Costo + IVA a credito in Dare, debito verso fornitore in Avere.", origine="M02")
s("Q05-02", 1, "Paghi con bonifico la fattura Global Tech di 6.100 €.",
  [("Debiti v/fornitori", "D", 6100), ("Banca c/c", "A", 6100)],
  [([("Merci c/acquisti", "D", 6100), ("Banca c/c", "A", 6100)], "Il costo è già stato registrato con la fattura: il pagamento estingue il debito."),
   ([("Debiti v/fornitori", "D", 5000), ("IVA ns/credito", "A", 1100), ("Banca c/c", "A", 3900)], "L'IVA non si storna al pagamento e la banca esce per l'intero importo pagato.")],
  "Si chiude il debito e diminuisce la banca.", origine="M03")
s("Q05-03", 2, "Acquisti un macchinario per il reparto: 2.000 € + IVA 22% = 2.440 €, da pagare.",
  [("Impianti e macchinari", "D", 2000), ("IVA ns/credito", "D", 440), ("Debiti v/fornitori", "A", 2440)],
  [([("Merci c/acquisti", "D", 2000), ("IVA ns/credito", "D", 440), ("Debiti v/fornitori", "A", 2440)], "Il macchinario non si rivende: è un cespite che si ammortizza in più anni."),
   ([("Impianti e macchinari", "D", 2000), ("IVA ns/credito", "D", 440), ("Banca c/c", "A", 2440)], "La fattura è da pagare: nasce un debito, la banca non si muove ancora.")],
  "Immobilizzazione in Dare; il costo arriverà anno per anno con l'ammortamento.", origine="M04")
s("Q05-04", 2, "Restituisci merce difettosa a Global Tech, che emette nota di credito di 500 € + IVA 22% = 610 €.",
  [("Debiti v/fornitori", "D", 610), ("Resi su acquisti", "A", 500), ("IVA ns/credito", "A", 110)],
  [([("Debiti v/fornitori", "D", 610), ("Resi su acquisti", "A", 610)], "Anche l'IVA va rettificata: hai meno IVA da detrarre."),
   ([("Resi su acquisti", "D", 500), ("IVA ns/credito", "D", 110), ("Debiti v/fornitori", "A", 610)], "Sezioni invertite: la nota di credito riduce il debito, non lo aumenta.")],
  "Il debito diminuisce (Dare); si rettificano acquisti (Resi su acquisti) e IVA a credito (Avere).", origine="M07")
s("Q05-05", 3, "Paghi a FOR002 un acconto di 1.000 € + IVA 22% (fattura d'acconto ricevuta) prima della consegna della merce.",
  [("Fornitori c/anticipi", "D", 1000), ("IVA ns/credito", "D", 220), ("Banca c/c", "A", 1220)],
  [([("Merci c/acquisti", "D", 1000), ("IVA ns/credito", "D", 220), ("Banca c/c", "A", 1220)], "La merce non è ancora arrivata: oggi nasce un credito verso il fornitore (anticipo), non il costo."),
   ([("Fornitori c/anticipi", "D", 1220), ("Banca c/c", "A", 1220)], "Con fattura d'acconto l'IVA è detraibile: va separata.")],
  "Il pagamento anticipato è un credito transitorio; l'IVA segue la fattura d'acconto.", origine="M57")
s("Q05-06", 3, "Arriva la fattura finale di FOR002: merce 3.000 € + IVA 660 €, dedotto l'acconto di 1.000 € + 220 € già fatturato. Residuo da pagare 2.440 €.",
  [("Merci c/acquisti", "D", 3000), ("IVA ns/credito", "D", 440), ("Fornitori c/anticipi", "A", 1000), ("Debiti v/fornitori", "A", 2440)],
  [([("Merci c/acquisti", "D", 3000), ("IVA ns/credito", "D", 660), ("Debiti v/fornitori", "A", 3660)], "L'acconto non sparisce: va stornato, altrimenti paghi due volte e detrai due volte l'IVA d'acconto."),
   ([("Merci c/acquisti", "D", 2000), ("IVA ns/credito", "D", 440), ("Debiti v/fornitori", "A", 2440)], "Il costo della merce è 3.000: l'acconto riduce il debito, non il costo.")],
  "Costo intero; IVA solo sulla parte non ancora fatturata (440); si chiude l'anticipo; resta il debito residuo.")
s("Q05-07", 2, "Global Tech concede un abbuono di 150 € su una fattura già registrata e non ancora pagata (ipotesi: abbuono fuori campo IVA).",
  [("Debiti v/fornitori", "D", 150), ("Ribassi e abbuoni attivi", "A", 150)],
  [([("Banca c/c", "D", 150), ("Ribassi e abbuoni attivi", "A", 150)], "La fattura non è ancora pagata: l'abbuono riduce il debito, nessun accredito in banca."),
   ([("Ribassi e abbuoni passivi", "D", 150), ("Debiti v/fornitori", "A", 150)], "L'abbuono è a tuo favore: è attivo e riduce il debito.")],
  "Il debito si riduce; l'abbuono ottenuto è un componente positivo.", origine="M58")
q("Q05-08", 1, "Quando nasce il costo di un acquisto di merci?",
  "Con la fattura (o la consegna) del fornitore, anche se il pagamento avviene dopo",
  [("Quando paghi il fornitore", "Il pagamento estingue il debito; il costo è già nato."),
   ("A fine anno, con l'inventario", "L'inventario serve a calcolare le rimanenze, non a registrare gli acquisti."),
   ("Quando rivendi la merce", "Nella contabilità generale l'acquisto si registra subito; le rimanenze rettificano a fine anno.")],
  "Principio di competenza: il costo si registra quando l'operazione si realizza, non quando si paga.")
q("Q05-09", 2, "Perché l'IVA sugli acquisti normalmente NON è un costo?",
  "Perché si detrae dall'IVA delle vendite in liquidazione: è un credito verso l'Erario",
  [("Perché la paga il cliente finale", "Il cliente finale paga l'IVA sulle vendite, non sui tuoi acquisti."),
   ("Perché è sempre esente", "Molti acquisti hanno IVA al 22%: è detraibile, non esente."),
   ("Perché è un ricavo", "L'IVA sugli acquisti è un credito, non un ricavo.")],
  "IVA detraibile = IVA ns/credito; diventa costo solo se indetraibile.")
q("Q05-10", 2, "Quali di questi acquisti vanno tra le immobilizzazioni? (seleziona tutte le risposte corrette)",
  ["Un furgone per le consegne", "Una pressa piegatrice per il reparto"],
  [("Lamiere da trasformare in transenne", "Sono materie prime: si consumano nella produzione."),
   ("Toner per la stampante", "È materiale di consumo."),
   ("Bolletta del gas", "È un costo per servizi.")],
  "Si immobilizza ciò che si usa per più esercizi.", multi=True)
s("Q05-11", 2, "Ricevi la fattura di una società di consulenza informatica (nessuna ritenuta): 400 € + IVA 22% = 488 €, da pagare.",
  [("Consulenze", "D", 400), ("IVA ns/credito", "D", 88), ("Debiti v/fornitori", "A", 488)],
  [([("Merci c/acquisti", "D", 400), ("IVA ns/credito", "D", 88), ("Debiti v/fornitori", "A", 488)], "Una consulenza è un servizio, non una merce."),
   ([("Consulenze", "D", 400), ("IVA ns/debito", "D", 88), ("Debiti v/fornitori", "A", 488)], "Sugli acquisti l'IVA è a credito.")],
  "Servizio → conto di costo per natura (Consulenze).")
q("Q05-12", 3, "Hai registrato due volte la stessa fattura fornitore da 1.220 €. Qual è la correzione giusta?",
  "Uno storno della seconda registrazione: Debiti v/fornitori in Dare, costo e IVA in Avere",
  [("Pagare due volte il fornitore e chiedere il rimborso", "Si corregge la contabilità, non si crea un pagamento in più."),
   ("Lasciare tutto: l'errore si compensa a fine anno", "Il costo, l'IVA detraibile e il debito sarebbero sbagliati per tutto l'anno."),
   ("Registrare un ricavo di 1.220 €", "Un ricavo inventato altera il reddito: serve lo storno della stessa scrittura.")],
  "Lo storno è la scrittura identica con le sezioni invertite.")
