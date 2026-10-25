/* node tests/esercizio-migliorie.js — solo VM/jsdom e dati sintetici in memoria. */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),dir='app/blueprints/guida/static/esercizi/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
const files=['dicembre-wms-legacy','cpm-formas','dicembre-wms','magazzino-formas','laboratori-completi','uso-programma'];
function carica(state){
 const prima=JSON.stringify(state),window={MSA_STATO_CORRENTE:()=>state,localStorage:{getItem:()=>null,setItem:()=>{throw Error('Guida mutante');}}};
 const ctx=vm.createContext({window,console});files.forEach(f=>vm.runInContext(read(dir+f+'.js'),ctx));
 const originale=window.MSA_ESERCIZIO,primaGuida=JSON.stringify(originale),passi=originale.passi.slice();
 vm.runInContext(read(dir+'completo-formas.js'),ctx);
 ok(JSON.stringify(state)===prima,'Stato non modificato');
 ok(JSON.stringify(originale)===primaGuida,'Guida sorgente non modificata');
 return {window,passi,nuovi:window.MSA_ESERCIZIO.passi};
}
const {passi,nuovi}=carica(null),find=id=>nuovi.find(p=>p.id===id);
for(const p of passi){
 const q=nuovi.find(x=>x.titolo===p.titolo);ok(!!q,'Passo originale conservato '+p.titolo);
 ok(q.fatto===p.fatto,'Controllo automatico conservato '+p.titolo);
 ok(q.attesa===p.attesa,'Importi e risultati conservati '+p.titolo);
 for(const r of p.campi)ok(q.campi.some(s=>s[0]===r[0]&&s[1]===r[1])||p.id==='dicembre-avvio-vuoto','Dati originali conservati '+r[0]);
}
const beni=nuovi.filter(p=>p.titolo.startsWith('F-90:'));
ok(beni.length===5,'Sempre cinque acquisti');
for(const p of beni){
 for(const k of ['Codice interno macchinario','Matricola del costruttore','Aliquota civilistica annua %','Centro di costo (etichetta)'])ok(p.campi.some(r=>r[0]===k),'Campo tecnico '+k);
 ok(p.nota.includes('CE-')&&p.nota.includes('non imputa'),'Codici e centro non contabile');
}
const testi=JSON.stringify(nuovi),reg=find('completo-macchine-registro');
ok(!!reg&&!reg.contabile&&!reg.fatto,'Registro è sola lettura');
ok(nuovi.indexOf(reg)>nuovi.indexOf(beni[4])&&nuovi.indexOf(reg)<nuovi.indexOf(find('cpm-attivazione')),'Registro fra acquisti e budget');
for(const t of ['NON registra spese','coefficiente fiscale','anteprima AFAB','ordine libero','codice o descrizione','fabbisogno TOTALE','NON riserva esclusiva','LI20','LI21','GR-ZONE','PSA-L1','6000','1200','28 €/h'])ok(testi.includes(t),'Consegna esplicita '+t);
for(const p of nuovi.filter(p=>p.titolo.startsWith('F-53:')))ok(p.campi.some(r=>r[0]==='Conto bancario di addebito'&&r[1].startsWith('10 Banca')),'Banca del main 10');
ok(find('lab-migliorie-banche-avvio').campi.some(r=>r[1].includes('NON azzerare')),'Banche separate e non distruttive');
ok(find('lab-migliorie-banche-pagamenti').nota.includes('fisco'),'Limite altri flussi dichiarato');
const ids=nuovi.map(p=>p.id).filter(Boolean);ok(new Set(ids).size===ids.length,'ID univoci');
const legacy=JSON.parse(read('tests/fixtures/dicembre-wms-legacy.json'));
const storico=carica(legacy).nuovi;
ok(storico.some(p=>p.id==='completo-storico')&&!storico.some(p=>p.id==='completo-macchine-registro'),'Storico non convertito');

// Esegui il laboratorio due banche sui motori reali; righe estratto lette dalla guida.
const {JSDOM}=require('jsdom');
const w=new JSDOM('<main id="lab"></main>',{url:'https://academy.invalid/',runScripts:'outside-only'}).window;
w.LAB_PAGINA={chiave:'test-esercizio-migliorie',pagina:'avvio'};
for(const p of ['app/static/js/lab-motore.js','app/static/js/erp/nucleo.js','app/blueprints/erp_vendite/static/sd-logica.js','app/blueprints/erp_fi/static/fs-logica.js','app/blueprints/erp_tesoreria/static/tes-logica.js'])w.eval(read(p));
const N=w.SD4.avvia(w.LAB_PAGINA.chiave);
N.avvia({modo:'costituzione',data:'2027-05-01',capitale:10000});
N.versaCapitale({data:'2027-05-01',importo:10000});
ok(N.saldo('10')===10000&&N.saldo('10.02')===0,'Nessuna liquidità inventata');
w.TS4.giroconto({da:'10',a:'10.02',importo:3000,data:'2027-05-02'});
ok(N.saldo('10')===7000&&N.saldo('10.02')===3000,'Giroconto del laboratorio');
w.FS4.fatturaPassiva({fornitore:'F400',rif:'LAB-DUE-POL',conto:'83',testo:'Polizza simulata due banche',imponibile:1200,iva:0,scadenza:'2027-05-03',data:'2027-05-03'});
w.FS4.fatturaPassiva({fornitore:'F300',rif:'LAB-MAC',conto:'83',testo:'Altro fornitore con debito aperto',imponibile:5000,iva:0,scadenza:'2027-05-03',data:'2027-05-03'});
{const prima=N.S.registrazioni.length;let msg='';try{w.FS4.paga({fornitore:'F300',banca:'10',documento:'LAB-DUE-POL',data:'2027-05-04'});}catch(e){msg=e.message;}
ok(/F400/.test(msg)&&N.S.registrazioni.length===prima&&N.saldo('20','F300')===-5000,'Fattura di F400 pagata a F300: rifiutata, nessun documento (errore dell’allievo)');}
w.FS4.paga({fornitore:'F300',banca:'10',documento:'LAB-MAC',data:'2027-05-04'});
w.FS4.paga({fornitore:'F400',banca:'10.02',documento:'LAB-DUE-POL',importo:400,data:'2027-05-04'});
w.FS4.paga({fornitore:'F400',banca:'10',documento:'LAB-DUE-POL',importo:800,data:'2027-05-05'});
ok(N.saldo('20','F400')===0&&N.saldo('10')===1200&&N.saldo('10.02')===2600,'Due pagamenti stessa fattura');
const righe=find('lab-migliorie-banche-estratto').campi.find(r=>r[0]==='Movimenti (una riga ciascuno)')[1];
const count=N.S.registrazioni.length;
w.TS4.caricaEstratto({banca:'10.02',data:'2027-05-06',righe});
const es=w.TS4.T().estratti.slice(-1)[0];
ok(es.saldoIniziale===3000,'Saldo iniziale derivato dai documenti');
w.TS4.abbina({estratto:es.numero});
ok(N.S.registrazioni.length===count+1,'Solo commissione aggiunta, non secondo pagamento');
ok(N.saldo('10')===1200&&N.saldo('10.02')===2595&&N.saldoBanche()===3795,'Saldi finali della consegna verificati');
ok(w.TS4.riconciliazione(es.numero).ok,'Estratto seconda banca riconciliato');
w.close();
console.log('OK: '+checks+' controlli esercizio aggiornato, compatibilità e laboratorio due banche reale in memoria.');
