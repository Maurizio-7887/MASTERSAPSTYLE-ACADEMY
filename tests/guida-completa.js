/* Struttura del testo completo: nessuna operazione reale o stato allievo. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.resolve(__dirname,'..');
const dir = path.join(root,'app/blueprints/guida/static/esercizi');
let checks=0;
function ok(v,msg){assert.ok(v,msg);checks++;}
function carica(state){
  const raw=JSON.stringify(state);
  const storage=new Map();
  const window={MSA_STATO_CORRENTE:()=>state,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{throw Error('La guida non deve scrivere nello stato');}}};
  const ctx=vm.createContext({window,console});
  for(const f of ['dicembre-wms-legacy.js','dicembre-wms.js','magazzino-formas.js','laboratori-completi.js','uso-programma.js','completo-formas.js']) vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx,{filename:f});
  ok(JSON.stringify(state)===raw,'Lettura guida senza modificare il lavoro');
  return window;
}
const w=carica(null),E=w.MSA_ESERCIZIO;
ok(E.codice==='completo-formas','Codice nuova guida');
const base=w.MSA_ESERCIZIO_DICEMBRE_LEGACY;
ok(E.passi.length>100,'Percorso esteso');
const seen=new Set();
for(const p of E.passi){
 ok(typeof p.titolo==='string'&&p.titolo.length>5,'Titolo presente');
 ok(!seen.has(p.titolo),'Titolo non duplicato: '+p.titolo);seen.add(p.titolo);
 ok(p.dove&&p.dove.ep,'Destinazione della guida: '+p.titolo);
 ok(Array.isArray(p.campi)&&p.campi.length>0,'Istruzioni concrete: '+p.titolo);
 for(const row of p.campi)ok(Array.isArray(row)&&row.length===2,'Campi nome/valore');
}
ok(E.passi[1].nota.includes('Preserva'),'Nessun invito ad azzerare il lavoro principale');
for(const uf of ['UF8','UF9','UF10','UF11'])ok(JSON.stringify(w.MSA_MAGAZZINO_FORMAS).replace(/UF\s+(\d+)/g,'UF$1').includes(uf),'Copertura calendario '+uf);
const legacyState={costituzione:{data:'2026-12-01'},registrazioni:[{numero:'storico'}],produzione:[]};
const l=carica(legacyState).MSA_ESERCIZIO;
ok(l.casoStorico===true,'Salvataggio storico riconosciuto');
ok(l.passi.some(p=>p.id==='completo-storico'),'Avviso per lavoro storico');
ok(!l.passi.some(p=>p.titolo==='CO01: un ordine per 300 transenne'),'Nessuna reinterpretazione del caso storico');
const now=carica({costituzione:{data:'2026-12-01'},produzioneModello:'wip-fasi-v1',registrazioni:[]}).MSA_ESERCIZIO;
ok(now.casoStorico===false,'Nuovo modello riconosciuto');
ok(now.passi.some(p=>p.titolo==='CO01: un ordine per 300 transenne'),'Caso WIP disponibile');
fs.mkdirSync(path.join(root,'tests/_completo'),{recursive:true});
fs.writeFileSync(path.join(root,'tests/_completo/esercizio.json'),JSON.stringify(E,null,2));
fs.writeFileSync(path.join(root,'tests/_completo/endpoints.json'),JSON.stringify([...new Set(E.passi.map(p=>p.dove.ep))]));
console.log(`OK: ${checks} controlli strutturali guida completa; ${E.passi.length} passi; caricamento non distruttivo e compatibilità storica.`);
