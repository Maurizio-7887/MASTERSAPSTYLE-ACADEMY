/* SISTEMA INTEGRATO — SD: condizioni di prezzo, ordini, acconti, consegne, fatture, resi, note di credito, incassi.
   Procedura di calcolo ZFT001 (come RVAA01):
     PR00 Prezzo        sequenza di accesso: 1) cliente/materiale  2) materiale
     ZSCA Sconto quantità a scaglioni (% sul lordo, per materiale)
     K007 Sconto cliente (% sul lordo)
     KF00 Trasporto (€/pz per regione del cliente)
     = Netto
     MWST IVA 22%
     ERB1 Provvigione agente 3% del netto (accantonamento)    VPRS Costo standard (statistico) → margine
   Contabilizzazione della fattura: D 11 cliente · A 40 lordo · D 47 sconti · A 48 trasporti · A 21 IVA (+ D 19 acconto dedotto)
   e D 57 / A 26 provvigioni. Uscita merci 601: D 41 / A 13. Ogni fattura e nota di credito scrive una riga CO-PA. */
window.SD4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2, N = null;
  var IVA = 22, PROVV = 3;
  var TIPI = {PR00: 'Prezzo', K007: 'Sconto cliente %', ZSCA: 'Sconto quantità a scaglioni %', KF00: 'Trasporto €/pz per regione', ERB1: 'Provvigione agente %'};
  var S = function () { return N.S; };

  // condizioni predefinite create all'avvio (listino, scaglioni, trasporto Lazio, provvigione)
  window.S4.dopoAvvio.push(function (n) {
    var c = n.S.condizioni;
    [['TR-STD', 60], ['TR-ALTA', 72], ['TR-PED', 55]].forEach(function (x) { c.push({tipo: 'PR00', chiave: 'materiale', materiale: x[0], valore: x[1], origine: 'listino'}); });
    ['TR-STD', 'TR-ALTA', 'TR-PED'].forEach(function (m) { c.push({tipo: 'ZSCA', chiave: 'materiale', materiale: m, scaglioni: [[100, 2], [300, 4]], origine: 'listino'}); });
    c.push({tipo: 'KF00', chiave: 'regione', regione: 'Lazio', valore: 1.50, origine: 'listino'});
    c.push({tipo: 'ERB1', chiave: 'generale', valore: PROVV, origine: 'listino'});
  });

  function avvia(chiave) { N = window.S4.crea(chiave); return N; }

  // VK11: nuova condizione
  function creaCondizione(i) {
    var tipo = i.tipo;
    if (!TIPI[tipo]) throw Error('Tipo condizione sconosciuto.');
    var v = L.num(i.valore, 'Valore', 0);
    var c = {tipo: tipo, valore: v, origine: 'VK11'};
    if (tipo === 'PR00') {
      N.materiale(i.materiale); c.materiale = i.materiale;
      if (i.cliente) { N.cliente(i.cliente); c.chiave = 'cliente/materiale'; c.cliente = i.cliente; } else c.chiave = 'materiale';
    } else if (tipo === 'K007') { N.cliente(i.cliente); c.chiave = 'cliente'; c.cliente = i.cliente; if (v > 30) throw Error('Sconto oltre il 30%: controlla il valore.'); }
    else if (tipo === 'KF00') { if (!i.regione) throw Error('Scrivi la regione.'); c.chiave = 'regione'; c.regione = i.regione; }
    else throw Error('Per ' + tipo + ' usa le condizioni di listino.');
    // una sola condizione per chiave: la nuova sostituisce la vecchia (come un nuovo record con validità da oggi)
    S().condizioni = S().condizioni.filter(function (x) { return !(x.tipo === c.tipo && x.chiave === c.chiave && x.cliente === c.cliente && x.materiale === c.materiale && x.regione === c.regione); });
    S().condizioni.push(c); N.salva();
    return '<p class="lab-nota">Condizione <b>' + tipo + '</b> (' + TIPI[tipo] + ') salvata — chiave ' + c.chiave + ': ' +
      [c.cliente, c.materiale, c.regione].filter(Boolean).join(' / ') + ' = ' + (tipo === 'PR00' || tipo === 'KF00' ? L.eur(v) + ' €' : L.n0(v) + ' %') + '. Nessuna scrittura: è un dato di anagrafica (tabella condizioni).</p>';
  }
  function trova(tipo, f) { return S().condizioni.filter(function (c) { return c.tipo === tipo && f(c); })[0] || null; }

  // determinazione prezzi (come la videata «Condizioni» della posizione)
  function prezzi(cliente, mat, qta) {
    var cli = N.cliente(cliente); N.materiale(mat);
    var traccia = [];
    var pr = trova('PR00', function (c) { return c.chiave === 'cliente/materiale' && c.cliente === cliente && c.materiale === mat; });
    traccia.push({tipo: 'PR00', accesso: '1 cliente/materiale', esito: pr ? 'trovato ' + L.eur(pr.valore) : 'non trovato'});
    if (!pr) { pr = trova('PR00', function (c) { return c.chiave === 'materiale' && c.materiale === mat; }); traccia.push({tipo: 'PR00', accesso: '2 materiale', esito: pr ? 'trovato ' + L.eur(pr.valore) : 'non trovato'}); }
    if (!pr) throw Error('Nessun prezzo PR00 per ' + mat + ': la posizione resta incompleta.');
    var lordo = r2(pr.valore * qta);
    var sc = trova('ZSCA', function (c) { return c.materiale === mat; }), pq = 0;
    if (sc) sc.scaglioni.forEach(function (s) { if (qta >= s[0]) pq = s[1]; });
    var k7 = trova('K007', function (c) { return c.cliente === cliente; });
    var kf = trova('KF00', function (c) { return c.regione === cli.regione; });
    var erb = trova('ERB1', function () { return true; });
    var scQ = r2(lordo * pq / 100), scC = r2(lordo * (k7 ? k7.valore : 0) / 100), tr = r2((kf ? kf.valore : 0) * qta);
    var netto = r2(lordo - scQ - scC + tr), iva = r2(netto * IVA / 100), costo = r2(qta * N.materiale(mat).std), provv = r2(netto * (erb ? erb.valore : 0) / 100);
    return {qta: qta, prezzo: pr.valore, prezzoDa: pr.chiave, lordo: lordo, scontoQPerc: pq, scontoQ: scQ, scontoCPerc: k7 ? k7.valore : 0, scontoC: scC,
            trasportoUnit: kf ? kf.valore : 0, trasporto: tr, netto: netto, ivaPerc: IVA, iva: iva, totale: r2(netto + iva), costo: costo, margine: r2(netto - costo),
            provvPerc: erb ? erb.valore : 0, provvigione: provv, traccia: traccia};
  }

  // ── controllo di disponibilità (ATP) e controllo crediti (fido) ──
  var inPrelievo = function (o) { return S().consegne.filter(function (c) { return c.ordine === o.numero && c.tipo === 'LF' && c.pgi === false; }).reduce(function (t, c) { return t + c.qta; }, 0); };
  var apertoOrd = function (o) { return Math.max(0, o.qta - o.consegnato - inPrelievo(o)); };
  var vivo = function (o) { return o.tipo === 'OR' && !o.rifiutato; };
  // ATP = giacenza − merce già in consegna (non ancora uscita) − quantità confermate agli altri ordini aperti (precedenti)
  function atp(mat, escludi) {
    var g = S().giacenze[mat] || 0, ris = 0, cons = 0;
    S().ordini.forEach(function (o) { if (!vivo(o) || o.materiale !== mat) return; cons += inPrelievo(o);
      if (o === escludi) return; if (escludi && (o.data > escludi.data || (o.data === escludi.data && +o.numero > +escludi.numero))) return;
      ris += Math.min(apertoOrd(o), Math.max(0, (o.confermata == null ? o.qta : o.confermata) - o.consegnato - inPrelievo(o))); });
    return {giacenza: r2(g), inConsegna: r2(cons), riservato: r2(ris), disponibile: r2(Math.max(0, g - cons - ris))};
  }
  // V_V2: riprogramma gli ordini aperti in ordine di data (chi ha ordinato prima è servito prima)
  function riconferma(mat) {
    var liberi = {}, out = [];
    S().ordini.filter(function (o) { return vivo(o) && (!mat || o.materiale === mat); }).sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : (+a.numero) - (+b.numero); }).forEach(function (o) {
      var m = o.materiale; if (liberi[m] == null) { var a = atp(m); liberi[m] = r2((S().giacenze[m] || 0) - a.inConsegna); }
      var serve = apertoOrd(o), c = Math.min(serve, Math.max(0, liberi[m])), prima = o.confermata;
      o.confermata = r2(o.consegnato + inPrelievo(o) + c); liberi[m] = r2(liberi[m] - c);
      if (prima !== o.confermata) out.push(o.numero + ' ' + m + ': confermati ' + o.confermata + ' su ' + o.qta);
    });
    N.salva(); return out;
  }
  function esposizione(cliente) {
    var aperto = S().ordini.filter(function (o) { return vivo(o) && o.cliente === cliente && o.prezzi && o.fatturato < o.qta; })
      .reduce(function (t, o) { return t + o.prezzi.totale * (o.qta - o.fatturato) / o.qta; }, 0);
    var crediti = N.saldo('11', cliente);
    return {crediti: r2(crediti), ordini: r2(aperto), totale: r2(crediti + aperto)};
  }
  function controlloCredito(o) {
    var c = N.cliente(o.cliente), es = esposizione(o.cliente), fido = c.fido == null ? Infinity : c.fido;
    if (c.bloccato) return {stato: 'B', motivo: 'cliente bloccato dal responsabile crediti' + (c.bloccoMotivo ? ': ' + c.bloccoMotivo : ''), esposizione: es.totale, fido: c.fido};
    if (es.totale > fido + 0.004) return {stato: 'B', motivo: 'fido superato di ' + L.eur(es.totale - fido) + ' €', esposizione: es.totale, fido: c.fido};
    return {stato: 'A', esposizione: es.totale, fido: c.fido};
  }

  function ordine(i) {
    var data = N.data(i.data), cliente = i.cliente, mat = i.materiale, qta = L.num(i.qta, 'Quantità', 1);
    var p = prezzi(cliente, mat, qta);
    var o = {numero: N.numero('ordine'), tipo: 'OR', data: data, cliente: cliente, materiale: mat, qta: qta, rif: String(i.rif || '').trim(), prezzi: p, consegnato: 0, fatturato: 0};
    var a = atp(mat, o); o.confermata = Math.min(qta, a.disponibile); o.atp = a;
    S().ordini.push(o);
    o.credito = controlloCredito(o);
    N.salva();
    var cli = N.cliente(cliente);
    return '<p class="lab-nota">Ordine cliente <b>' + o.numero + '</b> (tipo OR) creato. Netto ' + L.eur(p.netto) + ' € + IVA ' + L.eur(p.iva) + ' = ' + L.eur(p.totale) + ' €. Margine a costo standard ' + L.eur(p.margine) + ' €. Nessuna scrittura contabile.</p>' +
      '<p class="lab-nota">📦 <b>Disponibilità (ATP)</b>: giacenza ' + L.n0(a.giacenza) + ' − già in consegna ' + L.n0(a.inConsegna) + ' − confermato ad altri ordini ' + L.n0(a.riservato) + ' = <b>' + L.n0(a.disponibile) + '</b> pz. ' +
        (o.confermata >= qta ? 'Ordine <b>confermato per intero</b>.' : '<b>Confermati ' + L.n0(o.confermata) + ' pz su ' + L.n0(qta) + '</b>: il resto aspetta la produzione (si conferma da solo all\'entrata dei pezzi, o con V_V2).') + '</p>' +
      (o.credito.stato === 'B' ? '<p class="lab-nota">⛔ <b>Blocco crediti</b> (stato B): ' + o.credito.motivo + ' — esposizione ' + L.eur(o.credito.esposizione) + ' € su un fido di ' + L.eur(cli.fido) + ' €. L\'ordine è salvato ma <b>non si consegna</b> finché il responsabile crediti non lo rilascia (VKM1, Vendite → Gestione crediti).</p>'
        : '<p class="lab-nota">💳 <b>Controllo crediti superato</b>: esposizione ' + L.eur(o.credito.esposizione) + ' € su un fido di ' + L.eur(cli.fido) + ' €.</p>');
  }
  // VKM1: decisione del responsabile crediti sull'ordine bloccato
  function decisioneCredito(i) {
    var o = ord(i.ordine), c = N.cliente(o.cliente), data = N.data(i.data || o.data), d = i.decisione;
    if (!o.credito || o.credito.stato !== 'B') throw Error('L\'ordine ' + o.numero + ' non è bloccato per crediti.');
    var log = function (testo) { (S().creditiLog = S().creditiLog || []).push({data: data, ordine: o.numero, cliente: o.cliente, decisione: testo, nota: String(i.nota || '')}); };
    if (d === 'rilascia') { o.credito.stato = 'D'; o.credito.rilascio = data; log('Sforamento autorizzato (solo questo ordine)'); }
    else if (d === 'fido') { var f = L.num(i.fido, 'Nuovo fido', 0); var vecchio = c.fido; c.fido = f; var x = controlloCredito(o); log('Fido aumentato da ' + L.eur(vecchio) + ' a ' + L.eur(f) + ' €');
      if (x.stato === 'B') { o.credito = x; N.salva(); return '<p class="lab-nota">Fido portato a ' + L.eur(f) + ' €, ma l\'ordine resta bloccato: ' + x.motivo + '.</p>'; }
      o.credito = x; o.credito.rilascio = data; }
    else if (d === 'rifiuta') { log('Non autorizzato per ora: l\'ordine resta bloccato'); N.salva(); return '<p class="lab-nota">Decisione registrata: l\'ordine ' + o.numero + ' resta bloccato.</p>'; }
    else if (d === 'definitivo') { o.rifiutato = 'Z1 rifiutato per rischio di credito'; o.credito.stato = 'R'; log('Blocco definitivo: ordine rifiutato'); }
    else throw Error('Decisione sconosciuta.');
    if (d !== 'definitivo') riconferma(o.materiale);
    N.salva();
    return '<p class="lab-nota">VKM1 — ordine ' + o.numero + ': ' + (d === 'definitivo' ? 'rifiutato (motivo di rifiuto Z1): non si consegna più.' : 'rilasciato, ora si può consegnare.') + '</p>';
  }
  // FD32: fido, classe di rischio, blocco del cliente
  function anagraficaCredito(i) {
    var c = N.cliente(i.cliente), prima = {fido: c.fido, bloccato: c.bloccato};
    if (i.fido !== undefined && i.fido !== '') c.fido = L.num(i.fido, 'Fido', 0);
    if (i.rischio) c.rischio = i.rischio;
    if (i.bloccato !== undefined) { c.bloccato = i.bloccato === true || i.bloccato === 'si'; c.bloccoMotivo = c.bloccato ? String(i.motivo || '') : ''; }
    (S().creditiLog = S().creditiLog || []).push({data: N.data(i.data || S().avviato), ordine: '', cliente: i.cliente, decisione: 'FD32: fido ' + L.eur(c.fido) + ' · rischio ' + (c.rischio || '') + (c.bloccato ? ' · CLIENTE BLOCCATO' : prima.bloccato ? ' · cliente sbloccato' : ''), nota: String(i.motivo || '')});
    N.salva();
    return '<p class="lab-nota">FD32 — ' + c.nome + ': fido ' + L.eur(c.fido) + ' €, classe di rischio ' + (c.rischio || '—') + (c.bloccato ? ', <b>cliente bloccato</b>: nessun nuovo ordine si consegna' : '') + '.</p>';
  }
  var ord = function (n) { var o = S().ordini.find(function (x) { return x.numero === String(n); }); if (!o) throw Error('Ordine ' + n + ' inesistente.'); return o; };

  // F-37 richiesta di acconto (partita statistica) · F-29 incasso dell'acconto con fattura d'acconto (IVA all'incasso)
  function richiestaAcconto(i) {
    var o = ord(i.ordine), data = N.data(i.data), imp = L.num(i.importo, 'Importo acconto (imponibile)', 1);
    if (imp > o.prezzi.netto + 1e-9) throw Error('L\'acconto supera il netto dell\'ordine (' + L.eur(o.prezzi.netto) + ').');
    var a = {numero: N.numero('richiesta'), ordine: o.numero, cliente: o.cliente, data: data, imponibile: r2(imp), iva: r2(imp * IVA / 100), pagato: null, dedotto: 0};
    S().acconti.push(a); N.salva();
    return '<p class="lab-nota">Richiesta di acconto <b>' + a.numero + '</b>: ' + L.eur(a.imponibile) + ' + IVA ' + L.eur(a.iva) + '. È una partita statistica (F-37): nessun effetto sul bilancio finché il cliente non paga.</p>';
  }
  function incassoAcconto(i) {
    var a = S().acconti.find(function (x) { return x.numero === String(i.richiesta); }); if (!a) throw Error('Richiesta di acconto inesistente.');
    if (a.pagato) throw Error('Acconto già incassato il ' + L.fd(a.pagato) + '.');
    var data = N.data(i.data); a.pagato = data;
    var r = N.post({data: data, tipo: 'ACCONTO', rif: a.numero, descrizione: 'Incasso acconto ' + a.numero + ' — ' + N.cliente(a.cliente).nome + ' (F-29, fattura d\'acconto)',
      righe: [{conto: '10', dareAvere: 'DARE', importo: a.imponibile + a.iva}, {conto: '19', dareAvere: 'AVERE', importo: a.imponibile, partner: a.cliente}, {conto: '21', dareAvere: 'AVERE', importo: a.iva}]});
    N.salva(); return r;
  }

  // VL01N con uscita merci (601). Con il WMS attivo la consegna nasce senza uscita merci: prima il prelievo (compiti di magazzino),
  // poi l'uscita merci (VL02N) dalla zona di spedizione, per la quantità prelevata.
  function consegna(i) {
    var o = ord(i.ordine), data = N.data(i.data);
    if (data < o.data) throw Error('Consegna anteriore all\'ordine.');
    var aperte = S().consegne.filter(function (c) { return c.ordine === o.numero && c.tipo === 'LF' && c.pgi === false; }).reduce(function (t, c) { return t + c.qta; }, 0);
    var q = o.qta - o.consegnato - aperte; if (q <= 0) throw Error('Ordine già consegnato (o con una consegna in prelievo).');
    if (o.rifiutato) throw Error('Ordine rifiutato (' + o.rifiutato + '): non si consegna.');
    if (o.credito && o.credito.stato === 'B') throw Error('Ordine bloccato dal controllo crediti (' + o.credito.motivo + '): serve il rilascio del responsabile crediti (VKM1).');
    var disp = atp(o.materiale, o); if (disp.disponibile < q - 1e-9) throw Error('Controllo di disponibilità: per ' + o.materiale + ' sono disponibili ' + L.n0(disp.disponibile) + ' pz (giacenza ' + L.n0(disp.giacenza) + ' − in consegna ' + L.n0(disp.inConsegna) + ' − confermati a ordini precedenti ' + L.n0(disp.riservato) + '), ne servono ' + L.n0(q) + '.');
    var WM = window.WM4;
    if (WM && WM.attivo(data)) {
      if ((S().giacenze[o.materiale] || 0) < q) throw Error('Giacenza insufficiente di ' + o.materiale + ': disponibili ' + L.n0(S().giacenze[o.materiale]) + ' pz.');
      var c = {numero: N.numero('consegna'), tipo: 'LF', ordine: o.numero, cliente: o.cliente, materiale: o.materiale, qta: q, data: data, fatturata: false, pgi: false, wm: true};
      S().consegne.push(c);
      var t; try { t = WM.creaPrelievo(c, data); } catch (err) { S().consegne.pop(); throw err; }
      N.salva();
      if (c.ondata === 'in attesa') return '<p class="lab-nota">Consegna <b>' + c.numero + '</b> creata per ' + q + ' pz ' + o.materiale + ': il magazzino lavora <b>a ondate</b>, quindi i compiti di prelievo nascono quando rilasci l\'ondata (Innovazione → Prelievo a ondate).</p>';
      return '<p class="lab-nota">Consegna <b>' + c.numero + '</b> creata per ' + q + ' pz ' + o.materiale + ': il magazzino è gestito a ubicazioni (WMS), quindi nessuna uscita merci per ora. Creati ' + t.length + ' compiti di prelievo (' + (t.some(function (x) { return x.crossDock; }) ? 'anche in cross-docking dalla zona di ricevimento' : 'FIFO') + ') verso la zona di spedizione: confermali dalla pistola RF, poi registra l\'uscita merci.</p>';
    }
    var std = N.materiale(o.materiale).std, val = r2(q * std);
    var mv = N.movimento(o.materiale, -q, data, '601', o.numero);
    var c2 = {numero: N.numero('consegna'), tipo: 'LF', ordine: o.numero, cliente: o.cliente, materiale: o.materiale, qta: q, data: data, fatturata: false, valore: val, lotti: mv.lotti, seriali: mv.seriali || null};
    S().consegne.push(c2); o.consegnato += q;
    var r = N.post({data: data, tipo: 'USCITA_MERCI', rif: c2.numero, descrizione: 'Consegna ' + c2.numero + ' — uscita merci 601 ' + q + ' pz ' + o.materiale + ' (ordine ' + o.numero + ')',
      righe: [{conto: '41', dareAvere: 'DARE', importo: val}, {conto: '13', dareAvere: 'AVERE', importo: val}]});
    N.salva(); return r;
  }
  // VL02N uscita merci di una consegna prelevata a magazzino (stato prelievo C)
  function uscitaMerci(i) {
    var c = S().consegne.find(function (x) { return x.numero === String(i.consegna); }); if (!c) throw Error('Consegna inesistente.');
    if (c.pgi !== false) throw Error('Uscita merci già registrata.');
    var data = N.data(i.data); if (data < c.data) throw Error('Uscita merci anteriore alla consegna.');
    var WM = window.WM4, prel = c.wm ? WM.statoPrelievo(c) : {stato: 'C', prelevato: c.qta, aperti: 0};
    if (prel.stato !== 'C') throw Error('Prelievo non completato (stato ' + prel.stato + '): ' + prel.aperti + ' compiti ancora aperti.');
    var o = ord(c.ordine), q = prel.prelevato;
    if (q <= 0) throw Error('Niente di prelevato.');
    var std = N.materiale(c.materiale).std, val = r2(q * std);
    if (c.wm) WM.uscitaSpedizione(c, q);
    var mv = N.movimento(c.materiale, -q, data, '601', o.numero);
    c.qta = q; c.valore = val; c.pgi = data; o.consegnato += q; c.lotti = mv.lotti; c.seriali = mv.seriali || null;
    var r = N.post({data: data, tipo: 'USCITA_MERCI', rif: c.numero, descrizione: 'Consegna ' + c.numero + ' — uscita merci 601 ' + q + ' pz ' + c.materiale + ' dalla zona di spedizione (ordine ' + o.numero + ')',
      righe: [{conto: '41', dareAvere: 'DARE', importo: val}, {conto: '13', dareAvere: 'AVERE', importo: val}]});
    N.salva(); return r;
  }

  function rigaCopa(doc, data, tipo, cliente, mat, qta, p, segno, extra) {
    var cli = N.cliente(cliente), x = extra || {};
    S().copa.push({doc: doc, data: data, tipo: tipo, cliente: cliente, materiale: mat, regione: cli.regione, canale: cli.canale, gruppo: cli.gruppo,
      qta: segno * qta, ricaviLordi: r2(segno * (p ? p.lordo : 0)), scontiQuantita: r2(segno * (p ? p.scontoQ : 0)), scontiCliente: r2(segno * (p ? p.scontoC : 0)),
      trasporti: r2(segno * (p ? p.trasporto : 0)), abbuoni: r2(x.abbuono || 0), costoVenduto: r2(segno * (p ? p.costo : 0)), provvigioni: r2(segno * (p ? p.provvigione : 0))});
  }

  // VF01 fattura (tipo F2) dalla consegna, con detrazione dell'acconto incassato
  function fattura(i) {
    var c = S().consegne.find(function (x) { return x.numero === String(i.consegna); }); if (!c) throw Error('Consegna inesistente.');
    if (c.fatturata) throw Error('Consegna già fatturata.');
    if (c.pgi === false) throw Error('Consegna senza uscita merci: prima il prelievo e l\'uscita merci (VL02N).');
    var data = N.data(i.data); if (data < c.data) throw Error('Fattura anteriore alla consegna.');
    var o = ord(c.ordine), p = c.qta === o.qta ? o.prezzi : prezzi(o.cliente, o.materiale, c.qta);
    if (c.valore != null && Math.abs(c.valore - p.costo) > 0.004) { p = JSON.parse(JSON.stringify(p)); p.costo = c.valore; p.margine = r2(p.netto - c.valore); }   // VPRS ripreso dall'uscita merci
    var acc = S().acconti.filter(function (a) { return a.ordine === o.numero && a.pagato && a.imponibile - a.dedotto > 0.004; });
    var dedotto = 0; acc.forEach(function (a) { var d = Math.min(a.imponibile - a.dedotto, p.netto - dedotto); a.dedotto = r2(a.dedotto + d); dedotto = r2(dedotto + d); });
    var ivaDovuta = r2((p.netto - dedotto) * IVA / 100), daIncassare = r2(p.netto - dedotto + ivaDovuta);
    var f = {numero: N.numero('fattura'), tipo: 'F2', consegna: c.numero, ordine: o.numero, cliente: o.cliente, materiale: o.materiale, qta: c.qta, data: data, prezzi: p,
             accontoDedotto: dedotto, iva: ivaDovuta, totale: daIncassare, aperto: daIncassare, resi: 0};
    var righe = [{conto: '11', dareAvere: 'DARE', importo: daIncassare, partner: o.cliente}, {conto: '40', dareAvere: 'AVERE', importo: p.lordo},
      {conto: '47', dareAvere: 'DARE', importo: p.scontoQ + p.scontoC}, {conto: '48', dareAvere: 'AVERE', importo: p.trasporto}, {conto: '21', dareAvere: 'AVERE', importo: ivaDovuta}];
    if (dedotto) righe.push({conto: '19', dareAvere: 'DARE', importo: dedotto, partner: o.cliente, testo: 'AZWB acconto dedotto'});
    if (p.provvigione) righe.push({conto: '57', dareAvere: 'DARE', importo: p.provvigione}, {conto: '26', dareAvere: 'AVERE', importo: p.provvigione});
    var r = N.post({data: data, tipo: 'FATTURA', rif: f.numero, descrizione: 'Fattura ' + f.numero + ' (F2) — ' + N.cliente(o.cliente).nome + ' — ' + c.qta + ' pz ' + o.materiale + (dedotto ? ' — acconto dedotto ' + L.eur(dedotto) : ''), righe: righe});
    f.contabile = r.numero; c.fatturata = true; o.fatturato += c.qta;
    S().fatture.push(f); rigaCopa(f.numero, data, 'F2', o.cliente, o.materiale, c.qta, p, 1);
    N.salva(); return r;
  }
  var fat = function (n) { var f = S().fatture.find(function (x) { return x.numero === String(n); }); if (!f) throw Error('Fattura ' + n + ' inesistente.'); return f; };

  // Reso: ordine RE con riferimento alla fattura (prezzi copiati dalla fattura, in proporzione) → entrata 651 → nota di credito RE
  function reso(i) {
    var f = fat(i.fattura), data = N.data(i.data), q = L.num(i.qta, 'Quantità resa', 1), motivo = String(i.motivo || '').trim();
    if (!motivo) throw Error('Il motivo del reso è obbligatorio (es. 101 merce danneggiata).');
    if (q > f.qta - f.resi + 1e-9) throw Error('Si possono rendere al massimo ' + (f.qta - f.resi) + ' pz di questa fattura.');
    var k = q / f.qta, p = f.prezzi, pr = {};
    ['lordo', 'scontoQ', 'scontoC', 'trasporto', 'netto', 'iva', 'costo', 'provvigione'].forEach(function (x) { pr[x] = r2(p[x] * k); });
    pr.netto = r2(pr.lordo - pr.scontoQ - pr.scontoC + pr.trasporto); pr.iva = r2(pr.netto * IVA / 100); pr.totale = r2(pr.netto + pr.iva);
    var o = {numero: N.numero('reso'), tipo: 'RE', data: data, fattura: f.numero, cliente: f.cliente, materiale: f.materiale, qta: q, motivo: motivo, prezzi: pr, rientrato: false, accreditato: false};
    S().ordini.push(o); f.resi += q; N.salva();
    return '<p class="lab-nota">Ordine di reso <b>' + o.numero + '</b> (tipo RE) con riferimento alla fattura ' + f.numero + ': ' + q + ' pz, prezzi copiati dalla fattura. Accredito previsto ' + L.eur(pr.totale) + ' €. Ora serve la consegna di reso (entrata merci 651), poi la nota di credito.</p>';
  }
  function entrataReso(i) {
    var o = ord(i.reso); if (o.tipo !== 'RE') throw Error('Non è un ordine di reso.');
    if (o.rientrato) throw Error('Merce già rientrata.');
    var data = N.data(i.data), val = r2(o.qta * N.materiale(o.materiale).std);
    N.movimento(o.materiale, o.qta, data, '651', o.numero); o.rientrato = data;
    if (window.WM4 && window.WM4.attivo(data)) window.WM4.entrata(o.materiale, o.qta, data, o.numero, '651');
    var c = {numero: N.numero('consegna'), tipo: 'LR', ordine: o.numero, cliente: o.cliente, materiale: o.materiale, qta: o.qta, data: data};
    S().consegne.push(c);
    var r = N.post({data: data, tipo: 'ENTRATA_RESO', rif: c.numero, descrizione: 'Consegna di reso ' + c.numero + ' — entrata merci 651 ' + o.qta + ' pz ' + o.materiale + ' (reso ' + o.numero + ')',
      righe: [{conto: '13', dareAvere: 'DARE', importo: val}, {conto: '41', dareAvere: 'AVERE', importo: val}]});
    N.salva(); return r;
  }
  function notaCreditoReso(i) {
    var o = ord(i.reso); if (o.tipo !== 'RE') throw Error('Non è un ordine di reso.');
    if (!o.rientrato) throw Error('Prima la consegna di reso: si accredita la merce rientrata.');
    if (o.accreditato) throw Error('Nota di credito già emessa.');
    var data = N.data(i.data), p = o.prezzi, f = fat(o.fattura);
    var nc = {numero: N.numero('fattura'), tipo: 'RE', riferimento: o.numero, fattura: f.numero, cliente: o.cliente, materiale: o.materiale, qta: o.qta, data: data, prezzi: p, totale: p.totale};
    var righe = [{conto: '49', dareAvere: 'DARE', importo: p.netto, testo: 'resi su vendite'}, {conto: '21', dareAvere: 'DARE', importo: p.iva},
      {conto: '11', dareAvere: 'AVERE', importo: p.totale, partner: o.cliente}];
    if (p.provvigione) righe.push({conto: '26', dareAvere: 'DARE', importo: p.provvigione}, {conto: '57', dareAvere: 'AVERE', importo: p.provvigione});
    var r = N.post({data: data, tipo: 'NOTA_CREDITO', rif: nc.numero, descrizione: 'Nota di credito ' + nc.numero + ' (RE) per reso ' + o.numero + ' — ' + N.cliente(o.cliente).nome, righe: righe});
    nc.contabile = r.numero; o.accreditato = data; S().fatture.push(nc);
    rigaCopa(nc.numero, data, 'RE', o.cliente, o.materiale, o.qta, p, -1);
    N.salva(); return r;
  }
  // Abbuono: richiesta di nota di credito G2 (con blocco fatturazione) → approvazione → nota di credito G2
  function richiestaAbbuono(i) {
    var f = fat(i.fattura), data = N.data(i.data), imp = L.num(i.importo, 'Importo abbuono (imponibile)', 0.01), motivo = String(i.motivo || '').trim();
    if (!motivo) throw Error('Il motivo dell\'abbuono è obbligatorio.');
    if (imp > f.prezzi.netto + 1e-9) throw Error('Abbuono superiore al netto della fattura.');
    var o = {numero: N.numero('reso'), tipo: 'G2', data: data, fattura: f.numero, cliente: f.cliente, materiale: f.materiale, qta: 0, motivo: motivo, importo: r2(imp), blocco: true, accreditato: false};
    S().ordini.push(o); N.salva();
    return '<p class="lab-nota">Richiesta di nota di credito <b>' + o.numero + '</b> (G2) per ' + L.eur(imp) + ' € + IVA. Nasce con il <b>blocco fatturazione 08</b>: va approvata prima di emettere la nota di credito.</p>';
  }
  function approvaAbbuono(i) { var o = ord(i.richiesta); if (o.tipo !== 'G2') throw Error('Non è una richiesta G2.'); o.blocco = false; N.salva(); return '<p class="lab-nota">Blocco fatturazione tolto: la richiesta ' + o.numero + ' si può fatturare.</p>'; }
  function notaCreditoAbbuono(i) {
    var o = ord(i.richiesta); if (o.tipo !== 'G2') throw Error('Non è una richiesta G2.');
    if (o.blocco) throw Error('Richiesta bloccata per la fatturazione (blocco 08): approvala prima.');
    if (o.accreditato) throw Error('Nota di credito già emessa.');
    var data = N.data(i.data), iva = r2(o.importo * IVA / 100);
    var nc = {numero: N.numero('fattura'), tipo: 'G2', riferimento: o.numero, fattura: o.fattura, cliente: o.cliente, materiale: o.materiale, qta: 0, data: data, totale: r2(o.importo + iva)};
    var r = N.post({data: data, tipo: 'NOTA_CREDITO', rif: nc.numero, descrizione: 'Nota di credito ' + nc.numero + ' (G2) — abbuono: ' + o.motivo + ' — ' + N.cliente(o.cliente).nome,
      righe: [{conto: '49', dareAvere: 'DARE', importo: o.importo, testo: 'abbuoni su vendite'}, {conto: '21', dareAvere: 'DARE', importo: iva}, {conto: '11', dareAvere: 'AVERE', importo: o.importo + iva, partner: o.cliente}]});
    nc.contabile = r.numero; o.accreditato = data; S().fatture.push(nc);
    rigaCopa(nc.numero, data, 'G2', o.cliente, o.materiale, 0, null, -1, {abbuono: -o.importo});
    N.salva(); return r;
  }
  // F-28 incasso: chiude le partite del cliente
  function incasso(i) {
    var data = N.data(i.data), cliente = i.cliente; N.cliente(cliente);
    var imp = L.num(i.importo, 'Importo', 0.01), aperto = N.saldo('11', cliente);
    if (imp > aperto + 0.005) throw Error('Il cliente ha partite aperte per ' + L.eur(aperto) + ' €: non si incassa di più.');
    var r = N.post({data: data, tipo: 'INCASSO', rif: String(i.rif || ''), descrizione: 'Incasso (F-28) ' + N.cliente(cliente).nome + (i.rif ? ' — ' + i.rif : ''),
      righe: [{conto: '10', dareAvere: 'DARE', importo: imp}, {conto: '11', dareAvere: 'AVERE', importo: imp, partner: cliente}]});
    N.salva(); return r;
  }
  // VA03 flusso documenti dell'ordine
  function flusso(numero) {
    var s = S(), o = ord(numero), out = [{livello: 0, tipo: o.tipo === 'OR' ? 'Ordine cliente' : o.tipo === 'RE' ? 'Ordine di reso' : 'Richiesta nota di credito', numero: o.numero, data: o.data, stato: ''}];
    s.acconti.filter(function (a) { return a.ordine === o.numero; }).forEach(function (a) { out.push({livello: 1, tipo: 'Richiesta di acconto (F-37)', numero: a.numero, data: a.data, stato: a.pagato ? 'incassata ' + L.fd(a.pagato) : 'aperta'}); });
    s.consegne.filter(function (c) { return c.ordine === o.numero; }).forEach(function (c) {
      out.push({livello: 1, tipo: c.tipo === 'LR' ? 'Consegna di reso (651)' : 'Consegna (601)', numero: c.numero, data: c.data, stato: c.tipo === 'LF' ? (c.pgi === false ? 'in prelievo (WMS)' : c.fatturata ? 'fatturata' : 'da fatturare') : ''});
      if (window.WM4) window.WM4.compitiDi(c.numero).forEach(function (t) { out.push({livello: 2, tipo: 'Compito di magazzino ' + t.tipo, numero: t.numero, data: t.confermato || t.creato, stato: t.stato + (t.da ? ' · ' + t.da + ' → ' + t.a : '')}); });
      s.fatture.filter(function (f) { return f.consegna === c.numero; }).forEach(function (f) {
        out.push({livello: 2, tipo: 'Fattura (F2)', numero: f.numero, data: f.data, stato: 'contabile ' + f.contabile});
        s.ordini.filter(function (r) { return r.fattura === f.numero; }).forEach(function (r) { out.push({livello: 3, tipo: r.tipo === 'RE' ? 'Ordine di reso' : 'Richiesta nota di credito', numero: r.numero, data: r.data, stato: r.accreditato ? 'accreditato' : 'aperto'}); });
      });
    });
    s.fatture.filter(function (f) { return f.riferimento === o.numero; }).forEach(function (f) { out.push({livello: 1, tipo: 'Nota di credito (' + f.tipo + ')', numero: f.numero, data: f.data, stato: 'contabile ' + f.contabile}); });
    return out;
  }
  function partite(cliente) {
    return S().registrazioni.filter(function (r) { return r.righe.some(function (x) { return x.conto === '11' && x.partner === cliente; }); }).map(function (r) {
      var v = r.righe.filter(function (x) { return x.conto === '11' && x.partner === cliente; }).reduce(function (t, x) { return t + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0);
      return {data: r.data, numero: r.numero, descrizione: r.descrizione, importo: r2(v)};
    });
  }
  return {avvia: avvia, get N() { return N; }, get M() { return N; }, TIPI: TIPI, IVA: IVA, creaCondizione: creaCondizione, prezzi: prezzi, ordine: ordine, atp: atp, riconferma: riconferma, esposizione: esposizione, controlloCredito: controlloCredito, decisioneCredito: decisioneCredito, anagraficaCredito: anagraficaCredito, richiestaAcconto: richiestaAcconto,
    incassoAcconto: incassoAcconto, consegna: consegna, uscitaMerci: uscitaMerci, fattura: fattura, reso: reso, entrataReso: entrataReso, notaCreditoReso: notaCreditoReso,
    richiestaAbbuono: richiestaAbbuono, approvaAbbuono: approvaAbbuono, notaCreditoAbbuono: notaCreditoAbbuono, incasso: incasso, flusso: flusso, partite: partite,
    avviaSistema: function (i) { return N.avvia(i); }};
})();
