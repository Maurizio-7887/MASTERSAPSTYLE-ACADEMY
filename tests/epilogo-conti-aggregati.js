/* Regression test: epilogo per codice conto, saldi analitici e dati storici intatti. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const load = p => fs.readFileSync(path.join(root, p), 'utf8');
const round = x => Math.round(x * 100) / 100;
const pianoDeiConti = [
  ['10','ATTIVO'],['40','RICAVO'],['70','COSTO'],['72','COSTO'],['73','COSTO'],
  ['32','PASSIVO'],['90','CHIUSURA'],['91','CHIUSURA'],['92','CHIUSURA']
].map(([codice,tipo])=>({codice,tipo,nome:'Conto '+codice}));
const state = {pianoDeiConti, registrazioni:[],cespiti:[],chiusura:{iva:[],imposte:[]},chiusure:{}};
let seq = 0;
function add(conto, partner, importo) {
  state.registrazioni.push({
    data:'2026-12-15', tipo:'OPERAZIONE',
    righe:[
      {conto,partner,dareAvere:'DARE',importo},
      {conto:'10',dareAvere:'AVERE',importo}
    ]
  });
}
add('70','ORD-1',2280); add('70','ORD-2',152);
add('72','CC-A',7140); add('72','CC-B',140);
add('73','COMM-1',9420); add('73','COMM-2',292);
state.registrazioni.push({data:'2026-12-20',tipo:'VENDITA',righe:[
  {conto:'10',dareAvere:'DARE',importo:20000},
  {conto:'40',dareAvere:'AVERE',importo:20000}
]});
const prima = JSON.stringify(state.registrazioni);
const engine = {
  S:state,
  data: d=>d,
  post(doc) {
    const dare = round(doc.righe.filter(x=>x.dareAvere==='DARE').reduce((v,x)=>v+x.importo,0));
    const avere = round(doc.righe.filter(x=>x.dareAvere==='AVERE').reduce((v,x)=>v+x.importo,0));
    assert.equal(dare,avere,'documento contabile quadrato: '+doc.tipo);
    doc.numero = 'TEST-'+(++seq);
    state.registrazioni.push(doc);
    return doc;
  },
  salva() {}
};
const window = {LabMotore:{r2:round,fd:x=>x,eur:x=>String(x)},SD4:{N:engine}};
vm.runInNewContext(load('app/blueprints/erp_chiusura/static/ch-logica.js'),{window,console});
const expected = {'70':2432,'72':7280,'73':9712};
const ce = window.CH4.contoEconomico('2026');
assert.equal(round(ce.costi),19424);
assert.equal(round(ce.ricavi),20000);
assert.equal(round(ce.risultato),576);
window.CH4.chiudi({anno:'2026',forza:'si'});
const epilogo = state.registrazioni.find(r=>r.tipo==='EPILOGO');
assert.ok(epilogo,'documento epilogo presente');
for (const [conto,totale] of Object.entries(expected)) {
  const righe = epilogo.righe.filter(x=>x.conto===conto);
  assert.equal(righe.length,1,'una riga nel conto economico per '+conto);
  assert.equal(righe[0].importo,totale,'saldo aggregato '+conto);
  assert.equal(righe[0].dareAvere,'AVERE');
}
assert.equal(epilogo.righe.filter(x=>x.conto==='90').length,1,'conto economico quadrato');
assert.equal(state.chiusure['2026'].utile,576);
assert.equal(JSON.stringify(state.registrazioni.slice(0,7)),prima,'documenti originali immutati');
const sp = state.registrazioni.find(r=>r.tipo==='CHIUSURA_SP');
assert.ok(sp,'chiusura stato patrimoniale rimane operativa');
const fi = load('app/blueprints/erp_fi/static/fi-pagine.js');
assert.ok(fi.includes("if (r.tipo !== 'EPILOGO') return r.righe;"),'soltanto epilogo storico aggregato in consultazione');
assert.ok(fi.includes('var vis = righeVisibili(r), t = totali(r.righe)'), 'totali basati sulle scritture originali');
console.log('OK epilogo: 70, 72 e 73 aggregati, storici intatti, bilancio quadrato.');
