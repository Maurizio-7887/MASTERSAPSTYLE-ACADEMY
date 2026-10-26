/* SISTEMA INTEGRATO — Contabilità dei centri di costo (CO-OM-CCA) come in SAP S/4HANA:
   KS03/KSH3/KL03/KA03/OKB9 anagrafiche · KP06 costi pianificati per centro e classe (versioni, PCP dalle paghe) ·
   KP26 attività e LTP volumi · KSU1/KSU8 ribaltamento · KSPI tariffe · KSB1/KB11N consuntivo · S_ALR_87013611 piano/consuntivo.
   Il motore è PC4.cpm (copc-logica.js): un solo stato, nessuna scrittura FI dal piano. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, PC = window.PC4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; }, cp = PC.cpm;
  var barra = function (qui) { return window.COPERCORSO ? window.COPERCORSO.html(S(), qui) : ''; };
  var link = function (dove, testo) { return '<a href="' + window.COPERCORSO.url(dove) + '">' + testo + '</a>'; };
  var r2 = function (x) { return Math.round((Number(x) || 0) * 100) / 100; };
  var nomeCdc = function (k) { var c = cp.cdcDi(k); return c ? k + ' ' + c.nome : k; };
  var TIPI = {servizio: 'Centro di servizio (si ribalta)', produttivo: 'Centro produttivo (tipo attività ORE)', amministrativo: 'Amministrazione (escluso dal costo prodotto)'};

  // ── Passo 1: aprire il piano (prima era «Scrivi ATTIVA» senza spiegazioni) ──
  function apertura() {
    return L.scheda('1️⃣', 'Passo 1 · Apri il piano CO ' + String(S().avviato || '2026').slice(0, 4), 'OKEQ · versione 0 · CO-OM',
      '<p><b>Che cosa fa questo passo.</b> Prepara il controllo di gestione dell’anno come in SAP: crea la <b>versione di piano 0</b> e i dati di partenza che userai nelle pagine successive.</p>' +
      '<ol class="lab-elenco"><li><b>Sei centri di costo</b> con gli stessi codici delle paghe: 4100 Magazzino e 4200 Produzione (centri di servizio), 4210 Taglio, 4220 Piegatura, 4230 Saldatura (centri produttivi), 4300 Amministrazione.</li>' +
      '<li><b>Un tipo di attività ORE</b> per ogni centro produttivo: è la tariffa €/h che entrerà nel costo standard.</li>' +
      '<li><b>Il ciclo standard della transenna TR-STD</b>: 8 kg di ferro, 0,25 h Taglio, 0,20 h Piegatura, 0,40 h Saldatura, senza attrezzaggio.</li>' +
      '<li><b>Valori di partenza del caso</b> (li ritroverai e li confermerai nelle pagine KP06 e KP26): 36.000 € di personale per reparto produttivo, 18.000 € di costi comuni di stabilimento, 1.500 ore all’anno per reparto, 1.200 transenne di volume annuo.</li></ol>' +
      '<p><b>Che cosa NON fa.</b> Non registra niente in contabilità, non crea ordini e non cambia gli ordini o i saldi già esistenti. Il vecchio percorso con tariffa unica e sovraccosti resta solo per i lavori fatti prima.</p>' +
      '<p><b>Dopo:</b> 2 KP06 costi → 3 KP26 ore → 4 KSU1 ribaltamento → 5 KSPI tariffe → 6 CK11N/CK24 costo standard. Meglio farlo in un’azienda nuova, prima dei movimenti di magazzino.</p>' +
      L.modulo('cpm-start', [['conferma', 'Per confermare scrivi ATTIVA', 'text']], [['start', 'Apri il piano CO']]));
  }
  function nonAttivo(qui) {
    radice.innerHTML = U.avviso(S()) + barra(qui) + apertura();
    L.collega(radice, 'cpm-start', {start: cp.attiva}, rendi);
  }
  function pronto(qui) { if (!cp.attivo()) { nonAttivo(qui); return null; } return cp.prepara(); }

  var PAGINE = {
    // ── KS03 · KSH3 · KL03 · KA03 · OKB9 ──
    centri: function () {
      var m = pronto('controllo/'); if (!m) return;
      var pc = cp.costoPaghe(), ts = cp.tariffe();
      radice.innerHTML = U.avviso(S()) + barra('controllo/') +
        '<div class="lab-esito ok">✓ Piano CO ' + m.anno + ' aperto (versione 0, revisione ' + m.revisione + '). Prosegui con ' + link('controllo/kp06', '2 · KP06 Costi per centro') + '.</div>' +
        L.scheda('🌳', 'Gerarchia standard dei centri di costo', 'KSH3 · gruppo H-FT Ferro & Transenne',
          '<ul class="lab-elenco"><li><b>H-FT</b> Ferro &amp; Transenne Srl<ul>' + ['H-SERV Centri di servizio di stabilimento', 'H-PROD Centri produttivi', 'H-AMM Amministrazione e vendite'].map(function (g) {
            return '<li><b>' + e(g) + '</b>: ' + cp.CDC.filter(function (c) { return c.gruppo === g; }).map(function (c) { return c.codice + ' ' + e(c.nome); }).join(' · ') + '</li>'; }).join('') + '</ul></li></ul>' +
          L.tabella(['Centro', 'Descrizione', 'Categoria', 'Responsabile', 'Tipo attività', 'Dipendenti dalle paghe (PA30)'], cp.CDC.map(function (c) {
            return [c.codice, e(c.nome), TIPI[c.tipo], e(c.responsabile), c.attivita || '—', pc[c.codice] ? e(pc[c.codice].dipendenti.join(', ')) : '—']; })) +
          '<p class="lab-nota">I codici sono gli stessi delle paghe: il costo di un dipendente registrato con PC00_M99_CIPE arriva da solo sul suo centro. In SAP un centro produttivo eroga attività (ore) agli ordini; un centro di servizio non ha tariffa e si <b>ribalta</b> sui produttivi; l’amministrazione resta fuori dal costo del prodotto.</p>') +
        L.scheda('⏱️', 'Tipi di attività', 'KL03 · categoria 1 (manuale), unità H',
          L.tabella(['Tipo attività', 'Descrizione', 'Centro', 'Unità', 'Classe secondaria', 'Tariffa di piano (KSPI)›'], cp.centri.map(function (k) {
            var c = cp.cdcDi(cp.CODICE[k]); return [c.attivita, 'Ore ' + k.toLowerCase(), c.codice + ' ' + k, 'H', '944000', m.kspi && m.kspi.revisione === m.revisione ? eur(m.kspi.tariffe[k]) + ' €/h' : '<span class="lab-bd giallo">da calcolare: ' + eur(ts[k].tariffa) + '</span>']; }))) +
        L.scheda('🏷️', 'Classi di costo', 'KA03 · primarie (tipo 1) e secondarie (tipo 42 · 43)',
          L.tabella(['Classe', 'Descrizione', 'Tipo', 'Natura nel piano'], cp.CLASSI.map(function (c) { return [c[0], e(c[1]), '1 · primaria = conto di costo FI', c[2] === 'personale' ? 'Personale' : 'Altri costi del centro']; })
            .concat(cp.SECONDARIE.map(function (c) { return [c[0], e(c[1]), c[2], 'solo CO, nessun conto FI']; })))) +
        L.scheda('🔀', 'Assegnazione automatica del centro', 'OKB9 · per le righe di costo senza centro',
          '<p class="lab-nota">In S/4HANA ogni costo deve finire su un oggetto CO. Le paghe scrivono già il centro; per fitti, assicurazioni, ammortamenti e servizi il centro arriva da questa tabella. Cambiarla rilegge subito il consuntivo.</p>' +
          L.modulo('okb9', cp.CLASSI.map(function (c) { return ['c' + c[0], c[0] + ' ' + c[1], 'select', m.okb9[c[0]], cp.CDC.map(function (x) { return [x.codice, x.codice + ' ' + x.nome]; })]; }), [['okb9', 'Salva le assegnazioni']]));
      L.collega(radice, 'okb9', {okb9: cp.okb9}, rendi);
    },

    // ── KP06: costi pianificati per centro e classe di costo ──
    kp06: function () {
      var m = pronto('controllo/kp06'); if (!m) return;
      var ver = radice.dataset.ver || '0', cdc = radice.dataset.cdc || '4210', riga = (m.piano[ver] || {})[cdc] || {};
      var righe = cp.CDC.map(function (c) {
        var r = m.piano[ver][c.codice] || {};
        return [c.codice + ' ' + e(c.nome)].concat(cp.CLASSI.map(function (k) { return r[k[0]] ? eur(r[k[0]]) : ''; })).concat(['<b>' + eur(cp.totale(r)) + '</b>']); });
      var tot = cp.CDC.reduce(function (t, c) { return t + cp.totale(m.piano[ver][c.codice]); }, 0);
      var ctrl = cp.controlloPersonale();
      radice.innerHTML = U.avviso(S()) + barra('controllo/kp06') +
        '<div class="lab-filtro"><label>Versione <select id="ver">' + Object.keys(cp.VERSIONI).map(function (k) { return '<option value="' + k + '"' + (k === ver ? ' selected' : '') + '>' + k + ' · ' + e(cp.VERSIONI[k]) + '</option>'; }).join('') + '</select></label> ' +
        '<label>Centro di costo <select id="cdc">' + cp.CDC.map(function (c) { return '<option value="' + c.codice + '"' + (c.codice === cdc ? ' selected' : '') + '>' + c.codice + ' ' + e(c.nome) + '</option>'; }).join('') + '</select></label> ' +
        '<span class="lab-nota">Anno ' + m.anno + ' · periodi 1–12 · valuta EUR · layout 1-101 «classi di costo indipendenti dall’attività»</span></div>' +
        '<div class="lab-griglia">' +
        L.scheda('✏️', 'Pianifica il centro ' + nomeCdc(cdc), 'KP06 · versione ' + ver,
          '<p class="lab-nota">Importi <b>annui</b> (SAP li distribuisce in 12 periodi uguali, chiave 1). ' + (ver === '0' ? 'La versione 0 è quella che forma le tariffe.' : 'La versione 1 serve solo da confronto: non cambia tariffe né costi standard.') + '</p>' +
          L.modulo('kp06', cp.CLASSI.map(function (k) { return ['k' + k[0], k[0] + ' ' + k[1] + ' €/anno', 'num', riga[k[0]] || 0]; }), [['kp06', 'Salva il piano del centro']])) +
        L.scheda('👥', 'Riprendi i costi del personale dalle paghe', 'PCP · Personnel Cost Planning → KP06',
          '<p class="lab-nota">Per ogni dipendente in PA30: retribuzione × 13 mensilità (classe 80), INPS ditta e INAIL (81), TFR = retribuzione / 13,5 (82), sul centro di costo del dipendente. È il costo annuo <b>a regime</b> dei dipendenti in forza oggi.</p>' +
          L.modulo('pcp', [['versione', 'Versione di destinazione', 'select', '1', [['1', '1 · confronto (consigliato)'], ['0', '0 · operativa: sostituisce il personale dei centri paghe']]], ['conferma', 'Solo per la versione 0: scrivi SOSTITUISCI', 'text']], [['pcp', 'Trasferisci dalle paghe']])) + '</div>' +
        L.scheda('📋', 'Piano della versione ' + ver + ' per centro e classe di costo', 'KSBP · S_ALR_87013611 (colonna piano)',
          L.tabella(['Centro'].concat(cp.CLASSI.map(function (k) { return k[0] + '›'; })).concat(['Totale €›']), righe.concat([{cls: 'tot', celle: ['Totale'].concat(cp.CLASSI.map(function () { return ''; })).concat([eur(tot)])}]))) +
        L.scheda('🧾', 'Tabella di controllo del budget del personale', 'PCP ↔ KP06 ↔ PC00_M99_CIPE (registro paghe)',
          '<details class="lab-nota" open><summary><b>Come si compila e come si usa</b></summary><ol class="lab-elenco">' +
          '<li><b>Colonna «Paghe a regime»</b>: si compila da sola dall’anagrafica dei dipendenti (PA30). Se assumi o cambi la retribuzione, cambia qui.</li>' +
          '<li><b>Colonna «Piano versione 0»</b>: è il personale che hai pianificato in KP06 per il centro. Si cambia solo in KP06 (o con il trasferimento PCP nella versione 0).</li>' +
          '<li><b>Differenza</b> = piano − paghe. Positiva: il budget prevede più personale di quello in forza (assunzioni da fare, come nei tre reparti del caso). Negativa: il budget non copre i dipendenti che hai già.</li>' +
          '<li><b>Consuntivo registro paghe</b>: retribuzioni, oneri e TFR già registrati in contabilità nell’anno, letti dalle scritture PAGHE con il loro centro. <b>Consumo %</b> = consuntivo / piano: a fine anno dovrebbe avvicinarsi al 100%.</li>' +
          '<li><b>Come usarla</b>: prima di salvare le tariffe (KSPI) controlla che ogni differenza abbia una spiegazione; durante l’anno guarda il consumo % dopo ogni registrazione delle paghe. Il budget non si corregge per far tornare il consuntivo: le differenze si spiegano.</li></ol></details>' +
          L.tabella(['Centro', 'Dipendenti in forza', 'Paghe a regime €›', 'Piano versione 0 €›', 'Differenza €›', 'Versione 1 €›', 'Consuntivo registro paghe €›', 'Consumo %›'], ctrl.map(function (r) {
            return [r.cdc + ' ' + e(r.nome), r.dipendenti.length ? e(r.dipendenti.join(', ')) : '—', eur(r.paghe), eur(r.piano), (Math.abs(r.differenza) < 0.005 ? '' : r.differenza > 0 ? '<span class="lab-bd giallo">' : '<span class="lab-bd arancio">') + eur(r.differenza) + (Math.abs(r.differenza) < 0.005 ? '' : '</span>'),
              eur(r.versione1), eur(r.consuntivo), r.consumo == null ? '—' : n0(r.consumo) + ' %']; }).concat([{cls: 'tot', celle: ['Totale', '', eur(ctrl.reduce(function (t, r) { return t + r.paghe; }, 0)), eur(ctrl.reduce(function (t, r) { return t + r.piano; }, 0)), eur(ctrl.reduce(function (t, r) { return t + r.differenza; }, 0)), eur(ctrl.reduce(function (t, r) { return t + r.versione1; }, 0)), eur(ctrl.reduce(function (t, r) { return t + r.consuntivo; }, 0)), '']}])));
      ['ver', 'cdc'].forEach(function (id) { var x = radice.querySelector('#' + id); if (x) x.onchange = function () { radice.dataset[id] = this.value; rendi(); }; });
      L.collega(radice, 'kp06', {kp06: function (i) { i.versione = ver; i.cdc = cdc; return cp.salvaKP06(i); }}, rendi);
      L.collega(radice, 'pcp', {pcp: cp.trasferisciPaghe}, rendi);
    },

    // ── KP26: attività pianificate · LTP: volumi annui ──
    kp26: function () {
      var m = pronto('controllo/kp26'); if (!m) return;
      var rep = cp.report(), campi = [];
      cp.centri.forEach(function (k) { var c = m.centri[k]; campi.push([k + '_capacita', cp.CODICE[k] + ' ' + k + ' · capacità disponibile h/anno', 'num', c.capacita], [k + '_orePiano', cp.CODICE[k] + ' ' + k + ' · ore pianificate (base della tariffa) h/anno', 'num', c.orePiano]); });
      radice.innerHTML = U.avviso(S()) + barra('controllo/kp26') + '<div class="lab-griglia">' +
        L.scheda('⏱️', 'Pianifica le ore dei centri produttivi', 'KP26 · tipo attività ORE',
          '<p class="lab-nota"><b>Capacità</b>: ore disponibili nell’anno (calendario × persone/macchine). <b>Ore pianificate</b>: la base su cui dividi i costi del centro per ottenere la tariffa; non possono superare la capacità. Caso: 1.500 e 1.500 per ogni reparto.</p>' +
          L.modulo('kp26', campi, [['kp26', 'Salva le attività pianificate']])) +
        L.scheda('📦', 'Volumi annui dei prodotti', 'LTP · MS01 · scenario di pianificazione a lungo termine',
          '<p class="lab-nota">Pezzi previsti per tutto l’anno, non il lotto di un ordine. Servono a calcolare le ore richieste e la saturazione. Caso: 1.200 TR-STD, 0 per gli altri.</p>' +
          L.modulo('ltp', Object.keys(m.standard).map(function (mat) { return ['vol_' + mat, mat + ' · pezzi/anno', 'num', m.volumi[mat] || 0]; }), [['ltp', 'Salva i volumi']])) + '</div>' +
        L.scheda('📊', 'Ore richieste dal volume e saturazione', 'KP26 ↔ LTP · CM01',
          L.tabella(['Centro', 'Capacità h›', 'Ore pianificate h›', 'Ore richieste dal volume h›', 'Saturazione %›'], rep.centri.map(function (r) {
            return [cp.CODICE[r.centro] + ' ' + r.centro, n0(r.capacita), n0(r.orePiano), n0(r.oreRichieste), n0(r.saturazione) + (r.saturazione > 100 ? ' ⚠ sovraccarico' : '')]; })) +
          '<p class="lab-nota">Le ore richieste (1.200 × 0,25 = 300 h al Taglio) non sostituiscono le ore pianificate: la tariffa si calcola sulla capacità che decidi di pagare; la parte non usata diventa varianza di assorbimento.</p>');
      L.collega(radice, 'kp26', {kp26: cp.salvaKP26}, rendi);
      L.collega(radice, 'ltp', {ltp: cp.salvaVolumi}, rendi);
    },

    // ── KSU1 · KSU8 · KSU5: ribaltamento dei centri di servizio ──
    ksu: function () {
      var m = pronto('controllo/ksu'); if (!m) return;
      var ts = cp.tariffe(), rep = cp.report(), campi = [['driver', 'Regola del ciclo', 'select', m.generale.driver, [['ore', 'Ore pianificate dei centri ricevitori (KP26)'], ['percentuali', 'Percentuali fisse']]]];
      cp.centri.forEach(function (k) { campi.push([k + '_percentuale', cp.CODICE[k] + ' ' + k + ' · quota % (solo con percentuali)', 'num', Math.round(m.centri[k].percentuale * 100) / 100]); });
      radice.innerHTML = U.avviso(S()) + barra('controllo/ksu') +
        L.scheda('🔁', 'Ciclo di ribaltamento FT-STAB', 'KSU1 · segmento 1 · classe secondaria 943000',
          '<p class="lab-nota"><b>Mittenti</b>: 4100 Magazzino e 4200 Produzione (costi comuni di stabilimento). <b>Ricevitori</b>: 4210 Taglio, 4220 Piegatura, 4230 Saldatura. 4300 Amministrazione non partecipa: resta fuori dal costo del prodotto. Il ribaltamento è solo CO: la contabilità FI non cambia.</p>' +
          L.modulo('ksu1', campi, [['ksu1', 'Salva il ciclo']])) +
        L.scheda('▶️', 'Ribaltamento di piano', 'KSU8 · versione 0',
          L.tabella(['Ricevitore', 'Base (ore pianificate o %)›', 'Quota›', 'Ribaltato €›'], cp.centri.map(function (k) {
            var tot = cp.centri.reduce(function (t, x) { return t + m.centri[x].orePiano; }, 0), q = m.generale.driver === 'ore' ? m.centri[k].orePiano / tot : m.centri[k].percentuale / 100;
            return [cp.CODICE[k] + ' ' + k, m.generale.driver === 'ore' ? n0(m.centri[k].orePiano) + ' h' : n0(m.centri[k].percentuale) + ' %', n0(q * 100) + ' %', eur(ts[k].ribaltato)]; })
            .concat([{cls: 'tot', celle: ['Mittenti 4100 + 4200', '', '', eur(m.generale.produttivi)]}])) +
          '<p class="lab-nota">Caso: 18.000 × 1.500 / 4.500 = 6.000 € per reparto. Il piano si ribalta in automatico ogni volta che cambi KP06, KP26 o il ciclo.</p>') +
        L.scheda('📆', 'Ribaltamento effettivo', 'KSU5 · consuntivo dell’anno',
          L.tabella(['Ricevitore', 'Costi effettivi dei mittenti ribaltati €›'], rep.centri.map(function (r) { return [cp.CODICE[r.centro] + ' ' + r.centro, eur(r.ribaltatoEffettivo)]; })) +
          '<p class="lab-nota">Si ribaltano i costi <b>effettivi</b> registrati in contabilità su 4100 e 4200 (paghe del magazzino e della produzione, fitto, ammortamenti, servizi) con la stessa regola del ciclo.</p>');
      L.collega(radice, 'ksu1', {ksu1: cp.salvaCiclo}, rendi);
    },

    // ── KSPI: calcolo delle tariffe di piano ──
    kspi: function () {
      var m = pronto('controllo/kspi'); if (!m) return;
      var ts = cp.tariffe(), ok = m.kspi && m.kspi.revisione === m.revisione;
      radice.innerHTML = U.avviso(S()) + barra('controllo/kspi') +
        (ok ? '<div class="lab-esito ok">✓ Tariffe calcolate il ' + fd(m.kspi.data) + ' per la revisione ' + m.revisione + '. Prosegui con ' + link('costi/calcolo', '6 · CK11N Calcolo del costo standard') + '.</div>'
          : '<div class="lab-esito ko">⚠ Le tariffe non sono calcolate per la revisione ' + m.revisione + ' del piano: CK11N si ferma finché non esegui il calcolo.</div>') +
        L.scheda('🧮', 'Calcolo delle tariffe di piano', 'KSPI · versione 0 · anno ' + m.anno,
          L.tabella(['Centro', 'Personale €›', 'Altri costi del centro €›', 'Ribaltato da 4100+4200 €›', 'Costi del centro €›', 'Ore pianificate›', 'Tariffa €/h›'], cp.centri.map(function (k) {
            var t = ts[k]; return [cp.CODICE[k] + ' ' + k + ' (' + cp.cdcDi(cp.CODICE[k]).attivita + ')', eur(t.personale), eur(t.indiretti), eur(t.ribaltato), eur(t.budget), n0(t.orePiano), '<b>' + eur(t.tariffa) + '</b>']; })) +
          '<p class="lab-nota">Tariffa = costi del centro (personale + altri costi + quota ribaltata) / ore pianificate. Caso: (36.000 + 0 + 6.000) / 1.500 = <b>28 €/h</b>. È un costo standard, non un prezzo di vendita.</p>' +
          L.modulo('kspi', [['data', 'Data di esecuzione', 'date']], [['kspi', 'Esegui il calcolo delle tariffe']]));
      L.collega(radice, 'kspi', {kspi: cp.eseguiKSPI}, rendi);
    },

    // ── KSB1 · KB11N: partite effettive ──
    ksb1: function () {
      var m = pronto('controllo/ksb1'); if (!m) return;
      var filtro = radice.dataset.cdc || '', eff = cp.effettivi(m.anno), righe = eff.righe.filter(function (x) { return !filtro || x.cdc === filtro; });
      var attivita = [];
      S().produzione.forEach(function (o) { o.eventi.filter(function (x) { return x.tipo === 'CO11N' && !x.stornato && Number(String(x.data).slice(0, 4)) === m.anno; }).forEach(function (x) {
        var k = x.centro || x.fase || ((o.piano.par.snapshot || {}).fasi || ['Taglio'])[0], cod = cp.CODICE[k] || '';
        if (!filtro || filtro === cod) attivita.push([fd(x.data), cod + ' ' + k, 'ordine ' + o.numero + ' · ' + o.materiale, n0((x.ore || 0) + (x.attrezzaggio || 0)) + ' h', eur(-x.valore)]); }); });
      radice.innerHTML = U.avviso(S()) + barra('controllo/ksb1') +
        '<div class="lab-filtro"><label>Centro di costo <select id="cdc"><option value="">Tutti</option>' + cp.CDC.map(function (c) { return '<option value="' + c.codice + '"' + (c.codice === filtro ? ' selected' : '') + '>' + c.codice + ' ' + e(c.nome) + '</option>'; }).join('') + '</select></label>' +
        ' <span class="lab-nota">Anno ' + m.anno + ' · righe lette dal libro giornale (ACDOCA), niente da riportare a mano</span></div>' +
        L.scheda('📄', 'Partite singole effettive: costi primari', 'KSB1 · origine: riga FI con centro, oppure OKB9',
          L.tabella(['Data', 'Documento', 'Centro', 'Classe', 'Origine', 'Testo', 'Importo €›'], righe.map(function (x) { return [fd(x.data), e(x.documento) + ' ' + e(x.tipo), e(nomeCdc(x.cdc)), x.classe, x.origine, e(x.testo || ''), eur(x.importo)]; }), 'Nessun costo effettivo nell’anno per questo filtro.')) +
        L.scheda('⏱️', 'Partite singole effettive: attività addebitate agli ordini', 'KSB1 · classe 944000 (CO11N → D 72 / A 75)',
          L.tabella(['Data', 'Centro', 'Ricevitore', 'Ore›', 'Accredito al centro €›'], attivita, 'Nessuna conferma di produzione.') +
          '<p class="lab-nota">Le conferme scaricano il centro (importo negativo) e caricano l’ordine. Non sono un secondo costo del personale: sono lo stesso costo spostato dal centro al prodotto.</p>') +
        L.scheda('↔️', 'Riattribuisci un costo fra centri', 'KB11N · registrazione manuale di riattribuzione',
          '<p class="lab-nota">Esempio: lo stipendio di Sara Bianchi, saldatrice, arriva dalle paghe sul 4200 Produzione; se lavora tutta in saldatura puoi spostarlo al 4230. Solo CO: il libro giornale non cambia.</p>' +
          L.modulo('kb11n', [['data', 'Data', 'date'], ['da', 'Dal centro', 'select', '4200', cp.CDC.map(function (c) { return [c.codice, c.codice + ' ' + c.nome]; })], ['a', 'Al centro', 'select', '4230', cp.CDC.map(function (c) { return [c.codice, c.codice + ' ' + c.nome]; })],
            ['classe', 'Classe di costo', 'select', '80', cp.CLASSI.map(function (c) { return [c[0], c[0] + ' ' + c[1]]; })], ['importo', 'Importo €', 'num'], ['testo', 'Motivo', 'text']], [['kb11n', 'Registra la riattribuzione']]));
      var x = radice.querySelector('#cdc'); if (x) x.onchange = function () { radice.dataset.cdc = this.value; rendi(); };
      L.collega(radice, 'kb11n', {kb11n: cp.riattribuisci}, rendi);
    },

    // ── S_ALR_87013611 · KSBT · KKBC: piano/consuntivo del periodo, attività assorbite e WIP ──
    report: function () {
      var m = pronto('controllo/report'); if (!m) return;
      var r = cp.report(m.anno, {mese: radice.dataset.mese || ''}), P = r.periodo, eff = r.costiCentri.perCentro;
      var MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
      var nomeP = (P.mesi === 1 ? MESI[P.mese - 1] : MESI[P.inizio - 1] + '–' + MESI[P.mese - 1]) + ' ' + P.anno;
      var oreTot = function (f) { return r.centri.reduce(function (t, x) { return t + x[f]; }, 0); };
      var att = r2(oreTot('assorbito')), quadra = Math.abs(att - r.fi.attivita) < 0.01 && Math.abs(att + r.fi.accreditiCentri) < 0.01;
      var out = r.prodotti.reduce(function (t, p) { return t + p.accredito; }, 0), wip = r.prodotti.reduce(function (t, p) { return t + p.saldoOrdini; }, 0);
      var righeFI = r.costiCentri.righe.length;
      var avviso = P.pagheRegistrate ? '' : '<p class="lab-esito attenzione">⚠ Le paghe di ' + MESI[P.mese - 1] + ' non sono ancora registrate: il consuntivo del periodo è <b>parziale</b> (contiene solo le scritture già fatte). Spesa e assorbimento si leggono dopo la registrazione delle paghe e le scritture di fine mese.</p>';
      radice.innerHTML = U.avviso(S()) + barra('controllo/report') +
        '<div class="lab-filtro"><label>Periodo: da ' + MESI[P.inizio - 1] + ' a <select id="mese">' + MESI.map(function (n, k) { return k + 1 < P.inizio ? '' : '<option value="' + (k + 1) + '"' + (k + 1 === P.mese ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
        ' <span class="lab-nota">' + P.mesi + (P.mesi === 1 ? ' mese' : ' mesi') + ' di attività su 12: il budget del periodo è il budget annuo × ' + P.mesi + '/12 (nessuna stagionalità dichiarata). Ultimo movimento: ' + (P.ultimaData ? fd(P.ultimaData) : '—') + '.</span></div>' +
        '<div class="lab-nota"><b>Come si legge questa pagina, in 4 passi.</b> 1 · quante ore hanno lavorato i reparti e quanto valgono (attività passate agli ordini); 2 · quanto è costato davvero ogni centro (consuntivo letto dalla contabilità); 3 · la differenza fra i due (residuo del centro); 4 · dove sono finite le attività (ordini → magazzino) senza contarle due volte.</div>' +

        L.scheda('⏱️', '1 · Attività: ore dichiarate e valore passato agli ordini', 'KSBT · tariffe di piano · ' + nomeP,
          L.tabella(['Centro', 'Ore piano anno›', 'Ore piano del periodo›', 'Ore dichiarate (CO11N)›', 'Tariffa €/h›', 'Attività assorbite €›', 'Var. efficienza €›'], r.centri.map(function (x) {
            return [cp.CODICE[x.centro] + ' ' + x.centro, n0(x.orePiano), n0(x.orePianoPeriodo), n0(x.oreEffettive), eur(x.tariffa), '<b>' + eur(x.assorbito) + '</b>', eur(x.varianzaEfficienza)]; })
            .concat([{cls: 'tot', celle: ['Totale', n0(oreTot('orePiano')), n0(oreTot('orePianoPeriodo')), n0(oreTot('oreEffettive')), '', eur(att), eur(oreTot('varianzaEfficienza'))]}])) +
          '<p class="lab-nota">Attività assorbite = ore dichiarate × tariffa. In contabilità sono la scrittura D 72 / A 75 delle conferme: conto 72 = <b>' + eur(r.fi.attivita) + '</b>, conto 75 = <b>' + eur(-r.fi.accreditiCentri) + '</b> ' +
          (quadra ? '✓ coincidono con la tabella.' : '⚠ non coincidono con la tabella: controlla le conferme stornate o registrate in un altro periodo.') +
          ' Non sono un secondo costo del personale: sono il costo dei centri <b>spostato</b> sugli ordini. Var. efficienza = ore dichiarate rispetto alle ore standard dei pezzi confermati (zero se coincidono).</p>') +

        L.scheda('📊', '2 · Costi effettivi dei centri: piano/consuntivo', 'S_ALR_87013611 · versione 0 · ' + nomeP,
          avviso +
          L.tabella(['Centro', 'Piano annuo €›', 'Piano del periodo €›', 'Consuntivo del periodo €›', 'Scostamento €›', 'Scost. %›'], cp.CDC.map(function (c) {
            var pa = cp.totale(m.piano['0'][c.codice]), pp = r2(pa * P.quota), a = cp.totale(eff[c.codice]);
            return [c.codice + ' ' + e(c.nome), eur(pa), eur(pp), '<b>' + eur(a) + '</b>', eur(a - pp), pp ? n0((a - pp) / pp * 100) + ' %' : '—']; })) +
          '<p class="lab-nota">Il consuntivo <b>non si scrive a mano</b>: sono le righe di costo della contabilità (conti 50, 54, 80–83, 86) lette con il centro della riga o, se manca, con la tabella OKB9 (' + righeFI + (righeFI === 1 ? ' riga' : ' righe') + ' nel periodo: dettaglio in ' + link('controllo/ksb1', 'Consuntivo dei centri (KSB1)') + '). ' +
          'Le attività del passo 1 <b>non</b> entrano qui: sommarle ai costi sarebbe una duplicazione. Uno zero non vuol dire costo gratuito: vuol dire che la scrittura non c’è ancora (per esempio le paghe del mese).</p>') +

        L.scheda('🎯', '3 · Centri produttivi: residuo e scostamenti', 'KSB5 · analisi degli scostamenti · ' + nomeP,
          L.tabella(['Centro', 'Budget del periodo €›', 'Costi propri €›', 'Costi comuni ribaltati €›', 'Consuntivo €›', 'Attività assorbite €›', 'Residuo €›', 'Var. spesa €›', 'Var. assorbimento €›'], r.centri.map(function (x) {
            return [cp.CODICE[x.centro] + ' ' + x.centro, eur(x.budgetPeriodo), eur(x.primari), eur(x.ribaltatoEffettivo), '<b>' + eur(x.consuntivo) + '</b>', eur(x.assorbito), '<b>' + eur(x.residuo) + '</b>', eur(x.varianzaSpesa), eur(x.varianzaAssorbimento)]; })) +
          '<ul class="lab-elenco"><li><b>Consuntivo del reparto</b> = costi propri del reparto (passo 2, centri 4210–4230) + costi comuni effettivi di 4100 e 4200 ribaltati con la regola del ciclo KSU1.</li>' +
          '<li><b>Residuo</b> = consuntivo − attività assorbite. Negativo: gli ordini hanno ricevuto più costo di quello registrato finora (tipico a metà mese, prima delle paghe). Positivo: costi rimasti sul centro.</li>' +
          '<li><b>Var. spesa</b> = consuntivo − budget del periodo. <b>Var. assorbimento</b> = budget del periodo − attività assorbite (ore pianificate non lavorate). Spesa + assorbimento = residuo.</li></ul>') +

        L.scheda('📦', '4 · Ordini e WIP: le attività finiscono nel prodotto una volta sola', 'KKBC · KKS2 · ' + nomeP,
          L.tabella(['Prodotto', 'Volume budget del periodo›', 'Pezzi versati›', 'Materiali €›', 'Attività €›', 'Costi degli ordini €›', 'Versato a magazzino (101) €›', 'WIP / saldo ordini €›'], r.prodotti.filter(function (p) { return p.volumeBudget || p.finiti || p.costiOrdini; }).map(function (p) {
            return [p.materiale, n0(p.volumeBudgetPeriodo), n0(p.finiti), eur(p.materiali), eur(p.attivita), eur(p.costiOrdini), eur(p.accredito), '<b>' + eur(p.saldoOrdini) + '</b>']; }), 'Nessun ordine nel periodo.') +
          '<p class="lab-nota">Il percorso del costo: ferro consumato (conto 70 = ' + eur(r.fi.materiali) + ') + attività dei centri (conto 72 = ' + eur(r.fi.attivita) + ') entrano negli ordini; con il versamento 101 escono verso il magazzino come prodotto (conto 73 = ' + eur(-r.fi.output) + '). ' +
          'Versato a magazzino ' + eur(out) + ', WIP residuo ' + eur(wip) + (Math.abs(wip) < 0.01 ? ': ordini chiusi, nessun costo rimasto in produzione.' : ': costi ancora negli ordini aperti (si liquidano con KO88 a fine mese).') +
          ' Ogni euro è contato una volta: nel centro finché non è assorbito, nell’ordine finché non è versato, nel magazzino dopo.</p>');
      var x = radice.querySelector('#mese'); if (x) x.onchange = function () { radice.dataset.mese = this.value; rendi(); };
    }
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.centri)(); }
  rendi();
})();
