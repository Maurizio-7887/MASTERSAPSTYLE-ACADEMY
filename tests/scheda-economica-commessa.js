/* Regression: commessa is read-only, displays real costs and never invents sales margin. */
'use strict';
const fs=require('node:fs'), vm=require('node:vm'), cp=require('node:child_process'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const file=p=>path.join(root,p);
for(const p of ['app/blueprints/erp_costi/static/copc-pagine.js','app/blueprints/guida/static/esercizi/dicembre-wms.js']){
  cp.execFileSync(process.execPath,['--check',file(p)]);
}
const costi=fs.readFileSync(file('app/blueprints/erp_costi/static/copc-pagine.js'),'utf8');
const state={
  produzione:[{numero:'1000001',materiale:'TR-STD',qta:300,data:'2026-12-07',piano:{mat:2280,lav:7140,set:0,sovrMat:0,sovrProd:0,totale:9420},teco:false,
    eventi:[],liquidazione:{data:'2026-12-31'}}],
  fatture:[],copa:[],costing:{scheda:{},ml:[]}
};
const original=JSON.stringify(state);
const radice={dataset:{},innerHTML:'',querySelector(){return {onchange:null}}};
function table(_headers, rows){return '<table>'+rows.map(r=>Array.isArray(r)?r.join('|'):(r.celle||[]).join('|')).join('\\n')+'</table>';}
const L={esc:x=>String(x==null?'':x).replace(/&/g,'&amp;').replace(/</g,'&lt;'),eur:x=>String(x),n0:x=>String(x),fd:x=>x,r2:x=>Math.round(x*100)/100,scheda:(_icon,_title,_code,html)=>html,tabella:table};
const S=state;
const window={LAB_PAGINA:{pagina:'commessa',chiave:'test'},LabMotore:L,S4UI:{avviso:()=>''},
  SD4:{avvia:()=>({S})},PP4:{stato:()=> 'DLV',effettivi:()=>({mat:2280,lav:7140,set:0,sovrMat:0,sovrProd:0,totale:9420,entrati:300,accredito:9420})},
  PC4:{varianze:()=>({totale:0,categorie:[{cat:'Materiale',piano:'2280',eff:'2280',v:0}]})},
  COPA:{report:()=>({righe:[{chiave:'TR-STD',ricaviRettificati:30000,costoVenduto:17000,diffPrezzo:500,mdc1:12500,provvigioni:900,mdc2:11600}]})},
  COPERCORSO:{html:()=>'',url:route=>'/vuoto/s4/'+route}};
vm.runInNewContext(costi,{window,document:{getElementById:()=>radice},console});
assert.match(radice.innerHTML,/1000001/);
assert.match(radice.innerHTML,/9.420|9420/);
assert.match(radice.innerHTML,/Varianza complessiva/);
assert.match(radice.innerHTML,/non sono attribuiti univocamente|non sono attribuiti/i);
assert.match(radice.innerHTML,/11600/,'CO-PA displayed separately');
assert.match(radice.innerHTML,/co-commessa-ordine/);
assert.match(radice.innerHTML,/co-commessa-varianze/);
assert.match(radice.innerHTML,/co-commessa-copa/);
assert.equal(JSON.stringify(state),original,'report cannot post or modify accounting');
const exercise=fs.readFileSync(file('app/blueprints/guida/static/esercizi/dicembre-wms.js'),'utf8');
const w={MSA_STATO_CORRENTE:()=>({})};
vm.runInNewContext(exercise,{window:w,console});
const steps=w.MSA_ESERCIZIO.passi;
for(const id of ['dicembre-co-commessa-fert','dicembre-co-commessa-halb']){
  const p=steps.find(x=>x.id===id);
  assert.ok(p,'exercise '+id);
  assert.ok(p.fai?.length>=4,'panel instructions');
  assert.ok(p.punti?.length>=3,'point-by-point popups');
  assert.equal(p.dove.ep,'erp_costi.commessa','route to real dashboard');
  assert.equal(p.punti[0].sel,'#co-commessa-ordine');
}
assert.ok(steps.findIndex(x=>x.id==='dicembre-co-commessa-fert') < steps.findIndex(x=>x.titolo==='Verifica finale'),'new tasks precede final validation');
console.log('OK: cockpit per ordine, margine commerciale distinto, corso e guida laterale verificati');
