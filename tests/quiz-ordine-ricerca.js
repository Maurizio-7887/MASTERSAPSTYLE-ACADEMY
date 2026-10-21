// Solo dati sintetici, nessuna rete: confronto come multinsieme e ricerca conti.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const codice = fs.readFileSync(path.join(__dirname, '../app/blueprints/guida/static/ragioneria.js'), 'utf8');
let verifiche = 0;
function ok(condizione, messaggio) { verifiche++; assert.ok(condizione, messaggio); }
const copia = x => JSON.parse(JSON.stringify(x));
const riga = (conto, dareAvere, importo) => ({conto, dareAvere, importo});
const risp = (conto, sezione, importo) => ({conto, sezione, importo:String(importo)});
const piano = [
  {codice:'10', nome:'Cassa didattica'},
  {codice:'20', nome:'Banca simulata'},
  {codice:'30', nome:'Ricavi di prova'},
  {codice:'40', nome:'Conto omonimo'},
  {codice:'41', nome:'Conto omonimo'},
  {codice:'50', nome:'Costi <formativi> & simulati'}
];
function scenario(righe, memoria) {
  const w = new JSDOM('<main></main>', {runScripts:'outside-only', url:'https://academy.invalid/'}).window;
  w.eval(codice);
  const S = memoria ? copia(memoria) : {
    pianoDeiConti:copia(piano),
    registrazioni:[{id:'doc-test', numero:'SIM-1', righe:copia(righe)}],
    msaRagioneria:{coda:[{chiave:'doc-test', versioneTentativo:2, documento:{
      id:'doc-test', numero:'SIM-1', data:'2027-01-01', descrizione:'Operazione sintetica', righe:copia(righe)
    }}], esiti:[]}
  };
  const Q = w.MSA_RAGIONERIA, corpo = w.document.querySelector('main');
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let salvati = 0, fallisci = false;
  function salva() { if (fallisci) throw Error('memoria piena simulata'); salvati++; }
  function disegna() { corpo.innerHTML = Q.html(S, esc); }
  function compila(risposte) {
    [...corpo.querySelectorAll('.msa-q-riga')].forEach((el,i) => {
      const a = risposte[i] || {};
      el.querySelector('.msa-q-conto').value = a.conto || '';
      el.querySelector('.msa-q-sezione').value = a.sezione || '';
      el.querySelector('.msa-q-importo').value = a.importo || '';
    });
  }
  function premi(classe) {
    const t = w.document.createElement('button'); t.className = classe;
    const esito = Q.click(t, corpo, S, salva);
    if (esito && Q.pendente(S)) disegna();
    return esito;
  }
  disegna();
  return {w,S,Q,corpo,compila,premi,disegna,salva,q:()=>Q.pendente(S),
    fallisci:() => {fallisci=true;}, salvati:()=>salvati};
}
function permutazioni(a) {
  if (!a.length) return [[]];
  return a.flatMap((x,i) => permutazioni(a.filter((_,j) => j!==i)).map(resto => [x,...resto]));
}
const documento = [riga('10','DARE',12.34), riga('20','DARE',7.66), riga('30','AVERE',20)];
const corretta = [risp('10','DARE','12,34'), risp('20','DARE','7.66'), risp('30','AVERE','20')];
for (const risposta of permutazioni(corretta)) {
  const p = scenario(documento), giornale = JSON.stringify(p.S.registrazioni);
  p.compila(risposta); p.premi('msa-q-verifica');
  ok(p.q().corretto, 'ogni permutazione della stessa scrittura è corretta');
  ok(p.q().totali.dare===2000 && p.q().totali.avere===2000, 'totali in centesimi');
  ok(p.q().cronologiaTentativi.length===1, 'un tentativo acquisito');
  ok(JSON.stringify(p.S.registrazioni)===giornale, 'giornale immutato');
  p.w.close();
}
for (const risposta of [
  [risp('20','DARE','12,34'), risp('10','DARE','7,66'), corretta[2]],
  corretta.map(a => ({...a,sezione:a.sezione==='DARE'?'AVERE':'DARE'})),
  [risp('10','DARE','12,35'), risp('20','DARE','7,65'), corretta[2]],
  [corretta[0], corretta[0], corretta[2]],
  [risp('50','DARE','12,34'), corretta[1], corretta[2]]
]) {
  const p = scenario(documento);
  p.compila(risposta); p.premi('msa-q-verifica');
  ok(!p.q().corretto, 'identità conto, sezione, centesimi e molteplicità contano');
  ok(p.Q.tentativoValido(p.q()), 'tentativo completo errato acquisito');
  ok(p.corpo.querySelector('.msa-q-aiuto'), 'aiuto disponibile solo dopo tentativo completo');
  p.w.close();
}
const duplicati = [riga('10','DARE',5),riga('10','DARE',5),riga('10','DARE',2),riga('10','AVERE',12)];
for (const risposta of [
  [risp('10','AVERE',12),risp('10','DARE',2),risp('10','DARE',5),risp('10','DARE',5)],
  [risp('10','AVERE',12),risp('10','DARE',5),risp('10','DARE',5),risp('10','DARE',2)]
]) {
  const p = scenario(duplicati); p.compila(risposta); p.premi('msa-q-verifica');
  ok(p.q().corretto, 'duplicati identici intercambiabili e stesso conto su entrambe le sezioni'); p.w.close();
}
for (const risposta of [
  [risp('10','DARE',4),risp('10','DARE',4),risp('10','DARE',4),risp('10','AVERE',12)],
  [risp('10','DARE',5),risp('10','DARE',2),risp('10','DARE',2),risp('10','AVERE',12)],
  [risp('10','DARE',10),risp('10','DARE',2),risp('10','AVERE',12)]
]) {
  const p = scenario(duplicati); p.compila(risposta); p.premi('msa-q-verifica');
  ok(!p.q().corretto, 'nessuna aggregazione, riuso di occorrenze o riga vuota accettati'); p.w.close();
}
for (const incompleta of [
  [], [corretta[0]], [risp('inesistente','DARE',12.34),corretta[1],corretta[2]],
  [risp('10','DARE','0'),corretta[1],corretta[2]],
  [risp('10','DARE','12,345'),corretta[1],corretta[2]],
  [risp('Conto omonimo','DARE',12.34),corretta[1],corretta[2]],
  [risp('Cass','DARE',12.34),corretta[1],corretta[2]]
]) {
  const p = scenario(documento);
  p.compila(incompleta); p.premi('msa-q-verifica');
  ok(!p.Q.tentativoValido(p.q()) && !p.q().tentativi, 'incompleto/non identificabile non acquisito');
  ok(!p.corpo.querySelector('.msa-q-aiuto') && !p.corpo.querySelector('.msa-q-soluzione'), 'nessun aiuto anticipato');
  ok(p.Q.protetto(p.S) && p.Q.visibili(p.S).length===0, 'giornale protetto');
  ok(!p.premi('msa-q-aiuto') && !p.premi('msa-q-continua'), 'anche eventi diretti non aggirano presidio');
  p.w.close();
}
{
  const p = scenario(documento);
  ok([...p.corpo.querySelectorAll('input,select')].every(el => !el.value), 'nessuna risposta precompilata');
  const conti = [...p.corpo.querySelectorAll('.msa-q-conto')];
  for (const input of conti) {
    ok(input.type==='search' && input.getAttribute('aria-label'), 'campo ricercabile con etichetta accessibile');
    const opzioni = [...p.w.document.getElementById(input.getAttribute('list')).options];
    ok(opzioni.length===piano.length, 'suggerimenti da intero piano, inclusi distrattori');
    ok(opzioni.every((o,i) => o.value.includes(piano[i].codice) && o.value.includes(piano[i].nome)), 'codice e descrizione ricercabili nativamente');
    ok(opzioni.some(o => o.value.includes('<formativi> & simulati')), 'descrizioni correttamente escaped');
  }
  const altro = scenario([riga('50','DARE',20),riga('20','AVERE',20)]);
  ok(p.corpo.querySelector('datalist').innerHTML===altro.corpo.querySelector('datalist').innerHTML, 'suggerimenti indipendenti dalla risposta attesa');
  altro.w.close();
  p.compila([risp('Cassa didattica','DARE','12,34'),risp('20 · Banca simulata','DARE','7,66'),corretta[2]]);
  p.Q.bozza(p.corpo,p.S,p.salva);
  ok(p.q().risposte[0].conto==='10' && p.q().risposte[1].conto==='20', 'descrizione univoca e suggerimento risolti al codice');
  ok(!p.Q.tentativoValido(p.q()), 'bozza completa non sblocca soluzione');
  const ripresa = scenario(documento,p.S);
  ok(ripresa.corpo.querySelector('.msa-q-conto').value==='10', 'bozza conto ripristinata');
  ripresa.premi('msa-q-verifica'); ok(ripresa.q().corretto, 'bozza ripristinata valutabile');
  ripresa.w.close(); p.w.close();
}
{
  const p = scenario(documento);
  delete p.q().versioneTentativo;
  p.q().tentativi = 1;
  p.q().risposte = [{sezione:'DARE',importo:''}];
  p.disegna();
  ok([...p.corpo.querySelectorAll('.msa-q-conto')].every(el => !el.value), 'bozza legacy incompleta non rivela conti attesi');
  ok(p.Q.protetto(p.S), 'clic legacy vuoto resta protetto anche con bozza');
  p.w.close();
}
{
  const p = scenario(documento), prima = JSON.stringify(p.S.msaRagioneria);
  p.compila(corretta); p.fallisci();
  ok(!p.premi('msa-q-verifica'), 'errore persistenza rilevato');
  ok(JSON.stringify(p.S.msaRagioneria)===prima && p.Q.protetto(p.S), 'rollback completo senza sblocco');
  ok(p.corpo.textContent.includes('Salvataggio non riuscito'), 'errore comunicato'); p.w.close();
}
{
  const p = scenario(documento);
  p.compila([risp('10','AVERE',12.34),corretta[1],corretta[2]]); p.premi('msa-q-verifica');
  ok(p.Q.visibili(p.S).length===1, 'tentativo completo sblocca confronto');
  p.premi('msa-q-aiuto');
  ok(p.q().aiuto && !p.q().corretto && p.corpo.querySelector('.msa-q-soluzione'), 'aiuto distinto da correttezza autonoma');
  p.premi('msa-q-continua');
  ok(p.S.msaRagioneria.esiti[0].conAiuto && p.S.msaRagioneria.coda.length===0, 'esito con aiuto conservato'); p.w.close();
}
console.log('OK: '+verifiche+' verifiche ordine, duplicati, centesimi, ricerca e presidio anti-soluzione');
