/* Generato da tools/split_simulatore.py (vuoto) — non modificare a mano: modifica sorgenti/ e rilancia. */
/*
 * Treasury FI — modulo browser standalone per regolamenti, servizi e anticipi
 * da aggiungere dopo BudgetPool e prima dell'inizializzazione delle impostazioni.
 * Scrive esclusivamente nel Libro Giornale FI; nessuna API o rete esterna.
 */
(function (root) {
  'use strict';

  const CONTI = [
    ['19', 'Acconti a fornitori', 'ATTIVO'],
    ['36', 'Debiti finanziari per anticipi bancari su fatture', 'PASSIVO'],
    ['37', 'Acconti da clienti', 'PASSIVO'],
    ['55', 'Oneri finanziari', 'COSTO']
  ];
  const LIABILITY_ACCOUNTS = new Set(['20', '22', '23', '25', '26', '27', '28', '29', '35','2501','2502','3601','3602']);
  const RESERVED_SERVICE_ACCOUNTS = new Set(['14','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','39','40','41','51','54','55','56','61','62','63','70','71','72','73','74','75']);
  const MAX_CENTS = Number.MAX_SAFE_INTEGER;
  let pending = null;
  let viewCutoff = null; // sessione UI; null = max(today, ultima data presente nel giornale)

  const state = () => STATO;
  const treasuryMeta = r => r && r.fi && r.fi.treasury;
  const cents = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) throw new Error('Importo non valido o negativo.');
    const c = Math.round(n * 100);
    if (!Number.isSafeInteger(c) || c < 0 || c > MAX_CENTS) throw new Error('Importo fuori dai limiti supportati.');
    return c;
  };
  const money = c => c / 100;
  const round2 = x => Math.round((Number(x) + Number.EPSILON) * 100) / 100;
  const row = (conto, dareAvere, valueCents, extra = {}) => ({
    conto: String(conto), dareAvere, importo: money(valueCents), centroCostoId: '', centroRicavoId: '', ...extra
  });
  const norm = value => String(value ?? '').trim().toLocaleLowerCase('it-IT');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const parseDay = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) throw new Error('Data obbligatoria nel formato anno-mese-giorno.');
    const n = Date.parse(value + 'T00:00:00Z');
    if (!Number.isFinite(n) || new Date(n).toISOString().slice(0,10) !== value) throw new Error('Data non valida.');
    return n;
  };
  const plusDays = (date, days) => {
    const d = new Date(parseDay(date));
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0,10);
  };
  const today = () => {
    if (typeof oggiIso === 'function') return oggiIso();
    return new Date().toISOString().slice(0,10);
  };
  function defaultCutoff() {
    const dates=(state().registrazioni||[]).map(r=>r.data).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||'')));
    return [today(),...dates].sort().at(-1);
  }
  function currentCutoff() { return viewCutoff || defaultCutoff(); } // null: segue il giornale; data esplicita: filtro mantenuto
  const deep = obj => JSON.parse(JSON.stringify(obj));
  const euro = value => typeof root.euro === 'function' ? root.euro(value) : ('€ ' + Number(value || 0).toFixed(2));
  const accountExists = code => state().pianoDeiConti.some(c => String(c.codice) === String(code));
  const accountName = code => state().pianoDeiConti.find(c => String(c.codice) === String(code))?.nome || ('Conto ' + code);

  function init(s = state()) {
    if (!s || !Array.isArray(s.pianoDeiConti)) throw new Error('Piano dei conti non disponibile: Treasury non inizializzato.');
    CONTI.forEach(([codice,nome,tipo]) => {
      if (!s.pianoDeiConti.some(c => String(c.codice) === codice)) s.pianoDeiConti.push({codice,nome,tipo});
    });
    s.fi ||= {};
    s.registrazioni ||= [];
    return s;
  }

  function dateCheck(data) {
    parseDay(data);
    if (root.FI && typeof root.FI.dateCheck === 'function') root.FI.dateCheck(data);
  }

  function isAnnualTechnical(reg) {
    const t = String(reg?.tipo || '').toUpperCase();
    return ['CHIUSURA_CE','CHIUSURA_SP','APERTURA_SP','EPILOGO_CE','EPILOGO_SP','ANNUAL_CLOSING'].includes(t) ||
      !!(reg?.fi?.chiusuraAnnuale || reg?.fi?.annualClosing || reg?.fi?.epilogo || reg?.fi?.closing);
  }

  function isClosing(reg) {
    const t = String(reg?.tipo || '').toUpperCase();
    return isAnnualTechnical(reg) || /CHIUSURA|EPILOGO|CLOSING/.test(t);
  }

  function registrationIsReversed(reg, cutoff) {
    if (!reg) return false;
    return state().registrazioni.some(x => String(x?.fi?.stornoDi ?? '') === String(reg.id) && (!cutoff || x.data <= cutoff));
  }

  function openingDate() {
    return state().fi?.costituzione || state().registrazioni.map(r => r.data).filter(Boolean).sort()[0] || '0001-01-01';
  }

  function partyName(reg, kind) {
    const sd = state().sdmm || {};
    const origin = reg?.origineSD || {};
    if (origin.tipo === 'FATT') {
      const f = (sd.fatture || []).find(x => String(x.id) === String(origin.id));
      const c = (sd.clienti || []).find(x => String(x.id) === String(f?.cliId));
      return c?.nome || (f ? 'Cliente ' + f.cliId : '');
    }
    if (origin.tipo === 'MIRO') {
      const m = (sd.miro || []).find(x => String(x.id) === String(origin.id));
      const f = (sd.fornitori || []).find(x => String(x.id) === String(m?.fid));
      return f?.nome || (m ? 'Fornitore ' + m.fid : '');
    }
    const service = treasuryMeta(reg)?.serviceInvoice;
    if (service) return service.party || '';
    const assetInvoice=reg?.fi?.cespite || reg?.fi?.cespiteDisposto;
    if(assetInvoice?.fornitore && assetInvoice?.fattura)return assetInvoice.fornitore;
    return reg?.fi?.quattro?.input?.party || reg?.fi?.treasury?.counterparty || reg?.fi?.counterparty || '';
  }

  function sourceDates(reg, account) {
    const tm = treasuryMeta(reg) || {};
    const service = tm.serviceInvoice;
    if (service?.dueDate) return service.dueDate;
    const o = reg?.origineSD || {};
    if (o.tipo === 'FATT') {
      const f = (state().sdmm?.fatture || []).find(x => String(x.id) === String(o.id));
      return f?.scadenza || plusDays(reg.data, Number(state().budgetAnnuo?.giorniIncassoClienti || 30));
    }
    if (o.tipo === 'MIRO') {
      const m = (state().sdmm?.miro || []).find(x => String(x.id) === String(o.id));
      return m?.scadenza || plusDays(reg.data, 30);
    }
    if (reg?.fi?.cedolini?.length && ['22','25','26','27'].includes(String(account))) return reg.data;
    // Per le fonti G/L del conto fornitori il simulatore non conserva sempre la scadenza.
    return String(account) === '20' ? plusDays(reg.data, 30) : reg.data;
  }

  function addCandidate(list, source) {
    source.originalCents = Math.max(0, source.originalCents || 0);
    source.remainingCents = source.originalCents;
    source.settlementDates = [];
    list.push(source);
  }

  function eligibleSource(reg, line, index) {
    const account = String(line.conto);
    if (account === '1601' && line.dareAvere === 'DARE') return {account,kind:'factor-credit',ordinary:false,advance:false};
    if (account === '11' && line.dareAvere === 'DARE') return {account, kind:'receivable', ordinary:true, advance:false};
    if (LIABILITY_ACCOUNTS.has(account) && line.dareAvere === 'AVERE') return {account, kind:'payable', ordinary:true, advance:false};
    if (account === '36' && line.dareAvere === 'AVERE') {
      if (treasuryMeta(reg)?.kind === 'ADVANCE') return {account, kind:'loan', ordinary:false, advance:false};
      return {account, kind:'unlinked-loan', ordinary:false, advance:false};
    }
    // IVA a credito in Dare è visibile, ma non è denaro incassabile né pagabile.
    if (account === '28' && line.dareAvere === 'DARE') return {account, kind:'vat-credit', ordinary:false, advance:false};
    return null;
  }

  function sourceKey(regId, rowIndex) { return String(regId) + '|' + String(rowIndex); }

  let annualSnapshotProvider = null;

  function unpackBalances(snapshot) {
    if (!snapshot) return null;
    const candidates=[snapshot,snapshot.balances,snapshot.saldi,snapshot.saldiConti,snapshot.saldiContabili,
      snapshot.snapshot?.balances,snapshot.stato?.balances,snapshot.annual?.balances];
    for (const c of candidates) {
      if (Array.isArray(c)) {
        const out={};
        c.forEach(x=>{const code=String(x?.conto ?? x?.codice ?? x?.account ?? '');
          const value=x?.saldoCentesimi ?? x?.balanceCents ?? x?.saldoCents ?? x?.saldoDareMenoAvere ?? x?.balance ?? x?.saldo;
          if(code && Number.isFinite(Number(value)))out[code]=Number(value);
        });
        if (Object.keys(out).length) return out;
      } else if (c && typeof c === 'object') {
        const out={};
        ['10','11','20','22','25','26','27','28','29','35','36','1601','2501','2502','3601','3602'].forEach(code=>{
          const v=c[code];
          if (Number.isFinite(Number(v))) out[code]=Number(v);
          else if(v && typeof v==='object') {
            const n=v.saldoCentesimi ?? v.balanceCents ?? v.saldoCents ?? v.saldoDareMenoAvere ?? v.balance ?? v.saldo;
            if(Number.isFinite(Number(n)))out[code]=Number(n);
          }
        });
        if(Object.keys(out).length)return out;
      }
    }
    return null;
  }

  function setAnnualSnapshotProvider(provider) {
    if (provider !== null && typeof provider !== 'function') throw new Error('Il provider Annual deve essere una funzione sincrona o null.');
    annualSnapshotProvider=provider;
  }

  function annualApi() {
    try { if (typeof Annual !== 'undefined') return Annual; } catch (_) { /* lexical global non disponibile */ }
    return root.Annual || null;
  }

  function accountBalances(cutoff) {
    if (!root.FI || typeof root.FI.balances !== 'function') return {};
    const annual=annualApi();
    if (cutoff && annual && typeof annual.snapshot === 'function') {
      const year=cutoff.slice(0,4), exactYearEnd=cutoff===year+'-12-31';
      let closed=false;
      try {
        if(typeof annual.isClosed==='function') closed=!!(annual.isClosed(cutoff)||annual.isClosed(year));
        else if(typeof annual.isYearClosed==='function') closed=!!annual.isYearClosed(year);
        else closed=exactYearEnd;
      } catch (_) { closed=exactYearEnd; }
      if(closed) {
        try {
          const snap=annualSnapshotProvider ? annualSnapshotProvider(year,cutoff) : annual.snapshot(year,cutoff);
          const unpacked=unpackBalances(snap);
          if(unpacked)return unpacked;
        } catch (_) { /* fallback al saldo FI giornaliero se Annual non offre uno snapshot interrogabile */ }
      }
    }
    return root.FI.balances(cutoff);
  }

  function build(cutoff) {
    init();
    if (cutoff) parseDay(cutoff);
    const regList = state().registrazioni || [];
    const sources = [];
    const byKey = new Map();
    const anomalies = [];
    const activeRegs = regList.filter(r => (!cutoff || r.data <= cutoff) && !isAnnualTechnical(r));
    const storned = new Set(activeRegs.filter(r => r?.fi?.stornoDi).map(r => String(r.fi.stornoDi)));

    // I saldi iniziali 11/20 sono aggregati e non riconciliabili per anagrafica.
    // Vengono preservati come partite distinte tecniche, mai anticipabili.
    if (root.FI && typeof root.FI.opening === 'function') {
      const od = openingDate();
      root.FI.opening().forEach((r, i) => {
        const account = String(r.conto);
        if (!['11','20'].includes(account) || !['DARE','AVERE'].includes(r.dareAvere)) return;
        const belongs = (account === '11' && r.dareAvere === 'DARE') || (account === '20' && r.dareAvere === 'AVERE');
        if (!belongs) return;
        const amount = cents(r.importo);
        if (!amount) return;
        if (cutoff && od !== '0001-01-01' && od > cutoff) return;
        const k = 'opening:' + account + ':iniziale';
        const source = {
          key:k, regId:'opening', rowIndex:i, account, side:r.dareAvere, kind:account === '11' ? 'receivable' : 'payable',
          sourceType:'OPENING', date:od, dueDate:od, description:'Saldo iniziale non riconciliato per anagrafica',
          party:'', originalCents:amount, ordinary:true, advance:false, opening:true, sourceReg:null,
          anomaly:'Saldo iniziale aggregato: controparte e scadenza non riconciliate.'
        };
        addCandidate(sources, source); byKey.set(k, source);
      });
    }

    activeRegs.forEach(reg => {
      if (storned.has(String(reg.id))) return;
      if (reg?.fi?.stornoDi || !Array.isArray(reg.righe)) return;
      reg.righe.forEach((line, index) => {
        // L’IVA 28 è una posizione netta bilaterale, non una partita per fattura.
        if (String(line.conto) === '28') return;
        const what = eligibleSource(reg, line, index);
        if (!what) return;
        const amount = cents(line.importo);
        if (!amount) return;
        const key = sourceKey(reg.id, index);
        const meta = treasuryMeta(reg) || {};
        const advSource = what.account === '11' && (
          (reg.origineSD?.tipo === 'FATT') || meta.serviceInvoice?.type === 'vendita'
        );
        const source = {
          key, regId:reg.id, rowIndex:index, account:what.account, side:line.dareAvere, kind:what.kind,
          sourceType:reg.origineSD?.tipo || meta.serviceInvoice?.type || reg.tipo || 'G/L',
          date:reg.data, dueDate:sourceDates(reg, what.account), description:reg.descrizione || '',
          party:partyName(reg), originalCents:amount, ordinary:what.ordinary, advance:!!advSource,
          opening:false, sourceReg:reg, counterparty:partyName(reg), anomaly:'',
          sourceInvoiceId:reg.origineSD && ['FATT','MIRO'].includes(reg.origineSD.tipo) ? reg.origineSD.id : null
        };
        if (what.account === '11' && !sourceInvoiceIdOf(reg) && !meta.serviceInvoice) {
          source.anomaly = 'Movimento Clienti senza documento fattura/controparte identificabile; regolabile solo per riga, non anticipabile.';
        }
        if (what.account === '20' && !source.party && !sourceInvoiceIdOf(reg) && !meta.serviceInvoice) {
          source.anomaly = 'Movimento Fornitori senza documento/controparte identificabile; scadenza stimata a 30 giorni.';
        }
        if (what.account === '36' && what.kind === 'unlinked-loan') {
          source.anomaly = 'Debito 36 senza metadati di anticipo Treasury: non rimborsabile dal modulo.';
        }
        if (what.kind === 'vat-credit') source.anomaly = 'IVA a credito (conto 28 Dare): partita informativa non liquidabile come incasso.';
        addCandidate(sources, source); byKey.set(key, source);
      });
    });

    const ledgerBalances = accountBalances(cutoff);
    const vatNet = Number(ledgerBalances['28'] || 0); // Dare−Avere: positivo credito, negativo debito
    if (vatNet !== 0) {
      const vatDate = activeRegs.filter(r => !['SETTLEMENT','REPAYMENT'].includes(treasuryMeta(r)?.kind) &&
        (r.righe || []).some(x => String(x.conto) === '28')).map(r=>r.data).filter(Boolean).sort().at(-1) || openingDate();
      const payable = vatNet < 0;
      const source = {
        key:'gl:28',regId:'gl',rowIndex:-1,account:'28',side:payable?'AVERE':'DARE',kind:payable?'payable':'vat-credit',
        sourceType:'IVA_NETTA',date:vatDate,dueDate:vatDate,
        description:payable?'Saldo netto IVA a debito':'Saldo netto IVA a credito',party:'',
        originalCents:Math.abs(vatNet),ordinary:payable,advance:false,opening:false,sourceReg:null,
        anomaly:payable?'':'IVA a credito netta: informativa e non liquidabile come incasso.'
      };
      addCandidate(sources,source);byKey.set(source.key,source);
    }

    // Allocazioni già registrate: si applicano soltanto alle chiavi dichiarate nel giornale.
    // gl:28 è già ridotto dal saldo netto di conto, quindi non si sottrae due volte.
    activeRegs.forEach(reg => {
      if (reg?.fi?.stornoDi || storned.has(String(reg.id))) return;
      const meta = treasuryMeta(reg);
      if (!meta || !Array.isArray(meta.allocations)) return;
      meta.allocations.forEach(a => {
        if (String(a.key) === 'gl:28') return; // il movimento Dare28 ha già ridotto il saldo netto G/L
        const target = byKey.get(String(a.key));
        const n = Number(a.cents);
        if (!target || !Number.isSafeInteger(n) || n <= 0) {
          anomalies.push({code:'ALLOC_ORFANA',regId:reg.id,message:'Allocazione Treasury senza una riga fonte ancora esistente: '+String(a.key)});
          return;
        }
        const dec = Math.min(target.remainingCents, n);
        target.remainingCents -= dec;
        target.settlementDates.push(reg.data);
        if (dec !== n) anomalies.push({code:'ALLOC_ECCEDENTE',regId:reg.id,message:'Allocazione storica eccedente la riga fonte '+String(a.key)+'.'});
      });
    });

    // Incassi/pagamenti legacy già registrati: matching SOLO tramite stesso ID FATT/MIRO.
    // Non si inventa un matching FIFO o sulla sola coincidenza degli importi.
    activeRegs.forEach(reg => {
      if (reg?.fi?.stornoDi || storned.has(String(reg.id))) return;
      const origin = reg.origineSD || {};
      if (!['INC','PAG'].includes(origin.tipo)) return;
      const sideAccount = origin.tipo === 'INC' ? '11' : '20';
      const side = origin.tipo === 'INC' ? 'AVERE' : 'DARE';
      const settlable = reg.righe.filter(x => String(x.conto) === sideAccount && x.dareAvere === side)
        .reduce((n,x) => n + cents(x.importo), 0);
      if (!settlable) return;
      const sourceKind = origin.tipo === 'INC' ? 'FATT' : 'MIRO';
      const matches = sources.filter(x => x.sourceReg?.origineSD?.tipo === sourceKind &&
        String(x.sourceReg.origineSD.id) === String(origin.id) && x.account === sideAccount &&
        ((sideAccount === '11' && x.side === 'DARE') || (sideAccount === '20' && x.side === 'AVERE')));
      if (!matches.length) {
        anomalies.push({code:'LEGACY_ORFANO',regId:reg.id,message:'Movimento legacy '+origin.tipo+' '+origin.id+' senza fattura sorgente '+sourceKind+' abbinabile.'});
        return;
      }
      if(matches.length!==1){anomalies.push({code:'LEGACY_AMBIGUO',regId:reg.id,message:'Movimento legacy '+origin.tipo+' '+origin.id+' con più righe sorgenti possibili: allocazione automatica bloccata. Verifica il backup.'});return;}
      let left = settlable;
      matches.forEach(target => {
        if (left <= 0) return;
        const dec = Math.min(target.remainingCents, left);
        target.remainingCents -= dec; left -= dec;
        if (dec) target.settlementDates.push(reg.data);
      });
      if (left > 0) anomalies.push({code:'LEGACY_ECCEDENTE',regId:reg.id,message:'Incasso/pagamento legacy eccedente il credito/debito della fattura '+origin.id+'.'});
    });

    // Il capitale residuo degli anticipi resta legato alla singola riga di debito 36.
    const repaymentRegs = activeRegs.filter(r => !r?.fi?.stornoDi && !storned.has(String(r.id)) && treasuryMeta(r)?.kind === 'REPAYMENT');
    repaymentRegs.forEach(reg => {
      const meta = treasuryMeta(reg) || {};
      const target = byKey.get(String(meta.loanKey));
      if (!target || target.kind !== 'loan') {
        anomalies.push({code:'RIMBORSO_ORFANO',regId:reg.id,message:'Rimborso collegato a un anticipo non disponibile.'});
        return;
      }
      const n = Number(meta.principalCents);
      if (!Number.isSafeInteger(n) || n <= 0) return;
      const dec = Math.min(target.remainingCents, n);
      target.remainingCents -= dec;
      target.settlementDates.push(reg.data);
      if (dec !== n) anomalies.push({code:'RIMBORSO_ECCEDENTE',regId:reg.id,message:'Rimborso storico eccedente il debito bancario collegato.'});
    });

    sources.forEach(x => {
      x.remainingCents = Math.max(0, x.remainingCents);
      x.originalCents = Math.max(0, x.originalCents);
    });
    const open = sources.filter(x => x.remainingCents > 0).map(x => toPublicItem(x));

    // Quadratura per riga G/L; nessun residuo viene riassegnato a un'altra fattura.
    const balance11 = Number(ledgerBalances['11'] || 0);
    const balance20 = -Number(ledgerBalances['20'] || 0);
    const residualFor = (code,side) => sources.filter(x=>x.account===String(code)&&x.side===side).reduce((n,x)=>n+x.remainingCents,0);
    const residual11 = residualFor('11','DARE'), residual20 = residualFor('20','AVERE');
    const diff11 = balance11 - residual11, diff20 = balance20 - residual20;
    const accountChecks = {};
    const recordCheck = (code, balance, residual, diff, label) => {
      accountChecks[code]={balanceCents:balance,residualCents:residual,differenceCents:diff};
      if(diff!==0) anomalies.push({code:'RICONCILIAZIONE_'+code,account:String(code),cents:diff,message:'Saldo G/L '+label+' diverso dalle partite aperte (differenza '+euro(diff/100)+'). Nessun abbinamento automatico effettuato.'});
    };
    recordCheck('11',balance11,residual11,diff11,'Clienti');
    recordCheck('20',balance20,residual20,diff20,'Fornitori');
    recordCheck('1601',Number(ledgerBalances['1601']||0),residualFor('1601','DARE'),Number(ledgerBalances['1601']||0)-residualFor('1601','DARE'),'Crediti factor');
    ['22','23','25','26','27','29','35','36','2501','2502','3601','3602'].forEach(code=>{
      const balance=-Number(ledgerBalances[code]||0), residual=residualFor(code,'AVERE');
      recordCheck(code,balance,residual,balance-residual,accountName(code));
    });
    const balance28=Number(ledgerBalances['28']||0), residual28=Math.max(0,-balance28), vatCredit28=Math.max(0,balance28);
    recordCheck('28',residual28,residualFor('28','AVERE'),residual28-residualFor('28','AVERE'),'IVA netta a debito');
    accountChecks['28'].glBalanceCents=balance28;
    accountChecks['28'].payableCents=residual28;
    accountChecks['28'].vatCreditCents=vatCredit28;
    const reconciliation={cutoff:cutoff||null,balance11,residual11,diff11,balance20,residual20,diff20,
      balance28,vatPayable28:residual28,vatCredit28,accounts:accountChecks};
    // Conserva i flag legacy del backup ma segnala se non sono dimostrati dal giornale.
    const sd=state().sdmm||{};
    [['FATT',sd.fatture||[],'incasso'],['MIRO',sd.miro||[],'pagamento']].forEach(([kind,docs,flag])=>docs.filter(d=>d[flag]&&!d[flag].derivedFromLedger&&(!cutoff||!d[flag].data||d[flag].data<=cutoff)).forEach(d=>{
      const matching=sources.filter(x=>x.sourceReg?.origineSD?.tipo===kind&&String(x.sourceReg.origineSD.id)===String(d.id));
      if(!matching.length||matching.some(x=>x.remainingCents>0))anomalies.push({code:'FLAG_LEGACY_NON_RICONCILIATO',message:'Documento '+kind+' '+d.id+': flag legacy di '+flag+' conservato ma non dimostrato da regolamenti collegati nel giornale. Nessun residuo è stato cancellato; verifica i riferimenti del backup.'});
    }));
    return {sources, byKey, open, anomalies, reconciliation};
  }

  function sourceInvoiceIdOf(reg) {
    return !!(reg?.origineSD && ['FATT','MIRO'].includes(reg.origineSD.tipo)) || !!treasuryMeta(reg)?.serviceInvoice;
  }

  function toPublicItem(x) {
    const canSettle = !!x.ordinary && x.kind !== 'vat-credit' && x.kind !== 'loan' && x.kind !== 'unlinked-loan';
    return {
      key:x.key, regId:x.regId, rowIndex:x.rowIndex, conto:x.account, account:x.account,
      accountName:accountName(x.account), side:x.side, kind:x.kind, sourceType:x.sourceType,
      date:x.date, dueDate:x.dueDate, descrizione:x.description, description:x.description,
      controparte:x.party || '', party:x.party || '',
      importoOriginale:money(x.originalCents), residuo:money(x.remainingCents), amount:money(x.remainingCents),
      originalCents:x.originalCents, remainingCents:x.remainingCents,
      opening:!!x.opening, advanceEligible:!!x.advance, settlementAllowed:canSettle,
      anomaly:x.anomaly || '', sourceInvoiceId:x.sourceInvoiceId ?? null,
      sourceRegId:x.sourceReg?.id ?? null
    };
  }

  function items(cutoff) { return build(cutoff).open; }
  function reconciliation(cutoff) { const effective=cutoff||[openingDate(),...(state().registrazioni||[]).map(r=>r.data)].filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(String(d||''))).sort().at(-1); return deep(build(effective).reconciliation); }
  function diagnostics(cutoff) { return deep(build(cutoff).anomalies); }
  function getSource(key, cutoff) { return build(cutoff).byKey.get(String(key)) || null; }

  function cleanReference(reference) {
    const ref = String(reference ?? '').trim();
    if (!ref) throw new Error('Inserisci un riferimento univoco.');
    if (ref.length > 180) throw new Error('Riferimento troppo lungo (massimo 180 caratteri).');
    return ref;
  }

  function ensureUniqueReference(key) {
    if (state().registrazioni.some(r => r?.fi?.key === key || treasuryMeta(r)?.referenceKey === key)) {
      throw new Error('Riferimento Treasury già registrato: operazione duplicata bloccata.');
    }
  }

  function makePlan(tipo, data, description, key, righe, treasury) {
    dateCheck(data);
    const plan = {tipo, data, descrizione:description, key, righe, detail:{treasury:deep(treasury)}};
    if (root.FI && typeof root.FI.validate === 'function') root.FI.validate(plan);
    return plan;
  }

  function allocationInput(allocation, item) {
    const value = allocation && Object.prototype.hasOwnProperty.call(allocation, 'amount') ? allocation.amount : allocation?.importo;
    const c = cents(value);
    if (!c) throw new Error('Le allocazioni devono avere importi maggiori di zero.');
    if (c > item.remainingCents) throw new Error('Importo eccedente il residuo della partita '+item.key+'.');
    return c;
  }

  function settlementKey(reference) { return 'treasury:settlement:' + norm(reference); }

  function planSettlement(data, allocations = [], reference) {
    dateCheck(data);
    const ref = cleanReference(reference);
    const key = settlementKey(ref);
    ensureUniqueReference(key);
    if (!Array.isArray(allocations) || !allocations.length) throw new Error('Seleziona almeno una partita aperta.');
    const snapshot = build(data);
    const seen = new Set();
    const chosen = [];
    let direction = null, total = 0;
    allocations.forEach(a => {
      const itemKey = String(a?.key ?? '');
      if (!itemKey || seen.has(itemKey)) throw new Error('Chiave partita mancante o duplicata.');
      seen.add(itemKey);
      const source = snapshot.byKey.get(itemKey);
      if(window.FIQuattro)FIQuattro.guardSettlement(itemKey,data);
      if (!source || source.remainingCents <= 0) throw new Error('Partita non più aperta o non disponibile: '+itemKey+'.');
      if (!source.ordinary || source.opening && source.kind === 'loan') throw new Error('Questa partita non è liquidabile con un regolamento ordinario: '+itemKey+'.');
      if (source.kind === 'vat-credit' || source.account === '36') throw new Error('IVA a credito e debiti finanziari richiedono il flusso dedicato.');
      if (source.account === '11' && source.side === 'DARE') {
        if (direction && direction !== 'IN') throw new Error('Non mescolare incassi e pagamenti: compensazioni non abilitate.');
        direction = 'IN';
      } else if ((LIABILITY_ACCOUNTS.has(source.account)) && source.side === 'AVERE') {
        if (direction && direction !== 'OUT') throw new Error('Non mescolare incassi e pagamenti: compensazioni non abilitate.');
        direction = 'OUT';
      } else throw new Error('Segno/partita non liquidabile: '+itemKey+'.');
      if (data < source.date) throw new Error('La data di regolamento precede la data della fonte '+source.date+'.');
      const n = allocationInput(a, source);
      chosen.push({key:itemKey,cents:n,source}); total += n;
    });
    if (!total) throw new Error('Importo complessivo nullo.');
    const allocationsMeta = chosen.map(x=>({key:x.key,cents:x.cents}));
    const desc = (direction === 'IN' ? 'Incasso' : 'Pagamento')+' Treasury — '+ref;
    const righe = [];
    if (direction === 'IN') {
      righe.push(row('10','DARE',total));
      chosen.forEach(x=>righe.push(row(x.source.account,'AVERE',x.cents)));
    } else {
      checkBankAfterPayment(data, total);
      chosen.forEach(x=>righe.push(row(x.source.account,'DARE',x.cents)));
      righe.push(row('10','AVERE',total));
    }
    return makePlan('REGOLAMENTO_TREASURY',data,desc,key,righe,{
      kind:'SETTLEMENT',direction,reference:ref,referenceKey:key,allocations:allocationsMeta,totalCents:total
    });
  }

  function activeAdvanceCents(partitaKey, cutoff) {
    const built=build(cutoff);
    return state().registrazioni.reduce((sum,reg) => {
      if (reg?.fi?.stornoDi || (cutoff && reg.data > cutoff) || registrationIsReversed(reg,cutoff)) return sum;
      const tm=treasuryMeta(reg)||{};
      if (tm.kind!=='ADVANCE' || String(tm.parentKey)!==String(partitaKey)) return sum;
      const rowIndex=(reg.righe||[]).findIndex(x=>String(x.conto)==='36'&&x.dareAvere==='AVERE');
      const loan=built.byKey.get(sourceKey(reg.id,rowIndex));
      return sum+(loan?.remainingCents||0);
    },0);
  }

  function planAdvance(data, key, amount, ref, commission = 0) {
    dateCheck(data);
    const reference = cleanReference(ref);
    const normalizedKey = 'treasury:advance:' + norm(reference);
    ensureUniqueReference(normalizedKey);
    if(window.FIQuattro)FIQuattro.guardSettlement(key,data);
    const base = getSource(key, data);
    if (!base || base.remainingCents <= 0) throw new Error('Fattura cliente non aperta o non disponibile.');
    if (base.account !== '11' || base.side !== 'DARE' || !base.advance || base.opening) throw new Error('L’anticipo bancario richiede una fattura cliente documentata (FATT/servizio vendita), non un saldo iniziale o una partita generica.');
    if (data < base.date) throw new Error('Data di anticipo antecedente alla fattura.');
    const gross = cents(amount), fee = cents(commission);
    if (!gross) throw new Error('Importo dell’anticipo maggiore di zero obbligatorio.');
    if (fee >= gross) throw new Error('Commissioni non possono azzerare o superare l’anticipo lordo.');
    const due = base.remainingCents - activeAdvanceCents(base.key,data);
    if (gross > due) throw new Error('Anticipo eccedente il credito non ancora incassato al netto degli anticipi bancari già aperti ('+euro(Math.max(0,due)/100)+').');
    const righe = [row('10','DARE',gross-fee)];
    if (fee) righe.push(row('55','DARE',fee));
    righe.push(row('36','AVERE',gross));
    return makePlan('ANTICIPO_BANCARIO',data,'Anticipo bancario su fattura — '+reference,normalizedKey,righe,{
      kind:'ADVANCE',reference,referenceKey:normalizedKey,parentKey:base.key,parentRegId:base.regId,
      principalCents:gross,commissionCents:fee,invoiceDescription:base.description
    });
  }

  function outstandingLoan(loanRegId, cutoff) {
    const built = build(cutoff);
    const original = state().registrazioni.find(r => String(r.id) === String(loanRegId));
    if (!original || treasuryMeta(original)?.kind !== 'ADVANCE' || registrationIsReversed(original, cutoff)) return null;
    const sourceLineIndex = original.righe.findIndex(x => String(x.conto) === '36' && x.dareAvere === 'AVERE');
    if (sourceLineIndex < 0) return null;
    const key = sourceKey(original.id, sourceLineIndex);
    return built.byKey.get(key) || null;
  }

  function planRepay(data, loanRegId, amount, reference, interest = 0, extraCost = {}) {
    dateCheck(data);
    const ref = cleanReference(reference);
    const refKey = 'treasury:repayment:' + norm(ref);
    ensureUniqueReference(refKey);
    const loan = outstandingLoan(loanRegId, data);
    if (!loan || loan.remainingCents <= 0) throw new Error('Anticipo bancario inesistente, già chiuso o stornato.');
    if (data < loan.date) throw new Error('Data rimborso antecedente alla data dell’anticipo.');
    const principal = cents(amount), interestCents = cents(interest);
    if (!principal) throw new Error('Il rimborso del capitale deve essere maggiore di zero.');
    if (principal > loan.remainingCents) throw new Error('Rimborso eccedente il debito bancario residuo ('+euro(loan.remainingCents/100)+').');
    let additionalCost = null;
    if (interestCents) {
      if (extraCost.newCostConfirmed !== true || !String(extraCost.costDocument || '').trim() || !String(extraCost.costReason || '').trim()) throw new Error('Solo capitale: gli oneri sono ammessi esclusivamente come NUOVI costi non già contabilizzati, con conferma, documento e motivazione.');
      const documentKey = norm(extraCost.costDocument);
      const regs = state().registrazioni || [];
      if (documentKey === norm(treasuryMeta(loan.sourceReg || regs.find(r=>String(r.id)===String(loanRegId)))?.reference || '') || regs.some(r => !registrationIsReversed(r) && (norm(treasuryMeta(r)?.additionalCost?.costDocument || '') === documentKey || (r.righe || []).some(z=>z.conto==='55'&&z.dareAvere==='DARE') && [treasuryMeta(r)?.reference,r.fi?.riferimento,r.fi?.treasury?.serviceInvoice?.invoiceRef].some(v=>v && norm(v)===documentKey)))) throw new Error('Documento oneri già contabilizzato: doppio addebito bloccato.');
      additionalCost = {newCostConfirmed:true,costDocument:String(extraCost.costDocument).trim(),costReason:String(extraCost.costReason).trim()};
    }
    const cash = principal + interestCents;
    if (!Number.isSafeInteger(cash) || cash <= 0) throw new Error('Importo complessivo del rimborso non valido.');
    checkBankAfterPayment(data, cash);
    const righe = [row('36','DARE',principal)];
    if (interestCents) righe.push(row('55','DARE',interestCents));
    righe.push(row('10','AVERE',cash));
    const loanLine = loan.rowIndex;
    return makePlan('RIMBORSO_ANTICIPO',data,'Rimborso anticipo bancario — '+ref,refKey,righe,{
      kind:'REPAYMENT',reference:ref,referenceKey:refKey,loanKey:sourceKey(loanRegId,loanLine),
      loanRegId:Number(loanRegId),principalCents:principal,interestCents,additionalCost
    });
  }

  function serviceAccounts(type) {
    const wanted = type === 'acquisto' ? 'COSTO' : 'RICAVO';
    return state().pianoDeiConti.filter(c => ['COSTO','RICAVO'].includes(c.tipo) && c.tipo === wanted &&
      !RESERVED_SERVICE_ACCOUNTS.has(String(c.codice)));
  }

  function serviceVatAccount(type) {
    // Le fatture alimentano IVA a credito/debito (14/21); il netto va a 28
    // soltanto attraverso il documento guidato di liquidazione IVA.
    const code=type==='acquisto'?'14':'21';
    return accountExists(code)?code:null;
  }

  function planServiceInvoice(input) {
    const x = input || {};
    const type = String(x.type || x.tipo || '');
    if (!['acquisto','vendita'].includes(type)) throw new Error('Seleziona acquisto o vendita.');
    const data = String(x.data || '');
    dateCheck(data);
    const dueDate = String(x.dueDate || x.scadenza || '');
    parseDay(dueDate);
    if (dueDate < data) throw new Error('La scadenza non può precedere la data fattura.');
    const party = String(x.party || x.controparte || '').trim();
    const invoiceRef = String(x.invoiceRef || x.riferimento || x.fattura || '').trim();
    if (!party || !invoiceRef) throw new Error('Fornitore/cliente e numero fattura obbligatori.');
    const economicNature=String(x.economicNature||'ORDINARY');if(!['ORDINARY','ACCESSORY'].includes(economicNature))throw Error('Natura servizi non valida');
    const account = String(x.account || x.conto || '');
    if (!serviceAccounts(type).some(c => String(c.codice) === account)) throw new Error('Seleziona un conto di costo/ricavo ammesso per i servizi.');
    if (type === 'acquisto' && account === '52') {
      const cc = String(x.centroCostoId || x.centro || '');
      if (!cc || !state().centriDiCosto.some(c => String(c.id) === cc)) throw new Error('Per i costi servizi sul conto 52 il centro di costo è obbligatorio.');
    }
    const net = cents(x.amount ?? x.imponibile);
    const vatRate = Number(x.vatRate ?? x.aliquotaIva ?? state().budgetAnnuo?.aliquotaIva ?? 22);
    if (!net) throw new Error('Imponibile della fattura servizi maggiore di zero obbligatorio.');
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) throw new Error('Aliquota IVA non valida (0–100%).');
    const vat = Math.round(net * vatRate / 100);
    const total = net + vat;
    if (!Number.isSafeInteger(total) || total <= 0) throw new Error('Totale fattura non valido.');
    const vatAccount = serviceVatAccount(type);
    if (vat && !vatAccount) throw new Error('Conto IVA fatture mancante: la fattura servizi richiede 14 (acquisto) o 21 (vendita); il conto 28 è riservato alla liquidazione IVA.');
    const partyKey = norm(party), docKey = norm(invoiceRef);
    const key = 'treasury:service-invoice:' + type + ':' + partyKey + ':' + docKey;
    ensureUniqueReference(key);
    const cc = type === 'acquisto' && account === '52' ? String(x.centroCostoId || x.centro) : '';
    const desc = (type === 'acquisto' ? 'Fattura servizi fornitore ' : 'Fattura servizi cliente ') + party + ' — ' + invoiceRef;
    let righe;
    if (type === 'acquisto') {
      righe = [row(account,'DARE',net,cc ? {centroCostoId:cc} : {})];
      if (vat) righe.push(row(vatAccount,'DARE',vat));
      righe.push(row('20','AVERE',total));
    } else {
      righe = [row('11','DARE',total)];
      righe.push(row(account,'AVERE',net));
      if (vat) righe.push(row(vatAccount,'AVERE',vat));
    }
    return makePlan('FATTURA_SERVIZI',data,desc,key,righe,{
      kind:'SERVICE_INVOICE',reference:invoiceRef,referenceKey:key,
      serviceInvoice:{type,party,invoiceRef,data,dueDate,account,netCents:net,vatCents:vat,totalCents:total,vatRate,vatAccount,centroCostoId:cc,economicNature}
    });
  }

  function comparable(p) {
    return JSON.stringify({tipo:p.tipo,data:p.data,descrizione:p.descrizione,key:p.key,righe:p.righe,treasury:p.detail?.treasury});
  }

  function freshPlan(plan) {
    const t = plan?.detail?.treasury;
    if (!t || typeof t.kind !== 'string') throw new Error('Piano Treasury non valido o non firmato dal modulo.');
    let fresh;
    if (t.kind === 'SETTLEMENT') fresh = planSettlement(plan.data,t.allocations.map(a=>({key:a.key,amount:money(a.cents)})),t.reference);
    else if (t.kind === 'ADVANCE') fresh = planAdvance(plan.data,t.parentKey,money(t.principalCents),t.reference,money(t.commissionCents || 0));
    else if (t.kind === 'REPAYMENT') fresh = planRepay(plan.data,t.loanRegId,money(t.principalCents),t.reference,money(t.interestCents || 0),t.additionalCost || {});
    else if (t.kind === 'SERVICE_INVOICE') {
      const s = t.serviceInvoice;
      fresh = planServiceInvoice({type:s.type,data:s.data,dueDate:s.dueDate,party:s.party,invoiceRef:s.invoiceRef,account:s.account,
        amount:money(s.netCents),vatRate:s.vatRate,centroCostoId:s.centroCostoId,economicNature:s.economicNature});
    } else throw new Error('Tipo di piano Treasury non riconosciuto.');
    if (comparable(plan) !== comparable(fresh)) throw new Error('Dati contabili o partite cambiati dopo l’anteprima: rigenerare il piano.');
    return fresh;
  }

  function post(plan) {
    if (!root.FI || typeof root.FI.post !== 'function') throw new Error('FI.post non disponibile.');
    const fresh = freshPlan(plan); // ricalcolo vincolante contro il giornale corrente, prima della scrittura atomica
    const reg = root.FI.post(fresh);
    // Solo campi SD/MM derivati dalla contabilità, dopo il commit atomico di FI.
    syncDocs();
    return reg;
  }

  function isSettledSource(regId, rowIndex) {
    const key = sourceKey(regId,rowIndex);
    const built = build();
    const src = built.byKey.get(key);
    return !!src && src.remainingCents < src.originalCents;
  }

  function assertCanReverse(regId) {
    const reg = state().registrazioni.find(r => String(r.id) === String(regId));
    if (!reg) return true;
    if (sourceUsed(regId)) throw new Error('Storno bloccato: la fonte ha regolamenti parziali/totali, un anticipo bancario attivo o IVA aggregata già compensata. Correggi con un movimento Treasury dedicato; nessun residuo verrà riallocato automaticamente.');
    const active = build();
    const regulated = [];
    reg.righe.forEach((line,i) => {
      const key = sourceKey(reg.id,i), s = active.byKey.get(key);
      if (s && s.remainingCents < s.originalCents) regulated.push({key,amount:money(s.originalCents-s.remainingCents)});
    });
    if (regulated.length) throw new Error('Storno bloccato: la scrittura sorgente ha partite già regolate ('+regulated.map(x=>x.key+' €'+x.amount.toFixed(2)).join(', ')+'). Stornare prima i regolamenti collegati.');
    return true;
  }

  function history(cutoff) {
    const regs = (state().registrazioni || []).filter(r => (!cutoff || r.data <= cutoff) && treasuryMeta(r));
    return regs.map(r => {
      const t = treasuryMeta(r);
      const reversed = registrationIsReversed(r,cutoff);
      const description = r.descrizione || r.tipo || 'Movimento Treasury';
      return {regId:r.id,date:r.data,type:t.kind,description,reference:t.reference || '',reversed,
        direction:t.direction || (t.kind === 'ADVANCE' ? 'IN (debito finanziario)' : t.kind === 'REPAYMENT' ? 'OUT' : ''),
        amount:money(t.totalCents ?? t.principalCents ?? t.serviceInvoice?.totalCents ?? 0),allocations:(t.allocations || []).map(a=>({key:a.key,cents:a.cents,amount:money(a.cents)})),
        principal:money(t.principalCents || 0),commission:money(t.commissionCents || 0),interest:money(t.interestCents || 0)};
    });
  }

  function settlementEventsFor(built, source, cutoff) {
    const events = [];
    (state().registrazioni || []).forEach(reg => {
      if ((cutoff && reg.data > cutoff) || reg?.fi?.stornoDi || registrationIsReversed(reg,cutoff)) return;
      const t = treasuryMeta(reg);
      if (t?.allocations) t.allocations.forEach(a => { if (String(a.key) === String(source.key)) events.push(reg.data); });
      const o = reg.origineSD || {};
      if ((o.tipo === 'INC' && source.account === '11' && source.sourceReg?.origineSD?.tipo === 'FATT' ||
           o.tipo === 'PAG' && source.account === '20' && source.sourceReg?.origineSD?.tipo === 'MIRO') &&
          String(o.id) === String(source.sourceReg?.origineSD?.id)) events.push(reg.data);
    });
    return events.sort();
  }

  function syncDocs(cutoff = currentCutoff()) {
    const sd = state().sdmm;
    if (!sd) return {updated:0};
    parseDay(cutoff);
    const built = build(cutoff);
    let updated = 0;
    (sd.fatture || []).forEach(f => {
      const sourceReg = state().registrazioni.find(r => r.origineSD?.tipo === 'FATT' && String(r.origineSD.id) === String(f.id));
      // Un flag legacy senza scrittura sorgente resta intatto e viene segnalato, non inventato.
      if (!sourceReg || sourceReg.data > cutoff) return;
      if (registrationIsReversed(sourceReg,cutoff)) {
        if (f.incasso?.derivedFromLedger) { delete f.incasso; updated++; }
        return;
      }
      const parts = built.sources.filter(x => x.sourceReg?.id === sourceReg.id && x.account === '11' && x.side === 'DARE');
      if (!parts.length) { if (f.incasso?.derivedFromLedger) { delete f.incasso; updated++; } return; }
      const outstanding = parts.reduce((s,x)=>s+x.remainingCents,0);
      const original = parts.reduce((s,x)=>s+x.originalCents,0);
      if (original > 0 && outstanding === 0) {
        const dates = parts.flatMap(x=>settlementEventsFor(built,x,cutoff));
        const lastDate = dates.sort().at(-1) || f.incasso?.data || sourceReg.data;
        if (!f.incasso || (f.incasso.derivedFromLedger && f.incasso.data !== lastDate)) { f.incasso = {data:lastDate,derivedFromLedger:true}; updated++; }
      } else if (f.incasso?.derivedFromLedger) {
        // Il vecchio flag poteva indicare un pagamento totale prima del modulo Treasury.
        // Non conservare come incassata una fattura con residuo positivo.
        delete f.incasso; updated++;
      }
    });
    (sd.miro || []).forEach(m => {
      const sourceReg = state().registrazioni.find(r => r.origineSD?.tipo === 'MIRO' && String(r.origineSD.id) === String(m.id));
      if (!sourceReg || sourceReg.data > cutoff) return;
      if (registrationIsReversed(sourceReg,cutoff)) {
        if (m.pagamento?.derivedFromLedger) { delete m.pagamento; updated++; }
        return;
      }
      const parts = built.sources.filter(x => x.sourceReg?.id === sourceReg.id && x.account === '20' && x.side === 'AVERE');
      if (!parts.length) { if (m.pagamento?.derivedFromLedger) { delete m.pagamento; updated++; } return; }
      const outstanding = parts.reduce((s,x)=>s+x.remainingCents,0);
      const original = parts.reduce((s,x)=>s+x.originalCents,0);
      if (original > 0 && outstanding === 0) {
        const dates = parts.flatMap(x=>settlementEventsFor(built,x,cutoff));
        const lastDate = dates.sort().at(-1) || m.pagamento?.data || sourceReg.data;
        if (!m.pagamento || (m.pagamento.derivedFromLedger && m.pagamento.data !== lastDate)) { m.pagamento = {data:lastDate,derivedFromLedger:true}; updated++; }
      } else if (m.pagamento?.derivedFromLedger) { delete m.pagamento; updated++; }
    });
    return {updated};
  }

  function bankLedgerBalance(data) {
    let balance=0;
    if(root.FI&&typeof root.FI.opening==='function')root.FI.opening().forEach(r=>{
      if(String(r.conto)==='10')balance+=(r.dareAvere==='DARE'?1:-1)*cents(r.importo);
    });
    (state().registrazioni||[]).filter(r=>r.data<=data&&!isAnnualTechnical(r)).forEach(r=>(r.righe||[]).forEach(line=>{
      if(String(line.conto)==='10')balance+=(line.dareAvere==='DARE'?1:-1)*cents(line.importo);
    }));
    return balance;
  }

  function cashAvailableCents(data) {
    parseDay(data);
    const atDate = bankLedgerBalance(data);
    let running = atDate, min = atDate;
    const future = new Map();
    (state().registrazioni || []).filter(r => r.data > data && !isClosing(r)).forEach(r => {
      (r.righe || []).forEach(line => {
        if (String(line.conto) !== '10') return;
        const delta = (line.dareAvere === 'DARE' ? 1 : -1) * cents(line.importo);
        future.set(r.data,(future.get(r.data) || 0) + delta);
      });
    });
    for (const [d,delta] of [...future.entries()].sort((a,b)=>a[0].localeCompare(b[0]))) {
      running += delta; min = Math.min(min,running);
    }
    return min;
  }

  function cashAvailable(data = today(), required = 0) {
    const availableCents = cashAvailableCents(data);
    const requestedCents = cents(required);
    return {data,available:money(availableCents),availableCents,required:money(requestedCents),requiredCents:requestedCents,
      sufficiente:availableCents >= requestedCents};
  }

  function checkBankAfterPayment(data, proposedCents) {
    if (!proposedCents) throw new Error('Pagamento netto nullo.');
    if (!accountExists('10')) throw new Error('Conto 10 Banca non presente nel piano dei conti.');
    const available = cashAvailableCents(data);
    if (available < proposedCents) {
      const atDate = bankLedgerBalance(data);
      if (atDate < proposedCents) throw new Error('Saldo banca insufficiente alla data del pagamento. Saldo disponibile '+euro(atDate/100)+'.');
      throw new Error('Pagamento bloccato: renderebbe negativo il saldo banca considerando i movimenti futuri già registrati. Disponibile '+euro(available/100)+'.');
    }
  }

  function advanceAvailableCents(partitaKey, cutoff) {
    return activeAdvanceCents(partitaKey,cutoff);
  }

  function sourceUsed(regId) {
    const reg = state().registrazioni.find(r => String(r.id) === String(regId));
    if (!reg || !Array.isArray(reg.righe) || isAnnualTechnical(reg)) return false;
    const built = build();
    if (treasuryMeta(reg)?.kind === 'ADVANCE') {
      const loan = outstandingLoan(reg.id);
      if (loan && loan.remainingCents > 0) return true;
    }
    const hasVatLine=reg.righe.some(line=>String(line.conto)==='28');
    if(hasVatLine) {
      const laterVat=(state().registrazioni||[]).some(r=>String(r.id)!==String(reg.id)&&r.data>=reg.data&&!isAnnualTechnical(r)&&
        !r?.fi?.stornoDi&&(r.righe||[]).some(line=>String(line.conto)==='28'));
      const netVatSettled=(state().registrazioni||[]).some(r=>!r?.fi?.stornoDi&&!registrationIsReversed(r)&&
        treasuryMeta(r)?.allocations?.some(a=>String(a.key)==='gl:28'));
      if(laterVat||netVatSettled)return true; // la posizione bilaterale è già stata compensata/liquidata in aggregato
    }
    return reg.righe.some((line,index) => {
      const s = built.byKey.get(sourceKey(reg.id,index));
      if (!s) return false;
      if (s.remainingCents < s.originalCents) return true;
      return s.account === '11' && advanceAvailableCents(s.key) > 0;
    });
  }

  function renderPlan(plan) {
    const box = document.getElementById('treasury-preview');
    if (!box) return;
    const rows = plan.righe.map(r=>`<tr><td>${esc(r.conto+' — '+accountName(r.conto))}</td><td>${r.dareAvere==='DARE'?esc(euro(r.importo)):''}</td><td>${r.dareAvere==='AVERE'?esc(euro(r.importo)):''}</td></tr>`).join('');
    box.innerHTML = `<div class="riquadro" style="border-color:var(--oro)"><h3>Anteprima — ${esc(plan.descrizione)}</h3><p>${esc(plan.data)} · chiave ${esc(plan.key)}</p><table class="registro"><thead><tr><th>Conto</th><th>Dare</th><th>Avere</th></tr></thead><tbody>${rows}</tbody></table><button class="azione" onclick="Treasury.uiConfirm()">Conferma nel Libro Giornale</button> <button class="azione secondaria" onclick="Treasury.uiCancel()">Annulla anteprima</button></div>`;
    box.scrollIntoView?.({block:'nearest'});
  }

  function showError(error) {
    const message = error?.message || String(error);
    const node = document.getElementById('treasury-error');
    if (node) node.textContent = message;
    if (typeof root.mostraToast === 'function') root.mostraToast('⚠️ '+message,true);
    return null;
  }

  function attempt(fn) {
    try { const value=fn(); const node=document.getElementById('treasury-error'); if(node)node.textContent=''; return value; }
    catch (e) { return showError(e); }
  }

  function value(id) { return document.getElementById(id)?.value ?? ''; }

  function uiSelectedAllocations() {
    return [...document.querySelectorAll('#treasury-module .tr-alloc')]
      .map(el=>({key:el.dataset.key,amount:el.value}))
      .filter(x=>String(x.amount).trim() !== '' && Number(x.amount) > 0);
  }

  function uiPreviewSettlement() {
    return attempt(()=>{
      const p=planSettlement(value('tr-data'),uiSelectedAllocations(),value('tr-ref'));
      pending=p;renderPlan(p);return p;
    });
  }

  function uiConfirm() {
    if (!pending) return showError(new Error('Nessuna anteprima da confermare.'));
    return attempt(()=>{
      const committed=post(pending);pending=null;
      if (typeof root.mostraToast === 'function') root.mostraToast('✓ '+committed.descrizione,false);
      render();return committed;
    });
  }

  function uiCancel() { pending=null;const p=document.getElementById('treasury-preview');if(p)p.innerHTML=''; }

  function uiPreviewAdvance() {
    return attempt(()=>{
      const p=planAdvance(value('tr-adv-data'),value('tr-adv-key'),value('tr-adv-amount'),value('tr-adv-ref'),value('tr-adv-fee'));
      pending=p;renderPlan(p);return p;
    });
  }

  function uiPreviewRepay() {
    return attempt(()=>{
      const p=planRepay(value('tr-rep-data'),value('tr-rep-loan'),value('tr-rep-amount'),value('tr-rep-ref'),value('tr-rep-interest'),{newCostConfirmed:document.getElementById('tr-rep-new-cost')?.checked===true,costDocument:value('tr-rep-cost-document'),costReason:value('tr-rep-cost-reason')});
      pending=p;renderPlan(p);return p;
    });
  }

  function uiPreviewService() {
    return attempt(()=>{
      const p=planServiceInvoice({type:value('tr-svc-type'),data:value('tr-svc-data'),dueDate:value('tr-svc-due'),party:value('tr-svc-party'),
        invoiceRef:value('tr-svc-invoice'),account:value('tr-svc-account'),amount:value('tr-svc-amount'),vatRate:value('tr-svc-vat'),centroCostoId:value('tr-svc-cc'),economicNature:value('tr-svc-nature')});
      pending=p;renderPlan(p);return p;
    });
  }

  function displayDate(value) { return value || '—'; }

  function setCutoff(data) {
    parseDay(data);
    viewCutoff = data;
    return viewCutoff;
  }

  function resetCutoff() { viewCutoff = null; render(); return defaultCutoff(); }

  function updateCutoff() {
    return attempt(() => {
      setCutoff(value('tr-cutoff'));
      render();
      return viewCutoff;
    });
  }

  function render() {
    init();
    const asOf = currentCutoff();
    // Consultare una data storica non riscrive i flag dei documenti.
    syncDocs(defaultCutoff());
    const host = document.getElementById('fi-body');
    if (!host) return '';
    let container = document.getElementById('treasury-module');
    if (!container) {
      container=document.createElement('div');container.id='treasury-module';host.appendChild(container);
    }
    const built=build(asOf), open=built.open.slice().sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))||String(a.key).localeCompare(String(b.key)));
    const reconcile=built.reconciliation;
    const diagnostics=built.anomalies;
    const customerItems=open.filter(x=>x.conto==='11'&&x.advanceEligible);
    const advanceOpts=customerItems.map(x=>{
      const available=Math.max(0,x.remainingCents-advanceAvailableCents(x.key,asOf));
      return available?`<option value="${esc(x.key)}">${esc(x.party||x.description)} · ${esc(x.key)} · anticipabile ${esc(euro(available/100))}</option>`:'';
    }).filter(Boolean).join('');
    const loans=open.filter(x=>x.conto==='36'&&x.kind==='loan');
    const loanOpts=loans.map(x=>`<option value="${esc(x.regId)}">Anticipo n° ${esc(x.regId)} · ${esc(x.descrizione)} · residuo ${esc(euro(x.residuo))}</option>`).join('');
    const accountOptions=['acquisto','vendita'].map(type=>serviceAccounts(type).map(c=>`<option value="${esc(c.codice)}">${esc(c.codice+' — '+c.nome)}</option>`).join(''));
    const serviceCostOptions=accountOptions[0], serviceRevenueOptions=accountOptions[1];
    const centerOptions=(state().centriDiCosto||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('');
    const itemsHtml=open.length?`<table class="registro"><thead><tr><th>Scadenza</th><th>Origine / controparte</th><th>Conto</th><th class="num">Importo originario</th><th class="num">Residuo</th><th class="num">Allocazione (€)</th><th>Stato</th></tr></thead><tbody>${open.map(x=>{
      const doc=x.party?esc(x.party+' · '):'';
      const available=x.settlementAllowed?`<input class="tr-alloc cifre" type="number" min="0" step="0.01" placeholder="—" data-key="${esc(x.key)}" aria-label="Allocazione ${esc(x.key)}">`:'—';
      return `<tr><td>${esc(displayDate(x.dueDate))}</td><td>${doc}${esc(x.descrizione)}<br><small class="aiuto">${esc(x.key)}</small></td><td>${esc(x.conto+' — '+x.accountName)}</td><td class="num cifre">${esc(euro(x.importoOriginale))}</td><td class="num cifre">${esc(euro(x.residuo))}</td><td class="num">${available}</td><td>${x.opening?'<span class="badge no">iniziale aggregata</span>':x.anomaly?'<span class="badge no">anomalia / non documento</span>':x.conto==='36'?'<span class="badge ok">rimborso dedicato</span>':x.conto==='28'&&x.side==='DARE'?'<span class="badge no">IVA non liquidabile</span>':'<span class="badge ok">aperta</span>'}</td></tr>`;
    }).join('')}</tbody></table>`:'<p class="vuoto">Nessuna partita aperta alla data di consultazione selezionata.</p>';
    const future=(state().registrazioni||[]).filter(r=>r.data>asOf&&!isAnnualTechnical(r)&&r.righe?.some(x=>['11','20'].includes(String(x.conto))));
    const sd=state().sdmm||{};
    const unposted=[...(sd.fatture||[]).filter(f=>!(state().registrazioni||[]).some(r=>r.origineSD?.tipo==='FATT'&&String(r.origineSD.id)===String(f.id))).map(f=>({kind:'FATT',id:f.id,date:f.data,flag:!!f.incasso})),...(sd.miro||[]).filter(m=>!(state().registrazioni||[]).some(r=>r.origineSD?.tipo==='MIRO'&&String(r.origineSD.id)===String(m.id))).map(m=>({kind:'MIRO',id:m.id,date:m.data,flag:!!m.pagamento}))];
    const sourceNotice=`<div id="tr-source-status" class="op-guidance"><b>${viewCutoff?'Filtro data esplicito attivo':'Consultazione automatica: oggi / ultima data del giornale'}</b><p>Le partite dipendono dalla data fattura, non dalla scadenza: puoi regolare anche prima della scadenza, a partire dalla data fattura.</p>${future.length?`<p>${future.length} scrittura/e clienti-fornitori successive al filtro non sono incluse. Usa «Ultima data / automatico» per consultarle.</p>`:''}${unposted.length?`<p>Documenti senza scrittura collegata: ${unposted.map(d=>esc(d.kind+' '+d.id+' ('+d.date+')'+(d.flag?' — flag legacy di regolamento da verificare':' — bozza / collegamento assente'))).join('; ')}. Non generano partite. Nessuna contabilizzazione automatica e nessun abbinamento per importo o descrizione. Se il documento è una bozza, rilascialo esplicitamente da SD/MM; se la scrittura esiste senza origineSD, verifica il backup prima di registrarlo nuovamente.</p><button class="azione secondaria" onclick="cambiaVista('sdmm');SDMM.vai('fatt')">Verifica fatture vendita SD</button> <button class="azione secondaria" onclick="cambiaVista('sdmm');SDMM.vai('miro')">Verifica fatture ferro MM</button>`:''}</div>`;
    const warnings=diagnostics.length?`<div class="riquadro" style="border-color:var(--rosso);background:rgba(156,59,59,.05)"><h3>Anomalie di riconciliazione — nessun abbinamento FIFO eseguito</h3><ul>${diagnostics.map(x=>`<li>${esc(x.message)}</li>`).join('')}</ul></div>`:'';
    const ledgerHistory=[
      ...history(asOf).map(x=>({date:x.date,description:x.description,reference:x.reference,type:x.type,amount:x.amount,reversed:x.reversed})),
      ...(state().registrazioni||[]).filter(r=>r.data<=asOf&&['INC','PAG'].includes(r.origineSD?.tipo)).map(r=>({date:r.data,description:r.descrizione,reference:(r.origineSD.tipo+' '+r.origineSD.id),type:'LEGACY '+r.origineSD.tipo,
        amount:(r.righe||[]).filter(x=>String(x.conto)==='10').reduce((s,x)=>s+x.importo,0),reversed:registrationIsReversed(r)}))
    ].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const histHtml=ledgerHistory.length?`<table class="registro"><thead><tr><th>Data</th><th>Movimento</th><th>Riferimento</th><th class="num">Importo</th><th>Stato</th></tr></thead><tbody>${ledgerHistory.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.description)}</td><td>${esc(x.reference)}</td><td class="num cifre">${esc(euro(x.amount))}</td><td>${x.reversed?'<span class="badge no">stornato</span>':'<span class="badge ok">registrato</span>'}</td></tr>`).join('')}</tbody></table>`:'<p class="vuoto">Nessun incasso, pagamento, anticipo o rimborso Treasury registrato.</p>';
    const vatInfo='IVA fattura su 14 a credito / 21 a debito; il netto transita sul 28 soltanto con LIQUIDAZIONE_IVA. Nessuna partita di pagamento/incasso viene generata direttamente da 14/21.';
    container.innerHTML=`<div class="riquadro" style="border-top:3px solid var(--oro)"><h2 style="margin:0 0 6px">Treasury — incassi, pagamenti e anticipi bancari</h2><p class="aiuto">Partite aperte derivate dal Libro Giornale. Ogni allocazione è riferita a una riga sorgente esplicita (regId|rowIndex); niente FIFO. Anticipo bancario: entra liquidità e nasce 36, ma il credito cliente 11 resta aperto.</p>
      <div class="riga-campi"><div class="campo"><label for="tr-cutoff">Data di consultazione partite</label><input id="tr-cutoff" type="date" value="${esc(asOf)}"></div><div class="campo"><label>&nbsp;</label><button class="azione secondaria" onclick="Treasury.updateCutoff()">Aggiorna partite alla data</button> <button class="azione secondaria" onclick="Treasury.resetCutoff()">Ultima data / automatico</button></div></div>${sourceNotice}
      <div id="treasury-error" role="alert" style="color:var(--rosso);font-weight:bold"></div>${warnings}
      <div class="stat-riga"><div class="stat"><div class="label">Riconciliazione clienti (G/L 11 − aperto)</div><div class="valore cifre">${esc(euro(reconcile.diff11/100))}</div></div><div class="stat"><div class="label">Riconciliazione fornitori (saldo debito 20 − aperto)</div><div class="valore cifre">${esc(euro(reconcile.diff20/100))}</div></div><div class="stat"><div class="label">Cassa disponibile considerando impegni futuri</div><div class="valore cifre">${esc(euro(cashAvailableCents(asOf)/100))}</div></div></div>
      <details class="riquadro" open><summary><b>1 · Partite aperte — origine, scadenza e residuo</b></summary>${itemsHtml}<div class="riga-campi"><div class="campo"><label>Data regolamento</label><input id="tr-data" type="date" value="${esc(asOf)}"></div><div class="campo"><label>Riferimento univoco regolamento</label><input id="tr-ref" type="text" placeholder="es. bonifico-cliente-2026-001"></div></div><button class="azione" onclick="Treasury.uiPreviewSettlement()">Anteprima regolamento selezionato</button><div id="treasury-preview"></div><p class="aiuto">Per ora il modulo non mescola incassi e pagamenti nella stessa scrittura. Gli importi sono parziali e multipli; importi zero, eccedenze, partite future, riferimenti duplicati e saldo banca insufficiente sono bloccati.</p></details>
      <details class="riquadro"><summary><b>2 · Anticipo bancario su fattura cliente</b></summary><p class="aiuto">Non riduce né cancella il credito 11: Dare 10 al netto commissioni, Dare 55 commissioni, Avere 36 anticipo bancario. Ammesso solo su fattura cliente FATT o fattura servizi vendita documentata; limite = residuo fattura meno anticipi non rimborsati.</p><div class="campo"><label>Fattura cliente documentata</label><select id="tr-adv-key"><option value="">— seleziona fattura —</option>${advanceOpts}</select></div><div class="riga-campi"><div class="campo"><label>Data anticipo</label><input id="tr-adv-data" type="date" value="${esc(asOf)}"></div><div class="campo"><label>Anticipo lordo (€)</label><input id="tr-adv-amount" type="number" min="0" step="0.01"></div><div class="campo"><label>Commissione bancaria (€)</label><input id="tr-adv-fee" type="number" min="0" step="0.01" value="0"></div><div class="campo"><label>Riferimento univoco</label><input id="tr-adv-ref" type="text"></div></div><button class="azione" onclick="Treasury.uiPreviewAdvance()">Anteprima anticipo bancario</button><p class="aiuto">L'anticipo non è un incasso della fattura. Successivamente il cliente versa su 11; il rimborso del debito 36 è una funzione separata.</p></details>
      <details class="riquadro"><summary><b>3 · Rimborso anticipo e interessi</b></summary><div class="campo"><label>Anticipo bancario aperto</label><select id="tr-rep-loan"><option value="">— seleziona anticipo —</option>${loanOpts}</select></div><div class="riga-campi"><div class="campo"><label>Data rimborso</label><input id="tr-rep-data" type="date" value="${esc(asOf)}"></div><div class="campo"><label>Capitale rimborsato (€)</label><input id="tr-rep-amount" type="number" min="0" step="0.01"></div><div class="campo"><label>Ulteriori costi NUOVI, non già contabilizzati (€)</label><input id="tr-rep-interest" type="number" min="0" step="0.01" value="0"></div><div class="campo"><label>Riferimento univoco</label><input id="tr-rep-ref" type="text"></div></div><div class="riquadro"><label><input id="tr-rep-new-cost" type="checkbox"> Confermo che gli eventuali oneri sono ulteriori costi non già contabilizzati (non le commissioni dell’anticipo)</label><div class="riga-campi"><div class="campo"><label>Documento univoco dei nuovi oneri</label><input id="tr-rep-cost-document"></div><div class="campo"><label>Motivazione nuovi costi</label><input id="tr-rep-cost-reason"></div></div><p class="aiuto">Normalmente lascia 0: rimborso capitale = Dare 36 / Avere 10. Le commissioni iniziali restano già rilevate e NON vanno ripetute. Il controllo sul documento evita riutilizzi; non può verificare documenti esterni mai identificati nel backup.</p></div><button class="azione" onclick="Treasury.uiPreviewRepay()">Anteprima rimborso capitale (D36 C10)</button><p class="aiuto">Rimborso collegato a uno specifico anticipo, entro il capitale residuo; il saldo banca deve restare non negativo anche rispetto agli esborsi futuri già registrati.</p></details>
      <details class="riquadro"><summary><b>4 · Fattura servizi dedicata — acquisto o vendita</b></summary><p class="aiuto">${esc(vatInfo)} La registrazione genera una partita 20 per acquisto o 11 per vendita e conserva la scadenza per regolamenti parziali.</p><div class="riga-campi"><div class="campo"><label>Tipo</label><select id="tr-svc-type"><option value="acquisto">Acquisto servizi</option><option value="vendita">Vendita servizi</option></select></div><div class="campo"><label>Natura prestazione venduta (CE, non nome conto)</label><select id="tr-svc-nature"><option value="ORDINARY">Ordinaria attività — A1</option><option value="ACCESSORY">Accessoria — A5</option></select></div><div class="campo"><label>Data fattura</label><input id="tr-svc-data" type="date" value="${esc(asOf)}"></div><div class="campo"><label>Scadenza</label><input id="tr-svc-due" type="date" value="${esc(plusDays(asOf,30))}"></div></div><div class="riga-campi"><div class="campo"><label>Fornitore / cliente</label><input id="tr-svc-party" type="text"></div><div class="campo"><label>Numero fattura / riferimento</label><input id="tr-svc-invoice" type="text"></div></div><div class="riga-campi"><div class="campo"><label>Conto COSTO/RICAVO servizi (51/54/55/56/61 e interni esclusi; 52 ammesso; vendita su 42, non merci 40)</label><select id="tr-svc-account"><optgroup label="Costi acquisto">${serviceCostOptions}</optgroup><optgroup label="Ricavi vendita">${serviceRevenueOptions}</optgroup></select></div><div class="campo"><label>Imponibile (€)</label><input id="tr-svc-amount" type="number" min="0" step="0.01"></div><div class="campo"><label>IVA (%)</label><input id="tr-svc-vat" type="number" min="0" step="0.01" value="${esc(state().budgetAnnuo?.aliquotaIva ?? 22)}"></div></div><div class="riga-campi"><div class="campo"><label>Centro di costo (obbligatorio se conto 52 acquisto)</label><select id="tr-svc-cc"><option value="">— nessuno —</option>${centerOptions}</select></div></div><button class="azione" onclick="Treasury.uiPreviewService()">Anteprima fattura servizi</button><p class="aiuto">Acquisto: Dare conto costo + IVA / Avere 20. Vendita: Dare 11 / Avere conto ricavo + IVA. Acconti commerciali 19/37 non gestiti dal modulo: non sono un anticipo bancario e richiederebbero un processo IVA e di abbinamento separato.</p></details>
      <details class="riquadro"><summary><b>5 · Cronologia Treasury — ogni movimento parziale e multiplo</b></summary>${histHtml}</details>
      </div>`;
    const svcType=document.getElementById('tr-svc-type'), svcAccount=document.getElementById('tr-svc-account');
    if(svcType&&svcAccount){
      const chooseAccount=(event)=>{
        svcAccount.innerHTML=svcType.value==='acquisto'?serviceCostOptions:serviceRevenueOptions;
        const module=svcType.value==='acquisto'?'ap':'ar';
        if(event&&root.FIModules&&['ar','ap'].includes(root.FIModules.active)&&root.FIModules.active!==module)root.FIModules.go(module);
      };
      svcType.addEventListener('change',chooseAccount);chooseAccount();
    }
    return container.innerHTML;
  }

  function previewSettlementDefault(kind,id,data) {
    const k=String(kind||'').toUpperCase();
    if (!['INC','PAG'].includes(k)) throw new Error('Tipo SD/MM non supportato: '+k+'.');
    const d=data || today();
    dateCheck(d);
    const originKind=k==='INC'?'FATT':'MIRO';
    const sourceRegs=state().registrazioni.filter(r=>r.origineSD?.tipo===originKind&&String(r.origineSD.id)===String(id));
    if (!sourceRegs.length) throw new Error('Fattura SD/MM non contabilizzata: nessuna partita sorgente nel giornale.');
    const all=build(d).open;
    const selected=all.filter(x=>sourceRegs.some(r=>String(r.id)===String(x.sourceRegId)) && x.settlementAllowed);
    if (!selected.length) throw new Error('Nessun residuo aperto regolabile per la fattura '+id+'.');
    const base='SD-'+k+'-'+String(id)+'-'+d;
    let ref=base,seq=2;
    while(state().registrazioni.some(r=>r?.fi?.key===settlementKey(ref))) ref=base+'-'+seq++;
    const p=planSettlement(d,selected.map(x=>({key:x.key,amount:x.residuo})),ref);
    pending=p;
    return p;
  }

  function openSD(kind,id,data) {
    try {
      const d=data || currentCutoff();
      setCutoff(d);
      if (typeof root.cambiaVista === 'function') root.cambiaVista('fi');
      render();
      if(window.FIModules)FIModules.go(String(kind).toUpperCase()==='INC'?'ar':'ap');
      const sourceKind=String(kind).toUpperCase()==='INC'?'FATT':'MIRO';
      const sourceRegs=state().registrazioni.filter(r=>r.origineSD?.tipo===sourceKind&&String(r.origineSD.id)===String(id));
      if(!sourceRegs.length)throw Error('Fattura SD/MM non contabilizzata: nessuna partita sorgente nel giornale.');
      const selected=items(d).filter(x=>sourceRegs.some(r=>String(r.id)===String(x.sourceRegId))&&x.settlementAllowed);
      if(!selected.length)throw Error('Nessun residuo aperto alla data: controlla data fattura e regolamenti.');
      const base='SD-'+String(kind).toUpperCase()+'-'+String(id)+'-'+d;let ref=base,seq=2;
      while(state().registrazioni.some(r=>r.fi?.key===settlementKey(ref)))ref=base+'-'+seq++;
      const date=document.getElementById('tr-data'), reference=document.getElementById('tr-ref');
      if(date)date.value=d;if(reference)reference.value=ref;
      document.querySelectorAll('#treasury-module .tr-alloc').forEach(el=>{
        const a=selected.find(x=>String(x.key)===String(el.dataset.key));
        if(a)el.value=a.residuo.toFixed(2);
      });
      // Selezione, NON anteprima automatica totale: consente subito un pagamento parziale,
      // anche quando la banca non copre l'intero debito. I vincoli si valutano all'anteprima.
      pending=null;
      document.getElementById('tr-data')?.scrollIntoView({block:'center'});
      if(typeof root.mostraToast==='function')root.mostraToast('Fattura selezionata: modifica Allocazione per il parziale, poi Anteprima e Conferma.');
      return {selected,reference:ref,date:d};
    } catch(e) { showError(e); return null; }
  }

  function uiConfirmSettlement() { return uiConfirm(); }

  const Treasury = {
    init, render, items, reconciliation, reconcile:reconciliation, diagnostics, history, syncDocs,
    planSettlement, planAdvance, planRepay, planServiceInvoice, post,
    sourceUsed, isSettledSource, assertCanReverse, cashAvailable, setAnnualSnapshotProvider,
    previewSettlementDefault, openSD, setCutoff, resetCutoff, updateCutoff, uiPreviewSettlement, uiConfirmSettlement,
    uiPreviewAdvance, uiPreviewRepay, uiPreviewService, uiConfirm, uiCancel,
    getSource: (key,cutoff)=>{ const x=getSource(key,cutoff); return x?toPublicItem(x):null; },
    advanceAvailable: (key,cutoff)=>money(Math.max(0,(getSource(key,cutoff)?.remainingCents||0)-advanceAvailableCents(key,cutoff)))
  };

  root.Treasury = Treasury;
  if(root.FI&&typeof root.FI.init==='function'&&!root.FI.init.__treasuryAccounts) {
    const baseInit=root.FI.init;
    const wrappedInit=function(s){const result=baseInit.call(root.FI,s);init(s||state());return result;};
    wrappedInit.__treasuryAccounts=true;
    root.FI.init=wrappedInit;
  }
  init();
})(typeof window !== 'undefined' ? window : globalThis);
