/* SISTEMA INTEGRATO — Ruoli e autorizzazioni (PFCG / SU01 / SU53). Una sola persona usa il sistema, ma «indossa» un ruolo alla volta:
   ogni transazione controlla l'oggetto di autorizzazione del ruolo attivo. Se manca, si blocca con il messaggio SU53.
   Il controllo vale solo per l'azione chiesta dall'utente (la chiamata più esterna): quello che il sistema fa «dietro» (per esempio
   la riconferma ATP all'entrata di produzione) non si blocca. Con le autorizzazioni spente (impostazione iniziale) tutti fanno tutto. */
window.AU4 = (function () {
  'use strict';
  var RUOLI = {
    ADMIN: {nome: 'Amministratore di sistema (SAP_ALL)', icona: '🛡️', descr: 'Tutte le transazioni: serve per configurare e per i test.'},
    VENDITE: {nome: 'Addetto vendite', icona: '📝', descr: 'Prezzi, ordini cliente, acconti, fatture, resi e note di credito.'},
    CREDITI: {nome: 'Responsabile crediti', icona: '💳', descr: 'Fido dei clienti, rilascio degli ordini bloccati, approvazione degli abbuoni.'},
    BUYER: {nome: 'Buyer (acquisti)', icona: '🛒', descr: 'Ordini d\'acquisto con riferimento alle richieste approvate.'},
    RESP_ACQ: {nome: 'Responsabile acquisti', icona: '✅', descr: 'Approva le richieste d\'acquisto e rilascia gli ordini sopra soglia.'},
    PRODUZIONE: {nome: 'Capo reparto produzione', icona: '🏭', descr: 'Ordini di produzione, conferme, chiusura tecnica, richieste d\'acquisto.'},
    MAGAZZINIERE: {nome: 'Magazziniere', icona: '👷', descr: 'Pistola RF: conferma dei compiti, conte d\'inventario, imballo, carico.'},
    CAPO_MAG: {nome: 'Capo magazzino', icona: '🏬', descr: 'Entrate merci, consegne e uscite merci, WMS, inventari, spedizioni, innovazione.'},
    CONTABILE: {nome: 'Contabile', icona: '📒', descr: 'Fatture fornitori, incassi, fatture in valuta, SdI, storni contabili.'},
    CONTROLLER: {nome: 'Controller', icona: '📊', descr: 'Costo standard, chiusura degli ordini, Material Ledger, differenze inventariali.'},
    TESORIERE: {nome: 'Tesoriere', icona: '🏦', descr: 'Pagamenti F110, estratti conto, incassi e pagamenti in valuta, stipendi e F24.'},
    PAGHE: {nome: 'Addetto paghe', icona: '🧾', descr: 'Presenze, calcolo e registrazione dei cedolini.'},
  };
  // oggetto → [transazione, ruoli autorizzati] (ADMIN è sempre autorizzato)
  var A = {
    'SD4.creaCondizione': ['VK11', ['VENDITE']], 'SD4.ordine': ['VA01', ['VENDITE']], 'SD4.riconferma': ['V_V2', ['VENDITE', 'CAPO_MAG']],
    'SD4.richiestaAcconto': ['F-37', ['VENDITE']], 'SD4.incassoAcconto': ['F-29', ['CONTABILE']], 'SD4.consegna': ['VL01N', ['CAPO_MAG']], 'SD4.uscitaMerci': ['VL02N', ['CAPO_MAG']],
    'SD4.fattura': ['VF01', ['VENDITE']], 'SD4.reso': ['VA01 RE', ['VENDITE']], 'SD4.entrataReso': ['VL01N 651', ['CAPO_MAG']], 'SD4.notaCreditoReso': ['VF01 RE', ['VENDITE']],
    'SD4.richiestaAbbuono': ['VA01 G2', ['VENDITE']], 'SD4.approvaAbbuono': ['VA02 rilascio G2', ['CREDITI']], 'SD4.notaCreditoAbbuono': ['VF01 G2', ['VENDITE']],
    'SD4.incasso': ['F-28', ['CONTABILE', 'TESORIERE']], 'SD4.decisioneCredito': ['VKM1', ['CREDITI']], 'SD4.anagraficaCredito': ['FD32', ['CREDITI']],
    'MM4.richiesta': ['ME51N', ['PRODUZIONE', 'CAPO_MAG', 'BUYER']], 'MM4.approva': ['ME54N', ['RESP_ACQ']], 'MM4.ordine': ['ME21N', ['BUYER']], 'MM4.rilascia': ['ME29N', ['RESP_ACQ']], 'MM4.parametri': ['OMGQ strategia di rilascio', ['RESP_ACQ']],
    'MM4.entrata': ['MIGO 101', ['CAPO_MAG', 'MAGAZZINIERE']], 'MM4.fattura': ['MIRO', ['CONTABILE']],
    'PP4.ordine': ['CO01', ['PRODUZIONE']], 'PP4.prelievo': ['MIGO 261', ['PRODUZIONE', 'CAPO_MAG']], 'PP4.conferma': ['CO11N', ['PRODUZIONE']], 'PP4.entrata': ['MIGO 101', ['PRODUZIONE', 'CAPO_MAG']], 'PP4.teco': ['CO02 TECO', ['PRODUZIONE']],
    'PC4.scheda': ['KZS2', ['CONTROLLER']], 'PC4.calcola': ['CK11N', ['CONTROLLER']], 'PC4.marca': ['CK24 marca', ['CONTROLLER']], 'PC4.rilascia': ['CK24 rilascia', ['CONTROLLER']],
    'PC4.sovraccosti': ['KGI2', ['CONTROLLER']], 'PC4.varianze': ['KKS2', ['CONTROLLER']], 'PC4.liquida': ['KO88', ['CONTROLLER']], 'PC4.chiusuraML': ['CKMLCP', ['CONTROLLER']],
    'WM4.attiva': ['W100 attivazione', ['CAPO_MAG']], 'WM4.approvvigiona': ['LP10 staging', ['CAPO_MAG', 'PRODUZIONE']], 'WM4.trasferisci': ['LT10', ['CAPO_MAG']], 'WM4.conferma': ['LM00 conferma', ['MAGAZZINIERE', 'CAPO_MAG']],
    'IV4.crea': ['LI01N', ['CAPO_MAG']], 'IV4.attiva': ['LI02N attiva', ['CAPO_MAG']], 'IV4.conta': ['LI11N', ['MAGAZZINIERE', 'CAPO_MAG']], 'IV4.chiudi': ['LI14', ['CAPO_MAG']], 'IV4.registra': ['LI20 / LI21', ['CONTROLLER']],
    'SP4.imballa': ['VL02N imballo', ['MAGAZZINIERE', 'CAPO_MAG']], 'SP4.creaTrasporto': ['VT01N', ['CAPO_MAG']], 'SP4.carica': ['VT02N carico', ['MAGAZZINIERE', 'CAPO_MAG']], 'SP4.parti': ['VT02N partenza', ['CAPO_MAG']], 'SP4.ddt': ['DDT', ['CAPO_MAG']],
    'IN4.applicaSlotting': ['/SCWM/SLOT', ['CAPO_MAG']], 'IN4.impostazioni': ['/SCWM/WAVE impostazioni', ['CAPO_MAG']], 'IN4.rilasciaOndata': ['/SCWM/WAVE rilascio', ['CAPO_MAG']], 'IN4.varco': ['varco RFID', ['MAGAZZINIERE', 'CAPO_MAG']],
    'TS4.eseguiPagamenti': ['F110', ['TESORIERE']], 'TS4.caricaEstratto': ['FF_5', ['TESORIERE']], 'TS4.abbina': ['FEBAN abbinamento', ['TESORIERE']], 'TS4.manuale': ['FEBAN manuale', ['TESORIERE', 'CONTABILE']],
    'FX4.tasso': ['OB08', ['TESORIERE', 'CONTROLLER']], 'FX4.fatturaCliente': ['FB70', ['CONTABILE']], 'FX4.fatturaFornitore': ['FB60', ['CONTABILE']], 'FX4.regola': ['F-28 / F-53 in valuta', ['TESORIERE']], 'FX4.valuta': ['FAGL_FCV', ['CONTROLLER', 'CONTABILE']],
    'PY4.presenze': ['PA61', ['PAGHE']], 'PY4.calcola': ['PC00_M15_CALC', ['PAGHE']], 'PY4.registra': ['PC00_M99_CIPE', ['PAGHE']], 'PY4.pagaNetti': ['bonifici stipendi', ['TESORIERE']], 'PY4.f24': ['F24', ['TESORIERE']], 'PY4.parametri': ['tabelle paghe', ['PAGHE']],
    'ST4.inviaSdi': ['SdI invio', ['CONTABILE', 'VENDITE']], 'ST4.vf11': ['VF11', ['VENDITE', 'CONTABILE']], 'ST4.vl09': ['VL09', ['CAPO_MAG']], 'ST4.eliminaConsegna': ['VL02N elimina', ['CAPO_MAG']],
    'ST4.mbst': ['MBST', ['CAPO_MAG']], 'ST4.mr8m': ['MR8M', ['CONTABILE']], 'ST4.produzione': ['CO13 / 262 / 102', ['PRODUZIONE', 'CONTROLLER']], 'ST4.lt15': ['LT15', ['CAPO_MAG']], 'ST4.fb08': ['FB08', ['CONTABILE', 'TESORIERE']],
  };
  var S = function () { return window.SD4 && window.SD4.N ? window.SD4.N.S : null; };
  var X = function () { var s = S(); if (s && !s.auth) s.auth = {attivo: false, ruolo: 'ADMIN', su53: []}; return s ? s.auth : {attivo: false, ruolo: 'ADMIN', su53: []}; };
  var profondita = 0;
  function verifica(ogg) {
    var a = X(); if (!a.attivo || a.ruolo === 'ADMIN') return;
    var d = A[ogg]; if (!d || d[1].indexOf(a.ruolo) >= 0) return;
    var chi = d[1].map(function (r) { return RUOLI[r].nome; }).join(' o ');
    a.su53.push({quando: new Date().toISOString().slice(0, 19).replace('T', ' '), ruolo: a.ruolo, oggetto: ogg, tcode: d[0]});
    if (a.su53.length > 30) a.su53 = a.su53.slice(-30);
    try { window.SD4.N.salva(); } catch (e) { /* niente */ }
    throw Error('Autorizzazione mancante (SU53): il ruolo «' + RUOLI[a.ruolo].nome + '» non può eseguire ' + d[0] + '. È una transazione di: ' + chi + '. Cambia ruolo in alto o chiedi a chi ce l\'ha.');
  }
  function installa() {
    Object.keys(A).forEach(function (k) {
      var p = k.split('.'), m = window[p[0]]; if (!m || typeof m[p[1]] !== 'function' || m[p[1]].__au) return;
      var f = m[p[1]], w = function () { if (profondita === 0) verifica(k); profondita++; try { return f.apply(this, arguments); } finally { profondita--; } };
      w.__au = true; m[p[1]] = w;
    });
  }
  function imposta(i) {
    var a = X();
    if (i.attivo !== undefined) a.attivo = i.attivo === true || i.attivo === 'si';
    if (i.ruolo) { if (!RUOLI[i.ruolo]) throw Error('Ruolo inesistente.'); a.ruolo = i.ruolo; }
    window.SD4.N.salva();
    return '<p class="lab-nota">Autorizzazioni <b>' + (a.attivo ? 'attive' : 'spente') + '</b>. Ruolo in uso: <b>' + RUOLI[a.ruolo].icona + ' ' + RUOLI[a.ruolo].nome + '</b>.</p>';
  }
  var puo = function (ruolo, ogg) { return ruolo === 'ADMIN' || (A[ogg] && A[ogg][1].indexOf(ruolo) >= 0); };
  // barra del ruolo in cima a ogni pagina (solo con le autorizzazioni attive)
  function barra() {
    var a = X(); if (!a.attivo) return '';
    return '<div class="lab-filtro au-barra no-stampa"><label>👤 Stai lavorando come <select id="au-ruolo">' + Object.keys(RUOLI).map(function (r) { return '<option value="' + r + '"' + (r === a.ruolo ? ' selected' : '') + '>' + RUOLI[r].icona + ' ' + RUOLI[r].nome + '</option>'; }).join('') + '</select></label></div>';
  }
  if (typeof document !== 'undefined') document.addEventListener('change', function (e) { if (e.target && e.target.id === 'au-ruolo') { imposta({ruolo: e.target.value}); if (window.location && window.location.reload) window.location.reload(); } });
  installa();
  if (window.S4UI && !window.S4UI.__au) { var av = window.S4UI.avviso; window.S4UI.avviso = function (s) { return barra() + av(s); }; window.S4UI.__au = true; }
  return {RUOLI: RUOLI, A: A, imposta: imposta, verifica: verifica, puo: puo, barra: barra, stato: X, installa: installa};
})();
