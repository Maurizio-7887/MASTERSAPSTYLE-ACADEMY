/* Caso Gianluca e Matteo: uno STAGING in più sull'ordine delle transenne (creato per errore al passo dei kit)
   non deve togliere la spunta ai passi 44 e 45. Run: node tests/staging_tollerante.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const ctx = {console, document: {addEventListener() {}, querySelector() { return null; }}, location: {pathname: '/vuoto/', search: ''}, setTimeout, navigator: {}};
ctx.window = ctx;
for (const f of ['dicembre-wms-legacy', 'cpm-formas', 'dicembre-wms', 'dicembre-wms-semplice'])
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../app/blueprints/guida/static/esercizi/' + f + '.js'), 'utf8'), ctx);
const P = ctx.MSA_ESERCIZIO.passi;
const passo = t => P.find(p => p.titolo.indexOf(t) === 0);
const p44 = passo('WMS: porta il ferro delle transenne'), p45 = passo('RF: conferma l’approvvigionamento del ferro delle transenne');
const ok = (n, q) => ({tipo: 'STAGING', ordine: 1000001, stato: 'confermato', qta: q, qtaEff: q});
const S = {produzione: [{materiale: 'TR-STD', numero: 1000001, data: '2026-12-07', qta: 300}],
  wm: {compiti: [ok(1, 1000), ok(2, 1000), ok(3, 400), {tipo: 'STAGING', ordine: 1000001, stato: 'aperto', qta: 160, qtaEff: 0}]}};
assert.equal(p44.fatto({S}), true, 'passo 44 resta spuntato con un compito in più');
assert.equal(p45.fatto({S}), true, 'passo 45 resta spuntato: i tre compiti sono confermati');
S.wm.compiti = [ok(1, 1000), ok(2, 1000)];
assert.equal(p45.fatto({S}), false, 'con due soli compiti confermati il passo 45 non è fatto');
console.log('OK: uno STAGING in più non toglie le spunte ai passi 44 e 45.');
