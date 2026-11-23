/* Guida luminosa della ragioneria internazionale.
   Fa brillare la casella o il pulsante da usare e mostra una nuvoletta corta: dove siamo, che cosa fare, dove si
   trova nel manuale. NON dà i valori: li mostra solo il pulsante «💡 Guida aggiuntiva», che il server registra
   così il docente vede chi si è fatto aiutare. */
(function () {
  'use strict';
  var G = window.RI_GUIDA;
  if (!G) return;
  var toccati = {}, aiuti = {}, attuale = null, firma = '';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var tab = function (i) { return $$('.ri-tabs a')[i]; };
  var vuoto = function (el) { return !el || !String(el.value || '').trim(); };
  var manuale = function (p) { return p ? '📖 Nel manuale: «' + p + '»' : '📖 Ricalcola con il manuale del modulo'; };

  var bolla = document.createElement('div');
  bolla.id = 'ri-bolla'; bolla.hidden = true; bolla.setAttribute('role', 'status');
  document.body.appendChild(bolla);

  function passo() {
    var p = G.pagina, M = 'Modulo ' + G.n;
    if (p === 'obiettivi') {
      if (G.completo) {
        var cb = $$('input[name="passo"]').filter(function (x) { return !x.checked; })[0];
        if (cb) return {el: cb, dove: M + ' · Obiettivi', fai: '☑️ Spunta questo passo: il modulo è completo', serve: 'Le spunte dicono al docente che cosa hai eseguito davvero.'};
        if ($$('input[name="passo"]').some(function (x) { return toccati[x.name + x.value]; })) return {el: $('form button.msa-btn'), dove: M + ' · Obiettivi', fai: '🖱️ Premi «Salva i passi»', serve: 'Registra le spunte.'};
        if (G.prossimo) return {el: $('.ri-nav a.attivo + a'), dove: M + ' · completo ✓', fai: '🖱️ Passa al modulo successivo', serve: 'Si lavora un modulo alla volta, in ordine.'};
        return null;
      }
      return {el: $('a.msa-btn[href*="manuale"]'), dove: M + ' · Obiettivi', fai: '👀 Leggi gli obiettivi, poi apri il manuale', serve: 'Il manuale spiega la teoria e i numeri che userai nel laboratorio.'};
    }
    if (p === 'manuale') return {el: tab(2), dove: M + ' · Manuale', fai: '👀 Leggi il manuale, poi apri «3 · Laboratorio»', serve: 'Nel laboratorio rifai i calcoli del manuale con le tue mani.'};
    if (p === 'laboratorio') {
      var L = G.lab || [];
      for (var i = 0; i < L.length; i++) {
        var el = $('#f-' + L[i].k), box = el && el.parentNode;
        if (!el || (box && box.classList.contains('giusto'))) continue;
        var rosso = box && box.classList.contains('sbagliato') && !toccati[el.id];
        if (vuoto(el) || rosso) return {el: el, aiuto: {cosa: 'lab', chiave: L[i].k}, dove: M + ' · Laboratorio · risultato ' + (i + 1) + ' di ' + L.length,
          fai: (rosso ? '✗ Da rivedere: ricalcola' : '✍️ Calcola e scrivi') + ' «' + L[i].etichetta + '»', serve: manuale(L[i].paragrafo)};
      }
      if (G.lab_ok) return {el: $('form a.msa-btn[href*="giornale"]') || tab(3), dove: M + ' · Laboratorio ✓', fai: '🖱️ Passa al libro giornale', serve: 'Tutti i risultati sono giusti: ora le scritture.'};
      return {el: $('form button.msa-btn'), dove: M + ' · Laboratorio', fai: '🖱️ Premi «Controlla i risultati»', serve: 'Il server controlla ogni risultato: verde giusto, rosso da rivedere.'};
    }
    if (p === 'giornale') {
      var S = G.scrittura;
      if (!S) return {el: tab(4), dove: M + ' · Libro giornale ✓', fai: '🖱️ Tutte le scritture fatte: apri «5 · Test»', serve: 'Il test chiude il modulo.'};
      var D = M + ' · Scrittura «' + S.titolo + '» (' + (G.scritture_fatte + 1) + ' di ' + G.scritture_tot + ')', ser = manuale(S.paragrafo);
      var led = $('select[name="ledger"]'), rif = $('input[name="riferimento"]'), tes = $('input[name="testo"]');
      if (led && !toccati.ledger) return {el: led, aiuto: {cosa: 'ledger', chiave: ''}, dove: D, fai: '👆 Scegli il ledger: 0L (OIC) o 2L (IFRS)?', serve: '0L = bilancio italiano OIC · 2L = bilancio IFRS del gruppo. Una scrittura comune si registra una volta.'};
      if (vuoto(rif)) return {el: rif, dove: D, fai: '✍️ Scrivi un riferimento, per esempio <code>DOC-' + String(G.scritture_fatte + 1).padStart(3, '0') + '</code>', serve: 'Il numero del documento: serve a ritrovare la scrittura ed evitare doppioni.'};
      if (vuoto(tes)) return {el: tes, aiuto: {cosa: 'testo', chiave: ''}, dove: D, fai: '✍️ Scrivi il testo: che cosa registri?', serve: 'La descrizione che resta nel giornale.'};
      for (var r = 0; r < S.righe; r++) {
        var c = $('select[name="conto' + r + '"]'), da = $('input[name="dare' + r + '"]'), av = $('input[name="avere' + r + '"]');
        if (!c) break;
        if (vuoto(c)) return {el: c, aiuto: {cosa: 'riga', chiave: String(r)}, dove: D + ' · riga ' + (r + 1) + ' di ' + S.righe, fai: '👆 Riga ' + (r + 1) + ': scegli il conto', serve: 'Quale conto si muove con questa operazione? ' + ser};
        if (vuoto(da) && vuoto(av)) return {el: da, aiuto: {cosa: 'riga', chiave: String(r)}, dove: D + ' · riga ' + (r + 1) + ' di ' + S.righe, fai: '✍️ Riga ' + (r + 1) + ': importo in Dare <b>oppure</b> in Avere', serve: 'Il conto aumenta o diminuisce? Se va in Avere lascia vuoto Dare e scrivi nella casella accanto.'};
      }
      return {el: $('form button.msa-btn'), dove: D, fai: '🖱️ Premi «Registra il documento»', serve: 'Il server controlla conti, lati, importi e ledger e ti dice se è la scrittura del manuale.'};
    }
    if (p === 'test') {
      if (G.quiz_ok) return {el: tab(5), dove: M + ' · Test superato ✓', fai: '🖱️ Apri «6 · Valutazione»', serve: 'Lì vedi il voto del docente e fai l’autovalutazione.'};
      // dopo una correzione non superata: brillano le domande sbagliate, una alla volta, finché non cambi risposta
      var sb = $$('fieldset.ri-dom').filter(function (x) { var c = $('label.errata input:checked', x); return c && !toccati['q' + c.name]; })[0];
      if (sb) return {el: sb, dove: M + ' · Test da ripetere', fai: '✗ Risposta sbagliata: scegli quella giusta', serve: 'La correzione ti ha mostrato la risposta giusta (✓): rileggi il perché nel manuale.'};
      var f = $$('fieldset.ri-dom').filter(function (x) { return !$('input:checked', x); })[0];
      if (f) return {el: f, dove: M + ' · Test', fai: '👆 Scegli la risposta giusta', serve: 'Se non sei sicuro, rileggi il manuale: il test si può ripetere.'};
      return {el: $('form button.msa-btn'), dove: M + ' · Test', fai: '🖱️ Premi «Correggi il test»', serve: 'Si supera con almeno 75/100.'};
    }
    if (p === 'valutazione') {
      var v = $$('input[name^="p"]').filter(vuoto)[0];
      if (v) return {el: v, dove: M + ' · Valutazione', fai: '✍️ Dai un punteggio da 0 a 25', serve: 'È la tua autovalutazione: il voto ufficiale lo mette il docente.'};
      if (G.prossimo) return {el: $('.ri-nav a.attivo + a'), dove: M + ' · Valutazione', fai: '🖱️ Passa al modulo successivo', serve: 'Si lavora un modulo alla volta, in ordine.'};
    }
    return null;
  }

  function posiziona(el) {
    var r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight, bw = Math.min(300, W - 16), bh = bolla.offsetHeight || 110, g = 12, top, left, verso;
    if (r.bottom + g + bh <= H - 8) { verso = 'sotto'; top = r.bottom + g; }
    else if (r.top - g - bh >= 8) { verso = 'sopra'; top = r.top - g - bh; }
    else if (r.right + g + bw <= W - 8) { verso = 'destra'; top = Math.max(8, Math.min(r.top, H - bh - 8)); left = r.right + g; }
    else { verso = 'sinistra'; top = Math.max(8, Math.min(r.top, H - bh - 8)); left = Math.max(8, r.left - g - bw); }
    if (left === undefined) left = Math.max(8, Math.min(r.left, W - bw - 8));
    bolla.style.width = bw + 'px'; bolla.style.top = top + 'px'; bolla.style.left = left + 'px';
    bolla.className = verso;
    bolla.style.setProperty('--freccia', Math.max(14, Math.min(bw - 26, r.left + Math.min(r.width / 2, 40) - left)) + 'px');
  }

  function aggiorna() {
    var x = passo();
    $$('.ri-brilla').forEach(function (e) { if (!x || e !== x.el) e.classList.remove('ri-brilla'); });
    if (!x || !x.el) { bolla.hidden = true; attuale = null; return; }
    var chiave = x.dove + '|' + x.fai + '|' + (x.aiuto ? x.aiuto.cosa + x.aiuto.chiave : '');
    x.el.classList.add('ri-brilla');
    var a = x.aiuto && aiuti[x.aiuto.cosa + '|' + x.aiuto.chiave];
    var h = '<div class="ri-gb-dove">📌 ' + esc(x.dove) + '</div><div class="ri-gb-fai">🎯 ' + x.fai + '</div>' +
      (x.serve ? '<div class="ri-gb-serve">🔘 ' + esc(x.serve) + '</div>' : '') +
      (x.aiuto ? (a ? '<div class="ri-gb-aiuto">💡 ' + esc(a) + '</div>' : '<button type="button" class="ri-gb-btn">💡 Guida aggiuntiva</button>') : '');
    if (h !== firma) { bolla.innerHTML = h; firma = h; var b = $('.ri-gb-btn', bolla); if (b) b.onclick = function () { chiediAiuto(x.aiuto, b); }; }
    if (chiave !== attuale) {
      attuale = chiave;
      var rr = x.el.getBoundingClientRect();
      if (rr.top < 60 || rr.bottom > window.innerHeight - 40) try { x.el.scrollIntoView({block: 'center', behavior: 'smooth'}); } catch (e) { /* vecchio browser */ }
    }
    bolla.hidden = false; posiziona(x.el);
  }

  function chiediAiuto(a, btn) {
    btn.disabled = true; btn.textContent = '…';
    var fd = new FormData(); fd.append('csrf', G.csrf); fd.append('cosa', a.cosa); fd.append('chiave', a.chiave);
    fetch(G.url_aiuto, {method: 'POST', body: fd, credentials: 'same-origin'}).then(function (r) { return r.json(); })
      .then(function (j) { aiuti[a.cosa + '|' + a.chiave] = j.testo; firma = ''; aggiorna(); })
      .catch(function () { btn.disabled = false; btn.textContent = '💡 Guida aggiuntiva'; });
  }

  document.addEventListener('input', function (e) { var t = e.target; toccati[t.id || t.name] = true; if (t.type === 'checkbox') toccati[t.name + t.value] = true; setTimeout(aggiorna, 30); });
  document.addEventListener('change', function (e) { var t = e.target; toccati[t.id || t.name] = true; if (t.type === 'radio') toccati['q' + t.name] = true; if (t.type === 'checkbox') toccati[t.name + t.value] = true; setTimeout(aggiorna, 30); });
  window.addEventListener('scroll', function () { if (!bolla.hidden) aggiorna(); }, {passive: true});
  window.addEventListener('resize', aggiorna);
  setInterval(aggiorna, 700);
  aggiorna();
})();
