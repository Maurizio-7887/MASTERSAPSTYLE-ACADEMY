/* SISTEMA INTEGRATO — Ri.Ba. salvo buon fine e factoring: due modi di trasformare un credito verso clienti in liquidità.
   Ri.Ba. (ricevuta bancaria): si presenta in banca la distinta; con l'anticipo «salvo buon fine» la banca accredita subito una parte
   (D 10 / A 36 Banca c/anticipi SBF) ma il credito resta sul cliente (11) fino alla scadenza. A buon fine: D 36 + D 10 / A 11.
   Insoluto: si restituisce l'anticipo (D 36 / A 10), si pagano le spese e il credito resta aperto.
   Factoring: pro soluto il rischio passa al factor e il credito esce subito dal cliente (D 15 / A 11); pro solvendo il credito resta
   sul cliente e l'anticipo è un debito verso il factor (D 10 / A 37). Le commissioni sono oneri finanziari (55) o bancari (58). */
window.RB4 = (function () {
  'use strict';
  var L = window.LabMotore, r2 = L.r2;
  var N = function () { return window.SD4.N; }, S = function () { return N().S; };
  var T = function () { var s = S(); s.tes = s.tes || {}; s.tes.riba = s.tes.riba || []; s.tes.factoring = s.tes.factoring || []; s.tes.anticipi = s.tes.anticipi || []; return s.tes; };
  // partita aperta del cliente (dalla tesoreria), non già impegnata in una Ri.Ba. o in un factoring attivi
  function impegnata(doc) { return T().riba.some(function (x) { return x.fattura === doc && x.stato !== 'insoluta'; }) || T().factoring.some(function (x) { return x.fattura === doc; }) || T().anticipi.some(function (x) { return x.fattura === doc && !x.estinto; }); }
  function partiteLibere(alla) { return window.TS4.partite('cliente', null, alla).filter(function (p) { return p.doc !== 'acconto' && p.aperto > 0.004 && !impegnata(p.doc); }); }
  function partita(doc, alla) {
    var p = window.TS4.partite('cliente', null, alla).find(function (x) { return x.doc === String(doc); });
    if (!p || p.aperto <= 0.004) throw Error('La fattura ' + doc + ' non è una partita aperta di un cliente.');
    if (impegnata(p.doc)) throw Error('La fattura ' + doc + ' è già in una Ri.Ba. o ceduta al factor.');
    return p;
  }
  function presentaRiba(i) {
    var n = N(), data = n.data(i.data), p = partita(i.fattura, data), scad = L.dataOk(i.scadenza || p.scadenza);
    if (scad <= data) throw Error('La scadenza della Ri.Ba. deve essere successiva alla presentazione.');
    var perc = i.anticipo == null || i.anticipo === '' ? 0 : L.num(i.anticipo, 'Anticipo %', 0), comm = i.commissione == null || i.commissione === '' ? 0 : L.num(i.commissione, 'Commissione €', 0);
    if (perc > 100) throw Error('L\'anticipo non può superare il 100%.');
    var ant = r2(p.aperto * perc / 100), numero = 'RB-' + String(n.numero('riba')).padStart(3, '0'), r = null;
    var righe = []; if (ant > 0) righe.push({conto: '10', dareAvere: 'DARE', importo: ant, testo: 'anticipo SBF ' + numero}, {conto: '36', dareAvere: 'AVERE', importo: ant, testo: 'anticipo SBF ' + numero});
    if (comm > 0) righe.push({conto: '58', dareAvere: 'DARE', importo: comm, testo: 'commissione presentazione Ri.Ba.'}, {conto: '10', dareAvere: 'AVERE', importo: comm, testo: 'commissione presentazione Ri.Ba.'});
    if (righe.length) r = n.post({data: data, tipo: 'RIBA_PRESENTAZIONE', rif: numero, descrizione: 'Distinta Ri.Ba. ' + numero + ' salvo buon fine: fattura ' + p.doc + ' di ' + p.nome + ' ' + L.eur(p.aperto) + ' scadenza ' + L.fd(scad) + (ant ? ', anticipo ' + perc + '% = ' + L.eur(ant) : ', senza anticipo'), righe: righe});
    T().riba.push({numero: numero, fattura: p.doc, cliente: p.partner, nome: p.nome, importo: p.aperto, scadenza: scad, presentata: data, anticipo: ant, perc: perc, commissione: comm, stato: 'presentata', contabile: r ? r.numero : ''});
    n.salva();
    return r || '<p class="lab-nota">Distinta ' + numero + ' presentata al solo incasso (senza anticipo): nessuna scrittura. Il credito resta sul cliente fino all\'esito.</p>';
  }
  function esitoRiba(i) {
    var n = N(), data = n.data(i.data), x = T().riba.find(function (y) { return y.numero === String(i.riba); }); if (!x) throw Error('Ri.Ba. ' + i.riba + ' inesistente.');
    if (x.stato !== 'presentata') throw Error('La Ri.Ba. ' + x.numero + ' ha già un esito (' + x.stato + ').');
    if (data < x.scadenza) throw Error('L\'esito arriva alla scadenza (' + L.fd(x.scadenza) + ') o dopo.');
    var r;
    if (i.esito === 'insoluta') {
      var sp = i.spese == null || i.spese === '' ? 0 : L.num(i.spese, 'Spese di insoluto €', 0), righe = [];
      if (x.anticipo) righe.push({conto: '36', dareAvere: 'DARE', importo: x.anticipo, testo: 'restituzione anticipo ' + x.numero}, {conto: '10', dareAvere: 'AVERE', importo: x.anticipo, testo: 'restituzione anticipo ' + x.numero});
      if (sp) righe.push({conto: '58', dareAvere: 'DARE', importo: sp, testo: 'spese insoluto'}, {conto: '10', dareAvere: 'AVERE', importo: sp, testo: 'spese insoluto'});
      r = righe.length ? n.post({data: data, tipo: 'RIBA_INSOLUTO', rif: x.numero, descrizione: 'Ri.Ba. ' + x.numero + ' INSOLUTA: ' + x.nome + ' non ha pagato ' + L.eur(x.importo) + '. Il credito resta aperto.', righe: righe}) : null;
      x.stato = 'insoluta';
    } else {
      r = n.post({data: data, tipo: 'RIBA_INCASSO', rif: x.numero, descrizione: 'Ri.Ba. ' + x.numero + ' a buon fine: incasso della fattura ' + x.fattura + ' di ' + x.nome + (x.anticipo ? ', chiude l\'anticipo SBF ' + L.eur(x.anticipo) : ''),
        righe: [{conto: '36', dareAvere: 'DARE', importo: x.anticipo, testo: 'chiusura anticipo SBF'}, {conto: '10', dareAvere: 'DARE', importo: r2(x.importo - x.anticipo), testo: 'accredito netto'},
                {conto: '11', dareAvere: 'AVERE', importo: x.importo, partner: x.cliente, pareggio: x.fattura, testo: 'Ri.Ba. ' + x.numero}]});
      x.stato = 'pagata';
    }
    x.esito = data; n.salva();
    return r || '<p class="lab-nota">Ri.Ba. ' + x.numero + ' insoluta registrata, senza movimenti di banca.</p>';
  }
  function cedi(i) {
    var n = N(), data = n.data(i.data), p = partita(i.fattura, data), pro = i.modo === 'solvendo' ? 'solvendo' : 'soluto';
    var perc = L.num(i.anticipo == null || i.anticipo === '' ? 80 : i.anticipo, 'Anticipo %', 0), cp = L.num(i.commissione == null || i.commissione === '' ? 0 : i.commissione, 'Commissione %', 0);
    if (perc > 100) throw Error('L\'anticipo non può superare il 100%.');
    var ant = r2(p.aperto * perc / 100), comm = r2(p.aperto * cp / 100), factor = String(i.factor || 'Factor Italia SpA').trim(), numero = 'FCT-' + String(n.numero('factoring')).padStart(3, '0');
    var righe = pro === 'soluto'
      ? [{conto: '15', dareAvere: 'DARE', importo: p.aperto, testo: 'credito ceduto a ' + factor}, {conto: '11', dareAvere: 'AVERE', importo: p.aperto, partner: p.partner, pareggio: p.doc, testo: 'cessione pro soluto ' + numero},
         {conto: '55', dareAvere: 'DARE', importo: comm, testo: 'commissione factoring ' + cp + '%'}, {conto: '15', dareAvere: 'AVERE', importo: comm, testo: 'commissione trattenuta dal factor'},
         {conto: '10', dareAvere: 'DARE', importo: ant, testo: 'anticipo ' + perc + '%'}, {conto: '15', dareAvere: 'AVERE', importo: ant, testo: 'anticipo dal factor'}]
      : [{conto: '10', dareAvere: 'DARE', importo: ant, testo: 'anticipo ' + perc + '%'}, {conto: '37', dareAvere: 'AVERE', importo: ant, testo: 'debito verso ' + factor},
         {conto: '55', dareAvere: 'DARE', importo: comm, testo: 'commissione factoring ' + cp + '%'}, {conto: '37', dareAvere: 'AVERE', importo: comm, testo: 'commissione dovuta al factor'}];
    var r = n.post({data: data, tipo: 'FACTORING_CESSIONE', rif: numero, descrizione: 'Factoring pro ' + pro + ' ' + numero + ' con ' + factor + ': fattura ' + p.doc + ' di ' + p.nome + ' ' + L.eur(p.aperto) + ', anticipo ' + L.eur(ant) + ', commissione ' + L.eur(comm), righe: righe});
    T().factoring.push({numero: numero, fattura: p.doc, cliente: p.partner, nome: p.nome, importo: p.aperto, scadenza: p.scadenza, modo: pro, factor: factor, anticipo: ant, perc: perc, commissione: comm, data: data, stato: 'ceduta', contabile: r.numero});
    n.salva(); return r;
  }
  // il debitore paga il factor alla scadenza: il factor liquida la differenza
  function chiudiFactoring(i) {
    var n = N(), data = n.data(i.data), x = T().factoring.find(function (y) { return y.numero === String(i.factoring); }); if (!x) throw Error('Contratto ' + i.factoring + ' inesistente.');
    if (x.stato !== 'ceduta') throw Error('Contratto ' + x.numero + ' già chiuso.');
    var saldo = r2(x.importo - x.anticipo - x.commissione), r;
    if (x.modo === 'soluto') r = n.post({data: data, tipo: 'FACTORING_INCASSO', rif: x.numero, descrizione: 'Factoring ' + x.numero + ': il cliente ha pagato il factor, che accredita il saldo ' + L.eur(saldo),
      righe: [{conto: '10', dareAvere: 'DARE', importo: saldo, testo: 'saldo dal factor'}, {conto: '15', dareAvere: 'AVERE', importo: saldo, testo: 'chiusura credito verso factor'}]});
    else r = n.post({data: data, tipo: 'FACTORING_INCASSO', rif: x.numero, descrizione: 'Factoring pro solvendo ' + x.numero + ': il cliente ha pagato il factor; si chiudono credito verso cliente e debito verso factor, saldo ' + L.eur(saldo),
      righe: [{conto: '37', dareAvere: 'DARE', importo: r2(x.anticipo + x.commissione), testo: 'chiusura debito verso factor'}, {conto: '10', dareAvere: 'DARE', importo: saldo, testo: 'saldo dal factor'},
              {conto: '11', dareAvere: 'AVERE', importo: x.importo, partner: x.cliente, pareggio: x.fattura, testo: 'incasso tramite factor'}]});
    x.stato = 'chiusa'; x.chiusa = data; n.salva(); return r;
  }
  // ── anticipo su fatture: la banca accredita una percentuale della fattura (D 10 / A 38 Banca c/anticipi su fatture), il credito resta
  //    sul cliente. Quando il cliente paga (F-28) la banca trattiene l'anticipo con gli interessi: D 38 + D 60 / A 10. ──
  function anticipoFattura(i) {
    var n = N(), data = n.data(i.data), p = partita(i.fattura, data);
    var perc = L.num(i.percentuale == null || i.percentuale === '' ? 80 : i.percentuale, 'Percentuale anticipata', 1), comm = i.commissione == null || i.commissione === '' ? 0 : L.num(i.commissione, 'Commissione €', 0);
    if (perc > 100) throw Error('La banca non anticipa più del 100% della fattura.');
    var ant = r2(p.aperto * perc / 100), numero = 'ANT-' + String(n.numero('riba')).padStart(3, '0');
    var righe = [{conto: '10', dareAvere: 'DARE', importo: r2(ant - comm), testo: 'accredito netto anticipo ' + numero}, {conto: '38', dareAvere: 'AVERE', importo: ant, testo: 'anticipo ' + perc + '% fattura ' + p.doc}];
    if (comm > 0) righe.push({conto: '58', dareAvere: 'DARE', importo: comm, testo: 'commissione anticipo fatture'});
    var r = n.post({data: data, tipo: 'ANTICIPO_FATTURE', rif: numero, descrizione: 'Anticipo su fatture ' + numero + ': fattura ' + p.doc + ' di ' + p.nome + ' ' + L.eur(p.aperto) + ' × ' + perc + '% = ' + L.eur(ant) + (comm ? ', commissione ' + L.eur(comm) : '') + ' — il credito resta sul cliente', righe: righe});
    T().anticipi.push({numero: numero, fattura: p.doc, cliente: p.partner, nome: p.nome, fatturaImporto: p.aperto, scadenza: p.scadenza, perc: perc, importo: ant, commissione: comm, data: data, contabile: r.numero, estinto: null});
    n.salva(); return r;
  }
  function estinguiAnticipo(i) {
    var n = N(), data = n.data(i.data), x = T().anticipi.find(function (y) { return y.numero === String(i.anticipo); });
    if (!x) throw Error('Anticipo ' + i.anticipo + ' inesistente.'); if (x.estinto) throw Error('Anticipo ' + x.numero + ' già estinto il ' + L.fd(x.estinto) + '.');
    if (data < x.data) throw Error('L\'estinzione non può precedere l\'anticipo.');
    var int = i.interessi == null || i.interessi === '' ? 0 : L.num(i.interessi, 'Interessi €', 0);
    var righe = [{conto: '38', dareAvere: 'DARE', importo: x.importo, testo: 'rimborso anticipo ' + x.numero}];
    if (int > 0) righe.push({conto: '60', dareAvere: 'DARE', importo: int, testo: 'interessi sull\'anticipo'});
    righe.push({conto: '10', dareAvere: 'AVERE', importo: r2(x.importo + int), testo: 'addebito per estinzione ' + x.numero});
    var r = n.post({data: data, tipo: 'ESTINZIONE_ANTICIPO', rif: x.numero, descrizione: 'Estinzione dell\'anticipo ' + x.numero + ' (fattura ' + x.fattura + '): la banca trattiene ' + L.eur(x.importo) + (int ? ' + interessi ' + L.eur(int) : ''), righe: righe});
    x.estinto = data; x.interessi = int; x.estinzione = r.numero; n.salva(); return r;
  }
  return {anticipoFattura: anticipoFattura, estinguiAnticipo: estinguiAnticipo, partiteLibere: partiteLibere, presentaRiba: presentaRiba, esitoRiba: esitoRiba, cedi: cedi, chiudiFactoring: chiudiFactoring, T: T};
})();
