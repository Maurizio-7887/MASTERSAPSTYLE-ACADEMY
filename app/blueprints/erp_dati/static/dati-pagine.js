/* SISTEMA INTEGRATO — Dati di base: avvio, anagrafiche, condizioni di prezzo (VK11 / VK13 / V/08). */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, S = function () { return N.S; };
  // Firenze 30h: percorso operativo senza quiz contabili, soltanto sulla
  // schermata di avvio scelta dal Launchpad. Pistoia mantiene le sue opzioni.
  var firenze30 = /(?:[?&])esercizio_guida=firenze-30(?:&|$)/.test(location.search);
  // Il corso scelto nel Launchpad resta attivo lungo le pagine del simulatore.
  // Nessuna seconda scelta tra Amministrazione, Logistica e Continua.
  var corsoMagazzino = /(?:[?&])esercizio_guida=(?:firenze-30|magazziniere-5)(?:&|$)/.test(location.search) ||
    ['firenze-30', 'magazziniere-5'].indexOf((window.MSA_GUIDA || {}).esercizio) >= 0;
  var PAGINE = {
    avvio: function () {
      // Il reset non deve mai comparire automaticamente nel percorso didattico.
      var occupato = !!(S().avviato || S().costituzione || (S().registrazioni || []).length);
      var haAzienda = !!(S().avviato || S().costituzione);
      var pZero = (!S().avviato && !S().costituzione ? L.scheda('🏛️', 'Nuova azienda · parti da zero', 'percorso consigliato FORMAS / esercizio libero', L.modulo('cs', [['data', 'Data di costituzione', 'date', '2026-12-01'], ['capitale', 'Capitale sociale sottoscritto €', 'num', 80000]], [['cs', 'Crea nuova azienda vuota (costituzione)']]) + '<p class="lab-nota">Registra soltanto la sottoscrizione del capitale. Poi versa i soci, acquista i beni e i materiali con documenti espliciti. I materiali e i costi standard predefiniti sono dati di base, <b>non acquisti né giacenze</b>.</p>') +
          L.scheda('🖥️', 'Executive Assistant · negozio di informatica', 'corso breve per segreteria e assistenti di direzione: niente produzione', L.modulo('ng', [['data', 'Data di apertura (costituzione)', 'date', '2026-09-01'], ['capitale', 'Capitale sociale sottoscritto €', 'num', 30000]], [['ng', 'Apri il negozio Pixel & Bit (costituzione)']]) +
            '<p class="lab-nota">Società nuova che <b>compra e rivende</b> PC, stampanti, monitor, mouse e cavi: 4 fornitori, 2 clienti, 1 dipendente, magazzino W100 con la pistola RF. Registra soltanto la sottoscrizione del capitale; tutto il resto si fa con i documenti dell’esercizio guidato. Le merci (HAWA) sono dati di base, <b>non acquisti né giacenze</b>.</p>') : '') +
        (S().costituzione && S().percorso !== 'logistica' ? L.scheda('🏛️', 'Versa in banca il capitale sottoscritto · società costituita il ' + L.fd(S().costituzione.data), 'capitale sociale ' + eur(S().costituzione.capitale) + ' €',
              '<div class="lab-esito ok">✓ Costituzione registrata: D 08 Crediti verso soci / A 30 Capitale sociale ' + eur(S().costituzione.capitale) + ' €. Magazzino vuoto, nessun cliente con debiti, banca a zero. ' + (S().negozio ? 'Negozio ' + e(S().societa) + ': merci a magazzino al prezzo d’acquisto, listino di vendita già caricato, una dipendente assunta oggi (Chiara Fontana).' : S().produzioneModello === 'wip-fasi-v1' ? 'TR-STD: un ordine con Taglio, Piegatura e Saldatura, tre dichiarazioni separate, costi in WIP analitico fino al versamento finale. SL-TAGLIO: semilavorato autonomo da stoccare. Standard 31,40 e 14,60 €/pz già rilasciati. Tre dipendenti assunti oggi.' : 'Azienda storica: tre ordini SL-TAGLIO → SL-PIEGA → TR-STD; costi standard 14,60 · 20,20 · 31,40 €/pz già rilasciati. Tre dipendenti assunti oggi.') + '</div>' +
              (N.saldo('08') > 0.004 ? L.modulo('vs', [['importo', 'Importo versato (vuoto = tutto il sottoscritto)', 'num'], ['data', 'Data del versamento', 'date', S().costituzione.data]], [['vs', 'Versa in banca']]) +
                '<p class="lab-nota">I soci versano il capitale sul conto corrente della società: D 10 Banca / A 08 Crediti verso soci. Ancora da versare: <b>' + eur(N.saldo('08')) + ' €</b>.</p>'
                : '<p class="lab-nota">Capitale interamente versato: crediti verso soci (08) a zero.</p>')) : '');
      var pAvviata = (S().percorso === 'logistica' ? L.scheda('📦', 'Percorso logistico avviato il ' + L.fd(S().avviato), 'Magazziniere 5.0', '<div class="lab-esito ok">✓ Azienda avviata: banca 50.000 €, prodotti finiti a scaffale a costo standard (561). Produzione della TR-STD a tre fasi sullo stesso ordine. ' + (S().quizContabile === false ? 'Ricostruzione delle scritture disattivata: le scritture si leggono nel libro giornale.' : 'Ricostruzione delle scritture attiva: dopo ogni documento contabile ricostruisci Dare e Avere nella finestra Esercizio.') + '</div>') : '') +
        (!S().avviato ? L.scheda('📦', 'Percorso logistico · Magazziniere 5.0', 'corsi di magazzino e logistica', L.modulo('lg', [['data', 'Data di avvio', 'date', '2027-01-04'], ['quiz', corsoMagazzino ? 'Solo contabilità di magazzino (nessun quiz Dare/Avere)' : 'Ricostruzione delle scritture', 'select', corsoMagazzino ? 'no' : 'si', [['si', 'sì: dopo ogni documento contabile l\'allievo ricostruisce la scrittura'], ['no', 'no: classe solo operativa, scritture visibili nel giornale']]]], [['lg', 'Avvia il percorso logistico']]) + '<p class="lab-nota">Azienda già avviata: banca 50.000 €, a scaffale 200 TR-STD, 200 TR-ALTA e 300 TR-PED; la TR-STD si produce con un ordine a tre fasi (Taglio, Piegatura, Saldatura). Ogni documento registra le sue scritture nel giornale come sempre. Con la ricostruzione attiva (consigliata, come FORMAS) dopo ricevimento merci' + L.sap('MIGO') + ', fattura fornitore' + L.sap('MIRO') + ', consumi, versamenti, rottamazioni e differenze d\'inventario l\'allievo ricostruisce Dare e Avere; per una classe solo operativa si può disattivare. È il percorso dell\'esercizio «Magazziniere 5.0: un mese di magazzino».</p>') : '') +
        (!S().costituzione && S().percorso !== 'logistica' ? L.scheda('🚀', 'Alternativa: saldi già pronti', 'NON usare per FORMAS da zero', (S().avviato
          ? '<div class="lab-esito ok">✓ Sistema avviato il ' + L.fd(S().avviato) + ': banca 50.000 €, magazzino 500 TR-STD · 200 TR-ALTA · 300 TR-PED a costo standard, listino e condizioni predefinite caricate.</div>'
          : L.modulo('av', [['data', 'Data di avvio', 'date']], [['av', 'Carica saldi pronti (NON caso da zero)']]) +
            '<p class="lab-nota">Crea i saldi di apertura (banca 50.000 €; magazzino prodotti finiti a costo standard, movimento 561) e le condizioni di listino: PR00 60 / 72 / 55 €, scaglioni ZSCA 2% da 100 pz e 4% da 300 pz, trasporto KF00 1,50 €/pz per il Lazio, provvigione ERB1 3%.</p>')) : '');
      var pContinua = haAzienda
        ? L.scheda('▶️', 'Continua il tuo lavoro', 'azienda già avviata', '<div class="lab-esito ok">✓ ' + (S().costituzione ? 'Società costituita il ' + L.fd(S().costituzione.data) : 'Azienda avviata il ' + L.fd(S().avviato)) + ' · ' + (S().registrazioni || []).length + ' scritture nel libro giornale.</div><p class="lab-nota"><b>Non premere niente qui:</b> apri la guida (finestra Esercizio) e vai al primo passo non spuntato. Il tuo lavoro è salvato in questo account.</p>')
        : L.scheda('▶️', 'Continua il tuo lavoro', 'nessuna azienda ancora', '<p class="lab-nota">In questo account non c’è ancora un’azienda: scegli <b>Parti da zero</b> oppure <b>Azienda già avviata</b>.</p>');
      var info = '<details class="lab-dett"><summary>ℹ️ Come funziona il sistema</summary><ul class="lab-elenco"><li><b>Un solo libro giornale con mastrini collegati</b> per tutti i moduli: solo le operazioni con effetti contabili generano scritture; ordini e trasferimenti fisici interni non le generano automaticamente.</li>' +
        '<li><b>Numerazione dei documenti</b> come nei grandi ERP: ordini 1000xxxx, consegne 8000xxxx, fatture 9000xxxx, resi 6000xxxx, contabili 1000xxxxx.</li>' +
        '<li><b>Flusso dei documenti</b>' + L.sap('VA03') + ': ordine → consegna → fattura → nota di credito.</li><li><b>Analisi di redditività</b>' + L.sap('CO-PA') + ': ogni fattura scrive i campi valore per cliente, materiale, regione, canale.</li></ul></details>';
      var avanzate = '<details class="lab-dett"><summary>⚙️ Impostazioni avanzate · ricominciare da zero</summary>' + L.scheda('♻️', 'Solo per ricominciare: reset azienda (non necessario per versare il capitale)', 'azione distruttiva solo su conferma', '<p class="lab-nota">Sostituisce l’azienda integrata corrente con un archivio vuoto. <b>Non crea uno spazio aggiuntivo.</b> Account e password restano; documenti, contabilità, magazzino, budget e progresso integrato vengono azzerati. Non modifica gli altri laboratori.</p><button type="button" class="lab-btn sec" id="backup-azienda">1 · Scarica il backup JSON dell’azienda attuale</button><button type="button" class="lab-btn rosso" id="azzera" disabled>2 · Riparti da azienda vuota</button><p id="backup-azienda-esito" role="status">Prima scarica il backup; conservarlo è responsabilità del docente. Nessuna cancellazione automatica.</p>') + '</details>';
      var scelte = [['zero', '🏛️', 'Parti da zero', '<em>Percorso Amministrazione e Contabilità</em>Costituisci la società e versa il capitale (percorso FORMAS / esercizio libero)'], ['avviata', '🚀', 'Azienda già avviata', '<em>Percorso Logistica e Magazzino 5.0</em>Magazzino e logistica, oppure saldi di apertura già pronti'], ['continua', '▶️', 'Continua il mio lavoro', 'Riprendi dall’ultimo passo']];
      var scelta = (S().costituzione && N.saldo('08') > 0.004) || !haAzienda ? 'zero' : 'continua';
      radice.innerHTML = L.scheda('🧭', 'Da dove vuoi partire?', '', '<div class="lab-scelte">' + scelte.map(function (s) {
          return '<button type="button" class="lab-scelta' + (s[0] === scelta ? ' att' : '') + '" data-scelta="' + s[0] + '"><span class="ic">' + s[1] + '</span><b>' + s[2] + '</b><small>' + s[3] + '</small></button>'; }).join('') + '</div>' +
          '<p class="lab-nota">Stesso account = stessa azienda: cambiare percorso non crea archivi separati.</p>') +
        '<div class="lab-pannelli"><div data-pannello="zero">' + pZero + '</div><div data-pannello="avviata">' + pAvviata + '</div><div data-pannello="continua">' + pContinua + '</div></div>' +
        info + avanzate;
      if (corsoMagazzino) {
        // Non modificare mai un archivio esistente e non avviare automaticamente
        // la logistica senza un gesto esplicito dell'allievo.
        var giaLogistica = S().percorso === 'logistica';
        var archivioEstraneo = haAzienda && !giaLogistica;
        var presentazione = '<div class="lab-esito ' + (archivioEstraneo ? 'errore' : 'ok') + '">' +
          (archivioEstraneo
            ? '⚠️ Questo account contiene già un\'azienda di un altro esercizio: la stessa azienda è condivisa fra i corsi. Per proteggere i documenti esistenti, l\'esercizio di magazzino non può essere inizializzato qui. Accedi con un account di prova dedicato al corso, senza cancellare nulla.'
            : giaLogistica
              ? '✓ Percorso magazzino già avviato. Segui il tutor laterale: riprende dall’ultimo passo salvato.'
              : '📦 Primo accesso al corso magazzino: avvia una sola volta il percorso logistico, poi il tutor ti guiderà automaticamente.') +
          '</div>';
        radice.innerHTML = L.scheda('📦',
          firenze30 ? 'Firenze · Magazzino 30 ore' : 'Pistoia · Magazzino 80 ore',
          'Percorso selezionato nel Launchpad · nessuna seconda scelta',
          presentazione + (archivioEstraneo ? '' : giaLogistica ? pContinua : pAvviata));
        // Il reset e le tre scelte rimangono disponibili solo al docente
        // nella navigazione amministrativa ordinaria, non nel corso.
      }
      var mostra = function (c) {
        [].forEach.call(radice.querySelectorAll('[data-pannello]'), function (d) { d.hidden = d.getAttribute('data-pannello') !== c; });
        [].forEach.call(radice.querySelectorAll('[data-scelta]'), function (b) { b.classList.toggle('att', b.getAttribute('data-scelta') === c); });
      };
      [].forEach.call(radice.querySelectorAll('[data-scelta]'), function (b) { b.onclick = function () { mostra(b.getAttribute('data-scelta')); }; });
      if (!corsoMagazzino) mostra(firenze30 ? 'avviata' : S().percorso === 'logistica' ? 'avviata' : scelta);
      if (corsoMagazzino) {
        var avvio30 = radice.querySelector('#lg-quiz');
        if (avvio30) { avvio30.value = 'no'; avvio30.disabled = true; }
        var pan30 = radice.querySelector('[data-pannello="avviata"]');
        if (pan30) {
          var info30 = document.createElement('div');
          info30.className = 'lab-esito ok';
          info30.textContent = '🚀 FIRENZE · INNOVAZIONE MAGAZZINO 30 ORE: la contabilità rimane automatica nel gestionale; non sono richiesti quiz, scritture o Dare/Avere. Usa un account allievo dedicato; non azzerare un lavoro esistente.';
          pan30.insertBefore(info30, pan30.firstChild);
        }
      }
      var bottoneReset = radice.querySelector('#reset-ora');
      if (bottoneReset) bottoneReset.onclick = function () {
        if (!confirm('ATTENZIONE: vuoi davvero CANCELLARE tutta l’azienda di questo account e ricominciare da zero?\n\nDocumenti, contabilità, magazzino e spunte della guida vengono azzerati. Nome utente e password restano.\n\nOK = sì, ricomincia da zero      Annulla = no, tengo il lavoro')) return;
        var esito = radice.querySelector('#reset-esito');
        try {   // copia di sicurezza automatica prima di cancellare
          var file = new Blob([JSON.stringify({formato: 'msa-erp-ft-backup-v1', creatoIl: new Date().toISOString(), stato: S()}, null, 2)], {type: 'application/json'});
          var url = URL.createObjectURL(file), a = document.createElement('a');
          a.href = url; a.download = 'Academy-azienda-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
          document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        } catch (err) { /* il backup è una cortesia: la conferma esplicita è già stata data */ }
        this.disabled = true; if (esito) esito.textContent = 'Sto svuotando l’azienda e salvando sul server…';
        try { Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf('msa-g-') === 0) sessionStorage.removeItem(k); }); } catch (err) { /* nessuna spunta locale */ }
        N.azzera();
        var ricarica = function () { window.location.reload(); }, fatto = false, vai = function () { if (!fatto) { fatto = true; ricarica(); } };
        if (window.MSA_SALVA) { window.MSA_SALVA().then(vai, vai); setTimeout(vai, 4000); } else vai();
      };
      L.collega(radice, 'av', {av: SD.avviaSistema}, rendi);
      L.collega(radice, 'cs', {cs: function (v) { v.modo = 'costituzione'; return SD.avviaSistema(v); }}, rendi);
      L.collega(radice, 'ng', {ng: function (v) { v.modo = 'negozio'; return SD.avviaSistema(v); }}, rendi);
      L.collega(radice, 'lg', {lg: function (v) {
        v.modo = 'logistica';
        if (corsoMagazzino) v.quiz = 'no';  // Pistoia e Firenze: solo logistica e contabilità di magazzino, MAI quiz Dare/Avere
        return SD.avviaSistema(v);
      }}, rendi);
      L.collega(radice, 'vs', {vs: N.versaCapitale}, rendi);
      if (radice.querySelector('#backup-azienda')) radice.querySelector('#backup-azienda').onclick = function () {
        try {
          var file = new Blob([JSON.stringify({formato:'msa-erp-ft-backup-v1',creatoIl:new Date().toISOString(),stato:S()}, null, 2)], {type:'application/json'});
          var url = URL.createObjectURL(file), a = document.createElement('a');
          a.href = url; a.download = 'Academy-azienda-backup-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json';
          document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(url);},1000);
          radice.querySelector('#azzera').disabled = false;
          radice.querySelector('#backup-azienda-esito').textContent = 'Download richiesto: verifica che il file sia stato salvato prima di proseguire.';
        } catch(err) { radice.querySelector('#backup-azienda-esito').textContent = 'Backup non riuscito: nessuna cancellazione eseguita. ' + err.message; }
      };
      if (radice.querySelector('#azzera')) radice.querySelector('#azzera').onclick = function () {
        if (this.disabled) return;
        if ((prompt('Hai verificato il backup? Scrivi NUOVA AZIENDA per cancellare soltanto l’azienda integrata corrente. Account e password restano.') || '').trim().toUpperCase().replace(/\s+/g, ' ') !== 'NUOVA AZIENDA') return;
        N.azzera();
        if (window.MSA_SALVA) window.MSA_SALVA();
        rendi();
        // La guida sceglie la versione all'apertura: ricaricarla evita che
        // un precedente percorso storico resti attivo sulla nuova azienda.
        if (window.MSA_GUIDA) window.location.reload();
      };
    },
    anagrafiche: function () {
      radice.innerHTML = U.avviso(S()) +
        L.scheda('👥', 'Clienti', 'XD03', L.tabella(['Cliente', 'Nome', 'Regione', 'Canale', 'Gruppo clienti', 'Pagamento', 'Partite aperte €›'], Object.keys(S().clienti).map(function (k) {
          var c = S().clienti[k]; return [k, e(c.nome), c.regione, c.canale, c.gruppo, c.pagamento, eur(N.saldo('11', k))]; }))) +
        L.scheda('🏭', 'Fornitori', 'XK03', L.tabella(['Fornitore', 'Nome', 'Regione', 'Pagamento', 'Debito aperto €›'], Object.keys(S().fornitori || {}).map(function (k) {
          var f = S().fornitori[k]; return [k, e(f.nome), f.regione, f.pagamento, eur(-N.saldo('20', k))]; }))) +
        L.scheda('📦', 'Materiali e giacenze', 'MM03 · MMBE', L.tabella(['Materiale', 'Tipo', 'Descrizione', 'Controllo prezzo', 'Costo standard›', 'Giacenza›', 'Valore a standard›'], Object.keys(S().materiali).map(function (k) {
          var m = S().materiali[k]; return [k, m.tipo || '', e(m.nome), 'S standard', eur(m.std), n0(S().giacenze[k]) + ' ' + (m.um || 'pz'), eur(S().giacenze[k] * m.std)]; })) +
          (S().negozio ? '<p class="lab-nota">Merci da rivendere (HAWA): si comprano e si vendono così come sono, senza produzione. Il valore a magazzino è il prezzo d’acquisto concordato con il fornitore; il prezzo di vendita è nel listino (Condizioni di prezzo, PR00).</p>'
            : '<p class="lab-nota">Prodotti finiti (FERT) e materia prima (ROH). Il valore di bilancio dopo la chiusura del Material Ledger è al prezzo effettivo: vedi Costi del prodotto → Material Ledger.</p>'));
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
