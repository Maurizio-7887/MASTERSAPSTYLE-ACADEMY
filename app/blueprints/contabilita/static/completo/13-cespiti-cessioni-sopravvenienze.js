/* Generato da tools/split_simulatore.py (completo) — non modificare a mano: modifica sorgenti/ e rilancia. */
/*
 * FI-AA asset disposal and constrained FI-GL current-year difference postings.
 * Load after FI, Treasury, Annual and FIModules definitions; this file is an
 * extension only and does not change the simulator HTML or its source scripts.
 * All ledger values and cross-checks are handled in integer cents.
 */
(function (root) {
  'use strict';
  const CODES = [
    ['43', 'Proventi documentati da differenze correnti (OIC 12; classificazione da valutare)', 'RICAVO'],
    ['44', 'Oneri documentati da differenze correnti (OIC 12; classificazione da valutare)', 'COSTO'],
    ['45', 'Plusvalenze da cessione cespiti', 'RICAVO'],
    ['46', 'Minusvalenze da cessione cespiti', 'COSTO']
  ];
  const MAX_CENTS = Number.MAX_SAFE_INTEGER;
  const REASONS = new Set(['STIMA_CORRENTE','REGOLAMENTO_CORRENTE','NUOVO_FATTO_CORRENTE']);
  const MODES = new Set(['SALE','SCRAP']);
  let pending = null;
  let patched = false;
  let rawPost = null;
  let rawRender = null;
  let rawConfirm = null;
  let rawNavGo = null;

  const state = () => {
    try { if (typeof STATO !== 'undefined') return STATO; } catch (_) { /* ES module / isolated harness */ }
    return root.STATO;
  };
  const norm = x => String(x ?? '').trim().toLocaleLowerCase('it-IT');
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const euro = x => typeof root.euro === 'function' ? root.euro(Number(x || 0)) : ('€ ' + Number(x || 0).toFixed(2));
  const clone = x => structuredClone(x);
  const asMoney = n => n / 100;
  const c = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new Error('Importo non valido o negativo.');
    const cents = Math.round(n * 100);
    if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) throw new Error('Importo fuori dai limiti supportati.');
    return cents;
  };
  const pctUnits = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error('Aliquota compresa tra 0 e 100%.');
    return Math.round(n * 10000); // percentage points at 4 decimal places
  };
  const pctCents = (baseCents, rate) => {
    const scaled = BigInt(pctUnits(rate));
    return Number((BigInt(baseCents) * scaled + 500000n) / 1000000n);
  };
  const pctMonthsCents = (baseCents, rate, months) => {
    const scaled = BigInt(pctUnits(rate)) * BigInt(months);
    return Number((BigInt(baseCents) * scaled + 6000000n) / 12000000n);
  };
  const parseDate = s => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) throw new Error('Data obbligatoria nel formato anno-mese-giorno.');
    const t = Date.parse(s + 'T00:00:00Z');
    if (!Number.isFinite(t) || new Date(t).toISOString().slice(0,10) !== s) throw new Error('Data non valida.');
    return s;
  };
  const account = code => state().pianoDeiConti.find(x => String(x.codice) === String(code));
  const accountName = code => account(code)?.nome || ('Conto ' + code);
  const row = (code, side, amountCents, extra = {}) => ({
    conto: String(code), dareAvere: side, importo: asMoney(amountCents), centroCostoId: '', centroRicavoId: '', ...extra
  });
  const rowsCanon = rows => (rows || []).map(x => ({
    conto:String(x.conto), dareAvere:x.dareAvere, cents:c(x.importo), centroCostoId:String(x.centroCostoId || ''), centroRicavoId:String(x.centroRicavoId || '')
  }));
  const wholePlanCanon = p => JSON.stringify({
    tipo:p.tipo, data:p.data, descrizione:p.descrizione, key:p.key,
    righe:rowsCanon(p.righe), detail:p.detail || {}
  });
  const hasReversal = (reg, cutoff = null) => (state().registrazioni || []).some(r => String(r?.fi?.stornoDi ?? '') === String(reg?.id) && (!cutoff || r.data <= cutoff));
  const activeAssetDisposal = (assetRegId, cutoff = null) => (state().registrazioni || []).find(r =>
    r?.fi?.assetExtra?.kind === 'DISPOSAL' && String(r.fi.assetExtra.disposal?.assetRegId) === String(assetRegId) && (!cutoff || r.data <= cutoff) && !hasReversal(r,cutoff));
  const checkDate = date => {
    parseDate(date);
    if (root.FI && typeof root.FI.dateCheck === 'function') root.FI.dateCheck(date);
  };
  const uniqueLabel = (x, label, max = 180) => {
    const v = String(x ?? '').trim();
    if (!v) throw new Error(label + ' obbligatorio.');
    if (v.length > max) throw new Error(label + ' troppo lungo (massimo ' + max + ' caratteri).');
    return v;
  };
  function init(s = state()) {
    if (!s || !Array.isArray(s.pianoDeiConti) || !Array.isArray(s.registrazioni)) throw new Error('FI non inizializzato: impossibile attivare AssetExtra.');
    CODES.forEach(([codice,nome,tipo]) => {
      const found = s.pianoDeiConti.find(a => String(a.codice) === codice);
      if (!found) s.pianoDeiConti.push({codice,nome,tipo});
      else if (found.tipo !== tipo) throw new Error('Codice contabile AssetExtra già usato con natura incompatibile: ' + codice + '.');
    });
    s.fi ||= {};
    s.fi.assetExtra ||= {version:1};
    return s;
  }
  function validatePlan(p) {
    if (!root.FI || typeof root.FI.validate !== 'function') throw new Error('FI.validate non disponibile.');
    return root.FI.validate(p);
  }
  function checkTextAndDate(x) {
    if (!x || typeof x !== 'object') throw new Error('Dati dell’operazione mancanti.');
    checkDate(x.data);
    const ref = uniqueLabel(x.riferimento, 'Riferimento del documento');
    const descrizione = uniqueLabel(x.descrizione || x.motivazione, 'Descrizione del fatto', 500);
    return {ref, descrizione};
  }
  function allAcquisitions(cutoff = null) {
    return (state().registrazioni || []).filter(r => (r?.fi?.cespite || r?.fi?.cespiteDisposto) && !hasReversal(r,cutoff)).map(r => {
      const detail = {...(r.fi.cespite || r.fi.cespiteDisposto)};
      if(root.FIQuattro)detail.costo=root.FIQuattro.effectiveCost(r.id,cutoff)/100;
      const disposal = activeAssetDisposal(r.id,cutoff);
      return {regId:r.id, data:r.data, ...detail, status:r.fi.cespite ? 'ATTIVO' : (disposal ? 'DISMESSO' : 'DA_RICONCILIARE')};
    });
  }
  function assetSource(id,cutoff=null) {
    const r = (state().registrazioni || []).find(x => String(x.id) === String(id));
    if (!r || (!r.fi?.cespite && !r.fi?.cespiteDisposto) || hasReversal(r)) throw new Error('Cespite non presente o acquisto già stornato nel registro FI-AA.');
    const detail=clone(r.fi.cespite || r.fi.cespiteDisposto);if(root.FIQuattro)detail.costo=root.FIQuattro.effectiveCost(r.id,cutoff)/100;
    return {reg:r,detail,id:r.id};
  }
  function quoteRowsFor(reg, id) {
    return (reg?.fi?.quote || []).filter(q => String(q.regId) === String(id));
  }
  function quoteCandidates(id, cutoff = null) {
    const regs = state().registrazioni || [];
    const sources = regs.filter(r => !r?.fi?.stornoDi && (!cutoff || r.data <= cutoff));
    const out = [];
    sources.forEach(r => quoteRowsFor(r,id).forEach(q => {
      const reverse = regs.find(x => String(x?.fi?.stornoDi ?? '') === String(r.id));
      if (reverse && (!cutoff || reverse.data <= cutoff)) return;
      out.push({reg:r, quote:q});
    }));
    return out;
  }
  function registeredQuotes(id) {
    return (state().registrazioni || []).filter(r => !r.fi?.stornoDi && !hasReversal(r)).flatMap(r => quoteRowsFor(r,id).map(q => ({reg:r, quote:q})));
  }
  function disposalQuoteRows(id, cutoff = null) {
    const regs = state().registrazioni || [];
    const out = [];
    regs.forEach(r => {
      if (r?.fi?.assetExtra?.kind !== 'DISPOSAL' || String(r.fi.assetExtra.disposal?.assetRegId) !== String(id)) return;
      if (cutoff && r.data > cutoff) return;
      if (hasReversal(r,cutoff)) return;
      const q = r.fi.assetExtra.disposal.depreciationQuote;
      if (q && Number(q.centesimi) > 0) out.push({reg:r, quote:q});
    });
    return out;
  }
  function effectiveQuoteCents(id, cutoff = null) {
    const regular = quoteCandidates(id,cutoff).reduce((n,x) => n + Number(x.quote.centesimi || 0), 0);
    const disposals = disposalQuoteRows(id,cutoff).reduce((n,x) => n + Number(x.quote.centesimi || 0), 0);
    return regular + disposals;
  }
  function quotePeriodError(id, saleDate) {
    const future = registeredQuotes(id).filter(({reg,quote}) => {
      const qYear = Number(quote.anno);
      return reg.data > saleDate || qYear > Number(saleDate.slice(0,4));
    });
    if (future.length) throw new Error('Esiste una quota di ammortamento futura rispetto alla data di dismissione (' + future.map(x => x.reg.data).join(', ') + '): prima storna/correggi la quota nel periodo aperto, poi riprova.');
    const laterDisposalQuotes = disposalQuoteRows(id).filter(({reg}) => reg.data > saleDate);
    if (laterDisposalQuotes.length) throw new Error('Esiste un movimento di ammortamento per dismissione successivo alla data scelta.');
  }
  function expectedPriorSchedule(source, saleDate) {
    const id = source.id, asset = source.detail, cost = c(asset.costo), rate = pctUnits(asset.aliquota), fn = parseDate(asset.funzione);
    const saleYear = Number(saleDate.slice(0,4)), fnYear = Number(fn.slice(0,4)), fnMonth = Number(fn.slice(5,7));
    const quotes = quoteCandidates(id,saleDate).concat(disposalQuoteRows(id,saleDate)).sort((a,b) => Number(a.quote.anno)-Number(b.quote.anno));
    const byYear = new Map();
    quotes.forEach(({reg,quote}) => {
      const y = Number(quote.anno), amount = Number(quote.centesimi);
      if (!Number.isInteger(y) || !Number.isSafeInteger(amount) || amount <= 0 || amount > cost) throw new Error('Registro ammortamenti non riconciliabile per cespite ' + asset.codice + '.');
      if (reg.data !== y + '-12-31' && !(reg.fi?.assetExtra?.kind === 'DISPOSAL_DEPRECIATION' && y === Number(reg.data.slice(0,4)) && reg.data <= saleDate && reg.fi.assetExtra.input.data === reg.data)) throw new Error('Quota annua non datata al 31/12 (' + reg.data + '): riconciliare prima della dismissione.');
      if (byYear.has(y)) throw new Error('Più quote nell’anno ' + y + ' per il cespite ' + asset.codice + ': riconciliare prima della dismissione.');
      byYear.set(y,{reg,quote,amount});
    });
    let used = 0;
    for (let y = fnYear; y <= saleYear; y++) {
      const months = y < saleYear ? (y === fnYear ? 13 - fnMonth : 12) :
        (saleDate.slice(0,4) === fn.slice(0,4) ? Math.min(13 - fnMonth, Number(saleDate.slice(5,7)) - fnMonth + 1) : Number(saleDate.slice(5,7)));
      if (months < 1 || months > 12) throw new Error('Periodo di ammortamento non valido per ' + asset.codice + '.');
      const yrQuote = byYear.get(y);
      const fullYearAlreadyPosted = !!yrQuote;
      const elapsedMonths = fullYearAlreadyPosted ? months : (y < saleYear ? months : 0);
      const expectedFull = Math.min(Math.max(0,cost-used), pctMonthsCents(cost,asset.aliquota,months));
      if (y < saleYear) {
        if (expectedFull > 0 && !yrQuote) throw new Error('Manca l’ammortamento dell’esercizio ' + y + ' per ' + asset.codice + '. La quota incompleta di anni precedenti non viene recuperata tutta alla dismissione: riconcilia l’anno mancante prima di vendere.');
        if (yrQuote && yrQuote.amount !== expectedFull) throw new Error('Quota ' + y + ' non coerente con costo, aliquota e mesi (attesa ' + euro(expectedFull/100) + ', registrata ' + euro(yrQuote.amount/100) + '). Riconciliare prima della dismissione.');
        if (yrQuote) {
          const q = yrQuote.quote;
          if (Number(q.mesi) !== months || String(q.codice) !== String(asset.codice)) throw new Error('Metadati della quota ' + y + ' non coerenti con il cespite.');
          used += yrQuote.amount;
        }
      } else if (yrQuote) {
        if (saleDate !== y + '-12-31' && yrQuote.reg.fi?.assetExtra?.kind !== 'DISPOSAL_DEPRECIATION') throw new Error('È già registrata una quota al 31/12 oltre la data di cessione: storna/correggi la quota prima della vendita.');
        if (yrQuote.amount !== expectedFull) throw new Error('Quota annua di ' + y + ' diversa dalla quota fino alla data di cessione; riconciliare prima della dismissione.');
        if (Number(yrQuote.quote.mesi) !== months || String(yrQuote.quote.codice) !== String(asset.codice)) throw new Error('Metadati della quota ' + y + ' non coerenti con il cespite.');
        used += yrQuote.amount;
      }
      if (y === saleYear && !fullYearAlreadyPosted) {
        const current = Math.min(Math.max(0,cost-used), pctMonthsCents(cost,asset.aliquota,months));
        return {usedCents:used, currentCents:current, mesi:months, currentAlreadyPosted:false};
      }
      if (used >= cost) {
        if (y < saleYear && byYear.has(y+1)) throw new Error('Quota registrata dopo il completo ammortamento del cespite.');
        return {usedCents:used, currentCents:0, mesi:months, currentAlreadyPosted:y === saleYear && fullYearAlreadyPosted};
      }
    }
    const current = byYear.has(saleYear) ? 0 : Math.min(Math.max(0,cost-used),pctMonthsCents(cost,asset.aliquota,Number(saleDate.slice(5,7))));
    return {usedCents:used,currentCents:current,mesi:Number(saleDate.slice(5,7)),currentAlreadyPosted:byYear.has(saleYear)};
  }
  function depreciationAtDisposal(data, assetRegId) {
    init(); checkDate(data);
    const source = assetSource(assetRegId,data);
    if (activeAssetDisposal(source.id)) throw new Error('Cespite già dismesso.');
    if (data < source.reg.data || data < source.detail.funzione) throw new Error('Data antecedente all’acquisto/entrata in funzione.');
    quotePeriodError(source.id,data);
    const schedule = expectedPriorSchedule(source,data);
    assertFundPoolReconciled(data);
    if (schedule.currentAlreadyPosted || !schedule.currentCents) throw new Error('Nessuna nuova quota: già registrata oppure quota zero. Per quota zero motiva esplicitamente nella cessione.');
    const q={regId:source.id,codice:String(source.detail.codice),anno:Number(data.slice(0,4)),mesi:schedule.mesi,centesimi:schedule.currentCents};
    return validatePlan({tipo:'AMMORTAMENTO',data,descrizione:'Ammortamento fino alla cessione — '+q.codice,key:'ammortamento-cessione:'+source.id+':'+data,righe:[row('54','DARE',q.centesimi),row('02','AVERE',q.centesimi)],detail:{quote:[q],assetExtra:{kind:'DISPOSAL_DEPRECIATION',input:{data,assetRegId:source.id}}}});
  }
  function assertFundPoolReconciled(data) {
    if (!root.FI || typeof root.FI.balances !== 'function') return;
    const b = root.FI.balances(data) || {};
    let expected = 0;
    allAcquisitions(data).forEach(x => {
      if (x.data > data) return;
      const disposal = activeAssetDisposal(x.regId);
      if (disposal && disposal.data <= data) return; // removed from the active 02 balance at disposal
      const bal = effectiveQuoteCents(x.regId,data);
      expected -= bal;
    });
    const actual = Number(b['02'] || 0);
    if (actual !== expected) throw new Error('Il saldo complessivo del fondo 02 (' + euro(actual/100) + ') non coincide con le quote cespiti analitiche (' + euro(expected/100) + '). Riconcilia prima i fondi/quote storici: la dismissione guidata si arresta per non inventare un valore netto.');
  }
  function disposal(data, input) {
    init();
    const x = {...(input || {}), data:data || input?.data};
    x.assetRegId = x.assetRegId ?? x.assetId;
    x.riferimento = x.riferimento ?? x.reference;
    x.proceeds = x.proceeds ?? x.price;
    x.vatRate = x.vatRate ?? x.iva;
    x.counterparty = x.counterparty ?? x.party;
    x.invoiceRef = x.invoiceRef ?? x.invoice;
    checkDate(x.data);
    const source = assetSource(x.assetRegId,x.data);
    if (source.reg.data > x.data) throw new Error('La data di dismissione precede la fattura di acquisto.');
    const mode = String(x.mode || '').toUpperCase();
    if (!MODES.has(mode)) throw new Error('Seleziona cessione con corrispettivo oppure radiazione/scrap.');
    const meta = checkTextAndDate(x);
    const asset = source.detail, cost = c(asset.costo), rate = pctUnits(asset.aliquota);
    if (!asset.codice || !asset.nome || !asset.funzione || !cost || !rate) throw new Error('Anagrafica cespite incompleta o aliquota non valida.');
    parseDate(asset.funzione);
    if (x.data < asset.funzione) throw new Error('La dismissione non può precedere l’entrata in funzione.');
    if (source.reg.fi?.cespiteDisposto && !source.reg.fi?.cespite) throw new Error('Cespite già dismesso o in riconciliazione: non registrare una seconda uscita.');
    const existing = activeAssetDisposal(source.id);
    if (existing) throw new Error('Il cespite ' + asset.codice + ' è già stato dismesso con la registrazione n° ' + existing.id + '.');
    if ((state().registrazioni || []).some(r => r.fi?.assetExtra?.kind === 'DISPOSAL' && String(r.fi.assetExtra.disposal?.assetRegId) === String(source.id) && r.fi.assetExtra.disposal?.riferimento?.toLocaleLowerCase('it-IT') === meta.ref.toLocaleLowerCase('it-IT') && !hasReversal(r))) throw new Error('Documento di dismissione già registrato per questo cespite.');
    quotePeriodError(source.id,x.data);
    const schedule = expectedPriorSchedule(source,x.data);
    assertFundPoolReconciled(x.data);
    const priorFund = schedule.usedCents;
    if (!schedule.currentAlreadyPosted && schedule.currentCents > 0) throw new Error('Prima della cessione registra separatamente l’ammortamento fino alla data di uscita (fase 1). La vendita non addebita ammortamenti.');
    if (!schedule.currentAlreadyPosted && schedule.currentCents === 0 && !String(x.zeroDepreciationReason || '').trim()) throw new Error('Quota pertinente zero: indica una motivazione esplicita (es. bene completamente ammortizzato o quota arrotondata a zero).');
    const currentDep = 0;
    const accumulated = priorFund + currentDep;
    if (accumulated > cost) throw new Error('Fondo ammortamento superiore al costo storico.');
    const netBook = cost - accumulated;
    const ref = meta.ref, descr = meta.descrizione;
    let proceeds = 0, vatRate = 0, vat = 0, gross = 0, party = '', invoiceRef = '', dueDate = '';
    if (mode === 'SALE') {
      proceeds = c(x.proceeds);
      if (!proceeds) throw new Error('Corrispettivo imponibile positivo obbligatorio per una cessione.');
      vatRate = Number(x.vatRate);
      if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) throw new Error('Aliquota IVA di vendita non valida (0–100%).');
      vat = pctCents(proceeds,vatRate);
      party = uniqueLabel(x.counterparty,'Cliente/acquirente');
      invoiceRef = uniqueLabel(x.invoiceRef,'Numero fattura di vendita');
      if ((state().registrazioni || []).some(r => !hasReversal(r) && r.fi?.treasury?.serviceInvoice && norm(r.fi.treasury.serviceInvoice.party) === norm(party) && norm(r.fi.treasury.serviceInvoice.invoiceRef) === norm(invoiceRef) && r.righe.some(z => z.conto === '11' && z.dareAvere === 'DARE'))) throw new Error('Fattura cliente già presente: usa un numero documento distinto; la cessione guidata è relativa a un singolo cespite.');
      dueDate = parseDate(x.dueDate);
      if (dueDate < x.data) throw new Error('La scadenza della fattura non può precedere la data di cessione.');
      gross = proceeds + vat;
      if (!account('11') || !account('21')) throw new Error('Conti Clienti 11 e IVA vendite 21 necessari per la cessione.');
    } else {
      if (c(x.proceeds || 0) !== 0 || Number(x.vatRate || 0) !== 0 || String(x.counterparty || '').trim() || String(x.invoiceRef || '').trim() || String(x.dueDate || '').trim()) throw new Error('La radiazione senza corrispettivo non ammette prezzo, IVA, cliente, fattura o scadenza.');
    }
    const gain = mode === 'SALE' ? Math.max(0,proceeds-netBook) : 0;
    const loss = mode === 'SALE' ? Math.max(0,netBook-proceeds) : netBook;
    const disposalCents = currentDep > 0 ? {regId:source.id,codice:String(asset.codice),anno:Number(x.data.slice(0,4)),mesi:schedule.mesi,centesimi:currentDep} : null;
    const detail = {
      kind:'DISPOSAL', input:{...x}, disposal:{
        assetRegId:source.id, codice:String(asset.codice), nome:String(asset.nome), acquisitionDate:source.reg.data,
        functionDate:asset.funzione, costCents:cost, accumulatedBeforeCents:priorFund, currentDepreciationCents:currentDep,
        accumulatedAtDisposalCents:accumulated, netBookValueCents:netBook, proceedsCents:proceeds, vatRate,
        outputVatCents:vat, grossReceivableCents:gross, gainCents:gain, lossCents:loss,
        mode, riferimento:ref, descrizione:descr, counterparty:party, invoiceRef, dueDate,
        depreciationQuote:disposalCents
      }
    };
    const rows = [];
    if (currentDep) rows.push(row('54','DARE',currentDep),row('02','AVERE',currentDep));
    if (accumulated) rows.push(row('02','DARE',accumulated));
    rows.push(row('01','AVERE',cost));
    if (mode === 'SALE') {
      rows.push(row('11','DARE',gross));
      if (vat) rows.push(row('21','AVERE',vat));
      if (gain) rows.push(row('45','AVERE',gain));
      if (loss) rows.push(row('46','DARE',loss));
      detail.treasury = {
        kind:'ASSET_DISPOSAL_RECEIVABLE', counterparty:party, reference:ref,
        serviceInvoice:{type:'cessione_cespiti',party,invoiceRef,data:x.data,dueDate,account:'11',netCents:proceeds,vatCents:vat,totalCents:gross,vatRate,vatAccount:'21'}
      };
    } else if (loss) rows.push(row('46','DARE',loss));
    const key = 'asset-disposal:' + source.id + ':' + norm(ref);
    const plan = {tipo:'DISMISSIONE_CESPITE',data:x.data,descrizione:(mode === 'SALE' ? 'Cessione cespite ' : 'Radiazione cespite ') + asset.codice + ' — ' + descr,key,righe:rows,detail:{assetExtra:detail,...(detail.treasury ? {treasury:detail.treasury} : {})}};
    return validatePlan(plan);
  }
  function sopravvenienza(input) {
    init();
    const x = {...(input || {})};
    x.riferimento = x.riferimento ?? x.reference;
    x.descrizione = x.descrizione ?? x.description;
    x.kind = x.kind ?? x.natura ?? x.type;
    x.factDate = x.factDate ?? x.dataFatto;
    checkDate(x.data);
    const meta = checkTextAndDate(x);
    const kind = String(x.kind || '').toUpperCase();
    if (!['ATTIVA','PASSIVA'].includes(kind)) throw new Error('Seleziona altro provento corrente (credito) o altro onere corrente (debito).');
    const reason = String(x.reason || '').toUpperCase();
    if (!REASONS.has(reason) && reason !== 'ERRORE_ANNI_PRECEDENTI') throw new Error('Seleziona la natura del fatto di competenza.');
    const factDate = parseDate(x.factDate || x.dataFatto || '');
    if (factDate > x.data) throw new Error('Il documento contabile non può precedere il fatto economico.');
    if (reason === 'ERRORE_ANNI_PRECEDENTI' || factDate.slice(0,4) !== x.data.slice(0,4)) {
      throw new Error('Errore o fatto di esercizio precedente: fermarsi per revisione OIC 29 (natura, materialità, comparativi, patrimonio netto e fiscalità). Questa guida non lo instrada automaticamente a CE né modifica le variazioni fiscali.');
    }
    const amount = c(x.amount);
    if (!amount) throw new Error('Importo netto positivo obbligatorio.');
    const party = uniqueLabel(x.counterparty,'Controparte');
    const dueDate = parseDate(x.dueDate);
    if (dueDate < x.data) throw new Error('La scadenza non può precedere la registrazione.');
    const documentRef = uniqueLabel(x.documentRef,'Numero/protocollo del documento');
    if (!account('11') || !account('20')) throw new Error('Conti Clienti 11 e Fornitori 20 necessari per le partite aperte.');
    const proceeds = kind === 'ATTIVA';
    const accountCe = proceeds ? '43' : '44';
    const rows = proceeds ? [row('11','DARE',amount),row(accountCe,'AVERE',amount)] : [row(accountCe,'DARE',amount),row('20','AVERE',amount)];
    const treas = {
      kind:proceeds?'CURRENT_DIFFERENCE_RECEIVABLE':'CURRENT_DIFFERENCE_PAYABLE', counterparty:party, reference:meta.ref,
      serviceInvoice:{type:'fi_gl_current_difference',party,invoiceRef:documentRef,data:x.data,dueDate,account:proceeds?'11':'20',netCents:amount,vatCents:0,totalCents:amount,vatRate:0,vatAccount:null}
    };
    const doc = {kind,reason,factDate,amountCents:amount,party,documentRef,dueDate,riferimento:meta.ref,descrizione:meta.descrizione,taxTreatment:'manuale; nessuna variazione fiscale automatica'};
    const key = 'fi-gl-current-difference:' + kind.toLowerCase() + ':' + norm(party) + ':' + norm(documentRef);
    return validatePlan({tipo:'SOPRAVVENIENZA_CORRENTE',data:x.data,descrizione:(proceeds?'Altro provento corrente documentato':'Altro onere corrente documentato') + ' — ' + meta.descrizione,key,righe:rows,detail:{assetExtra:{kind:'CURRENT_DIFFERENCE',input:x,document:doc},treasury:treas}});
  }
  function depreciation(year) {
    init();
    const y = String(year);
    if (!/^\d{4}$/.test(y)) throw new Error('Anno non valido.');
    const data = y + '-12-31';
    checkDate(data);
    const rows = [], quotes = [];
    const entries = allAcquisitions(data).filter(a => a.data <= data && !activeAssetDisposal(a.regId,data));
    entries.forEach(asset => {
      if (asset.funzione > data) return;
      const used = effectiveQuoteCents(asset.regId,data);
      const cost = c(asset.costo);
      const prior = quoteCandidates(asset.regId,data).some(x => Number(x.quote.anno) === +y) || disposalQuoteRows(asset.regId,data).some(x => Number(x.quote.anno) === +y);
      if (prior) {
        const partial=quoteCandidates(asset.regId,data).find(x=>Number(x.quote.anno)===+y && x.reg.fi?.assetExtra?.kind==='DISPOSAL_DEPRECIATION');
        const fnMonth=Number(asset.funzione.slice(5,7)), expectedMonths=asset.funzione.slice(0,4)===y?13-fnMonth:12;
        if (partial && Number(partial.quote.mesi)!==expectedMonths) throw new Error('Cespite ancora attivo con quota alla cessione parziale: completa la cessione prevista oppure storna la quota e rigenera l’ammortamento annuale.');
        return;
      }
      const months = asset.funzione.slice(0,4) === y ? 13 - Number(asset.funzione.slice(5,7)) : 12;
      const value = Math.min(Math.max(0,cost-used),pctMonthsCents(cost,asset.aliquota,months));
      if (value > 0) {
        rows.push(row('54','DARE',value,asset.centro ? {centroCostoId:asset.centro} : {}),row('02','AVERE',value));
        quotes.push({regId:asset.regId,codice:String(asset.codice),anno:+y,mesi:months,centesimi:value});
      }
    });
    if (!quotes.length) throw new Error('Nessuna quota da ammortizzare (già registrata, cespite non in funzione, dismesso o completamente ammortizzato).');
    const seen = (state().registrazioni || []).filter(r => r.fi?.quote?.some(q => Number(q.anno) === +y)).length;
    return validatePlan({tipo:'AMMORTAMENTO',data,descrizione:'Ammortamenti civilistici ' + y,key:'ammortamenti:' + y + ':' + quotes.map(x=>x.regId).join(',') + ':' + seen,righe:rows,detail:{quote:quotes}});
  }
  function guardReverse(id, reversalDate = '') {
    const r = (state().registrazioni || []).find(x => String(x.id) === String(id));
    if (!r) return true;
    if (r.fi?.cespite || r.fi?.cespiteDisposto) {
      if (registeredQuotes(r.id).some(x => !hasReversal(x.reg))) throw new Error('Acquisto cespite con quote di ammortamento: non stornare la fonte lasciando cespiti/fondi orfani. Correggere prima le quote collegate o usare una rettifica professionale.');
      if (activeAssetDisposal(r.id)) throw new Error('Acquisto cespite già collegato a una dismissione: non stornare la fonte. Stornare prima, se consentito, la dismissione e riconciliare il fondo.');
    }
    if (r.fi?.quote?.length) {
      const blocked = r.fi.quote.filter(q => activeAssetDisposal(q.regId));
      if (blocked.length) throw new Error('Quota ammortamento utilizzata nella dismissione del cespite ' + blocked.map(x=>x.codice).join(', ') + ': non stornare la quota lasciando il fondo di cessione errato.');
    }
    if (r.fi?.assetExtra?.kind === 'DISPOSAL') {
      throw new Error('Dismissione protetta: lo storno integrato di cespite, quota, IVA e partita non è disponibile in questa versione. Per correggere il laboratorio ripristina un backup precedente in una copia separata.');
    }
    return true;
  }
  function inputPlan(p) {
    const kind = p?.detail?.assetExtra?.kind;
    if (kind === 'DISPOSAL_DEPRECIATION') return depreciationAtDisposal(p.data,p.detail.assetExtra.input.assetRegId);
    if (kind === 'DISPOSAL') return disposal(p.data,p.detail.assetExtra.input);
    if (kind === 'CURRENT_DIFFERENCE') return sopravvenienza(p.detail.assetExtra.input);
    return null;
  }
  function restoreAcquisition(sourceId) {
    const r = (state().registrazioni || []).find(x => String(x.id) === String(sourceId));
    if (!r || !r.fi?.cespiteDisposto || r.fi?.cespite) throw new Error('Anagrafica originaria del cespite non disponibile per il ripristino.');
    r.fi.cespite = clone(r.fi.cespiteDisposto);
    delete r.fi.cespiteDisposto;
    return r.id;
  }
  function markAcquisitionDisposed(sourceId) {
    const r = (state().registrazioni || []).find(x => String(x.id) === String(sourceId));
    if (!r?.fi?.cespite || r.fi.cespiteDisposto) throw new Error('Il cespite non è più attivo: rigenera l’anteprima.');
    r.fi.cespiteDisposto = clone(r.fi.cespite);
    delete r.fi.cespite;
    return r.id;
  }
  function revertMark(sourceId, original) {
    const r = (state().registrazioni || []).find(x => String(x.id) === String(sourceId));
    if (!r) return;
    if (original.active) { r.fi.cespite = clone(original.value); delete r.fi.cespiteDisposto; }
    else if (original.disposed) { r.fi.cespiteDisposto = clone(original.value); delete r.fi.cespite; }
  }
  function postCore(plan) {
    init();
    if (typeof rawPost !== 'function') throw new Error('FI.post non disponibile.');
    let sourceId = null, prior = null, restoreId = null, restoreValue = null;
    let fresh;
    const newAssetPlan = inputPlan(plan);
    if (newAssetPlan) {
      if (wholePlanCanon(plan) !== wholePlanCanon(newAssetPlan)) throw new Error('Dati cespite/documento cambiati dopo l’anteprima: rigenerare il piano.');
      fresh = newAssetPlan;
      if (fresh.detail.assetExtra.kind === 'DISPOSAL') {
        sourceId = fresh.detail.assetExtra.disposal.assetRegId;
        const src = assetSource(sourceId);
        prior = {active:!!src.reg.fi.cespite,disposed:!!src.reg.fi.cespiteDisposto,value:clone(src.reg.fi.cespite || src.reg.fi.cespiteDisposto)};
        // Nuove cessioni: anagrafica originaria intatta; stato derivato dal documento di dismissione.
      }
    } else if (plan?.tipo === 'STORNO' && Number.isFinite(Number(plan.detail?.stornoDi))) {
      const source = (state().registrazioni || []).find(r => String(r.id) === String(plan.detail.stornoDi));
      if (!source || !root.FI || typeof root.FI.reversal !== 'function') throw new Error('Scrittura originaria da stornare non disponibile.');
      guardReverse(source.id,plan.data);
      const expectedReversal = root.FI.reversal(source.id,plan.data);
      if (wholePlanCanon(plan) !== wholePlanCanon(expectedReversal)) throw new Error('Storno cambiato dopo l’anteprima: rigenera la scrittura.');
      if (source?.fi?.assetExtra?.kind === 'DISPOSAL') {
        restoreId = source.fi.assetExtra.disposal.assetRegId;
        const src = assetSource(restoreId);
        restoreValue = {active:!!src.reg.fi.cespite,disposed:!!src.reg.fi.cespiteDisposto,value:clone(src.reg.fi.cespite || src.reg.fi.cespiteDisposto)};
        restoreAcquisition(restoreId);
      }
    } else if (plan?.tipo === 'STORNO') {
      guardReverse(plan.detail?.stornoDi);
    } else if (plan?.tipo === 'AMMORTAMENTO') {
      const year = plan.detail?.quote?.[0]?.anno;
      if (!year) throw new Error('Quota ammortamento senza esercizio.');
      const current = depreciation(year);
      if (wholePlanCanon(plan) !== wholePlanCanon(current)) throw new Error('Registro cespiti cambiato dopo l’anteprima: rigenera gli ammortamenti.');
    }
    try {
      return rawPost(fresh || plan);
    } catch (e) {
      if (sourceId !== null && prior) revertMark(sourceId,prior);
      if (restoreId !== null && restoreValue) revertMark(restoreId,restoreValue);
      throw e;
    }
  }
  function post(plan) {
    if (!plan || !['DISMISSIONE_CESPITE','SOPRAVVENIENZA_CORRENTE','AMMORTAMENTO','STORNO'].includes(plan.tipo)) throw new Error('AssetExtra.post accetta soltanto piani FI-AA/FI-GL estesi.');
    if (!root.FI || typeof root.FI.post !== 'function') throw new Error('FI.post non disponibile.');
    return root.FI.post(plan);
  }

  function currentAssets() {
    const all = allAcquisitions();
    return all.map(a => {
      const disp = activeAssetDisposal(a.regId);
      const cost = c(a.costo);
      const fund = disp ? 0 : effectiveQuoteCents(a.regId);
      return {...a,disposalRegId:disp?.id ?? null,accumulatedCents:fund,netBookValueCents:disp ? 0 : Math.max(0,cost-fund)};
    });
  }
  function table(rows) {
    return `<table class="registro"><thead><tr><th>Conto</th><th>Dare</th><th>Avere</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.conto+' — '+accountName(r.conto))}</td><td>${r.dareAvere==='DARE'?esc(euro(r.importo)):''}</td><td>${r.dareAvere==='AVERE'?esc(euro(r.importo)):''}</td></tr>`).join('')}</tbody></table>`;
  }
  const dateValue = () => typeof root.oggiIso === 'function' ? root.oggiIso() : new Date().toISOString().slice(0,10);
  const val = id => document.getElementById(id)?.value ?? '';
  function activeOptionList() {
    return currentAssets().filter(a => a.status === 'ATTIVO' && !a.disposalRegId).map(a =>
      `<option value="${esc(a.regId)}">${esc(a.codice+' — '+a.nome)} · acquistato ${esc(a.data)} · costo ${esc(euro(a.costo))} · residuo contabile stimato ${esc(euro(a.netBookValueCents/100))}</option>`).join('');
  }
  function render() {
    init();
    if (!root.document) return;
    const body = root.document.getElementById('fi-body');
    if (!body) return;
    root.document.getElementById('asset-extra-disposal')?.remove();
    root.document.getElementById('asset-extra-current-difference')?.remove();
    const today = dateValue();
    const assetRows = currentAssets();
    const disposalHistory = (state().registrazioni || []).filter(r => r?.fi?.assetExtra?.kind === 'DISPOSAL').map(r => {
      const d = r.fi.assetExtra.disposal;
      return `<tr><td>${esc(r.data)}</td><td>${esc(d.codice+' — '+d.nome)}</td><td>${d.mode==='SALE'?'Cessione':'Radiazione'}</td><td>${esc(euro(d.costCents/100))}</td><td>${esc(euro(d.accumulatedAtDisposalCents/100))}</td><td>${esc(euro(d.netBookValueCents/100))}</td><td>${esc(euro(d.proceedsCents/100))}</td><td>${esc(euro(d.gainCents/100))}</td><td>${esc(euro(d.lossCents/100))}</td><td>${hasReversal(r)?'stornata':'registrata'}</td></tr>`;
    }).join('');
    const assetsHistory = assetRows.length ? `<table class="registro"><thead><tr><th>Cespite</th><th>Acquisto</th><th>Stato</th><th>Costo storico</th><th>Fondo residuo</th><th>Valore netto residuo</th></tr></thead><tbody>${assetRows.map(a=>`<tr><td>${esc(a.codice+' — '+a.nome)}</td><td>${esc(a.data)}</td><td>${a.disposalRegId?'dismesso (reg. '+esc(a.disposalRegId)+')':a.status==='ATTIVO'?'attivo':'da riconciliare'}</td><td>${esc(euro(a.costo))}</td><td>${esc(euro(a.accumulatedCents/100))}</td><td>${esc(euro(a.netBookValueCents/100))}</td></tr>`).join('')}</tbody></table>` : '<p class="vuoto">Nessun cespite nel registro FI-AA.</p>';
    const a = root.document.createElement('details'); a.id='asset-extra-disposal';a.className='riquadro';a.dataset.fiModule='aa';a.style.margin='14px 0';
    a.innerHTML = `<summary><b>7 · Cessione e dismissione cespiti — FI-AA</b></summary>
      <p class="aiuto">Cessione documentata o radiazione senza corrispettivo. Il piano elimina il costo storico 01 e storna il fondo 02, usa il fondo aggiornato dalla registrazione SEPARATA dell’ammortamento fino al mese di dismissione (mese incluso), confronta il ricavo al netto IVA con il valore netto e genera plus/minusvalenza dedicate (45/46). La cessione genera solo una partita cliente 11 e IVA vendite 21, senza movimento SD, incasso o pagamento. Conti e regole didattici: non è consulenza OIC/fiscale.</p>
      <div class="riga-campi"><div class="campo"><label>Cespite attivo</label><select id="ax-asset"><option value="">— seleziona —</option>${activeOptionList()}</select></div><div class="campo"><label>Operazione</label><select id="ax-mode" onchange="AssetExtra.uiToggleDisposalMode()"><option value="SALE">Cessione con corrispettivo documentato</option><option value="SCRAP">Radiazione / rottamazione senza corrispettivo</option></select></div><div class="campo"><label>Data uscita</label><input id="ax-date" type="date" value="${esc(today)}"></div><div class="campo"><label>Riferimento cessione / verbale</label><input id="ax-ref" type="text" maxlength="180" placeholder="es. verbale-cespite-2026-01"></div></div>
      <div id="ax-sale-fields"><div class="riga-campi"><div class="campo"><label>Cliente / acquirente</label><input id="ax-party" type="text" maxlength="180"></div><div class="campo"><label>Numero fattura di vendita</label><input id="ax-invoice" type="text" maxlength="180"></div><div class="campo"><label>Scadenza fattura</label><input id="ax-due" type="date" value="${esc(today)}"></div><div class="campo"><label>Corrispettivo imponibile (€)</label><input id="ax-proceeds" type="number" min="0" step="0.01"></div><div class="campo"><label>IVA in uscita (%)</label><input id="ax-vat-rate" type="number" min="0" max="100" step="0.01" value="22"></div></div></div>
      <div class="campo"><label>Descrizione / motivazione della cessione o verbale</label><input id="ax-description" type="text" maxlength="500"></div><p class="aiuto">Nella radiazione senza prezzo non sono ammessi cliente, fattura o IVA. Il valore contabile residuo è perdita dedicata 46; non vengono inventati incassi.</p>
      <h3>1 · Ammortamento fino alla data di cessione</h3><p class="aiuto">Seleziona cespite e data uscita sopra (es. 30/12). Anteprima → conferma D54 / A02. Poi torna al cespite e registra la vendita: il fondo aggiornato è usato una volta sola. Quote precedenti mancanti o future incoerenti restano bloccanti.</p><button class="azione" onclick="AssetExtra.uiPreviewDisposalDepreciation()">Anteprima ammortamento alla data cessione</button><h3>2 · Vendita / dismissione con fondo aggiornato</h3><div class="campo"><label>Motivazione SOLO se quota pertinente zero (nessuna scrittura fittizia)</label><input id="ax-zero-reason" maxlength="500"></div><button class="azione" onclick="AssetExtra.uiPreviewDisposal()">Anteprima vendita / radiazione SENZA ammortamento</button><div id="ax-error" role="alert" style="color:var(--rosso);font-weight:bold"></div><div id="ax-preview"></div>
      <h3>Registro beni e dismissioni</h3>${assetsHistory}<table class="registro"><thead><tr><th>Data</th><th>Cespite</th><th>Movimento</th><th>Costo tolto</th><th>Fondo al momento</th><th>Valore netto</th><th>Prezzo netto</th><th>Plusvalenza</th><th>Minusvalenza</th><th>Stato</th></tr></thead><tbody>${disposalHistory||'<tr><td colspan="10">Nessuna dismissione registrata.</td></tr>'}</tbody></table>`;
    const g = root.document.createElement('details'); g.id='asset-extra-current-difference';g.className='riquadro';g.dataset.fiModule='gl';g.style.margin='14px 0';
    g.innerHTML = `<summary><b>8 · Sopravvenienze documentate — FI-GL (differenze correnti)</b></summary>
      <p class="aiuto"><b>Non esiste una sezione straordinaria autonoma del conto economico.</b> Questa guida registra esclusivamente differenze documentate di competenza dell’esercizio corrente su 43/44, soggette a classificazione professionale OIC 12. Crea un nuovo credito 11 oppure un nuovo debito 20 aperto in Treasury; non estingue né compensa una partita già aperta, non registra fatture ordinarie con IVA, non paga/incassa e non calcola variazioni fiscali.</p>
      <div class="riga-campi"><div class="campo"><label>Natura</label><select id="axg-kind"><option value="ATTIVA">Sopravvenienza attiva — nuovo credito documentato</option><option value="PASSIVA">Sopravvenienza passiva — nuova obbligazione documentata</option></select></div><div class="campo"><label>Causa corrente</label><select id="axg-reason"><option value="STIMA_CORRENTE">Differenza documentata di stima dell’esercizio corrente</option><option value="REGOLAMENTO_CORRENTE">Differenza di regolamento riferita a un fatto dell’esercizio corrente</option><option value="NUOVO_FATTO_CORRENTE">Nuovo diritto / obbligazione documentato nell’esercizio corrente</option><option value="ERRORE_ANNI_PRECEDENTI">Errore di esercizio precedente — revisione OIC 29, non registrare qui</option></select></div><div class="campo"><label>Data contabile</label><input id="axg-date" type="date" value="${esc(today)}"></div><div class="campo"><label>Data del fatto economico</label><input id="axg-fact-date" type="date" value="${esc(today)}"></div></div>
      <div class="riga-campi"><div class="campo"><label>Controparte</label><input id="axg-party" type="text" maxlength="180"></div><div class="campo"><label>Documento / protocollo</label><input id="axg-document" type="text" maxlength="180"></div><div class="campo"><label>Scadenza del nuovo credito/debito</label><input id="axg-due" type="date" value="${esc(today)}"></div><div class="campo"><label>Importo netto, IVA esclusa (€)</label><input id="axg-amount" type="number" min="0" step="0.01"></div><div class="campo"><label>Riferimento contabile univoco</label><input id="axg-ref" type="text" maxlength="180"></div></div>
      <div class="campo"><label>Descrizione / motivazione documentale</label><input id="axg-description" type="text" maxlength="500"></div>
      <p class="aiuto"><b>OIC 29:</b> un errore di esercizio precedente richiede valutazione caso per caso (natura, materialità, comparativi, patrimonio netto e imposte); è bloccato qui, non instradato automaticamente a CE o a patrimonio netto. Le variazioni fiscali sono manuali e non vengono generate. Non usare questa procedura per chiudere un residuo esistente: per quello occorre un’allocazione Treasury esplicita e riconciliata.</p>
      <button class="azione" onclick="AssetExtra.uiPreviewSopravvenienza()">Anteprima differenza corrente / nuovo credito-debito</button><div id="axg-error" role="alert" style="color:var(--rosso);font-weight:bold"></div><div id="axg-preview"></div>`;
    body.append(a,g);
    a.open=false;g.open=false;
    setModuleVisibility();
  }
  function setModuleVisibility() {
    if (!root.document || !root.FIModules) return;
    const active = root.FIModules.active || 'home';
    root.document.querySelectorAll('[data-fi-module="aa"],[data-fi-module="gl"]').forEach(el => { el.hidden = active !== el.dataset.fiModule; });
  }
  function hookNavigation() {
    const nav = root.FIModules;
    if (!nav || nav.__assetExtraHooked || typeof nav.go !== 'function') return;
    rawNavGo = nav.go;
    nav.go = function (key) { const out = rawNavGo.apply(this,arguments); setModuleVisibility(); return out; };
    nav.__assetExtraHooked = true;
  }
  function uiToggleDisposalMode() {
    const mode = val('ax-mode');
    const box = root.document?.getElementById('ax-sale-fields');
    if (box) box.hidden = mode !== 'SALE';
  }
  function setError(prefix,e) {
    const message = e?.message || String(e);
    const node = root.document?.getElementById(prefix+'-error');
    if (node) node.textContent = message;
    if (typeof root.mostraToast === 'function') root.mostraToast('⚠️ ' + message,true);
    return null;
  }
  function clearPreview(prefix) {
    const err=root.document?.getElementById(prefix+'-error'); if(err)err.textContent='';
    const box=root.document?.getElementById(prefix+'-preview'); if(box)box.innerHTML='';
  }
  function drawPreview(prefix,p) {
    const box=root.document?.getElementById(prefix+'-preview');
    if (!box) return;
    box.innerHTML = `<div class="riquadro"><h3>Anteprima — ${esc(p.descrizione)}</h3><p>${esc(p.data)} · valori in euro · nessun movimento di banca</p>${table(p.righe)}${p.detail?.assetExtra?.kind==='DISPOSAL'?`<p>Valore netto ${esc(euro(p.detail.assetExtra.disposal.netBookValueCents/100))}; ammortamento in questa vendita (deve essere zero): ${esc(euro(p.detail.assetExtra.disposal.currentDepreciationCents/100))}; corrispettivo netto ${esc(euro(p.detail.assetExtra.disposal.proceedsCents/100))}; IVA uscita ${esc(euro(p.detail.assetExtra.disposal.outputVatCents/100))}; plusvalenza ${esc(euro(p.detail.assetExtra.disposal.gainCents/100))}; minusvalenza ${esc(euro(p.detail.assetExtra.disposal.lossCents/100))}.</p>`:''}<button class="azione" onclick="AssetExtra.uiConfirm()">Conferma nel Libro Giornale</button> <button class="azione secondaria" onclick="AssetExtra.uiCancel()">Annulla anteprima</button></div>`;
  }
  function uiPreviewDisposalDepreciation() {
    try { clearPreview('ax');pending=depreciationAtDisposal(val('ax-date'),val('ax-asset'));pending.prefix='ax';drawPreview('ax',pending);return pending; }
    catch(e) { pending=null;return setError('ax',e); }
  }
  function uiPreviewDisposal() {
    try {
      clearPreview('ax');
      const mode=val('ax-mode');
      const x={assetRegId:val('ax-asset'),mode,zeroDepreciationReason:val('ax-zero-reason'),riferimento:val('ax-ref'),descrizione:val('ax-description'),data:val('ax-date'),
        proceeds:mode==='SALE'?val('ax-proceeds'):0,vatRate:mode==='SALE'?val('ax-vat-rate'):0,counterparty:mode==='SALE'?val('ax-party'):'',invoiceRef:mode==='SALE'?val('ax-invoice'):'',dueDate:mode==='SALE'?val('ax-due'):''};
      pending=disposal(x.data,x); pending.prefix='ax';drawPreview('ax',pending);return pending;
    } catch(e) { pending=null;return setError('ax',e); }
  }
  function uiPreviewSopravvenienza() {
    try {
      clearPreview('axg');
      const x={kind:val('axg-kind'),reason:val('axg-reason'),data:val('axg-date'),factDate:val('axg-fact-date'),counterparty:val('axg-party'),
        documentRef:val('axg-document'),dueDate:val('axg-due'),amount:val('axg-amount'),riferimento:val('axg-ref'),descrizione:val('axg-description')};
      pending=sopravvenienza(x); pending.prefix='axg';drawPreview('axg',pending);return pending;
    } catch(e) { pending=null;return setError('axg',e); }
  }
  function uiConfirm() {
    if (!pending) return setError('ax','Genera prima un’anteprima valida.');
    const planNow=pending, prefix=planNow.prefix || 'ax';
    try {
      const posted=post(planNow);
      pending=null;
      if (typeof root.mostraToast === 'function') root.mostraToast('✅ Registrazione salvata nel Libro Giornale: ' + posted.descrizione);
      if (root.FI && typeof root.FI.render === 'function') root.FI.render(); else render();
      return posted;
    } catch(e) { return setError(prefix,e); }
  }
  function uiCancel() { const prefix=pending?.prefix || 'ax'; pending=null;clearPreview(prefix); }
  function attemptRender() { try { render(); } catch (e) { if (typeof root.console?.error==='function') root.console.error('AssetExtra render:',e); } }
  function hookCore() {
    if (patched || !root.FI || typeof root.FI.post !== 'function') return;
    init();
    rawPost = root.FI.post.bind(root.FI);
    root.FI.post = function (p) { return postCore(p); };
    if (typeof root.FI.depreciation === 'function') root.FI.depreciation = depreciation;
    if (typeof root.FI.render === 'function') {
      rawRender = root.FI.render.bind(root.FI);
      root.FI.render = function () { const out=rawRender.apply(this,arguments);attemptRender();return out; };
    }
    if (typeof root.FI.confirmPlan === 'function') {
      rawConfirm = root.FI.confirmPlan.bind(root.FI);
      root.FI.confirmPlan = function () { const out=rawConfirm.apply(this,arguments);attemptRender();return out; };
    }
    hookNavigation();
    patched = true;
    attemptRender();
  }
  const API = {
    init, disposal, depreciationAtDisposal, uiPreviewDisposalDepreciation, sopravvenienza, post, render, depreciation, guardReverse,
    assets:currentAssets, uiPreviewDisposal, uiPreviewSopravvenienza, uiToggleDisposalMode, uiConfirm, uiCancel,
    cancel:uiCancel, isAvailableForDepreciation:(id,cutoff)=>!activeAssetDisposal(id)||activeAssetDisposal(id).data>cutoff,
    _test:{expectedPriorSchedule,assertFundPoolReconciled,quoteCandidates,disposalQuoteRows}
  };
  root.AssetExtra = API;
  hookCore();
})(typeof window !== 'undefined' ? window : globalThis);
