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
    // dalla tappa CO-PC: acquisti, produzione, costi del prodotto, Material Ledger
    ['12', 'Magazzino ferro (materie prime)', 'ATTIVO'], ['14', 'IVA a credito', 'ATTIVO'], ['20', 'Debiti verso fornitori', 'PASSIVO'],
    ['22', 'Fatture da ricevere (conto WE/RE)', 'PASSIVO'], ['42', 'Differenze di prezzo sul venduto (Material Ledger)', 'COSTO'],
    ['61', 'Varianze di produzione (liquidazione ordini)', 'COSTO'], ['63', 'Differenze prezzo materiali (PRD)', 'COSTO'],
    ['64', 'Rivalutazione magazzino per nuovo costo standard', 'RICAVO'], ['70', 'Consumi di materie prime', 'COSTO'],
    ['72', 'Attività addebitate agli ordini (costi secondari)', 'COSTO'], ['78', 'Sovraccosti addebitati agli ordini', 'COSTO'],
    ['73', 'Output di produzione (accredito ordini)', 'RICAVO'], ['75', 'Attività accreditate dai centri di costo', 'RICAVO'],
    ['76', 'Sovraccosti accreditati ai centri di costo', 'RICAVO'],
    // dalla tappa WMS
    ['65', 'Differenze inventariali di magazzino', 'COSTO'],
    // tesoreria, valute, paghe
    ['18', 'Banca c/transito pagamenti (F110)', 'ATTIVO'], ['16', 'Rettifiche di valutazione su partite in valuta', 'ATTIVO'],
    ['24', 'Debiti verso INAIL', 'PASSIVO'], ['27', 'Debiti verso dipendenti (retribuzioni nette)', 'PASSIVO'], ['28', 'Debiti verso INPS', 'PASSIVO'],
    ['29', 'Erario c/ritenute (IRPEF e addizionali)', 'PASSIVO'], ['31', 'Fondo TFR', 'PASSIVO'],
    ['44', 'Ricavi per servizi', 'RICAVO'], ['54', 'Consulenze e servizi', 'COSTO'], ['58', 'Commissioni e spese bancarie', 'COSTO'], ['59', 'Interessi attivi bancari', 'RICAVO'],
    ['66', 'Utili su cambi', 'RICAVO'], ['67', 'Perdite su cambi', 'COSTO'], ['68', 'Differenze cambio da valutazione', 'COSTO'],
    // cespiti, RiBa, factoring, IVA, imposte, chiusura e riapertura
    ['01', 'Impianti e macchinari', 'ATTIVO'], ['02', 'Fondo ammortamento impianti e macchinari', 'ATTIVO'],
    ['03', 'Mezzi di movimentazione interna', 'ATTIVO'], ['04', 'Fondo ammortamento mezzi di movimentazione', 'ATTIVO'],
    ['15', 'Crediti verso factor', 'ATTIVO'], ['23', 'Erario c/IRES', 'PASSIVO'], ['25', 'Erario c/IVA', 'PASSIVO'],
    ['32', 'Utile (perdita) d\'esercizio', 'PASSIVO'], ['17', 'Crediti per imposte anticipate', 'ATTIVO'], ['35', 'Erario c/IRAP', 'PASSIVO'], ['52', 'IRAP corrente', 'COSTO'], ['51', 'Imposte anticipate (−) e differite (+)', 'COSTO'], ['33', 'Riserva legale', 'PASSIVO'],
    ['36', 'Banca c/anticipi salvo buon fine (RiBa)', 'PASSIVO'], ['37', 'Debiti verso factor (pro solvendo)', 'PASSIVO'],
    ['45', 'Plusvalenze da cessione cespiti', 'RICAVO'], ['46', 'Minusvalenze da cessione cespiti', 'COSTO'], ['50', 'Ammortamenti', 'COSTO'],
    ['53', 'Interessi su IVA trimestrale', 'COSTO'], ['55', 'Oneri su cessione crediti (factoring)', 'COSTO'], ['56', 'IRES corrente', 'COSTO'],
    ['90', 'Conto economico (epilogo)', 'CHIUSURA'], ['91', 'Stato patrimoniale finale', 'CHIUSURA'], ['92', 'Stato patrimoniale iniziale', 'CHIUSURA'],
    ['69', 'Rottamazioni e merce danneggiata', 'COSTO'], ['80', 'Salari e stipendi', 'COSTO'], ['81', 'Oneri sociali', 'COSTO'], ['82', 'Trattamento di fine rapporto', 'COSTO'],
  ];
  // distinta (kg di ferro per pezzo, semilavorati come fantasma) e ciclo (ore per pezzo per centro; attrezzaggio fisso per lotto)
  var MATERIALI = {
    'TR-STD': {nome: 'Transenna standard', tipo: 'FERT', um: 'pz', std: 31.40, peso: 12, ferro: 8, ore: {Taglio: 0.25, Piegatura: 0.20, Saldatura: 0.40}, attrezzaggio: 3},
    'TR-ALTA': {nome: 'Transenna alta (prolunga)', tipo: 'FERT', um: 'pz', std: 36.10, peso: 15, ferro: 10, ore: {Taglio: 0.25, Piegatura: 0.20, Saldatura: 0.50}, attrezzaggio: 3, seriale: 'Z001'},
    'TR-PED': {nome: 'Transenna pedonale (base)', tipo: 'FERT', um: 'pz', std: 29.55, peso: 9, ferro: 9, ore: {Taglio: 0.25, Piegatura: 0.20, Saldatura: 0.30}, attrezzaggio: 3},
    'FERRO': {nome: 'Tubo di ferro', tipo: 'ROH', um: 'kg', std: 0.95, peso: 1},
  };
  var FORNITORI = {'F100': {nome: 'Acciaierie Umbre Spa', regione: 'Umbria', pagamento: '60 gg', iban: 'IT60X0542811101000000123456'},
                   'F200': {nome: 'Gamma Steel Engineering LLC', regione: 'USA', pagamento: '30 gg', valuta: 'USD', iban: 'US-ABA 026009593 / 4417 2210'},
                   'F300': {nome: 'Macchine Alfa Srl', regione: 'Emilia-Romagna', pagamento: '30 gg', iban: 'IT40S0306902480100000004567'}};
  var CLIENTI = {
    'C100': {nome: 'Beta Costruzioni Srl', regione: 'Umbria', canale: '10 Imprese edili', gruppo: 'Imprese', pagamento: '30 gg', fido: 60000, rischio: 'B'},
    'C200': {nome: 'Delta Noleggi Srl', regione: 'Toscana', canale: '20 Noleggio', gruppo: 'Noleggiatori', pagamento: '30 gg', fido: 30000, rischio: 'B'},
    'C300': {nome: 'Comune di Gamma', regione: 'Umbria', canale: '30 Enti pubblici', gruppo: 'Enti pubblici', pagamento: '60 gg', fido: 50000, rischio: 'A'},
    'C400': {nome: 'Edil Sigma Srl', regione: 'Lazio', canale: '10 Imprese edili', gruppo: 'Imprese', pagamento: 'acconto + 30 gg', fido: 15000, rischio: 'C'},
    'C600': {nome: 'Usato Epsilon Srl', regione: 'Toscana', canale: '50 Cessioni di beni strumentali', gruppo: 'Diversi', pagamento: '15 gg', fido: 20000, rischio: 'B'},
    'C500': {nome: 'Zeta Barriers Inc.', regione: 'USA', canale: '40 Export', gruppo: 'Estero', pagamento: '30 gg', valuta: 'USD', iban: '', fido: 50000, rischio: 'B'},
  };
  // intervalli di numerazione come in SAP
  var NUMERI = {ordine: 10000000, consegna: 80000000, fattura: 90000000, contabile: 100000000, reso: 60000000, richiesta: 70000000,
    acquisto: 4500000000, materiale: 5000000000, fatturaFornitore: 5105600000, produzione: 1000000,
    compito: 100000, udc: 1000000, inventario: 0, sscc: 0, trasporto: 1000, ddt: 0,
    estratto: 0, pagamento: 0, cedolino: 0, rda: 10000000, seriale: 0, cespite: 0, riba: 0, factoring: 0, fatturaServizi: 0};

  function statoNuovo() {
    return {lab: 'erp', versioneErp: 1, societa: '1000 Ferro & Transenne S.r.l.', areaVendite: '1000 / 10 / 00',
      pianoDeiConti: CONTI.map(function (c) { return {codice: c[0], nome: c[1], tipo: c[2]}; }),
      registrazioni: [], prossimoIdRegistrazione: 1, numeri: JSON.parse(JSON.stringify(NUMERI)),
      materiali: JSON.parse(JSON.stringify(MATERIALI)), clienti: JSON.parse(JSON.stringify(CLIENTI)),
      giacenze: {'TR-STD': 0, 'TR-ALTA': 0, 'TR-PED': 0, 'FERRO': 0}, movimenti: [],
      condizioni: [], ordini: [], consegne: [], fatture: [], acconti: [], copa: [], partite: [], avviato: false,
      fornitori: JSON.parse(JSON.stringify(FORNITORI)), acquisti: [], fattureFornitore: [], produzione: [], mlPD: [],
      costing: {scheda: {sovrMat: 5, sovrProd: 10, tariffa: 28, lotto: 300, confermata: false}, stime: {}, rilasci: [], ml: []}};
  }
  // stati salvati prima di una nuova tappa: si completano senza perdere il lavoro
  function completa(S) {
    var n = statoNuovo();
    CONTI.forEach(function (c) { if (!S.pianoDeiConti.some(function (x) { return x.codice === c[0]; })) S.pianoDeiConti.push({codice: c[0], nome: c[1], tipo: c[2]}); });
    Object.keys(n.numeri).forEach(function (k) { if (S.numeri[k] == null) S.numeri[k] = n.numeri[k]; });
    Object.keys(MATERIALI).forEach(function (m) {
      if (!S.materiali[m]) S.materiali[m] = JSON.parse(JSON.stringify(MATERIALI[m]));
      ['tipo', 'um', 'ferro', 'ore', 'attrezzaggio', 'peso', 'seriale'].forEach(function (k) { if (S.materiali[m][k] == null && MATERIALI[m][k] != null) S.materiali[m][k] = JSON.parse(JSON.stringify(MATERIALI[m][k])); });
      if (S.giacenze[m] == null) S.giacenze[m] = 0;
    });
    ['fornitori', 'acquisti', 'fattureFornitore', 'produzione', 'mlPD', 'costing'].forEach(function (k) { if (!S[k]) S[k] = n[k]; });
    if (!S.seriali) { S.seriali = {}; Object.keys(S.materiali).filter(function (m) { return S.materiali[m].seriale; }).forEach(function (m) {   // numeri di serie attivati su uno stato esistente
      S.seriali[m] = {}; Object.keys((S.lotti || {})[m] || {}).forEach(function (l) { for (var i = 0; i < Math.round(S.lotti[m][l].qta); i++) { var sn = 'SN' + String(++S.numeri.seriale).padStart(6, '0'); S.seriali[m][sn] = {stato: 'magazzino', lotto: l, cliente: '', storia: [{data: S.avviato || '', tipo: '561', rif: 'seriali attivati su uno stato esistente'}]}; } }); }); }
    if (!S.lotti) { S.lotti = {}; Object.keys(S.giacenze).forEach(function (m) { if (S.giacenze[m] > 1e-9) S.lotti[m] = {APERTURA: {qta: S.giacenze[m], data: S.avviato || '', tipo: '561', rif: 'lotti attivati su uno stato esistente', fornitore: '', colata: ''}}; }); }
    Object.keys(n.clienti).forEach(function (k) { if (!S.clienti[k]) S.clienti[k] = n.clienti[k]; else if (S.clienti[k].fido == null) { S.clienti[k].fido = n.clienti[k].fido; S.clienti[k].rischio = n.clienti[k].rischio; } });
    Object.keys(n.fornitori).forEach(function (k) { if (!S.fornitori[k]) S.fornitori[k] = n.fornitori[k]; else if (!S.fornitori[k].iban) S.fornitori[k].iban = n.fornitori[k].iban; });
    return S;
  }

  // Il quiz fotografa solo documenti realmente salvati. Le vecchie scritture
  // diventano la base iniziale, non una raffica di domande retroattive.
  function chiaveRagioneria(r) {
    return JSON.stringify([r.id, r.numero, r.data, r.tipo, r.descrizione,
      (r.righe || []).map(function (x) { return [x.conto, x.dareAvere, x.importo, x.partner || '']; })]);
  }
  function baseRagioneria(S) {
    if (!S.msaRagioneria || S.msaRagioneria.versione !== 1)
      S.msaRagioneria = {versione: 1, visti: (S.registrazioni || []).map(chiaveRagioneria), coda: [], esiti: []};
    return S.msaRagioneria;
  }

  function crea(chiave) {
    var S = null;
    try { S = JSON.parse(localStorage.getItem(chiave) || 'null'); } catch (e) { S = null; }
    if (!S || S.lab !== 'erp') S = statoNuovo(); else completa(S);
    baseRagioneria(S);
    var N = {
      get S() { return S; },
      salva: function () {
        var prima = JSON.parse(JSON.stringify(baseRagioneria(S))), q = S.msaRagioneria;
        var visti = new Set(q.visti), aggiunti = 0;
        (S.registrazioni || []).forEach(function (r) {
          var k = chiaveRagioneria(r);
          if (!visti.has(k)) {
            visti.add(k); q.visti.push(k);
            if (r.quiz === false) return;   // epilogo, chiusura e riapertura dei conti: scritture meccaniche, niente domanda
            q.coda.push({chiave: k, documento: JSON.parse(JSON.stringify(r)), risposte: [], tentativi: 0});
            aggiunti++;
          }
        });
        try { localStorage.setItem(chiave, JSON.stringify(S)); }
        catch (e) { S.msaRagioneria = prima; throw Error('Memoria del browser piena.'); }
        if (aggiunti) window.dispatchEvent(new CustomEvent('msa:registrazioni-salvate'));
      },
      azzera: function () { S = statoNuovo(); baseRagioneria(S); N.salva(); return S; },
      fornitore: function (f) { var x = S.fornitori[f]; if (!x) throw Error('Fornitore ' + f + ' inesistente.'); return x; },
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
          var y = {conto: x.conto, dareAvere: segno, importo: imp, partner: x.partner || '', testo: x.testo || ''};
          if (x.pareggio) y.pareggio = x.pareggio; if (x.valuta) { y.valuta = x.valuta; y.importoValuta = x.importoValuta; } if (x.scadenza) y.scadenza = x.scadenza; if (x.cdc) y.cdc = x.cdc;
          return y;
        });
        if (!righe.length) return null;
        if (Math.abs(r2(d) - r2(a)) > 0.001) throw Error('Documento non quadrato: Dare ' + L.eur(d) + ' ≠ Avere ' + L.eur(a));
        var anno = String(reg.data || '').slice(0, 4);   // esercizio chiuso: niente più scritture con data in quell'anno
        if (S.chiusure && S.chiusure[anno] && !reg.chiusura) throw Error('L\'esercizio ' + anno + ' è chiuso (chiusura del ' + L.fd(S.chiusure[anno].data) + '): non si registra più con data ' + L.fd(reg.data) + '.');
        var r = {id: S.prossimoIdRegistrazione++, numero: N.numero('contabile'), data: reg.data, tipo: reg.tipo, descrizione: reg.descrizione, righe: righe, rif: reg.rif || ''};
        if (reg.quiz === false) r.quiz = false; if (reg.chiusura) r.chiusura = reg.chiusura;
        S.registrazioni.push(r);
        return r;
      },
      // movimento di magazzino, con la gestione dei lotti: in entrata nasce (o si ricarica) un lotto, in uscita si consumano i lotti FIFO
      // (o quelli indicati in opz.lotti, per esempio negli storni). Restituisce il movimento, con i lotti toccati.
      movimento: function (mat, qta, data, tipo, rif, opz) {
        opz = opz || {};
        if ((S.giacenze[mat] || 0) + qta < -1e-9) throw Error('Giacenza insufficiente di ' + mat + ': disponibili ' + L.n0(S.giacenze[mat]) + ' pz.');
        S.giacenze[mat] = r2((S.giacenze[mat] || 0) + qta);
        var lm = (S.lotti = S.lotti || {})[mat] = S.lotti[mat] || {}, tocc = [];
        var carica = function (l, q) { if (!lm[l]) lm[l] = {qta: 0, data: data, tipo: tipo, rif: rif || '', fornitore: opz.fornitore || '', colata: opz.colata || ''}; lm[l].qta = r2(lm[l].qta + q); tocc.push({lotto: l, qta: r2(q)}); };
        if (qta > 0) {
          if (opz.lotti && opz.lotti.length) { var resto = qta; opz.lotti.forEach(function (x) { var q = Math.min(x.qta, resto); if (q > 1e-9) { carica(x.lotto, q); resto = r2(resto - q); } }); if (resto > 1e-9) carica(opz.lotti[0].lotto, resto); }
          else {
            var tipoMat = (S.materiali[mat] || {}).tipo, l = opz.lotto;
            if (!l) l = tipo === '561' ? 'APERTURA' : tipo === '101' && tipoMat === 'ROH' ? 'C' + String(data).replace(/-/g, '').slice(2) + '-' + (Object.keys(lm).length + 1) : tipo === '101' ? 'L' + rif : tipo === '651' ? 'RESO-' + rif : tipo === '712' ? 'INV-' + String(data).replace(/-/g, '') : 'RIENTRO-' + (rif || data);
            carica(String(l).trim().toUpperCase(), qta);
          }
        } else if (qta < 0) {
          var serve = -qta, prendi = function (l, q) { var d = Math.min(q, lm[l] ? lm[l].qta : 0); if (d > 1e-9) { lm[l].qta = r2(lm[l].qta - d); tocc.push({lotto: l, qta: r2(d)}); serve = r2(serve - d); } };
          (opz.lotti || []).forEach(function (x) { prendi(x.lotto, Math.min(x.qta, serve)); });
          Object.keys(lm).filter(function (l) { return lm[l].qta > 1e-9; }).sort(function (a, b) { return lm[a].data < lm[b].data ? -1 : lm[a].data > lm[b].data ? 1 : a < b ? -1 : 1; }).forEach(function (l) { if (serve > 1e-9) prendi(l, serve); });
          if (serve > 1e-9) tocc.push({lotto: 'SENZA LOTTO', qta: r2(serve)});
        }
        var mv = {data: data, mat: mat, qta: qta, tipo: tipo, rif: rif, lotti: tocc};
        if ((S.materiali[mat] || {}).seriale) mv.seriali = N.seriali(mat, qta, data, tipo, rif, tocc, opz);
        S.movimenti.push(mv); return mv;
      },
      // numeri di serie (profilo Z001, IQ03): un numero per pezzo, nasce all'entrata e segue il pezzo fino al cliente.
      // In uscita si prendono i numeri dei lotti consumati, dal più vecchio; negli storni e nei resi tornano in magazzino gli stessi numeri.
      seriali: function (mat, qta, data, tipo, rif, tocc, opz) {
        var sm = (S.seriali = S.seriali || {})[mat] = S.seriali[mat] || {}, presi = [];
        var ordine = (S.ordini || []).find(function (o) { return o.numero === rif; }) || {};
        var STATO = {'601': 'cliente', '261': 'consumato', '102': 'annullato', '711': 'perso'};
        tocc.forEach(function (t) {
          var n = Math.round(t.qta);
          if (qta > 0) {
            var torna = (opz.seriali || []).filter(function (sn) { return sm[sn] && sm[sn].stato !== 'magazzino'; });
            if (!torna.length && (tipo === '602' || tipo === '651' || tipo === '262' || tipo === '712'))
              torna = Object.keys(sm).filter(function (sn) { var x = sm[sn], u = x.storia[x.storia.length - 1];
                return x.stato !== 'magazzino' && (tipo === '602' ? u.rif === rif && x.stato === 'cliente' : tipo === '651' ? x.stato === 'cliente' && x.cliente === ordine.cliente : tipo === '712' ? x.stato === 'perso' : u.rif === rif); }).reverse();
            torna = torna.filter(function (sn) { return presi.indexOf(sn) < 0; }).slice(0, n);
            torna.forEach(function (sn) { sm[sn].stato = 'magazzino'; sm[sn].lotto = t.lotto; sm[sn].storia.push({data: data, tipo: tipo, rif: rif || ''}); presi.push(sn); });
            for (var i = torna.length; i < n; i++) { var sn = 'SN' + String(++S.numeri.seriale).padStart(6, '0'); sm[sn] = {stato: 'magazzino', lotto: t.lotto, cliente: '', storia: [{data: data, tipo: tipo, rif: rif || ''}]}; presi.push(sn); }
          } else {
            var disp = Object.keys(sm).filter(function (sn) { return sm[sn].stato === 'magazzino' && (sm[sn].lotto === t.lotto || t.lotto === 'SENZA LOTTO') && presi.indexOf(sn) < 0; }).sort();
            if (tipo === '102') disp.reverse();
            disp.slice(0, n).forEach(function (sn) { var x = sm[sn]; x.stato = STATO[tipo] || 'uscito'; x.cliente = tipo === '601' ? (ordine.cliente || '') : x.cliente; x.storia.push({data: data, tipo: tipo, rif: rif || ''}); presi.push(sn); });
          }
        });
        return presi;
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
