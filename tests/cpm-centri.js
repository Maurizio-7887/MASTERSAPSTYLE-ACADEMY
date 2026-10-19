// Dati esclusivamente sintetici. Eseguire con node tests/cpm-centri.js (jsdom 24).
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), key = 'cpm-test-only';
const scripts = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js'];
let checks = 0;
function ok(c, msg) { checks++; assert.ok(c, msg); }
function near(a, b, msg) { ok(Math.abs(a - b) < .006, `${msg}: ${a} != ${b}`); }
function fresh(saved) {
  const w = new JSDOM('<!doctype html><div id="lab"></div>', {url: 'https://sim.local/', runScripts: 'outside-only'}).window;
  if (saved) w.localStorage.setItem(key, JSON.stringify(saved));
  w.confirm = () => true; scripts.forEach(f => w.eval(fs.readFileSync(path.join(root, f), 'utf8')));
  w.SD4.avvia(key); return w;
}
let w = fresh(), n = w.SD4.N, s = n.S, pc = w.PC4, cp = pc.cpm, pp = w.PP4;
n.avvia({modo: 'costituzione', data: '2026-12-01'});
function reject(fn, re, msg) { const before = JSON.stringify(s); assert.throws(fn, re); ok(JSON.stringify(s) === before, msg + ': nessuna modifica parziale'); }
ok(!cp.attivo(), 'nessuna migrazione automatica');
reject(() => cp.attiva({}), /ATTIVA/, 'attivazione esplicita');
const oldMats = JSON.stringify(s.materiali), regs = s.registrazioni.length;
cp.attiva({conferma: 'ATTIVA'});
ok(JSON.stringify(s.materiali) === oldMats && s.registrazioni.length === regs, 'attivazione non cambia materiali, saldi o FI');
const budget = () => { const m = cp.modello(); return JSON.parse(JSON.stringify({anno:m.anno,centri:m.centri,produttivi:m.generale.produttivi,amministrativi:m.generale.amministrativi,driver:m.generale.driver,volumi:m.volumi})); };
let rep = cp.report();
rep.centri.forEach(r => { near(r.tariffa, 28, r.centro + ' tariffa'); near(r.budget, 42000, 'budget'); near(r.ribaltato, 6000, 'Generale non duplicato'); });
ok(cp.modello().volumi['TR-STD'] === 1200, 'volume annuale distinto ordine');
near(rep.centri[0].oreRichieste, 300, 'Taglio annuo'); near(rep.centri[1].oreRichieste, 240, 'Piega annua'); near(rep.centri[2].oreRichieste, 480, 'Saldatura annua');
near(pc.elementi('TR-STD', 300).totale, 9420, 'costo 300×31,40');
reject(() => pp.ordine({materiale:'TR-STD',qta:300,data:'2026-12-01'}), /ricalcola/, 'rilascio CPM necessario');
['TR-STD','SL-TAGLIO'].forEach(materiale => pc.calcola({materiale,data:'2026-12-01'})); pc.marca({});
reject(() => pc.rilascia({data:'2026-12-01'}), /SOSTITUISCI/, 'bootstrap non sostituito implicitamente');
pc.rilascia({data:'2026-12-01',sostituisciBootstrap:'SOSTITUISCI'});
ok(s.costing.rilasci.some(r => r.costituzione && r.sostituitoCPM), 'bootstrap conservato e marcato sostituito');
ok(s.costing.rilasci.filter(r=>r.cpm).length===2, 'primo rilascio CPM multi-materiale');
near(s.materiali['TR-STD'].std,31.40,'standard rilasciato compatibile');
const fiBefore = s.registrazioni.length;
let b = budget(); b.centri.Taglio.orePiano = 0; reject(()=>cp.salvaBudget(b), /ore tariffa/, 'denominatore zero');
b = budget(); b.driver='percentuali'; b.centri.Taglio.percentuale=40; reject(()=>cp.salvaBudget(b), /100%/, 'percentuali incoerenti');
reject(()=>cp.salvaStandard({materiale:'TR-STD',componente:'TR-STD',quantita:1,ore:{Taglio:.25},attrezzaggio:0,centroSet:'Taglio'}), /Ciclo|autoreferenziale/, 'distinta ciclica');
reject(()=>cp.salvaStandard({materiale:'TR-STD',componente:'FERRO',quantita:8,ore:{Taglio:-1},attrezzaggio:0,centroSet:'Taglio'}), /non negativo/, 'tempo negativo');
reject(()=>cp.salvaStandard({materiale:'TR-STD',componente:'FERRO',quantita:'NaN',ore:{Taglio:.25},attrezzaggio:0,centroSet:'Taglio'}), /numerico/, 'quantità non finita');
n.movimento('FERRO',4000,'2026-12-02','561','TEST');
pp.ordine({materiale:'TR-STD',qta:300,data:'2026-12-03'}); const o=s.produzione[0], frozen=JSON.stringify(o.piano);
ok(o.fasi.join('/')==='Taglio/Piegatura/Saldatura', 'tre operazioni stesso ordine');
pp.prelievo({ordine:o.numero,kg:2400,data:'2026-12-03'});
reject(()=>pp.conferma({ordine:o.numero,fase:'Piegatura',ore:60,data:'2026-12-03'}), /precedente/, 'sequenza operazioni');
pp.conferma({ordine:o.numero,fase:'Taglio',ore:75,data:'2026-12-04'});
near(pp.wip(o).valore,4380,'WIP dopo taglio');
// Cambiare budget, tariffe, distinta e scheda non modifica l’ordine già avviato.
b=budget(); b.centri.Piegatura.personale=51000; b.amministrativi=12000; cp.salvaBudget(b);
cp.salvaStandard({materiale:'TR-STD',componente:'FERRO',quantita:9,ore:{Taglio:.5,Piegatura:.3,Saldatura:.4},attrezzaggio:0,centroSet:'Taglio'});
pc.scheda({sovrMat:20,sovrProd:30,tariffa:999,lotto:100});
ok(JSON.stringify(o.piano)===frozen && o.componente.q===8,'snapshot ordine e distinta immutati');
pp.conferma({ordine:o.numero,fase:'Piegatura',ore:60,data:'2026-12-05'});
near(o.eventi.at(-1).tariffa,28,'conferma usa vecchia tariffa centro');
near(pp.wip(o).valore,6060,'WIP dopo piega');
pp.conferma({ordine:o.numero,fase:'Saldatura',ore:120,data:'2026-12-06'});
ok(s.giacenze['TR-STD']===0 && s.movimenti.length===2,'nessun carico intermedio');
pp.entrata({ordine:o.numero,data:'2026-12-06'});
near(pp.effettivi(o).totale,9420,'costi standard originari'); near(pp.effettivi(o).sovrDovuti.prod,0,'nessun overhead duplicato');
near(pc.varianze(o).totale,0,'varianza zero col vecchio snapshot');
near(pc.varianze(o).piano.kg,2400,'varianze usano distinta snapshot');
reject(()=>pp.ordine({materiale:'TR-STD',qta:300,data:'2026-12-07'}), /ricalcola/, 'nuovo ordine richiede nuovo standard');
// Primari analitici: non crea mai nuove scritture o debiti FI, evita duplicati di fonte.
const primaCons = s.registrazioni.length;
for (const centro of cp.centri) cp.consuntivo({data:'2026-12-31',riferimento:'FI-PAY-'+centro,centro,natura:'personale',importo:36000});
cp.consuntivo({data:'2026-12-31',riferimento:'FI-GEN',centro:'Generale',natura:'produttivi',importo:18000});
cp.consuntivo({data:'2026-12-31',riferimento:'FI-ADM',centro:'Generale',natura:'amministrativi',importo:12000});
reject(()=>cp.consuntivo({data:'2026-12-31',riferimento:'FI-GEN',centro:'Generale',natura:'produttivi',importo:18000}), /già rilevata/, 'fonte duplicata');
ok(s.registrazioni.length===primaCons,'nessuna contabilizzazione primaria duplicata');
rep=cp.report(); near(rep.centri.reduce((t,r)=>t+r.assorbito,0),7140,'attività assorbite 7140, non costi primari aggiuntivi');
rep.centri.forEach(r=>near(r.residuo,r.varianzaSpesa+r.varianzaAssorbimento,'identità residuo'));
near(rep.generale.amministrativi,12000,'amministrativi esclusi'); near(rep.centri[0].consuntivo,42000,'primari più ribaltamento senza raddoppio');
near(rep.prodotti[0].finiti,300,'consuntivo volume'); near(rep.prodotti[0].varianzaVolume,-900,'varianza volume annuale');
// Percentuali esplicite e saturazione.
b=budget(); b.driver='percentuali'; b.centri.Taglio.percentuale=50;b.centri.Piegatura.percentuale=30;b.centri.Saldatura.percentuale=20;b.volumi['TR-STD']=10000; cp.salvaBudget(b);
near(cp.tariffe().Taglio.ribaltato,9000,'driver %'); ok(cp.report().centri[0].saturazione>100,'sovraccarico segnalato');
// UI: modulo reale, cambio materiale, salvataggio budget e render prodotto.
w.LAB_PAGINA={chiave:key,pagina:'scheda'}; w.eval(fs.readFileSync(path.join(root,'app/blueprints/erp_costi/static/copc-pagine.js'),'utf8'));
ok(w.document.querySelector('#cpm-budget-Taglio_orePiano'),'campi budget renderizzati');
const sel=w.document.querySelector('#cpm-materiale'); sel.value='SL-TAGLIO'; sel.dispatchEvent(new w.Event('change'));
ok(w.document.querySelector('#cpm-standard-materiale').value==='SL-TAGLIO','cambio materiale');
ok(w.document.body.textContent.includes('Residuo'),'report visibile');
w.document.querySelector('#cpm-budget-vol_TR-STD').value='1300';
w.document.querySelector('[data-prefisso="cpm-budget"] [data-azione="budget"]').click();
ok(cp.modello().volumi['TR-STD']===1300,'salvataggio budget dal pulsante reale');
w.document.querySelector('#cpm-standard-quantita').value='7,5';
w.document.querySelector('[data-prefisso="cpm-standard"] [data-azione="standard"]').click();
near(cp.modello().standard['SL-TAGLIO'].componente.q,7.5,'salvataggio distinta dal pulsante reale: '+w.document.querySelector('#cpm-standard-esito').textContent);
// Persistenza/reload conserva versione e snapshot ordine.
n.salva(); const saved=JSON.parse(w.localStorage.getItem(key)); w.close(); w=fresh(saved); n=w.SD4.N;s=n.S;pc=w.PC4;cp=pc.cpm;pp=w.PP4;
ok(cp.attivo()&&s.produzione[0].piano.par.snapshot.tariffe.Piegatura===28,'reload snapshot');
// Legacy pre-snapshot: non interpretato come CPM; standard/piani/FI restano identici.
w.close(); const legacy=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/dicembre-wms-legacy.json'),'utf8'));
w=fresh(legacy); n=w.SD4.N;s=n.S;pc=w.PC4;cp=pc.cpm;
ok(!cp.attivo(),'fixture storica resta legacy'); const hist=JSON.stringify(s.produzione); cp.attiva({conferma:'ATTIVA'});
ok(JSON.stringify(s.produzione)===hist,'attivazione non migra ordini storici');
ok(cp.report().esclusiLegacy===s.produzione.length,'report esclude legacy');
pc.calcola({materiale:'TR-STD',data:'2026-12-01'});pc.marca({materiale:'TR-STD'});
reject(()=>pc.rilascia({data:'2026-12-01',sostituisciBootstrap:'SOSTITUISCI'}), /già rilasciato|movimenti/, 'nessuna sostituzione bootstrap su storico con movimenti');
w.close(); w=fresh(); n=w.SD4.N;s=n.S;pc=w.PC4;cp=pc.cpm;pp=w.PP4;
n.avvia({modo:'costituzione',data:'2026-12-01'});cp.attiva({conferma:'ATTIVA'});
b=budget();b.centri.Piegatura.personale=51000;cp.salvaBudget(b);
near(cp.tariffe().Piegatura.tariffa,38,'tariffa Piegatura distinta');
near(pc.elementi('TR-STD',300).totale,10020,'costing per centro');
['TR-STD','SL-TAGLIO'].forEach(materiale=>pc.calcola({materiale,data:'2026-12-01'}));pc.marca({});pc.rilascia({data:'2026-12-01',sostituisciBootstrap:'SOSTITUISCI'});
pc.calcola({materiale:'TR-STD',data:'2026-12-01'});pc.marca({materiale:'TR-STD'});
reject(()=>pc.rilascia({data:'2026-12-01',sostituisciBootstrap:'SOSTITUISCI'}), /già rilasciato/, 'deroga bootstrap non ripetibile');
// Ripristina FR per proseguire senza tentare un secondo rilascio.
s.costing.stime['TR-STD'].stato='FR';
n.movimento('FERRO',3000,'2026-12-02','561','TEST');pp.ordine({materiale:'TR-STD',qta:300,data:'2026-12-03'});
const distinto=s.produzione[0];pp.prelievo({ordine:distinto.numero,kg:2400,data:'2026-12-03'});
for(const [fase,ore] of [['Taglio',75],['Piegatura',60],['Saldatura',120]]) pp.conferma({ordine:distinto.numero,fase,ore,data:'2026-12-04'});
near(distinto.eventi.find(e=>e.fase==='Piegatura').valore,2280,'conferma centro 60×38');
pp.entrata({ordine:distinto.numero,data:'2026-12-04'});near(pc.varianze(distinto).totale,0,'varianza zero con tariffe distinte');
pp.ordine({materiale:'SL-TAGLIO',qta:20,data:'2026-12-05'}); const kit=s.produzione[1];
pp.prelievo({ordine:kit.numero,kg:160,data:'2026-12-05'});pp.conferma({ordine:kit.numero,fase:'Taglio',ore:5,data:'2026-12-05'});pp.entrata({ordine:kit.numero,data:'2026-12-05'});
near(s.giacenze['SL-TAGLIO'],20,'semilavorato autonomo a scorta');near(w.PP4.effettivi(kit).totale,292,'costo kit');
ok(distinto.eventi.filter(e=>e.tipo==='261').every(e=>e.mat==='FERRO'),'transenna non consuma kit autonomo');
rep=cp.report();rep.centri.forEach(r=>near(r.varianzaEfficienza,0,'efficienza per centro'));
// Budget tutto zero: anche una tariffa zero è valida, senza fallback spurio a 28.
b=budget();b.produttivi=0;for(const k of cp.centri){b.centri[k].personale=0;b.centri[k].indiretti=0;}cp.salvaBudget(b);
cp.salvaStandard({materiale:'TR-STD',componente:'FERRO',quantita:8,ore:{Taglio:.25,Piegatura:.2,Saldatura:.4},attrezzaggio:3,centroSet:'Taglio'});
near(pc.elementi('TR-STD',100).set,0,'setup a tariffa zero');
w.close(); console.log('✓ CPM centri, budget, costing, snapshot, conferme, report e legacy: '+checks+' controlli');
