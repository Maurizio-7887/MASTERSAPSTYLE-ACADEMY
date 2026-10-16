/* SISTEMA INTEGRATO — Dati di base: avvio, anagrafiche, condizioni di prezzo (VK11 / VK13 / V/08). */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, S = function () { return N.S; };
  var PAGINE = {
    avvio: function () {
      radice.innerHTML =
        (S().costituzione
          ? L.scheda('🏛️', 'Azienda nuova: costituita il ' + L.fd(S().costituzione.data), 'capitale sociale ' + eur(S().costituzione.capitale) + ' €',
              '<div class="lab-esito ok">✓ Costituzione registrata: D 08 Crediti verso soci / A 30 Capitale sociale ' + eur(S().costituzione.capitale) + ' €. Magazzino vuoto, nessun cliente con debiti, banca a zero. La TR-STD si produce in tre stadi (SL-TAGLIO → SL-PIEGA → TR-STD); costi standard 14,60 · 20,20 · 31,40 €/pz già rilasciati; tre dipendenti assunti oggi.</div>' +
              (N.saldo('08') > 0.004 ? L.modulo('vs', [['importo', 'Importo versato (vuoto = tutto il sottoscritto)', 'num'], ['data', 'Data del versamento', 'date', S().costituzione.data]], [['vs', 'Registra il versamento dei soci']]) +
                '<p class="lab-nota">I soci versano il capitale sul conto corrente della società: D 10 Banca / A 08 Crediti verso soci. Ancora da versare: <b>' + eur(N.saldo('08')) + ' €</b>.</p>'
                : '<p class="lab-nota">Capitale interamente versato: crediti verso soci (08) a zero.</p>'))
          : L.scheda('🚀', 'Avvio del sistema integrato', 'società 1000 · area vendite 1000/10/00', (S().avviato
          ? '<div class="lab-esito ok">✓ Sistema avviato il ' + L.fd(S().avviato) + ': banca 50.000 €, magazzino 500 TR-STD · 200 TR-ALTA · 300 TR-PED a costo standard, listino e condizioni predefinite caricate.</div>'
          : L.modulo('av', [['data', 'Data di avvio', 'date']], [['av', 'Avvia il sistema']]) +
            '<p class="lab-nota">Crea i saldi di apertura (banca 50.000 €; magazzino prodotti finiti a costo standard, movimento 561) e le condizioni di listino: PR00 60 / 72 / 55 €, scaglioni ZSCA 2% da 100 pz e 4% da 300 pz, trasporto KF00 1,50 €/pz per il Lazio, provvigione ERB1 3%.</p>'))) +
        (S().avviato ? '' : L.scheda('🏛️', 'Oppure: azienda nuova (costituzione)', 'esercizio «Dicembre: dalla costituzione alla riapertura»', L.modulo('cs', [['data', 'Data di costituzione', 'date'], ['capitale', 'Capitale sociale sottoscritto €', 'num', 80000]], [['cs', 'Costituisci la società']]) +
            '<p class="lab-nota">L\'azienda nasce da zero: <b>nessuna scorta, banca a zero</b>, i soci sottoscrivono il capitale (D 08 / A 30) e poi lo versano. La transenna standard si fa in <b>tre stadi con i semilavorati a magazzino</b> (taglio, piega, saldatura). Stesso listino e stesse condizioni di vendita.</p>')) +
        L.scheda('🧭', 'Cosa c\'è in questo sistema', 'S/4 didattico', '<ul class="lab-elenco"><li><b>Un solo libro giornale</b> per tutti i moduli: ogni documento logistico genera la sua scrittura.</li>' +
          '<li><b>Numerazione dei documenti</b> come in SAP: ordini 1000xxxx, consegne 8000xxxx, fatture 9000xxxx, resi 6000xxxx, contabili 1000xxxxx.</li>' +
          '<li><b>Flusso documenti</b> (VA03): ordine → consegna → fattura → nota di credito.</li><li><b>CO-PA</b>: ogni fattura scrive i campi valore per cliente, materiale, regione, canale.</li></ul>') +
        L.scheda('⏩', 'Parti da febbraio', 'situazione pronta', '<button type="button" class="lab-btn sec" id="gennaio">Carica la situazione di fine gennaio (vendite completate)</button><p class="lab-nota">Esegue in automatico tutto gennaio dell\'esercizio (avvio, condizioni, quattro ordini, acconto, resi, abbuono, incasso): serve per cominciare dai costi del prodotto. Sostituisce il lavoro attuale del sistema integrato.</p>') +
        L.scheda('♻️', 'Ricomincia', '', '<button type="button" class="lab-btn rosso" id="azzera">Azzera il sistema integrato</button><p class="lab-nota">Cancella documenti e scritture di questo sistema; il simulatore principale e i laboratori non cambiano.</p>');
      L.collega(radice, 'av', {av: SD.avviaSistema}, rendi);
      L.collega(radice, 'cs', {cs: function (v) { v.modo = 'costituzione'; return SD.avviaSistema(v); }}, rendi);
      L.collega(radice, 'vs', {vs: N.versaCapitale}, rendi);
      radice.querySelector('#gennaio').onclick = function () { if (confirm('Sostituire il lavoro del sistema integrato con la situazione di fine gennaio?')) { window.LabCopioni.esegui(window.LabCopioni.SD4, SD, 'Febbraio:'); if (window.MSA_SALVA) window.MSA_SALVA(); rendi(); } };
      radice.querySelector('#azzera').onclick = function () { if (confirm('Azzerare il sistema integrato?')) { N.azzera(); rendi(); } };
    },
    anagrafiche: function () {
      radice.innerHTML = U.avviso(S()) +
        L.scheda('👥', 'Clienti', 'XD03', L.tabella(['Cliente', 'Nome', 'Regione', 'Canale', 'Gruppo clienti', 'Pagamento', 'Partite aperte €›'], Object.keys(S().clienti).map(function (k) {
          var c = S().clienti[k]; return [k, e(c.nome), c.regione, c.canale, c.gruppo, c.pagamento, eur(N.saldo('11', k))]; }))) +
        L.scheda('🏭', 'Fornitori', 'XK03', L.tabella(['Fornitore', 'Nome', 'Regione', 'Pagamento', 'Debito aperto €›'], Object.keys(S().fornitori || {}).map(function (k) {
          var f = S().fornitori[k]; return [k, e(f.nome), f.regione, f.pagamento, eur(-N.saldo('20', k))]; }))) +
        L.scheda('📦', 'Materiali e giacenze', 'MM03 · MMBE', L.tabella(['Materiale', 'Tipo', 'Descrizione', 'Controllo prezzo', 'Costo standard›', 'Giacenza›', 'Valore a standard›'], Object.keys(S().materiali).map(function (k) {
          var m = S().materiali[k]; return [k, m.tipo || '', e(m.nome), 'S standard', eur(m.std), n0(S().giacenze[k]) + ' ' + (m.um || 'pz'), eur(S().giacenze[k] * m.std)]; })) +
          '<p class="lab-nota">Prodotti finiti (FERT) e materia prima (ROH). Il valore di bilancio dopo la chiusura del Material Ledger è al prezzo effettivo: vedi Costi del prodotto → Material Ledger.</p>');
    },
    condizioni: function () {
      var tipi = Object.keys(SD.TIPI).filter(function (t) { return ['PR00', 'K007', 'KF00'].indexOf(t) >= 0; });
      var righe = S().condizioni.map(function (c) {
        var chiave = [c.cliente ? c.cliente + ' ' + U.nome(S(), c.cliente) : '', c.materiale || '', c.regione || ''].filter(Boolean).join(' / ') || 'tutti';
        var val = c.scaglioni ? c.scaglioni.map(function (s) { return 'da ' + s[0] + ' pz: ' + s[1] + '%'; }).join(' · ') : (c.tipo === 'PR00' || c.tipo === 'KF00' ? eur(c.valore) + ' €' : n0(c.valore) + ' %');
        return [c.tipo, SD.TIPI[c.tipo], c.chiave, e(chiave), val, c.origine];
      });
      radice.innerHTML = U.avviso(S()) +
        '<div class="lab-griglia">' +
        L.scheda('✍️', 'Crea condizione', 'VK11', L.modulo('vk', [['tipo', 'Tipo condizione', 'select', 'PR00', tipi.map(function (t) { return [t, t + ' — ' + SD.TIPI[t]]; })],
          ['cliente', 'Cliente (vuoto = tutti, solo PR00)', 'select', '', [['', '—']].concat(U.clienti(S()))], ['materiale', 'Materiale (PR00)', 'select', 'TR-ALTA', U.vendibili(S())],
          ['regione', 'Regione (KF00)', 'text'], ['valore', 'Valore (€ o %)', 'num']], [['vk', 'Salva condizione']])) +
        L.scheda('🧮', 'Simula la determinazione prezzi', 'VA01 → Condizioni', L.modulo('si', [['cliente', 'Cliente', 'select', 'C100', U.clienti(S())], ['materiale', 'Materiale', 'select', 'TR-STD', U.vendibili(S())], ['qta', 'Quantità', 'num', 300]], [['si', 'Calcola']])) +
        '</div>' +
        L.scheda('📋', 'Condizioni registrate', 'VK13', L.tabella(['Tipo', 'Descrizione', 'Chiave', 'Valori chiave', 'Valore', 'Origine'], righe, 'Avvia il sistema per caricare il listino.')) +
        L.scheda('🔧', 'Procedura di calcolo ZFT001', 'V/08', L.tabella(['Passo', 'Cond.', 'Descrizione', 'Da passo', 'Sequenza di accesso / note'], [
          ['10', 'PR00', 'Prezzo', '', '1) cliente/materiale  2) materiale — si ferma al primo record trovato'],
          ['20', 'ZSCA', 'Sconto quantità a scaglioni', '10', '% sul lordo, scaglione in base alla quantità della posizione'],
          ['30', 'K007', 'Sconto cliente', '10', '% sul lordo'], ['40', 'KF00', 'Trasporto', '', '€/pz per regione del cliente'],
          ['100', '', 'Netto', '', 'subtotale'], ['110', 'MWST', 'IVA', '100', '22%'], ['120', 'ERB1', 'Provvigione agente', '100', 'accantonamento: D 57 / A 26'],
          ['130', 'VPRS', 'Costo standard', '', 'statistica: serve al margine e al CO-PA']]));
      L.collega(radice, 'vk', {vk: SD.creaCondizione}, rendi);
      L.collega(radice, 'si', {si: function (v) { var p = SD.prezzi(v.cliente, v.materiale, L.num(v.qta, 'Quantità', 1));
        return '<!--info--><p class="lab-nota">Traccia della sequenza di accesso PR00: ' + p.traccia.map(function (t) { return t.accesso + ' → ' + t.esito; }).join(' · ') + '</p>' + U.righePrezzi(p); }});
    },
    ruoli: function () {
      var AU = window.AU4, a = AU.stato(), R = AU.RUOLI, ruoli = Object.keys(R), ogg = Object.keys(AU.A);
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🔐', 'Autorizzazioni e ruolo in uso', 'SU01 · PFCG', L.modulo('au', [['attivo', 'Controllo delle autorizzazioni', 'select', a.attivo ? 'si' : 'no', [['no', 'spento: tutti fanno tutto'], ['si', 'attivo: ogni ruolo fa solo il suo']]],
          ['ruolo', 'Ruolo in uso', 'select', a.ruolo, ruoli.map(function (r) { return [r, R[r].icona + ' ' + R[r].nome]; })]], [['au', 'Applica']]) +
          '<p class="lab-nota">In azienda ognuno ha il suo utente con i suoi ruoli: chi vende non rilascia i crediti, chi compra non approva le proprie richieste, chi conta in magazzino non registra le differenze. Qui lavori da solo, ma «indossi» un ruolo alla volta: con il controllo attivo, in cima a ogni pagina scegli chi sei.</p>') +
        L.scheda('👥', 'Ruoli', 'PFCG', '<ul class="lab-elenco">' + ruoli.map(function (r) { return '<li><b>' + R[r].icona + ' ' + R[r].nome + '</b> — ' + e(R[r].descr) + '</li>'; }).join('') + '</ul>') + '</div>' +
        L.scheda('🧩', 'Matrice ruoli × transazioni', 'SUIM · S_TCODE', L.tabella(['Transazione'].concat(ruoli.filter(function (r) { return r !== 'ADMIN'; }).map(function (r) { return '<span title="' + e(R[r].nome) + '">' + R[r].icona + '</span>'; })), ogg.map(function (k) {
          return ['<b>' + e(AU.A[k][0]) + '</b>'].concat(ruoli.filter(function (r) { return r !== 'ADMIN'; }).map(function (r) { return AU.puo(r, k) ? '✓' : ''; })); })) +
          '<p class="lab-nota">Legenda: ' + ruoli.filter(function (r) { return r !== 'ADMIN'; }).map(function (r) { return R[r].icona + ' ' + R[r].nome; }).join(' · ') + '. L\'amministratore (SAP_ALL) può tutto.</p>') +
        L.scheda('⛔', 'Ultimi controlli falliti', 'SU53', L.tabella(['Quando', 'Ruolo', 'Transazione', 'Oggetto'], (a.su53 || []).slice().reverse().map(function (x) { return [x.quando, R[x.ruolo].nome, x.tcode, '<code>' + x.oggetto + '</code>']; }), 'Nessun controllo fallito.'));
      L.collega(radice, 'au', {au: AU.imposta}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.avvio)(); }
  rendi();
})();
