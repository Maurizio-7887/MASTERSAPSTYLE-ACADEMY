/* MASTERSAPSTYLE Academy — finestra «Esercizio passo passo».
   Mostra un passo alla volta dell'esercizio guidato, sopra il simulatore: dove andare, cosa scrivere,
   quale scrittura aspettarsi. I passi si spuntano da soli leggendo i dati del simulatore (STATO),
   quindi la finestra riparte dal punto giusto anche su un altro computer o con il lavoro passato a un allievo.
   I passi senza controllo automatico si spuntano a mano: la spunta resta nello stato (STATO.msaGuida). */
(function () {
  'use strict';
  var E = window.MSA_ESERCIZIO, C = window.MSA_GUIDA;
  if (!E || !C) return;
  var PASSI = E.passi, N = PASSI.length;
  var chiave = C.chiave;
  var POS = 'msa-guida-pos-' + E.codice, APERTA = 'msa-guida-aperta';
  var ss = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } };
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  // ── stato del simulatore ──
  function stato() {
    if (typeof window.MSA_STATO_CORRENTE === 'function') { try { var x = window.MSA_STATO_CORRENTE(); if (x) return x; } catch (e) { /* stato non pronto */ } }   // laboratori
    try { if (typeof STATO !== 'undefined' && STATO) return STATO; } catch (e) { /* pagina senza simulatore */ }
    try { return JSON.parse(localStorage.getItem(chiave) || 'null') || {}; } catch (e) { return {}; }
  }
  function aiutanti(S) {
    var regs = S.registrazioni || [];
    var low = function (x) { return String(x || '').toLowerCase(); };
    var eventi = ((S.fiQuattro || {}).events || []);
    return {
      S: S,
      k: function (p) { p = low(p); return regs.some(function (r) { return low(r.fi && r.fi.key).indexOf(p) === 0; }); },
      t: function (tipo, n) { return regs.filter(function (r) { return r.tipo === tipo; }).length >= (n || 1); },
      d: function (txt, tipo, n) { return regs.filter(function (r) { return (!tipo || r.tipo === tipo) && String(r.descrizione || '').indexOf(txt) >= 0; }).length >= (n || 1); },
      ev: function (ref) { ref = low(ref); return eventi.some(function (e) { return low((e.input || {}).ref) === ref; }) ||
        regs.some(function (r) { return low(r.fi && r.fi.key) === 'quattro:' + ref; }); },
    };
  }
  function manuali(S) { return ((S.msaGuida || {})[E.codice] || {}); }
  function esiti() {
    var S = stato(), h = aiutanti(S), m = manuali(S);
    return PASSI.map(function (p) {
      if (m[p.titolo]) return 'mano';
      if (!p.fatto) return '';
      try { return p.fatto(h) ? 'auto' : ''; } catch (e) { return ''; }
    });
  }
  function segnaAMano(p, valore) {
    var S = stato();
    S.msaGuida = S.msaGuida || {};
    var m = S.msaGuida[E.codice] = S.msaGuida[E.codice] || {};
    if (valore) m[p.titolo] = 1; else delete m[p.titolo];
    if (typeof window.MSA_SALVA_STATO_CORRENTE === 'function') { try { window.MSA_SALVA_STATO_CORRENTE(); return; } catch (e) { /* ripiego */ } }
    try { localStorage.setItem(chiave, JSON.stringify(S)); } catch (e) { /* memoria piena */ }
  }

  // ── interfaccia ──
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var radice = document.createElement('div');
  radice.id = 'msa-guida';
  radice.innerHTML =
    '<button type="button" class="msa-g-apri" aria-expanded="false" title="Esercizio passo passo"><span class="ico">📘</span><span class="txt">Esercizio</span><span class="prog"></span></button>' +
    '<aside class="msa-g-pannello" role="complementary" aria-label="Esercizio passo passo" hidden>' +
      '<header><div><b>📘 Esercizio passo passo</b><small>' + esc(E.titolo) + '</small></div>' +
      '<button type="button" class="msa-g-chiudi" title="Riduci">—</button></header>' +
      '<div class="msa-g-barra"><span></span></div>' +
      '<label class="msa-g-elenco"><span class="vis">Vai al passo</span><select></select></label>' +
      '<div class="msa-g-corpo" aria-live="polite"></div>' +
      '<footer><button type="button" class="msa-g-ind">◀</button><span class="msa-g-num"></span><button type="button" class="msa-g-av">Avanti ▶</button></footer>' +
    '</aside>';
  (document.body || document.documentElement).appendChild(radice);
  var bottone = radice.querySelector('.msa-g-apri'), pannello = radice.querySelector('.msa-g-pannello');
  // anche nella barra blu in alto, ben visibile
  var dx = document.querySelector('.msa-shell .msa-dx');
  if (dx) {
    var b2 = document.createElement('button');
    b2.type = 'button'; b2.className = 'msa-g-shell'; b2.textContent = '📘 Esercizio passo passo';
    b2.addEventListener('click', function () { apri(pannello.hidden); });
    dx.insertBefore(b2, dx.firstChild);
  }
  var corpo = radice.querySelector('.msa-g-corpo'), sel = radice.querySelector('select');
  var barra = radice.querySelector('.msa-g-barra span'), num = radice.querySelector('.msa-g-num'), progB = radice.querySelector('.prog');

  var stati = esiti();
  // il primo passo da fare DOPO l'ultimo già fatto (i passi introduttivi a mano non bloccano chi riprende a metà)
  var primoDaFare = function () {
    var ult = -1; for (var j = 0; j < N; j++) if (stati[j]) ult = j;
    for (var i = ult + 1; i < N; i++) if (!stati[i]) return i;
    for (i = 0; i < N; i++) if (!stati[i]) return i;
    return N - 1;
  };
  var pos = parseInt(ss(POS), 10);
  if (!(pos >= 0 && pos < N)) pos = primoDaFare();
  // arrivo da una lezione «Che situazione hai?»: ?passo=<inizio del titolo> apre la finestra su quel passo
  var richiesto = null;
  try { richiesto = new URLSearchParams(location.search).get('passo'); } catch (e) { richiesto = null; }
  if (richiesto) {
    for (var q = 0; q < N; q++) if (PASSI[q].titolo.indexOf(richiesto) === 0) { pos = q; ss(POS, String(q)); ls(APERTA, '1'); break; }
  }

  function urlPasso(p) {
    var base = (C.url || {})[p.dove && p.dove.ep];
    if (!base) return null;
    if (p.dove.sd) return base + '?sd=' + encodeURIComponent(p.dove.sd);
    if (p.dove.pp) return base + '?pp=' + encodeURIComponent(p.dove.pp);
    return base;
  }
  function suQuestaPagina(p) {
    var u = urlPasso(p);
    if (!u) return true;
    var a = document.createElement('a'); a.href = u;
    return a.pathname === location.pathname;
  }
  function vai(p) {
    var u = urlPasso(p);
    if (!u) return;
    ss(POS, String(pos));
    if (suQuestaPagina(p)) {        // stessa pagina: schermata interna senza ricaricare
      try { if (p.dove.sd && window.SDMM) { window.SDMM.vai(p.dove.sd); return; } if (p.dove.pp && window.PP) { window.PP.vai(p.dove.pp); return; } } catch (e) { /* ricarica */ }
      if (!p.dove.sd && !p.dove.pp) { window.scrollTo({top: 0, behavior: 'smooth'}); return; }
    }
    location.href = u;
  }

  function disegnaElenco() {
    var html = '', gruppo = null;
    PASSI.forEach(function (p, i) {
      if (p.g !== gruppo) { if (gruppo !== null) html += '</optgroup>'; gruppo = p.g; html += '<optgroup label="' + esc(p.g) + '">'; }
      html += '<option value="' + i + '">' + (stati[i] ? '✓ ' : '○ ') + (i + 1) + '. ' + esc(p.titolo) + '</option>';
    });
    sel.innerHTML = html + '</optgroup>';
    sel.value = String(pos);
  }
  function disegna() {
    var p = PASSI[pos], st = stati[pos], fatti = stati.filter(Boolean).length;
    barra.style.width = Math.round(fatti / N * 100) + '%';
    progB.textContent = fatti + '/' + N;
    num.textContent = (pos + 1) + ' / ' + N;
    var qui = suQuestaPagina(p);
    var avvisoCompleto = (C.versione === 'completo' && pos === 0) ? '<div class="msa-g-esito">⚠️ Sei nella versione <b>completa</b>: il preset «Azienda nuova» cancella i dati di esempio. Per l\'esercizio è più comodo la <a href="' + location.pathname.replace('/completo/', '/vuoto/') + '">versione vuota</a>.</div>' : '';
    var h = '<div class="msa-g-gruppo">' + esc(p.g) + '</div>' +
      '<h3>' + (p.data ? '<span class="msa-g-data">' + esc(p.data) + '</span>' : '') + esc(p.titolo) + '</h3>' +
      '<div class="msa-g-dove"><span>📍 ' + esc(p.percorso || '') + '</span>' +
        (urlPasso(p) ? '<button type="button" class="msa-g-vai' + (qui && !p.dove.sd && !p.dove.pp ? ' qui' : '') + '">' + (qui && !p.dove.sd && !p.dove.pp ? 'Sei qui ✓' : 'Apri ➜') + '</button>' : '') + '</div>';
    h += avvisoCompleto;
    if (p.campi && p.campi.length) {
      h += '<table class="msa-g-campi">' + p.campi.map(function (c) {
        return '<tr><th>' + esc(c[0]) + '</th><td><button type="button" class="msa-g-val" title="Clic per copiare">' + esc(c[1]) + '</button></td></tr>';
      }).join('') + '</table>';
    }
    if (p.attesa) h += '<div class="msa-g-attesa"><b>Scrittura / controllo atteso</b>' + esc(p.attesa) + '</div>';
    if (p.nota) h += '<p class="msa-g-nota">💡 ' + esc(p.nota) + '</p>';
    if (st === 'auto') h += '<div class="msa-g-esito ok">✓ Fatto: il programma lo ha già registrato.</div>';
    else if (st === 'mano') h += '<div class="msa-g-esito ok">✓ Segnato come fatto. <button type="button" class="msa-g-togli">togli la spunta</button></div>';
    else if (p.fatto) h += '<div class="msa-g-esito">○ Non ancora registrato: quando confermi, il passo si spunta da solo. <button type="button" class="msa-g-mano">segna fatto a mano</button></div>';
    else h += '<div class="msa-g-esito">○ Questo passo si spunta a mano. <button type="button" class="msa-g-mano">✓ Fatto</button></div>';
    corpo.innerHTML = h;
    radice.querySelector('.msa-g-ind').disabled = pos === 0;
    radice.querySelector('.msa-g-av').textContent = pos === N - 1 ? 'Fine' : (st ? 'Prossimo ▶' : 'Avanti ▶');
    radice.querySelector('.msa-g-av').classList.toggle('pronto', !!st);
    disegnaElenco();
  }
  function vaiA(i, manuale) { pos = Math.max(0, Math.min(N - 1, i)); if (manuale) ss(POS, String(pos)); disegna(); corpo.scrollTop = 0; }

  function apri(si) {
    pannello.hidden = !si;
    bottone.hidden = si;
    bottone.setAttribute('aria-expanded', si ? 'true' : 'false');
    document.documentElement.classList.toggle('msa-guida-aperta', si);
    ls(APERTA, si ? '1' : '0');
    if (si) disegna();
  }

  bottone.addEventListener('click', function () { apri(true); });
  radice.querySelector('.msa-g-chiudi').addEventListener('click', function () { apri(false); });
  radice.querySelector('.msa-g-ind').addEventListener('click', function () { vaiA(pos - 1, true); });
  radice.querySelector('.msa-g-av').addEventListener('click', function () { vaiA(pos + 1, true); });
  sel.addEventListener('change', function () { vaiA(parseInt(sel.value, 10), true); });
  corpo.addEventListener('click', function (e) {
    var t = e.target;
    if (t.classList.contains('msa-g-vai')) vai(PASSI[pos]);
    else if (t.classList.contains('msa-g-mano')) { segnaAMano(PASSI[pos], true); stati = esiti(); disegna(); }
    else if (t.classList.contains('msa-g-togli')) { segnaAMano(PASSI[pos], false); stati = esiti(); disegna(); }
    else if (t.classList.contains('msa-g-val')) {
      var testo = t.textContent;
      var ok = function () { t.classList.add('copiato'); setTimeout(function () { t.classList.remove('copiato'); }, 900); };
      try { navigator.clipboard.writeText(testo).then(ok, function () {}); } catch (er) { /* niente appunti */ }
    }
  });

  // controlla ogni 1,5 s se il passo mostrato è stato registrato: allora passa al successivo
  var avanzando = null;
  setInterval(function () {
    if (pannello.hidden || document.visibilityState === 'hidden') return;
    var prima = stati[pos], nuovi = esiti();
    var cambiato = nuovi.some(function (x, i) { return x !== stati[i]; });
    stati = nuovi;
    if (!cambiato) return;
    disegna();
    if (!prima && stati[pos] && pos < N - 1 && !avanzando) {
      avanzando = setTimeout(function () { avanzando = null; var i = pos + 1; while (i < N - 1 && stati[i]) i++; vaiA(i, true); }, 1400);
    }
  }, 1500);

  apri(ls(APERTA) === '1');
  progB.textContent = stati.filter(Boolean).length + '/' + N;
  window.MSA_GUIDA_API = {stati: function () { return esiti(); }, vaiA: vaiA, apri: apri, passo: function () { return pos; }};
})();
