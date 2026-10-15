/* SISTEMA INTEGRATO — Acquisti: ME21N ordine d'acquisto, MIGO 101 entrata merci, MIRO fattura fornitore. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, MM = window.MM4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var roh = function () { return Object.keys(S().materiali).filter(function (k) { return S().materiali[k].tipo === 'ROH'; }).map(function (k) { return [k, k + ' — ' + S().materiali[k].nome + ' (standard ' + eur(S().materiali[k].std) + ' €/' + S().materiali[k].um + ')']; }); };
  var etich = function (o) { return o.numero + ' · ' + e(S().fornitori[o.fornitore].nome) + ' · ' + n0(o.qta) + ' ' + o.materiale + ' a ' + eur(o.prezzo); };
  var elenco = function () {
    return L.scheda('📋', 'Ordini d\'acquisto', 'ME2N', L.tabella(['Ordine', 'Data', 'Fornitore', 'Materiale', 'Q.tà›', 'Prezzo›', 'Valore›', 'Entrato›', 'Fatturato›'], S().acquisti.map(function (o) {
      return [o.numero, fd(o.data), e(S().fornitori[o.fornitore].nome), o.materiale, n0(o.qta), eur(o.prezzo), eur(o.qta * o.prezzo), n0(o.entrato), n0(o.fatturato)]; }), 'Nessun ordine d\'acquisto.'));
  };
  var PAGINE = {
    ordini: function () {
      radice.innerHTML = U.avviso(S()) + L.scheda('🛒', 'Crea ordine d\'acquisto', 'ME21N · tipo NB', L.modulo('me', [['fornitore', 'Fornitore', 'select', 'F100', U.fornitori(S())], ['materiale', 'Materiale', 'select', 'FERRO', roh()],
        ['qta', 'Quantità', 'num'], ['prezzo', 'Prezzo netto €/unità', 'num'], ['data', 'Data', 'date']], [['me', 'Salva ordine']]) +
        '<p class="lab-nota">Il ferro ha <b>controllo prezzo S</b> (standard): qualunque sia il prezzo d\'acquisto, il magazzino si carica a standard. La differenza va al conto 63 e nel Material Ledger.</p>') + elenco();
      L.collega(radice, 'me', {me: MM.ordine}, rendi);
    },
    entrate: function () {
      var aperti = S().acquisti.filter(function (o) { return o.entrato < o.qta; });
      radice.innerHTML = U.avviso(S()) + L.scheda('📥', 'Entrata merci da ordine d\'acquisto', 'MIGO · 101', L.modulo('mi', [['ordine', 'Ordine d\'acquisto', 'select', '', U.lista(aperti, etich, '— nessun ordine da ricevere —')],
        ['qta', 'Quantità (vuoto = tutto il residuo)', 'num'], ['data', 'Data di registrazione', 'date']], [['mi', 'Registra entrata']]) +
        '<p class="lab-nota">D 12 Magazzino a standard · D/A 63 Differenza prezzo / A 22 WE/RE al prezzo d\'ordine. Il WE/RE si chiude con la fattura (MIRO).</p>') +
        L.scheda('📦', 'Giacenza materie prime', 'MMBE', L.tabella(['Materiale', 'Giacenza›', 'Standard›', 'Valore a standard›'], roh().map(function (x) { var m = S().materiali[x[0]]; return [x[0], n0(S().giacenze[x[0]]) + ' ' + m.um, eur(m.std), eur(S().giacenze[x[0]] * m.std)]; }))) + elenco();
      L.collega(radice, 'mi', {mi: MM.entrata}, rendi);
    },
    fatture: function () {
      var daF = S().acquisti.filter(function (o) { return o.entrato > o.fatturato; });
      radice.innerHTML = U.avviso(S()) + L.scheda('🧾', 'Fattura fornitore', 'MIRO', L.modulo('mr', [['ordine', 'Con riferimento all\'ordine', 'select', '', U.lista(daF, etich, '— nessuna entrata da fatturare —')],
        ['rif', 'Numero fattura del fornitore', 'text'], ['qta', 'Quantità (vuoto = tutto l\'entrato)', 'num'], ['prezzo', 'Prezzo fatturato (vuoto = prezzo d\'ordine)', 'num'], ['data', 'Data', 'date']], [['mr', 'Registra fattura']]) +
        '<p class="lab-nota">D 22 WE/RE · D 14 IVA a credito / A 20 Fornitore. Se il prezzo fatturato è diverso da quello d\'ordine, la differenza va al conto 63 (e al Material Ledger).</p>') +
        L.scheda('📚', 'Fatture fornitore registrate', '', L.tabella(['Documento', 'Fattura', 'Data', 'Ordine', 'Fornitore', 'Imponibile›', 'IVA›', 'Totale›'], S().fattureFornitore.map(function (f) {
          return [f.numero, e(f.rif), fd(f.data), f.ordine, e(S().fornitori[f.fornitore].nome), eur(f.imponibile), eur(f.iva), eur(f.totale)]; }), 'Nessuna fattura.'));
      L.collega(radice, 'mr', {mr: MM.fattura}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.ordini)(); }
  rendi();
})();
