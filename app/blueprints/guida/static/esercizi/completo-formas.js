/* Testo didattico composto: nessuna inizializzazione, importazione o modifica dei documenti. */
(function () {
  'use strict';
  var E = window.MSA_ESERCIZIO;
  if (!E || !window.MSA_MAGAZZINO_FORMAS || !window.MSA_LABORATORI_COMPLETI || !window.MSA_USO_PROGRAMMA) return;
  var premessa = {
    id:'completo-sicurezza',g:'Come usare il percorso completo',titolo:'Tre percorsi, salvataggi separati e prove documentate',
    dove:{ep:'erp_dati.avvio'},percorso:'Launchpad → Esercitazione completa',
    campi:[['A · Caso principale','Costituzione → transenna con tre dichiarazioni e WIP → HALB autonomo → spedizioni → contabilità → chiusura e riapertura. Conserva questi risultati.'],['B · Magazzino FORMAS','UF 8, 9, 10 e 11: approfondimenti e prove dedicate. Esegui le operazioni alternative solo nello spazio di prova indicato.'],['C · Laboratori dei comandi','Account didattici separati dal caso principale. Il docente prepara gli accessi; cambiare guida o computer NON separa i dati.'],['Regola di sicurezza','Non usare Azzera, Carica situazione, Ripristina o un preset sul caso da consegnare. Prima consegna il caso principale e conserva le evidenze; le prove distruttive sono solo per account vuoti sacrificabili.'],['Evidenze','Per ogni fase conserva numero documento, data, quantità, valore e risposta motivata. Una spunta manuale attesta la tua dichiarazione, non un collaudo automatico.']],
    attesa:'Distinguere avanzamento di produzione, movimento fisico, movimento contabile e valorizzazione. Nessun collegamento con magazzini, hardware, SdI, banche o automazioni reali.',
    nota:'Il PDF FORMAS è un calendario con titoli UF, non il programma analitico. I dettagli degli esercizi sono una proposta didattica verificata sul codice Academy. Non è SAP e non è una procedura fiscale o professionale certificata.'
  };
  var storico = E === window.MSA_ESERCIZIO_DICEMBRE_LEGACY;
  var base = E.passi.slice();
  if (storico) {
    base = [{id:'completo-storico',g:'Lavoro storico da conservare',titolo:'Questo salvataggio usa la produzione storica: non convertirlo',dove:{ep:'erp_dati.avvio'},percorso:'Launchpad → Dicembre: dalla costituzione alla riapertura',campi:[['Lavoro precedente','Torna alla guida Dicembre per continuarlo senza modifiche.'],['Nuovo percorso','Per il caso WIP richiedi al docente un account didattico separato e vuoto. Non azzerare o reimportare il lavoro storico.']],nota:'La guida completa non riscrive i vecchi ordini e non applica loro il nuovo modello WIP.'}];
  } else if (base[0]) {
    base[0] = Object.assign({},base[0],{
      campi:[['Ambiente','Sistema integrato, account dedicato al caso principale e privo di documenti precedenti.'],['Se trovi lavoro esistente','Fermati e chiedi al docente un account separato. Non usare Azzera per liberare il tuo lavoro.'],['Durata','Percorso esteso su più lezioni. Il caso principale e i laboratori non sono una singola prova da 5–6 ore.']],
      nota:'Cambiare guida non separa gli archivi: stesso account = stesso sistema integrato. Preserva i documenti e le consegne precedenti.'
    });
  }
  window.MSA_ESERCIZIO = Object.assign({}, E, {
    codice:'completo-formas',titolo:'Esercitazione completa — azienda, magazzino e innovazione',
    passi:[premessa].concat(base,window.MSA_MAGAZZINO_FORMAS.passi,window.MSA_LABORATORI_COMPLETI.passi,window.MSA_USO_PROGRAMMA.passi),
    casoStorico:storico
  });
})();
