// Simulazione completa dell'esercizio guidato nel simulatore nuovo.
const H = require('./harness');
let W = H.boot();
const out = {};             // numeri di controllo
const steps = [];           // log passi
const E = s => W.eval(s);
const S = () => E('STATO');
const r2 = n => Math.round(n*100)/100;

function fail(where, msg){ console.error('\n❌ ' + where + ': ' + msg); dumpBal(); process.exit(1); }
function step(name, fn){ try{ const r = fn(); steps.push(name); return r; }catch(e){ fail(name, e.message + '\n' + (e.stack||'').split('\n').slice(1,4).join('\n')); } }
// --- FI (light DOM)
function setFI(id, v){ const e = W.document.getElementById(id); if(!e) throw Error('campo assente ' + id); e.value = v; }
// --- shadow roots
const sdR = () => W.document.getElementById('sdmm-host').shadowRoot;
const ppR = () => W.document.getElementById('pp-host').shadowRoot;
function setSD(id, v){ const e = sdR().getElementById(id); if(!e) throw Error('SD campo assente ' + id); if(e.type==='checkbox') e.checked = !!v; else e.value = v; }
function setPP(id, v){ const e = ppR().getElementById(id); if(!e) throw Error('PP campo assente ' + id); if(e.type==='checkbox') e.checked = !!v; else e.value = v; }
function koSD(){ const k = sdR().querySelector('.al-ko'); return k ? k.textContent : ''; }
function koPP(){ const k = ppR().querySelector('.al-ko'); return k ? k.textContent : ''; }
function sdAct(fn){ E('SDMM.' + fn); const k = koSD(); if(k) throw Error('SD: ' + k); }
function ppAct(fn){ E('PP.' + fn); const k = koPP(); if(k) throw Error('PP: ' + k); }
const lastReg = () => S().registrazioni.at(-1);
function rowsOf(r){ return r.righe.map(x => `${x.dareAvere==='DARE'?'D':'A'} ${x.conto}${x.centroCostoId?'/'+x.centroCostoId:''} ${x.importo.toFixed(2)}`).join(' · '); }
function rec(label, r){ r = r || lastReg(); out[label] = {id:r.id, data:r.data, righe:rowsOf(r)}; }
function bal(cutoff){ return E(`FI.balances(${cutoff?JSON.stringify(cutoff):'null'})`); }
function saldo(c, cutoff){ return ((bal(cutoff)[c]||0)/100); }
function dumpBal(){ try{ const b = bal(); console.error(Object.entries(b).filter(([k,v])=>v).map(([k,v])=>k+':'+(v/100)).join('  ')); }catch(e){} }
// FI piani
function fiPost(planExpr){ const p = E(planExpr); W.__p = p; E('FI.post(window.__p)'); return lastReg(); }
function trPost(planExpr){ const p = E(planExpr); W.__p = p; E('Treasury.post(window.__p)'); return lastReg(); }
function axPost(planExpr){ const p = E(planExpr); W.__p = p; E('AssetExtra.post(window.__p)'); return lastReg(); }
function qPost(kind, input){ W.__in = input; const p = E(`FIQuattro.preview(${JSON.stringify(kind)}, window.__in)`); W.__p = p; const r = E('FIQuattro.post(window.__p)'); return r; }
function cvPost(kind, input){ W.__in = input; const p = E(`Civilistico.preview(${JSON.stringify(kind)}, window.__in)`); W.__p = p; E('Civilistico.post(window.__p)'); return lastReg(); }
function items(d){ return E(`Treasury.items(${JSON.stringify(d)})`); }
function itemKey(d, pred, label){ const it = items(d).find(pred); if(!it) throw Error('partita non trovata: ' + label + '\n' + items(d).map(x=>x.key+' '+x.conto+' '+x.descrizione+' '+x.residuo).join('\n')); return it.key; }
function settle(d, ref, allocs){ W.__a = allocs; return trPost(`Treasury.planSettlement(${JSON.stringify(d)}, window.__a, ${JSON.stringify(ref)})`); }
const byDesc = (txt, conto) => x => x.descrizione.includes(txt) && (!conto || x.conto === conto);

// ======================= PASSO 0 — azienda nuova =======================
step('0 preset azienda nuova', () => {
  E("cambiaVista('fi')");
  setFI('fi-costituzione', '2026-12-01');
  E('FI.newCompany()');
  W = H.reload();
  if(S().fi.costituzione !== '2026-12-01' || S().fi.preset !== 'nuova') throw Error('costituzione non salvata');
  out.preset = {registrazioni:S().registrazioni.length, fornitori:S().sdmm.fornitori.length, clienti:S().sdmm.clienti.length, centri:S().centriDiCosto.map(c=>c.nome+' '+E(`tariffaOraria(STATO.centriDiCosto.find(x=>x.id==${c.id}))`)).join(', ')};
});
// ======================= PASSO 1 — standard, budget =======================
step('1 verifica standard', () => {
  out.costoStd = E('costoStandardTransenna()');
  const st = E('PP.struttura()');
  out.stdFasi = {SL:st.sl.costoUnitario, PIEGA:st.piega.costoUnitario, PF:st.pf.costoUnitario};
  if(Math.abs(out.costoStd - 31.4) > 1e-9) throw Error('costo std ' + out.costoStd);
});
step('1 budget annuo', () => {
  E("cambiaVista('budget')");
  setFI('bud-volume', 200); setFI('bud-prezzo', 60);
  E('salvaBudgetAnnuo(true)');
  if(S().budgetAnnuo.volumeAnnuoPianificato !== 200 || S().budgetAnnuo.prezzoVenditaStandard !== 60) throw Error('budget non salvato');
});
step('1 budget CO dicembre', () => {
  const p = E("BudgetPool.plan('2026-12')"); W.__p = p; E('BudgetPool.save(window.__p)');
  out.budgetCO = p.centri.map(c => `${c.nome}: P ${c.p/100} G ${c.g/100} ore ${c.ore}`);
  if(S().registrazioni.length) throw Error('budget ha scritto FI');
});
// ======================= PASSO 2 — capitale, cespiti, incremento =======================
step('2 capitale', () => { rec('capitale', fiPost("FI.capital('2026-12-01', 80000, 'COSTITUZIONE-2026', false)")); });
const asset = (codice, nome, fattura, costo, centro, funz) =>
  fiPost(`FI.asset('2026-12-01', {codice:'${codice}', nome:'${nome}', fornitore:'Macchine Alfa Srl', fattura:'${fattura}', costo:'${costo}', iva:'22', funzione:'${funz}', aliquota:'10', centro:'${centro}'})`);
step('2 cespiti', () => {
  const id = n => S().centriDiCosto.find(c => c.nome === n).id;
  rec('SEG-1', asset('SEG-1','Sega automatica tubi','M-SEG-1',12000,id('Taglio'),'2026-12-01'));
  rec('SAL-1', asset('SAL-1','Saldatrice','M-SAL-1',8000,id('Saldatura'),'2026-12-01'));
  rec('PIE-1', asset('PIE-1','Piegatrice','M-PIE-1',6000,id('Piegatura'),'2026-12-05'));
});
step('2b incremento piegatrice prima dell uso', () => {
  const pie = E("AssetExtra.assets()").find(a => a.codice === 'PIE-1');
  const r = qPost('ASSET_INCREMENT', {data:'2026-12-03', ref:'INST-PIE-1', asset:String(pie.regId), amount:'400', vat:'22', party:'Macchine Alfa Srl', document:'M-INST-1', functionDate:'2026-12-05'});
  rec('incremento', lastReg());
});
// ======================= PASSO 3 — fatture servizi iniziali =======================
const svc = x => trPost(`Treasury.planServiceInvoice(${JSON.stringify(x)})`);
step('3 ASS-1 e SV-1', () => {
  rec('ASS-1', svc({type:'acquisto', data:'2026-12-01', dueDate:'2026-12-31', party:'Assicurazioni Gamma SpA', invoiceRef:'ASS-1', account:'53', amount:'1200', vatRate:'0', centroCostoId:''}));
  rec('SV-1', svc({type:'vendita', data:'2026-12-01', dueDate:'2026-12-31', party:'Eventi Sigma Srl', invoiceRef:'SV-1', account:'42', amount:'620', vatRate:'22', economicNature:'ACCESSORY'}));
});
step('3 pagamento ASS-1 02/12', () => {
  const k = itemKey('2026-12-02', byDesc('ASS-1','20'), 'ASS-1');
  rec('PAG-ASS', settle('2026-12-02', 'PAG-ASS', [{key:k, amount:1200}]));
});
// ======================= PASSO 4 — anagrafiche e ordini =======================
step('4 anagrafiche', () => {
  E("cambiaVista('sdmm')"); E("SDMM.vai('anag')");
  setSD('nf-nome','Ferro Rossi Srl'); setSD('nf-citta','06100 Perugia (PG)'); setSD('nf-gg','30'); sdAct('aggiungiFornitore()');
  for(const [n,c,gg,inc,fido,ri] of [['Beta Costruzioni Srl','06100 Perugia (PG)',30,'EXW',30000,'B'],['Delta Noleggi Srl','50100 Firenze (FI)',30,'DAP',20000,'B']]){
    setSD('nc-nome',n); setSD('nc-citta',c); setSD('nc-gg',gg); setSD('nc-inc',inc); setSD('nc-fido',fido); setSD('nc-risc',ri); sdAct('aggiungiCliente()');
  }
  out.anag = {fornitori:S().sdmm.fornitori.map(f=>f.id+' '+f.nome), clienti:S().sdmm.clienti.map(c=>c.id+' '+c.nome)};
});
const cli = n => S().sdmm.clienti.find(c => c.nome.startsWith(n)).id;
step('4 ordini di vendita VA01', () => {
  E("SDMM.vai('ordini')");
  for(const [c, po, q, p] of [['Beta','BETA-120',120,60],['Delta','DELTA-80',80,62]]){
    setSD('o-cli', cli(c)); setSD('o-po', po); setSD('o-data','2026-12-29'); setSD('o-com',''); setSD('o-qty', q); setSD('o-prezzo', p);
    sdAct('salvaOrdine()');
  }
  out.ordini = S().sdmm.ordini.map(o => `${o.id} ${o.cliId} ${o.qty}×${o.prezzo}`);
});
const ordOf = c => S().sdmm.ordini.find(o => o.cliId === cli(c)).id;
step('4 ATP carenza', () => {
  E("SDMM.vai('ctrl')");
  for(const c of ['Beta','Delta']){ E(`SDMM.selOrd('ctrl','${ordOf(c)}')`); sdAct('esegui()'); }
  const txt = sdR().getElementById('sd-body').textContent;
  out.atp = {nonDisponibile: /NON DISPONIBILE/.test(txt), fabbisogno: E('Fabbisogno.info()')};
});
step('4 commessa COM-200', () => {
  E("cambiaVista('pp')"); E("PP.vai('co01')");
  setPP('pp-com-codice','COM-200'); setPP('pp-com-descrizione','Produzione 200 transenne — Beta 120 + Delta 80'); setPP('pp-com-quantita','200');
  E("creaCommessaRapida('pp')");
  if(!S().commesse.length) throw Error('commessa non creata');
});
// ======================= PASSO 5 — macchine pagate, ferro =======================
step('5 pagamento macchine 10/12', () => {
  const d = '2026-12-10', its = items(d);
  const keys = ['M-SEG-1','M-SAL-1','M-PIE-1'].map(f => its.find(x => x.conto==='20' && x.descrizione.includes(f)));
  const inc = its.find(x => x.conto==='20' && /INST-PIE|ASSET_INCREMENT/.test(x.descrizione));
  if(keys.some(k=>!k) || !inc) throw Error('partite macchine: ' + its.map(x=>x.descrizione).join(' | '));
  out.partiteMacchine = [...keys, inc].map(x => x.descrizione + ' ' + x.residuo);
  rec('PAG-MACCHINE', settle(d, 'PAG-MACCHINE', [...keys, inc].map(x => ({key:x.key, amount:x.residuo}))));
});
step('5 ODA MIGO MIRO ferro', () => {
  E("cambiaVista('sdmm')"); E("SDMM.vai('po')");
  setSD('po-f', S().sdmm.fornitori[0].id); setSD('po-qty','2400'); setSD('po-prezzo','1'); setSD('po-data','2026-12-10'); sdAct('creaPO()');
  const po = S().sdmm.po[0].id;
  E("SDMM.vai('migo')"); E(`SDMM.selPO('migo','${po}')`); setSD('mg-qty','2400'); setSD('mg-ddt','DDT-10'); setSD('mg-data','2026-12-10'); sdAct('faiMIGO()'); rec('MIGO');
  E("SDMM.vai('miro')"); E(`SDMM.selPO('miro','${po}')`); setSD('mr-num','F-10'); setSD('mr-data','2026-12-10'); setSD('mr-qty','2400'); setSD('mr-prezzo','1'); sdAct('faiMIRO()'); rec('MIRO');
});
// ======================= PASSO 6 — factoring pro soluto SV-1 =======================
step('6 factoring pro soluto SV-1', () => {
  const k = itemKey('2026-12-10', byDesc('SV-1','11'), 'SV-1');
  out.svKey = k;
  qPost('FACTOR_START', {data:'2026-12-10', ref:'FACT-SV1', invoiceKey:k, amount:'756.40', mode:'SOLUTO', factor:'Factor Italia SpA', riskTransferred:true, riskEvidence:'Contratto pro soluto FI-2026-07: rischio di insolvenza trasferito al factor'}); rec('FACTOR_START');
  qPost('COST', {data:'2026-12-10', ref:'ONERI-FACT-SV1', contract:'FACT-SV1', amount:'15', document:'NC-FACT-1210', reason:'Commissione factoring pro soluto', newCost:true, timing:'BANK', party:''}); rec('COST_FACT');
  qPost('FACTOR_COLLECT', {data:'2026-12-20', ref:'INC-FACT-SV1', contract:'FACT-SV1', amount:'756.40', settlementMode:'BANK_GROSS'}); rec('FACTOR_COLLECT');
  qPost('CONTRACT_CLOSE', {data:'2026-12-20', ref:'CHIUSO-FACT-SV1', contract:'FACT-SV1'});
});
// ======================= PASSO 7 — produzione a tre ordini =======================
const ppOrd = mat => S().pp.ordini.find(o => o.materiale === mat).id;
function creaFase(tipo, q, d){ E("cambiaVista('pp')"); E("PP.vai('co01')"); setPP('co-mat', tipo); setPP('co-com', String(S().commesse[0].id)); setPP('co-qty', q); setPP('co-data', d); setPP('co-fine', d); ppAct('creaOrdine()'); }
function prelievo(mat, q, d){ const id = ppOrd(mat); E(`PP.sel('${id}')`); E("PP.vai('mb261')"); setPP('mb-ord', id); setPP('mb-qty', q); setPP('mb-data', d); ppAct('prelievo()'); }
function conferma(mat, buoni, ore, d){ const id = ppOrd(mat); E(`PP.sel('${id}')`); E("PP.vai('co11n')"); setPP('cn-ord', id); setPP('cn-data', d); setPP('cn-buoni', buoni); setPP('cn-scarto', 0); Object.entries(ore).forEach(([op,h]) => setPP('cn-ore-'+op, h)); setPP('cn-fin', true); ppAct('conferma()'); }
function entrata(mat, q, d){ const id = ppOrd(mat); E(`PP.sel('${id}')`); E("PP.vai('mb101')"); setPP('gr-ord', id); setPP('gr-qty', q); setPP('gr-data', d); setPP('gr-fin', true); ppAct('entrata()'); }
step('7 Taglio 15/12', () => {
  creaFase('SL', 200, '2026-12-15'); out.ordSL = ppOrd('SL-TAGLIO');
  prelievo('SL-TAGLIO', '1600', '2026-12-15'); rec('261 ferro');
  conferma('SL-TAGLIO', 200, {OP0010:55}, '2026-12-15'); rec('CO11N taglio');
  entrata('SL-TAGLIO', 200, '2026-12-15'); rec('101 SL-TAGLIO');
});
step('7 Piegatura 18/12', () => {
  creaFase('PIEGA', 200, '2026-12-18'); out.ordPIEGA = ppOrd('SL-PIEGA');
  prelievo('SL-PIEGA', '200', '2026-12-18'); rec('261 SL-TAGLIO');
  conferma('SL-PIEGA', 200, {OP0015:44}, '2026-12-18'); rec('CO11N piega');
  entrata('SL-PIEGA', 200, '2026-12-18'); rec('101 SL-PIEGA');
});
step('7b pagamento parziale ferro 20/12', () => {
  const k = itemKey('2026-12-20', byDesc('F-10','20'), 'F-10'); rec('PAG-FERRO-PARZ', settle('2026-12-20','PAG-FERRO-PARZIALE',[{key:k, amount:1000}]));
});
step('7 Saldatura 21-29/12', () => {
  creaFase('PF', 200, '2026-12-21'); out.ordPF = ppOrd('TRANSENNA');
  prelievo('TRANSENNA', '200', '2026-12-21'); rec('261 SL-PIEGA');
  conferma('TRANSENNA', 200, {OP0020:88}, '2026-12-29'); rec('CO11N saldatura');
  entrata('TRANSENNA', 200, '2026-12-29'); rec('101 TRANSENNA');
  out.giacenze = {FERRO:E("SDMM.giacenza('FERRO')"), SL:E("SDMM.giacenza('SL-TAGLIO')"), PIEGA:E("SDMM.giacenza('SL-PIEGA')"), PF:E("SDMM.giacenza('TRANSENNA')"), s12:saldo('12'), s16:saldo('16'), s161:saldo('161'), s13:saldo('13')};
});
// ======================= PASSO 8 — acconto IRES =======================
step('8 acconto IRES 28/12', () => { rec('ACC-IRES', fiPost("Annual.advanceTaxPlan('2026-12-28', 100, 'ACC-IRES')")); });
// ======================= PASSO 9 — vendite 29/12 =======================
step('9 conferma, picking, DDT, fattura', () => {
  E("cambiaVista('sdmm')");
  for(const c of ['Beta','Delta']){
    const id = ordOf(c), q = c==='Beta'?120:80;
    E("SDMM.vai('ctrl')"); E(`SDMM.selOrd('ctrl','${id}')`); sdAct('esegui()');
    setSD('c-qta', q); setSD('c-data', '2026-12-29'); sdAct('confermaOrdine()');
    E("SDMM.vai('pick')"); E(`SDMM.selOrd('pick','${id}')`); setSD('pk-qty', q); setSD('pk-data','2026-12-29'); sdAct('faiPicking()');
    E("SDMM.vai('ddt')"); E(`SDMM.selOrd('ddt','${id}')`); setSD('dd-qty', q); setSD('dd-data','2026-12-29'); setSD('dd-vet','Trasporti Gamma'); sdAct('faiDDT()'); rec('DDT '+c);
    E("SDMM.vai('fatt')"); E(`SDMM.selOrd('fatt','${id}')`); setSD('fa-data','2026-12-29'); sdAct('generaFattura()');
    const f = S().sdmm.fatture.at(-1); sdAct(`rilascia('${f.id}')`); rec('FATT '+c);
  }
});
step('9 RiBa Beta SBF', () => {
  const k = itemKey('2026-12-29', x => x.conto==='11' && x.party.startsWith('Beta'), 'fattura Beta');
  out.betaKey = k;
  qPost('RIBA_PRESENT', {data:'2026-12-29', ref:'RIBA-BETA', invoiceKey:k, amount:'8784', dueDate:'2027-01-28'});
  qPost('RIBA_ADVANCE', {data:'2026-12-29', ref:'ANT-RIBA-BETA', contract:'RIBA-BETA', amount:'7000'}); rec('RIBA_ADVANCE');
  qPost('COST', {data:'2026-12-29', ref:'ONERI-RIBA-BETA', contract:'RIBA-BETA', amount:'15', document:'CONT-RIBA-1229', reason:'Commissioni presentazione RiBa', newCost:true, timing:'BANK', party:''}); rec('COST_RIBA');
});
step('9 anticipo fattura Delta', () => {
  const k = itemKey('2026-12-29', x => x.conto==='11' && x.party.startsWith('Delta'), 'fattura Delta');
  out.deltaKey = k;
  rec('ANT-DELTA', trPost(`Treasury.planAdvance('2026-12-29', ${JSON.stringify(k)}, 4800, 'ANT-DELTA', 30)`));
});
step('9 incasso parziale Delta 30/12', () => {
  rec('INC-DELTA-PARZ', settle('2026-12-30','INC-DELTA-PARZIALE',[{key:out.deltaKey, amount:2000}]));
});
// ======================= PASSO 10 — cessioni 30/12 =======================
step('10 cessioni Sega e Saldatrice', () => {
  for(const [cod, prezzo, ref] of [['SEG-1',15000,'CESS-SEG'],['SAL-1',6000,'CESS-SAL']]){
    const a = E("AssetExtra.assets()").find(x => x.codice === cod);
    rec('AMM-'+cod, axPost(`AssetExtra.depreciationAtDisposal('2026-12-30', ${a.regId})`));
    W.__x = {assetRegId:a.regId, mode:'SALE', riferimento:ref, descrizione:'Rinnovo impianti dopo completamento produzione', data:'2026-12-30', proceeds:prezzo, vatRate:22, counterparty:'Usato Epsilon Srl', invoiceRef:ref, dueDate:'2027-01-15', zeroDepreciationReason:''};
    const p = E("AssetExtra.disposal('2026-12-30', window.__x)"); W.__p = p; E('AssetExtra.post(window.__p)'); rec(ref);
    out[ref+'_dett'] = p.detail.assetExtra.disposal;
  }
});
// ======================= PASSO 11 — rimborso parziale anticipo 31/12 =======================
step('11 rimborso parziale anticipo Delta', () => {
  const loan = items('2026-12-31').find(x => x.conto==='36');
  rec('RIM-DELTA-PARZ', trPost(`Treasury.planRepay('2026-12-31', ${loan.regId}, 2000, 'RIM-DELTA-PARZIALE', 0, {})`));
});
// ======================= PASSO 12 — paghe, energia =======================
step('12 dipendenti e paghe', () => {
  E("cambiaVista('fi')");
  const id = n => S().centriDiCosto.find(c => c.nome === n).id;
  for(const [n, c] of [['Ada','Taglio'],['Bea','Saldatura'],['Ciro','Piegatura']]) S().fi.dipendenti.push({id:S().fi.nextDip++, nome:n, centro:String(id(c)), lordo:2000, irpef:20, inpsDip:9.19, inpsAz:30, tfr:7.407407});
  E('salvaStato()');
  const r = fiPost("FI.payroll('2026-12', STATO.fi.dipendenti.map(e=>e.id))"); rec('PAGHE', r);
  out.cedolini = r.fi.cedolini.map(c => `${c.nome}: lordo ${c.lordo/100} netto ${c.netto/100} irpef ${c.irpef/100} inps ${(c.dip+c.azi)/100} tfr ${c.tfr/100} costo ${c.costo/100}`);
});
step('12 energia', () => {
  const id = n => String(S().centriDiCosto.find(c => c.nome === n).id);
  for(const [f,c] of [['E-T','Taglio'],['E-P','Piegatura'],['E-S','Saldatura']]) rec('EN '+f, svc({type:'acquisto', data:'2026-12-31', dueDate:'2027-01-15', party:'Energia Gamma SpA', invoiceRef:f, account:'52', amount:'500', vatRate:'22', centroCostoId:id(c)}));
});
// ======================= PASSO 13 — sopravvenienze e competenza servizi =======================
step('13 sopravvenienze', () => {
  for(const [kind, party, doc, amt] of [['ATTIVA','Assicurazioni Gamma SpA','IND-ATT',500],['PASSIVA','Trasporti Gamma Srl','IND-PASS',200]]){
    W.__x = {kind, reason:'NUOVO_FATTO_CORRENTE', data:'2026-12-31', factDate:'2026-12-31', counterparty:party, documentRef:doc, dueDate:'2027-01-15', amount:amt, riferimento:doc, descrizione: kind==='ATTIVA'?'Indennizzo documentato fuori campo IVA (ipotesi)':'Risarcimento documentato fuori campo IVA (ipotesi)'};
    const p = E('AssetExtra.sopravvenienza(window.__x)'); W.__p = p; E('AssetExtra.post(window.__p)'); rec(doc);
  }
});
step('13 fatture da ricevere / emettere', () => {
  rec('DA-RICEVERE', cvPost('RICEVERE', {data:'2026-12-31', ref:'MAN-DIC', party:'Officina Rossi Impianti', evidence:'Rapporto intervento n. 58 del 28/12 firmato', completedDate:'2026-12-28', amount:'300', account:'53', centroCostoId:''}));
  rec('DA-EMETTERE', cvPost('EMETTERE', {data:'2026-12-31', ref:'COLL-BETA', party:'Beta Costruzioni Srl', evidence:'Verbale di collaudo transenne firmato 30/12', completedDate:'2026-12-30', amount:'250', account:'42', centroCostoId:''}));
});
// ======================= PASSO 14 — assestamenti =======================
step('14 AFAB', () => { const r = axPost("AssetExtra.depreciation('2026')"); rec('AFAB', r); });
step('14 ratei e risconti', () => {
  const src = t => S().registrazioni.find(r => r.descrizione.includes(t)).id;
  const adj = x => fiPost(`FI.adjustment(${JSON.stringify(x)})`);
  rec('RISC-ATT', adj({tipo:'RISCONTO_ATTIVO', data:'2026-12-31', inizio:'2026-12-01', fine:'2027-11-30', importo:'1200', rif:'ASS-1', conto:'53', fonte:String(src('ASS-1'))}));
  rec('RISC-PASS', adj({tipo:'RISCONTO_PASSIVO', data:'2026-12-31', inizio:'2026-12-01', fine:'2027-01-31', importo:'620', rif:'SV-1', conto:'42', fonte:String(src('SV-1'))}));
  rec('RATEO-ATT', adj({tipo:'RATEO_ATTIVO', data:'2026-12-31', inizio:'2026-12-01', fine:'2027-01-31', importo:'620', rif:'SV-2', conto:'42', fonte:''}));
  rec('RATEO-PASS', adj({tipo:'RATEO_PASSIVO', data:'2026-12-31', inizio:'2026-12-01', fine:'2027-01-31', importo:'620', rif:'NOL-1', conto:'53', fonte:''}));
});
// ======================= PASSO 15 — TECO, CO88 e checkpoint =======================
step('15 TECO + CO88', () => {
  E("cambiaVista('pp')");
  for(const m of ['SL-TAGLIO','SL-PIEGA','TRANSENNA']){ const id = ppOrd(m); E(`PP.sel('${id}')`); E("PP.vai('co03')"); setPP('te-data','2026-12-31'); ppAct(`teco('${id}')`); }
  E("PP.vai('co88')"); setPP('cp-per','2026-12'); ppAct('chiudiPeriodo()');
  const k = S().registrazioni.filter(r => r.tipo === 'PP_KO88');
  out.varianze = k.map(r => r.descrizione.slice(0,50) + ' → ' + rowsOf(r));
  out.varTot = k.reduce((t,r)=>t+r.righe.filter(x=>x.conto==='61').reduce((s,x)=>s+(x.dareAvere==='DARE'?x.importo:-x.importo),0),0);
  out.wipCO88 = S().registrazioni.filter(r => r.tipo === 'PP_WIP').length;
  out.utilePreCheckpoint = E("Annual.snapshot(2026,'2026-12-31')").profit/100;
});
step('15 annulla e richiudi CO88', () => {
  E("PP.vai('co88')"); ppAct('annullaPeriodo()'); ppAct('annullaPeriodo(true)');
  E("PP.vai('co88')"); setPP('cp-per','2026-12'); ppAct('chiudiPeriodo()');
  out.utilePostCheckpoint = E("Annual.snapshot(2026,'2026-12-31')").profit/100;
});
// ======================= PASSO 16 — IVA, IRES, bilancio =======================
step('16 IVA dicembre', () => { const r = fiPost("Annual.vatPlan('2026-12')"); rec('IVA', r); out.iva = r.fi.fiscal; });
step('16 IRES', () => {
  const p = E("Annual.taxPlan(2026, {rate:24, positive:0, negative:0, loss:0, note:'IRES didattica; variazioni manuali da validare'})");
  out.ires = p.detail.fiscal; W.__p = p; E('Annual.postTax(window.__p)'); rec('IRES');
});
step('16 bilancio 31/12', () => {
  const s = E("Annual.snapshot(2026,'2026-12-31')");
  out.bilancio = {attivo:s.assets/100, passivo:s.liabilities/100, pn:s.equity/100, utile:s.profit/100, delta:s.delta/100};
  const b = s.balances, g = c => (b[c]||0)/100;
  out.saldi = Object.fromEntries(Object.entries(b).filter(([k,v])=>v).map(([k,v])=>[k, v/100]));
  out.econ = Object.fromEntries(Object.entries(s.economic).filter(([k,v])=>v).map(([k,v])=>[k, v/100]));
  out.civil = E("Civilistico.report('2026-12-31')");
  out.readiness = E('Annual.readiness(2026)').issues;
  out.rec = E("Treasury.reconciliation('2026-12-31')");
  out.diag = E("Treasury.diagnostics('2026-12-31')");
  out.registroCespiti = E("FIQuattro.register('2026-12-31')");
});
step('16 chiusura e riapertura', () => {
  const p = E('Annual.closePlan(2026)'); W.__p = p; E('Annual.close(window.__p)');
  const o = E('Annual.reopenPlan(2026)'); W.__p = o; E('Annual.reopen(window.__p)');
  out.riapertura = rowsOf(lastReg());
});
// ======================= PASSO 17 — 2027 =======================
step('17 storni rettifiche 02/01', () => {
  for(const t of ['RISCONTO ATTIVO','RISCONTO PASSIVO','RATEO ATTIVO','RATEO PASSIVO']){
    const r = S().registrazioni.find(x => x.descrizione.startsWith(t) && x.fi?.rettifica);
    rec('STORNO '+t, fiPost(`FI.reversal(${r.id}, '2027-01-02')`));
  }
});
step('17 fatture collegate gennaio', () => {
  const src = ref => S().registrazioni.find(r => r.fi?.civilistico?.input?.ref === ref).id;
  rec('FV collaudo', cvPost('FATTURA', {data:'2027-01-10', ref:'FV-COLL-BETA', party:'Beta Costruzioni Srl', evidence:'Fattura FV-27-001 emessa', source:String(src('COLL-BETA')), invoiceRef:'FV-27-001', dueDate:'2027-01-31', vatRate:'22'}));
  rec('FR manutenzione', cvPost('FATTURA', {data:'2027-01-12', ref:'FR-MAN-DIC', party:'Officina Rossi Impianti', evidence:'Fattura MAN-27-01 ricevuta', source:String(src('MAN-DIC')), invoiceRef:'MAN-27-01', dueDate:'2027-01-31', vatRate:'22'}));
});
step('17 incassi 15/01', () => {
  const d = '2027-01-15', its = items(d);
  const pick = (pred, l) => { const x = its.find(pred); if(!x) throw Error('manca ' + l + '\n' + its.map(i=>i.key+' '+i.conto+' '+i.descrizione+' '+i.residuo).join('\n')); return {key:x.key, amount:x.residuo, l, d:x.descrizione}; };
  const a = [pick(x=>x.key===out.deltaKey,'Delta'), pick(x=>x.conto==='11'&&x.descrizione.includes('SEG-1'),'SEG'), pick(x=>x.conto==='11'&&x.descrizione.includes('SAL-1'),'SAL'), pick(x=>x.conto==='11'&&x.descrizione.includes('Indennizzo'),'IND-ATT'), pick(x=>x.conto==='11'&&x.descrizione.includes('Fattura collegata'),'collaudo')];
  out.incassi15 = a.map(x => x.l + ' ' + x.amount);
  rec('INCASSI-15-01', settle(d, 'INCASSI-SALDI-2027', a.map(x => ({key:x.key, amount:x.amount}))));
});
step('17 pagamenti 15/01', () => {
  const d = '2027-01-15', its = items(d);
  const sel = its.filter(x => ['20','22'].includes(x.conto) && x.settlementAllowed);
  out.pagamenti15 = sel.map(x => x.conto + ' ' + x.descrizione + ' ' + x.residuo);
  rec('PAGAMENTI-15-01', settle(d, 'PAGAMENTI-FORNITORI-PAGHE-2027', sel.map(x => ({key:x.key, amount:x.residuo}))));
});
step('17 rimborso saldo anticipo Delta 15/01', () => {
  const loan = items('2027-01-15').find(x => x.conto==='36');
  rec('RIM-DELTA-SALDO', trPost(`Treasury.planRepay('2027-01-15', ${loan.regId}, ${loan.residuo}, 'RIM-DELTA-SALDO', 20, {newCostConfirmed:true, costDocument:'EC-ANT-0115', costReason:'Interessi anticipo fattura da estratto conto'})`));
});
step('17 enti e IVA 18/01', () => {
  const d = '2027-01-18', its = items(d);
  const sel = its.filter(x => ['25','26','28'].includes(x.conto) && x.settlementAllowed);
  out.pagamenti18 = sel.map(x => x.conto + ' ' + x.descrizione + ' ' + x.residuo);
  rec('ENTI-IVA-18-01', settle(d, 'PAGAMENTI-ENTI-IVA-2027', sel.map(x => ({key:x.key, amount:x.residuo}))));
});
step('17 RiBa scadenza e incasso 28/01', () => {
  qPost('RIBA_DUE', {data:'2027-01-28', ref:'SCAD-RIBA-BETA', contract:'RIBA-BETA'});
  qPost('RIBA_COLLECT', {data:'2027-01-28', ref:'INC-RIBA-BETA', contract:'RIBA-BETA', amount:'8784', settlementMode:'NET_CAPITAL'}); rec('RIBA_COLLECT');
  qPost('COST', {data:'2027-01-28', ref:'INT-RIBA-BETA', contract:'RIBA-BETA', amount:'35', document:'EC-RIBA-0128', reason:'Interessi anticipo SBF da estratto conto', newCost:true, timing:'BANK', party:''}); rec('COST_RIBA_INT');
  qPost('CONTRACT_CLOSE', {data:'2027-01-28', ref:'CHIUSO-RIBA-BETA', contract:'RIBA-BETA'});
});
step('17 saldo IRES 30/06', () => {
  const k = itemKey('2027-06-30', x => x.conto==='29', 'IRES'); const it = items('2027-06-30').find(x=>x.key===k);
  rec('SALDO-IRES', settle('2027-06-30','SALDO-IRES-2026',[{key:k, amount:it.residuo}]));
});
step('17 controlli finali', () => {
  out.banca = {'2026-12-31':saldo('10','2026-12-31'), '2027-01-15':saldo('10','2027-01-15'), '2027-01-18':saldo('10','2027-01-18'), '2027-01-28':saldo('10','2027-01-28'), '2027-06-30':saldo('10','2027-06-30')};
  out.aperte = items('2027-06-30').map(x => x.conto + ' ' + x.descrizione + ' ' + x.residuo);
  out.bil2026dopo = E("Annual.snapshot(2026,'2026-12-31')").profit/100;
  out.contratti = E('FIQuattro.contracts()').map(c => c.id + ' closed=' + c.closed);
  out.saldi2027 = Object.fromEntries(Object.entries(bal('2027-06-30')).filter(([k,v])=>v).map(([k,v])=>[k, v/100]));
});
H.save();
require('fs').writeFileSync(__dirname + '/risultati.json', JSON.stringify(out, null, 1));
require('fs').writeFileSync(__dirname + '/stato-finale.json', JSON.stringify({format:'FerroTransenne-FI-2026', stato:S()}));
console.log('✅ tutti i passi: ' + steps.length);

// ---- Numeri di controllo della guida: se il simulatore cambia, il test lo segnala ----
const atteso = {varTot:476, utile:1611.43, ires:508.87, banca2026:57988.40, banca30giu:74095.13};
const reale = {varTot:out.varTot, utile:out.bilancio.utile, ires:out.ires.calc.tax/100, banca2026:out.saldi['10'], banca30giu:out.banca['2027-06-30']};
const diff = Object.keys(atteso).filter(k => Math.abs(atteso[k] - reale[k]) > 0.005);
if(diff.length || out.readiness.length){ console.error('❌ Numeri diversi dalla guida:', diff.map(k => `${k} atteso ${atteso[k]} reale ${reale[k]}`).join('; '), out.readiness); process.exit(1); }
console.log('✅ Numeri della guida confermati:', JSON.stringify(reale));
