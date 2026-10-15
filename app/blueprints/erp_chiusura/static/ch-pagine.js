/* SISTEMA INTEGRATO — Liquidazione IVA, imposte, chiusura e riapertura dei conti. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, CH = window.CH4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, fd = L.fd, S = function () { return N.S; };
  var anno = function () { var a = (S().avviato || '2027').slice(0, 4), ch = S().chiusure || {}; while (ch[a]) a = String(+a + 1); return a; };
  var tabCE = function (ce) { return L.tabella(['Conto', 'Descrizione', 'Costi›', 'Ricavi›'], ce.righe.map(function (x) { return [x.conto, e(x.nome), x.saldo > 0 ? eur(x.saldo) : '', x.saldo < 0 ? eur(-x.saldo) : '']; }).concat([{cls: 'tot', celle: ['', 'Totali', eur(ce.costi), eur(ce.ricavi)]}, {cls: 'tot', celle: ['', ce.risultato >= 0 ? 'Utile' : 'Perdita', '', eur(Math.abs(ce.risultato))]}]), 'Nessun costo o ricavo.'); };
  var tabSP = function (sp) { var n = Math.max(sp.attivo.length, sp.passivo.length), righe = [];
    for (var i = 0; i < n; i++) { var a = sp.attivo[i], p = sp.passivo[i]; righe.push([a ? a.conto + ' ' + e(a.nome) : '', a ? eur(a.saldo) : '', p ? p.conto + ' ' + e(p.nome) : '', p ? eur(p.saldo) : '']); }
    righe.push({cls: 'tot', celle: ['Totale attivo', eur(sp.totaleAttivo), 'Totale passivo e netto', eur(sp.totalePassivo)]});
    return L.tabella(['Attività', '›', 'Passività e patrimonio netto', '›'], righe); };
  var PAGINE = {
    iva: function () {
      var p = radice.dataset.p || (anno() + '-T1'), cal = null; try { cal = CH.calcolaIva(p); } catch (x) { cal = null; }
      var liq = CH.X().iva;
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🧮', 'Liquidazione periodica dell\'IVA', 'S_ALR_87012357 · registro IVA', '<div class="lab-filtro"><label>Periodo <input id="per" value="' + e(p) + '" placeholder="2027-T1 oppure 2027-03"></label></div>' +
          (cal ? L.tabella(['Voce', 'Importo›'], [['IVA a debito del periodo (vendite)', eur(cal.debito)], ['IVA a credito del periodo (acquisti)', eur(cal.credito)], ['Credito riportato dal periodo prima', eur(cal.riporto)],
            {cls: 'tot', celle: [cal.saldo >= 0 ? 'IVA da versare' : 'Credito da riportare', eur(Math.abs(cal.saldo))]}, ['Interessi 1% (regime trimestrale)', eur(cal.interessi)], ['Scadenza F24', fd(cal.scadenza)]]) : '<p class="lab-esito ko">Periodo non valido.</p>') +
          L.modulo('lq', [['periodo', 'Periodo', 'text', p], ['data', 'Data di registrazione (fine periodo)', 'date', cal ? cal.al : '']], [['lq', 'Registra la liquidazione']]) +
          '<p class="lab-nota">A debito: D 21 / A 14 / A 25 Erario c/IVA. A credito: si chiude l\'IVA a debito con quella a credito e il resto resta sul 14 per il periodo dopo. Trimestrale (volume d\'affari entro i limiti di legge): interessi dell\'1% al versamento.</p>') +
        L.scheda('🏦', 'Versamento con F24', 'codici tributo 6001…6012 · 6031…6034', L.modulo('vs', [['periodo', 'Periodo liquidato', 'select', '', U.lista(liq.filter(function (x) { return x.daVersare && !x.versato; }), function (x) { return x.periodo + ' · ' + eur(x.daVersare + x.interessi) + ' entro il ' + fd(x.scadenza); }, '— niente da versare —', function (x) { return x.periodo; })],
          ['data', 'Data del versamento', 'date']], [['vs', 'Registra l\'F24']]) + '<p class="lab-nota">D 25 Erario c/IVA · D 53 interessi / A 10 Banca. Dopo la scadenza servirebbe il ravvedimento operoso (sanzioni ridotte): qui il sistema lo segnala.</p>') + '</div>' +
        L.scheda('📋', 'Liquidazioni registrate', 'registro delle liquidazioni', L.tabella(['Periodo', 'Dal', 'Al', 'Debito›', 'Credito›', 'Riporto›', 'Saldo›', 'Interessi›', 'Scadenza', 'Versato'], liq.map(function (x) {
          return [x.periodo, fd(x.dal), fd(x.al), eur(x.debito), eur(x.credito), eur(x.riporto), x.saldo >= 0 ? eur(x.saldo) : 'credito ' + eur(-x.saldo), eur(x.interessi), fd(x.scadenza), x.versato ? fd(x.versato) : (x.daVersare ? '<b>da versare</b>' : '—')]; }), 'Nessuna liquidazione.') +
          '<p class="lab-nota">Saldi oggi: IVA a debito (21) ' + eur(-N.saldo('21')) + ' · IVA a credito (14) ' + eur(N.saldo('14')) + ' · Erario c/IVA (25) ' + eur(-N.saldo('25')) + '.</p>');
      radice.querySelector('#per').onchange = function () { radice.dataset.p = this.value.trim(); rendi(); };
      L.collega(radice, 'lq', {lq: CH.liquidaIva}, rendi); L.collega(radice, 'vs', {vs: CH.versaIva}, rendi);
    },
    imposte: function () {
      var a = anno(), d = radice.dataset, c = CH.calcolaImposte({anno: a, aumenti: d.au || 0, diminuzioni: d.di || 0, aliquota: d.ai || 24, aliquotaIrap: d.ap || 3.9}), ce = CH.contoEconomico(a, true);
      var fatte = CH.X().imposte.find(function (x) { return x.anno === a; });
      var rigaV = function (v) { return [e(v[0]), v[1] ? (v[1] > 0 ? '+ ' : '− ') + eur(Math.abs(v[1])) : '—']; };
      radice.innerHTML = U.avviso(S()) + (fatte ? '<p class="lab-esito ok">✓ Imposte ' + a + ' registrate (documento ' + fatte.contabile + '): IRES ' + eur(fatte.ires) + ' · IRAP ' + eur(fatte.irap) + ' · imposte anticipate ' + eur(fatte.anticipate) + '.</p>' : '') + '<div class="lab-griglia">' +
        L.scheda('🧾', 'IRES — dal risultato al reddito imponibile', 'art. 83 TUIR · modello Redditi SC', L.tabella(['Voce', 'Importo›'], [['Risultato prima delle imposte ' + a, eur(c.risultato)]].concat(c.variazioniIres.map(rigaV))
            .concat([{cls: 'tot', celle: ['Reddito imponibile', eur(c.base)]}, ['IRES ' + c.aliquota + '%', '<b>' + eur(c.ires) + '</b>']]))) +
        L.scheda('🏭', 'IRAP — valore della produzione', 'art. 5 D.Lgs. 446/1997', L.tabella(['Voce', 'Importo›'], [['Risultato prima delle imposte', eur(c.risultato)]].concat(c.finanziari.map(function (v) { return [e('Si toglie l\'area finanziaria: ' + v[0]), (v[1] > 0 ? '+ ' : '− ') + eur(Math.abs(v[1]))]; }))
            .concat([{cls: 'tot', celle: ['Differenza tra valore e costi della produzione', eur(c.valoreProduzione)]}]).concat(c.variazioniIrap.map(rigaV))
            .concat([{cls: 'tot', celle: ['Base imponibile IRAP', eur(c.baseIrap)]}, ['IRAP ' + c.aliquotaIrap + '%', '<b>' + eur(c.irap) + '</b>']])) +
          '<p class="lab-nota">IRAP: niente proventi e oneri finanziari, niente imposte; i costi del personale a tempo indeterminato sono deducibili. L\'IRAP non si deduce dall\'IRES (le deduzioni previste sono per cassa e nel primo anno non spettano).</p>') + '</div>' +
        '<div class="lab-griglia">' + L.scheda('🔁', 'Differenze temporanee e imposte anticipate', 'OIC 25', L.tabella(['Cespite', 'Civilistico›', 'Massimo fiscale›', 'Deducibile›', 'Eccedenza a fine anno›'], c.fiscale.righe.map(function (x) {
            return [x.codice + (x.primoAnno ? ' (primo anno: coefficiente ' + x.coeff + '% a metà)' : '') + (x.ceduto ? ' — ceduto' : ''), eur(x.civile), eur(x.massimo), eur(x.deducibile), eur(x.eccedenzaFine)]; }), 'Nessun cespite.') +
          L.tabella(['Voce', 'Importo›'], [['Differenze temporanee a inizio anno', eur(c.differenzeTemporanee.inizio)], ['Differenze temporanee a fine anno', eur(c.differenzeTemporanee.fine)],
            ['Imposte anticipate (IRES ' + c.aliquota + '% + IRAP ' + c.aliquotaIrap + '%)', '<b>' + eur(c.anticipate) + '</b>'], {cls: 'tot', celle: ['Imposte a conto economico (correnti − anticipate)', eur(c.totaleImposte)]}, ['Utile netto', '<b>' + eur(c.utile) + '</b>']]) +
          '<p class="lab-nota">L\'ammortamento in bilancio oltre il limite fiscale si paga oggi ma si recupera domani: per questo si iscrive un credito (17) per le imposte che si pagheranno in meno negli anni successivi.</p>') +
        L.scheda('✍️', 'Registra le imposte', 'scrittura di fine anno', fatte ? '<p class="lab-vuoto">Già registrate.</p>' : L.modulo('ir', [['anno', 'Esercizio', 'text', a], ['aumenti', 'Altre variazioni in aumento €', 'num', d.au || ''], ['diminuzioni', 'Altre variazioni in diminuzione €', 'num', d.di || ''],
            ['aliquota', 'Aliquota IRES %', 'num', d.ai || 24], ['aliquotaIrap', 'Aliquota IRAP % (ordinaria 3,9; le regioni la variano)', 'num', d.ap || 3.9], ['data', 'Data', 'date', a + '-12-31']], [['ir', 'Registra IRES, IRAP e imposte anticipate'], ['pv', 'Ricalcola', 'sec']]) +
          '<p class="lab-nota">D 56 IRES / A 23 · D 52 IRAP / A 35 · D 17 Crediti per imposte anticipate / A 51. Saldo e acconti si versano con F24 entro il 30 giugno dell\'anno dopo.</p>') + '</div>' +
        L.scheda('📊', 'Conto economico ' + a + ' (prima delle imposte)', 'F.01 · CE', tabCE(ce));
      L.collega(radice, 'ir', {ir: CH.registraIres, pv: function (v) { d.au = v.aumenti || 0; d.di = v.diminuzioni || 0; d.ai = v.aliquota || 24; d.ap = v.aliquotaIrap || 3.9; return '<p class="lab-nota">Ricalcolato con le variazioni e le aliquote indicate.</p>'; }}, rendi);
    },
    chiusura: function () {
      var a = anno(), ch = (S().chiusure || {})[String(+a - 1)], ultima = Object.keys(S().chiusure || {}).sort().slice(-1)[0], vista = radice.dataset.v || (ultima && !(S().chiusure[ultima].riapertura) ? ultima : a);
      var c = CH.controlli(vista), ce = CH.contoEconomico(vista), sp = CH.statoPatrimoniale(vista + '-12-31'), chiuso = (S().chiusure || {})[vista];
      if (!chiuso && Math.abs(ce.risultato) > 0.004) { sp.passivo.push({conto: '→', nome: (ce.risultato >= 0 ? 'Utile' : 'Perdita') + ' dal conto economico (andrà al 32)', saldo: ce.risultato}); sp.totalePassivo = L.r2(sp.totalePassivo + ce.risultato); }
      radice.innerHTML = U.avviso(S()) + L.scheda('🔒', 'Chiusura dell\'esercizio ' + vista, 'FAGLGVTR · F.16 · epilogo', (chiuso ? '<p class="lab-esito ok">✓ Esercizio ' + vista + ' chiuso il ' + fd(chiuso.data) + ': ' + (chiuso.utile >= 0 ? 'utile ' : 'perdita ') + eur(Math.abs(chiuso.utile)) + ' € · documenti ' + [chiuso.epilogo, chiuso.risultato, chiuso.chiusuraSP].filter(Boolean).join(', ') + '. Non si registra più con data ' + vista + '.</p>'
          : (c.length ? '<div class="lab-esito ko"><b>Prima di chiudere:</b><ul class="lab-elenco">' + c.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul></div>' : '<p class="lab-esito ok">✓ Controlli superati: ammortamenti, liquidazioni IVA, IRES, magazzino.</p>') +
            L.modulo('ch', [['anno', 'Esercizio', 'text', vista], ['forza', 'Chiudi anche con avvertenze', 'select', 'no', [['no', 'no'], ['si', 'sì (sconsigliato)']]]], [['ch', 'Chiudi l\'esercizio', 'rosso']])) +
          '<ol class="lab-elenco"><li><b>Epilogo</b>: ogni costo (Dare) e ogni ricavo (Avere) si chiude nel Conto economico (90).</li><li><b>Risultato</b>: il saldo del 90 va al conto 32 Utile (o perdita) d\'esercizio.</li>' +
          '<li><b>Chiusura dei conti patrimoniali</b>: attività, passività e netto (compreso il 32) si chiudono nello Stato patrimoniale finale (91). Dopo, tutti i conti dell\'anno sono a zero.</li></ol>' +
          '<p class="lab-nota">Le partite aperte di clienti e fornitori non cambiano: il riporto dei saldi non crea nuove fatture. In SAP: riporto dei saldi FAGLGVTR e F.16.</p>') +
        L.scheda('📊', 'Conto economico ' + vista, 'CE', tabCE(ce)) + L.scheda('🏛️', 'Stato patrimoniale al 31/12/' + vista, 'SP', tabSP(sp));
      L.collega(radice, 'ch', {ch: CH.chiudi}, rendi);
    },
    riapertura: function () {
      var ch = S().chiusure || {}, k = Object.keys(ch).sort(), ultima = k.slice(-1)[0], nuovo = ultima ? String(+ultima + 1) : '';
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🔓', 'Riapertura dei conti', '1° gennaio · Stato patrimoniale iniziale', (ultima ? (ch[ultima].riapertura ? '<p class="lab-esito ok">✓ Esercizio ' + nuovo + ' riaperto (documento ' + ch[ultima].riapertura + ').</p>'
            : L.modulo('ra', [['anno', 'Nuovo esercizio', 'text', nuovo], ['data', 'Data di riapertura', 'date', nuovo + '-01-01']], [['ra', 'Riapri i conti']])) : '<p class="lab-vuoto">Prima chiudi un esercizio.</p>') +
          '<p class="lab-nota">Si riaprono le stesse attività, passività e voci di netto della chiusura, dallo Stato patrimoniale iniziale (92): D attività / A 92 · D 92 / A passività e netto. I costi e i ricavi ripartono da zero.</p>') +
        L.scheda('🏛️', 'Destinazione dell\'utile', 'delibera dell\'assemblea', L.modulo('du', [['legale', 'A riserva legale %', 'num', 5], ['data', 'Data della delibera', 'date']], [['du', 'Registra la destinazione']]) +
          '<p class="lab-nota">Entro 120 giorni dalla chiusura l\'assemblea approva il bilancio e decide: D 32 Utile / A 33 Riserva legale (almeno il 5%, finché non arriva a un quinto del capitale) / A 30 riserve. Facoltativo nell\'esercitazione.</p>') + '</div>' +
        (ultima && ch[ultima].riapertura ? L.scheda('🏛️', 'Stato patrimoniale di apertura ' + nuovo, 'SP', tabSP(CH.statoPatrimoniale(nuovo + '-01-01'))) : '');
      L.collega(radice, 'ra', {ra: CH.riapri}, rendi); L.collega(radice, 'du', {du: CH.destinaUtile}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.iva)(); }
  rendi();
})();
