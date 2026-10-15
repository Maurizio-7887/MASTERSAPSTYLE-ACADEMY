/* SISTEMA INTEGRATO — Cespiti (FI-AA): anagrafica e acquisto con fattura (AS01 + F-90), ammortamento (AFAB),
   cessione con plus/minusvalenza (ABAVN / F-92), registro dei beni ammortizzabili (AW01N · AR01).
   Ammortamento civilistico a quote costanti, pro rata per mesi: mese di entrata in funzione e mese di cessione inclusi.
   Classi: IMP impianti e macchinari (conti 01 / 02), MEZ mezzi di movimentazione interna (conti 03 / 04). */
window.CE4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var CLASSI = {IMP: {nome: 'Impianti e macchinari', conto: '01', fondo: '02', aliquota: 10}, MEZ: {nome: 'Mezzi di movimentazione interna (carrelli)', conto: '03', fondo: '04', aliquota: 20}};
  var C = function () { var s = S(); s.cespiti = s.cespiti || []; return s.cespiti; };
  var mese = function (d) { return +d.slice(0, 4) * 12 + (+d.slice(5, 7)) - 1; };
  var trova = function (cod) { var c = C().find(function (x) { return x.codice === String(cod); }); if (!c) throw Error('Cespite ' + cod + ' inesistente.'); return c; };
  var fondo = function (c) { return r2(c.ammortamenti.reduce(function (t, a) { return t + a.importo; }, 0)); };
  var netto = function (c) { return r2(c.costo - fondo(c)); };
  // quota maturata fino al mese di «fino» compreso, nell'anno di «fino»
  function quota(c, fino) {
    var anno = +fino.slice(0, 4), da = Math.max(mese(c.inFunzione), anno * 12), a = mese(fino);
    if (c.cessione) a = Math.min(a, mese(c.cessione.data));
    var mesi = a - da + 1; if (mesi <= 0) return {mesi: 0, importo: 0};
    var gia = c.ammortamenti.filter(function (x) { return x.anno === anno; }).reduce(function (t, x) { return t + x.mesi; }, 0);
    mesi = Math.max(0, mesi - gia);
    var imp = Math.min(r2(c.costo * c.aliquota / 100 * mesi / 12), netto(c));
    return {mesi: mesi, importo: r2(imp), anno: anno};
  }
  function acquista(i) {
    var n = N(), data = n.data(i.data), cl = CLASSI[i.classe]; if (!cl) throw Error('Classe del cespite sconosciuta.');
    var desc = String(i.descrizione || '').trim(); if (!desc) throw Error('Scrivi la descrizione del bene.');
    var f = n.fornitore(i.fornitore), costo = L.num(i.importo, 'Costo (imponibile)', 0.01), aliq = i.aliquota == null || i.aliquota === '' ? cl.aliquota : L.num(i.aliquota, 'Aliquota di ammortamento %', 0.01);
    var ivaP = i.iva == null || i.iva === '' ? 22 : L.num(i.iva, 'IVA %', 0), iva = r2(costo * ivaP / 100), funz = i.inFunzione ? L.dataOk(i.inFunzione) : data;
    if (funz < data) throw Error('Il bene non può entrare in funzione prima dell\'acquisto.');
    var cod = 'CE-' + String(n.numero('cespite')).padStart(4, '0'), rif = String(i.rif || '').trim() || cod;
    var r = n.post({data: data, tipo: 'FATTURA_CESPITE', rif: rif, descrizione: 'F-90 acquisto cespite ' + cod + ' «' + desc + '» da ' + f.nome + ' — fattura ' + rif,
      righe: [{conto: cl.conto, dareAvere: 'DARE', importo: costo, testo: cod + ' ' + desc}, {conto: '14', dareAvere: 'DARE', importo: iva, testo: 'IVA ' + ivaP + '%'},
              {conto: '20', dareAvere: 'AVERE', importo: r2(costo + iva), partner: i.fornitore, testo: 'fattura ' + rif}]});
    C().push({codice: cod, descrizione: desc, classe: i.classe, costo: costo, aliquota: aliq, acquisto: data, inFunzione: funz, fornitore: i.fornitore, fattura: rif, contabile: r.numero, ammortamenti: [], cessione: null});
    n.salva(); return r;
  }
  // AFAB: ammortamento di tutti i cespiti attivi fino alla data (di solito il 31/12)
  function ammortizza(i) {
    var n = N(), data = n.data(i.data), righe = [], fatti = [];
    C().forEach(function (c) {
      if (c.cessione && c.cessione.data < data.slice(0, 4) + '-01-01') return;
      var q = quota(c, data); if (q.importo <= 0.004) return;
      var cl = CLASSI[c.classe];
      righe.push({conto: '50', dareAvere: 'DARE', importo: q.importo, testo: c.codice + ' ' + q.mesi + '/12 × ' + c.aliquota + '%'}, {conto: cl.fondo, dareAvere: 'AVERE', importo: q.importo, testo: c.codice});
      fatti.push([c, q]);
    });
    if (!fatti.length) throw Error('Niente da ammortizzare fino al ' + L.fd(data) + ': quote già registrate o nessun cespite in funzione.');
    var r = n.post({data: data, tipo: 'AMMORTAMENTO', rif: 'AFAB ' + data.slice(0, 7), descrizione: 'AFAB ammortamento cespiti fino al ' + L.fd(data) + ': ' + fatti.map(function (x) { return x[0].codice + ' ' + L.eur(x[1].importo); }).join(' · '), righe: righe});
    fatti.forEach(function (x) { x[0].ammortamenti.push({anno: x[1].anno, mesi: x[1].mesi, importo: x[1].importo, data: data, doc: r.numero}); });
    n.salva(); return r;
  }
  // cessione: prima la quota di ammortamento fino al mese di uscita, poi la vendita con plus o minusvalenza
  function cedi(i) {
    var n = N(), data = n.data(i.data), c = trova(i.cespite), cl = CLASSI[c.classe];
    if (c.cessione) throw Error('Cespite ' + c.codice + ' già ceduto il ' + L.fd(c.cessione.data) + '.');
    if (data < c.inFunzione) throw Error('Data di cessione anteriore all\'entrata in funzione.');
    var cli = n.cliente(i.cliente), prezzo = i.prezzo == null || i.prezzo === '' ? 0 : L.num(i.prezzo, 'Prezzo di vendita', 0), ivaP = i.iva == null || i.iva === '' ? 22 : L.num(i.iva, 'IVA %', 0), iva = r2(prezzo * ivaP / 100);
    c.cessione = {data: data};   // fissa il mese di uscita per la quota
    var q = quota(c, data), ra = null;
    if (q.importo > 0.004) {
      ra = n.post({data: data, tipo: 'AMMORTAMENTO', rif: 'AFAB ' + c.codice, descrizione: 'Ammortamento fino alla cessione di ' + c.codice + ' «' + c.descrizione + '»: ' + q.mesi + '/12 × ' + c.aliquota + '% di ' + L.eur(c.costo),
        righe: [{conto: '50', dareAvere: 'DARE', importo: q.importo, testo: c.codice}, {conto: cl.fondo, dareAvere: 'AVERE', importo: q.importo, testo: c.codice}]});
      c.ammortamenti.push({anno: q.anno, mesi: q.mesi, importo: q.importo, data: data, doc: ra.numero});
    }
    var f = fondo(c), nbv = r2(c.costo - f), diff = r2(prezzo - nbv), numero = 'CS-' + n.numero('fatturaServizi');
    var righe = [{conto: '11', dareAvere: 'DARE', importo: r2(prezzo + iva), partner: i.cliente, testo: 'fattura ' + numero}, {conto: cl.fondo, dareAvere: 'DARE', importo: f, testo: 'storno fondo ' + c.codice},
      {conto: cl.conto, dareAvere: 'AVERE', importo: c.costo, testo: 'eliminazione costo storico ' + c.codice}, {conto: '21', dareAvere: 'AVERE', importo: iva, testo: 'IVA ' + ivaP + '%'}];
    if (diff > 0.004) righe.push({conto: '45', dareAvere: 'AVERE', importo: diff, testo: 'plusvalenza ' + c.codice});
    if (diff < -0.004) righe.push({conto: '46', dareAvere: 'DARE', importo: -diff, testo: 'minusvalenza ' + c.codice});
    var r = n.post({data: data, tipo: 'CESSIONE_CESPITE', rif: numero, descrizione: 'Cessione di ' + c.codice + ' «' + c.descrizione + '» a ' + cli.nome + ' (fattura ' + numero + '): prezzo ' + L.eur(prezzo) + ', valore netto ' + L.eur(nbv) + ' → ' + (diff >= 0 ? 'plusvalenza ' : 'minusvalenza ') + L.eur(Math.abs(diff)), righe: righe});
    c.cessione = {data: data, cliente: i.cliente, prezzo: prezzo, iva: iva, valoreNetto: nbv, fondo: f, differenza: diff, fattura: numero, contabile: r.numero, ammortamento: ra ? ra.numero : ''};
    S().fattureServizi = S().fattureServizi || [];
    S().fattureServizi.push({numero: numero, cliente: i.cliente, data: data, imponibile: prezzo, iva: iva, totale: r2(prezzo + iva), testo: 'cessione ' + c.descrizione, contabile: r.numero});
    n.salva(); return r;
  }
  function registro(alla) {
    alla = alla || '9999-12-31';
    return C().map(function (c) {
      var f = r2(c.ammortamenti.filter(function (a) { return a.data <= alla; }).reduce(function (t, a) { return t + a.importo; }, 0)), ceduto = c.cessione && c.cessione.data <= alla;
      return {codice: c.codice, descrizione: c.descrizione, classe: CLASSI[c.classe].nome, costo: c.costo, aliquota: c.aliquota, inFunzione: c.inFunzione, fondo: ceduto ? 0 : f, netto: ceduto ? 0 : r2(c.costo - f),
        quote: c.ammortamenti, stato: ceduto ? 'ceduto il ' + L.fd(c.cessione.data) : 'in uso', cessione: c.cessione};
    });
  }
  return {CLASSI: CLASSI, acquista: acquista, ammortizza: ammortizza, cedi: cedi, registro: registro, quota: quota, trova: trova, elenco: C};
})();
