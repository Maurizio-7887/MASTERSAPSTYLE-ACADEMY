/* SISTEMA INTEGRATO — Paghe in logica SAP HCM / Payroll Italia: anagrafica (PA30), calcolo del cedolino (PC00_M15_CALC),
   cedolino (PC00_M15_CEDT), registrazione in contabilità (PC00_M99_CIPE) con centri di costo, pagamento dei netti e F24.
   Parametri DIDATTICI e modificabili: IRPEF 2026 (23% fino a 28.000 · 33% fino a 50.000 · 43% oltre), detrazioni lavoro dipendente
   (art. 13 TUIR), cuneo fiscale semplificato, INPS 9,19% dipendente, contributi ditta e INAIL indicativi, TFR = retribuzione / 13,5
   meno 0,50% di contributo aggiuntivo. Metodo mensile: imposta sull'imponibile annualizzato ÷ 12; a dicembre tredicesima (tassata ad aliquota marginale)
   e conguaglio IRPEF di fine anno sull'imponibile reale dell'anno. Ratei di 13ª, ferie (26 gg/anno) e permessi ROL (72 h/anno) maturano ogni mese.
   Addizionali IRPEF come nella realtà: la regionale (Toscana, a scaglioni) e la comunale (Firenze 0,20%, esente fino a 25.000 €) dell'anno si calcolano
   al conguaglio di dicembre sull'imponibile IRPEF dell'anno (solo se l'IRPEF è dovuta) e si trattengono L'ANNO DOPO: saldo regionale e comunale in 11 rate
   da gennaio a novembre (codici F24 3802 e 3848), acconto comunale del 30% in 9 rate da marzo a novembre (3847). A dicembre nessuna rata.
   Chi è assunto durante l'anno non ha addizionali da trattenere in quell'anno; per chi era già in forza prima dell'avvio del sistema la rata mensile
   dell'anno precedente è quella dell'anagrafica (storico).
   I mesi dell'anno elaborati prima dell'avvio delle paghe nel sistema entrano nei progressivi come «storico» (paga base, senza variabili). */
window.PY4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var PARAMETRI = {inpsDip: 9.19, inpsDitta: 29.58, inail: 1.50, tfrDivisore: 13.5, tfrContributo: 0.50, mensilita: 13, oreMese: 173, maggStraord: 25, ferieAnno: 26, rolAnno: 72,
    scaglioni: [[28000, 23], [50000, 33], [1e12, 43]], regione: 'Toscana', addRegionale: [[15000, 1.42], [28000, 1.43], [50000, 3.32], [1e12, 3.33]], comune: 'Firenze', addComunale: 0.20, esenzioneComunale: 25000, accontoComunale: 30};
  var DIPENDENTI = [
    {matricola: '00001', nome: 'Marco Rossi', mansione: 'Magazziniere carrellista', livello: 'C2 (CCNL metalmeccanico, didattico)', cdc: '4100', cdcNome: 'Magazzino', lordo: 2100.00, addizionali: 28.00, tempo: 'indeterminato', ferieAP: 6, rolAP: 12},
    {matricola: '00002', nome: 'Sara Bianchi', mansione: 'Saldatrice', livello: 'C3 (CCNL metalmeccanico, didattico)', cdc: '4200', cdcNome: 'Produzione', lordo: 2250.00, addizionali: 30.00, tempo: 'indeterminato', ferieAP: 3, rolAP: 8},
    {matricola: '00003', nome: 'Giulia Verdi', mansione: 'Impiegata amministrativa', livello: 'C3 (CCNL metalmeccanico, didattico)', cdc: '4300', cdcNome: 'Amministrazione', lordo: 2600.00, addizionali: 38.00, tempo: 'indeterminato', ferieAP: 8, rolAP: 20}];
  var H = function () { var s = S(); if (!s.hr) s.hr = {parametri: JSON.parse(JSON.stringify(PARAMETRI)), dipendenti: JSON.parse(JSON.stringify(DIPENDENTI)), presenze: {}, cedolini: [], registrati: []}; return s.hr; };
  (function () { var vecchio = H; H = function () { var h = vecchio(); if (h.parametri.ferieAnno == null) { h.parametri.ferieAnno = 26; h.parametri.rolAnno = 72; }
    ['regione', 'addRegionale', 'comune', 'addComunale', 'esenzioneComunale', 'accontoComunale'].forEach(function (k) { if (h.parametri[k] == null) h.parametri[k] = JSON.parse(JSON.stringify(PARAMETRI[k])); });
    h.dipendenti.forEach(function (d) { var x = DIPENDENTI.find(function (y) { return y.matricola === d.matricola; }) || {}; if (d.ferieAP == null) { d.ferieAP = x.ferieAP || 0; d.rolAP = x.rolAP || 0; } }); return h; }; })();
  // azienda nuova: i tre dipendenti sono assunti il giorno della costituzione (niente mesi precedenti, niente ferie arretrate)
  window.S4.dopoAvvio.push(function (n, i) {
    if (!i || i.modo !== 'costituzione') return;
    H().dipendenti.forEach(function (d) { d.assunzione = n.S.avviato; d.ferieAP = 0; d.rolAP = 0; d.addizionali = 0; });
  });
  // primo mese di lavoro nell'anno (1 = gennaio): per chi è assunto durante l'anno, il mese di assunzione
  var primoMese = function (d, anno) { var a = d.assunzione; if (!a || +a.slice(0, 4) < +anno) return 1; if (+a.slice(0, 4) > +anno) return 13; return +a.slice(5, 7); };
  var dip = function (m) { var d = H().dipendenti.find(function (x) { return x.matricola === String(m); }); if (!d) throw Error('Matricola ' + m + ' inesistente.'); return d; };
  function irpefAnnua(r) { var t = 0, prima = 0; H().parametri.scaglioni.forEach(function (s) { if (r > prima) { t += (Math.min(r, s[0]) - prima) * s[1] / 100; } prima = s[0]; }); return t; }
  function detrazione(r) {   // art. 13 c. 1 TUIR
    var d = r <= 15000 ? 1955 : r <= 28000 ? 1910 + 1190 * (28000 - r) / 13000 : r <= 50000 ? 1910 * (50000 - r) / 22000 : 0;
    if (r > 25000 && r <= 35000) d += 65;
    return Math.max(d, r <= 15000 ? 690 : 0);
  }
  function cuneo(r) {   // semplificato: fino a 20.000 somma esente in % del reddito; 20.000–32.000 ulteriore detrazione 1.000; 32.000–40.000 a scalare
    if (r <= 8500) return {esente: r * 0.071, detrazione: 0};
    if (r <= 15000) return {esente: r * 0.053, detrazione: 0};
    if (r <= 20000) return {esente: r * 0.048, detrazione: 0};
    if (r <= 32000) return {esente: 0, detrazione: 1000};
    if (r <= 40000) return {esente: 0, detrazione: 1000 * (40000 - r) / 8000};
    return {esente: 0, detrazione: 0};
  }
  function presenze(i) {
    var d = dip(i.matricola), per = String(i.periodo || ''); if (!/^\d{4}-\d{2}$/.test(per)) throw Error('Periodo AAAA-MM.');
    H().presenze[per + '/' + d.matricola] = {straordinari: L.num(i.straordinari || 0, 'Ore di straordinario', 0), assenze: L.num(i.assenze || 0, 'Ore di assenza non retribuita', 0), ferie: L.num(i.ferie || 0, 'Giorni di ferie godute', 0), rol: L.num(i.rol || 0, 'Ore di permesso ROL godute', 0)};
    N().salva(); return '<p class="lab-nota">Presenze di ' + L.esc(d.nome) + ' per ' + per + ': straordinari ' + L.n0(H().presenze[per + '/' + d.matricola].straordinari) + ' h.</p>';
  }
  // addizionali dell'anno, determinate al conguaglio di dicembre (si trattengono l'anno dopo)
  function addizionaliAnno(imponibile, irpefDovuta, accontoTrattenuto) {
    var p = H().parametri, reg = 0, com = 0, prima = 0;
    if (irpefDovuta > 0) {
      p.addRegionale.forEach(function (s) { if (imponibile > prima) reg += (Math.min(imponibile, s[0]) - prima) * s[1] / 100; prima = s[0]; });
      if (imponibile > p.esenzioneComunale) com = imponibile * p.addComunale / 100;
    }
    reg = r2(reg); com = r2(com);
    return {imponibile: r2(imponibile), regione: p.regione, comune: p.comune, regionale: reg, comunale: com, accontoTrattenuto: r2(accontoTrattenuto || 0),
      saldoComunale: r2(Math.max(0, com - (accontoTrattenuto || 0))), accontoProssimo: r2(com * p.accontoComunale / 100)};
  }
  // rata k di n di un importo: le prime uguali, l'ultima chiude il totale
  var rata = function (tot, k, n) { var u = r2(tot / n); return k < n ? u : r2(tot - u * (n - 1)); };
  // addizionali trattenute nel mese: rate delle addizionali dell'anno precedente determinate al conguaglio di dicembre
  function rateAddizionali(d, per) {
    var anno = +per.slice(0, 4), m = +per.slice(5, 7), out = {regionale: 0, comunale: 0, acconto: 0, storico: 0, totale: 0, anno: anno - 1};
    if (m > 11) return out;
    var dic = H().cedolini.find(function (x) { return x.periodo === (anno - 1) + '-12' && x.matricola === d.matricola && x.addizionaliAnno; });
    if (dic) {
      var a = dic.addizionaliAnno;
      out.regionale = rata(a.regionale, m, 11); out.comunale = rata(a.saldoComunale, m, 11);
      if (m >= 3) out.acconto = rata(a.accontoProssimo, m - 2, 9);
    } else if (!d.assunzione || +d.assunzione.slice(0, 4) < anno) out.storico = r2(d.addizionali || 0);
    out.totale = r2(out.regionale + out.comunale + out.acconto + out.storico);
    return out;
  }
  // aliquota marginale per la tassazione della 13ª
  var marginale = function (r) { var a = 0, prima = 0; H().parametri.scaglioni.forEach(function (x) { if (r > prima) a = x[1]; prima = x[0]; }); return a; };
  // i mesi precedenti dello stesso anno: cedolini già calcolati o, prima dell'avvio delle paghe nel sistema, «storico» a paga base
  function precedenti(d, per) {
    var anno = per.slice(0, 4), m = +per.slice(5, 7), out = [];
    for (var k = primoMese(d, anno); k < m; k++) { var p = anno + '-' + String(k).padStart(2, '0'), c = H().cedolini.find(function (x) { return x.periodo === p && x.matricola === d.matricola; });
      out.push(c || Object.assign(calcolaUno(d, p, true), {storico: true})); }
    return out;
  }
  function calcolaUno(d, per, semplice) {
    var p = H().parametri, pr = H().presenze[per + '/' + d.matricola] || {straordinari: 0, assenze: 0, ferie: 0, rol: 0}, mese = +per.slice(5, 7);
    var oraria = d.lordo / p.oreMese, straord = r2(pr.straordinari * oraria * (1 + p.maggStraord / 100)), assenze = r2(pr.assenze * oraria);
    var mesiAnno = Math.max(0, mese - primoMese(d, per.slice(0, 4)) + 1);   // mesi lavorati nell'anno fino a questo (13ª, ferie e permessi maturano solo da lì)
    if (mesiAnno <= 0) throw Error(d.nome + ' è assunto il ' + L.fd(d.assunzione) + ': nessun cedolino per ' + per + '.');
    var ordinario = r2(d.lordo + straord - assenze), tredicesima = !semplice && mese === 12 ? r2(d.lordo * mesiAnno / 12) : 0;
    var lordo = r2(ordinario + tredicesima), inpsDip = r2(lordo * p.inpsDip / 100), inpsOrd = r2(ordinario * p.inpsDip / 100), imponibile = r2(ordinario - inpsOrd);
    var annuo = imponibile * p.mensilita, cu = cuneo(annuo), imponibileFisc = r2(imponibile - cu.esente / p.mensilita);
    var irpefLorda = r2(irpefAnnua(imponibileFisc * 12) / 12);
    var detr = r2(detrazione(annuo - cu.esente) / 12), ulter = r2(cu.detrazione / 12);
    var irpefOrd = r2(Math.max(0, irpefLorda - detr - ulter)), ra = rateAddizionali(d, per), addiz = ra.totale;
    var imp13 = r2(tredicesima - (inpsDip - inpsOrd)), irpef13 = tredicesima ? r2(imp13 * marginale(annuo) / 100) : 0;
    var c = {periodo: per, matricola: d.matricola, nome: d.nome, cdc: d.cdc, cdcNome: d.cdcNome, base: d.lordo, oreStraord: pr.straordinari, straordinari: straord, assenze: assenze, tredicesima: tredicesima, lordo: lordo,
      inpsDip: inpsDip, imponibile: r2(imponibile + imp13), sommaEsente: r2(cu.esente / p.mensilita), imponibileFiscale: r2(imponibileFisc + imp13), irpefLorda: irpefLorda, detrazioni: detr, ulterioreDetrazione: ulter,
      irpefOrdinaria: irpefOrd, irpef13: irpef13, conguaglio: 0, irpef: r2(irpefOrd + irpef13), addizionali: addiz, addizionaliRate: ra, redditoAnnuoPresunto: r2(annuo)};
    if (!semplice) {
      var prec = precedenti(d, per), somma = function (k) { return r2(prec.reduce(function (t, x) { return t + (x[k] || 0); }, 0)); };
      // conguaglio di fine anno: imposta vera sull'imponibile dell'anno, meno quanto già trattenuto
      if (mese === 12) {
        // detrazioni per lavoro dipendente rapportate al periodo di lavoro nell'anno (art. 13 TUIR: in giorni; qui in mesi)
        var R = r2(somma('imponibile') + c.imponibile), cuA = cuneo(R), impA = r2(R - cuA.esente), lorda = r2(irpefAnnua(impA)), dt = r2(detrazione(impA) * mesiAnno / 12), ud = r2(cuA.detrazione);
        var dovuta = r2(Math.max(0, lorda - dt - ud)), trattenuta = r2(somma('irpef') + c.irpef);
        c.conguaglio = r2(dovuta - trattenuta); c.irpef = r2(c.irpef + c.conguaglio);
        var acc = r2(prec.reduce(function (t, x) { return t + ((x.addizionaliRate || {}).acconto || 0); }, 0));
        c.addizionaliAnno = addizionaliAnno(impA, dovuta, acc);
        c.conguaglioDettaglio = {reddito: R, sommaEsente: r2(cuA.esente), imponibile: impA, lorda: lorda, detrazioni: dt, ulteriore: ud, dovuta: dovuta, trattenuta: trattenuta, mesi: mesiAnno};
      }
      c.progressivi = {mesi: prec.length + 1, storico: prec.filter(function (x) { return x.storico; }).length, imponibileInps: r2(somma('lordo') + c.lordo), imponibileFiscale: r2(somma('imponibileFiscale') + c.imponibileFiscale), irpef: r2(somma('irpef') + c.irpef),
        inpsDip: r2(somma('inpsDip') + c.inpsDip), tfr: r2(somma('tfrLordo') + r2(lordo / p.tfrDivisore))};
      // ratei e ferie maturati nell'anno fino a questo mese
      var godF = r2(prec.reduce(function (t, x) { return t + ((H().presenze[x.periodo + '/' + d.matricola] || {}).ferie || 0); }, 0) + (pr.ferie || 0));
      var godR = r2(prec.reduce(function (t, x) { return t + ((H().presenze[x.periodo + '/' + d.matricola] || {}).rol || 0); }, 0) + (pr.rol || 0));
      c.ratei = {mesi: mesiAnno, tredicesima: r2(d.lordo * mesiAnno / 12), tredicesimaPagata: tredicesima, ferieMaturate: r2(p.ferieAnno * mesiAnno / 12), ferieGodute: godF, ferieMese: pr.ferie || 0, ferieAP: d.ferieAP || 0,
        ferieResidue: r2((d.ferieAP || 0) + p.ferieAnno * mesiAnno / 12 - godF), rolMaturati: r2(p.rolAnno * mesiAnno / 12), rolGoduti: godR, rolMese: pr.rol || 0, rolAP: d.rolAP || 0, rolResidui: r2((d.rolAP || 0) + p.rolAnno * mesiAnno / 12 - godR)};
    }
    c.netto = r2(lordo - inpsDip - c.irpef - addiz);
    var inpsDitta = r2(lordo * p.inpsDitta / 100), inail = r2(lordo * p.inail / 100);
    var tfrLordo = r2(lordo / p.tfrDivisore), tfrContr = r2(lordo * p.tfrContributo / 100), tfrNetto = r2(tfrLordo - tfrContr);
    c.inpsDitta = inpsDitta; c.inail = inail; c.tfrLordo = tfrLordo; c.tfrContributo = tfrContr; c.tfrNetto = tfrNetto; c.costo = r2(lordo + inpsDitta + inail + tfrLordo);
    return c;
  }
  function calcola(i) {
    var per = String(i.periodo || ''); if (!/^\d{4}-\d{2}$/.test(per)) throw Error('Periodo AAAA-MM.');
    if (H().registrati.some(function (x) { return x.periodo === per; })) throw Error('Paga di ' + per + ' già registrata in contabilità: non si ricalcola.');
    H().cedolini = H().cedolini.filter(function (c) { return c.periodo !== per; }).concat(H().dipendenti.map(function (d) { var c = calcolaUno(d, per); c.numero = String(N().numero('cedolino')); return c; }));
    N().salva();
    var cs = H().cedolini.filter(function (c) { return c.periodo === per; });
    return '<p class="lab-nota">Calcolo di ' + per + ': ' + cs.length + ' cedolini. Netti ' + L.eur(cs.reduce(function (t, c) { return t + c.netto; }, 0)) + ' € · costo azienda ' + L.eur(cs.reduce(function (t, c) { return t + c.costo; }, 0)) + ' €.</p>';
  }
  var fineMese = function (per) { return L.fineMese(per); };
  var giorno16 = function (per) { var y = +per.slice(0, 4), m = +per.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return y + '-' + String(m).padStart(2, '0') + '-16'; };
  function registra(i) {
    var n = N(), per = String(i.periodo || ''), data = n.data(i.data || fineMese(per));
    var cs = H().cedolini.filter(function (c) { return c.periodo === per; }); if (!cs.length) throw Error('Prima il calcolo della paga di ' + per + '.');
    if (H().registrati.some(function (x) { return x.periodo === per; })) throw Error('Paga di ' + per + ' già registrata.');
    var somma = function (k) { return r2(cs.reduce(function (t, c) { return t + c[k]; }, 0)); };
    var righe = [];
    cs.forEach(function (c) {   // costi per centro di costo
      righe.push({conto: '80', dareAvere: 'DARE', importo: c.lordo, cdc: c.cdc, testo: c.nome + ' · CdC ' + c.cdc});
      righe.push({conto: '81', dareAvere: 'DARE', importo: r2(c.inpsDitta + c.inail), cdc: c.cdc, testo: 'INPS ditta + INAIL · CdC ' + c.cdc});
      righe.push({conto: '82', dareAvere: 'DARE', importo: c.tfrLordo, cdc: c.cdc, testo: 'TFR · CdC ' + c.cdc});
    });
    righe.push({conto: '27', dareAvere: 'AVERE', importo: somma('netto'), testo: 'netti in busta'});
    righe.push({conto: '28', dareAvere: 'AVERE', importo: r2(somma('inpsDip') + somma('inpsDitta') + somma('tfrContributo')), testo: 'INPS dipendente + ditta + 0,50%'});
    righe.push({conto: '24', dareAvere: 'AVERE', importo: somma('inail'), testo: 'INAIL (autoliquidazione)'});
    righe.push({conto: '29', dareAvere: 'AVERE', importo: r2(somma('irpef') + somma('addizionali')), testo: 'IRPEF e addizionali trattenute'});
    righe.push({conto: '31', dareAvere: 'AVERE', importo: somma('tfrNetto'), testo: 'quota TFR dell\'anno'});
    var r = n.post({data: data, tipo: 'PAGHE', rif: 'PAGHE ' + per, descrizione: 'PC00_M99_CIPE: paga di ' + per + ' — ' + cs.length + ' dipendenti', righe: righe});
    H().registrati.push({periodo: per, data: data, contabile: r.numero, netti: somma('netto'), f24Importo: r2(somma('inpsDip') + somma('inpsDitta') + somma('tfrContributo') + somma('irpef') + somma('addizionali')),
      scadenzaNetti: fineMese(per), scadenzaF24: giorno16(per), pagato: null, f24: null});
    n.salva(); return r;
  }
  var reg = function (per) { var x = H().registrati.find(function (y) { return y.periodo === String(per); }); if (!x) throw Error('Paga di ' + per + ' non registrata.'); return x; };
  function pagaNetti(i) {
    var n = N(), x = reg(i.periodo), data = n.data(i.data); if (x.pagato) throw Error('Netti già pagati il ' + L.fd(x.pagato) + '.');
    var r = n.post({data: data, tipo: 'PAGAMENTO_STIPENDI', rif: 'STIPENDI ' + x.periodo, descrizione: 'Bonifici degli stipendi di ' + x.periodo + ' (' + H().cedolini.filter(function (c) { return c.periodo === x.periodo; }).length + ' dipendenti)',
      righe: [{conto: '27', dareAvere: 'DARE', importo: x.netti}, {conto: '10', dareAvere: 'AVERE', importo: x.netti}]});
    x.pagato = data; n.salva(); return r;
  }
  function f24(i) {
    var n = N(), x = reg(i.periodo), data = n.data(i.data); if (x.f24) throw Error('F24 già versato il ' + L.fd(x.f24) + '.');
    var cs = H().cedolini.filter(function (c) { return c.periodo === x.periodo; }), somma = function (k) { return r2(cs.reduce(function (t, c) { return t + c[k]; }, 0)); };
    var inps = r2(somma('inpsDip') + somma('inpsDitta') + somma('tfrContributo')), erario = r2(somma('irpef') + somma('addizionali'));
    var sr = function (k) { return r2(cs.reduce(function (t, c) { return t + ((c.addizionaliRate || {})[k] || 0); }, 0)); };
    var codici = '1001 IRPEF ' + L.eur(somma('irpef')) + [['3802 addizionale regionale', r2(sr('regionale') + sr('storico'))], ['3848 saldo addizionale comunale', sr('comunale')], ['3847 acconto addizionale comunale', sr('acconto')]]
      .filter(function (x) { return x[1] > 0; }).map(function (x) { return ' · ' + x[0] + ' ' + L.eur(x[1]); }).join('');
    var r = n.post({data: data, tipo: 'F24', rif: 'F24 ' + x.periodo, descrizione: 'F24 del ' + L.fd(data) + ' per le paghe di ' + x.periodo + ': Erario ' + L.eur(erario) + ' (' + codici + ') · INPS (DM10) ' + L.eur(inps),
      righe: [{conto: '29', dareAvere: 'DARE', importo: erario}, {conto: '28', dareAvere: 'DARE', importo: inps}, {conto: '10', dareAvere: 'AVERE', importo: r2(inps + erario)}]});
    x.f24 = data; x.f24Dettaglio = {erario: erario, inps: inps}; n.salva(); return r;
  }
  function costoPerCentro(per) {
    var out = {};
    S().registrazioni.filter(function (r) { return r.tipo === 'PAGHE' && (!per || r.rif === 'PAGHE ' + per); }).forEach(function (r) { r.righe.forEach(function (x) { if (!x.cdc) return; var o = out[x.cdc] = out[x.cdc] || {cdc: x.cdc, retribuzioni: 0, oneri: 0, tfr: 0};
      o[x.conto === '80' ? 'retribuzioni' : x.conto === '81' ? 'oneri' : 'tfr'] = r2(o[x.conto === '80' ? 'retribuzioni' : x.conto === '81' ? 'oneri' : 'tfr'] + x.importo); }); });
    return Object.keys(out).sort().map(function (k) { var o = out[k]; o.totale = r2(o.retribuzioni + o.oneri + o.tfr); o.nome = (H().dipendenti.find(function (d) { return d.cdc === k; }) || {}).cdcNome || k; return o; });
  }
  function parametri(i) {
    var p = H().parametri;
    ['inpsDip', 'inpsDitta', 'inail'].forEach(function (k) { if (i[k] !== undefined && i[k] !== '') p[k] = L.num(i[k], k, 0); });
    N().salva(); return '<p class="lab-nota">Parametri salvati: INPS dipendente ' + L.n0(p.inpsDip) + '% · ditta ' + L.n0(p.inpsDitta) + '% · INAIL ' + L.n0(p.inail) + '%.</p>';
  }
  return {H: H, dip: dip, presenze: presenze, calcola: calcola, registra: registra, pagaNetti: pagaNetti, f24: f24, costoPerCentro: costoPerCentro, parametri: parametri,
    irpefAnnua: irpefAnnua, addizionaliAnno: addizionaliAnno, rateAddizionali: rateAddizionali, detrazione: detrazione, cuneo: cuneo, calcolaUno: calcolaUno};
})();
