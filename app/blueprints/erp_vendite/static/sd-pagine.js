/* SISTEMA INTEGRATO — Vendite: VA01, acconti F-37/F-29, VL01N, VF01, resi e note di credito, incassi, flusso documenti. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var nome = function (c) { return e(U.nome(S(), c)); };
  var ordiniOR = function () { return S().ordini.filter(function (o) { return o.tipo === 'OR'; }); };
  var PAGINE = {
    ordini: function () {
      radice.innerHTML = U.avviso(S()) +
        '<div class="lab-griglia">' +
        L.scheda('🆕', 'Crea ordine cliente', 'VA01 · tipo OR', L.modulo('va', [['cliente', 'Committente', 'select', 'C100', U.clienti(S())], ['materiale', 'Materiale', 'select', 'TR-STD', U.materiali(S())],
          ['qta', 'Quantità (pz)', 'num'], ['rif', 'Riferimento cliente', 'text'], ['data', 'Data documento', 'date']], [['prezzi', 'Mostra condizioni', 'sec'], ['va', 'Salva ordine']])) +
        L.scheda('💡', 'Come legge i prezzi', '', '<p class="lab-nota">Il prezzo non si scrive: il sistema lo <b>determina</b> leggendo le tabelle condizioni con la procedura ZFT001 (Dati di base → Condizioni). Premi «Mostra condizioni» per vedere la videata prezzi prima di salvare.</p>') +
        '</div>' +
        L.scheda('📑', 'Ordini cliente', 'VA05', L.tabella(['Ordine', 'Tipo', 'Data', 'Cliente', 'Materiale', 'Q.tà›', 'Netto›', 'Totale›', 'Margine›', 'Consegnato›', 'Fatturato›'], S().ordini.map(function (o) {
          return [o.numero, o.tipo, fd(o.data), nome(o.cliente), o.materiale, n0(o.qta), o.prezzi ? eur(o.prezzi.netto) : eur(o.importo), o.prezzi ? eur(o.prezzi.totale) : '', o.prezzi && o.prezzi.margine != null ? eur(o.prezzi.margine) : '', n0(o.consegnato || 0), n0(o.fatturato || 0)]; }), 'Nessun ordine.'));
      L.collega(radice, 'va', {va: SD.ordine, prezzi: function (v) { return '<!--info-->' + U.righePrezzi(SD.prezzi(v.cliente, v.materiale, L.num(v.qta, 'Quantità', 1))); }}, rendi);
    },
    acconti: function () {
      radice.innerHTML = U.avviso(S()) +
        '<div class="lab-griglia">' +
        L.scheda('🧾', 'Richiesta di acconto', 'F-37', L.modulo('ra', [['ordine', 'Ordine cliente', 'select', '', U.lista(ordiniOR(), function (o) { return o.numero + ' · ' + U.nome(S(), o.cliente) + ' · netto ' + eur(o.prezzi.netto); })],
          ['importo', 'Acconto (imponibile €)', 'num'], ['data', 'Data', 'date']], [['ra', 'Crea richiesta']]) + '<p class="lab-nota">La richiesta è una partita statistica: non tocca il bilancio.</p>') +
        L.scheda('🏦', 'Incasso dell\'acconto', 'F-29', L.modulo('ia', [['richiesta', 'Richiesta di acconto', 'select', '', U.lista(S().acconti.filter(function (a) { return !a.pagato; }), function (a) { return a.numero + ' · ' + U.nome(S(), a.cliente) + ' · ' + eur(a.imponibile + a.iva); }, '— nessuna richiesta aperta —')],
          ['data', 'Data incasso', 'date']], [['ia', 'Registra incasso']]) + '<p class="lab-nota">In Italia l\'acconto richiede la fattura d\'acconto: l\'IVA è dovuta all\'incasso. Conto speciale 19 «Acconti da clienti» (CoGe speciale A), non il conto 11.</p>') +
        '</div>' +
        L.scheda('📋', 'Acconti', 'FBL5N · CoGe speciale A', L.tabella(['Richiesta', 'Ordine', 'Cliente', 'Imponibile›', 'IVA›', 'Incassato il', 'Dedotto in fattura›', 'Residuo›'], S().acconti.map(function (a) {
          return [a.numero, a.ordine, nome(a.cliente), eur(a.imponibile), eur(a.iva), a.pagato ? fd(a.pagato) : '—', eur(a.dedotto), eur(a.pagato ? a.imponibile - a.dedotto : 0)]; }), 'Nessun acconto.'));
      L.collega(radice, 'ra', {ra: SD.richiestaAcconto}, rendi);
      L.collega(radice, 'ia', {ia: SD.incassoAcconto}, rendi);
    },
    consegne: function () {
      var inPrelievo = function (o) { return S().consegne.filter(function (c) { return c.ordine === o.numero && c.pgi === false; }).reduce(function (t, c) { return t + c.qta; }, 0); };
      var daConsegnare = ordiniOR().filter(function (o) { return o.consegnato + inPrelievo(o) < o.qta; });
      radice.innerHTML = U.avviso(S()) +
        L.scheda('🚚', 'Consegna con uscita merci', 'VL01N · 601', L.modulo('vl', [['ordine', 'Ordine cliente', 'select', '', U.lista(daConsegnare, function (o) { return o.numero + ' · ' + U.nome(S(), o.cliente) + ' · ' + o.qta + ' ' + o.materiale; }, '— niente da consegnare —')],
          ['data', 'Data uscita merci', 'date']], [['vl', window.WM4 && window.WM4.attivo() ? 'Crea consegna (con prelievo a magazzino)' : 'Crea consegna e registra uscita merci']]) + '<p class="lab-nota">L\'uscita merci (601) scarica il magazzino a costo standard: D 41 Costo del venduto / A 13 Prodotti finiti.</p>') +
        (window.WM4 && window.WM4.attivo() ? L.scheda('🏬', 'Uscita merci di una consegna prelevata', 'VL02N · 601', L.modulo('pg', [['consegna', 'Consegna con prelievo completato', 'select', '', U.lista(S().consegne.filter(function (c) { return c.pgi === false && window.WM4.statoPrelievo(c).stato === 'C'; }), function (c) { return c.numero + ' · ' + U.nome(S(), c.cliente) + ' · ' + c.qta + ' ' + c.materiale; }, '— nessuna consegna prelevata —')],
          ['data', 'Data uscita merci', 'date']], [['pg', 'Registra uscita merci']]) + '<p class="lab-nota">Con il WMS attivo la consegna nasce senza uscita merci. Il percorso completo (imballo, trasporto, carico, DDT) è in <b>Spedizione</b>; qui l\'uscita merci diretta, senza trasporto.</p>') : '') +
        L.scheda('📦', 'Consegne', 'VL06O', L.tabella(['Consegna', 'Tipo', 'Data', 'Ordine', 'Cliente', 'Materiale', 'Q.tà›', 'Stato'], S().consegne.map(function (c) {
          return [c.numero, c.tipo, fd(c.data), c.ordine, nome(c.cliente), c.materiale, n0(c.qta), c.tipo === 'LR' ? 'reso rientrato (651)' : c.pgi === false ? '<b>in prelievo (WMS)</b>' : c.fatturata ? 'fatturata' : '<b>da fatturare</b>']; }), 'Nessuna consegna.'));
      L.collega(radice, 'vl', {vl: SD.consegna}, rendi);
      L.collega(radice, 'pg', {pg: SD.uscitaMerci}, rendi);
    },
    fatture: function () {
      var daFatt = S().consegne.filter(function (c) { return c.tipo === 'LF' && !c.fatturata && c.pgi !== false; });
      radice.innerHTML = U.avviso(S()) +
        L.scheda('🧾', 'Crea fattura', 'VF01 · tipo F2', L.modulo('vf', [['consegna', 'Consegna', 'select', '', U.lista(daFatt, function (c) { return c.numero + ' · ' + U.nome(S(), c.cliente) + ' · ' + c.qta + ' ' + c.materiale; }, '— nessuna consegna da fatturare —')],
          ['data', 'Data fattura', 'date']], [['vf', 'Crea e contabilizza']]) +
          '<p class="lab-nota">La fattura legge le condizioni dall\'ordine. Se il cliente ha versato un acconto, la condizione AZWB lo detrae: l\'IVA si calcola solo sul residuo e il conto 19 si chiude.</p>') +
        L.scheda('📚', 'Fatture e note di credito', 'VF05', L.tabella(['Documento', 'Tipo', 'Data', 'Cliente', 'Materiale', 'Q.tà›', 'Netto›', 'Acconto dedotto›', 'Totale›', 'Contabile'], S().fatture.map(function (f) {
          return [f.numero, f.tipo, fd(f.data), nome(f.cliente), f.materiale, n0(f.qta), f.prezzi ? eur(f.prezzi.netto) : '', f.accontoDedotto ? eur(f.accontoDedotto) : '', (f.tipo === 'F2' ? '' : '−') + eur(f.totale), f.contabile]; }), 'Nessuna fattura.'));
      L.collega(radice, 'vf', {vf: SD.fattura}, rendi);
    },
    resi: function () {
      var f2 = S().fatture.filter(function (f) { return f.tipo === 'F2'; });
      var resi = S().ordini.filter(function (o) { return o.tipo === 'RE'; }), g2 = S().ordini.filter(function (o) { return o.tipo === 'G2'; });
      radice.innerHTML = U.avviso(S()) +
        '<h3 class="lab-h3">Reso di merce: ordine RE → consegna di reso 651 → nota di credito</h3><div class="lab-griglia">' +
        L.scheda('↩️', '1 · Ordine di reso', 'VA01 · tipo RE', L.modulo('re', [['fattura', 'Con riferimento alla fattura', 'select', '', U.lista(f2, function (f) { return f.numero + ' · ' + U.nome(S(), f.cliente) + ' · ' + f.qta + ' ' + f.materiale; })],
          ['qta', 'Quantità resa', 'num'], ['motivo', 'Motivo del reso', 'text'], ['data', 'Data', 'date']], [['re', 'Crea ordine di reso']])) +
        L.scheda('📥', '2 · Consegna di reso', 'VL01N · 651', L.modulo('er', [['reso', 'Ordine di reso', 'select', '', U.lista(resi.filter(function (o) { return !o.rientrato; }), function (o) { return o.numero + ' · ' + U.nome(S(), o.cliente) + ' · ' + o.qta + ' ' + o.materiale; }, '— nessun reso da ricevere —')],
          ['data', 'Data entrata', 'date']], [['er', 'Registra entrata merci di reso']])) +
        L.scheda('💶', '3 · Nota di credito', 'VF01 · tipo RE', L.modulo('nr', [['reso', 'Ordine di reso', 'select', '', U.lista(resi.filter(function (o) { return o.rientrato && !o.accreditato; }), function (o) { return o.numero + ' · ' + U.nome(S(), o.cliente) + ' · accredito ' + eur(o.prezzi.totale); }, '— nessun reso da accreditare —')],
          ['data', 'Data', 'date']], [['nr', 'Crea nota di credito']])) +
        '</div><h3 class="lab-h3">Abbuono senza reso: richiesta G2 (bloccata) → approvazione → nota di credito G2</h3><div class="lab-griglia">' +
        L.scheda('📝', '1 · Richiesta di nota di credito', 'VA01 · tipo G2', L.modulo('ab', [['fattura', 'Con riferimento alla fattura', 'select', '', U.lista(f2, function (f) { return f.numero + ' · ' + U.nome(S(), f.cliente) + ' · netto ' + eur(f.prezzi.netto); })],
          ['importo', 'Abbuono (imponibile €)', 'num'], ['motivo', 'Motivo', 'text'], ['data', 'Data', 'date']], [['ab', 'Crea richiesta']])) +
        L.scheda('✅', '2 · Approvazione', 'VA02 · blocco 08', L.modulo('ap', [['richiesta', 'Richiesta G2', 'select', '', U.lista(g2.filter(function (o) { return o.blocco; }), function (o) { return o.numero + ' · ' + U.nome(S(), o.cliente) + ' · ' + eur(o.importo); }, '— nessuna richiesta bloccata —')]], [['ap', 'Togli il blocco fatturazione']])) +
        L.scheda('💶', '3 · Nota di credito', 'VF01 · tipo G2', L.modulo('ng', [['richiesta', 'Richiesta G2', 'select', '', U.lista(g2.filter(function (o) { return !o.blocco && !o.accreditato; }), function (o) { return o.numero + ' · ' + U.nome(S(), o.cliente) + ' · ' + eur(o.importo); }, '— nessuna richiesta approvata —')],
          ['data', 'Data', 'date']], [['ng', 'Crea nota di credito']])) +
        '</div>' +
        L.scheda('📋', 'Resi e richieste di nota di credito', '', L.tabella(['Documento', 'Tipo', 'Data', 'Fattura', 'Cliente', 'Q.tà›', 'Importo›', 'Motivo', 'Stato'], resi.concat(g2).map(function (o) {
          return [o.numero, o.tipo, fd(o.data), o.fattura, nome(o.cliente), n0(o.qta), eur(o.tipo === 'RE' ? o.prezzi.totale : o.importo), e(o.motivo),
            o.accreditato ? 'accreditato ' + fd(o.accreditato) : o.tipo === 'RE' ? (o.rientrato ? 'merce rientrata' : 'in attesa della merce') : (o.blocco ? 'bloccato (08)' : 'approvato')]; }), 'Nessun reso né abbuono.'));
      L.collega(radice, 're', {re: SD.reso}, rendi); L.collega(radice, 'er', {er: SD.entrataReso}, rendi); L.collega(radice, 'nr', {nr: SD.notaCreditoReso}, rendi);
      L.collega(radice, 'ab', {ab: SD.richiestaAbbuono}, rendi); L.collega(radice, 'ap', {ap: SD.approvaAbbuono}, rendi); L.collega(radice, 'ng', {ng: SD.notaCreditoAbbuono}, rendi);
    },
    incassi: function () {
      var cli = radice.dataset.cliente || 'C100';
      radice.innerHTML = U.avviso(S()) +
        L.scheda('🏦', 'Incasso da cliente', 'F-28', L.modulo('in', [['cliente', 'Cliente', 'select', cli, U.clienti(S())], ['importo', 'Importo €', 'num'], ['rif', 'Riferimento (es. bonifico)', 'text'], ['data', 'Data valuta', 'date']], [['in', 'Registra incasso']])) +
        L.scheda('📒', 'Partite del cliente', 'FBL5N', '<div class="lab-filtro"><label>Cliente <select id="pc">' + U.clienti(S()).map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === cli ? ' selected' : '') + '>' + e(c[1]) + '</option>'; }).join('') + '</select></label> <b>Saldo aperto: ' + eur(N.saldo('11', cli)) + ' €</b></div>' +
          L.tabella(['Data', 'Documento', 'Descrizione', 'Importo›'], SD.partite(cli).map(function (p) { return [fd(p.data), p.numero, e(p.descrizione), eur(p.importo)]; }), 'Nessuna partita.') +
          '<p class="lab-nota">Acconti del cliente sul conto speciale 19: ' + eur(-N.saldo('19', cli)) + ' €.</p>');
      L.collega(radice, 'in', {in: SD.incasso}, rendi);
      radice.querySelector('#pc').onchange = function () { radice.dataset.cliente = this.value; rendi(); };
    },
    flusso: function () {
      var sel = radice.dataset.ordine || ((S().ordini.filter(function (o) { return o.tipo === 'OR'; })[0]) || {}).numero || '';
      var fl = sel ? SD.flusso(sel) : [];
      radice.innerHTML = U.avviso(S()) +
        L.scheda('🔗', 'Flusso documenti', 'VA03 → Flusso', '<div class="lab-filtro"><label>Documento <select id="fo">' + S().ordini.map(function (o) { return '<option value="' + o.numero + '"' + (o.numero === sel ? ' selected' : '') + '>' + o.numero + ' (' + o.tipo + ') · ' + e(U.nome(S(), o.cliente)) + '</option>'; }).join('') + '</select></label></div>' +
          (fl.length ? '<ul class="lab-flusso">' + fl.map(function (x) { return '<li style="margin-left:' + (x.livello * 26) + 'px"><b>' + x.tipo + '</b> ' + x.numero + ' · ' + fd(x.data) + (x.stato ? ' · <span>' + x.stato + '</span>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="lab-vuoto">Nessun documento.</p>'));
      var f = radice.querySelector('#fo'); if (f) f.onchange = function () { radice.dataset.ordine = this.value; rendi(); };
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.ordini)(); }
  rendi();
})();
