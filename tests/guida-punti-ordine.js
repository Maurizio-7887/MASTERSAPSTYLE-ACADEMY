// Il passo «ordina il ferro» ha la guida punto per punto: ogni campo deve esistere nella pagina Ordini d'acquisto.
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8'), key = 'guida-ordine-test';
const scripts = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js'];
const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/acquisti/', runScripts: 'outside-only'}).window;
w.confirm = () => true; scripts.forEach(f => w.eval(read(f))); w.SD4.avvia(key); w.SD4.N.avvia({modo: 'costituzione', data: '2026-12-01'});
w.LAB_PAGINA = {chiave: key, pagina: 'ordini'}; w.eval(read('app/blueprints/erp_acquisti/static/mm-pagine.js'));
let n = 0;
['dicembre-wms', 'dicembre-wms-legacy', 'ragioneria-wms'].forEach(f => {
  const src = read('app/blueprints/guida/static/esercizi/' + f + '.js'), m = /punti:(PME\([^)]*\)[^,]*),/.exec(src); assert.ok(src.includes('punti:PME('), f);
  const fnSrc = /function PME[\s\S]*?\n  }\n/.exec(src)[0]; const PME = new Function(fnSrc + '; return PME;')();
  PME('2026-12-03', 3000, '1,00', () => null).forEach((d, k) => { n++; assert.ok(w.document.querySelector(d.sel), f + ' punto ' + (k + 1) + ' ' + d.sel); });
});
console.log('OK guida ordine: ' + n + ' campi trovati');
