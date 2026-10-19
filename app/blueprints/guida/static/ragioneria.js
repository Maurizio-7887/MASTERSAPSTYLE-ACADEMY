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
    var n = Number(s);
    return Number.isFinite(n) && n > 0 && n <= Number.MAX_SAFE_INTEGER/100 ? Math.round(n*100) : null;
  }
  function euro(n) { return Number(n).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  // I vecchi quiz mostravano già i conti: un tentativo storico completo conserva
  // il suo valore, ma un vecchio clic vuoto non sblocca alcun documento.
  function compilato(q, risposte, S) {
    var rs = (q.documento || {}).righe || [];
    return !!rs.length && Array.isArray(risposte) && risposte.length === rs.length && risposte.every(function (a) {
      return a && (a.sezione === 'DARE' || a.sezione === 'AVERE') && importo(a.importo) !== null &&
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
      '<p>Per ciascun conto scegli <b>Dare o Avere</b> e indica l’<b>importo in euro</b>. La scrittura è già registrata: questa prova non la registra una seconda volta.</p>';
    rs.forEach(function (r,i) {
      var a = (q.risposte || [])[i] || {}, f = (q.errori || [])[i];
      h += '<fieldset class="msa-q-riga" data-riga="'+i+'"><legend>Riga '+(i+1)+'</legend>' +
        '<label>Conto<select class="msa-q-conto" aria-label="Conto, riga '+(i+1)+'" '+(concluso ? 'disabled' : '')+'><option value="">Scegli un conto…</option>' +
        (S.pianoDeiConti || []).map(function(c) { var scelto = a.conto || (q.versioneTentativo !== 2 && q.risposte && q.risposte.length ? r.conto : ''); return '<option value="'+esc(c.codice)+'" '+(String(scelto)===String(c.codice)?'selected':'')+'>'+esc(c.codice+' · '+c.nome)+'</option>'; }).join('')+'</select></label>' +
        '<label>Sezione<select class="msa-q-sezione" aria-label="Dare o Avere, riga '+(i+1)+'" '+(concluso ? 'disabled' : '')+'>' +
        '<option value="">Scegli…</option><option value="DARE" '+(a.sezione==='DARE'?'selected':'')+'>Dare</option><option value="AVERE" '+(a.sezione==='AVERE'?'selected':'')+'>Avere</option></select></label>' +
        '<label>Importo €<input class="msa-q-importo" inputmode="decimal" autocomplete="off" placeholder="es. 1.234,56" aria-label="Importo, riga '+(i+1)+'" value="'+esc(a.importo || '')+'" '+(concluso ? 'disabled' : '')+'></label>' +
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
    return h+'<p class="msa-q-info">Prima compila conti, sezioni e importi di tutte le righe e invia un tentativo valutabile: solo allora puoi confrontarlo con giornale, mastri e soluzione, anche se è errato. Ordina i conti per codice crescente. Il controllo confronta il documento del simulatore e non certifica il modello SAP.</p></section>';
  }
  function leggi(corpo) {
    return Array.prototype.map.call(corpo.querySelectorAll('.msa-q-riga'), function (r) {
      return {conto:r.querySelector('.msa-q-conto').value, sezione:r.querySelector('.msa-q-sezione').value, importo:r.querySelector('.msa-q-importo').value};
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
    if (!persisti(S,salva,function(){conservaTentativoStorico(q);q.versioneTentativo=2;q.risposte=leggi(corpo);})) erroreSalvataggio(corpo);
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
        q.risposte=leggi(corpo); q.versioneTentativo=2;
        if (!compilato(q,q.risposte,S)) {
          q.errori=q.risposte.map(function(a) { return !a.conto || (a.sezione!=='DARE' && a.sezione!=='AVERE') || importo(a.importo)===null ? 'Completa conto, sezione e importo positivo (massimo due decimali).' : ''; });
          q.messaggio='Tentativo non acquisito: completa tutte le righe. La consultazione resta bloccata.';
          return;
        }
        q.tentativi=(q.tentativi || 0)+1;
        q.totali={dare:0,avere:0};
        q.errori=righe(q).map(function(r,i){
          var a=q.risposte[i] || {}, n=importo(a.importo), errori=[];
          if (String(a.conto)!==String(r.conto)) errori.push('Conto non corretto (usa ordine crescente di codice).');
          if (a.sezione!=='DARE' && a.sezione!=='AVERE') errori.push('Scegli Dare o Avere.');
          else { if (n!==null) q.totali[a.sezione==='DARE'?'dare':'avere']+=n; if(a.sezione!==r.dareAvere) errori.push('Sezione non corretta.'); }
          if(n===null) errori.push('Inserisci un importo positivo con massimo due decimali.');
          else if(n!==Math.round(r.importo*100)) errori.push('Importo non corretto.');
          return errori.join(' ');
        });
        q.corretto=q.errori.every(function(e){return !e;});
        q.tentato=true;
        (q.cronologiaTentativi=q.cronologiaTentativi || []).push({risposte:JSON.parse(JSON.stringify(q.risposte)),errori:q.errori.slice(),corretto:q.corretto,totali:JSON.parse(JSON.stringify(q.totali)),inviatoIl:new Date().toISOString()});
        q.messaggio=q.corretto?'Ottimo: ora puoi proseguire.':'Riprova: anche una scrittura in pareggio può usare sezioni o importi sbagliati.';
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
