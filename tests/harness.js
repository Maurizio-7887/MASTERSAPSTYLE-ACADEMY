// Harness: carica il simulatore in jsdom, con localStorage persistente tra "reload".
// Due modi:
//   file unico   node tests/esercizio.js sorgenti/simulatore-vuoto.html
//   multipagina  node tests/esercizio.js tests/_pagine   (pagine dei blueprint, vedi componi_tutte.py)
// In multipagina ogni cambio pagina chiesto dal programma (ponte-pagine.js) apre davvero la pagina
// di arrivo: localStorage e sessionStorage (coda delle azioni) passano da una pagina all'altra.
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs'), path = require('path');
const ARG = process.argv[2] || __dirname + '/../sorgenti/simulatore-vuoto.html';
const MULTI = fs.statSync(ARG).isDirectory();
const INDICE = MULTI ? JSON.parse(fs.readFileSync(path.join(ARG, 'indice.json'), 'utf8')) : null;
const cache = {};
let store = {}, sess = {}, W = null, urlCorrente = MULTI ? '/vuoto/impostazioni/' : '/';
const log = [], visitate = [];
function html(url){
  if(!MULTI) return cache[ARG] || (cache[ARG] = fs.readFileSync(ARG, 'utf8'));
  const f = INDICE[url]; if(!f) throw Error('pagina non composta: ' + url);
  return cache[f] || (cache[f] = fs.readFileSync(path.join(ARG, f), 'utf8'));
}
function boot(url){
  if(url) urlCorrente = url;
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { const m = String(e.message||e); if(!/Not implemented/.test(m)) log.push('JSDOMERR ' + urlCorrente + ' ' + m); });
  vc.on('error', e => log.push('ERR ' + urlCorrente + ' ' + e));
  const dom = new JSDOM(html(urlCorrente), {url:'https://sim.local' + urlCorrente, runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w){
      Object.entries(store).forEach(([k,v]) => w.localStorage.setItem(k,v));
      Object.entries(sess).forEach(([k,v]) => w.sessionStorage.setItem(k,v));
      w.confirm = () => true; w.alert = () => {};
      w.HTMLElement.prototype.scrollIntoView = function(){};
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      if(!w.structuredClone) w.structuredClone = x => JSON.parse(JSON.stringify(x));
      w.__msaNaviga = u => { w.__navPending = u; };
    }});
  W = dom.window;
  // il test è sincrono: in jsdom DOMContentLoaded arriverebbe solo a fine test, lo inviamo subito come farebbe il browser
  if(MULTI && W.document.readyState === 'loading') W.document.dispatchEvent(new W.Event('DOMContentLoaded'));
  if(MULTI && !visitate.includes(urlCorrente)) visitate.push(urlCorrente);
  try{ Object.defineProperty(W.location, 'reload', {value: () => { save(); W.__reloaded = true; }}); }catch(e){}
  return W;
}
function dump(st){ const o = {}; for(let i=0;i<st.length;i++){ const k = st.key(i); o[k] = st.getItem(k); } return o; }
function save(){ store = dump(W.localStorage); sess = dump(W.sessionStorage); }
function reload(){ save(); return boot(); }
// se il programma ha chiesto un cambio pagina, lo esegue (anche più salti di fila)
function segui(){ let n = 0; while(W.__navPending){ if(++n > 5) throw Error('troppi cambi pagina'); const u = W.__navPending; save(); boot(u); } return W; }
module.exports = {boot, reload, save, segui, MULTI, visitate, get W(){return W;}, get url(){return urlCorrente;}, log, get store(){return store;}, set store(s){store=s;}};
