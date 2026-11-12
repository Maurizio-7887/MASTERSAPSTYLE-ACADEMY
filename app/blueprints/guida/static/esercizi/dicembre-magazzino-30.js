/* «Dicembre in magazzino · essenziale» — Firenze, Magazzino 30 ore. SEMPLICE SEMPLICE, senza ragioneria.
   Stessa azienda e stessi documenti di «Dicembre in magazzino» (Pistoia 80 ore), con i soli passi indispensabili:
   l'azienda nasce, il magazzino si accende, due clienti ordinano, si compra e si riceve il ferro (quarantena compresa),
   si produce, si preleva a ondate, si imballa con gli SSCC, si carica il camion (pistola e RFID), si spedisce
   con il DDT e a fine anno si fa l'inventario. Tolte le letture e gli approfondimenti (mappa, interroga, blocco del
   pallet, slotting, arretrato, piano di carico 3D, tracciabilità, ABC, FIFO/LIFO, scorta minima, deposito esterno, KPI).
   Si carica DOPO dicembre-magazzino.js: toglie passi per titolo, rinumera le fasi, aggiunge la verifica finale.
   Solo testi e ordine dei passi: nessuna operazione e nessuna modifica dello stato. */
(function () {
  'use strict';
  var E = window.MSA_ESERCIZIO;
  if (!E || E.codice !== 'dicembre-magazzino') return;
  var R = function (dove, fai, valore) { return {dove: dove, fai: fai, valore: valore}; };
  var TOLGO = [
    'Leggi la distinta base e il ciclo di lavoro',
    'CO09: le 300 transenne in arrivo rendono confermabili i due ordini',
    'Merce da mettere a posto: che cosa aspetta in ricevimento?',
    'Leggi la mappa delle ubicazioni',
    'Dove si trova? Cerca il ferro',
    'Stampa le etichette del cassone e dell’ubicazione',
    'Controlla le scorte: che cosa c’è in magazzino?',
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
    'Stampa la lista di prelievo',
    'Piano di carico e camion 3D: quale camion per Beta e Delta?',
    'VL06O: controlla il monitor della spedizione',
    'Reclamo simulato: da quale ferro vengono le transenne di Beta?',
    'Classificazione ABC dei materiali',
    'Valorizza la rimanenza di ferro: FIFO, LIFO e costo medio',
    'Scorta minima del ferro: è ora di riordinare?',
    'Trasferimento: 10 kit al deposito esterno D200',
    'RF: preleva i 10 kit per il deposito',
    'Uscita 351: il camion parte, i kit sono in viaggio',
    'Dove si trova? I kit sul camion a fine anno',
    'KPI di magazzino di dicembre',
    'Entrata 101 al deposito: i kit sono arrivati',
    'Verifica finale del magazzino',
    'Consegna il lavoro al docente'
  ];
  var presenti = {};
  E.passi.forEach(function (p) { presenti[p.titolo] = true; });
  var mancanti = TOLGO.filter(function (t) { return !presenti[t]; });
  var passi = E.passi.filter(function (p) { return TOLGO.indexOf(p.titolo) < 0; }).map(function (p) { return Object.assign({}, p); });

  passi.push(
    {g: 'Verifica e consegna', titolo: 'Verifica finale del magazzino (essenziale)', dove: {ep: 'erp_magazzino.monitor'}, percorso: 'WMS → Monitor; WMS → Mappa',
     campi: [['Ferro', '740 kg in F-02'], ['Kit SL-TAGLIO', '19 nel cassone in 03-05-2 (uno mancava alla conta)'], ['Transenne TR-STD', '0: tutte spedite a Beta (180) e Delta (120)'], ['Colli spediti', '7 con SSCC'], ['Compiti RF aperti', '0']],
     attesa: 'Tutto torna: quello che dice il gestionale è quello che c’è negli scaffali, nessun compito aperto.',
     nota: 'Lettura: spunta a mano dopo il controllo.',
     grande: 'CONTROLLA CHE TUTTO TORNI PRIMA DI CONSEGNARE.',
     fai: [R('Qui nel pannello, in alto', 'Premi il pulsante blu «Apri ➜»'), R('WMS → Monitor', 'Leggi la quadratura e i compiti aperti'), R('Qui nel pannello, in basso', 'Premi «✓ Fatto»')],
     vedi: ['FERRO 740 · SL-TAGLIO 19 · TR-STD 0', '0 compiti aperti · gestionale = scaffali']},
    {g: 'Verifica e consegna', titolo: 'Consegna il lavoro al docente', dove: {ep: 'allievo.consegna'}, percorso: 'La mia area → Consegna il lavoro',
     campi: [['Lavoro', 'Sistema integrato'], ['Esercizio', 'Dicembre in magazzino · essenziale (Firenze 30 ore)'], ['Nota', 'Spiega in due righe a che cosa serve l’SSCC sul collo']],
     grande: 'CONSEGNA IL LAVORO. Il docente vede che cosa hai fatto, quanto tempo hai lavorato e i numeri di controllo.',
     fai: [R('Qui nel pannello, in alto', 'Premi il pulsante blu «Apri ➜»'), R('Menu «Esercizio»', 'Scegli «Dicembre in magazzino · essenziale»'), R('Sotto', 'Premi «Consegna»')],
     vedi: ['Consegna registrata']}
  );

  // fasi rinumerate da 0, nell'ordine in cui compaiono
  var numeri = {}, n = 0;
  passi.forEach(function (p) {
    var nome = String(p.g).replace(/^\d+\s*·\s*/, '').replace(' e deposito esterno', '');
    if (!(nome in numeri)) numeri[nome] = n++;
    p.g = numeri[nome] + ' · ' + nome;
  });
  // testi che rimandavano a passi tolti
  passi.forEach(function (p) {
    if (p.titolo === 'Prima di cominciare: un sistema vuoto') {
      p.campi = (p.campi || []).map(function (c) { return [c[0], String(c[1]).replace('«Dicembre in magazzino (senza ragioneria)»', '«Dicembre in magazzino · essenziale»')]; });
      p.percorso = 'Corso Firenze 30 ore → «Apri / riprendi esercizio» → Avvio del sistema';
    }
    if (p.titolo === 'Partenza: uscita merci 601 e DDT') p.nota = 'Prima della partenza tutti e 7 i colli devono risultare caricati.';
  });

  window.MSA_ESERCIZIO = {codice: 'dicembre-magazzino-30', titolo: 'Dicembre in magazzino · essenziale (Firenze 30 ore, senza ragioneria)',
    versione: 'erp-ft', pannelloAutomatico: true, verificaRagioneria: false, soloMagazzino: true,
    tappeMagazzino: E.tappeMagazzino, mancanti: (E.mancanti || []).concat(mancanti), passi: passi};
})();
