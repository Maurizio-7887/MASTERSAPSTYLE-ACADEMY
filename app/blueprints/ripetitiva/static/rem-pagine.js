/* Laboratorio «Produzione ripetitiva» — una funzione per ogni pagina HTML del blueprint. */
(function () {
  'use strict';
  var L = window.LabMotore, X = window.REM, C = window.LAB_PAGINA || {};
  var M = X.avvia(C.chiave);
  var radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd;
  var S = function () { return M.S; };
  var opzColl = function () { var k = Object.keys(S().collettori); return k.length ? k : [['', '— crea prima i collettori —']]; };

  function giacenze() {
    return L.tabella(['Materiale', 'Giacenza›', 'Costo std›', 'Valore›'], ['FERRO'].concat(L.FINITI).map(function (k) {
      var g = S().giacenze[k]; return [k + ' — ' + e(L.MATERIALI[k].nome), L.fmtQ(g, k), eur(L.costoStd(k)), eur(g * L.costoStd(k))]; }));
  }
  function standard() {
    return L.tabella(['Transenna', 'Ferro per pezzo›', 'Ore per pezzo (taglio + piega + saldatura)›', 'Costo standard›', 'Fino al punto di conteggio›'], L.FINITI.map(function (m) {
      var x = L.esplodi(m, 1), ore = Object.keys(x.ore).reduce(function (t, k) { return t + x.ore[k]; }, 0);
      return [m, n0(x.ferro) + ' kg', n0(ore) + ' h', eur(L.costoStd(m)), eur(X.stdFinoPunto(m))]; }));
  }
  var PAGINE = {
    pianificazione: function () {
      var b = S().budget;
      radice.innerHTML =
        '<div class="lab-griglia">' +
        L.scheda('📈', 'Budget annuo di produzione', 'MD61 · LTP', L.modulo('bu', [['anno', 'Anno', 'text', b ? b.anno : ''], ['TR-STD', 'TR-STD (pz)', 'num', b ? b.quantita['TR-STD'] : ''],
          ['TR-ALTA', 'TR-ALTA (pz)', 'num', b ? b.quantita['TR-ALTA'] : ''], ['TR-PED', 'TR-PED (pz)', 'num', b ? b.quantita['TR-PED'] : '']], [['bu', 'Salva budget e piano']])) +
        L.scheda('🏭', 'Versione di produzione sulla linea', 'C223 · profilo REM', L.modulo('ve', [['mat', 'Transenna', 'select', 'TR-STD', L.FINITI]], [['ve', 'Attiva su Linea L1']]) +
          '<p class="lab-nota">' + e(X.LINEA) + '. In linea i semilavorati sono fantasma: la distinta si esplode fino al ferro.</p>') +
        '</div>' +
        L.scheda('🗓️', 'Piano della linea (run schedule)', 'MF50', b ? L.tabella(['Transenna', 'Budget anno›', 'Piano mensile›', 'Versione di produzione'], L.FINITI.map(function (m) {
          var v = S().versioni[m]; return [m, n0(b.quantita[m]), n0(b.pianoMensile[m]), v ? '0001 · Linea L1 · punto di conteggio ' + v.puntoConteggio : '—']; }).concat([{cls: 'tot', celle: ['Totale', n0(b.totale), n0(L.FINITI.reduce(function (t, m) { return t + b.pianoMensile[m]; }, 0)), '']}])) : '<p class="lab-vuoto">Inserisci il budget.</p>') +
        L.scheda('🧮', 'Costi standard della linea', 'CK11N', standard()) +
        L.scheda('♻️', 'Ricomincia il laboratorio', '', '<button type="button" class="lab-btn rosso" id="azzera">Azzera il laboratorio</button>');
      L.collega(radice, 'bu', {bu: X.budget}, rendi);
      L.collega(radice, 've', {ve: X.versione}, rendi);
      radice.querySelector('#azzera').onclick = function () { if (confirm('Azzerare il laboratorio Produzione ripetitiva?')) { M.azzera(); rendi(); } };
    },
    collettori: function () {
      radice.innerHTML =
        L.scheda('🗂️', 'Crea collettore costi di prodotto', 'KKF6N', L.modulo('pc', [['mat', 'Transenna', 'select', 'TR-STD', L.FINITI], ['data', 'Data', 'date']], [['pc', 'Crea collettore']]) +
          '<p class="lab-nota">Un collettore per materiale e versione di produzione. Non ha quantità né date di fine: raccoglie i costi del prodotto mese dopo mese.</p>') +
        L.scheda('📊', 'Collettori e periodi', 'KKF6N · KKBC_PKO', Object.keys(S().collettori).length ? Object.keys(S().collettori).map(function (m) {
          var c = S().collettori[m];
          return '<h3 class="lab-h3">' + c.id + ' — aperto, ' + c.eventi.length + ' movimenti · WIP in linea ' + c.wipPz + ' pz</h3>' +
            L.tabella(['Periodo', 'Prodotti›', 'Piano›', 'Costi›', 'Output a std›', 'WIP al target›', 'Varianza›', 'Var. per pezzo›'], c.periodi.map(function (p) {
              return [p.periodo, n0(p.qta), n0(p.piano), eur(p.debito), eur(p.output), eur(p.wip), eur(p.varianza), eur(p.perPz)]; }), 'Nessun periodo chiuso.');
        }).join('') : '<p class="lab-vuoto">Nessun collettore.</p>');
      L.collega(radice, 'pc', {pc: X.collettore}, rendi);
    },
    consuntivazione: function () {
      var ev = [];
      Object.keys(S().collettori).forEach(function (m) { S().collettori[m].eventi.forEach(function (x) { ev.push([fd(x.data), m, ({completa: 'conferma completa', punto: 'fino al punto di conteggio', dalPunto: 'dal punto di conteggio', scarto: 'scarto', extra: 'prelievo extra: ' + e(x.motivo || '')})[x.modo], n0(x.qta), n0(x.ferroKg) + ' kg', n0(x.ore) + ' h', eur(x.debito), eur(x.output)]); }); });
      ev.sort(function (a, b) { return a[0].split('/').reverse().join('') < b[0].split('/').reverse().join('') ? 1 : -1; });
      radice.innerHTML =
        '<div class="lab-griglia">' +
        L.scheda('🚚', 'Acquisti: entrata ferro', 'MIGO 101', L.modulo('fe', [['data', 'Data', 'date'], ['kg', 'Kg', 'num'], ['rif', 'Riferimento DDT', 'text']], [['fe', 'Registra entrata']])) +
        L.scheda('✅', 'Conferma a consuntivo (backflush)', 'MFBF', L.modulo('mf', [['mat', 'Transenna', 'select', 'TR-STD', L.FINITI], ['qta', 'Quantità (pz)', 'num'],
          ['modo', 'Tipo di conferma', 'select', 'completa', [['completa', 'Conferma completa (dal ferro al prodotto finito)'], ['punto', 'Fino al punto di conteggio Piegatura (WIP)'], ['dalPunto', 'Dal punto di conteggio al prodotto finito'], ['scarto', 'Scarto (consumi senza prodotto buono)']]],
          ['data', 'Data', 'date']], [['mf', 'Registra conferma']]) + '<p class="lab-nota">Un solo gesto: carica il prodotto finito e scarica in automatico ferro e ore della distinta e del ciclo standard.</p>') +
        L.scheda('📤', 'Prelievo extra al collettore', 'MB1A 261', L.modulo('mx', [['mat', 'Collettore', 'select', '', opzColl()], ['kg', 'Kg di ferro', 'num'], ['motivo', 'Motivo', 'text'], ['data', 'Data', 'date']], [['mx', 'Registra prelievo']]) +
          '<p class="lab-nota">Sfridi e consumi oltre la distinta: il backflush a standard non li vede, vanno caricati a parte.</p>') +
        '</div>' +
        L.scheda('🧾', 'Movimenti dei collettori', 'MB51', L.tabella(['Data', 'Collettore', 'Movimento', 'Pz›', 'Ferro›', 'Ore›', 'Costi›', 'Output a std›'], ev, 'Nessuna conferma.')) +
        L.scheda('🏬', 'Giacenze', 'MB52', giacenze());
      L.collega(radice, 'fe', {fe: X.entrataFerro}, rendi);
      L.collega(radice, 'mf', {mf: X.mfbf}, rendi);
      L.collega(radice, 'mx', {mx: X.prelievoExtra}, rendi);
    },
    chiusura: function () {
      radice.innerHTML =
        L.scheda('📆', 'Chiusura di periodo per i collettori', 'KKAS · KKS6 · KK87', L.modulo('ch', [['periodo', 'Periodo (AAAA-MM)', 'text']], [['ch', 'Esegui chiusura del periodo']]) +
          '<p class="lab-nota">Per ogni collettore: <b>WIP al target</b> = pezzi fermi al punto di conteggio × costo standard fino a lì (D 15 / A 74, solo la differenza col mese prima); ' +
          '<b>varianza di periodo</b> = costi del mese − output a standard − variazione del WIP (D 61 / A 73). Il collettore resta aperto.</p>') +
        L.scheda('🗓️', 'Periodi chiusi', '', L.tabella(['Periodo', 'Collettore', 'Prodotti›', 'Costi›', 'Output›', 'WIP›', 'Varianza›'], S().periodi.reduce(function (t, p) {
          return t.concat(p.righe.map(function (x) { return [p.periodo, 'PCC-' + x.mat, n0(x.qta), eur(x.debito), eur(x.output), eur(x.wip), eur(x.varianza)]; })); }, []), 'Nessun periodo chiuso.'));
      L.collega(radice, 'ch', {ch: X.chiusura}, rendi);
    },
    cruscotto: function () {
      var b = S().budget, periodi = S().periodi, nref = parseInt(radice.dataset.ref || '2000', 10);
      var ultimo = periodi[periodi.length - 1];
      var mov = Object.keys(S().collettori).reduce(function (t, m) { return t + S().collettori[m].eventi.length; }, 0);
      var pezziMese = b ? b.totale / 12 : 0;
      radice.innerHTML =
        '<div class="lab-kpi">' +
        '<div><span>Collettori aperti</span><b>' + Object.keys(S().collettori).length + '</b><small>' + n0(mov / Object.keys(S().collettori).length || 0) + ' movimenti per collettore</small></div>' +
        '<div><span>Budget annuo</span><b>' + (b ? n0(b.totale) : '—') + '</b><small>' + (b ? n0(pezziMese) + ' pz al mese sulla linea' : 'da inserire') + '</small></div>' +
        '<div><span>Varianze ultimo periodo</span><b>' + (ultimo ? eur(ultimo.righe.reduce(function (t, x) { return t + x.varianza; }, 0)) : '—') + '</b><small>' + (ultimo ? ultimo.periodo : 'nessun periodo chiuso') + '</small></div>' +
        '<div><span>WIP in linea</span><b>' + eur(M.saldo('15')) + '</b><small>valutato al target</small></div>' +
        '</div>' +
        L.scheda('🎯', 'Aderenza al piano e varianza per pezzo', 'per periodo', L.tabella(['Periodo', 'Transenna', 'Piano›', 'Prodotti›', 'Aderenza›', 'Varianza›', 'Per pezzo›'], periodi.reduce(function (t, p) {
          return t.concat(p.righe.map(function (x) { return [p.periodo, x.mat, n0(x.piano), n0(x.qta), x.piano ? n0(x.qta / x.piano * 100) + '%' : '—', eur(x.varianza), eur(x.perPz)]; })); }, []), 'Chiudi almeno un periodo.') +
          '<p class="lab-nota">Con volumi stabili il mese è un\'unità di analisi sensata: la varianza per pezzo si confronta mese su mese e indica subito dove intervenire (qui: scarti in saldatura, sfrido sulle prolunghe).</p>') +
        L.scheda('⚖️', 'E se i codici fossero 2.000? (alta varietà)', 'confronto', '<div class="lab-filtro"><label>Referenze di prodotto finito <input type="range" min="3" max="2000" step="1" id="ref" value="' + nref + '"> <b>' + n0(nref) + '</b></label></div>' +
          L.tabella(['', 'Modello trattore (questo laboratorio)', 'Con ' + n0(nref) + ' referenze e gli stessi volumi'], [
            ['Collettori costi', '3', n0(nref)],
            ['Pezzi al mese per collettore', b ? n0(pezziMese / 3) : '—', b ? n0(pezziMese / nref) : '—'],
            ['Collettori senza movimenti nel mese (≈)', '0', nref > pezziMese ? n0(Math.round(nref - pezziMese)) + ' (più codici che pezzi!)' : 'pochi'],
            ['Significato della varianza di periodo', 'stabile, confrontabile', 'rumore: 1–2 lotti al mese, o nessuno'],
            ['Backflush a standard', 'affidabile', 'falsa il magazzino (sostituzioni, sfridi variabili)'],
            ['Modello giusto', 'produzione ripetitiva, controllo per periodo', 'controllo per ordine con disaccoppiamento (laboratorio Alta varietà)']]) );
      var r = radice.querySelector('#ref'); if (r) r.oninput = function () { radice.dataset.ref = this.value; rendi(); };
    },
    giornale: function () {
      radice.innerHTML = '<div class="lab-griglia">' + L.scheda('📚', 'Libro giornale del laboratorio', 'FB03', L.giornale(S())) +
        L.scheda('⚖️', 'Bilancio di verifica', 'F.08', L.bilancio(S())) + '</div>' + L.scheda('🏬', 'Giacenze', 'MB52', giacenze());
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.pianificazione)(); }
  rendi();
})();
