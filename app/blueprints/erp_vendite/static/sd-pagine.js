/* SISTEMA INTEGRATO — Vendite: VA01, acconti F-37/F-29, VL01N, VF01, resi e note di credito, incassi, flusso documenti. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var nome = function (c) { return e(U.nome(S(), c)); };
  var ordiniOR = function () { return S().ordini.filter(function (o) { return o.tipo === 'OR'; }); };
  var tabDisp = function (d) {
    return L.tabella(['Materiale', 'Giacenza›', 'Bloccata›', 'Già in consegna›', 'Confermata ad altri ordini›', 'Disponibile ora (ATP)›', 'In arrivo da produzione/acquisti›', 'Di cui ancora libero›'],
      [[d.materiale, n0(d.giacenza), n0(d.bloccata), n0(d.inConsegna), n0(d.riservato), '<b>' + n0(d.disponibile) + '</b>', n0(d.inArrivo), n0(d.liberoInArrivo)]]);
  };
  // la videata che il venditore guarda prima di confermare al cliente
  var esitoDisp = function (d) {
    var sem = d.esito === 'confermabile' ? 'verde' : d.esito === 'in arrivo' ? 'giallo' : 'arancio';
    var testo = d.esito === 'confermabile' ? 'CONFERMABILE: i ' + n0(d.richiesta) + ' pz ci sono a magazzino, puoi confermare subito al cliente.'
      : d.esito === 'in arrivo' ? 'CONFERMABILE IN PARTE SUBITO: ' + n0(d.subito) + ' pz da magazzino, gli altri ' + n0(d.dopo) + ' arrivano da ordini già aperti (' + d.arrivi.map(function (x) { return e(x.fonte) + ' il ' + fd(x.data); }).join(', ') + '). Conferma al cliente le due date.'
      : 'DEVI PRODURRE: ' + (d.subito ? n0(d.subito) + ' pz confermabili subito' + (d.dopo ? ', ' + n0(d.dopo) + ' in arrivo' : '') + ', ' : '') + 'mancano <b>' + n0(d.produrre) + ' pz</b>. Apri un ordine di produzione (<a href="../produzione/">Produzione → CO01</a>) prima di promettere la data al cliente.';
    return '<p class="lab-nota"><span class="lab-bd ' + sem + '">● ' + (d.esito === 'confermabile' ? 'VERDE' : d.esito === 'in arrivo' ? 'GIALLO' : 'ROSSO') + '</span> ' + testo + '</p>';
  };
  var PAGINE = {
    ordini: function () {
      radice.innerHTML = U.avviso(S()) +
        '<div class="lab-griglia">' +
        L.scheda('🆕', 'Crea ordine cliente', 'VA01 · tipo OR', L.modulo('va', [['cliente', 'Committente', 'select', 'C100', U.clienti(S())], ['materiale', 'Materiale', 'select', 'TR-STD', U.vendibili(S())],
          ['qta', 'Quantità (pz)', 'num'], ['rif', 'Riferimento cliente', 'text'], ['data', 'Data documento', 'date'], ['consegna', 'Data di consegna richiesta (vuota = data documento)', 'date']], [['disp', 'Controlla disponibilità', 'sec'], ['prezzi', 'Mostra condizioni', 'sec'], ['va', 'Salva ordine']])) +
        L.scheda('📦', 'Merce a magazzino', 'MMBE · CO09', '<p class="lab-nota">Prima di confermare al cliente premi <b>«Controlla disponibilità»</b>: ti dice se i pezzi ci sono, se arrivano da un ordine già aperto o se devi produrre.</p>' +
          L.tabella(['Materiale', 'Giacenza›', 'Già in consegna›', 'Confermata ad altri ordini›', 'Disponibile›', 'In arrivo›'], U.vendibili(S()).map(function (x) { var d = SD.disponibilita(x[0]);
            return [x[0], n0(d.giacenza), n0(d.inConsegna), n0(d.riservato), '<b>' + n0(d.disponibile) + '</b>', n0(d.inArrivo)]; })) +
          '<p class="lab-nota">Il prezzo non si scrive: il sistema lo <b>determina</b> con la procedura ZFT001 (Dati di base → Condizioni). «Mostra condizioni» fa vedere la videata prezzi prima di salvare.</p>') +
        '</div>' +
        L.scheda('📑', 'Ordini cliente', 'VA05 · semaforo di disponibilità come VA01', '<p class="lab-nota">Semaforo: <span class="lab-bd verde">● verde</span> confermabile per intero alla data richiesta · <span class="lab-bd giallo">● giallo</span> confermabile più tardi (pezzi in arrivo dalla produzione o dagli acquisti) o solo in parte · <span class="lab-bd arancio">● rosso</span> niente a magazzino né in arrivo. Si ricalcola a ogni movimento.</p>' +
          L.tabella(['Ordine', 'Tipo', 'Data', 'Cliente', 'Materiale', 'Q.tà›', 'Consegna richiesta', 'Disponibilità', 'Data confermabile', 'Confermata da giacenza›', 'Crediti', 'Netto›', 'Totale›', 'Margine›', 'Consegnato›', 'Fatturato›'], S().ordini.map(function (o) {
          var cr = o.rifiutato ? '<span class="lab-bd arancio">rifiutato</span>' : !o.credito ? '' : o.credito.stato === 'B' ? '<span class="lab-bd arancio">B bloccato</span>' : o.credito.stato === 'D' ? '<span class="lab-bd giallo">D rilasciato</span>' : '<span class="lab-bd verde">A ok</span>';
          var atp = o.tipo === 'OR' ? SD.confermabilita(o) : null;
          return [o.numero, o.tipo, fd(o.data), nome(o.cliente), o.materiale, n0(o.qta), o.tipo === 'OR' ? fd(o.consegnaRichiesta || o.data) : '',
            atp ? '<span class="lab-bd ' + atp.semaforo + '" title="' + e(atp.testo) + '">● ' + e(atp.testo) + '</span>' : '', atp && atp.dataConfermata ? fd(atp.dataConfermata) : '',
            o.confermata == null ? '' : (o.confermata < o.qta ? '<b>' + n0(o.confermata) + '</b>' : n0(o.confermata)), cr, o.prezzi ? eur(o.prezzi.netto) : eur(o.importo), o.prezzi ? eur(o.prezzi.totale) : '', o.prezzi && o.prezzi.margine != null ? eur(o.prezzi.margine) : '', n0(o.consegnato || 0), n0(o.fatturato || 0)]; }), 'Nessun ordine.'));
      L.collega(radice, 'va', {va: SD.ordine, disp: function (v) { var d = SD.disponibilita(v.materiale, L.num(v.qta, 'Quantità', 1)); return '<!--info-->' + tabDisp(d) + esitoDisp(d); }, prezzi: function (v) { return '<!--info-->' + U.righePrezzi(SD.prezzi(v.cliente, v.materiale, L.num(v.qta, 'Quantità', 1))); }}, rendi);
    },
    crediti: function () {
      var cli = Object.keys(S().clienti), bloccati = ordiniOR().filter(function (o) { return o.credito && o.credito.stato === 'B' && !o.rifiutato; });
      var mat = radice.dataset.mat || 'TR-STD', a = SD.atp(mat);
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🔓', 'Ordini bloccati per crediti', 'VKM1 · responsabile crediti', L.modulo('vk', [['ordine', 'Ordine bloccato', 'select', '', U.lista(bloccati, function (o) { return o.numero + ' · ' + U.nome(S(), o.cliente) + ' · ' + eur(o.prezzi.totale) + ' · ' + o.credito.motivo; }, '— nessun ordine bloccato —')],
          ['decisione', 'Decisione', 'select', 'rilascia', [['rilascia', 'Autorizza lo sforamento (solo questo ordine)'], ['fido', 'Aumenta il fido (FD32) e rilascia'], ['rifiuta', 'Non autorizzato per ora'], ['definitivo', 'Blocco definitivo: rifiuta l\'ordine']]],
          ['fido', 'Nuovo fido € (se aumenti)', 'num'], ['nota', 'Nota', 'text'], ['data', 'Data', 'date']], [['vk', 'Registra la decisione']]) +
          '<p class="lab-nota">Chi vende non sblocca da solo: decide il <b>responsabile crediti</b>. Esposizione = crediti aperti (conto 11) + ordini non ancora fatturati.</p>') +
        L.scheda('💳', 'Fido e rischio del cliente', 'FD32', L.modulo('fd', [['cliente', 'Cliente', 'select', 'C100', U.clienti(S())], ['fido', 'Fido €', 'num'], ['rischio', 'Classe di rischio', 'select', 'B', [['A', 'A — basso'], ['B', 'B — medio'], ['C', 'C — alto']]],
          ['bloccato', 'Blocco del cliente', 'select', 'no', [['no', 'non bloccato'], ['si', 'BLOCCATO: nessun ordine si consegna']]], ['motivo', 'Motivo', 'text']], [['fd', 'Salva']])) + '</div>' +
        L.scheda('📊', 'Esposizione dei clienti', 'FD33 · F.31', L.tabella(['Cliente', 'Rischio', 'Fido›', 'Crediti aperti›', 'Ordini non fatturati›', 'Esposizione›', 'Utilizzo›', 'Disponibile›', 'Stato'], cli.map(function (k) {
          var c = S().clienti[k], x = SD.esposizione(k), u = c.fido ? Math.round(x.totale / c.fido * 100) : 0;
          return [k + ' ' + e(c.nome), c.rischio || '', eur(c.fido || 0), eur(x.crediti), eur(x.ordini), '<b>' + eur(x.totale) + '</b>', u + '%', eur((c.fido || 0) - x.totale), c.bloccato ? '<span class="lab-bd arancio">bloccato</span>' : u > 100 ? '<span class="lab-bd arancio">oltre il fido</span>' : u > 80 ? '<span class="lab-bd giallo">vicino al limite</span>' : '<span class="lab-bd verde">ok</span>']; }))) +
        L.scheda('📦', 'Disponibilità per materiale', 'CO09 · ATP cumulativo con entrate pianificate · V_V2', '<div class="lab-filtro"><label>Materiale <select id="mat">' + ['TR-STD', 'TR-ALTA', 'TR-PED'].map(function (m) { return '<option' + (m === mat ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label></div>' +
          '<p>Giacenza <b>' + n0(a.giacenza) + '</b> − già in consegna <b>' + n0(a.inConsegna) + '</b> − confermata agli ordini aperti <b>' + n0(a.riservato) + '</b> = disponibile per nuovi ordini <b>' + n0(a.disponibile) + '</b> pz.</p>' +
          L.tabella(['Ordine', 'Data', 'Cliente', 'Ordinata›', 'Confermata›', 'Consegnata›', 'Da confermare›'], ordiniOR().filter(function (o) { return o.materiale === mat && !o.rifiutato && o.consegnato < o.qta; }).map(function (o) {
            return [o.numero, fd(o.data), nome(o.cliente), n0(o.qta), n0(o.confermata == null ? o.qta : o.confermata), n0(o.consegnato), n0(o.qta - (o.confermata == null ? o.qta : o.confermata))]; }), 'Nessun ordine aperto.') +
          L.tabella(['Entrata pianificata', 'Data', 'Q.tà›'], SD.entrate(mat).map(function (x) { return [e(x.fonte), fd(x.data), n0(x.qta)]; }), 'Nessuna entrata pianificata: per confermare altri pezzi serve un ordine di produzione (CO01) con data di fine.') +
          L.tabella(['Ordine', 'Cliente', 'Consegna richiesta', 'Disponibilità', 'Righe di schedulazione (q.tà · data · da dove)', 'Scoperto›'], ordiniOR().filter(function (o) { return o.materiale === mat && !o.rifiutato && o.consegnato < o.qta; }).map(function (o) {
            var c = SD.confermabilita(o); return [o.numero, nome(o.cliente), fd(o.consegnaRichiesta || o.data), '<span class="lab-bd ' + c.semaforo + '">● ' + e(c.stato) + '</span>', c.righe.map(function (r) { return n0(r.qta) + ' · ' + fd(r.data) + ' · ' + e(r.fonte); }).join('<br>'), n0(c.scoperto)]; }), 'Nessun ordine aperto.') +
          L.modulo('vv', [], [['vv', 'Riprogramma gli ordini (V_V2)']]) + '<p class="lab-nota">V_V2 riassegna la disponibilità agli ordini aperti in ordine di data: chi ha ordinato prima è servito prima. Si esegue anche da solo a ogni entrata di produzione.</p>') +
        L.scheda('📜', 'Registro delle decisioni', 'log crediti', L.tabella(['Data', 'Cliente', 'Ordine', 'Decisione', 'Nota'], (S().creditiLog || []).slice().reverse().map(function (x) { return [fd(x.data), nome(x.cliente), x.ordine, e(x.decisione), e(x.nota)]; }), 'Nessuna decisione.'));
      L.collega(radice, 'vk', {vk: SD.decisioneCredito}, rendi); L.collega(radice, 'fd', {fd: SD.anagraficaCredito}, rendi);
      L.collega(radice, 'vv', {vv: function () { var r = SD.riconferma(); return '<p class="lab-nota">' + (r.length ? 'Riprogrammati: ' + r.join(' · ') : 'Nessuna variazione: le conferme erano già aggiornate.') + '</p>'; }}, rendi);
      var m = radice.querySelector('#mat'); if (m) m.onchange = function () { radice.dataset.mat = this.value; rendi(); };
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
      var daConsegnare = ordiniOR().filter(function (o) { return !o.rifiutato && o.consegnato + inPrelievo(o) < o.qta; });
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
