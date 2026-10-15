/* SISTEMA INTEGRATO — Valute: tassi di cambio, fatture in valuta, incassi e pagamenti, valutazione di fine periodo. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, FX = window.FX4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, fd = L.fd, S = function () { return N.S; };
  var t4 = function (x) { return Number(x).toLocaleString('it-IT', {minimumFractionDigits: 4}); };
  var esteri = function (tipo) { var a = tipo === 'cliente' ? S().clienti : S().fornitori; return Object.keys(a).filter(function (k) { return a[k].valuta && a[k].valuta !== 'EUR'; }).map(function (k) { return [k, k + ' — ' + a[k].nome + ' (' + a[k].valuta + ')']; }); };
  var PAGINE = {
    tassi: function () {
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('💱', 'Inserisci un tasso di cambio', 'OB08 · tipo M', L.modulo('tx', [['valuta', 'Valuta', 'select', 'USD', [['USD', 'USD dollaro USA'], ['CHF', 'CHF franco svizzero'], ['GBP', 'GBP sterlina']]], ['data', 'Valido dal', 'date'], ['tasso', '1 EUR = … unità di valuta', 'num']], [['tx', 'Salva tasso']]) +
          '<p class="lab-nota">Quotazione «incerto per certo» come i cambi di riferimento BCE. Tassi didattici dell\'esercizio: 1,10 dal 01/07 · 1,08 dal 20/07 · 1,09 dal 25/07 · 1,12 al 31/07.</p>') +
        L.scheda('📋', 'Tabella dei tassi', 'OB08', L.tabella(['Valuta', 'Valido dal', '1 EUR =›', '1 unità =› '], FX.V().tassi.map(function (x) { return [x.valuta, fd(x.data), t4(x.tasso) + ' ' + x.valuta, t4(1 / x.tasso) + ' EUR']; }), 'Nessun tasso.')) + '</div>';
      L.collega(radice, 'tx', {tx: FX.tasso}, rendi);
    },
    documenti: function () {
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🧾', 'Fattura a cliente estero', 'FB70', L.modulo('fc', [['cliente', 'Cliente', 'select', 'C500', esteri('cliente')], ['importo', 'Importo in valuta', 'num'], ['testo', 'Descrizione del servizio', 'text', 'progettazione impianto'], ['data', 'Data', 'date']], [['fc', 'Registra fattura']]) +
          '<p class="lab-nota">D 11 / A 44 al cambio del giorno. Servizio a soggetto passivo extra-UE: non soggetto IVA (art. 7-ter).</p>') +
        L.scheda('🧾', 'Fattura da fornitore estero', 'FB60', L.modulo('ff', [['fornitore', 'Fornitore', 'select', 'F200', esteri('fornitore')], ['importo', 'Importo in valuta', 'num'], ['rif', 'Numero fattura del fornitore', 'text'], ['testo', 'Descrizione', 'text', 'consulenza tecnica'], ['data', 'Data', 'date']], [['ff', 'Registra fattura']]) +
          '<p class="lab-nota">D 54 / A 20 al cambio del giorno e reverse charge: autofattura TD17, IVA 22% a debito (21) e a credito (14).</p>') + '</div>' +
        L.scheda('📚', 'Partite in valuta', 'FBL5N · FBL1N in valuta', L.tabella(['Documento', 'Data', 'Partner', 'Importo›', 'Cambio›', 'EUR storico›', 'Chiusa', 'Cambio chiusura›', 'Differenza›'], FX.V().documenti.map(function (d) {
          var a = d.lato === 'cliente' ? S().clienti[d.partner] : S().fornitori[d.partner];
          return [d.numero, fd(d.data), e(a.nome) + ' (' + d.lato + ')', eur(d.importo) + ' ' + d.valuta, t4(d.cambio), eur(d.eur), d.chiuso ? fd(d.chiuso) : '<b>aperta</b>', d.cambioChiusura ? t4(d.cambioChiusura) : '', d.differenza ? (d.differenza > 0 ? 'utile ' : 'perdita ') + eur(Math.abs(d.differenza)) : '']; }), 'Nessun documento in valuta.'));
      L.collega(radice, 'fc', {fc: FX.fatturaCliente}, rendi); L.collega(radice, 'ff', {ff: FX.fatturaFornitore}, rendi);
    },
    regolazioni: function () {
      var aperti = FX.V().documenti.filter(function (d) { return !d.chiuso; });
      radice.innerHTML = U.avviso(S()) + L.scheda('🏦', 'Incasso o pagamento in valuta', 'F-28 · F-53', L.modulo('rg', [['documento', 'Partita in valuta', 'select', '', U.lista(aperti, function (d) { return d.numero + ' · ' + d.lato + ' ' + d.partner + ' · ' + eur(d.importo) + ' ' + d.valuta + ' al ' + t4(d.cambio); }, '— nessuna partita aperta —')], ['data', 'Data dell\'incasso/pagamento', 'date']], [['rg', 'Registra']]) +
        '<p class="lab-nota">La partita si chiude al cambio storico; la banca si muove al cambio del giorno. La differenza è una differenza cambio <b>realizzata</b>: conto 66 (utile) o 67 (perdita). Per un credito il dollaro che si rafforza (meno dollari per un euro) dà un utile.</p>') +
        L.scheda('📊', 'Differenze cambio realizzate', 'conti 66 · 67', L.tabella(['Conto', 'Descrizione', 'Saldo›'], [['66', 'Utili su cambi', L.eur(-N.saldo('66'))], ['67', 'Perdite su cambi', L.eur(N.saldo('67'))]]));
      L.collega(radice, 'rg', {rg: FX.regola}, rendi);
    },
    valutazione: function () {
      var v = FX.V().valutazioni.slice(-1)[0];
      radice.innerHTML = U.avviso(S()) + L.scheda('📆', 'Valutazione di fine periodo', 'FAGL_FCV', L.modulo('vl', [['data', 'Data di valutazione (fine mese)', 'date'], ['storno', 'Storno il giorno dopo', 'select', 'si', [['si', 'sì (come in SAP: il periodo nuovo riparte dal cambio storico)'], ['no', 'no']]]], [['vl', 'Esegui la valutazione']]) +
        '<p class="lab-nota">Le partite ancora aperte si rivalutano al cambio di fine mese: differenze <b>non realizzate</b> sul conto 68, contropartita la rettifica 16 (il credito resta al cambio storico). In bilancio (art. 2426 n. 8-bis c.c.) l\'eventuale utile netto non realizzato va in una riserva non distribuibile.</p>') +
        (v ? L.scheda('📋', 'Valutazione del ' + fd(v.data), 'FAGL_FCV · log', L.tabella(['Documento', 'Partner', 'Importo›', 'Cambio storico›', 'Cambio fine mese›', 'EUR storico›', 'EUR fine mese›', 'Effetto›'], v.dettaglio.map(function (d) {
          return [d.numero, d.partner + ' (' + d.lato + ')', eur(d.importo) + ' ' + d.valuta, t4(d.cambioStorico), t4(d.cambioFine), eur(d.eurStorico), eur(d.eurFine), (d.effetto < 0 ? 'perdita ' : 'utile ') + eur(Math.abs(d.effetto))]; })) +
          '<p class="lab-nota">Registrazione ' + (v.contabile || '—') + (v.storno ? ' · storno ' + v.storno + ' al giorno dopo' : '') + '.</p>') : '');
      L.collega(radice, 'vl', {vl: FX.valuta}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.tassi)(); }
  rendi();
})();
