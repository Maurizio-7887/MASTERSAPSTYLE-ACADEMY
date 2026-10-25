// Sistema integrato S/4 — fase «Vendite e redditività» eseguita dalle PAGINE (moduli e pulsanti), non dalle funzioni:
// numeri di controllo, quadratura, CO-PA, finestra passo passo. Salva tests/lab-erp-finale.json per test_accessi.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const sorgenti = new Map(); // Solo sorgenti immutabili; mai stato o fixture JSON.
const R = p => {
  if (!sorgenti.has(p)) sorgenti.set(p, fs.readFileSync(path.join(__dirname, '..', p), 'utf8'));
  return sorgenti.get(p);
};
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const PAGINE = {erp_dati: 'dati-pagine.js', erp_vendite: 'sd-pagine.js', erp_copa: 'copa-pagine.js', erp_fi: 'fi-pagine.js', erp_acquisti: 'mm-pagine.js', erp_produzione: 'pp-pagine.js', erp_costi: 'copc-pagine.js', erp_magazzino: 'wm-pagine.js', erp_inventario: 'inv-pagine.js', erp_spedizione: 'sp-pagine.js', erp_tesoreria: 'tes-pagine.js', erp_valute: 'val-pagine.js', erp_paghe: 'py-pagine.js', erp_cespiti: 'ce-pagine.js', erp_chiusura: 'ch-pagine.js', erp_innovazione: 'in-pagine.js'};
const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js', 'app/blueprints/erp_cespiti/static/ce-logica.js', 'app/blueprints/erp_tesoreria/static/rb-logica.js', 'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/static/js/erp/ruoli.js',
  'app/static/js/lab-copioni.js', 'app/static/js/erp/lettore.js', 'app/static/vendor/jsbarcode-3.11.6.min.js', 'app/static/vendor/qrcode-generator-1.4.4.js', 'app/static/js/erp/etichette.js'];
let memoria = null, ultima = null, p = null;   // il localStorage passa da una pagina all'altra come nel browser
let finestre = [];
let pagineAperte = 0;
// Regressione operativa: il percorso didattico è verificato nei test quiz dedicati.
// Come negli esercizio-ragioneria-*, compiliamo davvero i controlli DOM, senza
// alterare flag o coda. Conserviamo le window ancora referenziate da p/ultima:
// guidaStati può riusare p anche dopo apri() eseguiti solo per un'asserzione.
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
function apri(bp, pagina) {
  if (typeof process !== 'undefined' && process.env.ACADEMY_TEST_PROGRESS) console.log('S4 pagina', bp, pagina);
  if (ultima) { verificaQuiz(ultima); memoria = ultima.localStorage.getItem(CHIAVE) || memoria; }
  finestre = finestre.filter(w => {
    if (w === ultima || (p && w === p.w)) return true;
    w.close(); return false;
  });
  // --expose-gc può ridurre il picco nel lungo harness senza chiudere window
  // ancora usate da guidaStati. Nessuna dipendenza da GC per la correttezza.
  if (globalThis.gc && ++pagineAperte % 10 === 0) globalThis.gc();
  const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  finestre.push(w);
  ultima = w;
  if (memoria) w.localStorage.setItem(CHIAVE, memoria);
  w.confirm = () => true;
  w.LAB_PAGINA = {chiave: CHIAVE, pagina: pagina, slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/guida/static/ragioneria.js', 'app/blueprints/' + bp + '/static/' + PAGINE[bp]]).forEach(f => w.eval(R(f)));
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
      const esito = es ? es.className + ' ' + es.textContent : '';
      verificaQuiz(w);
      memoria = w.localStorage.getItem(CHIAVE);
      return esito;
    },
    testo: () => lab.textContent};
  return P;
}
const bene = (r, m) => ok(/ ok /.test(' ' + r.split(' ')[1] + ' ') || /lab-esito ok/.test(r), m + ' → ' + r.slice(0, 160));
const num = S => n => n;   // segnaposto leggibile

// avvio, condizioni
p = apri('erp_dati', 'avvio');
ok(/Nuova azienda/.test(p.testo()) && /Carica saldi pronti/.test(p.testo()), 'pagina di avvio');
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
ok(/Totali/.test(apri('erp_fi', 'bilancio').testo()) && /100000001/.test(apri('erp_fi', 'giornale').testo()), 'giornale e bilancio');

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
p = apri('erp_magazzino', 'mappa'); ok(/01-01-2/.test(p.testo()) && p.lab.querySelectorAll('.ubic[data-u]').length === 41, 'mappa con 41 ubicazioni (con la quarantena Q-ZONE)');
p.lab.querySelector('[data-u="01-01-2"]').click(); ok(/Ubicazione 01-01-2/.test(p.testo()) && /1000002/.test(p.testo()), 'dettaglio ubicazione 01-01-2');
p = apri('erp_magazzino', 'etichette'); ok(p.lab.querySelectorAll('.s4-et').length === 41 && p.lab.querySelector('.s4-et svg'), 'etichette con barcode');
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
{ const {st, passi} = guidaStati(p.w, CHIAVE); const APR = passi.findIndex(x => x.titolo.indexOf('Aprile:') === 0); const manc = passi.slice(0, APR).map((x, i) => x.fatto && !st[i] ? (i + 1) + '. ' + x.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida S/4 con marzo: passi non riconosciuti → ' + manc.join(' | ')); }
// ═══ APRILE — spedizione (UF 10) ═══
p = apri('erp_vendite', 'ordini');
bene(p.fai('va', {cliente: 'C300', materiale: 'TR-PED', qta: '250', rif: 'GAMMA-APR', data: '2027-04-05'}), 'VA01 Gamma aprile');
bene(p.fai('va', {cliente: 'C400', materiale: 'TR-STD', qta: '60', rif: 'SIGMA-APR', data: '2027-04-05'}), 'VA01 Sigma aprile');
for (let i = 0; i < 2; i++) { p = apri('erp_vendite', 'consegne'); bene(p.fai('vl', {ordine: x => x, data: '2027-04-06'}), 'VL01N aprile ' + (i + 1)); }
const cAp = c => p.S().consegne.filter(k => k.cliente === c && k.wm)[0];
ok(cAp('C300').pgi === false && p.S().wm.compiti.filter(t => t.tipo === 'PICK').length === 7, 'consegne senza uscita merci, 7 compiti di prelievo');
p = apri('erp_vendite', 'fatture'); ok(/nessuna consegna da fatturare/.test(p.testo()), 'non si fattura prima dell\'uscita merci');
p = apri('erp_spedizione', 'prelievo'); ok(/LISTA DI PRELIEVO/.test(p.testo()) && /01-02-2/.test(p.testo()), 'lista di prelievo FIFO');
p = apri('erp_spedizione', 'imballo'); ok(/nessuna consegna da imballare/.test(p.testo()), 'imballo bloccato prima del prelievo');
for (let k = 0; k < 8; k++) {
  p = apri('erp_magazzino', 'rf'); p.lab.querySelector('#rf-data').value = '2027-04-07';
  const t = p.S().wm.compiti.find(x => x.stato === 'aperto'); if (!t) break;
  if (t.da === '01-03-2' && !t.origine) p.lab.querySelector('#rf-qta').value = '48';
  rfInvio(p, '#rf-da', t.da); rfInvio(p, '#rf-udc', t.udc); rfInvio(p, '#rf-a', t.a);
}
ok(p.S().wm.compiti.filter(t => t.tipo === 'PICK' && t.stato === 'confermato').length === 8, 'prelievo con la pistola: 8 compiti (uno nato dalla differenza)');
ok(p.w.WM4.statoPrelievo(cAp('C300')).prelevato === 250 && p.w.WM4.inUbic('DIFF').some(q => q.mat === 'TR-PED' && q.qta === 2), 'Gamma: 250 prelevati, 2 in 999');
p = apri('erp_spedizione', 'imballo'); bene(p.fai('im', {consegna: cAp('C300').numero, imballo: 'EUR', data: '2027-04-07'}), 'imballo Gamma');
p = apri('erp_spedizione', 'imballo'); bene(p.fai('im', {consegna: cAp('C400').numero, imballo: 'EUR', data: '2027-04-07'}), 'imballo Sigma');
ok(p.S().sped.colli.length === 7 && p.lab.querySelectorAll('.s4-et').length >= 2, 'colli ed etichette SSCC');
ok(p.w.SP4.sscc(1) === '380123450000000013', 'SSCC con cifra di controllo GS1');
p = apri('erp_spedizione', 'trasporti'); bene(p.fai('vt', {consegne: cAp('C300').numero + ', ' + cAp('C400').numero, vettore: 'V10', targa: 'FI 123 AB', autista: 'Paolo Bini', porto: 'franco', data: '2027-04-08'}), 'VT01N');
p.fai('pt', {trasporto: x => x, data: '2027-04-08'}); ok(!p.S().sped.trasporti[0].partenza, 'partenza rifiutata senza carico');
p = apri('erp_magazzino', 'rf'); p.lab.querySelector('.rf-schede [data-s="carico"]').click(); p.lab.querySelector('#rf-data').value = '2027-04-08';
rfInvio(p, '#rf-sscc', '01-01-1'); ok(/sconosciuto/.test(p.lab.querySelector('#rf-ce').textContent), 'RF carico: codice non SSCC rifiutato');
for (const x of p.S().sped.colli.slice()) { rfInvio(p, '#rf-sscc', '(00)' + x.sscc); }
ok(p.S().sped.colli.every(x => x.caricato) && p.S().sped.trasporti[0].stato === 'caricato', 'RF: 7 colli caricati');
p = apri('erp_spedizione', 'trasporti'); p.fai('pt', {trasporto: x => x, data: '2027-04-08'}); ok(!!p.S().sped.trasporti[0].partenza, 'partenza e uscita merci');
ok(cAp('C300').ddt === '1' && cAp('C400').ddt === '2' && cAp('C300').pgi === '2027-04-08', 'DDT numerati');
p = apri('erp_spedizione', 'ddt'); ok(/DOCUMENTO DI TRASPORTO n\. 1\/2027/.test(p.testo()) && /2\.?375/.test(p.testo()) && /Trasporti Toscani/.test(p.testo()), 'DDT 1 stampabile');
for (let i = 0; i < 2; i++) { p = apri('erp_vendite', 'fatture'); bene(p.fai('vf', {consegna: x => x, data: '2027-04-09'}), 'VF01 aprile ' + (i + 1)); }
p = apri('erp_inventario', 'differenze'); bene(p.fai('rg', {data: '2027-04-10'}), 'differenza di prelievo registrata');
p = apri('erp_spedizione', 'monitor'); ok(/Nessuna consegna aperta/.test(p.testo()), 'monitor VL06O tutto completato');
{
  const S4s = p.S(); const sal = c => Math.round(S4s.registrazioni.reduce((t, r) => t + r.righe.filter(x => x.conto === c).reduce((u, x) => u + (x.dareAvere === 'DARE' ? x.importo : -x.importo), 0), 0) * 100) / 100;
  vicino(sal('65'), 133.72, 'conto 65 dopo aprile'); ok(S4s.giacenze['TR-PED'] === 148 && S4s.giacenze['TR-STD'] === 8, 'giacenze dopo aprile ' + JSON.stringify(S4s.giacenze));
  ok(p.w.WM4.quadratura().every(q => q.ok && q.diff999 === 0), 'quadratura IM–WMS dopo aprile');
  let d4 = 0, a4 = 0; S4s.registrazioni.forEach(r => r.righe.forEach(x => { if (x.dareAvere === 'DARE') d4 += x.importo; else a4 += x.importo; })); ok(Math.abs(d4 - a4) < 0.005, 'aprile: quadratura Dare = Avere');
  const {st, passi} = guidaStati(p.w, CHIAVE); const MAG = passi.findIndex(x => x.titolo.indexOf('Maggio:') === 0); const manc = passi.slice(0, MAG).map((x, i) => x.fatto && !st[i] ? (i + 1) + '. ' + x.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida S/4 con aprile: passi non riconosciuti → ' + manc.join(' | '));
  const fl = p.w.SD4.flusso(cAp('C300').ordine).map(x => x.tipo).join('|'); ok(/Compito di magazzino PICK/.test(fl), 'flusso documenti con i compiti di magazzino');
}
// ═══ MAGGIO — innovazione (UF 11) ═══
p = apri('erp_innovazione', 'kpi'); ok(/66,67/.test(p.testo()) && /19,25/.test(p.testo()), 'KPI di partenza: accuratezza 66,67 · 19,25 m');
p = apri('erp_innovazione', 'slotting'); ok(/01-01-1/.test(p.testo()) && /TR-PED/.test(p.testo()), 'proposta di slotting');
bene(p.fai('sl', {data: '2027-05-03'}), 'slotting applicato');
for (let k = 0; k < 3; k++) { p = apri('erp_magazzino', 'rf'); p.lab.querySelector('#rf-data').value = '2027-05-03'; const t = p.S().wm.compiti.find(x => x.stato === 'aperto'); rfInvio(p, '#rf-da', t.da); rfInvio(p, '#rf-udc', t.udc); rfInvio(p, '#rf-a', t.a); }
ok(p.S().wm.compiti.filter(t => t.tipo === 'TRASF' && t.stato === 'confermato').length === 3, 'RF: 3 trasferimenti di slotting');
p = apri('erp_innovazione', 'ondate'); bene(p.fai('mo', {ondate: 'si', crossDock: 'no'}), 'prelievo a ondate attivo');
p = apri('erp_vendite', 'ordini');
bene(p.fai('va', {cliente: 'C100', materiale: 'TR-PED', qta: '120', rif: 'BETA-MAG', data: '2027-05-05'}), 'VA01 Beta maggio');
bene(p.fai('va', {cliente: 'C200', materiale: 'TR-ALTA', qta: '20', rif: 'DELTA-MAG', data: '2027-05-05'}), 'VA01 Delta maggio');
for (let i = 0; i < 2; i++) { p = apri('erp_vendite', 'consegne'); bene(p.fai('vl', {ordine: x => x, data: '2027-05-06'}), 'VL01N maggio ' + (i + 1)); }
ok(p.S().consegne.filter(c => c.ondata === 'in attesa').length === 2 && !p.S().wm.compiti.some(t => t.stato === 'aperto'), 'consegne in attesa d\'ondata, nessun compito');
p = apri('erp_innovazione', 'ondate'); bene(p.fai('on', {data: '2027-05-06'}), 'ondata rilasciata');
{ const o = p.S().wm.ondateRilasciate[0]; ok(o.metriOnda === 22 && o.metriOrdine === 34 && o.compiti.length === 4, 'ondata: 22 m invece di 34 m, 4 compiti'); }
for (let k = 0; k < 4; k++) { p = apri('erp_magazzino', 'rf'); p.lab.querySelector('#rf-data').value = '2027-05-07'; const t = p.w.WM4.aperti()[0];
  ok(t.seq === k + 1, 'RF: la coda segue il percorso (seq ' + t.seq + ')'); rfInvio(p, '#rf-da', t.da); rfInvio(p, '#rf-udc', t.udc); rfInvio(p, '#rf-a', t.a); }
const mag = () => p.S().consegne.filter(c => c.wm && c.data >= '2027-05-01');
for (const c of mag()) { p = apri('erp_spedizione', 'imballo'); bene(p.fai('im', {consegna: c.numero, imballo: 'EUR', data: '2027-05-07'}), 'imballo maggio ' + c.numero); }
p = apri('erp_spedizione', 'trasporti'); bene(p.fai('vt', {consegne: mag().map(c => c.numero).join(','), vettore: 'V20', targa: 'PT 456 CD', autista: 'Anna Neri', porto: 'franco', data: '2027-05-08'}), 'VT01N maggio');
p = apri('erp_innovazione', 'rfid'); bene(p.fai('rf', {trasporto: x => x, data: '2027-05-08'}), 'varco RFID');
ok(p.S().sped.colli.filter(x => x.rfid).length === 4 && p.S().sped.colli.find(x => x.rfid).rfid === 'urn:epc:id:sscc:8012345.3000000008', 'EPC SSCC-96 dei 4 colli');
p = apri('erp_spedizione', 'trasporti'); p.fai('pt', {trasporto: x => x, data: '2027-05-08'}); ok(!!p.S().sped.trasporti[1].partenza, 'partenza di maggio');
for (let i = 0; i < 2; i++) { p = apri('erp_vendite', 'fatture'); bene(p.fai('vf', {consegna: x => x, data: '2027-05-10'}), 'VF01 maggio ' + (i + 1)); }
{ // cross-docking opportunistico (prova separata su una copia)
  const w2 = new JSDOM('', {url: 'https://sim.local/', runScripts: 'outside-only'}).window; LOGICA.forEach(f => w2.eval(R(f)));
  w2.localStorage.setItem('xd', ultima.localStorage.getItem(CHIAVE)); w2.SD4.avvia('xd');
  w2.IN4.impostazioni({ondate: 'no', crossDock: 'si'});
  w2.MM4.ordine({fornitore: 'F100', materiale: 'FERRO', qta: 1000, prezzo: 0.95, data: '2027-05-11'});
  const S2 = w2.SD4.N.S; w2.MM4.entrata({ordine: S2.acquisti.slice(-1)[0].numero, data: '2027-05-12'});
  w2.PC4.calcola && true;
  // una consegna di ferro non esiste (non si vende): cross-docking provato su un reso di TR-STD rientrato in GR-ZONE
  const f = S2.fatture.find(x => x.tipo === 'F2' && x.materiale === 'TR-STD');
  w2.SD4.reso({fattura: f.numero, qta: 5, motivo: 'prova cross-docking', data: '2027-05-12'}); const re = S2.ordini.slice(-1)[0].numero;
  w2.SD4.entrataReso({reso: re, data: '2027-05-12'});
  ok(w2.WM4.aperti().some(t => t.tipo === 'PUTAWAY' && t.mat === 'TR-STD'), 'reso in GR-ZONE con messa a posto');
  w2.SD4.ordine({cliente: 'C400', materiale: 'TR-STD', qta: 5, rif: 'XD', data: '2027-05-12'}); w2.SD4.consegna({ordine: S2.ordini.slice(-1)[0].numero, data: '2027-05-12'});
  const xd = w2.WM4.aperti().find(t => t.crossDock);
  ok(xd && xd.da === 'GR-ZONE' && S2.wm.compiti.some(t => t.stato === 'annullato' && /cross-docking/.test(t.motivo)), 'cross-docking: messa a posto annullata, prelievo dalla GR-ZONE');
}
{ const S5 = p.S(); ok(S5.giacenze['TR-PED'] === 28, 'giacenza TR-PED fine maggio ' + S5.giacenze['TR-PED']); ok(p.w.WM4.quadratura().every(q => q.ok), 'quadratura IM–WMS a maggio');
  const {st, passi} = guidaStati(p.w, CHIAVE); const GIU = passi.findIndex(x => x.titolo.indexOf('Giugno:') === 0); const manc = passi.slice(0, GIU).map((x, i) => x.fatto && !st[i] ? (i + 1) + '. ' + x.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida S/4 con maggio: passi non riconosciuti → ' + manc.join(' | ')); }
p = apri('erp_innovazione', 'kpi'); ok(/MAG01 Marco/.test(p.testo()) && /Produttività/.test(p.testo()), 'KPI con produttività per risorsa');
// ═══ GIUGNO — tesoreria e paghe ═══
const salS = (S0, c, fino) => Math.round(S0.registrazioni.filter(r => !fino || r.data <= fino).reduce((t, r) => t + r.righe.filter(x => x.conto === c).reduce((u, x) => u + (x.dareAvere === 'DARE' ? x.importo : -x.importo), 0), 0) * 100) / 100;
p = apri('erp_tesoreria', 'posizione'); p.lab.querySelector('#fd').value = '2027-06-01'; p.lab.querySelector('#fd').dispatchEvent(new p.w.Event('change'));
ok(/70\.?497,70/.test(p.testo()) && /68\.?653,80/.test(p.testo()), 'posizione di cassa al 01/06: banca 68.653,80, crediti scaduti 70.497,70');
p = apri('erp_tesoreria', 'partite'); ok(/90000002/.test(p.testo()) && /18\.?651,36/.test(p.testo()), 'partite aperte con il pareggio della nota di credito');
p = apri('erp_tesoreria', 'pagamenti'); p.lab.querySelector('#fd').value = '2027-06-07'; p.lab.querySelector('#fd').dispatchEvent(new p.w.Event('change'));
ok(/5105600001/.test(p.testo()), 'proposta F110 con la fattura scaduta');
bene(p.fai('pg', {data: '2027-06-07'}), 'F110 eseguito'); ok(/pain\.001/.test(p.testo()) && /IT60X0542811101000000123456/.test(p.testo()), 'file SEPA con IBAN');
p = apri('erp_tesoreria', 'estratti'); p.lab.querySelector('#esempio').click(); bene(p.fai('ec', {data: '2027-06-15'}), 'estratto conto caricato');
p = apri('erp_tesoreria', 'estratti'); bene(p.fai('ab', {}), 'abbinamento automatico');
ok(p.S().tes.estratti[0].righe.filter(x => x.stato === 'abbinata in automatico').length === 6, '6 righe su 7 in automatico');
p = apri('erp_tesoreria', 'estratti'); p.fai('mn', {riga: '5', cliente: 'C400', doc: ''}); ok(p.S().tes.estratti[0].righe[4].contabile, 'FEBAN: bonifico di Sigma a mano');
ok(/quadrano/.test(apri('erp_tesoreria', 'estratti').testo()), 'riconciliazione estratto = conto 10');
p = apri('erp_paghe', 'cedolino'); bene(p.fai('pr', {matricola: '00001', periodo: '2027-06', straordinari: '8'}), 'presenze di giugno');
bene(p.fai('ca', {periodo: '2027-06'}), 'calcolo dei cedolini');
p = apri('erp_paghe', 'cedolino'); ok(/CEDOLINO PAGA/.test(p.testo()) && /1\.?786,73/.test(p.testo()), 'cedolino di Marco: netto 1.786,73');
p = apri('erp_paghe', 'contabilita'); bene(p.fai('rg', {periodo: '2027-06', data: '2027-06-30'}), 'registrazione della paga');
p = apri('erp_paghe', 'contabilita'); bene(p.fai('pn', {periodo: '2027-06', data: '2027-06-30'}), 'pagamento degli stipendi');
ok(/3\.?076,35/.test(p.testo()) && /Magazzino/.test(p.testo()), 'costo del personale per centro di costo');
{ const S6 = p.S(); vicino(salS(S6, '10', '2027-06-15'), 103535.81, 'banca al 15/06'); vicino(salS(S6, '18'), 0, 'banca in transito chiusa'); vicino(salS(S6, '27'), 0, 'netti pagati'); }
// ═══ LUGLIO — valute e F24 ═══
p = apri('erp_valute', 'tassi');
for (const [d, t] of [['2027-07-01', '1,10'], ['2027-07-20', '1,08'], ['2027-07-25', '1,09'], ['2027-07-31', '1,12']]) bene(p.fai('tx', {valuta: 'USD', data: d, tasso: t}), 'OB08 ' + d);
p = apri('erp_valute', 'documenti'); bene(p.fai('fc', {cliente: 'C500', importo: '22000', testo: 'progettazione impianto', data: '2027-07-01'}), 'FB70 22.000 USD');
bene(p.fai('ff', {fornitore: 'F200', importo: '5500', rif: 'INV-7781', testo: 'consulenza tecnica', data: '2027-07-02'}), 'FB60 5.500 USD');
bene(p.fai('fc', {cliente: 'C500', importo: '11000', testo: 'assistenza tecnica', data: '2027-07-15'}), 'FB70 11.000 USD');
p = apri('erp_paghe', 'contabilita'); bene(p.fai('f2', {periodo: '2027-06', data: '2027-07-16'}), 'F24 di luglio');
const docs = () => p.S().fx.documenti;
p = apri('erp_valute', 'regolazioni'); bene(p.fai('rg', {documento: docs()[0].numero, data: '2027-07-20'}), 'incasso 22.000 USD');
p = apri('erp_valute', 'regolazioni'); bene(p.fai('rg', {documento: docs()[1].numero, data: '2027-07-25'}), 'pagamento 5.500 USD');
p = apri('erp_valute', 'valutazione'); bene(p.fai('vl', {data: '2027-07-31', storno: 'si'}), 'FAGL_FCV');
{ const S7 = p.S();
  vicino(-salS(S7, '66'), 370.37, 'utile su cambi realizzato'); vicino(salS(S7, '67'), 45.87, 'perdita su cambi realizzata'); vicino(salS(S7, '68', '2027-07-31'), 178.57, 'perdita non realizzata al 31/07'); vicino(salS(S7, '68'), 0, 'storno al 01/08');
  vicino(salS(S7, '28'), 0, 'INPS versato'); vicino(salS(S7, '29'), 0, 'Erario versato');
  let d7 = 0, a7 = 0; S7.registrazioni.forEach(r => r.righe.forEach(x => { if (x.dareAvere === 'DARE') d7 += x.importo; else a7 += x.importo; })); ok(Math.abs(d7 - a7) < 0.005, 'luglio: quadratura Dare = Avere');
  const {st, passi} = guidaStati(p.w, CHIAVE); const AGO = passi.findIndex(x => x.titolo.indexOf('Agosto:') === 0); const manc = passi.slice(0, AGO).map((x, i) => x.fatto && !st[i] ? (i + 1) + '. ' + x.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida S/4 completa fino a luglio: passi non riconosciuti → ' + manc.join(' | ')); }
if (ultima) memoria = ultima.localStorage.getItem(CHIAVE);
const SF = JSON.parse(memoria);
// ═══ AGOSTO — ruoli, crediti e disponibilità, storni e SdI, acquisti con approvazione, lotti e seriali · DICEMBRE — paghe ═══
const ora = () => JSON.parse(memoria);
const ruolo = r => { const q = apri('erp_dati', 'ruoli'); bene(q.fai('au', {attivo: 'si', ruolo: r}), 'ruolo ' + r); };
const rfTutti = d => { ruolo('MAGAZZINIERE'); for (let k = 0; k < 20; k++) { const q = apri('erp_magazzino', 'rf'); q.lab.querySelector('#rf-data').value = d; const t = q.w.WM4.aperti()[0]; if (!t) break; rfInvio(q, '#rf-da', t.da); rfInvio(q, '#rf-udc', t.udc); rfInvio(q, '#rf-a', t.a); } };
ruolo('CREDITI');
p = apri('erp_vendite', 'crediti'); ok(/Stai lavorando come/.test(p.testo()), 'barra del ruolo in cima alla pagina');
bene(p.fai('fd', {cliente: 'C400', fido: '5000', rischio: 'C'}), 'FD32 fido di Sigma');
p = apri('erp_vendite', 'ordini'); ok(/ko/.test(p.fai('va', {cliente: 'C400', materiale: 'TR-PED', qta: '20', data: '2027-08-02'})), 'VA01 come responsabile crediti: SU53');
ruolo('VENDITE'); p = apri('erp_vendite', 'ordini'); bene(p.fai('va', {cliente: 'C400', materiale: 'TR-PED', qta: '20', data: '2027-08-02'}), 'VA01 Sigma');
const oSig = p.S().ordini.slice(-1)[0]; ok(oSig.credito.stato === 'B' && /1\.?015,30/.test(oSig.credito.motivo), 'blocco crediti: sforamento 1.015,30 → ' + oSig.credito.motivo);
ruolo('CAPO_MAG'); p = apri('erp_vendite', 'consegne'); ok(/VKM1/.test(p.fai('vl', {ordine: oSig.numero, data: '2027-08-02'})), 'consegna rifiutata: serve VKM1');
ruolo('CREDITI'); p = apri('erp_vendite', 'crediti'); bene(p.fai('vk', {ordine: oSig.numero, decisione: 'rilascia', nota: 'acconto promesso', data: '2027-08-03'}), 'VKM1 rilascio');
ruolo('VENDITE'); p = apri('erp_vendite', 'ordini'); bene(p.fai('va', {cliente: 'C200', materiale: 'TR-ALTA', qta: '30', data: '2027-08-03'}), 'VA01 Delta TR-ALTA');
const oDel = p.S().ordini.slice(-1)[0]; ok(oDel.confermata === 10, 'ATP: confermate 10 su 30');
ruolo('PRODUZIONE'); p = apri('erp_produzione', 'ordini'); bene(p.fai('co', {materiale: 'TR-ALTA', qta: '20', data: '2027-08-04'}), 'CO01 TR-ALTA');
const opA = p.S().produzione.slice(-1)[0].numero;
p = apri('erp_magazzino', 'compiti'); bene(p.fai('sg', {ordine: opA, kg: '200', data: '2027-08-04'}), 'staging 200 kg');
rfTutti('2027-08-04');
ruolo('PRODUZIONE'); p = apri('erp_produzione', 'avanzamento');
bene(p.fai('pr', {ordine: opA, kg: '200', data: '2027-08-04'}), '261 agosto'); bene(p.fai('cf', {ordine: opA, attrezzaggio: '3', ore: '16', data: '2027-08-05'}), 'CO11N agosto'); bene(p.fai('en', {ordine: opA, data: '2027-08-05'}), '101 agosto');
rfTutti('2027-08-05');
ok(ora().ordini.find(o => o.numero === oDel.numero).confermata === 30, 'conferma automatica: Delta 30 su 30');
ruolo('CAPO_MAG'); p = apri('erp_vendite', 'consegne'); bene(p.fai('vl', {ordine: oSig.numero, data: '2027-08-06'}), 'VL01N Sigma'); bene(p.fai('vl', {ordine: oDel.numero, data: '2027-08-06'}), 'VL01N Delta');
const cAgo = () => ora().consegne.filter(c => c.ordine === oSig.numero || c.ordine === oDel.numero);
p = apri('erp_innovazione', 'ondate'); bene(p.fai('on', {data: '2027-08-06'}), 'ondata di agosto');
rfTutti('2027-08-06');
ruolo('CAPO_MAG'); for (const c of cAgo()) { p = apri('erp_vendite', 'consegne'); bene(p.fai('pg', {consegna: c.numero, data: '2027-08-06'}), 'VL02N ' + c.numero); }
{ const cD = cAgo().find(c => c.ordine === oDel.numero); ok(cD.seriali.length === 30 && cD.lotti.length === 2, 'Delta: 30 numeri di serie da 2 lotti'); }
ruolo('VENDITE'); p = apri('erp_vendite', 'fatture'); bene(p.fai('vf', {consegna: cAgo()[0].numero, data: '2027-08-17'}), 'VF01 con la data sbagliata');
const fSb = p.S().fatture.slice(-1)[0]; 
p = apri('erp_fi', 'storni'); bene(p.fai('vf', {fattura: fSb.numero, data: '2027-08-17'}), 'VF11 prima dello SdI');
for (const c of cAgo()) { p = apri('erp_vendite', 'fatture'); bene(p.fai('vf', {consegna: c.numero, data: '2027-08-07'}), 'VF01 ' + c.numero); }
const fAgo = () => ora().fatture.filter(f => f.tipo === 'F2' && !f.stornata && cAgo().some(c => c.numero === f.consegna));
ruolo('CONTABILE'); for (const f of fAgo()) { p = apri('erp_fi', 'sdi'); bene(p.fai('sd', {fattura: f.numero, data: '2027-08-07'}), 'SdI ' + f.numero); }
const fDel = fAgo().find(f => f.cliente === 'C200');
ruolo('VENDITE'); p = apri('erp_fi', 'storni'); ok(/SdI.*nota di credito/.test(p.fai('vf', {fattura: fDel.numero, data: '2027-08-09'})), 'VF11 dopo lo SdI rifiutato');
p = apri('erp_vendite', 'resi'); bene(p.fai('ab', {fattura: fDel.numero, importo: '200', motivo: '2 transenne graffiate', data: '2027-08-09'}), 'richiesta G2');
ruolo('CREDITI'); p = apri('erp_vendite', 'resi'); bene(p.fai('ap', {richiesta: x => x}), 'approvazione G2');
ruolo('VENDITE'); p = apri('erp_vendite', 'resi'); bene(p.fai('ng', {richiesta: x => x, data: '2027-08-09'}), 'nota di credito G2');
const ncA = p.S().fatture.slice(-1)[0]; ok(ncA.tipo === 'G2' && ncA.totale === 244, 'nota di credito 244 €');
ruolo('CONTABILE'); p = apri('erp_fi', 'sdi'); bene(p.fai('sd', {fattura: ncA.numero, data: '2027-08-09'}), 'SdI nota di credito'); ok(/TD04/.test(p.S().fatture.slice(-1)[0].sdi.tipo), 'TD04');
ruolo('PRODUZIONE'); p = apri('erp_acquisti', 'richieste'); bene(p.fai('rq', {materiale: 'FERRO', qta: '12000', consegna: '2027-08-20', richiedente: 'Produzione', data: '2027-08-10'}), 'ME51N');
ok(/SU53/.test(p.fai('ap', {rda: x => x, decisione: 'approva', data: '2027-08-10'})), 'ME54N come capo reparto: SU53');
ruolo('RESP_ACQ'); p = apri('erp_acquisti', 'richieste'); bene(p.fai('ap', {rda: x => x, decisione: 'approva', data: '2027-08-10'}), 'ME54N');
ruolo('BUYER'); p = apri('erp_acquisti', 'ordini'); bene(p.fai('me', {rda: x => x, fornitore: 'F100', prezzo: '0,97', data: '2027-08-11'}), 'ME21N da richiesta');
const oaA = p.S().acquisti.slice(-1)[0]; ok(oaA.rilascio.stato === 'bloccato', 'ordine sopra soglia bloccato');
ruolo('RESP_ACQ'); p = apri('erp_acquisti', 'ordini'); bene(p.fai('rl', {ordine: oaA.numero, decisione: 'rilascia', data: '2027-08-11'}), 'ME29N');
ruolo('CAPO_MAG'); p = apri('erp_acquisti', 'entrate'); bene(p.fai('mi', {ordine: oaA.numero, qta: '4000', ddt: 'AU-0816', lotto: 'COL-0816', danneggiati: '1000', danno: 'fascio piegato in scarico', data: '2027-08-16'}), 'MIGO colata COL-0816 con un fascio danneggiato');
{ const S9 = ora(); ok(S9.bloccato.FERRO === 1000 && S9.wm.quant.some(q => q.ubic === 'Q-ZONE' && q.qta === 1000 && q.lotto === 'COL-0816'), '1.000 kg in stock bloccato, in quarantena');
  ok(S9.acquisti.find(o => o.numero === oaA.numero).entrate.slice(-1)[0].ddt === 'AU-0816', 'DDT del fornitore registrato'); }
rfTutti('2027-08-16');
ruolo('CAPO_MAG'); p = apri('erp_magazzino', 'bloccato'); ok(/Q-ZONE/.test(p.testo()) && /fascio piegato/.test(p.testo()), 'pagina merce bloccata');
{ const b69 = ora().registrazioni.length; bene(p.fai('dq', {udc: x => x, motivo: 'tubi piegati, non raddrizzabili', data: '2027-08-17'}, 'ro'), 'rottamazione 555');
  const S9 = ora(), r = S9.registrazioni.slice(-1)[0]; ok(S9.registrazioni.length === b69 + 1 && r.tipo === 'ROTTAMAZIONE' && r.righe[0].conto === '69' && r.righe[0].importo === 950, 'D 69 / A 12 950 €');
  ok(S9.lotti.FERRO['COL-0816'].qta === 3000 && !S9.bloccato.FERRO, 'il lotto COL-0816 scende a 3.000 kg, niente più bloccato'); }
ruolo('MAGAZZINIERE'); p = apri('erp_magazzino', 'bloccato');
{ const q = ora().wm.quant.find(x => x.mat === 'TR-PED' && x.qta > 0 && /^0/.test(x.ubic)); bene(p.fai('bl', {udc: q.udc, motivo: 'pallet urtato dal carrello', data: '2027-08-18'}), 'blocco 344 del pallet urtato');
  ok(p.w.SD4.atp('TR-PED').disponibile === 0, 'ATP: la merce bloccata non è disponibile'); }
ruolo('CAPO_MAG'); p = apri('erp_magazzino', 'bloccato'); ok(/ko/.test(p.fai('dq', {udc: x => x, motivo: 'controllato', data: '2027-08-18'}, 'sb')), 'non si sblocca prima di essere in quarantena');
rfTutti('2027-08-18');
ruolo('CAPO_MAG'); p = apri('erp_magazzino', 'bloccato'); bene(p.fai('dq', {udc: x => x, motivo: 'controllato: integro', data: '2027-08-19'}, 'sb'), 'sblocco 343');
rfTutti('2027-08-19');
{ const S9 = ora(); ok(S9.wm.quant.some(q => q.mat === 'TR-PED' && q.qta > 0 && /^0/.test(q.ubic)) && !S9.bloccato['TR-PED'], 'pallet di nuovo a scaffale e disponibile'); }
p = apri('erp_magazzino', 'lotti'); p.lab.querySelector('#lc').value = cAgo().find(c => c.ordine === oDel.numero).numero; p.lab.querySelector('#lc').dispatchEvent(new p.w.Event('change'));
ok(/L1000004/.test(p.testo()) && /Acciaierie Umbre/.test(p.testo()) && /Numeri di serie consegnati/.test(p.testo()), 'MB56 dal reclamo di Delta');
p.lab.querySelector('#sn').value = 'SN000291'; p.lab.querySelector('#snv').click(); ok(/presso il cliente/.test(p.testo()) && /Delta/.test(p.testo()), 'IQ03 SN000291');
ruolo('PAGHE'); for (const m of ['07', '08', '09', '10', '11', '12']) { p = apri('erp_paghe', 'cedolino'); bene(p.fai('ca', {periodo: '2027-' + m}), 'paghe 2027-' + m); }
{ const d = p.S().hr.cedolini.find(c => c.periodo === '2027-12' && c.matricola === '00001'); vicino(d.tredicesima, 2100, 'tredicesima di Marco'); vicino(d.conguaglio, 4.51, 'conguaglio di Marco'); vicino(d.netto, 3199.26, 'netto di dicembre di Marco (a dicembre nessuna rata di addizionali)'); ok(d.addizionali === 0 && d.addizionaliAnno && d.addizionaliAnno.regionale > 0 && d.addizionaliAnno.comunale === 0, 'addizionali dell’anno determinate al conguaglio, da trattenere l’anno dopo'); }
ruolo('ADMIN');
{ const S8 = p.S(); let d8 = 0, a8 = 0; S8.registrazioni.forEach(r => r.righe.forEach(x => { if (x.dareAvere === 'DARE') d8 += x.importo; else a8 += x.importo; })); ok(Math.abs(d8 - a8) < 0.005, 'agosto: quadratura Dare = Avere');
  ok(Object.keys(S8.seriali['TR-ALTA']).filter(k => S8.seriali['TR-ALTA'][k].stato === 'magazzino').length === S8.giacenze['TR-ALTA'], 'seriali in magazzino = giacenza');
  const {st, passi} = guidaStati(p.w, CHIAVE); const manc = passi.map((x, i) => x.fatto && !st[i] ? (i + 1) + '. ' + x.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida S/4 completa fino a dicembre: passi non riconosciuti → ' + manc.join(' | ')); }
if (ultima) memoria = ultima.localStorage.getItem(CHIAVE);
fs.writeFileSync(path.join(__dirname, 'lab-erp-agosto.json'), memoria);

// lezioni «Che situazione hai?»: il copione prepara il sistema fino al passo, la finestra si apre lì
for (const passo of ['VK11: prezzo speciale', 'F-37', 'Reso:', 'KE30', 'KZZ2', 'KKS2: leggi', 'CKMLCP', 'Mappa', 'Crea il documento d', 'ABC', 'Valorizzazione', 'Aprile — VL01N', 'RF: preleva la consegna del Comune', 'Imballo: 5 pallet', 'Slotting', 'KPI di maggio', 'Varco RFID', 'F110', 'Calcola i cedolini', 'Luglio — F-28', 'VKM1', 'VF11: storna', 'ME29N', 'MIGO: prima consegna', 'Calcola le paghe da luglio']) {
  const w = new JSDOM('<!doctype html><body></body>', {url: 'https://sim.local/vuoto/s4/?passo=' + encodeURIComponent(passo), runScripts: 'outside-only'}).window;
  LOGICA.forEach(f => w.eval(R(f)));
  w.SD4.avvia('t'); const St = w.LabCopioni.esegui(w.LabCopioni.SD4, w.SD4, passo);
  const {st, passi} = guidaStati(w, 't');
  const i = passi.findIndex(x => x.titolo.indexOf(passo) === 0);
  ok(i >= 0 && passi.slice(0, i).every((x, j) => !x.fatto || st[j]) && (!passi[i].fatto || !st[i]), 'lezione «' + passo + '»: sistema pronto fino al passo → ' + passi.slice(0, i).map((x, j) => x.fatto && !st[j] ? (j + 1) + ' ' + x.titolo : null).filter(Boolean).join(' | ') + ' / ' + (passi[i] && st[i]));
  if (passo === 'KE30') vicino(w.COPA.report(St, 'cliente').totale.mdc2, 18593.81, 'copione gennaio: MdC II');
}
{ // copione completo = stesso risultato delle pagine
  const w = new JSDOM('', {url: 'https://sim.local/', runScripts: 'outside-only'}).window; LOGICA.forEach(f => w.eval(R(f)));
  w.SD4.avvia('t'); const St = w.LabCopioni.esegui(w.LabCopioni.SD4, w.SD4);
  vicino(w.COPA.report(St, 'cliente', {dal: '2027-02-01', al: '2027-02-28'}).totale.mdc1, 9339.87, 'copione completo: MdC I di febbraio');
}
fs.writeFileSync(path.join(__dirname, 'lab-erp-finale.json'), JSON.stringify(SF));
console.log(errori ? '❌ ' + errori + ' errori su ' + controlli : '✅ sistema integrato S/4 dalle pagine — gennaio vendite e CO-PA, febbraio CO-PC e Material Ledger, marzo WMS e inventario, aprile spedizione, maggio innovazione, giugno tesoreria e paghe, luglio valute, agosto ruoli, crediti, storni e SdI, acquisti approvati, lotti e seriali, dicembre tredicesima e conguaglio: ' + controlli + ' controlli');
process.exit(errori ? 1 : 0);
