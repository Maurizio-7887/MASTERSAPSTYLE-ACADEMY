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
    return L.scheda('🏭', 'Ordini di produzione', 'COOIS', L.tabella(['Ordine', 'Data', 'Materiale', 'Q.tà›', 'Stato', 'Pianificati›', 'Componente prelevato›', 'Ore›', 'Effettivi›', 'Versati›', 'Accredito›', 'Saldo ordine›'], S().produzione.map(function (o) {
      var x = PP.effettivi(o), saldo = o.liquidazione ? 0 : x.totale - x.accredito;
      return [o.numero, fd(o.data), o.materiale, n0(o.qta), '<b>' + PP.stato(o) + '</b>', eur(o.piano.totale), n0(x.kg) + ' ' + (PP.comp(o).mat === 'FERRO' ? 'kg ferro' : 'pz ' + PP.comp(o).mat), n0(x.ore + x.oreSet), eur(x.totale), n0(x.entrati), eur(x.accredito), eur(saldo)]; }), 'Nessun ordine di produzione.') +
      '<p class="lab-nota">Stati: REL rilasciato · PCNF confermato in parte · DLV consegnato · TECO chiuso tecnicamente · CLSD liquidato. Il saldo dell\'ordine è la varianza che a fine mese KO88 liquida.</p>');
  };
  var PAGINE = {
    ordini: function () {
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🆕', 'Crea ordine di produzione', 'CO01 · tipo PP01', L.modulo('co', [['materiale', 'Materiale', 'select', 'TR-STD', U.materiali(S())], ['qta', 'Quantità (pz)', 'num'], ['data', 'Data di inizio', 'date']], [['piano', 'Mostra costi pianificati', 'sec'], ['co', 'Rilascia ordine']])) +
        L.scheda('🧾', 'Distinta e ciclo', 'CS03 · CA03', L.tabella(['Materiale', 'Tipo', 'Componente per pezzo›', 'Taglio h/pz›', 'Piegatura h/pz›', 'Saldatura h/pz›', 'Attrezzaggio h/lotto›', 'Standard›', 'Scorta›'], U.materiali(S()).map(function (x) {
          var m = S().materiali[x[0]], cp = m.comp || {mat: 'FERRO', q: m.ferro};
          return [x[0], m.tipo, n0(cp.q) + ' ' + (S().materiali[cp.mat].um || '') + ' ' + cp.mat, n0(m.ore.Taglio || 0), n0(m.ore.Piegatura || 0), n0(m.ore.Saldatura || 0), n0(m.attrezzaggio), eur(m.std), n0(S().giacenze[x[0]] || 0)]; })) +
          (S().materiali['SL-TAGLIO'] ? '<p class="lab-nota"><b>Azienda nuova a tre stadi</b>: la TR-STD nasce da tre ordini in sequenza. <b>Taglio</b>: ferro → SL-TAGLIO · <b>Piega</b>: SL-TAGLIO → SL-PIEGA · <b>Saldatura</b>: SL-PIEGA → TR-STD. Ogni semilavorato entra a magazzino (conto 07, scaffali WMS) e si preleva per lo stadio dopo. TR-ALTA e TR-PED restano a un solo ordine, con i semilavorati fantasma.</p>'
            : '<p class="lab-nota">I semilavorati (tubi tagliati, telaio piegato) sono fantasma: l\'ordine del finito preleva direttamente il ferro. L\'attrezzaggio è fisso: lo stesso per 100 o per 300 pezzi.</p>')) + '</div>' + elenco();
      L.collega(radice, 'co', {co: PP.ordine, piano: function (v) { var el = PC.pianifica(v.materiale, L.num(v.qta, 'Quantità', 1));
        return '<!--info--><p class="lab-nota">Costi pianificati per ' + n0(el.q) + ' pz: <b>' + eur(el.totale) + ' €</b> = ' + eur(el.totale / el.q) + ' €/pz (standard ' + eur(S().materiali[v.materiale].std) + ').' + (el.q < el.stima.lotto ? ' Lotto più piccolo del lotto di calcolo (' + el.stima.lotto + '): l\'attrezzaggio pesa di più su ogni pezzo.' : '') + '</p>'; }}, rendi);
    },
    avanzamento: function () {
      var a = aperti();
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('📤', 'Prelievo per l\'ordine', 'MIGO · 261', L.modulo('pr', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['kg', 'Quantità del componente (ferro in kg, semilavorato in pz)', 'num'], ['data', 'Data', 'date']], [['pr', 'Registra prelievo']]) + '<p class="lab-nota">A costo standard. Ferro: D 70 / A 12. Semilavorato (SL-TAGLIO, SL-PIEGA): D 71 / A 07. Con il WMS attivo il componente deve essere già nell\'area PSA-L1 (approvvigionamento confermato con la pistola RF).</p>') +
        L.scheda('⏱️', 'Conferma delle ore', 'CO11N', L.modulo('cf', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['attrezzaggio', 'Ore di attrezzaggio', 'num'], ['ore', 'Ore di lavorazione', 'num'], ['data', 'Data', 'date']], [['cf', 'Conferma']]) + '<p class="lab-nota">Alla tariffa dei centri: D 72 / A 75.</p>') +
        L.scheda('📦', 'Entrata del prodotto (finito o semilavorato)', 'MIGO · 101', L.modulo('en', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['qta', 'Pezzi (vuoto = tutto il residuo)', 'num'], ['data', 'Data', 'date']], [['en', 'Registra entrata']]) + '<p class="lab-nota">A costo standard. Prodotto finito: D 13 / A 73. Semilavorato: D 07 / A 73. Con il WMS attivo i pezzi arrivano in GR-ZONE con i compiti di messa a posto.</p>') +
        L.scheda('🔒', 'Chiusura tecnica', 'CO02 · TECO', L.modulo('tc', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['data', 'Data', 'date']], [['tc', 'Chiudi tecnicamente', 'sec']]) + '<p class="lab-nota">Solo se l\'ordine non verserà tutti i pezzi previsti.</p>') +
        '</div>' + elenco();
      L.collega(radice, 'pr', {pr: PP.prelievo}, rendi); L.collega(radice, 'cf', {cf: PP.conferma}, rendi); L.collega(radice, 'en', {en: PP.entrata}, rendi); L.collega(radice, 'tc', {tc: PP.teco}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.ordini)(); }
  rendi();
})();
