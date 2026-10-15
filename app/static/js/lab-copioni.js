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
  window.LabCopioni = {HMLV: HMLV, REM: REM, esegui: esegui};
})();
