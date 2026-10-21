# Revisione didattica — 20 ottobre 2026

## Comportamenti modificati

- **Quiz contabile:** corrispondenza di conto, sezione e importo in centesimi, indipendente dalla posizione delle righe. Le occorrenze duplicate sono verificate singolarmente; nessuna aggregazione arbitraria. Ricerca per codice o descrizione nell’intero piano. Un clic vuoto non rivela la soluzione.
- **Cespiti/macchinari:** registro alla data, ricerca, codice CE e codice interno univoco, matricola, modello, ubicazione e centro. Scheda manutenzioni non contabile; non crea fatture o spese. Aliquota civilistica, coefficiente fiscale e quota contabilizzata sono distinti. Compatibilità con dati senza nuovi campi.
- **Budget:** aiuti accessibili campo per campo e istruzioni annuale → mese/commessa. Costi primari, Generale, ore tariffa, capacità, volume, ripartizione, tariffe e fonti consuntive. Avvisi contro doppia imputazione degli ammortamenti e sovrapposizione budget/consuntivo.
- **Banche:** F-53 sceglie fra conto 10 e conto 10.02. Giroconto con saldo disponibile all’origine; nessuna liquidità iniziale aggiunta. Tesoreria aggregata, estratti distinti e riconciliazione F-53 senza doppia scrittura.
- **WMS:** procedure ingresso → campi → conferma → risultato, aiuti sui campi e RF, impegni e fabbisogni. Distinzione tra 101, putaway, staging, trasferimento e consumo. STAGING vuoto significa fabbisogno totale, non residuo. PSA condivisa, non riserva esclusiva.
- **Esercizio:** aggiornate consegne e guida laterale con i nuovi campi e laboratori separati; rigenerati PDF e Markdown dalla stessa guida.

## Limiti espliciti

- F110, incassi, personale, Ri.Ba., factoring e versamenti fiscali storici continuano a usare il conto 10.
- Il pagamento F-53 può rappresentare uno scoperto simulato; la selezione bancaria non crea fondi.
- Il modulo storni storico non introduce uno storno nuovo per F-53 o giroconto.
- Le manutenzioni sono una scheda didattica, non pianificazione industriale automatica; nessun upload foto o servizio esterno.
- QR/RF/RFID non risultano collaudati su hardware o cellulare reale; la prova browser non sostituisce il collaudo del dispositivo.
- Nessuna cancellazione del database online, nessun reset degli allievi, nessuna variazione di password e nessuna azione bancaria reale.

## Test

`npm test` include `test:migliorie`: ordine/ricerca quiz, cespiti, budget, banche, WMS ed esercizio. I test usano dati sintetici. Le verifiche browser aggiuntive controllano righe invertite, clic vuoto, suggerimenti e rendering a 1440 e 390 px. Pubblicazione e collaudo online sono fasi distinte dal merge.
