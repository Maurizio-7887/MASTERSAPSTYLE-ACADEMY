/* MASTER SAP STYLE — tutor laterale contestuale CO / BPC / PP / CO-PC / chiusure.
 * Presentazionale: non registra scritture né modifica dati o motori contabili.
 * Modalità assistita: illumina un solo controllo; modalità autonoma: nessun evidenziatore.
 * Guidare per titolo del widget consente di sopravvivere ai rerender L.collega().
 */
(function () {
  'use strict';
  var target = document.getElementById('lab'), cfg = window.LAB_PAGINA || {};
  if (!target || !cfg.pagina) return;
  var path = (window.location.pathname || '').replace(/\/+$/, '');
  var area = (path.match(/\/s4\/([^/]+)/) || [])[1] || '';
  var page = cfg.pagina;
  var key = area + ':' + page, memory = 'msa-erp-guida-autonoma';
  var guided;
  try { guided = localStorage.getItem(memory) !== '1'; } catch (_) { guided = true; }
  var index = 0, root, pointer, title, description, counter, switcher;
  function step(widget, field, heading, body, click, expected) {
    return {widget:widget,field:field,heading:heading,body:body,
      click:click || '',expected:expected || ''};
  }
  var entries = {
    'controllo:centri': [
      step('Apri il piano CO','cpm-start','Apri la versione 0 del piano','Qui nasce la struttura dei centri di costo. Il piano previsionale non è una registrazione FI: prepara importi, centri e tariffe.','Attiva il piano'),
      step('Assegnazione automatica del centro','okb9','Dove imputare i costi fissi','La regola OKB9 assegna automaticamente un centro ai conti di affitto, servizi e ammortamenti quando la riga FI non lo indica. Non crea un nuovo costo.','Salva le assegnazioni')],
    'controllo:kp06': [
      step('Costi pianificati','ver','Scegli la versione del piano','Versione 0 è il piano operativo annuale. Un valore qui è PREVISIONALE e non aumenta i costi consuntivi delle commesse.'),
      step('Costi pianificati','cdc','Scegli il centro di costo','Distingui centri produttivi Taglio/Piegatura/Saldatura da centri di servizio e amministrazione: non tutto il costo aziendale si assorbe nello stesso ordine.'),
      step('Costi pianificati','kp06','Inserisci e salva costi per classe','Il costo del personale proviene dal piano paghe/PCP e dai conti di costo; fitti, assicurazioni, energia e ammortamenti sono costi fissi o indiretti. Verifica l’importo annuo per classe e centro prima di salvare.','Salva'),
      step('Trasferimento','pcp','Verifica il personale','Il trasferimento dei dati del personale deve essere riconciliato con la pianificazione. Non confondere il monte salari pianificato con il costo lavoro già assorbito sulle commesse.')],
    'controllo:kp26': [
      step('Pianifica le ore','kp26','Inserisci capacità e ore di piano','Capacità = ore disponibili; ore pianificate = denominatore della tariffa €/h. Una tariffa più alta aumenta il valore delle ore effettivamente confermate sugli ordini.','Salva le attività pianificate'),
      step('Volumi annui','ltp','Registra volumi attesi','Pezzi previsti per prodotto: traducono il programma commerciale in fabbisogni produttivi e saturazione dei centri. Non sono entrate di magazzino.')],
    'controllo:ksu': [
      step('Ciclo di ribaltamento','ksu1','Definisci come ripartire i costi comuni','Il centro 4100 Magazzino e 4200 Produzione ribaltano le rispettive quote a Taglio/Piegatura/Saldatura. L’amministrazione resta fuori dal costo industriale secondo il caso.','Salva il ciclo')],
    'controllo:kspi': [
      step('Calcolo delle tariffe','kspi','Calcola le tariffe dei centri','Tariffa €/h = personale + costi indiretti + quota di ribaltamento, diviso ore pianificate. Le ore poi dichiarate in CO11N assorbono questa tariffa sull’ordine; non si sommano una seconda volta i salari alle ore.')],
    'bpc:modello': [
      step('Crea il modello','bpc-crea','Crea il modello Budget','BPC prende la versione 0 del piano KP06 e la distribuisce sui dodici mesi. BUDGET e FORECAST sono piani, ACTUAL è consuntivo derivato da registrazioni.','Crea il modello')],
    'bpc:input': [
      step('Modulo di inserimento','cdc','Scegli centro, categoria e versione','Scegli il centro giusto e se stai scrivendo BUDGET o FORECAST. Gli importi cambiano il modello di pianificazione, non il giornale contabile.'),
      step('Modulo di inserimento','input','Inserisci gli importi mensili','Digita il dato nella casella della classe e del mese, controlla i totali e salva. I costi stipendiali e fissi devono essere coerenti con il piano CO sorgente.')],
    'bpc:processo': [
      step('Azioni sul budget','bpf','Invia e approva le revisioni','Il responsabile del centro invia; il controller approva o respinge motivando. Solo il budget approvato può ritornare alla versione 0 di KP06.','Esegui'),
      step('Ritrasferimento','retract','Riporta il budget al piano S/4','Il piano approvato diventa base delle tariffe e delle stime standard. Non genera una seconda registrazione di stipendi o fitti.')],
    'produzione:ordini': [
      step('Crea ordine di produzione','co-materiale','Scegli HALB o FERT','HALB = semilavorato gestito a magazzino, per esempio SL-TAGLIO o SL-PIEGA. FERT = prodotto finito, per esempio TR-STD. ROH = materia prima acquistata: non è un ordine di prodotto.'),
      step('Crea ordine di produzione','co-qta','Indica pezzi da produrre','La quantità genera fabbisogno componenti e ore pianificate; non scarica ancora magazzino e non certifica produzione.'),
      step('Crea ordine di produzione','co-data','Scegli la data di avvio','La data collega l’ordine alla pianificazione e al periodo dei costi. Verifica che lo standard sia stato rilasciato con CK24 prima dell’avvio.'),
      step('Crea ordine di produzione','co','Rilascia l’ordine','CO01 crea un oggetto produttivo con distinta, ciclo e costo pianificato congelati; il costo effettivo si accumulerà soltanto tramite 261, CO11N e altre registrazioni pertinenti.','Rilascia ordine')],
    'produzione:avanzamento': [
      step('Prelievo per l','pr-ordine','Scegli l’ordine da alimentare','Prima individua l’ordine aperto e il componente corretto. Il prelievo 261 collega il consumo al medesimo ordine/commessa.'),
      step('Prelievo per l','pr-kg','Immetti la quantità prelevata','Può essere ferro ROH in kg o HALB in pezzi. Il 261 sottrae giacenza e addebita il valore standard all’ordine; controlla disponibilità e area PSA-L1 se WMS attivo.'),
      step('Prelievo per l','pr-data','Immetti la data del movimento','È la data della movimentazione di magazzino; non va confusa con la data di consegna o fatturazione.'),
      step('Prelievo per l','pr','Registra il movimento 261','Controlla l’ordine, l’unità di misura e il materiale. SOLO dopo premi «Registra prelievo».','Registra prelievo'),
      step('Conferma delle ore','cf-fase','Dichiara la fase eseguita','Seleziona Taglio, Piegatura o Saldatura quando il ciclo è a operazioni; nei cicli aggregati la fase può essere vuota.'),
      step('Conferma delle ore','cf-ore','Dichiara le ore effettive','Le ore di lavorazione e di attrezzaggio moltiplicate per la tariffa del centro addebitano costo all’ordine: D72/A75 è un trasferimento CO secondario, NON un secondo monte salari.'),
      step('Conferma delle ore','cf','Conferma la produzione CO11N','La conferma rileva l’attività svolta ma non carica automaticamente il finito a magazzino. È distinta dal movimento 101.','Conferma'),
      step('Entrata del prodotto','en-ordine','Scegli ordine per il versamento','Versa il materiale prodotto: HALB nello stock semilavorati, FERT nello stock prodotti finiti. Nel ciclo a tre operazioni sul medesimo ordine non si generano HALB intermedi fantasma.'),
      step('Entrata del prodotto','en-qta','Immetti quantità realmente completata','Il 101 aumenta la giacenza del materiale prodotto e accredita l’ordine al costo standard. Non registrare 101 prima di completare le fasi necessarie.'),
      step('Entrata del prodotto','en','Registra il versamento MIGO 101','Per HALB la simulazione usa magazzino semilavorati 07; per FERT usa prodotti finiti 13. Da GR-ZONE il WMS gestisce poi la messa a posto.','Registra entrata')],
    'chiusura:iva': [
      step('Liquidazione periodica','lq-periodo','Scegli il periodo IVA','Controlla se il caso segue liquidazione mensile (AAAA-MM) o trimestrale (AAAA-T1). La liquidazione IVA non equivale alla chiusura economica del mese.'),
      step('Liquidazione periodica','lq','Registra la liquidazione','Verifica IVA a debito, credito e eventuale riporto prima di confermare.','Registra la liquidazione'),
      step('Versamento con F24','vs','Registra il pagamento','Il pagamento F24 è distinto dal calcolo del debito IVA: controlla importo e data prima di eseguire.')],
    'chiusura:imposte': [
      step('Imposte','ir','Verifica le imposte','Riconcilia i valori fiscali e le variazioni prima di registrare: IRES/IRAP non sono un semplice pulsante di chiusura mensile.')],
    'chiusura:chiusura': [
      step('Chiusura dell','ch','Verifica i prerequisiti prima di chiudere','La pagina CH4 effettua chiusura dell’ESERCIZIO (31 dicembre), non necessariamente close mensile CO. Prima: tutte le scritture, assestamenti, analisi ordini e verifiche di quadratura. Poi premi il pulsante di chiusura solo se i controlli sono superati.')],
    'costi:chiusura': [
      step('Sovraccosti','kg','Rileva sovraccosti per ordine','I costi già originati da personale e fissi sui centri vengono assorbiti mediante tariffe o sovraccosti previsti. Evita il doppio caricamento sulla commessa.'),
      step('Varianze','ko','Liquida solo ordini idonei','Prima esamina WIP, differenze standard/effettivo e stato dell’ordine. La liquidazione KO88 trasferisce le varianze, non ripete il costo lavoro.')],
  };
  // Stabilisci l'area anche quando il prefisso del modulo è /s4/... .
  var items = entries[key];
  if (!items || !items.length) return;
  function findControl(s) {
    if (!s) return null;
    var targetId=document.getElementById(s.field);
    if (targetId && document.getElementById('lab').contains(targetId)) return targetId;
    var keyId=s.field;
    // Widget L.modulo: data-prefisso e campi con id prefisso-campo.
    var box=document.querySelector('[data-prefisso="'+keyId+'"]');
    if (box) return box.querySelector('input,select,button,textarea') || box;
    var m=(keyId||'').match(/^([a-z0-9]+)-([\w-]+)$/i);
    if (m) {
      var alt=document.querySelector('[data-prefisso="'+m[1]+'"]');
      if (alt) return alt.querySelector('#'+keyId) || alt.querySelector('[id$="-'+m[2]+'"]') || alt;
    }
    var keyword=(s.widget||'').toLowerCase();
    var cards=Array.from(target.querySelectorAll('.lab-card,.lab-scheda,.lab-filtro'));
    var card=cards.find(function(x){return (x.textContent||'').toLowerCase().includes(keyword)});
    return card || target.querySelector('input,select,button,textarea') || target;
  }
  function highlight(){
    document.querySelectorAll('.msa-step-target').forEach(function(x){x.classList.remove('msa-step-target')});
    if (!guided || !items[index]) return;
    var obj=findControl(items[index]);
    if (obj) {
      obj.classList.add('msa-step-target');
      if (document.activeElement===document.body) {
        // Non spostare il focus mentre l'allievo sta digitando.
        try {obj.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(_){}
      }
    }
  }
  function render(){
    if (!root) return;
    root.classList.toggle('msa-step-autonomous',!guided);
    switcher.textContent=guided?'Disattiva illuminazione · modalità autonoma':'Attiva illuminazione · modalità guidata';
    var s=items[index];
    counter.textContent='Passaggio '+(index+1)+' di '+items.length;
    title.textContent=s.heading;
    description.textContent=s.body;
    document.getElementById('msa-step-prev').disabled=index===0;
    document.getElementById('msa-step-next').disabled=index===items.length-1;
    highlight();
  }
  function mount(){
    root=document.createElement('aside');
    root.id='msa-step-assistant';
    root.setAttribute('aria-label','Tutor laterale SAP Style');
    root.innerHTML='<div class="msa-step-heading"><strong>🧭 Tutor operativo</strong><button type="button" id="msa-step-hide" aria-label="Nascondi tutor">×</button></div>'+
      '<p class="msa-step-mode" id="msa-step-counter"></p><h3 id="msa-step-title"></h3><p id="msa-step-description"></p>'+
      '<div class="msa-step-controls"><button type="button" id="msa-step-prev">← Indietro</button><button type="button" id="msa-step-next">Passo successivo →</button></div>'+
      '<button type="button" id="msa-step-toggle" class="msa-step-toggle"></button>'+
      '<p class="msa-step-caption">Il tutor spiega ma non compila i dati e non registra movimenti al posto tuo.</p>';
    document.body.appendChild(root);
    counter=root.querySelector('#msa-step-counter');
    title=root.querySelector('#msa-step-title');description=root.querySelector('#msa-step-description');
    switcher=root.querySelector('#msa-step-toggle');
    root.querySelector('#msa-step-prev').onclick=function(){index=Math.max(0,index-1);render();};
    root.querySelector('#msa-step-next').onclick=function(){index=Math.min(items.length-1,index+1);render();};
    switcher.onclick=function(){guided=!guided;try{localStorage.setItem(memory,guided?'0':'1')}catch(_){}render();};
    root.querySelector('#msa-step-hide').onclick=function(){root.hidden=true;document.querySelectorAll('.msa-step-target').forEach(function(x){x.classList.remove('msa-step-target')});reopen.hidden=false;};
    var reopen=document.createElement('button');reopen.type='button';reopen.id='msa-step-reopen';reopen.textContent='🧭 Apri tutor';reopen.hidden=true;reopen.onclick=function(){root.hidden=false;reopen.hidden=true;render();};
    document.body.appendChild(reopen);
    var frame=0;
    var observer=new MutationObserver(function(){if(frame)return;frame=requestAnimationFrame(function(){frame=0;highlight();});});
    observer.observe(target,{childList:true,subtree:true});
    render();
  }
  if (document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
