// Ragioneria con WMS — seconda parte: cespiti, fatture di servizi, Ri.Ba., factoring, IVA trimestrale, IRES, chiusura e riapertura.
// Parte dallo stato finale della prima parte (tests/ragioneria-wms-finale.json) e lavora dalle pagine, con il quiz di ragioneria del pannello.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const PAGINE = {erp_dati: 'dati-pagine.js', erp_vendite: 'sd-pagine.js', erp_copa: 'copa-pagine.js', erp_fi: 'fi-pagine.js', erp_acquisti: 'mm-pagine.js', erp_produzione: 'pp-pagine.js', erp_costi: 'copc-pagine.js', erp_magazzino: 'wm-pagine.js', erp_inventario: 'inv-pagine.js', erp_spedizione: 'sp-pagine.js', erp_tesoreria: 'tes-pagine.js', erp_valute: 'val-pagine.js', erp_paghe: 'py-pagine.js', erp_cespiti: 'ce-pagine.js', erp_chiusura: 'ch-pagine.js', erp_innovazione: 'in-pagine.js'};
const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js', 'app/blueprints/erp_cespiti/static/ce-logica.js', 'app/blueprints/erp_tesoreria/static/rb-logica.js', 'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/static/js/erp/ruoli.js',
  'app/static/js/lab-copioni.js', 'app/static/js/erp/lettore.js', 'app/static/vendor/jsbarcode-3.11.6.min.js', 'app/static/vendor/qrcode-generator-1.4.4.js', 'app/static/js/erp/etichette.js'];
const FINE1 = path.join(__dirname, 'ragioneria-wms-finale.json');
if (!fs.existsSync(FINE1)) { console.log('✗ manca tests/ragioneria-wms-finale.json: esegui prima tests/esercizio-ragioneria-wms.js'); process.exit(1); }
let memoria = fs.readFileSync(FINE1, 'utf8'), ultima = null;   // il localStorage passa da una pagina all'altra come nel browser
function apri(bp, pagina) {
  if (ultima) memoria = ultima.localStorage.getItem(CHIAVE) || memoria;
  if (ultima) ultima.close();
  const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  ultima = w;
  if (memoria) w.localStorage.setItem(CHIAVE, memoria);
  w.confirm = () => true;
  w.LAB_PAGINA = {chiave: CHIAVE, pagina: pagina, slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/' + bp + '/static/' + PAGINE[bp]]).forEach(f => w.eval(R(f)));
  w.MSA_GUIDA = {esercizio:'ragioneria-wms', chiave:CHIAVE, versione:'vuoto', url:{}};
  w.eval(R('app/blueprints/guida/static/esercizi/ragioneria-wms.js'));
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
      verificaQuiz(w,regPrima);
      memoria = w.localStorage.getItem(CHIAVE);
      return esito;
    },
    testo: () => lab.textContent};
  return P;
}
function verificaQuiz(w,regPrima) {
  const S=w.MSA_STATO_CORRENTE(), nuovi=S.registrazioni.slice(regPrima).filter(r=>r.quiz!==false).length;
  ok(S.msaRagioneria.coda.length===nuovi,'domande corrispondono ai nuovi documenti effettivi');
  const libro=JSON.stringify(S.registrazioni);
  while(S.msaRagioneria.coda.length) {
    const q=S.msaRagioneria.coda[0], rs=q.documento.righe.map((r,i)=>({r,i})).sort((a,b)=>String(a.r.conto).localeCompare(String(b.r.conto),'it',{numeric:true})||a.i-b.i).map(x=>x.r);
    ok(!!w.document.querySelector('.msa-q-verifica'),'domanda immediata per '+q.documento.tipo);
    [...w.document.querySelectorAll('.msa-q-riga')].forEach((el,i)=>{
      el.querySelector('.msa-q-conto').value=rs[i].conto;
      el.querySelector('.msa-q-sezione').value=rs[i].dareAvere;
      el.querySelector('input').value=rs[i].importo.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
    });
    w.document.querySelector('.msa-q-verifica').click();
    ok(q.corretto,'ricostruzione corretta del documento '+q.documento.tipo);
    w.document.querySelector('.msa-q-continua').click();
  }
  ok(JSON.stringify(S.registrazioni)===libro,'quiz non duplica o cambia le scritture');
}
const bene = (r, m) => ok(/ ok /.test(' ' + r.split(' ')[1] + ' ') || /lab-esito ok/.test(r), m + ' → ' + r.slice(0, 160));
const num = S => n => n;   // segnaposto leggibile


const traccia = [];
function checkpoint(nome) {
  const s = p.S();
  for (const passo of p.w.MSA_ESERCIZIO.passi.filter(x=>x.fatto)) {
    try { passo.fatto({S:s}); } catch(e) { ok(false, 'controllo guida: '+passo.titolo+' '+e.message); }
  }
  ok(!!p.w.MSA_GUIDA_API, nome+' finestra guidata caricata');
  const saldi = {};
  s.registrazioni.forEach(r => r.righe.forEach(x => saldi[x.conto] = Math.round(((saldi[x.conto] || 0) + (x.dareAvere === 'DARE' ? x.importo : -x.importo)) * 100) / 100));
  const tot = s.registrazioni.reduce((v,r) => {r.righe.forEach(x => v[x.dareAvere === 'DARE' ? 'dare' : 'avere'] += x.importo); return v;}, {dare:0,avere:0});
  vicino(tot.dare, tot.avere, nome + ' Dare=Avere');
  if (s.wm && s.wm.attivo) {
    const q = p.w.WM4.quadratura();
    ok(q.every(x => x.ok), nome + ' IM=WMS');
  }
  traccia.push({nome, giacenze: JSON.parse(JSON.stringify(s.giacenze)), saldi, registrazioni:s.registrazioni.length,
    compiti: s.wm ? s.wm.compiti.map(t => ({tipo:t.tipo, stato:t.stato, mat:t.mat,qta:t.qta,da:t.da,a:t.a})) : []});
}
function rfTutti(data, tipo) {
  p = apri('erp_magazzino', 'rf');
  const regs = p.S().registrazioni.length;
  while (p.w.WM4.aperti().length) {
    const t = p.w.WM4.aperti()[0];
    if (tipo) ok(t.tipo === tipo, 'tipo compito ' + tipo);
    p.lab.querySelector('#rf-data').value = data;
    for (const [id,value] of [['rf-da',t.da],['rf-udc',t.udc || t.mat],['rf-qta',String(t.qta)],['rf-a',t.a]]) p.lab.querySelector('#'+id).value = value;
    p.lab.querySelector('#rf-ok').click();
    ok(p.S().wm.compiti.find(x=>x.numero===t.numero).stato==='confermato', 'RF confermato '+t.numero);
    memoria = p.w.localStorage.getItem(CHIAVE);
  }
  ok(p.S().registrazioni.length === regs, 'RF non genera scritture');
}

const saldo = (c, alla) => Math.round(p.S().registrazioni.filter(r => !alla || r.data <= alla).reduce((t, r) => t + r.righe.filter(x => x.conto === c).reduce((u, x) => u + (x.dareAvere === 'DARE' ? x.importo : -x.importo), 0), 0) * 100) / 100;
let p = apri('erp_cespiti', 'registro'); ok(/Nessun cespite/.test(p.testo()), 'registro vuoto');
const banca0 = saldo('10'); vicino(banca0, 84989.6, 'banca di partenza (fine prima parte)');
p = apri('erp_cespiti', 'acquisto');
bene(p.fai('ac', {descrizione: 'Saldatrice robotizzata', classe: 'IMP', fornitore: 'F300', rif: 'MA-101', importo: '12000', iva: '22', aliquota: '', inFunzione: '2027-05-03', data: '2027-05-03'}), 'F-90 saldatrice'); checkpoint('Saldatrice');
bene(p.fai('ac', {descrizione: 'Carrello elevatore elettrico', classe: 'MEZ', fornitore: 'F300', rif: 'MA-102', importo: '8000', iva: '22', aliquota: '', inFunzione: '2027-05-03', data: '2027-05-03'}), 'F-90 carrello'); checkpoint('Carrello');
vicino(saldo('01'), 12000, 'conto 01'); vicino(saldo('03'), 8000, 'conto 03'); vicino(-saldo('20'), 24400, 'debito Macchine Alfa');
p = apri('erp_cespiti', 'registro'); ok(/CE-0001/.test(p.testo()) && /CE-0002/.test(p.testo()), 'registro con due cespiti');
p = apri('erp_fi', 'fatture');
bene(p.fai('fs', {cliente: 'C200', testo: 'noleggio transenne per evento', imponibile: '5000', iva: '22', scadenza: '2027-06-30', data: '2027-05-10'}), 'FB70 Delta');
bene(p.fai('fs', {cliente: 'C100', testo: 'noleggio e posa transenne cantiere', imponibile: '8000', iva: '22', scadenza: '2027-06-30', data: '2027-05-10'}), 'FB70 Beta'); checkpoint('Fatture servizi');
const fD = p.S().fattureServizi[0].numero, fB = p.S().fattureServizi[1].numero;
for (const f of [fD, fB]) { p = apri('erp_fi', 'sdi'); bene(p.fai('sd', {fattura: f, data: '2027-05-10'}), 'SdI ' + f); }
p = apri('erp_tesoreria', 'riba'); bene(p.fai('rp', {fattura: fD, scadenza: '', anticipo: '80', commissione: '4', data: '2027-05-12'}), 'Ri.Ba. SBF'); checkpoint('Ri.Ba.');
vicino(-saldo('36'), 4880, 'anticipo SBF'); vicino(p.w.SD4.N.saldo('11', 'C200'), 6100, 'credito Delta ancora aperto');
p = apri('erp_tesoreria', 'factoring'); ok(!p.lab.querySelector('#fc-fattura option[value="' + fD + '"]'), 'la fattura in Ri.Ba. non si cede al factor');
bene(p.fai('fc', {fattura: fB, modo: 'soluto', factor: 'Factor Italia SpA', anticipo: '90', commissione: '2', data: '2027-05-14'}), 'factoring pro soluto'); checkpoint('Factoring');
vicino(p.w.SD4.N.saldo('11', 'C100'), 0, 'pro soluto: credito Beta chiuso'); vicino(saldo('15'), 780.8, 'credito residuo verso factor');
p = apri('erp_chiusura', 'iva'); bene(p.fai('lq', {periodo: '2027-T1', data: '2027-03-31'}), 'liquidazione T1');
{ const x = p.S().chiusura.iva[0]; vicino(x.debito, 6969.6, 'IVA debito T1'); vicino(x.credito, 660, 'IVA credito T1'); vicino(x.saldo, 6309.6, 'IVA da versare T1'); vicino(x.interessi, 63.1, 'interessi 1%'); ok(x.scadenza === '2027-05-17', 'scadenza 17/05 (16 domenica)'); }
ok(/ko/.test(p.fai('lq', {periodo: '2027-T1', data: '2027-03-31'})), 'doppia liquidazione rifiutata');
p = apri('erp_chiusura', 'iva'); bene(p.fai('vs', {periodo: '2027-T1', data: '2027-05-17'}), 'F24 T1'); checkpoint('IVA T1');
p = apri('erp_tesoreria', 'pagamenti'); bene(p.fai('pg', {data: '2027-06-03'}), 'F110 Macchine Alfa');
const run = p.S().tes.pagamenti.slice(-1)[0]; ok(run.totale === 24400 && run.numero === 'F110-002', 'distinta F110-002 da 24.400');
p = apri('erp_tesoreria', 'estratti'); bene(p.fai('ec', {data: '2027-06-04', righe: '2027-06-04;-24400;SEPA SCT ADDEBITO DISTINTA F110-002 MACCHINE ALFA'}), 'estratto giugno'); bene(p.fai('ab', {}), 'abbinamento'); checkpoint('Fornitore cespiti pagato');
vicino(saldo('18'), 0, 'banca transito'); vicino(saldo('20'), 0, 'fornitori');
p = apri('erp_tesoreria', 'riba'); bene(p.fai('re', {riba: 'RB-001', esito: 'pagata', spese: '', data: '2027-06-30'}), 'esito Ri.Ba.');
p = apri('erp_tesoreria', 'factoring'); bene(p.fai('fx', {factoring: 'FCT-001', data: '2027-06-30'}), 'saldo factor'); checkpoint('Scadenze di giugno');
vicino(saldo('36'), 0, 'anticipi SBF chiusi'); vicino(saldo('15'), 0, 'crediti verso factor chiusi'); vicino(saldo('11'), 0, 'clienti a zero');
p = apri('erp_chiusura', 'iva'); bene(p.fai('lq', {periodo: '2027-T2', data: '2027-06-30'}), 'liquidazione T2'); vicino(p.S().chiusura.iva[1].creditoRiportato, 1540, 'credito IVA riportato');
p = apri('erp_cespiti', 'cessione'); bene(p.fai('cs', {cespite: 'CE-0002', cliente: 'C600', prezzo: '6500', iva: '22', data: '2027-11-30'}), 'cessione carrello'); checkpoint('Cessione');
vicino(saldo('46'), 566.67, 'minusvalenza'); vicino(saldo('03'), 0, 'mezzi eliminati'); vicino(saldo('04'), 0, 'fondo mezzi eliminato');
p = apri('erp_vendite', 'incassi'); bene(p.fai('in', {cliente: 'C600', importo: '7930', rif: 'CESSIONE CARRELLO', data: '2027-12-15'}), 'incasso cessione');
p = apri('erp_chiusura', 'chiusura'); ok(/Ammortamenti 2027 non registrati/.test(p.testo()) && /Imposte 2027 \(IRES e IRAP\) non registrate/.test(p.testo()), 'controlli prima della chiusura');
ok(/ko/.test(p.fai('ch', {anno: '2027', forza: 'no'})), 'chiusura rifiutata con avvertenze');
p = apri('erp_cespiti', 'ammortamenti'); bene(p.fai('af', {data: '2027-12-31'}), 'AFAB 2027'); vicino(saldo('02'), -800, 'fondo saldatrice 800');
p = apri('erp_chiusura', 'iva'); bene(p.fai('lq', {periodo: '2027-T4', data: '2027-12-31'}), 'liquidazione T4'); vicino(saldo('14'), 110, 'credito IVA a fine anno');
p = apri('erp_cespiti', 'ammortamenti'); ok(/a metà \(primo anno\)/.test(p.testo()) && /600,00/.test(p.testo()), 'doppio binario: massimo fiscale saldatrice 600');
{ const f = p.w.CE4.fiscale('2027'); vicino(f.totali.aumento, 333.33, 'ammortamenti non deducibili'); vicino(f.totali.recuperoCessione, 133.33, 'recupero alla cessione'); vicino(f.totali.eccedenzaFine, 200, 'differenza temporanea a fine anno'); }
p = apri('erp_chiusura', 'imposte'); ok(/26\.?424,67/.test(p.testo()) && /26\.?624,67/.test(p.testo()) && /26\.?882,97/.test(p.testo()), 'prospetti IRES e IRAP');
p.fai('ir', {anno: '2027', aumenti: '', diminuzioni: '', aliquota: '24', aliquotaIrap: '3,9', data: '2027-12-31'}); ok(/Imposte 2027 registrate/.test(p.testo()), 'imposte registrate');
vicino(-saldo('23'), 6389.92, 'IRES 6.389,92'); vicino(-saldo('35'), 1048.44, 'IRAP 1.048,44'); vicino(saldo('17'), 55.8, 'imposte anticipate 55,80'); vicino(-saldo('51'), 55.8, 'provento da imposte anticipate'); checkpoint('Fine anno');
p = apri('erp_chiusura', 'imposte'); ok(/Imposte 2027 registrate/.test(p.testo()), 'imposte registrate una volta');
p = apri('erp_chiusura', 'chiusura'); ok(/Controlli superati/.test(p.testo()), 'controlli verdi');
const regPrimaCh = p.S().registrazioni.length; p.fai('ch', {anno: '2027', forza: 'no'}); ok(!!p.S().chiusure['2027'] && /Esercizio 2027 chiuso/.test(p.testo()), 'chiusura 2027');
{ const S = p.S(), nuovi = S.registrazioni.slice(regPrimaCh); ok(nuovi.map(r => r.tipo).join() === 'EPILOGO,RISULTATO,CHIUSURA_SP', 'tre documenti di chiusura');
  vicino(-saldo('32', '2027-12-30') , 0, 'utile non ancora sul 32 prima della chiusura');
  vicino(S.chiusure['2027'].utile, 19042.11, 'utile 2027');
  const nz = {}; S.registrazioni.forEach(r => r.righe.forEach(x => nz[x.conto] = Math.round(((nz[x.conto] || 0) + (x.dareAvere === 'DARE' ? x.importo : -x.importo)) * 100) / 100));
  ok(Object.values(nz).every(v => Math.abs(v) < 0.005), 'dopo la chiusura tutti i conti a zero'); }
p = apri('erp_fi', 'fatture'); ok(/chiuso/.test(p.fai('fs', {cliente: 'C200', testo: 'prova', imponibile: '10', iva: '22', scadenza: '', data: '2027-12-31'})), 'nessuna scrittura nel 2027 chiuso');
p = apri('erp_chiusura', 'riapertura'); p.fai('ra', {anno: '2028', data: '2028-01-01'}); ok(!!p.S().chiusure['2027'].riapertura && /riaperto/.test(p.testo()), 'riapertura 2028'); checkpoint('Riapertura');
vicino(saldo('10'), 77807.7, 'banca riaperta'); vicino(saldo('13'), 17842.37, 'prodotti finiti riaperti'); vicino(saldo('01') + saldo('02'), 11200, 'saldatrice netta'); vicino(-saldo('32'), 19042.11, 'utile da destinare'); vicino(saldo('17'), 55.8, 'imposte anticipate riaperte');
vicino(saldo('90') + saldo('91') + saldo('92'), 0, 'conti di chiusura a zero');
{ const c = p.w.CH4.calcolaIva('2028-T1'); vicino(c.credito, 0, 'la riapertura non è IVA del 2028'); vicino(c.riporto, 110, 'credito IVA riportato dal 2027'); vicino(c.saldo, -110, 'primo trimestre 2028 parte a credito');
  ok(!p.w.CH4.controlli('2028').some(x => /IVA non ancora liquidata/.test(x)), 'riapertura non risulta come IVA da liquidare'); }
ok(p.w.TS4.partite('cliente').length === 0 && p.w.TS4.partite('fornitore').length === 0, 'nessuna partita fantasma dopo la riapertura');
ok(p.w.WM4.quadratura().every(q => q.ok) && p.S().giacenze.FERRO === 2200, 'magazzino invariato e quadrato');
{ const S = p.S(); ok(!S.msaRagioneria.coda.length && S.msaRagioneria.esiti.every(e => e.corretto && !e.conAiuto), 'quiz di ragioneria tutti risolti');
  ok(S.registrazioni.filter(r => r.quiz === false).length === 0, 'epilogo, chiusura e riapertura ricostruiti dall’allievo come gli altri documenti');
  ok(['EPILOGO','CHIUSURA_SP','RIAPERTURA'].every(t => S.msaRagioneria.visti.some(k => S.registrazioni.some(r => r.tipo === t))), 'domande di chiusura e riapertura presentate'); }
for (const passo of p.w.MSA_ESERCIZIO.passi.filter(x => x.fatto)) ok(passo.fatto({S: p.S()}), 'spunta automatica: ' + passo.titolo);
fs.writeFileSync(path.join(__dirname, 'ragioneria-chiusura-finale.json'), JSON.stringify(p.S()));
p.w.close();
console.log(errori ? '❌ ' + errori + ' errori su ' + controlli : '✅ ragioneria seconda parte — cespiti con doppio binario fiscale, servizi e SdI, Ri.Ba., factoring, IVA trimestrale, IRES, IRAP e imposte anticipate, chiusura e riapertura: ' + controlli + ' controlli');
if (errori) process.exit(1);
