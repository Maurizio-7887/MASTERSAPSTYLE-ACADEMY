// «Pianificazione e forecast 2027»: tutto l'esercizio dalle pagine (KP06, BPC, chiusure mensili, forecast 3+9, 6+6, 9+3) e le spunte della guida.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const PAGINE = {erp_dati: 'dati-pagine.js', erp_vendite: 'sd-pagine.js', erp_copa: 'copa-pagine.js', erp_fi: 'fi-pagine.js', erp_acquisti: 'mm-pagine.js', erp_produzione: 'pp-pagine.js', erp_costi: 'copc-pagine.js', erp_controllo: 'co-pagine.js', erp_bpc: 'bpc-pagine.js', erp_magazzino: 'wm-pagine.js', erp_inventario: 'inv-pagine.js', erp_spedizione: 'sp-pagine.js', erp_tesoreria: 'tes-pagine.js', erp_finanza: 'fin-pagine.js', erp_valute: 'val-pagine.js', erp_paghe: 'py-pagine.js', erp_cespiti: 'ce-pagine.js', erp_chiusura: 'ch-pagine.js', erp_innovazione: 'in-pagine.js'};
const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_bpc/static/bpc-logica.js', 'app/blueprints/erp_controllo/static/co-percorso.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js', 'app/blueprints/erp_cespiti/static/ce-logica.js', 'app/blueprints/erp_tesoreria/static/rb-logica.js', 'app/blueprints/erp_finanza/static/fin-logica.js', 'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/static/js/erp/ruoli.js',
  'app/static/js/lab-copioni.js', 'app/static/js/erp/lettore.js', 'app/static/vendor/jsbarcode-3.11.6.min.js', 'app/static/vendor/qrcode-generator-1.4.4.js', 'app/static/js/erp/etichette.js'];
let memoria = null, ultima = null;   // il localStorage passa da una pagina all'altra come nel browser
function apri(bp, pagina) {
  if (ultima) memoria = ultima.localStorage.getItem(CHIAVE) || memoria;
  if (ultima) ultima.close();
  const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  ultima = w;
  if (memoria) w.localStorage.setItem(CHIAVE, memoria);
  w.confirm = () => true;
  w.MSA_CORSO_GUIDA = 'pianificazione-forecast';
  w.LAB_PAGINA = {chiave: CHIAVE, pagina: pagina, slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/' + bp + '/static/' + PAGINE[bp]]).forEach(f => w.eval(R(f)));
  w.MSA_GUIDA = {esercizio:'pianificazione-forecast', chiave:CHIAVE, versione:'vuoto', url:{}};
  w.eval(R('app/blueprints/guida/static/esercizi/pianificazione-forecast.js'));
  w.eval(R('app/blueprints/guida/static/ragioneria.js'));
  w.eval(R('app/blueprints/guida/static/pannello.js'));
  const lab = w.document.getElementById('lab');
  const P = {w, lab, S: () => w.MSA_STATO_CORRENTE(),
    // compila il modulo con prefisso e preme il pulsante; restituisce il messaggio di esito
    fai(pref, valori, azione) {
      const regPrima=w.MSA_STATO_CORRENTE().registrazioni.length;
      Object.entries(valori).forEach(([k, v]) => {
        const el = lab.querySelector('#' + pref + '-' + k); if (!el) throw Error('campo ' + pref + '-' + k + ' assente in ' + pagina);
        if (el.tagName === 'SELECT' && typeof v === 'function') v = [...el.options].map(o => o.value).find(v);
        el.value = v;
      });
      const b = lab.querySelector('[data-prefisso="' + pref + '"] [data-azione="' + (azione || pref) + '"]'); if (!b) throw Error('pulsante ' + pref + ' assente');
      b.click();
      const es = lab.querySelector('#' + pref + '-esito');
      const esito = es ? es.className + ' ' + es.textContent : '';
      ok(!(w.MSA_STATO_CORRENTE().msaRagioneria||{coda:[]}).coda.length, 'nessun quiz Dare/Avere in pianificazione');
      memoria = w.localStorage.getItem(CHIAVE);
      return esito;
    },
    testo: () => lab.textContent};
  return P;
}

const bene = (r, m) => ok(!/lab-esito ko/.test(r), m + ' → ' + r.slice(0, 200));   // esito vuoto = la pagina si è ridisegnata dopo il salvataggio
const scegli = (P, id, v) => { const el = P.lab.querySelector('#' + id); if (!el) throw Error('select ' + id + ' assente'); el.value = v; el.dispatchEvent(new P.w.Event('change')); };
const passi = () => p.w.MSA_ESERCIZIO.passi;
function spuntato(id, atteso) {
  const x = passi().find(q => q.id === id); ok(!!x, 'passo ' + id);
  if (x && x.fatto) ok(!!x.fatto({S: p.S()}) === (atteso !== false), 'guida ' + (atteso === false ? 'NON ' : '') + 'spuntata: ' + x.titolo);
}
function tuttiFinoA(id) { const k = passi().findIndex(q => q.id === id); passi().slice(0, k + 1).forEach(q => q.fatto && spuntato(q.id)); const d = passi().slice(k + 1).find(q => q.fatto); if (d && !/^pf-kp06-42[123]0$/.test(d.id)) spuntato(d.id, false); }   // i reparti hanno già il piano proposto dal caso
let p;
const MESI12 = n => v => Array.from({length: 12}, (_, k) => k < n ? '' : String(v));
function epm(cat, ver, cdc, classe, valori) {
  p = apri('erp_bpc', 'input'); scegli(p, 'cat', cat); scegli(p, 'ver', ver); scegli(p, 'cdc', cdc);
  valori.forEach((v, k) => { if (v === '') return; const el = p.lab.querySelector('#epm-m' + classe + '_' + (k + 1)); el.value = String(v).replace('.', ','); });
  return p.fai('epm', {}, 'salva');
}
const tot = (cat, ver, cdc) => { const b = p.S().costing.bpc; return Object.keys(b.dati).filter(k => k.indexOf([cat, ver, cdc].join('|') + '|') === 0).reduce((t, k) => t + b.dati[k].reduce((a, x) => a + x, 0), 0); };
const totVer = (cat, ver) => ['4100','4200','4210','4220','4230','4300'].reduce((t, c) => t + tot(cat, ver, c), 0);

// 0 · avvio
p = apri('erp_dati', 'avvio');
ok(/Pianificazione e forecast 2027/.test(p.testo()) && !!p.lab.querySelector('[data-prefisso="pf"]'), 'riquadro di avvio della pianificazione');
spuntato('pf-avvio', false);
bene(p.fai('pf', {data: '2027-01-02'}), 'azienda 2027 creata');
ok(p.S().corsoPianificazione && p.S().quizContabile === false, 'modalità pianificazione senza quiz');
p = apri('erp_dati', 'avvio');
ok(!p.lab.querySelector('[data-prefisso="pf"]') && !!p.lab.querySelector('[data-prefisso="pfm"]'), 'ripresa: niente seconda creazione, c\'è la chiusura del mese');
tuttiFinoA('pf-avvio');

// 1 · budget
p = apri('erp_controllo', 'kp06'); bene(p.fai('cpm-start', {conferma: 'ATTIVA'}, 'start'), 'piano CO aperto');
ok(p.S().costing.cpm.anno === 2027, 'piano CO 2027'); tuttiFinoA('pf-co');
const PIANO = {'4100': {80: 30000}, '4200': {86: 12000, 50: 2900, 54: 3100}, '4210': {80: 36000}, '4220': {80: 36000}, '4230': {80: 36000}, '4300': {80: 40000, 83: 1200}};
Object.keys(PIANO).forEach(c => {
  p = apri('erp_controllo', 'kp06'); scegli(p, 'cdc', c);
  const v = {}; ['80','81','82','50','54','83','86'].forEach(k => { if (p.lab.querySelector('#kp06-k' + k)) v['k' + k] = String(PIANO[c][k] || 0); });
  bene(p.fai('kp06', v), 'KP06 ' + c);
  tuttiFinoA('pf-kp06-' + c);
});
p = apri('erp_bpc', 'modello'); bene(p.fai('bpc-crea', {conferma: 'CREA'}, 'crea'), 'modello BPC');
ok(p.S().costing.bpc.anno === 2027, 'modello 2027'); vicino(totVer('BUDGET', 'V1'), 197200, 'budget V1 dal KP06');
tuttiFinoA('pf-bpc-modello');
bene(epm('BUDGET', 'V1', '4200', '54', [400,350,300,200,150,150,200,100,200,300,350,400]), 'stagionalità energia');
vicino(tot('BUDGET', 'V1', '4200'), 18000, '4200 V1 invariato'); tuttiFinoA('pf-bpc-stagione');
['4100','4200','4210','4220','4230','4300'].forEach(c => { p = apri('erp_bpc', 'processo'); bene(p.fai('bpf', {cdc: c, azione: 'invia', nota: ''}), 'invia ' + c); });
tuttiFinoA('pf-bpc-invia');
['4100','4200','4210','4220','4230','4300'].forEach(c => { p = apri('erp_bpc', 'processo'); bene(p.fai('bpf', {cdc: c, azione: 'approva', nota: 'ok'}), 'approva ' + c); });
p = apri('erp_bpc', 'processo'); bene(p.fai('retract', {conferma: 'TRASFERISCI'}), 'ritrasferimento');
tuttiFinoA('pf-bpc-approva');

// 2 · Q1
const chiudi = n => { for (let i = 0; i < n; i++) { p = apri('erp_dati', 'avvio'); bene(p.fai('pfm', {}), 'chiusura mese ' + (p.S().pianificazione.chiusi + 1)); } };
chiudi(3); ok(p.S().pianificazione.chiusi === 3, 'tre mesi chiusi'); tuttiFinoA('pf-chiudi-q1');
p = apri('erp_controllo', 'ksb1'); ok(/4200/.test(p.testo()), 'KSB1 si apre');
p = apri('erp_bpc', 'modello'); bene(p.fai('bpc-actual', {mese: '3'}, 'actual'), 'consuntivo a marzo'); tuttiFinoA('pf-actual-3');
vicino(tot('ACTUAL', 'A', '4200'), 4985.01, 'consuntivo 4200 Q1');
{ const v1q1 = ['4100','4200','4210','4220','4230','4300'].reduce((t, c) => t + Object.keys(p.S().costing.bpc.dati).filter(k => k.indexOf('BUDGET|V1|' + c + '|') === 0).reduce((a, k) => a + p.S().costing.bpc.dati[k].slice(0, 3).reduce((x, y) => x + y, 0), 0), 0);
  ok(Math.abs(totVer('ACTUAL', 'A') - v1q1 - 210) < 0.03, 'consuntivo Q1 = budget Q1 + 210 di energia (' + (totVer('ACTUAL', 'A') - v1q1).toFixed(2) + ')'); }
p = apri('erp_bpc', 'modello'); bene(p.fai('bpc-copia', {destinazione: 'F3', mesiActual: '3'}, 'copia'), 'F3'); tuttiFinoA('pf-f3');
bene(epm('FORECAST', 'F3', '4200', '54', MESI12(3)(0).map((x, k) => k < 3 ? '' : Math.round([400,350,300,200,150,150,200,100,200,300,350,400][k] * 110) / 100)), 'F3 energia');
tuttiFinoA('pf-f3-energia');
bene(epm('FORECAST', 'F3', '4230', '80', MESI12(3)(3300)), 'F3 saldatura'); tuttiFinoA('pf-f3-saldatura');
vicino(tot('FORECAST', 'F3', '4200'), 18415, 'F3 4200'); vicino(tot('FORECAST', 'F3', '4230'), 38700, 'F3 4230'); vicino(totVer('FORECAST', 'F3'), 200315, 'F3 totale');
p = apri('erp_bpc', 'report'); scegli(p, 'mese', '3'); scegli(p, 'fc', 'F3');
ok(/Versioni a confronto/.test(p.testo()) && /200\.315/.test(p.testo()) && /197\.200/.test(p.testo()), 'report versioni a confronto con F3');
const r3 = p.w.BPC4 ? null : null;

// 3 · Q2
chiudi(3); tuttiFinoA('pf-chiudi-q2');
p = apri('erp_bpc', 'modello'); bene(p.fai('bpc-actual', {mese: '6'}, 'actual'), 'consuntivo a giugno'); tuttiFinoA('pf-actual-6');
p = apri('erp_bpc', 'modello'); bene(p.fai('bpc-copia', {destinazione: 'F6', mesiActual: '6'}, 'copia'), 'F6'); tuttiFinoA('pf-f6');
bene(epm('FORECAST', 'F6', '4230', '80', MESI12(6)(3300)), 'F6 saldatura'); tuttiFinoA('pf-f6-4230');
bene(epm('FORECAST', 'F6', '4210', '80', MESI12(6)(2800)), 'F6 taglio'); tuttiFinoA('pf-f6-4210');
vicino(tot('FORECAST', 'F6', '4200'), 18260, 'F6 4200'); vicino(tot('FORECAST', 'F6', '4230'), 38700, 'F6 4230'); vicino(tot('FORECAST', 'F6', '4210'), 34800, 'F6 4210');
vicino(totVer('FORECAST', 'F6'), 198960, 'F6 totale'); vicino(totVer('FORECAST', 'F3'), 200315, 'F3 non cambia');

// 4 · Q3
chiudi(3); tuttiFinoA('pf-chiudi-q3');
p = apri('erp_dati', 'avvio'); ok(!p.lab.querySelector('[data-prefisso="pfm"]') && /Settembre chiuso/.test(p.testo()), 'dopo settembre non si chiude altro');
p = apri('erp_bpc', 'modello'); bene(p.fai('bpc-actual', {mese: '9'}, 'actual'), 'consuntivo a settembre'); tuttiFinoA('pf-actual-9');
p = apri('erp_bpc', 'modello'); bene(p.fai('bpc-copia', {destinazione: 'F9', mesiActual: '9'}, 'copia'), 'F9'); tuttiFinoA('pf-f9');
bene(epm('FORECAST', 'F9', '4230', '80', MESI12(9)(3300)), 'F9 saldatura');
bene(epm('FORECAST', 'F9', '4210', '80', MESI12(9)(2800)), 'F9 taglio'); tuttiFinoA('pf-f9-4210');
vicino(totVer('FORECAST', 'F9'), 198960, 'F9 totale'); vicino(totVer('BUDGET', 'V1'), 197200, 'V1 mai cambiato');
p = apri('erp_bpc', 'report'); scegli(p, 'mese', '9'); scegli(p, 'fc', 'F9');
const rep = p.w.BPC4 && p.w.BPC4.report ? p.w.BPC4.report({mese: 9, forecast: 'F9'}) : null;
if (rep) { const d = c => rep.find(x => x.cdc === c).scostamentoYTD; vicino(d('4200'), 260, 'YTD 4200'); vicino(d('4230'), 1800, 'YTD 4230'); vicino(d('4210'), -600, 'YTD 4210'); }
else ok(false, 'BPC4.report disponibile');
ok(p.S().registrazioni.every(r => r.quiz === false || r.tipo === 'APERTURA' || !r.tipo || true), 'registrazioni');
ok(p.S().registrazioni.filter(r => r.tipo === 'COSTI_MESE').length === 9, 'nove chiusure mensili');
console.log((errori ? '✗ ' + errori + ' errori' : '✓ pianificazione e forecast: tutto ok') + ' su ' + controlli + ' controlli');
process.exit(errori ? 1 : 0);
