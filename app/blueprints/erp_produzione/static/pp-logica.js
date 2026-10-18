/* Nuova costituzione wip-fasi-v1: TR-STD ha un ordine con tre operazioni; SL-TAGLIO è autonomo.
   Le aziende pregresse conservano distinta e ordini salvati.
   SISTEMA INTEGRATO — PP ordini di produzione: CO01, prelievo 261, conferma CO11N (attrezzaggio + lavorazione), entrata 101.
   Nel sistema integrato i semilavorati sono «fantasma»: l'ordine del finito preleva direttamente il ferro.
   Nell'azienda nuova (costituzione) la TR-STD si fa in tre stadi con materiali veri: SL-TAGLIO (consuma ferro, centro Taglio),
   SL-PIEGA (consuma SL-TAGLIO, Piegatura), TR-STD (consuma SL-PIEGA, Saldatura). Ogni stadio ha il suo ordine e la sua scorta:
   semilavorati a magazzino sul conto 07, consumo di semilavorati sul conto 71.
   Come in S/4 (Universal Journal) anche i costi secondari sono righe del giornale: attività D 72 / A 75. */
window.PP4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var ord = function (n) { var o = S().produzione.find(function (x) { return x.numero === String(n); }); if (!o) throw Error('Ordine di produzione ' + n + ' inesistente.'); return o; };
  var somma = function (o, tipo, k) { return r2(o.eventi.filter(function (e) { return e.tipo === tipo && !e.stornato; }).reduce(function (t, e) { return t + (e[k] || 0); }, 0)); };
  var aperto = function (o) { if (o.liquidazione) throw Error('Ordine ' + o.numero + ' già liquidato e chiuso (CLSD).'); if (o.teco) throw Error('Ordine ' + o.numero + ' chiuso tecnicamente (TECO).'); };
  function stato(o) { return o.liquidazione ? 'CLSD' : o.teco ? 'TECO' : somma(o, '101', 'qta') >= o.qta ? 'DLV' : o.fasi && o.fasi.every(function (f) { return faseQta(o, f) >= o.qta; }) ? 'CNF' : o.eventi.some(function (e) { return e.tipo === 'CO11N' && !e.stornato; }) ? 'PCNF' : 'REL'; }

  function faseQta(o, fase) {
    return r2(o.eventi.filter(function (e) { return e.tipo === 'CO11N' && e.fase === fase && !e.stornato; }).reduce(function (t, e) { return t + (e.qta || 0); }, 0));
  }
  function cronologia(o, data) {
    if (data < o.eventi.filter(function (e) { return !e.stornato; }).reduce(function (d, e) { return e.data > d ? e.data : d; }, o.data))
      throw Error('La data non può precedere l’ultimo avanzamento attivo dell’ordine.');
  }
  // Saldo analitico in lavorazione, NON capitalizzazione FI né valore fiscale delle rimanenze.
  function wip(o) {
    var e = effettivi(o), aperto = !o.teco && !o.liquidazione && e.entrati < o.qta;
    return {inCorso: aperto, valore: aperto ? r2(Math.max(0, e.totale - e.accredito)) : 0,
      saldo: r2(e.totale - e.accredito), fasi: (o.fasi || []).map(function (f) { return {fase: f, qta: faseQta(o, f)}; })};
  }
  function ordine(i) {
    var n = N(), data = n.data(i.data), mat = i.materiale, m = n.materiale(mat), q = L.num(i.qta, 'Quantità', 1);
    if (m.tipo !== 'FERT' && m.tipo !== 'HALB') throw Error('Si producono prodotti finiti e semilavorati: ' + mat + ' si acquista.');
    var cp = m.comp || {mat: 'FERRO', q: m.ferro};
    var o = {numero: n.numero('produzione'), materiale: mat, qta: q, data: data, eventi: [], piano: window.PC4.pianifica(mat, q, data), componente: {mat: cp.mat, q: cp.q}};
    if (m.fasi) o.fasi = m.fasi.slice(); // snapshot del ciclo: non cambia i vecchi ordini
    S().produzione.push(o); n.salva();
    return '<p class="lab-nota">Ordine di produzione <b>' + o.numero + '</b> (tipo PP01) rilasciato: ' + q + ' pz ' + mat + '. Componente da prelevare: ' + L.n0(cp.q * q) + ' ' + (n.materiale(cp.mat).um || 'kg') + ' di ' + cp.mat +
      '. Costi pianificati per questo lotto ' + L.eur(o.piano.totale) + ' € (' + L.eur(o.piano.totale / q) + ' €/pz). Nessuna scrittura.</p>';
  }
  var comp = function (o) { return o.componente || {mat: 'FERRO', q: N().materiale(o.materiale).ferro}; };
  function prelievo(i) {
    var n = N(), o = ord(i.ordine); aperto(o);
    var cm = comp(o).mat, mm = n.materiale(cm), ferro = cm === 'FERRO';
    var data = n.data(i.data), kg = L.num(i.kg == null || i.kg === '' ? i.qta : i.kg, ferro ? 'Quantità ferro (kg)' : 'Quantità di ' + cm + ' (pz)', 0.001); if (data < o.data) throw Error('Prelievo anteriore all\'ordine.');
    if (o.fasi) cronologia(o, data);
    var val = r2(kg * mm.std), doc = n.numero('materiale');
    if (window.WM4 && window.WM4.attivo(data)) window.WM4.consumaPSA(cm, kg, o.numero);
    var mv = n.movimento(cm, -kg, data, '261', o.numero);
    o.eventi.push({tipo: '261', data: data, kg: kg, mat: cm, valore: val, doc: doc, lotti: mv.lotti});
    var r = n.post({data: data, tipo: 'PRELIEVO_261', rif: o.numero, descrizione: 'MIGO 261 doc. ' + doc + ' — ' + (ferro ? L.n0(kg) + ' kg di ferro' : L.n0(kg) + ' pz di ' + cm + ' (semilavorato)') + ' all\'ordine ' + o.numero + ' (' + o.materiale + ')',
      righe: [{conto: ferro ? '70' : '71', dareAvere: 'DARE', importo: val, partner: o.numero}, {conto: n.contoMag(cm), dareAvere: 'AVERE', importo: val}]});
    n.salva(); return r;
  }
  function conferma(i) {
    var n = N(), o = ord(i.ordine); aperto(o);
    var data = n.data(i.data), set = L.num(i.attrezzaggio || 0, 'Ore di attrezzaggio', 0), ore = L.num(i.ore, 'Ore di lavorazione', 0);
    if (set + ore <= 0) throw Error('Conferma almeno un\'ora.');
    if (data < o.data) throw Error('Conferma anteriore all’ordine.');
    var fase = '', q = 0;
    if (o.fasi) {
      cronologia(o, data);
      fase = String(i.fase || '');
      var idx = o.fasi.indexOf(fase);
      if (idx < 0) throw Error('Seleziona la fase: ' + o.fasi.join(' → ') + '.');
      q = L.num(i.qta == null || i.qta === '' ? o.qta - faseQta(o, fase) : i.qta, 'Pezzi confermati nella fase', 1);
      if (faseQta(o, fase) + q > o.qta) throw Error('Quantità della fase superiore al lotto.');
      var disponibili = idx ? faseQta(o, o.fasi[idx - 1]) : somma(o, '261', 'kg') / comp(o).q;
      if (faseQta(o, fase) + q > disponibili + 1e-9) throw Error(idx ? 'Conferma prima i pezzi della fase precedente.' : 'Preleva prima il materiale necessario con 261.');
    }
    var t = S().costing.scheda.tariffa, val = r2((set + ore) * t);
    var evento = {tipo: 'CO11N', data: data, attrezzaggio: set, ore: ore, valoreSet: r2(set * t), valoreOre: r2(ore * t), valore: val};
    if (o.fasi) { evento.fase = fase; evento.qta = q; }
    o.eventi.push(evento);
    var r = n.post({data: data, tipo: 'CONFERMA', rif: o.numero, descrizione: 'CO11N ordine ' + o.numero + ' (' + o.materiale + ')' + (fase ? ' · fase ' + fase + ' · ' + q + ' pz' : '') + ': attrezzaggio ' + L.n0(set) + ' h + lavorazione ' + L.n0(ore) + ' h × ' + L.eur(t) + ' €/h',
      righe: [{conto: '72', dareAvere: 'DARE', importo: val, partner: o.numero}, {conto: '75', dareAvere: 'AVERE', importo: val, testo: 'centri ' + (fase || Object.keys(n.materiale(o.materiale).ore || {}).join(' · '))}]});
    evento.contabile = r.numero;
    n.salva(); return r;
  }
  function entrata(i) {
    var n = N(), o = ord(i.ordine); aperto(o);
    var data = n.data(i.data), q = L.num(i.qta == null || i.qta === '' ? o.qta - somma(o, '101', 'qta') : i.qta, 'Quantità', 1);
    if (q > o.qta - somma(o, '101', 'qta') + 1e-9) throw Error('Restano da versare ' + (o.qta - somma(o, '101', 'qta')) + ' pz.');
    if (o.fasi) {
      cronologia(o, data);
      if (q + somma(o, '101', 'qta') > faseQta(o, o.fasi[o.fasi.length - 1])) throw Error('Completa le fasi del ciclo prima del versamento: non si caricano a magazzino le lavorazioni intermedie.');
    }
    var m = n.materiale(o.materiale), val = r2(q * m.std), doc = n.numero('materiale');
    var mv = n.movimento(o.materiale, q, data, '101', o.numero);
    if (window.WM4 && window.WM4.attivo(data)) window.WM4.entrata(o.materiale, q, data, doc, '101 produzione');
    o.eventi.push({tipo: '101', data: data, qta: q, valore: val, doc: doc, std: m.std, lotto: mv.lotti[0].lotto});
    if (window.SD4 && window.SD4.riconferma) window.SD4.riconferma(o.materiale);   // i pezzi nuovi confermano gli ordini cliente in attesa
    var r = n.post({data: data, tipo: 'ENTRATA_PRODUZIONE', rif: o.numero, descrizione: 'MIGO 101 doc. ' + doc + ' — entrata ' + q + ' pz ' + o.materiale + (m.tipo === 'HALB' ? ' (semilavorato)' : '') + ' dall\'ordine ' + o.numero + ' a standard ' + L.eur(m.std),
      righe: [{conto: n.contoMag(o.materiale), dareAvere: 'DARE', importo: val}, {conto: '73', dareAvere: 'AVERE', importo: val, partner: o.numero}]});
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
  return {faseQta: faseQta, wip: wip, comp: comp, ordine: ordine, prelievo: prelievo, conferma: conferma, entrata: entrata, teco: teco, effettivi: effettivi, stato: stato, ord: ord, somma: somma};
})();
