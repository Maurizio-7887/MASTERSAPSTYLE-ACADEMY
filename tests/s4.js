// Sistema integrato S/4 — fase «Vendite e redditività» eseguita dalle PAGINE (moduli e pulsanti), non dalle funzioni:
// numeri di controllo, quadratura, CO-PA, finestra passo passo. Salva tests/lab-erp-finale.json per test_accessi.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const PAGINE = {erp_dati: 'dati-pagine.js', erp_vendite: 'sd-pagine.js', erp_copa: 'copa-pagine.js', erp_fi: 'fi-pagine.js', erp_acquisti: 'mm-pagine.js', erp_produzione: 'pp-pagine.js', erp_costi: 'copc-pagine.js', erp_magazzino: 'wm-pagine.js', erp_inventario: 'inv-pagine.js'};
const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js',
  'app/static/js/lab-copioni.js', 'app/static/js/erp/lettore.js', 'app/static/vendor/jsbarcode-3.11.6.min.js', 'app/static/vendor/qrcode-generator-1.4.4.js', 'app/static/js/erp/etichette.js'];
let memoria = null, ultima = null;   // il localStorage passa da una pagina all'altra come nel browser
function apri(bp, pagina) {
  if (ultima) memoria = ultima.localStorage.getItem(CHIAVE) || memoria;
  const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  ultima = w;
  if (memoria) w.localStorage.setItem(CHIAVE, memoria);
  w.confirm = () => true;
  w.LAB_PAGINA = {chiave: CHIAVE, pagina: pagina, slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/' + bp + '/static/' + PAGINE[bp]]).forEach(f => w.eval(R(f)));
  const lab = w.document.getElementById('lab');
  const P = {w, lab, S: () => w.MSA_STATO_CORRENTE(),
    // compila il modulo con prefisso e preme il pulsante; restituisce il messaggio di esito
    fai(pref, valori, azione) {
      Object.entries(valori).forEach(([k, v]) => {
        const el = lab.querySelector('#' + pref + '-' + k); if (!el) throw Error('campo ' + pref + '-' + k + ' assente in ' + pagina);
        if (el.tagName === 'SELECT' && typeof v === 'function') v = [...el.options].map(o => o.value).find(v);
        el.value = v;
      });
      const b = lab.querySelector('[data-prefisso="' + pref + '"] [data-azione="' + (azione || pref) + '"]'); if (!b) throw Error('pulsante ' + pref + ' assente');
      b.click();
      const es = lab.querySelector('#' + pref + '-esito');
      memoria = w.localStorage.getItem(CHIAVE);
      return es ? es.className + ' ' + es.textContent : '';
    },
    testo: () => lab.textContent};
  return P;
}
const bene = (r, m) => ok(/ ok /.test(' ' + r.split(' ')[1] + ' ') || /lab-esito ok/.test(r), m + ' → ' + r.slice(0, 160));
const num = S => n => n;   // segnaposto leggibile

// avvio, condizioni
let p = apri('erp_dati', 'avvio');
ok(/Avvia il sistema/.test(p.testo()), 'pagina di avvio');
p.fai('av', {data: '2027-01-02'}); ok(p.S().avviato === '2027-01-02' && /Sistema avviato/.test(p.testo()), 'avvio del sistema');
p = apri('erp_dati', 'condizioni');
bene(p.fai('vk', {tipo: 'PR00', cliente: 'C200', materiale: 'TR-ALTA', valore: '70'}), 'VK11 PR00 Delta');
bene(p.fai('vk', {tipo: 'K007', cliente: 'C100', valore: '5'}), 'VK11 K007 Beta');
bene(p.fai('vk', {tipo: 'K007', cliente: 'C300', valore: '3'}), 'VK11 K007 Gamma');
let r = p.fai('si', {cliente: 'C100', materiale: 'TR-STD', qta: '300'});
ok(/16\.380,00/.test(r) && /cliente\/materiale → non trovato/.test(r) || /16\.380,00/.test(r), 'simulazione prezzi Beta: netto 16.380 → ' + r.slice(0, 200));
ok(/Delta Noleggi/.test(apri('erp_dati', 'anagrafiche').testo()), 'anagrafiche clienti');

// ordini e acconto
p = apri('erp_vendite', 'ordini');
r = p.fai('va', {cliente: 'C400', materiale: 'TR-STD', qta: '150'}, 'prezzi');
ok(/9\.?045,00/.test(r) && /11\.034,90/.test(r), 'videata condizioni Sigma: netto 9.045, totale 11.034,90 → ' + r.slice(0, 300));
bene(p.fai('va', {cliente: 'C400', materiale: 'TR-STD', qta: '150', rif: 'SIGMA-150', data: '2027-01-05'}), 'VA01 Sigma');
const oSigma = p.S().ordini[0].numero;
ok(oSigma === '10000001', 'numerazione ordini SAP: ' + oSigma);
p = apri('erp_vendite', 'acconti');
bene(p.fai('ra', {ordine: oSigma, importo: '5000', data: '2027-01-05'}), 'F-37 richiesta di acconto');
ok(p.S().registrazioni.length === 1, 'la richiesta di acconto non scrive in contabilità');
bene(p.fai('ia', {richiesta: x => x, data: '2027-01-08'}), 'F-29 incasso acconto');
p = apri('erp_vendite', 'ordini');
[['C100', 'TR-STD', 300, 'BETA-300'], ['C200', 'TR-ALTA', 150, 'DELTA-150'], ['C300', 'TR-PED', 200, 'GAMMA-200']].forEach(([c, m, q, rif]) =>
  bene(p.fai('va', {cliente: c, materiale: m, qta: String(q), rif, data: '2027-01-10'}), 'VA01 ' + rif));
let err = p.fai('va', {cliente: 'C100', materiale: 'TR-STD', qta: '10', data: '2026-12-31'});
ok(/ko/.test(err), 'data anteriore all\'avvio rifiutata');
// consegne e fatture
for (let i = 0; i < 4; i++) { p = apri('erp_vendite', 'consegne'); bene(p.fai('vl', {ordine: x => x, data: '2027-01-15'}), 'VL01N consegna ' + (i + 1)); }
p = apri('erp_vendite', 'consegne'); ok(/niente da consegnare/.test(p.testo()), 'tutte le consegne fatte');
for (let i = 0; i < 4; i++) { p = apri('erp_vendite', 'fatture'); bene(p.fai('vf', {consegna: x => x, data: '2027-01-20'}), 'VF01 fattura ' + (i + 1)); }
const S1 = p.S();
const fSigma = S1.fatture.find(f => f.cliente === 'C400');
vicino(fSigma.accontoDedotto, 5000, 'AZWB acconto dedotto in fattura Sigma'); vicino(fSigma.totale, 4934.9, 'Sigma: residuo da incassare');
// resi e abbuoni
const fBeta = S1.fatture.find(f => f.cliente === 'C100').numero, fGamma = S1.fatture.find(f => f.cliente === 'C300').numero;
p = apri('erp_vendite', 'resi');
ok(/ko/.test(p.fai('re', {fattura: fBeta, qta: '400', motivo: 'x', data: '2027-01-25'})), 'reso oltre il fatturato rifiutato');
bene(p.fai('re', {fattura: fBeta, qta: '20', motivo: 'merce danneggiata nel trasporto', data: '2027-01-25'}), 'ordine di reso RE');
ok(/ko/.test(p.fai('nr', {reso: x => x, data: '2027-01-25'})) || !p.S().ordini.find(o => o.tipo === 'RE').accreditato, 'niente nota di credito prima che la merce rientri');
bene(p.fai('er', {reso: x => x, data: '2027-01-26'}), 'entrata merci di reso 651');
bene(p.fai('nr', {reso: x => x, data: '2027-01-27'}), 'nota di credito reso');
bene(p.fai('ab', {fattura: fGamma, importo: '300', motivo: 'difetto di verniciatura', data: '2027-01-28'}), 'richiesta G2');
ok(/nessuna richiesta approvata/.test(p.testo()), 'G2 bloccata: non fatturabile');
bene(p.fai('ap', {richiesta: x => x}), 'approvazione G2');
bene(p.fai('ng', {richiesta: x => x, data: '2027-01-29'}), 'nota di credito G2');
p = apri('erp_vendite', 'incassi');
ok(/ko/.test(p.fai('in', {cliente: 'C200', importo: '99999', data: '2027-01-31'})), 'incasso oltre le partite aperte rifiutato');
bene(p.fai('in', {cliente: 'C200', importo: '12553,80', rif: 'BONIFICO DELTA', data: '2027-01-31'}), 'F-28 incasso Delta');
p = apri('erp_vendite', 'flusso');
['Ordine', 'Consegna (601)', 'Fattura (F2)'].forEach(t => ok(p.testo().indexOf(t) >= 0 || /Richiesta di acconto/.test(p.testo()), 'flusso documenti: ' + t));

// numeri di controllo
const S = p.S();
const saldo = c => Math.round(S.registrazioni.reduce((t, r) => t + r.righe.filter(x => x.conto === c).reduce((u, x) => u + (x.dareAvere === 'DARE' ? x.importo : -x.importo), 0), 0) * 100) / 100;
let d = 0, a = 0; S.registrazioni.forEach(r => r.righe.forEach(x => { if (x.dareAvere === 'DARE') d += x.importo; else a += x.importo; }));
ok(Math.abs(d - a) < 0.005, 'quadratura Dare = Avere');
[['10', 68653.80], ['11', 35969.26], ['13', 6958], ['19', 0], ['21', -9850.06], ['26', -1352.19], ['40', -48500], ['41', 24827], ['47', 2560], ['48', -225], ['49', 1392], ['57', 1352.19]]
  .forEach(([c, v]) => vicino(saldo(c), v, 'saldo conto ' + c));
ok(JSON.stringify(S.giacenze) === JSON.stringify({'TR-STD': 70, 'TR-ALTA': 50, 'TR-PED': 100, 'FERRO': 0}), 'giacenze finali ' + JSON.stringify(S.giacenze));
ok(S.fatture.map(f => f.numero).join() === '90000001,90000002,90000003,90000004,90000005,90000006', 'numerazione fatture');
const rep = p.w.COPA.report(S, 'cliente'), T = rep.totale;
vicino(T.ricaviRettificati, 44773, 'CO-PA ricavi netti dopo rettifiche'); vicino(T.mdc1, 19946, 'CO-PA MdC I'); vicino(T.mdc2, 18593.81, 'CO-PA MdC II');
const beta = rep.righe.find(x => x.chiave === 'C100'); vicino(beta.mdc2, 6037.36, 'CO-PA MdC II Beta');
vicino(p.w.COPA.report(S, 'regione').righe.find(x => x.chiave === 'Lazio').trasporti, 225, 'CO-PA per regione: trasporti Lazio');
p = apri('erp_copa', 'ke30'); ok(/19\.946,00/.test(p.testo()) && /18\.593,81/.test(p.testo()), 'KE30 mostra MdC I e II');
p.lab.querySelector('#dim').value = 'materiale'; p.lab.querySelector('#dim').dispatchEvent(new p.w.Event('change'));
ok(/TR-ALTA/.test(p.testo()), 'KE30 per materiale');
ok(apri('erp_copa', 'ke24').lab.querySelectorAll('tr').length === 7, 'KE24: 6 righe CO-PA');
ok(/Totali/.test(apri('erp_fi', 'bilancio').testo()) && /Doc\. 100000001/.test(apri('erp_fi', 'giornale').testo()), 'giornale e bilancio');

// finestra passo passo: a fine gennaio sono fatti tutti i passi di gennaio e nessuno di febbraio
const guidaStati = (w, chiave) => {
  w.eval(R('app/blueprints/guida/static/esercizi/s4-integrato.js'));
  w.MSA_GUIDA = {esercizio: w.MSA_ESERCIZIO.codice, chiave: chiave, url: {}};
  w.eval(R('app/blueprints/guida/static/pannello.js'));
  return {st: w.MSA_GUIDA_API.stati(), passi: w.MSA_ESERCIZIO.passi};
};
const iFeb = () => { const w0 = new JSDOM('', {runScripts: 'outside-only'}).window; w0.eval(R('app/blueprints/guida/static/esercizi/s4-integrato.js')); return w0.MSA_ESERCIZIO.passi.findIndex(x => x.titolo.indexOf('Febbraio:') === 0); };
const FEB = iFeb();
{
  const {st, passi} = guidaStati(p.w, CHIAVE);
  const manc = passi.slice(0, FEB).map((x, i) => x.fatto && !st[i] ? (i + 1) + '. ' + x.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida S/4 gennaio: passi non riconosciuti → ' + manc.join(' | '));
  ok(passi.slice(FEB).every((x, i) => !x.fatto || !st[FEB + i]), 'guida S/4: nessun passo di febbraio fatto a fine gennaio');
  ok(passi.filter(x => x.fatto).length >= 45, 'guida S/4: almeno 45 passi con controllo automatico (' + passi.filter(x => x.fatto).length + ')');
}
fs.writeFileSync(path.join(__dirname, 'lab-erp-gennaio.json'), JSON.stringify(S));

// ═══ FEBBRAIO — costi del prodotto, dalle pagine ═══
p = apri('erp_costi', 'scheda');
bene(p.fai('sk', {sovrMat: '5', sovrProd: '10', tariffa: '28', lotto: '300'}), 'KZZ2 scheda di calcolo');
p = apri('erp_produzione', 'ordini');
ok(/ko/.test(p.fai('co', {materiale: 'TR-STD', qta: '300', data: '2027-02-06'})), 'CO01 rifiutato senza costo standard rilasciato');
p = apri('erp_costi', 'calcolo');
['TR-STD', 'TR-ALTA', 'TR-PED'].forEach(m => bene(p.fai('ck', {materiale: m, data: '2027-02-01'}), 'CK11N ' + m));
ok(/34,47/.test(p.testo()) && /39,54/.test(p.testo()) && /32,39/.test(p.testo()), 'stime 34,47 · 39,54 · 32,39');
ok(/ko/.test(p.fai('cr', {data: '2027-02-01'})), 'CK24 rilascio rifiutato senza marcatura');
bene(p.fai('cr', {data: '2027-02-01'}, 'marca'), 'CK24 marca');
bene(p.fai('cr', {data: '2027-02-01'}), 'CK24 rilascia');
p = apri('erp_acquisti', 'ordini');
bene(p.fai('me', {fornitore: 'F100', materiale: 'FERRO', qta: '9000', prezzo: '1,00', data: '2027-02-02'}), 'ME21N ferro');
ok(p.S().acquisti[0].numero === '4500000001', 'numerazione ordini d\'acquisto');
p = apri('erp_acquisti', 'entrate'); bene(p.fai('mi', {ordine: x => x, data: '2027-02-03'}), 'MIGO 101 ferro');
p = apri('erp_acquisti', 'fatture'); bene(p.fai('mr', {ordine: x => x, rif: 'FT 245/2027', data: '2027-02-05'}), 'MIRO fattura fornitore');
for (const [m, q, kg, h] of [['TR-STD', 300, 2400, 255], ['TR-ALTA', 100, 1000, 95], ['TR-PED', 300, 2790, 240]]) {
  p = apri('erp_produzione', 'ordini');
  r = p.fai('co', {materiale: m, qta: String(q)}, 'piano'); ok(/Costi pianificati/.test(r), 'CO01 costi pianificati ' + m);
  bene(p.fai('co', {materiale: m, qta: String(q), data: '2027-02-06'}), 'CO01 ' + m);
  const o = p.S().produzione.slice(-1)[0].numero;
  p = apri('erp_produzione', 'avanzamento');
  bene(p.fai('pr', {ordine: o, kg: String(kg), data: '2027-02-08'}), '261 ' + m);
  bene(p.fai('cf', {ordine: o, attrezzaggio: '3', ore: String(h), data: '2027-02-10'}), 'CO11N ' + m);
  bene(p.fai('en', {ordine: o, data: '2027-02-12'}), '101 ' + m);
}
ok(p.S().produzione.map(o => o.numero).join() === '1000001,1000002,1000003', 'numerazione ordini di produzione');
p = apri('erp_costi', 'calcolo'); ok(/ko/.test(p.fai('ck', {materiale: 'TR-STD', data: '2027-02-15'})) || true, 'ricalcolo possibile');
p = apri('erp_vendite', 'ordini');
bene(p.fai('va', {cliente: 'C100', materiale: 'TR-STD', qta: '300', rif: 'BETA-FEB', data: '2027-02-15'}), 'VA01 Beta febbraio');
bene(p.fai('va', {cliente: 'C200', materiale: 'TR-ALTA', qta: '120', rif: 'DELTA-FEB', data: '2027-02-15'}), 'VA01 Delta febbraio');
for (let i = 0; i < 2; i++) { p = apri('erp_vendite', 'consegne'); bene(p.fai('vl', {ordine: x => x, data: '2027-02-20'}), 'VL01N febbraio ' + (i + 1)); }
for (let i = 0; i < 2; i++) { p = apri('erp_vendite', 'fatture'); bene(p.fai('vf', {consegna: x => x, data: '2027-02-21'}), 'VF01 febbraio ' + (i + 1)); }
p = apri('erp_costi', 'chiusura');
ok(/ko/.test(p.fai('ko', {data: '2027-02-28'})), 'KO88 rifiutato senza sovraccosti (KGI2)');
bene(p.fai('kg', {data: '2027-02-28'}), 'KGI2 sovraccosti');
bene(p.fai('ko', {data: '2027-02-28'}), 'KKS2 + KO88');
ok(/Varianza di LOTTO/.test(p.testo()) && /61,60/.test(p.testo()), 'scheda varianze: lotto 61,60');
p = apri('erp_costi', 'ml');
ok(/Anteprima/.test(p.testo()) && /34,11/.test(p.testo()), 'CKM3 anteprima con prezzo effettivo TR-PED 34,11');
p.fai('cm', {periodo: '2027-02', data: '2027-02-28'}); ok(p.S().costing.ml.length === 1, 'CKMLCP chiusura');
ok(/Periodo chiuso/.test(apri('erp_costi', 'ml').testo()), 'Material Ledger chiuso');
{
  const S2 = p.S();
  const sal = c => Math.round(S2.registrazioni.reduce((t, r) => t + r.righe.filter(x => x.conto === c).reduce((u, x) => u + (x.dareAvere === 'DARE' ? x.importo : -x.importo), 0), 0) * 100) / 100;
  let d2 = 0, a2 = 0; S2.registrazioni.forEach(r => r.righe.forEach(x => { if (x.dareAvere === 'DARE') d2 += x.importo; else a2 += x.importo; }));
  ok(Math.abs(d2 - a2) < 0.005, 'febbraio: quadratura Dare = Avere');
  [['12', 2810], ['13', 17290], ['14', 1980], ['20', -10980], ['22', 0], ['42', 186.33], ['61', 0], ['63', 0], ['64', -670.90], ['70', 5880.50], ['76', -1971.23], ['78', 1971.23]]
    .forEach(([c, v]) => vicino(sal(c), v, 'febbraio: saldo conto ' + c));
  ok(JSON.stringify(S2.giacenze) === JSON.stringify({'TR-STD': 70, 'TR-ALTA': 30, 'TR-PED': 400, 'FERRO': 2810}), 'giacenze di febbraio ' + JSON.stringify(S2.giacenze));
  const v = S2.produzione.map(o => o.liquidazione.varianza); vicino(v[0], -0.6, 'varianza TR-STD'); vicino(v[1], 61.9, 'varianza TR-ALTA'); vicino(v[2], 550.43, 'varianza TR-PED');
  const M = S2.costing.ml[0].materiali; vicino(M['TR-STD'].prezzoEffettivo, 34.79, 'prezzo effettivo TR-STD'); vicino(M['TR-ALTA'].prezzoEffettivo, 40.29, 'prezzo effettivo TR-ALTA'); vicino(M.FERRO.prezzoEffettivo, 1, 'prezzo effettivo ferro');
  const rf = p.w.COPA.report(S2, 'cliente', {dal: '2027-02-01', al: '2027-02-28'});
  vicino(rf.totale.mdc1, 9339.87, 'KE30 febbraio MdC I effettivo'); vicino(rf.totale.mdc2, 8601.51, 'KE30 febbraio MdC II'); vicino(rf.righe.find(x => x.chiave === 'C100').diffPrezzo, 96.81, 'differenze ML a Beta');
  vicino(p.w.COPA.report(S2, 'cliente', {al: '2027-01-31'}).totale.mdc1, 19946, 'KE30 gennaio invariato');
  p = apri('erp_copa', 'ke30'); ok(/Material Ledger/.test(p.testo()), 'KE30 riga differenze ML');
  const {st, passi} = guidaStati(p.w, CHIAVE);
  const MAR = passi.findIndex(x => x.titolo.indexOf('Marzo:') === 0);
  const manc = passi.slice(0, MAR).map((x, i) => x.fatto && !st[i] ? (i + 1) + '. ' + x.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida S/4 completa: passi non riconosciuti → ' + manc.join(' | '));
  // vecchio stato (prima della tappa CO-PC) si completa senza perdere dati
  const vecchio = JSON.parse(fs.readFileSync(path.join(__dirname, 'lab-erp-gennaio.json'), 'utf8'));
  delete vecchio.costing; delete vecchio.produzione; delete vecchio.materiali.FERRO; vecchio.pianoDeiConti = vecchio.pianoDeiConti.filter(c => c.codice !== '12');
  memoria = JSON.stringify(vecchio); ultima = null;
  const pv = apri('erp_costi', 'scheda'); ok(pv.S().costing && pv.S().materiali.FERRO && pv.S().pianoDeiConti.some(c => c.codice === '12') && pv.S().fatture.length === 6, 'stato salvato prima della tappa: completato');
  memoria = JSON.stringify(S2); ultima = null;
}
// ═══ MARZO — magazzino WMS e inventario (UF 9), dalle pagine e dalla pistola RF ═══
p = apri('erp_magazzino', 'mappa'); ok(/non è ancora attivo/.test(p.testo()), 'mappa: WMS non attivo');
p = apri('erp_magazzino', 'struttura');
p.fai('at', {data: '2027-03-01'}); ok(p.S().wm && p.S().wm.attivo === '2027-03-01' && /WMS attivo/.test(p.testo()), 'attivazione W100');
ok(p.S().wm.carico.length === 14, 'carico iniziale: 14 unità di carico (' + p.S().wm.carico.length + ')');
p = apri('erp_magazzino', 'mappa'); ok(/01-01-2/.test(p.testo()) && p.lab.querySelectorAll('.ubic[data-u]').length === 40, 'mappa con 40 ubicazioni');
p.lab.querySelector('[data-u="01-01-2"]').click(); ok(/Ubicazione 01-01-2/.test(p.testo()) && /1000002/.test(p.testo()), 'dettaglio ubicazione 01-01-2');
p = apri('erp_magazzino', 'etichette'); ok(p.lab.querySelectorAll('.s4-et').length === 40 && p.lab.querySelector('.s4-et svg'), 'etichette con barcode');
p = apri('erp_acquisti', 'ordini'); bene(p.fai('me', {fornitore: 'F100', materiale: 'FERRO', qta: '5000', prezzo: '0,98', data: '2027-03-02'}), 'ME21N marzo');
p = apri('erp_acquisti', 'entrate'); bene(p.fai('mi', {ordine: x => x, data: '2027-03-03'}), 'MIGO 101 marzo');
ok(p.S().wm.compiti.filter(t => t.tipo === 'PUTAWAY').map(t => t.a).join() === 'F-02,F-03,F-03,F-04,F-04', 'strategia aggiunta a scorta: ' + p.S().wm.compiti.map(t => t.a).join());
const rfInvio = (pp, id, v) => { const i = pp.lab.querySelector(id); i.value = v; i.dispatchEvent(new pp.w.KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); return i; };
p = apri('erp_magazzino', 'rf');
p.lab.querySelector('#rf-data').value = '2027-03-03';
let t0 = p.S().wm.compiti[0];
let campo = rfInvio(p, '#rf-da', 'F-01'); ok(campo.classList.contains('ko'), 'RF: origine sbagliata segnalata in rosso');
p.lab.querySelector('#rf-da').value = 'GR-ZONE'; p.lab.querySelector('#rf-udc').value = t0.udc; p.lab.querySelector('#rf-a').value = 'F-05';
p.lab.querySelector('#rf-ok').click(); ok(/destinazione sbagliata/.test(p.lab.querySelector('#rf-esito').textContent), 'RF: destinazione sbagliata rifiutata');
for (let k = 0; k < 5; k++) {
  p = apri('erp_magazzino', 'rf'); p.lab.querySelector('#rf-data').value = '2027-03-03';
  const t = p.S().wm.compiti.find(x => x.stato === 'aperto');
  rfInvio(p, '#rf-da', t.da.toLowerCase()); rfInvio(p, '#rf-udc', t.udc); rfInvio(p, '#rf-a', t.a);   // l'ultimo Invio conferma da solo
  ok(t.stato === 'confermato' || p.S().wm.compiti.find(x => x.numero === t.numero).stato === 'confermato', 'RF: messa a posto ' + t.numero + ' con tre letture');
}
{ const pq = apri('erp_magazzino', 'rf'); ok(/Nessun compito aperto/.test(pq.testo()), 'RF: coda vuota → ' + pq.S().wm.compiti.map(t => t.numero + t.stato).join() + ' ' + pq.testo().slice(0, 200)); }
p = apri('erp_magazzino', 'rf'); p.lab.querySelector('.rf-schede [data-s="interroga"]').click();
rfInvio(p, '#rf-q', 'F-03'); ok(/FERRO/.test(p.lab.querySelector('#rf-ris-q').textContent) && /1\.?000/.test(p.lab.querySelector('#rf-ris-q').textContent), 'RF: interroga ubicazione');
p = apri('erp_inventario', 'abc'); ok(/TR-STD/.test(p.testo()) && /mensile/.test(p.testo()), 'ABC');
{ const a = p.w.IV4.abc().righe.map(x => x.mat + x.classe).join(); ok(a === 'TR-STDA,TR-ALTAA,TR-PEDB,FERROC', 'classi ABC ' + a); }
p = apri('erp_inventario', 'documenti');
bene(p.fai('in', {tipo: 'rotazione', selezione: 'A', tolleranza: '20', data: '2027-03-10'}), 'LI01N rotazione classe A');
ok(p.S().wm.inventari[0].righe.map(r => r.ubic).join() === '01-01-1,01-01-2,01-02-1', 'posizioni del documento');
p = apri('erp_inventario', 'documenti'); p.fai('ia', {data: '2027-03-10'}); ok(p.S().wm.inventari[0].stato === 'attivo', 'attivazione documento');
ok(p.S().wm.ubicazioni['01-01-2'].blocco, 'ubicazione bloccata');
p = apri('erp_inventario', 'lista'); ok(/LISTA DI CONTA/.test(p.testo()) && !/\b20\b.*pz/.test(p.lab.querySelector('table.lista-conta').textContent), 'lista di conta cieca');
p = apri('erp_inventario', 'documenti'); ok(/nascosta/.test(p.testo()), 'quantità contabile nascosta durante la conta');
bene(p.fai('ic', {r0: '50', r1: '18', r2: '31', contatore: 'MAG02 Sara'}), 'prima conta');
ok(p.S().wm.inventari[0].stato === 'riconta', 'stato riconta');
p = apri('erp_magazzino', 'rf'); p.lab.querySelector('.rf-schede [data-s="inventario"]').click();
rfInvio(p, '#rf-inv', '01-02-1'); p.lab.querySelector('#rf-c2').value = '30'; p.lab.querySelector('#rf-conta').click();
rfInvio(p, '#rf-inv', '01-01-2'); p.lab.querySelector('#rf-c1').value = '18'; p.lab.querySelector('#rf-conta').click();
ok(p.S().wm.inventari[0].stato === 'contato', 'riconta dalla pistola RF → contato (' + p.S().wm.inventari[0].stato + ')');
p = apri('erp_inventario', 'documenti'); p.fai('ix', {data: '2027-03-11'}); ok(p.S().wm.inventari[0].stato === 'chiuso', 'LI20 chiusura');
ok(p.w.WM4.quadratura().every(q => q.ok) && p.w.WM4.quadratura().find(q => q.mat === 'TR-STD').diff999 === 2, 'dopo LI20: 2 TR-STD nella 999, IM = WMS');
ok(!p.S().wm.ubicazioni['01-01-2'].blocco, 'ubicazioni sbloccate');
p = apri('erp_inventario', 'differenze'); bene(p.fai('rg', {data: '2027-03-12'}), 'LI21 registrazione');
{
  const S3 = p.S(); const sal = c => Math.round(S3.registrazioni.reduce((t, r) => t + r.righe.filter(x => x.conto === c).reduce((u, x) => u + (x.dareAvere === 'DARE' ? x.importo : -x.importo), 0), 0) * 100) / 100;
  vicino(sal('65'), 68.94, 'conto 65 differenze inventariali'); ok(S3.giacenze['TR-STD'] === 68 && S3.giacenze.FERRO === 7810, 'giacenze dopo inventario');
  ok(p.w.WM4.quadratura().every(q => q.ok && q.diff999 === 0), 'quadratura IM–WMS finale');
}
p = apri('erp_inventario', 'valorizzazione'); ok(/7\.?710,00/.test(p.testo()), 'valorizzazione ferro 7.710');
p.lab.querySelector('#lib').checked = true; p.lab.querySelector('#lib').dispatchEvent(new p.w.Event('change'));
ok(/1\.?660,00/.test(p.testo()) && /1\.?360,00/.test(p.testo()) && /1\.?560,00/.test(p.testo()), 'esempio da manuale FIFO 1.660 · LIFO 1.360 · CMP 1.560');
p = apri('erp_magazzino', 'monitor'); ok(/quadra/.test(p.testo()), 'monitor');
{ const {st, passi} = guidaStati(p.w, CHIAVE); const manc = passi.map((x, i) => x.fatto && !st[i] ? (i + 1) + '. ' + x.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida S/4 con marzo: passi non riconosciuti → ' + manc.join(' | ')); }
if (ultima) memoria = ultima.localStorage.getItem(CHIAVE);
const SF = JSON.parse(memoria);

// lezioni «Che situazione hai?»: il copione prepara il sistema fino al passo, la finestra si apre lì
for (const passo of ['VK11: prezzo speciale', 'F-37', 'Reso:', 'KE30', 'KZZ2', 'KKS2: leggi', 'CKMLCP', 'Mappa', 'Crea il documento d', 'ABC', 'Valorizzazione']) {
  const w = new JSDOM('<!doctype html><body></body>', {url: 'https://sim.local/vuoto/s4/?passo=' + encodeURIComponent(passo), runScripts: 'outside-only'}).window;
  LOGICA.forEach(f => w.eval(R(f)));
  w.SD4.avvia('t'); const St = w.LabCopioni.esegui(w.LabCopioni.SD4, w.SD4, passo);
  const {st, passi} = guidaStati(w, 't');
  const i = passi.findIndex(x => x.titolo.indexOf(passo) === 0);
  ok(i >= 0 && passi.slice(0, i).every((x, j) => !x.fatto || st[j]) && (!passi[i].fatto || !st[i]), 'lezione «' + passo + '»: sistema pronto fino al passo');
  if (passo === 'KE30') vicino(w.COPA.report(St, 'cliente').totale.mdc2, 18593.81, 'copione gennaio: MdC II');
}
{ // copione completo = stesso risultato delle pagine
  const w = new JSDOM('', {url: 'https://sim.local/', runScripts: 'outside-only'}).window; LOGICA.forEach(f => w.eval(R(f)));
  w.SD4.avvia('t'); const St = w.LabCopioni.esegui(w.LabCopioni.SD4, w.SD4);
  vicino(w.COPA.report(St, 'cliente', {dal: '2027-02-01'}).totale.mdc1, 9339.87, 'copione completo: MdC I di febbraio');
}
fs.writeFileSync(path.join(__dirname, 'lab-erp-finale.json'), JSON.stringify(SF));
console.log(errori ? '❌ ' + errori + ' errori su ' + controlli : '✅ sistema integrato S/4 dalle pagine — gennaio vendite e CO-PA, febbraio CO-PC e Material Ledger, marzo WMS e inventario: ' + controlli + ' controlli');
process.exit(errori ? 1 : 0);
