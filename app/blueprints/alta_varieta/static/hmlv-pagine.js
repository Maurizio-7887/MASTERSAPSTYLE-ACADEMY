/* Laboratorio «Alta varietà e disaccoppiamento» — una funzione per ogni pagina HTML del blueprint. */
(function () {
  'use strict';
  var L = window.LabMotore, H = window.HMLV, C = window.LAB_PAGINA || {};
  var M = H.avvia(C.chiave);
  var radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd;
  var S = function () { return M.S; };
  var MAT_PROD = ['SL-TAGLIO', 'SL-PIEGA', 'TR-STD', 'TR-ALTA', 'TR-PED'];

  function statoOrdine(o) {
    if (o.liquidazione) return 'CLSD';
    var s = [o.teco ? 'TECO' : 'REL'];
    if (Object.keys(o.ore).length) s.push('CNF');
    if (o.entrati) s.push(o.entrati >= o.qta ? 'DLV' : 'PDLV');
    if (o.wip) s.push('WIP');
    return s.join(' ');
  }
  var badge = function (t) { return '<span class="lab-bd ' + (t.indexOf('CLSD') === 0 ? 'grigio' : t.indexOf('DLV') >= 0 && t.indexOf('PDLV') < 0 ? 'verde' : t.indexOf('WIP') >= 0 ? 'arancio' : 'blu') + '">' + t + '</span>'; };
  var opzOrdini = function (soloAperti) {
    var l = S().ordini.filter(function (o) { return !soloAperti || (!o.liquidazione && !o.teco); });
    return l.length ? l.map(function (o) { return [o.id, o.id + ' · ' + o.mat + ' × ' + o.qta + ' · ' + statoOrdine(o)]; }) : [['', '— nessun ordine aperto —']];
  };
  function giacenze() {
    return L.tabella(['Materiale', 'Descrizione', 'Giacenza›', 'Costo std›', 'Valore›'], Object.keys(L.MATERIALI).map(function (k) {
      var g = S().giacenze[k]; return [k, e(L.MATERIALI[k].nome), L.fmtQ(g, k), eur(L.costoStd(k)), eur(g * L.costoStd(k))];
    }));
  }
  function listaOrdini() {
    return L.tabella(['Ordine', 'Materiale', 'Q.tà›', 'Aperto il', 'Stato', 'Entrati›', 'Costi effettivi›', 'Consegnato a std›', 'WIP a bilancio›'], S().ordini.map(function (o) {
      var c = H.costi(o); return [o.id, o.mat + ' <small>(' + (o.strategia || '') + ')</small>', n0(o.qta), fd(o.data), badge(statoOrdine(o)), n0(o.entrati), eur(c.effettivo), eur(c.consegnato), eur(o.wip)];
    }), 'Nessun ordine di produzione.');
  }

  var PAGINE = {
    anagrafica: function () {
      var righe = Object.keys(L.MATERIALI).map(function (k) {
        var m = L.MATERIALI[k], c = L.ciclo(k);
        var dist = m.tipo === 'ROH' ? 'acquistato' : c.comp.map(function (x) { return L.fmtQ(x.qta, x.mat) + ' ' + x.mat; }).join(' + ') + ' · ' + c.ops.map(function (x) { return x.centro + ' ' + n0(x.ore) + ' h'; }).join(' + ');
        return [k, e(m.nome), m.tipo, dist, eur(L.costoStd(k)), m.tipo === 'ROH' ? '—' : '<b>' + (S().strategie[k] || '') + '</b> <small>' + e(H.STRATEGIE[S().strategie[k]] || '') + '</small>'];
      });
      radice.innerHTML =
        L.scheda('🧾', 'Materiali, distinte e costo standard', 'MM03 · CS03 · CK11N', L.tabella(['Materiale', 'Descrizione', 'Tipo', 'Distinta e ciclo', 'Costo std €›', 'Strategia (MRP 3)'], righe) +
          '<p class="lab-nota">Tariffa di tutti i centri: ' + L.TARIFFA + ' €/h. Il telaio <b>SL-PIEGA</b> entra in tutte e tre le transenne: è lì che conviene mettere il magazzino di disaccoppiamento.</p>') +
        L.scheda('🎯', 'Strategia di pianificazione per materiale', 'MM02 · MRP 3', L.modulo('st', [
          ['mat', 'Materiale', 'select', 'SL-PIEGA', MAT_PROD.map(function (k) { return [k, k + ' — ' + L.MATERIALI[k].nome]; })],
          ['strategia', 'Gruppo di strategia', 'select', '70', Object.keys(H.STRATEGIE).map(function (k) { return [k, k + ' — ' + H.STRATEGIE[k]]; })]],
          [['strategia', 'Salva la strategia']]) +
          '<p class="lab-nota">Semilavorati: DIP (solo per il padre), 70 (a scorta, livello assieme), 10. Prodotti finiti: 10, 40, 50 (assemblo su ordine cliente), 20 (su ordine).</p>') +
        L.scheda('♻️', 'Ricomincia il laboratorio', '', '<p class="lab-nota">Cancella ordini, movimenti e scritture di questo laboratorio (non tocca il simulatore principale).</p><button type="button" class="lab-btn rosso" id="azzera">Azzera il laboratorio</button>');
      L.collega(radice, 'st', {strategia: H.impostaStrategia}, rendi);
      radice.querySelector('#azzera').onclick = function () { if (confirm('Azzerare il laboratorio Alta varietà?')) { M.azzera(); rendi(); } };
    },
    ordini: function () {
      radice.innerHTML =
        '<div class="lab-griglia">' +
        L.scheda('🚚', 'Acquisti: entrata ferro', 'MIGO 101', L.modulo('fe', [['data', 'Data', 'date'], ['kg', 'Kg', 'num'], ['rif', 'Riferimento DDT', 'text']], [['ferro', 'Registra entrata']])) +
        L.scheda('🆕', 'Crea ordine di produzione', 'CO01', L.modulo('co', [['mat', 'Materiale', 'select', 'SL-PIEGA', MAT_PROD.map(function (k) { return [k, k + ' — strategia ' + S().strategie[k]]; })], ['qta', 'Quantità (pz)', 'num'], ['data', 'Data', 'date']], [['crea', 'Crea e rilascia']])) +
        '</div><div class="lab-griglia">' +
        L.scheda('📤', 'Prelievo componenti', 'MIGO 261', L.modulo('pr', [['ordine', 'Ordine', 'select', '', opzOrdini(true)], ['mat', 'Componente', 'select', '', ['FERRO', 'SL-TAGLIO', 'SL-PIEGA']], ['qta', 'Quantità', 'num'], ['data', 'Data', 'date']], [['prel', 'Registra prelievo']])) +
        L.scheda('⏱️', 'Conferma ore reali', 'CO11N', L.modulo('cf', [['ordine', 'Ordine', 'select', '', opzOrdini(true)], ['ore', 'Ore reali', 'num'], ['data', 'Data', 'date']], [['conf', 'Registra conferma']]) + '<p class="lab-nota">Scrivi le ore REALI, non quelle standard.</p>') +
        L.scheda('📥', 'Entrata da ordine', 'MIGO 101', L.modulo('en', [['ordine', 'Ordine', 'select', '', opzOrdini(true)], ['qta', 'Quantità', 'num'], ['data', 'Data', 'date']], [['entr', 'Registra entrata']])) +
        L.scheda('🔒', 'Chiusura tecnica', 'TECO', L.modulo('tc', [['ordine', 'Ordine', 'select', '', opzOrdini(true)], ['data', 'Data TECO', 'date']], [['teco', 'Chiudi tecnicamente']])) +
        '</div>' +
        L.scheda('📑', 'Lista ordini', 'COOIS', listaOrdini()) + L.scheda('🏬', 'Giacenze', 'MB52', giacenze());
      L.collega(radice, 'fe', {ferro: H.entrataFerro}, rendi);
      L.collega(radice, 'co', {crea: H.creaOrdine}, rendi);
      L.collega(radice, 'pr', {prel: H.prelievo}, rendi);
      L.collega(radice, 'cf', {conf: H.conferma}, rendi);
      L.collega(radice, 'en', {entr: H.entrata}, rendi);
      L.collega(radice, 'tc', {teco: H.teco}, rendi);
    },
    vendite: function () {
      var oc = S().ordiniCliente;
      radice.innerHTML =
        '<div class="lab-griglia">' +
        L.scheda('📋', 'Ordine cliente', 'VA01', L.modulo('va', [['cliente', 'Cliente', 'text'], ['rif', 'Riferimento', 'text'], ['mat', 'Transenna', 'select', 'TR-STD', L.FINITI], ['qta', 'Quantità', 'num'], ['data', 'Data', 'date']], [['va', 'Salva e controlla ATP']])) +
        L.scheda('🚚', 'Consegna al cliente', 'VL01N · 601', L.modulo('dd', [['ordineCliente', 'Ordine cliente', 'select', '', oc.length ? oc.map(function (c) { return [c.id, c.rif + ' · ' + c.cliente + ' · ' + c.mat + ' × ' + c.qta + ' (consegnati ' + c.consegnati + ')']; }) : [['', '— nessun ordine —']]], ['qta', 'Quantità', 'num'], ['data', 'Data', 'date']], [['dd', 'Registra uscita merci']])) +
        '</div>' +
        L.scheda('🔍', 'Disponibilità (ATP) per transenna', 'CO09', L.tabella(['Transenna', 'Ordinato dai clienti›', 'Consegnato›', 'A magazzino›', 'In produzione›', 'Da coprire con assemblaggio›'], L.FINITI.map(function (m) {
          var ord = oc.filter(function (c) { return c.mat === m; }), q = ord.reduce(function (t, c) { return t + c.qta; }, 0), cons = ord.reduce(function (t, c) { return t + c.consegnati; }, 0);
          var prod = S().ordini.filter(function (o) { return o.mat === m && !o.chiusoLogistica; }).reduce(function (t, o) { return t + o.qta - o.entrati; }, 0);
          return [m, n0(q), n0(cons), n0(S().giacenze[m]), n0(prod), n0(H.domandaScoperta(m))];
        })) + '<p class="lab-nota">Telai SL-PIEGA a scaffale: <b>' + n0(S().giacenze['SL-PIEGA']) + '</b> — con il disaccoppiamento il cliente aspetta solo la saldatura.</p>') +
        L.scheda('⏳', 'Ordini cliente e lead time', 'VA05', L.tabella(['Ordine', 'Rif.', 'Cliente', 'Transenna', 'Q.tà›', 'Ordinato il', 'Consegnato il', 'Lead time›'], oc.map(function (c) {
          var lt = H.leadTime().find(function (x) { return x.rif === c.rif; });
          return [c.id, e(c.rif), e(c.cliente), c.mat, n0(c.qta), fd(c.data), lt ? fd(lt.consegna) : '—', lt ? lt.giorni + ' gg' : '—'];
        }), 'Nessun ordine cliente.'));
      L.collega(radice, 'va', {va: H.venditaCrea}, rendi);
      L.collega(radice, 'dd', {dd: H.consegna}, rendi);
    },
    chiusura: function () {
      var liquidati = S().ordini.filter(function (o) { return o.liquidazione; });
      radice.innerHTML =
        L.scheda('📆', 'Chiusura di periodo', 'CO88 = KKAX + KKS2 + KO88', L.modulo('ch', [['periodo', 'Periodo (AAAA-MM)', 'text', '']], [['chiudi', 'Esegui chiusura del periodo']]) +
          '<p class="lab-nota">Per ogni ordine: se è ancora aperto il saldo diventa <b>WIP</b> (D 15 / A 74); se è finito (DLV o TECO) il WIP si storna e si calcola la <b>varianza</b> per categoria (D 61 / A 73), poi l\'ordine è liquidato (CLSD). Si chiude il periodo, non l\'ordine.</p>') +
        L.scheda('🗓️', 'Periodi chiusi', '', L.tabella(['Periodo', 'Ordine', 'Materiale', 'Esito', 'WIP prima›', 'WIP dopo›', 'Varianza›'], S().periodi.reduce(function (t, p) {
          return t.concat(p.righe.map(function (x) { return [p.periodo, x.ordine, x.mat, x.esito, eur(x.wipPrima), eur(x.wip), x.varianza == null ? '—' : eur(x.varianza)]; }));
        }, []), 'Nessun periodo chiuso.')) +
        L.scheda('🔬', 'Varianze per categoria degli ordini liquidati', 'KKS2', liquidati.length ? liquidati.map(function (o) {
          return '<h3 class="lab-h3">Ordine ' + o.id + ' · ' + o.mat + ' × ' + o.qta + ' — totale ' + eur(o.liquidazione.varianza) + ' € (' + o.liquidazione.periodo + ')</h3>' +
            L.tabella(['Categoria', 'Standard', 'Effettivo', 'Varianza €›'], o.liquidazione.categorie.map(function (c) { return [e(c.cat), c.std, c.eff, eur(c.varianza)]; }));
        }).join('') : '<p class="lab-vuoto">Nessun ordine liquidato.</p>');
      L.collega(radice, 'ch', {chiudi: H.chiusura}, rendi);
    },
    cruscotto: function () {
      var rif = (radice.dataset.rif) || H.ultimaData(), k = H.kpi(rif);
      var par = JSON.parse(radice.dataset.buffer || '{"adu":20,"dlt":15,"ltf":0.5,"vf":0.5,"moq":200,"doc":10}');
      var b; try { b = H.buffer(par); } catch (er) { b = null; }
      var ritardo = parseInt(radice.dataset.ritardo || '0', 10), lungo = H.commessaLunga(ritardo);
      var barra = b ? (function () {
        var tot = Math.max(b.cimaVerde, b.nfp) * 1.1 || 1, pc = function (x) { return (x / tot * 100).toFixed(2) + '%'; };
        return '<div class="lab-buffer"><span class="z r" style="width:' + pc(b.rosso) + '"></span><span class="z g" style="width:' + pc(b.giallo) + '"></span><span class="z v" style="width:' + pc(b.verde) + '"></span>' +
          '<span class="nfp" style="left:' + pc(Math.max(0, b.nfp)) + '" title="NFP ' + n0(b.nfp) + '">▼ NFP ' + n0(b.nfp) + '</span></div>';
      })() : '';
      radice.innerHTML =
        '<div class="lab-filtro"><label>Data di riferimento <input type="date" id="rif" value="' + rif + '"></label></div>' +
        '<div class="lab-kpi">' +
        '<div><span>Ordini aperti</span><b>' + k.aperti.length + '</b><small>' + (k.aperti.filter(function (o) { return o.eta > 90; }).length ? '⚠ oltre 90 giorni: errore di modello' : 'nessuno oltre 90 giorni') + '</small></div>' +
        '<div><span>WIP (ordini aperti)</span><b>' + eur(k.wip) + '</b><small>€ alla data</small></div>' +
        '<div><span>WIP in giorni</span><b>' + (k.wipGiorni == null ? 'n.d.' : n0(k.wipGiorni)) + '</b><small>WIP / costo del venduto giornaliero (' + eur(k.cdvGiorno) + ')</small></div>' +
        '<div><span>Telai SL-PIEGA a scaffale</span><b>' + n0(k.giacenzaSL) + '</b><small>copertura ' + (k.coperturaSL == null ? 'n.d.' : n0(k.coperturaSL) + ' giorni') + '</small></div>' +
        '</div>' +
        L.scheda('⏳', 'Anzianità degli ordini aperti', 'COOIS', L.tabella(['Ordine', 'Materiale', 'Giorni›', 'Fascia', 'WIP gestionale›'], k.aperti.map(function (o) {
          return {cls: o.eta > 90 ? 'allarme' : '', celle: [o.id, o.mat, o.eta, o.fascia, eur(o.wip)]}; }), 'Nessun ordine aperto alla data.')) +
        L.scheda('🛟', 'Buffer DDMRP sul telaio SL-PIEGA', 'Demand Driven MRP', L.modulo('bf', [
          ['adu', 'ADU (pz/giorno)', 'num', par.adu], ['dlt', 'DLT (giorni)', 'num', par.dlt], ['ltf', 'LTF (fattore lead time)', 'num', par.ltf], ['vf', 'VF (variabilità)', 'num', par.vf],
          ['moq', 'MOQ (lotto minimo)', 'num', par.moq], ['doc', 'Ciclo d\'ordine (giorni)', 'num', par.doc],
          ['giacenza', 'Giacenza (vuoto = dal laboratorio)', 'num', par.giacenza == null ? '' : par.giacenza], ['inArrivo', 'In arrivo (vuoto = ordini aperti)', 'num', par.inArrivo == null ? '' : par.inArrivo],
          ['domanda', 'Domanda qualificata (vuoto = calcolata)', 'num', par.domanda == null ? '' : par.domanda]],
          [['calcola', 'Ricalcola'], ['esempio', 'Esempio del documento', 'sec']]) +
          (b ? barra + L.tabella(['Zona', 'Calcolo', 'Pezzi›', 'Cima›'], [
            ['Rosso base', 'ADU × DLT × LTF', n0(b.rossoBase), '—'], ['Rosso sicurezza', 'rosso base × VF', n0(b.rossoSic), '—'], ['Rosso', '', n0(b.rosso), n0(b.cimaRosso)],
            ['Giallo', 'ADU × DLT', n0(b.giallo), n0(b.cimaGiallo)], ['Verde', 'max(ADU×DLT×LTF; MOQ; ADU×ciclo)', n0(b.verde), n0(b.cimaVerde)]]) +
            '<p class="lab-nota">NFP = giacenza ' + n0(b.giacenza) + ' + in arrivo ' + n0(b.inArrivo) + ' − domanda qualificata ' + n0(b.domanda) + ' = <b>' + n0(b.nfp) + '</b> → zona <b>' + b.zona + '</b>, priorità ' + n0(b.priorita) + '% del buffer. ' +
            (b.ordina ? '<b>Ordina ' + n0(b.ordina) + ' pz</b> (fino alla cima verde).' : 'Nessun riordino.') + ' Giacenza media attesa ≈ rosso + verde/2 = ' + n0(b.mediaAttesa) + ' pz.</p>' : '')) +
        L.scheda('⚖️', 'Confronto con la «commessa lunga» (un solo ordine dal ferro al finito)', 'errore di modello', lungo ? (
          '<div class="lab-filtro"><label>I clienti ordinano con un ritardo di <input type="range" min="0" max="6" id="rit" value="' + ritardo + '"> <b>' + ritardo + ' mesi</b></label></div>' +
          L.tabella(['Fine mese', 'WIP con ordini per livello›', 'WIP con commessa lunga›', 'Età della commessa›'], lungo.mesi.map(function (x) {
            return [x.periodo, x.wipCorretto == null ? '(periodo non chiuso)' : eur(x.wipCorretto), eur(x.wipLungo), x.etaGiorni + ' gg']; })) +
          '<p class="lab-nota">Con la commessa lunga i telai non vanno mai a scaffale: tutto resta WIP finché il cliente non ordina, e alla fine c\'è <b>una sola varianza</b> (' + eur(lungo.varianzaUnica) + ' €) che mescola taglio, piegatura e saldatura. ' +
          'Con un ordine per livello ogni varianza ha un nome (vedi Chiusura di periodo) e i telai sono rimanenze a costo standard, non WIP.</p>') : '<p class="lab-vuoto">Servono i primi movimenti di produzione.</p>');
      radice.querySelector('#rif').onchange = function () { radice.dataset.rif = this.value; rendi(); };
      var rit = radice.querySelector('#rit'); if (rit) rit.oninput = function () { radice.dataset.ritardo = this.value; rendi(); };
      L.collega(radice, 'bf', {
        calcola: function (v) { radice.dataset.buffer = JSON.stringify(v); setTimeout(rendi, 0); return '<p class="lab-nota">Buffer ricalcolato.</p>'; },
        esempio: function () { radice.dataset.buffer = JSON.stringify({adu: 20, dlt: 15, ltf: 0.5, vf: 0.5, moq: 200, doc: 10, giacenza: 260, inArrivo: 150, domanda: 40}); setTimeout(rendi, 0); return '<p class="lab-nota">Esempio della relazione: SL-100.</p>'; },
      });
    },
    giornale: function () {
      radice.innerHTML = '<div class="lab-griglia">' + L.scheda('📚', 'Libro giornale del laboratorio', 'FB03', L.giornale(S())) +
        L.scheda('⚖️', 'Bilancio di verifica', 'F.08', L.bilancio(S())) + '</div>' + L.scheda('🏬', 'Giacenze', 'MB52', giacenze());
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.ordini)(); }
  rendi();
})();
