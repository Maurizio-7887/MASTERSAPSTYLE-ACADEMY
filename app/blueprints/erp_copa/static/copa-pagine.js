/* SISTEMA INTEGRATO — CO-PA: KE30 conto economico per segmento e KE24 righe singole. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, K = window.COPA, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var etichetta = function (dim, k) { return dim === 'cliente' ? k + ' ' + e(U.nome(S(), k)) : e(k); };
  var PAGINE = {
    ke30: function () {
      var dim = radice.dataset.dim || 'cliente', rep = K.report(S(), dim);
      var col = rep.righe.concat([rep.totale]);
      var riga = function (nomeR, campo, segno, cls) { return {cls: cls || '', celle: [nomeR].concat(col.map(function (x) { return (segno && x[campo] ? '−' : '') + eur(Math.abs(x[campo]) * (segno ? 1 : Math.sign(x[campo]) || 1)); }))}; };
      var righe = [riga('Quantità (pz)', 'qta'), riga('Ricavi lordi (PR00)', 'ricaviLordi'), riga('Sconti quantità (ZSCA)', 'scontiQuantita', true), riga('Sconti cliente (K007)', 'scontiCliente', true),
        riga('Trasporti addebitati (KF00)', 'trasporti'), riga('= Ricavi netti', 'ricaviNetti', false, 'tot'), riga('Resi e abbuoni (G2)', 'abbuoni'), riga('= Ricavi netti dopo rettifiche', 'ricaviRettificati', false, 'tot'),
        riga('Costo del venduto a standard (VPRS)', 'costoVenduto', true), riga('= MARGINE DI CONTRIBUZIONE I', 'mdc1', false, 'tot'),
        {celle: ['  MdC I in % dei ricavi'].concat(col.map(function (x) { return n0(x.mdc1Perc) + ' %'; }))},
        riga('Provvigioni agenti (ERB1)', 'provvigioni', true), riga('= MARGINE DI CONTRIBUZIONE II', 'mdc2', false, 'tot'),
        {celle: ['  MdC II in % dei ricavi'].concat(col.map(function (x) { return n0(x.mdc2Perc) + ' %'; }))}];
      righe[0] = {celle: ['Quantità (pz)'].concat(col.map(function (x) { return n0(x.qta); }))};
      radice.innerHTML = U.avviso(S()) +
        '<div class="lab-filtro"><label>Analizza per <select id="dim">' + Object.keys(K.DIMENSIONI).map(function (k) { return '<option value="' + k + '"' + (k === dim ? ' selected' : '') + '>' + K.DIMENSIONI[k] + '</option>'; }).join('') + '</select></label>' +
        '<span class="lab-nota">Il conto economico per segmento: stesse fatture, viste per ' + K.DIMENSIONI[dim].toLowerCase() + '.</span></div>' +
        L.scheda('📊', 'Margine di contribuzione per ' + K.DIMENSIONI[dim].toLowerCase(), 'KE30', L.tabella(['Voce'].concat(col.map(function (x) { return (x.chiave === 'Totale' ? '<b>Totale</b>' : etichetta(dim, x.chiave)) + '›'; })), righe, 'Nessuna fattura ancora.') +
          '<p class="lab-nota">Il CO-PA è calcolatorio: legge i campi valore scritti dalle fatture (ricavi, sconti, costo standard VPRS). Il costo del venduto è a standard: le varianze di produzione si possono attribuire con un ciclo a parte (tappa successiva).</p>');
      radice.querySelector('#dim').onchange = function () { radice.dataset.dim = this.value; rendi(); };
    },
    ke24: function () {
      radice.innerHTML = U.avviso(S()) + L.scheda('🧾', 'Righe singole CO-PA', 'KE24', L.tabella(['Data', 'Documento', 'Tipo', 'Cliente', 'Materiale', 'Regione', 'Canale', 'Q.tà›', 'Ricavi lordi›', 'Sconti›', 'Trasporti›', 'Abbuoni›', 'Costo venduto›', 'Provvigioni›'],
        S().copa.map(function (r) { return [fd(r.data), r.doc, r.tipo, etichetta('cliente', r.cliente), r.materiale, r.regione, r.canale, n0(r.qta), eur(r.ricaviLordi), eur(r.scontiQuantita + r.scontiCliente), eur(r.trasporti), eur(r.abbuoni), eur(r.costoVenduto), eur(r.provvigioni)]; }), 'Nessuna riga.'));
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.ke30)(); }
  rendi();
})();
