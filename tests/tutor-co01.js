// Tutor «Sono bloccato?» sotto CO01: compare, e segue lo stato di CK11N/CK24 senza toccare nulla.
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8'), key = 'tutor-co01-test';
const scripts = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js'];
const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/produzione/', runScripts: 'outside-only'}).window;
w.confirm = () => true; scripts.forEach(f => w.eval(read(f))); const N = w.SD4.avvia(key); N.avvia({modo: 'costituzione', data: '2026-12-01'});
const apri = () => { w.document.getElementById('lab').innerHTML = ''; w.LAB_PAGINA = {chiave: key, pagina: 'ordini'}; w.eval(read('app/blueprints/erp_produzione/static/pp-pagine.js')); };
apri();
const d = w.document, N2 = () => w.SD4.N; const tut = d.getElementById('tutor-co01'); assert.ok(tut, 'tutor presente');
assert.ok(d.getElementById('co-materiale') && d.querySelector('[data-prefisso="co"]'), 'modulo CO01');
const prima = JSON.stringify(N2().S.registrazioni) + JSON.stringify(N2().S.produzione);
d.getElementById('tutor-co01-ap').click();
const msg = () => d.getElementById('tutor-co01-st').textContent;
assert.ok(!d.getElementById('tutor-co01-c').hidden, 'si apre');
console.log('stato:', msg());
assert.ok(/standard rilasciato|nessuna stima|non è rilasciata/.test(msg()), 'messaggio di stato');
// materiale senza standard rilasciato → cancello la stima e controllo il messaggio
const m = d.getElementById('co-materiale').value; delete N2().S.costing.stime[m];
d.getElementById('co-materiale').dispatchEvent(new w.Event('change', {bubbles: true}));
assert.ok(/nessuna stima/.test(msg()), 'senza stima: ' + msg());
N2().S.costing.stime[m] = {stato: 'KA'}; d.getElementById('co-materiale').dispatchEvent(new w.Event('change', {bubbles: true}));
assert.ok(/non è rilasciata/.test(msg()), 'KA: ' + msg());
N2().S.costing.stime[m] = {stato: 'FR'}; d.getElementById('co-materiale').dispatchEvent(new w.Event('change', {bubbles: true}));
assert.ok(/rilasciato/.test(msg()), 'FR: ' + msg());
assert.strictEqual(JSON.stringify(N2().S.registrazioni) + JSON.stringify(N2().S.produzione), prima, 'il tutor non modifica nulla');
// i valori sopravvivono all'andata e ritorno nei costi
d.getElementById('co-qta').value = '300'; d.getElementById('tutor-co01-go').addEventListener('click', e => e.preventDefault()); d.getElementById('tutor-co01-go').click(); apri();
assert.strictEqual(d.getElementById('co-qta').value, '300', 'quantità ripristinata');
console.log('OK tutor CO01');
