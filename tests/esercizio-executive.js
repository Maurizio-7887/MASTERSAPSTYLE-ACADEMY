// «Executive Assistant»: il negozio di informatica Pixel & Bit apre il 01/09/2026 — tutto l'esercizio dalle pagine, con il WMS, la ricostruzione delle scritture e le spunte della guida.
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
const GUIDA = 'app/blueprints/guida/static/esercizi/executive-assistant.js';

let memoria = null, ultima = null;
function apri(bp, pagina) {
  if (ultima) memoria = ultima.localStorage.getItem(CHIAVE) || memoria;
  if (ultima) ultima.close();
  const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  ultima = w;
  if (memoria) w.localStorage.setItem(CHIAVE, memoria);
  w.confirm = () => true;
  w.LAB_PAGINA = {chiave: CHIAVE, pagina: pagina, slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/' + bp + '/static/' + PAGINE[bp]]).forEach(f => w.eval(R(f)));
  w.MSA_GUIDA = {esercizio: 'executive-assistant', chiave: CHIAVE, versione: 'vuoto', url: {}};
  if (fs.existsSync(path.join(__dirname, '..', GUIDA))) w.eval(R(GUIDA));
  w.eval(R('app/blueprints/guida/static/ragioneria.js'));
  w.eval(R('app/blueprints/guida/static/pannello.js'));
  const lab = w.document.getElementById('lab');
  return {w, lab, S: () => w.MSA_STATO_CORRENTE(), testo: () => lab.textContent,
    fai(pref, valori, azione) {
      const regPrima = w.MSA_STATO_CORRENTE().registrazioni.length;
      Object.entries(valori).forEach(([k, v]) => {
        const el = lab.querySelector('#' + pref + '-' + k); if (!el) throw Error('campo ' + pref + '-' + k + ' assente in ' + pagina);
        if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === v)) throw Error('opzione ' + v + ' assente in ' + pref + '-' + k + ' (' + pagina + ')');
        if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
      });
      const b = lab.querySelector('[data-prefisso="' + pref + '"] [data-azione="' + (azione || pref) + '"]'); if (!b) throw Error('pulsante ' + pref + ' assente in ' + pagina);
      b.click();
      const es = lab.querySelector('#' + pref + '-esito'), esito = es ? es.className + ' ' + es.textContent : '';
      verificaQuiz(w, regPrima);
      memoria = w.localStorage.getItem(CHIAVE);
      return esito;
    }};
}
function verificaQuiz(w, regPrima) {
  const S = w.MSA_STATO_CORRENTE(), nuovi = S.registrazioni.slice(regPrima).filter(r => r.quiz !== false).length;
  ok(S.msaRagioneria.coda.length === nuovi, 'una domanda per ogni nuovo documento contabile');
  while (S.msaRagioneria.coda.length) {
    const q = S.msaRagioneria.coda[0], rs = q.documento.righe.map((r, i) => ({r, i})).sort((a, b) => String(a.r.conto).localeCompare(String(b.r.conto), 'it', {numeric: true}) || a.i - b.i).map(x => x.r);
    [...w.document.querySelectorAll('.msa-q-riga')].forEach((el, i) => {
      el.querySelector('.msa-q-conto').value = rs[i].conto; el.querySelector('.msa-q-sezione').value = rs[i].dareAvere;
      el.querySelector('input').value = rs[i].importo.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    });
    w.document.querySelector('.msa-q-verifica').click();
    ok(q.corretto, 'ricostruzione corretta del documento ' + q.documento.tipo);
    w.document.querySelector('.msa-q-continua').click();
  }
}
const bene = (r, m) => ok(/lab-esito ok/.test(r) || /^ok /.test(r.split(' ').slice(1).join(' ')) || / ok /.test(' ' + r.split(' ')[1] + ' '), m + ' → ' + r.slice(0, 200));
let p;
const saldo = (conto, partner) => { let t = 0; p.S().registrazioni.forEach(r => r.righe.forEach(x => { if (x.conto === conto && (!partner || x.partner === partner)) t += x.dareAvere === 'DARE' ? x.importo : -x.importo; })); return Math.round(t * 100) / 100; };
const vicinoS = (conto, atteso, m) => vicino(saldo(conto), atteso, m + ' (conto ' + conto + ')');
function fino(pezzo) {
  if (!p.w.MSA_ESERCIZIO) return;
  const passi = p.w.MSA_ESERCIZIO.passi, k = passi.findIndex(x => x.titolo.indexOf(pezzo) >= 0);
  ok(k >= 0, 'passo della guida «' + pezzo + '»');
  for (let i = 0; i <= k; i++) if (passi[i].fatto) ok(passi[i].fatto({S: p.S()}), 'guida spuntata: ' + passi[i].titolo + ' (a «' + pezzo + '»)');
  const dopo = passi.slice(k + 1).find(x => x.fatto);
  if (dopo) ok(!dopo.fatto({S: p.S()}), 'guida non ancora spuntata: ' + dopo.titolo + ' (dopo «' + pezzo + '»)');
}
function controlla(nome) {
  const s = p.S(), t = s.registrazioni.reduce((v, r) => { r.righe.forEach(x => v[x.dareAvere] += x.importo); return v; }, {DARE: 0, AVERE: 0});
  vicino(t.DARE, t.AVERE, nome + ' Dare=Avere');
  if (s.wm && s.wm.attivo) ok(p.w.WM4.quadratura().every(x => x.ok), nome + ' IM=WMS');
}
function rfTutti(data, tipo, n) {
  p = apri('erp_magazzino', 'rf');
  const regs = p.S().registrazioni.length; let fatti = 0;
  while (p.w.WM4.aperti().length) {
    const t = p.w.WM4.aperti()[0];
    ok(t.tipo === tipo, 'tipo compito ' + tipo + ' (trovato ' + t.tipo + ')');
    p.lab.querySelector('#rf-data').value = data;
    for (const [id, value] of [['rf-da', t.da], ['rf-udc', t.udc || t.mat], ['rf-qta', String(t.qta)], ['rf-a', t.a]]) p.lab.querySelector('#' + id).value = value;
    p.lab.querySelector('#rf-ok').click();
    ok(p.S().wm.compiti.find(x => x.numero === t.numero).stato === 'confermato', 'RF confermato ' + t.numero);
    memoria = p.w.localStorage.getItem(CHIAVE); fatti++;
  }
  ok(n == null ? fatti > 0 : fatti === n, 'RF ' + tipo + ': attesi ' + n + ' compiti, confermati ' + fatti);
  ok(p.S().registrazioni.length === regs, 'la pistola RF non genera scritture');
}

// ── piano dei 4 mesi: acquisti [fornitore, merce, qta, prezzo, DDT, fattura] e vendite [cliente, merce, qta, riferimento] ──
const MESI = {
  '09': {po: '02', gr: '04', miro: '07', so: '10', cons: '14', fatt: '15', fine: '30',
    acq: [['F100', 'PC-UFF', 10, '450', 'DDT-DPC-0412', 'DPC-2026-1520'], ['F200', 'STAMP-LAS', 6, '120', 'DDT-SF-118', 'SF-0931'], ['F300', 'MON-24', 10, '95', 'DDT-VS-2290', 'VS-4410'],
      ['F400', 'MOUSE', 30, '6', 'DDT-AD-077', 'AD-301'], ['F400', 'CAVO-HDMI', 40, '3', 'DDT-AD-078', 'AD-302']],
    ven: [['C100', 'PC-UFF', 4, 'AURORA-PC'], ['C100', 'MON-24', 4, 'AURORA-MON'], ['C100', 'MOUSE', 4, 'AURORA-MOUSE'], ['C200', 'STAMP-LAS', 3, 'GIRASOLE-STAMP'], ['C200', 'CAVO-HDMI', 15, 'GIRASOLE-CAVI']]},
  '10': {po: '02', gr: '06', miro: '08', so: '12', cons: '15', fatt: '16', fine: '30',
    acq: [['F100', 'PC-UFF', 20, '450', 'DDT-DPC-0533', 'DPC-2026-1688'], ['F300', 'MON-24', 10, '95', 'DDT-VS-2391', 'VS-4502'], ['F200', 'STAMP-LAS', 6, '120', 'DDT-SF-142', 'SF-1017']],
    ven: [['C100', 'PC-UFF', 10, 'AURORA-OTT-PC'], ['C100', 'MON-24', 8, 'AURORA-OTT-MON'], ['C200', 'PC-UFF', 8, 'GIRASOLE-OTT-PC'], ['C200', 'STAMP-LAS', 6, 'GIRASOLE-OTT-STAMP']]},
  '11': {po: '02', gr: '05', miro: '06', so: '10', cons: '13', fatt: '16', fine: '30',
    acq: [['F100', 'PC-UFF', 25, '450', 'DDT-DPC-0611', 'DPC-2026-1802'], ['F300', 'MON-24', 10, '95', 'DDT-VS-2475', 'VS-4633'], ['F400', 'MOUSE', 30, '6', 'DDT-AD-121', 'AD-388']],
    ven: [['C100', 'PC-UFF', 12, 'AURORA-NOV-PC'], ['C100', 'MOUSE', 25, 'AURORA-NOV-MOUSE'], ['C200', 'PC-UFF', 12, 'GIRASOLE-NOV-PC'], ['C200', 'MON-24', 12, 'GIRASOLE-NOV-MON']]},
  '12': {po: '01', gr: '03', miro: '04', so: '07', cons: '10', fatt: '11', fine: '31',
    acq: [['F100', 'PC-UFF', 30, '450', 'DDT-DPC-0702', 'DPC-2026-1955'], ['F200', 'STAMP-LAS', 8, '120', 'DDT-SF-171', 'SF-1123'], ['F400', 'CAVO-HDMI', 40, '3', 'DDT-AD-160', 'AD-452']],
    ven: [['C100', 'PC-UFF', 15, 'AURORA-DIC-PC'], ['C100', 'STAMP-LAS', 6, 'AURORA-DIC-STAMP'], ['C200', 'PC-UFF', 15, 'GIRASOLE-DIC-PC'], ['C200', 'CAVO-HDMI', 40, 'GIRASOLE-DIC-CAVI']]}};
const d = (m, g) => '2026-' + m + '-' + g;
const oda = (m, mat) => p.S().acquisti.find(o => o.materiale === mat && o.data === d(m, MESI[m].po)).numero;
const odv = rif => p.S().ordini.find(o => o.rif === rif);
const cons = rif => p.S().consegne.find(c => c.ordine === odv(rif).numero);
const pagaTutti = (data, lista) => { for (const f of lista) if (saldo('20', f) < 0) { p = apri('erp_fi', 'passive'); bene(p.fai('pg', {fornitore: f, data: data}), 'F-53 ' + f + ' ' + data); } };
const incassa = data => { for (const c of ['C100', 'C200']) { const x = saldo('11', c); if (x > 0) { p = apri('erp_vendite', 'incassi'); bene(p.fai('in', {cliente: c, importo: x.toFixed(2).replace('.', ','), rif: 'SALDO ' + c + ' ' + data, data: data}), 'incasso ' + c + ' ' + data); } } };
function acquisti(m, fini) {
  const M = MESI[m];
  for (const [f, mat, q, pr] of M.acq) { p = apri('erp_acquisti', 'ordini'); bene(p.fai('me', {fornitore: f, materiale: mat, qta: String(q), prezzo: pr, data: d(m, M.po)}), 'ME21N ' + m + ' ' + mat); }
  if (fini) fino(fini[0]);
  for (const o of p.S().acquisti.filter(x => x.rilascio && x.rilascio.stato !== 'rilasciato')) { p = apri('erp_acquisti', 'ordini'); bene(p.fai('rl', {ordine: o.numero, decisione: 'rilascia', data: d(m, M.po)}), 'ME29N ' + o.numero); RILASCI.push(m); }
  if (fini && RILASCI.includes(m)) fino(m === '11' ? 'Novembre · ME29N' : 'Dicembre · ME29N');
  for (const [f, mat, q, pr, ddt] of M.acq) { p = apri('erp_acquisti', 'entrate'); bene(p.fai('mi', {ordine: oda(m, mat), ddt: ddt, data: d(m, M.gr)}), 'MIGO ' + m + ' ' + mat); }
  if (fini) fino(fini[1]);
  rfTutti(d(m, M.gr), 'PUTAWAY', M.acq.length); if (fini) fino(fini[2]);
  for (const [f, mat, q, pr, ddt, rif] of M.acq) { p = apri('erp_acquisti', 'fatture'); bene(p.fai('mr', {ordine: oda(m, mat), rif: rif, data: d(m, M.miro)}), 'MIRO ' + m + ' ' + mat); }
  if (fini) fino(fini[3]);
  vicinoS('22', 0, 'fatture da ricevere chiuse ' + m); vicinoS('63', 0, 'nessuna differenza prezzo ' + m);
}
function vendite(m, fini) {
  const M = MESI[m];
  for (const [c, mat, q, rif] of M.ven) { p = apri('erp_vendite', 'ordini'); bene(p.fai('va', {cliente: c, materiale: mat, qta: String(q), rif: rif, data: d(m, M.so), consegna: d(m, M.cons)}), 'VA01 ' + rif); }
  if (fini) fino(fini[0]);
  for (const [c, mat, q, rif] of M.ven) { p = apri('erp_vendite', 'consegne'); bene(p.fai('vl', {ordine: odv(rif).numero, data: d(m, M.cons)}), 'VL01N ' + rif); }
  if (fini) fino(fini[1]);
  rfTutti(d(m, M.cons), 'PICK', null); if (fini) fino(fini[2]);
  for (const [c, mat, q, rif] of M.ven) { p = apri('erp_vendite', 'consegne'); bene(p.fai('pg', {consegna: cons(rif).numero, data: d(m, M.cons)}), 'uscita merci ' + rif); }
  if (fini) fino(fini[3]);
  for (const [c, mat, q, rif] of M.ven) { p = apri('erp_vendite', 'fatture'); bene(p.fai('vf', {consegna: cons(rif).numero, data: d(m, M.fatt)}), 'VF01 ' + rif); }
  if (fini) fino(fini[4]);
  for (const f of p.S().fatture.filter(x => !x.sdi)) { p = apri('erp_fi', 'sdi'); bene(p.fai('sd', {fattura: f.numero, data: d(m, M.fatt)}), 'SdI ' + f.numero); }
  if (fini) fino(fini[5]);
}
function stipendio(m, fini) {
  const per = '2026-' + m, fine = d(m, MESI[m].fine);
  p = apri('erp_paghe', 'cedolino'); bene(p.fai('ca', {periodo: per}), 'cedolino ' + per);
  p = apri('erp_paghe', 'contabilita'); bene(p.fai('rg', {periodo: per, data: fine}), 'registra le paghe ' + per);
  p = apri('erp_paghe', 'contabilita'); bene(p.fai('pn', {periodo: per, data: fine}), 'paga il netto ' + per);
  if (fini) fino(fini);
}
const f24 = (per, data) => { p = apri('erp_paghe', 'contabilita'); bene(p.fai('f2', {periodo: per, data: data}), 'F24 paghe ' + per); };
const liquida = (per, data) => { p = apri('erp_chiusura', 'iva'); bene(p.fai('lq', {periodo: per, data: data}), 'liquidazione IVA ' + per); };
const versaIva = (per, data) => { p = apri('erp_chiusura', 'iva'); bene(p.fai('vs', {periodo: per, data: data}), 'F24 IVA ' + per); };
const RIEP = {}, RILASCI = [];
const fotografa = m => { RIEP[m] = {banca: saldo('10'), ricavi: -saldo('40'), cogs: saldo('41'), mag: saldo('13'), pers: saldo('80') + saldo('81') + saldo('82'), iva25: saldo('25'), scorte: JSON.stringify(p.S().giacenze)}; };

// ══ SETTEMBRE: il negozio apre ══
p = apri('erp_dati', 'avvio'); p.fai('ng', {data: '2026-09-01', capitale: '30000'}); ok(/Pixel & Bit/.test(p.testo()) && !!p.S().costituzione, 'costituzione del negozio'); fino('Apri il negozio');
ok(p.S().negozio === true && /Pixel & Bit/.test(p.S().societa), 'negozio Pixel & Bit');
ok(Object.keys(p.S().materiali).join() === 'PC-UFF,STAMP-LAS,MON-24,MOUSE,CAVO-HDMI', 'solo le merci del negozio');
ok(Object.keys(p.S().fornitori).length === 7 && Object.keys(p.S().clienti).length === 2, '4 fornitori di merce + 3 di servizi e arredi, 2 clienti');
ok(p.S().hr.dipendenti.length === 1 && p.S().hr.dipendenti[0].assunzione === '2026-09-01', 'una dipendente assunta il 01/09');
ok(p.S().condizioni.length === 5 && p.S().condizioni.every(c => c.tipo === 'PR00'), 'listino: solo i 5 prezzi');
p = apri('erp_dati', 'avvio'); p.fai('vs', {data: '2026-09-01'}); ok(/Capitale interamente versato/.test(p.testo()), 'versamento dei soci'); fino('versano il capitale');
vicinoS('10', 30000, 'banca dopo il versamento');
p = apri('erp_dati', 'anagrafiche'); ok(/Studio Commerciale Aurora/.test(p.testo()) && /Accessori Digitali/.test(p.testo()) && /HAWA/.test(p.testo()), 'anagrafiche del negozio');
p = apri('erp_magazzino', 'struttura'); p.fai('at', {data: '2026-09-01'}); ok(p.S().wm && p.S().wm.attivo === '2026-09-01' && Object.keys(p.S().wm.ubicazioni).length === 41, 'attiva W100: 41 ubicazioni'); fino('Attiva il magazzino');
p = apri('erp_dati', 'avvio'); ok(!p.S().materiali.FERRO && !p.S().clienti.C300 && !p.S().fornitori.F800, 'nessun dato di Ferro & Transenne dopo il ricaricamento');
// arredi e macchine del negozio
p = apri('erp_cespiti', 'acquisto'); ok(/Mobili e arredi del negozio/.test(p.testo()) && !/Impianti e macchinari \(10%\)/.test(p.testo()), 'classi di cespite del negozio');
bene(p.fai('ac', {descrizione: 'Banco, scaffali e vetrine del negozio', classe: 'ARR', fornitore: 'F700', importo: '6000', iva: '22', rif: 'AN-2026-088', inFunzione: '2026-09-01', data: '2026-09-01'}), 'cespite arredi');
p = apri('erp_cespiti', 'acquisto'); bene(p.fai('ac', {descrizione: 'PC e registratore di cassa telematico per il banco', classe: 'EDP', fornitore: 'F100', importo: '1500', iva: '22', rif: 'DPC-2026-1490', inFunzione: '2026-09-01', data: '2026-09-01'}), 'cespite cassa');
fino('registratore di cassa'); vicinoS('01', 6000, 'arredi'); vicinoS('03', 1500, 'macchine d’ufficio'); vicinoS('14', 1650, 'IVA sui cespiti');
acquisti('09', ['ordina 40 cavi HDMI', 'ricevi i cavi', 'metti a scaffale', 'fattura dei cavi']);
vicinoS('13', 6470, 'merci a magazzino');
controlla('acquisti di settembre');
vendite('09', ['Girasole ordina 15 cavi', 'crea le 5 consegne', 'RF: preleva', 'Uscita merci', 'fattura le 5 consegne', 'Trasmetti le 5 fatture']);
vicinoS('40', -4354, 'ricavi di settembre'); vicinoS('41', 2609, 'costo del venduto di settembre');
stipendio('09', 'Paga lo stipendio');
vicinoS('80', 1800, 'salari'); vicinoS('27', 0, 'netto pagato');
pagaTutti('2026-09-30', ['F100', 'F200', 'F300', 'F400', 'F700']); fino('paga Arredo Negozi');
vicinoS('20', 0, 'fornitori pagati');
incassa('2026-09-30'); fino('incassa dall’Agenzia'); vicinoS('11', 0, 'clienti incassati');
liquida('2026-09', '2026-09-30'); fino('Liquida l’IVA di settembre');
fotografa('09'); vicinoS('25', 2115.52, 'credito IVA di settembre'); vicinoS('10', 16715.86, 'banca al 30/09');
// ══ OTTOBRE ══
p = apri('erp_fi', 'passive'); bene(p.fai('fp', {fornitore: 'F600', rif: 'POL-DF-5521', conto: '83', testo: 'premio annuo polizza incendio e furto del negozio', imponibile: '960', iva: '0', dal: '2026-10-01', al: '2027-09-30', scadenza: '2026-10-01', data: '2026-10-01'}), 'FB60 polizza');
p = apri('erp_fi', 'passive'); bene(p.fai('pg', {fornitore: 'F600', documento: 'POL-DF-5521', data: '2026-10-01'}), 'F-53 polizza'); fino('paga la polizza');
acquisti('10', ['Ottobre · ordini', 'Ottobre · entrate', 'Ottobre · RF', 'Ottobre · fatture dei fornitori']);
f24('2026-09', '2026-10-16'); fino('Ottobre · F24');
vendite('10', ['Ottobre · ordini dei clienti', 'Ottobre · consegne', 'Ottobre · RF: preleva', 'Ottobre · uscita', 'Ottobre · fatture ai clienti', 'Ottobre · SdI']);
stipendio('10', 'Ottobre · stipendio');
pagaTutti('2026-10-30', ['F100', 'F200', 'F300', 'F400']); incassa('2026-10-30'); fino('Ottobre · pagamenti');
liquida('2026-10', '2026-10-31'); fino('Ottobre · liquida l’IVA');
fotografa('10'); vicinoS('25', 981.20, 'credito IVA di ottobre'); vicinoS('40', -20180, 'ricavi a fine ottobre'); controlla('ottobre');
// ══ NOVEMBRE ══
acquisti('11', ['Novembre · ordini', 'Novembre · entrate', 'Novembre · RF', 'Novembre · fatture dei fornitori']);
f24('2026-10', '2026-11-16'); ok(!p.S().chiusura.iva.find(y => y.periodo === '2026-10').daVersare, 'IVA di ottobre a credito: niente F24 IVA'); fino('Novembre · F24 del 16');
vendite('11', ['Novembre · ordini dei clienti', 'Novembre · consegne', 'Novembre · RF: preleva', 'Novembre · uscita', 'Novembre · fatture ai clienti', 'Novembre · SdI']);
p = apri('erp_fi', 'passive'); bene(p.fai('fp', {fornitore: 'F500', rif: 'FITTO-2026-T1', conto: '86', testo: 'affitto del negozio settembre-novembre (trimestre posticipato)', imponibile: '2700', iva: '0', dal: '2026-09-01', al: '2026-11-30', scadenza: '2026-11-30', data: '2026-11-30'}), 'FB60 affitto');
fino('fattura dell’affitto');
stipendio('11', 'Novembre · stipendio');
pagaTutti('2026-11-30', ['F100', 'F200', 'F300', 'F400', 'F500']); incassa('2026-11-30'); fino('Novembre · pagamenti');
liquida('2026-11', '2026-11-30'); fino('Novembre · liquida l’IVA');
fotografa('11'); vicinoS('25', -725.56, 'IVA di novembre da versare'); vicinoS('40', -40318, 'ricavi a fine novembre'); controlla('novembre');
// ══ DICEMBRE ══
acquisti('12', ['Dicembre · ordini', 'Dicembre · entrate', 'Dicembre · RF', 'Dicembre · fatture dei fornitori']);
vendite('12', ['Dicembre · ordini dei clienti', 'Dicembre · consegne', 'Dicembre · RF: preleva', 'Dicembre · uscita', 'Dicembre · fatture ai clienti', 'Dicembre · SdI']);
f24('2026-11', '2026-12-16'); versaIva('2026-11', '2026-12-16'); fino('Dicembre · F24 del 16');
stipendio('12', 'Dicembre · stipendio');
pagaTutti('2026-12-31', ['F100', 'F200', 'F300', 'F400']); incassa('2026-12-31'); fino('Dicembre · pagamenti');
liquida('2026-12', '2026-12-31'); fino('Dicembre · liquida l’IVA');
fotografa('12'); vicinoS('40', -64312, 'ricavi dell’anno'); vicinoS('41', 38619, 'costo del venduto dell’anno'); vicinoS('80', 7800, 'salari con la tredicesima'); ok(RILASCI.join() === '11,12', 'ordini dei PC rilasciati a novembre e dicembre');
// ══ 31 DICEMBRE: scritture di assestamento, imposte, chiusura ══
p = apri('erp_chiusura', 'assestamenti'); bene(p.fai('as', {tipo: 'risconto-attivo', conto: '83', testo: 'polizza POL-DF-5521 (ott 2026 - set 2027)', importo: '960', dal: '2026-10-01', al: '2027-09-30', data: '2026-12-31'}), 'risconto polizza'); fino('Risconto attivo');
p = apri('erp_chiusura', 'assestamenti'); bene(p.fai('as', {tipo: 'rateo-passivo', conto: '86', testo: 'affitto dicembre (trimestre dic-feb pagato a fine febbraio)', importo: '2700', dal: '2026-12-01', al: '2027-02-28', data: '2026-12-31'}), 'rateo affitto'); fino('Rateo passivo');
p = apri('erp_cespiti', 'ammortamenti'); bene(p.fai('af', {data: '2026-12-31'}), 'AFAB'); fino('Ammortamenti');
p = apri('erp_magazzino', 'monitor'); ok(/quadra/.test(p.testo()), 'monitor: magazzino e contabilità quadrano'); controlla('prima delle imposte');
p = apri('erp_chiusura', 'imposte'); const imp = p.w.CH4.calcolaImposte({anno: '2026', aumenti: '', diminuzioni: ''});
vicino(imp.risultato, 10619.02, 'utile prima delle imposte'); vicino(imp.ires, 2548.56, 'IRES 24%'); vicino(imp.irap, 414.14, 'IRAP 3,9%'); vicino(imp.utile, 7656.32, 'utile netto');
p.fai('ir', {anno: '2026', aumenti: '', diminuzioni: '', data: '2026-12-31'}); ok(/Imposte 2026 registrate/.test(p.testo()), 'imposte registrate'); fino('IRES e IRAP');
Object.entries({'10': 32535.23, '13': 5481, '01': 6000, '02': -300, '03': 1500, '04': -100, '06': 718.03, '39': -930, '23': -2548.56, '35': -414.14, '25': -2071.08, '27': 0, '28': -942.48, '29': -615.91, '24': -117, '31': -538.77, '14': 0, '21': 0, '11': 0, '20': 0}).forEach(([c, v]) => vicinoS(c, v, 'saldo al 31/12 prima della chiusura'));
ok(JSON.stringify(p.S().giacenze) === JSON.stringify({'PC-UFF': 9, 'STAMP-LAS': 5, 'MON-24': 6, 'MOUSE': 31, 'CAVO-HDMI': 25}), 'rimanenze finali');
p = apri('erp_chiusura', 'chiusura'); p.fai('ch', {anno: '2026', forza: 'no'}); ok(!!p.S().chiusure['2026'], 'chiusura 2026'); fino('Chiudi l’esercizio 2026');
vicino(p.S().chiusure['2026'].utile, 7656.32, 'utile 2026 in chiusura');
fs.writeFileSync(path.join(__dirname, 'executive-31-12.json'), JSON.stringify(p.S(), null, 2));
// ══ 1° GENNAIO 2027: riapertura ══
p = apri('erp_chiusura', 'riapertura'); p.fai('ra', {anno: '2027', data: '2027-01-01'}); ok(!!p.S().chiusure['2026'].riapertura, 'riapertura'); fino('Riapri i conti');
p = apri('erp_chiusura', 'assestamenti'); bene(p.fai('st', {data: '2027-01-01'}), 'storno ratei e risconti'); fino('Storna');
f24('2026-12', '2027-01-18'); versaIva('2026-12', '2027-01-18'); fino('F24 del 16 gennaio');
{ const r = p.S().registrazioni.find(x => x.tipo === 'RIAPERTURA'); vicino(r.righe.find(x => x.conto === '92' && x.dareAvere === 'AVERE').importo, 46234.26, 'totale riapertura'); }
vicinoS('10', 28905.76, 'banca dopo gli F24 di gennaio'); vicinoS('06', 0, 'risconto stornato'); vicinoS('39', 0, 'rateo stornato');
controlla('fine esercizio');
p = apri('erp_dati', 'avvio');
{
  p.w.MSA_ESERCIZIO.passi.filter(x => x.fatto).forEach(x => ok(x.fatto({S: p.S()}), 'passo fatto a fine esercizio: ' + x.titolo));
  ok(p.w.MSA_ESERCIZIO.passi.length >= 100, 'oltre 100 passi: ' + p.w.MSA_ESERCIZIO.passi.length);
  ok(!p.w.MSA_ESERCIZIO.passi.some(x => /ATTESA_/.test(JSON.stringify(x))), 'nessun segnaposto nei testi');
}
ok(p.S().msaRagioneria.coda.length === 0, 'nessuna scrittura in sospeso');
fs.writeFileSync(path.join(__dirname, 'executive-finale.json'), JSON.stringify(p.S(), null, 2));
console.log((errori ? '✗ ' : '✓ ') + 'Executive Assistant (4 mesi): ' + controlli + ' controlli, ' + errori + ' errori');
process.exit(errori ? 1 : 0);
