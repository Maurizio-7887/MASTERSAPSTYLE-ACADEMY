/* Esercitazione «Magazziniere 5.0: un mese di magazzino» (gennaio 2027) sul sistema integrato S/4 con il WMS.
   Corso Magazzino e Magazziniere 5.0 (60 ore) con la struttura FORMAS in quattro unità:
   UF 8 contabilità di magazzino (MIGO, MIRO, differenze prezzo, consumi, WIP, rottamazioni, resi, valorizzazione),
   UF 9 inventari fisici e contabili, UF 10 sistemi informativi (WMS con SD, MM e PP), UF 11 innovazione (slotting, ondate, RFID, KPI).
   Si parte dal «Percorso logistico»: azienda già avviata con prodotti finiti a scaffale, nessuna costituzione né cespiti.
   Date e numeri appartengono all'azienda didattica Ferro & Transenne S.r.l. */
(function () {
  'use strict';
  var D = 'erp_dati.', M = 'erp_magazzino.', A = 'erp_acquisti.', P = 'erp_produzione.', V = 'erp_vendite.', X = 'erp_spedizione.',
      I = 'erp_inventario.', Z = 'erp_innovazione.', F = 'erp_fi.';
  var regs = function (h) { return h.S.registrazioni || []; };
  var nReg = function (h, tipo, f) { return regs(h).filter(function (r) { return r.tipo === tipo && (!f || f(r)); }).length; };
  var wm = function (h) { return h.S.wm || {}; };
  var compiti = function (h, tipo) { return (wm(h).compiti || []).filter(function (t) { return t.tipo === tipo && t.stato !== 'annullato'; }); };
  var confermati = function (h, tipo, n) { return compiti(h, tipo).filter(function (t) { return t.stato === 'confermato'; }).length >= n; };
  var ordine = function (h, rif) { return (h.S.ordini || []).find(function (o) { return o.rif === rif; }); };
  var consegna = function (h, rif) { var o = ordine(h, rif); return o && (h.S.consegne || []).find(function (c) { return c.ordine === o.numero; }); };
  var colli = function (h, rif) { var c = consegna(h, rif); return c ? ((h.S.sped || {}).colli || []).filter(function (x) { return x.consegna === c.numero; }) : []; };
  var trasporti = function (h) { return (h.S.sped || {}).trasporti || []; };
  var acquisto = function (h) { return (h.S.acquisti || []).find(function (o) { return o.materiale === 'FERRO' && o.qta === 3000; }); };
  var prod = function (h) { return (h.S.produzione || []).find(function (o) { return o.materiale === 'TR-STD'; }); };
  var fase = function (h, nome) { return nReg(h, 'CONFERMA', function (r) { return r.descrizione.indexOf('fase ' + nome) >= 0; }) > 0; };
  var reso = function (h) { return (h.S.ordini || []).find(function (o) { return o.tipo === 'RE'; }); };
  var inv = function (h) { return (wm(h).inventari || [])[0]; };
  var ubic = function (h, mat, u) { return (wm(h).quant || []).some(function (q) { return q.mat === mat && q.ubic === u && q.qta > 0; }); };
  var rf = 'Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.';
  var passi = [
    // ══════════ UF 10 · avvio: il magazzino e il sistema ══════════
    {id: 'mag5-avvio', g: 'UF 10 · 0 · Avvio', data: '04/01/2027', titolo: 'Avvia il percorso logistico', contabile: true, dove: {ep: D + 'avvio'},
     percorso: 'Launchpad → Avvio e dati di base → Nuova azienda / Avvio → scheda «Percorso logistico · Magazziniere 5.0»',
     campi: [['Ambiente', 'Sistema integrato in uno spazio vuoto dedicato a questo esercizio (se trovi documenti di altri esercizi chiedi al docente)'], ['Data di avvio', '04/01/2027'],
       ['Ricostruzione delle scritture', 'sì (ragioneria di magazzino): dopo ogni documento contabile ricostruisci Dare e Avere. «No» solo se il docente ha scelto la classe solo operativa'], ['Pulsante', 'Avvia il percorso logistico']],
     attesa: 'Saldi di apertura (561): D 10 Banca 50.000 + D 13 Prodotti finiti 22.785 / A 30 Capitale 72.785. A scaffale contabile: 200 TR-STD × 31,40 = 6.280; 200 TR-ALTA × 36,94 = 7.388; 300 TR-PED × 30,39 = 9.117. Ferro: zero.',
     nota: 'Il magazzino ha un valore: quantità × costo standard. Il conto 13 è la «fotografia in euro» di quello che c’è sugli scaffali.',
     fatto: function (h) { return h.S.percorso === 'logistica'; }},
    {id: 'mag5-attiva', g: 'UF 10 · 0 · Avvio', data: '04/01/2027', titolo: 'Attiva il magazzino a ubicazioni W100', dove: {ep: M + 'struttura'}, percorso: 'WMS → Struttura e attivazione',
     campi: [['Data di attivazione', '04/01/2027'], ['Pulsante', 'Attiva il WMS']],
     attesa: '41 ubicazioni; le giacenze esistenti diventano 14 unità di carico (UdC) da 50 pezzi: 4 pallet TR-STD, 4 TR-ALTA, 6 TR-PED negli scaffali delle corsie 01 e 02. Nessuna scrittura: cambia solo il «dove», non il «quanto».',
     nota: 'Gestione delle scorte (IM): quanti pezzi e quanti euro. WMS: in quale ubicazione e su quale UdC. Le due viste devono sempre quadrare.',
     fatto: function (h) { return wm(h).attivo === '2027-01-04'; }},
    {g: 'UF 10 · 0 · Avvio', titolo: 'Leggi la mappa: corsie, ubicazioni, aree di servizio', dove: {ep: M + 'mappa'}, percorso: 'WMS → Mappa delle ubicazioni',
     campi: [['Corsie', '01 e 02: scaffali a due livelli (es. 01-03-2 = corsia 01, campata 03, livello 2); 03 in fondo'], ['Aree', 'GR-ZONE ricevimento, GI-ZONE spedizione, Q-ZONE quarantena, PSA-L1 bordo linea, F-01/F-02 cataste del ferro'],
       ['Tocca', 'l’ubicazione 01-03-1: sopra la mappa compaiono materiale, quantità e UdC']],
     nota: 'Lettura: spunta a mano con «Fatto». Il codice dell’ubicazione è un indirizzo: chi lo legge sa dove andare senza chiedere.'},
    {g: 'UF 10 · 0 · Avvio', titolo: 'Dove si trova? Cerca le TR-ALTA', dove: {ep: M + 'mappa'}, percorso: 'WMS → Mappa delle ubicazioni → menu «🔎 Dove si trova?» in alto',
     campi: [['Articolo', 'TR-ALTA'], ['Guarda la mappa', 'le ubicazioni con le TR-ALTA hanno il bordo arancione, le altre si sbiadiscono'],
       ['Leggi la tabella', 'per ogni pallet: ubicazione, UdC, quantità, data di entrata e «Che cosa significa» (✅ libera a scaffale oppure ⛔ ferma)'], ['Copia', 'le 4 UdC delle TR-ALTA: ti servono più avanti']],
     attesa: '4 pallet da 50 TR-ALTA, tutti ✅ «LIBERA a scaffale». In alto: 200 libere da prelevare = 200 nelle ubicazioni = 200 in contabilità; 0 bloccate.',
     nota: 'Lettura: spunta a mano. È la domanda che il magazziniere si fa ogni giorno: «dove prendo questo articolo?». Il sistema mette prima le ubicazioni da cui si può prelevare.'},
    {g: 'UF 10 · 0 · Avvio', titolo: 'Stampa le etichette di un’ubicazione e di una UdC', dove: {ep: M + 'etichette'}, percorso: 'WMS → Etichette barcode e QR',
     campi: [['Etichette', 'ubicazione 01-03-1 e la UdC del pallet TR-ALTA che contiene'], ['Leggi', 'codice a barre (per la pistola) e QR (per lo smartphone)'], ['Stampa', '🖨️ oppure salva in PDF']],
     nota: 'Lettura: spunta a mano. Etichetta dell’ubicazione sullo scaffale, etichetta della UdC sul pallet: la pistola legge entrambe.'},
    {g: 'UF 10 · 0 · Avvio', titolo: 'RF Interroga: che cosa c’è in 01-03-1?', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → scheda 🔎 Interroga',
     campi: [['Risorsa', 'MAG01 Marco'], ['Leggi', '01-03-1 e premi Invio'], ['Poi', 'leggi una UdC copiata dalla mappa'], ['Infine', 'leggi il codice articolo TR-PED e premi Invio']],
     attesa: 'Materiale, quantità e UdC dell’ubicazione. Con il codice articolo la pistola elenca tutte le ubicazioni delle TR-PED (6 pallet). Interrogare non cambia nulla.', nota: 'Lettura: spunta a mano.'},
    // ══════════ UF 10 · vendite: ordini e disponibilità ══════════
    {g: 'UF 10 · 1 · Ordini dei clienti', data: '05/01/2027', titolo: 'VA01: Beta ordina 350 TR-STD', dove: {ep: V + 'ordini'}, percorso: 'SD → Ordini cliente',
     campi: [['Committente', 'C100 Beta Costruzioni'], ['Materiale', 'TR-STD'], ['Quantità', '350'], ['Riferimento cliente', 'BETA-350'], ['Data', '05/01/2027'], ['Data di consegna richiesta', '15/01/2027']],
     attesa: 'Ordine 10000001. Disponibilità (ATP): a scaffale ci sono solo 200 TR-STD → confermabili 200 su 350 (semaforo giallo). Nessuna scrittura: un ordine non muove merce.',
     fatto: function (h) { return !!ordine(h, 'BETA-350'); }},
    {g: 'UF 10 · 1 · Ordini dei clienti', data: '05/01/2027', titolo: 'VA01: Delta ordina 150 TR-ALTA', dove: {ep: V + 'ordini'}, percorso: 'SD → Ordini cliente',
     campi: [['Committente', 'C200 Delta Noleggi'], ['Materiale', 'TR-ALTA'], ['Quantità', '150'], ['Riferimento cliente', 'DELTA-150'], ['Data', '05/01/2027'], ['Data di consegna richiesta', '15/01/2027']],
     attesa: 'Ordine 10000002: 150 su 200 disponibili, semaforo verde.', fatto: function (h) { return !!ordine(h, 'DELTA-150'); }},
    {g: 'UF 10 · 1 · Ordini dei clienti', data: '05/01/2027', titolo: 'VA01: il Comune di Gamma ordina 150 TR-STD', dove: {ep: V + 'ordini'}, percorso: 'SD → Ordini cliente',
     campi: [['Committente', 'C300 Comune di Gamma'], ['Materiale', 'TR-STD'], ['Quantità', '150'], ['Riferimento cliente', 'GAMMA-150'], ['Data', '05/01/2027'], ['Data di consegna richiesta', '22/01/2027']],
     attesa: 'Ordine 10000003. I 200 TR-STD sono già promessi a Beta (chi ordina prima è servito prima): Gamma aspetta la produzione.',
     fatto: function (h) { return !!ordine(h, 'GAMMA-150'); }},
    {g: 'UF 10 · 1 · Ordini dei clienti', titolo: 'VA05 e CO09: quanto manca? Il fabbisogno', dove: {ep: V + 'crediti'}, percorso: 'SD → Ordini cliente (VA05, colonna Disponibilità); SD → Gestione crediti e disponibilità → CO09',
     campi: [['Domanda TR-STD', 'Beta 350 + Gamma 150 = 500; a scaffale 200 → mancano 300 transenne da produrre'], ['Fabbisogno di ferro', '300 × 8 kg = 2.400 kg; a magazzino 0'],
       ['Decisione', 'ordinare 3.000 kg di ferro (2.400 per l’ordine, il resto è scorta) e un ordine di produzione da 300']],
     nota: 'Lettura e calcolo: spunta a mano. È il ragionamento dell’MRP: domanda − disponibile = fabbisogno netto, poi distinta base × quantità.'},
    // ══════════ UF 8 + UF 10 · acquisti, ricevimento, MIGO e MIRO ══════════
    {g: 'UF 10 · 2 · Acquisto e ricevimento', data: '05/01/2027', titolo: 'Scorta minima del ferro: 500 kg', dove: {ep: M + 'scorte'}, percorso: 'WMS → Scorta minima e riordino → Imposta la scorta minima',
     campi: [['Materiale', 'FERRO'], ['Scorta minima (punto di riordino)', '500'], ['Scorta massima', '3000'], ['Pulsante', 'Salva la scorta minima']],
     attesa: 'Riga FERRO: libera 0 + in arrivo 0 = 0 kg, sotto il minimo di 500 → 🔴 SOTTO SCORTA, proposta di riordino 3.000 kg (massima 3.000 − 0). È proprio la quantità che ordini nel passo dopo. Nessun movimento e nessuna scrittura: la scorta minima è un parametro del materiale.',
     nota: 'Il sistema PROPONE, non ordina: la richiesta d’acquisto o l’ordine li fa una persona. Dopo l’ordine la riga diventa 🟡 (sotto il minimo ma in arrivo); dopo l’entrata merci 🟢.',
     fatto: function (h) { return !!(h.S.scorte && h.S.scorte.FERRO && h.S.scorte.FERRO.min === 500); }},
    {g: 'UF 8 · 2 · Acquisto e ricevimento', data: '05/01/2027', titolo: 'ME21N: ordina 3.000 kg di ferro a 1,00 €/kg', dove: {ep: A + 'ordini'}, percorso: 'MM → Ordini d’acquisto e rilascio',
     campi: [['Fornitore', 'F100 Acciaierie Umbre'], ['Materiale', 'FERRO'], ['Quantità', '3000'], ['Prezzo', '1,00'], ['Data', '05/01/2027'], ['Data di consegna prevista', '07/01/2027']],
     attesa: 'Ordine 4500000001 da 3.000 €, consegna prevista il 07/01. Nessuna scrittura: l’ordine è un impegno, non un costo. Attenzione al prezzo: il costo standard del ferro è 0,95 €/kg, l’ordine è a 1,00. Poi, nella stessa pagina, riquadro «Conferma d’ordine del fornitore»: il fornitore deve rispedirti la sua conferma. Scegli l’ordine, scrivi il riferimento (es. CONF-001) e premi «Registra la conferma tornata»: finché non torna, l’ordine resta «⏳ in attesa». Non cambia la contabilità, ma ti dice che il fornitore ha accettato prezzo e quantità.',
     fatto: function (h) { return !!acquisto(h); }},
    {g: 'UF 8 · 2 · Acquisto e ricevimento', data: '07/01/2027', titolo: 'MIGO 101: ricevi il ferro, 150 kg sono piegati', contabile: true, dove: {ep: A + 'entrate'}, percorso: 'MM → Entrata merci',
     campi: [['Ordine', '4500000001'], ['Quantità contata', 'vuoto = 3.000 come sul DDT'], ['Numero DDT', 'DDT-AU-0107'], ['Lotto (colata dal certificato)', 'COL-0107'], ['Di cui danneggiati', '150'], ['Descrizione del danno', 'fasci piegati nel trasporto'], ['Data', '07/01/2027']],
     attesa: 'Movimento 101 a costo standard: D 12 Materie prime 2.850 (3.000 × 0,95) + D 63 Differenze prezzo 150 (3.000 × 0,05) / A 22 Fatture da ricevere 3.000 (al prezzo dell’ordine). WMS: 2.850 kg buoni in tre fasci (1.000 + 1.000 + 850) in GR-ZONE con 3 compiti di messa a posto; i 150 kg piegati entrano BLOCCATI in Q-ZONE.',
     nota: 'Ragioneria di magazzino: la merce entra al prezzo standard, la differenza con il prezzo d’acquisto va subito in un conto a parte (63). Il conto 22 è il «ponte» tra merce arrivata e fattura non ancora ricevuta.',
     fatto: function (h) { var o = acquisto(h); return !!o && (o.entrate || []).length > 0; }},
    {g: 'UF 10 · 2 · Acquisto e ricevimento', data: '07/01/2027', titolo: 'Merce da mettere a posto: che cosa aspetta in ricevimento?', dove: {ep: M + 'allocare'}, percorso: 'WMS → Merce da mettere a posto',
     campi: [['Data di oggi', '07/01/2027'], ['Leggi', 'le righe della tabella: articolo, quantità, UdC, «Da dove arriva» e «Va in (proposta)»'], ['Pulsante', '«▶ Metti a posto» sulla prima riga: si apre la pistola RF con quel compito (continua nel passo dopo)']],
     attesa: '3 UdC di FERRO da mettere a posto, 2.850 kg arrivati oggi in ricevimento: 1.000 e 1.000 kg verso F-01, 850 kg verso F-02. I 150 kg piegati NON sono qui: sono bloccati in quarantena.',
     nota: 'Lettura: spunta a mano. Merce in ricevimento = già nostra e già in contabilità, ma non ancora prelevabile: finché non è a scaffale intasa la zona di scarico.'},
    {g: 'UF 10 · 2 · Acquisto e ricevimento', data: '07/01/2027', titolo: 'RF: metti a dimora i 3 fasci buoni', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data di lavoro', '07/01/2027'], ['Risorsa', 'MAG01 Marco'], ['Compiti', 'i 3 PUTAWAY del ferro (GR-ZONE → F-01, F-01, F-02)']],
     attesa: 'F-01 con due fasci da 1.000, F-02 con quello da 850. Nessuna scrittura: il ferro era già in contabilità con la MIGO.', nota: rf,
     fatto: function (h) { return confermati(h, 'PUTAWAY', 3); }},
    {g: 'UF 8 · 2 · Acquisto e ricevimento', data: '07/01/2027', titolo: 'Quarantena: rottama i 150 kg piegati (555)', contabile: true, dove: {ep: M + 'bloccato'}, percorso: 'WMS → Merce bloccata e danneggiata → Decidi sulla merce in quarantena',
     campi: [['UdC in quarantena', 'quella da 150 kg di FERRO'], ['Esito del controllo', 'fasci piegati, non recuperabili'], ['Pulsante', 'Rottama: da buttare (555)'], ['Data', '07/01/2027']],
     attesa: 'D 69 Rottamazioni / A 12 Materie prime 142,50 (150 × 0,95). Il ferro esce dal magazzino e diventa un costo.',
     nota: 'In alternativa si poteva rendere al fornitore o sbloccare (343) se il controllo fosse stato positivo: la decisione la prende la qualità, il magazziniere la esegue.',
     fatto: function (h) { return nReg(h, 'ROTTAMAZIONE', function (r) { return /FERRO/.test(r.descrizione); }) > 0; }},
    {g: 'UF 8 · 2 · Acquisto e ricevimento', data: '08/01/2027', titolo: 'MIRO: la fattura arriva a 1,02 €/kg', contabile: true, dove: {ep: A + 'fatture'}, percorso: 'MM → Fatture fornitore',
     campi: [['Ordine', '4500000001'], ['Numero fattura', 'FR-2027-014'], ['Quantità', 'vuoto = quella ricevuta'], ['Prezzo', '1,02 (il fornitore applica un adeguamento)'], ['Accetto la differenza di prezzo', 'SPUNTA la casella: è proprio la differenza di 0,02 €/kg che stai studiando'], ['Data', '08/01/2027']],
     attesa: 'D 22 Fatture da ricevere 3.000 + D 63 Differenze prezzo 60 + D 14 IVA a credito 673,20 / A 20 Acciaierie Umbre 3.733,20. Il conto 22 torna a zero; la nuova differenza (0,02 × 3.000 = 60) si somma ai 150 della MIGO: 210 € pagati sopra lo standard.',
     nota: 'Controllo a tre vie (three-way match): ordine, entrata merci, fattura. Quantità e prezzo devono tornare; se non tornano, la differenza si vede e si spiega.',
     fatto: function (h) { return nReg(h, 'FATTURA_FORNITORE') > 0; }},
    // ══════════ UF 8 + UF 10 · produzione ══════════
    {g: 'UF 10 · 3 · Produzione', data: '08/01/2027', titolo: 'CO01: ordine di produzione per 300 TR-STD', dove: {ep: P + 'ordini'}, percorso: 'PP → Ordini di produzione',
     campi: [['Materiale', 'TR-STD'], ['Quantità', '300'], ['Data', '08/01/2027'], ['Data di fine pianificata', '13/01/2027']],
     attesa: 'Ordine 1000001: 2.400 kg di ferro, Taglio 75 h, Piegatura 60 h, Saldatura 120 h, tutte sullo stesso ordine. Beta e Gamma diventano confermabili alla data di fine.',
     fatto: function (h) { return !!prod(h); }},
    {g: 'UF 10 · 3 · Produzione', data: '08/01/2027', titolo: 'WMS: approvvigiona la linea (staging) con 2.400 kg', dove: {ep: M + 'compiti'}, percorso: 'WMS → Compiti → Approvvigionamento della produzione',
     campi: [['Ordine', '1000001 TR-STD'], ['Quantità', 'vuoto = 2.400 kg'], ['Data', '08/01/2027']],
     attesa: '3 compiti STAGING in ordine FIFO: F-01 1.000 + 1.000, F-02 400 → PSA-L1 (bordo linea).',
     fatto: function (h) { return compiti(h, 'STAGING').length >= 3; }},
    {g: 'UF 10 · 3 · Produzione', data: '08/01/2027', titolo: 'RF: porta il ferro a bordo linea', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data di lavoro', '08/01/2027'], ['Compiti', 'i 3 STAGING']], attesa: '2.400 kg in PSA-L1; F-02 conserva 450 kg. Nessun consumo e nessuna scrittura: il ferro ha solo cambiato posto.', nota: rf,
     fatto: function (h) { return confermati(h, 'STAGING', 3); }},
    {g: 'UF 8 · 3 · Produzione', data: '08/01/2027', titolo: '261: preleva 2.400 kg per l’ordine', contabile: true, dove: {ep: P + 'avanzamento'}, percorso: 'PP → Prelievi, conferme, entrate → Prelievo',
     campi: [['Ordine', '1000001'], ['Quantità', '2400'], ['Data', '08/01/2027']],
     attesa: 'D 70 Consumi di materie / A 12 Materie prime 2.280 (2.400 × 0,95). Il ferro passa dal magazzino all’ordine: è un costo di produzione (WIP).',
     nota: 'Senza staging il programma rifiuta il prelievo: il ferro deve essere davvero a bordo linea.',
     fatto: function (h) { return nReg(h, 'PRELIEVO_261') > 0; }},
    {g: 'UF 8 · 3 · Produzione', data: '09/01/2027', titolo: 'CO11N: conferma il Taglio (75 ore)', contabile: true, dove: {ep: P + 'avanzamento'}, percorso: 'PP → Conferma delle ore',
     campi: [['Ordine', '1000001'], ['Fase', 'Taglio'], ['Attrezzaggio', '0'], ['Ore', '75'], ['Quantità fase', '300'], ['Data', '09/01/2027']],
     attesa: '75 × 28 €/h = 2.100: D 72 / A 75. Nessun pezzo entra a magazzino tra una fase e l’altra.', fatto: function (h) { return fase(h, 'Taglio'); }},
    {g: 'UF 8 · 3 · Produzione', data: '11/01/2027', titolo: 'CO11N: conferma la Piegatura (60 ore)', contabile: true, dove: {ep: P + 'avanzamento'}, percorso: 'PP → Conferma delle ore',
     campi: [['Ordine', '1000001'], ['Fase', 'Piegatura'], ['Attrezzaggio', '0'], ['Ore', '60'], ['Quantità fase', '300'], ['Data', '11/01/2027']],
     attesa: '60 × 28 = 1.680: D 72 / A 75.', fatto: function (h) { return fase(h, 'Piegatura'); }},
    {g: 'UF 8 · 3 · Produzione', data: '12/01/2027', titolo: 'CO11N: conferma la Saldatura (120 ore)', contabile: true, dove: {ep: P + 'avanzamento'}, percorso: 'PP → Conferma delle ore',
     campi: [['Ordine', '1000001'], ['Fase', 'Saldatura'], ['Attrezzaggio', '0'], ['Ore', '120'], ['Quantità fase', '300'], ['Data', '12/01/2027']],
     attesa: '120 × 28 = 3.360: D 72 / A 75. WIP dell’ordine: 2.280 + 2.100 + 1.680 + 3.360 = 9.420.', fatto: function (h) { return fase(h, 'Saldatura'); }},
    {g: 'UF 8 · 3 · Produzione', data: '13/01/2027', titolo: '101: versa a magazzino le 300 transenne', contabile: true, dove: {ep: P + 'avanzamento'}, percorso: 'PP → Entrata del prodotto',
     campi: [['Ordine', '1000001'], ['Pezzi', 'vuoto = 300'], ['Data', '13/01/2027']],
     attesa: 'D 13 Prodotti finiti / A 73 Variazione per produzione interna 9.420 (300 × 31,40). Il WIP va a zero; 6 pallet da 50 in GR-ZONE.',
     fatto: function (h) { return nReg(h, 'ENTRATA_PRODUZIONE') > 0; }},
    {g: 'UF 10 · 3 · Produzione', data: '13/01/2027', titolo: 'RF: metti a scaffale i 6 pallet', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data di lavoro', '13/01/2027'], ['Compiti', 'i 6 PUTAWAY di TR-STD']], attesa: '500 TR-STD a scaffale (200 + 300).', nota: rf,
     fatto: function (h) { return confermati(h, 'PUTAWAY', 9); }},
    {g: 'UF 10 · 3 · Produzione', titolo: 'Tracciabilità: da quale colata vengono le transenne?', dove: {ep: M + 'lotti'}, percorso: 'WMS → Lotti, numeri di serie e tracciabilità',
     campi: [['A monte', 'lotto delle TR-STD dell’ordine 1000001 → ferro colata COL-0107, Acciaierie Umbre, DDT-AU-0107'], ['A valle', '«Traccia» sulla colata COL-0107: ordine 1000001, poi le consegne quando partiranno']],
     nota: 'Lettura: spunta a mano. Se la colata fosse difettosa sapremmo in un minuto quali transenne e quali clienti coinvolge.'},
    // ══════════ UF 10 · movimenti interni e quarantena ══════════
    {g: 'UF 10 · 4 · Movimenti interni', data: '13/01/2027', titolo: 'Blocca un pallet di TR-ALTA urtato dal carrello (344)', dove: {ep: M + 'bloccato'}, percorso: 'WMS → Merce bloccata e danneggiata → Metti in quarantena',
     campi: [['Unità di carico', 'il primo pallet TR-ALTA dell’elenco'], ['Quantità', 'vuoto = tutto il pallet (50)'], ['Motivo', 'pallet urtato dal carrello, da controllare'], ['Data', '13/01/2027'], ['Pulsante', 'Metti in quarantena e crea il compito RF']],
     attesa: 'Movimento 344: 50 TR-ALTA da liberi a bloccati, non vendibili. Compito BLOCCO verso Q-ZONE. Nessuna scrittura: la merce resta nostra e a bilancio.',
     fatto: function (h) { return compiti(h, 'BLOCCO').some(function (t) { return t.mat === 'TR-ALTA'; }); }},
    {g: 'UF 10 · 4 · Movimenti interni', data: '13/01/2027', titolo: 'RF: porta il pallet in quarantena', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data', '13/01/2027'], ['Compito', 'il BLOCCO verso Q-ZONE']], attesa: 'Il pallet è in Q-ZONE; il suo scaffale è libero.', nota: rf,
     fatto: function (h) { return compiti(h, 'BLOCCO').some(function (t) { return t.mat === 'TR-ALTA' && t.stato === 'confermato'; }); }},
    {g: 'UF 10 · 4 · Movimenti interni', data: '13/01/2027', titolo: 'Controllo superato: sblocca il pallet (343)', dove: {ep: M + 'bloccato'}, percorso: 'WMS → Merce bloccata e danneggiata → Decidi sulla merce in quarantena',
     campi: [['UdC in quarantena', 'il pallet TR-ALTA'], ['Esito del controllo', 'imballo integro, merce buona'], ['Pulsante', 'Sblocca: è buona (343)'], ['Data', '13/01/2027']],
     attesa: 'Movimento 343: i 50 TR-ALTA tornano liberi; nasce un PUTAWAY da Q-ZONE.',
     fatto: function (h) { return (h.S.movimenti || []).some(function (m) { return m.tipo === '343' || m.bwart === '343' || m.mov === '343'; }) || confermati(h, 'PUTAWAY', 10) || compiti(h, 'PUTAWAY').length >= 10; }},
    {g: 'UF 10 · 4 · Movimenti interni', data: '13/01/2027', titolo: 'RF: rimetti a scaffale il pallet sbloccato', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data', '13/01/2027'], ['Compito', 'il PUTAWAY da Q-ZONE']], attesa: 'Q-ZONE vuota; 200 TR-ALTA disponibili.', nota: rf,
     fatto: function (h) { return confermati(h, 'PUTAWAY', 10); }},
    {g: 'UF 10 · 4 · Movimenti interni', data: '13/01/2027', titolo: 'LT10: sposta un pallet di TR-PED in fondo al magazzino', dove: {ep: M + 'compiti'}, percorso: 'WMS → Compiti → Trasferimento',
     campi: [['Unità di carico', 'il primo pallet TR-PED (in 01-05-1)'], ['Destinazione', '03-04-1'], ['Motivo', 'riordino della corsia 01'], ['Data', '13/01/2027']],
     attesa: 'Un compito TRASF verso 03-04-1. Nessuna scrittura.', fatto: function (h) { return compiti(h, 'TRASF').some(function (t) { return t.a === '03-04-1'; }); }},
    {g: 'UF 10 · 4 · Movimenti interni', data: '13/01/2027', titolo: 'RF: conferma lo spostamento', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data', '13/01/2027'], ['Compito', 'il TRASF verso 03-04-1']], attesa: 'Il pallet TR-PED è in 03-04-1.', nota: rf,
     fatto: function (h) { return compiti(h, 'TRASF').some(function (t) { return t.a === '03-04-1' && t.stato === 'confermato'; }); }},
    // ══════════ UF 11 · slotting e ondate ══════════
    {g: 'UF 11 · 5 · Innovazione: slotting', data: '13/01/2027', titolo: 'Slotting: ogni pallet al posto giusto', dove: {ep: Z + 'slotting'}, percorso: 'WMS → Innovazione → Slotting',
     campi: [['Leggi', 'classe ABC per righe di prelievo e proposta: quali pallet, da dove, a dove, quanti metri risparmiati'], ['Data', '13/01/2027'], ['Pulsante', 'Crea i compiti di trasferimento proposti']],
     attesa: '3 compiti TRASF: il TR-PED rientra vicino alla porta, due pallet TR-STD di scorta vanno nella corsia 03. Nessuna scrittura: cambia solo il posto.',
     nota: 'Lo slotting si fa prima dei prelievi: ciò che esce più spesso vicino alla spedizione, la scorta lenta in fondo. Meno metri = meno tempo e meno rischi.',
     fatto: function (h) { return compiti(h, 'TRASF').some(function (t) { return /slotting/.test(t.motivo || ''); }); }},
    {g: 'UF 11 · 5 · Innovazione: slotting', data: '13/01/2027', titolo: 'RF: conferma i trasferimenti dello slotting', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data', '13/01/2027'], ['Compiti', 'tutti i TRASF dello slotting']], attesa: 'Guarda la mappa: TR-PED di nuovo in 01-05-1.', nota: rf,
     fatto: function (h) { var s = compiti(h, 'TRASF').filter(function (t) { return /slotting/.test(t.motivo || ''); }); return s.length > 0 && s.every(function (t) { return t.stato === 'confermato'; }); }},
    {g: 'UF 11 · 6 · Spedizione a ondate', titolo: 'Attiva il prelievo a ondate', dove: {ep: Z + 'ondate'}, percorso: 'WMS → Innovazione → Prelievo a ondate → Impostazioni',
     campi: [['Prelievo a ondate', 'sì: le consegne aspettano l’ondata'], ['Cross-docking', 'no'], ['Pulsante', 'Salva']],
     attesa: 'Da ora le consegne non creano subito i compiti: il capo magazzino le raggruppa in un unico giro.', fatto: function (h) { return wm(h).ondate === true || !!consegna(h, 'BETA-350'); }},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '14/01/2027', titolo: 'Arretrato e scadenze: chi aspetta la merce?', dove: {ep: M + 'arretrato'}, percorso: 'WMS → Arretrato e scadenze',
     campi: [['Data di oggi', '14/01/2027'], ['1 · Clienti', 'Beta 350 TR-STD e Delta 150 TR-ALTA: 🟡 «scade fra 1 giorno» (promessi il 15/01); Gamma 150 TR-STD: 🟢 in tempo (22/01)'],
       ['2, 3, 4', 'fornitori, produzione e compiti di magazzino: nessuna riga rossa (ferro arrivato, ordine 1000001 versato, compiti confermati)'],
       ['Prova', 'scrivi 16/01/2027 come data di oggi: Beta e Delta diventano 🔴 IN RITARDO di 1 giorno. Poi rimetti 14/01/2027']],
     attesa: 'In alto 0 consegne in ritardo con la data di oggi: Beta e Delta vanno spedite entro domani. Per questo oggi si fanno consegne, ondata e prelievo.',
     nota: 'Lettura: spunta a mano. L’arretrato si guarda ogni mattina: prima le righe rosse, poi arancio e gialle.'},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '14/01/2027', titolo: 'VL01N: consegna per Beta', dove: {ep: V + 'consegne'}, percorso: 'SD → Consegne',
     campi: [['Ordine', '10000001 Beta 350 TR-STD'], ['Data', '14/01/2027']], attesa: 'Consegna 80000001 in attesa dell’ondata. Nessuna uscita merci e nessuna scrittura.',
     fatto: function (h) { return !!consegna(h, 'BETA-350'); }},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '14/01/2027', titolo: 'VL01N: consegna per Delta', dove: {ep: V + 'consegne'}, percorso: 'SD → Consegne',
     campi: [['Ordine', '10000002 Delta 150 TR-ALTA'], ['Data', '14/01/2027']], attesa: 'Consegna 80000002, anche lei in attesa.', fatto: function (h) { return !!consegna(h, 'DELTA-150'); }},
    {g: 'UF 11 · 6 · Spedizione a ondate', data: '14/01/2027', titolo: 'Rilascia l’ondata ONDA-1', dove: {ep: Z + 'ondate'}, percorso: 'WMS → Innovazione → Prelievo a ondate → Rilascia l’ondata',
     campi: [['Data', '14/01/2027'], ['Pulsante', 'Rilascia l’ondata']],
     attesa: 'ONDA-1: 2 consegne, 10 compiti PICK (7 pallet TR-STD e 3 TR-ALTA) in un solo giro a serpentina: 56 m invece di 80 m con un giro per ordine (−30%).',
     fatto: function (h) { return (wm(h).ondateRilasciate || []).length > 0; }},
    {g: 'UF 10 · 6 · Spedizione a ondate', titolo: 'Stampa la lista di prelievo', dove: {ep: X + 'prelievo'}, percorso: 'WMS → Spedizione → Lista di prelievo',
     campi: [['Leggi', 'ubicazione, UdC e quantità di ogni riga, nell’ordine del percorso'], ['Stampa', '🖨️ per chi lavora senza pistola']], nota: 'Lettura: spunta a mano.'},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '14/01/2027', titolo: 'RF: preleva i 10 pallet (FIFO)', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data di lavoro', '14/01/2027'], ['Compiti', 'i 10 PICK, senza differenze di quantità']],
     attesa: '500 pezzi in GI-ZONE. Giacenza contabile invariata: nessun costo del venduto finché la merce non parte.', nota: rf,
     fatto: function (h) { return confermati(h, 'PICK', 10); }},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '14/01/2027', titolo: 'Misure del pallet EUR e regole: quante transenne per collo', dove: {ep: X + 'imballi'}, percorso: 'WMS → Spedizione → Imballi, regole e veicoli',
     campi: [['1 · Imballo EUR', '120 × 80 × 15 cm, tara 25 kg, portata 1000 kg, impilabile sì, regge sopra 700 kg → Salva l’imballo'],
       ['Prova l’errore', 'regola TR-STD su EUR con 90 pezzi: il programma la rifiuta, 90 × 12 kg + 25 = 1.105 kg supera i 1.000 kg del pallet'],
       ['2 · Regola TR-STD', 'su pallet EUR: 50 pezzi, collo alto 125 cm → Salva la regola'], ['2 · Regola TR-ALTA', 'su pallet EUR: 50 pezzi, collo alto 140 cm → Salva la regola']],
     attesa: 'Collo TR-STD: 50 × 12 kg + 25 = 625 kg; collo TR-ALTA: 50 × 15 kg + 25 = 775 kg. Nella tabella delle regole le due righe hanno «✏️ tu». Nessuna scrittura.',
     nota: 'Senza misure non si può progettare il carico: il camion si riempie per spazio (cm) e per peso (kg). La regola dice anche all’imballo quanti pezzi proporre.',
     fatto: function (h) { var r = (h.S.sped || {}).regole || {}; return !!(r['TR-STD|EUR'] && r['TR-ALTA|EUR']); }},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '14/01/2027', titolo: 'Imballa Beta in colli SSCC', dove: {ep: X + 'imballo'}, percorso: 'WMS → Imballo e etichette SSCC',
     campi: [['Consegna', '80000001'], ['Imballo', 'EUR'], ['Pezzi per collo', '50'], ['Data', '14/01/2027']],
     attesa: '7 colli da 50 con SSCC univoco (codice GS1 a 18 cifre). Nessuna scrittura.', fatto: function (h) { return colli(h, 'BETA-350').length === 7; }},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '14/01/2027', titolo: 'Imballa Delta in colli SSCC', dove: {ep: X + 'imballo'}, percorso: 'WMS → Imballo e etichette SSCC',
     campi: [['Consegna', '80000002'], ['Imballo', 'EUR'], ['Pezzi per collo', '50'], ['Data', '14/01/2027']], attesa: '3 colli da 50.', fatto: function (h) { return colli(h, 'DELTA-150').length === 3; }},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '15/01/2027', titolo: 'VT01N: un camion per le due consegne', dove: {ep: X + 'trasporti'}, percorso: 'WMS → Trasporti e carico → Crea il trasporto',
     campi: [['Consegne', '80000001, 80000002'], ['Vettore', 'V10'], ['Targa fittizia', 'AB123CD'], ['Autista fittizio', 'Mario Esempio'], ['Porto', 'franco'], ['Data di carico', '15/01/2027']],
     attesa: 'Un trasporto, due clienti, 10 colli da caricare.', fatto: function (h) { return trasporti(h).length > 0; }},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '15/01/2027', titolo: 'Piano di carico: quale camion per Beta e Delta?', dove: {ep: X + 'piano'}, percorso: 'WMS → Spedizione → Piano di carico del camion',
     campi: [['Trasporto', 'quello appena creato (consegne Beta e Delta)'], ['Prova il furgone', 'Veicolo «Furgone 3,5 t»: ci sta 1 collo su 10, porta solo 1.200 kg'],
       ['Scegli la motrice', 'Veicolo «Motrice 10 t», criterio «per fermate»'], ['Guarda il disegno', 'Delta (scende per ultima) vicino alla CABINA nei posti 1-3, Beta verso le PORTE con 3 pile da due'],
       ['Camion in 3D', 'premi «🧊 Camion in 3D»: gira il camion con il mouse, prova «dalle porte» e passa sopra un collo per leggere posto, articolo e peso'],
       ['Prova di nuovo il furgone in 3D', 'i colli che non ci stanno compaiono rossi dietro al camion con la scritta NON ALLOCATI; poi rimetti la motrice'],
       ['Pulsante', 'Salva il piano sul trasporto']],
     attesa: '10 colli su 10 in 7 posti a terra (3 pile da due colli di TR-STD), 6.700 kg = 84% della portata. Le TR-ALTA non si impilano: 775 kg pesano più dei 700 che il pallet regge sopra. Nessuna scrittura.',
     nota: 'Si carica dal posto 1 (cabina) verso le porte: chi scende per primo deve essere vicino alle porte. Con la pistola RF → Carico ogni collo ti dice il suo posto.',
     fatto: function (h) { var t = trasporti(h)[0]; return !!(t && t.piano && t.piano.veicolo === 'MOTRICE'); }},
    {g: 'UF 10 · 6 · Spedizione a ondate', data: '15/01/2027', titolo: 'RF Carico: carica i 7 colli di Beta con la pistola', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → scheda 🚛 Carico',
     campi: [['Data', '15/01/2027'], ['SSCC', 'leggi uno alla volta i 7 SSCC della consegna 80000001 (copiali da Imballo) e premi Invio']],
     attesa: '7 colli di Beta caricati. Un collo letto due volte viene rifiutato.', fatto: function (h) { var c = colli(h, 'BETA-350'); return c.length === 7 && c.every(function (x) { return x.caricato; }); }},
    {g: 'UF 11 · 6 · Spedizione a ondate', data: '15/01/2027', titolo: 'Varco RFID: carica i 3 colli di Delta in un passaggio', dove: {ep: Z + 'rfid'}, percorso: 'WMS → Innovazione → Varco RFID',
     campi: [['Trasporto', 'quello appena creato'], ['Data', '15/01/2027'], ['Pulsante', 'Fai passare il carrello dal varco']],
     attesa: '3 tag letti in un solo passaggio: 10/10 colli caricati. La pagina mostra il codice EPC derivato da ogni SSCC.', fatto: function (h) { var c = colli(h, 'DELTA-150'); return c.length === 3 && c.every(function (x) { return x.caricato; }); }},
    {g: 'UF 8 · 6 · Spedizione a ondate', data: '15/01/2027', titolo: 'Partenza: uscita merci 601 e DDT', contabile: true, dove: {ep: X + 'trasporti'}, percorso: 'WMS → Trasporti e carico → Fine carico e uscita merci',
     campi: [['Trasporto', 'quello appena creato'], ['Data di partenza', '15/01/2027']],
     attesa: 'Due scritture 601: D 41 Costo del venduto / A 13 Prodotti finiti 10.990 (350 × 31,40, Beta) e 5.541 (150 × 36,94, Delta). Nascono i DDT. Solo adesso la merce esce dalla contabilità.',
     fatto: function (h) { return nReg(h, 'USCITA_MERCI') >= 2; }},
    {g: 'UF 10 · 6 · Spedizione a ondate', titolo: 'Monitor delle consegne e DDT', dove: {ep: X + 'ddt'}, percorso: 'WMS → Spedizione → Monitor delle consegne (VL06O); poi DDT',
     campi: [['Monitor', 'prelievo, imballo, trasporto, carico e uscita merci completati'], ['DDT', 'mittente, destinatario, causale, vettore, colli e SSCC'], ['Stampa', '🖨️ oppure salva in PDF']],
     nota: 'Lettura: spunta a mano. Il DDT accompagna la merce sul camion.'},
    {g: 'UF 8 · 6 · Spedizione a ondate', data: '15/01/2027', titolo: 'VF01: l’ufficio fattura Beta', contabile: true, dove: {ep: V + 'fatture'}, percorso: 'SD → Fatturazione',
     campi: [['Consegna', '80000001'], ['Data', '15/01/2027']],
     attesa: 'D 11 Beta 24.595,20 + D 47 Sconti 840 / A 40 Ricavi 21.000 + A 21 IVA 4.435,20; provvigione dell’agente D 57 / A 26 604,80. Il magazzino ha generato il ricavo con la consegna: la fattura parte dal DDT.',
     fatto: function (h) { return nReg(h, 'FATTURA') > 0; }},
    // ══════════ UF 8 + UF 10 · resi ══════════
    {g: 'UF 10 · 7 · Resi', data: '18/01/2027', titolo: 'Beta rende 10 transenne difettose', dove: {ep: V + 'resi'}, percorso: 'SD → Resi e note di credito → Ordine di reso',
     campi: [['Con riferimento alla fattura', '90000001 Beta'], ['Quantità', '10'], ['Motivo', 'transenne con saldatura difettosa'], ['Data', '18/01/2027']],
     attesa: 'Ordine di reso 60000001: la merce deve ancora tornare. Nessuna scrittura.', fatto: function (h) { return !!reso(h); }},
    {g: 'UF 8 · 7 · Resi', data: '19/01/2027', titolo: 'Entrata del reso (651)', contabile: true, dove: {ep: V + 'resi'}, percorso: 'SD → Resi e note di credito → Entrata merci del reso',
     campi: [['Ordine di reso', '60000001'], ['Data', '19/01/2027']],
     attesa: 'D 13 Prodotti finiti / A 41 Costo del venduto 314 (10 × 31,40): la merce torna nostra. WMS: una UdC da 10 in GR-ZONE con un PUTAWAY.',
     fatto: function (h) { return nReg(h, 'ENTRATA_RESO') > 0; }},
    {g: 'UF 10 · 7 · Resi', data: '19/01/2027', titolo: 'RF: metti a posto il reso', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data', '19/01/2027'], ['Compito', 'il PUTAWAY da 10 TR-STD']], nota: rf, fatto: function (h) { return confermati(h, 'PUTAWAY', 11); }},
    {g: 'UF 10 · 7 · Resi', data: '19/01/2027', titolo: 'Blocca il reso: va controllato', dove: {ep: M + 'bloccato'}, percorso: 'WMS → Merce bloccata e danneggiata → Metti in quarantena',
     campi: [['Unità di carico', 'la UdC da 10 TR-STD del reso'], ['Quantità', 'vuoto = tutta'], ['Motivo', 'reso cliente: saldature difettose'], ['Data', '19/01/2027']],
     attesa: '344 e compito BLOCCO verso Q-ZONE: un reso difettoso non deve finire in una nuova spedizione.', fatto: function (h) { return compiti(h, 'BLOCCO').some(function (t) { return t.mat === 'TR-STD'; }); }},
    {g: 'UF 10 · 7 · Resi', data: '19/01/2027', titolo: 'RF: porta il reso in quarantena', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data', '19/01/2027'], ['Compito', 'il BLOCCO del reso']], nota: rf,
     fatto: function (h) { return compiti(h, 'BLOCCO').some(function (t) { return t.mat === 'TR-STD' && t.stato === 'confermato'; }); }},
    {g: 'UF 8 · 7 · Resi', data: '19/01/2027', titolo: 'Rottama il reso non riparabile (555)', contabile: true, dove: {ep: M + 'bloccato'}, percorso: 'WMS → Merce bloccata e danneggiata → Decidi sulla merce in quarantena',
     campi: [['UdC in quarantena', 'il reso da 10 TR-STD'], ['Esito del controllo', 'saldature non riparabili'], ['Pulsante', 'Rottama: da buttare (555)'], ['Data', '19/01/2027']],
     attesa: 'D 69 Rottamazioni / A 13 Prodotti finiti 314.', fatto: function (h) { return nReg(h, 'ROTTAMAZIONE', function (r) { return /TR-STD/.test(r.descrizione); }) > 0; }},
    // ══════════ UF 10 · seconda spedizione senza ondate ══════════
    {g: 'UF 10 · 8 · Spedizione standard', data: '20/01/2027', titolo: 'Spegni le ondate: consegna per Gamma', dove: {ep: Z + 'ondate'}, percorso: 'WMS → Innovazione → Prelievo a ondate (no); poi SD → Consegne',
     campi: [['Prelievo a ondate', 'no'], ['Poi VL01N', 'ordine 10000003 Comune di Gamma, data 20/01/2027']],
     attesa: 'Senza ondate la consegna crea subito i suoi compiti: 3 PICK di TR-STD verso GI-ZONE.', fatto: function (h) { return !!consegna(h, 'GAMMA-150'); }},
    {g: 'UF 10 · 8 · Spedizione standard', data: '20/01/2027', titolo: 'RF: preleva i 3 pallet di Gamma', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data di lavoro', '20/01/2027'], ['Compiti', 'i 3 PICK']], nota: rf, fatto: function (h) { return confermati(h, 'PICK', 13); }},
    {g: 'UF 10 · 8 · Spedizione standard', data: '20/01/2027', titolo: 'Imballa Gamma in 3 colli', dove: {ep: X + 'imballo'}, percorso: 'WMS → Imballo e etichette SSCC',
     campi: [['Consegna', 'quella di Gamma'], ['Imballo', 'EUR'], ['Pezzi per collo', '50'], ['Data', '20/01/2027']], fatto: function (h) { return colli(h, 'GAMMA-150').length === 3; }},
    {g: 'UF 10 · 8 · Spedizione standard', data: '21/01/2027', titolo: 'Trasporto e carico da scrivania', dove: {ep: X + 'trasporti'}, percorso: 'WMS → Trasporti e carico',
     campi: [['Crea il trasporto', 'consegna di Gamma, vettore V20, targa CD456EF, autista Luca Esempio, porto assegnato, 21/01/2027'], ['Carico (da scrivania)', 'scrivi uno alla volta i 3 SSCC dei colli di Gamma, data 21/01/2027']],
     attesa: 'Trasporto con 3 colli caricati senza pistola: stesso risultato, più lento e con più rischio di errore di battitura.',
     fatto: function (h) { var c = colli(h, 'GAMMA-150'); return c.length === 3 && c.every(function (x) { return x.caricato; }); }},
    {g: 'UF 8 · 8 · Spedizione standard', data: '21/01/2027', titolo: 'Partenza di Gamma (601)', contabile: true, dove: {ep: X + 'trasporti'}, percorso: 'WMS → Trasporti e carico → Fine carico e uscita merci',
     campi: [['Trasporto', 'quello di Gamma'], ['Data di partenza', '21/01/2027']], attesa: 'D 41 / A 13 4.710 (150 × 31,40). TR-STD a magazzino: zero.',
     fatto: function (h) { return nReg(h, 'USCITA_MERCI') >= 3; }},
    // ══════════ UF 9 · inventario ══════════
    {g: 'UF 9 · 9 · Inventario', titolo: 'Classificazione ABC: che cosa contare più spesso', dove: {ep: I + 'abc'}, percorso: 'WMS → Inventari → Classificazione ABC',
     campi: [['Criterio', 'valore dei consumi e delle vendite del mese a costo standard'], ['Leggi', 'classe di TR-STD, TR-ALTA, TR-PED e FERRO e quante conte all’anno prevede l’inventario a rotazione']],
     nota: 'Lettura: spunta a mano. Classe A = pochi codici, molto valore: si contano spesso.'},
    {g: 'UF 9 · 9 · Inventario', data: '29/01/2027', titolo: 'LI01N: documento d’inventario per F-01, F-02 e 01-05-1', dove: {ep: I + 'documenti'}, percorso: 'WMS → Inventari → Documenti d’inventario → Crea',
     campi: [['Tipo', 'ubicazioni scelte'], ['Ubicazioni', 'F-01, F-02, 01-05-1'], ['Tolleranza', '10 (euro)'], ['Data', '29/01/2027']],
     attesa: 'Documento con 3 posizioni: F-01 vuota, F-02 450 kg di FERRO, 01-05-1 50 TR-PED. Nessuna scrittura.', fatto: function (h) { return !!inv(h); }},
    {g: 'UF 9 · 9 · Inventario', data: '29/01/2027', titolo: 'Attiva l’inventario e stampa la lista di conta cieca', dove: {ep: I + 'documenti'}, percorso: 'WMS → Inventari → Documenti → Attiva; poi Lista di conta',
     campi: [['Data di riferimento', '29/01/2027'], ['Lista', 'conta cieca: le quantità a sistema non si vedono']],
     attesa: 'Ubicazioni bloccate: niente prelievi né messe a posto fino alla chiusura (cut-off).', fatto: function (h) { var d = inv(h); return !!d && d.stato !== 'creato' && d.stato !== 'nuovo'; }},
    {g: 'UF 9 · 9 · Inventario', data: '29/01/2027', titolo: 'RF Inventario: conta F-01 con la pistola', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → scheda 📝 Inventario',
     campi: [['Leggi l’ubicazione', 'F-01 (Invio)'], ['Conta', '0: la catasta è vuota (il ferro è andato in produzione)'], ['Pulsante', 'Registra la conta']],
     attesa: 'Conta salvata per F-01: anche un’ubicazione vuota si conta, per essere sicuri che lo sia davvero.',
     fatto: function (h) { var d = inv(h); return !!d && d.righe.filter(function (r) { return r.ubic === 'F-01'; }).every(function (r) { return r.conta1 != null; }); }},
    {g: 'UF 9 · 9 · Inventario', data: '29/01/2027', titolo: 'LI11N: alla catasta F-02 mancano 12 kg', dove: {ep: I + 'documenti'}, percorso: 'WMS → Inventari → Documenti → Registra la conta',
     campi: [['F-02 FERRO', '438 (la bilancia dice 12 kg in meno)'], ['01-05-1 TR-PED', '50'], ['Contato da', 'il tuo nome']],
     attesa: 'Differenza −12 kg × 0,95 = 11,40 €: supera la tolleranza di 10 €, il documento chiede la riconta.', fatto: function (h) { var d = inv(h); return !!d && d.righe.every(function (r) { return r.conta1 != null; }); }},
    {g: 'UF 9 · 9 · Inventario', data: '29/01/2027', titolo: 'LI14: riconta F-02', dove: {ep: I + 'documenti'}, percorso: 'WMS → Inventari → Documenti → Registra la riconta',
     campi: [['F-02 FERRO', '438 (un collega ripesa e conferma)']], attesa: 'Stato «contato»: la differenza è confermata da due conteggi indipendenti.',
     nota: 'La riconta la fa un’altra persona: un errore di conta non deve diventare una scrittura.', fatto: function (h) { var d = inv(h); return !!d && (d.stato === 'contato' || d.stato === 'chiuso'); }},
    {g: 'UF 9 · 9 · Inventario', data: '29/01/2027', titolo: 'LI20: chiudi l’inventario nel WMS', dove: {ep: I + 'documenti'}, percorso: 'WMS → Inventari → Documenti → Chiudi nel WMS',
     campi: [['Data', '29/01/2027']], attesa: 'F-02 ora riporta 438 kg; i 12 kg mancanti vanno nella zona differenze 999. Ubicazioni sbloccate. Ancora nessuna scrittura.',
     fatto: function (h) { var d = inv(h); return !!d && d.stato === 'chiuso'; }},
    {g: 'UF 8 · 9 · Inventario', data: '29/01/2027', titolo: 'LI21: registra la differenza in contabilità (711)', contabile: true, dove: {ep: I + 'differenze'}, percorso: 'WMS → Inventari → Differenze inventariali → Registra',
     campi: [['Data', '29/01/2027']], attesa: 'Movimento 711: D 65 Differenze inventariali / A 12 Materie prime 11,40. Contabilità e scaffale dicono la stessa cosa: 438 kg.',
     fatto: function (h) { return nReg(h, 'DIFFERENZA_INVENTARIO') > 0; }},
    // ══════════ UF 10 · deposito esterno: la merce sul camion non è né qua né là ══════════
    {g: 'UF 10 · 10 · Deposito esterno', data: '30/01/2027', titolo: 'Trasferimento: 100 TR-PED al deposito esterno D200', dove: {ep: M + 'depositi'}, percorso: 'WMS → Deposito esterno e merce in viaggio → 1 · Crea il trasferimento',
     campi: [['Da dove parte', 'dal magazzino W100 al deposito esterno D200'], ['Materiale', 'TR-PED'], ['Quantità da trasferire', '100'], ['Data', '30/01/2027'], ['Arrivo previsto', '31/01/2027'], ['Pulsante', 'Crea il trasferimento']],
     attesa: 'Trasferimento UB001 e 2 compiti di prelievo per il deposito (2 pallet da 50, i più vecchi) verso la banchina GI-ZONE. Nessuna scrittura: la merce resta nostra.',
     nota: 'La filiale vicino ai cantieri vuole avere le transenne pedonali a portata di mano. In SAP è un ordine di trasferimento (tipo UB) tra due depositi della stessa azienda.',
     fatto: function (h) { return ((wm(h).trasferimenti) || []).some(function (t) { return t.mat === 'TR-PED' && t.a === 'D200'; }); }},
    {g: 'UF 10 · 10 · Deposito esterno', data: '30/01/2027', titolo: 'RF: preleva i 2 pallet per il deposito', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → Compiti',
     campi: [['Data di lavoro', '30/01/2027'], ['Compiti', 'i 2 «Prelievo per il deposito esterno» verso GI-ZONE']], attesa: '100 TR-PED in banchina GI-ZONE: stato del trasferimento «prelevato, pronto da spedire».', nota: rf,
     fatto: function (h) { return confermati(h, 'DEPOSITO', 2); }},
    {g: 'UF 10 · 10 · Deposito esterno', data: '30/01/2027', titolo: 'Uscita 351: il camion parte, la merce è in viaggio', dove: {ep: M + 'depositi'}, percorso: 'WMS → Deposito esterno e merce in viaggio → 2 · Carica il camion',
     campi: [['Trasferimento', 'UB001 · W100 → D200 · 100 TR-PED'], ['Data di partenza', '30/01/2027'], ['Pulsante', 'Registra l’uscita 351 (merce in viaggio)']],
     attesa: 'Stato 🚚 «IN VIAGGIO: non è né qua né là». Tabella per luogo, TR-PED: W100 200 + in viaggio 100 + D200 0 = 300 contabili. Nessuna scrittura.',
     nota: 'La merce sul camion è nostra e a bilancio, ma non si può vendere da W100 e non è ancora nel deposito: per questo il sistema la mette in un posto a parte.',
     fatto: function (h) { return ((wm(h).trasferimenti) || []).some(function (t) { return t.mat === 'TR-PED' && !!t.partito; }); }},
    {g: 'UF 10 · 10 · Deposito esterno', data: '30/01/2027', titolo: 'Dove si trova? Le TR-PED sul camion', dove: {ep: M + 'mappa'}, percorso: 'WMS → Mappa delle ubicazioni → «🔎 Dove si trova?» TR-PED; poi WMS → Arretrato e scadenze',
     campi: [['Dove si trova', 'TR-PED: 200 ✅ libere a scaffale; 100 ⛔ «SUL CAMION tra due depositi»'], ['Mappa', 'in fondo il riquadro «Fuori dal magazzino W100»: IN-VIAGGIO con 100 TR-PED'],
       ['Arretrato', 'data di oggi 30/01/2027: riquadro «5 · Merce in viaggio tra depositi», UB001 🟡 scade fra 1 giorno; con 01/02/2027 diventa 🔴 in ritardo']],
     attesa: '300 TR-PED in contabilità, ma solo 200 prelevabili da W100: le altre 100 non sono né qua né là.',
     nota: 'Lettura: spunta a mano. È lo «stock in transito» della rete dei depositi che si studia nella MasterSupplyChain Academy.'},
    {g: 'UF 10 · 10 · Deposito esterno', data: '31/01/2027', titolo: 'Entrata 101 al deposito: il viaggio è finito', dove: {ep: M + 'depositi'}, percorso: 'WMS → Deposito esterno e merce in viaggio → 3 · Ricevi all’arrivo',
     campi: [['Trasferimento', 'UB001 in viaggio'], ['Quantità contata all’arrivo', 'vuoto = tutte le 100'], ['Data di arrivo', '31/01/2027'], ['Pulsante', 'Registra l’entrata 101']],
     attesa: 'Stato «arrivato il 31/01/2027». TR-PED: W100 200 + in viaggio 0 + D200 100 = 300. Nessuna scrittura.',
     nota: 'Se all’arrivo ne mancassero, la differenza andrebbe nella zona 999 e si registrerebbe con l’inventario (LI21).',
     fatto: function (h) { return ((wm(h).trasferimenti) || []).some(function (t) { return t.mat === 'TR-PED' && !!t.arrivato; }); }},
    // ══════════ UF 8 · valori di magazzino; UF 11 · KPI ══════════
    {g: 'UF 8 · 10 · Valori e controlli', titolo: 'Valorizza la rimanenza di ferro: FIFO, LIFO, costo medio, standard', dove: {ep: I + 'valorizzazione'}, percorso: 'WMS → Inventari → Valorizzazione delle rimanenze',
     campi: [['Materiale', 'FERRO, 438 kg (un solo acquisto: 3.000 kg a 1,00 €/kg, fattura a 1,02)'], ['Costo standard (in bilancio)', '438 × 0,95 = 416,10'],
       ['Domanda', 'perché FIFO, LIFO e costo medio coincidono qui? (un solo prezzo d’acquisto). Che cosa cambierebbe con un secondo acquisto a un prezzo diverso?']],
     nota: 'Lettura e ragionamento: spunta a mano. In questo sistema il magazzino è a costo standard; le differenze verso il prezzo pagato sono nel conto 63 (150 alla MIGO + 60 alla MIRO).'},
    {g: 'UF 8 · 10 · Valori e controlli', titolo: 'Monitor: quadratura scorte contabili (IM) e WMS', dove: {ep: M + 'monitor'}, percorso: 'WMS → Monitor del magazzino',
     campi: [['Confronto', 'per ogni materiale quantità IM = somma delle UdC nel WMS'], ['Aree di passaggio', 'GR-ZONE, GI-ZONE, Q-ZONE e PSA vuote; differenze 999 registrate']],
     attesa: 'Tutte le righe «quadra»: TR-STD 0, TR-ALTA 50, TR-PED 300 (200 in W100 e 100 nel deposito D200), FERRO 438.', nota: 'Lettura: spunta a mano.'},
    {g: 'UF 10 · 10 · Valori e controlli', titolo: 'Scorta minima: il ferro è sotto il minimo', dove: {ep: M + 'scorte'}, percorso: 'WMS → Scorta minima e riordino (l’avviso rosso compare anche nel Monitor)',
     campi: [['Riga FERRO', 'libera 438 + in arrivo 0 = 438 kg, minima 500, massima 3.000'], ['Stato', '🔴 SOTTO SCORTA: riordina'], ['Proposta', '3.000 − 438 = 2.562 kg'],
       ['Decisione', 'la richiesta d’acquisto si farà a febbraio: in questo esercizio NON crearla']],
     attesa: 'Avviso rosso in alto: «1 materiale sotto la scorta minima: FERRO → riordina 2.562 kg». Le transenne non hanno un minimo impostato: riga grigia.',
     nota: 'Lettura: spunta a mano. Il ferro è sceso sotto il minimo dopo il prelievo per la produzione e i 12 kg mancanti all’inventario.'},
    {g: 'UF 8 · 10 · Valori e controlli', titolo: 'Libro giornale: la storia contabile del magazzino', dove: {ep: F + 'giornale'}, percorso: 'FI → Libro giornale',
     campi: [['Ritrova', 'apertura 561, MIGO 101 con la differenza prezzo, rottamazioni 555, MIRO, prelievo 261, conferme CO11N, versamento 101, uscite 601, reso 651, differenza 711'],
       ['Conto 12 Materie prime', '2.850 − 142,50 − 2.280 − 11,40 = 416,10 = 438 kg × 0,95'], ['Conto 13 Prodotti finiti', '22.785 + 9.420 − 10.990 − 5.541 + 314 − 314 − 4.710 = 10.964 = 50 TR-ALTA + 300 TR-PED a standard']],
     nota: 'Lettura e riconciliazione: spunta a mano. Ogni movimento fisico che cambia la proprietà o il valore della merce ha la sua scrittura; gli spostamenti interni no.'},
    {g: 'UF 11 · 10 · Valori e controlli', titolo: 'KPI di magazzino del mese', dove: {ep: Z + 'kpi'}, percorso: 'WMS → Innovazione → KPI di magazzino',
     campi: [['Leggi', 'accuratezza dell’inventario, ordini perfetti, tempo dal ricevimento allo scaffale, compiti per risorsa'], ['Commenta', 'quale KPI miglioreresti per primo e con quale tecnologia (RFID, ondate, slotting)?']],
     nota: 'Lettura: spunta a mano. Un KPI vale se dichiari perimetro, unità e denominatore.'},
    {id: 'mag5-consegna', g: 'Consegna', titolo: 'Consegna l’esercitazione al docente', dove: {ep: 'allievo.consegna'}, percorso: 'La mia area → Consegna il lavoro',
     campi: [['Esercizio', 'Magazziniere 5.0: un mese di magazzino'], ['Nota', 'eventuali dubbi, errori corretti e la tua risposta sui KPI']],
     nota: 'Il docente vede tutti i documenti, i compiti RF e le scritture. Spunta a mano dopo la consegna.'}
  ];

  // Guida didattica uniforme per tutti gli 82 passaggi.
  // Distingue le azioni reali del gestionale dalle semplici conferme di lettura.
  // La spunta finale di un'operazione rimane sempre legata a p.fatto(h),
  // non al clic su "Ho letto" o alla pressione di un pulsante.
  function leggi(nome, serve, sel) {
    var p = {t:'leggi',nome:nome,serve:serve};
    if(sel)p.sel=sel;
    return p;
  }
  function istruzioni(p) {
    var out=[leggi('Dove andare',
      'Nel Launchpad scegli il modulo indicato, oppure premi «Apri ➜» qui sopra. '+
      'Percorso da raggiungere: '+String(p.percorso||p.titolo)+'. '+
      'Controlla il titolo della schermata prima di inserire dati.')];
    (p.campi||[]).forEach(function(c,i) {
      var nome=String(c[0]||'Campo '+(i+1)), valore=String(c[1] == null ? '' : c[1]);
      out.push(leggi(String(i+1)+' · '+nome,
        'Nella schermata «'+String(p.percorso||'')+'» cerca il campo, comando o prospetto «'+nome+
        '». '+(nome.toLowerCase().indexOf('pulsante')>=0?'Premi il comando: ':'Inserisci, seleziona o verifica: ')+
        valore+'. Se il programma propone codici reali di pallet, lotti, UdC, consegne o SSCC, usa i codici mostrati nel tuo account, non numeri inventati.'));
    });
    if(p.nota)out.push(leggi('Attenzione / perché lo fai',String(p.nota)));
    if(p.attesa)out.push(leggi('Verifica il risultato',
      'Dopo il salvataggio, confronta la schermata con questo risultato atteso: '+String(p.attesa)));
    out.push(leggi(p.fatto?'Attendi la spunta automatica ✓':'Conferma la lettura ✓',
      p.fatto?'Non basta confermare questo testo: il tutor deve leggere il movimento, il documento o il parametro realmente SALVATO. '+
        'Se non compare ✓, torna nella schermata, verifica il messaggio di esito e NON ripetere automaticamente un movimento già contabilizzato. Chiedi al docente di controllare i dati.' :
        'Questo è un controllo di lettura senza movimento contabile. Dopo averlo realmente svolto, premi «✓ Fatto» nel pannello. Solo allora il pulsante «Avanti» sarà disponibile.'));
    return out;
  }
  function avvioDettagli() {
    return [
      leggi('1 · Apri l’ambiente giusto',
        'Entra nel Sistema integrato → Avvio e dati di base → Avvio del sistema. '+
        'Scegli la scheda «Percorso logistico · Magazziniere 5.0», NON «Crea nuova azienda vuota (costituzione)» e NON un altro esercizio. '+
        'Se vedi già documenti o un’azienda avviata, NON azzerare: chiedi al docente un account libero.'),
      {t:'campo',sel:'#lg-data',nome:'Data di avvio',valore:'2027-01-04',
       serve:'Inserisci 04/01/2027: è la data dello SCENARIO SIMULATO, anche se il corso viene svolto in un altro giorno o anno.'},
      {t:'scelta',sel:'#lg-quiz',nome:'Ricostruzione delle scritture',valore:'si',
       serve:'Per il corso completo scegli «sì». Dopo i documenti contabili il tutor farà ricostruire Dare/Avere. Il docente può decidere prima della partenza una classe solo operativa (no).'},
      {t:'pulsante',sel:'[data-prefisso="lg"] [data-azione="lg"]',
       nome:'Avvia il percorso logistico',
       serve:'Premi UNA volta «Avvia il percorso logistico». Attendi «Percorso logistico avviato». NON premere di nuovo e NON selezionare un secondo scenario.'},
      leggi('2 · Controlla le giacenze iniziali',
        'Devi trovare banca 50.000 €, 200 TR-STD, 200 TR-ALTA, 300 TR-PED (totale prodotti 22.785 €); ferro ZERO. '+
        'Con la ricostruzione attiva, completa anche la partita doppia di apertura che compare nel tutor. '+
        'La spunta arriva dai dati salvati: non la metti manualmente.')
    ];
  }
  function attivazioneWms() {
    return [
      leggi('1 · Vai in WMS → Struttura e attivazione',
        'Dal Launchpad apri Magazzino → Struttura e attivazione. Il WMS serve a conoscere DOVE si trova ogni unità di carico, '+
        'non solo quanti pezzi ci sono in contabilità.'),
      {t:'campo',sel:'#at-data',nome:'Data di attivazione',valore:'2027-01-04',
       serve:'La data WMS deve coincidere con l’avvio: 04/01/2027.'},
      {t:'pulsante',sel:'[data-prefisso="at"] [data-azione="at"]',
       nome:'Attiva il magazzino W100',
       serve:'Premi il pulsante UNA sola volta e attendi il messaggio verde. '+
       'Il sistema crea le ubicazioni e distribuisce i pallet già presenti: non è un acquisto e non crea una seconda giacenza.'},
      leggi('2 · Controlla il risultato',
       'Il magazzino deve mostrare 41 ubicazioni e 14 UdC: 4 pallet TR-STD, 4 TR-ALTA e 6 TR-PED, da 50 pezzi ciascuno. '+
       'Quantità contabili e fisiche devono coincidere. La spunta arriva automaticamente solo se W100 è attivo.')
    ];
  }
  function introduzionePratica(p) {
    if(p.titolo.indexOf('Leggi la mappa:')===0)return [
      leggi('1 · Apri la mappa del WMS','Vai su Magazzino → Mappa delle ubicazioni. Osserva la legenda e le corsie 01, 02 e 03.'),
      leggi('2 · Decifra 01-03-1','01 = corsia, 03 = campata, 1 = livello. Premi la relativa ubicazione nella mappa: leggi materiale, quantità e UdC.'),
      leggi('3 · Conosci le aree di servizio','GR-ZONE = ricevimento, GI-ZONE = spedizione, Q-ZONE = quarantena, PSA-L1 = bordo linea, F-01/F-02 = cataste ferro.'),
      leggi('4 · Completa il controllo','Confronta la mappa con il testo del tutor, poi premi il pulsante «✓ Fatto» della guida per abilitare il passo successivo.')
    ];
    if(p.titolo.indexOf('Dove si trova? Cerca')===0)return [
      leggi('1 · Apri il campo Dove si trova?','In Magazzino → Mappa delle ubicazioni, nella parte superiore usa la ricerca «🔎 Dove si trova?».'),
      {t:'scelta',sel:'#dove-mat',nome:'Articolo da cercare',valore:'TR-ALTA',
       serve:'Scegli TR-ALTA dal menu. Le ubicazioni trovate si evidenziano sulla mappa.'},
      leggi('2 · Leggi le quattro UdC','Nella tabella sotto la mappa devono apparire 4 pallet TR-ALTA da 50 pezzi, tutti liberi, totale 200 pezzi. Non confondere UdC e codice articolo.'),
      leggi('3 · Ricordati gli identificativi','Per le esercitazioni RF userai i veri codici UdC esposti dal tuo account. Non copiarli da esempi di altri allievi. Premi «✓ Fatto» dopo la verifica.')
    ];
    if(p.titolo.indexOf('Stampa le etichette')===0)return [
      leggi('1 · Apri Etichette barcode e QR','Vai su Magazzino → Etichette barcode e QR. Seleziona una ubicazione (es. 01-03-1) e una UdC effettivamente presente sulla mappa.'),
      leggi('2 · Quale etichetta applicare?','L’etichetta UBICAZIONE va sullo scaffale; l’etichetta UdC va sul pallet. Il codice a barre è per la pistola, il QR per lo smartphone.'),
      leggi('3 · Stampa o salva','Usa il pulsante di stampa o PDF della pagina; verifica che i due codici siano differenti. Spunta «✓ Fatto» dopo la prova.')
    ];
    if(p.titolo.indexOf('RF Interroga:')===0)return [
      leggi('1 · Apri la pistola RF','Vai su Magazzino → Pistola RF, poi premi la scheda «🔎 Interroga». «📦 Compiti» è un’altra funzione, per movimentare merci.'),
      {t:'leggi',sel:'#rf-q',nome:'Leggi un indirizzo',
       serve:'Nella casella «Leggi un’ubicazione, un’unità di carico o un articolo» digita 01-03-1 e premi Invio. Leggi articolo, quantità e UdC; NON stai movimentando nulla.'},
      {t:'leggi',sel:'#rf-q',nome:'Interroga una UdC',
       serve:'Pulisci la casella, digita un codice UdC effettivamente letto dalla mappa, premi Invio e controlla dove si trova il pallet.'},
      {t:'leggi',sel:'#rf-q',nome:'Interroga TR-PED',
       serve:'Digita TR-PED e premi Invio: devono risultare sei pallet da 50. Poi premi «✓ Fatto» nel tutor: questa interrogazione non registra una scrittura.')
    ];
    return null;
  }
  function istruzioniSscc(p) {
    var titolo=p.titolo||'';
    var imballo=/^Imballa (Beta|Delta|Gamma)/.test(titolo);
    var carico=/RF Carico/.test(titolo);
    if(!imballo&&!carico)return null;
    var beta=/Beta/.test(titolo),delta=/Delta/.test(titolo);
    var d=beta?'80000001':delta?'80000002':null;
    var count=beta?7:delta?3:3;
    var help='SSCC = codice univoco a 18 cifre per UN collo/pallet. Il numero consegna non è l’SSCC; '+
      'questi codici vengono generati dal software dopo il prelievo e l’imballo (prefisso GS1 fittizio).';
    if(imballo)return [
      leggi('1 · Da dove vengono i codici?','Vai su Sistema integrato → Spedizione → Imballo. '+help),
      ...(d?[{t:'scelta',sel:'#im-consegna',nome:'Consegna da imballare',valore:d,
        serve:'Seleziona la consegna '+d+'. Deve essere già prelevata e presente nella lista; altrimenti completa prima i compiti RF di prelievo.'}]:
        [leggi('Seleziona Gamma','Seleziona la consegna Gamma già prelevata: leggi il numero ESATTO nella schermata delle consegne, non riusare il numero di Beta.')]),
      {t:'scelta',sel:'#im-imballo',nome:'Tipo di pallet',valore:'EUR',
       serve:'Scegli EUR: pallet europeo con regola di confezionamento da 50 transenne per collo.'},
      {t:'campo',sel:'#im-perCollo',nome:'Pezzi per collo',valore:'50',
       serve:'Scrivi 50 pezzi per pallet. Numero atteso di colli: '+count+'. Il totale deve quadrare con la consegna.'},
      {t:'pulsante',sel:'[data-prefisso="im"] [data-azione="im"]',
       nome:'Crea i colli (SSCC)',serve:'Inserisci la data di gennaio 2027 prevista nel passaggio, poi premi UNA sola volta. Il sistema genera '+count+' SSCC differenti.'},
      leggi('2 · Dove si vedono gli SSCC?','Resta nella pagina Imballo; dopo il salvataggio scorri fino alla tabella «Colli della consegna», colonna SSCC: leggi '+count+' codici di 18 cifre.'),
      leggi('3 · Stampa le etichette','Usa «Stampa le etichette»: ogni pallet ha il suo barcode GS1-128 (00). Le userai nel carico RF o nel trasporto. La spunta arriva solo quando risultano creati '+count+' colli.')
    ];
    return [
      leggi('1 · Recupera i codici SSCC','Prima apri Spedizione → Imballo, scegli la consegna '+(d||'di Beta')+' e leggi gli SSCC REALI dei pallet nella colonna SSCC. '+help),
      leggi('2 · Dove caricare','Vai in Magazzino → Pistola RF → scheda «🚛 Carico»; il trasporto deve essere già creato e deve contenere quella consegna.'),
      {t:'leggi',sel:'#rf-sscc',nome:'Leggi un SSCC alla volta',
       serve:'Nella casella «Leggi l’SSCC del collo da caricare» digita/scansiona il PRIMO codice reale di 18 cifre e premi Invio. Poi passa al secondo e continua. NON usare il codice ordine o consegna.'},
      leggi('3 · Controlla la quantità','Sono attesi '+count+' pallet caricati. Lo stesso SSCC non deve essere usato due volte. Se il codice viene rifiutato, torna all’Imballo e controlla trasporto e numero.'),
      leggi('4 · Verifica il risultato','La spunta avviene quando tutti i pallet previsti risultano caricati nel trasporto. Non registrare l’uscita merci se il carico è incompleto.')
    ];
  }
  passi.forEach(function(p) {
    p.punti = introduzionePratica(p) || istruzioniSscc(p) || istruzioni(p);
    if(p.id==='mag5-avvio')p.punti=avvioDettagli();
    if(p.id==='mag5-attiva')p.punti=attivazioneWms();
    if(!p.grande)p.grande='COSA IMPARI: '+p.titolo+'. '+(p.fatto?
      'Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.':
      'Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.');
  });

  window.MSA_ESERCIZIO = {codice: 'magazziniere-5', titolo: 'Magazziniere 5.0: un mese di magazzino (gennaio 2027)', versione: 'erp-ft', pannelloAutomatico: true, verificaRagioneria: true, passi: passi};
})();
