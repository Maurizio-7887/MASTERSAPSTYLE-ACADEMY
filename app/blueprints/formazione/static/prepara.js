/* «Prepara la situazione nel laboratorio»: esegue il copione fino al passo della lezione, salva sul portale, apre il laboratorio. */
(function () {
  'use strict';
  var b = document.getElementById('prepara');
  if (!b) return;
  var out = document.getElementById('prepara-esito');
  b.addEventListener('click', function () {
    if (!confirm('Il tuo lavoro in questo laboratorio verrà sostituito dalla situazione pronta. Procedere?')) return;
    try {
      var nome = b.dataset.copione, mod = window[nome];
      mod.avvia(window.LAB_CHIAVE);
      var S = window.LabCopioni.esegui(window.LabCopioni[nome], mod, b.dataset.passo);
      out.className = 'lab-esito ok';
      out.innerHTML = '✓ Situazione pronta: ' + S.registrazioni.length + ' scritture. Salvo sul portale e apro il laboratorio…';
      var vai = function () { location.href = b.dataset.url; };
      var salva = window.MSA_SALVA ? window.MSA_SALVA() : Promise.resolve();
      Promise.resolve(salva).then(vai, vai);
      setTimeout(vai, 4000);
    } catch (e) { out.className = 'lab-esito ko'; out.textContent = '⛔ ' + e.message; }
  });
})();
