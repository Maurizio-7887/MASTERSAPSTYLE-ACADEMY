const fs=require('fs'),path=require('path'),assert=require('assert');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'app/static/js/erp/presidio-didattico.js'),'utf8');
let n=0;function ok(x,m){assert.ok(x,m);n++;}
function apri(S,slot='erp-ft'){
 const d=new JSDOM('<html><head></head><body><main><div id="lab"><p id="soluzione">Dare magazzino / Avere fornitore</p></div></main><div id="msa-guida"><button class="msa-g-apri"></button></div></body></html>',{url:'https://academy.invalid',runScripts:'outside-only'});
 const w=d.window;w.LAB_PAGINA={slot,chiave:'prova-'+slot};w.localStorage.setItem(w.LAB_PAGINA.chiave,JSON.stringify(S));w.eval(code);return w;
}
let w=apri({msaRagioneria:{coda:[{tentativi:1,risposte:[]}]}});
ok(w.document.documentElement.classList.contains('msa-prima-tentativo'),'clic vuoto vecchio non sblocca');
ok(w.document.querySelector('#lab').inert,'contenuto non interagibile');
ok(w.document.querySelector('#msa-presidio').hidden===false,'istruzioni alternative visibili');
ok(!w.document.querySelector('#msa-guida').hidden,'quiz non nascosto');
w.localStorage.setItem(w.LAB_PAGINA.chiave,JSON.stringify({msaRagioneria:{coda:[{tentato:true,cronologiaTentativi:[{valido:true}]}]}}));
w.dispatchEvent(new w.Event('msa:quiz-aggiornato'));
ok(!w.MSA_PRESIDIO.bloccato(),'tentativo valido sblocca anche prima correzione');
ok(w.document.querySelector('#msa-presidio').hidden,'avviso rimosso dopo tentativo');
w.localStorage.setItem(w.LAB_PAGINA.chiave,JSON.stringify({msaRagioneria:{coda:[{tentato:false}]}}));
w.dispatchEvent(new w.Event('storage'));ok(w.MSA_PRESIDIO.bloccato(),'nuova scrittura altra scheda riblocca');
w.dispatchEvent(new w.Event('beforeprint'));ok(w.document.documentElement.classList.contains('msa-prima-tentativo'),'stampa resta protetta');
w=apri({registrazioni:[]});ok(!w.MSA_PRESIDIO.bloccato(),'azienda vuota non bloccata');
ok(w.document.querySelector('#msa-presidio').hidden,'avviso nascosto azienda vuota');
w=apri({msaRagioneria:{coda:[{}]}},'altro-lab');ok(!w.MSA_PRESIDIO,'altri laboratori invariati');
console.log(`OK: ${n} controlli del presidio didattico comune`);
