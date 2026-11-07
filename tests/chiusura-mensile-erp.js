// Regressione close mensile FI/CO/PP/MM, nessuna rete.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const scripts=[
  'app/static/js/lab-motore.js',
  'app/static/js/erp/nucleo.js',
  'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js',
  'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js',
  'app/blueprints/erp_produzione/static/pp-logica.js',
  'app/blueprints/erp_costi/static/copc-logica.js',
  'app/blueprints/erp_paghe/static/py-logica.js',
  'app/static/js/erp/chiusura-mensile.js',
];
let checks=0;function ok(value,message){assert.ok(value,message);checks++}
function throws(fn,text){assert.throws(fn,x=>String(x.message).includes(text));checks++}
function boot(){
 const w=new JSDOM('<div id="lab"></div>',{url:'https://test.local/vuoto/s4/costi/mensile',runScripts:'outside-only',pretendToBeVisual:true}).window;
 w.confirm=()=>true;
 scripts.forEach(f=>w.eval(read(f)));
 const n=w.SD4.avvia('close-month-test');
 return {w,n,S:n.S,M:w.MONTH_CLOSE};
}
function journal(n,day){
 return n.post({data:day,tipo:'SERVIZI',rif:'COSTI-MESE',descrizione:'Costi simulati',
   righe:[{conto:'80',dareAvere:'DARE',importo:300,cdc:'4210'},
          {conto:'20',dareAvere:'AVERE',importo:300}]});
}
{
 const {w,n,S,M}=boot();
 ok(M.validPeriod('2027-01')==='2027-01','mese valido');
 throws(()=>M.validPeriod('2027-13'),'Periodo');
 S.avviato='2027-01-01';
 let a=M.overview('2027-01');
 ok(a.blockers.some(x=>x.includes('Periodo senza scritture')),'mese vuoto bloccato');
 throws(()=>M.close('2027-01','CHIUDI 2027-01','Chiusura senza movimenti.'),'Chiusura impedita');
 journal(n,'2027-01-22');n.salva();
 a=M.overview('2027-01');
 ok(a.blockers.length===0,'quadratura dopo contabilizzazione');
 ok(a.totali.dare===300&&a.totali.avere===300,'Dare Avere coerenti');
 ok(a.totali.costi===300,'costo FI non raddoppiato');
 throws(()=>M.close('2027-01','NO','Riconciliati costi e conti della società.'),'CHIUDI');
 throws(()=>M.close('2027-01','CHIUDI 2027-01','breve'),'20 caratteri');
 const c=M.close('2027-01','CHIUDI 2027-01','Verificati conti, centri e movimenti del periodo.');
 ok(c.periodo==='2027-01','mese chiuso');
 ok(M.overview('2027-01').integrity,'firma del periodo coerente');
 throws(()=>journal(n,'2027-01-23'),'mese è chiuso');
 throws(()=>n.movimento('FERRO',1,'2027-01-23','101','TEST'),'mese è chiuso');
 throws(()=>n.data('2027-01-23'),'mese');
 journal(n,'2027-02-03');n.salva();
 ok(M.overview('2027-01').integrity,'le operazioni del mese dopo non cambiano il sigillo');
 throws(()=>M.close('2027-01','CHIUDI 2027-01','Verifiche già registrate e chiuse.'),'già stato chiuso');
 throws(()=>M.reopen('2027-01','NO','Rettifica il documento del periodo.'),'RIAPRI');
 M.reopen('2027-01','RIAPRI 2027-01','Rettifica documentata per verifica del fornitore.');
 ok(!M.overview('2027-01').closed,'riapertura registrata');
 ok(S.monthlyReopens.length===1,'storia riapertura conservata');
 journal(n,'2027-01-27');
 ok(M.overview('2027-01').documenti===2,'il periodo riaperto è scrivibile');
 w.close();
}
{
 const {w,n,S,M}=boot();S.avviato='2027-01-01';
 S.registrazioni.push({numero:'X1',data:'2027-01-16',tipo:'TEST',righe:[
    {conto:'80',dareAvere:'DARE',importo:100},
    {conto:'20',dareAvere:'AVERE',importo:90}]});
 ok(M.overview('2027-01').blockers.some(x=>x.includes('non quadrato')),'scrittura FI irregolare blocca');
 w.close();
}
{
 const {w,n,S,M}=boot();S.avviato='2027-01-01';
 journal(n,'2027-02-10');
 S.hr={dipendenti:[{matricola:'001'}]};
 ok(M.overview('2027-02').blockers.some(x=>x.includes('PAGHE')),'paghe mancanti bloccano la chiusura');
 w.close();
}
{
 const {w,n,S,M}=boot();S.avviato='2027-01-01';
 journal(n,'2027-01-10');
 S.mlPD.push({data:'2027-01-12',mat:'FERRO',pd:10,tipo:'acquisto'});
 ok(M.overview('2027-01').blockers.some(x=>x.includes('CKMLCP')),'differenze non chiuse');
 S.costing.ml.push({periodo:'2027-01',data:'2027-01-31'});
 ok(!M.overview('2027-01').blockers.some(x=>x.includes('CKMLCP')),'ML registrato sblocca');
 w.close();
}
{
 const {w,n,S,M}=boot();S.avviato='2027-01-01';
 journal(n,'2027-01-10');
 S.produzione.push({numero:'P100',materiale:'TR-STD',data:'2027-01-01',qta:10,
   eventi:[{tipo:'261',data:'2027-01-10'}],piano:{},teco:'2027-01-25'});
 const orig=w.PP4.effettivi,ost=w.PP4.stato;
 w.PP4.effettivi=()=>({entrati:10,mat:70,lav:20,set:0,
   sovrDovuti:{mat:0,prod:0},sovrMat:0,sovrProd:0,totale:90,accredito:80});
 w.PP4.stato=()=> 'TECO';
 ok(M.overview('2027-01').blockers.some(x=>x.includes('KO88')),'ordine TECO senza liquidazione bloccato');
 S.produzione[0].liquidazione={data:'2027-01-30',varianza:10};
 ok(!M.overview('2027-01').blockers.some(x=>x.includes('KO88')),'ordine liquidato conciliato');
 w.PP4.effettivi=orig;w.PP4.stato=ost;
 w.close();
}
console.log('Chiusura mensile FI/CO/PP/MM: '+checks+' controlli superati.');
