/* Esercitazione «Pianificazione e forecast 2027» per il corso di controllo di gestione «Pianificazione SAP vs Microsoft Dynamics».
   L'allievo è il controller della Ferro & Transenne: prepara il budget dei sei centri di costo (KP06 → BPC), lo fa approvare e lo blocca
   (V1), poi a ogni trimestre l'amministrazione chiude i mesi e lui costruisce il forecast 3+9, 6+6 e 9+3 in BPC.
   Nessuna scrittura da ricostruire: il controller legge i consuntivi. Numeri del caso: app/static/js/erp/nucleo.js (PIANIFICAZIONE).
   Separata da «Dicembre: dalla costituzione alla riapertura» (Firenze · Amministrazione): azienda e passi diversi. */
(function () {
  'use strict';
  var DT = 'erp_dati.', CO = 'erp_controllo.', BP = 'erp_bpc.';
  var cpm = function (h) { return (h.S.costing || {}).cpm; };
  var bpc = function (h) { return (h.S.costing || {}).bpc; };
  var circa = function (a, b) { return Math.abs(Number(a || 0) - b) < 0.006; };
  var chiusi = function (h) { return (h.S.pianificazione || {}).chiusi || 0; };
  var CDC6 = ['4100', '4200', '4210', '4220', '4230', '4300'];
  var MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  var MESIL = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var STAGIONE = [400, 350, 300, 200, 150, 150, 200, 100, 200, 300, 350, 400];      // energia 4200 nel budget: 3.100 €/anno
  var ENERGIA_F3 = STAGIONE.map(function (v) { return Math.round(v * 110) / 100; }); // +10% da aprile nel forecast di marzo
  var PIANO = {'4100': {'80': 30000}, '4200': {'86': 12000, '50': 2900, '54': 3100}, '4210': {'80': 36000}, '4220': {'80': 36000}, '4230': {'80': 36000}, '4300': {'80': 40000, '83': 1200}};

  // ── punti del suggeritore: la casella o il pulsante brilla nella pagina e la riga si spunta da sola ──
  var campo = function (sel, etichetta, valore) { return {auto: true, t: 'campo', sel: sel, etichetta: etichetta, nome: etichetta, valore: String(valore), serve: 'Scrivi nel campo «' + etichetta + '».'}; };
  var scegli = function (sel, etichetta, valore, testo) { return {auto: true, t: 'campo', sel: sel, etichetta: etichetta, nome: etichetta, valore: valore, testo: testo || valore, serve: 'Scegli «' + (testo || valore) + '».'}; };
  var premi = function (sel, nome, serve) { return {auto: true, t: 'pulsante', sel: sel, bottone: nome, nome: nome, serve: serve || 'Premi il pulsante una volta sola.'}; };
  var leggi = function (testo, dove) { return {auto: true, t: 'leggi', nome: testo, dove: dove || '', serve: testo}; };
  var btn = function (pref, az) { return '[data-prefisso="' + pref + '"] [data-azione="' + (az || pref) + '"]'; };
  var mesi = function (classe, valori, da) {   // una casella per mese del modulo di inserimento EPM
    var out = [];
    for (var k = da || 0; k < 12; k++) out.push(campo('#epm-m' + classe + '_' + (k + 1), 'Riga ' + classe + ' · ' + MESI[k], String(valori[k]).replace('.', ',')));
    return out;
  };
  var riga = function (h, cat, ver, cdc, classe) { var b = bpc(h); return (b && b.dati && b.dati[[cat, ver, cdc, classe].join('|')]) || []; };
  var rigaUguale = function (h, cat, ver, cdc, classe, valori, da) { var r = riga(h, cat, ver, cdc, classe); for (var k = da || 0; k < 12; k++) if (!circa(r[k], valori[k])) return false; return r.length === 12; };
  var kp06Ok = function (h, cdc) { var m = cpm(h), p = m && m.piano && m.piano['0'] && m.piano['0'][cdc] || {}, a = PIANO[cdc];
    return !!m && Object.keys(a).every(function (k) { return circa(p[k], a[k]); }) && Object.keys(p).every(function (k) { return a[k] || !p[k]; }); };
  var kp06Punti = function (cdc, nome) {
    var a = PIANO[cdc];
    return [scegli('#cdc', 'Centro di costo', cdc, cdc + ' ' + nome)].concat(['80', '81', '82', '50', '54', '83', '86'].map(function (k) { return campo('#kp06-k' + k, 'Classe ' + k, a[k] || 0); }))
      .concat([premi(btn('kp06'), 'Salva il piano del centro')]);
  };

  // forecast 6+6 e 9+3: consuntivo, nuova versione, poi Saldatura (3.300) e Taglio (2.800) nei mesi che restano. Un passo per ogni pulsante.
  var trimestre = function (n, _t, g, data, meseNome, attesaCopia, attesa4230, attesa4210) {
    var F = 'F' + n, da = function (v) { var a = []; for (var k = 0; k < 12; k++) a.push(k < n ? 0 : v); return a; };
    var mod = function (cdc, nome, v, ipotesi, att) {
      return {id: 'pf-' + F.toLowerCase() + '-' + cdc, g: g, data: data, titolo: 'Forecast ' + F + ': ' + cdc + ' ' + nome + ' da ' + MESIL[n] + ' a dicembre', dove: {ep: BP + 'input'}, percorso: 'BPC → 2 · Modulo di inserimento (EPM) → FORECAST / ' + F + ' / ' + cdc,
        punti: [scegli('#cat', 'Categoria', 'FORECAST'), scegli('#ver', 'Versione', F), scegli('#cdc', 'Centro', cdc, cdc + ' ' + nome)].concat(mesi('80', da(v), n)).concat([premi(btn('epm', 'salva'), 'Salva nel modello')]),
        campi: [['Categoria / Versione / Centro', 'FORECAST / ' + F + ' / ' + cdc], ['Ipotesi', ipotesi], ['Riga 80 ' + MESI[n] + '–Dic', v + ' ogni mese'], [MESI[0] + '–' + MESI[n - 1], 'non toccarli: sono consuntivo']],
        attesa: att, fatto: function (h) { return rigaUguale(h, 'FORECAST', F, cdc, '80', da(v), n); }};
    };
    return [
      {id: 'pf-actual-' + n, g: g, data: data, titolo: 'BPC Data Manager: carica il consuntivo fino a ' + meseNome, dove: {ep: BP + 'modello'}, percorso: 'BPC → 1 · Modello e Data Manager → «carica il consuntivo da S/4»',
       punti: [campo('#bpc-actual-mese', 'Fino al mese (1–12)', String(n)), premi(btn('bpc-actual', 'actual'), 'Carica il consuntivo')],
       campi: [['Fino al mese', String(n)], ['Pulsante', 'Carica il consuntivo']], attesa: 'ACTUAL caricato fino a ' + meseNome + '.',
       fatto: function (h) { var b = bpc(h); return !!b && b.actualFino >= n; }},
      {id: 'pf-' + F.toLowerCase(), g: g, data: data, titolo: 'BPC Data Manager: crea il forecast ' + F + ' (' + n + '+' + (12 - n) + ')', dove: {ep: BP + 'modello'}, percorso: 'BPC → 1 · Modello e Data Manager → «crea un forecast»',
       punti: [campo('#bpc-copia-destinazione', 'Nome della versione', F), campo('#bpc-copia-mesiActual', 'Mesi a consuntivo', String(n)), premi(btn('bpc-copia', 'copia'), 'Crea il forecast')],
       campi: [['Nome della versione', F], ['Mesi a consuntivo', String(n)], ['Pulsante', 'Crea il forecast']], attesa: attesaCopia,
       fatto: function (h) { var b = bpc(h); return !!b && b.versioni.FORECAST.indexOf(F) >= 0; }},
      mod('4230', 'Saldatura', 3300, 'gli ordini restano alti: gli straordinari continuano (+300 € al mese)', attesa4230),
      mod('4210', 'Taglio', 2800, 'da luglio un addetto del Taglio lavora part-time (−200 € al mese)', attesa4210)
    ];
  };

  var passi = [
    // ══════════ 0 · il ruolo ══════════
    {id: 'pf-ruolo', g: '0 · Il tuo ruolo', titolo: 'Sei il controller: che cosa farai in questa esercitazione', dove: {ep: DT + 'avvio'}, percorso: 'Launchpad → Avvio e dati di base → Nuova azienda / Avvio',
     punti: [leggi('Ottobre: prepari il budget dei sei centri di costo, lo fai approvare e lo blocchi (V1).'),
       leggi('Fine marzo, giugno, settembre: l’amministrazione chiude i mesi; tu carichi il consuntivo e fai il forecast 3+9, 6+6, 9+3.'),
       leggi('Il budget approvato non si tocca mai: le nuove ipotesi vanno nelle versioni di forecast.')],
     campi: [['Account', 'Dedicato a questa esercitazione: un account = un’azienda'], ['Metodo', 'SAP S/4HANA (KP06, KSB1) + SAP BPC (modello, approvazione, forecast)'],
       ['Nel corso MasterLedger', 'Lo stesso calendario si fa con Master ERP PMI (versioni di budget, Copia budget) per il metodo Dynamics']],
     attesa: 'Hai chiaro il calendario del controller: budget a ottobre, consuntivo a ogni chiusura, forecast trimestrale.', nota: 'Non registri fatture o paghe: le registra l’amministrazione con «Chiudi il mese».'},
    {id: 'pf-avvio', g: '0 · Il tuo ruolo', data: '02/01/2027', titolo: 'Crea l’azienda 2027 per la pianificazione', dove: {ep: DT + 'avvio'}, percorso: 'Avvio e dati di base → Nuova azienda / Avvio → riquadro «Pianificazione e forecast 2027»',
     punti: [campo('#pf-data', 'Data di partenza (fissa)', '2027-01-02'), premi(btn('pf'), 'Crea l’azienda 2027 per la pianificazione')],
     campi: [['Data di partenza', '02/01/2027 (non cambiarla)'], ['Pulsante', 'Crea l’azienda 2027 per la pianificazione']],
     attesa: 'Società con 80.000 € in banca e il riquadro «Chiusura contabile del mese» con gennaio come prossimo mese.', nota: 'Se compare un avviso rosso, l’account contiene un’altra azienda: chiedi al docente un account dedicato.',
     fatto: function (h) { return !!h.S.corsoPianificazione; }},

    // ══════════ 1 · ottobre: il budget V1 ══════════
    {id: 'pf-co', g: '1 · Ottobre: il budget 2027', data: '02/01/2027', titolo: 'Apri il piano CO 2027 e leggi i sei centri di costo', dove: {ep: CO + 'centri'}, percorso: 'CO → Controllo di gestione → 1 · Centri, attività e classi di costo',
     punti: [campo('#cpm-start-conferma', 'Per confermare scrivi ATTIVA', 'ATTIVA'), premi(btn('cpm-start', 'start'), 'Apri il piano CO'),
       leggi('Centri: 4100 Magazzino · 4200 Produzione (costi comuni) · 4210 Taglio · 4220 Piegatura · 4230 Saldatura · 4300 Amministrazione')],
     campi: [['Per confermare scrivi ATTIVA', 'ATTIVA'], ['Pulsante', 'Apri il piano CO']],
     attesa: 'Piano CO 2027 aperto. Il budget 2027 si prepara a ottobre 2026: nel simulatore lo inserisci adesso, prima di chiudere gennaio.', nota: 'In S/4HANA i piani stanno nella tabella ACDOCP; SAP consiglia di pianificare in SAP Analytics Cloud. Qui usi KP06 e BPC.',
     fatto: function (h) { var m = cpm(h); return !!m && m.anno === 2027; }},
    {id: 'pf-kp06-4100', g: '1 · Ottobre: il budget 2027', data: '02/01/2027', titolo: 'KP06: budget annuo del centro 4100 Magazzino', dove: {ep: CO + 'kp06'}, percorso: 'CO → Controllo di gestione → 2 · Pianificazione costi per centro',
     punti: kp06Punti('4100', 'Magazzino'), campi: [['Versione', '0'], ['Centro', '4100 Magazzino'], ['80 Salari e stipendi', '30000; tutte le altre classi 0']],
     attesa: 'Piano del centro 4100: 30.000 € di personale.', fatto: function (h) { return kp06Ok(h, '4100'); }},
    {id: 'pf-kp06-4200', g: '1 · Ottobre: il budget 2027', data: '02/01/2027', titolo: 'KP06: budget annuo del centro 4200 Produzione (costi comuni)', dove: {ep: CO + 'kp06'}, percorso: 'CO → Controllo di gestione → 2 · Pianificazione costi per centro',
     punti: kp06Punti('4200', 'Produzione'), campi: [['Centro', '4200'], ['86 Fitti passivi', '12000'], ['50 Ammortamenti', '2900'], ['54 Consulenze e servizi (energia)', '3100'], ['Altre classi', '0']],
     attesa: 'Piano del centro 4200: 18.000 € di costi comuni.', fatto: function (h) { return kp06Ok(h, '4200'); }},
  ].concat([['4210', 'Taglio'], ['4220', 'Piegatura'], ['4230', 'Saldatura']].map(function (r) {
    return {id: 'pf-kp06-' + r[0], g: '1 · Ottobre: il budget 2027', data: '02/01/2027', titolo: 'KP06: budget annuo del reparto ' + r[0] + ' ' + r[1], dove: {ep: CO + 'kp06'}, percorso: 'CO → Controllo di gestione → 2 · Pianificazione costi per centro',
     punti: kp06Punti(r[0], r[1]), campi: [['Centro', r[0] + ' ' + r[1]], ['80 Salari e stipendi', '36000 (3.000 € al mese); altre classi 0']],
     attesa: 'Reparto ' + r[1] + ': 36.000 € di personale.', fatto: function (h) { return kp06Ok(h, r[0]); }};
  })).concat([
    {id: 'pf-kp06-4300', g: '1 · Ottobre: il budget 2027', data: '02/01/2027', titolo: 'KP06: budget annuo del centro 4300 Amministrazione', dove: {ep: CO + 'kp06'}, percorso: 'CO → Controllo di gestione → 2 · Pianificazione costi per centro',
     punti: kp06Punti('4300', 'Amministrazione'), campi: [['Centro', '4300'], ['80 Salari e stipendi', '40000'], ['83 Assicurazioni', '1200']],
     attesa: 'Piano totale dei sei centri: 197.200 €.', nota: '30.000 + 18.000 + 3 × 36.000 + 41.200 = 197.200 €.', fatto: function (h) { return kp06Ok(h, '4300'); }},
    {id: 'pf-bpc-modello', g: '1 · Ottobre: il budget 2027', data: '02/01/2027', titolo: 'BPC: crea il modello di budget dal piano KP06', dove: {ep: BP + 'modello'}, percorso: 'BPC → Pianificazione e budget → 1 · Modello e Data Manager',
     punti: [campo('#bpc-crea-conferma', 'Per confermare scrivi CREA', 'CREA'), premi(btn('bpc-crea', 'crea'), 'Crea il modello')],
     campi: [['Per confermare scrivi CREA', 'CREA'], ['Pulsante', 'Crea il modello']],
     attesa: 'BUDGET V1 = piano KP06 diviso in 12 mesi uguali (4200: fitto 1.000 al mese, energia 258,33 al mese).', nota: 'In SAP Analytics Cloud questo sarebbe il modello di pianificazione con la dimensione Versione (categoria Budget).',
     fatto: function (h) { var b = bpc(h); return !!b && b.anno === 2027; }},
    {id: 'pf-bpc-stagione', g: '1 · Ottobre: il budget 2027', data: '02/01/2027', titolo: 'BPC: l’energia del centro 4200 mese per mese (stagionalità)', dove: {ep: BP + 'input'}, percorso: 'BPC → Pianificazione e budget → 2 · Modulo di inserimento (EPM)',
     punti: [scegli('#cat', 'Categoria', 'BUDGET'), scegli('#ver', 'Versione', 'V1'), scegli('#cdc', 'Centro', '4200', '4200 Produzione')].concat(mesi('54', STAGIONE)).concat([premi(btn('epm', 'salva'), 'Salva nel modello')]),
     campi: [['Categoria / Versione / Centro', 'BUDGET / V1 / 4200'], ['Riga 54', STAGIONE.join(' · ') + ' (totale 3.100)'], ['Pulsante', 'Salva nel modello']],
     attesa: 'Totale riga 54 = 3.100 €: il budget annuo non cambia, cambia la distribuzione nei mesi (più energia d’inverno).', nota: 'Senza stagionalità, a marzo confronteresti 3/12 del budget con un consumo invernale: falso scostamento.',
     fatto: function (h) { return rigaUguale(h, 'BUDGET', 'V1', '4200', '54', STAGIONE); }},
    {id: 'pf-bpc-invia', g: '1 · Ottobre: il budget 2027', data: '02/01/2027', titolo: 'BPC: ogni responsabile invia il budget del suo centro', dove: {ep: BP + 'processo'}, percorso: 'BPC → Pianificazione e budget → 3 · Approvazione e ritrasferimento in S/4',
     punti: [leggi('Per ognuno dei sei centri: menu «Centro» → menu «Azione» = «Invia al controller» → «Esegui»'), leggi('La tabella in alto diventa gialla: «Inviato al controller». Il centro inviato è bloccato.')],
     campi: [['Centri', CDC6.join(', ')], ['Azione', 'Invia al controller']],
     attesa: 'Sei centri inviati: nessuno può più modificare il proprio budget.', nota: 'In SAC è la pubblicazione della versione privata e l’attività «invio» del calendario; in BPC il Business Process Flow con il work status.',
     fatto: function (h) { var b = bpc(h); return !!b && CDC6.every(function (c) { var s = ((b.stato || {})['BUDGET|V1|' + c] || {}).stato; return s === 'inviato' || s === 'approvato'; }); }},
    {id: 'pf-bpc-approva', g: '1 · Ottobre: il budget 2027', data: '02/01/2027', titolo: 'BPC: approva i sei centri e blocca il budget V1', dove: {ep: BP + 'processo'}, percorso: 'BPC → Pianificazione e budget → 3 · Approvazione e ritrasferimento in S/4',
     punti: [leggi('Per ognuno dei sei centri: «Centro» → «Approva (controller)» → nota «ok» → «Esegui»'), campo('#retract-conferma', 'Per confermare scrivi TRASFERISCI', 'TRASFERISCI'), premi(btn('retract'), 'Ritrasferisci in S/4')],
     campi: [['Azione', 'Approva (controller), nota «ok», per i sei centri'], ['Poi', 'scrivi TRASFERISCI → Ritrasferisci in S/4']],
     attesa: 'Budget V1 approvato e bloccato, 197.200 €, ritrasferito in S/4 come piano KP06 versione 0. Da qui in poi è il benchmark dell’anno.', nota: 'In SAC il V1 approvato è una versione pubblica protetta con il data locking.',
     fatto: function (h) { var b = bpc(h); return !!b && (b.retract || []).length > 0 && CDC6.every(function (c) { return ((b.stato || {})['BUDGET|V1|' + c] || {}).stato === 'approvato'; }); }},

    // ══════════ 2 · aprile: forecast 3+9 ══════════
    {id: 'pf-chiudi-q1', g: '2 · Aprile: forecast 3+9', data: '31/03/2027', titolo: 'L’amministrazione chiude gennaio, febbraio e marzo', dove: {ep: DT + 'avvio'}, percorso: 'Avvio e dati di base → Nuova azienda / Avvio → riquadro «Chiusura contabile del mese»',
     punti: [premi(btn('pfm'), 'Chiudi gennaio 2027'), premi(btn('pfm'), 'Chiudi febbraio 2027'), premi(btn('pfm'), 'Chiudi marzo 2027')],
     campi: [['Pulsante', 'Chiudi il mese, tre volte: gennaio, febbraio, marzo']],
     attesa: 'Tre registrazioni «Chiusura contabile» con il centro di costo su ogni riga di costo.', nota: 'È il lavoro dell’amministrazione: il controller parte dopo, a mese chiuso (WD+5).',
     fatto: function (h) { return chiusi(h) >= 3; }},
    {id: 'pf-ksb1-q1', g: '2 · Aprile: forecast 3+9', data: '06/04/2027', titolo: 'KSB1: leggi i costi effettivi dei centri di gennaio–marzo', dove: {ep: CO + 'ksb1'}, percorso: 'CO → Controllo di gestione → Consuntivo dei centri (KSB1)',
     punti: [leggi('Scegli il centro 4200: energia 480 + 420 + 360 = 1.260 € (budget 1.050), fitto 3.000, ammortamenti 725,01'), leggi('Le righe hanno origine «riga FI»: il centro arriva dalla registrazione, non lo riscrivi')],
     campi: [['4200 gennaio–marzo', 'consuntivo 4.985,01 contro budget 4.775,01: +210 di energia (+20%)'], ['Altri centri', 'in linea con il budget']],
     attesa: 'Il consuntivo dei centri è letto dal giornale: nessun dato si ricopia.'},
    {id: 'pf-actual-3', g: '2 · Aprile: forecast 3+9', data: '06/04/2027', titolo: 'BPC Data Manager: carica il consuntivo fino a marzo', dove: {ep: BP + 'modello'}, percorso: 'BPC → Pianificazione e budget → 1 · Modello e Data Manager → «carica il consuntivo da S/4»',
     punti: [campo('#bpc-actual-mese', 'Fino al mese (1–12)', '3'), premi(btn('bpc-actual', 'actual'), 'Carica il consuntivo')],
     campi: [['Fino al mese', '3'], ['Pulsante', 'Carica il consuntivo']], attesa: 'ACTUAL caricato da gennaio a marzo.',
     fatto: function (h) { var b = bpc(h); return !!b && b.actualFino >= 3; }},
    {id: 'pf-f3', g: '2 · Aprile: forecast 3+9', data: '06/04/2027', titolo: 'BPC Data Manager: crea il forecast F3 (3+9)', dove: {ep: BP + 'modello'}, percorso: 'BPC → Pianificazione e budget → 1 · Modello e Data Manager → «crea un forecast»',
     punti: [campo('#bpc-copia-destinazione', 'Nome della versione', 'F3'), campo('#bpc-copia-mesiActual', 'Mesi a consuntivo', '3'), premi(btn('bpc-copia', 'copia'), 'Crea il forecast')],
     campi: [['Nome della versione', 'F3'], ['Mesi a consuntivo', '3'], ['Pulsante', 'Crea il forecast']],
     attesa: 'F3 = gennaio–marzo a consuntivo + aprile–dicembre copiati dal budget V1.', nota: 'In SAC: versione di categoria Forecast e «Forecast Layout» con data di taglio a fine marzo.',
     fatto: function (h) { var b = bpc(h); return !!b && b.versioni.FORECAST.indexOf('F3') >= 0; }},
    {id: 'pf-f3-energia', g: '2 · Aprile: forecast 3+9', data: '06/04/2027', titolo: 'Forecast F3: energia +10% da aprile a dicembre (4200)', dove: {ep: BP + 'input'}, percorso: 'BPC → 2 · Modulo di inserimento (EPM) → FORECAST / F3 / 4200',
     punti: [scegli('#cat', 'Categoria', 'FORECAST'), scegli('#ver', 'Versione', 'F3'), scegli('#cdc', 'Centro', '4200', '4200 Produzione')].concat(mesi('54', ENERGIA_F3, 3)).concat([premi(btn('epm', 'salva'), 'Salva nel modello')]),
     campi: [['Ipotesi degli Acquisti', 'il contratto dell’energia resta più caro del 10% fino a dicembre'], ['Riga 54 aprile–dicembre', ENERGIA_F3.slice(3).join(' · ')], ['Gennaio–marzo', 'non toccarli: sono consuntivo']],
     attesa: 'Energia F3 = 1.260 consuntivo + 2.255 previsti = 3.515 € (budget 3.100).',
     fatto: function (h) { return rigaUguale(h, 'FORECAST', 'F3', '4200', '54', ENERGIA_F3, 3); }},
    {id: 'pf-f3-saldatura', g: '2 · Aprile: forecast 3+9', data: '06/04/2027', titolo: 'Forecast F3: straordinari in Saldatura da aprile (4230)', dove: {ep: BP + 'input'}, percorso: 'BPC → 2 · Modulo di inserimento (EPM) → FORECAST / F3 / 4230',
     punti: [scegli('#cat', 'Categoria', 'FORECAST'), scegli('#ver', 'Versione', 'F3'), scegli('#cdc', 'Centro', '4230', '4230 Saldatura')].concat(mesi('80', [3000, 3000, 3000, 3300, 3300, 3300, 3300, 3300, 3300, 3300, 3300, 3300], 3)).concat([premi(btn('epm', 'salva'), 'Salva nel modello')]),
     campi: [['Ipotesi della Produzione', 'ordini in crescita: 300 € al mese di straordinari in Saldatura da aprile'], ['Riga 80 aprile–dicembre', '3300 ogni mese']],
     attesa: 'Saldatura F3 = 9.000 + 9 × 3.300 = 38.700 € (V1 36.000: +2.700).',
     fatto: function (h) { return rigaUguale(h, 'FORECAST', 'F3', '4230', '80', [3000, 3000, 3000, 3300, 3300, 3300, 3300, 3300, 3300, 3300, 3300, 3300], 3); }},
    {id: 'pf-report-3', g: '2 · Aprile: forecast 3+9', data: '06/04/2027', titolo: 'Report: V1, consuntivo e F3 a confronto', dove: {ep: BP + 'report'}, percorso: 'BPC → Pianificazione e budget → 4 · Budget, forecast e consuntivo',
     punti: [scegli('#mese', 'Fino al mese', '3', 'Mar'), scegli('#fc', 'Forecast', 'F3'), leggi('4200: budget a marzo 4.775,01, consuntivo 4.985,01, +210 (+4%, verde) · forecast anno 18.415 (+415)'), leggi('Totale «Versioni a confronto»: V1 197.200 · F3 200.315 (+3.115)')],
     campi: [['Lettura', 'scostamento a oggi (YTD) + previsione dell’anno: il V1 resta 197.200']],
     attesa: 'Il forecast dice alla Direzione dove arriverà l’anno: +3.115 € di costi, di cui 2.700 di straordinari e 415 di energia.'},

    // ══════════ 3 · luglio: forecast 6+6 ══════════
    {id: 'pf-chiudi-q2', g: '3 · Luglio: forecast 6+6', data: '30/06/2027', titolo: 'L’amministrazione chiude aprile, maggio e giugno', dove: {ep: DT + 'avvio'}, percorso: 'Avvio e dati di base → Nuova azienda / Avvio → «Chiusura contabile del mese»',
     punti: [premi(btn('pfm'), 'Chiudi aprile 2027'), premi(btn('pfm'), 'Chiudi maggio 2027'), premi(btn('pfm'), 'Chiudi giugno 2027')],
     campi: [['Pulsante', 'Chiudi il mese, tre volte']], attesa: 'Mesi chiusi fino a giugno.', fatto: function (h) { return chiusi(h) >= 6; }},
  ]).concat(trimestre(6, 'Luglio: forecast 6+6', '3 · Luglio: forecast 6+6', '06/07/2027', 'giugno',
    'F6 = gennaio–giugno a consuntivo + luglio–dicembre dal budget V1. F3 resta com’era: è la fotografia di aprile.',
    'Saldatura F6 = 38.700 € (+2.700 sul V1).', 'Taglio F6 = 34.800 € (−1.200). 4200 F6 = 18.260 (+260: solo il caro energia del semestre, il prezzo è tornato quello del budget).')).concat([
    {id: 'pf-report-6', g: '3 · Luglio: forecast 6+6', data: '06/07/2027', titolo: 'Report: V1, F3 e F6 a confronto', dove: {ep: BP + 'report'}, percorso: 'BPC → 4 · Budget, forecast e consuntivo',
     punti: [scegli('#mese', 'Fino al mese', '6', 'Giu'), scegli('#fc', 'Forecast', 'F6'), leggi('Versioni a confronto: V1 197.200 · F3 200.315 · F6 198.960'), leggi('Perché F6 è più basso di F3? L’energia è tornata al prezzo del budget e il Taglio risparmia 1.200 €.')],
     campi: [['Lettura', 'ogni forecast è una fotografia: non si sovrascrive, si confronta']], attesa: 'La Direzione vede che il rischio di aprile (+3.115) si è ridotto a +1.760.'},

    // ══════════ 4 · ottobre: forecast 9+3 ══════════
    {id: 'pf-chiudi-q3', g: '4 · Ottobre: forecast 9+3', data: '30/09/2027', titolo: 'L’amministrazione chiude luglio, agosto e settembre', dove: {ep: DT + 'avvio'}, percorso: 'Avvio e dati di base → Nuova azienda / Avvio → «Chiusura contabile del mese»',
     punti: [premi(btn('pfm'), 'Chiudi luglio 2027'), premi(btn('pfm'), 'Chiudi agosto 2027'), premi(btn('pfm'), 'Chiudi settembre 2027')],
     campi: [['Pulsante', 'Chiudi il mese, tre volte']], attesa: 'Mesi chiusi fino a settembre.', fatto: function (h) { return chiusi(h) >= 9; }},
  ]).concat(trimestre(9, 'Ottobre: forecast 9+3', '4 · Ottobre: forecast 9+3', '06/10/2027', 'settembre',
    'F9 = gennaio–settembre a consuntivo + ottobre–dicembre dal V1.',
    'Saldatura F9: ottobre–dicembre a 3.300.', 'Taglio F9: ottobre–dicembre a 2.800. Totale F9 = 198.960 €, uguale a F6: le ipotesi di luglio si sono avverate, un buon forecast converge.')).concat([
    {id: 'pf-finale', g: '4 · Ottobre: forecast 9+3', data: '06/10/2027', titolo: 'Lettura finale: quattro versioni, un solo budget', dove: {ep: BP + 'report'}, percorso: 'BPC → 4 · Budget, forecast e consuntivo → «Versioni a confronto»',
     punti: [scegli('#mese', 'Fino al mese', '9', 'Set'), scegli('#fc', 'Forecast', 'F9'),
       leggi('V1 197.200 · F3 200.315 · F6 198.960 · F9 198.960: il V1 non è mai cambiato'),
       leggi('A settembre: 4200 +260 (energia del 1° semestre), 4230 +1.800 (straordinari), 4210 −600 (part-time)'),
       leggi('Lo stesso calendario in Dynamics: Budget C/G con nome (V1, FC3+9…) e «Copia budget C/G» in Business Central; scenari del Budget planning in Finance')],
     campi: [['Messaggio per la Direzione', 'l’anno chiuderà a circa 198.960 € di costi dei centri, +1.760 sul budget: straordinari in Saldatura in parte compensati dal part-time del Taglio']],
     attesa: 'Sai costruire, leggere e spiegare budget e forecast come un controller: V1 bloccato come benchmark, forecast come fotografie successive.'}
  ]);

  window.MSA_ESERCIZIO = {codice: 'pianificazione-forecast', titolo: 'Pianificazione e forecast 2027 · il controller (budget V1, forecast 3+9, 6+6, 9+3)', versione: 'erp-ft', pannelloAutomatico: true, verificaRagioneria: false, passi: passi};
})();
