// Solo dati sintetici, nessuna rete. node tests/budget-guida-campi.js
// Ciclo di pianificazione CO come in SAP: passo 1 spiegato, KP06 per centro e classe (versioni, PCP dalle paghe e
// tabella di controllo), KP26/LTP, KSU1, KSPI obbligatorio prima di CK11N, KSB1 automatico da FI e KB11N.
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), key = 'budget-guida-test';
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const scripts = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js',
  'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_bpc/static/bpc-logica.js', 'app/blueprints/erp_controllo/static/co-percorso.js',
  'app/blueprints/erp_paghe/static/py-logica.js'];
let checks = 0;
function ok(v, text) { checks++; assert.ok(v, text); }
function near(a, b, text) { ok(Math.abs(a - b) < .006, text + ': ' + a); }
function fresh(saved) {
  const w = new JSDOM('<!doctype html><div id="lab"></div>', {url: 'https://sim.local/vuoto/s4/controllo/', runScripts: 'outside-only'}).window;
  w.confirm = () => true;
  if (saved) w.localStorage.setItem(key, JSON.stringify(saved));
  scripts.forEach(f => w.eval(read(f))); w.SD4.avvia(key); return w;
}
function pagina(w, p) { w.LAB_PAGINA = {chiave: key, pagina: p}; w.eval(read('app/blueprints/erp_controllo/static/co-pagine.js')); return w.document.body.textContent; }
function field(w, id, v) { const x = w.document.getElementById(id); assert.ok(x, 'campo ' + id); if (v !== undefined) x.value = v; return x; }
function click(w, form, action) { w.document.querySelector('[data-prefisso="' + form + '"] [data-azione="' + action + '"]').click(); return w.document.getElementById(form + '-esito'); }
function scegli(w, id, v) { const x = field(w, id, v); x.dispatchEvent(new w.Event('change')); }

let w = fresh(), n = w.SD4.N, cp = w.PC4.cpm;
n.avvia({modo: 'costituzione', data: '2026-12-01'});
// Passo 1: spiegato, poi conferma esplicita
let before = JSON.stringify(n.S), testo = pagina(w, 'centri');
ok(JSON.stringify(n.S) === before && !cp.attivo(), 'aprire la pagina non apre il piano');
for (const t of ['Passo 1', 'Che cosa fa questo passo', 'Che cosa NON fa', '4100 Magazzino', '4230 Saldatura', 'ORE', 'Ciclo di pianificazione CO']) ok(testo.includes(t), 'passo 1 spiega: ' + t);
let es = click(w, 'cpm-start', 'start'); ok(es.classList.contains('ko') && !cp.attivo(), 'serve la conferma');
field(w, 'cpm-start-conferma', 'ATTIVA'); click(w, 'cpm-start', 'start');
ok(cp.attivo(), 'piano CO aperto');
ok(w.COPERCORSO.tappe(n.S).map(t => !!t[3]).join() === 'true,false,false,false,false,false,false', 'dopo il passo 1 la barra indica KP06 come prossimo');
testo = w.document.body.textContent;
for (const t of ['H-FT', 'KSH3', 'KL03', 'KA03', 'OKB9', '943000', '944000', 'Sara Bianchi']) ok(testo.includes(t), 'anagrafiche: ' + t);
const fi = JSON.stringify(n.S.registrazioni);
// KP06: per centro, versione 0
testo = pagina(w, 'kp06');
ok(testo.includes('Tabella di controllo del budget del personale') && testo.includes('Come si compila e come si usa'), 'tabella di controllo spiegata');
scegli(w, 'cdc', '4200'); field(w, 'kp06-k54', '3100'); field(w, 'kp06-k50', '2900'); field(w, 'kp06-k86', '12.000,00');
es = click(w, 'kp06', 'kp06'); ok(es.classList.contains('ok'), 'KP06 4200 salvato: ' + es.textContent);
near(cp.modello().generale.produttivi, 18000, 'costi comuni 18.000 dalle classi');
near(cp.tariffe().Taglio.tariffa, 28, 'tariffa invariata a parità di totale');
ok(JSON.stringify(n.S.registrazioni) === fi, 'KP06 senza scritture FI');
before = JSON.stringify(n.S); field(w, 'kp06-k80', 'abc'); es = click(w, 'kp06', 'kp06');
ok(es.classList.contains('ko') && /numer/.test(es.textContent) && JSON.stringify(n.S) === before, 'errore leggibile senza salvare');
// PCP dalle paghe nella versione 1: tariffe invariate
const rev = cp.modello().revisione;
field(w, 'pcp-versione', '1'); es = click(w, 'pcp', 'pcp'); ok(es.classList.contains('ok'), 'PCP versione 1');
ok(cp.modello().revisione === rev, 'la versione 1 non crea revisioni');
const ctrl = Object.fromEntries(cp.controlloPersonale().map(r => [r.cdc, r]));
near(ctrl['4100'].paghe, 37807.06, 'Rossi 4100'); near(ctrl['4200'].paghe, 40507.57, 'Bianchi 4200'); near(ctrl['4300'].paghe, 46808.74, 'Verdi 4300');
near(ctrl['4210'].differenza, 36000, 'reparto: personale da assumere'); near(ctrl['4200'].versione1, 40507.57, 'versione 1 compilata');
field(w, 'pcp-versione', '0'); es = click(w, 'pcp', 'pcp'); ok(es.classList.contains('ko') && /SOSTITUISCI/.test(es.textContent), 'versione 0 solo con conferma');
// KP26 / LTP
testo = pagina(w, 'kp26');
field(w, 'kp26-Taglio_orePiano', '1600'); es = click(w, 'kp26', 'kp26'); ok(es.classList.contains('ko') && /capacità/.test(es.textContent), 'ore oltre la capacità');
field(w, 'kp26-Taglio_orePiano', '1500'); es = click(w, 'kp26', 'kp26'); ok(es.classList.contains('ok'), 'KP26 salvato');
es = click(w, 'ltp', 'ltp'); ok(es.classList.contains('ok'), 'LTP salvato');
ok(/300/.test(w.document.body.textContent) && /20/.test(w.document.body.textContent), 'ore richieste e saturazione');
// KSU1
pagina(w, 'ksu'); field(w, 'ksu1-driver', 'percentuali'); field(w, 'ksu1-Taglio_percentuale', '50'); es = click(w, 'ksu1', 'ksu1');
ok(es.classList.contains('ko') && /100%/.test(es.textContent), 'percentuali devono fare 100');
field(w, 'ksu1-driver', 'ore'); es = click(w, 'ksu1', 'ksu1'); ok(es.classList.contains('ok'), 'ciclo a ore');
// KSPI obbligatorio prima di CK11N
assert.throws(() => w.PC4.calcola({materiale: 'TR-STD', data: '2026-12-01'}), /KSPI/); checks++;
testo = pagina(w, 'kspi'); ok(/non sono calcolate/.test(testo), 'avviso KSPI mancante');
field(w, 'kspi-data', '2026-12-01'); es = click(w, 'kspi', 'kspi'); ok(es.classList.contains('ok') && /28,00/.test(es.textContent), 'KSPI 28 €/h');
w.PC4.calcola({materiale: 'TR-STD', data: '2026-12-01'}); near(n.S.costing.stime['TR-STD'].unitario, 31.40, 'CK11N dopo KSPI');
const tappe = w.COPERCORSO.tappe(n.S); ok(tappe.slice(0, 5).every(t => t[3]), 'barra: prime cinque tappe fatte');
n = w.SD4.N;
// KSB1: consuntivo automatico da FI (paghe con centro, altri costi con OKB9) e KB11N solo CO
n.post({data: '2026-12-31', tipo: 'PAGHE', rif: 'PAGHE 2026-12', descrizione: 'paghe di prova', righe: [
  {conto: '80', dareAvere: 'DARE', importo: 2437.5, cdc: '4200'}, {conto: '81', dareAvere: 'DARE', importo: 757.57, cdc: '4200'}, {conto: '27', dareAvere: 'AVERE', importo: 3195.07}]});
n.post({data: '2026-12-31', tipo: 'ASSESTAMENTO', descrizione: 'rateo fitto', righe: [{conto: '86', dareAvere: 'DARE', importo: 1033.33}, {conto: '39', dareAvere: 'AVERE', importo: 1033.33}]});
n.salva();
const eff = cp.effettivi(2026).perCentro;
near(cp.totale(eff['4200']), 4228.40, 'consuntivo 4200 = paga + fitto via OKB9');
testo = pagina(w, 'ksb1'); ok(/OKB9/.test(testo) && /riga FI/.test(testo), 'origine delle righe visibile');
const fi2 = JSON.stringify(n.S.registrazioni);
field(w, 'kb11n-data', '2026-12-31'); field(w, 'kb11n-importo', '2437,50'); es = click(w, 'kb11n', 'kb11n');
ok(es.classList.contains('ok'), 'KB11N registrata'); ok(JSON.stringify(n.S.registrazioni) === fi2, 'KB11N solo CO');
near(cp.totale(cp.effettivi(2026).perCentro['4230']), 2437.5, 'costo spostato su 4230');
field(w, 'kb11n-data', '2026-12-31'); field(w, 'kb11n-importo', '99999'); es = click(w, 'kb11n', 'kb11n');
ok(es.classList.contains('ko') && /solo/.test(es.textContent), 'non si sposta più del registrato');
testo = pagina(w, 'report');
for (const t of ['S_ALR_87013611', 'stagionalità', 'Residuo', 'Assorbito']) ok(testo.includes(t), 'report: ' + t);
const r = cp.report(); near(r.centri[2].primari, 2437.5, 'primari Saldatura dal KB11N');
// controllo del personale: il consuntivo del registro paghe appare
near(Object.fromEntries(cp.controlloPersonale().map(x => [x.cdc, x.consuntivo]))['4200'], 757.57, 'consuntivo paghe 4200 dopo KB11N della classe 80');
// guida dell'esercizio allineata alle transazioni
w.eval(read('app/blueprints/guida/static/esercizi/cpm-formas.js'));
const guida = JSON.stringify(w.MSA_CPM_FORMAS);
for (const t of ['KP06', 'KP26', 'KSU1', 'KSPI', 'KB11N', 'Tabella di controllo', 'NON fa', '37.807,06', 'erp_controllo.kspi']) ok(guida.includes(t), 'esercizio: ' + t);
// compatibilità: un modello salvato prima delle anagrafiche si migra senza cambiare tariffe
w.close();
const legacy = JSON.parse(read('tests/fixtures/dicembre-wms-legacy.json'));
w = fresh(legacy); before = JSON.stringify(w.SD4.N.S); pagina(w, 'kp06');
ok(JSON.stringify(w.SD4.N.S) === before && !w.PC4.cpm.attivo(), 'dati storici inalterati dopo apertura'); w.close();
console.log('✓ Ciclo CO SAP: passo 1, KP06, PCP e tabella di controllo, KP26, KSU1, KSPI, KSB1/KB11N, report: ' + checks + ' controlli');
