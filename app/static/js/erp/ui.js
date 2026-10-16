/* SISTEMA INTEGRATO — aiuti di interfaccia comuni alle pagine (selezioni di clienti, materiali, documenti). */
(function () {
  'use strict';
  var L = window.LabMotore;
  window.S4UI = {
    clienti: function (S) { return Object.keys(S.clienti).map(function (k) { return [k, k + ' — ' + S.clienti[k].nome + ' (' + S.clienti[k].regione + ')']; }); },
    materiali: function (S, tutti) { return Object.keys(S.materiali).filter(function (k) { return tutti || S.materiali[k].tipo !== 'ROH'; }).map(function (k) { return [k, k + ' — ' + S.materiali[k].nome]; }); },
    vendibili: function (S) { return Object.keys(S.materiali).filter(function (k) { return S.materiali[k].tipo === 'FERT'; }).map(function (k) { return [k, k + ' — ' + S.materiali[k].nome]; }); },
    lista: function (arr, etichetta, vuoto, chiave) { return arr.length ? arr.map(function (x) { return [chiave ? chiave(x) : x.numero, etichetta(x)]; }) : [['', vuoto || '— nessun documento —']]; },
    fornitori: function (S) { return Object.keys(S.fornitori || {}).map(function (k) { return [k, k + ' — ' + S.fornitori[k].nome]; }); },
    nome: function (S, c) { return (S.clienti[c] || {}).nome || c; },
    avviso: function (S) { return S.avviato ? '' : '<div class="lab-esito ko">⚠ Il sistema non è ancora avviato: vai su <b>Dati di base → Avvio del sistema</b>.</div>'; },
    righePrezzi: function (p) {
      return L.tabella(['Cond.', 'Descrizione', 'Base / %›', 'Importo €›'], [
        ['PR00', 'Prezzo (' + p.prezzoDa + ')', L.eur(p.prezzo) + ' × ' + L.n0(p.qta), L.eur(p.lordo)],
        ['ZSCA', 'Sconto quantità a scaglioni', p.scontoQPerc + ' %', p.scontoQ ? '−' + L.eur(p.scontoQ) : '0,00'],
        ['K007', 'Sconto cliente', p.scontoCPerc + ' %', p.scontoC ? '−' + L.eur(p.scontoC) : '0,00'],
        ['KF00', 'Trasporto', L.eur(p.trasportoUnit) + ' €/pz', L.eur(p.trasporto)],
        {cls: 'tot', celle: ['', 'Netto', '', L.eur(p.netto)]},
        ['MWST', 'IVA', p.ivaPerc + ' %', L.eur(p.iva)],
        {cls: 'tot', celle: ['', 'Totale documento', '', L.eur(p.totale)]},
        ['VPRS', 'Costo standard (statistico)', '', L.eur(p.costo)],
        ['', 'Margine', '', L.eur(p.margine)],
        ['ERB1', 'Provvigione agente (accantonamento)', p.provvPerc + ' %', L.eur(p.provvigione)]]);
    },
  };
})();
