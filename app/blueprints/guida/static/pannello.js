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
  window.MSA_GUIDA_API = {stati: function () { return esiti(); }, vaiA: vaiA, apri: apri, passo: function () { return pos; }};
})();
