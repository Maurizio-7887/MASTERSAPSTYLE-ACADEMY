// Percorso corrente: ordine didattico, istruzioni concrete e preparazione realmente eseguibile.
// Solo browser sintetico in memoria; nessun database, account o servizio esterno.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),dir='app/blueprints/guida/static/esercizi/';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');let checks=0;
function ok(v,m){checks++;assert.ok(v,m);}
function guida(state,completa=false){
 const before=JSON.stringify(state),window={MSA_STATO_CORRENTE:()=>state,localStorage:{getItem:()=>null,setItem:()=>{throw Error('Guida mutante');}}};
 const ctx=vm.createContext({window,console});
 const files=['dicembre-wms-legacy','cpm-formas','dicembre-wms'].concat(completa?['magazzino-formas','laboratori-completi','uso-programma','completo-formas']:[]);
 files.forEach(f=>vm.runInContext(read(dir+f+'.js'),ctx,{filename:f}));
 ok(JSON.stringify(state)===before,'Guida senza mutazioni');return window;
}
const w=guida(null),E=w.MSA_ESERCIZIO,ps=E.passi;
const index=t=>ps.findIndex(p=>p.titolo.includes(t));
function prima(a,b){ok(index(a)>=0&&index(a)<index(b),a+' prima di '+b);}
prima('Prima di cominciare','Costituisci');prima('Costituisci','I soci versano');prima('I soci versano','Attiva il magazzino');
prima('Attiva il magazzino','compra la taglierina');prima('compra una sega','Attiva il nuovo percorso CPM');
prima('Attiva il nuovo percorso CPM','Salva il budget annuale');prima('Salva il budget annuale','Salva distinta e ciclo');
prima('Salva il solo HALB','CK11N:');prima('CK11N:','CK24:');prima('CK24:','Leggi il ciclo');
prima('Leggi il ciclo','VA01: Beta');prima('VA01: Delta','Dalla domanda ai fabbisogni');
prima('Dalla domanda ai fabbisogni','ME21N: ordina');prima('ME21N: ordina','MIGO 101: ricevi il ferro');
prima('MIRO: fattura del riordino','CO01: un ordine per 300');prima('CO01: un ordine per 300','CO11N: Taglio');
prima('CO11N: Taglio','CO11N: Piegatura');prima('CO11N: Piegatura','CO11N: Saldatura');
prima('CO11N: Saldatura','101: carica a magazzino le 300');prima('101: carica a magazzino le 300','CO01: ordine autonomo');
prima('CO11N: conferma 5 ore','Confronta budget, attività');prima('Registra le paghe','Riconcilia le fonti');
prima('Riconcilia le fonti','KO88:');prima('compra il carrello','Vendi il carrello');prima('compra una sega','Vendi la sega');
prima('compra la taglierina','AFAB:');
let previous='';
for(const p of ps){
 ok(p.dove&&p.dove.ep&&p.campi&&p.campi.length,'Destinazione e campi '+p.titolo);
 if(p.data){const d=p.data.split('/').reverse().join('-');ok(!previous||d>=previous,'Data coerente '+p.titolo);previous=d;}
}
const intro=JSON.stringify(ps[0]);ok(intro.includes('NUOVA AZIENDA')&&intro.includes('backup JSON')&&intro.includes('stesso slot'),'Backup e consenso non spacciati per archivio separato');
ok(!intro.includes('premi «Azzera'),'Nessun reset diretto prescritto');
ok(ps.filter(p=>p.titolo.startsWith('F-90:')).length===5,'Cinque acquisti F-90 conservati');
ok(ps.some(p=>p.titolo==='Consegna il lavoro al docente'),'Consegna conservata');
ok(ps.filter(p=>p.fatto).length>65,'Controlli automatici del caso conservati');
const completo=guida(null,true).MSA_ESERCIZIO;
for(const p of ps)ok(completo.passi.some(q=>q.titolo===p.titolo),'Passo conservato nel completo: '+p.titolo);
ok(completo.passi.filter(p=>p.id==='cpm-attivazione').length===1,'CPM non duplicato nel completo');
const legacy=JSON.parse(read('tests/fixtures/dicembre-wms-legacy.json'));
ok(guida(legacy).MSA_ESERCIZIO.passi.every(p=>!p.id||!p.id.startsWith('cpm-')),'Nessuna reinterpretazione CPM dei vecchi lavori');

const {JSDOM}=require('jsdom');
const win=new JSDOM('<!doctype html><div id="lab"></div>',{url:'https://sim.local/',runScripts:'outside-only'}).window;
win.confirm=()=>true;win.LAB_PAGINA={chiave:'percorso-ordinato-sintetico',pagina:'avvio'};
const logica=['app/static/js/lab-motore.js','app/static/js/erp/nucleo.js','app/static/js/erp/ui.js','app/blueprints/erp_vendite/static/sd-logica.js','app/blueprints/erp_acquisti/static/mm-logica.js','app/blueprints/erp_produzione/static/pp-logica.js','app/blueprints/erp_costi/static/copc-logica.js','app/blueprints/erp_magazzino/static/wm-logica.js','app/blueprints/erp_cespiti/static/ce-logica.js'];
logica.forEach(f=>win.eval(read(f)));let N=win.SD4.avvia(win.LAB_PAGINA.chiave),S=N.S;
function pagina(bp,file,p){win.LAB_PAGINA.pagina=p;win.eval(read('app/blueprints/'+bp+'/static/'+file));N=win.SD4.N;S=N.S;}
function fai(pref,values,action){
 for(const [k,v]of Object.entries(values)){const el=win.document.getElementById(pref+'-'+k);ok(!!el,'Campo reale '+pref+'-'+k);el.value=typeof v==='number'?String(v).replace('.',','):String(v);}
 const precedente=win.document.getElementById(pref+'-esito');
 const b=win.document.querySelector('[data-prefisso="'+pref+'"] [data-azione="'+(action||pref)+'"]');ok(!!b,'Pulsante reale '+pref);b.click();
 const es=win.document.getElementById(pref+'-esito')||precedente;ok(es&&es.classList.contains('ok'),'Operazione '+pref+': '+(es&&es.textContent));
}
pagina('erp_dati','dati-pagine.js','avvio');
ok(win.document.body.textContent.includes('Crea nuova azienda vuota (costituzione)'),'UI nuova azienda reale');
fai('cs',{data:'2026-12-01',capitale:80000});
ok(S.registrazioni.length===1&&S.giacenze['TR-STD']===0&&N.saldo('10')===0,'Costituzione senza banca o scorte regalate');
fai('vs',{data:'2026-12-01',importo:80000});
win.WM4.attiva({data:'2026-12-01'});
ok(S.wm.quant.length===0&&N.saldo('10')===80000,'WMS vuoto dopo capitale, prima ricevimento');
const campo=(p,k)=>p.campi.find(x=>x[0]===k)[1];
for(const p of ps.filter(p=>p.titolo.startsWith('F-90:'))){
 win.CE4.acquista({descrizione:campo(p,'Descrizione'),classe:campo(p,'Classe').split(' ')[0],fornitore:campo(p,'Fornitore').split(' ')[0],importo:campo(p,'Imponibile'),iva:campo(p,'IVA %'),rif:campo(p,'Numero fattura'),inFunzione:'2026-12-01',data:'2026-12-01'});
}
ok(S.cespiti.length===5&&S.cespiti.every(c=>c.acquisto<=c.inFunzione),'Acquisti e date cespiti dalle istruzioni');
const fiPrima=JSON.stringify(S.registrazioni);
pagina('erp_costi','copc-pagine.js','scheda');fai('cpm-start',{conferma:'ATTIVA'},'start');
const m=win.PC4.cpm.modello();
const budget={anno:2026,produttivi:18000,amministrativi:0,driver:'ore','vol_TR-STD':1200};
for(const k of win.PC4.cpm.centri)Object.assign(budget,{[k+'_personale']:36000,[k+'_indiretti']:0,[k+'_capacita']:1500,[k+'_orePiano']:1500,[k+'_percentuale']:100/3});
Object.keys(m.standard).filter(k=>k!=='TR-STD').forEach(k=>budget['vol_'+k]=0);
fai('cpm-budget',budget,'budget');
fai('cpm-standard',{materiale:'TR-STD',componente:'FERRO',quantita:8,Taglio:0.25,Piegatura:0.20,Saldatura:0.40,attrezzaggio:0,centroSet:'Taglio'},'standard');
win.document.getElementById('cpm-materiale').value='SL-TAGLIO';win.document.getElementById('cpm-materiale').dispatchEvent(new win.Event('change'));
fai('cpm-standard',{materiale:'SL-TAGLIO',componente:'FERRO',quantita:8,Taglio:0.25,Piegatura:0,Saldatura:0,attrezzaggio:0,centroSet:'Taglio'},'standard');
pagina('erp_costi','copc-pagine.js','calcolo');
for(const mat of ['TR-STD','SL-TAGLIO'])fai('ck',{materiale:mat,data:'2026-12-01'});
fai('cr',{data:'2026-12-01'},'marca');fai('cr',{data:'2026-12-01',sostituisciBootstrap:'SOSTITUISCI'});
ok(JSON.stringify(S.registrazioni)===fiPrima,'CPM e rilascio su stock vuoto non duplicano FI');
for(const p of ps.filter(p=>p.id&&p.id.startsWith('cpm-')&&p.fatto))ok(p.fatto({S}),'Spunta automatica CPM '+p.id);
const report=win.PC4.cpm.report(2026);
for(const c of report.centri){ok(c.tariffa===28&&c.budget===42000,'Tariffa derivata '+c.centro);}
ok(report.centri.map(c=>c.oreRichieste).join('/')==='300/240/480','Volume annuo distinto da ordine 300');
win.PP4.ordine({materiale:'TR-STD',qta:300,data:'2026-12-07'});
const ordine=S.produzione[0];ok(ordine.piano.totale===9420&&ordine.fasi.join('/')==='Taglio/Piegatura/Saldatura','Ordine unico coerente col budget rilasciato');
ok(ordine.piano.par.snapshot.versione==='cpm-centri-v1','Ordine conserva snapshot CPM');
win.close();console.log('OK: '+checks+' controlli percorso ordinato, UI preparazione/CPM e nessun reset o dato reale.');
