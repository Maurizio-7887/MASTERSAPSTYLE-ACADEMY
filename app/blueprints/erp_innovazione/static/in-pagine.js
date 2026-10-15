/* SISTEMA INTEGRATO — Innovazione logistica (UF 11): KPI, slotting, prelievo a ondate e cross-docking, varco RFID. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, WM = window.WM4, SP = window.SP4, IN = window.IN4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; }, W = function () { return S().wm; };
  var nonAttivo = function () { return WM.attivo() ? '' : '<div class="lab-esito ko">⚠ Il WMS non è attivo: vai su <b>Magazzino → Struttura e attivazione</b>.</div>'; };
  var v = function (x, suf) { return x === null || x === undefined ? '—' : n0(x) + (suf || ''); };
  var PAGINE = {
    kpi: function () {
      var k = IN.kpi();
      radice.innerHTML = nonAttivo() + '<div class="kpi4">' +
        '<div><b>' + v(k.accuratezza, ' %') + '</b><span>accuratezza dell\'inventario (' + k.posizioniContate + ' posizioni contate)</span></div>' +
        '<div><b>' + v(k.ordiniPerfetti, ' %') + '</b><span>ordini perfetti: completi ed entro 3 giorni (' + k.consegneWm + ' consegne)</span></div>' +
        '<div><b>' + v(k.cicloMedio, ' gg') + '</b><span>tempo medio ordine → uscita merci</span></div>' +
        '<div><b>' + v(k.dockToStock, ' gg') + '</b><span>dock-to-stock: dall\'entrata alla messa a posto</span></div>' +
        '<div><b>' + v(k.distanzaMedia, ' m') + '</b><span>metri percorsi per riga di prelievo (andata e ritorno)</span></div>' +
        '<div><b>' + v(k.saturazione, ' %') + '</b><span>saturazione degli scaffali (001)</span></div>' +
        '<div><b>' + v(k.rotazione) + '</b><span>indice di rotazione (uscite / giacenza a valore) in ' + k.giorniOsservati + ' giorni</span></div>' +
        '<div><b>' + v(k.copertura, ' gg') + '</b><span>copertura: giorni di consumo coperti dalla giacenza</span></div></div>' +
        L.scheda('👷', 'Produttività per risorsa', 'compiti confermati', L.tabella(['Risorsa', 'Compiti›'], Object.keys(k.perRisorsa).map(function (r) { return [e(r), k.perRisorsa[r]]; }), 'Nessun compito.')) +
        L.scheda('📐', 'Come si calcolano', 'definizioni', '<ul class="lab-elenco"><li><b>Accuratezza</b> = posizioni contate senza differenza / posizioni contate.</li><li><b>Ordine perfetto</b> = consegnato completo, nei tempi, senza errori (qui: quantità piena entro 3 giorni).</li>' +
          '<li><b>Dock-to-stock</b> = tempo da quando la merce arriva a quando è a scaffale e prelevabile.</li><li><b>Metri per riga</b>: dal modello delle distanze (porta in testa alla corsia 01): misura l\'effetto di slotting e ondate.</li>' +
          '<li><b>Rotazione</b> = valore delle uscite / valore della giacenza; <b>copertura</b> = giacenza / uscite medie giornaliere.</li></ul>');
    },
    slotting: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      var a = IN.abcPrelievi(), p = IN.propostaSlotting();
      radice.innerHTML = '<div class="lab-griglia">' +
        L.scheda('🔤', 'Classi per frequenza di prelievo', 'ABC sulle righe · slotting', L.tabella(['Materiale', 'Righe di prelievo›', '%›', '% cumulata›', 'Classe'], a.map(function (x) { return [x.mat, x.righe, n0(x.perc) + ' %', n0(x.cum) + ' %', '<b>' + x.classe + '</b>']; })) +
          '<p class="lab-nota">Per lo slotting conta quante volte si va a prendere un articolo (righe), non il suo valore: i più prelevati vanno vicino alla porta e in basso.</p>') +
        L.scheda('🧭', 'Applica lo slotting', '/SCWM/SLOT · rearrangement', L.modulo('sl', [['data', 'Data', 'date']], [['sl', 'Crea i compiti di trasferimento proposti']]) +
          '<p class="lab-nota">Distanza dalla porta = 3 m per campata + 8 m per corsia + 2 m se al livello 2. I compiti si confermano con la pistola RF.</p>') + '</div>' +
        L.scheda('🔁', 'Proposta di ricollocazione', 'slotting', L.tabella(['UdC', 'Materiale', 'Classe', 'Da', 'A', 'Distanza prima m›', 'Dopo m›', 'Metri risparmiati a viaggio›'], p.map(function (x) {
          return [x.udc, x.mat, x.classe, x.da, '<b>' + x.a + '</b>', x.prima, x.dopo, '<b>' + x.risparmio * 2 + '</b>']; }), 'Nessuna proposta: gli articoli più prelevati sono già vicini alla porta.')) +
        L.scheda('🗺️', 'Distanza di ogni ubicazione dalla porta', 'metri', '<div class="mappa">' + ['01', '02', '03'].map(function (c) {
          var celle = []; [2, 1].forEach(function (l) { for (var k = 1; k <= 5; k++) { var b = c + '-0' + k + '-' + l, q = WM.inUbic(b)[0]; celle.push('<div class="ubic ' + (q ? 'm-' + q.mat : 'vuota') + '"><b>' + b + '</b>' + IN.dPorta(b) + ' m' + (q ? '<br>' + q.mat : '') + '</div>'); } });
          return '<div class="mappa-corsia"><h4>Corsia ' + c + '</h4><div class="mappa-griglia">' + celle.join('') + '</div></div>'; }).join('') + '</div>');
      L.collega(radice, 'sl', {sl: IN.applicaSlotting}, rendi);
    },
    ondate: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      var w = W(), att = IN.inAttesa();
      radice.innerHTML = '<div class="lab-griglia">' +
        L.scheda('⚙️', 'Modo di lavoro del magazzino', 'customizing WMS', L.modulo('mo', [['ondate', 'Prelievo a ondate', 'select', w.ondate ? 'si' : 'no', [['no', 'no: compiti subito, consegna per consegna'], ['si', 'sì: le consegne aspettano l\'ondata']]],
          ['crossDock', 'Cross-docking opportunistico', 'select', w.crossDock ? 'si' : 'no', [['no', 'no'], ['si', 'sì: la merce appena entrata va direttamente in spedizione']]]], [['mo', 'Salva']]) +
          '<p class="lab-nota">Cross-docking: se per una consegna c\'è merce in zona di ricevimento non ancora messa a posto, il sistema annulla la messa a posto e la porta subito alla porta di spedizione (niente doppia movimentazione).</p>') +
        L.scheda('🌊', 'Rilascia l\'ondata', '/SCWM/WAVE · VL35', '<p class="lab-nota">Consegne in attesa: ' + (att.map(function (c) { return c.numero + ' ' + e(U.nome(S(), c.cliente)) + ' ' + c.qta + ' ' + c.materiale; }).join(' · ') || 'nessuna') + '.</p>' +
          L.modulo('on', [['data', 'Data', 'date']], [['on', 'Rilascia l\'ondata (compiti in ordine di percorso)']])) + '</div>' +
        L.scheda('📊', 'Ondate rilasciate', '', L.tabella(['Ondata', 'Data', 'Consegne', 'Compiti', 'Metri un giro per ordine›', 'Metri con l\'ondata›', 'Risparmio›'], (w.ondateRilasciate || []).map(function (o) {
          return [o.nome, fd(o.data), o.consegne.join(', '), o.compiti.length, n0(o.metriOrdine), n0(o.metriOnda), n0(o.metriOrdine ? (1 - o.metriOnda / o.metriOrdine) * 100 : 0) + ' %']; }), 'Nessuna ondata.') +
          L.tabella(['Seq.', 'Compito', 'Ondata', 'Da', 'Materiale', 'Q.tà›', 'Stato'], w.compiti.filter(function (t) { return t.ondata; }).sort(function (a, b) { return (a.seq || 0) - (b.seq || 0); }).map(function (t) {
            return [t.seq, t.numero, t.ondata, t.da, t.mat, n0(t.qta), t.stato]; }), '—'));
      L.collega(radice, 'mo', {mo: IN.impostazioni}, rendi); L.collega(radice, 'on', {on: IN.rilasciaOndata}, rendi);
    },
    rfid: function () {
      var trs = SP.SP().trasporti.filter(function (t) { return !t.partenza; });
      var tutti = SP.SP().colli;
      radice.innerHTML = nonAttivo() + '<div class="lab-griglia">' +
        L.scheda('📡', 'Passaggio dal varco RFID della porta', 'SAP AII · EWM RFID', L.modulo('rf', [['trasporto', 'Trasporto in carico', 'select', '', U.lista(trs, function (t) { return t.numero + ' · ' + SP.VETTORI[t.vettore] + ' · ' + t.consegne.join(', '); }, '— nessun trasporto da caricare —')], ['data', 'Data', 'date']],
          [['rf', 'Fai passare il carrello dal varco']]) + '<p class="lab-nota">Ogni collo ha un tag RFID con l\'EPC derivato dall\'SSCC: il varco li legge tutti insieme, anche senza vederli. Il carico è registrato come con la pistola.</p>') +
        L.scheda('🔍', 'Barcode e RFID a confronto', '', L.tabella(['', 'Barcode (pistola)', 'RFID (varco)'], [['Lettura', 'una etichetta alla volta, a vista', 'tutti i tag insieme, anche coperti'], ['Distanza', 'pochi cm – 1 m', 'fino a 5–10 m (UHF)'],
          ['Tempo per 7 colli', 'circa 105 s', 'circa 1 s'], ['Costo per collo', 'etichetta di carta', 'tag (centesimi)'], ['Dato', 'SSCC stampato', 'EPC SSCC-96 nel chip']])) + '</div>' +
        L.scheda('🏷️', 'Codici EPC dei colli', 'urn:epc:id:sscc', L.tabella(['SSCC', 'EPC (SSCC-96)', 'Consegna', 'Caricato', 'Letto da RFID'], tutti.map(function (x) { return [x.sscc, IN.epc(x.sscc), x.consegna, x.caricato ? fd(x.caricato) : '', x.rfid ? '📡' : '']; }), 'Nessun collo.'));
      L.collega(radice, 'rf', {rf: IN.varco}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.kpi)(); }
  rendi();
})();
