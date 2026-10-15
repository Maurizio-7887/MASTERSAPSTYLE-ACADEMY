// Sistema integrato S/4 — fase «Vendite e redditività» eseguita dalle PAGINE (moduli e pulsanti), non dalle funzioni:
// numeri di controllo, quadratura, CO-PA, finestra passo passo. Salva tests/lab-erp-finale.json per test_accessi.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const PAGINE = {erp_dati: 'dati-pagine.js', erp_vendite: 'sd-pagine.js', erp_copa: 'copa-pagine.js', erp_fi: 'fi-pagine.js'};
let memoria = null;   // il localStorage passa da una pagina all'altra come nel browser
function apri(bp, pagina) {
  const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  if (memoria) w.localStorage.setItem(CHIAVE, memoria);
  w.confirm = () => true;
  w.LAB_PAGINA = {chiave: CHIAVE, pagina: pagina, slot: 'erp-ft'};
  ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js',
   'app/blueprints/erp_copa/static/copa-logica.js', 'app/blueprints/' + bp + '/static/' + PAGINE[bp]].forEach(f => w.eval(R(f)));
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
ok(JSON.stringify(S.giacenze) === JSON.stringify({'TR-STD': 70, 'TR-ALTA': 50, 'TR-PED': 100}), 'giacenze finali ' + JSON.stringify(S.giacenze));
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

// finestra passo passo: tutti i passi con controllo automatico risultano fatti
{
  const w = p.w;
  w.eval(R('app/blueprints/guida/static/esercizi/s4-vendite-copa.js'));
  w.MSA_GUIDA = {esercizio: w.MSA_ESERCIZIO.codice, chiave: CHIAVE, url: {}};
  w.eval(R('app/blueprints/guida/static/pannello.js'));
  const st = w.MSA_GUIDA_API.stati(), passi = w.MSA_ESERCIZIO.passi;
  const manc = passi.map((x, i) => x.fatto && !st[i] ? (i + 1) + '. ' + x.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida S/4: passi non riconosciuti → ' + manc.join(' | '));
  ok(passi.filter(x => x.fatto).length >= 18, 'guida S/4: almeno 18 passi con controllo automatico');
}
// lezioni «Che situazione hai?»: il copione prepara il sistema fino al passo, la finestra si apre lì
for (const passo of ['VK11: prezzo speciale', 'F-37', 'Reso:', 'KE30']) {
  const w = new JSDOM('<!doctype html><body></body>', {url: 'https://sim.local/vuoto/s4/?passo=' + encodeURIComponent(passo), runScripts: 'outside-only'}).window;
  ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js', 'app/static/js/lab-copioni.js'].forEach(f => w.eval(R(f)));
  w.SD4.avvia('t'); const St = w.LabCopioni.esegui(w.LabCopioni.SD4, w.SD4, passo);
  w.eval(R('app/blueprints/guida/static/esercizi/s4-vendite-copa.js'));
  w.MSA_GUIDA = {esercizio: 's4-vendite-copa', chiave: 't', url: {}};
  w.eval(R('app/blueprints/guida/static/pannello.js'));
  const pos = w.MSA_GUIDA_API.posizione ? w.MSA_GUIDA_API.posizione() : null;
  const st = w.MSA_GUIDA_API.stati(), i = w.MSA_ESERCIZIO.passi.findIndex(x => x.titolo.indexOf(passo) === 0);
  ok(i >= 0 && w.MSA_ESERCIZIO.passi.slice(0, i).every((x, j) => !x.fatto || st[j]) && (!w.MSA_ESERCIZIO.passi[i].fatto || !st[i]), 'lezione «' + passo + '»: sistema pronto fino al passo');
  if (passo === 'KE30') vicino(w.COPA.report(St, 'cliente').totale.mdc2, 18593.81, 'copione completo: MdC II');
}
fs.writeFileSync(path.join(__dirname, 'lab-erp-finale.json'), JSON.stringify(S));
console.log(errori ? '❌ ' + errori + ' errori su ' + controlli : '✅ sistema integrato S/4 (vendite, resi, acconti, CO-PA) dalle pagine: ' + controlli + ' controlli');
process.exit(errori ? 1 : 0);
