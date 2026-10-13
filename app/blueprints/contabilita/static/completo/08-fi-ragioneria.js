/* Generato da tools/split_simulatore.py (completo) — non modificare a mano: modifica sorgenti/ e rilancia. */
// ═══════════════════════════════════════════════════════════════════════
// AVVIO
// ═══════════════════════════════════════════════════════════════════════
// Estensione didattica FI, ottobre 2026. Nessun pagamento/F24 o chiusura annuale.
const FI = (() => {
  const nuoviConti = [
    ['01','Impianti e macchinari','ATTIVO'],['02','Fondo ammortamento impianti','RETTIFICA_ATTIVO'],
    ['17','Risconti attivi','ATTIVO'],['18','Ratei attivi','ATTIVO'],
    ['25','Erario c/ritenute','PASSIVO'],['26','INPS c/contributi','PASSIVO'],['27','Fondo TFR','PASSIVO'],
    ['30','Capitale sociale','PATRIMONIO_NETTO'],['32','Patrimonio netto iniziale (esercizio preesistente)','PATRIMONIO_NETTO'],
    ['33','Ratei passivi','PASSIVO'],['34','Risconti passivi','PASSIVO'],
    ['42','Altri ricavi di competenza','RICAVO'],['54','Ammortamenti','COSTO']
  ];
  let pending = null;
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cents = x => { const n=Number(x); if(!Number.isFinite(n)||n<0) throw Error('Importo non valido o negativo.'); return Math.round(n*100); };
  const day = s => { if(!/^\d{4}-\d{2}-\d{2}$/.test(s||'')) throw Error('Data obbligatoria nel formato anno-mese-giorno.'); const n=Date.parse(s+'T00:00:00Z'); if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==s) throw Error('Data non valida.'); return n/86400000; };
  const row = (conto,dareAvere,c,centroCostoId='') => ({conto,dareAvere,importo:c/100,centroCostoId,centroRicavoId:''});
  const last = m => { if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw Error('Mese di competenza non valido.'); return new Date(Date.UTC(+m.slice(0,4),+m.slice(5),0)).toISOString().slice(0,10); };
  function init(s=STATO){
    nuoviConti.forEach(([codice,nome,tipo])=>{ if(!s.pianoDeiConti.some(c=>c.codice===codice)) s.pianoDeiConti.push({codice,nome,tipo}); });
    s.fi ||= {versione:1,costituzione:'',preset:'pp',dipendenti:[],nextDip:1};
    s.fi.dipendenti ||= []; s.fi.nextDip ||= 1;
    return s;
  }
  function dateCheck(data){ day(data); if(window.Annual)Annual.checkDate(data); if(STATO.fi.preset==='nuova'&&!STATO.fi.costituzione) throw Error('Imposta prima la data di costituzione in Ragioneria FI.'); if(STATO.fi.costituzione && data<STATO.fi.costituzione) throw Error('Registrazione precedente alla costituzione dell’azienda.');
    // PP conserva il proprio blocco logistico; FI può completare gli assestamenti dopo la chiusura CO. Annual governa il blocco comune definitivo.
  }
  function validate(p,importing=false){
    if(importing)day(p.data);else dateCheck(p.data); if(!p.descrizione?.trim()) throw Error('Descrizione obbligatoria.');
    if(p.key && STATO.registrazioni.some(r=>r.fi?.key===p.key)) throw Error('Operazione già registrata: duplicato bloccato.');
    let d=0,a=0; if(!p.righe?.length) throw Error('Nessuna riga da registrare.');
    p.righe.forEach(r=>{if(!STATO.pianoDeiConti.some(c=>c.codice===r.conto))throw Error('Conto sconosciuto: '+r.conto);if(!['DARE','AVERE'].includes(r.dareAvere))throw Error('Segno contabile non valido.'); const v=cents(r.importo);if(!v)throw Error('Le righe devono avere importi positivi.');if(r.centroCostoId&&!STATO.centriDiCosto.some(c=>String(c.id)===String(r.centroCostoId)))throw Error('Centro di costo sconosciuto.');r.dareAvere==='DARE'?d+=v:a+=v;});
    if(!d||d!==a) throw Error('Dare e Avere non quadrano al centesimo.');
    return p;
  }
  function plan(tipo,data,descrizione,key,righe,detail={}){ return validate({tipo,data,descrizione,key,righe:righe.filter(r=>r.importo>0),detail}); }
  function payroll(mese,ids){
    const data=last(mese); const emps=STATO.fi.dipendenti.filter(e=>ids.includes(e.id)); if(!emps.length)throw Error('Seleziona almeno un dipendente.');
    const righe=[], cedolini=[];
    emps.forEach(e=>{
      if(STATO.registrazioni.some(r=>r.fi?.cedolini?.some(x=>x.id===e.id&&x.mese===mese)))throw Error('Cedolino già registrato per '+e.nome+' nel mese '+mese+'.');
      if(!STATO.centriDiCosto.some(c=>String(c.id)===String(e.centro)))throw Error('Centro del dipendente non disponibile.');
      const lordo=cents(e.lordo); if(!lordo)throw Error('Lordo deve essere positivo.');
      const percent=x=>{x=Number(x);if(!Number.isFinite(x)||x<0||x>100)throw Error('Aliquote comprese tra 0 e 100%.');return x/100;};
      const dip=Math.round(lordo*percent(e.inpsDip)), azi=Math.round(lordo*percent(e.inpsAz));
      const irpef=Math.round((lordo-dip)*percent(e.irpef)), tfr=Math.round(lordo*percent(e.tfr)), netto=lordo-dip-irpef;
      if(netto<0)throw Error('Netto negativo.');
      righe.push(row('51','DARE',lordo+azi+tfr,e.centro),row('22','AVERE',netto),row('25','AVERE',irpef),row('26','AVERE',dip+azi),row('27','AVERE',tfr));
      cedolini.push({id:e.id,nome:e.nome,centro:e.centro,mese,lordo,dip,azi,irpef,tfr,netto,costo:lordo+azi+tfr,aliquote:{inpsDip:e.inpsDip,inpsAz:e.inpsAz,irpef:e.irpef,tfr:e.tfr}});
    });
    // Non mescolare un cedolino analitico con un caricamento aggregato preesistente.
    const legacy=STATO.registrazioni.some(r=>r.tipo==='CARICAMENTO_CENTRI'&&(r.dettaglioCaricamentoCentri?.periodo||r.data.slice(0,7))===mese&&r.righe.some(x=>x.conto==='51'&&x.dareAvere==='DARE'&&emps.some(e=>String(e.centro)===String(x.centroCostoId))));
    if(legacy)throw Error('Nel mese esiste già un caricamento aggregato del personale sullo stesso centro. Non sommare le paghe due volte.');
    if(window.FIQuattro)FIQuattro.augmentPayroll(mese,cedolini,righe);
    return plan('PAGHE',data,'Paghe di competenza '+mese,'paghe:'+mese+':'+ids.slice().sort().join(','),righe,{cedolini});
  }
  function capital(data,amount,ref,confermaAumento){ const c=cents(amount);if(!c)throw Error('Capitale positivo obbligatorio.');if(!ref.trim())throw Error('Riferimento del versamento obbligatorio.');const esistente=STATO.registrazioni.filter(r=>r.tipo==='CAPITALE'&&!r.fi?.stornoDi);if(esistente.length&&!confermaAumento)throw Error('Esiste già un capitale versato ('+esistente.map(r=>euro((r.righe.find(x=>x.conto==='30')?.importo)||0)).join(', ')+'). Se è un errore non ripetere il versamento con un altro riferimento; se è davvero un aumento di capitale successivo, spunta la conferma dedicata.');return plan('CAPITALE',data,'Versamento capitale sociale — '+ref,'capitale:'+ref.trim().toLowerCase(),[row('10','DARE',c),row('30','AVERE',c)],{riferimento:ref}); }
  function asset(data,x){
    const costo=cents(x.costo),aliquota=Number(x.aliquota),iva=Number(x.iva);
    if(!x.codice?.trim()||!x.nome?.trim()||!x.fornitore?.trim()||!x.fattura?.trim())throw Error('Codice cespite, descrizione, fornitore e fattura obbligatori.');
    if(!costo||!Number.isFinite(aliquota)||aliquota<=0||aliquota>100||!Number.isFinite(iva)||iva<0||iva>100)throw Error('Costo o aliquote non validi.');
    day(x.funzione);if(x.funzione<data)throw Error('L’entrata in funzione non può precedere l’acquisto.');
    if(STATO.registrazioni.some(r=>(r.fi?.cespite||r.fi?.cespiteDisposto)?.codice.toLowerCase()===x.codice.toLowerCase()))throw Error('Codice cespite già presente.');
    const tax=Math.round(costo*iva/100);
    return plan('CESPITE',data,'Fattura cespite '+x.nome+' — '+x.fornitore+' / '+x.fattura,'cespite-fattura:'+x.fornitore.trim().toLowerCase()+':'+x.fattura.trim().toLowerCase(),[row('01','DARE',costo),row('14','DARE',tax),row('20','AVERE',costo+tax)],{cespite:{...x,costo:costo/100}});
  }
  function assets(){return STATO.registrazioni.filter(r=>r.fi?.cespite).map(r=>({regId:r.id,data:r.data,...r.fi.cespite}));}
  function depreciation(anno){
    if(window.AssetExtra)return AssetExtra.depreciation(anno);
    if(!/^\d{4}$/.test(String(anno)))throw Error('Anno non valido.');
    const data=anno+'-12-31',righe=[],quote=[];
    assets().forEach(x=>{
      if(x.funzione>data)return;
      if(STATO.registrazioni.some(r=>r.fi?.quote?.some(q=>q.regId===x.regId&&q.anno===+anno)))return;
      const usato=STATO.registrazioni.reduce((t,r)=>t+(r.fi?.quote||[]).filter(q=>q.regId===x.regId).reduce((s,q)=>s+q.centesimi,0),0), costo=cents(x.costo);
      const mesi=x.funzione.slice(0,4)===String(anno)?13-Number(x.funzione.slice(5,7)):12;
      // Anni precedenti mancanti non sono recuperati silenziosamente nella quota corrente.
      const cent=Math.min(costo-usato,Math.round(costo*x.aliquota/100*mesi/12));
      if(cent>0){righe.push(row('54','DARE',cent,x.centro),row('02','AVERE',cent));quote.push({regId:x.regId,codice:x.codice,anno:+anno,mesi,centesimi:cent});}
    });
    if(!quote.length)throw Error('Nessuna quota da ammortizzare (già registrata, cespite non in funzione o completamente ammortizzato).');
    return plan('AMMORTAMENTO',data,'Ammortamenti civilistici '+anno,'ammortamenti:'+anno+':'+quote.map(x=>x.regId).join(','),righe,{quote});
  }
  function adjustment(x){
    if(!['RATEO_ATTIVO','RATEO_PASSIVO','RISCONTO_ATTIVO','RISCONTO_PASSIVO'].includes(x.tipo)) throw Error('Tipo rettifica non valido.');
    day(x.inizio);day(x.fine);day(x.data);if(x.fine<x.inizio||x.data<x.inizio||x.data>x.fine||(x.tipo.startsWith('RISCONTO')&&x.data===x.fine))throw Error('La data di assestamento deve cadere nel periodo di competenza, prima della fine.');
    const conto=STATO.pianoDeiConti.find(c=>c.codice===x.conto);if(!conto||!['COSTO','RICAVO'].includes(conto.tipo))throw Error('Seleziona un conto economico.');
    if(['51','52'].includes(x.conto))throw Error('Per questo esercizio usa costi esterni (es. 53): ratei e risconti sul pool produttivo richiedono un ribaltamento dedicato.');
    const totale=cents(x.importo);if(!totale||!x.rif?.trim())throw Error('Importo e riferimento obbligatori.');
    const giorni=day(x.fine)-day(x.inizio)+1, maturati=day(x.data)-day(x.inizio)+1;
    const rateo=x.tipo.startsWith('RATEO'), attivo=x.tipo.endsWith('ATTIVO');
    if(conto.tipo!==(rateo?(attivo?'RICAVO':'COSTO'):(attivo?'COSTO':'RICAVO')))throw Error('Natura del conto economico incompatibile con la rettifica.');
    let fonte=null;
    if(!rateo){
      fonte=STATO.registrazioni.find(r=>r.id===Number(x.fonte));if(!fonte||fonte.data>x.data)throw Error('Per il risconto scegli la scrittura originaria già registrata entro la data di assestamento.');
      const segno=attivo?'DARE':'AVERE', disponibile=fonte.righe.filter(r=>r.conto===x.conto).reduce((s,r)=>s+(r.dareAvere===segno?1:-1)*cents(r.importo),0);
      const gia=STATO.registrazioni.reduce((s,r)=>s+(r.fi?.rettifica?.fonte===fonte.id&&r.fi.rettifica.conto===x.conto?cents(r.fi.rettifica.importo):0),0);
      if(totale+gia>disponibile)throw Error('Importo eccedente il costo/ricavo originario non ancora rettificato (IVA esclusa).');
    }
    const quota=rateo?Math.round(totale*maturati/giorni):totale-Math.round(totale*maturati/giorni);
    const patr=rateo?(attivo?'18':'33'):(attivo?'17':'34');
    const righe=attivo?[row(patr,'DARE',quota),row(x.conto,'AVERE',quota)]:[row(x.conto,'DARE',quota),row(patr,'AVERE',quota)];
    return plan(x.tipo,x.data,x.tipo.replaceAll('_',' ')+' — '+x.rif,'rettifica:'+x.tipo+':'+x.rif.trim().toLowerCase()+':'+x.data,righe,{rettifica:{...x,fonte:fonte?.id||null,quota:quota/100,giorni,maturati}});
  }
  function reversal(id,data){if(window.AssetExtra)AssetExtra.guardReverse(id,data);if(window.Annual)Annual.guardReverse(id);const r=STATO.registrazioni.find(r=>r.id===+id);if(!r?.fi)throw Error('Seleziona una scrittura guidata FI già registrata.');if(r.fi.stornoDi)throw Error('Non si storna uno storno: individua la scrittura originaria.');if(STATO.registrazioni.some(x=>x.fi?.stornoDi===r.id))throw Error('Questa scrittura è già stata stornata.');if(data<=r.data)throw Error('Lo storno deve essere successivo alla scrittura originaria.');const righe=r.righe.map(x=>({...x,dareAvere:x.dareAvere==='DARE'?'AVERE':'DARE'}));return plan('STORNO',data,'Storno della scrittura n° '+id+' — '+r.descrizione,'storno:'+id,righe,{stornoDi:+id});}
  function post(p){
    validate(p);
    const scarichi={};p.righe.filter(r=>['51','52'].includes(r.conto)&&r.dareAvere==='AVERE'&&r.centroCostoId).forEach(r=>{const k=String(r.centroCostoId)+'|'+r.conto;scarichi[k]=(scarichi[k]||0)+cents(r.importo);});
    Object.entries(scarichi).forEach(([k,n])=>{const [centro,conto]=k.split('|');if(n>Math.round(saldoMinimoPool(centro,conto,p.data)*100))throw Error('Operazione bloccata: '+spiegaPoolInsufficiente(centro,conto,p.data,n/100)+'. Annulla prima le attribuzioni collegate: lo storno non deve rendere negativo il pool.');});
    if(p.tipo==='PAGHE') {const fresh=payroll(p.detail.cedolini[0].mese,p.detail.cedolini.map(c=>c.id));if(JSON.stringify(fresh.righe)!==JSON.stringify(p.righe))throw Error('Dati dipendente cambiati: rigenera l’anteprima.');}
    if(p.detail.rettifica) adjustment(p.detail.rettifica);
    const r={id:STATO.prossimoIdRegistrazione,data:p.data,tipo:p.tipo,descrizione:p.descrizione,righe:structuredClone(p.righe),fi:{key:p.key,...structuredClone(p.detail)}};
    if(p.detail.quote){const fresh=p.detail.assetExtra?.kind==='DISPOSAL_DEPRECIATION'?AssetExtra.depreciationAtDisposal(p.data,p.detail.assetExtra.input.assetRegId):depreciation(p.detail.quote[0].anno);if(JSON.stringify(fresh.righe)!==JSON.stringify(p.righe))throw Error('Registro cespiti cambiato: rigenera l’anteprima.');}
    const snapshot=structuredClone(STATO);
    try{STATO.registrazioni.push(r);STATO.prossimoIdRegistrazione++;localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(STATO));}
    catch(e){STATO=snapshot;throw Error('Salvataggio fallito: nessuna operazione mantenuta. Esporta un backup e controlla la memoria del browser.');}
    return r;
  }
  function opening(){const frozen=STATO.fi?.annual?.years?.find(y=>y.openingRows)?.openingRows;if(frozen)return structuredClone(frozen);
    const sp=STATO.statoPatrimonialeIniziale||{}, pf=sp.costoUnitarioPF0;
    const valori=[['10',cents(sp.cassa0||0)],['11',cents(sp.clienti0||0)],['12',cents((sp.magazzinoMP_kg0||0)*(STATO.distintaBase.costoFerro||0))],['13',cents((sp.magazzinoPF_unita0||0)*(pf??costoStandardTransenna()))],['20',-cents(sp.fornitori0||0)]];
    const netto=valori.reduce((s,x)=>s+x[1],0);valori.push(['32',-netto]);return valori.filter(x=>x[1]).map(([c,n])=>row(c,n>0?'DARE':'AVERE',Math.abs(n)));
  }
  function allRows(cutoff){return opening().concat(STATO.registrazioni.filter(r=>!cutoff||r.data<=cutoff).flatMap(r=>r.righe));}
  function balances(cutoff){const b={};allRows(cutoff).forEach(r=>b[r.conto]=(b[r.conto]||0)+(r.dareAvere==='DARE'?1:-1)*cents(r.importo));return b;}
  const input=(id,label,type='text',value='')=>`<div class="campo"><label for="fi-${id}">${label}</label><input id="fi-${id}" type="${type}" value="${esc(value)}" ${type==='number'?'step="0.01" min="0"':''}></div>`;
  const field=(id,label,options)=>`<div class="campo"><label for="fi-${id}">${label}</label><select id="fi-${id}">${options}</select></div>`;
  const opt=(v,t)=>`<option value="${esc(v)}">${esc(t)}</option>`;
  const cc=()=>opt('','— nessuno —')+STATO.centriDiCosto.map(c=>opt(c.id,c.nome)).join('');
  const get=id=>document.getElementById('fi-'+id)?.value||'';
  function attempt(fn){try{fn();}catch(e){document.getElementById('fi-error').textContent=e.message;mostraToast('⚠️ '+e.message,true);}}
  function showPlan(p){ pending=p;document.getElementById('fi-error').textContent='';document.getElementById('fi-preview').innerHTML=`<div class="riquadro"><h3>Anteprima — ${esc(p.descrizione)}</h3><p>Data contabile ${esc(p.data)} · tutti gli importi in euro</p>${table(p.righe)}${p.detail.cedolini?`<p>${p.detail.cedolini.map(x=>`${esc(x.nome)}: lordo ${euro(x.lordo/100)}, netto ${euro(x.netto/100)}, costo azienda ${euro(x.costo/100)}${x.addizionali?'<br>Addizionali manuali: '+x.addizionali.map(a=>esc(a.type+' anno '+a.year+' — '+a.territory+' — '+a.source)+' '+euro(a.cents/100)).join('; '):''}`).join('<br>')}</p>`:''}${p.detail.rettifica?`<p>Giorni totali ${p.detail.rettifica.giorni}; maturati ${p.detail.rettifica.maturati}; quota rettifica ${euro(p.detail.rettifica.quota)}. IVA esclusa.</p>`:''}<button class="azione" onclick="FI.confirmPlan()">Conferma e registra nel Libro Giornale</button> <button class="azione secondaria" onclick="FI.cancelPlan()">Annulla anteprima</button></div>`;document.getElementById('fi-preview').scrollIntoView({block:'center'}); }
  function table(rows){return `<table class="registro"><thead><tr><th>Conto</th><th>Dare</th><th>Avere</th><th>Centro</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(nomeConto(r.conto))}</td><td>${r.dareAvere==='DARE'?euro(r.importo):''}</td><td>${r.dareAvere==='AVERE'?euro(r.importo):''}</td><td>${esc(nomeCentroCosto(r.centroCostoId))}</td></tr>`).join('')}</tbody></table>`;}
  function render(){
    pending=null;const today=oggiIso(),year=(STATO.fi.costituzione||today).slice(0,4);
    const section=(title,body)=>`<details class="riquadro" style="margin:14px 0" open><summary><b>${title}</b></summary>${body}</details>`;
    const dip=STATO.fi.dipendenti, ces=assets();
    document.getElementById('fi-body').innerHTML=`<h2>Gestione ragionieristica — lezione 4</h2><p class="aiuto">Paghe, capitale, cespiti e competenza. Tesoreria e partite aperte, anticipi bancari, liquidazione IVA, IRES didattica e chiusura/riapertura annuale. I flussi logistici SD/MM/PP sono conservati.</p><div id="fi-error" role="alert" style="color:var(--rosso);font-weight:bold"></div><div id="fi-preview"></div>`+
    section('1 · Impostazioni e sicurezza',`<div class="riga-campi">${input('costituzione','Data di costituzione (vuota per esercizio PP preesistente)','date',STATO.fi.costituzione)}</div><button class="azione" onclick="FI.saveDate()">Salva data</button> <button class="azione secondaria" onclick="FI.newCompany()">Preset Azienda nuova — azzera con conferma</button> <button class="azione secondaria" onclick="FI.exportData()">Esporta backup JSON</button><label>Importa backup di QUESTA versione <input type="file" accept=".json" onchange="FI.importData(this.files[0])"></label><p class="aiuto">Prima dell’azzeramento esporta il backup. Il preset PP originale è disponibile con «Ripristina dati». I due file usano archivi separati e non modificano il salvataggio della versione precedente.</p>`)+
    section('2 · Capitale sociale versato',`<div class="riga-campi">${input('cap-data','Data','date',STATO.fi.costituzione||today)}${input('cap-importo','Capitale versato (€)','number','50000')}${input('cap-rif','Riferimento univoco (es. costituzione-2026)','text','costituzione-'+year)}</div><p class="aiuto">Dare 10 Banca / Avere 30 Capitale sociale. Non è un ricavo. Operazione di costituzione richiesta; nessun altro movimento di pagamento è aggiunto.</p><label style="display:block;margin:6px 0"><input type="checkbox" id="fi-cap-aumento"> Confermo: è un aumento di capitale reale, successivo a un versamento già registrato (non un doppio inserimento per errore)</label><button class="azione" onclick="FI.previewCapital()">Mostra anteprima</button>`)+
    section('3 · Dipendenti e paghe — posting HR→FI (ispirato a PC00_M99_CIPE)',`<p class="aiuto">Aliquote esclusivamente didattiche, non calcolo di un cedolino legale: INPS dipendente 9,19%, azienda 30%, IRPEF media sull’imponibile lordo meno INPS dipendente, TFR lordo/13,5 senza rettifiche di legge. Ogni parametro è modificabile. Il mese è registrato al suo ultimo giorno. Per produrre prima del posting HR apri il budget gestionale mensile nella sezione 3a, senza anticipare contabilmente le paghe.</p><div class="riga-campi">${input('dip-nome','Nome dipendente')}${field('dip-centro','Centro di costo',STATO.centriDiCosto.map(c=>opt(c.id,c.nome)).join(''))}${input('dip-lordo','Lordo mensile (€)','number','2500')}${input('dip-irpef','IRPEF media (%)','number','20')}${input('dip-inps-dip','INPS dipendente (%)','number','9.19')}${input('dip-inps-az','INPS azienda (%)','number','30')}${input('dip-tfr','TFR (%)','number','7.407407')}</div><button class="azione secondaria" onclick="FI.addEmployee()">Aggiungi dipendente</button><table class="registro"><thead><tr><th>Seleziona</th><th>Dipendente</th><th>Centro</th><th>Lordo</th></tr></thead><tbody>${dip.map(e=>`<tr><td><input type="checkbox" class="fi-dip-check" value="${e.id}" checked></td><td>${esc(e.nome)}</td><td>${esc(nomeCentroCosto(e.centro))}</td><td>${euro(e.lordo)}</td></tr>`).join('')}</tbody></table><div class="riga-campi">${input('paghe-mese','Mese di competenza','month',(STATO.fi.costituzione||today).slice(0,7))}</div><button class="azione" onclick="FI.previewPayroll()">Anteprima paghe selezionate (posting HR→FI)</button><p class="aiuto">Costo pieno in Dare 51 per centro. Contropartite: 22 netto, 25 IRPEF, 26 INPS dipendente + azienda, 27 TFR. Nei mesi con budget gestionale la produzione accredita attività sul 75: il costo effettivo sul 51 resta distinto. Nessun doppio costo e nessun doppio consumo materiale. Il budget standard non viene modificato dalle paghe reali. Caricamenti aggregati del personale sullo stesso centro/mese sono bloccati.</p>`)+
    section('3b · Disponibilità dei costi per commesse',`<div class="riga-campi">${input('pool-data','Disponibilità alla data','date',STATO.registrazioni.filter(r=>r.fi?.cedolini).map(r=>r.data).sort().at(-1)||((STATO.fi.costituzione||today).slice(0,7)+'-'+new Date(Date.UTC(+year,+(STATO.fi.costituzione||today).slice(5,7),0)).getUTCDate()))}</div><button class="azione secondaria" onclick="renderDisponibilitaHR()">Aggiorna disponibilità</button><div id="fi-pool-body"></div><button class="azione secondaria" onclick="vaiCostiGeneraliHR()">Registra costi generali effettivi (52)</button><p class="aiuto">Apri il budget gestionale del mese prima delle produzioni inframensili. Le paghe restano al 31/12; il preventivo non è una registrazione FI e non si somma al consuntivo. Controlla residuo gestionale ed effettivo separatamente.</p>`)+
    section('4 · Asset Accounting — acquisto cespiti con fornitore (ispirato a F-90) e ammortamento (AFAB)',`<div class="riga-campi">${input('ces-data','Data fattura','date',today)}${input('ces-codice','Codice cespite','text','MAC-001')}${input('ces-nome','Descrizione','text','Macchinario')}${input('ces-fornitore','Fornitore')}${input('ces-fattura','Numero fattura')}${input('ces-costo','Imponibile (€)','number','12000')}${input('ces-iva','IVA detraibile (%)','number','22')}${input('ces-funzione','Entrata in funzione','date',today)}${input('ces-aliquota','Aliquota annua (%)','number','10')}${field('ces-centro','Centro informativo del cespite',cc())}</div><button class="azione" onclick="FI.previewAsset()">Anteprima fattura cespite (F-90)</button><p class="aiuto">IVA interamente detraibile nell’esempio. Nessun pagamento. Ammortamento civilistico per mesi: il mese di entrata in funzione è incluso; nessun dimezzamento fiscale automatico. Dare 54 / Avere 02; centro informativo, NON un secondo carico sul pool 52.</p><div class="riga-campi">${input('amm-anno','Anno ammortamento','number',year)}</div><button class="azione" onclick="FI.previewDepreciation()">Anteprima ammortamenti al 31/12 (AFAB)</button><table class="registro"><thead><tr><th>Cespite</th><th>Costo storico</th><th>Entrata in funzione</th><th>Fondo residuo</th><th>Valore netto residuo</th><th>Stato</th></tr></thead><tbody>${ces.map(c=>{const info=window.AssetExtra?.assets().find(a=>String(a.regId)===String(c.regId));const fondo=info?info.accumulatedCents/100:STATO.registrazioni.reduce((s,r)=>s+(r.fi?.quote||[]).filter(q=>q.regId===c.regId).reduce((t,q)=>t+q.centesimi/100,0),0);return `<tr><td>${esc(c.codice+' — '+c.nome)}</td><td>${euro(c.costo)}</td><td>${c.funzione}</td><td>${euro(fondo)}</td><td>${euro(info?info.netBookValueCents/100:c.costo-fondo)}</td><td>${info?.disposalRegId?"DISMESSO (storico conservato)":"ATTIVO"}</td></tr>`;}).join('')}</tbody></table>`)+
    section('5 · Ratei e risconti guidati — ispirati a FBS1, non Accrual Engine SAP (storno manuale guidato)',`<p class="aiuto">Rateo = quota temporale maturata di un costo/ricavo comune a più esercizi con manifestazione finanziaria successiva; NON ogni prestazione non fatturata. Per prestazioni concluse usa Fatture da emettere/ricevere, qui sotto. Risconto = quota futura di costo/ricavo già registrato. Calcolo su giorni effettivi inclusivi; importi netti IVA. I ratei non anticipano l’IVA. Nessun pagamento implicito. Usa 53 per costi esterni e 42 per altri ricavi; i pool produttivi 51/52 sono esclusi da questa procedura.</p><div class="riga-campi">${field('rett-tipo','Operazione',['RATEO_ATTIVO','RATEO_PASSIVO','RISCONTO_ATTIVO','RISCONTO_PASSIVO'].map(t=>opt(t,t.replaceAll('_',' '))).join(''))}${input('rett-data','Data assestamento','date',year+'-12-31')}${input('rett-inizio','Inizio competenza','date',year+'-12-01')}${input('rett-fine','Fine competenza','date',(+year+1)+'-11-30')}${input('rett-importo','Importo intero contratto (€), IVA esclusa','number','1200')}${input('rett-rif','Riferimento univoco contratto')}${field('rett-conto','Conto costo/ricavo',STATO.pianoDeiConti.filter(c=>['COSTO','RICAVO'].includes(c.tipo)&&!['51','52'].includes(c.codice)).map(c=>opt(c.codice,c.codice+' — '+c.nome)).join(''))}${field('rett-fonte','Scrittura originaria (obbligatoria per risconti)',opt('','— scegli dal giornale —')+STATO.registrazioni.filter(r=>!r.fi?.rettifica&&!r.fi?.stornoDi).map(r=>opt(r.id,r.id+' · '+r.data+' · '+r.descrizione)).join(''))}</div><button class="azione" onclick="FI.previewAdjustment()">Calcola e mostra anteprima (FBS1)</button><div class="riga-campi">${field('storno-id','Scrittura guidata FI da stornare (qualunque tipo)',STATO.registrazioni.filter(r=>r.fi&&!r.fi.stornoDi&&!STATO.registrazioni.some(x=>x.fi?.stornoDi===r.id)).map(r=>opt(r.id,r.id+' — '+r.descrizione)).join(''))}${input('storno-data','Data storno di competenza','date',(+year+1)+'-01-01')}</div><button class="azione secondaria" onclick="FI.previewReversal()">Anteprima storno (valido per capitale, paghe, cespiti, ammortamenti, ratei e risconti)</button><p class="aiuto">Lo storno annulla gli importi di una scrittura guidata FI già registrata con un contro-movimento datato dopo l'originale: è il percorso ordinario di correzione per qualunque scrittura FI protetta, non solo ratei/risconti. Per i cespiti non rimuove l'anagrafica dal registro: usa questa funzione per correggere un errore di inserimento, non per registrare una vendita/dismissione del bene. È contabile, non un incasso o pagamento.</p>`)+
    section('6 · Bilancio ragionieristico e controlli',`<div class="riga-campi">${input('rep-data','Fotografia al (vuoto = tutte le date)','date','')}</div><div id="fi-report"></div><button class="azione secondaria" onclick="FI.report(document.getElementById('fi-rep-data').value||null)">Aggiorna report</button><p class="aiuto">Bilancio didattico prima di imposte e chiusura dei conti, non bilancio civilistico depositabile. Saldi iniziali dell’esercizio PP separati dal capitale sociale. Il fondo ammortamento rettifica l’attivo e non è un debito. Imposta una data per una fotografia FI a quel giorno (solo questo report: Libro Giornale, Mastro e Bilancio di verifica restano non filtrati per data).</p>`);
    report();renderDisponibilitaHR();if(window.BudgetPool)BudgetPool.ui();if(window.Treasury)Treasury.render();if(window.Annual)Annual.render();
  }
  function report(cutoff){if(window.Annual)return Annual.reportTo('fi-report',cutoff);const b=balances(cutoff);let a=0,p=0,pn=0,cost=0,ric=0,costInt=0,ricInt=0;const INTERNI=['70','71','72','73','74','75'];const lines=[];
    STATO.pianoDeiConti.forEach(c=>{const n=b[c.codice]||0;if(!n)return;if(c.tipo==='ATTIVO'||c.tipo==='RETTIFICA_ATTIVO')a+=n;else if(c.tipo==='PASSIVO')p-=n;else if(c.tipo==='PATRIMONIO_NETTO')pn-=n;else if(c.tipo==='COSTO'){cost+=n;if(INTERNI.includes(c.codice))costInt+=n;}else if(c.tipo==='RICAVO'){ric-=n;if(INTERNI.includes(c.codice))ricInt+=-n;}lines.push(`<tr><td>${esc(c.codice+' — '+c.nome)}</td><td>${esc(c.tipo)}</td><td>${euro(n/100)}</td></tr>`);});
    const utile=ric-cost,delta=a-p-pn-utile,ricEst=ric-ricInt,costEst=cost-costInt;
    document.getElementById('fi-report').innerHTML=`<table class="registro"><thead><tr><th>Conto</th><th>Sezione</th><th>Saldo Dare − Avere</th></tr></thead><tbody>${lines.join('')}</tbody></table><p><b>Attivo netto ${euro(a/100)} = Passivo ${euro(p/100)} + Patrimonio netto ${euro(pn/100)} + Risultato ${euro(utile/100)}</b></p><p>Ricavi esterni verso terzi ${euro(ricEst/100)} + accrediti tecnici interni di produzione ${euro(ricInt/100)} (conti 70-75, non fatturato) − Costi esterni ${euro(costEst/100)} − costi interni di produzione ${euro(costInt/100)} = Risultato prima delle imposte ${euro(utile/100)}. Quadratura: ${delta===0?'✓ corretta':'⚠️ differenza '+euro(delta/100)}</p><p>Debiti dipendenti ${euro(-(b['22']||0)/100)} · Ritenute ${euro(-(b['25']||0)/100)} · INPS ${euro(-(b['26']||0)/100)} · TFR ${euro(-(b['27']||0)/100)}. I regolamenti parziali e integrali sono nella Tesoreria FI.</p>${cutoff?`<p class="aiuto">Fotografia FI al ${esc(cutoff)}: le registrazioni successive non sono incluse qui. Il Libro Giornale, il Mastro e il Bilancio di verifica restano invece non filtrati per data.</p>`:''}`;
  }
  return {init,dateCheck,validate,payroll,capital,asset,assets,depreciation,adjustment,reversal,post,opening,balances,render,report,
    previewCapital:()=>attempt(()=>showPlan(capital(get('cap-data'),get('cap-importo'),get('cap-rif'),document.getElementById('fi-cap-aumento')?.checked))),
    previewPayroll:()=>attempt(()=>showPlan(payroll(get('paghe-mese'),Array.from(document.querySelectorAll('.fi-dip-check:checked')).map(e=>+e.value)))),
    previewAsset:()=>attempt(()=>showPlan(asset(get('ces-data'),{codice:get('ces-codice'),nome:get('ces-nome'),fornitore:get('ces-fornitore'),fattura:get('ces-fattura'),costo:get('ces-costo'),iva:get('ces-iva'),funzione:get('ces-funzione'),aliquota:get('ces-aliquota'),centro:get('ces-centro')}))),
    previewDepreciation:()=>attempt(()=>showPlan(depreciation(get('amm-anno')))),
    previewAdjustment:()=>attempt(()=>showPlan(adjustment({tipo:get('rett-tipo'),data:get('rett-data'),inizio:get('rett-inizio'),fine:get('rett-fine'),importo:get('rett-importo'),rif:get('rett-rif'),conto:get('rett-conto'),fonte:get('rett-fonte')}))),
    previewReversal:()=>attempt(()=>showPlan(reversal(get('storno-id'),get('storno-data')))),
    confirmPlan:()=>attempt(()=>{if(!pending)throw Error('Genera prima l’anteprima.');FI.post(pending);pending=null;render();inizializzaSelettoreMastro();mostraToast('✅ Registrazione salvata nel Libro Giornale');}),
    cancelPlan:()=>{pending=null;document.getElementById('fi-preview').innerHTML='';},
    addEmployee:()=>attempt(()=>{const nome=get('dip-nome').trim(),lordo=Number(get('dip-lordo'));if(!nome||!Number.isFinite(lordo)||lordo<=0)throw Error('Nome e lordo positivo obbligatori.');const e={id:STATO.fi.nextDip,nome,centro:get('dip-centro'),lordo,irpef:+get('dip-irpef'),inpsDip:+get('dip-inps-dip'),inpsAz:+get('dip-inps-az'),tfr:+get('dip-tfr')};if([e.irpef,e.inpsDip,e.inpsAz,e.tfr].some(n=>!Number.isFinite(n)||n<0||n>100))throw Error('Aliquote da 0 a 100.');STATO.fi.nextDip++;STATO.fi.dipendenti.push(e);salvaStato();render();}),
    saveDate:()=>attempt(()=>{const d=get('costituzione');if(d)day(d);if(d&&STATO.registrazioni.some(r=>r.data<d))throw Error('Esistono registrazioni precedenti alla data scelta.');STATO.fi.costituzione=d;salvaStato();render();}),
    newCompany:()=>attempt(()=>{const d=get('costituzione');day(d);if(!confirm('Azienda nuova: cancella registrazioni, dipendenti, cespiti, ordini, commesse e giacenze. Esporta prima il backup. Procedere?'))return;const s=init(migraPP(migraCostoStandard(SDMM.migra(statoDiDefault()),null),null));s.statoPatrimonialeIniziale={cassa0:0,clienti0:0,magazzinoMP_kg0:0,magazzinoPF_unita0:0,fornitori0:0};s.fi.costituzione=d;s.fi.preset='nuova';s.sdmm.clienti=[];s.sdmm.fornitori=[];localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(s));location.reload();}),
    exportData:()=>{const blob=new Blob([JSON.stringify({format:'FerroTransenne-FI-2026',stato:STATO},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='backup-ragioneria-'+oggiIso()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
    importData:async file=>{if(!file)return;try{const j=JSON.parse(await file.text());if(j.format!=='FerroTransenne-FI-2026'||!j.stato?.fi||!Array.isArray(j.stato.registrazioni)||!Array.isArray(j.stato.pianoDeiConti))throw Error('Backup non valido: importa un file esportato da questa versione.');const old=STATO;try{STATO=init(j.stato);const periodi=STATO.pp?.periodi;try{if(STATO.pp)STATO.pp.periodi=[];STATO.registrazioni.forEach(r=>validate({...r,key:null},true));if(STATO.fi.costituzione)day(STATO.fi.costituzione);}finally{if(STATO.pp)STATO.pp.periodi=periodi;}}finally{STATO=old;}if(!confirm('Sostituire tutti i dati di questo file con il backup?'))return;localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(j.stato));location.reload();}catch(e){mostraToast('⚠️ Importazione rifiutata: '+e.message,true);}}
  };
})();
FI.init();
window.FI=FI;
// Difetti collegati al ciclo contabile: controllo su tutte le righe, non solo sulle righe filtrate.
const registraScritturaOriginale=registraScrittura;
registraScrittura=function(){try{FI.validate({data:document.getElementById('reg-data').value,descrizione:document.getElementById('reg-descrizione').value||'Operazione guidata',righe:righeScritturaCorrente});}catch(e){mostraToast('⚠️ '+e.message,true);return;}return registraScritturaOriginale();};
const eliminaRegistrazioneOriginale=eliminaRegistrazione;
eliminaRegistrazione=function(id){const r=STATO.registrazioni.find(x=>x.id===id);if(!r)return;try{FI.dateCheck(r.data);if(window.Annual)Annual.guardReverse(id);}catch(e){mostraToast(e.message,true);return;}if(r.origineSD){mostraToast('Documento SD/MM: non eliminare la sola scrittura lasciando il documento logistico contabilizzato.',true);return;}if(r.fi){mostraToast('Scrittura FI protetta: per capitale, paghe, cespiti, ammortamenti, ratei e risconti usa lo storno guidato in Ragioneria FI. Per rifare l’esercizio usa il backup o Azienda nuova.',true);return;}const rettificheAttive=STATO.registrazioni.filter(x=>x.fi?.rettifica?.fonte===id&&!STATO.registrazioni.some(y=>y.fi?.stornoDi===x.id));if(rettificheAttive.length){mostraToast('Questa scrittura è richiamata come fonte da '+rettificheAttive.length+' rettifica/e di competenza (n° '+rettificheAttive.map(x=>x.id).join(', ')+'): stornala prima in Ragioneria FI, altrimenti la rettifica resterebbe orfana.',true);return;}return eliminaRegistrazioneOriginale(id);};
const cambiaVistaOriginale=cambiaVista;
cambiaVista=function(nome){cambiaVistaOriginale(nome);if(nome==='fi')FI.render();};
const nuovoGiroOriginale=nuovoGiroStudente;
nuovoGiroStudente=function(){// i dati cespiti/rettifiche sono derivati dal giornale, non da archivi paralleli
return nuovoGiroOriginale();};
// Mastro e bilancio di verifica includono gli stessi saldi iniziali utilizzati nei magazzini.
const mastroOriginale=renderMastro, bilancioOriginale=renderBilancio;
function conApertura(fn){const originali=STATO.registrazioni;try{const righe=FI.opening();STATO.registrazioni=righe.length?[{id:0,data:STATO.fi.costituzione||'',descrizione:'Saldi iniziali dell’esercizio preesistente (non capitale versato)',tipo:'APERTURA_DIDATTICA',righe},...originali]:originali;return fn();}finally{STATO.registrazioni=originali;}}
renderMastro=function(){return conApertura(mastroOriginale);};
renderBilancio=function(){return conApertura(bilancioOriginale);};

// Non confondere i cedolini con il vecchio pool semplificato.
const tipoRegistrazioneOriginale=cambiaTipoRegistrazione;
cambiaTipoRegistrazione=function(){tipoRegistrazioneOriginale();if(document.getElementById('reg-tipo').value==='CARICAMENTO_CENTRI'){
const box=document.getElementById('reg-campi-specifici');box.insertAdjacentHTML('afterbegin','<p class="aiuto"><b>Per le buste paga vere usa Ragioneria FI → Dipendenti e paghe.</b> Qui resta il caricamento semplificato del vecchio esercizio PP. Nel preset Azienda nuova carica solo i costi generali.</p>');
if(STATO.fi.preset==='nuova'){STATO.centriDiCosto.forEach(c=>{const e=document.getElementById('car-pers-'+c.id);if(e){e.value='0';e.disabled=true;}});proponiRigheCaricamentoCentri();}
}};
const registraPrimaDeiPool=registraScrittura;
registraScrittura=function(){const tipo=document.getElementById('reg-tipo').value,data=document.getElementById('reg-data').value;
for(const r of righeScritturaCorrente){if(['51','52'].includes(r.conto)&&!r.centroCostoId){mostraToast('Conti 51/52: centro di costo obbligatorio su ogni riga.',true);return;}}
if(tipo==='CARICAMENTO_CENTRI'){
if(window.BudgetPool&&BudgetPool.find(data.slice(0,7))){mostraToast('Mese con budget gestionale: paghe da HR e costi generali da documento effettivo. Non registrare anche il vecchio caricamento aggregato.',true);return;}
const centri=righeScritturaCorrente.filter(r=>r.conto==='51'&&r.dareAvere==='DARE').map(r=>String(r.centroCostoId));
if(STATO.fi.preset==='nuova'&&centri.length){mostraToast('Azienda nuova: il personale si registra soltanto con le paghe guidate FI.',true);return;}
if(STATO.registrazioni.some(r=>r.fi?.cedolini?.some(e=>e.mese===data.slice(0,7)&&centri.includes(String(e.centro))))){mostraToast('Paghe già presenti nello stesso centro/mese: doppio carico personale bloccato.',true);return;}}
if(tipo==='GENERICA'&&STATO.fi.preset==='nuova'&&righeScritturaCorrente.some(r=>r.conto==='51'&&r.dareAvere==='DARE')){mostraToast('Per caricare il personale usa il cedolino guidato in Ragioneria FI.',true);return;}
// Conti esclusivi dei calcolatori guidati FI (capitale, cespiti/ammortamento, ratei/risconti): mai in scrittura libera, qualunque preset.
// Il 22 resta fuori: lo usa anche il vecchio caricamento aggregato del personale, già controllato sopra.
const CONTI_RISERVATI_FI={'75':'conferme PP / attribuzione attività CO automatica','01':'Ragioneria FI · Asset Accounting (F-90)','02':'Ragioneria FI · Asset Accounting (AFAB)','14':null,'17':'Ragioneria FI · Accrual Engine (FBS1)','18':'Ragioneria FI · Accrual Engine (FBS1)','25':'Ragioneria FI · posting HR→FI','26':'Ragioneria FI · posting HR→FI','27':'Ragioneria FI · posting HR→FI','30':'Ragioneria FI · Capitale sociale versato','33':'Ragioneria FI · Accrual Engine (FBS1)','34':'Ragioneria FI · Accrual Engine (FBS1)','54':'Ragioneria FI · Asset Accounting (AFAB)'};
if(tipo==='GENERICA'){
  for(const r of righeScritturaCorrente){
    const dove=CONTI_RISERVATI_FI[r.conto];
    if(dove){mostraToast('Conto '+r.conto+' riservato a un calcolatore guidato: usa '+dove+'. Non duplicare la stessa operazione in scrittura generica.',true);return;}
  }
}
return registraPrimaDeiPool();};

// I mesi non devono sommare esercizi diversi quando si stornano ratei/risconti nell'anno successivo.
for(const [id,fn] of [['mensile-mese','renderControlloMensile'],['cc-report-mese','renderReportCentriCosto']]){
const e=document.getElementById(id);if(e){const label=document.createElement('label');label.textContent='Anno del report ';const input=document.createElement('input');input.type='number';input.id=id==='mensile-mese'?'mensile-anno':'cc-report-anno';input.value=(STATO.fi.costituzione||oggiIso()).slice(0,4);input.min='1900';input.max='9999';input.style.width='100px';input.onchange=()=>window[fn]();label.append(input);e.parentElement.append(label);}
}

if(!STATO.fi.costituzione && !STATO.registrazioni.length && false){ STATO.fi.preset='nuova'; }
