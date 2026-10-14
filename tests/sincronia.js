// sincronia.js in jsdom con un fetch finto: stato dal server, salvataggio, lavoro non salvato che vince, cambio allievo.
const {JSDOM} = require('jsdom');
const fs = require('fs');
const JS = fs.readFileSync(__dirname + '/../app/blueprints/sincronia/static/sincronia.js', 'utf8');
const K = 'ferro-transenne-fi-2026-vuoto-civilistico';
let errori = 0, store = {}, revServer = 3;
const ok = (c, m) => { if (!c) { errori++; console.log('✗', m); } };
const attesa = ms => new Promise(r => setTimeout(r, ms));

function pagina(sync, rispostaStato = 200) {
  const inviati = [];
  const dom = new JSDOM('<!doctype html><body></body>', {url: 'https://sim.local/vuoto/', runScripts: 'outside-only', pretendToBeVisual: true});
  const w = dom.window;
  Object.entries(store).forEach(([k, v]) => w.localStorage.setItem(k, v));
  w.fetch = (url, o) => { inviati.push({url, corpo: JSON.parse(o.body), csrf: o.headers['X-CSRF']}); if (url.includes('/api/stato')) revServer++;
    return Promise.resolve({ok: rispostaStato === 200, status: rispostaStato, json: () => Promise.resolve({rev: revServer})}); };
  w.MSA_SYNC = Object.assign({versione: 'vuoto', chiave: K, utente: 7, csrf: 'T', rev: 0, stato: null, urlStato: '/api/stato/vuoto', urlBattito: '/api/battito', battito: true}, sync);
  w.eval(JS);
  const salva = () => { store = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); store[k] = w.localStorage.getItem(k); } };
  return {w, inviati, salva, chiudi: () => { salva(); w.close(); }};
}

(async () => {
  // 1. il server ha il lavoro: finisce nel localStorage prima del simulatore
  let p = pagina({stato: '{"n":1}', rev: 3});
  ok(p.w.localStorage.getItem(K) === '{"n":1}', 'stato del server nel localStorage');
  ok(p.inviati.some(x => x.url === '/api/battito' && x.csrf === 'T'), 'battito all\'apertura');
  // 2. il simulatore salva → dopo 1,5 s arriva al server
  p.w.localStorage.setItem(K, '{"n":2}');
  ok(p.w.localStorage.getItem('msa-sporco-vuoto') === '1', 'segnale di lavoro non salvato');
  await attesa(1700);
  const s = p.inviati.filter(x => x.url === '/api/stato/vuoto');
  ok(s.length === 1 && s[0].corpo.stato === '{"n":2}' && s[0].corpo.csrf === 'T', 'salvataggio inviato al server');
  ok(p.w.localStorage.getItem('msa-sporco-vuoto') === null, 'conferma del server: segnale tolto');
  // 3. salvataggio interrotto dal cambio pagina: alla pagina dopo vince il lavoro locale e riparte l'invio
  p.w.localStorage.setItem(K, '{"n":3}');
  p.chiudi();
  p = pagina({stato: '{"n":2}', rev: revServer});
  ok(p.w.localStorage.getItem(K) === '{"n":3}', 'il lavoro locale non salvato non viene sovrascritto');
  await attesa(1700);
  ok(p.inviati.some(x => x.url === '/api/stato/vuoto' && x.corpo.stato === '{"n":3}'), 'il lavoro locale viene ricaricato sul server');
  p.chiudi();
  // 3b. il docente ha passato il suo lavoro all'allievo: il server è più nuovo del browser e vince anche sul lavoro in sospeso
  store[K] = '{"n":4}'; store['msa-sporco-vuoto'] = '1';
  p = pagina({stato: '{"docente":1}', rev: revServer + 5});
  ok(p.w.localStorage.getItem(K) === '{"docente":1}', 'lavoro passato dal docente: vince sul browser');
  ok(p.w.localStorage.getItem('msa-sporco-vuoto') === null, 'lavoro passato dal docente: niente da ricaricare');
  p.chiudi();
  // 4. un altro allievo sullo stesso browser non eredita il lavoro
  store[K] = '{"altro":1}'; store['msa-sporco-vuoto'] = '1';
  p = pagina({utente: 8, stato: null});
  ok(p.w.localStorage.getItem(K) === null, 'lavoro di un altro allievo tolto dal browser');
  await attesa(1700);
  ok(!p.inviati.some(x => x.url === '/api/stato/vuoto'), 'e non viene caricato a nome del nuovo allievo');
  p.chiudi();
  // 5. area allievo (senza simulatore): carica il lavoro rimasto in sospeso
  store = {[K]: '{"n":9}', 'msa-sporco-vuoto': '1', 'msa-utente': '7'};
  p = pagina({chiave: undefined, versione: undefined, stato: undefined});
  await attesa(50);
  ok(p.inviati.some(x => x.url === '/api/stato/vuoto' && x.corpo.stato === '{"n":9}'), 'area allievo: lavoro in sospeso caricato');
  ok(p.w.localStorage.getItem('msa-sporco-vuoto') === null, 'area allievo: segnale tolto dopo la conferma');
  p.chiudi();
  // 6. senza fetch (vecchi browser, test jsdom del simulatore) non si rompe nulla
  const dom = new JSDOM('<!doctype html><body></body>', {runScripts: 'outside-only', url: 'https://sim.local/'});
  dom.window.MSA_SYNC = {versione: 'vuoto', chiave: K, utente: 1, csrf: 'T', stato: '{"z":1}'};
  dom.window.eval(JS);
  dom.window.localStorage.setItem(K, '{"z":2}');
  ok(dom.window.localStorage.getItem(K) === '{"z":2}', 'senza fetch il simulatore funziona lo stesso');
  dom.window.close();
  console.log(errori ? `❌ ${errori} errori` : '✅ sincronia: stato dal server, salvataggio, lavoro non salvato, cambio allievo');
  process.exit(errori ? 1 : 0);
})();
