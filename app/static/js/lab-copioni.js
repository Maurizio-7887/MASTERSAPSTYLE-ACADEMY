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
    ['Registra la differenza di prelievo', function () { window.IV4.registra({data: '2027-04-10'}); }]);
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
