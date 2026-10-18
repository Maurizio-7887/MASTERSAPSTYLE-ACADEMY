/* Run: node lab-smoke.js /tmp/academy-completo
 * Reuses only the page harness prefix of tests/s4.js; does not run its annual
 * scenario or write its snapshots. All state is synthetic JSDOM localStorage.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.resolve(process.argv[2] || path.resolve(__dirname,'..'));
const source = fs.readFileSync(path.join(root, 'tests/s4.js'), 'utf8');
const marker = '// avvio, condizioni';
if (!source.includes(marker)) throw Error('Harness marker changed');
function scenarios() {
  function good(p, f, v, a) { const r = p.fai(f, v, a); bene(r, f + ':' + (a || f)); return r; }
  function fresh(date) { memoria = null; ultima = null; const p = apri('erp_dati', 'avvio'); p.fai('av', {data:date}); ok(p.S().avviato===date,'fresh disposable system '+date); return p; }
  function eq(a,b,m) { vicino(Number(a),b,m); }
  let p = fresh('2027-03-01');
  p = apri('erp_acquisti','richieste');
  good(p,'rq',{materiale:'FERRO',qta:'1000',consegna:'2027-03-04',prezzo:'1,10',richiedente:'Produzione',motivo:'LAB-CO lotto marzo',data:'2027-03-01'});
  good(p,'ap',{rda:x=>x,decisione:'approva',nota:'validato',data:'2027-03-02'});
  const rda = p.w.MM4.P().rda[0].numero;
  p=apri('erp_acquisti','ordini'); good(p,'so',{soglia:'1000'});
  good(p,'me',{rda,fornitore:'F100',materiale:'FERRO',qta:'',prezzo:'1,10',data:'2027-03-02'});
  const acq=p.S().acquisti[0].numero;
  ok(p.S().acquisti[0].rilascio.stato==='bloccato','1100 > 1000 blocked');
  p=apri('erp_acquisti','entrate'); ok(![...p.lab.querySelector('#mi-ordine').options].some(x=>x.value===acq),'blocked purchase not receivable');
  p=apri('erp_acquisti','ordini'); good(p,'rl',{ordine:acq,decisione:'rilascia',data:'2027-03-03'});
  good(p,'me',{rda:'',fornitore:'F100',materiale:'FERRO',qta:'1000',prezzo:'1',data:'2027-03-03'});
  ok(!p.S().acquisti[1].rilascio,'1000 = threshold needs no release');
  good(p,'me',{rda:'',fornitore:'F100',materiale:'FERRO',qta:'1001',prezzo:'1',data:'2027-03-03'});
  const rejected=p.S().acquisti[2].numero;
  good(p,'rl',{ordine:rejected,decisione:'rifiuta',data:'2027-03-03'});
  ok(p.S().acquisti[2].rilascio.stato==='rifiutato','1001 purchase rejected');
  p=apri('erp_acquisti','entrate');
  good(p,'mi',{ordine:acq,qta:'400',ddt:'LAB-CO-DDT1',lotto:'LAB-CO-01',danneggiati:'0',data:'2027-03-04'});
  good(p,'mi',{ordine:acq,qta:'',ddt:'LAB-CO-DDT2',lotto:'LAB-CO-02',danneggiati:'0',data:'2027-03-05'});
  p=apri('erp_acquisti','fatture'); good(p,'mr',{ordine:acq,rif:'LAB-CO-AP1',qta:'1000',prezzo:'1,12',data:'2027-03-06'});
  eq(p.S().fattureFornitore[0].totale,1366.4,'CO supplier total');
  p=apri('erp_costi','scheda'); good(p,'sk',{sovrMat:'5',sovrProd:'10',tariffa:'28',lotto:'100'});
  p=apri('erp_costi','calcolo'); good(p,'ck',{materiale:'TR-STD',data:'2027-03-01'});
  ok(/ko/.test(p.fai('cr',{data:'2027-03-01'})),'release before mark rejected');
  good(p,'cr',{data:'2027-03-01'},'marca'); good(p,'cr',{data:'2027-03-01'});
  eq(p.S().materiali['TR-STD'].std,35.08,'new standard');
  p=apri('erp_produzione','ordini'); const preview=p.fai('co',{materiale:'TR-STD',qta:'80'},'piano'); ok(/Costi pianificati/.test(preview),'planning preview');
  good(p,'co',{materiale:'TR-STD',qta:'80',data:'2027-03-07'}); const prod=p.S().produzione[0].numero;
  p=apri('erp_produzione','avanzamento');
  good(p,'pr',{ordine:prod,kg:'650',data:'2027-03-08'});
  good(p,'cf',{ordine:prod,fase:'',qta:'',attrezzaggio:'4',ore:'70',data:'2027-03-09'});
  good(p,'en',{ordine:prod,qta:'60',data:'2027-03-10'});
  eq(p.S().giacenze.FERRO,350,'remaining iron');
  eq(p.w.PP4.effettivi(p.S().produzione[0]).totale,2689.5,'direct production costs');
  good(p,'tc',{ordine:prod,data:'2027-03-11'});
  p=apri('erp_costi','chiusura'); ok(/ko/.test(p.fai('ko',{data:'2027-03-31'})),'settlement before overhead rejected');
  good(p,'kg',{data:'2027-03-31'}); good(p,'ko',{data:'2027-03-31'});
  eq(p.w.PP4.effettivi(p.S().produzione[0]).totale,2927.58,'cost including overhead');
  p=apri('erp_vendite','ordini'); good(p,'va',{cliente:'C200',materiale:'TR-STD',qta:'20',rif:'LAB-CO-SD',data:'2027-03-12'});
  p=apri('erp_vendite','consegne'); good(p,'vl',{ordine:x=>x,data:'2027-03-13'});
  p=apri('erp_vendite','fatture'); good(p,'vf',{consegna:x=>x,data:'2027-03-13'});
  p=apri('erp_costi','ml'); p.fai('cm',{periodo:'2027-03',data:'2027-03-31'});
  ok(p.S().costing.ml.some(x=>x.periodo==='2027-03' && x.contabile),'ML closure stored with journal reference');
  eq(p.S().giacenze['TR-STD'],540,'ML does not change physical stock');
  p=apri('erp_copa','ke24'); ok(/ML/.test(p.testo()),'CO-PA contains ML correction');

  p=fresh('2027-07-01'); p=apri('erp_valute','documenti');
  const before=p.S().registrazioni.length;
  ok(/ko/.test(p.fai('fc',{cliente:'C500',importo:'1100',testo:'LAB-FX progettazione',data:'2027-07-01'})),'missing FX rejected');
  eq(p.S().registrazioni.length,before,'missing FX no journal write');
  p=apri('erp_valute','tassi');
  for(const [data,tasso] of [['2027-07-01','1,10'],['2027-07-20','1,08'],['2027-07-25','1,09'],['2027-07-31','1,12'],['2027-08-01','1,11']]) good(p,'tx',{valuta:'USD',data,tasso});
  p=apri('erp_valute','documenti');
  good(p,'fc',{cliente:'C500',importo:'1100',testo:'LAB-FX incasso',data:'2027-07-01'});
  good(p,'ff',{fornitore:'F200',importo:'550',rif:'LAB-FX-AP',testo:'consulenza',data:'2027-07-01'});
  good(p,'fc',{cliente:'C500',importo:'2200',testo:'LAB-FX aperta',data:'2027-07-02'});
  const docs=p.w.FX4.V().documenti.map(x=>x.numero);
  p=apri('erp_valute','regolazioni'); good(p,'rg',{documento:docs[0],data:'2027-07-20'}); good(p,'rg',{documento:docs[1],data:'2027-07-25'});
  eq(p.w.FX4.V().documenti[0].differenza,18.52,'realized FX gain');
  eq(p.w.FX4.V().documenti[1].differenza,-4.59,'realized FX loss');
  p=apri('erp_valute','valutazione'); good(p,'vl',{data:'2027-07-31',storno:'si'});
  const count=p.S().registrazioni.length;
  ok(/ko/.test(p.fai('vl',{data:'2027-07-31',storno:'si'})),'duplicate FX valuation rejected'); eq(p.S().registrazioni.length,count,'duplicate FX no write');
  p=apri('erp_valute','regolazioni'); good(p,'rg',{documento:docs[2],data:'2027-08-01'});
  eq(p.w.FX4.V().documenti[2].differenza,-18.02,'August realized FX loss');

  p=fresh('2027-04-01'); p=apri('erp_vendite','ordini'); good(p,'va',{cliente:'C200',materiale:'TR-STD',qta:'3',rif:'LAB-ST-SD',data:'2027-04-11'});
  p=apri('erp_vendite','consegne'); good(p,'vl',{ordine:x=>x,data:'2027-04-12'});
  p=apri('erp_vendite','fatture'); good(p,'vf',{consegna:x=>x,data:'2027-04-12'});
  p=apri('erp_fi','storni'); good(p,'vf',{fattura:x=>x,data:'2027-04-13'}); good(p,'vl',{consegna:x=>x,data:'2027-04-13'}); good(p,'ec',{consegna:x=>x,data:'2027-04-13'});
  eq(p.S().giacenze['TR-STD'],500,'VF11 VL09 delete delivery restores stock');
  p=fresh('2027-05-01'); p=apri('erp_fi','passive');
  good(p,'fp',{fornitore:'F400',rif:'LAB-BANK-AP',conto:'83',testo:'LAB polizza',imponibile:'100',iva:'0',dal:'',al:'',scadenza:'2027-05-05',data:'2027-05-02'});
  p=apri('erp_tesoreria','pagamenti'); good(p,'pg',{data:'2027-05-06'});
  p=apri('erp_fi','fatture'); good(p,'fs',{cliente:'C200',testo:'LAB-BANK-AR servizio evento',imponibile:'200',iva:'22',scadenza:'2027-05-10',data:'2027-05-03'});
  const ft=p.w.FS4.elenco()[0].numero;
  p=apri('erp_tesoreria','estratti');
  good(p,'ec',{data:'2027-05-10',righe:'2027-05-07;-100;ADDEBITO DISTINTA LAB\n2027-05-08;244;BONIFICO RIF '+ft+'\n2027-05-09;-2,50;COMMISSIONI LAB\n2027-05-09;0,50;INTERESSI LAB\n2027-05-10;-7;RETTIFICA LAB DA IDENTIFICARE'});
  good(p,'ab',{}); p.fai('mn',{riga:x=>x,cliente:'',fornitore:'',doc:'',conto:'58'});
  const statement=p.w.TS4.T().estratti[0]; const rec=p.w.TS4.riconciliazione(statement.numero);
  ok(rec.ok,'synthetic bank statement reconciles'); eq(rec.saldoConto,50135,'reconciled bank balance');
  ok(statement.righe.every(x=>x.stato!=='da abbinare'),'all five statement rows registered');
  p.lab.querySelector('#esempio').click(); eq(p.lab.querySelector('#ec-righe').value.split('\n').length,7,'sample button fills seven rows without importing');
  eq(p.w.TS4.T().estratti.length,1,'sample button adds no statement');

  p=fresh('2027-02-01'); p=apri('erp_dati','condizioni');
  good(p,'vk',{tipo:'PR00',cliente:'C100',materiale:'TR-STD',valore:'65'});
  good(p,'vk',{tipo:'K007',cliente:'C100',valore:'3'});
  good(p,'vk',{tipo:'KF00',regione:'Lazio',valore:'2'});
  p=apri('erp_vendite','crediti'); good(p,'fd',{cliente:'C100',fido:'100',rischio:'C',bloccato:'no',motivo:'LAB fido minimo'});
  p=apri('erp_vendite','ordini'); good(p,'va',{cliente:'C100',materiale:'TR-STD',qta:'10',rif:'LAB-CRED-1',data:'2027-02-02'});
  const first=p.S().ordini[0].numero;
  p=apri('erp_vendite','crediti'); good(p,'vk',{ordine:first,decisione:'rifiuta',nota:'temporaneo',data:'2027-02-02'});
  good(p,'vk',{ordine:first,decisione:'definitivo',nota:'definitivo',data:'2027-02-02'});
  p=apri('erp_vendite','ordini'); good(p,'va',{cliente:'C100',materiale:'TR-STD',qta:'10',rif:'LAB-CRED-2',data:'2027-02-03'});
  const second=p.S().ordini[1].numero;
  p=apri('erp_vendite','crediti'); good(p,'vk',{ordine:second,decisione:'rilascia',nota:'deroga didattica',data:'2027-02-03'});
  p=apri('erp_vendite','ordini'); good(p,'va',{cliente:'C100',materiale:'TR-STD',qta:'5',rif:'LAB-CRED-3',data:'2027-02-03'});
  const third=p.S().ordini[2].numero;
  p=apri('erp_vendite','crediti'); good(p,'vk',{ordine:third,decisione:'fido',fido:'200',nota:'insufficiente',data:'2027-02-03'});
  ok(p.S().ordini[2].credito.stato==='B','fido 200 insufficient');
  good(p,'vk',{ordine:third,decisione:'fido',fido:'10000',nota:'sufficiente',data:'2027-02-03'});
  good(p,'fd',{cliente:'C100',fido:'10000',rischio:'B',bloccato:'no',motivo:'LAB riaperto'});
  p=apri('erp_vendite','acconti'); good(p,'ra',{ordine:second,importo:'100',data:'2027-02-03'}); good(p,'ia',{richiesta:x=>x,data:'2027-02-04'});
  p=apri('erp_vendite','consegne'); good(p,'vl',{ordine:second,data:'2027-02-05'});
  p=apri('erp_vendite','fatture'); good(p,'vf',{consegna:x=>x,data:'2027-02-05'});
  const invoice=p.S().fatture[0].numero;
  eq(p.S().fatture[0].accontoDedotto,100,'advance deducted once');
  p=apri('erp_vendite','resi'); good(p,'re',{fattura:invoice,qta:'2',motivo:'LAB montanti errati',data:'2027-02-06'});
  good(p,'er',{reso:x=>x,data:'2027-02-06'}); good(p,'nr',{reso:x=>x,data:'2027-02-06'});
  good(p,'ab',{fattura:invoice,importo:'10',motivo:'LAB graffio',data:'2027-02-07'}); good(p,'ap',{richiesta:x=>x}); good(p,'ng',{richiesta:x=>x,data:'2027-02-07'});
  eq(p.S().giacenze['TR-STD'],492,'return of two pieces after sale ten');
  p=apri('erp_vendite','incassi'); const balance=p.w.SD4.avvia(CHIAVE).saldo('11','C100');
  good(p,'in',{cliente:'C100',importo:String(balance).replace('.',','),rif:'LAB saldo commerciale',data:'2027-02-08'});
  eq(p.w.SD4.avvia(CHIAVE).saldo('11','C100'),0,'residual customer credit closed');

  p=fresh('2027-11-01'); p=apri('erp_paghe','dipendenti'); good(p,'pa',{inpsDip:'9,19',inpsDitta:'30',inail:'1'});
  p=apri('erp_paghe','cedolino');
  good(p,'pr',{matricola:'00001',periodo:'2027-11',straordinari:'8',assenze:'4',ferie:'2',rol:'3'});
  good(p,'pr',{matricola:'00002',periodo:'2027-11',straordinari:'2',assenze:'0',ferie:'1',rol:'2'});
  good(p,'pr',{matricola:'00003',periodo:'2027-11',straordinari:'0',assenze:'0',ferie:'0',rol:'0'});
  good(p,'ca',{periodo:'2027-11'});
  good(p,'pr',{matricola:'00001',periodo:'2027-11',straordinari:'6',assenze:'4',ferie:'2',rol:'3'}); good(p,'ca',{periodo:'2027-11'});
  eq(p.w.PY4.H().cedolini.filter(x=>x.periodo==='2027-11').length,3,'recalculation replaces three November payslips');
  p=apri('erp_paghe','contabilita'); good(p,'rg',{periodo:'2027-11',data:'2027-11-30'}); good(p,'pn',{periodo:'2027-11',data:'2027-11-30'}); good(p,'f2',{periodo:'2027-11',data:'2027-12-16'});
  p=apri('erp_paghe','cedolino');
  for(const matricola of ['00001','00002','00003']) good(p,'pr',{matricola,periodo:'2027-12',straordinari:'0',assenze:'0',ferie:matricola==='00001'?'3':'0',rol:'0'});
  good(p,'ca',{periodo:'2027-12'});
  ok(p.w.PY4.H().cedolini.filter(x=>x.periodo==='2027-12').every(x=>x.tredicesima>0 && x.conguaglioDettaglio),'December thirteenth and annual adjustment');
  p=apri('erp_paghe','contabilita'); good(p,'rg',{periodo:'2027-12',data:'2027-12-31'}); good(p,'pn',{periodo:'2027-12',data:'2027-12-31'}); good(p,'f2',{periodo:'2027-12',data:'2028-01-16'});
  p=apri('erp_paghe','cedolino'); ok(/ko/.test(p.fai('ca',{periodo:'2027-12'})),'posted December cannot be recalculated');
  p=fresh('2027-01-01'); p=apri('erp_fi','fatture');
  good(p,'fs',{cliente:'C200',testo:'LAB-CH servizi annuali',imponibile:'20000',iva:'22',scadenza:'2027-01-31',data:'2027-01-02'});
  p=apri('erp_vendite','incassi'); good(p,'in',{cliente:'C200',importo:'24400',rif:'LAB-CH',data:'2027-01-31'});
  p=apri('erp_fi','passive'); good(p,'fp',{fornitore:'F400',rif:'LAB-CH-POL',conto:'83',testo:'polizza biennale',imponibile:'730',iva:'0',dal:'2027-07-01',al:'2028-06-30',scadenza:'2027-07-01',data:'2027-07-01'});
  good(p,'pg',{fornitore:'F400',importo:'730',documento:'',data:'2027-07-01'});
  p=apri('erp_cespiti','acquisto');
  good(p,'ac',{descrizione:'LAB-CH impianto in uso',classe:'IMP',fornitore:'F300',rif:'LAB-CE-A',importo:'1200',iva:'22',aliquota:'',inFunzione:'2027-01-01',data:'2027-01-01'});
  good(p,'ac',{descrizione:'LAB-CH carrello da vendere',classe:'MEZ',fornitore:'F300',rif:'LAB-CE-B',importo:'1000',iva:'22',aliquota:'',inFunzione:'2027-02-01',data:'2027-02-01'});
  good(p,'ac',{descrizione:'LAB-CH macchina da vendere',classe:'IMP',fornitore:'F300',rif:'LAB-CE-C',importo:'2000',iva:'22',aliquota:'12',inFunzione:'2027-03-01',data:'2027-03-01'});
  const assets=p.S().cespiti.map(x=>x.codice);
  p=apri('erp_cespiti','cessione'); good(p,'cs',{cespite:assets[1],cliente:'C600',prezzo:'1100',iva:'22',data:'2027-06-30'}); good(p,'cs',{cespite:assets[2],cliente:'C600',prezzo:'1500',iva:'22',data:'2027-06-30'});
  p=apri('erp_cespiti','ammortamenti'); good(p,'af',{data:'2027-12-31'});
  eq(p.S().cespiti[0].ammortamenti.reduce((s,x)=>s+x.importo,0),120,'annual depreciation A');
  p=apri('erp_fi','sopravvenienze'); good(p,'sv',{compagnia:'F400',rif:'LAB-CH-SIN',testo:'indennizzo sintetico',importo:'500',data:'2027-10-01'}); good(p,'ii',{sopravvenienza:'LAB-CH-SIN',data:'2027-10-15'});
  p=apri('erp_fi','fatture'); good(p,'fs',{cliente:'C200',testo:'LAB-CH-ANT',imponibile:'366',iva:'22',scadenza:'2027-12-01',data:'2027-12-01'});
  p=apri('erp_chiusura','assestamenti');
  for(const v of [
    {tipo:'risconto-attivo',conto:'83',testo:'LAB polizza futura',importo:'730',dal:'2027-07-01',al:'2028-06-30'},
    {tipo:'rateo-passivo',conto:'60',testo:'LAB interessi da pagare',importo:'366',dal:'2027-12-01',al:'2028-02-29'},
    {tipo:'rateo-attivo',conto:'44',testo:'LAB servizio da fatturare',importo:'900',dal:'2027-12-02',al:'2028-02-29'},
    {tipo:'risconto-passivo',conto:'44',testo:'LAB ricavo futuro',importo:'366',dal:'2027-12-01',al:'2028-02-29'}
  ]) { good(p,'as',{...v,data:'2027-12-31'},'prova'); good(p,'as',{...v,data:'2027-12-31'}); }
  eq(p.w.CH4.X().assestamenti.length,4,'four accrual/deferral types');
  p=apri('erp_chiusura','iva');
  for(const [periodo,data,pay,amount] of [['2027-T1','2027-03-31','2027-05-16',3476],['2027-T2','2027-06-30','2027-08-20',572],['2027-T4','2027-12-31','2028-03-16',80.52]]) {
    good(p,'lq',{periodo,data}); eq(p.w.CH4.X().iva.find(x=>x.periodo===periodo).daVersare,amount,'IVA '+periodo); good(p,'vs',{periodo,data:pay});
  }
  p=apri('erp_chiusura','imposte'); good(p,'ir',{anno:'2027',aumenti:'100',diminuzioni:'0',aliquota:'24',aliquotaIrap:'3,9',data:'2027-12-31'},'pv');
  p.fai('ir',{anno:'2027',aumenti:'0',diminuzioni:'0',aliquota:'24',aliquotaIrap:'3,9',data:'2027-12-31'});
  ok(p.w.CH4.X().imposte.some(x=>x.anno==='2027'),'income taxes recorded');
  ok(p.w.CH4.controlli('2027').length===0,'year-end checks pass without force');
  p=apri('erp_chiusura','chiusura'); p.fai('ch',{anno:'2027',forza:'no'}); ok(!!p.S().chiusure['2027'],'year closed');
  p=apri('erp_chiusura','riapertura'); p.fai('ra',{anno:'2028',data:'2028-01-01'}); ok(!!p.S().chiusure['2027'].riapertura,'reopening stored');
  p=apri('erp_chiusura','assestamenti'); good(p,'st',{data:'2028-01-01'});
  p=apri('erp_chiusura','riapertura'); good(p,'du',{legale:'5',data:'2028-04-30'});
  eq(p.w.SD4.avvia(CHIAVE).saldo('32'),0,'profit appropriated');
  console.log(JSON.stringify({checks:controlli,failures:errori,scope:'purchases, standard/TECO/settlement/ML/CO-PA, FX, SD reversals, bank reconciliation, credit/advance/return/G2, payroll, assets/accruals/IVA/tax/close/reopen/profit; no MRP command exists'}));
  if(errori) throw Error(errori+' checks failed');
}
vm.runInNewContext(source.slice(0,source.indexOf(marker))+'\n('+scenarios.toString()+')();', {
  require:require('module').createRequire(path.join(root,'tests/s4.js')),
  __dirname:path.join(root,'tests'), console
}, {filename:'lab-smoke-harness.js'});
