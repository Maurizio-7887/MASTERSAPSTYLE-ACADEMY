// Solo dati sintetici. node tests/bpc-atp.js
// 1) SAP BPC sopra il piano CO: modello dal KP06, input mensile, blocchi del work status, consuntivo da S/4, forecast,
//    approvazione e retraction in KP06 versione 0 con nuova revisione (KSPI da rifare).
// 2) Controllo di disponibilità sugli ordini cliente: semaforo verde/giallo/rosso, righe di schedulazione con entrate.
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), key = 'bpc-atp-test', read = f => fs.readFileSync(path.join(root, f), 'utf8');
const scripts = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js',
  'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_bpc/static/bpc-logica.js', 'app/blueprints/erp_controllo/static/co-percorso.js',
  'app/blueprints/erp_paghe/static/py-logica.js'];
let checks = 0;
const ok = (v, t) => { checks++; assert.ok(v, t); }, near = (a, b, t) => ok(Math.abs(a - b) < .006, t + ': ' + a);
const w = new JSDOM('<!doctype html><div id="lab"></div>', {url: 'https://sim.local/vuoto/s4/bpc/', runScripts: 'outside-only'}).window;
w.confirm = () => true; scripts.forEach(f => w.eval(read(f))); w.SD4.avvia(key);
let n = w.SD4.N; const cp = w.PC4.cpm, B = w.BPC4;
n.avvia({modo: 'costituzione', data: '2026-12-01'});
function pagina(p) { w.LAB_PAGINA = {chiave: key, pagina: p}; w.eval(read('app/blueprints/erp_bpc/static/bpc-pagine.js')); n = w.SD4.N; return w.document.body.textContent; }
function click(form, action) { w.document.querySelector('[data-prefisso="' + form + '"] [data-azione="' + action + '"]').click(); return w.document.getElementById(form + '-esito'); }
const field = (id, v) => { const x = w.document.getElementById(id); assert.ok(x, 'campo ' + id); if (v !== undefined) x.value = v; return x; };

// ── BPC ──
ok(/apri il piano CO/.test(pagina('modello')), 'BPC chiede prima il piano CO');
cp.attiva({conferma: 'ATTIVA'});
let t = pagina('modello'); ok(/CREA/.test(t) && /CATEGORIA/.test(t), 'creazione del modello spiegata');
field('bpc-crea-conferma', 'CREA'); click('bpc-crea', 'crea'); ok(!!B.M() && /Data Manager/.test(w.document.body.textContent), 'modello creato');
near(B.totaleRiga(B.riga('BUDGET', 'V1', '4210', '80')), 36000, 'budget dal KP06 v0');
near(B.riga('BUDGET', 'V1', '4210', '80')[0], 3000, 'spalmato in 12 mesi');
// input mensile del centro 4200: 86 fitto 1.000 al mese
pagina('input');
const sel = w.document.getElementById('cdc'); sel.value = '4200'; sel.dispatchEvent(new w.Event('change'));
for (let k = 1; k <= 12; k++) { field('epm-m86_' + k, '1000'); field('epm-m54_' + k, k === 12 ? '500' : '500'); field('epm-m50_' + k, k <= 6 ? '0' : '0'); }
ok(click('epm', 'salva').classList.contains('ok'), 'input EPM salvato');
near(B.totaleRiga(B.riga('BUDGET', 'V1', '4200', '86')), 12000, 'fitto 12.000');
near(B.totaleRiga(B.riga('BUDGET', 'V1', '4200', '54')), 6000, 'servizi 6.000');
// work status: inviato blocca l'input
const prima = JSON.stringify(B.M().dati);
B.azione({cdc: '4200', azione: 'invia'});
assert.throws(() => B.salvaInput({categoria: 'BUDGET', versione: 'V1', cdc: '4200'}), /bloccato/); checks++;
assert.throws(() => B.azione({cdc: '4200', azione: 'respingi'}), /motivo/); checks++;
B.azione({cdc: '4200', azione: 'respingi', nota: 'manca l’energia'});
ok(B.statoDi('4200').stato === 'respinto' && JSON.stringify(B.M().dati) === prima, 'respinto senza perdere dati');
assert.throws(() => B.azione({cdc: '4210', azione: 'approva'}), /inviato/); checks++;
assert.throws(() => B.ritrasferisci({conferma: 'TRASFERISCI'}), /Mancano/); checks++;
cp.CDC.forEach(c => { B.azione({cdc: c.codice, azione: 'invia'}); B.azione({cdc: c.codice, azione: 'approva', nota: 'ok'}); });
assert.throws(() => B.ritrasferisci({}), /TRASFERISCI/); checks++;
// prima del retract le tariffe dipendono ancora da KP06 (18.000 comuni)
cp.eseguiKSPI({data: '2026-12-01'}); near(cp.tariffe().Taglio.tariffa, 28, 'tariffa prima del retract');
const rev = cp.modello().revisione, fi = JSON.stringify(n.S.registrazioni);
t = pagina('processo'); field('retract-conferma', 'TRASFERISCI');
ok(click('retract', 'retract').classList.contains('ok'), 'retraction eseguita');
ok(cp.modello().revisione === rev + 1, 'nuova revisione del piano');
near(cp.modello().piano['0']['4200']['86'], 12000, 'KP06 v0 aggiornato dal BPC');
near(cp.modello().generale.produttivi, 18000, 'costi comuni 12.000 + 6.000');
assert.throws(() => w.PC4.calcola({materiale: 'TR-STD', data: '2026-12-01'}), /KSPI/); checks++;
ok(JSON.stringify(n.S.registrazioni) === fi, 'BPC senza scritture FI');
// consuntivo da S/4 e forecast 11+1
n.post({data: '2026-12-31', tipo: 'ASSESTAMENTO', descrizione: 'fitto', righe: [{conto: '86', dareAvere: 'DARE', importo: 1033.33}, {conto: '39', dareAvere: 'AVERE', importo: 1033.33}]}); n.salva();
B.caricaActual({mese: 12});
near(B.riga('ACTUAL', 'A', '4200', '86')[11], 1033.33, 'consuntivo di dicembre su 4200 via OKB9');
assert.throws(() => B.salvaInput({categoria: 'ACTUAL', versione: 'A', cdc: '4200'}), /Data Manager|non si scrive/); checks++;
B.copia({destinazione: 'F1', mesiActual: 11});
near(B.riga('FORECAST', 'F1', '4200', '86')[11], 1000, 'forecast: dicembre a budget');
B.copia({destinazione: 'F2', mesiActual: 12});
near(B.riga('FORECAST', 'F2', '4200', '86')[11], 1033.33, 'forecast 12+0 = consuntivo');
const r = B.report({mese: 12, forecast: 'F2'}).find(x => x.cdc === '4200');
near(r.actualYTD, 1033.33, 'report consuntivo'); near(r.budget, 18000, 'report budget');
t = pagina('report'); ok(/Budget, consuntivo e forecast per centro/.test(t), 'report visibile');

// ── ATP ──
const SD = w.SD4, PP = w.PP4;
n = w.SD4.N;
const cliente = Object.keys(n.S.clienti)[0];
cp.eseguiKSPI({data: '2026-12-01'});
['TR-STD', 'SL-TAGLIO'].forEach(m => w.PC4.calcola({materiale: m, data: '2026-12-01'})); w.PC4.marca({});
w.PC4.rilascia({data: '2026-12-01', sostituisciBootstrap: 'SOSTITUISCI'});
SD.ordine({cliente, materiale: 'TR-STD', qta: 100, data: '2026-12-02', consegna: '2026-12-10'});
let o1 = n.S.ordini[n.S.ordini.length - 1], c1 = SD.confermabilita(o1);
ok(c1.stato === 'rosso' && c1.scoperto === 100, 'nessuna giacenza né entrata: rosso');
n.movimento('TR-STD', 40, '2026-12-02', '561', 'TEST');
c1 = SD.confermabilita(o1); ok(c1.stato === 'giallo' && c1.coperto === 40 && c1.scoperto === 60, 'confermabile in parte: giallo');
// ordine di produzione con fine pianificata: le 60 mancanti arrivano il 15/12, dopo la data richiesta
n.movimento('FERRO', 2000, '2026-12-02', '561', 'TEST');
PP.ordine({materiale: 'TR-STD', qta: 100, data: '2026-12-03', fine: '2026-12-15'});
c1 = SD.confermabilita(o1);
ok(c1.stato === 'giallo' && c1.scoperto === 0 && c1.dataConfermata === '2026-12-15', 'tutto confermabile ma il 15/12: giallo');
ok(c1.righe.length === 2 && c1.righe[0].fonte === 'giacenza' && /produzione/.test(c1.righe[1].fonte), 'righe di schedulazione');
SD.ordine({cliente, materiale: 'TR-STD', qta: 30, data: '2026-12-04', consegna: '2026-12-20'});
const o2 = n.S.ordini[n.S.ordini.length - 1], c2 = SD.confermabilita(o2);
ok(c2.stato === 'verde' && c2.dataConfermata === '2026-12-15', 'secondo ordine: 30 dei 40 restanti in arrivo prima della data richiesta → verde');
SD.ordine({cliente, materiale: 'TR-STD', qta: 50, data: '2026-12-05'});
const c3 = SD.confermabilita(n.S.ordini[n.S.ordini.length - 1]);
ok(c3.stato === 'giallo' && c3.coperto === 10 && c3.scoperto === 40, 'terzo ordine: solo 10 confermabili');
w.LAB_PAGINA = {chiave: key, pagina: 'ordini'}; w.eval(read('app/blueprints/erp_vendite/static/sd-pagine.js'));
t = w.document.body.textContent;
ok(/Disponibilità/.test(t) && /Data confermabile/.test(t) && /confermabile alla data richiesta/.test(t), 'semaforo nella lista VA05');
w.LAB_PAGINA = {chiave: key, pagina: 'crediti'}; w.eval(read('app/blueprints/erp_vendite/static/sd-pagine.js'));
t = w.document.body.textContent; ok(/Righe di schedulazione/.test(t) && /ordine di produzione/.test(t), 'CO09 con entrate pianificate');
w.close();
console.log('✓ BPC (modello, input, work status, consuntivo, forecast, retraction) e ATP con semaforo: ' + checks + ' controlli');
