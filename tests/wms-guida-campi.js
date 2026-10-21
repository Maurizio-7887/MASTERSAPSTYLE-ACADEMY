/* UI reale JSDOM, dati sintetici, nessun file/fixture riscritto.
 * node tests/wms-guida-campi.js
 * Riusa soltanto l'harness di s4.js, non i suoi scenari o output. */
const fs = require('fs'), path = require('path'), {createRequire} = require('module');
const repo = path.resolve(__dirname, '..');
const req = createRequire(path.join(repo, 'package.json'));
const harness = fs.readFileSync(path.join(repo, 'tests/s4.js'), 'utf8').split('// avvio, condizioni')[0];
const scenario = String.raw`
const check=(c,m)=>{ok(c,m);if(!c)throw Error(m);};
const act=(page,f,v,a)=>{const before=JSON.stringify(page.S()),r=page.fai(f,v,a);check(/lab-esito ok/.test(r)||(!r&&before!==JSON.stringify(page.S())),f+': '+r);return page;};
function aiuti(page,pref){
 const root=page.lab.querySelector('[data-prefisso="'+pref+'"]');check(!!root,'modulo '+pref);
 root.querySelectorAll('input,select').forEach(el=>{
   const id=el.getAttribute('aria-describedby'),help=id&&page.w.document.getElementById(id);
   check(!!help&&help.textContent.length>25,'aiuto campo '+el.id);
 });
 const guide=page.lab.querySelector('[data-wms-guida="'+pref+'"]');
 check(!!guide&&guide.querySelectorAll('li').length===4,'ingresso/campi/conferma/risultato '+pref);
 check(![...page.lab.querySelectorAll('[id^="'+pref+'-"]')].some(el=>el.classList.contains('wms-aiuto-campo')),'nessun aiuto serializzato '+pref);
}
function RF(data='2027-01-03'){
 for(let k=0;k<100;k++){
  let page=apri('erp_magazzino','rf'),t=page.w.WM4.aperti()[0];if(!t)return page;
  ['rf-ris','rf-data','rf-da','rf-udc','rf-qta','rf-a'].forEach(id=>check(!!page.lab.querySelector('#'+id).getAttribute('aria-describedby'),'RF aiuto '+id));
  page.lab.querySelector('#rf-data').value=data;
  for(const [id,v] of [['rf-da',t.da],['rf-udc',t.udc],['rf-a',t.a]])page.lab.querySelector('#'+id).value=v;
  page.lab.querySelector('#rf-ok').click();check(page.S().wm.compiti.find(x=>x.numero===t.numero).stato==='confermato','RF confermato '+t.tipo);
 }throw Error('coda RF non termina');
}
try{
 let page=apri('erp_dati','avvio');act(page,'av',{data:'2027-01-01'});
 page=apri('erp_magazzino','struttura');aiuti(page,'at');act(page,'at',{data:'2027-01-01'});
 const baseline=JSON.stringify(page.S());
 for(const nome of ['struttura','mappa','compiti','rf','monitor','etichette','bloccato','lotti']){
   page=apri('erp_magazzino',nome);
   check(page.lab.querySelectorAll('.wms-guida-pagina').length===1,'guida pagina '+nome);
   const text=page.lab.querySelector('.wms-guida-pagina').textContent;
   ['MIGO','261','101','601','SSCC','STAGING','LI20','LI21','FIFO','ATP','quarantena','Slotting','RFID','Cross-docking'].forEach(t=>check(text.includes(t),'percorso '+nome+' '+t));
   check(JSON.stringify(page.S())===baseline,'lettura guida non modifica stato '+nome);
   page.lab.querySelectorAll('input,select').forEach(el=>check(!!el.getAttribute('aria-describedby'),'tutti i campi WMS '+nome+' '+el.id));
 }
 page=apri('erp_acquisti','ordini');act(page,'me',{fornitore:'F100',materiale:'FERRO',qta:'1000',prezzo:'1,10',data:'2027-01-02'});
 let oa=page.S().acquisti.slice(-1)[0].numero;
 page=apri('erp_acquisti','entrate');aiuti(page,'mi');
 act(page,'mi',{ordine:oa,qta:'1000',ddt:'SIM-GUIDA-01',lotto:'SIM-COL-GUIDA',danneggiati:'0',data:'2027-01-02'});
 check(page.w.WM4.inUbic('GR-ZONE').some(q=>q.mat==='FERRO'),'101 è ricevimento non scaffale');
 const im=page.S().giacenze.FERRO,book=JSON.stringify(page.S().registrazioni);
 page=RF('2027-01-02');check(page.S().giacenze.FERRO===im&&JSON.stringify(page.S().registrazioni)===book,'PUTAWAY non contabilizza');
 page=apri('erp_magazzino','compiti');aiuti(page,'tr');aiuti(page,'sg');aiuti(page,'cf');
 const q=page.w.WM4.quanti().find(x=>x.mat==='TR-STD'),old=q.ubic;
 act(page,'tr',{udc:q.udc,a:'03-05-2',motivo:'SIM guida',data:'2027-01-03'});
 check(page.w.WM4.riservato(q.id)===q.qta&&q.ubic===old,'creazione impegna ma non sposta');
 page=apri('erp_magazzino','mappa');page.lab.querySelector('[data-u="'+old+'"]').click();
 check(page.testo().includes('Non impegnata da compiti')&&page.testo().includes('ATP'),'mappa distingue impegni da ATP');
 page=RF();check(page.w.WM4.quanti().find(x=>x.id===q.id).ubic==='03-05-2','conferma sposta UdC');
 page=apri('erp_costi','scheda');act(page,'sk',{sovrMat:'0',sovrProd:'0',tariffa:'28',lotto:'100'});
 page=apri('erp_costi','calcolo');act(page,'ck',{materiale:'TR-STD',data:'2027-02-01'});act(page,'cr',{data:'2027-02-01'},'marca');act(page,'cr',{data:'2027-02-01'});
 page=apri('erp_produzione','ordini');act(page,'co',{materiale:'TR-STD',qta:'10',data:'2027-02-01'});
 const op=page.S().produzione.slice(-1)[0].numero;
 page=apri('erp_magazzino','compiti');check(page.testo().includes('Scorta PSA condivisa'),'tabella fabbisogni condivisi');
 check(page.lab.querySelector('#wms-aiuto-sg-kg').textContent.includes('TOTALE'),'staging vuoto non è residuo');
 act(page,'sg',{ordine:op,kg:'80',data:'2027-02-01'});page=RF('2027-02-01');
 check(page.S().giacenze.FERRO===1000,'staging non consuma');
 page=apri('erp_produzione','avanzamento');aiuti(page,'pr');aiuti(page,'en');
 check(!page.lab.querySelector('[data-wms-guida="cf"]'),'nessuna collisione con conferma ore produzione');
 act(page,'pr',{ordine:op,kg:'80',data:'2027-02-01'});check(page.S().giacenze.FERRO===920,'261 consuma dal PSA');
 page=apri('erp_magazzino','bloccato');aiuti(page,'bl');aiuti(page,'dq');
 const ped=page.w.WM4.quanti().find(x=>x.mat==='TR-PED');act(page,'bl',{udc:ped.udc,qta:'2',motivo:'SIM controllo',data:'2027-02-01'});
 check(page.S().giacenze['TR-PED']===300,'344 mantiene IM');page=RF('2027-02-01');
 page=apri('erp_magazzino','bloccato');const blocked=page.w.WM4.bloccati()[0];act(page,'dq',{udc:blocked.udc,motivo:'SIM integra',data:'2027-02-01'},'sb');page=RF('2027-02-01');
 check(page.S().giacenze['TR-PED']===300&&page.w.WM4.bloccato('TR-PED')===0,'343 e RF mantengono stock');
 page=apri('erp_inventario','documenti');aiuti(page,'in');act(page,'in',{tipo:'ubicazioni',selezione:'01-01-2',tolleranza:'20',data:'2027-02-01'});aiuti(page,'ia');act(page,'ia',{data:'2027-02-01'});aiuti(page,'ic');
 page=apri('erp_magazzino','rf');page.lab.querySelector('[data-s="inventario"]').click();let input=page.lab.querySelector('#rf-inv');input.value='01-01-2';input.dispatchEvent(new page.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 check(!!page.lab.querySelector('#rf-c0').getAttribute('aria-describedby'),'campo dinamico conta RF descritto');
 check(page.lab.querySelector('#wms-aiuto-rf-c0').textContent.includes('0 se vuota'),'conta distingue zero e vuoto');
 // Verifica firme condivise anche quando i moduli operativi non sono ancora disponibili.
 const L=page.w.LabMotore;
 for(const [pref,fields,action] of [
  ['im',['consegna','imballo','perCollo','data'],'Crea i colli'],['vt',['consegne','vettore','targa','autista','porto','data'],'Crea trasporto'],
  ['ca',['sscc','data'],'Carica il collo'],['pt',['trasporto','data'],'Registra la partenza'],['pg',['consegna','data'],'Registra uscita'],
  ['mo',['ondate','crossDock'],'Salva'],['on',['data'],'Rilascia ondata'],['sl',['data'],'Crea compiti'],['rf',['trasporto','data'],'Passaggio varco'],
  ['ix',['data'],'Chiudi WMS'],['rg',['data'],'Registra le differenze']]){
  const box=page.w.document.createElement('div');box.innerHTML=L.modulo(pref,fields.map(f=>[f,f,'text']),[[pref,action]]);
  check(box.querySelectorAll('.wms-aiuto-campo').length===fields.length,'aiuti completi firma '+pref);
  check(!!box.querySelector('[data-wms-guida="'+pref+'"]'),'procedura firma '+pref);
 }
 check(!L.modulo('ia',[['richiesta','Richiesta','text'],['data','Data','date']],[['ia','Registra incasso']]).includes('data-wms-guida'),'nessuna collisione acconto');
 check(!L.modulo('in',[['cliente','Cliente','text'],['importo','Importo','num'],['data','Data','date']],[['in','Registra incasso']]).includes('data-wms-guida'),'nessuna collisione incasso');
 check(page.w.WM4.quadratura().every(x=>x.ok),'quadratura finale');
}catch(e){errori++;console.error(e.stack);}
finestre.forEach(w=>w.close());
return {controlli,errori};
`;
const result = new Function('require','__dirname',harness+scenario)(req,path.join(repo,'tests'));
console.log(JSON.stringify({test:'wms-guida-campi',...result}));
process.exitCode=result.errori?1:0;
