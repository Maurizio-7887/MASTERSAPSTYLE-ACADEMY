/* SISTEMA INTEGRATO — PP ordini di produzione: CO01, prelievo 261, conferma CO11N (attrezzaggio + lavorazione), entrata 101.
   Nel sistema integrato i semilavorati sono «fantasma»: l'ordine del finito preleva direttamente il ferro.
   Come in S/4 (Universal Journal) anche i costi secondari sono righe del giornale: attività D 72 / A 75. */
window.PP4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var ord = function (n) { var o = S().produzione.find(function (x) { return x.numero === String(n); }); if (!o) throw Error('Ordine di produzione ' + n + ' inesistente.'); return o; };
  var somma = function (o, tipo, k) { return r2(o.eventi.filter(function (e) { return e.tipo === tipo && !e.stornato; }).reduce(function (t, e) { return t + (e[k] || 0); }, 0)); };
  var aperto = function (o) { if (o.liquidazione) throw Error('Ordine ' + o.numero + ' già liquidato e chiuso (CLSD).'); if (o.teco) throw Error('Ordine ' + o.numero + ' chiuso tecnicamente (TECO).'); };
  function stato(o) { return o.liquidazione ? 'CLSD' : o.teco ? 'TECO' : somma(o, '101', 'qta') >= o.qta ? 'DLV' : o.eventi.some(function (e) { return e.tipo === 'CO11N' && !e.stornato; }) ? 'PCNF' : 'REL'; }

  function ordine(i) {
    var n = N(), data = n.data(i.data), mat = i.materiale, m = n.materiale(mat), q = L.num(i.qta, 'Quantità', 1);
    if (m.tipo !== 'FERT') throw Error('Si producono solo prodotti finiti.');
    var o = {numero: n.numero('produzione'), materiale: mat, qta: q, data: data, eventi: [], piano: window.PC4.pianifica(mat, q, data)};
    S().produzione.push(o); n.salva();
    return '<p class="lab-nota">Ordine di produzione <b>' + o.numero + '</b> (tipo PP01) rilasciato: ' + q + ' pz ' + mat + '. Costi pianificati per questo lotto ' + L.eur(o.piano.totale) + ' € (' + L.eur(o.piano.totale / q) + ' €/pz). Nessuna scrittura.</p>';
  }
  function prelievo(i) {
    var n = N(), o = ord(i.ordine); aperto(o);
    var data = n.data(i.data), kg = L.num(i.kg, 'Quantità ferro (kg)', 0.001); if (data < o.data) throw Error('Prelievo anteriore all\'ordine.');
    var val = r2(kg * n.materiale('FERRO').std), doc = n.numero('materiale');
    if (window.WM4 && window.WM4.attivo(data)) window.WM4.consumaPSA('FERRO', kg, o.numero);
    n.movimento('FERRO', -kg, data, '261', o.numero);
    o.eventi.push({tipo: '261', data: data, kg: kg, valore: val, doc: doc});
    var r = n.post({data: data, tipo: 'PRELIEVO_261', rif: o.numero, descrizione: 'MIGO 261 doc. ' + doc + ' — ' + L.n0(kg) + ' kg di ferro all\'ordine ' + o.numero + ' (' + o.materiale + ')',
      righe: [{conto: '70', dareAvere: 'DARE', importo: val, partner: o.numero}, {conto: '12', dareAvere: 'AVERE', importo: val}]});
    n.salva(); return r;
  }
  function conferma(i) {
    var n = N(), o = ord(i.ordine); aperto(o);
    var data = n.data(i.data), set = L.num(i.attrezzaggio || 0, 'Ore di attrezzaggio', 0), ore = L.num(i.ore, 'Ore di lavorazione', 0);
    if (set + ore <= 0) throw Error('Conferma almeno un\'ora.');
    var t = S().costing.scheda.tariffa, val = r2((set + ore) * t);
    o.eventi.push({tipo: 'CO11N', data: data, attrezzaggio: set, ore: ore, valoreSet: r2(set * t), valoreOre: r2(ore * t), valore: val});
    var r = n.post({data: data, tipo: 'CONFERMA', rif: o.numero, descrizione: 'CO11N ordine ' + o.numero + ' (' + o.materiale + '): attrezzaggio ' + L.n0(set) + ' h + lavorazione ' + L.n0(ore) + ' h × ' + L.eur(t) + ' €/h',
      righe: [{conto: '72', dareAvere: 'DARE', importo: val, partner: o.numero}, {conto: '75', dareAvere: 'AVERE', importo: val, testo: 'centri Taglio · Piegatura · Saldatura'}]});
    n.salva(); return r;
  }
  function entrata(i) {
    var n = N(), o = ord(i.ordine); aperto(o);
    var data = n.data(i.data), q = L.num(i.qta == null || i.qta === '' ? o.qta - somma(o, '101', 'qta') : i.qta, 'Quantità', 1);
    if (q > o.qta - somma(o, '101', 'qta') + 1e-9) throw Error('Restano da versare ' + (o.qta - somma(o, '101', 'qta')) + ' pz.');
    var m = n.materiale(o.materiale), val = r2(q * m.std), doc = n.numero('materiale');
    n.movimento(o.materiale, q, data, '101', o.numero);
    if (window.WM4 && window.WM4.attivo(data)) window.WM4.entrata(o.materiale, q, data, doc, '101 produzione');
    o.eventi.push({tipo: '101', data: data, qta: q, valore: val, doc: doc, std: m.std});
    if (window.SD4 && window.SD4.riconferma) window.SD4.riconferma(o.materiale);   // i pezzi nuovi confermano gli ordini cliente in attesa
    var r = n.post({data: data, tipo: 'ENTRATA_PRODUZIONE', rif: o.numero, descrizione: 'MIGO 101 doc. ' + doc + ' — entrata ' + q + ' pz ' + o.materiale + ' dall\'ordine ' + o.numero + ' a standard ' + L.eur(m.std),
      righe: [{conto: '13', dareAvere: 'DARE', importo: val}, {conto: '73', dareAvere: 'AVERE', importo: val, partner: o.numero}]});
    n.salva(); return r;
  }
  function teco(i) { var o = ord(i.ordine); aperto(o); o.teco = N().data(i.data); N().salva(); return '<p class="lab-nota">Ordine ' + o.numero + ' chiuso tecnicamente (TECO): non riceve altri costi; ora si può liquidare.</p>'; }
  // costi effettivi per elemento (KKBC)
  function effettivi(o) {
    var sc = S().costing.scheda;
    var mat = somma(o, '261', 'valore'), set = somma(o, 'CO11N', 'valoreSet'), lav = somma(o, 'CO11N', 'valoreOre');
    var sm = somma(o, 'KGI2', 'mat'), sp = somma(o, 'KGI2', 'prod');
    return {kg: somma(o, '261', 'kg'), ore: somma(o, 'CO11N', 'ore'), oreSet: somma(o, 'CO11N', 'attrezzaggio'), mat: mat, lav: lav, set: set, sovrMat: sm, sovrProd: sp,
      totale: r2(mat + lav + set + sm + sp), entrati: somma(o, '101', 'qta'), accredito: somma(o, '101', 'valore'),
      sovrDovuti: {mat: r2(mat * sc.sovrMat / 100), prod: r2((lav + set) * sc.sovrProd / 100)}};
  }
  return {ordine: ordine, prelievo: prelievo, conferma: conferma, entrata: entrata, teco: teco, effettivi: effettivi, stato: stato, ord: ord, somma: somma};
})();
