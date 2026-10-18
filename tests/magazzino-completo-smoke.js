/* Local-only JSDOM regression. Reads repository; writes only its own report.
 * node magazzino-smoke.js [source=/tmp/academy-wip] [dependencies=/tmp/academy-completo]
 * Reuses the exact tests/s4.js page harness, NOT its business scenarios or writes.
 */
const fs = require('fs'), path = require('path'), {createRequire} = require('module');
const repo = process.argv[2] || path.resolve(__dirname,'..');
const localRequire = createRequire(path.join(process.argv[3] || repo, 'package.json'));
const harness = fs.readFileSync(path.join(repo, 'tests/s4.js'), 'utf8').split('// avvio, condizioni')[0];
const scenario = String.raw`
const evidenze = [];
const check = (c, m) => { evidenze.push({ok:!!c, controllo:m}); ok(c,m); if(!c) throw Error(m); };
const act = (p,f,v,a) => { const before=JSON.stringify(p.S()),r=p.fai(f,v,a); check(/lab-esito ok/.test(r)||(!r&&before!==JSON.stringify(p.S())), f+': '+r.slice(0,180)); return p; };
const restore = s => {memoria=s;ultima=null;};
const snap = () => {if(ultima)memoria=ultima.localStorage.getItem(CHIAVE);return memoria;};
const rfAll = (data='2027-01-03') => {for(let k=0;k<100;k++) {let p=apri('erp_magazzino','rf'),t=p.w.WM4.aperti()[0];if(!t)return p;
 p.lab.querySelector('#rf-data').value=data;
 for(const [id,v] of [['rf-da',t.da],['rf-udc',t.udc],['rf-a',t.a]])p.lab.querySelector('#'+id).value=v;
 p.lab.querySelector('#rf-ok').click();check(p.S().wm.compiti.find(x=>x.numero===t.numero).stato==='confermato','RF '+t.tipo+' '+t.qta+' '+t.mat+' '+t.da+' → '+t.a);
}throw Error('RF loop');};
const order = (m,q,c='C100',date='2027-01-03') => {let p=apri('erp_vendite','ordini');act(p,'va',{cliente:c,materiale:m,qta:String(q),rif:'TEST FORMAS',data:date});return p.S().ordini.slice(-1)[0].numero;};
const delivery = (o,date='2027-01-03') => {let p=apri('erp_vendite','consegne');act(p,'vl',{ordine:o,data:date});return p.S().consegne.slice(-1)[0].numero;};
try {
let p=apri('erp_dati','avvio');act(p,'av',{data:'2027-01-01'});
p=apri('erp_magazzino','struttura');act(p,'at',{data:'2027-01-01'});
p=apri('erp_acquisti','ordini');act(p,'me',{fornitore:'F100',materiale:'FERRO',qta:'1000',prezzo:'1,10',data:'2027-01-02'});const oa=p.S().acquisti.slice(-1)[0].numero;
p=apri('erp_acquisti','entrate');act(p,'mi',{ordine:oa,qta:'1000',ddt:'TEST-FORMAS-001',lotto:'FORMAS-COL-01',danneggiati:'0',data:'2027-01-02'});
p=rfAll('2027-01-02');check(p.S().giacenze.FERRO===1000,'B1 FERRO1000');check(p.w.WM4.quadratura().every(x=>x.ok),'B1 quadratura');
const baseline=snap();
const empty=Object.entries(p.S().wm.ubicazioni).filter(([id,u])=>['001','002'].includes(u.tipo)&&!p.w.WM4.inUbic(id).length).length;
check(empty===15,'B1 ubicazioni vuote15 (36 posizioni,21 occupate)');
evidenze.push({layout:p.w.WM4.quanti().filter(q=>q.mat==='TR-ALTA').map(q=>({ubic:q.ubic,udc:q.udc,qta:q.qta}))});
// I−: exact page inputs, desk recount and integrated financial posting.
p=apri('erp_inventario','documenti');act(p,'in',{tipo:'ubicazioni',selezione:'01-01-1',tolleranza:'20',data:'2027-01-03'});act(p,'ia',{data:'2027-01-03'});
act(p,'ic',{r0:'49',contatore:'TEST-A'});check(p.S().wm.inventari[0].stato==='riconta','I− richiede riconta');act(p,'ic',{r0:'49',contatore:'TEST-B'});act(p,'ix',{data:'2027-01-03'});
check(p.w.WM4.inUbic('DIFF')[0].qta===1,'I− DIFF+1 prima LI21');p=apri('erp_inventario','differenze');act(p,'rg',{data:'2027-01-03'});check(p.S().giacenze['TR-STD']===499,'I− STD499');check(p.w.WM4.quadratura().every(x=>x.ok&&x.diff999===0),'I− quadratura finale');
// IV: all empty bins via RF; 2 found TR-PED and independent recount.
restore(baseline);p=apri('erp_inventario','documenti');act(p,'in',{tipo:'vuota',selezione:'',tolleranza:'20',data:'2027-01-03'});act(p,'ia',{data:'2027-01-03'});
const rows=p.S().wm.inventari[0].righe;
function rfCount(ubic,q,materiale){let p=apri('erp_magazzino','rf');p.lab.querySelector('[data-s="inventario"]').click();let el=p.lab.querySelector('#rf-inv');el.value=ubic;el.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const r=p.S().wm.inventari[0].righe.findIndex(r=>r.ubic===ubic);p.lab.querySelector('#rf-c'+r).value=String(q);let m=p.lab.querySelector('#rf-m'+r);if(m)m.value=materiale||'';p.lab.querySelector('#rf-conta').click();check(/lab-esito ok/.test(p.lab.querySelector('#rf-ce').outerHTML),'RF conta '+ubic+'='+q);return p;}
p=rfCount('03-05-2',2,'TR-PED');
p=apri('erp_inventario','documenti');const counts={contatore:'TEST-A'};rows.forEach((r,k)=>counts['r'+k]=r.ubic==='03-05-2'?'2':'0');act(p,'ic',counts);
check(p.S().wm.inventari[0].stato==='riconta','IV riconta dopo tutte le prime conte');const kfound=rows.findIndex(r=>r.ubic==='03-05-2');act(p,'ic',{['r'+kfound]:'2',contatore:'TEST-B'});act(p,'ix',{data:'2027-01-03'});p=apri('erp_inventario','differenze');act(p,'rg',{data:'2027-01-03'});check(p.S().giacenze['TR-PED']===302,'IV PED302');
// S: three loading methods, then 601.
restore(baseline);let c=delivery(order('TR-STD',60));p=rfAll();p=apri('erp_spedizione','imballo');act(p,'im',{consegna:c,imballo:'EUR',perCollo:'20',data:'2027-01-03'});
p=apri('erp_spedizione','trasporti');act(p,'vt',{consegne:c,vettore:'V10',targa:'TEST001',autista:'TEST',porto:'franco',data:'2027-01-03'});let tr=p.w.SP4.SP().trasporti.slice(-1)[0].numero, col=p.w.SP4.colliDi(c);
check(col.length===3,'S tre colli');act(p,'ca',{sscc:col[0].sscc,data:'2027-01-03'});
p=apri('erp_magazzino','rf');p.lab.querySelector('[data-s="carico"]').click();p.lab.querySelector('#rf-data').value='2027-01-03';let inp=p.lab.querySelector('#rf-sscc');inp.value=col[1].sscc;inp.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));check(p.w.SP4.colliDi(c).filter(x=>x.caricato).length===2,'S carico RF2/3');
p=apri('erp_innovazione','rfid');act(p,'rf',{trasporto:tr,data:'2027-01-03'});p=apri('erp_spedizione','trasporti');act(p,'pt',{trasporto:tr,data:'2027-01-04'});check(p.S().giacenze['TR-STD']===440,'S STD440 dopo601');
// O: two deliveries waiting, release wave.
restore(baseline);p=apri('erp_innovazione','ondate');act(p,'mo',{ondate:'si',crossDock:'no'});delivery(order('TR-STD',40,'C200'));delivery(order('TR-PED',20,'C300'));p=apri('erp_innovazione','ondate');check(p.w.WM4.aperti().length===0,'O nessun PICK prima rilascio');act(p,'on',{data:'2027-01-03'});p=rfAll();check(p.S().wm.compiti.filter(x=>x.tipo==='PICK'&&x.stato==='confermato').length===2,'O due PICK confermati');
// L: deliberately distant ALTA, exact proposed transfers.
restore(baseline);p=apri('erp_magazzino','compiti');let alt=p.w.WM4.quanti().find(q=>q.mat==='TR-ALTA');act(p,'tr',{udc:alt.udc,a:'03-05-2',motivo:'TEST slotting',data:'2027-01-03'});rfAll();p=apri('erp_innovazione','slotting');evidenze.push({slottingProposta:p.w.IN4.propostaSlotting()});act(p,'sl',{data:'2027-01-03'});p=rfAll();check(p.w.WM4.quadratura().every(x=>x.ok),'L quadratura finale');
// C: ordinary production creates GR stock; delivery replaces PUTAWAY.
restore(baseline);p=apri('erp_innovazione','ondate');act(p,'mo',{ondate:'no',crossDock:'si'});
p=apri('erp_costi','scheda');act(p,'sk',{sovrMat:'0',sovrProd:'0',tariffa:'28',lotto:'100'});p=apri('erp_costi','calcolo');act(p,'ck',{materiale:'TR-STD',data:'2027-02-01'});act(p,'cr',{data:'2027-02-01'},'marca');act(p,'cr',{data:'2027-02-01'});check(p.S().materiali['TR-STD'].std===32.24,'C standard rilasciato32,24');
p=apri('erp_produzione','ordini');act(p,'co',{materiale:'TR-STD',qta:'10',data:'2027-02-01'});let op=p.S().produzione.slice(-1)[0].numero;
p=apri('erp_magazzino','compiti');act(p,'sg',{ordine:op,kg:'80',data:'2027-02-01'});rfAll('2027-02-01');p=apri('erp_produzione','avanzamento');act(p,'pr',{ordine:op,kg:'80',data:'2027-02-01'});act(p,'cf',{ordine:op,attrezzaggio:'3',ore:'8,5',data:'2027-02-01'});act(p,'en',{ordine:op,qta:'10',data:'2027-02-01'});
c=delivery(order('TR-STD',10,'C100','2027-02-01'),'2027-02-01');p=apri('erp_magazzino','compiti');check(p.w.WM4.aperti().some(t=>t.crossDock&&t.da==='GR-ZONE'&&t.qta===10),'C PICK10 crossdock daGR');p=rfAll('2027-02-01');check(p.w.WM4.quadratura().every(x=>x.ok),'C quadratura dopo PICK');
// LT15: a second receipt, cancel/recreate its PUTAWAY, then confirm.
restore(baseline);p=apri('erp_acquisti','ordini');act(p,'me',{fornitore:'F100',materiale:'FERRO',qta:'1000',prezzo:'1,10',data:'2027-01-03'});let oa2=p.S().acquisti.slice(-1)[0].numero;
p=apri('erp_acquisti','entrate');act(p,'mi',{ordine:oa2,qta:'1000',ddt:'TEST-LT002',lotto:'FORMAS-LT02',danneggiati:'0',data:'2027-01-03'});let old=p.w.WM4.aperti()[0];
p=apri('erp_fi','storni');act(p,'lt',{compito:old.numero,motivo:'TEST ubicazione inaccessibile'});let next=p.w.WM4.aperti()[0];check(p.S().wm.compiti.find(t=>t.numero===old.numero).stato==='annullato','LT15 originale annullato');check(next.numero!==old.numero&&next.a!==old.a&&next.qta===1000,'LT15 nuovo PUTAWAY altra destinazione '+next.a);p=rfAll();check(p.S().giacenze.FERRO===2000&&p.w.WM4.quadratura().every(x=>x.ok),'LT15 FERRO2000 quadratura');
// pg: direct goods issue alternative, deliberately without transport/DDT.
restore(baseline);c=delivery(order('TR-STD',10));rfAll();p=apri('erp_vendite','consegne');act(p,'pg',{consegna:c,data:'2027-01-04'});check(p.S().giacenze['TR-STD']===490,'PG diretto STD490');p=apri('erp_spedizione','monitor');check(p.S().consegne.find(x=>x.numero===c).pgi==='2027-01-04','PG monitor uscita data');check(!p.w.SP4.SP().trasporti.length&&!p.w.SP4.colliDi(c).length,'PG nessun collo/trasporto');
// Q/R: full quarantine/unblock, then separate two-piece scrapping.
restore(baseline);p=apri('erp_magazzino','bloccato');let ped=p.w.WM4.quanti().find(q=>q.mat==='TR-PED');act(p,'bl',{udc:ped.udc,qta:'',motivo:'TEST controllo',data:'2027-01-03'});rfAll();p=apri('erp_magazzino','bloccato');check(p.w.WM4.bloccato('TR-PED')===50,'Q bloccato50');act(p,'dq',{udc:ped.udc,motivo:'TEST integra',data:'2027-01-03'},'sb');p=rfAll();check(p.w.WM4.bloccato('TR-PED')===0&&p.S().giacenze['TR-PED']===300,'Q libero300 dopo343');
restore(baseline);p=apri('erp_magazzino','bloccato');ped=p.w.WM4.quanti().find(q=>q.mat==='TR-PED');act(p,'bl',{udc:ped.udc,qta:'2',motivo:'TEST danno',data:'2027-01-03'});rfAll();p=apri('erp_magazzino','bloccato');let damaged=p.w.WM4.bloccati()[0];act(p,'dq',{udc:damaged.udc,motivo:'TEST rottame',data:'2027-01-03'},'ro');check(p.S().giacenze['TR-PED']===298&&p.w.WM4.quadratura().every(x=>x.ok),'R PED298 dopo555');
} catch(e) {evidenze.push({fatal:e.stack});errori++;}
fs.writeFileSync(OUTPUT,JSON.stringify({tipo:'JSDOM pagine reali, nessun browser/server/servizio esterno',controlli,errori,evidenze},null,2));
console.log(JSON.stringify({controlli,errori,report:OUTPUT}));process.exitCode=errori?1:0;
`;
new Function('require','__dirname','OUTPUT', harness + scenario)(localRequire,path.join(repo,'tests'),path.join(__dirname,'magazzino-smoke-results.json'));
