/* SISTEMA INTEGRATO — Fattura di servizi a cliente italiano (FB70): noleggi, posa, assistenza.
   D 11 Cliente / A 44 Ricavi per servizi / A 21 IVA a debito, con la scadenza scelta (serve a RiBa, factoring, scadenziario).
   Come ogni fattura emessa, va trasmessa allo SdI (Contabilità → Fattura elettronica). */
window.FS4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var F = function () { var s = S(); s.fattureServizi = s.fattureServizi || []; return s.fattureServizi; };
  function fattura(i) {
    var n = N(), data = n.data(i.data), c = n.cliente(i.cliente);
    if (c.valuta && c.valuta !== 'EUR') throw Error('Cliente in valuta estera: usa Valute → Fatture in valuta (FB70 in ' + c.valuta + ').');
    var imp = L.num(i.imponibile, 'Imponibile', 0.01), ivaP = i.iva == null || i.iva === '' ? 22 : L.num(i.iva, 'IVA %', 0), iva = r2(imp * ivaP / 100);
    var testo = String(i.testo || '').trim() || 'prestazione di servizi', scad = i.scadenza ? L.dataOk(i.scadenza) : '';
    if (scad && scad < data) throw Error('La scadenza non può precedere la data della fattura.');
    var numero = n.numero('fattura'), riga = {conto: '11', dareAvere: 'DARE', importo: r2(imp + iva), partner: i.cliente, testo: 'fattura ' + numero};
    if (scad) riga.scadenza = scad;
    var r = n.post({data: data, tipo: 'FATTURA_SERVIZI', rif: numero, descrizione: 'FB70 fattura ' + numero + ' a ' + c.nome + ': ' + testo + (scad ? ' — scadenza ' + L.fd(scad) : ''),
      righe: [riga, {conto: '44', dareAvere: 'AVERE', importo: imp, testo: testo}, {conto: '21', dareAvere: 'AVERE', importo: iva, testo: 'IVA ' + ivaP + '%'}]});
    F().push({numero: numero, cliente: i.cliente, data: data, imponibile: imp, iva: iva, totale: r2(imp + iva), testo: testo, scadenza: scad, contabile: r.numero});
    n.salva(); return r;
  }
  return {fattura: fattura, elenco: F};
})();
