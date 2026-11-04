// Sconti su vendite: non sono un costo nel conto economico e la prima nota libera blocca gli strafalcioni.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const src = fs.readFileSync(path.join(__dirname, 'esercizio-ragioneria-chiusura.js'), 'utf8');
const LOGICA = eval(src.match(/const LOGICA = (\[[\s\S]*?\]);/)[1]);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
function apri() {
  const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  w.localStorage.setItem(CHIAVE, fs.readFileSync(path.join(__dirname, 'ragioneria-wms-finale.json'), 'utf8'));
  w.confirm = () => true; w.LAB_PAGINA = {chiave: CHIAVE, pagina: 'prima_nota', slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/erp_fi/static/fi-pagine.js']).forEach(f => w.eval(R(f)));
  return w;
}
const w = apri(), lab = w.document.getElementById('lab');
// 1) conto economico: uno sconto (47) riduce i ricavi, non finisce tra i costi
w.eval("SD4.avvia('" + CHIAVE + "')");
const N = w.SD4.N, CH = w.CH4, an = '2031';
const prima = CH.contoEconomico(an);
N.post({data: an + '-03-01', tipo: 'TEST', descrizione: 't', righe: [{conto: '11', dareAvere: 'DARE', importo: 900}, {conto: '47', dareAvere: 'DARE', importo: 100}, {conto: '40', dareAvere: 'AVERE', importo: 1000}]});
const dopo = CH.contoEconomico(an);
ok(Math.abs((dopo.ricavi - prima.ricavi) - 900) < 0.006, 'ricavi netti di sconto: +900 (ottenuto ' + (dopo.ricavi - prima.ricavi) + ')');
ok(Math.abs(dopo.costi - prima.costi) < 0.006, 'lo sconto non compare tra i costi');
ok(Math.abs((dopo.risultato - prima.risultato) - 900) < 0.006, 'risultato invariato rispetto al calcolo corretto');
// 2) prima nota libera: blocchi
function prova(righe, desc) {
  w.eval('window.LAB_PAGINA.pagina="prima_nota"');
  const form = lab.querySelector('#fi-free-form'); if (!form) return 'NOFORM';
  while (form.querySelector('#fi-free-rows tbody').rows.length < righe.length) lab.querySelector('#fi-free-add').click();
  const rows = form.querySelector('#fi-free-rows tbody').rows;
  righe.forEach((r, i) => { rows[i].querySelector('.fi-conto').value = r[0]; rows[i].querySelector('.fi-da').value = r[1]; rows[i].querySelector('.fi-val').value = r[2]; });
  form.querySelector('[name="descrizione"]').value = desc;
  lab.querySelector('#fi-free-check').click();
  return lab.querySelector('#fi-free-msg').textContent;
}
const casi = [
  [[['47', 'DARE', 100], ['11', 'AVERE', 100]], 'sconto al cliente', /conto 47/, 'sconto su conto 47 bloccato'],
  [[['47', 'AVERE', 100], ['11', 'DARE', 100]], 'sconto', /conto 47/, 'sconto in Avere (come ricavo) bloccato'],
  [[['40', 'DARE', 100], ['11', 'AVERE', 100]], 'sconto concesso', /rettificat|nota di credito/, 'sconto addebitato ai ricavi (40) bloccato'],
  [[['10', 'DARE', 100], ['40', 'AVERE', 100]], 'vendita per cassa', /Simulazione valida/, 'registrazione corretta passa'],
];
casi.forEach(c => { const m = prova(c[0], c[1]); ok(c[2].test(m), c[3] + ' → ' + m.slice(0, 110)); });
console.log(controlli + ' controlli, ' + errori + ' errori'); process.exit(errori ? 1 : 0);
