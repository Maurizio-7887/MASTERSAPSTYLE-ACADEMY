/* SISTEMA INTEGRATO — Inventari fisici e contabili in logica SAP (WM LI01N/LI02N/LI04/LI11N/LI14/LI20/LI21 · EWM /SCWM/PI_*).
   Documento d'inventario per ubicazione: creato → attivato (ubicazioni bloccate) → lista di conta «cieca» → conta → riconta
   (se la differenza supera la tolleranza in €) → chiusura nel WMS (differenze nella 999) → registrazione in contabilità
   di magazzino (IM 711/712: D 65 / A 12-13 o viceversa). Tipi: annuale, a rotazione (classe ABC), a ubicazione vuota, per ubicazioni.
   Valorizzazione delle rimanenze: FIFO, LIFO continuo, costo medio ponderato continuo, costo standard. */
window.IV4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; }, W = function () { return S().wm; }, WM = function () { return window.WM4; };
  var TIPI = {annuale: 'Inventario annuale (tutte le ubicazioni)', rotazione: 'Inventario a rotazione (classe ABC)', vuota: 'Inventario a ubicazione vuota', ubicazioni: 'Inventario per ubicazioni scelte'};
  var FREQ = {A: 12, B: 4, C: 1};
  var doc = function (n) { var d = W().inventari.find(function (x) { return x.numero === String(n); }); if (!d) throw Error('Documento d\'inventario ' + n + ' inesistente.'); return d; };
  var std = function (m) { return N().materiale(m).std; };
  var conto = function (m) { return N().materiale(m).tipo === 'ROH' ? '12' : '13'; };

  // classificazione ABC sul valore dei consumi (uscite 601 e 261, al netto dei resi 651), al costo standard attuale
  function abc() {
    var s = S(), v = {};
    Object.keys(s.materiali).forEach(function (m) { v[m] = 0; });
    s.movimenti.forEach(function (x) { if (x.tipo === '601' || x.tipo === '261') v[x.mat] -= x.qta; if (x.tipo === '651') v[x.mat] -= x.qta; });
    var righe = Object.keys(v).map(function (m) { return {mat: m, qta: r2(Math.max(v[m], 0)), valore: r2(Math.max(v[m], 0) * std(m))}; }).sort(function (a, b) { return b.valore - a.valore; });
    var tot = righe.reduce(function (t, x) { return t + x.valore; }, 0), cum = 0;
    righe.forEach(function (x, i) { x.perc = tot ? r2(x.valore / tot * 100) : 0; cum = r2(cum + x.perc); x.cum = cum;
      x.classe = i === 0 || cum <= 80 ? 'A' : cum <= 95 ? 'B' : 'C'; x.freq = FREQ[x.classe]; });   // A fino all'80% cumulato, B fino al 95%, C il resto
    return {righe: righe, totale: r2(tot)};
  }
  function ubicazioniPer(tipo, selezione) {
    var u = W().ubicazioni, mag = Object.keys(u).filter(function (b) { return u[b].tipo === '001' || u[b].tipo === '002'; }).sort();
    if (tipo === 'annuale') return mag;
    if (tipo === 'vuota') return mag.filter(function (b) { return WM().inUbic(b).length === 0; });
    if (tipo === 'rotazione') {
      var cl = String(selezione || 'A').toUpperCase(), mats = abc().righe.filter(function (x) { return x.classe === cl; }).map(function (x) { return x.mat; });
      return mag.filter(function (b) { return WM().inUbic(b).some(function (q) { return mats.indexOf(q.mat) >= 0; }); });
    }
    var lista = String(selezione || '').toUpperCase().split(/[\s,;]+/).filter(Boolean);
    lista.forEach(function (b) { if (!u[b]) throw Error('Ubicazione ' + b + ' inesistente.'); });
    return lista;
  }
  function crea(i) {
    WM().richiesto(); var n = N(), data = n.data(i.data), tipo = i.tipo || 'rotazione';
    if (!TIPI[tipo]) throw Error('Tipo di inventario sconosciuto.');
    var bins = ubicazioniPer(tipo, i.selezione);
    if (!bins.length) throw Error('Nessuna ubicazione da inventariare con questa selezione.');
    var gia = W().inventari.filter(function (d) { return d.stato !== 'chiuso'; }).filter(function (d) { return d.righe.some(function (r) { return bins.indexOf(r.ubic) >= 0; }); })[0];
    if (gia) throw Error('Alcune ubicazioni sono già nel documento d\'inventario ' + gia.numero + ' non chiuso.');
    var righe = [];
    bins.forEach(function (b) {
      var qs = WM().inUbic(b);
      if (!qs.length) righe.push({ubic: b, quant: '', udc: '', mat: '', libro: 0, conta1: null, conta2: null, riconta: false});
      qs.forEach(function (q) { righe.push({ubic: b, quant: q.id, udc: q.udc, mat: q.mat, libro: q.qta, conta1: null, conta2: null, riconta: false}); });
    });
    var d = {numero: String(n.numero('inventario')), tipo: tipo, selezione: String(i.selezione || ''), data: data, stato: 'creato', righe: righe,
             tolleranza: i.tolleranza === undefined || i.tolleranza === '' ? W().tolleranza : L.num(i.tolleranza, 'Tolleranza €', 0), contatore: ''};
    W().inventari.push(d); n.salva();
    return '<p class="lab-nota">Documento d\'inventario <b>' + d.numero + '</b> creato (' + TIPI[tipo] + '): ' + bins.length + ' ubicazioni, ' + righe.length + ' posizioni. Ora attivalo: le ubicazioni si bloccano e si stampa la lista di conta.</p>';
  }
  function attiva(i) {
    var d = doc(i.numero), u = W().ubicazioni; if (d.stato !== 'creato') throw Error('Il documento ' + d.numero + ' è già ' + d.stato + '.');
    var bins = d.righe.map(function (r) { return r.ubic; });
    var occ = WM().aperti().filter(function (t) { return bins.indexOf(t.da) >= 0 || bins.indexOf(t.a) >= 0; });
    if (occ.length) throw Error('Ci sono compiti di magazzino aperti su queste ubicazioni (' + occ.map(function (t) { return t.numero; }).join(', ') + '): confermali prima di attivare l\'inventario.');
    // la giacenza contabile si fotografa all'attivazione (data di riferimento)
    d.righe.forEach(function (r) { if (r.quant) { var q = W().quant.find(function (x) { return x.id === r.quant; }); r.libro = q ? q.qta : 0; } });
    bins.forEach(function (b) { u[b].blocco = 'inventario ' + d.numero; });
    d.stato = 'attivo'; d.attivato = N().data(i.data || d.data); N().salva();
    return '<p class="lab-nota">Documento ' + d.numero + ' attivo: ' + bins.filter(function (b, k) { return bins.indexOf(b) === k; }).length + ' ubicazioni bloccate (niente messe a posto né prelievi). Stampa la lista di conta cieca e conta.</p>';
  }
  var valoreDiff = function (r, q) { return r.mat ? r2((q - r.libro) * std(r.mat)) : 0; };
  function conta(i) {
    var d = doc(i.numero), n = N();
    if (d.stato !== 'attivo' && d.stato !== 'riconta') throw Error('Si conta un documento attivo (stato attuale: ' + d.stato + ').');
    var seconda = d.stato === 'riconta';
    d.righe.forEach(function (r, k) {
      var v = i['r' + k]; if (v === undefined || v === '' || v === null) return;
      if (seconda && !r.riconta) return;
      var q = L.num(v, 'Conta ' + r.ubic, 0);
      if (!r.mat && q > 0) { var m = String(i['m' + k] || '').trim().toUpperCase(); n.materiale(m); r.mat = m; }
      if (seconda) r.conta2 = q; else r.conta1 = q;
    });
    var mancanti = d.righe.filter(function (r) { return seconda ? r.riconta && r.conta2 === null : r.conta1 === null; });
    if (mancanti.length && !i.parziale) throw Error('Mancano le conte di ' + mancanti.map(function (r) { return r.ubic + (r.udc ? ' (UdC ' + r.udc + ')' : ''); }).join(', ') + '.');
    if (mancanti.length) { n.salva(); return '<p class="lab-nota">Conte salvate; ne mancano ' + mancanti.length + '.</p>'; }
    d.contatore = String(i.contatore || d.contatore || '');
    if (!seconda) d.righe.forEach(function (r) { r.riconta = Math.abs(valoreDiff(r, r.conta1)) > d.tolleranza + 1e-9; });
    var daRicontare = d.righe.filter(function (r) { return r.riconta && r.conta2 === null; });
    d.stato = daRicontare.length ? 'riconta' : 'contato';
    n.salva();
    return '<p class="lab-nota">' + (seconda ? 'Riconta registrata.' : 'Prima conta registrata.') + (daRicontare.length ? ' <b>' + daRicontare.length + ' posizioni oltre la tolleranza di ' + L.eur(d.tolleranza) + ' €</b> vanno ricontate (LI14): ' + daRicontare.map(function (r) { return r.ubic; }).join(', ') + '.' : ' Tutto contato: si può chiudere il documento e passare le differenze nella 999.') + '</p>';
  }
  var finale = function (r) { return r.conta2 !== null && r.conta2 !== undefined ? r.conta2 : r.conta1; };
  function chiudi(i) {
    var d = doc(i.numero), n = N(), w = W(), data = n.data(i.data || d.data);
    if (d.stato !== 'contato') throw Error(d.stato === 'riconta' ? 'Ci sono posizioni da ricontare.' : 'Documento non ancora contato (stato ' + d.stato + ').');
    var tot = 0;
    d.righe.forEach(function (r) {
      var f = finale(r), dq = r2(f - r.libro); r.diff = dq; r.valore = valoreDiff(r, f); tot = r2(tot + r.valore);
      if (!dq) return;
      var q = r.quant ? w.quant.find(function (x) { return x.id === r.quant; }) : null;
      if (q) q.qta = r2(q.qta + dq); else WM().nuovoQuant(r.ubic, r.mat, dq, String(n.numero('udc')), data, 'inventario ' + d.numero);
      WM().nuovoQuant('DIFF', r.mat, -dq, '', data, 'inventario ' + d.numero + ' ' + r.ubic);   // mancanza → +999 · eccedenza → −999
    });
    d.righe.forEach(function (r) { if (w.ubicazioni[r.ubic].blocco === 'inventario ' + d.numero) w.ubicazioni[r.ubic].blocco = ''; });
    d.stato = 'chiuso'; d.chiuso = data; d.valoreDiff = tot; n.salva();
    return '<p class="lab-nota">Documento ' + d.numero + ' chiuso nel WMS (LI20): le ubicazioni ora riportano la quantità contata, le differenze (' + L.eur(tot) + ' €) sono nella zona 999 in attesa della registrazione contabile. Ubicazioni sbloccate.</p>';
  }
  // LI21 / analizzatore differenze: dalla 999 alla contabilità di magazzino
  function registra(i) {
    WM().richiesto(); var n = N(), data = n.data(i.data), per = {}, regs = [];
    WM().inUbic('DIFF').forEach(function (q) { per[q.mat] = r2((per[q.mat] || 0) + q.qta); });
    var mats = Object.keys(per).filter(function (m) { return Math.abs(per[m]) > 1e-9; });
    if (!mats.length) throw Error('Nessuna differenza da registrare nella zona 999.');
    mats.forEach(function (m) {
      var q = per[m], val = r2(Math.abs(q) * std(m)), perdita = q > 0;
      n.movimento(m, -q, data, perdita ? '711' : '712', 'differenze inventariali');
      WM().inUbic('DIFF').filter(function (x) { return x.mat === m; }).forEach(function (x) { x.qta = 0; });
      var r = n.post({data: data, tipo: 'DIFFERENZA_INVENTARIO', rif: 'LI21', descrizione: 'Differenza inventariale ' + m + ': ' + (perdita ? 'mancano ' : 'in più ') + L.n0(Math.abs(q)) + ' ' + (n.materiale(m).um || '') + ' × ' + L.eur(std(m)) + ' (movimento ' + (perdita ? '711' : '712') + ')',
        righe: perdita ? [{conto: '65', dareAvere: 'DARE', importo: val, testo: m}, {conto: conto(m), dareAvere: 'AVERE', importo: val}]
                       : [{conto: conto(m), dareAvere: 'DARE', importo: val}, {conto: '65', dareAvere: 'AVERE', importo: val, testo: m}]});
      W().registrazioni.push({data: data, mat: m, qta: -q, valore: perdita ? -val : val, contabile: r.numero});
      regs.push(r);
    });
    n.salva(); return regs;
  }
  // ── valorizzazione delle rimanenze ──
  function valuta(righe, prezzoStd) {
    var fifo = [], lifo = [], cmp = {q: 0, v: 0}, scheda = [], errori = [];
    righe.slice().sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; }).forEach(function (m) {
      if (m.tipo === 'C') {
        fifo.push({q: m.qta, p: m.prezzo}); lifo.push({q: m.qta, p: m.prezzo});
        cmp.v = r2(cmp.v + m.qta * m.prezzo); cmp.q = r2(cmp.q + m.qta);
      } else {
        if (m.qta > cmp.q + 1e-9) { errori.push('Uscita del ' + L.fd(m.data) + ' di ' + L.n0(m.qta) + ' oltre la giacenza (' + L.n0(cmp.q) + ').'); return; }
        var esci = function (strati, daFondo) { var resto = m.qta, val = 0; while (resto > 1e-9 && strati.length) { var s = daFondo ? strati[strati.length - 1] : strati[0], x = Math.min(s.q, resto); val += x * s.p; s.q = r2(s.q - x); resto = r2(resto - x); if (s.q <= 1e-9) { if (daFondo) strati.pop(); else strati.shift(); } } return r2(val); };
        m.vFifo = esci(fifo, false); m.vLifo = esci(lifo, true);
        var pm = cmp.q ? cmp.v / cmp.q : 0; m.vCmp = r2(m.qta * pm); cmp.v = r2(cmp.v - m.vCmp); cmp.q = r2(cmp.q - m.qta);
      }
      var vs = function (st) { return r2(st.reduce(function (t, s) { return t + s.q * s.p; }, 0)); };
      scheda.push({data: m.data, tipo: m.tipo, causale: m.causale || '', qta: m.qta, prezzo: m.prezzo, giacenza: cmp.q, fifo: vs(fifo), lifo: vs(lifo), cmp: cmp.v, prezzoMedio: cmp.q ? r2(cmp.v / cmp.q * 10000) / 10000 : 0});
    });
    var q = cmp.q, st = r2(q * (prezzoStd || 0));
    var tot = function (s) { return r2(s.reduce(function (t, x) { return t + x.q * x.p; }, 0)); };
    return {giacenza: q, fifo: tot(fifo), lifo: tot(lifo), cmp: cmp.v, standard: st, stratiFifo: fifo, stratiLifo: lifo, scheda: scheda, errori: errori};
  }
  // movimenti del sistema per un materiale (carichi al prezzo d'acquisto; il resto al costo standard)
  function movimentiDi(mat) {
    var s = S(), out = [];
    s.movimenti.filter(function (x) { return x.mat === mat; }).forEach(function (x) {
      var prezzo = std(mat), causale = x.tipo;
      if (x.tipo === '101') { var o = (s.acquisti || []).find(function (a) { return a.numero === x.rif; }); if (o) { prezzo = o.prezzo; causale = '101 acquisto ' + o.numero; } else causale = '101 produzione ' + x.rif; }
      if (x.tipo === '561') causale = '561 saldo iniziale';
      if (x.tipo === '601') causale = '601 vendita';
      if (x.tipo === '261') causale = '261 consumo ordine ' + x.rif;
      out.push({data: x.data, tipo: x.qta > 0 ? 'C' : 'S', qta: Math.abs(x.qta), prezzo: prezzo, causale: causale});
    });
    return out;
  }
  return {TIPI: TIPI, FREQ: FREQ, abc: abc, crea: crea, attiva: attiva, conta: conta, chiudi: chiudi, registra: registra, valuta: valuta, movimentiDi: movimentiDi, finale: finale, doc: doc};
})();
