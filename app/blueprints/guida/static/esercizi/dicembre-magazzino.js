/* Esercitazione «Dicembre in magazzino» — versione per MAGAZZINIERI, SENZA ragioneria.
   Stessa azienda, stesse date e stessi documenti di «Dicembre: dalla costituzione alla riapertura»:
   vendite (SD), acquisti (MM), produzione (PP) e TUTTE le operazioni di magazzino (WMS, pistola RF,
   quarantena, slotting, ondate, SSCC, camion, DDT, inventario, deposito esterno).
   Niente libro giornale per l'allievo: niente cespiti, fatture, pagamenti, finanza, paghe, ratei, IVA,
   chiusura, e nessuna domanda «ricostruisci la scrittura». Il programma registra comunque le sue
   scritture in automatico (servono al docente e alla versione con ragioneria), ma l'allievo non le vede.

   Si carica DOPO dicembre-wms.js e dicembre-wms-semplice.js: ne prende i passi di magazzino (elenco
   chiuso qui sotto, per titolo), toglie dai testi tutto ciò che è ragioneria e rinomina l'esercizio.
   Se un titolo cambia nella versione con ragioneria, il test tests/esercizio-dicembre-magazzino.js
   se ne accorge. Solo testi e ordine dei passi: nessuna operazione e nessuna modifica dello stato. */
(function () {
  'use strict';
  var E = window.MSA_ESERCIZIO;
  if (!E || E.codice !== 'dicembre-wms') return;
  var R = function (dove, fai, valore) { return {dove: dove, fai: fai, valore: valore}; };
  var APRI = R('Qui nel pannello, in alto', 'Premi il pulsante blu «Apri ➜»');
  var FATTO = R('Qui nel pannello, in basso', 'Premi «✓ Fatto»');

  // ── i gruppi: dal giro della merce, numerati di nuovo per il magazzino ──
  var GRUPPI = {
    '0 · Preparazione azienda': '0 · Prima di cominciare',
    '1 · Costituzione': '1 · L’azienda nasce e il magazzino si accende',
    '1 · Preparazione: WMS': '1 · L’azienda nasce e il magazzino si accende',
    '2 · Preparazione: budget e standard': '2 · Distinta base e ciclo di lavoro',
    '4 · CICLO OPERATIVO: ordini dei clienti': '3 · Vendite: gli ordini dei clienti',
    '4 · CICLO OPERATIVO: fabbisogni': '4 · Fabbisogni: quanto ferro serve',
    '5 · Acquisto del ferro': '5 · Acquisti: ordina, ricevi e metti a scaffale il ferro',
    '6 · Ordine transenne': '6 · Produzione: 300 transenne su un solo ordine',
    '7 · Fasi sullo stesso ordine': '6 · Produzione: 300 transenne su un solo ordine',
    '8 · HALB autonomo a scorta': '7 · Produzione: 20 kit tagliati a scorta',
    '8b · Pistola RF, quarantena e slotting': '8 · Pistola RF, quarantena e slotting',
    '9 · Consegna con picking': '9 · Spedizione: ondata, picking, SSCC, camion e DDT',
    '14 · Inventario di fine anno': '10 · Inventario di fine anno e deposito esterno',
    '16 · Riapertura e gennaio': '11 · Gennaio: i kit arrivano al deposito'
  };

  // ── i passi di magazzino, nell'ordine dell'esercizio con ragioneria ──
  var TENGO = [
    'Prima di cominciare: un sistema vuoto',
    'Costituisci la società con 80.000 € di capitale',
    'Attiva il magazzino W100 (vuoto)',
    'Leggi il ciclo a fasi e il semilavorato autonomo',
    'VA01: Beta ordina 180 TR-STD',
    'VA01: Delta ordina 120 TR-STD',
    'VA05: leggi il semaforo di disponibilità dei due ordini',
    'Dalla domanda ai fabbisogni: 300 transenne e 20 kit a scorta',
    'ME21N: ordina 3.000 kg di ferro',
    'MIGO 101: ricevi il ferro, 200 kg sono schiacciati',
    'Merce da mettere a posto: che cosa aspetta in ricevimento?',
    'RF: metti a dimora i 3 fasci buoni in catasta',
    'Quarantena: decidi sui 200 kg schiacciati',
    'ME21N: riordino urgente di 500 kg',
    'MIGO 101: ricevi i 500 kg urgenti',
    'RF: metti a dimora il fascio urgente',
    'CO01: un ordine per 300 transenne',
    'CO09: le 300 transenne in arrivo rendono confermabili i due ordini',
    'WMS: porta il ferro delle transenne alla linea',
    'RF: conferma l’approvvigionamento del ferro delle transenne',
    '261: consuma 2.400 kg sullo stesso ordine',
    'CO11N: Taglio 75 ore, WIP 4.380',
    'CO11N: Piegatura 60 ore, WIP 6.060',
    'CO11N: Saldatura 120 ore, WIP 9.420',
    '101: carica a magazzino le 300 transenne',
    'RF: metti a scaffale i 6 pallet di transenne',
    'CO01: ordine autonomo per 20 kit SL-TAGLIO',
    'WMS: approvvigiona il ferro dei 20 kit',
    'RF: porta alla linea il ferro dei kit',
    '261: consuma 160 kg per il HALB',
    'CO11N: conferma 5 ore del HALB',
    '101: versa a magazzino i 20 kit autonomi',
    'RF: metti a scaffale il cassone SL-TAGLIO',
    'Leggi la mappa delle ubicazioni',
    'Dove si trova? Cerca il ferro',
    'LT10: sposta il cassone da 20 in fondo al magazzino',
    'RF: conferma lo spostamento del cassone',
    'Stampa le etichette del cassone e dell’ubicazione',
    'Controlla WIP e stock: due concetti distinti',
    'RF Interroga: che cosa c’è in un’ubicazione?',
    'Blocca un pallet di transenne urtato dal carrello',
    'RF: porta il pallet in quarantena',
    'Controllo superato: sblocca il pallet (343)',
    'RF: rimetti a scaffale il pallet sbloccato',
    'LT10: lavori al pavimento, sposta un pallet di transenne in fondo',
    'RF: conferma lo spostamento in fondo',
    'Slotting: avvicina le transenne alla porta di spedizione',
    'RF: conferma i trasferimenti dello slotting',
    'Arretrato e scadenze: chi aspetta la merce?',
    'Attiva il prelievo a ondate',
    'VL01N: consegna per Beta',
    'VL01N: consegna per Delta',
    'Rilascia l’ondata ONDA-1',
    'Stampa la lista di prelievo',
    'RF: preleva i 7 pallet (FIFO)',
    'Misure del pallet EUR e regola: quante transenne per collo',
    'Imballa Beta in 4 colli SSCC',
    'Imballa Delta in 3 colli SSCC',
    'Crea un trasporto per le due consegne',
    'Piano di carico e camion 3D: quale camion per Beta e Delta?',
    'RF Carico: carica i 4 colli di Beta con la pistola',
    'Varco RFID: carica i 3 colli di Delta in un passaggio',
    'Partenza: uscita merci 601 e DDT',
    'VL06O: controlla il monitor della spedizione',
    'Stampa i DDT delle due consegne',
    'Reclamo simulato: da quale ferro vengono le transenne di Beta?',
    'Classificazione ABC dei materiali',
    'LI01N: documento d’inventario delle ubicazioni occupate',
    'Attiva l’inventario e stampa la lista di conta',
    'RF Inventario: conta la catasta F-02 con la pistola',
    'LI11N: registra alla scrivania la conta del cassone (manca un kit)',
    'LI14: riconta il cassone',
    'LI20: chiudi l’inventario nel WMS',
    'LI21: registra la differenza in contabilità',
    'Valorizza la rimanenza di ferro con i quattro metodi',
    'Scorta minima del ferro: è ora di riordinare?',
    'Trasferimento: 10 kit al deposito esterno D200',
    'RF: preleva i 10 kit per il deposito',
    'Uscita 351: il camion parte, i kit sono in viaggio',
    'Dove si trova? I kit sul camion a fine anno',
    'KPI di magazzino di dicembre',
    'Entrata 101 al deposito: i kit sono arrivati'
  ];

  // ── via la ragioneria dai testi: frasi con conti, Dare/Avere, scritture, giornale, IVA, euro ──
  var CONTABILE = /\b[DA] ?\d{2}(?:\.\d{2})?\b|\bD \d|\bA \d|scrittur|contabil|Dare|Avere|\bconto \d|\bconti \d|\bconto 1|giornale|mastrin|ricostru|\bIVA\b|€|\beuro\b|debito|credito|fattur|costo pianificato|costo standard|\bstandard\b|valore contabile|\bFI\b|\bCO\b ?→|WIP analitico|capitalizz|bilancio|ragioneria|laboratorio di|\bcost[oi]\b|budget|CPM|snapshot/i;
  function pulisci(t) {
    if (t == null) return t;
    t = String(t).replace(/,? *(già rifornito )?al passo \d+/g, ' già rifornito prima');
    var frasi = String(t).split(/(?<=[.!?;])\s+(?=[A-ZÈÀÙÒÌ0-9«(])/);
    return frasi.filter(function (f) { return !CONTABILE.test(f); }).join(' ').trim();
  }
  function pulisciPunti(punti) {
    return (punti || []).map(function (q) {
      var x = Object.assign({}, q);
      if (x.serve != null) {
        var s = pulisci(x.serve);
        x.serve = s || (x.t === 'pulsante' ? 'Premi una volta e aspetta la conferma del programma.' : 'Compila come indicato e controlla quello che vedi nella schermata.');
      }
      if (x.nome && CONTABILE.test(x.nome)) x.nome = x.nome.replace(/\s*\(.*\)$/, '');
      return x;
    });
  }
  function pulisciFai(fai) {
    return (fai || []).map(function (r) {
      if (Array.isArray(r)) return CONTABILE.test(r[0] + ' ' + r[1]) ? null : r;
      if (typeof r === 'string') return CONTABILE.test(r) ? null : r;
      if (r && r.fai && /ricostru|scrittur/i.test(r.fai)) return null;
      return r;
    }).filter(Boolean);
  }

  // ── testi riscritti per i passi che nella versione con ragioneria parlano di conti ──
  var NUOVO = {
    'Prima di cominciare: un sistema vuoto': {
      percorso: 'Launchpad → «📦 Dicembre in magazzino» → Avvio del sistema',
      campi: [['Ambiente', 'Sistema integrato, guida «Dicembre in magazzino», un account dedicato a questo esercizio'], ['Se l’account è vuoto', 'Vedi il riquadro «Dicembre in magazzino»: crei l’azienda al passo seguente'], ['Se l’account contiene già un’altra azienda', 'Non cancellare niente: chiedi al docente un account dedicato']],
      nota: 'Il tuo lavoro resta salvato nel tuo account: puoi chiudere e riprendere quando vuoi, il pannello riparte dall’ultimo passo.',
      grande: 'PRIMA DI COMINCIARE: CONTROLLA DI ESSERE NEL POSTO GIUSTO. Ti serve un account vuoto, dedicato a questo esercizio.',
      fai: [APRI, R('In alto nella pagina', 'Controlla che ci sia il riquadro «Dicembre in magazzino»'), R('Se vedi un avviso rosso «c’è già un’azienda»', 'Fermati e chiama il docente')],
      vedi: ['Riquadro «Dicembre in magazzino» con il pulsante «Crea l’azienda per il magazzino»']
    },
    'Costituisci la società con 80.000 € di capitale': {
      titolo: 'Crea l’azienda Ferro & Transenne (nasce il 1° dicembre)',
      percorso: 'Avvio e dati di base → Avvio del sistema → riquadro «Dicembre in magazzino»',
      campi: [['Data di nascita dell’azienda', '01/12/2026'], ['Pulsante', 'Crea l’azienda per il magazzino']],
      attesa: 'L’azienda è pronta: magazzino vuoto, nessun cliente servito, nessuna merce. Ci sono già i materiali (FERRO, SL-TAGLIO kit tagliato, TR-STD transenna), la distinta base e il ciclo di lavoro con tre fasi.',
      nota: 'Questa parte la fa una sola volta. Gli aspetti amministrativi (capitale, banca, fatture) li segue l’ufficio amministrazione: tu lavori solo sulla merce.',
      grande: 'CREA L’AZIENDA. È il primo giorno: il magazzino è vuoto e non c’è ancora niente da spedire. Da qui in avanti segui la merce, dal cliente che ordina fino al camion che parte.',
      fai: [APRI, R('Riquadro «Dicembre in magazzino», casella «Data di nascita»', 'Scrivi', '01/12/2026'), R('Sotto', 'Premi «Crea l’azienda per il magazzino»')],
      vedi: ['Azienda creata il 01/12/2026', 'Magazzino vuoto: nessuna merce, nessuna ubicazione ancora occupata'],
      punti: [{t: 'campo', sel: '#cs-data', nome: 'Data di nascita dell’azienda', valore: '2026-12-01', serve: 'Il 1° dicembre 2026 nasce l’azienda: tutte le date dell’esercizio vengono dopo.'},
              {t: 'pulsante', sel: '[data-prefisso="cs"] [data-azione="cs"]', nome: 'Crea l’azienda per il magazzino', serve: 'Premi UNA volta: il programma prepara materiali, distinta e ciclo di lavoro.', finale: true}]
    },
    'Attiva il magazzino W100 (vuoto)': {
      campi: [['Data di attivazione', '01/12/2026'], ['Pulsante', 'Attiva il magazzino W100']],
      attesa: '41 ubicazioni create, nessuna unità di carico: il magazzino è vuoto.',
      nota: 'Attiva W100 prima del primo ricevimento di materiali, quando non c’è ancora merce. In seguito entrate, spostamenti e uscite passano sempre dai compiti della pistola RF.'
    },
    'Leggi il ciclo a fasi e il semilavorato autonomo': {
      titolo: 'Leggi la distinta base e il ciclo di lavoro',
      percorso: 'PP → Ordini di produzione → Distinta e ciclo',
      campi: [['TR-STD (transenna)', '8 kg di ferro per pezzo; Taglio 0,25 h + Piegatura 0,20 h + Saldatura 0,40 h'], ['Un solo ordine', 'Le tre fasi si dichiarano sullo stesso ordine: tra una fase e l’altra la merce NON entra in magazzino. Entra solo la transenna finita, alla fine.'], ['SL-TAGLIO (kit tagliato)', '8 kg di ferro + 0,25 h di Taglio; si produce con un ordine a parte e resta a scaffale come scorta']],
      attesa: 'Per 1 transenna: 8 kg di ferro e 0,85 ore di lavoro in tre fasi. Il kit tagliato è un prodotto a sé: non è un pezzo della transenna.',
      nota: 'Lettura: spunta a mano. La distinta dice COSA serve, il ciclo dice COME e IN QUANTO TEMPO.',
      grande: 'LEGGI LA RICETTA DELLA TRANSENNA. La distinta base è la lista degli ingredienti (8 kg di ferro), il ciclo è il procedimento (Taglio, Piegatura, Saldatura).',
      fai: [APRI, R('Riquadro «Distinta e ciclo»', 'Leggi la riga di TR-STD: componente, quantità e ore delle tre fasi'), R('Stesso riquadro', 'Leggi la riga di SL-TAGLIO'), FATTO],
      vedi: ['TR-STD: 8 kg FERRO · Taglio 0,25 h · Piegatura 0,20 h · Saldatura 0,40 h', 'SL-TAGLIO: 8 kg FERRO · Taglio 0,25 h']
    },
    'VA01: Beta ordina 180 TR-STD': {nota: 'Qui comincia il giro della merce: ordini dei clienti → fabbisogni → acquisti → produzione → spedizione. Si produce su ordine del cliente; solo i 20 kit si producono a scorta.', attesa: 'Ordine salvato. Controllo di disponibilità: in magazzino ci sono 0 transenne e niente in arrivo → confermati 0 su 180. L’ordine aspetta la produzione.', vedi: ['Ordine salvato per 180 TR-STD, consegna richiesta 14/12/2026', 'Confermati 0 su 180: in magazzino non c’è niente, bisogna produrre']},
    'VA01: Delta ordina 120 TR-STD': {attesa: 'Ordine salvato, confermati 0 su 120. Totale da produrre: 300 transenne.', vedi: ['Ordine salvato per 120 TR-STD', 'Confermati 0 su 120']},
    'Dalla domanda ai fabbisogni: 300 transenne e 20 kit a scorta': {attesa: 'Domanda dei clienti, distinta base e fabbisogni devono tornare prima di ordinare il ferro il 03/12: 2.560 kg servono davvero, 3.000 si comprano.', nota: 'È un calcolo ragionato sulla distinta: il programma non lancia un MRP automatico. Spunta dopo aver fatto il calcolo.'},
    'CO11N: conferma 5 ore del HALB': {titolo: 'CO11N: dichiara 5 ore di Taglio dei kit', attesa: 'Fase dichiarata sull’ordine 1000002: 20 kit, 5 ore.', campi: [['Ordine', '1000002'], ['Fase', 'Taglio, se il menu la propone; altrimenti lascialo vuoto'], ['Attrezzaggio', '0'], ['Ore', '5'], ['Data', '12/12/2026']]},
    'RF: metti a scaffale il cassone SL-TAGLIO': {attesa: '20 kit a scaffale, pronti come scorta. Non sono pezzi delle transenne.'},
    'Leggi la mappa delle ubicazioni': {campi: [['Ferro', 'F-02: 240 kg COL-1204 e 500 kg COL-1206'], ['Kit SL-TAGLIO', 'trova il cassone da 20; copia ubicazione e UdC dalla mappa']]},
    'Valorizza la rimanenza di ferro con i quattro metodi': {titolo: 'Valorizza la rimanenza di ferro: FIFO, LIFO e costo medio', campi: [['Materiale', 'FERRO, 740 kg'], ['FIFO', 'restano gli acquisti più recenti: 240 × 1,00 + 500 × 1,08 = 780'], ['LIFO', 'restano i più vecchi: 740 × 1,00 = 740'], ['Costo medio ponderato', 'il programma lo ricalcola a ogni entrata e uscita: 748,97']], attesa: 'Stessi 740 kg, tre valori diversi: 780 (FIFO), 740 (LIFO), 748,97 (costo medio). La quantità non cambia, cambia solo il criterio con cui la si valuta.', nota: 'Lettura: spunta a mano. Non registri niente: è un confronto fra metodi.'},
    'ME21N: ordina 3.000 kg di ferro': {attesa: 'Ordine d’acquisto 4500000001 per 3.000 kg di ferro. Ne servono 2.560 kg (300 transenne × 8 + 20 kit × 8): il resto è scorta. Poi, nella stessa pagina, riquadro «Conferma d’ordine del fornitore»: scegli l’ordine, scrivi CONF-001 e premi «Registra la conferma tornata». Finché la conferma non torna, l’ordine resta «⏳ in attesa».', vedi: ['Ordine 4500000001 per 3.000 kg', 'Conferma del fornitore registrata: l’ordine non è più «in attesa»']},
    'MIGO 101: ricevi il ferro, 200 kg sono schiacciati': {attesa: 'Movimento 101: entrano 3.000 kg. 2.800 kg buoni in 3 fasci nella zona di arrivo GR-ZONE, con 3 compiti per metterli a scaffale; 200 kg BLOCCATI nella zona quarantena Q-ZONE.', vedi: ['2.800 kg buoni in 3 fasci nella zona di arrivo GR-ZONE, con 3 compiti per metterli a scaffale', '200 kg BLOCCATI nella zona quarantena Q-ZONE']},
    'RF: metti a dimora i 3 fasci buoni in catasta': {attesa: 'F-01 con due fasci, F-02 con quello da 800 kg. GR-ZONE vuota; i 200 kg restano in Q-ZONE.'},
    'Quarantena: decidi sui 200 kg schiacciati': {attesa: 'Movimento 555: i 200 kg schiacciati escono dal magazzino come rottame. Se il controllo avesse detto «buona», si sbloccava (343) e tornava a scaffale.', vedi: ['I 200 kg escono dalla quarantena: Q-ZONE vuota', 'Ferro in magazzino: 2.800 kg']},
    'ME21N: riordino urgente di 500 kg': {attesa: 'Ordine 4500000002 per 500 kg. Con 2.800 kg buoni, dopo i due ordini di produzione ne resterebbero solo 240: si ricostituisce la scorta di sicurezza.'},
    'MIGO 101: ricevi i 500 kg urgenti': {attesa: 'Movimento 101: un fascio da 500 kg (colata COL-1206) nella zona di arrivo GR-ZONE, con un compito per metterlo a scaffale.', vedi: ['Un fascio da 500 kg in GR-ZONE', 'Un compito PUTAWAY aperto']},
    'CO01: un ordine per 300 transenne': {attesa: 'Ordine di produzione 1000001: servono 2.400 kg di ferro, Taglio 75 h, Piegatura 60 h, Saldatura 120 h. Non creare un ordine per ogni fase.'},
    'RF: conferma l’approvvigionamento del ferro delle transenne': {attesa: '2.400 kg nella zona di produzione PSA-L1; F-02 conserva 400 kg COL-1204 e 500 kg COL-1206. In magazzino risultano ancora 3.300 kg: il ferro si è solo spostato, non è ancora consumato.'},
    '261: consuma 2.400 kg sullo stesso ordine': {attesa: 'Movimento 261: 2.400 kg di ferro escono dal magazzino e vanno sull’ordine 1000001. La zona PSA è vuota. Nessun semilavorato a magazzino.', vedi: ['PSA-L1 vuota', 'Ferro in magazzino: 900 kg']},
    'CO11N: Taglio 75 ore, WIP 4.380': {titolo: 'CO11N: dichiara 75 ore di Taglio', attesa: 'Fase Taglio dichiarata: 300 pezzi, 75 ore. Nessun carico a magazzino e nessun pallet da mettere a scaffale: la lavorazione resta sull’ordine.', vedi: ['Fase Taglio completata sull’ordine 1000001', 'Nessun compito RF nuovo']},
    'CO11N: Piegatura 60 ore, WIP 6.060': {titolo: 'CO11N: dichiara 60 ore di Piegatura', attesa: 'Fase Piegatura dichiarata sullo stesso ordine 1000001: 300 pezzi, 60 ore. Nessun ordine nuovo e nessuna entrata intermedia.', vedi: ['Fase Piegatura completata']},
    'CO11N: Saldatura 120 ore, WIP 9.420': {titolo: 'CO11N: dichiara 120 ore di Saldatura', attesa: 'Fase Saldatura dichiarata: le tre fasi sono complete. Le transenne non sono ancora entrate in magazzino: lo fai al passo dopo.', vedi: ['Tre fasi su tre completate']},
    '101: carica a magazzino le 300 transenne': {attesa: 'Movimento 101: 300 TR-STD finite entrano in magazzino, 6 pallet da 50 nella zona di arrivo GR-ZONE. Beta e Delta ora sono confermati per intero. Prima che le tre fasi siano completate il programma rifiuta il 101.', vedi: ['6 pallet da 50 TR-STD in GR-ZONE', '6 compiti PUTAWAY aperti']},
    'RF: metti a scaffale i 6 pallet di transenne': {attesa: '300 TR-STD a scaffale.'},
    'CO01: ordine autonomo per 20 kit SL-TAGLIO': {attesa: 'Ordine 1000002: 160 kg di ferro e 5 ore di Taglio. È una produzione a scorta, separata: non è una fase dell’ordine delle transenne.'},
    '261: consuma 160 kg per il HALB': {titolo: '261: consuma 160 kg di ferro per i kit', attesa: 'Movimento 261: 160 kg sull’ordine 1000002. In totale i due ordini consumano 2.560 kg; restano 740 kg di ferro.'},
    '101: versa a magazzino i 20 kit autonomi': {attesa: 'Movimento 101: 20 SL-TAGLIO entrano a magazzino in un cassone nella zona GR-ZONE, con un solo compito PUTAWAY.', vedi: ['Un cassone da 20 kit in GR-ZONE', 'Un compito PUTAWAY aperto']},
    'Dove si trova? Cerca il ferro': {attesa: '740 kg liberi da prelevare = 740 kg nelle ubicazioni = 740 kg in giacenza: 240 kg COL-1204 e 500 kg COL-1206, tutti in F-02. 0 bloccati.'},
    'Controlla WIP e stock: due concetti distinti': {
      titolo: 'Controlla le scorte: che cosa c’è in magazzino?',
      percorso: 'WMS → Monitor; PP → Ordini di produzione',
      campi: [['Ferro', '740 kg a scaffale in F-02'], ['Kit SL-TAGLIO', '20 nel cassone in 03-05-2'], ['Transenne TR-STD', '300 a scaffale'], ['Ordini di produzione', '1000001 e 1000002 completati: niente più in lavorazione']],
      attesa: 'Le quantità del gestionale (IM) e quelle delle ubicazioni (WMS) coincidono: 740 kg ferro, 20 kit, 300 transenne. Nessun compito aperto.',
      nota: 'Lettura: spunta a mano. Quello che è ancora in lavorazione su un ordine NON è a scaffale: si vede solo sull’ordine.',
      grande: 'CONTROLLA CHE I CONTI DELLA MERCE TORNINO. Quanto dice il gestionale deve essere uguale a quanto c’è negli scaffali.',
      fai: [APRI, R('WMS → Monitor, riquadro «Quadratura IM / WMS»', 'Leggi le righe di FERRO, SL-TAGLIO e TR-STD'), R('Stessa pagina', 'Controlla che non ci siano compiti aperti'), FATTO],
      vedi: ['FERRO 740 kg · SL-TAGLIO 20 · TR-STD 300', 'IM = WMS su tutte le righe']
    },
    'Partenza: uscita merci 601 e DDT': {attesa: 'Movimento 601 per le due consegne: le 300 transenne escono dal magazzino. Nascono i due DDT (Beta e Delta). Giacenza TR-STD: 0.', vedi: ['Trasporto partito, 7 colli su 7', 'Due DDT pronti da stampare', 'TR-STD in magazzino: 0']},
    'LI11N: registra alla scrivania la conta del cassone (manca un kit)': {attesa: 'Differenza −1 SL-TAGLIO: supera la tolleranza, quindi il documento va in «riconta». Il secondo conteggio deve confermarla.'},
    'LI20: chiudi l’inventario nel WMS': {attesa: '03-05-2 ora riporta 19 pezzi; il pezzo mancante va nella zona differenze 999. Le ubicazioni si sbloccano.'},
    'LI21: registra la differenza in contabilità': {
      titolo: 'LI21: allinea la giacenza del gestionale (movimento 711)',
      attesa: 'Movimento 711: il kit mancante esce anche dalla giacenza del gestionale. Ora gestionale e scaffali dicono la stessa cosa: 19 kit.',
      nota: 'Il WMS sa dove manca il pezzo; con il 711 lo sa anche il gestionale. Senza questo passo IM e WMS non quadrano.',
      grande: 'ALLINEA IL GESTIONALE ALLA CONTA. La conta ha trovato 19 kit invece di 20: con il movimento 711 anche il gestionale scende a 19.',
      vedi: ['SL-TAGLIO: 19 nel gestionale e 19 nelle ubicazioni', 'Zona differenze 999 vuota']
    },
    'Entrata 101 al deposito: i kit sono arrivati': {g: '11 · Gennaio: i kit arrivano al deposito'}
  };

  var per = {};
  E.passi.forEach(function (p) { per[p.titolo] = p; });
  var mancanti = TENGO.filter(function (t) { return !per[t]; });
  if (mancanti.length && window.console) console.warn('Dicembre in magazzino: passi non trovati', mancanti);

  var passi = TENGO.filter(function (t) { return per[t]; }).map(function (t) {
    var p = Object.assign({}, per[t]), n = NUOVO[t] || {};
    p.g = n.g || GRUPPI[p.g] || p.g;
    p.contabile = false;
    p.attesa = n.attesa || pulisci(p.attesa);
    p.nota = n.nota || pulisci(p.nota);
    if (p.campi) p.campi = p.campi.filter(function (c) { return !CONTABILE.test(c[0] + ' ' + c[1]); });
    if (p.fai) p.fai = pulisciFai(p.fai);
    if (p.vedi) p.vedi = p.vedi.map(pulisci).filter(Boolean);
    if (p.grande) p.grande = pulisci(p.grande) || p.grande.split('.')[0] + '.';
    if (p.perche) p.perche = pulisci(p.perche);
    if (p.punti) p.punti = pulisciPunti(p.punti);
    ['titolo', 'percorso', 'campi', 'nota', 'grande', 'fai', 'vedi', 'punti'].forEach(function (k) { if (n[k]) p[k] = n[k]; });
    if (n.fai && !n.punti) delete p.punti;   // le istruzioni nuove sostituiscono i micro-passi della versione con ragioneria
    if (!p.nota) delete p.nota;
    if (!p.vedi || !p.vedi.length) p.vedi = p.attesa ? [p.attesa] : p.vedi;
    return p;
  });

  // ── Pistoia 80 ore, alla fine: la ragioneria di tutta l'esercitazione, operazione per operazione (sola lettura) ──
  var GR = '12 · La ragioneria del tuo magazzino: il libro giornale spiegato';
  var gm = function (fase) { return {ep: 'erp_magazzino.giornale'}; };
  var leggi = function (fase, cosa) {
    return [R('Qui nel pannello, in alto', 'Premi il pulsante blu «Apri ➜»'),
      R('In alto nella pagina, fra i bottoni delle fasi', fase ? 'Premi «' + fase + '»' : 'Premi «Tutte»'),
      R('Ogni riquadro bianco', cosa),
      R('Sotto ogni scrittura, il riquadro verde «💡 Perché»', 'Leggilo: spiega la scrittura con le tue operazioni'),
      R('Qui nel pannello, in basso', 'Premi «✓ Fatto»')];
  };
  var RAGIONERIA = [
    {titolo: 'Il libro giornale: che cos’è e come si legge', fase: '',
     grande: 'ADESSO GUARDIAMO LA RAGIONERIA DI TUTTO QUELLO CHE HAI FATTO. Mentre lavoravi, il programma ha scritto da solo il LIBRO GIORNALE: ogni volta che la merce cambia valore per l’azienda nasce una scrittura. Non devi scrivere niente: leggi e capisci.',
     campi: [['Scrittura', 'una riga del libro giornale: data, operazione, conti e importi'], ['Dare (a sinistra)', 'dove va il valore: per esempio il magazzino che aumenta, o un costo'], ['Avere (a destra)', 'da dove viene: per esempio il magazzino che diminuisce, o un debito'], ['Partita doppia', 'totale Dare = totale Avere, SEMPRE'], ['Le tue scritture', '15: guarda in alto il numero e i due totali uguali']],
     vedi: ['15 scritture nel libro giornale', 'Totale Dare = totale Avere: ✅ uguali'],
     nota: 'Lettura: spunta con «Fatto». Nei passi seguenti guardi le scritture una fase alla volta.'},
    {titolo: 'Ragioneria · la nascita dell’azienda (1 scrittura)', fase: '🏛️ La nascita dell’azienda',
     grande: 'LA PRIMA SCRITTURA: NASCE L’AZIENDA. I soci promettono 80.000 € di capitale.',
     campi: [['01/12 · Costituzione', 'Dare 08 Crediti verso soci 80.000 · Avere 30 Capitale 80.000']],
     vedi: ['Dare 08 = Avere 30 = 80.000'], nota: 'Non è un’operazione di magazzino: è il punto di partenza di tutti i conti. Spunta con «Fatto».'},
    {titolo: 'Ragioneria · gli acquisti del ferro (2 scritture)', fase: '🚛 Gli acquisti',
     grande: 'IL FERRO ENTRA IN MAGAZZINO E VALE 0,95 €/KG (IL COSTO STANDARD). Il fornitore lo vende a 1,00 e poi a 1,08: la differenza va in un conto a parte.',
     campi: [['04/12 · MIGO 101, 3.000 kg', 'Dare 12 Magazzino ferro 2.850 + Dare 63 Differenze prezzo 150 · Avere 22 Fatture da ricevere 3.000'], ['06/12 · MIGO 101, 500 kg', 'Dare 12 475 + Dare 63 65 · Avere 22 540'], ['Conto 22', 'il debito verso il fornitore al prezzo dell’ordine: la fattura la registra l’amministrazione']],
     vedi: ['Due scritture di entrata merci', 'Il magazzino ferro sale di 3.325 (3.500 kg × 0,95)'], nota: 'Anche i 200 kg schiacciati sono entrati: erano nostri, solo bloccati. Spunta con «Fatto».'},
    {titolo: 'Ragioneria · il ferro schiacciato (1 scrittura)', fase: '🗑️ Il ferro schiacciato',
     grande: 'IL FERRO BUTTATO ESCE DAL MAGAZZINO E DIVENTA UNA PERDITA.',
     campi: [['05/12 · Movimento 555, 200 kg', 'Dare 69 Rottamazioni 190 · Avere 12 Magazzino ferro 190 (200 × 0,95)']],
     vedi: ['Il magazzino ferro scende di 190', 'Il costo 69 sale di 190'], nota: 'Mettere in quarantena NON scriveva niente; buttare sì. Spunta con «Fatto».'},
    {titolo: 'Ragioneria · la produzione (8 scritture)', fase: '🏭 La produzione',
     grande: 'LA PRODUZIONE IN TRE MOSSE: IL FERRO SI CONSUMA (261), I REPARTI DICHIARANO LE ORE (CO11N), IL PRODOTTO FINITO ENTRA IN MAGAZZINO (101).',
     campi: [['07/12 · 261, 2.400 kg', 'Dare 70 Consumi 2.280 · Avere 12 Magazzino ferro 2.280'], ['07-09-11/12 · CO11N Taglio, Piegatura, Saldatura', 'Dare 72 / Avere 75: 2.100 + 1.680 + 3.360 (ore × 28 €/h)'], ['12/12 · 101, 300 transenne', 'Dare 13 Prodotti finiti 9.420 · Avere 73 Output di produzione 9.420 (300 × 31,40)'], ['12/12 · i 20 kit', '261 ferro 152 · CO11N 5 ore 140 · 101 Dare 07 Semilavorati 292 / Avere 73 292']],
     vedi: ['Costo delle transenne: ferro 2.280 + ore 7.140 = 9.420 = 300 × 31,40', 'Portare il ferro alla linea con la pistola NON scriveva niente'],
     nota: 'Le ore sono contabilità industriale: dicono quanto costa davvero fare una transenna. Spunta con «Fatto».'},
    {titolo: 'Ragioneria · la spedizione (2 scritture)', fase: '🚚 La spedizione',
     grande: 'IL CAMION PARTE: IL MAGAZZINO SCENDE E NASCE IL COSTO DEL VENDUTO.',
     campi: [['15/12 · 601 Beta, 180 pz', 'Dare 41 Costo del venduto 5.652 · Avere 13 Prodotti finiti 5.652'], ['15/12 · 601 Delta, 120 pz', 'Dare 41 3.768 · Avere 13 3.768'], ['Il ricavo', 'nasce con la fattura di vendita, che fa l’amministrazione: non è nel lavoro del magazzino']],
     vedi: ['Prodotti finiti (conto 13) tornano a zero', 'Costo del venduto 9.420'], nota: 'Prelievo, imballo, SSCC e carico del camion NON scrivevano niente: scrive solo l’uscita 601. Spunta con «Fatto».'},
    {titolo: 'Ragioneria · l’inventario (1 scrittura)', fase: '📝 L’inventario',
     grande: 'ALLA CONTA MANCAVA UN KIT: CON IL 711 IL SUO VALORE ESCE DAL MAGAZZINO.',
     campi: [['31/12 · 711, 1 SL-TAGLIO', 'Dare 65 Differenze inventariali 14,60 · Avere 07 Semilavorati 14,60']],
     vedi: ['Il magazzino semilavorati scende di 14,60'], nota: 'Contare non scrive niente: scrive solo la differenza trovata. Spunta con «Fatto».'},
    {titolo: 'Ragioneria · che cosa NON scrive e i saldi finali', fase: '📊 Saldi finali',
     grande: 'IL MAGAZZINO IN EURO: QUELLO CHE CONTI NEGLI SCAFFALI È QUELLO CHE DICE LA CONTABILITÀ.',
     campi: [['Ferro (conto 12)', '740 kg × 0,95 = 703'], ['Kit (conto 07)', '19 × 14,60 = 277,40'], ['Transenne (conto 13)', '0'], ['Rimanenze di magazzino', '980,40'], ['Non scrivono niente', 'ordini, pistola RF, quarantena 344/343, trasferimenti, deposito esterno 351/101, imballo e SSCC']],
     vedi: ['Rimanenze di magazzino 980,40 €', 'Magazzino e contabilità dicono la stessa cosa'],
     nota: 'Premi anche «🚫 Che cosa NON scrive» e leggi l’elenco. Regola: scrive quello che cambia il valore; non scrive quello che sposta soltanto la merce. Spunta con «Fatto».'}
  ].map(function (x) {
    return {g: GR, titolo: x.titolo, dove: gm(x.fase), percorso: 'WMS → La ragioneria del magazzino: il libro giornale spiegato' + (x.fase ? ' → «' + x.fase + '»' : ''),
      campi: x.campi, attesa: x.vedi.join(' · '), nota: x.nota, grande: x.grande,
      fai: leggi(x.fase, x.fase === '📊 Saldi finali' ? 'Leggi la tabella dei saldi e il riquadro verde delle rimanenze' : 'Leggi la data, l’operazione e le righe Dare e Avere'),
      vedi: x.vedi, ragioneria: true};
  });
  passi = passi.concat(RAGIONERIA);

  passi.push(
    {g: '13 · Verifica e consegna', titolo: 'Verifica finale del magazzino', dove: {ep: 'erp_magazzino.monitor'}, percorso: 'WMS → Monitor; WMS → Mappa; MM → Scorte per luogo',
     campi: [['Ferro', '740 kg in F-02 (240 kg COL-1204 + 500 kg COL-1206)'], ['Kit SL-TAGLIO', '19: 9 in W100 (03-05-2) + 10 al deposito esterno D200'], ['Transenne TR-STD', '0: tutte spedite a Beta (180) e Delta (120)'], ['Colli spediti', '7 con SSCC'], ['Compiti RF aperti', '0'], ['Quadratura', 'IM = WMS su tutte le righe']],
     attesa: 'Tutto torna: quantità del gestionale = quantità nelle ubicazioni, nessun compito aperto, nessuna merce in quarantena.',
     nota: 'Lettura: spunta a mano dopo il controllo.',
     grande: 'CONTROLLA CHE TUTTO TORNI PRIMA DI CONSEGNARE.',
     fai: [APRI, R('WMS → Monitor', 'Leggi la quadratura IM / WMS e i compiti aperti'), R('WMS → Mappa', 'Cerca FERRO e SL-TAGLIO con «🔎 Dove si trova?»'), FATTO],
     vedi: ['FERRO 740 · SL-TAGLIO 19 (9 + 10 al deposito) · TR-STD 0', '0 compiti aperti · IM = WMS']},
    {g: '13 · Verifica e consegna', titolo: 'Consegna il lavoro al docente', dove: {ep: 'allievo.consegna'}, percorso: 'La mia area → Consegna il lavoro',
     campi: [['Lavoro', 'Sistema integrato'], ['Esercizio', 'Dicembre in magazzino (Pistoia 80 ore)'], ['Nota', 'Spiega perché i 200 kg schiacciati non sono mai andati a scaffale e quale scrittura del libro giornale è nata quando li hai buttati']],
     grande: 'CONSEGNA IL LAVORO. Il docente vede che cosa hai fatto, quanto tempo hai lavorato e i numeri di controllo.',
     fai: [APRI, R('Menu «Esercizio»', 'Scegli «Dicembre in magazzino … Pistoia 80 ore»'), R('Casella «Nota»', 'Scrivi la tua spiegazione'), R('Sotto', 'Premi «Consegna»')],
     vedi: ['Consegna registrata con i numeri di controllo del magazzino']}
  );

  // la mappa del giro della merce: stessi riquadri, senza fatture e senza contabilità
  (E.tappeMagazzino || []).forEach(function (t) {
    if (t.nome === 'Compra e ricevi il ferro') t.serve = 'Ordini il ferro, lo ricevi, lo metti a scaffale con la pistola e scarti quello rotto.';
    if (t.nome === 'Inventario di fine anno') { t.serve = 'Conti quello che c’è davvero, trovi la differenza, allinei il gestionale e mandi 10 kit al deposito esterno.'; t.porta = 'Un magazzino in cui gestionale e scaffali dicono la stessa cosa.'; }
  });

  window.MSA_ESERCIZIO = {codice: 'dicembre-magazzino', titolo: 'Dicembre in magazzino: vendite, acquisti, produzione e WMS (alla fine il libro giornale spiegato)',
    versione: 'erp-ft', pannelloAutomatico: true, verificaRagioneria: false, soloMagazzino: true,
    tappeMagazzino: E.tappeMagazzino, mancanti: mancanti, passi: passi};
})();
