/* Generato da tools/split_simulatore.py (completo) — non modificare a mano: modifica sorgenti/ e rilancia. */
/* Migliorie 12 ottobre: anagrafiche nuove senza riscrivere lo storico. */
window.Operativita = (()=>{
 let warning='',busy=false;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function ensure(){
  if(busy)return;busy=true;const saved=structuredClone(STATO);
  try{
   const cc=STATO.centriDiCosto,cycle=STATO.distintaBase.ciclo;
   let c=cc.find(x=>['piegatura','piega','piegatrice'].includes(String(x.nome).trim().toLowerCase()));
   let id=c?.id??Math.max(STATO.prossimoIdCentroCosto||1,...cc.map(x=>(+x.id||0)+1));
   const collision=cycle.find(x=>x.opId==='OP0015'&&String(x.centroCostoId)!==String(id));
   if(collision)throw Error('OP0015 è già assegnata a un altro centro: introduzione automatica bloccata. Verifica il ciclo prima di modificare i dati.');
   const missingCC=!c,missingOp=!cycle.some(x=>String(x.centroCostoId)===String(id));
   if(missingCC||missingOp){
    // Conserva il valore storico delle eventuali scorte iniziali a due fasi.
    const sp=STATO.statoPatrimonialeIniziale||{};
    if(sp.magazzinoPF_unita0>0){
     if(!(Number(sp.costoUnitarioPF0)>0))sp.costoUnitarioPF0=costoStandardTransenna();
     sp.costoUnitarioPF0CongelatoMigrazione=true;
    }
    const backupKey=CHIAVE_STORAGE+'-backup-prima-piegatura-visibile';
    if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,JSON.stringify(saved));
    if(!c){c={id,nome:'Piegatura',numeroAddetti:1,stipendioMensileStandard:3000,oreStandardAnnuePerAddetto:1500,costoGeneraleAnnuo:6000,costoPersonaleAnnuo:36000,oreAnnuePreviste:1500};cc.push(c);}
    if(missingOp){const i=cycle.findIndex(x=>String(x.descrizione).toLowerCase().includes('sald'));cycle.splice(i<0?cycle.length:i,0,{opId:'OP0015',descrizione:'Piegatura',centroCostoId:id,oreStandard:.20,produce:'PIEGA'});aggiornaVersioneDistinta();}
    STATO.prossimoIdCentroCosto=Math.max(STATO.prossimoIdCentroCosto||1,(+id)+1);
    STATO.fi.usabilitaPiegatura={data:new Date().toISOString(),centro:id,backupKey,nota:'Master e ciclo dei nuovi ordini; storico e budget congelati invariati.'};
   }
   STATO.fi.bancaUnica={codice:'10',riferimento:'CC-UNICO',nome:'Banca — conto corrente unico',valuta:'EUR'};
   const bank=STATO.pianoDeiConti.find(x=>x.codice==='10');if(bank)bank.nome='Banca — conto corrente unico';
   localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(STATO));warning='';
  }catch(e){STATO=saved;warning=e.message;console.error('Operativita ensure:',e.message);}finally{busy=false;}
 }
 function scroll(id){const el=document.getElementById(id);if(!el)return;const d=el.closest('details');if(d)d.open=true;el.scrollIntoView({block:'start'});el.focus?.();}
 function aa(action){if(FIModules.active!=='aa')FIModules.go('aa');
  if(action==='buy'){const d=document.getElementById('fi-ces-data');scroll('fi-ces-data');mostraToast('Acquisto: compila la fattura, leggi l’anteprima e conferma. Il pagamento è separato in FI-AP.');}
  if(action==='sell')scroll('asset-extra-disposal');
  if(action==='dep')scroll('fi-amm-anno');
  if(action==='register')scroll('asset-extra-disposal');
 }
 function style(){if(document.getElementById('op-style'))return;const el=document.createElement('style');el.id='op-style';el.textContent=`.op-legend{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.op-flag{font:700 11px Arial!important;display:inline-block;border-radius:4px;padding:4px 7px;margin:0 5px 4px 0;line-height:1.3;vertical-align:middle;letter-spacing:.2px}.op-blue{background:#dbeafe;color:#173f81}.op-gold{background:#fff0bd;color:#664500}.op-red{background:#fde2e2;color:#852222}.op-green{background:#d5f2df;color:#17512b}.op-purple{background:#ede0ff;color:#542584}.op-gray{background:#e7eaf0;color:#374151}.op-guidance{padding:14px;border-left:5px solid #0874ba;background:#edf7ff;margin:12px 0;font-size:14px}.op-guidance p{margin:6px 0}.op-quick{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}.op-quick button{padding:12px!important;font-weight:bold}.op-alert{padding:10px;background:#fff0bd;border:1px solid #a97600;margin:10px 0}#op-bank table{font-size:12px}`;document.head.append(el);}
 const flag=(cls,text)=>`<span class="op-flag op-${cls}">${text}</span>`;
 function decorate(){
  style();const body=document.getElementById('fi-body');if(!body?.children.length)return;
  const module=FIModules.active,nav=document.getElementById('fi-mod-nav');if(!nav)return;
  let note=document.getElementById('op-guidance');if(!note){note=document.createElement('div');note.id='op-guidance';note.className='op-guidance';nav.after(note);}
  const guidance={home:['Dove registrare le operazioni','Scegli un’area: AA macchinari; GL capitale e assestamenti; AR incassi; AP pagamenti fornitori; BL banca e anticipi; CO budget; HR paghe; Fiscale IVA e imposte.'],aa:['FI-AA: qui registri acquisti, ammortamenti e cessioni dei macchinari','Acquisto → fattura e debito fornitore; pagamento in AP. Vendita → dismissione e partita cliente; incasso in AR. Un bene venduto resta nello storico come DISMESSO: non si cancella la registrazione originaria.'],gl:['FI-GL: qui registri capitale, competenza e bilancio','Capitale, ratei/risconti, sopravvenienze e storni usano anteprima + conferma. Bilancio e chiusura annuale hanno comandi propri. La scrittura libera è un’alternativa per i casi non guidati, non un doppio inserimento.'],ar:['FI-AR: qui incassi i crediti dei clienti','1. Imposta data consultazione e aggiorna. 2. Compila Allocazione (€) sulle partite giuste. 3. Data e riferimento. 4. Anteprima e conferma. La fattura merci nasce in SD; non rifarla qui.'],ap:['FI-AP: qui paghi le fatture dei fornitori','1. Imposta data consultazione e aggiorna. 2. Compila Allocazione (€). 3. Data e riferimento. 4. Anteprima e conferma. Fatture ferro in MM, cespiti in AA, servizi nel riquadro dedicato.'],bl:['FI-BL: unico conto corrente per tutti i movimenti finanziari','Incassi, pagamenti, capitale e anticipi usano sempre il conto 10 CC-UNICO. Il conto 36 è il debito del finanziamento, non un secondo conto bancario. Incasso cliente e rimborso anticipo sono due operazioni distinte.'],co:['CO-CCA: qui apri il budget, non una busta paga','A inizio mese: budget gestionale. Durante il mese: attività PP. A fine mese: paghe HR e fatture generali reali. Budget e costi effettivi non si sommano. Piegatura compare anche nelle capacità.'],hr:['HR: qui registri le paghe effettive del mese','Aggiungi i dipendenti e selezionali; genera anteprima del mese e conferma una sola volta. Il netto e gli enti si pagano in BL; il TFR rimane fondo finché non si liquida realmente.'],tax:['Area fiscale: qui liquidi IVA e rilevi IRES didattica','Liquidazione/calcolo non sono pagamento. Registra la competenza, poi regola il debito da BL alle date dell’esercizio. Acconto IRES è un credito 39, non un altro costo.'],admin:['Impostazioni FI: sicurezza e inizio esercizio','Esporta backup prima di reset/importazione. L’azzeramento non è un comando ordinario di registrazione.']};
  const g=guidance[module]||guidance.home;
  note.innerHTML='<b>'+esc(g[0])+'</b><p>'+esc(g[1])+'</p><div class="op-legend">'+flag('blue','1 · COMPILA / PREPARA')+flag('gold','2 · ANTEPRIMA: NON REGISTRA')+flag('red','3 · CONFERMA: REGISTRA FI')+flag('green','REGOLAMENTO: MUOVE BANCA')+flag('purple','BUDGET: SOLO CO')+'</div>'+(warning?'<div class="op-alert">'+esc(warning)+'</div>':'');
  let quick=document.getElementById('op-aa-actions');if(!quick){quick=document.createElement('div');quick.id='op-aa-actions';quick.className='op-quick';note.after(quick);}
  quick.hidden=module!=='aa';quick.innerHTML=`<button class="azione" onclick="Operativita.aa('buy')">+ Acquista / registra nuovo macchinario</button><button class="azione secondaria" onclick="Operativita.aa('sell')">Vendi / dismetti macchinario</button><button class="azione secondaria" onclick="Operativita.aa('dep')">Ammortamenti</button><button class="azione secondaria" onclick="Operativita.aa('register')">Registro beni e dismissioni</button>`;
  // Riquadri estesi prima chiusi senza indicazione: aprili nel modulo pertinente.
  for(const id of ['asset-extra-disposal','asset-extra-current-difference']){const d=document.getElementById(id);if(d&&!d.hidden)d.open=true;}
  for(const btn of body.querySelectorAll('button[onclick]')){
   if(btn.closest('#fi-mod-nav')||btn.closest('#op-aa-actions')||btn.querySelector('.op-flag'))continue;
   const cmd=btn.getAttribute('onclick'),t=btn.textContent;let cls,label;
   if(/BudgetPool\.confirm|Piegatura\.confirmBudget/.test(cmd)){cls='purple';label='SALVA BUDGET CO';}
   else if(/Treasury\.uiConfirm/.test(cmd)){const movement=/Incasso|Pagamento|Anticipo bancario|Rimborso anticipo/i.test(document.getElementById('treasury-preview')?.querySelector('h3')?.textContent||'');cls=movement?'green':'red';label=movement?'REGISTRA + BANCA':'REGISTRA FI';}
   else if(/FI\.confirmPlan|AssetExtra\.uiConfirm|Annual\.confirm/.test(cmd)){cls='red';label='REGISTRA FI';}
   else if(/preview/i.test(cmd)){cls='gold';label='ANTEPRIMA';}
   else if(/addEmployee/.test(cmd)){cls='blue';label='SALVA ANAGRAFICA';}
   else if(/newCompany|importData/.test(cmd)){cls='red';label='ATTENZIONE: DATI';}
   else if(/cancel|annulla|storn/i.test(cmd+t)){cls='gray';label='ANNULLA / STORNA';}
   else if(/refreshReport|updateCutoff/.test(cmd)){cls='blue';label='CONSULTA';}
   else continue;
   btn.setAttribute('aria-label',t.trim());btn.setAttribute('aria-description',label);btn.insertAdjacentHTML('afterbegin',flag(cls,label));
  }
  bankRender();
 }
 function bankRender(){
  let box=document.getElementById('op-bank');if(!box){box=document.createElement('details');box.id='op-bank';box.className='riquadro';document.getElementById('fi-body')?.append(box);}
  box.hidden=FIModules.active!=='bl';if(box.hidden)return;box.open=true;
  const date=document.getElementById('tr-cutoff')?.value||oggiIso(),bal=Annual.balancesAt(date)['10']||0;
  const lines=STATO.registrazioni.filter(r=>r.data<=date).flatMap(r=>r.righe.filter(x=>x.conto==='10').map(x=>({date:r.data,descr:r.descrizione,side:x.dareAvere,amount:x.importo}))).sort((a,b)=>a.date.localeCompare(b.date));
  const initial=FI.opening().filter(r=>r.conto==='10').reduce((t,r)=>t+(r.dareAvere==='DARE'?1:-1)*r.importo,0);
  box.innerHTML='<summary><b>Conto corrente unico — 10 / CC-UNICO</b></summary><p>Saldo contabile al '+esc(date)+': <b>'+euro(bal/100)+'</b>. Banca di regolamento per tutti i moduli. Il saldo tiene conto dell’apertura; le scritture tecniche di chiusura/riapertura rimangono identificabili nello storico.</p><p>Saldo patrimoniale iniziale di riferimento: '+euro(initial)+'. Questo riquadro consulta i movimenti: non crea un secondo conto e non registra bonifici reali.</p><table class="registro"><thead><tr><th>Data</th><th>Origine</th><th>Entrate (Dare)</th><th>Uscite (Avere)</th></tr></thead><tbody>'+lines.map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.descr)+'</td><td>'+(x.side==='DARE'?euro(x.amount):'')+'</td><td>'+(x.side==='AVERE'?euro(x.amount):'')+'</td></tr>').join('')+'</tbody></table>';
 }
 function masterNotice(){
  const table=document.getElementById('tab-capacita-centri');if(!table)return;let n=document.getElementById('op-centri-notice');if(!n){n=document.createElement('div');n.id='op-centri-notice';n.className='op-guidance';table.before(n);}
  const c=STATO.centriDiCosto.find(x=>['piegatura','piega','piegatrice'].includes(String(x.nome).toLowerCase()));
  n.innerHTML='<b>Tre centri produttivi: Taglio, Piegatura e Saldatura</b><p>'+ (c?'Piegatura: '+esc(c.numeroAddetti)+' addetto/i; '+esc(c.oreAnnuePreviste)+' ore annue; tariffa '+euro(tariffaOraria(c))+'/h.':'Piegatura assente: '+esc(warning))+' Le capacità derivano dal ciclo corrente. Gli ordini già creati conservano lo standard originario.</p>';
  const budgets=STATO.fi.budgetPool||[],missing=budgets.filter(b=>c&&!b.centri.some(x=>String(x.id)===String(c.id)));
  if(missing.length)n.innerHTML+='<div class="op-alert">Budget storici senza Piegatura: '+missing.map(x=>esc(x.mese)).join(', ')+'. Non sono stati riscritti: usa Impostazioni → Integra nuovi centri nel budget già aperto, dopo aver controllato il mese e il periodo PP.</div>';
 }
 function wrap(){
  const render=FI.render;FI.render=function(){const r=render.apply(this,arguments);decorate();return r;};
  const go=FIModules.go;FIModules.go=function(){const r=go.apply(this,arguments);decorate();return r;};
  for(const name of ['uiPreviewService','uiPreviewSettlement','uiPreviewAdvance','uiPreviewRepay','updateCutoff','resetCutoff','uiConfirm']){const old=Treasury[name];Treasury[name]=function(){const r=old.apply(this,arguments);decorate();return r;};}
  for(const name of ['previewCapital','previewAsset','previewPayroll','previewAdjustment','previewReversal','previewDepreciation','confirmPlan']){const old=FI[name];FI[name]=function(){const r=old.apply(this,arguments);decorate();return r;};}
  for(const name of ['uiPreviewDisposal','uiPreviewSopravvenienza','uiConfirm']){const old=AssetExtra[name];AssetExtra[name]=function(){const r=old.apply(this,arguments);decorate();return r;};}
  for(const name of ['previewVAT','previewTax','previewTaxAdvance','previewClose','previewOpen','confirm']){const old=Annual[name];Annual[name]=function(){const r=old.apply(this,arguments);decorate();return r;};}
  const budget=renderBudgetAnnuo;renderBudgetAnnuo=function(){const r=budget.apply(this,arguments);masterNotice();return r;};
 }
 return {ensure,decorate,aa,bankRender,wrap,masterNotice,get warning(){return warning;}};
})();
Operativita.ensure();Operativita.wrap();
