/* Laboratorio «Alta varietà e disaccoppiamento» — logica (senza interfaccia, provata da tests/laboratori.js).
   Controllo costi per ordine (Product Cost by Order) con un ordine per livello di distinta:
   SL-TAGLIO → SL-PIEGA (magazzino di disaccoppiamento, strategia 70) → TR-STD / TR-ALTA / TR-PED (strategia 50, su ordine cliente).
   Movimenti: 101 acquisto ferro · CO01 · 261 · CO11N · 101 da ordine · TECO · VA01 · 601 · CO88 (WIP KKAX, varianze KKS2, liquidazione). */
window.HMLV = (function () {
  'use strict';
  var L = window.LabMotore, M = null;
  var STRATEGIE = {
    '10': 'Produzione a scorta (MTS)', '40': 'Pianificazione con assemblaggio finale', '50': 'Senza assemblaggio finale: assemblo solo su ordine cliente',
    '70': 'Pianificazione a livello di assieme (semilavorato a scorta)', '20': 'Produzione su ordine (MTO)', 'DIP': 'Fabbisogno dipendente (solo per gli ordini del livello sopra)',
  };
  var STRATEGIE_PER = {HALB: ['DIP', '70', '10'], FERT: ['10', '40', '50', '20']};

  function nuovo(S) {
    S.strategie = {'SL-TAGLIO': 'DIP', 'SL-PIEGA': 'DIP', 'TR-STD': '10', 'TR-ALTA': '10', 'TR-PED': '10'};
    S.ordini = []; S.ordiniCliente = [];
  }
  function avvia(chiave) { M = L.crea({chiave: chiave, tipo: 'hmlv', nuovo: nuovo}); return M; }
  var S = function () { return M.S; };
  var ordine = function (id) { var o = S().ordini.find(function (x) { return x.id === id; }); if (!o) throw Error('Ordine di produzione ' + id + ' inesistente.'); return o; };

  function impostaStrategia(i) {
    var mat = i.mat, cod = String(i.strategia || '');
    var m = L.MATERIALI[mat];
    if (!m || m.tipo === 'ROH') throw Error('Scegli un semilavorato o un prodotto finito.');
    if (STRATEGIE_PER[m.tipo].indexOf(cod) < 0) throw Error('Strategia ' + cod + ' non ammessa per ' + mat + '.');
    if (S().ordini.some(function (o) { return o.mat === mat && !o.liquidazione; })) throw Error('Ci sono ordini aperti di ' + mat + ': chiudili prima di cambiare strategia.');
    S().strategie[mat] = cod; M.salva();
    return '<p class="lab-nota">' + mat + ' → strategia ' + cod + ': ' + STRATEGIE[cod] + '. Nessuna scrittura: è un dato di anagrafica (vista MRP 3).</p>';
  }

  // quantità ancora da coprire con ordini di produzione per un materiale
  function domandaScoperta(mat) {
    var s = S();
    if (L.MATERIALI[mat].tipo === 'FERT') {
      var dom = s.ordiniCliente.filter(function (c) { return c.mat === mat; }).reduce(function (t, c) { return t + c.qta - c.consegnati; }, 0);
      var coperto = s.giacenze[mat] + s.ordini.filter(function (o) { return o.mat === mat && !o.chiusoLogistica; }).reduce(function (t, o) { return t + o.qta - o.entrati; }, 0);
      return Math.max(0, dom - coperto);
    }
    // semilavorato a fabbisogno dipendente: quanto chiedono gli ordini del livello sopra, meno giacenza e ordini già aperti
    var fab = s.ordini.filter(function (o) { return !o.chiusoLogistica; }).reduce(function (t, o) {
      return t + (o.std.comp.filter(function (c) { return c.mat === mat; }).reduce(function (u, c) { return u + c.qta - (o.prelievi[mat] || 0); }, 0));
    }, 0);
    var cop = s.giacenze[mat] + s.ordini.filter(function (o) { return o.mat === mat && !o.chiusoLogistica; }).reduce(function (t, o) { return t + o.qta - o.entrati; }, 0);
    return Math.max(0, fab - cop);
  }

  function creaOrdine(i) {
    var mat = i.mat, m = L.MATERIALI[mat];
    if (!m || m.tipo === 'ROH') throw Error('Scegli il materiale da produrre.');
    var qta = L.num(i.qta, 'Quantità', 1), data = M.controllaData(i.data), strat = S().strategie[mat];
    if (strat === '50' || strat === '20' || strat === 'DIP') {
      var scop = domandaScoperta(mat);
      if (qta > scop + 1e-9) {
        throw Error(mat + ' ha strategia ' + strat + ' (' + STRATEGIE[strat] + '): si produce solo per una domanda esistente. Domanda scoperta: ' + L.n0(scop) + ' pz.' +
          (m.tipo === 'FERT' ? ' Prima serve un ordine cliente (VA01).' : ' Prima serve l\'ordine del livello sopra, oppure la strategia 70 per produrlo a scorta.'));
      }
    }
    var c = L.ciclo(mat);
    var o = {id: String(1000000 + S().ordini.length + 1), mat: mat, qta: qta, data: data, strategia: strat,
      std: {unitario: L.costoStd(mat), comp: c.comp.map(function (x) { return {mat: x.mat, qta: x.qta * qta}; }), ore: c.ops.map(function (x) { return {centro: x.centro, ore: x.ore * qta}; })},
      prelievi: {}, ore: {}, entrati: 0, eventi: [], teco: null, chiusoLogistica: false, wip: 0, liquidazione: null};
    S().ordini.push(o); M.salva();
    return '<p class="lab-nota">Ordine <b>' + o.id + '</b> ' + mat + ' × ' + qta + ' rilasciato (REL). Costo standard ' + L.eur(o.std.unitario) + ' €/pz = ' + L.eur(o.std.unitario * qta) + ' € per il lotto. Nessuna scrittura: i costi arrivano con 261 e CO11N.</p>';
  }
  function attivo(o, data) {
    if (o.liquidazione) throw Error('Ordine ' + o.id + ' già liquidato (CLSD).');
    if (o.teco) throw Error('Ordine ' + o.id + ' chiuso tecnicamente (TECO).');
    if (data < o.data) throw Error('La data è anteriore all\'apertura dell\'ordine (' + L.fd(o.data) + ').');
  }
  function prelievo(i) {
    var o = ordine(i.ordine), data = M.controllaData(i.data); attivo(o, data);
    var mat = i.mat || (o.std.comp[0] || {}).mat, q = L.num(i.qta, 'Quantità', 0.001);
    if (!o.std.comp.some(function (c) { return c.mat === mat; })) throw Error(mat + ' non è un componente di ' + o.mat + '.');
    var val = L.r2(q * L.costoStd(mat)), mm = L.MATERIALI[mat];
    M.movimento(mat, -q, data, '261', o.id);
    o.prelievi[mat] = (o.prelievi[mat] || 0) + q;
    o.eventi.push({data: data, tipo: '261', mat: mat, qta: q, valore: val});
    var r = M.post({data: data, tipo: 'PP_261', rif: o.id, descrizione: 'Prelievo ' + L.fmtQ(q, mat) + ' ' + mat + ' all\'ordine ' + o.id + ' (' + o.mat + ') — 261',
      righe: [{conto: mm.tipo === 'ROH' ? '70' : '71', dareAvere: 'DARE', importo: val, oggetto: o.id}, {conto: mm.conto, dareAvere: 'AVERE', importo: val}]});
    M.salva(); return r;
  }
  function conferma(i) {
    var o = ordine(i.ordine), data = M.controllaData(i.data); attivo(o, data);
    var ore = L.num(i.ore, 'Ore', 0.01), centro = o.std.ore[0].centro, val = L.r2(ore * L.TARIFFA);
    o.ore[centro] = (o.ore[centro] || 0) + ore;
    o.eventi.push({data: data, tipo: 'CO11N', centro: centro, ore: ore, valore: val});
    var r = M.post({data: data, tipo: 'PP_CO11N', rif: o.id, descrizione: 'Conferma ordine ' + o.id + ' (' + o.mat + ') — ' + centro + ' ' + L.n0(ore) + ' h × ' + L.TARIFFA + ' €/h',
      righe: [{conto: '72', dareAvere: 'DARE', importo: val, oggetto: o.id}, {conto: '75', dareAvere: 'AVERE', importo: val, oggetto: centro}]});
    M.salva(); return r;
  }
  function entrata(i) {
    var o = ordine(i.ordine), data = M.controllaData(i.data); attivo(o, data);
    var q = L.num(i.qta, 'Quantità', 1);
    if (o.entrati + q > o.qta + 1e-9) throw Error('Oltre la quantità dell\'ordine: restano ' + (o.qta - o.entrati) + ' pz.');
    var val = L.r2(q * o.std.unitario), mm = L.MATERIALI[o.mat];
    M.movimento(o.mat, q, data, '101', o.id);
    o.entrati += q; o.eventi.push({data: data, tipo: '101', qta: q, valore: val});
    if (o.entrati >= o.qta) o.chiusoLogistica = true;
    var r = M.post({data: data, tipo: 'PP_101', rif: o.id, descrizione: 'Entrata ' + q + ' pz ' + o.mat + ' da ordine ' + o.id + ' a costo standard — 101' + (o.chiusoLogistica ? ' (consegna completa: DLV)' : ' (parziale: PDLV)'),
      righe: [{conto: mm.conto, dareAvere: 'DARE', importo: val}, {conto: '73', dareAvere: 'AVERE', importo: val, oggetto: o.id}]});
    M.salva(); return r;
  }
  function teco(i) {
    var o = ordine(i.ordine), data = L.dataOk(i.data);
    if (o.liquidazione) throw Error('Ordine già liquidato.');
    if (o.teco) throw Error('Ordine già chiuso tecnicamente il ' + L.fd(o.teco) + '.');
    if (data < o.data) throw Error('Data anteriore all\'apertura dell\'ordine.');
    o.teco = data; o.chiusoLogistica = true; M.salva();
    return '<p class="lab-nota">Ordine ' + o.id + ' chiuso tecnicamente (TECO): niente più prelievi né conferme. Il WIP si annullerà e la varianza si calcolerà alla prossima chiusura di periodo.</p>';
  }
  function venditaCrea(i) {
    var mat = i.mat; if (L.FINITI.indexOf(mat) < 0) throw Error('Scegli una transenna.');
    var data = M.controllaData(i.data), q = L.num(i.qta, 'Quantità', 1), cliente = String(i.cliente || '').trim(), rif = String(i.rif || '').trim();
    if (!cliente || !rif) throw Error('Scrivi cliente e riferimento.');
    if (S().ordiniCliente.some(function (c) { return c.rif.toUpperCase() === rif.toUpperCase(); })) throw Error('Riferimento ' + rif + ' già usato.');
    var c = {id: String(10000000 + S().ordiniCliente.length + 1), rif: rif, cliente: cliente, mat: mat, qta: q, data: data, consegnaRichiesta: i.consegna || '', consegnati: 0, consegne: []};
    S().ordiniCliente.push(c); M.salva();
    var pf = S().giacenze[mat], sl = S().giacenze['SL-PIEGA'];
    return '<p class="lab-nota">Ordine cliente <b>' + c.id + '</b> ' + cliente + ' · ' + mat + ' × ' + q + '. ATP: prodotto finito disponibile ' + L.n0(pf) + ' pz · SL-PIEGA a scaffale ' + L.n0(sl) + ' pz' +
      (pf < q && sl >= q ? ' → <b>basta l\'ordine di assemblaggio</b>: il cliente aspetta solo la saldatura.' : '') + '</p>';
  }
  function consegna(i) {
    var c = S().ordiniCliente.find(function (x) { return x.id === i.ordineCliente || x.rif === i.ordineCliente; });
    if (!c) throw Error('Scegli l\'ordine cliente.');
    var data = M.controllaData(i.data), q = L.num(i.qta, 'Quantità', 1);
    if (c.consegnati + q > c.qta + 1e-9) throw Error('Oltre l\'ordinato: restano ' + (c.qta - c.consegnati) + ' pz.');
    var val = L.r2(q * L.costoStd(c.mat));
    M.movimento(c.mat, -q, data, '601', c.id);
    c.consegnati += q; c.consegne.push({data: data, qta: q});
    var r = M.post({data: data, tipo: 'DDT_601', rif: c.id, descrizione: 'Uscita merci ' + q + ' pz ' + c.mat + ' — ' + c.cliente + ' (' + c.rif + ') — 601',
      righe: [{conto: '41', dareAvere: 'DARE', importo: val}, {conto: '13', dareAvere: 'AVERE', importo: val}]});
    M.salva(); return r;
  }

  // ── costi dell'ordine alla data ──
  function costi(o, fino) {
    var ev = o.eventi.filter(function (e) { return !fino || e.data <= fino; });
    var eff = ev.filter(function (e) { return e.tipo !== '101'; }).reduce(function (t, e) { return t + e.valore; }, 0);
    var entr = ev.filter(function (e) { return e.tipo === '101'; }).reduce(function (t, e) { return t + e.qta; }, 0);
    return {effettivo: L.r2(eff), entrati: entr, consegnato: L.r2(entr * o.std.unitario)};
  }
  function finito(o, fino) { var c = costi(o, fino); return c.entrati >= o.qta || (o.teco && o.teco <= fino); }
  // varianze per categoria (KKS2) sulla quantità entrata
  function varianze(o, fino) {
    var c = costi(o, fino), q = c.entrati, ev = o.eventi.filter(function (e) { return e.data <= fino; }), cat = [];
    o.std.comp.forEach(function (sc) {
      var usato = ev.filter(function (e) { return e.tipo === '261' && e.mat === sc.mat; }).reduce(function (t, e) { return t + e.qta; }, 0);
      var perPz = sc.qta / o.qta, v = L.r2((usato - perPz * q) * L.costoStd(sc.mat));
      cat.push({cat: 'Quantità materiale ' + sc.mat, std: L.n0(perPz * q), eff: L.n0(usato), varianza: v});
    });
    o.std.ore.forEach(function (so) {
      var ore = ev.filter(function (e) { return e.tipo === 'CO11N'; }).reduce(function (t, e) { return t + e.ore; }, 0);
      var perPz = so.ore / o.qta, v = L.r2((ore - perPz * q) * L.TARIFFA);
      cat.push({cat: 'Efficienza ' + so.centro, std: L.n0(perPz * q) + ' h', eff: L.n0(ore) + ' h', varianza: v});
    });
    var tot = L.r2(c.effettivo - c.consegnato), somma = L.r2(cat.reduce(function (t, x) { return t + x.varianza; }, 0));
    if (Math.abs(tot - somma) > 0.005) cat.push({cat: 'Residuo', std: '', eff: '', varianza: L.r2(tot - somma)});
    return {totale: tot, categorie: cat};
  }

  function chiusura(i) {
    var periodo = String(i.periodo || '');
    if (!/^\d{4}-\d{2}$/.test(periodo)) throw Error('Periodo nel formato AAAA-MM.');
    var fine = L.fineMese(periodo), s = S();
    if (s.periodi.some(function (p) { return p.periodo === periodo && !p.annullato; })) throw Error('Periodo ' + periodo + ' già chiuso.');
    var prec = s.periodi.filter(function (p) { return !p.annullato; }).map(function (p) { return p.periodo; }).sort().pop();
    if (prec && periodo <= prec) throw Error('Chiudi i periodi in ordine: l\'ultimo chiuso è ' + prec + '.');
    var regs = [], righe = [];
    s.ordini.filter(function (o) { return !o.liquidazione && o.data <= fine; }).forEach(function (o) {
      var c = costi(o, fine);
      if (finito(o, fine)) {
        var v = varianze(o, fine);
        if (o.wip) regs.push(M.post({data: fine, tipo: 'PP_WIP', rif: o.id, descrizione: 'Storno WIP ordine ' + o.id + ' (' + o.mat + ') — ordine completato (KKAX)',
          righe: [{conto: '74', dareAvere: 'DARE', importo: o.wip}, {conto: '15', dareAvere: 'AVERE', importo: o.wip}]}));
        regs.push(M.post({data: fine, tipo: 'PP_VARIANZA', rif: o.id, descrizione: 'Varianza ordine ' + o.id + ' (' + o.mat + ') ' + (v.totale >= 0 ? 'sfavorevole' : 'favorevole') + ' — KKS2 e liquidazione CO88',
          righe: [{conto: '61', dareAvere: 'DARE', importo: v.totale, oggetto: o.id}, {conto: '73', dareAvere: 'AVERE', importo: v.totale, oggetto: o.id}]}));
        righe.push({ordine: o.id, mat: o.mat, esito: 'liquidato (CLSD)', wipPrima: o.wip, wip: 0, varianza: v.totale});
        o.wipStorico = (o.wipStorico || []).concat([{periodo: periodo, wip: 0}]);
        o.wip = 0; o.liquidazione = {periodo: periodo, varianza: v.totale, categorie: v.categorie};
      } else {
        var wip = L.r2(c.effettivo - c.consegnato), delta = L.r2(wip - o.wip);
        if (Math.abs(delta) >= 0.005) regs.push(M.post({data: fine, tipo: 'PP_WIP', rif: o.id, descrizione: 'WIP ordine aperto ' + o.id + ' (' + o.mat + ') a fine ' + periodo + ' — KKAX',
          righe: [{conto: '15', dareAvere: 'DARE', importo: delta}, {conto: '74', dareAvere: 'AVERE', importo: delta}]}));
        righe.push({ordine: o.id, mat: o.mat, esito: 'aperto: WIP', wipPrima: o.wip, wip: wip, varianza: null});
        o.wipStorico = (o.wipStorico || []).concat([{periodo: periodo, wip: wip}]);
        o.wip = wip;
      }
    });
    s.periodi.push({periodo: periodo, fine: fine, righe: righe, regs: regs.filter(Boolean).map(function (r) { return r.id; })});
    M.salva();
    return '<p class="lab-nota">Chiusura ' + periodo + ' eseguita.</p>' + L.tabella(['Ordine', 'Materiale', 'Esito', 'WIP prima›', 'WIP ora›', 'Varianza›'],
      righe.map(function (x) { return [x.ordine, x.mat, x.esito, L.eur(x.wipPrima), L.eur(x.wip), x.varianza == null ? '—' : L.eur(x.varianza)]; }), 'Nessun ordine nel periodo.') + L.righeScrittura(regs.filter(Boolean));
  }

  // ── cruscotto ──
  var giorni = function (a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); };
  function ultimaData() { var d = S().registrazioni.map(function (r) { return r.data; }).concat(S().ordini.map(function (o) { return o.data; })).sort().pop(); return d || '2026-11-01'; }
  function kpi(rif) {
    var s = S(); rif = rif || ultimaData();
    var aperti = s.ordini.filter(function (o) { return o.data <= rif && !finito(o, rif); }).map(function (o) {
      var c = costi(o, rif), eta = giorni(o.data, rif);
      return {id: o.id, mat: o.mat, eta: eta, fascia: eta <= 30 ? '0–30' : eta <= 90 ? '31–90' : 'oltre 90', wip: L.r2(c.effettivo - c.consegnato)};
    });
    var wip = L.r2(aperti.reduce(function (t, o) { return t + o.wip; }, 0));
    var da = new Date(Date.parse(rif) - 29 * 86400000).toISOString().slice(0, 10);
    var cdv = L.r2(s.registrazioni.filter(function (r) { return r.data >= da && r.data <= rif; }).reduce(function (t, r) {
      return t + r.righe.filter(function (x) { return x.conto === '41'; }).reduce(function (u, x) { return u + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0); }, 0));
    var consumoSL = s.movimenti.filter(function (m) { return m.mat === 'SL-PIEGA' && m.qta < 0 && m.data >= da && m.data <= rif; }).reduce(function (t, m) { return t - m.qta; }, 0);
    var gSL = s.movimenti.filter(function (m) { return m.mat === 'SL-PIEGA' && m.data <= rif; }).reduce(function (t, m) { return t + m.qta; }, 0);
    return {rif: rif, aperti: aperti, wip: wip, cdvGiorno: L.r2(cdv / 30), wipGiorni: cdv > 0 ? L.r2(wip / (cdv / 30)) : null,
            giacenzaSL: gSL, consumoSLGiorno: L.r2(consumoSL / 30), coperturaSL: consumoSL > 0 ? L.r2(gSL / (consumoSL / 30)) : null};
  }
  // buffer DDMRP sul semilavorato di disaccoppiamento (formule di Ptak e Smith)
  function buffer(p) {
    var ADU = L.num(p.adu, 'ADU', 0), DLT = L.num(p.dlt, 'DLT', 0), LTF = L.num(p.ltf, 'LTF', 0), VF = L.num(p.vf, 'VF', 0), MOQ = L.num(p.moq, 'MOQ', 0), DOC = L.num(p.doc, 'DOC', 0);
    var rb = ADU * DLT * LTF, rs = rb * VF, rosso = rb + rs, giallo = ADU * DLT, verde = Math.max(ADU * DLT * LTF, MOQ, ADU * DOC);
    var s = S(), inArrivo = s.ordini.filter(function (o) { return o.mat === 'SL-PIEGA' && !o.chiusoLogistica; }).reduce(function (t, o) { return t + o.qta - o.entrati; }, 0);
    var domanda = s.ordini.filter(function (o) { return !o.chiusoLogistica; }).reduce(function (t, o) {
      return t + o.std.comp.filter(function (c) { return c.mat === 'SL-PIEGA'; }).reduce(function (u, c) { return u + c.qta - (o.prelievi['SL-PIEGA'] || 0); }, 0); }, 0)
      + L.FINITI.reduce(function (t, m) { return t + domandaScoperta(m); }, 0);
    var g = p.giacenza != null && p.giacenza !== '' ? L.num(p.giacenza, 'Giacenza', 0) : s.giacenze['SL-PIEGA'];
    var ia = p.inArrivo != null && p.inArrivo !== '' ? L.num(p.inArrivo, 'In arrivo', 0) : inArrivo;
    var dq = p.domanda != null && p.domanda !== '' ? L.num(p.domanda, 'Domanda qualificata', 0) : domanda;
    var nfp = g + ia - dq, cimaRosso = rosso, cimaGiallo = rosso + giallo, cimaVerde = rosso + giallo + verde;
    return {rossoBase: L.r2(rb), rossoSic: L.r2(rs), rosso: L.r2(rosso), giallo: L.r2(giallo), verde: L.r2(verde), cimaRosso: L.r2(cimaRosso), cimaGiallo: L.r2(cimaGiallo), cimaVerde: L.r2(cimaVerde),
            giacenza: g, inArrivo: ia, domanda: dq, nfp: L.r2(nfp), ordina: nfp < cimaGiallo ? Math.ceil(L.r2(cimaVerde - nfp)) : 0,
            zona: nfp <= cimaRosso ? 'rossa' : nfp <= cimaGiallo ? 'gialla' : nfp <= cimaVerde ? 'verde' : 'oltre la verde', priorita: cimaVerde ? L.r2(nfp / cimaVerde * 100) : 0,
            mediaAttesa: L.r2(rosso + verde / 2)};
  }
  // confronto: la stessa produzione con UN solo ordine dal ferro al finito («commessa lunga»)
  function commessaLunga(mesiAttesa) {
    var s = S(), mesi = [], eventi = [];
    // in un ordine unico i semilavorati non passano dal magazzino: contano solo ferro e lavorazioni
    s.ordini.forEach(function (o) { o.eventi.forEach(function (e) { if (e.tipo === 'CO11N' || (e.tipo === '261' && e.mat === 'FERRO')) eventi.push({data: e.data, valore: e.valore, mat: o.mat}); }); });
    if (!eventi.length) return null;
    eventi.sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    var inizio = s.ordini.map(function (o) { return o.data; }).sort()[0];
    var consegne = s.ordiniCliente.reduce(function (t, c) { return t.concat(c.consegne); }, []).map(function (c) { return c.data; }).sort();
    var consegnato = consegne.length > 0, fineReale = consegne.pop() || eventi[eventi.length - 1].data;
    // nel modello sbagliato i semilavorati non vanno a scaffale: tutto resta sull'ordine finché il cliente ordina
    var ritardo = Math.max(0, parseInt(mesiAttesa || 0, 10));
    var p = inizio.slice(0, 7);
    var finePeriodo = function (q) { return L.fineMese(q); };
    var nextP = function (q) { var y = +q.slice(0, 4), m = +q.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return y + '-' + String(m).padStart(2, '0'); };
    var ultimoP = fineReale.slice(0, 7);
    for (var k = 0; k < ritardo; k++) ultimoP = nextP(ultimoP);
    var costiSL = eventi.filter(function (e) { return L.FINITI.indexOf(e.mat) < 0; });
    var costiPF = eventi.filter(function (e) { return L.FINITI.indexOf(e.mat) >= 0; });
    var spostaPF = function (d) { var dt = new Date(Date.parse(d)); dt.setUTCMonth(dt.getUTCMonth() + ritardo); return dt.toISOString().slice(0, 10); };
    while (p <= ultimoP) {
      var f = finePeriodo(p);
      var cum = costiSL.filter(function (e) { return e.data <= f; }).reduce(function (t, e) { return t + e.valore; }, 0)
              + costiPF.filter(function (e) { return spostaPF(e.data) <= f; }).reduce(function (t, e) { return t + e.valore; }, 0);
      var finita = consegnato && p === ultimoP;
      mesi.push({periodo: p, wipLungo: finita ? 0 : L.r2(cum), etaGiorni: giorni(inizio, f), wipCorretto: (kpiPeriodo(p) || 0)});
      p = nextP(p);
    }
    var totVar = L.r2(s.ordini.filter(function (o) { return o.liquidazione; }).reduce(function (t, o) { return t + o.liquidazione.varianza; }, 0));
    return {inizio: inizio, consegnato: consegnato, fine: finePeriodo(ultimoP), durata: giorni(inizio, finePeriodo(ultimoP)), mesi: mesi, varianzaUnica: totVar,
            leadTimeCliente: giorni(inizio, fineReale)};
  }
  function kpiPeriodo(p) { var per = S().periodi.find(function (x) { return x.periodo === p && !x.annullato; }); return per ? L.r2(per.righe.reduce(function (t, r) { return t + (r.wip || 0); }, 0)) : null; }
  function leadTime() {
    return S().ordiniCliente.filter(function (c) { return c.consegne.length; }).map(function (c) {
      return {rif: c.rif, cliente: c.cliente, mat: c.mat, ordine: c.data, consegna: c.consegne[c.consegne.length - 1].data, giorni: giorni(c.data, c.consegne[c.consegne.length - 1].data)};
    });
  }

  return {avvia: avvia, get M() { return M; }, STRATEGIE: STRATEGIE, STRATEGIE_PER: STRATEGIE_PER,
    impostaStrategia: impostaStrategia, creaOrdine: creaOrdine, prelievo: prelievo, conferma: conferma, entrata: entrata, teco: teco,
    venditaCrea: venditaCrea, consegna: consegna, chiusura: chiusura, costi: costi, varianze: varianze, finito: finito, domandaScoperta: domandaScoperta,
    kpi: kpi, buffer: buffer, commessaLunga: commessaLunga, leadTime: leadTime, ultimaData: ultimaData,
    entrataFerro: function (i) { return M.entrataFerro(i); }};
})();
