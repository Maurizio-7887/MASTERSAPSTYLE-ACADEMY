/* SISTEMA INTEGRATO — Spedizione: monitor delle consegne (VL06O), lista di prelievo, imballo con SSCC, trasporti e carico, DDT. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, WM = window.WM4, SP = window.SP4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var uscita = function () { return S().consegne.filter(function (c) { return c.tipo === 'LF'; }); };
  var aperte = function () { return uscita().filter(function (c) { return c.pgi === false; }); };
  var bollo = function (s) { return '<span class="lab-bd ' + (s === 'C' ? 'verde' : s === 'B' ? 'giallo' : s ? 'grigio' : '') + '">' + (s || '—') + '</span>'; };
  var etich = function (c) { return c.numero + ' · ' + U.nome(S(), c.cliente) + ' · ' + n0(c.qta) + ' ' + c.materiale; };
  var nonAttivo = function () { return WM.attivo() ? '' : '<div class="lab-esito ko">⚠ Il WMS non è attivo: le consegne escono subito (senza prelievo, imballo e carico). Attivalo da Magazzino → Struttura.</div>'; };
  var scegli = function (lista, chiave) {
    var sel = radice.dataset[chiave] || (lista[0] || {}).numero || '';
    return {sel: sel, html: '<div class="lab-filtro no-stampa"><label>Consegna <select id="sc">' + lista.map(function (c) { return '<option value="' + c.numero + '"' + (c.numero === sel ? ' selected' : '') + '>' + e(etich(c)) + (c.ddt ? ' · DDT ' + c.ddt : '') + '</option>'; }).join('') + '</select></label> <button type="button" class="lab-btn" id="stampa">🖨️ Stampa</button></div>'};
  };
  var legaScelta = function (chiave) { var s = radice.querySelector('#sc'); if (s) s.onchange = function () { radice.dataset[chiave] = this.value; rendi(); }; var b = radice.querySelector('#stampa'); if (b) b.onclick = function () { window.print(); }; };
  var PAGINE = {
    monitor: function () {
      radice.innerHTML = nonAttivo() +
        L.scheda('🚚', 'Monitor delle consegne in uscita', 'VL06O · /SCWM/PRDO', L.tabella(['Consegna', 'Data', 'Cliente', 'Destinazione', 'Materiale', 'Q.tà›', 'Prelievo', 'Imballo', 'Trasporto', 'Carico', 'Uscita merci', 'DDT', 'Fattura'], uscita().slice().reverse().map(function (c) {
          var s = SP.stato(c), cli = S().clienti[c.cliente] || {};
          return [c.numero, fd(c.data), e(cli.nome || c.cliente), e(cli.regione || ''), c.materiale, n0(c.qta), bollo(s.prelievo), bollo(c.wm ? s.imballo : ''), s.trasporto, bollo(c.wm ? s.carico : ''), bollo(s.uscita) + (c.pgi ? ' ' + fd(c.pgi) : ''), s.ddt, bollo(s.fattura)]; }), 'Nessuna consegna.') +
          '<p class="lab-nota">Stati come in SAP: <b>A</b> da fare · <b>B</b> in parte · <b>C</b> completato. Il flusso: prelievo → imballo → trasporto e carico → uscita merci (DDT) → fattura. Le consegne di gennaio e febbraio sono uscite senza WMS.</p>') +
        L.scheda('🔢', 'Che cosa fare adesso', '', '<ul class="lab-elenco">' + (aperte().map(function (c) { var s = SP.stato(c);
          var cosa = s.prelievo !== 'C' ? 'conferma i compiti di prelievo con la pistola RF' : s.imballo !== 'C' ? 'imballa (Spedizione → Imballo)' : !s.trasporto ? 'crea il trasporto' : s.carico !== 'C' ? 'carica i colli (RF → Carico)' : 'registra la partenza e l\'uscita merci';
          return '<li><b>' + c.numero + '</b> ' + e(U.nome(S(), c.cliente)) + ': ' + cosa + '.</li>'; }).join('') || '<li>Nessuna consegna aperta.</li>') + '</ul>');
    },
    prelievo: function () {
      var lista = uscita().filter(function (c) { return c.wm; }), sc = scegli(lista, 'cp'), c = lista.find(function (x) { return x.numero === sc.sel; });
      if (!c) { radice.innerHTML = nonAttivo() + '<p class="lab-vuoto">Nessuna consegna gestita a magazzino: crea la consegna da Vendite → Consegne (con il WMS attivo).</p>'; return; }
      var p = WM.statoPrelievo(c), cli = S().clienti[c.cliente];
      radice.innerHTML = sc.html + L.scheda('📋', 'LISTA DI PRELIEVO · consegna ' + c.numero, 'LT21 · /SCWM/PRDO · magazzino W100', '<p>Cliente <b>' + e(cli.nome) + '</b> (' + e(cli.regione) + ') · ordine ' + c.ordine + ' · ' + n0(c.qta) + ' pz ' + c.materiale + ' · data ' + fd(c.data) + ' · stato prelievo <b>' + p.stato + '</b></p>' +
        L.tabella(['Compito', 'Da ubicazione', 'UdC', 'Materiale', 'Da prelevare›', 'Prelevato›', 'A', 'Esito', 'Firma'], p.compiti.map(function (t) {
          return [t.numero, '<b>' + t.da + '</b>', t.udc, t.mat, n0(t.qta), t.stato === 'confermato' ? n0(t.qtaEff) : '', t.a, t.stato === 'confermato' ? (t.diff ? 'differenza ' + n0(t.diff) : '✓ ' + e(t.risorsa)) : '', '']; })) +
        '<p class="lab-nota">Percorso FIFO: prima i pallet entrati prima. Le righe nate da una differenza hanno il compito d\'origine nel monitor. Prelievo con la pistola: Magazzino → Pistola RF → Compiti.</p>');
      legaScelta('cp');
    },
    imballo: function () {
      var da = aperte().filter(function (c) { return c.wm && SP.stato(c).prelievo === 'C' && SP.stato(c).imballo !== 'C'; });
      var tutte = uscita().filter(function (c) { return SP.colliDi(c.numero).length; }), sel = radice.dataset.ci || (tutte.slice(-1)[0] || {}).numero;
      var colli = sel ? SP.colliDi(sel) : [];
      radice.innerHTML = nonAttivo() + '<div class="lab-griglia no-stampa">' +
        L.scheda('📦', 'Imballa la consegna', 'VL02N Imballaggio · /SCWM/PACK', L.modulo('im', [['consegna', 'Consegna prelevata', 'select', '', U.lista(da, etich, '— nessuna consegna da imballare —')],
          ['imballo', 'Materiale d\'imballo', 'select', 'EUR', Object.keys(SP.IMBALLI).map(function (k) { return [k, SP.IMBALLI[k].nome + ' · tara ' + SP.IMBALLI[k].tara + ' kg · max ' + SP.IMBALLI[k].max + ' pz']; })],
          ['perCollo', 'Pezzi per collo (vuoto = massimo)', 'num'], ['data', 'Data', 'date']], [['im', 'Crea i colli (SSCC)']])) +
        L.scheda('🏷️', 'Che cos\'è l\'SSCC', 'GS1', '<p class="lab-nota">Il <b>Serial Shipping Container Code</b> identifica ogni collo in tutta la catena: 18 cifre = estensione + prefisso aziendale GS1 + numero progressivo + cifra di controllo. Si legge con il codice a barre GS1-128 «(00)». Qui il prefisso 8012345 è di fantasia.</p>') + '</div>' +
        (tutte.length ? '<div class="lab-filtro no-stampa"><label>Etichette della consegna <select id="ci">' + tutte.map(function (c) { return '<option value="' + c.numero + '"' + (c.numero === sel ? ' selected' : '') + '>' + e(etich(c)) + '</option>'; }).join('') + '</select></label> <button type="button" class="lab-btn" id="stampa">🖨️ Stampa le etichette</button></div>' +
          L.scheda('📦', 'Colli della consegna ' + sel, 'HU · SSCC', L.tabella(['SSCC', 'Imballo', 'Pezzi›', 'Peso netto kg›', 'Tara kg›', 'Peso lordo kg›', 'Caricato'], colli.map(function (x) { return [x.sscc, SP.IMBALLI[x.imballo].nome, n0(x.qta), n0(x.pesoNetto), n0(x.tara), n0(x.pesoLordo), x.caricato ? fd(x.caricato) + ' · trasp. ' + x.trasporto : '']; }))) +
          '<div class="s4-ets">' + colli.map(function (x, k) { var c = S().consegne.find(function (y) { return y.numero === x.consegna; }), cli = S().clienti[c.cliente];
            return window.S4Etichette.etichetta(x.sscc, 'SSCC (00) · collo ' + (k + 1) + ' di ' + colli.length, e(cli.nome) + ' · ' + e(cli.regione) + '<br>' + x.qta + ' pz ' + x.materiale + ' · ' + n0(x.pesoLordo) + ' kg · consegna ' + x.consegna, true); }).join('') + '</div>' : '');
      L.collega(radice, 'im', {im: function (v) { var r = SP.imballa(v); radice.dataset.ci = v.consegna; return r; }}, rendi);
      var s = radice.querySelector('#ci'); if (s) s.onchange = function () { radice.dataset.ci = this.value; rendi(); };
      var b = radice.querySelector('#stampa'); if (b) b.onclick = function () { window.print(); };
    },
    trasporti: function () {
      var libere = aperte().filter(function (c) { return !SP.stato(c).trasporto; }), tr = SP.SP().trasporti;
      var daPartire = tr.filter(function (t) { return !t.partenza; });
      radice.innerHTML = nonAttivo() + '<div class="lab-griglia">' +
        L.scheda('🚛', 'Crea il trasporto', 'VT01N', L.modulo('vt', [['consegne', 'Consegne (numeri separati da virgola)', 'text', libere.map(function (c) { return c.numero; }).join(', ')],
          ['vettore', 'Vettore', 'select', 'V10', Object.keys(SP.VETTORI).map(function (k) { return [k, k + ' — ' + SP.VETTORI[k]]; })], ['targa', 'Targa del mezzo', 'text'], ['autista', 'Autista', 'text'],
          ['porto', 'Porto', 'select', 'franco', [['franco', 'franco (trasporto pagato dal mittente)'], ['assegnato', 'assegnato (pagato dal destinatario)']]], ['data', 'Data di carico', 'date']], [['vt', 'Crea trasporto']]) +
          '<p class="lab-nota">Consegne libere: ' + (libere.map(function (c) { return c.numero + ' (' + e(U.nome(S(), c.cliente)) + ')'; }).join(', ') || 'nessuna') + '. Più consegne sullo stesso camion = un giro di consegna; ogni destinatario avrà il suo DDT.</p>') +
        L.scheda('📥', 'Carico (da scrivania)', 'VT02N · alla porta di spedizione', L.modulo('ca', [['sscc', 'SSCC letto sul collo', 'text'], ['data', 'Data', 'date']], [['ca', 'Carica il collo']]) + '<p class="lab-nota">In magazzino si carica con la pistola: Magazzino → Pistola RF → Carico. Un collo di un\'altra consegna viene rifiutato.</p>') +
        L.scheda('🏁', 'Fine carico e uscita merci', 'VT02N · 601', L.modulo('pt', [['trasporto', 'Trasporto', 'select', '', U.lista(daPartire, function (t) { return t.numero + ' · ' + SP.VETTORI[t.vettore] + ' · ' + t.consegne.join(', ') + ' · ' + t.stato; }, '— nessun trasporto da far partire —')], ['data', 'Data di partenza', 'date']], [['pt', 'Registra la partenza e l\'uscita merci']]) +
          '<p class="lab-nota">Per ogni consegna: uscita merci 601 dalla zona di spedizione (D 41 / A 13) e numero di DDT.</p>') + '</div>' +
        L.scheda('📋', 'Trasporti', 'VT11 · /SCWM/TU', L.tabella(['Trasporto', 'Data', 'Vettore', 'Targa', 'Autista', 'Porto', 'Consegne', 'Colli caricati', 'Stato'], tr.map(function (t) {
          var col = t.consegne.reduce(function (a, k) { return a.concat(SP.colliDi(k)); }, []);
          return [t.numero, fd(t.data), SP.VETTORI[t.vettore], e(t.targa), e(t.autista), t.porto, t.consegne.join(', '), col.filter(function (x) { return x.caricato; }).length + ' / ' + col.length, t.partenza ? 'partito ' + fd(t.partenza) : t.stato]; }), 'Nessun trasporto.'));
      L.collega(radice, 'vt', {vt: SP.creaTrasporto}, rendi); L.collega(radice, 'ca', {ca: SP.carica}, rendi); L.collega(radice, 'pt', {pt: SP.parti}, rendi);
    },
    ddt: function () {
      var lista = uscita().filter(function (c) { return c.ddt; }), sc = scegli(lista, 'cd'), c = lista.find(function (x) { return x.numero === sc.sel; });
      if (!c) { radice.innerHTML = '<p class="lab-vuoto">Nessun DDT: il DDT nasce con la partenza del trasporto (uscita merci).</p>'; return; }
      var d = SP.ddt(c.numero), cli = d.destinatario;
      radice.innerHTML = sc.html + L.scheda('📄', 'DOCUMENTO DI TRASPORTO n. ' + d.numero + '/' + d.anno + ' del ' + fd(d.data), 'D.P.R. 472/1996 · documento didattico',
        '<div class="lab-griglia"><div><b>Mittente</b><br>Ferro &amp; Transenne S.r.l. (azienda didattica)<br>magazzino W100</div><div><b>Destinatario</b><br>' + e(cli.nome) + '<br>' + e(cli.regione) + '</div>' +
        '<div><b>Luogo di destinazione</b><br>sede del destinatario · ' + e(cli.regione) + '</div><div><b>Causale del trasporto</b><br>Vendita · ordine ' + d.ordine + (d.rifCliente ? ' (vs. rif. ' + e(d.rifCliente) + ')' : '') + ' · consegna ' + d.consegna + '</div></div>' +
        L.tabella(['Codice', 'Descrizione dei beni', 'U.M.', 'Quantità›'], [[d.materiale, e(d.descrizione), 'pz', n0(d.qta)]]) +
        L.tabella(['Colli›', 'Aspetto esteriore dei beni', 'Peso netto kg›', 'Peso lordo kg›', 'Porto', 'Trasporto a cura del'], [[d.colli.length, d.colli.length ? SP.IMBALLI[d.colli[0].imballo].nome : '', n0(d.pesoNetto), n0(d.pesoLordo), d.porto, e(d.vettore)]]) +
        L.tabella(['SSCC dei colli', 'Pezzi›', 'kg›'], d.colli.map(function (x) { return [x.sscc, n0(x.qta), n0(x.pesoLordo)]; })) +
        '<p>Vettore: <b>' + e(d.vettore) + '</b>' + (d.trasporto && d.trasporto.targa ? ' · targa ' + e(d.trasporto.targa) : '') + (d.trasporto && d.trasporto.autista ? ' · autista ' + e(d.trasporto.autista) : '') + ' · data e ora del ritiro: ' + fd(d.data) + ' ____:____</p>' +
        '<p style="margin-top:20px">Firma del mittente ____________________ &nbsp; Firma del vettore / conducente ____________________ &nbsp; Firma del destinatario ____________________</p>' +
        '<p class="lab-nota">Il DDT accompagna la merce: numero progressivo, data, mittente, destinatario, luogo di destinazione, causale, natura e quantità dei beni, colli, aspetto, peso, porto e vettore. La fattura (VF01) può essere differita entro il 15 del mese successivo richiamando il DDT.</p>');
      legaScelta('cd');
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.monitor)(); }
  rendi();
})();
