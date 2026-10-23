/* SISTEMA INTEGRATO — Ciclo di pianificazione CO come in SAP S/4HANA: una barra con le sette tappe, sempre visibile
   nelle pagine CO, con lo stato di ognuna letto dai dati (✓ fatto · ● da fare adesso · ○ dopo). Solo presentazione. */
(function () {
  'use strict';
  var L = window.LabMotore;
  function base(prefisso) {
    var v = location.pathname.split('/')[1] || 'vuoto';
    return '/' + v + '/s4/' + prefisso;
  }
  function url(dove) {
    var p = dove.split('/');
    return base(p[0]) + (p[1] ? '/' + p[1] : '/');
  }
  // tappe: [codice pagina, transazioni, titolo, test di completamento]
  function tappe(S) {
    var PC = window.PC4, cp = PC && PC.cpm, m = cp && cp.attivo() ? cp.modello() : null;
    var stima = function (mat) { var st = ((S.costing || {}).stime || {})[mat], sn = st && st.elementi && st.elementi.par && st.elementi.par.snapshot; return st && st.stato === 'FR' && sn && m && sn.revisione === m.revisione; };
    var f = (m && m.fatti) || {};   // tappe confermate dall'allievo: i valori di partenza da soli non contano
    return [
      ['controllo/', 'KS03 · KL03 · KA03', 'Apri il piano e leggi le anagrafiche', !!m],
      ['controllo/kp06', 'KP06', 'Costi per centro', !!f.kp06],
      ['controllo/kp26', 'KP26 · LTP', 'Ore e volumi', !!(f.kp26 && f.ltp)],
      ['controllo/ksu', 'KSU1 · KSU8', 'Ribaltamento', !!f.ksu],
      ['controllo/kspi', 'KSPI', 'Tariffe', !!m && !!m.kspi && m.kspi.revisione === m.revisione],
      ['costi/calcolo', 'CK11N · CK24', 'Costo standard', !!m && stima('TR-STD')],
      ['controllo/report', 'KSB1 · S_ALR_87013611', 'Consuntivo e scostamenti', false]];
  }
  function html(S, corrente) {
    var t = tappe(S), primo = t.findIndex(function (x) { return !x[3]; });
    return '<nav class="lab-card" aria-label="Ciclo di pianificazione CO" style="padding:8px 12px">' +
      '<div style="font-size:12px;color:#556;margin-bottom:4px"><b>Ciclo di pianificazione CO (SAP S/4HANA)</b> · si fa in quest’ordine; ogni modifica al piano crea una revisione e richiede di rifare tariffe e costo standard</div>' +
      '<ol style="display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:0;padding:0">' + t.map(function (x, i) {
        var stato = x[3] ? '✓' : i === primo ? '●' : '○', qui = x[0] === corrente;
        return '<li><a href="' + url(x[0]) + '" class="lab-bd ' + (x[3] ? 'verde' : i === primo ? 'giallo' : 'grigio') + '" style="text-decoration:none;' + (qui ? 'font-weight:700;outline:2px solid #0a6ed1' : '') + '"' +
          (qui ? ' aria-current="page"' : '') + '>' + stato + ' ' + (i + 1) + ' · ' + L.esc(x[2]) + ' <small>' + L.esc(x[1]) + '</small></a></li>';
      }).join('<li aria-hidden="true" style="color:#99a">→</li>') + '</ol></nav>';
  }
  window.COPERCORSO = {html: html, tappe: tappe, url: url};
})();
