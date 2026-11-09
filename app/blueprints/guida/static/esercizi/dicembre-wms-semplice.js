/* Esercizio di dicembre: magazzino (WMS), acquisti e ordini di produzione spiegati punto per punto,
   come il controllo di gestione: a che cosa serve il passo (a grandi lettere), dove sei nel giro della merce,
   una sola azione per riga con il valore da copiare, che cosa devi vedere.
   Solo testi: nessuna operazione e nessuna modifica dello stato. Si applica per titolo ai passi di dicembre-wms.js.
   Nei passi contabili «Cosa devi vedere» descrive la merce e i documenti, mai la scrittura (resta nascosta fino al tentativo). */
(function () {
  'use strict';
  var E = window.MSA_ESERCIZIO;
  if (!E || E.codice !== 'dicembre-wms') return;
  var R = function (dove, fai, valore) { return {dove: dove, fai: fai, valore: valore}; };
  var APRI = R('Qui nel pannello, in alto', 'Premi il pulsante blu «Apri ➜»');
  var FATTO = R('Qui nel pannello, in basso', 'Premi «✓ Fatto»');

  // ── la pistola RF: sempre la stessa procedura, ripetuta per ogni compito ──
  function rf(data, quanti, cosa) {
    return [APRI,
      R('In alto, casella «Data di lavoro»', 'Scrivi', data),
      R('Scheda «📦 Compiti»', 'Guarda il riquadro del compito: ci sono «Da», «UdC / materiale», «Quantità» e «A»'),
      R('Casella «1 · Leggi l’ubicazione di ORIGINE»', 'Scrivi quello che c’è accanto a «Da»'),
      R('Casella «2 · Leggi l’unità di carico (o il materiale)»', 'Scrivi il codice UdC che c’è accanto a «UdC / materiale» (oppure il codice del materiale)'),
      R('Casella «3 · Quantità prelevata»', 'Non toccarla: lascia il numero che c’è'),
      R('Casella «4 · Leggi l’ubicazione di DESTINAZIONE»', 'Scrivi quello che c’è accanto a «A»'),
      R('Sotto', 'Premi «✔ Conferma il compito»'),
      R('Stessa scheda', 'Compare il compito dopo: ripeti dalla riga 4. In tutto ' + quanti + ' (' + cosa + '), finché leggi «Nessun compito aperto»')];
  }
  var RF_PERCHE = 'In magazzino il sistema dice DA DOVE prendere e DOVE mettere; il magazziniere va sul posto, legge le etichette con la pistola e conferma. Se leggi un codice diverso da quello atteso, la pistola lo rifiuta: così non si sbaglia scaffale.';

  // ── il giro della merce: le tappe del magazzino e della produzione ──
  var TAPPE = [
    {nome: 'Prepara il magazzino', serve: 'Accendi il magazzino W100: si creano gli scaffali (ubicazioni), ancora vuoti.', porta: 'Un magazzino pronto a ricevere la merce.', g: ['1 · Preparazione: WMS']},
    {nome: 'Ordini dei clienti', serve: 'Beta e Delta ordinano 300 transenne in tutto. Non ne abbiamo: bisogna produrle.', porta: 'Quanto dobbiamo produrre e per quando.', g: ['4 · CICLO OPERATIVO: ordini dei clienti']},
    {nome: 'Fabbisogni', serve: 'Calcoli quanto ferro e quante ore servono per 300 transenne e 20 kit.', porta: 'Quanto ferro comprare.', g: ['4 · CICLO OPERATIVO: fabbisogni']},
    {nome: 'Compra e ricevi il ferro', serve: 'Ordini il ferro, lo ricevi, lo metti a scaffale con la pistola, scarti quello rotto, registri la fattura.', porta: 'Il ferro a scaffale, pronto per la produzione.', g: ['5 · Acquisto del ferro']},
    {nome: 'Produci le transenne', serve: 'Un solo ordine di produzione: porti il ferro alla linea, lo consumi, dichiari le ore di Taglio, Piegatura e Saldatura, carichi le 300 transenne finite.', porta: '300 transenne a scaffale, pronte da vendere.', g: ['6 · Ordine transenne', '7 · Fasi sullo stesso ordine']},
    {nome: 'Produci i kit a scorta', serve: 'Un secondo ordine, separato: 20 kit tagliati che restano in magazzino. Poi li sposti in fondo e controlli il magazzino.', porta: '20 kit a scorta e un magazzino in ordine.', g: ['8 · HALB autonomo a scorta']},
    {nome: 'Pistola RF, quarantena e posti migliori', serve: 'Interroghi uno scaffale, blocchi e sblocchi un pallet urtato, sposti i pallet più usati vicino alla porta.', porta: 'Il magazzino pronto per spedire bene.', g: ['8b · Pistola RF, quarantena e slotting']},
    {nome: 'Spedisci ai clienti', serve: 'Consegne, prelievo in un solo giro, colli con etichetta SSCC, camion, uscita merci e DDT.', porta: 'Le 300 transenne partite e i documenti pronti.', g: ['9 · Consegna con picking']},
    {nome: 'Inventario di fine anno', serve: 'Conti quello che c’è davvero, trovi la differenza e la registri; poi valuti il ferro rimasto.', porta: 'Un magazzino che corrisponde alla contabilità.', g: ['14 · Inventario di fine anno']}
  ];
  var TAPPA = {};
  TAPPE.forEach(function (t, i) { t.g.forEach(function (g) { TAPPA[g] = i; }); });

  // ── i passi: titolo → [a grandi lettere, cosa fai, cosa devi vedere, perché (facoltativo)] ──
  var P = {
    'Attiva il magazzino W100 (vuoto)': ['ACCENDI IL MAGAZZINO. Il programma crea gli scaffali con il loro indirizzo (es. 01-03-2 = corsia 01, campata 03, piano 2). Sono tutti vuoti: la merce arriverà con gli acquisti.',
      [APRI, R('Riquadro «Numero magazzino W100», casella «Data di attivazione»', 'Scrivi', '01/12/2026'), R('Sotto', 'Premi «Attiva il magazzino W100…»')],
      ['41 ubicazioni create', 'Nessuna merce: il magazzino è vuoto']],
    'VA01: Beta ordina 180 TR-STD': ['IL CLIENTE BETA ORDINA 180 TRANSENNE. Da qui parte tutto: senza un ordine del cliente non si compra e non si produce.',
      [APRI, R('Riquadro «Crea ordine cliente», menu «Committente»', 'Scegli «C100 Beta Costruzioni»'), R('Menu «Materiale»', 'Scegli', 'TR-STD'), R('Casella «Quantità (pz)»', 'Scrivi', '180'), R('Casella «Riferimento cliente»', 'Scrivi', 'BETA-180'), R('Casella «Data documento»', 'Scrivi', '02/12/2026'), R('Casella «Data di consegna richiesta»', 'Scrivi', '14/12/2026'), R('Sotto', 'Premi «Salva ordine»')],
      ['Ordine salvato: netto 10.584 €, totale con IVA 12.912,48 €', 'Confermati 0 su 180: in magazzino non c’è niente, bisogna produrre']],
    'VA01: Delta ordina 120 TR-STD': ['IL CLIENTE DELTA ORDINA ALTRE 120 TRANSENNE. In tutto ora ne servono 300.',
      [R('Stessa pagina, riquadro «Crea ordine cliente», menu «Committente»', 'Scegli «C200 Delta Noleggi»'), R('Menu «Materiale»', 'Scegli', 'TR-STD'), R('Casella «Quantità (pz)»', 'Scrivi', '120'), R('Casella «Riferimento cliente»', 'Scrivi', 'DELTA-120'), R('Casella «Data documento»', 'Scrivi', '02/12/2026'), R('Casella «Data di consegna richiesta»', 'Scrivi', '14/12/2026'), R('Sotto', 'Premi «Salva ordine»')],
      ['Ordine salvato: netto 7.056 €, totale con IVA 8.608,32 €', 'Confermati 0 su 120']],
    'VA05: leggi il semaforo di disponibilità dei due ordini': ['GUARDA IL SEMAFORO: possiamo consegnare in tempo? Rosso = non abbiamo la merce e non sta arrivando niente.',
      [APRI, R('Tabella «Ordini cliente», colonna «Disponibilità»', 'Guarda il semaforo di Beta e di Delta'), R('Poi SD → Gestione crediti e disponibilità, riquadro «Disponibilità per materiale»', 'Leggi la riga di TR-STD'), FATTO],
      ['Beta e Delta: semaforo ROSSO', 'TR-STD: giacenza 0, niente in arrivo, mancano 300 pezzi']],
    'Dalla domanda ai fabbisogni: 300 transenne e 20 kit a scorta': ['FAI LA LISTA DELLA SPESA. Per 300 transenne servono 300 × 8 = 2.400 kg di ferro; per 20 kit altri 160 kg. Questo passo è solo un calcolo: non si registra niente.',
      [APRI, R('Riquadro «Distinta e ciclo»', 'Leggi la riga di TR-STD: 8 kg di ferro per pezzo'), R('Con la calcolatrice', '300 × 8 = 2.400 kg per le transenne'), R('Con la calcolatrice', '20 × 8 = 160 kg per i kit · totale 2.560 kg'), FATTO],
      ['Ferro necessario: 2.560 kg', 'Ore: Taglio 75, Piegatura 60, Saldatura 120 (più 5 ore per i kit)', 'Si comprano 3.000 kg: il resto è scorta']],
    'ME21N: ordina 3.000 kg di ferro': ['ORDINA IL FERRO AL FORNITORE. È solo un ordine: il ferro non è ancora arrivato e non si paga niente.',
      [APRI, R('Riquadro «Crea ordine d’acquisto», menu «Con riferimento alla richiesta»', 'Lascia «— senza richiesta —»'), R('Menu «Fornitore»', 'Scegli «F100 Acciaierie Umbre»'), R('Menu «Materiale»', 'Scegli', 'FERRO'), R('Casella «Quantità»', 'Scrivi', '3000'), R('Casella «Prezzo netto €/unità»', 'Scrivi', '1,00'), R('Casella «Data»', 'Scrivi', '03/12/2026'), R('Sotto', 'Premi «Salva ordine»')],
      ['Ordine 4500000001 da 3.000 €']],
    'MIGO 101: ricevi il ferro, 200 kg sono schiacciati': ['ARRIVA IL CAMION DEL FERRO. Il magazziniere conta, confronta con il DDT e controlla: 200 kg sono schiacciati. Si registra l’arrivo, dicendo quanti sono danneggiati.',
      [APRI, R('Riquadro «Entrata merci da ordine d’acquisto», menu «Ordine»', 'Scegli', '4500000001'), R('Casella «Quantità contata»', 'Lasciala vuota (= 3.000 come sul DDT)'), R('Casella «Numero DDT del fornitore»', 'Scrivi', 'DDT-AU-5512'), R('Casella «Lotto: colata dal certificato»', 'Scrivi', 'COL-1204'), R('Casella «Di cui danneggiati»', 'Scrivi', '200'), R('Casella «Descrizione del danno»', 'Scrivi', 'tubi schiacciati nel trasporto'), R('Casella «Data di registrazione»', 'Scrivi', '04/12/2026'), R('Sotto', 'Premi «Registra entrata»')],
      ['2.800 kg buoni in 3 fasci nella zona di arrivo GR-ZONE, con 3 compiti per metterli a scaffale', '200 kg BLOCCATI nella zona quarantena Q-ZONE', 'Poi qui nel pannello ricostruisci la scrittura']],
    'Merce da mettere a posto: che cosa aspetta in ricevimento?': ['GUARDA CHE COSA ASPETTA DI ESSERE MESSO A SCAFFALE. Il ferro è arrivato ma è ancora nella zona di scarico: qui vedi quanti fasci sono e dove vanno.',
      [APRI, R('In alto, casella «Data di oggi»', 'Scrivi', '04/12/2026'), R('Tabella «Merce arrivata da mettere a posto»', 'Conta le righe: sono i fasci da portare a scaffale'), R('Colonna «Va in (proposta)»', 'Leggi dove va ogni fascio'), R('Prima riga, a destra', 'Premi «▶ Metti a posto»: si apre la pistola RF con quel compito'), FATTO],
      ['3 fasci di FERRO, 2.800 kg: due vanno in F-01, uno in F-02', 'I 200 kg schiacciati NON ci sono: sono in quarantena'],
      'Finché la merce resta nella zona di scarico non si può usare e occupa spazio: questa lista dice al magazziniere che cosa fare per primo.'],
    'Misure del pallet EUR e regola: quante transenne per collo': ['SCRIVI LE MISURE DEL PALLET E QUANTE TRANSENNE CI STANNO. Servono per capire quanto spazio e quanto peso occupa ogni collo sul camion.',
      [APRI, R('Riquadro «1 · Imballo», menu «Imballo»', 'Scegli «Pallet EUR 120×80»'), R('Caselle delle misure', 'Controlla: 120 · 80 · 15 cm, tara 25 kg, portata 1000 kg, impilabile sì, regge sopra 700 kg'), R('Sotto', 'Premi «Salva l’imballo»'),
        R('Riquadro «2 · Regola di confezionamento»', 'Articolo TR-STD, imballo Pallet EUR'), R('Caselle', 'Pezzi per collo', '50'), R('Casella «Altezza del collo carico»', 'Scrivi', '125'), R('Sotto', 'Premi «Salva la regola»')],
      ['Collo di TR-STD: 50 × 12 kg + 25 kg = 625 kg', 'Nella tabella delle regole: «✏️ tu»'],
      'Il camion si riempie per spazio e per peso: senza le misure non si può sapere se la merce ci sta.'],
    'Piano di carico e camion 3D: quale camion per Beta e Delta?': ['DECIDI SU QUALE CAMION VIAGGIANO BETA E DELTA. Il programma ti mostra dove va ogni collo, anche in 3D.',
      [APRI, R('In alto, menu «Trasporto»', 'Scegli il trasporto di Beta e Delta'), R('Menu «Veicolo»', 'Prova «Furgone 3,5 t» e guarda quanti colli restano a terra'), R('Menu «Veicolo»', 'Scegli «Motrice 10 t»'), R('Menu «Criterio»', 'Scegli «per fermate»'),
        R('Riquadro del camion', 'Premi «🧊 Camion in 3D» e gira il camion con il mouse'), R('In fondo', 'Premi «Salva il piano sul trasporto»')],
      ['Furgone: 2 colli su 7', 'Motrice: 7 colli su 7 in 4 posti, 3 pile da due', 'Delta vicino alla cabina, Beta verso le porte'],
      'Chi scende per primo deve stare vicino alle porte: così all’arrivo non si sposta tutto il carico.'],
    'RF: metti a dimora i 3 fasci buoni in catasta': ['METTI IL FERRO A SCAFFALE CON LA PISTOLA. I 3 fasci buoni sono nella zona di arrivo: il sistema dice in quale catasta portarli.',
      rf('04/12/2026', '3 compiti', 'i 3 fasci di ferro'),
      ['Catasta F-01: 2 fasci · F-02: il fascio da 800', 'Zona di arrivo vuota; i 200 kg rotti restano in quarantena'], RF_PERCHE],
    'Quarantena: decidi sui 200 kg schiacciati': ['DECIDI COSA FARE DEL FERRO ROTTO. I tubi schiacciati non si riparano: si buttano (rottamazione). Il ferro esce dal magazzino.',
      [APRI, R('Riquadro «3 · Decidi sulla merce arrivata in quarantena», menu «UdC in quarantena»', 'Scegli quella da 200 kg di FERRO'), R('Casella «Esito del controllo / motivo»', 'Scrivi', 'tubi schiacciati, non riparabili'), R('Casella «Data»', 'Scrivi', '05/12/2026'), R('Sotto', 'Premi «Rottama: da buttare (555)»'), R('ATTENZIONE', 'NON usare il riquadro «1 · Metti in quarantena»: questi 200 kg sono già in quarantena')],
      ['La quarantena è vuota', 'In magazzino restano 2.800 kg di ferro', 'Poi qui nel pannello ricostruisci la scrittura']],
    'MIRO: registra la fattura del ferro': ['ARRIVA LA FATTURA DEL FORNITORE. Si registra collegandola all’ordine: il sistema controlla che ordine, merce arrivata e fattura tornino.',
      [APRI, R('Riquadro «Fattura fornitore», menu «Con riferimento all’ordine»', 'Scegli', '4500000001'), R('Casella «Numero fattura del fornitore»', 'Scrivi', 'FR-2026-871'), R('Casella «Prezzo fatturato»', 'Lasciala vuota (= prezzo dell’ordine)'), R('Casella «Data»', 'Scrivi', '05/12/2026'), R('Sotto', 'Premi «Registra fattura»')],
      ['Fattura registrata per 3.000 kg (anche quelli rotti: il trasporto era a nostro rischio)', 'Poi qui nel pannello ricostruisci la scrittura']],
    'ME21N: riordino urgente di 500 kg': ['RIORDINA IL FERRO. Con i 200 kg buttati ne resta troppo poco: ne ordini altri 500 kg, consegna urgente (costa un po’ di più).',
      [APRI, R('Riquadro «Crea ordine d’acquisto», menu «Fornitore»', 'Scegli «F100 Acciaierie Umbre»'), R('Menu «Materiale»', 'Scegli', 'FERRO'), R('Casella «Quantità»', 'Scrivi', '500'), R('Casella «Prezzo netto €/unità»', 'Scrivi', '1,08'), R('Casella «Data»', 'Scrivi', '05/12/2026'), R('Sotto', 'Premi «Salva ordine»')],
      ['Ordine 4500000002 da 540 €']],
    'MIGO 101: ricevi i 500 kg urgenti': ['ARRIVA IL FERRO URGENTE. Questa volta è tutto buono.',
      [APRI, R('Riquadro «Entrata merci da ordine d’acquisto», menu «Ordine»', 'Scegli', '4500000002'), R('Casella «Numero DDT del fornitore»', 'Scrivi', 'DDT-AU-5530'), R('Casella «Lotto: colata dal certificato»', 'Scrivi', 'COL-1206'), R('Casella «Di cui danneggiati»', 'Scrivi', '0'), R('Casella «Data di registrazione»', 'Scrivi', '06/12/2026'), R('Sotto', 'Premi «Registra entrata»')],
      ['Un fascio da 500 kg nella zona di arrivo GR-ZONE', 'Poi qui nel pannello ricostruisci la scrittura']],
    'RF: metti a dimora il fascio urgente': ['METTI A SCAFFALE IL NUOVO FASCIO. Il sistema lo manda nella catasta dove c’è già altro ferro.',
      rf('06/12/2026', '1 compito', 'il fascio da 500 kg'),
      ['Il fascio è in F-02, accanto a quello da 800', 'Le due colate (COL-1204 e COL-1206) restano distinte'], RF_PERCHE],
    'MIRO: fattura del riordino': ['REGISTRA LA FATTURA DEL FERRO URGENTE, collegata al suo ordine.',
      [APRI, R('Riquadro «Fattura fornitore», menu «Con riferimento all’ordine»', 'Scegli', '4500000002'), R('Casella «Numero fattura del fornitore»', 'Scrivi', 'FR-2026-902'), R('Casella «Data»', 'Scrivi', '06/12/2026'), R('Sotto', 'Premi «Registra fattura»')],
      ['Fattura registrata', 'Poi qui nel pannello ricostruisci la scrittura']],
    'CO01: un ordine per 300 transenne': ['APRI L’ORDINE DI PRODUZIONE. È il «foglio di lavoro» della fabbrica: 300 transenne, con il ferro e le ore dei tre reparti. UN SOLO ordine per tutte e tre le fasi.',
      [APRI, R('Riquadro «Crea ordine di produzione», menu «Materiale»', 'Scegli', 'TR-STD'), R('Casella «Quantità (pz)»', 'Scrivi', '300'), R('Casella «Data di inizio»', 'Scrivi', '07/12/2026'), R('Casella «Data di fine pianificata»', 'Scrivi', '12/12/2026'), R('Sotto', 'Premi «Rilascia ordine»'), R('ATTENZIONE', 'Non creare un ordine per ogni fase: basta questo')],
      ['Ordine 1000001', 'Ferro 2.400 kg · Taglio 75 h · Piegatura 60 h · Saldatura 120 h', 'Costo pianificato 9.420 €']],
    'CO09: le 300 transenne in arrivo rendono confermabili i due ordini': ['GUARDA DI NUOVO IL SEMAFORO. Ora l’ordine di produzione dice che il 12/12 arriveranno 300 transenne: i clienti possono essere serviti il 14/12.',
      [APRI, R('Riquadro «Disponibilità per materiale», materiale TR-STD', 'Leggi le righe di Beta e di Delta'), R('Poi SD → Ordini cliente, colonna «Disponibilità»', 'Guarda il semaforo'), FATTO],
      ['Beta 180 e Delta 120: data 12/12/2026, dall’ordine di produzione 1000001', 'Semaforo VERDE per tutti e due']],
    'WMS: porta il ferro delle transenne alla linea': ['PREPARA IL FERRO PER LA PRODUZIONE. Il sistema crea i compiti per portare 2.400 kg dalla catasta alla zona vicino alla macchina (PSA). Prima il ferro più vecchio (FIFO).',
      [APRI, R('Riquadro «Approvvigionamento della produzione», menu «Ordine di produzione»', 'Scegli «1000001 TR-STD»'), R('Casella «Quantità del componente»', 'Lasciala vuota (= 2.400 kg dalla distinta)'), R('Casella «Data»', 'Scrivi', '07/12/2026'), R('Sotto', 'Premi «Crea compiti (FIFO)»')],
      ['3 compiti STAGING: 1.000 + 1.000 da F-01, 400 da F-02, verso PSA-L1']],
    'RF: conferma l’approvvigionamento del ferro delle transenne': ['PORTA IL FERRO ALLA LINEA CON LA PISTOLA. Il ferro si sposta ma non è ancora consumato: è ancora in magazzino.',
      rf('07/12/2026', '3 compiti', 'i 3 STAGING del ferro'),
      ['2.400 kg nella zona della linea PSA', 'In F-02 restano 400 kg COL-1204 e 500 kg COL-1206', 'In magazzino ci sono ancora 3.300 kg: nessun consumo'], RF_PERCHE],
    '261: consuma 2.400 kg sullo stesso ordine': ['IL FERRO ENTRA IN LAVORAZIONE. Lo «prelevi» sull’ordine 1000001: esce dal magazzino e diventa costo dell’ordine.',
      [APRI, R('Riquadro «Prelievo per l’ordine», menu «Ordine»', 'Scegli', '1000001'), R('Casella «Quantità del componente»', 'Scrivi', '2400'), R('Casella «Data»', 'Scrivi', '07/12/2026'), R('Sotto', 'Premi «Registra prelievo»')],
      ['La zona della linea PSA è vuota', 'Il costo del ferro è sull’ordine 1000001', 'Poi qui nel pannello ricostruisci la scrittura']],
    'CO11N: Taglio 75 ore, WIP 4.380': ['IL REPARTO TAGLIO DICHIARA IL LAVORO FATTO: 75 ore per 300 pezzi. Le ore valgono 28 € l’una e si aggiungono al costo dell’ordine.',
      [APRI, R('Riquadro «Conferma delle ore», menu «Ordine»', 'Scegli', '1000001'), R('Menu «Fase»', 'Scegli', 'Taglio'), R('Casella «Pezzi della fase»', 'Scrivi', '300'), R('Casella «Ore di attrezzaggio»', 'Scrivi', '0'), R('Casella «Ore di lavorazione»', 'Scrivi', '75'), R('Casella «Data»', 'Scrivi', '07/12/2026'), R('Sotto', 'Premi «Conferma»'), R('ATTENZIONE', 'NON caricare a magazzino i pezzi tagliati: restano sull’ordine')],
      ['Ordine 1000001: lavori in corso (WIP) 4.380 €', 'Nessun pezzo entra in magazzino', 'Poi qui nel pannello ricostruisci la scrittura']],
    'CO11N: Piegatura 60 ore, WIP 6.060': ['IL REPARTO PIEGATURA DICHIARA 60 ORE sullo STESSO ordine. Il costo dell’ordine cresce.',
      [R('Stessa pagina, riquadro «Conferma delle ore», menu «Ordine»', 'Scegli lo stesso ordine', '1000001'), R('Menu «Fase»', 'Scegli', 'Piegatura'), R('Casella «Pezzi della fase»', 'Scrivi', '300'), R('Casella «Ore di attrezzaggio»', 'Scrivi', '0'), R('Casella «Ore di lavorazione»', 'Scrivi', '60'), R('Casella «Data»', 'Scrivi', '09/12/2026'), R('Sotto', 'Premi «Conferma»')],
      ['Lavori in corso dell’ordine 1000001: 6.060 €', 'Nessun pezzo entra in magazzino', 'Poi qui nel pannello ricostruisci la scrittura']],
    'CO11N: Saldatura 120 ore, WIP 9.420': ['IL REPARTO SALDATURA DICHIARA 120 ORE: è l’ultima fase. Le transenne sono finite, ma non sono ancora in magazzino.',
      [R('Stessa pagina, riquadro «Conferma delle ore», menu «Ordine»', 'Scegli', '1000001'), R('Menu «Fase»', 'Scegli', 'Saldatura'), R('Casella «Pezzi della fase»', 'Scrivi', '300'), R('Casella «Ore di attrezzaggio»', 'Scrivi', '0'), R('Casella «Ore di lavorazione»', 'Scrivi', '120'), R('Casella «Data»', 'Scrivi', '11/12/2026'), R('Sotto', 'Premi «Conferma»')],
      ['Lavori in corso dell’ordine 1000001: 9.420 €', 'Tre fasi complete', 'Poi qui nel pannello ricostruisci la scrittura']],
    '101: carica a magazzino le 300 transenne': ['CARICA LE TRANSENNE FINITE IN MAGAZZINO. Escono dalla fabbrica ed entrano in magazzino: ora si possono vendere.',
      [APRI, R('Riquadro «Entrata del prodotto», menu «Ordine»', 'Scegli', '1000001'), R('Casella «Pezzi»', 'Lasciala vuota (= 300)'), R('Casella «Data»', 'Scrivi', '12/12/2026'), R('Sotto', 'Premi «Registra entrata»')],
      ['6 pallet da 50 transenne nella zona di arrivo GR-ZONE', 'Lavori in corso dell’ordine: zero', 'Poi qui nel pannello ricostruisci la scrittura']],
    'RF: metti a scaffale i 6 pallet di transenne': ['METTI A SCAFFALE I 6 PALLET DI TRANSENNE CON LA PISTOLA.',
      rf('12/12/2026', '6 compiti', 'i 6 pallet'),
      ['300 transenne a scaffale', 'Zona di arrivo vuota'], RF_PERCHE],
    'CO01: ordine autonomo per 20 kit SL-TAGLIO': ['APRI UN SECONDO ORDINE, DIVERSO: 20 kit di ferro tagliato da tenere a scorta. Non c’entrano con le transenne.',
      [APRI, R('Riquadro «Crea ordine di produzione», menu «Materiale»', 'Scegli', 'SL-TAGLIO'), R('Casella «Quantità (pz)»', 'Scrivi', '20'), R('Casella «Data di inizio»', 'Scrivi', '12/12/2026'), R('Sotto', 'Premi «Rilascia ordine»')],
      ['Ordine 1000002: 160 kg di ferro + 5 ore di taglio = 292 €']],
    'WMS: approvvigiona il ferro dei 20 kit': ['PREPARA IL FERRO DEI KIT: 160 kg dalla catasta alla linea.',
      [APRI, R('Riquadro «Approvvigionamento della produzione», menu «Ordine di produzione»', 'Scegli «1000002 SL-TAGLIO»'), R('Casella «Quantità del componente»', 'Lasciala vuota (= 160 kg)'), R('Casella «Data»', 'Scrivi', '12/12/2026'), R('Sotto', 'Premi «Crea compiti (FIFO)»')],
      ['1 compito STAGING: 160 kg da F-02 alla linea PSA-L1']],
    'RF: porta alla linea il ferro dei kit': ['PORTA IL FERRO DEI KIT ALLA LINEA CON LA PISTOLA.',
      rf('12/12/2026', '1 compito', 'lo STAGING da 160 kg'),
      ['160 kg nella zona della linea', 'In F-02 restano 240 + 500 kg'], RF_PERCHE],
    '261: consuma 160 kg per il HALB': ['IL FERRO DEI KIT ENTRA IN LAVORAZIONE sull’ordine 1000002.',
      [APRI, R('Riquadro «Prelievo per l’ordine», menu «Ordine»', 'Scegli', '1000002'), R('Casella «Quantità del componente»', 'Scrivi', '160'), R('Casella «Data»', 'Scrivi', '12/12/2026'), R('Sotto', 'Premi «Registra prelievo»')],
      ['Ferro rimasto in magazzino: 740 kg', 'Poi qui nel pannello ricostruisci la scrittura']],
    'CO11N: conferma 5 ore del HALB': ['IL TAGLIO DICHIARA 5 ORE PER I KIT.',
      [APRI, R('Riquadro «Conferma delle ore», menu «Ordine»', 'Scegli', '1000002'), R('Menu «Fase»', 'Scegli', 'Taglio'), R('Casella «Ore di attrezzaggio»', 'Scrivi', '0'), R('Casella «Ore di lavorazione»', 'Scrivi', '5'), R('Casella «Data»', 'Scrivi', '12/12/2026'), R('Sotto', 'Premi «Conferma»')],
      ['Costo dell’ordine dei kit: 292 €', 'Poi qui nel pannello ricostruisci la scrittura']],
    '101: versa a magazzino i 20 kit autonomi': ['CARICA I 20 KIT IN MAGAZZINO. Questi restano a scorta.',
      [APRI, R('Riquadro «Entrata del prodotto», menu «Ordine»', 'Scegli', '1000002'), R('Casella «Pezzi»', 'Lasciala vuota (= 20)'), R('Casella «Data»', 'Scrivi', '12/12/2026'), R('Sotto', 'Premi «Registra entrata»')],
      ['Un cassone da 20 kit nella zona di arrivo, con un compito per metterlo a scaffale', 'Poi qui nel pannello ricostruisci la scrittura']],
    'RF: metti a scaffale il cassone SL-TAGLIO': ['METTI A SCAFFALE IL CASSONE DEI KIT CON LA PISTOLA.',
      rf('12/12/2026', '1 compito', 'il cassone da 20'),
      ['20 kit a scaffale, disponibili'], RF_PERCHE],
    'Leggi la mappa delle ubicazioni': ['GUARDA LA MAPPA DEL MAGAZZINO: dove sta ogni cosa. Serve per il passo dopo.',
      [APRI, R('Mappa, catasta F-02', 'Leggi: 240 kg COL-1204 e 500 kg COL-1206'), R('Mappa', 'Trova il cassone da 20 SL-TAGLIO'), R('Un foglio o gli appunti del pannello', 'Scrivi il codice UdC del cassone e il suo scaffale'), FATTO],
      ['Ferro in F-02', 'Il cassone dei kit su uno scaffale (lo trovi tu sulla mappa)']],
    'Dove si trova? Cerca il ferro': ['DOVE SI TROVA IL FERRO? Scegli l’articolo e il programma te lo mostra sulla mappa, con quello che puoi prelevare.',
      [APRI, R('In alto, menu «🔎 Dove si trova? Articolo»', 'Scegli', 'FERRO'), R('Mappa', 'Guarda la catasta con il bordo arancione'), R('Tabella sotto «Dove si trova FERRO»', 'Leggi le due righe: ubicazione, UdC, quantità'), R('Riquadri in alto', 'Leggi «libere a scaffale» e «giacenza contabile»: devono essere uguali'), FATTO],
      ['FERRO tutto in F-02: 240 kg + 500 kg = 740 kg', 'Tutte e due le righe ✅ LIBERA a scaffale', 'Lotti: COL-1204 e COL-1206']],
    'LT10: sposta il cassone da 20 in fondo al magazzino': ['SPOSTA IL CASSONE DEI KIT IN FONDO AL MAGAZZINO: si usano poco, quindi lontano dalla porta.',
      [APRI, R('Riquadro «Trasferimento tra ubicazioni», menu «Unità di carico»', 'Scegli il cassone da 20 SL-TAGLIO'), R('Casella «Ubicazione di destinazione»', 'Scrivi', '03-05-2'), R('Casella «Motivo»', 'Scrivi', 'resti in fondo al magazzino'), R('Casella «Data»', 'Scrivi', '12/12/2026'), R('Sotto', 'Premi «Crea compito»')],
      ['Un compito di trasferimento verso 03-05-2']],
    'RF: conferma lo spostamento del cassone': ['SPOSTA DAVVERO IL CASSONE CON LA PISTOLA.',
      rf('12/12/2026', '1 compito', 'il trasferimento del cassone'),
      ['Lo scaffale 03-05-2 contiene i 20 kit'], RF_PERCHE],
    'Stampa le etichette del cassone e dell’ubicazione': ['STAMPA LE ETICHETTE: una sul cassone e una sullo scaffale. Sono quelle che la pistola legge.',
      [APRI, R('Pagina delle etichette', 'Scegli l’UdC del cassone e l’ubicazione 03-05-2'), R('In alto', 'Premi 🖨️ (oppure salva in PDF)'), FATTO],
      ['Le due etichette con codice a barre e QR']],
    'Controlla WIP e stock: due concetti distinti': ['CONTROLLA CHE MAGAZZINO E CONTABILITÀ DICANO LA STESSA COSA.',
      [APRI, R('Monitor del magazzino, riquadro «Confronto giacenze IM – WMS»', 'Controlla che le due colonne siano uguali'), R('Stessa tabella', 'Leggi: ferro 740 kg · kit 20 · transenne 300'), FATTO],
      ['Ferro 740 kg · kit 20 · transenne 300', 'Nessun lavoro in corso rimasto sull’ordine delle transenne', 'Le colonne IM e WMS sono uguali']],
    'RF Interroga: che cosa c’è in un’ubicazione?': ['CHIEDI ALLA PISTOLA COSA C’È SU UNO SCAFFALE. Si usa quando un’etichetta non torna. Non cambia niente.',
      [APRI, R('Scheda «🔎 Interroga»', 'Scrivi', '03-05-2'), R('Stessa casella', 'Premi Invio e leggi: 20 SL-TAGLIO'), R('Stessa casella', 'Scrivi l’UdC di un pallet di transenne (copiala dalla Mappa) e premi Invio'), FATTO],
      ['03-05-2: 20 kit SL-TAGLIO', 'Il pallet: 50 transenne, lotto e scaffale']],
    'Blocca un pallet di transenne urtato dal carrello': ['UN PALLET È STATO URTATO: BLOCCALO finché non lo controlli. Resta nostro, ma non si può spedire.',
      [APRI, R('Riquadro «1 · Metti in quarantena una UdC», menu «Unità di carico»', 'Scegli il primo pallet TR-STD dell’elenco'), R('Casella «Quantità da controllare»', 'Lasciala vuota (= tutto il pallet, 50)'), R('Casella «Motivo»', 'Scrivi', 'pallet urtato dal carrello, da controllare'), R('Casella «Data»', 'Scrivi', '13/12/2026'), R('Sotto', 'Premi «Metti in quarantena e crea il compito RF»')],
      ['50 transenne bloccate', 'Un compito per portare il pallet in quarantena (Q-ZONE)']],
    'RF: porta il pallet in quarantena': ['PORTA IL PALLET URTATO NELLA ZONA QUARANTENA CON LA PISTOLA.',
      rf('13/12/2026', '1 compito', 'il pallet verso Q-ZONE'),
      ['Il pallet è in Q-ZONE', 'Il suo scaffale è libero'], RF_PERCHE],
    'Controllo superato: sblocca il pallet (343)': ['IL CONTROLLO È ANDATO BENE: SBLOCCA IL PALLET. Le transenne tornano vendibili.',
      [APRI, R('Riquadro «3 · Decidi sulla merce arrivata in quarantena», menu «UdC in quarantena»', 'Scegli il pallet TR-STD'), R('Casella «Esito del controllo / motivo»', 'Scrivi', 'imballo integro, transenne non danneggiate'), R('Casella «Data»', 'Scrivi', '13/12/2026'), R('Sotto', 'Premi «Sblocca: è buona (343)»')],
      ['50 transenne di nuovo libere', 'Un compito per rimetterle a scaffale']],
    'RF: rimetti a scaffale il pallet sbloccato': ['RIMETTI A SCAFFALE IL PALLET CON LA PISTOLA.',
      rf('13/12/2026', '1 compito', 'il pallet da Q-ZONE'),
      ['Q-ZONE vuota', '300 transenne disponibili a scaffale'], RF_PERCHE],
    'LT10: lavori al pavimento, sposta un pallet di transenne in fondo': ['CI SONO LAVORI AL PAVIMENTO: SPOSTA UN PALLET IN FONDO al magazzino.',
      [APRI, R('Riquadro «Trasferimento tra ubicazioni», menu «Unità di carico»', 'Scegli il pallet TR-STD appena sbloccato'), R('Casella «Ubicazione di destinazione»', 'Scrivi', '03-04-1'), R('Casella «Motivo»', 'Scrivi', 'lavori al pavimento davanti alla corsia 01'), R('Casella «Data»', 'Scrivi', '13/12/2026'), R('Sotto', 'Premi «Crea compito»')],
      ['Un compito di trasferimento verso 03-04-1']],
    'RF: conferma lo spostamento in fondo': ['SPOSTA DAVVERO IL PALLET CON LA PISTOLA.',
      rf('13/12/2026', '1 compito', 'il trasferimento verso 03-04-1'),
      ['Il pallet è in 03-04-1, lontano dalla porta'], RF_PERCHE],
    'Slotting: avvicina le transenne alla porta di spedizione': ['METTI LE TRANSENNE VICINO ALLA PORTA: sono quelle che escono di più, così il carrellista cammina meno.',
      [APRI, R('Riquadro «Proposta di ricollocazione»', 'Leggi quali pallet spostare e quanti metri si risparmiano'), R('Riquadro «Applica lo slotting», casella «Data»', 'Scrivi', '13/12/2026'), R('Sotto', 'Premi «Crea i compiti di trasferimento proposti»')],
      ['Un compito di trasferimento per il pallet rimasto in fondo']],
    'RF: conferma i trasferimenti dello slotting': ['SPOSTA I PALLET VICINO ALLA PORTA CON LA PISTOLA.',
      rf('13/12/2026', 'tutti i compiti', 'i trasferimenti dello slotting'),
      ['Le transenne sono vicino alla porta: guardalo sulla Mappa'], RF_PERCHE],
    'Arretrato e scadenze: chi aspetta la merce?': ['CHI ASPETTA LA MERCE? Rosso = siamo in ritardo, arancio = scade oggi, giallo = scade fra pochi giorni. Si guarda ogni mattina.',
      [APRI, R('In alto, casella «Data di oggi»', 'Scrivi', '14/12/2026'), R('Riquadro «1 · Clienti che aspettano la merce»', 'Leggi le righe di Beta e Delta e il loro colore'), R('Riquadri 2, 3 e 4', 'Controlla che non ci siano righe rosse'), R('Casella «Data di oggi»', 'Prova a scrivere', '15/12/2026'), R('Riquadro 1', 'Guarda: Beta e Delta diventano rossi'), R('Casella «Data di oggi»', 'Rimetti', '14/12/2026'), FATTO],
      ['Beta 180 e Delta 120: 🟠 SCADE OGGI', 'Con il 15/12: 🔴 IN RITARDO di 1 giorno', 'Fornitori, produzione, compiti: niente in ritardo']],
    'Attiva il prelievo a ondate': ['DECIDI DI PRELEVARE «A ONDATE»: le consegne aspettano e poi si prelevano tutte insieme in un solo giro.',
      [APRI, R('Riquadro «Modo di lavoro del magazzino», menu «Prelievo a ondate»', 'Scegli «sì: le consegne aspettano l’ondata»'), R('Menu «Cross-docking opportunistico»', 'Scegli «no»'), R('Sotto', 'Premi «Salva»')],
      ['Le prossime consegne non creano subito i compiti']],
    'VL01N: consegna per Beta': ['PREPARA LA CONSEGNA PER BETA. È l’ordine di spedire: la merce non è ancora partita.',
      [APRI, R('Riquadro «Consegna con uscita merci», menu «Ordine cliente»', 'Scegli l’ordine 10000001 di Beta (180 TR-STD)'), R('Casella «Data uscita merci»', 'Scrivi', '14/12/2026'), R('Sotto', 'Premi «Crea consegna (con prelievo a magazzino)»')],
      ['Consegna 80000001 in attesa dell’ondata', 'Ancora nessun prelievo']],
    'VL01N: consegna per Delta': ['PREPARA LA CONSEGNA PER DELTA.',
      [R('Stessa pagina, riquadro «Consegna con uscita merci», menu «Ordine cliente»', 'Scegli l’ordine 10000002 di Delta (120 TR-STD)'), R('Casella «Data uscita merci»', 'Scrivi', '14/12/2026'), R('Sotto', 'Premi «Crea consegna (con prelievo a magazzino)»')],
      ['Consegna 80000002 in attesa dell’ondata']],
    'Rilascia l’ondata ONDA-1': ['FAI PARTIRE IL PRELIEVO: un solo giro per le due consegne, nell’ordine del percorso.',
      [APRI, R('Riquadro «Rilascia l’ondata», casella «Data»', 'Scrivi', '14/12/2026'), R('Sotto', 'Premi «Rilascia l’ondata (compiti in ordine di percorso)»')],
      ['ONDA-1: 2 consegne, 7 compiti di prelievo (PICK)', 'I metri del giro unico contro un giro per ordine']],
    'Stampa la lista di prelievo': ['STAMPA LA LISTA DI PRELIEVO che il carrellista porta con sé.',
      [APRI, R('Lista di prelievo delle consegne 80000001 e 80000002', 'Leggi scaffale, UdC e quantità di ogni riga'), R('In alto', 'Premi 🖨️'), FATTO],
      ['7 righe, nell’ordine del percorso']],
    'RF: preleva i 7 pallet (FIFO)': ['PRELEVA LE TRANSENNE CON LA PISTOLA e portale nella zona di spedizione. Non sono ancora partite.',
      rf('14/12/2026', '7 compiti', 'i 7 PICK, senza cambiare le quantità'),
      ['300 transenne nella zona di spedizione GI-ZONE', 'Scaffali delle transenne vuoti'], RF_PERCHE],
    'Imballa Beta in 4 colli SSCC': ['IMBALLA LA MERCE DI BETA IN COLLI. Ogni collo riceve un’etichetta con un codice unico (SSCC).',
      [APRI, R('Riquadro «Imballa la consegna», menu «Consegna prelevata»', 'Scegli', '80000001'), R('Menu «Materiale d’imballo»', 'Scegli', 'EUR'), R('Casella «Pezzi per collo»', 'Scrivi', '50'), R('Casella «Data»', 'Scrivi', '14/12/2026'), R('Sotto', 'Premi «Crea i colli (SSCC)»')],
      ['4 colli (50 + 50 + 50 + 30), ognuno con il suo SSCC']],
    'Imballa Delta in 3 colli SSCC': ['IMBALLA LA MERCE DI DELTA IN COLLI.',
      [R('Stesso riquadro, menu «Consegna prelevata»', 'Scegli', '80000002'), R('Menu «Materiale d’imballo»', 'Scegli', 'EUR'), R('Casella «Pezzi per collo»', 'Scrivi', '40'), R('Casella «Data»', 'Scrivi', '14/12/2026'), R('Sotto', 'Premi «Crea i colli (SSCC)»')],
      ['3 colli da 40']],
    'Crea un trasporto per le due consegne': ['PRENOTA IL CAMION: un camion per tutti e due i clienti.',
      [APRI, R('Riquadro «Crea il trasporto», casella «Consegne»', 'Scrivi', '80000001, 80000002'), R('Menu «Vettore»', 'Scegli «V10 Trasporti Toscani»'), R('Casella «Targa del mezzo»', 'Scrivi', 'AA000AA'), R('Casella «Autista»', 'Scrivi', 'Mario Esempio'), R('Casella «Data di carico»', 'Scrivi', '15/12/2026'), R('Sotto', 'Premi «Crea trasporto»')],
      ['Un trasporto con due consegne']],
    'RF Carico: carica i 4 colli di Beta con la pistola': ['CARICA I COLLI DI BETA SUL CAMION leggendo l’etichetta di ognuno.',
      [APRI, R('In alto, casella «Data di lavoro»', 'Scrivi', '15/12/2026'), R('Scheda «🚛 Carico»', 'Aprila'), R('Pagina «Imballo e etichette SSCC» (in un’altra scheda o sul foglio)', 'Copia il primo SSCC della consegna 80000001'), R('Casella «Leggi l’SSCC del collo da caricare»', 'Incolla il codice e premi Invio'), R('Stessa casella', 'Ripeti per gli altri 3 colli di Beta')],
      ['4 colli di Beta caricati ✅', 'Se leggi due volte lo stesso collo, la pistola lo rifiuta']],
    'Varco RFID: carica i 3 colli di Delta in un passaggio': ['CARICA I COLLI DI DELTA PASSANDO DAL VARCO RFID: si leggono tutti insieme, senza girare i pallet.',
      [APRI, R('Riquadro «Passaggio dal varco RFID», menu «Trasporto in carico»', 'Scegli il trasporto appena creato'), R('Casella «Data»', 'Scrivi', '15/12/2026'), R('Sotto', 'Premi «Fai passare il carrello dal varco»')],
      ['3 tag letti in un passaggio: 7 colli su 7 caricati']],
    'Partenza: uscita merci 601 e DDT': ['IL CAMION PARTE: LA MERCE ESCE DAL MAGAZZINO. Nascono i DDT.',
      [APRI, R('Riquadro «Fine carico e uscita merci», menu «Trasporto»', 'Scegli il trasporto appena creato'), R('Casella «Data di partenza»', 'Scrivi', '15/12/2026'), R('Sotto', 'Premi «Registra la partenza e l’uscita merci»')],
      ['Transenne in magazzino: 0', 'Due DDT, uno per cliente', 'Poi qui nel pannello ricostruisci le scritture']],
    'VL06O: controlla il monitor della spedizione': ['CONTROLLA CHE LE DUE CONSEGNE SIANO PARTITE.',
      [APRI, R('Tabella «Monitor delle consegne in uscita»', 'Leggi le righe 80000001 e 80000002'), FATTO],
      ['Prelievo completato, colli, trasporto e uscita merci del 15/12']],
    'Stampa i DDT delle due consegne': ['STAMPA I DDT: il documento che viaggia con la merce sul camion.',
      [APRI, R('Pagina DDT', 'Controlla mittente, destinatario, vettore, colli e SSCC'), R('In alto', 'Premi 🖨️ (oppure salva in PDF)'), FATTO],
      ['Un DDT per Beta e uno per Delta']],
    'Reclamo simulato: da quale ferro vengono le transenne di Beta?': ['UN CLIENTE RECLAMA: DA QUALE FERRO VENGONO LE SUE TRANSENNE? Con i lotti si risponde in un minuto.',
      [APRI, R('Riquadro «Reclamo di un cliente: risali dalla consegna»', 'Scegli la consegna 80000001 di Beta'), R('Risultato', 'Leggi: lotto L1000001 → ferro della colata COL-1204, Acciaierie Umbre'), R('Accanto alla colata COL-1204', 'Premi «Traccia» per vedere a chi è arrivata'), FATTO],
      ['La colata COL-1204 è arrivata a Beta e a Delta', 'La colata COL-1206 è ancora in magazzino']],
    'Classificazione ABC dei materiali': ['CLASSIFICA I MATERIALI: quelli di classe A valgono di più e si contano più spesso.',
      [APRI, R('Riquadro «Classificazione ABC sul valore dei consumi»', 'Leggi la classe di ogni materiale'), FATTO],
      ['TR-STD in classe A']],
    'LI01N: documento d’inventario delle ubicazioni occupate': ['PREPARA L’INVENTARIO: scegli gli scaffali da contare.',
      [APRI, R('Riquadro «Crea documento d’inventario», menu «Tipo»', 'Scegli «Inventario per ubicazioni scelte»'), R('Casella «Classe ABC o ubicazioni»', 'Scrivi', 'F-02, 03-05-2'), R('Casella «Tolleranza di riconta»', 'Scrivi', '10'), R('Casella «Data»', 'Scrivi', '31/12/2026'), R('Sotto', 'Premi «Crea documento»')],
      ['Documento con 3 righe: 2 fasci in F-02, il cassone in 03-05-2']],
    'Attiva l’inventario e stampa la lista di conta': ['FERMA GLI SCAFFALI DA CONTARE e stampa la lista. La lista non mostra le quantità: si conta «alla cieca».',
      [APRI, R('Documento appena creato, casella «Data di riferimento»', 'Scrivi', '31/12/2026'), R('Sotto', 'Premi «Attiva (blocca le ubicazioni)»'), R('Lista di conta', 'Premi 🖨️')],
      ['F-02 e 03-05-2 bloccate: niente prelievi finché non chiudi']],
    'RF Inventario: conta la catasta F-02 con la pistola': ['CONTA IL FERRO CON LA PISTOLA, colata per colata.',
      [APRI, R('Scheda «📝 Inventario», casella «Leggi l’ubicazione da contare»', 'Scrivi F-02 e premi Invio', 'F-02'), R('Riga colata COL-1204', 'Scrivi', '240'), R('Riga colata COL-1206', 'Scrivi', '500'), R('Sotto', 'Premi «Registra la conta»')],
      ['Conta di F-02 salvata', 'Manca ancora 03-05-2']],
    'LI11N: registra alla scrivania la conta del cassone (manca un kit)': ['CONTA IL CASSONE DEI KIT: NE MANCA UNO. Lo scrivi alla scrivania.',
      [APRI, R('Documento d’inventario, riga 03-05-2 SL-TAGLIO', 'Scrivi', '19'), R('Riga F-02', 'Non toccarla: è già contata'), R('Casella «Contato da»', 'Scrivi il tuo nome'), R('Sotto', 'Premi «Registra la conta (LI11N)»')],
      ['Differenza −1 kit (14,60 €): supera la tolleranza di 10 €', 'Stato del documento: «riconta»']],
    'LI14: riconta il cassone': ['RICONTA IL CASSONE: prima di registrare una differenza si conta due volte.',
      [APRI, R('Documento d’inventario, riga 03-05-2 SL-TAGLIO', 'Scrivi', '19'), R('Sotto', 'Premi «Registra la riconta (LI14)»')],
      ['Stato del documento: «contato»']],
    'LI20: chiudi l’inventario nel WMS': ['CHIUDI L’INVENTARIO NEL MAGAZZINO: lo scaffale ora dice 19 kit. Gli scaffali si sbloccano.',
      [APRI, R('Documento d’inventario, casella «Data»', 'Scrivi', '31/12/2026'), R('Sotto', 'Premi «Chiudi nel WMS: differenze nella 999 (LI20)»')],
      ['03-05-2: 19 kit', 'Il kit mancante va nella zona differenze 999', 'Ancora nessuna registrazione in contabilità']],
    'LI21: registra la differenza in contabilità': ['REGISTRA LA DIFFERENZA ANCHE IN CONTABILITÀ: ora i conti dicono quello che c’è davvero.',
      [APRI, R('Riquadro «Registra in contabilità di magazzino», casella «Data»', 'Scrivi', '31/12/2026'), R('Sotto', 'Premi «Registra le differenze»')],
      ['In magazzino e in contabilità: 19 kit', 'Poi qui nel pannello ricostruisci la scrittura']],
    'Valorizza la rimanenza di ferro con i quattro metodi': ['QUANTO VALE IL FERRO RIMASTO? Dipende dal metodo: guardali tutti e quattro.',
      [APRI, R('Riquadro della valorizzazione, materiale FERRO', 'Leggi i quattro valori'), FATTO],
      ['FIFO 780 · LIFO 740 · costo medio 748,97 · costo standard 703 (quello del bilancio)']],
    'Scorta minima del ferro: è ora di riordinare?': ['METTI UN LIMITE SOTTO CUI IL FERRO VA RIORDINATO. Se ne resta meno, il programma accende la luce rossa e ti dice quanto ordinare.',
      [APRI, R('Riquadro «Imposta la scorta minima», menu «Materiale»', 'Scegli', 'FERRO'), R('Casella «Scorta minima (punto di riordino)»', 'Scrivi', '1000'), R('Casella «Scorta massima»', 'Scrivi', '3000'), R('Sotto', 'Premi «Salva la scorta minima»'), R('Tabella «Scorte e semaforo», riga FERRO', 'Leggi stato e proposta di riordino')],
      ['FERRO: 740 kg, sotto il minimo di 1.000 → 🔴 SOTTO SCORTA', 'Proposta di riordino: 2.260 kg (3.000 − 740)', 'Nessun ordine creato: lo decide una persona'],
      'La scorta minima è un paracadute: se il ferro finisce, la produzione si ferma. Il programma propone, l’ordine lo fai tu.'],
    'Trasferimento: 10 kit al deposito esterno D200': ['MANDA 10 KIT AL DEPOSITO DELLA FILIALE. Prima si prepara il trasferimento: il programma dice quale merce prendere.',
      [APRI, R('Riquadro «1 · Crea il trasferimento», menu «Da dove parte»', 'Scegli «dal magazzino W100 al deposito esterno D200»'), R('Menu «Materiale»', 'Scegli', 'SL-TAGLIO'), R('Casella «Quantità da trasferire»', 'Scrivi', '10'), R('Casella «Data»', 'Scrivi', '31/12/2026'), R('Casella «Arrivo previsto»', 'Scrivi', '02/01/2027'), R('Sotto', 'Premi «Crea il trasferimento»')],
      ['Trasferimento UB001', '1 compito di prelievo per il deposito: 10 kit dal cassone in 03-05-2'],
      'La merce non si vende e non cambia proprietario: cambia solo posto. Per questo non c’è nessuna scrittura.'],
    'RF: preleva i 10 kit per il deposito': ['PRENDI I 10 KIT CON LA PISTOLA e portali in banchina, pronti per il camion.',
      rf('31/12/2026', '1 compito', 'il prelievo per il deposito'),
      ['10 kit in banchina GI-ZONE', '9 kit restano nel cassone in 03-05-2'], RF_PERCHE],
    'Uscita 351: il camion parte, i kit sono in viaggio': ['IL CAMION PARTE. Da adesso i 10 kit NON SONO NÉ QUA NÉ LÀ: non sono più nel nostro magazzino e non sono ancora nel deposito.',
      [APRI, R('Riquadro «2 · Carica il camion: uscita 351», menu «Trasferimento pronto»', 'Scegli', 'UB001'), R('Casella «Data di partenza»', 'Scrivi', '31/12/2026'), R('Sotto', 'Premi «Registra l’uscita 351 (merce in viaggio)»'), R('Tabella «Dove sono le scorte: per luogo», riga SL-TAGLIO', 'Leggi le colonne')],
      ['Stato 🚚 IN VIAGGIO', 'SL-TAGLIO: 9 in W100 + 10 in viaggio + 0 nel deposito = 19'],
      'La merce sul camion è nostra e conta nel bilancio, ma non si può vendere né prelevare finché non arriva.'],
    'Dove si trova? I kit sul camion a fine anno': ['DOVE SONO I KIT? Il programma ti dice che 10 sono sulla strada. Sono nostri anche se non sono in nessun magazzino.',
      [APRI, R('In alto, menu «🔎 Dove si trova? Articolo»', 'Scegli', 'SL-TAGLIO'), R('Tabella sotto', 'Leggi le due righe: 9 ✅ libere e 10 ⛔ sul camion'), R('In fondo alla mappa, riquadro «Fuori dal magazzino W100»', 'Guarda IN-VIAGGIO'), R('Poi pagina Arretrato e scadenze, «Data di oggi»', 'Scrivi', '31/12/2026'), R('Riquadro «5 · Merce in viaggio tra depositi»', 'Leggi la riga UB001'), FATTO],
      ['9 kit prelevabili, 10 sul camion', 'UB001 🟡 arriva fra 2 giorni', 'A fine anno i 19 kit sono tutti nelle rimanenze']],
    'Entrata 101 al deposito: i kit sono arrivati': ['IL CAMION È ARRIVATO AL DEPOSITO. Si contano i kit e si registra l’arrivo: il viaggio è finito.',
      [APRI, R('Riquadro «3 · Ricevi all’arrivo», menu «Trasferimento in viaggio»', 'Scegli', 'UB001'), R('Casella «Quantità contata all’arrivo»', 'Lasciala vuota (= tutti i 10)'), R('Casella «Data di arrivo»', 'Scrivi', '02/01/2027'), R('Sotto', 'Premi «Registra l’entrata 101»')],
      ['Stato: arrivato il 02/01/2027', 'SL-TAGLIO: 9 in W100 + 10 nel deposito D200 = 19']],
    'KPI di magazzino di dicembre': ['GUARDA I NUMERI DEL MAGAZZINO: quanto è preciso, quanto è veloce. Facoltativo.',
      [APRI, R('Pagina KPI', 'Leggi accuratezza dell’inventario, ordini perfetti, tempi, compiti per persona'), FATTO],
      ['I KPI di dicembre']]
  };


  // Tutte le attività mantengono il medesimo suggeritore giallo, non solo le
  // prime quattro. I controlli CPM specifici (con verifica sullo stato) prevalgono.
  // Le righe descrittive diventano micro-passaggi di lettura/conferma: NON
  // vengono mai scambiate per registrazioni ERP validate automaticamente.
  function microPassi(p) {
    var righe = Array.isArray(p.fai) ? p.fai : [];
    var out = [];
    righe.forEach(function (f) {
      if (f && typeof f === 'object' && !Array.isArray(f) && f.fai) {
        out.push({t:'leggi',nome:String(f.dove || 'Attività da eseguire'),
          serve:String(f.fai) + (f.valore ? ' — Valore: ' + f.valore : '') + '. Esegui questa azione nella pagina, poi premi «Ho letto, vai avanti».'});
      } else if (Array.isArray(f)) {
        out.push({t:'leggi',nome:String(f[0] || 'Verifica'),serve:'Nel campo «' + String(f[0] || '') +
          '» usa o controlla questo valore: ' + String(f[1] || '') + '. Conferma dopo avere eseguito il controllo.'});
      } else if (typeof f === 'string') {
        out.push({t:'leggi',nome:f.slice(0,95),
          serve:f + '. Quando hai eseguito questa istruzione, conferma per passare alla successiva.'});
      }
    });
    if (!out.length) {
      out.push({t:'leggi',nome:'Apri la schermata corretta',
        serve:'Premi «Apri ➜» nel tutor per raggiungere: ' + (p.percorso || 'il modulo indicato') + '.'});
      (p.campi || []).forEach(function(c) {
        out.push({t:'leggi',nome:String(c[0] || 'Campo'),
          serve:'Individua «' + String(c[0] || 'Campo') + '» nella pagina. ' +
            'Inserisci, seleziona o verifica: ' + String(c[1] == null ? '' : c[1]) +
            '. Conferma soltanto dopo aver eseguito il controllo.'});
      });
      if (p.fatto) out.push({t:'leggi',nome:'Conferma nel gestionale',
        serve:'Esegui il comando di registrazione previsto in questa schermata. ' +
          'Attendi la conferma reale del gestionale: la spunta del tutor da sola NON registra alcuna operazione.'});
      else out.push({t:'leggi',nome:'Controllo finale del passaggio',
        serve:'Confronta i dati e i documenti con «Cosa devi vedere». ' +
          'Se è tutto corretto, marca manualmente il passo come svolto.'});
    }
    return out;
  }

  // SSCC = codice del COLLO, non numero dell'ordine e non numero del DDT.
  // Gli SSCC sono generati dal pulsante «Crea i colli» soltanto DOPO il picking.
  var spiegaSscc =
    'Un SSCC (Serial Shipping Container Code) è il numero univoco di 18 cifre di ogni pallet/collo. ' +
    'Non devi inventarlo né scriverlo tu: lo crea il programma quando imballi. ' +
    'La stessa etichetta serve a caricare il collo sul camion e a rintracciarlo nel DDT. ' +
    'Il prefisso GS1 di questa esercitazione è simulato.';
  function puntiImballo(consegna, quantita, colli) {
    return [
      {t:'leggi',nome:'Dove andare: Spedizione → Imballo',
        serve:'Apri dal menu Sistema integrato → Spedizione → Imballo. Qui ci sono il riquadro «Imballa la consegna» e la tabella dei colli. ' + spiegaSscc},
      {t:'scelta',sel:'#im-consegna',nome:'Consegna prelevata',valore:consegna,
        serve:'Scegli la consegna ' + consegna + '. Deve avere il prelievo completato con RF: una consegna non prelevata non può ancora essere imballata.'},
      {t:'scelta',sel:'#im-imballo',nome:'Materiale d’imballo',valore:'EUR',
        serve:'EUR è il pallet europeo. La regola di confezionamento stabilisce peso e capacità; non scegliere un collo incompatibile.'},
      {t:'campo',sel:'#im-perCollo',nome:'Pezzi per collo',valore:String(quantita),
        serve:'Indica ' + quantita + ' transenne per pallet. Le quantità rimaste vanno nell’ultimo collo; nessuna transenna va inventata o persa.'},
      {t:'campo',sel:'#im-data',nome:'Data imballaggio',valore:'2026-12-14',
        serve:'Usa 14/12/2026: il collo viene preparato prima del carico camion.'},
      {t:'pulsante',sel:'[data-prefisso="im"] [data-azione="im"]',nome:'Crea i colli (SSCC)',
        serve:'Premi UNA volta. Ora il programma genera ' + colli + ' colli con ' + colli +
          ' numeri SSCC differenti. Non ripetere il comando se i colli risultano già generati.'},
      {t:'leggi',nome:'Dove trovare i numeri SSCC',
        serve:'Resta in Spedizione → Imballo. Scendi alla tabella «Colli della consegna ' + consegna +
          '», colonna «SSCC»: copia o leggi i numeri reali di 18 cifre. NON usare il numero della consegna al loro posto.'},
      {t:'leggi',nome:'Stampa e applica le etichette',
        serve:'Nella stessa pagina, sopra le etichette della consegna, premi «Stampa le etichette». ' +
          'Ogni pallet deve avere la propria etichetta GS1-128 con (00) e il suo SSCC. ' +
          'Per proseguire serve conoscere tutti i ' + colli + ' codici, non un solo codice per tutta la consegna.'}
    ];
  }
  function puntiCaricoBeta() {
    return [
      {t:'leggi',nome:'Recupera gli SSCC di Beta',
        serve:'Apri Sistema integrato → Spedizione → Imballo, cerca la consegna 80000001. ' +
          'Nella tabella «Colli della consegna» trovi i QUATTRO SSCC generati in precedenza. ' +
          'Puoi tenere quella pagina aperta in un’altra scheda o usare le etichette stampate. ' + spiegaSscc},
      {t:'leggi',nome:'Torna a Magazzino → Pistola RF → Carico',
        serve:'Nella navigazione principale apri Magazzino → Pistola RF, poi la scheda «🚛 Carico». ' +
          'Non confondere la scheda «📦 Compiti» (picking) con «🚛 Carico» (collo già imballato).'},
      {t:'leggi',sel:'#rf-sscc',nome:'Scansiona il primo SSCC di Beta',
        serve:'Nella casella «Leggi l’SSCC del collo da caricare» leggi con lo scanner o incolla il PRIMO codice SSCC di 18 cifre preso dalla tabella Imballo, poi premi Invio. Il codice non è 80000001: quello è il numero di consegna.'},
      {t:'leggi',sel:'#rf-sscc',nome:'Scansiona gli altri tre SSCC',
        serve:'Ripeti con ciascuno degli altri TRE codici, uno alla volta. Non ripetere il medesimo SSCC: la pistola rifiuta il doppio carico. Verifica che tutti e quattro i pallet Beta risultino caricati sul trasporto giusto.'},
      {t:'leggi',nome:'Controlla il carico',
        serve:'Apri Spedizione → Trasporti e carico e verifica che il trasporto includa Beta e che i colli caricati siano quattro. ' +
          'Gli SSCC identificano i pallet; la spedizione è terminata soltanto quando saranno caricati anche i colli Delta e registrata l’uscita merci 601.'}
    ];
  }

  E.passi.forEach(function (p) {
    var x = P[p.titolo];
    if (x) {
      p.grande = x[0]; p.fai = x[1]; p.vedi = x[2];
      if (x[3]) p.perche = x[3];
    }
    if (p.titolo === 'Imballa Beta in 4 colli SSCC') {
      p.punti = puntiImballo('80000001', 50, 4);
      p.grande = 'BETA: CREA 4 COLLI E I LORO 4 SSCC. Prima finisci il prelievo; poi vai in SPEDIZIONE → IMBALLO. ' + spiegaSscc;
    } else if (p.titolo === 'Imballa Delta in 3 colli SSCC') {
      p.punti = puntiImballo('80000002', 40, 3);
      p.grande = 'DELTA: CREA 3 COLLI E I LORO 3 SSCC. Tutti i codici si generano in SPEDIZIONE → IMBALLO. ' + spiegaSscc;
    } else if (p.titolo === 'RF Carico: carica i 4 colli di Beta con la pistola') {
      p.punti = puntiCaricoBeta();
      p.grande = 'I CODICI SSCC SI CREANO NELL’IMBALLO E SI LEGGONO NEL CARICO RF. Devi usare 4 codici diversi, uno per pallet.';
    }
    if (!p.punti || !p.punti.length) p.punti = microPassi(p);
    if (!p.grande) p.grande = 'ESEGUI: ' + String(p.titolo || 'Passaggio') +
      '. Apri la schermata indicata e completa UNA azione alla volta. La guida evidenzia cosa fare; soltanto il gestionale può confermare che l’operazione è realmente registrata.';
    if (TAPPA[p.g] != null && !p.mappa) p.mappa = {tappe: TAPPE, attuale: TAPPA[p.g]};
  });
  E.tappeMagazzino = TAPPE;
})();
