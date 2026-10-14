/* Laboratorio «Produzione ripetitiva» (modello trattore) — logica senza interfaccia, provata da tests/laboratori.js.
   Niente ordini di produzione: budget annuo → piano mensile per linea → versione di produzione (Linea L1) →
   collettore costi di prodotto per materiale (KKF6N, sempre aperto) → conferma a consuntivo MFBF con backflush a standard,
   eventuale punto di conteggio Piegatura → fine mese: WIP al target, varianze di periodo (KKS6), liquidazione (KK87). */
window.REM = (function () {
  'use strict';
  var L = window.LabMotore, M = null;
  var LINEA = 'L1 — Linea transenne (taglio → piegatura → saldatura)';
  function nuovo(S) { S.budget = null; S.versioni = {}; S.collettori = {}; }
  function avvia(chiave) { M = L.crea({chiave: chiave, tipo: 'rem', nuovo: nuovo}); return M; }
  var S = function () { return M.S; };
  var coll = function (mat) { var c = S().collettori[mat]; if (!c) throw Error('Manca il collettore costi di ' + mat + ' (KKF6N).'); return c; };

  function budget(i) {
    var anno = String(i.anno || '').trim();
    if (!/^\d{4}$/.test(anno)) throw Error('Anno di budget: 4 cifre.');
    var q = {}; L.FINITI.forEach(function (m) { q[m] = Math.round(L.num(i[m], 'Budget ' + m, 0)); });
    var tot = L.FINITI.reduce(function (t, m) { return t + q[m]; }, 0);
    if (!tot) throw Error('Budget a zero.');
    var piano = {}; L.FINITI.forEach(function (m) { piano[m] = Math.round(q[m] / 12); });
    S().budget = {anno: anno, quantita: q, totale: tot, pianoMensile: piano};
    M.salva();
    return '<p class="lab-nota">Budget ' + anno + ': ' + L.n0(tot) + ' transenne. Piano mensile della linea (un dodicesimo): ' +
      L.FINITI.map(function (m) { return m + ' ' + piano[m]; }).join(' · ') + ' pz. Nessuna scrittura: è pianificazione.</p>';
  }
  function versione(i) {
    var mat = i.mat; if (L.FINITI.indexOf(mat) < 0) throw Error('Scegli una transenna.');
    if (!S().budget) throw Error('Prima il budget: la versione di produzione serve a pianificare la linea.');
    S().versioni[mat] = {linea: LINEA, rem: true, distinta: 'esplosa fino al ferro (semilavorati fantasma in linea)', puntoConteggio: 'Piegatura'};
    M.salva();
    return '<p class="lab-nota">Versione di produzione 0001 di ' + mat + ' sulla ' + LINEA + ', profilo REM attivo, punto di conteggio dopo la Piegatura.</p>';
  }
  function collettore(i) {
    var mat = i.mat; if (!S().versioni[mat]) throw Error('Prima la versione di produzione di ' + mat + '.');
    if (S().collettori[mat]) throw Error('Il collettore di ' + mat + ' esiste già: in produzione ripetitiva resta aperto per sempre.');
    S().collettori[mat] = {id: 'PCC-' + mat, mat: mat, aperto: L.fd(i.data || ''), wipPz: 0, wip: 0, periodi: [], eventi: []};
    M.salva();
    return '<p class="lab-nota">Collettore costi di prodotto <b>PCC-' + mat + '</b> creato. Non si chiude mai: raccoglie i costi di ' + mat + ' mese per mese.</p>';
  }
  var stdFinoPunto = function (mat) { return L.costoStd('SL-PIEGA'); };   // il punto di conteggio è dopo la piegatura: tutte le transenne hanno lo stesso telaio

  // MFBF: conferma a consuntivo con backflush. modo: 'completa' | 'punto' (fino alla Piegatura) | 'dalPunto' | 'scarto'
  function mfbf(i) {
    var mat = i.mat, c = coll(mat), data = M.controllaData(i.data), q = L.num(i.qta, 'Quantità', 1), modo = i.modo || 'completa';
    var ferroKg = 0, ore = {}, output = 0, desc;
    var tutto = L.esplodi(mat, q), telaio = L.esplodi('SL-PIEGA', q);
    if (modo === 'punto') { ferroKg = telaio.ferro; ore = telaio.ore; desc = 'fino al punto di conteggio Piegatura (WIP)'; }
    else if (modo === 'dalPunto') {
      if (c.wipPz < q - 1e-9) throw Error('Al punto di conteggio ci sono solo ' + c.wipPz + ' pz di ' + mat + '.');
      ferroKg = tutto.ferro - telaio.ferro; Object.keys(tutto.ore).forEach(function (k) { var d = tutto.ore[k] - (telaio.ore[k] || 0); if (d > 1e-9) ore[k] = d; });
      output = q; desc = 'dal punto di conteggio Piegatura al prodotto finito';
    } else if (modo === 'scarto') { ferroKg = tutto.ferro; ore = tutto.ore; desc = 'SCARTO: consumi e lavorazioni senza prodotto buono'; }
    else { ferroKg = tutto.ferro; ore = tutto.ore; output = q; desc = 'conferma completa'; }
    if (ferroKg > 0) M.movimento('FERRO', -ferroKg, data, '261-REM', c.id);
    var oreTot = Object.keys(ore).reduce(function (t, k) { return t + ore[k]; }, 0);
    var vFerro = L.r2(ferroKg * L.MATERIALI.FERRO.prezzo), vOre = L.r2(oreTot * L.TARIFFA), vOut = L.r2(output * L.costoStd(mat));
    if (output) M.movimento(mat, output, data, '131-REM', c.id);
    if (modo === 'punto') c.wipPz += q; if (modo === 'dalPunto') c.wipPz -= q;
    var ev = {data: data, modo: modo, qta: q, ferroKg: ferroKg, ore: oreTot, oreCentro: ore, debito: L.r2(vFerro + vOre), output: vOut};
    c.eventi.push(ev);
    var righe = [];
    if (vFerro) righe.push({conto: '70', dareAvere: 'DARE', importo: vFerro, oggetto: c.id}, {conto: '12', dareAvere: 'AVERE', importo: vFerro});
    if (vOre) righe.push({conto: '72', dareAvere: 'DARE', importo: vOre, oggetto: c.id}, {conto: '75', dareAvere: 'AVERE', importo: vOre, oggetto: 'Linea L1'});
    if (vOut) righe.push({conto: '13', dareAvere: 'DARE', importo: vOut}, {conto: '73', dareAvere: 'AVERE', importo: vOut, oggetto: c.id});
    var r = M.post({data: data, tipo: 'MFBF', rif: c.id, descrizione: 'MFBF ' + mat + ' × ' + q + ' — ' + desc + ' (backflush: ferro ' + L.n0(ferroKg) + ' kg, ' + L.n0(oreTot) + ' h a standard)', righe: righe});
    M.salva(); return r;
  }
  function prelievoExtra(i) {
    var c = coll(i.mat), data = M.controllaData(i.data), kg = L.num(i.kg, 'Kg', 0.01), motivo = String(i.motivo || '').trim() || 'scarto rilevato';
    M.movimento('FERRO', -kg, data, '261-PCC', c.id);
    var v = L.r2(kg * L.MATERIALI.FERRO.prezzo);
    c.eventi.push({data: data, modo: 'extra', qta: 0, ferroKg: kg, ore: 0, debito: v, output: 0, motivo: motivo});
    var r = M.post({data: data, tipo: 'MB1A_PCC', rif: c.id, descrizione: 'Prelievo extra ' + L.n0(kg) + ' kg ferro al collettore ' + c.id + ' — ' + motivo,
      righe: [{conto: '70', dareAvere: 'DARE', importo: v, oggetto: c.id}, {conto: '12', dareAvere: 'AVERE', importo: v}]});
    M.salva(); return r;
  }
  function chiusura(i) {
    var periodo = String(i.periodo || '');
    if (!/^\d{4}-\d{2}$/.test(periodo)) throw Error('Periodo nel formato AAAA-MM.');
    var s = S(), fine = L.fineMese(periodo), inizio = periodo + '-01';
    if (s.periodi.some(function (p) { return p.periodo === periodo; })) throw Error('Periodo ' + periodo + ' già chiuso.');
    var prec = s.periodi.map(function (p) { return p.periodo; }).sort().pop();
    if (prec && periodo <= prec) throw Error('Chiudi i periodi in ordine: l\'ultimo chiuso è ' + prec + '.');
    if (!Object.keys(s.collettori).length) throw Error('Nessun collettore costi.');
    var regs = [], righe = [];
    Object.keys(s.collettori).forEach(function (mat) {
      var c = s.collettori[mat], ev = c.eventi.filter(function (e) { return e.data >= inizio && e.data <= fine; });
      var debito = L.r2(ev.reduce(function (t, e) { return t + e.debito; }, 0)), output = L.r2(ev.reduce(function (t, e) { return t + e.output; }, 0));
      var qta = ev.filter(function (e) { return e.output; }).reduce(function (t, e) { return t + e.qta; }, 0);
      var wipNuovo = L.r2(c.wipPz * stdFinoPunto(mat)), deltaWip = L.r2(wipNuovo - c.wip);
      if (Math.abs(deltaWip) >= 0.005) regs.push(M.post({data: fine, tipo: 'REM_WIP', rif: c.id, descrizione: 'WIP al target ' + c.id + ': ' + c.wipPz + ' pz al punto di conteggio × ' + L.eur(stdFinoPunto(mat)) + ' — fine ' + periodo,
        righe: [{conto: '15', dareAvere: 'DARE', importo: deltaWip}, {conto: '74', dareAvere: 'AVERE', importo: deltaWip}]}));
      var varianza = L.r2(debito - output - deltaWip);
      if (Math.abs(varianza) >= 0.005) regs.push(M.post({data: fine, tipo: 'REM_VARIANZA', rif: c.id, descrizione: 'Varianza di periodo ' + periodo + ' collettore ' + c.id + ' — KKS6 e liquidazione KK87',
        righe: [{conto: '61', dareAvere: 'DARE', importo: varianza, oggetto: c.id}, {conto: '73', dareAvere: 'AVERE', importo: varianza, oggetto: c.id}]}));
      var riga = {periodo: periodo, mat: mat, qta: qta, piano: s.budget ? s.budget.pianoMensile[mat] : 0, debito: debito, output: output, wip: wipNuovo, deltaWip: deltaWip, varianza: varianza,
                  perPz: qta ? L.r2(varianza / qta) : 0, movimenti: ev.length};
      c.periodi.push(riga); c.wip = wipNuovo; righe.push(riga);
    });
    s.periodi.push({periodo: periodo, fine: fine, righe: righe, regs: regs.filter(Boolean).map(function (r) { return r.id; })});
    M.salva();
    return '<p class="lab-nota">Chiusura ' + periodo + ': i collettori restano aperti.</p>' + L.tabella(['Collettore', 'Prodotti›', 'Piano›', 'Costi (debito)›', 'Output a std›', 'WIP al target›', 'Varianza›'],
      righe.map(function (x) { return ['PCC-' + x.mat, L.n0(x.qta), L.n0(x.piano), L.eur(x.debito), L.eur(x.output), L.eur(x.wip), L.eur(x.varianza)]; })) + L.righeScrittura(regs.filter(Boolean));
  }
  return {avvia: avvia, get M() { return M; }, LINEA: LINEA, budget: budget, versione: versione, collettore: collettore, mfbf: mfbf, prelievoExtra: prelievoExtra,
    chiusura: chiusura, stdFinoPunto: stdFinoPunto, entrataFerro: function (i) { return M.entrataFerro(i); }};
})();
