/* SISTEMA INTEGRATO — Pianificazione BPC: modello e Data Manager, modulo di inserimento EPM, Business Process Flow, report. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, B = window.BPC4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, S = function () { return N.S; }, cp = window.PC4.cpm;
  var url = function (d) { return window.COPERCORSO.url(d); };
  var BADGE = {aperto: 'grigio', inviato: 'giallo', approvato: 'verde', respinto: 'arancio'};
  function percorso(qui) {
    var m = B.M(), tutti = m && cp.CDC.every(function (c) { return B.statoDi(c.codice).stato === 'approvato'; });
    var t = [['bpc/', 'Modello e Data Manager', !!m], ['bpc/input', 'Modulo di inserimento (EPM)', !!m && Object.keys(m.dati).some(function (k) { return k.indexOf('BUDGET|V1|') === 0; })],
      ['bpc/processo', 'Invio, approvazione e ritrasferimento in S/4', !!m && tutti && m.retract.length > 0], ['bpc/report', 'Budget, forecast e consuntivo', false]];
    var primo = t.findIndex(function (x) { return !x[2]; });
    return '<nav class="lab-card" aria-label="Processo di budget BPC" style="padding:8px 12px"><div style="font-size:12px;color:#556;margin-bottom:4px"><b>Processo di budget SAP BPC</b> · il budget si prepara qui, si approva e torna in S/4 come piano KP06 versione 0</div><ol style="display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:0;padding:0">' +
      t.map(function (x, i) { return '<li><a href="' + url(x[0]) + '" class="lab-bd ' + (x[2] ? 'verde' : i === primo ? 'giallo' : 'grigio') + '" style="text-decoration:none;' + (x[0] === qui ? 'font-weight:700;outline:2px solid #0a6ed1' : '') + '">' + (x[2] ? '✓' : i === primo ? '●' : '○') + ' ' + (i + 1) + ' · ' + e(x[1]) + '</a></li>'; }).join('<li aria-hidden="true" style="color:#99a">→</li>') + '</ol></nav>';
  }
  function serveModello(qui) {
    if (!cp.attivo()) { radice.innerHTML = U.avviso(S()) + percorso(qui) + '<div class="lab-esito ko">⚠ Il budget BPC parte dal piano CO di S/4: prima <a href="' + url('controllo/') + '">apri il piano CO</a> (passo 1).</div>'; return null; }
    var m = B.M();
    if (!m) {
      radice.innerHTML = U.avviso(S()) + percorso(qui) + L.scheda('🗂️', 'Crea il modello di pianificazione', 'BPC · ambiente FT_PLAN · modello COSTI_CENTRI',
        '<p>Il modello ha cinque dimensioni: <b>CONTO</b> (classi di costo), <b>CENTRO</b> (i sei centri di costo CO), <b>CATEGORIA</b> (ACTUAL consuntivo, BUDGET, FORECAST), <b>VERSIONE</b> e <b>TEMPO</b> (12 mesi del ' + cp.modello().anno + ').</p>' +
        '<p class="lab-nota">Alla creazione il BUDGET V1 si carica dal piano di S/4 (KP06 versione 0) diviso in 12 mesi uguali. Nessuna scrittura contabile.</p>' +
        L.modulo('bpc-crea', [['conferma', 'Per confermare scrivi CREA', 'text']], [['crea', 'Crea il modello']]));
      L.collega(radice, 'bpc-crea', {crea: B.crea}, rendi);
      return null;
    }
    return m;
  }
  var PAGINE = {
    modello: function () {
      var m = serveModello('bpc/'); if (!m) return;
      radice.innerHTML = U.avviso(S()) + percorso('bpc/') + '<div class="lab-griglia">' +
        L.scheda('🗂️', 'Modello COSTI_CENTRI', 'BPC · ambiente ' + m.ambiente + ' · anno ' + m.anno,
          L.tabella(['Dimensione', 'Membri'], [['CONTO', cp.CLASSI.map(function (c) { return c[0] + ' ' + e(c[1]); }).join(' · ')], ['CENTRO', cp.CDC.map(function (c) { return c.codice + ' ' + e(c.nome); }).join(' · ')],
            ['CATEGORIA', Object.keys(B.CATEGORIE).map(function (k) { return k + ' (' + e(B.CATEGORIE[k]) + ')'; }).join(' · ')],
            ['VERSIONE', Object.keys(m.versioni).map(function (k) { return k + ': ' + (m.versioni[k].join(', ') || '—'); }).join(' · ')], ['TEMPO', m.anno + '.01 … ' + m.anno + '.12']])) +
        L.scheda('⚙️', 'Data Manager · carica il consuntivo da S/4', 'pacchetto LOAD_ACDOCA',
          '<p class="lab-nota">Legge le righe di costo del libro giornale con il loro centro (o con OKB9) mese per mese. ' + (m.actualFino ? 'Ultimo caricamento: fino a ' + B.MESI[m.actualFino - 1] + '.' : 'Non ancora caricato.') + '</p>' +
          L.modulo('bpc-actual', [['mese', 'Fino al mese (1–12)', 'num', m.actualFino || 12]], [['actual', 'Carica il consuntivo']])) +
        L.scheda('📑', 'Data Manager · crea un forecast', 'pacchetto COPY · forecast n+(12−n)',
          '<p class="lab-nota">Il forecast prende il consuntivo dei mesi già chiusi e il budget dei mesi che mancano: 9+3 vuol dire 9 mesi veri e 3 di previsione.</p>' +
          L.modulo('bpc-copia', [['destinazione', 'Nome della versione', 'text', 'F1'], ['mesiActual', 'Mesi a consuntivo', 'num', m.actualFino || 0]], [['copia', 'Crea il forecast']])) + '</div>' +
        L.scheda('📜', 'Registro delle attività', 'BPC · audit', L.tabella(['Quando', 'Attività'], m.log.slice().reverse().map(function (x) { return [x.quando.slice(0, 16).replace('T', ' '), e(x.testo)]; })));
      L.collega(radice, 'bpc-actual', {actual: B.caricaActual}, rendi);
      L.collega(radice, 'bpc-copia', {copia: B.copia}, rendi);
    },
    input: function () {
      var m = serveModello('bpc/input'); if (!m) return;
      var cat = radice.dataset.cat || 'BUDGET', vers = m.versioni[cat] || [], ver = vers.indexOf(radice.dataset.ver) >= 0 ? radice.dataset.ver : vers[0], cdc = radice.dataset.cdc || '4210';
      var blocco = ver ? B.bloccato(cat, ver, cdc) : 'Nessuna versione in questa categoria: creala con il Data Manager.';
      var testa = '<tr><th>Classe di costo</th>' + B.MESI.map(function (x) { return '<th style="padding:2px">' + x + '</th>'; }).join('') + '<th>Totale €</th></tr>';
      var corpo = cp.CLASSI.map(function (c) {
        var a = ver ? B.riga(cat, ver, cdc, c[0]) : [];
        return '<tr><td style="min-width:150px">' + c[0] + ' ' + e(c[1]) + '</td>' + a.map(function (x, k) { return '<td style="padding:2px"><input id="epm-m' + c[0] + '_' + (k + 1) + '" inputmode="decimal" style="width:54px;min-width:0;padding:2px 3px;font-size:12px" value="' + (x ? String(x).replace('.', ',') : '') + '"' + (blocco ? ' disabled' : '') + '></td>'; }).join('') +
          '<td class="n"><b>' + eur(B.totaleRiga(a)) + '</b></td></tr>'; }).join('');
      radice.innerHTML = U.avviso(S()) + percorso('bpc/input') +
        '<div class="lab-filtro"><label>Categoria <select id="cat">' + Object.keys(B.CATEGORIE).map(function (k) { return '<option value="' + k + '"' + (k === cat ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label> ' +
        '<label>Versione <select id="ver">' + vers.map(function (v) { return '<option' + (v === ver ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></label> ' +
        '<label>Centro <select id="cdc">' + cp.CDC.map(function (c) { return '<option value="' + c.codice + '"' + (c.codice === cdc ? ' selected' : '') + '>' + c.codice + ' ' + e(c.nome) + '</option>'; }).join('') + '</select></label> ' +
        (cat === 'BUDGET' ? '<span class="lab-bd ' + BADGE[B.statoDi(cdc).stato] + '">' + e(B.STATI[B.statoDi(cdc).stato]) + '</span>' : '') + '</div>' +
        L.scheda('🧮', 'Modulo di inserimento · ' + cat + ' ' + (ver || '') + ' · centro ' + cdc, 'EPM add-in · input form IF_COSTI_CENTRO',
          (blocco ? '<div class="lab-esito ko">🔒 ' + e(blocco) + '</div>' : '<p class="lab-nota">Scrivi gli importi mese per mese (virgola per i decimali). Per spalmare un totale annuo in 12 mesi usa il riquadro sotto.</p>') +
          '<div style="overflow-x:auto"><table class="lab-tab" style="font-size:12px"><thead>' + testa + '</thead><tbody>' + corpo + '</tbody></table></div>' +
          (blocco ? '' : '<div class="lab-mod" data-prefisso="epm"><div class="lab-azioni"><button type="button" class="lab-btn" data-azione="salva">Salva nel modello</button></div><div class="lab-esito" id="epm-esito"></div></div>')) +
        (blocco ? '' : L.scheda('➗', 'Spalma un totale annuo', 'chiave di distribuzione 1 · 12 mesi uguali',
          L.modulo('spalma', [['classe', 'Classe di costo', 'select', '80', cp.CLASSI.map(function (c) { return [c[0], c[0] + ' ' + c[1]]; })], ['totale', 'Totale annuo €', 'num']], [['spalma', 'Distribuisci nei 12 mesi']])));
      ['cat', 'ver', 'cdc'].forEach(function (id) { var x = radice.querySelector('#' + id); if (x) x.onchange = function () { radice.dataset[id] = this.value; if (id === 'cat') delete radice.dataset.ver; rendi(); }; });
      L.collega(radice, 'epm', {salva: function (i) { i.categoria = cat; i.versione = ver; i.cdc = cdc; return B.salvaInput(i); }}, rendi);
      L.collega(radice, 'spalma', {spalma: function (i) {
        var t = L.num(String(i.totale).replace(/\./g, '').replace(',', '.'), 'Totale annuo', 0), parti = B.spalma(t), v = {categoria: cat, versione: ver, cdc: cdc};
        cp.CLASSI.forEach(function (c) { var a = c[0] === i.classe ? parti : B.riga(cat, ver, cdc, c[0]); a.forEach(function (x, k) { v['m' + c[0] + '_' + (k + 1)] = x; }); });
        return B.salvaInput(v); }}, rendi);
    },
    processo: function () {
      var m = serveModello('bpc/processo'); if (!m) return;
      var tutti = cp.CDC.every(function (c) { return B.statoDi(c.codice).stato === 'approvato'; });
      radice.innerHTML = U.avviso(S()) + percorso('bpc/processo') +
        L.scheda('🚦', 'Stato del budget per centro', 'Business Process Flow · work status', L.tabella(['Centro', 'Responsabile', 'Budget V1 €›', 'Stato', 'Ultima nota'], cp.CDC.map(function (c) {
          var st = B.statoDi(c.codice), ult = (st.storia || []).slice(-1)[0], tot = cp.CLASSI.reduce(function (t, k) { return t + B.totaleRiga(B.riga('BUDGET', 'V1', c.codice, k[0])); }, 0);
          return [c.codice + ' ' + e(c.nome), e(c.responsabile), eur(tot), '<span class="lab-bd ' + BADGE[st.stato] + '">' + e(B.STATI[st.stato]) + '</span>', ult ? e(ult.chi + ': ' + (ult.nota || ult.a)) : '']; }))) +
        '<div class="lab-griglia">' +
        L.scheda('📨', 'Azioni sul budget di un centro', 'invia (responsabile) · approva / respingi (controller)',
          '<p class="lab-nota">1. Il responsabile del centro <b>invia</b>: da quel momento il budget è bloccato. 2. Il controller lo <b>approva</b>, oppure lo <b>respinge</b> scrivendo che cosa correggere: il centro torna modificabile.</p>' +
          L.modulo('bpf', [['cdc', 'Centro', 'select', '4210', cp.CDC.map(function (c) { return [c.codice, c.codice + ' ' + c.nome]; })], ['azione', 'Azione', 'select', 'invia', [['invia', 'Invia al controller'], ['approva', 'Approva (controller)'], ['respingi', 'Respingi (controller)']]], ['nota', 'Nota / motivo', 'text']], [['bpf', 'Esegui']])) +
        L.scheda('↩️', 'Ritrasferisci il budget approvato in S/4', 'retraction · BPC → KP06 versione 0',
          (tutti ? '<p class="lab-nota">Tutti i centri sono approvati. Il budget annuo di ogni centro e classe sostituisce il piano KP06 versione 0: le tariffe cambiano e vanno ricalcolate (KSPI), poi il costo standard (CK11N, CK24).</p>' : '<div class="lab-esito ko">Si ritrasferisce solo quando tutti i centri sono approvati.</div>') +
          L.modulo('retract', [['conferma', 'Per confermare scrivi TRASFERISCI', 'text']], [['retract', 'Ritrasferisci in S/4']]) +
          (m.retract.length ? '<p class="lab-nota">Ultimo ritrasferimento: ' + m.retract.slice(-1)[0].quando.slice(0, 16).replace('T', ' ') + ' (revisione del piano ' + m.retract.slice(-1)[0].revisione + '). <a href="' + url('controllo/kspi') + '">Vai a KSPI</a>.</p>' : '')) + '</div>';
      L.collega(radice, 'bpf', {bpf: B.azione}, rendi);
      L.collega(radice, 'retract', {retract: B.ritrasferisci}, rendi);
    },
    report: function () {
      var m = serveModello('bpc/report'); if (!m) return;
      var mese = Number(radice.dataset.mese || m.actualFino || 12), fc = radice.dataset.fc || m.versioni.FORECAST[m.versioni.FORECAST.length - 1] || '', r = B.report({mese: mese, forecast: fc});
      radice.innerHTML = U.avviso(S()) + percorso('bpc/report') +
        '<div class="lab-filtro"><label>Fino al mese <select id="mese">' + B.MESI.map(function (x, k) { return '<option value="' + (k + 1) + '"' + (k + 1 === mese ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label> ' +
        '<label>Forecast <select id="fc"><option value="">—</option>' + m.versioni.FORECAST.map(function (v) { return '<option' + (v === fc ? ' selected' : '') + '>' + v + '</option>'; }).join('') + '</select></label>' +
        (m.actualFino ? '' : ' <span class="lab-bd arancio">consuntivo non caricato: Data Manager</span>') + '</div>' +
        L.scheda('📈', 'Budget, consuntivo e forecast per centro', 'report EPM · BUDGET V1 · ACTUAL · FORECAST ' + (fc || '—'),
          L.tabella(['Centro', 'Budget anno €›', 'Budget a ' + B.MESI[mese - 1] + ' €›', 'Consuntivo a ' + B.MESI[mese - 1] + ' €›', 'Scostamento €›', 'Scost. %›', 'Forecast anno €›', 'Stato'], r.map(function (x) {
            var sem = x.percentuale == null ? '' : Math.abs(x.percentuale) <= 5 ? 'verde' : Math.abs(x.percentuale) <= 15 ? 'giallo' : 'arancio';
            return [x.cdc + ' ' + e(x.nome), eur(x.budget), eur(x.budgetYTD), eur(x.actualYTD), eur(x.scostamentoYTD), x.percentuale == null ? '—' : '<span class="lab-bd ' + sem + '">' + n0(x.percentuale) + ' %</span>', fc ? eur(x.forecast) : '—', e(B.STATI[x.stato])]; })) +
          '<p class="lab-nota">Semaforo: verde entro ±5%, giallo entro ±15%, arancio oltre. Il budget progressivo somma i mesi del budget fino al mese scelto: se hai distribuito in 12 parti uguali è il budget annuo × mesi / 12.</p>');
      ['mese', 'fc'].forEach(function (id) { var x = radice.querySelector('#' + id); if (x) x.onchange = function () { radice.dataset[id] = this.value; rendi(); }; });
    }
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.modello)(); }
  rendi();
})();
