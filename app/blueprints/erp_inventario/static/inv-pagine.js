/* SISTEMA INTEGRATO — Inventari fisici e contabili: documenti, lista di conta, differenze, classificazione ABC, valorizzazione delle rimanenze. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, WM = window.WM4, IV = window.IV4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; }, W = function () { return S().wm; };
  var um = function (m) { return (S().materiali[m] || {}).um || 'pz'; };
  var nonAttivo = function () { return WM.attivo() ? '' : '<div class="lab-esito ko">⚠ Il WMS non è ancora attivo: vai su <b>Magazzino → Struttura e attivazione</b>. La valorizzazione delle rimanenze funziona anche senza.</div>'; };
  var STATI = {creato: 'creato', attivo: 'attivo · ubicazioni bloccate', riconta: 'da ricontare', contato: 'contato', chiuso: 'chiuso (differenze in 999)'};
  var scelto = function () { var d = W().inventari, n = radice.dataset.doc; return d.find(function (x) { return x.numero === n; }) || d.filter(function (x) { return x.stato !== 'chiuso'; }).slice(-1)[0] || d.slice(-1)[0]; };
  var sceltaDoc = function (d) { return '<div class="lab-filtro no-stampa"><label>Documento <select id="doc">' + W().inventari.map(function (x) { return '<option value="' + x.numero + '"' + (d && x.numero === d.numero ? ' selected' : '') + '>' + x.numero + ' · ' + IV.TIPI[x.tipo] + ' · ' + STATI[x.stato] + '</option>'; }).join('') + '</select></label></div>'; };
  var legaDoc = function () { var s = radice.querySelector('#doc'); if (s) s.onchange = function () { radice.dataset.doc = this.value; rendi(); }; };
  var PAGINE = {
    documenti: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      var d = scelto(), abc = IV.abc();
      var azioni = '';
      if (d) {
        var sec = d.stato === 'riconta';
        var campi = d.stato === 'attivo' || sec ? d.righe.map(function (r, k) {
          if (sec && !r.riconta) return null;
          return ['r' + k, r.ubic + ' · ' + (r.mat ? r.mat + (r.udc ? ' · UdC ' + r.udc : '') : 'vuota') + (sec ? ' · RICONTA' : ''), 'num'];
        }).filter(Boolean) : [];
        if (d.stato === 'attivo' || sec) campi = campi.concat(d.righe.map(function (r, k) { return !r.mat && !sec ? ['m' + k, r.ubic + ' · materiale trovato (se non vuota)', 'text'] : null; }).filter(Boolean), [['contatore', 'Contato da', 'text']]);
        azioni = d.stato === 'creato' ? L.modulo('ia', [['data', 'Data di riferimento', 'date', d.data]], [['ia', 'Attiva (blocca le ubicazioni)']])
          : d.stato === 'attivo' || sec ? L.modulo('ic', campi, [['ic', sec ? 'Registra la riconta (LI14)' : 'Registra la conta (LI11N)']]) + '<p class="lab-nota">Conta cieca: la lista e la pistola RF non mostrano la quantità a sistema. Si può contare anche dalla pistola (scheda Inventario).</p>'
          : d.stato === 'contato' ? L.modulo('ix', [['data', 'Data', 'date']], [['ix', 'Chiudi nel WMS: differenze nella 999 (LI20)']]) : '<p class="lab-nota">✓ Chiuso il ' + fd(d.chiuso) + '. Le differenze si registrano da «Differenze inventariali».</p>';
      }
      radice.innerHTML = '<div class="lab-griglia">' +
        L.scheda('🆕', 'Crea documento d\'inventario', 'LI01N · /SCWM/PI_CREATE', L.modulo('in', [['tipo', 'Tipo', 'select', 'rotazione', Object.keys(IV.TIPI).map(function (k) { return [k, IV.TIPI[k]]; })],
          ['selezione', 'Classe ABC (A/B/C) o ubicazioni separate da virgola', 'text', 'A'], ['tolleranza', 'Tolleranza di riconta (€ per posizione)', 'num', W().tolleranza], ['data', 'Data', 'date']], [['in', 'Crea documento']]) +
          '<p class="lab-nota">Classi oggi: ' + abc.righe.map(function (x) { return x.mat + ' ' + x.classe; }).join(' · ') + '.</p>') +
        L.scheda('🧭', 'Le fasi', 'procedura operativa', '<ol class="lab-elenco"><li><b>Crea</b> il documento: quali ubicazioni.</li><li><b>Attiva</b>: data di riferimento, ubicazioni bloccate.</li><li><b>Stampa</b> la lista di conta cieca (o usa la pistola).</li>' +
          '<li><b>Conta</b>; sopra la tolleranza si <b>riconta</b>.</li><li><b>Chiudi</b> nel WMS: le ubicazioni prendono la quantità contata, la differenza va nella 999.</li><li><b>Registra</b> in contabilità: movimento 711/712 e scrittura D 65 / A magazzino.</li></ol>') + '</div>' +
        (d ? sceltaDoc(d) + L.scheda('📝', 'Documento ' + d.numero + ' · ' + IV.TIPI[d.tipo], 'LI03N · stato: ' + STATI[d.stato], azioni +
          L.tabella(['Ubicazione', 'Materiale', 'UdC', 'Contabile›', '1ª conta›', 'Riconta›', 'Differenza›', 'Valore €›', 'Esito'], d.righe.map(function (r) {
            var f = IV.finale(r), dq = f === null || f === undefined ? null : f - r.libro, val = dq === null || !r.mat ? null : dq * S().materiali[r.mat].std;
            var mostraLibro = d.stato === 'contato' || d.stato === 'chiuso' || d.stato === 'riconta';
            return [r.ubic, r.mat || '—', r.udc, mostraLibro ? n0(r.libro) : '<i>nascosta</i>', r.conta1 === null ? '' : n0(r.conta1), r.conta2 === null ? (r.riconta ? '<b>da fare</b>' : '') : n0(r.conta2),
              dq === null ? '' : n0(dq), val === null ? '' : eur(val), r.riconta ? 'oltre tolleranza ' + eur(d.tolleranza) : dq ? 'differenza' : dq === 0 ? 'ok' : ''];
          })) + '<p class="no-stampa"><a class="lab-btn sec" href="' + location.pathname.replace(/\/[^/]*$/, '/lista') + '">🖨️ Lista di conta da stampare</a></p>') : '') +
        L.scheda('📚', 'Documenti d\'inventario', 'LX25 · /SCWM/PI_PROCESS', L.tabella(['Documento', 'Tipo', 'Data', 'Posizioni›', 'Stato', 'Differenze €›'], W().inventari.map(function (x) { return [x.numero, IV.TIPI[x.tipo] + (x.selezione ? ' · ' + e(x.selezione) : ''), fd(x.data), x.righe.length, STATI[x.stato], x.valoreDiff != null ? eur(x.valoreDiff) : '']; }), 'Nessun documento.'));
      legaDoc();
      L.collega(radice, 'in', {in: function (v) { var r = IV.crea(v); radice.dataset.doc = W().inventari.slice(-1)[0].numero; return r; }}, rendi);
      if (d) { L.collega(radice, 'ia', {ia: function (v) { return IV.attiva({numero: d.numero, data: v.data}); }}, rendi);
        L.collega(radice, 'ic', {ic: function (v) { v.numero = d.numero; return IV.conta(v); }}, rendi);
        L.collega(radice, 'ix', {ix: function (v) { return IV.chiudi({numero: d.numero, data: v.data}); }}, rendi); }
    },
    lista: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      var d = scelto();
      if (!d) { radice.innerHTML = '<p class="lab-vuoto">Nessun documento d\'inventario.</p>'; return; }
      var sec = d.stato === 'riconta';
      radice.innerHTML = sceltaDoc(d) + '<p class="no-stampa"><button type="button" class="lab-btn" id="stampa">🖨️ Stampa la lista</button></p>' +
        L.scheda('📋', 'LISTA DI CONTA ' + (sec ? '— RICONTA ' : '') + '· documento ' + d.numero, 'LI04 · magazzino W100 · Ferro & Transenne', '<p>Tipo: <b>' + IV.TIPI[d.tipo] + '</b> · data di riferimento ' + fd(d.attivato || d.data) + ' · stato ' + STATI[d.stato] + '</p>' +
          '<table class="lab-tab lista-conta"><tr><th>Pos.</th><th>Ubicazione</th><th>Materiale</th><th>UdC</th><th>U.M.</th><th>Quantità contata</th><th>Note</th></tr>' +
          d.righe.map(function (r, k) { if (sec && !r.riconta) return ''; return '<tr><td>' + (k + 1) + '</td><td><b>' + r.ubic + '</b></td><td>' + (r.mat || '(vuota — se trovi merce scrivi il codice)') + '</td><td>' + r.udc + '</td><td>' + (r.mat ? um(r.mat) : '') + '</td><td class="vuoto-conta"></td><td class="vuoto-conta"></td></tr>'; }).join('') + '</table>' +
          '<p style="margin-top:22px">Contato da: ____________________ &nbsp; Firma: ____________________ &nbsp; Data e ora: ______________</p>' +
          '<p>Controllato da (capo magazzino): ____________________ &nbsp; Firma: ____________________</p>' +
          '<p class="lab-nota">Conta «cieca»: la quantità contabile non è riportata. Contare tutte le unità, anche danneggiate (annotarle nelle note). Non spostare merce dalle ubicazioni bloccate.</p>');
      legaDoc(); radice.querySelector('#stampa').onclick = function () { window.print(); };
    },
    differenze: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      var diff = WM.inUbic('DIFF'), w = W();
      radice.innerHTML = '<div class="lab-griglia">' +
        L.scheda('🧾', 'Differenze nella zona 999', 'LX18 · /SCWM/DIFF_ANALYZER', L.tabella(['Materiale', 'Quantità›', 'Valore a standard›', 'Origine', 'Data'], diff.map(function (q) { return [q.mat, n0(q.qta) + ' ' + um(q.mat) + (q.qta > 0 ? ' mancanti' : ' in più'), eur(Math.abs(q.qta) * S().materiali[q.mat].std), e(q.rif), fd(q.data)]; }), 'Nessuna differenza in attesa.')) +
        L.scheda('📤', 'Registra in contabilità di magazzino', 'LI21 · movimento 711/712', L.modulo('rg', [['data', 'Data', 'date']], [['rg', 'Registra le differenze']]) +
          '<p class="lab-nota">Mancanza: movimento 711, D 65 Differenze inventariali / A 13 (o 12 per il ferro). Eccedenza: 712, D 13 / A 65. Al costo standard.</p>') + '</div>' +
        L.scheda('📚', 'Differenze registrate', 'MB51 · 711/712', L.tabella(['Data', 'Materiale', 'Quantità›', 'Valore›', 'Documento contabile'], w.registrazioni.map(function (r) { return [fd(r.data), r.mat, n0(r.qta), eur(r.valore), r.contabile]; }), 'Nessuna.') + '<p class="lab-nota">Saldo conto 65 Differenze inventariali: <b>' + eur(N.saldo('65')) + ' €</b>.</p>') +
        L.scheda('⚖️', 'Quadratura IM – WMS', 'LX23', L.tabella(['Materiale', 'IM›', 'WMS›', 'di cui 999›', 'Esito'], WM.quadratura().map(function (q) { return [q.mat, n0(q.im), n0(q.wm), n0(q.diff999), q.ok ? '✓' : '⚠']; })));
      L.collega(radice, 'rg', {rg: IV.registra}, rendi);
    },
    abc: function () {
      var a = IV.abc();
      radice.innerHTML = L.scheda('🔤', 'Classificazione ABC sul valore dei consumi', 'MC40 · ABC per inventario a rotazione', L.tabella(['Materiale', 'Consumi›', 'Valore a standard›', '% sul totale›', '% cumulata›', 'Classe', 'Conte all\'anno›'], a.righe.map(function (x) {
        return [x.mat, n0(x.qta) + ' ' + um(x.mat), eur(x.valore), n0(x.perc) + ' %', n0(x.cum) + ' %', '<b>' + x.classe + '</b>', x.freq]; }).concat([{cls: 'tot', celle: ['Totale', '', eur(a.totale), '100 %', '', '', '']}])) +
        '<p class="lab-nota">Regola di Pareto: classe <b>A</b> fino all\'80% cumulato del valore (pochi codici, molto valore: si contano ogni mese), <b>B</b> fino al 95% (ogni trimestre), <b>C</b> il resto (una volta l\'anno). Consumi = vendite (601) e prelievi per la produzione (261) al netto dei resi.</p>') +
        L.scheda('📅', 'Piano dell\'inventario a rotazione', 'inventario permanente', L.tabella(['Classe', 'Materiali', 'Frequenza', 'Prossima conta suggerita'], ['A', 'B', 'C'].map(function (c) {
          var ms = a.righe.filter(function (x) { return x.classe === c; }).map(function (x) { return x.mat; });
          return [c, ms.join(', ') || '—', {A: 'mensile (12/anno)', B: 'trimestrale (4/anno)', C: 'annuale (1/anno)'}[c], ms.length ? {A: 'questo mese', B: 'entro il trimestre', C: 'a fine anno'}[c] : '']; })) +
          '<p class="lab-nota">Con l\'inventario a rotazione si sostituisce la conta di fine anno «a magazzino fermo»: ogni posizione si conta almeno una volta nell\'esercizio (art. 2217 c.c. e prassi di revisione), senza fermare le spedizioni.</p>');
    },
    valorizzazione: function () {
      var mats = Object.keys(S().materiali), mat = radice.dataset.mat || 'FERRO', libero = radice.dataset.libero === '1';
      var righe = libero ? JSON.parse(radice.dataset.righe || 'null') || [
        {data: '2027-01-01', tipo: 'C', qta: 100, prezzo: 10, causale: 'rimanenza iniziale'}, {data: '2027-01-10', tipo: 'C', qta: 200, prezzo: 12, causale: 'acquisto'},
        {data: '2027-01-15', tipo: 'S', qta: 150, prezzo: 0, causale: 'vendita'}, {data: '2027-01-20', tipo: 'C', qta: 100, prezzo: 13, causale: 'acquisto'}, {data: '2027-01-25', tipo: 'S', qta: 120, prezzo: 0, causale: 'vendita'}]
        : IV.movimentiDi(mat);
      var stdP = libero ? 11 : S().materiali[mat].std, v = IV.valuta(righe, stdP);
      var ml = (S().costing && S().costing.ml || []).slice(-1)[0], pe = !libero && ml && ml.materiali[mat] ? ml.materiali[mat].prezzoEffettivo : null;
      radice.innerHTML = '<div class="lab-filtro"><label>Materiale <select id="mat"' + (libero ? ' disabled' : '') + '>' + mats.map(function (m) { return '<option' + (m === mat ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
        ' <label><input type="checkbox" id="lib"' + (libero ? ' checked' : '') + '> esempio da manuale (modificabile)</label></div>' +
        (v.errori.length ? '<div class="lab-esito ko">' + v.errori.map(e).join('<br>') + '</div>' : '') +
        '<div class="kpi4"><div><b>' + n0(v.giacenza) + '</b><span>giacenza finale ' + (libero ? 'unità' : um(mat)) + '</span></div><div><b>' + eur(v.fifo) + '</b><span>FIFO (primo entrato, primo uscito)</span></div>' +
        '<div><b>' + eur(v.lifo) + '</b><span>LIFO continuo (ultimo entrato, primo uscito)</span></div><div><b>' + eur(v.cmp) + '</b><span>costo medio ponderato continuo</span></div>' +
        '<div><b>' + eur(v.standard) + '</b><span>costo standard ' + eur(stdP) + '</span></div>' + (pe ? '<div><b>' + eur(pe * v.giacenza) + '</b><span>prezzo effettivo ML ' + eur(pe) + ' (fine ' + ml.periodo + ')</span></div>' : '') + '</div>' +
        (libero ? L.scheda('✍️', 'Movimenti dell\'esempio', 'modifica e ricalcola', '<textarea id="txt" rows="7" style="width:100%;font-family:ui-monospace,monospace">' + righe.map(function (r) { return [r.data, r.tipo, r.qta, r.prezzo, r.causale].join(';'); }).join('\n') + '</textarea>' +
          '<p class="lab-nota">Una riga per movimento: data;C (carico) o S (scarico);quantità;prezzo unitario (solo per i carichi);causale.</p><button type="button" class="lab-btn" id="ricalcola">Ricalcola</button>') : '') +
        L.scheda('📒', 'Scheda di magazzino', 'kardex · MB51 + MR51', L.tabella(['Data', 'Causale', 'Carico›', 'Scarico›', 'Prezzo carico›', 'Giacenza›', 'Valore FIFO›', 'Valore LIFO›', 'Valore CMP›', 'Prezzo medio›'], v.scheda.map(function (r) {
          return [fd(r.data), e(r.causale), r.tipo === 'C' ? n0(r.qta) : '', r.tipo === 'S' ? n0(r.qta) : '', r.tipo === 'C' ? eur(r.prezzo) : '', n0(r.giacenza), eur(r.fifo), eur(r.lifo), eur(r.cmp), r.prezzoMedio.toLocaleString('it-IT', {minimumFractionDigits: 4})]; }), 'Nessun movimento.')) +
        '<div class="lab-griglia">' + L.scheda('🧱', 'Strati FIFO rimasti', '', L.tabella(['Quantità›', 'Prezzo›', 'Valore›'], v.stratiFifo.map(function (s) { return [n0(s.q), eur(s.p), eur(s.q * s.p)]; }), '—')) +
        L.scheda('🧱', 'Strati LIFO rimasti', '', L.tabella(['Quantità›', 'Prezzo›', 'Valore›'], v.stratiLifo.map(function (s) { return [n0(s.q), eur(s.p), eur(s.q * s.p)]; }), '—')) + '</div>' +
        '<p class="lab-nota">Codice civile art. 2426 c. 1 n. 10: rimanenze di beni fungibili a costo medio ponderato, FIFO o LIFO; l\'OIC 13 ammette il costo standard se vicino al costo effettivo (in SAP: Material Ledger). Con prezzi in aumento il FIFO dà rimanenze più alte e utile più alto; il LIFO il contrario.</p>';
      radice.querySelector('#mat').onchange = function () { radice.dataset.mat = this.value; rendi(); };
      radice.querySelector('#lib').onchange = function () { radice.dataset.libero = this.checked ? '1' : ''; rendi(); };
      var rc = radice.querySelector('#ricalcola');
      if (rc) rc.onclick = function () {
        var rr = radice.querySelector('#txt').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { var p = x.split(';'); return {data: p[0], tipo: (p[1] || 'C').trim().toUpperCase() === 'S' ? 'S' : 'C', qta: L.num(p[2], 'Quantità', 0), prezzo: p[3] ? L.num(p[3], 'Prezzo', 0) : 0, causale: p[4] || ''}; });
        radice.dataset.righe = JSON.stringify(rr); rendi();
      };
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.documenti)(); }
  rendi();
})();
