/* Presidio didattico UI: non è una protezione contro l'ispezione tecnica del browser. */
(function () {
  'use strict';
  var C = window.LAB_PAGINA || {};
  if (C.slot !== 'erp-ft' && !/erp-ft/.test(C.chiave || '')) return;
  var key = C.chiave;
  function stato() {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { return {}; }
  }
  function tentato(q) {
    if (window.MSA_RAGIONERIA && window.MSA_RAGIONERIA.tentativoValido) return window.MSA_RAGIONERIA.tentativoValido(q);
    return q.tentato === true && Array.isArray(q.cronologiaTentativi) && q.cronologiaTentativi.length > 0;
  }
  function blocco(S) {
    if (window.MSA_RAGIONERIA && window.MSA_RAGIONERIA.protetto) return window.MSA_RAGIONERIA.protetto(S);
    return !!(S.msaRagioneria && (S.msaRagioneria.coda || []).some(function (q) { return !tentato(q); }));
  }
  function aggiorna() {
    var b = blocco(stato()), lab = document.getElementById('lab');
    document.documentElement.classList.toggle('msa-prima-tentativo', b);
    if (lab) { lab.inert = b; lab.setAttribute('aria-hidden', b ? 'true' : 'false'); }
    var box = document.getElementById('msa-presidio');
    if (!box && lab) {
      box = document.createElement('section'); box.id = 'msa-presidio'; box.className = 'lab-esito'; box.setAttribute('role', 'status');
      box.innerHTML = '<h2>Prima prova tu: ricostruisci la scrittura</h2><p>Le schermate operative, il giornale, i mastrini, i report e le stampe sono temporaneamente oscurati per non anticipare la soluzione.</p><p>Apri il pannello <b>Esercizio passo passo</b>, compila Dare/Avere e importi e premi <b>Verifica la mia scrittura</b>. Dopo un tentativo completo, anche se errato, potrai confrontare i dati. Un clic senza compilazione non sblocca le viste.</p><button type="button" class="lab-btn" id="msa-apri-quiz">Apri l’esercizio</button>';
      lab.parentNode.insertBefore(box, lab);
      box.querySelector('button').onclick = function () {
        var btn = document.querySelector('.msa-g-apri, #msa-guida-apri, [data-guida-apri]');
        if (btn) btn.click();
        var panel = document.querySelector('.msa-guida, #msa-guida'); if (panel) panel.scrollIntoView({block:'start'});
      };
    }
    if (box) box.hidden = !b;
    return b;
  }
  var style = document.createElement('style');
  style.textContent = '.msa-prima-tentativo #lab{display:none!important}#msa-presidio[hidden]{display:none!important}@media print{.msa-prima-tentativo #lab,.msa-prima-tentativo .msa-guida{display:none!important}}';
  document.head.appendChild(style);
  aggiorna();
  ['msa:registrazioni-salvate','msa:quiz-pronto','msa:quiz-aggiornato','storage','focus','pageshow','beforeprint'].forEach(function (e) { window.addEventListener(e, aggiorna); });
  document.addEventListener('DOMContentLoaded', aggiorna);
  window.MSA_PRESIDIO = {aggiorna:aggiorna, bloccato:function(){return blocco(stato());}};
})();
