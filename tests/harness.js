// Harness: carica il simulatore in jsdom, con localStorage persistente tra "reload".
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('fs');
const HTML = fs.readFileSync(process.argv[2] || __dirname + '/../static/simulatori/ferro-transenne-vuoto.html', 'utf8');
let store = {};
let W = null;
const log = [];
function boot(){
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => log.push('JSDOMERR ' + (e.message||e)));
  vc.on('error', e => log.push('ERR ' + e));
  const dom = new JSDOM(HTML, {url:'https://sim.local/', runScripts:'dangerously', pretendToBeVisual:true, virtualConsole:vc,
    beforeParse(w){
      Object.entries(store).forEach(([k,v]) => w.localStorage.setItem(k,v));
      w.confirm = () => true; w.alert = () => {};
      w.HTMLElement.prototype.scrollIntoView = function(){};
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      if(!w.structuredClone) w.structuredClone = x => JSON.parse(JSON.stringify(x));
    }});
  W = dom.window;
  // intercetta reload
  try{ Object.defineProperty(W.location, 'reload', {value: () => { save(); W.__reloaded = true; }}); }catch(e){}
  return W;
}
function save(){ store = {}; for(let i=0;i<W.localStorage.length;i++){ const k=W.localStorage.key(i); store[k]=W.localStorage.getItem(k);} }
function reload(){ save(); return boot(); }
module.exports = {boot, reload, save, get W(){return W;}, log, get store(){return store;}, set store(s){store=s;}};
