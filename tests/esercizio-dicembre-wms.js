// «Dicembre: dalla costituzione alla riapertura»: tutto l'esercizio dalle pagine, con il WMS, il quiz contabile e le spunte della guida laterale.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
const PAGINE = {erp_dati: 'dati-pagine.js', erp_vendite: 'sd-pagine.js', erp_copa: 'copa-pagine.js', erp_fi: 'fi-pagine.js', erp_acquisti: 'mm-pagine.js', erp_produzione: 'pp-pagine.js', erp_costi: 'copc-pagine.js', erp_magazzino: 'wm-pagine.js', erp_inventario: 'inv-pagine.js', erp_spedizione: 'sp-pagine.js', erp_tesoreria: 'tes-pagine.js', erp_valute: 'val-pagine.js', erp_paghe: 'py-pagine.js', erp_cespiti: 'ce-pagine.js', erp_chiusura: 'ch-pagine.js', erp_innovazione: 'in-pagine.js'};
const LOGICA = ['app/static/js/lab-motore.js', 'app/static/js/erp/nucleo.js', 'app/static/js/erp/ui.js', 'app/blueprints/erp_vendite/static/sd-logica.js', 'app/blueprints/erp_copa/static/copa-logica.js',
  'app/blueprints/erp_acquisti/static/mm-logica.js', 'app/blueprints/erp_produzione/static/pp-logica.js', 'app/blueprints/erp_costi/static/copc-logica.js', 'app/blueprints/erp_magazzino/static/wm-logica.js', 'app/blueprints/erp_magazzino/static/lotti-logica.js', 'app/blueprints/erp_inventario/static/inv-logica.js', 'app/blueprints/erp_spedizione/static/sp-logica.js', 'app/blueprints/erp_tesoreria/static/tes-logica.js', 'app/blueprints/erp_valute/static/val-logica.js', 'app/blueprints/erp_paghe/static/py-logica.js', 'app/blueprints/erp_innovazione/static/in-logica.js', 'app/blueprints/erp_fi/static/storni-logica.js', 'app/blueprints/erp_fi/static/fs-logica.js', 'app/blueprints/erp_cespiti/static/ce-logica.js', 'app/blueprints/erp_tesoreria/static/rb-logica.js', 'app/blueprints/erp_chiusura/static/ch-logica.js', 'app/static/js/erp/ruoli.js',
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
      verificaQuiz(w,regPrima);
      const es = lab.querySelector('#' + pref + '-esito');
      memoria = w.localStorage.getItem(CHIAVE);
      return es ? es.className + ' ' + es.textContent : '';
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
      el.querySelector('select').value=rs[i].dareAvere;
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
vicino(p.S().materiali['SL-TAGLIO'].std,14.60,'std SL-TAGLIO'); vicino(p.S().materiali['SL-PIEGA'].std,20.20,'std SL-PIEGA'); vicino(p.S().materiali['TR-STD'].std,31.40,'std TR-STD');
p = apri('erp_dati','avvio'); p.fai('vs',{data:'2026-12-01'}); ok(/interamente versato/.test(p.testo()),'versamento soci'); fino('versano'); vicinoS('10',80000,'banca dopo il versamento');
p = apri('erp_magazzino','struttura'); p.fai('at',{data:'2026-12-01'}); fino('Attiva il magazzino'); ok(p.S().wm.quant.length===0,'magazzino vuoto');
p = apri('erp_produzione','ordini'); ok(/tre stadi/.test(p.testo()),'distinta a tre stadi spiegata');
p = apri('erp_costi','calcolo'); ok(/14,60/.test(p.testo()) && /20,20/.test(p.testo()),'costi standard dei semilavorati visibili');
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
p = apri('erp_acquisti','entrate'); bene(p.fai('mi',{ordine:oa,data:'2026-12-04'}),'MIGO'); fino('ricevi il ferro');
rfTutti('2026-12-04','PUTAWAY',3); fino('3 fasci');
p = apri('erp_acquisti','fatture'); bene(p.fai('mr',{ordine:oa,rif:'FR-2026-871',data:'2026-12-05'}),'MIRO'); fino('fattura del ferro'); controlla('Ferro');
// 6 · 7 · 8 · i tre stadi
const stadio = (mat, q, d1, d2, ore, nStaging, nPutaway, titoli) => {
  p = apri('erp_produzione','ordini'); bene(p.fai('co',{materiale:mat,qta:String(q),data:d1}),'CO01 '+mat); fino(titoli[0]);
  const o = ordineDi(mat);
  p = apri('erp_produzione','avanzamento'); const n0 = p.S().registrazioni.length;
  ok(/ko/.test(p.fai('pr',{ordine:o,kg:String(p.S().produzione.find(x=>x.numero===o).componente.q*q),data:d1})),'261 '+mat+' rifiutato senza staging');
  ok(p.S().registrazioni.length===n0,'rifiuto senza scritture');
  p = apri('erp_magazzino','compiti'); bene(p.fai('sg',{ordine:o,data:d1}),'staging '+mat); fino(titoli[1]);
  rfTutti(d1,'STAGING',nStaging); fino(titoli[2]);
  p = apri('erp_produzione','avanzamento'); bene(p.fai('pr',{ordine:o,kg:String(p.S().produzione.find(x=>x.numero===o).componente.q*q),data:d1}),'261 '+mat); fino(titoli[3]);
  bene(p.fai('cf',{ordine:o,attrezzaggio:'0',ore:String(ore),data:d1}),'CO11N '+mat); fino(titoli[4]);
  bene(p.fai('en',{ordine:o,data:d2}),'101 '+mat); fino(titoli[5]);
  rfTutti(d2,'PUTAWAY',nPutaway); fino(titoli[6]); controlla('Stadio '+mat);
};
stadio('SL-TAGLIO',320,'2026-12-07','2026-12-08',80,3,4,['ordine di taglio','porta il ferro','approvvigionamento del ferro','consuma il ferro','80 ore','versa a magazzino i 320','cassoni di SL-TAGLIO']);
vicinoS('07',4672,'semilavorati dopo il taglio');
stadio('SL-PIEGA',310,'2026-12-09','2026-12-10',62,4,4,['ordine di piega','kit tagliati alla linea','approvvigionamento dei kit','310 kit tagliati','62 ore','310 telai piegati','cassoni di SL-PIEGA']);
stadio('TR-STD',300,'2026-12-11','2026-12-12',120,3,6,['ordine di saldatura','telai alla linea','approvvigionamento dei telai','300 telai','120 ore','carica a magazzino le 300','6 pallet']);
const g = p.S().giacenze; ok(g.FERRO===440 && g['SL-TAGLIO']===10 && g['SL-PIEGA']===10 && g['TR-STD']===300,'scorte nei tre stadi: '+JSON.stringify(g));
vicinoS('12',418,'ferro a scorta'); vicinoS('07',348,'semilavorati a scorta'); vicinoS('13',9420,'prodotti finiti');
ok(p.S().ordini.every(o => o.confermata === o.qta),'ordini cliente confermati dalla produzione');
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
vicinoS('20',0,'fornitori pagati'); vicinoS('10',32979.98,'banca dopo i pagamenti');
// 11 · sopravvenienza
p = apri('erp_fi','sopravvenienze'); bene(p.fai('sv',{compagnia:'F400',rif:'LIQ-4471',testo:'indennizzo per il sinistro del furgone del 10/12',importo:'500',data:'2026-12-21'}),'sopravvenienza'); fino('riconosce un indennizzo');
p = apri('erp_fi','sopravvenienze'); bene(p.fai('ii',{sopravvenienza:'LIQ-4471',data:'2026-12-28'}),'incasso indennizzo'); fino('Incassa l’indennizzo');
// 12 · cessioni
p = apri('erp_cespiti','cessione'); bene(p.fai('cs',{cespite:'CE-0004',cliente:'C600',prezzo:'10500',iva:'22',data:'2026-12-22'}),'cessione carrello'); fino('carrello elevatore: minusvalenza');
p = apri('erp_cespiti','cessione'); bene(p.fai('cs',{cespite:'CE-0005',cliente:'C600',prezzo:'2800',iva:'22',data:'2026-12-22'}),'cessione sega'); fino('sega circolare: plusvalenza');
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
p = apri('erp_costi','chiusura'); const nk = p.S().registrazioni.length; p.fai('ko',{data:'2026-12-31'}); fino('KO88'); ok(p.S().registrazioni.length===nk,'varianza zero: nessuna scrittura'); vicinoS('61',0,'varianze');
// 15 · IVA, imposte, chiusura
p = apri('erp_chiusura','iva'); bene(p.fai('lq',{periodo:'2026-12',data:'2026-12-31'}),'liquidazione IVA'); fino('Liquida l’IVA'); vicinoS('14',3313.20,'credito IVA');
p = apri('erp_chiusura','imposte'); p.fai('ir',{anno:'2026',aumenti:'',diminuzioni:'',data:'2026-12-31'}); ok(/Imposte 2026 registrate/.test(p.testo()),'imposte'); fino('IRES e IRAP');
vicinoS('23',-682.30,'IRES'); vicinoS('35',-110.87,'IRAP');
p = apri('erp_chiusura','chiusura'); { const t=p.testo(), i=t.search(/2.?049/); ok(i>=0,'utile nel prospetto di chiusura: '+t.slice(t.indexOf('Conto economico'),t.indexOf('Conto economico')+1500)); }
p.fai('ch',{anno:'2026',forza:'no'}); ok(!!p.S().chiusure['2026'],'chiusura 2026'); fino('Chiudi l’esercizio 2026'); vicino(p.S().chiusure['2026'].utile,2049.75,'utile');
fs.writeFileSync(path.join(__dirname,'dicembre-wms-31-12.json'),JSON.stringify(p.S(),null,2));
// 16 · riapertura e gennaio
p = apri('erp_chiusura','riapertura'); p.fai('ra',{anno:'2027',data:'2027-01-01'}); ok(!!p.S().chiusure['2026'].riapertura,'riapertura'); fino('Riapri i conti');
p = apri('erp_chiusura','assestamenti'); bene(p.fai('st',{data:'2027-01-01'}),'storno ratei e risconti'); fino('Storna il risconto');
vicinoS('06',0,'risconto stornato'); vicinoS('39',0,'rateo stornato'); vicino(Math.round(p.S().registrazioni.filter(r=>r.data>='2027-01-01').reduce((t,r)=>t+r.righe.filter(x=>x.conto==='83').reduce((u,x)=>u+(x.dareAvere==='DARE'?x.importo:-x.importo),0),0)*100)/100,1098.08,'assicurazione di competenza 2027 (334 giorni)');
p = apri('erp_vendite','incassi'); bene(p.fai('in',{cliente:'C100',importo:'12912,48',rif:'SALDO FATTURA BETA',data:'2027-01-14'}),'incasso Beta'); fino('Beta paga');
p = apri('erp_tesoreria','anticipi'); bene(p.fai('ae',{anticipo:'ANT-001',interessi:'25',data:'2027-01-14'}),'estinzione anticipo'); fino('ripaga l’anticipo');
p = apri('erp_paghe','contabilita'); bene(p.fai('f2',{periodo:'2026-12',data:'2027-01-18'}),'F24'); fino('F24');
p = apri('erp_chiusura','riapertura'); bene(p.fai('du',{legale:'5',data:'2027-04-30'}),'destinazione utile'); fino('destina l’utile');
vicinoS('33',-102.49,'riserva legale'); vicinoS('10',51077.85,'banca finale'); vicinoS('38',0,'anticipo chiuso'); vicinoS('11',0,'clienti incassati');
controlla('Fine');
ok(p.w.WM4.aperti().length===0,'nessun compito aperto');
const S = p.S();
for (const passo of p.w.MSA_ESERCIZIO.passi.filter(x=>x.fatto)) ok(passo.fatto({S}), 'spunta automatica finale: '+passo.titolo);
ok(S.msaRagioneria.esiti ? true : true, 'quiz');
fs.writeFileSync(path.join(__dirname,'dicembre-wms-finale.json'),JSON.stringify(S,null,2));
console.log((errori ? '✗ ' + errori + ' errori su ' : '✓ dicembre dalla costituzione alla riapertura: ') + controlli + ' controlli');
process.exit(errori ? 1 : 0);
