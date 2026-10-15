/* SISTEMA INTEGRATO — Produzione: CO01 ordini (COOIS), avanzamento 261 · CO11N · 101 · TECO. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, PP = window.PP4, PC = window.PC4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var aperti = function () { return S().produzione.filter(function (o) { return !o.liquidazione && !o.teco; }); };
  var etich = function (o) { return o.numero + ' · ' + o.materiale + ' · ' + o.qta + ' pz · ' + PP.stato(o); };
  var elenco = function () {
    return L.scheda('🏭', 'Ordini di produzione', 'COOIS', L.tabella(['Ordine', 'Data', 'Materiale', 'Q.tà›', 'Stato', 'Pianificati›', 'Ferro kg›', 'Ore›', 'Effettivi›', 'Versati›', 'Accredito›', 'Saldo ordine›'], S().produzione.map(function (o) {
      var x = PP.effettivi(o), saldo = o.liquidazione ? 0 : x.totale - x.accredito;
      return [o.numero, fd(o.data), o.materiale, n0(o.qta), '<b>' + PP.stato(o) + '</b>', eur(o.piano.totale), n0(x.kg), n0(x.ore + x.oreSet), eur(x.totale), n0(x.entrati), eur(x.accredito), eur(saldo)]; }), 'Nessun ordine di produzione.') +
      '<p class="lab-nota">Stati: REL rilasciato · PCNF confermato in parte · DLV consegnato · TECO chiuso tecnicamente · CLSD liquidato. Il saldo dell\'ordine è la varianza che a fine mese KO88 liquida.</p>');
  };
  var PAGINE = {
    ordini: function () {
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🆕', 'Crea ordine di produzione', 'CO01 · tipo PP01', L.modulo('co', [['materiale', 'Materiale', 'select', 'TR-STD', U.materiali(S())], ['qta', 'Quantità (pz)', 'num'], ['data', 'Data di inizio', 'date']], [['piano', 'Mostra costi pianificati', 'sec'], ['co', 'Rilascia ordine']])) +
        L.scheda('🧾', 'Distinta e ciclo', 'CS03 · CA03', L.tabella(['Materiale', 'Ferro kg/pz›', 'Taglio h/pz›', 'Piegatura h/pz›', 'Saldatura h/pz›', 'Attrezzaggio h/lotto›', 'Standard›'], U.materiali(S()).map(function (x) {
          var m = S().materiali[x[0]]; return [x[0], n0(m.ferro), n0(m.ore.Taglio), n0(m.ore.Piegatura), n0(m.ore.Saldatura), n0(m.attrezzaggio), eur(m.std)]; })) +
          '<p class="lab-nota">I semilavorati (tubi tagliati, telaio piegato) sono fantasma: l\'ordine del finito preleva direttamente il ferro. L\'attrezzaggio è fisso: lo stesso per 100 o per 300 pezzi.</p>') + '</div>' + elenco();
      L.collega(radice, 'co', {co: PP.ordine, piano: function (v) { var el = PC.pianifica(v.materiale, L.num(v.qta, 'Quantità', 1));
        return '<!--info--><p class="lab-nota">Costi pianificati per ' + n0(el.q) + ' pz: <b>' + eur(el.totale) + ' €</b> = ' + eur(el.totale / el.q) + ' €/pz (standard ' + eur(S().materiali[v.materiale].std) + ').' + (el.q < el.stima.lotto ? ' Lotto più piccolo del lotto di calcolo (' + el.stima.lotto + '): l\'attrezzaggio pesa di più su ogni pezzo.' : '') + '</p>'; }}, rendi);
    },
    avanzamento: function () {
      var a = aperti();
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('📤', 'Prelievo per l\'ordine', 'MIGO · 261', L.modulo('pr', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['kg', 'Ferro (kg)', 'num'], ['data', 'Data', 'date']], [['pr', 'Registra prelievo']]) + '<p class="lab-nota">A costo standard: D 70 / A 12.</p>') +
        L.scheda('⏱️', 'Conferma delle ore', 'CO11N', L.modulo('cf', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['attrezzaggio', 'Ore di attrezzaggio', 'num'], ['ore', 'Ore di lavorazione', 'num'], ['data', 'Data', 'date']], [['cf', 'Conferma']]) + '<p class="lab-nota">Alla tariffa dei centri: D 72 / A 75.</p>') +
        L.scheda('📦', 'Entrata del prodotto finito', 'MIGO · 101', L.modulo('en', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['qta', 'Pezzi (vuoto = tutto il residuo)', 'num'], ['data', 'Data', 'date']], [['en', 'Registra entrata']]) + '<p class="lab-nota">A costo standard: D 13 / A 73.</p>') +
        L.scheda('🔒', 'Chiusura tecnica', 'CO02 · TECO', L.modulo('tc', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['data', 'Data', 'date']], [['tc', 'Chiudi tecnicamente', 'sec']]) + '<p class="lab-nota">Solo se l\'ordine non verserà tutti i pezzi previsti.</p>') +
        '</div>' + elenco();
      L.collega(radice, 'pr', {pr: PP.prelievo}, rendi); L.collega(radice, 'cf', {cf: PP.conferma}, rendi); L.collega(radice, 'en', {en: PP.entrata}, rendi); L.collega(radice, 'tc', {tc: PP.teco}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.ordini)(); }
  rendi();
})();
