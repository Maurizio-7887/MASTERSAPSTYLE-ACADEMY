// Solo dati sintetici. node tests/atp-rfq.js
// 1) VA01 «Controlla disponibilità»: prima di confermare al cliente il venditore vede giacenza, impegni, arrivi
//    e l'esito (confermabile / in arrivo / devi produrre), senza salvare nulla.
// 2) Richieste di offerta: ME41 a 2-4 fornitori, ME47 offerte, ME49 confronto con la scelta consigliata,
//    assegnazione che crea l'ordine d'acquisto (ME21N) al prezzo offerto.
const fs = require('fs'), path = require('path'), assert = require('assert'), {JSDOM} = require('jsdom');
const root = path.join(__dirname, '..'), key = 'atp-rfq-test', read = f => fs.readFileSync(path.join(root, f), 'utf8');
const scripts = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js',
  'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js'];
let checks = 0;
const ok = (v, t) => { checks++; assert.ok(v, t); }, near = (a, b, t) => ok(Math.abs(a - b) < .006, t + ': ' + a);
const w = new JSDOM('<!doctype html><div id="lab"></div>', {url: 'https://sim.local/vuoto/s4/vendite/', runScripts: 'outside-only'}).window;
w.confirm = () => true; scripts.forEach(f => w.eval(read(f))); w.SD4.avvia(key);
let n = w.SD4.N;
n.avvia({modo: 'costituzione', data: '2026-12-01'});
const SD = w.SD4, MM = w.MM4, cliente = Object.keys(n.S.clienti)[0];
function pagina(file, p) { w.LAB_PAGINA = {chiave: key, pagina: p}; w.eval(read(file)); n = w.SD4.N; return w.document.body.textContent; }
function click(form, action) { w.document.querySelector('[data-prefisso="' + form + '"] [data-azione="' + action + '"]').click(); return w.document.getElementById(form + '-esito'); }
const field = (id, v) => { const x = w.document.getElementById(id); assert.ok(x, 'campo ' + id); if (v !== undefined) { if (x.type === 'checkbox') x.checked = v; else x.value = v; } return x; };
const VENDITE = 'app/blueprints/erp_vendite/static/sd-pagine.js', ACQUISTI = 'app/blueprints/erp_acquisti/static/mm-pagine.js';

// ── 1. disponibilità prima della conferma ──
n.movimento('TR-STD', 40, '2026-12-02', '561', 'TEST');
let d = SD.disponibilita('TR-STD', 30);
ok(d.esito === 'confermabile' && d.subito === 30 && d.produrre === 0, 'ci sono: confermabile');
SD.ordine({cliente, materiale: 'TR-STD', qta: 30, data: '2026-12-02'});
d = SD.disponibilita('TR-STD', 50);
ok(d.disponibile === 10 && d.riservato === 30 && d.subito === 10 && d.produrre === 40 && d.esito === 'produrre', 'ne mancano 40: devi produrre');
// un ordine di produzione già aperto: i pezzi in arrivo non vanno prodotti di nuovo
n.S.produzione.push({numero: 'T1', materiale: 'TR-STD', qta: 25, data: '2026-12-03', fine: '2026-12-15', eventi: []}); n.salva();
d = SD.disponibilita('TR-STD', 50);
ok(d.inArrivo === 25 && d.liberoInArrivo === 25 && d.dopo === 25 && d.produrre === 15 && d.esito === 'produrre', 'arrivano 25, da produrre 15');
d = SD.disponibilita('TR-STD', 20);
ok(d.esito === 'in arrivo' && d.subito === 10 && d.dopo === 10, '10 subito e 10 in arrivo');
let t = pagina(VENDITE, 'ordini');
ok(/Merce a magazzino/.test(t) && /Controlla disponibilità/.test(t), 'VA01 mostra la merce e il pulsante');
const ordiniPrima = n.S.ordini.length;
field('va-materiale', 'TR-STD'); field('va-qta', '50');
let es = click('va', 'disp');
ok(/DEVI PRODURRE/.test(es.textContent) && /15 pz/.test(es.textContent) && /CO01/.test(es.textContent), 'esito: devi produrre 15 pz');
ok(n.S.ordini.length === ordiniPrima, 'il controllo non salva l\'ordine');
field('va-qta', '5'); es = click('va', 'disp');
ok(/CONFERMABILE: i 5 pz ci sono/.test(es.textContent), 'esito verde');

// ── 2. richieste di offerta e confronto ──
ok(['F100', 'F500', 'F600', 'F700'].every(f => n.S.fornitori[f] && n.S.fornitori[f].ferro), 'quattro fornitori di tubolare');
assert.throws(() => MM.rfq({qta: 5000, data: '2026-12-02', f_F100: true}), /almeno 2/); checks++;
assert.throws(() => MM.rfq({qta: 5000, data: '2026-12-02', f_F100: true, f_F200: true, f_F500: true, f_F600: true, f_F700: true}), /Al massimo 4/); checks++;
t = pagina(ACQUISTI, 'offerte');
ok(/Richiesta di offerta/.test(t) && /Registra le offerte ricevute/.test(t), 'pagina offerte');
ok(field('rf-f_F100').checked && field('rf-f_F700').checked && !field('rf-f_F300').checked, 'spuntati i fornitori di tubolare');
field('rf-qta', '5000'); field('rf-consegna', '2026-12-20'); field('rf-data', '2026-12-02');
es = click('rf', 'rf'); ok(/inviata a 4 fornitori/.test(es.textContent), 'RFQ inviata a 4 fornitori: ' + es.textContent);
const r = MM.R().rfq[0];
ok(r.fornitori.length === 4 && r.stato === 'aperta', 'RFQ aperta con 4 fornitori');
const offerte = {F100: ['0,98', '10'], F500: ['0,94', '25'], F600: ['0,96', '7'], F700: ['0,97', '5']};
Object.entries(offerte).forEach(([f, [p, gg]]) => {
  field('of-voce', r.numero + '|' + f); field('of-prezzo', p); field('of-gg', gg); field('of-data', '2026-12-03');
  const x = click('of', 'of'); ok(x.classList.contains('ok'), 'offerta ' + f + ': ' + x.textContent);
});
const c = MM.confronto(r);
ok(c.completo && c.righe.length === 4, 'quattro offerte registrate');
ok(c.consigliato === 'F600', 'consigliata la più conveniente tra chi consegna in tempo (F500 costa meno ma arriva tardi)');
near(c.risparmio, 50, 'risparmio sulla seconda offerta');
ok(!c.righe.find(x => x.fid === 'F500').inTempo, 'F500 oltre la data richiesta');
t = pagina(ACQUISTI, 'offerte');
ok(/Compra da Ferro Lombardo Srl/.test(t) && /consigliata/.test(t) && /oltre il 20\/12\/2026/.test(t), 'confronto ME49 con la scelta consigliata');
ok(field('as-voce').value === r.numero + '|F600', 'proposta per prima l\'offerta consigliata');
field('as-data', '2026-12-04');
es = click('as', 'as');
ok(es.classList.contains('ok') && /assegnata a Ferro Lombardo Srl/.test(es.textContent), 'assegnata: ' + es.textContent);
const o = n.S.acquisti[n.S.acquisti.length - 1];
ok(o.fornitore === 'F600' && o.prezzo === 0.96 && o.qta === 5000 && o.rfq === r.numero && o.consegna === '2026-12-11', 'ordine d\'acquisto al prezzo offerto');
ok(MM.R().rfq[0].stato === 'assegnata' && MM.R().rfq[0].ordine === o.numero, 'RFQ chiusa con il numero d\'ordine');
assert.throws(() => MM.offerta({rfq: r.numero, fornitore: 'F100', prezzo: 0.5}), /già assegnata/); checks++;
t = pagina(ACQUISTI, 'ordini'); ok(new RegExp('RFQ ' + r.numero).test(t), 'l\'ordine mostra la RFQ di provenienza');
// scelta diversa dalla consigliata: resta il motivo
MM.rfq({qta: 1000, data: '2026-12-05', consegna: '2026-12-30', f_F100: true, f_F700: true});
const r2 = MM.R().rfq[1];
MM.offerta({rfq: r2.numero, fornitore: 'F100', prezzo: 0.95, gg: 5, data: '2026-12-06'});
MM.offerta({rfq: r2.numero, fornitore: 'F700', prezzo: 0.99, gg: 3, data: '2026-12-06'});
MM.assegna({rfq: r2.numero, fornitore: 'F700', motivo: 'fornitore certificato per la commessa', data: '2026-12-07'});
ok(r2.vincitore === 'F700' && /certificato/.test(r2.motivo), 'motivo della scelta diversa registrato');
// richiesta d'acquisto approvata → RFQ → ordine collegato
MM.richiesta({materiale: 'FERRO', qta: 2000, consegna: '2026-12-28', data: '2026-12-08'});
const rda = MM.P().rda[0]; MM.approva({rda: rda.numero, data: '2026-12-08'});
MM.rfq({rda: rda.numero, data: '2026-12-08', f_F100: true, f_F600: true});
const r3 = MM.R().rfq[2]; ok(r3.qta === 2000 && r3.consegna === '2026-12-28', 'RFQ dalla richiesta d\'acquisto');
MM.offerta({rfq: r3.numero, fornitore: 'F100', prezzo: 0.97, gg: 4, data: '2026-12-09'});
MM.offerta({rfq: r3.numero, fornitore: 'F600', prezzo: 0.99, gg: 4, data: '2026-12-09'});
MM.assegna({rfq: r3.numero, data: '2026-12-10'});
ok(rda.stato === 'ordinata' && n.S.acquisti[n.S.acquisti.length - 1].rda === rda.numero, 'richiesta d\'acquisto ordinata');
ok(n.S.registrazioni.every(x => x.tipo !== 'ENTRATA_ACQUISTO'), 'RFQ e ordini senza scritture');
w.close();
console.log('✓ VA01 disponibilità prima della conferma e RFQ ME41/ME47/ME49 con assegnazione: ' + checks + ' controlli');
