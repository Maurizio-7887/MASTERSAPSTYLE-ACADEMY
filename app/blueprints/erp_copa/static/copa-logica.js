/* SISTEMA INTEGRATO — CO-PA (Profitability Analysis, calcolatoria basata su caratteristiche).
   Ogni fattura e nota di credito scrive una riga con le caratteristiche (cliente, materiale, regione, canale, gruppo)
   e i campi valore (ricavi lordi, sconti, trasporti, abbuoni, costo del venduto, provvigioni).
   Schema di margine (KE30):
     Ricavi lordi − Sconti quantità − Sconti cliente + Trasporti addebitati = Ricavi netti
     − Resi e abbuoni = Ricavi netti dopo rettifiche
     − Costo del venduto a standard − Differenze di prezzo dal Material Ledger = MARGINE DI CONTRIBUZIONE I (a costo effettivo)
     − Provvigioni agenti = MARGINE DI CONTRIBUZIONE II */
window.COPA = (function () {
  'use strict';
  var r2 = window.LabMotore.r2;
  var DIMENSIONI = {cliente: 'Cliente', materiale: 'Materiale', regione: 'Regione', canale: 'Canale di distribuzione', gruppo: 'Gruppo clienti', profitCenter: 'Centro di profitto'};
  var PROFIT_DEFAULT = [
    {codice:'PC-TR',nome:'Business transenne',responsabile:'Direzione commerciale transenne'},
    {codice:'PC-SL',nome:'Semilavorati e componenti',responsabile:'Responsabile linea componenti'}
  ];
  function impianto(S) {
    if (!S.copaProfit) S.copaProfit = {centri: PROFIT_DEFAULT.map(function(x){return Object.assign({},x);}), materiale:{}};
    if (!S.copaProfit.centri) S.copaProfit.centri = PROFIT_DEFAULT.map(function(x){return Object.assign({},x);});
    if (!S.copaProfit.materiale) S.copaProfit.materiale = {};
    return S.copaProfit;
  }
  function profitCenter(S,r) {
    var cfg=impianto(S), m=String(r.materiale || '');
    var codice=cfg.materiale[m];
    // Non attribuire automaticamente ricavi a reparti o centri di costo.
    return codice && cfg.centri.some(function(c){return c.codice === codice;}) ? codice : 'NON-ASSEGNATO';
  }
  function salvaAssegnazione(S,materiale,centro) {
    var cfg=impianto(S), m=String(materiale || '').trim(), c=String(centro || '').trim();
    if (!(S.materiali || {})[m]) throw Error('Materiale sconosciuto: '+m);
    if (c && !cfg.centri.some(function(x){return x.codice===c;})) throw Error('Centro di profitto non valido: '+c);
    if (!c) delete cfg.materiale[m]; else cfg.materiale[m]=c;
    return c;
  }
  var CAMPI = ['qta', 'ricaviLordi', 'scontiQuantita', 'scontiCliente', 'trasporti', 'abbuoni', 'costoVenduto', 'diffPrezzo', 'provvigioni'];
  function margini(x) {
    x.ricaviNetti = r2(x.ricaviLordi - x.scontiQuantita - x.scontiCliente + x.trasporti);
    x.ricaviRettificati = r2(x.ricaviNetti + x.abbuoni);              // gli abbuoni sono negativi
    x.mdc1Std = r2(x.ricaviRettificati - x.costoVenduto);
    x.mdc1 = r2(x.mdc1Std - (x.diffPrezzo || 0));
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
        var k = (dim === 'profitCenter' ? profitCenter(S,r) : r[dim]) || '—';
        var g = gruppi[k] = gruppi[k] || {chiave: k};
        CAMPI.forEach(function (c) { g[c] = r2((g[c] || 0) + (r[c] || 0)); });
      });
    var righe = Object.keys(gruppi).sort().map(function (k) { return margini(gruppi[k]); });
    var tot = {chiave: 'Totale'}; CAMPI.forEach(function (c) { tot[c] = r2(righe.reduce(function (t, x) { return t + x[c]; }, 0)); });
    return {righe: righe, totale: margini(tot)};
  }
  // Conto economico per centro di profitto letto dalle RIGHE FI (non da CO-PA): ricavi e costo del venduto
  // ereditano il materiale dal documento d'origine (fattura, consegna, reso, nota di credito) e da lì il centro.
  // Serve a riconciliare FI con KE30 per centro di profitto: le due viste devono dare gli stessi margini.
  var CONTI_PC = {'40': 'ricaviLordi', '47': 'sconti', '48': 'trasporti', '49': 'abbuoni', '41': 'costoVenduto', '42': 'diffPrezzo', '57': 'provvigioni'};
  function materialeDi(S, r) {
    var rif = String(r.rif || '');
    var doc = ['fatture', 'consegne', 'ordini', 'noteCredito'].reduce(function (x, k) { return x || (S[k] || []).find(function (d) { return d.numero === rif; }); }, null);
    if (doc && doc.materiale) return doc.materiale;
    var m = /\bpz ([A-Z][A-Z0-9-]+)/.exec(String(r.descrizione || ''));
    return m && (S.materiali || {})[m[1]] ? m[1] : '';
  }
  function fiPerProfitCenter(S, anno) {
    var gruppi = {};
    (S.registrazioni || []).forEach(function (r) {
      if (r.chiusura || r.stornato || (anno && String(r.data).slice(0, 4) !== String(anno))) return;
      var mat = null;
      r.righe.forEach(function (x) {
        var campo = CONTI_PC[String(x.conto)]; if (!campo) return;
        if (mat === null) mat = materialeDi(S, r);
        var pc = mat ? profitCenter(S, {materiale: mat}) : 'NON-ASSEGNATO';
        var g = gruppi[pc] = gruppi[pc] || {chiave: pc, ricaviLordi: 0, sconti: 0, trasporti: 0, abbuoni: 0, costoVenduto: 0, diffPrezzo: 0, provvigioni: 0};
        var v = (x.dareAvere === 'DARE' ? 1 : -1) * x.importo;
        g[campo] = r2(g[campo] + (campo === 'ricaviLordi' || campo === 'trasporti' || campo === 'abbuoni' ? -v : v));
      });
    });
    return Object.keys(gruppi).sort().map(function (k) {
      var g = gruppi[k];
      g.ricaviNetti = r2(g.ricaviLordi - g.sconti + g.trasporti + g.abbuoni);
      g.mdc1 = r2(g.ricaviNetti - g.costoVenduto - g.diffPrezzo); g.mdc2 = r2(g.mdc1 - g.provvigioni);
      return g;
    });
  }
  return {DIMENSIONI: DIMENSIONI, CAMPI: CAMPI, report: report, margini: margini, impianto: impianto, profitCenter: profitCenter, salvaAssegnazione: salvaAssegnazione,
          fiPerProfitCenter: fiPerProfitCenter, materialeDi: materialeDi};
})();
