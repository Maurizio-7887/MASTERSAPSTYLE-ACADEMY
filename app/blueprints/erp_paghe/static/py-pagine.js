/* SISTEMA INTEGRATO — Paghe: dipendenti e parametri, presenze e calcolo del cedolino, registrazione, pagamento e F24. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, PY = window.PY4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, r2 = L.r2, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; }, H = PY.H;
  var periodi = function () { var p = {}; H().cedolini.forEach(function (c) { p[c.periodo] = 1; }); return Object.keys(p).sort(); };
  var PAGINE = {
    dipendenti: function () {
      var p = H().parametri;
      radice.innerHTML = U.avviso(S()) + L.scheda('👷', 'Dipendenti', 'PA30 · infotipi 0001 / 0008', L.tabella(['Matricola', 'Nome', 'Mansione', 'Inquadramento', 'Centro di costo', 'Retribuzione mensile›', 'Rata addizionali anno prec. (storico)›', 'Contratto'], H().dipendenti.map(function (d) {
          return [d.matricola, e(d.nome), e(d.mansione), e(d.livello), d.cdc + ' ' + e(d.cdcNome), eur(d.lordo), eur(d.addizionali), d.tempo]; })) + '<p class="lab-nota">Persone e importi di fantasia, a scopo didattico.</p>') +
        '<div class="lab-griglia">' + L.scheda('⚙️', 'Parametri contributivi', 'tabelle T5ITxx (didattiche)', L.modulo('pa', [['inpsDip', 'INPS a carico dipendente %', 'num', p.inpsDip], ['inpsDitta', 'INPS a carico ditta %', 'num', p.inpsDitta], ['inail', 'INAIL %', 'num', p.inail]], [['pa', 'Salva parametri']]) +
          '<p class="lab-nota">Le aliquote ditta e INAIL dipendono da settore, dimensione e rischio: qui sono indicative.</p>') +
        L.scheda('🧮', 'Regole fiscali 2026 usate nel calcolo', 'IRPEF · TUIR', '<ul class="lab-elenco"><li>IRPEF: 23% fino a 28.000 € · 33% da 28.000 a 50.000 € · 43% oltre (Legge di bilancio 2026).</li><li>Detrazioni lavoro dipendente (art. 13 TUIR): 1.955 € fino a 15.000; 1.910 + 1.190 × (28.000 − R)/13.000 fino a 28.000; 1.910 × (50.000 − R)/22.000 fino a 50.000; +65 € tra 25.000 e 35.000.</li>' +
          '<li>Cuneo fiscale (semplificato): fino a 20.000 € somma esente in % del reddito; 20.000–32.000 ulteriore detrazione di 1.000 €; 32.000–40.000 a scalare.</li><li>Metodo mensile: imposta sull\'imponibile × 12 ÷ 12; detrazioni sul reddito annuo presunto (13 mensilità) ÷ 12; conguaglio a dicembre.</li><li>TFR: retribuzione ÷ 13,5 − 0,50% di contributo aggiuntivo all\'INPS.</li></ul>') + '</div>';
      L.collega(radice, 'pa', {pa: PY.parametri}, rendi);
    },
    cedolino: function () {
      var per = radice.dataset.per || periodi().slice(-1)[0] || '2027-06', cs = H().cedolini.filter(function (c) { return c.periodo === per; }), sel = cs.find(function (c) { return c.matricola === radice.dataset.mat; }) || cs[0];
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia no-stampa">' +
        L.scheda('🕒', 'Presenze del mese', 'PA61 · infotipo 2010', L.modulo('pr', [['matricola', 'Dipendente', 'select', '00001', H().dipendenti.map(function (d) { return [d.matricola, d.matricola + ' ' + d.nome]; })], ['periodo', 'Periodo (AAAA-MM)', 'text', per], ['straordinari', 'Ore di straordinario (+25%)', 'num'], ['assenze', 'Ore di assenza non retribuita', 'num'], ['ferie', 'Giorni di ferie godute', 'num'], ['rol', 'Ore di permesso ROL godute', 'num']], [['pr', 'Salva presenze']])) +
        L.scheda('▶️', 'Calcolo della paga', 'PC00_M15_CALC', L.modulo('ca', [['periodo', 'Periodo (AAAA-MM)', 'text', per]], [['ca', 'Calcola i cedolini']]) + '<p class="lab-nota">Si può ricalcolare finché la paga non è registrata in contabilità.</p>') + '</div>' +
        (cs.length ? '<div class="lab-filtro no-stampa"><label>Cedolino di <select id="mat">' + cs.map(function (c) { return '<option value="' + c.matricola + '"' + (c === sel ? ' selected' : '') + '>' + c.matricola + ' ' + e(c.nome) + '</option>'; }).join('') + '</select></label> <button type="button" class="lab-btn" id="stampa">🖨️ Stampa il cedolino</button></div>' +
          L.scheda('🧾', 'CEDOLINO PAGA · ' + per + ' · ' + e(sel.nome), 'PC00_M15_CEDT · Ferro & Transenne S.r.l. (didattica)', '<p>Matricola ' + sel.matricola + ' · centro di costo ' + sel.cdc + ' ' + e(sel.cdcNome) + ' · cedolino n. ' + sel.numero + '</p>' +
            L.tabella(['Voce', 'Base›', 'Competenze›', 'Trattenute›'], [
              ['Retribuzione mensile', '', eur(sel.base), ''], ['Straordinario +25%', sel.oreStraord ? n0(sel.oreStraord) + ' h' : '', sel.straordinari ? eur(sel.straordinari) : '', ''], ['Assenze non retribuite', '', '', sel.assenze ? eur(sel.assenze) : '']].concat(
              sel.ratei && sel.ratei.ferieMese ? [['Ferie godute (retribuite)', n0(sel.ratei.ferieMese) + ' gg', 'compreso', '']] : [], sel.ratei && sel.ratei.rolMese ? [['Permessi ROL goduti (retribuiti)', n0(sel.ratei.rolMese) + ' h', 'compreso', '']] : [],
              sel.tredicesima ? [['Tredicesima mensilità (12/12)', '', eur(sel.tredicesima), '']] : []).concat([
              {cls: 'tot', celle: ['Totale lordo', '', eur(sel.lordo), '']},
              ['Contributi INPS c/dipendente ' + n0(H().parametri.inpsDip) + '%', eur(sel.lordo), '', eur(sel.inpsDip)],
              ['Imponibile fiscale', eur(sel.imponibileFiscale), '', ''], ['IRPEF lorda', '', '', eur(sel.irpefLorda)], ['Detrazioni lavoro dipendente', '', eur(sel.detrazioni), ''], ['Ulteriore detrazione (cuneo fiscale)', '', eur(sel.ulterioreDetrazione), ''],
              ['IRPEF netta del mese', '', '', eur(sel.irpefOrdinaria != null ? sel.irpefOrdinaria : sel.irpef)]].concat(
              sel.tredicesima ? [['IRPEF sulla tredicesima (aliquota marginale)', '', '', eur(sel.irpef13)]] : [],
              sel.conguaglioDettaglio ? [[sel.conguaglio >= 0 ? 'Conguaglio IRPEF di fine anno: da trattenere' : 'Conguaglio IRPEF di fine anno: rimborso', '', sel.conguaglio < 0 ? eur(-sel.conguaglio) : '', sel.conguaglio >= 0 ? eur(sel.conguaglio) : '']] : [],
              (sel.addizionaliRate && sel.addizionaliRate.regionale + sel.addizionaliRate.storico ? [['Addizionale regionale ' + sel.addizionaliRate.anno + ' (rata, cod. 3802)', '', '', eur(r2(sel.addizionaliRate.regionale + sel.addizionaliRate.storico))]] : []),
              (sel.addizionaliRate && sel.addizionaliRate.comunale ? [['Addizionale comunale ' + sel.addizionaliRate.anno + ' saldo (rata, cod. 3848)', '', '', eur(sel.addizionaliRate.comunale)]] : []),
              (sel.addizionaliRate && sel.addizionaliRate.acconto ? [['Addizionale comunale ' + (sel.addizionaliRate.anno + 1) + ' acconto (rata, cod. 3847)', '', '', eur(sel.addizionaliRate.acconto)]] : []),
              (sel.addizionali ? [] : [['Addizionali regionale e comunale', '', '', 'nessuna rata nel mese']]),
              [
              {cls: 'tot', celle: ['NETTO IN BUSTA', '', '<b>' + eur(sel.netto) + '</b>', '']}]))) +
            (sel.ratei ? '<div class="lab-griglia">' + L.tabella(['Ferie e permessi', 'Ferie (gg)›', 'ROL (h)›'], [['Residuo anno precedente', n0(sel.ratei.ferieAP), n0(sel.ratei.rolAP)], ['Maturato nell\'anno (' + sel.ratei.mesi + '/12)', n0(sel.ratei.ferieMaturate), n0(sel.ratei.rolMaturati)], ['Goduto nell\'anno', n0(sel.ratei.ferieGodute), n0(sel.ratei.rolGoduti)], {cls: 'tot', celle: ['Residuo', n0(sel.ratei.ferieResidue), n0(sel.ratei.rolResidui)]}]) +
              L.tabella(['Ratei e progressivi dell\'anno', 'Importo›'], [['Rateo di tredicesima maturato (' + sel.ratei.mesi + '/12)', eur(sel.ratei.tredicesima)], ['Imponibile previdenziale progressivo', eur(sel.progressivi.imponibileInps)], ['Imponibile fiscale progressivo', eur(sel.progressivi.imponibileFiscale)], ['IRPEF trattenuta progressiva', eur(sel.progressivi.irpef)], ['TFR maturato nell\'anno', eur(sel.progressivi.tfr)]]) + '</div>' +
              (sel.progressivi.storico ? '<p class="lab-nota">I progressivi comprendono ' + sel.progressivi.storico + ' mesi elaborati prima dell\'avvio delle paghe nel sistema (storico a paga base).</p>' : '') : '') +
            (sel.addizionaliAnno ? L.tabella(['Addizionali IRPEF ' + sel.periodo.slice(0, 4) + ' determinate al conguaglio', 'Importo›'], [['Imponibile IRPEF dell\'anno', eur(sel.addizionaliAnno.imponibile)], ['Addizionale regionale ' + e(sel.addizionaliAnno.regione) + ' (a scaglioni)', eur(sel.addizionaliAnno.regionale)], ['Addizionale comunale ' + e(sel.addizionaliAnno.comune) + ' ' + n0(H().parametri.addComunale) + '% (esente fino a ' + eur(H().parametri.esenzioneComunale) + ' €)', eur(sel.addizionaliAnno.comunale)], ['meno acconto comunale già trattenuto', eur(sel.addizionaliAnno.accontoTrattenuto)],
              {cls: 'tot', celle: ['Da trattenere nel ' + (+sel.periodo.slice(0, 4) + 1) + ': 11 rate gen–nov (regionale + saldo comunale)', eur(r2(sel.addizionaliAnno.regionale + sel.addizionaliAnno.saldoComunale))]}, ['Acconto comunale ' + (+sel.periodo.slice(0, 4) + 1) + ' (30%, 9 rate mar–nov)', eur(sel.addizionaliAnno.accontoProssimo)]]) +
              '<p class="lab-nota">Le addizionali dell\'anno non si trattengono a dicembre e non sono un debito dell\'azienda al 31/12: si trattengono a rate sulle buste paga dell\'anno dopo e si versano con l\'F24 del mese successivo a ogni rata.</p>' : '') +
            (sel.conguaglioDettaglio ? L.tabella(['Conguaglio IRPEF di fine anno', 'Importo›'], [['Reddito di lavoro dell\'anno (imponibile)', eur(sel.conguaglioDettaglio.reddito)], ['Somma esente cuneo fiscale', eur(sel.conguaglioDettaglio.sommaEsente)], ['IRPEF lorda sull\'anno', eur(sel.conguaglioDettaglio.lorda)], ['Detrazioni lavoro dipendente (anno)', eur(sel.conguaglioDettaglio.detrazioni)], ['Ulteriore detrazione cuneo (anno)', eur(sel.conguaglioDettaglio.ulteriore)], ['IRPEF dovuta', eur(sel.conguaglioDettaglio.dovuta)], ['IRPEF già trattenuta (gen–dic)', eur(sel.conguaglioDettaglio.trattenuta)], {cls: 'tot', celle: [sel.conguaglio >= 0 ? 'Conguaglio a debito (trattenuto)' : 'Conguaglio a credito (rimborsato)', eur(Math.abs(sel.conguaglio))]}]) : '') +
            L.tabella(['A carico dell\'azienda', 'Importo›'], [['INPS c/ditta ' + n0(H().parametri.inpsDitta) + '%', eur(sel.inpsDitta)], ['INAIL ' + n0(H().parametri.inail) + '%', eur(sel.inail)], ['Quota TFR (lordo ÷ 13,5)', eur(sel.tfrLordo)], ['di cui contributo 0,50% all\'INPS', eur(sel.tfrContributo)], {cls: 'tot', celle: ['Costo azienda del mese', eur(sel.costo)]}]) +
            '<p class="lab-nota">Reddito annuo presunto (13 mensilità): ' + eur(sel.redditoAnnuoPresunto) + ' €. A dicembre: tredicesima e conguaglio IRPEF sull\'imponibile reale dell\'anno.</p>') +
          L.scheda('📋', 'Riepilogo del mese', 'PC00_M99_CWTR', L.tabella(['Dipendente', 'Lordo›', 'INPS dip.›', 'IRPEF›', 'Addiz.›', 'Netto›', 'INPS ditta›', 'INAIL›', 'TFR›', 'Costo›'], cs.map(function (c) {
            return [e(c.nome), eur(c.lordo), eur(c.inpsDip), eur(c.irpef), eur(c.addizionali), eur(c.netto), eur(c.inpsDitta), eur(c.inail), eur(c.tfrLordo), eur(c.costo)]; }))) : '');
      L.collega(radice, 'pr', {pr: PY.presenze}, rendi);
      L.collega(radice, 'ca', {ca: function (v) { var r = PY.calcola(v); radice.dataset.per = v.periodo; return r; }}, rendi);
      var m = radice.querySelector('#mat'); if (m) m.onchange = function () { radice.dataset.mat = this.value; rendi(); };
      var b = radice.querySelector('#stampa'); if (b) b.onclick = function () { window.print(); };
    },
    contabilita: function () {
      var per = periodi().slice(-1)[0] || '2027-06', reg = H().registrati;
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('📒', '1 · Registrazione in contabilità', 'PC00_M99_CIPE', L.modulo('rg', [['periodo', 'Periodo', 'text', per], ['data', 'Data', 'date']], [['rg', 'Registra la paga']]) + '<p class="lab-nota">D 80 retribuzioni · D 81 INPS ditta e INAIL · D 82 TFR (per centro di costo) / A 27 netti · A 28 INPS · A 24 INAIL · A 29 Erario · A 31 Fondo TFR.</p>') +
        L.scheda('🏦', '2 · Pagamento degli stipendi', 'bonifici · F110 dipendenti', L.modulo('pn', [['periodo', 'Periodo', 'text', per], ['data', 'Data', 'date']], [['pn', 'Paga i netti']]) + '<p class="lab-nota">D 27 / A 10.</p>') +
        L.scheda('🧾', '3 · Versamento F24', 'entro il 16 del mese dopo', L.modulo('f2', [['periodo', 'Periodo', 'text', per], ['data', 'Data di versamento', 'date']], [['f2', 'Registra l\'F24']]) + '<p class="lab-nota">Erario (codice tributo 1001 e addizionali) e INPS (contributi DM10): D 29 · D 28 / A 10. L\'INAIL si paga con l\'autoliquidazione annuale.</p>') + '</div>' +
        L.scheda('📋', 'Paghe registrate', '', L.tabella(['Periodo', 'Registrata', 'Netti›', 'Pagati il', 'F24›', 'Scadenza F24', 'Versato il'], reg.map(function (x) { return [x.periodo, fd(x.data) + ' (doc. ' + x.contabile + ')', eur(x.netti), x.pagato ? fd(x.pagato) : '—', eur(x.f24Importo), fd(x.scadenzaF24), x.f24 ? fd(x.f24) : '—']; }), 'Nessuna.')) +
        L.scheda('🏷️', 'Costo del personale per centro di costo', 'KSB1 · CO', L.tabella(['Centro', 'Retribuzioni›', 'Oneri sociali›', 'TFR›', 'Totale›'], PY.costoPerCentro().map(function (o) { return [o.cdc + ' ' + e(o.nome), eur(o.retribuzioni), eur(o.oneri), eur(o.tfr), '<b>' + eur(o.totale) + '</b>']; }), 'Nessuna paga registrata.') +
          '<p class="lab-nota">Ogni riga di costo porta il centro di costo del dipendente: magazzino, produzione e amministrazione vedono il loro costo del personale.</p>');
      L.collega(radice, 'rg', {rg: PY.registra}, rendi); L.collega(radice, 'pn', {pn: PY.pagaNetti}, rendi); L.collega(radice, 'f2', {f2: PY.f24}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.dipendenti)(); }
  rendi();
})();
