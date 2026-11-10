/* Preflight test for Magazziniere 5.0 teaching guide. Run: node tests/magazziniere-prima-lezione.js */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const file=path.join(__dirname,'../app/blueprints/guida/static/esercizi/magazziniere-5.js');
const data=fs.readFileSync(file,'utf8');
const w={window:{}};
vm.runInNewContext(data,w,{filename:file,timeout:4000});
const e=w.window.MSA_ESERCIZIO;
assert.equal(e.codice,'magazziniere-5');
assert.equal(e.passi.length,82,'No questions or activities may be silently missing');
assert(e.passi.every(p=>Array.isArray(p.punti)&&p.punti.length),'Every guided step needs actionable substeps');
assert(e.passi.every(p=>p.punti.every(q=>q.nome&&q.serve)),'Every substep needs name and explanation');
const expected=[
 ['Avvia il percorso logistico',['#lg-data','#lg-quiz','[data-prefisso="lg"] [data-azione="lg"]']],
 ['Attiva il magazzino a ubicazioni W100',['#at-data','[data-prefisso="at"] [data-azione="at"]']],
 ['Leggi la mappa:',[]],
 ['Dove si trova? Cerca',['#dove-mat']],
 ['Stampa le etichette',[]],
 ['RF Interroga:',['#rf-q']]
];
for(let i=0;i<expected.length;i++){
 const p=e.passi[i], [name,selectors]=expected[i];
 assert(p.titolo.startsWith(name),String(i+1)+' correct start');
 for(const sel of selectors)assert(p.punti.some(q=>q.sel===sel),p.titolo+' selector '+sel);
}
const first=e.passi[0],second=e.passi[1];
assert(first.fatto({S:{percorso:'logistica'}}));
assert(!first.fatto({S:{percorso:'negozio'}}));
assert(second.fatto({S:{wm:{attivo:'2027-01-04'}}}));
assert(!second.fatto({S:{wm:{attivo:''}}}));
for(const [name,num] of [['Imballa Beta in colli SSCC',7],['Imballa Delta in colli SSCC',3]]){
 const p=e.passi.find(q=>q.titolo===name);
 assert(p&&p.punti.some(q=>q.sel==='[data-prefisso="im"] [data-azione="im"]'),name);
 assert(p.punti.some(q=>(q.serve||'').includes(String(num))),name+' pallet count');
}
const rf=e.passi.find(q=>q.titolo.startsWith('RF Carico:'));
assert(rf.punti.some(q=>q.sel==='#rf-sscc'));
const tutor=fs.readFileSync(path.join(__dirname,'../app/blueprints/guida/static/pannello.js'),'utf8');
assert(tutor.includes('AVVIO MAGAZZINO COMPLETATO'), 'Opening accounting quiz must explain that startup succeeded');
assert(tutor.includes('ADESSO: VERIFICA LA PRIMA SCRITTURA'), 'Quiz must show a direct next action');
assert(tutor.includes('Saldi dei conti e appunti (facoltativi)'), 'Accounting reference tools must not obscure the exercise');
console.log('OK: 82/82 guided steps, start and WMS validation, initial page selectors and SSCC creation/use.');
