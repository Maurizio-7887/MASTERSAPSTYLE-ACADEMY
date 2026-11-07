/* MASTERSAPSTYLE — cockpit mensile FI/CO/PP/MM: chiusura guidata e snapshot.
 * Chiusura gestionale didattica distinta dalla chiusura fiscale/annuale FI.
 * Non genera nuove righe contabili; verifica dati originari e sigilla il periodo.
 */
window.MONTH_CLOSE = (function () {
  'use strict';
  var L=window.LabMotore, r2=L.r2;
  function validPeriod(per){
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(per||''))) throw Error('Periodo obbligatorio nel formato AAAA-MM (mese 01–12).');
    return per;
  }
  function state(){ return window.SD4.N.S; }
  function inside(date,per){return String(date||'').slice(0,7)===per;}
  function recordSignature(S,per){
    // Identifica alterazioni post-chiusura senza includere la chiusura stessa.
    return JSON.stringify({
      docs:(S.registrazioni||[]).filter(function(x){return inside(x.data,per)}).map(function(x){return [x.id,x.data,x.tipo,x.rif,x.righe]}),
      mov:(S.movimenti||[]).filter(function(x){return inside(x.data,per)}).map(function(x){return [x.data,x.mat,x.qta,x.tipo,x.rif]}),
      ops:(S.produzione||[]).map(function(o){return [o.numero,o.teco,o.liquidazione,
          (o.eventi||[]).filter(function(x){return inside(x.data,per)}).map(function(x){return [x.tipo,x.data,x.kg,x.qta,x.ore,x.attrezzaggio,x.valore,x.stornato]})]}),
    });
  }
  function overview(per){
    validPeriod(per);
    var S=state(), doc=(S.registrazioni||[]).filter(function(x){return inside(x.data,per)}),
      mov=(S.movimenti||[]).filter(function(x){return inside(x.data,per)}),
      start=S.avviato||'', blockers=[], warnings=[], d=0,a=0,
      allowed=S.pianoDeiConti||[], accounts=new Set(allowed.map(function(x){return x.codice})),
      costo={},ricavo={}, byCentre={}, costsPerOrder={};
    if (!start) blockers.push('Avvia prima l’azienda in Dati di base.');
    if(start && per<start.slice(0,7)) blockers.push('Il mese precede la costituzione/avvio del caso.');
    var yearClose=(S.chiusure||{})[per.slice(0,4)];
    if(yearClose) blockers.push('L’esercizio è già chiuso annualmente.');
    doc.forEach(function(r){
      var rd=0,ra=0;
      (r.righe||[]).forEach(function(x){
        if(!accounts.has(x.conto))blockers.push('Documento '+r.numero+': conto '+x.conto+' inesistente.');
        var n=Number(x.importo);
        if(!Number.isFinite(n)||n<0){blockers.push('Documento '+r.numero+': importo non valido.');return;}
        if(x.dareAvere==='DARE'){d+=n;rd+=n;}else if(x.dareAvere==='AVERE'){a+=n;ra+=n;}else blockers.push('Documento '+r.numero+': indicatore Dare/Avere assente.');
        var account=allowed.find(function(z){return z.codice===x.conto});
        var signed=x.dareAvere==='DARE'?n:-n;
        if(account && account.tipo==='COSTO') costo[x.conto]=r2((costo[x.conto]||0)+signed);
        if(account && account.tipo==='RICAVO') ricavo[x.conto]=r2((ricavo[x.conto]||0)-signed);
        if(x.cdc)byCentre[x.cdc]=r2((byCentre[x.cdc]||0)+signed);
        if(x.partner && /^(PRELIEVO_261|ATTIVITA_|SOVRACCOSTI|LIQUIDAZIONE|CONFERMA_PRODUZIONE)/.test(r.tipo||'')){
          costsPerOrder[x.partner]=r2((costsPerOrder[x.partner]||0)+signed);
        }
      });
      if(Math.abs(r2(rd-ra))>.005) blockers.push('Documento '+r.numero+' non quadrato (Dare '+L.eur(rd)+' / Avere '+L.eur(ra)+').');
    });
    if(Math.abs(r2(d-a))>.005)blockers.push('Squilibrio FI nel mese: Dare '+L.eur(d)+' / Avere '+L.eur(a)+'.');
    var orders=(S.produzione||[]).filter(function(o){
      return o.data<=per+'-31' && ((o.eventi||[]).some(function(x){return inside(x.data,per)}) || (o.liquidazione&&inside(o.liquidazione.data,per)));
    }).map(function(o){
      var e=null,error='';
      try{e=window.PP4.effettivi(o);}catch(ex){error=ex.message;blockers.push('Ordine '+o.numero+': '+error);}
      if(!e)return {numero:o.numero,materiale:o.materiale,errore:error};
      var ev=(o.eventi||[]).filter(function(x){return !x.stornato});
      var has261=ev.some(function(x){return x.tipo==='261'});
      var hasConfirm=ev.some(function(x){return x.tipo==='CO11N'});
      var has101=ev.some(function(x){return x.tipo==='101'});
      var isFinal=e.entrati>=o.qta || !!o.teco;
      var inPeriod=ev.filter(function(x){return inside(x.data,per)});
      if((hasConfirm||has101)&&!has261)blockers.push('Ordine '+o.numero+': manca il prelievo 261.');
      if(has101&&!hasConfirm)blockers.push('Ordine '+o.numero+': manca la dichiarazione CO11N.');
      if(isFinal&&!o.liquidazione)blockers.push('Ordine '+o.numero+' completato/TECO: eseguire KKS2 e KO88.');
      if(o.liquidazione&&o.liquidazione.data>per+'-31')blockers.push('Ordine '+o.numero+': liquidazione successiva al mese da chiudere.');
      if(isFinal&&(!e.sovrDovuti||Math.abs(e.sovrDovuti.mat-e.sovrMat)>.005||Math.abs(e.sovrDovuti.prod-e.sovrProd)>.005))
        blockers.push('Ordine '+o.numero+': KGI2 non riconciliato con i sovraccosti dovuti.');
      var wip=r2(e.totale-e.accredito);
      if(!isFinal&&Math.abs(wip)>.005) warnings.push('Ordine '+o.numero+' in lavorazione: WIP analitico '+L.eur(wip)+' €, senza capitalizzazione FI automatica.');
      return {numero:o.numero,materiale:o.materiale,stato:window.PP4.stato(o),
        prelievo:e.mat,ore:e.lav+e.set,sovraccosti:e.sovrMat+e.sovrProd,
        totale:e.totale,accredito:e.accredito,wip:wip,liquidato:!!o.liquidazione,
        eventi:inPeriod.length};
    });
    var ml=(S.costing||{}).ml||[], mlClosed=ml.some(function(x){return x.periodo===per});
    var hasDifferences=(S.mlPD||[]).some(function(x){return inside(x.data,per)});
    if(hasDifferences&&!mlClosed)blockers.push('Differenze prezzo o varianze: eseguire CKMLCP / Material Ledger per il mese.');
    if(mov.some(function(x){return inside(x.data,per)&&((S.materiali||{})[x.mat]||{}).tipo==='HALB'}))
      warnings.push('Sono presenti movimenti HALB: la valorizzazione multilivello del Material Ledger del simulatore NON copre integralmente i semilavorati. Conservare differenze 61/63 e segnalarle nella riconciliazione.');
    if(!doc.length)warnings.push('Non ci sono scritture FI nel mese selezionato: verifica che siano state registrate paghe, fornitori, fatture e assestamenti pertinenti.');
    var payroll=(S.hr||{}).dipendenti||[];
    if(payroll.length&&!doc.some(function(r){return r.tipo==='PAGHE'}))
      warnings.push('Non risulta una contabilizzazione PAGHE nel mese: verifica cedolini, competenza ed eventuali motivi dell’assenza.');
    if(!Object.keys(byCentre).length)warnings.push('Nessun centro esplicito presente nelle righe del mese: per i costi indiretti può operare OKB9; controlla il report CO.');
    var centreRighe=[];
    try {
      var cpm=window.PC4.cpm;
      var data=cpm.effettivi(Number(per.slice(0,4)),Number(per.slice(5,7))).righe;
      centreRighe=data.filter(function(r){return inside(r.data,per)});
    }catch(ex){warnings.push('Ripartizione CdC non disponibile: '+ex.message);}
    var totals={dare:r2(d),avere:r2(a),
      costi:r2(Object.keys(costo).reduce(function(t,k){return t+costo[k]},0)),
      ricavi:r2(Object.keys(ricavo).reduce(function(t,k){return t+ricavo[k]},0))};
    var closure=(S.monthlyClosings||{})[per]||null;
    return {periodo:per,documenti:doc.length,movimenti:mov.length,ordini:orders,
      costi: costo,ricavi:ricavo,centri:centreRighe,
      totali:totals,blockers:blockers,warnings:warnings,
      mlClosed:mlClosed,hasDifferences:hasDifferences,
      closed:closure,integrity:!closure||closure.signature===recordSignature(S,per)};
  }
  function close(per,confirmation,reason){
    var S=state(), report=overview(per);
    if(report.closed)throw Error('Il periodo '+per+' è già stato chiuso.');
    if(report.blockers.length)throw Error('Chiusura impedita: '+report.blockers.join(' '));
    if(confirmation!=='CHIUDI '+per)throw Error('Scrivi esattamente CHIUDI '+per+' per confermare.');
    if(String(reason||'').trim().length<20)throw Error('Descrivi le verifiche svolte in almeno 20 caratteri.');
    S.monthlyClosings=S.monthlyClosings||{};
    S.monthlyClosings[per]={periodo:per,closedAt:new Date().toISOString(),
      reason:String(reason).trim(),signature:recordSignature(S,per),
      docCount:report.documenti,movementCount:report.movimenti,
      debits:report.totali.dare,credits:report.totali.avere,
      costs:report.totali.costi,revenues:report.totali.ricavi,
      openWip:report.ordini.filter(function(o){return o.stato!=='CLSD'&&o.wip}).map(function(o){return {ordine:o.numero,amount:o.wip}}),
      caveats:report.warnings.slice()};
    window.SD4.N.salva();
    return S.monthlyClosings[per];
  }
  function reopen(per,confirm,reason){
    var S=state();validPeriod(per);
    if(!((S.monthlyClosings||{})[per]))throw Error('Periodo non chiuso.');
    if(confirm!=='RIAPRI '+per)throw Error('Scrivi esattamente RIAPRI '+per+'.');
    if(String(reason||'').trim().length<20)throw Error('Motiva la riapertura in almeno 20 caratteri.');
    S.monthlyReopens=S.monthlyReopens||[];
    S.monthlyReopens.push({periodo:per,reason:String(reason).trim(),
      reopenedAt:new Date().toISOString(),oldClose:S.monthlyClosings[per]});
    delete S.monthlyClosings[per];
    window.SD4.N.salva();
  }
  return {overview:overview,close:close,reopen:reopen,validPeriod:validPeriod,
    recordSignature:recordSignature};
})();
