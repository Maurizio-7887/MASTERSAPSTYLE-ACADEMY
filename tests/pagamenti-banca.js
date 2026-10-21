// Solo simulazione locale: conti reali del piano, nessuna API bancaria.
// Esecuzione: node tests/pagamenti-banca.js
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '..'), key = 'test-banche-sintetiche';
const sources = new Map();
const read = f => { if (!sources.has(f)) sources.set(f, fs.readFileSync(path.join(root, f), 'utf8')); return sources.get(f); };
const logic = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js',
  'app/blueprints/erp_fi/static/storni-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js',
  'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/blueprints/guida/static/ragioneria.js'];
let w, saved;
function open(bp, pagina, extra = '') {
  if (w) { saved = w.localStorage.getItem(key); w.close(); }
  w = new JSDOM('<!doctype html><div id="lab"></div>', {url: 'https://sim.local/vuoto/s4/contabilita-s4/' + extra, runScripts: 'outside-only'}).window;
  w.confirm = () => true;
  if (saved) w.localStorage.setItem(key, saved);
  w.LAB_PAGINA = {chiave: key, pagina};
  logic.forEach(f => w.eval(read(f)));
  w.SD4.avvia(key);
  if (bp) w.eval(read('app/blueprints/' + bp + '/static/' + (bp === 'erp_fi' ? 'fi' : 'tes') + '-pagine.js'));
  return w.SD4.N;
}
function quiz() {
  const n = w.SD4.N, Q = w.MSA_RAGIONERIA, host = w.document.createElement('aside');
  w.document.body.append(host);
  const libro = JSON.stringify(n.S.registrazioni);
  while (Q.pendente(n.S)) {
    const q = Q.pendente(n.S);
    host.innerHTML = Q.html(n.S, w.LabMotore.esc);
    const rows = q.documento.righe.map((r,i) => ({r,i})).sort((a,b) => String(a.r.conto).localeCompare(String(b.r.conto), 'it', {numeric:true}) || a.i-b.i);
    [...host.querySelectorAll('.msa-q-riga')].forEach((el,i) => {
      el.querySelector('.msa-q-conto').value = rows[i].r.conto;
      el.querySelector('.msa-q-sezione').value = rows[i].r.dareAvere;
      el.querySelector('input').value = rows[i].r.importo.toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2});
    });
    Q.click(host.querySelector('.msa-q-verifica'), host, n.S, n.salva);
    assert.equal(q.corretto, true, 'quiz con conti distinti');
    host.innerHTML = Q.html(n.S, w.LabMotore.esc);
    Q.click(host.querySelector('.msa-q-continua'), host, n.S, n.salva);
  }
  host.remove();
  assert.equal(JSON.stringify(n.S.registrazioni), libro, 'quiz non modifica contabilità');
  w.dispatchEvent(new w.CustomEvent('msa:quiz-aggiornato'));
}
function submit(pref, values) {
  const lab = w.document.getElementById('lab');
  for (const [k,v] of Object.entries(values)) {
    const el = lab.querySelector('#' + pref + '-' + k); assert.ok(el, 'campo ' + pref + '-' + k); el.value = v;
  }
  lab.querySelector('[data-prefisso="' + pref + '"] [data-azione="' + pref + '"]').click();
  const esito = lab.querySelector('#' + pref + '-esito');
  assert.ok(esito && !esito.className.includes('errore'), esito?.textContent);
  quiz();
}
function quadratura(n) {
  for (const r of n.S.registrazioni) {
    const cents = r.righe.reduce((s,x) => s + (x.dareAvere === 'DARE' ? 1 : -1) * Math.round(x.importo*100), 0);
    assert.equal(cents, 0, 'documento quadrato ' + r.numero);
  }
}
let n = open();
assert.equal(n.S.registrazioni.length, 0);
assert.equal(n.saldoBanche(), 0);
assert.equal(n.contiBancari().length, 2);
assert.equal(n.S.pianoDeiConti.find(c => c.codice === '10.02').tipo, 'ATTIVO');
n.avvia({modo:'costituzione', capitale:10000, data:'2026-12-01'});
assert.equal(n.saldoBanche(), 0, 'costituzione non inventa banca');
n.versaCapitale({data:'2026-12-01'}); quiz();
assert.equal(n.saldo('10.02'), 0);
assert.throws(() => w.TS4.giroconto({da:'10', a:'10.02', importo:20000, data:'2026-12-01'}), /insufficiente/);
assert.throws(() => w.TS4.giroconto({da:'10', a:'10', importo:100, data:'2026-12-01'}), /diversi/);
n = open('erp_tesoreria', 'posizione');
submit('gc', {da:'10', a:'10.02', importo:'3000', data:'2026-12-02'});
assert.equal(n.saldo('10'), 7000); assert.equal(n.saldo('10.02'), 3000); assert.equal(n.saldoBanche(), 10000);
assert.equal(w.TS4.previsione('2026-12-01').banca, 10000, 'giroconto futuro non cambia storico');
n = open('erp_fi', 'passive');
assert.equal(w.document.querySelector('#pg-banca').value, '10', 'default compatibile');
assert.equal(w.document.querySelector('#pg-banca option[value="10.02"]').value, '10.02');
submit('fp', {fornitore:'F400', rif:'SYN-POLIZZA', conto:'83', imponibile:'1200', iva:'0', data:'2026-12-03'});
const prima = JSON.stringify(n.S.registrazioni);
for (const banca of ['18', '83', '10.99', 'banca inesistente'])
  assert.throws(() => w.FS4.paga({fornitore:'F400', importo:100, banca, data:'2026-12-04'}), /bancario/);
assert.equal(JSON.stringify(n.S.registrazioni), prima, 'errori senza mutazioni');
submit('pg', {fornitore:'F400', documento:'SYN-POLIZZA', banca:'10.02', importo:'400', data:'2026-12-04'});
const payment = n.S.registrazioni.at(-1);
assert.equal(payment.righe[1].conto, '10.02'); assert.equal(payment.righe[1].dareAvere, 'AVERE');
assert.equal(n.saldo('10'), 7000); assert.equal(n.saldo('10.02'), 2600); assert.equal(n.saldoBanche(), 9600);
assert.equal(w.TS4.partite('fornitore', 'F400')[0].aperto, 800);
submit('pg', {fornitore:'F400', documento:'SYN-POLIZZA', banca:'10', importo:'', data:'2026-12-05'});
assert.equal(n.saldo('10'), 6200); assert.equal(n.saldoBanche(), 8800);
assert.equal(w.TS4.partite('fornitore', 'F400').length, 0);
assert.throws(() => w.FS4.paga({fornitore:'F400', banca:'10.02', data:'2026-12-05'}), /non ha debiti/);
n = open('erp_tesoreria', 'estratti');
submit('ec', {banca:'10.02', data:'2026-12-06', righe:'2026-12-04;-400;BONIFICO CONTABILE ' + payment.numero + '\n2026-12-06;-5;COMMISSIONI SIMULATE'});
const ec = w.TS4.T().estratti.at(-1), count = n.S.registrazioni.length;
assert.equal(ec.saldoIniziale, 3000); assert.equal(ec.saldoFinale, 2595);
submit('ab', {});
assert.equal(n.S.registrazioni.length, count + 1, 'F-53 abbinato senza doppio addebito; solo commissione nuova');
assert.equal(n.saldo('10.02'), 2595); assert.equal(n.saldo('10'), 6200); assert.equal(n.saldoBanche(), 8795);
assert.equal(w.TS4.riconciliazione(ec.numero).ok, true);
assert.equal(ec.righe[0].contabile, payment.numero);
assert.match(w.document.getElementById('lab').textContent, /conto 10.02/);
assert.throws(() => w.TS4.abbina({estratto:ec.numero}), /Nessuna riga/);
assert.equal(n.S.registrazioni.length, count + 1, 'nessuna doppia registrazione');
assert.throws(() => w.TS4.caricaEstratto({banca:'20', data:'2026-12-06', righe:'2026-12-06;-5;test'}), /bancario/);
// Vecchio estratto, privo di contoBanca: continua a riconciliare il 10.
w.TS4.caricaEstratto({data:'2026-12-07', righe:'2026-12-07;-2;commissioni'});
const old = w.TS4.T().estratti.at(-1); delete old.contoBanca;
w.TS4.abbina({estratto:old.numero}); quiz();
assert.equal(w.TS4.riconciliazione(old.numero).ok, true); assert.equal(n.saldo('10'), 6198);
n = open('erp_fi', 'mastro', 'mastro?conto=10.02');
assert.equal(w.FI_DIDATTICA.movimenti(w.FI_DIDATTICA.registrazioni(), '10.02').at(-1).saldo, 259500);
assert.match(w.document.getElementById('lab').textContent, /Mastrino 10.02/);
n = open('erp_tesoreria', 'posizione');
w.document.querySelector('#fd').value = '2026-12-07';
w.document.querySelector('#fd').dispatchEvent(new w.Event('change'));
assert.equal(w.TS4.previsione('2026-12-07').banca, 8793);
assert.match(w.document.getElementById('lab').textContent, /10.02/);
quadratura(n);
// Migrazione idempotente: aggiunge solo la voce del piano, mai registrazioni o denaro.
const libro = JSON.stringify(n.S.registrazioni), saldo = n.saldoBanche();
n.S.pianoDeiConti = n.S.pianoDeiConti.filter(c => c.codice !== '10.02'); n.salva();
n = open();
assert.equal(n.S.pianoDeiConti.filter(c => c.codice === '10.02').length, 1);
assert.equal(JSON.stringify(n.S.registrazioni), libro); assert.equal(n.saldoBanche(), saldo);
n = open(); assert.equal(n.S.pianoDeiConti.filter(c => c.codice === '10.02').length, 1);
// Pagamento API legacy senza banca, importo omesso, default invariato.
w.FS4.fatturaPassiva({fornitore:'F400', rif:'SYN-LEGACY', conto:'83', imponibile:10, iva:0, data:'2026-12-08'});
const legacy = w.FS4.paga({fornitore:'F400', data:'2026-12-08'});
assert.equal(legacy.righe[1].conto, '10'); assert.equal(legacy.righe[1].importo, 10);
// Due pagamenti indistinguibili non si abbinano arbitrariamente. Il contabile
// esplicito li riconcilia una volta sola, senza registrare altre uscite.
w.FS4.fatturaPassiva({fornitore:'F400', rif:'SYN-DOPPIO', conto:'83', imponibile:100, iva:0, data:'2026-12-09'});
const doppi = [1,2].map(() => w.FS4.paga({fornitore:'F400', banca:'10.02', importo:50, data:'2026-12-10'}));
w.TS4.caricaEstratto({banca:'10.02', data:'2026-12-10', righe:'2026-12-10;-50;bonifico sintetico\n2026-12-10;-50;bonifico sintetico'});
const ambiguo = w.TS4.T().estratti.at(-1), primaAmbiguo = n.S.registrazioni.length;
assert.equal(w.TS4.regola(ambiguo, ambiguo.righe[0]), null, 'abbinamento ambiguo non inventato');
w.TS4.manuale({estratto:ambiguo.numero, riga:1, giaRegistrato:doppi[0].numero});
assert.throws(() => w.TS4.manuale({estratto:ambiguo.numero, riga:2, giaRegistrato:doppi[0].numero}), /già abbinato/);
w.TS4.manuale({estratto:ambiguo.numero, riga:2, giaRegistrato:doppi[1].numero});
assert.equal(n.S.registrazioni.length, primaAmbiguo);
assert.equal(w.TS4.riconciliazione(ambiguo.numero).ok, true);
// Un estratto su un'altra banca non può riutilizzare il medesimo pagamento.
w.TS4.caricaEstratto({banca:'10', data:'2026-12-11', righe:'2026-12-10;-50;contabile ' + doppi[0].numero});
const altra = w.TS4.T().estratti.at(-1);
assert.throws(() => w.TS4.manuale({estratto:altra.numero, riga:1, giaRegistrato:doppi[0].numero}), /non coerente/);
// La chiusura/riapertura generica del piano conserva entrambi i conti distinti.
const banca10 = n.saldo('10'), bancaSecondaria = n.saldo('10.02');
const CH = w.CH4;
assert.ok(CH, 'modulo chiusura disponibile');
CH.chiudi({anno:'2026', forza:'si'});
assert.equal(n.saldo('10'), 0); assert.equal(n.saldo('10.02'), 0);
CH.riapri({anno:'2027', data:'2027-01-01'});
assert.equal(n.saldo('10'), banca10); assert.equal(n.saldo('10.02'), bancaSecondaria);
assert.equal(w.TS4.previsione('2027-01-01').banca, banca10 + bancaSecondaria);
quadratura(n);
w.close(); console.log('OK pagamenti-banca: costituzione → versamento → giroconto → fattura → pagamento su due conti → estratti senza duplicati → mastrino → previsione → reload legacy → chiusura/riapertura.');
