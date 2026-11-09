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

  // ── 0. diario delle azioni (per il docente: che cosa ha premuto l'allievo e che cosa ha risposto il programma) ──
  var coda = [], timerDiario = null;
  var passoAttuale = function () { try { return typeof window.MSA_PASSO_CORRENTE === 'function' ? String(window.MSA_PASSO_CORRENTE() || '') : ''; } catch (e) { return ''; } };
  var diario = function (tipo, testo) {
    if (!rete || !C.csrf || C.battito === false) return;
    coda.push({tipo: tipo, testo: String(testo || '').replace(/\s+/g, ' ').trim().slice(0, 400), pagina: location.pathname, passo: passoAttuale()});
    if (coda.length > 80) coda.shift();
    clearTimeout(timerDiario); timerDiario = setTimeout(function () { inviaDiario(false); }, 4000);
  };
  var inviaDiario = function (keep) {
    if (!coda.length) return;
    var voci = coda.splice(0, 60), corpo = JSON.stringify({csrf: C.csrf, voci: voci});
    fetch('/api/diario', {method: 'POST', credentials: 'same-origin', keepalive: !!keep && corpo.length < 60000,
      headers: {'Content-Type': 'text/plain;charset=UTF-8', 'X-CSRF': C.csrf}, body: corpo}).catch(function () {});
  };
  window.MSA_DIARIO = diario;
  window.addEventListener('pagehide', function () { inviaDiario(true); });
  diario('pagina', document.title || location.pathname);
  var etichetta = function (el) {
    var t = (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim();
    var box = el.closest && el.closest('[data-prefisso],section,.lab-card,.card,form');
    var h = box && box.querySelector && box.querySelector('h2,h3,h4,legend');
    return (t || '(pulsante)') + (h && h.textContent ? '  ·  riquadro «' + h.textContent.trim().slice(0, 60) + '»' : '');
  };
  var esitiPrima = function () {
    var out = {}, els = document.querySelectorAll('[id$="-esito"], .lab-esito');
    for (var i = 0; i < els.length; i++) out[i] = els[i].textContent;
    return {els: els, testi: out};
  };
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('button, input[type=submit], input[type=button], a.lab-btn, a.msa-btn') : null;
    if (!el || (el.closest && el.closest('#msa-guida'))) return;    // i clic dentro il pannello della guida non servono
    var lab = etichetta(el), prima = esitiPrima();
    diario('clic', lab);
    setTimeout(function () {    // che cosa ha risposto il programma dopo il clic
      var dopo = document.querySelectorAll('[id$="-esito"], .lab-esito');
      for (var i = 0; i < dopo.length; i++) {
        var t = (dopo[i].textContent || '').trim(), era = -1;
        for (var k = 0; k < prima.els.length; k++) if (prima.els[k] === dopo[i]) era = k;
        if (t && (era < 0 || prima.testi[era] !== dopo[i].textContent)) {
          var errore = /\bko\b/.test(dopo[i].className) || /⛔|rifiutat|non (è|si) |errore|manca|bloccat/i.test(t.slice(0, 160));
          diario(errore ? 'errore' : 'esito', t);
        }
      }
    }, 1200);
  }, true);

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

    var locale = get(C.chiave), REV = 'msa-rev-' + C.versione, AZZ = 'msa-azzera-' + C.versione, COPIA = 'msa-copia-' + C.versione;
    // protezione: un lavoro locale vuoto, incompleto o più povero di quello sul server non lo sostituisce, a meno che l'allievo
    // non abbia premuto «Azzera» (segnale AZZ). Il lavoro locale scartato resta in COPIA: niente si perde in silenzio.
    var leggi = function (t) { try { var o = JSON.parse(t); return o && typeof o === 'object' ? o : null; } catch (e) { return null; } };
    var scritture = function (o) { return o && Array.isArray(o.registrazioni) ? o.registrazioni.length : 0; };
    var locSicuro = function () {
      if (!C.stato || get(AZZ) === '1') return true;
      var a = leggi(locale), b = leggi(C.stato);
      if (!a) return false;
      if (!b) return true;
      return (a.lab || null) === (b.lab || null) && scritture(a) >= scritture(b);
    };
    var revVista = parseInt(get(REV) || '0', 10) || 0;
    var daCaricare = false;
    // il lavoro sul server è cambiato altrove (es. il docente ha passato il suo lavoro all'allievo): vince il server
    var cambiatoAltrove = C.stato && C.rev > revVista && revVista > 0;
    if (get(SPORCO) && locale && !cambiatoAltrove && locSicuro()) daCaricare = true;   // modifiche locali non ancora salvate: vincono
    else if (C.stato) {
      if (locale && locale !== C.stato && get(SPORCO)) set(COPIA, locale);       // lavoro locale scartato: lo teniamo da parte
      if (locale !== C.stato) set(C.chiave, C.stato);
      rem(SPORCO); rem(AZZ); set(REV, String(C.rev));
    }
    else if (locale) daCaricare = true;                       // primo accesso con lavoro già nel browser: lo adottiamo

    var timer = null, inVolo = false, ancora = false;
    var invia = function (keep) {
      var dati = get(C.chiave);
      if (!rete || dati == null) return Promise.resolve();
      if (inVolo && !keep) { ancora = true; return Promise.resolve(); }
      inVolo = true;
      var azz = get(AZZ) === '1';
      var corpo = JSON.stringify({csrf: C.csrf, stato: dati, azzera: azz});
      return fetch(C.urlStato, {method: 'POST', credentials: 'same-origin', keepalive: !!keep && corpo.length < 60000,
                                headers: {'Content-Type': 'text/plain;charset=UTF-8', 'X-CSRF': C.csrf}, body: corpo})
        .then(function (r) {
          diario('salvataggio', r.ok ? 'salvato sul server' : (r.status === 409 ? 'RIFIUTATO dal server (409): il lavoro sul server è stato tenuto, quello del browser messo da parte nella copia locale' : 'NON salvato: risposta ' + r.status));
          if (r.ok) { if (get(C.chiave) === dati) { rem(SPORCO); if (azz) rem(AZZ); } return r.json().then(function (j) { if (j && j.rev) set(REV, String(j.rev)); }, function () {}); }
          if (r.status === 409) {        // il server ha protetto un lavoro più completo: ci riallineiamo senza perdere la copia locale
            return r.json().then(function (j) {
              if (j && typeof j.stato === 'string') {
                set(COPIA, dati); set(C.chiave, j.stato); rem(SPORCO); rem(AZZ); if (j.rev) set(REV, String(j.rev));
                avviso('Il tuo lavoro salvato era più completo di questa pagina: è stato ripristinato. Ricarica la pagina.');
              }
            }, function () {});
          }
          if (r.status === 401) avviso('Accesso scaduto: il lavoro resta in questo browser. Rientra per salvarlo sul server.');
        })
        .catch(function () { diario('salvataggio', 'NON salvato: rete assente'); })
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
    // lavoro più avanzato messo da parte in questo browser (dopo un salvataggio rifiutato): si può riprendere con un clic
    (function () {
      var copia = get(COPIA), a = leggi(copia), b = leggi(get(C.chiave));
      if (!a || scritture(a) <= scritture(b)) return;
      diario('salvataggio', 'nel browser c’è una copia più avanzata (' + scritture(a) + ' scritture contro ' + scritture(b) + ')');
      var mostra = function () {
        var d = document.createElement('div');
        d.setAttribute('role', 'alert');
        d.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99999;background:#0B6E4F;color:#fff;padding:12px 18px;border-radius:6px;font:14px Segoe UI,Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.35);max-width:640px';
        d.innerHTML = '🛟 <b>In questo browser c’è un tuo lavoro più avanzato</b> (' + scritture(a) + ' scritture, sul server ' + scritture(b) + '). ' +
          '<button type="button" style="margin-left:8px;background:#fff;color:#0B6E4F;border:0;border-radius:4px;padding:6px 12px;font-weight:700;cursor:pointer">Riprendi questo lavoro</button>' +
          ' <button type="button" style="margin-left:4px;background:transparent;color:#fff;border:1px solid #fff;border-radius:4px;padding:5px 10px;cursor:pointer">No</button>';
        var bs = d.querySelectorAll('button');
        bs[0].onclick = function () { diario('salvataggio', 'ripresa la copia locale più avanzata'); set(C.chiave, copia); set(AZZ, '1'); set(SPORCO, '1'); clearTimeout(timer);
          invia(true).then(function () { location.reload(); }, function () { location.reload(); }); };
        bs[1].onclick = function () { d.remove(); };
        (document.body || document.documentElement).appendChild(d);
      };
      if (document.body) mostra(); else document.addEventListener('DOMContentLoaded', mostra);
    })();
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
