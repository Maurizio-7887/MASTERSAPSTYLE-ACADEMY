/* Regressione: le fatture Beta/Delta, SdI e anticipo mostrano istruzioni e pop-up. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'app/blueprints/guida/static/esercizi/dicembre-wms.js'),'utf8');
const state={ordini:[],consegne:[],fatture:[],registrazioni:[]};
const before=JSON.stringify(state);
const window={MSA_STATO_CORRENTE:()=>state};
vm.runInNewContext(src,{window,console});
const E=window.MSA_ESERCIZIO;
assert.equal(E.codice,'dicembre-wms');
assert.equal(E.pannelloAutomatico,true);
const names=['VF01: fattura Beta','VF01: fattura Delta','Trasmetti le due fatture allo SdI','Anticipo su fattura: la banca anticipa l’80% di Beta'];
for(const title of names){
  const p=E.passi.find(x=>x.titolo===title);
  assert.ok(p,'presente: '+title);
  assert.ok(p.punti?.length>=3,'popup passo passo: '+title);
  assert.ok(p.fai?.length>=3,'istruzioni visibili: '+title);
  assert.equal(p.punti.at(-1).t,'pulsante','azione conclusiva: '+title);
}
const beta=E.passi.find(x=>x.titolo===names[0]);
const delta=E.passi.find(x=>x.titolo===names[1]);
assert.equal(beta.punti[0].sel,'#vf-consegna');
assert.equal(beta.punti[0].valore,'80000001');
assert.equal(delta.punti[0].valore,'80000002');
assert.equal(beta.punti[1].sel,'#vf-data');
assert.equal(beta.punti.at(-1).sel,'[data-prefisso="vf"] [data-azione="vf"]');
const start=E.passi.findIndex(x=>x.titolo===names[0]);
const rest=E.passi.slice(start);
assert.ok(rest.length>20,'percorso successivo intatto');
assert.ok(rest.every(x=>Array.isArray(x.fai)&&x.fai.length),'nessun passo successivo privo di istruzioni');
assert.ok(rest.some(x=>x.titolo==='F-53: paga il ferro'&&x.punti?.length),'guida pagamento mantenuta');
assert.equal(JSON.stringify(state),before,'la guida non modifica dati degli allievi');
const h={S:{ordini:[{numero:'10000001',rif:'BETA-180',cliente:'C100',materiale:'TR-STD',qta:180},{numero:'10000002',rif:'DELTA-120',cliente:'C200',materiale:'TR-STD',qta:120}],consegne:[{numero:'80000001',ordine:'10000001',wm:true},{numero:'80000002',ordine:'10000002',wm:true}],fatture:[{tipo:'F2',consegna:'80000001'},{tipo:'F2',consegna:'80000002'}]}};
assert.equal(beta.punti.at(-1).fatto(h),true,'fattura Beta già emessa riconosciuta');
assert.equal(delta.punti.at(-1).fatto(h),true,'fattura Delta già emessa riconosciuta');
assert.equal(E.passi.find(x=>x.titolo===names[2]).punti.at(-1).fatto(h),false,'SdI non anticipa la conclusione');
console.log('OK tutor: VF01 Beta/Delta, SdI, anticipo, istruzioni fino alla riapertura e salvataggi intatti');
