"""Domande aggiunte con il nuovo manuale: completano i blocchi più corti e i temi nuovi
(quattro sistemi, costituzione, IVA, MIGO/MIRO, chiusura e riapertura delle scorte, costo medio ponderato, fine anno voce per voce)."""
from . import S, T

T("C04", "N04-01", 2, "In quale dei quattro sistemi del manuale il magazzino entra in contabilità generale solo a fine anno, con la rilevazione delle rimanenze?",
  "Nel metodo italiano del manuale e in ad hoc Revolution",
  [("In SAP S/4HANA", "SAP tiene il magazzino sempre a valore (MIGO, consegne): le scorte sono già nei conti 12, 07 e 13."),
   ("In Business Central", "Business Central registra il valore del magazzino a ogni movimento (inventario permanente)."),
   ("In nessuno: il magazzino non va mai in contabilità", "Le rimanenze sono un'attività di bilancio: in un modo o nell'altro entrano sempre in contabilità.")],
  "Metodo italiano e ad hoc Revolution: rimanenze registrate al 31/12 dal valore dell'inventario; SAP e Business Central: magazzino permanente a valore.")
T("C04", "N04-02", 2, "In Business Central con la localizzazione italiana, quali funzioni chiudono l'esercizio e riaprono i conti?",
  "«Chiusura conto economico» e poi «Chiusura/apertura stato patrimoniale»",
  [("Solo «Chiusura anno» nei periodi contabili", "Chiudere l'anno blocca i periodi, ma non genera le scritture di chiusura e di apertura."),
   ("La procedura «Chiusura/apertura conti» della Prima Nota", "Questa è la procedura di ad hoc Revolution, non di Business Central."),
   ("FAGL_IT_01", "È il programma di SAP per le registrazioni di chiusura e apertura in Italia.")],
  "Prima si azzerano i conti economici nell'utile, poi i patrimoniali vanno al conto di chiusura e ripartono dal conto di apertura.")

S("C05", "N05-01", 2, "L'assemblea delibera un aumento di capitale di 20.000 €: i soci lo sottoscrivono oggi e lo verseranno tra un mese.",
  [("Soci c/sottoscrizione", "D", 20000), ("Capitale sociale", "A", 20000)],
  [([("Banca c/c", "D", 20000), ("Capitale sociale", "A", 20000)], "I soci non hanno ancora versato: in banca non entra nulla, nasce un credito verso di loro."),
   ([("Soci c/sottoscrizione", "D", 20000), ("Debiti v/soci per finanziamenti", "A", 20000)], "L'aumento di capitale non è un prestito da restituire: è patrimonio netto.")],
  "Sottoscrizione oggi: credito verso i soci e capitale; il versamento chiuderà il credito.")
T("C05", "N05-02", 2, "Alla costituzione i soci sottoscrivono 50.000 € e versano subito il 25%. Quanto devono ancora versare?",
  "37.500 €",
  [("12.500 €", "È la parte già versata (25%), non quella che resta."),
   ("50.000 €", "Una parte, il 25%, è già stata versata."),
   ("0 €", "Il 75% del capitale sottoscritto deve ancora essere versato.")],
  "50.000 − 25% (12.500) = 37.500 €, che resta in Soci c/sottoscrizione.", area="applicazione")
S("C05", "N05-03", 2, "Un socio presta alla società 5.000 € con bonifico, da restituire tra due anni con interessi.",
  [("Banca c/c", "D", 5000), ("Debiti v/soci per finanziamenti", "A", 5000)],
  [([("Banca c/c", "D", 5000), ("Capitale sociale", "A", 5000)], "Il prestito va restituito: è un debito verso il socio, non capitale."),
   ([("Banca c/c", "D", 5000), ("Soci c/sottoscrizione", "A", 5000)], "Non è il versamento di un capitale sottoscritto: è un finanziamento.")],
  "Il finanziamento dei soci da restituire è un debito: il patrimonio netto non cambia.")

T("C06", "N06-01", 1, "Quale di queste IVA si registra in «IVA ns/credito»?",
  "L'IVA della fattura di un fornitore di materie prime, detraibile",
  [("L'IVA addebitata al cliente nella fattura di vendita", "Quella è IVA ns/debito: va versata all'Erario."),
   ("La parte indetraibile dell'IVA sull'auto aziendale", "L'IVA indetraibile diventa costo del bene."),
   ("L'IVA su un premio di assicurazione", "Il premio è esente: non c'è IVA.")],
  "IVA ns/credito = IVA detraibile sugli acquisti.")
T("C06", "N06-02", 2, "Nel mese vendi per 2.000 € + IVA 22% e acquisti per 1.500 € + IVA 22% (detraibile). Che saldo IVA hai?",
  "110 € a debito",
  [("440 € a debito", "Va sottratta l'IVA a credito degli acquisti (330)."),
   ("330 € a credito", "L'IVA delle vendite (440) supera quella degli acquisti."),
   ("770 € a debito", "IVA a debito e a credito si sottraggono, non si sommano.")],
  "440 − 330 = 110 € a debito.", area="applicazione")
S("C06", "N06-03", 1, "Ricevi la fattura della cartoleria: cancelleria 100 € + IVA 22% = 122 €, da pagare.",
  [("Cancelleria", "D", 100), ("IVA ns/credito", "D", 22), ("Debiti v/fornitori", "A", 122)],
  [([("Cancelleria", "D", 122), ("Debiti v/fornitori", "A", 122)], "L'IVA detraibile non è un costo: va in IVA ns/credito."),
   ([("Merci c/acquisti", "D", 100), ("IVA ns/credito", "D", 22), ("Debiti v/fornitori", "A", 122)], "La cancelleria non è merce da rivendere: ha un conto proprio.")],
  "Costo per natura, IVA detraibile a credito, debito per il totale.")

T("C07", "N07-01", 2, "Nel gestionale SAP il ferro arriva il 4/12 (MIGO 101) e la fattura il 5/12 (MIRO). Quando nasce il debito verso il fornitore?",
  "Con la MIRO; all'entrata merci il gestionale usa il conto ponte «Fatture da ricevere»",
  [("Con la MIGO: il debito nasce all'arrivo della merce", "Alla MIGO il debito è ancora stimato (conto 22 WE/RE): il debito verso il fornitore nasce con la fattura."),
   ("Al pagamento", "Il pagamento chiude il debito, non lo crea."),
   ("All'ordine d'acquisto", "L'ordine non genera scritture contabili.")],
  "MIGO: Magazzino / Fatture da ricevere; MIRO: Fatture da ricevere + IVA / Debiti verso fornitori.")

T("C16", "N16-01", 2, "Parcella di un professionista: imponibile 1.500 € + IVA 22%, ritenuta d'acconto 20%. Quanto vale la ritenuta da versare?",
  "300 €",
  [("366 €", "La ritenuta si calcola sull'imponibile, non sul totale con IVA."),
   ("330 €", "330 è l'IVA, non la ritenuta."),
   ("1.530 €", "È l'importo netto pagato al professionista (1.830 − 300).")],
  "1.500 × 20% = 300 €, trattenuti al pagamento e versati con F24 (codice 1040).", area="applicazione")

S("C17", "N17-01", 2, "31/12, metodo periodico: dopo aver rilevato le rimanenze finali di merci (3.000 €), chiudi la variazione delle rimanenze nell'epilogo.",
  [("Variazione rimanenze merci", "D", 3000), ("Conto economico", "A", 3000)],
  [([("Conto economico", "D", 3000), ("Variazione rimanenze merci", "A", 3000)], "La variazione ha saldo avere: si chiude in Dare e va in Avere del Conto economico."),
   ([("Variazione rimanenze merci", "D", 3000), ("Stato patrimoniale finale", "A", 3000)], "La variazione è un componente di reddito: va nel Conto economico, non nello Stato patrimoniale.")],
  "Epilogo: la variazione si azzera e il suo valore entra tra i componenti positivi del Conto economico.")
S("C17", "N17-02", 2, "31/12, chiusura patrimoniale: chiudi il conto Merci, che dopo la rilevazione ha saldo dare 3.000 €.",
  [("Stato patrimoniale finale", "D", 3000), ("Merci", "A", 3000)],
  [([("Merci", "D", 3000), ("Stato patrimoniale finale", "A", 3000)], "Un'attività con saldo dare si chiude in Avere."),
   ([("Conto economico", "D", 3000), ("Merci", "A", 3000)], "Merci è un conto patrimoniale: si chiude nello Stato patrimoniale finale.")],
  "Le merci sono un'attività: in Avere il conto, in Dare lo Stato patrimoniale finale.")
S("C17", "N17-03", 2, "1/1: riapri il conto Merci, chiuso al 31/12 con 3.000 €.",
  [("Merci", "D", 3000), ("Stato patrimoniale iniziale", "A", 3000)],
  [([("Variazione rimanenze merci", "D", 3000), ("Merci", "A", 3000)], "Questa è la seconda scrittura del 1/1 (giro a costo): prima si riapre il conto."),
   ([("Stato patrimoniale iniziale", "D", 3000), ("Merci", "A", 3000)], "Un'attività si riapre in Dare, con il suo saldo dare.")],
  "Riapertura: giro opposto alla chiusura, poi le rimanenze iniziali tornano a costo.")
T("C17", "N17-04", 3, "Ferro: carichi dell'anno 2.800 kg a 1,00 €/kg e 500 kg a 1,08 €/kg; in magazzino restano 740 kg. Valore delle rimanenze a costo medio ponderato?",
  "748,97 €",
  [("740,00 €", "È il LIFO: restano i lotti più vecchi, a 1,00 €/kg."),
   ("780,00 €", "È il FIFO: restano i lotti più recenti (500 × 1,08 + 240 × 1,00)."),
   ("703,00 €", "È il costo standard del gestionale SAP (0,95 €/kg), non il costo medio ponderato.")],
  "Costo medio = (2.800 + 540) ÷ 3.300 = 1,0121 €/kg; 740 × 1,0121 = 748,97 €.", area="applicazione")

S("C20", "N20-01", 2, "31/12: chiudi il risconto attivo di 900 € sul premio assicurativo.",
  [("Stato patrimoniale finale", "D", 900), ("Risconti attivi", "A", 900)],
  [([("Risconti attivi", "D", 900), ("Stato patrimoniale finale", "A", 900)], "Il risconto attivo è un'attività con saldo dare: si chiude in Avere."),
   ([("Premi di assicurazione", "D", 900), ("Risconti attivi", "A", 900)], "Questa è la scrittura del 1/1 che riporta il risconto a costo, non la chiusura.")],
  "Il risconto attivo va nello Stato patrimoniale finale come le altre attività.")
S("C20", "N20-02", 2, "1/1: riapri il rateo passivo di 160 € sugli interessi del mutuo.",
  [("Stato patrimoniale iniziale", "D", 160), ("Ratei passivi", "A", 160)],
  [([("Ratei passivi", "D", 160), ("Stato patrimoniale iniziale", "A", 160)], "Il rateo passivo è un debito: si riapre in Avere."),
   ([("Ratei passivi", "D", 160), ("Interessi passivi su mutui", "A", 160)], "Questo è lo storno del rateo (come fanno SAP e Business Central), non la riapertura.")],
  "Il debito torna con il suo saldo avere.")
S("C20", "N20-03", 3, "31/1: paghi la rata del mutuo con 240 € di interessi; 160 € erano già nel rateo passivo riaperto al 1/1 (nessuno storno).",
  [("Ratei passivi", "D", 160), ("Interessi passivi su mutui", "D", 80), ("Banca c/c", "A", 240)],
  [([("Interessi passivi su mutui", "D", 240), ("Banca c/c", "A", 240)], "Così gli interessi dell'anno scorso, già nel rateo, diventerebbero costo due volte e il rateo resterebbe aperto."),
   ([("Ratei passivi", "D", 240), ("Banca c/c", "A", 240)], "Il rateo vale solo 160: gli altri 80 sono interessi del nuovo anno.")],
  "Il pagamento chiude il rateo; solo la parte del nuovo anno è costo.")
