// Verifiche anti-falso-positivo del tutor CPM: il semplice valore precaricato non è un salvataggio.
// Eseguire: node tests/cpm-tutor-verifica.js
const fs=require('fs'),path=require('path'),assert=require('assert'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const w=new JSDOM('<!doctype html><body><div id="lab"></div></body>',{url:'https://academy.local/vuoto/s4/controllo/kp06/',runScripts:'outside-only'}).window;
[
'app/static/js/lab-motore.js',
'app/static/js/erp/nucleo.js',
'app/static/js/erp/ui.js',
'app/blueprints/erp_vendite/static/sd-logica.js',
'app/blueprints/erp_copa/static/copa-logica.js',
'app/blueprints/erp_acquisti/static/mm-logica.js',
'app/blueprints/erp_produzione/static/pp-logica.js',
'app/blueprints/erp_costi/static/copc-logica.js',
'app/blueprints/erp_bpc/static/bpc-logica.js',
'app/blueprints/erp_paghe/static/py-logica.js',
'app/blueprints/guida/static/esercizi/cpm-formas.js'
].forEach(p=>w.eval(read(p)));
const N=w.SD4.avvia('test-cpm-tutor'),cp=w.PC4.cpm;
N.avvia({modo:'costituzione',data:'2026-12-01'});
const passo=id=>['passiPreparazione','passiConsuntivo','passiRiconciliazione'].flatMap(k=>w.MSA_CPM_FORMAS[k]).find(p=>p.id===id);
const h=()=>({S:N.S});
function check(id,expected,message){assert.strictEqual(!!passo(id).fatto(h()),expected,message);}
cp.attiva({conferma:'ATTIVA'});
check('cpm-attivazione',true,'apertura salvata');
check('cpm-budget',false,'i valori precompilati non autorizzano lo skip di KP06');
check('cpm-standard-tr',false,'la ricetta precompilata non è stata salvata');
check('cpm-standard-halb',false,'il semilavorato precompilato non è stato salvato');
check('bpc-input',false,'modulo BPC non salvato');
const plan=cp.modello().piano['0'];
function salvaCentro(cdc){
  const i={cdc,versione:'0'};
  cp.CLASSI.forEach(c=>{i['k'+c[0]]=(plan[cdc]||{})[c[0]]||0;});
  cp.salvaKP06(i);
}
['4210','4220','4230'].forEach(cdc=>salvaCentro(cdc));
check('cpm-budget',false,'non basta salvare tre centri: manca il centro 4200');
salvaCentro('4200');
check('cpm-budget',true,'quattro centri e importi effettivamente confermati');
const m=cp.modello();
function salvaStandard(mat){
  const x=m.standard[mat];
  cp.salvaStandard({materiale:mat,componente:x.componente.mat,quantita:x.componente.q,ore:x.ore,attrezzaggio:x.attrezzaggio,centroSet:x.centroSet});
}
salvaStandard('TR-STD');
check('cpm-standard-tr',true,'ricetta transenna confermata');
check('cpm-standard-halb',false,'ricetta HALB non ancora confermata');
salvaStandard('SL-TAGLIO');
check('cpm-standard-halb',true,'ricetta HALB confermata');
check('cpm-kspi',false,'tariffa non calcolata');
cp.eseguiKSPI({data:'2026-12-01'});
check('cpm-kspi',true,'KSPI valido sulla revisione corrente');
salvaCentro('4200');
check('cpm-kspi',false,'nuova revisione invalida la vecchia tariffa');
for(const id of ['cpm-budget','cpm-kp26','cpm-ciclo','cpm-standard-tr','bpc-input','cpm-kspi','cpm-calcolo','cpm-rilascio']){
  assert.strictEqual(passo(id).cpmVerificato,true,id+' abilitato alla convalida su stato');
}
console.log('✓ Tutor CPM: salvataggi espliciti, quattro CdC, distinte HALB/FERT, revisione KSPI, '+8+' verifiche dei passi.');
w.close();
