/* Generato da tools/split_simulatore.py (completo) — non modificare a mano: modifica sorgenti/ e rilancia. */
/* Navigation only: no changes to accounting state or storage. */
window.FIModules = (() => {
  let active='home', observer, queued=false, applying=false;
  const areas=[
    ['gl','FI-GL','Contabilità generale','Capitale, competenza, sopravvenienze, bilancio e chiusura','📒'],
    ['aa','FI-AA','Cespiti','Acquisto, ammortamento, cessione e plus/minusvalenze','🏭'],
    ['ar','FI-AR','Clienti','Partite clienti, fatture servizi e incassi','👥'],
    ['ap','FI-AP','Fornitori','Partite fornitori, fatture servizi e pagamenti','🧾'],
    ['bl','FI-BL','Banche e tesoreria','Regolamenti, anticipi bancari, rimborsi e interessi','🏦'],
    ['co','CO-CCA','Centri di costo','Budget mensile, tariffe, disponibilità e consuntivi','📊'],
    ['hr','HR → FI/CO','Personale e paghe','Dipendenti, posting delle paghe e collegamento ai centri','👤'],
    ['tax','FI · Area fiscale','IVA e imposte','Liquidazione IVA, acconti e IRES didattica','⚖️'],
    ['admin','Impostazioni FI','Sicurezza e backup','Costituzione, backup e preset azienda nuova','🛡️']
  ];
  const visible=(node,yes)=>{if(node)node.hidden=!yes;};
  function go(key){if(key!=='home'&&!areas.some(x=>x[0]===key))return; if(active!==key){FI.cancelPlan();Treasury.uiCancel();const p=document.getElementById('an-preview');if(p)p.innerHTML='';document.querySelectorAll('.tr-alloc').forEach(x=>x.value='');} active=key;apply();document.getElementById('fi-mod-nav')?.scrollIntoView({block:'start'});}
  function splitAnnual(box){
    if(!box||box.dataset.moduleSplit)return;
    const heads=[...box.children].filter(n=>n.tagName==='H4');
    heads.forEach((h,i)=>{const section=document.createElement('section');section.dataset.fiAnnualArea=i<2?'tax':'gl';h.before(section);let n=h;while(n&&n!==heads[i+1]){const next=n.nextSibling;section.append(n);n=next;}});
    // Keep confirmation common: tax and annual-close use the same original preview.
    const preview=box.querySelector('#an-preview');if(preview)box.append(preview);
    box.dataset.moduleSplit='1';
  }
  function apply(){
    const body=document.getElementById('fi-body');if(!body||applying)return;applying=true;observer?.disconnect();
    try{
      let nav=document.getElementById('fi-mod-nav');
      if(!nav){nav=document.createElement('div');nav.id='fi-mod-nav';nav.innerHTML=`<style>#fi-body [hidden]{display:none!important}.fi-module-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:12px;margin:16px 0}.fi-module-tile{text-align:left;background:#fff;border:1px solid #cbd5e1;border-top:4px solid #0874ba;border-radius:9px;padding:16px;cursor:pointer;min-height:140px;color:#18334e}.fi-module-tile:hover{box-shadow:0 4px 14px #0002}.fi-module-tile b{display:block;font-size:19px;margin:6px 0}.fi-module-tile span{display:block;font-size:14px}.fi-module-tile small{display:block;margin-top:8px;color:#526477}.fi-module-bar{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.fi-module-bar button[aria-pressed=true]{background:#075985;color:white}.fi-module-note{padding:12px;border-left:4px solid #0874ba;background:#eef7ff}</style><h2>FI e CO — moduli contabili</h2><p class="aiuto">Aree didattiche ispirate a SAP: FI-AA, FI-GL, FI-AR, FI-AP e FI-BL sono componenti di FI. HR e CO restano aree collegate. SD, MM e PP conservano i loro comandi. Un solo documento contabile: nessuna duplicazione passando da un modulo all’altro.</p><div class="fi-module-bar"><button class="azione secondaria" onclick="FIModules.go('home')">⌂ Tutti i moduli</button>${areas.map(a=>`<button class="azione secondaria" data-fi-key="${a[0]}" onclick="FIModules.go('${a[0]}')">${a[1]}</button>`).join('')}</div><div id="fi-module-tiles" class="fi-module-grid">${areas.map(a=>`<button class="fi-module-tile" onclick="FIModules.go('${a[0]}')">${a[4]}<b>${a[1]}</b><span>${a[2]}</span><small>${a[3]}</small></button>`).join('')}</div><div id="fi-module-info" class="fi-module-note"></div><div id="fi-module-links" class="fi-module-bar"></div>`;body.prepend(nav);const h=[...body.children].find(x=>x.tagName==='H2');if(h)h.hidden=true;const intro=[...body.children].find(x=>x.tagName==='P');if(intro)intro.hidden=true;}
      visible(document.getElementById('fi-module-tiles'),active==='home');
      nav.querySelectorAll('[data-fi-key]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fiKey===active)));
      const info=document.getElementById('fi-module-info'),links=document.getElementById('fi-module-links');
      info.textContent=active==='home'?'Scegli un modulo. I dati e le registrazioni sono condivisi tra tutte le aree.':areas.find(a=>a[0]===active).slice(1,4).join(' — ');
      const link=(label,action)=>`<button class="azione secondaria" onclick="${action}">${label}</button>`;
      links.innerHTML=active==='gl'?link('Scrittura libera G/L',"cambiaVista('registrazione')")+link('Libro Giornale',"cambiaVista('giornale')")+link('Mastro',"cambiaVista('mastro')"):
        active==='co'?link('Centri e tariffe standard',"cambiaVista('impostazioni')")+link('Report centri di costo',"cambiaVista('centri-costo')")+link('Paghe effettive',"FIModules.go('hr')"):
        active==='aa'?link('Pagamento fornitore cespite',"FIModules.go('ap')"):
        active==='hr'?link('Budget dei centri',"FIModules.go('co')")+link('Pagamento dipendenti e contributi',"FIModules.go('bl')"):
        active==='tax'?link('Pagamento debiti fiscali',"FIModules.go('bl')")+link('Bilancio e chiusura',"FIModules.go('gl')"):
        ['ar','ap'].includes(active)?link('Banche e anticipi',"FIModules.go('bl')")+link('Fatture merci SD / MM',"cambiaVista('sdmm')"):' ';
      [...body.children].filter(n=>n.tagName==='DETAILS'&&n.id!=='annual-box').forEach(d=>{
        const t=d.querySelector('summary')?.textContent||'';const key=d.id==='civilistico-box'?'gl':d.id==='civilistico-co-box'?'co':d.id==='budget-pool-box'?'co':t.startsWith('1 ·')?'admin':t.startsWith('2 ·')?'gl':t.startsWith('3 ·')?'hr':t.startsWith('3b ·')?'co':t.startsWith('4 ·')?'aa':t.startsWith('5 ·')||t.startsWith('6 ·')?'gl':null;
        if(key){d.dataset.fiArea=key;visible(d,active===key);if(active===key)d.open=true;}
      });
      const annual=document.getElementById('annual-box');splitAnnual(annual);visible(annual,['gl','tax'].includes(active));if(annual){annual.open=true;annual.querySelectorAll('[data-fi-annual-area]').forEach(s=>visible(s,s.dataset.fiAnnualArea===active));const b=annual.querySelector('summary b');if(b)b.textContent=active==='tax'?'Area fiscale FI — IVA e imposte':'FI-GL — Bilancio, epilogo, chiusura e riapertura';}
      const treasury=document.getElementById('treasury-module');visible(treasury,['ar','ap','bl'].includes(active));if(treasury){const ds=[...treasury.firstElementChild.children].filter(x=>x.tagName==='DETAILS');ds.forEach((d,i)=>{visible(d,active==='bl'?i!==3:[0,3].includes(i));if(!d.hidden)d.open=true;});const title=treasury.querySelector('h2');if(title)title.textContent=active==='ar'?'FI-AR — Partite clienti e incassi':active==='ap'?'FI-AP — Partite fornitori e pagamenti':'FI-BL — Banche, regolamenti e anticipi';
        ds[0]?.querySelectorAll('tbody tr').forEach(tr=>{const code=tr.children[2]?.textContent?.split(' — ')[0];const yes=active==='bl'||code===(active==='ar'?'11':'20');visible(tr,yes);if(!yes){const input=tr.querySelector('.tr-alloc');if(input)input.value='';}});
        const type=document.getElementById('tr-svc-type');if(type&&['ar','ap'].includes(active)){const want=active==='ar'?'vendita':'acquisto';if(type.value!==want){type.value=want;type.dispatchEvent(new Event('change'));}type.disabled=false;}else if(type)type.disabled=false;
      }
      visible(document.getElementById('fi-preview'),active!=='home');
    }finally{applying=false;if(observer)observer.observe(body,{childList:true,subtree:true});}
  }
  function start(){const body=document.getElementById('fi-body');if(!body)return;observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;apply();});}});observer.observe(body,{childList:true,subtree:true});if(body.children.length)apply();}
  return {go,apply,start,get active(){return active;}};
})();
FIModules.start();
