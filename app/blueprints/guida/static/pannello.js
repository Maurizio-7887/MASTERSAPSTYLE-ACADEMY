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
  var guidata = E.pannelloAutomatico === true;
  var chiave = C.chiave;
  var quiz = window.MSA_RAGIONERIA;
  // il pannello non crea mai lo stato del simulatore dal nulla: se nel browser non c'è ancora, scriverlo qui lo sostituirebbe con un oggetto incompleto
  function scriviSeEsiste(S) {
    try {
      if (localStorage.getItem(chiave) == null) return;
      var testo = JSON.stringify(S);
      localStorage.setItem(chiave, testo);
      if (copiaLocale && copiaLocale.S === S) copiaLocale.testo = testo;
    } catch (e) { /* memoria piena */ }
  }
  // Pagine senza simulatore (Launchpad, moduli): lo stato si legge dal browser. Va restituito SEMPRE lo stesso
  // oggetto finché il browser non cambia, altrimenti le risposte del laboratorio di ragioneria finivano su una
  // copia diversa da quella salvata: «Verifica la mia scrittura» non registrava nulla e ridisegnava le caselle vuote.
  var copiaLocale = null;
  function inQuiz() { return quiz && quiz.pendente(stato()); }
  function salvaQuiz() {
    if (typeof window.MSA_SALVA_STATO_CORRENTE === 'function') window.MSA_SALVA_STATO_CORRENTE();
    else scriviSeEsiste(stato());
  }
  var POS = 'msa-guida-pos-' + E.codice, APERTA = 'msa-guida-aperta';
  var ss = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return null; } };
  var ls = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  // ── stato del simulatore ──
  function stato() {
    if (typeof window.MSA_STATO_CORRENTE === 'function') { try { var x = window.MSA_STATO_CORRENTE(); if (x) return x; } catch (e) { /* stato non pronto */ } }   // laboratori
    try { if (typeof STATO !== 'undefined' && STATO) return STATO; } catch (e) { /* pagina senza simulatore */ }
    try {
      var testo = localStorage.getItem(chiave);
      if (!copiaLocale || copiaLocale.testo !== testo) copiaLocale = {testo: testo, S: JSON.parse(testo || 'null') || {}};
      return copiaLocale.S;
    } catch (e) { return {}; }
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
    var S = stato(), h = aiutanti(S), m = manuali(S), salvati = C.progress_steps || {};
    var res = PASSI.map(function (p, i) {
      // Il docente può confermare un'operazione già verificata sui documenti,
      // se il validatore automatico non riconosce un vecchio dato legittimo.
      // Questo NON modifica il libro giornale e non permette all'allievo
      // di autoattribuirsi una spunta "docente".
      var nota = ((C.progress_notes || {})[String(i)] || {});
      if (p.cpmVerificato) {
        try { if (p.fatto && p.fatto(h)) return 'auto'; } catch (e) { /* dato storico */ }
        return nota.giudizio === 'ok' ? 'docente' : '';
      }
      if (m[p.titolo] && !(guidata && p.fatto)) return 'mano';
      if (p.fatto) {
        try { if (p.fatto(h)) return 'auto'; } catch (e) { /* dato storico */ }
        return nota.giudizio === 'ok' ? 'docente' : '';
      }
      return nota.giudizio === 'ok' ? 'docente' : '';
    });
    // Letture e controlli (passi senza verifica automatica) già superati non bloccano chi riprende:
    // valgono come confermati se la spunta è salvata sul server o se un'operazione verificata
    // successiva è già stata registrata. Le operazioni ERP restano verificate sui dati reali.
    var ultimoVerificato = -1;
    res.forEach(function (s, i) { if (s === 'auto' || s === 'docente') ultimoVerificato = i; });
    return res.map(function (s, i) {
      var p = PASSI[i];
      if (s || p.fatto || p.cpmVerificato) return s;
      // Firenze e gli altri nuovi percorsi a spunta obbligatoria: vietato
      // inferire una lettura confermata dalla presenza di documenti futuri.
      // La convalida richiede un clic dell'allievo o del docente.
      if (E.codice === 'firenze-30') return s;
      return (i < ultimoVerificato || salvati[p.titolo] === 'mano') ? 'mano' : s;
    });
  }
  function segnaAMano(p, valore) {
    var S = stato();
    S.msaGuida = S.msaGuida || {};
    var m = S.msaGuida[E.codice] = S.msaGuida[E.codice] || {};
    if (valore) m[p.titolo] = 1; else delete m[p.titolo];
    if (typeof window.MSA_SALVA_STATO_CORRENTE === 'function') { try { window.MSA_SALVA_STATO_CORRENTE(); } catch (e) { scriviSeEsiste(S); } }
    else scriviSeEsiste(S);
    stati = esiti();
    programmaProgresso();
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
      '<label class="msa-g-elenco"><span class="vis">Scegli il PASSO dell’esercizio (non il corso)</span><select aria-label="Scegli il passo della tua esercitazione, non il corso"></select></label>' +
      '<div class="msa-g-corpo" aria-live="polite"></div>' +
      '<footer><button type="button" class="msa-g-ind">◀</button><span class="msa-g-num"></span><button type="button" class="msa-g-av">Avanti ▶</button></footer>' +
      '<div class="msa-g-salva-bar" style="padding:8px 12px;border-top:1px solid #ddd;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<button type="button" class="msa-g-salva-ora" style="background:#176c4d;color:white;padding:8px 12px;border:0;border-radius:6px;cursor:pointer">💾 Salva il lavoro fino a qui</button>' +
      '<button type="button" class="msa-g-riprendi-suggeritore" style="background:#fff3c8;color:#554000;padding:8px 12px;border:1px solid #b7a157;border-radius:6px;cursor:pointer">💡 Riattiva suggeritore</button>' +
      '<small class="msa-g-salva-esito" role="status"></small></div>' +
    '</aside>';
  (document.body || document.documentElement).appendChild(radice);
  var bottone = radice.querySelector('.msa-g-apri'), pannello = radice.querySelector('.msa-g-pannello');
  // anche nella barra blu in alto, ben visibile
  var dx = document.querySelector('.msa-shell .msa-dx');
  if (dx && E.codice !== 'firenze-30' && E.codice !== 'magazziniere-5') {
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
    if (guidata) {
      // Recupero progressi storici: alcuni primi passaggi non hanno spunte
      // verificabili, ma i successivi risultano realmente completati.
      // Ripartire dal primo non spuntato avrebbe riportato l'allievo al punto 5.
      var ultimo = -1;
      for (var f = 0; f < N; f++) if (stati[f]) ultimo = f;
      if (ultimo >= 0) return Math.min(N - 1, ultimo + 1);
      for (f = 0; f < N; f++) if (!stati[f]) return f;
      return N - 1;
    }
    var ult = -1; for (var j = 0; j < N; j++) if (stati[j]) ult = j;
    for (var i = ult + 1; i < N; i++) if (!stati[i]) return i;
    for (i = 0; i < N; i++) if (!stati[i]) return i;
    return N - 1;
  };
  // Il server vince sulle vecchie sessioni: un progresso salvato su PostgreSQL
  // non deve tornare al punto 5 quando la scheda viene chiusa.
  var serverPos = C.progress && Number(C.progress.posizione);
  // Il titolo resta stabile anche se nuovi passaggi vengono inseriti prima della riapertura.
  // La vecchia posizione numerica non è affidabile se è cambiato il numero totale.
  var titoloSalvato = C.progress && C.progress.titolo;
  var matchSalvato = titoloSalvato ? PASSI.findIndex(function(p) {
    return p.titolo === titoloSalvato && (!C.progress.gruppo || p.g === C.progress.gruppo);
  }) : -1;
  var pos = matchSalvato >= 0 ? matchSalvato :
    (C.progress && Number(C.progress.totale) === N && Number.isInteger(serverPos) && serverPos >= 0 && serverPos < N
      ? serverPos : parseInt(ss(POS), 10));
  if (!(pos >= 0 && pos < N)) pos = primoDaFare();
  // Ripresa dopo un salvataggio seguito subito da un cambio di pagina.
  if (guidata && stati[pos]) {
    // Riprendi un passo completato solo se TUTTI i precedenti sono validati.
    // Non perdere comunque il checkpoint di un allievo con dati storici.
    var precedenteMancante = -1;
    for (var z = 0; z < pos; z++) if (!stati[z]) { precedenteMancante = z; break; }
    if (precedenteMancante < 0) while (pos < N - 1 && stati[pos]) pos++;
    ss(POS, String(pos));
  }
  // Checkpoint didattico separato dalle registrazioni del simulatore.
  // Non inseriamo il cursore nel JSON contabile: cambiare pagina non cancella mai il lavoro.
  var progressTimer = null, lastSignature = '', sendingProgress = false, pendingProgress = false;
  function progressBody() {
    return JSON.stringify({
      csrf: C.progress_csrf, versione: C.progress_version || C.versione,
      posizione: pos, totale: N,
      passi: PASSI.map(function (p, i) {
        return {titolo: p.titolo || '', gruppo: p.g || '', stato: stati[i] || ''};
      })
    });
  }
  window.MSA_PASSO_CORRENTE = function () { return (pos + 1) + '. ' + (PASSI[pos] ? PASSI[pos].titolo : ''); };
  function trasmettiProgresso(keep) {
    if (!C.progress_url || !C.progress_csrf || !window.fetch) return;
    if (sendingProgress) { pendingProgress = true; return; }
    var body = progressBody();
    if (body === lastSignature) return;
    sendingProgress = true;
    fetch(C.progress_url, {method: 'POST', credentials: 'same-origin',
      headers: {'Content-Type': 'application/json', 'X-CSRF': C.progress_csrf},
      body: body, keepalive: !!keep}).then(function (r) {
      if (r.ok) lastSignature = body;
    }).catch(function () { /* Il checkpoint locale rimane fino al prossimo invio. */ })
    .then(function () {
      sendingProgress = false;
      if (pendingProgress) { pendingProgress = false; programmaProgresso(); }
    });
  }
  function programmaProgresso() {
    clearTimeout(progressTimer);
    progressTimer = setTimeout(function () { trasmettiProgresso(false); }, 250);
  }
  window.addEventListener('pagehide', function () {
    clearTimeout(progressTimer);
    trasmettiProgresso(true);
  });
  ss(POS, String(pos));
  // arrivo da una lezione «Che situazione hai?»: ?passo=<inizio del titolo> apre la finestra su quel passo
  var richiesto = null;
  try { richiesto = new URLSearchParams(location.search).get('passo'); } catch (e) { richiesto = null; }
  if (richiesto) {
    for (var q = 0; q < N; q++) if (PASSI[q].titolo.indexOf(richiesto) === 0) {
      // I deep-link didattici non scavalcano un passo mai completato.
      var primoNonSpuntato = -1;
      for (var z = 0; z < q; z++) if (!stati[z]) { primoNonSpuntato = z; break; }
      if (q <= pos || primoNonSpuntato < 0) { pos = q; ss(POS, String(q)); }
      ls(APERTA + '-' + E.codice, '1');
      break;
    }
  }

  function urlPasso(p) {
    var base = (C.url || {})[p.dove && p.dove.ep];
    if (!base) return null;
    var url = new URL(base, location.href);
    if (p.dove.esercizio) url.searchParams.set('esercizio', p.dove.esercizio);
    if (p.dove.sd) url.searchParams.set('sd', p.dove.sd);
    if (p.dove.pp) url.searchParams.set('pp', p.dove.pp);
    // La selezione esplicita appartiene alla scheda del corso, non alla
    // sessione condivisa con altre schede del docente.
    if (E.codice === 'magazziniere-5' || E.codice === 'firenze-30')
      url.searchParams.set('esercizio_guida', E.codice);
    return url.href;
  }
  // Arrivando dal pulsante del corso, riprendi direttamente sulla schermata
  // del passo salvato. Nessuna seconda scelta, nessuna modifica al database
  // e nessuna navigazione forzata durante il normale uso del simulatore.
  if ((E.codice === 'magazziniere-5' || E.codice === 'firenze-30') &&
      new URLSearchParams(location.search).get('riprendi') === '1') {
    ls(APERTA + '-' + E.codice, '1');
    var destinazioneRipresa = urlPasso(PASSI[pos]);
    if (destinazioneRipresa) {
      var paginaRipresa = new URL(destinazioneRipresa, location.href);
      if (paginaRipresa.pathname !== location.pathname) {
        paginaRipresa.searchParams.set('esercizio_guida', E.codice);
        location.replace(paginaRipresa.href);
      }
    }
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

  // BLOCCO UNICO DI AVANZAMENTO: nessun passo successivo senza la spunta.
  // Le operazioni ERP si spuntano dai dati effettivi; le sole letture richiedono
  // conferma esplicita; la ricostruzione in partita doppia resta obbligatoria.
  function statoAggiornato() {
    stati = esiti();
    return stati;
  }
  function primoBlocco(fino, lista) {
    lista = lista || statoAggiornato();
    for (var i = 0; i < fino; i++) if (!lista[i]) return i;
    return -1;
  }
  function puoAvanzareDa(i) {
    return !!(statoAggiornato()[i] && !inQuiz());
  }
  function avvisoBlocco(indice) {
    var p = PASSI[indice], esercizio = inQuiz();
    var msg = esercizio ?
      'Prima completa e verifica la scrittura in partita doppia. Non ripetere l’acquisto già registrato.' :
      p.fatto ? 'Il sistema non ha ancora riconosciuto questa attività come completata. Controlla nel modulo il documento e il salvataggio effettivo; se è già presente, avvisa il docente senza rifare l’operazione.' :
      'Questo passo è di lettura o controllo: completa la verifica e premi «✓ Fatto» prima di proseguire.';
    var es = corpo.querySelector('.msa-g-blocco');
    if (!es) {
      es = document.createElement('div');
      es.className = 'msa-g-esito msa-g-blocco';
      es.setAttribute('role','alert');
      corpo.insertBefore(es, corpo.firstChild);
    }
    es.textContent = '⛔ Non puoi passare al livello successivo: ' + msg;
    if (window.MSA_DIARIO) window.MSA_DIARIO('errore', 'Tutor blocca: passo ' + (indice + 1) + ' «' + (PASSI[indice] || {}).titolo + '» senza spunta');
    if (indice < pos) es.appendChild(bottoneMancante(indice));
  }
  // ── Sistemare un passo rimasto indietro e poi tornare dove si era ──
  // «Vai al passo X» porta al passo senza spunta e ricorda il punto di partenza;
  // quando tutti i passi prima di quel punto hanno la ✓ si torna lì da soli (o con «Torna al passo»).
  var RIT = 'msa-guida-ritorno-' + E.codice;
  function ritornoAttivo() {
    var r = parseInt(ls(RIT), 10);
    return (r >= 0 && r < N && r > pos) ? r : -1;
  }
  function bottoneMancante(i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'msa-g-vai-mancante'; b.setAttribute('data-i', String(i));
    b.textContent = '➜ Vai al passo ' + (i + 1) + ' e sistemalo (poi torni qui)';
    b.style.cssText = 'display:block;margin-top:8px;background:#1f3a5f;color:#fff;border:0;border-radius:6px;padding:8px 12px;cursor:pointer;font-weight:600';
    return b;
  }
  function vaiAlMancante(i) {
    i = Math.max(0, Math.min(N - 1, Number(i) || 0));
    if (i >= pos) return;
    ls(RIT, String(Math.max(pos, ritornoAttivo())));
    pos = i;
    ss(POS, String(pos)); programmaProgresso(); disegna(); corpo.scrollTop = 0;
  }
  function tornaAlRitorno() {
    var r = ritornoAttivo();
    if (r < 0) return false;
    var m = primoBlocco(r);
    if (m >= 0 && m !== pos) { pos = m; ss(POS, String(pos)); programmaProgresso(); disegna(); corpo.scrollTop = 0; return true; }
    if (m >= 0) return false;
    ls(RIT, '-1');
    pos = r; ss(POS, String(pos)); programmaProgresso(); disegna(); corpo.scrollTop = 0;
    return true;
  }
  function disegnaElenco() {
    var html = '', gruppo = null, primaMancante = -1;
    var attuali = statoAggiornato(), quizAperto = !!inQuiz();
    PASSI.forEach(function (p, i) {
      if (p.g !== gruppo) { if (gruppo !== null) html += '</optgroup>'; gruppo = p.g; html += '<optgroup label="' + esc(p.g) + '">'; }
      // I passi completati in passato restano consultabili; quelli futuri
      // sono disponibili solo quando tutti i precedenti hanno la spunta.
      var accessibile = i <= pos || (primaMancante < 0 && !quizAperto);
      html += '<option value="' + i + '"' + (!accessibile ? ' disabled' : '') + '>' +
        (stati[i] ? '✓ ' : '○ ') + (i + 1) + '. ' + esc(p.titolo) +
        (!accessibile ? ' · BLOCCATO' : '') + '</option>';
      if (!attuali[i] && primaMancante < 0) primaMancante = i;
    });
    sel.innerHTML = html + '</optgroup>';
    sel.value = String(pos);
  }
  function disegna() {
    var p = PASSI[pos], st = stati[pos], fatti = stati.filter(Boolean).length;
    barra.style.width = Math.round(fatti / N * 100) + '%';
    progB.textContent = fatti + '/' + N;
    num.textContent = (pos + 1) + ' / ' + N;
    var pendente = inQuiz();
    sel.disabled = !!pendente;
    radice.querySelector('.msa-g-ind').disabled = !!pendente || pos === 0;
    radice.querySelector('.msa-g-av').disabled = !!pendente || !st || pos === N - 1 || primoBlocco(pos, stati) >= 0;
    if (pendente) {
      corpo.innerHTML = '<button type="button" class="msa-g-vai-saldi">📒 Non ricordi un saldo? Apri i saldi dei conti e i tuoi appunti ↓</button>' + quiz.html(stato(), esc) + strumenti(true);
      ripristinaFuoco();
      num.textContent = 'Laboratorio di ragioneria';
      disegnaElenco();
      return;
    }
    var qui = suQuestaPagina(p);
    var avvisoCompleto = (C.versione === 'completo' && pos === 0) ? '<div class="msa-g-esito">⚠️ Sei nella versione <b>completa</b>: il preset «Azienda nuova» cancella i dati di esempio. Per l\'esercizio è più comodo la <a href="' + location.pathname.replace('/completo/', '/vuoto/') + '">versione vuota</a>.</div>' : '';
    var h = '<div class="msa-g-gruppo">' + esc(p.g) + '</div>' +
      '<h3>' + (p.data ? '<span class="msa-g-data">' + esc(p.data) + '</span>' : '') + esc(p.titolo) + '</h3>' +
      '<div class="msa-g-dove"><span>📍 ' + esc(p.percorso || '') + '</span>' +
        (urlPasso(p) ? '<button type="button" class="msa-g-vai' + (qui && !p.dove.sd && !p.dove.pp ? ' qui' : '') + '">' + (qui && !p.dove.sd && !p.dove.pp ? 'Sei qui ✓' : 'Apri ➜') + '</button>' : '') + '</div>';
    h += avvisoCompleto;
    // Per Firenze e Pistoia i collegamenti a teoria e UF9 sono nella
    // barra didattica della pagina ERP. Qui il tutor mostra solo il passo.
    if (p.principiante) {
      // Lezione parlata per chi non ha mai utilizzato un gestionale.
      // La guida spiega, ma le spunte reali restano governate dai dati ERP.
      var corsoMagazzino = E.codice === 'magazziniere-5' || E.codice === 'firenze-30';
      var introPrincipiante = pos === 0 ?
        (corsoMagazzino
          ? '<p><b>Sei già nell’esercitazione del corso selezionato.</b> Non tornare al Launchpad. Se vedi «Sei qui ✓», segui i campi indicati nel riquadro «ORA TOCCA A TE». Se non vedi i campi, premi «Apri ➜» nella guida. Se questo account contiene un’altra azienda, non azzerarla: usa un account dedicato.</p>'
          : '<p><b>Prima di cominciare:</b> entra nel tuo esercizio e segui i comandi indicati. Non azzerare i dati esistenti.</p>') : '';
      h += '<div class="msa-g-principiante" role="region" aria-label="Guida per chi inizia da zero">' +
        '<strong>👣 PRIMA VOLTA? UNA COSA ALLA VOLTA</strong>' + introPrincipiante +
        '<ol>' +
        '<li><b>DOVE LAVORO?</b> ' + (corsoMagazzino ? 'Sei nel corso giusto. <b>Resta nell’esercitazione</b>; premi «Apri ➜» solo per raggiungere la schermata del comando, mai per tornare al Launchpad.' : 'Segui la schermata del passo: <em>' + esc(p.percorso || p.titolo) + '</em>. Premi «Apri ➜» se necessario.') + '</li>' +
        '<li><b>CHE COSA DEVO FARE?</b> Nel riquadro giallo <b>«ORA TOCCA A TE»</b> trovi il primo campo da compilare, il valore e il pulsante. Completa un punto prima di passare al successivo.</li>' +
        '<li><b>PERCHÉ LO FACCIO?</b> ' + esc(p.grande || ('Stai completando la fase «' + p.titolo + '».')) + '</li>' +
        '<li><b>COME VERIFICO?</b> Dopo il comando controlla il messaggio del programma e il risultato atteso. Una registrazione reale riceve la <b>spunta ✓ automatica</b>; soltanto per una lettura puoi premere <b>✓ Fatto</b>.</li>' +
        '<li><b>SE MI BLOCCO?</b> Rileggi il campo richiesto, apri la pagina giusta e correggi l’errore. <b>Non ripetere un movimento già salvato e non azzerare i dati</b>; se il documento esiste, chiedi al docente di verificare.</li>' +
        '</ol></div>';
    }
    // Passi del budget: una cosa alla volta. In cima c'è solo l'azione da fare adesso; tutto il resto è a scomparsa.
    var focus = !st && !pendente && p.regole && p.regole.length && p.punti && p.punti.length && ls('msa-g-suggeritore') !== 'no';
    var inizioResto = h.length;
    if (p.regole && p.regole.length) {
      var reg = '<div class="msa-g-regole-t">⚠️ PASSO DEL BUDGET · SEGUI ESATTAMENTE QUESTE REGOLE</div><ol class="msa-g-regole">' + p.regole.map(function (r) {
        return '<li><span class="ic">' + esc(r[0]) + '</span><div><b>' + esc(r[1]) + '</b><small>PERCHÉ: ' + esc(r[2]) + '</small></div></li>'; }).join('') + '</ol>';
      h += st ? '<details class="msa-g-regole-box"><summary>⚠️ Regole di questo passo (già fatto)</summary>' + reg + '</details>' : '<div class="msa-g-regole-box">' + reg + '</div>';
    }
    var aMano = !st && !p.fatto && !p.cpmVerificato && !pendente;
    if (aMano) h += '<div class="msa-g-spunta-qui">✋ <b>Questo passo lo spunti tu.</b> Quando hai letto o controllato, premi il pulsante verde: <button type="button" class="msa-g-mano msa-g-mano-grande">✓ Fatto</button><small>oppure «✓ Fatto, avanti ▶» in fondo al riquadro</small></div>';
    var diagHtml = '';
    if (!st && typeof p.diagnosi === 'function') {
      var diag = [];
      try { diag = p.diagnosi(aiutanti(stato())) || []; } catch (e) { diag = []; }
      if (diag.length) h += diagHtml = '<div class="msa-g-diagnosi"><b>🔎 Che cosa manca per la spunta (controllo sui tuoi dati)</b><ul>' + diag.map(function (d) {
        return '<li class="' + (d[0] ? 'ok' : 'no') + '">' + (d[0] ? '✅ ' : '❌ ') + esc(d[1]) + '</li>'; }).join('') + '</ul><small>Si aggiorna da solo appena salvi.</small></div>';
    }
    if (p.punti && p.punti.length) h += '<div class="msa-g-ora-c"></div>';
    var tabellaCampi = (p.campi && p.campi.length) ? '<table class="msa-g-campi">' + p.campi.map(function (c) {
        return '<tr><th>' + esc(c[0]) + '</th><td><button type="button" class="msa-g-val" title="Clic per copiare">' + esc(c[1]) + '</button></td></tr>';
      }).join('') + '</table>' : '';
    // Passi contabili: soluzione e spiegazioni sulla scrittura restano nascoste finché l'allievo non registra e ricostruisce la partita doppia
    var nascosto = E.verificaRagioneria && p.contabile && !st;
    if (p.grande) h += '<div class="msa-g-grande"><span>A CHE COSA SERVE QUESTO PASSO</span>' + esc(p.grande) + '</div>';
    if (p.mappa) h += mappaHtml(p.mappa);
    if (p.fai && !(p.punti && p.punti.length)) {
      // versione semplice: in una frase, cosa fai (clic per clic), cosa devi vedere; il resto a scomparsa
      if (p.idea && !p.grande) h += '<p class="msa-g-idea">' + esc(p.idea) + '</p>';
      var spunte = spunteDi(p), nFatte = 0;
      var righeFai = p.fai.map(function (f, k) {
        if (f && f.fai) {           // riga punto per punto: dove guardare, che cosa fare, valore da copiare; si spunta
          var si = !!spunte[k]; if (si) nFatte++;
          return '<li class="msa-g-punto' + (si ? ' fatto' : '') + '"><label><input type="checkbox" class="msa-g-spunta" data-k="' + k + '"' + (si ? ' checked' : '') + '>' +
            '<span><small>📍 ' + esc(f.dove) + '</small><b>' + esc(f.fai) + '</b></span></label>' +
            (f.valore ? '<button type="button" class="msa-g-val msa-g-grosso" title="Clic per copiare">' + esc(f.valore) + '</button>' : '') + '</li>';
        }
        return Array.isArray(f) ? '<li>' + esc(f[0]) + ' <button type="button" class="msa-g-val" title="Clic per copiare">' + esc(f[1]) + '</button></li>' : '<li>' + esc(f) + '</li>';
      }).join('');
      var punti = p.fai.some(function (f) { return f && f.fai; });
      h += '<div class="msa-g-fai"><b>👉 Cosa fai, una cosa alla volta</b>' + (punti ? '<small class="msa-g-conta">Spunta ogni riga quando l’hai fatta: ' + nFatte + ' di ' + p.fai.length + '</small>' : '') + '<ol>' + righeFai + '</ol></div>';
      if (p.vedi && p.vedi.length) h += '<div class="msa-g-vedi"><b>✅ Cosa devi vedere</b><ul>' + p.vedi.map(function (v) { return '<li>' + esc(v) + '</li>'; }).join('') + '</ul></div>';
      var spiega = (p.perche ? '<p>' + esc(p.perche) + '</p>' : '') + (p.attesa && !nascosto ? '<p>' + esc(p.attesa) + '</p>' : '') + (p.nota ? '<p>💡 ' + esc(p.nota) + '</p>' : '');
      if (spiega) h += '<details class="msa-g-piu"><summary>📖 Perché? Da dove vengono i numeri</summary>' + spiega + '</details>';
      if (tabellaCampi) h += '<details class="msa-g-piu"><summary>🔎 Tutti i dati del passo (valori da copiare)</summary>' + tabellaCampi + '</details>';
    } else {
      h += tabellaCampi;
      if (p.attesa && !nascosto) h += '<div class="msa-g-attesa"><b>Scrittura / controllo atteso</b>' + esc(p.attesa) + '</div>';
    }
    if (p.dopo && !nascosto) h += '<p class="msa-g-nota">📒 ' + esc(p.dopo) + '</p>';
    if (nascosto) h += '<div class="msa-g-esito">✍️ Registra l’operazione nel programma: poi qui a destra ricostruirai tu la scrittura in partita doppia (conto, Dare/Avere, importo). La soluzione compare solo dopo il tuo tentativo.</div>';
    if (p.nota && !p.fai) h += '<p class="msa-g-nota">💡 ' + esc(p.nota) + '</p>';
    if (st === 'auto') h += '<div class="msa-g-esito ok">✓ Fatto: il programma lo ha già registrato.</div>';
    else if (st === 'docente') h += '<div class="msa-g-esito ok">✓ Verificato dal docente sui documenti dell’allievo. Nessuna seconda registrazione necessaria.</div>';
    else if (st === 'mano') h += '<div class="msa-g-esito ok">✓ Segnato come fatto. <button type="button" class="msa-g-togli">togli la spunta</button></div>';
    else if (p.fatto) h += '<div class="msa-g-esito">○ Non ancora registrato: quando confermi, il passo si spunta da solo.' + (guidata ? ' Il pannello mostrerà automaticamente il passaggio successivo.' : ' <button type="button" class="msa-g-mano">segna fatto a mano</button>') + '</div>';
    else h += '<div class="msa-g-esito">○ Questo passo si spunta a mano. <button type="button" class="msa-g-mano">✓ Fatto</button></div>';
    var notaDocente = (C.progress_notes || {})[String(pos)] || {};
    if (notaDocente.nota || notaDocente.giudizio) {
      var didascalia = notaDocente.giudizio === 'da_correggere' ? '⚠️ Correzione del docente' :
        notaDocente.giudizio === 'ok' ? '✅ Verificato dal docente' : '📝 Nota del docente';
      h += '<div class="msa-g-esito' + (notaDocente.giudizio === 'ok' ? ' ok' : '') +
        '" role="status"><b>' + didascalia + '</b><p>' +
        esc(notaDocente.nota || 'Controlla questo passaggio.') + '</p></div>';
    }
    if (focus) {
      var testa = h.slice(0, inizioResto), resto = h.slice(inizioResto).replace('<div class="msa-g-ora-c"></div>', '').replace(diagHtml, '');
      h = testa + '<div class="msa-g-ora-c"></div>' + diagHtml +
        '<details class="msa-g-tutto"><summary>📘 Tutte le istruzioni e le regole di questo passo</summary>' + resto + '</details>';
    }
    corpo.classList.toggle('msa-g-focus', !!focus);
    corpo.innerHTML = h + strumenti(false);
    radice.querySelector('.msa-g-ind').disabled = pos === 0;
    radice.querySelector('.msa-g-av').textContent = pos === N - 1 ? 'Fine' : (st ? 'Prossimo ▶' : 'Avanti ▶');
    var mancaPrima = primoBlocco(pos, stati);
    radice.querySelector('.msa-g-av').disabled = !st || pos === N - 1 || mancaPrima >= 0;
    var avBtn = radice.querySelector('.msa-g-av');
    avBtn.removeAttribute('data-mano');
    if (!st && !p.fatto && !p.cpmVerificato && pos < N - 1 && mancaPrima < 0) {
      avBtn.textContent = '✓ Fatto, avanti ▶'; avBtn.disabled = false; avBtn.setAttribute('data-mano', '1');
    }
    if(mancaPrima >= 0) {
      var warning = document.createElement('div');
      warning.className = 'msa-g-esito';
      warning.setAttribute('role', 'status');
      warning.textContent = '⛔ Manca la spunta al passo ' + (mancaPrima + 1) + ' («' +
        PASSI[mancaPrima].titolo + '»). Devi completarlo o farlo verificare al docente prima di proseguire.';
      if (mancaPrima < pos) warning.appendChild(bottoneMancante(mancaPrima));
      corpo.insertBefore(warning, corpo.firstChild);
    }
    var rit = ritornoAttivo();
    if (rit >= 0) {
      var box = document.createElement('div');
      box.className = 'msa-g-esito msa-g-ritorno';
      box.setAttribute('role', 'status');
      box.style.cssText = 'background:#fff6e0;border:1px solid #e0c27a';
      box.innerHTML = '🔧 <b>Stai sistemando un passo rimasto senza spunta.</b> Rifai o completa questo passo: appena ha la ✓ ti riporto al passo ' +
        (rit + 1) + ', dove eri arrivata/o.<br><button type="button" class="msa-g-torna" style="margin-top:8px;background:#b8892b;color:#fff;border:0;border-radius:6px;padding:8px 12px;cursor:pointer;font-weight:600">↩ Torna al passo ' +
        (rit + 1) + '</button>';
      corpo.insertBefore(box, corpo.firstChild);
    }
    if(!st && p.fatto) {
      var esito = corpo.querySelector('.msa-g-esito');
      if(esito) esito.textContent = '🔍 Il tutor verifica l’operazione realmente registrata. «Avanti» si sblocca soltanto quando il passo ha la spunta ✓. Se la registrazione esiste già, non ripeterla: chiedi al docente di controllare i dati.';
    }
    radice.querySelector('.msa-g-av').classList.toggle('pronto', !!st);
    disegnaElenco();
    firmaPunti = ''; tickPunti(true);
  }
  // spunte delle righe «Cosa fai» (per scheda del browser): aiutano a non perdere il segno, non cambiano lo stato
  function spunteDi(p) { try { return JSON.parse(ss('msa-g-punti-' + E.codice + '-' + (p.id || p.titolo)) || '{}'); } catch (e) { return {}; } }
  function spunta(p, k, si) { var x = spunteDi(p); if (si) x[k] = 1; else delete x[k]; ss('msa-g-punti-' + E.codice + '-' + (p.id || p.titolo), JSON.stringify(x)); }

  // ── mappa delle tappe (es. ciclo CPM e budget): dove sei, a che cosa serve, che cosa porta alla tappa dopo ──
  function mappaHtml(m) {
    var t = m.tappe, i = m.attuale, cur = t[i];
    var elenco = '<ol class="msa-g-tappe">' + t.map(function (x, k) {
      return '<li class="' + (k < i ? 'fatta' : k === i ? 'qui' : '') + '"><b>' + esc(x.nome) + '</b>' + (k === i ? ' ← sei qui' : '') + '<br><small>' + esc(x.serve) + '</small></li>';
    }).join('') + '</ol>';
    if (i < 0) return '<div class="msa-g-mappa"><b>🗺️ La mappa: ' + t.length + ' tappe</b>' + elenco + '</div>';
    return '<div class="msa-g-mappa"><b>🗺️ Tappa ' + (i + 1) + ' di ' + t.length + ' · ' + esc(cur.nome) + '</b>' +
      '<p><b>A cosa serve:</b> ' + esc(cur.serve) + '</p><p><b>Che cosa ottieni:</b> ' + esc(cur.porta) + (t[i + 1] ? ' Poi: ' + esc(t[i + 1].nome) + '.' : '') + '</p>' +
      '<details><summary>Vedi tutta la mappa</summary>' + elenco + '</details></div>';
  }

  // ── saldi dei conti e appunti: per il bilancio e la chiusura non serve ricordare i valori a memoria ──
  var T = {aperto: ss('msa-g-tools') === '1', cerca: ss('msa-g-tools-cerca') || '', data: ss('msa-g-tools-data') || '', senzaChiusura: ss('msa-g-tools-sc') === '1'};
  var ultimoCampo = null;                       // ultima casella del laboratorio toccata: {riga, tipo}
  var GRUPPI = [['ATTIVO', 'Attività', 1], ['PASSIVO', 'Passività e patrimonio netto', -1], ['COSTO', 'Costi', 1], ['RICAVO', 'Ricavi', -1], ['RETTIFICA', 'Rettifiche di ricavi (sconti, resi, abbuoni): si sottraggono ai ricavi', -1], ['CHIUSURA', 'Conti di chiusura', 1], ['ALTRO', 'Altri conti', 1]];
  var euroIt = function (n) { return Number(n).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}); };
  function registrazioniVisibili(S) {
    var regs = quiz && quiz.visibili ? quiz.visibili(S) : (S.registrazioni || []);
    return regs;
  }
  function dataPredefinita(S, inQuizOra) {
    var q = inQuizOra && quiz.pendente(S);
    if (q && q.documento && q.documento.data) return String(q.documento.data).slice(0, 10);
    return registrazioniVisibili(S).reduce(function (m, r) { return r.data && r.data > m ? r.data : m; }, '').slice(0, 10);
  }
  function saldi(S, fino) {
    var piano = {}, out = {};
    (S.pianoDeiConti || []).forEach(function (c) { piano[String(c.codice)] = c; });
    registrazioniVisibili(S).forEach(function (r) {
      if (fino && r.data && r.data.slice(0, 10) > fino) return;
      if (T.senzaChiusura && r.chiusura) return;
      (r.righe || []).forEach(function (x) {
        var k = String(x.conto), v = Math.round(Number(x.importo || 0) * 100) * (x.dareAvere === 'DARE' ? 1 : -1);
        out[k] = (out[k] || 0) + v;
      });
    });
    return Object.keys(out).filter(function (k) { return out[k] !== 0; }).map(function (k) {
      var c = piano[k] || {};
      var rett = (c.tipo === 'RICAVO') && (k === '47' || k === '49');   // sconti, resi e abbuoni su vendite non sono ricavi: li riducono
      return {codice: k, nome: c.nome || c.descrizione || 'Conto ' + k, tipo: rett ? 'RETTIFICA' : (c.tipo || 'ALTRO'), saldo: out[k] / 100};
    }).sort(function (a, b) { return a.codice.localeCompare(b.codice, 'it', {numeric: true}); });
  }
  function tabellaSaldi(inQuizOra) {
    var S = stato(), fino = T.data || dataPredefinita(S, inQuizOra), elenco = saldi(S, fino);
    var f = T.cerca.toLocaleLowerCase('it').trim();
    var mostra = elenco.filter(function (c) { return !f || (c.codice + ' ' + c.nome).toLocaleLowerCase('it').indexOf(f) >= 0; });
    var tot = {}, h = '';
    elenco.forEach(function (c) { tot[c.tipo] = (tot[c.tipo] || 0) + c.saldo; });
    GRUPPI.forEach(function (g) {
      var righe = mostra.filter(function (c) { return (GRUPPI.some(function (x) { return x[0] === c.tipo; }) ? c.tipo : 'ALTRO') === g[0]; });
      if (!righe.length) return;
      h += '<tr class="msa-g-tgr"><th colspan="2">' + g[1] + '</th><th>' + euroIt(g[2] * (tot[g[0]] || 0)) + '</th></tr>';
      righe.forEach(function (c) {
        var lato = c.saldo > 0 ? 'D' : 'A';
        h += '<tr><td><button type="button" class="msa-g-ins-conto" data-v="' + esc(c.codice + ' · ' + c.nome) + '" title="Inserisci il conto nella casella del laboratorio (o copia)">' + esc(c.codice) + '</button></td>' +
          '<td>' + esc(c.nome) + '</td><td class="n"><button type="button" class="msa-g-ins-imp" data-v="' + euroIt(Math.abs(c.saldo)) + '" title="Inserisci l’importo nella casella del laboratorio (o copia)">' + euroIt(Math.abs(c.saldo)) + '</button> <small>' + lato + '</small></td></tr>';
      });
    });
    var costi = tot.COSTO || 0, ricavi = -((tot.RICAVO || 0) + (tot.RETTIFICA || 0));
    var dare = elenco.reduce(function (s, c) { return s + (c.saldo > 0 ? c.saldo : 0); }, 0), avere = elenco.reduce(function (s, c) { return s + (c.saldo < 0 ? -c.saldo : 0); }, 0);
    var riepilogo = '<div class="msa-g-riep">Costi <b>' + euroIt(costi) + '</b> · Ricavi <b>' + euroIt(ricavi) + '</b> · ' + (ricavi - costi >= 0 ? 'Utile' : 'Perdita') + ' <b>' + euroIt(Math.abs(ricavi - costi)) + '</b><br>' +
      'Totale saldi Dare <b>' + euroIt(dare) + '</b> · Avere <b>' + euroIt(avere) + '</b>' + (Math.abs(dare - avere) < 0.005 ? ' ✓ quadra' : ' ⚠️ non quadra') + '</div>';
    return riepilogo + (h ? '<table class="msa-g-saldi">' + h + '</table>' : '<p class="msa-g-nota">Nessun conto con saldo' + (f ? ' per «' + esc(T.cerca) + '»' : '') + ' fino al ' + esc(fino) + '.</p>');
  }
  function appunti() { var S = stato(); return ((S.msaAppunti || {})[E.codice]) || ''; }
  var timerAppunti = null;
  function salvaAppunti(testo) {
    var S = stato();
    S.msaAppunti = S.msaAppunti || {};
    S.msaAppunti[E.codice] = testo;
    clearTimeout(timerAppunti);
    timerAppunti = setTimeout(function () {
      if (typeof window.MSA_SALVA_STATO_CORRENTE === 'function') { try { window.MSA_SALVA_STATO_CORRENTE(); return; } catch (e) { /* ripiego */ } }
      scriviSeEsiste(S);
    }, 700);
  }
  function strumenti(inQuizOra) {
    // il contenuto si disegna solo quando la sezione è aperta: le caselle del laboratorio restano le uniche visibili
    return '<details class="msa-g-tools"' + (T.aperto ? ' open' : '') + '><summary>📒 Saldi dei conti e appunti</summary><div class="msa-g-tcorpo">' +
      (T.aperto ? contenutoStrumenti(inQuizOra) : '') + '</div></details>';
  }
  function contenutoStrumenti(inQuizOra) {
    var S = stato(), fino = T.data || dataPredefinita(S, inQuizOra);
    return '<p class="msa-g-nota">I saldi di tutti i conti alla data scelta, letti dal tuo libro giornale' + (inQuizOra ? ' (senza la scrittura che stai ricostruendo)' : '') + '. ' +
      (inQuizOra ? 'Clic su un codice o su un importo: va nell’ultima casella del laboratorio che hai toccato.' : 'Clic su un valore per copiarlo.') + '</p>' +
      '<div class="msa-g-tfiltri"><label>Fino al <input type="date" class="msa-g-tdata" value="' + esc(fino) + '"></label>' +
      '<label><input type="checkbox" class="msa-g-tsc"' + (T.senzaChiusura ? ' checked' : '') + '> senza chiusura</label></div>' +
      '<input type="search" class="msa-g-tcerca" placeholder="Cerca conto: codice o nome (es. 80, banca, ricavi)…" value="' + esc(T.cerca) + '">' +
      '<div class="msa-g-tsaldi">' + tabellaSaldi(inQuizOra) + '</div>' +
      '<label class="msa-g-tapp"><b>📝 I miei appunti</b> <small>(restano salvati con il tuo lavoro)</small><textarea class="msa-g-appunti" rows="6" placeholder="Es. totale costi 2026 = …; IRES …; da ricontrollare …">' + esc(appunti()) + '</textarea></label>';
  }
  function apriStrumenti(d) {
    var c = d.querySelector('.msa-g-tcorpo');
    if (d.open && c && !c.firstChild) c.innerHTML = contenutoStrumenti(!!inQuiz());
  }
  function aggiornaSaldi() { var d = corpo.querySelector('.msa-g-tsaldi'); if (d) d.innerHTML = tabellaSaldi(!!inQuiz()); }
  function ripristinaFuoco() { /* la casella scelta resta memorizzata come riga e tipo: niente da fare qui */ }
  function inserisci(valore, tipo) {
    var cella = ultimoCampo && ultimoCampo.tipo === tipo && corpo.querySelector('.msa-q-riga[data-riga="' + ultimoCampo.riga + '"] .msa-q-' + tipo);
    if (cella && !cella.disabled) {
      cella.value = valore;
      cella.dispatchEvent(new Event('change', {bubbles: true}));
      cella.classList.add('msa-g-riempito'); setTimeout(function () { cella.classList.remove('msa-g-riempito'); }, 900);
      return true;
    }
    try { navigator.clipboard.writeText(valore); } catch (er) { /* niente appunti */ }
    return false;
  }
  corpo.addEventListener('focusin', function (e) {
    var t = e.target, r = t.closest && t.closest('.msa-q-riga');
    if (r && (t.classList.contains('msa-q-conto') || t.classList.contains('msa-q-importo'))) ultimoCampo = {riga: r.getAttribute('data-riga'), tipo: t.classList.contains('msa-q-conto') ? 'conto' : 'importo'};
  });
  corpo.addEventListener('toggle', function (e) {
    if (e.target.classList && e.target.classList.contains('msa-g-tools')) { T.aperto = e.target.open; ss('msa-g-tools', T.aperto ? '1' : '0'); apriStrumenti(e.target); }
  }, true);
  corpo.addEventListener('input', function (e) {
    var t = e.target;
    if (t.classList.contains('msa-g-tcerca')) { T.cerca = t.value; ss('msa-g-tools-cerca', T.cerca); aggiornaSaldi(); }
    else if (t.classList.contains('msa-g-appunti')) salvaAppunti(t.value);
  });

  function vaiA(i, manuale) {
    i = Math.max(0, Math.min(N - 1, Number(i) || 0));
    if (i > pos) {
      // La verifica viene rifatta ORA, non ci fidiamo della spunta mostrata
      // in una sessione precedente né di un tasto "Avanti" disabilitato via DOM.
      var mancante = primoBlocco(i);
      if (mancante >= 0 || inQuiz()) {
        // Ridisegna PRIMA di inserire l'avviso: non farlo sparire.
        disegna();
        avvisoBlocco(mancante >= 0 ? mancante : pos);
        return false;
      }
    }
    pos = i;
    ss(POS, String(pos)); programmaProgresso(); disegna(); corpo.scrollTop = 0;
    return true;
  }

  function apri(si) {
    pannello.hidden = !si;
    bottone.hidden = si;
    bottone.setAttribute('aria-expanded', si ? 'true' : 'false');
    document.documentElement.classList.toggle('msa-guida-aperta', si);
    ls(guidata ? APERTA + '-' + E.codice : APERTA, si ? '1' : '0');
    if (si) disegna();
  }

  radice.querySelector('.msa-g-riprendi-suggeritore').addEventListener('click', function () {
    ls('msa-g-suggeritore', 'si');
    firmaPunti = '';
    ultimoPunto = '';
    soppressa = '';
    disegna();
    tickPunti(true);
    var label = radice.querySelector('.msa-g-salva-esito');
    label.textContent = 'Suggeritore riattivato. Apri il passo del budget per i campi evidenziati.';
  });
  radice.querySelector('.msa-g-salva-ora').addEventListener('click', function () {
    var button = this, label = radice.querySelector('.msa-g-salva-esito');
    button.disabled = true;
    label.textContent = 'Salvataggio in corso…';
    ss(POS, String(pos));
    var p = window.MSA_SALVA ? window.MSA_SALVA() : Promise.resolve();
    Promise.resolve(p).then(function () {
      trasmettiProgresso(false);
      // Il salvataggio contabile è normalmente automatico sul server: verifichiamo lo stato GET.
      if (!window.fetch || !C.progress_version) throw Error('Controlla la connessione e riprova.');
      return fetch('/api/stato/' + encodeURIComponent(C.progress_version), {credentials:'same-origin',cache:'no-store'});
    }).then(function (r) {
      if (!r.ok) throw Error('Il server non ha confermato il salvataggio.');
      return r.json();
    }).then(function (data) {
      if (!data || !data.stato) throw Error('Lavoro non ancora presente sul server.');
      var remoto = JSON.parse(data.stato), locale = stato();
      var nRemoto = (remoto.registrazioni || []).length, nLocale = (locale.registrazioni || []).length;
      if (nRemoto < nLocale) throw Error('Salvataggio in attesa: ' + nRemoto + '/' + nLocale + ' scritture sul server.');
      if (JSON.stringify(remoto) !== JSON.stringify(locale)) {
        throw Error('Il server contiene una versione differente del lavoro. Riprova il salvataggio prima di uscire.');
      }
      label.textContent = '✓ Lavoro verificato sul server (' + nRemoto + ' scritture). Puoi uscire.';
    }).catch(function (e) {
      label.textContent = '⚠ ' + e.message + ' Non chiudere senza verificare.';
    }).then(function () { button.disabled = false; });
  });
  bottone.addEventListener('click', function () { apri(true); });
  radice.querySelector('.msa-g-chiudi').addEventListener('click', function () { apri(false); });
  radice.querySelector('.msa-g-ind').addEventListener('click', function () { vaiA(pos - 1, true); });
  radice.querySelector('.msa-g-av').addEventListener('click', function () {
    if (this.getAttribute('data-mano') === '1' && !inQuiz()) { segnaAMano(PASSI[pos], true); stati = esiti(); }
    vaiA(pos + 1, true);
  });
  sel.addEventListener('change', function () {
    var precedente = pos, scelto = parseInt(sel.value, 10);
    if (!vaiA(scelto, true)) sel.value = String(precedente);
  });
  corpo.addEventListener('click', function (e) {
    var t = e.target;
    if (t.classList.contains('msa-g-vai-mancante')) { vaiAlMancante(t.getAttribute('data-i')); return; }
    if (t.classList.contains('msa-g-torna')) {
      if (!tornaAlRitorno()) avvisoBlocco(pos);
      return;
    }
    if (t.classList.contains('msa-g-vai-saldi')) {
      var d = corpo.querySelector('details.msa-g-tools');
      if (d) { d.open = true; T.aperto = true; ss('msa-g-tools', '1'); apriStrumenti(d); if (d.scrollIntoView) d.scrollIntoView({behavior: 'smooth', block: 'start'}); }
      return;
    }
    if (t.classList.contains('msa-g-ins-conto') || t.classList.contains('msa-g-ins-imp')) {
      var ok = inserisci(t.getAttribute('data-v'), t.classList.contains('msa-g-ins-conto') ? 'conto' : 'importo');
      t.classList.add('copiato'); t.setAttribute('data-esito', ok ? 'inserito' : 'copiato');
      setTimeout(function () { t.classList.remove('copiato'); }, 900);
      return;
    }
    if (inQuiz()) {
      if (quiz.click(t, corpo, stato(), salvaQuiz)) { disegna(); if (!inQuiz()) riprendi(); }
      return;
    }
    if (t.classList.contains('msa-g-vai')) vai(PASSI[pos]);
    else if (t.classList.contains('msa-g-mano')) {
      segnaAMano(PASSI[pos], true);
      // Prima aggiornavamo "stati" dentro segnaAMano e poi chiamavamo
      // aggiorna(): non rilevava differenze e il pulsante Avanti restava
      // disabilitato anche se la spunta era stata salvata.
      stati = esiti();
      disegna();
    }
    else if (t.classList.contains('msa-g-togli')) { segnaAMano(PASSI[pos], false); stati = esiti(); disegna(); }
    else if (t.classList.contains('msa-g-val')) {
      var testo = t.textContent;
      var ok = function () { t.classList.add('copiato'); setTimeout(function () { t.classList.remove('copiato'); }, 900); };
      try { navigator.clipboard.writeText(testo).then(ok, function () {}); } catch (er) { /* niente appunti */ }
    }
  });

  corpo.addEventListener('change', function (e) {
    var t = e.target;
    if (t.classList.contains('msa-g-spunta')) { spunta(PASSI[pos], t.getAttribute('data-k'), t.checked); var y = corpo.scrollTop; disegna(); corpo.scrollTop = y; return; }
    if (t.classList.contains('msa-g-tdata')) { T.data = t.value; ss('msa-g-tools-data', T.data); aggiornaSaldi(); return; }
    if (t.classList.contains('msa-g-tsc')) { T.senzaChiusura = t.checked; ss('msa-g-tools-sc', t.checked ? '1' : '0'); aggiornaSaldi(); return; }
    if (t.classList.contains('msa-g-appunti') || t.classList.contains('msa-g-tcerca')) return;
    if (inQuiz()) quiz.bozza(corpo, stato(), salvaQuiz);
  });
  function riprendi() {
    stati = esiti();
    if (guidata && stati[pos] && primoBlocco(pos, stati) < 0) {
      while (pos < N - 1 && stati[pos]) pos++;
      ss(POS, String(pos));
    }
    programmaProgresso();
    disegna();
  }
  window.addEventListener('msa:registrazioni-salvate', function () {
    if (!inQuiz()) return;
    apri(true);
    disegna();
    corpo.scrollTop = 0;
  });
  // Conferme, spunte di lettura e ripresa pagina usano la stessa verifica.
  // Non cambia pagina da solo: mostra il passo seguente e il relativo pulsante Apri.
  var avanzando = null;
  function aggiorna() {
    if (document.visibilityState === 'hidden') return;
    if (inQuiz()) { if (pannello.hidden) apri(true); return; }
    var prima = stati[pos], nuovi = esiti();
    var cambiato = nuovi.some(function (x, i) { return x !== stati[i]; });
    stati = nuovi;
    if (!cambiato) return;
    programmaProgresso();
    if (pannello.hidden) return;
    disegna();
    if (!prima && stati[pos] && ritornoAttivo() >= 0) { tornaAlRitorno(); return; }
    if (guidata && !prima && stati[pos] && pos < N - 1) {
      var prossimo = pos + 1;
      while (prossimo < N - 1 && stati[prossimo]) prossimo++;
      vaiA(prossimo, true);
      return;
    }
    if (!prima && stati[pos] && pos < N - 1 && !avanzando) {
      avanzando = setTimeout(function () { avanzando = null; var i = pos + 1; while (i < N - 1 && stati[i]) i++; vaiA(i, true); }, 1400);
    }
  }
  setInterval(aggiorna, guidata ? 700 : 1500);
  if (guidata) {
    document.addEventListener('click', function (e) {
      if (!radice.contains(e.target)) setTimeout(aggiorna, 0);
    });
    document.addEventListener('submit', function () { setTimeout(aggiorna, 0); });
    window.addEventListener('storage', aggiorna);
  }

  apri(inQuiz() ? true : guidata ? ls(APERTA + '-' + E.codice) !== '0' : ls(APERTA) === '1');
  progB.textContent = stati.filter(Boolean).length + '/' + N;
  // Salva anche la posizione ritrovata dalla vecchia sessionStorage al primo accesso.
  programmaProgresso();

  // ══ GUIDA PUNTO PER PUNTO ══
  // Un passo può avere p.punti: elenco ordinato dei punti in cui l'allievo deve scrivere, scegliere o premere.
  // Ogni punto: {t:'campo'|'scelta'|'pulsante'|'leggi', sel:'selettore CSS nella pagina', valore:'cosa scrivere/scegliere',
  //   nome:'come si chiama il campo', serve:'a cosa serve', fatto:function(h,el){…} (facoltativo, legge lo stato), ctx:function(){…} (il campo vale solo se…)}.
  // Il PRIMO punto non ancora fatto fa «brillare» il bordo del campo reale, con un fumetto («Scrivi 36000 — serve a…») e il riquadro «Ora tocca a te» nel pannello.
  var firmaPunti = '', ultimoPunto = '', bolla = document.createElement('div');
  // Suggeritore giallo: acceso di default; chi non ne ha bisogno lo spegne (resta spento finché non lo riaccende).
  var SUGG = 'msa-g-suggeritore', suggSpento = function () { return ls(SUGG) === 'no'; };
  // la nuvoletta sparisce appena l'allievo scrive nel punto indicato (o preme Invio/Tab/il pulsante) e non ricompare per quel punto;
  // quella del punto successivo arriva dopo un attimo, per non coprire subito gli altri campi
  var soppressa = '', mostraDopo = 0, chiaveCorrente = '';
  function nascondiBolla() { soppressa = chiaveCorrente; bolla.hidden = true; }
  bolla.id = 'msa-g-bolla'; bolla.hidden = true; (document.body || document.documentElement).appendChild(bolla);
  var salta = {}, clic = {};
  function chiaveP(p, k) { return E.codice + '|' + (p.id || p.titolo) + '|' + k; }
  function memP(nome) { try { return JSON.parse(ss('msa-g-' + nome) || '{}'); } catch (e) { return {}; } }
  function segnaP(nome, key) { var m = memP(nome); m[key] = 1; ss('msa-g-' + nome, JSON.stringify(m)); }
  function numeroP(v) {
    var t = String(v == null ? '' : v).trim().replace(/\s/g, ''); if (!t) return null;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(',', '.');
    var n = Number(t); return isFinite(n) ? n : null;
  }
  function ugualeP(a, b) { var x = numeroP(a), y = numeroP(b); if (x !== null && y !== null) return Math.abs(x - y) < 1e-9; return String(a).trim().toLowerCase() === String(b).trim().toLowerCase(); }
  function trovaP(sel) {
    var els; try { els = document.querySelectorAll(sel); } catch (e) { return null; }
    for (var i = 0; i < els.length; i++) if (!radice.contains(els[i]) && els[i].getBoundingClientRect) return els[i];
    return null;
  }
  function fattoP(p, d, k, el, h) {
    var key = chiaveP(p, k);
    if (!p.cpmVerificato && memP('salta')[key]) return true;
    if (d.finale && stati[pos]) return true;
    if (d.fatto) { try { if (d.fatto(h, el)) return true; } catch (e) { /* stato non pronto */ } }
    // Per il CPM un pulsante NON equivale a un salvataggio. Il suo esito
    // deve essere verificato sul modello di calcolo persistito.
    if (p.cpmVerificato && d.t === 'pulsante') return false;
    if (d.solo === 'stato' || (p.cpmVerificato && d.richiedeSalvataggio)) return false;
    if (d.t === 'leggi' || d.controlla) return !!memP('letto')[key];   // controlla: la casella può contenere già il valore giusto, lo conferma l'allievo
    if (!el) return false;
    if (d.ctx) { try { if (!d.ctx()) return false; } catch (e) { return false; } }
    if (d.t === 'campo' || d.t === 'scelta') return d.valore !== undefined && ugualeP(el.value, d.valore);
    return !!memP('clic')[key];
  }
  function vis(d) { if (d.mostra !== undefined) return d.mostra; var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d.valore)); return m ? m[3] + '/' + m[2] + '/' + m[1] : d.valore; }
  function tipoLabel(d) { return d.t === 'campo' ? '✍️ Scrivi' : d.t === 'scelta' ? '👆 Scegli' : d.t === 'pulsante' ? '🖱️ Premi' : '👀 Leggi'; }
  function spegniPunti() {
    var a = document.querySelectorAll('.msa-g-brilla'); for (var i = 0; i < a.length; i++) a[i].classList.remove('msa-g-brilla');
    bolla.hidden = true; ultimoPunto = '';
  }
  function posizionaBolla(el) {
    if (!el || !document.body.contains(el) || bolla.hidden) return;
    var r = el.getBoundingClientRect(), bw = Math.min(330, window.innerWidth - 16), bh = bolla.offsetHeight || 70;
    bolla.style.width = bw + 'px';
    var sotto = r.bottom + bh + 20 < window.innerHeight, sopra = !sotto && r.top - bh - 12 > 56, top = sopra ? r.top - bh - 12 : Math.min(r.bottom + 12, window.innerHeight - bh - 8);
    var maxL = window.innerWidth - bw - (pannello.hidden ? 8 : 400);
    bolla.style.top = Math.max(8, top) + 'px'; bolla.style.left = Math.max(8, Math.min(r.left, maxL)) + 'px';
    bolla.className = sopra ? 'sopra' : (sotto ? 'sotto' : '');
    bolla.style.setProperty('--freccia', Math.max(14, Math.min(bw - 24, r.left + r.width / 2 - parseFloat(bolla.style.left))) + 'px');
  }
  function segnaGruppiSalvati(elenco) {
    var salvatoDopo = false;
    for (var z = elenco.length - 1; z >= 0; z--) {
      var x = elenco[z];
      if (x.d.t === 'pulsante') salvatoDopo = !!x.fatto;
      else if (salvatoDopo) x.fatto = true;
    }
    return elenco;
  }
  // Che cosa NON fare in questa azione e perché (passi del budget): scritto chiaro, una riga
  function attenzioneDi(d) {
    if (d.attenzione) return d.attenzione;
    var v = d.valore === undefined ? '' : String(vis(d));
    if (d.t === 'campo') {
      if (d.controlla) return 'Se nella casella c’è già ' + v + ' non toccarla. Se c’è un altro numero, scrivi ' + v + ': un numero diverso cambia il costo della transenna e poi il passo 24 ti blocca.';
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(v) || /^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Usa esattamente questa data: con un’altra data il programma rifiuta l’operazione o la mette nel mese sbagliato.';
      if (/^[A-ZÀ-Ú]{3,}$/.test(v)) return 'Scrivi esattamente «' + v + '», tutto maiuscolo: è la parola di conferma, con un’altra parola il pulsante non fa niente.';
      if (/^-?[\d.,]+$/.test(v)) return 'Scrivi esattamente ' + v + ' e nient’altro: un numero diverso cambia il costo della transenna e poi il passo 24 ti blocca.';
      return 'Scrivi esattamente quello che vedi qui sopra.';
    }
    if (d.t === 'scelta') return 'Scegli esattamente «' + v + '»: con un’altra voce scrivi nel posto sbagliato e il passo non si spunta.';
    if (d.t === 'pulsante') return 'Premilo una volta sola, dopo aver controllato i valori: è lui che salva. Se cambi pagina, centro o versione prima di premerlo, quello che hai scritto si perde.';
    return '';
  }
  function tickPunti(forza) {
    if (!bolla) return;   // il motore parte dopo il primo disegno: il primo giro lo fa il timer
    var p = PASSI[pos], c = corpo.querySelector('.msa-g-ora-c');
    if (!p || !p.punti || !c || pannello.hidden || inQuiz()) { if (!p || !p.punti || pannello.hidden || inQuiz()) spegniPunti(); return; }
    if (suggSpento()) {
      spegniPunti(); firmaPunti = 'spento';
      if (!c.querySelector('.msa-g-sugg-on')) c.innerHTML = '<div class="msa-g-ora spento"><button type="button" class="msa-g-sugg-on lab-btn sec">💡 Riaccendi il suggeritore giallo</button><small>Il suggeritore è spento: restano il testo del passo e «Cosa devi vedere».</small></div>';
      tickPunti.el = null; tickPunti.k = -1; return;
    }
    var h = aiutanti(stato()), elenco = p.punti.map(function (d, k) {
      var el = d.sel ? trovaP(d.sel) : null, ok = fattoP(p, d, k, el, h), key = chiaveP(p, k);
      if (ok && !memP('ok')[key] && !p.cpmVerificato) segnaP('ok', key);
      // I controlli CPM con esito di stato non si possono scavalcare con
      // un vecchio flag di sessione: se il dato cambia tornano da correggere.
      return {d:d,k:k,el:el,fatto: p.cpmVerificato ? ok : (ok || !!memP('ok')[key])};
    });
    // Nei passi CPM la scelta del centro e le caselle valgono finché il loro salvataggio è verificato:
    // senza questo, dopo aver salvato 4210 e scelto 4220 il tutor richiedeva di nuovo 4210 (e così via, all'infinito).
    if (p.cpmVerificato) segnaGruppiSalvati(elenco);
    var primo = -1; for (var i = 0; i < elenco.length; i++) if (!elenco[i].fatto) { primo = i; break; }
    var ora = primo < 0 ? null : elenco[primo];
    var esitoErrore = '';
    if (p.cpmVerificato && ora && ora.d.t==='pulsante' && ora.el) {
      var mod=ora.el.closest && ora.el.closest('[data-prefisso]');
      var esito=mod && document.getElementById(mod.getAttribute('data-prefisso')+'-esito');
      if(esito && /\\bko\\b/.test(esito.className)) esitoErrore=(esito.textContent||'').trim();
    }
    var firma = pos + '|' + (ora ? ora.k + (ora.el ? 'e' : 'x') : 'fine') + '|' + elenco.map(function (x) { return x.fatto ? 1 : 0; }).join('') + '|' + esitoErrore;
    if (firma !== firmaPunti || forza) {
      firmaPunti = firma;
      var fatti = elenco.filter(function (x) { return x.fatto; }).length;
      var h2 = '<div class="msa-g-ora"><div class="msa-g-ora-t">🎯 ' + (ora ? 'ORA TOCCA A TE' : 'TUTTI I PUNTI FATTI') + '<small>punto ' + Math.min(fatti + 1, elenco.length) + ' di ' + elenco.length + '</small></div>' +
        '<div class="msa-g-ora-barra"><span style="width:' + Math.round(fatti / elenco.length * 100) + '%"></span></div>';
      if (ora) {
        var d = ora.d;
        h2 += '<button type="button" class="msa-g-sugg-off" title="Per chi non ne ha bisogno: lo puoi riaccendere quando vuoi">🙈 Spegni il suggeritore</button>';
        if (p.regole && p.regole.length) h2 += '<div class="msa-g-ora-num">AZIONE ' + Math.min(fatti + 1, elenco.length) + ' DI ' + elenco.length + '</div>';
        h2 += '<div class="msa-g-ora-azione">' + tipoLabel(d) + (d.nome ? ' · <b>' + esc(d.nome) + '</b>' : '') + '</div>';
        if (d.valore !== undefined && d.t !== 'pulsante') h2 += '<div class="msa-g-ora-val"><button type="button" class="msa-g-val msa-g-grosso" title="Clic per copiare">' + esc(vis(d)) + '</button><small>' + (d.t === 'campo' ? (d.controlla ? 'controlla la casella che brilla: se non c’è già, scrivilo tu' : 'scrivilo tu nella casella che brilla (clic per copiarlo)') : 'scegli questa voce nell’elenco che brilla') + '</small></div>';
        if (d.t === 'pulsante') h2 += '<div class="msa-g-ora-val"><small>Premi il pulsante che brilla' + (d.nome ? ': «' + esc(d.nome) + '»' : '') + '.</small></div>';
        h2 += '<div class="msa-g-ora-serve"><b>💡 Perché lo fai</b>' + esc(d.serve || '') + '</div>';
        if (p.regole && p.regole.length) { var att = attenzioneDi(d); if (att) h2 += '<div class="msa-g-ora-attenzione">⚠️ ' + esc(att) + '</div>'; }
        if (!ora.el && d.t !== 'leggi') h2 += '<div class="msa-g-ora-dove">📍 Non vedo ancora questa schermata: premi <b>«Apri ➜»</b> qui sopra, poi la casella comincerà a brillare.</div>';
        if (d.t === 'leggi' || d.controlla) h2 += '<button type="button" class="msa-g-letto lab-btn" data-k="' + ora.k + '">' + (d.controlla ? '✓ Ho verificato la casella' : '✓ Ho letto, vai avanti') + '</button>';
        // Nessun pulsante "salta" nel percorso obbligatorio: i dettagli
        // di lettura si confermano, le operazioni si verificano nel gestionale.
        if (p.cpmVerificato && d.t === 'pulsante') h2 += '<div class="msa-g-ora-dove">🔍 Dopo il clic controllo il modello salvato. Se non coincide, correggi i campi indicati e ripeti il salvataggio; la spunta non può sostituire questo controllo.</div>';
        if (esitoErrore) h2 += '<div class="msa-g-ora-correzione"><b>⛔ Il salvataggio è stato rifiutato.</b> '+esc(esitoErrore)+'<div>Correggi i dati del riquadro evidenziato e premi di nuovo il pulsante. Non si passa al comando successivo finché il modello non è salvato.</div></div>';
        if (p.cpmVerificato && (d.t === 'campo' || d.t === 'scelta') && ora.el && d.valore !== undefined && !ugualeP(ora.el.value,d.valore))
          h2 += '<div class="msa-g-ora-correzione">⚠️ Valore trovato: <b>'+esc(ora.el.value)+'</b>. Valore richiesto: <b>'+esc(vis(d))+'</b>. Correggi nel campo evidenziato e salva con il pulsante previsto.</div>';
      } else h2 += '<div class="msa-g-ora-serve">Ora controlla qui sotto «Cosa devi vedere» e passa al passo successivo.</div>';
      h2 += '<details class="msa-g-ora-elenco"><summary>Tutti i punti di questo passo</summary><ol>' + elenco.map(function (x) {
        return '<li class="' + (x.fatto ? 'fatto' : x === ora ? 'adesso' : '') + '">' + (x.fatto ? '✓ ' : '') + tipoLabel(x.d) + ' ' + esc(x.d.nome || '') + (x.d.valore !== undefined && x.d.t !== 'pulsante' ? ' → <code>' + esc(vis(x.d)) + '</code>' : '') + '</li>';
      }).join('') + '</ol></details></div>';
      c.innerHTML = h2;
    }
    // evidenziazione sulla pagina
    var chiave = pos + '|' + (ora ? ora.k : 'fine');
    if (chiave !== chiaveCorrente) { chiaveCorrente = chiave; mostraDopo = Date.now() + 900; }
    var vecchi = document.querySelectorAll('.msa-g-brilla');
    for (var j = 0; j < vecchi.length; j++) if (!ora || vecchi[j] !== ora.el) vecchi[j].classList.remove('msa-g-brilla');
    if (ora && ora.el) {
      ora.el.classList.add('msa-g-brilla');
      var d2 = ora.d, breve = d2.breve || (function (t) { var f = t.split(/(?<=[.!?])\s/)[0]; return f.length > 130 ? f.slice(0, 127).replace(/\s+\S*$/, '') + '…' : f; })(d2.serve || '');
      bolla.innerHTML = '<b>' + tipoLabel(d2) + (d2.valore !== undefined && d2.t !== 'pulsante' ? ' <code>' + esc(vis(d2)) + '</code>' : (d2.nome ? ' «' + esc(d2.nome) + '»' : '')) + '</b><span>' + esc(breve) + '</span>';
      bolla.hidden = soppressa === chiave || Date.now() < mostraDopo;
      if (chiave !== ultimoPunto || forza) {
        ultimoPunto = chiave;
        try { ora.el.scrollIntoView({block: 'center', behavior: 'smooth'}); } catch (e) { /* vecchio browser */ }
        if ((d2.t === 'campo') && (!document.activeElement || document.activeElement === document.body)) { try { ora.el.focus({preventScroll: true}); } catch (e) { /* niente fuoco */ } }
      }
      if (!bolla.hidden) posizionaBolla(ora.el);
    } else { bolla.hidden = true; ultimoPunto = chiave; }
    tickPunti.el = ora && ora.el; tickPunti.k = ora ? ora.k : -1;
  }
  corpo.addEventListener('click', function (e) {
    var sg = e.target.closest ? e.target.closest('.msa-g-sugg-off,.msa-g-sugg-on') : null;
    if (sg) { ls(SUGG, sg.classList.contains('msa-g-sugg-off') ? 'no' : 'si'); firmaPunti = ''; ultimoPunto = ''; soppressa = ''; if (sg.classList.contains('msa-g-sugg-off')) spegniPunti(); disegna(); var cc = corpo.querySelector('.msa-g-ora-c'); if (cc) cc.innerHTML = ''; tickPunti(true); return; }
    var t = e.target.closest ? e.target.closest('.msa-g-letto,.msa-g-salta') : null; if (!t) return;
    var p = PASSI[pos], k = parseInt(t.getAttribute('data-k'), 10);
    if (t.classList.contains('msa-g-salta')) return;
    if (p.cpmVerificato && t.classList.contains('msa-g-letto') && p.punti[k] && p.punti[k].controlla && p.punti[k].valore !== undefined) {
      var el=p.punti[k].sel ? trovaP(p.punti[k].sel) : null;
      if(!el || !ugualeP(el.value,p.punti[k].valore)) { firmaPunti='';tickPunti(true);return; }
    }
    segnaP(t.classList.contains('msa-g-letto') ? 'letto' : 'salta', chiaveP(p, k)); firmaPunti = ''; tickPunti(true);
  });
  // clic sui pulsanti della pagina: il punto si segna fatto solo se l'operazione non è stata rifiutata (messaggio rosso)
  document.addEventListener('click', function (e) {
    var p = PASSI[pos]; if (!p || !p.punti || radice.contains(e.target)) return;
    [tickPunti.k].forEach(function (k) {
      var d = p.punti[k]; if (!d || d.t !== 'pulsante' || !d.sel) return;   // conta solo il pulsante che stava brillando
      var el = trovaP(d.sel); if (!el || !el.contains(e.target)) return;
      setTimeout(function () {
        var m = el.closest ? el.closest('[data-prefisso]') : null, es = m ? document.getElementById(m.getAttribute('data-prefisso') + '-esito') : null;
        if (es && /\bko\b/.test(es.className)) { firmaPunti=''; tickPunti(true); return; }
        if (!p.cpmVerificato) segnaP('clic', chiaveP(p, k));
        firmaPunti=''; tickPunti(true); aggiorna();
      }, 250);
    });
  }, true);
  ['input', 'change'].forEach(function (ev) { document.addEventListener(ev, function (e) {
    if (tickPunti.el && e.target === tickPunti.el && !radice.contains(e.target)) nascondiBolla();   // ha iniziato a scrivere/scegliere: la nuvoletta toglie il disturbo
    setTimeout(function () { tickPunti(); }, 0);
  }, true); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === 'Tab') && tickPunti.el && !radice.contains(e.target)) { nascondiBolla(); setTimeout(function () { tickPunti(); }, 0); }
  }, true);
  document.addEventListener('mousedown', function (e) {
    if (tickPunti.el && !radice.contains(e.target) && tickPunti.el.contains && tickPunti.el.contains(e.target)) nascondiBolla();   // clic sul punto che brilla (pulsante o campo)
  }, true);
  window.addEventListener('scroll', function () { if (tickPunti.el) posizionaBolla(tickPunti.el); }, true);
  window.addEventListener('resize', function () { if (tickPunti.el) posizionaBolla(tickPunti.el); });
  setInterval(function () { tickPunti(); }, 450);

  window.MSA_GUIDA_API = {stati: function () { return esiti(); }, vaiA: vaiA, apri: apri, passo: function () { return pos; }};
})();
