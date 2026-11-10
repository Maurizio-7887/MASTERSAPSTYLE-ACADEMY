/* UF 9 Pistoia · Prova inventariale indipendente. Non scrive sul database ERP. */
(function(){
  'use strict';
  const data=JSON.parse(document.getElementById('u9-dataset').textContent);
  const rows=data.posizioni, loads=data.distinte, values=data.calcoli, transit=data.trasferimento;
  const $=id=>document.getElementById(id);
  const state={counted:false,reconciled:false,closed:false,ship:false,valuation:false};
  function span(text,cls){const e=document.createElement('span');e.textContent=text;if(cls)e.className=cls;return e;}
  function num(input){const t=input.value.trim();if(t==='')return null;const n=Number(t);return Number.isFinite(n)&&n>=0?n:NaN;}
  function valid(n){return n!==null&&Number.isFinite(n)&&Number.isInteger(n)&&n>=0;}
  function money(n){return n.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
  function formatDelta(n){return n>0?'+'+n:String(n);}
  function finalize(){
    const total=[state.reconciled,state.closed,state.ship,state.valuation].filter(Boolean).length;
    $('u9-finalstatus').textContent=total+' di 4 sezioni completate; '+(total===4?'pronto per la valutazione del docente':'completa le sezioni mancanti');
  }
  const countInputs=[...document.querySelectorAll('.u9-count')];
  const rowIndex=new Map(rows.map(x=>[x.id,x]));
  let recountInputs=new Map();
  countInputs.forEach(input=>input.addEventListener('input',()=>{
    if(!state.counted&&!state.reconciled&&!state.closed)return;
    state.counted=false;state.reconciled=false;state.closed=false;
    $('u9-reconciliation').hidden=true;
    $('u9-recount-area').textContent='La conta è stata modificata: confermala nuovamente per riconciliare.';
    $('u9-close-status').textContent='Da riconfermare dopo la nuova conta.';
    $('u9-count-status').textContent='Quantità modificate: ripeti la conferma della conta prima di chiudere.';
    document.querySelectorAll('.u9-checkresult').forEach(x=>x.textContent='Da riconfermare');
    recountInputs=new Map();finalize();
  }));
  $('u9-closecount').addEventListener('click',()=>{
    const counts=new Map();
    for(const inp of countInputs){
      const n=num(inp);
      if(!valid(n)){
        $('u9-count-status').textContent='Completa tutte le 10 righe con quantità intere non negative prima di confrontare.';
        $('u9-count-status').className='u9-status u9-bad';inp.focus();return;
      }
      counts.set(inp.dataset.id,n);
    }
    // Il foglio delle misure simulate è il riferimento fisico, distinto
    // dalle quantità teoriche nel WMS. Una lettura errata va ricontrollata
    // prima di poter iniziare la riconciliazione contabile.
    const lettureErrate=rows.filter(item=>counts.get(item.id)!==item.fisico).map(x=>x.id);
    if(lettureErrate.length){
      $('u9-count-status').textContent='Lettura fisica da verificare: '+lettureErrate.join(', ')+'. Confronta le misure sul foglio consegnato dal docente, correggi e conferma nuovamente.';
      $('u9-count-status').className='u9-status u9-bad';
      state.counted=false;state.reconciled=false;state.closed=false;
      $('u9-reconciliation').hidden=true;
      $('u9-recount-area').textContent='Completa correttamente la prima conta prima della riconta.';
      $('u9-close-status').textContent='In attesa delle ricontazioni.';
      finalize();return;
    }
    state.counted=true;state.reconciled=false;state.closed=false;
    const tbody=$('u9-diffrows');tbody.replaceChildren();
    let differences=0;let amount=0;
    rows.forEach(item=>{
      const counted=counts.get(item.id),delta=counted-item.teorico,cell=document.querySelector('.u9-checkresult[data-id="'+item.id+'"]');
      cell.textContent=delta===0?'Quadra':'Differenza '+formatDelta(delta);
      cell.className='u9-checkresult '+(delta===0?'u9-good':'u9-bad');
      const tr=document.createElement('tr');
      [item.id,item.art,item.teorico+' '+item.um,counted+' '+item.um,formatDelta(delta)+' '+item.um,money(delta*item.costo)].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.appendChild(td);});
      const td=document.createElement('td');
      if(delta===0){td.textContent='Nessuna rettifica';}else{
        differences++;amount+=delta*item.costo;
        const inp=document.createElement('input');inp.type='text';inp.maxLength=240;inp.placeholder='Causa / verifica documentale';
        inp.className='u9-cause';inp.dataset.id=item.id;inp.style.width='100%';td.appendChild(inp);
      }
      tr.appendChild(td);tbody.appendChild(tr);
    });
    $('u9-reconciliation').hidden=false;
    $('u9-count-status').textContent='Conta confermata: '+differences+' ubicazioni con scostamento. Valore netto della differenza '+money(amount)+'. Riconta ogni scostamento.';
    $('u9-count-status').className='u9-status';
    const area=$('u9-recount-area');area.replaceChildren();
    const h=document.createElement('h3');h.textContent='Riconta indipendente sulle ubicazioni con differenze';area.appendChild(h);
    recountInputs=new Map();
    rows.forEach(item=>{
      if(counts.get(item.id)===item.teorico)return;
      const label=document.createElement('label');
      label.appendChild(span(item.id+' · '+item.art+' · prima conta '+counts.get(item.id)+' '+item.um+' · seconda conta: '));
      const input=document.createElement('input');input.type='number';input.min='0';input.step='1';
      input.dataset.id=item.id;input.className='u9-recount';input.setAttribute('aria-label','Riconta '+item.id);
      input.addEventListener('input',()=>{state.closed=false;$('u9-close-status').textContent='Riconta modificata: confermare di nuovo la chiusura.';finalize();});
      label.appendChild(input);area.appendChild(label);recountInputs.set(item.id,input);
    });
    document.querySelectorAll('.u9-cause').forEach(input=>input.addEventListener('input',()=>{
      if(state.closed){state.closed=false;$('u9-close-status').textContent='Causale modificata: confermare nuovamente la rettifica.';finalize();}
    }));
    if(differences===0)area.appendChild(span('Nessuno scostamento: verifica la correttezza del foglio di conta.'));
    state.reconciled=true;finalize();
  });
  $('u9-close').addEventListener('click',()=>{
    if(!state.reconciled){$('u9-close-status').textContent='Prima esegui la conta cieca.';return;}
    let deltaValue=0,n=0,missing=[];
    for(const [id,input] of recountInputs){
      const c=num(input),row=rowIndex.get(id);
      if(!valid(c)){missing.push(id+' (riconta incompleta)');continue;}
      if(c!==Number(document.querySelector('.u9-count[data-id="'+id+'"]').value))missing.push(id+' (riconta difforme dalla prima conta: verifica con docente)');
      const cause=document.querySelector('.u9-cause[data-id="'+id+'"]');
      if(!cause||cause.value.trim().length<5)missing.push(id+' (motivazione insufficiente)');
      deltaValue+=(c-row.teorico)*row.costo;n++;
    }
    if(missing.length){
      state.closed=false;
      $('u9-close-status').textContent='LI21 non autorizzabile: '+missing.join('; ')+'.';$('u9-close-status').className='u9-status u9-bad';finalize();return;
    }
    state.closed=true;
    $('u9-close-status').textContent='Simulazione LI14 → LI20 → LI21 conclusa per '+n+' ubicazioni, valore netto rettifiche '+money(deltaValue)+'. Le differenze restano distinte per articolo: nessun movimento è stato scritto nel gestionale.';
    $('u9-close-status').className='u9-status u9-good';finalize();
  });
  $('u9-shipcheck').addEventListener('click',()=>{
    const out=$('u9-ship-result');out.replaceChildren();let complete=true,expected=0,loaded=0;
    loads.forEach((row,i)=>{
      const actual=new Set(row.scansionati),planned=new Set(row.sscc),missing=[...planned].filter(x=>!actual.has(x)),extras=[...actual].filter(x=>!planned.has(x));
      expected+=row.attesi;loaded+=row.scansionati.length;
      const issues=missing.length+extras.length+(row.scansionati.length-actual.size);
      const result=issues?'NON COMPLETA':'COMPLETA';
      const cell=document.querySelector('[data-shipment="'+i+'"]');
      cell.replaceChildren(span(result,issues?'u9-bad':'u9-good'));
      if(issues)complete=false;
      const p=document.createElement('p');
      p.appendChild(span(row.cliente+' · '+row.ddt+': '+row.scansionati.length+'/'+row.attesi+' colli. '+result+'. '));
      if(missing.length)p.appendChild(span('SSCC mancanti: '+missing.join(', ')+'. ','u9-bad'));
      if(extras.length)p.appendChild(span('SSCC non previsti: '+extras.join(', ')+'. ','u9-bad'));
      out.appendChild(p);
    });
    const p=document.createElement('p');p.appendChild(span('Totale camion: '+loaded+'/'+expected+' colli. '+(complete?'Tutte le spedizioni sono complete.':'Non autorizzare la partenza finché le anomalie non sono risolte.'),complete?'u9-good':'u9-bad'));out.appendChild(p);
    state.ship=true;finalize();
  });
  ['u9-fifo','u9-lifo','u9-medio','u9-transit','u9-network'].forEach(id=>$(id).addEventListener('input',()=>{
    if(state.valuation){state.valuation=false;$('u9-valuationstatus').textContent='Calcoli modificati: premi di nuovo Verifica.';finalize();}
  }));
  $('u9-valuationcheck').addEventListener('click',()=>{
    const checks=[['u9-fifo',values.fifo],['u9-lifo',values.lifo],['u9-medio',values.medio],['u9-transit',transit.in_viaggio_valore],['u9-network',transit.totale_rete]];
    const mistakes=[];
    checks.forEach(([id,expect])=>{const input=$(id),v=num(input);if(v===null||!Number.isFinite(v)||Math.abs(v-expect)>0.011)mistakes.push(id);input.setAttribute('aria-invalid',Math.abs(v-expect)>0.011||v===null?'true':'false');});
    if(mistakes.length){$('u9-valuationstatus').textContent='Da rivedere: '+mistakes.length+' calcoli. Per il costo medio dividi 220 € per 200 kg, poi moltiplica per 80 kg. Nel transito confronta quantità e costo unitario.';$('u9-valuationstatus').className='u9-status u9-bad';state.valuation=false;}
    else{$('u9-valuationstatus').textContent='Calcoli corretti: FIFO '+money(values.fifo)+', LIFO '+money(values.lifo)+', costo medio '+money(values.medio)+', merce in viaggio '+money(transit.in_viaggio_valore)+' e totale rete '+transit.totale_rete+' pz.';$('u9-valuationstatus').className='u9-status u9-good';state.valuation=true;}
    finalize();
  });
  function scores(){
    const fields=[...document.querySelectorAll('.u9-score')];
    const vals=fields.map(num);
    const bad=vals.some(v=>v!==null&&(!Number.isInteger(v)||v<1||v>25));
    $('u9-scoreerror').textContent=bad?'Ciascun indicatore deve ricevere un intero tra 1 e 25.':'';
    $('u9-scoretotal').textContent=(bad||vals.includes(null))?'— / 100':vals.reduce((a,b)=>a+b,0)+' / 100';
  }
  document.querySelectorAll('.u9-score').forEach(x=>x.addEventListener('input',scores));
  // Il verbale resta in possesso dell'allievo/docente; nessun nominativo,
  // punteggio o dato del corso e' inviato automaticamente al server.
  $('u9-export').addEventListener('click',()=>{
    const record=[];
    function cell(v){
      let str=String(v===undefined||v===null?'':v).replace(/\r?\n/g,' ');
      // Esportazioni aperte con Excel: neutralizzare formule contenute
      // in campi liberi compilati dagli allievi.
      if(/^[=+@-]/.test(str))str="'"+str;
      return '"'+str.replace(/"/g,'""')+'"';
    }
    function push(){
      record.push(Array.from(arguments).map(cell).join(';'));
    }
    push('Sezione','Riferimento','Articolo','Quantità teorica','Quantità contata','Valore / Stato');
    push('Anagrafica','Allievo','','','',$('u9-nome').value);
    push('Anagrafica','Data prova','','','',$('u9-data').value);
    rows.forEach(row=>{
      const q=document.querySelector('.u9-count[data-id="'+row.id+'"]');
      const n=q?num(q):null;
      push('Inventario',row.id,row.art,row.teorico,n===null?'':n,
           n===null?'Da contare':formatDelta(n-row.teorico)+' '+row.um);
      const recon=recountInputs.get(row.id);
      if(recon)push('Riconta',row.id,row.art,'',num(recon),
                    document.querySelector('.u9-cause[data-id="'+row.id+'"]')?.value||'');
    });
    loads.forEach(row=>push('Spedizione',row.ddt,row.cliente,row.attesi,
                            row.scansionati.length,row.sscc.filter(x=>!row.scansionati.includes(x)).join(', ')));
    [['FIFO','u9-fifo'],['LIFO','u9-lifo'],['Costo medio','u9-medio'],['Valore in viaggio','u9-transit'],['Giacenze rete','u9-network']]
      .forEach(([label,key])=>push('Valorizzazione',label,'','',$(key).value,''));
    document.querySelectorAll('.u9-score').forEach((field,i)=>push('Valutazione','Indicatore '+(i+1),'','',field.value,'/25'));
    push('Valutazione','Totale','','','',$('u9-scoretotal').textContent);
    push('Commenti','Spedizioni','','','',$('u9-note-ship').value);
    push('Commenti','Causali inventariali','','','',$('u9-causali').value);
    push('Commenti','Allievo','','','',$('u9-student-notes').value);
    push('Commenti','Docente','','','',$('u9-judgment').value);
    push('Commenti','Valutatore','','','',$('u9-teacher').value);
    push('Stato','Simulazione','','','',$('u9-finalstatus').textContent);
    const payload='\uFEFF'+record.join('\r\n')+'\r\n';
    const url=URL.createObjectURL(new Blob([payload],{type:'text/csv;charset=utf-8;'}));
    const a=document.createElement('a');a.href=url;a.download='UF9_Pistoia_verbale_'+($('u9-data').value||'prova')+'.csv';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  });
  finalize();
}());