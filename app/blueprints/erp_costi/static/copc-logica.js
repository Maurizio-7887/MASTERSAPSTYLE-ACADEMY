/* SISTEMA INTEGRATO — CO-PC costi del prodotto e Material Ledger.
   Scheda di calcolo (KZS2/KZZ2): materiale diretto + sovraccosto materiale % · lavorazione + attrezzaggio (fisso per lotto) + sovraccosto di produzione %.
   CK11N calcola il costo standard sul lotto di calcolo · CK24 marca e rilascia: nuovo prezzo standard e rivalutazione del magazzino (D 13 / A 64).
   Fine mese: KGI2 sovraccosti sugli ordini (D 78 / A 76) · KKS2 varianze per categoria (anche di LOTTO) · KO88 liquidazione (D 61 / A 73).
   Material Ledger (CKM3 / CKMLCP): differenze prezzo di acquisti e produzione, a più livelli, ripartite tra venduto (D 42) e rimanenze (D 12 · D 13). */
window.PC4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var C = function () { return S().costing; };
  var mese = function (d) { return String(d).slice(0, 7); };

  // azienda nuova: scheda di calcolo senza sovraccosti, tariffa 28 €/h, lotto 100; costi standard già rilasciati per i tre livelli
  window.S4.dopoAvvio.push(function (n, i) {
    if (!i || i.modo !== 'costituzione') return;
    var s = n.S; s.costing.scheda = {sovrMat: 0, sovrProd: 0, tariffa: 28, lotto: 100, confermata: true};
    var ordine = ['SL-TAGLIO', 'SL-PIEGA'].filter(function (m) { return !!s.materiali[m]; }).concat(Object.keys(s.materiali).filter(function (m) { return s.materiali[m].tipo === 'FERT'; }));
    ordine.forEach(function (m) {
      var el = elementi(m, 100), st = {materiale: m, data: s.avviato, lotto: 100, elementi: el, unitario: r2(el.totale / 100), stato: 'FR', variante: 'PPC1', rilascio: s.avviato};
      s.costing.stime[m] = st; s.materiali[m].std = st.unitario;
      s.costing.rilasci.push({materiale: m, data: s.avviato, vecchio: st.unitario, nuovo: st.unitario, giacenza: 0, rivalutazione: 0, contabile: '', costituzione: true});
    });
  });
  // elementi di costo per un lotto di q pezzi (CK11N mostra gli stessi elementi, come KKBC)
  // componente diretto: il ferro (semilavorati «fantasma») oppure, nell'azienda nuova a tre stadi, il semilavorato del livello sotto
  var componente = function (m) { return m.comp || {mat: 'FERRO', q: m.ferro}; };
  // prezzo del componente: la stima non ancora rilasciata (calcolo a più livelli, CK11N «roll-up»), altrimenti lo standard
  var prezzoComp = function (mat) { var st = C().stime[mat]; return st && st.stato !== 'FR' ? st.unitario : N().materiale(mat).std; };
  function elementi(mat, q, par) {
    if (par && par.snapshot) return elementiSnapshot(par.snapshot, q);
    if (!par && cpm && cpm.attivo()) return elementiSnapshot(cpm.fotografia(mat), q);
    var m = N().materiale(mat), sc = par || C().scheda, cp = componente(m), prezzo = prezzoComp(cp.mat);
    var oreVar = Object.keys(m.ore).reduce(function (t, k) { return t + m.ore[k]; }, 0);
    var kg = r2(cp.q * q), x = {kg: kg, comp: cp.mat, um: N().materiale(cp.mat).um || 'kg', ore: r2(oreVar * q), oreSet: m.attrezzaggio, q: q};
    x.mat = r2(kg * prezzo); x.sovrMat = r2(x.mat * sc.sovrMat / 100);
    x.lav = r2(x.ore * sc.tariffa); x.set = r2(m.attrezzaggio * sc.tariffa); x.sovrProd = r2((x.lav + x.set) * sc.sovrProd / 100);
    x.totale = r2(x.mat + x.sovrMat + x.lav + x.set + x.sovrProd);
    x.centri = Object.keys(m.ore).map(function (k) { return {centro: k, ore: r2(m.ore[k] * q), valore: r2(m.ore[k] * q * sc.tariffa)}; });
    x.par = {sovrMat: sc.sovrMat, sovrProd: sc.sovrProd, tariffa: sc.tariffa, lotto: sc.lotto};
    // Anche i nuovi ordini del percorso storico congelano i dati utilizzati.
    x.par.snapshot = {versione: 'legacy-snapshot-v1', materiale: mat, componente: {mat: cp.mat, q: cp.q, prezzo: prezzo},
      ore: JSON.parse(JSON.stringify(m.ore)), attrezzaggio: m.attrezzaggio, centroSet: Object.keys(m.ore)[0],
      tariffe: Object.keys(m.ore).reduce(function (t, k) { t[k] = sc.tariffa; return t; }, {}),
      scheda: {sovrMat: sc.sovrMat, sovrProd: sc.sovrProd, tariffa: sc.tariffa, lotto: sc.lotto}, fasi: m.fasi ? m.fasi.slice() : null};
    return x;
  }
  function elementiSnapshot(s, q) {
    var sc = s.scheda, cp = s.componente, cs = Object.keys(s.ore).map(function (k) {
      return {centro: k, ore: r2(s.ore[k] * q), tariffa: s.tariffe[k], valore: r2(s.ore[k] * q * s.tariffe[k])};
    });
    var x = {q: q, comp: cp.mat, um: N().materiale(cp.mat).um || 'kg', kg: r2(cp.q * q),
      ore: r2(cs.reduce(function (t, c) { return t + c.ore; }, 0)), oreSet: s.attrezzaggio, centri: cs};
    x.mat = r2(cp.q * q * cp.prezzo); x.sovrMat = r2(x.mat * sc.sovrMat / 100);
    x.lav = r2(cs.reduce(function (t, c) { return t + c.valore; }, 0));
    x.set = r2(s.attrezzaggio * (s.tariffe[s.centroSet] == null ? sc.tariffa : s.tariffe[s.centroSet])); x.sovrProd = r2((x.lav + x.set) * sc.sovrProd / 100);
    x.totale = r2(x.mat + x.sovrMat + x.lav + x.set + x.sovrProd);
    x.par = Object.assign({}, sc, {snapshot: JSON.parse(JSON.stringify(s))});
    return x;
  }
  function scheda(i) {
    var sc = C().scheda;
    sc.sovrMat = L.num(i.sovrMat, 'Sovraccosto materiale %', 0); sc.sovrProd = L.num(i.sovrProd, 'Sovraccosto di produzione %', 0);
    sc.tariffa = L.num(i.tariffa, 'Tariffa €/h', 0.01); sc.lotto = L.num(i.lotto, 'Lotto di calcolo', 1); sc.confermata = true;
    N().salva();
    return '<p class="lab-nota">Scheda di calcolo ZFT01 salvata: sovraccosto materiale ' + L.n0(sc.sovrMat) + '% · sovraccosto di produzione ' + L.n0(sc.sovrProd) + '% · tariffa ' + L.eur(sc.tariffa) + ' €/h · lotto di calcolo ' + L.n0(sc.lotto) + ' pz. Vale per i prossimi calcoli (CK11N) e per i sovraccosti a fine mese (KGI2).</p>';
  }
  // CK11N: stima del costo standard
  function calcola(i) {
    var data = N().data(i.data), mat = i.materiale, m = N().materiale(mat);
    if (m.tipo !== 'FERT' && m.tipo !== 'HALB') throw Error('Il calcolo del costo si fa sui prodotti finiti e sui semilavorati; il ferro ha un prezzo d\'acquisto.');
    if (cpm.attivo()) cpm.richiediKSPI();
    var lotto = C().scheda.lotto, el = elementi(mat, lotto);
    var st = {materiale: mat, data: data, lotto: lotto, elementi: el, unitario: r2(el.totale / lotto), stato: 'KA', variante: 'PPC1'};
    C().stime[mat] = st; N().salva();
    return '<p class="lab-nota">Stima dei costi salvata (stato KA): <b>' + mat + '</b> ' + L.eur(st.unitario) + ' €/pz (standard attuale ' + L.eur(m.std) + '). Ora marca e rilascia (CK24).</p>' + tabellaStima(st);
  }
  function tabellaStima(st) {
    var el = st.elementi;
    return L.tabella(['Riga', 'Elemento di costo', 'Base›', 'Lotto ' + L.n0(st.lotto) + ' pz €›', 'Per pezzo €›'], [
      ['10', 'Materiale diretto (' + (el.comp && el.comp !== 'FERRO' ? el.comp : 'ferro') + ')', L.n0(el.kg) + ' ' + (el.um || 'kg'), L.eur(el.mat), L.eur(el.mat / st.lotto)],
      ['20', 'Sovraccosto materiale', L.n0(el.par.sovrMat) + ' % di 10', L.eur(el.sovrMat), L.eur(el.sovrMat / st.lotto)],
      ['30', 'Lavorazione (' + (el.centri || []).map(function (c) { return c.centro; }).join(', ') + ')', L.n0(el.ore) + ' h', L.eur(el.lav), L.eur(el.lav / st.lotto)],
      ['40', 'Attrezzaggio (fisso per lotto)', L.n0(el.oreSet) + ' h', L.eur(el.set), L.eur(el.set / st.lotto)],
      ['50', 'Sovraccosto di produzione', L.n0(el.par.sovrProd) + ' % di 30+40', L.eur(el.sovrProd), L.eur(el.sovrProd / st.lotto)],
      {cls: 'tot', celle: ['', 'Costo di produzione', '', L.eur(el.totale), L.eur(st.unitario)]}]);
  }
  function marca(i) {
    var mats = i.materiale ? [i.materiale] : Object.keys(C().stime);
    var fatti = mats.filter(function (m) { var s = C().stime[m]; if (s && s.stato === 'KA') { s.stato = 'VO'; return true; } return false; });
    if (!fatti.length) throw Error('Nessuna stima da marcare: calcola prima con CK11N (stato KA).');
    N().salva();
    return '<p class="lab-nota">Marcate (stato VO): ' + fatti.join(', ') + '. Il prezzo standard futuro è proposto; con «Rilascia» diventa il costo standard e il magazzino si rivaluta.</p>';
  }
  function rilascia(i) {
    var n = N(), data = n.data(i.data), per = mese(data);
    var mats = Object.keys(C().stime).filter(function (m) { return C().stime[m].stato === 'VO'; });
    if (!mats.length) throw Error('Nessuna stima marcata: prima «Marca» (CK24).');
    var bootstrap = [];
    mats.forEach(function (m) {
      var conflitti = C().rilasci.filter(function (r) { return r.materiale === m && mese(r.data) === per && !r.sostituitoCPM; });
      if (conflitti.length) {
        var snap = C().stime[m].elementi.par.snapshot;
        var primoCPM = cpm.attivo() && snap && snap.versione === 'cpm-centri-v1' && !C().rilasci.some(function (r) { return r.cpm; });
        var vuoto = !S().produzione.length && !S().ordini.length && !S().movimenti.length && Object.keys(S().giacenze).every(function (k) { return Math.abs(S().giacenze[k]) < 1e-9; });
        if (i.sostituisciBootstrap === 'SOSTITUISCI' && primoCPM && vuoto && conflitti.every(function (r) { return r.costituzione === true; })) bootstrap = bootstrap.concat(conflitti);
        else throw Error('Costo standard di ' + m + ' già rilasciato nel periodo ' + per + ': un solo rilascio per periodo. Solo il primo CPM può sostituire esplicitamente il bootstrap di costituzione, con stock, movimenti e ordini vuoti (scrivi SOSTITUISCI).');
      }
      if (cpm.attivo() && (!C().stime[m].elementi.par.snapshot || C().stime[m].elementi.par.snapshot.revisione !== cpm.modello().revisione)) throw Error('Stima non aggiornata alla revisione CPM: ricalcola prima del rilascio.');
      if (S().movimenti.some(function (x) { return x.mat === m && mese(x.data) === per && x.data < data; })) throw Error(m + ' ha già movimenti di magazzino nel periodo ' + per + ': il nuovo standard si rilascia all\'inizio del periodo.');
    });
    bootstrap.forEach(function (r) { r.sostituitoCPM = {data: data, revisione: cpm.modello().revisione}; });
    var righe = [], dett = [];
    mats.forEach(function (m) {
      var st = C().stime[m], mm = n.materiale(m), g = S().giacenze[m] || 0, delta = r2(g * (st.unitario - mm.std));
      dett.push({materiale: m, data: data, vecchio: mm.std, nuovo: st.unitario, giacenza: g, rivalutazione: delta, cpm: cpm.attivo() ? cpm.modello().revisione : null});
      if (Math.abs(delta) > 0.004) righe.push({conto: '13', dareAvere: 'DARE', importo: delta, testo: m + ' ' + g + ' pz × (' + L.eur(st.unitario) + ' − ' + L.eur(mm.std) + ')'});
      mm.std = st.unitario; st.stato = 'FR'; st.rilascio = data;
    });
    var tot = r2(dett.reduce(function (t, x) { return t + x.rivalutazione; }, 0));
    var r = null;
    if (righe.length) { righe.push({conto: '64', dareAvere: 'AVERE', importo: tot}); r = n.post({data: data, tipo: 'CAMBIO_PREZZO', rif: 'CK24', descrizione: 'CK24 rilascio del costo standard ' + per + ' — rivalutazione del magazzino', righe: righe}); }
    dett.forEach(function (x) { x.contabile = r ? r.numero : ''; C().rilasci.push(x); });
    n.salva(); return r || '<p class="lab-nota">Costi standard rilasciati: nessuna giacenza da rivalutare.</p>';
  }
  // pianificazione dell'ordine (CO01): il costo standard deve essere rilasciato
  function pianifica(mat, q, data) {
    var st = C().stime[mat];
    if (!st || st.stato !== 'FR') throw Error('Per ' + mat + ' manca un costo standard rilasciato (CK11N + CK24): senza, l\'ordine non ha costi obiettivo.');
    if (cpm.attivo() && (!st.elementi.par.snapshot || st.elementi.par.snapshot.revisione !== cpm.modello().revisione))
      throw Error('Budget o standard CPM modificato: ricalcola e rilascia lo standard (CK11N/CK24) prima di nuovi ordini. Gli ordini già avviati conservano lo snapshot.');
    var el = cpm.attivo() ? elementi(mat, q, st.elementi.par) : elementi(mat, q); el.stima = {data: st.data, lotto: st.lotto, totale: st.elementi.totale, unitario: st.unitario};
    return el;
  }
  // KGI2: sovraccosti sugli ordini aperti, sui costi effettivi
  function sovraccosti(i) {
    var n = N(), data = n.data(i.data), regs = [];
    S().produzione.filter(function (o) { return !o.liquidazione && o.data <= data; }).forEach(function (o) {
      var e = window.PP4.effettivi(o), dm = r2(e.sovrDovuti.mat - e.sovrMat), dp = r2(e.sovrDovuti.prod - e.sovrProd);
      if (Math.abs(dm) < 0.005 && Math.abs(dp) < 0.005) return;
      o.eventi.push({tipo: 'KGI2', data: data, mat: dm, prod: dp});
      regs.push(n.post({data: data, tipo: 'SOVRACCOSTI', rif: o.numero, descrizione: 'KGI2 sovraccosti ordine ' + o.numero + ' (' + o.materiale + '): materiale ' + L.eur(dm) + ' + produzione ' + L.eur(dp),
        righe: [{conto: '78', dareAvere: 'DARE', importo: r2(dm + dp), partner: o.numero}, {conto: '76', dareAvere: 'AVERE', importo: r2(dm + dp), testo: 'centri sovraccosti (magazzino, servizi di produzione)'}]}));
    });
    if (!regs.length) throw Error('Nessun sovraccosto da addebitare: gli ordini aperti sono già aggiornati.');
    n.salva(); return regs;
  }
  // KKS2: varianze per categoria
  function varianze(o) {
    var e = window.PP4.effettivi(o), q = e.entrati, st = o.piano.stima;
    var plan = elementi(o.materiale, q || o.qta, o.piano.par);
    var target = q ? r2(st.totale * q / st.lotto) : 0;
    var cat = [
      {cat: 'Quantità materiale (' + (plan.comp && plan.comp !== 'FERRO' ? plan.comp : 'ferro') + ')', piano: L.n0(plan.kg) + ' ' + plan.um, eff: L.n0(e.kg) + ' ' + plan.um, v: r2(e.mat - plan.mat)},
      {cat: 'Quantità attività — lavorazione', piano: L.n0(plan.ore) + ' h', eff: L.n0(e.ore) + ' h', v: r2(e.lav - plan.lav)},
      {cat: 'Quantità attività — attrezzaggio', piano: L.n0(plan.oreSet) + ' h', eff: L.n0(e.oreSet) + ' h', v: r2(e.set - plan.set)},
      {cat: 'Sovraccosti (seguono gli input)', piano: L.eur(plan.sovrMat + plan.sovrProd), eff: L.eur(e.sovrMat + e.sovrProd), v: r2(e.sovrMat + e.sovrProd - plan.sovrMat - plan.sovrProd)},
      {cat: 'Varianza di LOTTO (attrezzaggio su ' + L.n0(q) + ' pz invece di ' + L.n0(st.lotto) + ')', piano: L.eur(plan.totale), eff: 'obiettivo ' + L.eur(target), v: r2(plan.totale - target)},
      {cat: 'Prezzo dell\'output (standard arrotondato a ' + L.eur(st.unitario) + ')', piano: 'obiettivo ' + L.eur(target), eff: 'accredito ' + L.eur(e.accredito), v: r2(target - e.accredito)},
    ];
    var tot = r2(e.totale - e.accredito), somma = r2(cat.reduce(function (t, x) { return t + x.v; }, 0));
    if (Math.abs(tot - somma) > 0.004) cat.push({cat: 'Altre varianze', piano: '', eff: '', v: r2(tot - somma)});
    return {totale: tot, categorie: cat, obiettivo: target, effettivi: e, piano: plan};
  }
  // KO88: liquidazione delle varianze (ordini consegnati o TECO)
  function liquida(i) {
    var n = N(), data = n.data(i.data), regs = [];
    var lista = S().produzione.filter(function (o) { return !o.liquidazione && (i.ordine ? o.numero === String(i.ordine) : true); });
    lista = lista.filter(function (o) { var e = window.PP4.effettivi(o); return e.entrati >= o.qta || o.teco; });
    if (!lista.length) throw Error('Nessun ordine da liquidare: servono ordini consegnati per intero (DLV) o chiusi tecnicamente (TECO).');
    lista.forEach(function (o) {
      var e = window.PP4.effettivi(o);
      if (Math.abs(e.sovrDovuti.mat - e.sovrMat) > 0.004 || Math.abs(e.sovrDovuti.prod - e.sovrProd) > 0.004) throw Error('Ordine ' + o.numero + ': esegui prima i sovraccosti (KGI2), altrimenti la varianza è incompleta.');
      if (data < o.eventi.reduce(function (d, x) { return x.data > d ? x.data : d; }, o.data)) throw Error('Ordine ' + o.numero + ': la liquidazione non può precedere l\'ultimo movimento.');
    });
    lista.forEach(function (o) {
      var v = varianze(o);
      regs.push(n.post({data: data, tipo: 'LIQUIDAZIONE', rif: o.numero, descrizione: 'KKS2 + KO88 ordine ' + o.numero + ' (' + o.materiale + '): varianza ' + (v.totale >= 0 ? 'sfavorevole ' : 'favorevole ') + L.eur(Math.abs(v.totale)) + ' al materiale (Material Ledger)',
        righe: [{conto: '61', dareAvere: 'DARE', importo: v.totale, testo: o.materiale}, {conto: '73', dareAvere: 'AVERE', importo: v.totale, partner: o.numero}]}));
      o.liquidazione = {data: data, varianza: v.totale, categorie: v.categorie.map(function (c) { return {cat: c.cat, v: c.v}; })};
      if (Math.abs(v.totale) > 0.004) S().mlPD.push({data: data, mat: o.materiale, pd: v.totale, tipo: 'produzione', rif: o.numero, qta: v.effettivi.entrati});
    });
    n.salva(); return regs;
  }
  // ripartisce un importo in proporzione alle quantità; il resto di arrotondamento sull'ultima quota
  function ripartisci(tot, quote) {
    var q = quote.reduce(function (t, x) { return t + x.qta; }, 0), fatto = 0;
    return quote.map(function (x, i) { var v = i === quote.length - 1 ? r2(tot - fatto) : r2(q ? tot * x.qta / q : 0); fatto = r2(fatto + v); return Object.assign({}, x, {pd: v}); });
  }
  // Material Ledger: determinazione del prezzo a un livello e a più livelli (CKMLCP) — anteprima o chiusura
  function ml(periodo, registra, data) {
    var n = N(), s = S(), inizio = periodo + '-01', fine = L.fineMese(periodo);
    if (!/^\d{4}-\d{2}$/.test(periodo)) throw Error('Periodo nel formato AAAA-MM.');
    var prec = C().ml.slice(-1)[0], avvisi = [];
    var aperti = s.produzione.filter(function (o) { return !o.liquidazione && o.eventi.some(function (e) { return mese(e.data) === periodo; }); });
    if (aperti.length) avvisi.push('Ordini di produzione non ancora liquidati: ' + aperti.map(function (o) { return o.numero; }).join(', ') + ' (KGI2 + KO88).');
    var inPer = function (d) { return d >= inizio && d <= fine; };
    if (s.movimenti.some(function (x) { return inPer(x.data) && (s.materiali[x.mat] || {}).tipo === 'HALB'; }))
      avvisi.push('Nel periodo ci sono semilavorati (produzione a tre stadi): in questo sistema didattico il Material Ledger lavora solo con i semilavorati «fantasma». Le differenze prezzo restano sul conto 63 e le varianze sul 61, il magazzino resta a costo standard.');
    var mov = s.movimenti.filter(function (x) { return inPer(x.data); });
    var res = {periodo: periodo, materiali: {}, ferroOrdini: []};
    var base = function (m) {
      var std = n.materiale(m).std, beg = r2(s.movimenti.filter(function (x) { return x.mat === m && x.data < inizio; }).reduce(function (t, x) { return t + x.qta; }, 0));
      var begPD = prec && prec.materiali[m] ? prec.materiali[m].fine.pd : 0;
      var rec = r2(mov.filter(function (x) { return x.mat === m && x.qta > 0; }).reduce(function (t, x) { return t + x.qta; }, 0));
      var cons = r2(-mov.filter(function (x) { return x.mat === m && x.qta < 0; }).reduce(function (t, x) { return t + x.qta; }, 0));
      return {materiale: m, std: std, inizio: {qta: beg, pd: r2(begPD)}, entrate: {qta: rec, pd: 0, dettaglio: []}, consumi: {qta: cons, pd: 0}, fine: {}};
    };
    var chiudi = function (x) {
      var cq = r2(x.inizio.qta + x.entrate.qta), cpd = r2(x.inizio.pd + x.entrate.pd);
      x.cumulato = {qta: cq, valoreStd: r2(cq * x.std), pd: cpd};
      x.consumi.pd = cq > 0 ? r2(cpd * x.consumi.qta / cq) : 0;
      x.fine = {qta: r2(cq - x.consumi.qta), pd: r2(cpd - x.consumi.pd)};
      x.prezzoEffettivo = cq > 0 ? r2((cq * x.std + cpd) / cq) : x.std;
      return x;
    };
    // livello 1: ferro (differenze di acquisto e fattura)
    var fe = base('FERRO');
    s.mlPD.filter(function (p) { return p.mat === 'FERRO' && inPer(p.data); }).forEach(function (p) { fe.entrate.pd = r2(fe.entrate.pd + p.pd); fe.entrate.dettaglio.push({fonte: p.tipo === 'acquisto' ? 'Entrata merci ' + p.rif : 'Fattura ' + p.rif, pd: p.pd}); });
    chiudi(fe); res.materiali.FERRO = fe;
    var prel = mov.filter(function (x) { return x.mat === 'FERRO' && x.tipo === '261'; }).map(function (x) { return {ordine: x.rif, qta: -x.qta}; });
    res.ferroOrdini = ripartisci(fe.consumi.pd, prel);
    // livello 2: prodotti finiti (varianze degli ordini + differenze del ferro consumato, a più livelli)
    var vendite = [];
    Object.keys(s.materiali).filter(function (m) { return s.materiali[m].tipo === 'FERT'; }).forEach(function (m) {
      var x = base(m);
      s.mlPD.filter(function (p) { return p.mat === m && inPer(p.data); }).forEach(function (p) { x.entrate.pd = r2(x.entrate.pd + p.pd); x.entrate.dettaglio.push({fonte: 'Varianza ordine ' + p.rif + ' (KO88)', pd: p.pd}); });
      res.ferroOrdini.forEach(function (f) {
        var o = s.produzione.find(function (y) { return y.numero === f.ordine; });
        if (o && o.materiale === m) { x.entrate.pd = r2(x.entrate.pd + f.pd); x.entrate.dettaglio.push({fonte: 'Ferro consumato dall\'ordine ' + f.ordine + ' (più livelli)', pd: f.pd}); }
      });
      chiudi(x); res.materiali[m] = x;
      var usc = mov.filter(function (y) { return y.mat === m && y.qta < 0; }).map(function (y) { return {mat: m, rif: y.rif, tipo: y.tipo, qta: -y.qta}; });
      vendite = vendite.concat(ripartisci(x.consumi.pd, usc));
    });
    res.vendite = vendite; res.avvisi = avvisi;
    if (!registra) return res;
    if (C().ml.some(function (c) { return c.periodo === periodo; })) throw Error('Material Ledger del periodo ' + periodo + ' già chiuso.');
    if (prec && prec.periodo > periodo) throw Error('Chiudi i periodi in ordine: l\'ultimo chiuso è ' + prec.periodo + '.');
    if (avvisi.length) throw Error(avvisi[0]);
    data = n.data(data || fine); if (mese(data) !== periodo) throw Error('La data di chiusura deve cadere nel periodo ' + periodo + '.');
    var M = res.materiali, righe = [];
    var var12 = r2(M.FERRO.fine.pd - M.FERRO.inizio.pd), var13 = 0, cons42 = 0, pd63 = M.FERRO.entrate.pd, pd61 = 0;
    Object.keys(M).filter(function (m) { return m !== 'FERRO'; }).forEach(function (m) {
      var13 = r2(var13 + M[m].fine.pd - M[m].inizio.pd); cons42 = r2(cons42 + M[m].consumi.pd);
      s.mlPD.filter(function (p) { return p.mat === m && inPer(p.data); }).forEach(function (p) { pd61 = r2(pd61 + p.pd); });
    });
    righe.push({conto: '12', dareAvere: 'DARE', importo: var12, testo: 'rimanenza ferro al prezzo effettivo'}, {conto: '13', dareAvere: 'DARE', importo: var13, testo: 'rimanenze prodotti finiti al prezzo effettivo'},
      {conto: '42', dareAvere: 'DARE', importo: cons42, testo: 'differenze prezzo del venduto'}, {conto: '63', dareAvere: 'AVERE', importo: pd63, testo: 'chiusura differenze prezzo acquisti'},
      {conto: '61', dareAvere: 'AVERE', importo: pd61, testo: 'chiusura varianze di produzione'});
    var r = n.post({data: data, tipo: 'CHIUSURA_ML', rif: 'CKMLCP ' + periodo, descrizione: 'CKMLCP chiusura Material Ledger ' + periodo + ' — prezzi effettivi, a più livelli, venduto e rimanenze', righe: righe});
    // differenze prezzo del venduto al CO-PA, per cliente (dalle consegne)
    vendite.filter(function (v) { return Math.abs(v.pd) > 0.004 && v.tipo === '601'; }).forEach(function (v) {
      var o = s.ordini.find(function (y) { return y.numero === v.rif; }), cli = n.cliente(o.cliente);
      s.copa.push({doc: 'ML ' + periodo, data: data, tipo: 'ML', cliente: o.cliente, materiale: v.mat, regione: cli.regione, canale: cli.canale, gruppo: cli.gruppo,
        qta: 0, ricaviLordi: 0, scontiQuantita: 0, scontiCliente: 0, trasporti: 0, abbuoni: 0, costoVenduto: 0, provvigioni: 0, diffPrezzo: v.pd});
    });
    res.data = data; res.contabile = r ? r.numero : '';
    C().ml.push(JSON.parse(JSON.stringify(res)));
    n.salva(); return r;
  }
  // Laboratorio opt-in: nessuna migrazione dei saldi, nessuna scrittura FI di budget/consuntivo CO.
  var cpm = (function () {
    var CENTRI = ['Taglio', 'Piegatura', 'Saldatura'], NAT = ['personale', 'indiretti'];
    var copia = function (x) { return JSON.parse(JSON.stringify(x)); };
    function numero(v, nome, min) {
      // LabMotore presenta i campi in formato italiano (0,25; 36.000,00).
      // Parsing rigoroso: niente parseFloat parziale, Infinity o campi vuoti.
      if (typeof v === 'string') {
        v = v.trim();
        if (!/^-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(v)) throw Error(nome + ': valore numerico richiesto (virgola per i decimali).');
        v = Number(v.replace(/\./g, '').replace(',', '.'));
      }
      if (v === '' || v == null || !Number.isFinite(Number(v)) || Number(v) < (min || 0)) throw Error(nome + ': valore numerico non negativo richiesto.');
      return Number(v);
    }
    function modello() { return C().cpm || null; }
    function attivo() { return !!(modello() && modello().versione === 'cpm-centri-v1'); }
    function richiesto() { if (!attivo()) throw Error('Prima apri il piano CO dell’anno (CO → Centri, attività e classi di costo → passo 1).'); var m = modello(); migra(m); return m; }
    function attiva(i) {
      if (attivo()) throw Error('Laboratorio CPM già attivo: usa le modifiche versionate.');
      if (String((i || {}).conferma) !== 'ATTIVA') throw Error('Scrivi ATTIVA per creare il nuovo percorso CPM, senza modificare gli ordini pregressi.');
      var standard = {};
      Object.keys(S().materiali).forEach(function (mat) {
        var m = S().materiali[mat]; if (!m.ore) return;
        standard[mat] = {componente: copia(m.comp || {mat: 'FERRO', q: m.ferro}), ore: copia(m.ore), attrezzaggio: m.attrezzaggio || 0,
          centroSet: Object.keys(m.ore)[0], fasi: CENTRI.filter(function (k) { return m.ore[k] > 0; })};
      });
      // Nuova versione didattica dichiarata, non reinterpretazione della distinta storica.
      standard['TR-STD'] = {componente: {mat: 'FERRO', q: 8}, ore: {Taglio: .25, Piegatura: .20, Saldatura: .40}, attrezzaggio: 0, centroSet: 'Taglio', fasi: CENTRI.slice()};
      var centri = {}; CENTRI.forEach(function (k) { centri[k] = {personale: 36000, indiretti: 0, capacita: 1500, orePiano: 1500, percentuale: 100 / 3}; });
      C().cpm = {versione: 'cpm-centri-v1', revisione: 1, anno: Number(String(S().avviato || '2026').slice(0, 4)),
        centri: centri, generale: {produttivi: 18000, amministrativi: 0, driver: 'ore'}, volumi: {'TR-STD': 1200}, standard: standard, consuntivi: []};
      migra(C().cpm);
      N().salva(); return '<p class="lab-nota">CPM v1 attivo: nuova distinta TR-STD 8 kg, tre operazioni, setup zero. Nessun saldo o ordine pregresso modificato. Ricalcola e rilascia CK11N/CK24. Budget annuo 1.200 pz, distinto dall’ordine di 300.</p>';
    }
    function salvaBudget(i) {
      var m = richiesto(), b = copia(m), anno = numero(i.anno, 'Anno', 2000);
      if (!Number.isInteger(anno) || anno > 2100) throw Error('Anno richiesto fra 2000 e 2100.');
      // Il cambio esercizio richiede un nuovo spazio: non sovrascrive il budget di esercizi storici.
      if (anno !== m.anno) throw Error('Questo laboratorio è annuale: per un altro anno crea un nuovo spazio azienda.');
      b.generale = {produttivi: numero(i.produttivi, 'Generale produttivo'), amministrativi: numero(i.amministrativi, 'Generale amministrativo'), driver: i.driver};
      if (['ore', 'percentuali'].indexOf(i.driver) < 0) throw Error('Driver ammessi: ore o percentuali.');
      CENTRI.forEach(function (k) { var c = i.centri && i.centri[k]; if (!c) throw Error('Manca il centro ' + k);
        b.centri[k] = {personale: numero(c.personale, k + ' personale'), indiretti: numero(c.indiretti, k + ' indiretti'), capacita: numero(c.capacita, k + ' capacità', .001),
          orePiano: numero(c.orePiano, k + ' ore tariffa', .001), percentuale: numero(c.percentuale, k + ' quota %')};
        if (b.centri[k].orePiano > b.centri[k].capacita) throw Error(k + ': le ore pianificate tariffa non possono superare la capacità disponibile.');
      });
      if (i.driver === 'percentuali' && Math.abs(CENTRI.reduce(function (t, k) { return t + b.centri[k].percentuale; }, 0) - 100) > .001) throw Error('Le quote devono sommare a 100%.');
      var vol = {}; Object.keys(i.volumi || {}).forEach(function (mat) { if (!b.standard[mat]) throw Error('Prodotto non valido: ' + mat); vol[mat] = numero(i.volumi[mat], 'Volume annuo ' + mat); });
      if (!Object.keys(vol).length) throw Error('Inserisci almeno un volume annuale.');
      b.volumi = vol; b.piano = b.piano || {}; b.piano['0'] = pianoDaCampi(b); b.revisione++; C().cpm = b; N().salva(); return '<p class="lab-nota">Budget annuale aggiornato, revisione ' + b.revisione + '. Nessuna scrittura FI. Nuovi standard da calcolare/rilasciare; ordini esistenti invariati.</p>';
    }
    function validaStandard(mat, s, tutti) {
      if (!S().materiali[mat] || ['FERT', 'HALB'].indexOf(S().materiali[mat].tipo) < 0 || !tutti[mat]) throw Error('Materiale prodotto non valido.');
      if (!s.componente || !S().materiali[s.componente.mat]) throw Error('Componente inesistente.');
      s.componente.q = numero(s.componente.q, 'Quantità componente per pezzo', .000001);
      s.attrezzaggio = numero(s.attrezzaggio, 'Attrezzaggio');
      if (!s.ore || !Object.keys(s.ore).length || Object.keys(s.ore).some(function (k) { return CENTRI.indexOf(k) < 0; })) throw Error('Usa i centri Taglio, Piegatura, Saldatura.');
      Object.keys(s.ore).forEach(function (k) { s.ore[k] = numero(s.ore[k], k + ' ore per pezzo'); });
      s.fasi = CENTRI.filter(function (k) { return s.ore[k] > 0; });
      if (!s.fasi.length) throw Error('Almeno una fase con tempo positivo richiesta.');
      if (CENTRI.indexOf(s.centroSet) < 0 || !s.ore[s.centroSet]) throw Error('Il centro attrezzaggio deve essere una fase del ciclo.');
      var visti = [mat], cp = s.componente.mat;
      while (tutti[cp]) { if (visti.indexOf(cp) >= 0) throw Error('Ciclo nella distinta base.'); visti.push(cp); cp = tutti[cp].componente.mat; }
      if (cp === mat) throw Error('Distinta autoreferenziale.');
    }
    function salvaStandard(i) {
      var m = richiesto(), all = copia(m.standard), s = {componente: {mat: i.componente, q: i.quantita}, ore: copia(i.ore || {}), attrezzaggio: i.attrezzaggio, centroSet: i.centroSet};
      all[i.materiale] = s; validaStandard(i.materiale, s, all);
      m.standard = all; m.revisione++; N().salva(); return '<p class="lab-nota">Distinta/ciclo CPM salvati, revisione ' + m.revisione + '. Ricalcola e rilascia lo standard. Nessun ordine storico rivalutato.</p>';
    }
    function tariffe() {
      var m = richiesto(), base = CENTRI.reduce(function (t, k) { return t + m.centri[k].orePiano; }, 0), fatto = 0, out = {};
      CENTRI.forEach(function (k, idx) {
        var c = m.centri[k], quota = m.generale.driver === 'ore' ? c.orePiano / base : c.percentuale / 100;
        var rib = idx === CENTRI.length - 1 ? r2(m.generale.produttivi - fatto) : r2(m.generale.produttivi * quota); fatto = r2(fatto + rib);
        out[k] = {personale: c.personale, indiretti: c.indiretti, ribaltato: rib, budget: r2(c.personale + c.indiretti + rib), orePiano: c.orePiano,
          capacita: c.capacita, tariffa: (c.personale + c.indiretti + rib) / c.orePiano};
      }); return out;
    }
    function fotografia(mat) {
      var m = richiesto(), s = m.standard[mat]; if (!s) throw Error('Standard CPM mancante per ' + mat);
      var t = tariffe(), cp = s.componente;
      return {versione: m.versione, revisione: m.revisione, anno: m.anno, materiale: mat, componente: {mat: cp.mat, q: cp.q, prezzo: prezzoComp(cp.mat)},
        ore: copia(s.ore), attrezzaggio: s.attrezzaggio, centroSet: s.centroSet, fasi: s.fasi.slice(),
        tariffe: CENTRI.reduce(function (o, k) { o[k] = t[k].tariffa; return o; }, {}),
        // la scheda di calcolo (sovraccosti % e lotto) si somma alle tariffe dei centri, come il costing sheet di SAP accanto a KSPI
        scheda: {sovrMat: C().scheda.sovrMat || 0, sovrProd: C().scheda.sovrProd || 0, tariffa: 28, lotto: C().scheda.lotto}};
    }
    function tariffa(o, fase) {
      var s = o.piano.par.snapshot;
      if (!s) return S().costing.scheda.tariffa; // solo ordini pre-snapshot
      if (fase && s.tariffe[fase] != null) return s.tariffe[fase];
      if (s.versione === 'cpm-centri-v1' && Object.keys(s.ore).length > 1) throw Error('Seleziona il centro/fase dello snapshot.');
      var t = s.tariffe[Object.keys(s.ore)[0]]; return t == null ? s.scheda.tariffa : t;
    }
    function consuntivo(i) {
      var m = richiesto(), data = N().data(i.data), rif = String(i.riferimento || '').trim(), centro = i.centro, natura = i.natura;
      if (Number(data.slice(0, 4)) !== m.anno) throw Error('Il consuntivo deve appartenere all’anno di budget.');
      if (CENTRI.concat(['Generale']).indexOf(centro) < 0 || (centro === 'Generale' ? ['produttivi', 'amministrativi'] : NAT).indexOf(natura) < 0) throw Error('Centro/natura non validi.');
      if (!rif) throw Error('Riferimento fonte obbligatorio: usa il documento FI oppure una fonte sintetica univoca.');
      if (m.consuntivi.some(function (x) { return x.riferimento === rif && x.centro === centro && x.natura === natura; })) throw Error('Fonte già rilevata per questo centro e natura: nessun doppio conteggio.');
      m.consuntivi.push({data: data, riferimento: rif, centro: centro, natura: natura, importo: numero(i.importo, 'Costo primario')});
      N().salva(); return '<p class="lab-nota">Costo primario riportato solo nel prospetto CO: nessuna nuova spesa, attività o passività FI. Non aggiungere di nuovo le attività D72/A75 ai costi primari.</p>';
    }
    // periodo del report: dal mese di avvio (o gennaio) fino al mese scelto; di default l'ultimo mese con movimenti
    function periodo(m, mese) {
      var anno = m.anno, ultimo = '';
      S().registrazioni.forEach(function (r) { var d = String(r.data || ''); if (Number(d.slice(0, 4)) === anno && ESCLUSI.indexOf(r.tipo) < 0 && !r.chiusura && d > ultimo) ultimo = d; });
      S().produzione.forEach(function (o) { o.eventi.forEach(function (e) { var d = String(e.data || ''); if (!e.stornato && Number(d.slice(0, 4)) === anno && d > ultimo) ultimo = d; }); });
      var avv = String(S().avviato || ''), inizio = Number(avv.slice(0, 4)) === anno ? Number(avv.slice(5, 7)) : 1;
      var fine = mese != null && mese !== '' ? Number(mese) : (ultimo ? Number(ultimo.slice(5, 7)) : 12);
      if (!(fine >= 1 && fine <= 12)) throw Error('Mese non valido.');
      if (fine < inizio) fine = inizio;
      var mesi = fine - inizio + 1, per = anno + '-' + String(fine).padStart(2, '0');
      var paghe = S().registrazioni.some(function (r) { return r.tipo === 'PAGHE' && r.rif === 'PAGHE ' + per; });
      return {anno: anno, inizio: inizio, mese: fine, mesi: mesi, quota: mesi / 12, ultimaData: ultimo, pagheRegistrate: paghe, etichetta: per};
    }
    // saldo Dare − Avere di un conto FI nell'anno fino al mese (scritture di chiusura escluse)
    function saldoFI(conto, anno, mese) {
      var t = 0;
      S().registrazioni.forEach(function (r) { var d = String(r.data || '');
        if (ESCLUSI.indexOf(r.tipo) >= 0 || r.chiusura || Number(d.slice(0, 4)) !== anno || Number(d.slice(5, 7)) > mese) return;
        r.righe.forEach(function (x) { if (x.conto === conto) t += x.dareAvere === 'DARE' ? x.importo : -x.importo; }); });
      return r2(t);
    }
    function report(anno, opz) {
      var m = richiesto(); if (anno != null && Number(anno) !== m.anno) throw Error('Budget disponibile solo per ' + m.anno);
      var P = periodo(m, (opz || {}).mese), nelPeriodo = function (d) { d = String(d || ''); return Number(d.slice(0, 4)) === m.anno && Number(d.slice(5, 7)) <= P.mese; };
      var ts = tariffe(), richieste = {}, assorbito = {}, oreEff = {}, standardOutput = {}, primari = {}, generale = {produttivi: 0, amministrativi: 0};
      CENTRI.forEach(function (k) { richieste[k] = assorbito[k] = oreEff[k] = standardOutput[k] = primari[k] = 0; });
      Object.keys(m.volumi).forEach(function (mat) { var st = m.standard[mat]; CENTRI.forEach(function (k) { richieste[k] += (st.ore[k] || 0) * m.volumi[mat]; }); });
      m.consuntivi.forEach(function (x) { if (x.centro === 'Generale') generale[x.natura] += x.importo; else primari[x.centro] += x.importo; });
      // consuntivo automatico (S/4: ogni costo FI porta il centro di costo; senza centro vale la tabella OKB9)
      var fi = effettivi(m.anno, P.mese).perCentro;
      Object.keys(fi).forEach(function (cdc) { var tot = totale(fi[cdc]), c = cdcDi(cdc); if (!c) return;
        if (c.centro) primari[c.centro] += tot; else if (c.tipo === 'servizio') generale.produttivi += tot; else generale.amministrativi += tot; });
      var esclusiLegacy = 0;
      S().produzione.forEach(function (o) {
        var snap = o.piano.par.snapshot;
        if (!snap || snap.versione !== m.versione || snap.anno !== m.anno) { esclusiLegacy++; return; }
        o.eventi.filter(function (e) { return e.tipo === 'CO11N' && !e.stornato && nelPeriodo(e.data); }).forEach(function (e) {
          var k = e.centro || e.fase || snap.fasi[0]; assorbito[k] += e.valore; oreEff[k] += e.ore + e.attrezzaggio;
          standardOutput[k] += (snap.ore[k] || 0) * (e.qta || 0) * snap.tariffe[k];
        });
      });
      var base = CENTRI.reduce(function (t, k) { return t + m.centri[k].orePiano; }, 0), fatto = 0;
      var righe = CENTRI.map(function (k, idx) {
        var t = ts[k], quota = m.generale.driver === 'ore' ? m.centri[k].orePiano / base : m.centri[k].percentuale / 100;
        var rib = idx === 2 ? r2(generale.produttivi - fatto) : r2(generale.produttivi * quota); fatto = r2(fatto + rib);
        var eff = r2(primari[k] + rib), ass = r2(assorbito[k]), bp = r2(t.budget * P.quota);
        return Object.assign({centro: k}, t, {oreRichieste: r2(richieste[k]), saturazione: richieste[k] / t.capacita * 100,
          budgetPeriodo: bp, orePianoPeriodo: r2(t.orePiano * P.quota),
          oreEffettive: r2(oreEff[k]), primari: r2(primari[k]), ribaltatoEffettivo: rib, consuntivo: eff, assorbito: ass,
          residuo: r2(eff - ass), varianzaSpesa: r2(eff - bp), varianzaAssorbimento: r2(bp - ass),
          varianzaEfficienza: r2(ass - standardOutput[k])});
      });
      var prodotti = Object.keys(m.volumi).map(function (mat) {
        var st = elementi(mat, C().scheda.lotto), finiti = 0, costo = 0, accredito = 0, wip = 0, mat261 = 0, attOrd = 0;
        S().produzione.filter(function (o) { var sn = o.piano.par.snapshot; return o.materiale === mat && sn && sn.versione === m.versione && sn.anno === m.anno; }).forEach(function (o) {
          var costi = 0, out = 0, q = 0, att = 0;
          o.eventi.filter(function (e) { return !e.stornato && nelPeriodo(e.data); }).forEach(function (e) {
            if (e.tipo === '101') { q += e.qta; out += e.valore; }
            else if (e.tipo === '261' || e.tipo === 'CO11N') { costi += e.valore; if (e.tipo === 'CO11N') att += e.valore; }
            else if (e.tipo === 'KGI2') costi += e.mat + e.prod;
          });
          finiti += q; costo += costi; accredito += out; wip += Math.max(0, costi - out); mat261 += costi - att; attOrd += att;
        });
        return {materiale: mat, materiali: r2(mat261), attivita: r2(attOrd), volumeBudget: m.volumi[mat], volumeBudgetPeriodo: r2(m.volumi[mat] * P.quota), finiti: finiti, varianzaVolume: finiti - m.volumi[mat], standardUnitario: r2(st.totale / st.q),
          budgetProduzione: r2(m.volumi[mat] * st.totale / st.q), costiOrdini: r2(costo), accredito: r2(accredito), saldoOrdini: r2(costo - accredito), wip: r2(wip)};
      });
      return {anno: m.anno, revisione: m.revisione, periodo: P, fi: {attivita: saldoFI('72', m.anno, P.mese), accreditiCentri: saldoFI('75', m.anno, P.mese), output: saldoFI('73', m.anno, P.mese), materiali: saldoFI('70', m.anno, P.mese)},
        costiCentri: effettivi(m.anno, P.mese), centri: righe, prodotti: prodotti, generale: {budgetProduttivi: m.generale.produttivi, budgetAmministrativi: m.generale.amministrativi,
        produttivi: r2(generale.produttivi), amministrativi: r2(generale.amministrativi), residuoProduttivo: 0}, esclusiLegacy: esclusiLegacy,
        note: 'Costi primari effettivi letti automaticamente dalla contabilità FI dell’anno (centro della riga o assegnazione OKB9), più le eventuali rettifiche manuali. Assorbito = attività secondarie delle conferme, non ulteriore personale. Residuo = consuntivo − assorbito = varianza spesa + varianza assorbimento. Efficienza confronta ore dichiarate e standard dei pezzi confermati; comprende attrezzaggio. Ore annue richieste solo variabili: setup fisso escluso senza un piano annuale dei lotti. Budget valore prodotti al lotto di calcolo corrente: stima comparabile, non piano lotti annuale. Saldo prodotti = costi annuali degli ordini − accrediti annuali, prima della liquidazione; dettaglio WIP operativo e varianze finali nelle pagine PP/KKS2. Nessuna esplosione MRP multilivello automatica: pianificare i semilavorati autonomi separatamente.'};
    }
    // ── Anagrafiche CO (KS01 · KSH1 · KL01 · KA01): stessi codici dei centri delle paghe (PA30) ──
    var CDC = [
      {codice: '4100', nome: 'Magazzino', tipo: 'servizio', gruppo: 'H-SERV Centri di servizio di stabilimento', responsabile: 'Capo magazzino'},
      {codice: '4200', nome: 'Produzione · costi comuni di stabilimento', tipo: 'servizio', gruppo: 'H-SERV Centri di servizio di stabilimento', responsabile: 'Direttore di stabilimento'},
      {codice: '4210', nome: 'Taglio', tipo: 'produttivo', centro: 'Taglio', attivita: 'ORE-TAG', gruppo: 'H-PROD Centri produttivi', responsabile: 'Capo reparto taglio'},
      {codice: '4220', nome: 'Piegatura', tipo: 'produttivo', centro: 'Piegatura', attivita: 'ORE-PIE', gruppo: 'H-PROD Centri produttivi', responsabile: 'Capo reparto piegatura'},
      {codice: '4230', nome: 'Saldatura', tipo: 'produttivo', centro: 'Saldatura', attivita: 'ORE-SAL', gruppo: 'H-PROD Centri produttivi', responsabile: 'Capo reparto saldatura'},
      {codice: '4300', nome: 'Amministrazione', tipo: 'amministrativo', gruppo: 'H-AMM Amministrazione e vendite', responsabile: 'Direzione amministrativa'}];
    var CODICE = {Taglio: '4210', Piegatura: '4220', Saldatura: '4230'};
    // classi di costo primarie (tipo 1) = conti di costo del piano dei conti; secondarie (tipo 42/43) solo CO
    var CLASSI = [['80', 'Salari e stipendi', 'personale'], ['81', 'Oneri sociali', 'personale'], ['82', 'Trattamento di fine rapporto', 'personale'],
      ['50', 'Ammortamenti', 'indiretti'], ['54', 'Consulenze e servizi (energia, manutenzioni)', 'indiretti'], ['83', 'Assicurazioni', 'indiretti'], ['86', 'Fitti passivi', 'indiretti']];
    var SECONDARIE = [['943000', 'Ribaltamento costi di stabilimento (KSU5)', '42 · ribaltamento'], ['944000', 'Attività ore addebitate agli ordini (CO11N → conti 72/75)', '43 · computo interno attività']];
    var OKB9 = {'50': '4200', '54': '4200', '83': '4300', '86': '4200', '80': '4300', '81': '4300', '82': '4300'};
    var VERSIONI = {'0': 'Piano/consuntivo (versione operativa: tariffe e costi standard)', '1': 'Costi del personale dalle paghe (PCP)'};
    var ESCLUSI = ['EPILOGO', 'RISULTATO', 'CHIUSURA_SP', 'APERTURA', 'RIAPERTURA', 'DESTINAZIONE_UTILE', 'COSTITUZIONE'];
    function cdcDi(cod) { return CDC.find(function (c) { return c.codice === String(cod); }) || null; }
    function totale(o) { return r2(Object.keys(o || {}).reduce(function (t, k) { return t + (Number(o[k]) || 0); }, 0)); }
    function pianoDaCampi(m) {
      var p = {'4100': {}, '4200': {}, '4300': {}};
      CENTRI.forEach(function (k) { var c = m.centri[k], x = {}; if (c.personale) x['80'] = c.personale; if (c.indiretti) x['54'] = c.indiretti; p[CODICE[k]] = x; });
      if (m.generale.produttivi) p['4200']['54'] = m.generale.produttivi;
      if (m.generale.amministrativi) p['4300']['54'] = m.generale.amministrativi;
      return p;
    }
    // modelli creati prima delle anagrafiche: il piano per classi nasce dai valori salvati, senza cambiare un euro
    function migra(m) {
      if (!m.piano) m.piano = {'0': pianoDaCampi(m), '1': {}};
      if (!m.piano['1']) m.piano['1'] = {};
      if (!m.okb9) m.okb9 = copia(OKB9);
      if (!m.riattribuzioni) m.riattribuzioni = [];
      return m;
    }
    function deriva(b) {
      var p = b.piano['0'], pers = function (cdc) { return CLASSI.reduce(function (t, c) { return t + (c[2] === 'personale' ? Number((p[cdc] || {})[c[0]]) || 0 : 0); }, 0); };
      CENTRI.forEach(function (k) { var cdc = CODICE[k]; b.centri[k].personale = r2(pers(cdc)); b.centri[k].indiretti = r2(totale(p[cdc]) - pers(cdc)); });
      b.generale.produttivi = r2(totale(p['4100']) + totale(p['4200']));
      b.generale.amministrativi = r2(totale(p['4300']));
    }
    function nuovaRevisione(b, testo, passo) { if (passo) { b.fatti = b.fatti || {}; b.fatti[passo] = true; } b.revisione++; C().cpm = b; N().salva(); return '<p class="lab-nota">' + testo + ' Revisione del piano ' + b.revisione + ': esegui di nuovo il calcolo delle tariffe (KSPI), poi CK11N e CK24 prima dei nuovi ordini. Nessuna scrittura FI; gli ordini già avviati conservano il loro snapshot.</p>'; }
    // KP06: pianificazione costi primari per centro e classe di costo, in una versione
    function salvaKP06(i) {
      var b = copia(richiesto()), ver = String(i.versione == null ? '0' : i.versione), cdc = String(i.cdc || '');
      if (!VERSIONI[ver]) throw Error('Versione di piano non valida: usa 0 (operativa) o 1 (paghe).');
      if (!cdcDi(cdc)) throw Error('Centro di costo inesistente: ' + cdc + '.');
      var riga = {};
      CLASSI.forEach(function (c) { var v = i['k' + c[0]]; if (v === undefined || v === '') v = 0; var n = numero(v, 'Classe ' + c[0] + ' ' + c[1]); if (n) riga[c[0]] = n; });
      migra(b); b.piano[ver][cdc] = riga;
      if (ver !== '0') { C().cpm = b; N().salva(); return '<p class="lab-nota">Versione ' + ver + ' del centro ' + cdc + ' salvata: è un piano di confronto, non cambia tariffe né costi standard.</p>'; }
      deriva(b);
      return nuovaRevisione(b, 'Piano dei costi del centro ' + cdc + ' ' + cdcDi(cdc).nome + ' salvato: totale ' + L.eur(totale(riga)) + ' €.', 'kp06');
    }
    // PCP (pianificazione costi del personale): costo annuo a regime dei dipendenti in forza, per centro, dalle paghe
    function costoPaghe() {
      var py = window.PY4; if (!py) return {};
      var H = py.H(), p = H.parametri, out = {};
      H.dipendenti.forEach(function (d) {
        var o = out[d.cdc] = out[d.cdc] || {'80': 0, '81': 0, '82': 0, dipendenti: []};
        var lordo = r2(d.lordo * p.mensilita);
        o['80'] = r2(o['80'] + lordo); o['81'] = r2(o['81'] + lordo * (p.inpsDitta + p.inail) / 100); o['82'] = r2(o['82'] + lordo / p.tfrDivisore);
        o.dipendenti.push(d.nome + ' (' + d.mansione + ')');
      });
      return out;
    }
    function trasferisciPaghe(i) {
      var b = copia(richiesto()), ver = String(i.versione == null ? '1' : i.versione), pc = costoPaghe();
      if (!VERSIONI[ver]) throw Error('Versione di piano non valida.');
      if (ver === '0' && i.conferma !== 'SOSTITUISCI') throw Error('Nella versione 0 il trasferimento sostituisce il personale pianificato dei centri delle paghe e cambia le tariffe: scrivi SOSTITUISCI per confermare, oppure usa la versione 1 (confronto).');
      if (!Object.keys(pc).length) throw Error('Nessun dipendente nelle paghe (PA30).');
      migra(b);
      Object.keys(pc).forEach(function (cdc) { var r = b.piano[ver][cdc] = Object.assign({}, b.piano[ver][cdc] || {}); ['80', '81', '82'].forEach(function (k) { r[k] = r2(pc[cdc][k]); }); });
      var testo = 'Costi del personale trasferiti dalle paghe nella versione ' + ver + ': ' + Object.keys(pc).sort().map(function (k) { return k + ' ' + L.eur(pc[k]['80'] + pc[k]['81'] + pc[k]['82']) + ' €'; }).join(' · ') + '.';
      if (ver !== '0') { C().cpm = b; N().salva(); return '<p class="lab-nota">' + testo + ' Confrontali con il piano operativo nella tabella di controllo.</p>'; }
      deriva(b); return nuovaRevisione(b, testo, 'kp06');
    }
    // KP26: capacità e quantità di attività pianificata (ore tariffa) per centro
    function salvaKP26(i) {
      var b = copia(richiesto());
      CENTRI.forEach(function (k) {
        var cap = i[k + '_capacita'], ore = i[k + '_orePiano'];
        if (cap === undefined && ore === undefined) return;
        b.centri[k].capacita = numero(cap, k + ' capacità', .001); b.centri[k].orePiano = numero(ore, k + ' ore pianificate (denominatore della tariffa)', .001);
        if (b.centri[k].orePiano > b.centri[k].capacita) throw Error(k + ': le ore pianificate non possono superare la capacità disponibile.');
      });
      return nuovaRevisione(b, 'Attività pianificate salvate (tipo attività ORE dei tre centri produttivi).', 'kp26');
    }
    // LTP: volumi annui dei prodotti (servono a misurare la saturazione)
    function salvaVolumi(i) {
      var b = copia(richiesto()), vol = {};
      Object.keys(b.standard).forEach(function (mat) { var v = i['vol_' + mat]; if (v === undefined || v === '') v = b.volumi[mat] || 0; vol[mat] = numero(v, 'Volume annuo ' + mat); });
      b.volumi = vol; return nuovaRevisione(b, 'Volumi annui dei prodotti salvati.', 'ltp');
    }
    // KSU1: ciclo di ribaltamento dei centri di servizio 4100+4200 sui tre centri produttivi
    function salvaCiclo(i) {
      var b = copia(richiesto());
      if (['ore', 'percentuali'].indexOf(i.driver) < 0) throw Error('Regola del ciclo: ore pianificate oppure percentuali fisse.');
      b.generale.driver = i.driver;
      CENTRI.forEach(function (k) { if (i[k + '_percentuale'] !== undefined) b.centri[k].percentuale = numero(i[k + '_percentuale'], k + ' quota %'); });
      if (i.driver === 'percentuali' && Math.abs(CENTRI.reduce(function (t, k) { return t + b.centri[k].percentuale; }, 0) - 100) > .001) throw Error('Le quote del ciclo devono sommare a 100%.');
      return nuovaRevisione(b, 'Ciclo di ribaltamento FT-STAB salvato: regola ' + (i.driver === 'ore' ? 'ore pianificate' : 'percentuali fisse') + '.', 'ksu');
    }
    // KSPI: calcolo iterativo delle tariffe di piano (qui un solo passo: i centri di servizio non ricevono attività)
    function eseguiKSPI(i) {
      var m = richiesto(), data = N().data(i.data), t = tariffe();
      m.kspi = {revisione: m.revisione, data: data, tariffe: CENTRI.reduce(function (o, k) { o[k] = t[k].tariffa; return o; }, {})};
      N().salva();
      return '<p class="lab-nota">Tariffe di piano calcolate per la revisione ' + m.revisione + ': ' + CENTRI.map(function (k) { return CODICE[k] + ' ' + k + ' ' + L.eur(t[k].tariffa) + ' €/h'; }).join(' · ') + '. Ora CK11N può calcolare il costo standard.</p>';
    }
    function richiediKSPI() {
      var m = richiesto();
      if (!m.kspi || m.kspi.revisione !== m.revisione) throw Error('Manca il calcolo delle tariffe (KSPI) per la revisione ' + m.revisione + ' del piano: CO → Calcolo delle tariffe → Esegui. Senza tariffa delle attività CK11N non può valorizzare le ore.');
    }
    function okb9(i) {
      var m = richiesto();
      CLASSI.forEach(function (c) { var v = i['c' + c[0]]; if (v !== undefined && v !== '') { if (!cdcDi(v)) throw Error('Centro ' + v + ' inesistente.'); m.okb9[c[0]] = String(v); } });
      N().salva(); return '<p class="lab-nota">Assegnazioni automatiche OKB9 salvate: valgono per le righe di costo senza centro, anche già registrate (il consuntivo si rilegge dalla contabilità).</p>';
    }
    // consuntivo effettivo dei centri dalla contabilità FI (ACDOCA): riga con centro, altrimenti OKB9
    function effettivi(anno, mese) {
      var m = modello() ? migra(modello()) : {okb9: OKB9, riattribuzioni: []}, perCentro = {}, righe = [];
      var add = function (cdc, classe, imp) { var o = perCentro[cdc] = perCentro[cdc] || {}; o[classe] = r2((o[classe] || 0) + imp); };
      S().registrazioni.forEach(function (r) {
        if (ESCLUSI.indexOf(r.tipo) >= 0 || r.chiusura || Number(String(r.data).slice(0, 4)) !== Number(anno)) return;
        if (mese && Number(String(r.data).slice(5, 7)) > Number(mese)) return;
        r.righe.forEach(function (x) {
          if (!CLASSI.some(function (c) { return c[0] === x.conto; })) return;
          var cdc = x.cdc || m.okb9[x.conto], imp = x.dareAvere === 'DARE' ? x.importo : -x.importo;
          add(cdc, x.conto, imp);
          righe.push({data: r.data, documento: r.numero, tipo: r.tipo, cdc: cdc, origine: x.cdc ? 'riga FI' : 'OKB9', classe: x.conto, importo: r2(imp), testo: x.testo || r.descrizione});
        });
      });
      (m.riattribuzioni || []).forEach(function (x) {
        if (Number(String(x.data).slice(0, 4)) !== Number(anno) || (mese && Number(String(x.data).slice(5, 7)) > Number(mese))) return;
        add(x.da, x.classe, -x.importo); add(x.a, x.classe, x.importo);
        righe.push({data: x.data, documento: 'KB11N ' + x.numero, tipo: 'RIATTRIBUZIONE', cdc: x.da, origine: 'KB11N', classe: x.classe, importo: -x.importo, testo: x.testo});
        righe.push({data: x.data, documento: 'KB11N ' + x.numero, tipo: 'RIATTRIBUZIONE', cdc: x.a, origine: 'KB11N', classe: x.classe, importo: x.importo, testo: x.testo});
      });
      return {perCentro: perCentro, righe: righe};
    }
    // KB11N: riattribuzione manuale di un costo primario da un centro a un altro (solo CO, nessuna scrittura FI)
    function riattribuisci(i) {
      var m = richiesto(), data = N().data(i.data), da = String(i.da || ''), a = String(i.a || ''), classe = String(i.classe || '');
      if (!cdcDi(da) || !cdcDi(a) || da === a) throw Error('Scegli due centri di costo diversi.');
      if (!CLASSI.some(function (c) { return c[0] === classe; })) throw Error('Classe di costo primaria non valida.');
      if (Number(data.slice(0, 4)) !== m.anno) throw Error('La riattribuzione deve cadere nell’anno del piano ' + m.anno + '.');
      var imp = numero(i.importo, 'Importo', .01), disp = (effettivi(m.anno).perCentro[da] || {})[classe] || 0;
      if (imp > disp + 0.004) throw Error('Sul centro ' + da + ' per la classe ' + classe + ' ci sono solo ' + L.eur(disp) + ' € effettivi: non si riattribuisce più di quanto registrato.');
      m.riattribuzioni.push({numero: m.riattribuzioni.length + 1, data: data, da: da, a: a, classe: classe, importo: imp, testo: String(i.testo || '').trim() || 'riattribuzione manuale'});
      N().salva(); return '<p class="lab-nota">KB11N: ' + L.eur(imp) + ' € della classe ' + classe + ' spostati dal centro ' + da + ' al centro ' + a + '. Solo CO: la contabilità FI non cambia.</p>';
    }
    // tabella di controllo del budget del personale: paghe (PCP) ↔ piano ↔ consuntivo delle paghe registrate
    function controlloPersonale() {
      var m = richiesto(), pc = costoPaghe(), eff = effettivi(m.anno).perCentro, pers = function (o) { return r2(['80', '81', '82'].reduce(function (t, k) { return t + (Number((o || {})[k]) || 0); }, 0)); };
      return CDC.map(function (c) {
        var paghe = pc[c.codice] ? pers(pc[c.codice]) : 0, v0 = pers(m.piano['0'][c.codice]), v1 = pers(m.piano['1'][c.codice]), cons = pers(eff[c.codice]);
        return {cdc: c.codice, nome: c.nome, tipo: c.tipo, dipendenti: pc[c.codice] ? pc[c.codice].dipendenti : [], paghe: paghe, piano: v0, versione1: v1, differenza: r2(v0 - paghe), consuntivo: cons,
          consumo: v0 ? cons / v0 * 100 : null};
      });
    }
    function primo(m) { return migra(m); }
    // BPC → S/4 (retraction): il budget approvato sostituisce la versione 0 di KP06 per i centri ricevuti
    function retract(piano, testo) {
      var b = copia(richiesto()); migra(b);
      Object.keys(piano).forEach(function (cdc) { if (!cdcDi(cdc)) throw Error('Centro ' + cdc + ' inesistente.'); var r = {};
        Object.keys(piano[cdc]).forEach(function (k) { if (!CLASSI.some(function (c) { return c[0] === k; })) throw Error('Classe ' + k + ' non pianificabile.'); var v = r2(piano[cdc][k]); if (v < 0) throw Error('Importi negativi non ammessi nel piano.'); if (v) r[k] = v; });
        b.piano['0'][cdc] = r; });
      deriva(b); return nuovaRevisione(b, testo, 'kp06');
    }
    return {attivo: attivo, modello: modello, attiva: attiva, salvaBudget: salvaBudget, salvaStandard: salvaStandard, tariffe: tariffe, fotografia: fotografia, tariffa: tariffa, consuntivo: consuntivo, report: report, centri: CENTRI.slice(),
      CDC: CDC, CODICE: CODICE, CLASSI: CLASSI, SECONDARIE: SECONDARIE, VERSIONI: VERSIONI, cdcDi: cdcDi, totale: totale, prepara: function () { return primo(richiesto()); },
      salvaKP06: salvaKP06, trasferisciPaghe: trasferisciPaghe, costoPaghe: costoPaghe, salvaKP26: salvaKP26, salvaVolumi: salvaVolumi, salvaCiclo: salvaCiclo,
      eseguiKSPI: eseguiKSPI, richiediKSPI: richiediKSPI, retract: retract, okb9: okb9, effettivi: effettivi, riattribuisci: riattribuisci, controlloPersonale: controlloPersonale};
  })();
  return {cpm: cpm, elementi: elementi, scheda: scheda, calcola: calcola, tabellaStima: tabellaStima, marca: marca, rilascia: rilascia, pianifica: pianifica,
    sovraccosti: sovraccosti, varianze: varianze, liquida: liquida, ml: ml,
    chiusuraML: function (i) { return ml(String(i.periodo || ''), true, i.data); }};
})();
