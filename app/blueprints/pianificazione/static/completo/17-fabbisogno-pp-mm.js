/* Generato da tools/split_simulatore.py (completo) — non modificare a mano: modifica sorgenti/ e rilancia. */
/* Pianificazione locale didattica: nessun fabbisogno o documento previsionale posta FI. */
window.FabbisognoPM=(()=>{
 'use strict';
 const sum=(a,f)=>a.reduce((n,x)=>n+f(x),0), round=n=>Math.round(n*100)/100;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const codes=['TRANSENNA','SL-PIEGA','SL-TAGLIO','FERRO'];
 const phaseTypes=['SL','PIEGA','PF'];
 const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 const add=(d,n)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
 const working=d=>![0,6].includes(new Date(d+'T00:00:00Z').getUTCDay());
 const workEnd=d=>{while(!working(d))d=add(d,-1);return d;};
 const back=(d,n)=>{d=workEnd(d);while(n-->0){d=add(d,-1);while(!working(d))d=add(d,-1);}return d;};
 const days=(a,b)=>{let n=0;for(let d=a;d<=b;d=add(d,1))if(working(d))n++;return Math.max(1,n);};
 const state=()=>STATO.fabbisognoPM||{schema:1,plans:[],requests:[],events:[]};
 const active=o=>!o.teco&&!o.liquidazione;
 // Leggi lo schema persistito dagli ordini UI; fallback solo per campi legacy assenti.
 // Non migrare né riscrivere gli ordini storici durante la pianificazione.
 const orderStart=o=>o.dataInizio??o.data??o.inizio;
 const orderFinish=o=>o.dataFine??o.fine??orderStart(o);
 const leftover=o=>{const r=PP.riepilogo(o);return Math.max(0,o.qty-r.entrati-r.scarto);};
 function allocation(pool,qty,date,commit=true,commessa){let remain=qty;const lots=[];for(const t of pool){if(t.date>date||t.qty<=0||(commessa!==undefined&&t.commessaId&&t.commessaId!==String(commessa)))continue;const q=Math.min(remain,t.qty);if(q>0){lots.push({source:t.source,date:t.date,qty:round(q)});if(commit)t.qty=round(t.qty-q);remain=round(remain-q);}if(remain<=0)break;}return {required:round(qty),covered:round(qty-remain),shortage:round(remain),lots};}
 function pools(asOf){
   const docs=SDMM.documentiMateriale(), po=STATO.pp.ordini||[], chains=STATO.pp.catene||[], out=Object.fromEntries(codes.map(c=>[c,[]]));
   for(const c of codes){
     const q=sum(docs.filter(d=>d.mat===c&&d.data<=asOf),d=>(d.segno||0)*(d.qty||0));
     out[c].push({source:'STOCK '+c,date:asOf,qty:Math.max(0,q)});
     docs.filter(d=>d.mat===c&&d.data>asOf&&d.segno>0).forEach(d=>out[c].push({source:d.doc,date:d.data,qty:d.qty}));
     // Consumi già postati nel futuro non possono essere assegnati ad un'altra commessa.
     const future=sum(docs.filter(d=>d.mat===c&&d.data>asOf&&d.segno<0),d=>d.qty||0);
     allocation(out[c],future,'9999-12-31');
   }
   for(const p of SDMM.poAperti()){const raw=STATO.sdmm.po.find(x=>x.id===p.id);if(!raw?.annullato)out.FERRO.push({source:'PO '+p.id,date:p.data,qty:p.qty,commessaId:raw.commessaId?String(raw.commessaId):''});}
   // Le prenotazioni PP sono impegni, non nuove scorte; i residui (non il fabbisogno originale) sono sottratti una sola volta.
   Object.defineProperty(out,'commitments',{value:[]});
   for(const o of po.filter(active))for(const r of o.prenotazioni||[]){const used=PP.riepilogo(o).comp[r.mat]?.qty||0;if(out[r.mat]){const start=orderStart(o),date=start<asOf?asOf:start,result=allocation(out[r.mat],Math.max(0,r.fabbisogno-used),r.mat==='FERRO'?date:'9999-12-31',true,String(o.commessaId));if(r.mat==='FERRO')out.commitments.push({order:o.id,commessaId:String(o.commessaId),date:start,result});}}
   // Stock virtualmente riservato alle catene: sottrai solo la parte non già assegnata a prenotazioni.
   for(const k of chains.filter(k=>!k.annullata))for(const c of ['SL-PIEGA','SL-TAGLIO']){
     const os=po.filter(o=>o.catenaId===k.id),produced=sum(os.filter(o=>o.materiale===c),o=>PP.riepilogo(o).entrati),assigned=sum(os,o=>sum((o.prenotazioni||[]).filter(r=>r.mat===c),r=>active(o)?r.fabbisogno:(PP.riepilogo(o).comp[c]?.qty||0)));
     allocation(out[c],Math.max(0,(k.scorte?.[c]||0)+produced-assigned),'9999-12-31');
   }
   // Una catena è UNA promessa PF. Non sommare anche SL e PF della stessa catena.
   for(const k of chains.filter(k=>!k.annullata)){
     const os=po.filter(o=>o.catenaId===k.id),pf=os.filter(o=>o.materiale==='TRANSENNA');
     const complete=sum(pf,o=>PP.riepilogo(o).entrati),hasOpen=os.some(active);
     if(hasOpen&&k.qty>complete){let due=os.reduce((d,o)=>orderFinish(o)>d?orderFinish(o):d,asOf);const defs=[PP.struttura().sl,PP.struttura().piega,PP.struttura().pf],last=Math.max(...os.map(o=>codes.indexOf(o.materiale)===0?2:o.materiale==='SL-PIEGA'?1:0));
       for(let i=last+1;i<3;i++){const duration=Math.max(1,...defs[i].operazioni.map(op=>{const c=STATO.centriDiCosto.find(c=>String(c.id)===String(op.centroCostoId));return Math.ceil((k.qty-complete)*op.oreStdPezzo/Math.max(.001,(c?.oreAnnuePreviste||0)/260));}));for(let n=0;n<duration;n++){due=add(due,1);while(!working(due))due=add(due,1);}}
       out.TRANSENNA.push({source:'CAT '+k.id,date:due,qty:k.qty-complete,commessaId:String(k.commessaId),estimated:true});}
   }
   for(const o of po.filter(o=>active(o)&&!chains.some(k=>k.id===o.catenaId))){const q=leftover(o);if(q&&out[o.materiale])out[o.materiale].push({source:'PP '+o.id,date:orderFinish(o),qty:q,commessaId:String(o.commessaId),estimated:true});}
   Object.values(out).forEach(a=>a.sort((x,y)=>x.date.localeCompare(y.date)||x.source.localeCompare(y.source)));
   return out;
 }
 function schedule(qties,due,asOf,load){
   const st=PP.struttura(),defs=[st.sl,st.piega,st.pf],phases=[];let finish=workEnd(due);
   for(let i=2;i>=0;i--){const qty=qties[i],def=defs[i],ops=def.operazioni;
     const centers=[...new Set(ops.map(o=>String(o.centroCostoId)))].map(id=>{const c=STATO.centriDiCosto.find(c=>String(c.id)===id),hours=sum(ops.filter(o=>String(o.centroCostoId)===id),o=>o.oreStdPezzo*qty),daily=(Number(c?.oreAnnuePreviste)||0)/260;return {id,name:c?.nome||id,hours:round(hours),daily:round(daily)};});
     const duration=qty?Math.max(1,...centers.map(c=>c.daily>0?Math.ceil(c.hours/c.daily):999)):0;
     const start=duration?back(finish,duration-1):finish;
     const capacity=centers.map(c=>{const existing=sum(load.filter(x=>x.center===c.id&&x.start<=finish&&x.end>=start),x=>x.daily*days(x.start>start?x.start:start,x.end<finish?x.end:finish));const available=c.daily*days(start,finish);return {...c,existingHours:round(existing),available:round(available),total:round(existing+c.hours),overloaded:existing+c.hours>available+.01};});
     phases.unshift({type:phaseTypes[i],material:defs[i].materiale,qty,start,finish,duration,centers:capacity,late:start<asOf,cost:round(qty*def.costoUnitario),labor:round(sum(ops,o=>o.costoPersonalePezzo*qty)),overhead:round(sum(ops,o=>o.costoGeneraliPezzo*qty))});
     if(qty)finish=back(start,1);
   }return phases;
 }
 function compute(input={}){
   const asOf=input.asOf||oggiIso();if(!validDate(asOf))throw Error('Data pianificazione non valida.');
   const st=PP.struttura();if(!st.sl.operazioni.length||!st.piega.operazioni.length||!st.pf.operazioni.length)throw Error('Configura i tre centri e il routing Taglio/Piega/Saldatura.');
   for(const op of [...st.sl.operazioni,...st.piega.operazioni,...st.pf.operazioni]){const c=STATO.centriDiCosto.find(c=>String(c.id)===String(op.centroCostoId));if(!(Number(c?.oreAnnuePreviste)>0))throw Error('Centro '+(c?.nome||op.centroCostoId)+' senza capacità annua: completa Budget/centri prima di stimare date.');}
   const pool=pools(asOf),load=[];
   for(const o of (STATO.pp.ordini||[]).filter(active)){const q=leftover(o),start=orderStart(o),end=orderFinish(o);for(const op of o.std?.operazioni||[]){load.push({center:String(op.centroCostoId),start,end,daily:(op.oreStdPezzo*q)/days(start,end)});}}
   const rows=[];
   const demands=SDMM.fabbisogniVendita().sort((a,b)=>a.data.localeCompare(b.data)||String(a.id).localeCompare(String(b.id)));
   for(const d of demands){
     if(!validDate(d.data))continue;
     const pf=allocation(pool.TRANSENNA,d.qty,d.data,true,d.commessaId),need=pf.shortage;
     // Allocazione a ritroso, poi seconda passata conservativa alle date effettive del routing.
     const initial=schedule([need,need,need],d.data,asOf,load);
     const piega=allocation(pool['SL-PIEGA'],need,initial[2].start,true,d.commessaId),middle=schedule([piega.shortage,piega.shortage,need],d.data,asOf,load),taglio=allocation(pool['SL-TAGLIO'],piega.shortage,middle[1].start,true,d.commessaId);
     const phases=schedule([taglio.shortage,piega.shortage,need],d.data,asOf,load);
     let materialDate=phases[0].qty?phases[0].start:asOf;const ferro=allocation(pool.FERRO,taglio.shortage*st.sl.componenti[0].qtyPz,materialDate,true,d.commessaId);
     // Una promessa PF NON cancella il ferro ancora dovuto agli ordini della propria commessa.
     for(const commitment of pool.commitments.filter(c=>c.commessaId&&c.commessaId===String(d.commessaId)&&!c.assigned)){const a=commitment.result;ferro.required=round(ferro.required+a.required);ferro.covered=round(ferro.covered+a.covered);ferro.shortage=round(ferro.shortage+a.shortage);ferro.lots.push(...a.lots.map(l=>({...l,source:l.source+' → prenotazione PP '+commitment.order})));materialDate=materialDate<commitment.date?materialDate:commitment.date;commitment.assigned=true;}
     const row={orderId:String(d.id),commessaId:String(d.commessaId||''),qty:d.qty,due:d.data,blocked:d.bloccato,pf,piega,taglio,ferro,materialDate,phases,production:need,asOf};
     row.warnings=[];if(d.bloccato)row.warnings.push('Ordine SD bloccato: verificare credito/conferma; non è un rilascio automatico.');
     const lateFerro=pool.FERRO.filter(t=>t.qty>0&&t.date>materialDate&&(!t.commessaId||t.commessaId===String(d.commessaId)));if(ferro.shortage&&lateFerro.length)row.warnings.push('Ferro già promesso ma tardivo: '+lateFerro.map(t=>t.source+' '+t.qty+' kg dal '+t.date).join('; ')+'. Valuta anticipo o riprogrammazione prima di un altro acquisto. Non copre la data attuale.');
     if(ferro.shortage)row.warnings.push('Ferro mancante: il 261 resta bloccato fino all’entrata fisica; la carenza PF giustifica comunque la proposta di produzione.');
     if(phases.some(p=>p.qty&&p.late))row.warnings.push('Inizio necessario nel passato: scadenza non fattibile con queste ipotesi. Rinegoziare data SD.');
     if(phases.some(p=>p.centers.some(c=>c.overloaded)))row.warnings.push('Capacità sovraccarica: nessuna promessa automatica di consegna.');
     if(pf.lots.some(l=>l.source.startsWith('CAT ')))row.warnings.push('Copertura da catena aperta: data stimata include lead time delle fasi mancanti, non è garanzia ATP; le fasi successive restano da rilasciare.');
     rows.push(row);for(const p of phases.filter(p=>p.qty))for(const c of p.centers)load.push({center:c.id,start:p.start,end:p.finish,daily:c.hours/days(p.start,p.finish)});
   }
   return {schema:1,asOf,assumptions:'Lun–Ven, 260 giorni lavorativi/anno, ore annue centro / 260; durata minima una giornata per fase, nessun trasporto/setup/festività, fasi non sovrapposte. Capacità finita diagnosticata, non livellamento automatico. Promesse PP/PO non sono stock prelevabile. Priorità: scadenza SD poi numero ordine. Costi da routing/BOM attuali, senza registrazioni FI.',rows,remaining:pool};
 }
 function rowFor(id,asOf){const r=compute({asOf}).rows.find(r=>r.orderId===String(id));if(!r)throw Error('Ordine SD non presente, annullato o già consegnato.');return r;}
 function signature(x){return JSON.stringify(x);}
 function atomic(fn){const backup=structuredClone(STATO),old=localStorage.getItem(CHIAVE_STORAGE);try{const result=fn();ensure().events.push({at:new Date().toISOString(),result:structuredClone(result)});localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(STATO));return result;}catch(e){STATO=backup;try{if(old===null)localStorage.removeItem(CHIAVE_STORAGE);else localStorage.setItem(CHIAVE_STORAGE,old);}catch(_){}throw e;}}
 function ensure(){return STATO.fabbisognoPM||(STATO.fabbisognoPM={schema:1,plans:[],requests:[],events:[]});}
 function previewPlan(orderId,asOf){const row=rowFor(orderId,asOf);return {kind:'PLAN',orderId:String(orderId),asOf:row.asOf,row,fingerprint:signature(row)};}
 function confirmPlan(plan){
   if(plan.kind!=='PLAN')throw Error('Anteprima non valida.');
   const existing=state().plans.find(p=>p.orderId===plan.orderId&&!p.cancelled);if(existing?.confirmedFingerprints?.includes(plan.fingerprint))return {duplicate:true,plan:existing};
   const current=rowFor(plan.orderId,plan.asOf);if(signature(current)!==plan.fingerprint)throw Error('Dati cambiati: ricalcola l’anteprima prima di confermare.');
   if(existing&&signature(existing.snapshot)===signature(current))return {duplicate:true,plan:existing};
   if(!current.production&&!existing)throw Error('PF stock/promessi coprono già: nessuna nuova commessa o acquisto.');
   return atomic(()=>{const s=ensure();let com=STATO.commesse.find(c=>String(c.id)===current.commessaId);
     if(!com){const id=STATO.prossimoIdCommessa||Math.max(0,...STATO.commesse.map(c=>Number(c.id)||0))+1;STATO.prossimoIdCommessa=id+1;com={id,codice:'FABB-SD-'+current.orderId,descrizione:'Carenza SD '+current.orderId+' — consegna '+current.due,quantitaPianificata:current.production,stato:'aperta'};STATO.commesse.push(com);STATO.sdmm.ordini.find(o=>String(o.id)===current.orderId).commessaId=String(id);}
     if(com.stato==='chiusa')throw Error('Commessa chiusa: riaprila esplicitamente oppure modifica il collegamento SD.');
     current.commessaId=String(com.id);
     const p=existing||{id:'PLAN-'+current.orderId,orderId:current.orderId,commessaId:String(com.id),created:oggiIso()};Object.assign(p,{asOf:plan.asOf,snapshot:current,updated:oggiIso()});p.confirmedFingerprints||=[];p.confirmedFingerprints.push(plan.fingerprint);if(!existing)s.plans.push(p);
     let req=s.requests.find(r=>r.planId===p.id&&!r.poId);
     if(req){Object.assign(req,{qty:current.ferro.shortage,needDate:current.materialDate,asOf:plan.asOf,state:current.ferro.shortage?(req.rfqId?'PREVENTIVO':'RICHIESTA'):'COPERTA'});if(req.rfqId){const rfq=STATO.sdmm.rfq.find(r=>r.id===req.rfqId);if(rfq){rfq.qty=req.qty;rfq.dataConsegna=req.needDate;}}}
     else if(current.ferro.shortage){const index=s.requests.filter(r=>r.planId===p.id).length;req={id:'RDA-'+current.orderId+(index?'-'+(index+1):''),planId:p.id,orderId:current.orderId,commessaId:p.commessaId,material:'FERRO',qty:current.ferro.shortage,needDate:current.materialDate,asOf:plan.asOf,state:'RICHIESTA',rfqId:null,poId:null};s.requests.push(req);}
     return {plan:p,request:req||null,updated:!!existing};});
 }
 function request(id){const r=state().requests.find(r=>r.id===id);if(!r)throw Error('Richiesta non trovata.');return r;}
 function previewPurchase(id,input){
   const r=request(id);if(r.poId)throw Error('Richiesta già ordinata: '+r.poId);
   const asOf=input.asOf||oggiIso(),row=rowFor(r.orderId,asOf),qty=Math.min(r.qty,row.ferro.shortage);
   if(!(qty>0))throw Error('Stock e PO promessi coprono già il fabbisogno: acquisto bloccato.');
   if(!validDate(input.date)||input.date<asOf)throw Error('Data consegna valida non anteriore alla pianificazione.');
   if(!String(input.reason||'').trim())throw Error('Indica motivazione della selezione o dell’acquisto diretto.');
   const supplier=STATO.sdmm.fornitori.find(f=>f.id===input.supplier);if(!supplier)throw Error('Seleziona un fornitore reale della tua anagrafica.');
   let price=Number(input.price),offer=null;
   if(r.rfqId){const rfq=STATO.sdmm.rfq.find(x=>x.id===r.rfqId);offer=rfq?.fornitori.find(f=>f.fid===input.supplier);if(!(offer?.prezzo>0))throw Error('Registra prima l’offerta ricevuta da questo fornitore.');price=offer.prezzo;if(input.date<add(rfq.data,offer.gg))throw Error('Consegna anticipata rispetto ai giorni dichiarati nell’offerta.');}
   if(!(price>0&&Number.isFinite(price)))throw Error('Prezzo concordato positivo richiesto; nessuna offerta viene inventata.');
   return {kind:'PO',requestId:id,qty,price,supplier:input.supplier,date:input.date,reason:String(input.reason).trim(),asOf,late:input.date>row.materialDate,warnings:row.warnings.filter(w=>w.startsWith('Ferro già promesso')),rowFingerprint:signature(row),offerFingerprint:signature(offer)};
 }
 function confirmPurchase(p){
   if(p.kind!=='PO')throw Error('Anteprima PO non valida.');const r=request(p.requestId);if(r.poId)return {duplicate:true,poId:r.poId};
   const fresh=previewPurchase(p.requestId,p);if(signature(fresh)!==signature(p))throw Error('Fabbisogno/offerta cambiati: rifai l’anteprima.');
   return atomic(()=>{const id=SDMM.nuovoPO(p.supplier,p.qty,p.price,p.date,r.id),po=STATO.sdmm.po.find(x=>x.id===id);Object.assign(po,{commessaId:r.commessaId,sdOrderId:r.orderId,needDate:r.needDate,procurementReason:p.reason,rfqId:r.rfqId||'',fabbisognoRequestId:r.id});r.poId=id;r.state='ORDINATA';r.orderedQty=p.qty;
     if(r.rfqId){const rfq=STATO.sdmm.rfq.find(x=>x.id===r.rfqId);rfq.stato='ASSEGNATA';rfq.vincitore=p.supplier;rfq.poId=id;}return {poId:id};});
 }
 function previewRFQ(id,suppliers,asOf=oggiIso()){
   const r=request(id);if(r.poId)throw Error('Richiesta già ordinata.');const row=rowFor(r.orderId,asOf),qty=Math.min(r.qty,row.ferro.shortage);if(!qty)throw Error('Nessuna carenza netta: non chiedere offerte.');
   const ids=[...new Set(suppliers)].filter(id=>STATO.sdmm.fornitori.some(f=>f.id===id));if(ids.length<2)throw Error('Se scegli RFQ, seleziona almeno due fornitori per confronto. Acquisto diretto resta disponibile con motivazione.');
   return {kind:'RFQ',requestId:id,suppliers:ids,qty,date:row.materialDate,asOf,fingerprint:signature(row)};
 }
 function confirmRFQ(p){if(p.kind!=='RFQ')throw Error('Anteprima RFQ non valida.');const r=request(p.requestId);if(r.rfqId)return {duplicate:true,rfqId:r.rfqId};if(r.poId)throw Error('Già ordinata.');const fresh=previewRFQ(p.requestId,p.suppliers,p.asOf);if(signature(fresh)!==signature(p))throw Error('Fabbisogno cambiato.');
   return atomic(()=>{let id;do{id=String(++STATO.sdmm.cnt.rfq);}while(STATO.sdmm.rfq.some(r=>r.id===id));const rfq={id,data:p.asOf,qty:p.qty,dataConsegna:p.date,fornitori:p.suppliers.map(fid=>({fid,prezzo:null,gg:null,pagGg:STATO.sdmm.fornitori.find(f=>f.id===fid).pagamentoGg})),stato:'APERTA',poId:null,vincitore:null,fabbisognoRequestId:r.id,commessaId:r.commessaId,sdOrderId:r.orderId};STATO.sdmm.rfq.push(rfq);r.rfqId=id;r.state='PREVENTIVO';return {rfqId:id};});}
 function previewOffer(id,input){const r=request(id),rfq=STATO.sdmm.rfq.find(x=>x.id===r.rfqId);if(!rfq||r.poId)throw Error('RFQ non aperta.');if(!rfq.fornitori.some(f=>f.fid===input.supplier))throw Error('Fornitore non invitato.');const price=Number(input.price),days=Number(input.days);if(!(price>0&&Number.isFinite(price)&&Number.isInteger(days)&&days>=0))throw Error('Prezzo >0 e giorni interi >=0.');if(!String(input.reference||'').trim())throw Error('Indica il riferimento dell’offerta inserita dall’utente (anche esercitazione).');return {kind:'OFFER',requestId:id,supplier:input.supplier,price,days,reference:String(input.reference).trim()};}
 function confirmOffer(p){const fresh=previewOffer(p.requestId,p);if(signature(fresh)!==signature(p))throw Error('Anteprima non valida.');return atomic(()=>{const r=request(p.requestId),rfq=STATO.sdmm.rfq.find(x=>x.id===r.rfqId),o=rfq.fornitori.find(f=>f.fid===p.supplier);Object.assign(o,{prezzo:p.price,gg:p.days,reference:p.reference});r.state='SELEZIONE';return {rfqId:rfq.id};});}
 let preview=null,last=null;
 const $=id=>document.getElementById(id),value=id=>$(id)?.value||'';
 function guard(fn){try{return fn();}catch(e){$('fp-message').textContent='⛔ '+e.message;return null;}}
 function table(headers,rows){return '<table class="registro"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';}
 function show(p){preview=p;let body='',title='';const name=id=>STATO.sdmm.fornitori.find(f=>f.id===id)?.nome||id;
   if(p.kind==='PLAN'){title='Commessa e richiesta materiali';body=table(['Ordine cliente','Scadenza','PF da produrre','Commessa','Ferro scoperto'],[[esc(p.orderId),esc(p.row.due),p.row.production,p.row.commessaId?'Prosegui '+esc(p.row.commessaId):'Apri nuova commessa',p.row.ferro.shortage+' kg entro '+esc(p.row.materialDate)]])+table(['Proposta (non rilasciata)','Pezzi','Inizio','Fine'],p.row.phases.map(f=>[f.material,f.qty,esc(f.start),esc(f.finish)]))+'<p>Confermare salva il piano e la richiesta: <b>non rilascia ordini PP e non compra nulla</b>. Poi apri CO01 della prima fase, registra 261 → CO11N → 101, e prosegui dalla guida PP.</p>'+(p.row.warnings.length?'<p class="fp-red">'+p.row.warnings.map(esc).join('<br>')+'</p>':'');}
   if(p.kind==='RFQ'){title='Richiesta di preventivo facoltativa';body='<p>Richiesta '+esc(p.requestId)+' · '+p.qty+' kg di FERRO entro '+esc(p.date)+'</p><p>Fornitori: '+p.suppliers.map(id=>esc(name(id))).join(', ')+'</p><p>Salva RFQ locale, <b>non invia messaggi esterni e non inventa offerte</b>.</p>';}
   if(p.kind==='OFFER'){title='Offerta ricevuta e inserita da te';body='<p>'+esc(name(p.supplier))+' · '+p.price+' €/kg · '+p.days+' giorni consegna</p><p>Riferimento: '+esc(p.reference)+'</p><p>Si salva l’offerta, non si crea ancora un ordine.</p>';}
   if(p.kind==='PO'){title='Ordine di acquisto da confermare';body=table(['Richiesta','Fornitore','Kg','€/kg','Imponibile stimato','Consegna'],[[esc(p.requestId),esc(name(p.supplier)),p.qty,p.price,round(p.qty*p.price)+' €',esc(p.date)]])+'<p>Motivazione: '+esc(p.reason)+'</p>'+(p.late?'<p class="fp-red">Consegna dopo il fabbisogno: rinegozia la scadenza cliente o accelera il fornitore. Nessuna promessa automatica.</p>':'')+'<p>Confermare crea <b>un PO senza FI</b>. Il ferro sarà prelevabile solo dopo la sua entrata fisica MIGO alla data effettiva.</p>';}
   $('fp-preview').innerHTML='<h3>Anteprima — '+title+'</h3>'+body+(p.warnings?.length?'<p class="fp-red">'+p.warnings.map(esc).join('<br>')+'</p>':'')+'<p>Nessuna FI. Controlla dati e collegamenti prima di confermare.</p><button class="bottone primario" id="fp-confirm" onclick="FabbisognoPM.uiConfirm()">Confermo questa operazione</button><button class="bottone" onclick="FabbisognoPM.cancelPreview()">Annulla</button><details><summary>Dettaglio tecnico del controllo anti-duplicati</summary><pre style="max-height:200px;overflow:auto;white-space:pre-wrap">'+esc(JSON.stringify(p,null,2))+'</pre></details>';$('fp-preview').scrollIntoView({block:'center'});}
 function render(){
   const host=$('fp-body');if(!host)return;const saved=value('fp-asof')||oggiIso(),chosen=value('fp-order'),rid=value('fp-request');
   host.innerHTML=`<div id="fp-message" role="status"></div><div class="fp-intro"><h2>🧭 1. Prima la carenza, poi commessa e documenti</h2><p>Pianifica senza scritture: leggi stock e promesse una sola volta. Produzione solo per carenza PF; materiale mancante blocca il prelievo, non la proposta.</p><label>Data pianificazione <input type="date" id="fp-asof" value="${esc(saved)}"></label> <button class="bottone primario" id="fp-calculate" onclick="FabbisognoPM.uiCalculate()">Calcola fabbisogno e ore</button></div><div id="fp-results"></div><div class="fp-action"><h3>2. Apertura guidata — conferma umana</h3><label>Ordine SD <select id="fp-order">${SDMM.fabbisogniVendita().map(o=>`<option value="${esc(o.id)}" ${String(o.id)===chosen?'selected':''}>${esc(o.id)} · ${o.qty} pz · ${esc(o.data)}</option>`).join('')}</select></label> <button class="bottone" onclick="FabbisognoPM.uiPlan()">Anteprima commessa + eventuale richiesta acquisto</button><p>Non crea ordini PP automaticamente. Apri la prima fase proposta; dopo 261 / CO11N / 101 usa la guida PP per il seguito.</p><div id="fp-docs"></div></div><div class="fp-buy"><h3>3. Acquisto — diretto motivato oppure confronto RFQ</h3><p>Offerte solo inserite da te; nessun invio esterno. RFQ facoltativa. PO non crea FI: le scritture restano MIGO/MIRO.</p><label>Richiesta <select id="fp-request">${state().requests.map(r=>`<option value="${esc(r.id)}" ${r.id===rid?'selected':''}>${esc(r.id)} · ${r.qty} kg · ${esc(r.state)}</option>`).join('')}</select></label><div class="fg">${STATO.sdmm.fornitori.map(f=>`<label><input type="checkbox" class="fp-supplier" value="${esc(f.id)}"> ${esc(f.nome)}</label>`).join('')}</div><button class="bottone" onclick="FabbisognoPM.uiRFQ()">Anteprima RFQ ai fornitori selezionati</button><hr><label>Fornitore <select id="fp-supplier">${STATO.sdmm.fornitori.map(f=>`<option value="${esc(f.id)}">${esc(f.nome)}</option>`).join('')}</select></label> <label>Prezzo €/kg <input id="fp-price" type="number" step="0.001" min="0"></label> <label>Consegna <input id="fp-delivery" type="date" value="${esc(saved)}"></label><p><label>Motivazione scelta/diretto <input id="fp-reason" placeholder="Fornitore abituale, prezzo concordato…"></label> <button class="bottone primario" onclick="FabbisognoPM.uiPurchase()">Anteprima ordine fornitore</button></p><details><summary>Registra offerta ricevuta per confronto</summary><p>Non sono offerte reali generate dal simulatore. Indica un riferimento effettivo oppure «esercitazione».</p><label>Giorni consegna <input id="fp-offer-days" type="number" min="0" step="1"></label><label>Rif. offerta <input id="fp-offer-ref"></label><button class="bottone" onclick="FabbisognoPM.uiOffer()">Anteprima salvataggio offerta</button></details><div id="fp-offers"></div></div><div id="fp-preview" class="fp-action"></div>`;
   $('fp-docs').innerHTML=table(['Piano / SD','Commessa','Prima fase / documenti'],state().plans.map(p=>{const req=state().requests.find(r=>r.planId===p.id),first=p.snapshot.phases.find(x=>x.qty>0);return [esc(p.id)+' / '+esc(p.orderId),esc(p.commessaId),`<button class="bottone" onclick="FabbisognoPM.openPhase('${esc(p.id)}')">Apri CO01 ${esc(first?.material||'')}</button> ${req?esc(req.id)+' · '+esc(req.state):'Ferro coperto'} ${req?.rfqId?`<button onclick="FabbisognoPM.openDocument('rfq','${esc(req.rfqId)}')">RFQ ${esc(req.rfqId)}</button>`:''} ${req?.poId?`<button onclick="FabbisognoPM.openDocument('po','${esc(req.poId)}')">PO ${esc(req.poId)}</button> <button onclick="FabbisognoPM.openDocument('migo','${esc(req.poId)}')">MIGO</button>`:''}`];}));
   $('fp-docs').innerHTML+='<p><b>Commessa esistente?</b> Prosegui senza crearne un’altra. Ricalcola e prepara di nuovo l’anteprima per aggiornare la richiesta residua: coperture e documenti già emessi restano tracciati.</p>'+table(['Richiesta / SD / commessa','Quantità e data','Stato e documenti'],state().requests.map(r=>[esc(r.id)+' / '+esc(r.orderId)+' / '+esc(r.commessaId),r.qty+' kg entro '+esc(r.needDate),esc(r.state)+(r.rfqId?` <button onclick="FabbisognoPM.openDocument('rfq','${esc(r.rfqId)}')">RFQ ${esc(r.rfqId)}</button>`:'')+(r.poId?` <button onclick="FabbisognoPM.openDocument('po','${esc(r.poId)}')">PO ${esc(r.poId)}</button>`:'')]))+'<details><summary>Audit conferme e collegamenti (locale)</summary><pre style="white-space:pre-wrap;max-height:250px;overflow:auto">'+esc(JSON.stringify(state().events.slice(-15),null,2))+'</pre></details>';
   $('fp-docs').innerHTML+='<h4>Ordini PP già collegati — storico e nuovo ciclo leggibili</h4>'+table(['Piano / commessa','Ordine / materiale','Stato','Documento'],state().plans.flatMap(p=>STATO.pp.ordini.filter(o=>String(o.commessaId)===p.commessaId).map(o=>[esc(p.id)+' / '+esc(p.commessaId),esc(o.id)+' / '+esc(o.materiale),esc(PP.statoOrdine(o)),`<button onclick="FabbisognoPM.openDocument('pp','${esc(o.id)}')">CO03 ${esc(o.id)}</button>`])));
   $('fp-offers').innerHTML='<p>Confronta prezzo, valore e consegna. Il miglior prezzo non seleziona automaticamente: scegli il fornitore nel campo sopra e motiva la decisione.</p>'+table(['RFQ / richiesta','Fornitore','€/kg','Totale €','Giorni / prima data','Riferimento / stato'],state().requests.filter(r=>r.rfqId).flatMap(r=>{const rfq=STATO.sdmm.rfq.find(x=>x.id===r.rfqId),prices=(rfq?.fornitori||[]).filter(o=>o.prezzo>0).map(o=>o.prezzo),best=Math.min(...prices);return (rfq?.fornitori||[]).map(o=>[esc(r.rfqId)+' / '+esc(r.id),esc(STATO.sdmm.fornitori.find(f=>f.id===o.fid)?.nome),o.prezzo>0?o.prezzo+(o.prezzo===best?' · minor prezzo':''):'attesa',o.prezzo>0?round(o.prezzo*rfq.qty):'—',o.gg!==null?o.gg+' / '+esc(add(rfq.data,o.gg)):'—',esc(o.reference||'')+' / '+esc(r.state)]);}));
 }
 function display(result){last=result;$('fp-results').innerHTML='<p class="fp-assumptions">'+esc(result.assumptions)+'</p>'+result.rows.map(r=>`<div class="fp-row"><h3>SD ${esc(r.orderId)} — ${r.qty} pz entro ${esc(r.due)} <span class="${r.production?'fp-red':'fp-green'}">Produzione netta ${r.production} pz</span></h3>${table(['Materiale','Richiesto','Coperto alla data','Carenza','Fonti (mai doppie)'],[['PF',r.pf],['Piegati',r.piega],['Tagliati',r.taglio],['Ferro kg',r.ferro]].map(([m,a])=>[m,a.required,a.covered,a.shortage,esc(a.lots.map(l=>l.source+': '+l.qty+' dal '+l.date).join('; '))]))}${table(['Fase / pezzi','Inizio → fine','Ore per centro','Manodopera €','Generali €','Valore output progressivo €'],r.phases.map(p=>[p.material+' / '+p.qty,esc(p.start)+' → '+esc(p.finish),p.centers.map(c=>`<span class="${c.overloaded?'fp-red':'fp-green'}">${esc(c.name)} ${c.hours}h + esistenti ${c.existingHours} / capacità ${c.available}h</span>`).join('<br>'),p.labor,p.overhead,p.cost]))}<p class="fp-red">${r.warnings.map(esc).join('<br>')}</p></div>`).join('');}
 function openDocument(kind,id){if(kind==='pp'){cambiaVista('pp');PP.vai('co03');PP.sel(id);return;}cambiaVista('sdmm');SDMM.vai(kind);if(kind==='rfq')SDMM.selRFQ(id);else if(kind==='migo')SDMM.selPO('migo',id);}
 function openPhase(id){guard(()=>{const p=state().plans.find(p=>p.id===id);if(!p)throw Error('Piano mancante.');const row=rowFor(p.orderId,value('fp-asof')||oggiIso());const chain=(STATO.pp.catene||[]).find(k=>String(k.commessaId)===p.commessaId&&!k.annullata);cambiaVista('pp');if(chain){PP.vai('co01');return;}
     const first=row.phases.find(x=>x.qty>0);if(!first)throw Error('Domanda già coperta: nessun nuovo ordine.');PP.vai('co01');const root=$('pp-host').shadowRoot;for(const [id,v]of Object.entries({'co-com':p.commessaId,'co-mat':first.type,'co-qty':first.qty,'co-data':first.start,'co-fine':first.finish})){const el=root.getElementById(id);if(el)el.value=v;}PP.prev('co01');});}
 const api={compute,previewPlan,confirmPlan,previewPurchase,confirmPurchase,previewRFQ,confirmRFQ,previewOffer,confirmOffer,render,openPhase,openDocument,cancelPreview:()=>{preview=null;$('fp-preview').innerHTML='';},
   uiCalculate:()=>guard(()=>display(compute({asOf:value('fp-asof')}))),uiPlan:()=>guard(()=>show(previewPlan(value('fp-order'),value('fp-asof')))),uiRFQ:()=>guard(()=>show(previewRFQ(value('fp-request'),[...document.querySelectorAll('.fp-supplier:checked')].map(x=>x.value),value('fp-asof')))),
   uiPurchase:()=>guard(()=>show(previewPurchase(value('fp-request'),{supplier:value('fp-supplier'),price:value('fp-price'),date:value('fp-delivery'),reason:value('fp-reason'),asOf:value('fp-asof')}))),
   uiOffer:()=>guard(()=>show(previewOffer(value('fp-request'),{supplier:value('fp-supplier'),price:value('fp-price'),days:value('fp-offer-days'),reference:value('fp-offer-ref')}))),
   uiConfirm:()=>guard(()=>{if(!preview)throw Error('Prima prepara un’anteprima.');const p=preview,result=({PLAN:confirmPlan,PO:confirmPurchase,RFQ:confirmRFQ,OFFER:confirmOffer})[p.kind](p);preview=null;render();$('fp-message').textContent='✅ '+(result.duplicate?'Documento già presente, nessun doppione. ':result.updated?'Piano aggiornato, stessa commessa. ':'Confermato senza FI. ')+(result.plan?'Piano '+result.plan.id+' · commessa '+result.plan.commessaId+(result.request?' · richiesta '+result.request.id:'')+' — Prosegui dai collegamenti sotto.':result.poId?'Ordine fornitore '+result.poId+' — ricevi con MIGO quando arriva il ferro.':result.rfqId?'RFQ '+result.rfqId+' — inserisci e valuta le offerte.':'');display(compute({asOf:value('fp-asof')}));return result;})};
 function install(){const nav=document.querySelector('nav.tabs'),btn=document.createElement('button');btn.dataset.vista='fabbisogno-pm';btn.textContent='🧭 Fabbisogno PP / MM';btn.onclick=()=>{cambiaVista('fabbisogno-pm');render();};nav.append(btn);const section=document.createElement('section');section.className='vista';section.dataset.vista='fabbisogno-pm';section.innerHTML='<div id="fp-body"></div>';document.querySelector('section.vista').parentNode.append(section);const style=document.createElement('style');style.textContent='#fp-body{max-width:1300px;margin:auto}#fp-body input,#fp-body select{padding:7px;margin:6px;max-width:300px}.fp-intro,.fp-action,.fp-buy,.fp-row{padding:18px;margin:15px 0;border-radius:10px;border:1px solid #b6cbdc;background:#f3f8ff}.fp-buy{background:#fff8e8;border-color:#e4c679}.fp-green{color:#08773d;font-weight:bold}.fp-red{color:#ab2732;font-weight:bold}.fp-assumptions{padding:12px;background:#e6eff6}.fp-row{background:white}#fp-message{white-space:pre-wrap;color:#164a6b}#fp-body table{width:100%}';document.head.append(style);render();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
 return api;
})();
