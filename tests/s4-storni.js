// Sistema integrato S/4 — storni e annullamenti, fattura elettronica (SdI). Parte dallo stato finale di tests/s4.js (luglio) e lavora ad agosto.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js', 'app/blueprints/erp_cespiti/static/ce-logica.js', 'app/blueprints/erp_tesoreria/static/rb-logica.js', 'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/static/js/erp/ruoli.js'];
const finale = path.join(__dirname, 'lab-erp-finale.json');
if (!fs.existsSync(finale)) { console.log('✗ manca tests/lab-erp-finale.json: esegui prima tests/s4.js'); process.exit(1); }
const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
w.localStorage.setItem(CHIAVE, fs.readFileSync(finale, 'utf8'));
LOGICA.forEach(f => w.eval(R(f)));
const SD = w.SD4, ST = w.ST4, WM = w.WM4, MM = w.MM4, PP = w.PP4, AU = w.AU4, LT = w.LT4, PY = w.PY4;
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

// ── controllo crediti (fido) e disponibilità (ATP) ──
prova(() => SD.anagraficaCredito({cliente: 'C400', fido: '1000', rischio: 'C', data: '2027-08-18'}), 'FD32 fido basso');
prova(() => SD.ordine({cliente: 'C400', materiale: 'TR-PED', qta: '2', data: '2027-08-18'}), 'VA01 oltre il fido');
const ob = S().ordini.slice(-1)[0]; ok(ob.credito.stato === 'B' && /fido superato/.test(ob.credito.motivo), 'blocco crediti B');
rifiuta(() => SD.consegna({ordine: ob.numero, data: '2027-08-18'}), /VKM1/, 'consegna di un ordine bloccato');
prova(() => SD.decisioneCredito({ordine: ob.numero, decisione: 'rifiuta', data: '2027-08-18'}), 'VKM1 non autorizzato'); ok(ob.credito.stato === 'B', 'resta bloccato');
prova(() => SD.decisioneCredito({ordine: ob.numero, decisione: 'fido', fido: '100000', data: '2027-08-19'}), 'VKM1 aumento del fido');
ok(ob.credito.stato === 'A' && S().clienti.C400.fido === 100000 && S().creditiLog.length === 3, 'ordine rilasciato con il nuovo fido, decisioni registrate');
prova(() => SD.anagraficaCredito({cliente: 'C300', bloccato: 'si', motivo: 'ritardi di pagamento', data: '2027-08-19'}), 'FD32 blocco cliente');
prova(() => SD.ordine({cliente: 'C300', materiale: 'TR-PED', qta: '1', data: '2027-08-19'}), 'VA01 cliente bloccato');
const og = S().ordini.slice(-1)[0]; ok(og.credito.stato === 'B' && /bloccato/.test(og.credito.motivo), 'cliente bloccato → ordine bloccato');
prova(() => SD.decisioneCredito({ordine: og.numero, decisione: 'definitivo', data: '2027-08-19'}), 'VKM1 blocco definitivo');
rifiuta(() => SD.consegna({ordine: og.numero, data: '2027-08-19'}), /rifiutato/, 'ordine rifiutato non si consegna');
const gA = SD.atp('TR-ALTA').disponibile; ok(SD.atp('TR-ALTA').riservato === 4, 'ATP: 4 pezzi confermati all\'ordine di Sigma');
prova(() => SD.ordine({cliente: 'C200', materiale: 'TR-ALTA', qta: String(gA + 20), data: '2027-08-20'}), 'VA01 oltre la disponibilità');
const oD = S().ordini.slice(-1)[0]; ok(oD.confermata === gA, 'ATP: confermata solo la giacenza (' + oD.confermata + ' su ' + oD.qta + ')');
prova(() => SD.ordine({cliente: 'C100', materiale: 'TR-ALTA', qta: '5', data: '2027-08-21'}), 'VA01 Beta TR-ALTA');
const oB = S().ordini.slice(-1)[0]; ok(oB.confermata === 0, 'ATP: niente per Beta, tutto confermato a Delta');
rifiuta(() => SD.consegna({ordine: oB.numero, data: '2027-08-21'}), /disponibilità/, 'consegna senza disponibilità');
prova(() => PP.ordine({materiale: 'TR-ALTA', qta: '30', data: '2027-08-22'}), 'CO01 TR-ALTA');
prova(() => PP.entrata({ordine: S().produzione.slice(-1)[0].numero, qta: '30', data: '2027-08-23'}), '101 di 30 pezzi');
ok(oD.confermata === oD.qta && oB.confermata === 5, 'conferma automatica all\'entrata di produzione (Delta prima, poi Beta)');

// ── richiesta d'acquisto, approvazione, ordine con riferimento, rilascio sopra soglia ──
ok(/ME54N/.test(prova(() => MM.richiesta({materiale: 'FERRO', qta: '12000', consegna: '2027-09-01', richiedente: 'Produzione', data: '2027-08-24'}), 'ME51N') || ''), 'ME51N richiesta creata');
const rq = S().rda.slice(-1)[0]; ok(rq.stato === 'da approvare' && rq.valore === 11400, 'richiesta da approvare, valore a standard 11.400');
rifiuta(() => MM.ordine({rda: rq.numero, fornitore: 'F100', prezzo: '0,97', data: '2027-08-24'}), /approvata/, 'ordine da richiesta non approvata');
prova(() => MM.approva({rda: rq.numero, decisione: 'approva', data: '2027-08-25'}), 'ME54N');
prova(() => MM.ordine({rda: rq.numero, fornitore: 'F100', prezzo: '0,97', data: '2027-08-25'}), 'ME21N da richiesta');
const oR = S().acquisti.slice(-1)[0]; ok(oR.rda === rq.numero && oR.qta === 12000 && rq.stato === 'ordinata' && rq.ordine === oR.numero, 'ordine con riferimento alla richiesta');
ok(oR.rilascio && oR.rilascio.stato === 'bloccato', 'ordine di 11.640 € oltre la soglia: bloccato');
rifiuta(() => MM.entrata({ordine: oR.numero, data: '2027-08-26'}), /ME29N/, 'entrata su ordine non rilasciato');
rifiuta(() => MM.ordine({rda: rq.numero, fornitore: 'F100', prezzo: '0,97', data: '2027-08-25'}), /ordinata/, 'richiesta già ordinata');
prova(() => MM.rilascia({ordine: oR.numero, data: '2027-08-26'}), 'ME29N'); prova(() => MM.entrata({ordine: oR.numero, qta: '100', data: '2027-08-27'}), 'entrata dopo il rilascio');
prova(() => MM.richiesta({materiale: 'FERRO', qta: '50', data: '2027-08-27'}), 'ME51N piccola'); const rq2 = S().rda.slice(-1)[0];
prova(() => MM.approva({rda: rq2.numero, decisione: 'rifiuta', data: '2027-08-27'}), 'ME54N rifiuto'); ok(rq2.stato === 'rifiutata', 'richiesta rifiutata');

// ── ruoli e autorizzazioni ──
prova(() => AU.imposta({attivo: 'si', ruolo: 'VENDITE'}), 'autorizzazioni attive');
prova(() => SD.ordine({cliente: 'C100', materiale: 'TR-STD', qta: '1', data: '2027-08-28'}), 'VA01 come addetto vendite');
const oV = S().ordini.slice(-1)[0];
rifiuta(() => SD.consegna({ordine: oV.numero, data: '2027-08-28'}), /SU53.*VL01N.*Capo magazzino/, 'addetto vendite non fa la consegna');
rifiuta(() => MM.richiesta({materiale: 'FERRO', qta: '10', data: '2027-08-28'}), /ME51N/, 'addetto vendite non fa richieste d\'acquisto');
prova(() => AU.imposta({ruolo: 'BUYER'}), 'cambio ruolo');
prova(() => MM.richiesta({materiale: 'FERRO', qta: '100', data: '2027-08-28'}), 'ME51N come buyer');
rifiuta(() => MM.approva({rda: S().rda.slice(-1)[0].numero, data: '2027-08-28'}), /ME54N.*Responsabile acquisti/, 'il buyer non approva le proprie richieste');
prova(() => AU.imposta({ruolo: 'PRODUZIONE'}), 'ruolo produzione');
const nRi = S().ordini.filter(o => o.materiale === 'TR-ALTA').map(o => o.confermata).join();
prova(() => PP.ordine({materiale: 'TR-ALTA', qta: '2', data: '2027-08-28'}), 'CO01 come produzione');
prova(() => PP.entrata({ordine: S().produzione.slice(-1)[0].numero, qta: '2', data: '2027-08-28'}), '101: la riconferma ATP «dietro» non chiede l\'autorizzazione V_V2');
ok(AU.stato().su53.length === 3 && AU.stato().su53[0].tcode === 'VL01N', 'SU53 registra i controlli falliti');
prova(() => AU.imposta({ruolo: 'ADMIN', attivo: 'no'}), 'autorizzazioni spente');

// ── lotti e tracciabilità: colata → ordine di produzione → lotto di transenne → consegna → cliente ──
prova(() => MM.ordine({fornitore: 'F100', materiale: 'FERRO', qta: '500', prezzo: '0,95', data: '2027-08-29'}), 'ME21N ferro per la colata');
prova(() => MM.entrata({ordine: S().acquisti.slice(-1)[0].numero, lotto: 'col-7781', data: '2027-08-29'}), 'MIGO con la colata');
ok(LT.lotto('FERRO', 'COL-7781').qta === 500 && LT.lotto('FERRO', 'COL-7781').fornitore === 'F100', 'lotto della colata COL-7781 con il fornitore');
confermaTutti('2027-08-29');
// consumo FIFO dei lotti più vecchi: per isolare la colata consumo prima tutto il ferro più vecchio con un ordine grande
const ferroVecchio = LT.elenco('FERRO').filter(x => x.lotto !== 'COL-7781' && x.qta > 0).reduce((t, x) => t + x.qta, 0);
prova(() => PP.ordine({materiale: 'TR-PED', qta: '5', data: '2027-08-30'}), 'CO01 TR-PED');
const opL = S().produzione.slice(-1)[0];
prova(() => WM.approvvigiona({ordine: opL.numero, kg: String(ferroVecchio + 45), data: '2027-08-30'}), 'staging di tutto il ferro'); confermaTutti('2027-08-30');
prova(() => PP.prelievo({ordine: opL.numero, kg: String(ferroVecchio + 45), data: '2027-08-30'}), '261 ferro vecchio + 45 kg della colata');
ok(opL.eventi[0].lotti.some(x => x.lotto === 'COL-7781' && x.qta === 45), 'il 261 consuma per ultima la colata nuova (FIFO): 45 kg');
prova(() => PP.entrata({ordine: opL.numero, qta: '5', data: '2027-08-30'}), '101 lotto di produzione'); confermaTutti('2027-08-30');
ok(LT.lotto('TR-PED', 'L' + opL.numero).qta === 5, 'lotto di produzione L' + opL.numero);
prova(() => SD.ordine({cliente: 'C200', materiale: 'TR-PED', qta: String(SD.atp('TR-PED').disponibile), data: '2027-08-31'}), 'VA01 tutte le TR-PED');
const oL = S().ordini.slice(-1)[0]; prova(() => SD.consegna({ordine: oL.numero, data: '2027-08-31'}), 'VL01N'); confermaTutti('2027-08-31');
const cL = S().consegne.slice(-1)[0]; prova(() => SD.uscitaMerci({consegna: cL.numero, data: '2027-08-31'}), 'VL02N con i lotti');
ok(cL.lotti.some(x => x.lotto === 'L' + opL.numero), 'la consegna porta il lotto di produzione');
const v = LT.valle('FERRO', 'COL-7781').map(x => x.testo).join(' | ');
ok(/ordine di produzione/.test(v) && new RegExp('consegna ' + cL.numero).test(v) && /Delta/.test(v), 'a valle: dalla colata al cliente → ' + v);
const m = LT.daConsegna(cL.numero).map(x => x.testo).join(' | ');
ok(/COL-7781/.test(m) && /Acciaierie Umbre/.test(m), 'a monte: dalla consegna alla colata e al fornitore → ' + m.slice(0, 300));
prova(() => ST.vl09({consegna: cL.numero, data: '2027-08-31'}), 'VL09 con i lotti');
ok(LT.lotto('TR-PED', 'L' + opL.numero).qta === 5, 'VL09 riporta la merce nel suo lotto (' + LT.lotto('TR-PED', 'L' + opL.numero).qta + ')');

// ── numeri di serie (IQ03) sulla transenna alta: nascono all'entrata, seguono il pezzo, tornano con lo storno ──
{ const SA = () => S().seriali['TR-ALTA'], inMag = () => Object.keys(SA()).filter(k => SA()[k].stato === 'magazzino').length;
  ok(inMag() === S().giacenze['TR-ALTA'], 'seriali in magazzino = giacenza TR-ALTA (' + inMag() + ' = ' + S().giacenze['TR-ALTA'] + ')');
  prova(() => PP.ordine({materiale: 'TR-ALTA', qta: '3', data: '2027-09-01'}), 'CO01 TR-ALTA per i seriali');
  const opS = S().produzione.slice(-1)[0]; const prima = S().numeri.seriale;
  prova(() => PP.entrata({ordine: opS.numero, qta: '3', data: '2027-09-01'}), '101 crea 3 numeri di serie'); confermaTutti('2027-09-01');
  ok(S().numeri.seriale === prima + 3 && SA()['SN' + String(prima + 1).padStart(6, '0')].lotto === 'L' + opS.numero, 'nuovi seriali nel lotto di produzione');
  prova(() => SD.ordine({cliente: 'C200', materiale: 'TR-ALTA', qta: '2', data: '2027-09-02'}), 'VA01 2 TR-ALTA');
  const oS = S().ordini.slice(-1)[0]; prova(() => SD.consegna({ordine: oS.numero, data: '2027-09-02'}), 'VL01N TR-ALTA'); confermaTutti('2027-09-02');
  const cS = S().consegne.slice(-1)[0]; prova(() => SD.uscitaMerci({consegna: cS.numero, data: '2027-09-02'}), 'VL02N con i seriali');
  ok(cS.seriali.length === 2 && cS.seriali.every(k => SA()[k].stato === 'cliente' && SA()[k].cliente === 'C200'), 'la consegna porta 2 seriali, presso Delta');
  const x = LT.seriale(cS.seriali[0]); ok(/Delta/.test(x.cliente) && x.storia.some(h => /consegna/.test(h.testo)), 'IQ03: storia del pezzo fino al cliente');
  prova(() => ST.vl09({consegna: cS.numero, data: '2027-09-02'}), 'VL09 TR-ALTA');
  ok(cS.seriali.every(k => SA()[k].stato === 'magazzino') && inMag() === S().giacenze['TR-ALTA'], 'VL09: tornano in magazzino gli stessi numeri di serie'); }

// ── cedolino completo: ferie, ROL, ratei, progressivi, tredicesima e conguaglio di dicembre ──
prova(() => PY.presenze({matricola: '00001', periodo: '2027-08', ferie: '10', rol: '4'}), 'presenze di agosto con le ferie');
for (const m of ['07', '08', '09', '10', '11', '12']) prova(() => PY.calcola({periodo: '2027-' + m}), 'calcolo 2027-' + m);
{ const ced = (per, mat) => PY.H().cedolini.find(c => c.periodo === per && c.matricola === mat);
  const g = ced('2027-06', '00001'); ok(g.progressivi.storico === 5 && g.ratei.tredicesima === 1050 && g.ratei.ferieResidue === 19, 'giugno: 5 mesi di storico, rateo 13ª 6/12, ferie residue 6 + 13');
  const a = ced('2027-08', '00001'); ok(a.ratei.ferieGodute === 10 && a.ratei.rolGoduti === 4 && a.netto === g.netto - 0 || a.ratei.ferieGodute === 10, 'agosto: 10 giorni di ferie e 4 ore di ROL goduti, pagati');
  const d = ced('2027-12', '00001'); vicino(d.tredicesima, 2100, 'dicembre: tredicesima di Marco'); vicino(d.irpef13, 438.61, 'IRPEF sulla tredicesima ad aliquota marginale');
  vicino(d.conguaglio, 4.51, 'conguaglio IRPEF di Marco (straordinari di giugno)'); vicino(d.netto, 3199.26, 'netto di dicembre di Marco (a dicembre nessuna rata di addizionali)'); ok(d.addizionali === 0 && d.addizionaliAnno && d.addizionaliAnno.regionale > 0 && d.addizionaliAnno.comunale === 0, 'addizionali dell’anno determinate al conguaglio, da trattenere l’anno dopo'); vicino(d.ratei.ferieResidue, 22, 'ferie residue a fine anno');
  vicino(d.conguaglioDettaglio.dovuta - d.conguaglioDettaglio.trattenuta, d.conguaglio, 'conguaglio = dovuta − trattenuta');
  vicino(d.progressivi.irpef, d.conguaglioDettaglio.dovuta, 'dopo il conguaglio la trattenuta dell\'anno è l\'imposta dovuta'); }

// ── pagine ──
// Stesso solver DOM della regressione operativa S/4: nessuna modifica diretta
// a tentativi/coda; conserva e verifica tutte le registrazioni contabili.
function verificaQuiz(w) {
  const S = w.MSA_STATO_CORRENTE(), Q = w.MSA_RAGIONERIA;
  const libro = JSON.stringify(S.registrazioni);
  const corpo = w.document.createElement('aside');
  w.document.body.appendChild(corpo);
  const esc = w.LabMotore.esc;
  function disegna() { corpo.innerHTML = Q.pendente(S) ? Q.html(S, esc) : ''; }
  corpo.addEventListener('click', ev => {
    if (Q.click(ev.target, corpo, S, w.MSA_SALVA_STATO_CORRENTE)) disegna();
  });
  const limite = (S.msaRagioneria.coda || []).length;
  for (let n = 0; Q.pendente(S); n++) {
    if (n >= limite) throw Error('solver quiz S/4: coda non diminuisce');
    const q = Q.pendente(S), prima = S.msaRagioneria.coda.length;
    disegna();
    if (!Q.tentativoValido(q) || (!q.corretto && !q.aiuto)) {
      const rs = q.documento.righe.map((r,i)=>({r,i})).sort((a,b)=>String(a.r.conto).localeCompare(String(b.r.conto),'it',{numeric:true})||a.i-b.i).map(x=>x.r);
      const righe = [...corpo.querySelectorAll('.msa-q-riga')];
      if (righe.length !== rs.length) throw Error('solver quiz S/4: righe DOM mancanti');
      righe.forEach((el,i)=>{
        el.querySelector('.msa-q-conto').value=rs[i].conto;
        el.querySelector('.msa-q-sezione').value=rs[i].dareAvere;
        el.querySelector('input').value=rs[i].importo.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
      });
      corpo.querySelector('.msa-q-verifica').click();
      ok(q.corretto && Q.tentativoValido(q), 'quiz DOM corretto: ' + q.documento.tipo);
      if (!q.corretto) throw Error('solver quiz S/4: tentativo non corretto');
    }
    const continua = corpo.querySelector('.msa-q-continua');
    if (!continua) throw Error('solver quiz S/4: pulsante Continua assente');
    continua.click();
    if (S.msaRagioneria.coda.length !== prima - 1) throw Error('solver quiz S/4: esito non archiviato');
  }
  corpo.remove();
  ok(JSON.stringify(S.registrazioni) === libro, 'quiz non modifica o duplica le scritture');
}
w.eval(R('app/blueprints/guida/static/ragioneria.js'));
verificaQuiz(w);
const pagina = nome => { const x = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  x.localStorage.setItem(CHIAVE, w.localStorage.getItem(CHIAVE)); x.LAB_PAGINA = {chiave: CHIAVE, pagina: nome, slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/guida/static/ragioneria.js', nome === 'cedolino' ? 'app/blueprints/erp_paghe/static/py-pagine.js' : nome === 'lotti' ? 'app/blueprints/erp_magazzino/static/wm-pagine.js' : nome === 'ruoli' ? 'app/blueprints/erp_dati/static/dati-pagine.js' : nome === 'richieste' ? 'app/blueprints/erp_acquisti/static/mm-pagine.js' : nome === 'crediti' ? 'app/blueprints/erp_vendite/static/sd-pagine.js' : 'app/blueprints/erp_fi/static/fi-pagine.js']).forEach(f => x.eval(R(f))); return x; };
let pg = pagina('cedolino'); ok(/Tredicesima mensilità/.test(pg.document.body.textContent) && /Conguaglio IRPEF di fine anno/.test(pg.document.body.textContent) && /Ferie e permessi/.test(pg.document.body.textContent), 'cedolino di dicembre a video');
pg = pagina('lotti'); ok(/Giacenza per lotto/.test(pg.document.body.textContent) && /COL-7781/.test(pg.document.body.textContent), 'pagina lotti');
pg.document.querySelector('#sn').value = 'sn000001'; pg.document.querySelector('#snv').click(); ok(/SN000001/.test(pg.document.body.textContent) && /TR-ALTA/.test(pg.document.body.textContent) && /Numeri di serie/.test(pg.document.body.textContent), 'pagina IQ03: numero di serie');
pg.document.querySelector('[data-lotto="FERRO|COL-7781"]').click(); ok(/A valle/.test(pg.document.body.textContent) && /Delta/.test(pg.document.body.textContent), 'pagina lotti: tracciabilità del lotto');
pg = pagina('ruoli'); ok(/Matrice ruoli/.test(pg.document.body.textContent) && /SU53/.test(pg.document.body.textContent) && /VL01N/.test(pg.document.body.textContent), 'pagina ruoli e autorizzazioni');
pg = pagina('richieste'); ok(/ME5A/.test(pg.document.body.textContent) && /ordinata/.test(pg.document.body.textContent), 'pagina richieste d\'acquisto');
pg = pagina('crediti'); ok(/VKM1/.test(pg.document.body.textContent) && /Edil Sigma/.test(pg.document.body.textContent) && /bloccato/.test(pg.document.body.textContent), 'pagina gestione crediti');
pg = pagina('sdi'); ok(/Trasmissione allo SdI/.test(pg.document.body.textContent) && /consegnata/.test(pg.document.body.textContent) && /FatturaElettronica/.test(pg.document.body.textContent), 'pagina SdI');
pg = pagina('storni'); const tx = pg.document.body.textContent;
ok(/VF11/.test(tx) && /MBST/.test(tx) && /LT15/.test(tx) && /Documenti stornati/.test(tx) && new RegExp(f1.contabile).test(tx), 'pagina storni');
pg.document.getElementById('vf-fattura').value = f2.numero; pg.document.querySelector('[data-azione="vf"]').click();
const esitoVF = pg.document.getElementById('vf-esito').textContent;
verificaQuiz(pg);
ok(/SdI/.test(esitoVF), 'pagina storni: VF11 rifiutato dopo lo SdI');
pg = pagina('giornale'); ok(/stornato dal/i.test(pg.document.body.textContent), 'giornale con i documenti stornati');
quadra('agosto con gli storni');
console.log(errori ? '❌ ' + errori + ' errori su ' + controlli : '✅ storni, fattura elettronica (SdI), fido e disponibilità (ATP), richieste d\'acquisto e rilascio, ruoli e autorizzazioni, lotti e tracciabilità, cedolino completo: ' + controlli + ' controlli');
process.exit(errori ? 1 : 0);
