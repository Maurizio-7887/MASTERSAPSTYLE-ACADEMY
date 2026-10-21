'use strict';
// Eseguire: node tests/cespiti-codifica.js. Solo dati sintetici, nessun servizio esterno.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../app/blueprints/erp_cespiti/static');
const logic = fs.readFileSync(path.join(root, 'ce-logica.js'), 'utf8');
const pages = fs.readFileSync(path.join(root, 'ce-pagine.js'), 'utf8');
function ambiente() {
  const S = {cespiti: []}, docs = [], counters = {};
  let saves = 0;
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  const dataOk = x => { if (!/^\d{4}-\d{2}-\d{2}$/.test(x) || new Date(x).toISOString().slice(0, 10) !== x) throw Error('Data non valida'); return x; };
  const N = {S, data: dataOk, fornitore: () => ({nome: 'Fornitore sintetico'}), cliente: () => ({nome: 'Cliente sintetico'}),
    numero: k => (counters[k] = (counters[k] || 0) + 1), salva: () => { saves++; },
    post: doc => { const d = r2(doc.righe.reduce((t, x) => t + (x.dareAvere === 'DARE' ? x.importo : -x.importo), 0)); assert.equal(d, 0, 'Scrittura bilanciata'); const r = {...doc, numero: 'SIM-' + (docs.length + 1)}; docs.push(r); return r; }};
  const L = {r2, dataOk, fd: x => x, eur: x => String(x), num: (x, label, min) => { const v = Number(x); if (!Number.isFinite(v) || v < min) throw Error(label); return v; }};
  const window = {LabMotore: L, SD4: {N, avvia: () => N}};
  vm.runInNewContext(logic, {window});
  return {CE: window.CE4, S, N, docs, window, counters, saves: () => saves};
}
const base = {data: '2027-01-01', inFunzione: '2027-01-01', descrizione: 'Piegatrice Academy', classe: 'IMP', fornitore: 'F300', importo: 12000};
{
  const {CE, S, docs} = ambiente();
  CE.acquista(base);
  assert.equal(S.cespiti[0].codice, 'CE-0001');
  assert.equal(docs[0].righe[1].importo, 2640);
  assert.equal(docs[0].righe[2].importo, 14640);
  assert.equal(CE.quota(S.cespiti[0], '2027-12-31').importo, 1200);
  CE.ammortizza({data: '2027-12-31'});
  assert.equal(CE.registro()[0].fondo, 1200);
  assert.equal(CE.registro()[0].netto, 10800);
  assert.throws(() => CE.ammortizza({data: '2027-12-31'}), /Niente/);
  const f = CE.fiscale(2027).righe[0];
  assert.equal(f.coeff, 10); assert.equal(f.massimo, 600); assert.equal(f.aumento, 600);
  CE.cedi({cespite: 'CE-0001', data: '2028-03-31', prezzo: 11000, cliente: 'C600'});
  const c = S.cespiti[0];
  assert.equal(c.ammortamenti[1].importo, 300);
  assert.equal(c.cessione.fondo, 1500); assert.equal(c.cessione.valoreNetto, 10500); assert.equal(c.cessione.differenza, 500);
  assert.equal(CE.registro()[0].netto, 0);
  assert.equal(CE.registro('2027-12-31')[0].netto, 10800);
  assert.equal(CE.registro('2027-12-31')[0].cessione, null);
  assert.equal(CE.registro('2027-12-31')[0].quote.length, 1);
  assert.equal(CE.registro('2026-12-31').length, 0);
}
{
  const {CE, S, docs, saves} = ambiente();
  CE.acquista({...base, inFunzione: '2027-07-01', codiceInterno: ' MAC-01 ', matricola: 'SIM-123', centro: 'OFFICINA', ubicazione: 'Reparto A'});
  const c = S.cespiti[0];
  assert.equal(c.codiceInterno, 'MAC-01'); assert.equal(c.matricola, 'SIM-123');
  assert.equal(CE.quota(c, '2027-12-31').importo, 600);
  assert.equal(CE.registro('2027-02-01')[0].stato, 'non ancora in funzione');
  const count = docs.length;
  assert.throws(() => CE.acquista({...base, codiceInterno: 'mac-01'}), /già assegnato/);
  assert.throws(() => CE.acquista({...base, aliquota: 101}), /100%/);
  assert.equal(docs.length, count);
  const costo = c.costo, aliquota = c.aliquota;
  CE.aggiornaMacchina({cespite: c.codice, codiceInterno: 'MAC-02', matricola: 'SIM-456', modello: 'Modello didattico', ubicazione: 'Reparto B', centro: 'CENTRO-SIM'});
  CE.manutenzione({cespite: c.codice, data: '2027-08-20', tipo: 'Preventiva', nota: 'Controllo didattico sintetico'});
  assert.equal(docs.length, count); assert.equal(c.costo, costo); assert.equal(c.aliquota, aliquota);
  assert.equal(c.ammortamenti.length, 0); assert.equal(c.manutenzioni.length, 1); assert.ok(saves() >= 3);
  assert.throws(() => CE.manutenzione({cespite: c.codice, data: '2026-12-31', tipo: 'Controllo', nota: 'Esempio'}), /acquisto/);
  assert.throws(() => CE.manutenzione({cespite: c.codice, data: '2027-08-20', tipo: 'Altro', nota: 'Esempio'}), /tipo/);
  assert.throws(() => CE.manutenzione({cespite: c.codice, data: '2027-08-20', tipo: 'Controllo', nota: ''}), /Descrivi/);
  c.cessione = {data: '2028-01-01'};
  assert.throws(() => CE.manutenzione({cespite: c.codice, data: '2028-02-01', tipo: 'Controllo', nota: 'Esempio'}), /cessione/);
}
{
  // Dati salvati prima dell'introduzione della scheda tecnica e contatore desincronizzato.
  const {CE, S, counters} = ambiente();
  CE.acquista(base);
  const c = S.cespiti[0];
  ['codiceInterno', 'matricola', 'centro', 'modello', 'ubicazione', 'manutenzioni', 'coeffFiscale'].forEach(k => delete c[k]);
  counters.cespite = 0;
  CE.acquista({...base, descrizione: 'Secondo bene sintetico', classe: 'MEZ'});
  assert.equal(S.cespiti[1].codice, 'CE-0002');
  assert.equal(CE.registro()[0].matricola, ''); assert.equal(CE.registro()[0].coeffFiscale, 10);
  CE.manutenzione({cespite: c.codice, data: '2027-02-01', tipo: 'Controllo', nota: 'Verifica simulata'});
  assert.equal(c.manutenzioni.length, 1);
  CE.ammortizza({data: '2027-12-31'});
  assert.equal(c.ammortamenti[0].importo, 1200);
  assert.equal(S.cespiti[1].ammortamenti[0].importo, 2400);
}
{
  const {CE, S} = ambiente();
  CE.acquista({...base, aliquota: 20});
  assert.equal(S.cespiti[0].aliquota, 20);
  assert.equal(S.cespiti[0].coeffFiscale, 10);
  CE.ammortizza({data: '2027-06-30'});
  assert.equal(S.cespiti[0].ammortamenti[0].importo, 1200);
  assert.equal(CE.quota(S.cespiti[0], '2027-12-31').importo, 1200);
  CE.ammortizza({data: '2027-12-31'});
  assert.equal(CE.fiscale(2027).righe[0].aumento, 1800);
  for (let year = 2028; year <= 2031; year++) CE.ammortizza({data: year + '-12-31'});
  assert.equal(CE.registro()[0].fondo, 12000);
  assert.equal(CE.registro()[0].netto, 0);
  assert.throws(() => CE.ammortizza({data: '2033-12-31'}), /Niente/);
}
{
  // Rendering delle quattro pagine, selezione scheda e caratteri non fidati: smoke test senza dipendenze.
  const {window, CE} = ambiente();
  CE.acquista({...base, descrizione: '<img src=x onerror=alert(1)>', codiceInterno: '<script>'});
  const esc = x => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  Object.assign(window.LabMotore, {esc, scheda: (a, b, c, html) => b + html, tabella: (heads, rows) => rows.map(r => r.join('|')).join('\n'), modulo: () => '<form></form>', collega: () => {}});
  window.S4UI = {avviso: () => '', fornitori: () => [], clienti: () => [], lista: () => []};
  for (const pagina of ['registro', 'acquisto', 'ammortamenti', 'cessione']) {
    window.LAB_PAGINA = {pagina};
    const nodes = {}, radice = {dataset: {}, innerHTML: '', querySelector: id => (nodes[id] ||= {})};
    vm.runInNewContext(pages, {window, document: {getElementById: () => radice}});
    assert.ok(radice.innerHTML.length > 100);
    assert.ok(!radice.innerHTML.includes('<img src=x'), 'Descrizione HTML escapata');
    if (pagina === 'registro') {
      assert.ok(radice.innerHTML.includes('IMMAGINE SIMULATA'));
      assert.ok(radice.innerHTML.includes('nessun costo contabilizzato') || radice.innerHTML.includes('non cambiano costo'));
      assert.ok(radice.innerHTML.includes('&lt;script&gt;'));
      nodes['#cerca'].onchange.call({value: 'inesistente'});
      nodes['#alla'].onchange.call({value: '2026-12-31'});
      nodes['#macchina'].onchange.call({value: 'CE-0001'});
    }
  }
}
console.log('OK cespiti: codici automatici, legacy, dati tecnici, manutenzioni non contabili, registro storico, quote/civilistico/fiscale, cessione e rendering.');
