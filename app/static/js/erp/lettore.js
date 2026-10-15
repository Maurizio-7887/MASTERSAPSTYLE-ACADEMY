/* Lettura dei codici a barre: pistola vera (modalità tastiera: scrive il codice e preme Invio) o fotocamera dello smartphone.
   S4Lettore.campo(input) aggiunge accanto al campo il pulsante 📷: la fotocamera legge Code 128 / QR e scrive nel campo, poi «preme Invio».
   La fotocamera richiede HTTPS (il portale lo è) e il permesso del browser. Libreria html5-qrcode caricata solo al primo uso. */
window.S4Lettore = (function () {
  'use strict';
  var SRC = (document.currentScript && document.currentScript.src || '').replace(/js\/erp\/lettore\.js.*$/, 'vendor/html5-qrcode-2.3.8.min.js');
  var caricata = null, aperto = null;
  function carica() {
    if (window.Html5Qrcode) return Promise.resolve();
    if (caricata) return caricata;
    caricata = new Promise(function (ok, ko) { var s = document.createElement('script'); s.src = SRC; s.onload = ok; s.onerror = function () { ko(Error('Libreria della fotocamera non caricata.')); }; document.head.appendChild(s); });
    return caricata;
  }
  function invio(input) {
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true}));
  }
  function chiudi() { if (!aperto) return; var a = aperto; aperto = null; (a.cam ? a.cam.stop().catch(function () {}) : Promise.resolve()).then(function () { a.box.remove(); }); }
  function apri(input) {
    chiudi();
    var box = document.createElement('div'); box.className = 's4-cam';
    box.innerHTML = '<div class="s4-cam-in"><div class="s4-cam-testa"><b>📷 Inquadra il codice</b><button type="button">✕ Chiudi</button></div><div id="s4-cam-video"></div><p class="s4-cam-nota">Codice a barre o QR dell\'ubicazione o dell\'unità di carico. Tieni il telefono fermo a 15–20 cm.</p></div>';
    document.body.appendChild(box);
    box.querySelector('button').onclick = chiudi;
    aperto = {box: box, cam: null};
    carica().then(function () {
      var cam = new window.Html5Qrcode('s4-cam-video'); aperto.cam = cam;
      return cam.start({facingMode: 'environment'}, {fps: 10, qrbox: function (w, h) { return {width: Math.min(w * 0.85, 320), height: Math.min(h * 0.45, 160)}; }},
        function (testo) { input.value = String(testo).trim(); if (navigator.vibrate) navigator.vibrate(80); chiudi(); input.focus(); invio(input); }, function () {});
    }).catch(function (e) {
      box.querySelector('.s4-cam-nota').textContent = '⛔ Fotocamera non disponibile: ' + (e && e.message || e) + '. Controlla il permesso del browser (serve HTTPS) oppure scrivi il codice a mano.';
    });
  }
  function campo(input) {
    if (!input || input.dataset.lettore) return;
    input.dataset.lettore = '1';
    var b = document.createElement('button'); b.type = 'button'; b.className = 's4-cam-btn'; b.title = 'Leggi con la fotocamera'; b.textContent = '📷';
    b.onclick = function () { apri(input); };
    input.insertAdjacentElement('afterend', b);
  }
  return {campo: campo, apri: apri, chiudi: chiudi};
})();
