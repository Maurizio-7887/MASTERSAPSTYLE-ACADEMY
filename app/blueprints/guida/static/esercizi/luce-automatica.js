/* LUCE AUTOMATICA — la guida punto per punto (casella che brilla + nuvoletta) su OGNI esercizio.
   Prima solo «Dicembre: dalla costituzione alla riapertura» aveva i punti illuminati su tutti i passi
   (dicembre-wms-semplice.js). Qui lo STESSO generatore si applica a ogni passo che non ha ancora p.punti:
   S/4 integrato, esercizio guidato 01/12, Executive Assistant, alta varietà, produzione ripetitiva…
   I punti scritti a mano restano come sono: questo file aggiunge solo ciò che manca.
   Va caricato DOPO lo script dell'esercizio (e dopo i suoi supplementi) e PRIMA di pannello.js. */
(function () {
  'use strict';
  var E = window.MSA_ESERCIZIO;
  if (!E || !Array.isArray(E.passi)) return;

  var DATA_IT = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  function iso(v) { var m = DATA_IT.exec(String(v == null ? '' : v).trim()); return m ? m[3] + '-' + m[2] + '-' + m[1] : v; }
  function ultimo(re, t) { var m, x = null; re.lastIndex = 0; while ((m = re.exec(t))) x = m; return x; }
  function riquadroDi(t) { var m = /riquadro\s+«([^»]+)»/i.exec(t || ''); return m ? m[1] : ''; }

  // riga «cosa fai» scritta come oggetto {dove, fai, valore}
  function puntoDaRiga(f) {
    var dove = String(f.dove || ''), fai = String(f.fai || ''), valore = f.valore;
    if (/«Apri ➜»/.test(fai) || /^Premi «✓ Fatto»$/.test(fai)) return null;
    var base = {auto: true, dove: dove, riquadro: riquadroDi(dove)};
    var premi = /^Premi\s+«([^»]+)»/.exec(fai);
    if (premi) return Object.assign(base, {t: 'pulsante', nome: premi[1], bottone: premi[1],
      serve: fai.length > premi[0].length ? fai : 'Premi il pulsante una volta sola: è lui che registra.'});
    var casella = ultimo(/(?:casella|menu)\s+«([^»]+)»/ig, dove);
    var scegli = /^Scegli\s+«([^»]+)»/.exec(fai);
    if (casella && (valore !== undefined || scegli)) {
      return Object.assign(base, {t: 'campo', etichetta: casella[1], nome: casella[1],
        valore: valore !== undefined ? iso(valore) : undefined, testo: scegli ? scegli[1] : undefined,
        serve: (scegli ? 'Scegli «' + scegli[1] + '»' : (/^Scegli/.test(fai) ? 'Scegli' : 'Scrivi')) + ' nel campo «' + casella[1] + '».'});
    }
    if (casella && /^(Lascia|Non toccarla|Non cambiarla)/i.test(fai)) return Object.assign(base, {t: 'leggi', etichetta: casella[1], nome: fai, serve: '📍 ' + dove});
    if (casella && /^Scrivi /.test(fai)) return Object.assign(base, {t: 'campo', etichetta: casella[1], nome: casella[1], libero: true, descrittivo: true, istruzione: fai, serve: fai});
    if (valore !== undefined && !/^(Scrivi|Scegli)$/.test(fai) && fai.length < 40) {
      return Object.assign(base, {t: 'campo', etichetta: fai, nome: fai, valore: iso(valore), serve: 'Scrivi nel campo «' + fai + '».'});
    }
    return Object.assign(base, {t: 'leggi', nome: fai + (valore !== undefined ? ' ' + valore : ''), serve: dove ? '📍 ' + dove : fai});
  }

  // un campo del passo [etichetta, valore]: valore breve = casella da compilare; valore spiegato = da leggere
  // (la casella brilla lo stesso); «Pulsante» / «Poi premi» = il pulsante da premere
  function daCampo(p, nome, v) {
    nome = String(nome || ''); v = v == null ? '' : String(v);
    if (/^(Pulsante|Premi|Poi premi)$/i.test(nome)) {
      var b = v.split(/[;:—]| NON |→/)[0].trim();
      return {auto: true, t: 'pulsante', nome: b, bottone: b, serve: 'Premi «' + b + '» una volta sola: è lui che registra.' + (v.length > b.length ? ' (' + v + ')' : '')};
    }
    if (!p.fatto || v.length > 45 || /[;=«]|^(vuoto|quell[ao]|prima|il |la |le |lo |gli |dal |no$|sì$)/i.test(v) || /\s\(/.test(v) && !/^[A-Z0-9-]+\s/.test(v))
      return {auto: true, t: 'leggi', etichetta: nome, nome: nome + ': ' + v, serve: nome};
    return {auto: true, t: 'campo', etichetta: nome, nome: nome, valore: iso(v), serve: nome + ': ' + v};
  }

  var GENERICHE = /^(Apri il modulo indicato nel percorso|Controlla tutti i dati, esegui il comando previsto)/;
  function microPassi(p) {
    var righe = Array.isArray(p.fai) ? p.fai : [];
    var out = [], riquadro = '';
    righe.forEach(function (f) {
      if (f && typeof f === 'object' && !Array.isArray(f) && f.fai) {
        var x = puntoDaRiga(f); if (!x) return;
        if (x.riquadro) riquadro = x.riquadro; else if (/^(Poi|Pagina)\b/i.test(x.dove)) riquadro = ''; else x.riquadro = riquadro;
        out.push(x);
      }
      else if (Array.isArray(f)) out.push(daCampo(p, f[0], f[1]));
      else if (typeof f === 'string' && !GENERICHE.test(f)) out.push({auto: true, t: 'leggi', nome: f, serve: f});
    });
    if (!righe.length) (p.campi || []).forEach(function (c) { out.push(daCampo(p, c[0], c[1])); });
    var fine = String(p.percorso || '').split(';')[0].split('→').pop().replace(/\(.*?\)/g, '').trim();
    out.forEach(function (d) { if (!d.riquadro && fine && !d.dove) d.riquadro = fine; });
    // passo di sola lettura (si spunta a mano): niente caselle da compilare, solo cose da guardare
    if (!p.fatto) out.forEach(function (d) { if (d.t === 'campo') { d.t = 'leggi'; d.nome = d.etichetta + (d.valore !== undefined ? ': ' + d.valore : d.testo ? ': ' + d.testo : ''); } });
    // operazione senza il nome del pulsante: brilla il pulsante principale del riquadro dove stanno le caselle
    if (p.fatto && !out.some(function (d) { return d.t === 'pulsante'; }) && out.some(function (d) { return d.etichetta; }))
      out.push({auto: true, t: 'pulsante', modulo: true, fine: fine, riquadro: fine, nome: 'il pulsante che registra', serve: 'È il pulsante blu in fondo allo stesso riquadro delle caselle qui sopra: premilo una volta sola.'});
    if (!out.length) out.push({auto: true, t: 'leggi', nome: p.titolo, serve: 'Leggi «Cosa devi vedere» qui sotto, poi premi «✓ Fatto».'});
    return out;
  }

  var aggiunti = 0;
  E.passi.forEach(function (p) {
    if (!p || (p.punti && p.punti.length)) return;          // i punti scritti a mano hanno la precedenza
    p.punti = microPassi(p);
    aggiunti++;
  });
  E.luceAutomatica = aggiunti;
})();
