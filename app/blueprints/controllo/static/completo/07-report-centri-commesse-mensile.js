/* Generato da tools/split_simulatore.py (completo) — non modificare a mano: modifica sorgenti/ e rilancia. */
// ═══════════════════════════════════════════════════════════════════════
// REPORT CENTRI DI COSTO — standard vs reale
// ═══════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════
// REPORT CENTRI DI COSTO — standard vs reale, MENSILIZZATO. Confrontare il
// reale accumulato in un solo mese con lo standard dell'intero anno
// gonfierebbe artificialmente ogni varianza (sembra tutto "risparmiato"
// solo perché mancano 11/12 dei costi dell'anno) — qui si usa la STESSA
// mensilizzazione (pesi %) del Controllo Mensile, sia per il mese
// selezionato sia per il cumulato da inizio anno a quel mese.
// ═══════════════════════════════════════════════════════════════════════
function renderReportCentriCosto(){
  const box = document.getElementById('tab-centri-costo-report');
  if(!STATO.centriDiCosto.length){ box.innerHTML = '<p class="vuoto">Nessun centro di costo configurato.</p>'; return; }

  const meseIdx = parseInt(document.getElementById('cc-report-mese')?.value, 10) || 0;
  const pesi = STATO.budgetAnnuo.pesiMensili || Array(12).fill(100/12);
  const pesoMeseFrazione = (pesi[meseIdx]||0) / 100;
  const pesoYTDFrazione = pesi.slice(0, meseIdx+1).reduce((s,p) => s+(p||0), 0) / 100;
  const volumeAnnuo = STATO.budgetAnnuo.volumeAnnuoPianificato || 0;

  // Standard = costo assorbito dal VOLUME pianificato per il periodo (ore
  // standard di quel centro per il volume del mese, a tariffa standard) —
  // non il budget fisso mensilizzato per tempo: "Reale" qui è manodopera
  // assorbita dalla produzione (ore reali × tariffa), quindi lo standard
  // con cui confrontarla deve essere la STESSA cosa a volume pianificato,
  // altrimenti si confrontano due domande diverse (spesa fissa vs volume).
  const { perCentro: assorbitoMese } = calcolaVarianceCapacita(volumeAnnuo, pesoMeseFrazione);
  const { perCentro: assorbitoYTD } = calcolaVarianceCapacita(volumeAnnuo, pesoYTDFrazione);

  // Movimenti del pool: DARE = costi caricati, AVERE = costi attribuiti
  // alle commesse. Il “reale assorbito” è solo l'AVERE di 51/52: in questo
  // modo il nuovo caricamento non gonfia erroneamente il report.
  const realeMese = {}, realeYTD = {}, caricatoMese = {}, caricatoYTD = {}, allocatoMese = {}, allocatoYTD = {};
  STATO.registrazioni.forEach(reg => {
    if(!reg.data) return;
    const d = new Date(reg.data + 'T00:00:00');
    if(isNaN(d) || d.getFullYear() !== Number(document.getElementById('cc-report-anno')?.value || (STATO.fi.costituzione || oggiIso()).slice(0,4))) return;
    const m = d.getMonth();
    if(m > meseIdx) return;
    reg.righe.forEach(r => {
      if(!r.centroCostoId || !(['51','52'].includes(r.conto)||(r.conto==='75'&&r.poolConto))) return;
      const id = r.centroCostoId;
      if(r.dareAvere === 'DARE'&&r.conto!=='75'){
        caricatoYTD[id] = (caricatoYTD[id]||0) + r.importo;
        if(m === meseIdx) caricatoMese[id] = (caricatoMese[id]||0) + r.importo;
      }else{
        const segno=r.dareAvere==='AVERE'?1:-1;r={...r,importo:r.importo*segno};
        allocatoYTD[id] = (allocatoYTD[id]||0) + r.importo;
        realeYTD[id] = (realeYTD[id]||0) + r.importo;
        if(m === meseIdx){ allocatoMese[id] = (allocatoMese[id]||0) + r.importo; realeMese[id] = (realeMese[id]||0) + r.importo; }
      }
    });
  });

  const rigaConfronto = (standard, reale) => {
    const varianza = reale - standard;
    return `<td class="num cifre">${euro(standard)}</td><td class="num cifre">${euro(reale)}</td>
      <td class="num cifre" style="color:${varianza>0?'var(--rosso)':'var(--verde)'};font-weight:700">${varianza>0?'+':''}${euro(varianza)}</td>`;
  };
  const righe = STATO.centriDiCosto.map(c => {
    // Un centro "a lavorazione" (ha una riga nel ciclo, tipo Taglio/
    // Saldatura) si confronta a VOLUME: quanto avrebbe dovuto assorbire il
    // volume pianificato del periodo. Un centro SENZA riga nel ciclo (come
    // Spese Generali) non è mai legato al volume prodotto — il suo
    // standard corretto è invece il classico budget fisso spalmato per
    // TEMPO (annuo ÷ 12, pesato sui mesi come tutto il resto): è l'unico
    // caso in cui "spalmare per calendario" è la cosa giusta da fare,
    // perché il costo stesso è per calendario e non per volume.
    // L'annuo di riferimento è SEMPRE "Spese generali annue" del Budget
    // Annuo (non un campo separato sul centro): un solo numero da
    // compilare, che "🧹 Nuovo giro" azzera insieme a tutto il resto —
    // niente doppioni che sopravvivono al reset.
    const centroALavorazione = STATO.distintaBase.ciclo.some(r => r.centroCostoId === c.id);
    let standardMese, standardYTD;
    if(centroALavorazione){
      standardMese = assorbitoMese[c.id] ? assorbitoMese[c.id].costoAssorbitoPeriodo : 0;
      standardYTD = assorbitoYTD[c.id] ? assorbitoYTD[c.id].costoAssorbitoPeriodo : 0;
    }else{
      const annuoDiRiferimento = STATO.budgetAnnuo.speseGeneraliAnnue || 0;
      standardMese = annuoDiRiferimento * pesoMeseFrazione;
      standardYTD = annuoDiRiferimento * pesoYTDFrazione;
    }
    return `<tr><td>${c.nome}</td>
      ${rigaConfronto(standardMese, realeMese[c.id]||0)}
      ${rigaConfronto(standardYTD, realeYTD[c.id]||0)}
    </tr>`;
  }).join('');

  const righePool = STATO.centriDiCosto.map(c => {
    const residuoMese = (caricatoMese[c.id]||0) - (allocatoMese[c.id]||0);
    const residuoYTD = (caricatoYTD[c.id]||0) - (allocatoYTD[c.id]||0);
    return `<tr><td>${c.nome}</td><td class="num cifre">${euro(caricatoMese[c.id]||0)}</td><td class="num cifre">${euro(allocatoMese[c.id]||0)}</td>
      <td class="num cifre" style="font-weight:700;color:${residuoMese<-0.005?'var(--rosso)':'inherit'}">${euro(residuoMese)}</td>
      <td class="num cifre">${euro(caricatoYTD[c.id]||0)}</td><td class="num cifre">${euro(allocatoYTD[c.id]||0)}</td>
      <td class="num cifre" style="font-weight:700;color:${residuoYTD<-0.005?'var(--rosso)':'var(--verde)'}">${euro(residuoYTD)}</td></tr>`;
  }).join('');

  // Assorbimento EFFETTIVO delle produzioni registrate, dagli snapshot congelati (tariffe storiche, non correnti)
  const storico = {}, storicoLegacy = {};
  STATO.registrazioni.filter(r => r.tipo === 'PRODUZIONE' && r.data).forEach(reg => {
    const d = new Date(reg.data + 'T00:00:00'); if(isNaN(d) || d.getMonth() > meseIdx) return;
    const s = reg.snapshotCosto;
    if(s && !s.legacy){
      s.centri.forEach(c => { const x = storico[c.centroCostoId] || (storico[c.centroCostoId] = {oreStd:0, oreReali:0, stdP:0, stdG:0, assP:0, assG:0});
        x.oreStd += c.oreStd; x.oreReali += c.oreReali; x.stdP += c.stdPersonale; x.stdG += c.stdGenerali; x.assP += c.assorbitoPersonale; x.assG += c.assorbitoGenerali; });
    }else{
      (reg.righe || []).forEach(r => { if((r.conto === '51' || r.conto === '52') && r.dareAvere === 'AVERE' && r.centroCostoId){
        const x = storicoLegacy[r.centroCostoId] || (storicoLegacy[r.centroCostoId] = {assP:0, assG:0}); if(r.conto === '51') x.assP += r.importo; else x.assG += r.importo; } });
    }
  });
  liquidazioniPP().filter(r => r.data).forEach(reg => {
    const d = new Date(reg.data + 'T00:00:00'); if(isNaN(d) || d.getMonth() > meseIdx) return;
    (reg.dettaglioKO88.centri || []).forEach(c => { const x = storico[c.centroCostoId] || (storico[c.centroCostoId] = {oreStd:0, oreReali:0, stdP:0, stdG:0, assP:0, assG:0});
      x.oreStd += c.oreStd; x.oreReali += c.oreReali; x.stdP += c.stdP; x.stdG += c.stdG; x.assP += c.assP; x.assG += c.assG; });
  });
  const idsStorico = [...new Set(Object.keys(storico).concat(Object.keys(storicoLegacy)))];
  const sezioneStorica = `<h3 style="margin-top:24px">Assorbimento delle produzioni registrate — gennaio → ${NOMI_MESI[meseIdx]} (costi storici congelati)</h3>
    <table class="registro"><thead><tr><th>Centro</th><th class="num">Ore std</th><th class="num">Ore reali</th><th class="num">Std personale</th><th class="num">Assorbito 51</th><th class="num">Std generali</th><th class="num">Assorbito 52</th><th class="num">Variance (std − assorbito)</th></tr></thead>
    <tbody>${idsStorico.length ? idsStorico.map(id => { const x = storico[id] || {oreStd:0, oreReali:0, stdP:0, stdG:0, assP:0, assG:0}, l = storicoLegacy[id], v = x.stdP + x.stdG - x.assP - x.assG;
      return `<tr><td>${nomeCentroCosto(id) || id}</td><td class="num cifre">${x.oreStd.toFixed(2)} h</td><td class="num cifre">${x.oreReali.toFixed(2)} h</td>
        <td class="num cifre">${euro(x.stdP)}</td><td class="num cifre">${euro(x.assP)}</td><td class="num cifre">${euro(x.stdG)}</td><td class="num cifre">${euro(x.assG)}</td>
        <td class="num cifre" style="font-weight:700;color:${v<-0.004?'var(--rosso)':'var(--verde)'}">${v<-0.004?'−':'+'}${euro(Math.abs(v))}</td></tr>${l ? `<tr><td class="aiuto" colspan="4">↳ ${nomeCentroCosto(id) || id}: produzioni legacy (standard per centro non verificabile)</td><td class="num cifre aiuto">${euro(l.assP)}</td><td></td><td class="num cifre aiuto">${euro(l.assG)}</td><td></td></tr>` : ''}`; }).join('')
      : '<tr><td colspan="8" class="vuoto">Nessuna produzione registrata nel periodo.</td></tr>'}</tbody></table>
    <p class="aiuto" style="margin-top:8px">Qui ogni produzione conta con le ore e le tariffe (personale e generali) congelate nel suo snapshot: se oggi cambi la distinta o le tariffe dei centri, queste cifre non cambiano.</p>`;

  box.innerHTML = `
    <h3>Pool costi dei centri — caricato, addebitato alle commesse, residuo</h3>
    <table class="registro" style="margin-bottom:22px">
      <thead><tr><th rowspan="2">Centro</th><th colspan="3" style="text-align:center">${NOMI_MESI[meseIdx]}</th><th colspan="3" style="text-align:center">Gennaio → ${NOMI_MESI[meseIdx]}</th></tr>
      <tr><th class="num">Effettivi FI Dare</th><th class="num">Attività a commesse (75 o 51/52 legacy)</th><th class="num">Residuo</th><th class="num">Effettivi FI Dare</th><th class="num">Attività a commesse (75 o 51/52 legacy)</th><th class="num">Pool residuo</th></tr></thead>
      <tbody>${righePool}</tbody>
    </table>
    <p class="aiuto" style="margin-bottom:20px">Il residuo positivo è costo ancora da assorbire; un residuo negativo indica un sovra-assorbimento. Il programma impedisce nuovi addebiti oltre il pool disponibile.</p>
    <h3>Confronto assorbimento standard vs reale</h3>
    <table class="registro">
      <thead><tr><th rowspan="2" style="vertical-align:bottom">Centro di costo</th>
        <th colspan="3" style="text-align:center;border-bottom:1px solid var(--riga)">${NOMI_MESI[meseIdx]} (il mese)</th>
        <th colspan="3" style="text-align:center;border-bottom:1px solid var(--riga)">Gennaio → ${NOMI_MESI[meseIdx]} (cumulato)</th></tr>
      <tr><th class="num">Standard</th><th class="num">Reale</th><th class="num">Varianza</th>
        <th class="num">Standard</th><th class="num">Reale</th><th class="num">Varianza</th></tr></thead>
      <tbody>${righe}</tbody>
    </table>
    <p class="aiuto" style="margin-top:14px">Per i centri "a lavorazione" (Taglio, Saldatura...) "Standard" è il costo di
      manodopera che il VOLUME pianificato per quel periodo avrebbe dovuto assorbire (ore standard × tariffa oraria
      standard, dal Budget Annuo mensilizzato) — non il budget fisso del centro spalmato per tempo: quello lo trovi già
      come "Variance di Capacità" nel Bilancio Previsionale e nel Controllo Mensile, ed è una domanda diversa (stiamo
      spendendo secondo il budget fisso?) da questa (il lavoro fatto corrisponde al volume pianificato?). Varianza
      positiva (rossa) = assorbito più del volume pianificato per quel periodo — più ore/costo del previsto per la stessa
      produzione, o abbiamo prodotto più del pianificato. Varianza negativa (verde) = assorbito meno.
      Per i centri SENZA una riga nel ciclo di lavorazione (come Spese Generali) vale invece l'altra logica: non essendo
      legati al volume prodotto, il loro Standard è il costo annuo spalmato per calendario (annuo × peso del mese) — qui
      sì che "tempo" è la base corretta, perché lo è anche il costo reale che si confronta.</p>` + sezioneStorica;
}

// ═══════════════════════════════════════════════════════════════════════
// REPORT COMMESSE — standard vs reale, aggregando tutte le Dichiarazioni
// di Produzione E le Fatture di Vendita collegate a ciascuna commessa nel
// tempo — così si vede in un unico posto se un lotto è stato prodotto e
// venduto come pianificato, ed è qui che si decide se chiuderlo.
// ═══════════════════════════════════════════════════════════════════════
function renderReportCommesse(){
  const box = document.getElementById('tab-commesse-report');
  const sd = STATO.sdmm || {ddt:[], fatture:[], ordini:[]};
  const ordiniPP = (STATO.pp && STATO.pp.ordini) || [];
  const regs = STATO.registrazioni;
  const SENZA = '__senza';
  const perCommessa = {};
  const agg = id => {
    const k = (id === '' || id == null) ? SENZA : String(id);
    if(!perCommessa[k]) perCommessa[k] = {quantitaProdotta:0, costoStdProdotto:0, legacy:0, anomalie:[],
      ferroKg:0, ferroEuro:0, semilavoratiNetti:0, lav:{}, inCorso:0, wipBilancio:0, ordiniAperti:[], ordiniChiusi:[],
      kgStandard:0, kgReale:0, ore:{}, varMateriale:0, varCentri:{}, varNonRipartita:0, varScarti:0,
      pezziVenduti:0, ricavoStandard:0, ricavoReale:0, costoVenduto:0, cdvNonVerificabile:0, pezziSpeditiNonFatturati:0};
    return perCommessa[k];
  };
  const lav = (a, id, ore, euro) => { const x = a.lav[id] || (a.lav[id] = {ore:0, euro:0}); x.ore += ore || 0; x.euro += euro || 0; };
  const sommaRighe = (righe, conti, da, cc) => (righe || []).filter(x => conti.includes(x.conto) && x.dareAvere === da && (cc === undefined || String(x.centroCostoId) === String(cc))).reduce((t, x) => t + (x.importo || 0), 0);

  // ── 1. PRODUZIONE: dichiarazioni / entrate merci. Ogni lotto prodotto ricorda la sua commessa (serve per attribuire le vendite)
  const commessaDiLotto = {};
  regs.filter(r => r.tipo === 'PRODUZIONE' && r.dettaglioProduzione && !r.annullataDa).forEach(r => {
    const d = r.dettaglioProduzione, s = r.snapshotCosto, a = agg(d.commessaId);
    commessaDiLotto[r.id] = d.commessaId;
    a.quantitaProdotta += d.quantita || 0;
    a.costoStdProdotto += sommaRighe(r.righe, ['13'], 'DARE');
    if(r.originePP) return;   // ordine PP: costi sostenuti e varianze arrivano dall'ordine (sotto)
    // dichiarazione diretta (versioni precedenti): costi sostenuti letti dalla scrittura
    a.ferroKg += d.kgReale || 0; a.ferroEuro += sommaRighe(r.righe, ['12'], 'AVERE');
    const ids = [...new Set((r.righe || []).filter(x => (x.conto === '51' || x.conto === '52') && x.dareAvere === 'AVERE' && x.centroCostoId).map(x => String(x.centroCostoId)))];
    ids.forEach(id => { const o = (d.ore || []).find(x => String(x.centroCostoId) === id); lav(a, id, o ? o.oreReale : 0, sommaRighe(r.righe, ['51', '52'], 'AVERE', id)); });
    a.kgStandard += d.kgStandard || 0; a.kgReale += d.kgReale || 0;
    const oreViste = {};
    (d.ore || []).forEach(o => {
      if(oreViste[o.centroCostoId]) return; oreViste[o.centroCostoId] = 1;
      const x = a.ore[o.centroCostoId] || (a.ore[o.centroCostoId] = {oreStandard:0, oreReale:0});
      x.oreStandard += o.oreStandard || 0; x.oreReale += o.oreReale || 0;
    });
    if(s && !s.legacy){
      a.varMateriale += s.materiale.varianza;
      s.centri.forEach(c => { a.varCentri[c.centroCostoId] = (a.varCentri[c.centroCostoId] || 0) + (c.varianza || 0); });
    }else{
      a.legacy++;
      if(s && s.anomalia) a.anomalie.push(`produzione n° ${r.id}: ${s.anomalia}`);
      (r.righe || []).forEach(x => {
        const v = x.dareAvere === 'AVERE' ? x.importo : -x.importo;
        if(x.conto === '60') a.varMateriale += v;
        if(x.conto === '61'){ if(x.centroCostoId) a.varCentri[x.centroCostoId] = (a.varCentri[x.centroCostoId] || 0) + v; else a.varNonRipartita += v; }
      });
    }
  });

  // ── 2. ORDINI DI PRODUZIONE PP: costi realmente sostenuti (ferro prelevato 261 + attività CO11N), aperti o chiusi
  ordiniPP.forEach(o => {
    if(!window.PP) return;
    const a = agg(o.commessaId), r = PP.riepilogo(o);
    const fe = r.comp['FERRO']; if(fe){ a.ferroKg += fe.qty; a.ferroEuro += fe.cent / 100; }   // il semilavorato è interno: il suo costo è già nel ferro e nel Taglio
    Object.keys(r.act).forEach(id => lav(a, id, r.act[id].ore, (r.act[id].p + r.act[id].g) / 100));
    if(o.liquidazione) a.ordiniChiusi.push(o.id + ' ' + o.materiale);
    else{ a.inCorso += r.saldo / 100; a.wipBilancio += (o.wipSettled || 0) / 100; a.ordiniAperti.push(o.id + ' ' + o.materiale); }
  });
  // Trasferimenti HALB fra commesse: una sola attribuzione, al valore FIFO congelato.
  (STATO.mm?.documenti||[]).filter(d=>d.bwart==='261'&&!d.stornatoDa&&d.mat!=='FERRO').forEach(d=>{
    const dest=ordiniPP.find(o=>o.id===d.rif?.ordine);if(!dest||dest.schemaFasi!==3)return;
    (d.lotti||[]).forEach(l=>{const origine=(STATO.mm.documenti||[]).find(x=>x.doc===l.lotto),src=ordiniPP.find(o=>o.id===origine?.rif?.ordine);
      if(src&&String(src.commessaId)===String(dest.commessaId))return;
      agg(dest.commessaId).semilavoratiNetti+=l.cent/100;
      if(src)agg(src.commessaId).semilavoratiNetti-=l.cent/100;
    });
  });
  // Varianze degli ordini PP liquidati a fine periodo (CO88)
  liquidazioniPP().forEach(reg => {
    const d = reg.dettaglioKO88, a = agg(d.commessaId);
    (d.componenti || []).forEach(c => { if(c.mat === 'FERRO'){ a.kgStandard += c.qtyStd; a.kgReale += c.qtyReale; } a.varMateriale += c.varQta + c.varPrezzo; a.varScarti += c.varScarto; });
    a.varMateriale += d.residuo || 0;
    (d.centri || []).forEach(c => {
      const x = a.ore[c.centroCostoId] || (a.ore[c.centroCostoId] = {oreStandard:0, oreReale:0});
      x.oreStandard += c.oreStd; x.oreReale += c.oreReali;
      a.varCentri[c.centroCostoId] = (a.varCentri[c.centroCostoId] || 0) + c.varEff + (c.varPrezzo || 0);
      a.varScarti += c.varScarto;
    });
  });

  // ── 3. VENDITE: vecchie fatture manuali di Nuova Registrazione
  regs.filter(r => r.tipo === 'VENDITA' && r.dettaglioVendita).forEach(r => {
    const d = r.dettaglioVendita, a = agg(d.commessaId);
    a.pezziVenduti += d.pezzi; a.ricavoStandard += d.pezzi * d.prezzoStandard; a.ricavoReale += d.pezzi * d.prezzoReale;
    a.costoVenduto += sommaRighe(r.righe, ['41'], 'DARE');
  });
  // Fatture SD rilasciate in contabilità: ricavi e costo del venduto attribuiti alla commessa che ha PRODOTTO i pezzi consegnati
  // (lotti FIFO del DDT). Se il lotto non ha commessa (giacenza iniziale) vale la commessa dell'ordine di vendita, se c'è.
  const fatturaRegistrata = f => regs.some(r => r.origineSD && r.origineSD.tipo === 'FATT' && r.origineSD.id === f.id);
  const commessaPer = (lottoId, o) => { const c = commessaDiLotto[lottoId]; return (c !== undefined && c !== '') ? c : (o.commessaId || ''); };
  const ddtFatturati = new Set();
  (sd.fatture || []).filter(fatturaRegistrata).forEach(f => {
    const o = (sd.ordini || []).find(x => x.id === f.ordId) || {};
    const dd = (sd.ddt || []).filter(d => (f.cdvDdtIds || []).length ? f.cdvDdtIds.includes(d.id) : d.ordId === f.ordId);
    const pStd = f.qty > 0 ? f.ricavi / f.qty : f.prezzo;
    const vendi = (a, q, cdv) => { a.pezziVenduti += q; a.ricavoReale += q * f.prezzo; a.ricavoStandard += q * pStd; if(cdv == null) a.cdvNonVerificabile += q; else a.costoVenduto += cdv; };
    let coperti = 0;
    dd.forEach(d => {
      ddtFatturati.add(d.id);
      if(Array.isArray(d.lotti) && d.lotti.length) d.lotti.forEach(l => { vendi(agg(commessaPer(l.lottoId, o)), l.qty, l.costoUnit == null ? null : l.qty * l.costoUnit); coperti += l.qty; });
      else{ vendi(agg(o.commessaId), d.qty, d.importoCdV || 0); coperti += d.qty; }
    });
    if(f.qty - coperti > 0.0001) vendi(agg(o.commessaId), f.qty - coperti, null);
  });
  // Merce già spedita ma non ancora fatturata (o fattura non rilasciata): la si segnala sulla commessa
  (sd.ddt || []).filter(d => !ddtFatturati.has(d.id)).forEach(d => {
    const o = (sd.ordini || []).find(x => x.id === d.ordId) || {};
    if(Array.isArray(d.lotti) && d.lotti.length) d.lotti.forEach(l => { agg(commessaPer(l.lottoId, o)).pezziSpeditiNonFatturati += l.qty; });
    else agg(o.commessaId).pezziSpeditiNonFatturati += d.qty;
  });

  const chiavi = Object.keys(perCommessa);
  if(!chiavi.length){ box.innerHTML = '<p class="vuoto">Nessuna produzione, ordine di produzione o vendita collegata a una commessa, ancora.</p>'; return; }
  const ordinati = STATO.commesse.map(c => String(c.id)).filter(k => chiavi.includes(k))
    .concat(chiavi.filter(k => k !== SENZA && !STATO.commesse.some(c => String(c.id) === k)))
    .concat(chiavi.includes(SENZA) ? [SENZA] : []);

  const col = v => v < -0.004 ? 'var(--rosso)' : v > 0.004 ? 'var(--verde)' : 'inherit';
  const sgn = v => `${v < -0.004 ? '−' : v > 0.004 ? '+' : ''}${euro(Math.abs(v))}`;
  const pct = (v, base) => base > 0.004 ? (v / base * 100).toLocaleString('it-IT', {maximumFractionDigits:1}) + '%' : '—';
  const n0 = x => (Number(x) || 0).toLocaleString('it-IT', {maximumFractionDigits:0});
  const n1 = x => (Number(x) || 0).toLocaleString('it-IT', {minimumFractionDigits:1, maximumFractionDigits:1});

  const blocchi = ordinati.map(k => {
    const a = perCommessa[k], commessa = STATO.commesse.find(c => String(c.id) === k);
    // varianze di produzione (+ favorevole)
    const idCentri = [...new Set(Object.keys(a.ore).concat(Object.keys(a.varCentri)).map(String))];
    let varManodopera = a.varNonRipartita;
    const righeOre = idCentri.map(id => {
      const o = a.ore[id] || {oreStandard:0, oreReale:0}, noto = id in a.varCentri, v = a.varCentri[id] || 0;
      varManodopera += v;
      return `<tr><td>Ore centro ${nomeCentroCosto(id) || '?'}</td><td class="num cifre">${n1(o.oreStandard)} h</td><td class="num cifre">${n1(o.oreReale)} h</td>
        ${!noto && a.legacy ? '<td class="num aiuto">n.d. (legacy)</td>' : `<td class="num cifre" style="font-weight:700;color:${col(v)}">${sgn(v)}</td>`}</tr>`;
    }).join('') + (Math.abs(a.varNonRipartita) > 0.004 ? `<tr><td>Manodopera — scritture storiche non ripartite per centro</td><td></td><td></td><td class="num cifre" style="font-weight:700;color:${col(a.varNonRipartita)}">${sgn(a.varNonRipartita)}</td></tr>` : '');
    const varProd = a.varMateriale + varManodopera + a.varScarti;
    const varPV = a.ricavoReale - a.ricavoStandard;
    const margStd = a.ricavoStandard - a.costoVenduto;
    const cdvReale = a.costoVenduto - varProd;
    const risultato = a.ricavoReale - cdvReale;
    const costiSostenuti = a.ferroEuro + a.semilavoratiNetti + Object.values(a.lav).reduce((t, x) => t + x.euro, 0);

    // ── Conto economico della commessa
    const ce = a.pezziVenduti > 0 ? `
      <table class="registro" style="margin-bottom:14px">
        <thead><tr><th>Conto economico della commessa — ${n0(a.pezziVenduti)} pezzi venduti</th><th class="num">Standard</th><th class="num">Reale</th><th class="num">Variazione</th></tr></thead>
        <tbody>
          <tr><td>Ricavi di vendita</td><td class="num cifre">${euro(a.ricavoStandard)}</td><td class="num cifre">${euro(a.ricavoReale)}</td>
            <td class="num cifre" style="font-weight:700;color:${col(varPV)}">${sgn(varPV)}</td></tr>
          <tr><td>− Costo del venduto <span class="aiuto">(standard storico dei lotti consegnati; reale = standard − varianze di produzione liquidate)</span></td>
            <td class="num cifre">${euro(a.costoVenduto)}</td><td class="num cifre">${euro(cdvReale)}</td><td class="num cifre" style="font-weight:700;color:${col(varProd)}">${sgn(varProd)}</td></tr>
          <tr><td style="font-weight:700">= Margine industriale</td><td class="num cifre" style="font-weight:700">${euro(margStd)}</td>
            <td class="num cifre" style="font-weight:700;color:${col(risultato)}">${euro(risultato)}</td><td class="num cifre" style="font-weight:700;color:${col(varPV + varProd)}">${sgn(varPV + varProd)}</td></tr>
          <tr><td>Margine % sui ricavi</td><td class="num cifre">${pct(margStd, a.ricavoStandard)}</td><td class="num cifre">${pct(risultato, a.ricavoReale)}</td><td></td></tr>
          <tr><td>Margine per pezzo venduto</td><td class="num cifre">${euro(margStd / a.pezziVenduti)}</td><td class="num cifre">${euro(risultato / a.pezziVenduti)}</td><td></td></tr>
        </tbody>
      </table>
      ${a.cdvNonVerificabile ? `<p style="color:var(--rosso);font-size:12.5px">⚠️ ${n0(a.cdvNonVerificabile)} pz venduti senza costo storico verificabile: il loro costo del venduto non è incluso.</p>` : ''}`
      : `<p class="aiuto" style="margin-bottom:12px">Nessun pezzo ancora fatturato: ricavi e margine compaiono dopo la fattura di vendita rilasciata in contabilità (SD → VF01).</p>`;
    const spediti = a.pezziSpeditiNonFatturati > 0 ? `<p class="aiuto">📦 ${n0(a.pezziSpeditiNonFatturati)} pz già consegnati con DDT ma non ancora fatturati (o fattura da rilasciare).</p>` : '';

    // ── Costi di produzione sostenuti
    const righeLav = Object.keys(a.lav).map(id => `<tr><td>Lavorazione centro ${nomeCentroCosto(id) || '?'}</td><td class="num cifre">${n1(a.lav[id].ore)} h</td><td class="num cifre">${euro(a.lav[id].euro)}</td></tr>`).join('');
    const prod = (costiSostenuti > 0.004 || a.quantitaProdotta > 0) ? `
      <table class="registro" style="margin-bottom:14px">
        <thead><tr><th>Costi di produzione sostenuti</th><th class="num">Quantità</th><th class="num">Importo</th></tr></thead>
        <tbody>
          <tr><td>Semilavorati netti trasferiti da / ad altre commesse (FIFO storico; non si sommano i passaggi interni)</td><td></td><td class="num cifre">${euro(a.semilavoratiNetti)}</td></tr>
          <tr><td>Ferro consumato</td><td class="num cifre">${n1(a.ferroKg)} kg</td><td class="num cifre">${euro(a.ferroEuro)}</td></tr>
          ${righeLav}
          <tr><td style="font-weight:700">Totale costi di produzione</td><td></td><td class="num cifre" style="font-weight:700">${euro(costiSostenuti)}</td></tr>
          <tr><td>Pezzi prodotti ed entrati a magazzino — valore a costo standard</td><td class="num cifre">${n0(a.quantitaProdotta)} pz</td><td class="num cifre">${euro(a.costoStdProdotto)}</td></tr>
          ${a.quantitaProdotta > 0 ? `<tr><td>Costo medio sostenuto per pezzo prodotto <span class="aiuto">(costo standard: ${euro(a.costoStdProdotto / a.quantitaProdotta)})</span></td><td></td><td class="num cifre">${euro(costiSostenuti / a.quantitaProdotta)}</td></tr>` : ''}
          ${a.ordiniAperti.length ? `<tr><td colspan="3" class="aiuto">Ordini PP ancora aperti: ${a.ordiniAperti.join(', ')} — costi sull'ordine non ancora trasformati in pezzi ${euro(a.inCorso)}, WIP a bilancio dall'ultima chiusura ${euro(a.wipBilancio)}. Le loro varianze entrano nel margine con la chiusura di periodo (CO88).</td></tr>` : ''}
        </tbody>
      </table>` : '';

    // ── Standard vs reale (varianze)
    const std = (a.kgStandard || a.kgReale || righeOre || Math.abs(a.varScarti) > 0.004) ? `
      <table class="registro">
        <thead><tr><th>Varianze di produzione (+ favorevole)</th><th class="num">Standard</th><th class="num">Reale</th><th class="num">Variazione</th></tr></thead>
        <tbody>
          <tr><td>Ferro</td><td class="num cifre">${n1(a.kgStandard)} kg</td><td class="num cifre">${n1(a.kgReale)} kg</td><td class="num cifre" style="font-weight:700;color:${col(a.varMateriale)}">${sgn(a.varMateriale)}</td></tr>
          ${righeOre}
          ${Math.abs(a.varScarti) > 0.004 ? `<tr><td>Scarti di produzione (conto 64)</td><td></td><td></td><td class="num cifre" style="font-weight:700;color:${col(a.varScarti)}">${sgn(a.varScarti)}</td></tr>` : ''}
          <tr><td style="font-weight:700">Totale varianze di produzione</td><td></td><td></td><td class="num cifre" style="font-weight:700;color:${col(varProd)}">${sgn(varProd)}</td></tr>
        </tbody>
      </table>` : '';

    const chiusa = commessa && commessa.stato === 'chiusa';
    const titolo = commessa ? `${commessa.codice} — ${commessa.descrizione}` : k === SENZA ? 'Vendite senza commessa (giacenza iniziale / ordini non collegati)' : '(commessa eliminata)';
    const risultatoBox = a.pezziVenduti > 0 ? `
      <div style="margin-top:14px;padding:14px 18px;border-radius:8px;background:${risultato<0?'rgba(156,59,59,.10)':'rgba(74,124,89,.10)'};border:2px solid ${risultato<0?'var(--rosso)':'var(--verde)'};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <span style="font-size:15px;font-weight:700">💰 Margine industriale reale della commessa</span>
        <span class="cifre" style="font-size:22px;font-weight:700;color:${risultato<0?'var(--rosso)':'var(--verde)'}">${risultato<0?'−':'+'}${euro(Math.abs(risultato))} <span style="font-size:14px">(${pct(risultato, a.ricavoReale)})</span></span>
      </div>` : '';
    return `<div class="riquadro">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:6px">
        <h3 style="margin:0">${titolo}</h3>
        ${commessa ? `<div>${chiusa ? '<span class="badge no">🔒 Chiusa</span>' : '<span class="badge ok">🔓 Aperta</span>'}
          <button class="azione secondaria" style="padding:3px 10px;font-size:12px;margin-left:8px" onclick="toggleStatoCommessa(${commessa.id})">${chiusa ? 'Riapri' : 'Chiudi'}</button></div>` : ''}
      </div>
      <p class="aiuto">${n0(a.quantitaProdotta)} pezzi prodotti${commessa ? ` (pianificati: ${n0(commessa.quantitaPianificata)})` : ''} · ${n0(a.pezziVenduti)} pezzi fatturati${a.legacy ? ` · ${a.legacy} produzioni legacy (varianze lette dal Libro Giornale)` : ''}</p>
      ${a.anomalie.length ? `<p style="color:var(--rosso);font-size:12.5px">⚠️ ${a.anomalie.join(' · ')}</p>` : ''}
      ${ce}${spediti}${prod}${std}${risultatoBox}
    </div>`;
  }).join('');
  box.innerHTML = blocchi + '<p class="aiuto">Le vendite sono attribuite alla commessa che ha prodotto i pezzi consegnati (lotti FIFO del DDT), anche se l\'ordine di vendita è stato inserito prima di aprire la commessa. Costo del venduto e varianze sono quelli STORICI congelati: cambiare oggi tariffe o distinta non li modifica. Rosso = sfavorevole, verde = favorevole.</p>';
}

// ═══════════════════════════════════════════════════════════════════════
// CONTROLLO MENSILE — mensilizza il Budget Annuo (quote % per mese,
// costanti di default) e confronta il target del mese con il Conto
// Economico REALE letto dalle scritture del Libro Giornale con data in
// quel mese: Σ conti tipo RICAVO − Σ conti tipo COSTO, saldo naturale per
// saldo naturale — così qualunque conto (anche uno aggiunto in futuro)
// entra da solo nel calcolo, senza bisogno di elencarli a mano qui.
// ═══════════════════════════════════════════════════════════════════════
const NOMI_MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

function aggiornaPesoMensile(i, valore){
  STATO.budgetAnnuo.pesiMensili[i] = parseFloat(valore) || 0;
  salvaStato();
  renderControlloMensile();
}

function budgetDelMese(pesoFrazione){
  const bud = STATO.budgetAnnuo;
  const costoStdUnit = costoStandardTransenna();
  const volumeMese = (bud.volumeAnnuoPianificato||0) * pesoFrazione;
  const fatturatoMese = volumeMese * (bud.prezzoVenditaStandard||0);
  const cdvMese = volumeMese * costoStdUnit;
  const margineMese = fatturatoMese - cdvMese;
  const speseMese = (bud.speseGeneraliAnnue||0) * pesoFrazione;
  const { varianceTotale: varCapMese, sforato } = calcolaVarianceCapacita(bud.volumeAnnuoPianificato||0, pesoFrazione);
  const redditoMese = margineMese - varCapMese - speseMese;
  return { volumeMese, fatturatoMese, cdvMese, margineMese, speseMese, varCapMese, redditoMese, sforato };
}

function renderControlloMensile(){
  const bud = STATO.budgetAnnuo;
  if(!Array.isArray(bud.pesiMensili) || bud.pesiMensili.length !== 12) bud.pesiMensili = Array(12).fill(100/12);
  const pesi = bud.pesiMensili;

  // 1) Mensilizzazione
  let totalePeso = 0;
  const righeMens = pesi.map((p, i) => {
    totalePeso += (p||0);
    const b = budgetDelMese((p||0)/100);
    return `<tr>
      <td>${NOMI_MESI[i]}</td>
      <td><input class="cifre cella-editabile" style="width:64px" type="number" step="0.01" value="${(p||0).toFixed(2)}" onchange="aggiornaPesoMensile(${i}, this.value)"> %</td>
      <td class="num cifre">${b.volumeMese.toFixed(0)}</td>
      <td class="num cifre">${euro(b.fatturatoMese)}</td>
      <td class="num cifre">${euro(b.cdvMese)}</td>
      <td class="num cifre">${euro(b.margineMese)}</td>
      <td class="num cifre">${euro(b.speseMese)}</td>
      <td class="num cifre" style="font-weight:700;color:${b.redditoMese<0?'var(--rosso)':'var(--verde)'}">${euro(b.redditoMese)}</td>
    </tr>`;
  }).join('');
  document.getElementById('tab-mensilizzazione').innerHTML = `
    <thead><tr><th>Mese</th><th>Peso</th><th class="num">Volume</th><th class="num">Ricavi std</th><th class="num">Costo Venduto std</th><th class="num">Margine std</th><th class="num">Spese Gen.</th><th class="num">Reddito Target</th></tr></thead>
    <tbody>${righeMens}</tbody>
    <tfoot><tr style="font-weight:700"><td colspan="1">Totale pesi</td><td class="cifre">${totalePeso.toFixed(2)}% ${Math.abs(totalePeso-100)>0.05?'⚠️':'✓'}</td><td colspan="6"></td></tr></tfoot>`;

  // 2) Mese selezionato — Budget del mese
  const meseIdx = parseInt(document.getElementById('mensile-mese').value, 10) || 0;
  const pesoMese = pesi[meseIdx] || 0;
  const b = budgetDelMese(pesoMese/100);
  document.getElementById('tab-budget-mese').innerHTML = `
    ${b.sforato ? `<caption style="caption-side:top;text-align:left;padding-bottom:8px">
      <span class="riquadro" style="display:block;border-color:var(--rosso);background:rgba(156,59,59,.08);padding:8px 10px;font-size:12.5px">
        ⚠️ Il volume annuo pianificato supera la capacità reale di almeno un centro (vedi Budget Annuo → Capacità) — anche
        questo target mensile è teorico finché non applichi LTP o riduci il volume.
      </span></caption>` : ''}
    <tbody>
      <tr><td>Peso del mese</td><td class="num cifre">${pesoMese.toFixed(2)}%</td></tr>
      <tr><td>Volume target</td><td class="num cifre">${b.volumeMese.toFixed(0)} pezzi</td></tr>
      <tr><td>Ricavi target</td><td class="num cifre">${euro(b.fatturatoMese)}</td></tr>
      <tr><td>− Costo del Venduto std</td><td class="num cifre">${euro(b.cdvMese)}</td></tr>
      <tr><td style="font-weight:700">= Margine Industriale</td><td class="num cifre" style="font-weight:700">${euro(b.margineMese)}</td></tr>
      <tr><td>${b.varCapMese<0?'+':'−'} Variance di Capacità (quota mese)</td><td class="num cifre">${euro(Math.abs(b.varCapMese))}</td></tr>
      <tr><td>− Spese Generali (quota mese)</td><td class="num cifre">${euro(b.speseMese)}</td></tr>
      <tr><td style="font-weight:700">= Reddito Operativo Target</td>
        <td class="num cifre" style="font-weight:700;color:${b.redditoMese<0?'var(--rosso)':'var(--verde)'}">${euro(b.redditoMese)}</td></tr>
    </tbody>`;

  // 3) Conto Economico REALE del mese, letto dal Libro Giornale
  const regsDelMese = STATO.registrazioni.filter(r => {
    if(!r.data) return false;
    const d = new Date(r.data + 'T00:00:00');
    return !isNaN(d) && d.getMonth() === meseIdx && d.getFullYear() === Number(document.getElementById('mensile-anno')?.value || (STATO.fi.costituzione || oggiIso()).slice(0,4));
  });
  const contiUsati = new Set();
  regsDelMese.forEach(r => r.righe.forEach(rg => contiUsati.add(rg.conto)));
  const contiEconomici = [...contiUsati]
    .map(codice => STATO.pianoDeiConti.find(c => c.codice === codice))
    .filter(c => c && (c.tipo === 'RICAVO' || c.tipo === 'COSTO'))
    .sort((a,c) => a.codice.localeCompare(c.codice));

  let totaleRicavi = 0, totaleCosti = 0;
  const righeCE = contiEconomici.map(c => {
    let dare = 0, avere = 0;
    regsDelMese.forEach(r => r.righe.forEach(rg => { if(rg.conto === c.codice){ if(rg.dareAvere==='DARE') dare += rg.importo; else avere += rg.importo; } }));
    const saldo = (c.tipo === 'RICAVO') ? (avere - dare) : (dare - avere);
    if(c.tipo === 'RICAVO') totaleRicavi += saldo; else totaleCosti += saldo;
    return `<tr><td>${c.codice} — ${c.nome}</td>
      <td class="num cifre" style="color:${saldo<0?'var(--rosso)':'inherit'}">${saldo<0?'−':''}${euro(Math.abs(saldo))}</td></tr>`;
  }).join('');
  const risultatoReale = totaleRicavi - totaleCosti;

  document.getElementById('tab-ce-reale-mese').innerHTML = regsDelMese.length ? `
    <tbody>
      ${righeCE || '<tr><td colspan="2" class="vuoto">Nessun conto economico movimentato in questo mese.</td></tr>'}
      <tr><td style="font-weight:700;padding-top:10px">Totale Ricavi</td><td class="num cifre" style="font-weight:700">${euro(totaleRicavi)}</td></tr>
      <tr><td style="font-weight:700">Totale Costi</td><td class="num cifre" style="font-weight:700">${euro(totaleCosti)}</td></tr>
      <tr><td style="font-weight:700">= Risultato Economico Reale</td>
        <td class="num cifre" style="font-weight:700;color:${risultatoReale<0?'var(--rosso)':'var(--verde)'}">${euro(risultatoReale)}</td></tr>
    </tbody>` : `<tbody><tr><td class="vuoto" colspan="2">Nessuna scrittura registrata in questo mese.</td></tr></tbody>`;

  // 4) Confronto Budget vs Reale
  const scostamento = risultatoReale - b.redditoMese;
  document.getElementById('tab-confronto-mensile').innerHTML = `
    <thead><tr><th></th><th class="num">Budget del mese</th><th class="num">Reale del mese</th><th class="num">Scostamento</th></tr></thead>
    <tbody>
      <tr><td style="font-weight:700">Reddito Operativo / Risultato Economico</td>
        <td class="num cifre">${euro(b.redditoMese)}</td>
        <td class="num cifre">${regsDelMese.length ? euro(risultatoReale) : '—'}</td>
        <td class="num cifre" style="font-weight:700;color:${!regsDelMese.length ? 'inherit' : (scostamento<0?'var(--rosso)':'var(--verde)')}">
          ${regsDelMese.length ? (scostamento<0?'−':'+') + euro(Math.abs(scostamento)) : '—'}</td></tr>
    </tbody>
    <tfoot><tr><td colspan="4" class="aiuto" style="padding-top:8px">Verde = stiamo facendo meglio del target del mese. Rosso = peggio. "—" = nessuna
      scrittura ancora registrata in questo mese, quindi il confronto non è possibile.</td></tr></tfoot>`;
}
