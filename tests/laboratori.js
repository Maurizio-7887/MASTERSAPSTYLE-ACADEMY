// I due laboratori di produzione eseguiti per intero: numeri di controllo, quadratura Dare = Avere, passi della guida.
// Salva gli stati finali in tests/lab-*-finale.json (servono a test_accessi per il report del docente).
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0;
const ok = (c, m) => { if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
function finestra() {
  const w = new JSDOM('<!doctype html><body></body>', {url: 'https://sim.local/vuoto/alta-varieta/', runScripts: 'outside-only'}).window;
  w.eval(R('app/static/js/lab-motore.js')); return w;
}
const saldo = (S, c) => Math.round(S.registrazioni.reduce((t, r) => t + r.righe.filter(x => x.conto === c).reduce((u, x) => u + (x.dareAvere === 'DARE' ? x.importo : -x.importo), 0), 0) * 100) / 100;
const quadra = S => { let d = 0, a = 0; S.registrazioni.forEach(r => r.righe.forEach(x => { if (x.dareAvere === 'DARE') d += x.importo; else a += x.importo; })); return Math.abs(d - a) < 0.005; };
function guida(w, file, S) {
  w.eval(R('app/blueprints/guida/static/esercizi/' + file));
  w.MSA_GUIDA = {esercizio: w.MSA_ESERCIZIO.codice, chiave: 'x', url: {}};
  w.eval(R('app/blueprints/guida/static/pannello.js'));
  return w.MSA_GUIDA_API.stati();
}

// ═══ 1) Alta varietà e disaccoppiamento ═══
{
  const w = finestra(); w.eval(R('app/blueprints/alta_varieta/static/hmlv-logica.js'));
  const H = w.HMLV; H.avvia('lab-hmlv');
  const S = () => H.M.S;
  const st0 = guida(w, 'hmlv-disaccoppiamento.js', S());
  ok(st0.filter(Boolean).length === 0, 'guida HMLV: nessun passo fatto all\'inizio');
  let bloccato = false; try { H.creaOrdine({mat: 'SL-PIEGA', qta: 600, data: '2026-11-04'}); } catch (e) { bloccato = /strategia DIP/.test(e.message); }
  ok(bloccato, 'senza strategia 70 il semilavorato non si produce a scorta');
  H.entrataFerro({data: '2026-11-03', kg: 5500, rif: 'DDT-FERRO-11'});
  H.impostaStrategia({mat: 'SL-PIEGA', strategia: '70'});
  ['TR-STD', 'TR-ALTA', 'TR-PED'].forEach(m => H.impostaStrategia({mat: m, strategia: '50'}));
  bloccato = false; try { H.creaOrdine({mat: 'TR-STD', qta: 100, data: '2026-11-04'}); } catch (e) { bloccato = /ordine cliente/.test(e.message); }
  ok(bloccato, 'strategia 50: niente assemblaggio senza ordine cliente');
  H.creaOrdine({mat: 'SL-PIEGA', qta: 600, data: '2026-11-04'});
  H.creaOrdine({mat: 'SL-TAGLIO', qta: 600, data: '2026-11-04'});
  const id = m => S().ordini.filter(o => o.mat === m).slice(-1)[0].id;
  H.prelievo({ordine: id('SL-TAGLIO'), mat: 'FERRO', qta: 4800, data: '2026-11-05'});
  H.conferma({ordine: id('SL-TAGLIO'), ore: 160, data: '2026-11-05'});
  H.entrata({ordine: id('SL-TAGLIO'), qta: 600, data: '2026-11-06'});
  H.prelievo({ordine: id('SL-PIEGA'), mat: 'SL-TAGLIO', qta: 600, data: '2026-11-10'});
  H.conferma({ordine: id('SL-PIEGA'), ore: 115, data: '2026-11-12'});
  H.entrata({ordine: id('SL-PIEGA'), qta: 400, data: '2026-11-20'});
  H.chiusura({periodo: '2026-11'});
  vicino(saldo(S(), '15'), 3900, 'WIP a fine novembre (conto 15)');
  vicino(saldo(S(), '61'), 280, 'varianza dell\'ordine Taglio');
  const lungo = H.commessaLunga(0);
  vicino(lungo.mesi[0].wipLungo, 12260, 'commessa lunga: WIP a fine novembre');
  H.entrata({ordine: id('SL-PIEGA'), qta: 200, data: '2026-12-03'});
  H.venditaCrea({cliente: 'Beta Costruzioni Srl', rif: 'BETA-300', mat: 'TR-STD', qta: 300, data: '2026-12-05'});
  H.venditaCrea({cliente: 'Delta Noleggi Srl', rif: 'DELTA-150', mat: 'TR-ALTA', qta: 150, data: '2026-12-05'});
  H.venditaCrea({cliente: 'Comune di Gamma', rif: 'GAMMA-100', mat: 'TR-PED', qta: 100, data: '2026-12-05'});
  [['TR-STD', 300, 126], ['TR-ALTA', 150, 75], ['TR-PED', 100, 28]].forEach(([m, q, h]) => {
    H.creaOrdine({mat: m, qta: q, data: '2026-12-06'});
    H.prelievo({ordine: id(m), mat: 'SL-PIEGA', qta: q, data: '2026-12-06'});
    if (m === 'TR-ALTA') H.prelievo({ordine: id(m), mat: 'FERRO', qta: 300, data: '2026-12-06'});
    if (m === 'TR-PED') H.prelievo({ordine: id(m), mat: 'FERRO', qta: 100, data: '2026-12-06'});
    H.conferma({ordine: id(m), ore: h, data: '2026-12-08'});
    H.entrata({ordine: id(m), qta: q, data: '2026-12-09'});
  });
  ['BETA-300', 'DELTA-150', 'GAMMA-100'].forEach(r => { const c = S().ordiniCliente.find(x => x.rif === r); H.consegna({ordineCliente: c.id, qta: c.qta, data: '2026-12-10'}); });
  vicino(saldo(S(), '41'), 17790, 'costo del venduto delle tre consegne');
  ok(H.leadTime().every(x => x.giorni === 5), 'lead time verso il cliente 5 giorni');
  S().ordini.forEach(o => { if (!o.liquidazione && !o.teco) H.teco({ordine: o.id, data: '2026-12-31'}); });
  H.chiusura({periodo: '2026-12'});
  vicino(saldo(S(), '15'), 0, 'WIP annullato a dicembre');
  vicino(saldo(S(), '61'), 252, 'varianze totali (280 − 140 + 168 + 0 − 56)');
  vicino(S().giacenze.FERRO, 300, 'ferro rimasto (kg)'); vicino(S().giacenze['SL-PIEGA'], 50, 'SL-PIEGA a scaffale');
  const b = H.buffer({adu: 20, dlt: 15, ltf: 0.5, vf: 0.5, moq: 200, doc: 10});
  vicino(b.cimaRosso, 225, 'buffer: cima rossa'); vicino(b.cimaGiallo, 525, 'buffer: cima gialla'); vicino(b.cimaVerde, 725, 'buffer: cima verde');
  ok(b.nfp === 50 && b.ordina === 675 && b.zona === 'rossa', 'buffer: NFP 50 in zona rossa → ordinare 675');
  const es = H.buffer({adu: 20, dlt: 15, ltf: 0.5, vf: 0.5, moq: 200, doc: 10, giacenza: 260, inArrivo: 150, domanda: 40});
  ok(es.nfp === 370 && es.ordina === 355 && Math.round(es.priorita) === 51, 'buffer: esempio del documento (NFP 370, ordina 355, 51%)');
  H.creaOrdine({mat: 'SL-PIEGA', qta: 675, data: '2027-01-02'});
  ok(H.buffer({adu: 20, dlt: 15, ltf: 0.5, vf: 0.5, moq: 200, doc: 10}).nfp === 725, 'buffer rifornito: NFP 725');
  ok(quadra(S()), 'HMLV: Dare = Avere');
  const st = guida(w, 'hmlv-disaccoppiamento.js', S());
  const passi = w.MSA_ESERCIZIO.passi, manc = passi.map((p, i) => p.fatto && !st[i] ? (i + 1) + '. ' + p.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida HMLV: passi non riconosciuti alla fine:\n  ' + manc.join('\n  '));
  fs.writeFileSync(path.join(__dirname, 'lab-hmlv-finale.json'), JSON.stringify(S()));
  console.log(`✅ laboratorio Alta varietà: WIP nov 3.900 · varianze 252 · lead time 5 gg · buffer 225/525/725 · guida ${passi.length} passi`);
}

// ═══ 2) Produzione ripetitiva (modello trattore) ═══
{
  const w = finestra(); w.eval(R('app/blueprints/ripetitiva/static/rem-logica.js'));
  const X = w.REM; X.avvia('lab-rem');
  const S = () => X.M.S;
  X.budget({anno: '2027', 'TR-STD': 2000, 'TR-ALTA': 1200, 'TR-PED': 800});
  ok(JSON.stringify(S().budget.pianoMensile) === JSON.stringify({'TR-STD': 167, 'TR-ALTA': 100, 'TR-PED': 67}), 'piano mensile 167/100/67');
  ['TR-STD', 'TR-ALTA', 'TR-PED'].forEach(m => { X.versione({mat: m}); X.collettore({mat: m, data: '2027-01-01'}); });
  X.entrataFerro({data: '2027-01-02', kg: 3500, rif: 'DDT-FERRO-01'});
  X.mfbf({mat: 'TR-STD', qta: 80, data: '2027-01-15'}); X.mfbf({mat: 'TR-ALTA', qta: 50, data: '2027-01-15'}); X.mfbf({mat: 'TR-PED', qta: 30, data: '2027-01-15'});
  X.mfbf({mat: 'TR-STD', qta: 85, data: '2027-01-31'}); X.mfbf({mat: 'TR-ALTA', qta: 48, data: '2027-01-31'}); X.mfbf({mat: 'TR-PED', qta: 37, data: '2027-01-31'});
  X.mfbf({mat: 'TR-STD', qta: 20, data: '2027-01-31', modo: 'punto'});
  X.mfbf({mat: 'TR-STD', qta: 3, data: '2027-01-31', modo: 'scarto'});
  X.prelievoExtra({mat: 'TR-ALTA', kg: 40, data: '2027-01-31', motivo: 'sfrido prolunghe'});
  X.chiusura({periodo: '2027-01'});
  vicino(saldo(S(), '15'), 404, 'WIP al target a fine gennaio');
  const v = m => S().collettori[m].periodi[0].varianza;
  vicino(v('TR-STD'), 94.2, 'varianza gennaio TR-STD (3 pezzi scartati)'); vicino(v('TR-ALTA'), 38, 'varianza gennaio TR-ALTA (40 kg di sfrido)'); vicino(v('TR-PED'), 0, 'varianza gennaio TR-PED');
  vicino(saldo(S(), '73'), -(10698.65 + 132.2), 'output a standard + liquidazione varianze');
  X.entrataFerro({data: '2027-02-03', kg: 3000, rif: 'DDT-FERRO-02'});
  X.mfbf({mat: 'TR-STD', qta: 20, data: '2027-02-05', modo: 'dalPunto'});
  X.mfbf({mat: 'TR-STD', qta: 150, data: '2027-02-20'}); X.mfbf({mat: 'TR-ALTA', qta: 90, data: '2027-02-20'}); X.mfbf({mat: 'TR-PED', qta: 60, data: '2027-02-20'});
  X.chiusura({periodo: '2027-02'});
  vicino(saldo(S(), '15'), 0, 'WIP di febbraio annullato');
  ok(['TR-STD', 'TR-ALTA', 'TR-PED'].every(m => Math.abs(S().collettori[m].periodi[1].varianza) < 0.005), 'febbraio: varianze di periodo a zero');
  vicino(S().giacenze.FERRO, 733, 'ferro rimasto (kg)');
  ok(quadra(S()), 'REM: Dare = Avere');
  const st = guida(w, 'rem-trattore.js', S());
  const passi = w.MSA_ESERCIZIO.passi, manc = passi.map((p, i) => p.fatto && !st[i] ? (i + 1) + '. ' + p.titolo : null).filter(Boolean);
  ok(!manc.length, 'guida REM: passi non riconosciuti alla fine:\n  ' + manc.join('\n  '));
  fs.writeFileSync(path.join(__dirname, 'lab-rem-finale.json'), JSON.stringify(S()));
  console.log(`✅ laboratorio Produzione ripetitiva: piano 167/100/67 · WIP gen 404 · varianze gen 132,20 · feb 0 · guida ${passi.length} passi`);
}
process.exit(errori ? 1 : 0);
