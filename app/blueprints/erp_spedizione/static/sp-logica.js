/* SISTEMA INTEGRATO — Spedizione in logica SAP (LE-SHP + WMS): consegna in uscita → prelievo (compiti FIFO, pistola RF)
   → imballo in colli con SSCC (VL02N Imballaggio / /SCWM/PACK) → trasporto (VT01N: vettore, targa, autista, consegne)
   → carico dei colli letti alla porta di spedizione → uscita merci del trasporto (601) → DDT (D.P.R. 472/1996) → fattura.
   SSCC (GS1, 18 cifre con cifra di controllo) con un prefisso aziendale di fantasia: è un esercizio. */
window.SP4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; }, WM = function () { return window.WM4; };
  var IMBALLI = {EUR: {nome: 'Pallet EUR 120×80', tara: 25, max: 50}, IND: {nome: 'Pallet industriale 120×100', tara: 30, max: 60}, CASSA: {nome: 'Cassa in legno', tara: 18, max: 20}};
  var VETTORI = {'V10': 'Trasporti Toscani Srl', 'V20': 'Corriere Centro Italia Spa', 'V00': 'Mezzo proprio del mittente'};
  var PREFISSO = '8012345';   // prefisso aziendale GS1 di fantasia (didattico)
  var SP = function () { var s = S(); if (!s.sped) s.sped = {colli: [], trasporti: []}; return s.sped; };
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
    var im = IMBALLI[i.imballo || 'EUR']; if (!im) throw Error('Imballo sconosciuto.');
    var per = L.num(i.perCollo == null || i.perCollo === '' ? im.max : i.perCollo, 'Pezzi per collo', 1); if (per > im.max) throw Error('Su un ' + im.nome + ' stanno al massimo ' + im.max + ' pezzi.');
    var resto = r2(st.prelevato - st.imballato), m = n.materiale(c.materiale), out = [];
    while (resto > 1e-9) {
      var q = Math.min(per, resto), x = {sscc: sscc(n.numero('sscc')), consegna: c.numero, materiale: c.materiale, qta: q, imballo: i.imballo || 'EUR', tara: im.tara,
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
    var t = {numero: String(n.numero('trasporto')), data: data, vettore: v, targa: String(i.targa || '').trim().toUpperCase(), autista: String(i.autista || '').trim(), porto: i.porto || 'franco',
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
    return '<p class="lab-nota">✓ Collo ' + x.sscc + ' caricato sul trasporto ' + t.numero + ' (consegna ' + x.consegna + ', ' + x.qta + ' pz ' + x.materiale + '). ' + (mancano ? 'Mancano ' + mancano + ' colli.' : '<b>Carico completo</b>: si può registrare l\'uscita merci.') + '</p>';
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
  return {IMBALLI: IMBALLI, VETTORI: VETTORI, sscc: sscc, stato: stato, colliDi: colliDi, imballa: imballa, creaTrasporto: creaTrasporto, carica: carica, parti: parti, ddt: ddt, SP: SP};
})();
