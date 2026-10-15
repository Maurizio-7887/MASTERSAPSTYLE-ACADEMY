/* SISTEMA INTEGRATO — Tesoreria in logica SAP (FSCM Cash Management / FI-BL):
   partite aperte con scadenza e pareggio (FBL5N / FBL1N / F.13), posizione di cassa e previsione di liquidità (FF7A / FF7B),
   programma di pagamento automatico (F110) con file di bonifico SEPA (pain.001), estratto conto elettronico (FF_5 / FEBAN)
   con regole di abbinamento: riferimento della fattura, importo univoco, parole chiave (commissioni, interessi, pagamenti F110). */
window.TS4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var T = function () { var s = S(); if (!s.tes) s.tes = {estratti: [], pagamenti: []}; return s.tes; };
  var gg = function (testo) { var m = /(\d+)\s*gg/.exec(String(testo || '')); return m ? +m[1] : 30; };
  var piuGiorni = function (d, n) { var x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  var giorni = function (a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); };
  var anag = function (lato, p) { return lato === 'cliente' ? S().clienti[p] : S().fornitori[p]; };

  // ── partite aperte: righe del conto 11 (clienti) o 20 (fornitori) per partner; i pareggi espliciti prima, poi FIFO per scadenza ──
  function partite(lato, partner, alla) {
    var conto = lato === 'cliente' ? '11' : '20', segnoPartita = lato === 'cliente' ? 'DARE' : 'AVERE', out = [];
    var partners = partner ? [partner] : Object.keys(lato === 'cliente' ? S().clienti : S().fornitori);
    partners.forEach(function (p) {
      var a = anag(lato, p) || {}, voci = [], crediti = [];
      S().registrazioni.forEach(function (r) {
        if (alla && r.data > alla) return;
        r.righe.forEach(function (x, k) {
          if (x.conto !== conto || x.partner !== p) return;
          var base = {doc: r.rif || r.numero, contabile: r.numero, data: r.data, descrizione: r.descrizione, valuta: x.valuta || 'EUR', importoValuta: x.importoValuta || null, pareggio: x.pareggio || ''};
          if (x.dareAvere === segnoPartita) voci.push(Object.assign(base, {importo: x.importo, aperto: x.importo, apertoValuta: x.importoValuta || null, scadenza: x.scadenza || piuGiorni(r.data, gg(a.pagamento)), id: r.numero + '/' + k}));
          else crediti.push(Object.assign(base, {importo: x.importo, importoValuta: x.importoValuta || null}));
        });
      });
      voci.sort(function (x, y) { return x.scadenza < y.scadenza ? -1 : x.scadenza > y.scadenza ? 1 : 0; });
      var assegna = function (c, lista) { var resto = c.importo, restoV = c.importoValuta; lista.forEach(function (v) { if (resto <= 0.004 || v.aperto <= 0.004) return; var d = Math.min(v.aperto, resto); v.aperto = r2(v.aperto - d); resto = r2(resto - d);
          if (v.apertoValuta != null && restoV != null) { var dv = Math.min(v.apertoValuta, restoV); v.apertoValuta = r2(v.apertoValuta - dv); restoV = r2(restoV - dv); } }); return resto; };
      var avanzi = 0;
      crediti.filter(function (c) { return c.pareggio; }).forEach(function (c) { var resto = assegna(c, voci.filter(function (v) { return v.doc === c.pareggio; })); if (resto > 0.004) avanzi = r2(avanzi + assegna({importo: resto, importoValuta: null}, voci)); });
      crediti.filter(function (c) { return !c.pareggio; }).sort(function (x, y) { return x.data < y.data ? -1 : 1; }).forEach(function (c) { avanzi = r2(avanzi + assegna(c, voci)); });
      voci.forEach(function (v) { if (v.aperto > 0.004) out.push(Object.assign(v, {lato: lato, partner: p, nome: a.nome || p})); });
      if (avanzi > 0.004) out.push({lato: lato, partner: p, nome: a.nome || p, doc: 'acconto', data: '', descrizione: 'Pagamento non abbinato (partita a credito)', importo: -avanzi, aperto: -avanzi, scadenza: '', valuta: 'EUR'});
    });
    return out;
  }
  function anzianita(lato, alla) {
    var fasce = [['non scaduto', -1e9, 0], ['1–30 gg', 1, 30], ['31–60 gg', 31, 60], ['61–90 gg', 61, 90], ['oltre 90 gg', 91, 1e9]];
    var p = partite(lato, null, alla), tot = {};
    p.forEach(function (x) { var g = x.scadenza ? giorni(x.scadenza, alla) : 0; var f = fasce.find(function (q) { return g >= q[1] && g <= q[2]; })[0]; tot[x.partner] = tot[x.partner] || {nome: x.nome}; tot[x.partner][f] = r2((tot[x.partner][f] || 0) + x.aperto); });
    return {fasce: fasce.map(function (f) { return f[0]; }), righe: tot};
  }
  // ── posizione di cassa e previsione di liquidità per settimane ──
  function previsione(dal, settimane) {
    var n = N(), banca = n.saldo('10'), trans = n.saldo('18');
    var regs = S().registrazioni.filter(function (r) { return r.data <= dal; });
    var saldo = function (c) { return r2(regs.reduce(function (t, r) { return t + r.righe.filter(function (x) { return x.conto === c; }).reduce(function (u, x) { return u + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0); }, 0)); };
    banca = r2(saldo('10') + saldo('18'));
    var col = [], inizio = dal;
    for (var i = 0; i < (settimane || 6); i++) { var fine = piuGiorni(inizio, 6); col.push({dal: inizio, al: fine, incassi: 0, pagamenti: 0}); inizio = piuGiorni(fine, 1); }
    var scaduti = {incassi: 0, pagamenti: 0};
    var metti = function (data, campo, imp) { if (data < dal) { scaduti[campo] = r2(scaduti[campo] + imp); return; } var c = col.find(function (x) { return data >= x.dal && data <= x.al; }); if (c) c[campo] = r2(c[campo] + imp); };
    partite('cliente', null, dal).forEach(function (x) { if (x.aperto > 0) metti(x.scadenza, 'incassi', x.aperto); });
    partite('fornitore', null, dal).forEach(function (x) { if (x.aperto > 0) metti(x.scadenza, 'pagamenti', x.aperto); });
    // debiti verso dipendenti, INPS ed Erario: scadenze di legge (stipendi a fine mese, F24 il 16 del mese dopo)
    var paghe = (S().hr || {}).registrati || [];
    paghe.forEach(function (c) { if (!c.pagato) metti(c.scadenzaNetti, 'pagamenti', c.netti); if (!c.f24) metti(c.scadenzaF24, 'pagamenti', c.f24Importo); });
    var prog = r2(banca + scaduti.incassi - scaduti.pagamenti);
    col.forEach(function (c) { c.saldoIniziale = prog; prog = r2(prog + c.incassi - c.pagamenti); c.saldoFinale = prog; });
    return {banca: banca, dal: dal, scaduti: scaduti, colonne: col};
  }
  // ── F110: programma di pagamento automatico ──
  function propostaPagamenti(i) {
    var data = i.data, entro = i.scadenzaEntro || data;
    return partite('fornitore', null, data).filter(function (x) { return x.aperto > 0.004 && x.scadenza <= entro && x.valuta === 'EUR' && !T().pagamenti.some(function (r) { return !r.eseguito && r.partite.some(function (p) { return p.doc === x.doc; }); }); });
  }
  function eseguiPagamenti(i) {
    var n = N(), data = n.data(i.data), prop = propostaPagamenti({data: data, scadenzaEntro: i.scadenzaEntro || data});
    if (!prop.length) throw Error('Nessuna partita fornitore scaduta entro il ' + L.fd(i.scadenzaEntro || data) + ' da pagare.');
    var run = {numero: 'F110-' + String(n.numero('pagamento')).padStart(3, '0'), data: data, partite: prop.map(function (x) { return {fornitore: x.partner, nome: x.nome, doc: x.doc, importo: x.aperto, scadenza: x.scadenza}; }), totale: 0, eseguito: true, addebitato: false};
    run.totale = r2(run.partite.reduce(function (t, x) { return t + x.importo; }, 0));
    var righe = run.partite.map(function (x) { return {conto: '20', dareAvere: 'DARE', importo: x.importo, partner: x.fornitore, pareggio: x.doc, testo: 'pagamento ' + x.doc}; });
    righe.push({conto: '18', dareAvere: 'AVERE', importo: run.totale, testo: 'banca c/transito — ' + run.numero});
    var r = n.post({data: data, tipo: 'PAGAMENTO_F110', rif: run.numero, descrizione: 'F110 ' + run.numero + ': bonifici SEPA a ' + run.partite.map(function (x) { return x.nome; }).join(', '), righe: righe});
    run.contabile = r.numero; T().pagamenti.push(run); n.salva(); return r;
  }
  function sepa(run) {   // anteprima del file pain.001.001.03 (bonifico SEPA)
    var x = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    return '<?xml version="1.0" encoding="UTF-8"?>\n<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">\n <CstmrCdtTrfInitn>\n  <GrpHdr><MsgId>' + run.numero + '</MsgId><CreDtTm>' + run.data + 'T09:00:00</CreDtTm><NbOfTxs>' + run.partite.length + '</NbOfTxs><CtrlSum>' + run.totale.toFixed(2) + '</CtrlSum><InitgPty><Nm>Ferro e Transenne Srl (didattica)</Nm></InitgPty></GrpHdr>\n  <PmtInf><PmtInfId>' + run.numero + '-1</PmtInfId><PmtMtd>TRF</PmtMtd><ReqdExctnDt>' + run.data + '</ReqdExctnDt>\n   <Dbtr><Nm>Ferro e Transenne Srl</Nm></Dbtr><DbtrAcct><Id><IBAN>IT00X0000000000000000000000</IBAN></Id></DbtrAcct>\n' +
      run.partite.map(function (p, k) { var f = S().fornitori[p.fornitore] || {}; return '   <CdtTrfTxInf><PmtId><EndToEndId>' + run.numero + '-' + (k + 1) + '</EndToEndId></PmtId><Amt><InstdAmt Ccy="EUR">' + p.importo.toFixed(2) + '</InstdAmt></Amt>\n    <Cdtr><Nm>' + x(p.nome) + '</Nm></Cdtr><CdtrAcct><Id><IBAN>' + x(f.iban || '') + '</IBAN></Id></CdtrAcct><RmtInf><Ustrd>Pagamento fattura ' + x(p.doc) + '</Ustrd></RmtInf></CdtTrfTxInf>\n'; }).join('') +
      '  </PmtInf>\n </CstmrCdtTrfInitn>\n</Document>';
  }
  // ── estratto conto elettronico ──
  function caricaEstratto(i) {
    var n = N(), data = n.data(i.data), righe = String(i.righe || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean).map(function (x, k) {
      var p = x.split(';'); if (p.length < 3) throw Error('Riga ' + (k + 1) + ': servono data;importo;descrizione.');
      return {id: k + 1, data: L.dataOk(p[0].trim()), importo: L.num(p[1], 'Importo riga ' + (k + 1)), descrizione: p.slice(2).join(';').trim(), stato: 'da abbinare'};
    });
    if (!righe.length) throw Error('Estratto vuoto.');
    var primo = righe.reduce(function (d, x) { return x.data < d ? x.data : d; }, righe[0].data);
    var e = {numero: String(n.numero('estratto')), data: data, banca: 'Banca c/c (conto 10)', righe: righe, saldoIniziale: saldo10(function (d) { return d < primo; })};   // saldo d'apertura: il giorno prima del primo movimento
    e.saldoFinale = r2(e.saldoIniziale + righe.reduce(function (t, x) { return t + x.importo; }, 0));
    T().estratti.push(e); n.salva();
    return '<p class="lab-nota">Estratto conto n. ' + e.numero + ' del ' + L.fd(data) + ' caricato: ' + righe.length + ' movimenti. Ora l\'abbinamento automatico.</p>';
  }
  var estratto = function (n) { var e = T().estratti.find(function (x) { return x.numero === String(n); }); if (!e) throw Error('Estratto inesistente.'); return e; };
  function regola(e, x) {   // che cosa propone l'abbinamento automatico per una riga
    var testo = x.descrizione.toUpperCase();
    if (x.importo < 0) {
      var run = T().pagamenti.find(function (r) { return !r.addebitato && Math.abs(r.totale + x.importo) < 0.005; });
      if (run) return {tipo: 'pagamento', run: run.numero, spiega: 'addebito del programma di pagamento ' + run.numero};
      if (/COMMISSION|SPESE|CANONE/.test(testo)) return {tipo: 'conto', conto: '58', spiega: 'parola chiave «commissioni/spese» → conto 58'};
      return null;
    }
    if (/INTERESS/.test(testo)) return {tipo: 'conto', conto: '59', spiega: 'parola chiave «interessi» → conto 59'};
    var aperte = partite('cliente', null, x.data).filter(function (p) { return p.aperto > 0.004; });
    var rif = aperte.find(function (p) { return testo.indexOf(String(p.doc)) >= 0; });
    if (rif) return {tipo: 'cliente', partner: rif.partner, doc: rif.doc, spiega: 'riferimento fattura ' + rif.doc + ' (' + rif.nome + ')'};
    var stesso = aperte.filter(function (p) { return Math.abs(p.aperto - x.importo) < 0.005; });
    if (stesso.length === 1) return {tipo: 'cliente', partner: stesso[0].partner, doc: stesso[0].doc, spiega: 'importo uguale a una sola partita aperta: ' + stesso[0].doc + ' (' + stesso[0].nome + ')'};
    return null;
  }
  function registraRiga(e, x, a, data) {
    var n = N(), imp = Math.abs(x.importo), righe;
    if (a.tipo === 'pagamento') { var run = T().pagamenti.find(function (r) { return r.numero === a.run; }); run.addebitato = x.data;
      righe = [{conto: '18', dareAvere: 'DARE', importo: imp, testo: run.numero}, {conto: '10', dareAvere: 'AVERE', importo: imp}]; }
    else if (a.tipo === 'conto') righe = x.importo < 0 ? [{conto: a.conto, dareAvere: 'DARE', importo: imp}, {conto: '10', dareAvere: 'AVERE', importo: imp}] : [{conto: '10', dareAvere: 'DARE', importo: imp}, {conto: a.conto, dareAvere: 'AVERE', importo: imp}];
    else if (a.tipo === 'cliente') righe = [{conto: '10', dareAvere: 'DARE', importo: imp}, {conto: '11', dareAvere: 'AVERE', importo: imp, partner: a.partner, pareggio: a.doc || '', testo: a.doc ? 'incasso ' + a.doc : 'incasso in conto'}];
    else if (a.tipo === 'fornitore') righe = [{conto: '20', dareAvere: 'DARE', importo: imp, partner: a.partner, pareggio: a.doc || ''}, {conto: '10', dareAvere: 'AVERE', importo: imp}];
    else throw Error('Abbinamento sconosciuto.');
    var r = n.post({data: data || x.data, tipo: 'ESTRATTO_CONTO', rif: 'EC ' + e.numero + '/' + x.id, descrizione: 'Estratto conto ' + e.numero + ' riga ' + x.id + ': ' + x.descrizione + ' — ' + (a.spiega || 'abbinamento manuale'), righe: righe});
    x.stato = a.manuale ? 'registrata a mano' : 'abbinata in automatico'; x.contabile = r.numero; x.regola = a.spiega || 'manuale (FEBAN)';
    return r;
  }
  function abbina(i) {
    var e = estratto(i.estratto), fatte = [];
    e.righe.filter(function (x) { return x.stato === 'da abbinare'; }).forEach(function (x) { var a = regola(e, x); if (a) fatte.push(registraRiga(e, x, a)); });
    N().salva();
    var resto = e.righe.filter(function (x) { return x.stato === 'da abbinare'; }).length;
    if (!fatte.length) throw Error('Nessuna riga abbinabile in automatico: completa a mano (FEBAN).');
    return '<p class="lab-nota">Abbinamento automatico: <b>' + fatte.length + ' righe registrate</b>' + (resto ? ', ' + resto + ' da completare a mano (FEBAN).' : '. Estratto completo.') + '</p>';
  }
  function manuale(i) {
    var e = estratto(i.estratto), x = e.righe.find(function (r) { return r.id === +i.riga; }); if (!x) throw Error('Riga inesistente.');
    if (x.stato !== 'da abbinare') throw Error('Riga già registrata.');
    var a = {manuale: true};
    if (i.cliente) { N().cliente(i.cliente); a.tipo = 'cliente'; a.partner = i.cliente; a.doc = String(i.doc || ''); a.spiega = 'manuale: incasso ' + (a.doc ? 'fattura ' + a.doc : 'in conto') + ' da ' + S().clienti[i.cliente].nome; }
    else if (i.fornitore) { N().fornitore(i.fornitore); a.tipo = 'fornitore'; a.partner = i.fornitore; a.doc = String(i.doc || ''); a.spiega = 'manuale: pagamento a ' + S().fornitori[i.fornitore].nome; }
    else if (i.conto) { if (!S().pianoDeiConti.some(function (c) { return c.codice === String(i.conto); })) throw Error('Conto ' + i.conto + ' inesistente.'); a.tipo = 'conto'; a.conto = String(i.conto); a.spiega = 'manuale: conto ' + i.conto; }
    else throw Error('Indica il cliente, il fornitore o il conto.');
    var r = registraRiga(e, x, a); N().salva(); return r;
  }
  function saldo10(filtro) { return r2(S().registrazioni.filter(function (r) { return filtro(r.data); }).reduce(function (t, r) { return t + r.righe.filter(function (x) { return x.conto === '10'; }).reduce(function (u, x) { return u + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0); }, 0)); }
  function riconciliazione(n) {
    var e = estratto(n), banca = saldo10(function (d) { return d <= e.data; });   // conto banca alla data dell'estratto
    var registrate = e.righe.filter(function (x) { return x.contabile; });
    return {saldoBanca: e.saldoFinale, saldoConto: banca, daRegistrare: e.righe.filter(function (x) { return !x.contabile; }), ok: Math.abs(e.saldoFinale - banca) < 0.005 && registrate.length === e.righe.length};
  }
  return {partite: partite, anzianita: anzianita, previsione: previsione, propostaPagamenti: propostaPagamenti, eseguiPagamenti: eseguiPagamenti, sepa: sepa,
    caricaEstratto: caricaEstratto, regola: regola, abbina: abbina, manuale: manuale, riconciliazione: riconciliazione, T: T, piuGiorni: piuGiorni, gg: gg};
})();
