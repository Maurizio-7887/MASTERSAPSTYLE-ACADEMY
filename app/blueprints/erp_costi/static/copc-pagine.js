/* SISTEMA INTEGRATO — Costi del prodotto: scheda di calcolo, CK11N/CK24, chiusura ordini (KGI2, KKS2, KO88), Material Ledger (CKM3, CKMLCP). */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, PP = window.PP4, PC = window.PC4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var sc = function () { return S().costing.scheda; };
  var STATI = {KA: 'KA calcolata', VO: 'VO marcata', FR: 'FR rilasciata'};
  // Solo presentazione e controlli preventivi: nessuna precompilazione/scrittura implicita.
  function guidaBudget() {
    return '<details class="lab-nota" open><summary><b>Come compilare il budget: prima l’anno, poi le commesse del mese</b></summary>' +
      '<ol class="lab-elenco"><li><b>Raccogli le fonti annuali sintetiche.</b> Personale = retribuzioni + oneri azienda + quota TFR prevista; indiretti = energia, manutenzioni, affitti, servizi e ammortamenti di competenza. Non inserire acquisti di cespiti, IVA recuperabile, rate di finanziamento o pagamenti: non sono il costo annuo da assorbire.</li>' +
      '<li><b>Attribuisci ogni costo una sola volta.</b> Se riferibile a un reparto, va nei suoi indiretti propri; se comune alla produzione, in Generale produttivo. Uffici amministrativi in Generale amministrativo, escluso dal prodotto. Per gli ammortamenti usa la quota annua del piano cespiti (valore ammortizzabile / vita utile, con eventuale pro-rata), non il prezzo del macchinario. Non duplicare la quota in Generale e nel reparto, né aggiungerla di nuovo alla tariffa.</li>' +
      '<li><b>Caso guida, non valori da imporre ai dati salvati.</b> Taglio, Piegatura e Saldatura: ciascuno 36.000 € personale, 0 € indiretti propri, 1.500 h capacità e 1.500 h pianificate tariffa. Generale: 18.000 € produttivi e 0 € amministrativi. I 18.000 sostituiscono i 6.000 di indiretti per centro: non si sommano. Le eventuali quote di ammortamento sono già da ricondurre al budget previsto, non un’aggiunta automatica al caso.</li>' +
      '<li><b>Ripartisci e verifica.</b> Driver ore: 18.000 × 1.500 / 4.500 = 6.000 € per reparto. Budget centro = 36.000 + 0 + 6.000 = 42.000 €; tariffa costo standard = 42.000 / 1.500 = <b>28 €/h</b>, non prezzo di vendita. Con driver percentuali servono quote che sommano a 100 (esempio alternativo 50/30/20, non il riparto del caso).</li>' +
      '<li><b>Volume annuo ≠ lotto ≠ capacità.</b> TR-STD: 1.200 pz annui, altri prodotti 0 nel budget del caso. Con 0,25/0,20/0,40 h/pz servono 300/240/480 h: saturazione 20/16/32%. Non sostituire le 1.500 ore tariffa con queste ore. Setup annuo da valutare separatamente con il numero di lotti.</li>' +
      '<li><b>Dal budget alle commesse mensili.</b> Un ordine di dicembre da 300 pz assorbe 75/60/120 h × 28 = 7.140 € di attività. Ferro: 300 × 8 kg × 0,95 = 2.280 €; totale 9.420 € = 31,40 €/pz. Non imputare tutti i 126.000 € annui all’ordine, né dividere la tariffa per 12. Budget/12 (10.500 € totali; 3.500 per reparto) è solo confronto mensile indicativo senza stagionalità, non costo effettivo né imputazione automatica.</li>' +
      '<li><b>Salva e rilascia.</b> Salva budget versionato → verifica tabella → CK11N → CK24 prima dei nuovi ordini. Gli ordini già avviati mantengono lo snapshot. Nessun reset, nessuna registrazione FI dal budget.</li></ol></details>';
  }
  function aiutiCPM() {
    var aiuti = {
      anno: 'Esercizio annuale già attivo, es. 2026. Non è il mese della commessa. Non cambiare anno per registrare dicembre: per un altro esercizio serve un nuovo spazio azienda.',
      produttivi: 'Totale ANNUO dei costi comuni di produzione da ripartire. Caso: 18000. Fonti: budget energia, manutenzioni, affitti e quote ammortamento condivise. Escludi quanto già attribuito agli indiretti propri dei reparti.',
      amministrativi: 'Totale ANNUO uffici amministrativi, escluso dal costo standard prodotto. Caso: 0. Zero è un’ipotesi didattica, non significa che ogni impresa non abbia costi amministrativi.',
      driver: 'Ore: riparto proporzionale alle ore pianificate tariffa (caso guida: tre quote uguali). Percentuali: compila le tre quote per un totale 100%. Non usa le ore effettive delle commesse.'
    };
    var perCentro = {
      personale: 'Costo ANNUO del personale attribuito al reparto: retribuzioni, oneri azienda e quota TFR, non netto pagato. Caso: 36000. Fonte: previsione paghe/costi per centro, con criterio documentato se i centri paghe non coincidono.',
      indiretti: 'Costi ANNUI specifici del reparto non già in Generale: energia dedicata, manutenzione, affitto e quota annua ammortamento dei cespiti assegnati. Caso: 0 perché il pacchetto indiretto è già nei 18000 di Generale. Non aggiungere altri 6000.',
      capacita: 'Ore disponibili nell’ANNO, al netto delle indisponibilità previste, con perimetro coerente di addetti/macchine. Caso: 1500 h. Fonte: calendario e capacità del reparto, non pezzi prodotti.',
      orePiano: 'Ore ANNUALI scelte come base di assorbimento: denominatore della tariffa. Caso: 1500 h, positive e non superiori alla capacità. Non sono le ore del solo ordine né le 300/240/480 h richieste dal volume annuo.',
      percentuale: 'Quota del Generale produttivo, usata SOLO con driver percentuali; la somma dei tre reparti deve fare 100%. Con driver ore lascia il valore esistente: viene ignorato, non va azzerato.'
    };
    PC.cpm.centri.forEach(function (k) { Object.keys(perCentro).forEach(function (f) { aiuti[k + '_' + f] = k + ': ' + perCentro[f]; }); });
    Object.keys(PC.cpm.modello().standard).forEach(function (mat) { aiuti['vol_' + mat] = 'Pezzi previsti per l’intero ANNO, non ordine mensile né lotto di calcolo. Caso: ' + (mat === 'TR-STD' ? '1200 per TR-STD' : '0 per ' + mat) + '. I 20 kit autonomi successivi non sono un input della transenna; cambia il piano solo con una decisione esplicita.'; });
    function descrivi(prefisso, campi) {
      Object.keys(campi).forEach(function (k) {
        var campo = document.getElementById(prefisso + '-' + k); if (!campo) return;
        var help = document.createElement('small'); help.id = 'aiuto-' + prefisso + '-' + k;
        help.className = 'lab-nota'; help.textContent = campi[k];
        campo.setAttribute('aria-describedby', help.id); campo.parentNode.appendChild(help);
      });
      var esito = document.getElementById(prefisso + '-esito'); if (esito) esito.setAttribute('aria-live', 'polite');
    }
    descrivi('cpm-budget', aiuti);
    descrivi('cpm-actual', {
      data: 'Data del documento o della fonte effettiva nell’anno del budget. Per dicembre es. 31/12/2026: non trasformare un preventivo annuo in costo effettivo del mese.',
      riferimento: 'Fonte sintetica verificata e univoca, es. PAG-SIM-2026-12-Taglio. Se un documento copre più reparti, documenta quote la cui somma coincide con la fonte; non riportare l’intero importo su ciascun reparto.',
      centro: 'Destinazione del costo primario: Taglio/Piegatura/Saldatura oppure Generale per costi condivisi. Il centro paghe Produzione non viene ripartito automaticamente.',
      natura: 'Reparti: personale o indiretti. Generale: produttivi (ripartiti) o amministrativi (esclusi). Le attività D72/A75 non sono costi primari da aggiungere.',
      importo: 'Importo effettivo della sola fonte e quota attribuita, non budget annuo/12 automatico. Per ammortamenti riporta solo la quota di competenza già verificata nel piano cespiti; mai anche il costo di acquisto. Non reinserire una fonte già riportata.'
    });
    var centro = document.getElementById('cpm-actual-centro'), natura = document.getElementById('cpm-actual-natura');
    function nature() {
      var v = natura.value, opzioni = centro.value === 'Generale' ? ['produttivi', 'amministrativi'] : ['personale', 'indiretti'];
      natura.innerHTML = opzioni.map(function (k) { return '<option value="' + k + '">' + k + '</option>'; }).join('');
      natura.value = opzioni.indexOf(v) >= 0 ? v : opzioni[0];
    }
    if (centro && natura) { centro.onchange = nature; nature(); }
  }
  function salvaBudgetGuidato(i) {
    i.centri = {}; i.volumi = {};
    PC.cpm.centri.forEach(function (k) { i.centri[k] = {}; ['personale', 'indiretti', 'capacita', 'orePiano', 'percentuale'].forEach(function (f) { i.centri[k][f] = i[k + '_' + f]; }); });
    Object.keys(PC.cpm.modello().standard).forEach(function (k) { i.volumi[k] = i['vol_' + k]; });
    try { return PC.cpm.salvaBudget(i); }
    catch (err) { throw Error(err.message + ' Budget non salvato: controlla gli aiuti sotto i campi. Importi e ore sono annuali; usa 36000 o 36.000,00 e la virgola per i decimali. Ore tariffa > 0 e ≤ capacità; con driver percentuali le quote devono sommare a 100%. I dati precedenti restano invariati.'); }
  }
  function pannelloCPM() {
    var cp = PC.cpm, m = cp.modello();
    if (!m) return L.scheda('🏭', 'Nuovo laboratorio CPM · centri, budget e standard', 'CO-CCA · versione cpm-centri-v1',
      '<p class="lab-nota">Attivazione esplicita di un nuovo percorso: gli ordini e i saldi precedenti restano invariati. TR-STD userà ferro 8 kg, Taglio 0,25 h, Piegatura 0,20 h e Saldatura 0,40 h, setup zero. Budget annuo 1.200 pz (non il lotto di 300). Generale produttivo 18.000 € <b>al posto</b> dei 6.000 € di indiretti per centro, non in aggiunta. Amministrazione esclusa dal prodotto. Le tariffe per centro sostituiscono tariffa comune e sovraccosti della scheda storica. Dopo l’attivazione: CK11N → CK24.</p>' +
      L.modulo('cpm-start', [['conferma', 'Scrivi ATTIVA (preferibile in una Nuova azienda)', 'text']], [['start', 'Attiva laboratorio CPM']]));
    var report = cp.report(), budget = [['anno', 'Anno del laboratorio', 'num', m.anno], ['produttivi', 'Generale: indiretti produttivi da ripartire €', 'num', m.generale.produttivi], ['amministrativi', 'Generale: amministrativi ESCLUSI dal prodotto €', 'num', m.generale.amministrativi], ['driver', 'Driver ribaltamento (ore pianificate tariffa o %)', 'select', m.generale.driver, [['ore', 'Ore pianificate tariffa'], ['percentuali', 'Percentuali esplicite']]]];
    cp.centri.forEach(function (k) { var c = m.centri[k]; [['personale', 'Personale annuo €'], ['indiretti', 'Indiretti diretti al centro € (non già in Generale)'], ['capacita', 'Capacità disponibile annua h'], ['orePiano', 'Ore pianificate: denominatore tariffa h'], ['percentuale', 'Quota Generale % (driver percentuali)']].forEach(function (f) { budget.push([k + '_' + f[0], k + ' · ' + f[1], 'num', c[f[0]]]); }); });
    Object.keys(m.standard).forEach(function (mat) { budget.push(['vol_' + mat, mat + ' · budget quantità annua pz', 'num', m.volumi[mat] || 0]); });
    var mat = radice.dataset.cpmMat || 'TR-STD', st = m.standard[mat], mats = Object.keys(m.standard).map(function (k) { return [k, k]; });
    return L.scheda('🏭', 'CPM · Budget dei centri e capacità', 'CO-CCA · rev. ' + m.revisione,
      '<p class="lab-nota">Tariffa = (personale + indiretti propri + Generale produttivo ribaltato) / ore pianificate. Queste ore sono la base di assorbimento scelta, non il fabbisogno del volume. Capacità disponibile separata: il confronto rende visibili sottoutilizzo e sovraccarico. Budget e consuntivi CO non generano scritture FI. Una revisione richiede un nuovo calcolo/rilascio prima di nuovi ordini; lo snapshot protegge quelli avviati.</p>' +
      guidaBudget() + L.modulo('cpm-budget', budget, [['budget', 'Salva budget versionato']]) +
      L.tabella(['Centro', 'Personale €›', 'Indiretti propri €›', 'Generale allocato €›', 'Budget €›', 'Ore tariffa›', 'Tariffa €/h›', 'Ore volume›', 'Capacità h›', 'Saturazione %›'], report.centri.map(function (r) {
        return [r.centro, eur(r.personale), eur(r.indiretti), eur(r.ribaltato), eur(r.budget), n0(r.orePiano), eur(r.tariffa), n0(r.oreRichieste), n0(r.capacita), n0(r.saturazione) + (r.saturazione > 100 ? ' ⚠ sovraccarico' : '')]; })) +
      '<p class="lab-nota">Generale: produttivi ' + eur(m.generale.produttivi) + ' € interamente ripartiti; amministrativi ' + eur(m.generale.amministrativi) + ' € esclusi dal costo standard. Le ore del volume escludono setup fisso: serve un piano lotti per determinarne il fabbisogno annuo.</p>') +
      L.scheda('🔧', 'Distinta e ciclo standard CPM', 'CS02 · CA02 · nuova revisione',
        '<label>Prodotto da modificare <select id="cpm-materiale">' + mats.map(function (a) { return '<option value="' + e(a[0]) + '"' + (a[0] === mat ? ' selected' : '') + '>' + e(a[0]) + '</option>'; }).join('') + '</select></label>' +
        L.modulo('cpm-standard', [['materiale', 'Materiale', 'select', mat, [[mat, mat]]], ['componente', 'Componente', 'select', st.componente.mat, Object.keys(S().materiali).map(function (k) { return [k, k]; })], ['quantita', 'Quantità componente per pezzo', 'num', st.componente.q],
          ['Taglio', 'Taglio h/pz (0 = fase assente)', 'num', st.ore.Taglio || 0], ['Piegatura', 'Piegatura h/pz', 'num', st.ore.Piegatura || 0], ['Saldatura', 'Saldatura h/pz', 'num', st.ore.Saldatura || 0], ['attrezzaggio', 'Setup h/lotto', 'num', st.attrezzaggio], ['centroSet', 'Centro del setup', 'select', st.centroSet, cp.centri.map(function (k) { return [k, k]; })]], [['standard', 'Salva distinta/ciclo versionati']]) +
        L.tabella(['Materiale', 'Componente/pz', 'Ciclo h/pz', 'Setup h/lotto', 'Costo CPM €/pz (lotto scheda)›'], Object.keys(m.standard).map(function (k) { var s = m.standard[k], el = PC.elementi(k, sc().lotto); return [k, n0(s.componente.q) + ' ' + e(s.componente.mat), e(s.fasi.map(function (f) { return f + ' ' + s.ore[f]; }).join(' → ')), n0(s.attrezzaggio), eur(el.totale / sc().lotto)]; }))) +
      L.scheda('📊', 'Costi primari, attività assorbite e residui', 'Controllo annuale CO · fonti sintetiche',
        '<p class="lab-nota"><b>Budget = previsione annua; primari = costi effettivi documentati; assorbito = ore confermate × tariffa dello snapshot.</b> Riporta i costi primari effettivi una sola volta dalla fonte FI o sintetica: non sommare le attività D72/A75 alle paghe. Questo prospetto non importa automaticamente la contabilità e non è una seconda contabilità. Per Generale usa natura produttivi/amministrativi; per i reparti personale/indiretti. Senza fonti effettive inserite, zero NON significa costo nullo. Il report cumula l’anno: non è un filtro del solo mese e il residuo non dimostra da solo inefficienza.</p>' +
        L.modulo('cpm-actual', [['data', 'Data fonte', 'date'], ['riferimento', 'Riferimento univoco fonte/documento', 'text'], ['centro', 'Centro', 'select', 'Taglio', cp.centri.concat(['Generale']).map(function (k) { return [k, k]; })], ['natura', 'Natura', 'select', 'personale', ['personale', 'indiretti', 'produttivi', 'amministrativi'].map(function (k) { return [k, k]; })], ['importo', 'Costo primario effettivo €', 'num']], [['actual', 'Riporta costo primario (solo analitico)']]) +
        L.tabella(['Centro', 'Budget €›', 'Primari €›', 'Generale effettivo €›', 'Consuntivo €›', 'Ore eff.›', 'Assorbito €›', 'Residuo €›', 'Var. spesa €›', 'Var. assorbimento €›', 'Var. efficienza €›'], report.centri.map(function (r) { return [r.centro, eur(r.budget), eur(r.primari), eur(r.ribaltatoEffettivo), eur(r.consuntivo), n0(r.oreEffettive), eur(r.assorbito), eur(r.residuo), eur(r.varianzaSpesa), eur(r.varianzaAssorbimento), eur(r.varianzaEfficienza)]; })) +
        '<p class="lab-nota">' + e(report.note) + ' Ordini storici esclusi dal perimetro CPM: ' + report.esclusiLegacy + '. Costi amministrativi effettivi esclusi: ' + eur(report.generale.amministrativi) + ' €.</p>' +
        L.tabella(['Prodotto', 'Volume annuo budget›', 'Finiti effettivi›', 'Varianza volume›', 'Standard corrente €/pz›', 'Budget produzione €›', 'Costi ordini €›', 'Accrediti €›', 'Saldo prima KO88 €›'], report.prodotti.map(function (p) { return [p.materiale, n0(p.volumeBudget), n0(p.finiti), n0(p.varianzaVolume), eur(p.standardUnitario), eur(p.budgetProduzione), eur(p.costiOrdini), eur(p.accredito), eur(p.saldoOrdini)]; })) +
        L.tabella(['Data', 'Fonte', 'Centro', 'Natura', 'Importo €›'], m.consuntivi.map(function (r) { return [fd(r.data), e(r.riferimento), e(r.centro), e(r.natura), eur(r.importo)]; })));
  }
  function collegaCPM() {
    L.collega(radice, 'cpm-start', {start: PC.cpm.attiva}, rendi);
    if (!PC.cpm.attivo()) return;
    L.collega(radice, 'cpm-budget', {budget: salvaBudgetGuidato}, rendi);
    L.collega(radice, 'cpm-standard', {standard: function (i) { i.ore = {Taglio: i.Taglio, Piegatura: i.Piegatura, Saldatura: i.Saldatura}; return PC.cpm.salvaStandard(i); }}, rendi);
    L.collega(radice, 'cpm-actual', {actual: PC.cpm.consuntivo}, rendi);
    aiutiCPM();
    var select = radice.querySelector('#cpm-materiale'); if (select) select.onchange = function () { radice.dataset.cpmMat = this.value; rendi(); };
  }
  var PAGINE = {
    scheda: function () {
      var x = sc();
      radice.innerHTML = U.avviso(S()) + pannelloCPM() + (PC.cpm.attivo() ? '<p class="lab-nota"><b>CPM attivo:</b> tariffa comune e sovraccosti qui sotto sono solo per il percorso storico; per CPM vale il modello dei centri. Il lotto di calcolo resta condiviso.</p>' : '') + '<div class="lab-griglia">' +
        L.scheda('🧮', 'Scheda di calcolo ZFT01 e percentuali', 'KZS2 · KZZ2 · KP26', L.modulo('sk', [['sovrMat', 'Sovraccosto materiale % (riga 20)', 'num', x.sovrMat], ['sovrProd', 'Sovraccosto di produzione % (riga 50)', 'num', x.sovrProd],
          ['tariffa', 'Tariffa delle attività €/h (KP26)', 'num', x.tariffa], ['lotto', 'Lotto di calcolo (pz)', 'num', x.lotto]], [['sk', 'Salva la scheda']]) +
          (x.confermata ? '<p class="lab-nota">✓ Scheda confermata.</p>' : '<p class="lab-nota">Controlla le percentuali e premi «Salva la scheda».</p>')) +
        L.scheda('💡', 'Che cosa sono i sovraccosti', '', '<ul class="lab-elenco"><li>Il costo standard di gennaio (31,40 per la TR-STD) conteneva solo <b>ferro e ore</b>.</li>' +
          '<li>Ma acquistare, ricevere e tenere a magazzino il ferro costa: il <b>sovraccosto materiale</b> lo attribuisce in % del materiale.</li>' +
          '<li>Capireparto, manutenzione, servizi di produzione: il <b>sovraccosto di produzione</b> in % delle attività.</li>' +
          '<li>L\'<b>attrezzaggio</b> è fisso per lotto: nel costo standard pesa 3 h / ' + n0(x.lotto) + ' pz.</li></ul>') + '</div>' +
        L.scheda('🔧', 'Righe della scheda di calcolo', 'KZS2', L.tabella(['Riga', 'Base', 'Descrizione', 'Sovraccosto', 'Da riga'], [
          ['10', 'Elemento 510', 'Materiale diretto', '', ''], ['20', '', 'Sovraccosto materiale', n0(x.sovrMat) + ' %', '10'],
          ['30', 'Elemento 620', 'Lavorazione (attività)', '', ''], ['40', 'Elemento 625', 'Attrezzaggio (attività fissa)', '', ''],
          ['50', '', 'Sovraccosto di produzione', n0(x.sovrProd) + ' %', '30 – 40'], ['100', '', 'Costo di produzione', '', '10 – 50']]));
      L.collega(radice, 'sk', {sk: PC.scheda}, rendi);
      collegaCPM();
    },
    calcolo: function () {
      var stime = S().costing.stime, mats = U.materiali(S());
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🧾', 'Calcola il costo standard', 'CK11N · variante PPC1', L.modulo('ck', [['materiale', 'Materiale', 'select', 'TR-STD', mats], ['data', 'Data di calcolo', 'date']], [['ck', 'Calcola']])) +
        L.scheda('📌', 'Marca e rilascia', 'CK24', L.modulo('cr', [['data', 'Data di rilascio (inizio periodo)', 'date']].concat(PC.cpm.attivo() ? [['sostituisciBootstrap', 'Solo primo CPM su azienda vuota: scrivi SOSTITUISCI per sostituire il bootstrap di costituzione', 'text']] : []), [['marca', 'Marca tutte le stime calcolate', 'sec'], ['cr', 'Rilascia']]) +
          '<p class="lab-nota">Al rilascio il prezzo standard cambia e il magazzino si <b>rivaluta</b>: giacenza × (nuovo − vecchio) → D 13 / A 64. Un solo rilascio per periodo, prima dei movimenti del mese.</p>') + '</div>' +
        L.scheda('📋', 'Stime dei costi', 'CK13N', L.tabella(['Materiale', 'Data', 'Stato', 'Standard attuale›', 'Stima›', 'Differenza›', 'Giacenza›', 'Rivalutazione›'], mats.map(function (x) {
          var m = S().materiali[x[0]], st = stime[x[0]], ril = S().costing.rilasci.filter(function (r) { return r.materiale === x[0]; }).slice(-1)[0];
          return [x[0], st ? fd(st.data) : '—', st ? STATI[st.stato] : '—', eur(m.std), st ? eur(st.unitario) : '', st && st.stato !== 'FR' ? eur(st.unitario - m.std) : '', n0(S().giacenze[x[0]]) + ' pz', ril ? eur(ril.rivalutazione) + ' (' + fd(ril.data) + ')' : '']; }))) +
        mats.filter(function (x) { return stime[x[0]]; }).map(function (x) { return L.scheda('🔎', 'Scomposizione ' + x[0], 'CK13N · elementi', PC.tabellaStima(stime[x[0]])); }).join('');
      L.collega(radice, 'ck', {ck: PC.calcola}, rendi);
      L.collega(radice, 'cr', {marca: PC.marca, cr: PC.rilascia}, rendi);
    },
    chiusura: function () {
      var ordini = S().produzione;
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('➕', '1 · Sovraccosti sugli ordini', 'KGI2', L.modulo('kg', [['data', 'Data (fine mese)', 'date']], [['kg', 'Calcola e addebita']]) + '<p class="lab-nota">Percentuali della scheda sui costi <b>effettivi</b>: D 78 / A 76.</p>') +
        L.scheda('⚖️', '2 · Varianze e liquidazione', 'KKS2 · KO88', L.modulo('ko', [['data', 'Data (fine mese)', 'date']], [['ko', 'Calcola varianze e liquida']]) + '<p class="lab-nota">Ordini DLV o TECO: la varianza va al materiale (D 61 / A 73) e diventa una differenza prezzo nel Material Ledger.</p>') +
        '</div>' + (ordini.length ? ordini.map(function (o) {
          var v = PC.varianze(o), x = v.effettivi;
          return L.scheda('📊', 'Ordine ' + o.numero + ' · ' + o.qta + ' pz ' + o.materiale + ' · ' + PP.stato(o), 'KKBC · KKS2', L.tabella(['Elemento', 'Pianificato (lotto ' + n0(o.qta) + ')›', 'Effettivo›'], [
            ['Materiale diretto', eur(o.piano.mat), eur(x.mat)], ['Lavorazione', eur(o.piano.lav), eur(x.lav)], ['Attrezzaggio', eur(o.piano.set), eur(x.set)],
            ['Sovraccosto materiale', eur(o.piano.sovrMat), eur(x.sovrMat)], ['Sovraccosto di produzione', eur(o.piano.sovrProd), eur(x.sovrProd)],
            {cls: 'tot', celle: ['Totale costi', eur(o.piano.totale), eur(x.totale)]}, ['Accredito (101 a standard)', '', '−' + eur(x.accredito)]]) +
            L.tabella(['Categoria di varianza', 'Piano / obiettivo', 'Effettivo', 'Varianza €›'], v.categorie.map(function (c) { return [e(c.cat), c.piano, c.eff, eur(c.v)]; }).concat([{cls: 'tot', celle: ['Totale', '', '', eur(v.totale)]}])) +
            (o.liquidazione ? '<p class="lab-nota">✓ Liquidato il ' + fd(o.liquidazione.data) + '.</p>' : ''));
        }).join('') : '<p class="lab-vuoto">Nessun ordine di produzione.</p>');
      L.collega(radice, 'kg', {kg: PC.sovraccosti}, rendi);
      L.collega(radice, 'ko', {ko: PC.liquida}, rendi);
    },
    ml: function () {
      var chiusi = S().costing.ml, per = radice.dataset.periodo || (chiusi.length ? chiusi[chiusi.length - 1].periodo : '2027-02');
      var gia = chiusi.find(function (c) { return c.periodo === per; }), res = gia || (S().avviato ? PC.ml(per) : null);
      var tab = res ? L.tabella(['Materiale', 'Std›', 'Inizio q.tà›', 'Entrate q.tà›', 'Differenze delle entrate›', 'Cumulato q.tà›', 'Diff. cumulate›', 'Consumi q.tà›', 'Diff. sui consumi›', 'Rimanenza q.tà›', 'Diff. sulla rimanenza›', 'Prezzo effettivo›'],
        Object.keys(res.materiali).map(function (m) { var x = res.materiali[m];
          return [m, eur(x.std), n0(x.inizio.qta), n0(x.entrate.qta), eur(x.entrate.pd), n0(x.cumulato.qta), eur(x.cumulato.pd), n0(x.consumi.qta), eur(x.consumi.pd), n0(x.fine.qta), eur(x.fine.pd), '<b>' + eur(x.prezzoEffettivo) + '</b>']; })) : '';
      var det = res ? Object.keys(res.materiali).map(function (m) { var x = res.materiali[m]; return x.entrate.dettaglio.length ? '<li><b>' + m + '</b>: ' + x.entrate.dettaglio.map(function (d) { return e(d.fonte) + ' ' + eur(d.pd); }).join(' · ') + '</li>' : ''; }).join('') : '';
      radice.innerHTML = U.avviso(S()) +
        '<div class="lab-filtro"><label>Periodo <input id="per" value="' + e(per) + '" size="8"></label> <span class="lab-nota">' + (gia ? '✓ Periodo chiuso il ' + fd(gia.data) + ' (doc. ' + gia.contabile + ')' : 'Anteprima: valori non ancora registrati') + '</span></div>' +
        (res && res.avvisi.length ? '<div class="lab-esito ko">⚠ ' + e(res.avvisi.join(' ')) + '</div>' : '') +
        L.scheda('📒', 'Cockpit del Material Ledger', 'CKM3 · determinazione del prezzo a un livello e a più livelli', tab + (det ? '<ul class="lab-elenco">' + det + '</ul>' : '') +
          '<p class="lab-nota">Il ferro entra a standard 0,95 ma costa di più: la differenza si ripartisce tra la rimanenza e il consumato; il consumato <b>sale di livello</b> sui prodotti degli ordini che l\'hanno prelevato, insieme alle varianze degli ordini. Sui prodotti finiti, la parte venduta va al costo del venduto (conto 42 e CO-PA), la parte in magazzino rivaluta la rimanenza.</p>') +
        (gia ? '' : L.scheda('🔐', 'Chiusura del periodo', 'CKMLCP', L.modulo('cm', [['periodo', 'Periodo (AAAA-MM)', 'text', per], ['data', 'Data di chiusura (fine mese)', 'date']], [['cm', 'Esegui la chiusura (a più livelli) e registra']]) +
          '<p class="lab-nota">Scrittura: D 12 · D 13 rimanenze · D 42 venduto / A 63 differenze d\'acquisto · A 61 varianze di produzione.</p>'));
      var p = radice.querySelector('#per'); if (p) p.onchange = function () { radice.dataset.periodo = this.value.trim(); rendi(); };
      L.collega(radice, 'cm', {cm: PC.chiusuraML}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.scheda)(); }
  rendi();
})();
