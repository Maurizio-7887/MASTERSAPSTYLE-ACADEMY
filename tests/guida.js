// La finestra «Esercizio passo passo»: ogni passo con controllo automatico risulta fatto sullo stato finale
// dell'esercizio (prodotto da test:file-unico) e non fatto su un'azienda appena creata.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const dir = path.join(__dirname, '../app/blueprints/guida/static');
const FINALE = JSON.parse(fs.readFileSync(path.join(__dirname, 'stato-finale.json'), 'utf8')).stato;
const K = 'ferro-transenne-fi-2026-vuoto-civilistico';
let errori = 0;
function pagina(stato) {
  const dom = new JSDOM('<!doctype html><body></body>', {url: 'https://sim.local/vuoto/', runScripts: 'outside-only', pretendToBeVisual: true});
  const w = dom.window;
  if (stato) w.localStorage.setItem(K, JSON.stringify(stato));
  w.MSA_GUIDA = {esercizio: 'guidato-dic-2026', chiave: K, url: {'contabilita.fi_gl': '/vuoto/contabilita/fi-gl', 'produzione.pp': '/vuoto/produzione/'}};
  w.eval(fs.readFileSync(path.join(dir, 'esercizi/guidato-dic-2026.js'), 'utf8'));
  w.eval(fs.readFileSync(path.join(dir, 'pannello.js'), 'utf8'));
  return w;
}
const w = pagina(FINALE), passi = w.MSA_ESERCIZIO.passi, st = w.MSA_GUIDA_API.stati();
const mancanti = passi.map((p, i) => p.fatto && st[i] !== 'auto' ? (i + 1) + '. ' + p.titolo : null).filter(Boolean);
if (mancanti.length) { errori++; console.log('✗ passi non riconosciuti sullo stato finale:\n  ' + mancanti.join('\n  ')); }
const auto = passi.filter(p => p.fatto).length;
const vuoto = pagina({registrazioni: [], fi: {costituzione: '2026-12-01', preset: 'nuova'}, sdmm: {}, pp: {}, centriDiCosto: []});
const st0 = vuoto.MSA_GUIDA_API.stati();
const giaFatti = st0.map((x, i) => x ? i : null).filter(x => x !== null);
if (giaFatti.join() !== '0') { errori++; console.log('✗ su azienda nuova risultano già fatti: ' + giaFatti.map(i => passi[i].titolo).join(', ')); }
if (vuoto.MSA_GUIDA_API.passo() !== 1) { errori++; console.log('✗ la finestra dovrebbe aprirsi sul passo 2, è sul ' + (vuoto.MSA_GUIDA_API.passo() + 1)); }
// spunta a mano: resta nello stato del simulatore
vuoto.MSA_GUIDA_API.apri(true);
vuoto.MSA_GUIDA_API.vaiA(passi.findIndex(p => !p.fatto));
vuoto.document.querySelector('.msa-g-mano').click();
const salvato = JSON.parse(vuoto.localStorage.getItem(K));
if (!salvato.msaGuida || !salvato.msaGuida['guidato-dic-2026'][passi.find(p => !p.fatto).titolo]) { errori++; console.log('✗ la spunta a mano non è salvata nello stato'); }
console.log(errori ? `❌ ${errori} errori` : `✅ guida passo passo: ${passi.length} passi, ${auto} spuntati da soli sullo stato finale, nessuno su azienda nuova`);
process.exit(errori ? 1 : 0);
