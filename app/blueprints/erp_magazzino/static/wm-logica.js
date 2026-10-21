/* SISTEMA INTEGRATO — WMS in logica SAP (EWM / WM): numero magazzino W100.
   Tipi magazzino: 902 ricevimento (interim) · 001 scaffalatura porta-pallet · 002 catasta ferro · 100 approvvigionamento produzione (PSA)
   · 916 spedizione (interim) · 999 differenze (interim). Giacenze per ubicazione = quanti (materiale, quantità, unità di carico UdC, data di entrata).
   Ogni movimento fisico è un COMPITO DI MAGAZZINO (warehouse task / ordine di trasferimento): si crea, si conferma (anche dalla pistola RF).
   Strategie: messa a posto FERT → prossima ubicazione vuota; ferro → aggiunta a scorta esistente; prelievo → FIFO.
   La contabilità di magazzino (IM) cambia solo con entrate, uscite e differenze: WMS e IM devono sempre quadrare (LX23). */
window.WM4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; }, W = function () { return S().wm; };
  var TIPI = {
    '902': {nome: 'Zona di ricevimento (interim)', interim: true}, '001': {nome: 'Scaffalatura porta-pallet', interim: false},
    '002': {nome: 'Catasta ferro (a blocchi)', interim: false}, '100': {nome: 'Approvvigionamento produzione (PSA linea 1)', interim: true},
    '916': {nome: 'Zona di spedizione (interim)', interim: true}, '999': {nome: 'Differenze (interim)', interim: true},
    '980': {nome: 'Merce bloccata (quarantena)', interim: true}};
  var UDC = {FERT: 50, ROH: 1000, HALB: 100};   // pezzi per pallet · kg per fascio · kit di semilavorati per cassone metallico
  var RISORSE = ['MAG01 Marco', 'MAG02 Sara', 'MAG03 Luca', 'MAG04 Giulia'];
  var TIPI_COMPITO = {PUTAWAY: 'Messa a posto', PICK: 'Prelievo per consegna', STAGING: 'Approvvigionamento produzione', TRASF: 'Trasferimento tra ubicazioni', BLOCCO: 'Porta in quarantena'};

  function layout() {
    var u = {'GR-ZONE': {tipo: '902', cap: 0}, 'PSA-L1': {tipo: '100', cap: 0}, 'GI-ZONE': {tipo: '916', cap: 0}, 'DIFF': {tipo: '999', cap: 0}, 'Q-ZONE': {tipo: '980', cap: 0}};
    for (var c = 1; c <= 3; c++) for (var k = 1; k <= 5; k++) for (var l = 1; l <= 2; l++) u['0' + c + '-0' + k + '-' + l] = {tipo: '001', cap: 1, corsia: '0' + c};
    for (var f = 1; f <= 6; f++) u['F-0' + f] = {tipo: '002', cap: 2, corsia: 'F'};
    Object.keys(u).forEach(function (k) { u[k].blocco = ''; });
    return u;
  }
  var attivo = function (data) { var w = W(); return !!(w && w.attivo && (!data || data >= w.attivo)); };
  var richiesto = function () { if (!attivo()) throw Error('Il WMS non è attivo: Magazzino → Struttura → «Attiva il magazzino W100».'); };
  var tipoMat = function (m) { return N().materiale(m).tipo; };
  var quanti = function (f) { return W().quant.filter(function (q) { return Math.abs(q.qta) > 1e-9 && (!f || f(q)); }); };   // nella 999 un quanto può essere negativo (eccedenza)
  var inUbic = function (b) { return quanti(function (q) { return q.ubic === b; }); };
  // compiti aperti; quelli di un'ondata nell'ordine del percorso
  var aperti = function () { return W().compiti.filter(function (t) { return t.stato === 'aperto'; }).sort(function (a, b) { return (a.seq || 1e9) - (b.seq || 1e9) || (+a.numero) - (+b.numero); }); };
  var riservato = function (qid) { return r2(aperti().filter(function (t) { return t.quant === qid; }).reduce(function (s, t) { return s + t.qta; }, 0)); };
  var occupazione = function (b) {   // UdC presenti + UdC in arrivo (compiti aperti verso l'ubicazione)
    var udc = {}; inUbic(b).forEach(function (q) { udc[q.udc || q.id] = 1; });
    aperti().forEach(function (t) { if (t.a === b && t.tipo !== 'PICK' && t.tipo !== 'STAGING') udc['t' + t.numero] = 1; });
    return Object.keys(udc).length;
  };
  var nuovoQuant = function (ubic, mat, qta, udc, data, rif) { var q = {id: 'Q' + (++W().prossimoQuant), ubic: ubic, mat: mat, qta: r2(qta), udc: udc || '', data: data, rif: rif || ''}; W().quant.push(q); return q; };
  var numUdc = function () { return String(N().numero('udc')); };
  function libera(mat, escludi) {
    var u = W().ubicazioni, t = tipoMat(mat) === 'ROH' ? '002' : '001';
    var cand = Object.keys(u).filter(function (b) { return u[b].tipo === t && !u[b].blocco && b !== escludi; }).sort();
    if (t === '002') {   // aggiunta a scorta esistente
      var stesso = cand.filter(function (b) { return (inUbic(b).some(function (q) { return q.mat === mat; }) || aperti().some(function (t) { return t.a === b && t.mat === mat; })) && occupazione(b) < u[b].cap; })[0];
      if (stesso) return stesso;
    }
    var vuota = cand.filter(function (b) { return occupazione(b) === 0; })[0];
    if (!vuota) throw Error('Nessuna ubicazione libera nel tipo magazzino ' + t + ' (' + TIPI[t].nome + ').');
    return vuota;
  }
  function compito(x) {
    var t = Object.assign({numero: N().numero('compito'), stato: 'aperto', risorsa: '', confermato: null, qtaEff: null, diff: 0}, x);
    W().compiti.push(t); return t;
  }
  // FIFO sulle ubicazioni del tipo indicato (quanti non bloccati e non già riservati)
  function fifo(mat, qta, tipi) {
    var u = W().ubicazioni, out = [], resto = qta;
    quanti(function (q) { return q.qta > 0 && q.mat === mat && tipi.indexOf(u[q.ubic].tipo) >= 0 && !u[q.ubic].blocco; })
      .sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : a.ubic < b.ubic ? -1 : a.ubic > b.ubic ? 1 : (+a.id.slice(1)) - (+b.id.slice(1)); })
      .forEach(function (q) { if (resto <= 1e-9) return; var disp = r2(q.qta - riservato(q.id)); if (disp <= 1e-9) return; var x = Math.min(disp, resto); out.push({q: q, qta: r2(x)}); resto = r2(resto - x); });
    return {righe: out, mancante: resto};
  }

  // ── attivazione e carico iniziale ──
  function attiva(i) {
    var n = N(), s = S(), data = n.data(i.data);
    if (attivo()) throw Error('Il magazzino W100 è già attivo dal ' + L.fd(W().attivo) + '.');
    if (s.movimenti.some(function (m) { return m.data > data; })) throw Error('Ci sono movimenti di magazzino dopo il ' + L.fd(data) + ': attiva il WMS a una data successiva.');
    s.wm = {attivo: data, magazzino: 'W100', ubicazioni: layout(), quant: [], compiti: [], inventari: [], prossimoQuant: 0, carico: [], tolleranza: 20, risorse: RISORSE.slice(), registrazioni: []};
    Object.keys(s.materiali).forEach(function (m) {
      var g = s.giacenze[m] || 0, size = UDC[tipoMat(m)] || 50;
      while (g > 1e-9) { var q = Math.min(size, g), b = libera(m); var x = nuovoQuant(b, m, q, numUdc(), data, 'carico iniziale'); W().carico.push({ubic: b, mat: m, qta: x.qta, udc: x.udc}); g = r2(g - q); }
    });
    n.salva();
    return '<p class="lab-nota">Magazzino <b>W100</b> attivo dal ' + L.fd(data) + ': ' + Object.keys(W().ubicazioni).length + ' ubicazioni create. Carico iniziale di ' + W().carico.length + ' unità di carico dalle giacenze contabili (stessa quantità: IM e WMS quadrano). Nessuna scrittura contabile.</p>';
  }
  // ── entrate: in zona di ricevimento, con un compito di messa a posto per ogni UdC ──
  function entrata(mat, qta, data, rif, motivo) {
    var size = UDC[tipoMat(mat)] || 50, resto = qta, out = [];
    while (resto > 1e-9) {
      var q = Math.min(size, resto), u = numUdc(), x = nuovoQuant('GR-ZONE', mat, q, u, data, rif);
      out.push(compito({tipo: 'PUTAWAY', mat: mat, qta: x.qta, quant: x.id, udc: u, da: 'GR-ZONE', a: libera(mat), creato: data, rif: rif, motivo: motivo || ''}));
      resto = r2(resto - q);
    }
    return out;
  }
  // ── prelievo per una consegna (FIFO) verso la zona di spedizione ──
  function creaPrelievo(c, data, ondata) {
    var w = W();
    if (w.ondate && !ondata) { c.ondata = 'in attesa'; return []; }   // prelievo a ondate: i compiti nascono al rilascio dell'ondata
    // cross-docking opportunistico: si prende prima la merce appena entrata (in GR-ZONE, ancora da mettere a posto)
    if (w.crossDock) {
      var xd = [], resto = c.qta;
      quanti(function (q) { return q.ubic === 'GR-ZONE' && q.mat === c.materiale && q.qta > 0; }).forEach(function (q) {
        if (resto <= 1e-9) return;
        var pa = aperti().find(function (t) { return t.quant === q.id && t.tipo === 'PUTAWAY'; });
        if (!pa) return;
        pa.stato = 'annullato'; pa.confermato = data; pa.motivo = 'cross-docking verso la consegna ' + c.numero;
        var x = Math.min(q.qta, resto); resto = r2(resto - x);
        xd.push(compito({tipo: 'PICK', mat: c.materiale, qta: x, quant: q.id, udc: q.udc, da: 'GR-ZONE', a: 'GI-ZONE', creato: data, rif: c.numero, consegna: c.numero, crossDock: true}));
      });
      if (xd.length) { if (resto <= 1e-9) return xd; var f0 = fifo(c.materiale, resto, ['001', '002']); if (f0.mancante > 1e-9) throw Error('A magazzino mancano ' + L.n0(f0.mancante) + ' ' + c.materiale + '.');
        return xd.concat(f0.righe.map(function (x) { return compito({tipo: 'PICK', mat: c.materiale, qta: x.qta, quant: x.q.id, udc: x.q.udc, da: x.q.ubic, a: 'GI-ZONE', creato: data, rif: c.numero, consegna: c.numero, ondata: ondata || ''}); })); }
    }
    var f = fifo(c.materiale, c.qta, ['001', '002']);
    if (f.mancante > 1e-9) throw Error('A magazzino (scaffali) mancano ' + L.n0(f.mancante) + ' ' + c.materiale + ' disponibili: controlla le messe a posto aperte.');
    return f.righe.map(function (x) { return compito({tipo: 'PICK', mat: c.materiale, qta: x.qta, quant: x.q.id, udc: x.q.udc, da: x.q.ubic, a: 'GI-ZONE', creato: data, rif: c.numero, consegna: c.numero, ondata: ondata || ''}); });
  }
  function compitiDi(rif) { return attivo() ? W().compiti.filter(function (t) { return t.rif === rif; }) : []; }
  function statoPrelievo(c) {
    var t = W().compiti.filter(function (x) { return x.consegna === c.numero && x.tipo === 'PICK'; });
    var ap = t.filter(function (x) { return x.stato === 'aperto'; }).length, prel = r2(t.filter(function (x) { return x.stato === 'confermato'; }).reduce(function (s, x) { return s + x.qtaEff; }, 0));
    return {stato: !t.length ? (c.ondata === 'in attesa' ? 'A' : '') : ap === 0 ? 'C' : prel > 0 ? 'B' : 'A', aperti: ap, prelevato: prel, compiti: t};
  }
  function uscitaSpedizione(c, q) {
    var resto = q;
    quanti(function (x) { return x.ubic === 'GI-ZONE' && x.mat === c.materiale && x.rif === c.numero; }).forEach(function (x) { var d = Math.min(x.qta, resto); x.qta = r2(x.qta - d); resto = r2(resto - d); });
    if (resto > 1e-9) throw Error('In zona di spedizione mancano ' + resto + ' pz della consegna ' + c.numero + '.');
  }
  // ── approvvigionamento della produzione (staging) e consumo dal PSA ──
  function approvvigiona(i) {
    richiesto(); var n = N(), data = n.data(i.data), o = window.PP4.ord(i.ordine), cp = window.PP4.comp(o), cm = cp.mat, ferro = cm === 'FERRO', um = ferro ? 'kg' : 'pz';
    var kg = L.num(i.kg == null || i.kg === '' ? r2(cp.q * o.qta) : i.kg, ferro ? 'Ferro (kg)' : cm + ' (pz)', 1);
    var f = fifo(cm, kg, ferro ? ['002'] : ['001']);
    if (f.mancante > 1e-9) throw Error((ferro ? 'In catasta mancano ' + L.n0(f.mancante) + ' kg di ferro disponibili.' : 'A scaffale mancano ' + L.n0(f.mancante) + ' pz di ' + cm + ' disponibili: controlla che lo stadio prima sia entrato e messo a posto.'));
    var t = f.righe.map(function (x) { return compito({tipo: 'STAGING', mat: cm, qta: x.qta, quant: x.q.id, udc: x.q.udc, da: x.q.ubic, a: 'PSA-L1', creato: data, rif: o.numero, ordine: o.numero}); });
    n.salva();
    return '<p class="lab-nota">Creati ' + t.length + ' compiti di approvvigionamento (FIFO) per ' + L.n0(kg) + ' ' + um + ' di ' + (ferro ? 'ferro' : cm) + ' verso l\'area PSA-L1 dell\'ordine ' + o.numero + ': ' + t.map(function (x) { return x.numero + ' ' + x.da + ' ' + L.n0(x.qta) + ' ' + um; }).join(' · ') + '.</p>';
  }
  function consumaPSA(mat, qta, ordine) {
    var disp = r2(inUbic('PSA-L1').filter(function (q) { return q.mat === mat; }).reduce(function (s, q) { return s + q.qta; }, 0));
    if (disp + 1e-9 < qta) throw Error('WMS attivo: ' + (mat === 'FERRO' ? 'il ferro' : 'il semilavorato ' + mat) + ' si preleva dall\'area di approvvigionamento PSA-L1, dove ce ne sono ' + L.n0(disp) + (mat === 'FERRO' ? ' kg' : ' pz') + '. Prima l\'approvvigionamento (Magazzino → Compiti) e la conferma con la pistola RF.');
    var resto = qta;
    inUbic('PSA-L1').filter(function (q) { return q.mat === mat; }).sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (q) { var d = Math.min(q.qta, resto); q.qta = r2(q.qta - d); resto = r2(resto - d); });
  }
  // ── trasferimento tra ubicazioni (LT10 / /SCWM/ADHU) ──
  function trasferisci(i) {
    richiesto(); var n = N(), data = n.data(i.data), u = W().ubicazioni;
    var q = quanti(function (x) { return x.udc === String(i.udc).trim(); })[0]; if (!q) throw Error('Unità di carico ' + i.udc + ' non trovata.');
    if (riservato(q.id) > 0) throw Error('L\'UdC ' + q.udc + ' ha già un compito aperto.');
    var a = String(i.a || '').trim().toUpperCase() || libera(q.mat, q.ubic);
    if (!u[a]) throw Error('Ubicazione ' + a + ' inesistente.');
    if (u[a].tipo !== u[q.ubic].tipo && !TIPI[u[a].tipo].interim) throw Error('Il trasferimento manuale resta nello stesso tipo magazzino (' + u[q.ubic].tipo + ').');
    if (u[a].cap && occupazione(a) >= u[a].cap) throw Error('Ubicazione ' + a + ' piena.');
    var t = compito({tipo: 'TRASF', mat: q.mat, qta: q.qta, quant: q.id, udc: q.udc, da: q.ubic, a: a, creato: data, rif: 'LT10', motivo: String(i.motivo || '')});
    n.salva(); return '<p class="lab-nota">Compito ' + t.numero + ': UdC ' + q.udc + ' da ' + t.da + ' a ' + t.a + '. Confermalo con la pistola RF.</p>';
  }
  // ── conferma di un compito (RF o scrivania), con controllo delle scansioni ──
  function conferma(i) {
    richiesto(); var n = N(), w = W(), u = w.ubicazioni;
    var t = w.compiti.find(function (x) { return x.numero === String(i.compito); }); if (!t) throw Error('Compito ' + i.compito + ' inesistente.');
    if (t.stato !== 'aperto') throw Error('Compito ' + t.numero + ' già confermato.');
    var data = n.data(i.data || t.creato); if (data < t.creato) throw Error('Conferma anteriore alla creazione del compito (' + L.fd(t.creato) + ').');
    var scan = function (v) { return String(v == null ? '' : v).trim().toUpperCase(); };
    if (i.da !== undefined && scan(i.da) !== t.da) throw Error('Ubicazione di origine sbagliata: hai letto ' + (scan(i.da) || '(niente)') + ', il compito dice ' + t.da + '.');
    if (i.udc !== undefined && t.udc && scan(i.udc) !== t.udc && scan(i.udc) !== t.mat) throw Error('Unità di carico sbagliata: hai letto ' + (scan(i.udc) || '(niente)') + ', il compito dice UdC ' + t.udc + ' (' + t.mat + ').');
    if (i.a !== undefined && scan(i.a) !== t.a) throw Error('Ubicazione di destinazione sbagliata: hai letto ' + (scan(i.a) || '(niente)') + ', il compito dice ' + t.a + '.');
    [t.da, t.a].forEach(function (b) { if (u[b] && u[b].blocco) throw Error('Ubicazione ' + b + ' bloccata per inventario (' + u[b].blocco + ').'); });
    var q = w.quant.find(function (x) { return x.id === t.quant; });
    var eff = i.qta === undefined || i.qta === '' ? t.qta : L.num(i.qta, 'Quantità', 0);
    if (eff > t.qta + 1e-9) throw Error('Non si conferma più della quantità del compito (' + L.n0(t.qta) + ').');
    if (eff < t.qta - 1e-9 && (t.tipo === 'PUTAWAY' || t.tipo === 'TRASF' || t.tipo === 'BLOCCO')) throw Error('La messa a posto si conferma per l\'intera unità di carico.');
    var diff = r2(t.qta - eff), nuovo = null;
    if (t.tipo === 'PUTAWAY' || t.tipo === 'TRASF' || t.tipo === 'BLOCCO' || (eff === q.qta && diff === 0)) { q.ubic = t.a; if (t.consegna) q.rif = t.consegna; }
    else {
      if (eff > 0) { q.qta = r2(q.qta - eff); nuovoQuant(t.a, t.mat, eff, t.tipo === 'PICK' ? '' : q.udc, q.data, t.consegna || t.ordine || ''); }
      if (diff > 0) {   // differenza: quello che manca va nella 999 e un nuovo compito prende il resto altrove
        q.qta = r2(q.qta - diff); nuovoQuant('DIFF', t.mat, diff, '', data, 'differenza compito ' + t.numero + ' su ' + t.da);
        t.qtaEff = eff; t.diff = diff; t.stato = 'confermato';
        var f = fifo(t.mat, diff, t.tipo === 'STAGING' ? ['002'] : ['001', '002']);
        if (f.mancante > 1e-9) throw Error('Differenza registrata ma non c\'è altra giacenza per completare: mancano ' + L.n0(f.mancante) + '.');
        nuovo = f.righe.map(function (x) { return compito({tipo: t.tipo, mat: t.mat, qta: x.qta, quant: x.q.id, udc: x.q.udc, da: x.q.ubic, a: t.a, creato: data, rif: t.rif, consegna: t.consegna, ordine: t.ordine, origine: t.numero}); });
      }
    }
    t.qtaEff = eff; t.diff = diff; t.stato = 'confermato'; t.confermato = data; t.risorsa = String(i.risorsa || '');
    n.salva();
    return '<p class="lab-nota">✓ Compito <b>' + t.numero + '</b> confermato' + (t.risorsa ? ' da ' + L.esc(t.risorsa) : '') + ': ' + L.n0(eff) + ' ' + t.mat + ' da ' + t.da + ' a ' + t.a + '.' +
      (diff ? ' Differenza di ' + L.n0(diff) + ' registrata nella 999; nuovo compito ' + nuovo.map(function (x) { return x.numero + ' da ' + x.da; }).join(', ') + '.' : '') + '</p>';
  }
  // ── merce bloccata (tipo di stock «bloccato»): danneggiata al ricevimento o scoperta a scaffale ──
  // 344 da libero a bloccato · 343 da bloccato a libero · 555 rottamazione dal bloccato. La merce bloccata resta nella giacenza
  // contabile (IM) ma non è disponibile per le consegne (ATP) e sta fisicamente nell'area di quarantena Q-ZONE.
  var assicuraQ = function () { var u = W().ubicazioni; if (!u['Q-ZONE']) u['Q-ZONE'] = {tipo: '980', cap: 0, blocco: ''}; if (!W().blocchi) W().blocchi = []; };
  var B = function () { var s = S(); s.bloccato = s.bloccato || {}; return s.bloccato; };
  var bloccato = function (mat) { return r2((S().bloccato || {})[mat] || 0); };
  var logBlocco = function (x) { assicuraQ(); W().blocchi.push(x); };
  var registra344 = function (mat, qta, data, tipo, rif) { S().movimenti.push({data: data, mat: mat, qta: 0, tipo: tipo, rif: rif, lotti: [], stock: qta}); };
  function entrataBloccata(mat, qta, data, rif, motivo, lotto) {
    assicuraQ(); var size = UDC[tipoMat(mat)] || 50, resto = qta, out = [];
    while (resto > 1e-9) { var q = Math.min(size, resto), x = nuovoQuant('Q-ZONE', mat, q, numUdc(), data, rif); if (lotto) x.lotto = lotto; out.push(x); resto = r2(resto - q); }
    B()[mat] = r2(bloccato(mat) + qta);
    logBlocco({data: data, tipo: '101 in bloccato', mat: mat, qta: qta, udc: out.map(function (x) { return x.udc; }).join(', '), motivo: motivo || 'merce danneggiata al ricevimento', rif: rif});
    return out;
  }
  function blocca(i) {
    richiesto(); assicuraQ(); var n = N(), data = n.data(i.data), u = W().ubicazioni, motivo = String(i.motivo || '').trim();
    if (!motivo) throw Error('Scrivi il motivo del blocco (es. «pallet urtato dal carrello»).');
    var q = quanti(function (x) { return x.udc === String(i.udc || '').trim() && x.qta > 0; })[0];
    if (!q) throw Error('Unità di carico ' + (i.udc || '') + ' non trovata.');
    if (['001', '002', '902'].indexOf(u[q.ubic].tipo) < 0) throw Error('Si blocca la merce a scaffale, in catasta o in zona di ricevimento (UdC ' + q.udc + ' in ' + q.ubic + ').');
    var pa = aperti().filter(function (t) { return t.quant === q.id; });
    if (pa.some(function (t) { return t.tipo !== 'PUTAWAY'; })) throw Error('L\'UdC ' + q.udc + ' ha un compito aperto (' + pa[0].numero + '): confermalo o annullalo prima.');
    var x = i.qta == null || i.qta === '' ? q.qta : L.num(i.qta, 'Quantità da bloccare', 0.001);
    if (x > q.qta + 1e-9) throw Error('Nell\'UdC ' + q.udc + ' ci sono solo ' + L.n0(q.qta) + ' ' + q.mat + '.');
    var qb = q;
    if (x < q.qta - 1e-9) { q.qta = r2(q.qta - x); qb = nuovoQuant(q.ubic, q.mat, x, numUdc(), q.data, q.rif); pa.forEach(function (t) { t.qta = q.qta; }); }
    else pa.forEach(function (t) { t.stato = 'annullato'; t.confermato = data; t.motivo = 'merce bloccata: ' + motivo; });
    B()[q.mat] = r2(bloccato(q.mat) + x); registra344(q.mat, x, data, '344', qb.udc);
    var t = compito({tipo: 'BLOCCO', mat: q.mat, qta: x, quant: qb.id, udc: qb.udc, da: qb.ubic, a: 'Q-ZONE', creato: data, rif: 'Q-ZONE', motivo: motivo});
    logBlocco({data: data, tipo: '344 da libero a bloccato', mat: q.mat, qta: x, udc: qb.udc, motivo: motivo, rif: qb.ubic});
    n.salva();
    return '<p class="lab-nota">🚫 ' + L.n0(x) + ' ' + q.mat + ' bloccati (movimento 344): non sono più disponibili per le consegne. Compito ' + t.numero + ': porta l\'UdC <b>' + qb.udc + '</b> da ' + qb.ubic + ' all\'area di quarantena Q-ZONE con la pistola RF. La giacenza contabile non cambia: nessuna scrittura.</p>';
  }
  var inQuarantena = function (udc) {
    var q = quanti(function (x) { return x.udc === String(udc || '').trim() && x.qta > 0; })[0];
    if (!q) throw Error('Unità di carico ' + (udc || '') + ' non trovata.');
    if (q.ubic !== 'Q-ZONE') throw Error('L\'UdC ' + q.udc + ' non è ancora nell\'area di quarantena (è in ' + q.ubic + '): prima conferma il compito con la pistola.');
    if (riservato(q.id) > 0) throw Error('L\'UdC ' + q.udc + ' ha già un compito aperto.');
    return q;
  };
  function sblocca(i) {
    richiesto(); var n = N(), data = n.data(i.data), q = inQuarantena(i.udc);
    B()[q.mat] = r2(Math.max(0, bloccato(q.mat) - q.qta)); registra344(q.mat, -q.qta, data, '343', q.udc);
    var t = compito({tipo: 'PUTAWAY', mat: q.mat, qta: q.qta, quant: q.id, udc: q.udc, da: 'Q-ZONE', a: libera(q.mat), creato: data, rif: 'Q-ZONE', motivo: 'sblocco: ' + String(i.motivo || 'merce controllata, buona')});
    logBlocco({data: data, tipo: '343 da bloccato a libero', mat: q.mat, qta: q.qta, udc: q.udc, motivo: String(i.motivo || 'merce controllata, buona'), rif: t.a});
    n.salva();
    return '<p class="lab-nota">✅ UdC ' + q.udc + ' sbloccata (movimento 343): ' + L.n0(q.qta) + ' ' + q.mat + ' di nuovo disponibili. Compito ' + t.numero + ': rimettila a scaffale in ' + t.a + '.</p>';
  }
  function rottama(i) {
    richiesto(); var n = N(), data = n.data(i.data), q = inQuarantena(i.udc), m = n.materiale(q.mat), motivo = String(i.motivo || '').trim();
    if (!motivo) throw Error('Scrivi il motivo della rottamazione (es. «tubi piegati, non riparabili»).');
    var val = r2(q.qta * m.std), qta = q.qta;
    n.movimento(q.mat, -qta, data, '555', 'rottamazione ' + q.udc, {lotti: q.lotto ? [{lotto: q.lotto, qta: qta}] : null});
    q.qta = 0; B()[q.mat] = r2(Math.max(0, bloccato(q.mat) - qta));
    var r = n.post({data: data, tipo: 'ROTTAMAZIONE', rif: q.udc, descrizione: 'Movimento 555 — rottamazione dal bloccato: ' + L.n0(qta) + ' ' + m.um + ' ' + q.mat + ' × ' + L.eur(m.std) + ' (UdC ' + q.udc + ', ' + motivo + ')',
      righe: [{conto: '69', dareAvere: 'DARE', importo: val, testo: q.mat + ' ' + motivo}, {conto: N().contoMag(q.mat), dareAvere: 'AVERE', importo: val, testo: q.mat}]});
    logBlocco({data: data, tipo: '555 rottamazione', mat: q.mat, qta: qta, udc: q.udc, motivo: motivo, rif: r.numero});
    n.salva(); return r;
  }
  function bloccati() {
    var u = W().ubicazioni;
    return quanti(function (q) { return q.qta > 0 && u[q.ubic] && u[q.ubic].tipo === '980'; }).concat(
      aperti().filter(function (t) { return t.tipo === 'BLOCCO'; }).map(function (t) { var q = W().quant.find(function (x) { return x.id === t.quant; }); return Object.assign({}, q, {inViaggio: t.numero}); }));
  }
  // ── quadratura IM–WMS (LX23 / /SCWM/STOCK_COMP) ──
  function quadratura() {
    return Object.keys(S().materiali).map(function (m) {
      var im = r2(S().giacenze[m] || 0), wm = r2(quanti(function (q) { return q.mat === m; }).reduce(function (s, q) { return s + q.qta; }, 0));
      var diff999 = r2(quanti(function (q) { return q.mat === m && q.ubic === 'DIFF'; }).reduce(function (s, q) { return s + q.qta; }, 0));
      return {mat: m, im: im, wm: wm, diff999: diff999, ok: Math.abs(im - wm) < 1e-6};
    });
  }
  function ubicazione(b) { b = String(b || '').trim().toUpperCase(); var x = W().ubicazioni[b]; if (!x) throw Error('Ubicazione ' + b + ' inesistente.'); return {id: b, tipo: x.tipo, cap: x.cap, blocco: x.blocco, quanti: inUbic(b), occupazione: occupazione(b)}; }
  return {TIPI: TIPI, TIPI_COMPITO: TIPI_COMPITO, UDC: UDC, attivo: attivo, attiva: attiva, entrata: entrata, creaPrelievo: creaPrelievo, compitiDi: compitiDi, statoPrelievo: statoPrelievo,
    uscitaSpedizione: uscitaSpedizione, approvvigiona: approvvigiona, consumaPSA: consumaPSA, trasferisci: trasferisci, conferma: conferma, quadratura: quadratura,
    entrataBloccata: entrataBloccata, blocca: blocca, sblocca: sblocca, rottama: rottama, bloccati: bloccati, bloccato: bloccato,
    ubicazione: ubicazione, quanti: quanti, inUbic: inUbic, aperti: aperti, occupazione: occupazione, nuovoQuant: nuovoQuant, libera: libera, richiesto: richiesto, compito: compito, fifo: fifo, riservato: riservato};
})();

/* Aiuti contestuali condivisi: decorazione della sola UI, non del motore WM4.
 * I prefissi dei moduli non sono univoci: verificare SEMPRE la firma dei campi.
 * Gli id degli aiuti non iniziano con il prefisso del modulo: L.valori legge
 * tutti gli elementi con quel prefisso, non soltanto gli input. */
window.WMGuida = (function () {
  'use strict';
  var L = window.LabMotore, esc = L.esc, originale = L.modulo;
  var data = 'Data della simulazione: non prima del documento di origine o della creazione del compito. Usa il calendario; non è la data del DDT.';
  var regole = {
    at: ['data', 'Magazzino → Struttura e attivazione', 'Controlla le giacenze iniziali e scegli una data non precedente ai movimenti già registrati.', 'Premi Attiva una sola volta.', 'Crea W100, ubicazioni e UdC dalle giacenze esistenti: nessun nuovo carico contabile.', {data: data}],
    mi: ['ordine,qta,ddt,lotto,danneggiati,danno,data', 'Acquisti → Entrate merci · MIGO 101', 'Prima crea e, se necessario, rilascia un ordine di acquisto. Conta la merce e confronta il DDT sintetico.', 'Premi Registra entrata una sola volta dopo il controllo di quantità, danni e data.', 'Il 101 aumenta la giacenza IM e registra il valore. Con WMS attivo la parte buona è in GR-ZONE con compiti PUTAWAY; i danneggiati entrano direttamente in Q-ZONE. Conferma poi la messa a posto in RF: MIGO non significa merce già a scaffale.', {
      ordine: 'Scegli l’ordine del fornitore corretto, ancora da ricevere e rilasciato. Il materiale e l’unità di misura derivano dall’ordine.',
      qta: 'Quantità totale arrivata, compresa la parte danneggiata, nell’unità del materiale (FERRO: kg). Vuoto = tutto il residuo dell’ordine; non reinserire il totale già ricevuto.',
      ddt: 'Numero del DDT sintetico del fornitore: è un riferimento documentale, non un codice ubicazione.',
      lotto: 'Colata del certificato sintetico: consente la tracciabilità. Vuoto = lotto automatico. Lotto, UdC e numero di serie sono identificativi diversi.',
      danneggiati: 'Parte della quantità totale da bloccare, non una quantità aggiuntiva. Zero o vuoto se integra; non superare la quantità ricevuta.',
      danno: 'Descrivi il difetto osservato, per esempio imballo rotto; usa solo dati simulati.', data: data}],
    sg: ['ordine,kg,data', 'Magazzino → Compiti → Approvvigionamento produzione', 'Prima rilascia il costo standard nel periodo consentito (CK11N + CK24), crea/rilascia l’ordine di produzione e metti a posto i componenti. Controlla fabbisogno, prelievi 261 già fatti, compiti e scorta in PSA.', 'Premi Crea compiti (FIFO), poi conferma ogni STAGING in RF.', 'Sposta componenti in PSA-L1 senza consumarli e senza scrittura. Solo Produzione → Avanzamento → MIGO 261 riduce giacenza e addebita il costo all’ordine. Non ricreare lo stesso fabbisogno già approvvigionato.', {
      ordine: 'Scegli l’ordine aperto: la descrizione indica il componente effettivo della distinta (ferro o semilavorato). Non scegliere un ordine cliente.',
      kg: 'Quantità del componente: kg se FERRO, pz se semilavorato. Vuoto = fabbisogno TOTALE da distinta, non residuo al netto di prelievi o staging precedenti. Per un’integrazione scrivi solo quanto manca.', data: data}],
    tr: ['udc,a,motivo,data', 'Magazzino → Mappa / RF Interroga → Compiti', 'Leggi l’UdC e verifica dove si trova, contenuto, capienza della destinazione e compiti aperti.', 'Premi Crea compito; poi sposta realmente nella simulazione e conferma in RF origine, UdC e destinazione.', 'La creazione impegna l’UdC ma lascia il contenuto all’origine. Solo la conferma aggiorna l’ubicazione. Nessun 101/261/601 e nessuna variazione della giacenza IM.', {
      udc: 'Codice dell’unità di carico dall’etichetta, non materiale o lotto. Il trasferimento riguarda l’intera quantità del quanto trovato e non offre una quantità parziale; l’UdC non deve avere compiti aperti. Se è stata frazionata, verifica tutte le righe in Mappa.',
      a: 'Codice ubicazione esistente, per esempio 03-05-2 o F-03. Vuoto = proposta automatica. Per un riordino usa lo stesso tipo magazzino e un posto con capacità; le aree interim non sostituiscono i flussi dedicati di staging/quarantena.',
      motivo: 'Spiega il motivo del riordino, per esempio liberare corsia (dato sintetico). Non cambia lo stato dello stock.', data: data}],
    cf: ['compito,risorsa,data', 'Magazzino → Compiti → Conferma da scrivania', 'Confronta compito, materiale, quantità e percorso con ciò che hai spostato.', 'Premi Conferma. Per imparare il controllo delle scansioni usa invece Pistola RF.', 'Chiude il compito e cambia il dove; non effettua il consumo 261 né l’uscita merci 601.', {compito: 'Scegli un compito aperto, non un numero UdC. La riga mostra origine, destinazione e quantità.', risorsa: 'Magazziniere simulato a cui attribuire la conferma.', data: data}],
    bl: ['udc,qta,motivo,data', 'Magazzino → Merce bloccata / quarantena', 'Controlla l’UdC libera a scaffale, in catasta o ricevimento e il difetto.', 'Premi Metti in quarantena e conferma il compito BLOCCO in RF verso Q-ZONE.', '344 cambia lo stato libero → bloccato senza cambiare il totale IM. Il trasferimento fisico si completa solo alla conferma RF. Per un blocco parziale viene creata un’altra UdC.', {udc: 'Scegli l’UdC da controllare, verificando quantità e ubicazione nella descrizione.', qta: 'Vuoto = tutta l’UdC. Per un controllo parziale scrivi solo la parte danneggiata nell’unità del materiale.', motivo: 'Obbligatorio: descrivi perché la merce non è utilizzabile.', data: data}],
    dq: ['udc,motivo,data', 'Magazzino → Decisione sulla merce in quarantena', 'Prima conferma il viaggio verso Q-ZONE: soltanto le UdC arrivate sono selezionabili.', 'Sblocca (343) se integra oppure Rottama (555) se inutilizzabile: sono alternative, non passaggi consecutivi.', '343 mantiene il totale IM e crea PUTAWAY da confermare. 555 elimina la quantità bloccata e registra il costo di rottamazione. Controlla registro blocchi e Monitor.', {udc: 'UdC arrivata in Q-ZONE; la decisione riguarda tutta questa UdC, non una quantità editabile.', motivo: 'Esito del controllo; obbligatorio per rottamare. Non usare la rottamazione per liberare un’ubicazione durante un esercizio.', data: data}],
    pr: ['ordine,kg,data', 'Produzione → Avanzamento → MIGO 261', 'Prima crea STAGING in Magazzino → Compiti e confermalo in RF fino a PSA-L1.', 'Premi Registra prelievo solo per la quantità consumata dall’ordine.', '261 riduce IM e scorta PSA e addebita il componente all’ordine. Non è il semplice spostamento dallo scaffale alla linea.', {ordine: 'Ordine di produzione che consuma il componente della propria distinta.', kg: 'Consumo effettivo positivo del componente: ferro in kg, semilavorato in pz. Non confondere con i pezzi finiti da produrre.', data: data}],
    en: ['ordine,qta,data', 'Produzione → Avanzamento → MIGO 101', 'Completa i passaggi produttivi richiesti prima di versare il finito o semilavorato.', 'Premi Registra entrata.', 'Aumenta IM del prodotto; con WMS attivo crea UdC in GR-ZONE e PUTAWAY da confermare prima del normale prelievo da scaffale.', {ordine: 'Ordine di produzione che versa il proprio prodotto, non ordine acquisto.', qta: 'Pezzi completati da versare. Vuoto = residuo; nel ciclo a operazioni devono avere completato la Saldatura.', data: data}],
    vl: ['ordine,data', 'Vendite → Consegne · picking', 'Prima crea un ordine cliente con disponibilità confermata.', 'Crea la consegna, poi conferma i PICK in RF verso GI-ZONE (se ondate attive, prima rilasciale).', 'Con WMS attivo la consegna genera lavoro fisico, non ancora il 601. Il prelievo riserva quanti e la conferma porta la merce in zona spedizione.', {ordine: 'Ordine cliente da consegnare: controlla cliente, materiale e quantità.', data: data}],
    pg: ['consegna,data', 'Vendite → Uscita merci diretta', 'Completa tutti i PICK della consegna.', 'Premi Registra uscita merci soltanto se scegli il percorso diretto, alternativo alla partenza del trasporto.', '601 riduce IM e GI-ZONE e contabilizza il costo del venduto. Questa alternativa non crea colli, trasporto o DDT: non ripetere poi una partenza per la stessa uscita.', {consegna: 'Seleziona la consegna già prelevata, ancora senza uscita merci.', data: data}],
    im: ['consegna,imballo,perCollo,data', 'Spedizione → Imballo · packing', 'Completa il picking in RF fino a GI-ZONE.', 'Premi Crea i colli (SSCC) e verifica numero colli, pezzi e pesi.', 'Genera colli identificati da SSCC; non diminuisce IM. L’SSCC del collo non è il codice UdC interno.', {consegna: 'Consegna con prelievo completo e imballaggio da completare.', imballo: 'Scegli il tipo di imballo confrontando tara e massimo pezzi.', perCollo: 'Pezzi per collo, non numero colli; vuoto = massimo del tipo. L’ultimo collo contiene il residuo.', data: data}],
    vt: ['consegne,vettore,targa,autista,porto,data', 'Spedizione → Trasporti', 'Preleva e imballa le consegne da raggruppare.', 'Premi Crea trasporto, poi carica ogni SSCC in RF Carico o da scrivania.', 'Collega consegne e colli al trasporto simulato; non registra ancora uscita merci.', {consegne: 'Numeri delle consegne libere separati da virgola, non numeri ordine o SSCC.', vettore: 'Vettore sintetico dall’elenco; nessuna prenotazione reale.', targa: 'Targa fittizia del mezzo dell’esercizio.', autista: 'Nome fittizio: non inserire dati personali reali.', porto: 'Franco = paga il mittente; assegnato = paga il destinatario.', data: data}],
    ca: ['sscc,data', 'Spedizione → Carico / Magazzino → RF → Carico', 'Crea colli e trasporto prima di leggere le etichette.', 'Leggi un SSCC per volta e premi Carica il collo (in RF premi Invio).', 'Segna il collo caricato sul suo trasporto, senza 601. Controlla il contatore caricati/totale.', {sscc: 'Le 18 cifre dell’etichetta SSCC del collo assegnato al trasporto; non il materiale o l’UdC interna.', data: data}],
    pt: ['trasporto,data', 'Spedizione → Fine carico e uscita merci', 'Verifica che tutti i colli siano caricati e che il trasporto non sia già partito.', 'Premi Registra la partenza e l’uscita merci.', 'Registra 601 per le consegne, riduce IM/GI-ZONE, contabilizza il costo del venduto e assegna i DDT simulati. Controlla Monitor e quadratura.', {trasporto: 'Trasporto da far partire, non consegna singola.', data: data}],
    in: ['tipo,selezione,tolleranza,data', 'Inventario → Documenti', 'Controlla le ubicazioni e completa prima i compiti aperti che le interessano.', 'Crea il documento, poi Attiva: inizia il blocco ubicazioni. Conta da lista cieca o RF Inventario.', 'La creazione seleziona le righe; l’attivazione impedisce movimenti durante la conta. Nessun cambiamento IM in questa fase.', {tipo: 'Scegli la modalità: rotazione per classe ABC, ubicazioni specifiche oppure ubicazioni vuote.', selezione: 'Per rotazione indica A, B o C; per ubicazioni codici separati da virgola, per esempio 01-01-1,01-01-2. Per vuote non serve una classe.', tolleranza: 'Soglia in euro PER POSIZIONE per richiedere riconta, non percentuale né pezzi.', data: data}],
    ia: ['data', 'Inventario → Documento creato → Attiva', 'Seleziona il documento corretto e libera le ubicazioni dai compiti aperti.', 'Premi Attiva (blocca le ubicazioni).', 'Documento attivo, ubicazioni bloccate per la conta; non è stock danneggiato e non è un movimento 344.', {data: data}],
    ic: [null, 'Inventario → Conta / riconta', 'Conta fisicamente nella simulazione senza copiare il contabile. In riconta compila le sole righe richieste.', 'Inserisci tutte le quantità richieste e premi Registra conta o riconta. In RF puoi registrare per ubicazione.', 'L’ultima riga completa porta a riconta se necessaria oppure a contato. Non modifica ancora la giacenza IM.', {contatore: 'Nome o sigla sintetica di chi ha contato; per la riconta usa un secondo controllo.'}],
    ix: ['data', 'Inventario → Documento contato → LI20', 'Termina tutte le conte e riconte richieste.', 'Premi Chiudi nel WMS.', 'Adegua lo scaffale alla conta e mette lo scarto in DIFF/999; IM è ancora invariato. Se esistono differenze passa a LI21; se non ce ne sono il flusso termina qui.', {data: data}],
    rg: ['data', 'Inventario → Differenze → LI21', 'Prima chiudi il documento nel WMS (LI20) e verifica lo scarto nella 999.', 'Premi Registra le differenze solo se esistono differenze da registrare.', '711/712 allinea IM e valore alla conta, svuota le differenze registrate e ripristina la quadratura. Non usare un secondo ricevimento per correggere uno scarto.', {data: data}],
    mo: ['ondate,crossDock', 'Innovazione → Ondate', 'Controlla come vuoi generare i nuovi prelievi.', 'Salva le opzioni prima di creare le nuove consegne.', 'Con ondate sì le consegne attendono il rilascio; con cross-docking sì la merce idonea in GR-ZONE può andare direttamente a GI-ZONE anziché a scaffale.', {ondate: 'Sì = PICK al rilascio dell’ondata; no = PICK subito alla consegna.', crossDock: 'Sì = usa il ricevimento ancora da mettere a posto se idoneo, annullando il relativo PUTAWAY. Non autorizza a saltare la conferma RF.'}],
    on: ['data', 'Innovazione → Rilascia ondata', 'Prima abilita le ondate e crea consegne in attesa.', 'Premi Rilascia l’ondata, poi esegui la coda RF in ordine di percorso.', 'Crea PICK e sequenza di prelievo, non l’uscita contabile 601.', {data: data}],
    sl: ['data', 'Innovazione → Slotting', 'Esamina le proposte di riordino e le destinazioni disponibili.', 'Crea i compiti proposti e confermali in RF.', 'Migliora il dove; lascia invariati giacenze IM e valori. Una proposta non è uno spostamento già eseguito.', {data: data}],
    rf: ['trasporto,data', 'Innovazione → RFID (simulato)', 'Prima crea il trasporto con colli SSCC.', 'Scegli il trasporto e fai passare il carrello dal varco simulato.', 'Registra il carico dei colli come la lettura RF, non la partenza o il 601. Nessun lettore o servizio esterno reale.', {trasporto: 'Trasporto in carico i cui tag EPC derivano dagli SSCC.', data: data}]
  };
  function guida(r, pref) {
    return '<div class="wms-guida-modulo lab-nota" data-wms-guida="' + esc(pref) + '"><ol>' +
      ['Ingresso: ' + r[1], 'Campi: ' + r[2], 'Conferma: ' + r[3], 'Risultato da verificare: ' + r[4]].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>';
  }
  L.modulo = function (pref, campi, pulsanti) {
    var html = originale.apply(this, arguments), r = regole[pref], firma = campi.map(function (c) { return c[0]; }).join(',');
    // Anche ia/rg/sl/on hanno firme comuni: verifica inoltre il pulsante reale.
    var azioni = pulsanti.map(function (p) { return p[1]; }).join(' ');
    if (!r || (r[0] !== null && firma !== r[0]) ||
        (pref === 'ia' && !/blocca le ubicazioni/.test(azioni)) ||
        (pref === 'rg' && !/differenze/.test(azioni)) ||
        (pref === 'ic' && !campi.some(function (c) { return c[0] === 'contatore'; })) ||
        (pref === 'vl' && !/consegna/i.test(azioni))) return html;
    var box = document.createElement('div'); box.innerHTML = html;
    campi.forEach(function (c) {
      var testo = r[5][c[0]];
      if (!testo && pref === 'ic') testo = /^r\d+$/.test(c[0]) ? 'Quantità effettivamente contata nell’unità del materiale. Scrivi 0 se vuota: vuoto significa non ancora contata, non zero.' : 'Codice del materiale realmente trovato nell’ubicazione vuota; compila se la quantità è maggiore di zero.';
      if (!testo) return;
      var input = box.querySelector('#' + pref + '-' + c[0]), id = 'wms-aiuto-' + pref + '-' + c[0];
      if (!input) return;
      input.setAttribute('aria-describedby', id);
      var aiuto = document.createElement('small'); aiuto.id = id; aiuto.className = 'wms-aiuto-campo lab-nota'; aiuto.style.display = 'block'; aiuto.textContent = testo;
      input.parentNode.appendChild(aiuto);
    });
    return guida(r, pref) + box.innerHTML;
  };
  var percorso = {
    struttura: 'Controlla la situazione iniziale → scegli la data → attiva W100 → verifica UdC iniziali e Monitor. L’attivazione distribuisce stock esistente: non è MIGO 101. Non caricare scenari sostitutivi per ottenere una semplice guida.',
    mappa: 'Tocca un’ubicazione → leggi materiale, quanto, quantità e UdC → controlla compiti da/a → per spostare vai a Compiti, non modificare un saldo. Bordo di arrivo = destinazione impegnata, non merce già presente.',
    compiti: 'Scegli approvvigionamento produzione o trasferimento → compila il modulo relativo → crea il compito → esegui RF → verifica ubicazione e Monitor. Non duplicare i compiti già aperti.',
    rf: 'Scegli risorsa e data → Compiti: origine, UdC (il materiale è accettato come alternativa), quantità, destinazione → Conferma → verifica coda e Mappa. Carico legge SSCC, Interroga legge ubicazione/UdC e non modifica nulla, Inventario registra la conta di documenti già attivi.',
    monitor: 'Leggi compiti aperti e quadratura IM–WMS → confronta materiale per materiale → controlla DIFF/999 e messe a posto. Il totale WMS include ricevimento, linea, spedizione, quarantena e differenze: non è soltanto lo scaffale.',
    etichette: 'Scegli ubicazioni o UdC → controlla il codice e il contenuto → Stampa → usa le etichette nelle scansioni RF. Stampare non crea né sposta merce; SSCC dei colli si crea invece in Spedizione → Imballo.',
    bloccato: 'Seleziona UdC e quantità → 344 → conferma BLOCCO verso Q-ZONE in RF → decidi 343 con ritorno a scaffale oppure 555 con costo. Non confondere la quarantena con il blocco ubicazione per inventario.',
    lotti: 'Filtra materiale e lotti esauriti → Traccia per vedere monte e valle → scegli una consegna per un reclamo simulato oppure cerca un numero di serie → Visualizza. Queste consultazioni non movimentano stock e non inviano comunicazioni reali.'
  };
  function pagina(nome) {
    return '<section class="wms-guida-pagina lab-nota" aria-label="Guida operativa WMS"><h3>Passo passo · WMS Academy</h3><p>' + esc(percorso[nome] || percorso.compiti) + '</p>' +
      '<details><summary>Intero percorso: MIGO, giacenze, impegni e movimenti fisici</summary>' +
      '<p><b>AMBIENTE FORMATIVO — DATI SIMULATI.</b> Nessuna spedizione, lettura hardware o azione esterna reale.</p>' +
      '<p><b>Materiale</b> = che cosa; <b>lotto</b> = origine comune; <b>numero di serie</b> = singolo pezzo; <b>quanto</b> = riga di stock per materiale/UdC/ubicazione/data; <b>UdC</b> = pallet, fascio o cassone interno; <b>SSCC</b> = collo di spedizione. Non sono codici intercambiabili.</p>' +
      '<p><b>Giacenza IM</b> = quantità contabile totale. <b>Giacenza WMS</b> = somma dei quanti in tutte le aree. <b>Impegni commerciali/ATP</b> e <b>quantità riservate da compiti aperti</b> sono controlli diversi: stock esistente non significa tutto prelevabile. I compiti riservano i quanti; il FIFO esclude quantità già riservate e ubicazioni bloccate. La merce in Q-ZONE non è stock libero. Una destinazione impegnata non è ancora una giacenza fisica.</p>' +
      '<ol><li><b>Ricevimento:</b> Acquisti → ordine rilasciato → Entrate MIGO 101: ordine, quantità contata, DDT, lotto, danni e data → Registra → controlla IM e compiti. Parte buona in GR-ZONE; danneggiati in Q-ZONE.</li>' +
      '<li><b>Deposito:</b> Magazzino → RF → leggi origine GR-ZONE, UdC, quantità intera e destinazione proposta → Conferma PUTAWAY → verifica Mappa. 001 scaffali; 002 catasta ferro. MIGO 101 non equivale a deposito già eseguito.</li>' +
      '<li><b>Spostamenti UdC:</b> Mappa/Interroga → scegli UdC senza compiti → Compiti → destinazione e motivo → Crea → RF → Conferma → nuova ubicazione, stesso totale IM.</li>' +
      '<li><b>Fabbisogni produzione:</b> ordine rilasciato → Compiti → ordine, quantità componente, data → STAGING FIFO → RF verso PSA-L1 → Produzione → MIGO 261 per il consumo. Il fabbisogno totale non sottrae automaticamente staging già fatti: evita duplicazioni; PSA può contenere scorta condivisa.</li>' +
      '<li><b>Produzione:</b> dopo lavorazioni richieste, MIGO 101 del prodotto → GR-ZONE → PUTAWAY RF → scaffale. Non effettuare una seconda entrata contabile per mettere a posto.</li>' +
      '<li><b>Picking:</b> ordine cliente → consegna → PICK (oppure rilascio ondata) → RF da scaffale a GI-ZONE → prelievo completo. Quantità ridotta solo per PICK/STAGING: genera differenza in 999 e nuovo compito se c’è stock; controlla l’esito, non ripetere alla cieca una conferma fallita.</li>' +
      '<li><b>Packing e ship:</b> Spedizione → Imballo → consegna, imballo, pezzi/collo → SSCC → Trasporti → consegne, vettore e dati sintetici → carica ogni SSCC in RF o RFID simulato → partenza/601 → controlla DDT e costo del venduto. Uscita diretta da Vendite è alternativa, non una seconda uscita.</li>' +
      '<li><b>Blocchi e quarantena:</b> 344 cambia tipo stock, RF porta in Q-ZONE, 343 libera e crea ritorno; 555 rottama con riduzione quantità e costo. Il blocco inventario riguarda invece l’ubicazione durante la conta.</li>' +
      '<li><b>Inventario:</b> crea documento → attiva/blocca ubicazioni → conta cieca (0 = vuota, vuoto = non contata) → eventuale riconta → LI20 aggiorna scaffale e DIFF mantenendo IM → LI21 solo se differenze per allineare contabilità (711/712).</li>' +
      '<li><b>Innovazione:</b> Slotting crea trasferimenti da confermare; Ondate raggruppa PICK; Cross-docking sostituisce PUTAWAY con PICK idonei GR-ZONE → GI-ZONE; RFID simula il carico, non il 601.</li></ol>' +
      '<h4>Esercizio breve verificabile: sposta senza caricare due volte</h4><ol>' +
      '<li>Apri Monitor e annota la giacenza IM del materiale scelto. In Mappa scegli un’UdC esistente senza compiti aperti e annota codice, quantità e ubicazione di origine.</li>' +
      '<li>In Compiti → Trasferimento compila UdC con quel codice, destinazione con un posto libero dello stesso tipo (o lascia vuoto per proposta), motivo con riordino didattico, data con una data valida dell’esercizio. Premi Crea compito una sola volta.</li>' +
      '<li>Prima della conferma verifica che l’UdC risulti ancora all’origine e la quantità impegnata dal compito; la destinazione risulta prenotata. Non fare MIGO: la merce esiste già.</li>' +
      '<li>In RF scegli risorsa e data non precedente al compito; leggi origine → UdC → quantità intera → destinazione. Premi Conferma (o Invio sull’ultimo campo).</li>' +
      '<li>Risultato atteso: compito confermato, UdC nella destinazione, stessa quantità e giacenza IM di partenza, nessuna nuova scrittura contabile, Monitor in quadratura. Per il fabbisogno di produzione usa invece STAGING e solo dopo il 261: non è questo trasferimento di riordino.</li></ol>' +
      '<p><b>Verifica finale:</b> compiti previsti confermati, UdC nella destinazione, nessun doppio 101/261/601, bloccato separato dal libero, DIFF trattata, Monitor con IM = WMS. Un errore si legge e si corregge nel relativo flusso: non serve alcun reset.</p></details></section>';
  }
  function rfCampi(radice) {
    var testi = {
      lm: 'Filtra i lotti per codice materiale; tutti non applica il filtro. È una consultazione: non cambia giacenze.',
      le: 'Seleziona per includere lotti con quantità esaurita: serve a ricostruire la storia, non li rende disponibili.',
      lc: 'Seleziona la consegna del reclamo sintetico per risalire ai lotti e alle colate; non invia richiami reali.',
      sn: 'Numero di serie del singolo pezzo, per esempio SN000001. Premi Visualizza o Invio; non inserire un lotto o una UdC.',
      cosa: 'Scegli se stampare codici ubicazione oppure UdC presenti; il comando Stampa non crea stock.',
      'rf-ris': 'Magazziniere simulato che esegue o conta; questa scelta non assegna automaticamente tutti i compiti.',
      'rf-data': data,
      'rf-da': 'Leggi il codice esatto dell’origine del compito e premi Invio. La merce resta qui fino alla conferma.',
      'rf-udc': 'Leggi l’etichetta UdC del compito; è accettato anche il suo materiale. Preferisci UdC per identificare il carico.',
      'rf-qta': 'Quantità effettivamente prelevata nell’unità mostrata (kg/pz). PUTAWAY/TRASF/BLOCCO: intera e non modificabile. Solo PICK/STAGING consentono meno: controlla differenza 999 e nuovo compito, non confondere con un trasferimento parziale libero.',
      'rf-a': 'Leggi la destinazione esatta dopo aver portato la merce; Invio sull’ultimo campo conferma. Controlla prima la quantità.',
      'rf-sscc': 'Leggi le 18 cifre SSCC di un collo già assegnato al trasporto, poi Invio. Registra carico, non uscita merci 601.',
      'rf-q': 'Codice ubicazione (es. F-01) o UdC, poi Invio: mostra contenuto senza spostamenti. Non cerca lotto o SSCC.',
      'rf-inv': 'Codice ubicazione inclusa in un inventario attivo o in riconta, poi Invio: compaiono le righe da contare.'
    };
    radice.querySelectorAll('input, select').forEach(function (input) {
      var t = testi[input.id] || (/^rf-c\d+$/.test(input.id) ? 'Quantità realmente contata: 0 se vuota. Lascia vuoto soltanto per una riga non ancora contata; Registra la conta salva le righe compilate. L’ultima completa passa a riconta oppure contato, non registra LI21.' : /^rf-m\d+$/.test(input.id) ? 'Materiale trovato in un’ubicazione attesa vuota: codice presente nell’anagrafica; necessario se conti più di zero.' : '');
      var id = 'wms-aiuto-' + input.id;
      if (!t || document.getElementById(id)) return;
      var small = document.createElement('small'); small.id = id; small.className = 'wms-aiuto-campo lab-nota'; small.style.display = 'block'; small.textContent = t;
      input.setAttribute('aria-describedby', id); input.parentNode.appendChild(small);
    });
  }
  return {pagina: pagina, rfCampi: rfCampi};
})();
