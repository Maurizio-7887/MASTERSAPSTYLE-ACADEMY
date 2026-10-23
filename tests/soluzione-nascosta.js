// La finestra a destra non deve mai mostrare la scrittura in partita doppia prima del tentativo dell'allievo.
// 1) ogni passo contabile è marcato e i testi visibili prima del tentativo (campi, nota) non contengono conti Dare/Avere;
// 2) il pannello reale nasconde «Scrittura / controllo atteso» e le spiegazioni «dopo» finché il passo non è registrato,
//    e chiede all'allievo di registrare e ricostruire lui la scrittura; dopo la registrazione le mostra.
// (La domanda di ragioneria per ogni documento creato è verificata dagli E2E: «domande corrispondono ai nuovi documenti».)
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const G = f => fs.readFileSync(path.join(__dirname, '../app/blueprints/guida/static', f), 'utf8');
let n = 0;
function ok(c, m) { n++; if (!c) throw Error(m); }
const SCRITTURA = /\b(D|A) ?\d{2}(\.\d{2})?\b(?! ?(h|ore|pz|kg|%|anni|mesi))/;
const ESERCIZI = {
  'dicembre-wms': {file: ['cpm-formas', 'dicembre-wms'], minimo: 48},
  'ragioneria-wms': {file: ['ragioneria-wms'], minimo: 35},
  'completo-formas': {file: ['cpm-formas', 'dicembre-wms', 'magazzino-formas', 'laboratori-completi', 'uso-programma', 'completo-formas'], minimo: 48}
};
function carica(codice, S, pos) {
  const w = new JSDOM('<body><main></main></body>', {url: 'https://sim.local/vuoto/s4/dati/', runScripts: 'outside-only', pretendToBeVisual: true}).window;
  w.setInterval = () => 1; w.setTimeout = f => { f(); return 1; };
  if (pos != null) w.sessionStorage.setItem('msa-guida-pos-' + codice, String(pos));
  w.MSA_STATO_CORRENTE = () => S; w.MSA_SALVA_STATO_CORRENTE = () => {};
  w.MSA_GUIDA = {esercizio: codice, versione: 'vuoto', chiave: 'dati', url: {}};
  ESERCIZI[codice].file.forEach(f => w.eval(G('esercizi/' + f + '.js')));
  return w;
}
for (const [codice, e] of Object.entries(ESERCIZI)) {
  const w = carica(codice, {}), E = w.MSA_ESERCIZIO, contabili = E.passi.filter(p => p.contabile);
  ok(E.verificaRagioneria === true, codice + ': laboratorio di ragioneria attivo');
  ok(contabili.length >= e.minimo, codice + ': passi contabili marcati ' + contabili.length + ' (minimo ' + e.minimo + ')');
  for (const p of contabili) {
    ok(!SCRITTURA.test(p.nota || ''), codice + ': la nota visibile prima del tentativo rivela la scrittura in «' + p.titolo + '»');
    for (const c of p.campi || []) ok(!SCRITTURA.test(c[1]), codice + ': un campo rivela la scrittura in «' + p.titolo + '»: ' + c[1]);
  }
  if (codice !== 'completo-formas')   // i laboratori FORMAS separati non fanno parte del caso principale
    for (const p of E.passi) if (SCRITTURA.test(p.attesa || '')) ok(p.contabile, codice + ': passo con scrittura non marcato contabile: «' + p.titolo + '»');
  ok(E.passi.filter(p => /^Riapri i conti/.test(p.titolo)).every(p => p.contabile), codice + ': la riapertura si ricostruisce prima di vedere la soluzione');
  w.close();
}
// epilogo, chiusura nello stato patrimoniale e riapertura generano la domanda di ragioneria come gli altri documenti
ok(!/quiz: *false/.test(fs.readFileSync(path.join(__dirname, '../app/blueprints/erp_chiusura/static/ch-logica.js'), 'utf8')), 'chiusura e riapertura non escluse dal laboratorio di ragioneria');
// pannello reale: ragioneria, passo 2 «Avvia l'azienda didattica» (contabile)
function corpo(w) { return w.document.querySelector('.msa-g-pannello').textContent; }
let w = carica('ragioneria-wms', {}, 1); w.eval(G('pannello.js'));
ok(w.MSA_GUIDA_API.passo() === 1, 'pannello sul passo contabile');
ok(!w.document.querySelector('.msa-g-attesa') && !/81\.785/.test(corpo(w)), 'scrittura attesa nascosta prima della registrazione');
ok(/Registra l’operazione nel programma/.test(corpo(w)) && /partita doppia/.test(corpo(w)), 'il pannello chiede all’allievo di registrare e ricostruire lui la scrittura');
w.close();
w = carica('ragioneria-wms', {avviato: '2027-01-02'}, 1); w.eval(G('pannello.js')); w.MSA_GUIDA_API.vaiA(1, true);
ok(!!w.document.querySelector('.msa-g-attesa') && /81\.785/.test(corpo(w)), 'dopo la registrazione la soluzione compare');
w.close();
// dicembre: le spiegazioni «dopo» (righe per dipendente, righe per cespite) restano nascoste fino al tentativo
w = carica('dicembre-wms', {}); const P = w.MSA_ESERCIZIO.passi;
const kPaghe = P.findIndex(p => p.titolo === 'Registra le paghe in contabilità'), kAfab = P.findIndex(p => /^AFAB/.test(p.titolo));
ok(kPaghe > 0 && kAfab > 0 && P[kPaghe].contabile && P[kAfab].contabile && P[kPaghe].dopo && P[kAfab].dopo, 'paghe e AFAB contabili con spiegazione dopo il tentativo');
w.close();
for (const k of [kPaghe, kAfab]) {
  w = carica('dicembre-wms', {}, k); w.eval(G('pannello.js'));
  ok(w.MSA_GUIDA_API.passo() === k, 'pannello sul passo ' + P[k].titolo);
  ok(!w.document.querySelector('.msa-g-attesa') && corpo(w).indexOf(P[k].dopo.slice(0, 40)) < 0 && !/7\.529,17|241,67/.test(corpo(w)), 'soluzione nascosta: ' + P[k].titolo);
  ok(/Registra l’operazione nel programma/.test(corpo(w)), 'richiesta di tentativo: ' + P[k].titolo);
  w.close();
}
console.log('OK: ' + n + ' verifiche — la scrittura in partita doppia resta nascosta fino al tentativo dell’allievo');
