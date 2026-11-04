// Guida punto per punto: il campo da compilare brilla, il fumetto dice cosa scrivere e a cosa serve, il punto dopo si accende da solo.
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), key = 'guida-punti-test';
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const scripts = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js',
  'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_bpc/static/bpc-logica.js', 'app/blueprints/erp_controllo/static/co-percorso.js',
  'app/blueprints/erp_paghe/static/py-logica.js'];
let checks = 0; const ok = (v, t) => { checks++; assert.ok(v, t); };
const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/controllo/kp06/', runScripts: 'outside-only', pretendToBeVisual: true}).window;
w.confirm = () => true; const tick = []; w.setInterval = f => { tick.push(f); return tick.length; }; w.setTimeout = f => { f(); return 1; };
scripts.forEach(f => w.eval(read(f))); w.SD4.avvia(key); const n = w.SD4.N, cp = w.PC4.cpm;
n.avvia({modo: 'costituzione', data: '2026-12-01'}); cp.avvia ? 0 : 0;
w.document.getElementById('lab'); w.LAB_PAGINA = {chiave: key, pagina: 'centri'}; w.eval(read('app/blueprints/erp_controllo/static/co-pagine.js'));
const f = id => { const x = w.document.getElementById(id); assert.ok(x, 'campo ' + id); return x; };
f('cpm-start-conferma').value = 'ATTIVA'; w.document.querySelector('[data-prefisso="cpm-start"] [data-azione="start"]').click();
ok(cp.attivo(), 'piano CO aperto');
w.LAB_PAGINA = {chiave: key, pagina: 'kp06'}; w.eval(read('app/blueprints/erp_controllo/static/co-pagine.js'));
// pannello con il solo passo del budget
w.eval(read('app/blueprints/guida/static/esercizi/cpm-formas.js'));
const passo = w.MSA_CPM_FORMAS.passiPreparazione.find(p => p.id === 'cpm-budget'); ok(passo && passo.punti && passo.punti.length > 10, 'il passo budget ha i punti guidati');

w.MSA_ESERCIZIO = {codice: 't', titolo: 'prova', passi: [passo], pannelloAutomatico: true};
w.MSA_GUIDA = {esercizio: 't', versione: 'vuoto', chiave: key, url: {'erp_controllo.kp06': '/vuoto/s4/controllo/kp06/'}};
w.eval(read('app/blueprints/guida/static/pannello.js'));
let orologio = Date.now() + 5000; w.Date.now = () => orologio;
const giro = () => { orologio += 1000; tick.forEach(t => t()); };
const brilla = () => [...w.document.querySelectorAll('.msa-g-brilla')];
giro(); giro();
let b = brilla(); ok(b.length === 1, 'un solo punto brilla (' + b.length + ')'); ok(b[0].id === 'kp06-k80', 'brilla la casella 80 del centro 4210, non ' + (b[0] && b[0].id));

let card = w.document.querySelector('.msa-g-ora'); ok(card && /ORA TOCCA A TE/.test(card.textContent) && /36000/.test(card.textContent) && /A cosa serve/.test(card.textContent), 'riquadro con cosa scrivere e a cosa serve');
const bolla = w.document.getElementById('msa-g-bolla'); ok(!bolla.hidden && /36000/.test(bolla.textContent), 'fumetto accanto alla casella');
// reparto già proposto dal programma: si controlla, poi si salva
w.document.querySelector('.msa-g-letto').click(); giro();
b = brilla(); ok(b.length === 1 && b[0].getAttribute('data-azione') === 'kp06', 'dopo il controllo brilla «Salva il piano del centro»');
b[0].click(); giro();
b = brilla(); ok(b.length === 1 && b[0].id === 'cdc', 'poi brilla il menu del centro (4220)');
ok(/4220/.test(w.document.querySelector('.msa-g-ora').textContent), 'il riquadro dice di scegliere 4220');
// scelgo davvero i centri uno dopo l'altro: la guida segue
const scegli = v => { f('cdc').value = v; f('cdc').dispatchEvent(new w.Event('change', {bubbles: true})); giro(); };
scegli('4220'); ok(brilla()[0].id === 'kp06-k80', 'scelto 4220: brilla la casella 80');
w.document.querySelector('.msa-g-letto').click(); giro(); brilla()[0].click(); giro();
scegli('4230'); w.document.querySelector('.msa-g-letto').click(); giro(); brilla()[0].click(); giro();
ok(brilla()[0].id === 'cdc' && /4200/.test(w.document.querySelector('.msa-g-ora').textContent), 'dopo i reparti la guida porta al centro 4200');
scegli('4200'); b = brilla(); ok(b[0].id === 'kp06-k86', 'centro 4200: brilla la classe 86 Fitti');
ok(/12000/.test(w.document.getElementById('msa-g-bolla').textContent) && /affitto/i.test(w.document.querySelector('.msa-g-ora').textContent), 'fumetto e riquadro: 12000 e a cosa serve');
// un valore sbagliato non fa avanzare, quello giusto sì (anche in formato italiano)
f('kp06-k86').value = '1200'; f('kp06-k86').dispatchEvent(new w.Event('input', {bubbles: true})); giro();
ok(brilla()[0].id === 'kp06-k86', 'valore sbagliato: la casella continua a brillare');
f('kp06-k86').value = '12.000,00'; f('kp06-k86').dispatchEvent(new w.Event('input', {bubbles: true})); giro();
ok(brilla()[0].id === 'kp06-k50', 'formato italiano 12.000,00 riconosciuto: brilla la classe 50');
// la nuvoletta sparisce subito quando si scrive nel punto, e quella del punto successivo non compare all'istante
{
  const bl = w.document.getElementById('msa-g-bolla');
  ok(!bl.hidden && /2900/.test(bl.textContent), 'nuvoletta del punto 50 visibile');
  f('kp06-k50').value = '29'; f('kp06-k50').dispatchEvent(new w.Event('input', {bubbles: true}));
  ok(bl.hidden, 'appena scrivo nel punto la nuvoletta sparisce (anche se il valore non è ancora giusto)');
  giro(); ok(bl.hidden && brilla()[0].id === 'kp06-k50', 'resta nascosta per quel punto, il bordo continua a brillare');
  f('kp06-k50').value = '2900'; f('kp06-k50').dispatchEvent(new w.Event('input', {bubbles: true}));
  ok(bl.hidden, 'valore giusto: la nuvoletta non ricompare e il punto successivo parte con ritardo (' + (brilla()[0] && brilla()[0].id) + ')');
  f('kp06-k54').value = ''; giro();
  ok(!bl.hidden && /3100/.test(bl.textContent), 'dopo un attimo compare la nuvoletta del punto 54');
  f('kp06-k54').dispatchEvent(new w.KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
  ok(bl.hidden, 'Invio: la nuvoletta sparisce subito');
  // suggeritore spento dal pulsante: niente bordo, niente nuvoletta, e si riaccende
  w.document.querySelector('.msa-g-sugg-off').click(); giro();
  ok(brilla().length === 0 && bl.hidden && w.localStorage.getItem('msa-g-suggeritore') === 'no' && w.document.querySelector('.msa-g-sugg-on'), 'suggeritore spento: nessun bordo né nuvoletta, pulsante per riaccenderlo');
  giro(); ok(brilla().length === 0 && bl.hidden, 'resta spento ai giri successivi');
  w.document.querySelector('.msa-g-sugg-on').click(); giro();
  ok(brilla().length === 1 && !bl.hidden && !w.document.querySelector('.msa-g-sugg-on'), 'riacceso: il bordo torna a brillare');
}
f('kp06-k50').value = '2900'; f('kp06-k50').dispatchEvent(new w.Event('input', {bubbles: true})); giro();
f('kp06-k54').value = '3100'; f('kp06-k54').dispatchEvent(new w.Event('input', {bubbles: true})); giro();
b = brilla(); ok(b.length === 1 && b[0].getAttribute('data-azione') === 'kp06', 'compilate le tre classi brilla «Salva»');
b[0].click(); giro();
ok(cp.modello().piano['0']['4200']['86'] === 12000 && cp.modello().piano['0']['4200']['54'] === 3100, 'piano del 4200 salvato nello stato');
ok(/TUTTI|Tabella del piano/.test(w.document.querySelector('.msa-g-ora').textContent), 'ultimo punto: leggere la tabella di controllo');
w.document.querySelector('.msa-g-letto').click(); giro();
ok(/TUTTI I PUNTI FATTI/.test(w.document.querySelector('.msa-g-ora').textContent) && brilla().length === 0, 'tutti i punti fatti: nessun bordo che brilla');
// ogni passo del budget ha i punti e i selettori dei campi esistono nelle pagine
['cpm-attivazione', 'cpm-budget', 'cpm-paghe', 'cpm-kp26', 'cpm-ciclo', 'cpm-standard-tr', 'cpm-standard-halb', 'bpc-modello', 'bpc-input', 'bpc-processo', 'cpm-kspi', 'cpm-tariffe', 'cpm-calcolo', 'cpm-rilascio'].forEach(id => {
  const q = w.MSA_CPM_FORMAS.passiPreparazione.find(p => p.id === id); ok(q && q.punti && q.punti.length, 'punti guidati nel passo ' + id);
  q.punti.forEach(d => ok(d.serve && d.serve.length > 20, id + ': ogni punto spiega a cosa serve (' + d.nome + ')'));
});
console.log('OK guida punto per punto: ' + checks + ' controlli');
