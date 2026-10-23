// «Dicembre: dalla costituzione alla riapertura»: tutto l'esercizio dalle pagine, con il WMS, il quiz contabile e le spunte della guida laterale.
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
  w.MSA_GUIDA = {esercizio:'dicembre-wms', chiave:CHIAVE, versione:'vuoto', url:{}};
  w.eval(R('app/blueprints/guida/static/esercizi/dicembre-wms-legacy.js'));
  w.eval(R('app/blueprints/guida/static/esercizi/dicembre-wms.js'));
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
        el.value = v;
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
  const S=w.MSA_STATO_CORRENTE(), nuovi=S.registrazioni.slice(regPrima).filter(r=>r.quiz!==false).length;
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
const ordineDi = mat => p.S().produzione.find(o => o.materiale === mat).numero;
// 0 · sistema vuoto
p = apri('erp_dati','avvio'); fino('Prima di cominciare');
ok(!!p.lab.querySelector('[data-prefisso="cs"]'), 'riquadro della costituzione presente');
// 1 · costituzione
p.fai('cs',{data:'2026-12-01',capitale:'80000'}); ok(/Costituzione registrata/.test(p.testo()),'costituzione'); fino('Costituisci');
ok(p.S().giacenze['TR-STD']===0 && p.S().materiali['SL-TAGLIO'].tipo==='HALB','azienda vuota con semilavorati');
vicino(p.S().materiali['SL-TAGLIO'].std,14.60,'std HALB autonomo'); vicino(p.S().materiali['TR-STD'].std,31.40,'std TR-STD');
ok(p.S().produzioneModello==='wip-fasi-v1' && !p.S().materiali['SL-PIEGA'],'nuova costituzione: modello a fasi e nessun HALB intermedio SL-PIEGA');
p = apri('erp_dati','avvio'); p.fai('vs',{data:'2026-12-01'}); ok(/interamente versato/.test(p.testo()),'versamento soci'); fino('versano'); vicinoS('10',80000,'banca dopo il versamento');
p = apri('erp_magazzino','struttura'); p.fai('at',{data:'2026-12-01'}); fino('Attiva il magazzino'); ok(p.S().wm.quant.length===0,'magazzino vuoto');
p = apri('erp_produzione','ordini'); ok(/WIP/.test(p.testo()),'ciclo a fasi e WIP spiegati');
p = apri('erp_costi','calcolo'); ok(/14,60/.test(p.testo()) && /31,40/.test(p.testo()),'standard HALB e finito visibili');
// 2 · macchinari
p = apri('erp_cespiti','acquisto');
[['Taglierina a nastro','IMP','15000','MA-101'],['Piegatubi idraulica','IMP','8000','MA-102'],['Saldatrice a filo','IMP','6000','MA-103'],['Carrello elevatore elettrico','MEZ','12000','MA-104'],['Sega circolare','IMP','2000','MA-105']].forEach(x => {
  p = apri('erp_cespiti','acquisto'); bene(p.fai('ac',{descrizione:x[0],classe:x[1],fornitore:'F300',importo:x[2],iva:'22',rif:x[3],inFunzione:'2026-12-01',data:'2026-12-01'}),'F-90 '+x[0]); });
fino('sega circolare'); vicinoS('20',-52460,'debito Macchine Alfa'); controlla('Macchinari');
// 3 · assicurazione
p = apri('erp_fi','passive'); bene(p.fai('fp',{fornitore:'F400',rif:'POL-2026-118',conto:'83',testo:'premio annuo polizza incendio e furto',imponibile:'1200',iva:'0',dal:'2026-12-01',al:'2027-11-30',scadenza:'2026-12-02',data:'2026-12-01'}),'FB60 polizza'); fino('polizza annuale');
p = apri('erp_fi','passive'); bene(p.fai('pg',{fornitore:'F400',documento:'POL-2026-118',data:'2026-12-02'}),'F-53 polizza'); fino('paga la polizza'); vicinoS('10',78800,'banca dopo la polizza');
// 4 · ordini cliente
p = apri('erp_vendite','ordini'); bene(p.fai('va',{cliente:'C100',materiale:'TR-STD',qta:'180',rif:'BETA-180',data:'2026-12-02'}),'VA01 Beta');
ok(!p.lab.querySelector('#va-materiale option[value="SL-TAGLIO"]'),'i semilavorati non si vendono');
bene(p.fai('va',{cliente:'C200',materiale:'TR-STD',qta:'120',rif:'DELTA-120',data:'2026-12-02'}),'VA01 Delta'); fino('Delta ordina');
ok(p.S().ordini.every(o => o.confermata === 0), 'ordini in attesa della produzione');
vicino(p.S().ordini[0].prezzi.totale,12912.48,'totale Beta'); vicino(p.S().ordini[1].prezzi.totale,8608.32,'totale Delta');
// 5 · ferro
p = apri('erp_acquisti','ordini'); bene(p.fai('me',{fornitore:'F100',materiale:'FERRO',qta:'3000',prezzo:'1',data:'2026-12-03'}),'ME21N'); fino('ordina 3.000');
const oa = p.S().acquisti[0].numero;
p = apri('erp_acquisti','entrate'); bene(p.fai('mi',{ordine:oa,ddt:'DDT-AU-5512',lotto:'COL-1204',danneggiati:'200',danno:'tubi schiacciati nel trasporto',data:'2026-12-04'}),'MIGO con danneggiati'); fino('200 kg sono schiacciati');
ok(p.w.WM4.bloccato('FERRO')===200,'200 kg in stock bloccato');
rfTutti('2026-12-04','PUTAWAY',3); fino('3 fasci buoni');
p = apri('erp_magazzino','bloccato'); const qz = p.w.WM4.bloccati()[0];
bene(p.fai('dq',{udc:qz.udc,motivo:'tubi schiacciati, non riparabili',data:'2026-12-05'},'ro'),'rottamazione'); fino('decidi sui 200 kg'); vicinoS('69',190,'rottamazione');
p = apri('erp_acquisti','fatture'); bene(p.fai('mr',{ordine:oa,rif:'FR-2026-871',data:'2026-12-05'}),'MIRO'); fino('fattura del ferro');
p = apri('erp_acquisti','ordini'); bene(p.fai('me',{fornitore:'F100',materiale:'FERRO',qta:'500',prezzo:'1,08',data:'2026-12-05'}),'riordino'); fino('riordino urgente');
const oa2 = p.S().acquisti[1].numero;
p = apri('erp_acquisti','entrate'); bene(p.fai('mi',{ordine:oa2,ddt:'DDT-AU-5530',lotto:'COL-1206',data:'2026-12-06'}),'MIGO riordino'); fino('500 kg urgenti');
rfTutti('2026-12-06','PUTAWAY',1); fino('fascio urgente'); ok(p.w.WM4.inUbic('F-02').length===2,'due colate in F-02');
p = apri('erp_acquisti','fatture'); bene(p.fai('mr',{ordine:oa2,rif:'FR-2026-902',data:'2026-12-06'}),'MIRO riordino'); fino('fattura del riordino'); controlla('Ferro');
// 6 · un unico ordine TR-STD: ferro e tre conferme di fase, nessun 101 intermedio
p = apri('erp_produzione','ordini'); bene(p.fai('co',{materiale:'TR-STD',qta:'300',data:'2026-12-07'}),'CO01 TR-STD'); fino('un ordine per 300');
const op = ordineDi('TR-STD'); ok(op==='1000001','primo ordine è il finito');
p = apri('erp_produzione','avanzamento'); let nr = p.S().registrazioni.length;
ok(/ko/.test(p.fai('pr',{ordine:op,kg:'2400',data:'2026-12-07'})),'261 rifiutato senza staging');
ok(p.S().registrazioni.length===nr,'rifiuto senza scritture');
p = apri('erp_magazzino','compiti'); bene(p.fai('sg',{ordine:op,data:'2026-12-07'}),'staging finito'); fino('porta il ferro delle transenne');
rfTutti('2026-12-07','STAGING',3); fino('approvvigionamento del ferro delle transenne');
p = apri('erp_produzione','avanzamento'); bene(p.fai('pr',{ordine:op,kg:'2400',data:'2026-12-07'}),'261 finito'); fino('consuma 2.400'); vicinoS('70',2280,'consumo ferro finito');
function controllaWip(atteso, messaggio) {
  const o=p.S().produzione.find(x=>x.numero===op);
  vicino(p.w.PP4.wip(o).valore,atteso,messaggio+' WIP analitico');
  ok(o.eventi.filter(e=>e.tipo==='101'&&!e.stornato).length===0,'nessun 101 tra le fasi');
  ok(p.S().giacenze['TR-STD']===0 && p.S().giacenze['SL-TAGLIO']===0 && !p.S().materiali['SL-PIEGA'],'nessuno stock dal completamento della fase');
  ok(!p.S().wm.compiti.some(t=>t.tipo==='PUTAWAY'&&t.mat!=='FERRO'),'nessun PUTAWAY di fase');
  vicinoS('07',0,'nessuna scorta HALB dalle fasi'); vicinoS('13',0,'nessuna scorta FERT prima del 101'); vicinoS('15',0,'WIP non capitalizzato in FI');
  controlla(messaggio);
}
const confermaFase = (fase,ore,data,wip,titolo) => {
  p=apri('erp_produzione','avanzamento');
  bene(p.fai('cf',{ordine:op,fase,attrezzaggio:'0',ore:String(ore),qta:'300',data}),'CO11N '+fase);
  fino(titolo); controllaWip(wip,fase);
};
confermaFase('Taglio',75,'2026-12-07',4380,'Taglio 75 ore');
p=apri('erp_produzione','avanzamento'); nr=p.S().registrazioni.length;
ok(/ko/.test(p.fai('en',{ordine:op,data:'2026-12-08'})),'101 rifiutato dopo il solo taglio');
ok(p.S().registrazioni.length===nr,'101 prematuro senza scritture');
confermaFase('Piegatura',60,'2026-12-09',6060,'Piegatura 60 ore');
confermaFase('Saldatura',120,'2026-12-11',9420,'Saldatura 120 ore');
bene(p.fai('en',{ordine:op,data:'2026-12-12'}),'101 finito finale'); fino('carica a magazzino le 300');
vicino(p.w.PP4.wip(p.S().produzione.find(x=>x.numero===op)).valore,0,'WIP azzerato dal 101 finale');
ok(p.S().produzione.length===1 && p.S().produzione[0].eventi.filter(e=>e.tipo==='101').length===1,'tre fasi, stesso ordine, unico 101 finale');
rfTutti('2026-12-12','PUTAWAY',6); fino('6 pallet');
// 8 · HALB autonomo: secondo ordine indipendente, stock reale
p=apri('erp_produzione','ordini'); bene(p.fai('co',{materiale:'SL-TAGLIO',qta:'20',data:'2026-12-12'}),'CO01 HALB autonomo'); fino('ordine autonomo per 20');
const oh=ordineDi('SL-TAGLIO'); ok(oh==='1000002','secondo ordine è il HALB autonomo');
p=apri('erp_magazzino','compiti'); bene(p.fai('sg',{ordine:oh,data:'2026-12-12'}),'staging HALB'); fino('approvvigiona il ferro dei 20');
rfTutti('2026-12-12','STAGING',1); fino('porta alla linea il ferro dei kit');
p=apri('erp_produzione','avanzamento'); bene(p.fai('pr',{ordine:oh,kg:'160',data:'2026-12-12'}),'261 HALB'); fino('consuma 160');
bene(p.fai('cf',{ordine:oh,fase:'',attrezzaggio:'0',ore:'5',data:'2026-12-12'}),'CO11N HALB singolo'); fino('5 ore del HALB');
bene(p.fai('en',{ordine:oh,data:'2026-12-12'}),'101 HALB'); fino('20 kit autonomi');
rfTutti('2026-12-12','PUTAWAY',1); fino('cassone SL-TAGLIO');
const c20=p.S().wm.quant.find(q=>q.mat==='SL-TAGLIO'&&q.qta===20);
ok(!!c20,'un cassone autonomo da 20 a scaffale');
p=apri('erp_magazzino','compiti'); bene(p.fai('tr',{udc:c20.udc,a:'03-05-2',motivo:'resti in fondo al magazzino',data:'2026-12-12'}),'trasferimento HALB'); fino('sposta il cassone');
rfTutti('2026-12-12','TRASF',1); fino('conferma lo spostamento');
ok(p.w.WM4.inUbic('03-05-2')[0].qta===20,'cassone HALB in 03-05-2');
const g=p.S().giacenze; ok(g.FERRO===740 && g['SL-TAGLIO']===20 && !g['SL-PIEGA'] && g['TR-STD']===300,'stock distinto dal WIP: '+JSON.stringify(g));
vicinoS('12',703,'ferro a scorta'); vicinoS('07',292,'HALB a scorta'); vicinoS('13',9420,'prodotti finiti');
vicinoS('70',2432,'ferro consumato totale'); vicinoS('71',0,'nessun consumo semilavorati'); vicinoS('72',7280,'attività due ordini'); vicinoS('75',-7280,'attività accreditate ai centri'); vicinoS('73',-9712,'output totale indipendente: 9420 finito + 292 HALB');
ok(p.S().ordini.every(o=>o.confermata===o.qta),'ordini cliente confermati dalla produzione'); controlla('Produzione completa');
// 9 · consegna con picking
p = apri('erp_vendite','consegne'); const ob = p.S().ordini[0].numero, od = p.S().ordini[1].numero;
bene(p.fai('vl',{ordine:ob,data:'2026-12-14'}),'consegna Beta'); fino('consegna per Beta');
bene(p.fai('vl',{ordine:od,data:'2026-12-14'}),'consegna Delta'); fino('consegna per Delta');
ok(p.w.WM4.aperti().length===7,'7 compiti di prelievo');
rfTutti('2026-12-14','PICK',7); fino('preleva i 7');
const cb = p.S().consegne[0].numero, cd = p.S().consegne[1].numero;
p = apri('erp_spedizione','imballo'); bene(p.fai('im',{consegna:cb,imballo:'EUR',perCollo:'50',data:'2026-12-14'}),'imballo Beta'); fino('Beta in 4 colli');
p = apri('erp_spedizione','imballo'); bene(p.fai('im',{consegna:cd,imballo:'EUR',perCollo:'40',data:'2026-12-14'}),'imballo Delta'); fino('Delta in 3 colli');
p = apri('erp_spedizione','trasporti'); bene(p.fai('vt',{consegne:cb+', '+cd,vettore:'V10',targa:'AA000AA',autista:'Mario Esempio',porto:'franco',data:'2026-12-15'}),'trasporto'); fino('Crea un trasporto');
const tr = p.S().sped.trasporti[0].numero;
for (const x of p.S().sped.colli.slice()) bene(p.fai('ca',{sscc:x.sscc,data:'2026-12-15'}),'carico '+x.sscc);
fino('Carica i 7 colli');
bene(p.fai('pt',{trasporto:tr,data:'2026-12-15'}),'partenza'); fino('Partenza'); vicinoS('41',9420,'costo del venduto'); ok(p.S().giacenze['TR-STD']===0,'transenne spedite'); controlla('Spedizione');
// 10 · fatture, SdI, anticipo, pagamenti
p = apri('erp_vendite','fatture'); bene(p.fai('vf',{consegna:cb,data:'2026-12-15'}),'fattura Beta'); fino('fattura Beta');
p = apri('erp_vendite','fatture'); bene(p.fai('vf',{consegna:cd,data:'2026-12-15'}),'fattura Delta'); fino('fattura Delta');
for (const f of p.S().fatture) { p = apri('erp_fi','sdi'); bene(p.fai('sd',{fattura:f.numero,data:'2026-12-15'}),'SdI '+f.numero); }
fino('SdI');
const fb = p.S().fatture[0].numero;
p = apri('erp_tesoreria','anticipi'); bene(p.fai('an',{fattura:fb,percentuale:'80',commissione:'30',data:'2026-12-16'}),'anticipo fattura'); fino('anticipa l’80%');
vicinoS('38',-10329.98,'debito per anticipo'); vicinoS('11',21520.80,'crediti verso clienti restano aperti');
p = apri('erp_fi','passive'); bene(p.fai('pg',{fornitore:'F100',data:'2026-12-17'}),'paga ferro'); fino('paga il ferro');
p = apri('erp_fi','passive'); bene(p.fai('pg',{fornitore:'F300',data:'2026-12-18'}),'paga macchine'); fino('paga i macchinari');
vicinoS('20',0,'fornitori pagati'); vicinoS('10',32321.18,'banca dopo i pagamenti');
// 11 · sopravvenienza
p = apri('erp_fi','sopravvenienze'); bene(p.fai('sv',{compagnia:'F400',rif:'LIQ-4471',testo:'indennizzo per il sinistro del furgone del 10/12',importo:'500',data:'2026-12-21'}),'sopravvenienza'); fino('riconosce un indennizzo');
// 12 · cessioni
p = apri('erp_cespiti','cessione'); bene(p.fai('cs',{cespite:'CE-0004',cliente:'C600',prezzo:'10500',iva:'22',data:'2026-12-22'}),'cessione carrello'); fino('carrello elevatore: minusvalenza');
p = apri('erp_cespiti','cessione'); bene(p.fai('cs',{cespite:'CE-0005',cliente:'C600',prezzo:'2800',iva:'22',data:'2026-12-22'}),'cessione sega'); fino('sega circolare: plusvalenza');
p = apri('erp_fi','sopravvenienze'); bene(p.fai('ii',{sopravvenienza:'LIQ-4471',data:'2026-12-28'}),'incasso indennizzo'); fino('Incassa l’indennizzo');
vicinoS('46',1300,'minusvalenza'); vicinoS('45',-816.67,'plusvalenza');
p = apri('erp_vendite','incassi'); bene(p.fai('in',{cliente:'C600',importo:'16226',rif:'CESSIONI CARRELLO E SEGA',data:'2026-12-29'}),'incasso cessioni'); fino('incassa le due cessioni');
p = apri('erp_vendite','incassi'); bene(p.fai('in',{cliente:'C200',importo:'8608,32',rif:'SALDO FATTURA DELTA',data:'2026-12-30'}),'incasso Delta'); fino('Delta paga');
// 13 · stipendi
p = apri('erp_paghe','cedolino'); bene(p.fai('ca',{periodo:'2026-12'}),'calcolo paghe'); fino('Calcola le paghe');
vicino(p.S().hr.cedolini.reduce((t,c)=>t+c.netto,0),5769.08,'netti'); vicino(p.S().hr.cedolini.reduce((t,c)=>t+c.costo,0),10426.96,'costo azienda');
ok(p.S().hr.cedolini.every(c => c.ratei.mesi === 1 && Math.abs(c.tredicesima - c.base / 12) < 0.01),'13ª di un mese per gli assunti a dicembre');
p = apri('erp_paghe','contabilita'); bene(p.fai('rg',{periodo:'2026-12',data:'2026-12-31'}),'registra paghe'); fino('Registra le paghe');
bene(p.fai('pn',{periodo:'2026-12',data:'2026-12-31'}),'netti pagati'); fino('Paga gli stipendi');
// 14 · assestamenti
p = apri('erp_chiusura','assestamenti');
ok(/1098,08/.test(p.fai('as',{tipo:'risconto-attivo',conto:'83',testo:'polizza POL-2026-118',importo:'1200',dal:'2026-12-01',al:'2027-11-30',data:'2026-12-31'},'prova')),'anteprima del risconto');
bene(p.fai('as',{tipo:'risconto-attivo',conto:'83',testo:'polizza POL-2026-118',importo:'1200',dal:'2026-12-01',al:'2027-11-30',data:'2026-12-31'}),'risconto'); fino('Risconto attivo');
p = apri('erp_chiusura','assestamenti'); bene(p.fai('as',{tipo:'rateo-passivo',conto:'86',testo:'fitto capannone, trimestre posticipato',importo:'3000',dal:'2026-12-01',al:'2027-02-28',data:'2026-12-31'}),'rateo'); fino('Rateo passivo');
vicinoS('06',1098.08,'risconto'); vicinoS('39',-1033.33,'rateo');
p = apri('erp_cespiti','ammortamenti'); bene(p.fai('af',{data:'2026-12-31'}),'AFAB'); fino('AFAB'); vicinoS('50',458.34,'ammortamenti');
// inventario di fine anno
p = apri('erp_magazzino','mappa'); const occ = ['F-02','03-05-2'].map(b => p.w.WM4.inUbic(b).map(q => q.mat + ' ' + q.qta).join('+')); ok(occ.join('|')==='FERRO 240+FERRO 500|SL-TAGLIO 20','ubicazioni occupate: '+occ.join('|'));
p = apri('erp_inventario','documenti'); bene(p.fai('in',{tipo:'ubicazioni',selezione:'F-02, 03-05-2',tolleranza:'20',data:'2026-12-31'}),'LI01N'); fino('ubicazioni occupate');
p = apri('erp_inventario','documenti'); p.fai('ia',{data:'2026-12-31'}); ok(p.S().wm.inventari[0].stato==='attivo','attiva inventario'); fino('Attiva l’inventario');
p = apri('erp_inventario','documenti'); { const d = p.S().wm.inventari[0], v = {contatore:'Allievo'}; d.righe.forEach((r,k) => v['r'+k] = r.mat === 'SL-TAGLIO' ? '19' : String(r.libro)); p.fai('ic',v); ok(p.S().wm.inventari[0].stato==='contato','conta'); } fino('registra la conta');
p = apri('erp_inventario','documenti'); p.fai('ix',{data:'2026-12-31'}); ok(p.S().wm.inventari[0].stato==='chiuso','chiudi inventario'); fino('LI20');
p = apri('erp_inventario','differenze'); bene(p.fai('rg',{data:'2026-12-31'}),'LI21'); fino('LI21'); vicinoS('65',14.60,'differenza inventariale'); ok(p.S().giacenze['SL-TAGLIO']===19,'19 kit dopo l’inventario');
{ const v = p.w.IV4.valuta(p.w.IV4.movimentiDi('FERRO'), 0.95); console.log('VALORIZZAZIONE FERRO', JSON.stringify({g:v.giacenza,fifo:v.fifo,lifo:v.lifo,cmp:v.cmp,std:v.standard})); vicino(v.fifo,780,'FIFO ferro'); vicino(v.lifo,740,'LIFO ferro'); }
controlla('Inventario');
p = apri('erp_costi','chiusura'); const nk = p.S().registrazioni.length; p.fai('ko',{data:'2026-12-31'}); fino('KO88'); ok(p.S().registrazioni.length===nk,'varianza zero: nessuna scrittura'); vicinoS('61',0,'varianze');
// 15 · IVA, imposte, chiusura
p = apri('erp_chiusura','iva'); bene(p.fai('lq',{periodo:'2026-12',data:'2026-12-31'}),'liquidazione IVA'); fino('Liquida l’IVA'); vicinoS('14',3432,'credito IVA');
p = apri('erp_chiusura','imposte');
const calcoloImposte=p.w.CH4.calcolaImposte({anno:'2026',aumenti:'',diminuzioni:''});
vicino(calcoloImposte.risultato,2573.32-(7336-7280),'ante imposte: attività accreditate inferiori di56 euro');
vicino(calcoloImposte.ires,Math.round(calcoloImposte.risultato*24)/100,'IRES calcolata al24%');
vicino(calcoloImposte.irap,Math.round(calcoloImposte.risultato*3.9)/100,'IRAP calcolata al3,9%');
p.fai('ir',{anno:'2026',aumenti:'',diminuzioni:'',data:'2026-12-31'}); ok(/Imposte 2026 registrate/.test(p.testo()),'imposte'); fino('IRES e IRAP');
vicinoS('23',-604.16,'IRES'); vicinoS('35',-98.18,'IRAP');
p = apri('erp_chiusura','chiusura'); { const t=p.testo(), i=t.search(/1.?814,98/); ok(i>=0,'utile nel prospetto di chiusura: '+t.slice(t.indexOf('Conto economico'),t.indexOf('Conto economico')+1500)); }
p.fai('ch',{anno:'2026',forza:'no'}); ok(!!p.S().chiusure['2026'],'chiusura 2026'); fino('Chiudi l’esercizio 2026'); vicino(p.S().chiusure['2026'].utile,1814.98,'utile'); vicinoS('10',51886.42,'banca al 31/12');
fs.writeFileSync(path.join(__dirname,'dicembre-wms-31-12.json'),JSON.stringify(p.S(),null,2));
// 16 · riapertura e gennaio
p = apri('erp_chiusura','riapertura'); p.fai('ra',{anno:'2027',data:'2027-01-01'}); ok(!!p.S().chiusure['2026'].riapertura,'riapertura'); { const r = p.S().registrazioni.find(x => x.tipo==='RIAPERTURA'); vicino(r.righe.filter(x=>x.conto==='92' && x.dareAvere==='AVERE')[0].importo,99309.38,'totale riapertura'); } fino('Riapri i conti');
p = apri('erp_chiusura','assestamenti'); bene(p.fai('st',{data:'2027-01-01'}),'storno ratei e risconti'); fino('Storna il risconto');
vicinoS('06',0,'risconto stornato'); vicinoS('39',0,'rateo stornato'); vicino(Math.round(p.S().registrazioni.filter(r=>r.data>='2027-01-01').reduce((t,r)=>t+r.righe.filter(x=>x.conto==='83').reduce((u,x)=>u+(x.dareAvere==='DARE'?x.importo:-x.importo),0),0)*100)/100,1098.08,'assicurazione di competenza 2027 (334 giorni)');
p = apri('erp_vendite','incassi'); bene(p.fai('in',{cliente:'C100',importo:'12912,48',rif:'SALDO FATTURA BETA',data:'2027-01-14'}),'incasso Beta'); fino('Beta paga');
p = apri('erp_tesoreria','anticipi'); bene(p.fai('ae',{anticipo:'ANT-001',interessi:'25',data:'2027-01-14'}),'estinzione anticipo'); fino('ripaga l’anticipo');
p = apri('erp_paghe','contabilita'); bene(p.fai('f2',{periodo:'2026-12',data:'2027-01-18'}),'F24'); fino('F24');
p = apri('erp_chiusura','riapertura'); bene(p.fai('du',{legale:'5',data:'2027-04-30'}),'destinazione utile'); fino('destina l’utile');
vicinoS('33',-90.75,'riserva legale'); vicinoS('10',50419.05,'banca finale'); vicinoS('38',0,'anticipo chiuso'); vicinoS('11',0,'clienti incassati');
controlla('Fine');
ok(p.w.WM4.aperti().length===0,'nessun compito aperto');
const S = p.S();
for (const passo of p.w.MSA_ESERCIZIO.passi.filter(x=>x.fatto)) ok(passo.fatto({S}), 'spunta automatica finale: '+passo.titolo);
ok(S.msaRagioneria.esiti ? true : true, 'quiz');
fs.writeFileSync(path.join(__dirname,'dicembre-wms-finale.json'),JSON.stringify(S,null,2));
// La guida storica resta selezionabile anche dal launchpad senza motore caricato.
const storico=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/dicembre-wms-legacy.json'),'utf8'));
for(const conMotore of [true,false]) {
  const w=new JSDOM('<!doctype html><body></body>',{url:'https://sim.local/',runScripts:'outside-only'}).window;
  w.MSA_GUIDA={chiave:CHIAVE}; w.localStorage.setItem(CHIAVE,JSON.stringify(storico));
  if(conMotore) w.MSA_STATO_CORRENTE=()=>storico;
  w.eval(R('app/blueprints/guida/static/esercizi/dicembre-wms-legacy.js'));
  w.eval(R('app/blueprints/guida/static/esercizi/dicembre-wms.js'));
  ok(w.MSA_ESERCIZIO===w.MSA_ESERCIZIO_DICEMBRE_LEGACY,'guida legacy conservata '+(conMotore?'con motore':'dal localStorage del launchpad'));
  w.close();
}
console.log((errori ? '✗ ' + errori + ' errori su ' : '✓ dicembre dalla costituzione alla riapertura: ') + controlli + ' controlli');
process.exit(errori ? 1 : 0);
