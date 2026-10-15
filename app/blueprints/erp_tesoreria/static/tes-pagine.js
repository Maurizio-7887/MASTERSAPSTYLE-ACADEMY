/* SISTEMA INTEGRATO — Tesoreria: posizione di cassa e previsione, partite aperte, pagamenti F110, estratto conto elettronico. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, TS = window.TS4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var ultima = function () { return S().registrazioni.reduce(function (d, r) { return r.data > d ? r.data : d; }, S().avviato || '2027-01-01'); };
  var dataSel = function (k, def) { return radice.dataset[k] || def || ultima(); };
  var filtroData = function (k, etichetta) { return '<div class="lab-filtro"><label>' + etichetta + ' <input type="date" id="fd" value="' + dataSel(k) + '"></label></div>'; };
  var legaData = function (k) { var x = radice.querySelector('#fd'); if (x) x.onchange = function () { radice.dataset[k] = this.value; rendi(); }; };
  var ESEMPIO = ['2027-06-08;-10980;SEPA SCT ADDEBITO DISTINTA F110-001 ACCIAIERIE UMBRE', '2027-06-09;18651,36;BONIFICO DA BETA COSTRUZIONI SRL RIF FT 90000002',
    '2027-06-10;12383;BONIFICO COMUNE DI GAMMA MANDATO 145 FT 90000004', '2027-06-11;10043,04;BONIFICO DELTA NOLEGGI SRL', '2027-06-12;4800;BONIFICO EDIL SIGMA SRL',
    '2027-06-15;-18,50;COMMISSIONI E SPESE TENUTA CONTO', '2027-06-15;3,11;INTERESSI CREDITORI NETTI'].join('\n');
  var PAGINE = {
    posizione: function () {
      var dal = dataSel('dal', '2027-06-01'), p = TS.previsione(dal, 6);
      radice.innerHTML = U.avviso(S()) + '<div class="lab-filtro"><label>Previsione dal <input type="date" id="fd" value="' + dal + '"></label></div>' +
        '<div class="kpi4"><div><b>' + eur(p.banca) + '</b><span>banca + banca in transito al ' + fd(dal) + '</span></div><div><b>' + eur(p.scaduti.incassi) + '</b><span>crediti già scaduti (da sollecitare)</span></div>' +
        '<div><b>' + eur(p.scaduti.pagamenti) + '</b><span>debiti già scaduti</span></div><div><b>' + eur(p.colonne.slice(-1)[0].saldoFinale) + '</b><span>saldo previsto fra 6 settimane (se tutti pagano)</span></div></div>' +
        L.scheda('📈', 'Previsione di liquidità per settimana', 'FF7B · Cash Flow Analyzer', L.tabella(['Settimana', 'Saldo iniziale›', 'Incassi attesi›', 'Pagamenti attesi›', 'Saldo finale›'], p.colonne.map(function (c) {
          return [fd(c.dal) + ' – ' + fd(c.al), eur(c.saldoIniziale), eur(c.incassi), eur(c.pagamenti), '<b>' + eur(c.saldoFinale) + '</b>']; })) +
          '<p class="lab-nota">Fonti: partite aperte dei clienti (conto 11) e dei fornitori (conto 20) alla loro scadenza, stipendi a fine mese e F24 al 16 del mese dopo. Il primo saldo iniziale comprende già i crediti e i debiti scaduti, come se si incassassero subito: è il caso migliore.</p>') +
        L.scheda('🏦', 'Posizione di cassa', 'FF7A', L.tabella(['Conto', 'Descrizione', 'Saldo›'], [['10', 'Banca c/c', eur(N.saldo('10'))], ['18', 'Banca c/transito (bonifici F110 non ancora addebitati)', eur(N.saldo('18'))]]));
      legaData('dal');
    },
    partite: function () {
      var alla = dataSel('alla'), lato = radice.dataset.lato || 'cliente', p = TS.partite(lato, null, alla), a = TS.anzianita(lato, alla);
      radice.innerHTML = U.avviso(S()) + '<div class="lab-filtro"><label>Partite <select id="lato"><option value="cliente"' + (lato === 'cliente' ? ' selected' : '') + '>clienti (FBL5N)</option><option value="fornitore"' + (lato === 'fornitore' ? ' selected' : '') + '>fornitori (FBL1N)</option></select></label> <label>alla data <input type="date" id="fd" value="' + alla + '"></label></div>' +
        L.scheda('📒', 'Partite aperte', lato === 'cliente' ? 'FBL5N' : 'FBL1N', L.tabella(['Partner', 'Documento', 'Data', 'Scadenza', 'Giorni di ritardo›', 'Importo›', 'Aperto›', 'Valuta'], p.map(function (x) {
          var rit = x.scadenza ? Math.round((Date.parse(alla) - Date.parse(x.scadenza)) / 864e5) : 0;
          return [e(x.nome), x.doc, fd(x.data), fd(x.scadenza), rit > 0 ? '<b>' + rit + '</b>' : '', eur(x.importo), eur(x.aperto), x.valuta + (x.apertoValuta != null ? ' ' + eur(x.apertoValuta) : '')]; }), 'Nessuna partita aperta.') +
          '<p class="lab-nota">Pareggio come in SAP: un incasso con il riferimento chiude quella fattura; senza riferimento chiude le partite più vecchie. Le note di credito riducono le fatture.</p>') +
        L.scheda('⏳', 'Anzianità dei ' + (lato === 'cliente' ? 'crediti' : 'debiti'), 'S_ALR_87012178', L.tabella(['Partner'].concat(a.fasce.map(function (f) { return f + '›'; })), Object.keys(a.righe).map(function (k) { var r = a.righe[k]; return [e(r.nome)].concat(a.fasce.map(function (f) { return r[f] ? eur(r[f]) : ''; })); }), 'Nessuna partita.'));
      radice.querySelector('#lato').onchange = function () { radice.dataset.lato = this.value; rendi(); };
      legaData('alla');
    },
    pagamenti: function () {
      var data = dataSel('dp', '2027-06-07'), prop = TS.propostaPagamenti({data: data}), runs = TS.T().pagamenti, ult = runs.slice(-1)[0];
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('💸', 'Programma di pagamento automatico', 'F110', '<div class="lab-filtro"><label>Data di esecuzione <input type="date" id="fd" value="' + data + '"></label></div>' +
          L.tabella(['Fornitore', 'Documento', 'Scadenza', 'Importo›'], prop.map(function (x) { return [e(x.nome), x.doc, fd(x.scadenza), eur(x.aperto)]; }), 'Nessuna partita scaduta da pagare a questa data.') +
          L.modulo('pg', [['data', 'Data di esecuzione', 'date', data]], [['pg', 'Esegui il pagamento (bonifici SEPA)']]) +
          '<p class="lab-nota">Proposta → controllo → esecuzione: D 20 Fornitore / A 18 Banca c/transito. Il conto 18 si chiude quando la banca addebita la distinta (estratto conto).</p>') +
        L.scheda('🧾', 'File di bonifico SEPA', 'pain.001.001.03', ult ? '<pre style="font-size:11px;white-space:pre-wrap;max-height:280px;overflow:auto">' + e(TS.sepa(ult)) + '</pre>' : '<p class="lab-vuoto">Nessuna distinta ancora.</p>') + '</div>' +
        L.scheda('📚', 'Distinte di pagamento', 'F110 · registro', L.tabella(['Distinta', 'Data', 'Beneficiari', 'Totale›', 'Contabile', 'Addebitata in banca'], runs.map(function (r) { return [r.numero, fd(r.data), e(r.partite.map(function (x) { return x.nome; }).join(', ')), eur(r.totale), r.contabile, r.addebitato ? fd(r.addebitato) : '<b>non ancora</b>']; }), 'Nessuna.'));
      legaData('dp');
      L.collega(radice, 'pg', {pg: TS.eseguiPagamenti}, rendi);
    },
    estratti: function () {
      var es = TS.T().estratti, sel = es.find(function (x) { return x.numero === radice.dataset.es; }) || es.slice(-1)[0];
      var aperti = sel ? sel.righe.filter(function (x) { return x.stato === 'da abbinare'; }) : [];
      var ric = sel ? TS.riconciliazione(sel.numero) : null;
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('📥', 'Carica l\'estratto conto elettronico', 'FF_5 · CBI / camt.053', L.modulo('ec', [['data', 'Data dell\'estratto', 'date', '2027-06-15'], ['righe', 'Movimenti (data;importo;descrizione)', 'text', '']], [['ec', 'Carica estratto']]) +
          '<p class="lab-nota">Una riga per movimento. <button type="button" class="lab-btn sec" id="esempio">Usa l\'estratto di esempio di giugno</button></p>') +
        (sel ? L.scheda('🔗', 'Abbinamento automatico', 'regole di ricerca', L.modulo('ab', [], [['ab', 'Abbina e registra l\'estratto n. ' + sel.numero]]) +
          '<ul class="lab-elenco"><li>addebito uguale a una distinta F110 → chiude il conto 18</li><li>riferimento di una fattura nella descrizione → chiude quella fattura</li><li>importo uguale a una sola partita aperta → la chiude</li><li>«commissioni / spese» → conto 58 · «interessi» → conto 59</li></ul>') : '') + '</div>' +
        (sel ? L.scheda('🏦', 'Estratto n. ' + sel.numero + ' del ' + fd(sel.data), 'FEBAN · righe', L.tabella(['Riga', 'Data', 'Descrizione', 'Importo›', 'Stato', 'Regola', 'Contabile'], sel.righe.map(function (x) {
            return [x.id, fd(x.data), e(x.descrizione), eur(x.importo), x.stato === 'da abbinare' ? '<b>da abbinare</b>' : x.stato, e(x.regola || ''), x.contabile || '']; })) +
          (aperti.length ? '<h3 class="lab-h3">Abbinamento manuale (FEBAN)</h3>' + L.modulo('mn', [['riga', 'Riga', 'select', '', aperti.map(function (x) { return [x.id, x.id + ' · ' + x.descrizione + ' · ' + eur(x.importo)]; })],
            ['cliente', 'Cliente (incasso)', 'select', '', [['', '—']].concat(U.clienti(S()))], ['doc', 'Fattura da chiudere (vuoto = in conto, le più vecchie)', 'text'], ['fornitore', 'oppure fornitore', 'select', '', [['', '—']].concat(U.fornitori(S()))], ['conto', 'oppure conto', 'text']], [['mn', 'Registra la riga']]) : '') +
          '<p class="lab-nota">Riconciliazione: saldo dell\'estratto ' + eur(ric.saldoBanca) + ' · saldo del conto 10 al ' + fd(sel.data) + ' ' + eur(ric.saldoConto) + ' → ' + (ric.ok ? '<b>✓ quadrano</b>' : '<b>⚠ ' + ric.daRegistrare.length + ' righe da registrare</b>') + '</p>') : '');
      var inp = radice.querySelector('#ec-righe'); if (inp) { var ta = document.createElement('textarea'); ta.id = 'ec-righe'; ta.rows = 7; ta.style.cssText = 'width:100%;font-family:ui-monospace,monospace;font-size:12px'; inp.replaceWith(ta); }
      var b = radice.querySelector('#esempio'); if (b) b.onclick = function () { radice.querySelector('#ec-righe').value = ESEMPIO; };
      L.collega(radice, 'ec', {ec: function (v) { var r = TS.caricaEstratto(v); radice.dataset.es = TS.T().estratti.slice(-1)[0].numero; return r; }}, rendi);
      if (sel) { L.collega(radice, 'ab', {ab: function () { return TS.abbina({estratto: sel.numero}); }}, rendi); L.collega(radice, 'mn', {mn: function (v) { v.estratto = sel.numero; return TS.manuale(v); }}, rendi); }
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.posizione)(); }
  rendi();
})();
