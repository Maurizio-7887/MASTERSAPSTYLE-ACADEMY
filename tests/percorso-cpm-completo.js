// E2E CPM completo: riusa il caso dicembre e tutte le sue verifiche, senza modificare
// l'harness condiviso né sovrascriverne le fotografie JSON. Solo dati sintetici locali.
const fs=require('fs'),path=require('path'),assert=require('assert'),Module=require('module');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),file=path.join(__dirname,'esercizio-dicembre-wms.js');
let source=fs.readFileSync(file,'utf8');let extra=0;
function check(v,m){extra++;assert.ok(v,m);}
function replaceOne(old,nuovo){assert.strictEqual(source.split(old).length,2,'Punto di integrazione univoco: '+old.slice(0,100));source=source.replace(old,nuovo);}

// Preload identico al template corrente: la guida deve includere anche i passi CPM.
const preload="  w.eval(R('app/blueprints/guida/static/esercizi/dicembre-wms.js'));";
// Il filesystem cloud costa un accesso per apertura: cache dei soli sorgenti,
// mai dello stato applicativo che continua a ricaricarsi fra tutte le pagine.
replaceOne("const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');","const sorgentiCPM=new Map(); const R=p=>{if(!sorgentiCPM.has(p))sorgentiCPM.set(p,fs.readFileSync(path.join(__dirname,'..',p),'utf8'));return sorgentiCPM.get(p);};");
// Ogni pagina jsdom è un browser distinto come nell'harness originale; rilascia
// esplicitamente i browser chiusi nei sandbox con memoria limitata.
replaceOne('  if (ultima) ultima.close();','  if (ultima) ultima.close(); if (global.gc) global.gc();');
replaceOne('function controlla(nome) {',"function controlla(nome) { console.log('CPM E2E checkpoint: '+nome);");
if(!source.includes("w.eval(R('app/blueprints/guida/static/esercizi/cpm-formas.js'))")){
 assert.ok(source.includes(preload),'Preload guida presente');
 // Solo il primo è il caricamento operativo; il secondo testa il launchpad legacy.
 source=source.replace(preload,"  w.eval(R('app/blueprints/guida/static/esercizi/cpm-formas.js'));\n"+preload);
}

// L'harness precedente leggeva il ciclo prima dei cespiti: la nuova guida lo legge
// dopo acquisto e formazione dello standard. Si spostano soltanto queste letture.
const lettura="p = apri('erp_produzione','ordini'); ok(/WIP/.test(p.testo()),'ciclo a fasi e WIP spiegati');\np = apri('erp_costi','calcolo'); ok(/14,60/.test(p.testo()) && /31,40/.test(p.testo()),'standard HALB e finito visibili');";
replaceOne(lettura,'// Lettura ciclo dopo il rilascio CPM, sotto.');
const setup=String.raw`
// Nuovo percorso: il budget analitico precede domanda cliente e qualsiasi movimento.
p=apri('erp_costi','scheda');
const fiPrimaCPM=JSON.stringify(p.S().registrazioni);
p.fai('cpm-start',{conferma:'ATTIVA'},'start');
ok(p.w.PC4.cpm.attivo(),'CPM esplicitamente attivo prima degli ordini');fino('Attiva il nuovo percorso CPM');
const modelloCPM=p.w.PC4.cpm.modello();
const valoriBudget={anno:'2026',produttivi:'18000',amministrativi:'0',driver:'ore'};
for(const centro of p.w.PC4.cpm.centri){
 Object.assign(valoriBudget,{[centro+'_personale']:'36000',[centro+'_indiretti']:'0',[centro+'_capacita']:'1500',[centro+'_orePiano']:'1500'});
}
Object.keys(modelloCPM.standard).forEach(mat=>valoriBudget['vol_'+mat]=mat==='TR-STD'?'1200':'0');
bene(p.fai('cpm-budget',valoriBudget,'budget'),'salva budget CPM annuale');fino('Salva il budget annuale');
bene(p.fai('cpm-standard',{materiale:'TR-STD',componente:'FERRO',quantita:'8',Taglio:'0,25',Piegatura:'0,20',Saldatura:'0,40',attrezzaggio:'0',centroSet:'Taglio'},'standard'),'salva ciclo TR CPM');
p.lab.querySelector('#cpm-materiale').value='SL-TAGLIO';p.lab.querySelector('#cpm-materiale').dispatchEvent(new p.w.Event('change'));
bene(p.fai('cpm-standard',{materiale:'SL-TAGLIO',componente:'FERRO',quantita:'8',Taglio:'0,25',Piegatura:'0',Saldatura:'0',attrezzaggio:'0',centroSet:'Taglio'},'standard'),'salva ciclo HALB CPM');
p=apri('erp_costi','calcolo');
for(const mat of ['TR-STD','SL-TAGLIO'])bene(p.fai('ck',{materiale:mat,data:'2026-12-01'}),'CK11N CPM '+mat);
fino('CK11N:');
bene(p.fai('cr',{data:'2026-12-01'},'marca'),'marca entrambi gli standard CPM');
bene(p.fai('cr',{data:'2026-12-01',sostituisciBootstrap:'SOSTITUISCI'}),'rilascio CPM iniziale esplicito');
fino('CK24:');
ok(JSON.stringify(p.S().registrazioni)===fiPrimaCPM,'attivazione budget e standard senza duplicazione FI');
ok(p.w.PC4.cpm.report(2026).centri.map(c=>c.oreRichieste).join('/')==='300/240/480','budget annuo1200 distinto da ordine300');
`;
replaceOne('// 3 · assicurazione',setup+'\n'+lettura+'\n// 3 · assicurazione');
// CPM conserva anche la singola operazione HALB nello snapshot: la sua fase va
// dichiarata esplicitamente, diversamente dal ciclo aggregato pre-CPM.
replaceOne("ordine:oh,fase:'',attrezzaggio:'0',ore:'5'","ordine:oh,fase:'Taglio',attrezzaggio:'0',ore:'5'");

// Conservare tutte le operazioni ma rispettare il calendario 22/12 -> 28/12.
const incasso=source.match(/^p = apri\('erp_fi','sopravvenienze'\); bene\(p\.fai\('ii'.*$/m);
assert.ok(incasso,'Operazione incasso indennizzo presente');
replaceOne(incasso[0],'// Incasso28/12 eseguito dopo le cessioni22/12.');
const puntoIncasso="vicinoS('46',1300,'minusvalenza'); vicinoS('45',-816.67,'plusvalenza');";
replaceOne(puntoIncasso,puntoIncasso+'\n'+incasso[0]);

// Niente output condivisi: le fotografie originali restano del test di base.
for(const nome of ['dicembre-wms-31-12.json','dicembre-wms-finale.json']){
 const righe=source.split('\n').filter(l=>l.includes('fs.writeFileSync(')&&l.includes("'"+nome+"'"));
 assert.strictEqual(righe.length,1,'Fotografia da mantenere solo in memoria: '+nome);
 replaceOne(righe[0],'// Fotografia '+nome+' non scritta dal test CPM.');
}
replaceOne('process.exit(errori ? 1 : 0);','ultima.close(); module.exports={S,errori,controlli,LOGICA,CHIAVE};');
const run=new Module(file,module);run.filename=file;run.paths=Module._nodeModulePaths(__dirname);run._compile(source,file);
const {S,errori,controlli,LOGICA,CHIAVE}=run.exports;
check(errori===0,'Tutti i controlli originali del caso dicembre superati con CPM attivo: '+errori+' errori');
check(S.costing.cpm.versione==='cpm-centri-v1','Marker CPM conservato fino a riapertura e gennaio');
check(S.produzione.length===2,'Solo transenna e HALB autonomo');
for(const o of S.produzione){
 const snap=o.piano.par.snapshot;
 check(snap.versione==='cpm-centri-v1'&&snap.revisione===S.costing.cpm.revisione,'Snapshot CPM salvato nell’ordine '+o.numero);
 check(snap.tariffe.Taglio===28&&snap.tariffe.Piegatura===28&&snap.tariffe.Saldatura===28,'Tariffe snapshot '+o.numero);
 check(o.eventi.filter(e=>e.tipo==='101'&&!e.stornato).length===1,'Unico versamento finale ordine '+o.numero);
 check(o.eventi.filter(e=>e.tipo==='CO11N'&&!e.stornato).reduce((n,e)=>n+e.valore,0)===(o.materiale==='TR-STD'?7140:140),'Attività consuntivate a snapshot '+o.numero);
}
const tr=S.produzione.find(o=>o.materiale==='TR-STD'),halb=S.produzione.find(o=>o.materiale==='SL-TAGLIO');
check(tr.eventi.filter(e=>e.tipo==='CO11N').map(e=>e.fase).join('/')==='Taglio/Piegatura/Saldatura','Tre conferme nominali TR sullo stesso ordine');
check(tr.piano.totale===9420&&halb.piano.totale===292,'Piani PP ai medesimi valori economici');
check(S.chiusure['2026'].utile===1814.98&&S.chiusure['2026'].riapertura,'Chiusura e riapertura completate con utile invariato');

// Reload separato della fotografia finale: una revisione del budget corrente non
// deve riscrivere i costi o le tariffe degli ordini già completati.
const {JSDOM}=require('jsdom');
const win=new JSDOM('<!doctype html><div id="lab"></div>',{url:'https://sim.local/',runScripts:'outside-only'}).window;
win.localStorage.setItem(CHIAVE,JSON.stringify(S));win.confirm=()=>true;
LOGICA.forEach(f=>win.eval(fs.readFileSync(path.join(root,f),'utf8')));win.SD4.avvia(CHIAVE);
const cp=win.PC4.cpm,n=win.SD4.N,prima=JSON.stringify(n.S.registrazioni);
const report=cp.report(2026);
check(report.centri.map(c=>c.assorbito).join('/')==='2240/1680/3360','Assorbimenti riportati dopo ricaricamento');
check(report.centri.reduce((v,c)=>v+c.assorbito,0)===7280,'Attività totali7280, non doppio costo');
check(report.centri.every(c=>c.varianzaEfficienza===0),'Varianze efficienza nulle per ore standard');
check(report.centri.every(c=>c.consuntivo===0&&c.residuo===-c.assorbito),'Nessun costo primario inventato; residui distinguibili dalle varianze efficienza');
const vecchi=n.S.produzione.map(o=>({numero:o.numero,piano:JSON.stringify(o.piano),eventi:JSON.stringify(o.eventi),eff:JSON.stringify(win.PP4.effettivi(o))}));
const m=JSON.parse(JSON.stringify(cp.modello()));m.centri.Taglio.personale=40000;
cp.salvaBudget({anno:m.anno,produttivi:m.generale.produttivi,amministrativi:m.generale.amministrativi,driver:m.generale.driver,centri:m.centri,volumi:m.volumi});
check(cp.tariffe().Taglio.tariffa!==28,'Budget corrente modificato effettivamente nella prova isolata');
for(const old of vecchi){const o=n.S.produzione.find(x=>x.numero===old.numero);
 check(JSON.stringify(o.piano)===old.piano&&JSON.stringify(o.eventi)===old.eventi,'Snapshot ed eventi pregressi immutati dopo revisione '+o.numero);
 check(JSON.stringify(win.PP4.effettivi(o))===old.eff&&cp.tariffa(o,'Taglio')===28,'Costi effettivi e tariffa storica immutati '+o.numero);
}
check(JSON.stringify(n.S.registrazioni)===prima,'Revisione budget analitica non modifica contabilità FI');win.close();

// Report applicativo sullo stato finale CPM, senza salvare la fotografia sul disco.
const python=spawnSync(process.env.PYTHON||'python3',['-c',
 "import json,sys; from app.report import Lavoro; s=json.load(sys.stdin); r=Lavoro(s).confronto('dicembre-wms'); assert len(r)==23 and all(x['ok'] for x in r),r; print('OK: report CPM finale23/23 controlli economici')"],{cwd:root,input:JSON.stringify(S),encoding:'utf8'});
check(python.status===0,'Report applicativo finale CPM: '+python.stdout+python.stderr);
process.stdout.write(python.stdout);
console.log('OK: CPM completo fino a chiusura/riapertura/gennaio: '+controlli+' controlli E2E originali + '+extra+' controlli CPM/snapshot/report. Nessun JSON condiviso sovrascritto.');
