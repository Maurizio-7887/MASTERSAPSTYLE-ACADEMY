// Regressione del passo 60: lettura della mappa, clic su «Fatto» e sblocco del passo 61.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const key = 'dicembre-wms-passo60-regression';
const dom = new JSDOM('<!doctype html><body></body>', {
  url: 'https://sim.local/vuoto/',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const w = dom.window;
try {
  w.localStorage.setItem(key, JSON.stringify({}));
  w.MSA_GUIDA = { esercizio: 'dicembre-wms', chiave: key, versione: 'vuoto', url: {} };

  w.eval(read('app/blueprints/guida/static/esercizi/dicembre-wms.js'));
  w.eval(read('app/blueprints/guida/static/esercizi/dicembre-wms-semplice.js'));

  const all = w.MSA_ESERCIZIO.passi;
  const originalIndex = all.findIndex(p => p.titolo === 'Leggi la mappa delle ubicazioni');
  assert.equal(originalIndex, 59, 'il controllo deve riguardare proprio il passo 60');
  const step60 = all[originalIndex];
  const step61 = all[originalIndex + 1];
  assert.equal(step61.titolo, 'Dove si trova? Cerca il ferro', 'il passo successivo deve essere il 61');

  // Isola i due passi reali per provare il blocco/sblocco senza simulare i 59 esercizi precedenti.
  w.MSA_ESERCIZIO.passi = [step60, step61];
  w.eval(read('app/blueprints/guida/static/pannello.js'));
  const api = w.MSA_GUIDA_API;
  assert.ok(api, 'API del pannello guida caricata');
  api.apri(true);

  const testo = w.document.querySelector('.msa-g-corpo').textContent;
  assert.match(testo, /codice UdC e dello scaffale indicati/i, 'il passo 60 spiega quali dati annotare');
  assert.match(testo, /non usare un’ubicazione presunta/i, 'il passo 60 vieta di inventare lo scaffale');

  // Ogni lettura viene confermata con il relativo pulsante del suggeritore.
  let letture = 0;
  while (w.document.querySelector('.msa-g-corpo .msa-g-letto')) {
    w.document.querySelector('.msa-g-corpo .msa-g-letto').click();
    letture++;
    assert.ok(letture <= 5, 'il suggeritore deve avanzare senza loop');
  }
  assert.equal(letture, 3, 'le tre letture della mappa richiedono tre conferme distinte');

  // Clic effettivo su «✓ Fatto» del passo: deve persistere nello stato del simulatore.
  const fatto = w.document.querySelector('.msa-g-corpo .msa-g-mano');
  assert.ok(fatto, 'il pulsante «✓ Fatto» del passo è visibile dopo le letture');
  fatto.click();

  const salvato = JSON.parse(w.localStorage.getItem(key));
  assert.equal(salvato.msaGuida.dicembre-wms, undefined, 'la chiave del percorso non deve essere alterata');
  assert.equal(salvato.msaGuida['dicembre-wms']['Leggi la mappa delle ubicazioni'], 1,
    'il clic su «Fatto» viene salvato nel progresso della guida');
  assert.equal(api.stati()[0], 'mano', 'il passo 60 risulta completato manualmente');

  assert.equal(api.vaiA(1, true), true, 'il tutor consente di avanzare dopo la conferma');
  assert.equal(api.passo(), 1, 'il tutor si posiziona sul passo 61');
  assert.match(w.document.querySelector('.msa-g-corpo').textContent, /Dove si trova\? Cerca il ferro/,
    'il passo 61 viene mostrato dopo il clic');

  console.log('✓ passo 60 WMS: 3 letture confermate, clic «Fatto» salvato e passo 61 sbloccato');
} finally {
  w.close();
}
