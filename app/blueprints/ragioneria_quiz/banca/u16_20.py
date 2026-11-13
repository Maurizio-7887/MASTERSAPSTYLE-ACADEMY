"""Unità Q16–Q20: ratei e risconti, altri assestamenti e crediti, imposte, bilancio e chiusure, riapertura."""
from . import S, T, unita

# ═════════════════════════════════════════════════════════════════════════════
unita("Q16", "Ratei e risconti", [
    "RATEO: costo o ricavo già MATURATO nell'anno ma che si pagherà/incasserà dopo (nessuna registrazione ancora fatta).",
    "RISCONTO: costo o ricavo GIÀ REGISTRATO, ma una parte è di competenza dell'anno dopo: la si rinvia.",
    "Rateo passivo = costo maturato da pagare. Rateo attivo = ricavo maturato da incassare.",
    "Risconto attivo = costo rinviato. Risconto passivo = ricavo rinviato.",
    "Il calcolo si fa con i giorni o i mesi del periodo, non con percentuali a caso.",
    "Il risconto presuppone che il costo o il ricavo sia già stato registrato per intero.",
], {"testo": "Premio annuo 1.200 € pagato il 1/10: 9 mesi sono dell'anno dopo.", "righe": [("Risconti attivi", "D", 900), ("Premi di assicurazione", "A", 900)]})
q = lambda *a, **k: T("Q16", *a, **k)
s = lambda *a, **k: S("Q16", *a, **k)

s("Q16-01", 2, "Il 1/10 hai pagato e registrato il premio annuo di assicurazione di 1.200 € (1/10–30/9). 31/12: rinvia la parte di competenza dell'anno dopo.",
  [("Risconti attivi", "D", 900), ("Premi di assicurazione", "A", 900)],
  [([("Risconti attivi", "D", 300), ("Premi di assicurazione", "A", 300)], "300 € (ottobre–dicembre) sono di competenza di quest'anno: si rinviano i 9 mesi futuri, 900 €."),
   ([("Premi di assicurazione", "D", 900), ("Ratei passivi", "A", 900)], "Il costo è già pagato e registrato: serve un risconto attivo, non un rateo.")],
  "1.200 × 9/12 = 900 € rinviati.", origine="M24")
s("Q16-02", 2, "Il 1/11 hai incassato e registrato un fitto attivo semestrale anticipato di 1.800 € (1/11–30/4). 31/12: rinvia la parte dell'anno dopo.",
  [("Fitti attivi", "D", 1200), ("Risconti passivi", "A", 1200)],
  [([("Fitti attivi", "D", 600), ("Risconti passivi", "A", 600)], "Di competenza di quest'anno sono 2 mesi (600): si rinviano 4 mesi, 1.200."),
   ([("Merci c/vendite", "D", 1200), ("Risconti passivi", "A", 1200)], "Il ricavo da rettificare è il fitto attivo, non le vendite.")],
  "1.800 × 4/6 = 1.200 € rinviati al nuovo anno.", origine="M38")
s("Q16-03", 2, "Hai un deposito che matura 400 € di interessi all'anno, liquidati il 30/6. 31/12: rileva gli interessi maturati dal 1/7.",
  [("Ratei attivi", "D", 200), ("Interessi attivi bancari", "A", 200)],
  [([("Ratei attivi", "D", 200), ("Merci c/vendite", "A", 200)], "Sono interessi, non vendite: il conto di ricavo è Interessi attivi bancari."),
   ([("Risconti attivi", "D", 200), ("Interessi attivi bancari", "A", 200)], "Il ricavo non è ancora registrato né incassato: serve un rateo attivo.")],
  "400 × 6/12 = 200 € di ricavo maturato.", origine="M37")
s("Q16-04", 2, "Fitto passivo del capannone: 600 € al mese, pagato posticipato a trimestre (prossimo pagamento 31/1 per novembre–gennaio). 31/12: rileva il costo maturato.",
  [("Fitti passivi", "D", 1200), ("Ratei passivi", "A", 1200)],
  [([("Fitti passivi", "D", 1800), ("Ratei passivi", "A", 1800)], "Gennaio è dell'anno dopo: maturati solo novembre e dicembre (1.200)."),
   ([("Risconti attivi", "D", 1200), ("Fitti passivi", "A", 1200)], "Il fitto non è ancora pagato: è un costo da rilevare (rateo), non da rinviare.")],
  "2 mesi × 600 = 1.200 € di rateo passivo.")
q("Q16-05", 1, "Un rateo passivo è…",
  "un costo maturato nell'esercizio che si pagherà nell'esercizio successivo",
  [("un costo pagato in anticipo", "Quello è un risconto attivo."),
   ("un ricavo incassato in anticipo", "Quello è un risconto passivo."),
   ("un ricavo maturato da incassare", "Quello è un rateo attivo.")],
  "Rateo = maturato, non ancora pagato/incassato.")
q("Q16-06", 1, "Un risconto attivo è…",
  "la parte di un costo già registrato che appartiene all'esercizio successivo",
  [("un costo maturato da pagare", "Quello è un rateo passivo."),
   ("un credito verso un cliente", "È una rettifica di competenza, non un credito commerciale."),
   ("un ricavo rinviato", "Quello è un risconto passivo.")],
  "Risconto = rinvio di un costo o ricavo già registrato.")
q("Q16-07", 2, "Premio annuo di 2.400 € pagato il 1/4 (1/4–31/3). Quanto va a risconto attivo al 31/12?",
  "600 €",
  [("1.800 €", "Quella è la parte di competenza di quest'anno (9 mesi)."),
   ("2.400 €", "Una parte è già di competenza di quest'anno."),
   ("200 €", "Sono 3 mesi futuri: 3 × 200 = 600.")],
  "2.400 × 3/12 = 600 €.", area="applicazione")
q("Q16-08", 2, "Quali di questi sono ratei? (seleziona tutte le risposte corrette)",
  ["Interessi passivi maturati da pagare a gennaio", "Interessi attivi maturati da incassare a giugno"],
  [("Premio assicurativo pagato in anticipo per l'anno dopo", "È un risconto attivo."),
   ("Fitto attivo incassato in anticipo", "È un risconto passivo.")],
  "Ratei: componenti maturati con manifestazione finanziaria futura.", multi=True)
s("Q16-09", 2, "1/1: riapri il risconto attivo di 900 € sul premio assicurativo.",
  [("Premi di assicurazione", "D", 900), ("Risconti attivi", "A", 900)],
  [([("Risconti attivi", "D", 900), ("Premi di assicurazione", "A", 900)], "È la scrittura del 31/12, non la riapertura."),
   ([("Premi di assicurazione", "D", 900), ("Banca c/c", "A", 900)], "Il premio è già pagato: nessuna uscita di banca.")],
  "Il costo rinviato diventa costo del nuovo anno.")
q("Q16-10", 3, "Perché il risconto «presuppone la rilevazione originaria» del costo?",
  "Perché rinvia una parte di un costo già registrato: senza la registrazione iniziale non c'è nulla da rinviare",
  [("Perché lo chiede l'Agenzia delle Entrate", "È una regola di competenza contabile."),
   ("Perché si registra solo con la fattura dell'anno dopo", "Si registra al 31/12."),
   ("Non è vero: il risconto si fa sempre", "Senza costo registrato, la rettifica sarebbe un rateo.")],
  "Prima la fattura per intero, poi al 31/12 il rinvio della parte futura.", origine="M38")
q("Q16-11", 3, "Interessi di 360 € pagati posticipati il 31/3 per il periodo 1/10–31/3. Rateo passivo al 31/12?",
  "180 €",
  [("360 €", "Gennaio–marzo sono dell'anno dopo."),
   ("90 €", "Ottobre–dicembre sono 3 mesi: 360 × 3/6 = 180."),
   ("270 €", "Sono 3 mesi su 6, non 9 su 12.")],
  "360 × 3/6 = 180 €.", area="applicazione")
q("Q16-12", 2, "Il rateo attivo è nello stato patrimoniale tra…",
  "le attività",
  [("le passività", "Il rateo passivo è tra le passività."),
   ("il patrimonio netto", "Non è un mezzo proprio."),
   ("i ricavi", "Il ricavo è nel conto economico; il rateo è il credito che ne deriva.")],
  "Rateo attivo = credito di competenza.")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q17", "Altri assestamenti e crediti", [
    "Fatture da ricevere: costo dell'anno per merci/servizi già ricevuti ma non ancora fatturati (debito senza IVA, che arriverà con la fattura).",
    "Fatture da emettere: ricavo dell'anno per beni consegnati e non ancora fatturati; con DDT e fattura differita l'IVA è di dicembre.",
    "Svalutazione crediti: stima del rischio di non incassare → Svalutazione crediti (costo) / Fondo svalutazione crediti.",
    "Quando un credito diventa definitivamente inesigibile si usa prima il fondo; la parte eccedente è Perdita su crediti.",
    "Aspetti fiscali (deducibilità, recupero IVA) vanno dichiarati nel caso: qui si studia la regola contabile.",
])
q = lambda *a, **k: T("Q17", *a, **k)
s = lambda *a, **k: S("Q17", *a, **k)

s("Q17-01", 2, "31/12: hai consumato energia per 300 € a dicembre; la bolletta arriverà a gennaio.",
  [("Energia elettrica", "D", 300), ("Fatture da ricevere", "A", 300)],
  [([("Energia elettrica", "D", 300), ("IVA ns/credito", "D", 66), ("Fatture da ricevere", "A", 366)], "L'IVA si detrae solo quando arriva la fattura: oggi si rileva il costo."),
   ([("Energia elettrica", "D", 300), ("Debiti v/fornitori", "A", 300)], "Senza fattura non c'è ancora un debito di fornitura ordinario: si usa Fatture da ricevere.")],
  "Costo di competenza dell'anno in attesa del documento.")
s("Q17-02", 2, "31/12: il 30/12 hai consegnato con DDT merce per 1.500 € + IVA 22%; la fattura differita sarà emessa a gennaio, entro il 15.",
  [("Fatture da emettere", "D", 1830), ("Merci c/vendite", "A", 1500), ("IVA ns/debito", "A", 330)],
  [([("Fatture da emettere", "D", 1500), ("Merci c/vendite", "A", 1500)], "Con la fattura differita l'IVA è esigibile nel mese della consegna (dicembre): va rilevata ora, non a gennaio."),
   ([("Crediti v/clienti", "D", 1830), ("Merci c/vendite", "A", 1500), ("IVA ns/debito", "A", 330)], "La fattura non c'è ancora: il credito si rileva in Fatture da emettere; a gennaio la fattura lo riclassifica in Crediti v/clienti."),
   ([("Fatture da emettere", "D", 1830), ("Risconti passivi", "A", 1500), ("IVA ns/debito", "A", 330)], "Il ricavo è di quest'anno: va rilevato, non rinviato.")],
  "Ricavo e IVA di dicembre (consegna con DDT); a gennaio la fattura differita chiude Fatture da emettere senza duplicare ricavo e IVA.")
s("Q17-03", 2, "31/12: stimi che 500 € dei crediti verso clienti non saranno incassati.",
  [("Svalutazione crediti", "D", 500), ("Fondo svalutazione crediti", "A", 500)],
  [([("Perdite su crediti", "D", 500), ("Crediti v/clienti", "A", 500)], "È una stima, non una perdita certa: si accantona al fondo."),
   ([("Svalutazione crediti", "D", 500), ("Crediti v/clienti", "A", 500)], "Il credito resta intero: la riduzione passa dal fondo, come per l'ammortamento.")],
  "Costo stimato e fondo rettificativo dei crediti.", origine="M39")
s("Q17-04", 3, "Il cliente Delta fallisce: il credito di 2.000 € è definitivamente perso. Il fondo svalutazione ha 500 €. Ipotesi: nessun recupero IVA.",
  [("Fondo svalutazione crediti", "D", 500), ("Perdite su crediti", "D", 1500), ("Crediti v/clienti", "A", 2000)],
  [([("Perdite su crediti", "D", 2000), ("Crediti v/clienti", "A", 2000)], "Prima si usa il fondo accantonato: altrimenti il fondo resterebbe senza motivo."),
   ([("Fondo svalutazione crediti", "D", 2000), ("Crediti v/clienti", "A", 2000)], "Il fondo ha solo 500: non si può usare più di quanto è stato accantonato.")],
  "Utilizzo del fondo, perdita per l'eccedenza, eliminazione del credito.", origine="M45")
q("Q17-05", 1, "Il Fondo svalutazione crediti è…",
  "una rettifica in diminuzione dei crediti",
  [("un debito verso i clienti", "Non si deve nulla ai clienti."),
   ("denaro accantonato in banca", "Non è liquidità."),
   ("un costo", "Il costo è «Svalutazione crediti».")],
  "Crediti netti = crediti − fondo svalutazione.")
q("Q17-06", 2, "Crediti v/clienti 20.000 €, fondo svalutazione 800 €. Valore di realizzo presunto?",
  "19.200 €",
  [("20.800 €", "Il fondo si sottrae."),
   ("20.000 €", "Il fondo rettifica i crediti."),
   ("800 €", "È il fondo.")],
  "20.000 − 800 = 19.200 €.", area="applicazione")
q("Q17-07", 2, "Differenza tra «Fatture da ricevere» e «Debiti v/fornitori»?",
  "Fatture da ricevere è un debito stimato per un costo senza documento; Debiti v/fornitori nasce con la fattura",
  [("Nessuna", "Uno nasce senza fattura, l'altro con la fattura."),
   ("Fatture da ricevere è un credito", "È un debito: il fornitore ti ha già dato il bene o il servizio."),
   ("Fatture da ricevere comprende sempre l'IVA", "L'IVA arriva con la fattura.")],
  "Assestamento di competenza.")
q("Q17-08", 3, "Arriva a gennaio la bolletta di 300 € + IVA 66 € già rilevata a dicembre in Fatture da ricevere. Quale riga NON deve comparire?",
  "Energia elettrica in Dare per 300 €",
  [("Fatture da ricevere in Dare per 300 €", "Serve: chiude il debito stimato."),
   ("IVA ns/credito in Dare per 66 €", "Serve: l'IVA nasce ora con la fattura."),
   ("Debiti v/fornitori in Avere per 366 €", "Serve: nasce il debito vero verso il fornitore.")],
  "Il costo è già stato rilevato a dicembre: registrarlo di nuovo lo raddoppierebbe.")
q("Q17-09", 2, "Quali sono assestamenti di fine anno? (seleziona tutte le risposte corrette)",
  ["Svalutazione dei crediti", "Fatture da ricevere", "Ammortamenti"],
  [("Pagamento di una fattura fornitore", "È un'operazione di gestione, non un assestamento."),
   ("Emissione di una fattura di vendita", "È un'operazione di gestione.")],
  "Gli assestamenti adeguano i conti alla competenza e al valore di fine anno.", multi=True)
s("Q17-10", 3, "Recuperi inaspettatamente 300 € da un credito che avevi già eliminato come perdita l'anno scorso. Incasso in banca.",
  [("Banca c/c", "D", 300), ("Sopravvenienze attive", "A", 300)],
  [([("Banca c/c", "D", 300), ("Crediti v/clienti", "A", 300)], "Il credito era già stato eliminato: non c'è più nulla da chiudere."),
   ([("Banca c/c", "D", 300), ("Fondo svalutazione crediti", "A", 300)], "Il fondo serve per le perdite future stimate, non per i recuperi.")],
  "Un provento inatteso relativo a esercizi precedenti è una sopravvenienza attiva.")
q("Q17-11", 1, "Fatture da emettere è un conto di…",
  "attività",
  [("passività", "È un credito per un ricavo già maturato."),
   ("costo", "Rileva un ricavo."),
   ("patrimonio netto", "Non è un mezzo proprio.")],
  "Credito di competenza in attesa della fattura.")
q("Q17-12", 3, "Perché il fondo svalutazione crediti non si registra direttamente in Avere di Crediti v/clienti?",
  "Perché è una stima: si mantiene il credito nominale e si evidenzia separatamente il rischio",
  [("Perché il cliente deve ancora tutto e così resta chiaro nel partitario", "È anche vero per i partitari, ma il motivo principale è che si tratta di una stima."),
   ("Perché è vietato ridurre un credito", "I crediti si riducono con incassi e note di credito."),
   ("Perché il fondo è un debito", "Il fondo è una rettifica dell'attivo.")],
  "Il credito nominale resta; il fondo ne misura il rischio.")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q18", "Imposte e altri debiti", [
    "Imposte dell'anno (simulate nel corso): Imposte dell'esercizio (costo) / Debiti tributari.",
    "Gli acconti d'imposta pagati durante l'anno sono un CREDITO (Erario c/acconti d'imposta), non un costo.",
    "A fine anno gli acconti si compensano con il debito; si paga il saldo.",
    "Ritenuta d'acconto sul professionista: paghi il netto, trattieni il 20% dell'imponibile e lo versi con F24 entro il 16 del mese dopo.",
    "Pagare un debito tributario non è un nuovo costo.",
])
q = lambda *a, **k: T("Q18", *a, **k)
s = lambda *a, **k: S("Q18", *a, **k)

s("Q18-01", 2, "31/12: rilevi le imposte sul reddito dell'esercizio: 2.000 € (importo del caso).",
  [("Imposte dell'esercizio", "D", 2000), ("Debiti tributari", "A", 2000)],
  [([("Imposte dell'esercizio", "D", 2000), ("Banca c/c", "A", 2000)], "Le imposte si pagano l'anno dopo: oggi nasce il debito."),
   ([("Merci c/acquisti", "D", 2000), ("Debiti tributari", "A", 2000)], "Le imposte hanno un conto dedicato.")],
  "Costo di competenza e debito verso l'Erario.", origine="M26")
s("Q18-02", 2, "Durante l'anno versi acconti d'imposta per 800 € con F24.",
  [("Erario c/acconti d'imposta", "D", 800), ("Banca c/c", "A", 800)],
  [([("Imposte dell'esercizio", "D", 800), ("Banca c/c", "A", 800)], "L'acconto non è il costo: il costo si rileva a fine anno con il calcolo delle imposte."),
   ([("Debiti tributari", "D", 800), ("Banca c/c", "A", 800)], "Il debito per l'anno in corso non è ancora rilevato: l'acconto è un credito da compensare.")],
  "Acconto = credito verso l'Erario.", origine="M49")
s("Q18-03", 3, "31/12: compensi gli acconti di 800 € con il debito per imposte di 2.000 €.",
  [("Debiti tributari", "D", 800), ("Erario c/acconti d'imposta", "A", 800)],
  [([("Erario c/acconti d'imposta", "D", 800), ("Debiti tributari", "A", 800)], "Così aumenti sia il credito sia il debito invece di compensarli."),
   ([("Debiti tributari", "D", 800), ("Imposte dell'esercizio", "A", 800)], "Il costo resta 2.000: la compensazione riguarda credito e debito.")],
  "Resta un debito netto di 1.200 € da pagare a saldo.")
s("Q18-04", 2, "Paghi con F24 il saldo delle imposte: 1.200 €.",
  [("Debiti tributari", "D", 1200), ("Banca c/c", "A", 1200)],
  [([("Imposte dell'esercizio", "D", 1200), ("Banca c/c", "A", 1200)], "Il costo è già rilevato: il pagamento estingue il debito."),
   ([("Debiti tributari", "D", 2000), ("Banca c/c", "A", 2000)], "800 erano già coperti dagli acconti: si paga il saldo di 1.200.")],
  "Estinzione del debito tributario residuo.", origine="M50")
s("Q18-05", 2, "Ricevi la parcella di un consulente (persona fisica): 1.000 € + IVA 22% = 1.220 €.",
  [("Consulenze", "D", 1000), ("IVA ns/credito", "D", 220), ("Debiti v/fornitori", "A", 1220)],
  [([("Consulenze", "D", 1000), ("Erario c/ritenute", "A", 200), ("Banca c/c", "A", 800)], "La parcella non è ancora pagata e ha l'IVA: la ritenuta si applica al pagamento."),
   ([("Consulenze", "D", 1220), ("Debiti v/fornitori", "A", 1220)], "L'IVA detraibile va in IVA ns/credito.")],
  "Si registra la parcella come una normale fattura di servizi.", origine="M41")
s("Q18-06", 3, "Paghi la parcella di 1.220 € trattenendo la ritenuta d'acconto del 20% sull'imponibile (200 €). Bonifico 1.020 €.",
  [("Debiti v/fornitori", "D", 1220), ("Erario c/ritenute", "A", 200), ("Banca c/c", "A", 1020)],
  [([("Debiti v/fornitori", "D", 1220), ("Erario c/ritenute", "A", 244), ("Banca c/c", "A", 976)], "La ritenuta si calcola sull'imponibile (1.000), non sul totale con IVA."),
   ([("Debiti v/fornitori", "D", 1020), ("Banca c/c", "A", 1020)], "Va chiuso tutto il debito di 1.220: i 200 trattenuti diventano debito verso l'Erario.")],
  "Netto al professionista; ritenuta da versare all'Erario.", origine="M41")
s("Q18-07", 1, "Versi con F24 la ritenuta di 200 € trattenuta al consulente.",
  [("Erario c/ritenute", "D", 200), ("Banca c/c", "A", 200)],
  [([("Consulenze", "D", 200), ("Banca c/c", "A", 200)], "La ritenuta è parte del compenso già registrato: non è un nuovo costo."),
   ([("Imposte dell'esercizio", "D", 200), ("Banca c/c", "A", 200)], "Non è un'imposta dell'azienda: la versi per conto del professionista.")],
  "Estinzione del debito per ritenute.", origine="M48")
q("Q18-08", 1, "Gli acconti d'imposta pagati a giugno e novembre sono…",
  "crediti verso l'Erario da compensare con l'imposta dell'anno",
  [("costi dell'anno", "Il costo è l'imposta calcolata a fine anno."),
   ("debiti", "Li hai già pagati."),
   ("ricavi", "Pagare non genera ricavi.")],
  "Acconti = anticipi dell'imposta futura.", origine="M49")
q("Q18-09", 2, "Imposta dell'anno 3.000 €, acconti versati 2.200 €. Saldo da pagare?",
  "800 €",
  [("3.000 €", "Gli acconti riducono il saldo."),
   ("5.200 €", "Gli acconti si sottraggono."),
   ("2.200 €", "È quanto già versato.")],
  "3.000 − 2.200 = 800 €.", area="applicazione")
q("Q18-10", 2, "Parcella: imponibile 2.000 €, IVA 22%. Ritenuta del 20%. Quanto paghi al professionista?",
  "2.040 €",
  [("1.600 €", "Hai tolto la ritenuta ma dimenticato l'IVA (440)."),
   ("2.440 €", "Hai dimenticato di trattenere la ritenuta (400)."),
   ("1.952 €", "La ritenuta si calcola sull'imponibile, non sul totale con IVA.")],
  "2.000 + 440 − 400 = 2.040 €.", area="applicazione")
q("Q18-11", 3, "Il caso di dicembre è il primo mese di vita della società. Ha senso registrare a dicembre gli acconti d'imposta di giugno dello stesso anno?",
  "No: la società non esisteva; acconti e saldi si studiano in casi con anno e scadenze dichiarati",
  [("Sì, sempre", "Non si possono pagare acconti prima di esistere."),
   ("Sì, se l'utile è alto", "L'utile non c'entra con la cronologia."),
   ("No, perché le società non pagano imposte", "Le società pagano IRES e IRAP.")],
  "Coerenza temporale del caso.", origine="M49")
q("Q18-12", 2, "Quali sono debiti verso l'Erario? (seleziona tutte le risposte corrette)",
  ["Debiti tributari", "Erario c/ritenute"],
  [("Erario c/acconti d'imposta", "È un credito: l'hai già pagato in anticipo."),
   ("IVA ns/credito", "È un credito."),
   ("Imposte dell'esercizio", "È il costo.")],
  "Debiti tributari e ritenute da versare sono passività.", multi=True)

# ═════════════════════════════════════════════════════════════════════════════
unita("Q19", "Bilancio e chiusure", [
    "Ordine: bilancio di verifica → assestamenti → bilancio di verifica assestato → epilogo → chiusura patrimoniale.",
    "Epilogo: i costi si chiudono in Avere e vanno in Dare del Conto economico; i ricavi si chiudono in Dare e vanno in Avere del Conto economico.",
    "Saldo del Conto economico: se Avere > Dare è UTILE (Conto economico Dare / Utile d'esercizio Avere).",
    "Chiusura patrimoniale: attività in Avere / Stato patrimoniale finale Dare; passività e PN in Dare / Stato patrimoniale finale Avere.",
    "Gli importi di chiusura si prendono dai SALDI REALI dei conti, non da totali inventati.",
], {"testo": "Chiusura dei ricavi 10.100 € nel Conto economico.", "righe": [("Merci c/vendite", "D", 10100), ("Conto economico", "A", 10100)]})
q = lambda *a, **k: T("Q19", *a, **k)
s = lambda *a, **k: S("Q19", *a, **k)

s("Q19-01", 2, "Epilogo: chiudi il conto Merci c/vendite che ha saldo avere 10.100 €.",
  [("Merci c/vendite", "D", 10100), ("Conto economico", "A", 10100)],
  [([("Conto economico", "D", 10100), ("Merci c/vendite", "A", 10100)], "Così aumenti il ricavo invece di azzerarlo: un saldo avere si chiude in Dare."),
   ([("Merci c/vendite", "D", 10100), ("Utile d'esercizio", "A", 10100)], "I ricavi passano prima dal Conto economico: l'utile è la differenza tra ricavi e costi.")],
  "Il ricavo si azzera e passa in Avere del Conto economico.", origine="M27")
s("Q19-02", 2, "Epilogo: chiudi i costi con questi saldi dare: Merci c/acquisti 5.000 €, Salari e stipendi 2.500 €, Fitti passivi 500 €.",
  [("Conto economico", "D", 8000), ("Merci c/acquisti", "A", 5000), ("Salari e stipendi", "A", 2500), ("Fitti passivi", "A", 500)],
  [([("Conto economico", "D", 8000), ("Merci c/acquisti", "A", 8000)], "Ogni conto di costo si chiude con il proprio saldo: non si accorpa tutto in un conto."),
   ([("Merci c/acquisti", "D", 5000), ("Salari e stipendi", "D", 2500), ("Fitti passivi", "D", 500), ("Conto economico", "A", 8000)], "Sezioni invertite: un saldo dare si chiude in Avere.")],
  "Ogni costo si azzera con il suo saldo; il totale va in Dare del Conto economico.", origine="M28")
s("Q19-03", 2, "Conto economico: ricavi 10.100 €, costi 8.000 €. Rileva il risultato.",
  [("Conto economico", "D", 2100), ("Utile d'esercizio", "A", 2100)],
  [([("Utile d'esercizio", "D", 2100), ("Conto economico", "A", 2100)], "Questa sarebbe la rilevazione di una perdita."),
   ([("Conto economico", "D", 2100), ("Riserva legale", "A", 2100)], "La destinazione a riserva arriva dopo, con la delibera dell'assemblea.")],
  "Ricavi > costi: utile di 2.100 nel patrimonio netto.", origine="M29")
s("Q19-04", 3, "Conto economico: ricavi 6.000 €, costi 8.000 €. Rileva il risultato.",
  [("Perdita d'esercizio", "D", 2000), ("Conto economico", "A", 2000)],
  [([("Conto economico", "D", 2000), ("Utile d'esercizio", "A", 2000)], "Con costi superiori ai ricavi il risultato è una perdita."),
   ([("Perdita d'esercizio", "D", 2000), ("Capitale sociale", "A", 2000)], "Il conto economico va chiuso: la perdita non si gira direttamente sul capitale.")],
  "Costi > ricavi: il Conto economico ha saldo dare 2.000 da chiudere in Avere.")
s("Q19-05", 2, "Chiusura patrimoniale: chiudi Banca c/c (saldo dare 10.660 €).",
  [("Stato patrimoniale finale", "D", 10660), ("Banca c/c", "A", 10660)],
  [([("Banca c/c", "D", 10660), ("Stato patrimoniale finale", "A", 10660)], "Un saldo dare si chiude in Avere: così raddoppieresti la banca."),
   ([("Conto economico", "D", 10660), ("Banca c/c", "A", 10660)], "La banca è un conto patrimoniale: si chiude nello stato patrimoniale, non nel conto economico.")],
  "Le attività si chiudono in Avere verso lo Stato patrimoniale finale.")
s("Q19-06", 2, "Chiusura patrimoniale: chiudi Debiti v/fornitori (saldo avere 3.050 €).",
  [("Debiti v/fornitori", "D", 3050), ("Stato patrimoniale finale", "A", 3050)],
  [([("Stato patrimoniale finale", "D", 3050), ("Debiti v/fornitori", "A", 3050)], "Un saldo avere si chiude in Dare."),
   ([("Debiti v/fornitori", "D", 3050), ("Banca c/c", "A", 3050)], "La chiusura non è un pagamento.")],
  "Le passività si chiudono in Dare verso lo Stato patrimoniale finale.")
q("Q19-07", 1, "Quali conti vanno nel Conto economico all'epilogo?",
  "Solo i conti di costo e di ricavo (comprese variazioni delle rimanenze)",
  [("Tutti i conti", "I conti patrimoniali vanno allo stato patrimoniale finale."),
   ("Solo banca e cassa", "Sono conti patrimoniali."),
   ("Solo i conti IVA", "I conti IVA sono patrimoniali.")],
  "Epilogo = chiusura dei conti economici.")
q("Q19-08", 2, "In che ordine si chiude l'esercizio?",
  "Assestamenti, poi epilogo dei conti economici, poi chiusura dei conti patrimoniali",
  [("Chiusura patrimoniale, poi assestamenti", "Senza assestamenti i saldi da chiudere sarebbero sbagliati."),
   ("Epilogo prima degli assestamenti", "Gli assestamenti cambiano i costi e i ricavi da chiudere."),
   ("Prima la riapertura, poi la chiusura", "La riapertura è il primo giorno dell'anno dopo.")],
  "Assestamento → epilogo → utile/perdita → chiusura patrimoniale.")
q("Q19-09", 2, "Il bilancio di verifica non pareggia. Che cosa NON lo spiega?",
  "Un conto giusto ma con sezioni invertite in una scrittura che pareggiava",
  [("Una scrittura con Dare diverso da Avere", "Una scrittura sbilanciata sbilancia il bilancio di verifica."),
   ("Un saldo riportato male da un mastrino", "Un errore di riporto rompe il pareggio."),
   ("Un conto dimenticato nell'elenco dei saldi", "Manca un saldo: i totali non pareggiano.")],
  "Gli errori di conto o di sezione in scritture quadrate non si vedono dal pareggio: vanno cercati nei mastrini.")
q("Q19-10", 3, "Dopo l'epilogo i conti di costo e ricavo hanno saldo zero. Dove leggi ancora quanto valevano i ricavi?",
  "Nel Conto economico (in Avere), che li riepiloga prima della chiusura dell'utile",
  [("Nello stato patrimoniale finale", "Lì ci sono solo attività, passività e patrimonio netto."),
   ("Da nessuna parte: si perdono", "Restano nei mastrini e nel Conto economico."),
   ("Nel conto Banca", "La banca non dice quanto hai venduto.")],
  "Il conto economico resta leggibile anche dopo l'azzeramento dei conti.")
q("Q19-11", 2, "Utile d'esercizio 2.100 €. Prima della delibera dell'assemblea, l'utile si chiude…",
  "nello Stato patrimoniale finale come patrimonio netto",
  [("a Riserva legale automaticamente", "La destinazione la decide l'assemblea, l'anno dopo."),
   ("a Capitale sociale", "Serve una delibera."),
   ("nel Conto economico", "È proprio il saldo del Conto economico.")],
  "Utile d'esercizio Dare / Stato patrimoniale finale Avere.", origine="M29")
q("Q19-12", 3, "Totale attività 50.000 €, passività 32.000 €, capitale 15.000 €. Utile d'esercizio?",
  "3.000 €",
  [("18.000 €", "18.000 è il patrimonio netto totale, compreso il capitale."),
   ("35.000 €", "Hai sommato capitale e passività."),
   ("−3.000 €", "Il patrimonio netto (18.000) supera il capitale: è un utile.")],
  "PN = 50.000 − 32.000 = 18.000; utile = 18.000 − 15.000 = 3.000.", area="applicazione")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q20", "Riapertura e casi integrati", [
    "1/1: si riaprono i conti patrimoniali con il giro opposto alla chiusura (Stato patrimoniale iniziale).",
    "Si riversano ratei, risconti, fatture da ricevere/emettere e rimanenze del 31/12.",
    "I partitari clienti/fornitori riprendono con le stesse partite aperte.",
    "Gli errori si correggono con lo storno (scrittura opposta) e la registrazione giusta, in ordine cronologico.",
    "Ogni caso integrato si controlla incrociando: giornale → mastrini → partitari → bilancio.",
])
q = lambda *a, **k: T("Q20", *a, **k)
s = lambda *a, **k: S("Q20", *a, **k)

s("Q20-01", 2, "1/1: riapri Banca c/c, chiusa al 31/12 con saldo dare 10.660 €.",
  [("Banca c/c", "D", 10660), ("Stato patrimoniale iniziale", "A", 10660)],
  [([("Stato patrimoniale iniziale", "D", 10660), ("Banca c/c", "A", 10660)], "L'attività riparte con saldo dare: si riapre in Dare."),
   ([("Banca c/c", "D", 10660), ("Capitale sociale", "A", 10660)], "La riapertura non è un nuovo versamento dei soci.")],
  "Giro opposto alla chiusura.")
s("Q20-02", 2, "1/1: riapri Debiti v/fornitori, chiuso con saldo avere 3.050 €.",
  [("Stato patrimoniale iniziale", "D", 3050), ("Debiti v/fornitori", "A", 3050)],
  [([("Debiti v/fornitori", "D", 3050), ("Stato patrimoniale iniziale", "A", 3050)], "Il debito riparte con saldo avere: si riapre in Avere."),
   ([("Merci c/acquisti", "D", 3050), ("Debiti v/fornitori", "A", 3050)], "Il costo era dell'anno scorso: riaprendo così lo conteresti di nuovo.")],
  "La passività torna con il suo saldo avere.")
s("Q20-03", 2, "1/1: riapri l'utile d'esercizio di 2.100 € in attesa della delibera.",
  [("Stato patrimoniale iniziale", "D", 2100), ("Utile d'esercizio", "A", 2100)],
  [([("Conto economico", "D", 2100), ("Utile d'esercizio", "A", 2100)], "Il conto economico del nuovo anno parte da zero."),
   ([("Stato patrimoniale iniziale", "D", 2100), ("Merci c/vendite", "A", 2100)], "L'utile non è un ricavo del nuovo anno.")],
  "L'utile resta nel patrimonio netto fino alla destinazione.")
q("Q20-04", 1, "Alla riapertura quali conti si riaprono?",
  "Solo i conti patrimoniali",
  [("Tutti, anche costi e ricavi", "Costi e ricavi ripartono da zero ogni anno."),
   ("Solo banca e cassa", "Si riaprono tutte le attività, passività e il patrimonio netto."),
   ("Nessuno", "Senza riapertura mancherebbero i saldi iniziali.")],
  "Il patrimonio continua; il reddito ricomincia.")
q("Q20-05", 3, "Caso integrato. 1) Fattura acquisto 1.220 € (1.000 + IVA). 2) Pagamento 1.220 €. 3) Vendita 2.440 € (2.000 + IVA). 4) Incasso 1.000 €. Credito residuo verso il cliente?",
  "1.440 €",
  [("2.440 €", "Hai dimenticato l'incasso."),
   ("1.000 €", "È l'incasso, non il residuo."),
   ("220 €", "Hai confuso con l'IVA dell'acquisto.")],
  "2.440 − 1.000 = 1.440 €.", area="applicazione")
q("Q20-06", 3, "Stesso caso. Quanto vale l'IVA da versare nella liquidazione?",
  "220 €",
  [("440 €", "Va sottratta l'IVA detraibile sull'acquisto (220)."),
   ("660 €", "IVA a debito e a credito si sottraggono, non si sommano."),
   ("0 €", "L'IVA a debito (440) supera quella a credito (220).")],
  "440 − 220 = 220 € a debito.", area="applicazione")
q("Q20-07", 3, "Stesso caso, nessun'altra operazione. Utile?",
  "1.000 €",
  [("2.000 €", "Va tolto il costo d'acquisto (1.000)."),
   ("1.220 €", "L'IVA non è costo né ricavo."),
   ("−220 €", "L'IVA non entra nel conto economico.")],
  "Ricavi 2.000 − costi 1.000 = 1.000 (ipotesi: nessuna rimanenza).", area="applicazione")
s("Q20-08", 3, "Hai registrato una fattura di vendita di 1.220 € come «Crediti v/clienti Dare / Merci c/vendite Avere 1.220» dimenticando l'IVA. Correggi in un'unica scrittura.",
  [("Merci c/vendite", "D", 220), ("IVA ns/debito", "A", 220)],
  [([("Crediti v/clienti", "D", 220), ("IVA ns/debito", "A", 220)], "Il credito era già corretto (1.220): così chiederesti 220 € in più al cliente."),
   ([("IVA ns/debito", "D", 220), ("Merci c/vendite", "A", 220)], "Sezioni invertite: il ricavo va ridotto e l'IVA a debito va aumentata.")],
  "Si toglie dal ricavo la parte che è IVA (220) e la si sposta in IVA ns/debito.")
s("Q20-09", 2, "1/1: riapri le fatture da ricevere di 300 € rilevate al 31/12 per l'energia elettrica.",
  [("Stato patrimoniale iniziale", "D", 300), ("Fatture da ricevere", "A", 300)],
  [([("Energia elettrica", "D", 300), ("Fatture da ricevere", "A", 300)], "Il costo è dell'anno scorso: riaprendo così lo raddoppieresti."),
   ([("Fatture da ricevere", "D", 300), ("Stato patrimoniale iniziale", "A", 300)], "Il debito stimato riparte in Avere.")],
  "Si riapre il debito; alla fattura si chiuderà senza nuovo costo.")
q("Q20-10", 2, "Quale controllo incrociato conferma che i partitari clienti sono corretti?",
  "La somma dei residui dei partitari è uguale al saldo del conto Crediti v/clienti",
  [("La somma delle vendite è uguale ai crediti", "Le vendite non comprendono IVA e incassi."),
   ("Il saldo banca è uguale ai crediti", "Banca e crediti misurano cose diverse."),
   ("I partitari non si controllano", "Il controllo è fondamentale per scoprire errori di abbinamento.")],
  "Conto generale = somma dei conti analitici.")
q("Q20-11", 3, "In quale ordine conviene correggere un errore scoperto a febbraio su una registrazione di gennaio?",
  "Storno della scrittura errata e nuova registrazione corretta, con data e descrizione dell'errore",
  [("Cancellare la riga dal giornale", "Il giornale non si cancella: si corregge con scritture visibili."),
   ("Aspettare la chiusura dell'anno", "Gli errori si correggono appena scoperti."),
   ("Modificare il saldo del mastrino a mano", "Il mastrino deriva dal giornale: si corregge il giornale.")],
  "Tracciabilità: ogni correzione resta scritta.")
q("Q20-12", 2, "Dopo la riapertura, il Conto economico del nuovo anno parte…",
  "da zero: costi e ricavi del nuovo anno si registrano da capo",
  [("con l'utile dell'anno precedente", "L'utile è nel patrimonio netto, non nel conto economico."),
   ("con i ricavi dell'anno precedente", "I ricavi si chiudono ogni anno."),
   ("con i saldi di banca e cassa", "Sono conti patrimoniali.")],
  "Il conto economico misura il reddito di un solo esercizio.")
