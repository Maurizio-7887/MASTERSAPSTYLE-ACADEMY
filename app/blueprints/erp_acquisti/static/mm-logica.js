/* SISTEMA INTEGRATO — MM acquisti: ordine d'acquisto (ME21N), entrata merci (MIGO 101), fattura fornitore (MIRO).
   Il ferro è a prezzo standard (controllo prezzo S): l'entrata merci carica il magazzino a standard,
   il conto WE/RE (22) al prezzo dell'ordine e la differenza va sul conto differenze prezzo (63) — e nel Material Ledger.
   La fattura chiude il WE/RE; se il prezzo fatturato è diverso da quello dell'ordine, nasce un'altra differenza prezzo. */
window.MM4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2, IVA = 22;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var oda = function (n) { var o = S().acquisti.find(function (x) { return x.numero === String(n); }); if (!o) throw Error('Ordine d\'acquisto ' + n + ' inesistente.'); return o; };

  function ordine(i) {
    var n = N(), data = n.data(i.data), f = i.fornitore || 'F100'; n.fornitore(f);
    var mat = i.materiale || 'FERRO', m = n.materiale(mat); if (m.tipo !== 'ROH') throw Error('Si acquistano solo materie prime (ROH): ' + mat + ' si produce.');
    var q = L.num(i.qta, 'Quantità', 1), p = L.num(i.prezzo, 'Prezzo netto', 0.0001);
    var o = {numero: n.numero('acquisto'), fornitore: f, materiale: mat, qta: q, prezzo: p, data: data, entrato: 0, fatturato: 0, valoreEntrato: 0};
    S().acquisti.push(o); n.salva();
    return '<p class="lab-nota">Ordine d\'acquisto <b>' + o.numero + '</b>: ' + L.n0(q) + ' ' + m.um + ' ' + mat + ' a ' + L.eur(p) + ' €/' + m.um + ' (valore ' + L.eur(q * p) + ' €). Il costo standard del ' + mat + ' è ' + L.eur(m.std) + ': all\'entrata merci la differenza andrà sul conto 63. Nessuna scrittura: è un impegno.</p>';
  }
  function entrata(i) {
    var n = N(), o = oda(i.ordine), data = n.data(i.data), q = L.num(i.qta == null || i.qta === '' ? o.qta - o.entrato : i.qta, 'Quantità', 0.001);
    if (data < o.data) throw Error('Entrata anteriore all\'ordine.');
    if (q > o.qta - o.entrato + 1e-9) throw Error('Restano da ricevere ' + L.n0(o.qta - o.entrato) + ' ' + n.materiale(o.materiale).um + '.');
    var m = n.materiale(o.materiale), std = r2(q * m.std), ord = r2(q * o.prezzo), pd = r2(ord - std);
    var doc = n.numero('materiale');
    n.movimento(o.materiale, q, data, '101', o.numero);
    if (window.WM4 && window.WM4.attivo(data)) window.WM4.entrata(o.materiale, q, data, doc, '101 acquisto');
    o.entrato = r2(o.entrato + q); o.valoreEntrato = r2(o.valoreEntrato + ord);
    (o.entrate = o.entrate || []).push({doc: doc, qta: q, data: data, valoreStd: std, valoreOrdine: ord, pd: pd});
    var r = n.post({data: data, tipo: 'ENTRATA_ACQUISTO', rif: doc, descrizione: 'MIGO 101 doc. ' + doc + ' — entrata ' + L.n0(q) + ' ' + m.um + ' ' + o.materiale + ' da ordine ' + o.numero,
      righe: [{conto: '12', dareAvere: 'DARE', importo: std, testo: 'a standard ' + L.eur(m.std)}, {conto: '63', dareAvere: 'DARE', importo: pd, testo: 'differenza prezzo ' + o.materiale},
              {conto: '22', dareAvere: 'AVERE', importo: ord, partner: o.fornitore, testo: 'WE/RE al prezzo d\'ordine'}]});
    if (Math.abs(pd) > 0.004) S().mlPD.push({data: data, mat: o.materiale, pd: pd, tipo: 'acquisto', rif: doc, qta: q});
    n.salva(); return r;
  }
  function fattura(i) {
    var n = N(), o = oda(i.ordine), data = n.data(i.data);
    var q = L.num(i.qta == null || i.qta === '' ? o.entrato - o.fatturato : i.qta, 'Quantità fatturata', 0.001), p = L.num(i.prezzo == null || i.prezzo === '' ? o.prezzo : i.prezzo, 'Prezzo fatturato', 0.0001);
    if (q > o.entrato - o.fatturato + 1e-9) throw Error('Si fattura solo la merce già entrata: restano ' + L.n0(o.entrato - o.fatturato) + '.');
    var imponibile = r2(q * p), wer = r2(q * o.prezzo), diff = r2(imponibile - wer), iva = r2(imponibile * IVA / 100);
    var numero = n.numero('fatturaFornitore'), rif = String(i.rif || '').trim();
    var r = n.post({data: data, tipo: 'FATTURA_FORNITORE', rif: numero, descrizione: 'MIRO ' + numero + ' — fattura ' + (rif || 's.n.') + ' di ' + n.fornitore(o.fornitore).nome + ' su ordine ' + o.numero,
      righe: [{conto: '22', dareAvere: 'DARE', importo: wer, partner: o.fornitore}, {conto: '63', dareAvere: 'DARE', importo: diff, testo: 'differenza prezzo fattura'},
              {conto: '14', dareAvere: 'DARE', importo: iva}, {conto: '20', dareAvere: 'AVERE', importo: r2(imponibile + iva), partner: o.fornitore}]});
    if (Math.abs(diff) > 0.004) S().mlPD.push({data: data, mat: o.materiale, pd: diff, tipo: 'fattura', rif: numero, qta: 0});
    o.fatturato = r2(o.fatturato + q);
    S().fattureFornitore.push({numero: numero, rif: rif, ordine: o.numero, fornitore: o.fornitore, data: data, qta: q, prezzo: p, imponibile: imponibile, iva: iva, totale: r2(imponibile + iva), contabile: r.numero});
    n.salva(); return r;
  }
  return {ordine: ordine, entrata: entrata, fattura: fattura, IVA: IVA};
})();
