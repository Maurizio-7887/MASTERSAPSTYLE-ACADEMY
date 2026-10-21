// Solo dati sintetici, nessuna rete o azione reale. node tests/budget-guida-campi.js
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), key = 'budget-guida-test';
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const scripts = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js',
  'app/blueprints/erp_costi/static/copc-logica.js'];
let checks = 0;
function ok(v, text) { checks++; assert.ok(v, text); }
function near(a, b, text) { ok(Math.abs(a-b) < .006, text + ': ' + a); }
function fresh(saved) {
  const w = new JSDOM('<!doctype html><div id="lab"></div>', {url:'https://sim.local/', runScripts:'outside-only'}).window;
  w.confirm = () => true;
  if (saved) w.localStorage.setItem(key, JSON.stringify(saved));
  scripts.forEach(f => w.eval(read(f))); w.SD4.avvia(key); return w;
}
function render(w) { w.LAB_PAGINA = {chiave:key, pagina:'scheda'}; w.eval(read('app/blueprints/erp_costi/static/copc-pagine.js')); }
function field(w, id, v) { const x = w.document.getElementById(id); if (v !== undefined) x.value = v; return x; }
function click(w, form, action) { w.document.querySelector('[data-prefisso="'+form+'"] [data-azione="'+action+'"]').click(); }
let w = fresh(), n = w.SD4.N, cp = w.PC4.cpm;
n.avvia({modo:'costituzione', data:'2026-12-01'});
let before = JSON.stringify(n.S); render(w);
ok(JSON.stringify(n.S) === before && !cp.attivo(), 'render legacy non attiva CPM né muta lo stato');
field(w, 'cpm-start-conferma', 'ATTIVA'); click(w, 'cpm-start', 'start');
before = JSON.stringify(n.S); render(w);
ok(JSON.stringify(n.S) === before, 'aiuti e natura iniziale non modificano i dati');
const inputs = w.document.querySelectorAll('[data-prefisso="cpm-budget"] input, [data-prefisso="cpm-budget"] select');
for (const input of inputs) {
  const help = w.document.getElementById(input.getAttribute('aria-describedby'));
  ok(help && help.textContent.length > 70, 'guida esplicita e accessibile per '+input.id);
  ok(!help.id.startsWith('cpm-budget-'), 'aiuto non raccolto come campo dal motore');
}
const text = w.document.body.textContent;
for (const term of ['ammortamenti', 'vita utile', '28 €/h', '31,40 €/pz', '9.420', '10.500', 'stagionalità', 'snapshot', 'non prezzo di vendita']) {
  ok(text.includes(term), 'guida espone '+term);
}
for (const id of ['data','riferimento','centro','natura','importo']) {
  ok(!!field(w,'cpm-actual-'+id).getAttribute('aria-describedby'), 'guida fonte '+id);
}
const fi = JSON.stringify(n.S.registrazioni), materiali = JSON.stringify(n.S.materiali);
field(w,'cpm-budget-Taglio_personale','36.000,00');
field(w,'cpm-budget-vol_TR-STD','1.200'); click(w,'cpm-budget','budget');
ok(cp.modello().revisione === 2, 'salvataggio dal modulo incrementa solo la revisione prevista');
ok(w.document.querySelector('#cpm-budget-esito').classList.contains('ok'), 'budget valido accettato');
ok(JSON.stringify(n.S.registrazioni) === fi && JSON.stringify(n.S.materiali) === materiali, 'nessuna FI o modifica materiali');
cp.report().centri.forEach((r,i) => {
  near(r.budget,42000,'budget centro'); near(r.ribaltato,6000,'riparto non duplicato'); near(r.tariffa,28,'tariffa');
  near(r.oreRichieste,[300,240,480][i],'ore volume annuo'); near(r.saturazione,[20,16,32][i],'saturazione');
});
near(w.PC4.elementi('TR-STD',300).totale,9420,'esempio ordine mensile invariato');
function invalid(id, value, re) {
  const state = JSON.stringify(n.S), old = field(w,id).value; field(w,id,value); click(w,'cpm-budget','budget');
  const esito = field(w,'cpm-budget-esito');
  ok(esito.classList.contains('ko') && re.test(esito.textContent), 'errore leggibile per '+id);
  ok(esito.textContent.includes('dati precedenti restano invariati'), 'spiega mancato salvataggio');
  ok(JSON.stringify(n.S) === state && field(w,id).value === value, 'errore preserva stato e input da correggere');
  field(w,id,old);
}
invalid('cpm-budget-Taglio_orePiano','0',/ore tariffa/);
invalid('cpm-budget-Taglio_orePiano','1600',/capacità/);
invalid('cpm-budget-Taglio_personale','abc',/numerico/);
invalid('cpm-budget-produttivi','-1',/non negativo/);
invalid('cpm-budget-anno','2027',/annuale/);
field(w,'cpm-budget-driver','percentuali'); invalid('cpm-budget-Taglio_percentuale','50',/100%/);
field(w,'cpm-budget-Taglio_percentuale','50'); field(w,'cpm-budget-Piegatura_percentuale','30'); field(w,'cpm-budget-Saldatura_percentuale','20');
click(w,'cpm-budget','budget'); near(cp.tariffe().Taglio.ribaltato,9000,'percentuali esplicite restano ammesse');
// Le opzioni del consuntivo prevengono combinazioni centro/natura invalide senza scritture.
before = JSON.stringify(n.S);
let centro = field(w,'cpm-actual-centro'), natura = field(w,'cpm-actual-natura');
ok(Array.from(natura.options).map(x=>x.value).join('/') === 'personale/indiretti', 'nature reparti');
centro.value = 'Generale'; centro.dispatchEvent(new w.Event('change'));
ok(Array.from(natura.options).map(x=>x.value).join('/') === 'produttivi/amministrativi', 'nature Generale');
centro.value = 'Taglio'; centro.dispatchEvent(new w.Event('change'));
ok(natura.value === 'personale' && JSON.stringify(n.S) === before, 'cambio centro solo UI');
field(w,'cpm-actual-data','2026-12-31'); field(w,'cpm-actual-riferimento','PAG-SIM-2026-12-Taglio'); field(w,'cpm-actual-importo','3000');
click(w,'cpm-actual','actual');
ok(cp.modello().consuntivi.length === 1 && JSON.stringify(n.S.registrazioni) === fi, 'fonte analitica senza FI');
field(w,'cpm-actual-data','2026-12-31'); field(w,'cpm-actual-riferimento','PAG-SIM-2026-12-Taglio'); field(w,'cpm-actual-importo','3000');
before = JSON.stringify(n.S); click(w,'cpm-actual','actual');
ok(field(w,'cpm-actual-esito').textContent.includes('già rilevata') && JSON.stringify(n.S) === before, 'duplicati respinti');
w.eval(read('app/blueprints/guida/static/esercizi/cpm-formas.js'));
const guida = JSON.stringify(w.MSA_CPM_FORMAS);
for (const term of ['Ammortamenti senza duplicazioni','Capacità / Ore pianificate tariffa','Annuale vs mensile','Imputazione a una commessa mensile','9420','TFR']) ok(guida.includes(term),'esercizio descrive '+term);
// Compatibilità: apertura della pagina non modifica ordini legacy né snapshot già persistiti.
w.close();
const legacy = JSON.parse(read('tests/fixtures/dicembre-wms-legacy.json'));
w = fresh(legacy); before = JSON.stringify(w.SD4.N.S); render(w);
ok(JSON.stringify(w.SD4.N.S) === before && !w.PC4.cpm.attivo(), 'vecchi dati inalterati dopo apertura'); w.close();
w = fresh(); n = w.SD4.N; cp = w.PC4.cpm;
n.avvia({modo:'costituzione', data:'2026-12-01'}); cp.attiva({conferma:'ATTIVA'});
for (const materiale of ['TR-STD','SL-TAGLIO']) w.PC4.calcola({materiale,data:'2026-12-01'});
w.PC4.marca({}); w.PC4.rilascia({data:'2026-12-01',sostituisciBootstrap:'SOSTITUISCI'});
w.PP4.ordine({materiale:'TR-STD',qta:300,data:'2026-12-02'});
const piano = JSON.stringify(n.S.produzione[0].piano); render(w);
field(w,'cpm-budget-Taglio_personale','51000'); click(w,'cpm-budget','budget');
ok(JSON.stringify(n.S.produzione[0].piano) === piano, 'budget guidato preserva snapshot ordine avviato');
n.salva(); const saved = JSON.parse(w.localStorage.getItem(key)); w.close(); w = fresh(saved); render(w);
ok(JSON.stringify(w.SD4.N.S.produzione[0].piano) === piano, 'snapshot preservato al reload'); w.close();
console.log('✓ Budget guidato, aiuti campo per campo, annuale/mese, fonti e compatibilità: '+checks+' controlli');
