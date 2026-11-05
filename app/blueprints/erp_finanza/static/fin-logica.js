/* SISTEMA INTEGRATO — Finanza e adempimenti: titoli di credito, finanziamenti, ritenute, bolli, crediti dubbi, scambi con l'UE.
   CAMBIALI (attive e passive)  pagherò: il debitore promette di pagare (bollo 11‰ a carico di chi lo firma);
                                tratta: il creditore ordina al debitore di pagare, il debitore la accetta (bollo 12‰ a carico di chi la emette).
     ricevuta dal cliente  D 11.10 Cambiali attive / A 11 Cliente (la fattura si chiude: il credito cambia forma)
     sconto in banca       D 10 netto + D 60 interessi di sconto + D 58 commissione / A 11.10 (la banca la incasserà lei)
     incasso a scadenza    D 10 / A 11.10        insoluta + protesto  D 11.20 Crediti insoluti / A 11.10 (o A 10 se era scontata) + spese
     emessa al fornitore   D 20 Fornitore / A 20.10 Cambiali passive · pagamento a scadenza  D 20.10 / A 10
   ASSEGNI  bancario emesso  D 20 / A 18.10 Assegni emessi in circolazione → addebito in conto D 18.10 / A 10
            circolare        D 20 / A 10 subito (la banca lo emette coprendolo con i nostri soldi) + commissione
            ricevuto         D 11.30 Assegni da versare / A 11 → versamento D 10 / A 11.30
   MUTUO   erogazione D 10 / A 37.10 Mutui passivi (+ D 58 spese di istruttoria) · rata (ammortamento francese, rata costante)
           D 37.10 quota capitale + D 74 Interessi passivi su mutui / A 10 · al 31/12 rateo passivo sugli interessi maturati
   LEASING maxicanone e canoni = costi (D 88 Canoni di leasing + D 14 IVA / A 10, addebito SDD), al 31/12 risconto attivo
           del maxicanone sulla durata del contratto; riscatto = acquisto del cespite. Metodo finanziario (IFRS 16) solo da leggere.
   RITENUTA D'ACCONTO  parcella del professionista: D 54 onorario + cassa + D 14 IVA / A 20 totale; al pagamento si trattiene
           il 20% dell'onorario: D 20 totale / A 29.10 Erario c/ritenute / A banca netto; F24 codice 1040 entro il 16 del mese dopo.
   IMPOSTA DI BOLLO  2 € su ogni fattura senza IVA oltre 77,47 € (bollo virtuale, F24 2521-2524 per trimestre) e bollo sulle cambiali.
   CREDITI DUBBI  accantonamento D 89 Svalutazione crediti / A 11.90 Fondo svalutazione crediti (deducibile IRES lo 0,5% dei crediti,
           fondo fino al 5%; mai deducibile IRAP) · perdita  D 11.90 fino al fondo + D 62 Perdite su crediti / A 11 o A 11.20.
   INTRACOMUNITARI acquisto: D costo + D 14 / A 20 imponibile + A 21 IVA (integrazione TD18, reverse charge) · cessione: D 11 / A 40
           non imponibile art. 41 (nessun bollo), elenchi Intrastat. */
window.FIN4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var X = function () {
    var s = S(); s.fin = s.fin || {};
    ['cambiali', 'assegni', 'mutui', 'leasing', 'parcelle', 'f24', 'bolli', 'svalutazioni', 'perdite', 'intra'].forEach(function (k) { s.fin[k] = s.fin[k] || []; });
    return s.fin;
  };
  var num = function (v, nome, min, def) { return v == null || v === '' ? def : L.num(v, nome, min); };
  var progressivo = function (chiave, prefisso) { var s = S(); if (s.numeri[chiave] == null) s.numeri[chiave] = 0; return prefisso + '-' + String(N().numero(chiave)).padStart(3, '0'); };
  var giorni = function (a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); };
  function piuMesi(d, m) {
    var y = +d.slice(0, 4), mm = +d.slice(5, 7) - 1 + m, g = +d.slice(8, 10);
    y += Math.floor(mm / 12); mm = ((mm % 12) + 12) % 12;
    var ult = new Date(Date.UTC(y, mm + 1, 0)).getUTCDate();
    return y + '-' + String(mm + 1).padStart(2, '0') + '-' + String(Math.min(g, ult)).padStart(2, '0');
  }
  var piuGiorni = function (d, n) { var x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  var banca = function (b) { return N().contoBancario(b); };

  // ═════════════════════════ CAMBIALI ═════════════════════════
  var ALIQ_BOLLO = {paghero: 11, tratta: 12};   // per mille (tariffa DPR 642/72, art. 6)
  function bolloCambiale(importo, tipo) { return Math.max(0.5, r2(importo * ALIQ_BOLLO[tipo] / 1000)); }
  var cambiale = function (num) { var c = X().cambiali.find(function (x) { return x.numero === String(num); }); if (!c) throw Error('Cambiale ' + num + ' inesistente.'); return c; };
  function impegnataInCambiale(doc) { return X().cambiali.some(function (x) { return x.verso === 'attiva' && x.fattura === doc; }); }
  // partite aperte dei clienti che si possono «trasformare» in cambiale (non già in Ri.Ba., factoring, anticipo o cambiale)
  function partiteClienti(alla) {
    var lib = window.RB4 ? window.RB4.partiteLibere(alla) : window.TS4.partite('cliente', null, alla).filter(function (p) { return p.doc !== 'acconto' && p.aperto > 0.004; });
    return lib.filter(function (p) { return !impegnataInCambiale(p.doc); });
  }
  function partiteFornitori(alla) { return window.TS4.partite('fornitore', null, alla).filter(function (p) { return p.doc !== 'acconto' && p.aperto > 0.004; }); }
  function riceviCambiale(i) {
    var n = N(), data = n.data(i.data), tipo = i.tipo === 'paghero' ? 'paghero' : 'tratta';
    var p = partiteClienti(data).find(function (x) { return x.doc === String(i.fattura); });
    if (!p) throw Error('La fattura ' + (i.fattura || '?') + ' non è una partita aperta libera di un cliente (forse è già in Ri.Ba., ceduta o anticipata).');
    var scad = L.dataOk(i.scadenza); if (scad <= data) throw Error('La scadenza della cambiale deve essere successiva alla data di emissione.');
    var imp = num(i.importo, 'Importo della cambiale', 0.01, p.aperto); if (imp > p.aperto + 0.005) throw Error('La cambiale non può superare il credito aperto (' + L.eur(p.aperto) + ').');
    var numero = progressivo('cambiale', 'CA'), bollo = bolloCambiale(imp, tipo), nostro = tipo === 'tratta';
    var righe = [{conto: '11.10', dareAvere: 'DARE', importo: imp, partner: p.partner, testo: (tipo === 'tratta' ? 'tratta accettata ' : 'pagherò ') + numero + ' scad. ' + L.fd(scad)},
                 {conto: '11', dareAvere: 'AVERE', importo: imp, partner: p.partner, pareggio: p.doc, testo: 'fattura ' + p.doc + ' pagata con cambiale'}];
    if (nostro) righe.push({conto: '87', dareAvere: 'DARE', importo: bollo, testo: 'bollo 12‰ sulla tratta ' + numero}, {conto: banca(i.banca), dareAvere: 'AVERE', importo: bollo, testo: 'acquisto marca da bollo'});
    var r = n.post({data: data, tipo: 'CAMBIALE_ATTIVA', rif: numero, descrizione: (tipo === 'tratta' ? 'Tratta ' + numero + ' emessa su ' : 'Pagherò ' + numero + ' firmato da ') + p.nome + ' per la fattura ' + p.doc + ': ' + L.eur(imp) + ' scadenza ' + L.fd(scad) +
      (nostro ? ' — bollo 12‰ a nostro carico ' + L.eur(bollo) : ' — il bollo 11‰ lo paga chi firma il pagherò'), righe: righe});
    X().cambiali.push({numero: numero, verso: 'attiva', tipo: tipo, partner: p.partner, nome: p.nome, fattura: p.doc, importo: imp, emissione: data, scadenza: scad, bollo: bollo, bolloNostro: nostro, stato: 'portafoglio', contabile: r.numero});
    n.salva(); return r;
  }
  function scontaCambiale(i) {
    var n = N(), data = n.data(i.data), c = cambiale(i.cambiale);
    if (c.verso !== 'attiva' || c.stato !== 'portafoglio') throw Error('Si può scontare solo una cambiale attiva in portafoglio (' + c.numero + ' è ' + c.stato + ').');
    if (data >= c.scadenza) throw Error('Lo sconto si chiede prima della scadenza (' + L.fd(c.scadenza) + ').');
    var tasso = num(i.tasso, 'Tasso di sconto annuo %', 0, 6), comm = num(i.commissione, 'Commissione €', 0, 0), gg = giorni(data, c.scadenza);
    var int = r2(c.importo * tasso / 100 * gg / 365), netto = r2(c.importo - int - comm);
    var r = n.post({data: data, tipo: 'SCONTO_CAMBIALE', rif: c.numero, descrizione: 'Sconto della cambiale ' + c.numero + ' di ' + c.nome + ': ' + L.eur(c.importo) + ' × ' + tasso + '% × ' + gg + '/365 giorni = interessi ' + L.eur(int) + (comm ? ', commissione ' + L.eur(comm) : '') + ' → accredito ' + L.eur(netto),
      righe: [{conto: banca(i.banca), dareAvere: 'DARE', importo: netto, testo: 'netto ricavo sconto ' + c.numero}, {conto: '60', dareAvere: 'DARE', importo: int, testo: 'interessi di sconto ' + gg + ' gg'},
              {conto: '58', dareAvere: 'DARE', importo: comm, testo: 'commissione di sconto'}, {conto: '11.10', dareAvere: 'AVERE', importo: c.importo, partner: c.partner, testo: 'cambiale ' + c.numero + ' girata alla banca'}]});
    Object.assign(c, {stato: 'scontata', sconto: {data: data, tasso: tasso, giorni: gg, interessi: int, commissione: comm, netto: netto, contabile: r.numero}});
    n.salva(); return r;
  }
  function incassaCambiale(i) {
    var n = N(), data = n.data(i.data), c = cambiale(i.cambiale);
    if (c.verso !== 'attiva') throw Error(c.numero + ' è una cambiale passiva: si paga, non si incassa.');
    if (c.stato === 'scontata') { if (data < c.scadenza) throw Error('L\'esito arriva alla scadenza (' + L.fd(c.scadenza) + ').'); c.stato = 'pagata'; c.esito = data; n.salva(); return '<p class="lab-nota">Cambiale ' + c.numero + ' scontata e pagata dal debitore alla banca: <b>nessuna scrittura</b>, il rischio di regresso è finito.</p>'; }
    if (c.stato !== 'portafoglio') throw Error('Cambiale ' + c.numero + ' già ' + c.stato + '.');
    if (data < c.scadenza) throw Error('Una cambiale si incassa alla scadenza (' + L.fd(c.scadenza) + ') o dopo.');
    var spese = num(i.spese, 'Commissione di incasso €', 0, 0);
    var r = n.post({data: data, tipo: 'INCASSO_CAMBIALE', rif: c.numero, descrizione: 'Incasso della cambiale ' + c.numero + ' di ' + c.nome + ' alla scadenza: ' + L.eur(c.importo),
      righe: [{conto: banca(i.banca), dareAvere: 'DARE', importo: r2(c.importo - spese), testo: 'incasso ' + c.numero}, {conto: '58', dareAvere: 'DARE', importo: spese, testo: 'commissione di incasso'}, {conto: '11.10', dareAvere: 'AVERE', importo: c.importo, partner: c.partner, testo: 'cambiale incassata'}]});
    c.stato = 'pagata'; c.esito = data; n.salva(); return r;
  }
  function insolutaCambiale(i) {
    var n = N(), data = n.data(i.data), c = cambiale(i.cambiale);
    if (c.verso !== 'attiva' || ['portafoglio', 'scontata'].indexOf(c.stato) < 0) throw Error('Solo una cambiale attiva in portafoglio o scontata può tornare insoluta.');
    if (data < c.scadenza) throw Error('L\'insoluto si conosce alla scadenza (' + L.fd(c.scadenza) + ') o dopo.');
    var spese = num(i.spese, 'Spese di protesto €', 0, 0), righe = [{conto: '11.20', dareAvere: 'DARE', importo: r2(c.importo + spese), partner: c.partner, testo: 'cambiale ' + c.numero + ' insoluta (con spese di protesto da recuperare)'}];
    if (c.stato === 'scontata') righe.push({conto: banca(i.banca), dareAvere: 'AVERE', importo: r2(c.importo + spese), testo: 'la banca riaddebita la cambiale scontata + spese'});
    else { righe.push({conto: '11.10', dareAvere: 'AVERE', importo: c.importo, partner: c.partner, testo: 'cambiale non pagata'}); if (spese) righe.push({conto: banca(i.banca), dareAvere: 'AVERE', importo: spese, testo: 'spese di protesto'}); }
    var r = n.post({data: data, tipo: 'CAMBIALE_INSOLUTA', rif: c.numero, descrizione: 'Cambiale ' + c.numero + ' di ' + c.nome + ' INSOLUTA e protestata' + (c.stato === 'scontata' ? ' (era scontata: la banca la riaddebita)' : '') + ': ' + L.eur(c.importo) + (spese ? ' + spese ' + L.eur(spese) : '') + ' → crediti insoluti', righe: righe});
    c.stato = 'insoluta'; c.esito = data; c.insoluto = r2(c.importo + spese); n.salva(); return r;
  }
  function emettiCambialePassiva(i) {
    var n = N(), data = n.data(i.data), tipo = i.tipo === 'tratta' ? 'tratta' : 'paghero';
    var p = partiteFornitori(data).find(function (x) { return x.doc === String(i.fattura); });
    if (!p) throw Error('La fattura ' + (i.fattura || '?') + ' non è un debito aperto verso un fornitore.');
    var scad = L.dataOk(i.scadenza); if (scad <= data) throw Error('La scadenza deve essere successiva all\'emissione.');
    var imp = num(i.importo, 'Importo', 0.01, p.aperto); if (imp > p.aperto + 0.005) throw Error('La cambiale non può superare il debito aperto (' + L.eur(p.aperto) + ').');
    var numero = progressivo('cambiale', 'CP'), bollo = bolloCambiale(imp, tipo), nostro = tipo === 'paghero';
    var righe = [{conto: '20', dareAvere: 'DARE', importo: imp, partner: p.partner, pareggio: p.doc, testo: 'fattura ' + p.doc + ' pagata con cambiale'}, {conto: '20.10', dareAvere: 'AVERE', importo: imp, partner: p.partner, testo: (nostro ? 'pagherò ' : 'tratta accettata ') + numero}];
    if (nostro) righe.push({conto: '87', dareAvere: 'DARE', importo: bollo, testo: 'bollo 11‰ sul pagherò ' + numero}, {conto: banca(i.banca), dareAvere: 'AVERE', importo: bollo, testo: 'marca da bollo'});
    var r = n.post({data: data, tipo: 'CAMBIALE_PASSIVA', rif: numero, descrizione: (nostro ? 'Firmiamo un pagherò ' : 'Accettiamo la tratta ') + numero + ' a favore di ' + p.nome + ' per la fattura ' + p.doc + ': ' + L.eur(imp) + ' scadenza ' + L.fd(scad) + (nostro ? ' — bollo 11‰ ' + L.eur(bollo) + ' a nostro carico' : ' — il bollo lo paga il fornitore che emette la tratta'), righe: righe});
    X().cambiali.push({numero: numero, verso: 'passiva', tipo: tipo, partner: p.partner, nome: p.nome, fattura: p.doc, importo: imp, emissione: data, scadenza: scad, bollo: bollo, bolloNostro: nostro, stato: 'da pagare', contabile: r.numero});
    n.salva(); return r;
  }
  function pagaCambialePassiva(i) {
    var n = N(), data = n.data(i.data), c = cambiale(i.cambiale);
    if (c.verso !== 'passiva' || c.stato !== 'da pagare') throw Error('Cambiale ' + c.numero + ': nulla da pagare.');
    if (data < c.scadenza) throw Error('La cambiale si paga alla scadenza (' + L.fd(c.scadenza) + ').');
    var r = n.post({data: data, tipo: 'PAGAMENTO_CAMBIALE', rif: c.numero, descrizione: 'Pagamento alla scadenza della cambiale ' + c.numero + ' a ' + c.nome + ': ' + L.eur(c.importo),
      righe: [{conto: '20.10', dareAvere: 'DARE', importo: c.importo, partner: c.partner, testo: 'cambiale pagata'}, {conto: banca(i.banca), dareAvere: 'AVERE', importo: c.importo, testo: 'pagamento ' + c.numero}]});
    c.stato = 'pagata'; c.esito = data; n.salva(); return r;
  }

  // ═════════════════════════ ASSEGNI ═════════════════════════
  var assegno = function (num) { var a = X().assegni.find(function (x) { return x.numero === String(num); }); if (!a) throw Error('Assegno ' + num + ' inesistente.'); return a; };
  function nuovoNumeroAssegno(v) { var t = String(v || '').trim().toUpperCase(); if (!t) t = 'AB-' + String(N().numero('assegno')).padStart(7, '0'); if (X().assegni.some(function (x) { return x.numero === t; })) throw Error('Assegno n. ' + t + ' già registrato.'); return t; }
  function emettiAssegno(i) {
    var n = N(), data = n.data(i.data), tipo = i.tipo === 'circolare' ? 'circolare' : 'bancario';
    var f = n.fornitore(i.fornitore), aperto = r2(-n.saldo('20', i.fornitore)); if (aperto <= 0.004) throw Error(f.nome + ' non ha debiti aperti.');
    var doc = String(i.fattura || '').trim(), p = doc ? partiteFornitori(data).find(function (x) { return x.doc === doc && x.partner === i.fornitore; }) : null;
    if (doc && !p) throw Error('La fattura ' + doc + ' non è un debito aperto di ' + f.nome + '.');
    if (doc && X().parcelle.some(function (x) { return x.rif === doc && x.fornitore === i.fornitore && !x.pagata; })) throw Error('La ' + doc + ' è una parcella con ritenuta d\'acconto: pagala da Finanza → Ritenute d\'acconto (scegli «assegno bancario»), così il programma trattiene la ritenuta.');
    var imp = num(i.importo, 'Importo', 0.01, p ? p.aperto : aperto); if (imp > aperto + 0.005) throw Error('Non si paga più del debito aperto (' + L.eur(aperto) + ').');
    var numero = nuovoNumeroAssegno(i.numero), comm = tipo === 'circolare' ? num(i.commissione, 'Commissione €', 0, 0) : 0, b = banca(i.banca);
    var riga = {conto: '20', dareAvere: 'DARE', importo: imp, partner: i.fornitore, testo: 'assegno ' + numero}; if (doc) riga.pareggio = doc;
    var righe = [riga, {conto: tipo === 'circolare' ? b : '18.10', dareAvere: 'AVERE', importo: imp, testo: tipo === 'circolare' ? 'assegno circolare ' + numero + ' emesso dalla banca' : 'assegno bancario ' + numero + ' in circolazione'}];
    if (comm) righe.push({conto: '58', dareAvere: 'DARE', importo: comm, testo: 'commissione assegno circolare'}, {conto: b, dareAvere: 'AVERE', importo: comm, testo: 'commissione'});
    var r = n.post({data: data, tipo: 'ASSEGNO_EMESSO', rif: numero, descrizione: 'Assegno ' + tipo + ' n. ' + numero + ' a ' + f.nome + (doc ? ' per la fattura ' + doc : '') + ': ' + L.eur(imp) + (tipo === 'bancario' ? ' — la banca lo addebiterà quando il beneficiario lo incassa' : ' — addebitato subito dalla banca'), righe: righe});
    X().assegni.push({numero: numero, verso: 'emesso', tipo: tipo, partner: i.fornitore, nome: f.nome, fattura: doc, importo: imp, data: data, banca: b, stato: tipo === 'circolare' ? 'addebitato' : 'in circolazione', addebito: tipo === 'circolare' ? data : null, contabile: r.numero});
    n.salva(); return r;
  }
  function addebitaAssegno(i) {
    var n = N(), data = n.data(i.data), a = assegno(i.assegno);
    if (a.verso !== 'emesso' || a.stato !== 'in circolazione') throw Error('L\'assegno ' + a.numero + ' non è in circolazione.');
    if (data < a.data) throw Error('L\'addebito non può precedere l\'emissione (' + L.fd(a.data) + ').');
    var r = n.post({data: data, tipo: 'ADDEBITO_ASSEGNO', rif: a.numero, descrizione: 'Estratto conto: addebito dell\'assegno ' + a.numero + ' incassato da ' + a.nome + ' (' + L.eur(a.importo) + ')',
      righe: [{conto: '18.10', dareAvere: 'DARE', importo: a.importo, testo: 'assegno ' + a.numero + ' incassato dal beneficiario'}, {conto: a.banca, dareAvere: 'AVERE', importo: a.importo, testo: 'addebito assegno ' + a.numero}]});
    a.stato = 'addebitato'; a.addebito = data; n.salva(); return r;
  }
  function riceviAssegno(i) {
    var n = N(), data = n.data(i.data), c = n.cliente(i.cliente), doc = String(i.fattura || '').trim();
    var aperto = r2(n.saldo('11', i.cliente)); if (aperto <= 0.004) throw Error(c.nome + ' non ha crediti aperti.');
    var imp = num(i.importo, 'Importo', 0.01, aperto); if (imp > aperto + 0.005) throw Error('L\'assegno supera il credito aperto (' + L.eur(aperto) + ').');
    var numero = nuovoNumeroAssegno(i.numero || ('RIC-' + String(N().numero('assegno')).padStart(5, '0')));
    var riga = {conto: '11', dareAvere: 'AVERE', importo: imp, partner: i.cliente, testo: 'assegno ' + numero}; if (doc) riga.pareggio = doc;
    var r = n.post({data: data, tipo: 'ASSEGNO_RICEVUTO', rif: numero, descrizione: 'Assegno n. ' + numero + ' ricevuto da ' + c.nome + (doc ? ' per la fattura ' + doc : '') + ': ' + L.eur(imp) + ' — da versare in banca',
      righe: [{conto: '11.30', dareAvere: 'DARE', importo: imp, testo: 'assegno ' + numero + ' in cassa'}, riga]});
    X().assegni.push({numero: numero, verso: 'ricevuto', tipo: 'bancario', partner: i.cliente, nome: c.nome, fattura: doc, importo: imp, data: data, stato: 'da versare', contabile: r.numero});
    n.salva(); return r;
  }
  function versaAssegni(i) {
    var n = N(), data = n.data(i.data), da = X().assegni.filter(function (a) { return a.verso === 'ricevuto' && a.stato === 'da versare' && a.data <= data; });
    if (!da.length) throw Error('Nessun assegno da versare a questa data.');
    var tot = r2(da.reduce(function (t, a) { return t + a.importo; }, 0)), b = banca(i.banca);
    var r = n.post({data: data, tipo: 'VERSAMENTO_ASSEGNI', rif: 'VERS-' + data, descrizione: 'Distinta di versamento di ' + da.length + ' assegn' + (da.length === 1 ? 'o' : 'i') + ': ' + da.map(function (a) { return a.numero; }).join(', ') + ' — ' + L.eur(tot),
      righe: [{conto: b, dareAvere: 'DARE', importo: tot, testo: 'versamento assegni'}, {conto: '11.30', dareAvere: 'AVERE', importo: tot, testo: 'assegni versati'}]});
    da.forEach(function (a) { a.stato = 'versato'; a.versamento = data; }); n.salva(); return r;
  }

  // ═════════════════════════ MUTUI ═════════════════════════
  var mutuo = function (num) { var m = X().mutui.find(function (x) { return x.numero === String(num); }); if (!m) throw Error('Mutuo ' + num + ' inesistente.'); return m; };
  function pianoFrancese(capitale, tassoAnnuo, nRate, mesi, primaData) {
    var i = tassoAnnuo / 100 * mesi / 12, rata = i ? r2(capitale * i / (1 - Math.pow(1 + i, -nRate))) : r2(capitale / nRate), resto = capitale, out = [];
    for (var k = 1; k <= nRate; k++) {
      var int = r2(resto * i), cap = k === nRate ? r2(resto) : r2(rata - int);
      resto = r2(resto - cap);
      out.push({n: k, scadenza: piuMesi(primaData, (k - 1) * mesi), rata: r2(cap + int), capitale: cap, interessi: int, residuo: Math.max(0, resto), pagata: null});
    }
    return {rata: rata, piano: out};
  }
  function calcolaMutuo(i) {
    var imp = L.num(i.importo, 'Importo del mutuo', 1), tasso = L.num(i.tasso, 'Tasso annuo %', 0), nRate = Math.round(L.num(i.rate, 'Numero di rate', 1)), mesi = +(i.periodicita || 1);
    if ([1, 3, 6, 12].indexOf(mesi) < 0) throw Error('Periodicità: mensile, trimestrale, semestrale o annuale.');
    var data = L.dataOk(i.data), prima = i.primaRata ? L.dataOk(i.primaRata) : piuMesi(data, mesi);
    if (prima <= data) throw Error('La prima rata deve scadere dopo l\'erogazione.');
    var p = pianoFrancese(imp, tasso, nRate, mesi, prima);
    return {importo: imp, tasso: tasso, rate: nRate, periodicita: mesi, data: data, primaRata: prima, rata: p.rata, piano: p.piano,
      totaleInteressi: r2(p.piano.reduce(function (t, x) { return t + x.interessi; }, 0))};
  }
  function accendiMutuo(i) {
    var n = N(), c = calcolaMutuo(i); n.data(c.data);
    var spese = num(i.spese, 'Spese di istruttoria €', 0, 0), b = banca(i.banca), ente = String(i.ente || '').trim() || 'Banca del conto ' + b, numero = progressivo('mutuo', 'MU');
    var r = n.post({data: c.data, tipo: 'MUTUO_EROGAZIONE', rif: numero, descrizione: 'Mutuo ' + numero + ' di ' + ente + ': ' + L.eur(c.importo) + ' al ' + c.tasso + '% annuo, ' + c.rate + ' rate ' + ({1: 'mensili', 3: 'trimestrali', 6: 'semestrali', 12: 'annuali'})[c.periodicita] + ' da ' + L.eur(c.rata) + ' (ammortamento francese), prima rata ' + L.fd(c.primaRata) + (spese ? ' — spese di istruttoria ' + L.eur(spese) : ''),
      righe: [{conto: b, dareAvere: 'DARE', importo: c.importo, testo: 'erogazione mutuo ' + numero}, {conto: '37.10', dareAvere: 'AVERE', importo: c.importo, testo: 'debito per mutuo ' + numero},
              {conto: '58', dareAvere: 'DARE', importo: spese, testo: 'spese di istruttoria'}, {conto: b, dareAvere: 'AVERE', importo: spese, testo: 'spese di istruttoria'}]});
    X().mutui.push(Object.assign(c, {numero: numero, ente: ente, banca: b, spese: spese, contabile: r.numero, ratei: []}));
    n.salva(); return r;
  }
  function prossimaRata(m) { return m.piano.find(function (x) { return !x.pagata; }); }
  function pagaRata(i) {
    var n = N(), data = n.data(i.data), m = mutuo(i.mutuo), q = prossimaRata(m);
    if (!q) throw Error('Il mutuo ' + m.numero + ' è già estinto.');
    if (data < q.scadenza) throw Error('La rata n. ' + q.n + ' scade il ' + L.fd(q.scadenza) + ': si paga alla scadenza.');
    var r = n.post({data: data, tipo: 'RATA_MUTUO', rif: m.numero + '/' + q.n, descrizione: 'Rata n. ' + q.n + '/' + m.rate + ' del mutuo ' + m.numero + ' (scad. ' + L.fd(q.scadenza) + '): ' + L.eur(q.rata) + ' = quota capitale ' + L.eur(q.capitale) + ' + interessi ' + L.eur(q.interessi) + '; debito residuo ' + L.eur(q.residuo),
      righe: [{conto: '37.10', dareAvere: 'DARE', importo: q.capitale, testo: 'quota capitale rata ' + q.n}, {conto: '74', dareAvere: 'DARE', importo: q.interessi, testo: 'interessi rata ' + q.n}, {conto: m.banca, dareAvere: 'AVERE', importo: q.rata, testo: 'addebito rata ' + q.n}]});
    q.pagata = data; q.contabile = r.numero; n.salva(); return r;
  }
  function residuo(m, alla) { var pag = m.piano.filter(function (x) { return x.pagata && x.pagata <= alla; }); return r2(m.importo - pag.reduce(function (t, x) { return t + x.capitale; }, 0)); }
  // bilancio (art. 2424 c.c. voce D4): debito verso banche esigibile entro ed oltre l'esercizio successivo
  function scadenzeDebito(m, alla) {
    var res = residuo(m, alla), entro = r2(m.piano.filter(function (x) { return !(x.pagata && x.pagata <= alla) && x.scadenza <= piuMesi(alla, 12); }).reduce(function (t, x) { return t + x.capitale; }, 0));
    return {residuo: res, entro: Math.min(entro, res), oltre: r2(res - Math.min(entro, res))};
  }
  // interessi della rata in corso maturati fino alla data: il rateo passivo del 31/12
  function interessiMaturati(m, alla) {
    var q = m.piano.find(function (x) { return x.scadenza > alla; }); if (!q) return null;
    var prec = q.n === 1 ? m.data : m.piano[q.n - 2].scadenza, al = piuGiorni(q.scadenza, -1), tot = giorni(prec, al) + 1, mat = giorni(prec, alla) + 1;
    return {rata: q.n, dal: prec, al: al, interessi: q.interessi, giorni: tot, maturati: mat, quota: r2(q.interessi * mat / tot)};
  }
  function rateoMutuo(i) {
    var m = mutuo(i.mutuo), data = L.dataOk(i.data), x = interessiMaturati(m, data);
    if (!x || x.maturati <= 0) throw Error('Nessun interesse maturato da rinviare a questa data.');
    var r = window.CH4.assestamento({tipo: 'rateo-passivo', conto: '74', importo: x.interessi, dal: x.dal, al: x.al, data: data, testo: 'interessi della rata ' + x.rata + ' del mutuo ' + m.numero});
    m.ratei.push({data: data, quota: x.quota, contabile: r.numero}); N().salva(); return r;
  }

  // ═════════════════════════ LEASING ═════════════════════════
  var leasing = function (num) { var x = X().leasing.find(function (y) { return y.numero === String(num); }); if (!x) throw Error('Contratto di leasing ' + num + ' inesistente.'); return x; };
  function contrattoLeasing(i) {
    var n = N(), data = n.data(i.data), f = n.fornitore(i.societa), bene = String(i.bene || '').trim(); if (!bene) throw Error('Scrivi il bene preso in leasing.');
    var valore = L.num(i.valore, 'Valore del bene', 1), maxi = num(i.maxicanone, 'Maxicanone', 0, 0), canone = L.num(i.canone, 'Canone periodico', 0.01), nCan = Math.round(L.num(i.canoni, 'Numero di canoni', 1));
    var riscatto = num(i.riscatto, 'Prezzo di riscatto', 0, 0), ivaP = num(i.iva, 'IVA %', 0, 22), durata = Math.round(num(i.durata, 'Durata in mesi', 1, nCan + 1)), b = banca(i.banca);
    var classe = i.classe === 'IMP' ? 'IMP' : 'MEZ', fine = piuGiorni(piuMesi(data, durata), -1), numero = progressivo('leasing', 'LS');
    var iva = r2(maxi * ivaP / 100), r = null;
    if (maxi > 0) r = n.post({data: data, tipo: 'LEASING_MAXICANONE', rif: numero, descrizione: 'Leasing ' + numero + ' con ' + f.nome + ': «' + bene + '» valore ' + L.eur(valore) + ', ' + durata + ' mesi (fino al ' + L.fd(fine) + '). Maxicanone ' + L.eur(maxi) + ' + IVA ' + ivaP + '% con addebito SDD; poi ' + nCan + ' canoni da ' + L.eur(canone) + ', riscatto ' + L.eur(riscatto),
      righe: [{conto: '88', dareAvere: 'DARE', importo: maxi, testo: 'maxicanone ' + numero}, {conto: '14', dareAvere: 'DARE', importo: iva, testo: 'IVA ' + ivaP + '%'}, {conto: b, dareAvere: 'AVERE', importo: r2(maxi + iva), testo: 'addebito SDD ' + f.nome}]});
    var canoni = []; for (var k = 1; k <= nCan; k++) canoni.push({n: k, scadenza: piuMesi(data, k), importo: canone, pagato: null});
    X().leasing.push({numero: numero, societa: i.societa, nome: f.nome, bene: bene, valore: valore, maxicanone: maxi, canone: canone, canoni: canoni, riscatto: riscatto, iva: ivaP, durata: durata, inizio: data, fine: fine, banca: b, classe: classe, contabile: r ? r.numero : '', riscattato: null});
    n.salva(); return r || '<p class="lab-nota">Contratto ' + numero + ' registrato senza maxicanone: nessuna scrittura fino al primo canone.</p>';
  }
  function pagaCanone(i) {
    var n = N(), data = n.data(i.data), x = leasing(i.leasing), q = x.canoni.find(function (c) { return !c.pagato; });
    if (!q) throw Error('Tutti i canoni di ' + x.numero + ' sono pagati: resta il riscatto.');
    if (data < q.scadenza) throw Error('Il canone n. ' + q.n + ' scade il ' + L.fd(q.scadenza) + '.');
    var iva = r2(q.importo * x.iva / 100);
    var r = n.post({data: data, tipo: 'LEASING_CANONE', rif: x.numero + '/' + q.n, descrizione: 'Canone n. ' + q.n + '/' + x.canoni.length + ' del leasing ' + x.numero + ' (' + x.bene + '): ' + L.eur(q.importo) + ' + IVA ' + L.eur(iva) + ', addebito SDD',
      righe: [{conto: '88', dareAvere: 'DARE', importo: q.importo, testo: 'canone ' + q.n}, {conto: '14', dareAvere: 'DARE', importo: iva, testo: 'IVA ' + x.iva + '%'}, {conto: x.banca, dareAvere: 'AVERE', importo: r2(q.importo + iva), testo: 'SDD ' + x.nome}]});
    q.pagato = data; q.contabile = r.numero; n.salva(); return r;
  }
  function riscontoMaxicanone(i) {
    var x = leasing(i.leasing), data = L.dataOk(i.data);
    if (!x.maxicanone) throw Error('Il contratto ' + x.numero + ' non ha maxicanone.');
    return window.CH4.assestamento({tipo: 'risconto-attivo', conto: '88', importo: x.maxicanone, dal: x.inizio, al: x.fine, data: data, testo: 'maxicanone del leasing ' + x.numero});
  }
  function riscatta(i) {
    var n = N(), data = n.data(i.data), x = leasing(i.leasing);
    if (x.riscattato) throw Error('Bene già riscattato il ' + L.fd(x.riscattato) + '.');
    if (x.canoni.some(function (c) { return !c.pagato; })) throw Error('Prima di riscattare vanno pagati tutti i canoni.');
    var rif = 'RISC-' + x.numero, r = window.CE4.acquista({classe: i.classe || x.classe, descrizione: x.bene + ' (riscatto leasing ' + x.numero + ')', fornitore: x.societa, importo: x.riscatto, iva: x.iva, data: data, rif: rif});
    var tot = r2(x.riscatto * (1 + x.iva / 100));
    n.post({data: data, tipo: 'LEASING_RISCATTO', rif: rif, descrizione: 'Addebito SDD del riscatto ' + x.numero + ' a ' + x.nome + ': ' + L.eur(tot), righe: [{conto: '20', dareAvere: 'DARE', importo: tot, partner: x.societa, pareggio: rif, testo: 'riscatto'}, {conto: x.banca, dareAvere: 'AVERE', importo: tot, testo: 'SDD riscatto'}]});
    x.riscattato = data; n.salva(); return r;
  }
  // metodo finanziario (OIC 12 nota integrativa, IFRS 16 per chi lo applica): il bene all'attivo, il debito verso il concedente, gli interessi
  function finanziario(x) {
    var flussi = [{t: 0, v: x.maxicanone}].concat(x.canoni.map(function (c) { return {t: c.n, v: c.importo}; }), [{t: x.canoni.length + 1, v: x.riscatto}]);
    var vp = function (im) { return flussi.reduce(function (s, f) { return s + f.v / Math.pow(1 + im, f.t); }, 0); };
    var lo = 0, hi = 0.1, im;
    if (vp(0) <= x.valore) im = 0; else { for (var k = 0; k < 80; k++) { im = (lo + hi) / 2; if (vp(im) > x.valore) lo = im; else hi = im; } }
    var debito = r2(x.valore - x.maxicanone), righe = [], anno = {};
    x.canoni.forEach(function (c) { var int = r2(debito * im); var cap = r2(c.importo - int); debito = r2(debito - cap); var a = c.scadenza.slice(0, 4); anno[a] = anno[a] || {interessi: 0, capitale: 0}; anno[a].interessi = r2(anno[a].interessi + int); anno[a].capitale = r2(anno[a].capitale + cap); });
    Object.keys(anno).sort().forEach(function (a) { righe.push({anno: a, interessi: anno[a].interessi, capitale: anno[a].capitale}); });
    return {tassoMensile: r2(im * 10000) / 100, tassoAnnuo: r2((Math.pow(1 + im, 12) - 1) * 10000) / 100, debitoIniziale: r2(x.valore - x.maxicanone), perAnno: righe};
  }

  // ═════════════════════════ RITENUTA D'ACCONTO ═════════════════════════
  var parcella = function (rif) { var p = X().parcelle.find(function (x) { return x.rif === String(rif); }); if (!p) throw Error('Parcella ' + rif + ' inesistente.'); return p; };
  function registraParcella(i) {
    var n = N(), data = n.data(i.data), f = n.fornitore(i.professionista), rif = String(i.rif || '').trim();
    if (!rif) throw Error('Scrivi il numero della parcella.'); if (X().parcelle.some(function (x) { return x.rif === rif && x.fornitore === i.professionista; })) throw Error('Parcella ' + rif + ' già registrata.');
    var onor = L.num(i.onorario, 'Onorario', 0.01), cassaP = num(i.cassa, 'Cassa previdenza %', 0, 4), ivaP = num(i.iva, 'IVA %', 0, 22), ritP = num(i.ritenuta, 'Ritenuta d\'acconto %', 0, 20);
    var cassa = r2(onor * cassaP / 100), imp = r2(onor + cassa), iva = r2(imp * ivaP / 100), tot = r2(imp + iva), rit = r2(onor * ritP / 100), testo = String(i.testo || '').trim() || 'prestazione professionale';
    var r = n.post({data: data, tipo: 'PARCELLA', rif: rif, descrizione: 'Parcella ' + rif + ' di ' + f.nome + ' (' + testo + '): onorario ' + L.eur(onor) + ' + cassa ' + cassaP + '% ' + L.eur(cassa) + ' + IVA ' + L.eur(iva) + ' = ' + L.eur(tot) + ' — ritenuta d\'acconto ' + ritP + '% sull\'onorario ' + L.eur(rit) + ', netto a pagare ' + L.eur(r2(tot - rit)),
      righe: [{conto: '54', dareAvere: 'DARE', importo: imp, testo: testo + ' (onorario + cassa)'}, {conto: '14', dareAvere: 'DARE', importo: iva, testo: 'IVA ' + ivaP + '%'}, {conto: '20', dareAvere: 'AVERE', importo: tot, partner: i.professionista, testo: 'parcella ' + rif}]});
    X().parcelle.push({rif: rif, fornitore: i.professionista, nome: f.nome, data: data, onorario: onor, cassa: cassa, iva: iva, totale: tot, ritenutaP: ritP, ritenuta: rit, netto: r2(tot - rit), testo: testo, contabile: r.numero, pagata: null, versata: null});
    n.salva(); return r;
  }
  function pagaParcella(i) {
    var n = N(), data = n.data(i.data), p = parcella(i.parcella), mezzo = i.mezzo === 'assegno' ? 'assegno' : 'bonifico', b = banca(i.banca);
    if (p.pagata) throw Error('Parcella ' + p.rif + ' già pagata il ' + L.fd(p.pagata) + '.');
    var numAss = mezzo === 'assegno' ? nuovoNumeroAssegno(i.numero) : '';
    var r = n.post({data: data, tipo: 'PAGAMENTO_PARCELLA', rif: mezzo === 'assegno' ? numAss : 'PAG ' + p.rif, descrizione: 'Pagamento della parcella ' + p.rif + ' di ' + p.nome + ' con ' + (mezzo === 'assegno' ? 'assegno bancario n. ' + numAss : 'bonifico') + ': ' + L.eur(p.totale) + ' − ritenuta d\'acconto ' + L.eur(p.ritenuta) + ' (da versare con F24 codice 1040 entro il 16 del mese dopo) = netto ' + L.eur(p.netto),
      righe: [{conto: '20', dareAvere: 'DARE', importo: p.totale, partner: p.fornitore, pareggio: p.rif, testo: 'parcella ' + p.rif}, {conto: '29.10', dareAvere: 'AVERE', importo: p.ritenuta, testo: 'ritenuta d\'acconto ' + p.ritenutaP + '%'},
              {conto: mezzo === 'assegno' ? '18.10' : b, dareAvere: 'AVERE', importo: p.netto, testo: mezzo === 'assegno' ? 'assegno ' + numAss + ' in circolazione' : 'bonifico netto'}]});
    if (mezzo === 'assegno') X().assegni.push({numero: numAss, verso: 'emesso', tipo: 'bancario', partner: p.fornitore, nome: p.nome, fattura: p.rif, importo: p.netto, data: data, banca: b, stato: 'in circolazione', addebito: null, contabile: r.numero});
    p.pagata = data; p.mezzo = mezzo; p.contabilePagamento = r.numero; n.salva(); return r;
  }
  function scadenzaF24(mese) { var a = +mese.slice(0, 4), m = +mese.slice(5, 7) + 1; if (m > 12) { a++; m = 1; } var d = new Date(Date.UTC(a, m - 1, 16)), g = d.getUTCDay(); if (g === 6) d.setUTCDate(18); if (g === 0) d.setUTCDate(17); return d.toISOString().slice(0, 10); }
  function ritenuteDelMese(mese) { return X().parcelle.filter(function (p) { return p.pagata && p.pagata.slice(0, 7) === mese && !p.versata; }); }
  function versaRitenute(i) {
    var n = N(), data = n.data(i.data), mese = String(i.mese || '').trim(); if (!/^\d{4}-\d{2}$/.test(mese)) throw Error('Scrivi il mese dei pagamenti (AAAA-MM).');
    var da = ritenuteDelMese(mese); if (!da.length) throw Error('Nessuna ritenuta da versare per i pagamenti di ' + mese + '.');
    var tot = r2(da.reduce(function (t, p) { return t + p.ritenuta; }, 0)), scad = scadenzaF24(mese), ritardo = data > scad;
    var r = n.post({data: data, tipo: 'F24_RITENUTE_AUTONOMI', rif: 'F24 1040 ' + mese, descrizione: 'F24 codice tributo 1040 (ritenute sui compensi di lavoro autonomo) per i pagamenti di ' + mese + ': ' + da.map(function (p) { return p.nome + ' ' + L.eur(p.ritenuta); }).join(', ') + ' = ' + L.eur(tot) + ' — scadenza ' + L.fd(scad) + (ritardo ? ' (IN RITARDO: servirebbe il ravvedimento operoso)' : ''),
      righe: [{conto: '29.10', dareAvere: 'DARE', importo: tot, testo: 'ritenute 1040 ' + mese}, {conto: banca(i.banca), dareAvere: 'AVERE', importo: tot, testo: 'F24 ' + mese}]});
    da.forEach(function (p) { p.versata = data; });
    X().f24.push({tributo: '1040', mese: mese, importo: tot, scadenza: scad, data: data, contabile: r.numero}); n.salva(); return r;
  }

  // ═════════════════════════ IMPOSTA DI BOLLO ═════════════════════════
  var SOGLIA_BOLLO = 77.47;
  function trimestre(p) { var m = /^(\d{4})-T([1-4])$/.exec(String(p || '').trim()); if (!m) throw Error('Trimestre nel formato AAAA-T1 … AAAA-T4.'); var a = +m[1], q = +m[2];
    var dal = a + '-' + String(q * 3 - 2).padStart(2, '0') + '-01', al = L.fineMese(a + '-' + String(q * 3).padStart(2, '0'));
    var scad = q === 1 ? a + '-05-31' : q === 2 ? a + '-09-30' : q === 3 ? a + '-11-30' : (a + 1) + '-02-28';
    return {periodo: a + '-T' + q, dal: dal, al: al, scadenza: scad, tributo: '252' + q}; }
  // fatture emesse senza IVA (esenti, non imponibili, export, fuori campo) oltre 77,47 €: ognuna sconta 2 € di bollo virtuale
  function fattureConBollo(dal, al) {
    // fatture emesse dei vari cicli (vendite, servizi, valuta, cessione di cespiti); le cessioni intracomunitarie non scontano bollo
    var TIPI = {FATTURA: 1, FATTURA_SERVIZI: 1, FATTURA_VALUTA: 1, CESSIONE_CESPITE: 1};
    return S().registrazioni.filter(function (r) { return r.data >= dal && r.data <= al && !r.chiusura && !r.stornato && !r.stornoDi && TIPI[r.tipo] && r.righe.some(function (x) { return x.conto === '11' && x.dareAvere === 'DARE'; }); })
      .map(function (r) { var cli = r.righe.find(function (x) { return x.conto === '11' && x.dareAvere === 'DARE'; }), iva = r.righe.filter(function (x) { return x.conto === '21'; }).reduce(function (t, x) { return t + (x.dareAvere === 'AVERE' ? x.importo : -x.importo); }, 0);
        return {doc: r.rif || r.numero, data: r.data, cliente: cli.partner, totale: cli.importo, iva: r2(iva), senzaIva: iva <= 0.004 ? cli.importo : 0, descrizione: r.descrizione}; })
      .filter(function (f) { return f.senzaIva > SOGLIA_BOLLO; });
  }
  function riepilogoBolli(p) {
    var t = trimestre(p), fat = fattureConBollo(t.dal, t.al), cam = X().cambiali.filter(function (c) { return c.bolloNostro && c.emissione >= t.dal && c.emissione <= t.al; });
    return Object.assign(t, {fatture: fat, bolloFatture: r2(fat.length * 2), cambiali: cam, bolloCambiali: r2(cam.reduce(function (s, c) { return s + c.bollo; }, 0)), versato: X().bolli.find(function (b) { return b.periodo === t.periodo; }) || null});
  }
  function versaBolloVirtuale(i) {
    var n = N(), data = n.data(i.data), b = riepilogoBolli(i.trimestre);
    if (b.versato) throw Error('Bollo virtuale del ' + b.periodo + ' già versato il ' + L.fd(b.versato.data) + '.');
    if (!b.fatture.length) throw Error('Nel ' + b.periodo + ' nessuna fattura senza IVA oltre 77,47 €: niente bollo virtuale da versare (il bollo delle cambiali si paga con la marca, al momento).');
    var r = n.post({data: data, tipo: 'BOLLO_VIRTUALE', rif: 'F24 ' + b.tributo + ' ' + b.periodo, descrizione: 'F24 codice ' + b.tributo + ': imposta di bollo sulle fatture elettroniche del ' + b.periodo + ' — ' + b.fatture.length + ' fatture × 2 € = ' + L.eur(b.bolloFatture) + ' (scadenza ' + L.fd(b.scadenza) + ')',
      righe: [{conto: '87', dareAvere: 'DARE', importo: b.bolloFatture, testo: 'bollo virtuale ' + b.periodo}, {conto: banca(i.banca), dareAvere: 'AVERE', importo: b.bolloFatture, testo: 'F24 ' + b.tributo}]});
    X().bolli.push({periodo: b.periodo, fatture: b.fatture.length, importo: b.bolloFatture, data: data, contabile: r.numero}); n.salva(); return r;
  }

  // ═════════════════════════ CREDITI DUBBI ═════════════════════════
  var saldoAl = function (conto, alla) { return r2(S().registrazioni.reduce(function (t, r) { if (r.data > alla || ['epilogo', 'stato patrimoniale'].indexOf(r.chiusura) >= 0) return t; return t + r.righe.filter(function (x) { return x.conto === conto; }).reduce(function (u, x) { return u + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0); }, 0)); };
  // art. 106 TUIR: deducibile lo 0,5% dei crediti commerciali di fine anno, finché il fondo non supera il 5%
  function limiteSvalutazione(anno) {
    var al = anno + '-12-31', crediti = r2(Math.max(0, saldoAl('11', al)) + Math.max(0, saldoAl('11.10', al)) + Math.max(0, saldoAl('11.20', al)));
    var fondoPrima = r2(-S().registrazioni.filter(function (r) { return r.data <= al && r.tipo !== 'SVALUTAZIONE_CREDITI' && !r.chiusura; }).reduce(function (t, r) { return t + r.righe.filter(function (x) { return x.conto === '11.90'; }).reduce(function (u, x) { return u + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0); }, 0));
    var annuo = r2(crediti * 0.005), tetto = r2(crediti * 0.05), deducibile = r2(Math.max(0, Math.min(annuo, tetto - fondoPrima)));
    var accantonato = r2(X().svalutazioni.filter(function (s) { return s.anno === String(anno); }).reduce(function (t, s) { return t + s.importo; }, 0));
    return {anno: String(anno), crediti: crediti, fondoPrima: fondoPrima, limiteAnnuo: annuo, tetto: tetto, deducibile: deducibile, accantonato: accantonato, eccedenza: r2(Math.max(0, accantonato - deducibile))};
  }
  function svaluta(i) {
    var n = N(), data = n.data(i.data), anno = data.slice(0, 4), l = limiteSvalutazione(anno);
    var imp = num(i.importo, 'Accantonamento €', 0.01, l.deducibile - l.accantonato); if (!(imp > 0.004)) throw Error('Nessun accantonamento da fare: limite fiscale già raggiunto o crediti a zero.');
    var r = n.post({data: data, tipo: 'SVALUTAZIONE_CREDITI', rif: 'SVAL ' + anno, descrizione: 'Svalutazione dei crediti al ' + L.fd(data) + ': crediti verso clienti ' + L.eur(l.crediti) + ', accantonamento ' + L.eur(imp) + ' (limite fiscale 0,5% = ' + L.eur(l.limiteAnnuo) + (imp > l.deducibile + 0.004 ? '; l\'eccedenza ' + L.eur(r2(imp - l.deducibile)) + ' non è deducibile IRES' : '') + '; mai deducibile IRAP)',
      righe: [{conto: '89', dareAvere: 'DARE', importo: imp, testo: 'accantonamento rischi su crediti'}, {conto: '11.90', dareAvere: 'AVERE', importo: imp, testo: 'fondo svalutazione crediti'}]});
    X().svalutazioni.push({anno: anno, data: data, importo: imp, crediti: l.crediti, contabile: r.numero}); n.salva(); return r;
  }
  function crediteInesigibili(alla) {
    var p = window.TS4.partite('cliente', null, alla).filter(function (x) { return x.doc !== 'acconto' && x.aperto > 0.004; }).map(function (x) { return {id: 'F:' + x.doc + ':' + x.partner, doc: x.doc, partner: x.partner, nome: x.nome, aperto: x.aperto, conto: '11', etichetta: 'fattura ' + x.doc}; });
    X().cambiali.filter(function (c) { return c.verso === 'attiva' && c.stato === 'insoluta' && !c.perduta; }).forEach(function (c) { p.push({id: 'C:' + c.numero, doc: c.numero, partner: c.partner, nome: c.nome, aperto: c.insoluto, conto: '11.20', etichetta: 'cambiale insoluta ' + c.numero}); });
    return p;
  }
  function perdita(i) {
    var n = N(), data = n.data(i.data), cr = crediteInesigibili(data).find(function (x) { return x.id === String(i.credito); }); if (!cr) throw Error('Scegli un credito aperto.');
    var motivo = String(i.motivo || '').trim() || 'credito inesigibile', fondo = r2(-saldoAl('11.90', data)), usa = r2(Math.min(Math.max(0, fondo), cr.aperto)), perd = r2(cr.aperto - usa);
    var riga = {conto: cr.conto, dareAvere: 'AVERE', importo: cr.aperto, partner: cr.partner, testo: cr.etichetta + ' stralciata'}; if (cr.conto === '11') riga.pareggio = cr.doc;
    var r = n.post({data: data, tipo: 'PERDITA_SU_CREDITI', rif: 'PERD ' + cr.doc, descrizione: 'Stralcio del credito verso ' + cr.nome + ' (' + cr.etichetta + ', ' + L.eur(cr.aperto) + '): ' + motivo + '. Si usa prima il fondo svalutazione (' + L.eur(usa) + '), il resto è perdita su crediti (' + L.eur(perd) + ')',
      righe: [{conto: '11.90', dareAvere: 'DARE', importo: usa, testo: 'utilizzo del fondo'}, {conto: '62', dareAvere: 'DARE', importo: perd, testo: 'perdita su crediti'}, riga]});
    if (cr.conto === '11.20') cambiale(cr.doc).perduta = data;
    X().perdite.push({credito: cr.id, nome: cr.nome, importo: cr.aperto, fondo: usa, perdita: perd, data: data, motivo: motivo, contabile: r.numero}); n.salva(); return r;
  }

  // ═════════════════════════ INTRACOMUNITARI ═════════════════════════
  var ue = function (a) { return !!(a && a.ue); };
  function acquistoIntra(i) {
    var n = N(), data = n.data(i.data), f = n.fornitore(i.fornitore); if (!ue(f)) throw Error(f.nome + ' non è un fornitore di un altro Paese UE.');
    var conto = String(i.conto || '54'), pc = S().pianoDeiConti.find(function (c) { return c.codice === conto; }); if (!pc || pc.tipo !== 'COSTO') throw Error('Scegli un conto di costo.');
    var rif = String(i.rif || '').trim(); if (!rif) throw Error('Scrivi il numero della fattura del fornitore.');
    var imp = L.num(i.imponibile, 'Imponibile', 0.01), ivaP = num(i.iva, 'Aliquota IVA italiana %', 0, 22), iva = r2(imp * ivaP / 100), scad = i.scadenza ? L.dataOk(i.scadenza) : '';
    var riga = {conto: '20', dareAvere: 'AVERE', importo: imp, partner: i.fornitore, testo: 'fattura ' + rif}; if (scad) riga.scadenza = scad;
    var r = n.post({data: data, tipo: 'ACQUISTO_INTRA', rif: rif, descrizione: 'Acquisto intracomunitario: fattura ' + rif + ' di ' + f.nome + ' (' + f.paese + ', senza IVA) ' + L.eur(imp) + ' — integrazione TD18 con IVA ' + ivaP + '% ' + L.eur(iva) + ' a debito e a credito (reverse charge); va negli elenchi Intrastat acquisti',
      righe: [{conto: conto, dareAvere: 'DARE', importo: imp, testo: String(i.testo || pc.nome)}, {conto: '14', dareAvere: 'DARE', importo: iva, testo: 'IVA integrata TD18'}, riga, {conto: '21', dareAvere: 'AVERE', importo: iva, testo: 'IVA integrata TD18'}]});
    X().intra.push({verso: 'acquisto', partner: i.fornitore, nome: f.nome, paese: f.paese, rif: rif, data: data, imponibile: imp, iva: iva, contabile: r.numero}); n.salva(); return r;
  }
  function cessioneIntra(i) {
    var n = N(), data = n.data(i.data), c = n.cliente(i.cliente); if (!ue(c)) throw Error(c.nome + ' non è un cliente di un altro Paese UE.');
    if (!c.partitaIvaUe) throw Error('Serve la partita IVA comunitaria del cliente (verificata su VIES).');
    var imp = L.num(i.imponibile, 'Imponibile', 0.01), numero = n.numero('fattura'), scad = i.scadenza ? L.dataOk(i.scadenza) : '', testo = String(i.testo || '').trim() || 'cessione di beni';
    var riga = {conto: '11', dareAvere: 'DARE', importo: imp, partner: i.cliente, testo: 'fattura ' + numero}; if (scad) riga.scadenza = scad;
    var r = n.post({data: data, tipo: 'FATTURA_INTRA', rif: numero, descrizione: 'Fattura ' + numero + ' a ' + c.nome + ' (' + c.paese + ', VIES ' + c.partitaIvaUe + '): ' + testo + ' ' + L.eur(imp) + ' — non imponibile art. 41 DL 331/93, nessun bollo; va negli elenchi Intrastat cessioni',
      righe: [riga, {conto: '40', dareAvere: 'AVERE', importo: imp, testo: testo + ' (art. 41)'}]});
    X().intra.push({verso: 'cessione', partner: i.cliente, nome: c.nome, paese: c.paese, rif: numero, data: data, imponibile: imp, iva: 0, contabile: r.numero}); n.salva(); return r;
  }
  function intrastat(mese) { return X().intra.filter(function (x) { return x.data.slice(0, 7) === mese; }); }

  // ── riepilogo per le imposte: variazioni automatiche (chiusura → imposte) ──
  function variazioniFiscali(anno) {
    var al = anno + '-12-31', dal = anno + '-01-01', voce = function (c) { return r2(S().registrazioni.filter(function (r) { return r.data >= dal && r.data <= al && !r.chiusura; }).reduce(function (t, r) { return t + r.righe.filter(function (x) { return x.conto === c; }).reduce(function (u, x) { return u + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0); }, 0)); };
    var sv = X().svalutazioni.some(function (s) { return s.anno === String(anno); }) ? limiteSvalutazione(anno).eccedenza : 0;
    return {ires: sv ? [['Svalutazione crediti oltre lo 0,5% (art. 106 TUIR)', sv]] : [], irap: [['Svalutazione e perdite su crediti (non deducibili IRAP)', r2(voce('89') + voce('62'))]].filter(function (v) { return Math.abs(v[1]) > 0.004; })};
  }

  return {X: X, ALIQ_BOLLO: ALIQ_BOLLO, bolloCambiale: bolloCambiale, partiteClienti: partiteClienti, partiteFornitori: partiteFornitori, impegnataInCambiale: impegnataInCambiale,
    riceviCambiale: riceviCambiale, scontaCambiale: scontaCambiale, incassaCambiale: incassaCambiale, insolutaCambiale: insolutaCambiale, emettiCambialePassiva: emettiCambialePassiva, pagaCambialePassiva: pagaCambialePassiva,
    emettiAssegno: emettiAssegno, addebitaAssegno: addebitaAssegno, riceviAssegno: riceviAssegno, versaAssegni: versaAssegni,
    calcolaMutuo: calcolaMutuo, accendiMutuo: accendiMutuo, pagaRata: pagaRata, prossimaRata: prossimaRata, residuo: residuo, scadenzeDebito: scadenzeDebito, interessiMaturati: interessiMaturati, rateoMutuo: rateoMutuo,
    contrattoLeasing: contrattoLeasing, pagaCanone: pagaCanone, riscontoMaxicanone: riscontoMaxicanone, riscatta: riscatta, finanziario: finanziario,
    registraParcella: registraParcella, pagaParcella: pagaParcella, versaRitenute: versaRitenute, ritenuteDelMese: ritenuteDelMese, scadenzaF24: scadenzaF24,
    trimestre: trimestre, fattureConBollo: fattureConBollo, riepilogoBolli: riepilogoBolli, versaBolloVirtuale: versaBolloVirtuale,
    limiteSvalutazione: limiteSvalutazione, svaluta: svaluta, crediteInesigibili: crediteInesigibili, perdita: perdita,
    acquistoIntra: acquistoIntra, cessioneIntra: cessioneIntra, intrastat: intrastat, variazioniFiscali: variazioniFiscali, piuMesi: piuMesi};
})();
