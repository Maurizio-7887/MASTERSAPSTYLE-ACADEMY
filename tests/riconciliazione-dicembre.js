// Riconciliazione trasversale FI / CO-PA / MM / WM sull'esercitazione di dicembre al 31/12/2026
// (fotografia scritta da esercizio-dicembre-wms.js). Un solo libro giornale: ogni modulo deve
// raccontare gli stessi numeri. Nessuna modifica allo stato.
'use strict';
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..');
const sorgente = fs.readFileSync(path.join(__dirname, 'esercizio-dicembre-wms.js'), 'utf8');
const LOGICA = eval(sorgente.match(/const LOGICA = (\[[\s\S]*?\]);/)[1]);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const FOTO = path.join(__dirname, 'dicembre-wms-31-12.json');
const S0 = JSON.parse(fs.readFileSync(FOTO, 'utf8'));
const AL = '2026-12-31';
let n = 0, errori = 0;
const r2 = v => Math.round(v * 100) / 100;
function ok(c, m) { n++; if (!c) { errori++; console.log('✗ ' + m); } }
function vicino(a, b, m) { ok(Math.abs(a - b) < 0.005, m + ' (' + a + ' contro ' + b + ')'); }

const w = new JSDOM('<!doctype html><div id="lab"></div>', {url: 'https://sim.local/', runScripts: 'outside-only'}).window;
w.localStorage.setItem(CHIAVE, JSON.stringify(S0)); w.confirm = () => true;
LOGICA.forEach(f => w.eval(fs.readFileSync(path.join(root, f), 'utf8')));
w.SD4.avvia(CHIAVE);
const S = w.SD4.N.S;
// scritture dell'anno, senza epilogo, risultato e chiusura dello stato patrimoniale
const regs = S.registrazioni.filter(r => !r.chiusura && !r.stornato && String(r.data).slice(0, 4) === '2026');
const saldo = conto => r2(regs.reduce((t, r) => t + r.righe.reduce((u, x) => u + (String(x.conto) === conto ? (x.dareAvere === 'DARE' ? 1 : -1) * x.importo : 0), 0), 0));

// 1) Libro giornale: ogni registrazione quadra e il totale Dare = Avere
ok(regs.every(r => Math.abs(r.righe.reduce((t, x) => t + (x.dareAvere === 'DARE' ? 1 : -1) * x.importo, 0)) < 0.005), 'ogni registrazione del 2026 ha Dare = Avere');

// 2) FI-AR / FI-AP: i conti di riconciliazione coincidono con la somma dei partitari
for (const x of w.PT4.riconcilia(AL)) {
  vicino(x.saldoMastro, x.sommaPartitari, 'conto ' + x.conto + ' ' + x.nome + ': mastro = somma dei partitari');
  ok(!x.senzaPartner || x.senzaPartner.length === 0, 'conto ' + x.conto + ': nessuna riga senza cliente/fornitore');
  ok(!x.sconosciuti || x.sconosciuti.length === 0, 'conto ' + x.conto + ': nessun partner sconosciuto');
}

// 3) MM ↔ FI: i conti di magazzino valgono quantità al 31/12 × costo standard
const qta31 = m => (S.giacenze[m] || 0) - (S.movimenti || []).filter(x => (x.materiale || x.mat) === m && String(x.data) > AL).reduce((t, x) => t + (x.qta || 0), 0);
const std = m => S.materiali[m].std;
vicino(saldo('12'), r2(qta31('FERRO') * std('FERRO')), 'conto 12 Magazzino ferro = kg al 31/12 × standard');
vicino(saldo('07'), r2(qta31('SL-TAGLIO') * std('SL-TAGLIO')), 'conto 07 Magazzino semilavorati = kit al 31/12 × standard');
const finiti = Object.keys(S.materiali).filter(m => S.materiali[m].tipo === 'FERT');
vicino(saldo('13'), r2(finiti.reduce((t, m) => t + qta31(m) * (std(m) || 0), 0)), 'conto 13 Magazzino prodotti finiti = pezzi al 31/12 × standard');
vicino(r2(saldo('12') + saldo('07') + saldo('13')), 969, 'rimanenze di bilancio 969,00 € (come nel Laboratorio 2: 691,60 + 277,40)');

// 4) MM ↔ WM: quantità del gestionale = quantità sugli scaffali (zona differenze esclusa)
const wm = {};
(S.wm.quant || []).filter(q => q.ubic !== 'DIFF').forEach(q => { wm[q.mat] = r2((wm[q.mat] || 0) + q.qta); });
for (const m of ['FERRO', 'SL-TAGLIO', 'TR-STD']) vicino(wm[m] || 0, S.giacenze[m] || 0, m + ': quantità WM = quantità IM');
ok((S.wm.quant || []).filter(q => q.ubic === 'DIFF').every(q => Math.abs(q.qta) < 1e-9), 'zona differenze 999 vuota dopo LI21');

// 5) CO-PA ↔ FI: stesse fatture, stessi importi
const copa = (S.copa || []).filter(r => String(r.data).slice(0, 4) === '2026');
const somma = k => r2(copa.reduce((t, r) => t + (r[k] || 0), 0));
vicino(-saldo('40'), somma('ricaviLordi'), 'ricavi lordi CO-PA = conto 40 Ricavi di vendita');
vicino(saldo('41'), somma('costoVenduto'), 'costo del venduto CO-PA = conto 41 Costo del venduto a standard');
vicino(saldo('47'), r2(somma('scontiQuantita') + somma('scontiCliente')), 'sconti CO-PA = conto 47 Sconti su vendite');

// 5b) Centri di profitto: il margine letto dalle righe FI coincide con KE30 per centro di profitto
S.copaProfit = {centri: [{codice: 'PC-TR', nome: 'Business transenne'}, {codice: 'PC-SL', nome: 'Semilavorati'}], materiale: {'TR-STD': 'PC-TR', 'SL-TAGLIO': 'PC-SL'}};
const fiPc = w.COPA.fiPerProfitCenter(S, '2026'), coPc = w.COPA.report(S, 'profitCenter', {dal: '2026-01-01', al: AL}).righe;
ok(fiPc.length > 0 && fiPc.every(g => g.chiave !== 'NON-ASSEGNATO'), 'tutte le righe FI di ricavo e costo del venduto trovano il loro centro di profitto');
for (const g of fiPc) {
  const c = coPc.find(x => x.chiave === g.chiave) || {};
  vicino(g.ricaviNetti, c.ricaviRettificati, g.chiave + ': ricavi netti dopo resi e abbuoni FI = KE30');
  vicino(g.costoVenduto, c.costoVenduto, g.chiave + ': costo del venduto FI = KE30');
  vicino(g.mdc2, c.mdc2, g.chiave + ': margine di contribuzione II FI = KE30');
}
delete S.copaProfit;

// 6) Differenze inventariali: una sola contabilizzazione, con documento e ubicazione
const li21 = regs.filter(r => r.tipo === 'DIFFERENZA_INVENTARIO');
vicino(saldo('65'), 26, 'conto 65 Differenze inventariali = 26,00 € (12 kg × 0,95 + 1 kit × 14,60)');
ok(li21.length === 2, 'due scritture LI21, una per materiale');

console.log(errori ? '❌ ' + errori + ' errori su ' + n + ' controlli' : '✅ riconciliazione FI / CO-PA / MM / WM al 31/12/2026: ' + n + ' controlli');
process.exit(errori ? 1 : 0);
