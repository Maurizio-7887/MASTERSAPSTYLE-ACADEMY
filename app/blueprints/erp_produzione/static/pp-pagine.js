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
    return L.scheda('🏭', 'Ordini di produzione', 'COOIS', L.tabella(['Ordine', 'Data', 'Materiale', 'Q.tà›', 'Stato', 'Pianificati›', 'Componente prelevato›', 'Ore›', 'Effettivi›', 'Versati›', 'Accredito›', 'Saldo ordine›', 'WIP analitico›', 'Fasi confermate'], S().produzione.map(function (o) {
      var x = PP.effettivi(o), saldo = o.liquidazione ? 0 : x.totale - x.accredito;
      return [o.numero, fd(o.data), o.materiale, n0(o.qta), '<b>' + PP.stato(o) + '</b>', eur(o.piano.totale), n0(x.kg) + ' ' + (PP.comp(o).mat === 'FERRO' ? 'kg ferro' : 'pz ' + PP.comp(o).mat), n0(x.ore + x.oreSet), eur(x.totale), n0(x.entrati), eur(x.accredito), eur(saldo), eur(PP.wip(o).valore), (o.fasi || []).map(function (f, k) { return '00' + (k + 1) + '0 ' + f + ': ' + n0(PP.faseQta(o, f)) + '/' + n0(o.qta); }).join(' · ') || 'Ciclo aggregato']; }), 'Nessun ordine di produzione.') +
      '<p class="lab-nota">Stati: REL rilasciato · PCNF confermato in parte · CNF tutte le operazioni confermate · DLV consegnato · TECO chiuso tecnicamente · CLSD liquidato. Durante la lavorazione il saldo è un costo in corso (WIP analitico), non una varianza già liquidabile. Solo a ordine DLV/TECO si determina la varianza per KO88. Il WIP qui non genera capitalizzazioni FI automatiche.</p>' +
      L.tabella(['Ordine unico', 'Data dichiarazione', 'Operazione', 'Pezzi›', 'Ore›', 'Costo attività›', 'Stato dichiarazione'], S().produzione.reduce(function (righe, o) {
        return righe.concat(o.eventi.filter(function (e) { return e.tipo === 'CO11N' && e.fase; }).map(function (e) {
          return [o.numero, fd(e.data), '00' + (o.fasi.indexOf(e.fase) + 1) + '0 · ' + e.fase, n0(e.qta), n0(e.ore + e.attrezzaggio), eur(e.valore), e.stornato ? 'Stornata il ' + fd(e.stornato) : 'Confermata'];
        }));
      }, []), 'Le dichiarazioni delle operazioni compaiono qui, separate e riferite allo stesso ordine.'));
  };
  var PAGINE = {
    ordini: function () {
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🆕', 'Crea ordine di produzione', 'CO01 · tipo PP01', L.modulo('co', [['materiale', 'Materiale', 'select', 'TR-STD', U.materiali(S())], ['qta', 'Quantità (pz)', 'num'], ['data', 'Data di inizio', 'date'], ['fine', 'Data di fine pianificata (vuota = inizio + 5 giorni)', 'date']], [['piano', 'Mostra costi pianificati', 'sec'], ['co', 'Rilascia ordine']])) +
        L.scheda('🧾', 'Distinta e ciclo', 'CS03 · CA03', L.tabella(['Materiale', 'Tipo', 'Componente per pezzo›', 'Taglio h/pz›', 'Piegatura h/pz›', 'Saldatura h/pz›', 'Attrezzaggio h/lotto›', 'Standard›', 'Scorta›'], U.materiali(S()).map(function (x) {
          var m = S().materiali[x[0]], standard = PC.cpm.attivo() ? PC.cpm.modello().standard[x[0]] : null, ciclo = standard || m, cp = standard ? standard.componente : m.comp || {mat: 'FERRO', q: m.ferro};
          return [x[0], m.tipo, n0(cp.q) + ' ' + (S().materiali[cp.mat].um || '') + ' ' + cp.mat, n0(ciclo.ore.Taglio || 0), n0(ciclo.ore.Piegatura || 0), n0(ciclo.ore.Saldatura || 0), n0(ciclo.attrezzaggio), eur(m.std), n0(S().giacenze[x[0]] || 0)]; })) +
          (PC.cpm.attivo() ? '<p class="lab-nota"><b>CPM attivo, revisione ' + PC.cpm.modello().revisione + '</b>: distinta/ciclo modificabili nella pagina CO-PC / CO-CCA, budget annuale separato dall’ordine. Nuovi ordini congelano componente, tempi, tariffe dei centri e standard. Per tutti gli ordini CPM, anche semilavorati autonomi, scegli la fase dello snapshot. Le attività addebitate non sono nuovi costi del personale: D72/A75 è un trasferimento secondario.</p>' : '') +
          (S().produzioneModello === 'wip-fasi-v1' ? '<p class="lab-nota"><b>Transenna: un ordine, tre operazioni</b>. Ferro → Taglio → Piegatura → Saldatura: le conferme accumulano costi nello stesso ordine, senza carichi intermedi. Il 101 riguarda soltanto i pezzi finiti. <b>SL-TAGLIO</b> è invece un lotto autonomo di kit tagliati: proprio ordine e versamento a magazzino sul conto 07. I kit di questo esercizio restano a scorta e non vengono consumati dalle transenne.</p>' : S().materiali['SL-TAGLIO'] ? '<p class="lab-nota"><b>Azienda nuova a tre stadi</b>: la TR-STD nasce da tre ordini in sequenza. <b>Taglio</b>: ferro → SL-TAGLIO · <b>Piega</b>: SL-TAGLIO → SL-PIEGA · <b>Saldatura</b>: SL-PIEGA → TR-STD. Ogni semilavorato entra a magazzino (conto 07, scaffali WMS) e si preleva per lo stadio dopo. TR-ALTA e TR-PED restano a un solo ordine, con i semilavorati fantasma.</p>'
            : '<p class="lab-nota">I semilavorati (tubi tagliati, telaio piegato) sono fantasma: l\'ordine del finito preleva direttamente il ferro. L\'attrezzaggio è fisso: lo stesso per 100 o per 300 pezzi.</p>')) + '</div>' + elenco();
      L.collega(radice, 'co', {co: PP.ordine, piano: function (v) { var el = PC.pianifica(v.materiale, L.num(v.qta, 'Quantità', 1));
        return '<!--info--><p class="lab-nota">Costi pianificati per ' + n0(el.q) + ' pz: <b>' + eur(el.totale) + ' €</b> = ' + eur(el.totale / el.q) + ' €/pz (standard ' + eur(S().materiali[v.materiale].std) + ').' + (el.q < el.stima.lotto ? ' Lotto più piccolo del lotto di calcolo (' + el.stima.lotto + '): l\'attrezzaggio pesa di più su ogni pezzo.' : '') + '</p>'; }}, rendi);
    },
    avanzamento: function () {
      var a = aperti();
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('📤', 'Prelievo per l\'ordine', 'MIGO · 261', L.modulo('pr', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['kg', 'Quantità del componente (ferro in kg, semilavorato in pz)', 'num'], ['data', 'Data', 'date']], [['pr', 'Registra prelievo']]) + '<p class="lab-nota">A costo standard. Ferro: D 70 / A 12. Semilavorato (SL-TAGLIO, SL-PIEGA): D 71 / A 07. Con il WMS attivo il componente deve essere già nell\'area PSA-L1 (approvvigionamento confermato con la pistola RF).</p>') +
        L.scheda('⏱️', 'Conferma delle ore', 'CO11N', L.modulo('cf', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['fase', 'Fase (solo ordini con ciclo a operazioni)', 'select', '', [['', '— ciclo aggregato / scegli fase —'], ['Taglio', 'Taglio'], ['Piegatura', 'Piegatura'], ['Saldatura', 'Saldatura']]], ['qta', 'Pezzi della fase (vuoto = residuo)', 'num'], ['attrezzaggio', 'Ore di attrezzaggio', 'num'], ['ore', 'Ore di lavorazione', 'num'], ['data', 'Data', 'date']], [['cf', 'Conferma']]) + '<p class="lab-nota">D 72 / A 75. Per TR-STD nel nuovo esercizio scegli la fase e conferma i pezzi in sequenza sullo stesso ordine. Nessun movimento di magazzino fra Taglio, Piegatura e Saldatura; i costi restano in lavorazione. Per i vecchi ordini aggregati lascia la fase vuota. Per SL-TAGLIO CPM seleziona Taglio; nel percorso storico resta aggregato. La tariffa dei nuovi ordini è congelata nello snapshot, non quella modificata dopo l’avvio.</p>') +
        L.scheda('📦', 'Entrata del prodotto (finito o semilavorato)', 'MIGO · 101', L.modulo('en', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['qta', 'Pezzi (vuoto = tutto il residuo)', 'num'], ['data', 'Data', 'date']], [['en', 'Registra entrata']]) + '<p class="lab-nota">A costo standard. Prodotto finito: D 13 / A 73. Semilavorato: D 07 / A 73. Con il WMS attivo i pezzi arrivano in GR-ZONE con i compiti di messa a posto. Nel ciclo a operazioni si versano solo quantità che hanno completato la Saldatura; sono ammessi versamenti parziali di pezzi finiti.</p>') +
        L.scheda('🔒', 'Chiusura tecnica', 'CO02 · TECO', L.modulo('tc', [['ordine', 'Ordine', 'select', '', U.lista(a, etich, '— nessun ordine aperto —')], ['data', 'Data', 'date']], [['tc', 'Chiudi tecnicamente', 'sec']]) + '<p class="lab-nota">Solo se l\'ordine non verserà tutti i pezzi previsti.</p>') +
        '</div>' + elenco();
      L.collega(radice, 'pr', {pr: PP.prelievo}, rendi); L.collega(radice, 'cf', {cf: PP.conferma}, rendi); L.collega(radice, 'en', {en: PP.entrata}, rendi); L.collega(radice, 'tc', {tc: PP.teco}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.ordini)(); }
  rendi();
})();
