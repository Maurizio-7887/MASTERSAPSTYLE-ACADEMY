// Pannello: passi CO in versione semplice (cosa fai / cosa devi vedere) e «Saldi dei conti e appunti»
// interrogabili durante la ricostruzione della chiusura. node tests/pannello-saldi-semplice.js
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const G = f => fs.readFileSync(path.join(__dirname, '../app/blueprints/guida/static', f), 'utf8');
let n = 0;
function ok(c, m) { n++; if (!c) throw Error(m); }
function carica(S, pos) {
  const w = new JSDOM('<body><main></main></body>', {url: 'https://sim.local/vuoto/s4/controllo/report', runScripts: 'outside-only', pretendToBeVisual: true}).window;
  w.setInterval = () => 1; w.setTimeout = f => { f(); return 1; };
  if (pos != null) w.sessionStorage.setItem('msa-guida-pos-dicembre-wms', String(pos));
  w.localStorage.setItem('msa-guida-aperta', '1');
  let salvato = 0;
  w.MSA_STATO_CORRENTE = () => S; w.MSA_SALVA_STATO_CORRENTE = () => { salvato++; };
  w.MSA_GUIDA = {esercizio: 'dicembre-wms', versione: 'vuoto', chiave: 'dati', url: {'erp_controllo.report': '/vuoto/s4/controllo/report'}};
  for (const f of ['esercizi/dicembre-wms-legacy.js', 'esercizi/cpm-formas.js', 'esercizi/dicembre-wms.js', 'ragioneria.js', 'pannello.js']) w.eval(G(f));
  w.salvati = () => salvato;
  return w;
}
const apri = w => { const d = w.document.querySelector('details.msa-g-tools'); d.open = true; d.dispatchEvent(new w.Event('toggle')); };
const testo = w => w.document.querySelector('.msa-g-pannello').textContent;

// 1) tutti i passi del controllo di gestione hanno la versione semplice
let w = carica({});
const P = w.MSA_ESERCIZIO.passi, co = P.filter(p => /^(cpm|bpc)-/.test(p.id || ''));
ok(co.length === 18 && co.every(p => p.fai && p.fai.length && p.vedi && p.idea && p.mappa && p.grande), 'passi CO semplici con la mappa: ' + co.length);
ok(co[0].id === 'cpm-mappa' && P.indexOf(co[0]) < P.findIndex(p => p.id === 'cpm-attivazione'), 'introduzione prima del passo 1 del ciclo CO');
const k = P.findIndex(p => p.id === 'cpm-attivita');
w.close();
w = carica({}, k);
const t = testo(w);
ok(/Tappa 8 di 8 · Controllo/.test(t) && /A cosa serve/.test(t), 'mappa: dove sei');
ok(!!w.document.querySelector('.msa-g-grande') && /A CHE COSA SERVE QUESTO PASSO/.test(t), 'spiegazione a grandi lettere');
ok(/Cosa fai/.test(t) && /Cosa devi vedere/.test(t) && /260 ore × 28 = 7\.280/.test(t), 'report: cosa fai e cosa vedere');
ok(w.document.querySelectorAll('details.msa-g-piu').length === 2, 'spiegazioni e dati completi a scomparsa');
ok(/Da dove vengono i numeri/.test(t) && /S_ALR|riquadro|Residuo/.test(t), 'i testi completi restano disponibili');
w.close();

// 2) saldi interrogabili durante la ricostruzione dell'epilogo
const S = JSON.parse(fs.readFileSync(path.join(__dirname, 'dicembre-wms-finale.json'), 'utf8'));
const stato = S.stato || S;
const epi = stato.registrazioni.find(r => r.chiusura === 'epilogo');
// come nel programma: i tre documenti della chiusura entrano insieme nella coda del laboratorio
stato.msaRagioneria = {versione: 2, visti: {}, esiti: [], coda: stato.registrazioni.filter(r => ['epilogo', 'risultato', 'stato patrimoniale'].includes(r.chiusura))
  .map((r, i) => ({chiave: 'chiusura-' + i, documento: JSON.parse(JSON.stringify(r)), risposte: [], tentativi: 0}))};
// saldi attesi: tutto prima dell'epilogo e delle scritture successive
const att = {};
for (const r of stato.registrazioni) {
  if (r === epi || r.data > epi.data || r.chiusura) continue;
  for (const x of r.righe) att[x.conto] = (att[x.conto] || 0) + Math.round(x.importo * 100) * (x.dareAvere === 'DARE' ? 1 : -1);
}
const tipi = Object.fromEntries(stato.pianoDeiConti.map(c => [String(c.codice), c.tipo]));
const costi = Object.entries(att).filter(([c]) => tipi[c] === 'COSTO').reduce((s, [, v]) => s + v, 0) / 100;
const eur = v => v.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2});
w = carica(stato);
ok(/Ricostruisci la scrittura/.test(testo(w)), 'laboratorio della chiusura aperto');
const tools = w.document.querySelector('details.msa-g-tools');
ok(!!tools && !tools.querySelector('input'), 'saldi e appunti presenti, chiusi: nessuna casella in più nel laboratorio');
w.document.querySelector('.msa-g-vai-saldi').click();
ok(tools.open && !!tools.querySelector('.msa-g-tcerca'), 'il pulsante in alto apre i saldi');
ok(w.document.querySelector('.msa-g-tdata').value === epi.data.slice(0, 10), 'data predefinita = data del documento');
ok(testo(w).includes('Costi ' + eur(costi)), 'totale costi prima della chiusura ' + eur(costi));
ok(w.document.querySelector('.msa-g-riep').textContent.includes('✓ quadra'), 'il bilancio di verifica quadra');
// ricerca
const cerca = w.document.querySelector('.msa-g-tcerca');
cerca.value = 'banca'; cerca.dispatchEvent(new w.Event('input', {bubbles: true}));
const righe = [...w.document.querySelectorAll('.msa-g-saldi tr:not(.msa-g-tgr)')];
ok(righe.length >= 1 && righe.every(r => /banca/i.test(r.textContent)), 'ricerca per nome');
cerca.value = ''; cerca.dispatchEvent(new w.Event('input', {bubbles: true}));
// clic sul saldo di un costo: va nella casella dell'importo toccata per ultima
const imp = w.document.querySelector('.msa-q-riga[data-riga="0"] .msa-q-importo');
imp.dispatchEvent(new w.FocusEvent('focusin', {bubbles: true}));
const c80 = Object.keys(att).find(c => tipi[c] === 'COSTO' && att[c] > 0);
const btn = [...w.document.querySelectorAll('.msa-g-ins-imp')].find(b => b.closest('tr').querySelector('.msa-g-ins-conto').textContent === c80);
btn.click();
ok(w.document.querySelector('.msa-q-riga[data-riga="0"] .msa-q-importo').value === eur(att[c80] / 100), 'importo inserito nella casella del laboratorio');
ok((stato.msaRagioneria.coda[0].risposte[0] || {}).importo === eur(att[c80] / 100), 'la bozza del laboratorio è salvata');
const conto = w.document.querySelector('.msa-q-riga[data-riga="1"] .msa-q-conto');
conto.dispatchEvent(new w.FocusEvent('focusin', {bubbles: true}));
[...w.document.querySelectorAll('.msa-g-ins-conto')].find(b => b.textContent === c80).click();
ok(w.document.querySelector('.msa-q-riga[data-riga="1"] .msa-q-conto').value.startsWith(c80 + ' · '), 'conto inserito nella casella del laboratorio');
// la scrittura da ricostruire non è nei saldi (il conto 90 dell'epilogo non compare)
ok(![...w.document.querySelectorAll('.msa-g-ins-conto')].some(b => b.textContent === '90'), 'la soluzione non compare nei saldi');
// appunti salvati con il lavoro
const app = w.document.querySelector('.msa-g-appunti');
app.value = 'totale costi da chiudere'; app.dispatchEvent(new w.Event('input', {bubbles: true}));
ok(stato.msaAppunti['dicembre-wms'] === 'totale costi da chiudere' && w.salvati() > 0, 'appunti salvati nello stato');
w.close();
w = carica(stato); apri(w);
ok(w.document.querySelector('.msa-g-appunti').value === 'totale costi da chiudere', 'appunti ritrovati alla riapertura');
// «senza chiusura» dopo l'esercizio completato: torna il bilancio prima della chiusura
stato.msaRagioneria.coda = [];
w.close(); w = carica(stato); apri(w);
const sc = w.document.querySelector('.msa-g-tsc'); sc.checked = true; sc.dispatchEvent(new w.Event('change', {bubbles: true}));
const d = w.document.querySelector('.msa-g-tdata'); d.value = '2026-12-31'; d.dispatchEvent(new w.Event('change', {bubbles: true}));
ok(testo(w).includes('Costi ' + eur(costi)), 'senza chiusura: bilancio 2026 prima dell’epilogo');
w.close();
console.log('✓ Pannello semplice e saldi interrogabili: ' + n + ' controlli');

// 3) magazzino e produzione dell'esercizio di dicembre: stessi aiuti del controllo di gestione
{
  const G2 = f => fs.readFileSync(path.join(__dirname, '../app/blueprints/guida/static', f), 'utf8');
  const w2 = new JSDOM('<body></body>', {runScripts: 'outside-only'}).window;
  w2.MSA_STATO_CORRENTE = () => ({}); w2.MSA_GUIDA = {esercizio: 'dicembre-wms', chiave: 'x', url: {}};
  for (const f of ['esercizi/dicembre-wms-legacy.js', 'esercizi/cpm-formas.js', 'esercizi/dicembre-wms.js', 'esercizi/dicembre-wms-semplice.js']) w2.eval(G2(f));
  const GR = /^(1 · Preparazione: WMS|4 · CICLO|5 · |6 · |7 · |8 · |8b · |9 · |14 · Inventario)/;
  const mag = w2.MSA_ESERCIZIO.passi.filter(p => GR.test(p.g));
  ok(mag.length >= 70 && mag.every(p => p.fai && p.grande && p.vedi && p.mappa), 'magazzino e produzione: tutti i passi semplici ' + mag.length);
  const RX = /\b(D|A) ?\d{2}(\.\d{2})?\b(?! ?(h|ore|pz|kg|%|anni|mesi))/;
  ok(mag.filter(p => p.contabile).every(p => !RX.test(JSON.stringify([p.grande, p.fai, p.vedi]))), 'nessuna scrittura rivelata prima del tentativo');
  const rfp = mag.filter(p => /^RF: /.test(p.titolo));
  ok(rfp.length >= 12 && rfp.every(p => p.fai.some(r => /Conferma il compito/.test(r.fai))), 'pistola RF spiegata campo per campo');
  w2.close();
  console.log('✓ Magazzino e produzione punto per punto: ' + mag.length + ' passi');
}
