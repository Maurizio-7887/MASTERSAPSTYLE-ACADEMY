// Regressione isolata: il punto 19 BPC va riconosciuto dopo una ripresa di sessione.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname,'../app/blueprints/guida/static/esercizi/cpm-formas.js'),'utf8');
const window = {};
vm.runInNewContext(source,{window,console});
const passo = ['passiPreparazione','passiConsuntivo','passiRiconciliazione']
  .flatMap(k => Array.from(window.MSA_CPM_FORMAS[k] || [])).find(x => x.id === 'bpc-input');
assert.ok(passo,'punto BPC esistente');
assert.equal(passo.cpmVerificato,true,'il punto è protetto dalla convalida reale');
const stagione = [400,350,300,200,150,150,200,100,200,300,350,400];
const base = () => ({S:{costing:{bpc:{modello:'COSTI_CENTRI',dati:{'BUDGET|V1|4200|54':stagione.slice()},stato:{'BUDGET|V1|4200':{stato:'approvato'}},inputSalvati:{'BUDGET|V1|4200':true}}}}});
let h=base();
assert.equal(passo.fatto(h),true,'alla ripresa con 4200 approvato e dati salvati il passo 19 è completato');
let pulsanti = passo.punti.filter(x=>x.t==='pulsante');
assert.equal(pulsanti.length,1,'un pulsante di salvataggio previsto');
assert.equal(pulsanti[0].fatto(h),true,'pulsante assente riconosciuto come già completato');
assert.equal(pulsanti[0].richiedeSalvataggio,true,'non viene autorizzato un clic fittizio');
h=base();delete h.S.costing.bpc.inputSalvati['BUDGET|V1|4200'];
assert.equal(passo.fatto(h),true,'4200 approvato con i 12 importi stagionali giusti: niente da respingere (caso Paulina)');
h=base();delete h.S.costing.bpc.inputSalvati['BUDGET|V1|4200'];h.S.costing.bpc.stato['BUDGET|V1|4200']={stato:'bozza'};
assert.equal(passo.fatto(h),false,'dati non salvati, non inviati: non basta che ci siano');
h=base();h.S.costing.bpc.dati['BUDGET|V1|4200|54'][0]=350;
assert.equal(passo.fatto(h),false,'budget approvato con importi errati deve essere corretto dal controller');
assert.equal(pulsanti[0].fatto(h),false,'importi sbagliati non superano verifica salvataggio');
// Passo 12 KP06 (caso dei passi 92 bloccati dal 12): numeri giusti e tariffe già calcolate, senza segno «salvato» per centro
const kp06 = ['passiPreparazione','passiConsuntivo','passiRiconciliazione'].flatMap(k => Array.from(window.MSA_CPM_FORMAS[k] || [])).find(x => x.id === 'cpm-budget');
const piano = {'4210':{'80':36000},'4220':{'80':36000},'4230':{'80':36000},'4200':{'54':18000}};
const cpmS = extra => ({S:{costing:{cpm:Object.assign({versione:'cpm-centri-v1',revisione:14,piano:{'0':JSON.parse(JSON.stringify(piano))}},extra)}}});
assert.equal(kp06.fatto(cpmS({kspi:{revisione:14}})),true,'piano giusto e tariffe calcolate: il passo 12 non blocca più');
assert.equal(kp06.fatto(cpmS({})),false,'piano solo proposto, mai usato: va confermato centro per centro');
const sbagliato = cpmS({kspi:{revisione:14}}); sbagliato.S.costing.cpm.piano['0']['4220']['80']=30000;
assert.equal(kp06.fatto(sbagliato),false,'numeri sbagliati: va corretto');
console.log('OK: ripresa BPC 4200 approvato, salvataggio documentato e mismatch verificati.');
