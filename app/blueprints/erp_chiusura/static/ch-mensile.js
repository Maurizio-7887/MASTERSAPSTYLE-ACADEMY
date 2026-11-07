/* Chiusura mensile guidata FI / CO / PP / MM — nessun epilogo annuale, nessuna scrittura inventata. */
window.MENSILE4 = (function () {
  'use strict';
  var conferme = [
    ['documenti','FI: ho controllato fatture, note di credito, competenza e documenti da ricevere.'],
    ['paghe','HR / FI: ho verificato cedolini, oneri e TFR imputati ai centri di costo.'],
    ['cespiti','FI-AA: ho verificato ammortamenti e assestamenti pertinenti al mese.'],
    ['magazzino','MM: ho confrontato giacenze, consumi, entrate e inventario fisico.'],
    ['riconciliazione','CO: ho riconciliato costi primari FI, centri, ore CO11N e costi d’ordine.'],
    ['ricavi','SD / CO-PA: ho confrontato fatturazione, costo del venduto e margini.']
  ];
  var esc = function (s) { return window.LabMotore.esc(String(s == null ? '' : s)); };
  var meseValido = function (p) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(p); };
  var r2 = function (n) { return Math.round((n + Number.EPSILON) * 100) / 100; };
  var righeMese = function (s,p) { return (s.registrazioni || []).filter(function (r) { return String(r.data || '').slice(0,7) === p && !r.chiusura; }); };
  function controllo(s,p) {
    var registri = righeMese(s,p), ordini = (s.produzione || []).filter(function(o) {
      return (o.eventi || []).some(function(e){ return String(e.data || '').slice(0,7) === p && !e.stornato; });
    });
    var nonLiquidati = ordini.filter(function(o) { return !o.liquidazione || String(o.liquidazione.data || '').slice(0,7) > p; });
    var sbilanciati = registri.filter(function(r) {
      return Math.abs(r2((r.righe || []).reduce(function(t,x){ return t+(x.dareAvere === 'DARE' ? 1 : -1)*Number(x.importo || 0); },0))) > 0.01;
    });
    var senzaCentro = [], noPaghe = false;
    registri.forEach(function(r) {(r.righe || []).forEach(function(x) {
      if (['80','81','82'].indexOf(String(x.conto)) >= 0 && x.dareAvere === 'DARE' && !x.cdc) senzaCentro.push(r.numero || r.id);
    });});
    noPaghe = ordini.length > 0 && !registri.some(function(r){return r.tipo === 'PAGHE';});
    var chiusuraML = !!(((s.costing || {}).ml || []).some(function(x){return x.periodo === p;}));
    var problemi = [];
    if (!s.avviato) problemi.push('Azienda non avviata.');
    if (sbilanciati.length) problemi.push('Scritture FI non quadrate: '+sbilanciati.length+'.');
    if (nonLiquidati.length) problemi.push('Ordini con attività nel mese senza KO88 entro il periodo: '+nonLiquidati.map(function(o){return o.numero;}).join(', ')+'.');
    if (senzaCentro.length) problemi.push('Righe paghe senza centro di costo: documenti '+senzaCentro.join(', ')+'.');
    if (noPaghe) problemi.push('Produzione presente, ma nessuna contabilizzazione paghe del mese (verificare se applicabile).');
    if (ordini.length && !chiusuraML) problemi.push('Material Ledger CKMLCP del periodo non chiuso: esegui prima KGI2, KO88 e CKMLCP.');
    var costi = 0, ricavi = 0, dare = 0, avere = 0;
    registri.forEach(function(r){(r.righe || []).forEach(function(x){
      var n = Number(x.importo || 0), segno = x.dareAvere === 'DARE' ? 1 : -1;
      if (segno > 0) dare += n; else avere += n;
      var conto = (s.pianoDeiConti || []).find(function(c){return c.codice === x.conto;});
      if (conto && conto.tipo === 'COSTO') costi += segno*n;
      if (conto && conto.tipo === 'RICAVO') ricavi -= segno*n;
    });});
    return {registri:registri, ordini:ordini, problemi:problemi, ml:chiusuraML, dare:r2(dare), avere:r2(avere), costi:r2(costi), ricavi:r2(ricavi)};
  }
  function render(root,n) {
    var s=n.S, l=window.LabMotore, state=s.chiusureMensili=s.chiusureMensili || {};
    var p=root.dataset.periodo || (s.registrazioni || []).map(function(r){return String(r.data || '').slice(0,7);}).filter(meseValido).sort().slice(-1)[0] || String(s.avviato || '2026-01').slice(0,7);
    if (!meseValido(p)) p='2026-01';
    root.dataset.periodo=p;
    var x=controllo(s,p), chiusa=state[p], key='mensileConferme', flag=s[key]=s[key] || {}, flags=flag[p] || {};
    var complete=conferme.every(function(c){return !!flags[c[0]];});
    var e=function(v){return esc(v);};
    root.innerHTML='<section class="lab-nota"><h2>Chiusura mensile integrata FI · CO · PP · MM</h2><p>Questa chiusura NON è l’epilogo annuale: conserva un riepilogo dei movimenti effettivi. Il budget resta un confronto e non genera costi.</p><label>Periodo AAAA-MM <input id="mensile-periodo" type="month" value="'+e(p)+'"></label> <button id="mensile-aggiorna" type="button">Ricalcola verifiche</button></section>'+
      '<div class="lab-griglia">'+l.scheda('📚','1. Riconciliazione del libro FI','Documenti registrati nel periodo',
        l.tabella(['Voce','Valore'],[['Scritture FI',x.registri.length],['Totale Dare',l.eur(x.dare)],['Totale Avere',l.eur(x.avere)],['Costi netti (conti COSTO)',l.eur(x.costi)],['Ricavi netti (conti RICAVO)',l.eur(x.ricavi)],['Margine contabile provvisorio',l.eur(x.ricavi-x.costi)]])+'<p>Costi CO interni (72/75, 78/76) sono trasferimenti già registrati: non sommare due volte gli stessi costi.</p>')+
      l.scheda('🏭','2. Produzione e valorizzazione','KGI2 → KKS2 → KO88 → CKMLCP',
        l.tabella(['Verifica','Riscontro'],[['Ordini movimentati nel mese',x.ordini.length],['Material Ledger del mese',x.ml?'Registrato':'Non registrato'],['Ordini ancora da liquidare',x.ordini.filter(function(o){return !o.liquidazione || String(o.liquidazione.data || '').slice(0,7)>p;}).length]])+
        '<p>Usa prima i moduli <b>Costi del prodotto → Chiusura ordini</b> e <b>Material Ledger</b>. I costi di paga e struttura entrano in FI/centri; il costo dell’ordine deriva dai consumi 261, dalle ore CO11N e dai ribaltamenti, non da una seconda registrazione della paga.</p>')+'</div>'+
      l.scheda(x.problemi.length?'⛔':'✅','3. Blocchi automatici','Non superabili con una spunta',x.problemi.length?'<ul>'+x.problemi.map(function(v){return '<li>'+e(v)+'</li>';}).join('')+'</ul>':'<p>Controlli automatici superati per i dati disponibili.</p>')+
      l.scheda('🧑‍🏫','4. Tutor: conferme di competenza','Verifiche manuali obbligatorie — nessun dato inventato',
       '<p>Per ogni voce apri il modulo relativo, verifica l’evidenza e poi seleziona la conferma.</p>'+
       conferme.map(function(c,i){return '<label style="display:block;margin:0.7rem 0"><input type="checkbox" data-mensile-flag="'+e(c[0])+'" '+(flags[c[0]]?'checked':'')+(chiusa?' disabled':'')+'> <b>'+(i+1)+'.</b> '+e(c[1])+'</label>';}).join(''))+
      l.scheda('🔒','5. Firma e blocco del periodo','Stato del mese',chiusa?
       '<p><b>Periodo chiuso.</b> '+e(chiusa.data)+' — '+x.registri.length+' documenti FI attualmente presenti.</p><p>Snapshot originale: '+e(chiusa.documenti)+' documenti; Dare '+l.eur(chiusa.dare)+'; Avere '+l.eur(chiusa.avere)+'. La chiusura non elimina né riscrive il libro giornale.</p>':
       '<p>La chiusura è abilitata solo dopo controlli automatici e conferme. Una volta chiuso il mese, nuove registrazioni FI e nuovi movimenti di magazzino con data nel periodo sono bloccati.</p><button type="button" id="mensile-chiudi" '+((x.problemi.length||!complete)?'disabled':'')+'>Conferma e chiudi il mese '+e(p)+'</button>');
    root.querySelector('#mensile-aggiorna').onclick=function(){root.dataset.periodo=root.querySelector('#mensile-periodo').value;render(root,n);};
    root.querySelectorAll('[data-mensile-flag]').forEach(function(el){el.onchange=function(){
      var f=(s.mensileConferme[p]=s.mensileConferme[p] || {});f[el.dataset.mensileFlag]=el.checked;n.salva();render(root,n);
    };});
    var btn=root.querySelector('#mensile-chiudi');if(btn)btn.onclick=function(){
      var z=controllo(s,p), f=(s.mensileConferme || {})[p] || {};
      if (z.problemi.length || !conferme.every(function(c){return f[c[0]];})) {render(root,n);throw Error('Chiusura non consentita: controlli o conferme incomplete.');}
      if (state[p]) throw Error('Mese già chiuso.');
      if (!window.confirm('Chiudere il periodo '+p+'? Le registrazioni del mese saranno bloccate.'))return;
      state[p]={periodo:p,data:new Date().toISOString(),documenti:z.registri.length,dare:z.dare,avere:z.avere,costi:z.costi,ricavi:z.ricavi,ordini:z.ordini.map(function(o){return o.numero;}),checklist:conferme.map(function(c){return c[0];})};
      n.salva();render(root,n);
    };
  }
  return {render:render,controllo:controllo};
})();
