/* SISTEMA INTEGRATO — CO-PA (Profitability Analysis, calcolatoria basata su caratteristiche).
   Ogni fattura e nota di credito scrive una riga con le caratteristiche (cliente, materiale, regione, canale, gruppo)
   e i campi valore (ricavi lordi, sconti, trasporti, abbuoni, costo del venduto, provvigioni).
   Schema di margine (KE30):
     Ricavi lordi − Sconti quantità − Sconti cliente + Trasporti addebitati = Ricavi netti
     − Resi e abbuoni = Ricavi netti dopo rettifiche
     − Costo del venduto a standard = MARGINE DI CONTRIBUZIONE I
     − Provvigioni agenti = MARGINE DI CONTRIBUZIONE II */
window.COPA = (function () {
  'use strict';
  var r2 = window.LabMotore.r2;
  var DIMENSIONI = {cliente: 'Cliente', materiale: 'Materiale', regione: 'Regione', canale: 'Canale di distribuzione', gruppo: 'Gruppo clienti'};
  var CAMPI = ['qta', 'ricaviLordi', 'scontiQuantita', 'scontiCliente', 'trasporti', 'abbuoni', 'costoVenduto', 'provvigioni'];
  function margini(x) {
    x.ricaviNetti = r2(x.ricaviLordi - x.scontiQuantita - x.scontiCliente + x.trasporti);
    x.ricaviRettificati = r2(x.ricaviNetti + x.abbuoni);              // gli abbuoni sono negativi
    x.mdc1 = r2(x.ricaviRettificati - x.costoVenduto);
    x.mdc2 = r2(x.mdc1 - x.provvigioni);
    x.mdc1Perc = x.ricaviRettificati ? r2(x.mdc1 / x.ricaviRettificati * 100) : 0;
    x.mdc2Perc = x.ricaviRettificati ? r2(x.mdc2 / x.ricaviRettificati * 100) : 0;
    return x;
  }
  function report(S, dim, filtro) {
    filtro = filtro || {};
    var gruppi = {};
    (S.copa || []).filter(function (r) { return (!filtro.dal || r.data >= filtro.dal) && (!filtro.al || r.data <= filtro.al) && Object.keys(filtro.car || {}).every(function (k) { return !filtro.car[k] || r[k] === filtro.car[k]; }); })
      .forEach(function (r) {
        var k = r[dim] || '—';
        var g = gruppi[k] = gruppi[k] || {chiave: k};
        CAMPI.forEach(function (c) { g[c] = r2((g[c] || 0) + (r[c] || 0)); });
      });
    var righe = Object.keys(gruppi).sort().map(function (k) { return margini(gruppi[k]); });
    var tot = {chiave: 'Totale'}; CAMPI.forEach(function (c) { tot[c] = r2(righe.reduce(function (t, x) { return t + x[c]; }, 0)); });
    return {righe: righe, totale: margini(tot)};
  }
  return {DIMENSIONI: DIMENSIONI, CAMPI: CAMPI, report: report, margini: margini};
})();
