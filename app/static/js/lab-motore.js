/* MASTERSAPSTYLE Academy — motore comune dei laboratori di produzione (Alta varietà / Produzione ripetitiva).
   La stessa azienda Ferro & Transenne, con tre transenne che condividono il semilavorato SL-PIEGA.
   Lo stato ha la stessa forma del simulatore (pianoDeiConti, registrazioni con righe Dare/Avere), così
   il portale lo salva, lo consegna e lo stampa nel report del docente come il lavoro principale.
   Uso: LabMotore.crea({chiave, tipo, nuovo}) → {S, salva, post, ...}. */
(function () {
  'use strict';
  var r2 = function (x) { return Math.round((Number(x) || 0) * 100 + (x >= 0 ? 1e-9 : -1e-9)) / 100; };
  var TARIFFA = 28;   // €/h, uguale per Taglio, Piegatura e Saldatura (24 personale + 4 generali)
  var CONTI = [
    ['12', 'Magazzino ferro (materie prime)', 'ATTIVO'], ['13', 'Magazzino prodotti finiti', 'ATTIVO'],
    ['15', 'Prodotti in corso di lavorazione (WIP)', 'ATTIVO'], ['16', 'Magazzino semilavorati SL-TAGLIO', 'ATTIVO'],
    ['161', 'Magazzino semilavorati SL-PIEGA', 'ATTIVO'], ['20', 'Debiti verso fornitori', 'PASSIVO'],
    ['41', 'Costo del venduto (a standard)', 'COSTO'], ['61', 'Varianze di produzione', 'COSTO'],
    ['70', 'Consumi di materie prime', 'COSTO'], ['71', 'Consumi di semilavorati', 'COSTO'],
    ['72', 'Costi interni addebitati agli ordini', 'COSTO'], ['73', 'Output di produzione (a standard)', 'RICAVO'],
    ['74', 'Variazione rimanenze prodotti in corso', 'RICAVO'], ['75', 'Attività accreditate dai centri', 'RICAVO'],
  ];
  var MATERIALI = {
    'FERRO': {nome: 'Tubo di ferro', tipo: 'ROH', um: 'kg', conto: '12', prezzo: 0.95},
    'SL-TAGLIO': {nome: 'Tubi tagliati', tipo: 'HALB', um: 'pz', conto: '16', comp: [['FERRO', 8]], ops: [['Taglio', 0.25]]},
    'SL-PIEGA': {nome: 'Telaio piegato', tipo: 'HALB', um: 'pz', conto: '161', comp: [['SL-TAGLIO', 1]], ops: [['Piegatura', 0.20]]},
    'TR-STD': {nome: 'Transenna standard', tipo: 'FERT', um: 'pz', conto: '13', comp: [['SL-PIEGA', 1]], ops: [['Saldatura', 0.40]]},
    'TR-ALTA': {nome: 'Transenna alta (prolunga)', tipo: 'FERT', um: 'pz', conto: '13', comp: [['SL-PIEGA', 1], ['FERRO', 2]], ops: [['Saldatura', 0.50]]},
    'TR-PED': {nome: 'Transenna pedonale (base)', tipo: 'FERT', um: 'pz', conto: '13', comp: [['SL-PIEGA', 1], ['FERRO', 1]], ops: [['Saldatura', 0.30]]},
  };
  var FINITI = ['TR-STD', 'TR-ALTA', 'TR-PED'];

  function costoStd(mat) {
    var m = MATERIALI[mat];
    if (!m) throw Error('Materiale sconosciuto: ' + mat);
    if (m.tipo === 'ROH') return m.prezzo;
    var t = 0;
    (m.comp || []).forEach(function (c) { t += c[1] * costoStd(c[0]); });
    (m.ops || []).forEach(function (o) { t += o[1] * TARIFFA; });
    return r2(t);
  }
  // scomposizione del costo standard: materiale di primo livello + attività per centro
  function ciclo(mat) {
    var m = MATERIALI[mat];
    return {comp: (m.comp || []).map(function (c) { return {mat: c[0], qta: c[1], valore: r2(c[1] * costoStd(c[0]))}; }),
            ops: (m.ops || []).map(function (o) { return {centro: o[0], ore: o[1], valore: r2(o[1] * TARIFFA)}; })};
  }
  // esplosione fino al ferro (per la linea ripetitiva i semilavorati sono «fantasma»)
  function esplodi(mat, q, out) {
    out = out || {ferro: 0, ore: {}};
    var m = MATERIALI[mat];
    (m.ops || []).forEach(function (o) { out.ore[o[0]] = (out.ore[o[0]] || 0) + o[1] * q; });
    (m.comp || []).forEach(function (c) { if (c[0] === 'FERRO') out.ferro += c[1] * q; else esplodi(c[0], c[1] * q, out); });
    return out;
  }

  var fineMese = function (p) { var y = +p.slice(0, 4), m = +p.slice(5, 7); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
  var dataOk = function (d) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || ''))) throw Error('Data non valida: usa il calendario (gg/mm/aaaa).'); return d; };
  var num = function (x, nome, min) {
    var v = typeof x === 'number' ? x : parseFloat(String(x == null ? '' : x).replace(/\./g, '').replace(',', '.'));
    if (!isFinite(v)) throw Error((nome || 'Valore') + ': scrivi un numero.');
    if (min !== undefined && v < min) throw Error((nome || 'Valore') + ': deve essere almeno ' + min + '.');
    return v;
  };

  function statoVuoto(tipo) {
    var g = {}; Object.keys(MATERIALI).forEach(function (k) { g[k] = 0; });
    return {lab: tipo, versioneLab: 1, pianoDeiConti: CONTI.map(function (c) { return {codice: c[0], nome: c[1], tipo: c[2]}; }),
            registrazioni: [], prossimoIdRegistrazione: 1, giacenze: g, movimenti: [], periodi: [], cnt: 1};
  }

  function crea(opz) {
    var chiave = opz.chiave, S = null;
    try { S = JSON.parse(localStorage.getItem(chiave) || 'null'); } catch (e) { S = null; }
    if (!S || S.lab !== opz.tipo) { S = statoVuoto(opz.tipo); if (opz.nuovo) opz.nuovo(S); }
    var M = {
      get S() { return S; },
      MATERIALI: MATERIALI, FINITI: FINITI, TARIFFA: TARIFFA, costoStd: costoStd, ciclo: ciclo, esplodi: esplodi,
      r2: r2, num: num, dataOk: dataOk, fineMese: fineMese,
      salva: function () { try { localStorage.setItem(chiave, JSON.stringify(S)); } catch (e) { throw Error('Impossibile salvare: memoria del browser piena.'); } },
      azzera: function () { S = statoVuoto(opz.tipo); if (opz.nuovo) opz.nuovo(S); M.salva(); return S; },
      id: function (pref) { return pref + String(S.cnt++).padStart(4, '0'); },
      chiuso: function (data) { return S.periodi.some(function (p) { return data <= p.fine && !p.annullato; }); },
      controllaData: function (data) {
        dataOk(data);
        var ult = S.periodi.filter(function (p) { return !p.annullato; }).map(function (p) { return p.fine; }).sort().pop();
        if (ult && data <= ult) throw Error('Il periodo fino al ' + ult.split('-').reverse().join('/') + ' è chiuso: usa una data successiva.');
        return data;
      },
      post: function (reg) {
        var d = 0, a = 0;
        reg.righe = reg.righe.filter(function (x) { return Math.abs(x.importo) >= 0.005; }).map(function (x) {
          var imp = r2(x.importo), segno = x.dareAvere;
          if (imp < 0) { imp = -imp; segno = segno === 'DARE' ? 'AVERE' : 'DARE'; }
          if (segno === 'DARE') d += imp; else a += imp;
          return {conto: x.conto, dareAvere: segno, importo: imp, oggetto: x.oggetto || ''};
        });
        if (!reg.righe.length) return null;
        if (Math.abs(r2(d) - r2(a)) > 0.001) throw Error('Scrittura non quadrata: Dare ' + r2(d) + ' ≠ Avere ' + r2(a));
        var r = {id: S.prossimoIdRegistrazione++, data: reg.data, tipo: reg.tipo, descrizione: reg.descrizione, righe: reg.righe, rif: reg.rif || ''};
        S.registrazioni.push(r);
        return r;
      },
      movimento: function (mat, qta, data, tipo, rif) {
        if (S.giacenze[mat] + qta < -1e-9) throw Error('Giacenza insufficiente di ' + mat + ': disponibili ' + fmtQ(S.giacenze[mat], mat) + ', richiesti ' + fmtQ(-qta, mat) + '.');
        S.giacenze[mat] = r2(S.giacenze[mat] + qta);
        S.movimenti.push({data: data, mat: mat, qta: qta, tipo: tipo, rif: rif || ''});
      },
      saldo: function (conto, fino) {
        return r2(S.registrazioni.filter(function (r) { return !fino || r.data <= fino; }).reduce(function (t, r) {
          return t + r.righe.filter(function (x) { return x.conto === conto; }).reduce(function (u, x) { return u + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0);
        }, 0));
      },
      entrataFerro: function (i) {
        var data = M.controllaData(i.data), kg = num(i.kg, 'Kg', 1), rif = String(i.rif || '').trim() || 'DDT';
        M.movimento('FERRO', kg, data, '101-ACQ', rif);
        var r = M.post({data: data, tipo: 'MIGO_ACQUISTO', rif: rif, descrizione: 'Entrata ferro ' + fmtQ(kg, 'FERRO') + ' — ' + rif,
                        righe: [{conto: '12', dareAvere: 'DARE', importo: kg * MATERIALI.FERRO.prezzo}, {conto: '20', dareAvere: 'AVERE', importo: kg * MATERIALI.FERRO.prezzo}]});
        M.salva(); return r;
      },
    };
    window.MSA_STATO_CORRENTE = function () { return S; };
    window.MSA_SALVA_STATO_CORRENTE = function () { M.salva(); };
    return M;
  }

  // ── formattazione e piccoli componenti in stile Fiori ──
  var eur = function (x) { return (Number(x) || 0).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}); };
  var n0 = function (x) { return (Number(x) || 0).toLocaleString('it-IT', {maximumFractionDigits: 2}); };
  function fmtQ(q, mat) { var m = MATERIALI[mat]; return n0(q) + ' ' + (m ? m.um : ''); }
  var fd = function (d) { return (d || '').split('-').reverse().join('/'); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
  function tabella(testa, righe, vuoto) {
    var dx = testa.map(function (h) { return /›$/.test(h); });
    return '<div class="lab-scroll"><table class="lab-tab"><tr>' + testa.map(function (h, i) { return '<th' + (dx[i] ? ' class="n"' : '') + '>' + h.replace(/›$/, '') + '</th>'; }).join('') + '</tr>' +
      (righe.length ? righe.map(function (r) { return '<tr' + (r.cls ? ' class="' + r.cls + '"' : '') + '>' + (r.celle || r).map(function (c, i) { return '<td' + (dx[i] ? ' class="n"' : '') + '>' + (c == null ? '' : c) + '</td>'; }).join('') + '</tr>'; }).join('')
        : '<tr><td colspan="' + testa.length + '" class="lab-vuoto">' + (vuoto || 'Nessun dato.') + '</td></tr>') + '</table></div>';
  }
  function scheda(icona, titolo, tcode, corpo, id) {
    return '<section class="lab-card"' + (id ? ' id="' + id + '"' : '') + '><header><span class="ic">' + icona + '</span><h2>' + titolo + '</h2>' + (tcode ? '<span class="tc">' + tcode + '</span>' : '') + '</header><div class="cb">' + corpo + '</div></section>';
  }
  // campi: [id, etichetta, tipo('date'|'num'|'text'|'select'), valore, opzioni]
  function modulo(prefisso, campi, pulsanti) {
    return '<div class="lab-mod" data-prefisso="' + prefisso + '"><div class="lab-form">' + campi.map(function (c) {
      var id = prefisso + '-' + c[0], v = c[3] == null ? '' : c[3];
      var input = c[2] === 'select'
        ? '<select id="' + id + '">' + c[4].map(function (o) { o = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'
        : c[2] === 'check' ? '<input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + '>'
          : '<input id="' + id + '" type="' + (c[2] === 'date' ? 'date' : 'text') + '"' + (c[2] === 'num' ? ' inputmode="decimal"' : '') + ' value="' + esc(v) + '">';
      return '<label class="' + (c[2] === 'check' ? 'chk' : '') + '"><span>' + c[1] + '</span>' + input + '</label>';
    }).join('') + '</div><div class="lab-azioni">' + pulsanti.map(function (p) {
      return '<button type="button" class="lab-btn ' + (p[2] || '') + '" data-azione="' + p[0] + '">' + p[1] + '</button>';
    }).join('') + '</div><div class="lab-esito" id="' + prefisso + '-esito"></div></div>';
  }
  function valori(radice, prefisso) {
    var out = {};
    radice.querySelectorAll('[id^="' + prefisso + '-"]').forEach(function (e) {
      if (/-esito$/.test(e.id)) return;
      out[e.id.slice(prefisso.length + 1)] = e.type === 'checkbox' ? e.checked : e.value;
    });
    return out;
  }
  function righeScrittura(r) {
    if (!r) return '<p class="lab-nota">Nessuna scrittura: è un evento gestionale.</p>';
    var regs = Array.isArray(r) ? r : [r];
    return regs.filter(Boolean).map(function (x) {
      return '<div class="lab-scr"><b>N. ' + x.id + ' · ' + fd(x.data) + '</b> ' + esc(x.descrizione) + '<ul>' + x.righe.map(function (y) {
        return '<li class="' + (y.dareAvere === 'DARE' ? 'd' : 'a') + '">' + (y.dareAvere === 'DARE' ? 'Dare' : 'Avere') + ' ' + y.conto + ' <span>' + eur(y.importo) + '</span></li>';
      }).join('') + '</ul></div>';
    }).join('');
  }
  function esito(el, ok, html) { el.className = 'lab-esito ' + (ok ? 'ok' : 'ko'); el.innerHTML = html; }
  // collega i pulsanti data-azione di un contenitore a funzioni: azioni[nome](valori) → html di risposta
  function collega(radice, prefisso, azioni, dopo) {
    radice.querySelectorAll('[data-prefisso="' + prefisso + '"] [data-azione]').forEach(function (b) {
      b.addEventListener('click', function () {
        var out = radice.querySelector('#' + prefisso + '-esito');
        try {
          var res = azioni[b.dataset.azione](valori(radice, prefisso));
          var info = typeof res === 'string' && res.indexOf('<!--info-->') === 0;   // solo informazione: la pagina non si ridisegna, i campi restano
          var html = info ? res : '✓ Registrato.' + (typeof res === 'string' ? res : righeScrittura(res));
          if (dopo && !info) { dopo(); out = radice.querySelector('#' + prefisso + '-esito') || out; }   // la pagina si ridisegna: il messaggio resta
          esito(out, true, html);
        } catch (e) { esito(out, false, '⛔ ' + esc(e.message)); }
      });
    });
  }
  function giornale(S) {
    var regs = S.registrazioni.slice().reverse();
    return regs.length ? regs.map(function (r) { return righeScrittura(r); }).join('') : '<p class="lab-vuoto">Ancora nessuna scrittura.</p>';
  }
  function bilancio(S) {
    var conti = {};
    S.registrazioni.forEach(function (r) { r.righe.forEach(function (x) { conti[x.conto] = (conti[x.conto] || 0) + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }); });
    var righe = S.pianoDeiConti.slice().sort(function (x, y) { return String(x.codice).localeCompare(String(y.codice), 'it', {numeric: true}); }).filter(function (c) { return Math.abs(conti[c.codice] || 0) > 0.004; }).map(function (c) {
      var v = r2(conti[c.codice]); return [c.codice, esc(c.nome), v > 0 ? eur(v) : '', v < 0 ? eur(-v) : ''];
    });
    var d = 0, a = 0; Object.keys(conti).forEach(function (k) { if (conti[k] > 0) d += conti[k]; else a -= conti[k]; });
    righe.push({cls: 'tot', celle: ['', 'Totali', eur(d), eur(a)]});
    return tabella(['Conto', 'Descrizione', 'Dare›', 'Avere›'], righe);
  }

  window.LabMotore = {crea: crea, MATERIALI: MATERIALI, FINITI: FINITI, TARIFFA: TARIFFA, costoStd: costoStd, ciclo: ciclo, esplodi: esplodi,
    r2: r2, eur: eur, n0: n0, fd: fd, fmtQ: fmtQ, esc: esc, tabella: tabella, scheda: scheda, modulo: modulo, collega: collega,
    righeScrittura: righeScrittura, giornale: giornale, bilancio: bilancio, fineMese: fineMese, statoVuoto: statoVuoto, num: num, dataOk: dataOk};
})();
