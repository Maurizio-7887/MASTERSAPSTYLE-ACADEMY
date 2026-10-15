// Prova il nucleo contabile e il pannello reale, senza risposte attese fisse nell'interfaccia.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const R=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const G='app/blueprints/guida/static/';
let n=0;
function ok(x,m){n++;if(!x)throw Error(m);}
function pagina(memoria,pos){
 const w=new JSDOM('<body><main><button id="operazione">Operazione</button></main></body>',{url:'https://sim.local/vuoto/s4/dati/',runScripts:'outside-only',pretendToBeVisual:true}).window;
 w.setInterval=()=>1;
 if(memoria)w.localStorage.setItem('dati',memoria);
 if(pos!==undefined)w.sessionStorage.setItem('msa-guida-pos-ragioneria-wms',String(pos));
 w.eval(R('app/static/js/lab-motore.js'));w.eval(R('app/static/js/erp/nucleo.js'));
 const N=w.S4.crea('dati');
 w.MSA_GUIDA={esercizio:'ragioneria-wms',versione:'vuoto',chiave:'dati',url:{}};
 w.eval(R(G+'esercizi/ragioneria-wms.js'));w.eval(R(G+'ragioneria.js'));w.eval(R(G+'pannello.js'));
 return {w,N,S:()=>N.S,body:()=>w.document.querySelector('.msa-g-corpo'),click:s=>w.document.querySelector(s).click(),save:()=>w.localStorage.getItem('dati')};
}
function compila(p,modo='corretto'){
 const q=p.S().msaRagioneria.coda[0];
 const rs=q.documento.righe.map((r,i)=>({r,i})).sort((a,b)=>String(a.r.conto).localeCompare(String(b.r.conto),'it',{numeric:true})||a.i-b.i).map(x=>x.r);
 [...p.body().querySelectorAll('.msa-q-riga')].forEach((el,i)=>{
  const r=rs[i];el.querySelector('select').value=modo==='inverti'?(r.dareAvere==='DARE'?'AVERE':'DARE'):r.dareAvere;
  el.querySelector('input').value=(modo==='importo'?r.importo*2:r.importo).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
 });
}
let p=pagina();
p.w.MSA_GUIDA_API.vaiA(1,true);
ok(!p.body().textContent.includes('81.785'),'soluzione di apertura nascosta prima di operare');
p.N.avvia({data:'2027-01-02'});
ok(p.S().msaRagioneria.coda.length===1,'avvio realmente registrato genera una domanda');
ok(p.body().textContent.includes('LIBRO GIORNALE E MASTRI'),'avviso visibile');
ok(p.body().querySelectorAll('.msa-q-riga').length===3,'tutti i conti di apertura proposti');
ok(!p.body().querySelector('.msa-q-soluzione'),'nessuna soluzione anticipata');
ok(p.w.document.querySelector('.msa-g-av').disabled,'guida ferma durante domanda');
ok(p.w.document.querySelector('.msa-g-elenco select').disabled,'elenco passi non salta domanda');
ok([...p.body().querySelectorAll('select')].every(s=>!s.value),'nessuna sezione precompilata');
ok([...p.body().querySelectorAll('input')].every(s=>!s.value),'nessun importo precompilato');
const libro=JSON.stringify(p.S().registrazioni);
p.click('.msa-q-verifica');
ok(!p.S().msaRagioneria.coda[0].corretto,'risposte vuote rifiutate');
compila(p,'inverti');p.click('.msa-q-verifica');
ok(!p.S().msaRagioneria.coda[0].corretto,'Dare/Avere invertiti rifiutati anche se quadrati');
ok(p.S().msaRagioneria.coda[0].totali.dare===p.S().msaRagioneria.coda[0].totali.avere,'test invertito realmente in pareggio');
compila(p,'importo');p.click('.msa-q-verifica');
ok(!p.S().msaRagioneria.coda[0].corretto,'importi doppi rifiutati anche se quadrati');
compila(p);p.body().querySelector('input').dispatchEvent(new p.w.Event('change',{bubbles:true}));
const m=p.save(),pos=p.w.MSA_GUIDA_API.passo();p.w.close();p=pagina(m,pos);
ok(p.body().querySelector('input').value!=='','bozza ripristinata cambiando pagina');
ok(p.body().textContent.includes('Ricostruisci'),'quiz resta prioritario al rientro');
p.click('.msa-q-verifica');
ok(p.S().msaRagioneria.coda[0].corretto,'risposta reale riconosciuta al centesimo');
ok(JSON.stringify(p.S().registrazioni)===libro,'tentativi non alterano giornale');
p.click('.msa-q-continua');
ok(p.S().msaRagioneria.esiti.length===1,'esito conservato');
ok(p.S().msaRagioneria.esiti[0].tentativi===4,'tentativi conservati');
ok(p.w.MSA_GUIDA_API.passo()===2,'dopo conferma riprende attivazione WMS');
ok(!p.w.document.querySelector('.msa-g-av').disabled,'guida riabilitata');
p.N.salva();p.N.salva();ok(!p.S().msaRagioneria.coda.length,'salvataggi ripetuti non duplicano domande');
p.N.S.registrazioni[0].righe[0].pareggio='compensata';p.N.salva();
ok(!p.S().msaRagioneria.coda.length,'compensazione non ripropone vecchia scrittura');
function post(N,desc,amount=7){N.post({data:'2027-02-01',tipo:'TEST',descrizione:desc,righe:[{conto:'10',dareAvere:'DARE',importo:amount},{conto:'11',dareAvere:'AVERE',importo:amount}]});}
post(p.N,'fattura e provvigione: documento uno');post(p.N,'fattura e provvigione: documento due',3.21);p.N.salva();
ok(p.S().msaRagioneria.coda.length===2,'due documenti della stessa operazione in coda');
compila(p);p.click('.msa-q-verifica');p.click('.msa-q-continua');
ok(p.S().msaRagioneria.coda.length===1,'prima risposta non salta seconda scrittura');
p.click('.msa-q-verifica');p.click('.msa-q-aiuto');
ok(!!p.body().querySelector('.msa-q-soluzione'),'soluzione disponibile dopo tentativo');
ok(!p.S().msaRagioneria.coda[0].corretto,'aiuto non equivale a risposta corretta');
p.click('.msa-q-continua');
ok(p.S().msaRagioneria.esiti.at(-1).conAiuto,'aiuto registrato per docente');
const prima=p.S().registrazioni.length;
try{p.N.post({data:'2027-02-01',tipo:'TEST',descrizione:'fallita',righe:[{conto:'10',dareAvere:'DARE',importo:1}]});}catch(e){}
p.N.salva();ok(p.S().registrazioni.length===prima&&!p.S().msaRagioneria.coda.length,'operazione fallita non genera domanda');
post(p.N,'salvataggio fallito');
const proto=p.w.Storage.prototype, set=proto.setItem;
proto.setItem=function(){throw Error('memoria piena');};
try{p.N.salva();}catch(e){}
ok(!p.S().msaRagioneria.coda.length,'documento non salvato non genera domanda');
proto.setItem=set;p.N.salva();
ok(p.S().msaRagioneria.coda.length===1,'ritentativo riuscito genera domanda una sola volta');
compila(p);proto.setItem=function(){throw Error('memoria piena');};p.click('.msa-q-verifica');
ok(!p.S().msaRagioneria.coda[0].corretto,'verifica senza salvataggio non acquisisce esito');
ok(p.body().textContent.includes('Salvataggio non riuscito'),'errore salvataggio visibile');
proto.setItem=set;p.click('.msa-q-verifica');p.click('.msa-q-continua');
const parse=p.w.MSA_RAGIONERIA.importo;
for(const [s,v] of [['3.660',366000],['3.660,00',366000],['3660.00',366000],['0,40',40],['0.40',40],['-4',null],['',null],['1,234',null],['abc',null],['0',null],['1.234,56',123456],['12.34,56',null]])ok(parse(s)===v,'parser importi '+s);
const storico=JSON.parse(p.save());delete storico.msaRagioneria;
const h=pagina(JSON.stringify(storico));h.N.salva();ok(!h.S().msaRagioneria.coda.length,'vecchi dati senza quiz adottati senza domande retroattive');
h.N.azzera();ok(!h.S().msaRagioneria.coda.length&&!h.S().msaRagioneria.esiti.length,'reset didattico esplicito azzera anche quiz');
post(h.N,'dopo reset');h.N.salva();ok(h.S().msaRagioneria.coda.length===1,'cattura funziona dopo reset');
[p,h].forEach(p=>p.w.close());
console.log('OK: '+n+' verifiche quiz contabile, persistenza, importi e nessun doppio movimento');
