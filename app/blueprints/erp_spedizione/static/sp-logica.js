/* SISTEMA INTEGRATO — Spedizione in logica SAP (LE-SHP + WMS): consegna in uscita → prelievo (compiti FIFO, pistola RF)
   → imballo in colli con SSCC (VL02N Imballaggio / /SCWM/PACK) → trasporto (VT01N: vettore, targa, autista, consegne)
   → carico dei colli letti alla porta di spedizione → uscita merci del trasporto (601) → DDT (D.P.R. 472/1996) → fattura.
   SSCC (GS1, 18 cifre con cifra di controllo) con un prefisso aziendale di fantasia: è un esercizio. */
window.SP4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; }, WM = function () { return window.WM4; };
  // imballi: misure in cm (lunghezza × larghezza × altezza del solo imballo), tara e portata in kg, impilabile e peso massimo che regge sopra
  var IMBALLI = {EUR: {nome: 'Pallet EUR 120×80', tara: 25, max: 50, lung: 120, larg: 80, alt: 15, portata: 1000, impilabile: true, sopra: 700},
    IND: {nome: 'Pallet industriale 120×100', tara: 30, max: 60, lung: 120, larg: 100, alt: 15, portata: 1200, impilabile: true, sopra: 900},
    CASSA: {nome: 'Cassa in legno', tara: 18, max: 20, lung: 100, larg: 60, alt: 60, portata: 400, impilabile: true, sopra: 300}};
  // veicoli: piano di carico interno in cm (lunghezza lungo il camion × larghezza), altezza utile e portata utile in kg
  var VEICOLI = {FURGONE: {nome: 'Furgone 3,5 t', lung: 420, larg: 200, alt: 210, portata: 1200},
    MOTRICE: {nome: 'Motrice 10 t', lung: 750, larg: 245, alt: 260, portata: 8000},
    BILICO: {nome: 'Bilico 13,6 m', lung: 1360, larg: 245, alt: 270, portata: 24000}};
  // regole di confezionamento predefinite: quanti pezzi per collo e altezza del collo carico (imballo compreso)
  var REGOLE = {'TR-STD|EUR': {pezzi: 50, alt: 125}, 'TR-ALTA|EUR': {pezzi: 50, alt: 140}, 'TR-PED|EUR': {pezzi: 50, alt: 115},
    'TR-STD|IND': {pezzi: 60, alt: 135}, 'TR-ALTA|IND': {pezzi: 60, alt: 150}, 'TR-PED|IND': {pezzi: 60, alt: 125},
    'TR-STD|CASSA': {pezzi: 20, alt: 60}, 'TR-ALTA|CASSA': {pezzi: 20, alt: 60}, 'TR-PED|CASSA': {pezzi: 20, alt: 60}, 'SL-TAGLIO|CASSA': {pezzi: 20, alt: 60}};
  var VETTORI = {'V10': 'Trasporti Toscani Srl', 'V20': 'Corriere Centro Italia Spa', 'V00': 'Mezzo proprio del mittente'};
  var PREFISSO = '8012345';   // prefisso aziendale GS1 di fantasia (didattico)
  var SP = function () { var s = S(); if (!s.sped) s.sped = {colli: [], trasporti: []}; return s.sped; };
  // anagrafiche modificabili dall'allievo: i valori salvati nell'azienda prevalgono su quelli predefiniti
  var unisci = function (base, mie) { var o = {}; Object.keys(base).forEach(function (k) { o[k] = Object.assign({}, base[k], (mie || {})[k] || {}); }); return o; };
  var imballi = function () { return unisci(IMBALLI, SP().imballi); };
  var veicoli = function () { return unisci(VEICOLI, SP().veicoli); };
  var regola = function (mat, imb) { var k = mat + '|' + imb, mie = (SP().regole || {})[k]; return mie ? Object.assign({definita: true}, mie) : REGOLE[k] ? Object.assign({}, REGOLE[k]) : null; };
  var cons = function (n) { var c = S().consegne.find(function (x) { return x.numero === String(n); }); if (!c) throw Error('Consegna ' + n + ' inesistente.'); return c; };
  var tr = function (n) { var t = SP().trasporti.find(function (x) { return x.numero === String(n); }); if (!t) throw Error('Trasporto ' + n + ' inesistente.'); return t; };
  function sscc(seriale) {   // 18 cifre: estensione 3 + prefisso + seriale, cifra di controllo GS1 modulo 10
    var base = '3' + PREFISSO + String(seriale).padStart(9, '0');
    var somma = base.split('').reverse().reduce(function (t, c, i) { return t + (+c) * (i % 2 === 0 ? 3 : 1); }, 0);
    return base + ((10 - somma % 10) % 10);
  }
  function colliDi(numero) { return SP().colli.filter(function (x) { return x.consegna === String(numero); }); }
  // stato complessivo della consegna (come le colonne di stato di VL06O)
  function stato(c) {
    var p = WM() && WM().attivo() && c.wm ? WM().statoPrelievo(c) : {stato: c.pgi === false ? 'A' : 'C', prelevato: c.qta};
    var colli = colliDi(c.numero), imb = r2(colli.reduce(function (t, x) { return t + x.qta; }, 0));
    var t = SP().trasporti.find(function (x) { return x.consegne.indexOf(c.numero) >= 0; });
    return {prelievo: p.stato || 'C', prelevato: p.prelevato, imballo: !colli.length ? 'A' : imb >= p.prelevato ? 'C' : 'B', imballato: imb, colli: colli,
      trasporto: t ? t.numero : '', carico: !colli.length ? '' : colli.every(function (x) { return x.caricato; }) ? 'C' : colli.some(function (x) { return x.caricato; }) ? 'B' : 'A',
      uscita: c.pgi === false ? 'A' : 'C', fattura: c.fatturata ? 'C' : 'A', ddt: c.ddt || ''};
  }
  function imballa(i) {
    var n = N(), c = cons(i.consegna), data = n.data(i.data), st = stato(c);
    if (c.pgi !== false) throw Error('Consegna già uscita: non si imballa più.');
    if (st.prelievo !== 'C') throw Error('Prima completa il prelievo (stato ' + st.prelievo + '): si imballa la merce arrivata in zona di spedizione.');
    if (st.imballo === 'C') throw Error('Consegna già imballata in ' + st.colli.length + ' colli.');
    var im = imballi()[i.imballo || 'EUR']; if (!im) throw Error('Imballo sconosciuto.');
    var rg = regola(c.materiale, i.imballo || 'EUR'), massimo = rg ? rg.pezzi : im.max;
    var per = L.num(i.perCollo == null || i.perCollo === '' ? massimo : i.perCollo, 'Pezzi per collo', 1); if (per > massimo) throw Error('Su un ' + im.nome + ' stanno al massimo ' + massimo + ' pezzi di ' + c.materiale + ' (regola di confezionamento).');
    var resto = r2(st.prelevato - st.imballato), m = n.materiale(c.materiale), out = [];
    while (resto > 1e-9) {
      var q = Math.min(per, resto), x = {sscc: sscc(n.numero('sscc')), consegna: c.numero, materiale: c.materiale, qta: q, imballo: i.imballo || 'EUR', tara: im.tara,
        lung: im.lung, larg: im.larg, alt: rg && rg.alt ? rg.alt : im.alt + 100,
        pesoNetto: r2(q * (m.peso || 1)), data: data, caricato: false};
      x.pesoLordo = r2(x.pesoNetto + x.tara); SP().colli.push(x); out.push(x); resto = r2(resto - q);
    }
    n.salva();
    return '<p class="lab-nota">Consegna ' + c.numero + ' imballata in <b>' + out.length + ' colli</b> (' + im.nome + '): ' + out.map(function (x) { return 'SSCC ' + x.sscc + ' · ' + x.qta + ' pz · ' + L.n0(x.pesoLordo) + ' kg'; }).join(' — ') + '. Peso lordo totale ' + L.n0(out.reduce(function (t, x) { return t + x.pesoLordo; }, 0)) + ' kg. Stampa le etichette SSCC e attaccale ai colli.</p>';
  }
  function creaTrasporto(i) {
    var n = N(), data = n.data(i.data), v = i.vettore || 'V10'; if (!VETTORI[v]) throw Error('Vettore sconosciuto.');
    var lista = (Array.isArray(i.consegne) ? i.consegne : String(i.consegne || '').split(/[\s,;]+/)).filter(Boolean);
    if (!lista.length) throw Error('Indica almeno una consegna.');
    lista.forEach(function (k) { var c = cons(k); if (c.pgi !== false) throw Error('La consegna ' + k + ' è già uscita.');
      if (SP().trasporti.some(function (t) { return t.consegne.indexOf(c.numero) >= 0; })) throw Error('La consegna ' + k + ' è già in un trasporto.'); });
    if (i.veicolo && !veicoli()[i.veicolo]) throw Error('Veicolo sconosciuto.');
    var t = {numero: String(n.numero('trasporto')), data: data, vettore: v, veicolo: i.veicolo || '', targa: String(i.targa || '').trim().toUpperCase(), autista: String(i.autista || '').trim(), porto: i.porto || 'franco',
      porta: 'GI-ZONE', consegne: lista.map(String), stato: 'pianificato', partenza: null};
    SP().trasporti.push(t); n.salva();
    return '<p class="lab-nota">Trasporto <b>' + t.numero + '</b> (VT01N) con ' + VETTORI[v] + (t.targa ? ', targa ' + L.esc(t.targa) : '') + ': consegne ' + t.consegne.join(', ') + '. Ora carica i colli leggendo gli SSCC (pistola RF → Carico).</p>';
  }
  function carica(i) {
    // la pistola può restituire «(00)…», «00…» o «]C100…» (simbologia GS1-128): restano le 18 cifre dell'SSCC
    var n = N(), cod = String(i.sscc || '').replace(/^\]C1/, '').replace(/\D/g, '');
    if (cod.length === 20 && cod.slice(0, 2) === '00') cod = cod.slice(2);
    var x = SP().colli.find(function (k) { return k.sscc === cod; });
    if (!x) throw Error('SSCC ' + (i.sscc || '(vuoto)') + ' sconosciuto: leggi l\'etichetta del collo.');
    var t = i.trasporto ? tr(i.trasporto) : SP().trasporti.find(function (k) { return k.consegne.indexOf(x.consegna) >= 0; });
    if (!t) throw Error('Il collo ' + x.sscc + ' (consegna ' + x.consegna + ') non è assegnato a nessun trasporto.');
    if (t.consegne.indexOf(x.consegna) < 0) throw Error('Collo sbagliato: la consegna ' + x.consegna + ' non viaggia sul trasporto ' + t.numero + '. Non caricarlo!');
    if (t.partenza) throw Error('Il camion del trasporto ' + t.numero + ' è già partito.');
    if (x.caricato) throw Error('Collo ' + x.sscc + ' già caricato.');
    x.caricato = n.data(i.data || t.data); x.trasporto = t.numero; t.stato = 'in carico';
    var tutti = t.consegne.every(function (k) { return colliDi(k).length && colliDi(k).every(function (y) { return y.caricato; }); });
    if (tutti) t.stato = 'caricato';
    n.salva();
    var mancano = t.consegne.reduce(function (s, k) { return s + colliDi(k).filter(function (y) { return !y.caricato; }).length; }, 0);
    var pos = t.piano && t.piano.posti.find(function (p) { return p.colli.indexOf(x.sscc) >= 0; });
    return '<p class="lab-nota">✓ Collo ' + x.sscc + ' caricato sul trasporto ' + t.numero + ' (consegna ' + x.consegna + ', ' + x.qta + ' pz ' + x.materiale + ')' + (pos ? ' nel <b>posto ' + pos.n + '</b> del piano di carico' + (pos.colli.length > 1 ? ' (pila di ' + pos.colli.length + ')' : '') : '') + '. ' + (mancano ? 'Mancano ' + mancano + ' colli.' : '<b>Carico completo</b>: si può registrare l\'uscita merci.') + '</p>';
  }
  // fine carico e uscita merci di tutte le consegne del trasporto (VT02N → attività «Fine carico» + 601)
  function parti(i) {
    var n = N(), t = tr(i.trasporto), data = n.data(i.data);
    if (t.partenza) throw Error('Trasporto già partito il ' + L.fd(t.partenza) + '.');
    t.consegne.forEach(function (k) {
      var c = cons(k), st = stato(c);
      if (st.prelievo !== 'C') throw Error('Consegna ' + k + ': prelievo non completato.');
      if (st.imballo !== 'C') throw Error('Consegna ' + k + ': merce non imballata.');
      if (st.carico !== 'C') throw Error('Consegna ' + k + ': non tutti i colli sono caricati.');
    });
    var regs = t.consegne.map(function (k) { return window.SD4.uscitaMerci({consegna: k, data: data}); });
    t.consegne.forEach(function (k) { var c = cons(k); c.ddt = String(n.numero('ddt')); c.trasporto = t.numero; });
    t.partenza = data; t.stato = 'partito'; n.salva();
    return regs;
  }
  function ddt(numeroConsegna) {
    var c = cons(numeroConsegna), o = S().ordini.find(function (x) { return x.numero === c.ordine; }), cli = N().cliente(c.cliente), st = stato(c);
    var t = SP().trasporti.find(function (x) { return x.consegne.indexOf(c.numero) >= 0; });
    return {numero: c.ddt, anno: (c.pgi || c.data || '').slice(0, 4), data: c.pgi || '', consegna: c.numero, ordine: c.ordine, rifCliente: o ? o.rif : '', cliente: c.cliente, destinatario: cli,
      materiale: c.materiale, descrizione: N().materiale(c.materiale).nome, qta: c.qta, colli: st.colli, pesoLordo: r2(st.colli.reduce(function (s, x) { return s + x.pesoLordo; }, 0)),
      pesoNetto: r2(st.colli.reduce(function (s, x) { return s + x.pesoNetto; }, 0)), trasporto: t, vettore: t ? VETTORI[t.vettore] : '', porto: t ? t.porto : ''};
  }
  // ── piano di carico del camion (VT01N → pianificazione del carico) ──
  // Stesso metodo del MasterLogistic WMS, adattato: 1) i colli impilabili con la stessa base si mettono uno sopra l'altro se ci stanno
  // in altezza e il collo sotto regge il peso; 2) le pile si dispongono a file dalla CABINA verso le PORTE (best fit decreasing per area,
  // due orientamenti); 3) miglioramento locale: un collo scartato prende il posto di uno già piazzato solo se quello trova un altro posto;
  // 4) controllo della portata. Criterio «fermate»: chi scende per ultimo si carica per primo, vicino alla cabina (LIFO).
  function colliDelTrasporto(t) { return t.consegne.reduce(function (a, k) { return a.concat(colliDi(k)); }, []); }
  function misure(x) {
    var im = imballi()[x.imballo] || IMBALLI.EUR, rg = regola(x.materiale, x.imballo);
    return {lung: im.lung, larg: im.larg, alt: x.alt || (rg && rg.alt) || im.alt + 100, peso: x.pesoLordo, pedana: im.alt, impilabile: im.impilabile !== false && String(im.impilabile) !== 'no', sopra: +im.sopra || 0};
  }
  function impila(colli, altezza) {
    var pile = [], liberi = colli.slice().sort(function (a, b) { return b.peso - a.peso; });
    while (liberi.length) {
      var base = liberi.shift(), pila = {colli: [base], lung: base.lung, larg: base.larg, alt: base.alt, peso: base.peso, fermata: base.fermata};
      if (base.impilabile) {
        var j = liberi.findIndex(function (y) { return y.fermata === base.fermata && y.lung === base.lung && y.larg === base.larg && y.impilabile && pila.alt + y.alt <= altezza + 1e-6 && y.peso <= base.sopra + 1e-6; });
        if (j >= 0) { var su = liberi.splice(j, 1)[0]; pila.colli.push(su); pila.alt += su.alt; pila.peso += su.peso; }
      }
      pile.push(pila);
    }
    return pile;
  }
  function orient(u) { var o = [[u.lung, u.larg, false]]; if (Math.abs(u.lung - u.larg) > 1e-6) o.push([u.larg, u.lung, true]); return o; }
  // file (shelf) dalla cabina verso le porte: ogni fila ha una profondità lungo il camion e si riempie da sinistra a destra
  function prova(u, file, v, avanti) {
    for (var f = 0; f < file.length; f++) {
      var fila = file[f];
      if (u.fermata !== undefined && fila.fermata !== u.fermata) continue;
      var op = orient(u);
      for (var k = 0; k < op.length; k++) if (op[k][0] <= fila.prof + 1e-6 && fila.x + op[k][1] <= v.larg + 1e-6) {
        var p = {u: u, y: fila.y, x: fila.x, lung: op[k][0], larg: op[k][1], ruotato: op[k][2]}; fila.x += op[k][1]; return {p: p, avanti: avanti};
      }
    }
    var op2 = orient(u);
    for (var h = 0; h < op2.length; h++) if (avanti + op2[h][0] <= v.lung + 1e-6 && op2[h][1] <= v.larg + 1e-6) {
      file.push({y: avanti, prof: op2[h][0], x: op2[h][1], fermata: u.fermata});
      return {p: {u: u, y: avanti, x: 0, lung: op2[h][0], larg: op2[h][1], ruotato: op2[h][2]}, avanti: avanti + op2[h][0]};
    }
    return {p: null, avanti: avanti};
  }
  function calcolaPiano(i) {
    var t = tr(i.trasporto), v = veicoli()[i.veicolo || t.veicolo]; if (!v) throw Error('Scegli il veicolo.');
    var criterio = i.criterio === 'saturazione' ? 'saturazione' : 'fermate';
    var colli = colliDelTrasporto(t); if (!colli.length) throw Error('Il trasporto ' + t.numero + ' non ha ancora colli: prima imballa le consegne.');
    var scarti = [], unita = [];
    colli.forEach(function (x) {
      var m = misure(x), u = {sscc: x.sscc, consegna: x.consegna, materiale: x.materiale, lung: m.lung, larg: m.larg, alt: m.alt, peso: m.peso, impilabile: m.impilabile, sopra: m.sopra, pedana: m.pedana,
        fermata: criterio === 'fermate' ? t.consegne.indexOf(x.consegna) : 0};
      if (m.alt > v.alt + 1e-6) scarti.push({colli: [x.sscc], motivo: 'troppo alto: ' + m.alt + ' cm, il camion ne ha ' + v.alt, pezzi: [u]}); else unita.push(u);
    });
    var pile = impila(unita, v.alt);
    pile.sort(function (a, b) { return criterio === 'fermate' && a.fermata !== b.fermata ? b.fermata - a.fermata : b.lung * b.larg - a.lung * a.larg || b.peso - a.peso; });
    var file = [], avanti = 0, posti = [];
    pile.forEach(function (pl) {
      var u = {lung: pl.lung, larg: pl.larg, fermata: criterio === 'fermate' ? pl.fermata : undefined, pila: pl}, r = prova(u, file, v, avanti);
      if (r.p) { avanti = r.avanti; posti.push(r.p); } else scarti.push({colli: pl.colli.map(function (c) { return c.sscc; }), motivo: 'non c’è più spazio sul pianale', pila: pl, pezzi: pl.colli});
    });
    // miglioramento locale: uno scartato entra al posto di uno piazzato solo se quest'ultimo trova un altro posto
    var scambi = 0;
    scarti.filter(function (s0) { return s0.pila; }).forEach(function (s0) {
      for (var k = 0; k < posti.length; k++) {
        var p = posti[k], d = s0.pila, ok = orient({lung: d.lung, larg: d.larg}).some(function (o) { return o[0] <= p.lung + 1e-6 && o[1] <= p.larg + 1e-6; });
        if (!ok || (p.u.fermata !== undefined && p.u.fermata !== d.fermata)) continue;
        var r = prova({lung: p.u.pila.lung, larg: p.u.pila.larg, fermata: p.u.fermata, pila: p.u.pila}, file, v, avanti);
        if (!r.p) continue;
        avanti = r.avanti; posti.push(r.p);
        posti[k] = {u: {lung: d.lung, larg: d.larg, fermata: p.u.fermata, pila: d}, y: p.y, x: p.x, lung: p.lung, larg: p.larg, ruotato: p.ruotato, scambio: true};
        scarti.splice(scarti.indexOf(s0), 1); scambi++; break;
      }
    });
    // portata: se si supera, restano a terra le ultime pile caricate (quelle verso le porte)
    posti.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var peso = 0, tenuti = [];
    posti.forEach(function (p) { if (peso + p.u.pila.peso <= v.portata + 1e-6) { peso += p.u.pila.peso; tenuti.push(p); } else scarti.push({colli: p.u.pila.colli.map(function (c) { return c.sscc; }), motivo: 'portata superata: il camion porta ' + L.n0(v.portata) + ' kg', pezzi: p.u.pila.colli}); });
    var area = tenuti.reduce(function (a, p) { return a + p.lung * p.larg; }, 0), ncolli = tenuti.reduce(function (a, p) { return a + p.u.pila.colli.length; }, 0);
    return {trasporto: t.numero, veicolo: i.veicolo || t.veicolo, criterio: criterio, v: v,
      posti: tenuti.map(function (p, k) { return {n: k + 1, x: p.x, y: p.y, lung: p.lung, larg: p.larg, ruotato: p.ruotato, alt: p.u.pila.alt, peso: r2(p.u.pila.peso), scambio: !!p.scambio,
        colli: p.u.pila.colli.map(function (c) { return c.sscc; }), strati: p.u.pila.colli.map(function (c) { return {sscc: c.sscc, alt: c.alt, pedana: c.pedana, peso: r2(c.peso), materiale: c.materiale, consegna: c.consegna}; }), consegne: p.u.pila.colli.map(function (c) { return c.consegna; }).filter(function (c0, z, a) { return a.indexOf(c0) === z; }), materiali: p.u.pila.colli.map(function (c) { return c.materiale; })}; }),
      scarti: scarti.map(function (s0) { return {colli: s0.colli, motivo: s0.motivo, pezzi: (s0.pezzi || []).map(function (c) { return {sscc: c.sscc, lung: c.lung, larg: c.larg, alt: c.alt, pedana: c.pedana, consegna: c.consegna, materiale: c.materiale}; })}; }),
      kpi: {colli: colli.length, caricati: ncolli, scartati: colli.length - ncolli, posti: tenuti.length, pile: tenuti.filter(function (p) { return p.u.pila.colli.length > 1; }).length, scambi: scambi,
        saturazioneArea: Math.round(area / (v.lung * v.larg) * 1000) / 10, peso: r2(peso), saturazionePeso: Math.round(peso / v.portata * 1000) / 10, metriUsati: Math.round(avanti) / 100}};
  }
  function salvaPiano(i) {
    var t = tr(i.trasporto); if (t.partenza) throw Error('Il trasporto è già partito.');
    var p = calcolaPiano(i); t.veicolo = p.veicolo; t.piano = {veicolo: p.veicolo, criterio: p.criterio, posti: p.posti, scarti: p.scarti, kpi: p.kpi, data: t.data}; N().salva();
    return '<p class="lab-nota">Piano di carico salvato sul trasporto ' + t.numero + ' (' + p.v.nome + ', criterio ' + (p.criterio === 'fermate' ? 'per fermate: l’ultimo cliente vicino alla cabina' : 'massima saturazione') + '): <b>' + p.kpi.caricati + ' colli su ' + p.kpi.colli + '</b> in ' + p.kpi.posti + ' posti a terra' + (p.kpi.pile ? ' (' + p.kpi.pile + ' pile da due)' : '') + ', pianale occupato ' + L.n0(p.kpi.saturazioneArea) + '%, peso ' + L.n0(p.kpi.peso) + ' kg (' + L.n0(p.kpi.saturazionePeso) + '% della portata).' +
      (p.scarti.length ? ' <b>⚠ Restano a terra ' + p.kpi.scartati + ' colli</b>: ' + p.scarti.map(function (s0) { return s0.motivo; }).filter(function (m, z, a) { return a.indexOf(m) === z; }).join('; ') + '. Scegli un camion più grande o dividi il trasporto.' : ' Tutti i colli ci stanno.') + ' Nessuna scrittura.</p>';
  }
  function salvaImballo(i) {
    var k = i.imballo; if (!IMBALLI[k]) throw Error('Imballo sconosciuto.');
    var x = {lung: L.num(i.lung, 'Lunghezza', 1), larg: L.num(i.larg, 'Larghezza', 1), alt: L.num(i.alt, 'Altezza dell’imballo', 0), tara: L.num(i.tara, 'Tara', 0), portata: L.num(i.portata, 'Portata', 1),
      impilabile: String(i.impilabile || 'si') !== 'no', sopra: L.num(i.sopra == null || i.sopra === '' ? 0 : i.sopra, 'Peso massimo sopra', 0)};
    if (!SP().imballi) SP().imballi = {}; SP().imballi[k] = x; N().salva();
    return '<p class="lab-nota">Imballo <b>' + imballi()[k].nome + '</b>: ' + x.lung + ' × ' + x.larg + ' × ' + x.alt + ' cm, tara ' + x.tara + ' kg, porta ' + L.n0(x.portata) + ' kg, ' + (x.impilabile ? 'impilabile (regge sopra fino a ' + L.n0(x.sopra) + ' kg)' : 'NON impilabile') + '. Nessuna scrittura.</p>';
  }
  function salvaRegola(i) {
    var mat = String(i.materiale || '').trim(), k = i.imballo; N().materiale(mat); if (!IMBALLI[k]) throw Error('Imballo sconosciuto.');
    var x = {pezzi: Math.round(L.num(i.pezzi, 'Pezzi per collo', 1)), alt: L.num(i.alt, 'Altezza del collo carico', 1)};
    var im = imballi()[k], peso = r2(x.pezzi * (N().materiale(mat).peso || 1) + im.tara);
    if (peso > im.portata + 1e-6) throw Error('Troppo pesante: ' + x.pezzi + ' pezzi di ' + mat + ' + tara = ' + L.n0(peso) + ' kg, ma il ' + im.nome + ' porta ' + L.n0(im.portata) + ' kg.');
    if (x.alt < im.alt) throw Error('Il collo carico non può essere più basso dell’imballo vuoto (' + im.alt + ' cm).');
    if (!SP().regole) SP().regole = {}; SP().regole[mat + '|' + k] = x; N().salva();
    return '<p class="lab-nota">Regola di confezionamento <b>' + mat + ' su ' + im.nome + '</b>: ' + x.pezzi + ' pezzi per collo, alto ' + x.alt + ' cm, peso lordo ' + L.n0(peso) + ' kg. Ora l’imballo propone questi pezzi per collo. Nessuna scrittura.</p>';
  }
  function salvaVeicolo(i) {
    var k = i.veicolo; if (!VEICOLI[k]) throw Error('Veicolo sconosciuto.');
    var x = {lung: L.num(i.lung, 'Lunghezza del pianale', 1), larg: L.num(i.larg, 'Larghezza del pianale', 1), alt: L.num(i.alt, 'Altezza utile', 1), portata: L.num(i.portata, 'Portata utile', 1)};
    if (!SP().veicoli) SP().veicoli = {}; SP().veicoli[k] = x; N().salva();
    return '<p class="lab-nota">Veicolo <b>' + VEICOLI[k].nome + '</b>: pianale ' + x.lung + ' × ' + x.larg + ' cm, altezza utile ' + x.alt + ' cm, portata ' + L.n0(x.portata) + ' kg. Nessuna scrittura.</p>';
  }
  return {IMBALLI: IMBALLI, VEICOLI: VEICOLI, REGOLE: REGOLE, imballi: imballi, veicoli: veicoli, regola: regola, calcolaPiano: calcolaPiano, salvaPiano: salvaPiano,
    salvaImballo: salvaImballo, salvaRegola: salvaRegola, salvaVeicolo: salvaVeicolo, colliDelTrasporto: colliDelTrasporto, VETTORI: VETTORI, sscc: sscc, stato: stato, colliDi: colliDi, imballa: imballa, creaTrasporto: creaTrasporto, carica: carica, parti: parti, ddt: ddt, SP: SP};
})();
