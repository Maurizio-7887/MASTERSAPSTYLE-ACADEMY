/* SISTEMA INTEGRATO — Costi del prodotto: scheda di calcolo, CK11N/CK24, chiusura ordini (KGI2, KKS2, KO88), Material Ledger (CKM3, CKMLCP). */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, PP = window.PP4, PC = window.PC4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var sc = function () { return S().costing.scheda; };
  var STATI = {KA: 'KA calcolata', VO: 'VO marcata', FR: 'FR rilasciata'};
  var barra = function (qui) { return window.COPERCORSO ? window.COPERCORSO.html(S(), qui) : ''; };
  var link = function (dove, testo) { return window.COPERCORSO ? '<a href="' + window.COPERCORSO.url(dove) + '">' + testo + '</a>' : testo; };
  // Distinta e ciclo standard del piano CO (CS02 · CA02): il budget dei centri è nelle pagine CO-OM, non qui.
  function pannelloCPM() {
    var cp = PC.cpm, m = cp.modello();
    if (!m) return '<div class="lab-nota">📌 Il costo standard parte dal piano dei centri: prima ' + link('controllo/', 'CO → 1 · Centri, attività e classi di costo') + ' (passo 1), poi KP06, KP26, KSU1 e KSPI. Qui sotto la distinta e il ciclo compaiono dopo il passo 1; la scheda di calcolo con la tariffa unica resta solo per i lavori iniziati senza piano CO.</div>';
    var mat = radice.dataset.cpmMat || 'TR-STD', st = m.standard[mat], mats = Object.keys(m.standard).map(function (k) { return [k, k]; });
    return L.scheda('🔧', 'Distinta e ciclo standard', 'CS02 · CA02 · nuova revisione del piano',
        '<p class="lab-nota">Per ogni prodotto: componente e quantità per pezzo (distinta) e ore per pezzo in ogni centro produttivo (ciclo). Le ore si valorizzano alle tariffe calcolate con KSPI. Ogni salvataggio crea una nuova revisione del piano: poi ' + link('controllo/kspi', 'KSPI') + ' e CK11N.</p>' +
        '<label>Prodotto da modificare <select id="cpm-materiale">' + mats.map(function (a) { return '<option value="' + e(a[0]) + '"' + (a[0] === mat ? ' selected' : '') + '>' + e(a[0]) + '</option>'; }).join('') + '</select></label>' +
        L.modulo('cpm-standard', [['materiale', 'Materiale', 'select', mat, [[mat, mat]]], ['componente', 'Componente', 'select', st.componente.mat, Object.keys(S().materiali).map(function (k) { return [k, k]; })], ['quantita', 'Quantità componente per pezzo', 'num', st.componente.q],
          ['Taglio', '4210 Taglio h/pz (0 = fase assente)', 'num', st.ore.Taglio || 0], ['Piegatura', '4220 Piegatura h/pz', 'num', st.ore.Piegatura || 0], ['Saldatura', '4230 Saldatura h/pz', 'num', st.ore.Saldatura || 0], ['attrezzaggio', 'Setup h/lotto', 'num', st.attrezzaggio], ['centroSet', 'Centro del setup', 'select', st.centroSet, cp.centri.map(function (k) { return [k, k]; })]], [['standard', 'Salva distinta/ciclo versionati']]) +
        L.tabella(['Materiale', 'Componente/pz', 'Ciclo h/pz', 'Setup h/lotto', 'Costo €/pz alle tariffe correnti (lotto scheda)›'], Object.keys(m.standard).map(function (k) { var s = m.standard[k], el = PC.elementi(k, sc().lotto); return [k, n0(s.componente.q) + ' ' + e(s.componente.mat), e(s.fasi.map(function (f) { return f + ' ' + s.ore[f]; }).join(' → ')), n0(s.attrezzaggio), eur(el.totale / sc().lotto)]; })));
  }
  function collegaCPM() {
    if (!PC.cpm.attivo()) return;
    L.collega(radice, 'cpm-standard', {standard: function (i) { i.ore = {Taglio: i.Taglio, Piegatura: i.Piegatura, Saldatura: i.Saldatura}; return PC.cpm.salvaStandard(i); }}, rendi);
    var select = radice.querySelector('#cpm-materiale'); if (select) select.onchange = function () { radice.dataset.cpmMat = this.value; rendi(); };
  }
  var PAGINE = {
    scheda: function () {
      var x = sc();
      var storico = PC.cpm.attivo();
      radice.innerHTML = U.avviso(S()) + barra('costi/') + pannelloCPM() + (storico ? '<p class="lab-nota"><b>Scheda di calcolo ZFT01</b> (costing sheet): i sovraccosti % e il lotto di calcolo si aggiungono alle tariffe dei reparti calcolate da KSPI. La tariffa unica qui sotto serve solo ai lavori senza piano CO.</p>' : '') + '<div class="lab-griglia">' +
        L.scheda('🧮', 'Scheda di calcolo ZFT01 e percentuali', 'KZS2 · KZZ2', L.modulo('sk', [['sovrMat', 'Sovraccosto materiale % (riga 20)', 'num', x.sovrMat], ['sovrProd', 'Sovraccosto di produzione % (riga 50)', 'num', x.sovrProd],
          ['tariffa', storico ? 'Tariffa unica €/h (solo senza piano CO: ora valgono le tariffe KSPI)' : 'Tariffa delle attività €/h (KP26)', 'num', x.tariffa], ['lotto', 'Lotto di calcolo (pz)', 'num', x.lotto]], [['sk', 'Salva la scheda']]) +
          (x.confermata ? '<p class="lab-nota">✓ Scheda confermata.</p>' : '<p class="lab-nota">Controlla le percentuali e premi «Salva la scheda».</p>')) +
        L.scheda('💡', 'Che cosa sono i sovraccosti', '', '<ul class="lab-elenco"><li>Il costo standard di gennaio (31,40 per la TR-STD) conteneva solo <b>ferro e ore</b>.</li>' +
          '<li>Ma acquistare, ricevere e tenere a magazzino il ferro costa: il <b>sovraccosto materiale</b> lo attribuisce in % del materiale.</li>' +
          '<li>Capireparto, manutenzione, servizi di produzione: il <b>sovraccosto di produzione</b> in % delle attività.</li>' +
          '<li>L\'<b>attrezzaggio</b> è fisso per lotto: nel costo standard pesa le sue ore / ' + n0(x.lotto) + ' pz del lotto di calcolo.</li></ul>') + '</div>' +
        L.scheda('🔧', 'Righe della scheda di calcolo', 'KZS2', L.tabella(['Riga', 'Base', 'Descrizione', 'Sovraccosto', 'Da riga'], [
          ['10', 'Elemento 510', 'Materiale diretto', '', ''], ['20', '', 'Sovraccosto materiale', n0(x.sovrMat) + ' %', '10'],
          ['30', 'Elemento 620', 'Lavorazione (attività)', '', ''], ['40', 'Elemento 625', 'Attrezzaggio (attività fissa)', '', ''],
          ['50', '', 'Sovraccosto di produzione', n0(x.sovrProd) + ' %', '30 – 40'], ['100', '', 'Costo di produzione', '', '10 – 50']]));
      L.collega(radice, 'sk', {sk: PC.scheda}, rendi);
      collegaCPM();
    },
    calcolo: function () {
      var stime = S().costing.stime, mats = U.materiali(S());
      radice.innerHTML = U.avviso(S()) + barra('costi/calcolo') + '<div class="lab-griglia">' +
        L.scheda('🧾', 'Calcola il costo standard', 'CK11N · variante PPC1', L.modulo('ck', [['materiale', 'Materiale', 'select', 'TR-STD', mats], ['data', 'Data di calcolo', 'date']], [['ck', 'Calcola']])) +
        L.scheda('📌', 'Marca e rilascia', 'CK24', L.modulo('cr', [['data', 'Data di rilascio (inizio periodo)', 'date']].concat(PC.cpm.attivo() ? [['sostituisciBootstrap', 'Solo primo CPM su azienda vuota: scrivi SOSTITUISCI per sostituire il bootstrap di costituzione', 'text']] : []), [['marca', 'Marca tutte le stime calcolate', 'sec'], ['cr', 'Rilascia']]) +
          '<p class="lab-nota">Al rilascio il prezzo standard cambia e il magazzino si <b>rivaluta</b>: giacenza × (nuovo − vecchio) → D 13 / A 64. Un solo rilascio per periodo, prima dei movimenti del mese.</p>') + '</div>' +
        L.scheda('📋', 'Stime dei costi', 'CK13N', L.tabella(['Materiale', 'Data', 'Stato', 'Standard attuale›', 'Stima›', 'Differenza›', 'Giacenza›', 'Rivalutazione›'], mats.map(function (x) {
          var m = S().materiali[x[0]], st = stime[x[0]], ril = S().costing.rilasci.filter(function (r) { return r.materiale === x[0]; }).slice(-1)[0];
          return [x[0], st ? fd(st.data) : '—', st ? STATI[st.stato] : '—', eur(m.std), st ? eur(st.unitario) : '', st && st.stato !== 'FR' ? eur(st.unitario - m.std) : '', n0(S().giacenze[x[0]]) + ' pz', ril ? eur(ril.rivalutazione) + ' (' + fd(ril.data) + ')' : '']; }))) +
        mats.filter(function (x) { return stime[x[0]]; }).map(function (x) { return L.scheda('🔎', 'Scomposizione ' + x[0], 'CK13N · elementi', PC.tabellaStima(stime[x[0]])); }).join('');
      L.collega(radice, 'ck', {ck: PC.calcola}, rendi);
      L.collega(radice, 'cr', {marca: PC.marca, cr: PC.rilascia}, rendi);
    },
    chiusura: function () {
      var ordini = S().produzione;
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('➕', '1 · Sovraccosti sugli ordini', 'KGI2', L.modulo('kg', [['data', 'Data (fine mese)', 'date']], [['kg', 'Calcola e addebita']]) + '<p class="lab-nota">Percentuali della scheda sui costi <b>effettivi</b>: D 78 / A 76.</p>') +
        L.scheda('⚖️', '2 · Varianze e liquidazione', 'KKS2 · KO88', L.modulo('ko', [['data', 'Data (fine mese)', 'date']], [['ko', 'Calcola varianze e liquida']]) + '<p class="lab-nota">Ordini DLV o TECO: la varianza va al materiale (D 61 / A 73) e diventa una differenza prezzo nel Material Ledger.</p>') +
        '</div>' + (ordini.length ? ordini.map(function (o) {
          var v = PC.varianze(o), x = v.effettivi;
          return L.scheda('📊', 'Ordine ' + o.numero + ' · ' + o.qta + ' pz ' + o.materiale + ' · ' + PP.stato(o), 'KKBC · KKS2', L.tabella(['Elemento', 'Pianificato (lotto ' + n0(o.qta) + ')›', 'Effettivo›'], [
            ['Materiale diretto', eur(o.piano.mat), eur(x.mat)], ['Lavorazione', eur(o.piano.lav), eur(x.lav)], ['Attrezzaggio', eur(o.piano.set), eur(x.set)],
            ['Sovraccosto materiale', eur(o.piano.sovrMat), eur(x.sovrMat)], ['Sovraccosto di produzione', eur(o.piano.sovrProd), eur(x.sovrProd)],
            {cls: 'tot', celle: ['Totale costi', eur(o.piano.totale), eur(x.totale)]}, ['Accredito (101 a standard)', '', '−' + eur(x.accredito)]]) +
            L.tabella(['Categoria di varianza', 'Piano / obiettivo', 'Effettivo', 'Varianza €›'], v.categorie.map(function (c) { return [e(c.cat), c.piano, c.eff, eur(c.v)]; }).concat([{cls: 'tot', celle: ['Totale', '', '', eur(v.totale)]}])) +
            (o.liquidazione ? '<p class="lab-nota">✓ Liquidato il ' + fd(o.liquidazione.data) + '.</p>' : ''));
        }).join('') : '<p class="lab-vuoto">Nessun ordine di produzione.</p>');
      L.collega(radice, 'kg', {kg: PC.sovraccosti}, rendi);
      L.collega(radice, 'ko', {ko: PC.liquida}, rendi);
    },
    ml: function () {
      var chiusi = S().costing.ml, per = radice.dataset.periodo || (chiusi.length ? chiusi[chiusi.length - 1].periodo : '2027-02');
      var gia = chiusi.find(function (c) { return c.periodo === per; }), res = gia || (S().avviato ? PC.ml(per) : null);
      var tab = res ? L.tabella(['Materiale', 'Std›', 'Inizio q.tà›', 'Entrate q.tà›', 'Differenze delle entrate›', 'Cumulato q.tà›', 'Diff. cumulate›', 'Consumi q.tà›', 'Diff. sui consumi›', 'Rimanenza q.tà›', 'Diff. sulla rimanenza›', 'Prezzo effettivo›'],
        Object.keys(res.materiali).map(function (m) { var x = res.materiali[m];
          return [m, eur(x.std), n0(x.inizio.qta), n0(x.entrate.qta), eur(x.entrate.pd), n0(x.cumulato.qta), eur(x.cumulato.pd), n0(x.consumi.qta), eur(x.consumi.pd), n0(x.fine.qta), eur(x.fine.pd), '<b>' + eur(x.prezzoEffettivo) + '</b>']; })) : '';
      var det = res ? Object.keys(res.materiali).map(function (m) { var x = res.materiali[m]; return x.entrate.dettaglio.length ? '<li><b>' + m + '</b>: ' + x.entrate.dettaglio.map(function (d) { return e(d.fonte) + ' ' + eur(d.pd); }).join(' · ') + '</li>' : ''; }).join('') : '';
      radice.innerHTML = U.avviso(S()) +
        '<div class="lab-filtro"><label>Periodo <input id="per" value="' + e(per) + '" size="8"></label> <span class="lab-nota">' + (gia ? '✓ Periodo chiuso il ' + fd(gia.data) + ' (doc. ' + gia.contabile + ')' : 'Anteprima: valori non ancora registrati') + '</span></div>' +
        (res && res.avvisi.length ? '<div class="lab-esito ko">⚠ ' + e(res.avvisi.join(' ')) + '</div>' : '') +
        L.scheda('📒', 'Cockpit del Material Ledger', 'CKM3 · determinazione del prezzo a un livello e a più livelli', tab + (det ? '<ul class="lab-elenco">' + det + '</ul>' : '') +
          '<p class="lab-nota">Il ferro entra a standard 0,95 ma costa di più: la differenza si ripartisce tra la rimanenza e il consumato; il consumato <b>sale di livello</b> sui prodotti degli ordini che l\'hanno prelevato, insieme alle varianze degli ordini. Sui prodotti finiti, la parte venduta va al costo del venduto (conto 42 e CO-PA), la parte in magazzino rivaluta la rimanenza.</p>') +
        (gia ? '' : L.scheda('🔐', 'Chiusura del periodo', 'CKMLCP', L.modulo('cm', [['periodo', 'Periodo (AAAA-MM)', 'text', per], ['data', 'Data di chiusura (fine mese)', 'date']], [['cm', 'Esegui la chiusura (a più livelli) e registra']]) +
          '<p class="lab-nota">Scrittura: D 12 · D 13 rimanenze · D 42 venduto / A 63 differenze d\'acquisto · A 61 varianze di produzione.</p>'));
      var p = radice.querySelector('#per'); if (p) p.onchange = function () { radice.dataset.periodo = this.value.trim(); rendi(); };
      L.collega(radice, 'cm', {cm: PC.chiusuraML}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.scheda)(); }
  rendi();
})();
