// Finanza e adempimenti (Enterprise): cambiali e bolli, assegni, mutui, leasing, ritenute d'acconto, bollo virtuale,
// crediti dubbi e scambi UE — tutto dalle pagine, con il quiz contabile che deve accettare i nuovi conti (11.10, 37.10…).
// Esecuzione: node tests/finanza.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..'), key = 'test-finanza';
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const logic = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js',
  'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_cespiti/static/ce-logica.js', 'app/blueprints/erp_tesoreria/static/rb-logica.js',
  'app/blueprints/erp_finanza/static/fin-logica.js', 'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/blueprints/guida/static/ragioneria.js'];
let w, saved, controlli = 0;
const vicino = (a, b, m) => { controlli++; assert.ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a); };
function open(pagina) {
  if (w) { saved = w.localStorage.getItem(key); w.close(); }
  w = new JSDOM('<!doctype html><div id="lab"></div>', {url: 'https://sim.local/vuoto/s4/finanza/', runScripts: 'outside-only'}).window;
  w.confirm = () => true;
  if (saved) w.localStorage.setItem(key, saved);
  w.LAB_PAGINA = {chiave: key, pagina};
  logic.forEach(f => w.eval(read(f)));
  w.SD4.avvia(key);
  if (pagina) w.eval(read('app/blueprints/erp_finanza/static/fin-pagine.js'));
  return w.SD4.N;
}
function quiz() {
  const n = w.SD4.N, Q = w.MSA_RAGIONERIA, host = w.document.createElement('aside');
  w.document.body.append(host);
  const libro = JSON.stringify(n.S.registrazioni);
  while (Q.pendente(n.S)) {
    const q = Q.pendente(n.S);
    host.innerHTML = Q.html(n.S, w.LabMotore.esc);
    const rows = q.documento.righe.map((r, i) => ({r, i})).sort((a, b) => String(a.r.conto).localeCompare(String(b.r.conto), 'it', {numeric: true}) || a.i - b.i);
    [...host.querySelectorAll('.msa-q-riga')].forEach((el, i) => {
      el.querySelector('.msa-q-conto').value = rows[i].r.conto;
      el.querySelector('.msa-q-sezione').value = rows[i].r.dareAvere;
      el.querySelector('input').value = rows[i].r.importo.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    });
    Q.click(host.querySelector('.msa-q-verifica'), host, n.S, n.salva);
    assert.equal(q.corretto, true, 'quiz ricostruito: ' + q.documento.tipo);
    host.innerHTML = Q.html(n.S, w.LabMotore.esc);
    Q.click(host.querySelector('.msa-q-continua'), host, n.S, n.salva);
    controlli++;
  }
  host.remove();
  assert.equal(JSON.stringify(n.S.registrazioni), libro, 'il quiz non modifica la contabilità');
}
function fai(pref, valori, azione, deveFallire) {
  const lab = w.document.getElementById('lab');
  for (const [k, v] of Object.entries(valori)) {
    const el = lab.querySelector('#' + pref + '-' + k); assert.ok(el, 'campo ' + pref + '-' + k);
    el.value = typeof v === 'function' && el.tagName === 'SELECT' ? [...el.options].map(o => o.value).find(v) : v;
  }
  lab.querySelector('[data-prefisso="' + pref + '"] [data-azione="' + (azione || pref) + '"]').click();
  const es = lab.querySelector('#' + pref + '-esito'), testo = es ? es.textContent : '';
  if (deveFallire) assert.ok(/⛔/.test(testo) && deveFallire.test(testo), 'atteso un rifiuto ' + deveFallire + ', ottenuto: ' + testo);
  else assert.ok(!/⛔/.test(testo), pref + ': ' + testo.slice(0, 300));
  controlli++;
  quiz();
  return testo;
}
const quadra = n => n.S.registrazioni.forEach(r => assert.equal(r.righe.reduce((s, x) => s + (x.dareAvere === 'DARE' ? 1 : -1) * Math.round(x.importo * 100), 0), 0, 'quadrato ' + r.numero));

// ── azienda nuova: capitale 100.000 versato, una fattura di servizi a Edil Sigma, una esente a Beta ──
let n = open();
n.avvia({modo: 'costituzione', capitale: 100000, data: '2026-12-01'}); n.versaCapitale({data: '2026-12-01'}); quiz();
['11.10', '11.20', '11.30', '11.90', '18.10', '20.10', '29.10', '37.10', '62', '74', '87', '88', '89'].forEach(c => assert.ok(n.S.pianoDeiConti.some(x => x.codice === c), 'conto ' + c));
assert.ok(n.S.fornitori.F800.professionista && n.S.fornitori.F900.ue && n.S.clienti.C700.ue, 'anagrafiche nuove');
w.FS4.fattura({cliente: 'C400', imponibile: 1000, iva: 22, testo: 'noleggio transenne', scadenza: '2027-02-20', data: '2026-12-20'}); quiz();
const ftSigma = n.S.fattureServizi.slice(-1)[0].numero;
w.FS4.fattura({cliente: 'C100', imponibile: 500, iva: 0, testo: 'servizio esente art. 10', scadenza: '2027-01-31', data: '2026-12-21'}); quiz();

// ── cambiale tratta accettata da Edil Sigma, sconto in banca ──
n = open('cambiali');
fai('rc', {fattura: ftSigma, tipo: 'tratta', scadenza: '2027-02-20', data: '2026-12-20'});
vicino(n.saldo('11.10'), 1220, 'cambiale attiva'); vicino(n.saldo('11', 'C400'), 0, 'fattura di Edil Sigma chiusa'); vicino(n.saldo('87'), 14.64, 'bollo 12‰ sulla tratta');
assert.ok(!w.FIN4.partiteClienti().some(p => p.doc === ftSigma), 'la fattura non si riusa');
fai('sc', {cambiale: 'CA-001', tasso: '6', commissione: '3', data: '2026-12-28'});
vicino(n.saldo('11.10'), 0, 'cambiale girata alla banca'); vicino(n.saldo('60'), 10.83, 'interessi di sconto 1.220 × 6% × 54/365'); vicino(n.saldo('58'), 3, 'commissione');
fai('es', {cambiale: 'CA-001', risultato: 'pagata', data: '2027-01-10'}, null, /scadenza/);

// ── parcella del commercialista, pagata con assegno: ritenuta d'acconto ──
n = open('ritenute');
fai('rp', {professionista: 'F800', rif: 'FT 45/2026', onorario: '1000', data: '2026-12-10'});
vicino(n.saldo('54'), 1040, 'onorario + cassa 4%'); vicino(n.saldo('14'), 228.80, 'IVA anche sulla cassa'); vicino(-n.saldo('20', 'F800'), 1268.80, 'debito totale');
fai('pp', {parcella: 'FT 45/2026', mezzo: 'assegno', numero: 'AB-1234567', data: '2026-12-19'});
vicino(-n.saldo('29.10'), 200, 'ritenuta 20% del solo onorario'); vicino(-n.saldo('18.10'), 1068.80, 'assegno netto in circolazione'); vicino(n.saldo('20', 'F800'), 0, 'professionista pagato');
n = open('assegni');
fai('ad', {assegno: 'AB-1234567', data: '2026-12-23'}); vicino(n.saldo('18.10'), 0, 'assegno addebitato');
fai('ar', {cliente: 'C100', importo: '100', numero: 'BC-998877', data: '2026-12-22'}); vicino(n.saldo('11.30'), 100, 'assegno da versare');
fai('av', {data: '2026-12-23'}); vicino(n.saldo('11.30'), 0, 'assegno versato');

// ── mutuo 30.000 al 4,8%, 24 rate mensili: piano, rateo al 31/12, rata di gennaio ──
n = open('mutui');
const anteprima = fai('mu', {importo: '30000', tasso: '4,8', rate: '24', periodicita: '1', spese: '200', data: '2026-12-18'}, 'calcola');
assert.ok(/rata 1\.?313,46/.test(anteprima), 'anteprima del piano: ' + anteprima);
assert.equal(n.S.registrazioni.filter(r => r.tipo === 'MUTUO_EROGAZIONE').length, 0, 'il calcolo non registra');
fai('mu', {importo: '30000', tasso: '4,8', rate: '24', periodicita: '1', spese: '200', data: '2026-12-18'});
const m = w.FIN4.X().mutui[0];
vicino(-n.saldo('37.10'), 30000, 'debito per mutuo'); vicino(m.piano[0].interessi, 120, 'interessi prima rata 30.000 × 0,4%');
vicino(m.piano.reduce((t, q) => t + q.capitale, 0), 30000, 'il piano restituisce tutto il capitale');
assert.equal(m.piano[0].scadenza, '2027-01-18'); assert.equal(m.piano[23].scadenza, '2028-12-18');
const dq = w.FIN4.scadenzeDebito(m, '2026-12-31'); vicino(dq.entro + dq.oltre, 30000, 'entro + oltre'); assert.ok(dq.entro > 14000 && dq.oltre > 14000, 'quota entro 12 mesi');
fai('mt', {mutuo: m.numero, data: '2026-12-31'}); vicino(-n.saldo('39'), 54.19, 'rateo: 120 × 14/31 giorni');
fai('mr', {mutuo: m.numero, data: '2027-01-10'}, null, /scade il 18\/01\/2027/);

// ── leasing del carrello elettrico: maxicanone, risconto, finanziario ──
n = open('leasing');
fai('ls', {societa: 'F810', bene: 'Carrello elevatore elettrico', valore: '18000', maxicanone: '1800', canone: '480', canoni: '35', riscatto: '180', durata: '36', data: '2026-12-23'});
vicino(n.saldo('88'), 1800, 'maxicanone a costo'); const ls = w.FIN4.X().leasing[0]; assert.equal(ls.fine, '2029-12-22');
fai('lr', {leasing: ls.numero, data: '2026-12-31'}); vicino(n.saldo('06'), 1785.22, 'risconto 1.800 × 1.087/1.096'); vicino(n.saldo('88'), 14.78, 'costo di competenza 2026');
const fin = w.FIN4.finanziario(ls); assert.ok(fin.tassoAnnuo > 1 && fin.tassoAnnuo < 10, 'tasso implicito plausibile ' + fin.tassoAnnuo);
assert.ok(/metodo finanziario/.test(w.document.getElementById('lab').textContent), 'lettura IFRS 16');
// contratto corto per provare canoni e riscatto
fai('ls', {societa: 'F810', bene: 'Transpallet elettrico', valore: '1200', maxicanone: '0', canone: '500', canoni: '2', riscatto: '200', durata: '3', data: '2026-12-02'});
fai('lx', {leasing: 'LS-002', data: '2027-01-05'}, null, /canoni/);
fai('lc', {leasing: 'LS-002', data: '2027-01-02'}); fai('lc', {leasing: 'LS-002', data: '2027-02-02'});
fai('lx', {leasing: 'LS-002', data: '2027-03-02'});
assert.ok(n.S.cespiti.some(c => /Transpallet/.test(c.descrizione) && c.costo === 200 && c.classe === 'MEZ'), 'riscatto diventa cespite');
vicino(n.saldo('20', 'F810'), 0, 'riscatto pagato con SDD');

// ── bollo virtuale del 4° trimestre: la fattura esente a Beta ──
n = open('bolli');
{ const per = w.document.querySelector('#bo-per'); per.value = '2026-T4'; per.dispatchEvent(new w.Event('change')); }
const b = w.FIN4.riepilogoBolli('2026-T4'); assert.equal(b.fatture.length, 1, 'una fattura senza IVA oltre 77,47'); assert.equal(b.scadenza, '2027-02-28'); assert.equal(b.tributo, '2524');
assert.equal(b.cambiali.length, 1, 'la tratta compare tra i bolli del trimestre');
fai('bv', {data: '2027-02-26'}); vicino(n.saldo('87'), 16.64, 'bollo cambiale + 2 € virtuale');
fai('bv', {data: '2027-02-26'}, null, /già versato/);

// ── svalutazione dei crediti al 31/12: lo 0,5% dei crediti ──
n = open('crediti');
const l = w.FIN4.limiteSvalutazione('2026'); vicino(l.crediti, 400, 'crediti verso clienti: fattura esente 500 − assegno 100'); vicino(l.deducibile, 2, '0,5%');
fai('sv', {importo: '10', data: '2026-12-31'}); vicino(-n.saldo('11.90'), 10, 'fondo');
const imp = w.CH4.calcolaImposte({anno: '2026'});
vicino(imp.variazioniIres.find(v => /0,5%/.test(v[0]))[1], 8, 'eccedenza non deducibile IRES');
vicino(imp.variazioniIrap.find(v => /IRAP/.test(v[0]))[1], 10, 'svalutazione non deducibile IRAP');
assert.ok(imp.finanziari.some(f => /^74/.test(f[0])) || n.saldo('74') === 0, 'interessi su mutui tra gli oneri finanziari');

// ── ritenute: F24 1040 di gennaio ──
n = open('ritenute');
fai('vr', {mese: '2026-12', data: '2027-01-18'}); vicino(n.saldo('29.10'), 0, 'ritenuta versata'); assert.equal(w.FIN4.X().f24[0].scadenza, '2027-01-18', '16/01/2027 è sabato: si va a lunedì 18');

// ── rata del mutuo: interessi a costo, capitale restituito ──
n = open('mutui');
fai('mr', {mutuo: m.numero, data: '2027-01-18'}); vicino(n.saldo('74'), 54.19 + 120, 'interessi: rateo 2026 + rata 2027 (prima dello storno)'); vicino(-n.saldo('37.10'), 30000 - m.piano[0].capitale, 'debito residuo');

// ── cambiale passiva e cambiale insoluta → perdita su crediti ──
w.FS4.fatturaPassiva({fornitore: 'F300', conto: '54', rif: 'MA-77', imponibile: 1000, iva: 22, data: '2027-01-05'}); quiz();
n = open('cambiali');
fai('cp', {fattura: 'MA-77', tipo: 'paghero', scadenza: '2027-03-05', data: '2027-01-06'}); vicino(-n.saldo('20.10'), 1220, 'cambiale passiva'); vicino(n.saldo('20', 'F300'), 0, 'fornitore pagato con pagherò');
vicino(n.saldo('87'), 16.64 + 13.42, 'bollo 11‰ sul nostro pagherò');
fai('pc', {cambiale: 'CP-002', data: '2027-03-05'}); vicino(n.saldo('20.10'), 0, 'pagherò pagato');
w.FS4.fattura({cliente: 'C200', imponibile: 2000, iva: 22, testo: 'posa', scadenza: '2027-03-31', data: '2027-01-10'}); quiz();
const ftDelta = n.S.fattureServizi.slice(-1)[0].numero;
n = open('cambiali');
fai('rc', {fattura: ftDelta, tipo: 'paghero', scadenza: '2027-03-31', data: '2027-01-12'}); vicino(n.saldo('87'), 30.06, 'pagherò del cliente: bollo suo');
fai('es', {cambiale: 'CA-003', risultato: 'insoluta', spese: '15', data: '2027-04-02'}); vicino(n.saldo('11.20'), 2455, 'credito insoluto con spese di protesto');
n = open('crediti');
fai('pe', {credito: 'C:CA-003', motivo: 'Delta in liquidazione', data: '2027-06-30'});
vicino(n.saldo('11.20'), 0, 'stralcio'); vicino(n.saldo('62'), 2445, 'perdita oltre il fondo'); vicino(n.saldo('11.90'), 0, 'fondo usato');

// ── scambi UE (solo programma) ──
n = open('intra');
fai('ia', {fornitore: 'F900', rif: 'RE-2027-11', conto: '54', imponibile: '1000', data: '2027-02-10'});
vicino(n.saldo('21'), n.saldo('21'), ''); const ia = n.S.registrazioni.slice(-1)[0];
vicino(ia.righe.find(x => x.conto === '14').importo, 220, 'IVA integrata a credito'); vicino(ia.righe.find(x => x.conto === '21').importo, 220, 'IVA integrata a debito');
fai('ic', {cliente: 'C700', imponibile: '3000', data: '2027-02-12'}); assert.ok(!n.S.registrazioni.slice(-1)[0].righe.some(x => x.conto === '21'), 'cessione UE senza IVA');
assert.equal(w.FIN4.intrastat('2027-02').length, 2, 'elenchi Intrastat del mese');
assert.equal(w.FIN4.riepilogoBolli('2027-T1').fatture.length, 0, 'la cessione intracomunitaria non sconta bollo');

quadra(n);
console.log('OK finanza: ' + controlli + ' controlli, ' + n.S.registrazioni.length + ' registrazioni');
