/* MASTERSAPSTYLE Academy — sincronia del lavoro e misura del tempo di collegamento.
   1. Prima del simulatore: mette in localStorage il lavoro salvato sul server per questo allievo.
   2. Ogni salvataggio del simulatore nel localStorage viene copiato sul server (dopo 1,5 s di quiete).
      Finché il server non conferma resta il segnale «msa-sporco-<versione>»: alla pagina successiva il
      lavoro locale vince e viene ricaricato, quindi cambiare pagina a metà salvataggio non perde nulla.
   3. Battito ogni minuto, solo con la pagina visibile e l'allievo attivo negli ultimi 10 minuti. */
(function () {
  'use strict';
  var C = window.MSA_SYNC;
  if (!C) return;
  var rete = typeof window.fetch === 'function';
  var ls; try { ls = window.localStorage; } catch (e) { ls = null; }

  // ── 1. stato ───────────────────────────────────────────
  if (C.chiave && ls) {
    var SPORCO = 'msa-sporco-' + C.versione, CHI = 'msa-utente';
    var get = function (k) { try { return ls.getItem(k); } catch (e) { return null; } };
    var origSet = Storage.prototype.setItem, origRem = Storage.prototype.removeItem;
    var set = function (k, v) { try { origSet.call(ls, k, v); } catch (e) {} };
    var rem = function (k) { try { origRem.call(ls, k); } catch (e) {} };

    // un altro allievo ha usato questo browser: il suo lavoro locale non è nostro
    var chi = get(CHI);
    if (chi && chi !== String(C.utente)) {
      for (var i = ls.length - 1; i >= 0; i--) {
        var k = ls.key(i);
        if (k && (k.indexOf('ferro-transenne-') === 0 || k.indexOf('msa-sporco-') === 0)) rem(k);
      }
    }
    set(CHI, String(C.utente));

    var locale = get(C.chiave), REV = 'msa-rev-' + C.versione;
    var revVista = parseInt(get(REV) || '0', 10) || 0;
    var daCaricare = false;
    // il lavoro sul server è cambiato altrove (es. il docente ha passato il suo lavoro all'allievo): vince il server
    var cambiatoAltrove = C.stato && C.rev > revVista && revVista > 0;
    if (get(SPORCO) && locale && !cambiatoAltrove) daCaricare = true;   // modifiche locali non ancora salvate: vincono
    else if (C.stato) { if (locale !== C.stato) set(C.chiave, C.stato); rem(SPORCO); set(REV, String(C.rev)); }
    else if (locale) daCaricare = true;                       // primo accesso con lavoro già nel browser: lo adottiamo

    var timer = null, inVolo = false, ancora = false;
    var invia = function (keep) {
      var dati = get(C.chiave);
      if (!rete || dati == null) return Promise.resolve();
      if (inVolo && !keep) { ancora = true; return Promise.resolve(); }
      inVolo = true;
      var corpo = JSON.stringify({csrf: C.csrf, stato: dati});
      return fetch(C.urlStato, {method: 'POST', credentials: 'same-origin', keepalive: !!keep && corpo.length < 60000,
                                headers: {'Content-Type': 'text/plain;charset=UTF-8', 'X-CSRF': C.csrf}, body: corpo})
        .then(function (r) {
          if (r.ok) { if (get(C.chiave) === dati) rem(SPORCO); return r.json().then(function (j) { if (j && j.rev) set(REV, String(j.rev)); }, function () {}); }
          if (r.status === 401) avviso('Accesso scaduto: il lavoro resta in questo browser. Rientra per salvarlo sul server.');
        })
        .catch(function () {})
        .then(function () { inVolo = false; if (ancora) { ancora = false; programma(); } });
    };
    var programma = function () { clearTimeout(timer); timer = setTimeout(function () { invia(false); }, 1500); };
    var toccato = function (k) { if (k === C.chiave) { set(SPORCO, '1'); programma(); } };
    Storage.prototype.setItem = function (k, v) {
      var r = origSet.apply(this, arguments);
      if (this === ls) toccato(k);
      return r;
    };
    Storage.prototype.removeItem = function (k) {
      var r = origRem.apply(this, arguments);
      if (this === ls) toccato(k);
      return r;
    };
    if (daCaricare) { set(SPORCO, '1'); programma(); }
    window.addEventListener('pagehide', function () { if (get(SPORCO)) { clearTimeout(timer); invia(true); } });
    window.MSA_SALVA = function () { clearTimeout(timer); return get(SPORCO) ? invia(true) : Promise.resolve(); };
  }

  // pagine senza simulatore (area allievo, consegna): caricano il lavoro rimasto in sospeso, così la consegna lo comprende
  if (!C.chiave && ls && rete && get0('msa-utente') === String(C.utente)) {
    var sospesi = [];
    for (var j = 0; j < ls.length; j++) { var kk = ls.key(j); if (kk && kk.indexOf('msa-sporco-') === 0) sospesi.push(kk.slice(11)); }
    if (sospesi.length) {
      var tutti = Promise.all(sospesi.map(function (v) {
        var chiave = 'ferro-transenne-fi-2026-' + v + '-civilistico', dati = get0(chiave);
        if (dati == null) return null;
        return fetch('/api/stato/' + encodeURIComponent(v), {method: 'POST', credentials: 'same-origin',
          headers: {'Content-Type': 'text/plain;charset=UTF-8', 'X-CSRF': C.csrf}, body: JSON.stringify({csrf: C.csrf, stato: dati})})
          .then(function (r) { if (!r.ok) return; if (get0(chiave) === dati) ls.removeItem('msa-sporco-' + v);
            return r.json().then(function (j) { if (j && j.rev) ls.setItem('msa-rev-' + v, String(j.rev)); }, function () {}); })
          .catch(function () {});
      }));
      window.MSA_SALVA = function () { return tutti; };
    }
  }
  function get0(k) { try { return ls.getItem(k); } catch (e) { return null; } }

  // prima di uscire si salva
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || !f.classList || !f.classList.contains('msa-esci') || f.__salvato || !window.MSA_SALVA) return;
    e.preventDefault(); f.__salvato = true;
    var fatto = false, vai = function () { if (!fatto) { fatto = true; f.submit(); } };
    window.MSA_SALVA().then(vai, vai); setTimeout(vai, 3000);
  }, true);

  // ── 3. battito ─────────────────────────────────────────
  if (!rete || !C.battito || !C.urlBattito) return;
  var ultimaAttivita = Date.now();
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input'].forEach(function (ev) {
    window.addEventListener(ev, function () { ultimaAttivita = Date.now(); }, {passive: true, capture: true});
  });
  var batti = function () {
    if (document.visibilityState === 'hidden' || Date.now() - ultimaAttivita > 600000) return;
    fetch(C.urlBattito, {method: 'POST', credentials: 'same-origin',
                         headers: {'Content-Type': 'text/plain;charset=UTF-8', 'X-CSRF': C.csrf},
                         body: JSON.stringify({csrf: C.csrf, pagina: location.pathname})})
      .then(function (r) { if (r.status === 401) avviso('Accesso scaduto: rientra per continuare a registrare il tempo.'); })
      .catch(function () {});
  };
  batti();
  setInterval(batti, 60000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { ultimaAttivita = Date.now(); batti(); } });

  var avvisato = false;
  function avviso(t) {
    if (avvisato) return; avvisato = true;
    var d = document.createElement('div');
    d.setAttribute('role', 'alert');
    d.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99999;background:#BB0000;color:#fff;padding:9px 16px;border-radius:4px;font:13px Segoe UI,Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    d.innerHTML = t + ' <a href="/accesso?prossima=' + encodeURIComponent(location.pathname) + '" style="color:#fff;font-weight:700">Accedi</a>';
    (document.body || document.documentElement).appendChild(d);
  }
})();
