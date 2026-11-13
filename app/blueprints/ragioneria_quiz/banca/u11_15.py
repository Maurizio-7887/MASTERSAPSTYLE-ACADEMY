"""Unità Q11–Q15: leasing, anticipo fatture, cespiti, cessione cespiti, magazzino e produzione."""
from . import S, T, unita

# ═════════════════════════════════════════════════════════════════════════════
unita("Q11", "Leasing", [
    "Quadro del corso: metodo PATRIMONIALE dei principi contabili italiani (OIC). Il bene in leasing NON è dell'azienda finché non lo riscatta.",
    "Ogni canone fatturato è un costo (Canoni di leasing) con IVA a credito.",
    "Il maxicanone iniziale si ripartisce su tutta la durata del contratto: a fine anno la parte futura va in Risconti attivi.",
    "Il deposito cauzionale versato è un credito (Depositi cauzionali attivi), non un costo.",
    "Al riscatto il bene entra tra le immobilizzazioni al prezzo di riscatto e da lì si ammortizza.",
    "Il bene in leasing non riscattato NON si ammortizza (non è nel tuo attivo).",
], {"testo": "Canone mensile 1.000 € + IVA.", "righe": [("Canoni di leasing", "D", 1000), ("IVA ns/credito", "D", 220), ("Debiti v/fornitori", "A", 1220)]})
q = lambda *a, **k: T("Q11", *a, **k)
s = lambda *a, **k: S("Q11", *a, **k)

s("Q11-01", 1, "Ricevi la fattura del canone mensile di leasing della pressa: 1.000 € + IVA 22% = 1.220 €.",
  [("Canoni di leasing", "D", 1000), ("IVA ns/credito", "D", 220), ("Debiti v/fornitori", "A", 1220)],
  [([("Impianti e macchinari", "D", 1000), ("IVA ns/credito", "D", 220), ("Debiti v/fornitori", "A", 1220)], "Con il metodo patrimoniale il bene non è tuo: il canone è un costo, non un cespite."),
   ([("Canoni di leasing", "D", 1000), ("IVA ns/credito", "D", 220), ("Mutui passivi", "A", 1220)], "Il debito è verso la società di leasing (fornitore), non un mutuo.")],
  "Canone = costo di godimento del bene di terzi.")
s("Q11-02", 2, "1/10: firmi il leasing e ricevi fattura del maxicanone: 6.000 € + IVA 22% = 7.320 €.",
  [("Canoni di leasing", "D", 6000), ("IVA ns/credito", "D", 1320), ("Debiti v/fornitori", "A", 7320)],
  [([("Risconti attivi", "D", 6000), ("IVA ns/credito", "D", 1320), ("Debiti v/fornitori", "A", 7320)], "Il risconto si calcola a fine anno, dopo aver registrato il costo della fattura."),
   ([("Impianti e macchinari", "D", 6000), ("IVA ns/credito", "D", 1320), ("Debiti v/fornitori", "A", 7320)], "Il maxicanone non fa diventare tuo il bene: è un canone pagato in anticipo.")],
  "Alla fattura si registra il costo; la competenza si sistema al 31/12.")
s("Q11-03", 3, "31/12: il maxicanone di 6.000 € (1/10) copre tutti i 36 mesi del contratto. Rinvia al futuro la parte non di competenza.",
  [("Risconti attivi", "D", 5500), ("Canoni di leasing", "A", 5500)],
  [([("Risconti attivi", "D", 6000), ("Canoni di leasing", "A", 6000)], "Ottobre, novembre e dicembre (3 mesi su 36) sono di competenza: 6.000 × 3/36 = 500 restano costo dell'anno."),
   ([("Canoni di leasing", "D", 5500), ("Ratei passivi", "A", 5500)], "Il costo è già stato registrato e pagato in anticipo: serve un risconto, non un rateo.")],
  "Risconto = 6.000 × 33/36 = 5.500 €.")
s("Q11-04", 2, "Versi con bonifico alla società di leasing un deposito cauzionale di 2.000 €, che ti sarà restituito a fine contratto.",
  [("Depositi cauzionali attivi", "D", 2000), ("Banca c/c", "A", 2000)],
  [([("Canoni di leasing", "D", 2000), ("Banca c/c", "A", 2000)], "La cauzione ti verrà restituita: è un credito, non un costo."),
   ([("Impianti e macchinari", "D", 2000), ("Banca c/c", "A", 2000)], "La cauzione non è parte del costo del bene.")],
  "Credito verso la società di leasing.")
s("Q11-05", 2, "Fine contratto: riscatti la pressa al prezzo di 1.000 € + IVA 22% = 1.220 €.",
  [("Impianti e macchinari", "D", 1000), ("IVA ns/credito", "D", 220), ("Debiti v/fornitori", "A", 1220)],
  [([("Canoni di leasing", "D", 1000), ("IVA ns/credito", "D", 220), ("Debiti v/fornitori", "A", 1220)], "Con il riscatto il bene diventa tuo: entra tra le immobilizzazioni."),
   ([("Impianti e macchinari", "D", 1220), ("Debiti v/fornitori", "A", 1220)], "L'IVA sul riscatto è detraibile: va separata.")],
  "Da ora il bene si ammortizza sul valore di riscatto.")
q("Q11-06", 1, "Con il metodo patrimoniale (OIC), il bene in leasing non ancora riscattato…",
  "non si iscrive tra le immobilizzazioni e non si ammortizza",
  [("si iscrive tra le immobilizzazioni al valore di mercato", "Questo è il metodo finanziario/IFRS 16, che il corso non usa."),
   ("si ammortizza come un bene proprio", "Si ammortizzano solo i beni di proprietà."),
   ("si registra come mutuo", "I canoni non sono rate di mutuo nel metodo patrimoniale.")],
  "Nel bilancio OIC il leasing appare nei costi (canoni) e in nota integrativa.")
q("Q11-07", 2, "Un leasing dura 36 mesi e inizia il 1/10. Quanti mesi di canoni periodici sono di competenza del primo anno?",
  "3 mesi",
  [("12 mesi", "Il contratto è partito a ottobre."),
   ("36 mesi", "36 è la durata totale."),
   ("9 mesi", "Da ottobre a dicembre i mesi sono 3.")],
  "Ottobre, novembre, dicembre.", area="applicazione")
q("Q11-08", 2, "Il deposito cauzionale versato alla società di leasing è…",
  "un credito che tornerà a fine contratto",
  [("un costo dell'anno", "Ti verrà restituito: non è un costo."),
   ("parte del prezzo di riscatto", "È separato, salvo diverso accordo dichiarato nel caso."),
   ("un debito", "È la società di leasing a dovertelo restituire.")],
  "Depositi cauzionali attivi = credito.")
q("Q11-09", 3, "Perché il maxicanone si risconta e non resta tutto costo del primo anno?",
  "Perché paga in anticipo il godimento del bene per tutta la durata del contratto",
  [("Perché lo chiede la banca", "È il principio di competenza."),
   ("Perché è IVA", "L'IVA è separata."),
   ("Perché è un deposito cauzionale", "Il maxicanone non viene restituito.")],
  "Competenza economica: il costo si distribuisce sui periodi che ne beneficiano.")
q("Q11-10", 2, "Quali affermazioni sul leasing (metodo patrimoniale) sono corrette? (seleziona tutte le risposte corrette)",
  ["Il canone è un costo con IVA detraibile", "Al riscatto il bene entra nelle immobilizzazioni"],
  [("La società utilizzatrice ammortizza il bene dal primo canone", "Fino al riscatto il bene non è suo."),
   ("Il maxicanone è sempre tutto costo del primo anno", "Va riscontato per la parte futura.")],
  "Canoni a costo per competenza; bene in bilancio solo dal riscatto.", multi=True)
s("Q11-11", 2, "1/1 dell'anno successivo: riapri il risconto attivo di 5.500 € sul maxicanone.",
  [("Canoni di leasing", "D", 5500), ("Risconti attivi", "A", 5500)],
  [([("Risconti attivi", "D", 5500), ("Canoni di leasing", "A", 5500)], "Questa è la scrittura del 31/12: all'apertura si fa il giro inverso."),
   ([("Canoni di leasing", "D", 5500), ("Banca c/c", "A", 5500)], "Il maxicanone è già pagato: nessuna uscita di banca.")],
  "Il costo rinviato rientra nel nuovo anno (poi a fine anno si risconta la parte ancora futura).")
q("Q11-12", 3, "Differenza tra leasing e mutuo per comprare una pressa:",
  "Con il mutuo la pressa è tua subito e la ammortizzi; con il leasing (OIC) paghi canoni a costo e diventa tua solo con il riscatto",
  [("Nessuna: sono due nomi della stessa cosa", "Cambiano proprietà del bene e registrazioni."),
   ("Con il leasing la pressa è tua subito", "È della società di leasing fino al riscatto."),
   ("Con il mutuo non si pagano interessi", "Il mutuo ha sempre una quota interessi.")],
  "Mutuo: cespite + debito. Leasing patrimoniale: canoni a costo + eventuale riscatto.")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q12", "Anticipo fatture e banche", [
    "Con l'anticipo su fatture la banca ti presta una percentuale (es. 80%) del credito verso il cliente: il credito resta tuo.",
    "All'erogazione: Banca c/c in Dare, Banche c/anticipi su fatture (DEBITO verso la banca) in Avere.",
    "Quando il cliente paga alla banca, si chiudono il credito e il debito per l'anticipo; l'eventuale eccedenza entra in conto.",
    "Interessi e commissioni dell'anticipo sono costi.",
    "Se il cliente non paga (insoluto), la banca riaddebita l'anticipo e il credito diventa insoluto.",
    "Il factoring pro soluto è diverso: il credito viene CEDUTO e esce dal bilancio.",
])
q = lambda *a, **k: T("Q12", *a, **k)
s = lambda *a, **k: S("Q12", *a, **k)

s("Q12-01", 2, "Presenti in banca una fattura di 10.000 € per l'anticipo: la banca accredita l'80% = 8.000 €.",
  [("Banca c/c", "D", 8000), ("Banche c/anticipi su fatture", "A", 8000)],
  [([("Banca c/c", "D", 8000), ("Crediti v/clienti", "A", 8000)], "Il cliente non ha ancora pagato: il credito resta aperto; nasce un debito verso la banca."),
   ([("Banca c/c", "D", 8000), ("Merci c/vendite", "A", 8000)], "Il ricavo è già registrato con la fattura: l'anticipo è un finanziamento.")],
  "La banca ti presta denaro: aumentano liquidità e debiti finanziari.", origine="M12")
s("Q12-02", 3, "Il cliente paga i 10.000 € alla banca: la banca chiude l'anticipo di 8.000 € e accredita la differenza.",
  [("Banche c/anticipi su fatture", "D", 8000), ("Banca c/c", "D", 2000), ("Crediti v/clienti", "A", 10000)],
  [([("Banca c/c", "D", 10000), ("Crediti v/clienti", "A", 10000)], "In conto entrano solo 2.000: gli 8.000 servono a chiudere il debito per l'anticipo, che altrimenti resterebbe aperto."),
   ([("Banche c/anticipi su fatture", "D", 8000), ("Banca c/c", "D", 2000), ("Merci c/vendite", "A", 10000)], "Si chiude il credito, non si registra un nuovo ricavo.")],
  "Si chiudono credito e anticipo; entra l'eccedenza.")
s("Q12-03", 2, "La banca addebita 95 € di interessi e commissioni sull'anticipo fatture.",
  [("Interessi passivi bancari", "D", 95), ("Banca c/c", "A", 95)],
  [([("Banche c/anticipi su fatture", "D", 95), ("Banca c/c", "A", 95)], "Gli interessi sono un costo, non un rimborso dell'anticipo."),
   ([("Interessi passivi su mutui", "D", 95), ("Banca c/c", "A", 95)], "Non c'è nessun mutuo: sono interessi bancari sull'anticipo.")],
  "Costo finanziario dell'anticipo.")
s("Q12-04", 3, "Il cliente non paga la fattura anticipata di 10.000 €: la banca riaddebita in conto l'anticipo di 8.000 €.",
  [("Banche c/anticipi su fatture", "D", 8000), ("Banca c/c", "A", 8000)],
  [([("Perdite su crediti", "D", 8000), ("Banca c/c", "A", 8000)], "La banca chiude il suo prestito: per te non è ancora una perdita, il credito verso il cliente resta."),
   ([("Banca c/c", "D", 8000), ("Banche c/anticipi su fatture", "A", 8000)], "È il contrario: il denaro esce dal conto per restituire l'anticipo.")],
  "Si estingue il debito verso la banca (poi si gira il credito a insoluti).")
s("Q12-05", 2, "Dopo l'insoluto, evidenzi il credito di 10.000 € come insoluto.",
  [("Crediti insoluti", "D", 10000), ("Crediti v/clienti", "A", 10000)],
  [([("Crediti insoluti", "D", 8000), ("Crediti v/clienti", "A", 8000)], "Insoluto è l'intero credito (10.000), non solo la parte anticipata."),
   ([("Perdite su crediti", "D", 10000), ("Crediti v/clienti", "A", 10000)], "Il credito può ancora essere recuperato: non è una perdita.")],
  "Il credito scaduto si segue a parte.")
q("Q12-06", 1, "«Banche c/anticipi su fatture» è…",
  "un debito verso la banca",
  [("denaro disponibile in conto", "Il denaro è in Banca c/c; questo conto misura quanto devi restituire."),
   ("un credito verso il cliente", "Il credito verso il cliente resta in Crediti v/clienti."),
   ("un ricavo finanziario", "Ricevere un anticipo non è un ricavo.")],
  "È una passività finanziaria a breve.", origine="M12")
q("Q12-07", 2, "Con l'anticipo su fatture, il credito verso il cliente…",
  "resta nel tuo bilancio fino all'incasso",
  [("esce dal bilancio perché passa alla banca", "Succede con il factoring pro soluto, non con l'anticipo."),
   ("diventa un ricavo", "Il ricavo è già registrato con la fattura."),
   ("si riduce dell'80%", "Il credito resta intero; la banca ti presta una parte.")],
  "L'anticipo è un finanziamento garantito dal credito.")
q("Q12-08", 3, "Factoring PRO SOLUTO: che cosa cambia rispetto all'anticipo fatture?",
  "Il credito viene ceduto a titolo definitivo e il rischio di mancato pagamento passa al factor",
  [("Nulla", "Il trasferimento del rischio cambia la contabilizzazione."),
   ("Il cliente paga a te e tu giri il denaro alla banca", "Nel pro soluto il cliente paga il factor."),
   ("Il credito si raddoppia", "Non c'è nessun raddoppio.")],
  "Nel pro soluto il credito si elimina dal bilancio; nell'anticipo resta.")
q("Q12-09", 2, "Hai anticipato 8.000 € su una fattura di 10.000 €; il cliente paga. Quanto entra in più sul conto corrente?",
  "2.000 €",
  [("10.000 €", "8.000 servono a chiudere l'anticipo già ricevuto."),
   ("8.000 €", "8.000 li avevi già ricevuti all'erogazione."),
   ("0 €", "Resta la differenza tra credito e anticipo.")],
  "10.000 − 8.000 = 2.000 €.", area="applicazione")
q("Q12-10", 2, "Registrare l'anticipo come Dare e Avere sullo stesso conto («conti d'ordine») è utile per insegnare l'anticipo fatture?",
  "No: non rileva né il debito verso la banca né la liquidità ricevuta",
  [("Sì: è la registrazione corretta", "Una scrittura su un solo conto non modifica nulla e nasconde il debito."),
   ("Sì, ma solo se l'anticipo supera 10.000 €", "L'importo non cambia la natura dell'operazione."),
   ("No: l'anticipo non si registra mai", "L'erogazione si registra: Banca c/c / Banche c/anticipi su fatture.")],
  "Le informazioni gestionali sui crediti presentati si tengono a parte; in contabilità si registra il finanziamento.", origine="M13")
q("Q12-11", 1, "Interessi e commissioni sull'anticipo fatture sono…",
  "costi finanziari dell'esercizio",
  [("riduzioni del credito verso il cliente", "Il cliente non c'entra con il costo del finanziamento."),
   ("parte del ricavo di vendita", "Sono costi, non ricavi."),
   ("immobilizzazioni", "Non sono beni durevoli.")],
  "Oneri finanziari a conto economico.")
q("Q12-12", 3, "Quali righe compaiono quando il cliente paga una fattura anticipata? (seleziona tutte le risposte corrette)",
  ["Banche c/anticipi su fatture in Dare", "Crediti v/clienti in Avere"],
  [("Merci c/vendite in Avere", "Il ricavo è già registrato."),
   ("Banche c/anticipi su fatture in Avere", "In Avere il debito aumenterebbe: succede all'erogazione.")],
  "Si chiudono l'anticipo e il credito (più l'eventuale eccedenza in banca).", multi=True)

# ═════════════════════════════════════════════════════════════════════════════
unita("Q13", "Cespiti", [
    "Il cespite si iscrive al costo d'acquisto più gli oneri accessori (trasporto, montaggio, collaudo).",
    "L'ammortamento ripartisce il costo sugli anni di utilizzo: Ammortamento (costo) in Dare, F.do ammortamento in Avere.",
    "Valore netto contabile = costo storico − fondo ammortamento.",
    "L'ammortamento parte dall'entrata in funzione del bene; nel primo anno si usa spesso la metà del coefficiente (ipotesi dichiarata nel caso).",
    "Il fondo ammortamento non è denaro e non è un debito.",
])
q = lambda *a, **k: T("Q13", *a, **k)
s = lambda *a, **k: S("Q13", *a, **k)

s("Q13-01", 1, "31/12: rilevi la quota di ammortamento del macchinario: 1.800 €.",
  [("Ammortamento impianti e macchinari", "D", 1800), ("F.do amm. impianti e macchinari", "A", 1800)],
  [([("Ammortamento impianti e macchinari", "D", 1800), ("Impianti e macchinari", "A", 1800)], "Il cespite resta al costo storico: la riduzione passa dal fondo."),
   ([("Ammortamento impianti e macchinari", "D", 1800), ("Banca c/c", "A", 1800)], "L'ammortamento non è un'uscita di denaro.")],
  "Costo dell'anno in Dare; fondo in Avere.", origine="M21")
s("Q13-02", 2, "Compri un macchinario: 12.000 € + trasporto e montaggio 800 €, IVA 22% su tutto (2.816 €), totale 15.616 €.",
  [("Impianti e macchinari", "D", 12800), ("IVA ns/credito", "D", 2816), ("Debiti v/fornitori", "A", 15616)],
  [([("Impianti e macchinari", "D", 12000), ("Merci c/acquisti", "D", 800), ("IVA ns/credito", "D", 2816), ("Debiti v/fornitori", "A", 15616)], "Trasporto e montaggio sono oneri accessori: fanno parte del costo del cespite."),
   ([("Impianti e macchinari", "D", 15616), ("Debiti v/fornitori", "A", 15616)], "L'IVA detraibile non entra nel costo del bene.")],
  "Costo del cespite = prezzo + oneri accessori.")
q("Q13-03", 2, "Macchinario da 12.800 €, coefficiente 15%, entrato in funzione a settembre. Ipotesi del caso: primo anno a metà coefficiente. Quota?",
  "960 €",
  [("1.920 €", "È la quota piena: il caso prevede la metà nel primo anno."),
   ("640 €", "Hai calcolato il 5%, non il 7,5%."),
   ("12.800 €", "Il costo non si ammortizza tutto in un anno.")],
  "12.800 × 15% ÷ 2 = 960 €.", area="applicazione")
q("Q13-04", 1, "Che cos'è il valore netto contabile di un cespite?",
  "Costo storico meno fondo ammortamento",
  [("Il prezzo a cui potresti venderlo oggi", "Quello è il valore di mercato."),
   ("Il fondo ammortamento", "Il fondo è solo la parte già ammortizzata."),
   ("Costo storico più fondo ammortamento", "Il fondo si sottrae.")],
  "VNC = costo − fondo.")
q("Q13-05", 2, "Costo 20.000 €, fondo ammortamento 14.000 €. Valore netto contabile?",
  "6.000 €",
  [("34.000 €", "Il fondo si sottrae, non si somma."),
   ("14.000 €", "Quello è il fondo."),
   ("20.000 €", "È il costo storico, prima dell'ammortamento.")],
  "20.000 − 14.000 = 6.000 €.", area="applicazione")
q("Q13-06", 2, "Il fondo ammortamento è…",
  "una rettifica contabile del valore del cespite, non denaro accantonato",
  [("un conto in banca per ricomprare il bene", "Non c'è nessun denaro vincolato."),
   ("un debito verso il fornitore", "Il fornitore si paga con il debito di fornitura."),
   ("un ricavo", "È una posta rettificativa dell'attivo.")],
  "Si legge in diminuzione del cespite.")
q("Q13-07", 3, "Un bene acquistato a dicembre ma installato e collaudato a febbraio dell'anno dopo. Quando inizia l'ammortamento?",
  "Dall'entrata in funzione, a febbraio dell'anno dopo",
  [("A dicembre, alla fattura", "L'ammortamento parte quando il bene è disponibile e pronto per l'uso."),
   ("Al pagamento", "Il pagamento non c'entra."),
   ("Mai, finché non è pagato del tutto", "Il pagamento non c'entra con l'ammortamento.")],
  "Il bene si ammortizza dal momento in cui è pronto all'uso.")
s("Q13-08", 2, "Ammortamento annuo dell'arredamento d'ufficio: 300 €.",
  [("Ammortamento arredamento", "D", 300), ("F.do amm. arredamento", "A", 300)],
  [([("Ammortamento impianti e macchinari", "D", 300), ("F.do amm. impianti e macchinari", "A", 300)], "Si usano i conti del cespite giusto: arredamento."),
   ([("Arredamento", "D", 300), ("F.do amm. arredamento", "A", 300)], "Il cespite non aumenta: il costo dell'anno è l'ammortamento.")],
  "Un conto di ammortamento e un fondo per ogni categoria di cespite.", origine="M21")
q("Q13-09", 2, "Quali di questi costi fanno parte del costo del cespite? (seleziona tutte le risposte corrette)",
  ["Trasporto fino allo stabilimento", "Montaggio e collaudo"],
  [("Manutenzione ordinaria dopo un anno", "È un costo d'esercizio dell'anno in cui si sostiene."),
   ("Interessi del mutuo degli anni successivi", "Sono oneri finanziari dell'anno."),
   ("IVA detraibile", "Va in IVA ns/credito.")],
  "Oneri accessori necessari a rendere il bene utilizzabile.", multi=True)
s("Q13-10", 3, "Compri un furgone: 20.000 € + IVA 4.400 €. Ipotesi del caso: IVA detraibile al 100% (furgone strumentale). Paghi con bonifico.",
  [("Automezzi", "D", 20000), ("IVA ns/credito", "D", 4400), ("Banca c/c", "A", 24400)],
  [([("Automezzi", "D", 24400), ("Banca c/c", "A", 24400)], "Nel caso l'IVA è interamente detraibile: non entra nel costo."),
   ([("Automezzi", "D", 20000), ("IVA ns/credito", "D", 4400), ("Debiti v/fornitori", "A", 24400)], "Hai pagato subito: la banca diminuisce, non nasce un debito.")],
  "Cespite + IVA a credito; uscita di banca.")
q("Q13-11", 1, "L'ammortamento comporta un'uscita di denaro?",
  "No: è un costo che non genera pagamenti",
  [("Sì, verso il fornitore del bene", "Il fornitore si paga con la fattura d'acquisto."),
   ("Sì, verso l'Erario", "Non è un'imposta."),
   ("Sì, verso la banca", "Non è un interesse.")],
  "Costo non monetario: per questo si somma all'utile nel rendiconto finanziario.")
q("Q13-12", 3, "Perché non si registra tutto il costo di un macchinario nell'anno di acquisto?",
  "Perché il macchinario serve per più anni: il costo si distribuisce sugli esercizi che ne beneficiano",
  [("Perché il fornitore non lo permette", "È una regola contabile, non contrattuale."),
   ("Per pagare meno IVA", "L'IVA non dipende dall'ammortamento."),
   ("Perché non è ancora pagato", "Il pagamento non conta per la competenza.")],
  "Competenza economica pluriennale.")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q14", "Cessione e dismissione dei cespiti", [
    "Prima della cessione si registra l'eventuale ammortamento fino alla data di vendita (se previsto dal caso).",
    "Alla vendita si chiudono costo storico (Avere) e fondo ammortamento (Dare).",
    "Prezzo > valore netto → Plusvalenza (ricavo). Prezzo < valore netto → Minusvalenza (costo).",
    "La vendita di un cespite si fattura con IVA: nasce un credito verso il compratore.",
    "Rottamazione di un bene interamente ammortizzato: si chiudono costo e fondo, nessuna plus/minusvalenza.",
])
q = lambda *a, **k: T("Q14", *a, **k)
s = lambda *a, **k: S("Q14", *a, **k)

s("Q14-01", 3, "Vendi un macchinario: costo 3.000 €, fondo 2.200 € (VNC 800 €). Prezzo 1.100 € + IVA 22% = 1.342 €, fattura a credito.",
  [("Crediti v/clienti", "D", 1342), ("F.do amm. impianti e macchinari", "D", 2200), ("Impianti e macchinari", "A", 3000), ("Plusvalenze", "A", 300), ("IVA ns/debito", "A", 242)],
  [([("Crediti v/clienti", "D", 1342), ("Impianti e macchinari", "A", 1100), ("IVA ns/debito", "A", 242)], "Restano aperti costo residuo e fondo: il macchinario rimarrebbe in bilancio anche se venduto."),
   ([("Crediti v/clienti", "D", 1100), ("F.do amm. impianti e macchinari", "D", 2200), ("Impianti e macchinari", "A", 3000), ("Plusvalenze", "A", 300)], "Manca l'IVA: la cessione di un bene strumentale è imponibile."),
   ([("Crediti v/clienti", "D", 1342), ("F.do amm. impianti e macchinari", "D", 2200), ("Impianti e macchinari", "A", 3000), ("Merci c/vendite", "A", 300), ("IVA ns/debito", "A", 242)], "Il guadagno sulla vendita di un cespite è una plusvalenza, non una vendita di merci.")],
  "Si chiudono costo e fondo; prezzo 1.100 − VNC 800 = plusvalenza 300.", origine="M40")
s("Q14-02", 3, "Vendi un macchinario: costo 4.000 €, fondo 2.500 € (VNC 1.500 €). Prezzo 900 € + IVA 22% = 1.098 €, fattura a credito.",
  [("Crediti v/clienti", "D", 1098), ("F.do amm. impianti e macchinari", "D", 2500), ("Minusvalenze", "D", 600), ("Impianti e macchinari", "A", 4000), ("IVA ns/debito", "A", 198)],
  [([("Crediti v/clienti", "D", 1098), ("F.do amm. impianti e macchinari", "D", 2500), ("Impianti e macchinari", "A", 4000), ("Plusvalenze", "D", 600), ("IVA ns/debito", "A", 198)], "Il risultato è giusto nei numeri ma il conto no: vendere sotto il valore netto genera una minusvalenza."),
   ([("Banca c/c", "D", 900), ("F.do amm. impianti e macchinari", "D", 2500), ("Minusvalenze", "D", 600), ("Impianti e macchinari", "A", 4000)], "La vendita è con fattura a credito e con IVA: non è un incasso immediato senza IVA.")],
  "Prezzo 900 − VNC 1.500 = minusvalenza 600 (costo).", origine="M53")
s("Q14-03", 2, "Rottami un macchinario completamente ammortizzato: costo 1.500 €, fondo 1.500 €. Nessun incasso.",
  [("F.do amm. impianti e macchinari", "D", 1500), ("Impianti e macchinari", "A", 1500)],
  [([("Minusvalenze", "D", 1500), ("Impianti e macchinari", "A", 1500)], "Il bene è già tutto ammortizzato: non c'è nessuna perdita, si chiude il fondo."),
   ([("Ammortamento impianti e macchinari", "D", 1500), ("F.do amm. impianti e macchinari", "A", 1500)], "Così aggiungi un altro ammortamento invece di eliminare il bene.")],
  "Si eliminano costo e fondo: VNC zero, nessun effetto economico.", origine="M52")
q("Q14-04", 2, "Costo 10.000 €, fondo 7.000 €, prezzo di vendita 2.000 €. Risultato?",
  "Minusvalenza di 1.000 €",
  [("Plusvalenza di 2.000 €", "Il prezzo va confrontato con il valore netto (3.000), non con zero."),
   ("Plusvalenza di 1.000 €", "Il prezzo è inferiore al valore netto: è una perdita."),
   ("Minusvalenza di 8.000 €", "Va confrontato con il valore netto, non con il costo storico.")],
  "VNC = 3.000; 2.000 − 3.000 = −1.000.", area="applicazione")
q("Q14-05", 2, "Costo 8.000 €, fondo 6.000 €, prezzo 2.500 €. Risultato?",
  "Plusvalenza di 500 €",
  [("Minusvalenza di 500 €", "Il prezzo supera il valore netto (2.000)."),
   ("Plusvalenza di 2.500 €", "Il prezzo si confronta con il valore netto."),
   ("Nessun risultato", "Prezzo e valore netto sono diversi.")],
  "2.500 − 2.000 = 500 di plusvalenza.", area="applicazione")
s("Q14-06", 2, "Incassi con bonifico il credito di 1.342 € per la vendita del macchinario.",
  [("Banca c/c", "D", 1342), ("Crediti v/clienti", "A", 1342)],
  [([("Banca c/c", "D", 1342), ("Plusvalenze", "A", 1342)], "La plusvalenza è già stata rilevata con la fattura: ora si incassa il credito."),
   ([("Banca c/c", "D", 1342), ("Impianti e macchinari", "A", 1342)], "Il cespite è già stato eliminato con la vendita.")],
  "L'incasso chiude il credito, non sostituisce la fattura.", origine="M40")
q("Q14-07", 1, "La plusvalenza da cessione di un cespite è…",
  "un componente positivo di reddito",
  [("un aumento del capitale sociale", "Il capitale cambia solo con delibera."),
   ("un debito verso il compratore", "Il compratore deve pagare te."),
   ("una rettifica dell'IVA", "L'IVA è separata.")],
  "Ricavo non caratteristico nel conto economico.")
q("Q14-08", 3, "Vendi il 30/6 un bene ammortizzato al 20% annuo. Ipotesi del caso: si ammortizza fino alla data di vendita. Che cosa fai PRIMA della scrittura di vendita?",
  "Registri l'ammortamento dal 1/1 al 30/6 (metà quota annua)",
  [("Niente: si parte dal fondo al 31/12 precedente", "Così il valore netto alla vendita sarebbe sopravvalutato."),
   ("Registri l'ammortamento di tutto l'anno", "Il bene è stato usato solo fino al 30/6."),
   ("Storni tutto il fondo", "Il fondo si chiude con la vendita, non prima.")],
  "Il fondo deve essere aggiornato alla data di cessione.")
q("Q14-09", 2, "Quali righe compaiono sempre nella vendita di un cespite parzialmente ammortizzato? (seleziona tutte le risposte corrette)",
  ["Il cespite in Avere per il costo storico", "Il fondo ammortamento in Dare"],
  [("Il cespite in Dare", "In Dare aumenterebbe: il bene invece esce."),
   ("Il fondo ammortamento in Avere", "In Avere aumenterebbe: il fondo invece si chiude.")],
  "Si eliminano dal bilancio costo e fondo del bene venduto.", multi=True)
q("Q14-10", 3, "Nella vendita di un cespite, perché non basta registrare «Banca c/c Dare / Impianti Avere» per il prezzo?",
  "Perché resterebbero in bilancio il residuo del costo e il fondo, e mancherebbero IVA e plus/minusvalenza",
  [("Basta, se il prezzo è pagato subito", "Anche con il pagamento subito vanno chiusi costo e fondo."),
   ("Perché manca l'ammortamento dell'anno successivo", "Dopo la vendita non si ammortizza più."),
   ("Perché manca il capitale sociale", "Il capitale non c'entra.")],
  "La cessione è un'operazione completa: fattura, eliminazione del bene, risultato.")
s("Q14-11", 2, "Vendi per 0 € (cessione gratuita a un ente, ipotesi: senza IVA) un arredo con costo 1.000 € e fondo 800 €.",
  [("F.do amm. arredamento", "D", 800), ("Minusvalenze", "D", 200), ("Arredamento", "A", 1000)],
  [([("F.do amm. arredamento", "D", 1000), ("Arredamento", "A", 1000)], "Il fondo è 800, non 1.000: il valore residuo di 200 si perde."),
   ([("Minusvalenze", "D", 1000), ("Arredamento", "A", 1000)], "Il fondo va chiuso: la perdita è solo il valore netto (200).")],
  "La perdita è pari al valore netto residuo.")
q("Q14-12", 1, "Nella rottamazione di un bene interamente ammortizzato il conto economico…",
  "non è toccato",
  [("registra una minusvalenza pari al costo", "Il costo è già passato a conto economico con gli ammortamenti."),
   ("registra un ricavo", "Non c'è nessun incasso."),
   ("registra un nuovo ammortamento", "Il bene è già tutto ammortizzato.")],
  "Si chiudono solo costo e fondo.", origine="M52")

# ═════════════════════════════════════════════════════════════════════════════
unita("Q15", "Magazzino e produzione", [
    "Il magazzino si misura in QUANTITÀ e in VALORE: quantità × costo unitario.",
    "Materie prime → semilavorati (HALB) → prodotti finiti (FERT); la produzione in corso è WIP.",
    "Metodo periodico (quello dei quesiti, salvo diversa indicazione): gli acquisti vanno a costo; a fine anno le rimanenze finali rettificano il costo con «Variazione rimanenze».",
    "31/12: Merci D / Variazione rimanenze A; epilogo Variazione rimanenze D / Conto economico A; chiusura SP finale D / Merci A.",
    "1/1: riapertura Merci D / SP iniziale A; poi giro a costo Variazione rimanenze D / Merci A.",
    "Se il gestionale tiene già il magazzino a valore (metodo permanente), non si iscrivono le rimanenze una seconda volta.",
    "Un trasferimento interno tra depositi non cambia il valore totale del magazzino.",
])
q = lambda *a, **k: T("Q15", *a, **k)
s = lambda *a, **k: S("Q15", *a, **k)

s("Q15-01", 2, "31/12, metodo periodico: l'inventario delle merci vale 3.000 €. Rileva le rimanenze finali.",
  [("Merci", "D", 3000), ("Variazione rimanenze merci", "A", 3000)],
  [([("Variazione rimanenze merci", "D", 3000), ("Merci", "A", 3000)], "Questa è il giro a costo delle rimanenze iniziali del 1° gennaio, non la rilevazione del 31/12."),
   ([("Merci", "D", 3000), ("Merci c/vendite", "A", 3000)], "Le rimanenze non sono vendite: rettificano i costi d'acquisto.")],
  "Le merci non vendute diventano attività e riducono il costo dell'esercizio.", origine="M22")
s("Q15-02", 2, "1/1, dopo la riapertura dei conti (Merci già riaperte dallo Stato patrimoniale iniziale): riporta a costo le rimanenze iniziali di merci di 3.000 €.",
  [("Variazione rimanenze merci", "D", 3000), ("Merci", "A", 3000)],
  [([("Merci", "D", 3000), ("Variazione rimanenze merci", "A", 3000)], "Questa è la rilevazione delle rimanenze finali, non la riapertura."),
   ([("Merci c/acquisti", "D", 3000), ("Merci", "A", 3000)], "Le rimanenze iniziali non sono nuovi acquisti.")],
  "Le rimanenze iniziali diventano costo del nuovo anno: è la seconda scrittura del 1/1, dopo Merci / Stato patrimoniale iniziale.")
s("Q15-03", 2, "31/12: in magazzino restano 40 transenne finite del valore di 55 € l'una (metodo periodico).",
  [("Prodotti finiti", "D", 2200), ("Variazione rimanenze prodotti finiti", "A", 2200)],
  [([("Merci", "D", 2200), ("Variazione rimanenze merci", "A", 2200)], "Le transenne le produci tu: sono prodotti finiti, non merci acquistate per la rivendita."),
   ([("Prodotti finiti", "D", 55), ("Variazione rimanenze prodotti finiti", "A", 55)], "Il valore è quantità × costo: 40 × 55 = 2.200.")],
  "Prodotti finiti valorizzati al costo di produzione.")
q("Q15-04", 1, "Le lamiere acquistate per costruire transenne sono…",
  "materie prime",
  [("prodotti finiti", "Il prodotto finito è la transenna."),
   ("merci", "Le merci si rivendono così come si comprano."),
   ("cespiti", "Si consumano nella produzione: non durano più anni.")],
  "Materia prima → componente del prodotto.")
q("Q15-05", 2, "Semilavorato (HALB) significa…",
  "un prodotto che ha fatto una parte della lavorazione e servirà a una fase successiva",
  [("un prodotto pronto per la vendita", "Quello è il prodotto finito (FERT)."),
   ("un bene acquistato per la rivendita", "Quelle sono le merci."),
   ("un macchinario a metà ammortamento", "Non c'entra con le scorte.")],
  "Es.: lamiera tagliata, pronta per la piegatura.")
q("Q15-06", 2, "Giacenza 120 pezzi, costo medio 5,50 €. Valore del magazzino?",
  "660 €",
  [("125,50 €", "Hai sommato invece di moltiplicare."),
   ("600 €", "Il costo unitario è 5,50, non 5."),
   ("6.600 €", "Errore di una cifra: 120 × 5,50 = 660.")],
  "Valore = quantità × costo unitario.", area="applicazione")
q("Q15-07", 3, "Inventario fisico: 95 pezzi; a sistema 100 pezzi da 4 €. Che cosa misura la differenza?",
  "Una differenza inventariale negativa di 5 pezzi, pari a 20 €",
  [("Un ricavo di 20 €", "Mancano pezzi: è una perdita, non un ricavo."),
   ("Nessuna differenza: conta il sistema", "L'inventario fisico prevale e il sistema va rettificato."),
   ("Una differenza di 5 €", "5 pezzi × 4 € = 20 €.")],
  "Mancano 5 pezzi × 4 € = 20 € di differenza inventariale.", area="applicazione")
q("Q15-08", 2, "Sposti 50 transenne dal deposito centrale al deposito clienti. Il valore totale del magazzino…",
  "non cambia",
  [("aumenta", "Non entra merce nuova."),
   ("diminuisce", "Non esce merce dall'azienda."),
   ("diventa un costo", "Un trasferimento interno non è un consumo.")],
  "Cambia l'ubicazione, non la quantità totale né il valore.")
q("Q15-09", 3, "Il gestionale registra già ogni entrata e uscita di magazzino a valore (metodo permanente). A fine anno rilevi anche le rimanenze con la scrittura del metodo periodico?",
  "No: lo stock è già in contabilità, registrarlo di nuovo lo raddoppierebbe",
  [("Sì, sempre", "Con il metodo permanente le scorte sono già nel conto di magazzino."),
   ("Sì, ma solo per i prodotti finiti", "Vale per tutte le scorte già valorizzate."),
   ("No, il magazzino non va mai in bilancio", "Il magazzino è in bilancio: già registrato dal metodo permanente.")],
  "Dichiara sempre il metodo: periodico o permanente.", origine="M22")
q("Q15-10", 2, "Quali sono scorte di magazzino? (seleziona tutte le risposte corrette)",
  ["Materie prime", "Semilavorati", "Prodotti finiti"],
  [("Macchinari del reparto", "Sono cespiti."),
   ("Crediti verso clienti", "Sono crediti, non scorte.")],
  "Le rimanenze comprendono materie, semilavorati, prodotti finiti, merci e WIP.", multi=True)
q("Q15-11", 3, "Metodo periodico. Acquisti 10.000 €, rimanenze iniziali 2.000 €, rimanenze finali 3.000 €. Costo delle merci vendute?",
  "9.000 €",
  [("10.000 €", "Vanno considerate anche le rimanenze iniziali e finali."),
   ("11.000 €", "Le rimanenze finali si sottraggono, quelle iniziali si sommano."),
   ("15.000 €", "Le rimanenze finali non si sommano.")],
  "2.000 + 10.000 − 3.000 = 9.000 €.", area="applicazione")
q("Q15-12", 2, "Rimanenze finali più alte, a parità di tutto il resto, fanno…",
  "aumentare l'utile dell'esercizio",
  [("diminuire l'utile", "Riducono il costo del venduto: l'utile aumenta."),
   ("aumentare i debiti", "Le rimanenze sono attività."),
   ("diminuire la banca", "La banca non si muove con l'inventario.")],
  "Variazione rimanenze in Avere = componente positivo.")
