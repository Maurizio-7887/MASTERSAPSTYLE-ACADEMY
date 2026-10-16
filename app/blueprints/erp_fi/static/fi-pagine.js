/* SISTEMA INTEGRATO — Contabilità: libro giornale (FB03), bilancio di verifica (F.08), fattura elettronica (SdI) e storni di tutti i moduli. */
(function () {
  'use strict';
  var L = window.LabMotore, SD = window.SD4, ST = window.ST4, U = window.S4UI, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, fd = L.fd, S = function () { return N.S; };
  var avviso = function () { return U && U.avviso ? U.avviso(S()) : ''; };
  var nomeCli = function (c) { return (S().clienti[c] || {}).nome || c; };
  var opz = function (lista, vuoto) { return lista.length ? lista : [['', vuoto || '— nessun documento —']]; };
  var PAGINE = {
    giornale: function () {
      radice.innerHTML = L.scheda('📚', 'Libro giornale', 'FB03 · S_ALR_87012287', S().registrazioni.slice().reverse().map(function (r) {
        return '<div class="lab-scr"><b>Doc. ' + r.numero + ' · ' + fd(r.data) + '</b> <span class="lab-bd blu">' + r.tipo + '</span>' + (r.stornato ? ' <span class="lab-bd arancio">stornato dal ' + r.stornato + '</span>' : '') + (r.stornoDi ? ' <span class="lab-bd giallo">storno del ' + r.stornoDi + '</span>' : '') + ' ' + e(r.descrizione) + '<ul>' + r.righe.map(function (y) {
          return '<li class="' + (y.dareAvere === 'DARE' ? 'd' : 'a') + '">' + (y.dareAvere === 'DARE' ? 'Dare' : 'Avere') + ' ' + y.conto + (y.partner ? ' · ' + y.partner : '') + (y.testo ? ' · ' + e(y.testo) : '') + ' <span>' + eur(y.importo) + '</span></li>'; }).join('') + '</ul></div>';
      }).join('') || '<p class="lab-vuoto">Nessuna scrittura.</p>');
    },
    bilancio: function () { radice.innerHTML = L.scheda('⚖️', 'Bilancio di verifica', 'F.08', L.bilancio(S())); },
    sdi: function () {
      var docs = ST.documentiVendita(), daInviare = docs.filter(function (d) { return !d.rif.sdi && !d.rif.stornata; }), sel = radice.dataset.xml || (docs.slice(-1)[0] || {}).numero;
      radice.innerHTML = avviso() + '<div class="lab-griglia">' +
        L.scheda('📤', 'Trasmissione allo SdI', 'fattura elettronica · FatturaPA', L.modulo('sd', [['fattura', 'Documento di vendita', 'select', (daInviare[0] || {}).numero, opz(daInviare.map(function (d) { return [d.numero, d.numero + ' · ' + (d.tipo === 'F2' ? 'fattura' : 'nota di credito') + ' · ' + nomeCli(d.cliente) + ' · ' + eur(d.totale)]; }), '— tutto già trasmesso —')], ['data', 'Data di invio', 'date']], [['sd', 'Invia allo SdI']]) +
          '<p class="lab-nota">In Italia la fattura esiste fiscalmente solo quando passa dal <b>Sistema di Interscambio</b> dell\'Agenzia delle Entrate. Prima dell\'invio una fattura sbagliata si <b>storna</b> (VF11) e si rifà; <b>dopo l\'invio non si annulla più</b>: si corregge con una <b>nota di credito</b> (TD04), che va anch\'essa allo SdI.</p>') +
        L.scheda('🗂️', 'Anteprima del file XML', 'FPR12 · semplificato', '<div class="lab-filtro"><label>Documento <select id="xml">' + docs.map(function (d) { return '<option' + (d.numero === sel ? ' selected' : '') + '>' + d.numero + '</option>'; }).join('') + '</select></label></div>' +
          (sel ? '<pre class="lab-xml" style="white-space:pre-wrap;font-size:.75rem;max-height:22rem;overflow:auto">' + e(ST.fatturaPA(sel)) + '</pre>' : '<p class="lab-vuoto">Nessuna fattura.</p>')) + '</div>' +
        L.scheda('📋', 'Registro delle fatture emesse', 'VF05 · stato SdI', L.tabella(['Documento', 'Tipo', 'Data', 'Cliente', 'Totale›', 'Stato SdI'], docs.map(function (d) {
          var f = d.rif; return [d.numero, d.tipo === 'F2' ? 'TD01 fattura' : 'TD04 nota di credito (' + d.tipo + ')', fd(d.data), e(nomeCli(d.cliente)), eur(d.totale),
            f.stornata ? '<span class="lab-bd arancio">stornata ' + fd(f.stornata) + ' — non trasmessa</span>' : f.sdi ? '<span class="lab-bd verde">consegnata ' + fd(f.sdi.data) + ' · id ' + f.sdi.id + '</span>' : '<span class="lab-bd giallo">da trasmettere</span>']; }), 'Nessuna fattura emessa.'));
      L.collega(radice, 'sd', {sd: ST.inviaSdi}, rendi);
      var x = radice.querySelector('#xml'); if (x) x.onchange = function () { radice.dataset.xml = this.value; rendi(); };
    },
    storni: function () {
      var s = S(), regs = s.registrazioni;
      var fatture = s.fatture.filter(function (f) { return ['F2', 'RE', 'G2'].indexOf(f.tipo) >= 0 && !f.stornata; }).map(function (f) { return [f.numero, f.numero + ' · ' + f.tipo + ' · ' + nomeCli(f.cliente) + ' · ' + eur(f.totale) + (f.sdi ? ' · già allo SdI' : '')]; })
        .concat(((s.fx || {}).documenti || []).filter(function (d) { return d.lato === 'cliente' && !d.stornata; }).map(function (d) { return [d.numero, d.numero + ' · FB70 in ' + d.valuta + ' · ' + nomeCli(d.partner)]; }));
      var conPgi = s.consegne.filter(function (c) { return c.tipo === 'LF' && c.pgi !== false && !c.fatturata; }).map(function (c) { return [c.numero, c.numero + ' · ' + c.qta + ' pz ' + c.materiale + ' · ' + nomeCli(c.cliente)]; });
      var senzaPgi = s.consegne.filter(function (c) { return c.tipo === 'LF' && c.pgi === false; }).map(function (c) { return [c.numero, c.numero + ' · ' + c.qta + ' pz ' + c.materiale + ' · ' + nomeCli(c.cliente)]; });
      var entrate = []; s.acquisti.forEach(function (o) { (o.entrate || []).forEach(function (x) { if (!x.stornato) entrate.push([x.doc, x.doc + ' · ' + L.n0(x.qta) + ' ' + o.materiale + ' · ordine ' + o.numero + ' · ' + fd(x.data)]); }); });
      var ff = s.fattureFornitore.filter(function (f) { return !f.stornata; }).map(function (f) { return [f.numero, f.numero + ' · ' + (f.rif || 's.n.') + ' · ' + eur(f.totale)]; });
      var ev = []; s.produzione.filter(function (o) { return !o.liquidazione; }).forEach(function (o) { o.eventi.forEach(function (x, k) { if (x.stornato || x.tipo === 'KGI2') return;
        ev.push([o.numero + '|' + k, o.numero + ' · ' + {'261': 'prelievo 261 ' + L.n0(x.kg) + ' kg', CO11N: 'conferma ' + L.n0((x.attrezzaggio || 0) + x.ore) + ' h', '101': 'entrata 101 ' + x.qta + ' pz'}[x.tipo] + ' · ' + fd(x.data)]); }); });
      var compiti = s.wm ? s.wm.compiti.filter(function (t) { return t.stato === 'aperto'; }).map(function (t) { return [t.numero, t.numero + ' · ' + t.tipo + ' ' + t.qta + ' ' + t.mat + ' · ' + t.da + ' → ' + t.a]; }) : [];
      var fb = regs.filter(function (r) { return ST.FB08[r.tipo] && !r.stornato && !r.stornoDi; }).map(function (r) { return [r.numero, r.numero + ' · ' + fd(r.data) + ' · ' + r.tipo + ' · ' + eur(r.righe[0].importo)]; });
      radice.innerHTML = avviso() + '<p class="lab-nota">Regola d\'oro: <b>un documento registrato non si cancella, si storna</b> con un documento nuovo a segni invertiti, che porta il riferimento al primo. E si storna <b>dalla coda</b>: se ci sono documenti successivi (incasso → fattura → uscita merci), prima si storna l\'ultimo.</p><div class="lab-griglia">' +
        L.scheda('🧾', 'Storno della fattura di vendita', 'VF11', L.modulo('vf', [['fattura', 'Fattura o nota di credito', 'select', '', opz(fatture)], ['data', 'Data dello storno', 'date']], [['vf', 'Storna', 'rosso']]) + '<p class="lab-nota">Solo se <b>non è stata trasmessa allo SdI</b> e non ha incassi. Dopo l\'invio serve una nota di credito (Vendite → Resi e note di credito).</p>') +
        L.scheda('🚚', 'Storno dell\'uscita merci', 'VL09 · movimento 602', L.modulo('vl', [['consegna', 'Consegna', 'select', '', opz(conPgi)], ['data', 'Data', 'date']], [['vl', 'Storna l\'uscita merci', 'rosso']]) + '<p class="lab-nota">Solo se la consegna non è fatturata. La merce torna in giacenza (in zona di spedizione se c\'è il WMS); il DDT si annulla.</p>') +
        L.scheda('🗑️', 'Eliminazione della consegna', 'VL02N · elimina', L.modulo('ec', [['consegna', 'Consegna senza uscita merci', 'select', '', opz(senzaPgi)], ['data', 'Data', 'date']], [['ec', 'Elimina la consegna', 'rosso']]) + '<p class="lab-nota">I compiti di prelievo aperti si annullano; la merce già in zona di spedizione torna a scaffale con un compito.</p>') +
        L.scheda('📥', 'Storno dell\'entrata merci da acquisto', 'MBST · movimento 102', L.modulo('mb', [['doc', 'Documento materiale', 'select', '', opz(entrate)], ['data', 'Data', 'date']], [['mb', 'Storna l\'entrata', 'rosso']]) + '<p class="lab-nota">Solo se la merce non è ancora fatturata dal fornitore, non è consumata e (con il WMS) è ancora in zona di ricevimento.</p>') +
        L.scheda('📄', 'Storno della fattura fornitore', 'MR8M', L.modulo('mr', [['fattura', 'Fattura fornitore', 'select', '', opz(ff)], ['data', 'Data', 'date']], [['mr', 'Storna la fattura', 'rosso']]) + '<p class="lab-nota">Solo se non è ancora pagata. Il WE/RE (22) si riapre.</p>') +
        L.scheda('🏭', 'Storni di produzione', '262 · CO13 · 102', L.modulo('pp', [['evento', 'Evento dell\'ordine', 'select', '', opz(ev)], ['data', 'Data', 'date']], [['pp', 'Storna l\'evento', 'rosso']]) + '<p class="lab-nota">Solo su ordini non ancora liquidati (CLSD). Il ferro stornato torna nell\'area di approvvigionamento; i pezzi versati escono dalla zona di ricevimento.</p>') +
        L.scheda('📋', 'Annullamento di un compito di magazzino', 'LT15', L.modulo('lt', [['compito', 'Compito aperto', 'select', '', opz(compiti)], ['motivo', 'Motivo', 'text', 'ubicazione inaccessibile']], [['lt', 'Annulla e ricrea', 'rosso']]) + '<p class="lab-nota">Il compito aperto si annulla e il sistema ne propone uno nuovo (altra ubicazione o altro quanto).</p>') +
        L.scheda('↩️', 'Storno di un documento contabile', 'FB08', L.modulo('fb', [['documento', 'Documento', 'select', '', opz(fb)], ['motivo', 'Motivo', 'select', '01', [['01', '01 storno nello stesso periodo'], ['02', '02 storno in un periodo successivo']]], ['data', 'Data', 'date']], [['fb', 'Storna il documento', 'rosso']]) +
          '<p class="lab-nota">Per incassi, pagamenti, stipendi, F24, righe dell\'estratto conto. Le scritture nate da fatture, consegne o entrate si stornano dalla loro transazione.</p>') + '</div>' +
        L.scheda('🔁', 'Documenti stornati', 'FB03 · coppie documento / storno', L.tabella(['Documento', 'Data', 'Tipo', 'Descrizione', 'Storno', 'Data storno'], regs.filter(function (r) { return r.stornato; }).map(function (r) {
          var st = regs.find(function (x) { return x.numero === r.stornato; }) || {}; return [r.numero, fd(r.data), r.tipo, e(r.descrizione), st.numero, fd(st.data)]; }), 'Nessuno storno.'));
      L.collega(radice, 'vf', {vf: ST.vf11}, rendi); L.collega(radice, 'vl', {vl: ST.vl09}, rendi); L.collega(radice, 'ec', {ec: ST.eliminaConsegna}, rendi);
      L.collega(radice, 'mb', {mb: ST.mbst}, rendi); L.collega(radice, 'mr', {mr: ST.mr8m}, rendi);
      L.collega(radice, 'pp', {pp: function (v) { var p = String(v.evento).split('|'); return ST.produzione({ordine: p[0], evento: p[1], data: v.data}); }}, rendi);
      L.collega(radice, 'lt', {lt: ST.lt15}, rendi); L.collega(radice, 'fb', {fb: function (v) { return ST.fb08({documento: v.documento, data: v.data, motivo: v.motivo === '02' ? '02 storno in un periodo successivo' : '01 storno nello stesso periodo'}); }}, rendi);
    },
  };
  PAGINE.fatture = function () {
    var FS = window.FS4, el = FS.elenco();
    radice.innerHTML = avviso() + L.scheda('🧾', 'Fattura di servizi a cliente italiano', 'FB70 · FI-AR', L.modulo('fs', [['cliente', 'Cliente', 'select', 'C200', U.clienti(S()).filter(function (c) { return !(S().clienti[c[0]] || {}).valuta || S().clienti[c[0]].valuta === 'EUR'; })],
        ['testo', 'Descrizione del servizio', 'text', 'noleggio transenne per evento'], ['imponibile', 'Imponibile €', 'num'], ['iva', 'IVA %', 'num', 22], ['scadenza', 'Scadenza del pagamento', 'date'], ['data', 'Data della fattura', 'date']], [['fs', 'Registra la fattura']]) +
        '<p class="lab-nota">D 11 Cliente (totale) / A 44 Ricavi per servizi / A 21 IVA a debito. La scadenza serve a Ri.Ba., factoring e scadenziario. Poi la fattura va trasmessa allo SdI (Contabilità → Fattura elettronica).</p>') +
      L.scheda('📋', 'Fatture di servizi emesse', 'FBL5N', L.tabella(['Fattura', 'Data', 'Cliente', 'Descrizione', 'Imponibile›', 'IVA›', 'Totale›', 'Scadenza', 'SdI'], el.map(function (f) {
        return [f.numero, fd(f.data), e(nomeCli(f.cliente)), e(f.testo), eur(f.imponibile), eur(f.iva), eur(f.totale), f.scadenza ? fd(f.scadenza) : '', f.sdi ? 'consegnata ' + fd(f.sdi.data) : 'da trasmettere']; }), 'Nessuna fattura di servizi.'));
    L.collega(radice, 'fs', {fs: FS.fattura}, rendi);
  };
  var nomeFor = function (f) { return ((S().fornitori || {})[f] || {}).nome || f; };
  PAGINE.passive = function () {
    var FS = window.FS4, el = FS.passive(), aperti = Object.keys(S().fornitori || {}).filter(function (f) { return N.saldo('20', f) < -0.004; });
    radice.innerHTML = avviso() + '<div class="lab-griglia">' +
      L.scheda('📥', 'Fattura passiva di servizi', 'FB60 · FI-AP', L.modulo('fp', [['fornitore', 'Fornitore', 'select', 'F400', U.fornitori(S())], ['rif', 'Numero della fattura del fornitore', 'text'],
        ['conto', 'Conto di costo', 'select', '83', FS.COSTI], ['testo', 'Descrizione', 'text', 'premio annuo polizza incendio e furto'], ['imponibile', 'Imponibile €', 'num'], ['iva', 'IVA % (assicurazioni: 0, esenti)', 'num', 0],
        ['dal', 'Competenza dal (facoltativo)', 'date'], ['al', 'Competenza al (facoltativo)', 'date'], ['scadenza', 'Scadenza del pagamento', 'date'], ['data', 'Data di registrazione', 'date']], [['fp', 'Registra la fattura']]) +
        '<p class="lab-nota">D conto di costo + D 14 IVA a credito / A 20 Fornitore. Il periodo di competenza non cambia la scrittura: serve a fine anno per il <b>risconto</b> (Chiusura → Ratei e risconti).</p>') +
      L.scheda('💸', 'Pagamento a un fornitore', 'F-53', L.modulo('pg', [['fornitore', 'Fornitore', 'select', aperti[0] || 'F100', U.fornitori(S())], ['documento', 'Fattura da pagare (facoltativo)', 'text'], ['importo', 'Importo (vuoto = tutto il debito aperto)', 'num'], ['data', 'Data del bonifico', 'date']], [['pg', 'Registra il pagamento']]) +
        '<p class="lab-nota">D 20 Fornitore / A 10 Banca. Per pagare più fornitori alla scadenza c\'è anche il pagamento automatico (Tesoreria → F110).</p>') + '</div>' +
      L.scheda('🏭', 'Debiti verso fornitori', 'FBL1N', L.tabella(['Fornitore', 'Nome', 'Debito aperto €›'], Object.keys(S().fornitori || {}).map(function (f) { return [f, e(nomeFor(f)), eur(-N.saldo('20', f))]; }))) +
      L.scheda('📋', 'Fatture passive di servizi', 'FBL1N', L.tabella(['Fattura', 'Data', 'Fornitore', 'Conto', 'Descrizione', 'Competenza', 'Imponibile›', 'IVA›', 'Totale›'], el.map(function (f) {
        return [e(f.rif), fd(f.data), e(nomeFor(f.fornitore)), f.conto, e(f.testo), f.dal && f.al ? fd(f.dal) + ' – ' + fd(f.al) : '', eur(f.imponibile), eur(f.iva), eur(f.totale)]; }), 'Nessuna fattura passiva di servizi.'));
    L.collega(radice, 'fp', {fp: FS.fatturaPassiva}, rendi); L.collega(radice, 'pg', {pg: FS.paga}, rendi);
  };
  PAGINE.sopravvenienze = function () {
    var FS = window.FS4, el = FS.sopravvenienze(), da = el.filter(function (x) { return !x.incassato; });
    radice.innerHTML = avviso() + '<div class="lab-griglia">' +
      L.scheda('🌩️', 'Sopravvenienza attiva: indennizzo riconosciuto', 'FB50 · A 84', L.modulo('sv', [['compagnia', 'Compagnia di assicurazione', 'select', 'F400', U.fornitori(S())], ['rif', 'Riferimento (lettera di liquidazione)', 'text'], ['testo', 'Evento', 'text', 'indennizzo per il sinistro del furgone'], ['importo', 'Importo €', 'num'], ['data', 'Data', 'date']], [['sv', 'Registra la sopravvenienza']]) +
        '<p class="lab-nota">Un provento <b>non previsto</b>: la compagnia riconosce un indennizzo. D 09 Crediti verso compagnie di assicurazione / A 84 Sopravvenienze attive. È fuori campo IVA (art. 15 DPR 633/72): nessuna fattura. Nel bilancio va tra gli «altri ricavi e proventi» (A5).</p>') +
      L.scheda('🏦', 'Incasso dell\'indennizzo', 'F-28', L.modulo('ii', [['sopravvenienza', 'Indennizzo', 'select', '', U.lista(da, function (x) { return x.rif + ' · ' + nomeFor(x.compagnia) + ' · ' + eur(x.importo); }, '— nessun indennizzo da incassare —', function (x) { return x.rif; })], ['data', 'Data dell\'accredito', 'date']], [['ii', 'Registra l\'incasso']]) +
        '<p class="lab-nota">D 10 Banca / A 09 Crediti verso compagnie di assicurazione. Il ricavo è già stato registrato al riconoscimento.</p>') + '</div>' +
      L.scheda('📋', 'Sopravvenienze attive', '', L.tabella(['Rif.', 'Data', 'Compagnia', 'Evento', 'Importo›', 'Incassato'], el.map(function (x) { return [e(x.rif), fd(x.data), e(nomeFor(x.compagnia)), e(x.testo), eur(x.importo), x.incassato ? fd(x.incassato) : 'no']; }), 'Nessuna sopravvenienza.'));
    L.collega(radice, 'sv', {sv: FS.sopravvenienza}, rendi); L.collega(radice, 'ii', {ii: FS.incassaIndennizzo}, rendi);
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.giornale)(); }
  rendi();
})();
