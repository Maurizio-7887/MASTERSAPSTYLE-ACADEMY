// Regressione punto 58: laboratorio di ragioneria aperto dal Launchpad (pagina senza simulatore).
// Lo stato si legge solo da localStorage: la verifica deve salvare le risposte e non ridisegnare caselle vuote.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const R=f=>fs.readFileSync(path.join(__dirname,'../app/blueprints/guida/static',f),'utf8');
let n=0;
function ok(c,m){n++;if(!c)throw Error(m);}
const righe=[{conto:'07',dareAvere:'DARE',importo:292},{conto:'73',dareAvere:'AVERE',importo:292}];
const S0={lab:'erp',pianoDeiConti:[{codice:'07',nome:'Magazzino semilavorati'},{codice:'12',nome:'Magazzino ferro'},{codice:'73',nome:'Output di produzione (accredito ordini)'}],
  registrazioni:[{id:'d58',numero:'58',data:'2026-12-12',righe}],
  msaRagioneria:{versione:1,visti:[],esiti:[],coda:[{chiave:'d58',risposte:[],tentativi:0,documento:{id:'d58',numero:'58',data:'2026-12-12',descrizione:'Entrata semilavorati SL-TAGLIO',righe}}]}};
const w=new JSDOM('<body><main></main></body>',{url:'https://sim.local/vuoto/portale/',runScripts:'outside-only',pretendToBeVisual:true}).window;
w.setInterval=()=>1; w.setTimeout=f=>{f();return 1;};
w.localStorage.setItem('dati',JSON.stringify(S0));
// nessun MSA_STATO_CORRENTE / MSA_SALVA_STATO_CORRENTE: come sul Launchpad
w.MSA_GUIDA={esercizio:'ragioneria-wms',versione:'vuoto',chiave:'dati',url:{'erp_dati.avvio':'/vuoto/s4/dati/','erp_magazzino.struttura':'/vuoto/s4/magazzino/'}};
w.eval(R('esercizi/ragioneria-wms.js'));w.eval(R('ragioneria.js'));w.eval(R('pannello.js'));
const d=w.document, rr=()=>[...d.querySelectorAll('.msa-q-riga')];
ok(rr().length===2,'laboratorio visibile sul Launchpad');
function compila(i,conto,sez,imp){
  const r=rr()[i];
  r.querySelector('.msa-q-sezione').value=sez; r.querySelector('.msa-q-sezione').dispatchEvent(new w.Event('change',{bubbles:true}));
  r.querySelector('.msa-q-importo').value=imp; r.querySelector('.msa-q-importo').dispatchEvent(new w.Event('change',{bubbles:true}));
  r.querySelector('.msa-q-conto').value=conto; r.querySelector('.msa-q-conto').dispatchEvent(new w.Event('change',{bubbles:true}));
}
compila(0,'07','DARE','292');
compila(1,'73 · Output di produzione (accredito ordini)','AVERE','292');
let salvato=JSON.parse(w.localStorage.getItem('dati')).msaRagioneria.coda[0];
ok(salvato.risposte[1]&&salvato.risposte[1].conto==='73','la bozza salva il conto scelto dall\'elenco');
d.querySelector('.msa-q-verifica').click();
salvato=JSON.parse(w.localStorage.getItem('dati')).msaRagioneria.coda[0];
ok(salvato.corretto===true&&salvato.tentativi===1,'la verifica viene salvata nel browser');
ok(rr()[1].querySelector('.msa-q-conto').value==='73','dopo la verifica il conto resta compilato');
ok(d.querySelector('.msa-q-continua'),'compare il pulsante per proseguire');
d.querySelector('.msa-q-continua').click();
const fine=JSON.parse(w.localStorage.getItem('dati')).msaRagioneria;
ok(fine.coda.length===0&&fine.esiti.length===1&&fine.esiti[0].corretto,'si prosegue: documento chiuso ed esito registrato');
w.close();
console.log('OK: '+n+' verifiche laboratorio di ragioneria su pagina senza simulatore');
