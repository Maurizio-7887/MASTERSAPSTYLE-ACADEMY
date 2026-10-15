/* SISTEMA INTEGRATO — Valute estere in logica SAP: tabella dei tassi (OB08), fatture in valuta (FB70 / FB60),
   incasso e pagamento con differenze cambio realizzate (F-28 / F-53: conti 66 utili e 67 perdite),
   valutazione di fine periodo delle partite aperte (FAGL_FCV) con differenze non realizzate (68 / 16) e storno al primo giorno del periodo successivo.
   Tassi didattici, quotazione «incerto per certo» come la BCE: 1 EUR = x USD. Servizi B2B extra-UE: operazioni non soggette (art. 7-ter);
   servizi acquistati da fornitore extra-UE: reverse charge con autofattura (TD17). */
window.FX4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var V = function () { var s = S(); if (!s.fx) s.fx = {tassi: [], documenti: [], valutazioni: []}; return s.fx; };
  function tasso(i) {
    var data = L.dataOk(i.data), t = L.num(i.tasso, 'Tasso', 0.0001), v = String(i.valuta || 'USD').toUpperCase();
    V().tassi = V().tassi.filter(function (x) { return !(x.valuta === v && x.data === data); }).concat([{valuta: v, data: data, tasso: t}]).sort(function (a, b) { return a.data < b.data ? -1 : 1; });
    N().salva(); return '<p class="lab-nota">Tasso ' + v + ' del ' + L.fd(data) + ': 1 EUR = ' + t.toLocaleString('it-IT', {minimumFractionDigits: 4}) + ' ' + v + '.</p>';
  }
  function cambio(v, data) {   // il tasso valido è l'ultimo inserito fino a quella data (come OB08 con validità)
    var t = V().tassi.filter(function (x) { return x.valuta === v && x.data <= data; }).slice(-1)[0];
    if (!t) throw Error('Manca il tasso ' + v + ' valido al ' + L.fd(data) + ' (OB08).');
    return t.tasso;
  }
  var inEuro = function (imp, v, data) { return r2(imp / cambio(v, data)); };
  function fatturaCliente(i) {   // FB70 fattura di servizi a cliente estero
    var n = N(), data = n.data(i.data), c = n.cliente(i.cliente), v = c.valuta || 'EUR'; if (v === 'EUR') throw Error('Il cliente ' + i.cliente + ' fattura in euro: usa la fatturazione SD.');
    var imp = L.num(i.importo, 'Importo in ' + v, 0.01), eur = inEuro(imp, v, data), numero = n.numero('fattura');
    var r = n.post({data: data, tipo: 'FATTURA_VALUTA', rif: numero, descrizione: 'FB70 fattura ' + numero + ' a ' + c.nome + ': ' + L.eur(imp) + ' ' + v + ' al cambio ' + cambio(v, data) + ' — ' + (i.testo || 'servizi') + ' (non soggetta art. 7-ter, servizio a soggetto passivo extra-UE)',
      righe: [{conto: '11', dareAvere: 'DARE', importo: eur, partner: i.cliente, valuta: v, importoValuta: imp}, {conto: '44', dareAvere: 'AVERE', importo: eur, testo: 'ricavo per servizi'}]});
    V().documenti.push({numero: numero, lato: 'cliente', partner: i.cliente, data: data, valuta: v, importo: imp, cambio: cambio(v, data), eur: eur, contabile: r.numero, testo: i.testo || ''});
    n.salva(); return r;
  }
  function fatturaFornitore(i) {   // FB60 fattura di servizi da fornitore extra-UE con reverse charge
    var n = N(), data = n.data(i.data), f = n.fornitore(i.fornitore), v = f.valuta || 'EUR'; if (v === 'EUR') throw Error('Fornitore in euro: usa la MIRO.');
    var imp = L.num(i.importo, 'Importo in ' + v, 0.01), eur = inEuro(imp, v, data), iva = r2(eur * 22 / 100), numero = n.numero('fatturaFornitore');
    var r = n.post({data: data, tipo: 'FATTURA_VALUTA', rif: numero, descrizione: 'FB60 fattura ' + (i.rif || numero) + ' di ' + f.nome + ': ' + L.eur(imp) + ' ' + v + ' al cambio ' + cambio(v, data) + ' — reverse charge con autofattura TD17 (IVA 22% a debito e a credito)',
      righe: [{conto: '54', dareAvere: 'DARE', importo: eur, testo: i.testo || 'consulenza'}, {conto: '20', dareAvere: 'AVERE', importo: eur, partner: i.fornitore, valuta: v, importoValuta: imp},
              {conto: '14', dareAvere: 'DARE', importo: iva, testo: 'IVA reverse charge'}, {conto: '21', dareAvere: 'AVERE', importo: iva, testo: 'IVA reverse charge (TD17)'}]});
    V().documenti.push({numero: numero, lato: 'fornitore', partner: i.fornitore, data: data, valuta: v, importo: imp, cambio: cambio(v, data), eur: eur, contabile: r.numero, rif: i.rif || ''});
    n.salva(); return r;
  }
  var docV = function (n) { var d = V().documenti.find(function (x) { return x.numero === String(n); }); if (!d) throw Error('Documento in valuta ' + n + ' inesistente.'); return d; };
  // incasso / pagamento in valuta: chiude la partita al cambio storico, la differenza va a utili o perdite su cambi
  function regola(i) {
    var n = N(), d = docV(i.documento), data = n.data(i.data); if (d.chiuso) throw Error('Partita ' + d.numero + ' già chiusa il ' + L.fd(d.chiuso) + '.');
    var cam = cambio(d.valuta, data), eurOggi = r2(d.importo / cam), diff = r2(eurOggi - d.eur), cliente = d.lato === 'cliente';
    var utile = cliente ? diff > 0 : diff < 0, righe;
    if (cliente) righe = [{conto: '10', dareAvere: 'DARE', importo: eurOggi}, {conto: '11', dareAvere: 'AVERE', importo: d.eur, partner: d.partner, pareggio: d.numero, valuta: d.valuta, importoValuta: d.importo}];
    else righe = [{conto: '20', dareAvere: 'DARE', importo: d.eur, partner: d.partner, pareggio: d.numero, valuta: d.valuta, importoValuta: d.importo}, {conto: '10', dareAvere: 'AVERE', importo: eurOggi}];
    if (Math.abs(diff) > 0.004) righe.push(utile ? {conto: '66', dareAvere: 'AVERE', importo: Math.abs(diff), testo: 'utile su cambi realizzato'} : {conto: '67', dareAvere: 'DARE', importo: Math.abs(diff), testo: 'perdita su cambi realizzata'});
    // la rettifica di valutazione del periodo precedente, se c'è, è già stata stornata: si chiude al cambio storico
    var r = n.post({data: data, tipo: cliente ? 'INCASSO_VALUTA' : 'PAGAMENTO_VALUTA', rif: 'REG ' + d.numero, descrizione: (cliente ? 'F-28 incasso ' : 'F-53 pagamento ') + L.eur(d.importo) + ' ' + d.valuta + ' della partita ' + d.numero + ' al cambio ' + cam + ' (storico ' + d.cambio + '): ' + (Math.abs(diff) < 0.005 ? 'nessuna differenza' : (utile ? 'utile' : 'perdita') + ' su cambi ' + L.eur(Math.abs(diff))), righe: righe});
    d.chiuso = data; d.cambioChiusura = cam; d.differenza = utile ? Math.abs(diff) : -Math.abs(diff); n.salva(); return r;
  }
  // FAGL_FCV: valutazione delle partite aperte al cambio di fine periodo, con storno al giorno dopo
  function valuta(i) {
    var n = N(), data = n.data(i.data), aperte = V().documenti.filter(function (d) { return !d.chiuso || d.chiuso > data; }).filter(function (d) { return d.data <= data; });
    if (V().valutazioni.some(function (x) { return x.data === data; })) throw Error('Valutazione al ' + L.fd(data) + ' già eseguita.');
    if (!aperte.length) throw Error('Nessuna partita in valuta aperta al ' + L.fd(data) + '.');
    var righe = [], dett = [], tot = 0;
    aperte.forEach(function (d) {
      var cam = cambio(d.valuta, data), eurOggi = r2(d.importo / cam), diff = r2(eurOggi - d.eur), cliente = d.lato === 'cliente';
      var effetto = cliente ? diff : -diff;   // positivo = utile non realizzato
      dett.push({numero: d.numero, partner: d.partner, lato: d.lato, valuta: d.valuta, importo: d.importo, cambioStorico: d.cambio, cambioFine: cam, eurStorico: d.eur, eurFine: eurOggi, effetto: r2(effetto)});
      tot = r2(tot + effetto);
      if (Math.abs(effetto) > 0.004) righe.push(effetto < 0 ? {conto: '68', dareAvere: 'DARE', importo: -effetto, testo: 'perdita non realizzata ' + d.numero} : {conto: '68', dareAvere: 'AVERE', importo: effetto, testo: 'utile non realizzato ' + d.numero},
        {conto: '16', dareAvere: effetto < 0 ? 'AVERE' : 'DARE', importo: Math.abs(effetto), testo: 'rettifica ' + (cliente ? 'credito' : 'debito') + ' ' + d.numero});
    });
    var r = righe.length ? n.post({data: data, tipo: 'VALUTAZIONE_CAMBI', rif: 'FAGL_FCV ' + data, descrizione: 'FAGL_FCV valutazione partite in valuta al ' + L.fd(data) + ': ' + (tot < 0 ? 'perdita' : 'utile') + ' non realizzata netta ' + L.eur(Math.abs(tot)), righe: righe}) : null;
    var storno = null;
    if (r && i.storno !== false && i.storno !== 'no') {
      var dopo = window.TS4 ? window.TS4.piuGiorni(data, 1) : data;
      storno = n.post({data: dopo, tipo: 'VALUTAZIONE_CAMBI', rif: 'STORNO FAGL_FCV ' + data, descrizione: 'Storno della valutazione cambi del ' + L.fd(data) + ' (il nuovo periodo riparte dal cambio storico)',
        righe: r.righe.map(function (x) { return {conto: x.conto, dareAvere: x.dareAvere === 'DARE' ? 'AVERE' : 'DARE', importo: x.importo, testo: 'storno ' + x.testo}; })});
    }
    V().valutazioni.push({data: data, dettaglio: dett, totale: tot, contabile: r ? r.numero : '', storno: storno ? storno.numero : ''});
    n.salva(); return [r, storno].filter(Boolean);
  }
  return {V: V, tasso: tasso, cambio: cambio, inEuro: inEuro, fatturaCliente: fatturaCliente, fatturaFornitore: fatturaFornitore, regola: regola, valuta: valuta, docV: docV};
})();
