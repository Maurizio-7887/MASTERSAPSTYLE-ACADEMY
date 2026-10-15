/* MASTERSAPSTYLE Academy — SISTEMA INTEGRATO S/4: nucleo comune a tutti i moduli (SD, CO-PA e i successivi).
   Una sola società (1000 Ferro & Transenne S.r.l.), un solo libro giornale, documenti numerati per tipo come in SAP,
   flusso documenti (VA03 → VL03N → VF03 → FB03). I moduli aggiungono funzioni a window.S4.
   Stato salvato nello slot «erp-ft» del portale (stessa sincronia del simulatore). */
(function () {
  'use strict';
  var L = window.LabMotore;          // formattazione e componenti di interfaccia comuni
  var r2 = L.r2;

  var CONTI = [
    ['10', 'Banca c/c', 'ATTIVO'], ['11', 'Crediti verso clienti', 'ATTIVO'], ['13', 'Magazzino prodotti finiti', 'ATTIVO'],
    ['19', 'Acconti da clienti (CoGe speciale A)', 'PASSIVO'], ['21', 'IVA a debito', 'PASSIVO'], ['26', 'Debiti verso agenti (provvigioni maturate)', 'PASSIVO'],
    ['30', 'Capitale e riserve', 'PASSIVO'],
    ['40', 'Ricavi di vendita (prezzo lordo PR00)', 'RICAVO'], ['47', 'Sconti su vendite (K007, ZSCA)', 'RICAVO'], ['48', 'Ricavi per trasporti addebitati (KF00)', 'RICAVO'],
    ['49', 'Resi e abbuoni su vendite', 'RICAVO'], ['41', 'Costo del venduto a standard (VPRS)', 'COSTO'], ['57', 'Provvigioni passive', 'COSTO'],
  ];
  var MATERIALI = {
    'TR-STD': {nome: 'Transenna standard', std: 31.40}, 'TR-ALTA': {nome: 'Transenna alta (prolunga)', std: 36.10}, 'TR-PED': {nome: 'Transenna pedonale (base)', std: 29.55},
  };
  var CLIENTI = {
    'C100': {nome: 'Beta Costruzioni Srl', regione: 'Umbria', canale: '10 Imprese edili', gruppo: 'Imprese', pagamento: '30 gg'},
    'C200': {nome: 'Delta Noleggi Srl', regione: 'Toscana', canale: '20 Noleggio', gruppo: 'Noleggiatori', pagamento: '30 gg'},
    'C300': {nome: 'Comune di Gamma', regione: 'Umbria', canale: '30 Enti pubblici', gruppo: 'Enti pubblici', pagamento: '60 gg'},
    'C400': {nome: 'Edil Sigma Srl', regione: 'Lazio', canale: '10 Imprese edili', gruppo: 'Imprese', pagamento: 'acconto + 30 gg'},
  };
  // intervalli di numerazione come in SAP
  var NUMERI = {ordine: 10000000, consegna: 80000000, fattura: 90000000, contabile: 100000000, reso: 60000000, richiesta: 70000000};

  function statoNuovo() {
    return {lab: 'erp', versioneErp: 1, societa: '1000 Ferro & Transenne S.r.l.', areaVendite: '1000 / 10 / 00',
      pianoDeiConti: CONTI.map(function (c) { return {codice: c[0], nome: c[1], tipo: c[2]}; }),
      registrazioni: [], prossimoIdRegistrazione: 1, numeri: JSON.parse(JSON.stringify(NUMERI)),
      materiali: JSON.parse(JSON.stringify(MATERIALI)), clienti: JSON.parse(JSON.stringify(CLIENTI)),
      giacenze: {'TR-STD': 0, 'TR-ALTA': 0, 'TR-PED': 0}, movimenti: [],
      condizioni: [], ordini: [], consegne: [], fatture: [], acconti: [], copa: [], partite: [], avviato: false};
  }

  function crea(chiave) {
    var S = null;
    try { S = JSON.parse(localStorage.getItem(chiave) || 'null'); } catch (e) { S = null; }
    if (!S || S.lab !== 'erp') S = statoNuovo();
    var N = {
      get S() { return S; },
      salva: function () { try { localStorage.setItem(chiave, JSON.stringify(S)); } catch (e) { throw Error('Memoria del browser piena.'); } },
      azzera: function () { S = statoNuovo(); N.salva(); return S; },
      numero: function (tipo) { return String(++S.numeri[tipo]); },
      data: function (d) { L.dataOk(d); if (!S.avviato) throw Error('Prima avvia il sistema (Dati di base → Avvia).'); if (d < S.avviato) throw Error('Data anteriore all\'avvio del sistema (' + L.fd(S.avviato) + ').'); return d; },
      cliente: function (c) { var x = S.clienti[c]; if (!x) throw Error('Cliente ' + c + ' inesistente.'); return x; },
      materiale: function (m) { var x = S.materiali[m]; if (!x) throw Error('Materiale ' + m + ' inesistente.'); return x; },
      // registrazione contabile (FB03): righe Dare/Avere, quadratura obbligatoria
      post: function (reg) {
        var d = 0, a = 0;
        var righe = reg.righe.filter(function (x) { return Math.abs(x.importo) >= 0.005; }).map(function (x) {
          var imp = r2(x.importo), segno = x.dareAvere;
          if (imp < 0) { imp = -imp; segno = segno === 'DARE' ? 'AVERE' : 'DARE'; }
          if (segno === 'DARE') d += imp; else a += imp;
          return {conto: x.conto, dareAvere: segno, importo: imp, partner: x.partner || '', testo: x.testo || ''};
        });
        if (!righe.length) return null;
        if (Math.abs(r2(d) - r2(a)) > 0.001) throw Error('Documento non quadrato: Dare ' + L.eur(d) + ' ≠ Avere ' + L.eur(a));
        var r = {id: S.prossimoIdRegistrazione++, numero: N.numero('contabile'), data: reg.data, tipo: reg.tipo, descrizione: reg.descrizione, righe: righe, rif: reg.rif || ''};
        S.registrazioni.push(r);
        return r;
      },
      movimento: function (mat, qta, data, tipo, rif) {
        if ((S.giacenze[mat] || 0) + qta < -1e-9) throw Error('Giacenza insufficiente di ' + mat + ': disponibili ' + L.n0(S.giacenze[mat]) + ' pz.');
        S.giacenze[mat] = r2((S.giacenze[mat] || 0) + qta);
        S.movimenti.push({data: data, mat: mat, qta: qta, tipo: tipo, rif: rif});
      },
      saldo: function (conto, partner) {
        return r2(S.registrazioni.reduce(function (t, r) { return t + r.righe.filter(function (x) { return x.conto === conto && (!partner || x.partner === partner); })
          .reduce(function (u, x) { return u + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0); }, 0));
      },
      // avvio: saldi di apertura (banca e magazzino prodotti finiti a costo standard)
      avvia: function (i) {
        if (S.avviato) throw Error('Sistema già avviato il ' + L.fd(S.avviato) + '. Per ripartire usa «Azzera».');
        var data = L.dataOk(i.data);
        var stock = {'TR-STD': 500, 'TR-ALTA': 200, 'TR-PED': 300};
        S.avviato = data;
        var val = 0;
        Object.keys(stock).forEach(function (m) { N.movimento(m, stock[m], data, '561', 'APERTURA'); val += stock[m] * S.materiali[m].std; });
        var r = N.post({data: data, tipo: 'APERTURA', descrizione: 'Saldi di apertura: banca e magazzino prodotti finiti (561)',
          righe: [{conto: '10', dareAvere: 'DARE', importo: 50000}, {conto: '13', dareAvere: 'DARE', importo: val}, {conto: '30', dareAvere: 'AVERE', importo: 50000 + val}]});
        if (window.S4 && window.S4.dopoAvvio) window.S4.dopoAvvio.forEach(function (f) { f(N); });
        N.salva(); return r;
      },
    };
    window.MSA_STATO_CORRENTE = function () { return S; };
    window.MSA_SALVA_STATO_CORRENTE = function () { N.salva(); };
    return N;
  }
  window.S4 = window.S4 || {};
  window.S4.dopoAvvio = window.S4.dopoAvvio || [];
  window.S4.crea = crea;
  window.S4.statoNuovo = statoNuovo;
})();
