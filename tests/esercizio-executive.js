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
  ok(fatti === n, 'RF ' + tipo + ': attesi ' + n + ' compiti, confermati ' + fatti);
  ok(p.S().registrazioni.length === regs, 'la pistola RF non genera scritture');
}

const ACQ = [['F100', 'PC-UFF', 10, '450', 'DDT-DPC-0412', 'DPC-2026-1520'], ['F200', 'STAMP-LAS', 6, '120', 'DDT-SF-118', 'SF-0931'], ['F300', 'MON-24', 10, '95', 'DDT-VS-2290', 'VS-4410'],
  ['F400', 'MOUSE', 30, '6', 'DDT-AD-077', 'AD-301'], ['F400', 'CAVO-HDMI', 40, '3', 'DDT-AD-078', 'AD-302']];
const VEN = [['C100', 'PC-UFF', 4, 'AURORA-PC'], ['C100', 'MON-24', 4, 'AURORA-MON'], ['C100', 'MOUSE', 4, 'AURORA-MOUSE'], ['C200', 'STAMP-LAS', 3, 'GIRASOLE-STAMP'], ['C200', 'CAVO-HDMI', 15, 'GIRASOLE-CAVI']];
const oda = mat => p.S().acquisti.find(o => o.materiale === mat).numero;
const odv = rif => p.S().ordini.find(o => o.rif === rif);
const cons = rif => p.S().consegne.find(c => c.ordine === odv(rif).numero);

// ── 1 · apertura del negozio ──
p = apri('erp_dati', 'avvio'); p.fai('ng', {data: '2026-09-01', capitale: '20000'}); ok(/Executive Assistant|Pixel & Bit/.test(p.testo()) && !!p.S().costituzione, 'costituzione del negozio'); fino('Apri il negozio');
ok(p.S().negozio === true && /Pixel & Bit/.test(p.S().societa), 'negozio Pixel & Bit');
ok(Object.keys(p.S().materiali).join() === 'PC-UFF,STAMP-LAS,MON-24,MOUSE,CAVO-HDMI', 'solo le merci del negozio');
ok(Object.keys(p.S().fornitori).length === 4 && Object.keys(p.S().clienti).length === 2, '4 fornitori e 2 clienti');
ok(p.S().hr.dipendenti.length === 1 && p.S().hr.dipendenti[0].assunzione === '2026-09-01', 'una dipendente assunta il 01/09');
ok(p.S().condizioni.length === 5 && p.S().condizioni.every(c => c.tipo === 'PR00'), 'listino: solo i 5 prezzi');
p = apri('erp_dati', 'avvio'); ok(/Pixel & Bit/.test(p.testo()), 'pagina di avvio del negozio'); p.fai('vs', {data: '2026-09-01'}); ok(/Capitale interamente versato/.test(p.testo()), 'versamento dei soci'); fino('versano il capitale');
vicinoS('10', 20000, 'banca dopo il versamento');
p = apri('erp_dati', 'anagrafiche'); ok(/Studio Commerciale Aurora/.test(p.testo()) && /Accessori Digitali/.test(p.testo()) && /HAWA/.test(p.testo()), 'anagrafiche del negozio');
p = apri('erp_magazzino', 'struttura'); p.fai('at', {data: '2026-09-01'}); ok(p.S().wm && p.S().wm.attivo === '2026-09-01' && Object.keys(p.S().wm.ubicazioni).length === 41, 'attiva W100: 41 ubicazioni'); fino('Attiva il magazzino');
// dopo un ricaricamento i dati di Ferro & Transenne non ritornano
p = apri('erp_dati', 'avvio'); ok(!p.S().materiali.FERRO && !p.S().clienti.C300 && !p.S().fornitori.F500, 'nessun dato di Ferro & Transenne dopo il ricaricamento');

// ── 2 · acquisti ──
for (const [f, m, q, pr] of ACQ) { p = apri('erp_acquisti', 'ordini'); bene(p.fai('me', {fornitore: f, materiale: m, qta: String(q), prezzo: pr, data: '2026-09-02'}), 'ME21N ' + m); }
fino('ordina 40 cavi HDMI');
for (const [f, m, q, pr, ddt] of ACQ) { p = apri('erp_acquisti', 'entrate'); bene(p.fai('mi', {ordine: oda(m), ddt: ddt, data: '2026-09-04'}), 'MIGO ' + m); }
fino('ricevi i cavi');
vicinoS('13', 6470, 'merci a magazzino'); vicinoS('22', -6470, 'fatture da ricevere'); vicinoS('63', 0, 'nessuna differenza prezzo');
ok(p.w.WM4.aperti().length === 5, '5 pallet da mettere a scaffale');
rfTutti('2026-09-04', 'PUTAWAY', 5); fino('metti a scaffale');
for (const [f, m, q, pr, ddt, rif] of ACQ) { p = apri('erp_acquisti', 'fatture'); bene(p.fai('mr', {ordine: oda(m), rif: rif, data: '2026-09-07'}), 'MIRO ' + m); }
fino('fattura dei cavi');
vicinoS('22', 0, 'fatture da ricevere chiuse'); vicinoS('14', 1423.40, 'IVA a credito'); vicinoS('20', -7893.40, 'debiti verso fornitori');
controlla('acquisti');

// ── 3 · vendite ──
for (const [c, m, q, rif] of VEN) { p = apri('erp_vendite', 'ordini'); bene(p.fai('va', {cliente: c, materiale: m, qta: String(q), rif: rif, data: '2026-09-10', consegna: '2026-09-15'}), 'VA01 ' + rif); }
fino('Girasole ordina 15 cavi');
for (const [c, m, q, rif] of VEN) { p = apri('erp_vendite', 'consegne'); bene(p.fai('vl', {ordine: odv(rif).numero, data: '2026-09-14'}), 'VL01N ' + rif); }
fino('crea le 5 consegne');
rfTutti('2026-09-14', 'PICK', 5); fino('RF: preleva');
for (const [c, m, q, rif] of VEN) { p = apri('erp_vendite', 'consegne'); bene(p.fai('pg', {consegna: cons(rif).numero, data: '2026-09-14'}), 'uscita merci ' + rif); }
fino('Uscita merci');
for (const [c, m, q, rif] of VEN) { p = apri('erp_vendite', 'fatture'); bene(p.fai('vf', {consegna: cons(rif).numero, data: '2026-09-15'}), 'VF01 ' + rif); }
fino('fattura le 5 consegne');
for (const f of p.S().fatture) { p = apri('erp_fi', 'sdi'); bene(p.fai('sd', {fattura: f.numero, data: '2026-09-15'}), 'SdI ' + f.numero); }
fino('Trasmetti le 5 fatture');
vicinoS('40', -4114, 'ricavi'); vicinoS('41', 2609, 'costo del venduto'); vicinoS('21', -905.08, 'IVA a debito'); vicino(saldo('11', 'C100'), 4162.64, 'credito verso Aurora'); vicino(saldo('11', 'C200'), 856.44, 'credito verso Girasole'); vicinoS('13', 3861, 'merci rimaste');
ok(p.S().fatture.every(f => f.sdi), 'tutte le fatture allo SdI'); ok(!p.S().registrazioni.some(r => r.righe.some(x => x.conto === '57' || x.conto === '47')), 'niente provvigioni né sconti nel negozio');
controlla('vendite');

// ── 4 · stipendio ──
p = apri('erp_paghe', 'cedolino'); bene(p.fai('ca', {periodo: '2026-09'}), 'cedolino di settembre'); fino('Calcola il cedolino');
p = apri('erp_paghe', 'contabilita'); bene(p.fai('rg', {periodo: '2026-09', data: '2026-09-30'}), 'registra le paghe'); fino('Registra lo stipendio');
p = apri('erp_paghe', 'contabilita'); bene(p.fai('pn', {periodo: '2026-09', data: '2026-09-30'}), 'paga il netto'); fino('Paga lo stipendio');
vicinoS('80', 1800, 'salari'); vicinoS('81', 559.44, 'oneri sociali'); vicinoS('82', 133.33, 'TFR'); vicinoS('27', 0, 'netto pagato'); vicinoS('28', -706.86, 'INPS da versare'); vicinoS('29', -81.96, 'IRPEF da versare'); vicinoS('31', -124.33, 'fondo TFR');

// ── 5 · pagamenti e incassi ──
for (const f of ['F100', 'F200', 'F300', 'F400']) { p = apri('erp_fi', 'passive'); bene(p.fai('pg', {fornitore: f, data: '2026-09-30'}), 'F-53 ' + f); }
fino('paga Accessori');
vicinoS('20', 0, 'fornitori pagati');
p = apri('erp_vendite', 'incassi'); bene(p.fai('in', {cliente: 'C100', importo: String(saldo('11', 'C100')).replace('.', ','), rif: 'SALDO FATTURE AURORA', data: '2026-09-30'}), 'incasso Aurora');
p = apri('erp_vendite', 'incassi'); bene(p.fai('in', {cliente: 'C200', importo: String(saldo('11', 'C200')).replace('.', ','), rif: 'SALDO FATTURE GIRASOLE', data: '2026-09-30'}), 'incasso Girasole');
fino('incassa dall’Agenzia');
vicinoS('11', 0, 'clienti incassati');
// ── 6 · IVA e F24 ──
p = apri('erp_chiusura', 'iva'); bene(p.fai('lq', {periodo: '2026-09', data: '2026-09-30'}), 'liquidazione IVA'); fino('Liquida l’IVA');
vicinoS('14', 0, 'IVA a credito chiusa'); vicinoS('21', 0, 'IVA a debito chiusa'); vicinoS('25', 518.32, 'credito IVA sull’Erario');
p = apri('erp_paghe', 'contabilita'); bene(p.fai('f2', {periodo: '2026-09', data: '2026-10-16'}), 'F24'); fino('F24');
vicinoS('10', 14784.24, 'banca finale'); vicino(Math.round(-['40', '41', '80', '81', '82'].reduce((t, c) => t + saldo(c), 0) * 100) / 100, -987.77, 'risultato di settembre');
ok(p.S().giacenze['PC-UFF'] === 6 && p.S().giacenze['STAMP-LAS'] === 3 && p.S().giacenze['MON-24'] === 6 && p.S().giacenze.MOUSE === 26 && p.S().giacenze['CAVO-HDMI'] === 25, 'scorte finali');
ok(!p.S().produzione.length && !(p.S().cespiti || []).length, 'nessuna produzione e nessun cespite');
controlla('fine esercizio');
p = apri('erp_magazzino', 'monitor'); ok(/quadra/.test(p.testo()), 'monitor: magazzino e contabilità quadrano');
p = apri('erp_dati', 'avvio');
p.w.MSA_ESERCIZIO.passi.filter(x => x.fatto).forEach(x => ok(x.fatto({S: p.S()}), 'passo fatto a fine esercizio: ' + x.titolo));
ok(p.w.MSA_ESERCIZIO.passi.length >= 50, 'almeno 50 passi: ' + p.w.MSA_ESERCIZIO.passi.length);
ok(!p.w.MSA_ESERCIZIO.passi.some(x => /ATTESA_/.test(JSON.stringify(x))), 'nessun segnaposto nei testi');
ok(p.S().msaRagioneria.coda.length === 0, 'nessuna scrittura in sospeso');
fs.writeFileSync(path.join(__dirname, 'executive-finale.json'), JSON.stringify(p.S(), null, 2));
console.log((errori ? '✗ ' : '✓ ') + 'Executive Assistant: ' + controlli + ' controlli, ' + errori + ' errori');
process.exit(errori ? 1 : 0);
