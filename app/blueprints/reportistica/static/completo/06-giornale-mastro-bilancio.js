/* Generato da tools/split_simulatore.py (completo) — non modificare a mano: modifica sorgenti/ e rilancia. */
// ═══════════════════════════════════════════════════════════════════════
// LIBRO GIORNALE
// ═══════════════════════════════════════════════════════════════════════
function nomeConto(codice){ const c = STATO.pianoDeiConti.find(x=>x.codice===codice); return c ? `${c.codice} — ${c.nome}` : codice; }
function nomeCentroCosto(id){ const c = STATO.centriDiCosto.find(x=>String(x.id)===String(id)); return c ? c.nome : ''; }
function nomeCentroRicavo(id){ const c = STATO.centriDiRicavo.find(x=>String(x.id)===String(id)); return c ? c.nome : ''; }

function renderGiornale(){
  const box = document.getElementById('lista-giornale');
  const anomalie = anomalieCostoStorico();
  const bannerAnomalie = anomalie.length ? `<div class="riquadro" style="border-color:var(--rosso);background:rgba(156,59,59,.08);margin-bottom:14px">
    <b>⚠️ Anomalie sul costo storico</b> — nessun valore viene ricalcolato in silenzio con lo standard corrente:
    <ul style="margin:6px 0 0 18px">${anomalie.map(a => `<li>${a}</li>`).join('')}</ul></div>` : '';
  if(!STATO.registrazioni.length){ box.innerHTML = bannerAnomalie + '<p class="vuoto">Nessuna scrittura ancora — vai su "Nuova Registrazione".</p>'; return; }
  const ordinate = [...STATO.registrazioni].sort((a,b) => (a.data||'').localeCompare(b.data||'') || a.id - b.id);
  const centroCella = r => {
    if(r.rifCOGS){ const x = r.rifCOGS, com = STATO.commesse.find(c => String(c.id) === String(x.commessaId));
      return `nessun centro · COGS ord. ${x.ordine || '—'}${com ? ' · ' + com.codice : ''} · DDT ${(x.ddt || []).join(', ') || '—'}${x.lotti && x.lotti.length ? ' · lotti ' + x.lotti.map(l => l === 0 ? 'giac. iniziale' : 'prod. n° ' + l).join(', ') : ''}`; }
    return (nomeCentroCosto(r.centroCostoId) || nomeCentroRicavo(r.centroRicavoId) || (r.nota ? '' : '—')) + (r.nota ? (r.centroCostoId ? ' · ' : '') + r.nota : '');
  };
  const rigaSnapshot = reg => {
    const s = reg.snapshotCosto; if(!s) return '';
    if(s.legacy) return `<p class="aiuto" style="margin-top:6px">Costo storico <b>legacy</b>: ${s.costoTotale != null ? euro(s.costoTotale) + ` (${(s.costoUnitarioLotto || 0).toLocaleString('it-IT', {maximumFractionDigits:5})} €/pz, letto dal Dare 13)` : '<span style="color:var(--rosso)">non verificabile</span>'} · ripartizione Taglio/Saldatura non ricostruita.</p>`;
    if(s.pp) return `<p class="aiuto" style="margin-top:6px">Costo standard congelato (distinta v.${s.versioneDistinta}, ordine PP ${s.ordinePP}): ${(s.componenti || []).map(c => `${c.mat} ${euro(c.cent)}`).concat(s.operazioni.map(o => `${o.centroNome} ${euro((o.costoStdPersonaleTot || 0) + (o.costoStdGeneraliTot || 0))}`)).join(' + ')} = <b>${euro(s.costoTotale)}</b> · ${s.quantita} pz × ${euro(s.costoUnitario)}/pz (Dare 13).</p>`;
    return `<p class="aiuto" style="margin-top:6px">Costo standard congelato (distinta v.${s.versioneDistinta}): materiale ${euro(s.materiale.costoStdPezzo)}${s.operazioni.map(o => ` + ${o.centroNome} ${euro(o.costoPezzo)}`).join('')} = <b>${euro(s.costoUnitario)}/pz</b> · ${s.quantita} pz = ${euro(s.costoTotale)} (Dare 13).</p>`;
  };
  box.innerHTML = bannerAnomalie + ordinate.map(reg => `
    <div class="riquadro" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <div><b>${reg.descrizione}</b>${reg.annullataDa ? ` <span class="badge no">stornata con la n° ${reg.annullataDa}</span>` : ''} <span class="aiuto">(${({ACQUISTO:'Acquisto',VENDITA:'Vendita',PRODUZIONE:'Produzione / addebito commessa',CARICAMENTO_CENTRI:'Caricamento costi centri',GENERICA:'Scrittura generica',DDT_VENDITA:'DDT / uscita merci (SD)',FATTURA_ATTIVA:'Vendita (SD)',INCASSO_SD:'Incasso cliente (SD)',PP_261:'PP — prelievo 261',PP_CO11N:'PP — conferma CO11N',PP_101:'PP — entrata semilavorato 101',PP_WIP:'PP — WIP di fine periodo (CO88)',PP_KO88:'PP — liquidazione varianze (CO88)',PP_STORNO:'PP — storno',MIGO:'MIGO — entrata merci (MM)',MIRO:'MIRO — fattura fornitore (MM)',PAGAMENTO_MM:'Pagamento fornitore (MM)'})[reg.tipo] || reg.tipo})</span></div>
        <div style="display:flex;align-items:baseline;gap:10px">
          <div class="cifre" style="font-size:12.5px">${(reg.data||'').split('-').reverse().join('/')}</div>
          <button class="azione secondaria" style="padding:2px 8px;font-size:12px;border-color:var(--rosso);color:var(--rosso)" onclick="eliminaRegistrazione(${reg.id})">🗑️ Elimina</button>
        </div>
      </div>
      <table class="registro">
        <thead><tr><th>Conto</th><th class="num">Dare</th><th class="num">Avere</th><th>Centro / riferimenti</th></tr></thead>
        <tbody>${reg.righe.map(r => `<tr>
          <td>${nomeConto(r.conto)}</td>
          <td class="num cifre dare">${r.dareAvere==='DARE' ? euro(r.importo) : ''}</td>
          <td class="num cifre avere">${r.dareAvere==='AVERE' ? euro(r.importo) : ''}</td>
          <td class="aiuto">${centroCella(r)}</td>
        </tr>`).join('')}</tbody>
      </table>${rigaSnapshot(reg)}
    </div>`).join('');
}
// Cancella una scrittura già registrata — serve a correggere doppioni o
// errori senza dover ripartire da zero con "Ripristina". Irreversibile:
// chiede sempre conferma. Aggiorna tutto ciò che dipende dal Libro
// Giornale (Mastro, Bilancio di Verifica, Report, Controllo Mensile).
function eliminaRegistrazione(id){
  const reg = STATO.registrazioni.find(r => r.id === id);
  if(!reg) return;
  // Le scritture dell'ordine di produzione non si cancellano dal Libro Giornale: si stornano da PP (CO13 / MBST / annullamento CO88)
  if(reg.originePP){ mostraToast(`⚠️ La scrittura n° ${reg.id} nasce dall'ordine di produzione ${reg.originePP.ordine}: si annulla da PP con uno storno, non si elimina.`, true); return; }
  // Un caricamento di costi non si elimina se le produzioni già registrate ne hanno scaricato una parte (il malloppo andrebbe in negativo)
  const chiavi = {}; (reg.righe || []).forEach(r => { if((r.conto === '51' || r.conto === '52') && r.dareAvere === 'DARE' && r.centroCostoId) chiavi[`${r.centroCostoId}|${r.conto}`] = 1; });
  for(const k of Object.keys(chiavi)){ const [c, conto] = k.split('|'); if(saldoMinimoPool(c, conto, null, [id]) < -0.005){ mostraToast(`⚠️ Non puoi eliminare questa scrittura: ${nomeCentroCosto(c)} (conto ${conto}) ne ha già scaricato una parte con produzioni registrate. Elimina prima le produzioni collegate.`, true); return; } }
  if(reg.tipo === 'PRODUZIONE' && reg.dettaglioProduzione && window.SDMM && SDMM.pfFisico){
    const q = reg.dettaglioProduzione.quantita || 0, dopo = SDMM.pfFisico() - q;
    if(dopo < SDMM.inSpedizione() || dopo < 0){ mostraToast(`⚠️ Non puoi eliminare questa produzione: i suoi ${q} pz sono già usciti o sono in area di spedizione (giacenza dopo l'eliminazione ${dopo} pz, in spedizione ${SDMM.inSpedizione()} pz).`, true); return; }
  }
  if(!confirm(`Eliminare la scrittura "${reg.descrizione}" del ${(reg.data||'').split('-').reverse().join('/')}? Operazione irreversibile.`)) return;
  STATO.registrazioni = STATO.registrazioni.filter(r => r.id !== id);
  const esitoATP = (reg.tipo === 'PRODUZIONE' && window.SDMM && SDMM.ricalcolaATP) ? SDMM.ricalcolaATP(`eliminata la produzione n° ${reg.id}`) : [];
  salvaStato();
  renderGiornale();
  mostraToast('🗑️ Scrittura eliminata' + (esitoATP.length ? ' · ATP ordini SD aggiornata: ' + esitoATP.join(' · ') : ''));
}

// ═══════════════════════════════════════════════════════════════════════
// MASTRO
// ═══════════════════════════════════════════════════════════════════════
function inizializzaSelettoreMastro(){
  document.getElementById('mastro-conto').innerHTML = opzioniConti();
}
function renderMastro(){
  const codiceConto = document.getElementById('mastro-conto').value;
  const box = document.getElementById('mastro-tabella');
  const movimenti = [];
  STATO.registrazioni.forEach(reg => {
    reg.righe.forEach(r => { if(String(r.conto) === String(codiceConto)) movimenti.push({...r, data: reg.data, descrizione: reg.descrizione}); });
  });
  movimenti.sort((a,b) => (a.data||'').localeCompare(b.data||''));
  if(!movimenti.length){ box.innerHTML = '<p class="vuoto">Nessun movimento per questo conto.</p>'; return; }
  let saldo = 0;
  const righeHtml = movimenti.map(m => {
    saldo += m.dareAvere === 'DARE' ? m.importo : -m.importo;
    return `<tr>
      <td class="cifre">${(m.data||'').split('-').reverse().join('/')}</td>
      <td>${m.descrizione}</td>
      <td class="num cifre dare">${m.dareAvere==='DARE' ? euro(m.importo) : ''}</td>
      <td class="num cifre avere">${m.dareAvere==='AVERE' ? euro(m.importo) : ''}</td>
      <td class="num cifre">${euro(saldo)}</td>
    </tr>`;
  }).join('');
  box.innerHTML = `<table class="registro"><thead><tr><th>Data</th><th>Descrizione</th><th class="num">Dare</th><th class="num">Avere</th><th class="num">Saldo progressivo</th></tr></thead><tbody>${righeHtml}</tbody></table>`;
}

// ═══════════════════════════════════════════════════════════════════════
// BILANCIO DI VERIFICA
// ═══════════════════════════════════════════════════════════════════════
function renderBilancio(){
  const totali = {};
  STATO.pianoDeiConti.forEach(c => totali[c.codice] = {dare:0, avere:0});
  STATO.registrazioni.forEach(reg => reg.righe.forEach(r => {
    if(!totali[r.conto]) totali[r.conto] = {dare:0, avere:0};
    totali[r.conto][r.dareAvere==='DARE' ? 'dare' : 'avere'] += r.importo;
  }));
  let totDareGen = 0, totAvereGen = 0;
  const righe = STATO.pianoDeiConti.map(c => {
    const t = totali[c.codice];
    totDareGen += t.dare; totAvereGen += t.avere;
    const saldo = t.dare - t.avere;
    return `<tr>
      <td class="cifre">${c.codice}</td><td>${c.nome}</td><td class="aiuto">${c.tipo}</td>
      <td class="num cifre">${euro(t.dare)}</td><td class="num cifre">${euro(t.avere)}</td>
      <td class="num cifre" style="font-weight:700">${euro(saldo)}</td>
    </tr>`;
  }).join('');
  const quadra = Math.abs(totDareGen - totAvereGen) < 0.005;
  document.getElementById('tab-bilancio').innerHTML = `
    <table class="registro">
      <thead><tr><th>Codice</th><th>Conto</th><th>Tipo</th><th class="num">Tot. Dare</th><th class="num">Tot. Avere</th><th class="num">Saldo</th></tr></thead>
      <tbody>${righe}
        <tr><td colspan="3" style="font-weight:700">TOTALE GENERALE</td>
          <td class="num cifre" style="font-weight:700">${euro(totDareGen)}</td>
          <td class="num cifre" style="font-weight:700">${euro(totAvereGen)}</td>
          <td class="num">${quadra ? '<span class="badge ok">✓ Quadra</span>' : '<span class="badge no">⚠ Non quadra</span>'}</td>
        </tr>
      </tbody>
    </table>`;
}
