/* Regression of mandatory checkmarks and guarded tutor navigation.
   Run: node tests/guida_blocco_avanzamento.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const js = fs.readFileSync(path.join(__dirname, '../app/blueprints/guida/static/pannello.js'), 'utf8');
new Function(js);
assert(js.includes("disabled = !!pendente || !st"));
assert(js.includes("disabled = !st || pos === N - 1"));
assert(js.includes("i <= pos || (primaMancante < 0 && !quizAperto)"));
assert(js.includes("if (mancante >= 0 || inQuiz())"));
assert(js.includes("if (t.classList.contains('msa-g-salta')) return"));
assert(js.includes("if (guidata && stati[pos] && primoBlocco(pos, stati) < 0)"));
const start=js.indexOf('  function vaiA(');
const end=js.indexOf('  function apri(',start);
assert(start>=0 && end>start);
const extracted=js.slice(start,end);
const cases=[
 {name:'No unverified current operation',at:2,states:['auto','auto','','',''],target:3,allowed:false},
 {name:'Proceed after real automatic checkmark',at:2,states:['auto','auto','auto','',''],target:3,allowed:true},
 {name:'Do not skip an unverified operation',at:2,states:['auto','auto','auto','',''],target:4,allowed:false},
 {name:'Permit review of past operations',at:3,states:['auto','','auto','auto',''],target:1,allowed:true},
 {name:'Require old missing checkmark',at:3,states:['auto','','auto','auto',''],target:4,allowed:false},
 {name:'Accounting quiz locks the next step',at:2,states:['auto','auto','auto','',''],target:3,quiz:true,allowed:false}
];
for(const test of cases){
  const run=new Function('test',`
    var pos=test.at,N=5,states=test.states,alerted=[];
    function primoBlocco(to){for(var i=0;i<to;i++)if(!states[i])return i;return -1;}
    function inQuiz(){return !!test.quiz;}
    function disegna(){} function avvisoBlocco(i){alerted.push(i);}
    function ss(){} function programmaProgresso(){}
    var POS='test',corpo={scrollTop:0};
    ${extracted}
    return {ok:vaiA(test.target,true),pos:pos,alerted:alerted};
  `)(test);
  assert.equal(run.ok,test.allowed,test.name);
  if(!test.allowed)assert.equal(run.pos,test.at,test.name+' must not change cursor');
}
console.log('OK: mandatory checked steps, no step skipping, backtracking, quiz and older checkpoints.');
