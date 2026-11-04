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
    try { if (localStorage.getItem(chiave) == null) return; localStorage.setItem(chiave, JSON.stringify(S)); } catch (e) { /* memoria piena */ }
  }
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
      if (m[p.titolo] && !(guidata && p.fatto)) return 'mano';
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
    scriviSeEsiste(S);
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
    if (guidata) { for (var f = 0; f < N; f++) if (!stati[f]) return f; return N - 1; }
    var ult = -1; for (var j = 0; j < N; j++) if (stati[j]) ult = j;
    for (var i = ult + 1; i < N; i++) if (!stati[i]) return i;
    for (i = 0; i < N; i++) if (!stati[i]) return i;
    return N - 1;
  };
  var pos = parseInt(ss(POS), 10);
  if (!(pos >= 0 && pos < N)) pos = primoDaFare();
  // Ripresa dopo un salvataggio seguito subito da un cambio di pagina.
  if (guidata && stati[pos]) { while (pos < N - 1 && stati[pos]) pos++; ss(POS, String(pos)); }
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
    var pendente = inQuiz();
    sel.disabled = !!pendente;
    radice.querySelector('.msa-g-ind').disabled = !!pendente || pos === 0;
    radice.querySelector('.msa-g-av').disabled = !!pendente;
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
    if (p.punti && p.punti.length) h += '<div class="msa-g-ora-c"></div>';
    var tabellaCampi = (p.campi && p.campi.length) ? '<table class="msa-g-campi">' + p.campi.map(function (c) {
        return '<tr><th>' + esc(c[0]) + '</th><td><button type="button" class="msa-g-val" title="Clic per copiare">' + esc(c[1]) + '</button></td></tr>';
      }).join('') + '</table>' : '';
    // Passi contabili: soluzione e spiegazioni sulla scrittura restano nascoste finché l'allievo non registra e ricostruisce la partita doppia
    var nascosto = E.verificaRagioneria && p.contabile && !st;
    if (p.grande) h += '<div class="msa-g-grande"><span>A CHE COSA SERVE QUESTO PASSO</span>' + esc(p.grande) + '</div>';
    if (p.mappa) h += mappaHtml(p.mappa);
    if (p.fai) {
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
    else if (st === 'mano') h += '<div class="msa-g-esito ok">✓ Segnato come fatto. <button type="button" class="msa-g-togli">togli la spunta</button></div>';
    else if (p.fatto) h += '<div class="msa-g-esito">○ Non ancora registrato: quando confermi, il passo si spunta da solo.' + (guidata ? ' Il pannello mostrerà automaticamente il passaggio successivo.' : ' <button type="button" class="msa-g-mano">segna fatto a mano</button>') + '</div>';
    else h += '<div class="msa-g-esito">○ Questo passo si spunta a mano. <button type="button" class="msa-g-mano">✓ Fatto</button></div>';
    corpo.innerHTML = h + strumenti(false);
    radice.querySelector('.msa-g-ind').disabled = pos === 0;
    radice.querySelector('.msa-g-av').textContent = pos === N - 1 ? 'Fine' : (st ? 'Prossimo ▶' : 'Avanti ▶');
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

  function vaiA(i, manuale) { pos = Math.max(0, Math.min(N - 1, i)); if (manuale) ss(POS, String(pos)); disegna(); corpo.scrollTop = 0; }

  function apri(si) {
    pannello.hidden = !si;
    bottone.hidden = si;
    bottone.setAttribute('aria-expanded', si ? 'true' : 'false');
    document.documentElement.classList.toggle('msa-guida-aperta', si);
    ls(guidata ? APERTA + '-' + E.codice : APERTA, si ? '1' : '0');
    if (si) disegna();
  }

  bottone.addEventListener('click', function () { apri(true); });
  radice.querySelector('.msa-g-chiudi').addEventListener('click', function () { apri(false); });
  radice.querySelector('.msa-g-ind').addEventListener('click', function () { vaiA(pos - 1, true); });
  radice.querySelector('.msa-g-av').addEventListener('click', function () { vaiA(pos + 1, true); });
  sel.addEventListener('change', function () { vaiA(parseInt(sel.value, 10), true); });
  corpo.addEventListener('click', function (e) {
    var t = e.target;
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
    else if (t.classList.contains('msa-g-mano')) { segnaAMano(PASSI[pos], true); if (guidata) aggiorna(); else { stati = esiti(); disegna(); } }
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
    if (guidata && stati[pos]) {
      while (pos < N - 1 && stati[pos]) pos++;
      ss(POS, String(pos));
    }
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
    if (pannello.hidden) return;
    var prima = stati[pos], nuovi = esiti();
    var cambiato = nuovi.some(function (x, i) { return x !== stati[i]; });
    stati = nuovi;
    if (!cambiato) return;
    disegna();
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

  // ══ GUIDA PUNTO PER PUNTO ══
  // Un passo può avere p.punti: elenco ordinato dei punti in cui l'allievo deve scrivere, scegliere o premere.
  // Ogni punto: {t:'campo'|'scelta'|'pulsante'|'leggi', sel:'selettore CSS nella pagina', valore:'cosa scrivere/scegliere',
  //   nome:'come si chiama il campo', serve:'a cosa serve', fatto:function(h,el){…} (facoltativo, legge lo stato), ctx:function(){…} (il campo vale solo se…)}.
  // Il PRIMO punto non ancora fatto fa «brillare» il bordo del campo reale, con un fumetto («Scrivi 36000 — serve a…») e il riquadro «Ora tocca a te» nel pannello.
  var firmaPunti = '', ultimoPunto = '', bolla = document.createElement('div');
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
    if (memP('salta')[key]) return true;
    if (d.finale && stati[pos]) return true;
    if (d.fatto) { try { if (d.fatto(h, el)) return true; } catch (e) { /* stato non pronto */ } }
    if (d.solo === 'stato') return false;
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
  function tickPunti(forza) {
    if (!bolla) return;   // il motore parte dopo il primo disegno: il primo giro lo fa il timer
    var p = PASSI[pos], c = corpo.querySelector('.msa-g-ora-c');
    if (!p || !p.punti || !c || pannello.hidden || inQuiz()) { if (!p || !p.punti || pannello.hidden || inQuiz()) spegniPunti(); return; }
    var h = aiutanti(stato()), elenco = p.punti.map(function (d, k) {
      var el = d.sel ? trovaP(d.sel) : null, ok = fattoP(p, d, k, el, h), key = chiaveP(p, k);
      if (ok && !memP('ok')[key]) segnaP('ok', key);   // un punto fatto resta fatto, anche se poi la casella cambia (per esempio cambiando centro)
      return {d: d, k: k, el: el, fatto: ok || !!memP('ok')[key]};
    });
    var primo = -1; for (var i = 0; i < elenco.length; i++) if (!elenco[i].fatto) { primo = i; break; }
    var ora = primo < 0 ? null : elenco[primo];
    var firma = pos + '|' + (ora ? ora.k + (ora.el ? 'e' : 'x') : 'fine') + '|' + elenco.map(function (x) { return x.fatto ? 1 : 0; }).join('');
    if (firma !== firmaPunti || forza) {
      firmaPunti = firma;
      var fatti = elenco.filter(function (x) { return x.fatto; }).length;
      var h2 = '<div class="msa-g-ora"><div class="msa-g-ora-t">🎯 ' + (ora ? 'ORA TOCCA A TE' : 'TUTTI I PUNTI FATTI') + '<small>punto ' + Math.min(fatti + 1, elenco.length) + ' di ' + elenco.length + '</small></div>' +
        '<div class="msa-g-ora-barra"><span style="width:' + Math.round(fatti / elenco.length * 100) + '%"></span></div>';
      if (ora) {
        var d = ora.d;
        h2 += '<div class="msa-g-ora-azione">' + tipoLabel(d) + (d.nome ? ' · <b>' + esc(d.nome) + '</b>' : '') + '</div>';
        if (d.valore !== undefined && d.t !== 'pulsante') h2 += '<div class="msa-g-ora-val"><button type="button" class="msa-g-val msa-g-grosso" title="Clic per copiare">' + esc(vis(d)) + '</button><small>' + (d.t === 'campo' ? (d.controlla ? 'controlla la casella che brilla: se non c’è già, scrivilo tu' : 'scrivilo tu nella casella che brilla (clic per copiarlo)') : 'scegli questa voce nell’elenco che brilla') + '</small></div>';
        if (d.t === 'pulsante') h2 += '<div class="msa-g-ora-val"><small>Premi il pulsante che brilla' + (d.nome ? ': «' + esc(d.nome) + '»' : '') + '.</small></div>';
        h2 += '<div class="msa-g-ora-serve"><b>💡 A cosa serve</b>' + esc(d.serve || '') + '</div>';
        if (!ora.el && d.t !== 'leggi') h2 += '<div class="msa-g-ora-dove">📍 Non vedo ancora questa schermata: premi <b>«Apri ➜»</b> qui sopra, poi la casella comincerà a brillare.</div>';
        if (d.t === 'leggi' || d.controlla) h2 += '<button type="button" class="msa-g-letto lab-btn" data-k="' + ora.k + '">' + (d.controlla ? '✓ La casella contiene ' + esc(vis(d)) + ', vai avanti' : '✓ Ho letto, vai avanti') + '</button>';
        h2 += '<button type="button" class="msa-g-salta" data-k="' + ora.k + '">già fatto / salta questo punto</button>';
      } else h2 += '<div class="msa-g-ora-serve">Ora controlla qui sotto «Cosa devi vedere» e passa al passo successivo.</div>';
      h2 += '<details class="msa-g-ora-elenco"><summary>Tutti i punti di questo passo</summary><ol>' + elenco.map(function (x) {
        return '<li class="' + (x.fatto ? 'fatto' : x === ora ? 'adesso' : '') + '">' + (x.fatto ? '✓ ' : '') + tipoLabel(x.d) + ' ' + esc(x.d.nome || '') + (x.d.valore !== undefined && x.d.t !== 'pulsante' ? ' → <code>' + esc(vis(x.d)) + '</code>' : '') + '</li>';
      }).join('') + '</ol></details></div>';
      c.innerHTML = h2;
    }
    // evidenziazione sulla pagina
    var chiave = pos + '|' + (ora ? ora.k : 'fine');
    var vecchi = document.querySelectorAll('.msa-g-brilla');
    for (var j = 0; j < vecchi.length; j++) if (!ora || vecchi[j] !== ora.el) vecchi[j].classList.remove('msa-g-brilla');
    if (ora && ora.el) {
      ora.el.classList.add('msa-g-brilla');
      var d2 = ora.d, breve = d2.breve || (function (t) { var f = t.split(/(?<=[.!?])\s/)[0]; return f.length > 130 ? f.slice(0, 127).replace(/\s+\S*$/, '') + '…' : f; })(d2.serve || '');
      bolla.innerHTML = '<b>' + tipoLabel(d2) + (d2.valore !== undefined && d2.t !== 'pulsante' ? ' <code>' + esc(vis(d2)) + '</code>' : (d2.nome ? ' «' + esc(d2.nome) + '»' : '')) + '</b><span>' + esc(breve) + '</span>';
      bolla.hidden = false;
      if (chiave !== ultimoPunto || forza) {
        ultimoPunto = chiave;
        try { ora.el.scrollIntoView({block: 'center', behavior: 'smooth'}); } catch (e) { /* vecchio browser */ }
        if ((d2.t === 'campo') && (!document.activeElement || document.activeElement === document.body)) { try { ora.el.focus({preventScroll: true}); } catch (e) { /* niente fuoco */ } }
      }
      posizionaBolla(ora.el);
    } else { bolla.hidden = true; ultimoPunto = chiave; }
    tickPunti.el = ora && ora.el; tickPunti.k = ora ? ora.k : -1;
  }
  corpo.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.msa-g-letto,.msa-g-salta') : null; if (!t) return;
    var p = PASSI[pos], k = parseInt(t.getAttribute('data-k'), 10);
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
        if (es && /\bko\b/.test(es.className)) return;
        segnaP('clic', chiaveP(p, k)); tickPunti();
      }, 250);
    });
  }, true);
  ['input', 'change'].forEach(function (ev) { document.addEventListener(ev, function () { setTimeout(function () { tickPunti(); }, 0); }, true); });
  window.addEventListener('scroll', function () { if (tickPunti.el) posizionaBolla(tickPunti.el); }, true);
  window.addEventListener('resize', function () { if (tickPunti.el) posizionaBolla(tickPunti.el); });
  setInterval(function () { tickPunti(); }, 450);

  window.MSA_GUIDA_API = {stati: function () { return esiti(); }, vaiA: vaiA, apri: apri, passo: function () { return pos; }};
})();
