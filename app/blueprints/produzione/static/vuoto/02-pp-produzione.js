/* Generato da tools/split_simulatore.py (vuoto) — non modificare a mano: modifica sorgenti/ e rilancia. */
/* ═════════════════════════════════════════════════════════════════
   PP — Produzione in stile SAP S/4HANA, innestato in "Ferro & Transenne".
   ─────────────────────────────────────────────────────────────────
   • Isolato come SD/MM: Shadow DOM + IIFE. Un dato solo: distinta, ciclo e centri
     sono quelli di Impostazioni; ogni ordine congela la versione valida al rilascio.
   • Distinta a due livelli: FERRO (ROH) → SL-TAGLIO (HALB, operazioni «produce SL»)
     → TRANSENNA (FERT, operazioni «produce PF»). Costo in cascata (CK11N).
   • Ordine di produzione = raccoglitore dei costi (CO). Scritture in tempo reale:
       261 componente      Dare 70/71 Consumi          / Avere 12 o 16 magazzino
       CO11N attività      Dare 72 Costi interni addeb. / Avere 51 e 52 per centro
       101 da ordine       Dare 16 o 13 magazzino      / Avere 73 Output di produzione
   • WIP SOLO A FINE PERIODO (KKAX + CO88), come SAP:
       ordini aperti   → Dare 15 WIP / Avere 74 Variazione rimanenze prodotti in corso (delta)
       ordini chiusi   → storno WIP + varianze per categoria (KKS2) su 60/61/64, contropartita 73
   • Ogni movimento merci è un DOCUMENTO MATERIALE (MB51) in STATO.mm.documenti,
     con stabilimento, magazzino, prenotazione e area di fornitura: pronto per il WMS.
   ═════════════════════════════════════════════════════════════════ */
window.PP = (function(){
'use strict';
let R = null;
const ui = {s:'home', sel:'', msg:{}, ultima:null, keep:false, keepScr:''};
const P = () => STATO.pp;
const MM = () => STATO.mm;
const $ = id => R ? R.getElementById(id) : null;
const val = id => { const e = $(id); return e ? e.value : ''; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fd = d => (d || '').split('-').reverse().join('/');
const n0 = x => (Number(x) || 0).toLocaleString('it-IT', {maximumFractionDigits:0});
const n2 = x => (Number(x) || 0).toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2});
const nq = (x, um) => um === 'kg' ? n2(x) + ' kg' : n0(x) + ' pz';
const card = (ic, t, tx, b) => `<div class="card"><div class="ch"><span>${ic}</span><h2>${t}</h2><span class="tx">${tx || ''}</span></div><div class="cb">${b}</div></div>`;
const al = (k, h, p) => `<div class="al al-${k}"><h4>${h}</h4><p>${p}</p></div>`;
const bd = (k, t) => `<span class="bd bd-${k}">${t}</span>`;
const tb = (head, rows, vuoto) => {
  const right = head.map(h => h.endsWith('>'));
  return `<div class="wrap"><table><thead><tr>${head.map((h, i) => `<th${right[i] ? ' class="r"' : ''}>${h.replace(/>$/, '')}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map(r => `<tr>${r.map((c, i) => `<td${right[i] ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}" class="small">${vuoto || 'Nessun dato.'}</td></tr>`}</tbody></table></div>`;
};
const sumC = (arr, f) => arr.reduce((t, x) => t + f(x), 0);
const commessa = id => STATO.commesse.find(c => String(c.id) === String(id));
const ordine = id => P().ordini.find(o => o.id === id);
const reg = id => STATO.registrazioni.find(r => r.id === id);
const oggi = () => oggiIso();
const fineMese = p => new Date(Date.UTC(+p.slice(0, 4), +p.slice(5, 7), 0)).toISOString().slice(0, 10);

// ───────────────────────── anagrafica materiali ─────────────────────────
const MAT = {
  FERRO:{cod:'FERRO', desc:'Ferro grezzo', tipo:'ROH', um:'kg', lgort:'0010', conto:'12'},
  SL:{cod:'SL-TAGLIO', desc:'Kit barre tagliate (1 transenna)', tipo:'HALB', um:'pz', lgort:'0020', conto:'16'},
  PIEGA:{cod:'SL-PIEGA',desc:'Kit barre piegate (1 transenna)',tipo:'HALB',um:'pz',lgort:'0020',conto:'161'},
  PF:{cod:'TRANSENNA', desc:'Transenna standard', tipo:'FERT', um:'pz', lgort:'0001', conto:'13'},
};
const matByCod = cod => Object.values(MAT).find(m => m.cod === cod);
const psaDi = centroId => 'PSA-' + String(nomeCentroCosto(centroId) || centroId).toUpperCase().replace(/[^A-Z0-9]+/g, '');
// Struttura del costo standard corrente, a due livelli (CK11N): operazioni «produce SL» e «produce PF»
// Nuove strutture, senza mutare gli snapshot degli ordini esistenti.
function struttura(){
  const d=costoStandardDettaglio(), clone=x=>JSON.parse(JSON.stringify(x));
  const fase=o=>o.produce==='PIEGA'||o.opId==='OP0015'||/pieg/i.test(o.descrizione+' '+o.centroNome)?'PIEGA':o.produce==='SL'?'SL':'PF';
  const slOps=d.operazioni.filter(o=>fase(o)==='SL'), pieOps=d.operazioni.filter(o=>fase(o)==='PIEGA'), pfOps=d.operazioni.filter(o=>fase(o)==='PF');
  const ferro={mat:'FERRO',um:'kg',lgort:MAT.FERRO.lgort,qtyPz:d.materiale.kgStdPezzo,prezzo:d.materiale.prezzoStdKg};
  const sl={materiale:'SL-TAGLIO',componenti:[ferro],operazioni:clone(slOps)};
  sl.costoUnitario=ferro.qtyPz*ferro.prezzo+sumC(slOps,o=>o.costoPezzo);
  const piega={materiale:'SL-PIEGA',componenti:[{mat:'SL-TAGLIO',um:'pz',lgort:MAT.SL.lgort,qtyPz:1,sl:clone(sl)}],operazioni:clone(pieOps)};
  piega.costoUnitario=sl.costoUnitario+sumC(pieOps,o=>o.costoPezzo);
  const pf={materiale:'TRANSENNA',componenti:[{mat:'SL-PIEGA',um:'pz',lgort:MAT.PIEGA.lgort,qtyPz:1,sl:clone(piega)}],operazioni:clone(pfOps)};
  pf.costoUnitario=piega.costoUnitario+sumC(pfOps,o=>o.costoPezzo);
  return {versione:d.versione,dataVersione:d.dataVersione,duelivelli:true,trelivelli:true,sl,piega,pf};
}
function stdMateriale(st,cod){return cod==='SL-TAGLIO'?st.sl:cod==='SL-PIEGA'?st.piega:st.pf;}
function valComp(c,qty){
  if(c.mat==='FERRO')return c2(qty*c.prezzo);
  const s=c.sl;
  return sumC(s.componenti,x=>valComp(x,x.qtyPz*qty))+sumC(s.operazioni,op=>c2(op.costoPersonalePezzo*qty)+c2(op.costoGeneraliPezzo*qty));
}
function lottiSL(escludiDoc,cod='SL-TAGLIO',data){
  const lotti=MM().documenti.filter(d=>d.mat===cod&&d.bwart==='101'&&!d.stornatoDa&&(!data||d.data<=data))
    .map(d=>({lotto:d.doc,data:d.data,qty:d.qty,cent:d.cent,resQ:d.qty,resC:d.cent})).sort((a,b)=>a.data.localeCompare(b.data)||a.lotto.localeCompare(b.lotto));
  // Riserva anche i consumi con data successiva: il medesimo lotto non viene prelevato due volte.
  MM().documenti.filter(d=>d.mat===cod&&d.bwart==='261'&&!d.stornatoDa&&d.doc!==escludiDoc).forEach(d=>(d.lotti||[]).forEach(p=>{
    const l=lotti.find(x=>x.lotto===p.lotto);if(l){l.resQ-=p.qty;l.resC-=p.cent;}
  }));return lotti;
}
function prelevaSL(qty,cod='SL-TAGLIO',data){
  let rest=qty;const out=[];
  for(const l of lottiSL(null,cod,data)){if(rest<=0)break;if(l.resQ<=0)continue;const x=Math.min(l.resQ,rest),cent=x===l.resQ?l.resC:Math.round(l.resC*x/l.resQ);out.push({lotto:l.lotto,qty:x,cent});rest-=x;}
  return {prelievi:out,mancano:rest,cent:sumC(out,p=>p.cent)};
}
const catene=()=>P().catene||[];
const faseCod=tipo=>tipo==='SL'?'SL-TAGLIO':tipo==='PIEGA'?'SL-PIEGA':'TRANSENNA';
const ordCatena=k=>P().ordini.filter(o=>o.schemaFasi===3&&o.catenaId===k.id);
function targetCatena(k){
  if(!window.Fabbisogno||STATO.regolaProduzione!=='FABBISOGNO_NETTO_CLIENTI')return k.qty;
  const pf=ordCatena(k).filter(o=>o.materiale==='TRANSENNA'),entrati=sumC(pf,o=>riepilogo(o).entrati),coperto=sumC(pf,o=>o.teco?riepilogo(o).entrati:o.qty-riepilogo(o).scarto);
  const aperti=sumC(pf.filter(o=>!o.teco&&!o.liquidazione),o=>Math.max(0,o.qty-riepilogo(o).entrati-riepilogo(o).scarto));
  const proprio=aperti+Math.max(0,k.qty-coperto),f=Fabbisogno.info(),residuo=Math.max(0,f.vendite-f.giacenza-f.produzione+proprio);
  return Math.min(k.qty,entrati+residuo);
}
function targetFase(k,cod){
  const base=targetCatena(k);if(!base)return 0;
  const os=ordCatena(k),persiPF=sumC(os.filter(o=>o.materiale==='TRANSENNA'),o=>riepilogo(o).scarto),persiPiega=sumC(os.filter(o=>o.materiale==='SL-PIEGA'),o=>riepilogo(o).scarto);
  if(cod==='SL-TAGLIO')return Math.max(0,base+persiPF+persiPiega-(k.scorte?.['SL-PIEGA']||0));
  if(cod==='SL-PIEGA')return base+persiPF;
  return base;
}
function catenaAttiva(com){return catene().find(k=>String(k.commessaId)===String(com.id)&&!k.annullata&&ordCatena(k).filter(o=>o.materiale==='TRANSENNA').reduce((n,o)=>n+riepilogo(o).entrati,0)<k.qty);}
// Disponibilità non impegnata dalle altre prenotazioni aperte.
function libero(cod,data,propria,escludiOrdine){
  const fisico=data?sumC(SDMM.documentiMateriale().filter(d=>d.mat===cod&&d.data<=data),d=>d.segno*(d.qty||0)):giac(cod);
  const riservato=sumC(P().ordini.filter(o=>apertoPP(o)&&o.id!==escludiOrdine),o=>sumC(o.prenotazioni.filter(p=>p.mat===cod),p=>Math.max(0,p.fabbisogno-(riepilogo(o).comp[cod]?.qty||0))));
  const virtuale=['SL-TAGLIO','SL-PIEGA'].includes(cod)?sumC(catene().filter(k=>!k.annullata&&k.id!==propria&&(!data||k.data<=data)),k=>{
    const os=ordCatena(k),iniziale=k.scorte?.[cod]||0,prodotti=sumC(os.filter(o=>o.materiale===cod),o=>riepilogo(o,data).entrati);
    const assegnati=sumC(os,o=>sumC(o.prenotazioni.filter(p=>p.mat===cod),p=>o.teco?(riepilogo(o).comp[cod]?.qty||0):p.fabbisogno));
    return Math.max(0,iniziale+prodotti-assegnati);
  }):0;
  return Math.max(0,Math.min(fisico,giac(cod))-riservato-virtuale);
}
function pianoPrimaFase(tipo,com,q,data){
  const target=Math.max(0,Math.min(window.Fabbisogno?Fabbisogno.info().netto:q,Number(com.quantitaPianificata)||0));
  const piegati=tipo==='PF'?0:Math.min(target,libero('SL-PIEGA',data));
  const tagliati=tipo==='SL'?Math.min(target-piegati,libero('SL-TAGLIO',data)):0;
  const massimo=target-piegati-tagliati;
  return {massimo,qty:q+piegati+tagliati,scorte:{'SL-TAGLIO':tipo==='PIEGA'?q:tagliati,'SL-PIEGA':tipo==='PF'?q:piegati}};
}
function controllaNuovaFase(tipo,com,q,data){
  const k=catenaAttiva(com),cod=faseCod(tipo);
  if(!k){const e=window.Fabbisogno?Fabbisogno.errore(q):'';if(e)return e;const piano=pianoPrimaFase(tipo,com,q,data);if(q>piano.massimo)return 'Produci soltanto la carenza della fase: massimo '+piano.massimo+' pz, dopo avere considerato tagliati/piegati già liberi. Usa la fase successiva per le scorte esistenti.';}
  if(k){
    const stessi=ordCatena(k).filter(o=>o.materiale===cod),impegnati=sumC(stessi,o=>o.teco?riepilogo(o).entrati:o.qty-riepilogo(o).scarto)+(k.scorte?.[cod]||0);
    const target=targetFase(k,cod);
    if(q>target-impegnati)return 'Questa fase è già coperta oppure la domanda cliente si è ridotta. Residuo necessario '+Math.max(0,target-impegnati)+' pz; non duplicare produzione. Se la domanda è annullata, chiudi gli ordini con TECO e libera la catena.';
    const predecessore=tipo==='PIEGA'?'SL-TAGLIO':tipo==='PF'?'SL-PIEGA':null;
    if(predecessore){const preced=ordCatena(k).filter(o=>o.materiale===predecessore);if(preced.length&&!preced.some(o=>riepilogo(o,data).entrati>0))return 'Completa prima 261 → CO11N → 101 dell’ordine '+predecessore+'. Il seguito è manuale.';}
  }
  if(tipo!=='SL'){
    const componente=tipo==='PIEGA'?'SL-TAGLIO':'SL-PIEGA';
    if(q>libero(componente,data,k?.id))return 'Prima dell’ordine '+cod+' servono '+q+' '+componente+' non impegnati e già entrati con 101 alla data '+fd(data)+'. Disponibili '+n0(libero(componente,data,k?.id))+'; completa la fase precedente, poi crea questo ordine.';
  }
  return '';
}

// Costo standard (centesimi) di q pezzi dell'ordine
function stdCent(o, q){
  const comps = o.std.componenti.map(c => ({mat:c.mat, cent:valComp(c, c.qtyPz * q)}));
  const ops = o.std.operazioni.map(op => ({opId:op.opId, centroCostoId:op.centroCostoId, p:c2(op.costoPersonalePezzo * q), g:c2(op.costoGeneraliPezzo * q)}));
  return {comps, ops, tot: sumC(comps, x => x.cent) + sumC(ops, x => x.p + x.g)};
}
const centriOrdine = o => { const ids = []; o.std.operazioni.forEach(op => { if(!ids.some(x => String(x) === String(op.centroCostoId))) ids.push(op.centroCostoId); }); return ids; };

// ───────────────────────── documenti materiale (MB51) ─────────────────────────
const SEGNO = {'101':1, '102':-1, '261':-1, '262':1, '561':1, '601':-1, '602':1, '311':0};
const docsOrdine = (o, bwart) => MM().documenti.filter(d => d.rif && d.rif.ordine === o.id && (!bwart || bwart.includes(d.bwart)));
function nuovoDoc(x){
  const d = Object.assign({doc:String(MM().cnt++), pos:1, anno:(x.data || '').slice(0, 4), werks:'1000'}, x);
  d.segno = SEGNO[d.bwart] || 0;
  MM().documenti.push(d); return d;
}
// Lotti del semilavorato (valore storico congelato, consumo FIFO, esatto al centesimo sull'ultimo pezzo)
const giac = (cod, lgort) => SDMM.giacenza(cod, lgort);

// ───────────────────────── riepilogo e varianze dell'ordine ─────────────────────────
function riepilogo(o, finoData){
  const entro = d => !finoData || d.data <= finoData;
  const docs = docsOrdine(o).filter(entro);
  const comp = {};
  o.std.componenti.forEach(c => comp[c.mat] = {qty:0, cent:0});
  docs.filter(d => d.bwart === '261' || d.bwart === '262').forEach(d => { const c = comp[d.mat] || (comp[d.mat] = {qty:0, cent:0}); const s = d.bwart === '261' ? 1 : -1; c.qty += s * d.qty; c.cent += s * d.cent; });
  const gr = docs.filter(d => d.bwart === '101' || d.bwart === '102');
  const entrati = sumC(gr, d => (d.bwart === '101' ? 1 : -1) * d.qty), grCent = sumC(gr, d => (d.bwart === '101' ? 1 : -1) * d.cent);
  const conf = (o.conferme || []).filter(c => !c.annullato && entro(c));
  const buoni = sumC(conf, c => c.buoni), scarto = sumC(conf, c => c.scarto);
  const oreOp = {}, act = {};
  conf.forEach(c => { c.ore.forEach(x => { oreOp[x.opId] = (oreOp[x.opId] || 0) + x.ore; }); c.centri.forEach(x => { const a = act[x.centroCostoId] || (act[x.centroCostoId] = {p:0, g:0, ore:0}); a.p += c2(x.p); a.g += c2(x.g); a.ore += x.ore; }); });
  const debiti = sumC(Object.values(comp), c => c.cent) + sumC(Object.values(act), a => a.p + a.g);
  return {comp, entrati, grCent, buoni, scarto, confermato:buoni + scarto, oreOp, act, conf, debiti, saldo: debiti - grCent};
}
// Ordine completato alla data (DLV o TECO): da qui in poi niente WIP, si liquidano le varianze
function completato(o, finoData){
  const r = riepilogo(o, finoData);
  if(o.teco && (!finoData || o.teco.data <= finoData)) return true;
  if(r.entrati >= o.qty) return true;
  return docsOrdine(o, ['101']).some(d => d.consegnaCompletata && !d.stornatoDa && (!finoData || d.data <= finoData));
}
function statoOrdine(o){
  if(o.liquidazione) return 'CLSD';
  const r = riepilogo(o), s = [];
  if(o.teco) s.push('TECO'); else s.push('REL');
  if(r.confermato > 0) s.push(r.confermato >= o.qty || o.confermaFinale ? 'CNF' : 'PCNF');
  if(r.entrati > 0) s.push(completato(o) && !o.teco ? 'DLV' : 'PDLV');
  if(o.wipSettled) s.push('WIP');
  return s.join(' ');
}
function badgeOrd(o){ const s = statoOrdine(o); return bd(s === 'CLSD' ? 'n' : s.startsWith('TECO') ? 'b' : s.includes('DLV') ? 'g' : s.includes('CNF') ? 'o' : 'b', s); }
// Varianze per categoria (KKS2), alla data: quantità e prezzo dei componenti, efficienza e prezzo attività, scarto, residuo
function varianze(o, finoData){
  const r = riepilogo(o, finoData), Qb = r.entrati, Qs = r.scarto, Ql = Qb + Qs;
  const comps = o.std.componenti.map(c => {
    const a = r.comp[c.mat] || {qty:0, cent:0};
    const planQ = c.qtyPz * Ql, varQta = valComp(c, planQ) - valComp(c, a.qty), varPrezzo = valComp(c, a.qty) - a.cent, varScarto = -valComp(c, c.qtyPz * Qs);
    return {mat:c.mat, um:c.um, planQ, actQ:a.qty, actCent:a.cent, stdCent:valComp(c, c.qtyPz * Qb), varQta, varPrezzo, varScarto};
  });
  const centri = centriOrdine(o).map(id => {
    const ops = o.std.operazioni.filter(op => String(op.centroCostoId) === String(id));
    const a = r.act[id] || {p:0, g:0, ore:0};
    const oreStd = sumC(ops, op => op.oreStdPezzo) * Ql, oreReali = sumC(ops, op => r.oreOp[op.opId] || 0);
    const stdL = sumC(ops, op => c2(op.costoPersonalePezzo * Ql) + c2(op.costoGeneraliPezzo * Ql));
    const stdS = sumC(ops, op => c2(op.costoPersonalePezzo * Qs) + c2(op.costoGeneraliPezzo * Qs));
    // ore reali valorizzate alle tariffe dell'ordine, conferma per conferma (come sono state addebitate): la differenza con l'addebito è solo «prezzo attività»
    const tpO = ops.length ? ops[0].tariffaPersonale : 0, tgO = ops.length ? ops[0].tariffaGenerali : 0;
    const aStd = sumC(r.conf, cf => sumC(cf.centri.filter(x => String(x.centroCostoId) === String(id)), x => c2((x.ore || 0) * tpO) + c2((x.ore || 0) * tgO)));
    return {centroCostoId:id, centroNome:nomeCentroCosto(id) || String(id), oreStd, oreReali, stdP:sumC(ops, op => c2(op.costoPersonalePezzo * Qb)), stdG:sumC(ops, op => c2(op.costoGeneraliPezzo * Qb)),
      scartoStd:stdS, assP:a.p, assG:a.g, varEff: stdL - aStd, varPrezzo: aStd - a.p - a.g, varScarto: -stdS};
  });
  const V = sumC(comps, c => c.varQta + c.varPrezzo + c.varScarto) + sumC(centri, c => c.varEff + c.varPrezzo + c.varScarto);
  const residuo = -r.saldo - V;   // arrotondamenti fra lotti e componenti: 0 nei casi normali
  return {r, Qb, Qs, comps, centri, residuo, totale: V + residuo};
}
function righeVarianze(v){
  const righe = [], vr = (conto, cent, centro, nota) => { if(cent) righe.push(riga(conto, cent > 0 ? 'AVERE' : 'DARE', cent, centro, nota)); };
  v.comps.forEach(c => { const n = c.mat === 'FERRO' ? 'ferro' : 'semilavorato'; vr('60', c.varQta, '', 'quantità ' + n); vr('60', c.varPrezzo, '', 'prezzo ' + n); vr('64', c.varScarto, '', 'scarto — ' + n); });
  v.centri.forEach(c => { vr('61', c.varEff, c.centroCostoId, 'efficienza'); vr('61', c.varPrezzo, c.centroCostoId, 'prezzo attività'); vr('64', c.varScarto, c.centroCostoId, 'scarto — lavorazione'); });
  vr('60', v.residuo, '', 'residuo / arrotondamento');
  const tot = v.totale;   // + favorevole: il saldo dell'ordine (Dare) si chiude contro l'output 73
  if(tot) righe.push(riga('73', tot > 0 ? 'DARE' : 'AVERE', tot, '', 'contropartita liquidazione'));
  return righe;
}
function wipOrdiniAperti(){ return sumC(P().ordini.filter(o => !o.liquidazione), o => o.wipSettled || 0); }
function saldoConto(c){ return sumC(STATO.registrazioni, g => sumC(g.righe || [], x => x.conto === c ? (x.dareAvere === 'DARE' ? c2(x.importo) : -c2(x.importo)) : 0)); }
function ultimoPeriodo(){ const p = P().periodi.filter(x => !x.annullato); return p.length ? p[p.length - 1] : null; }
function periodoAperto(data){ const u = ultimoPeriodo(); return !u || data > u.fine; }

// ───────────────────────── scritture ─────────────────────────
const riga = (conto, da, cent, centro, nota) => Object.assign({conto, dareAvere:da, importo:e2(Math.abs(cent)), centroCostoId:centro || '', centroRicavoId:''}, nota ? {nota} : {});
function scrivi(tipo, data, descrizione, righe, extra){
  if(tipo==='PP_CO11N'&&window.BudgetPool)righe=BudgetPool.convert(righe,data);
  if(window.FI) FI.dateCheck(data);
  const rr = righe.filter(x => x.importo > 0);
  const d = sumC(rr.filter(x => x.dareAvere === 'DARE'), x => c2(x.importo)), a = sumC(rr.filter(x => x.dareAvere === 'AVERE'), x => c2(x.importo));
  if(d !== a) throw new Error(`Scrittura non quadrata (Dare ${euro(e2(d))} ≠ Avere ${euro(e2(a))}): nessuna registrazione.`);
  if(!rr.length) return null;
  const g = Object.assign({id:STATO.prossimoIdRegistrazione++, data, descrizione, tipo, righe:rr}, extra || {});
  if(g.originePP) g.originePP.versione = 2;
  STATO.registrazioni.push(g); return g;
}
function storna(g, motivo, data){
  const s = scrivi('PP_STORNO', data || g.data, `Storno ${g.descrizione} — ${motivo}`, g.righe.map(x => Object.assign({}, x, {dareAvere: x.dareAvere === 'DARE' ? 'AVERE' : 'DARE'})), {originePP:Object.assign({}, g.originePP, {storno:g.id})});
  g.annullataDa = s ? s.id : true; return s;
}
function doppio(k){ const t = Date.now(); if(ui.ultima && ui.ultima.k === k && t - ui.ultima.t < 2500) return true; ui.ultima = {k, t}; return false; }
const ok = (scr, h, p) => { ui.msg[scr] = al('ok', h, p); if(typeof mostraToast === 'function') mostraToast('✅ ' + h); render(); };
const ko = (scr, h, p) => { ui.msg[scr] = al('ko', h, p); ui.keep = true; ui.keepScr = ui.s; render(); };
const salva = () => {aggiornaVersioneDistinta();localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(STATO));};

// ───────────────────────── azioni ─────────────────────────
function checkMov(o, data, scr){
  if(!o){ ko(scr, 'Ordine mancante', 'Seleziona un ordine di produzione.'); return false; }
  if(o.schemaFasi===3&&catene().some(k=>k.id===o.catenaId&&k.annullata)){ko(scr,'Catena annullata','Il suo fabbisogno è stato liberato. Consulta lo storico, ma non registrare nuova produzione su questa catena.');return false;}
  if(o.liquidazione){ ko(scr, '⛔ Ordine liquidato (CLSD)', 'Nessun movimento su un ordine già liquidato a fine periodo.'); return false; }
  if(o.teco){ ko(scr, '⛔ Ordine chiuso tecnicamente (TECO)', 'Annulla il TECO per registrare altri movimenti.'); return false; }
  if(!data){ ko(scr, 'Data mancante', 'Imposta la data del movimento.'); return false; }
  if(data < o.data){ ko(scr, '⛔ Data non valida', `Il movimento non può precedere il rilascio dell'ordine (${fd(o.data)}).`); return false; }
  if(!periodoAperto(data)){ ko(scr, '⛔ Periodo chiuso', `Il periodo fino al ${fd(ultimoPeriodo().fine)} è già stato chiuso (WIP e varianze liquidati): registra il movimento in un periodo aperto.`); return false; }
  return true;
}
function creaUno(tipo, com, q, data, fine, padre){
  const st = struttura(), std = tipo === 'SL' ? st.sl : tipo === 'PIEGA' ? st.piega : st.pf;
  std.versione = st.versione; std.dataVersione = st.dataVersione; std.duelivelli = st.duelivelli;
  const o = {schemaFasi:3, fase:tipo, id:String(P().cnt++), materiale:std.materiale, commessaId:String(com.id), qty:q, data, dataFine:fine, creatoIl:new Date().toISOString(), std:congelaProfondo(std),
    conferme:[], teco:null, liquidazione:null, wipSettled:0, wipStorico:[], confermaFinale:false, padre:padre || null};
  // Prenotazioni dei componenti (RESB): è ciò che leggerà il WMS per la fornitura alla produzione
  const primoCentro = (std.operazioni[0] || {}).centroCostoId;
  o.prenotazioni = std.componenti.map((c, i) => ({resb:'R' + o.id, pos:(i + 1) * 10, mat:c.mat, um:c.um, lgort:c.lgort, psa:psaDi(primoCentro), fabbisogno:c.qtyPz * q, wms:{attivo:false, stato:'prelievo diretto dal magazzino (WMS non attivo)'}}));
  P().ordini.push(o); return o;
}
const A = {
  vai(s){ if(s !== ui.s) ui.msg = {}; ui.s = SCR[s] ? s : 'home'; render(); },
  tcode(c){ const k = TCODES[String(c || '').trim().toUpperCase()]; if(!k){ ui.msg[ui.s] = al('wa', 'Transazione sconosciuta', 'Prova: CO01, COOIS, CO03, MB1A (261), CO11N, MB31 (101), CO88 (chiusura periodo), MB51, MB52, CK11N, CS03, CA03.'); render(); return; } A.vai(k); },
  sel(id){ ui.sel = id; render(); },
  apri(id, s){ ui.sel = id; A.vai(s || 'co03'); },
  impostazioni(){ if(typeof cambiaVista === 'function') cambiaVista('impostazioni'); },

  // CO01 — crea e rilascia (transenna, con ordine del semilavorato collegato; oppure solo semilavorato)
  creaOrdine(){
    const com=commessa(val('co-com')),q=numeroIt(val('co-qty')),data=val('co-data'),fine=val('co-fine')||data,tipo=val('co-mat')||'SL';
    if(!com||com.stato==='chiusa')return ko('co01','Commessa mancante o chiusa','Crea / seleziona una commessa aperta per la carenza cliente.');
    if(!(q>0)||!Number.isInteger(q))return ko('co01','Quantità non valida','Indica pezzi interi positivi.');
    if(!['SL','PIEGA','PF'].includes(tipo))return ko('co01','Fase non valida','Scegli Taglio, Piegatura o Saldatura.');
    if(!data||fine<data)return ko('co01','Date non valide','La fine non può precedere l’inizio.');
    if(!periodoAperto(data))return ko('co01','Periodo chiuso','Scegli una data in un periodo aperto.');
    try{FI.dateCheck(data);}catch(e){return ko('co01','Data bloccata',esc(e.message));}
    const v=validaCiclo(),st=struttura();
    if(v.errori.length||!st.sl.operazioni.length||!st.piega.operazioni.length||!st.pf.operazioni.length)return ko('co01','Ciclo non valido','Configura Taglio → Piegatura → Saldatura in Impostazioni. '+esc(v.errori.join(' · ')));
    const err=controllaNuovaFase(tipo,com,q,data);if(err)return ko('co01','⛔ Sequenza / fabbisogno',esc(err));
    if(doppio(`co01|${tipo}|${com.id}|${q}|${data}`))return;
    const backup=structuredClone(STATO);
    try{
      aggiornaVersioneDistinta();P().catene||=[];
      let k=catenaAttiva(com);if(!k){const piano=pianoPrimaFase(tipo,com,q,data);k={id:'CAT-'+P().cnt,commessaId:String(com.id),qty:piano.qty,scorte:piano.scorte,data,ordineIniziale:null};P().catene.push(k);}
      const o=creaUno(tipo,com,q,data,fine);o.catenaId=k.id;k.ordineIniziale||=o.id;
      const precedente=ordCatena(k).filter(x=>x.id!==o.id&&x.materiale===(tipo==='PIEGA'?'SL-TAGLIO':'SL-PIEGA')).at(-1);
      if(precedente){o.precedente=precedente.id;precedente.successivo=o.id;}
      ui.sel=o.id;localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(STATO));
      ok('co01','Ordine creato e rilasciato (REL)',`Ordine ${o.id} · ${o.materiale} · ${n0(q)} pz · catena ${k.id}. È un ordine distinto, non una tripletta automatica. Ora 261 → CO11N → 101 su questo ordine; poi crea manualmente la fase successiva dalla guida.`);
    }catch(e){STATO=backup;ui.ultima=null;return ko('co01','Salvataggio non riuscito',esc(e.message)+' — nessuna modifica mantenuta.');}
  },
  eliminaOrdine(id){
    const o = ordine(id); if(!o) return;
    if(docsOrdine(o).length || o.conferme.length || o.wipStorico.length || o.liquidazione) return ko('co03', '⛔ Non eliminabile', 'L\'ordine ha già movimenti: chiudilo con TECO e liquidalo a fine periodo.');
    if(!confirm(`Eliminare l'ordine di produzione ${id}, che non ha movimenti?`)) return;
    P().ordini = P().ordini.filter(x => x.id !== id); catene().forEach(k=>{if(!ordCatena(k).length)k.annullata=true;}); P().ordini.forEach(x => { if(x.ordineSL === id) x.ordineSL = null; }); ui.sel = ''; salva(); ok('coois', `Ordine ${id} eliminato`, 'Non aveva movimenti né scritture.');
  },

  // 261 — prelievo del componente all'ordine (ferro o semilavorato)
  prelievo(){
    const o = ordine(val('mb-ord')), data = val('mb-data'); if(!checkMov(o, data, 'mb261')) return;
    const pos = o.prenotazioni.find(p => String(p.pos) === val('mb-pos')) || o.prenotazioni[0];
    const c = o.std.componenti.find(x => x.mat === pos.mat), qty = numeroIt(val('mb-qty'));
    if(!(qty > 0) || (c.um === 'pz' && !Number.isInteger(qty))) return ko('mb261', 'Quantità non valida', c.um === 'kg' ? 'Scrivi i kg prelevati (es. 29.600).' : 'Scrivi i pezzi prelevati come numero intero.');
    const disp = giac(pos.mat, pos.lgort);
    if(o.schemaFasi===3&&qty>libero(pos.mat,data,o.catenaId,o.id)+1e-9)return ko('mb261','⛔ Materiale impegnato / non ancora disponibile','La giacenza libera alla data non basta: altre prenotazioni o catene riservano il materiale. Non prelevare scorte della fase precedente destinate a un’altra catena.');
    if(qty > disp + 1e-9) return ko('mb261', `⛔ Giacenza ${esc(pos.mat)} insufficiente`, `Richiesti ${nq(qty, c.um)}, nel magazzino ${pos.lgort} ci sono ${nq(disp, c.um)}. ${pos.mat === 'FERRO' ? 'Registra prima l\'entrata merci del ferro (MIGO in SD/MM).' : 'Produci prima il semilavorato (ordine SL-TAGLIO → 101).'} Nessun prelievo oltre la giacenza.`);
    const dispData = SDMM.documentiMateriale().filter(d => d.mat === pos.mat && d.lgort === pos.lgort && (d.data || '') <= data).reduce((t, d) => t + d.segno * (d.qty || 0), 0);
    if(qty > dispData + 1e-9) return ko('mb261', `⛔ Al ${fd(data)} il ${esc(pos.mat)} non è ancora a magazzino`, `Alla data del prelievo nel magazzino ${pos.lgort} risultano ${nq(dispData, c.um)}, ne servono ${nq(qty, c.um)}: oggi ce ne sono ${nq(disp, c.um)} perché ${pos.mat === 'FERRO' ? 'l\'entrata merci (MIGO) ha una data successiva' : 'l\'entrata del semilavorato (101) ha una data successiva'}. Non si può consumare materiale prima che arrivi: controlla la data del prelievo o quella dell'entrata merci.`);
    if(doppio(`261|${o.id}|${pos.mat}|${qty}|${data}`)) return;
    let cent, lotti = null;
    if(pos.mat === 'FERRO') cent = c2(qty * STATO.distintaBase.costoFerro);   // prezzo standard corrente del materiale (controllo prezzo S)
    else{ const p = prelevaSL(qty,pos.mat,data); if(p.mancano > 0) return ko('mb261', '⛔ Lotti di semilavorato insufficienti', 'Giacenza valorizzata del semilavorato insufficiente.'); cent = p.cent; lotti = p.prelievi; }
    const conto = pos.mat === 'FERRO' ? '70' : '71', contoMag = pos.mat === 'FERRO' ? '12' : matByCod(pos.mat).conto;
    const magRighe=pos.mat==='FERRO'?[riga('12','AVERE',cent)]:Civilistico.magLines(lotti,'AVERE');
    try{
      const g = scrivi('PP_261', data, `Prelievo ${pos.mat} all'ordine ${o.id} — ${nq(qty, c.um)} (mov. 261, prenotazione ${pos.resb}/${pos.pos})`, [riga(conto, 'DARE', cent), ...magRighe],
        {originePP:{ordine:o.id, mov:'261'}, dettaglioPP:{ordine:o.id, commessaId:o.commessaId, mat:pos.mat, qty}});
      nuovoDoc({bwart:'261', data, mat:pos.mat, um:c.um, lgort:pos.lgort, qty, cent, rif:{ordine:o.id, resb:pos.resb, pos:pos.pos, psa:pos.psa}, regId:g ? g.id : null, lotti, testo:`Prelievo all'ordine ${o.id}`});
    }catch(e){ return ko('mb261', '⛔ Registrazione annullata', esc(e.message)); }
    salva(); ok('mb261', `Prelievo registrato: ${nq(qty, c.um)} di ${pos.mat} all'ordine ${o.id}`, `Documento materiale 261 dal magazzino ${pos.lgort}. Dare ${conto} Consumi / Avere ${contoMag}: ${euro(e2(cent))}. Il costo resta sull'ordine: a bilancio va come WIP solo a fine periodo.`);
  },

  // CO11N — conferma: quantità e addebito delle attività dei centri all'ordine
  conferma(){
    const o = ordine(val('cn-ord')), c = o ? leggiConferma(o) : null;
    if(!o) return ko('co11n', 'Ordine mancante', 'Seleziona un ordine.');
    if(c.errore) return ko('co11n', 'Dati non validi', c.errore);
    if(!checkMov(o, c.data, 'co11n')) return;
    if(o.schemaFasi===3){const r=riepilogo(o,c.data),all=riepilogo(o);const target=all.confermato+c.buoni+c.scarto;
      const k=catene().find(x=>x.id===o.catenaId);if(k){const buoni=sumC(ordCatena(k).filter(x=>x.materiale===o.materiale),x=>riepilogo(x).buoni)+(k.scorte?.[o.materiale]||0);if(buoni+c.buoni>targetFase(k,o.materiale))return ko('co11n','⛔ Quantità non più necessaria','La domanda cliente è stata ridotta o la fase è già coperta. Non confermare nuovi pezzi oltre il fabbisogno; puoi rilevare le ore già lavorate senza aggiungere pezzi.');}
      if(o.std.componenti.some(x=>(r.comp[x.mat]?.qty||0)+1e-9<x.qtyPz*target))return ko('co11n','⛔ Prima il prelievo 261','I componenti necessari devono essere prelevati su questo ordine entro la data della conferma. Non è consentito saltare una fase.');} 
    const manca = poolMancanti(c);
    if(manca.length) return ko('co11n', '⛔ Pool dei centri insufficienti', manca.join(' · ') + '. Controlla Ragioneria FI → Disponibilità dei costi per commesse. Le paghe si caricano solo in HR; i generali sul 52 restano separati.');
    if(doppio(`co11n|${o.id}|${JSON.stringify(c.ore)}|${c.buoni}|${c.scarto}|${c.data}`)) return;
    const righe = [riga('72', 'DARE', c.tot)];
    c.centri.forEach(x => { righe.push(riga('51', 'AVERE', x.p, x.centroCostoId)); righe.push(riga('52', 'AVERE', x.g, x.centroCostoId)); });
    let g = null;
    try{
      if(c.tot > 0) g = scrivi('PP_CO11N', c.data, `Conferma ordine ${o.id} (${o.materiale}) — ${n0(c.buoni)} pz buoni${c.scarto ? ', ' + n0(c.scarto) + ' pz scarto' : ''} — ${c.ore.filter(x => x.ore > 0).map(x => x.opId + ' ' + n2(x.ore) + ' h').join(', ')} (CO11N)`, righe,
        {originePP:{ordine:o.id, mov:'CO11N'}, dettaglioPP:{ordine:o.id, commessaId:o.commessaId, buoni:c.buoni, scarto:c.scarto, ore:c.ore}});
    }catch(e){ return ko('co11n', '⛔ Registrazione annullata', esc(e.message)); }
    o.conferme.push({id:'CNF-' + (o.conferme.length + 1), data:c.data, buoni:c.buoni, scarto:c.scarto, finale:c.finale, ore:c.ore, centri:c.centri.map(x => ({centroCostoId:x.centroCostoId, p:e2(x.p), g:e2(x.g), ore:x.ore})), regId:g ? g.id : null});
    if(c.finale) o.confermaFinale = true;
    salva(); ok('co11n', `Conferma registrata sull'ordine ${o.id}`, `${n0(c.buoni)} pz buoni${c.scarto ? ', ' + n0(c.scarto) + ' pz scarto' : ''}. ${g ? `Addebito attività all'ordine: Dare 72 ${euro(e2(c.tot))} / Avere ${window.BudgetPool&&BudgetPool.find(c.data.slice(0,7))?'75 attività interne':'51 e 52'} per centro (pool distinti personale/generali).` : 'Solo quantità, nessuna scrittura.'}`);
  },
  caricaCosti(){
    const o = ordine(val('cn-ord')); if(!o) return;
    const c = leggiConferma(o); if(c.errore) return ko('co11n', 'Dati non validi', c.errore);
    const righe = []; c.centri.forEach(x => { righe.push(riga('51', 'AVERE', x.p, x.centroCostoId)); righe.push(riga('52', 'AVERE', x.g, x.centroCostoId)); });
    const p = pianoCaricoMancante(righe.filter(x => x.importo > 0), c.data);
    if(p.errore) return ko('co11n', '⛔ Caricamento non possibile', esc(p.errore));
    if(p.gia){ ui.msg.co11n = al('in', 'Pool già sufficienti', 'I costi caricati coprono già questa conferma.'); ui.keep = true; ui.keepScr = ui.s; render(); return; }
    const nomi = p.mesi.map(m => m.periodo.split('-').reverse().join('/')).join(', ');
    if(!confirm(`Registrare ${p.mesi.length} caricamenti mensili dei costi dei centri (${nomi})?\nValori standard del Budget, solo mesi già maturati.`)) return;
    p.mesi.forEach(m => STATO.registrazioni.push({id:STATO.prossimoIdRegistrazione++, data:m.data, descrizione:`Caricamento costi centri ${m.periodo} (automatico)`, tipo:'CARICAMENTO_CENTRI', righe:m.righe, dettaglioCaricamentoCentri:{periodo:m.periodo}}));
    salva(); ui.msg.co11n = al('ok', `Caricati ${p.mesi.length} mesi di costi dei centri`, `${nomi}. Ora puoi confermare.`); ui.keep = true; ui.keepScr = ui.s; render();
  },

  // 101 — entrata merci da ordine (semilavorato → 0020, transenna → 0001)
  entrata(){
    const o = ordine(val('gr-ord')), data = val('gr-data'); if(!checkMov(o, data, 'mb101')) return;
    const q = numeroIt(val('gr-qty')), completa = !!($('gr-fin') && $('gr-fin').checked), r = riepilogo(o);
    if(!(q > 0) || !Number.isInteger(q)) return ko('mb101', 'Quantità non valida', 'Scrivi i pezzi buoni come numero intero.');
    const max = (o.schemaFasi===3?riepilogo(o,data).buoni:r.buoni) - r.entrati;
    if(q > max) return ko('mb101', '⛔ Quantità oltre i pezzi buoni confermati', `Confermati buoni ${n0(r.buoni)} pz, già entrati ${n0(r.entrati)}: puoi caricare al massimo ${n0(max)} pz. Lo scarto non entra a magazzino.`);
    if(doppio(`101|${o.id}|${q}|${data}`)) return;
    const prima = stdCent(o, r.entrati), dopo = stdCent(o, r.entrati + q), cent = dopo.tot - prima.tot, com = commessa(o.commessaId) || {};
    const pf = o.materiale === 'TRANSENNA', m = matByCod(o.materiale);
    let g;
    try{
      if(pf){
        const s = o.std;
        const snap = {schema:4, legacy:false, pp:true, ordinePP:o.id, chiave:`PP101-${o.id}-${Date.now().toString(36)}`, dataCalcolo:new Date().toISOString(), dataProduzione:data, commessaId:o.commessaId,
          versioneDistinta:s.versione, dataVersioneDistinta:s.dataVersione, quantita:q, componenti:s.componenti.map((c, i) => ({mat:c.mat, qtyPz:c.qtyPz, cent:e2(dopo.comps[i].cent - prima.comps[i].cent)})),
          materiale:{kgStdPezzo:0, prezzoStdKg:0, costoStdPezzo:0, kgStdTot:0, kgReale:0, costoStdTot:0, costoRealeTot:0, varianza:0},
          operazioni:s.operazioni.map((op, i) => Object.assign({}, op, {oreStdTot:op.oreStdPezzo * q, costoStdPersonaleTot:e2(dopo.ops[i].p - prima.ops[i].p), costoStdGeneraliTot:e2(dopo.ops[i].g - prima.ops[i].g)})),
          centri:[], costoUnitario:s.costoUnitario, costoTotale:e2(cent), costoUnitarioLotto:e2(cent) / q, arrotondamento:e2(cent) - s.costoUnitario * q, varianze:{materiale:0, manodopera:0},
          nota:'Entrata merci da ordine di produzione: varianze e WIP si rilevano alla chiusura di periodo (CO88).'};
        g = scrivi('PRODUZIONE', data, `Dichiarazione di produzione – ${q.toLocaleString('it-IT')} pezzi – Produzione/addebito commessa ${com.codice || '—'} — ordine PP ${o.id} (mov. 101)`,
          [riga('13', 'DARE', cent), riga('73', 'AVERE', cent)],
          {originePP:{ordine:o.id, mov:'101'}, dettaglioProduzione:{commessaId:o.commessaId, quantita:q, kgStandard:0, kgReale:0, ore:[], ordinePP:o.id}, snapshotCosto:congelaProfondo(snap)});
      }else{
        g = scrivi('PP_101', data, `Entrata semilavorato ${o.materiale} – ${q.toLocaleString('it-IT')} pezzi – ordine PP ${o.id} (mov. 101)`, [riga(m.conto, 'DARE', cent), riga('73', 'AVERE', cent)],
          {originePP:{ordine:o.id, mov:'101'}, dettaglioPP:{ordine:o.id, commessaId:o.commessaId, mat:o.materiale, qty:q}});
      }
      nuovoDoc({bwart:'101', data, mat:m.cod, um:'pz', lgort:m.lgort, qty:q, cent, rif:{ordine:o.id}, regId:g ? g.id : null, consegnaCompletata:completa, testo:`Entrata da ordine ${o.id}`, wms:{daStoccare:true, stato:'in giacenza IM (WMS non attivo)'}});
    }catch(e){ return ko('mb101', '⛔ Registrazione annullata', esc(e.message)); }
    const atp = (pf && window.SDMM && SDMM.ricalcolaATP) ? SDMM.ricalcolaATP(`entrata merci ordine di produzione ${o.id}`) : [];
    salva(); ok('mb101', `Entrata merci: +${n0(q)} ${m.cod} nel magazzino ${m.lgort}`, `Dare ${m.conto} / Avere 73 Output di produzione ${euro(e2(cent))} al costo standard congelato.${completa ? ' Consegna completata: l\'ordine si liquida alla prossima chiusura di periodo.' : ''}${atp.length ? ' ATP ordini SD aggiornata: ' + esc(atp.join(' · ')) : ''}`);
  },

  teco(id){
    const o = ordine(id); if(!o || o.liquidazione) return;
    const d = val('te-data') || oggi();
    if(!periodoAperto(d)) return ko('co03', '⛔ Periodo chiuso', `La data del TECO deve cadere dopo l'ultimo periodo chiuso (${fd(ultimoPeriodo().fine)}).`);
    o.teco = {data:d}; salva(); ok('co03', `Ordine ${o.id} chiuso tecnicamente (TECO)`, 'Alla prossima chiusura di periodo (CO88) il WIP dell\'ordine si storna e le varianze vanno a conto economico.');
  },
  annullaTeco(id){ const o = ordine(id); if(!o || !o.teco || o.liquidazione) return; if(o.schemaFasi===3&&catene().some(k=>k.id===o.catenaId&&k.annullata))return ko('co03','Catena annullata','Non riaprire gli ordini di una catena che ha liberato la domanda. Crea un nuovo percorso per una nuova carenza.'); o.teco = null; salva(); ok('co03', `TECO annullato sull'ordine ${o.id}`, 'L\'ordine torna in lavorazione.'); },

  // CO88 — chiusura di periodo: calcolo WIP (KKAX), varianze (KKS2) e liquidazione
  chiudiPeriodo(){
    const per = val('cp-per'); if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(per)) return ko('co88', 'Periodo mancante', 'Scegli il mese da chiudere.');
    const fine = fineMese(per), u = ultimoPeriodo();
    if(u && per <= u.periodo) return ko('co88', '⛔ Periodo già chiuso', `L'ultimo periodo chiuso è ${u.periodo}: si chiude un mese alla volta, in ordine.`);
    if(doppio('co88|' + per)) return;
    const piano = pianoChiusura(per);
    const backupChiusura=structuredClone(STATO);
    try{FI.dateCheck(fine);}catch(e){return ko('co88','⛔ Chiusura bloccata',esc(e.message));}
    const run = {periodo:per, fine, eseguitoIl:new Date().toISOString(), regs:[], prima:{}};
    try{
      piano.forEach(x => {
        const o = ordine(x.id); run.prima[o.id] = {wipSettled:o.wipSettled || 0, liquidazione:o.liquidazione || null, wipStorico:(o.wipStorico || []).length};
        if(x.wipDelta){
          const g = scrivi('PP_WIP', fine, `WIP ordine ${o.id} al ${fd(fine)} — ${x.completo ? 'storno del WIP (ordine completato)' : 'calcolo WIP (KKAX)'} (CO88 ${per})`,
            x.wipDelta > 0 ? [riga('15', 'DARE', x.wipDelta), riga('74', 'AVERE', x.wipDelta)] : [riga('74', 'DARE', -x.wipDelta), riga('15', 'AVERE', -x.wipDelta)],
            {originePP:{ordine:o.id, mov:'WIP', periodo:per}, dettaglioWIP:{ordine:o.id, commessaId:o.commessaId, periodo:per, wip:e2(x.wipNuovo), delta:e2(x.wipDelta)}});
          if(g) run.regs.push(g.id);
        }
        o.wipSettled = x.wipNuovo; o.wipStorico.push({periodo:per, wip:e2(x.wipNuovo)});
        if(x.completo){
          const v = x.v, righe = righeVarianze(v);
          const dett = {ordine:o.id, commessaId:o.commessaId, materiale:o.materiale, periodo:per, qtyBuoni:v.Qb, qtyScarto:v.Qs,
            componenti:v.comps.map(c => ({mat:c.mat, um:c.um, qtyStd:c.planQ, qtyReale:c.actQ, varQta:e2(c.varQta), varPrezzo:e2(c.varPrezzo), varScarto:e2(c.varScarto)})),
            centri:v.centri.map(c => ({centroCostoId:c.centroCostoId, oreStd:c.oreStd, oreReali:c.oreReali, stdP:e2(c.stdP), stdG:e2(c.stdG), scartoStd:e2(c.scartoStd), assP:e2(c.assP), assG:e2(c.assG), varEff:e2(c.varEff), varPrezzo:e2(c.varPrezzo), varScarto:e2(c.varScarto)})),
            residuo:e2(v.residuo), totale:e2(v.totale)};
          const g = scrivi('PP_KO88', fine, `Liquidazione varianze ordine ${o.id} (${o.materiale}) — commessa ${(commessa(o.commessaId) || {}).codice || '—'} (CO88 ${per})`, righe,
            {originePP:{ordine:o.id, mov:'KO88', periodo:per}, dettaglioKO88:dett});
          if(g) run.regs.push(g.id);
          o.liquidazione = {periodo:per, data:fine, regId:g ? g.id : null, dettaglio:dett};
        }
      });
      P().periodi.push(run);localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(STATO));
    }catch(e){STATO=backupChiusura;ui.ultima=null;return ko('co88','⛔ Chiusura non salvata',esc(e.message)+' — nessuna modifica mantenuta.');}
    ok('co88', `Periodo ${per} chiuso`, `${piano.filter(x => !x.completo && x.wipDelta).length} ordini aperti con WIP a bilancio (conto 15), ${piano.filter(x => x.completo).length} ordini liquidati (varianze a conto economico). Movimenti con data fino al ${fd(fine)} ora bloccati.`);
  },
  annullaPeriodo(confermato=false){
    const u = ultimoPeriodo(); if(!u) return ko('co88','Nessuna chiusura attiva','Non c’è un periodo da riaprire.');
    try{
      if(window.Annual && Annual.closed(+u.periodo.slice(0,4))) throw Error('Esercizio FI definitivo: non annullare una chiusura PP inclusa nel bilancio chiuso.');
      FI.dateCheck(u.fine);
      if(!Array.isArray(u.regs)||!u.prima) throw Error('Chiusura incompleta: ripristina un backup verificato, non cancellare le sole righe del giornale.');
      for(const id of u.regs){const g=reg(id);if(!g||g.annullataDa)throw Error('La scrittura di chiusura n° '+id+' è mancante o già stornata.');}
      for(const id of Object.keys(u.prima)){if(!ordine(id))throw Error('Ordine '+id+' mancante: annullamento non eseguibile.');}
    }catch(e){return ko('co88','⛔ Annullamento bloccato',esc(e.message));}
    if(!confermato){
      ui.msg.co88=al('in','Conferma annullamento '+u.periodo,'La procedura storna '+u.regs.length+' scritture di WIP/varianze alla data '+fd(u.fine)+', ripristina gli ordini e riapre il periodo. Non cancella produzione, vendite o paghe. Se avevi già calcolato IRES, ricontrolla la base prima di chiudere FI.')
        + '<button class="btn red" id="pp-confirm-cancel" onclick="PP.annullaPeriodo(true)">Conferma annullamento chiusura</button> <button class="btn" id="pp-reject-cancel" onclick="PP.rifiutaAnnullamento()">Non annullare</button>';
      return render();
    }
    const backup=structuredClone(STATO);
    try{
      ui.ultima=null;
      u.regs.slice().reverse().forEach(id=>storna(reg(id),'annullamento chiusura periodo '+u.periodo,u.fine));
      Object.keys(u.prima).forEach(id=>{const o=ordine(id),p=u.prima[id];o.wipSettled=p.wipSettled;o.liquidazione=p.liquidazione;o.wipStorico=(o.wipStorico||[]).slice(0,p.wipStorico);});
      u.annullato=true;u.annullatoIl=new Date().toISOString();
      localStorage.setItem(CHIAVE_STORAGE,JSON.stringify(STATO));
    }catch(e){STATO=backup;return ko('co88','⛔ Annullamento non salvato',esc(e.message)+' — nessuna modifica mantenuta.');}
    ok('co88','Chiusura del periodo '+u.periodo+' annullata','WIP e varianze stornati, ordini ripristinati; periodo aperto. Per richiuderlo esegui nuovamente CO88.');
  },
  rifiutaAnnullamento(){ui.msg.co88='';render();},

  // Storni (CO13 conferme · MBST documenti materiale 262/102)
  storna(id, tipo, rif){
    const o = ordine(id); if(!o) return;
    ui.s = 'co03'; ui.sel = id; ui.ultima = null;
    if(o.liquidazione) return ko('co03', '⛔ Ordine liquidato', 'L\'ordine è già stato liquidato a fine periodo: annulla prima la chiusura di quel periodo.');
    if(tipo === 'CO11N'){
      const m = o.conferme.find(x => x.id === rif); if(!m || m.annullato) return;
      if(!periodoAperto(m.data)) return ko('co03', '⛔ Periodo chiuso', 'La conferma cade in un periodo già chiuso.');
      const r = riepilogo(o);
      if(r.buoni - m.buoni < r.entrati) return ko('co03', '⛔ Storno non possibile', `Senza questa conferma i pezzi buoni (${n0(r.buoni - m.buoni)}) sarebbero meno di quelli già entrati (${n0(r.entrati)}): storna prima l'entrata merci.`);
      if(!confirm(`Stornare la conferma ${m.id} dell'ordine ${o.id} (CO13)?`)) return;
      const g = m.regId ? reg(m.regId) : null; if(g) storna(g, 'conferma ' + m.id);
      m.annullato = true; o.confermaFinale = o.conferme.some(x => !x.annullato && x.finale);
      salva(); return ok('co03', `Conferma ${m.id} stornata`, 'Scrittura di storno registrata: i pool dei centri tornano disponibili.');
    }
    const d = MM().documenti.find(x => x.doc === rif); if(!d || d.stornatoDa) return;
    if(!periodoAperto(d.data)) return ko('co03', '⛔ Periodo chiuso', 'Il documento cade in un periodo già chiuso.');
    if(d.bwart==='261'&&o.schemaFasi===3){const r=riepilogo(o),c=o.std.componenti.find(x=>x.mat===d.mat);if((r.comp[d.mat]?.qty||0)-d.qty+1e-9<c.qtyPz*r.confermato)return ko('co03','⛔ Storna prima produzione e conferma','Non puoi rendere i componenti già utilizzati dai pezzi confermati: storna 101 e CO11N prima del 261.');}
    if(d.bwart === '101'){
      if(d.mat === 'TRANSENNA'){
        if(STATO.sdmm && (STATO.sdmm.ddt || []).some(x => (x.lotti || []).some(l => String(l.lottoId) === String(d.regId)))) return ko('co03', '⛔ Storno non possibile', 'Questo lotto è già stato consegnato con un DDT.');
        if(SDMM.pfFisico() - d.qty < SDMM.inSpedizione()) return ko('co03', '⛔ Storno non possibile', 'Senza questi pezzi la giacenza non coprirebbe la merce già in spedizione.');
      }else if(MM().documenti.some(x => x.bwart === '261' && !x.stornatoDa && (x.lotti || []).some(l => l.lotto === d.doc))) return ko('co03', '⛔ Storno non possibile', 'Questo lotto di semilavorato è già stato prelevato da un ordine della transenna: storna prima quel prelievo della fase successiva.');
    }
    if(!confirm(`Stornare il documento materiale ${d.doc} (${d.bwart}) con un movimento ${d.bwart === '101' ? '102' : '262'}?`)) return;
    const g = d.regId ? reg(d.regId) : null; if(g) storna(g, `documento materiale ${d.doc}`);
    const s = nuovoDoc({bwart:d.bwart === '101' ? '102' : '262', data:d.data, mat:d.mat, um:d.um, lgort:d.lgort, qty:d.qty, cent:d.cent, rif:Object.assign({}, d.rif), regId:null, stornoDi:d.doc, testo:'Storno ' + d.doc});
    d.stornatoDa = s.doc;
    const atp = (d.mat === 'TRANSENNA' && window.SDMM && SDMM.ricalcolaATP) ? SDMM.ricalcolaATP(`storno entrata merci ordine ${o.id}`) : [];
    salva(); ok('co03', `Documento ${d.doc} stornato con ${s.doc} (${s.bwart})`, `Scrittura di storno registrata.${atp.length ? ' ATP ordini SD aggiornata: ' + esc(atp.join(' · ')) : ''}`);
  },
  prev(scr){ const f = PREV[scr], b = $('pv-' + scr); if(f && b) b.innerHTML = f(); },
};
// Piano della chiusura di periodo per ogni ordine non liquidato con movimenti fino a fine mese
function pianoChiusura(per){
  const fine = fineMese(per);
  return P().ordini.filter(o => !o.liquidazione && o.data <= fine).map(o => {
    const r = riepilogo(o, fine), completo = completato(o, fine);
    const wipNuovo = completo ? 0 : r.saldo, wipDelta = wipNuovo - (o.wipSettled || 0);
    return {id:o.id, o, r, completo, wipNuovo, wipDelta, v: completo ? varianze(o, fine) : null};
  }).filter(x => x.wipDelta || x.completo);
}
function leggiConferma(o){
  const data = val('cn-data'), buoni = numeroIt(val('cn-buoni')), scarto = numeroIt(val('cn-scarto')), finale = !!($('cn-fin') && $('cn-fin').checked);
  if([buoni, scarto].some(x => isNaN(x) || x < 0 || !Number.isInteger(x))) return {errore:'Pezzi buoni e scarto: numeri interi non negativi.'};
  const ore = o.std.operazioni.map(op => ({opId:op.opId, centroCostoId:op.centroCostoId, ore:numeroIt(val('cn-ore-' + op.opId))}));
  if(ore.some(x => isNaN(x.ore) || x.ore < 0)) return {errore:'Ore reali non valide (numero non negativo, es. 925 o 1.480).'};
  if(!buoni && !scarto && !ore.some(x => x.ore > 0)) return {errore:'Inserisci almeno ore o quantità da confermare.'};
  const r = riepilogo(o);
  if(r.confermato + buoni + scarto > o.qty) return {errore:`Buoni + scarto confermati (${n0(r.confermato + buoni + scarto)}) oltre la quantità dell'ordine (${n0(o.qty)} pz).`};
  // tariffe del centro valide alla data (prezzo attività corrente): l'eventuale differenza con l'ordine è «varianza prezzo attività»
  const centri = centriOrdine(o).map(id => {
    const cc = STATO.centriDiCosto.find(x => String(x.id) === String(id)) || {}, tp = tariffaPersonale(cc), tg = tariffaGenerali(cc);
    const h = sumC(o.std.operazioni.map((op, i) => ({op, h:ore[i].ore})).filter(x => String(x.op.centroCostoId) === String(id)), x => x.h);
    return {centroCostoId:id, ore:h, p:c2(h * tp), g:c2(h * tg), tp, tg};
  });
  return {data, buoni, scarto, finale, ore, centri, tot:sumC(centri, x => x.p + x.g)};
}
function poolMancanti(c){
  const out = [];
  c.centri.forEach(x => [['51', x.p, 'personale'], ['52', x.g, 'generali']].forEach(([conto, cent, nome]) => {
    if(cent <= 0) return;
    const disp = saldoMinimoPool(x.centroCostoId, conto, c.data);
    if(e2(cent) > disp + 0.005) out.push(esc(spiegaPoolInsufficiente(x.centroCostoId,conto,c.data,e2(cent))));
  }));
  return out;
}

// ───────────────────────── PIANIFICAZIONE: MRP (MD01), lista fabbisogni (MD04), capacità (CM01) ─────────────────────────
function M(){
  if(!P().mrp) P().mrp = {param:{ggSL:2, ggPIEGA:2, ggPF:3, ggAcq:15, scorta:{'FERRO':0, 'SL-TAGLIO':0, 'SL-PIEGA':0, 'TRANSENNA':0}, lottoMinFerro:0, usaBudget:false, anno:oggi().slice(0, 4)}, pianificati:[], richieste:[], esecuzioni:[], cnt:1};
  return P().mrp;
}
const addGg = (d, n) => { const x = new Date((d || oggi()) + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const apertoPP = o => !o.liquidazione && !o.teco;
function residuoOrdine(o){ const r = riepilogo(o); return Math.max(0, o.qty - r.entrati - r.scarto); }
// Fabbisogni pianificati dal budget (MD61), consumati dagli ordini di vendita dello stesso mese (strategia 40)
function pirMensili(){
  const m = M(), b = STATO.budgetAnnuo || {}, vol = b.volumeAnnuoPianificato || 0, pesi = b.pesiMensili || Array(12).fill(100 / 12), anno = m.param.anno;
  if(!m.param.usaBudget || !(vol > 0)) return [];
  const ov = SDMM.fabbisogniVendita();
  return pesi.map((p, i) => {
    const per = `${anno}-${String(i + 1).padStart(2, '0')}`, pir = Math.round(vol * p / 100), cons = sumC(ov.filter(v => (v.data || '').slice(0, 7) === per), v => v.qty);
    return {periodo:per, data:fineMese(per), pir, residuo:Math.max(0, pir - cons)};
  }).filter(x => x.residuo > 0 && x.data >= oggi());
}
// Elementi della lista fabbisogni/disponibilità di un materiale (MD04)
function elementi(cod){
  const m = M(), st = struttura(), out = [];
  out.push({data:'', qty:giac(cod), tipo:'Giacenza', testo:'Giacenza stabilimento 1000 (MB52)'});
  const pl = m.pianificati.filter(x => x.stato === 'aperto');
  if(cod === 'TRANSENNA'){
    SDMM.fabbisogniVendita().forEach(v => out.push({data:v.data, qty:-v.qty, tipo:'Ord. vendita', testo:`${v.id} — ${esc(v.cliente)}${v.bloccato ? ' (blocco credito)' : ''}`, commessaId:v.commessaId}));
    pirMensili().forEach(x => out.push({data:x.data, qty:-x.residuo, tipo:'Fabb. pianificato', testo:`PIR ${x.periodo} (budget ${n0(x.pir)} − ordini del mese)`, commessaId:''}));
  }
  P().ordini.filter(o => apertoPP(o) && o.materiale === cod).forEach(o => { const q = residuoOrdine(o); if(q > 0) out.push({data:o.dataFine, qty:q, tipo:'Ord. produzione', testo:`${o.id} (${statoOrdine(o)})`}); });
  pl.filter(x => x.mat === cod).forEach(x => out.push({data:x.dataFine, qty:x.qty, tipo:'Ord. pianificato', testo:`${x.id}${x.eccezione ? ' ⚠ ' + x.eccezione : ''}`, commessaId:x.commessaId}));
  // fabbisogni dipendenti: prenotazioni degli ordini di produzione aperti e componenti degli ordini pianificati
  P().ordini.filter(apertoPP).forEach(o => o.prenotazioni.filter(p => p.mat === cod).forEach(p => { const a = (riepilogo(o).comp[p.mat] || {qty:0}).qty, q = Math.max(0, p.fabbisogno - a);
    if(q > 1e-9) out.push({data:o.data, qty:-q, tipo:'Prenotazione', testo:`${p.resb}/${p.pos} ordine ${o.id}`, commessaId:o.commessaId}); }));
  pl.forEach(x => { const std = stdMateriale(st,x.mat); if(!std) return; std.componenti.filter(c => c.mat === cod).forEach(c => out.push({data:x.dataInizio, qty:-c.qtyPz * x.qty, tipo:'Fabb. dipendente', testo:`da ${x.id}`, commessaId:x.commessaId})); });
  if(cod === 'FERRO'){
    SDMM.poAperti().forEach(p => out.push({data:p.data, qty:p.qty, tipo:'Ord. acquisto', testo:`${p.id} — ${esc(p.fornitore)}`}));
    m.richieste.filter(x => x.stato === 'aperta').forEach(x => out.push({data:x.dataFabbisogno, qty:x.qty, tipo:'Rich. acquisto', testo:x.id + (x.eccezione ? ' ⚠ ' + x.eccezione : ''), commessaId:x.commessaId}));
  }
  return out.sort((a, b) => (a.data || '').localeCompare(b.data || '') || (b.qty > 0) - (a.qty > 0));
}
function pianificaMateriale(cod, log){
  const m = M(), par = m.param, scorta = par.scorta[cod] || 0, oggiD = oggi();
  let disp = 0;
  elementi(cod).forEach(el => {
    disp += el.qty;
    if(disp < scorta - 1e-9){
      let q = scorta - disp; const dataReq = el.data && el.data > oggiD ? el.data : oggiD;
      if(cod === 'FERRO'){
        q = Math.ceil(q * 100) / 100; if(par.lottoMinFerro > 0) q = Math.max(q, par.lottoMinFerro);
        const rilascio = addGg(dataReq, -par.ggAcq);
        m.richieste.push({id:'RDA' + String(m.cnt++).padStart(5, '0'), mat:cod, qty:q, dataFabbisogno:dataReq, dataRilascio:rilascio, commessaId:el.commessaId || '', origine:el.testo, stato:'aperta',
          eccezione: rilascio < oggiD ? 'rilascio nel passato: anticipare l\'acquisto' : ''});
        log.RdA++;
      }else{
        q = Math.ceil(q);
        const gg = cod === 'SL-TAGLIO' ? par.ggSL : cod==='SL-PIEGA' ? (par.ggPIEGA??2) : par.ggPF, inizio = addGg(dataReq, -gg);
        m.pianificati.push({id:'PLO' + String(m.cnt++).padStart(5, '0'), mat:cod, qty:q, dataFine:dataReq, dataInizio:inizio, commessaId:el.commessaId || '', origine:el.testo, stato:'aperto',
          eccezione: inizio < oggiD ? 'inizio nel passato: anticipare' : ''});
        log[cod === 'SL-TAGLIO' ? 'SL' : cod==='SL-PIEGA'?'PIEGA':'PF']++;
      }
      disp += q;
    }
  });
}
// Carico dei centri per mese (CM01): ore standard degli ordini aperti e pianificati + ore già lavorate, contro la capacità
function caricoCapacita(anno){
  const st = struttura(), centri = STATO.centriDiCosto.filter(c => (STATO.distintaBase.ciclo || []).some(r => String(r.centroCostoId) === String(c.id)));
  const mesi = Array.from({length:12}, (_, i) => `${anno}-${String(i + 1).padStart(2, '0')}`);
  const tab = {}; centri.forEach(c => { tab[c.id] = mesi.map(() => ({ord:0, plo:0, lav:0})); });
  const idx = d => (d || '').slice(0, 4) === anno ? +(d.slice(5, 7)) - 1 : -1;
  P().ordini.forEach(o => {
    o.conferme.filter(c => !c.annullato).forEach(c => c.centri.forEach(x => { const i = idx(c.data); if(i >= 0 && tab[x.centroCostoId]) tab[x.centroCostoId][i].lav += x.ore || 0; }));
    if(!apertoPP(o)) return;
    const r = riepilogo(o), resto = Math.max(0, o.qty - r.confermato), i = idx(o.data);
    if(i >= 0) o.std.operazioni.forEach(op => { if(tab[op.centroCostoId]) tab[op.centroCostoId][i].ord += op.oreStdPezzo * resto; });
  });
  M().pianificati.filter(x => x.stato === 'aperto').forEach(x => { const std = stdMateriale(st,x.mat), i = idx(x.dataInizio); if(std && i >= 0) std.operazioni.forEach(op => { if(tab[op.centroCostoId]) tab[op.centroCostoId][i].plo += op.oreStdPezzo * x.qty; }); });
  return {mesi, centri:centri.map(c => ({c, disp:(c.oreAnnuePreviste || 0) / 12, righe:tab[c.id]}))};
}
Object.assign(A, {
  eseguiMRP(){
    const m = M(), par = m.param;
    par.ggPIEGA=Math.max(0,parseInt(val('mr-gpie'),10)||0); par.scorta['SL-PIEGA']=Math.max(0,numeroIt(val('mr-spie'))||0);
    par.ggSL = Math.max(0, parseInt(val('mr-gsl'), 10) || 0); par.ggPF = Math.max(0, parseInt(val('mr-gpf'), 10) || 0); par.ggAcq = Math.max(0, parseInt(val('mr-gac'), 10) || 0);
    par.scorta['TRANSENNA'] = Math.max(0, numeroIt(val('mr-spf')) || 0); par.scorta['SL-TAGLIO'] = Math.max(0, numeroIt(val('mr-ssl')) || 0); par.scorta['FERRO'] = Math.max(0, numeroIt(val('mr-sfe')) || 0);
    par.lottoMinFerro = Math.max(0, numeroIt(val('mr-lot')) || 0); par.usaBudget = !!($('mr-bud') && $('mr-bud').checked); par.anno = val('mr-anno') || par.anno;
    if(STATO.regolaProduzione==='FABBISOGNO_NETTO_CLIENTI'){par.usaBudget=false;par.scorta['TRANSENNA']=0;par.scorta['SL-TAGLIO']=0;par.scorta['SL-PIEGA']=0;}
    if(doppio('md01|' + JSON.stringify(par))) return;
    // pianificazione rigenerativa: via le proposte aperte, restano quelle già convertite
    m.pianificati = m.pianificati.filter(x => x.stato !== 'aperto'); m.richieste = m.richieste.filter(x => x.stato !== 'aperta');
    const log = {PF:0, SL:0, PIEGA:0, RdA:0}, st = struttura();
    pianificaMateriale('TRANSENNA', log); pianificaMateriale('SL-PIEGA',log); pianificaMateriale('SL-TAGLIO', log); pianificaMateriale('FERRO', log);
    m.esecuzioni.push({data:new Date().toISOString(), log});
    salva(); ok('md01', 'Pianificazione MRP eseguita', `${log.PF} ordini pianificati di TRANSENNA, ${log.PIEGA} di SL-PIEGA, ${log.SL} di SL-TAGLIO, ${log.RdA} richieste d'acquisto di FERRO. Guarda la lista fabbisogni (MD04) e converti le proposte.`);
  },
  convertiPLO(id){
    const m = M(), x = m.pianificati.find(p => p.id === id); if(!x || x.stato !== 'aperto') return;
    const com = commessa(val('plo-com-' + id) || x.commessaId);
    if(!com || com.stato === 'chiusa') return ko('md16', 'Commessa mancante', `Scegli una commessa aperta per l'ordine pianificato ${id}.`);
    const inizio = x.dataInizio < oggi() ? oggi() : x.dataInizio, fine = x.dataFine < inizio ? inizio : x.dataFine;
    if(!periodoAperto(inizio)) return ko('md16', '⛔ Periodo chiuso', `La data di inizio (${fd(inizio)}) cade in un periodo già chiuso.`);
    const v = validaCiclo(); if(v.errori.length) return ko('md16', '⛔ Ciclo non valido', esc(v.errori.join(' · ')));
    const tipo=x.mat==='SL-TAGLIO'?'SL':x.mat==='SL-PIEGA'?'PIEGA':'PF';
    const err=controllaNuovaFase(tipo,com,x.qty,inizio);if(err)return ko('md16','⛔ Conversione sequenziale bloccata',esc(err)+' Usa CO01: stessa commessa, prima 101 della fase precedente.');
    if(doppio('co40|' + id)) return;
    aggiornaVersioneDistinta();
    P().catene||=[];let k=catenaAttiva(com);if(!k){const piano=pianoPrimaFase(tipo,com,x.qty,inizio);k={id:'CAT-'+P().cnt,commessaId:String(com.id),qty:piano.qty,scorte:piano.scorte,data:inizio,ordineIniziale:null};P().catene.push(k);}
    const o = creaUno(tipo, com, x.qty, inizio, fine);o.catenaId=k.id;k.ordineIniziale||=o.id;
    x.stato = 'convertito'; x.ordine = o.id; x.commessaId = String(com.id);
    salva(); ok('md16', `Ordine pianificato ${id} convertito nell'ordine di produzione ${o.id} (CO40)`, `${n0(x.qty)} ${x.mat} · ${fd(inizio)} → ${fd(fine)} · commessa ${esc(com.codice)}. Costo standard congelato, prenotazioni create.`);
  },
  convertiRdA(id){
    const m = M(), x = m.richieste.find(r => r.id === id); if(!x || x.stato !== 'aperta') return;
    const fid = val('rda-f-' + id), prezzo = numeroIt(val('rda-p-' + id));
    if(doppio('me59|' + id)) return;
    try{ const po = SDMM.nuovoPO(fid, x.qty, prezzo, x.dataFabbisogno, id); x.stato = 'convertita'; x.poId = po; salva();
      ok('md16', `Richiesta ${id} convertita nell'ordine d'acquisto ${po} (ME59N)`, `${n2(x.qty)} kg di ferro, consegna ${fd(x.dataFabbisogno)}. Lo trovi in SD/MM → Ordini di acquisto: l'entrata merci si fa con la MIGO.`); }
    catch(e){ return ko('md16', 'Conversione non possibile', esc(e.message)); }
  },
  eliminaProposta(id){
    const m = M(); if(!confirm(`Eliminare la proposta ${id}? Ricomparirà alla prossima pianificazione se il fabbisogno c'è ancora.`)) return;
    m.pianificati = m.pianificati.filter(x => !(x.id === id && x.stato === 'aperto')); m.richieste = m.richieste.filter(x => !(x.id === id && x.stato === 'aperta'));
    salva(); render();
  },
  _md04(v){ ui.md04 = v; render(); },
  _cm01(v){ ui.cm01 = v; render(); },
});

function scrMD01(){
  const m = M(), p = m.param, u = m.esecuzioni[m.esecuzioni.length - 1];
  const bud = STATO.budgetAnnuo || {};
  return msg('md01') + card('🧠', 'Pianificazione del fabbisogno di materiali — tutto lo stabilimento', 'MD01', `<div class="fg">
      <div class="f"><label>Tempo di produzione SL-PIEGA (giorni)</label><input id="mr-gpie" type="number" min="0" value="${p.ggPIEGA??2}"></div>
      <div class="f"><label>Tempo di produzione SL-TAGLIO (giorni)</label><input id="mr-gsl" type="number" min="0" value="${p.ggSL}"></div>
      <div class="f"><label>Tempo di produzione TRANSENNA (giorni)</label><input id="mr-gpf" type="number" min="0" value="${p.ggPF}"></div>
      <div class="f"><label>Tempo di approvvigionamento FERRO (giorni)</label><input id="mr-gac" type="number" min="0" value="${p.ggAcq}"></div>
      <div class="f"><label>Lotto minimo di acquisto ferro (kg)</label><input id="mr-lot" inputmode="decimal" value="${p.lottoMinFerro || 0}"></div>
      <div class="f"><label>Scorta di sicurezza TRANSENNA (pz)</label><input id="mr-spf" inputmode="decimal" value="${p.scorta['TRANSENNA'] || 0}"></div>
      <div class="f"><label>Scorta di sicurezza SL-PIEGA (pz)</label><input id="mr-spie" value="${p.scorta['SL-PIEGA']||0}"></div>
      <div class="f"><label>Scorta di sicurezza SL-TAGLIO (pz)</label><input id="mr-ssl" inputmode="decimal" value="${p.scorta['SL-TAGLIO'] || 0}"></div>
      <div class="f"><label>Scorta di sicurezza FERRO (kg)</label><input id="mr-sfe" inputmode="decimal" value="${p.scorta['FERRO'] || 0}"></div>
      <div class="f"><label>Anno dei fabbisogni pianificati</label><input id="mr-anno" value="${esc(p.anno)}"></div>
      <div class="f end"><label><input id="mr-bud" type="checkbox" style="width:auto" ${p.usaBudget ? 'checked' : ''}> usa il Budget Annuo come fabbisogno pianificato (MD61: ${n0(bud.volumeAnnuoPianificato || 0)} pz/anno, consumato dagli ordini di vendita)</label></div></div>
      <button class="btn pri" onclick="PP.eseguiMRP()">🧠 Esegui pianificazione (MD01)</button>
      <p class="small" style="margin-top:8px">Pianificazione rigenerativa, lotto per lotto, capacità infinita (come l'MRP classico SAP): ordine di pianificazione TRANSENNA → SL-PIEGA → SL-TAGLIO → FERRO. Nel profilo carenza clienti, PIR da budget e scorte di sicurezza dei prodotti sono esclusi per non sovrapprodurre. Le proposte già convertite restano; quelle aperte si ricalcolano.${u ? ` Ultima esecuzione: ${fd(u.data.slice(0, 10))} ${u.data.slice(11, 16)}.` : ''}</p>`)
    + al('in', 'Cosa guarda l\'MRP', 'Fabbisogni: ordini di vendita SD non consegnati, fabbisogni pianificati dal budget (se attivi), prenotazioni degli ordini di produzione e componenti degli ordini pianificati. Coperture: giacenza MB52, ordini di produzione aperti, ordini d\'acquisto aperti.');
}
function scrMD04(){
  const cod = ui.md04 || 'TRANSENNA', mat = matByCod(cod);
  let disp = 0; const scorta = M().param.scorta[cod] || 0;
  const rows = elementi(cod).map(el => { disp += el.qty; return [el.data ? fd(el.data) : '—', el.tipo, el.testo, el.qty > 0 ? nq(el.qty, mat.um) : '', el.qty < 0 ? nq(-el.qty, mat.um) : '',
    `<b style="color:${disp < scorta - 1e-9 ? '#BB0000' : '#107E3E'}">${nq(disp, mat.um)}</b>`]; });
  return card('📈', `Lista fabbisogni/disponibilità — ${cod}`, 'MD04', `<div class="fg"><div class="f"><label>Materiale</label><select onchange="PP._md04(this.value)">${Object.values(MAT).filter(m => struttura().duelivelli || m.tipo !== 'HALB').map(m => `<option${m.cod === cod ? ' selected' : ''}>${m.cod}</option>`).join('')}</select></div></div>`
    + tb(['Data', 'Elemento', 'Dati', 'Entrata>', 'Fabbisogno>', 'Disponibile>'], rows)
    + `<p class="small" style="margin-top:6px">Disponibile in rosso = sotto la scorta di sicurezza (${nq(scorta, mat.um)}): l'MRP crea una proposta. ⚠ = messaggio di eccezione.</p>`);
}
function scrMD16(){
  const m = M(), com = STATO.commesse.filter(c => c.stato !== 'chiusa');
  const optCom = sel => com.map(c => `<option value="${c.id}"${String(c.id) === String(sel) ? ' selected' : ''}>${esc(c.codice)}</option>`).join('');
  const plo = m.pianificati.map(x => [`<b class="mono">${x.id}</b>`, x.mat, n0(x.qty) + ' pz', fd(x.dataInizio) + ' → ' + fd(x.dataFine), esc(x.origine || ''), x.eccezione ? bd('o', x.eccezione) : '',
    x.stato === 'aperto' ? `<select id="plo-com-${x.id}" style="width:120px">${x.commessaId ? '' : '<option value="">— commessa —</option>'}${optCom(x.commessaId)}</select>` : esc((commessa(x.commessaId) || {}).codice || ''),
    x.stato === 'aperto' ? `<button class="btn sm pri" onclick="PP.convertiPLO('${x.id}')">Converti (CO40)</button> <button class="btn sm red" onclick="PP.eliminaProposta('${x.id}')">✕</button>` : bd('g', 'ordine ' + x.ordine)]);
  const forn = (STATO.sdmm && STATO.sdmm.fornitori) || [];
  const rda = m.richieste.map(x => [`<b class="mono">${x.id}</b>`, n2(x.qty) + ' kg', `rilascio ${fd(x.dataRilascio)} · fabbisogno ${fd(x.dataFabbisogno)}`, esc(x.origine || ''), x.eccezione ? bd('o', x.eccezione) : '',
    x.stato === 'aperta' ? `<select id="rda-f-${x.id}" style="width:150px">${forn.map(f => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</select> <input id="rda-p-${x.id}" inputmode="decimal" style="width:80px" value="${String(STATO.distintaBase.costoFerro).replace('.', ',')}" title="€/kg">` : '',
    x.stato === 'aperta' ? (forn.length ? `<button class="btn sm pri" onclick="PP.convertiRdA('${x.id}')">Crea ordine d'acquisto (ME59N)</button> ` : '<span class="small">crea un fornitore in SD/MM</span> ') + `<button class="btn sm red" onclick="PP.eliminaProposta('${x.id}')">✕</button>` : bd('g', 'ODA ' + x.poId)]);
  return msg('md16') + card('🗓️', 'Ordini pianificati', 'MD16 · CO40', tb(['Ordine pianificato', 'Materiale', 'Quantità>', 'Inizio → fine', 'Origine', 'Eccezione', 'Commessa', ''], plo, 'Nessuna proposta: esegui la pianificazione (MD01).'))
    + card('🛒', 'Richieste d\'acquisto del ferro', 'ME5A · ME59N', tb(['Richiesta', 'Quantità>', 'Date', 'Origine', 'Eccezione', 'Fornitore / prezzo €/kg', ''], rda, 'Nessuna richiesta d\'acquisto.'));
}
function scrCM01(){
  const anno = ui.cm01 || M().param.anno || oggi().slice(0, 4), k = caricoCapacita(anno);
  const blocchi = k.centri.map(x => {
    const rows = k.mesi.map((mm, i) => { const r = x.righe[i], tot = r.ord + r.plo + r.lav, pct = x.disp > 0 ? tot / x.disp * 100 : 0;
      return [mm.split('-').reverse().join('/'), n2(r.lav), n2(r.ord), n2(r.plo), n2(tot), n2(x.disp), `<b style="color:${pct > 100 ? '#BB0000' : pct > 85 ? '#E9730C' : '#107E3E'}">${n0(pct)}%</b>${pct > 100 ? ' ' + bd('r', 'sovraccarico') : ''}`]; });
    const tot = sumC(x.righe, r => r.ord + r.plo + r.lav);
    return card('🏭', `${esc(x.c.nome)} — capacità ${n0(x.c.oreAnnuePreviste)} h/anno (${n0(x.c.numeroAddetti || 1)} addetti)`, 'CM01',
      tb(['Mese', 'Ore lavorate (CO11N)>', 'Ordini di produzione>', 'Ordini pianificati>', 'Carico totale>', 'Capacità>', 'Utilizzo>'], rows.concat([['<b>Anno</b>', '', '', '', `<b>${n2(tot)}</b>`, `<b>${n2(x.disp * 12)}</b>`, `<b>${n0(x.disp > 0 ? tot / x.disp / 12 * 100 : 0)}%</b>`]])));
  }).join('');
  return `<div class="fg"><div class="f"><label>Anno</label><input value="${esc(anno)}" onchange="PP._cm01(this.value)"></div></div>` + blocchi
    + al('in', 'Come leggere il carico', 'Ordini e ordini pianificati pesano con le ore standard dei pezzi ancora da confermare, nel mese di inizio; le ore lavorate sono quelle confermate. Oltre il 100% il centro è in sovraccarico: sposta gli ordini, aumenta addetti od ore (Budget Annuo → Capacità) o anticipa la produzione.');
}

// ───────────────────────── schermate ─────────────────────────
const TITOLI = {home:'Launchpad PP', anag:'Dati di base — MM03 · CK11N · CR03 · CS03 · CA03', co01:'CO01 — Crea ordine di produzione', coois:'COOIS — Lista ordini di produzione',
  co03:'CO02/CO03 — Ordine di produzione', mb261:'MIGO 261 — Prelievo componenti all\'ordine', co11n:'CO11N — Conferma di produzione', mb101:'MIGO 101 — Entrata merci da ordine',
  co88:'CO88 — Chiusura di periodo: WIP (KKAX) e varianze (KKS2)', md01:'MD01 — Pianificazione MRP', md04:'MD04 — Lista fabbisogni/disponibilità', md16:'MD16 — Ordini pianificati e richieste d\'acquisto', cm01:'CM01 — Carico dei centri di lavoro', mb51:'MB51 — Documenti materiale', mb52:'MB52 — Giacenze per magazzino'};
const TCODES = {HOME:'home', MM03:'anag', CK11N:'anag', CR03:'anag', CS03:'anag', CA03:'anag', CO01:'co01', COOIS:'coois', CO02:'co03', CO03:'co03', CO13:'co03', TECO:'co03',
  MB1A:'mb261', '261':'mb261', CO11N:'co11n', MB31:'mb101', '101':'mb101', CO88:'co88', KO88:'co88', KKAX:'co88', KKS2:'co88', MB51:'mb51', MB52:'mb52', MMBE:'mb52', MD01:'md01', MD02:'md01', MRP:'md01', MD04:'md04', MD16:'md16', CO40:'md16', ME5A:'md16', ME59N:'md16', CM01:'cm01', CM07:'cm01'};
const msg = s => ui.msg[s] || '';
const inLav = o => !o.liquidazione && !o.teco;
const scegli = f => { const l = P().ordini.filter(f); if(!l.find(o => o.id === ui.sel)) ui.sel = l.length ? l[l.length - 1].id : ''; return ordine(ui.sel); };
const opzOrd = (f, sel) => { const l = P().ordini.filter(f); return l.length ? l.map(o => `<option value="${o.id}"${o.id === sel ? ' selected' : ''}>${o.id} — ${o.materiale} [${o.schemaFasi===3?'3 fasi nuove':'storico 2 ordini'}] · ${esc((commessa(o.commessaId) || {}).codice || '?')} · ${n0(o.qty)} pz · ${statoOrdine(o)}</option>`).join('') : '<option value="">— nessun ordine —</option>'; };
const selOrd = (id, f) => `<div class="f"><label>Ordine di produzione</label><select id="${id}" onchange="PP.sel(this.value)">${opzOrd(f, ui.sel)}</select></div>`;
const anteprima = (righe, titolo) => {
  const rr = righe.filter(x => x.importo > 0), d = sumC(rr.filter(x => x.dareAvere === 'DARE'), x => c2(x.importo)), a = sumC(rr.filter(x => x.dareAvere === 'AVERE'), x => c2(x.importo));
  return `<div class="prev"><h4>${titolo || 'Scrittura che verrà generata nel Libro Giornale'}</h4>${tb(['Conto', 'Centro', 'Dare>', 'Avere>'], rr.map(x => [esc(nomeConto(x.conto)) + (x.nota ? ` <span class="small">— ${esc(x.nota)}</span>` : ''), esc(nomeCentroCosto(x.centroCostoId) || ''), x.dareAvere === 'DARE' ? euro(x.importo) : '', x.dareAvere === 'AVERE' ? euro(x.importo) : '']).concat([[`<b>Totale</b> ${d === a ? bd('g', '✓ quadra') : bd('r', 'non quadra')}`, '', `<b>${euro(e2(d))}</b>`, `<b>${euro(e2(a))}</b>`]]))}</div>`;
};
const sg = x => `${x < 0 ? '−' : x > 0 ? '+' : ''}${euro(Math.abs(e2(x)))}`;

function scrHome(){
  const ord = P().ordini, u = ultimoPeriodo(), w = wipOrdiniAperti(), c15 = saldoConto('15');
  const tile = (s, ic, t, tc, kpi, cls) => `<div class="tile ${cls || ''}" onclick="PP.vai('${s}')"><span class="ic">${ic}</span><b>${t}</b><span class="tcd">${tc}</span><span class="kpi">${kpi}</span></div>`;
  const st = struttura();
  const guida = guidaFasi();
  return guida + `<div class="grp">Dati di base</div><div class="tiles">
      ${tile('anag', '📋', 'Materiali, costo in cascata, centri, distinta, ciclo', 'MM03 · CK11N · CS03 · CA03', `tre livelli / tre ordini · distinta v.${st.versione} · ${euro(st.pf.costoUnitario)}/pz`, 'ct')}</div>
    <div class="grp">Pianificazione</div><div class="tiles">
      ${tile('md01', '🧠', 'Pianificazione MRP', 'MD01', M().esecuzioni.length ? `ultima: ${fd(M().esecuzioni[M().esecuzioni.length - 1].data.slice(0, 10))}` : 'mai eseguita', 'ct')}
      ${tile('md04', '📈', 'Lista fabbisogni', 'MD04', 'transenne · semilavorato · ferro')}
      ${tile('md16', '🗓️', 'Proposte: ordini pianificati e richieste d\'acquisto', 'MD16 · CO40 · ME59N', `${M().pianificati.filter(x => x.stato === 'aperto').length} ordini pianificati · ${M().richieste.filter(x => x.stato === 'aperta').length} richieste`)}
      ${tile('cm01', '⚙️', 'Carico dei centri', 'CM01', 'capacità mese per mese', 'ct')}</div>
    <div class="grp">Ordine di produzione</div><div class="tiles">
      ${tile('co01', '🆕', 'Crea ordine', 'CO01', `${ord.length} ordini`)}
      ${tile('coois', '📑', 'Lista ordini', 'COOIS · CO03', `${ord.filter(o => !o.liquidazione).length} non liquidati`)}
      ${tile('mb261', '📤', 'Prelievo componenti', 'MIGO 261', `ferro ${n2(giac('FERRO'))} kg · tagliati ${n0(giac('SL-TAGLIO'))} · piegati ${n0(giac('SL-PIEGA'))} pz`, 'mm')}
      ${tile('co11n', '⏱️', 'Conferma', 'CO11N', `${sumC(ord, o => o.conferme.filter(c => !c.annullato).length)} conferme`)}
      ${tile('mb101', '📥', 'Entrata merci da ordine', 'MIGO 101', `transenne ${n0(giac('TRANSENNA'))} pz`, 'mm')}
      ${tile('co88', '📆', 'Chiusura di periodo', 'CO88 · KKAX · KKS2', u ? `ultimo chiuso ${u.periodo}` : 'nessun periodo chiuso', 'ct')}</div>
    <div class="grp">Magazzino (MM-IM, predisposto per WMS)</div><div class="tiles">
      ${tile('mb52', '🏬', 'Giacenze per magazzino', 'MB52 · MMBE', `${MM().magazzini.length} magazzini · stabilimento 1000`, 'mm')}
      ${tile('mb51', '🧾', 'Documenti materiale', 'MB51', `${SDMM.documentiMateriale().length} movimenti`, 'mm')}</div>
    <div class="grp">Controllo</div>
    ${card('🧮', 'Quadratura WIP — conto 15 Prodotti in corso di lavorazione', 'FI ↔ CO', tb(['', 'Importo>'], [
      ['WIP liquidato a bilancio sugli ordini aperti (ultima chiusura)', euro(e2(w))], ['Saldo del conto 15 nel Libro Giornale', euro(e2(c15))], ['Esito', w === c15 ? bd('g', '✓ quadra') : bd('r', '⚠ differenza ' + euro(e2(c15 - w)))],
      ['Costi oggi sugli ordini aperti (non ancora a bilancio: diventano WIP alla chiusura del mese)', euro(e2(sumC(ord.filter(o => !o.liquidazione), o => riepilogo(o).saldo)))]])
      + '<p class="small" style="margin-top:8px">Come in SAP il WIP si rileva solo a fine periodo (conto 15, attivo C.I.2) contro la variazione delle rimanenze di prodotti in corso (conto 74, voce A2 del conto economico).</p>')}
    ${card('📚', 'Flusso contabile (contabilità per natura, come SAP)', 'FI-CO', tb(['Passo', 'Transazione', 'Dare', 'Avere'], [
      ['Prelievo ferro / semilavorato', '261', '70 Consumi MP / 71 Consumi SL', '12 / 16 magazzino'],
      ['Conferma attività', 'CO11N', '72 Costi interni addebitati agli ordini', '75 attività per centro nei mesi pianificati; 51/52 nel percorso storico'],
      ['Entrata semilavorato / transenna', '101', '16 / 13 magazzino (standard)', '73 Output di produzione'],
      ['Fine mese — ordini aperti', 'CO88 (KKAX)', '15 WIP', '74 Variazione rimanenze in corso'],
      ['Fine mese — ordini completati', 'CO88 (KKS2)', '74 storno WIP · 60/61/64 se sfavorevoli', '15 WIP · 60/61/64 se favorevoli (contropartita 73)']]))}`;
}

function scrAnag(){
  const db = STATO.distintaBase, st = struttura(), mod = `<button class="btn sm" onclick="PP.impostazioni()">✏️ Modifica in Impostazioni</button>`;
  const opRow = o => [`<b class="mono">${esc(o.opId)}</b> ${esc(o.descrizione)}`, esc(o.centroNome), n2(o.oreStdPezzo) + ' h', euro(o.costoPersonalePezzo), euro(o.costoGeneraliPezzo), euro(o.costoPezzo)];
  const ck = [];
  if(st.duelivelli){
    ck.push(['<b>SL-TAGLIO</b> — ' + MAT.SL.desc, '', '', '', '', `<b>${euro(st.sl.costoUnitario)}</b>`]);
    ck.push(['&nbsp;&nbsp;FERRO ' + n2(db.kgFerro) + ' kg × ' + euro(db.costoFerro), '', '', '', '', euro(db.kgFerro * db.costoFerro)]);
    st.sl.operazioni.forEach(o => { const x = opRow(o); x[0] = '&nbsp;&nbsp;' + x[0]; ck.push(x); });
  }
  ck.push(['<b>TRANSENNA</b> — ' + MAT.PF.desc, '', '', '', '', `<b>${euro(st.pf.costoUnitario)}</b>`]);
  if(st.duelivelli) ck.push(['&nbsp;&nbsp;1 SL-TAGLIO', '', '', '', '', euro(st.sl.costoUnitario)]); else ck.push(['&nbsp;&nbsp;FERRO ' + n2(db.kgFerro) + ' kg × ' + euro(db.costoFerro), '', '', '', '', euro(db.kgFerro * db.costoFerro)]);
  st.pf.operazioni.forEach(o => { const x = opRow(o); x[0] = '&nbsp;&nbsp;' + x[0]; ck.push(x); });
  return al('in', 'Un dato solo', 'Distinta, ciclo e centri sono quelli di Impostazioni. La colonna «Produce» del ciclo decide quale operazione fa il semilavorato. Ogni ordine congela la versione valida al rilascio.')
    + card('📦', 'Materiali', 'MM03', tb(['Materiale', 'Tipo', 'Unità', 'Magazzino', 'Conto', 'Controllo prezzo', 'Prezzo standard>', 'Giacenza>'],
      Object.values(MAT).filter(m => st.duelivelli || m.tipo !== 'HALB').map(m => [`<b>${m.cod}</b> — ${m.desc}`, m.tipo, m.um, m.lgort, m.conto, 'S (standard)',
        euro(m.tipo === 'ROH' ? db.costoFerro : m.tipo === 'HALB' ? st.sl.costoUnitario : st.pf.costoUnitario) + '/' + m.um, nq(giac(m.cod), m.um)])))
    + card('🧮', `Costo standard in cascata — distinta v.${st.versione}`, 'CK11N', tb(['Voce', 'Centro', 'Ore/pz', 'Personale €/pz>', 'Generali €/pz>', 'Costo €/pz>'], ck) + mod)
    + card('🏭', 'Centri di lavoro = centri di costo', 'CR03', tb(['Centro', 'Area di fornitura (PSA)', 'Tariffa personale (51)>', 'Tariffa generali (52)>', 'Pool 51 oggi>', 'Pool 52 oggi>'],
      STATO.centriDiCosto.filter(c => (db.ciclo || []).some(r => String(r.centroCostoId) === String(c.id))).map(c => [esc(c.nome), psaDi(c.id), euro(tariffaPersonale(c)) + '/h', euro(tariffaGenerali(c)) + '/h', euro(saldoPoolCentro(c.id, '51')), euro(saldoPoolCentro(c.id, '52'))])) + mod);
}

function guidaFasi(){
  const rows=catene().filter(k=>!k.annullata).map(k=>{
    const com=commessa(k.commessaId)||{},ord=ordCatena(k);
    const data=MM().documenti.filter(d=>d.bwart==='101'&&!d.stornatoDa&&ord.some(o=>o.id===d.rif?.ordine)).reduce((d,x)=>x.data>d?x.data:d,k.data>oggi()?k.data:oggi());
    const celle=['SL-TAGLIO','SL-PIEGA','TRANSENNA'].map(cod=>{
      const os=ord.filter(o=>o.materiale===cod);
      const coperto=sumC(os,o=>o.teco?riepilogo(o).entrati:o.qty-riepilogo(o).scarto)+(k.scorte?.[cod]||0),residuo=Math.max(0,targetFase(k,cod)-coperto),componente=cod==='SL-PIEGA'?'SL-TAGLIO':'SL-PIEGA';
      const pronto=cod==='SL-TAGLIO'||libero(componente,data,k.id)>0;
      const pulsante=!residuo?'<br><span class="small">Quantità della fase già coperta</span>':pronto?`<br><button class="btn sm pri" onclick="PP.preparaFase('${k.id}','${cod==='SL-TAGLIO'?'SL':cod==='SL-PIEGA'?'PIEGA':'PF'}')">Prossimo passo: prepara ${cod}</button>`:`<br><span class="small">Prima completa il 101 ${componente}</span>`;
      return (os.length?os.map(o=>`<button class="btn sm" onclick="PP.apri('${o.id}')">${o.id} · ${cod}</button> ${badgeOrd(o)}<br>101: ${n0(riepilogo(o).entrati)}/${n0(o.qty)}`).join('<br>'):'Da creare manualmente')+pulsante;
    });
    return [esc(com.codice||k.commessaId)+'<br>'+n0(k.qty)+` pz<br><button class="btn sm" onclick="PP.annullaCatena('${k.id}')">Libera catena (solo dopo TECO / completamento)</button>`,...celle];
  });
  return al('in','Tre ordini DISTINTI — creazione sequenziale manuale',`<ol><li><b>Taglio:</b> FERRO → 261 → CO11N Taglio → 101 <b>SL-TAGLIO</b> (barre tagliate).</li><li><b>Dopo il 101 Taglio</b>, torna in CO01 e scegli <b>Piegatura</b>, stessa commessa: 261 tagliati → CO11N Piegatura → 101 <b>SL-PIEGA</b> (barre piegate).</li><li><b>Dopo il 101 Piegatura</b>, crea <b>Saldatura</b>, stessa commessa: 261 piegati → CO11N Saldatura → 101 <b>TRANSENNA</b>.</li></ol><p>La prima fase riserva la carenza cliente; il seguito usa la stessa catena senza prenotarla due volte. Se hai già semilavorati liberi puoi iniziare dalla fase necessaria. Conto 16 per SL-TAGLIO e 161 per i nuovi SL-PIEGA. I lotti storici conservano il conto originario: nessuna riscrittura retroattiva. Modello didattico ispirato a SAP, non replica SAP.</p>`)
    +(rows.length?card('🔗','Avanzamento catene nuove — scegli / crea il passo successivo','CO01',tb(['Commessa','1 · Taglio','2 · Piegatura','3 · Saldatura'],rows)):'');
}
function scrCO01(){
  const com=STATO.commesse.filter(c=>c.stato!=='chiusa'),v=validaCiclo();
  return msg('co01')+guidaFasi()+(v.errori.length?al('ko','Ciclo non valido',esc(v.errori.join(' · '))):'')+formCommessaCO01()
    +card('🆕','Crea UN ordine della fase scelta — stessa commessa nei tre passi','CO01',`<div class="fg">
    <div class="f"><label>Fase / materiale da produrre</label><select id="co-mat" onchange="PP.prev('co01')"><option value="SL">1 · Taglio → SL-TAGLIO</option><option value="PIEGA">2 · Piegatura → SL-PIEGA (dopo 101 taglio)</option><option value="PF">3 · Saldatura → TRANSENNA (dopo 101 piega)</option></select></div>
    <div class="f"><label>Commessa (usa la stessa in tutte le fasi)</label><select id="co-com" onchange="PP.prev('co01')">${com.map(c=>`<option value="${c.id}">${esc(c.codice)} — ${esc(c.descrizione)} (${n0(c.quantitaPianificata)} pz)</option>`).join('')||'<option value="">— crea prima la commessa —</option>'}</select></div>
    <div class="f"><label>Pezzi della fase</label><input id="co-qty" inputmode="decimal" oninput="PP.prev('co01')"></div>
    <div class="f"><label>Inizio (non prima del 101 precedente)</label><input id="co-data" type="date" value="${oggi()}" oninput="PP.prev('co01')"></div>
    <div class="f"><label>Fine prevista</label><input id="co-fine" type="date" value="${oggi()}"></div></div><div id="pv-co01"></div><button class="btn pri" onclick="PP.creaOrdine()">Crea e rilascia solo questa fase</button>`);
}
function prevCO01(){
  const q=numeroIt(val('co-qty')),tipo=val('co-mat')||'SL',st=struttura();if(!(q>0)||!Number.isInteger(q))return '';
  const std=tipo==='SL'?st.sl:tipo==='PIEGA'?st.piega:st.pf,com=commessa(val('co-com')),k=com?catenaAttiva(com):null,err=com?controllaNuovaFase(tipo,com,q,val('co-data')):'Seleziona una commessa';
  return al(err?'wa':'ok',err?'Prima completa i requisiti':'Fase pronta per la creazione',esc(err||'Si crea un solo ordine; dopo il suo 101 crea manualmente il successivo.'))
    +`<div class="info">${std.materiale}: ${n0(q)} × ${euro(std.costoUnitario)} = ${euro(std.costoUnitario*q)} a standard, congelato al rilascio.</div>`
    +tb(['Componente / operazione','Fabbisogno','Disponibilità non impegnata'],std.componenti.map(c=>[c.mat,nq(c.qtyPz*q,c.um),nq(libero(c.mat,val('co-data'),k?.id),c.um)])
      .concat(std.operazioni.map(o=>[esc(o.opId)+' '+esc(o.centroNome),n2(o.oreStdPezzo*q)+' h','Pool verificato in CO11N'])));
}
function scrAnagTre(){
  const st=struttura(),db=STATO.distintaBase;
  const stages=[st.sl,st.piega,st.pf];
  const rows=stages.flatMap(s=>[[`<b>${s.materiale}</b>`,'','',`<b>${euro(s.costoUnitario)}</b>`],...s.componenti.map(c=>['↳ '+c.mat,nq(c.qtyPz,c.um),'Componente (snapshot ricorsivo)',euro(e2(valComp(c,c.qtyPz*100))/100)]),...s.operazioni.map(o=>['↳ '+esc(o.opId)+' '+esc(o.descrizione),n2(o.oreStdPezzo)+' h',esc(o.centroNome),euro(o.costoPezzo)])]);
  return al('in','BOM e routing a tre livelli per i NUOVI ordini','FERRO → SL-TAGLIO → SL-PIEGA → TRANSENNA. Ogni fase ha il suo ordine, prelievo, conferma ed entrata. Gli ordini storici restano sul ciclo congelato originario.')
    +card('📦','Materiali distinti, conto 16 condiviso per i due HALB','MM03',tb(['Materiale','Tipo','UM','Magazzino','Conto','Prezzo standard>','Giacenza>'],Object.values(MAT).map(m=>[m.cod,m.tipo,m.um,m.lgort,m.conto,euro(m.cod==='FERRO'?db.costoFerro:stdMateriale(st,m.cod).costoUnitario),nq(giac(m.cod),m.um)])))
    +card('🧮','Valorizzazione progressiva / distinta / ciclo v.'+st.versione,'CK11N · CS03 · CA03',tb(['Materiale / componente / operazione','Quantità / ore','Centro','Costo €/pz>'],rows))
    +card('🏭','Centri, tariffe e capacità','CR03',tb(['Centro','Ore annue>','Personale €/h>','Generali €/h>'],STATO.centriDiCosto.filter(c=>STATO.distintaBase.ciclo.some(o=>String(o.centroCostoId)===String(c.id))).map(c=>[esc(c.nome),n2(c.oreAnnuePreviste),euro(tariffaPersonale(c)),euro(tariffaGenerali(c))])))
    +'<button class="btn" onclick="PP.impostazioni()">Modifica distinta / ciclo per nuovi ordini</button>';
}

// Fabbisogno netto di transenne: ordini di vendita non consegnati − giacenza − ordini di produzione transenna ancora aperti
function fabbisognoNettoPF(){
  const vendite = sumC(SDMM.fabbisogniVendita(), v => v.qty);
  const inProduzione = sumC(P().ordini.filter(o => apertoPP(o) && o.materiale === 'TRANSENNA'), o => residuoOrdine(o));
  return {vendite, giacenza:giac('TRANSENNA'), inProduzione, netto:Math.max(0, Math.round(vendite - giac('TRANSENNA') - inProduzione))};
}
// Commessa creata nel punto in cui si decide di produrre (CO01): la quantità proposta è il fabbisogno netto
function formCommessaCO01(){
  const raw=fabbisognoNettoPF(), net=window.Fabbisogno?Fabbisogno.info():null, f=net?{vendite:net.vendite,giacenza:net.giacenza,inProduzione:net.produzione,netto:net.netto}:raw, apri = f.netto > 0 || !STATO.commesse.some(c => c.stato !== 'chiusa');
  const sugg = 'COM-' + String(STATO.prossimoIdCommessa || 1).padStart(3, '0');
  return card('📁', 'Nuova commessa — il lotto da produrre', 'CJ20N', `<details ${apri ? 'open' : ''}><summary style="cursor:pointer"><b>➕ Crea la commessa</b> — quando dall'ordine di vendita sai quanti pezzi mancano</summary>
      <div class="info" style="margin-top:8px">Fabbisogno netto di transenne: ordini di vendita da consegnare <b>${n0(f.vendite)}</b> − giacenza <b>${n0(f.giacenza)}</b> − ordini di produzione aperti <b>${n0(f.inProduzione)}</b> = <b>${n0(f.netto)} pz da produrre</b>.
        La commessa è il lotto di produzione: la sua quantità è quella da produrre, non quella ordinata dal cliente.</div>
      <div class="fg"><div class="f"><label>Codice</label><input id="pp-com-codice" value="${sugg}"></div>
        <div class="f"><label>Descrizione</label><input id="pp-com-descrizione" placeholder="es. Fornitura cliente X"></div>
        <div class="f"><label>Quantità pianificata (pz)</label><input id="pp-com-quantita" type="number" min="1" value="${f.netto > 0 ? f.netto : ''}"></div>
        <div class="f end"><button class="btn pri" onclick="creaCommessaRapida('pp')">➕ Crea commessa</button></div></div></details>`);
}
function scrCOOIS(){
  const rows = [...P().ordini].reverse().map(o => { const r = riepilogo(o), com = commessa(o.commessaId) || {};
    return [`<b class="mono">${o.id}</b>${o.padre ? `<br><span class="small">per ${o.padre}</span>` : ''}`, o.materiale+'<br>'+bd(o.schemaFasi===3?'g':'n',o.schemaFasi===3?'Nuovo · 3 ordini':'Storico · ciclo 2 ordini'), esc(com.codice || '?'), fd(o.data), n0(o.qty), n0(r.confermato), n0(r.entrati), euro(e2(r.saldo)), euro(e2(o.wipSettled || 0)), badgeOrd(o), `<button class="btn sm" onclick="PP.apri('${o.id}')">Apri</button>`]; });
  return msg('coois') + card('📑', 'Ordini di produzione', 'COOIS', tb(['Ordine', 'Materiale', 'Commessa', 'Rilascio', 'Pezzi>', 'Confermati>', 'Entrati>', 'Saldo ordine>', 'WIP a bilancio>', 'Stato', ''], rows, 'Nessun ordine: crealo con CO01.'));
}

function scrCO03(){
  const o = scegli(() => true);
  if(!o) return msg('co03') + al('in', 'Nessun ordine', 'Crea un ordine con CO01.');
  const r = riepilogo(o), com = commessa(o.commessaId) || {}, v = varianze(o), chiuso = !!o.liquidazione, s = stdCent(o, o.qty);
  const docs = docsOrdine(o).sort((a, b) => a.data.localeCompare(b.data) || a.doc.localeCompare(b.doc));
  const btnD = d => d.stornatoDa ? bd('n', 'stornato ' + d.stornatoDa) : d.stornoDi || chiuso ? '' : `<button class="btn sm red" onclick="PP.storna('${o.id}','DOC','${d.doc}')">Storna</button>`;
  const btnC = c => c.annullato ? bd('n', 'stornata') : chiuso ? '' : `<button class="btn sm red" onclick="PP.storna('${o.id}','CO11N','${c.id}')">Storna</button>`;
  const mov = docs.map(d => [fd(d.data), `<span class="mono">${d.doc}</span> · ${d.bwart}`, `${d.mat} ${nq(d.qty, d.um)} · magazzino ${d.lgort}${d.rif.resb ? ` · ${d.rif.resb}/${d.rif.pos}` : ''}`, euro(e2(d.cent)), d.regId ? '#' + d.regId : '—', btnD(d)])
    .concat(o.conferme.map(c => [fd(c.data), 'CO11N ' + c.id + (c.finale ? ' finale' : ''), `${n0(c.buoni)} buoni · ${n0(c.scarto)} scarto · ${c.ore.filter(x => x.ore).map(x => x.opId + ' ' + n2(x.ore) + ' h').join(', ') || 'nessuna ora'}`, euro(sumC(c.centri, x => x.p + x.g)), c.regId ? '#' + c.regId : '—', btnC(c)]));
  const pren = o.prenotazioni.map(p => { const a = (r.comp[p.mat] || {qty:0}).qty; return [`${p.resb}/${p.pos}`, p.mat, p.lgort, p.psa, nq(p.fabbisogno, p.um), nq(a, p.um), a >= p.fabbisogno - 1e-9 ? bd('g', 'evasa') : a > 0 ? bd('o', 'parziale') : bd('b', 'aperta'), `<span class="small">${esc(p.wms.stato)}</span>`]; });
  return msg('co03') + card('📄', `Ordine ${o.id} — ${o.materiale} ${badgeOrd(o)} · ${o.schemaFasi===3?'NUOVO: 3 ordini distinti':'STORICO: ciclo originale a 2 ordini'}`, 'CO03', `<div class="fg">${selOrd('c3-ord', () => true)}
      <div class="f"><label>Commessa</label><div class="info" style="margin:0">${esc(com.codice || '?')} — ${esc(com.descrizione || '')}</div></div>
      <div class="f"><label>Quantità</label><div class="info" style="margin:0">${n0(o.qty)} pz · ${fd(o.data)} → ${fd(o.dataFine)}${o.ordineSL ? ` · semilavorato dall'ordine ${o.ordineSL}` : ''}${o.padre ? ` · per l'ordine ${o.padre}` : ''}</div></div></div>
      ${tb([`Costo standard congelato (distinta v.${o.std.versione})`, 'Per pezzo>', `Per ${n0(o.qty)} pz>`], o.std.componenti.map((c, i) => [`${c.mat} ${nq(c.qtyPz, c.um)}${c.prezzo ? ' × ' + euro(c.prezzo) : ''}`, euro(e2(valComp(c, c.qtyPz * 100)) / 100), euro(e2(s.comps[i].cent))])
        .concat(o.std.operazioni.map((op, i) => [`${esc(op.opId)} ${esc(op.descrizione)} — ${esc(op.centroNome)} (${n2(op.oreStdPezzo)} h × ${euro(op.tariffaPersonale)} + ${euro(op.tariffaGenerali)})`, euro(op.costoPezzo), euro(e2(s.ops[i].p + s.ops[i].g))]))
        .concat([['<b>Totale</b>', `<b>${euro(o.std.costoUnitario)}</b>`, `<b>${euro(e2(s.tot))}</b>`]]))}`)
    + card('📌', 'Prenotazioni dei componenti (RESB) — fornitura alla produzione', 'MD04 · PSA', tb(['Prenotazione', 'Materiale', 'Magazzino', 'Area fornitura', 'Fabbisogno>', 'Prelevato>', 'Stato', 'WMS'], pren))
    + card('🔁', 'Documenti materiale e conferme', 'MB51 · CO13', tb(['Data', 'Documento', 'Dettaglio', 'Valore>', 'Scrittura', ''], mov, 'Nessun movimento.'))
    + card('📊', 'Saldo dell\'ordine e varianze (anteprima KKS2)', 'KKBC', tb(['Voce', 'Standard', 'Reale', 'Varianza (+ favorevole)>'],
        v.comps.map(c => [`${c.mat} — quantità / prezzo`, nq(c.planQ, c.um), nq(c.actQ, c.um), `${sg(c.varQta)} / ${sg(c.varPrezzo)}`])
        .concat(v.centri.map(c => [`${esc(c.centroNome)} — efficienza / prezzo attività`, `${n2(c.oreStd)} h`, `${n2(c.oreReali)} h`, `${sg(c.varEff)} / ${sg(c.varPrezzo)}`]))
        .concat([[`Scarto (${n0(v.Qs)} pz)`, '', '', sg(sumC(v.comps, c => c.varScarto) + sumC(v.centri, c => c.varScarto))], ['Residuo / arrotondamento', '', '', sg(v.residuo)],
          [`<b>Saldo dell'ordine</b> (costi ${euro(e2(r.debiti))} − entrate a standard ${euro(e2(r.grCent))})`, '', `<b>${euro(e2(r.saldo))}</b>`, `<b>${sg(v.totale)}</b>`],
          ['WIP a bilancio dall\'ultima chiusura (conto 15)', '', euro(e2(o.wipSettled || 0)), '']]))
      + '<p class="small" style="margin-top:6px">Il saldo dell\'ordine sta a conto economico (70, 71, 72 contro 73). Va a bilancio come WIP solo con la chiusura del periodo; alla chiusura dell\'ordine diventa varianza.</p>')
    + card('🔒', 'Chiusura tecnica', 'CO02', chiuso ? al('ok', `Liquidato nel periodo ${o.liquidazione.periodo} (CLSD)`, 'Per correggere annulla la chiusura di quel periodo in CO88.')
      : o.teco ? `${al('in', `Chiuso tecnicamente il ${fd(o.teco.data)}`, 'Si liquida alla prossima chiusura di periodo (CO88).')}<button class="btn" onclick="PP.annullaTeco('${o.id}')">Annulla TECO</button>`
      : `<div class="fg"><div class="f"><label>Data TECO</label><input id="te-data" type="date" value="${oggi()}"></div></div><button class="btn pri" onclick="PP.teco('${o.id}')">🔒 Chiudi tecnicamente (TECO)</button>
         ${!docs.length && !o.conferme.length ? ` <button class="btn red" onclick="PP.eliminaOrdine('${o.id}')">Elimina ordine senza movimenti</button>` : ''}`);
}

function scrMB261(){
  const o = scegli(inLav);
  if(!o) return msg('mb261') + al('in', 'Nessun ordine in lavorazione', 'Crea un ordine con CO01.');
  const r = riepilogo(o);
  const opz = o.prenotazioni.map(p => `<option value="${p.pos}">${p.resb}/${p.pos} — ${p.mat} (magazzino ${p.lgort}, fabbisogno ${nq(p.fabbisogno, p.um)})</option>`).join('');
  const p0 = o.prenotazioni[0], resto = Math.max(0, p0.fabbisogno - (r.comp[p0.mat] || {qty:0}).qty);
  return msg('mb261') + card('📤', 'Prelievo del componente all\'ordine (uscita merci per produzione)', 'MIGO 261', `<div class="fg">${selOrd('mb-ord', inLav)}
      <div class="f"><label>Posizione della prenotazione</label><select id="mb-pos" onchange="PP.prev('mb261')">${opz}</select></div>
      <div class="f"><label>Quantità (${p0.um})</label><input id="mb-qty" inputmode="decimal" value="${resto ? resto.toLocaleString('it-IT') : ''}" oninput="PP.prev('mb261')"></div>
      <div class="f"><label>Data</label><input id="mb-data" type="date" value="${oggi()}"></div></div>
      <div class="info">Giacenze: FERRO ${n2(giac('FERRO', '0010'))} kg (0010) · SL-TAGLIO ${n0(giac('SL-TAGLIO', '0020'))} pz · SL-PIEGA ${n0(giac('SL-PIEGA','0020'))} pz (0020, materiali distinti). Con il WMS attivo il componente passerà prima dall'area di fornitura ${esc(p0.psa)} (trasferimento 311); oggi si preleva direttamente dal magazzino.</div>
      <div id="pv-mb261"></div><button class="btn pri" onclick="PP.prelievo()">📤 Registra prelievo (261)</button>`);
}
function prevMB261(){
  const o = ordine(val('mb-ord')); if(!o) return '';
  const pos = o.prenotazioni.find(p => String(p.pos) === val('mb-pos')) || o.prenotazioni[0], qty = numeroIt(val('mb-qty'));
  if(!(qty > 0)) return '';
  const cent = pos.mat === 'FERRO' ? c2(qty * STATO.distintaBase.costoFerro) : prelevaSL(qty,pos.mat,val('mb-data')).cent;
  return anteprima([riga(pos.mat === 'FERRO' ? '70' : '71', 'DARE', cent), ...(pos.mat==='FERRO'?[riga('12','AVERE',cent)]:Civilistico.magLines(prelevaSL(qty,pos.mat,val('mb-data')).prelievi,'AVERE'))]);
}

function scrCO11N(){
  const o = scegli(inLav);
  if(!o) return msg('co11n') + al('in', 'Nessun ordine in lavorazione', 'Crea un ordine con CO01.');
  const r = riepilogo(o), resto = Math.max(0, o.qty - r.confermato);
  const righe = o.std.operazioni.map(op => [`<b class="mono">${esc(op.opId)}</b> ${esc(op.descrizione)}`, esc(op.centroNome), `${n2(op.oreStdPezzo)} h/pz`, n2(op.oreStdPezzo * resto) + ' h', n2(r.oreOp[op.opId] || 0) + ' h',
    `<input id="cn-ore-${esc(op.opId)}" inputmode="decimal" style="width:110px" value="${(op.oreStdPezzo * resto).toLocaleString('it-IT', {maximumFractionDigits:2})}" oninput="PP.prev('co11n')">`]);
  return msg('co11n') + card('⏱️', `Conferma di produzione — ordine ${o.id} (${o.materiale})`, 'CO11N', `<div class="fg">${selOrd('cn-ord', inLav)}
      <div class="f"><label>Data</label><input id="cn-data" type="date" value="${oggi()}" oninput="PP.prev('co11n')"></div>
      <div class="f"><label>Pezzi buoni</label><input id="cn-buoni" inputmode="decimal" value="${resto}" oninput="PP.prev('co11n')"></div>
      <div class="f"><label>Pezzi di scarto</label><input id="cn-scarto" inputmode="decimal" value="0" oninput="PP.prev('co11n')"></div>
      <div class="f end"><label><input id="cn-fin" type="checkbox" style="width:auto"> conferma finale</label></div></div>
      <div class="info">Ordine ${n0(o.qty)} pz · confermati ${n0(r.confermato)} (${n0(r.buoni)} buoni, ${n0(r.scarto)} scarto). <b>Le ore proposte sono lo STANDARD, non quelle lavorate: cancellale e scrivi le ore reali</b>, altrimenti le varianze di manodopera risultano sempre zero.</div>
      ${tb(['Operazione', 'Centro', 'Standard', 'Std pezzi mancanti>', 'Già confermate>', 'Ore reali ora'], righe)}
      <div id="pv-co11n"></div>
      <button class="btn pri" onclick="PP.conferma()">✅ Registra conferma (CO11N)</button> <button class="btn" onclick="PP.caricaCosti()">📋 Istruzioni budget mensile dei centri</button>`);
}
function prevCO11N(){
  const o = ordine(val('cn-ord')); if(!o) return '';
  const c = leggiConferma(o); if(c.errore) return al('wa', 'Controlla i dati', esc(c.errore));
  const righe = [riga('72', 'DARE', c.tot)]; c.centri.forEach(x => { righe.push(riga('51', 'AVERE', x.p, x.centroCostoId)); righe.push(riga('52', 'AVERE', x.g, x.centroCostoId)); });
  const pool = tb(['Centro', 'Conto', 'Ore × tariffa del centro>', 'Caricato alla data>', 'Già attribuito>', 'Disponibile>', 'Paghe HR successive>', 'Esito'], [].concat(...c.centri.map(x => [['51', x.p, x.tp], ['52', x.g, x.tg]].map(([conto, cent, t]) => {
    const d=diagnosiPoolCentro(x.centroCostoId,conto,c.data),disp=c.data?d.disponibile:0;
    return [esc(nomeCentroCosto(x.centroCostoId)), conto, `${n2(x.ore)} h × ${euro(t)} = ${euro(e2(cent))}`,euro(d.caricato),euro(d.assorbito),euro(disp),d.futuroHR?euro(d.futuroHR)+' dal '+esc(d.prossimaPaga):'—', e2(cent) <= disp + 0.005 ? bd('g', '✓') : bd('r', 'insufficiente')]; }))));
  return pool + (c.tot > 0 ? anteprima(window.BudgetPool?BudgetPool.convert(righe,c.data):righe) : al('in', 'Nessuna scrittura', 'Solo quantità confermate.'));
}

function scrMB101(){
  const o = scegli(inLav);
  if(!o) return msg('mb101') + al('in', 'Nessun ordine in lavorazione', 'Crea un ordine con CO01.');
  const r = riepilogo(o), max = r.buoni - r.entrati, m = matByCod(o.materiale);
  return msg('mb101') + card('📥', `Entrata merci da ordine — ${m.cod} nel magazzino ${m.lgort}${m === MAT.PF ? ' (dichiarazione di produzione)' : ''}`, 'MIGO 101', `<div class="fg">${selOrd('gr-ord', inLav)}
      <div class="f"><label>Pezzi buoni a magazzino</label><input id="gr-qty" inputmode="decimal" value="${max > 0 ? max : ''}" oninput="PP.prev('mb101')"></div>
      <div class="f"><label>Data</label><input id="gr-data" type="date" value="${oggi()}"></div>
      <div class="f end"><label><input id="gr-fin" type="checkbox" style="width:auto" ${r.entrati + max >= o.qty || o.confermaFinale ? 'checked' : ''}> consegna completata</label></div></div>
      <div class="info">Buoni confermati ${n0(r.buoni)} · già entrati ${n0(r.entrati)} · <b>caricabili ${n0(max)} pz</b>. Lo scarto (${n0(r.scarto)} pz) non entra a magazzino. «Consegna completata» chiude l'ordine per la liquidazione di fine periodo. Con il WMS attivo seguirà il compito di stoccaggio.</div>
      ${max <= 0 ? al('wa', 'Niente da caricare', 'Conferma prima i pezzi buoni con CO11N.') : ''}
      <div id="pv-mb101"></div><button class="btn pri" onclick="PP.entrata()">📥 Registra entrata merci (101)</button>`);
}
function prevMB101(){
  const o = ordine(val('gr-ord')), q = numeroIt(val('gr-qty')); if(!o || !(q > 0) || !Number.isInteger(q)) return '';
  const r = riepilogo(o), cent = stdCent(o, r.entrati + q).tot - stdCent(o, r.entrati).tot, pf = o.materiale === 'TRANSENNA';
  // SAP non lo impedisce, ma lo segnala: componenti prelevati meno dello standard per i pezzi che entrano → la differenza diventerà varianza
  const pochi = o.std.componenti.filter(c => ((r.comp[c.mat] || {qty:0}).qty) + 1e-9 < c.qtyPz * (r.entrati + q)).map(c => `${c.mat}: prelevati ${nq((r.comp[c.mat] || {qty:0}).qty, c.um)}, standard per ${n0(r.entrati + q)} pz ${nq(c.qtyPz * (r.entrati + q), c.um)}`);
  return (pochi.length ? al('wa', 'Componenti non ancora prelevati', esc(pochi.join(' · ')) + '. Registra prima il prelievo 261: altrimenti alla chiusura del mese la differenza diventa una varianza favorevole fittizia.') : '') + (pf ? `<div class="info">Voce nel Libro Giornale: <b>Dichiarazione di produzione – ${q.toLocaleString('it-IT')} pezzi – Produzione/addebito commessa ${esc((commessa(o.commessaId) || {}).codice || '')}</b></div>` : '')
    + anteprima([riga(pf ? '13' : matByCod(o.materiale).conto, 'DARE', cent), riga('73', 'AVERE', cent)]);
}

function scrCO88(){
  const u = ultimoPeriodo(), prossimo = (() => { if(u){ const d = new Date(u.fine + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 7); } const ds = P().ordini.map(o => o.data).sort(); return (ds[0] || oggi()).slice(0, 7); })();
  const storia = P().periodi.map(p => [p.periodo, fd(p.fine), p.regs.length + ' scritture', p.annullato ? bd('n', 'annullata') : bd('g', 'chiuso')]);
  return msg('co88') + card('📆', 'Chiusura di periodo — WIP e varianze', 'CO88', `<div class="fg"><div class="f"><label>Periodo da chiudere (un mese alla volta)</label><input id="cp-per" type="month" value="${prossimo}" oninput="PP.prev('co88')"></div></div>
      <div id="pv-co88"></div><button class="btn pri" onclick="PP.chiudiPeriodo()">📆 Esegui chiusura del periodo</button>
      ${u ? ` <button class="btn red" onclick="PP.annullaPeriodo()">Annulla chiusura ${u.periodo}</button>` : ''}`)
    + card('🗂️', 'Periodi', 'OKP1', tb(['Periodo', 'Fine', 'Scritture', 'Stato'], storia, 'Nessun periodo chiuso.'));
}
function prevCO88(){
  const per = val('cp-per'); if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(per)) return '';
  const u = ultimoPeriodo(); if(u && per <= u.periodo) return al('wa', 'Periodo già chiuso', `Il prossimo periodo da chiudere è dopo ${u.periodo}.`);
  const piano = pianoChiusura(per), fine = fineMese(per);
  if(!piano.length) return al('in', 'Niente da registrare', `Al ${fd(fine)} nessun ordine ha WIP da aggiornare o varianze da liquidare.`);
  return tb(['Ordine', 'Stato al ' + fd(fine), 'Saldo ordine>', 'WIP precedente>', 'WIP nuovo>', 'Scrittura WIP (15/74)>', 'Varianze a conto economico>'],
    piano.map(x => [`${x.id} — ${x.o.materiale}`, x.completo ? bd('g', 'completato → liquidazione') : bd('o', 'aperto → WIP'), euro(e2(x.r.saldo)), euro(e2(x.o.wipSettled || 0)), euro(e2(x.wipNuovo)), sg(x.wipDelta), x.completo ? sg(x.v.totale) : '—']))
    + piano.filter(x => x.completo).map(x => anteprima(righeVarianze(x.v), `Liquidazione varianze ordine ${x.id} (KKS2)`)).join('');
}

function scrMB51(){
  const f = val('mb51-mat') || ui.mb51 || '';
  const docs = SDMM.documentiMateriale().filter(d => !f || d.mat === f).slice().reverse();
  return card('🧾', 'Documenti materiale', 'MB51', `<div class="fg"><div class="f"><label>Materiale</label><select id="mb51-mat" onchange="PP._mb51(this.value)"><option value="">tutti</option>${Object.values(MAT).map(m => `<option${m.cod === f ? ' selected' : ''}>${m.cod}</option>`).join('')}</select></div></div>`
    + tb(['Data', 'Documento', 'Tipo mov.', 'Materiale', 'Stab./Mag.', 'Quantità>', 'Valore>', 'Riferimento'], docs.map(d => [fd(d.data), `<span class="mono">${esc(d.doc)}</span>`, d.bwart, d.mat, `${d.werks}/${d.lgort}`,
      `${d.segno < 0 ? '−' : '+'}${nq(d.qty, d.um)}`, d.cent != null ? euro(e2(d.cent)) : '—', esc(d.testo || '') + (d.stornatoDa ? ' ' + bd('n', 'stornato') : '')]), 'Nessun documento.'));
}
function scrMB52(){
  const rows = [];
  Object.values(MAT).forEach(m => MM().magazzini.forEach(l => { const q = giac(m.cod, l.lgort); if(Math.abs(q) > 1e-9 || l.lgort === m.lgort) rows.push([`<b>${m.cod}</b> — ${m.desc}`, `1000 / ${l.lgort} ${esc(l.nome)}`, nq(q, m.um), l.lgnum ? esc(l.lgnum) : '<span class="small">non collegato (WMS non attivo)</span>']); }));
  return card('🏬', 'Giacenze per stabilimento e magazzino (dal registro dei documenti materiale)', 'MB52', tb(['Materiale', 'Stabilimento / magazzino', 'Giacenza>', 'Numero magazzino WMS'], rows))
    + al('in', 'Predisposizione WMS', 'Ogni magazzino ha già il campo «numero magazzino WMS». Quando il WMS verrà innestato, prenotazioni (RESB), aree di fornitura (PSA) e documenti 101 «da stoccare» saranno il suo punto di partenza, senza cambiare la contabilità.');
}

const SCR = {md01:scrMD01, md04:scrMD04, md16:scrMD16, cm01:scrCM01, home:scrHome, anag:scrAnagTre, co01:scrCO01, coois:scrCOOIS, co03:scrCO03, mb261:scrMB261, co11n:scrCO11N, mb101:scrMB101, co88:scrCO88, mb51:scrMB51, mb52:scrMB52};
const PREV = {co01:prevCO01, mb261:prevMB261, co11n:prevCO11N, mb101:prevMB101, co88:prevCO88};

function shell(){
  R.innerHTML = `<style>${SDMM.css || ''}</style><div class="app">
    <header class="top"><span class="logo">SAP</span><span class="ttl">S/4HANA — PP · Produzione | <b>Ferro &amp; Transenne S.r.l.</b></span><span class="hr">Plant 1000 · Controllo prezzo S · WIP a fine periodo</span></header>
    <div class="bar"><button class="btn sm" onclick="PP.vai('home')">🏠 Launchpad</button><span class="crumb" id="pp-crumb"></span>
      <span class="tc"><input id="pp-tc" placeholder="Transazione: CO01 · 261 · CO11N · 101 · CO88 · MB52…" onkeydown="if(event.key==='Enter')PP.tcode(this.value)"><button class="btn sm" onclick="PP.tcode(this.previousElementSibling.value)">▶</button></span></div>
    <div class="body" id="pp-body"></div></div>`;
}
function render(){
  if(!R) return;
  const body = $('pp-body'); if(!body) return;
  let tenuti = null;
  if(ui.keep && ui.keepScr === ui.s){ tenuti = {}; body.querySelectorAll('input[id],select[id]').forEach(e => { tenuti[e.id] = e.type === 'checkbox' ? e.checked : e.value; }); }
  ui.keep = false;
  $('pp-crumb').textContent = TITOLI[ui.s] || '';
  body.innerHTML = (SCR[ui.s] || SCR.home)();
  if(tenuti) Object.keys(tenuti).forEach(id => { const e = $(id); if(!e || id.endsWith('-ord')) return; if(e.type === 'checkbox') e.checked = tenuti[id]; else e.value = tenuti[id]; });
  if(ui.presel && ui.s === 'co01'){ if(ui.presel.fase&&$('co-mat'))$('co-mat').value=ui.presel.fase;if(ui.presel.data){$('co-data').value=ui.presel.data;$('co-fine').value=ui.presel.data;} if($('co-com')) $('co-com').value = ui.presel.com; if($('co-qty') && ui.presel.qty) $('co-qty').value = ui.presel.qty; }
  ui.presel = null;
  if(PREV[ui.s]) A.prev(ui.s);
}
function init(){ const host = document.getElementById('pp-host'); if(!host) return; R = host.shadowRoot || host.attachShadow({mode:'open'}); shell(); render(); }
// Nuovo giro: via ordini di produzione, periodi chiusi, MRP e documenti materiale; numerazioni ripartono da capo
function reset(){
  if(STATO.pp){ STATO.pp.ordini = []; STATO.pp.periodi = []; STATO.pp.cnt = 1000001; delete STATO.pp.mrp; delete STATO.pp.catene; }
  if(STATO.mm){ STATO.mm.documenti = []; STATO.mm.cnt = 4900000001; }
  delete STATO.ppArchivioV1;
  ui.sel = ''; ui.msg = {}; ui.ultima = null;
}


Object.assign(A,{
  preparaFase(id,tipo){const k=catene().find(x=>x.id===id&&!x.annullata);if(!k)return;const cod=faseCod(tipo),os=ordCatena(k),coperto=sumC(os.filter(o=>o.materiale===cod),o=>o.teco?riepilogo(o).entrati:o.qty-riepilogo(o).scarto)+(k.scorte?.[cod]||0);
    const docs=MM().documenti.filter(d=>d.bwart==='101'&&!d.stornatoDa&&os.some(o=>o.id===d.rif?.ordine)),data=docs.reduce((d,x)=>x.data>d?x.data:d,k.data>oggi()?k.data:oggi()),residuo=Math.max(0,targetFase(k,cod)-coperto),qty=tipo==='SL'?residuo:Math.min(residuo,libero(tipo==='PIEGA'?'SL-TAGLIO':'SL-PIEGA',data,k.id));
    ui.presel={com:k.commessaId,qty,fase:tipo,data};ui.s='co01';ui.msg={};render();
  },
  annullaCatena(id){const k=catene().find(x=>x.id===id&&!x.annullata);if(!k)return;if(ordCatena(k).some(o=>!o.teco&&!o.liquidazione&&!completato(o)))return ko('co01','Prima chiudi gli ordini della catena','Completa o imposta TECO su tutti gli ordini prima di liberare domanda e scorte. Gli eventuali costi/WIP restano nei rispettivi ordini.');
    if(!confirm('Liberare domanda e scorte della catena '+id+'? Non cancella ordini né scritture; gli ordini di questa catena non potranno più produrre.'))return;k.annullata=true;k.annullataIl=new Date().toISOString();salva();ok('co01','Catena annullata','Domanda e materiali liberi. Ordini e giornale restano leggibili; liquida eventuale WIP/varianze nel periodo.');
  }
});

for(const name of ['prelievo','conferma','entrata','storna','teco','annullaTeco','eliminaOrdine','convertiPLO','convertiRdA','eseguiMRP','eliminaProposta','annullaCatena']){
  const fn=A[name];if(!fn)continue;
  A[name]=function(...args){const backup=structuredClone(STATO);let precedente;try{precedente=localStorage.getItem(CHIAVE_STORAGE);}catch(e){}
    try{return fn.apply(this,args);}catch(e){STATO=backup;ui.ultima=null;try{if(precedente!==undefined){if(precedente===null)localStorage.removeItem(CHIAVE_STORAGE);else localStorage.setItem(CHIAVE_STORAGE,precedente);}}catch(x){}
      return ko(ui.s,'⛔ Operazione non mantenuta',esc(e.message)+' — stato, documenti e giornale ripristinati. Controlla che il browser consenta il salvataggio.');}
  };
}
return Object.assign(A, {init, render, reset, riepilogo, varianze, statoOrdine, stdCent, struttura, wipOrdiniAperti, lottiSL,
  _mb51(v){ ui.mb51 = v; render(); },
  dopoCommessa(c){ ui.presel = {com:String(c.id), qty:c.quantitaPianificata}; ui.keep = true; ui.keepScr = ui.s; ui.msg.co01 = al('ok', `Commessa ${esc(c.codice)} creata`, `${n0(c.quantitaPianificata)} pz pianificati: è già selezionata qui sotto nell'ordine di produzione: completa le date e premi «Crea e rilascia».`); render(); }});
})();
