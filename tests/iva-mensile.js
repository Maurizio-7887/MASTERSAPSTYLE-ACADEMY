// Liquidazione IVA mensile: mese a debito, mese a credito, riporto, mese vuoto, mese saltato.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const src = fs.readFileSync(path.join(__dirname, 'esercizio-ragioneria-chiusura.js'), 'utf8');
const LOGICA = eval(src.match(/const LOGICA = (\[[\s\S]*?\]);/)[1]);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
w.localStorage.setItem(CHIAVE, fs.readFileSync(path.join(__dirname, 'ragioneria-wms-finale.json'), 'utf8'));
w.confirm = () => true;
w.LAB_PAGINA = {chiave: CHIAVE, pagina: 'x', slot: 'erp-ft'};
LOGICA.forEach(f => w.eval(R(f)));
w.SD4.avvia ? 0 : 0;
w.eval("SD4.avvia('" + CHIAVE + "')");
const N = w.SD4.N, CH = w.CH4;
// azzero le liquidazioni e uso un anno pulito (2029) con solo IVA sintetica
const iva = (data, deb, cre) => N.post({data, tipo: 'TEST', descrizione: 'iva test', righe: [
  {conto: '21', dareAvere: 'AVERE', importo: deb}, {conto: '14', dareAvere: 'DARE', importo: cre}, {conto: '10', dareAvere: deb >= cre ? 'DARE' : 'AVERE', importo: Math.abs(deb - cre) || 0}].filter(x => x.importo)});
function tenta(f) { try { return {r: f()}; } catch (e) { return {e: e.message}; } }
const s0 = N.S.registrazioni.length;
const before14 = CH.saldo('14'), before21 = CH.saldo('21');
// MESE A CREDITO (solo acquisti): IVA 14 = 500
iva('2029-01-10', 0, 500);
let c = CH.calcolaIva('2029-01'); vicino(c.credito, 500, 'credito gennaio'); vicino(c.creditoRiportato, 500, 'riportato gennaio');
let t = tenta(() => CH.liquidaIva({periodo: '2029-01'}));
ok(!t.e || !/null|undefined|Cannot/.test(t.e), 'mese a credito: nessun errore tecnico (' + t.e + ')');
ok(CH.X().iva.some(x => x.periodo === '2029-01'), 'mese a credito: la liquidazione è registrata');
// MESE A DEBITO con credito riportato: vendite IVA 300, acquisti 100 → netto 300-100-500 = -300
iva('2029-02-10', 300, 100);
c = CH.calcolaIva('2029-02'); vicino(c.riporto, 500, 'riporto in febbraio'); vicino(c.saldo, -300, 'saldo febbraio'); vicino(c.creditoRiportato, 300, 'credito riportato a marzo');
t = tenta(() => CH.liquidaIva({periodo: '2029-02'})); ok(!t.e, 'liquidazione febbraio: ' + t.e);
// marzo a debito: 1000 vs 200 con riporto 300 → da versare 500
iva('2029-03-10', 1000, 200);
c = CH.calcolaIva('2029-03'); vicino(c.saldo, 500, 'saldo marzo da versare');
t = tenta(() => CH.liquidaIva({periodo: '2029-03'})); ok(!t.e, 'liquidazione marzo: ' + t.e);
vicino(CH.saldo('25') - 0, CH.saldo('25'), 'x');
t = tenta(() => CH.versaIva({periodo: '2029-03', data: '2029-04-16'})); ok(!t.e, 'F24 marzo: ' + t.e);
// dopo marzo il conto 14 deve essere azzerato rispetto al suo valore iniziale e il 21 pure
vicino(CH.saldo('14') - before14, 0, 'Iva a credito (14) azzerata a fine marzo');
vicino(CH.saldo('21') - before21, 0, 'Iva a debito (21) azzerata a fine marzo');
// mese saltato: aprile a credito 80 NON liquidato, maggio a debito 400 vs 0 → deve avvisare o includere aprile
iva('2029-04-10', 0, 80);
iva('2029-05-10', 400, 0);
c = CH.calcolaIva('2029-05');
t = tenta(() => CH.liquidaIva({periodo: '2029-05'}));
ok(!!t.e || Math.abs(c.saldo - 320) < 0.006, 'maggio con aprile non liquidato: o avvisa o tiene conto del credito di aprile (saldo ' + c.saldo + ', errore ' + t.e + ')');
// mese vuoto
t = tenta(() => CH.liquidaIva({periodo: '2029-07'})); ok(/non c'è IVA/.test(t.e || ''), 'mese vuoto: messaggio chiaro (' + t.e + ')');
console.log(controlli + ' controlli, ' + errori + ' errori'); process.exit(errori ? 1 : 0);
