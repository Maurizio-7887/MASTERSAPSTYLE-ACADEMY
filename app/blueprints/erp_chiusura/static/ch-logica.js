/* SISTEMA INTEGRATO — Liquidazione IVA, imposte, chiusura e riapertura dei conti.
   IVA: liquidazione periodica (mensile o trimestrale): si confrontano IVA a debito (21) e a credito (14) maturate fino a fine periodo.
     Debito → D 21 / A 14 / A 25 Erario c/IVA, da versare con F24 entro il 16 del mese dopo (trimestrale: + 1% di interessi, e il 16 del secondo mese).
     Credito → D 21 / A 14 per l'IVA a debito; il credito residuo resta sul 14 e si riporta al periodo dopo.
   Imposte: IRES 24% e IRAP 3,9% con le variazioni fiscali (ammortamenti oltre i coefficienti, primo anno a metà) e le imposte anticipate.
   Chiusura (31/12): epilogo dei costi e dei ricavi nel Conto economico (90), risultato al conto 32, chiusura delle attività e passività
   nello Stato patrimoniale finale (91). Riapertura (1/1): le stesse attività e passività dallo Stato patrimoniale iniziale (92).
   In SAP il riporto dei saldi è FAGLGVTR (e F.16 per clienti e fornitori): le partite aperte restano quelle dei documenti originali. */
window.CH4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var X = function () { var s = S(); s.chiusura = s.chiusura || {iva: [], imposte: []}; s.chiusure = s.chiusure || {}; return s.chiusura; };
  var tipo = function (c) { var x = S().pianoDeiConti.find(function (y) { return y.codice === c; }); return x ? x.tipo : ''; };
  var nome = function (c) { var x = S().pianoDeiConti.find(function (y) { return y.codice === c; }); return x ? x.nome : c; };
  // saldi (Dare − Avere) per conto e partner alla data, escludendo eventualmente documenti di un tipo
  function saldi(alla, filtro) {
    var out = {};
    S().registrazioni.forEach(function (r) { if (r.data > alla || (filtro && !filtro(r))) return;
      r.righe.forEach(function (x) { var k = x.conto + '|' + (x.partner || ''); out[k] = r2((out[k] || 0) + (x.dareAvere === 'DARE' ? x.importo : -x.importo)); }); });
    return out;
  }
  function saldo(conto, alla, filtro) { var s = saldi(alla || '9999-12-31', filtro), t = 0; Object.keys(s).forEach(function (k) { if (k.split('|')[0] === conto) t += s[k]; }); return r2(t); }
  var fineMese = function (aaaa, mm) { return L.fineMese(aaaa + '-' + String(mm).padStart(2, '0')); };
  function periodo(p) {   // '2027-03' mese o '2027-T1' trimestre
    var m = /^(\d{4})-(\d{2})$/.exec(p), t = /^(\d{4})-T([1-4])$/.exec(p);
    if (m) { var mm = +m[2]; return {codice: p, dal: m[1] + '-' + m[2] + '-01', al: fineMese(m[1], mm), trimestrale: false, scadenza: scadenzaF24(+m[1], mm + 1)}; }
    if (t) { var q = +t[2], ultimo = q * 3; return {codice: p, dal: t[1] + '-' + String(ultimo - 2).padStart(2, '0') + '-01', al: fineMese(t[1], ultimo), trimestrale: true,
      scadenza: q === 4 ? (+t[1] + 1) + '-03-16' : scadenzaF24(+t[1], ultimo + 2)}; }
    throw Error('Periodo IVA: scrivi AAAA-MM per il mese o AAAA-T1…T4 per il trimestre.');
  }
  function scadenzaF24(a, m) { if (m > 12) { a++; m -= 12; } var d = new Date(Date.UTC(a, m - 1, 16)), g = d.getUTCDay(); if (g === 6) d.setUTCDate(18); if (g === 0) d.setUTCDate(17); return d.toISOString().slice(0, 10); }
  var noLiq = function (r) { return r.tipo !== 'LIQUIDAZIONE_IVA' && !r.chiusura; };   // chiusura e riapertura spostano saldi, non sono operazioni IVA
  function calcolaIva(p) {
    var P = periodo(p), liq = X().iva.filter(function (x) { return x.al < P.al; });
    // IVA del periodo = saldi a fine periodo − saldi a fine periodo precedente, senza le liquidazioni; più il credito riportato
    var deb = r2(-saldo('21', P.al, noLiq) + saldo('21', addGiorni(P.dal, -1), noLiq)), cre = r2(saldo('14', P.al, noLiq) - saldo('14', addGiorni(P.dal, -1), noLiq));
    var riporto = liq.length ? liq[liq.length - 1].creditoRiportato : 0;
    var netto = r2(deb - cre - riporto), interessi = P.trimestrale && netto > 0 ? r2(netto / 100) : 0;
    return {periodo: P.codice, dal: P.dal, al: P.al, trimestrale: P.trimestrale, scadenza: P.scadenza, debito: deb, credito: cre, riporto: riporto, saldo: netto,
      daVersare: netto > 0 ? netto : 0, interessi: interessi, creditoRiportato: netto < 0 ? -netto : 0};
  }
  function addGiorni(d, n) { var x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function liquidaIva(i) {
    var n = N(), c = calcolaIva(String(i.periodo || '').trim()), data = n.data(i.data || c.al);
    if (X().iva.some(function (x) { return x.periodo === c.periodo || (x.dal <= c.al && x.al >= c.dal); })) throw Error('Periodo ' + c.periodo + ' già liquidato (o sovrapposto a una liquidazione già fatta).');
    if (data < c.al) throw Error('La liquidazione si registra a fine periodo (' + L.fd(c.al) + ') o dopo.');
    if (Math.abs(c.debito) < 0.005 && Math.abs(c.credito) < 0.005) throw Error('Nel periodo ' + c.periodo + ' non c\'è IVA da liquidare.');
    // chiude debito e credito del periodo (più il credito riportato, già sul 14) contro l'Erario
    var usaCredito = r2(Math.min(c.credito + c.riporto, c.debito));
    var righe = [{conto: '21', dareAvere: 'DARE', importo: c.debito, testo: 'IVA a debito ' + c.periodo}, {conto: '14', dareAvere: 'AVERE', importo: c.saldo > 0 ? r2(c.credito + c.riporto) : usaCredito, testo: 'IVA a credito ' + c.periodo + (c.riporto ? ' + credito riportato' : '')}];
    if (c.saldo > 0) righe.push({conto: '25', dareAvere: 'AVERE', importo: c.saldo, testo: 'IVA da versare entro il ' + L.fd(c.scadenza)});
    var r = n.post({data: data, tipo: 'LIQUIDAZIONE_IVA', rif: 'IVA ' + c.periodo, descrizione: 'Liquidazione IVA ' + c.periodo + ': a debito ' + L.eur(c.debito) + ', a credito ' + L.eur(c.credito) + (c.riporto ? ', credito riportato ' + L.eur(c.riporto) : '') + ' → ' + (c.saldo > 0 ? 'da versare ' + L.eur(c.saldo) + (c.interessi ? ' + interessi 1% ' + L.eur(c.interessi) : '') + ' entro il ' + L.fd(c.scadenza) : 'credito da riportare ' + L.eur(c.creditoRiportato)), righe: righe});
    c.contabile = r.numero; c.data = data; c.versato = null; X().iva.push(c); n.salva(); return r;
  }
  function versaIva(i) {
    var n = N(), data = n.data(i.data), x = X().iva.find(function (y) { return y.periodo === String(i.periodo || '').trim(); });
    if (!x) throw Error('Prima liquida il periodo ' + (i.periodo || '') + '.'); if (!x.daVersare) throw Error('Il periodo ' + x.periodo + ' è a credito: niente da versare.');
    if (x.versato) throw Error('IVA ' + x.periodo + ' già versata il ' + L.fd(x.versato) + '.');
    var righe = [{conto: '25', dareAvere: 'DARE', importo: x.daVersare, testo: 'F24 codice tributo ' + (x.trimestrale ? '603' + x.periodo.slice(-1) : '60' + x.periodo.slice(5, 7))}];
    if (x.interessi) righe.push({conto: '53', dareAvere: 'DARE', importo: x.interessi, testo: 'interessi 1% liquidazione trimestrale'});
    righe.push({conto: '10', dareAvere: 'AVERE', importo: r2(x.daVersare + x.interessi), testo: 'F24 IVA ' + x.periodo});
    var r = n.post({data: data, tipo: 'F24_IVA', rif: 'F24 IVA ' + x.periodo, descrizione: 'Versamento F24 IVA ' + x.periodo + ' (scadenza ' + L.fd(x.scadenza) + ')' + (data > x.scadenza ? ' — IN RITARDO: servirebbe il ravvedimento operoso' : ''), righe: righe});
    x.versato = data; n.salva(); return r;
  }
  // risultato economico dell'anno (prima delle imposte, se richiesto)
  function contoEconomico(anno, senzaImposte) {
    var al = anno + '-12-31', dal = anno + '-01-01', voci = {};
    S().registrazioni.forEach(function (r) { if (r.data < dal || r.data > al || r.tipo === 'EPILOGO') return;
      r.righe.forEach(function (x) { var t = tipo(x.conto); if (t !== 'COSTO' && t !== 'RICAVO') return; if (senzaImposte && IMPOSTE[x.conto]) return;
        voci[x.conto] = r2((voci[x.conto] || 0) + (x.dareAvere === 'DARE' ? x.importo : -x.importo)); }); });
    var ricavi = 0, costi = 0, righe = [];
    Object.keys(voci).sort(function (a, b) { return a.localeCompare(b, 'it', {numeric: true}); }).forEach(function (c) { if (Math.abs(voci[c]) < 0.005) return; righe.push({conto: c, nome: nome(c), tipo: tipo(c), saldo: voci[c]}); if (voci[c] < 0) ricavi -= voci[c]; else costi += voci[c]; });
    return {righe: righe, ricavi: r2(ricavi), costi: r2(costi), risultato: r2(ricavi - costi)};
  }
  // ── imposte dell'esercizio: IRES e IRAP correnti, imposte anticipate sulle differenze temporanee ──
  // IRES (art. 83 TUIR): risultato prima delle imposte ± variazioni. Automatiche: ammortamenti oltre i coefficienti fiscali
  // (in aumento), recuperi e minor valore fiscale alla cessione (in diminuzione). Manuali: le altre variazioni.
  // IRAP (art. 5 D.Lgs. 446/1997, società di capitali): valore della produzione = differenza tra valore e costi della produzione,
  // quindi SENZA proventi e oneri finanziari (area C: interessi, oneri di factoring, cambi) e senza le imposte. I costi del
  // personale dipendente a tempo indeterminato sono deducibili (art. 11 c. 4-octies). Ammortamenti nei limiti fiscali come IRES.
  // L'IRAP non è deducibile dall'IRES (la deduzione forfetaria del 10% e quella sul costo del personale sono per cassa: nel primo anno
  // senza versamenti IRAP non spettano). Imposte anticipate (OIC 25): differenze temporanee × (aliquota IRES + IRAP).
  var FINANZIARI = {'60': 'interessi passivi bancari', '53': 'interessi su IVA trimestrale', '55': 'oneri su cessione crediti (factoring)', '59': 'interessi attivi', '66': 'utili su cambi', '67': 'perdite su cambi', '68': 'differenze cambio da valutazione'};
  var IMPOSTE = {'56': 1, '52': 1, '51': 1};
  function calcolaImposte(i) {
    var anno = String(i.anno || '').trim(); if (!/^\d{4}$/.test(anno)) throw Error('Anno non valido.');
    var al = anno + '-12-31', dal = anno + '-01-01', voci = {};
    S().registrazioni.forEach(function (r) { if (r.data < dal || r.data > al || r.chiusura) return;
      r.righe.forEach(function (x) { var t = tipo(x.conto); if (t !== 'COSTO' && t !== 'RICAVO') return; voci[x.conto] = r2((voci[x.conto] || 0) + (x.dareAvere === 'DARE' ? x.importo : -x.importo)); }); });
    var ante = 0; Object.keys(voci).forEach(function (c) { if (!IMPOSTE[c]) ante -= voci[c]; }); ante = r2(ante);
    var fis = window.CE4 ? window.CE4.fiscale(anno) : {righe: [], totali: {aumento: 0, diminuzione: 0, recuperoCessione: 0, eccedenzaFine: 0, eccedenzaInizio: 0}}, ft = fis.totali;
    var aum = L.num(i.aumenti || 0, 'Altre variazioni in aumento', 0), dim = L.num(i.diminuzioni || 0, 'Altre variazioni in diminuzione', 0);
    var aIres = L.num(i.aliquota || i.aliquotaIres || 24, 'Aliquota IRES %', 0), aIrap = L.num(i.aliquotaIrap == null || i.aliquotaIrap === '' ? 3.9 : i.aliquotaIrap, 'Aliquota IRAP %', 0);
    var varIres = [['Ammortamenti oltre il limite fiscale (art. 102 TUIR, primo anno a metà)', ft.aumento], ['Recupero di ammortamenti non dedotti negli anni prima', -ft.diminuzione],
      ['Cessioni: maggior valore fiscale residuo (minusvalenza fiscale più alta)', -ft.recuperoCessione], ['Altre variazioni in aumento', aum], ['Altre variazioni in diminuzione', -dim]];
    var baseIres = r2(Math.max(0, ante + varIres.reduce(function (t, v) { return t + v[1]; }, 0))), ires = r2(baseIres * aIres / 100);
    var fin = Object.keys(FINANZIARI).filter(function (c) { return Math.abs(voci[c] || 0) > 0.004; }).map(function (c) { return [c + ' ' + FINANZIARI[c], voci[c]]; });
    var vp = r2(ante + fin.reduce(function (t, v) { return t + v[1]; }, 0));   // si tolgono gli oneri (si aggiungono) e i proventi (si sottraggono) finanziari
    var varIrap = [['Ammortamenti oltre il limite fiscale', ft.aumento], ['Recupero di ammortamenti non dedotti', -ft.diminuzione], ['Cessioni: maggior valore fiscale residuo', -ft.recuperoCessione]];
    var baseIrap = r2(Math.max(0, vp + varIrap.reduce(function (t, v) { return t + v[1]; }, 0))), irap = r2(baseIrap * aIrap / 100);
    var tempFine = ft.eccedenzaFine, tempInizio = ft.eccedenzaInizio, anticipate = r2((tempFine - tempInizio) * (aIres + aIrap) / 100);
    return {anno: anno, risultato: ante, voci: voci, fiscale: fis, variazioniIres: varIres, aumenti: aum, diminuzioni: dim, base: baseIres, aliquota: aIres, ires: ires,
      finanziari: fin, valoreProduzione: vp, variazioniIrap: varIrap, baseIrap: baseIrap, aliquotaIrap: aIrap, irap: irap,
      differenzeTemporanee: {inizio: tempInizio, fine: tempFine}, anticipate: anticipate, totaleImposte: r2(ires + irap - anticipate), utile: r2(ante - ires - irap + anticipate)};
  }
  var calcolaIres = calcolaImposte;
  function registraIres(i) {
    var n = N(), c = calcolaImposte(i), data = n.data(i.data || c.anno + '-12-31');
    if (X().imposte.some(function (x) { return x.anno === c.anno; })) throw Error('Imposte ' + c.anno + ' già registrate.');
    var righe = [];
    if (c.ires) righe.push({conto: '56', dareAvere: 'DARE', importo: c.ires, testo: 'IRES corrente ' + c.aliquota + '%'}, {conto: '23', dareAvere: 'AVERE', importo: c.ires, testo: 'debito IRES (saldo entro il 30/06)'});
    if (c.irap) righe.push({conto: '52', dareAvere: 'DARE', importo: c.irap, testo: 'IRAP corrente ' + c.aliquotaIrap + '%'}, {conto: '35', dareAvere: 'AVERE', importo: c.irap, testo: 'debito IRAP (saldo entro il 30/06)'});
    if (c.anticipate > 0.004) righe.push({conto: '17', dareAvere: 'DARE', importo: c.anticipate, testo: 'imposte anticipate su differenze temporanee'}, {conto: '51', dareAvere: 'AVERE', importo: c.anticipate, testo: 'imposte anticipate'});
    if (c.anticipate < -0.004) righe.push({conto: '51', dareAvere: 'DARE', importo: -c.anticipate, testo: 'riassorbimento imposte anticipate'}, {conto: '17', dareAvere: 'AVERE', importo: -c.anticipate, testo: 'utilizzo crediti per imposte anticipate'});
    if (!righe.length) throw Error('Base imponibile zero: niente imposte da registrare.');
    var r = n.post({data: data, tipo: 'IMPOSTE', rif: 'IMPOSTE ' + c.anno, descrizione: 'Imposte ' + c.anno + ': IRES ' + c.aliquota + '% su ' + L.eur(c.base) + ' = ' + L.eur(c.ires) + ' · IRAP ' + c.aliquotaIrap + '% su ' + L.eur(c.baseIrap) + ' = ' + L.eur(c.irap) +
      (Math.abs(c.anticipate) > 0.004 ? ' · imposte anticipate ' + L.eur(c.anticipate) + ' su differenze temporanee ' + L.eur(c.differenzeTemporanee.fine) : ''), righe: righe});
    var x = {anno: c.anno, risultato: c.risultato, base: c.base, ires: c.ires, baseIrap: c.baseIrap, irap: c.irap, anticipate: c.anticipate, differenze: c.differenzeTemporanee, aumenti: c.aumenti, diminuzioni: c.diminuzioni, contabile: r.numero};
    X().imposte.push(x); n.salva(); return r;
  }
  // controlli prima di chiudere
  function controlli(anno) {
    var al = anno + '-12-31', out = [], s = S();
    var cesp = (s.cespiti || []).filter(function (c) { return !c.cessione && c.inFunzione <= al && !c.ammortamenti.some(function (a) { return a.anno === +anno && a.data >= al; }) && window.CE4 && window.CE4.quota(c, al).importo > 0.004; });
    if (cesp.length) out.push('Ammortamenti ' + anno + ' non registrati: ' + cesp.map(function (c) { return c.codice; }).join(', ') + ' (Cespiti → Ammortamenti, AFAB al 31/12).');
    var trim = ['T1', 'T2', 'T3', 'T4'].map(function (q) { return anno + '-' + q; }), mesi = []; for (var m = 1; m <= 12; m++) mesi.push(anno + '-' + String(m).padStart(2, '0'));
    var coperto = function (d) { return X().iva.some(function (x) { return x.dal <= d && x.al >= d; }); };
    var ivaNonLiq = s.registrazioni.filter(function (r) { return r.data.slice(0, 4) === anno && r.tipo !== 'LIQUIDAZIONE_IVA' && !r.chiusura && r.righe.some(function (x) { return x.conto === '21' || x.conto === '14'; }) && !coperto(r.data); });
    if (ivaNonLiq.length) out.push('IVA non ancora liquidata per ' + ivaNonLiq.length + ' documenti (il primo del ' + L.fd(ivaNonLiq[0].data) + '): fai le liquidazioni del periodo.');
    if (!X().imposte.some(function (x) { return x.anno === anno; })) out.push('Imposte ' + anno + ' (IRES e IRAP) non registrate.');
    if (window.WM4 && s.wm && s.wm.attivo && window.WM4.aperti().length) out.push('Ci sono ' + window.WM4.aperti().length + ' compiti di magazzino aperti.');
    return out;
  }
  function chiudi(i) {
    var n = N(), anno = String(i.anno || '').trim(), al = anno + '-12-31', s = S(); X();
    if (!/^\d{4}$/.test(anno)) throw Error('Anno non valido.'); n.data(al);
    if (s.chiusure[anno]) throw Error('Esercizio ' + anno + ' già chiuso il ' + L.fd(s.chiusure[anno].data) + '.');
    var c = controlli(anno); if (c.length && i.forza !== 'si') throw Error('Prima di chiudere: ' + c.join(' · '));
    // 1. epilogo dei conti economici nel conto 90
    var sal = saldi(al), ce = [], sp = [];
    Object.keys(sal).forEach(function (k) { var p = k.split('|'), t = tipo(p[0]); if (Math.abs(sal[k]) < 0.005) return; if (t === 'COSTO' || t === 'RICAVO') ce.push({conto: p[0], partner: p[1], saldo: sal[k]}); else if (t === 'ATTIVO' || t === 'PASSIVO') sp.push({conto: p[0], partner: p[1], saldo: sal[k]}); });
    var ord = function (a, b) { return a.conto.localeCompare(b.conto, 'it', {numeric: true}) || a.partner.localeCompare(b.partner); };
    ce.sort(ord); sp.sort(ord);
    var righe = [], tot = 0;
    ce.forEach(function (x) { righe.push({conto: x.conto, dareAvere: x.saldo > 0 ? 'AVERE' : 'DARE', importo: Math.abs(x.saldo), testo: 'epilogo'}); tot = r2(tot + x.saldo); });
    if (Math.abs(tot) > 0.004) righe.push({conto: '90', dareAvere: tot > 0 ? 'DARE' : 'AVERE', importo: Math.abs(tot), testo: tot > 0 ? 'totale costi meno ricavi' : 'totale ricavi meno costi'});
    var r1 = righe.length ? n.post({data: al, tipo: 'EPILOGO', rif: 'CHIUSURA ' + anno, descrizione: 'Epilogo ' + anno + ': costi e ricavi chiusi nel Conto economico (90)', righe: righe, chiusura: 'epilogo'}) : null;
    // 2. risultato d'esercizio al conto 32
    var utile = r2(-tot), r2doc = Math.abs(utile) > 0.004 ? n.post({data: al, tipo: 'RISULTATO', rif: 'CHIUSURA ' + anno, descrizione: (utile >= 0 ? 'Utile' : 'Perdita') + ' d\'esercizio ' + anno + ': ' + L.eur(Math.abs(utile)), chiusura: 'risultato',
      righe: utile >= 0 ? [{conto: '90', dareAvere: 'DARE', importo: utile, testo: 'chiusura conto economico'}, {conto: '32', dareAvere: 'AVERE', importo: utile, testo: 'utile ' + anno}]
                        : [{conto: '32', dareAvere: 'DARE', importo: -utile, testo: 'perdita ' + anno}, {conto: '90', dareAvere: 'AVERE', importo: -utile, testo: 'chiusura conto economico'}]}) : null;
    // 3. chiusura delle attività e delle passività nello Stato patrimoniale finale (91), compreso il risultato
    var sp2 = []; var sal2 = saldi(al); Object.keys(sal2).forEach(function (k) { var p = k.split('|'), t = tipo(p[0]); if ((t === 'ATTIVO' || t === 'PASSIVO') && Math.abs(sal2[k]) >= 0.005) sp2.push({conto: p[0], partner: p[1], saldo: sal2[k]}); });
    sp2.sort(ord);
    var righe3 = [], dare91 = 0, avere91 = 0;
    sp2.forEach(function (x) { var y = {conto: x.conto, dareAvere: x.saldo > 0 ? 'AVERE' : 'DARE', importo: Math.abs(x.saldo), testo: 'chiusura'}; if (x.partner) y.partner = x.partner; righe3.push(y); if (x.saldo > 0) dare91 += x.saldo; else avere91 -= x.saldo; });
    righe3.push({conto: '91', dareAvere: 'DARE', importo: r2(dare91), testo: 'attività'}, {conto: '91', dareAvere: 'AVERE', importo: r2(avere91), testo: 'passività e patrimonio netto'});
    var r3 = n.post({data: al, tipo: 'CHIUSURA_SP', rif: 'CHIUSURA ' + anno, descrizione: 'Chiusura ' + anno + ': attività e passività nello Stato patrimoniale finale (91)', righe: righe3, chiusura: 'stato patrimoniale'});
    s.chiusure[anno] = {data: al, utile: utile, epilogo: r1 ? r1.numero : '', risultato: r2doc ? r2doc.numero : '', chiusuraSP: r3.numero, saldi: sp2, avvertenze: c};
    n.salva(); return r2doc || r3;
  }
  function riapri(i) {
    var n = N(), anno = String(i.anno || '').trim(), s = S(), prec = String(+anno - 1); X();
    if (!/^\d{4}$/.test(anno)) throw Error('Anno non valido.');
    var ch = s.chiusure[prec]; if (!ch) throw Error('Prima chiudi l\'esercizio ' + prec + '.');
    if (ch.riapertura) throw Error('Esercizio ' + anno + ' già riaperto.');
    var data = n.data(i.data || anno + '-01-01'); if (data.slice(0, 4) !== anno) throw Error('La riapertura va registrata nel ' + anno + '.');
    var righe = [], d92 = 0, a92 = 0;
    ch.saldi.forEach(function (x) { var y = {conto: x.conto, dareAvere: x.saldo > 0 ? 'DARE' : 'AVERE', importo: Math.abs(x.saldo), testo: 'riapertura'}; if (x.partner) y.partner = x.partner; righe.push(y); if (x.saldo > 0) a92 += x.saldo; else d92 -= x.saldo; });
    righe.push({conto: '92', dareAvere: 'AVERE', importo: r2(a92), testo: 'attività'}, {conto: '92', dareAvere: 'DARE', importo: r2(d92), testo: 'passività e patrimonio netto'});
    var r = n.post({data: data, tipo: 'RIAPERTURA', rif: 'RIAPERTURA ' + anno, descrizione: 'Riapertura ' + anno + ': attività e passività dallo Stato patrimoniale iniziale (92), come i saldi di chiusura ' + prec, righe: righe, chiusura: 'riapertura'});
    ch.riapertura = r.numero; n.salva(); return r;
  }
  // destinazione dell'utile deliberata dall'assemblea: 5% a riserva legale, il resto a riserve (conto 30)
  function destinaUtile(i) {
    var n = N(), data = n.data(i.data), u = saldo('32', data);
    if (u >= -0.004) throw Error('Non c\'è un utile da destinare sul conto 32.');
    var utile = -u, perc = L.num(i.legale == null || i.legale === '' ? 5 : i.legale, 'Riserva legale %', 0), leg = r2(utile * perc / 100);
    var r = n.post({data: data, tipo: 'DESTINAZIONE_UTILE', rif: 'ASSEMBLEA ' + data.slice(0, 4), descrizione: 'Delibera dell\'assemblea: utile ' + L.eur(utile) + ' → riserva legale ' + perc + '% ' + L.eur(leg) + ', a riserve ' + L.eur(r2(utile - leg)),
      righe: [{conto: '32', dareAvere: 'DARE', importo: utile, testo: 'destinazione utile'}, {conto: '33', dareAvere: 'AVERE', importo: leg, testo: 'riserva legale'}, {conto: '30', dareAvere: 'AVERE', importo: r2(utile - leg), testo: 'utili portati a riserva'}]});
    n.salva(); return r;
  }
  // ── ratei e risconti (art. 2424-bis c. 6 c.c., OIC 18): la parte di un costo o di un ricavo che appartiene a un altro esercizio ──
  // RISCONTO: pagato o fatturato ORA ma di competenza in parte FUTURA → si rinvia la quota futura (attivo: D 06 / A costo; passivo: D ricavo / A 34).
  // RATEO: di competenza in parte di QUEST'ANNO ma si pagherà o incasserà DOPO → si anticipa la quota maturata (attivo: D 05 / A ricavo; passivo: D costo / A 39).
  // Quota a giorni: periodo dal–al compresi; il 1° gennaio si stornano (si riportano sul conto economico del nuovo anno).
  var TIPI_ASS = {
    'risconto-attivo': {nome: 'Risconto attivo', conto: '06', natura: 'COSTO', futuro: true},
    'risconto-passivo': {nome: 'Risconto passivo', conto: '34', natura: 'RICAVO', futuro: true},
    'rateo-attivo': {nome: 'Rateo attivo', conto: '05', natura: 'RICAVO', futuro: false},
    'rateo-passivo': {nome: 'Rateo passivo', conto: '39', natura: 'COSTO', futuro: false}};
  var giorni = function (a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5) + 1; };
  function calcolaAssestamento(i) {
    var t = TIPI_ASS[i.tipo]; if (!t) throw Error('Scegli il tipo: rateo o risconto, attivo o passivo.');
    var conto = String(i.conto || '').trim(); if (tipo(conto) !== t.natura) throw Error(t.nome + ': il conto economico deve essere un ' + (t.natura === 'COSTO' ? 'costo' : 'ricavo') + ' (scelto ' + (conto || 'nessuno') + ').');
    var imp = L.num(i.importo, 'Importo dell\'operazione', 0.01), dal = L.dataOk(i.dal), al = L.dataOk(i.al), data = L.dataOk(i.data);
    if (al < dal) throw Error('Il periodo finisce prima di cominciare.');
    if (data < dal || data >= al) throw Error('La data dell\'assestamento (' + L.fd(data) + ') deve cadere dentro il periodo ' + L.fd(dal) + ' – ' + L.fd(al) + ', prima della fine.');
    var tot = giorni(dal, al), maturati = giorni(dal, data), futuri = tot - maturati;
    var quota = r2(imp * (t.futuro ? futuri : maturati) / tot);
    return {tipo: i.tipo, nome: t.nome, contoSP: t.conto, conto: conto, importo: imp, dal: dal, al: al, data: data, giorni: tot, maturati: maturati, futuri: futuri, quota: quota,
      formula: L.eur(imp) + ' × ' + (t.futuro ? futuri : maturati) + ' / ' + tot + ' giorni = ' + L.eur(quota)};
  }
  function assestamento(i) {
    var n = N(), c = calcolaAssestamento(i); n.data(c.data);
    var testo = String(i.testo || '').trim() || nome(c.conto);
    if (X().assestamenti && X().assestamenti.some(function (x) { return x.conto === c.conto && x.dal === c.dal && x.al === c.al && x.data === c.data && !x.stornato; })) throw Error('Questo ' + c.nome.toLowerCase() + ' è già registrato.');
    var t = TIPI_ASS[c.tipo], righe = c.tipo === 'risconto-attivo' ? [{conto: '06', dareAvere: 'DARE', importo: c.quota}, {conto: c.conto, dareAvere: 'AVERE', importo: c.quota, testo: 'quota di competenza futura'}]
      : c.tipo === 'risconto-passivo' ? [{conto: c.conto, dareAvere: 'DARE', importo: c.quota, testo: 'quota di competenza futura'}, {conto: '34', dareAvere: 'AVERE', importo: c.quota}]
      : c.tipo === 'rateo-attivo' ? [{conto: '05', dareAvere: 'DARE', importo: c.quota}, {conto: c.conto, dareAvere: 'AVERE', importo: c.quota, testo: 'quota maturata'}]
      : [{conto: c.conto, dareAvere: 'DARE', importo: c.quota, testo: 'quota maturata'}, {conto: '39', dareAvere: 'AVERE', importo: c.quota}];
    var r = n.post({data: c.data, tipo: 'ASSESTAMENTO', rif: t.nome.toUpperCase() + ' ' + c.conto, descrizione: t.nome + ' al ' + L.fd(c.data) + ' — ' + testo + ': ' + c.formula + ' (periodo ' + L.fd(c.dal) + ' – ' + L.fd(c.al) + ')', righe: righe});
    X().assestamenti = X().assestamenti || []; X().assestamenti.push(Object.assign(c, {testo: testo, contabile: r.numero, stornato: null}));
    n.salva(); return r;
  }
  // 1° gennaio: dopo la riapertura, ratei e risconti tornano sul conto economico del nuovo anno (scritture inverse)
  function stornaAssestamenti(i) {
    var n = N(), data = n.data(i.data), prec = String(+data.slice(0, 4) - 1), s = S(); X();
    if (!s.chiusure[prec] || !s.chiusure[prec].riapertura) throw Error('Prima chiudi il ' + prec + ' e riapri i conti al 1° gennaio: lo storno viene dopo la riapertura.');
    var da = (X().assestamenti || []).filter(function (x) { return !x.stornato && x.data.slice(0, 4) === prec; });
    if (!da.length) throw Error('Nessun rateo o risconto del ' + prec + ' da stornare.');
    var righe = [];
    da.forEach(function (x) { var y = s.registrazioni.find(function (r) { return r.numero === x.contabile; });
      y.righe.forEach(function (z) { righe.push({conto: z.conto, dareAvere: z.dareAvere === 'DARE' ? 'AVERE' : 'DARE', importo: z.importo, testo: 'storno ' + x.nome.toLowerCase() + ' ' + x.testo}); }); });
    var r = n.post({data: data, tipo: 'STORNO_ASSESTAMENTI', rif: 'STORNO RATEI E RISCONTI ' + prec, descrizione: 'Storno al ' + L.fd(data) + ' dei ratei e risconti del ' + prec + ': ' + da.map(function (x) { return x.nome.toLowerCase() + ' ' + x.conto + ' ' + L.eur(x.quota); }).join(' · '), righe: righe});
    da.forEach(function (x) { x.stornato = data; x.storno = r.numero; });
    n.salva(); return r;
  }
  // stato patrimoniale alla data (prima della chiusura): attività e passività per conto
  function statoPatrimoniale(alla) {
    var sal = saldi(alla, function (r) { return !(r.chiusura === 'stato patrimoniale' && r.data === alla); }), voci = {};
    Object.keys(sal).forEach(function (k) { var c = k.split('|')[0], t = tipo(c); if (t === 'ATTIVO' || t === 'PASSIVO') voci[c] = r2((voci[c] || 0) + sal[k]); });
    var att = [], pas = [], ta = 0, tp = 0;
    Object.keys(voci).sort(function (a, b) { return a.localeCompare(b, 'it', {numeric: true}); }).forEach(function (c) { var v = voci[c]; if (Math.abs(v) < 0.005) return;
      if (tipo(c) === 'ATTIVO') { att.push({conto: c, nome: nome(c), saldo: v}); ta += v; } else { pas.push({conto: c, nome: nome(c), saldo: -v}); tp -= v; } });
    return {attivo: att, passivo: pas, totaleAttivo: r2(ta), totalePassivo: r2(tp)};
  }
  return {periodo: periodo, calcolaIva: calcolaIva, liquidaIva: liquidaIva, versaIva: versaIva, contoEconomico: contoEconomico, calcolaIres: calcolaIres, calcolaImposte: calcolaImposte, registraIres: registraIres, registraImposte: registraIres,
    TIPI_ASS: TIPI_ASS, calcolaAssestamento: calcolaAssestamento, assestamento: assestamento, stornaAssestamenti: stornaAssestamenti,
    controlli: controlli, chiudi: chiudi, riapri: riapri, destinaUtile: destinaUtile, statoPatrimoniale: statoPatrimoniale, saldo: saldo, X: X};
})();
