/* SISTEMA INTEGRATO — Spedizione: monitor delle consegne (VL06O), lista di prelievo, imballo con SSCC, trasporti e carico, DDT. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, WM = window.WM4, SP = window.SP4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var uscita = function () { return S().consegne.filter(function (c) { return c.tipo === 'LF'; }); };
  var aperte = function () { return uscita().filter(function (c) { return c.pgi === false; }); };
  var bollo = function (s) { return '<span class="lab-bd ' + (s === 'C' ? 'verde' : s === 'B' ? 'giallo' : s ? 'grigio' : '') + '">' + (s || '—') + '</span>'; };
  var etich = function (c) { return c.numero + ' · ' + U.nome(S(), c.cliente) + ' · ' + n0(c.qta) + ' ' + c.materiale; };
  var nonAttivo = function () { return WM.attivo() ? '' : '<div class="lab-esito ko">⚠ Il WMS non è attivo: le consegne escono subito (senza prelievo, imballo e carico). Attivalo da Magazzino → Struttura.</div>'; };
  var scegli = function (lista, chiave) {
    var sel = radice.dataset[chiave] || (lista[0] || {}).numero || '';
    return {sel: sel, html: '<div class="lab-filtro no-stampa"><label>Consegna <select id="sc">' + lista.map(function (c) { return '<option value="' + c.numero + '"' + (c.numero === sel ? ' selected' : '') + '>' + e(etich(c)) + (c.ddt ? ' · DDT ' + c.ddt : '') + '</option>'; }).join('') + '</select></label> <button type="button" class="lab-btn" id="stampa">🖨️ Stampa</button></div>'};
  };
  var legaScelta = function (chiave) { var s = radice.querySelector('#sc'); if (s) s.onchange = function () { radice.dataset[chiave] = this.value; rendi(); }; var b = radice.querySelector('#stampa'); if (b) b.onclick = function () { window.print(); }; };
  // ── vista 3D del camion (three.js r128 nella cartella vendor del blueprint, caricato solo al primo uso) ──
  var base3d = (function () { var s0 = Array.prototype.slice.call(document.scripts).map(function (x) { return x.src || ''; }).filter(function (x) { return /\/sp-pagine\.js/.test(x); })[0] || ''; return s0.replace(/sp-pagine\.js.*$/, ''); })();
  var librerie3d = null;
  function carica3d() {
    if (window.Load3D && window.THREE && window.THREE.OrbitControls) return Promise.resolve();
    if (librerie3d) return librerie3d;
    var uno = function (src) { return new Promise(function (ok, ko) { var x = document.createElement('script'); x.src = base3d + src; x.onload = ok; x.onerror = function () { ko(Error('File 3D non caricato: ' + src)); }; document.head.appendChild(x); }); };
    librerie3d = uno('vendor/three-0.128.0.min.js').then(function () { return uno('vendor/OrbitControls-0.128.0.js'); }).then(function () { return uno('piano-3d.js'); });
    librerie3d.catch(function () { librerie3d = null; });
    return librerie3d;
  }
  function dati3d(p, t, colori) {
    var hex = function (c) { return parseInt(String(c).replace('#', ''), 16); }, col = function (k) { return hex(colori[Math.max(0, t.consegne.indexOf(k)) % colori.length]); };
    var colli = [];
    p.posti.forEach(function (q) {
      var su = 0;
      (q.strati || []).forEach(function (st, z) {
        colli.push({codice: 'Posto ' + q.n + (q.strati.length > 1 ? (z ? ' · sopra' : ' · sotto') : '') + ' · SSCC ' + st.sscc, x_mm: q.y * 10, y_mm: q.x * 10, lunghezza_mm: q.lung * 10, larghezza_mm: q.larg * 10,
          altezza_mm: st.alt * 10, base_mm: su * 10, pedana_mm: st.pedana * 10, colore: col(st.consegna), testo: st.materiale + ' · ' + n0(st.peso) + ' kg · consegna ' + st.consegna});
        su += st.alt;
      });
    });
    var fuori = [];
    p.scarti.forEach(function (s0) { (s0.pezzi || []).forEach(function (c) { fuori.push({codice: 'SSCC ' + c.sscc, lunghezza_mm: c.lung * 10, larghezza_mm: c.larg * 10, altezza_mm: c.alt * 10, pedana_mm: c.pedana * 10, motivo: s0.motivo}); }); });
    return {veicolo: {piano_lunghezza_mm: p.v.lung * 10, piano_larghezza_mm: p.v.larg * 10, altezza_mm: p.v.alt * 10, tipo: p.veicolo === 'FURGONE' ? 'furgone' : 'camion'}, colli: colli, non_allocati: fuori};
  }
  function vista3d(p, t, colori) {
    var box = radice.querySelector('#truck-3d'), msg = radice.querySelector('#msg-3d'); if (!box) return;
    carica3d().then(function () {
      if (!window.Load3D.init(box)) { if (msg) msg.textContent = '⚠ ' + (window.Load3D.motivoIndisponibile() || '3D non disponibile') + ' Usa la vista dall’alto.'; return; }
      window.Load3D.aggiorna(dati3d(p, t, colori));
      radice.querySelectorAll('[data-v3]').forEach(function (b) { b.onclick = function () { var r = window.Load3D[b.getAttribute('data-v3')](); if (typeof r === 'string') b.textContent = (b.getAttribute('data-v3') === 'impostaTetto' ? 'tetto: ' : 'pareti: ') + r; }; });
    }, function (err) { if (msg) msg.textContent = '⚠ ' + err.message + ' Usa la vista dall’alto.'; });
  }
  var PAGINE = {
    monitor: function () {
      radice.innerHTML = nonAttivo() +
        L.scheda('🚚', 'Monitor delle consegne in uscita', 'VL06O · /SCWM/PRDO', L.tabella(['Consegna', 'Data', 'Cliente', 'Destinazione', 'Materiale', 'Q.tà›', 'Prelievo', 'Imballo', 'Trasporto', 'Carico', 'Uscita merci', 'DDT', 'Fattura'], uscita().slice().reverse().map(function (c) {
          var s = SP.stato(c), cli = S().clienti[c.cliente] || {};
          return [c.numero, fd(c.data), e(cli.nome || c.cliente), e(cli.regione || ''), c.materiale, n0(c.qta), bollo(s.prelievo), bollo(c.wm ? s.imballo : ''), s.trasporto, bollo(c.wm ? s.carico : ''), bollo(s.uscita) + (c.pgi ? ' ' + fd(c.pgi) : ''), s.ddt, bollo(s.fattura)]; }), 'Nessuna consegna.') +
          '<p class="lab-nota">Stati come in SAP: <b>A</b> da fare · <b>B</b> in parte · <b>C</b> completato. Il flusso: prelievo → imballo → trasporto e carico → uscita merci (DDT) → fattura. Le consegne di gennaio e febbraio sono uscite senza WMS.</p>') +
        L.scheda('🔢', 'Che cosa fare adesso', '', '<ul class="lab-elenco">' + (aperte().map(function (c) { var s = SP.stato(c);
          var cosa = s.prelievo !== 'C' ? 'conferma i compiti di prelievo con la pistola RF' : s.imballo !== 'C' ? 'imballa (Spedizione → Imballo)' : !s.trasporto ? 'crea il trasporto' : s.carico !== 'C' ? 'carica i colli (RF → Carico)' : 'registra la partenza e l\'uscita merci';
          return '<li><b>' + c.numero + '</b> ' + e(U.nome(S(), c.cliente)) + ': ' + cosa + '.</li>'; }).join('') || '<li>Nessuna consegna aperta.</li>') + '</ul>');
    },
    prelievo: function () {
      var lista = uscita().filter(function (c) { return c.wm; }), sc = scegli(lista, 'cp'), c = lista.find(function (x) { return x.numero === sc.sel; });
      if (!c) { radice.innerHTML = nonAttivo() + '<p class="lab-vuoto">Nessuna consegna gestita a magazzino: crea la consegna da Vendite → Consegne (con il WMS attivo).</p>'; return; }
      var p = WM.statoPrelievo(c), cli = S().clienti[c.cliente];
      radice.innerHTML = sc.html + L.scheda('📋', 'LISTA DI PRELIEVO · consegna ' + c.numero, 'LT21 · /SCWM/PRDO · magazzino W100', '<p>Cliente <b>' + e(cli.nome) + '</b> (' + e(cli.regione) + ') · ordine ' + c.ordine + ' · ' + n0(c.qta) + ' pz ' + c.materiale + ' · data ' + fd(c.data) + ' · stato prelievo <b>' + p.stato + '</b></p>' +
        L.tabella(['Compito', 'Da ubicazione', 'UdC', 'Materiale', 'Da prelevare›', 'Prelevato›', 'A', 'Esito', 'Firma'], p.compiti.map(function (t) {
          return [t.numero, '<b>' + t.da + '</b>', t.udc, t.mat, n0(t.qta), t.stato === 'confermato' ? n0(t.qtaEff) : '', t.a, t.stato === 'confermato' ? (t.diff ? 'differenza ' + n0(t.diff) : '✓ ' + e(t.risorsa)) : '', '']; })) +
        '<p class="lab-nota">Percorso FIFO: prima i pallet entrati prima. Le righe nate da una differenza hanno il compito d\'origine nel monitor. Prelievo con la pistola: Magazzino → Pistola RF → Compiti.</p>');
      legaScelta('cp');
    },
    imballo: function () {
      var da = aperte().filter(function (c) { return c.wm && SP.stato(c).prelievo === 'C' && SP.stato(c).imballo !== 'C'; });
      var tutte = uscita().filter(function (c) { return SP.colliDi(c.numero).length; }), sel = radice.dataset.ci || (tutte.slice(-1)[0] || {}).numero;
      var colli = sel ? SP.colliDi(sel) : [];
      radice.innerHTML = nonAttivo() + '<div class="lab-griglia no-stampa">' +
        L.scheda('📦', 'Imballa la consegna', 'VL02N Imballaggio · /SCWM/PACK', L.modulo('im', [['consegna', 'Consegna prelevata', 'select', '', U.lista(da, etich, '— nessuna consegna da imballare —')],
          ['imballo', 'Materiale d\'imballo', 'select', 'EUR', Object.keys(SP.IMBALLI).map(function (k) { var im = SP.imballi()[k]; return [k, im.nome + ' · ' + im.lung + '×' + im.larg + ' cm · tara ' + im.tara + ' kg']; })],
          ['perCollo', 'Pezzi per collo (vuoto = quelli della regola)', 'num'], ['data', 'Data', 'date']], [['im', 'Crea i colli (SSCC)']]) +
          '<p class="lab-nota">Quanti pezzi stanno in un collo lo dice la <b>regola di confezionamento</b> (Spedizione → Imballi, regole e veicoli): per esempio TR-STD su pallet EUR = ' + (SP.regola('TR-STD', 'EUR') || {}).pezzi + ' pezzi.</p>') +
        L.scheda('🏷️', 'Che cos\'è l\'SSCC', 'GS1', '<p class="lab-nota">Il <b>Serial Shipping Container Code</b> identifica ogni collo in tutta la catena: 18 cifre = estensione + prefisso aziendale GS1 + numero progressivo + cifra di controllo. Si legge con il codice a barre GS1-128 «(00)». Qui il prefisso 8012345 è di fantasia.</p>') + '</div>' +
        (tutte.length ? '<div class="lab-filtro no-stampa"><label>Etichette della consegna <select id="ci">' + tutte.map(function (c) { return '<option value="' + c.numero + '"' + (c.numero === sel ? ' selected' : '') + '>' + e(etich(c)) + '</option>'; }).join('') + '</select></label> <button type="button" class="lab-btn" id="stampa">🖨️ Stampa le etichette</button></div>' +
          L.scheda('📦', 'Colli della consegna ' + sel, 'HU · SSCC', L.tabella(['SSCC', 'Imballo', 'Pezzi›', 'Peso netto kg›', 'Tara kg›', 'Peso lordo kg›', 'Caricato'], colli.map(function (x) { return [x.sscc, SP.IMBALLI[x.imballo].nome, n0(x.qta), n0(x.pesoNetto), n0(x.tara), n0(x.pesoLordo), x.caricato ? fd(x.caricato) + ' · trasp. ' + x.trasporto : '']; }))) +
          '<div class="s4-ets">' + colli.map(function (x, k) { var c = S().consegne.find(function (y) { return y.numero === x.consegna; }), cli = S().clienti[c.cliente];
            return window.S4Etichette.etichetta(x.sscc, 'SSCC (00) · collo ' + (k + 1) + ' di ' + colli.length, e(cli.nome) + ' · ' + e(cli.regione) + '<br>' + x.qta + ' pz ' + x.materiale + ' · ' + n0(x.pesoLordo) + ' kg · consegna ' + x.consegna, true); }).join('') + '</div>' : '');
      L.collega(radice, 'im', {im: function (v) { var r = SP.imballa(v); radice.dataset.ci = v.consegna; return r; }}, rendi);
      var s = radice.querySelector('#ci'); if (s) s.onchange = function () { radice.dataset.ci = this.value; rendi(); };
      var b = radice.querySelector('#stampa'); if (b) b.onclick = function () { window.print(); };
    },
    trasporti: function () {
      var libere = aperte().filter(function (c) { return !SP.stato(c).trasporto; }), tr = SP.SP().trasporti;
      var daPartire = tr.filter(function (t) { return !t.partenza; });
      radice.innerHTML = nonAttivo() + '<div class="lab-griglia">' +
        L.scheda('🚛', 'Crea il trasporto', 'VT01N', L.modulo('vt', [['consegne', 'Consegne (numeri separati da virgola)', 'text', libere.map(function (c) { return c.numero; }).join(', ')],
          ['vettore', 'Vettore', 'select', 'V10', Object.keys(SP.VETTORI).map(function (k) { return [k, k + ' — ' + SP.VETTORI[k]]; })], ['targa', 'Targa del mezzo', 'text'], ['autista', 'Autista', 'text'],
          ['porto', 'Porto', 'select', 'franco', [['franco', 'franco (trasporto pagato dal mittente)'], ['assegnato', 'assegnato (pagato dal destinatario)']]], ['data', 'Data di carico', 'date'],
          ['veicolo', 'Veicolo (facoltativo, serve al piano di carico)', 'select', '', [['', '— da decidere —']].concat(Object.keys(SP.VEICOLI).map(function (k) { var v = SP.veicoli()[k]; return [k, v.nome + ' · ' + v.lung + '×' + v.larg + ' cm · ' + n0(v.portata) + ' kg']; }))]], [['vt', 'Crea trasporto']]) +
          '<p class="lab-nota">Consegne libere: ' + (libere.map(function (c) { return c.numero + ' (' + e(U.nome(S(), c.cliente)) + ')'; }).join(', ') || 'nessuna') + '. Più consegne sullo stesso camion = un giro di consegna; ogni destinatario avrà il suo DDT.</p>') +
        L.scheda('📥', 'Carico (da scrivania)', 'VT02N · alla porta di spedizione', L.modulo('ca', [['sscc', 'SSCC letto sul collo', 'text'], ['data', 'Data', 'date']], [['ca', 'Carica il collo']]) + '<p class="lab-nota">In magazzino si carica con la pistola: Magazzino → Pistola RF → Carico. Un collo di un\'altra consegna viene rifiutato.</p>') +
        L.scheda('🏁', 'Fine carico e uscita merci', 'VT02N · 601', L.modulo('pt', [['trasporto', 'Trasporto', 'select', '', U.lista(daPartire, function (t) { return t.numero + ' · ' + SP.VETTORI[t.vettore] + ' · ' + t.consegne.join(', ') + ' · ' + t.stato; }, '— nessun trasporto da far partire —')], ['data', 'Data di partenza', 'date']], [['pt', 'Registra la partenza e l\'uscita merci']]) +
          '<p class="lab-nota">Per ogni consegna: uscita merci 601 dalla zona di spedizione (D 41 / A 13) e numero di DDT.</p>') + '</div>' +
        L.scheda('📋', 'Trasporti', 'VT11 · /SCWM/TU', L.tabella(['Trasporto', 'Data', 'Vettore', 'Targa', 'Autista', 'Porto', 'Consegne', 'Colli caricati', 'Stato'], tr.map(function (t) {
          var col = t.consegne.reduce(function (a, k) { return a.concat(SP.colliDi(k)); }, []);
          return [t.numero, fd(t.data), SP.VETTORI[t.vettore], e(t.targa), e(t.autista), t.porto, t.consegne.join(', '), col.filter(function (x) { return x.caricato; }).length + ' / ' + col.length, t.partenza ? 'partito ' + fd(t.partenza) : t.stato]; }), 'Nessun trasporto.'));
      L.collega(radice, 'vt', {vt: SP.creaTrasporto}, rendi); L.collega(radice, 'ca', {ca: SP.carica}, rendi); L.collega(radice, 'pt', {pt: SP.parti}, rendi);
    },
    imballi: function () {
      var IM = SP.imballi(), VE = SP.veicoli(), mats = Object.keys(S().materiali).filter(function (m) { return S().materiali[m].tipo !== 'ROH'; });
      var siNo = [['si', 'sì: altri colli possono stare sopra'], ['no', 'no: niente sopra']];
      radice.innerHTML = '<div class="lab-esito dep-idea">📐 <b>PRIMA DI CARICARE BISOGNA CONOSCERE LE MISURE.</b> Quanto è grande un pallet o una cassa, quanti pezzi ci stanno, quanto pesa il collo pieno e quanto è grande il camion: con questi numeri il programma calcola il <b>piano di carico</b>.</div>' +
        '<div class="lab-griglia">' +
        L.scheda('1️⃣', 'Imballo: pallet o cassa', 'misure in cm · pesi in kg', L.modulo('ib', [['imballo', 'Imballo', 'select', radice.dataset.ib || 'EUR', Object.keys(IM).map(function (k) { return [k, IM[k].nome]; })],
          ['lung', 'Lunghezza (cm)', 'num', IM[radice.dataset.ib || 'EUR'].lung], ['larg', 'Larghezza (cm)', 'num', IM[radice.dataset.ib || 'EUR'].larg], ['alt', 'Altezza dell’imballo vuoto (cm)', 'num', IM[radice.dataset.ib || 'EUR'].alt],
          ['tara', 'Tara: peso dell’imballo vuoto (kg)', 'num', IM[radice.dataset.ib || 'EUR'].tara], ['portata', 'Portata: quanto regge (kg)', 'num', IM[radice.dataset.ib || 'EUR'].portata],
          ['impilabile', 'Impilabile?', 'select', IM[radice.dataset.ib || 'EUR'].impilabile === false ? 'no' : 'si', siNo], ['sopra', 'Peso massimo che regge sopra (kg)', 'num', IM[radice.dataset.ib || 'EUR'].sopra]], [['ib', 'Salva l’imballo']])) +
        L.scheda('2️⃣', 'Regola di confezionamento', 'quanti pezzi per collo', L.modulo('rc', [['materiale', 'Articolo', 'select', 'TR-STD', mats.map(function (m) { return [m, m + ' — ' + S().materiali[m].nome + ' (' + (S().materiali[m].peso || 1) + ' kg/pz)']; })],
          ['imballo', 'Su quale imballo', 'select', 'EUR', Object.keys(IM).map(function (k) { return [k, IM[k].nome]; })], ['pezzi', 'Pezzi per collo', 'num'], ['alt', 'Altezza del collo carico, imballo compreso (cm)', 'num']], [['rc', 'Salva la regola']]) +
          '<p class="lab-nota">Il programma controlla che il collo pieno (pezzi × peso + tara) non superi la portata dell’imballo.</p>') +
        L.scheda('3️⃣', 'Veicolo', 'pianale interno', L.modulo('ve', [['veicolo', 'Veicolo', 'select', radice.dataset.ve || 'MOTRICE', Object.keys(VE).map(function (k) { return [k, VE[k].nome]; })],
          ['lung', 'Lunghezza del pianale (cm)', 'num', VE[radice.dataset.ve || 'MOTRICE'].lung], ['larg', 'Larghezza del pianale (cm)', 'num', VE[radice.dataset.ve || 'MOTRICE'].larg],
          ['alt', 'Altezza utile (cm)', 'num', VE[radice.dataset.ve || 'MOTRICE'].alt], ['portata', 'Portata utile (kg)', 'num', VE[radice.dataset.ve || 'MOTRICE'].portata]], [['ve', 'Salva il veicolo']])) + '</div>' +
        L.scheda('📦', 'Imballi', 'anagrafica', L.tabella(['Imballo', 'Misure cm', 'Tara kg›', 'Portata kg›', 'Impilabile', 'Regge sopra kg›'], Object.keys(IM).map(function (k) { var x = IM[k];
          return [x.nome, x.lung + ' × ' + x.larg + ' × ' + x.alt, n0(x.tara), n0(x.portata), x.impilabile === false ? 'no' : 'sì', n0(x.sopra)]; }))) +
        L.scheda('📏', 'Regole di confezionamento', 'articolo × imballo', L.tabella(['Articolo', 'Imballo', 'Pezzi per collo›', 'Altezza collo cm›', 'Peso lordo collo kg›', 'Chi l’ha decisa'], mats.reduce(function (a, m) {
          return a.concat(Object.keys(IM).map(function (k) { var r = SP.regola(m, k); return r ? [m, IM[k].nome, n0(r.pezzi), n0(r.alt), n0(r.pezzi * (S().materiali[m].peso || 1) + IM[k].tara), r.definita ? '✏️ tu' : 'predefinita'] : null; }).filter(Boolean)); }, []))) +
        L.scheda('🚛', 'Veicoli', 'anagrafica', L.tabella(['Veicolo', 'Pianale cm', 'Altezza utile cm›', 'Portata kg›', 'Posti EUR a terra (circa)›'], Object.keys(VE).map(function (k) { var v = VE[k];
          return [v.nome, v.lung + ' × ' + v.larg, n0(v.alt), n0(v.portata), Math.floor(v.lung / 120) * Math.floor(v.larg / 80) > Math.floor(v.lung / 80) * Math.floor(v.larg / 120) ? Math.floor(v.lung / 120) * Math.floor(v.larg / 80) : Math.floor(v.lung / 80) * Math.floor(v.larg / 120)]; })));
      var sel = radice.querySelector('#ib-imballo'); if (sel) sel.onchange = function () { radice.dataset.ib = this.value; rendi(); };
      var sv = radice.querySelector('#ve-veicolo'); if (sv) sv.onchange = function () { radice.dataset.ve = this.value; rendi(); };
      L.collega(radice, 'ib', {ib: SP.salvaImballo}, rendi); L.collega(radice, 'rc', {rc: SP.salvaRegola}, rendi); L.collega(radice, 've', {ve: SP.salvaVeicolo}, rendi);
    },
    piano: function () {
      var tr = SP.SP().trasporti.filter(function (t) { return !t.partenza; }), sel = radice.dataset.tp || (tr.slice(-1)[0] || {}).numero || '', t = tr.find(function (x) { return x.numero === sel; });
      var ve = radice.dataset.pv || (t && t.veicolo) || 'MOTRICE', crit = radice.dataset.pc || (t && t.piano && t.piano.criterio) || 'fermate', anteprima = null, errore = '';
      if (t) { try { anteprima = SP.calcolaPiano({trasporto: t.numero, veicolo: ve, criterio: crit}); } catch (err) { errore = err.message; } }
      var colore = ['#0A6ED1', '#E9730C', '#107E3E', '#925ACE', '#BB0000', '#1D7F8C'];
      var disegno = function (p) {
        var v = p.v, sc = Math.min(900 / v.lung, 3.2), W = v.lung * sc, H = v.larg * sc;
        return '<svg class="piano-svg" viewBox="-60 -30 ' + (W + 130) + ' ' + (H + 60) + '" role="img" aria-label="Piano di carico visto dall’alto">' +
          '<rect x="-55" y="0" width="50" height="' + H + '" fill="#d8dee6" rx="6"/><text x="-30" y="' + (H / 2) + '" font-size="12" text-anchor="middle" transform="rotate(-90 -30 ' + (H / 2) + ')">CABINA</text>' +
          '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#f7f7f5" stroke="#556" stroke-width="2"/>' +
          '<text x="' + (W + 30) + '" y="' + (H / 2) + '" font-size="12" text-anchor="middle" transform="rotate(90 ' + (W + 30) + ' ' + (H / 2) + ')">PORTE ▸ si carica da qui</text>' +
          p.posti.map(function (q) { var c = colore[t.consegne.indexOf(q.consegne[0]) % colore.length];
            return '<g><rect x="' + (q.y * sc + 1) + '" y="' + (q.x * sc + 1) + '" width="' + (q.lung * sc - 2) + '" height="' + (q.larg * sc - 2) + '" fill="' + c + '" fill-opacity="' + (q.colli.length > 1 ? '0.95' : '0.6') + '" stroke="#223" rx="3"/>' +
              '<text x="' + (q.y * sc + q.lung * sc / 2) + '" y="' + (q.x * sc + q.larg * sc / 2 + 5) + '" font-size="' + Math.max(10, Math.min(16, q.larg * sc / 3)) + '" text-anchor="middle" fill="#fff" font-weight="700">' + q.n + (q.colli.length > 1 ? ' ×' + q.colli.length : '') + '</text></g>'; }).join('') +
          '<text x="0" y="-10" font-size="12">' + e(v.nome) + ' · pianale ' + v.lung + ' × ' + v.larg + ' cm · ' + p.kpi.metriUsati.toLocaleString('it-IT') + ' m usati</text></svg>';
      };
      radice.innerHTML = '<div class="lab-esito dep-idea">🚛 <b>IL PIANO DI CARICO DICE DOVE METTERE OGNI COLLO SUL CAMION</b>, prima di cominciare a caricare: così si vede subito se ci sta tutto, se si supera il peso e chi scarica per primo.</div>' +
        '<div class="lab-filtro no-stampa"><label>Trasporto <select id="tp">' + (tr.length ? tr.map(function (x) { return '<option value="' + x.numero + '"' + (x.numero === sel ? ' selected' : '') + '>' + x.numero + ' · consegne ' + x.consegne.join(', ') + '</option>'; }).join('') : '<option value="">— nessun trasporto da caricare —</option>') + '</select></label> ' +
        '<label>Veicolo <select id="pv">' + Object.keys(SP.VEICOLI).map(function (k) { return '<option value="' + k + '"' + (k === ve ? ' selected' : '') + '>' + e(SP.veicoli()[k].nome) + '</option>'; }).join('') + '</select></label> ' +
        '<label>Criterio <select id="pc"><option value="fermate"' + (crit === 'fermate' ? ' selected' : '') + '>per fermate: l’ultimo cliente vicino alla cabina</option><option value="saturazione"' + (crit === 'saturazione' ? ' selected' : '') + '>massima saturazione del pianale</option></select></label></div>' +
        (!t ? '<p class="lab-vuoto">Nessun trasporto da caricare: crea il trasporto in Spedizione → Trasporti e carico.</p>' : errore ? '<div class="lab-esito ko">⛔ ' + e(errore) + '</div>' :
          '<div class="kpi4"><div><b>' + anteprima.kpi.caricati + ' / ' + anteprima.kpi.colli + '</b><span>colli che ci stanno</span></div><div><b>' + n0(anteprima.kpi.saturazioneArea) + '%</b><span>pianale occupato</span></div>' +
          '<div><b>' + n0(anteprima.kpi.peso) + ' kg</b><span>' + n0(anteprima.kpi.saturazionePeso) + '% della portata</span></div><div><b>' + anteprima.kpi.posti + '</b><span>posti a terra' + (anteprima.kpi.pile ? ' (' + anteprima.kpi.pile + ' pile da due)' : '') + '</span></div></div>' +
          (anteprima.scarti.length ? '<div class="lab-esito ko">⚠ <b>Restano a terra ' + anteprima.kpi.scartati + ' colli</b>: ' + e(anteprima.scarti.map(function (s0) { return s0.motivo; }).filter(function (m, z, a) { return a.indexOf(m) === z; }).join('; ')) + '. Prova un camion più grande o dividi il trasporto.</div>' : '<div class="lab-esito ok">✓ Tutti i colli ci stanno.</div>') +
          L.scheda('🗺️', 'Il camion visto dall’alto', 'colori = clienti · ×2 = pila di due colli', '<div class="no-stampa vista-scelta"><button type="button" class="lab-btn' + (radice.dataset.v3 ? ' sec' : '') + '" id="v2d">🗺️ Vista dall’alto (2D)</button> <button type="button" class="lab-btn' + (radice.dataset.v3 ? '' : ' sec') + '" id="v3d">🧊 Camion in 3D</button>' +
            (radice.dataset.v3 ? ' <span class="v3-comandi"><button type="button" class="lab-btn sec" data-v3="vistaProspettica">prospettiva</button> <button type="button" class="lab-btn sec" data-v3="vistaDallAlto">dall’alto</button> <button type="button" class="lab-btn sec" data-v3="vistaLaterale">di lato</button> <button type="button" class="lab-btn sec" data-v3="vistaPosteriore">dalle porte</button> <button type="button" class="lab-btn sec" data-v3="impostaPareti">pareti</button> <button type="button" class="lab-btn sec" data-v3="impostaTetto">tetto</button></span>' : '') + '</div>' +
            (radice.dataset.v3 ? '<div class="truck-3d" id="truck-3d"><p class="lab-nota" style="color:#fff;padding:12px">Carico il camion in 3D…</p></div><div id="tooltip-collo" class="tooltip-3d"></div><p class="lab-nota">Trascina per girare il camion, rotella per avvicinarti, tasto destro per spostarti. Passa sopra un collo per leggerne posto, articolo e peso.</p><p class="lab-nota" id="msg-3d"></p>' : disegno(anteprima)) + '<p class="lab-nota">' + t.consegne.map(function (k, z) { var c = S().consegne.find(function (y) { return y.numero === k; }); return '<span style="color:' + colore[z % colore.length] + ';font-weight:700">■</span> ' + k + ' ' + e(U.nome(S(), c.cliente)) + ' (fermata ' + (z + 1) + ')'; }).join(' · ') + '</p>') +
          L.scheda('📋', 'Ordine di carico', 'si carica dal posto 1 (cabina) verso le porte', L.tabella(['Posto', 'Colli (SSCC)', 'Consegna', 'Articolo', 'Altezza cm›', 'Peso kg›', 'Nota'], anteprima.posti.map(function (q) {
            return [q.n, q.colli.join('<br>'), q.consegne.join(', '), q.materiali.join(' + '), n0(q.alt), n0(q.peso), (q.colli.length > 1 ? 'pila: il più pesante sotto' : '') + (q.scambio ? ' · recuperato con uno scambio' : '') + (q.ruotato ? ' · girato di 90°' : '')]; }))) +
          L.modulo('ps', [['trasporto', 'Trasporto', 'select', t.numero, [[t.numero, t.numero]]], ['veicolo', 'Veicolo', 'select', ve, [[ve, SP.veicoli()[ve].nome]]], ['criterio', 'Criterio', 'select', crit, [[crit, crit === 'fermate' ? 'per fermate' : 'massima saturazione']]]], [['ps', 'Salva il piano sul trasporto']]) +
          (t.piano ? '<p class="lab-nota">Piano salvato: ' + e(SP.veicoli()[t.piano.veicolo].nome) + ', ' + t.piano.kpi.caricati + '/' + t.piano.kpi.colli + ' colli. Con la pistola RF → Carico ogni collo ti dice in quale posto va.</p>' : '')) +
        '<p class="lab-nota"><b>Come ragiona:</b> 1) i colli impilabili con la stessa base vanno uno sopra l’altro se ci stanno in altezza e quello sotto regge il peso; 2) i posti si riempiono a file dalla cabina verso le porte, prima i più grandi, girandoli di 90° se serve; 3) se un collo resta fuori, prova a scambiarlo con uno già messo; 4) controlla la portata. È lo stesso metodo del MasterLogistic WMS: un buon piano pratico, non l’ottimo matematico.</p>';
      ['tp', 'pv', 'pc'].forEach(function (id) { var x = radice.querySelector('#' + id); if (x) x.onchange = function () { radice.dataset[id] = this.value; rendi(); }; });
      L.collega(radice, 'ps', {ps: SP.salvaPiano}, rendi);
      var b2 = radice.querySelector('#v2d'), b3 = radice.querySelector('#v3d');
      if (b2) b2.onclick = function () { delete radice.dataset.v3; if (window.Load3D) window.Load3D.destroy(); rendi(); };
      if (b3) b3.onclick = function () { radice.dataset.v3 = '1'; rendi(); };
      if (radice.dataset.v3 && anteprima) vista3d(anteprima, t, colore);
      else if (window.Load3D) window.Load3D.destroy();
    },
    ddt: function () {
      var lista = uscita().filter(function (c) { return c.ddt; }), sc = scegli(lista, 'cd'), c = lista.find(function (x) { return x.numero === sc.sel; });
      if (!c) { radice.innerHTML = '<p class="lab-vuoto">Nessun DDT: il DDT nasce con la partenza del trasporto (uscita merci).</p>'; return; }
      var d = SP.ddt(c.numero), cli = d.destinatario;
      radice.innerHTML = sc.html + L.scheda('📄', 'DOCUMENTO DI TRASPORTO n. ' + d.numero + '/' + d.anno + ' del ' + fd(d.data), 'D.P.R. 472/1996 · documento didattico',
        '<div class="lab-griglia"><div><b>Mittente</b><br>Ferro &amp; Transenne S.r.l. (azienda didattica)<br>magazzino W100</div><div><b>Destinatario</b><br>' + e(cli.nome) + '<br>' + e(cli.regione) + '</div>' +
        '<div><b>Luogo di destinazione</b><br>sede del destinatario · ' + e(cli.regione) + '</div><div><b>Causale del trasporto</b><br>Vendita · ordine ' + d.ordine + (d.rifCliente ? ' (vs. rif. ' + e(d.rifCliente) + ')' : '') + ' · consegna ' + d.consegna + '</div></div>' +
        L.tabella(['Codice', 'Descrizione dei beni', 'U.M.', 'Quantità›'], [[d.materiale, e(d.descrizione), 'pz', n0(d.qta)]]) +
        L.tabella(['Colli›', 'Aspetto esteriore dei beni', 'Peso netto kg›', 'Peso lordo kg›', 'Porto', 'Trasporto a cura del'], [[d.colli.length, d.colli.length ? SP.IMBALLI[d.colli[0].imballo].nome : '', n0(d.pesoNetto), n0(d.pesoLordo), d.porto, e(d.vettore)]]) +
        L.tabella(['SSCC dei colli', 'Pezzi›', 'kg›'], d.colli.map(function (x) { return [x.sscc, n0(x.qta), n0(x.pesoLordo)]; })) +
        '<p>Vettore: <b>' + e(d.vettore) + '</b>' + (d.trasporto && d.trasporto.targa ? ' · targa ' + e(d.trasporto.targa) : '') + (d.trasporto && d.trasporto.autista ? ' · autista ' + e(d.trasporto.autista) : '') + ' · data e ora del ritiro: ' + fd(d.data) + ' ____:____</p>' +
        '<p style="margin-top:20px">Firma del mittente ____________________ &nbsp; Firma del vettore / conducente ____________________ &nbsp; Firma del destinatario ____________________</p>' +
        '<p class="lab-nota">Il DDT accompagna la merce: numero progressivo, data, mittente, destinatario, luogo di destinazione, causale, natura e quantità dei beni, colli, aspetto, peso, porto e vettore. La fattura (VF01) può essere differita entro il 15 del mese successivo richiamando il DDT.</p>');
      legaScelta('cd');
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.monitor)(); }
  rendi();
})();
