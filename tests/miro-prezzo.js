// MIRO: un prezzo diverso da quello d'ordine non si registra per sbaglio (4 righe invece di 3); e i decimali col punto non diventano migliaia.
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/acquisti/', runScripts: 'outside-only'}).window;
['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js', 'app/blueprints/erp_acquisti/static/mm-logica.js'].forEach(f => w.eval(read(f)));
const L = w.LabMotore;
[['1,05', 1.05], ['1.05', 1.05], ['0.98', 0.98], ['3.000', 3000], ['3.000,50', 3000.5], ['1.234.567', 1234567], ['12', 12], [' 1,00 ', 1]].forEach(([t, v]) => assert.strictEqual(L.num(t), v, t));
const N = w.SD4.avvia('miro-prezzo'); N.avvia({modo: 'costituzione', data: '2026-12-01'});
const MM = w.MM4, o0 = MM.ordine({fornitore: 'F100', materiale: 'FERRO', qta: 3000, prezzo: 1, data: '2026-12-03'});
const o = w.SD4.N.S.acquisti[0]; MM.entrata({ordine: o.numero, ddt: 'D1', data: '2026-12-04'});
assert.throws(() => MM.fattura({ordine: o.numero, rif: 'F1', prezzo: '1,02', data: '2026-12-05'}), /diverso da quello d'ordine.*VUOTO/);
assert.throws(() => MM.fattura({ordine: o.numero, rif: 'F1', prezzo: '1.02', data: '2026-12-05'}), /diverso/);
assert.strictEqual(w.SD4.N.S.fattureFornitore.length, 0, 'nessuna scrittura per la fattura rifiutata');
const r = MM.fattura({ordine: o.numero, rif: 'F1', data: '2026-12-05'});
assert.strictEqual(r.righe.length, 3, 'a prezzo d\'ordine: 3 righe');
console.log('OK MIRO: prezzo diverso bloccato salvo conferma, decimali col punto');
