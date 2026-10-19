# Correzioni didattiche — 19 ottobre 2026

Ambiente Academy: dati sintetici, nessun collegamento con magazzini o adempimenti reali.

## Percorso unico e ordine delle operazioni

Preparazione: **Nuova azienda vuota → capitale sottoscritto e versato → WMS → acquisti dei cinque beni strumentali → budget dei centri e standard**. Il ciclo operativo su commessa parte poi dagli **ordini cliente → fabbisogni → acquisti dei materiali → ricevimento → produzione → consegna/fattura**. La produzione per scorta è distinta, non vietata.

La pagina «Nuova azienda / Avvio» mette in primo piano la costituzione vuota e separa i saldi pronti. Materiali e standard anagrafici non sono scorte né acquisti. Per ricominciare nello stesso account occorre richiedere il download del backup, verificarlo e digitare `NUOVA AZIENDA`. Non è un nuovo spazio separato. L’azione riguarda il solo slot integrato, non account, password o altri laboratori. Nessun reset automatico al deploy; nessuna cancellazione online eseguita con questa modifica. La possibilità di scaricare un backup non sostituisce un backup infrastrutturale del database prima di un eventuale intervento amministrativo.

## Libro giornale, mastrini e quiz

- Giornale diviso per documenti, con colonne Dare/Avere, totali e quadratura.
- Mastrini derivati dalle stesse registrazioni, saldo progressivo con sezione esplicita e collegamenti documento/conto; nessun duplicato contabile.
- Ogni nuova scrittura prevista dal quiz richiede conto, sezione e importo per tutte le righe. Tentativi incompleti non sbloccano né danno accesso alla soluzione.
- Un tentativo completo anche errato permette il confronto. Correttezza, cronologia errori e consultazione della soluzione restano distinti.
- Prima del tentativo le schermate integrate sono sospese: niente giornale, mastrini, viste derivate o stampe che anticipino la risposta. Il pannello dell’esercizio rimane disponibile. Test in Chromium: blocco iniziale, clic vuoto, sblocco dopo errore valutabile e persistenza al ricaricamento.
- Il presidio è didattico: non protegge da ispezione o manipolazione tecnica dei dati già nel browser. Le scritture meccaniche già escluse dal quiz restano escluse. PDF e file sorgente contengono risultati attesi: distribuirli progressivamente se non si vogliono anticipare soluzioni.

## Quarantena e differenze prezzo

«Merce bloccata» è uno stato. La sequenza è **metti una quantità in quarantena → conferma compito RF → decidi sblocco o rottamazione**. Il blocco inventariale delle ubicazioni è diverso. I 200 kg già ricevuti bloccati in Q-ZONE non vanno bloccati nuovamente.

Nessuna falsa correzione MIGO/MIRO: a prezzo standard possono esserci differenze al ricevimento rispetto allo standard e ulteriori differenze fattura/ordine alla fatturazione. La logica esistente di entrambe le origini viene mantenuta.

## Budget centri e standard

Laboratorio annuale CPM/CO-CCA a attivazione esplicita: Taglio, Piegatura, Saldatura e Generale. Budget personale/indiretti, Generale produttivo ripartibile, amministrativi esclusi, capacità, ore denominate di tariffa e volume annuo sono distinti. Driver per ore o percentuali; distinta/ciclo versionati e costo prodotto collegato alle tariffe.

Caso: 36.000 € personale per centro; 18.000 € nel Generale produttivo, divisi su tre centri con 1.500 ore di base ciascuno: 28 €/h. Quantità annua TR-STD 1.200; ordine del caso 300. Standard TR-STD 31,40 €/pz; ordine 9.420 €. HALB autonomo: 20 kit, 5 ore Taglio, 292 €.

Ogni nuovo ordine conserva lo snapshot di standard e tariffe. Una successiva revisione non rivaluta retroattivamente ordini pregressi. Conferme e assorbimenti restano analitici; non duplicano costi del personale o generano automaticamente capitalizzazione FI del WIP. Consuntivi primari con fonte documentale riportata manualmente una sola volta, nessuna importazione automatica FI. Residuo centro non significa automaticamente inefficienza.

CK24: soltanto sul primo rilascio CPM, con stock e ordini ancora vuoti, `SOSTITUISCI` consente di superare gli standard iniziali della costituzione conservandone la traccia. Calcolare e rilasciare TR-STD e SL-TAGLIO nello stesso primo batch. Non è una riapertura generalizzata dei rilasci storici.

Il modello è un laboratorio annuale, non un CPM completo di consolidato/forecast e non una replica certificata di SAP. Distinta ad un componente, capacità annua e ipotesi di setup esplicitate nell’interfaccia.

## Materiali e collaudo

Guida laterale e PDF/Markdown derivano dallo stesso testo: **250 passi**, inclusi 105 del caso principale. Tutti i passi originari e i relativi controlli sono conservati; aggiunti avvio, CPM e mastrini, corretta la cronologia cessioni/indennizzo e la fase Taglio del HALB CPM.

Nuovi test: `fi-didattica.test.js`, `presidio-didattico.js`, `avvio-didattico.js`, `cpm-centri.js`, `percorso-ordinato.js`, `percorso-cpm-completo.js`. I test usano solo stato sintetico e database temporanei. L’E2E CPM attraversa costituzione, acquisti beni/materiali, tre conferme, semilavorato, vendite, inventario, chiusura e riapertura, mantenendo i 23 controlli economici attesi. Verificate in Chromium quattro schermate a 1440 e 390 px senza errori JavaScript o overflow orizzontale della pagina; tabelle scorrevoli dove necessario.

Il collaudo locale non attesta deploy, comportamento sul telefono reale, lettura QR fisica o modifica dei dati degli allievi. Richiesta integrazione separata, senza merge automatico.
