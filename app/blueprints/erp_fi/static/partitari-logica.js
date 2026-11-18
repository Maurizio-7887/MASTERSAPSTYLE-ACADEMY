/* SISTEMA INTEGRATO — Partitari clienti e fornitori (FBL5N / FBL1N con tutte le partite) e conti di riconciliazione.
   In SAP ogni cliente e ogni fornitore ha nella sua anagrafica un «conto di riconciliazione» della contabilità generale:
   qui 11 Crediti verso clienti e 20 Debiti verso fornitori. Ogni riga registrata sul partitario di un cliente (o di un fornitore)
   finisce anche sul suo conto di riconciliazione, quindi in ogni momento: saldo del conto 11 = somma dei partitari dei clienti,
   saldo del conto 20 = somma dei partitari dei fornitori. Il partitario NON è una seconda contabilità: legge lo stesso libro giornale.
   Le scritture di chiusura e riapertura (riporto dei saldi) non sono movimenti dei partitari: si escludono da entrambi i lati. */
window.PT4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var CONTI_RIC = {
    '11': {lato: 'cliente', nome: 'Crediti verso clienti', partitario: 'Partitario clienti', tcode: 'FBL5N'},
    '20': {lato: 'fornitore', nome: 'Debiti verso fornitori', partitario: 'Partitario fornitori', tcode: 'FBL1N'}
  };
  var contoDi = function (lato) { return lato === 'cliente' ? '11' : '20'; };
  var segnoPartita = function (lato) { return lato === 'cliente' ? 'DARE' : 'AVERE'; };   // la fattura: cliente in Dare, fornitore in Avere
  function anagrafiche(lato) {
    var a = (lato === 'cliente' ? S().clienti : S().fornitori) || {};
    return Object.keys(a).sort().map(function (k) { return {codice: k, nome: a[k].nome || k, contoRic: contoDi(lato), lato: lato}; });
  }
  function nome(lato, p) { var a = ((lato === 'cliente' ? S().clienti : S().fornitori) || {})[p]; return a ? (a.nome || p) : ''; }
  var eRic = function (conto) { return Object.prototype.hasOwnProperty.call(CONTI_RIC, String(conto)); };
  var valido = function (r) { return r && !r.chiusura; };
  // tutti i movimenti di un partner, con saldo progressivo e stato della partita (aperta / pareggiata / storno)
  function movimenti(lato, partner, opz) {
    opz = opz || {};
    var conto = contoDi(lato), regs = opz.registrazioni || S().registrazioni, al = opz.al || '', dal = opz.dal || '';
    var aperte = {};
    if (window.TS4 && window.TS4.partite) window.TS4.partite(lato, partner, al || undefined).forEach(function (v) { if (v.id) aperte[v.id] = v; });
    var righe = [], saldoIniziale = 0, saldo = 0;
    regs.map(function (r, i) { return {r: r, i: i}; }).filter(function (v) { return valido(v.r) && (!al || v.r.data <= al); })
      .sort(function (a, b) { return String(a.r.data).localeCompare(String(b.r.data)) || a.i - b.i; })
      .forEach(function (v) {
        var r = v.r;
        r.righe.forEach(function (x, k) {
          if (String(x.conto) !== conto || x.partner !== partner) return;
          var imp = (x.dareAvere === 'DARE' ? 1 : -1) * x.importo;
          if (dal && r.data < dal) { saldoIniziale = r2(saldoIniziale + imp); saldo = saldoIniziale; return; }
          saldo = r2(saldo + imp);
          var id = r.numero + '/' + k, stato, residuo = 0, scadenza = '';
          if (r.stornoDi) stato = 'storno';
          else if (r.stornato) stato = 'stornata';
          else if (x.dareAvere === segnoPartita(lato)) {
            if (aperte[id]) { stato = 'aperta'; residuo = aperte[id].aperto; scadenza = aperte[id].scadenza || ''; }
            else stato = 'pareggiata';
          } else stato = /INCASSO|PAGAMENTO|F24|ASSEGNO|CAMBIAL/.test(String(r.tipo)) ? (lato === 'cliente' ? 'incasso' : 'pagamento') : 'rettifica';
          righe.push({data: r.data, numero: r.numero, tipo: r.tipo, rif: r.rif || '', descrizione: r.descrizione || '', testo: x.testo || '',
            dareAvere: x.dareAvere, importo: x.importo, saldo: saldo, stato: stato, residuo: residuo, scadenza: scadenza, id: id});
        });
      });
    if (opz.stato === 'aperte') righe = righe.filter(function (m) { return m.stato === 'aperta'; });
    else if (opz.stato === 'pareggiate') righe = righe.filter(function (m) { return m.stato !== 'aperta'; });
    return {lato: lato, partner: partner, nome: nome(lato, partner), conto: conto, saldoIniziale: saldoIniziale, saldoFinale: saldo, righe: righe};
  }
  // elenco di tutti i clienti (o fornitori) con saldo, movimenti e partite aperte
  function elenco(lato, opz) {
    opz = opz || {};
    return anagrafiche(lato).map(function (a) {
      var m = movimenti(lato, a.codice, {al: opz.al, registrazioni: opz.registrazioni});
      var ap = m.righe.filter(function (x) { return x.stato === 'aperta'; });
      return {codice: a.codice, nome: a.nome, contoRic: a.contoRic, movimenti: m.righe.length, saldo: m.saldoFinale,
        aperte: ap.length, importoAperto: r2(ap.reduce(function (t, x) { return t + x.residuo; }, 0))};
    });
  }
  // riconciliazione: saldo del conto di riconciliazione (mastro) contro somma dei partitari, alla data
  function riconcilia(al, opz) {
    opz = opz || {};
    var regs = opz.registrazioni || S().registrazioni;
    return Object.keys(CONTI_RIC).map(function (conto) {
      var info = CONTI_RIC[conto], lato = info.lato, anag = (lato === 'cliente' ? S().clienti : S().fornitori) || {};
      var mastro = 0, perPartner = {}, senzaPartner = [], sconosciuti = [];
      regs.forEach(function (r) {
        if (!valido(r) || (al && r.data > al)) return;
        r.righe.forEach(function (x) {
          if (String(x.conto) !== conto) return;
          var v = (x.dareAvere === 'DARE' ? 1 : -1) * x.importo;
          mastro = r2(mastro + v);
          var riga = {numero: r.numero, data: r.data, tipo: r.tipo, descrizione: r.descrizione || '', dareAvere: x.dareAvere, importo: x.importo, partner: x.partner || ''};
          if (!x.partner) senzaPartner.push(riga);
          else if (!anag[x.partner]) sconosciuti.push(riga);
          else perPartner[x.partner] = r2((perPartner[x.partner] || 0) + v);
        });
      });
      var somma = r2(Object.keys(perPartner).reduce(function (t, k) { return t + perPartner[k]; }, 0));
      var diff = r2(mastro - somma);
      return {conto: conto, nome: info.nome, lato: lato, partitario: info.partitario, tcode: info.tcode, saldoMastro: mastro, sommaPartitari: somma, differenza: diff,
        partner: Object.keys(perPartner).sort().map(function (k) { return {codice: k, nome: anag[k].nome || k, saldo: perPartner[k]}; }),
        senzaPartner: senzaPartner, sconosciuti: sconosciuti, ok: Math.abs(diff) < 0.005 && !senzaPartner.length && !sconosciuti.length};
    });
  }
  // la riconciliazione eseguita resta nello stato: la guida la riconosce e il docente la vede
  function eseguiRiconciliazione(al) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(al || ''))) throw Error('Scegli la data alla quale riconciliare.');
    var esito = riconcilia(al), s = S();
    s.fiRiconciliazioni = s.fiRiconciliazioni || [];
    var rec = {data: al, eseguita: new Date().toISOString(), ok: esito.every(function (x) { return x.ok; }),
      conti: esito.map(function (x) { return {conto: x.conto, mastro: x.saldoMastro, partitari: x.sommaPartitari, differenza: x.differenza, ok: x.ok}; })};
    s.fiRiconciliazioni.push(rec);
    if (s.fiRiconciliazioni.length > 50) s.fiRiconciliazioni = s.fiRiconciliazioni.slice(-50);
    N().salva();
    return {registro: rec, esito: esito};
  }
  // interrogazione di un partitario: la guida spunta il passo quando l'allievo apre la scheda giusta
  function annotaInterrogazione(lato, partner) {
    if (!partner) return;
    var s = S(); s.fiInterrogazioni = s.fiInterrogazioni || [];
    var ultima = s.fiInterrogazioni[s.fiInterrogazioni.length - 1];
    if (ultima && ultima.lato === lato && ultima.partner === partner) return;
    s.fiInterrogazioni.push({lato: lato, partner: partner, quando: new Date().toISOString()});
    if (s.fiInterrogazioni.length > 100) s.fiInterrogazioni = s.fiInterrogazioni.slice(-100);
    try { N().salva(); } catch (e) { /* consultazione: il salvataggio non è indispensabile */ }
  }
  // prima nota libera: sui conti di riconciliazione serve il cliente o il fornitore (come la chiave di registrazione in SAP)
  function controllaRigaLibera(riga) {
    var info = CONTI_RIC[String(riga.conto)];
    if (!info) return;
    if (!riga.partner) throw Error('Il conto ' + riga.conto + ' ' + info.nome + ' è un CONTO DI RICONCILIAZIONE: non si registra «da solo». Scegli nella colonna «Cliente / Fornitore» il ' + info.lato + ' a cui appartiene la riga, così il movimento va anche sul suo partitario (' + info.tcode + ').');
    var anag = (info.lato === 'cliente' ? S().clienti : S().fornitori) || {};
    if (!anag[riga.partner]) throw Error('Sul conto ' + riga.conto + ' serve un ' + info.lato + ': ' + riga.partner + ' non è nell\'anagrafica dei ' + (info.lato === 'cliente' ? 'clienti' : 'fornitori') + '.');
  }
  return {CONTI_RIC: CONTI_RIC, contoDi: contoDi, eRic: eRic, anagrafiche: anagrafiche, movimenti: movimenti, elenco: elenco,
    riconcilia: riconcilia, eseguiRiconciliazione: eseguiRiconciliazione, annotaInterrogazione: annotaInterrogazione, controllaRigaLibera: controllaRigaLibera};
})();
