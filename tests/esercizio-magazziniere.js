// «Magazziniere 5.0: un mese di magazzino»: tutto l'esercizio dalle pagine (percorso logistico), con il WMS, la ricostruzione delle scritture e le spunte della guida.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const PAGINE = {erp_dati: 'dati-pagine.js', erp_vendite: 'sd-pagine.js', erp_copa: 'copa-pagine.js', erp_fi: 'fi-pagine.js', erp_acquisti: 'mm-pagine.js', erp_produzione: 'pp-pagine.js', erp_costi: 'copc-pagine.js', erp_controllo: 'co-pagine.js', erp_bpc: 'bpc-pagine.js', erp_magazzino: 'wm-pagine.js', erp_inventario: 'inv-pagine.js', erp_spedizione: 'sp-pagine.js', erp_tesoreria: 'tes-pagine.js', erp_valute: 'val-pagine.js', erp_paghe: 'py-pagine.js', erp_cespiti: 'ce-pagine.js', erp_chiusura: 'ch-pagine.js', erp_innovazione: 'in-pagine.js'};
const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_bpc/static/bpc-logica.js', 'app/blueprints/erp_controllo/static/co-percorso.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js', 'app/blueprints/erp_cespiti/static/ce-logica.js', 'app/blueprints/erp_tesoreria/static/rb-logica.js', 'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/static/js/erp/ruoli.js',
  'app/static/js/lab-copioni.js', 'app/static/js/erp/lettore.js', 'app/static/vendor/jsbarcode-3.11.6.min.js', 'app/static/vendor/qrcode-generator-1.4.4.js', 'app/static/js/erp/etichette.js'];
let memoria = null, ultima = null;   // il localStorage passa da una pagina all'altra come nel browser
function apri(bp, pagina) {
  if (ultima) memoria = ultima.localStorage.getItem(CHIAVE) || memoria;
  if (ultima) ultima.close();
  const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/', runScripts: 'outside-only'}).window;
  ultima = w;
  if (memoria) w.localStorage.setItem(CHIAVE, memoria);
  w.confirm = () => true;
  w.LAB_PAGINA = {chiave: CHIAVE, pagina: pagina, slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/' + bp + '/static/' + PAGINE[bp]]).forEach(f => w.eval(R(f)));
  w.MSA_GUIDA = {esercizio:'magazziniere-5', chiave:CHIAVE, versione:'vuoto', url:{}};
  if (fs.existsSync(path.join(__dirname,'..','app/blueprints/guida/static/esercizi/magazziniere-5.js'))) w.eval(R('app/blueprints/guida/static/esercizi/magazziniere-5.js'));
  w.eval(R('app/blueprints/guida/static/ragioneria.js'));
  w.eval(R('app/blueprints/guida/static/pannello.js'));
  const lab = w.document.getElementById('lab');
  const P = {w, lab, S: () => w.MSA_STATO_CORRENTE(),
    // compila il modulo con prefisso e preme il pulsante; restituisce il messaggio di esito
    fai(pref, valori, azione) {
      const regPrima=w.MSA_STATO_CORRENTE().registrazioni.length;
      Object.entries(valori).forEach(([k, v]) => {
        const el = lab.querySelector('#' + pref + '-' + k); if (!el) throw Error('campo ' + pref + '-' + k + ' assente in ' + pagina);
        if (el.tagName === 'SELECT' && typeof v === 'function') v = [...el.options].map(o => o.value).find(v);
        if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
      });
      const b = lab.querySelector('[data-prefisso="' + pref + '"] [data-azione="' + (azione || pref) + '"]'); if (!b) throw Error('pulsante ' + pref + ' assente');
      b.click();
      const es = lab.querySelector('#' + pref + '-esito');
      const esito = es ? es.className + ' ' + es.textContent : '';
      verificaQuiz(w,regPrima);
      memoria = w.localStorage.getItem(CHIAVE);
      return esito;
    },
    testo: () => lab.textContent};
  return P;
}
function verificaQuiz(w,regPrima) {
  const S=w.MSA_STATO_CORRENTE(), nuovi=S.quizContabile===false?0:S.registrazioni.slice(regPrima).filter(r=>r.quiz!==false).length;
  ok(S.msaRagioneria.coda.length===nuovi,'domande corrispondono ai nuovi documenti effettivi');
  const libro=JSON.stringify(S.registrazioni);
  while(S.msaRagioneria.coda.length) {
    const q=S.msaRagioneria.coda[0], rs=q.documento.righe.map((r,i)=>({r,i})).sort((a,b)=>String(a.r.conto).localeCompare(String(b.r.conto),'it',{numeric:true})||a.i-b.i).map(x=>x.r);
    ok(!!w.document.querySelector('.msa-q-verifica'),'domanda immediata per '+q.documento.tipo);
    [...w.document.querySelectorAll('.msa-q-riga')].forEach((el,i)=>{
      el.querySelector('.msa-q-conto').value=rs[i].conto;
      el.querySelector('.msa-q-sezione').value=rs[i].dareAvere;
      el.querySelector('input').value=rs[i].importo.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
    });
    w.document.querySelector('.msa-q-verifica').click();
    ok(q.corretto,'ricostruzione corretta del documento '+q.documento.tipo);
    w.document.querySelector('.msa-q-continua').click();
  }
  ok(JSON.stringify(S.registrazioni)===libro,'quiz non duplica o cambia le scritture');
}
const bene = (r, m) => ok(/ ok /.test(' ' + r.split(' ')[1] + ' ') || /lab-esito ok/.test(r), m + ' → ' + r.slice(0, 160));
const male = (r, m) => ok(/lab-esito ko/.test(r) && !/lab-esito ok/.test(r), m + ' → ' + r.slice(0, 160));
const num = S => n => n;   // segnaposto leggibile



let p;
const vicinoS = (conto, atteso, m, alla) => { const s = p.S(); let t = 0; s.registrazioni.forEach(r => { if (alla && r.data > alla) return; if (['epilogo','stato patrimoniale','riapertura'].includes(r.chiusura)) return; r.righe.forEach(x => { if (x.conto === conto) t += x.dareAvere === 'DARE' ? x.importo : -x.importo; }); }); vicino(Math.round(t * 100) / 100, atteso, m + ' (conto ' + conto + ')'); };
// la guida: dopo ogni azione i passi fino a quello indicato sono spuntati da soli, il passo automatico successivo no
let fatti = 0;
function fino(pezzo) {
  const passi = p.w.MSA_ESERCIZIO.passi, k = passi.findIndex(x => x.titolo.indexOf(pezzo) >= 0);
  ok(k >= 0, 'passo della guida «' + pezzo + '»');
  for (let i = 0; i <= k; i++) if (passi[i].fatto) ok(passi[i].fatto({S: p.S()}), 'guida spuntata: ' + passi[i].titolo);
  const dopo = passi.slice(k + 1).find(x => x.fatto);
  if (dopo && k > 0) ok(!dopo.fatto({S: p.S()}), 'guida non ancora spuntata: ' + dopo.titolo + ' (dopo «' + pezzo + '»)');
  fatti = k;
}
function controlla(nome) {
  const s = p.S();
  const tot = s.registrazioni.reduce((v,r) => {r.righe.forEach(x => v[x.dareAvere === 'DARE' ? 'dare' : 'avere'] += x.importo); return v;}, {dare:0,avere:0});
  vicino(tot.dare, tot.avere, nome + ' Dare=Avere');
  if (s.wm && s.wm.attivo) ok(p.w.WM4.quadratura().every(x => x.ok), nome + ' IM=WMS');
}
function rfTutti(data, tipo, n) {
  p = apri('erp_magazzino', 'rf');
  const regs = p.S().registrazioni.length; let fatti = 0;
  while (p.w.WM4.aperti().length) {
    const t = p.w.WM4.aperti()[0];
    if (tipo) ok(t.tipo === tipo, 'tipo compito ' + tipo + ' (trovato ' + t.tipo + ')');
    p.lab.querySelector('#rf-data').value = data;
    for (const [id,value] of [['rf-da',t.da],['rf-udc',t.udc || t.mat],['rf-qta',String(t.qta)],['rf-a',t.a]]) p.lab.querySelector('#'+id).value = value;
    p.lab.querySelector('#rf-ok').click();
    ok(p.S().wm.compiti.find(x=>x.numero===t.numero).stato==='confermato', 'RF confermato '+t.numero);
    memoria = p.w.localStorage.getItem(CHIAVE); fatti++;
  }
  if (n != null) ok(fatti === n, 'RF ' + tipo + ': attesi ' + n + ' compiti, confermati ' + fatti);
  ok(p.S().registrazioni.length === regs, 'RF non genera scritture');
}
const invio=(pp,id,v)=>{const el=pp.lab.querySelector('#'+id);el.value=v;el.dispatchEvent(new pp.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));};
const scheda=(pp,s)=>{pp.lab.querySelector('.rf-schede button[data-s="'+s+'"]').click();};
const ordineDi = mat => p.S().produzione.find(o => o.materiale === mat).numero;

const vicinoC = (conto, atteso, m) => { let t = 0; p.S().registrazioni.forEach(r => r.righe.forEach(x => { if (x.conto === conto) t += x.dareAvere === 'DARE' ? x.importo : -x.importo; })); vicino(Math.round(t * 100) / 100, atteso, m + ' (conto ' + conto + ')'); };
const QUIZ = process.argv[2] === 'senza-quiz' ? 'no' : 'si';
// ── UF 10 · avvio ──
p = apri('erp_dati','avvio'); p.fai('lg',{data:'2027-01-04',quiz:QUIZ}); ok(/Percorso logistico avviato/.test(p.testo()),'percorso logistico avviato'); fino('Avvia il percorso logistico');
ok(p.S().quizContabile === (QUIZ === 'no' ? false : undefined), 'ricostruzione delle scritture ' + QUIZ);
vicinoC('13',22785,'prodotti finiti in apertura');
p = apri('erp_magazzino','struttura'); p.fai('at',{data:'2027-01-04'}); fino('Attiva il magazzino'); ok(p.S().wm.quant.length===14,'14 UdC create');
// «Dove si trova?» sulla mappa e nella pistola (lettura: niente cambia)
{ p = apri('erp_magazzino','mappa'); const prima = JSON.stringify(p.S()); const sel = p.lab.querySelector('#dove-mat'); ok(!!sel && !!sel.getAttribute('aria-describedby'),'menu Dove si trova con aiuto');
  sel.value = 'TR-ALTA'; sel.dispatchEvent(new p.w.Event('change')); const dv = p.w.WM4.dove('TR-ALTA');
  ok(dv.righe.length===4 && dv.prelevabile===200 && dv.im===200 && dv.wms===200,'TR-ALTA: 4 pallet, 200 prelevabili = IM = WMS');
  ok(p.lab.querySelectorAll('.ubic.trovata').length===4 && /LIBERA a scaffale/.test(p.testo()),'mappa colora le 4 ubicazioni e spiega');
  p = apri('erp_magazzino','rf'); scheda(p,'interroga'); invio(p,'rf-q','TR-PED'); ok(/Articolo TR-PED/.test(p.testo()) && p.lab.querySelectorAll('#rf-ris-q .rf-riga').length===6,'RF Interroga per articolo: 6 pallet TR-PED');
  ok(JSON.stringify(p.S())===prima,'Dove si trova non modifica lo stato'); }
// ── vendite ──
p = apri('erp_vendite','ordini');
bene(p.fai('va',{cliente:'C100',materiale:'TR-STD',qta:'350',rif:'BETA-350',data:'2027-01-05',consegna:'2027-01-15'}),'VA01 Beta'); fino('Beta ordina');
bene(p.fai('va',{cliente:'C200',materiale:'TR-ALTA',qta:'150',rif:'DELTA-150',data:'2027-01-05',consegna:'2027-01-15'}),'VA01 Delta'); fino('Delta ordina');
bene(p.fai('va',{cliente:'C300',materiale:'TR-STD',qta:'150',rif:'GAMMA-150',data:'2027-01-05',consegna:'2027-01-22'}),'VA01 Gamma'); fino('Comune di Gamma');
ok(/confermabile 200 su 350/.test(p.testo()),'Beta confermabile 200 su 350');
// ── UF 8 · acquisti ──
p = apri('erp_magazzino','scorte'); { const regs = p.S().registrazioni.length; bene(p.fai('sm',{materiale:'FERRO',minimo:'500',massimo:'3000'}),'scorta minima ferro'); fino('Scorta minima del ferro');
  const f = p.w.WM4.scorte().find(x=>x.mat==='FERRO'); ok(f.stato==='riordina' && f.proposta===3000,'ferro sotto scorta: proposta 3.000 kg'); ok(/SOTTO SCORTA/.test(p.testo()),'avviso sotto scorta'); ok(p.S().registrazioni.length===regs,'scorta minima senza scritture'); }
p = apri('erp_acquisti','ordini'); bene(p.fai('me',{fornitore:'F100',materiale:'FERRO',qta:'3000',prezzo:'1',data:'2027-01-05',consegna:'2027-01-07'}),'ME21N'); fino('ordina 3.000');
ok(p.S().acquisti[0].consegna==='2027-01-07','consegna prevista sull’ordine d’acquisto');
{ const f = p.w.WM4.scorte().find(x=>x.mat==='FERRO'); ok(f.stato==='in arrivo' && f.arrivo===3000,'dopo l’ordine: ferro in arrivo'); const a = p.w.WM4.arretrato('2027-01-08'); ok(a.fornitori.length===1 && a.fornitori[0].sem.cls==='rosso','ferro non arrivato l’8/1: fornitore in ritardo'); }
const oa = p.S().acquisti[0].numero;
p = apri('erp_acquisti','entrate'); bene(p.fai('mi',{ordine:oa,ddt:'DDT-AU-0107',lotto:'COL-0107',danneggiati:'150',danno:'fasci piegati nel trasporto',data:'2027-01-07'}),'MIGO'); fino('150 kg sono piegati');
vicinoC('63',150,'differenza prezzo alla MIGO'); vicinoC('22',-3000,'fatture da ricevere');
p = apri('erp_magazzino','allocare'); { const x = p.w.WM4.daAllocare('2027-01-07'); ok(x.righe.length===3 && x.righe.every(r=>r.mat==='FERRO') && x.righe.reduce((t,r)=>t+r.qta,0)===2850 && !x.orfani.length,'merce da mettere a posto: 3 fasci, 2.850 kg');
  ok(p.lab.querySelectorAll('a[href*="rf?compito="]').length===3,'pulsante Metti a posto per ogni riga');
  ok(x.righe.map(r=>r.a).join(',')==='F-01,F-01,F-02','destinazioni proposte F-01, F-01, F-02');}
rfTutti('2027-01-07','PUTAWAY',3); fino('3 fasci buoni');
p = apri('erp_magazzino','bloccato'); const qz = p.w.WM4.bloccati()[0]; ok(qz && qz.qta===150,'150 kg in quarantena');
bene(p.fai('dq',{udc:qz.udc,motivo:'fasci piegati, non recuperabili',data:'2027-01-07'},'ro'),'rottamazione'); fino('rottama i 150 kg'); vicinoC('69',142.5,'rottamazione ferro');
p = apri('erp_acquisti','fatture'); bene(p.fai('mr',{ordine:oa,rif:'FR-2027-014',prezzo:'1,02',accetta:true,data:'2027-01-08'}),'MIRO'); fino('fattura arriva a 1,02');
vicinoC('22',0,'ponte merci/fatture chiuso'); vicinoC('63',210,'differenze prezzo totali'); vicinoC('20',-3733.2,'debito fornitore');
// ── produzione ──
p = apri('erp_produzione','ordini'); bene(p.fai('co',{materiale:'TR-STD',qta:'300',data:'2027-01-08',fine:'2027-01-13'}),'CO01'); fino('ordine di produzione per 300');
const op = p.S().produzione[0].numero;
p = apri('erp_produzione','avanzamento'); ok(/ko/.test(p.fai('pr',{ordine:op,kg:'2400',data:'2027-01-08'})),'261 rifiutato senza staging');
p = apri('erp_magazzino','compiti'); bene(p.fai('sg',{ordine:op,data:'2027-01-08'}),'staging'); fino('approvvigiona la linea');
rfTutti('2027-01-08','STAGING',3); fino('porta il ferro a bordo linea');
p = apri('erp_produzione','avanzamento'); bene(p.fai('pr',{ordine:op,kg:'2400',data:'2027-01-08'}),'261'); fino('preleva 2.400'); vicinoC('70',2280,'consumi');
[['Taglio',75,'2027-01-09'],['Piegatura',60,'2027-01-11'],['Saldatura',120,'2027-01-12']].forEach(([fase,ore,data])=>{p=apri('erp_produzione','avanzamento'); bene(p.fai('cf',{ordine:op,fase,attrezzaggio:'0',ore:String(ore),qta:'300',data}),'CO11N '+fase); fino(fase==='Taglio'?'conferma il Taglio':'conferma la '+fase); });
p=apri('erp_produzione','avanzamento'); bene(p.fai('en',{ordine:op,data:'2027-01-13'}),'101'); fino('versa a magazzino'); vicinoC('73',-9420,'produzione interna');
rfTutti('2027-01-13','PUTAWAY',6); fino('6 pallet'); ok(p.S().giacenze['TR-STD']===500,'500 TR-STD');
p = apri('erp_magazzino','lotti'); ok(/COL-0107/.test(p.testo()),'tracciabilità della colata');
// ── movimenti interni ──
p = apri('erp_magazzino','bloccato'); const alta = p.S().wm.quant.find(q=>q.mat==='TR-ALTA').udc;
bene(p.fai('bl',{udc:alta,qta:'',motivo:'pallet urtato dal carrello, da controllare',data:'2027-01-13'}),'blocca'); fino('Blocca un pallet di TR-ALTA');
rfTutti('2027-01-13','BLOCCO',1); fino('porta il pallet in quarantena');
p = apri('erp_magazzino','bloccato'); bene(p.fai('dq',{udc:alta,motivo:'imballo integro, merce buona',data:'2027-01-13'},'sb'),'sblocca'); fino('sblocca il pallet');
rfTutti('2027-01-13','PUTAWAY',1); fino('rimetti a scaffale il pallet sbloccato');
p = apri('erp_magazzino','compiti'); const ped = p.S().wm.quant.find(q=>q.mat==='TR-PED' && q.ubic==='01-05-1').udc;
bene(p.fai('tr',{udc:ped,a:'03-04-1',motivo:'riordino della corsia 01',data:'2027-01-13'}),'LT10'); fino('sposta un pallet di TR-PED');
rfTutti('2027-01-13','TRASF',1); fino('conferma lo spostamento');
p = apri('erp_innovazione','slotting'); bene(p.fai('sl',{data:'2027-01-13'}),'slotting'); fino('Slotting');
rfTutti('2027-01-13','TRASF',3); fino('trasferimenti dello slotting'); controlla('movimenti interni');
// ── spedizione a ondate ──
p = apri('erp_innovazione','ondate'); bene(p.fai('mo',{ondate:'si',crossDock:'no'}),'ondate attive'); fino('Attiva il prelievo a ondate');
{ p = apri('erp_magazzino','arretrato'); const a = p.w.WM4.arretrato('2027-01-14');
  ok(a.clienti.length===3 && a.clienti.filter(x=>x.sem.cls==='giallo').length===2 && a.clienti.find(x=>x.mat==='TR-STD' && x.qta===150).sem.cls==='verde','arretrato 14/01: Beta e Delta gialli, Gamma verde');
  ok(!a.fornitori.length && !a.produzione.length && !a.lavoro.length,'nessun fornitore, ordine o compito arretrato');
  const b = p.w.WM4.arretrato('2027-01-16'); ok(b.ritardi.clienti===2,'il 16/01 Beta e Delta sarebbero in ritardo'); p.lab.querySelector('#ar-data').value='2027-01-14'; p.lab.querySelector('#ar-data').dispatchEvent(new p.w.Event('change')); ok(/scade fra 1 giorno/.test(p.testo()) && p.lab.querySelectorAll('.lab-bd.giallo').length===2,'pagina arretrato con i gialli'); }
p = apri('erp_vendite','consegne'); const [ob,od,og]=p.S().ordini.map(o=>o.numero);
bene(p.fai('vl',{ordine:ob,data:'2027-01-14'}),'VL Beta'); fino('consegna per Beta');
bene(p.fai('vl',{ordine:od,data:'2027-01-14'}),'VL Delta'); fino('consegna per Delta'); ok(p.w.WM4.aperti().length===0,'nessun compito prima dell’ondata');
p = apri('erp_innovazione','ondate'); bene(p.fai('on',{data:'2027-01-14'}),'ONDA-1'); fino('Rilascia l’ondata');
rfTutti('2027-01-14','PICK',10); fino('preleva i 10 pallet');
const [cb,cd]=p.S().consegne.map(c=>c.numero);
{ p = apri('erp_spedizione','imballi'); const regs = p.S().registrazioni.length;
  bene(p.fai('ib',{imballo:'EUR',lung:'120',larg:'80',alt:'15',tara:'25',portata:'1000',impilabile:'si',sopra:'700'}),'misure EUR');
  male(p.fai('rc',{materiale:'TR-STD',imballo:'EUR',pezzi:'90',alt:'125'}),'90 TR-STD su EUR: troppo pesante');
  bene(p.fai('rc',{materiale:'TR-STD',imballo:'EUR',pezzi:'50',alt:'125'}),'regola TR-STD'); bene(p.fai('rc',{materiale:'TR-ALTA',imballo:'EUR',pezzi:'50',alt:'140'}),'regola TR-ALTA');
  fino('quante transenne per collo'); ok(p.S().registrazioni.length===regs,'anagrafiche imballo senza scritture'); }
p = apri('erp_spedizione','imballo'); bene(p.fai('im',{consegna:cb,imballo:'EUR',perCollo:'50',data:'2027-01-14'}),'imballo Beta'); fino('Imballa Beta');
p = apri('erp_spedizione','imballo'); bene(p.fai('im',{consegna:cd,imballo:'EUR',perCollo:'50',data:'2027-01-14'}),'imballo Delta'); fino('Imballa Delta');
p = apri('erp_spedizione','trasporti'); bene(p.fai('vt',{consegne:cb+', '+cd,vettore:'V10',targa:'AB123CD',autista:'Mario Esempio',porto:'franco',data:'2027-01-15'}),'VT01N'); fino('un camion per le due consegne');
{ p = apri('erp_spedizione','piano'); const t = p.S().sped.trasporti[0].numero, SPx = p.w.SP4;
  const f = SPx.calcolaPiano({trasporto:t,veicolo:'FURGONE',criterio:'fermate'}), m = SPx.calcolaPiano({trasporto:t,veicolo:'MOTRICE',criterio:'fermate'}), s2 = SPx.calcolaPiano({trasporto:t,veicolo:'MOTRICE',criterio:'saturazione'});
  ok(f.kpi.caricati===1 && f.scarti.some(x=>/portata/.test(x.motivo)),'furgone: 1 collo, portata superata');
  ok(m.kpi.caricati===10 && m.kpi.posti===7 && m.kpi.pile===3 && m.kpi.peso===6700,'motrice: 10 colli in 7 posti, 3 pile, 6.700 kg');
  ok(m.posti.slice(0,3).every(q=>q.consegne[0]===p.S().sped.trasporti[0].consegne[1]),'per fermate: Delta (ultima fermata) vicino alla cabina');
  bene(p.fai('ps',{trasporto:t,veicolo:'MOTRICE',criterio:'fermate'}),'piano di carico'); fino('quale camion');
  ok(/CABINA/.test(p.testo()) || p.lab.querySelector('svg.piano-svg'),'disegno del camion'); }
const tr = p.S().sped.trasporti[0].numero;
p = apri('erp_magazzino','rf'); for (const x of p.S().sped.colli.filter(c=>c.consegna===cb)) { scheda(p,'carico'); p.lab.querySelector('#rf-data').value='2027-01-15'; invio(p,'rf-sscc',x.sscc); memoria = p.w.localStorage.getItem(CHIAVE); }
fino('RF Carico');
p = apri('erp_innovazione','rfid'); bene(p.fai('rf',{trasporto:tr,data:'2027-01-15'}),'varco RFID'); fino('Varco RFID');
p = apri('erp_spedizione','trasporti'); bene(p.fai('pt',{trasporto:tr,data:'2027-01-15'}),'partenza'); fino('Partenza: uscita merci'); vicinoC('41',16531,'costo del venduto');
p = apri('erp_spedizione','ddt'); ok(/DOCUMENTO DI TRASPORTO/.test(p.testo()),'DDT');
p = apri('erp_vendite','fatture'); bene(p.fai('vf',{consegna:cb,data:'2027-01-15'}),'fattura Beta'); fino('fattura Beta');
// ── resi ──
p = apri('erp_vendite','resi'); bene(p.fai('re',{fattura:p.S().fatture[0].numero,qta:'10',motivo:'transenne con saldatura difettosa',data:'2027-01-18'}),'reso'); fino('rende 10 transenne');
p = apri('erp_vendite','resi'); bene(p.fai('er',{reso:p.S().ordini.find(o=>o.tipo==='RE').numero,data:'2027-01-19'}),'entrata reso'); fino('Entrata del reso');
rfTutti('2027-01-19','PUTAWAY',1); fino('metti a posto il reso');
p = apri('erp_magazzino','bloccato'); const ur = p.S().wm.quant.find(q=>q.mat==='TR-STD' && q.qta===10).udc;
bene(p.fai('bl',{udc:ur,qta:'',motivo:'reso cliente: saldature difettose',data:'2027-01-19'}),'blocca reso'); fino('Blocca il reso');
rfTutti('2027-01-19','BLOCCO',1); fino('porta il reso in quarantena');
p = apri('erp_magazzino','bloccato'); bene(p.fai('dq',{udc:ur,motivo:'saldature non riparabili',data:'2027-01-19'},'ro'),'rottama reso'); fino('Rottama il reso');
// ── spedizione standard ──
p = apri('erp_innovazione','ondate'); bene(p.fai('mo',{ondate:'no',crossDock:'no'}),'ondate spente');
p = apri('erp_vendite','consegne'); bene(p.fai('vl',{ordine:og,data:'2027-01-20'}),'VL Gamma'); fino('Spegni le ondate');
rfTutti('2027-01-20','PICK',3); fino('preleva i 3 pallet di Gamma');
const cg = p.S().consegne.find(c=>c.ordine===og).numero;
p = apri('erp_spedizione','imballo'); bene(p.fai('im',{consegna:cg,imballo:'EUR',perCollo:'50',data:'2027-01-20'}),'imballo Gamma'); fino('Imballa Gamma');
p = apri('erp_spedizione','trasporti'); bene(p.fai('vt',{consegne:cg,vettore:'V20',targa:'CD456EF',autista:'Luca Esempio',porto:'assegnato',data:'2027-01-21'}),'VT01N Gamma');
const tg = p.S().sped.trasporti[1].numero;
for (const x of p.S().sped.colli.filter(c=>c.consegna===cg)) { p = apri('erp_spedizione','trasporti'); bene(p.fai('ca',{sscc:x.sscc,data:'2027-01-21'}),'carico da scrivania'); }
fino('carico da scrivania');
p = apri('erp_spedizione','trasporti'); bene(p.fai('pt',{trasporto:tg,data:'2027-01-21'}),'partenza Gamma'); fino('Partenza di Gamma'); ok(p.S().giacenze['TR-STD']===0,'TR-STD esaurite');
// ── UF 9 · inventario ──
p = apri('erp_inventario','documenti'); bene(p.fai('in',{tipo:'ubicazioni',selezione:'F-01, F-02, 01-05-1',tolleranza:'10',data:'2027-01-29'}),'LI01N'); fino('LI01N');
p = apri('erp_inventario','documenti'); p.fai('ia',{data:'2027-01-29'}); ok(p.S().wm.inventari[0].stato==='attivo','inventario attivo'); fino('Attiva l’inventario');
p = apri('erp_magazzino','rf'); scheda(p,'inventario'); invio(p,'rf-inv','F-01');
{ const d = p.S().wm.inventari[0]; d.righe.forEach((r,k)=>{ const c=p.lab.querySelector('#rf-c'+k); if(c) c.value=String(r.libro); }); p.lab.querySelector('#rf-conta').click(); memoria = p.w.localStorage.getItem(CHIAVE); }
fino('RF Inventario');
p = apri('erp_inventario','documenti'); { const d = p.S().wm.inventari[0], v = {contatore:'Allievo'}; d.righe.forEach((r,k) => { if (r.conta1==null) v['r'+k] = r.ubic==='F-02' ? '438' : String(r.libro); }); p.fai('ic',v); ok(p.S().wm.inventari[0].stato==='riconta','oltre tolleranza: riconta'); }
fino('mancano 12 kg');
p = apri('erp_inventario','documenti'); { const d = p.S().wm.inventari[0], v = {}; d.righe.forEach((r,k) => { if (r.riconta) v['r'+k] = '438'; }); p.fai('ic',v); ok(p.S().wm.inventari[0].stato==='contato','riconta registrata'); } fino('LI14');
p = apri('erp_inventario','documenti'); p.fai('ix',{data:'2027-01-29'}); fino('LI20');
p = apri('erp_inventario','differenze'); bene(p.fai('rg',{data:'2027-01-29'}),'LI21'); fino('LI21'); vicinoC('65',11.4,'differenza inventariale');
// ── deposito esterno: la merce sul camion non è né qua né là ──
{ const regs = p.S().registrazioni.length;
  p = apri('erp_magazzino','depositi'); bene(p.fai('ub',{da:'W100',materiale:'TR-PED',qta:'100',data:'2027-01-30',consegna:'2027-01-31'}),'trasferimento UB'); fino('100 TR-PED al deposito');
  ok(p.w.WM4.aperti().filter(t=>t.tipo==='DEPOSITO').length===2,'2 prelievi per il deposito');
  rfTutti('2027-01-30','DEPOSITO',2); fino('preleva i 2 pallet per il deposito');
  p = apri('erp_magazzino','depositi'); bene(p.fai('us',{trasferimento:'UB001',data:'2027-01-30'}),'uscita 351'); fino('il camion parte');
  const viaggio = p.w.WM4.perLuogo().find(x=>x.mat==='TR-PED'); ok(viaggio.w100===200 && viaggio.viaggio===100 && viaggio.d200===0 && viaggio.contabile===300,'TR-PED 200 + 100 in viaggio = 300');
  ok(/né qua né là/.test(p.testo()),'pagina depositi spiega la merce in viaggio');
  const dv = p.w.WM4.dove('TR-PED'); ok(dv.prelevabile===200 && dv.righe.some(r=>/SUL CAMION/.test(r.cosa)),'Dove si trova: 100 sul camion');
  const ar = p.w.WM4.arretrato('2027-01-30'); ok(ar.viaggi.length===1 && ar.viaggi[0].sem.cls==='giallo','arretrato: viaggio in scadenza'); ok(p.w.WM4.arretrato('2027-02-01').ritardi.viaggi===1,'il 01/02 il viaggio è in ritardo');
  ok(p.w.WM4.quadratura().every(x=>x.ok),'IM = WMS con la merce in viaggio');
  { const v = apri('erp_vendite','ordini'); const a = v.w.SD4 && v.w.SD4.atp ? v.w.SD4.atp('TR-PED') : null; if (a) ok(a.giacenza===200,'ATP di W100: le 100 TR-PED in viaggio non sono vendibili'); p = apri('erp_magazzino','depositi'); }
  p = apri('erp_magazzino','depositi'); bene(p.fai('er',{trasferimento:'UB001',qta:'',data:'2027-01-31'}),'entrata 101 al deposito'); fino('Entrata 101 al deposito');
  const fine = p.w.WM4.perLuogo().find(x=>x.mat==='TR-PED'); ok(fine.w100===200 && fine.viaggio===0 && fine.d200===100,'TR-PED: 200 in W100, 100 nel deposito');
  ok(p.S().registrazioni.length===regs,'il trasferimento non genera scritture'); controlla('deposito esterno'); }
// ── valori e controlli finali ──
vicinoC('12',416.1,'ferro a standard'); ok(p.S().giacenze.FERRO===438,'438 kg di ferro');
vicinoC('13',10964,'prodotti finiti a standard');
p = apri('erp_magazzino','monitor'); ok(/Sotto la scorta minima/.test(p.testo()),'avviso sotto scorta nel monitor');
{ const f = p.w.WM4.scorte().find(x=>x.mat==='FERRO'); ok(f.stato==='riordina' && f.proposta===2562,'fine mese: ferro 438 sotto 500, proposta 2.562 kg'); } ok(p.S().giacenze['TR-ALTA']===50 && p.S().giacenze['TR-PED']===300,'TR-ALTA 50, TR-PED 300');
controlla('fine del mese');
// tutti i passi con controllo automatico risultano fatti
p = apri('erp_dati','avvio');
p.w.MSA_ESERCIZIO.passi.filter(x=>x.fatto).forEach(x=>ok(x.fatto({S:p.S()}),'passo fatto a fine esercizio: '+x.titolo));
ok(p.S().msaRagioneria.coda.length===0,'nessuna scrittura in sospeso');
if (QUIZ === 'si') fs.writeFileSync(path.join(__dirname,'magazziniere-finale.json'),JSON.stringify(p.S(),null,2));
console.log((errori ? '✗ ' : '✓ ') + 'Magazziniere 5.0 (' + (QUIZ === 'no' ? 'senza' : 'con') + ' ricostruzione delle scritture): ' + controlli + ' controlli, ' + errori + ' errori');
process.exit(errori ? 1 : 0);
