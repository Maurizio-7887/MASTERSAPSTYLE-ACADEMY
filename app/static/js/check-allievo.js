/* ⚡ CHECK RAPIDO DEL DOCENTE — perché l'allievo è fermo a quel passo.
   Usa gli STESSI controlli del tutor (file degli esercizi) sullo stato ERP salvato sul server, il progresso della guida
   (spunte salvate) e il diario delle azioni (pulsanti premuti, risposte e errori del programma, salvataggi).
   Solo lettura: non modifica niente dell'allievo. Ingresso: window.CK = {stato, pos, massimo, passiServer, diario, esercizio};
   uscita: window.CK_ESITO (per i test) e il contenuto di #ck-corpo. */
(function () {
  'use strict';
  var CK = window.CK || {}, E = window.MSA_ESERCIZIO, box = document.getElementById('ck-corpo');
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var S = CK.stato || {};
  if (typeof S === 'string') { try { S = JSON.parse(S); } catch (e) { S = {}; } }
  if (!E || !E.passi) { if (box) box.innerHTML = '<p>Esercizio «' + esc(CK.esercizio) + '» non riconosciuto: usa «🔎 Avanzamento».</p>'; return; }
  var P = E.passi, regs = S.registrazioni || [], low = function (x) { return String(x || '').toLowerCase(); }, eventi = ((S.fiQuattro || {}).events || []);
  var h = {S: S,
    k: function (p) { p = low(p); return regs.some(function (r) { return low(r.fi && r.fi.key).indexOf(p) === 0; }); },
    t: function (tipo, n) { return regs.filter(function (r) { return r.tipo === tipo; }).length >= (n || 1); },
    d: function (txt, tipo, n) { return regs.filter(function (r) { return (!tipo || r.tipo === tipo) && String(r.descrizione || '').indexOf(txt) >= 0; }).length >= (n || 1); },
    ev: function (ref) { ref = low(ref); return eventi.some(function (e) { return low((e.input || {}).ref) === ref; }) || regs.some(function (r) { return low(r.fi && r.fi.key) === 'quattro:' + ref; }); }};
  var manuali = ((S.msaGuida || {})[E.codice] || {});
  var spunteServer = {};
  Object.keys(CK.passiServer || {}).forEach(function (k) { var v = CK.passiServer[k] || {}; if (v.titolo) spunteServer[v.titolo] = v.stato || ''; });
  // controllo sui dati: true = superato, false = non superato, null = passo di lettura (spunta a mano)
  var dati = function (p) { if (!p.fatto) return null; try { return !!p.fatto(h); } catch (e) { return false; } };
  var mano = function (p) { return !!manuali[p.titolo] || spunteServer[p.titolo] === 'mano' || spunteServer[p.titolo] === 'docente'; };
  var pos = Math.max(0, Math.min(P.length - 1, CK.pos || 0)), fino = Math.min(P.length - 1, Math.max(pos, CK.massimo || 0) + 1);
  var righe = [];
  for (var i = 0; i <= fino; i++) {
    var p = P[i], d = dati(p), m = mano(p);
    righe.push({i: i, p: p, dati: d, mano: m, ok: d === true || (d === null && m)});
  }
  var diario = CK.diario || [];
  var diag = function (p) { if (typeof p.diagnosi !== 'function') return []; try { return p.diagnosi(h) || []; } catch (e) { return []; } };
  var fai = function (p) {
    var f = p.fai || [];
    if (f.length) return '<ol>' + f.map(function (x) {
      if (x && x.fai) return '<li><small>' + esc(x.dove || '') + '</small><br><b>' + esc(x.fai) + '</b>' + (x.valore ? ' → <code>' + esc(x.valore) + '</code>' : '') + '</li>';
      return '<li>' + esc(Array.isArray(x) ? x.join(': ') : x) + '</li>'; }).join('') + '</ol>';
    if (p.campi && p.campi.length) return '<ul>' + p.campi.map(function (c) { return '<li>' + esc(c[0]) + ': <b>' + esc(c[1]) + '</b></li>'; }).join('') + '</ul>';
    return '';
  };
  var titoloDiario = function (i) { return (i + 1) + '. ' + P[i].titolo; };
  var azioniSu = function (i) { var t = titoloDiario(i); return diario.filter(function (v) { return v.passo === t; }); };

  // ── il verdetto, dal più grave ──
  var motivi = [];
  var coda = ((S.msaRagioneria || {}).coda || []).filter(function (q) { return !(q.tentato || (q.cronologiaTentativi || []).length || q.corretto); });
  if (E.verificaRagioneria !== false && S.quizContabile !== false && coda.length) {
    var q0 = coda[0].documento || {};
    motivi.push({grave: true, titolo: '📝 Ha una domanda di ragioneria aperta: il pannello è bloccato finché non prova a ricostruire la scrittura',
      testo: 'Documento ' + esc(q0.numero || q0.id || '') + ' del ' + esc(q0.data || '') + ' (' + esc(q0.tipo || '') + ': ' + esc(q0.descrizione || '') + '). ' +
        (coda.length > 1 ? 'Domande in coda: ' + coda.length + '. ' : '') + 'Deve compilare Dare/Avere e importi nel pannello e premere «Verifica la mia scrittura». Se è proprio bloccata, dalla scheda allievo puoi sbloccare le domande.'});
  }
  var salvRif = diario.filter(function (v) { return v.tipo === 'salvataggio' && /RIFIUTATO|NON salvato/.test(v.testo || ''); });
  if (salvRif.length && diario.length && diario.indexOf(salvRif[0]) < 15) {
    motivi.push({grave: true, titolo: '💾 L’ultimo salvataggio non è arrivato al server', testo: esc(salvRif[0].testo) + '. Il lavoro fatto dopo potrebbe non risultare qui: alla prossima apertura deve premere «🛟 Riprendi questo lavoro».'});
  }
  var buco = righe.filter(function (r) { return r.i < pos && r.p.fatto && r.dati === false; })[0];
  if (buco) {
    motivi.push({grave: true, i: buco.i, titolo: '⛔ Il passo ' + (buco.i + 1) + ' non risulta fatto nei suoi dati: il tutor non la fa andare avanti',
      testo: '«' + esc(buco.p.titolo) + '». È più indietro del punto in cui si trova (' + (pos + 1) + '): il pannello le propone di tornare a sistemarlo.'});
  }
  var cur = righe[pos];
  if (cur) {
    if (cur.dati === true) motivi.push({i: pos, titolo: '➡️ Il passo ' + (pos + 1) + ' è già fatto nei suoi dati: deve solo premere «Avanti ▶»', testo: 'Se il pulsante non si attiva, deve ricaricare la pagina (F5) o premere «Salva il lavoro fino a qui».'});
    else if (cur.dati === null && !cur.mano) motivi.push({i: pos, titolo: '📖 Il passo ' + (pos + 1) + ' è una lettura: deve premere «✓ Fatto»', testo: '«' + esc(cur.p.titolo) + '» non registra niente: si spunta a mano. Finché non preme «✓ Fatto» il tutor non va avanti.'});
    else if (cur.dati === false) {
      var err = azioniSu(pos).filter(function (v) { return v.tipo === 'errore'; });
      var cl = azioniSu(pos).filter(function (v) { return v.tipo === 'clic'; });
      motivi.push({grave: true, i: pos, titolo: '❌ Il passo ' + (pos + 1) + ' non è ancora registrato nei suoi dati',
        testo: '«' + esc(cur.p.titolo) + '». ' + (err.length ? 'Il programma le ha risposto con ' + err.length + ' errore/i: l’ultimo è «<b>' + esc(err[0].testo) + '</b>».'
          : cl.length ? 'Ha premuto ' + cl.length + ' pulsanti su questo passo (ultimo: «' + esc(cl[0].testo) + '») ma l’operazione richiesta non risulta registrata: probabilmente un valore diverso da quello indicato o il pulsante di un altro riquadro.'
          : 'Nel diario non risultano pulsanti premuti su questo passo: non ha ancora fatto l’operazione (o non ha aperto la schermata giusta).')});
    }
  }
  var avanti = righe.filter(function (r) { return r.i > pos && r.dati === true; });
  if (!motivi.length) motivi.push({titolo: '✅ Nessun blocco evidente sui dati salvati', testo: 'Controlla il diario qui sotto: se ha lavorato dopo l’ultimo salvataggio, chiedile «Salva il lavoro fino a qui» e ricarica questa pagina.'});

  // ── pagina ──
  var out = '<div class="ck-verdetto">';
  motivi.forEach(function (m) {
    out += '<div style="border-left:5px solid ' + (m.grave ? '#B42318' : '#0a6ed1') + ';background:' + (m.grave ? '#FDECEA' : '#EAF3FB') + ';padding:10px 14px;border-radius:6px;margin:0 0 10px">' +
      '<b style="font-size:15px">' + m.titolo + '</b><p style="margin:6px 0 0">' + m.testo + '</p>';
    if (m.i != null) {
      var p = P[m.i], d = diag(p);
      out += '<p style="margin:8px 0 2px">📍 <b>Dove:</b> ' + esc(p.percorso || '') + '</p>';
      if (d.length) out += '<p style="margin:6px 0 2px"><b>Controllo sui suoi dati:</b></p><ul style="list-style:none;padding-left:0;margin:0">' + d.map(function (x) {
        return '<li style="' + (x[0] ? 'color:#107E3E' : 'color:#B42318;font-weight:600') + '">' + (x[0] ? '✅ ' : '❌ ') + esc(x[1]) + '</li>'; }).join('') + '</ul>';
      var f = fai(p);
      if (f) out += '<details' + (m.grave ? ' open' : '') + '><summary><b>Che cosa doveva fare (valori della guida)</b></summary>' + f + (p.attesa ? '<p><b>Risultato atteso:</b> ' + esc(p.attesa) + '</p>' : '') + '</details>';
      var az = azioniSu(m.i).slice(0, 12);
      if (az.length) out += '<details open><summary><b>Che cosa ha premuto su questo passo (dal più recente)</b></summary><ul>' + az.map(function (v) {
        return '<li style="' + (v.tipo === 'errore' ? 'color:#B42318;font-weight:600' : '') + '">' + esc(v.quando) + ' · ' + esc({clic: '🖱️ premuto', esito: '✅ risposta', errore: '⛔ errore', salvataggio: '💾', pagina: '📄 pagina'}[v.tipo] || v.tipo) + ' · ' + esc(v.testo) + '</li>'; }).join('') + '</ul></details>';
    }
    out += '</div>';
  });
  if (avanti.length) out += '<p style="color:#7a5c00">⚠️ Nei suoi dati risultano già fatte operazioni di passi successivi (' + avanti.slice(0, 6).map(function (r) { return r.i + 1; }).join(', ') + (avanti.length > 6 ? '…' : '') + '): ha lavorato fuori ordine o ha registrato due volte.</p>';
  out += '</div>';
  out += '<h3>I passi fino al ' + (fino + 1) + '</h3><div class="msa-scroll" style="max-height:480px;overflow:auto"><table class="msa-tab"><tr><th>#</th><th>Fase</th><th>Passo</th><th>Dati salvati</th><th>Spunta nella guida</th></tr>' +
    righe.map(function (r) {
      var sDati = r.dati === null ? '📖 lettura' : r.dati ? '✅ superato' : '❌ manca';
      var sGuida = r.dati === true ? '✅ automatica' : r.mano ? '✋ a mano' : '—';
      var evid = r.i === pos ? 'background:#FFF6D6;font-weight:600' : (r.dati === false && r.i < pos ? 'background:#FDECEA' : '');
      return '<tr style="' + evid + '"><td>' + (r.i + 1) + (r.i === pos ? ' ◀' : '') + '</td><td style="font-size:12px">' + esc(r.p.g) + '</td><td>' + esc(r.p.titolo) + '</td><td>' + sDati + '</td><td>' + sGuida + '</td></tr>';
    }).join('') + '</table></div>';
  var ult = regs.slice(-8).reverse();
  out += '<h3>Ultime registrazioni nei suoi dati</h3>' + (ult.length ? '<table class="msa-tab"><tr><th>Data</th><th>Tipo</th><th>Descrizione</th><th>Dare / Avere</th></tr>' + ult.map(function (r) {
    return '<tr><td>' + esc(r.data) + '</td><td>' + esc(r.tipo) + '</td><td>' + esc(r.descrizione || '') + '</td><td style="font-size:12px">' + (r.righe || []).map(function (x) {
      return (x.dareAvere === 'DARE' ? 'D ' : 'A ') + esc(x.conto) + ' ' + esc(Number(x.importo).toLocaleString('it-IT', {minimumFractionDigits: 2})); }).join(' · ') + '</td></tr>'; }).join('') + '</table>' : '<p>Nessuna registrazione.</p>');
  out += '<h3>Ultime azioni (diario)</h3>' + (diario.length ? '<table class="msa-tab"><tr><th>Ora</th><th>Passo</th><th>Cosa</th><th>Dettaglio</th></tr>' + diario.slice(0, 40).map(function (v) {
    var grave = v.tipo === 'errore' || (v.tipo === 'salvataggio' && /RIFIUTATO|NON salvato/.test(v.testo || ''));
    return '<tr style="' + (grave ? 'background:#FDECEA' : '') + '"><td style="white-space:nowrap">' + esc(v.quando) + '</td><td style="font-size:12px">' + esc(v.passo) + '</td><td>' +
      esc({clic: '🖱️ premuto', esito: '✅ risposta', errore: '⛔ errore', salvataggio: '💾 salvataggio', pagina: '📄 pagina'}[v.tipo] || v.tipo) + '</td><td>' + esc(v.testo) + '</td></tr>'; }).join('') + '</table>' : '<p>Nessuna azione registrata nel diario.</p>');
  if (box) box.innerHTML = out;
  window.CK_ESITO = {motivi: motivi.map(function (m) { return m.titolo; }), pos: pos, righe: righe.map(function (r) { return {n: r.i + 1, dati: r.dati, mano: r.mano}; })};
})();
