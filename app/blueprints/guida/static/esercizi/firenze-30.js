/* Firenze · 30 ore · Innovazione digitale nel magazzino.
   Sovrapposizione didattica al percorso operativo Magazziniere 5.0.
   Condivide SOLO il motore ERP; non modifica il codice originale Pistoia.
   Richiede un account allievo dedicato: gli stati ERP di un medesimo account
   sono condivisi fra tutte le guide integrate. */
(function () {
  'use strict';
  var E = window.MSA_ESERCIZIO;
  if (!E || E.codice !== 'magazziniere-5') return;
  E.codice = 'firenze-30';
  E.titolo = 'Firenze · Innovazione digitale nel magazzino — 30 ore';
  E.versione = 'erp-ft';
  E.pannelloAutomatico = true;
  E.verificaRagioneria = false;

  // Escludiamo SOLO due lezioni che trattano esplicitamente di contabilità.
  // Manteniamo i documenti logistici MIGO/MIRO/601/711 perché alimentano
  // scorte e flussi, ma non chiediamo mai Dare/Avere, conti o importi contabili.
  var esclusi = {
    'Valorizza la rimanenza di ferro: FIFO, LIFO, costo medio, standard': true,
    'Libro giornale: la storia contabile del magazzino': true
  };
  E.passi = E.passi.filter(function(p) { return !esclusi[p.titolo]; });

  // Ordine didattico identico al percorso funzionante per evitare di rompere
  // le dipendenze fra ordini, ricevimento, produzione, picking e spedizione.
  E.passi.forEach(function(p) {
    p.contabile = false;
    // La scrittura tecnica rimane nel libro giornale del motore; non è
    // mostrata né valutata nel tutor di Firenze.
    if (p.attesa && /\b[Dd] \d{1,2}\b|\b[Aa] \d{1,2}\b/.test(p.attesa)) {
      p.attesa = 'Verifica il documento logistico, lo stato delle merci e il messaggio di conferma della schermata. Non è richiesto alcun esercizio di partita doppia.';
    }
    p.grande = 'INNOVAZIONE DIGITALE: ' + p.titolo +
      '. Concentrati sui documenti operativi, sui flussi fisici e sui dati di magazzino. Non devi compilare scritture Dare/Avere.';
    p.punti = (p.punti || []).filter(function(d) {
      return !/Dare\/Avere|ricostruisci Dare|ricostruzione contabile|libro giornale|scrittura di apertura/i.test(String(d.serve || '') + ' ' + String(d.nome || ''));
    });
    if (p.nota && /\b[Dd] \d{1,2}\b|\b[Aa] \d{1,2}\b/.test(p.nota)) {
      p.nota = 'Osserva l’effetto operativo della transazione sul magazzino, non la contabilità.';
    }
    // Nessun puntatore di tutor vuoto, neppure per la prima apertura.
    if (!p.punti.length) p.punti = [{t:'leggi',nome:'Verifica il movimento operativo',
      serve:'Apri ➜, completa la transazione sul gestionale e controlla il documento o la giacenza. La spunta si attiva dopo il salvataggio reale.'}];
    p.g = p.g.replace(/^UF 8 · /, 'Processi · ').replace(/^UF 9 · /, 'Inventario · ')
      .replace(/^UF 10 · /, 'WMS · ').replace(/^UF 11 · /, 'Innovazione · ');
  });

  // La prima lezione DEVE partire con quiz=no, prima di toccare Avvia.
  var avvio = E.passi.find(function(p){return p.id === 'mag5-avvio';});
  if (avvio) {
    avvio.titolo = 'Firenze: avvia il percorso logistico SENZA ragioneria';
    avvio.campi = [
      ['Scenario', 'Percorso logistico · Magazziniere 5.0'],
      ['Data di avvio', '04/01/2027'],
      ['Ricostruzione delle scritture', 'NO — il corso Firenze non prevede partita doppia'],
      ['Comando', 'Avvia il percorso logistico']
    ];
    avvio.nota = 'Attenzione: usa un account di prova vuoto dedicato a Firenze. Se il sistema è già avviato, NON premere Azzera e non selezionare Pistoia nello stesso account.';
    avvio.punti = [
      {t:'leggi',nome:'Apri Avvio del sistema',
        serve:'Dal Launchpad scegli «Innovazione Magazzino · Firenze 30h», poi «Avvio e dati di base». Cerca la scheda «Percorso logistico · Magazziniere 5.0». Non selezionare la costituzione aziendale.'},
      {t:'campo',sel:'#lg-data',nome:'Data dello scenario',valore:'2027-01-04',
        serve:'Inserisci 04/01/2027: data della simulazione, non la data reale del corso.'},
      {t:'scelta',sel:'#lg-quiz',nome:'Ragioneria disattivata',valore:'no',
        serve:'Il corso Firenze lavora solo su vendite, acquisti, produzione e WMS. Deve risultare «NO», altrimenti il gestionale aprirebbe quiz contabili.'},
      {t:'pulsante',sel:'[data-prefisso="lg"] [data-azione="lg"]',
        nome:'Avvia il percorso logistico',serve:'Premi una sola volta. Il sistema prepara l’azienda con gli articoli già a scaffale, senza quiz Dare/Avere.'},
      {t:'leggi',nome:'Controlla che il sistema sia pronto',
        serve:'Cerca 200 TR-STD, 200 TR-ALTA, 300 TR-PED e ferro 0. Il sistema deve indicare «Ricostruzione delle scritture disattivata». La spunta arriva dal salvataggio reale.'}
    ];
  }
  // Ogni attività successiva usa gli stessi dati, la stessa verifica di
  // documento e lo stesso WMS: nessuna simulazione "finta" di spunta.
  E.passi.forEach(function(p) {
    if (!p.fatto && p.titolo.indexOf('Consegna l’esercitazione') === 0) {
      p.nota = 'Al termine consegna il lavoro operativo al docente e premi ✓ Fatto. Non è richiesto il libro giornale.';
    }
  });
})();
