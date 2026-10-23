/* SISTEMA INTEGRATO — MM acquisti: richiesta di offerta e confronto (ME41 · ME47 · ME49), ordine d'acquisto (ME21N), entrata merci (MIGO 101), fattura fornitore (MIRO).
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
    var dann = i.danneggiati == null || i.danneggiati === '' ? 0 : L.num(i.danneggiati, 'Quantità danneggiata', 0);
    if (dann > q + 1e-9) throw Error('La quantità danneggiata non può superare quella ricevuta.');
    var ddt = String(i.ddt || '').trim();
    if (dann > 0 && !(window.WM4 && window.WM4.attivo(data))) throw Error('L\'entrata in stock bloccato si usa con il magazzino W100 attivo.');
    if (window.WM4 && window.WM4.attivo(data)) { if (q - dann > 1e-9) window.WM4.entrata(o.materiale, r2(q - dann), data, doc, '101 acquisto'); if (dann > 0) window.WM4.entrataBloccata(o.materiale, dann, data, doc, String(i.danno || 'merce danneggiata al ricevimento'), mv.lotti[0].lotto); }
    o.entrato = r2(o.entrato + q); o.valoreEntrato = r2(o.valoreEntrato + ord);
    (o.entrate = o.entrate || []).push({doc: doc, qta: q, data: data, valoreStd: std, valoreOrdine: ord, pd: pd, lotto: mv.lotti[0].lotto, ddt: ddt, danneggiati: dann});
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
  // ── RICHIESTE DI OFFERTA: ME41 crea e invia a 2-4 fornitori, ME47 registra le offerte, ME49 confronta, l'assegnazione crea l'ordine ──
  var R = function () { var s = P(); if (!s.rfq) s.rfq = []; return s; };
  var rfqDi = function (n) { var r = R().rfq.find(function (x) { return x.numero === String(n); }); if (!r) throw Error('Richiesta di offerta ' + n + ' inesistente.'); return r; };
  var piuGiorni = function (d, g) { var x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + g); return x.toISOString().slice(0, 10); };
  var vero = function (v) { return v === true || v === 'true' || v === 'on' || v === 'si'; };
  function rfq(i) {
    var n = N(), data = n.data(i.data), r0 = i.rda ? rdaDi(i.rda) : null;
    if (r0 && r0.stato !== 'approvata') throw Error('La richiesta d\'acquisto ' + r0.numero + ' è «' + r0.stato + '»: si chiede l\'offerta solo per una richiesta approvata.');
    var mat = r0 ? r0.materiale : (i.materiale || 'FERRO'), m = n.materiale(mat); if (m.tipo !== 'ROH') throw Error('Le offerte si chiedono per le materie prime (ROH).');
    var q = r0 && (i.qta == null || i.qta === '') ? r0.qta : L.num(i.qta, 'Quantità', 1);
    var cons = i.consegna ? n.data(i.consegna) : (r0 ? r0.consegna : piuGiorni(data, 15)); if (cons < data) throw Error('La consegna richiesta non può precedere la richiesta di offerta.');
    var scelti = Object.keys(S().fornitori).filter(function (f) { return vero(i['f_' + f]); });
    if (scelti.length < 2) throw Error('Scegli almeno 2 fornitori: la richiesta di offerta serve a confrontare.');
    if (scelti.length > 4) throw Error('Al massimo 4 fornitori per richiesta di offerta.');
    var r = {numero: n.numero('rfq'), data: data, materiale: mat, qta: q, consegna: cons, rda: r0 ? r0.numero : '', stato: 'aperta',
      fornitori: scelti.map(function (f) { return {fid: f, prezzo: null, gg: null, pag: null}; })};
    R().rfq.push(r); n.salva();
    return '<p class="lab-nota">Richiesta di offerta <b>' + r.numero + '</b> (ME41) inviata a ' + scelti.length + ' fornitori: ' + scelti.map(function (f) { return S().fornitori[f].nome; }).join(', ') +
      '. ' + L.n0(q) + ' ' + m.um + ' ' + mat + ' per il ' + L.fd(cons) + '. Ora registra le offerte che arrivano (ME47). Nessuna scrittura.</p>';
  }
  function offerta(i) {
    var n = N(), parti = String(i.voce || '').split('|'), r = rfqDi(i.rfq || parti[0]), fid = i.fornitore || parti[1];
    if (r.stato !== 'aperta') throw Error('La richiesta di offerta ' + r.numero + ' è già ' + r.stato + '.');
    var f = r.fornitori.find(function (x) { return x.fid === fid; }); if (!f) throw Error('Il fornitore ' + fid + ' non è tra quelli interpellati.');
    f.prezzo = L.num(i.prezzo, 'Prezzo offerto', 0.0001);
    f.gg = i.gg == null || i.gg === '' ? 0 : L.num(i.gg, 'Giorni di consegna', 0);
    f.pag = i.pag == null || i.pag === '' ? parseInt(S().fornitori[fid].pagamento, 10) || 0 : L.num(i.pag, 'Giorni di pagamento', 0);
    f.data = n.data(i.data || r.data); n.salva();
    var mancano = r.fornitori.filter(function (x) { return !x.prezzo; }).length;
    return '<p class="lab-nota">Offerta di <b>' + S().fornitori[fid].nome + '</b> registrata (ME47): ' + L.eur(f.prezzo) + ' €/' + n.materiale(r.materiale).um + ', consegna in ' + f.gg + ' giorni, pagamento a ' + f.pag + ' giorni. ' +
      (mancano ? 'Mancano ancora ' + mancano + ' offerte.' : 'Tutte le offerte sono arrivate: guarda il <b>confronto</b> (ME49) e assegna.') + '</p>';
  }
  // ME49: totale, data di consegna e scelta consigliata (prezzo più basso tra chi consegna in tempo; a parità, chi consegna prima e chi paga più tardi)
  function confronto(n0) {
    var r = typeof n0 === 'object' ? n0 : rfqDi(n0), std = N().materiale(r.materiale).std;
    var righe = r.fornitori.filter(function (x) { return x.prezzo > 0; }).map(function (x) {
      var arrivo = piuGiorni(x.data || r.data, x.gg || 0);
      return {fid: x.fid, nome: S().fornitori[x.fid].nome, prezzo: x.prezzo, gg: x.gg, pag: x.pag, arrivo: arrivo, inTempo: arrivo <= r.consegna,
        totale: r2(r.qta * x.prezzo), vsStd: std ? r2((x.prezzo - std) / std * 100) : 0, diffStd: r2(r.qta * (x.prezzo - std))};
    });
    var ord = function (a, b) { return a.totale - b.totale || a.gg - b.gg || b.pag - a.pag; };
    var validi = righe.filter(function (x) { return x.inTempo; }).sort(ord), tutti = righe.slice().sort(ord);
    var best = validi[0] || tutti[0] || null, secondo = best ? (validi.length ? validi : tutti).filter(function (x) { return x.fid !== best.fid; })[0] : null;
    return {righe: righe, consigliato: best ? best.fid : '', inTempo: !!validi.length, risparmio: best && secondo ? r2(secondo.totale - best.totale) : 0, secondo: secondo, completo: r.fornitori.every(function (x) { return x.prezzo > 0; }), std: std};
  }
  function assegna(i) {
    var parti = String(i.voce || '').split('|'), n = N(), r = rfqDi(i.rfq || parti[0]), c = confronto(r); if (r.stato !== 'aperta') throw Error('La richiesta di offerta ' + r.numero + ' è già ' + r.stato + '.');
    if (c.righe.length < 2) throw Error('Servono almeno 2 offerte registrate per confrontare e assegnare.');
    var fid = i.fornitore || parti[1] || c.consigliato, x = c.righe.find(function (y) { return y.fid === fid; }); if (!x) throw Error('Il fornitore scelto non ha presentato un\'offerta.');
    var data = n.data(i.data || r.data);
    var msg = ordine({rda: r.rda, fornitore: fid, materiale: r.materiale, qta: r.qta, prezzo: x.prezzo, data: data});
    var o = S().acquisti[S().acquisti.length - 1]; o.rfq = r.numero; o.consegna = piuGiorni(data, x.gg || 0);
    r.stato = 'assegnata'; r.vincitore = fid; r.ordine = o.numero; r.motivo = fid === c.consigliato ? 'offerta consigliata' : String(i.motivo || 'scelta diversa dalla consigliata'); n.salva();
    return '<p class="lab-nota">Richiesta di offerta ' + r.numero + ' <b>assegnata a ' + x.nome + '</b>' + (fid === c.consigliato ? ' (offerta consigliata)' : ' — attenzione: non è l\'offerta consigliata, il motivo resta nel documento') + '.</p>' + msg;
  }
  return {richiesta: richiesta, approva: approva, ordine: ordine, rilascia: rilascia, parametri: parametri, entrata: entrata, fattura: fattura,
    rfq: rfq, offerta: offerta, confronto: confronto, assegna: assegna, R: R, IVA: IVA, P: P};
})();
