// ⚡ Check rapido del docente: il verdetto «perché è ferma» nelle situazioni tipiche, con i veri controlli del tutor.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let n = 0; const ok = (c, m) => { n++; if (!c) { console.log('✗ ' + m); process.exitCode = 1; } };
const CATENA = {'dicembre-magazzino': ['dicembre-wms.js', 'dicembre-wms-semplice.js', 'dicembre-magazzino.js'],
  'dicembre-wms': ['dicembre-wms-legacy.js', 'cpm-formas.js', 'dicembre-wms.js', 'dicembre-wms-semplice.js']};
function check(es, stato, pos, diario, passiServer) {
  const w = new JSDOM('<!doctype html><body><div id="ck-corpo"></div></body>', {url: 'https://sim.local/docente/allievo/1/check', runScripts: 'outside-only'}).window;
  w.CK = {esercizio: es, pos, massimo: pos, passiServer: passiServer || {}, diario: diario || [], stato: JSON.stringify(stato)};
  CATENA[es].forEach(f => w.eval(R('app/blueprints/guida/static/esercizi/' + f)));
  w.eval(R('app/static/js/check-allievo.js'));
  const out = {esito: w.CK_ESITO, html: w.document.getElementById('ck-corpo').innerHTML, passi: w.MSA_ESERCIZIO.passi};
  w.close(); return out;
}
const finale = JSON.parse(R('tests/fixtures/dicembre-magazzino-finale.json'));
const idx = (passi, t) => passi.findIndex(p => p.titolo.indexOf(t) >= 0);
// A · operazione non registrata (magazzino W100 non attivo) con un errore del programma nel diario
{ const s = JSON.parse(JSON.stringify(finale)); delete s.wm;
  let r = check('dicembre-magazzino', s, 0); const k = idx(r.passi, 'Attiva il magazzino W100');
  r = check('dicembre-magazzino', s, k, [{quando: '12/11 10:01:02', tipo: 'errore', testo: 'Data non valida: prima della costituzione', passo: (k + 1) + '. ' + r.passi[k].titolo},
    {quando: '12/11 10:01:00', tipo: 'clic', testo: 'Attiva il magazzino W100', passo: (k + 1) + '. ' + r.passi[k].titolo}]);
  ok(/non è ancora registrato/.test(r.esito.motivi.join()), 'A: verdetto «non registrato» ' + r.esito.motivi);
  ok(/Data non valida/.test(r.html), 'A: mostra l’errore del programma');
  ok(/Che cosa doveva fare/.test(r.html) && /01\/12\/2026/.test(r.html), 'A: mostra i valori della guida'); }
// B · lettura non spuntata
{ let r = check('dicembre-magazzino', finale, 0); const k = idx(r.passi, 'Leggi la distinta base');
  r = check('dicembre-magazzino', finale, k);
  ok(/è una lettura: deve premere «✓ Fatto»/.test(r.esito.motivi.join()), 'B: lettura da spuntare ' + r.esito.motivi);
  r = check('dicembre-magazzino', finale, k, [], {[k]: {titolo: r.passi[k].titolo, stato: 'mano'}});
  ok(!/è una lettura/.test(r.esito.motivi.join()), 'B: spuntata a mano → nessun blocco'); }
// C · domanda di ragioneria aperta (Dicembre con ragioneria)
{ const s = JSON.parse(JSON.stringify(finale)); s.quizContabile = true; delete s.corsoMagazzino;
  s.msaRagioneria = {visti: [], coda: [{chiave: 'x', documento: s.registrazioni[1], risposte: [], tentativi: 0}]};
  const r = check('dicembre-wms', s, 30);
  ok(/domanda di ragioneria aperta/.test(r.esito.motivi[0]), 'C: domanda di ragioneria aperta per prima ' + r.esito.motivi[0]); }
// D · passo già fatto nei dati: deve premere Avanti
{ let r = check('dicembre-magazzino', finale, 0); const k = idx(r.passi, 'ME21N: ordina 3.000 kg');
  r = check('dicembre-magazzino', finale, k);
  ok(/già fatto nei suoi dati: deve solo premere «Avanti/.test(r.esito.motivi.join()), 'D: già fatto ' + r.esito.motivi);
  ok(/I passi fino al/.test(r.html) && /Ultime registrazioni/.test(r.html), 'D: tabella dei passi e registrazioni'); }
console.log((process.exitCode ? '✗' : '✓') + ' check rapido del docente: ' + n + ' controlli');
