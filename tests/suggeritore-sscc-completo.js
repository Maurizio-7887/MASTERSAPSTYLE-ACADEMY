/* Regression: all guide steps use the contextual tutor, and SSCC steps explain creation/use. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', 'app', 'blueprints', 'guida', 'static', 'esercizi');
function load(file, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, {filename:file,timeout:4000});
}
const rag = {window:{}};
load('ragioneria-wms.js',rag);
assert.equal(rag.window.MSA_ESERCIZIO.passi.length,67);
assert(rag.window.MSA_ESERCIZIO.passi.every(p=>Array.isArray(p.punti)&&p.punti.length>0));
const budget=rag.window.MSA_ESERCIZIO.passi.find(p=>p.titolo.startsWith('KP06: pianifica'));
assert(budget.punti.some(p=>p.sel==='#kp06-k54'&&p.valore==='6000'));
assert(budget.punti.some(p=>p.sel==='#kp06-k80'&&p.valore==='36000'));
const create=rag.window.MSA_ESERCIZIO.passi.find(p=>p.titolo==='Imballa in 11 pallet identificati da SSCC');
assert(create.punti.some(p=>p.sel==='[data-prefisso="im"] [data-azione="im"]'));
assert(create.punti.some(p=>p.serve.includes('11 codici')));
const loadStep=rag.window.MSA_ESERCIZIO.passi.find(p=>p.titolo==='Carica tutti gli 11 SSCC');
assert(loadStep.punti.some(p=>p.sel==='#ca-sscc'));
assert(loadStep.punti.some(p=>p.serve.includes('non')||p.serve.includes('NON')));
const dic={window:{MSA_CPM_FORMAS:{passiPreparazione:[],passiConsuntivo:[],passiRiconciliazione:[]}}};
load('dicembre-wms.js',dic);
load('dicembre-wms-semplice.js',dic);
assert(dic.window.MSA_ESERCIZIO.passi.length>100);
assert(dic.window.MSA_ESERCIZIO.passi.every(p=>Array.isArray(p.punti)&&p.punti.length>0));
for(const title of ['Imballa Beta in 4 colli SSCC','Imballa Delta in 3 colli SSCC','RF Carico: carica i 4 colli di Beta con la pistola']){
  const step=dic.window.MSA_ESERCIZIO.passi.find(p=>p.titolo===title);
  assert(step&&step.punti.some(p=>p.serve.includes('SSCC')));
}
console.log('OK: tutor disponibile in tutti i 67 punti Ragioneria-WMS e nei '+dic.window.MSA_ESERCIZIO.passi.length+' punti Dicembre-WMS; percorso SSCC completo.');
