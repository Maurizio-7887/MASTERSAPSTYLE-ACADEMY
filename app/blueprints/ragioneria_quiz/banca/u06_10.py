"""Unità Q06–Q10: vendite, incassi e pagamenti, IVA, personale, mutuo."""
from . import S, T, unita

# ═════════════════════════════════════════════════════════════════════════════
unita("Q06", "Vendite e clienti", [
    "Fattura di vendita: Crediti v/clienti (Dare, totale) = Merci c/vendite (Avere, imponibile) + IVA ns/debito (Avere).",
    "Vendita pagata subito: al posto del credito si muove Cassa o Banca.",
    "Nota di credito al cliente (reso o sconto): Resi su vendite + IVA ns/debito in Dare, Crediti v/clienti in Avere.",
    "Acconto ricevuto dal cliente: si emette fattura d'acconto con IVA → Clienti c/anticipi (debito) + IVA ns/debito.",
    "Il ricavo nasce con la vendita (competenza), non con l'incasso.",
], {"testo": "Fattura al cliente Beta 8.000 € + IVA 22%.", "righe": [("Crediti v/clienti", "D", 9760), ("Merci c/vendite", "A", 8000), ("IVA ns/debito", "A", 1760)]})
q = lambda *a, **k: T("Q06", *a, **k)
s = lambda *a, **k: S("Q06", *a, **k)

s("Q06-01", 1, "Emetti fattura al cliente Beta: imponibile 8.000 € + IVA 22% = 9.760 €, pagamento a 30 giorni.",
  [("Crediti v/clienti", "D", 9760), ("Merci c/vendite", "A", 8000), ("IVA ns/debito", "A", 1760)],
  [([("Crediti v/clienti", "D", 9760), ("Merci c/vendite", "A", 9760)], "L'IVA incassata dal cliente non è un ricavo: è un debito verso l'Erario."),
   ([("Crediti v/clienti", "D", 9760), ("Merci c/vendite", "A", 8000), ("IVA ns/credito", "A", 1760)], "Sulle vendite l'IVA è a debito (da versare), non a credito.")],
  "Credito per il totale; ricavo per l'imponibile; IVA a debito.", origine="M05")
s("Q06-02", 1, "Vendita al banco a un privato: 100 € + IVA 22% = 122 €, incassati in contanti.",
  [("Cassa", "D", 122), ("Merci c/vendite", "A", 100), ("IVA ns/debito", "A", 22)],
  [([("Crediti v/clienti", "D", 122), ("Merci c/vendite", "A", 100), ("IVA ns/debito", "A", 22)], "Il cliente ha pagato subito: nessun credito, entra direttamente la cassa."),
   ([("Cassa", "D", 122), ("Merci c/vendite", "A", 122)], "Anche nella vendita al privato c'è l'IVA da versare.")],
  "Incasso immediato: Cassa in Dare al posto del credito.", origine="M18")
s("Q06-03", 2, "Emetti nota di credito al cliente Beta per merce resa: 300 € + IVA 22% = 366 €.",
  [("Resi su vendite", "D", 300), ("IVA ns/debito", "D", 66), ("Crediti v/clienti", "A", 366)],
  [([("Crediti v/clienti", "D", 366), ("Resi su vendite", "A", 300), ("IVA ns/debito", "A", 66)], "Sezioni invertite: il reso riduce il credito, non lo aumenta."),
   ([("Resi su vendite", "D", 366), ("Crediti v/clienti", "A", 366)], "Va ridotta anche l'IVA a debito: devi meno IVA all'Erario.")],
  "Si rettificano ricavo e IVA a debito (Dare) e diminuisce il credito (Avere).", origine="M36")
s("Q06-04", 3, "Il cliente Digital Sinergy versa in banca un acconto di 1.220 €; emetti fattura d'acconto: 1.000 € + IVA 220 €.",
  [("Banca c/c", "D", 1220), ("Clienti c/anticipi", "A", 1000), ("IVA ns/debito", "A", 220)],
  [([("Cassa", "D", 1220), ("Crediti v/clienti", "A", 1220)], "Due errori: il denaro è in banca e l'acconto è un debito verso il cliente con IVA, non la riduzione di un credito che non esiste."),
   ([("Banca c/c", "D", 1220), ("Merci c/vendite", "A", 1000), ("IVA ns/debito", "A", 220)], "La merce non è ancora consegnata: l'acconto non è ancora un ricavo.")],
  "L'acconto è un debito verso il cliente (Clienti c/anticipi); la fattura d'acconto fa nascere l'IVA.", origine="M08")
q("Q06-05", 1, "Quando nasce il ricavo di una vendita a 60 giorni?",
  "Con la consegna/fattura della merce",
  [("Fra 60 giorni, quando il cliente paga", "Il pagamento estingue il credito; il ricavo è già maturato."),
   ("A fine anno", "A fine anno si fanno solo gli assestamenti."),
   ("Quando si versa l'IVA", "Il versamento dell'IVA riguarda il debito verso l'Erario.")],
  "Competenza economica: il ricavo si registra quando la vendita si realizza.")
q("Q06-06", 2, "L'IVA ns/debito registrata con la fattura di vendita…",
  "è un debito verso l'Erario da liquidare e versare",
  [("è un ricavo dell'azienda", "L'IVA si incassa per conto dello Stato: non migliora il reddito."),
   ("si chiude quando il cliente paga", "Si chiude con la liquidazione periodica, non con l'incasso."),
   ("si somma ai costi", "È un debito, non un costo.")],
  "L'azienda incassa l'IVA dal cliente e la deve allo Stato, al netto dell'IVA sugli acquisti.")
q("Q06-07", 2, "Fattura 1.220 € al cliente Neri; nota di credito 122 €; incasso 600 €. Quanto deve ancora Neri?",
  "498 €",
  [("620 €", "Hai dimenticato la nota di credito di 122 € che riduce il credito."),
   ("1.098 €", "Hai dimenticato l'incasso di 600 €."),
   ("742 €", "La nota di credito si sottrae, non si somma.")],
  "1.220 − 122 − 600 = 498 € di residuo.", area="applicazione")
s("Q06-08", 3, "Consegni la merce a Digital Sinergy ed emetti la fattura finale: 4.000 € + IVA 880 €, dedotto l'acconto fatturato di 1.000 € + 220 €. Residuo da incassare 3.660 €.",
  [("Crediti v/clienti", "D", 3660), ("Clienti c/anticipi", "D", 1000), ("Merci c/vendite", "A", 4000), ("IVA ns/debito", "A", 660)],
  [([("Crediti v/clienti", "D", 4880), ("Merci c/vendite", "A", 4000), ("IVA ns/debito", "A", 880)], "Dimentichi l'acconto: chiederesti di nuovo 1.220 € e pagheresti due volte l'IVA d'acconto."),
   ([("Crediti v/clienti", "D", 3660), ("Merci c/vendite", "A", 3000), ("IVA ns/debito", "A", 660)], "Il ricavo è 4.000: l'acconto riduce quanto devi incassare, non il ricavo.")],
  "Ricavo intero; IVA solo sulla parte non ancora fatturata; si chiude l'anticipo del cliente.")
q("Q06-09", 2, "Quali conti si muovono in una fattura di vendita a credito? (seleziona tutte le risposte corrette)",
  ["Crediti v/clienti", "Merci c/vendite", "IVA ns/debito"],
  [("Banca c/c", "La banca si muove solo all'incasso."),
   ("IVA ns/credito", "L'IVA a credito riguarda gli acquisti.")],
  "Credito (Dare) = ricavo + IVA a debito (Avere).", multi=True)
s("Q06-10", 2, "Concedi al cliente Rossi un abbuono di 50 € sulla fattura già emessa, non ancora incassata (ipotesi: senza variazione IVA).",
  [("Ribassi e abbuoni passivi", "D", 50), ("Crediti v/clienti", "A", 50)],
  [([("Ribassi e abbuoni attivi", "D", 50), ("Crediti v/clienti", "A", 50)], "L'abbuono concesso è a tuo carico: è passivo."),
   ([("Ribassi e abbuoni passivi", "D", 50), ("Cassa", "A", 50)], "Non restituisci contanti: riduci il credito ancora aperto.")],
  "Abbuono concesso = componente negativo; il credito si riduce.")
q("Q06-11", 3, "Un cliente paga con bonifico 100 € in più rispetto alla fattura. Il saldo del suo partitario diventa…",
  "avere 100 €: è un debito verso il cliente (da rimborsare o compensare)",
  [("dare 100 €", "Il cliente ha pagato più del dovuto: non ti deve nulla, sei tu a dovergli qualcosa."),
   ("zero, perché l'eccedenza è un ricavo", "Un pagamento in eccesso non è un ricavo."),
   ("zero, perché la banca lo restituisce da sola", "La banca non conosce la tua fattura: la differenza resta da gestire.")],
  "Un saldo avere su un cliente segnala un debito verso di lui.", area="applicazione")
q("Q06-12", 1, "Il conto «Merci c/vendite» a fine anno ha normalmente saldo…",
  "avere",
  [("dare", "Un ricavo ha saldo avere; un saldo dare indicherebbe un errore o più resi che vendite."),
   ("zero", "Il saldo è zero solo dopo la chiusura nel Conto economico."),
   ("uguale ai crediti v/clienti", "I crediti comprendono l'IVA e si riducono con gli incassi: non coincidono con le vendite.")],
  "Ricavi: saldo avere fino all'epilogo.")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q07", "Incassi, pagamenti e cassa", [
    "Incasso: Banca/Cassa in Dare, Crediti v/clienti in Avere. Pagamento: Debiti v/fornitori in Dare, Banca/Cassa in Avere.",
    "Il pagamento parziale riduce solo una parte della partita: il residuo resta aperto nel partitario.",
    "Girofondo tra cassa e banca: nessun costo, nessun ricavo.",
    "Riconciliazione bancaria: confronti il mastrino Banca con l'estratto conto e registri le voci che conosci solo dall'estratto (spese, interessi).",
    "Insoluto: il cliente non paga alla scadenza → Crediti insoluti.",
])
q = lambda *a, **k: T("Q07", *a, **k)
s = lambda *a, **k: S("Q07", *a, **k)

s("Q07-01", 1, "Paghi in contanti 61 € al corriere per una fattura già registrata.",
  [("Debiti v/fornitori", "D", 61), ("Cassa", "A", 61)],
  [([("Debiti v/fornitori", "D", 61), ("Banca c/c", "A", 61)], "Hai pagato in contanti: diminuisce la Cassa."),
   ([("Merci c/acquisti", "D", 61), ("Cassa", "A", 61)], "La fattura era già registrata: ora si chiude il debito.")],
  "Pagamento di un debito in contanti.")
s("Q07-02", 2, "Paghi con bonifico 1.000 € in acconto su una fattura fornitore di 2.440 € già registrata.",
  [("Debiti v/fornitori", "D", 1000), ("Banca c/c", "A", 1000)],
  [([("Debiti v/fornitori", "D", 2440), ("Banca c/c", "A", 2440)], "Hai pagato solo 1.000 €: si registra quanto esce davvero."),
   ([("Fornitori c/anticipi", "D", 1000), ("Banca c/c", "A", 1000)], "La fattura c'è già: è un pagamento parziale del debito, non un anticipo.")],
  "Il debito scende a 1.440 €.")
s("Q07-03", 2, "Versi in banca 800 € di contanti presi dalla cassa.",
  [("Banca c/c", "D", 800), ("Cassa", "A", 800)],
  [([("Banca c/c", "D", 800), ("Merci c/vendite", "A", 800)], "Versare contanti non è una vendita."),
   ([("Cassa", "D", 800), ("Banca c/c", "A", 800)], "È il contrario: i contanti escono dalla cassa ed entrano in banca."),
   ([("Banca c/c", "D", 800), ("Crediti v/clienti", "A", 800)], "Il denaro viene dalla tua cassa: nessun cliente sta pagando.")],
  "Girofondo cassa → banca.")
q("Q07-04", 2, "Riconciliazione: il mastrino Banca dà 5.200 €, l'estratto conto 5.170 €. Unica differenza: 30 € di spese che la banca ha addebitato e non hai ancora registrato. Che cosa fai?",
  "Registri Oneri bancari Dare 30 / Banca c/c Avere 30",
  [("Correggi l'estratto conto", "L'estratto è della banca: tu correggi la tua contabilità."),
   ("Registri Banca c/c Dare 30 / Oneri bancari Avere 30", "Così aumenti la banca: la differenza diventa 60."),
   ("Non fai nulla, la differenza è piccola", "Ogni differenza va spiegata e registrata.")],
  "Le voci note solo dall'estratto (spese, interessi) si registrano dopo la riconciliazione.", area="applicazione")
s("Q07-05", 3, "Alla scadenza il cliente Neri non paga la fattura di 1.220 € (insoluto).",
  [("Crediti insoluti", "D", 1220), ("Crediti v/clienti", "A", 1220)],
  [([("Perdite su crediti", "D", 1220), ("Crediti v/clienti", "A", 1220)], "Un insoluto non è ancora una perdita: il credito si può ancora recuperare."),
   ([("Crediti v/clienti", "D", 1220), ("Merci c/vendite", "A", 1220)], "La vendita c'è già: non si registra un nuovo ricavo.")],
  "Il credito scaduto si evidenzia in un conto apposito, per seguirne il recupero.")
q("Q07-06", 1, "L'incasso di una fattura cliente genera…",
  "un aumento della banca e una diminuzione del credito",
  [("un nuovo ricavo", "Il ricavo è nato con la fattura."),
   ("un costo", "Incassare non genera costi."),
   ("un aumento dell'IVA a debito", "L'IVA è nata con la fattura.")],
  "Operazione solo finanziaria: due conti patrimoniali.")
s("Q07-07", 2, "Il cliente Beta paga 2.000 € con assegno, che depositi subito in banca (fattura già registrata).",
  [("Banca c/c", "D", 2000), ("Crediti v/clienti", "A", 2000)],
  [([("Cassa", "D", 2000), ("Crediti v/clienti", "A", 2000)], "Hai depositato subito l'assegno: si muove la banca."),
   ([("Banca c/c", "D", 2000), ("Merci c/vendite", "A", 2000)], "Il ricavo è già registrato: si estingue il credito.")],
  "Incasso del credito in banca.")
q("Q07-08", 2, "Mastrino Cassa: saldo iniziale 300 dare; incassi 122; pagamenti 61 e 50; versamento in banca 200. Saldo finale?",
  "111 dare",
  [("311 dare", "Hai dimenticato il versamento in banca di 200 €."),
   ("733 dare", "I pagamenti e il versamento si sottraggono."),
   ("111 avere", "La cassa non può avere saldo avere: indicherebbe più uscite che denaro.")],
  "300 + 122 − 61 − 50 − 200 = 111 €.", area="applicazione")
q("Q07-09", 2, "Perché il conto Cassa non può avere saldo avere?",
  "Perché non si possono spendere più contanti di quelli presenti: un saldo avere indica un errore",
  [("Perché la cassa è un ricavo", "La cassa è un'attività."),
   ("Perché la banca lo copre automaticamente", "La cassa è separata dalla banca: nessuna copertura automatica."),
   ("Può averlo: è il fido di cassa", "Il fido riguarda il conto corrente bancario, non i contanti.")],
  "Saldo avere in cassa = registrazione mancante o sbagliata.")
s("Q07-10", 3, "Paghi con un unico bonifico di 3.050 € due fatture dello stesso fornitore: 1.830 € e 1.220 €.",
  [("Debiti v/fornitori", "D", 3050), ("Banca c/c", "A", 3050)],
  [([("Debiti v/fornitori", "D", 1830), ("Banca c/c", "A", 3050), ("Merci c/acquisti", "D", 1220)], "Entrambe le fatture sono già registrate: non nasce nessun nuovo costo."),
   ([("Debiti v/fornitori", "D", 3050), ("Cassa", "A", 3050)], "Bonifico = banca, non cassa.")],
  "Un pagamento cumulativo estingue le due partite: nel partitario si abbinano entrambe le fatture.")
q("Q07-11", 1, "Un girofondo dalla banca alla cassa modifica il reddito?",
  "No: cambia solo la forma della liquidità",
  [("Sì, aumenta il reddito", "Nessun ricavo: il denaro era già dell'azienda."),
   ("Sì, lo riduce per l'importo prelevato", "Nessun costo: il denaro non esce dall'azienda."),
   ("Solo se si superano 1.000 €", "L'importo non cambia la natura dell'operazione.")],
  "Liquidità ↔ liquidità: operazione puramente finanziaria.")
s("Q07-12", 2, "Il cliente Rossi paga la fattura di 1.220 € trattenendo 20 € di commissioni bancarie a tuo carico: in banca entrano 1.200 €.",
  [("Banca c/c", "D", 1200), ("Oneri bancari", "D", 20), ("Crediti v/clienti", "A", 1220)],
  [([("Banca c/c", "D", 1200), ("Crediti v/clienti", "A", 1200)], "Il credito va chiuso per intero: altrimenti resterebbe aperto un residuo di 20 € inesistente."),
   ([("Banca c/c", "D", 1220), ("Crediti v/clienti", "A", 1220)], "In banca sono entrati 1.200 €, non 1.220.")],
  "Si chiude l'intero credito; la differenza è un costo bancario.")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q08", "IVA e versamenti", [
    "IVA sugli acquisti → IVA ns/credito (Dare). IVA sulle vendite → IVA ns/debito (Avere).",
    "Liquidazione: si chiudono IVA a credito e a debito; la differenza va in Erario c/IVA (debito se paghi, credito se avanzi).",
    "Il versamento con F24 estingue il debito Erario c/IVA: non è un nuovo costo.",
    "Reverse charge (acquisto di servizi da fornitore UE): tu integri la fattura con l'IVA, registrandola sia a credito sia a debito.",
    "IVA indetraibile: diventa costo. Se riguarda un cespite si aggiunge al costo del bene (ipotesi dichiarata nel caso).",
], {"testo": "Liquidazione: IVA a debito 1.760, a credito 1.100.", "righe": [("IVA ns/debito", "D", 1760), ("IVA ns/credito", "A", 1100), ("Erario c/IVA", "A", 660)]})
q = lambda *a, **k: T("Q08", *a, **k)
s = lambda *a, **k: S("Q08", *a, **k)

s("Q08-01", 2, "Liquidazione IVA del mese: IVA ns/debito 1.760 €, IVA ns/credito 1.100 €. Saldo da versare 660 €.",
  [("IVA ns/debito", "D", 1760), ("IVA ns/credito", "A", 1100), ("Erario c/IVA", "A", 660)],
  [([("IVA ns/debito", "D", 660), ("Banca c/c", "A", 660)], "La liquidazione chiude i due conti IVA e fa nascere il debito: il pagamento è un'altra scrittura."),
   ([("IVA ns/credito", "D", 1100), ("IVA ns/debito", "A", 1760), ("Erario c/IVA", "D", 660)], "Sezioni invertite: così aumenti i conti IVA invece di chiuderli."),
   ([("IVA ns/debito", "D", 1100), ("IVA ns/credito", "A", 1100)], "Chiudi solo una parte dell'IVA a debito: i 660 € restano lì invece di diventare debito verso l'Erario.")],
  "Si azzerano i conti IVA; la differenza è il debito verso l'Erario.", origine="M14")
s("Q08-02", 1, "Versi con F24 il saldo IVA di 660 € (addebito in banca).",
  [("Erario c/IVA", "D", 660), ("Banca c/c", "A", 660)],
  [([("Oneri bancari", "D", 660), ("Banca c/c", "A", 660)], "Versare l'IVA non è un costo: estingue un debito."),
   ([("IVA ns/debito", "D", 660), ("Banca c/c", "A", 660)], "IVA ns/debito è già stata chiusa con la liquidazione: ora si paga Erario c/IVA.")],
  "Si estingue il debito verso l'Erario.", origine="M15")
s("Q08-03", 3, "Liquidazione a credito: IVA ns/credito 3.200 €, IVA ns/debito 1.800 €. Il credito di 1.400 € si riporta al mese successivo.",
  [("IVA ns/debito", "D", 1800), ("Erario c/IVA", "D", 1400), ("IVA ns/credito", "A", 3200)],
  [([("IVA ns/debito", "D", 1800), ("IVA ns/credito", "A", 3200), ("Erario c/IVA", "A", 1400)], "Non pareggia e tratta il credito come un debito: quando avanzi IVA, l'Erario c/IVA va in Dare."),
   ([("Banca c/c", "D", 1400), ("IVA ns/credito", "A", 1400)], "Il credito non viene rimborsato: si riporta, nessun incasso in banca.")],
  "Credito netto: Erario c/IVA in Dare (attività da usare nella liquidazione successiva).", origine="M43")
s("Q08-04", 3, "Ricevi fattura da un fornitore UE per servizi di 2.000 € senza IVA. Applichi il reverse charge integrando l'IVA al 22% (detraibile).",
  [("Consulenze", "D", 2000), ("IVA ns/credito", "D", 440), ("Debiti v/fornitori", "A", 2000), ("IVA ns/debito", "A", 440)],
  [([("Consulenze", "D", 2000), ("IVA ns/credito", "D", 440), ("Debiti v/fornitori", "A", 2440)], "Il fornitore UE non ti addebita l'IVA: il debito verso di lui è 2.000. L'IVA la devi tu all'Erario."),
   ([("Consulenze", "D", 2440), ("Debiti v/fornitori", "A", 2440)], "Nel reverse charge l'IVA non è un costo e non si paga al fornitore.")],
  "Doppia registrazione dell'IVA (credito e debito): effetto netto zero se interamente detraibile.", origine="M42")
s("Q08-05", 3, "Compri un'autovettura aziendale: 10.000 € + IVA 22% = 2.200 €. Ipotesi del caso: IVA detraibile al 40% (880 €); la quota indetraibile (1.320 €) si aggiunge al costo del bene.",
  [("Automezzi", "D", 11320), ("IVA ns/credito", "D", 880), ("Debiti v/fornitori", "A", 12200)],
  [([("Automezzi", "D", 10000), ("IVA ns/credito", "D", 2200), ("Debiti v/fornitori", "A", 12200)], "Detrai tutta l'IVA, ma nel caso è detraibile solo il 40%."),
   ([("Merci c/acquisti", "D", 11320), ("IVA ns/credito", "D", 880), ("Debiti v/fornitori", "A", 12200)], "L'auto è un cespite: non va tra gli acquisti di merci.")],
  "L'IVA indetraibile su un bene ammortizzabile ne aumenta il costo; si ammortizza con il bene.", origine="M51")
q("Q08-06", 1, "Il saldo di «Erario c/IVA» in Avere dopo la liquidazione indica…",
  "un debito IVA da versare",
  [("un credito IVA", "Il credito sarebbe un saldo dare."),
   ("un costo dell'esercizio", "Il debito IVA non è un costo."),
   ("un ricavo", "L'IVA non è un ricavo.")],
  "Saldo avere = debito verso l'Erario.")
q("Q08-07", 2, "Con il reverse charge su un servizio interamente detraibile, l'IVA…",
  "si registra a credito e a debito per lo stesso importo, con effetto nullo",
  [("si paga al fornitore estero", "Il fornitore UE fattura senza IVA."),
   ("diventa un costo", "Se detraibile, non pesa sul conto economico."),
   ("non si registra affatto", "Va registrata: integra la fattura e entra nei registri IVA.")],
  "Meccanismo di inversione contabile: il debitore d'imposta è chi compra.", origine="M42")
q("Q08-08", 2, "Quali di questi conti si chiudono con la liquidazione IVA periodica? (seleziona tutte le risposte corrette)",
  ["IVA ns/credito", "IVA ns/debito"],
  [("Crediti v/clienti", "I crediti si chiudono con gli incassi."),
   ("Merci c/vendite", "Le vendite si chiudono a fine anno nel Conto economico."),
   ("Banca c/c", "La banca si muove solo con il versamento F24.")],
  "La liquidazione trasferisce i due saldi IVA su Erario c/IVA.", multi=True)
q("Q08-09", 2, "IVA a debito del mese 900 €, a credito 1.300 €, credito del mese precedente 200 €. Risultato?",
  "Credito di 600 € da riportare",
  [("Debito di 400 €", "L'IVA a credito supera quella a debito."),
   ("Credito di 400 €", "Hai dimenticato il credito di 200 € del mese precedente."),
   ("Debito di 600 €", "Il risultato è a favore dell'azienda, non dell'Erario.")],
  "900 − 1.300 − 200 = −600 → credito 600.", area="applicazione")
q("Q08-10", 3, "Perché l'IVA indetraibile su un'auto aziendale (nel caso: 60%) non va in IVA ns/credito?",
  "Perché non si può detrarre: diventa parte del costo del bene",
  [("Perché si paga separatamente al concessionario", "Si paga insieme alla fattura; cambia solo la detraibilità."),
   ("Perché è un ricavo", "È un onere, non un ricavo."),
   ("Perché va in IVA ns/debito", "L'IVA ns/debito riguarda le vendite.")],
  "Solo l'IVA detraibile è un credito verso l'Erario.", origine="M51")
s("Q08-11", 2, "Paghi con F24 il saldo IVA di 1.050 € e, nello stesso F24, le ritenute dei dipendenti di 450 €. Addebito unico 1.500 €.",
  [("Erario c/IVA", "D", 1050), ("Erario c/ritenute", "D", 450), ("Banca c/c", "A", 1500)],
  [([("Erario c/IVA", "D", 1500), ("Banca c/c", "A", 1500)], "Nel modello F24 ci sono due debiti diversi: vanno chiusi entrambi."),
   ([("Erario c/IVA", "D", 1050), ("Salari e stipendi", "D", 450), ("Banca c/c", "A", 1500)], "Le ritenute erano già nate con la busta paga: ora si estingue il debito, non un nuovo costo.")],
  "Un F24 può estinguere più debiti tributari in un solo addebito.")
q("Q08-12", 1, "Un'operazione ESENTE IVA (es. premio di assicurazione) si registra…",
  "senza IVA ns/credito: costo e pagamento per l'importo intero",
  [("con IVA al 22% scorporata", "Esente significa che l'IVA non si applica."),
   ("con IVA ns/debito", "Non è una vendita."),
   ("solo a fine anno", "Si registra quando avviene.")],
  "Esente = nessuna IVA da detrarre.", origine="M19")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q09", "Personale e stipendi", [
    "Il costo del lavoro è il LORDO (Salari e stipendi) più i contributi a carico dell'azienda (Oneri sociali).",
    "Dalla busta paga si trattengono IRPEF (Erario c/ritenute) e contributi del dipendente (Istituti previdenziali): restano debiti dell'azienda verso Stato ed enti.",
    "Il netto va al dipendente (Personale c/retribuzioni) e si paga con bonifico.",
    "Ritenute e contributi si versano con F24 entro il 16 del mese successivo: il versamento non è un nuovo costo.",
    "Il TFR maturato nell'anno è un costo (TFR) che alimenta il debito verso i dipendenti (Debiti per TFR).",
    "I dati della busta paga nelle domande (aliquote, importi) sono dati del caso, non un calcolo paghe reale.",
], {"testo": "Lordo 2.500; IRPEF 450; contributi dipendente 230; netto 1.820.", "righe": [("Salari e stipendi", "D", 2500), ("Erario c/ritenute", "A", 450), ("Istituti previdenziali", "A", 230), ("Personale c/retribuzioni", "A", 1820)]})
q = lambda *a, **k: T("Q09", *a, **k)
s = lambda *a, **k: S("Q09", *a, **k)

s("Q09-01", 2, "Busta paga del mese: lordo 2.500 €, IRPEF trattenuta 450 €, contributi a carico del dipendente 230 €, netto 1.820 €.",
  [("Salari e stipendi", "D", 2500), ("Erario c/ritenute", "A", 450), ("Istituti previdenziali", "A", 230), ("Personale c/retribuzioni", "A", 1820)],
  [([("Salari e stipendi", "D", 1820), ("Personale c/retribuzioni", "A", 1820)], "Il costo è il lordo: IRPEF e contributi del dipendente sono parte dello stipendio, trattenuti e versati dall'azienda."),
   ([("Salari e stipendi", "D", 2500), ("Banca c/c", "A", 2500)], "Il dipendente non riceve il lordo: riceve il netto, e il resto va a Erario e INPS.")],
  "Costo lordo in Dare; trattenute e netto sono debiti in Avere.", origine="M31")
s("Q09-02", 2, "Contributi a carico dell'azienda sullo stesso stipendio: 750 €.",
  [("Oneri sociali", "D", 750), ("Istituti previdenziali", "A", 750)],
  [([("Salari e stipendi", "D", 750), ("Istituti previdenziali", "A", 750)], "I contributi del datore hanno un conto proprio (Oneri sociali), separato dal lordo."),
   ([("Oneri sociali", "D", 750), ("Personale c/retribuzioni", "A", 750)], "I contributi si devono all'INPS, non al dipendente.")],
  "Costo aggiuntivo per l'azienda, debito verso gli enti previdenziali.", origine="M32")
s("Q09-03", 1, "Paghi con bonifico il netto di 1.820 € al dipendente.",
  [("Personale c/retribuzioni", "D", 1820), ("Banca c/c", "A", 1820)],
  [([("Salari e stipendi", "D", 1820), ("Banca c/c", "A", 1820)], "Il costo è già registrato con la busta paga: così lo conteresti due volte."),
   ([("Personale c/retribuzioni", "D", 2500), ("Banca c/c", "A", 2500)], "Al dipendente va il netto, non il lordo.")],
  "Si estingue il debito verso il dipendente.", origine="M33")
s("Q09-04", 2, "Il 16 del mese successivo versi con F24: IRPEF 450 € e contributi INPS 980 € (230 dipendente + 750 azienda).",
  [("Erario c/ritenute", "D", 450), ("Istituti previdenziali", "D", 980), ("Banca c/c", "A", 1430)],
  [([("Oneri sociali", "D", 980), ("Erario c/ritenute", "D", 450), ("Banca c/c", "A", 1430)], "I contributi erano già costo: il versamento chiude il debito verso gli enti."),
   ([("Erario c/ritenute", "D", 450), ("Istituti previdenziali", "D", 230), ("Banca c/c", "A", 680)], "Va versata anche la quota a carico dell'azienda (750).")],
  "Il versamento estingue i debiti tributari e previdenziali.", origine="M46")
s("Q09-05", 2, "A fine anno rilevi la quota di TFR maturata: 2.220 €.",
  [("TFR", "D", 2220), ("Debiti per TFR", "A", 2220)],
  [([("TFR", "D", 2220), ("Banca c/c", "A", 2220)], "Il TFR non si paga oggi: si accantona e si paga quando il rapporto finisce."),
   ([("Debiti per TFR", "D", 2220), ("TFR", "A", 2220)], "Sezioni invertite: il debito verso i dipendenti aumenta.")],
  "Costo di competenza dell'anno e aumento del debito per TFR.", origine="M25")
q("Q09-06", 1, "Il costo dello stipendio per l'azienda è…",
  "il lordo più i contributi a carico dell'azienda",
  [("solo il netto pagato al dipendente", "Il netto è una parte: anche ritenute e contributi sono costo."),
   ("solo l'IRPEF", "L'IRPEF è una trattenuta dentro il lordo."),
   ("il netto più l'IVA", "Gli stipendi non hanno IVA.")],
  "Lordo + oneri sociali = costo del lavoro.")
q("Q09-07", 2, "L'IRPEF trattenuta in busta paga è per l'azienda…",
  "un debito verso l'Erario: la trattiene e la versa per conto del dipendente",
  [("un costo aggiuntivo", "È già compresa nel lordo, non si aggiunge."),
   ("un ricavo", "L'azienda non guadagna nulla: fa da sostituto d'imposta."),
   ("un credito verso il dipendente", "Il dipendente non deve restituirla.")],
  "Sostituto d'imposta: trattiene e versa.")
q("Q09-08", 2, "Lordo 3.000 €, IRPEF 600 €, contributi dipendente 276 €. Qual è il netto?",
  "2.124 €",
  [("2.400 €", "Hai tolto solo l'IRPEF."),
   ("2.724 €", "Hai tolto solo i contributi."),
   ("3.876 €", "Le trattenute si sottraggono dal lordo.")],
  "3.000 − 600 − 276 = 2.124 €.", area="applicazione")
q("Q09-09", 3, "Perché registrare «Salari e stipendi» Dare e poi pagare di nuovo «Salari e stipendi» Dare all'uscita del bonifico è un errore?",
  "Perché il costo viene contato due volte: il pagamento deve chiudere il debito verso il dipendente",
  [("Non è un errore: costo e pagamento coincidono", "Costo e pagamento sono momenti diversi."),
   ("Perché il pagamento va in Avere di Salari", "Il pagamento riguarda Personale c/retribuzioni e Banca."),
   ("Perché serve l'IVA", "Gli stipendi non hanno IVA.")],
  "Busta paga → costo e debiti; bonifico → chiusura del debito.", origine="M09")
q("Q09-10", 2, "Quali sono debiti dell'azienda dopo la busta paga e prima dei pagamenti? (seleziona tutte le risposte corrette)",
  ["Personale c/retribuzioni", "Erario c/ritenute", "Istituti previdenziali"],
  [("Salari e stipendi", "È un costo, non un debito."),
   ("Oneri sociali", "È un costo; il debito corrispondente è verso gli Istituti previdenziali.")],
  "Netto, ritenute e contributi sono tre debiti distinti.", multi=True)
s("Q09-11", 3, "Il dipendente lascia l'azienda: gli liquidi con bonifico il TFR accantonato di 6.000 € (ipotesi: ritenuta IRPEF sul TFR 1.000 €, netto pagato 5.000 €).",
  [("Debiti per TFR", "D", 6000), ("Erario c/ritenute", "A", 1000), ("Banca c/c", "A", 5000)],
  [([("TFR", "D", 6000), ("Banca c/c", "A", 6000)], "Il TFR era già stato accantonato come costo negli anni: ora si estingue il debito."),
   ([("Debiti per TFR", "D", 5000), ("Banca c/c", "A", 5000)], "Va chiuso tutto il debito (6.000): la ritenuta diventa un debito verso l'Erario.")],
  "Si chiude il debito per TFR; la parte trattenuta va all'Erario.")
q("Q09-12", 1, "Quando si versano normalmente ritenute IRPEF e contributi dei dipendenti?",
  "Con F24 entro il 16 del mese successivo al pagamento dello stipendio",
  [("Una volta l'anno con la dichiarazione dei redditi", "Le ritenute dei dipendenti si versano mensilmente."),
   ("Quando il dipendente lo chiede", "La scadenza è fissata dalla legge, non dal dipendente."),
   ("Insieme alla liquidazione IVA trimestrale", "Sono adempimenti diversi, con scadenze proprie.")],
  "Scadenza ordinaria: il 16 del mese successivo.", origine="M46")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q10", "Mutuo", [
    "All'erogazione entra denaro in banca e nasce il debito (Mutui passivi); eventuali spese trattenute sono costi.",
    "La rata ha due parti: la QUOTA CAPITALE riduce il debito; la QUOTA INTERESSI è un costo. La rata intera non è un costo.",
    "A fine anno gli interessi maturati ma non ancora pagati si rilevano con un rateo passivo.",
    "Nel bilancio il debito residuo si divide tra quota esigibile entro 12 mesi e oltre 12 mesi.",
], {"testo": "Rata 580 €: capitale 500, interessi 80.", "righe": [("Mutui passivi", "D", 500), ("Interessi passivi su mutui", "D", 80), ("Banca c/c", "A", 580)]})
q = lambda *a, **k: T("Q10", *a, **k)
s = lambda *a, **k: S("Q10", *a, **k)

s("Q10-01", 1, "La banca eroga un mutuo di 20.000 € accreditato sul conto corrente.",
  [("Banca c/c", "D", 20000), ("Mutui passivi", "A", 20000)],
  [([("Banca c/c", "D", 20000), ("Merci c/vendite", "A", 20000)], "Un prestito non è un ricavo: va restituito."),
   ([("Banca c/c", "D", 20000), ("Capitale sociale", "A", 20000)], "Il mutuo è un debito verso la banca, non capitale dei soci.")],
  "Entra liquidità; nasce un debito di finanziamento.", origine="M34")
s("Q10-02", 2, "Paghi la rata del mutuo: 500 € di quota capitale e 80 € di interessi, addebito 580 €.",
  [("Mutui passivi", "D", 500), ("Interessi passivi su mutui", "D", 80), ("Banca c/c", "A", 580)],
  [([("Interessi passivi su mutui", "D", 580), ("Banca c/c", "A", 580)], "Solo gli interessi sono un costo: la quota capitale restituisce il prestito."),
   ([("Mutui passivi", "D", 580), ("Banca c/c", "A", 580)], "Gli interessi non riducono il debito: sono il costo del finanziamento.")],
  "Quota capitale → riduce il debito; quota interessi → costo.", origine="M35")
s("Q10-03", 2, "Erogazione di un mutuo di 50.000 €: la banca trattiene 300 € di spese di istruttoria e accredita 49.700 €.",
  [("Banca c/c", "D", 49700), ("Oneri bancari", "D", 300), ("Mutui passivi", "A", 50000)],
  [([("Banca c/c", "D", 49700), ("Mutui passivi", "A", 49700)], "Il debito da restituire è 50.000: le spese sono un costo separato."),
   ([("Banca c/c", "D", 50000), ("Mutui passivi", "A", 50000)], "In banca sono entrati 49.700, non 50.000.")],
  "Debito per il valore nominale; spese trattenute come costo (nel modello semplificato del corso).")
s("Q10-04", 3, "31/12: la prossima rata del mutuo scade il 31/1 con 240 € di interessi relativi a 3 mesi (1/11–31/1). Rilevi gli interessi di competenza dell'anno.",
  [("Interessi passivi su mutui", "D", 160), ("Ratei passivi", "A", 160)],
  [([("Interessi passivi su mutui", "D", 240), ("Ratei passivi", "A", 240)], "Di competenza dell'anno sono solo 2 mesi su 3 (novembre e dicembre): 240 × 2/3 = 160."),
   ([("Risconti attivi", "D", 160), ("Interessi passivi su mutui", "A", 160)], "Il risconto rinvia un costo già registrato; qui il costo non è ancora registrato e va anticipato con un rateo.")],
  "Costo maturato ma non ancora pagato → rateo passivo.", origine="M23")
q("Q10-05", 1, "La quota capitale della rata del mutuo è…",
  "il rimborso di una parte del debito",
  [("un costo dell'esercizio", "Il costo è solo la quota interessi."),
   ("un ricavo della banca da registrare da noi", "I ricavi della banca non sono nella nostra contabilità."),
   ("un aumento del patrimonio netto", "Restituire un debito non aumenta il patrimonio netto.")],
  "Restituire il capitale non tocca il conto economico.")
q("Q10-06", 2, "Mutuo erogato 20.000 €; pagate 4 rate con quota capitale di 500 € ciascuna. Debito residuo?",
  "18.000 €",
  [("17.680 €", "Hai tolto anche gli interessi, che non riducono il debito."),
   ("19.500 €", "Le rate pagate sono quattro, non una."),
   ("20.000 €", "Le quote capitale riducono il debito.")],
  "20.000 − 4 × 500 = 18.000 €.", area="applicazione")
q("Q10-07", 3, "Debito residuo 18.000 €, di cui 6.000 € da rimborsare nei prossimi 12 mesi. Come si espone in bilancio?",
  "6.000 € tra i debiti esigibili entro l'esercizio successivo e 12.000 € oltre",
  [("Tutto entro l'esercizio successivo", "Solo le quote che scadono nei prossimi 12 mesi sono a breve."),
   ("Tutto oltre l'esercizio successivo", "La parte in scadenza entro 12 mesi va indicata separatamente."),
   ("Nel patrimonio netto", "Il mutuo è un debito.")],
  "Il codice civile chiede di separare la quota esigibile oltre l'esercizio successivo.", area="applicazione")
q("Q10-08", 2, "Perché a fine anno si rileva un rateo passivo per gli interessi del mutuo?",
  "Perché una parte degli interessi è maturata nell'anno anche se si pagherà con la rata successiva",
  [("Perché la banca lo richiede", "È il principio di competenza, non una richiesta della banca."),
   ("Per rinviare all'anno dopo un costo già pagato", "Quello è un risconto attivo."),
   ("Per ridurre il debito del mutuo", "Il rateo è un debito in più, per gli interessi maturati.")],
  "Competenza: il costo appartiene all'anno in cui matura.")
q("Q10-09", 2, "Quali righe ci sono nella scrittura di pagamento di una rata di mutuo? (seleziona tutte le risposte corrette)",
  ["Mutui passivi in Dare", "Interessi passivi su mutui in Dare", "Banca c/c in Avere"],
  [("Mutui passivi in Avere", "In Avere il debito aumenterebbe: succede solo all'erogazione."),
   ("Capitale sociale in Dare", "Il capitale dei soci non c'entra.")],
  "Due righe Dare (capitale e interessi) e una Avere (banca).", multi=True)
s("Q10-10", 2, "Estingui anticipatamente il residuo del mutuo di 12.000 € pagando anche 120 € di penale.",
  [("Mutui passivi", "D", 12000), ("Oneri bancari", "D", 120), ("Banca c/c", "A", 12120)],
  [([("Mutui passivi", "D", 12120), ("Banca c/c", "A", 12120)], "La penale non riduce il debito: è un costo."),
   ([("Interessi passivi su mutui", "D", 12120), ("Banca c/c", "A", 12120)], "Il rimborso del capitale non è un costo.")],
  "Si chiude il debito; la penale è un onere finanziario.")
q("Q10-11", 1, "All'erogazione del mutuo il patrimonio netto…",
  "non cambia: aumentano allo stesso modo attività (banca) e passività (debito)",
  [("aumenta", "Il denaro ricevuto va restituito: non è ricchezza propria."),
   ("diminuisce", "Nessun costo all'erogazione (salvo eventuali spese)."),
   ("raddoppia", "Nessun effetto sul patrimonio netto.")],
  "Operazione permutativa finanziaria.")
q("Q10-12", 3, "1/1 dell'anno dopo: come tratti il rateo passivo di 160 € per interessi rilevato al 31/12?",
  "Lo chiudi quando paghi la rata: la parte dell'anno precedente estingue il rateo, solo il resto è costo del nuovo anno",
  [("Lo lasci per sempre nello stato patrimoniale", "Il rateo si chiude con il pagamento."),
   ("Lo registri di nuovo come costo nel nuovo anno", "Così conteresti due volte gli stessi interessi."),
   ("Lo trasformi in ricavo", "Un debito estinto non diventa un ricavo.")],
  "Alla rata del 31/1: Ratei passivi Dare 160 + Interessi Dare 80 / Banca Avere (oltre alla quota capitale).")
