/* Laboratorio sul documento effettivamente contabilizzato, non su risposte fisse.
   Non invoca mai post(): tentativi e aiuti non modificano giornale o mastri. */
(function () {
  'use strict';
  function pendente(S) { return S.msaRagioneria && S.msaRagioneria.coda && S.msaRagioneria.coda[0]; }
  function righe(q) {
    return q.documento.righe.map(function (x, i) { return {x:x, i:i}; })
      .sort(function (a,b) { return String(a.x.conto).localeCompare(String(b.x.conto), 'it', {numeric:true}) || a.i-b.i; })
      .map(function (v) { return v.x; });
  }
  function importo(s) {
    s = String(s == null ? '' : s).trim().replace(/\s/g, '');
    if (!s) return null;
    if (s.indexOf(',') >= 0) {
      if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(s)) return null;
      s = s.replace(/\./g,'').replace(',','.');
    } else if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) s = s.replace(/\./g,'');
    else if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return null;
    var parti = s.split('.'), n = Number(parti[0])*100 + Number(((parti[1] || '')+'00').slice(0,2));
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  function euro(n) { return Number(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function etichetta(c) { return c.codice+' · '+(c.nome || c.descrizione || ''); }
  function identifica(S, valore) {
    var testo = String(valore || '').trim(), piano = S.pianoDeiConti || [];
    var codice = piano.find(function(c) { return String(c.codice) === testo; });
    if (codice) return String(codice.codice);
    var candidati = piano.filter(function(c) {
      return etichetta(c).toLocaleLowerCase('it') === testo.toLocaleLowerCase('it') ||
        String(c.nome || c.descrizione || '').toLocaleLowerCase('it') === testo.toLocaleLowerCase('it');
    });
    // Descrizioni omonime non identificano un conto: occorre scegliere il codice.
    return candidati.length === 1 ? String(candidati[0].codice) : testo;
  }
  function vuota(a) { return !a || (!String(a.conto || '').trim() && !a.sezione && !String(a.importo == null ? '' : a.importo).trim()); }
  function piene(risposte) { return (risposte || []).filter(function (a) { return !vuota(a); }); }
  function gruppiAttesi(q) {
    var g = {};
    righe(q).forEach(function(r) {
      var k = String(r.conto)+'|'+r.dareAvere;
      (g[k] = g[k] || []).push(Math.round(Number(r.importo)*100));
    });
    return g;
  }
  /* Per ogni conto e sezione la risposta è giusta in due modi:
     - riga per riga come il documento (un dipendente, un cespite per riga): multinsieme, ogni riga
       consuma una sola occorrenza, duplicati intercambiabili ma mai eliminabili;
     - una sola riga con il TOTALE del conto in quella sezione, come la scrittura riepilogativa del
       libro di testo (D 80 Salari 7.529,17 invece di tre righe per dipendente).
     Aggregazioni parziali o importi inventati che danno lo stesso totale restano errori. */
  function confronta(q) {
    var attese = gruppiAttesi(q), conti = {}, perGruppo = {}, errori = [], mancanti = false;
    Object.keys(attese).forEach(function(k) { conti[k.split('|')[0]] = true; });
    (q.risposte || []).forEach(function(a, i) {
      errori[i] = '';
      if (vuota(a)) return;
      var k = String(a.conto)+'|'+a.sezione;
      (perGruppo[k] = perGruppo[k] || []).push({i:i, c:importo(a.importo)});
    });
    Object.keys(perGruppo).forEach(function(k) {
      var date = perGruppo[k], att = attese[k];
      if (!att) {
        // il conto c'è ma nell'altra sezione: se quella è già scritta, questa riga è in eccesso
        var c = k.split('|')[0], altra = c+'|'+(k.split('|')[1] === 'DARE' ? 'AVERE' : 'DARE');
        date.forEach(function(d) { errori[d.i] = conti[c] && !perGruppo[altra] ? 'Sezione non corretta per questo conto.' : 'Conto non corretto o riga in eccesso.'; });
        return;
      }
      var totale = att.reduce(function(s, c) { return s + c; }, 0);
      if (date.length === 1 && date[0].c === totale) return;
      var usate = [];
      date.forEach(function(d) {
        var j = att.findIndex(function(c, n) { return !usate[n] && Number.isSafeInteger(c) && c === d.c; });
        if (j >= 0) usate[j] = true;
        else errori[d.i] = 'Importo non corretto per conto e sezione: scrivi le righe del documento una per una oppure un’unica riga con il totale del conto.';
      });
      if (att.some(function(c, n) { return !usate[n]; }) && date.every(function(d) { return !errori[d.i]; })) mancanti = true;
    });
    Object.keys(attese).forEach(function(k) { if (!perGruppo[k]) mancanti = true; });
    errori.mancanti = mancanti;
    return errori;
  }
  // I vecchi quiz mostravano già i conti: un tentativo storico completo conserva
  // il suo valore, ma un vecchio clic vuoto non sblocca alcun documento.
  // Le righe vuote si ignorano: chi scrive la scrittura riepilogativa (un totale per conto) ne usa meno.
  // Servono almeno tante righe complete quanti sono i conti/sezioni del documento.
  function compilato(q, risposte, S) {
    var rs = (q.documento || {}).righe || [], usate = piene(risposte);
    if (!rs.length || !Array.isArray(risposte) || usate.length < Object.keys(gruppiAttesi(q)).length) return false;
    return usate.every(function (a) {
      return (a.sezione === 'DARE' || a.sezione === 'AVERE') && importo(a.importo) !== null &&
        (q.versioneTentativo !== 2 || (!!a.conto && (!S || (S.pianoDeiConti || []).some(function (c) { return String(c.codice) === String(a.conto); }))));
    });
  }
  function tentativoValido(q) {
    if (!q) return false;
    if (q.tentato === true && (q.cronologiaTentativi || []).some(function (t) { return compilato(q, t.risposte); })) return true;
    return q.versioneTentativo !== 2 && q.tentativi > 0 && compilato(q, q.risposte);
  }
  function bloccati(S) { return ((S.msaRagioneria || {}).coda || []).filter(function (q) { return !tentativoValido(q); }); }
  function stessoDocumento(r, q) {
    var d = q.documento || {};
    return d.id != null && r.id != null ? String(d.id) === String(r.id) : String(d.numero) === String(r.numero);
  }
  function visibili(S) {
    var qs = bloccati(S);
    return (S.registrazioni || []).filter(function (r) { return !qs.some(function (q) { return stessoDocumento(r, q); }); });
  }
  function conservaTentativoStorico(q) {
    if (q.versioneTentativo === 2 || !tentativoValido(q)) return;
    var vecchie = JSON.parse(JSON.stringify(q.risposte));
    vecchie.forEach(function(a,i) { a.conto = a.conto || String(righe(q)[i].conto); });
    (q.cronologiaTentativi=q.cronologiaTentativi || []).push({risposte:vecchie,errori:(q.errori || []).slice(),corretto:!!q.corretto,storico:true});
    q.tentato=true;
    q.versioneTentativo=2;
  }
  function conto(S, x) {
    var c = (S.pianoDeiConti || []).find(function (c) { return String(c.codice) === String(x.conto); });
    return x.conto + ' · ' + (c ? c.nome : 'Conto del documento') + (x.partner ? ' · Partner ' + x.partner : '');
  }
  function html(S, esc) {
    var q = pendente(S), rs = righe(q), coda = S.msaRagioneria.coda.length;
    var valutato = tentativoValido(q), concluso = valutato && (q.corretto || q.aiuto);
    var h = '<section class="msa-ragioneria"><div class="msa-g-gruppo">Laboratorio di ragioneria · documento 1 di '+coda+'</div>' +
      '<h3>Ricostruisci la scrittura</h3><div class="msa-g-esito">⚠️ <b>ATTENZIONE, L’OPERAZIONE CHE HAI FATTO MOVIMENTA LIBRO GIORNALE E MASTRI.</b><br>Prova a vedere se riesci a ricostruirla da te.</div>' +
      '<p class="msa-q-info">Documento '+esc(q.documento.numero || q.documento.id)+' · '+esc(q.documento.data)+'<br>'+esc(q.documento.descrizione || q.documento.tipo)+'</p>' +
      '<p>Cerca ciascun conto per <b>codice o descrizione</b>, scegli <b>Dare o Avere</b> e indica l’<b>importo in euro</b>. Le righe possono essere inserite in qualsiasi ordine. La scrittura è già registrata: questa prova non la registra una seconda volta.</p>' +
      '<p class="msa-q-info">Il programma registra una riga per ogni dipendente, cespite o centro di costo. Puoi ricostruirla <b>riga per riga</b> come nel giornale oppure in forma <b>riepilogativa</b>, con un’unica riga per conto e sezione con il totale (come nella scrittura dell’esercizio): le righe che non ti servono lasciale vuote.</p>';
    rs.forEach(function (r,i) {
      var a = (q.risposte || [])[i] || {}, f = (q.errori || [])[i];
      var scelto = a.conto || (q.versioneTentativo !== 2 && valutato ? r.conto : '');
      h += '<fieldset class="msa-q-riga" data-riga="'+i+'"><legend>Riga '+(i+1)+'</legend>' +
        '<label>Sezione<select class="msa-q-sezione" aria-label="Dare o Avere, riga '+(i+1)+'" '+(concluso ? 'disabled' : '')+'>' +
        '<option value="">Scegli…</option><option value="DARE" '+(a.sezione==='DARE'?'selected':'')+'>Dare</option><option value="AVERE" '+(a.sezione==='AVERE'?'selected':'')+'>Avere</option></select></label>' +
        '<label>Importo €<input class="msa-q-importo" inputmode="decimal" autocomplete="off" placeholder="es. 1.234,56" aria-label="Importo, riga '+(i+1)+'" value="'+esc(a.importo || '')+'" '+(concluso ? 'disabled' : '')+'></label>' +
        '<label style="grid-column:1/-1">Conto — cerca codice o descrizione<input type="search" class="msa-q-conto" list="msa-q-conti-'+i+'" autocomplete="off" placeholder="Digita codice o descrizione…" aria-label="Conto, riga '+(i+1)+'" value="'+esc(scelto)+'" '+(concluso ? 'disabled' : '')+'>' +
        '<datalist id="msa-q-conti-'+i+'">'+(S.pianoDeiConti || []).slice().sort(function(a,b) {
          return String(a.codice).localeCompare(String(b.codice),'it',{numeric:true});
        }).map(function(c) { return '<option value="'+esc(etichetta(c))+'">'+esc(etichetta(c))+'</option>'; }).join('')+'</datalist></label>' +
        (f ? '<small class="msa-q-errore">'+esc(f)+'</small>' : '')+'</fieldset>';
    });
    if (q.tentativi) h += '<p class="msa-q-totali">Il tuo totale Dare: '+euro((q.totali || {}).dare/100 || 0)+' €<br>Il tuo totale Avere: '+euro((q.totali || {}).avere/100 || 0)+' €<br>Tentativi: '+q.tentativi+'</p>';
    if (q.corretto && valutato) h += '<div class="msa-g-esito ok">✓ Corretto: conti, sezioni e importi corrispondono al documento registrato. La scrittura quadra.</div>';
    else if (q.aiuto && valutato) h += '<div class="msa-g-esito">Soluzione consultata: prova registrata come svolta con aiuto, non come risposta autonoma corretta.</div>';
    if (q.aiuto && valutato) {
      h += '<table class="msa-q-soluzione"><caption>Scrittura effettiva nel giornale</caption><thead><tr><th>Conto</th><th>Dare</th><th>Avere</th></tr></thead><tbody>';
      rs.forEach(function (r) { h += '<tr><td>'+esc(conto(S,r))+'</td><td>'+(r.dareAvere==='DARE'?euro(r.importo):'—')+'</td><td>'+(r.dareAvere==='AVERE'?euro(r.importo):'—')+'</td></tr>'; });
      h += '</tbody></table>';
    }
    h += '<p class="msa-q-messaggio" role="status">'+esc(q.messaggio || '')+'</p>';
    if (!concluso) h += '<button type="button" class="msa-q-verifica">Verifica la mia scrittura</button>' + (valutato ? '<button type="button" class="msa-q-aiuto">Mostra soluzione (con aiuto)</button>' : '');
    else h += '<button type="button" class="msa-q-continua">'+(coda>1?'Prossima scrittura ➜':'Prosegui con l’esercizio ➜')+'</button>';
    return h+'<p class="msa-q-info">Prima compila conti, sezioni e importi di tutte le righe e invia un tentativo valutabile: solo allora puoi confrontarlo con giornale, mastri e soluzione, anche se è errato. I suggerimenti mostrano l’intero piano dei conti, non la risposta attesa. Il controllo confronta il documento del simulatore e non certifica il modello SAP.</p></section>';
  }
  function leggi(corpo,S) {
    return Array.prototype.map.call(corpo.querySelectorAll('.msa-q-riga'), function (r) {
      return {conto:identifica(S,r.querySelector('.msa-q-conto').value), sezione:r.querySelector('.msa-q-sezione').value, importo:r.querySelector('.msa-q-importo').value};
    });
  }
  function persisti(S, salva, cambia) {
    var prima = JSON.stringify(S.msaRagioneria);
    try { cambia(); salva(); return true; }
    catch(e) { S.msaRagioneria = JSON.parse(prima); return false; }
  }
  function erroreSalvataggio(corpo) {
    var m = corpo.querySelector('.msa-q-messaggio');
    if (m) m.textContent = 'Salvataggio non riuscito: nessun esito acquisito. Conserva un backup e riprova.';
  }
  function bozza(corpo,S,salva) {
    var q=pendente(S); if (!q || (tentativoValido(q) && (q.corretto || q.aiuto))) return;
    if (!persisti(S,salva,function(){conservaTentativoStorico(q);q.versioneTentativo=2;q.risposte=leggi(corpo,S);})) erroreSalvataggio(corpo);
  }
  function click(t,corpo,S,salva) {
    var q=pendente(S); if (!q) return false;
    var verifica=t.classList.contains('msa-q-verifica'), aiuto=t.classList.contains('msa-q-aiuto'), avanti=t.classList.contains('msa-q-continua');
    if (!verifica && !aiuto && !avanti) return false;
    if (avanti && (!tentativoValido(q) || (!q.corretto && !q.aiuto))) return false;
    if (aiuto && !tentativoValido(q)) return false;
    var ok=persisti(S,salva,function(){
      if (verifica && (!tentativoValido(q) || (!q.corretto && !q.aiuto))) {
        // Migrazione non distruttiva del primo tentativo storico completo.
        conservaTentativoStorico(q);
        if (!tentativoValido(q)) { q.corretto=false; q.aiuto=false; }
        q.risposte=leggi(corpo,S); q.versioneTentativo=2;
        if (!compilato(q,q.risposte,S)) {
          var poche = piene(q.risposte).length < Object.keys(gruppiAttesi(q)).length;
          q.errori=q.risposte.map(function(a) { return vuota(a) ? (poche ? 'Riga vuota: servono altre righe.' : '') : (!a.conto || !(S.pianoDeiConti || []).some(function(c) { return String(c.codice) === String(a.conto); }) || (a.sezione!=='DARE' && a.sezione!=='AVERE') || importo(a.importo)===null ? 'Scegli un conto valido e completa sezione e importo positivo (massimo due decimali).' : ''); });
          q.messaggio='Tentativo non acquisito: ogni riga usata va completata e serve almeno una riga per ogni conto e sezione del documento. La consultazione resta bloccata.';
          return;
        }
        q.tentativi=(q.tentativi || 0)+1;
        q.totali={dare:0,avere:0};
        piene(q.risposte).forEach(function(a) { q.totali[a.sezione==='DARE'?'dare':'avere']+=importo(a.importo); });
        var esame=confronta(q);
        q.errori=esame.slice();
        q.corretto=q.errori.every(function(e){return !e;}) && !esame.mancanti;
        q.tentato=true;
        (q.cronologiaTentativi=q.cronologiaTentativi || []).push({risposte:JSON.parse(JSON.stringify(q.risposte)),errori:q.errori.slice(),corretto:q.corretto,totali:JSON.parse(JSON.stringify(q.totali)),inviatoIl:new Date().toISOString()});
        q.messaggio=q.corretto?'Ottimo: ora puoi proseguire.':(esame.mancanti && q.errori.every(function(e){return !e;}) ?
          'Le righe scritte sono giuste ma ne manca almeno una: controlla che ci siano tutti i conti (o tutte le righe del documento).' :
          'Riprova: anche una scrittura in pareggio può usare sezioni o importi sbagliati.');
      } else if(aiuto) { q.aiuto=true; q.messaggio='Confronta la soluzione con il tuo tentativo e spiega il motivo delle sezioni.'; }
      else if(avanti) {
        S.msaRagioneria.esiti.push({chiave:q.chiave,documento:q.documento.numero || q.documento.id,data:q.documento.data,tipo:q.documento.tipo,
          tentativi:q.tentativi,tentato:tentativoValido(q),corretto:!!q.corretto,conAiuto:!!q.aiuto,risposte:q.risposte,cronologiaTentativi:q.cronologiaTentativi || [],completatoIl:new Date().toISOString()});
        S.msaRagioneria.coda.shift();
      }
    });
    if(!ok) erroreSalvataggio(corpo);
    else window.dispatchEvent(new CustomEvent('msa:quiz-aggiornato'));
    return ok;
  }
  window.MSA_RAGIONERIA={pendente:pendente,html:html,click:click,bozza:bozza,importo:importo,
    tentativoValido:tentativoValido,bloccati:bloccati,visibili:visibili,protetto:function(S){return bloccati(S).length>0;}};
  window.dispatchEvent(new CustomEvent('msa:quiz-pronto'));
})();
