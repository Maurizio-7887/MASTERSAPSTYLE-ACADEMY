/* Ripresa dopo una pausa: le letture già superate non riportano l'allievo indietro (caso Antonella: dal passo 27 al 5).
   Run: node tests/guida_ripresa_letture.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const js = fs.readFileSync(path.join(__dirname, '../app/blueprints/guida/static/pannello.js'), 'utf8');
const start = js.indexOf('  function esiti() {');
const end = js.indexOf('  function segnaAMano(', start);
assert(start >= 0 && end > start);
const esiti = js.slice(start, end);
function run(passi, fatti, salvati) {
  return new Function('passi', 'fatti', 'salvati', `
    var PASSI = passi.map(function (p, i) { return p === 'L' ? {titolo: 'p' + i} : {titolo: 'p' + i, fatto: function () { return fatti.indexOf(i) >= 0; }}; });
    var C = {progress_notes: {}, progress_steps: salvati}, guidata = true, E = {codice: 'dicembre-wms'};
    function stato() { return {}; } function aiutanti() { return {}; } function manuali() { return {}; }
    ${esiti}
    return esiti();
  `)(passi, fatti, salvati);
}
// passi: A = operazione verificata sui dati, L = lettura da confermare con «Fatto»
const passi = ['A', 'A', 'A', 'L', 'L', 'L', 'A', 'A', 'L', 'A'];
// lo stato del browser ha perso le spunte delle letture, ma le operazioni 1-3 e 7-8 ci sono
let r = run(passi, [0, 1, 2, 6, 7], {});
assert.deepEqual(r.slice(0, 8), ['auto', 'auto', 'auto', 'mano', 'mano', 'mano', 'auto', 'auto'], 'letture prima di un\'operazione fatta');
assert.equal(r[8], '', 'la lettura dopo l\'ultima operazione resta da confermare');
assert.equal(r[9], '', 'le operazioni non fatte restano da fare');
// la spunta salvata sul server vale anche senza operazioni successive
r = run(passi, [0, 1, 2], {p3: 'mano'});
assert.equal(r[3], 'mano'); assert.equal(r[4], '');
// un'operazione mai registrata non viene mai spuntata d'ufficio
r = run(passi, [0, 6], {});
assert.equal(r[1], ''); assert.equal(r[2], '');
console.log('OK: ripresa senza tornare indietro sulle letture già superate; operazioni sempre verificate.');
