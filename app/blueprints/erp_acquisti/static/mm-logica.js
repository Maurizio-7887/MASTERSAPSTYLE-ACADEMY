/* SISTEMA INTEGRATO — MM acquisti: ordine d'acquisto (ME21N), entrata merci (MIGO 101), fattura fornitore (MIRO).
   Il ferro è a prezzo standard (controllo prezzo S): l'entrata merci carica il magazzino a standard,
   il conto WE/RE (22) al prezzo dell'ordine e la differenza va sul conto differenze prezzo (63) — e nel Material Ledger.
   La fattura chiude il WE/RE; se il prezzo fatturato è diverso da quello dell'ordine, nasce un'altra differenza prezzo. */
window.MM4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2, IVA = 22;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var oda = function (n) { var o = S().acquisti.find(function (x) { return x.numero === String(n); }); if (!o) throw Error('Ordine d\'acquisto ' + n + ' inesistente.'); return o; };

  var P = function () { var s = S(); if (!s.rda) s.rda = []; if (!s.acqParam) s.acqParam = {soglia: 10000}; return s; };
  var rdaDi = function (n) { var r = P().rda.find(function (x) { return x.numero === String(n); }); if (!r) throw Error('Richiesta d\'acquisto ' + n + ' inesistente.'); return r; };
  // ME51N richiesta d'acquisto: chi ha bisogno del materiale lo chiede, non lo compra
  function richiesta(i) {
    var n = N(), data = n.data(i.data), mat = i.materiale || 'FERRO', m = n.materiale(mat); if (m.tipo !== 'ROH') throw Error('Si richiedono solo materie prime (ROH).');
    var q = L.num(i.qta, 'Quantità', 1), pz = i.prezzo == null || i.prezzo === '' ? m.std : L.num(i.prezzo, 'Prezzo stimato', 0.0001);
    var r = {numero: String(n.numero('rda')), data: data, materiale: mat, qta: q, prezzo: pz, valore: r2(q * pz), consegna: i.consegna ? n.data(i.consegna) : data, richiedente: String(i.richiedente || 'Produzione').trim(), motivo: String(i.motivo || '').trim(), stato: 'da approvare'};
    P().rda.push(r); n.salva();
    return '<p class="lab-nota">Richiesta d\'acquisto <b>' + r.numero + '</b> (ME51N): ' + L.n0(q) + ' ' + m.um + ' ' + mat + ' per il ' + L.fd(r.consegna) + ', valore stimato ' + L.eur(r.valore) + ' €. Ora serve l\'<b>approvazione</b> (ME54N): solo dopo il buyer può fare l\'ordine. Nessuna scrittura.</p>';
  }
  // ME54N approvazione (o rifiuto) della richiesta
  function approva(i) {
    var n = N(), r = rdaDi(i.rda), data = n.data(i.data || r.data); if (r.stato !== 'da approvare') throw Error('La richiesta ' + r.numero + ' è già ' + r.stato + '.');
    if (data < r.data) throw Error('L\'approvazione non può precedere la richiesta.');
    if (i.decisione === 'rifiuta') { r.stato = 'rifiutata'; r.decisione = {data: data, nota: String(i.nota || '')}; n.salva(); return '<p class="lab-nota">Richiesta ' + r.numero + ' <b>rifiutata</b>: non si può ordinare.</p>'; }
    r.stato = 'approvata'; r.decisione = {data: data, nota: String(i.nota || '')}; n.salva();
    return '<p class="lab-nota">Richiesta ' + r.numero + ' <b>approvata</b> (codice di rilascio 01): il buyer può creare l\'ordine d\'acquisto con riferimento alla richiesta.</p>';
  }
  function ordine(i) {
    var n = N(), data = n.data(i.data), r = i.rda ? rdaDi(i.rda) : null;
    if (r) { if (r.stato !== 'approvata') throw Error('La richiesta ' + r.numero + ' è «' + r.stato + '»: si ordina solo una richiesta approvata (ME54N).'); if (data < r.decisione.data) throw Error('L\'ordine non può precedere l\'approvazione.'); }
    var f = i.fornitore || 'F100'; n.fornitore(f);
    var mat = r ? r.materiale : (i.materiale || 'FERRO'), m = n.materiale(mat); if (m.tipo !== 'ROH') throw Error('Si acquistano solo materie prime (ROH): ' + mat + ' si produce.');
    var q = L.num(i.qta == null || i.qta === '' ? (r ? r.qta : i.qta) : i.qta, 'Quantità', 1), p = L.num(i.prezzo, 'Prezzo netto', 0.0001);
    var o = {numero: n.numero('acquisto'), fornitore: f, materiale: mat, qta: q, prezzo: p, data: data, entrato: 0, fatturato: 0, valoreEntrato: 0};
    if (r) { o.rda = r.numero; r.stato = 'ordinata'; r.ordine = o.numero; }
    var soglia = P().acqParam.soglia, val = r2(q * p);
    if (soglia && val > soglia) o.rilascio = {stato: 'bloccato', soglia: soglia};
    S().acquisti.push(o); n.salva();
    return '<p class="lab-nota">Ordine d\'acquisto <b>' + o.numero + '</b>' + (r ? ' (da richiesta ' + r.numero + ')' : '') + ': ' + L.n0(q) + ' ' + m.um + ' ' + mat + ' a ' + L.eur(p) + ' €/' + m.um + ' (valore ' + L.eur(val) + ' €). Il costo standard del ' + mat + ' è ' + L.eur(m.std) + ': all\'entrata merci la differenza andrà sul conto 63. Nessuna scrittura: è un impegno.</p>' +
      (o.rilascio ? '<p class="lab-nota">🔒 Valore oltre la soglia di ' + L.eur(soglia) + ' €: l\'ordine è <b>bloccato</b> dalla strategia di rilascio. Non si invia al fornitore e non riceve merce finché il responsabile acquisti non lo rilascia (ME29N).</p>' : '');
  }
  // ME29N rilascio dell'ordine d'acquisto sopra soglia
  function rilascia(i) {
    var n = N(), o = oda(i.ordine); if (!o.rilascio || o.rilascio.stato !== 'bloccato') throw Error('L\'ordine ' + o.numero + ' non è in attesa di rilascio.');
    var data = n.data(i.data || o.data); if (data < o.data) throw Error('Il rilascio non può precedere l\'ordine.');
    if (i.decisione === 'rifiuta') { o.rilascio.stato = 'rifiutato'; o.rilascio.data = data; n.salva(); return '<p class="lab-nota">Ordine ' + o.numero + ' <b>non rilasciato</b>: resta bloccato e non si invia.</p>'; }
    o.rilascio.stato = 'rilasciato'; o.rilascio.data = data; n.salva();
    return '<p class="lab-nota">Ordine ' + o.numero + ' <b>rilasciato</b> (ME29N, codice AC): ora si invia al fornitore e può ricevere la merce.</p>';
  }
  function parametri(i) { var x = L.num(i.soglia, 'Soglia di rilascio', 0); P().acqParam.soglia = x; N().salva(); return '<p class="lab-nota">Strategia di rilascio: gli ordini oltre ' + L.eur(x) + ' € vanno rilasciati dal responsabile acquisti.</p>'; }
  function entrata(i) {
    var n = N(), o = oda(i.ordine), data = n.data(i.data), q = L.num(i.qta == null || i.qta === '' ? o.qta - o.entrato : i.qta, 'Quantità', 0.001);
    if (data < o.data) throw Error('Entrata anteriore all\'ordine.');
    if (o.rilascio && o.rilascio.stato !== 'rilasciato') throw Error('Ordine ' + o.numero + ' bloccato dalla strategia di rilascio (' + o.rilascio.stato + '): prima il rilascio ME29N.');
    if (q > o.qta - o.entrato + 1e-9) throw Error('Restano da ricevere ' + L.n0(o.qta - o.entrato) + ' ' + n.materiale(o.materiale).um + '.');
    var m = n.materiale(o.materiale), std = r2(q * m.std), ord = r2(q * o.prezzo), pd = r2(ord - std);
    var doc = n.numero('materiale');
    var mv = n.movimento(o.materiale, q, data, '101', o.numero, {lotto: i.lotto ? String(i.lotto).trim().toUpperCase() : '', fornitore: o.fornitore, colata: String(i.lotto || '').trim()});
    if (window.WM4 && window.WM4.attivo(data)) window.WM4.entrata(o.materiale, q, data, doc, '101 acquisto');
    o.entrato = r2(o.entrato + q); o.valoreEntrato = r2(o.valoreEntrato + ord);
    (o.entrate = o.entrate || []).push({doc: doc, qta: q, data: data, valoreStd: std, valoreOrdine: ord, pd: pd, lotto: mv.lotti[0].lotto});
    var r = n.post({data: data, tipo: 'ENTRATA_ACQUISTO', rif: doc, descrizione: 'MIGO 101 doc. ' + doc + ' — entrata ' + L.n0(q) + ' ' + m.um + ' ' + o.materiale + ' lotto ' + mv.lotti[0].lotto + ' da ordine ' + o.numero,
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
  return {richiesta: richiesta, approva: approva, ordine: ordine, rilascia: rilascia, parametri: parametri, entrata: entrata, fattura: fattura, IVA: IVA, P: P};
})();
