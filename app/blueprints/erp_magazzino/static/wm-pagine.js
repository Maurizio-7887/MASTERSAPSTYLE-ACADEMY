/* SISTEMA INTEGRATO — Magazzino WMS: struttura e attivazione, mappa delle ubicazioni, compiti, pistola RF, monitor, etichette. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, WM = window.WM4, IV = window.IV4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; }, W = function () { return S().wm; };
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (x) { return null; } };
  var nonAttivo = function () { return WM.attivo() ? '' : '<div class="lab-esito ko">⚠ Il WMS non è ancora attivo: vai su <b>Magazzino → Struttura e attivazione</b>.</div>'; };
  var um = function (m) { return (S().materiali[m] || {}).um || 'pz'; };
  var tabCompiti = function (lista, vuoto) {
    return L.tabella(['Compito', 'Tipo', 'Creato', 'Materiale', 'Q.tà›', 'UdC', 'Da', 'A', 'Rif.', 'Stato', 'Risorsa', 'Diff.›'], lista.map(function (t) {
      return [t.numero, WM.TIPI_COMPITO[t.tipo], fd(t.creato), t.mat, n0(t.qta) + ' ' + um(t.mat), t.udc, '<b>' + t.da + '</b>', '<b>' + t.a + '</b>', t.rif, t.stato === 'aperto' ? '<b>aperto</b>' : 'confermato ' + fd(t.confermato), e(t.risorsa), t.diff ? n0(t.diff) : '']; }), vuoto || 'Nessun compito.');
  };
  var PAGINE = {
    struttura: function () {
      var w = W(), att = WM.attivo();
      radice.innerHTML = U.avviso(S()) +
        L.scheda('🏬', 'Numero magazzino W100', att ? 'attivo dal ' + fd(w.attivo) : 'da attivare', att
          ? '<div class="lab-esito ok">✓ WMS attivo dal ' + fd(w.attivo) + ': ' + Object.keys(w.ubicazioni).length + ' ubicazioni, carico iniziale di ' + w.carico.length + ' unità di carico. Da qui ogni entrata, prelievo e consegna passa dai compiti di magazzino.</div>'
          : L.modulo('at', [['data', 'Data di attivazione', 'date']], [['at', 'Attiva il magazzino W100 e carica le giacenze nelle ubicazioni']]) +
            '<p class="lab-nota">Crea tipi magazzino e ubicazioni, poi sistema le giacenze contabili di oggi in unità di carico (pallet da 50 pz, fasci di ferro da 1.000 kg) con le stesse strategie di messa a posto. Nessuna scrittura contabile: cambia solo il «dove».</p>' +
            '<p><button type="button" class="lab-btn sec" id="febbraio">Carica la situazione di fine febbraio (vendite, costi e Material Ledger già fatti)</button></p>') +
        '<div class="lab-griglia">' +
        L.scheda('🗂️', 'Tipi magazzino', 'SPRO · /SCWM/LGTY', L.tabella(['Tipo', 'Descrizione', 'Ubicazioni', 'Interim', 'Strategia'], Object.keys(WM.TIPI).map(function (t) {
          var nb = att ? Object.keys(w.ubicazioni).filter(function (b) { return w.ubicazioni[b].tipo === t; }).length : '';
          var st = {'001': 'messa a posto: prossima ubicazione vuota · prelievo FIFO', '002': 'aggiunta a scorta esistente · prelievo FIFO', '902': 'ricevimento: le UdC aspettano la messa a posto', '916': 'spedizione: dal prelievo all\'uscita merci', '100': 'PSA: il ferro per l\'ordine di produzione', '999': 'differenze in attesa di registrazione'}[t];
          return [t, WM.TIPI[t].nome, nb, WM.TIPI[t].interim ? 'sì' : 'no', st]; }))) +
        L.scheda('📐', 'Regole', '', '<ul class="lab-elenco"><li><b>Ubicazioni scaffale</b> 01-01-1 … 03-05-2: corsia-campata-livello, 1 pallet ciascuna (30 posti).</li><li><b>Catasta ferro</b> F-01 … F-06: 2 fasci ciascuna.</li>' +
          '<li><b>Unità di carico</b>: pallet da ' + WM.UDC.FERT + ' transenne · fascio da ' + n0(WM.UDC.ROH) + ' kg di ferro.</li><li><b>Risorse</b> (magazzinieri): ' + e((att ? w.risorse : ['MAG01 Marco', 'MAG02 Sara', 'MAG03 Luca', 'MAG04 Giulia']).join(' · ')) + '.</li>' +
          '<li><b>Tolleranza di riconta</b> negli inventari: ' + eur(att ? w.tolleranza : 20) + ' € per posizione.</li></ul>') + '</div>' +
        (att ? L.scheda('📦', 'Carico iniziale delle giacenze', '/SCWM/ISU', L.tabella(['Ubicazione', 'Materiale', 'Quantità›', 'UdC'], w.carico.map(function (c) { return [c.ubic, c.mat, n0(c.qta) + ' ' + um(c.mat), c.udc]; }))) : '');
      L.collega(radice, 'at', {at: WM.attiva}, rendi);
      var fb = radice.querySelector('#febbraio');
      if (fb) fb.onclick = function () { if (confirm('Sostituire il lavoro del sistema integrato con la situazione di fine febbraio?')) { window.LabCopioni.esegui(window.LabCopioni.SD4, SD, 'Marzo:'); if (window.MSA_SALVA) window.MSA_SALVA(); rendi(); } };
    },
    mappa: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      var w = W(), sel = radice.dataset.ubic || '';
      var cella = function (b) {
        var qs = WM.inUbic(b), x = w.ubicazioni[b], arr = WM.aperti().some(function (t) { return t.a === b; }), m = qs[0] ? qs[0].mat : '';
        return '<div class="ubic ' + (qs.length ? 'm-' + m : 'vuota') + (x.blocco ? ' bloc' : '') + (arr ? ' arrivo' : '') + (b === sel ? ' sel' : '') + '" data-u="' + b + '"><b>' + b + '</b>' +
          (qs.length ? qs.map(function (q) { return e(q.mat) + ' ' + n0(q.qta); }).join('<br>') : 'vuota') + (x.blocco ? '<br>🔒' : '') + '</div>';
      };
      var corsie = ['01', '02', '03'].map(function (c) {
        var celle = [];
        [2, 1].forEach(function (l) { for (var k = 1; k <= 5; k++) celle.push(cella(c + '-0' + k + '-' + l)); });
        return '<div class="mappa-corsia"><h4>Corsia ' + c + ' · livello 2 (sopra) e 1 (sotto) · campate 1 → 5</h4><div class="mappa-griglia">' + celle.join('') + '</div></div>';
      }).join('');
      var ferro = '<div class="mappa-corsia"><h4>Catasta ferro (tipo 002)</h4><div class="mappa-griglia">' + ['F-01', 'F-02', 'F-03', 'F-04', 'F-05', 'F-06'].map(cella).join('') + '</div></div>';
      var interim = '<div class="mappa-corsia"><h4>Aree interim</h4><div class="mappa-griglia">' + ['GR-ZONE', 'PSA-L1', 'GI-ZONE', 'DIFF'].map(cella).join('') + '</div></div>';
      var det = '';
      if (sel) {
        var u = WM.ubicazione(sel);
        det = L.scheda('🔎', 'Ubicazione ' + sel, 'LS26 · /SCWM/MON', '<p class="lab-nota">Tipo ' + u.tipo + ' (' + WM.TIPI[u.tipo].nome + ')' + (u.cap ? ' · capacità ' + u.cap + ' UdC · occupate ' + u.occupazione : '') + (u.blocco ? ' · <b>bloccata: ' + e(u.blocco) + '</b>' : '') + '</p>' +
          L.tabella(['Quanto', 'Materiale', 'Quantità›', 'UdC', 'Data di entrata (FIFO)', 'Riferimento'], u.quanti.map(function (q) { return [q.id, q.mat, n0(q.qta) + ' ' + um(q.mat), q.udc, fd(q.data), e(q.rif)]; }), 'Ubicazione vuota.') +
          tabCompiti(WM.aperti().filter(function (t) { return t.da === sel || t.a === sel; }), 'Nessun compito aperto su questa ubicazione.'));
      }
      radice.innerHTML = '<p class="lab-nota">Colori: <span class="ubic m-TR-STD" style="display:inline;padding:2px 6px">TR-STD</span> <span class="ubic m-TR-ALTA" style="display:inline;padding:2px 6px">TR-ALTA</span> <span class="ubic m-TR-PED" style="display:inline;padding:2px 6px">TR-PED</span> <span class="ubic m-FERRO" style="display:inline;padding:2px 6px">FERRO</span> · bordo tratteggiato = merce in arrivo · righe rosse = bloccata per inventario. Tocca un\'ubicazione per vederne il contenuto.</p>' +
        det + '<div class="mappa">' + corsie + ferro + interim + '</div>';
      radice.querySelectorAll('.ubic[data-u]').forEach(function (x) { x.onclick = function () { radice.dataset.ubic = x.dataset.u; rendi(); if (window.scrollY) window.scrollTo(0, 0); }; });
    },
    compiti: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      var ordini = S().produzione.filter(function (o) { return !o.liquidazione && !o.teco; });
      var ap = WM.aperti();
      radice.innerHTML = '<div class="lab-griglia">' +
        L.scheda('🏭', 'Approvvigionamento della produzione', 'staging · /SCWM/STAGE', L.modulo('sg', [['ordine', 'Ordine di produzione', 'select', '', U.lista(ordini, function (o) { return o.numero + ' · ' + o.qta + ' ' + o.materiale + ' · ferro ' + n0(S().materiali[o.materiale].ferro * o.qta) + ' kg'; }, '— nessun ordine aperto —')],
          ['kg', 'Ferro kg (vuoto = da distinta)', 'num'], ['data', 'Data', 'date']], [['sg', 'Crea compiti (FIFO dalla catasta)']]) + '<p class="lab-nota">Il ferro va dalla catasta all\'area PSA-L1 della linea: solo da lì il prelievo 261 dell\'ordine lo consuma.</p>') +
        L.scheda('🔁', 'Trasferimento tra ubicazioni', 'LT10 · /SCWM/ADHU', L.modulo('tr', [['udc', 'Unità di carico', 'text'], ['a', 'Ubicazione di destinazione (vuoto = proposta)', 'text'], ['motivo', 'Motivo', 'text'], ['data', 'Data', 'date']], [['tr', 'Crea compito']])) +
        L.scheda('🖥️', 'Conferma da scrivania', 'LT12', L.modulo('cf', [['compito', 'Compito aperto', 'select', '', U.lista(ap, function (t) { return t.numero + ' · ' + WM.TIPI_COMPITO[t.tipo] + ' · ' + t.da + ' → ' + t.a + ' · ' + n0(t.qta) + ' ' + t.mat; }, '— nessun compito aperto —')],
          ['risorsa', 'Risorsa', 'select', W().risorse[0], W().risorse], ['data', 'Data', 'date']], [['cf', 'Conferma']]) + '<p class="lab-nota">In magazzino si conferma con la pistola RF, che controlla ubicazioni e UdC lette: qui è la conferma del capo magazzino, senza scansioni.</p>') +
        '</div>' + L.scheda('📋', 'Compiti aperti', '/SCWM/MON · LT22', tabCompiti(ap, 'Nessun compito aperto: magazzino in ordine.')) +
        L.scheda('✅', 'Compiti confermati', 'LT22', tabCompiti(W().compiti.filter(function (t) { return t.stato !== 'aperto'; }).slice().reverse(), 'Nessuno.'));
      L.collega(radice, 'sg', {sg: WM.approvvigiona}, rendi); L.collega(radice, 'tr', {tr: WM.trasferisci}, rendi);
      L.collega(radice, 'cf', {cf: function (v) { return WM.conferma({compito: v.compito, risorsa: v.risorsa, data: v.data}); }}, rendi);
    },
    rf: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      if (ls('s4-rf-pieno') === '1') document.body.classList.add('rf-pieno');
      var w = W(), ris = ls('s4-rf-risorsa') || w.risorse[0], dl = ls('s4-rf-data') || w.attivo, scheda = radice.dataset.rf || 'compiti';
      var testa = '<div class="rf-testa"><label>Risorsa<select id="rf-ris">' + w.risorse.map(function (r) { return '<option' + (r === ris ? ' selected' : '') + '>' + e(r) + '</option>'; }).join('') + '</select></label>' +
        '<label>Data di lavoro<input type="date" id="rf-data" value="' + e(dl) + '"></label><button type="button" class="rf-pieno-btn" id="rf-pieno">' + (document.body.classList.contains('rf-pieno') ? '↩ Menu' : '⛶ Schermo pistola') + '</button></div>' +
        '<div class="rf-schede">' + [['compiti', '📦 Compiti'], ['carico', '🚛 Carico'], ['interroga', '🔎 Interroga'], ['inventario', '📝 Inventario']].map(function (x) { return '<button type="button" data-s="' + x[0] + '" class="' + (x[0] === scheda ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
      var corpo = '';
      if (scheda === 'compiti') {
        var ap = WM.aperti(), sel = radice.dataset.compito && ap.find(function (t) { return t.numero === radice.dataset.compito; }) || ap.find(function (t) { return t.risorsa === ris; }) || ap[0];
        if (!sel) corpo = '<p class="lab-nota" style="font-size:17px">✓ Nessun compito aperto. Ottimo lavoro!</p>';
        else {
          var parz = sel.tipo === 'PICK' || sel.tipo === 'STAGING';
          corpo = '<div class="rf-compito"><h3>' + WM.TIPI_COMPITO[sel.tipo] + ' · compito ' + sel.numero + '</h3>' +
            '<div class="rf-riga"><span>Da</span><b>' + sel.da + '</b></div><div class="rf-riga"><span>UdC / materiale</span><b>' + (sel.udc || '—') + ' · ' + sel.mat + '</b></div>' +
            '<div class="rf-riga"><span>Quantità</span><b>' + n0(sel.qta) + ' ' + um(sel.mat) + '</b></div><div class="rf-riga"><span>A</span><b>' + sel.a + '</b></div></div>' +
            '<div class="rf-campo"><label>1 · Leggi l\'ubicazione di ORIGINE<input id="rf-da" autocomplete="off" data-atteso="' + sel.da + '"></label></div>' +
            '<div class="rf-campo"><label>2 · Leggi l\'unità di carico (o il materiale)<input id="rf-udc" autocomplete="off" data-atteso="' + (sel.udc || sel.mat) + '" data-alt="' + sel.mat + '"></label></div>' +
            '<div class="rf-campo"><label>3 · Quantità prelevata' + (parz ? ' (meno = differenza)' : '') + '<input id="rf-qta" inputmode="decimal" value="' + n0(sel.qta) + '"' + (parz ? '' : ' readonly') + '></label></div>' +
            '<div class="rf-campo"><label>4 · Leggi l\'ubicazione di DESTINAZIONE<input id="rf-a" autocomplete="off" data-atteso="' + sel.a + '"></label></div>' +
            '<button type="button" class="rf-btn" id="rf-ok">✔ Conferma il compito</button><div class="lab-esito" id="rf-esito"></div>' +
            '<h4>Coda (' + ap.length + ')</h4><ul class="rf-coda">' + ap.map(function (t) { return '<li><span>' + t.numero + ' · ' + t.da + ' → ' + t.a + ' · ' + n0(t.qta) + ' ' + t.mat + (t.risorsa ? ' · ' + e(t.risorsa) : '') + '</span>' + (t === sel ? '<b>in corso</b>' : '<button type="button" class="lab-btn sec" data-prendi="' + t.numero + '">Prendi</button>') + '</li>'; }).join('') + '</ul>';
        }
      } else if (scheda === 'carico') {
        var trs = window.SP4 ? window.SP4.SP().trasporti.filter(function (t) { return !t.partenza; }) : [];
        corpo = trs.length ? trs.map(function (t) {
          var col = t.consegne.reduce(function (a, k) { return a.concat(window.SP4.colliDi(k)); }, []);
          return '<div class="rf-compito"><h3>Trasporto ' + t.numero + ' · ' + e(window.SP4.VETTORI[t.vettore]) + (t.targa ? ' · ' + e(t.targa) : '') + '</h3><div class="rf-riga"><span>Colli caricati</span><b>' + col.filter(function (x) { return x.caricato; }).length + ' / ' + col.length + '</b></div>' +
            col.map(function (x) { return '<div class="rf-riga"><span>' + (x.caricato ? '✅' : '⬜') + ' ' + x.sscc.slice(-6) + ' · ' + x.qta + ' ' + x.materiale + '</span><span>cons. ' + x.consegna + '</span></div>'; }).join('') + '</div>';
        }).join('') + '<div class="rf-campo"><label>Leggi l\'SSCC del collo da caricare<input id="rf-sscc" autocomplete="off"></label></div><div class="lab-esito" id="rf-ce"></div>'
          : '<p class="lab-nota">Nessun trasporto da caricare: crealo da Spedizione → Trasporti.</p>';
      } else if (scheda === 'interroga') {
        corpo = '<div class="rf-campo"><label>Leggi un\'ubicazione o un\'unità di carico<input id="rf-q" autocomplete="off"></label></div><div id="rf-ris-q"></div>';
      } else {
        var docs = w.inventari.filter(function (d) { return d.stato === 'attivo' || d.stato === 'riconta'; });
        corpo = docs.length ? '<p class="lab-nota">Documenti in conta: ' + docs.map(function (d) { return d.numero + ' (' + d.stato + ')'; }).join(', ') + '. Conta «cieca»: la quantità a sistema non si vede.</p>' +
          '<div class="rf-campo"><label>Leggi l\'ubicazione da contare<input id="rf-inv" autocomplete="off"></label></div><div id="rf-inv-righe"></div>' : '<p class="lab-nota">Nessun documento d\'inventario attivo.</p>';
      }
      radice.innerHTML = '<div class="rf">' + testa + '<div class="rf-corpo">' + corpo + '</div></div>';
      radice.querySelector('#rf-ris').onchange = function () { ls('s4-rf-risorsa', this.value); };
      radice.querySelector('#rf-pieno').onclick = function () { var si = !document.body.classList.contains('rf-pieno'); document.body.classList.toggle('rf-pieno', si); ls('s4-rf-pieno', si ? '1' : ''); rendi(); };
      radice.querySelector('#rf-data').onchange = function () { ls('s4-rf-data', this.value); };
      radice.querySelectorAll('.rf-schede button').forEach(function (b) { b.onclick = function () { radice.dataset.rf = b.dataset.s; rendi(); }; });
      var campi = Array.prototype.slice.call(radice.querySelectorAll('.rf-corpo input:not([readonly])'));
      campi.forEach(function (inp, k) {
        if (window.S4Lettore && inp.id !== 'rf-qta') window.S4Lettore.campo(inp);
        inp.addEventListener('keydown', function (ev) {
          if (ev.key !== 'Enter') return; ev.preventDefault();
          var v = inp.value.trim().toUpperCase();
          if (inp.dataset.atteso) { var ok = v === inp.dataset.atteso || (inp.dataset.alt && v === inp.dataset.alt); inp.classList.toggle('ok', ok); inp.classList.toggle('ko', !ok); if (!ok) { if (navigator.vibrate) navigator.vibrate([60, 60, 60]); inp.select(); return; } }
          if (inp.id === 'rf-q') return interroga(v);
          if (inp.id === 'rf-inv') return contaUbic(v);
          if (inp.id === 'rf-sscc') { try { var msg = window.SP4.carica({sscc: v, data: radice.querySelector('#rf-data').value}); if (navigator.vibrate) navigator.vibrate(120); rendi(); var o3 = radice.querySelector('#rf-ce'); o3.className = 'lab-esito ok'; o3.innerHTML = msg; }
            catch (x) { var o4 = radice.querySelector('#rf-ce'); o4.className = 'lab-esito ko'; o4.textContent = '⛔ ' + x.message; if (navigator.vibrate) navigator.vibrate([60, 60, 60]); inp.select(); } return; }
          var dopo = campi[k + 1]; if (dopo) dopo.focus(); else { var b = radice.querySelector('#rf-ok'); if (b) b.click(); }
        });
      });
      if (campi[0]) campi[0].focus();
      radice.querySelectorAll('[data-prendi]').forEach(function (b) { b.onclick = function () { radice.dataset.compito = b.dataset.prendi; rendi(); }; });
      var okb = radice.querySelector('#rf-ok');
      if (okb) okb.onclick = function () {
        var out = radice.querySelector('#rf-esito'), g = function (id) { return radice.querySelector(id).value; };
        try {
          var html = WM.conferma({compito: sel.numero, da: g('#rf-da'), udc: g('#rf-udc'), qta: g('#rf-qta'), a: g('#rf-a'), risorsa: radice.querySelector('#rf-ris').value, data: radice.querySelector('#rf-data').value});
          if (navigator.vibrate) navigator.vibrate(120);
          delete radice.dataset.compito; rendi(); var o2 = radice.querySelector('#rf-esito') || radice.querySelector('.rf-corpo'); o2.insertAdjacentHTML('afterbegin', '<div class="lab-esito ok">' + html + '</div>');
        } catch (x) { out.className = 'lab-esito ko'; out.textContent = '⛔ ' + x.message; if (navigator.vibrate) navigator.vibrate([60, 60, 60]); }
      };
      function interroga(v) {
        var box = radice.querySelector('#rf-ris-q'), q = WM.quanti(function (x) { return x.udc === v; })[0];
        try {
          var u = q ? WM.ubicazione(q.ubic) : WM.ubicazione(v);
          box.innerHTML = '<div class="rf-compito"><h3>' + (q ? 'UdC ' + v + ' in ' + q.ubic : 'Ubicazione ' + u.id) + (u.blocco ? ' 🔒' : '') + '</h3>' + (u.quanti.length ? u.quanti.map(function (x) { return '<div class="rf-riga"><span>' + x.mat + ' · UdC ' + (x.udc || '—') + ' · ' + fd(x.data) + '</span><b>' + n0(x.qta) + ' ' + um(x.mat) + '</b></div>'; }).join('') : '<p>Vuota.</p>') + '</div>';
        } catch (x) { box.innerHTML = '<div class="lab-esito ko">⛔ ' + e(x.message) + '</div>'; }
        var i = radice.querySelector('#rf-q'); i.value = ''; i.focus();
      }
      function contaUbic(v) {
        var box = radice.querySelector('#rf-inv-righe');
        var d = w.inventari.find(function (x) { return (x.stato === 'attivo' || x.stato === 'riconta') && x.righe.some(function (r) { return r.ubic === v; }); });
        if (!d) { box.innerHTML = '<div class="lab-esito ko">⛔ L\'ubicazione ' + e(v) + ' non è in un documento d\'inventario attivo.</div>'; return; }
        var sec = d.stato === 'riconta';
        box.innerHTML = '<div class="rf-compito"><h3>Inventario ' + d.numero + ' · ' + v + (sec ? ' · RICONTA' : '') + '</h3>' + d.righe.map(function (r, k) {
          if (r.ubic !== v || (sec && !r.riconta)) return '';
          return '<div class="rf-campo"><label>' + (r.mat ? r.mat + (r.udc ? ' · UdC ' + r.udc : '') : 'Ubicazione vuota: se trovi merce, scrivi il materiale') + (r.mat ? '' : '<input id="rf-m' + k + '" placeholder="MATERIALE">') + '<input id="rf-c' + k + '" inputmode="decimal" placeholder="quantità contata"></label></div>';
        }).join('') + '<button type="button" class="rf-btn" id="rf-conta">Registra la conta</button><div class="lab-esito" id="rf-ce"></div></div>';
        radice.querySelector('#rf-conta').onclick = function () {
          var val = {numero: d.numero, parziale: true, contatore: radice.querySelector('#rf-ris').value};
          d.righe.forEach(function (r, k) { var c = radice.querySelector('#rf-c' + k); if (c && c.value !== '') { val['r' + k] = c.value; var m = radice.querySelector('#rf-m' + k); if (m) val['m' + k] = m.value; } });
          var o = radice.querySelector('#rf-ce');
          try { var t = IV.conta(val); var manca = d.righe.some(function (r) { return sec ? r.riconta && r.conta2 === null : r.conta1 === null; }); if (!manca) t = IV.conta({numero: d.numero, contatore: val.contatore}); o.className = 'lab-esito ok'; o.innerHTML = t; var ii = radice.querySelector('#rf-inv'); ii.value = ''; ii.focus(); }
          catch (x) { o.className = 'lab-esito ko'; o.textContent = '⛔ ' + x.message; }
        };
      }
    },
    monitor: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      var w = W(), u = w.ubicazioni, ap = WM.aperti(), conf = w.compiti.filter(function (t) { return t.stato !== 'aperto'; });
      var occ = function (t) { var b = Object.keys(u).filter(function (k) { return u[k].tipo === t; }), cap = 0, o = 0;
        b.forEach(function (k) { cap += u[k].cap; var x = {}; WM.inUbic(k).forEach(function (q) { x[q.udc || q.id] = 1; }); o += Object.keys(x).length; }); return cap ? Math.round(o / cap * 100) : 0; };
      var diff = WM.inUbic('DIFF'), quad = WM.quadratura(), consegne = S().consegne.filter(function (c) { return c.wm; });
      var perRis = {}; conf.forEach(function (t) { perRis[t.risorsa || '(scrivania)'] = (perRis[t.risorsa || '(scrivania)'] || 0) + 1; });
      radice.innerHTML = '<div class="kpi4"><div><b>' + ap.length + '</b><span>compiti aperti</span></div><div><b>' + conf.length + '</b><span>compiti confermati</span></div>' +
        '<div><b>' + occ('001') + ' %</b><span>occupazione scaffali (001)</span></div><div><b>' + occ('002') + ' %</b><span>occupazione catasta (002)</span></div>' +
        '<div><b>' + diff.length + '</b><span>differenze nella 999</span></div><div><b>' + (quad.every(function (q) { return q.ok; }) ? '✓' : '⚠') + '</b><span>quadratura IM–WMS</span></div></div>' +
        L.scheda('⚖️', 'Confronto giacenze contabilità di magazzino (IM) – WMS', 'LX23 · /SCWM/STOCK_COMP', L.tabella(['Materiale', 'IM (MMBE)›', 'WMS (somma quanti)›', 'di cui nella 999›', 'Esito'], quad.map(function (q) { return [q.mat, n0(q.im) + ' ' + um(q.mat), n0(q.wm), n0(q.diff999), q.ok ? '✓ quadra' : '<b>⚠ differenza ' + n0(q.im - q.wm) + '</b>']; })) +
          '<p class="lab-nota">Le differenze d\'inventario stanno nella 999 finché non si registrano in contabilità: la quantità totale resta uguale all\'IM.</p>') +
        '<div class="lab-griglia">' + L.scheda('👷', 'Compiti per risorsa', '', L.tabella(['Risorsa', 'Confermati›'], Object.keys(perRis).map(function (r) { return [e(r), perRis[r]]; }), 'Ancora nessuno.')) +
        L.scheda('🚚', 'Consegne gestite a magazzino', 'VL06P', L.tabella(['Consegna', 'Cliente', 'Materiale', 'Q.tà›', 'Prelievo', 'Uscita merci'], consegne.map(function (c) { var p = WM.statoPrelievo(c); return [c.numero, e(U.nome(S(), c.cliente)), c.materiale, n0(c.qta), p.stato + ' (' + n0(p.prelevato) + ')', c.pgi ? fd(c.pgi) : '—']; }), 'Nessuna.')) + '</div>' +
        L.scheda('📋', 'Compiti aperti', '/SCWM/MON', tabCompiti(ap, 'Nessun compito aperto.'));
    },
    etichette: function () {
      if (!WM.attivo()) { radice.innerHTML = nonAttivo(); return; }
      var w = W(), cosa = radice.dataset.cosa || 'ubicazioni';
      var et = cosa === 'udc'
        ? WM.quanti(function (q) { return q.udc && q.qta > 0; }).map(function (q) { return window.S4Etichette.etichetta(q.udc, 'UNITÀ DI CARICO · W100', q.mat + ' · ' + n0(q.qta) + ' ' + um(q.mat) + ' · in ' + q.ubic); })
        : Object.keys(w.ubicazioni).sort().map(function (b) { return window.S4Etichette.etichetta(b, 'UBICAZIONE · W100 · tipo ' + w.ubicazioni[b].tipo, WM.TIPI[w.ubicazioni[b].tipo].nome); });
      radice.innerHTML = '<div class="lab-filtro no-stampa"><label>Etichette <select id="cosa"><option value="ubicazioni"' + (cosa === 'ubicazioni' ? ' selected' : '') + '>ubicazioni (' + Object.keys(w.ubicazioni).length + ')</option><option value="udc"' + (cosa === 'udc' ? ' selected' : '') + '>unità di carico a magazzino</option></select></label> <button type="button" class="lab-btn" id="stampa">🖨️ Stampa</button>' +
        '<span class="lab-nota">Code 128 per la pistola, QR per lo smartphone. Fogli A4 adesivi, 3 per riga.</span></div><div class="s4-ets">' + et.join('') + '</div>';
      radice.querySelector('#cosa').onchange = function () { radice.dataset.cosa = this.value; rendi(); };
      radice.querySelector('#stampa').onclick = function () { window.print(); };
    },
    lotti: function () {
      var LT = window.LT4, tutti = LT.elenco(), mat = radice.dataset.mat || '', sel = radice.dataset.lotto || '', cons = radice.dataset.cons || '';
      var vista = tutti.filter(function (x) { return (!mat || x.mat === mat) && (x.qta > 1e-9 || radice.dataset.esauriti === '1'); });
      var albero = function (righe) { return '<ul class="lab-elenco">' + righe.map(function (x) { return '<li style="margin-left:' + (x.livello * 1.4) + 'rem">' + (x.tipo === 'lotto' ? '🧬 ' : x.tipo === '601' || x.tipo === 'consegna' ? '🚚 ' : x.tipo === '261' ? '🏭 ' : x.tipo === 'origine' ? '📥 ' : '• ') + e(x.testo) + '</li>'; }).join('') + '</ul>'; };
      var dett = '';
      if (sel) { var p = sel.split('|'); try { var x = LT.lotto(p[0], p[1]);
        dett = L.scheda('🧬', 'Lotto ' + e(p[1]) + ' · ' + p[0], 'MSC3N', '<p>Giacenza del lotto <b>' + n0(x.qta) + ' ' + um(p[0]) + '</b> · nato il ' + fd(x.data) + (x.colata ? ' · colata del fornitore ' + e(x.colata) : '') + '</p>' +
          '<div class="lab-griglia"><div><h3>⬅️ A monte: da dove viene</h3>' + albero(LT.monte(p[0], p[1])) + '</div><div><h3>➡️ A valle: dove è finito</h3>' + albero(LT.valle(p[0], p[1])) + '</div></div>'); } catch (err) { dett = '<p class="lab-esito ko">' + e(err.message) + '</p>'; } }
      radice.innerHTML = U.avviso(S()) + '<div class="lab-filtro"><label>Materiale <select id="lm"><option value="">tutti</option>' + Object.keys(S().materiali).map(function (m) { return '<option' + (m === mat ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
          ' <label class="chk"><input type="checkbox" id="le"' + (radice.dataset.esauriti === '1' ? ' checked' : '') + '> mostra anche i lotti esauriti</label></div>' +
        L.scheda('📦', 'Giacenza per lotto', 'MMBE · MSC3N', L.tabella(['Materiale', 'Lotto', 'Nato il', 'Origine', 'Colata / fornitore', 'Giacenza›', ''], vista.map(function (x) {
          return [x.mat, '<b>' + e(x.lotto) + '</b>', fd(x.data), ({'561': 'apertura', '101': 'entrata 101', '651': 'reso', '712': 'inventario', '602': 'rientro', '262': 'rientro'}[x.tipo] || x.tipo) + (x.rif ? ' · ' + e(x.rif) : ''), e(x.colata || '') + (x.fornitore ? ' · ' + x.fornitore : ''), n0(x.qta) + ' ' + um(x.mat),
            '<button type="button" class="lab-btn sec" data-lotto="' + e(x.mat + '|' + x.lotto) + '">Traccia</button>']; }), 'Nessun lotto.') +
          '<p class="lab-nota">Il ferro prende il lotto della <b>colata</b> scritta sul certificato del fornitore all\'entrata merci; le transenne prendono il lotto dell\'<b>ordine di produzione</b>. Le uscite consumano i lotti più vecchi (FIFO).</p>') + dett +
        L.scheda('🔎', 'Reclamo di un cliente: risali dalla consegna', 'MB56 a monte', '<div class="lab-filtro"><label>Consegna <select id="lc"><option value="">— scegli —</option>' + S().consegne.filter(function (c) { return c.tipo === 'LF' && c.lotti; }).map(function (c) { return '<option' + (c.numero === cons ? ' selected' : '') + ' value="' + c.numero + '">' + c.numero + ' · ' + e(U.nome(S(), c.cliente)) + ' · ' + c.qta + ' ' + c.materiale + '</option>'; }).join('') + '</select></label></div>' +
          (cons ? albero(LT.daConsegna(cons)) : '<p class="lab-nota">Se un cliente segnala un difetto, dalla consegna risali ai lotti di transenne e alle colate di ferro; poi dal lotto di ferro scendi a valle per trovare <b>tutti</b> i clienti da avvisare (richiamo).</p>'));
      radice.querySelectorAll('[data-lotto]').forEach(function (b) { b.onclick = function () { radice.dataset.lotto = this.dataset.lotto; rendi(); }; });
      radice.querySelector('#lm').onchange = function () { radice.dataset.mat = this.value; rendi(); };
      radice.querySelector('#le').onchange = function () { radice.dataset.esauriti = this.checked ? '1' : ''; rendi(); };
      radice.querySelector('#lc').onchange = function () { radice.dataset.cons = this.value; rendi(); };
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.struttura)(); }
  rendi();
})();
