/* Pagina di chiusura mensile — campi espliciti + tutor laterale comune. */
(function(){
'use strict';
var C=window.LAB_PAGINA||{}, L=window.LabMotore, M=window.MONTH_CLOSE, N=window.SD4.avvia(C.chiave);
var root=document.getElementById('lab');
if(!root||!M)return;
var S=function(){return N.S;},esc=L.esc,eur=L.eur;
var pref=(location.pathname.match(/^\/(vuoto|completo)\//)||[])[1]||'vuoto';
var url=function(x){return '/'+pref+'/s4/'+x;};
var month=function(){var d=S().avviato||'2027-01-01',now=d.slice(0,7);return /^\d{4}-\d{2}$/.test(now)?now:'2027-01';};
var period=month();
var warning='';
function link(path,label){return '<a class="mc-link" href="'+url(path)+'">'+label+'</a>';}
function box(title,body){return '<section class="lab-card mc-box"><h3>'+title+'</h3>'+body+'</section>';}
function list(items,classname){return items.length?'<ul class="'+classname+'">'+items.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':'<p class="mc-ok">✓ Nessun rilievo bloccante</p>';}
function rows(headers,data){
 return L.tabella(headers,data.length?data:[['—','—','—','—','—','—']], 'Nessun ordine con attività nel periodo.');
}
function render(){
 var a;
 try{a=M.overview(period)}catch(ex){root.innerHTML=box('Periodo non valido','<p class="lab-esito ko">'+esc(ex.message)+'</p>');return;}
 var closed=a.closed;
 var res='<div class="mc-header"><div><h2>📅 Chiusura mensile FI–CO–PP–MM</h2><p>La chiusura del mese è distinta da quella dell’esercizio. Si verificano costo del personale, fissi, ordini, magazzino, varianze e registrazioni.</p></div><label>Periodo AAAA-MM <input id="mc-period" type="month" value="'+esc(period)+'"></label></div>';
 if(warning){res+='<div class="lab-esito ko" role="alert">'+esc(warning)+'</div>';warning='';}
 res+=box('Passo 1 · Riconcilia costi, ricavi e centri FI/CO',
  '<p>Prima registra cedolini e costi fissi. Le paghe scrivono classi 80/81/82 sui centri. Gli altri costi arrivano al centro dalla riga FI o da OKB9. <b>Non duplicare il costo del personale su commessa</b>: CO11N trasferisce il valore delle ore (D72/A75).</p>'+
  '<div class="mc-kpis"><div>Documenti FI<b>'+a.documenti+'</b></div><div>Totale Dare<b>'+eur(a.totali.dare)+' €</b></div><div>Totale Avere<b>'+eur(a.totali.avere)+' €</b></div><div>Costi FI del periodo<b>'+eur(a.totali.costi)+' €</b></div><div>Ricavi FI del periodo<b>'+eur(a.totali.ricavi)+' €</b></div><div>Movimenti MM<b>'+a.movimenti+'</b></div></div>'+
  '<p>'+link('paghe/contabilita','Registra paghe')+' · '+link('controllo/ksb1','Analizza centri KSB1/KB11N')+' · '+link('bpc/report','Confronta budget e consuntivo')+'</p>'+
  '<p class="lab-nota">Ricavi FI e costi FI sono qui mostrati come grandezze di periodo, non come margine CO-PA definitivo. I trasferimenti interni D72/A75 non vanno aggiunti di nuovo al costo del lavoro primario.</p>');
 res+=box('Passo 2 · Prelievi, ore e HALB/FERT',
  '<p>Per ciascun ordine: <b>261</b> scarica ROH/HALB, <b>CO11N</b> rileva ore e lavorazioni, <b>101</b> versa HALB o FERT a magazzino. Se un ciclo lavora lo stesso FERT per operazioni successive, non creare falsi carichi intermedi. I costi accumulati meno accredito 101 mostrano il saldo analitico, <b>non una capitalizzazione FI automatica del WIP</b>.</p>'+
  rows(['Ordine','Materiale','Stato','Materiali €›','Attività €›','Costo €›','101 €›','WIP €›'],a.ordini.map(function(o){return [o.numero,esc(o.materiale||''),esc(o.stato||o.errore||''),eur(o.prelievo||0),eur(o.ore||0),eur(o.totale||0),eur(o.accredito||0),eur(o.wip||0)];}))+
  '<p>'+link('produzione/avanzamento','Vai al 261 → CO11N → 101')+' · '+link('costi/chiusura','KGI2, KKS2 e KO88')+'</p>');
 res+=box('Passo 3 · Varianze e Material Ledger',
  '<p>Su ordini DLV/TECO controlla sovraccosti KGI2, varianze KKS2 e liquidazione KO88. Se ci sono differenze prezzo, occorre completare CKMLCP. I semilavorati HALB restano un limite dichiarato del Material Ledger didattico multilevel.</p>'+
  '<p><strong>Material Ledger per '+esc(period)+': </strong>'+(a.mlClosed?'✓ Registrato':'Non registrato')+(a.hasDifferences?' · Differenze da riconciliare':' · Nessuna differenza registrata nel periodo')+'</p>'+
  '<p>'+link('costi/material-ledger','Apri CKM3/CKMLCP')+'</p>');
 res+=box('Passo 4 · Controlli prima della chiusura',
  '<h4>Blocchi obbligatori ('+a.blockers.length+')</h4>'+list(a.blockers,'mc-errors')+
  '<h4>Avvertenze e limiti ('+a.warnings.length+')</h4>'+list(a.warnings,'mc-warnings')+
  '<p class="lab-nota">Le avvertenze vengono conservate nel verbale, ma NON sono automaticamente corrette: valuta la loro natura prima di procedere.</p>');
 var docs=closed?('<div class="lab-esito '+(a.integrity?'ok':'ko')+'"><b>✓ Chiuso '+esc(closed.closedAt)+'</b> — '+(a.integrity?'impronta del mese coerente':'ATTENZIONE: dati del mese modificati rispetto alla fotografia di chiusura')+'.</div>'+
   '<p>Motivazione: '+esc(closed.reason)+'</p><h4>Verbale e riapertura controllata</h4>'+
   '<label>Scrivi RIAPRI '+esc(period)+' <input id="mc-reopen-code" autocomplete="off"></label>'+
   '<label>Motivazione della riapertura (min. 20 caratteri) <textarea id="mc-reopen-reason" rows="3"></textarea></label>'+
   '<p><button type="button" class="lab-btn sec" id="mc-reopen">Riapri periodo per rettifiche</button></p>'):
   ('<label>Conferma scrivendo CHIUDI '+esc(period)+' <input id="mc-confirm" autocomplete="off"></label>'+
   '<label>Verifiche svolte / motivazione (min. 20 caratteri) <textarea id="mc-reason" rows="3" placeholder="Ho controllato FI, centri, ordini, materiali e differenze…"></textarea></label>'+
   '<p><button type="button" class="lab-btn" id="mc-close" '+(a.blockers.length?'disabled':'')+'>Conferma chiusura del mese</button></p>');
 res+=box('Passo 5 · Sigilla il periodo e conserva il verbale',
  '<p>Questa operazione crea un <b>verbale di chiusura mensile</b> senza scritture FI aggiuntive e blocca nuove registrazioni retrodatate tramite i controlli del motore comune. Non chiude l’esercizio fiscale.</p>'+docs+
  '<p><button type="button" class="lab-btn sec" id="mc-export">Esporta verbale CSV</button> · '+link('chiusura/chiusura','Chiusura annuale separata')+'</p>');
 root.innerHTML=res;
 var sel=root.querySelector('#mc-period');sel.addEventListener('change',function(){period=sel.value;render()});
 var close=root.querySelector('#mc-close');
 if(close)close.addEventListener('click',function(){try{M.close(period,root.querySelector('#mc-confirm').value,root.querySelector('#mc-reason').value);render()}catch(ex){warning=ex.message;render()}});
 var reopen=root.querySelector('#mc-reopen');
 if(reopen)reopen.addEventListener('click',function(){try{M.reopen(period,root.querySelector('#mc-reopen-code').value,root.querySelector('#mc-reopen-reason').value);render()}catch(ex){warning=ex.message;render()}});
 root.querySelector('#mc-export').addEventListener('click',function(){
   var report=M.overview(period),out=[['periodo','tipo','oggetto','valore'],[period,'stato','chiuso',report.closed?'SI':'NO'],[period,'quadratura','dare',report.totali.dare],[period,'quadratura','avere',report.totali.avere]];
   report.blockers.forEach(function(x){out.push([period,'blocco','',x])});
   report.warnings.forEach(function(x){out.push([period,'avvertenza','',x])});
   report.ordini.forEach(function(o){out.push([period,'ordine',o.numero,'costo='+o.totale+';accredito='+o.accredito+';saldo='+o.wip])});
   if(report.closed)out.push([period,'verbale','motivazione',report.closed.reason]);
   var quote=function(x){var v=String(x==null?'':x);if(/^[=+\-@]/.test(v.trim()))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
   var csv='\ufeff'+out.map(function(r){return r.map(quote).join(';')}).join('\r\n');
   var blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),href=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=href;a.download='chiusura-mensile-'+period+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(href)},500);
 });
}
render();
})();
