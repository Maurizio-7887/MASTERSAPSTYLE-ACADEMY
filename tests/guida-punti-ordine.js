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

// ── MIGO 101 e F-53: i campi esistono nelle pagine vere (con un ordine ricevibile e un debito aperto) ──
{
  const key2 = 'guida-migo-test', w2 = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/acquisti/', runScripts: 'outside-only'}).window;
  w2.confirm = () => true; scripts.concat(['app/blueprints/erp_fi/static/fs-logica.js','app/blueprints/erp_fi/static/storni-logica.js']).forEach(f => { w2.eval(read(f)) });
  const N = w2.SD4.avvia(key2); N.avvia({modo: 'costituzione', data: '2026-12-01'});
  const pag = (f, pagina) => { w2.LAB_PAGINA = {chiave: key2, pagina}; w2.document.getElementById('lab').innerHTML = ''; w2.eval(read(f)); };
  const src = read('app/blueprints/guida/static/esercizi/dicembre-wms.js');
  const get = nome => new Function(/function PMIGO[\s\S]*?\n  }\n  function PPAGA[\s\S]*?\n  }\n/.exec(src)[0] + '; return ' + nome + ';')();
  w2.MM4.ordine({fornitore: 'F100', materiale: 'FERRO', qta: 3000, prezzo: 1, data: '2026-12-03'});
  pag('app/blueprints/erp_acquisti/static/mm-pagine.js', 'entrate');
  get('PMIGO')({ddt: 'x', lotto: 'x', dann: '1', danno: 'x', data: '2026-12-04'}, () => false).forEach((d, k) => { n++; assert.ok(w2.document.querySelector(d.sel), 'MIGO punto ' + (k + 1) + ' ' + d.sel); });
  assert.ok([...w2.document.querySelectorAll('#mi-ordine option')].some(o => o.value === '4500000001'), 'opzione ordine 4500000001');
  w2.SD4.N.S.msaRagioneria = {coda: []}; w2.SD4.N.salva();
  pag('app/blueprints/erp_fi/static/fi-pagine.js', 'passive');
  get('PPAGA')('F400', 'Omega', 'POL-1', '2026-12-02', () => false).forEach((d, k) => { n++; assert.ok(w2.document.querySelector(d.sel), 'F-53 punto ' + (k + 1) + ' ' + d.sel); });
  console.log('OK guida MIGO e F-53: campi trovati (totale ' + n + ')');
}
