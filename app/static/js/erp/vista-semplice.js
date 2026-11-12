/* VISTA SEMPLICE: attiva da sola; «🔎 Vista completa» la toglie e la scelta resta nel browser.
   Clic su una nota o su un elenco di istruzioni accorciato: si apre per intero. Nessun dato cambia. */
(function () {
  'use strict';
  var KEY = 'msa-vista-completa', root = document.documentElement;
  var completa = function () { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  var applica = function () { root.classList.toggle('msa-vista-semplice', !completa()); };
  applica();
  window.MSA_VISTA_SEMPLICE = function () { return !completa(); };
  function bottone() {
    if (document.querySelector('.msa-vista-btn')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'msa-vista-btn';
    var testo = function () { b.textContent = completa() ? '✨ Vista semplice' : '🔎 Vista completa'; b.title = completa() ? 'Nasconde le spiegazioni lunghe: restano campi e pulsanti' : 'Mostra tutte le spiegazioni sotto i campi e nella guida'; };
    testo();
    b.addEventListener('click', function () {
      try { if (completa()) localStorage.removeItem(KEY); else localStorage.setItem(KEY, '1'); } catch (e) { /* senza memoria resta semplice */ }
      applica(); testo();
      window.dispatchEvent(new CustomEvent('msa:vista'));
    });
    var dx = document.querySelector('.msa-shell .msa-dx');
    if (dx) dx.insertBefore(b, dx.firstChild); else { b.classList.add('flottante'); (document.body || root).appendChild(b); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bottone); else bottone();
  document.addEventListener('click', function (ev) {
    if (!root.classList.contains('msa-vista-semplice')) return;
    var t = ev.target.closest && ev.target.closest('#lab .wms-guida-modulo, #lab .lab-card p.lab-nota, #lab .wms-guida-pagina');
    if (t && !ev.target.closest('a,button,input,select,textarea,summary')) t.classList.toggle('aperta');
  });
})();
