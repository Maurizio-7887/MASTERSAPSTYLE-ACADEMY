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
