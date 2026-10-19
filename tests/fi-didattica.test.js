/* Solo dati sintetici; node --test tests/fi-didattica.test.js */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const quizCode = fs.readFileSync(path.join(root,'app/blueprints/guida/static/ragioneria.js'),'utf8');
const fiCode = fs.readFileSync(path.join(root,'app/blueprints/erp_fi/static/fi-pagine.js'),'utf8');
const clone = x => JSON.parse(JSON.stringify(x));
function fixture() {
  const r = {id:1,numero:'SYN-001',data:'2027-01-02',tipo:'TEST',descrizione:'Scrittura sintetica riservata',righe:[
    {conto:'10',dareAvere:'DARE',importo:12.34}, {conto:'30',dareAvere:'AVERE',importo:12.34}]};
  return {registrazioni:[r],pianoDeiConti:[{codice:'10',nome:'Banca test'},{codice:'30',nome:'Capitale test'}],msaRagioneria:{coda:[{chiave:'sintetica',documento:clone(r),risposte:[],tentativi:0}],esiti:[]}};
}
function env(S, pagina='giornale', withQuiz=true) {
  const events = {}, radice = {innerHTML:'',dataset:{}};
  const context = {console, URLSearchParams, Number, Set, CustomEvent:class {constructor(type){this.type=type;}},
    document:{getElementById:()=>radice}, location:{pathname:'/vuoto/s4/contabilita-s4/'+(pagina==='giornale'?'':pagina),search:'?conto=10',reload(){context.reloaded=true;}}};
  context.window=context;
  context.addEventListener=(name,fn)=>(events[name] ||= []).push(fn);
  context.dispatchEvent=ev=>(events[ev.type] || []).forEach(fn=>fn(ev));
  context.LabMotore={esc:x=>String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),eur:x=>Number(x).toFixed(2),fd:x=>x,scheda:(a,b,c,h)=>h,bilancio:()=>'<p>BILANCIO RISERVATO</p>'};
  context.SD4={avvia:()=>({S})}; context.ST4={}; context.S4UI={}; context.LAB_PAGINA={chiave:'test-sintetico',pagina};
  vm.createContext(context);
  if(withQuiz) vm.runInContext(quizCode,context);
  return {context,radice,loadFI:()=>vm.runInContext(fiCode,context)};
}
function corpo(answers) {
  return {querySelectorAll:()=>answers.map(a=>({querySelector:s=>({value:s==='.msa-q-conto'?a.conto:s==='.msa-q-sezione'?a.sezione:a.importo})})),querySelector:()=>({textContent:''})};
}
function click(context,S,action,answers=[],salva=()=>{}) {
  return context.MSA_RAGIONERIA.click({classList:{contains:s=>s===action}},corpo(answers),S,salva);
}
const giuste = () => [{conto:'10',sezione:'DARE',importo:'12,34'},{conto:'30',sezione:'AVERE',importo:'12,34'}];

test('clic vuoto/incompleto non acquisisce tentativo, non offre soluzione né viste',()=>{
  const S=fixture(), {context,radice,loadFI}=env(S);
  click(context,S,'msa-q-verifica',[{conto:'10',sezione:'DARE',importo:''},{conto:'30',sezione:'',importo:'12,34'}]);
  assert.equal(S.msaRagioneria.coda[0].tentativi,0);
  assert.equal(context.MSA_RAGIONERIA.protetto(S),true);
  assert.equal(click(context,S,'msa-q-aiuto'),false);
  loadFI(); assert.doesNotMatch(radice.innerHTML,/Scrittura sintetica riservata|12\.34/);
});
test('conti e importi devono essere valutabili: zero, negativi, tre decimali, conto non previsto',()=>{
  for(const value of ['0','-12,34','12,345','x','Infinity']) {
    const S=fixture(), {context}=env(S), a=giuste(); a[0].importo=value;
    click(context,S,'msa-q-verifica',a); assert.equal(context.MSA_RAGIONERIA.protetto(S),true);
  }
  const S=fixture(), {context}=env(S), a=giuste(); a[0].conto='inesistente';
  click(context,S,'msa-q-verifica',a); assert.equal(context.MSA_RAGIONERIA.protetto(S),true);
});
test('tentativo completo errato sblocca senza diventare corretto o soluzione consultata',()=>{
  const S=fixture(), original=JSON.stringify(S.registrazioni), {context,radice,loadFI}=env(S), a=giuste(); a[0].importo='1,00';
  click(context,S,'msa-q-verifica',a);
  const q=S.msaRagioneria.coda[0];
  assert.equal(q.tentato,true); assert.equal(q.corretto,false); assert.equal(!!q.aiuto,false);
  assert.equal(context.MSA_RAGIONERIA.protetto(S),false);
  loadFI(); assert.match(radice.innerHTML,/Scrittura sintetica riservata/);
  assert.equal(JSON.stringify(S.registrazioni),original);
  assert.equal(q.cronologiaTentativi.length,1);
  const restored=clone(S); assert.equal(context.MSA_RAGIONERIA.protetto(restored),false);
});
test('cronologia errori resta dopo correzione; corretto e aiuto sono esiti distinti',()=>{
  const S=fixture(), {context}=env(S), a=giuste(); a[0].conto='30';
  click(context,S,'msa-q-verifica',a); click(context,S,'msa-q-verifica',giuste());
  const q=S.msaRagioneria.coda[0]; assert.equal(q.corretto,true); assert.equal(q.cronologiaTentativi.length,2);
  assert.match(q.cronologiaTentativi[0].errori[0],/Conto non corretto/);
  click(context,S,'msa-q-continua'); assert.equal(S.msaRagioneria.esiti[0].tentato,true);
  assert.equal(S.msaRagioneria.esiti[0].conAiuto,false);
  const H=fixture(), h=env(H); const wrong=giuste(); wrong[0].importo='2';
  click(h.context,H,'msa-q-verifica',wrong); click(h.context,H,'msa-q-aiuto');
  assert.equal(H.msaRagioneria.coda[0].corretto,false); assert.equal(H.msaRagioneria.coda[0].aiuto,true);
});
test('errore salvataggio non sblocca e non perde i dati precedenti',()=>{
  const S=fixture(), before=JSON.stringify(S), {context}=env(S);
  assert.equal(click(context,S,'msa-q-verifica',giuste(),()=>{throw Error('disco simulato pieno');}),false);
  assert.equal(JSON.stringify(S),before); assert.equal(context.MSA_RAGIONERIA.protetto(S),true);
});
test('bozze incomplete dopo tentativo valido non richiudono; tentativo storico migrato',()=>{
  for(const historic of [false,true]) {
    const S=fixture(), {context}=env(S);
    if(historic) { S.msaRagioneria.coda[0].tentativi=1; S.msaRagioneria.coda[0].risposte=giuste().map(({sezione,importo})=>({sezione,importo})); }
    else { const a=giuste();a[0].importo='1';click(context,S,'msa-q-verifica',a); }
    context.MSA_RAGIONERIA.bozza(corpo([{conto:'',sezione:'',importo:''},{conto:'',sezione:'',importo:''}]),S,()=>{});
    assert.equal(context.MSA_RAGIONERIA.protetto(S),false);
  }
});
test('contatore legacy vuoto non sblocca; vecchio aiuto senza tentativo si può recuperare',()=>{
  const S=fixture(), {context}=env(S),q=S.msaRagioneria.coda[0]; q.tentativi=3;q.aiuto=true;
  assert.equal(context.MSA_RAGIONERIA.protetto(S),true);
  assert.doesNotMatch(context.MSA_RAGIONERIA.html(S,String),/msa-q-soluzione/);
  click(context,S,'msa-q-verifica',giuste()); assert.equal(context.MSA_RAGIONERIA.protetto(S),false);
});
test('compilare una bozza dopo vecchio clic vuoto non equivale a inviarla',()=>{
  const S=fixture(), {context}=env(S); S.msaRagioneria.coda[0].tentativi=1;
  context.MSA_RAGIONERIA.bozza(corpo(giuste()),S,()=>{});
  assert.equal(context.MSA_RAGIONERIA.protetto(S),true);
  click(context,S,'msa-q-verifica',giuste()); assert.equal(context.MSA_RAGIONERIA.protetto(S),false);
});
test('fallback FI prima del caricamento quiz esclude pendenti e non espone cifre',()=>{
  for(const pagina of ['giornale','mastro','bilancio','passive','storni']) {
    const S=fixture(), {context,radice,loadFI}=env(S,pagina,false);
    S.msaRagioneria.coda[0].tentativi=1; loadFI();
    assert.doesNotMatch(radice.innerHTML,/Scrittura sintetica riservata|12\.34|BILANCIO RISERVATO/);
    context.dispatchEvent({type:'beforeprint'}); assert.doesNotMatch(radice.innerHTML,/12\.34/);
  }
});
test('giornale conserva vecchi documenti e filtra ogni domanda in coda',()=>{
  const S=fixture(); const old=clone(S.registrazioni[0]);old.id=2;old.numero='OLD-002';old.descrizione='Preesistente'; S.registrazioni.push(old);
  const {context,radice,loadFI}=env(S);loadFI();assert.match(radice.innerHTML,/Preesistente/);
  assert.equal(context.FI_DIDATTICA.registrazioni().length,1);
  S.msaRagioneria.coda.push({documento:clone(old),risposte:[],tentativi:0});
  context.dispatchEvent({type:'msa:quiz-aggiornato'}); assert.doesNotMatch(radice.innerHTML,/Preesistente/);
});
test('mastrini riconciliati, saldo progressivo Dare/Avere e riferimenti bidirezionali',()=>{
  const S=fixture(); S.msaRagioneria.coda=[];
  const other=clone(S.registrazioni[0]);other.id=2;other.numero='SYN-002';other.data='2027-01-03';other.righe=[{conto:'10',dareAvere:'AVERE',importo:20},{conto:'30',dareAvere:'DARE',importo:20}]; S.registrazioni.push(other);
  const before=JSON.stringify(S), {context,radice,loadFI}=env(S,'mastro');loadFI();
  const api=context.FI_DIDATTICA, ms=api.movimenti(S.registrazioni,'10');
  assert.deepEqual(Array.from(ms,m=>m.saldo),[1234,-766]);
  const totals=api.totali(S.registrazioni.flatMap(r=>r.righe));
  const ledgerTotals=['10','30'].map(c=>api.totali(api.movimenti(S.registrazioni,c).map(m=>m.riga)));
  assert.equal(ledgerTotals.reduce((t,x)=>t+x.dare,0),totals.dare);
  assert.equal(ledgerTotals.reduce((t,x)=>t+x.avere,0),totals.avere);
  assert.match(radice.innerHTML,/7\.66 Avere/);assert.match(radice.innerHTML,/contabilita-s4\/#fi-doc-SYN-001/);
  const journal=env(S);journal.loadFI();assert.match(journal.radice.innerHTML,/mastro\?conto=10/);
  assert.equal(JSON.stringify(S),before);
});
test('stessa data conserva ordine di registrazione e non elimina righe duplicate legittime',()=>{
  const S=fixture();S.msaRagioneria.coda=[];
  S.registrazioni[0].righe.push({conto:'10',dareAvere:'DARE',importo:0.01});
  const {context,loadFI}=env(S);loadFI();
  assert.deepEqual(Array.from(context.FI_DIDATTICA.movimenti(S.registrazioni,'10'),m=>m.saldo),[1234,1235]);
});
test('cambio scheda e bfcache richiedono aggiornamento stato; eventi ridisegnano',()=>{
  const S=fixture(), {context,radice,loadFI}=env(S);loadFI();
  context.dispatchEvent({type:'storage',key:'test-sintetico'});assert.equal(context.reloaded,true);
  context.reloaded=false;context.dispatchEvent({type:'pageshow',persisted:true});assert.equal(context.reloaded,true);
  click(context,S,'msa-q-verifica',giuste());assert.match(radice.innerHTML,/Scrittura sintetica riservata/);
});
test('sopravvenienza: dopo quiz il form incasso include il nuovo indennizzo senza ricaricare',()=>{
  const {JSDOM}=require('jsdom');
  const w=new JSDOM('<!doctype html><body><div id="lab"></div></body>',{url:'https://sim.local/',runScripts:'outside-only'}).window;
  try {
    w.LAB_PAGINA={chiave:'fi-test-sintetico',pagina:'sopravvenienze',slot:'erp-ft'};
    ['app/static/js/lab-motore.js','app/static/js/erp/nucleo.js','app/static/js/erp/ui.js',
      'app/blueprints/erp_vendite/static/sd-logica.js','app/blueprints/erp_fi/static/fs-logica.js',
      'app/blueprints/guida/static/ragioneria.js','app/blueprints/erp_fi/static/fi-pagine.js']
      .forEach(p=>w.eval(fs.readFileSync(path.join(root,p),'utf8')));
    const lab=w.document.getElementById('lab');
    w.MSA_STATO_CORRENTE().avviato='2027-01-01'; // prerequisito sintetico, nessun saldo reale
    for(const [k,v] of Object.entries({compagnia:'F400',rif:'SYN-LIQ',testo:'Sinistro sintetico',importo:'500',data:'2027-01-21'})) lab.querySelector('#sv-'+k).value=v;
    lab.querySelector('[data-prefisso="sv"] [data-azione="sv"]').click();
    const S=w.MSA_STATO_CORRENTE(),q=S.msaRagioneria.coda[0];
    assert.ok(q,'operazione genera domanda');
    assert.equal(lab.hidden,true);
    assert.equal(lab.dataset.fiSospeso,'1');
    const answers=q.documento.righe.map((r,i)=>({r,i})).sort((a,b)=>String(a.r.conto).localeCompare(String(b.r.conto),'it',{numeric:true})||a.i-b.i).map(({r})=>({conto:r.conto,sezione:r.dareAvere,importo:r.importo.toFixed(2)}));
    click(w,S,'msa-q-verifica',answers,w.MSA_SALVA_STATO_CORRENTE);
    assert.equal(q.corretto,true);
    assert.equal(lab.hidden,false);
    assert.equal(lab.dataset.fiSospeso,'0');
    assert.ok([...lab.querySelector('#ii-sopravvenienza').options].some(o=>o.value==='SYN-LIQ'));
    const prima=S.registrazioni.length;
    lab.querySelector('#ii-sopravvenienza').value='SYN-LIQ';lab.querySelector('#ii-data').value='2027-01-28';
    lab.querySelector('[data-prefisso="ii"] [data-azione="ii"]').click();
    assert.equal(S.registrazioni.length,prima+1,'incasso utilizzabile dalla stessa pagina');
  } finally { w.close(); }
});
