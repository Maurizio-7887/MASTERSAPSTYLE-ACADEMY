/* Real fixed-copy RF page regression, no in-memory patch and no repo writes.
 * node magazzino-rf-regression.js [repo=/tmp/academy-completo] [dependencies=same]
 */
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{createRequire}=require('module');
const repo=process.argv[2]||path.resolve(__dirname,'..'),req=createRequire(path.join(process.argv[3]||repo,'package.json'));
const source=fs.readFileSync(path.join(repo,'app/blueprints/erp_magazzino/static/wm-pagine.js'),'utf8');
const harness=fs.readFileSync(path.join(repo,'tests/s4.js'),'utf8').split('// avvio, condizioni')[0];
const scenario=String.raw`
const evidenze=[];
const check=(c,m)=>{evidenze.push({ok:!!c,controllo:m});ok(c,m);if(!c)throw Error(m);};
const act=(p,f,v)=>{const before=JSON.stringify(p.S()),r=p.fai(f,v);check(/lab-esito ok/.test(r)||(!r&&before!==JSON.stringify(p.S())),f+': '+r.slice(0,180));return p;};
const saldo=(s,c)=>s.registrazioni.reduce((t,r)=>t+r.righe.filter(x=>x.conto===c).reduce((u,x)=>u+(x.dareAvere==='DARE'?x.importo:-x.importo),0),0);
function seed(){memoria=null;ultima=null;let p=apri('erp_dati','avvio');act(p,'av',{data:'2027-01-01'});p=apri('erp_magazzino','struttura');act(p,'at',{data:'2027-01-01'});return p;}
function inventory(bins){let p=apri('erp_inventario','documenti');act(p,'in',{tipo:'ubicazioni',selezione:bins.join(','),tolleranza:'20',data:'2027-01-03'});act(p,'ia',{data:'2027-01-03'});return p;}
function count(ubic,q,materiale){let p=apri('erp_magazzino','rf');p.lab.querySelector('[data-s="inventario"]').click();p.lab.querySelector('#rf-ris').value='MAG02 Sara';p.lab.querySelector('#rf-data').value='2027-01-03';const inp=p.lab.querySelector('#rf-inv');inp.value=ubic;inp.dispatchEvent(new p.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));const k=p.S().wm.inventari[0].righe.findIndex(r=>r.ubic===ubic),qty=p.lab.querySelector('#rf-c'+k);check(!!qty,'RF trova campo conta '+ubic);qty.value=String(q);const m=p.lab.querySelector('#rf-m'+k);if(m)m.value=materiale||'';p.lab.querySelector('#rf-conta').click();const e=p.lab.querySelector('#rf-ce');check(e.className.includes('ok'),'RF '+ubic+'='+q+' verde: '+e.textContent);const d=p.S().wm.inventari[0],persisted=JSON.parse(p.w.localStorage.getItem(CHIAVE)).wm.inventari[0];check(d.stato===persisted.stato,'Stato salvato '+d.stato);evidenze.push({ubicazione:ubic,quantita:q,stato:d.stato,messaggio:e.textContent,righe:d.righe.map(r=>({ubic:r.ubic,conta1:r.conta1,conta2:r.conta2,riconta:r.riconta}))});return p;}
try {
check(!SOURCE.includes('if (!manca) t = IV.conta({numero: d.numero, contatore: val.contatore});'),'Copia completa senza chiamata duplicata IV.conta');
// Case A: final no-difference count succeeds immediately, LI20 closes without LI21.
seed();inventory(['01-01-1']);let p=count('01-01-1',50);check(p.S().wm.inventari[0].stato==='contato','A ultima conta senza differenza → contato');p=apri('erp_inventario','documenti');act(p,'ix',{data:'2027-01-03'});check(p.S().wm.inventari[0].stato==='chiuso','A LI20 chiuso');check(p.w.WM4.quadratura().every(x=>x.ok&&x.diff999===0),'A DIFF vuota e quadratura');check(p.S().giacenze['TR-STD']===500,'A IM500 invariata');p=apri('erp_inventario','differenze');const before=JSON.stringify(p.S()),none=p.fai('rg',{data:'2027-01-03'});check(/ko/.test(none)&&/Nessuna differenza/.test(none),'A LI21 a vuoto rifiutato esplicitamente');check(before===JSON.stringify(p.S()),'A LI21 rifiutato non altera stato');
// Case B: three bins, two differences; state transitions only on final input.
seed();inventory(['01-01-1','01-01-2','01-02-1']);p=count('01-01-1',49);check(p.S().wm.inventari[0].stato==='attivo','B prima parziale mantiene attivo');p=count('01-01-2',48);check(p.S().wm.inventari[0].stato==='attivo','B seconda parziale mantiene attivo');p=count('01-02-1',50);check(p.S().wm.inventari[0].stato==='riconta','B ultima prima conta passa a riconta');
p=count('01-01-1',49);check(p.S().wm.inventari[0].stato==='riconta','B riconta parziale mantiene riconta');p=count('01-01-2',48);check(p.S().wm.inventari[0].stato==='contato','B ultima riconta passa a contato');check(p.S().giacenze['TR-STD']===500,'B fino alla conta IM500 invariata');
p=apri('erp_inventario','documenti');act(p,'ix',{data:'2027-01-03'});check(p.w.WM4.quadratura().every(x=>x.ok),'B LI20 quadratura includeDIFF');check(p.w.WM4.inUbic('DIFF').reduce((t,q)=>t+q.qta,0)===3,'B LI20 DIFF+3');check(p.S().giacenze['TR-STD']===500&&Math.abs(saldo(p.S(),'65'))<0.001,'B primaLI21 IM500 e conto65zero');
p=apri('erp_inventario','differenze');act(p,'rg',{data:'2027-01-03'});check(p.S().giacenze['TR-STD']===497,'B LI21 IM497');check(Math.abs(saldo(p.S(),'65')-94.2)<0.001,'B LI21 D65 94,20');check(Math.abs(saldo(p.S(),'13')-31690.8)<0.001,'B LI21 conto13 31.690,80');check(p.w.WM4.quadratura().every(x=>x.ok&&x.diff999===0),'B LI21 quadratura finaleDIFFzero');
// Case C: empty bin count0 also succeeds on final RF button.
seed();inventory(['03-05-2']);p=count('03-05-2',0);check(p.S().wm.inventari[0].stato==='contato','C ultima conta vuota0 → contato');p=apri('erp_inventario','documenti');act(p,'ix',{data:'2027-01-03'});check(p.w.WM4.quadratura().every(x=>x.ok&&x.diff999===0),'C LI20 vuota senza rettifica');
}catch(e){errori++;evidenze.push({fatal:e.stack});}
return {controlli,errori,evidenze};
`;
const result=new Function('require','__dirname','SOURCE',harness+scenario)(req,path.join(repo,'tests'),source);
const report={source:repo,mode:'JSDOM su copia completa già corretta; nessuna patch in memoria',sha256WmPagine:crypto.createHash('sha256').update(source).digest('hex'),...result};
const output=path.join(__dirname,'magazzino-rf-regression-results.json');fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,evidenze:result.errori?result.evidenze.slice(-2):undefined,output},null,2));process.exitCode=result.errori?1:0;
