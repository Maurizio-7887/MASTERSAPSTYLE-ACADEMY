// Magazziniere 5.0 — integrazione fra le funzioni nuove del magazzino e il resto del sistema integrato.
// Parte dallo stato finale dell'esercizio (rifatto qui dall'inizio) e prova gli incroci: deposito esterno ↔ disponibilità,
// arretrato, merce da mettere a posto, inventario e differenze; imballi/regole ↔ piano di carico ↔ carico RF ↔ DDT; portata.
const fs = require('fs'), path = require('path'), os = require('os'), {execFileSync} = require('child_process'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const no = (f, re, m) => { try { f(); ok(false, m + ': doveva essere rifiutato'); } catch (e) { ok(re.test(e.message), m + ' → ' + e.message); } };
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';

// 1. lo stato di fine esercizio, prodotto dall'esercizio completo
const file = path.join(os.tmpdir(), 'msa-mag-finale-' + process.pid + '.json');
execFileSync('node', [path.join(__dirname, 'esercizio-magazziniere.js'), 'senza-quiz'], {env: Object.assign({}, process.env, {MSA_STATO_FINALE: file}), stdio: 'ignore'});
const finale = fs.readFileSync(file, 'utf8'); fs.unlinkSync(file);
try { require('child_process').execFileSync('git', ['checkout', '--', 'tests/magazziniere-finale.json'], {cwd: path.join(__dirname, '..'), stdio: 'ignore'}); } catch (e) { /* fuori da git */ }

const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_bpc/static/bpc-logica.js',
  'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js'];
const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
w.localStorage.setItem(CHIAVE, finale);
w.LAB_PAGINA = {chiave: CHIAVE, pagina: 'struttura', slot: 'erp-ft'};
LOGICA.forEach(f => { try { w.eval(R(f)); } catch (e) { if (!/bpc|copc/.test(f)) throw e; } });
const N = w.SD4.avvia(CHIAVE), S = () => N.S, WM = w.WM4, SP = w.SP4, IV = w.IV4;
const tot = m => WM.perLuogo().find(x => x.mat === m);
const quadra = () => WM.quadratura().every(x => x.ok);
ok(quadra(), 'partenza: IM = WMS');
ok(tot('TR-PED').d200 === 100 && tot('TR-PED').w100 === 200, 'partenza: TR-PED 200 in W100 e 100 nel deposito');

// 2. rientro dal deposito D200 → W100, con 2 pezzi persi nel viaggio
const atp0 = w.SD4.atp ? w.SD4.atp('TR-PED') : null;
WM.creaTrasferimento({da: 'D200', materiale: 'TR-PED', qta: '50', data: '2027-02-01', consegna: '2027-02-03'});
const ub = WM.trasferimenti().slice(-1)[0];
ok(ub.numero === 'UB002' && WM.statoTrasf(ub).codice === 'pronto', 'dal deposito: niente prelievo, subito pronto da spedire');
no(() => WM.creaTrasferimento({da: 'D200', materiale: 'TR-PED', qta: '500', data: '2027-02-01'}), /solo 100/, 'non si trasferisce più di quanto c’è nel deposito');
WM.spedisciTrasferimento({trasferimento: ub.numero, data: '2027-02-01'});
ok(tot('TR-PED').viaggio === 50 && tot('TR-PED').d200 === 50 && quadra(), 'in viaggio verso W100: né qua né là, IM = WMS');
ok(WM.fuoriSede('TR-PED') === 100, 'disponibilità W100: esclusi i 50 in viaggio e i 50 nel deposito');
ok(WM.inArrivoW100('TR-PED').length === 1 && WM.inArrivoW100('TR-PED')[0].qta === 50, 'il rientro è un’entrata prevista per la disponibilità (ATP)');
if (atp0) ok(w.SD4.atp('TR-PED').giacenza === atp0.giacenza, 'ATP: la merce che torna non è ancora vendibile da W100');
ok(WM.arretrato('2027-02-02').viaggi[0].sem.cls === 'giallo' && WM.arretrato('2027-02-05').ritardi.viaggi === 1, 'arretrato: viaggio in scadenza, poi in ritardo');
ok(WM.dove('TR-PED').righe.some(r => /SUL CAMION/.test(r.cosa)) && WM.dove('TR-PED').prelevabile === 200, 'dove si trova: 50 sul camion, 200 prelevabili');
no(() => IV.crea({tipo: 'ubicazioni', selezione: 'IN-VIAGGIO', data: '2027-02-02'}), /viaggio non si conta/, 'inventario: la merce sul camion non si conta');
no(() => WM.riceviTrasferimento({trasferimento: ub.numero, qta: '60', data: '2027-02-02'}), /più di quanto è partito/, 'non si riceve più di quanto è partito');
const regs0 = S().registrazioni.length;
WM.riceviTrasferimento({trasferimento: ub.numero, qta: '48', data: '2027-02-02'});
ok(S().registrazioni.length === regs0, 'trasferimento e arrivo senza scritture');
const al = WM.daAllocare('2027-02-03');
ok(al.righe.filter(r => r.mat === 'TR-PED' && r.da === 'GR-ZONE').reduce((a, r) => a + r.qta, 0) === 48, 'merce da mettere a posto: i 48 rientrati in ricevimento');
ok(WM.dove('TR-PED').righe.some(r => r.ubic === 'DIFF' && r.qta === 2), 'i 2 mancanti nella zona differenze 999');
ok(quadra(), 'dopo l’arrivo: IM = WMS (i 2 mancanti restano in 999 finché non si registrano)');
al.righe.filter(r => r.mat === 'TR-PED').forEach(r => { const t = WM.aperti().find(x => x.numero === r.compito); WM.conferma({compito: t.numero, data: '2027-02-03', da: t.da, udc: t.udc, a: t.a, risorsa: 'MAG01'}); });
ok(!WM.daAllocare('2027-02-03').righe.some(r => r.mat === 'TR-PED'), 'messa a posto confermata: niente più da allocare');
IV.registra({data: '2027-02-03'});
const dif = S().registrazioni.slice(regs0).filter(r => r.tipo === 'DIFFERENZA_INVENTARIO');
ok(dif.length === 1 && Math.abs(dif[0].righe.reduce((a, x) => a + (x.dareAvere === 'DARE' ? x.importo : 0), 0) - 2 * S().materiali['TR-PED'].std) < 0.01, 'LI21: i 2 TR-PED persi diventano una differenza inventariale a costo standard');
ok(quadra() && tot('TR-PED').contabile === 298 && tot('TR-PED').w100 === 248 && tot('TR-PED').d200 === 50, 'fine rientro: 248 in W100 + 50 nel deposito = 298 contabili');
const sc = WM.scorte().find(x => x.mat === 'TR-PED'); ok(sc.fuori === 50 && sc.libera === 248, 'scorta minima: la merce nel deposito non è libera in W100');

// 3. imballi, regole, piano di carico, carico RF, portata e DDT
const beta = S().sped.trasporti[0];
ok(SP.statoPiano(beta).codice === 'ok' && beta.piano.veicolo === 'MOTRICE', 'il piano salvato nell’esercizio è valido');
const ddtB = SP.ddt(beta.consegne[0]); ok(ddtB.veicolo === 'Motrice 10 t', 'DDT: riporta il mezzo del piano di carico');
no(() => SP.salvaPiano({trasporto: beta.numero, veicolo: 'BILICO'}), /già partito/, 'piano: non si cambia dopo la partenza');
no(() => SP.salvaRegola({materiale: 'TR-ALTA', imballo: 'EUR', pezzi: '80', alt: '140'}), /Troppo pesante/, 'regola: 80 TR-ALTA superano la portata del pallet');
no(() => SP.salvaRegola({materiale: 'TR-STD', imballo: 'EUR', pezzi: '50', alt: '10'}), /più basso/, 'regola: collo più basso del pallet vuoto');
// una consegna di prova già imballata, sul furgone: il piano lascia a terra i colli e la pistola li rifiuta
const cliente = Object.keys(S().clienti)[0];
S().consegne.push({numero: '89990001', tipo: 'LF', ordine: 'PROVA', cliente: cliente, materiale: 'TR-STD', qta: 100, data: '2027-02-04', pgi: false, wm: true});
['0001', '0002'].forEach((k, z) => S().sped.colli.push({sscc: '38012345999999' + k, consegna: '89990001', materiale: 'TR-STD', qta: 50, imballo: 'EUR', tara: 25, lung: 120, larg: 80, alt: 125, pesoNetto: 600, pesoLordo: 625, data: '2027-02-04', caricato: false}));
N.salva();
SP.creaTrasporto({consegne: '89990001', vettore: 'V10', data: '2027-02-04', veicolo: 'FURGONE'});
const tf = S().sped.trasporti.slice(-1)[0];
ok(tf.veicolo === 'FURGONE' && SP.statoPiano(tf).codice === 'manca', 'nuovo trasporto con il furgone, piano non ancora calcolato');
SP.salvaPiano({trasporto: tf.numero, veicolo: 'FURGONE', criterio: 'fermate'});
ok(SP.statoPiano(tf).codice === 'ok' && tf.piano.kpi.caricati === 1 && tf.piano.scarti.length === 1, 'furgone: 1 collo sì, 1 resta a terra per la portata');
const fuori = tf.piano.scarti[0].colli[0], dentro = tf.piano.posti[0].colli[0];
no(() => SP.carica({sscc: fuori, trasporto: tf.numero, data: '2027-02-04'}), /resta a terra/, 'RF carico: rifiuta il collo che nel piano resta a terra');
ok(/posto 1/.test(SP.carica({sscc: dentro, trasporto: tf.numero, data: '2027-02-04'})), 'RF carico: il collo del piano dice il suo posto');
no(() => SP.salvaPiano({trasporto: tf.numero, veicolo: 'MOTRICE'}), /già cominciato/, 'piano: non si ricalcola a carico cominciato');
// senza piano conta comunque la portata del veicolo scelto
const prova = (num, colli) => { S().consegne.push({numero: num, tipo: 'LF', ordine: 'PROVA', cliente: cliente, materiale: 'TR-STD', qta: 50 * colli.length, data: '2027-02-05', pgi: false, wm: true});
  colli.forEach(k => S().sped.colli.push({sscc: k, consegna: num, materiale: 'TR-STD', qta: 50, imballo: 'EUR', tara: 25, lung: 120, larg: 80, alt: 125, pesoNetto: 600, pesoLordo: 625, data: '2027-02-05', caricato: false})); N.salva(); };
prova('89990002', ['380123459999990003', '380123459999990004']);
SP.creaTrasporto({consegne: '89990002', vettore: 'V10', data: '2027-02-05', veicolo: 'FURGONE'});
const t2 = S().sped.trasporti.slice(-1)[0];
SP.carica({sscc: '380123459999990003', trasporto: t2.numero, data: '2027-02-05'});
no(() => SP.carica({sscc: '380123459999990004', trasporto: t2.numero, data: '2027-02-05'}), /Portata superata/, 'senza piano: la portata del furgone blocca il secondo collo');
// piano vecchio: dopo il calcolo si aggiunge un collo → il piano va ricalcolato e la pistola lo dice
prova('89990003', ['380123459999990005']);
SP.creaTrasporto({consegne: '89990003', vettore: 'V10', data: '2027-02-05'});
const t3 = S().sped.trasporti.slice(-1)[0];
SP.salvaPiano({trasporto: t3.numero, veicolo: 'MOTRICE', criterio: 'saturazione'});
ok(SP.statoPiano(t3).codice === 'ok', 'piano calcolato su 1 collo');
S().sped.colli.push({sscc: '380123459999990006', consegna: '89990003', materiale: 'TR-STD', qta: 50, imballo: 'EUR', tara: 25, lung: 120, larg: 80, alt: 125, pesoNetto: 600, pesoLordo: 625, data: '2027-02-05', caricato: false}); N.salva();
ok(SP.statoPiano(t3).codice === 'vecchio', 'un collo in più: il piano risulta da ricalcolare');
ok(/da ricalcolare/.test(SP.carica({sscc: '380123459999990005', trasporto: t3.numero, data: '2027-02-05'})), 'la pistola avvisa che il piano è vecchio');
const p3 = SP.calcolaPiano({trasporto: t3.numero, veicolo: 'MOTRICE', criterio: 'saturazione'});
ok(p3.kpi.colli === 2 && p3.kpi.pile === 1 && p3.posti[0].strati.length === 2, 'ricalcolo: i 2 colli uguali si impilano (dati anche per il 3D)');
ok(quadra(), 'fine: IM = WMS');
// 4. tutte le pagine del magazzino e della spedizione si aprono sullo stato finale, senza errori
const TUTTA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_bpc/static/bpc-logica.js', 'app/blueprints/erp_controllo/static/co-percorso.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js', 'app/blueprints/erp_cespiti/static/ce-logica.js', 'app/blueprints/erp_tesoreria/static/rb-logica.js', 'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/static/js/erp/ruoli.js',
  'app/static/js/lab-copioni.js', 'app/static/js/erp/lettore.js', 'app/static/vendor/jsbarcode-3.11.6.min.js', 'app/static/vendor/qrcode-generator-1.4.4.js', 'app/static/js/erp/etichette.js'];
const PAG = {erp_magazzino: ['wm-pagine.js', ['struttura', 'mappa', 'compiti', 'rf', 'monitor', 'etichette', 'bloccato', 'lotti', 'allocare', 'arretrato', 'scorte', 'depositi']],
  erp_inventario: ['inv-pagine.js', null], erp_spedizione: ['sp-pagine.js', ['monitor', 'prelievo', 'imballi', 'imballo', 'trasporti', 'piano', 'ddt']], erp_innovazione: ['in-pagine.js', null]};
const stato = w.localStorage.getItem(CHIAVE);
Object.keys(PAG).forEach(bp => {
  const elenco = PAG[bp][1] || (fs.readFileSync(path.join(__dirname, '..', 'app/blueprints', bp, 'static', PAG[bp][0]), 'utf8').match(/^\s{4}(\w+): function \(\)/gm) || []).map(x => x.trim().split(':')[0]);
  elenco.forEach(pg => {
    const v = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
    v.localStorage.setItem(CHIAVE, stato); v.LAB_PAGINA = {chiave: CHIAVE, pagina: pg, slot: 'erp-ft'}; v.confirm = () => true;
    try { TUTTA.concat(['app/blueprints/' + bp + '/static/' + PAG[bp][0]]).forEach(f => v.eval(R(f)));
      ok(v.document.getElementById('lab').textContent.length > 50, bp + '/' + pg + ': pagina vuota'); }
    catch (e) { ok(false, bp + '/' + pg + ': ' + e.message); }
    v.close();
  });
});
console.log((errori ? '✗ ' : '✓ ') + 'integrazione magazzino (deposito, disponibilità, arretrato, inventario, imballi, piano di carico, carico RF, DDT): ' + controlli + ' controlli, ' + errori + ' errori');
process.exit(errori ? 1 : 0);
