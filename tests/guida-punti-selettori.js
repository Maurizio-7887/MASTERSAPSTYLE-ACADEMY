// Ogni punto guidato del budget deve trovare il suo campo reale nella pagina giusta (altrimenti non brilla).
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), key = 'guida-sel-test';
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const scripts = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js',
  'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_bpc/static/bpc-logica.js', 'app/blueprints/erp_controllo/static/co-percorso.js',
  'app/blueprints/erp_paghe/static/py-logica.js'];
let checks = 0, mancano = [];
const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/controllo/', runScripts: 'outside-only'}).window;
w.confirm = () => true; scripts.forEach(f => w.eval(read(f))); w.SD4.avvia(key); const n = w.SD4.N, cp = w.PC4.cpm;
n.avvia({modo: 'costituzione', data: '2026-12-01'});
const PAGE = {
  'cpm-attivazione': ['erp_controllo/co-pagine.js', 'centri'], 'cpm-budget': ['erp_controllo/co-pagine.js', 'kp06'], 'cpm-paghe': ['erp_controllo/co-pagine.js', 'kp06'],
  'cpm-kp26': ['erp_controllo/co-pagine.js', 'kp26'], 'cpm-ciclo': ['erp_controllo/co-pagine.js', 'ksu'], 'cpm-kspi': ['erp_controllo/co-pagine.js', 'kspi'],
  'cpm-standard-tr': ['erp_costi/copc-pagine.js', 'scheda'], 'cpm-standard-halb': ['erp_costi/copc-pagine.js', 'scheda'],
  'cpm-calcolo': ['erp_costi/copc-pagine.js', 'calcolo'], 'cpm-rilascio': ['erp_costi/copc-pagine.js', 'calcolo'],
  'bpc-modello': ['erp_bpc/bpc-pagine.js', 'modello'], 'bpc-input': ['erp_bpc/bpc-pagine.js', 'input'], 'bpc-processo': ['erp_bpc/bpc-pagine.js', 'processo']};
function apri(f, pag) { w.LAB_PAGINA = {chiave: key, pagina: pag}; w.document.getElementById('lab').innerHTML = ''; w.eval(read('app/blueprints/' + f.replace('/', '/static/'))); }
w.eval(read('app/blueprints/guida/static/esercizi/cpm-formas.js'));
const passi = w.MSA_CPM_FORMAS.passiPreparazione;
// piano CO attivo e modello BPC creato quando servono
apri('erp_controllo/co-pagine.js', 'centri'); passi.find(x => x.id === 'cpm-attivazione').punti.forEach((d, k) => { checks++; if (!w.document.querySelector(d.sel)) mancano.push('cpm-attivazione #' + (k + 1) + ' ' + d.sel); }); w.document.getElementById('cpm-start-conferma').value = 'ATTIVA'; w.document.querySelector('[data-prefisso="cpm-start"] [data-azione="start"]').click();
Object.keys(PAGE).filter(id => id !== 'cpm-attivazione').forEach(id => {
  if (id === 'bpc-modello') { /* prima della creazione */ }
  else if (!w.BPC4 || !(w.BPC4.M && w.BPC4.M())) { if (['bpc-input', 'bpc-processo'].includes(id)) { apri('erp_bpc/bpc-pagine.js', 'modello'); w.document.getElementById('bpc-crea-conferma').value = 'CREA'; w.document.querySelector('[data-prefisso="bpc-crea"] [data-azione="crea"]').click(); } }
  const p = passi.find(x => x.id === id); assert.ok(p && p.punti, 'passo ' + id);
  const [f, pag] = PAGE[id]; apri(f, pag);
  p.punti.forEach((d, k) => { if (!d.sel) return; checks++; if (!w.document.querySelector(d.sel)) mancano.push(id + ' #' + (k + 1) + ' ' + d.sel); });
});
if (mancano.length) { console.log('✗ selettori senza campo nella pagina:\n  ' + mancano.join('\n  ')); process.exit(1); }
console.log('OK selettori guida: ' + checks + ' campi trovati');
