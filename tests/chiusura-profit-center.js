// L06: prima della chiusura, i ricavi CO-PA dell'anno non possono restare «NON-ASSEGNATO»
// se l'azienda ha iniziato ad assegnare i materiali ai centri di profitto.
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..');
const sorgente = fs.readFileSync(path.join(__dirname, 'esercizio-dicembre-wms.js'), 'utf8');
const LOGICA = eval(sorgente.match(/const LOGICA = (\[[\s\S]*?\]);/)[1]);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'dicembre-wms-31-12.json'), 'utf8'));
let n = 0;
function controlli(profit) {
  const S = JSON.parse(JSON.stringify(base));
  delete S.chiusure['2026'];
  if (profit) S.copaProfit = profit; else delete S.copaProfit;
  const w = new JSDOM('<!doctype html><div id="lab"></div>', {url: 'https://sim.local/', runScripts: 'outside-only'}).window;
  w.localStorage.setItem(CHIAVE, JSON.stringify(S)); w.confirm = () => true;
  LOGICA.forEach(f => w.eval(fs.readFileSync(path.join(root, f), 'utf8')));
  w.SD4.avvia(CHIAVE);
  const out = w.CH4.controlli('2026'); w.close(); return out;
}
const copa = c => Array.from(c).filter(x => /CO-PA/.test(x));   // l'array arriva dalla finestra jsdom: lo si porta in Node
assert.ok(base.copa.length > 0, 'la fotografia ha ricavi CO-PA'); n++;
assert.deepStrictEqual(copa(controlli(null)), [], 'senza nessuna assegnazione il controllo non scatta (esercitazioni senza profit center)'); n++;
const centri = [{codice: 'PC-TR', nome: 'Business transenne'}, {codice: 'PC-SL', nome: 'Semilavorati'}];
const parziale = copa(controlli({centri, materiale: {'SL-TAGLIO': 'PC-SL'}}));
assert.ok(parziale.length === 1 && /TR-STD/.test(parziale[0]), 'assegnazione iniziata ma TR-STD senza centro: avviso prima della chiusura'); n++;
assert.deepStrictEqual(copa(controlli({centri, materiale: {'TR-STD': 'PC-TR', 'SL-TAGLIO': 'PC-SL'}})), [], 'tutti i materiali venduti assegnati: nessun avviso'); n++;
console.log('✓ chiusura: controllo dei ricavi CO-PA senza centro di profitto, ' + n + ' controlli');
process.exit(0);
