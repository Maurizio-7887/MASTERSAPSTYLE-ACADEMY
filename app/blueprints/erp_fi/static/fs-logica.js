/* SISTEMA INTEGRATO — Fattura di servizi a cliente italiano (FB70): noleggi, posa, assistenza.
   Fattura passiva di servizi (FB60: assicurazioni, affitti, consulenze), pagamento manuale ai fornitori (F-53),
   sopravvenienze attive (indennizzo assicurativo: riconoscimento e incasso).
   D 11 Cliente / A 44 Ricavi per servizi / A 21 IVA a debito, con la scadenza scelta (serve a RiBa, factoring, scadenziario).
   Come ogni fattura emessa, va trasmessa allo SdI (Contabilità → Fattura elettronica). */
window.FS4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var F = function () { var s = S(); s.fattureServizi = s.fattureServizi || []; return s.fattureServizi; };
  function fattura(i) {
    var n = N(), data = n.data(i.data), c = n.cliente(i.cliente);
    if (c.valuta && c.valuta !== 'EUR') throw Error('Cliente in valuta estera: usa Valute → Fatture in valuta (FB70 in ' + c.valuta + ').');
    var imp = L.num(i.imponibile, 'Imponibile', 0.01), ivaP = i.iva == null || i.iva === '' ? 22 : L.num(i.iva, 'IVA %', 0), iva = r2(imp * ivaP / 100);
    var testo = String(i.testo || '').trim() || 'prestazione di servizi', scad = i.scadenza ? L.dataOk(i.scadenza) : '';
    if (scad && scad < data) throw Error('La scadenza non può precedere la data della fattura.');
    var numero = n.numero('fattura'), riga = {conto: '11', dareAvere: 'DARE', importo: r2(imp + iva), partner: i.cliente, testo: 'fattura ' + numero};
    if (scad) riga.scadenza = scad;
    var r = n.post({data: data, tipo: 'FATTURA_SERVIZI', rif: numero, descrizione: 'FB70 fattura ' + numero + ' a ' + c.nome + ': ' + testo + (scad ? ' — scadenza ' + L.fd(scad) : ''),
      righe: [riga, {conto: '44', dareAvere: 'AVERE', importo: imp, testo: testo}, {conto: '21', dareAvere: 'AVERE', importo: iva, testo: 'IVA ' + ivaP + '%'}]});
    F().push({numero: numero, cliente: i.cliente, data: data, imponibile: imp, iva: iva, totale: r2(imp + iva), testo: testo, scadenza: scad, contabile: r.numero});
    n.salva(); return r;
  }
  // ── FB60: fattura passiva di servizi (assicurazione, affitto, consulenze, energia) da un fornitore italiano ──
  // D conto di costo + D 14 IVA a credito / A 20 Fornitore. Le assicurazioni sono esenti IVA (art. 10 DPR 633/72): IVA 0.
  var P = function () { var s = S(); s.fatturePassive = s.fatturePassive || []; return s.fatturePassive; };
  var COSTI = [['83', '83 Assicurazioni'], ['86', '86 Fitti passivi'], ['54', '54 Consulenze e servizi'], ['58', '58 Commissioni e spese bancarie'],
    ['54.10', '54.10 Spese telefoniche'], ['54.20', '54.20 Manutenzioni e riparazioni'], ['54.30', '54.30 Carburanti e lubrificanti (auto a uso promiscuo)'],
    ['54.40', '54.40 Viaggi e soggiorni (alberghi)'], ['54.50', '54.50 Spese di rappresentanza'], ['57.10', '57.10 Trasporti su vendite (corrieri)'], ['54.60', '54.60 Materiali di consumo']];
  function fatturaPassiva(i) {
    var n = N(), data = n.data(i.data), f = n.fornitore(i.fornitore), conto = String(i.conto || '').trim();
    var pc = S().pianoDeiConti.find(function (c) { return c.codice === conto; }); if (!pc || pc.tipo !== 'COSTO') throw Error('Scegli un conto di costo.');
    var rif = String(i.rif || '').trim(); if (!rif) throw Error('Scrivi il numero della fattura del fornitore.');
    if (P().some(function (x) { return x.fornitore === i.fornitore && x.rif === rif && !x.stornata; })) throw Error('Fattura ' + rif + ' di ' + f.nome + ' già registrata.');
    var imp = L.num(i.imponibile, 'Imponibile', 0.01), ivaP = i.iva == null || i.iva === '' ? 22 : L.num(i.iva, 'IVA %', 0), iva = r2(imp * ivaP / 100);
    // IVA detraibile solo in parte (art. 19-bis1 DPR 633/72): la parte indetraibile è un costo e va sul conto della spesa
    var detr = i.detraibile == null || i.detraibile === '' ? 100 : L.num(i.detraibile, 'IVA detraibile %', 0);
    if (detr > 100) throw Error('La percentuale di IVA detraibile non può superare 100.');
    if (conto === '54.50' && iva > 0 && detr > 0) throw Error('Spese di rappresentanza: l’IVA NON è detraibile (art. 19-bis1, lett. h, DPR 633/72; solo beni fino a 50 € l’uno). Scrivi 0 in «IVA detraibile %»: l’IVA diventa costo.');
    if (conto === '54.30' && iva > 0 && detr > 40) throw Error('Carburante di un’auto a uso promiscuo: l’IVA è detraibile solo al 40% (art. 19-bis1, lett. c, DPR 633/72). Scrivi 40 in «IVA detraibile %».');
    var ivaDetr = r2(iva * detr / 100), ivaIndetr = r2(iva - ivaDetr);
    var testo = String(i.testo || '').trim() || pc.nome, scad = i.scadenza ? L.dataOk(i.scadenza) : '';
    if (scad && scad < data) throw Error('La scadenza non può precedere la data della fattura.');
    var dal = i.dal ? L.dataOk(i.dal) : '', al = i.al ? L.dataOk(i.al) : ''; if (dal && al && al < dal) throw Error('Il periodo di competenza finisce prima di cominciare.');
    var riga = {conto: '20', dareAvere: 'AVERE', importo: r2(imp + iva), partner: i.fornitore, testo: 'fattura ' + rif}; if (scad) riga.scadenza = scad;
    var r = n.post({data: data, tipo: 'FATTURA_PASSIVA', rif: rif, descrizione: 'FB60 fattura ' + rif + ' di ' + f.nome + ': ' + testo + (dal && al ? ' (competenza ' + L.fd(dal) + ' – ' + L.fd(al) + ')' : '') + (ivaP ? '' : ' — esente IVA'),
      righe: [{conto: conto, dareAvere: 'DARE', importo: r2(imp + ivaIndetr), testo: testo + (ivaIndetr ? ' (con IVA indetraibile ' + L.eur(ivaIndetr) + ')' : '')}].concat(ivaDetr || !iva ? [{conto: '14', dareAvere: 'DARE', importo: ivaDetr, testo: 'IVA ' + ivaP + '%' + (detr < 100 ? ' detraibile al ' + detr + '%' : '')}] : [], [riga])});
    P().push({rif: rif, fornitore: i.fornitore, data: data, conto: conto, imponibile: imp, iva: iva, ivaIndetraibile: ivaIndetr, detraibile: detr, totale: r2(imp + iva), testo: testo, scadenza: scad, dal: dal, al: al, contabile: r.numero});
    n.salva(); return r;
  }
  // ── F-53: pagamento manuale a un fornitore (bonifico dalla banca), su una fattura o in acconto sul totale aperto ──
  function paga(i) {
    var n = N(), data = n.data(i.data), banca = n.contoBancario(i.banca), f = n.fornitore(i.fornitore), aperto = r2(-n.saldo('20', i.fornitore));
    if (aperto <= 0.004) throw Error(f.nome + ' non ha debiti aperti.');
    var imp = i.importo == null || i.importo === '' ? aperto : L.num(i.importo, 'Importo', 0.01);
    if (imp > aperto + 0.005) throw Error('Verso ' + f.nome + ' ci sono debiti aperti per ' + L.eur(aperto) + ' €: non si paga di più.');
    var doc = String(i.documento || '').trim();
    // Le parcelle professionali devono passare dal modulo Ritenute: qui si evita il pagamento lordo
    // e la successiva seconda estinzione dello stesso debito.
    var parcelleAperte = window.FIN4 && window.FIN4.X ? window.FIN4.X().parcelle.filter(function (p) { return p.fornitore === i.fornitore && !p.pagata; }) : [];
    if (parcelleAperte.length) throw Error('Il fornitore ha una parcella professionale ancora da pagare (' + parcelleAperte.map(function (p) { return p.rif; }).join(', ') + '). Usa Finanza → Ritenute → Paga parcella: il pagamento calcola il netto e trattiene correttamente la ritenuta.');
    if (doc) {   // la fattura indicata deve essere del fornitore scelto: evita di pagare la polizza al fornitore proposto dal modulo
      var fp = P().filter(function (x) { return String(x.rif).toUpperCase() === doc.toUpperCase() && !x.stornata; })[0];
      if (fp && fp.fornitore !== i.fornitore) {
        var g = n.fornitore(fp.fornitore);
        throw Error('La fattura ' + fp.rif + ' è di ' + g.nome + ' (' + fp.fornitore + '), non di ' + f.nome + ' (' + i.fornitore + '): scegli il fornitore ' + fp.fornitore + '.');
      }
    }
    if (doc) {   // controllo anche sul giornale: la fattura (di qualunque ciclo) con questo riferimento non può appartenere a un altro fornitore
      var altro = (S().registrazioni || []).filter(function (g) { return g.tipo !== 'PAGAMENTO_FORNITORE' && String(g.rif || '').toUpperCase() === doc.toUpperCase(); })
        .map(function (g) { return (g.righe || []).filter(function (x) { return x.conto === '20' && x.dareAvere === 'AVERE' && x.partner; })[0]; }).filter(Boolean)[0];
      if (altro && altro.partner !== i.fornitore) throw Error('La fattura ' + doc + ' è del fornitore ' + altro.partner + ', non di ' + f.nome + ' (' + i.fornitore + '): scegli il fornitore ' + altro.partner + '. Così non resta aperto il debito verso ' + altro.partner + ' e non si riduce per errore quello verso ' + f.nome + '.');
    }
    var riga = {conto: '20', dareAvere: 'DARE', importo: imp, partner: i.fornitore, testo: 'pagamento ' + (doc || 'debiti aperti')}; if (doc) riga.pareggio = doc;
    var r = n.post({data: data, tipo: 'PAGAMENTO_FORNITORE', rif: String(i.rif || '').trim() || 'F-53 ' + i.fornitore, descrizione: 'F-53 bonifico a ' + f.nome + (doc ? ' per la fattura ' + doc : '') + ': ' + L.eur(imp) + ' €',
      righe: [riga, {conto: banca, dareAvere: 'AVERE', importo: imp, testo: 'bonifico ' + f.nome}]});
    n.salva(); return r;
  }
  // ── sopravvenienza attiva: un provento non previsto (indennizzo di un'assicurazione per un sinistro) che nasce nell'esercizio ──
  // riconoscimento: D 09 Crediti verso compagnie di assicurazione / A 84 Sopravvenienze attive (indennizzo fuori campo IVA, art. 15)
  var V = function () { var s = S(); s.sopravvenienze = s.sopravvenienze || []; return s.sopravvenienze; };
  function sopravvenienza(i) {
    var n = N(), data = n.data(i.data), f = n.fornitore(i.compagnia), imp = L.num(i.importo, 'Importo dell\'indennizzo', 0.01);
    var rif = String(i.rif || '').trim() || 'SOPR-' + (V().length + 1), testo = String(i.testo || '').trim() || 'indennizzo per un sinistro';
    if (V().some(function (x) { return x.rif === rif; })) throw Error('Riferimento ' + rif + ' già usato.');
    var r = n.post({data: data, tipo: 'SOPRAVVENIENZA', rif: rif, descrizione: 'Sopravvenienza attiva ' + rif + ': ' + f.nome + ' riconosce ' + L.eur(imp) + ' € — ' + testo + ' (fuori campo IVA)',
      righe: [{conto: '09', dareAvere: 'DARE', importo: imp, partner: i.compagnia, testo: testo}, {conto: '84', dareAvere: 'AVERE', importo: imp, testo: testo}]});
    V().push({rif: rif, compagnia: i.compagnia, data: data, importo: imp, testo: testo, contabile: r.numero, incassato: null});
    n.salva(); return r;
  }
  function incassaIndennizzo(i) {
    var n = N(), data = n.data(i.data), x = V().find(function (y) { return y.rif === String(i.sopravvenienza); });
    if (!x) throw Error('Sopravvenienza ' + i.sopravvenienza + ' inesistente.'); if (x.incassato) throw Error('Indennizzo già incassato il ' + L.fd(x.incassato) + '.');
    if (data < x.data) throw Error('L\'incasso non può precedere il riconoscimento.');
    var r = n.post({data: data, tipo: 'INCASSO_INDENNIZZO', rif: x.rif, descrizione: 'Bonifico di ' + n.fornitore(x.compagnia).nome + ': incasso dell\'indennizzo ' + x.rif + ' ' + L.eur(x.importo) + ' €',
      righe: [{conto: '10', dareAvere: 'DARE', importo: x.importo}, {conto: '09', dareAvere: 'AVERE', importo: x.importo, partner: x.compagnia}]});
    x.incassato = data; n.salva(); return r;
  }
  return {fattura: fattura, elenco: F, fatturaPassiva: fatturaPassiva, passive: P, COSTI: COSTI, paga: paga, sopravvenienza: sopravvenienza, incassaIndennizzo: incassaIndennizzo, sopravvenienze: V};
})();
