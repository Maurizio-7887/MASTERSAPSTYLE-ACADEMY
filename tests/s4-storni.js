// Sistema integrato S/4 — storni e annullamenti, fattura elettronica (SdI). Parte dallo stato finale di tests/s4.js (luglio) e lavora ad agosto.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js'];
const finale = path.join(__dirname, 'lab-erp-finale.json');
if (!fs.existsSync(finale)) { console.log('✗ manca tests/lab-erp-finale.json: esegui prima tests/s4.js'); process.exit(1); }
const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
w.localStorage.setItem(CHIAVE, fs.readFileSync(finale, 'utf8'));
LOGICA.forEach(f => w.eval(R(f)));
const SD = w.SD4, ST = w.ST4, WM = w.WM4, MM = w.MM4, PP = w.PP4;
SD.avvia(CHIAVE); const S = () => w.MSA_STATO_CORRENTE();
S().wm.ondate = false;
const prova = (f, m) => { try { return f(); } catch (e) { ok(false, m + ' → ' + e.message); return null; } };
const rifiuta = (f, re, m) => { try { f(); ok(false, m + ': doveva essere rifiutato'); } catch (e) { ok(re.test(e.message), m + ' → ' + e.message); } };
const confermaTutti = d => WM.aperti().forEach(t => WM.conferma({compito: t.numero, data: d}));
const saldo = (c, p) => SD.N.saldo(c, p);
const quadra = m => { let d = 0, a = 0; S().registrazioni.forEach(r => r.righe.forEach(x => { if (x.dareAvere === 'DARE') d += x.importo; else a += x.importo; })); ok(Math.abs(d - a) < 0.005, m + ': Dare = Avere'); };
confermaTutti('2027-08-02');

// ── vendita da stornare: ordine, consegna, prelievo, uscita merci, fattura ──
const cli0 = saldo('11', 'C100');
prova(() => SD.ordine({cliente: 'C100', materiale: 'TR-PED', qta: '5', data: '2027-08-02'}), 'VA01');
const o1 = S().ordini.slice(-1)[0];
prova(() => SD.consegna({ordine: o1.numero, data: '2027-08-02'}), 'VL01N');
const c1 = S().consegne.slice(-1)[0];
confermaTutti('2027-08-02'); prova(() => SD.uscitaMerci({consegna: c1.numero, data: '2027-08-02'}), 'VL02N');
prova(() => SD.fattura({consegna: c1.numero, data: '2027-08-03'}), 'VF01');
let f1 = S().fatture.slice(-1)[0];
rifiuta(() => ST.vl09({consegna: c1.numero, data: '2027-08-03'}), /già fatturata/, 'VL09 su consegna fatturata');
rifiuta(() => ST.fb08({documento: f1.contabile}), /VF11/, 'FB08 su una fattura: va stornata con VF11');
// VF11 prima dell'invio allo SdI
const rS = prova(() => ST.vf11({fattura: f1.numero, data: '2027-08-03'}), 'VF11');
ok(rS && rS.stornoDi === f1.contabile && f1.stornata === '2027-08-03', 'VF11: documento di storno collegato');
vicino(saldo('11', 'C100'), cli0, 'VF11: credito verso Beta tornato com\'era');
ok(!c1.fatturata && S().fatture.slice(-1)[0].tipo === 'S1', 'VF11: consegna di nuovo da fatturare, documento S1');
vicino(S().copa.filter(r => r.doc === f1.numero || r.doc === 'S ' + f1.numero).reduce((t, r) => t + r.ricaviLordi, 0), 0, 'VF11: CO-PA azzerata');
rifiuta(() => ST.vf11({fattura: f1.numero}), /già stornata/, 'doppio storno');
rifiuta(() => ST.inviaSdi({fattura: f1.numero}), /stornato/, 'fattura stornata non si trasmette');
// rifatturo, trasmetto allo SdI: lo storno non è più possibile
prova(() => SD.fattura({consegna: c1.numero, data: '2027-08-04'}), 'VF01 di nuovo');
const f2 = S().fatture.slice(-1)[0];
const xml = ST.fatturaPA(f2.numero); ok(/<TipoDocumento>TD01<\/TipoDocumento>/.test(xml) && /Beta/.test(xml) && /<AliquotaIVA>22.00/.test(xml), 'anteprima FatturaPA');
ok(/SdI/.test(prova(() => ST.inviaSdi({fattura: f2.numero, data: '2027-08-04'}), 'invio SdI') || ''), 'invio allo SdI');
rifiuta(() => ST.inviaSdi({fattura: f2.numero}), /Già trasmesso/, 'doppio invio');
rifiuta(() => ST.vf11({fattura: f2.numero, data: '2027-08-05'}), /SdI.*nota di credito/, 'VF11 dopo lo SdI: si fa la nota di credito');
// incasso e storno dell'incasso (FB08)
prova(() => SD.incasso({cliente: 'C100', importo: f2.totale, rif: f2.numero, data: '2027-08-10'}), 'F-28');
const inc = S().registrazioni.slice(-1)[0];
vicino(saldo('11', 'C100'), cli0, 'incasso');
const rI = prova(() => ST.fb08({documento: inc.numero, data: '2027-08-11'}), 'FB08 incasso');
ok(rI && inc.stornato === rI.numero, 'FB08: incasso stornato'); vicino(saldo('11', 'C100'), cli0 + f2.totale, 'FB08: la partita si riapre');
rifiuta(() => ST.fb08({documento: rI.numero}), /storno/, 'non si storna uno storno');

// ── VL09: uscita merci stornata e rifatta ──
prova(() => SD.ordine({cliente: 'C200', materiale: 'TR-PED', qta: '5', data: '2027-08-05'}), 'VA01 Delta');
const o2 = S().ordini.slice(-1)[0]; prova(() => SD.consegna({ordine: o2.numero, data: '2027-08-05'}), 'VL01N Delta');
const c2 = S().consegne.slice(-1)[0]; confermaTutti('2027-08-05'); prova(() => SD.uscitaMerci({consegna: c2.numero, data: '2027-08-05'}), 'VL02N Delta');
const gP = S().giacenze['TR-PED'];
prova(() => ST.vl09({consegna: c2.numero, data: '2027-08-06'}), 'VL09');
ok(S().giacenze['TR-PED'] === gP + 5 && c2.pgi === false && o2.consegnato === 0, 'VL09: merce di nuovo in giacenza, consegna senza uscita');
ok(S().movimenti.slice(-1)[0].tipo === '602', 'VL09: movimento 602');
prova(() => SD.uscitaMerci({consegna: c2.numero, data: '2027-08-07'}), 'uscita merci rifatta dopo VL09');
ok(S().giacenze['TR-PED'] === gP, 'uscita rifatta');

// ── eliminazione della consegna con prelievo in corso ──
prova(() => SD.ordine({cliente: 'C400', materiale: 'TR-ALTA', qta: '4', data: '2027-08-08'}), 'VA01 Sigma');
const o3 = S().ordini.slice(-1)[0]; prova(() => SD.consegna({ordine: o3.numero, data: '2027-08-08'}), 'VL01N Sigma');
const c3 = S().consegne.slice(-1)[0], t3 = WM.compitiDi(c3.numero);
ok(t3.length > 0 && t3.every(t => t.stato === 'aperto'), 'compiti di prelievo aperti');
// LT15: annulla e ricrea il primo compito
const vecchio = t3[0].numero; const msgLt = prova(() => ST.lt15({compito: vecchio, motivo: 'scaffale inaccessibile', data: '2027-08-08'}), 'LT15') || '';
ok(/annullato/.test(msgLt) && WM.compitiDi(c3.numero).some(t => t.stato === 'aperto' && t.numero !== vecchio), 'LT15: compito annullato e ricreato');
const msgEl = prova(() => ST.eliminaConsegna({consegna: c3.numero, data: '2027-08-08'}), 'elimina consegna') || '';
ok(/eliminata/.test(msgEl) && !S().consegne.some(c => c.numero === c3.numero) && WM.aperti().every(t => t.consegna !== c3.numero), 'consegna eliminata, compiti annullati');

// ── acquisti: MBST e MR8M ──
const gF = S().giacenze.FERRO;
prova(() => MM.ordine({fornitore: 'F100', materiale: 'FERRO', qta: '2000', prezzo: '0,98', data: '2027-08-09'}), 'ME21N');
const oa = S().acquisti.slice(-1)[0];
prova(() => MM.entrata({ordine: oa.numero, qta: '1000', data: '2027-08-10'}), 'MIGO 101');
const e1 = oa.entrate[0], mlPD0 = S().mlPD.length;
prova(() => ST.mbst({doc: e1.doc, data: '2027-08-10'}), 'MBST');
ok(S().giacenze.FERRO === gF && oa.entrato === 0 && e1.stornato, 'MBST: giacenza e ordine tornati');
vicino(e1.pd, 30, 'differenza prezzo dell\'entrata'); vicino(S().mlPD.slice(mlPD0).reduce((t, x) => t + x.pd, 0), -e1.pd, 'MBST: differenza prezzo stornata nel Material Ledger');
ok(WM.quanti(q => q.rif === e1.doc).length === 0, 'MBST: quanti in zona di ricevimento tolti');
prova(() => MM.entrata({ordine: oa.numero, qta: '1000', data: '2027-08-11'}), 'MIGO 101 di nuovo');
const e2 = oa.entrate[1]; confermaTutti('2027-08-11');
rifiuta(() => ST.mbst({doc: e2.doc}), /messa a posto/, 'MBST dopo la messa a scaffale');
prova(() => MM.fattura({ordine: oa.numero, rif: 'AU-881', data: '2027-08-12'}), 'MIRO');
const ff = S().fattureFornitore.slice(-1)[0];
rifiuta(() => ST.mbst({doc: e2.doc}), /fatturata/, 'MBST con fattura');
prova(() => ST.mr8m({fattura: ff.numero, data: '2027-08-12'}), 'MR8M');
ok(ff.stornata && oa.fatturato === 0, 'MR8M: fattura stornata, si può rifatturare');

// ── produzione: 262 e CO13 ──
prova(() => PP.ordine({materiale: 'TR-ALTA', qta: '10', data: '2027-08-16'}), 'CO01');
const op = S().produzione.slice(-1)[0];
prova(() => WM.approvvigiona({ordine: op.numero, kg: '100', data: '2027-08-16'}), 'staging'); confermaTutti('2027-08-16');
prova(() => PP.prelievo({ordine: op.numero, kg: '100', data: '2027-08-16'}), '261'); prova(() => PP.conferma({ordine: op.numero, ore: '3', data: '2027-08-16'}), 'CO11N');
ok(PP.stato(op) === 'PCNF', 'ordine parzialmente confermato');
const gF2 = S().giacenze.FERRO;
prova(() => ST.produzione({ordine: op.numero, evento: 1, data: '2027-08-17'}), 'CO13');
ok(PP.stato(op) === 'REL' && PP.effettivi(op).lav + PP.effettivi(op).set === 0, 'CO13: conferma annullata');
prova(() => ST.produzione({ordine: op.numero, evento: 0, data: '2027-08-17'}), '262');
ok(S().giacenze.FERRO === gF2 + 100 && PP.effettivi(op).mat === 0 && WM.inUbic('PSA-L1').some(q => q.mat === 'FERRO'), '262: ferro di nuovo nel PSA');
vicino(saldo('70', op.numero) + saldo('72', op.numero), 0, 'ordine senza costi');

// ── pagine ──
const pagina = nome => { const x = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  x.localStorage.setItem(CHIAVE, w.localStorage.getItem(CHIAVE)); x.LAB_PAGINA = {chiave: CHIAVE, pagina: nome, slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/erp_fi/static/fi-pagine.js']).forEach(f => x.eval(R(f))); return x; };
let pg = pagina('sdi'); ok(/Trasmissione allo SdI/.test(pg.document.body.textContent) && /consegnata/.test(pg.document.body.textContent) && /FatturaElettronica/.test(pg.document.body.textContent), 'pagina SdI');
pg = pagina('storni'); const tx = pg.document.body.textContent;
ok(/VF11/.test(tx) && /MBST/.test(tx) && /LT15/.test(tx) && /Documenti stornati/.test(tx) && new RegExp(f1.contabile).test(tx), 'pagina storni');
pg.document.getElementById('vf-fattura').value = f2.numero; pg.document.querySelector('[data-azione="vf"]').click();
ok(/SdI/.test(pg.document.getElementById('vf-esito').textContent), 'pagina storni: VF11 rifiutato dopo lo SdI');
pg = pagina('giornale'); ok(/stornato dal/.test(pg.document.body.textContent), 'giornale con i documenti stornati');
quadra('agosto con gli storni');
console.log(errori ? '❌ ' + errori + ' errori su ' + controlli : '✅ storni e fattura elettronica: ' + controlli + ' controlli');
process.exit(errori ? 1 : 0);
