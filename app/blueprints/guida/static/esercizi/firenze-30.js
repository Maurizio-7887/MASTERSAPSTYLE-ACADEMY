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

  // La valorizzazione FIFO, LIFO, costo medio e standard è CONTABILITÀ
  // DI MAGAZZINO, quindi RESTA in entrambi i corsi. Solo il libro giornale
  // generale e le domande Dare/Avere vengono esclusi a Firenze.
  // MIGO/MIRO/601/711 rimangono movimenti/documenti operativi.
  var esclusi = {
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

  // FIFO / LIFO / costo medio sono contabilità DEL MAGAZZINO, non esercizi
  // di libro giornale. A Firenze si leggono i valori e si ragiona sulle scorte.
  var valori = E.passi.find(function(p) {
    return p.titolo.indexOf('Valorizza la rimanenza di ferro:') === 0;
  });
  if (valori) {
    valori.campi = [
      ['Materiale', 'FERRO'],
      ['Giacenza da esaminare', '438 kg dopo ricevimento, produzione e rettifica inventario'],
      ['Costo standard', '438 kg × 0,95 €/kg = 416,10 €'],
      ['Confronto FIFO / LIFO / medio', 'Con un unico lotto al prezzo di 1,00 €/kg i tre metodi restituiscono lo stesso costo di acquisto; con prezzi differenti cambiano'],
      ['Domanda', 'Che cosa cambia se il secondo lotto costa più del primo?']
    ];
    valori.nota = 'La valorizzazione è contabilità DI MAGAZZINO e rimane obbligatoria. Non compilare Dare/Avere e non entrare nel libro giornale: qui osservi quantità, costi unitari e criteri di calcolo.';
    valori.punti = [
      {t:'leggi',nome:'1 · Apri la valorizzazione di magazzino',serve:'Dal Launchpad apri Inventario → Valorizzazione, oppure premi «Apri ➜» nel tutor. Non aprire Contabilità generale o Libro giornale.'},
      {t:'leggi',nome:'2 · Cerca il materiale FERRO',serve:'Nella tabella della valorizzazione individua FERRO. Leggi la quantità disponibile a fine simulazione: 438 kg.'},
      {t:'leggi',nome:'3 · Capisci il costo standard',serve:'Il sistema calcola 438 kg × 0,95 €/kg = 416,10 €. Questo è il valore delle scorte al costo standard: non stai eseguendo una scrittura contabile.'},
      {t:'leggi',nome:'4 · Confronta FIFO, LIFO e costo medio',serve:'Osserva le colonne FIFO, LIFO e costo medio. Con un solo prezzo di acquisto coincidono; in presenza di lotti a prezzi diversi possono cambiare. Non inventare un secondo acquisto nella tua azienda simulata.'},
      {t:'leggi',nome:'5 · Verifica e conferma',serve:'Dopo aver confrontato i valori, premi «✓ Fatto» nel tutor. Non è necessaria alcuna registrazione Dare/Avere.'}
    ];
  }

  // La prima lezione DEVE partire con quiz=no, prima di toccare Avvia.
  var avvio = E.passi.find(function(p){return p.id === 'mag5-avvio';});
  if (avvio) {
    // Un account già avviato per Pistoia, anche con lo stesso scenario,
    // NON è un avvio Firenze valido se i quiz contabili sono attivi.
    avvio.fatto = function(h) {
      return h.S.percorso === 'logistica' && h.S.quizContabile === false;
    };
    avvio.titolo = 'Firenze: avvia il percorso logistico SENZA ragioneria';
    avvio.percorso = 'Firenze · Magazzino 30 ore → Apri / riprendi esercizio → avvio logistico senza ragioneria';
    avvio.campi = [
      ['Scenario', 'Percorso logistico · Magazziniere 5.0'],
      ['Data di avvio', '04/01/2027'],
      ['Ricostruzione delle scritture', 'NO — il corso Firenze non prevede partita doppia'],
      ['Comando', 'Avvia il percorso logistico']
    ];
    avvio.nota = 'Attenzione: usa un account di prova vuoto dedicato a Firenze. Se il sistema è già avviato, NON premere Azzera e non selezionare Pistoia nello stesso account. Per la spunta iniziale deve risultare «Ricostruzione delle scritture disattivata»; altrimenti usa un nuovo account Firenze dedicato.';
    avvio.punti = [
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
      p.nota = 'Al termine consegna il lavoro operativo al docente scegliendo l’esercizio «Firenze · Innovazione digitale nel magazzino (30 ore)», poi premi ✓ Fatto. Non è richiesto il libro giornale.';
      p.dove.esercizio = 'firenze-30';
    }
  });
})();
