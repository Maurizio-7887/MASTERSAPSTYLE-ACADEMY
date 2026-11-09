/* KP06 (caso Paulina): dopo aver salvato 4210 e scelto 4220 il tutor non deve richiedere di nuovo 4210.
   Run: node tests/guida_cpm_gruppi.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const js = fs.readFileSync(path.join(__dirname, '../app/blueprints/guida/static/pannello.js'), 'utf8');
const a = js.indexOf('  function segnaGruppiSalvati(');
const b = js.indexOf('  function tickPunti(', a);
const f = new Function(js.slice(a, b) + '; return segnaGruppiSalvati;')();
const P = (t, fatto) => ({d: {t}, fatto});
// scelta 4210, casella, salva(ok) | scelta 4220 (ora c'è 4220), casella, salva(no) | scelta 4230 ...
let e = f([P('scelta', false), P('campo', false), P('pulsante', true), P('scelta', true), P('campo', false), P('pulsante', false), P('scelta', false), P('leggi', false)]);
const primo = e.findIndex(x => !x.fatto);
assert.equal(primo, 4, 'il prossimo punto è la casella di 4220, non di nuovo «scegli 4210»');
e = f([P('scelta', false), P('pulsante', false), P('leggi', false)]);
assert.equal(e[0].fatto, false, 'senza salvataggio verificato la scelta resta da fare');
assert(js.includes('if (p.cpmVerificato) segnaGruppiSalvati(elenco);'));
console.log('OK: i punti di un centro già salvato restano fatti, niente avanti e indietro tra 4210 e 4220.');
