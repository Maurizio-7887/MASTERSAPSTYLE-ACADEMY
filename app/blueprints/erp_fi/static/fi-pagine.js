/* SISTEMA INTEGRATO — Contabilità: libro giornale (FB03) e bilancio di verifica (F.08) di tutti i moduli. */
(function () {
  'use strict';
  var L = window.LabMotore, SD = window.SD4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var PAGINE = {
    giornale: function () {
      radice.innerHTML = L.scheda('📚', 'Libro giornale', 'FB03 · S_ALR_87012287', N.S.registrazioni.slice().reverse().map(function (r) {
        return '<div class="lab-scr"><b>Doc. ' + r.numero + ' · ' + L.fd(r.data) + '</b> <span class="lab-bd blu">' + r.tipo + '</span> ' + L.esc(r.descrizione) + '<ul>' + r.righe.map(function (y) {
          return '<li class="' + (y.dareAvere === 'DARE' ? 'd' : 'a') + '">' + (y.dareAvere === 'DARE' ? 'Dare' : 'Avere') + ' ' + y.conto + (y.partner ? ' · ' + y.partner : '') + (y.testo ? ' · ' + L.esc(y.testo) : '') + ' <span>' + L.eur(y.importo) + '</span></li>'; }).join('') + '</ul></div>';
      }).join('') || '<p class="lab-vuoto">Nessuna scrittura.</p>');
    },
    bilancio: function () { radice.innerHTML = L.scheda('⚖️', 'Bilancio di verifica', 'F.08', L.bilancio(N.S)); },
  };
  (PAGINE[C.pagina] || PAGINE.giornale)();
})();
