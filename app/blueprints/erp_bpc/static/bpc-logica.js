/* SISTEMA INTEGRATO — Pianificazione SAP BPC (Business Planning and Consolidation) sopra il piano CO di S/4HANA.
   Ambiente FT_PLAN, modello COSTI_CENTRI; dimensioni CONTO (classi di costo), CENTRO (centri di costo CO), CATEGORIA
   (ACTUAL · BUDGET · FORECAST), VERSIONE, TEMPO (12 mesi dell'anno del piano).
   Data Manager: carica dal piano S/4 (KP06 v0), carica il consuntivo da S/4 (ACDOCA), copia versione (forecast n+12−n).
   Business Process Flow: ogni centro invia il budget, il controller approva o respinge; con tutti i centri approvati
   il budget si ritrasferisce in S/4 (retraction) e diventa la versione 0 di KP06. Nessuna scrittura FI. */
window.BPC4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; }, cp = function () { return window.PC4.cpm; };
  var CATEGORIE = {ACTUAL: 'Consuntivo (caricato da S/4)', BUDGET: 'Budget', FORECAST: 'Forecast'};
  var STATI = {aperto: 'Aperto', inviato: 'Inviato al controller', approvato: 'Approvato', respinto: 'Respinto: da rivedere'};
  var MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  function M() { return (S().costing || {}).bpc || null; }
  function richiesto() { var m = M(); if (!m) throw Error('Prima crea il modello BPC (Pianificazione BPC → Modello e versioni).'); return m; }
  function num(v, nome) {
    if (v === undefined || v === null || String(v).trim() === '') return 0;
    if (typeof v === 'string') { v = v.trim(); if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(v)) throw Error(nome + ': numero richiesto (virgola per i decimali).'); v = Number(v.replace(/\./g, '').replace(',', '.')); }
    if (!Number.isFinite(Number(v)) || Number(v) < 0) throw Error(nome + ': importo non negativo richiesto.');
    return Number(v);
  }
  var chiave = function (cat, ver, cdc, classe) { return [cat, ver, cdc, classe].join('|'); };
  function spalma(tot) { var parte = r2(tot / 12), out = []; for (var k = 0; k < 11; k++) out.push(parte); out.push(r2(tot - parte * 11)); return out; }
  function riga(cat, ver, cdc, classe) { return (richiesto().dati[chiave(cat, ver, cdc, classe)] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).slice(); }
  function totaleRiga(a) { return r2(a.reduce(function (t, x) { return t + x; }, 0)); }
  function statoDi(cdc) { var m = richiesto(); return (m.stato['BUDGET|V1|' + cdc] || {stato: 'aperto', storia: []}); }
  function log(testo) { richiesto().log.push({quando: new Date().toISOString(), testo: testo}); }

  // modello: nasce dal piano S/4 (KP06 versione 0), spalmato in 12 mesi uguali (chiave di distribuzione 1)
  function crea(i) {
    if (M()) throw Error('Il modello BPC esiste già.');
    if (!cp().attivo()) throw Error('Prima apri il piano CO in S/4 (CO → Centri, attività e classi di costo → passo 1).');
    if (String((i || {}).conferma) !== 'CREA') throw Error('Scrivi CREA per creare il modello di pianificazione.');
    var p = cp().prepara(), dati = {};
    cp().CDC.forEach(function (c) { var r = p.piano['0'][c.codice] || {};
      Object.keys(r).forEach(function (k) { if (r[k]) dati[chiave('BUDGET', 'V1', c.codice, k)] = spalma(r[k]); }); });
    S().costing.bpc = {ambiente: 'FT_PLAN', modello: 'COSTI_CENTRI', anno: p.anno, versioni: {ACTUAL: ['A'], BUDGET: ['V1'], FORECAST: []}, dati: dati, stato: {}, log: [], retract: []};
    log('Modello creato dal piano S/4 KP06 versione 0, revisione ' + p.revisione);
    N().salva();
    return '<p class="lab-nota">Ambiente FT_PLAN · modello COSTI_CENTRI ' + p.anno + ' creato. Il BUDGET V1 parte dal piano di S/4 (KP06 versione 0) diviso in 12 mesi. Ora ogni centro lo rivede nel modulo di inserimento.</p>';
  }
  function bloccato(cat, ver, cdc) {
    if (cat === 'ACTUAL') return 'Il consuntivo non si scrive a mano: si carica da S/4 (Data Manager).';
    if (cat === 'BUDGET' && ver === 'V1') { var st = statoDi(cdc).stato; if (st === 'inviato' || st === 'approvato') return 'Centro ' + cdc + ' ' + STATI[st].toLowerCase() + ': il budget è bloccato (work status). Per cambiarlo il controller deve respingerlo.'; }
    return '';
  }
  // modulo di inserimento EPM: una riga per classe, 12 mesi
  function salvaInput(i) {
    var m = richiesto(), cat = i.categoria, ver = i.versione, cdc = String(i.cdc || '');
    if (!CATEGORIE[cat] || (m.versioni[cat] || []).indexOf(ver) < 0) throw Error('Categoria o versione inesistente.');
    if (!cp().cdcDi(cdc)) throw Error('Centro inesistente.');
    var b = bloccato(cat, ver, cdc); if (b) throw Error(b);
    cp().CLASSI.forEach(function (c) {
      var a = [];
      for (var k = 1; k <= 12; k++) a.push(r2(num(i['m' + c[0] + '_' + k], c[0] + ' ' + MESI[k - 1])));
      if (a.some(function (x) { return x; })) m.dati[chiave(cat, ver, cdc, c[0])] = a; else delete m.dati[chiave(cat, ver, cdc, c[0])];
    });
    log('Input ' + cat + ' ' + ver + ' centro ' + cdc); N().salva();
    return '<p class="lab-nota">Dati salvati nel modello: ' + cat + ' ' + ver + ' · centro ' + cdc + '. Totale annuo ' + L.eur(cp().CLASSI.reduce(function (t, c) { return t + totaleRiga(riga(cat, ver, cdc, c[0])); }, 0)) + ' €.</p>';
  }
  // Data Manager: consuntivo mensile da S/4 (ACDOCA), mese per mese fino al mese indicato
  function caricaActual(i) {
    var m = richiesto(), fino = Math.round(num(i.mese, 'Mese'));
    if (fino < 1 || fino > 12) throw Error('Mese da 1 a 12.');
    var prec = {}, nuove = {};
    for (var k = 1; k <= fino; k++) {
      var cum = cp().effettivi(m.anno, k).perCentro;
      Object.keys(cum).forEach(function (cdc) { Object.keys(cum[cdc]).forEach(function (cl) {
        var key = chiave('ACTUAL', 'A', cdc, cl), prima = (prec[cdc] || {})[cl] || 0;
        (nuove[key] = nuove[key] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])[k - 1] = r2(cum[cdc][cl] - prima); }); });
      prec = cum;
    }
    Object.keys(m.dati).forEach(function (key) { if (key.indexOf('ACTUAL|') === 0) delete m.dati[key]; });
    Object.keys(nuove).forEach(function (key) { m.dati[key] = nuove[key]; });
    m.actualFino = fino; log('Caricato il consuntivo da S/4 fino al mese ' + fino); N().salva();
    return '<p class="lab-nota">Consuntivo caricato da S/4 (righe del libro giornale con centro o OKB9) da gennaio a ' + MESI[fino - 1] + ' ' + m.anno + '.</p>';
  }
  // Data Manager: copia una versione; per il forecast i mesi già chiusi prendono il consuntivo (es. 9+3)
  function copia(i) {
    var m = richiesto(), dest = String(i.destinazione || '').trim().toUpperCase(), mesiAct = Math.round(num(i.mesiActual, 'Mesi a consuntivo'));
    if (!/^F\d{1,2}$/.test(dest)) throw Error('Nome della versione di forecast: F seguito da un numero (es. F1).');
    if (mesiAct > (m.actualFino || 0)) throw Error('Il consuntivo è caricato solo fino al mese ' + (m.actualFino || 0) + ': prima caricalo (Data Manager).');
    if (m.versioni.FORECAST.indexOf(dest) < 0) m.versioni.FORECAST.push(dest);
    cp().CDC.forEach(function (c) { cp().CLASSI.forEach(function (cl) {
      var b = riga('BUDGET', 'V1', c.codice, cl[0]), a = riga('ACTUAL', 'A', c.codice, cl[0]), f = b.map(function (x, k) { return k < mesiAct ? a[k] : x; });
      if (f.some(function (x) { return x; })) m.dati[chiave('FORECAST', dest, c.codice, cl[0])] = f; else delete m.dati[chiave('FORECAST', dest, c.codice, cl[0])]; }); });
    log('Forecast ' + dest + ': ' + mesiAct + ' mesi a consuntivo + ' + (12 - mesiAct) + ' a budget'); N().salva();
    return '<p class="lab-nota">Forecast ' + dest + ' = ' + mesiAct + ' mesi di consuntivo + ' + (12 - mesiAct) + ' mesi di budget (' + mesiAct + '+' + (12 - mesiAct) + '). Ora puoi correggerlo nel modulo di inserimento.</p>';
  }
  // Business Process Flow e work status
  function azione(i) {
    var m = richiesto(), cdc = String(i.cdc || ''), a = i.azione, st = statoDi(cdc), nota = String(i.nota || '').trim();
    if (!cp().cdcDi(cdc)) throw Error('Centro inesistente.');
    var da = st.stato, a2;
    if (a === 'invia') { if (da === 'inviato' || da === 'approvato') throw Error('Il budget del centro ' + cdc + ' è già ' + STATI[da].toLowerCase() + '.'); a2 = 'inviato'; }
    else if (a === 'approva') { if (da !== 'inviato') throw Error('Il controller approva solo un budget inviato dal responsabile del centro.'); a2 = 'approvato'; }
    else if (a === 'respingi') { if (da !== 'inviato' && da !== 'approvato') throw Error('Si respinge un budget inviato o approvato.'); if (!nota) throw Error('Scrivi il motivo: il responsabile del centro deve sapere che cosa correggere.'); a2 = 'respinto'; }
    else throw Error('Azione non valida.');
    m.stato['BUDGET|V1|' + cdc] = {stato: a2, storia: (st.storia || []).concat([{da: da, a: a2, nota: nota, chi: a === 'invia' ? 'responsabile del centro' : 'controller', quando: new Date().toISOString()}])};
    log('Centro ' + cdc + ': ' + STATI[da] + ' → ' + STATI[a2]); N().salva();
    return '<p class="lab-nota">Centro ' + cdc + ': ' + STATI[a2] + '.</p>';
  }
  // retraction: BPC → S/4 KP06 versione 0
  function ritrasferisci(i) {
    var m = richiesto();
    var mancanti = cp().CDC.filter(function (c) { return statoDi(c.codice).stato !== 'approvato'; }).map(function (c) { return c.codice; });
    if (mancanti.length) throw Error('Prima tutti i centri devono essere approvati. Mancano: ' + mancanti.join(', ') + '.');
    if (String(i.conferma) !== 'TRASFERISCI') throw Error('Scrivi TRASFERISCI: il budget approvato sostituisce il piano KP06 versione 0 e cambia le tariffe.');
    var piano = {};
    cp().CDC.forEach(function (c) { piano[c.codice] = {}; cp().CLASSI.forEach(function (cl) { var t = totaleRiga(riga('BUDGET', 'V1', c.codice, cl[0])); if (t) piano[c.codice][cl[0]] = t; }); });
    var out = cp().retract(piano, 'Budget BPC approvato ritrasferito in S/4 (KP06 versione 0).');
    m.retract.push({quando: new Date().toISOString(), revisione: cp().modello().revisione});
    log('Retraction in S/4: revisione del piano ' + cp().modello().revisione); N().salva();
    return out;
  }
  function report(i) {
    var m = richiesto(), fino = Math.max(1, Math.min(12, Math.round(num((i || {}).mese || m.actualFino || 12, 'Mese')))), fc = (i || {}).forecast || m.versioni.FORECAST[m.versioni.FORECAST.length - 1];
    return cp().CDC.map(function (c) {
      var x = {cdc: c.codice, nome: c.nome, budget: 0, budgetYTD: 0, actualYTD: 0, forecast: 0, stato: statoDi(c.codice).stato};
      cp().CLASSI.forEach(function (cl) {
        var b = riga('BUDGET', 'V1', c.codice, cl[0]), a = riga('ACTUAL', 'A', c.codice, cl[0]);
        x.budget += totaleRiga(b); x.budgetYTD += totaleRiga(b.slice(0, fino)); x.actualYTD += totaleRiga(a.slice(0, fino));
        if (fc) x.forecast += totaleRiga(riga('FORECAST', fc, c.codice, cl[0]));
      });
      ['budget', 'budgetYTD', 'actualYTD', 'forecast'].forEach(function (k) { x[k] = r2(x[k]); });
      x.scostamentoYTD = r2(x.actualYTD - x.budgetYTD); x.percentuale = x.budgetYTD ? x.scostamentoYTD / x.budgetYTD * 100 : null;
      return x;
    });
  }
  return {M: M, crea: crea, salvaInput: salvaInput, caricaActual: caricaActual, copia: copia, azione: azione, ritrasferisci: ritrasferisci, report: report,
    riga: riga, totaleRiga: totaleRiga, statoDi: statoDi, bloccato: bloccato, spalma: spalma, CATEGORIE: CATEGORIE, STATI: STATI, MESI: MESI};
})();
