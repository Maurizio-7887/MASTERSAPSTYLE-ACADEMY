/* Copioni dei due laboratori: le stesse operazioni dei passi guidati, eseguite in automatico.
   Servono alle lezioni «Che situazione hai?» per preparare il laboratorio fino al punto da spiegare
   (e ai test, che li eseguono per intero). Ogni voce: [titolo del passo guidato, funzione].
   La funzione riceve il modulo del laboratorio (HMLV o REM) già avviato. */
(function () {
  'use strict';
  var id = function (H, m) { return H.M.S.ordini.filter(function (o) { return o.mat === m; }).slice(-1)[0].id; };
  var assembla = function (m, q, ore, ferro) {
    return [
      ['CO01: ordine di assemblaggio ' + m, function (H) { H.creaOrdine({mat: m, qta: q, data: '2026-12-06'}); }],
      ['261: preleva', function (H) { H.prelievo({ordine: id(H, m), mat: 'SL-PIEGA', qta: q, data: '2026-12-06'}); if (ferro) H.prelievo({ordine: id(H, m), mat: 'FERRO', qta: ferro, data: '2026-12-06'}); }, m],
      ['CO11N: saldatura', function (H) { H.conferma({ordine: id(H, m), ore: ore, data: '2026-12-08'}); }, m],
      ['101: entrata ' + q + ' ' + m, function (H) { H.entrata({ordine: id(H, m), qta: q, data: '2026-12-09'}); }],
    ];
  };
  var HMLV = [
    ['Guarda le tre transenne', null],
    ['Entrata del ferro', function (H) { H.entrataFerro({data: '2026-11-03', kg: 5500, rif: 'DDT-FERRO-11'}); }],
    ['Prova: il telaio non si produce', null],
    ['Strategie:', function (H) { H.impostaStrategia({mat: 'SL-PIEGA', strategia: '70'}); ['TR-STD', 'TR-ALTA', 'TR-PED'].forEach(function (m) { H.impostaStrategia({mat: m, strategia: '50'}); }); }],
    ['Prova: la transenna non si assembla', null],
    ['CO01: 600 telai', function (H) { H.creaOrdine({mat: 'SL-PIEGA', qta: 600, data: '2026-11-04'}); }],
    ['CO01: 600 SL-TAGLIO', function (H) { H.creaOrdine({mat: 'SL-TAGLIO', qta: 600, data: '2026-11-04'}); }],
    ['261: 4.800 kg', function (H) { H.prelievo({ordine: id(H, 'SL-TAGLIO'), mat: 'FERRO', qta: 4800, data: '2026-11-05'}); }],
    ['CO11N: taglio', function (H) { H.conferma({ordine: id(H, 'SL-TAGLIO'), ore: 160, data: '2026-11-05'}); }],
    ['101: 600 SL-TAGLIO', function (H) { H.entrata({ordine: id(H, 'SL-TAGLIO'), qta: 600, data: '2026-11-06'}); }],
    ['261: 600 SL-TAGLIO', function (H) { H.prelievo({ordine: id(H, 'SL-PIEGA'), mat: 'SL-TAGLIO', qta: 600, data: '2026-11-10'}); }],
    ['CO11N: piegatura', function (H) { H.conferma({ordine: id(H, 'SL-PIEGA'), ore: 115, data: '2026-11-12'}); }],
    ['101 parziale', function (H) { H.entrata({ordine: id(H, 'SL-PIEGA'), qta: 400, data: '2026-11-20'}); }],
    ['CO88: chiusura di novembre', function (H) { H.chiusura({periodo: '2026-11'}); }],
    ['Confronto: la stessa produzione', null],
    ['101: gli ultimi 200', function (H) { H.entrata({ordine: id(H, 'SL-PIEGA'), qta: 200, data: '2026-12-03'}); }],
    ['VA01: tre ordini cliente', function (H) {
      H.venditaCrea({cliente: 'Beta Costruzioni Srl', rif: 'BETA-300', mat: 'TR-STD', qta: 300, data: '2026-12-05'});
      H.venditaCrea({cliente: 'Delta Noleggi Srl', rif: 'DELTA-150', mat: 'TR-ALTA', qta: 150, data: '2026-12-05'});
      H.venditaCrea({cliente: 'Comune di Gamma', rif: 'GAMMA-100', mat: 'TR-PED', qta: 100, data: '2026-12-05'}); }],
  ].concat(assembla('TR-STD', 300, 126, 0), assembla('TR-ALTA', 150, 75, 300), assembla('TR-PED', 100, 28, 100)).concat([
    ['601: consegna', function (H) { H.M.S.ordiniCliente.forEach(function (c) { H.consegna({ordineCliente: c.id, qta: c.qta - c.consegnati, data: '2026-12-10'}); }); }],
    ['TECO degli ordini', function (H) { H.M.S.ordini.forEach(function (o) { if (!o.liquidazione && !o.teco) H.teco({ordine: o.id, data: '2026-12-31'}); }); }],
    ['CO88: chiusura di dicembre', function (H) { H.chiusura({periodo: '2026-12'}); }],
    ['Cruscotto: anzianità', null],
    ['Buffer DDMRP', null],
    ['CO01: rifornisci il buffer', function (H) { H.creaOrdine({mat: 'SL-PIEGA', qta: 675, data: '2027-01-02'}); }],
  ]);
  var REM = [
    ['Perché la «ripetitiva»', null],
    ['Budget 2027', function (X) { X.budget({anno: '2027', 'TR-STD': 2000, 'TR-ALTA': 1200, 'TR-PED': 800}); }],
    ['Versioni di produzione', function (X) { ['TR-STD', 'TR-ALTA', 'TR-PED'].forEach(function (m) { X.versione({mat: m}); }); }],
    ['Tre collettori', function (X) { ['TR-STD', 'TR-ALTA', 'TR-PED'].forEach(function (m) { X.collettore({mat: m, data: '2027-01-01'}); }); }],
    ['Entrata del ferro di gennaio', function (X) { X.entrataFerro({data: '2027-01-02', kg: 3500, rif: 'DDT-FERRO-01'}); }],
    ['MFBF del 15/01', function (X) { [['TR-STD', 80], ['TR-ALTA', 50], ['TR-PED', 30]].forEach(function (x) { X.mfbf({mat: x[0], qta: x[1], data: '2027-01-15'}); }); }],
    ['MFBF del 31/01', function (X) { [['TR-STD', 85], ['TR-ALTA', 48], ['TR-PED', 37]].forEach(function (x) { X.mfbf({mat: x[0], qta: x[1], data: '2027-01-31'}); }); }],
    ['20 TR-STD fermi', function (X) { X.mfbf({mat: 'TR-STD', qta: 20, data: '2027-01-31', modo: 'punto'}); }],
    ['Scarto: 3 TR-STD', function (X) { X.mfbf({mat: 'TR-STD', qta: 3, data: '2027-01-31', modo: 'scarto'}); }],
    ['Sfrido: 40 kg', function (X) { X.prelievoExtra({mat: 'TR-ALTA', kg: 40, data: '2027-01-31', motivo: 'sfrido prolunghe'}); }],
    ['Chiusura di gennaio', function (X) { X.chiusura({periodo: '2027-01'}); }],
    ['Entrata del ferro di febbraio', function (X) { X.entrataFerro({data: '2027-02-03', kg: 3000, rif: 'DDT-FERRO-02'}); }],
    ['Completa i 20 telai', function (X) { X.mfbf({mat: 'TR-STD', qta: 20, data: '2027-02-05', modo: 'dalPunto'}); }],
    ['MFBF del 20/02', function (X) { [['TR-STD', 150], ['TR-ALTA', 90], ['TR-PED', 60]].forEach(function (x) { X.mfbf({mat: x[0], qta: x[1], data: '2027-02-20'}); }); }],
    ['Chiusura di febbraio', function (X) { X.chiusura({periodo: '2027-02'}); }],
  ];
  // Sistema integrato S/4 — vendite e redditività (stessi titoli dei passi di s4-vendite-copa.js)
  var o = function (X, c, t) { return X.N.S.ordini.filter(function (x) { return x.cliente === c && x.tipo === (t || 'OR'); }).slice(-1)[0].numero; };
  var f = function (X, c) { return X.N.S.fatture.filter(function (x) { return x.cliente === c && x.tipo === 'F2'; })[0].numero; };
  var SD4 = [
    ['Che cosa è il sistema integrato', null],
    ['Avvia il sistema', function (X) { X.avviaSistema({data: '2027-01-02'}); }],
    ['VK11: prezzo speciale', function (X) { X.creaCondizione({tipo: 'PR00', cliente: 'C200', materiale: 'TR-ALTA', valore: 70}); }],
    ['VK11: sconto cliente 5%', function (X) { X.creaCondizione({tipo: 'K007', cliente: 'C100', valore: 5}); }],
    ['VK11: sconto cliente 3%', function (X) { X.creaCondizione({tipo: 'K007', cliente: 'C300', valore: 3}); }],
    ['VA01: Edil Sigma', function (X) { X.ordine({cliente: 'C400', materiale: 'TR-STD', qta: 150, rif: 'SIGMA-150', data: '2027-01-05'}); }],
    ['F-37', function (X) { X.richiestaAcconto({ordine: o(X, 'C400'), importo: 5000, data: '2027-01-05'}); }],
    ['F-29', function (X) { X.incassoAcconto({richiesta: X.N.S.acconti[0].numero, data: '2027-01-08'}); }],
    ['VA01: Beta', function (X) { X.ordine({cliente: 'C100', materiale: 'TR-STD', qta: 300, rif: 'BETA-300', data: '2027-01-10'}); }],
    ['VA01: Delta', function (X) { X.ordine({cliente: 'C200', materiale: 'TR-ALTA', qta: 150, rif: 'DELTA-150', data: '2027-01-10'}); }],
    ['VA01: Comune', function (X) { X.ordine({cliente: 'C300', materiale: 'TR-PED', qta: 200, rif: 'GAMMA-200', data: '2027-01-10'}); }],
    ['VL01N', function (X) { X.N.S.ordini.filter(function (x) { return x.tipo === 'OR'; }).forEach(function (x) { X.consegna({ordine: x.numero, data: '2027-01-15'}); }); }],
    ['VF01', function (X) { X.N.S.consegne.slice().forEach(function (c) { X.fattura({consegna: c.numero, data: '2027-01-20'}); }); }],
    ['Reso:', function (X) { X.reso({fattura: f(X, 'C100'), qta: 20, motivo: 'merce danneggiata nel trasporto', data: '2027-01-25'}); }],
    ['Entrata merci di reso', function (X) { X.entrataReso({reso: o(X, 'C100', 'RE'), data: '2027-01-26'}); }],
    ['Nota di credito per il reso', function (X) { X.notaCreditoReso({reso: o(X, 'C100', 'RE'), data: '2027-01-27'}); }],
    ['Abbuono senza reso', function (X) { X.richiestaAbbuono({fattura: f(X, 'C300'), importo: 300, motivo: 'difetto di verniciatura', data: '2027-01-28'}); }],
    ['Approva l', function (X) { X.approvaAbbuono({richiesta: o(X, 'C300', 'G2')}); }],
    ['Nota di credito G2', function (X) { X.notaCreditoAbbuono({richiesta: o(X, 'C300', 'G2'), data: '2027-01-29'}); }],
    ['F-28', function (X) { X.incasso({cliente: 'C200', importo: 12553.8, rif: 'BONIFICO DELTA', data: '2027-01-31'}); }],
    ['Flusso documenti', null], ['KE30: quanto', null], ['Bilancio di verifica', null], ['Consegna gennaio', null],
    ['Febbraio:', null],
    ['KZZ2', function () { window.PC4.scheda({sovrMat: 5, sovrProd: 10, tariffa: 28, lotto: 300}); }],
    ['CK11N: costo standard della TR-STD', function () { window.PC4.calcola({materiale: 'TR-STD', data: '2027-02-01'}); }],
    ['CK11N: costo standard della TR-ALTA', function () { window.PC4.calcola({materiale: 'TR-ALTA', data: '2027-02-01'}); }],
    ['CK11N: costo standard della TR-PED', function () { window.PC4.calcola({materiale: 'TR-PED', data: '2027-02-01'}); }],
    ['CK24', function () { window.PC4.marca({}); window.PC4.rilascia({data: '2027-02-01'}); }],
    ['ME21N', function () { window.MM4.ordine({fornitore: 'F100', materiale: 'FERRO', qta: 9000, prezzo: 1, data: '2027-02-02'}); }],
    ['MIGO 101', function (X) { window.MM4.entrata({ordine: X.N.S.acquisti[0].numero, data: '2027-02-03'}); }],
    ['MIRO', function (X) { window.MM4.fattura({ordine: X.N.S.acquisti[0].numero, rif: 'FT 245/2027', data: '2027-02-05'}); }],
  ];
  var po = function (X, m) { return X.N.S.produzione.filter(function (o) { return o.materiale === m; })[0].numero; };
  [['TR-STD', 300, 2400, 255], ['TR-ALTA', 100, 1000, 95], ['TR-PED', 300, 2790, 240]].forEach(function (x) {
    var m = x[0];
    SD4.push(['CO01: ordine di produzione ' + x[1] + ' ' + m, function () { window.PP4.ordine({materiale: m, qta: x[1], data: '2027-02-06'}); }],
      ['261: ferro all\'ordine ' + m, function (X) { window.PP4.prelievo({ordine: po(X, m), kg: x[2], data: '2027-02-08'}); }],
      ['CO11N: ore dell\'ordine ' + m, function (X) { window.PP4.conferma({ordine: po(X, m), attrezzaggio: 3, ore: x[3], data: '2027-02-10'}); }],
      ['101: entrata ' + x[1] + ' ' + m, function (X) { window.PP4.entrata({ordine: po(X, m), data: '2027-02-12'}); }]);
  });
  var mag = function (X) { return X.N.S.consegne.filter(function (k) { return k.wm && k.data >= '2027-05-01'; }); };
  var apr = function (X, c) { return X.N.S.consegne.filter(function (k) { return k.cliente === c && k.wm; }).slice(-1)[0]; };
  var feb = function (X) { return X.N.S.ordini.filter(function (o) { return o.tipo === 'OR' && o.data >= '2027-02-01' && o.data < '2027-03-01'; }); };
  SD4.push(
    ['Febbraio — VA01: Beta', function (X) { X.ordine({cliente: 'C100', materiale: 'TR-STD', qta: 300, rif: 'BETA-FEB', data: '2027-02-15'}); }],
    ['Febbraio — VA01: Delta', function (X) { X.ordine({cliente: 'C200', materiale: 'TR-ALTA', qta: 120, rif: 'DELTA-FEB', data: '2027-02-15'}); }],
    ['Febbraio — VL01N', function (X) { feb(X).forEach(function (o) { X.consegna({ordine: o.numero, data: '2027-02-20'}); }); }],
    ['Febbraio — VF01', function (X) { X.N.S.consegne.filter(function (c) { return c.tipo === 'LF' && !c.fatturata; }).forEach(function (c) { X.fattura({consegna: c.numero, data: '2027-02-21'}); }); }],
    ['KGI2', function () { window.PC4.sovraccosti({data: '2027-02-28'}); }],
    ['KO88', function () { window.PC4.liquida({data: '2027-02-28'}); }],
    ['KKS2: leggi', null],
    ['CKMLCP', function () { window.PC4.chiusuraML({periodo: '2027-02', data: '2027-02-28'}); }],
    ['KE30: margine di febbraio', null], ['Bilancio di verifica di febbraio', null], ['Consegna il lavoro', null],
    // marzo — magazzino a ubicazioni (WMS) e inventario (UF 9)
    ['Marzo:', null],
    ['Attiva il magazzino W100', function () { window.WM4.attiva({data: '2027-03-01'}); }],
    ['Mappa', null], ['Stampa le etichette', null],
    ['ME21N: 5.000 kg', function () { window.MM4.ordine({fornitore: 'F100', materiale: 'FERRO', qta: 5000, prezzo: 0.98, data: '2027-03-02'}); }],
    ['MIGO 101: entrata del ferro in zona', function (X) { window.MM4.entrata({ordine: X.N.S.acquisti[1].numero, data: '2027-03-03'}); }],
    ['RF: metti a posto', function (X) { window.WM4.aperti().filter(function (t) { return t.tipo === 'PUTAWAY'; }).forEach(function (t) { window.WM4.conferma({compito: t.numero, da: t.da, udc: t.udc, a: t.a, risorsa: 'MAG01 Marco', data: '2027-03-03'}); }); }],
    ['Prova l', null], ['ABC', null],
    ['Crea il documento d', function () { window.IV4.crea({tipo: 'rotazione', selezione: 'A', tolleranza: 20, data: '2027-03-10'}); }],
    ['Attiva il documento', function (X) { window.IV4.attiva({numero: X.N.S.wm.inventari[0].numero, data: '2027-03-10'}); }],
    ['Prima conta', function (X) { var d = X.N.S.wm.inventari[0], v = {numero: d.numero, contatore: 'MAG02 Sara'};
      d.righe.forEach(function (r, k) { v['r' + k] = r.ubic === '01-01-2' ? 18 : r.ubic === '01-02-1' ? 31 : r.libro; }); window.IV4.conta(v); }],
    ['Riconta', function (X) { var d = X.N.S.wm.inventari[0], v = {numero: d.numero, contatore: 'MAG03 Luca'};
      d.righe.forEach(function (r, k) { if (r.riconta) v['r' + k] = r.ubic === '01-01-2' ? 18 : 30; }); window.IV4.conta(v); }],
    ['LI20', function (X) { window.IV4.chiudi({numero: X.N.S.wm.inventari[0].numero, data: '2027-03-11'}); }],
    ['LI21', function () { window.IV4.registra({data: '2027-03-12'}); }],
    ['LX23', null], ['Valorizzazione', null], ['Consegna il lavoro di marzo', null],
    // aprile — spedizione (UF 10)
    ['Aprile:', null],
    ['Aprile — VA01: Comune', function (X) { X.ordine({cliente: 'C300', materiale: 'TR-PED', qta: 250, rif: 'GAMMA-APR', data: '2027-04-05'}); }],
    ['Aprile — VA01: Edil Sigma', function (X) { X.ordine({cliente: 'C400', materiale: 'TR-STD', qta: 60, rif: 'SIGMA-APR', data: '2027-04-05'}); }],
    ['Aprile — VL01N', function (X) { X.N.S.ordini.filter(function (o) { return o.tipo === 'OR' && o.data >= '2027-04-01'; }).forEach(function (o) { X.consegna({ordine: o.numero, data: '2027-04-06'}); }); }],
    ['Lista di prelievo', null],
    ['RF: preleva la consegna del Comune', function (X) { var c = apr(X, 'C300'); var giro = function () { window.WM4.aperti().filter(function (t) { return t.consegna === c.numero; }).forEach(function (t) {
      window.WM4.conferma({compito: t.numero, da: t.da, udc: t.udc, qta: t.da === '01-03-2' && !t.origine ? 48 : t.qta, a: t.a, risorsa: 'MAG02 Sara', data: '2027-04-07'}); }); }; giro(); giro(); }],
    ['RF: preleva la consegna di Edil', function (X) { var c = apr(X, 'C400'); window.WM4.aperti().filter(function (t) { return t.consegna === c.numero; }).forEach(function (t) {
      window.WM4.conferma({compito: t.numero, da: t.da, udc: t.udc, a: t.a, risorsa: 'MAG03 Luca', data: '2027-04-07'}); }); }],
    ['Imballo: 5 pallet', function (X) { window.SP4.imballa({consegna: apr(X, 'C300').numero, imballo: 'EUR', data: '2027-04-07'}); }],
    ['Imballo: 2 pallet', function (X) { window.SP4.imballa({consegna: apr(X, 'C400').numero, imballo: 'EUR', data: '2027-04-07'}); }],
    ['Stampa le etichette SSCC', null],
    ['VT01N', function (X) { window.SP4.creaTrasporto({consegne: [apr(X, 'C300').numero, apr(X, 'C400').numero].join(','), vettore: 'V10', targa: 'FI 123 AB', autista: 'Paolo Bini', porto: 'franco', data: '2027-04-08'}); }],
    ['RF: carica', function () { window.SP4.SP().colli.forEach(function (x) { if (!x.caricato) window.SP4.carica({sscc: x.sscc, data: '2027-04-08'}); }); }],
    ['Prova: leggi', null],
    ['Partenza', function () { window.SP4.parti({trasporto: window.SP4.SP().trasporti[0].numero, data: '2027-04-08'}); }],
    ['Stampa i due DDT', null],
    ['Aprile — VF01', function (X) { [apr(X, 'C300'), apr(X, 'C400')].forEach(function (c) { X.fattura({consegna: c.numero, data: '2027-04-09'}); }); }],
    ['Registra la differenza di prelievo', function () { window.IV4.registra({data: '2027-04-10'}); }],
    ['Monitor VL06O', null], ['Consegna il lavoro di aprile', null],
    // maggio — innovazione (UF 11)
    ['Maggio:', null], ['KPI di maggio', null],
    ['Slotting', function () { window.IN4.applicaSlotting({data: '2027-05-03'}); }],
    ['RF: conferma i 3 trasferimenti', function () { window.WM4.aperti().filter(function (t) { return t.tipo === 'TRASF'; }).forEach(function (t) { window.WM4.conferma({compito: t.numero, da: t.da, udc: t.udc, a: t.a, risorsa: 'MAG01 Marco', data: '2027-05-03'}); }); }],
    ['Attiva il prelievo a ondate', function () { window.IN4.impostazioni({ondate: 'si', crossDock: 'no'}); }],
    ['Maggio — VA01: Beta', function (X) { X.ordine({cliente: 'C100', materiale: 'TR-PED', qta: 120, rif: 'BETA-MAG', data: '2027-05-05'}); }],
    ['Maggio — VA01: Delta', function (X) { X.ordine({cliente: 'C200', materiale: 'TR-ALTA', qta: 20, rif: 'DELTA-MAG', data: '2027-05-05'}); }],
    ['Maggio — VL01N', function (X) { X.N.S.ordini.filter(function (o) { return o.tipo === 'OR' && o.data >= '2027-05-01'; }).forEach(function (o) { X.consegna({ordine: o.numero, data: '2027-05-06'}); }); }],
    ['Rilascia l', function () { window.IN4.rilasciaOndata({data: '2027-05-06'}); }],
    ['RF: preleva l', function () { window.WM4.aperti().filter(function (t) { return t.ondata; }).forEach(function (t) { window.WM4.conferma({compito: t.numero, da: t.da, udc: t.udc, a: t.a, risorsa: 'MAG04 Giulia', data: '2027-05-07'}); }); }],
    ['Maggio — imballo', function (X) { mag(X).forEach(function (c) { window.SP4.imballa({consegna: c.numero, imballo: 'EUR', data: '2027-05-07'}); }); }],
    ['Maggio — VT01N', function (X) { window.SP4.creaTrasporto({consegne: mag(X).map(function (c) { return c.numero; }).join(','), vettore: 'V20', targa: 'PT 456 CD', autista: 'Anna Neri', porto: 'franco', data: '2027-05-08'}); }],
    ['Varco RFID', function () { window.IN4.varco({trasporto: window.SP4.SP().trasporti.slice(-1)[0].numero, data: '2027-05-08'}); }],
    ['Maggio — partenza', function () { window.SP4.parti({trasporto: window.SP4.SP().trasporti.slice(-1)[0].numero, data: '2027-05-08'}); }],
    ['Maggio — VF01', function (X) { mag(X).forEach(function (c) { X.fattura({consegna: c.numero, data: '2027-05-10'}); }); }],
    ['Cross-docking: come', null], ['KPI di fine maggio', null], ['Consegna il lavoro di maggio', null],
    // giugno — tesoreria e paghe · luglio — valute
    ['Giugno:', null], ['Posizione di cassa', null], ['Partite aperte e anzianità', null],
    ['F110', function () { window.TS4.eseguiPagamenti({data: '2027-06-07'}); }],
    ['Carica l', function () { window.TS4.caricaEstratto({data: '2027-06-15', righe: ESTRATTO_GIUGNO}); }],
    ['Abbinamento automatico', function () { window.TS4.abbina({estratto: window.TS4.T().estratti.slice(-1)[0].numero}); }],
    ['FEBAN', function () { var e = window.TS4.T().estratti.slice(-1)[0]; window.TS4.manuale({estratto: e.numero, riga: 5, cliente: 'C400', doc: ''}); }],
    ['Riconciliazione', null],
    ['Presenze di giugno', function () { window.PY4.presenze({matricola: '00001', periodo: '2027-06', straordinari: 8}); }],
    ['Calcola i cedolini', function () { window.PY4.calcola({periodo: '2027-06'}); }],
    ['Stampa il cedolino', null],
    ['Registra la paga', function () { window.PY4.registra({periodo: '2027-06', data: '2027-06-30'}); }],
    ['Paga gli stipendi', function () { window.PY4.pagaNetti({periodo: '2027-06', data: '2027-06-30'}); }],
    ['Luglio:', null],
    ['OB08', function () { [['2027-07-01', 1.10], ['2027-07-20', 1.08], ['2027-07-25', 1.09], ['2027-07-31', 1.12]].forEach(function (t) { window.FX4.tasso({valuta: 'USD', data: t[0], tasso: t[1]}); }); }],
    ['FB70: fattura 22.000', function () { window.FX4.fatturaCliente({cliente: 'C500', importo: 22000, testo: 'progettazione impianto', data: '2027-07-01'}); }],
    ['FB60', function () { window.FX4.fatturaFornitore({fornitore: 'F200', importo: 5500, rif: 'INV-7781', testo: 'consulenza tecnica', data: '2027-07-02'}); }],
    ['FB70: fattura 11.000', function () { window.FX4.fatturaCliente({cliente: 'C500', importo: 11000, testo: 'assistenza tecnica', data: '2027-07-15'}); }],
    ['F24', function () { window.PY4.f24({periodo: '2027-06', data: '2027-07-16'}); }],
    ['Luglio — F-28', function () { window.FX4.regola({documento: window.FX4.V().documenti[0].numero, data: '2027-07-20'}); }],
    ['Luglio — F-53', function () { window.FX4.regola({documento: window.FX4.V().documenti[1].numero, data: '2027-07-25'}); }],
    ['FAGL_FCV', function () { window.FX4.valuta({data: '2027-07-31', storno: 'si'}); }],
    // agosto — ruoli, crediti, disponibilità, storni e SdI, acquisti con approvazione, lotti e seriali · dicembre — paghe
    ['Agosto: ogni transazione', null],
    ['Attiva le autorizzazioni', function () { window.AU4.imposta({attivo: 'si', ruolo: 'CREDITI'}); }],
    ['FD32', function () { ru('CREDITI'); window.SD4.anagraficaCredito({cliente: 'C400', fido: 5000, rischio: 'C', data: '2027-08-02'}); }],
    ['VA01: 20 TR-PED', function () { ru('VENDITE'); window.SD4.ordine({cliente: 'C400', materiale: 'TR-PED', qta: 20, data: '2027-08-02'}); }],
    ['Prova a consegnare', null],
    ['VKM1', function () { ru('CREDITI'); window.SD4.decisioneCredito({ordine: ult('OR', 'C400').numero, decisione: 'rilascia', nota: 'acconto promesso', data: '2027-08-03'}); }],
    ['VA01: 30 TR-ALTA', function () { ru('VENDITE'); window.SD4.ordine({cliente: 'C200', materiale: 'TR-ALTA', qta: 30, data: '2027-08-03'}); }],
    ['CO01: 20 TR-ALTA', function () { ru('PRODUZIONE'); window.PP4.ordine({materiale: 'TR-ALTA', qta: 20, data: '2027-08-04'}); }],
    ['Approvvigiona la linea', function () { ru('PRODUZIONE'); window.WM4.approvvigiona({ordine: opA().numero, kg: 200, data: '2027-08-04'}); }],
    ['RF: porta il ferro', function () { rf('2027-08-04'); }],
    ['261, CO11N e 101', function () { ru('PRODUZIONE'); var o = opA().numero; window.PP4.prelievo({ordine: o, kg: 200, data: '2027-08-04'}); window.PP4.conferma({ordine: o, attrezzaggio: 3, ore: 16, data: '2027-08-05'}); window.PP4.entrata({ordine: o, qta: 20, data: '2027-08-05'}); }],
    ['RF: metti a scaffale le transenne', function () { rf('2027-08-05'); }],
    ['Conferma automatica', null],
    ['VL01N: consegne di Edil Sigma', function () { ru('CAPO_MAG'); window.SD4.consegna({ordine: ult('OR', 'C400').numero, data: '2027-08-06'}); window.SD4.consegna({ordine: ult('OR', 'C200').numero, data: '2027-08-06'}); }],
    ['Rilascia l\'ondata e preleva', function () { ru('CAPO_MAG'); if (window.IN4 && (window.SD4.N.S.wm || {}).ondate) window.IN4.rilasciaOndata({data: '2027-08-06'}); rf('2027-08-06'); }],
    ['VL02N: uscita merci delle due', function () { ru('CAPO_MAG'); consAgo().forEach(function (c) { window.SD4.uscitaMerci({consegna: c.numero, data: '2027-08-06'}); }); }],
    ['VF01: fattura Edil Sigma con la data sbagliata', function () { ru('VENDITE'); window.SD4.fattura({consegna: consAgo()[0].numero, data: '2027-08-17'}); }],
    ['VF11: storna', function () { ru('VENDITE'); window.ST4.vf11({fattura: window.SD4.N.S.fatture.filter(function (f) { return f.data === '2027-08-17'; })[0].numero, data: '2027-08-17'}); }],
    ['VF01: rifai', function () { ru('VENDITE'); consAgo().forEach(function (c) { window.SD4.fattura({consegna: c.numero, data: '2027-08-07'}); }); }],
    ['Trasmetti le due fatture', function () { ru('CONTABILE'); fattAgo().forEach(function (f) { window.ST4.inviaSdi({fattura: f.numero, data: '2027-08-07'}); }); }],
    ['Prova a stornare la fattura di Delta', null],
    ['VA01 G2', function () { ru('VENDITE'); window.SD4.richiestaAbbuono({fattura: fattAgo()[1].numero, importo: 200, motivo: '2 transenne graffiate', data: '2027-08-09'}); }],
    ['Approva la richiesta', function () { var g = ult('G2'); ru('CREDITI'); window.SD4.approvaAbbuono({richiesta: g.numero, data: '2027-08-09'}); ru('VENDITE'); window.SD4.notaCreditoAbbuono({richiesta: g.numero, data: '2027-08-09'}); }],
    ['Trasmetti la nota di credito', function () { ru('CONTABILE'); window.ST4.inviaSdi({fattura: window.SD4.N.S.fatture.filter(function (f) { return f.tipo === 'G2'; }).slice(-1)[0].numero, data: '2027-08-09'}); }],
    ['ME51N', function () { ru('PRODUZIONE'); window.MM4.richiesta({materiale: 'FERRO', qta: 12000, consegna: '2027-08-20', richiedente: 'Produzione', data: '2027-08-10'}); }],
    ['ME54N', function () { ru('RESP_ACQ'); window.MM4.approva({rda: window.SD4.N.S.rda.slice(-1)[0].numero, decisione: 'approva', data: '2027-08-10'}); }],
    ['ME21N: ordine con riferimento', function () { ru('BUYER'); window.MM4.ordine({rda: window.SD4.N.S.rda.slice(-1)[0].numero, fornitore: 'F100', prezzo: 0.97, data: '2027-08-11'}); }],
    ['ME29N', function () { ru('RESP_ACQ'); window.MM4.rilascia({ordine: window.SD4.N.S.acquisti.slice(-1)[0].numero, decisione: 'rilascia', data: '2027-08-11'}); }],
    ['MIGO: prima consegna', function () { ru('CAPO_MAG'); window.MM4.entrata({ordine: window.SD4.N.S.acquisti.slice(-1)[0].numero, qta: 4000, ddt: 'AU-0816', lotto: 'COL-0816', danneggiati: 1000, danno: 'fascio piegato in scarico', data: '2027-08-16'}); }],
    ['RF: metti a catasta', function () { rf('2027-08-16'); }],
    ['Quarantena: rottama', function () { ru('CAPO_MAG'); window.WM4.rottama({udc: window.WM4.bloccati()[0].udc, motivo: 'tubi piegati, non raddrizzabili', data: '2027-08-17'}); }],
    ['Pallet urtato', function () { ru('MAGAZZINIERE'); var q = window.WM4.quanti(function (x) { return x.mat === 'TR-PED' && x.qta > 0 && /^0/.test(x.ubic); })[0]; window.WM4.blocca({udc: q.udc, motivo: 'pallet urtato dal carrello', data: '2027-08-18'}); rf('2027-08-18'); }],
    ['Controllo: è integro', function () { ru('CAPO_MAG'); window.WM4.sblocca({udc: window.WM4.bloccati()[0].udc, motivo: 'controllato: integro', data: '2027-08-19'}); rf('2027-08-19'); }],
    ['MB56', null], ['IQ03', null],
    ['Calcola le paghe da luglio', function () { ru('PAGHE'); ['07', '08', '09', '10', '11', '12'].forEach(function (m) { window.PY4.calcola({periodo: '2027-' + m}); }); }]);
  var ru = function (r) { window.AU4.imposta({ruolo: r}); };
  var rf = function (d) { ru('MAGAZZINIERE'); window.WM4.aperti().forEach(function (t) { window.WM4.conferma({compito: t.numero, data: d}); }); };
  var ult = function (tipo, cli) { return window.SD4.N.S.ordini.filter(function (o) { return o.tipo === tipo && (!cli || o.cliente === cli); }).slice(-1)[0]; };
  var opA = function () { return window.SD4.N.S.produzione.filter(function (o) { return o.materiale === 'TR-ALTA'; }).slice(-1)[0]; };
  var consAgo = function () { var o = [ult('OR', 'C400').numero, ult('OR', 'C200').numero]; return window.SD4.N.S.consegne.filter(function (c) { return c.tipo === 'LF' && o.indexOf(c.ordine) >= 0; }).sort(function (a, b) { return o.indexOf(a.ordine) - o.indexOf(b.ordine); }); };
  var fattAgo = function () { var c = consAgo().map(function (x) { return x.numero; }); return window.SD4.N.S.fatture.filter(function (f) { return f.tipo === 'F2' && !f.stornata && c.indexOf(f.consegna) >= 0; }).sort(function (a, b) { return c.indexOf(a.consegna) - c.indexOf(b.consegna); }); };
  var ESTRATTO_GIUGNO = ['2027-06-08;-10980;SEPA SCT ADDEBITO DISTINTA F110-001 ACCIAIERIE UMBRE', '2027-06-09;18651,36;BONIFICO DA BETA COSTRUZIONI SRL RIF FT 90000002',
    '2027-06-10;12383;BONIFICO COMUNE DI GAMMA MANDATO 145 FT 90000004', '2027-06-11;10043,04;BONIFICO DELTA NOLEGGI SRL', '2027-06-12;4800;BONIFICO EDIL SIGMA SRL',
    '2027-06-15;-18,50;COMMISSIONI E SPESE TENUTA CONTO', '2027-06-15;3,11;INTERESSI CREDITORI NETTI'].join('\n');
  // esegue il copione fino al passo che comincia con «finoA» (escluso); senza «finoA» lo esegue tutto
  function esegui(copione, modulo, finoA) {
    modulo.M.azzera();
    for (var i = 0; i < copione.length; i++) {
      var voce = copione[i];
      if (finoA && voce[0].indexOf(finoA) === 0) break;
      if (voce[1]) voce[1](modulo);
    }
    modulo.M.salva();
    return modulo.M.S;
  }
  window.LabCopioni = {HMLV: HMLV, REM: REM, SD4: SD4, esegui: esegui};
})();
