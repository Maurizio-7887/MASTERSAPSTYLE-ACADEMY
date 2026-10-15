/* SISTEMA INTEGRATO — Storni e annullamenti in logica SAP. Ogni storno è un documento nuovo, con le stesse righe a segni invertiti
   e il riferimento al documento stornato (FB08 / MBST / VF11 / VL09 / MR8M / CO13); il documento d'origine resta, segnato come stornato.
   Regole: non si storna un documento che ha già documenti successivi (prima si storna quello dopo).
   Fattura elettronica: una fattura già trasmessa allo SdI (Sistema di Interscambio dell'Agenzia delle Entrate) NON si storna:
   si corregge con una nota di credito (TD04). Prima dell'invio, la fattura sbagliata si storna e si rifà. */
window.ST4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var reg = function (numero) { var r = S().registrazioni.find(function (x) { return x.numero === String(numero); }); if (!r) throw Error('Documento contabile ' + numero + ' inesistente.'); return r; };
  var regDi = function (tipo, rif) { return S().registrazioni.filter(function (r) { return r.tipo === tipo && r.rif === String(rif) && !r.stornato && !r.stornoDi; }).slice(-1)[0]; };
  // il documento di storno: righe a segni invertiti, con lo stesso partner e il pareggio sul documento d'origine
  function inverti(r, data, descrizione) {
    if (r.stornato) throw Error('Il documento ' + r.numero + ' è già stato stornato (storno ' + r.stornato + ').');
    if (r.stornoDi) throw Error('Il documento ' + r.numero + ' è uno storno: non si storna uno storno.');
    var n = N(), d = n.data(data || r.data); if (d < r.data) throw Error('La data dello storno non può precedere il documento (' + L.fd(r.data) + ').');
    var righe = r.righe.map(function (x) { var y = {conto: x.conto, dareAvere: x.dareAvere === 'DARE' ? 'AVERE' : 'DARE', importo: x.importo, partner: x.partner, testo: 'storno ' + (x.testo || '')};
      if (x.valuta) { y.valuta = x.valuta; y.importoValuta = x.importoValuta; } if (x.cdc) y.cdc = x.cdc; if (x.partner) y.pareggio = x.pareggio || r.rif; return y; });
    var s = n.post({data: d, tipo: r.tipo, rif: 'STORNO ' + r.rif, descrizione: descrizione || ('Storno del documento ' + r.numero + ' — ' + r.descrizione), righe: righe});
    s.stornoDi = r.numero; r.stornato = s.numero; return s;
  }
  var pagata = function (lato, partner, doc, importo) {   // la partita ha già incassi o pagamenti abbinati?
    if (!window.TS4) return false;
    var p = window.TS4.partite(lato, partner).find(function (x) { return x.doc === String(doc); });
    return !p || p.aperto < importo - 0.004;
  };

  // ── fattura elettronica: invio allo SdI ──
  function documentiVendita() {
    var a = (S().fatture || []).filter(function (f) { return ['F2', 'RE', 'G2'].indexOf(f.tipo) >= 0; }).map(function (f) { return {numero: f.numero, tipo: f.tipo, cliente: f.cliente, data: f.data, totale: f.totale, rif: f, fonte: 'SD'}; });
    var b = ((S().fx || {}).documenti || []).filter(function (d) { return d.lato === 'cliente'; }).map(function (d) { return {numero: d.numero, tipo: 'F2', cliente: d.partner, data: d.data, totale: d.eur, rif: d, fonte: 'FI'}; });
    return a.concat(b);
  }
  var tipoDoc = function (t) { return t === 'F2' ? 'TD01 fattura' : 'TD04 nota di credito'; };
  function inviaSdi(i) {
    var n = N(), d = documentiVendita().find(function (x) { return x.numero === String(i.fattura); }); if (!d) throw Error('Documento di vendita ' + i.fattura + ' inesistente.');
    var f = d.rif; if (f.stornata) throw Error('Documento stornato: non si trasmette.');
    if (f.sdi) throw Error('Già trasmesso allo SdI il ' + L.fd(f.sdi.data) + ' (identificativo ' + f.sdi.id + ').');
    var data = n.data(i.data || d.data); if (data < d.data) throw Error('L\'invio non può precedere la data del documento.');
    f.sdi = {data: data, id: String(Math.abs(hash(d.numero + data)) % 9000000000 + 1000000000), stato: 'consegnata', tipo: tipoDoc(d.tipo)};
    n.salva();
    return '<p class="lab-nota">📤 ' + tipoDoc(d.tipo) + ' ' + d.numero + ' trasmessa allo SdI il ' + L.fd(data) + ': ricevuta di consegna, identificativo SdI ' + f.sdi.id + '. Da ora non si storna più: si corregge con una nota di credito.</p>';
  }
  function hash(s) { var h = 0; for (var k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) | 0; return h; }
  function fatturaPA(numero) {   // anteprima semplificata del file FatturaPA (FPR12)
    var d = documentiVendita().find(function (x) { return x.numero === String(numero); }); if (!d) throw Error('Documento inesistente.');
    var f = d.rif, c = S().clienti[d.cliente] || {}, x = function (v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    var iva = d.fonte === 'FI' ? 0 : f.iva != null ? f.iva : r2(d.totale - d.totale / 1.22), imponibile = r2(d.totale - iva);
    return '<?xml version="1.0" encoding="UTF-8"?>\n<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">\n <FatturaElettronicaHeader>\n  <DatiTrasmissione><IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>00000000000</IdCodice></IdTrasmittente><ProgressivoInvio>' + x(d.numero) + '</ProgressivoInvio><FormatoTrasmissione>FPR12</FormatoTrasmissione><CodiceDestinatario>' + (c.valuta ? 'XXXXXXX' : '0000000') + '</CodiceDestinatario></DatiTrasmissione>\n' +
      '  <CedentePrestatore><DatiAnagrafici><Anagrafica><Denominazione>Ferro e Transenne Srl (didattica)</Denominazione></Anagrafica><RegimeFiscale>RF01</RegimeFiscale></DatiAnagrafici></CedentePrestatore>\n  <CessionarioCommittente><DatiAnagrafici><Anagrafica><Denominazione>' + x(c.nome) + '</Denominazione></Anagrafica></DatiAnagrafici></CessionarioCommittente>\n </FatturaElettronicaHeader>\n' +
      ' <FatturaElettronicaBody>\n  <DatiGenerali><DatiGeneraliDocumento><TipoDocumento>' + (d.tipo === 'F2' ? 'TD01' : 'TD04') + '</TipoDocumento><Divisa>EUR</Divisa><Data>' + d.data + '</Data><Numero>' + x(d.numero) + '</Numero><ImportoTotaleDocumento>' + Number(d.totale).toFixed(2) + '</ImportoTotaleDocumento></DatiGeneraliDocumento></DatiGenerali>\n' +
      '  <DatiBeniServizi><DettaglioLinee><NumeroLinea>1</NumeroLinea><Descrizione>' + x(f.materiale ? (S().materiali[f.materiale] || {}).nome + ' ' + f.materiale : (f.testo || 'servizi')) + '</Descrizione>' + (f.qta ? '<Quantita>' + Number(f.qta).toFixed(2) + '</Quantita>' : '') + '<PrezzoTotale>' + Number(imponibile).toFixed(2) + '</PrezzoTotale><AliquotaIVA>' + (iva ? '22.00' : '0.00') + '</AliquotaIVA>' + (iva ? '' : '<Natura>N2.1</Natura>') + '</DettaglioLinee>\n' +
      '   <DatiRiepilogo><AliquotaIVA>' + (iva ? '22.00' : '0.00') + '</AliquotaIVA><ImponibileImporto>' + Number(imponibile).toFixed(2) + '</ImponibileImporto><Imposta>' + Number(iva).toFixed(2) + '</Imposta></DatiRiepilogo></DatiBeniServizi>\n </FatturaElettronicaBody>\n</p:FatturaElettronica>';
  }

  // ── VF11 storno di fattura o nota di credito di vendita ──
  function vf11(i) {
    var n = N(), s = S(), f = s.fatture.find(function (x) { return x.numero === String(i.fattura); });
    if (!f) { var fx = ((s.fx || {}).documenti || []).find(function (d) { return d.numero === String(i.fattura) && d.lato === 'cliente'; }); if (fx) return stornaFx(fx, i.data); throw Error('Fattura ' + i.fattura + ' inesistente.'); }
    if (['F2', 'RE', 'G2'].indexOf(f.tipo) < 0) throw Error('Il documento ' + f.numero + ' è uno storno.');
    if (f.stornata) throw Error('Fattura già stornata il ' + L.fd(f.stornata) + '.');
    if (f.sdi) throw Error('La ' + (f.tipo === 'F2' ? 'fattura' : 'nota di credito') + ' ' + f.numero + ' è già stata trasmessa allo SdI il ' + L.fd(f.sdi.data) + ' (id ' + f.sdi.id + '): per legge non si annulla. ' + (f.tipo === 'F2' ? 'Emetti una nota di credito (Resi e note di credito: reso RE o abbuono G2), che va anch\'essa allo SdI come TD04.' : 'Emetti una nuova fattura per correggerla.'));
    if (f.tipo === 'F2' && pagata('cliente', f.cliente, f.numero, f.totale)) throw Error('La fattura ' + f.numero + ' ha già incassi abbinati: prima storna l\'incasso (FB08), poi la fattura.');
    if (f.tipo === 'F2' && s.ordini.some(function (o) { return o.fattura === f.numero && (o.tipo === 'RE' || o.tipo === 'G2'); })) throw Error('Sulla fattura ci sono resi o richieste di nota di credito: prima annulla quelli.');
    var r = inverti(reg(f.contabile), i.data, 'VF11 storno ' + (f.tipo === 'F2' ? 'della fattura ' : 'della nota di credito ') + f.numero + ' — ' + N().cliente(f.cliente).nome);
    if (f.tipo === 'F2') {
      var c = s.consegne.find(function (x) { return x.numero === f.consegna; }), o = s.ordini.find(function (x) { return x.numero === f.ordine; });
      if (c) c.fatturata = false; if (o) o.fatturato = r2(o.fatturato - f.qta);
      var resto = f.accontoDedotto || 0; s.acconti.filter(function (a) { return a.ordine === f.ordine; }).reverse().forEach(function (a) { var d = Math.min(a.dedotto, resto); a.dedotto = r2(a.dedotto - d); resto = r2(resto - d); });
    } else { var oo = s.ordini.find(function (x) { return x.numero === f.riferimento; }); if (oo) oo.accreditato = false; }
    s.copa.filter(function (x) { return x.doc === f.numero; }).forEach(function (x) { var y = JSON.parse(JSON.stringify(x)); ['qta', 'ricaviLordi', 'scontiQuantita', 'scontiCliente', 'trasporti', 'abbuoni', 'costoVenduto', 'diffPrezzo', 'provvigioni'].forEach(function (k) { if (y[k]) y[k] = -y[k]; }); y.doc = 'S ' + f.numero; y.tipo = 'S1'; y.data = r.data; s.copa.push(y); });
    f.stornata = r.data;
    s.fatture.push({numero: n.numero('fattura'), tipo: f.tipo === 'F2' ? 'S1' : 'S2', riferimento: f.numero, cliente: f.cliente, materiale: f.materiale, qta: f.qta, data: r.data, totale: f.totale, contabile: r.numero});
    n.salva(); return r;
  }
  function stornaFx(d, data) {
    if (d.sdi) throw Error('Fattura ' + d.numero + ' già trasmessa allo SdI: non si annulla, si emette una nota di credito.');
    if (d.chiuso) throw Error('Fattura già incassata: prima storna l\'incasso.');
    var r = inverti(reg(d.contabile), data, 'Storno della fattura in valuta ' + d.numero); d.stornata = r.data; d.chiuso = r.data; d.differenza = 0; N().salva(); return r;
  }
  // ── VL09 storno dell'uscita merci ──
  function vl09(i) {
    var n = N(), s = S(), c = s.consegne.find(function (x) { return x.numero === String(i.consegna); }); if (!c) throw Error('Consegna inesistente.');
    if (c.tipo !== 'LF') throw Error('Per la consegna di reso usa lo storno dell\'entrata merci.');
    if (c.pgi === false) throw Error('La consegna non ha uscita merci.');
    if (c.fatturata) throw Error('Consegna già fatturata: prima storna la fattura (VF11) — se è già allo SdI, serve un reso.');
    var r0 = regDi('USCITA_MERCI', c.numero); if (!r0) throw Error('Uscita merci della consegna non trovata.');
    var o = s.ordini.find(function (x) { return x.numero === c.ordine; });
    var r = inverti(r0, i.data, 'VL09 storno dell\'uscita merci della consegna ' + c.numero + ' (movimento 602)');
    n.movimento(c.materiale, c.qta, r.data, '602', o.numero, {lotti: c.lotti, seriali: c.seriali || null});
    if (c.wm && window.WM4 && window.WM4.attivo()) window.WM4.nuovoQuant('GI-ZONE', c.materiale, c.qta, '', r.data, c.numero);
    o.consegnato = r2(o.consegnato - c.qta); c.pgi = false;
    if (c.ddt) { c.ddtAnnullato = c.ddt; c.ddt = ''; }
    n.salva(); return r;
  }
  // VL02N: elimina una consegna senza uscita merci (i compiti aperti si annullano, la merce già prelevata torna a scaffale)
  function eliminaConsegna(i) {
    var n = N(), s = S(), c = s.consegne.find(function (x) { return x.numero === String(i.consegna); }); if (!c) throw Error('Consegna inesistente.');
    if (c.pgi !== false) throw Error('La consegna ha l\'uscita merci: prima stornala (VL09).');
    var sp = s.sped || {colli: [], trasporti: []};
    if (sp.colli.some(function (x) { return x.consegna === c.numero && x.caricato; })) throw Error('Ci sono colli già caricati sul camion: scaricali prima.');
    var msg = [];
    if (s.wm) {
      s.wm.compiti.filter(function (t) { return t.consegna === c.numero && t.stato === 'aperto'; }).forEach(function (t) { t.stato = 'annullato'; t.motivo = 'consegna ' + c.numero + ' eliminata'; });
      window.WM4.quanti(function (q) { return q.ubic === 'GI-ZONE' && q.rif === c.numero && q.qta > 0; }).forEach(function (q) {
        q.rif = ''; var t = window.WM4.compito({tipo: 'TRASF', mat: q.mat, qta: q.qta, quant: q.id, udc: q.udc, da: 'GI-ZONE', a: window.WM4.libera(q.mat), creato: i.data || c.data, rif: 'VL02N', motivo: 'rientro a scaffale dalla consegna eliminata ' + c.numero});
        msg.push(t.numero + ' ' + q.qta + ' ' + q.mat + ' → ' + t.a);
      });
    }
    sp.colli = sp.colli.filter(function (x) { return x.consegna !== c.numero; });
    sp.trasporti.forEach(function (t) { if (!t.partenza) t.consegne = t.consegne.filter(function (k) { return k !== c.numero; }); });
    s.consegne = s.consegne.filter(function (x) { return x !== c; });
    n.salva();
    return '<p class="lab-nota">Consegna ' + c.numero + ' eliminata. ' + (msg.length ? 'La merce già prelevata torna a scaffale con i compiti ' + msg.join(' · ') + ' (conferma con la pistola).' : 'Nessuna merce da riportare.') + '</p>';
  }
  // ── MBST storno dell'entrata merci da acquisto ──
  function mbst(i) {
    var n = N(), s = S(), o = null, e = null;
    s.acquisti.forEach(function (a) { (a.entrate || []).forEach(function (x) { if (x.doc === String(i.doc)) { o = a; e = x; } }); });
    if (!e) throw Error('Documento materiale ' + i.doc + ' non trovato fra le entrate da acquisto.');
    if (e.stornato) throw Error('Entrata già stornata.');
    if (o.fatturato > o.entrato - e.qta + 1e-9) throw Error('La merce è già fatturata dal fornitore: prima storna la fattura (MR8M).');
    if ((s.giacenze[o.materiale] || 0) < e.qta - 1e-9) throw Error('A magazzino non c\'è più tutta la merce di questa entrata: è già stata consumata.');
    if (s.wm && window.WM4.attivo(e.data)) {
      var qs = window.WM4.quanti(function (q) { return q.rif === e.doc && q.qta > 0; });
      if (qs.some(function (q) { return q.ubic !== 'GR-ZONE'; }) || r2(qs.reduce(function (t, q) { return t + q.qta; }, 0)) < e.qta - 1e-9) throw Error('La merce è già stata messa a posto: riportala in zona di ricevimento prima dello storno.');
      qs.forEach(function (q) { s.wm.compiti.filter(function (t) { return t.quant === q.id && t.stato === 'aperto'; }).forEach(function (t) { t.stato = 'annullato'; t.motivo = 'storno entrata ' + e.doc; }); q.qta = 0; });
    }
    var r = inverti(reg(regDi('ENTRATA_ACQUISTO', e.doc).numero), i.data, 'MBST storno dell\'entrata ' + e.doc + ' (movimento 102) — ordine ' + o.numero);
    n.movimento(o.materiale, -e.qta, r.data, '102', o.numero, {lotti: e.lotto ? [{lotto: e.lotto, qta: e.qta}] : null});
    o.entrato = r2(o.entrato - e.qta); o.valoreEntrato = r2(o.valoreEntrato - e.valoreOrdine); e.stornato = r.data;
    if (Math.abs(e.pd) > 0.004) s.mlPD.push({data: r.data, mat: o.materiale, pd: -e.pd, tipo: 'acquisto', rif: 'storno ' + e.doc, qta: -e.qta});
    n.salva(); return r;
  }
  // ── MR8M storno della fattura fornitore ──
  function mr8m(i) {
    var n = N(), s = S(), f = s.fattureFornitore.find(function (x) { return x.numero === String(i.fattura); }); if (!f) throw Error('Fattura fornitore inesistente.');
    if (f.stornata) throw Error('Fattura già stornata.');
    if (pagata('fornitore', f.fornitore, f.numero, f.totale)) throw Error('La fattura è già pagata: prima annulla il pagamento.');
    var r = inverti(reg(f.contabile), i.data, 'MR8M storno della fattura fornitore ' + f.numero + ' (' + (f.rif || 's.n.') + ')');
    var o = s.acquisti.find(function (x) { return x.numero === f.ordine; }); o.fatturato = r2(o.fatturato - f.qta);
    var diff = r2(f.imponibile - f.qta * o.prezzo); if (Math.abs(diff) > 0.004) s.mlPD.push({data: r.data, mat: o.materiale, pd: -diff, tipo: 'fattura', rif: 'storno ' + f.numero, qta: 0});
    f.stornata = r.data; n.salva(); return r;
  }
  // ── produzione: storno di prelievo (262), conferma (CO13), entrata (102) ──
  function produzione(i) {
    var n = N(), s = S(), o = window.PP4.ord(i.ordine);
    if (o.liquidazione) throw Error('Ordine già liquidato (CLSD): non si storna più.');
    var k = +i.evento, ev = o.eventi[k]; if (!ev) throw Error('Evento inesistente.'); if (ev.stornato) throw Error('Già stornato.');
    if (ev.tipo === 'KGI2') throw Error('I sovraccosti si ricalcolano da soli al prossimo KGI2.');
    var r0 = s.registrazioni.filter(function (r) { return r.rif === o.numero && !r.stornato && !r.stornoDi && r.tipo === {'261': 'PRELIEVO_261', CO11N: 'CONFERMA', '101': 'ENTRATA_PRODUZIONE'}[ev.tipo] && r.data === ev.data &&
      (ev.doc ? r.descrizione.indexOf(ev.doc) >= 0 : Math.abs(r.righe[0].importo - ev.valore) < 0.005); })[0];
    if (!r0) throw Error('Documento contabile dell\'evento non trovato.');
    if (ev.tipo === '101') {
      if ((s.giacenze[o.materiale] || 0) < ev.qta) throw Error('I pezzi versati sono già stati consumati o spediti.');
      if (s.wm && window.WM4.attivo(ev.data)) {
        var qs = window.WM4.quanti(function (q) { return q.rif === ev.doc && q.qta > 0; });
        if (qs.some(function (q) { return q.ubic !== 'GR-ZONE'; })) throw Error('I pallet sono già stati messi a posto: riportali in zona di ricevimento prima dello storno.');
        qs.forEach(function (q) { s.wm.compiti.filter(function (t) { return t.quant === q.id && t.stato === 'aperto'; }).forEach(function (t) { t.stato = 'annullato'; }); q.qta = 0; });
      }
    }
    var r = inverti(r0, i.data, {'261': 'Storno del prelievo (262) ', CO11N: 'CO13 annullamento della conferma ', '101': 'Storno dell\'entrata di produzione (102) '}[ev.tipo] + 'ordine ' + o.numero);
    if (ev.tipo === '261') { n.movimento('FERRO', ev.kg, r.data, '262', o.numero, {lotti: ev.lotti}); if (s.wm && window.WM4.attivo(ev.data)) window.WM4.nuovoQuant('PSA-L1', 'FERRO', ev.kg, '', r.data, 'storno 262 ' + o.numero); }
    if (ev.tipo === '101') n.movimento(o.materiale, -ev.qta, r.data, '102', o.numero, {lotti: ev.lotto ? [{lotto: ev.lotto, qta: ev.qta}] : null});
    ev.stornato = r.data; n.salva(); return r;
  }
  // ── LT15: annulla un compito di magazzino aperto e lo ricrea con una nuova proposta ──
  function lt15(i) {
    var n = N(), w = S().wm; if (!w) throw Error('WMS non attivo.');
    var t = w.compiti.find(function (x) { return x.numero === String(i.compito); }); if (!t) throw Error('Compito inesistente.'); if (t.stato !== 'aperto') throw Error('Si annulla solo un compito aperto.');
    t.stato = 'annullato'; t.motivo = 'annullato (LT15)' + (i.motivo ? ': ' + i.motivo : '');
    var nuovo = null, data = i.data || t.creato;
    if (t.tipo === 'PUTAWAY') { var q = w.quant.find(function (x) { return x.id === t.quant; }); nuovo = [window.WM4.compito({tipo: 'PUTAWAY', mat: t.mat, qta: t.qta, quant: t.quant, udc: t.udc, da: t.da, a: window.WM4.libera(t.mat, t.a), creato: data, rif: t.rif, motivo: 'ricreato da ' + t.numero})]; }
    else if (t.tipo === 'PICK' || t.tipo === 'STAGING') {
      var f = window.WM4.fifo(t.mat, t.qta, t.tipo === 'STAGING' ? ['002'] : ['001', '002']);
      if (f.mancante > 1e-9) throw Error('Non c\'è altra giacenza disponibile per ricreare il compito.');
      nuovo = f.righe.map(function (x) { return window.WM4.compito({tipo: t.tipo, mat: t.mat, qta: x.qta, quant: x.q.id, udc: x.q.udc, da: x.q.ubic, a: t.a, creato: data, rif: t.rif, consegna: t.consegna, ordine: t.ordine, ondata: t.ondata, origine: t.numero}); });
    }
    n.salva();
    return '<p class="lab-nota">Compito ' + t.numero + ' annullato.' + (nuovo ? ' Nuovo compito ' + nuovo.map(function (x) { return x.numero + ' ' + x.da + ' → ' + x.a; }).join(' · ') + '.' : '') + '</p>';
  }
  // ── FB08 storno di un documento contabile (solo quelli che non nascono da un documento logistico) ──
  var FB08 = {INCASSO: 'incasso F-28', ESTRATTO_CONTO: 'riga dell\'estratto conto', PAGAMENTO_STIPENDI: 'pagamento stipendi', F24: 'versamento F24', PAGAMENTO_F110: 'distinta F110 non ancora addebitata', ACCONTO: 'incasso di acconto', INCASSO_VALUTA: 'incasso in valuta', PAGAMENTO_VALUTA: 'pagamento in valuta'};
  function fb08(i) {
    var n = N(), s = S(), r0 = reg(i.documento);
    if (!FB08[r0.tipo]) throw Error('Il documento ' + r0.numero + ' (' + r0.tipo + ') nasce da un documento logistico o da una chiusura: si storna dalla sua transazione (VF11, VL09, MBST, MR8M, storni di produzione), non con FB08.');
    if (r0.tipo === 'PAGAMENTO_F110') { var run = s.tes.pagamenti.find(function (x) { return x.contabile === r0.numero; }); if (run.addebitato) throw Error('La banca ha già addebitato la distinta: storna prima la riga dell\'estratto conto.'); run.annullato = true; run.addebitato = 'annullata'; }
    if (r0.tipo === 'ACCONTO') { var a = s.acconti.find(function (x) { return x.numero === r0.rif; }); if (a.dedotto > 0.004) throw Error('L\'acconto è già dedotto in fattura: prima storna la fattura.'); a.pagato = null; }
    if (r0.tipo === 'PAGAMENTO_STIPENDI') { s.hr.registrati.find(function (x) { return 'STIPENDI ' + x.periodo === r0.rif; }).pagato = null; }
    if (r0.tipo === 'F24') { s.hr.registrati.find(function (x) { return 'F24 ' + x.periodo === r0.rif; }).f24 = null; }
    if (r0.tipo === 'INCASSO_VALUTA' || r0.tipo === 'PAGAMENTO_VALUTA') { var d = s.fx.documenti.find(function (x) { return 'REG ' + x.numero === r0.rif; }); d.chiuso = null; d.differenza = 0; d.cambioChiusura = null; }
    var r = inverti(r0, i.data, 'FB08 storno del documento ' + r0.numero + ' (' + FB08[r0.tipo] + ') — motivo ' + (i.motivo || '01 storno nello stesso periodo'));
    if (r0.tipo === 'ESTRATTO_CONTO') {
      s.tes.estratti.forEach(function (e) { e.righe.forEach(function (x) { if (x.contabile === r0.numero) { x.stato = 'da abbinare'; x.contabile = ''; x.regola = 'stornata (FB08): da riabbinare'; } }); });
      s.tes.pagamenti.forEach(function (p) { if (r0.righe.some(function (x) { return x.conto === '18'; }) && p.addebitato && !p.annullato && Math.abs(p.totale - r0.righe[0].importo) < 0.005) p.addebitato = false; });
    }
    n.salva(); return r;
  }
  return {inviaSdi: inviaSdi, fatturaPA: fatturaPA, documentiVendita: documentiVendita, vf11: vf11, vl09: vl09, eliminaConsegna: eliminaConsegna, mbst: mbst, mr8m: mr8m,
    produzione: produzione, lt15: lt15, fb08: fb08, FB08: FB08, inverti: inverti};
})();
