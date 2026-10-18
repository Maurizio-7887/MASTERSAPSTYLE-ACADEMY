// WIP analitico: ciclo a operazioni, versamenti, storni e compatibilità dello stato.
const fs=require('fs'),path=require('path'),assert=require('assert'),{JSDOM}=require('jsdom');
const LOGICA=['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js', 'app/blueprints/erp_cespiti/static/ce-logica.js', 'app/blueprints/erp_tesoreria/static/rb-logica.js', 'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/static/js/erp/ruoli.js'];
const key='wip-test-only';let checks=0;
function check(c,m){checks++;assert.ok(c,m);}
function fresh(saved){
 const w=new JSDOM('<!doctype html><div id="lab"></div>',{url:'https://sim.local/',runScripts:'outside-only'}).window;
 if(saved)w.localStorage.setItem(key,JSON.stringify(saved));
 w.confirm=()=>true;
 LOGICA.forEach(f=>w.eval(fs.readFileSync(path.join(__dirname,'..',f),'utf8')));
 w.SD4.avvia(key);return w;
}
let w=fresh(),n=w.SD4.N,s=n.S,pp=w.PP4;
n.avvia({modo:'costituzione',data:'2026-12-01'});
check(s.produzioneModello==='wip-fasi-v1','marcatore solo nuova costituzione');
check(!s.materiali['SL-PIEGA']&&s.materiali['SL-TAGLIO'].tipo==='HALB','un semilavorato autonomo, non una fase obbligatoria');
check(s.materiali['TR-STD'].std===31.40&&s.materiali['SL-TAGLIO'].std===14.60,'standard coerenti');
n.movimento('FERRO',3000,'2026-12-02','561','TEST');
pp.ordine({materiale:'TR-STD',qta:300,data:'2026-12-03'});
const o=s.produzione[0];
check(o.fasi.join('/')==='Taglio/Piegatura/Saldatura'&&o.componente.mat==='FERRO','ordine unico con snapshot ciclo e componente ferro');
function reject(fn,re,m){const before=JSON.stringify(s);assert.throws(fn,re);check(JSON.stringify(s)===before,m+' senza effetti parziali');}
reject(()=>pp.conferma({ordine:o.numero,fase:'Taglio',ore:75,data:'2026-12-03'}),/Preleva/,'nessuna fase senza materiale');
pp.prelievo({ordine:o.numero,kg:2400,data:'2026-12-03'});
check(pp.wip(o).valore===2280,'WIP iniziale solo materia');
reject(()=>pp.entrata({ordine:o.numero,data:'2026-12-03'}),/Completa/,'blocco 101 prematuro');
reject(()=>pp.conferma({ordine:o.numero,ore:75,data:'2026-12-03'}),/Seleziona/,'fase richiesta');
reject(()=>pp.conferma({ordine:o.numero,fase:'Piegatura',ore:60,data:'2026-12-03'}),/precedente/,'sequenza fasi');
pp.conferma({ordine:o.numero,fase:'Taglio',ore:75,data:'2026-12-04'});
check(pp.wip(o).valore===4380&&pp.faseQta(o,'Taglio')===300,'taglio 4380 senza scorta');
check(s.giacenze['TR-STD']===0&&s.giacenze['SL-TAGLIO']===0&&s.movimenti.length===2,'nessun movimento per conferma');
reject(()=>pp.conferma({ordine:o.numero,fase:'Piegatura',ore:60,data:'2026-12-03'}),/data/,'nessuna retrodatazione');
pp.conferma({ordine:o.numero,fase:'Piegatura',ore:60,data:'2026-12-05'});
check(pp.wip(o).valore===6060,'piegatura cumulata stesso ordine');
const nregs=s.registrazioni.length;
reject(()=>w.PC4.liquida({data:'2026-12-05'}),/Nessun ordine/,'ordine incompleto non liquidabile');
reject(()=>pp.entrata({ordine:o.numero,data:'2026-12-05'}),/Completa/,'taglio e piega non diventano finito');
pp.conferma({ordine:o.numero,fase:'Saldatura',qta:150,ore:60,data:'2026-12-06'});
pp.entrata({ordine:o.numero,qta:150,data:'2026-12-06'});
check(s.giacenze['TR-STD']===150&&pp.wip(o).inCorso,'versamento parziale solo pezzi finiti');
reject(()=>pp.entrata({ordine:o.numero,qta:151,data:'2026-12-06'}),/Restano/,'no sovraversamento');
reject(()=>pp.entrata({ordine:o.numero,qta:150,data:'2026-12-06'}),/Completa/,'altri pezzi non ancora saldati');
pp.conferma({ordine:o.numero,fase:'Saldatura',qta:150,ore:60,data:'2026-12-06'});
check(pp.stato(o)==='CNF','tre operazioni confermate, prima del versamento completo');
pp.entrata({ordine:o.numero,qta:150,data:'2026-12-06'});
check(pp.effettivi(o).totale===9420&&pp.wip(o).valore===0&&pp.stato(o)==='DLV','saldo finale e WIP zero');
// Storni a ritroso: ricostituiscono il saldo senza inventare scorte intermedie.
reject(()=>w.ST4.produzione({ordine:o.numero,evento:1,data:'2026-12-07'}),/Storna prima/,'blocco storno taglio con fasi successive');
let ix=o.eventi.map(e=>e.tipo).lastIndexOf('101');
w.ST4.produzione({ordine:o.numero,evento:ix,data:'2026-12-07'});
check(pp.wip(o).valore===4710&&s.giacenze['TR-STD']===150,'102 ripristina saldo in corso');
ix=o.eventi.findIndex(e=>e.tipo==='101'&&!e.stornato);
w.ST4.produzione({ordine:o.numero,evento:ix,data:'2026-12-07'});
const sald=o.eventi.map((e,i)=>({e,i})).filter(x=>x.e.fase==='Saldatura');
const secondDoc=sald[1].e.contabile;
w.ST4.produzione({ordine:o.numero,evento:sald[1].i,data:'2026-12-07'});
check(!!s.registrazioni.find(r=>r.numero===secondDoc).stornato,'storno esatto anche due conferme stesso importo/data');
check(!s.registrazioni.find(r=>r.numero===sald[0].e.contabile).stornato,'prima conferma omonima preservata');
check(pp.faseQta(o,'Saldatura')===150&&pp.wip(o).valore===7740,'CO13 riduce pezzi e costo analitico');
// Riapertura del salvataggio: il ciclo e le tre dichiarazioni restano sul medesimo ordine.
n.salva();const saved=JSON.parse(w.localStorage.getItem(key));w.close();w=fresh(saved);pp=w.PP4;n=w.SD4.N;s=n.S;
check(s.produzione.length===1&&s.produzione[0].fasi.length===3,'persistenza ciclo unico');
pp.ordine({materiale:'SL-TAGLIO',qta:20,data:'2026-12-08'});const semi=s.produzione[1];
pp.prelievo({ordine:semi.numero,kg:160,data:'2026-12-08'});
pp.conferma({ordine:semi.numero,ore:5,data:'2026-12-08'});
pp.entrata({ordine:semi.numero,data:'2026-12-08'});
check(s.giacenze['SL-TAGLIO']===20&&n.saldo('07')===292,'HALB indipendente valorizzato in magazzino');
check(s.produzione[0].eventi.filter(e=>e.tipo==='261').every(e=>e.mat==='FERRO'),'transenna non consuma il lotto autonomo');
// Guida: nuova e storica selezionate in base alla versione dei dati, non sostituzione del lavoro.
function guida(w){for(const f of ['dicembre-wms-legacy','dicembre-wms'])w.eval(fs.readFileSync(path.join(__dirname,'../app/blueprints/guida/static/esercizi/'+f+'.js'),'utf8'));}
guida(w);check(w.MSA_ESERCIZIO.passi.some(p=>/WIP/i.test(p.titolo)),'guida nuova contiene il percorso WIP');
w.close();const legacy=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/dicembre-wms-legacy.json'),'utf8'));
w=fresh(legacy);const before=JSON.stringify(w.SD4.N.S);guida(w);
check(w.MSA_ESERCIZIO===w.MSA_ESERCIZIO_DICEMBRE_LEGACY,'guida storica per esercizi già iniziati');
check(JSON.stringify(w.SD4.N.S)===before,'nessuna migrazione dei salvataggi storici');
w.close();console.log('✓ WIP a operazioni, semilavorato autonomo, storni e compatibilità: '+checks+' controlli');
