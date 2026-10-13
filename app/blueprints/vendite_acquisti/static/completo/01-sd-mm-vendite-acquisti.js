/* Generato da tools/split_simulatore.py (completo) — non modificare a mano: modifica sorgenti/ e rilancia. */
/* ═══════════════════════════════════════════════════════════════════════
   SDMM — Modulo Vendite (SD) e Acquisti (MM), innestato in "Ferro & Transenne".
   ───────────────────────────────────────────────────────────────────────
   • Isolato: vive in uno Shadow DOM (nessun CSS/ID condiviso con il resto).
   • Collegato: NON ha una contabilità propria. Ogni documento che muove valore
     (DDT, fattura attiva, MIGO, MIRO, incasso, pagamento) scrive UNA scrittura
     in STATO.registrazioni, cioè nello stesso Libro Giornale da cui leggono
     Mastro, Bilancio di Verifica, Report Commesse e Controllo Mensile.
   • Il costo standard NON viene ricalcolato qui: si usano costoStandardTransenna(),
     distintaBase.costoFerro e budgetAnnuo.prezzoVenditaStandard del simulatore.
   • Anti-duplicazione: ogni scrittura porta origineSD:{tipo,id}; postDoc() rifiuta
     di scrivere due volte lo stesso documento.
   ═══════════════════════════════════════════════════════════════════════ */
window.SDMM = (function(){
'use strict';

// ───────────────────────── stato e migrazione ─────────────────────────
function def(){
  return {
    struttura:{ stabilimento:'1000', magazzino:'0001', puntoSpedizione:'1000', puntoCarico:'LP01', areaVendite:'1000/10/20' },
    clienti:[
      {id:'C-001', nome:'ENOROSSI Grande Distribuzione SpA', citta:'40138 Bologna (BO)', piva:'IT02345678901', pagamentoGg:60, incoterms:'DAP', fido:300000, fidoBase:300000, rischio:'B'},
      {id:'C-002', nome:'Edilizia Bianchi Srl (cantiere Via Roma)', citta:'06012 Città di Castello (PG)', piva:'IT09876543210', pagamentoGg:30, incoterms:'EXW', fido:8000, fidoBase:8000, rischio:'C'},
      {id:'C-003', nome:'Comune di Perugia — Lavori Pubblici', citta:'06121 Perugia (PG)', piva:'IT03456789012', pagamentoGg:60, incoterms:'DAP', fido:80000, fidoBase:80000, rischio:'A'},
      {id:'C-004', nome:'Verdi Noleggi Eventi Srl', citta:'50123 Firenze (FI)', piva:'IT04567890123', pagamentoGg:45, incoterms:'FCA', fido:35000, fidoBase:35000, rischio:'B'},
      {id:'C-005', nome:'Conti Sicurezza Stradale Srl', citta:'52100 Arezzo (AR)', piva:'IT05678901234', pagamentoGg:60, incoterms:'EXW', fido:6000, fidoBase:6000, rischio:'C'},
    ],
    fornitori:[
      {id:'F-001', nome:'Acciaierie Rossi Srl', citta:'25100 Brescia (BS)', piva:'IT01122334455', pagamentoGg:30},
      {id:'F-002', nome:'Ferro Umbria Commerciale SpA', citta:'05100 Terni (TR)', piva:'IT02233445566', pagamentoGg:60},
      {id:'F-003', nome:'Siderurgica Toscana Srl', citta:'59100 Prato (PO)', piva:'IT03344556677', pagamentoGg:45},
      {id:'F-004', nome:'Metalli Nord Import Srl', citta:'20100 Milano (MI)', piva:'IT04455667788', pagamentoGg:30},
    ],
    // Quando nasce il costo del venduto (41/13): 'FATTURA' = nella scrittura della fattura, come in Nuova Registrazione · 'DDT' = con l'uscita merci, come in SAP
    // Acquisti: 'MIRO' = tutto nella scrittura della fattura fornitore (12 a standard / 20 / 62 / 14), come in Nuova Registrazione · 'MIGO' = entrata merci e fattura separate con conto ponte GR/IR, come in SAP
    opz:{cdv:'DDT', acq:'MIGO', v:2},   // di default il criterio SAP: costo del venduto all'uscita merci (DDT), acquisti con entrata merci e conto ponte GR/IR (MIGO)
    ordini:[], rfq:[], po:[], pick:[], ddt:[], fatture:[], migo:[], miro:[],
    creditLog:[],   // registro delle decisioni del Credit Manager
    cnt:{so:10000000, cf:20000000, pk:30000000, dl:80000000, bl:90000000, rfq:60000000, po:45000000, mg:50000000, mr:51000000},
  };
}
// Chiamata da caricaStato() su ogni stato (nuovo o salvato): aggiunge SOLO ciò che manca.
function migra(s){
  if(!s.sdmm) s.sdmm = def();
  else{
    const d = def(), sd = s.sdmm, opzVecchia = sd.opz;
    Object.keys(d).forEach(k => { if(sd[k] === undefined) sd[k] = d[k]; });
    Object.keys(d.cnt).forEach(k => { if(sd.cnt[k] === undefined) sd.cnt[k] = d.cnt[k]; });
    if(!opzVecchia || opzVecchia.v !== 2){
      // Il criterio predefinito è quello SAP. Si resta sull'altro criterio solo se una fattura/MIRO è già stata scritta con il costo dentro (altrimenti si conterebbe due volte).
      // DDT e MIGO rimasti senza scrittura si sistemano dal pulsante "Contabilizza" del documento.
      const cdvFatt = (sd.fatture || []).some(f => f.cdvIn > 0), acqMiro = (sd.miro || []).some(m => m.completa);
      sd.opz = {cdv:cdvFatt ? 'FATTURA' : 'DDT', acq:acqMiro ? 'MIRO' : 'MIGO', v:2};
    }
  }
  const c24 = s.pianoDeiConti.find(c => c.codice === '24'); if(c24 && c24.nome === 'Merci Ricevute non Fatturate (GR/IR)') c24.nome = 'Fatture da Ricevere — conto ponte GR/IR';
  if(!s.pianoDeiConti.find(c => c.codice === '24')){
    const i = s.pianoDeiConti.findIndex(c => c.codice === '23');
    s.pianoDeiConti.splice(i >= 0 ? i+1 : s.pianoDeiConti.length, 0, {codice:'24', nome:'Fatture da Ricevere — conto ponte GR/IR', tipo:'PASSIVO'});
  }
  return s;
}
// Chiamata da "Nuovo giro": azzera i DOCUMENTI, lascia anagrafiche e configurazione.
function resetDocumenti(){
  const s = STATO.sdmm, d = def();
  ['ordini','rfq','po','pick','ddt','fatture','migo','miro'].forEach(k => s[k] = []);
  s.cnt = d.cnt; s.creditLog = [];
  s.clienti.forEach(c => { c.bloccoCredito = false; c.bloccoMotivo = ''; });
  s.opz = d.opz;   // un giro nuovo riparte dal criterio SAP: lo si può cambiare nelle schermate DDT/Fattura e MIGO/MIRO prima del primo documento
  s.clienti.forEach(c => { c.fido = c.fidoBase; });
  ui.sel = {}; ui.chk = {}; ui.msg = {};
}

// ───────────────────────── utilità ─────────────────────────
const S = () => STATO.sdmm;
const r2 = n => { n = Number(n)||0; return Math.round(n*100 + (n >= 0 ? 1e-7 : -1e-7))/100; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const oggi = () => new Date().toISOString().slice(0,10);
const fd = iso => iso ? iso.split('-').reverse().join('/') : '—';
const plusGg = (iso, gg) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + (gg||0)); return d.toISOString().slice(0,10); };
const aliq = () => (STATO.budgetAnnuo.aliquotaIva || 0) / 100;
const prezzoStd = () => STATO.budgetAnnuo.prezzoVenditaStandard || 0;
const ferroStd = () => STATO.distintaBase.costoFerro || 0;
const num = k => String(++S().cnt[k]);
const sum = (arr, f) => arr.reduce((t, x) => t + (f(x)||0), 0);
const cdvAlDDT = () => !!S().opz && S().opz.cdv === 'DDT';
const acqAlMIRO = () => !!S().opz && S().opz.acq === 'MIRO';
const ui = { s:'home', sel:{}, chk:{}, msg:{}, centri:{}, conferma:null, confData:null };   // centri: scelte di centro di costo/ricavo per riga, per tipo di documento in registrazione

const cliente = id => S().clienti.find(c => c.id === id);
const fornitore = id => S().fornitori.find(c => c.id === id);
const nomeCli = id => (cliente(id)||{}).nome || id;
const nomeForn = id => (fornitore(id)||{}).nome || id;
const ord = id => S().ordini.find(o => o.id === id);
const poDoc = id => S().po.find(p => p.id === id);
const RISCHIO = {A:'A — Rischio Basso', B:'B — Rischio Medio', C:'C — Rischio Alto'};

// ───────────────────────── grandezze derivate (nessuna duplicata in stato) ─────────────────────────
// Ordine di vendita
const qEff       = o => o.chiusoAQta != null ? o.chiusoAQta : o.qty;                       // quantità effettiva (dopo eventuale chiusura residuo)
const impOrd     = o => r2(qEff(o) * o.prezzo);
const totOrd     = o => { const i = impOrd(o); return r2(i + r2(i * aliq())); };
const qPicked    = o => sum(S().pick.filter(p => p.ordId === o.id), p => p.qty);
const qConsegn   = o => sum(S().ddt.filter(d => d.ordId === o.id), d => d.qty);
const qStaged    = o => qPicked(o) - qConsegn(o);                                            // in area di spedizione, non ancora uscito
const qConf      = o => o.conferma ? o.conferma.qta : 0;
const qResConf   = o => Math.max(0, Math.min(qConf(o), qEff(o)) - qConsegn(o));            // quota confermata e non ancora consegnata (riserva ATP)
const fattOrd    = o => S().fatture.find(f => f.ordId === o.id);

// Le fatture manuali (tipo ACQUISTO / VENDITA) non si creano più: restano solo quelle di dati salvati con la versione precedente.
// Se non hanno la quantità memorizzata, la si ricava dalla scrittura (magazzino sempre a standard).
function qtaManuale(r){
  if(r.qtaMovimento != null) return r.qtaMovimento;
  if(r.tipo === 'ACQUISTO'){ const x = r.righe.find(y => y.conto === '12' && y.dareAvere === 'DARE'); return x && ferroStd() > 0 ? r2(x.importo / ferroStd()) : 0; }
  if(r.tipo === 'VENDITA'){
    if(r.dettaglioVendita && r.dettaglioVendita.pezzi) return r.dettaglioVendita.pezzi;
    const x = r.righe.find(y => y.conto === '13' && y.dareAvere === 'AVERE'), cu = costoStandardTransenna();
    return x && cu > 0 ? Math.round(x.importo / cu) : 0;
  }
  return 0;
}
// ── Valorizzazione a lotti (FIFO) del magazzino prodotti finiti ──────────────────────────
// Ogni pezzo esce al costo standard vigente QUANDO È STATO PRODOTTO (il lotto), non a quello
// corrente: se lo standard cambia dopo la produzione (Distinta Base, tariffe), il costo del
// venduto non "insegue" il nuovo standard e il conto 13 continua a quadrare con la giacenza.
function lottiPF(){
  // Ogni lotto porta il costo STORICO: giacenza iniziale al costo congelato, produzioni al Dare 13 della propria scrittura.
  // Se un costo storico manca, il lotto resta senza valore e segnala un'anomalia: mai lo standard corrente in silenzio.
  const lotti = [], spi = STATO.statoPatrimonialeIniziale, q0 = spi.magazzinoPF_unita0 || 0;
  if(q0 > 0){ const cu = Number(spi.costoUnitarioPF0); lotti.push({data:'0000-00-00', id:0, qty:q0, costoUnit: cu > 0 ? cu : null, origine:'giacenza iniziale', anomalia: cu > 0 ? '' : 'giacenza iniziale senza costo unitario congelato'}); }
  STATO.registrazioni.filter(r => r.tipo === 'PRODUZIONE' && r.dettaglioProduzione && r.dettaglioProduzione.quantita > 0 && !r.annullataDa).forEach(r => {
    const q = r.dettaglioProduzione.quantita, v13 = r.righe.filter(x => x.conto === '13' && x.dareAvere === 'DARE').reduce((t, x) => t + (x.importo || 0), 0);
    const ok = v13 > 0;
    lotti.push({data:r.data || '', id:r.id, qty:q, costoUnit: ok ? (v13 / q) : null, legacy: !!(r.snapshotCosto && r.snapshotCosto.legacy), origine:`produzione n° ${r.id}`,
      anomalia: ok ? '' : `produzione n° ${r.id}: manca il Dare 13, costo storico non verificabile`});   // costo unitario a piena precisione: si arrotonda solo il totale finale
  });
  lotti.sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.id - b.id));
  return lotti;
}
function uscitePFRegistrate(){
  const out = [];
  STATO.registrazioni.filter(r => r.tipo === 'VENDITA').forEach(r => out.push({data:r.data || '', id:'V' + r.id, qty:qtaManuale(r)}));   // vecchie fatture manuali (dati salvati con versioni precedenti)
  S().ddt.forEach(d => out.push({data:d.data || '', id:'D' + d.id, qty:d.qty, lotti:d.lotti}));
  out.sort((a, b) => (a.data || '').localeCompare(b.data || '') || String(a.id).localeCompare(String(b.id)));
  return out;
}
// Costo di un'uscita di `qty` pezzi dal magazzino PF, prelevando FIFO dai lotti dopo aver tolto le uscite già registrate
// (con i lotti memorizzati nel DDT, se ci sono). Oltre la giacenza valorizzata NON valorizza nulla: segnala `mancano`.
function costoUscitaFIFO(qty, escludiDdtId){
  const lotti = lottiPF().map(l => Object.assign({}, l, {residuo:l.qty}));
  function preleva(n){
    let rimasti = n, costo = 0; const prelievi = [], anomalie = [];
    for(const l of lotti){
      if(rimasti <= 0.0000001) break;
      const x = Math.min(l.residuo, rimasti); if(x <= 0) continue;
      l.residuo -= x; rimasti -= x;
      if(l.costoUnit == null) anomalie.push(`${x} pz dal lotto «${l.origine}»: ${l.anomalia}`);
      else costo += x * l.costoUnit;
      prelievi.push({lottoId:l.id, data:l.data, qty:x, costoUnit:l.costoUnit, origine:l.origine});
    }
    return {costo, mancano: r2(Math.max(0, rimasti)), prelievi, anomalie};
  }
  uscitePFRegistrate().filter(u => u.id !== ('D' + escludiDdtId) && u.id !== escludiDdtId).forEach(u => {
    if(Array.isArray(u.lotti) && u.lotti.length){
      let resto = u.qty;
      u.lotti.forEach(p => { const l = lotti.find(y => String(y.id) === String(p.lottoId)); if(!l) return; const x = Math.min(l.residuo, p.qty); l.residuo -= x; resto -= x; });
      if(resto > 0.0000001) preleva(resto);   // lotto non più esistente: il residuo si scarica FIFO
    }else preleva(u.qty);
  });
  const r = preleva(qty);
  return {costoTotale:r2(r.costo), costoMedio: qty > 0 ? r2(r.costo / qty) : 0, mancano:r.mancano, prelievi:r.prelievi, anomalie:r.anomalie};
}
// Magazzino Prodotti Finiti (pezzi): giacenza fisica = iniziale + prodotto − venduto (vecchie fatture manuali) − DDT
// ── Registro dei documenti materiale (MB51) — unica fonte delle giacenze (MB52) ─────────────
// Documenti memorizzati (PP e, domani, WMS) in STATO.mm.documenti + documenti ricostruiti dai movimenti
// storici del simulatore (giacenze iniziali, acquisti e vendite manuali, MIGO, DDT, vecchie dichiarazioni).
const SEGNO_MOV = {'101':1, '102':-1, '261':-1, '262':1, '561':1, '601':-1, '602':1, '311':0};
function documentiMateriale(){
  const out = [], spi = STATO.statoPatrimonialeIniziale || {}, lgPF = S().struttura.magazzino || '0001';
  const add = d => out.push(Object.assign({werks:'1000', pos:1, derivato:true}, d, {segno:SEGNO_MOV[d.bwart] || 0}));
  if(spi.magazzinoMP_kg0) add({doc:'INIZ-MP', data:'', bwart:'561', mat:'FERRO', um:'kg', lgort:'0010', qty:spi.magazzinoMP_kg0, testo:'Giacenza iniziale'});
  if(spi.magazzinoPF_unita0) add({doc:'INIZ-PF', data:'', bwart:'561', mat:'TRANSENNA', um:'pz', lgort:lgPF, qty:spi.magazzinoPF_unita0, testo:'Giacenza iniziale'});
  STATO.registrazioni.forEach(r => {
    const v2 = r.originePP && r.originePP.versione === 2;
    if(r.tipo === 'ACQUISTO') add({doc:'FI-' + r.id, data:r.data || '', bwart:'101', mat:'FERRO', um:'kg', lgort:'0010', qty:qtaManuale(r), testo:'Acquisto (Nuova Registrazione)'});
    if(r.tipo === 'VENDITA') add({doc:'FI-' + r.id, data:r.data || '', bwart:'601', mat:'TRANSENNA', um:'pz', lgort:lgPF, qty:qtaManuale(r), testo:'Vendita (Nuova Registrazione)'});
    if(r.tipo === 'PRODUZIONE' && r.dettaglioProduzione && !r.annullataDa && !v2){
      add({doc:'FI-' + r.id + '/1', data:r.data || '', bwart:'101', mat:'TRANSENNA', um:'pz', lgort:lgPF, qty:r.dettaglioProduzione.quantita || 0, testo:'Dichiarazione di produzione (versione precedente)'});
      if(r.dettaglioProduzione.kgReale) add({doc:'FI-' + r.id + '/2', data:r.data || '', bwart:'261', mat:'FERRO', um:'kg', lgort:'0010', qty:r.dettaglioProduzione.kgReale, testo:'Consumo ferro (versione precedente)'});
    }
    if(r.tipo === 'PP_261' && r.dettaglioPP && !r.annullataDa && !v2) add({doc:'FI-' + r.id, data:r.data || '', bwart:'261', mat:'FERRO', um:'kg', lgort:'0010', qty:r.dettaglioPP.kg || 0, testo:'Prelievo 261 (PP versione precedente)'});
  });
  S().migo.forEach(m => add({doc:'MIGO-' + m.id, data:m.data || '', bwart:'101', mat:'FERRO', um:'kg', lgort:'0010', qty:m.qty, testo:'Entrata merci da ordine d\'acquisto ' + (m.poId || m.oda || '')}));
  S().ddt.forEach(d => add({doc:'DDT-' + d.id, data:d.data || '', bwart:'601', mat:'TRANSENNA', um:'pz', lgort:lgPF, qty:d.qty, testo:'Uscita merci DDT ' + d.id}));
  ((STATO.mm && STATO.mm.documenti) || []).forEach(d => out.push(d));
  return out.sort((a, b) => (a.data || '').localeCompare(b.data || '') || String(a.doc).localeCompare(String(b.doc)));
}
function giacenza(mat, lgort){ return documentiMateriale().filter(d => d.mat === mat && (!lgort || d.lgort === lgort)).reduce((t, d) => t + d.segno * (d.qty || 0), 0); }
// ── Interfaccia verso la pianificazione PP (MRP): fabbisogni da ordini di vendita, ordini d'acquisto aperti, creazione ODA da richiesta ──
function fabbisogniVendita(){
  return S().ordini.filter(o => !o.rifiutato).map(o => ({id:o.id, qty:Math.max(0, qEff(o) - qConsegn(o)), data:(o.conferma && o.conferma.dataConsegna) || o.dataConsegna || o.creatoIl || '', commessaId:o.commessaId || '', cliente:nomeCli(o.cliId), bloccato:!!o.blocco})).filter(x => x.qty > 0);
}
function poAperti(){ return S().po.map(p => ({id:p.id, qty:Math.max(0, r2(p.qty - qRicevuta(p))), data:p.dataConsegna || p.creato || '', fornitore:nomeForn(p.fid)})).filter(x => x.qty > 0); }
function nuovoPO(fid, qty, prezzo, dataConsegna, rif){
  const f = fornitore(fid); if(!f) throw new Error('Fornitore mancante.');
  if(!(qty > 0) || !(prezzo > 0)) throw new Error('Quantità e prezzo devono essere maggiori di zero.');
  const p = {id:num('po'), fid, qty:r2(qty), prezzo, dataConsegna, rfqId:'', pagGg:f.pagamentoGg, creato:oggi(), richiestaMRP:rif || ''};
  S().po.push(p); return p.id;
}
function pfFisico(){ return giacenza('TRANSENNA'); }   // MB52: transenne (anche quelle già in area di spedizione, fino al DDT)
function pfFisicoVecchio(){
  let q = STATO.statoPatrimonialeIniziale.magazzinoPF_unita0 || 0;
  STATO.registrazioni.forEach(r => {
    if(r.tipo === 'PRODUZIONE' && r.dettaglioProduzione) q += r.dettaglioProduzione.quantita || 0;
    if(r.tipo === 'VENDITA') q -= qtaManuale(r);
  });
  return q - sum(S().ddt, d => d.qty);
}
const inSpedizione = () => sum(S().pick, p => p.qty) - sum(S().ddt, d => d.qty);           // area di spedizione (punto di spedizione)
const inMagazzino  = () => pfFisico() - inSpedizione();                                     // ubicazione di magazzino
const riservato    = exceptId => sum(S().ordini.filter(o => o.id !== exceptId), qResConf);
const atp          = o => pfFisico() - riservato(o.id);
// Magazzino Materie Prime (kg di ferro)
function mpFisico(){ return giacenza('FERRO'); }   // MB52: ferro
function mpFisicoVecchio(){
  let q = STATO.statoPatrimonialeIniziale.magazzinoMP_kg0 || 0;
  STATO.registrazioni.forEach(r => {
    if(r.tipo === 'ACQUISTO') q += qtaManuale(r);
    if(r.tipo === 'PRODUZIONE' && r.dettaglioProduzione) q -= r.dettaglioProduzione.kgReale || 0;
  });
  return q + sum(S().migo, m => m.qty);
}
// ── Rischedulazione ATP (backorder processing, come SAP V_V2) ──────────────────────────
// Chiamata dal Libro Giornale ogni volta che una dichiarazione di produzione viene registrata o eliminata.
// 1) se la giacenza non copre più le conferme (produzione eliminata) riduce le conferme più recenti,
//    mai sotto i pezzi già consegnati o già in area di spedizione;
// 2) passa la nuova disponibilità agli ordini confermati solo in parte o rimasti senza disponibilità al controllo ATP,
//    in ordine di numero d'ordine (il primo arrivato è il primo servito). Credito bloccato, respinti e fatturati restano fuori.
function ricalcolaATP(motivo){
  const s = S(), log = [], oggiD = oggi();
  const nuovaConferma = (o, qta, dataConsegna) => { const cf = {id:num('cf'), data:oggiD, qta, dataConsegna, automatica:true, motivo}; o.conferme = o.conferme || []; o.conferme.push(cf); o.conferma = cf; };
  let eccesso = sum(s.ordini, qResConf) - pfFisico();
  if(eccesso > 0){
    [...s.ordini].filter(o => o.conferma && !fattOrd(o)).sort((a, b) => String(b.id).localeCompare(String(a.id))).forEach(o => {
      if(eccesso <= 0) return;
      const conf = Math.min(qConf(o), qEff(o)), minimo = qConsegn(o) + qStaged(o), x = Math.min(Math.max(0, conf - minimo), eccesso);
      if(x > 0){ nuovaConferma(o, conf - x, o.conferma.dataConsegna); o.atpInAttesa = true; eccesso -= x; log.push(`ordine ${o.id}: conferma ridotta da ${conf} a ${conf - x} pz`); }
    });
    if(eccesso > 0) log.push(`⚠ ${eccesso} pz confermati restano senza copertura (già in spedizione o consegnati)`);
  }
  [...s.ordini].filter(o => !o.rifiutato && !fattOrd(o) && !bloccato(o) && (o.conferma || o.atpInAttesa)).sort((a, b) => String(a.id).localeCompare(String(b.id))).forEach(o => {
    const attuale = o.conferma ? Math.min(o.conferma.qta, qEff(o)) : 0, cap = Math.min(qEff(o), qConsegn(o) + Math.max(0, atp(o)));
    if(cap > attuale){ nuovaConferma(o, cap, o.conferma ? o.conferma.dataConsegna : o.dataConsegna); log.push(`ordine ${o.id}: confermati ${cap} pz (prima ${attuale})`); }
    o.atpInAttesa = (o.conferma ? o.conferma.qta : 0) < qEff(o);
  });
  if(R) render();
  return log;
}
// Credito cliente: ordini (IVA inclusa) − fatture incassate
function esposizione(cliId){
  return r2(sum(S().ordini.filter(o => o.cliId === cliId && !o.rifiutato), totOrd) - sum(S().fatture.filter(f => f.cliId === cliId && f.incasso), f => f.totale));
}
// un ordine respinto in modo definitivo dal Credit Manager resta sempre bloccato e non pesa più sul castelletto del cliente
const bloccato = o => !!o.rifiutato || (!!o.blocco && !creditoOverride(o));
const creditoOverride = o => o.creditApproval && ['APPROVED_EXCEPTION','APPROVED_LIMIT_INCREASE'].includes(o.creditApproval.status);

// Ordine d'acquisto
const qRicevuta  = p => r2(sum(S().migo.filter(m => m.poId === p.id), m => m.qty));
const qFatturata = p => r2(sum(S().miro.filter(m => m.poId === p.id), m => m.qty));
const cumPO      = (p, q) => r2(q * p.prezzo);                                              // valore a prezzo d'ordine di una quantità cumulata

function statoOrd(o){
  if(o.rifiutato) return 'RIFIUTATO (CREDITO)';
  const f = fattOrd(o), qd = qConsegn(o);
  if(f) return regOf('FATT', f.id) ? (f.incasso ? 'INCASSATO' : 'CONTABILIZZATO') : 'FATTURATO';
  if(qd > 0) return qd >= qEff(o) ? 'CONSEGNATO' : 'PARZ. CONSEGNATO';
  if(bloccato(o)) return 'BLOCCO CREDITO';
  if(o.conferma) return 'CONFERMATO';
  return 'APERTO';
}
function statoPO(p){
  const rc = qRicevuta(p), fa = qFatturata(p), mm = S().miro.filter(m => m.poId === p.id);
  if(fa >= p.qty && mm.length && mm.every(m => m.pagamento)) return 'PAGATO';
  if(fa >= p.qty) return 'FATTURATO';
  if(fa > 0) return 'PARZ. FATTURATO';
  if(rc >= p.qty) return 'RICEVUTO';
  if(rc > 0) return 'PARZ. RICEVUTO';
  return 'APERTO';
}

// ───────────────────────── TRIPLE MATCH ─────────────────────────
// Vendite: Ordine ↔ DDT ↔ Fattura (quantità, cliente, prezzo)
function tmVendite(o){
  const dd = S().ddt.filter(d => d.ordId === o.id), f = fattOrd(o), qd = qConsegn(o), issues = [];
  dd.forEach(d => { if(d.cliId !== o.cliId) issues.push(`DDT ${d.id} intestato a un cliente diverso dall'ordine`); });
  if(!dd.length) issues.push('nessun DDT registrato');
  else if(qd !== qEff(o)) issues.push(`ordinato ${qEff(o)} pz, consegnato con DDT ${qd} pz`);
  if(f){
    if(f.cliId !== o.cliId) issues.push('fattura intestata a un cliente diverso');
    if(f.qty !== qd) issues.push(`fatturato ${f.qty} pz, consegnato con DDT ${qd} pz`);
    if(Math.abs(f.prezzo - o.prezzo) > 0.0049) issues.push(`prezzo fattura ${euro(f.prezzo)} ≠ prezzo ordine ${euro(o.prezzo)}`);
  }
  let stato;
  if(f) stato = issues.length ? 'ko' : 'ok';
  else stato = (dd.length && qd === qEff(o) && !issues.length) ? 'pronto' : 'corso';
  if(stato === 'corso' && dd.some(d => d.cliId !== o.cliId)) stato = 'ko';
  return {stato, issues, qOrd:qEff(o), qDdt:qd, qFat:f ? f.qty : 0, pOrd:o.prezzo, pFat:f ? f.prezzo : null, nDdt:dd.length};
}
// Acquisti: Ordine d'acquisto ↔ MIGO ↔ MIRO (quantità e prezzo)
function tmAcquisti(p){
  const rc = qRicevuta(p), fa = qFatturata(p), mm = S().miro.filter(m => m.poId === p.id), issues = [], avvisi = [];
  if(rc > p.qty + 1e-9) issues.push(`ricevuto ${rc} kg > ordinato ${p.qty} kg`);
  if(fa > rc + 1e-9) issues.push(`fatturato ${fa} kg > ricevuto ${rc} kg (nessuna entrata merci a copertura)`);
  mm.forEach(m => { if(Math.abs(m.prezzo - p.prezzo) > 0.0049) avvisi.push(`fattura ${m.nFattura}: ${euro(m.prezzo)}/kg ≠ ${euro(p.prezzo)}/kg d'ordine (variance registrata al conto 62)`); });
  let stato;
  if(issues.length) stato = 'ko';
  else if(fa > 0 && Math.abs(fa - p.qty) < 1e-9 && Math.abs(rc - p.qty) < 1e-9) stato = avvisi.length ? 'warn' : 'ok';
  else stato = 'corso';
  return {stato, issues, avvisi, qPO:p.qty, qMigo:rc, qMiro:fa};
}

// ───────────────────────── SCRITTURE (righe pure: usate da anteprima E da registrazione) ─────────────────────────
const riga = (conto, da, imp, cr) => ({conto, dareAvere:da, importo:r2(imp), centroCostoId:'', centroRicavoId:cr || ''});

// DDT / Uscita merci (mov. 601): costo del venduto a STANDARD — identico alla riga 41/13 della Fattura di Vendita manuale
const rifCOGS = (ordId, ddtIds, lotti) => { const o = ord(ordId) || {}; return {ordine:ordId || '', commessaId:o.commessaId ? String(o.commessaId) : '', ddt:ddtIds || [], lotti:lotti ? [...new Set(lotti)] : null}; };
const righeDDT = d => [Object.assign(riga('41','DARE',d.importoCdV), {rifCOGS:rifCOGS(d.ordId, d.id ? [d.id] : [], (d.lotti || []).map(l => l.lottoId))}), riga('13','AVERE',d.importoCdV)];
function rifCOGSFattura(f){ const dd = S().ddt.filter(d => (f.cdvDdtIds || []).length ? f.cdvDdtIds.includes(d.id) : d.ordId === f.ordId); return rifCOGS(f.ordId, dd.map(d => d.id), dd.flatMap(d => (d.lotti || []).map(l => l.lottoId))); }
// Fattura attiva: Clienti al REALE, Ricavi a STANDARD, differenza a Variance Prezzo di Vendita (63), IVA a Debito
function righeFattura(f){
  // Il centro di ricavo sta sulle righe di conto economico (ricavi, variance); il credito verso il cliente non ne porta, come nel Libro Giornale delle vendite di prima
  const r = [riga('11','DARE',f.totale), riga('40','AVERE',f.ricavi,f.centroRicavoId)];
  // Costo del venduto a standard nella stessa scrittura (modalità 'FATTURA'): stesse righe della vecchia Fattura di Vendita di Nuova Registrazione
  if(f.cdvIn > 0.004){ r.push(Object.assign(riga('41','DARE',f.cdvIn), {rifCOGS:rifCOGSFattura(f)})); r.push(riga('13','AVERE',f.cdvIn)); }
  if(Math.abs(f.varianza) > 0.004) r.push(riga('63', f.varianza < 0 ? 'DARE' : 'AVERE', Math.abs(f.varianza), f.centroRicavoId));
  if(f.iva > 0.004) r.push(riga('21','AVERE',f.iva));
  return r;
}
const righeIncasso = f => [riga('10','DARE',f.totale), riga('11','AVERE',f.totale)];
// MIGO (mov. 101): magazzino a STANDARD, contropartita GR/IR a prezzo d'ordine, scarto a Variance Prezzo Acquisto (62)
function righeMIGO(m){
  const r = [riga('12','DARE',m.valStd), riga('24','AVERE',m.valPO)], d = r2(m.valPO - m.valStd);
  if(Math.abs(d) > 0.004) r.push(riga('62', d > 0 ? 'DARE' : 'AVERE', Math.abs(d)));
  return r;
}
// MIRO: chiude il GR/IR, IVA a Credito, debito verso il Fornitore (imponibile + IVA); eventuale scarto prezzo fattura/ordine a 62
function righeMIRO(m){
  if(m.completa){   // criterio 'MIRO': stessa scrittura dell'Acquisto di Nuova Registrazione — magazzino a standard, debito verso il fornitore (imponibile + IVA), variance sull'imponibile, IVA a credito
    const v = r2(m.valStd - m.imp), r = [riga('12','DARE',m.valStd), riga('20','AVERE',m.tot)];
    if(Math.abs(v) > 0.004) r.push(riga('62', v < 0 ? 'DARE' : 'AVERE', Math.abs(v)));
    if(m.iva > 0.004) r.push(riga('14','DARE',m.iva));
    return r;
  }
  const r = [riga('24','DARE',m.grir)];
  if(Math.abs(m.diff) > 0.004) r.push(riga('62', m.diff > 0 ? 'DARE' : 'AVERE', Math.abs(m.diff)));
  if(m.iva > 0.004) r.push(riga('14','DARE',m.iva));
  r.push(riga('20','AVERE',m.tot));
  return r;
}
const righePagamento = m => [riga('20','DARE',m.tot), riga('10','AVERE',m.tot)];

// Registro dei documenti che generano scritture
const REG = {
  DDT:  {tipo:'DDT_VENDITA',     get:id => S().ddt.find(x => x.id === id),      data:d => d.data,
         desc:d => `DDT ${d.id} — Uscita merci (mov. 601) ordine ${d.ordId} — ${nomeCli(d.cliId)}`, righe:righeDDT, extra:d => ({riferimentiCOGS:rifCOGS(d.ordId, [d.id], (d.lotti || []).map(l => l.lottoId))})},
  FATT: {tipo:'FATTURA_ATTIVA',  get:id => S().fatture.find(x => x.id === id), data:f => f.data,
         desc:f => `Fattura di vendita ${nomeCli(f.cliId)} nr ${f.id} — ordine ${f.ordId}`, righe:righeFattura,
         extra:f => Object.assign(f.commessaId ? {dettaglioVendita:{commessaId:String(f.commessaId), pezzi:f.qty, prezzoStandard:f.qty ? f.ricavi / f.qty : f.prezzoStd, prezzoReale:f.prezzo}} : {}, f.cdvIn > 0.004 ? {riferimentiCOGS:rifCOGSFattura(f)} : {})},
  INC:  {tipo:'INCASSO_SD',      get:id => S().fatture.find(x => x.id === id), data:f => f.incasso && f.incasso.data,
         desc:f => `Incasso fattura ${f.id} — ${nomeCli(f.cliId)}`, righe:righeIncasso, extra:() => ({})},
  MIGO: {tipo:'MIGO',            get:id => S().migo.find(x => x.id === id),     data:m => m.data,
         desc:m => `MIGO ${m.id} — Entrata merci (mov. 101) ordine acquisto ${m.poId} — ${nomeForn(m.fid)} — DDT forn. ${m.ddtForn}`, righe:righeMIGO, extra:() => ({})},
  MIRO: {tipo:'MIRO',            get:id => S().miro.find(x => x.id === id),     data:m => m.data,
         desc:m => `MIRO ${m.id} — Fattura fornitore ${m.nFattura} — ${nomeForn(m.fid)} — ordine acquisto ${m.poId}`, righe:righeMIRO, extra:() => ({})},
  PAG:  {tipo:'PAGAMENTO_MM',    get:id => S().miro.find(x => x.id === id),     data:m => m.pagamento && m.pagamento.data,
         desc:m => `Pagamento fattura fornitore ${m.nFattura} — ${nomeForn(m.fid)}`, righe:righePagamento, extra:() => ({})},
};
const regOf = (kind, id) => STATO.registrazioni.find(r => r.origineSD && r.origineSD.tipo === kind && r.origineSD.id === id);
const nRegOf = (kind, id) => STATO.registrazioni.filter(r => r.origineSD && r.origineSD.tipo === kind && r.origineSD.id === id).length;

// Centri di costo / di ricavo scelti sulle righe (come in Nuova Registrazione): chiave riga = "conto|DARE/AVERE".
// Il default è quello previsto dall'automatismo di determinazione conti; la scelta dell'utente lo sostituisce.
// Costo del venduto (41) e scarico del magazzino prodotti finiti (13): MAI un centro di costo. Il centro produttivo serve
// quando si assorbono i costi in produzione (51/52), non sulla riga finale del COGS.
const senzaCentroCosto = r => r.conto === '41' || r.conto === '13';
function applyCentri(kind, righe){
  const ov = ui.centri[kind] || {};
  return righe.map(r => { const o = ov[r.conto + '|' + r.dareAvere];
    const x = o ? Object.assign({}, r, {centroCostoId: o.cc !== undefined ? o.cc : r.centroCostoId, centroRicavoId: o.cr !== undefined ? o.cr : r.centroRicavoId}) : r;
    return senzaCentroCosto(x) && x.centroCostoId ? Object.assign({}, x, {centroCostoId:''}) : x; });
}

// Unico punto in cui il modulo scrive nel Libro Giornale.
function postDoc(kind, doc){
  const D = REG[kind];
  if(regOf(kind, doc.id)) throw new Error(`Il documento ${doc.id} è già contabilizzato: nessuna nuova scrittura (anti-duplicazione).`);
  // Il costo del venduto si registra UNA volta sola: o con il DDT, o con la fattura
  if(kind === 'DDT'){ const f = S().fatture.find(x => x.cdvIn > 0.004 && regOf('FATT', x.id) && ((x.cdvDdtIds || []).length ? x.cdvDdtIds.includes(doc.id) : x.ordId === doc.ordId));
    if(f) throw new Error(`Il costo del venduto del DDT ${doc.id} è già nella fattura ${f.id}: nessuna seconda scrittura.`); }
  if(kind === 'FATT' && doc.cdvIn > 0.004){ const gia = S().ddt.filter(d => ((doc.cdvDdtIds || []).length ? doc.cdvDdtIds.includes(d.id) : d.ordId === doc.ordId) && regOf('DDT', d.id));
    if(gia.length) throw new Error(`Il costo del venduto dei DDT ${gia.map(d => d.id).join(', ')} è già contabilizzato: la fattura non può registrarlo una seconda volta.`); }
  const righe = applyCentri(kind, D.righe(doc)).filter(r => r.importo > 0.004);
  const dare = sum(righe.filter(r => r.dareAvere === 'DARE'), r => r.importo), avere = sum(righe.filter(r => r.dareAvere === 'AVERE'), r => r.importo);
  if(dare <= 0 || Math.abs(dare - avere) > 0.005) throw new Error(`La scrittura non quadra (Dare ${euro(dare)} ≠ Avere ${euro(avere)}). Nessuna registrazione effettuata.`);
  const data = D.data(doc);
  if(!data) throw new Error('Data di registrazione mancante.');
  if(window.FI) FI.dateCheck(data);
  const reg = Object.assign({id:STATO.prossimoIdRegistrazione++, data, descrizione:D.desc(doc), tipo:D.tipo, righe, origineSD:{tipo:kind, id:doc.id}}, D.extra(doc));
  STATO.registrazioni.push(reg);
  delete ui.centri[kind];
  return reg;
}

// ═══════════════════════════════════════════════════════════════════════
// INTERFACCIA — Shadow DOM: lo stile SAP non tocca (e non è toccato da) il resto del simulatore
// ═══════════════════════════════════════════════════════════════════════
let R = null;
const $ = id => R.getElementById(id);

const CSS = `
:host{all:initial;display:block;font-family:"Segoe UI",Arial,sans-serif;font-size:13px;color:#32363A}
*{box-sizing:border-box}
.app{background:#E5E8EE;border:1px solid #b7bfcc;border-radius:4px;overflow:hidden;line-height:1.45}
.top{background:#1B3A5C;color:#fff;padding:9px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.logo{background:#0070F2;color:#fff;font-weight:800;padding:2px 9px;border-radius:3px;letter-spacing:1px}
.ttl{font-size:14px}.hr{margin-left:auto;font-size:11.5px;color:#b9c9dd}
.bar{background:#F5F6FA;border-bottom:1px solid #D1D5DB;padding:7px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.crumb{font-weight:700;color:#0854A0}
.tc{margin-left:auto;display:flex;gap:6px}.tc input{width:290px}
.body{padding:16px}
h1,h2,h3,h4,p{margin:0}
.btn{font:inherit;font-size:13px;padding:7px 14px;border:1px solid #0070F2;background:#fff;color:#0070F2;border-radius:4px;cursor:pointer}
.btn:hover{background:#E8F4FD}.btn.pri{background:#0070F2;color:#fff}.btn.pri:hover{background:#0854A0}
.btn.sm{padding:3px 10px;font-size:12px}.btn.red{border-color:#BB0000;color:#BB0000}.btn.grn{border-color:#107E3E;color:#107E3E}
.btn[disabled]{opacity:.45;cursor:not-allowed}
input,select,textarea{font:inherit;font-size:13px;padding:6px 8px;border:1px solid #D1D5DB;border-radius:4px;background:#fff;width:100%}
label{display:block;font-size:11.5px;color:#6A6D70;margin-bottom:3px}
.card{background:#fff;border:1px solid #D1D5DB;border-radius:4px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.ch{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #D1D5DB;background:#F7F8FA}
.ch h2{font-size:14.5px;font-weight:600}.tx{margin-left:auto;font-family:Consolas,monospace;font-size:11.5px;color:#0854A0;background:#E8F4FD;padding:2px 8px;border-radius:10px}
.cb{padding:14px}
.fg{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin-bottom:12px}
.f.end{align-self:end}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{text-align:left;background:#F5F6FA;padding:7px 8px;border-bottom:1px solid #D1D5DB;font-size:11.5px;color:#6A6D70;text-transform:uppercase;letter-spacing:.3px}
td{padding:7px 8px;border-bottom:1px solid #E6E8EC;vertical-align:top}
.r{text-align:right;font-family:Consolas,monospace;font-variant-numeric:tabular-nums}
.mono{font-family:Consolas,monospace}
.wrap{overflow:auto}
.bd{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;white-space:nowrap}
.bd-g{background:#F1FAF1;color:#107E3E}.bd-b{background:#E8F4FD;color:#0854A0}.bd-o{background:#FFF8F0;color:#E9730C}.bd-r{background:#FFF0F0;color:#BB0000}.bd-n{background:#eef0f3;color:#6A6D70}
.al{border-left:4px solid;border-radius:4px;padding:10px 12px;margin-bottom:12px;background:#fff}
.al h4{font-size:13px;margin-bottom:3px}.al p{font-size:12.5px}
.al-ok{border-color:#107E3E;background:#F1FAF1}.al-ko{border-color:#BB0000;background:#FFF0F0}.al-wa{border-color:#E9730C;background:#FFF8F0}.al-in{border-color:#0070F2;background:#E8F4FD}
.info{background:#F5F6FA;border:1px solid #D1D5DB;border-radius:4px;padding:9px 12px;margin-bottom:12px;font-size:12.5px}
.prev{background:#FFFDF2;border:1px dashed #C9A227;border-radius:4px;padding:10px 12px;margin:12px 0}
.prev h4{font-size:12px;color:#7a5f00;margin-bottom:6px}
.prev select{padding:3px 5px;font-size:12px;max-width:170px;width:100%}
.grp{font-size:12px;font-weight:700;color:#6A6D70;text-transform:uppercase;letter-spacing:.6px;margin:18px 0 8px}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:12px}
.tile{background:#fff;border:1px solid #D1D5DB;border-radius:8px;padding:13px;cursor:pointer;border-top:4px solid #0070F2;min-height:112px;display:flex;flex-direction:column;gap:3px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.tile:hover{box-shadow:0 3px 10px rgba(0,0,0,.18);transform:translateY(-1px)}
.tile.mm{border-top-color:#E9730C}.tile.ct{border-top-color:#107E3E}
.tile .ic{font-size:24px}.tile b{font-size:13.5px}.tile .tcd{font-family:Consolas,monospace;font-size:11px;color:#0854A0}.tile .kpi{margin-top:auto;font-size:12px;color:#6A6D70}
.doc{border:1px solid #999;background:#fff;padding:18px;margin-top:12px;max-width:820px}
.doc .dh{display:flex;justify-content:space-between;border-bottom:2px solid #1B3A5C;padding-bottom:10px;margin-bottom:12px;gap:14px}
.doc h1{font-size:17px;color:#1B3A5C}.doc h2{font-size:17px;text-align:right;color:#0854A0}.doc .dt{text-align:right}
.doc .dp{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px}.doc h4{font-size:11px;text-transform:uppercase;color:#6A6D70}
.doc .tot{margin-left:auto;width:290px;margin-top:10px}.doc .foot{margin-top:12px;font-size:11.5px;color:#555}
.tm{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tm .n{background:#F5F6FA;border:1px solid #D1D5DB;border-radius:6px;padding:6px 12px;text-align:center}.tm .n b{display:block;font-size:16px}
.sep{height:1px;background:#D1D5DB;margin:14px 0}.small{font-size:11.5px;color:#6A6D70}
@media print{.top,.bar{display:none}}
`;

// ───────────────────────── componenti ─────────────────────────
const card = (ic, t, tx, b) => `<div class="card"><div class="ch"><span>${ic}</span><h2>${t}</h2><span class="tx">${tx||''}</span></div><div class="cb">${b}</div></div>`;
const al = (k, h, p) => `<div class="al al-${k}"><h4>${h}</h4><p>${p}</p></div>`;
const bd = (k, t) => `<span class="bd bd-${k}">${t}</span>`;
const tb = (head, rows) => {
  const right = head.map(h => h.endsWith('>'));
  return `<div class="wrap"><table><thead><tr>${head.map((h, i) => `<th${right[i] ? ' class="r"' : ''}>${h.replace(/>$/, '')}</th>`).join('')}</tr></thead>
    <tbody>${rows.length ? rows.map(r => `<tr>${r.map((c, i) => `<td${right[i] ? ' class="r"' : ''}>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${head.length}" class="small">Nessun documento.</td></tr>`}</tbody></table></div>`;
};
const opt = (arr, sel, f) => arr.map(x => { const [v, t] = f(x); return `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${t}</option>`; }).join('');
function badgeStato(t){
  const g = ['INCASSATO','PAGATO','CONTABILIZZATO','OK'], b = ['CONFERMATO','CONSEGNATO','RICEVUTO','FATTURATO','ASSEGNATA'], o = ['PARZ. CONSEGNATO','PARZ. RICEVUTO','PARZ. FATTURATO','APERTA'], r = ['BLOCCO CREDITO','RIFIUTATO (CREDITO)'];
  return bd(g.includes(t) ? 'g' : b.includes(t) ? 'b' : o.includes(t) ? 'o' : r.includes(t) ? 'r' : 'n', t);
}
// Stato di contabilizzazione di un documento (letto DAL Libro Giornale, non da un flag)
const TIT_CONF = {DDT:'DDT / uscita merci', FATT:'Fattura di vendita', INC:'Incasso cliente', MIGO:'Entrata merci MIGO (fatture da ricevere)', MIRO:'Fattura fornitore MIRO', PAG:'Pagamento fornitore'};
// Conferma esplicita prima di ogni scrittura automatica: mostra le righe che andranno nel Libro Giornale
function confermaHtml(){
  const c = ui.conferma; if(!c) return '';
  const D = REG[c.kind], doc = D && D.get(c.id); if(!doc) return '';
  return `<div class="al al-in" id="sd-conferma" style="border:2px solid #0A6ED1"><h4>Conferma la registrazione — ${TIT_CONF[c.kind] || c.kind} ${esc(c.id)}${c.data ? ' · data ' + fd(c.data) : ''}</h4>
    <p class="small">Queste sono le righe che verranno scritte nel Libro Giornale. Controlla conti, importi e centri, poi conferma.</p>
    ${anteprima(D.righe(doc), null, {kind:c.kind, edit:true})}
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" onclick="SDMM.confermaRegistrazione()">✅ Conferma e registra nel Libro Giornale</button><button class="btn" onclick="SDMM.annullaConferma()">Annulla</button></div></div>`;
}
function badgePost(kind, id, rilascio){
  const r = regOf(kind, id);
  if(r) return bd('g', `✓ Scrittura n° ${r.id}`);
  if(kind === 'DDT' && !cdvAlDDT()) return bd('b', 'CdV con la fattura');
  if(kind === 'MIGO' && acqAlMIRO()) return bd('b', 'Magazzino con la MIRO');
  return bd(rilascio ? 'o' : 'r', rilascio ? 'Da rilasciare' : '⚠ Non contabilizzato') + (rilascio ? '' : ` <button class="btn sm" onclick="SDMM.chiedi('${kind}','${id}')">Contabilizza</button>`);
}
function anteprima(righe, titolo, o){
  o = o || {}; const kind = o.kind, edit = !!(o.edit && kind);
  const rr = (kind ? applyCentri(kind, righe) : righe).filter(r => r.importo > 0.004);
  const d = sum(rr.filter(r => r.dareAvere === 'DARE'), r => r.importo), a = sum(rr.filter(r => r.dareAvere === 'AVERE'), r => r.importo);
  const sel = (r, campo) => {
    const v = campo === 'cc' ? r.centroCostoId : r.centroRicavoId, lista = campo === 'cc' ? STATO.centriDiCosto : STATO.centriDiRicavo;
    if(campo === 'cc' && senzaCentroCosto(r)) return '<span class="small">— nessun centro produttivo</span>';
    if(!edit) return esc((campo === 'cc' ? nomeCentroCosto(v) : nomeCentroRicavo(v)) || '—');
    return `<select onchange="SDMM.setCentro('${kind}','${r.conto}|${r.dareAvere}','${campo}',this.value)"><option value="">—</option>${lista.map(c => `<option value="${esc(c.id)}"${String(c.id) === String(v) ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select>`;
  };
  const corpo = rr.map(r => `<tr><td>${esc(nomeConto(r.conto))}</td><td>${sel(r, 'cc')}</td><td>${sel(r, 'cr')}</td><td class="r">${r.dareAvere === 'DARE' ? euro(r.importo) : ''}</td><td class="r">${r.dareAvere === 'AVERE' ? euro(r.importo) : ''}</td></tr>`).join('');
  const zero = (o.zero || []).map(z => `<tr class="zero"><td>${esc(nomeConto(z.conto))} <span class="small">— ${esc(z.testo)}</span></td><td>—</td><td>—</td><td class="r">${euro(0)}</td><td class="r"></td></tr>`).join('');
  const tot = `<tr><td><b>Totale</b> ${Math.abs(d - a) < 0.005 && d > 0 ? bd('g', '✓ quadra') : bd('r', 'non quadra')}</td><td></td><td></td><td class="r"><b>${euro(d)}</b></td><td class="r"><b>${euro(a)}</b></td></tr>`;
  return `<div class="prev"><h4>${titolo || 'Scrittura che verrà generata nel Libro Giornale'}</h4><div class="wrap"><table><thead><tr><th>Conto</th><th>Centro di costo</th><th>Centro di ricavo (profitto)</th><th class="r">Dare</th><th class="r">Avere</th></tr></thead><tbody>${corpo}${zero}${tot}</tbody></table></div>${edit ? '<p class="small" style="margin-top:6px">I centri sono proposti dall\'automatismo di determinazione conti; come in Nuova Registrazione puoi cambiarli riga per riga prima di registrare.</p>' : ''}${o.nota ? `<p class="small" style="margin-top:6px">${o.nota}</p>` : ''}</div>`;
}
// Riquadro "Standard vs Reale": stessa logica di Nuova Registrazione. La variance compare SEMPRE, anche quando è zero.
const rigaVar = (t, v) => `<tr><td>${t}</td><td class="r" style="color:${v < -0.004 ? '#BB0000' : v > 0.004 ? '#107E3E' : 'inherit'};font-weight:700">${v < -0.004 ? '−' : v > 0.004 ? '+' : ''}${euro(Math.abs(v))} ${v < -0.004 ? '(sfavorevole)' : v > 0.004 ? '(favorevole)' : '(nessuno scostamento)'}</td></tr>`;
const rigaP = (t, v, b) => `<tr><td${b ? ' style="font-weight:700"' : ''}>${t}</td><td class="r"${b ? ' style="font-weight:700"' : ''}>${v}</td></tr>`;
const pannello = (t, righe) => `<div class="info" style="margin-top:10px"><b>${t}</b><div class="wrap"><table><tbody>${righe.join('')}</tbody></table></div></div>`;
const okm = (s, h, p) => { ui.msg[s] = al('ok', h, p); };
// dopo un errore i campi già compilati non si perdono: si salvano e si ripristinano dopo il render
function snapCampi(){ ui.keepVals = {}; ui.keepScr = ui.s; const b = $('sd-body'); if(!b) return; b.querySelectorAll('input, select').forEach(e => { if(e.id) ui.keepVals[e.id] = e.type === 'checkbox' ? e.checked : e.value; }); }
const ko  = (s, h, p) => { ui.msg[s] = al('ko', h, p); snapCampi(); render(); };
const agg = () => { salvaStato(); render(); };

// ───────────────────────── shell e navigazione ─────────────────────────
const TCODES = {VA01:'ordini',VA03:'ordini',VA05:'ordini',VA02:'ctrl',VKM4:'credit',VKM3:'credit',UKM_CASE:'credit',FD32:'credit',LT03:'pick',VL02N:'ddt',VL01N:'ddt',VF01:'fatt',VF03:'fatt',
  ME41:'rfq',ME47:'rfq',ME49:'rfq',ME21N:'po',ME23N:'po',MIGO:'migo',MIRO:'miro',TM:'tm',FB03:'flusso',VA03F:'flusso',XD01:'anag',XK01:'anag',HOME:'home'};
const TITOLI = {home:'Launchpad', credit:'Credit Manager — castelletto e decisioni', ordini:'Ordini di vendita', ctrl:'ATP, credito e conferma d\'ordine', pick:'Picking: magazzino → area di spedizione', ddt:'DDT e uscita merci',
  fatt:'Fatturazione attiva', rfq:'RFQ fornitori e confronto offerte', po:'Ordini di acquisto', migo:'MIGO — Entrata merci', miro:'MIRO — Fattura fornitore',
  tm:'Triple Match e controlli contabili', flusso:'Flusso documenti e scritture', anag:'Anagrafiche'};

function shell(){
  R.innerHTML = `<style>${CSS}</style><div class="app">
    <header class="top"><span class="logo">SAP</span><span class="ttl">S/4HANA — SD / MM · Vendite &amp; Acquisti | <b>Ferro &amp; Transenne S.r.l.</b></span>
      <span class="hr">User: KEY_USER_01 · Client 800 · Sales Area ${esc(S().struttura.areaVendite)} · Plant ${esc(S().struttura.stabilimento)}</span></header>
    <div class="bar"><button class="btn sm" onclick="SDMM.vai('home')">🏠 Launchpad</button><span class="crumb" id="sd-crumb"></span>
      <span class="tc"><input id="sd-tc" placeholder="Transazione: VA01 · VL02N · VF01 · ME41 · MIGO · MIRO…" onkeydown="if(event.key==='Enter')SDMM.tcode(this.value)"><button class="btn sm" onclick="SDMM.tcode(this.previousElementSibling.value)">OK</button></span></div>
    <div class="body" id="sd-body"></div></div>`;
}
function render(){
  if(!R) return;
  const scr = SCR[ui.s] || SCR.home;
  $('sd-crumb').textContent = TITOLI[ui.s] || '';
  $('sd-body').innerHTML = confermaHtml() + scr();
  if(ui.conferma && ui.conferma.scroll){ ui.conferma.scroll = false; const c = $('sd-conferma'); if(c && c.scrollIntoView) c.scrollIntoView({block:'start'}); }
  if(ui.keepVals){
    const kv = ui.keepVals; ui.keepVals = null;
    if(ui.keepScr === ui.s){
      Object.keys(kv).forEach(id => { const e = $(id); if(!e) return; if(e.type === 'checkbox') e.checked = kv[id]; else e.value = kv[id]; });
      if($('dd-prev') && $('dd-qty')) A.prevDDT(); if($('mg-prev') && $('mg-qty')) A.prevMIGO(); if($('mr-prev') && $('mr-qty')) A.prevMIRO();
    }
  }
}
function vai(s){ if(s !== ui.s){ ui.msg = {}; ui.centri = {}; ui.conferma = null; } ui.s = SCR[s] ? s : 'home'; render(); }
function tcode(c){
  const k = TCODES[String(c || '').trim().toUpperCase()];
  if(!k){ ui.msg[ui.s] = al('wa', 'Transazione sconosciuta', 'Prova: VA01, VA02, LT03, VL02N, VF01, ME41, ME21N, MIGO, MIRO, TM, FB03.'); render(); return; }
  vai(k);
}
function init(){
  const host = document.getElementById('sdmm-host');
  if(!host) return;
  R = host.shadowRoot || host.attachShadow({mode:'open'});
  shell(); render();
}

// ───────────────────────── HOME / LAUNCHPAD ─────────────────────────
function guidaVuota(){
  const s = S(); if(s.clienti.length && s.ordini.length) return '';
  const passi = [[!s.clienti.length, 'Crea il tuo <b>cliente</b>', 'Anagrafiche, oppure il riquadro «Nuovo cliente» dentro Ordini di vendita'],
    [!s.ordini.length, 'Inserisci il tuo <b>ordine di vendita</b> ed esegui il controllo ATP', 'Ordini di vendita (VA01), poi ATP, credito e conferma (VA02)'],
    [true, 'Apri la <b>commessa</b> per i pezzi che mancano e produci in PP (CO01 → 261 → CO11N → entrata merci 101)', 'PP → CO01, riquadro «Nuova commessa»'],
    [true, 'Conferma, spedisci, fattura, incassa', 'ATP → Picking → DDT → Fatturazione']];
  return `<div class="al al-in"><h4>Da dove cominciare</h4><ol style="margin:6px 0 0 18px;line-height:1.55">${passi.map(p => `<li>${p[1]} <span class="small">— ${p[2]}</span></li>`).join('')}</ol></div>`;
}
function scrHome(){
  return guidaVuota() + scrHomeBase();
}
function scrHomeBase(){
  const s = S(), da = controlli().filter(c => c.ok === false).length;
  const T = [
    ['Vendite (SD) — ciclo attivo', '', [
      ['ordini','📋','Ordini di vendita','VA01 · VA03', `${s.ordini.length} ordini`],
      ['ctrl','🔍','ATP, credito, conferma d\'ordine','VA02 · VKM4', `${s.ordini.filter(o => statoOrd(o) === 'APERTO' || statoOrd(o) === 'BLOCCO CREDITO').length} da controllare · ${s.ordini.filter(o => o.conferma).length} confermati`],
      ['credit','💳','Credit Manager — castelletto e decisioni','VKM4 · UKM_CASE · FD32', `${s.ordini.filter(o => bloccato(o) && !o.rifiutato).length} pratiche da decidere · ${s.clienti.filter(c => c.bloccoCredito).length} clienti bloccati`],
      ['pick','📦','Picking → area di spedizione','LT03 · VL02N', `${inSpedizione()} pz in area spedizione`],
      ['ddt','🚚','DDT e uscita merci (mov. 601)','VL01N · VL02N', `${s.ddt.length} DDT`],
      ['fatt','🧾','Fatturazione attiva','VF01 · VF03', `${s.fatture.length} fatture · ${s.fatture.filter(f => !regOf('FATT', f.id)).length} da rilasciare`]]],
    ['Acquisti (MM) — ciclo passivo', 'mm', [
      ['rfq','✉️','RFQ fornitori e offerte','ME41 · ME47 · ME49', `${s.rfq.length} RFQ · ${s.rfq.filter(r => r.stato === 'APERTA').length} aperte`],
      ['po','🛒','Ordini di acquisto','ME21N · ME23N', `${s.po.length} ordini acquisto`],
      ['migo','📥','MIGO — Entrata merci (mov. 101)','MIGO', `${s.migo.length} entrate · ferro ${mpFisico().toFixed(0)} kg`],
      ['miro','🧮','MIRO — Fattura fornitore','MIRO', `${s.miro.length} fatture · ${s.miro.filter(m => !m.pagamento).length} da pagare`]]],
    ['Controllo e contabilità', 'ct', [
      ['tm','🔗','Triple Match e controlli','TM', da ? `⚠ ${da} controlli da verificare` : '✓ tutto quadra'],
      ['flusso','🗂️','Flusso documenti e scritture','FB03', `${STATO.registrazioni.filter(r => r.origineSD).length} scritture da SD/MM`],
      ['anag','👥','Anagrafiche clienti e fornitori','XD01 · XK01', `${s.clienti.length} clienti · ${s.fornitori.length} fornitori`]]],
  ];
  const tiles = T.map(([g, cl, items]) => `<div class="grp">${g}</div><div class="tiles">${items.map(([k, ic, t, tc, kpi]) =>
    `<div class="tile ${cl}" onclick="SDMM.vai('${k}')"><div class="ic">${ic}</div><b>${t}</b><span class="tcd">${tc}</span><span class="kpi">${kpi}</span></div>`).join('')}</div>`).join('');
  const mappa = tb(['Documento','Scrittura nel Libro Giornale','Conti'], [
    ['<b>DDT / uscita merci</b> (VL02N, mov. 601)', 'Costo del venduto a STANDARD', 'Dare 41 · Avere 13'],
    ['<b>Fattura attiva</b> (VF01) — rilascio in contabilità', 'Clienti al reale, Ricavi a standard, Variance prezzo vendita, IVA', 'Dare 11 · Avere 40 · ±63 · Avere 21'],
    ['<b>Incasso</b>', 'Chiude il credito verso il cliente', 'Dare 10 · Avere 11'],
    ['<b>MIGO</b> (entrata merci, mov. 101)', 'Magazzino ferro a STANDARD; contropartita GR/IR a prezzo d\'ordine', 'Dare 12 · Avere 24 · ±62'],
    ['<b>MIRO</b> (fattura fornitore)', 'Chiude il GR/IR, IVA a credito, debito verso fornitore', 'Dare 24 · Dare 14 · Avere 20 · ±62'],
    ['<b>Pagamento fornitore</b>', 'Chiude il debito verso il fornitore', 'Dare 20 · Avere 10'],
    ['Ordine, conferma, picking, RFQ, ordine d\'acquisto', 'Nessuna scrittura: sono documenti di gestione, non fatti contabili', '—']]);
  return `${ui.msg.home || ''}
    ${al('in', 'Un solo Libro Giornale', 'Questo modulo non ha una contabilità sua: DDT, fatture, MIGO, MIRO, incassi e pagamenti scrivono nel Libro Giornale del simulatore, quindi compaiono in Mastro, Bilancio di Verifica, Report Commesse e Controllo Mensile. Il costo standard è quello di Impostazioni → Distinta Base.')}
    ${al('ok', 'Le fatture si registrano solo qui', 'La fattura di acquisto (MIRO) e quella di vendita (VF01) nascono da questo modulo e scrivono da sole la partita doppia: in Nuova Registrazione restano solo caricamento costi, produzione e scritture libere. Un documento, una scrittura — il controllo "Triple Match e controlli" lo verifica.')}
    ${tiles}
    <div class="grp">Ciclo attivo e passivo a confronto — dove nasce la scrittura</div>${card('🧭', 'Mappa delle scritture', 'Guida', mappa)}`;
}

// ═══════════════════════════════════════════════════════════════════════
// VENDITE (SD)
// ═══════════════════════════════════════════════════════════════════════
const selectOrdini = (chiave, filtro, vuoto) => {
  const lista = S().ordini.filter(filtro || (() => true)), sel = ui.sel[chiave] || '';
  return `<select onchange="SDMM.selOrd('${chiave}',this.value)"><option value="">${vuoto || '— seleziona un ordine —'}</option>${
    opt(lista, sel, o => [o.id, `${o.id} — ${esc(nomeCli(o.cliId))} — ${o.qty} pz [${statoOrd(o)}]`])}</select>`;
};
const infoCli = id => {
  const c = cliente(id); if(!c) return '';
  const esp = esposizione(id), disp = c.fido - esp;
  return `<div class="info"><b>${esc(c.nome)}</b> — ${esc(c.citta)} · P.IVA ${esc(c.piva)}<br>
    Pagamento <b>ZB${String(c.pagamentoGg).padStart(2,'0')} — ${c.pagamentoGg} gg</b> · Incoterms <b>${esc(c.incoterms)}</b> · Rischio <b>${RISCHIO[c.rischio] || c.rischio}</b><br>
    Fido <b>${euro(c.fido)}</b> · Esposizione <b>${euro(esp)}</b> · Disponibile <b style="color:${disp < 0 ? '#BB0000' : '#107E3E'}">${euro(disp)}</b>${c.bloccoCredito ? `<br><b style="color:#BB0000">⛔ CLIENTE BLOCCATO dal Credit Manager: nessun nuovo ordine.</b> ${esc(c.bloccoMotivo || '')}` : ''}</div>`;
};

// ── 1. ORDINI ──────────────────────────────────────────────────────────
function scrOrdini(){
  const ps = prezzoStd(), com = commesseAperte();
  const fo = ui.formOrd || {}, selCli_ = ui.preselCli || fo.cli || '', selCom_ = ui.preselCom || fo.com || ''; ui.formOrd = null;
  const nessunCliente = S().clienti.length ? '' : al('wa', 'Non ci sono ancora clienti', 'Questa versione parte senza dati: crea il tuo primo cliente nel riquadro «Nuovo cliente» qui sotto (oppure in Anagrafiche), poi inserisci l\'ordine.');
  const avviso = ps > 0 ? '' : al('wa', 'Prezzo di vendita standard non impostato', 'Imposta il "Prezzo di vendita standard" nel Budget Annuo: senza standard i ricavi entrano al prezzo reale e non nasce nessuna Variance Prezzo di Vendita.');
  const form = `<div class="fg">
      <div class="f"><label>Cliente (Sold-to party)</label><select id="o-cli" onchange="SDMM.selCli(this.value)"><option value="">— seleziona —</option>${opt(S().clienti, selCli_, c => [c.id, `${c.id} — ${esc(c.nome)}`])}</select></div>
      <div class="f"><label>Rif. ordine cliente (PO number)</label><input id="o-po" placeholder="es. PO-2026-0412" value="${esc(fo.po || '')}"></div>
      <div class="f"><label>Data consegna richiesta</label><input type="date" id="o-data" value="${fo.data || plusGg(oggi(), 10)}"></div>
      <div class="f"><label>Commessa collegata (opzionale)</label><select id="o-com"><option value="">— nessuna —</option>${com.map(c => `<option value="${c.id}"${String(c.id) === String(selCom_) ? ' selected' : ''}>${esc(c.codice)} — ${esc(c.descrizione)}</option>`).join('')}</select></div>
      <div class="f"><label>Transenne (pezzi)</label><input type="number" id="o-qty" min="1" step="1" oninput="SDMM.aggiornaTotali()" value="${esc(fo.qty || '')}"></div>
      <div class="f"><label>Prezzo di vendita per pezzo (€)</label><input type="number" id="o-prezzo" step="0.01" value="${fo.prezzo || (ps > 0 ? ps : '')}" oninput="SDMM.aggiornaTotali()"></div>
      <div class="f"><label>Centro di ricavo</label><select id="o-cr">${STATO.centriDiRicavo.map(c => `<option value="${c.id}"${String(c.id) === String(fo.cr) ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div></div>
    <div id="o-info"></div><div id="o-tot"></div>
    <button class="btn pri" onclick="SDMM.salvaOrdine()">💾 Salva ordine (VA01)</button>`;
  const righe = S().ordini.map(o => [`<span class="mono">${o.id}</span>`, esc(nomeCli(o.cliId)), esc(o.poCliente), fd(o.dataConsegna), String(qEff(o)), euro(o.prezzo), euro(totOrd(o)), badgeStato(statoOrd(o)),
    (!o.conferma && !o.rifiutato && !S().pick.some(p => p.ordId === o.id) && !fattOrd(o)) ? `<button class="btn sm red" onclick="SDMM.eliminaOrdine('${o.id}')">Elimina</button>` : '']);
  const rapidi = `<details ${S().clienti.length ? '' : 'open'} style="margin-top:12px"><summary style="cursor:pointer"><b>➕ Nuovo cliente</b> — inserisci un tuo cliente</summary>
      <div class="fg" style="margin-top:8px"><div class="f"><label>Nome cliente</label><input id="qc-nome"></div><div class="f"><label>Città</label><input id="qc-citta"></div>
      <div class="f"><label>Pagamento (gg)</label><input type="number" id="qc-gg" value="30"></div><div class="f"><label>Incoterms</label><select id="qc-inc"><option>EXW</option><option>FCA</option><option selected>DAP</option></select></div>
      <div class="f"><label>Fido (€)</label><input type="number" id="qc-fido" value="20000"></div><div class="f"><label>Rischio</label><select id="qc-risc"><option value="A">A — Basso</option><option value="B" selected>B — Medio</option><option value="C">C — Alto</option></select></div>
      <div class="f end"><button class="btn pri" onclick="SDMM.aggiungiCliente('qc')">➕ Aggiungi cliente</button></div></div></details>`;
  return `${ui.msg.ordini || ''}${nessunCliente}${avviso}${card('📋', 'Nuovo ordine di vendita', 'VA01', form + rapidi)}
    ${card('📚', 'Ordini di vendita', 'VA05', tb(['N° ordine','Cliente','Rif. cliente','Consegna','Pz>','Prezzo>','Totale IVA incl.>','Stato',''], righe))}`;
}

// ── 2. ATP, CREDITO, CONFERMA D'ORDINE ─────────────────────────────────
function scrCtrl(){
  const o = ord(ui.sel.ctrl);
  let body = `<div class="fg"><div class="f">${selectOrdini('ctrl')}</div><div class="f end"><button class="btn pri" onclick="SDMM.esegui()">▶ Esegui controlli ATP + credito</button></div></div>`;
  if(o){
    const c = cliente(o.cliId), qd = qConsegn(o), ridotto = qEff(o) !== o.qty;
    body += infoCli(o.cliId) + `<div class="info">Ordine <b>${o.id}</b> · ${qEff(o)} pz${ridotto ? ` (chiuso a quantità consegnata, richiesti ${o.qty})` : ''} × ${euro(o.prezzo)} = <b>${euro(totOrd(o))}</b> IVA inclusa · Stato ${badgeStato(statoOrd(o))}</div>`;
    if(ui.chk[o.id]){
      const disp = atp(o), risc = riservato(o.id), cap = Math.min(qEff(o), qd + Math.max(0, disp)), esp = esposizione(o.cliId), pct = c.fido > 0 ? Math.round(esp / c.fido * 100) : 100;
      body += `<div class="grp" style="margin-top:6px">Controllo disponibilità (ATP)</div>` + tb(['Materiale','Ordinato>','Giacenza fisica>','Riservato ad altri ordini>','ATP disponibile>','Confermabile>','Esito'],
        [[`TRN-001 — Transenna grezza`, String(qEff(o) - qd), String(pfFisico()), String(risc), String(Math.max(0, disp)), String(cap - qd), cap >= qEff(o) ? bd('g','CONFERMABILE') : cap > qd ? bd('o','PARZIALE') : bd('r','NON DISPONIBILE')]]);
      body += `<div class="small" style="margin:6px 0 12px">Giacenza fisica = ${inMagazzino()} pz in magazzino + ${inSpedizione()} pz in area di spedizione. Il riservato è la quota già confermata ad altri ordini e non ancora consegnata.</div>`;
      body += o.rifiutato
        ? al('ko', 'Ordine respinto definitivamente dal Credit Manager', `Blocco definitivo${o.creditApproval && o.creditApproval.notes ? ': ' + esc(o.creditApproval.notes) : ''}. L'ordine non pesa più sul castelletto del cliente e non può proseguire.`)
        : bloccato(o)
        ? al('ko', '[W065] BLOCCO CREDITO — Delivery Block 01', `Fido ${euro(c.fido)} · esposizione ${euro(esp)} · eccedenza <b>${euro(esp - c.fido)}</b> (utilizzo ${pct}%). Serve l'autorizzazione del Credit Manager (VKM4) oppure un aumento del fido (FD32).`)
        : al('ok', 'Credit check superato', `Fido ${euro(c.fido)} · esposizione ${euro(esp)} · utilizzo ${pct}%${creditoOverride(o) ? ' — sforamento autorizzato dal Credit Manager per questo ordine' : ''}.`);
      if(bloccato(o) && !o.rifiutato) body += panelCredito(o, esp);
    }
    if(!bloccato(o) && (ui.chk[o.id] || o.conferma)){
      const cap = Math.min(qEff(o), qd + Math.max(0, atp(o))), q0 = o.conferma ? o.conferma.qta : cap;
      body += `<div class="grp">Conferma d'ordine</div>` + (cap - qd <= 0 && !o.conferma ? al('wa', 'Nessuna disponibilità', 'Non ci sono transenne disponibili da confermare: produci prima (PP → CO01 … entrata merci 101 — Dichiarazione di Produzione) e ripeti il controllo.') :
        `<div class="fg"><div class="f"><label>Quantità confermata (max ${cap} pz)</label><input type="number" id="c-qta" min="${Math.max(qd, 1)}" max="${cap}" step="1" value="${Math.min(q0, cap)}"></div>
          <div class="f"><label>Data di consegna confermata</label><input type="date" id="c-data" value="${o.conferma ? o.conferma.dataConsegna : o.dataConsegna}"></div>
          <div class="f end"><button class="btn pri" onclick="SDMM.confermaOrdine()">✅ ${o.conferma ? 'Aggiorna la conferma' : 'Conferma l\'ordine'}</button></div></div>`);
    }
    if(o.conferma && o.conferma.automatica) body += al('in', `Conferma aggiornata automaticamente il ${fd(o.conferma.data)}`, `${esc(o.conferma.motivo || 'ricalcolo ATP')} → confermati ${o.conferma.qta} pz su ${qEff(o)}.`);
    else if(o.atpInAttesa && !o.conferma && !bloccato(o)) body += al('wa', 'In attesa di produzione', 'Appena registri in PP un\'entrata merci di transenne (101) l\'ordine viene confermato automaticamente con la nuova disponibilità.');
    if(o.conferma) body += docConferma(o);
    if(qd > 0 && qd < qEff(o) && !fattOrd(o)) body += `<div class="sep"></div><button class="btn red" onclick="SDMM.chiudiResiduo('${o.id}')">Chiudi il residuo (l'ordine resta a ${qd} pz consegnati)</button> <span class="small">Serve se il cliente rinuncia alla parte mancante: senza, il Triple Match non permette di fatturare.</span>`;
  }
  return `${ui.msg.ctrl || ''}${card('🔍', 'Controllo ATP, credito e conferma d\'ordine', 'VA02 · VKM4', body)}`;
}
const CR_STATI = {PENDING:'📨 Richiesta inviata — in attesa del Credit Manager', REJECTED:'🚫 Non autorizzato per ora (l\'ordine resta bloccato)', APPROVED_LIMIT_INCREASE:'✅ Fido aumentato', APPROVED_EXCEPTION:'✅ Sforamento autorizzato per questo ordine', BLOCKED_DEFINITIVE:'⛔ Blocco definitivo'};
function panelCredito(o, esp){
  const a = o.creditApproval;
  return `<div class="card" style="border-color:#BB0000"><div class="ch"><span>💳</span><h2>Credit Manager — richiesta di sblocco</h2><span class="tx">VKM4 · FD32</span></div><div class="cb">
    <p style="margin-bottom:8px">${a ? `<b>${CR_STATI[a.status] || a.status}</b>${a.manager ? ' · ' + esc(a.manager) : ''}${a.notes ? ' — ' + esc(a.notes) : ''}` : 'Nessuna richiesta inviata.'}</p>
    <div class="fg"><div class="f"><label>Richiedente (chi vende)</label><input id="cr-nome" placeholder="es. ufficio commerciale"></div>
      <div class="f"><label>Perché va sbloccato (note commerciali)</label><input id="cr-note" placeholder="es. cliente storico, pagamento anticipato promesso"></div></div>
    <button class="btn" onclick="SDMM.richiestaCredito()">📨 Invia richiesta al Credit Manager</button>
    <button class="btn pri" onclick="SDMM.apriCredit('${o.id}')">💳 Apri la scrivania del Credit Manager</button>
    <p class="small" style="margin-top:8px">Chi vende non può sbloccare da solo: la decisione (aumento del fido, sforamento per questo ordine, non autorizzato, blocco definitivo) spetta al Credit Manager.</p></div></div>`;
}
const LOG_DEC = {RICHIESTA:'Richiesta di sblocco', AUMENTO_FIDO:'Aumento del fido', ECCEZIONE:'Sforamento autorizzato (solo questo ordine)', NON_AUTORIZZATO:'Non autorizzato per ora', BLOCCO_DEFINITIVO:'Blocco definitivo dell\'ordine', BLOCCO_CLIENTE:'Cliente bloccato', SBLOCCO_CLIENTE:'Cliente sbloccato'};
// Scrivania del Credit Manager: castelletto per cliente, pratiche da decidere, registro delle decisioni
function scrCredit(){
  const casi = S().ordini.filter(o => bloccato(o) && !o.rifiutato);
  const cur = ui.sel.credit ? ord(ui.sel.credit) : null;
  const sel = cur && !cur.rifiutato && bloccato(cur) ? cur.id : (casi[0] ? casi[0].id : '');
  ui.sel.credit = sel;
  const cast = S().clienti.map(c => {
    const esp = esposizione(c.id), pct = c.fido > 0 ? Math.round(esp / c.fido * 100) : (esp > 0 ? 999 : 0);
    const st = c.bloccoCredito ? bd('r', 'CLIENTE BLOCCATO') : esp > c.fido ? bd('r', 'SFORATO') : pct >= 80 ? bd('o', 'ATTENZIONE') : bd('g', 'OK');
    const barra = `<div style="background:#E5E5E5;height:8px;border-radius:4px;width:110px;display:inline-block;vertical-align:middle"><i style="display:block;height:100%;width:${Math.min(100, pct)}%;background:${pct > 100 ? '#BB0000' : pct >= 80 ? '#E9730C' : '#107E3E'};border-radius:4px"></i></div> <span class="small">${pct}%</span>`;
    const az = c.bloccoCredito
      ? `<input id="bm-${c.id}" placeholder="motivazione dello sblocco" style="width:170px"> <button class="btn sm" onclick="SDMM.sbloccaCliente('${c.id}')">Sblocca cliente</button>`
      : `<input id="bm-${c.id}" placeholder="motivazione del blocco" style="width:170px"> <button class="btn sm red" onclick="SDMM.bloccaCliente('${c.id}')">Blocca cliente</button>`;
    return [`<span class="mono">${c.id}</span>`, esc(c.nome), RISCHIO[c.rischio] || c.rischio, euro(c.fido), euro(esp), `<b style="color:${c.fido - esp < 0 ? '#BB0000' : '#107E3E'}">${euro(c.fido - esp)}</b>`, barra, st, az];
  });
  const righeCasi = casi.map(o => { const c = cliente(o.cliId), esp = esposizione(o.cliId), a = o.creditApproval;
    return [`<span class="mono">${o.id}</span>`, esc(nomeCli(o.cliId)), euro(totOrd(o)), euro(c.fido), euro(esp), `<b style="color:#BB0000">${euro(Math.max(0, esp - c.fido))}</b>`, a ? bd(a.status === 'PENDING' ? 'o' : 'r', a.status === 'PENDING' ? 'richiesta inviata' : 'non autorizzato') : bd('n', 'nessuna richiesta'), a && a.notes ? esc(a.notes) : '',
      `<button class="btn sm ${o.id === sel ? 'pri' : ''}" onclick="SDMM.selCase('${o.id}')">${o.id === sel ? 'In esame' : 'Esamina'}</button>`]; });
  let pratica = '';
  const o = sel ? ord(sel) : null;
  if(o){
    const c = cliente(o.cliId), esp = esposizione(o.cliId), ecc = Math.max(0, r2(esp - c.fido)), pct = c.fido > 0 ? Math.round(esp / c.fido * 100) : 999, a = o.creditApproval;
    const ordiniCli = S().ordini.filter(x => x.cliId === c.id && !x.rifiutato);
    const incassato = r2(sum(S().fatture.filter(f => f.cliId === c.id && f.incasso), f => f.totale));
    const det = ordiniCli.map(x => [`<span class="mono">${x.id}</span>`, badgeStato(statoOrd(x)), euro(totOrd(x))]);
    const storico = S().creditLog.filter(l => l.cliId === c.id).slice(-4).reverse().map(l => `${fd(l.data)} · ${LOG_DEC[l.decisione] || l.decisione}${l.nota ? ' — ' + esc(l.nota) : ''}`);
    const minFido = Math.ceil(esp / 1000) * 1000;
    pratica = card('', `Pratica: ordine ${o.id} — ${esc(c.nome)}`, 'UKM_CASE', `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px">
        ${[['Fido attuale', euro(c.fido)], ['Esposizione con questo ordine', euro(esp)], ['Eccedenza', euro(ecc)], ['Utilizzo del castelletto', pct + '%'], ['Rischio', RISCHIO[c.rischio] || c.rischio]].map(k => `<div class="info" style="margin:0"><span class="small">${k[0]}</span><br><b>${k[1]}</b></div>`).join('')}</div>
      ${tb(['Ordine','Stato','Totale IVA incl.>'], det)}
      <p class="small" style="margin:6px 0">Esposizione = ordini del cliente (IVA inclusa, esclusi quelli respinti) − fatture già incassate (${euro(incassato)}).</p>
      ${a && a.notes ? `<div class="info"><b>Richiesta commerciale</b> (${fd(a.richiestaIl)}${a.richiedente ? ' · ' + esc(a.richiedente) : ''}): ${esc(a.notes)}</div>` : '<div class="info">Nessuna richiesta commerciale registrata per questo ordine.</div>'}
      ${storico.length ? `<div class="info"><b>Decisioni precedenti su questo cliente</b><br>${storico.join('<br>')}</div>` : ''}
      <div class="grp" style="margin-top:10px">Decisione del Credit Manager</div>
      <div class="fg"><div class="f"><label>Credit Manager</label><input id="cm-nome" value="${esc(ui.cmNome || '')}" placeholder="es. M. Rossi"></div>
        <div class="f"><label>Motivazione (obbligatoria, resta nel registro)</label><input id="cm-note" placeholder="es. incassi regolari da 3 anni"></div>
        <div class="f"><label>Nuovo fido (per «Aumenta il fido») — minimo ${euro(minFido)}</label><input type="number" id="cm-fido" step="100" value="${minFido}"></div>
        <div class="f"><label>Durata dell'aumento</label><select id="cm-durata"><option value="PERMANENTE">Permanente (aggiorna il fido base)</option><option value="GIRO">Solo per questo giro (torna al fido base col Nuovo giro)</option></select></div></div>
      <label style="display:flex;gap:7px;align-items:center;color:#32363A;margin-bottom:10px"><input type="checkbox" id="cm-blocca-cliente" style="width:auto"> Con il blocco definitivo, blocca anche il cliente: nessun nuovo ordine finché non lo sblocchi</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn grn" onclick="SDMM.decisioneCredito('INCREASE')">📈 Aumenta il fido</button>
        <button class="btn grn" onclick="SDMM.decisioneCredito('EXCEPTION')">✅ Autorizza sforamento (solo questo ordine)</button>
        <button class="btn" onclick="SDMM.decisioneCredito('REJECT')">🚫 Non autorizzare per ora</button>
        <button class="btn red" onclick="SDMM.decisioneCredito('BLOCK')">⛔ Blocco definitivo</button></div>
      <p class="small" style="margin-top:8px"><b>Non autorizzare per ora</b>: l'ordine resta bloccato e si può ripresentare (per esempio dopo nuovi incassi). <b>Blocco definitivo</b>: l'ordine è respinto e non pesa più sul castelletto.</p>`);
  }
  const log = S().creditLog.slice().reverse().map(l => [fd(l.data), l.ordId ? `<span class="mono">${l.ordId}</span>` : '—', esc(nomeCli(l.cliId)), `<b>${LOG_DEC[l.decisione] || l.decisione}</b>`,
    l.fidoPrima != null ? `${euro(l.fidoPrima)} → ${euro(l.fidoDopo)}` : '—', l.esposizione != null ? euro(l.esposizione) : '—', esc(l.manager || ''), esc(l.nota || '')]);
  return `${ui.msg.credit || ''}
    ${card('', 'Castelletto crediti per cliente', 'FD32', tb(['Codice','Cliente','Rischio','Fido>','Esposizione>','Disponibile>','Utilizzo','Stato','Blocco cliente'], cast))}
    ${card('', `Pratiche da decidere (${casi.length})`, 'VKM4', casi.length ? tb(['Ordine','Cliente','Importo ordine>','Fido>','Esposizione>','Eccedenza>','Richiesta','Note commerciali',''], righeCasi) : '<p class="small">Nessun ordine in blocco credito.</p>')}
    ${pratica}
    ${card('', 'Registro delle decisioni', 'UKM_CASE', log.length ? tb(['Data','Ordine','Cliente','Decisione','Fido','Esposizione>','Credit Manager','Motivazione'], log) : '<p class="small">Nessuna decisione ancora registrata.</p>')}`;
}
function docConferma(o){
  const c = cliente(o.cliId) || {}, cf = o.conferma, parz = cf.qta < qEff(o);
  return `<div class="doc"><div class="dh"><div><h1>Ferro &amp; Transenne S.r.l.</h1><p>Conferma d'ordine al cliente (output BA00)</p></div>
    <div class="dt"><h2>CONFERMA D'ORDINE</h2><p><b>N°</b> ${cf.id}<br><b>Data</b> ${fd(cf.data)}<br><b>Ordine vendita</b> ${o.id}</p></div></div>
    <div class="dp"><div><h4>Cliente</h4><p><b>${esc(c.nome)}</b><br>${esc(c.citta)}<br>P.IVA ${esc(c.piva)}</p></div>
    <div><h4>Condizioni</h4><p>Rif. cliente ${esc(o.poCliente)}<br>Incoterms ${esc(o.incoterms)} · Pagamento ${o.pagamentoGg} gg<br>Consegna confermata <b>${fd(cf.dataConsegna)}</b></p></div></div>
    ${tb(['Materiale','Richiesto>','Confermato>','Prezzo>','Importo>'], [['TRN-001 — Transenna grezza', String(qEff(o)), `<b>${cf.qta}</b>`, euro(o.prezzo), euro(r2(cf.qta * o.prezzo))]])}
    <div class="foot">${parz ? `<b>Conferma parziale:</b> ${qEff(o) - cf.qta} pz non confermati per mancanza di disponibilità. ` : ''}Documento di gestione: non genera scritture contabili.</div></div>`;
}

// ── 3. PICKING (primo passaggio: magazzino → area di spedizione) ────────────────
function scrPick(){
  const st = S().struttura, o = ord(ui.sel.pick);
  const da = x => !bloccato(x) && x.conferma && (qResConf(x) - qStaged(x)) > 0;
  const nStaged = inSpedizione();
  let body = `<div class="tm"><div class="n"><b>${inMagazzino()} pz</b>Magazzino PF · ubicazione ${esc(st.magazzino)}</div><span>➜ picking ➜</span>
    <div class="n"><b>${nStaged} pz</b>Area di spedizione · punto ${esc(st.puntoSpedizione)} / ${esc(st.puntoCarico)}</div><span>➜ DDT / uscita merci ➜</span><div class="n"><b>Cliente</b>mov. 601</div></div>
    <p class="small" style="margin:8px 0 14px">Doppio passaggio: il picking sposta i pezzi dall'ubicazione di magazzino all'area del punto di spedizione (nessuna scrittura contabile: è sempre il conto 13). L'uscita vera e propria, con la scrittura di costo del venduto, avviene solo con il DDT.</p>
    <div class="fg"><div class="f">${selectOrdini('pick', da, '— ordini con pezzi da prelevare —')}</div></div>`;
  if(o){
    const res = qResConf(o) - qStaged(o), max = Math.max(0, Math.min(res, inMagazzino()));
    body += `<div class="info">Ordine <b>${o.id}</b> · ${esc(nomeCli(o.cliId))} · confermati ${qConf(o)} pz · consegnati ${qConsegn(o)} · già in area spedizione ${qStaged(o)} · <b>da prelevare ${res}</b></div>
      <div class="fg"><div class="f"><label>Pezzi da prelevare (max ${max})</label><input type="number" id="pk-qty" min="1" max="${max}" step="1" value="${max}"></div>
      <div class="f"><label>Data picking</label><input type="date" id="pk-data" value="${oggi()}"></div>
      <div class="f end"><button class="btn pri" ${max <= 0 ? 'disabled' : ''} onclick="SDMM.faiPicking()">📦 Esegui picking (trasferimento interno)</button></div></div>`;
  }
  const righe = S().pick.map(p => [`<span class="mono">${p.id}</span>`, fd(p.data), p.ordId, esc(nomeCli((ord(p.ordId) || {}).cliId)), String(p.qty), `SLoc ${esc(p.sloc)} · scaffale ${esc(p.scaffale)}`, 'Nessuna scrittura']);
  return `${ui.msg.pick || ''}${card('📦', 'Picking e area di spedizione', 'LT03 · VL02N', body)}${card('📚', 'Trasferimenti eseguiti', '', tb(['N° picking','Data','Ordine','Cliente','Pz>','Provenienza','Contabilità'], righe))}`;
}

// ── 4. DDT / USCITA MERCI (secondo passaggio: area di spedizione → cliente) — equivalente vendite della MIGO ──
function righeDDTPrev(q){ const c = costoUscitaFIFO(q); return righeDDT({importoCdV:c.costoTotale, lotti:c.prelievi}); }
function scegliCdV(){
  const bloccato = S().ddt.length > 0 || S().fatture.length > 0, m = cdvAlDDT() ? 'DDT' : 'FATTURA';
  const r = (v, t) => `<label style="display:flex;gap:6px;align-items:center;color:#32363A"><input type="radio" name="cdv-mode" style="width:auto" ${m === v ? 'checked' : ''} ${bloccato ? 'disabled' : ''} onchange="SDMM.setCdv('${v}')"> ${t}</label>`;
  return `<div class="info"><b>Costo del venduto (41/13): quando si contabilizza?</b><div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:6px">${r('DDT', 'con il <b>DDT</b> — scrittura separata all\'uscita merci, come in SAP')}${r('FATTURA', 'con la <b>fattura</b> — una sola scrittura, come in Nuova Registrazione')}</div>${bloccato ? '<div class="small" style="margin-top:4px">Non modificabile: ci sono già DDT o fatture in questo giro. Si cambia solo a inizio giro (Nuovo giro).</div>' : ''}</div>`;
}
function boxDDT(q){
  const c = costoUscitaFIFO(q), cu = costoStandardTransenna(), cambiato = q > 0 && Math.abs(c.costoMedio - cu) > 0.005;
  const lot = c.prelievi.map(p => `${p.qty} pz ${esc(p.origine)}${p.data && p.data !== '0000-00-00' ? ' del ' + fd(p.data) : ''} × ${p.costoUnit == null ? '<b style="color:#BB0000">costo non verificabile</b>' : euro(p.costoUnit)}`).join(' · ');
  const dettaglio = `${q} pz × ${euro(c.costoMedio)}/pz (costo medio dei lotti prelevati) = <b>${euro(c.costoTotale)}</b>${cambiato ? ` <span class="small">— lo standard attuale è ${euro(cu)}/pz: i pezzi in uscita provengono da lotti prodotti a un costo diverso</span>` : ''}${lot ? `<br><span class="small">Lotti FIFO: ${lot}</span>` : ''}`;
  const blocchi = (c.mancano > 0.005 ? al('ko', '⛔ Giacenza valorizzata insufficiente', `Mancano ${c.mancano} pz nei lotti valorizzati del magazzino prodotti finiti: registra prima la produzione.`) : '')
    + (c.anomalie.length ? al('ko', '⛔ Costo storico non verificabile', esc(c.anomalie.join(' · ')) + '. Il DDT non si registra con lo standard corrente al posto del costo storico.') : '');
  if(!cdvAlDDT()) return blocchi + `<div class="info" style="margin-top:10px"><b>L'uscita merci è solo un movimento fisico: nessuna scrittura in Libro Giornale.</b><br>Il costo del venduto, ${dettaglio} (Dare 41 / Avere 13), verrà contabilizzato con la fattura, nella stessa scrittura di clienti, ricavi, variance e IVA.</div>`;
  return blocchi + anteprima(righeDDTPrev(q), null, {kind:'DDT', edit:true, nota:`Costo del venduto: ${dettaglio}. Ogni lotto esce al costo standard di quando è stato prodotto, non a quello corrente: gli scostamenti di produzione sono già nelle variance 60/61 della dichiarazione di produzione.`});
}
// Riquadro "Standard vs Reale per questa vendita" — stesso contenuto di Nuova Registrazione → Fattura di Vendita
function pannelloVendita(f){
  const cdv = r2(sum(S().ddt.filter(d => d.ordId === f.ordId), d => d.importoCdV));
  return pannello('Standard vs Reale per questa vendita', [
    rigaP('Prezzo standard (da Budget)', f.prezzoStd > 0 ? euro(f.prezzoStd) + '/pezzo' : '<span style="color:#BB0000">non impostato</span>'), rigaP('Prezzo reale applicato', euro(f.prezzo) + '/pezzo'),
    rigaP('Pezzi fatturati', String(f.qty)), rigaP('Ricavi contabilizzati (a standard)', euro(f.ricavi)), rigaP('Imponibile dovuto dal cliente (a reale)', euro(f.imponibile)),
    rigaP(`+ IVA a Debito (${(f.aliquota * 100).toFixed(0)}%)`, euro(f.iva)), rigaP('= Totale dovuto dal cliente (imponibile + IVA)', euro(f.totale), true),
    rigaP(f.cdvIn > 0.004 ? '− Costo del Venduto (a standard, in questa scrittura)' : '− Costo del Venduto (a standard, già contabilizzato con i DDT)', euro(cdv)), rigaP('= Margine Industriale (a standard)', euro(r2(f.ricavi - cdv)), true),
    rigaVar('Variance Prezzo di Vendita (sull\'imponibile)', f.varianza)]);
}
function boxFattura(f){
  const cdv = r2(sum(S().ddt.filter(d => d.ordId === f.ordId), d => d.importoCdV)), dd = S().ddt.filter(d => d.ordId === f.ordId).map(d => d.id).join(', ');
  const zero = Math.abs(f.varianza) > 0.004 ? [] : [{conto:'63', testo:f.prezzoStd > 0 ? 'prezzo di vendita = standard' : 'prezzo standard non impostato nel Budget'}];
  const nota = f.cdvIn > 0.004 ? `Il costo del venduto (Dare 41 / Avere 13) di <b>${euro(f.cdvIn)}</b> a standard è in questa scrittura, come nella Fattura di Vendita di Nuova Registrazione.` : `Il costo del venduto (Dare 41 / Avere 13) di <b>${euro(cdv)}</b> a standard è già stato contabilizzato con il DDT ${esc(dd)}: in SAP nasce con l'uscita merci, non si ripete in fattura.`;
  return anteprima(righeFattura(f), null, {kind:'FATT', edit:true, zero, nota}) + pannelloVendita(f);
}
function scrDDT(){
  const o = ord(ui.sel.ddt), da = x => !bloccato(x) && qStaged(x) > 0;
  let body = scegliCdV() + `<p class="small" style="margin-bottom:10px">Equivalente vendite della MIGO: la merce esce dall'area di spedizione (movimento 601).${cdvAlDDT() ? ' La scrittura di <b>costo del venduto a standard</b> nasce nello stesso istante, senza un secondo passaggio da fare a mano.' : ' Il costo del venduto a standard si contabilizza con la fattura.'}</p>
    <div class="fg"><div class="f">${selectOrdini('ddt', da, '— ordini con merce in area spedizione —')}</div></div>`;
  if(o){
    const q = qStaged(o);
    body += `<div class="info">Ordine <b>${o.id}</b> · ${esc(nomeCli(o.cliId))} · in area spedizione <b>${q} pz</b> · consegnati finora ${qConsegn(o)} su ${qEff(o)} · Incoterms ${esc(o.incoterms)} · costo standard ${euro(costoStandardTransenna())}/pz</div>
      <div class="fg"><div class="f"><label>Pezzi in uscita (max ${q})</label><input type="number" id="dd-qty" min="1" max="${q}" step="1" value="${q}" oninput="SDMM.prevDDT()"></div>
      <div class="f"><label>Data DDT / uscita merci</label><input type="date" id="dd-data" value="${oggi()}"></div>
      <div class="f"><label>Vettore / trasporto a cura di</label><input id="dd-vet" placeholder="${o.incoterms === 'EXW' ? 'ritiro a cura del cliente' : 'corriere / mezzo proprio'}"></div>
      </div><div id="dd-prev">${boxDDT(q)}</div><div style="margin-top:10px"><button class="btn pri" onclick="SDMM.faiDDT()">🚚 Registra DDT e uscita merci</button></div>`;
  }
  const righe = S().ddt.map(d => [`<span class="mono">${d.id}</span>`, fd(d.data), d.ordId, esc(nomeCli(d.cliId)), String(d.qty), euro(d.importoCdV), badgePost('DDT', d.id)]);
  return `${ui.msg.ddt || ''}${card('🚚', 'DDT e uscita merci (mov. 601)', 'VL01N · VL02N', body)}${card('📚', 'DDT registrati', '', tb(['N° DDT','Data','Ordine','Cliente','Pz>','Costo del venduto std>','Contabilità'], righe))}
    ${S().ddt.length ? docDDT(S().ddt[S().ddt.length - 1]) : ''}`;
}
function docDDT(d){
  const o = ord(d.ordId) || {}, c = cliente(d.cliId) || {};
  return `<div class="doc"><div class="dh"><div><h1>Ferro &amp; Transenne S.r.l.</h1><p>Documento di trasporto — ultimo DDT registrato</p></div><div class="dt"><h2>DDT</h2><p><b>N°</b> ${d.id}<br><b>Data</b> ${fd(d.data)}<br><b>Causale</b> Vendita</p></div></div>
    <div class="dp"><div><h4>Destinatario</h4><p><b>${esc(c.nome)}</b><br>${esc(c.citta)}</p></div><div><h4>Riferimenti</h4><p>Ordine vendita ${d.ordId} · rif. cliente ${esc(o.poCliente)}<br>Resa ${esc(o.incoterms)} · vettore ${esc(d.vettore || '—')}<br>Punto di spedizione ${esc(S().struttura.puntoSpedizione)}</p></div></div>
    ${tb(['Materiale','Quantità>'], [['TRN-001 — Transenna grezza', `${d.qty} pz`]])}</div>`;
}

// ── 5. FATTURAZIONE ATTIVA — equivalente vendite della MIRO ─────────────────────────
function docFattura(f){
  const o = ord(f.ordId) || {}, c = cliente(f.cliId) || {}, dd = S().ddt.filter(d => d.ordId === f.ordId);
  return `<div class="doc"><div class="dh"><div><h1>Ferro &amp; Transenne S.r.l.</h1><p>Fattura di vendita</p></div><div class="dt"><h2>FATTURA</h2><p><b>N°</b> ${f.id}<br><b>Data</b> ${fd(f.data)}<br><b>Tipo</b> F2</p></div></div>
    <div class="dp"><div><h4>Fatturato a</h4><p><b>${esc(c.nome)}</b><br>${esc(c.citta)}<br>P.IVA ${esc(c.piva)}</p></div>
    <div><h4>Riferimenti</h4><p>Ordine cliente ${esc(o.poCliente)} · ordine vendita ${f.ordId}<br>DDT ${dd.map(d => d.id).join(', ')}<br>Incoterms ${esc(o.incoterms)}</p></div></div>
    ${tb(['Descrizione','Quantità>','Prezzo>','Importo>'], [['TRN-001 — Transenna grezza', `${f.qty} pz`, euro(f.prezzo), euro(f.imponibile)]])}
    <table class="tot"><tr><td>Imponibile</td><td class="r">${euro(f.imponibile)}</td></tr><tr><td>IVA ${(f.aliquota * 100).toFixed(0)}%</td><td class="r">${euro(f.iva)}</td></tr><tr><td><b>Totale fattura</b></td><td class="r"><b>${euro(f.totale)}</b></td></tr></table>
    <div class="foot">Pagamento a ${o.pagamentoGg} gg — scadenza <b>${fd(f.scadenza)}</b></div></div>`;
}
function scrFatt(){
  const o = ord(ui.sel.fatt), da = x => S().ddt.some(d => d.ordId === x.id);
  let body = scegliCdV() + `<p class="small" style="margin-bottom:10px">Equivalente vendite della MIRO: la fattura si genera solo se il <b>Triple Match Ordine ↔ DDT ↔ Fattura</b> è superato; il rilascio in contabilità crea la scrittura clienti / ricavi / IVA.</p>
    <div class="fg"><div class="f">${selectOrdini('fatt', da, '— ordini con DDT —')}</div></div>`;
  if(o){
    const tm = tmVendite(o), f = fattOrd(o);
    body += `<div class="tm"><div class="n"><b>${tm.qOrd} pz</b>Ordine ${o.id}</div><span>↔</span><div class="n"><b>${tm.qDdt} pz</b>${tm.nDdt} DDT</div><span>↔</span><div class="n"><b>${f ? f.qty + ' pz' : '—'}</b>Fattura</div></div>`;
    body += (tm.stato === 'ko') ? al('ko', '⛔ Triple Match non superato', esc(tm.issues.join('; ')) + '.')
      : (tm.stato === 'pronto' || tm.stato === 'ok') ? al('ok', '✅ Triple Match superato — Ordine / DDT / Fattura', `Stesso cliente, ${tm.qOrd} pz ordinati = ${tm.qDdt} pz consegnati${f ? ` = ${f.qty} pz fatturati` : ''}${f ? ', stesso prezzo' : ''}.`)
      : al('wa', 'Triple Match non ancora superabile', esc(tm.issues.join('; ')) + '. Completa le consegne (o chiudi il residuo in "ATP, credito e conferma") prima di fatturare.');
    if(!f){
      body += `<div class="fg"><div class="f"><label>Data fattura</label><input type="date" id="fa-data" value="${oggi()}"></div>
        <div class="f end"><button class="btn pri" ${tm.stato === 'pronto' ? '' : 'disabled'} onclick="SDMM.generaFattura()">🧾 Genera fattura (VF01)</button></div></div>`;
    }else{
      body += `<div class="al al-in"><h4>Fattura ${f.id} — ${badgePost('FATT', f.id, true)}</h4><p>Clienti ${euro(f.totale)} · Ricavi a standard ${euro(f.ricavi)} · Variance prezzo ${euro(Math.abs(f.varianza))}${f.varianza < 0 ? ' (sfavorevole)' : f.varianza > 0 ? ' (favorevole)' : ''} · IVA ${euro(f.iva)}</p></div>`;
      if(!(f.prezzoStd > 0)) body += al('wa', 'Prezzo di vendita standard non impostato', 'Senza "Prezzo di vendita standard" nel Budget Annuo i ricavi entrano al prezzo reale e non nasce nessuna Variance Prezzo di Vendita (conto 63). Imposta il prezzo standard e rigenera la fattura per vedere la variance.');
      const rg = regOf('FATT', f.id);
      body += rg ? anteprima(rg.righe, `Scrittura n° ${rg.id} registrata nel Libro Giornale`) + pannelloVendita(f) : boxFattura(f) + `<div style="margin-top:10px"><button class="btn pri" onclick="SDMM.rilascia('${f.id}')">📤 Rilascia in contabilità</button></div>`;
      if(regOf('FATT', f.id)) body += f.incasso ? `<p>Incassata il <b>${fd(f.incasso.data)}</b> ${badgePost('INC', f.id)}</p>`
        : `<div class="fg"><div class="f"><label>Data incasso</label><input type="date" id="in-data" value="${oggi()}"></div><div class="f end"><button class="btn grn" onclick="SDMM.chiedi('INC','${f.id}')">💶 Registra incasso</button></div></div>`;
      body += docFattura(f);
    }
  }
  const righe = S().fatture.map(f => [`<span class="mono">${f.id}</span>`, fd(f.data), f.ordId, esc(nomeCli(f.cliId)), euro(f.imponibile), euro(f.totale), badgePost('FATT', f.id, true), f.incasso ? bd('g', 'incassata ' + fd(f.incasso.data)) : bd('n', 'aperta')]);
  return `${ui.msg.fatt || ''}${card('🧾', 'Fatturazione attiva', 'VF01 · VF03', body)}${card('📚', 'Fatture emesse', '', tb(['N° fattura','Data','Ordine','Cliente','Imponibile>','Totale>','Contabilità','Incasso'], righe))}`;
}

// ═══════════════════════════════════════════════════════════════════════
// ACQUISTI (MM)
// ═══════════════════════════════════════════════════════════════════════
const selectPO = (chiave, filtro, vuoto) => {
  const lista = S().po.filter(filtro || (() => true)), sel = ui.sel[chiave] || '';
  return `<select onchange="SDMM.selPO('${chiave}',this.value)"><option value="">${vuoto || '— seleziona un ordine di acquisto —'}</option>${
    opt(lista, sel, p => [p.id, `${p.id} — ${esc(nomeForn(p.fid))} — ${p.qty} kg a ${euro(p.prezzo)}/kg [${statoPO(p)}]`])}</select>`;
};
const dPct = (v, base) => base > 0 ? ((v - base) / base * 100) : 0;
const fmtPct = x => (x > 0 ? '+' : '') + x.toFixed(1) + '%';

// ── 6. RFQ FORNITORI (ME41 → ME47 → ME49 → ME21N) ───────────────────────
function scrRFQ(){
  const fs = S().fornitori, sel = S().rfq.find(r => r.id === ui.sel.rfq);
  const nuova = `<div class="fg"><div class="f"><label>Quantità di ferro richiesta (kg)</label><input type="number" id="rf-qty" min="1" step="0.01"></div>
      <div class="f"><label>Data di consegna richiesta</label><input type="date" id="rf-data" value="${plusGg(oggi(), 15)}"></div></div>
    <label>Fornitori a cui inviare la richiesta di offerta (almeno 2, per poter confrontare)</label>
    <div class="fg">${fs.map(f => `<label style="display:flex;gap:7px;align-items:center;color:#32363A;font-size:13px"><input type="checkbox" id="rf-f-${f.id}" style="width:auto"> ${esc(f.nome)} <span class="small">(${f.pagamentoGg} gg)</span></label>`).join('')}</div>
    <button class="btn pri" onclick="SDMM.creaRFQ()">✉️ Crea e invia RFQ (ME41)</button>`;
  let dett = '';
  if(sel){
    const std = ferroStd(), quot = sel.fornitori.filter(x => x.prezzo > 0), best = quot.length ? Math.min(...quot.map(x => x.prezzo)) : null;
    const inp = sel.stato === 'APERTA';
    dett = `<div class="grp">Offerte ricevute — RFQ ${sel.id} · ${sel.qty} kg · consegna richiesta ${fd(sel.dataConsegna)}</div>` +
      tb(['Fornitore','Prezzo €/kg>','Consegna (gg)>','Pagamento (gg)>'], sel.fornitori.map(x => [esc(nomeForn(x.fid)),
        inp ? `<input type="number" step="0.001" id="of-p-${x.fid}" value="${x.prezzo || ''}" style="width:110px;text-align:right">` : (x.prezzo ? euro(x.prezzo) : '—'),
        inp ? `<input type="number" step="1" id="of-g-${x.fid}" value="${x.gg || ''}" style="width:90px;text-align:right">` : (x.gg || '—'),
        inp ? `<input type="number" step="1" id="of-pg-${x.fid}" value="${x.pagGg != null ? x.pagGg : (fornitore(x.fid) || {}).pagamentoGg}" style="width:90px;text-align:right">` : (x.pagGg != null ? x.pagGg : '—')]))
      + (inp ? `<p style="margin-top:8px"><button class="btn" onclick="SDMM.salvaOfferte()">💾 Salva offerte (ME47)</button></p>` : '');
    if(quot.length){
      dett += `<div class="grp">Confronto offerte (ME49) — prezzo standard di riferimento ${euro(std)}/kg</div>` +
        tb(['Fornitore','Prezzo €/kg>','vs standard>','Consegna gg>','Pagamento gg>','Totale offerta (imponibile)>','Esito',''], quot.map(x => [esc(nomeForn(x.fid)), euro(x.prezzo),
          `<span style="color:${x.prezzo > std ? '#BB0000' : '#107E3E'}">${fmtPct(dPct(x.prezzo, std))}</span>`, String(x.gg || '—'), String(x.pagGg != null ? x.pagGg : '—'), euro(r2(sel.qty * x.prezzo)),
          sel.vincitore === x.fid ? bd('g', '🏆 assegnata') : x.prezzo === best ? bd('b', 'miglior prezzo') : (sel.stato === 'ASSEGNATA' ? bd('n', 'non assegnata') : ''),
          inp ? `<button class="btn sm pri" onclick="SDMM.assegna('${x.fid}')">Assegna → ordine acquisto</button>` : (sel.vincitore === x.fid ? `Ordine ${sel.poId}` : '')]))
        + `<p class="small" style="margin-top:6px">Un prezzo sopra lo standard genererà, con la MIGO, una Variance Prezzo Acquisto sfavorevole (conto 62): il confronto serve a vederla PRIMA di ordinare.</p>`;
    }
  }
  const righe = S().rfq.map(r => [`<span class="mono">${r.id}</span>`, fd(r.data), `${r.qty} kg`, r.fornitori.map(x => esc(nomeForn(x.fid))).join(', '), `${r.fornitori.filter(x => x.prezzo > 0).length}/${r.fornitori.length}`, badgeStato(r.stato), r.poId || '',
    `<button class="btn sm" onclick="SDMM.selRFQ('${r.id}')">Apri</button>`]);
  return `${ui.msg.rfq || ''}${card('✉️', 'Nuova richiesta di offerta (RFQ)', 'ME41', nuova)}${card('📚', 'RFQ e offerte', 'ME47 · ME49', tb(['N° RFQ','Data','Quantità','Fornitori','Offerte>','Stato','Ordine acquisto',''], righe) + dett)}`;
}

// ── 7. ORDINI DI ACQUISTO ───────────────────────────────────────────────
function scrPO(){
  const dir = `<div class="fg"><div class="f"><label>Fornitore</label><select id="po-f"><option value="">— seleziona —</option>${opt(S().fornitori, '', f => [f.id, `${f.id} — ${esc(f.nome)}`])}</select></div>
    <div class="f"><label>Quantità (kg)</label><input type="number" id="po-qty" min="1" step="0.01"></div>
    <div class="f"><label>Prezzo concordato (€/kg)</label><input type="number" id="po-prezzo" step="0.001"></div>
    <div class="f"><label>Data di consegna</label><input type="date" id="po-data" value="${plusGg(oggi(), 15)}"></div>
    <div class="f end"><button class="btn pri" onclick="SDMM.creaPO()">🛒 Crea ordine di acquisto (ME21N)</button></div></div>
    <p class="small">Di norma l'ordine nasce dall'assegnazione di una RFQ; l'ordine diretto serve per il fornitore abituale con prezzo già concordato.</p>`;
  const righe = S().po.map(p => [`<span class="mono">${p.id}</span>`, esc(nomeForn(p.fid)), p.rfqId || '—', `${p.qty} kg`, euro(p.prezzo), euro(r2(p.qty * p.prezzo)), `${qRicevuta(p)} kg`, `${qFatturata(p)} kg`, badgeStato(statoPO(p)),
    S().migo.some(m => m.poId === p.id) ? '' : `<button class="btn sm red" onclick="SDMM.eliminaPO('${p.id}')">Elimina</button>`]);
  return `${ui.msg.po || ''}${card('🛒', 'Ordine di acquisto diretto', 'ME21N', dir)}${card('📚', 'Ordini di acquisto', 'ME23N', tb(['N° ordine','Fornitore','RFQ','Ordinato>','Prezzo>','Valore>','Ricevuto>','Fatturato>','Stato',''], righe))}`;
}

// ── 8. MIGO — ENTRATA MERCI ─────────────────────────────────────────────
function righeMIGOPrev(p, q){
  const prima = qRicevuta(p), dopo = r2(prima + q);
  return righeMIGO({valStd:r2(q * ferroStd()), valPO:r2(cumPO(p, dopo) - cumPO(p, prima))});
}
function scegliAcq(){
  const bloccato = S().migo.length > 0 || S().miro.length > 0, m = acqAlMIRO() ? 'MIRO' : 'MIGO';
  const r = (v, t) => `<label style="display:flex;gap:6px;align-items:center;color:#32363A"><input type="radio" name="acq-mode" style="width:auto" ${m === v ? 'checked' : ''} ${bloccato ? 'disabled' : ''} onchange="SDMM.setAcq('${v}')"> ${t}</label>`;
  return `<div class="info"><b>Acquisto del ferro: quando si contabilizza?</b><div style="display:flex;gap:22px;flex-wrap:wrap;margin-top:6px">${r('MIGO', 'con la <b>MIGO</b> e poi la MIRO — conto ponte fatture da ricevere (GR/IR), come in SAP')}${r('MIRO', 'con la <b>fattura fornitore (MIRO)</b> — una sola scrittura, come in Nuova Registrazione')}</div>${bloccato ? '<div class="small" style="margin-top:4px">Non modificabile: ci sono già MIGO o MIRO in questo giro. Si cambia solo a inizio giro (Nuovo giro).</div>' : ''}</div>`;
}
function boxMIGO(p, q){
  if(acqAlMIRO()){
    const prima = qRicevuta(p), valStd = r2(q * ferroStd());
    return `<div class="info" style="margin-top:10px"><b>L'entrata merci è solo un movimento fisico: nessuna scrittura in Libro Giornale.</b><br>Il ferro entra in magazzino a standard, ${q.toFixed(2)} kg × ${euro(ferroStd())} = <b>${euro(valStd)}</b> (Dare 12), con la fattura fornitore (MIRO), nella stessa scrittura di debito verso il fornitore, variance prezzo e IVA a credito.</div>`;
  }
  const prima = qRicevuta(p), dopo = r2(prima + q), valStd = r2(q * ferroStd()), valPO = r2(cumPO(p, dopo) - cumPO(p, prima)), v = r2(valStd - valPO);
  return anteprima(righeMIGOPrev(p, q), null, {kind:'MIGO', edit:true, zero:Math.abs(v) > 0.004 ? [] : [{conto:'62', testo:'prezzo d\'ordine = prezzo standard'}]}) + pannello('Standard vs Reale per questa entrata merci', [
    rigaP('Prezzo standard', euro(ferroStd()) + '/kg'), rigaP('Prezzo d\'ordine', euro(p.prezzo) + '/kg'), rigaP('Quantità ricevuta', q.toFixed(2) + ' kg'),
    rigaP('Magazzino valorizzato (a standard)', euro(valStd)), rigaP('GR/IR (a prezzo d\'ordine)', euro(valPO)), rigaVar('Variance Prezzo Acquisto (standard − ordine)', v)]);
}
function scrMIGO(){
  const p = poDoc(ui.sel.migo), da = x => (x.qty - qRicevuta(x)) > 1e-9;
  let body = scegliAcq() + `<p class="small" style="margin-bottom:10px">La MIGO (movimento 101) carica il magazzino del ferro <b>a prezzo standard</b> e apre il conto ponte <b>GR/IR</b> (merci ricevute non fatturate) a prezzo d'ordine. La differenza tra i due è la Variance Prezzo Acquisto (62). Il costo verso il fornitore lo chiude la MIRO.</p>
    <div class="fg"><div class="f">${selectPO('migo', da, '— ordini di acquisto con merce da ricevere —')}</div></div>`;
  if(p){
    const res = r2(p.qty - qRicevuta(p));
    body += `<div class="info">Ordine <b>${p.id}</b> · ${esc(nomeForn(p.fid))} · ordinati ${p.qty} kg a ${euro(p.prezzo)}/kg (standard ${euro(ferroStd())}/kg) · ricevuti ${qRicevuta(p)} kg · <b>residuo ${res} kg</b> · giacenza ferro ${mpFisico().toFixed(2)} kg</div>
      <div class="fg"><div class="f"><label>Quantità ricevuta (kg, max ${res})</label><input type="number" id="mg-qty" min="0.01" max="${res}" step="0.01" value="${res}" oninput="SDMM.prevMIGO()"></div>
      <div class="f"><label>N° DDT del fornitore</label><input id="mg-ddt" placeholder="es. DDT 2026/4471"></div>
      <div class="f"><label>Data entrata merci</label><input type="date" id="mg-data" value="${oggi()}"></div>
      </div><div id="mg-prev">${boxMIGO(p, res)}</div><div style="margin-top:10px"><button class="btn pri" onclick="SDMM.faiMIGO()">📥 Registra entrata merci (MIGO)</button></div>`;
  }
  const righe = S().migo.map(m => [`<span class="mono">${m.id}</span>`, fd(m.data), m.poId, esc(nomeForn(m.fid)), esc(m.ddtForn), `${m.qty} kg`, euro(m.valStd), euro(m.valPO), badgePost('MIGO', m.id)]);
  return `${ui.msg.migo || ''}${card('📥', 'MIGO — Entrata merci da ordine di acquisto', 'MIGO · mov. 101', body)}${card('📚', 'Entrate merci', '', tb(['N° MIGO','Data','Ordine acq.','Fornitore','DDT fornitore','Kg>','Magazzino a std>','GR/IR a prezzo ordine>','Contabilità'], righe))}`;
}

// ── 9. MIRO — VERIFICA FATTURA FORNITORE ────────────────────────────────
function righeMIROPrev(p, q, prezzo){
  const prima = qFatturata(p), dopo = r2(prima + q), grir = r2(cumPO(p, dopo) - cumPO(p, prima)), imp = r2(q * prezzo), iv = r2(imp * aliq());
  return righeMIRO({grir, imp, iva:iv, tot:r2(imp + iv), diff:r2(imp - grir), valStd:r2(q * ferroStd()), completa:acqAlMIRO()});
}
function boxMIRO(p, q, pr){
  const prima = qFatturata(p), dopo = r2(prima + q), grir = r2(cumPO(p, dopo) - cumPO(p, prima)), imp = r2(q * pr), iv = r2(imp * aliq()), diff = r2(imp - grir);
  if(acqAlMIRO()){
    const valStd = r2(q * ferroStd()), v = r2(valStd - imp);
    return anteprima(righeMIROPrev(p, q, pr), null, {kind:'MIRO', edit:true, zero:Math.abs(v) > 0.004 ? [] : [{conto:'62', testo:'prezzo in fattura = prezzo standard'}]}) + pannello('Standard vs Reale per questo acquisto', [
      rigaP('Prezzo standard', euro(ferroStd()) + '/kg'), rigaP('Prezzo reale pagato', euro(pr) + '/kg'), rigaP('Quantità acquistata', q.toFixed(2) + ' kg'),
      rigaP('Magazzino valorizzato (a standard)', euro(valStd)), rigaP('Imponibile dovuto al fornitore (a reale)', euro(imp)), rigaP(`+ IVA a Credito (${(aliq() * 100).toFixed(0)}%)`, euro(iv)),
      rigaP('= Totale dovuto al fornitore (imponibile + IVA)', euro(r2(imp + iv)), true), rigaVar('Variance Prezzo Acquisto (sull\'imponibile)', v)]);
  }
  return anteprima(righeMIROPrev(p, q, pr), null, {kind:'MIRO', edit:true, zero:Math.abs(diff) > 0.004 ? [] : [{conto:'62', testo:'prezzo in fattura = prezzo d\'ordine'}]}) + pannello('Standard vs Reale per questa fattura fornitore', [
    rigaP('Prezzo standard', euro(ferroStd()) + '/kg'), rigaP('Prezzo d\'ordine', euro(p.prezzo) + '/kg'), rigaP('Prezzo reale in fattura', euro(pr) + '/kg'), rigaP('Quantità fatturata', q.toFixed(2) + ' kg'),
    rigaP('GR/IR chiuso (a prezzo d\'ordine)', euro(grir)), rigaP('Imponibile dovuto al fornitore (a fattura)', euro(imp)), rigaP(`+ IVA a Credito (${(aliq() * 100).toFixed(0)}%)`, euro(iv)),
    rigaP('= Totale dovuto al fornitore (imponibile + IVA)', euro(r2(imp + iv)), true), rigaVar('Variance Prezzo Acquisto (ordine − fattura)', r2(-diff)),
    rigaVar('Costo reale del ferro rispetto allo standard (MIGO + MIRO)', r2(q * ferroStd() - imp))]);
}
function scrMIRO(){
  const p = poDoc(ui.sel.miro), da = x => r2(qRicevuta(x) - qFatturata(x)) > 1e-9;
  let body = scegliAcq() + `<p class="small" style="margin-bottom:10px">La MIRO è il Triple Match lato acquisti: la fattura del fornitore si registra solo se c'è un ordine e una MIGO a coprirla (quantità fatturata ≤ quantità ricevuta non ancora fatturata). Chiude il GR/IR, registra l'IVA a credito e crea il debito verso il fornitore.</p>
    <div class="fg"><div class="f">${selectPO('miro', da, '— ordini con merce ricevuta e non ancora fatturata —')}</div></div>`;
  if(p){
    const res = r2(qRicevuta(p) - qFatturata(p));
    body += `<div class="tm"><div class="n"><b>${p.qty} kg</b>Ordine ${p.id}</div><span>↔</span><div class="n"><b>${qRicevuta(p)} kg</b>MIGO</div><span>↔</span><div class="n"><b>${qFatturata(p)} kg</b>MIRO già registrate</div></div>
      <div class="info" style="margin-top:8px">${esc(nomeForn(p.fid))} · prezzo d'ordine <b>${euro(p.prezzo)}/kg</b> · fatturabile ora <b>${res} kg</b> · IVA ${(aliq() * 100).toFixed(0)}%</div>
      <div class="fg"><div class="f"><label>N° fattura del fornitore</label><input id="mr-num" placeholder="es. FT 2026/318"></div>
      <div class="f"><label>Data fattura</label><input type="date" id="mr-data" value="${oggi()}"></div>
      <div class="f"><label>Kg fatturati (max ${res})</label><input type="number" id="mr-qty" min="0.01" max="${res}" step="0.01" value="${res}" oninput="SDMM.prevMIRO()"></div>
      <div class="f"><label>Prezzo in fattura (€/kg)</label><input type="number" id="mr-prezzo" step="0.001" value="${p.prezzo}" oninput="SDMM.prevMIRO()"></div></div>
      <label style="display:flex;gap:7px;align-items:center;color:#32363A"><input type="checkbox" id="mr-acc" style="width:auto"> Accetto un eventuale scostamento di prezzo rispetto all'ordine (va a Variance Prezzo Acquisto, conto 62)</label>
      <div id="mr-prev">${boxMIRO(p, res, p.prezzo)}</div><button class="btn pri" onclick="SDMM.faiMIRO()">🧮 Registra fattura fornitore (MIRO)</button>`;
  }
  const righe = S().miro.map(m => [`<span class="mono">${m.id}</span>`, esc(m.nFattura), fd(m.data), m.poId, esc(nomeForn(m.fid)), `${m.qty} kg`, euro(m.prezzo), euro(m.tot), badgePost('MIRO', m.id), fd(m.scadenza),
    !regOf('MIRO', m.id) ? '' : m.pagamento ? bd('g', 'pagata ' + fd(m.pagamento.data)) + ' ' + badgePost('PAG', m.id) : `<input type="date" id="pg-${m.id}" value="${oggi()}" style="width:135px"> <button class="btn sm grn" onclick="SDMM.chiedi('PAG','${m.id}')">Paga</button>`]);
  return `${ui.msg.miro || ''}${card('🧮', 'MIRO — Registrazione fattura fornitore', 'MIRO', body)}${card('📚', 'Fatture fornitori', '', tb(['N° MIRO','Fattura forn.','Data','Ordine acq.','Fornitore','Kg>','€/kg>','Totale IVA incl.>','Contabilità','Scadenza','Pagamento'], righe))}`;
}

// ═══════════════════════════════════════════════════════════════════════
// CONTROLLI CONTABILI — verifiche su Libro Giornale ↔ documenti del modulo
// ═══════════════════════════════════════════════════════════════════════
const dareDi = r => sum(r.righe.filter(x => x.dareAvere === 'DARE'), x => x.importo);
const avereDi = r => sum(r.righe.filter(x => x.dareAvere === 'AVERE'), x => x.importo);
function controlli(){
  const out = [], add = (ok, t, d) => out.push({ok, t, d:d || ''});
  const regsSD = STATO.registrazioni.filter(r => r.origineSD);
  const cnt = {}; regsSD.forEach(r => { const k = r.origineSD.tipo + ':' + r.origineSD.id; cnt[k] = (cnt[k] || 0) + 1; });
  const dup = Object.keys(cnt).filter(k => cnt[k] > 1);
  add(dup.length === 0, 'Nessun documento contabilizzato due volte', dup.length ? `Doppioni: ${dup.join(', ')} — elimina le scritture in eccesso dal Libro Giornale.` : `${regsSD.length} scritture generate dal modulo, al massimo una per documento.`);
  const nc = [];
  S().ddt.forEach(d => { if(cdvAlDDT() && !regOf('DDT', d.id)) nc.push('DDT ' + d.id); });
  S().migo.forEach(m => { if(!acqAlMIRO() && !regOf('MIGO', m.id)) nc.push('MIGO ' + m.id); });
  S().miro.forEach(m => { if(!regOf('MIRO', m.id)) nc.push('MIRO ' + m.id); if(m.pagamento && !regOf('PAG', m.id)) nc.push('pagamento ' + m.id); });
  S().fatture.forEach(f => { if(f.incasso && !regOf('INC', f.id)) nc.push('incasso ' + f.id); });
  add(nc.length === 0, 'Ogni movimento fisico ha la sua scrittura', nc.length ? `Senza scrittura in Libro Giornale: ${nc.join(', ')} — usa il pulsante "Contabilizza" sul documento.` : 'DDT, MIGO, MIRO, incassi e pagamenti sono tutti contabilizzati.');
  const orf = regsSD.filter(r => !REG[r.origineSD.tipo] || !REG[r.origineSD.tipo].get(r.origineSD.id));
  add(orf.length === 0, 'Nessuna scrittura senza documento', orf.length ? `Scritture orfane: ${orf.map(r => '#' + r.id).join(', ')}.` : 'Ogni scrittura del modulo punta a un documento esistente.');
  const nq = regsSD.filter(r => Math.abs(dareDi(r) - avereDi(r)) > 0.005);
  add(nq.length === 0, 'Tutte le scritture del modulo quadrano (Dare = Avere)', nq.length ? `Non quadrano: ${nq.map(r => '#' + r.id).join(', ')}.` : '');
  const att = r2(sum(S().migo.filter(m => regOf('MIGO', m.id)), m => m.valPO) - sum(S().miro.filter(m => regOf('MIRO', m.id) && !m.completa), m => m.grir));
  const led = r2(sum(STATO.registrazioni.flatMap(r => r.righe).filter(x => x.conto === '24'), x => x.dareAvere === 'AVERE' ? x.importo : -x.importo));
  add(Math.abs(att - led) < 0.005, 'Conto 24 GR/IR = merci ricevute e non ancora fatturate', `Atteso da MIGO − MIRO: ${euro(att)} · saldo del conto nel Mastro: ${euro(led)}.`);
  const tmk = S().ordini.filter(o => tmVendite(o).stato === 'ko').map(o => 'ordine ' + o.id).concat(S().po.filter(p => tmAcquisti(p).stato === 'ko').map(p => 'acquisto ' + p.id));
  add(tmk.length === 0, 'Triple Match: nessuna anomalia', tmk.length ? `Da verificare: ${tmk.join(', ')}.` : 'Ordini, DDT e fatture (vendite) e ordini, MIGO e MIRO (acquisti) sono coerenti.');
  const dr = S().fatture.filter(f => !regOf('FATT', f.id));
  out.push({ok:dr.length ? null : true, t:'Fatture attive tutte rilasciate in contabilità', d:dr.length ? `In attesa di rilascio: ${dr.map(f => f.id).join(', ')}.` : ''});
  const cc41 = regsSD.filter(r => r.righe.some(x => x.conto === '41' && x.centroCostoId));
  add(cc41.length === 0, 'Costo del venduto senza centro produttivo (Taglio/Saldatura)', cc41.length ? `Scritture con centro sul conto 41: ${cc41.map(r => '#' + r.id).join(', ')}.` : 'Il centro produttivo si usa solo per assorbire i costi in produzione (51/52).');
  const doppi = S().ddt.filter(d => (regOf('DDT', d.id) ? 1 : 0) + S().fatture.filter(f => f.cdvIn > 0.004 && regOf('FATT', f.id) && ((f.cdvDdtIds || []).length ? f.cdvDdtIds.includes(d.id) : f.ordId === d.ordId)).length > 1);
  add(doppi.length === 0, 'Costo del venduto registrato una sola volta per DDT', doppi.length ? `Contato due volte: DDT ${doppi.map(d => d.id).join(', ')}.` : 'Nessun DDT ha il costo del venduto sia al DDT sia in fattura.');
  const anL = lottiPF().filter(l => l.anomalia);
  add(anL.length === 0, 'Lotti di prodotti finiti con costo storico verificabile', anL.length ? anL.map(l => l.anomalia).join(' · ') : `${lottiPF().length} lotti, tutti valorizzati al costo congelato.`);
  return out;
}

// ── 10. TRIPLE MATCH ────────────────────────────────────────────────────
function scrTM(){
  const bV = t => ({ok:bd('g', '✅ Match completo'), pronto:bd('b', 'Pronto a fatturare'), corso:bd('n', 'In corso'), ko:bd('r', '⛔ Anomalia')})[t];
  const rv = S().ordini.map(o => { const t = tmVendite(o); return [`<span class="mono">${o.id}</span>`, esc(nomeCli(o.cliId)), String(t.qOrd), `${t.qDdt} <span class="small">(${t.nDdt} DDT)</span>`, t.pFat != null ? String(t.qFat) : '—', euro(o.prezzo), t.pFat != null ? euro(t.pFat) : '—', bV(t.stato) + (t.stato === 'ko' ? `<div class="small">${esc(t.issues.join('; '))}</div>` : '')]; });
  const bA = t => ({ok:bd('g', '✅ Match completo'), warn:bd('o', '⚠ Match con scostamento prezzo'), corso:bd('n', 'In corso'), ko:bd('r', '⛔ Anomalia')})[t];
  const ra = S().po.map(p => { const t = tmAcquisti(p), pr = S().miro.filter(m => m.poId === p.id); return [`<span class="mono">${p.id}</span>`, esc(nomeForn(p.fid)), `${t.qPO} kg`, `${t.qMigo} kg`, `${t.qMiro} kg`, euro(p.prezzo) + '/kg', pr.length ? pr.map(m => euro(m.prezzo)).join(' · ') : '—', bA(t.stato) + ((t.issues.length || t.avvisi.length) ? `<div class="small">${esc(t.issues.concat(t.avvisi).join('; '))}</div>` : '')]; });
  const ctl = controlli().map(c => [c.ok === true ? bd('g', '✓ OK') : c.ok === false ? bd('r', '✗ DA VERIFICARE') : bd('o', 'in attesa'), `<b>${c.t}</b>`, esc(c.d)]);
  const st = S().struttura, gt = STATO.registrazioni;
  const saldo = c => r2(sum(gt.flatMap(r => r.righe).filter(x => x.conto === c), x => x.dareAvere === 'DARE' ? x.importo : -x.importo));
  return `${ui.msg.tm || ''}${card('🔗', 'Triple Match — vendite: Ordine ↔ DDT ↔ Fattura', 'VF01 · blocco', tb(['Ordine','Cliente','Ordinato pz>','DDT pz>','Fattura pz>','Prezzo ordine>','Prezzo fattura>','Esito'], rv))}
    ${card('🔗', 'Triple Match — acquisti: Ordine ↔ MIGO ↔ MIRO', 'MIRO · blocco', tb(['Ordine','Fornitore','Ordinato>','MIGO>','MIRO>','Prezzo ordine>','Prezzi fatturati>','Esito'], ra))}
    ${card('✅', 'Controlli contabili prima della consegna', 'Libro Giornale ↔ documenti', tb(['Esito','Controllo','Dettaglio'], ctl))}
    ${card('⚖️', 'Saldi dei conti toccati dal modulo (dal Libro Giornale)', 'Mastro', tb(['Conto','Saldo (Dare − Avere)>'], ['11','12','13','14','20','21','24','40','41','62','63'].map(c => [esc(nomeConto(c)), euro(saldo(c))])))}`;
}

// ── 11. FLUSSO DOCUMENTI E SCRITTURE ────────────────────────────────────
function scrFlusso(){
  const v = ui.sel.flusso || '', [k, id] = v.split(':');
  const opts = `<optgroup label="Ordini di vendita">${S().ordini.map(o => `<option value="O:${o.id}"${v === 'O:' + o.id ? ' selected' : ''}>${o.id} — ${esc(nomeCli(o.cliId))}</option>`).join('')}</optgroup>
    <optgroup label="Ordini di acquisto">${S().po.map(p => `<option value="P:${p.id}"${v === 'P:' + p.id ? ' selected' : ''}>${p.id} — ${esc(nomeForn(p.fid))}</option>`).join('')}</optgroup>`;
  let body = `<div class="fg"><div class="f"><select onchange="SDMM.selFlusso(this.value)"><option value="">— seleziona un ordine di vendita o di acquisto —</option>${opts}</select></div></div>`, regs = [];
  const nodo = (fase, doc, data, qta, kind, docId, rilascio) => { if(kind) { const r = regOf(kind, docId); if(r) regs.push(r); } return [fase, `<span class="mono">${doc}</span>`, fd(data), qta, kind ? badgePost(kind, docId, rilascio) : bd('n', 'nessuna scrittura')]; };
  const righe = [];
  if(k === 'O' && ord(id)){
    const o = ord(id), f = fattOrd(o);
    righe.push(nodo('Ordine di vendita', o.id, o.creatoIl, `${o.qty} pz × ${euro(o.prezzo)}`));
    (o.conferme || []).forEach(c => righe.push(nodo('Conferma d\'ordine', c.id, c.data, `${c.qta} pz`)));
    S().pick.filter(p => p.ordId === o.id).forEach(p => righe.push(nodo('Picking → area spedizione', p.id, p.data, `${p.qty} pz`)));
    S().ddt.filter(d => d.ordId === o.id).forEach(d => righe.push(nodo('DDT / uscita merci', d.id, d.data, `${d.qty} pz · CdV ${euro(d.importoCdV)}`, 'DDT', d.id)));
    if(f){ righe.push(nodo('Fattura attiva', f.id, f.data, euro(f.totale), 'FATT', f.id, true)); if(f.incasso) righe.push(nodo('Incasso', f.id, f.incasso.data, euro(f.totale), 'INC', f.id)); }
  }
  if(k === 'P' && poDoc(id)){
    const p = poDoc(id), rf = S().rfq.find(r => r.id === p.rfqId);
    if(rf) righe.push(nodo('RFQ', rf.id, rf.data, `${rf.qty} kg · ${rf.fornitori.length} fornitori`));
    righe.push(nodo('Ordine di acquisto', p.id, p.creato, `${p.qty} kg × ${euro(p.prezzo)}`));
    S().migo.filter(m => m.poId === p.id).forEach(m => righe.push(nodo('MIGO — entrata merci', m.id, m.data, `${m.qty} kg`, 'MIGO', m.id)));
    S().miro.filter(m => m.poId === p.id).forEach(m => { righe.push(nodo('MIRO — fattura fornitore', m.id, m.data, `${m.qty} kg · ${euro(m.tot)}`, 'MIRO', m.id)); if(m.pagamento) righe.push(nodo('Pagamento', m.id, m.pagamento.data, euro(m.tot), 'PAG', m.id)); });
  }
  if(righe.length){
    body += tb(['Fase','Documento','Data','Quantità / importo','Libro Giornale'], righe);
    body += regs.map(r => `<div class="grp">Scrittura n° ${r.id} — ${fd(r.data)} — ${esc(r.descrizione)}</div>` + tb(['Conto','Dare>','Avere>'], r.righe.map(x => [esc(nomeConto(x.conto)), x.dareAvere === 'DARE' ? euro(x.importo) : '', x.dareAvere === 'AVERE' ? euro(x.importo) : '']))).join('');
    body += `<p style="margin-top:12px"><button class="btn" onclick="cambiaVista('giornale')">📚 Apri il Libro Giornale</button> <button class="btn" onclick="cambiaVista('bilancio')">⚖️ Bilancio di Verifica</button></p>`;
  }else if(v) body += '<p class="small">Nessun documento collegato.</p>';
  return `${ui.msg.flusso || ''}${card('🗂️', 'Flusso documenti (document flow) e scritture generate', 'FB03 · VA03', body)}`;
}

// ── 12. ANAGRAFICHE ─────────────────────────────────────────────────────
function scrAnag(){
  const cl = S().clienti.map(c => [`<span class="mono">${c.id}</span>`, esc(c.nome), esc(c.citta), `${c.pagamentoGg} gg`, esc(c.incoterms), RISCHIO[c.rischio] || c.rischio,
    `<input type="number" id="fd-${c.id}" value="${c.fidoBase}" step="500" style="width:105px;text-align:right"> <button class="btn sm" onclick="SDMM.salvaFido('${c.id}')">Salva</button>`,
    S().ordini.some(o => o.cliId === c.id) ? '' : `<button class="btn sm red" onclick="SDMM.eliminaCliente('${c.id}')">Elimina</button>`]);
  const fo = S().fornitori.map(f => [`<span class="mono">${f.id}</span>`, esc(f.nome), esc(f.citta), `${f.pagamentoGg} gg`,
    (S().po.some(p => p.fid === f.id) || S().rfq.some(r => r.fornitori.some(x => x.fid === f.id))) ? '' : `<button class="btn sm red" onclick="SDMM.eliminaFornitore('${f.id}')">Elimina</button>`]);
  const fc = `<div class="fg"><div class="f"><label>Nome cliente</label><input id="nc-nome"></div><div class="f"><label>Città</label><input id="nc-citta"></div>
    <div class="f"><label>Pagamento (gg)</label><input type="number" id="nc-gg" value="30"></div><div class="f"><label>Incoterms</label><select id="nc-inc"><option>EXW</option><option>FCA</option><option selected>DAP</option></select></div>
    <div class="f"><label>Fido (€)</label><input type="number" id="nc-fido" value="20000"></div><div class="f"><label>Rischio</label><select id="nc-risc"><option value="A">A — Basso</option><option value="B" selected>B — Medio</option><option value="C">C — Alto</option></select></div>
    <div class="f end"><button class="btn pri" onclick="SDMM.aggiungiCliente()">➕ Aggiungi cliente</button></div></div>`;
  const ff = `<div class="fg"><div class="f"><label>Nome fornitore</label><input id="nf-nome"></div><div class="f"><label>Città</label><input id="nf-citta"></div>
    <div class="f"><label>Pagamento (gg)</label><input type="number" id="nf-gg" value="30"></div><div class="f end"><button class="btn pri" onclick="SDMM.aggiungiFornitore()">➕ Aggiungi fornitore</button></div></div>`;
  return `${ui.msg.anag || ''}${card('👥', 'Clienti', 'XD01', tb(['Codice','Cliente','Città','Pagamento','Incoterms','Rischio','Fido (reset a ogni Nuovo giro)',''], cl) + '<div class="sep"></div>' + fc)}
    ${card('🏭', 'Fornitori di ferro', 'XK01', tb(['Codice','Fornitore','Città','Pagamento',''], fo) + '<div class="sep"></div>' + ff)}`;
}

const SCR = {home:scrHome, ordini:scrOrdini, ctrl:scrCtrl, pick:scrPick, ddt:scrDDT, fatt:scrFatt, rfq:scrRFQ, po:scrPO, migo:scrMIGO, miro:scrMIRO, tm:scrTM, flusso:scrFlusso, anag:scrAnag, credit:scrCredit};

// ═══════════════════════════════════════════════════════════════════════
// AZIONI (chiamate dai pulsanti dello Shadow DOM tramite SDMM.*)
// ═══════════════════════════════════════════════════════════════════════
const val = id => { const e = $(id); return e ? e.value : ''; };
const posta = (kind, doc) => { try{ return postDoc(kind, doc); }catch(e){ return {errore:e.message}; } };
const tostaOk = m => { if(typeof mostraToast === 'function') mostraToast(m); };
// conserva i campi del modulo «Nuovo ordine» quando si crea un cliente o una commessa al volo (o dopo un errore)
const keepOrd = () => { if($('o-cli')) ui.formOrd = {cli:val('o-cli'), po:val('o-po'), data:val('o-data'), com:val('o-com'), qty:val('o-qty'), prezzo:val('o-prezzo'), cr:val('o-cr')}; };
const A = {
  init, render, migra, resetDocumenti, vai, tcode, controlli, esposizione, statoOrd, bloccato, costoUscitaFIFO, lottiPF,
  // commessa creata dallo studente (dal modulo ordini o dalla produzione): si riseleziona da sola nell'ordine
  dopoCommessa(id){ ui.preselCom = String(id); if(ui.s === 'ordini') agg(); },
  ricalcolaATP, pfFisico, inSpedizione, mpFisico, giacenza, documentiMateriale, pfFisicoVecchio, mpFisicoVecchio, fabbisogniVendita, poAperti, nuovoPO, css: CSS,
  creaCommessaOrdine(){ keepOrd(); if(!creaCommessaRapida('qm')){ ui.formOrd = null; } },
  setCdv(m){
    if(S().ddt.length || S().fatture.length) return ko(ui.s, '⛔ Impostazione bloccata', 'Ci sono già DDT o fatture in questo giro: il criterio si cambia solo a inizio giro (Nuovo giro).');
    S().opz.cdv = (m === 'DDT') ? 'DDT' : 'FATTURA'; agg();
  },
  setAcq(m){
    if(S().migo.length || S().miro.length) return ko(ui.s, '⛔ Impostazione bloccata', 'Ci sono già MIGO o MIRO in questo giro: il criterio si cambia solo a inizio giro (Nuovo giro).');
    S().opz.acq = (m === 'MIGO') ? 'MIGO' : 'MIRO'; agg();
  },
  selOrd(k, id){ ui.sel[k] = id; ui.msg[k] = ''; ui.centri = {}; render(); },
  selPO(k, id){ ui.sel[k] = id; ui.msg[k] = ''; ui.centri = {}; render(); },
  // scelta del centro di costo / di ricavo su una riga dell'anteprima (come in Nuova Registrazione): resta memorizzata fino alla registrazione
  setCentro(kind, key, campo, v){ const o = ui.centri[kind] || (ui.centri[kind] = {}), e = o[key] || (o[key] = {}); e[campo] = v; },
  selRFQ(id){ ui.sel.rfq = id; render(); },
  selFlusso(v){ ui.sel.flusso = v; render(); },
  selCli(id){ $('o-info').innerHTML = infoCli(id); },
  aggiornaTotali(){
    const q = Number(val('o-qty')) || 0, p = Number(val('o-prezzo')) || 0, imp = r2(q * p), iv = r2(imp * aliq()), ps = prezzoStd();
    $('o-tot').innerHTML = q > 0 && p > 0 ? `<div class="info">Imponibile <b>${euro(imp)}</b> · IVA ${(aliq() * 100).toFixed(0)}% <b>${euro(iv)}</b> · Totale <b>${euro(imp + iv)}</b>${ps > 0 ? ` · prezzo standard ${euro(ps)} → variance prezzo prevista <b style="color:${p >= ps ? '#107E3E' : '#BB0000'}">${euro(r2((p - ps) * q))}</b> ${p >= ps ? '(favorevole)' : '(sfavorevole)'}` : ''}</div>` : '';
  },

  // ── vendite ──
  salvaOrdine(){
    keepOrd();
    const cliId = val('o-cli'), dataC = val('o-data'), qty = Number(val('o-qty')), prezzo = Number(val('o-prezzo'));
    if(!cliente(cliId)) return ko('ordini', '⚠️ Cliente mancante', 'Seleziona il cliente (Sold-to party).');
    if(cliente(cliId).bloccoCredito) return ko('ordini', '⛔ Cliente bloccato dal Credit Manager', `${esc(cliente(cliId).nome)} non può ricevere nuovi ordini${cliente(cliId).bloccoMotivo ? ': ' + esc(cliente(cliId).bloccoMotivo) : ''}. Lo sblocca il Credit Manager dalla sua scrivania (VKM4).`);
    if(!dataC) return ko('ordini', '⚠️ Data mancante', 'Inserisci la data di consegna richiesta.');
    if(!Number.isInteger(qty) || qty <= 0) return ko('ordini', '⚠️ Quantità non valida', 'Le transenne si ordinano a pezzi interi, maggiori di zero.');
    if(!(prezzo > 0)) return ko('ordini', '⚠️ Prezzo non valido', 'Il prezzo di vendita per pezzo deve essere maggiore di zero.');
    const c = cliente(cliId);
    const o = {id:num('so'), cliId, poCliente:val('o-po').trim() || 'N/A', dataConsegna:dataC, qty, prezzo:r2(prezzo), commessaId:val('o-com'), centroRicavoId:val('o-cr'), creatoIl:oggi(),
      pagamentoGg:c.pagamentoGg, incoterms:c.incoterms, blocco:false, conferma:null, conferme:[], chiusoAQta:null, creditApproval:null};
    S().ordini.push(o); ui.sel.ctrl = o.id; ui.formOrd = null; ui.preselCli = null; ui.preselCom = null;
    okm('ordini', `✅ Ordine salvato — N° ${o.id}`, `${esc(c.nome)} · ${qty} pz × ${euro(o.prezzo)} = ${euro(totOrd(o))} IVA inclusa. Prossimo passo: <b>ATP, credito e conferma d'ordine</b>.`); agg();
  },
  eliminaOrdine(id){
    const o = ord(id); if(!o || o.conferma || S().pick.some(p => p.ordId === id) || fattOrd(o)) return;
    if(!confirm(`Eliminare l'ordine ${id}?`)) return;
    S().ordini = S().ordini.filter(x => x.id !== id); okm('ordini', '🗑️ Ordine eliminato', id); agg();
  },
  esegui(){
    const o = ord(ui.sel.ctrl); if(!o) return ko('ctrl', '⚠️ Seleziona un ordine', 'Scegli l\'ordine su cui eseguire i controlli.');
    ui.chk[o.id] = true; const c = cliente(o.cliId);
    o.blocco = !(esposizione(o.cliId) <= c.fido || creditoOverride(o));
    o.atpInAttesa = Math.min(qEff(o), qConsegn(o) + Math.max(0, atp(o))) < qEff(o);   // in attesa di produzione: la prossima dichiarazione lo riconferma da sola
    agg();
  },
  // ── Credit Manager: chi vende invia la richiesta; la decisione si prende dalla scrivania (schermata «credit»)
  selCase(id){ ui.sel.credit = id; ui.msg.credit = ''; render(); },
  apriCredit(id){ ui.sel.credit = id; ui.msg.credit = ''; vai('credit'); },
  richiestaCredito(){
    const o = ord(ui.sel.ctrl); if(!o || !bloccato(o) || o.rifiutato) return;
    const nota = (val('cr-note') || val('cm-note')).trim(), richiedente = val('cr-nome').trim(), c = cliente(o.cliId);
    o.creditApproval = {status:'PENDING', richiedente, notes:nota, richiestaIl:oggi(), fidoPrecedente:c.fido};
    S().creditLog.push({data:oggi(), ordId:o.id, cliId:o.cliId, decisione:'RICHIESTA', fidoPrima:c.fido, fidoDopo:c.fido, esposizione:esposizione(o.cliId), manager:richiedente, nota});
    okm('ctrl', '📨 Richiesta inviata al Credit Manager', 'La pratica è nella sua scrivania (VKM4): decide se aumentare il fido, autorizzare lo sforamento, non autorizzare o bloccare in modo definitivo.'); agg();
  },
  decisioneCredito(dec){
    const k = 'credit', o = ord(ui.sel.credit || ui.sel.ctrl); if(!o) return;
    const c = cliente(o.cliId), esp = esposizione(o.cliId);
    if(o.rifiutato) return ko(k, '⛔ Ordine già respinto', 'Il blocco definitivo non si annulla: se serve, va inserito un nuovo ordine.');
    if(!bloccato(o)) return ko(k, 'Nessun blocco', `L'ordine ${o.id} non è in blocco credito.`);
    const manager = val('cm-nome').trim(), nota = val('cm-note').trim();
    if(!manager) return ko(k, '⚠️ Credit Manager mancante', 'Indica chi decide: il nome resta nel registro delle decisioni.');
    if(nota.length < 5) return ko(k, '⚠️ Motivazione mancante', 'Ogni decisione sul credito va motivata (anche in poche parole): resta nel registro delle decisioni.');
    ui.cmNome = manager;
    const a = o.creditApproval || {richiestaIl:oggi(), fidoPrecedente:c.fido};
    const fidoPrima = c.fido; let dettaglio, dLog;
    if(dec === 'INCREASE'){
      const nf = Number(val('cm-fido'));
      if(!Number.isFinite(nf) || nf < esp) return ko(k, '⚠️ Nuovo fido non valido', `Il nuovo fido deve coprire almeno l'esposizione attuale (${euro(esp)}).`);
      const perm = (val('cm-durata') || 'PERMANENTE') === 'PERMANENTE';
      c.fido = nf; if(perm) c.fidoBase = nf;
      a.status = 'APPROVED_LIMIT_INCREASE'; a.nuovoFido = nf; o.blocco = false; dLog = 'AUMENTO_FIDO';
      dettaglio = `${esc(c.nome)}: fido da ${euro(fidoPrima)} a ${euro(nf)} (${perm ? 'permanente' : 'solo per questo giro'}). L'ordine ${o.id} è sbloccato.`;
    }else if(dec === 'EXCEPTION'){
      a.status = 'APPROVED_EXCEPTION'; o.blocco = false; dLog = 'ECCEZIONE';
      dettaglio = `Esposizione ${euro(esp)} autorizzata solo per l'ordine ${o.id}; il fido di ${esc(c.nome)} resta ${euro(c.fido)}.`;
    }else if(dec === 'BLOCK'){
      if(qConsegn(o) > 0 || S().pick.some(p => p.ordId === o.id) || fattOrd(o)) return ko(k, '⚠️ Ordine già in lavorazione', 'Ci sono picking, consegne o fatture su questo ordine: non si può annullare. Blocca il cliente dalla tabella del castelletto.');
      a.status = 'BLOCKED_DEFINITIVE'; o.rifiutato = true; o.blocco = true; dLog = 'BLOCCO_DEFINITIVO';
      const bloccaCli = $('cm-blocca-cliente') && $('cm-blocca-cliente').checked;
      if(bloccaCli){ c.bloccoCredito = true; c.bloccoMotivo = nota; }
      dettaglio = `Ordine ${o.id} respinto in modo definitivo: non pesa più sul castelletto.${bloccaCli ? ` ${esc(c.nome)} è bloccato: nessun nuovo ordine.` : ''}`;
    }else{
      a.status = 'REJECTED'; o.blocco = true; dLog = 'NON_AUTORIZZATO';
      dettaglio = `L'ordine ${o.id} resta bloccato: nessun picking né DDT finché non arriva un'autorizzazione (per esempio dopo nuovi incassi).`;
    }
    a.manager = manager; a.notes = nota; a.decisoIl = oggi(); o.creditApproval = a;
    S().creditLog.push({data:oggi(), ordId:o.id, cliId:o.cliId, decisione:dLog, fidoPrima, fidoDopo:c.fido, esposizione:esp, manager, nota});
    if(dec === 'BLOCK' || dec === 'INCREASE' || dec === 'EXCEPTION'){ const altro = S().ordini.find(x => x.id !== o.id && bloccato(x) && !x.rifiutato); ui.sel.credit = altro ? altro.id : ''; }
    okm(k, dec === 'REJECT' ? '🚫 Non autorizzato' : dec === 'BLOCK' ? '⛔ Blocco definitivo registrato' : dec === 'INCREASE' ? '📈 Fido aumentato e ordine sbloccato' : '✅ Sforamento autorizzato', dettaglio); agg();
  },
  bloccaCliente(id){
    const c = cliente(id); if(!c) return; const nota = val('bm-' + id).trim(), manager = ui.cmNome || 'Credit Manager';
    if(nota.length < 5) return ko('credit', '⚠️ Motivazione mancante', 'Il blocco del cliente va motivato: scrivila accanto al pulsante.');
    c.bloccoCredito = true; c.bloccoMotivo = nota;
    S().creditLog.push({data:oggi(), ordId:'', cliId:id, decisione:'BLOCCO_CLIENTE', fidoPrima:c.fido, fidoDopo:c.fido, esposizione:esposizione(id), manager, nota});
    okm('credit', '⛔ Cliente bloccato', `${esc(c.nome)}: nessun nuovo ordine finché non viene sbloccato.`); agg();
  },
  sbloccaCliente(id){
    const c = cliente(id); if(!c) return; const nota = val('bm-' + id).trim(), manager = ui.cmNome || 'Credit Manager';
    if(nota.length < 5) return ko('credit', '⚠️ Motivazione mancante', 'Lo sblocco del cliente va motivato: scrivila accanto al pulsante.');
    c.bloccoCredito = false; c.bloccoMotivo = '';
    S().creditLog.push({data:oggi(), ordId:'', cliId:id, decisione:'SBLOCCO_CLIENTE', fidoPrima:c.fido, fidoDopo:c.fido, esposizione:esposizione(id), manager, nota});
    okm('credit', '✅ Cliente sbloccato', `${esc(c.nome)} può di nuovo ricevere ordini.`); agg();
  },
  confermaOrdine(){
    const o = ord(ui.sel.ctrl); if(!o) return;
    if(bloccato(o)) return ko('ctrl', '⛔ Ordine in blocco credito', 'Serve prima l\'autorizzazione del Credit Manager.');
    if(!ui.chk[o.id] && !o.conferma) return ko('ctrl', '⚠️ Controlli non eseguiti', 'Esegui prima i controlli ATP e credito.');
    const qd = qConsegn(o), cap = Math.min(qEff(o), qd + Math.max(0, atp(o))), q = Number(val('c-qta')), dc = val('c-data');
    if(!Number.isInteger(q) || q <= 0) return ko('ctrl', '⚠️ Quantità non valida', 'Inserisci un numero intero di pezzi maggiore di zero.');
    if(q < qd) return ko('ctrl', '⚠️ Quantità troppo bassa', `Ne hai già consegnati ${qd}: non puoi confermarne meno.`);
    if(q > cap) return ko('ctrl', '⛔ ATP insufficiente', `Puoi confermare al massimo ${cap} pz (disponibilità netta dei riservati ad altri ordini).`);
    if(!dc) return ko('ctrl', '⚠️ Data mancante', 'Inserisci la data di consegna confermata.');
    const cf = {id:num('cf'), data:oggi(), qta:q, dataConsegna:dc}; o.conferme.push(cf); o.conferma = cf; o.atpInAttesa = q < qEff(o);
    okm('ctrl', `✅ Ordine confermato — ${cf.id}`, `${q} pz su ${qEff(o)} richiesti, consegna ${fd(dc)}. Prossimo passo: <b>Picking</b>.`); ui.sel.pick = o.id; agg();
  },
  chiudiResiduo(id){
    const o = ord(id); if(!o) return;
    if(qStaged(o) > 0) return ko('ctrl', '⚠️ Pezzi ancora in area spedizione', 'Registra prima il DDT dei pezzi già prelevati.');
    if(!confirm(`Chiudere l'ordine ${id} a ${qConsegn(o)} pz consegnati? Il residuo non sarà più consegnato né fatturato.`)) return;
    o.chiusoAQta = qConsegn(o); okm('ctrl', '✅ Residuo chiuso', `L'ordine ${id} vale ora ${o.chiusoAQta} pz.`); agg();
  },
  faiPicking(){
    const o = ord(ui.sel.pick), q = Number(val('pk-qty'));
    if(!o || !o.conferma) return ko('pick', '⚠️ Ordine non confermato', 'Il picking parte solo da un ordine confermato.');
    if(bloccato(o)) return ko('pick', '⛔ Ordine in blocco credito', 'Nessun picking finché il Credit Manager non sblocca l\'ordine.');
    const res = qResConf(o) - qStaged(o);
    if(!Number.isInteger(q) || q <= 0) return ko('pick', '⚠️ Quantità non valida', 'Inserisci un numero intero di pezzi maggiore di zero.');
    if(q > res) return ko('pick', '⛔ Troppi pezzi', `Da prelevare restano ${res} pz (confermati − consegnati − già in area spedizione).`);
    if(q > inMagazzino()) return ko('pick', '⛔ Giacenza di magazzino insufficiente', `In ubicazione di magazzino ci sono ${inMagazzino()} pz.`);
    const id = num('pk'), p = {id, ordId:o.id, data:val('pk-data') || oggi(), qty:q, sloc:S().struttura.magazzino, scaffale:'A-' + (parseInt(id, 10) % 20 + 1)};
    S().pick.push(p); ui.sel.ddt = o.id;
    okm('pick', `✅ Picking ${id} eseguito`, `${q} pz spostati da SLoc ${esc(p.sloc)} all'area di spedizione. Nessuna scrittura contabile. Prossimo passo: <b>DDT e uscita merci</b>.`); agg();
  },
  prevDDT(){ const q = Math.max(0, Number(val('dd-qty')) || 0); $('dd-prev').innerHTML = boxDDT(q); },
  faiDDT(){
    const o = ord(ui.sel.ddt), q = Number(val('dd-qty')), data = val('dd-data');
    if(!o) return ko('ddt', '⚠️ Seleziona un ordine', '');
    if(bloccato(o)) return ko('ddt', '⛔ Ordine in blocco credito', 'La merce non può uscire.');
    if(!Number.isInteger(q) || q <= 0) return ko('ddt', '⚠️ Quantità non valida', 'Inserisci un numero intero di pezzi maggiore di zero.');
    if(q > qStaged(o)) return ko('ddt', '⛔ Pezzi non in area di spedizione', `In area di spedizione per questo ordine ci sono ${qStaged(o)} pz: fai prima il picking.`);
    if(!data) return ko('ddt', '⚠️ Data mancante', 'Inserisci la data del DDT.');
    if(!(costoStandardTransenna() > 0)) return ko('ddt', '⛔ Costo standard pari a zero', 'Configura Distinta Base e centri di costo in Impostazioni: senza costo standard il costo del venduto sarebbe zero.');
    const cst = costoUscitaFIFO(q);
    if(cst.mancano > 0.005) return ko('ddt', '⛔ Giacenza valorizzata insufficiente', `Nei lotti valorizzati del magazzino prodotti finiti mancano ${cst.mancano} pz: nessuna uscita oltre la giacenza.`);
    if(cst.anomalie.length) return ko('ddt', '⛔ Costo storico non verificabile', esc(cst.anomalie.join(' · ')) + '. Correggi il dato storico: il simulatore non lo sostituisce con lo standard corrente.');
    const d = {id:num('dl'), ordId:o.id, cliId:o.cliId, data, qty:q, costoUnit:cst.costoMedio, importoCdV:cst.costoTotale, vettore:val('dd-vet').trim(),
      lotti:cst.prelievi.map(p => ({lottoId:p.lottoId, data:p.data, qty:p.qty, costoUnit:p.costoUnit}))};   // lotti FIFO congelati nel DDT
    const r = cdvAlDDT() ? posta('DDT', d) : null; if(r && r.errore) return ko('ddt', '⛔ Registrazione annullata', esc(r.errore));
    S().ddt.push(d);
    okm('ddt', `✅ DDT ${d.id} — uscita merci registrata`, r ? `${q} pz · costo del venduto ${euro(d.importoCdV)} (${euro(d.costoUnit)}/pz) → scrittura n° ${r.id} in Libro Giornale (Dare 41 / Avere 13).` : `${q} pz · movimento fisico, nessuna scrittura. Il costo del venduto (${euro(d.importoCdV)}) si contabilizza con la fattura.`);
    if(qConsegn(o) >= qEff(o)) ui.sel.fatt = o.id; agg(); if(r) tostaOk('✅ DDT contabilizzato nel Libro Giornale');
  },
  generaFattura(){
    const o = ord(ui.sel.fatt), data = val('fa-data'); if(!o) return;
    const tm = tmVendite(o);
    if(fattOrd(o)) return ko('fatt', '⚠️ Ordine già fatturato', `Fattura ${fattOrd(o).id}.`);
    if(tm.stato !== 'pronto') return ko('fatt', '⛔ Triple Match non superato', esc(tm.issues.join('; ')));
    if(!data) return ko('fatt', '⚠️ Data mancante', 'Inserisci la data fattura.');
    const q = tm.qDdt, imp = r2(q * o.prezzo), iv = r2(imp * aliq()), ps = prezzoStd(), ricavi = ps > 0 ? r2(q * ps) : imp;
    const f = {id:num('bl'), ordId:o.id, cliId:o.cliId, data, qty:q, prezzo:o.prezzo, prezzoStd:ps, imponibile:imp, iva:iv, totale:r2(imp + iv), aliquota:aliq(), ricavi, varianza:r2(imp - ricavi),
      cdvIn:cdvAlDDT() ? 0 : r2(sum(S().ddt.filter(d => d.ordId === o.id && !regOf('DDT', d.id)), d => d.importoCdV)),
      cdvDdtIds:cdvAlDDT() ? [] : S().ddt.filter(d => d.ordId === o.id && !regOf('DDT', d.id)).map(d => d.id),
      centroRicavoId:o.centroRicavoId, commessaId:o.commessaId, scadenza:plusGg(data, o.pagamentoGg), incasso:null};
    S().fatture.push(f); okm('fatt', `✅ Fattura ${f.id} generata`, 'Triple Match superato. Ora rilasciala in contabilità per creare la scrittura.'); agg();
  },
  rilascia(id){
    const f = S().fatture.find(x => x.id === id); if(!f) return;
    const r = posta('FATT', f); if(r.errore) return ko('fatt', '⛔ Rilascio annullato', esc(r.errore));
    okm('fatt', `✅ Fattura ${f.id} rilasciata in contabilità`, `Scrittura n° ${r.id}: Dare 11 ${euro(f.totale)} · Avere 40 ${euro(f.ricavi)}${f.cdvIn > 0.004 ? ` · Dare 41 / Avere 13 ${euro(f.cdvIn)}` : ''}${Math.abs(f.varianza) > 0.004 ? ` · ${f.varianza < 0 ? 'Dare' : 'Avere'} 63 ${euro(Math.abs(f.varianza))}` : ''} · Avere 21 ${euro(f.iva)}.`); agg(); tostaOk('✅ Fattura contabilizzata');
  },
  incassa(id){
    const f = S().fatture.find(x => x.id === id); if(!f || !regOf('FATT', id)) return;
    if(f.incasso) return; const dtI = ui.confData; ui.confData = null; f.incasso = {data:dtI || val('in-data') || oggi()};
    const r = posta('INC', f); if(r.errore){ f.incasso = null; return ko('fatt', '⛔ Incasso annullato', esc(r.errore)); }
    okm('fatt', '✅ Incasso registrato', `Scrittura n° ${r.id}: Dare 10 / Avere 11 ${euro(f.totale)}. Il credito del cliente si riduce.`); agg();
  },

  // ── acquisti ──
  creaRFQ(){
    const q = r2(Number(val('rf-qty'))), dc = val('rf-data'), fs = S().fornitori.filter(f => $('rf-f-' + f.id) && $('rf-f-' + f.id).checked);
    if(!(q > 0)) return ko('rfq', '⚠️ Quantità non valida', 'Indica i kg di ferro da richiedere.');
    if(!dc) return ko('rfq', '⚠️ Data mancante', 'Indica la data di consegna richiesta.');
    if(fs.length < 2) return ko('rfq', '⚠️ Servono almeno due fornitori', 'Una RFQ serve a confrontare le offerte: selezionane almeno due.');
    const r = {id:num('rfq'), data:oggi(), qty:q, dataConsegna:dc, fornitori:fs.map(f => ({fid:f.id, prezzo:null, gg:null, pagGg:f.pagamentoGg})), stato:'APERTA', poId:null, vincitore:null};
    S().rfq.push(r); ui.sel.rfq = r.id; okm('rfq', `✅ RFQ ${r.id} inviata a ${fs.length} fornitori`, 'Inserisci le offerte ricevute qui sotto e poi confrontale.'); agg();
  },
  salvaOfferte(){
    const r = S().rfq.find(x => x.id === ui.sel.rfq); if(!r || r.stato !== 'APERTA') return;
    if(r.fabbisognoRequestId)return ko('rfq','Richiesta collegata a commessa','Usa Fabbisogno PP / MM per anteprima, offerte e ordine: ricalcolo carenza e conferma umana obbligatori.');
    r.fornitori.forEach(x => { const p = Number(val('of-p-' + x.fid)); x.prezzo = p > 0 ? p : null; x.gg = Number(val('of-g-' + x.fid)) || null; x.pagGg = Number(val('of-pg-' + x.fid)) || 0; });
    okm('rfq', '💾 Offerte salvate', 'Confronto aggiornato: assegna l\'ordine al fornitore scelto.'); agg();
  },
  assegna(fid){
    const r = S().rfq.find(x => x.id === ui.sel.rfq); if(!r || r.stato !== 'APERTA') return;
    if(r.fabbisognoRequestId)return ko('rfq','Richiesta collegata a commessa','Usa Fabbisogno PP / MM per anteprima, offerte e ordine: ricalcolo carenza e conferma umana obbligatori.');
    const x = r.fornitori.find(y => y.fid === fid); if(!x || !(x.prezzo > 0)) return ko('rfq', '⚠️ Offerta mancante', 'Inserisci e salva il prezzo offerto prima di assegnare.');
    const p = {id:num('po'), fid, qty:r.qty, prezzo:x.prezzo, dataConsegna:r.dataConsegna, rfqId:r.id, pagGg:x.pagGg != null ? x.pagGg : (fornitore(fid) || {}).pagamentoGg, creato:oggi()};
    S().po.push(p); r.stato = 'ASSEGNATA'; r.poId = p.id; r.vincitore = fid; ui.sel.migo = p.id;
    okm('rfq', `✅ Ordine di acquisto ${p.id} creato`, `${esc(nomeForn(fid))} · ${p.qty} kg a ${euro(p.prezzo)}/kg. Prossimo passo: <b>MIGO</b> alla ricezione della merce.`); agg();
  },
  creaPO(){
    const fid = val('po-f'), q = r2(Number(val('po-qty'))), pr = Number(val('po-prezzo')), dc = val('po-data');
    if(!fornitore(fid)) return ko('po', '⚠️ Fornitore mancante', 'Seleziona il fornitore.');
    if(!(q > 0) || !(pr > 0)) return ko('po', '⚠️ Dati non validi', 'Quantità e prezzo devono essere maggiori di zero.');
    const p = {id:num('po'), fid, qty:q, prezzo:pr, dataConsegna:dc, rfqId:'', pagGg:fornitore(fid).pagamentoGg, creato:oggi()};
    S().po.push(p); ui.sel.migo = p.id; okm('po', `✅ Ordine di acquisto ${p.id} creato`, `${esc(nomeForn(fid))} · ${q} kg a ${euro(pr)}/kg.`); agg();
  },
  eliminaPO(id){
    const p = poDoc(id); if(!p || S().migo.some(m => m.poId === id)) return;
    if(!confirm(`Eliminare l'ordine di acquisto ${id}?`)) return;
    S().po = S().po.filter(x => x.id !== id);
    const r = S().rfq.find(x => x.poId === id); if(r){ r.stato = 'APERTA'; r.poId = null; r.vincitore = null; }
    okm('po', '🗑️ Ordine eliminato', id + (r ? ` — la RFQ ${r.id} è tornata aperta.` : '')); agg();
  },
  prevMIGO(){ const p = poDoc(ui.sel.migo); if(p) $('mg-prev').innerHTML = boxMIGO(p, Math.max(0, r2(Number(val('mg-qty')) || 0))); },
  faiMIGO(){
    const p = poDoc(ui.sel.migo), q = r2(Number(val('mg-qty'))), data = val('mg-data'), ddtF = val('mg-ddt').trim();
    if(!p) return ko('migo', '⚠️ Seleziona un ordine di acquisto', '');
    if(!(q > 0)) return ko('migo', '⚠️ Quantità non valida', 'Indica i kg ricevuti.');
    if(q > r2(p.qty - qRicevuta(p)) + 1e-9) return ko('migo', '⛔ Ricevuto più dell\'ordinato', `Residuo da ricevere: ${r2(p.qty - qRicevuta(p))} kg.`);
    if(!ddtF) return ko('migo', '⚠️ DDT del fornitore mancante', 'La MIGO richiede il riferimento del documento di trasporto del fornitore.');
    if(!data) return ko('migo', '⚠️ Data mancante', 'Inserisci la data di entrata merci.');
    if(!(ferroStd() > 0)) return ko('migo', '⛔ Prezzo standard del ferro pari a zero', 'Imposta il costo del ferro in Impostazioni → Distinta Base.');
    const prima = qRicevuta(p), dopo = r2(prima + q);
    const m = {id:num('mg'), poId:p.id, fid:p.fid, data, qty:q, ddtForn:ddtF, prezzoStd:ferroStd(), valStd:r2(q * ferroStd()), valPO:r2(cumPO(p, dopo) - cumPO(p, prima))};
    const r = acqAlMIRO() ? null : posta('MIGO', m); if(r && r.errore) return ko('migo', '⛔ Registrazione annullata', esc(r.errore));
    S().migo.push(m); ui.sel.miro = p.id;
    okm('migo', `✅ MIGO ${m.id} — entrata merci registrata`, r ? `${q} kg · magazzino a standard ${euro(m.valStd)} · GR/IR ${euro(m.valPO)} → scrittura n° ${r.id} (Dare 12 / Avere 24${Math.abs(m.valPO - m.valStd) > 0.004 ? ' / ±62' : ''}).` : `${q} kg · movimento fisico, nessuna scrittura. Il magazzino a standard (${euro(m.valStd)}) si contabilizza con la fattura fornitore (MIRO).`); agg(); if(r) tostaOk('✅ MIGO contabilizzata nel Libro Giornale');
  },
  prevMIRO(){ const p = poDoc(ui.sel.miro); if(p) $('mr-prev').innerHTML = boxMIRO(p, Math.max(0, r2(Number(val('mr-qty')) || 0)), Number(val('mr-prezzo')) || 0); },
  faiMIRO(){
    const p = poDoc(ui.sel.miro), q = r2(Number(val('mr-qty'))), pr = Number(val('mr-prezzo')), data = val('mr-data'), n = val('mr-num').trim();
    if(!p) return ko('miro', '⚠️ Seleziona un ordine di acquisto', '');
    if(!n) return ko('miro', '⚠️ N° fattura mancante', 'Inserisci il numero della fattura del fornitore.');
    if(S().miro.some(m => m.fid === p.fid && m.nFattura.toLowerCase() === n.toLowerCase())) return ko('miro', '⛔ Fattura già registrata', `La fattura ${esc(n)} di ${esc(nomeForn(p.fid))} esiste già: doppia registrazione bloccata.`);
    if(!(q > 0) || !(pr > 0)) return ko('miro', '⚠️ Dati non validi', 'Quantità e prezzo devono essere maggiori di zero.');
    if(!data) return ko('miro', '⚠️ Data mancante', 'Inserisci la data fattura.');
    const fatturabile = r2(qRicevuta(p) - qFatturata(p));
    if(q > fatturabile + 1e-9) return ko('miro', '⛔ Triple Match non superato', `Stai fatturando ${q} kg ma la merce ricevuta e non ancora fatturata è ${fatturabile} kg: manca una MIGO a copertura.`);
    const scost = Math.abs(pr - p.prezzo) > 0.0049;
    if(scost && !$('mr-acc').checked) return ko('miro', '⛔ Scostamento di prezzo — fattura bloccata', `Prezzo in fattura ${euro(pr)}/kg ≠ prezzo d'ordine ${euro(p.prezzo)}/kg. Contesta la fattura al fornitore oppure spunta "Accetto lo scostamento di prezzo".`);
    const prima = qFatturata(p), dopo = r2(prima + q), grir = r2(cumPO(p, dopo) - cumPO(p, prima)), imp = r2(q * pr), iv = r2(imp * aliq());
    const m = {id:num('mr'), poId:p.id, fid:p.fid, nFattura:n, data, qty:q, prezzo:pr, imp, iva:iv, tot:r2(imp + iv), grir, diff:r2(imp - grir), accettaDiff:scost, valStd:r2(q * ferroStd()), completa:acqAlMIRO(), scadenza:plusGg(data, p.pagGg), pagamento:null};
    const r = posta('MIRO', m); if(r.errore) return ko('miro', '⛔ Registrazione annullata', esc(r.errore));
    S().miro.push(m);
    okm('miro', `✅ MIRO ${m.id} — fattura ${esc(n)} registrata`, m.completa ? `Magazzino a standard ${euro(m.valStd)} · IVA a credito ${euro(iv)} · debito verso fornitore ${euro(m.tot)}${Math.abs(m.valStd - m.imp) > 0.004 ? ` · variance prezzo ${euro(Math.abs(m.valStd - m.imp))} al conto 62` : ''} → scrittura n° ${r.id}.` : `GR/IR chiuso ${euro(grir)} · IVA a credito ${euro(iv)} · debito verso fornitore ${euro(m.tot)}${Math.abs(m.diff) > 0.004 ? ` · variance prezzo ${euro(Math.abs(m.diff))} al conto 62` : ''} → scrittura n° ${r.id}.`); agg(); tostaOk('✅ MIRO contabilizzata nel Libro Giornale');
  },
  paga(id){
    const m = S().miro.find(x => x.id === id); if(!m || m.pagamento || !regOf('MIRO', id)) return;
    const dtP = ui.confData; ui.confData = null; m.pagamento = {data:dtP || val('pg-' + id) || oggi()};
    const r = posta('PAG', m); if(r.errore){ m.pagamento = null; return ko('miro', '⛔ Pagamento annullato', esc(r.errore)); }
    okm('miro', '✅ Pagamento registrato', `Scrittura n° ${r.id}: Dare 20 / Avere 10 ${euro(m.tot)}.`); agg();
  },

  // conferma esplicita prima di ogni scrittura: anteprima delle righe, poi «Conferma e registra»
  chiedi(kind, id){if(window.Treasury&&['INC','PAG'].includes(kind)){const dt=kind==='INC'?val('in-data'):val('pg-'+id);return Treasury.openSD(kind,id,dt||oggi());}
    const D = REG[kind], doc = D && D.get(id); if(!doc || regOf(kind, id)) return;
    let data = null; if(kind === 'INC') data = val('in-data') || oggi(); if(kind === 'PAG') data = val('pg-' + id) || oggi();
    ui.conferma = {kind, id, data, scroll:true}; render();
  },
  annullaConferma(){ ui.conferma = null; render(); },
  confermaRegistrazione(){
    const c = ui.conferma; if(!c) return; ui.conferma = null;
    if(c.kind === 'INC'){ ui.confData = c.data; return this.incassa(c.id); }
    if(c.kind === 'PAG'){ ui.confData = c.data; return this.paga(c.id); }
    return this.ricontabilizza(c.kind, c.id);
  },
  // ── ripristino di un documento la cui scrittura è stata eliminata dal Libro Giornale ──
  ricontabilizza(kind, id){
    const D = REG[kind], doc = D && D.get(id); if(!doc) return;
    const r = posta(kind, doc); if(r.errore) return ko(ui.s, '⛔ Contabilizzazione annullata', esc(r.errore));
    okm(ui.s, '✅ Documento contabilizzato', `${id} → scrittura n° ${r.id}.`); agg();
  },

  // ── anagrafiche ──
  aggiungiCliente(pfx){
    pfx = pfx || 'nc'; if(pfx !== 'nc') keepOrd();
    const nome = val(pfx + '-nome').trim(); if(!nome) return ko(pfx === 'nc' ? 'anag' : 'ordini', '⚠️ Nome mancante', 'Indica il nome del cliente.');
    const id = 'C-' + String(S().clienti.reduce((m, c) => Math.max(m, parseInt(c.id.slice(2), 10) || 0), 0) + 1).padStart(3, '0'), fido = Math.max(0, Number(val(pfx + '-fido')) || 0);
    S().clienti.push({id, nome, citta:val(pfx + '-citta').trim(), piva:'IT' + String(Math.floor(Math.random() * 1e11)).padStart(11, '0'), pagamentoGg:Number(val(pfx + '-gg')) || 30, incoterms:val(pfx + '-inc'), fido, fidoBase:fido, rischio:val(pfx + '-risc')});
    okm(pfx === 'nc' ? 'anag' : 'ordini', '✅ Cliente aggiunto', id + ' — ' + esc(nome)); if(pfx !== 'nc'){ ui.preselCli = id; } agg();
  },
  aggiungiFornitore(){
    const nome = val('nf-nome').trim(); if(!nome) return ko('anag', '⚠️ Nome mancante', 'Indica il nome del fornitore.');
    const id = 'F-' + String(S().fornitori.reduce((m, c) => Math.max(m, parseInt(c.id.slice(2), 10) || 0), 0) + 1).padStart(3, '0');
    S().fornitori.push({id, nome, citta:val('nf-citta').trim(), piva:'IT' + String(Math.floor(Math.random() * 1e11)).padStart(11, '0'), pagamentoGg:Number(val('nf-gg')) || 30});
    okm('anag', '✅ Fornitore aggiunto', id + ' — ' + esc(nome)); agg();
  },
  salvaFido(id){ const c = cliente(id), f = Number(val('fd-' + id)); if(!c || !(f >= 0)) return; c.fido = f; c.fidoBase = f; okm('anag', '💾 Fido aggiornato', `${esc(c.nome)}: ${euro(f)}`); agg(); },
  eliminaCliente(id){ if(S().ordini.some(o => o.cliId === id)) return; S().clienti = S().clienti.filter(c => c.id !== id); agg(); },
  eliminaFornitore(id){ if(S().po.some(p => p.fid === id) || S().rfq.some(r => r.fornitori.some(x => x.fid === id))) return; S().fornitori = S().fornitori.filter(f => f.id !== id); agg(); },
};
return A;
})();
