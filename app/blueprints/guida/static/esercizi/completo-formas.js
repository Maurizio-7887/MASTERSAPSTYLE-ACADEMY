/* Testo didattico composto: nessuna inizializzazione, importazione o modifica dei documenti. */
(function () {
  'use strict';
  var E = window.MSA_ESERCIZIO;
  if (!E || !window.MSA_MAGAZZINO_FORMAS || !window.MSA_LABORATORI_COMPLETI || !window.MSA_USO_PROGRAMMA) return;
  var premessa = {
    id:'completo-sicurezza',g:'Come usare il percorso completo',titolo:'Tre percorsi, salvataggi separati e prove documentate',
    dove:{ep:'erp_dati.avvio'},percorso:'Launchpad → Esercitazione completa',
    campi:[['A · Preparazione azienda','Azienda vuota → costituzione e capitale → configurazione WMS → acquisto/entrata in funzione beni strumentali → budget annuo, quattro centri, distinta/ciclo e costo standard. Non è ancora il ciclo operativo commerciale.'],['A · Ciclo operativo','Ordini cliente → fabbisogni → ordini di acquisto → ricevimento e fattura → 300 transenne sullo stesso ordine con tre dichiarazioni e WIP → 20 kit HALB autonomi a scorta → consegna e fattura cliente → contabilità, chiusura e riapertura. Conserva questi risultati.'],['B · Magazzino FORMAS','UF 8, 9, 10 e 11: approfondimenti e prove dedicate. Esegui le operazioni alternative solo nello spazio di prova indicato.'],['C · Laboratori dei comandi','Account didattici separati dal caso principale. Il docente prepara gli accessi; cambiare guida o computer NON separa i dati. Nuova azienda nello stesso account sostituisce lo slot: non è un laboratorio separato.'],['Regola di sicurezza','Non usare Azzera, Carica situazione, Ripristina o un preset sul caso da consegnare. La ripartenza Nuova azienda, solo prima di iniziare e autorizzata dal docente, richiede backup JSON se ci sono dati. Prima dei laboratori consegna il caso principale e conserva le evidenze; prove distruttive solo in account sacrificabili.'],['Evidenze','Per ogni fase conserva numero documento, data, quantità, valore e risposta motivata. Una spunta manuale attesta la tua dichiarazione, non un collaudo automatico.']],
    attesa:'Distinguere avanzamento di produzione, movimento fisico, movimento contabile e valorizzazione. Nessun collegamento con magazzini, hardware, SdI, banche o automazioni reali.',
    nota:'Il PDF FORMAS è un calendario con titoli UF, non il programma analitico. I dettagli degli esercizi sono una proposta didattica verificata sul codice Academy. Non è SAP e non è una procedura fiscale o professionale certificata.'
  };
  var storico = E === window.MSA_ESERCIZIO_DICEMBRE_LEGACY;
  var base = E.passi.slice();
  if (storico) {
    base = [{id:'completo-storico',g:'Lavoro storico da conservare',titolo:'Questo salvataggio usa la produzione storica: non convertirlo',dove:{ep:'erp_dati.avvio'},percorso:'Launchpad → Dicembre: dalla costituzione alla riapertura',campi:[['Lavoro precedente','Torna alla guida Dicembre per continuarlo senza modifiche.'],['Nuovo percorso','Per il caso WIP richiedi al docente un account didattico separato e vuoto. Non azzerare o reimportare il lavoro storico.']],nota:'La guida completa non riscrive i vecchi ordini e non applica loro il nuovo modello WIP.'}];
  } else if (base[0]) {
    base[0] = Object.assign({},base[0],{
      campi:[['Ambiente','Sistema integrato, azienda dedicata al caso principale e priva di documenti precedenti.'],['Se trovi lavoro esistente','Solo se il docente autorizza la ripartenza: scarica e conserva il backup JSON, poi conferma NUOVA AZIENDA nella scheda di avvio. Sostituisce lo stesso slot, non separa i casi. Per conservarli entrambi operativi richiedi un account separato.'],['Prima fase','Costituisci la società e versa il capitale; attiva WMS vuoto; acquista i cinque cespiti prima di usarli; prepara budget annuo, quattro centri e standard.'],['Inizio del ciclo operativo','Sono gli ordini cliente Beta e Delta a dare avvio a fabbisogni, acquisti di ferro, produzione e consegne.'],['Durata','Percorso esteso su più lezioni. Il caso principale e i laboratori non sono una singola prova da 5–6 ore.']],
      nota:'Cambiare guida non separa gli archivi: stesso account = stesso sistema integrato. Preserva i documenti e le consegne precedenti.'
    });
  }
  window.MSA_ESERCIZIO = Object.assign({}, E, {
    codice:'completo-formas',titolo:'Esercitazione completa — azienda, magazzino e innovazione',
    passi:[premessa].concat(base,window.MSA_MAGAZZINO_FORMAS.passi,window.MSA_LABORATORI_COMPLETI.passi,window.MSA_USO_PROGRAMMA.passi),
    casoStorico:storico
  });
})();
