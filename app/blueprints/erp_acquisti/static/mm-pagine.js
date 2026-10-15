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
    return L.scheda('📋', 'Ordini d\'acquisto', 'ME2N', L.tabella(['Ordine', 'Data', 'Richiesta', 'Fornitore', 'Materiale', 'Q.tà›', 'Prezzo›', 'Valore›', 'Rilascio', 'Entrato›', 'Fatturato›'], S().acquisti.map(function (o) {
      return [o.numero, fd(o.data), o.rda || '', e(S().fornitori[o.fornitore].nome), o.materiale, n0(o.qta), eur(o.prezzo), eur(o.qta * o.prezzo), !o.rilascio ? 'non serve' : o.rilascio.stato === 'rilasciato' ? '<span class="lab-bd verde">rilasciato</span>' : '<span class="lab-bd arancio">' + o.rilascio.stato + '</span>', n0(o.entrato), n0(o.fatturato)]; }), 'Nessun ordine d\'acquisto.'));
  };
  var PAGINE = {
    richieste: function () {
      var P = MM.P(), daApp = P.rda.filter(function (r) { return r.stato === 'da approvare'; });
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🙋', 'Richiesta d\'acquisto', 'ME51N · tipo NB', L.modulo('rq', [['materiale', 'Materiale', 'select', 'FERRO', roh()], ['qta', 'Quantità', 'num'], ['consegna', 'Serve per il', 'date'], ['prezzo', 'Prezzo stimato (vuoto = standard)', 'num'],
          ['richiedente', 'Richiedente', 'select', 'Produzione', ['Produzione', 'Magazzino', 'Manutenzione', 'Ufficio tecnico']], ['motivo', 'Motivo', 'text'], ['data', 'Data', 'date']], [['rq', 'Crea la richiesta']]) +
          '<p class="lab-nota">Chi ha bisogno del materiale (produzione, magazzino) <b>chiede</b>; non compra. La richiesta non è un impegno verso il fornitore.</p>') +
        L.scheda('✅', 'Approvazione', 'ME54N · ME55', L.modulo('ap', [['rda', 'Richiesta da approvare', 'select', '', U.lista(daApp, function (r) { return r.numero + ' · ' + n0(r.qta) + ' ' + r.materiale + ' · ' + eur(r.valore) + ' · ' + e(r.richiedente); }, '— nessuna richiesta da approvare —')],
          ['decisione', 'Decisione', 'select', 'approva', [['approva', 'Approva (rilascio 01)'], ['rifiuta', 'Rifiuta']]], ['nota', 'Nota', 'text'], ['data', 'Data', 'date']], [['ap', 'Registra la decisione']]) +
          '<p class="lab-nota">Approva il responsabile del reparto (o il controller): solo una richiesta approvata diventa un ordine.</p>') + '</div>' +
        L.scheda('📋', 'Richieste d\'acquisto', 'ME5A', L.tabella(['Richiesta', 'Data', 'Materiale', 'Q.tà›', 'Serve per', 'Valore stimato›', 'Richiedente', 'Stato', 'Ordine'], P.rda.map(function (r) {
          return [r.numero, fd(r.data), r.materiale, n0(r.qta), fd(r.consegna), eur(r.valore), e(r.richiedente), r.stato === 'approvata' ? '<span class="lab-bd verde">approvata</span>' : r.stato === 'ordinata' ? '<span class="lab-bd blu">ordinata</span>' : r.stato === 'rifiutata' ? '<span class="lab-bd arancio">rifiutata</span>' : '<span class="lab-bd giallo">da approvare</span>', r.ordine || '']; }), 'Nessuna richiesta.'));
      L.collega(radice, 'rq', {rq: MM.richiesta}, rendi); L.collega(radice, 'ap', {ap: MM.approva}, rendi);
    },
    ordini: function () {
      var P = MM.P(), app = P.rda.filter(function (r) { return r.stato === 'approvata'; }), bloc = S().acquisti.filter(function (o) { return o.rilascio && o.rilascio.stato === 'bloccato'; });
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' + L.scheda('🛒', 'Crea ordine d\'acquisto', 'ME21N · tipo NB', L.modulo('me', [['rda', 'Con riferimento alla richiesta', 'select', '', [['', '— senza richiesta —']].concat(app.map(function (r) { return [r.numero, r.numero + ' · ' + n0(r.qta) + ' ' + r.materiale + ' · per il ' + fd(r.consegna)]; }))],
        ['fornitore', 'Fornitore', 'select', 'F100', U.fornitori(S())], ['materiale', 'Materiale', 'select', 'FERRO', roh()],
        ['qta', 'Quantità (vuoto = quella della richiesta)', 'num'], ['prezzo', 'Prezzo netto €/unità', 'num'], ['data', 'Data', 'date']], [['me', 'Salva ordine']]) +
        '<p class="lab-nota">Il ferro ha <b>controllo prezzo S</b> (standard): qualunque sia il prezzo d\'acquisto, il magazzino si carica a standard. La differenza va al conto 63 e nel Material Ledger.</p>') +
        L.scheda('🔒', 'Rilascio degli ordini sopra soglia', 'ME29N · strategia di rilascio', L.modulo('rl', [['ordine', 'Ordine bloccato', 'select', '', U.lista(bloc, etich, '— nessun ordine da rilasciare —')], ['decisione', 'Decisione', 'select', 'rilascia', [['rilascia', 'Rilascia'], ['rifiuta', 'Non rilasciare']]], ['data', 'Data', 'date']], [['rl', 'Registra']]) +
          L.modulo('so', [['soglia', 'Soglia di rilascio €', 'num', P.acqParam.soglia]], [['so', 'Salva la soglia', 'sec']]) + '<p class="lab-nota">Sopra la soglia l\'ordine nasce bloccato: non si invia e non riceve merce finché il responsabile acquisti non lo rilascia.</p>') + '</div>' + elenco();
      L.collega(radice, 'me', {me: MM.ordine}, rendi); L.collega(radice, 'rl', {rl: MM.rilascia}, rendi); L.collega(radice, 'so', {so: MM.parametri}, rendi);
    },
    entrate: function () {
      var aperti = S().acquisti.filter(function (o) { return o.entrato < o.qta && (!o.rilascio || o.rilascio.stato === 'rilasciato'); });
      radice.innerHTML = U.avviso(S()) + L.scheda('📥', 'Entrata merci da ordine d\'acquisto', 'MIGO · 101', L.modulo('mi', [['ordine', 'Ordine d\'acquisto', 'select', '', U.lista(aperti, etich, '— nessun ordine da ricevere —')],
        ['qta', 'Quantità (vuoto = tutto il residuo)', 'num'], ['lotto', 'Lotto: colata dal certificato del fornitore (vuoto = automatico)', 'text'], ['data', 'Data di registrazione', 'date']], [['mi', 'Registra entrata']]) +
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
