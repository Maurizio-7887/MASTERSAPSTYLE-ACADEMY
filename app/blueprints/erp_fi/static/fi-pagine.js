/* SISTEMA INTEGRATO — Contabilità: libro giornale (FB03), bilancio di verifica (F.08), fattura elettronica (SdI) e storni di tutti i moduli. */
(function () {
  'use strict';
  var L = window.LabMotore, SD = window.SD4, ST = window.ST4, U = window.S4UI, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, fd = L.fd, S = function () { return N.S; };
  var avviso = function () { return U && U.avviso ? U.avviso(S()) : ''; };
  var nomeCli = function (c) { return (S().clienti[c] || {}).nome || c; };
  var opz = function (lista, vuoto) { return lista.length ? lista : [['', vuoto || '— nessun documento —']]; };
  // Il quiz è incluso dopo questo renderer. Fallback iniziale fail-closed,
  // uguale al contratto MSA_RAGIONERIA, senza fidarsi del vecchio contatore.
  function compilato(q, as) {
    var rs = (q.documento || {}).righe || [];
    return rs.length > 0 && Array.isArray(as) && as.length === rs.length && as.every(function (a) {
      if (!a || ['DARE', 'AVERE'].indexOf(a.sezione) < 0 || (q.versioneTentativo === 2 && !a.conto)) return false;
      var s = String(a.importo == null ? '' : a.importo).trim().replace(/\s/g, '');
      if (s.indexOf(',') >= 0) { if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(s)) return false; s = s.replace(/\./g, '').replace(',', '.'); }
      else if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
      else if (!/^\d+(?:\.\d{1,2})?$/.test(s)) return false;
      return Number(s) > 0 && Number(s) <= Number.MAX_SAFE_INTEGER / 100;
    });
  }
  function bloccati() {
    if (window.MSA_RAGIONERIA) return window.MSA_RAGIONERIA.bloccati(S());
    return ((S().msaRagioneria || {}).coda || []).filter(function (q) {
      return !(q.tentato === true && (q.cronologiaTentativi || []).some(function (t) { return compilato(q, t.risposte); })) &&
        !(q.versioneTentativo !== 2 && q.tentativi > 0 && compilato(q, q.risposte));
    });
  }
  function registrazioni() {
    var qs = bloccati();
    return S().registrazioni.filter(function (r) { return !qs.some(function (q) { var d = q.documento || {}; return d.id != null && r.id != null ? String(d.id) === String(r.id) : String(d.numero) === String(r.numero); }); });
  }
  function totali(rs) {
    return rs.reduce(function (t, x) { t[x.dareAvere === 'DARE' ? 'dare' : 'avere'] += Math.round(Number(x.importo) * 100); return t; }, {dare:0, avere:0});
  }
  function movimenti(regs, codice) {
    var saldo = 0, out = [];
    regs.map(function (r, i) { return {r:r, i:i}; }).sort(function (a, b) { return String(a.r.data).localeCompare(String(b.r.data)) || a.i - b.i; }).forEach(function (v) {
      v.r.righe.forEach(function (x) { if (String(x.conto) !== String(codice)) return;
        saldo += (x.dareAvere === 'DARE' ? 1 : -1) * Math.round(x.importo * 100);
        out.push({documento:v.r, riga:x, saldo:saldo});
      });
    });
    return out;
  }
  window.FI_DIDATTICA = {totali:totali, movimenti:movimenti, registrazioni:registrazioni};
  function base() { return location.pathname.replace(/\/contabilita-s4(?:\/.*)?$/, '/contabilita-s4/'); }
  function docId(r) { return 'fi-doc-' + encodeURIComponent(r.numero); }
  function navigazione() { return '<nav class="fi-nav" aria-label="Consultazione contabile"><a href="'+e(base())+'">Libro giornale</a><a href="'+e(base()+'mastro')+'">Mastrini per conto</a></nav>'; }
  function blocco() { var n = bloccati().length; return n ? '<p class="fi-avviso" role="status">'+n+' documenti esclusi: prima invia un tentativo completo e valutabile nel laboratorio di ragioneria. Anche saldi e totali sotto riportati escludono questi documenti e non rappresentano il saldo completo.</p>' : ''; }
  function contoNome(codice) { var c = (S().pianoDeiConti || []).find(function (x) { return String(x.codice) === String(codice); }); return codice + (c ? ' · '+c.nome : ''); }
  function importi(x) { return '<td class="fi-importo">'+(x.dareAvere === 'DARE' ? eur(x.importo) : '—')+'</td><td class="fi-importo">'+(x.dareAvere === 'AVERE' ? eur(x.importo) : '—')+'</td>'; }
  function tabella(titolo, teste, corpo, piede) { return '<div class="fi-scroll" tabindex="0" role="region" aria-label="'+e(titolo)+'"><table class="fi-tabella"><caption>'+e(titolo)+'</caption><thead><tr>'+teste.map(function (t) { return '<th scope="col"'+(['Dare €','Avere €','Saldo progressivo €'].indexOf(t)>=0?' class="fi-importo"':'')+'>'+t+'</th>'; }).join('')+'</tr></thead><tbody>'+corpo+'</tbody>'+(piede?'<tfoot>'+piede+'</tfoot>':'')+'</table></div>'; }
  var PAGINE = {
    prima_nota: function () {
      var conti = (S().pianoDeiConti || []).slice().sort(function(a,b){return String(a.codice).localeCompare(String(b.codice),'it',{numeric:true});});
      var opt = '<option value="">Seleziona conto Co.Ge.</option>' + conti.map(function(c){return '<option value="'+e(c.codice)+'">'+e(c.codice+' · '+c.nome)+'</option>';}).join('');
      var today = new Date().toISOString().slice(0,10);
      radice.innerHTML = navigazione() +
        '<section class="fi-fiori"><header class="fi-fiori-head"><small>Contabilità finanziaria / General Ledger</small><h2>Post General Journal Entries <span>F0718</span></h2><p>Prima Nota libera · registrazione manuale sul libro giornale integrato</p></header>' +
        '<form id="fi-free-form"><fieldset><legend>Dati di testata</legend><div class="fi-fiori-fields"><label>Data documento<input name="dataDoc" type="date" value="'+today+'" required></label><label>Data registrazione<input name="data" type="date" value="'+today+'" required></label><label>Tipo documento<select name="tipo"><option value="SA">SA · Contabilità generale</option></select></label><label>Valuta<input value="EUR" readonly aria-label="Valuta EUR"></label><label class="fi-wide">Testo testata<input name="descrizione" maxlength="160" required placeholder="Descrizione della registrazione"></label><label>Riferimento<input name="rif" maxlength="60" placeholder="Riferimento facoltativo"></label></div></fieldset>' +
        '<fieldset><legend>Posizioni contabili</legend><div class="fi-scroll"><table class="fi-tabella" id="fi-free-rows"><thead><tr><th>Pos.</th><th>Conto Co.Ge.</th><th>Dare / Avere</th><th>Importo EUR</th><th>Testo posizione</th><th></th></tr></thead><tbody></tbody></table></div><button type="button" class="lab-btn sec" id="fi-free-add">+ Aggiungi posizione</button></fieldset>' +
        '<div class="fi-free-summary" role="status" id="fi-free-total">Dare 0,00 € · Avere 0,00 €</div><p id="fi-free-msg" role="status"></p><button type="button" class="lab-btn sec" id="fi-free-check">Simula / Verifica</button> <button type="submit" class="lab-btn" id="fi-free-post">Registra documento</button> <a class="lab-btn sec" href="'+e(base())+'">Manage Journal Entries (F0717A)</a></form></section>';
      var form = radice.querySelector('#fi-free-form'), tbody = radice.querySelector('#fi-free-rows tbody');
      function add() {
        var tr=document.createElement('tr'); tr.innerHTML='<td class="fi-pos"></td><td><select class="fi-conto" required>'+opt+'</select></td><td><select class="fi-da"><option value="DARE">Dare</option><option value="AVERE">Avere</option></select></td><td><input class="fi-val" type="number" min="0.01" step="0.01" required placeholder="0,00"></td><td><input class="fi-testo" maxlength="120" placeholder="Testo riga"></td><td><button type="button" class="fi-remove" aria-label="Rimuovi posizione">×</button></td>';
        tbody.appendChild(tr); tr.querySelector('.fi-remove').onclick=function(){if(tbody.rows.length>2){tr.remove(); renumber(); calculate();}};
        renumber(); calculate();
      }
      function renumber(){Array.prototype.forEach.call(tbody.rows,function(tr,i){tr.querySelector('.fi-pos').textContent=String(i+1);});}
      function calculate(){
        var d=0,a=0;Array.prototype.forEach.call(tbody.rows,function(tr){var v=Math.round(Number(tr.querySelector('.fi-val').value||0)*100);if(tr.querySelector('.fi-da').value==='DARE')d+=v;else a+=v;});
        var ok=d>0&&d===a;radice.querySelector('#fi-free-total').textContent='Dare '+eur(d/100)+' € · Avere '+eur(a/100)+' € · Differenza '+eur((d-a)/100)+' €'+(ok?' · ✓ Quadrato':' · Da quadrare');return ok;
      }
      function v0(n){var el=form.querySelector('[name="'+n+'"]');return el?el.value:'';}
      function collect(){
        if(!form.reportValidity())throw Error('Completa i campi obbligatori.');
        if(tbody.rows.length<2)throw Error('Inserisci almeno due posizioni.');
        var rows=Array.prototype.map.call(tbody.rows,function(tr){var conto=tr.querySelector('.fi-conto').value,imp=Number(tr.querySelector('.fi-val').value);if(!conto||!Number.isFinite(imp)||imp<=0)throw Error('Conto e importo positivo obbligatori per ogni posizione.');return {conto:conto,dareAvere:tr.querySelector('.fi-da').value,importo:imp,testo:tr.querySelector('.fi-testo').value};});
        if(!calculate())throw Error('Documento non quadrato: il totale Dare deve coincidere con Avere.');
        // strafalcioni ragionieristici: la prima nota libera li blocca prima della registrazione
        rows.forEach(function(r){
          if((r.conto==='47'||r.conto==='49')) throw Error('Il conto '+r.conto+' (sconti, resi e abbuoni su vendite) non si muove con la prima nota libera: lo sconto commerciale è già nella fattura (ZSCA) e un abbuono o un reso si registrano con la nota di credito (VA01 G2 / reso), che corregge anche l\'IVA. Uno sconto non è mai un ricavo.');
          if(r.conto==='40'&&r.dareAvere==='DARE'&&/sconto|abbuono|reso|nota di credito/i.test(r.testo+' '+v0('descrizione'))) throw Error('Uno sconto, un abbuono o un reso non si addebita ai ricavi di vendita (conto 40): usa la nota di credito, che muove i conti rettificativi e l\'IVA.');
          if(/sconto|abbuono/i.test(r.testo+' '+v0('descrizione'))&&/pronto pagamento|cassa/i.test(r.testo+' '+v0('descrizione'))&&(r.conto==='40'||r.conto==='48')) throw Error('Lo sconto cassa (pronto pagamento) è un onere finanziario, non una riduzione dei ricavi di vendita.');
        });
        var v=new FormData(form);if(v.get('data')<v.get('dataDoc'))throw Error('La data di registrazione non può precedere la data documento.');
        return {data:v.get('data'),tipo:'SA',descrizione:v.get('descrizione'),rif:v.get('rif'),righe:rows,quiz:false};
      }
      radice.querySelector('#fi-free-add').onclick=add;
      tbody.addEventListener('input',calculate);tbody.addEventListener('change',calculate);
      radice.querySelector('#fi-free-check').onclick=function(){try{collect();radice.querySelector('#fi-free-msg').textContent='✓ Simulazione valida: documento quadrato, pronto per la registrazione.';}catch(err){radice.querySelector('#fi-free-msg').textContent='⚠ '+err.message;}};
      form.onsubmit=function(ev){ev.preventDefault();try{var reg=collect();var doc=N.post(reg);if(!doc)throw Error('Documento senza posizioni.');N.salva();if(window.MSA_SALVA)window.MSA_SALVA();radice.querySelector('#fi-free-msg').innerHTML='✓ Documento <b>'+e(doc.numero)+'</b> registrato nel libro giornale. <a href="'+e(base())+'#'+docId(doc)+'">Apri documento</a>';form.querySelector('#fi-free-post').disabled=true;}catch(err){radice.querySelector('#fi-free-msg').textContent='⚠ '+err.message;}};
      add();add();tbody.rows[1].querySelector('.fi-da').value='AVERE';calculate();
    },
    giornale: function () {
      var regs = registrazioni(), totale = totali(regs.reduce(function (a, r) { return a.concat(r.righe); }, []));
      radice.innerHTML = navigazione()+blocco()+'<div class="fi-filtro"><label>Ricerca documenti <input id="fi-j-search" type="search" placeholder="Numero, causale, conto"></label> <label>Dal <input id="fi-j-from" type="date"></label> <label>Al <input id="fi-j-to" type="date"></label><p id="fi-j-count" role="status"></p></div>'+L.scheda('📚', 'Libro giornale (Manage Journal Entries F0717A)', 'Ricerca e consultazione documenti contabili', (regs.slice().reverse().map(function (r) {
        var t = totali(r.righe), righe = r.righe.map(function (x) { return '<tr><td><a href="'+e(base()+'mastro?conto='+encodeURIComponent(x.conto))+'">'+e(contoNome(x.conto))+'</a></td><td>'+e([x.partner,x.testo].filter(Boolean).join(' · '))+'</td>'+importi(x)+'</tr>'; }).join('');
        return '<article class="fi-documento fi-j-item" data-data="'+e(r.data)+'" data-query="'+e([r.numero,r.tipo,r.descrizione].concat(r.righe.map(function(x){return [x.conto,x.testo].join(' ');})).join(' ').toLowerCase())+'" id="'+e(docId(r))+'"><h3>Documento '+e(r.numero)+' · '+e(fd(r.data))+' · '+e(r.tipo)+'</h3><p>'+e(r.descrizione)+'</p>'+(r.stornato?'<p>Stornato dal '+e(r.stornato)+'</p>':'')+(r.stornoDi?'<p>Storno del '+e(r.stornoDi)+'</p>':'')+tabella('Scrittura documento '+r.numero, ['Conto / mastrino','Partner / descrizione','Dare €','Avere €'],righe,'<tr><th scope="row" colspan="2">Totali documento</th><td class="fi-importo">'+eur(t.dare/100)+'</td><td class="fi-importo">'+eur(t.avere/100)+'</td></tr>')+'<p class="fi-quadratura">'+(t.dare===t.avere?'✓ Documento quadrato: Dare = Avere.':'⚠ Documento NON quadrato. Differenza Dare − Avere: '+eur((t.dare-t.avere)/100)+' €.')+'</p></article>';
      }).join('') || '<p class="lab-vuoto">Nessuna scrittura consultabile.</p>')+'<p class="fi-quadratura">Totali giornale consultabile — Dare '+eur(totale.dare/100)+' € · Avere '+eur(totale.avere/100)+' € · '+(totale.dare===totale.avere?'Quadrato':'NON quadrato')+'</p>');
      function filtra() { var q=radice.querySelector('#fi-j-search').value.toLowerCase().trim(), da=radice.querySelector('#fi-j-from').value, a=radice.querySelector('#fi-j-to').value, n=0; Array.prototype.forEach.call(radice.querySelectorAll('.fi-j-item'),function(el){var ok=(!q||el.dataset.query.indexOf(q)>=0)&&(!da||el.dataset.data>=da)&&(!a||el.dataset.data<=a);el.hidden=!ok;if(ok)n++;});radice.querySelector('#fi-j-count').textContent=n+' documenti trovati su '+regs.length; }
      ['fi-j-search','fi-j-from','fi-j-to'].forEach(function(id){radice.querySelector('#'+id).addEventListener('input',filtra);});filtra();
    },
    mastro: function () {
      var regs = registrazioni(), conti = (S().pianoDeiConti || []).slice();
      regs.forEach(function (r) { r.righe.forEach(function (x) { if (!conti.some(function (c) { return String(c.codice)===String(x.conto); })) conti.push({codice:x.conto,nome:'Conto del documento'}); }); });
      conti.sort(function (a,b) { return String(a.codice).localeCompare(String(b.codice),'it',{numeric:true}); });
      var scelto = new URLSearchParams(location.search).get('conto') || (conti[0] || {}).codice || '', ms = movimenti(regs,scelto), t = totali(ms.map(function (m) { return m.riga; }));
      var righe = ms.map(function (m) { var r=m.documento,x=m.riga; return '<tr><td>'+e(fd(r.data))+'</td><td><a href="'+e(base()+'#'+docId(r))+'">'+e(r.numero)+'</a></td><td>'+e([r.descrizione,x.partner,x.testo].filter(Boolean).join(' · '))+'</td>'+importi(x)+'<td class="fi-importo">'+eur(Math.abs(m.saldo)/100)+' '+(m.saldo>0?'Dare':m.saldo<0?'Avere':'(zero)')+'</td></tr>'; }).join('');
      radice.innerHTML = navigazione()+blocco()+L.scheda('📖',e('Mastrino '+contoNome(scelto)),'FBL3N','<form class="fi-filtro" method="get"><label for="fi-conto">Conto</label> <select id="fi-conto" name="conto">'+conti.map(function (c) { return '<option value="'+e(c.codice)+'"'+(String(c.codice)===String(scelto)?' selected':'')+'>'+e(c.codice+' · '+c.nome)+'</option>'; }).join('')+'</select> <button type="submit" class="lab-btn">Mostra mastrino</button></form><p>Ordine cronologico per data; a parità di data, ordine originale del giornale. Saldo iniziale dei movimenti consultabili: 0,00 €.</p>'+tabella('Movimenti conto '+scelto,['Data','Documento / giornale','Descrizione','Dare €','Avere €','Saldo progressivo €'],righe || '<tr><td colspan="6">Nessun movimento consultabile.</td></tr>','<tr><th scope="row" colspan="3">Totali movimenti</th><td class="fi-importo">'+eur(t.dare/100)+'</td><td class="fi-importo">'+eur(t.avere/100)+'</td><td class="fi-importo">'+eur(Math.abs(t.dare-t.avere)/100)+' '+(t.dare>t.avere?'Dare':t.dare<t.avere?'Avere':'(zero)')+'</td></tr>'));
    },
    bilancio: function () { radice.innerHTML = L.scheda('⚖️', 'Bilancio di verifica', 'F.08', L.bilancio(S())); },
    sdi: function () {
      var docs = ST.documentiVendita(), daInviare = docs.filter(function (d) { return !d.rif.sdi && !d.rif.stornata; }), sel = radice.dataset.xml || (docs.slice(-1)[0] || {}).numero;
      radice.innerHTML = avviso() + '<div class="lab-griglia">' +
        L.scheda('📤', 'Trasmissione allo SdI', 'fattura elettronica · FatturaPA', L.modulo('sd', [['fattura', 'Documento di vendita', 'select', (daInviare[0] || {}).numero, opz(daInviare.map(function (d) { return [d.numero, d.numero + ' · ' + (d.tipo === 'F2' ? 'fattura' : 'nota di credito') + ' · ' + nomeCli(d.cliente) + ' · ' + eur(d.totale)]; }), '— tutto già trasmesso —')], ['data', 'Data di invio', 'date']], [['sd', 'Invia allo SdI']]) +
          '<p class="lab-nota">In Italia la fattura esiste fiscalmente solo quando passa dal <b>Sistema di Interscambio</b> dell\'Agenzia delle Entrate. Prima dell\'invio una fattura sbagliata si <b>storna</b> (VF11) e si rifà; <b>dopo l\'invio non si annulla più</b>: si corregge con una <b>nota di credito</b> (TD04), che va anch\'essa allo SdI.</p>') +
        L.scheda('🗂️', 'Anteprima del file XML', 'FPR12 · semplificato', '<div class="lab-filtro"><label>Documento <select id="xml">' + docs.map(function (d) { return '<option' + (d.numero === sel ? ' selected' : '') + '>' + d.numero + '</option>'; }).join('') + '</select></label></div>' +
          (sel ? '<pre class="lab-xml" style="white-space:pre-wrap;font-size:.75rem;max-height:22rem;overflow:auto">' + e(ST.fatturaPA(sel)) + '</pre>' : '<p class="lab-vuoto">Nessuna fattura.</p>')) + '</div>' +
        L.scheda('📋', 'Registro delle fatture emesse', 'VF05 · stato SdI', L.tabella(['Documento', 'Tipo', 'Data', 'Cliente', 'Totale›', 'Stato SdI'], docs.map(function (d) {
          var f = d.rif; return [d.numero, d.tipo === 'F2' ? 'TD01 fattura' : 'TD04 nota di credito (' + d.tipo + ')', fd(d.data), e(nomeCli(d.cliente)), eur(d.totale),
            f.stornata ? '<span class="lab-bd arancio">stornata ' + fd(f.stornata) + ' — non trasmessa</span>' : f.sdi ? '<span class="lab-bd verde">consegnata ' + fd(f.sdi.data) + ' · id ' + f.sdi.id + '</span>' : '<span class="lab-bd giallo">da trasmettere</span>']; }), 'Nessuna fattura emessa.'));
      L.collega(radice, 'sd', {sd: ST.inviaSdi}, rendi);
      var x = radice.querySelector('#xml'); if (x) x.onchange = function () { radice.dataset.xml = this.value; rendi(); };
    },
    storni: function () {
      var s = S(), regs = s.registrazioni;
      var fatture = s.fatture.filter(function (f) { return ['F2', 'RE', 'G2'].indexOf(f.tipo) >= 0 && !f.stornata; }).map(function (f) { return [f.numero, f.numero + ' · ' + f.tipo + ' · ' + nomeCli(f.cliente) + ' · ' + eur(f.totale) + (f.sdi ? ' · già allo SdI' : '')]; })
        .concat(((s.fx || {}).documenti || []).filter(function (d) { return d.lato === 'cliente' && !d.stornata; }).map(function (d) { return [d.numero, d.numero + ' · FB70 in ' + d.valuta + ' · ' + nomeCli(d.partner)]; }));
      var conPgi = s.consegne.filter(function (c) { return c.tipo === 'LF' && c.pgi !== false && !c.fatturata; }).map(function (c) { return [c.numero, c.numero + ' · ' + c.qta + ' pz ' + c.materiale + ' · ' + nomeCli(c.cliente)]; });
      var senzaPgi = s.consegne.filter(function (c) { return c.tipo === 'LF' && c.pgi === false; }).map(function (c) { return [c.numero, c.numero + ' · ' + c.qta + ' pz ' + c.materiale + ' · ' + nomeCli(c.cliente)]; });
      var entrate = []; s.acquisti.forEach(function (o) { (o.entrate || []).forEach(function (x) { if (!x.stornato) entrate.push([x.doc, x.doc + ' · ' + L.n0(x.qta) + ' ' + o.materiale + ' · ordine ' + o.numero + ' · ' + fd(x.data)]); }); });
      var ff = s.fattureFornitore.filter(function (f) { return !f.stornata; }).map(function (f) { return [f.numero, f.numero + ' · ' + (f.rif || 's.n.') + ' · ' + eur(f.totale)]; });
      var ev = []; s.produzione.filter(function (o) { return !o.liquidazione; }).forEach(function (o) { o.eventi.forEach(function (x, k) { if (x.stornato || x.tipo === 'KGI2') return;
        ev.push([o.numero + '|' + k, o.numero + ' · ' + {'261': 'prelievo 261 ' + L.n0(x.kg) + ' kg', CO11N: 'conferma ' + L.n0((x.attrezzaggio || 0) + x.ore) + ' h', '101': 'entrata 101 ' + x.qta + ' pz'}[x.tipo] + ' · ' + fd(x.data)]); }); });
      var compiti = s.wm ? s.wm.compiti.filter(function (t) { return t.stato === 'aperto'; }).map(function (t) { return [t.numero, t.numero + ' · ' + t.tipo + ' ' + t.qta + ' ' + t.mat + ' · ' + t.da + ' → ' + t.a]; }) : [];
      var fb = regs.filter(function (r) { return ST.FB08[r.tipo] && !r.stornato && !r.stornoDi; }).map(function (r) { return [r.numero, r.numero + ' · ' + fd(r.data) + ' · ' + r.tipo + ' · ' + eur(r.righe[0].importo)]; });
      radice.innerHTML = avviso() + '<div class="lab-esito"><b>Ho sbagliato una registrazione: come la annullo?</b><ol class="lab-elenco"><li>Non esiste «cancella»: ogni documento registrato resta nel libro giornale.</li><li>Trova il tipo di documento sbagliato nelle schede qui sotto: fattura di vendita (VF11), uscita merci (VL09), entrata merci (MBST), fattura fornitore (MR8M), produzione (CO13), altre scritture come incassi, pagamenti, F24 (FB08).</li><li>Si parte dall\'<b>ultimo</b> documento della catena (incasso → fattura → uscita merci): prima si storna quello, poi il precedente.</li><li>Lo storno crea un documento nuovo a segni invertiti. Poi <b>rifai</b> l\'operazione giusta.</li><li>Un messaggio rosso ⛔ NON è una registrazione sbagliata: vuol dire che non è stato registrato nulla e non c\'è niente da stornare.</li></ol></div>' + '<p class="lab-nota">Regola d\'oro: <b>un documento registrato non si cancella, si storna</b> con un documento nuovo a segni invertiti, che porta il riferimento al primo. E si storna <b>dalla coda</b>: se ci sono documenti successivi (incasso → fattura → uscita merci), prima si storna l\'ultimo.</p><div class="lab-griglia">' +
        L.scheda('🧾', 'Storno della fattura di vendita', 'VF11', L.modulo('vf', [['fattura', 'Fattura o nota di credito', 'select', '', opz(fatture)], ['data', 'Data dello storno', 'date']], [['vf', 'Storna', 'rosso']]) + '<p class="lab-nota">Solo se <b>non è stata trasmessa allo SdI</b> e non ha incassi. Dopo l\'invio serve una nota di credito (Vendite → Resi e note di credito).</p>') +
        L.scheda('🚚', 'Storno dell\'uscita merci', 'VL09 · movimento 602', L.modulo('vl', [['consegna', 'Consegna', 'select', '', opz(conPgi)], ['data', 'Data', 'date']], [['vl', 'Storna l\'uscita merci', 'rosso']]) + '<p class="lab-nota">Solo se la consegna non è fatturata. La merce torna in giacenza (in zona di spedizione se c\'è il WMS); il DDT si annulla.</p>') +
        L.scheda('🗑️', 'Eliminazione della consegna', 'VL02N · elimina', L.modulo('ec', [['consegna', 'Consegna senza uscita merci', 'select', '', opz(senzaPgi)], ['data', 'Data', 'date']], [['ec', 'Elimina la consegna', 'rosso']]) + '<p class="lab-nota">I compiti di prelievo aperti si annullano; la merce già in zona di spedizione torna a scaffale con un compito.</p>') +
        L.scheda('📥', 'Storno dell\'entrata merci da acquisto', 'MBST · movimento 102', L.modulo('mb', [['doc', 'Documento materiale', 'select', '', opz(entrate)], ['data', 'Data', 'date']], [['mb', 'Storna l\'entrata', 'rosso']]) + '<p class="lab-nota">Solo se la merce non è ancora fatturata dal fornitore, non è consumata e (con il WMS) è ancora in zona di ricevimento.</p>') +
        L.scheda('📄', 'Storno della fattura fornitore', 'MR8M', L.modulo('mr', [['fattura', 'Fattura fornitore', 'select', '', opz(ff)], ['data', 'Data', 'date']], [['mr', 'Storna la fattura', 'rosso']]) + '<p class="lab-nota">Solo se non è ancora pagata. Il WE/RE (22) si riapre.</p>') +
        L.scheda('🏭', 'Storni di produzione', '262 · CO13 · 102', L.modulo('pp', [['evento', 'Evento dell\'ordine', 'select', '', opz(ev)], ['data', 'Data', 'date']], [['pp', 'Storna l\'evento', 'rosso']]) + '<p class="lab-nota">Solo su ordini non ancora liquidati (CLSD). Il ferro stornato torna nell\'area di approvvigionamento; i pezzi versati escono dalla zona di ricevimento.</p>') +
        L.scheda('📋', 'Annullamento di un compito di magazzino', 'LT15', L.modulo('lt', [['compito', 'Compito aperto', 'select', '', opz(compiti)], ['motivo', 'Motivo', 'text', 'ubicazione inaccessibile']], [['lt', 'Annulla e ricrea', 'rosso']]) + '<p class="lab-nota">Il compito aperto si annulla e il sistema ne propone uno nuovo (altra ubicazione o altro quanto).</p>') +
        L.scheda('↩️', 'Storno di un documento contabile', 'FB08', L.modulo('fb', [['documento', 'Documento', 'select', '', opz(fb)], ['motivo', 'Motivo', 'select', '01', [['01', '01 storno nello stesso periodo'], ['02', '02 storno in un periodo successivo']]], ['data', 'Data', 'date']], [['fb', 'Storna il documento', 'rosso']]) +
          '<p class="lab-nota">Per incassi, pagamenti, stipendi, F24, righe dell\'estratto conto. Le scritture nate da fatture, consegne o entrate si stornano dalla loro transazione.</p>') + '</div>' +
        L.scheda('🔁', 'Documenti stornati', 'FB03 · coppie documento / storno', L.tabella(['Documento', 'Data', 'Tipo', 'Descrizione', 'Storno', 'Data storno'], regs.filter(function (r) { return r.stornato; }).map(function (r) {
          var st = regs.find(function (x) { return x.numero === r.stornato; }) || {}; return [r.numero, fd(r.data), r.tipo, e(r.descrizione), st.numero, fd(st.data)]; }), 'Nessuno storno.'));
      L.collega(radice, 'vf', {vf: ST.vf11}, rendi); L.collega(radice, 'vl', {vl: ST.vl09}, rendi); L.collega(radice, 'ec', {ec: ST.eliminaConsegna}, rendi);
      L.collega(radice, 'mb', {mb: ST.mbst}, rendi); L.collega(radice, 'mr', {mr: ST.mr8m}, rendi);
      L.collega(radice, 'pp', {pp: function (v) { var p = String(v.evento).split('|'); return ST.produzione({ordine: p[0], evento: p[1], data: v.data}); }}, rendi);
      L.collega(radice, 'lt', {lt: ST.lt15}, rendi); L.collega(radice, 'fb', {fb: function (v) { return ST.fb08({documento: v.documento, data: v.data, motivo: v.motivo === '02' ? '02 storno in un periodo successivo' : '01 storno nello stesso periodo'}); }}, rendi);
    },
  };
  PAGINE.fatture = function () {
    var FS = window.FS4, el = FS.elenco();
    radice.innerHTML = avviso() + L.scheda('🧾', 'Fattura di servizi a cliente italiano', 'FB70 · FI-AR', L.modulo('fs', [['cliente', 'Cliente', 'select', 'C200', U.clienti(S()).filter(function (c) { return !(S().clienti[c[0]] || {}).valuta || S().clienti[c[0]].valuta === 'EUR'; })],
        ['testo', 'Descrizione del servizio', 'text', 'noleggio transenne per evento'], ['imponibile', 'Imponibile €', 'num'], ['iva', 'IVA %', 'num', 22], ['scadenza', 'Scadenza del pagamento', 'date'], ['data', 'Data della fattura', 'date']], [['fs', 'Registra la fattura']]) +
        '<p class="lab-nota">D 11 Cliente (totale) / A 44 Ricavi per servizi / A 21 IVA a debito. La scadenza serve a Ri.Ba., factoring e scadenziario. Poi la fattura va trasmessa allo SdI (Contabilità → Fattura elettronica).</p>') +
      L.scheda('📋', 'Fatture di servizi emesse', 'FBL5N', L.tabella(['Fattura', 'Data', 'Cliente', 'Descrizione', 'Imponibile›', 'IVA›', 'Totale›', 'Scadenza', 'SdI'], el.map(function (f) {
        return [f.numero, fd(f.data), e(nomeCli(f.cliente)), e(f.testo), eur(f.imponibile), eur(f.iva), eur(f.totale), f.scadenza ? fd(f.scadenza) : '', f.sdi ? 'consegnata ' + fd(f.sdi.data) : 'da trasmettere']; }), 'Nessuna fattura di servizi.'));
    L.collega(radice, 'fs', {fs: FS.fattura}, rendi);
  };
  var nomeFor = function (f) { return ((S().fornitori || {})[f] || {}).nome || f; };
  PAGINE.passive = function () {
    var FS = window.FS4, el = FS.passive(), aperti = Object.keys(S().fornitori || {}).filter(function (f) { return N.saldo('20', f) < -0.004; });
    radice.innerHTML = avviso() + '<div class="lab-griglia">' +
      L.scheda('📥', 'Fattura passiva di servizi', 'FB60 · FI-AP', L.modulo('fp', [['fornitore', 'Fornitore', 'select', 'F400', U.fornitori(S())], ['rif', 'Numero della fattura del fornitore', 'text'],
        ['conto', 'Conto di costo', 'select', '83', FS.COSTI], ['testo', 'Descrizione', 'text', 'premio annuo polizza incendio e furto'], ['imponibile', 'Imponibile €', 'num'], ['iva', 'IVA % (assicurazioni: 0, esenti)', 'num', 0],
        ['dal', 'Competenza dal (facoltativo)', 'date'], ['al', 'Competenza al (facoltativo)', 'date'], ['scadenza', 'Scadenza del pagamento', 'date'], ['data', 'Data di registrazione', 'date']], [['fp', 'Registra la fattura']]) +
        '<p class="lab-nota">D conto di costo + D 14 IVA a credito / A 20 Fornitore. Il periodo di competenza non cambia la scrittura: serve a fine anno per il <b>risconto</b> (Chiusura → Ratei e risconti).</p>') +
      L.scheda('💸', 'Pagamento a un fornitore', 'F-53', L.modulo('pg', [['fornitore', 'Fornitore', 'select', aperti[0] || 'F100', U.fornitori(S())], ['banca', 'Conto bancario di addebito', 'select', '10', N.contiBancari().map(function (c) { return [c.codice, c.codice + ' · ' + c.nome + ' · saldo ' + eur(N.saldo(c.codice)) + ' €']; })], ['documento', 'Fattura da pagare (facoltativo)', 'text'], ['importo', 'Importo (vuoto = tutto il debito aperto)', 'num'], ['data', 'Data del bonifico', 'date']], [['pg', 'Registra il pagamento']]) +
        '<p class="lab-nota">D 20 Fornitore / A conto bancario scelto. Nessuna liquidità viene creata: i nuovi conti partono da zero, si alimentano con un giroconto in Tesoreria → Posizione. Un saldo negativo rappresenta uno scoperto simulato, non disponibilità. Gli altri flussi, incluso F110, usano ancora il conto 10 predefinito.</p>') + '</div>' +
      L.scheda('🏭', 'Debiti verso fornitori', 'FBL1N', L.tabella(['Fornitore', 'Nome', 'Debito aperto €›'], Object.keys(S().fornitori || {}).map(function (f) { return [f, e(nomeFor(f)), eur(-N.saldo('20', f))]; }))) +
      L.scheda('📋', 'Fatture passive di servizi', 'FBL1N', L.tabella(['Fattura', 'Data', 'Fornitore', 'Conto', 'Descrizione', 'Competenza', 'Imponibile›', 'IVA›', 'Totale›'], el.map(function (f) {
        return [e(f.rif), fd(f.data), e(nomeFor(f.fornitore)), f.conto, e(f.testo), f.dal && f.al ? fd(f.dal) + ' – ' + fd(f.al) : '', eur(f.imponibile), eur(f.iva), eur(f.totale)]; }), 'Nessuna fattura passiva di servizi.'));
    L.collega(radice, 'fp', {fp: FS.fatturaPassiva}, rendi); L.collega(radice, 'pg', {pg: FS.paga}, rendi);
  };
  PAGINE.sopravvenienze = function () {
    var FS = window.FS4, el = FS.sopravvenienze(), da = el.filter(function (x) { return !x.incassato; });
    radice.innerHTML = avviso() + '<div class="lab-griglia">' +
      L.scheda('🌩️', 'Sopravvenienza attiva: indennizzo riconosciuto', 'FB50 · A 84', L.modulo('sv', [['compagnia', 'Compagnia di assicurazione', 'select', 'F400', U.fornitori(S())], ['rif', 'Riferimento (lettera di liquidazione)', 'text'], ['testo', 'Evento', 'text', 'indennizzo per il sinistro del furgone'], ['importo', 'Importo €', 'num'], ['data', 'Data', 'date']], [['sv', 'Registra la sopravvenienza']]) +
        '<p class="lab-nota">Un provento <b>non previsto</b>: la compagnia riconosce un indennizzo. D 09 Crediti verso compagnie di assicurazione / A 84 Sopravvenienze attive. È fuori campo IVA (art. 15 DPR 633/72): nessuna fattura. Nel bilancio va tra gli «altri ricavi e proventi» (A5).</p>') +
      L.scheda('🏦', 'Incasso dell\'indennizzo', 'F-28', L.modulo('ii', [['sopravvenienza', 'Indennizzo', 'select', '', U.lista(da, function (x) { return x.rif + ' · ' + nomeFor(x.compagnia) + ' · ' + eur(x.importo); }, '— nessun indennizzo da incassare —', function (x) { return x.rif; })], ['data', 'Data dell\'accredito', 'date']], [['ii', 'Registra l\'incasso']]) +
        '<p class="lab-nota">D 10 Banca / A 09 Crediti verso compagnie di assicurazione. Il ricavo è già stato registrato al riconoscimento.</p>') + '</div>' +
      L.scheda('📋', 'Sopravvenienze attive', '', L.tabella(['Rif.', 'Data', 'Compagnia', 'Evento', 'Importo›', 'Incassato'], el.map(function (x) { return [e(x.rif), fd(x.data), e(nomeFor(x.compagnia)), e(x.testo), eur(x.importo), x.incassato ? fd(x.incassato) : 'no']; }), 'Nessuna sopravvenienza.'));
    L.collega(radice, 'sv', {sv: FS.sopravvenienza}, rendi); L.collega(radice, 'ii', {ii: FS.incassaIndennizzo}, rendi);
  };
  function rendi() {
    if (bloccati().length && ['giornale','mastro','prima_nota'].indexOf(C.pagina)<0) {
      // Se la domanda nasce da un form, conserva il DOM e il suo esito:
      // nasconderlo evita anche che il callback scriva su nodi staccati.
      if (radice.dataset.fiReso === '1') { radice.dataset.fiSospeso = '1'; radice.hidden = true; return; }
      radice.dataset.fiSospeso = '1';
      radice.innerHTML = '<p role="status">Consultazione sospesa: invia prima un tentativo completo di conti, sezioni e importi nel laboratorio di ragioneria. Rapporti e documenti derivati possono rivelare la soluzione.</p>'; return;
    }
    radice.hidden = false;
    radice.dataset.fiSospeso = '0';
    (PAGINE[C.pagina] || PAGINE.giornale)();
    radice.dataset.fiReso = '1';
  }
  function aggiornaVisibilita() {
    if (['giornale','mastro','bilancio','prima_nota'].indexOf(C.pagina)>=0 || radice.dataset.fiSospeso === '1') { rendi(); return; }
    radice.hidden = bloccati().length > 0;
  }
  window.addEventListener('msa:quiz-pronto',aggiornaVisibilita);
  window.addEventListener('msa:quiz-aggiornato',aggiornaVisibilita);
  window.addEventListener('msa:registrazioni-salvate',aggiornaVisibilita);
  window.addEventListener('beforeprint',aggiornaVisibilita);
  window.addEventListener('storage',function (ev) { if (ev.key === C.chiave || ev.key === null) location.reload(); });
  window.addEventListener('pageshow',function (ev) { if (ev.persisted) location.reload(); });
  rendi();
})();
