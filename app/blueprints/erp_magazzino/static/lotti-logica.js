/* SISTEMA INTEGRATO — Lotti e tracciabilità (MSC3N, MB56 «batch where-used»). Ogni entrata crea un lotto (colata del fornitore per il ferro,
   lotto di produzione per le transenne), ogni uscita consuma lotti FIFO e se li porta dietro: così da un lotto di ferro si arriva ai clienti
   che hanno ricevuto le transenne fatte con quel ferro (a valle), e da una consegna si risale fino alla colata e al fornitore (a monte). */
window.LT4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var S = function () { return window.SD4.N.S; };
  var nomeTipo = {'561': 'apertura', '101': 'entrata', '261': 'prelievo per produzione', '262': 'storno prelievo', '601': 'uscita per consegna', '602': 'storno uscita', '651': 'reso', '102': 'storno entrata', '711': 'differenza inventariale (−)', '712': 'differenza inventariale (+)'};
  function elenco(mat) {
    var out = [], lt = S().lotti || {};
    Object.keys(lt).filter(function (m) { return !mat || m === mat; }).forEach(function (m) { Object.keys(lt[m]).forEach(function (l) { var x = lt[m][l]; out.push({mat: m, lotto: l, qta: x.qta, data: x.data, tipo: x.tipo, rif: x.rif, fornitore: x.fornitore, colata: x.colata}); }); });
    return out.sort(function (a, b) { return a.mat < b.mat ? -1 : a.mat > b.mat ? 1 : a.data < b.data ? -1 : a.data > b.data ? 1 : a.lotto < b.lotto ? -1 : 1; });
  }
  var lotto = function (mat, l) { var x = ((S().lotti || {})[mat] || {})[l]; if (!x) throw Error('Lotto ' + l + ' di ' + mat + ' inesistente.'); return x; };
  var movimentiDel = function (mat, l) { return S().movimenti.filter(function (m) { return m.mat === mat && (m.lotti || []).some(function (x) { return x.lotto === l; }); }).map(function (m) { return {m: m, qta: m.lotti.filter(function (x) { return x.lotto === l; }).reduce(function (t, x) { return t + x.qta; }, 0)}; }); };
  var cliente = function (ordine) { var o = S().ordini.find(function (x) { return x.numero === ordine; }); return o ? o.cliente + ' ' + ((S().clienti[o.cliente] || {}).nome || '') : ''; };
  var consegnaDi = function (ordine, mat, l) { var c = S().consegne.find(function (x) { return x.ordine === ordine && (x.lotti || []).some(function (y) { return y.lotto === l; }); }); return c ? c.numero : ''; };
  // a valle: dove è finito il lotto
  function valle(mat, l, liv, out) {
    out = out || []; liv = liv || 0; lotto(mat, l);
    movimentiDel(mat, l).forEach(function (x) {
      var m = x.m; if (m.qta > 0 && liv > 0) return;
      var t = (nomeTipo[m.tipo] || m.tipo) + ' ' + L.n0(x.qta) + ' · ' + L.fd(m.data);
      if (m.tipo === '261') {
        out.push({livello: liv, tipo: '261', testo: t + ' → ordine di produzione ' + m.rif});
        var lp = S().movimenti.filter(function (y) { return y.tipo === '101' && y.rif === m.rif && y.qta > 0; });
        lp.forEach(function (y) { (y.lotti || []).forEach(function (z) { out.push({livello: liv + 1, tipo: 'lotto', testo: 'lotto di produzione ' + z.lotto + ' · ' + L.n0(z.qta) + ' pz ' + y.mat, mat: y.mat, lotto: z.lotto}); valle(y.mat, z.lotto, liv + 2, out); }); });
      } else if (m.tipo === '601') out.push({livello: liv, tipo: '601', testo: t + ' → consegna ' + consegnaDi(m.rif, mat, l) + ' · ordine ' + m.rif + ' · cliente ' + cliente(m.rif)});
      else out.push({livello: liv, tipo: m.tipo, testo: t + (m.rif ? ' · ' + m.rif : '')});
    });
    return out;
  }
  // a monte: da dove viene il lotto
  function monte(mat, l, liv, out) {
    out = out || []; liv = liv || 0; var x = lotto(mat, l);
    if (x.tipo === '101' && (S().materiali[mat] || {}).tipo === 'ROH') {
      var o = S().acquisti.find(function (a) { return a.numero === x.rif; }) || {};
      out.push({livello: liv, tipo: 'origine', testo: 'colata ' + (x.colata || l) + ' · entrata del ' + L.fd(x.data) + ' · ordine d\'acquisto ' + x.rif + ' · fornitore ' + (o.fornitore || x.fornitore || '') + ' ' + ((S().fornitori[o.fornitore || x.fornitore] || {}).nome || '')});
    } else if (x.tipo === '101') {
      out.push({livello: liv, tipo: 'origine', testo: 'prodotto dall\'ordine di produzione ' + x.rif + ' il ' + L.fd(x.data)});
      var usati = {};
      S().movimenti.filter(function (m) { return m.rif === x.rif && (m.tipo === '261' || m.tipo === '262'); }).forEach(function (m) { (m.lotti || []).forEach(function (z) { usati[z.lotto] = r2((usati[z.lotto] || 0) + (m.tipo === '261' ? z.qta : -z.qta)); }); });
      Object.keys(usati).filter(function (k) { return usati[k] > 1e-9; }).forEach(function (k) { out.push({livello: liv + 1, tipo: 'lotto', testo: 'ferro lotto ' + k + ' · ' + L.n0(usati[k]) + ' kg', mat: 'FERRO', lotto: k}); if (k !== 'SENZA LOTTO' && ((S().lotti || {}).FERRO || {})[k]) monte('FERRO', k, liv + 2, out); });
    } else out.push({livello: liv, tipo: 'origine', testo: (nomeTipo[x.tipo] || x.tipo) + ' del ' + L.fd(x.data) + (x.rif ? ' · ' + x.rif : '')});
    return out;
  }
  // dalla consegna (reclamo del cliente) risale ai lotti consegnati e alle colate
  function daConsegna(numero) {
    var c = S().consegne.find(function (x) { return x.numero === String(numero); }); if (!c) throw Error('Consegna inesistente.');
    var out = [{livello: 0, tipo: 'consegna', testo: 'consegna ' + c.numero + ' · ' + L.n0(c.qta) + ' pz ' + c.materiale + ' · cliente ' + cliente(c.ordine)}];
    (c.lotti || []).forEach(function (z) { out.push({livello: 1, tipo: 'lotto', testo: 'lotto ' + z.lotto + ' · ' + L.n0(z.qta) + ' pz', mat: c.materiale, lotto: z.lotto}); if (((S().lotti || {})[c.materiale] || {})[z.lotto]) monte(c.materiale, z.lotto, 2, out); });
    return out;
  }
  // numeri di serie (IQ03): storia del singolo pezzo e riepilogo per stato
  var DESCR = {magazzino: 'in magazzino', cliente: 'presso il cliente', consumato: 'consumato', annullato: 'entrata annullata', perso: 'mancante all\'inventario', uscito: 'uscito'};
  function seriale(sn) {
    sn = String(sn || '').trim().toUpperCase(); var sm = S().seriali || {}, mat = Object.keys(sm).find(function (m) { return sm[m][sn]; });
    if (!mat) throw Error('Numero di serie ' + sn + ' inesistente.');
    var x = sm[mat][sn];
    return {sn: sn, mat: mat, stato: DESCR[x.stato] || x.stato, lotto: x.lotto, cliente: x.cliente ? x.cliente + ' ' + ((S().clienti[x.cliente] || {}).nome || '') : '',
      storia: x.storia.map(function (h) { var c = h.tipo === '601' || h.tipo === '602' ? S().consegne.find(function (k) { return (k.seriali || []).indexOf(sn) >= 0 && k.ordine === h.rif; }) : null;
        return {data: h.data, tipo: h.tipo, testo: (nomeTipo[h.tipo] || h.tipo) + (h.rif ? ' · ' + h.rif : '') + (c ? ' · consegna ' + c.numero + ' · ' + cliente(c.ordine) : '')}; })};
  }
  function serieRiepilogo() {
    var sm = S().seriali || {}, out = [];
    Object.keys(sm).forEach(function (m) { var t = {mat: m, totale: 0}; Object.keys(sm[m]).forEach(function (sn) { var st = sm[m][sn].stato; t[st] = (t[st] || 0) + 1; t.totale++; }); out.push(t); });
    return out;
  }
  function serieDi(mat, filtro) { var sm = (S().seriali || {})[mat] || {}; return Object.keys(sm).filter(function (sn) { return !filtro || sm[sn].stato === filtro; }).sort(); }
  return {elenco: elenco, valle: valle, monte: monte, daConsegna: daConsegna, lotto: lotto, seriale: seriale, serieRiepilogo: serieRiepilogo, serieDi: serieDi};
})();
