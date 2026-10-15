/* SISTEMA INTEGRATO — Innovazione dei sistemi logistici (UF 11): slotting ABC per frequenza di prelievo, prelievo a ondate
   con percorso ottimizzato, cross-docking opportunistico, KPI di magazzino, varco RFID (EPC SSCC-96).
   Modello delle distanze (metri, percorso a «L»): la porta di spedizione è in testa alla corsia 01;
   corsia 01/02/03 a 0/8/16 m; campata k a 3·k m lungo la corsia; il livello 2 aggiunge 2 m (carrello a forche alzate). */
window.IN4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; }, W = function () { return S().wm; }, WM = function () { return window.WM4; };
  function pos(b) {
    var m = /^(\d\d)-(\d\d)-(\d)$/.exec(b); if (m) return {x: (+m[2]) * 3, y: (+m[1] - 1) * 8, z: (+m[3] - 1) * 2};
    var f = /^F-(\d\d)$/.exec(b); if (f) return {x: (+f[1]) * 3, y: 26, z: 0};
    return {x: 0, y: 0, z: 0};   // GI-ZONE, GR-ZONE e aree interim: alla porta
  }
  var dist = function (a, b) { var p = pos(a), q = pos(b); return Math.abs(p.x - q.x) + Math.abs(p.y - q.y) + p.z + q.z; };
  var dPorta = function (b) { return dist('GI-ZONE', b); };
  // percorso di un giro di prelievo: dalla porta, ubicazioni nell'ordine dato, ritorno alla porta
  function percorso(bins) { var t = 0, da = 'GI-ZONE'; bins.forEach(function (b) { t += dist(da, b); da = b; }); return r2(t + dist(da, 'GI-ZONE')); }
  // ordine a serpentina: corsie in ordine, campate avanti nelle corsie dispari e indietro nelle pari
  function serpentina(bins) {
    return bins.slice().sort(function (a, b) { var p = pos(a), q = pos(b); if (p.y !== q.y) return p.y - q.y; var dir = (p.y / 8) % 2 === 0 ? 1 : -1; return dir * (p.x - q.x) || p.z - q.z; });
  }
  // ── slotting: classi ABC per numero di righe di prelievo ──
  function abcPrelievi() {
    var w = W(), conta = {};
    Object.keys(S().materiali).filter(function (m) { return S().materiali[m].tipo === 'FERT'; }).forEach(function (m) { conta[m] = 0; });
    (w ? w.compiti : []).forEach(function (t) { if (t.tipo === 'PICK' && t.stato === 'confermato' && conta[t.mat] !== undefined) conta[t.mat]++; });
    S().movimenti.forEach(function (x) { if (x.tipo === '601' && conta[x.mat] !== undefined && !(w && x.data >= w.attivo)) conta[x.mat]++; });   // prima del WMS: una riga per uscita
    var righe = Object.keys(conta).map(function (m) { return {mat: m, righe: conta[m]}; }).sort(function (a, b) { return b.righe - a.righe || (a.mat < b.mat ? -1 : 1); });
    var tot = righe.reduce(function (t, x) { return t + x.righe; }, 0), cum = 0;
    righe.forEach(function (x, i) { x.perc = tot ? r2(x.righe / tot * 100) : 0; cum = r2(cum + x.perc); x.cum = cum; x.classe = i === 0 || cum <= 80 ? 'A' : cum <= 95 ? 'B' : 'C'; });
    return righe;
  }
  function propostaSlotting() {
    var w = W(), u = w.ubicazioni, classi = {};
    abcPrelievi().forEach(function (x) { classi[x.mat] = x.classe; });
    var bins001 = Object.keys(u).filter(function (b) { return u[b].tipo === '001' && !u[b].blocco; });
    var libere = bins001.filter(function (b) { return WM().occupazione(b) === 0; }).sort(function (a, b) { return dPorta(a) - dPorta(b) || (a < b ? -1 : 1); });
    var pallet = WM().quanti(function (q) { return q.qta > 0 && u[q.ubic] && u[q.ubic].tipo === '001' && classi[q.mat] && classi[q.mat] !== 'C' && !WM().riservato(q.id); });
    var ordine = {A: 0, B: 1};
    pallet.sort(function (a, b) { return ordine[classi[a.mat]] - ordine[classi[b.mat]] || dPorta(b.ubic) - dPorta(a.ubic); });
    var out = [], prese = {};
    pallet.forEach(function (q) {
      var meglio = libere.find(function (b) { return !prese[b] && dPorta(b) < dPorta(q.ubic); });
      if (!meglio) return;
      prese[meglio] = 1;
      // l'ubicazione lasciata libera può servire a un pallet successivo
      libere.push(q.ubic); libere.sort(function (a, b) { return dPorta(a) - dPorta(b) || (a < b ? -1 : 1); });
      out.push({udc: q.udc, mat: q.mat, classe: classi[q.mat], da: q.ubic, a: meglio, prima: dPorta(q.ubic), dopo: dPorta(meglio), risparmio: dPorta(q.ubic) - dPorta(meglio)});
    });
    return out;
  }
  function applicaSlotting(i) {
    WM().richiesto(); var p = propostaSlotting(); if (!p.length) throw Error('Nessun pallet da avvicinare: lo slotting è già buono.');
    var data = N().data(i.data);
    p.forEach(function (x) { WM().trasferisci({udc: x.udc, a: x.a, motivo: 'slotting classe ' + x.classe, data: data}); });
    N().salva();
    return '<p class="lab-nota">Creati ' + p.length + ' compiti di trasferimento (slotting): ' + p.map(function (x) { return x.mat + ' ' + x.da + ' → ' + x.a; }).join(' · ') + '. Confermali con la pistola RF.</p>';
  }
  // ── prelievo a ondate ──
  function impostazioni(i) {
    WM().richiesto(); var w = W();
    w.ondate = i.ondate === true || i.ondate === 'true' || i.ondate === 'si'; w.crossDock = i.crossDock === true || i.crossDock === 'true' || i.crossDock === 'si';
    N().salva();
    return '<p class="lab-nota">Prelievo a ondate: <b>' + (w.ondate ? 'attivo' : 'spento') + '</b> · cross-docking opportunistico: <b>' + (w.crossDock ? 'attivo' : 'spento') + '</b>.</p>';
  }
  function inAttesa() { return S().consegne.filter(function (c) { return c.ondata === 'in attesa' && c.pgi === false; }); }
  function rilasciaOndata(i) {
    WM().richiesto(); var n = N(), data = n.data(i.data), w = W();
    var lista = inAttesa(); if (!lista.length) throw Error('Nessuna consegna in attesa di ondata.');
    var nome = 'ONDA-' + ((w.ondateRilasciate || []).length + 1), tutti = [];
    lista.forEach(function (c) { c.ondata = nome; tutti = tutti.concat(WM().creaPrelievo(c, data, nome)); });
    var seq = serpentina(tutti.map(function (t) { return t.da; }).filter(function (b, k, a) { return a.indexOf(b) === k; }));
    tutti.sort(function (a, b) { return seq.indexOf(a.da) - seq.indexOf(b.da); }).forEach(function (t, k) { t.seq = k + 1; });
    var perOrdine = r2(lista.reduce(function (s, c) { return s + percorso(serpentina(tutti.filter(function (t) { return t.consegna === c.numero; }).map(function (t) { return t.da; }))); }, 0));
    var onda = percorso(seq);
    w.ondateRilasciate = (w.ondateRilasciate || []).concat([{nome: nome, data: data, consegne: lista.map(function (c) { return c.numero; }), compiti: tutti.map(function (t) { return t.numero; }), metriOrdine: perOrdine, metriOnda: onda}]);
    n.salva();
    return '<p class="lab-nota">Ondata <b>' + nome + '</b> rilasciata: ' + lista.length + ' consegne, ' + tutti.length + ' compiti in un solo giro a serpentina. Percorso: <b>' + L.n0(onda) + ' m</b> invece di ' + L.n0(perOrdine) + ' m con un giro per ordine (−' + L.n0(perOrdine ? (1 - onda / perOrdine) * 100 : 0) + '%).</p>';
  }
  // ── KPI di magazzino ──
  var giorni = function (a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); };
  function kpi() {
    var s = S(), w = W() || {compiti: [], inventari: [], ubicazioni: {}};
    var righeInv = (w.inventari || []).filter(function (d) { return d.stato === 'chiuso'; }).reduce(function (a, d) { return a.concat(d.righe); }, []);
    var esatte = righeInv.filter(function (r) { return (r.conta2 !== null && r.conta2 !== undefined ? r.conta2 : r.conta1) === r.libro; }).length;
    var uscite = s.consegne.filter(function (c) { return c.wm && c.pgi; });
    var perfette = uscite.filter(function (c) { var o = s.ordini.find(function (x) { return x.numero === c.ordine; }); return o && c.qta === o.qta && giorni(o.data, c.pgi) <= 3; });
    var cicli = uscite.map(function (c) { var o = s.ordini.find(function (x) { return x.numero === c.ordine; }); return o ? giorni(o.data, c.pgi) : 0; });
    var put = (w.compiti || []).filter(function (t) { return t.tipo === 'PUTAWAY' && t.stato === 'confermato'; });
    var pick = (w.compiti || []).filter(function (t) { return t.tipo === 'PICK' && t.stato === 'confermato'; });
    var perRis = {}; (w.compiti || []).filter(function (t) { return t.stato === 'confermato'; }).forEach(function (t) { var r = t.risorsa || '(scrivania)'; perRis[r] = (perRis[r] || 0) + 1; });
    var u = w.ubicazioni || {}, b001 = Object.keys(u).filter(function (b) { return u[b].tipo === '001'; });
    var occ = b001.filter(function (b) { return WM().occupazione(b) > 0; }).length;
    var valUscite = s.movimenti.filter(function (x) { return x.tipo === '601' || x.tipo === '261'; }).reduce(function (t, x) { return t - x.qta * s.materiali[x.mat].std; }, 0);
    var valGiac = Object.keys(s.giacenze).reduce(function (t, m) { return t + (s.giacenze[m] || 0) * s.materiali[m].std; }, 0);
    var gg = s.avviato ? Math.max(1, giorni(s.avviato, s.movimenti.reduce(function (d, x) { return x.data > d ? x.data : d; }, s.avviato))) : 1;
    return {accuratezza: righeInv.length ? r2(esatte / righeInv.length * 100) : null, posizioniContate: righeInv.length,
      ordiniPerfetti: uscite.length ? r2(perfette.length / uscite.length * 100) : null, consegneWm: uscite.length,
      cicloMedio: cicli.length ? r2(cicli.reduce(function (a, b) { return a + b; }, 0) / cicli.length) : null,
      dockToStock: put.length ? r2(put.reduce(function (a, t) { return a + giorni(t.creato, t.confermato); }, 0) / put.length) : null,
      distanzaMedia: pick.length ? r2(pick.reduce(function (a, t) { return a + dist('GI-ZONE', t.da) * 2; }, 0) / pick.length) : null, righePrelievo: pick.length,
      saturazione: b001.length ? r2(occ / b001.length * 100) : null, rotazione: valGiac ? r2(valUscite / valGiac) : null,
      copertura: valUscite ? r2(valGiac / (valUscite / gg)) : null, giorniOsservati: gg, perRisorsa: perRis};
  }
  // ── RFID: EPC SSCC-96 dal codice SSCC e lettura di massa al varco della porta ──
  function epc(sscc) {   // urn:epc:id:sscc:<prefisso>.<estensione + seriale>  (la cifra di controllo non entra nell'EPC)
    var pref = sscc.slice(1, 8), ref = sscc.slice(0, 1) + sscc.slice(8, 17);
    return 'urn:epc:id:sscc:' + pref + '.' + ref;
  }
  function varco(i) {
    var SP = window.SP4, t = SP.SP().trasporti.find(function (x) { return x.numero === String(i.trasporto); });
    if (!t) throw Error('Trasporto inesistente.');
    var colli = t.consegne.reduce(function (a, k) { return a.concat(SP.colliDi(k)); }, []).filter(function (x) { return !x.caricato; });
    if (!colli.length) throw Error('Nessun collo da caricare su questo trasporto.');
    var letti = colli.map(function (x) { SP.carica({sscc: x.sscc, trasporto: t.numero, data: i.data}); x.rfid = epc(x.sscc); return x; });
    t.rfid = (t.rfid || 0) + letti.length; N().salva();
    return '<p class="lab-nota">📡 Varco RFID della porta: letti <b>' + letti.length + ' tag in un passaggio</b> (circa 1 secondo), senza aprire né girare i pallet: ' + letti.map(function (x) { return x.rfid; }).join(' · ') + '. Con il barcode sarebbero ' + letti.length + ' letture una per una (circa ' + letti.length * 15 + ' secondi).</p>';
  }
  return {pos: pos, dist: dist, dPorta: dPorta, percorso: percorso, serpentina: serpentina, abcPrelievi: abcPrelievi, propostaSlotting: propostaSlotting, applicaSlotting: applicaSlotting,
    impostazioni: impostazioni, inAttesa: inAttesa, rilasciaOndata: rilasciaOndata, kpi: kpi, epc: epc, varco: varco};
})();
