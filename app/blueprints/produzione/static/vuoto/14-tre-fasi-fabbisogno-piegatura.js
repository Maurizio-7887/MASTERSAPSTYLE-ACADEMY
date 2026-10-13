/* Generato da tools/split_simulatore.py (vuoto) — non modificare a mano: modifica sorgenti/ e rilancia. */
// Profilo didattico a tre fasi. Nessuna riscrittura di ordini/lotti storici.
window.Fabbisogno = (()=>{
  const info=()=>{
    const vendite=SDMM.fabbisogniVendita().reduce((t,v)=>t+v.qty,0),giacenza=SDMM.pfFisico();
    const produzione=(STATO.pp?.ordini||[]).filter(o=>o.materiale==='TRANSENNA'&&!o.teco&&!o.liquidazione).reduce((t,o)=>{
      const doc=(STATO.mm?.documenti||[]).filter(d=>d.rif?.ordine===o.id&&d.mat==='TRANSENNA');
      const entrati=doc.reduce((n,d)=>n+(d.segno||0)*(d.qty||0),0);
      const scarti=(o.conferme||[]).filter(c=>!c.annullato).reduce((n,c)=>n+(c.scarto||0),0);
      return t+Math.max(0,o.qty-entrati-scarti);
    },0);
    const catene=(STATO.pp?.catene||[]).filter(k=>!k.annullata&&(STATO.pp.ordini||[]).some(o=>o.catenaId===k.id));
    const inCatene=catene.reduce((n,k)=>{const coperto=STATO.pp.ordini.filter(o=>o.catenaId===k.id&&o.materiale==='TRANSENNA').reduce((t,o)=>t+(o.teco?PP.riepilogo(o).entrati:o.qty-PP.riepilogo(o).scarto),0);return n+Math.max(0,k.qty-coperto);},0);
    return {vendite,giacenza,produzione:produzione+inCatene,inCatene,netto:Math.max(0,Math.round(vendite-giacenza-produzione-inCatene))};
  };
  const errore=(q,commessa=false)=>{
    if(STATO.regolaProduzione!=='FABBISOGNO_NETTO_CLIENTI')return '';
    const f=info();
    if(!f.netto)return 'Regola dell’esercizio: nessuna carenza da ordine cliente. Salva prima l’ordine SD e verifica magazzino e produzioni aperte; non aprire un nuovo lotto coperto dalle scorte.';
    if(!Number.isInteger(q)||q<=0)return 'Indica una quantità intera positiva.';
    if(q>f.netto)return 'Quantità '+q+' superiore al fabbisogno netto '+f.netto+' (ordini '+f.vendite+' − scorte '+f.giacenza+' − produzione aperta '+f.produzione+').';
    if(commessa){const riservato=(STATO.commesse||[]).filter(c=>c.stato!=='chiusa'&&!STATO.pp.ordini.some(o=>String(o.commessaId)===String(c.id))).reduce((n,c)=>n+(c.quantitaPianificata||0),0);if(q>Math.max(0,f.netto-riservato))return 'Esiste già una commessa aperta non ancora rilasciata che copre questa carenza: usa quella, non crearne una seconda.';}
    return '';
  };
  return {info,errore};
})();
window.Piegatura = (()=>{
  let pending=null;
  const err=e=>mostraToast(e.message||String(e),true);
  function config(){
    const centro=STATO.centriDiCosto.find(c=>c.nome.trim().toLowerCase()==='piegatura');
    const cid=centro?.id || Math.max(STATO.prossimoIdCentroCosto||1,...STATO.centriDiCosto.map(c=>+c.id+1));
    if(STATO.distintaBase.ciclo.some(o=>o.opId==='OP0015'&&String(o.centroCostoId)!==String(cid)))throw Error('OP0015 già utilizzata: verifica il ciclo prima di attivare Piegatura.');
    return {id:cid,centro,signature:JSON.stringify([STATO.distintaBase,STATO.centriDiCosto])};
  }
  function preview(){try{
    pending=config();document.getElementById('three-preview').innerHTML='<p>Aggiunge Piegatura (se mancante): 1 addetto, costo azienda standard 3.000 €/mese, 1.500 h/anno, generali 6.000 €/anno. Inserisce OP0015 Piegatura 0,20 h/pz tra Taglio e Saldatura. Attiva la regola del fabbisogno netto da ordini clienti. Gli altri standard restano quelli salvati; per ottenere 31,40 €/pz devono essere 28 €/h su tutti e tre i centri.</p><p>Ordini, lotti, budget già aperti, paghe e scritture storiche NON vengono ricalcolati. Per il budget già aperto integra separatamente il nuovo centro.</p><button class="azione" onclick="Piegatura.confirm()">Conferma introduzione Piegatura</button>'; }catch(e){err(e);}}
  function confirm(){const backup=structuredClone(STATO);try{
    if(!pending)throw Error('Genera prima l’anteprima.');
    if(config().signature!==pending.signature)throw Error('Configurazione cambiata: rigenera anteprima.');
    if(!pending.centro)STATO.centriDiCosto.push({id:pending.id,nome:'Piegatura',numeroAddetti:1,stipendioMensileStandard:3000,oreStandardAnnuePerAddetto:1500,costoGeneraleAnnuo:6000,costoPersonaleAnnuo:36000,oreAnnuePreviste:1500});
    if(!STATO.distintaBase.ciclo.some(o=>String(o.centroCostoId)===String(pending.id))){
      const i=STATO.distintaBase.ciclo.findIndex(o=>o.descrizione.toLowerCase().includes('sald'));
      STATO.distintaBase.ciclo.splice(i<0?STATO.distintaBase.ciclo.length:i,0,{opId:'OP0015',descrizione:'Piegatura',centroCostoId:pending.id,oreStandard:0.20,produce:'PIEGA'});
    }
    STATO.prossimoIdCentroCosto=Math.max(STATO.prossimoIdCentroCosto,pending.id+1);STATO.regolaProduzione='FABBISOGNO_NETTO_CLIENTI';
    aggiornaVersioneDistinta();sincronizzaCostoGiacenzaIniziale();localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(STATO));pending=null;inizializzaImpostazioni();mostraToast('Piegatura attiva per i nuovi ordini. Controlla gli standard prima di aprire il budget.');
  }catch(e){STATO=backup;err(e);}}
  function budgetPlan(){
    const mese=document.getElementById('three-month').value;if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(mese))throw Error('Mese non valido.');FI.dateCheck(mese+'-01');
    if(STATO.pp.periodi.some(p=>!p.annullato&&mese+'-01'<=p.fine))throw Error('Periodo PP chiuso: annullalo prima di integrare il budget.');
    const b=BudgetPool.find(mese);if(!b)throw Error('Budget non aperto: usa CO-CCA → Anteprima budget mensile.');
    const nuovi=STATO.centriDiCosto.filter(c=>STATO.distintaBase.ciclo.some(o=>String(o.centroCostoId)===String(c.id))&&!b.centri.some(x=>String(x.id)===String(c.id))).map(c=>({id:c.id,nome:c.nome,p:c2(c.costoPersonaleAnnuo/12),g:c2(c.costoGeneraleAnnuo/12),ore:c.oreAnnuePreviste/12,tp:tariffaPersonale(c),tg:tariffaGenerali(c)}));
    if(!nuovi.length)throw Error('Tutti i centri del ciclo sono già nel budget: nessuna integrazione necessaria.');
    if(nuovi.some(c=>!Number.isFinite(c.p+c.g+c.ore)||c.p<0||c.g<0||c.ore<=0))throw Error('Configura prima i nuovi centri.');
    return {mese,signature:JSON.stringify(b),centri:nuovi};
  }
  function previewBudget(){try{pending=budgetPlan();document.getElementById('three-preview').innerHTML='<p>Integra soltanto i centri assenti nello snapshot '+pending.mese+': '+pending.centri.map(c=>c.nome+' personale '+euro(c.p/100)+' e generali '+euro(c.g/100)).join('; ')+'. Non modifica i centri già congelati e non registra costi FI.</p><button class="azione" onclick="Piegatura.confirmBudget()">Conferma integrazione budget</button>';}catch(e){err(e);}}
  function confirmBudget(){const old=structuredClone(STATO);try{const fresh=budgetPlan();if(JSON.stringify(fresh)!==JSON.stringify(pending))throw Error('Budget o standard cambiati: rigenera anteprima.');const b=BudgetPool.find(fresh.mese);b.centri.push(...fresh.centri);b.integrazioni ||= [];b.integrazioni.push({data:new Date().toISOString(),centri:fresh.centri.map(c=>c.id)});localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(STATO));pending=null;inizializzaImpostazioni();mostraToast('Budget integrato; nessuna nuova scrittura FI.');}catch(e){STATO=old;err(e);}}
  function render(){const host=document.getElementById('tab-ciclo-lavoro')?.closest('table');if(!host)return;document.getElementById('three-phase-box')?.remove();const b=document.createElement('div');b.id='three-phase-box';b.className='riquadro';b.innerHTML='<h3>Ciclo a tre fasi e fabbisogno netto</h3><p>Taglio → Piegatura → Saldatura. Nei nuovi preset è già configurato. Con un backup precedente, attiva esplicitamente il nuovo centro senza modificare le produzioni storiche. La regola «prima carenza da ordini clienti, poi commessa» è didattica: SAP consente anche produzione per scorta.</p><button class="azione secondaria" onclick="Piegatura.preview()">Verifica / attiva Piegatura su dati precedenti</button> <input id="three-month" type="month" value="2026-12"> <button class="azione secondaria" onclick="Piegatura.previewBudget()">Integra nuovi centri nel budget già aperto</button><div id="three-preview"></div>';host.before(b);}
  return {preview,confirm,previewBudget,confirmBudget,render};
})();
const impostazioniTreFasi=inizializzaImpostazioni;
inizializzaImpostazioni=function(){impostazioniTreFasi();Piegatura.render();};
