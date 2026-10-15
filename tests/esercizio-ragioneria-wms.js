// Ragioneria con WMS attivo: moduli e pulsanti delle pagine, controlli FI/IM/WMS e guida effettiva.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const PAGINE = {erp_dati: 'dati-pagine.js', erp_vendite: 'sd-pagine.js', erp_copa: 'copa-pagine.js', erp_fi: 'fi-pagine.js', erp_acquisti: 'mm-pagine.js', erp_produzione: 'pp-pagine.js', erp_costi: 'copc-pagine.js', erp_magazzino: 'wm-pagine.js', erp_inventario: 'inv-pagine.js', erp_spedizione: 'sp-pagine.js', erp_tesoreria: 'tes-pagine.js', erp_valute: 'val-pagine.js', erp_paghe: 'py-pagine.js', erp_innovazione: 'in-pagine.js'};
const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js', 'app/static/js/erp/ruoli.js',
  'app/static/js/lab-copioni.js', 'app/static/js/erp/lettore.js', 'app/static/vendor/jsbarcode-3.11.6.min.js', 'app/static/vendor/qrcode-generator-1.4.4.js', 'app/static/js/erp/etichette.js'];
let memoria = null, ultima = null;   // il localStorage passa da una pagina all'altra come nel browser
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
      verificaQuiz(w,regPrima);
      const es = lab.querySelector('#' + pref + '-esito');
      memoria = w.localStorage.getItem(CHIAVE);
      return es ? es.className + ' ' + es.textContent : '';
    },
    testo: () => lab.textContent};
  return P;
}
function verificaQuiz(w,regPrima) {
  const S=w.MSA_STATO_CORRENTE(), nuovi=S.registrazioni.length-regPrima;
  ok(S.msaRagioneria.coda.length===nuovi,'domande corrispondono ai nuovi documenti effettivi');
  const libro=JSON.stringify(S.registrazioni);
  while(S.msaRagioneria.coda.length) {
    const q=S.msaRagioneria.coda[0], rs=q.documento.righe.map((r,i)=>({r,i})).sort((a,b)=>String(a.r.conto).localeCompare(String(b.r.conto),'it',{numeric:true})||a.i-b.i).map(x=>x.r);
    ok(!!w.document.querySelector('.msa-q-verifica'),'domanda immediata per '+q.documento.tipo);
    [...w.document.querySelectorAll('.msa-q-riga')].forEach((el,i)=>{
      el.querySelector('select').value=rs[i].dareAvere;
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
let p = apri('erp_dati','avvio');
p.fai('av',{data:'2027-01-02'}); ok(p.S().avviato==='2027-01-02','avvio'); checkpoint('Apertura');
p = apri('erp_magazzino','struttura'); p.fai('at',{data:'2027-01-02'}); ok(p.S().wm.attivo==='2027-01-02','W100'); checkpoint('WMS iniziale');
ok(p.S().wm.carico.length === 20,'20 pallet iniziali');
p = apri('erp_costi','scheda'); bene(p.fai('sk',{sovrMat:'5',sovrProd:'10',tariffa:'28',lotto:'100'}),'scheda');
p = apri('erp_costi','calcolo'); bene(p.fai('ck',{materiale:'TR-STD',data:'2027-02-03'}),'calcolo');
bene(p.fai('cr',{data:'2027-02-03'},'marca'),'marca'); bene(p.fai('cr',{data:'2027-02-03'}),'rilascio'); checkpoint('Standard rilasciato');
p = apri('erp_acquisti','ordini'); bene(p.fai('me',{fornitore:'F100',materiale:'FERRO',qta:'3000',prezzo:'1',data:'2027-02-04'}),'ordine fornitore');
const oa=p.S().acquisti[0].numero;
p=apri('erp_acquisti','entrate'); bene(p.fai('mi',{ordine:oa,data:'2027-02-05'}),'MIGO'); checkpoint('Ricevimento ferro');
ok(p.w.WM4.inUbic('GR-ZONE').reduce((s,q)=>s+q.qta,0)===3000,'ferro in ricevimento');
rfTutti('2027-02-05','PUTAWAY'); checkpoint('Ferro a dimora');
p=apri('erp_acquisti','fatture'); bene(p.fai('mr',{ordine:oa,rif:'FT-RAG-001',data:'2027-02-06'}),'MIRO'); checkpoint('Fattura fornitore');
p=apri('erp_produzione','ordini'); bene(p.fai('co',{materiale:'TR-STD',qta:'100',data:'2027-02-07'}),'CO01'); const op=p.S().produzione[0].numero;
p=apri('erp_produzione','avanzamento');
const prima = JSON.stringify(p.S().giacenze), nreg=p.S().registrazioni.length;
ok(/ko/.test(p.fai('pr',{ordine:op,kg:'800',data:'2027-02-08'})),'261 bloccato senza staging');
ok(JSON.stringify(p.S().giacenze)===prima && p.S().registrazioni.length===nreg,'rifiuto 261 non altera giacenze/scritture');
p=apri('erp_magazzino','compiti'); bene(p.fai('sg',{ordine:op,kg:'800',data:'2027-02-08'}),'staging');
rfTutti('2027-02-08','STAGING'); checkpoint('Ferro in PSA');
p=apri('erp_produzione','avanzamento'); bene(p.fai('pr',{ordine:op,kg:'800',data:'2027-02-08'}),'261'); checkpoint('Consumo produzione');
bene(p.fai('cf',{ordine:op,attrezzaggio:'3',ore:'85',data:'2027-02-09'}),'conferma ore');
bene(p.fai('en',{ordine:op,qta:'100',data:'2027-02-10'}),'101 PF'); checkpoint('Entrata prodotto finito');
ok(p.w.WM4.inUbic('GR-ZONE').reduce((s,q)=>s+(q.mat==='TR-STD'?q.qta:0),0)===100,'PF nuovi in ricevimento');
rfTutti('2027-02-10','PUTAWAY'); checkpoint('Prodotti a dimora');
p=apri('erp_vendite','ordini'); bene(p.fai('va',{cliente:'C100',materiale:'TR-STD',qta:'550',rif:'RAG-WMS-550',data:'2027-02-12'}),'ordine cliente'); const ov=p.S().ordini[0].numero;
p=apri('erp_vendite','consegne'); bene(p.fai('vl',{ordine:ov,data:'2027-02-13'}),'consegna WMS'); const cons=p.S().consegne[0].numero;
ok(p.S().consegne[0].pgi===false && p.S().giacenze['TR-STD']===600,'consegna non scarica ancora'); checkpoint('Consegna aperta');
rfTutti('2027-02-13','PICK'); checkpoint('Picking in GI');
ok(p.S().giacenze['TR-STD']===600,'picking non duplica COGS');
p=apri('erp_vendite','fatture');
ok(!p.lab.querySelector('#vf-consegna option[value="'+cons+'"]'),'fattura bloccata prima uscita merci');
p=apri('erp_spedizione','imballo'); bene(p.fai('im',{consegna:cons,imballo:'EUR',perCollo:'50',data:'2027-02-14'}),'imballo');
ok(p.S().sped.colli.length===11,'11 colli');
p=apri('erp_spedizione','trasporti'); bene(p.fai('vt',{consegne:cons,vettore:'V10',targa:'AA000AA',autista:'Mario Esempio',porto:'franco',data:'2027-02-15'}),'trasporto'); const tr=p.S().sped.trasporti[0].numero;
ok(/ko/.test(p.fai('pt',{trasporto:tr,data:'2027-02-15'})),'partenza bloccata senza carico');
for (const x of p.S().sped.colli.slice()) bene(p.fai('ca',{sscc:x.sscc,data:'2027-02-15'}),'carico '+x.sscc);
bene(p.fai('pt',{trasporto:tr,data:'2027-02-15'}),'partenza'); checkpoint('Uscita merci');
const regPart=p.S().registrazioni.length;
ok(/ko/.test(p.fai('pt',{trasporto:tr,data:'2027-02-15'})),'seconda partenza rifiutata');
ok(p.S().registrazioni.length===regPart,'nessun doppio COGS');
p=apri('erp_vendite','fatture'); bene(p.fai('vf',{consegna:cons,data:'2027-02-16'}),'fattura'); checkpoint('Fattura cliente');
const totale=p.S().fatture[0].totale;
p=apri('erp_vendite','incassi'); bene(p.fai('in',{cliente:'C100',importo:'20000',rif:'ACCONTO SU FATTURA RAG-WMS',data:'2027-02-20'}),'incasso parziale'); checkpoint('Incasso parziale');
bene(p.fai('in',{cliente:'C100',importo:(totale-20000).toFixed(2).replace('.',','),rif:'SALDO FATTURA RAG-WMS',data:'2027-02-25'}),'saldo cliente'); checkpoint('Cliente saldato');
p=apri('erp_costi','chiusura'); bene(p.fai('kg',{data:'2027-02-28'}),'KGI2'); bene(p.fai('ko',{data:'2027-02-28'}),'KO88'); checkpoint('Ordine liquidato');
p=apri('erp_costi','ml'); p.fai('cm',{periodo:'2027-02',data:'2027-02-28'}); ok(p.S().costing.ml.length===1,'Material Ledger'); checkpoint('Material Ledger');
p=apri('erp_tesoreria','pagamenti'); bene(p.fai('pg',{data:'2027-04-08'}),'F110 a scadenza'); checkpoint('Fornitore pagato in transito');
p=apri('erp_tesoreria','estratti'); bene(p.fai('ec',{data:'2027-04-09',righe:'2027-04-09;-3660;SEPA SCT ADDEBITO DISTINTA F110-001 ACCIAIERIE UMBRE'}),'estratto banca'); bene(p.fai('ab',{}),'riconciliazione'); checkpoint('Banca riconciliata');
fs.writeFileSync(path.join(__dirname,'ragioneria-wms-finale.json'),JSON.stringify(p.S(),null,2));
for (const passo of p.w.MSA_ESERCIZIO.passi.filter(x=>x.fatto)) ok(passo.fatto({S:p.S()}), 'spunta automatica finale: '+passo.titolo);
ok(p.w.MSA_GUIDA_API.stati().filter(x=>x==='auto').length===33,'33 verifiche automatiche nella finestra');
fs.writeFileSync(path.join(__dirname,'ragioneria-wms-controlli.json'),JSON.stringify(traccia,null,2));
console.log(JSON.stringify({controlli,errori,finale:traccia.at(-1),standard:p.S().materiali['TR-STD'].std,ml:p.S().costing.ml},null,2));
p.w.close();
if(errori) process.exit(1);
