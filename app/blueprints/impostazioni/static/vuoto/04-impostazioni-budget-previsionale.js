/* Generato da tools/split_simulatore.py (vuoto) — non modificare a mano: modifica sorgenti/ e rilancia. */
// ═══════════════════════════════════════════════════════════════════════
// IMPOSTAZIONI — Piano dei Conti
// ═══════════════════════════════════════════════════════════════════════
function renderPianoDeiConti(){
  const tab = document.getElementById('tab-piano-conti');
  tab.innerHTML = '<thead><tr><th>Codice</th><th>Conto</th><th>Tipo</th></tr></thead><tbody>' +
    STATO.pianoDeiConti.map(c => `<tr><td class="cifre">${c.codice}</td><td>${c.nome}</td><td>${c.tipo}</td></tr>`).join('') +
    '</tbody>';
}

// ── Centri di Costo ──────────────────────────────────────────────────────
function renderCentriCosto(){
  const box = document.getElementById('lista-centri-costo');
  if(!STATO.centriDiCosto.length){ box.innerHTML = '<p class="vuoto">Nessun centro di costo ancora.</p>'; return; }
  box.innerHTML = STATO.centriDiCosto.map(c => {
    const centroALavorazione = STATO.distintaBase.ciclo.some(r => r.centroCostoId === c.id);
    if(!centroALavorazione){
      // Centro senza riga nel ciclo (es. Spese Generali): non ha ore né
      // organico, il suo unico numero è "Spese generali annue" nel Budget
      // Annuo — lo mostra da lì in diretta, non da un campo suo separato,
      // per non ritrovarsi mai più due valori diversi per la stessa cosa.
      return `<div style="border-bottom:1px solid var(--riga);padding:8px 0" id="centro-costo-riga-${c.id}">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <b>${c.nome}</b>
          <span class="cifre" style="font-size:12.5px">${euro(STATO.budgetAnnuo.speseGeneraliAnnue||0)}/anno</span>
        </div>
        <div class="aiuto">Centro non a lavorazione (nessuna riga nel ciclo): il suo valore è "Spese generali annue" nel
          Budget Annuo, non un campo qui — modificalo da lì.</div>
      </div>`;
    }
    return `
    <div style="border-bottom:1px solid var(--riga);padding:8px 0" id="centro-costo-riga-${c.id}">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <b>${c.nome}</b>
        <span class="cifre" style="font-size:12.5px">${euro(tariffaOraria(c))} / ora</span>
      </div>
      <div class="aiuto">${c.numeroAddetti||0} addett${(c.numeroAddetti||0)===1?'o':'i'} × ${euro(c.stipendioMensileStandard)}/mese std
        × ${c.oreStandardAnnuePerAddetto||0} ore/anno std ciascuno →
        personale ${euro(c.costoPersonaleAnnuo)}/anno + generali ${euro(c.costoGeneraleAnnuo)}/anno,
        su ${c.oreAnnuePreviste} ore/anno previste in totale</div>
      <div style="margin-top:4px"><button class="azione secondaria" style="padding:3px 10px;font-size:12px" onclick="apriFormModificaCentroCosto(${c.id})">✏️ Modifica organico e standard</button>
        ${(c.numeroAddetti||0) > 1 ? `<button class="azione secondaria" style="padding:3px 10px;font-size:12px;border-color:var(--rosso);color:var(--rosso)" onclick="resetOrganicoUnAddetto(${c.id})">🔄 Reset organico a 1 addetto</button>` : ''}</div>
      <div id="form-modifica-centro-${c.id}" style="display:none;margin-top:10px"></div>
    </div>`;
  }).join('');
}
function apriFormCentroCosto(){
  const box = document.getElementById('form-centro-costo');
  box.style.display = 'block';
  box.innerHTML = `
    <div class="riga-campi">
      <div class="campo"><label>Nome centro</label><input type="text" id="cc-nome" placeholder="es. Verniciatura"></div>
      <div class="campo"><label>N. addetti oggi</label><input class="cifre" type="number" id="cc-addetti" value="1"></div>
      <div class="campo"><label>Costo azienda mensile standard (€/persona)</label><input class="cifre" type="number" id="cc-stipendio"></div>
      <div class="campo"><label>Ore standard/anno per addetto</label><input class="cifre" type="number" id="cc-ore-persona" value="1700"></div>
      <div class="campo"><label>Costi generali annui (€)</label><input class="cifre" type="number" id="cc-generali"></div>
    </div>
    <p class="aiuto">Costo personale e ore annue totali del centro si calcolano da soli: addetti × stipendio mensile ×
      12, e addetti × ore standard/anno — è la stessa logica con cui, più avanti nel Budget Annuo, LTP propone quante
      persone in più assumere se il volume pianificato non ci sta nella capacità di oggi.</p>
    <button class="azione secondaria" onclick="salvaNuovoCentroCosto()">💾 Salva centro di costo</button>`;
}
function salvaNuovoCentroCosto(){
  const nome = document.getElementById('cc-nome').value.trim();
  if(!nome){ mostraToast('⚠️ Dai un nome al centro di costo', true); return; }
  const centro = {
    id: STATO.prossimoIdCentroCosto++, nome,
    numeroAddetti: parseFloat(document.getElementById('cc-addetti').value) || 0,
    stipendioMensileStandard: parseFloat(document.getElementById('cc-stipendio').value) || 0,
    oreStandardAnnuePerAddetto: parseFloat(document.getElementById('cc-ore-persona').value) || 0,
    costoGeneraleAnnuo: parseFloat(document.getElementById('cc-generali').value) || 0,
  };
  ricalcolaCentroCosto(centro);
  STATO.centriDiCosto.push(centro);
  document.getElementById('form-centro-costo').style.display = 'none';
  ricalcolaDistintaBase(); renderCentriCosto(); renderBudgetAnnuo(); mostraToast('✅ Centro di costo aggiunto');
}

// ── Modifica organico e standard di un centro di costo esistente — è qui
// che si "applicano" a mano le assunzioni proposte da LTP nel Budget
// Annuo, o si corregge lo stipendio/le ore standard senza ricrearlo. ──────
function apriFormModificaCentroCosto(id){
  const centro = STATO.centriDiCosto.find(c => c.id === id);
  if(!centro) return;
  const box = document.getElementById(`form-modifica-centro-${id}`);
  box.style.display = 'block';
  box.innerHTML = `
    <div class="riga-campi">
      <div class="campo"><label>N. addetti</label><input class="cifre" type="number" id="mcc-addetti-${id}" value="${centro.numeroAddetti||0}"></div>
      <div class="campo"><label>Costo azienda mensile standard (€/persona)</label><input class="cifre" type="number" id="mcc-stipendio-${id}" value="${centro.stipendioMensileStandard||0}"></div>
      <div class="campo"><label>Ore standard/anno per addetto</label><input class="cifre" type="number" id="mcc-ore-persona-${id}" value="${centro.oreStandardAnnuePerAddetto||0}"></div>
      <div class="campo"><label>Costi generali annui (€)</label><input class="cifre" type="number" id="mcc-generali-${id}" value="${centro.costoGeneraleAnnuo||0}"></div>
    </div>
    <button class="azione secondaria" onclick="salvaModificaCentroCosto(${id})">💾 Salva modifiche</button>
    <button class="azione secondaria" onclick="document.getElementById('form-modifica-centro-${id}').style.display='none'">Annulla</button>`;
}
function salvaModificaCentroCosto(id){
  const centro = STATO.centriDiCosto.find(c => c.id === id);
  if(!centro) return;
  centro.numeroAddetti = parseFloat(document.getElementById(`mcc-addetti-${id}`).value) || 0;
  centro.stipendioMensileStandard = parseFloat(document.getElementById(`mcc-stipendio-${id}`).value) || 0;
  centro.oreStandardAnnuePerAddetto = parseFloat(document.getElementById(`mcc-ore-persona-${id}`).value) || 0;
  centro.costoGeneraleAnnuo = parseFloat(document.getElementById(`mcc-generali-${id}`).value) || 0;
  ricalcolaCentroCosto(centro);
  document.getElementById(`form-modifica-centro-${id}`).style.display = 'none';
  ricalcolaDistintaBase(); renderCentriCosto(); renderBudgetAnnuo();
  mostraToast('✅ Centro di costo aggiornato');
}

// ── Centri di Ricavo ──────────────────────────────────────────────────────
function renderCentriRicavo(){
  const box = document.getElementById('lista-centri-ricavo');
  if(!STATO.centriDiRicavo.length){ box.innerHTML = '<p class="vuoto">Nessun centro di ricavo ancora.</p>'; return; }
  box.innerHTML = STATO.centriDiRicavo.map(c => `<div style="padding:5px 0;border-bottom:1px solid var(--riga)">${c.nome}</div>`).join('');
}
function aggiungiCentroRicavo(){
  const input = document.getElementById('nuovo-centro-ricavo');
  const nome = input.value.trim();
  if(!nome){ mostraToast('⚠️ Scrivi un nome', true); return; }
  STATO.centriDiRicavo.push({id: STATO.prossimoIdCentroRicavo++, nome});
  input.value = '';
  salvaStato(); renderCentriRicavo(); mostraToast('✅ Centro di ricavo aggiunto');
}

// ── Distinta Base / Costo Standard ────────────────────────────────────────
// Ogni riga del ciclo è un'OPERAZIONE con ID stabile: si valorizza con la tariffa
// personale (pool 51) e la tariffa generali (pool 52) del SUO centro, separate.
function renderCicloLavoro(){
  const tab = document.getElementById('tab-ciclo-lavoro');
  tab.innerHTML = STATO.distintaBase.ciclo.map((r, i) => {
    const centro = STATO.centriDiCosto.find(c => c.id === r.centroCostoId);
    const tp = centro ? tariffaPersonale(centro) : 0, tg = centro ? tariffaGenerali(centro) : 0;
    return `<tr>
      <td><b class="cifre">${r.opId || '<span style="color:var(--rosso)">manca ID</span>'}</b>
        <input type="text" class="cella-editabile" style="width:120px;margin-left:6px" value="${String(r.descrizione || '').replace(/"/g, '&quot;')}"
          onchange="STATO.distintaBase.ciclo[${i}].descrizione = this.value.trim(); ricalcolaDistintaBase()"></td>
      <td>
        <select onchange="STATO.distintaBase.ciclo[${i}].centroCostoId = parseInt(this.value); ricalcolaDistintaBase()">
          ${centro ? '' : '<option value="" selected>— centro non valido —</option>'}
          ${STATO.centriDiCosto.map(c => `<option value="${c.id}" ${c.id===r.centroCostoId?'selected':''}>${c.nome}</option>`).join('')}
        </select>
      </td>
      <td><select onchange="STATO.distintaBase.ciclo[${i}].produce = this.value; ricalcolaDistintaBase()">
          <option value="SL" ${r.produce==='SL'?'selected':''}>SL-TAGLIO (semilavorato)</option><option value="PIEGA" ${r.produce==='PIEGA'?'selected':''}>SL-PIEGA (piegati)</option><option value="PF" ${!['SL','PIEGA'].includes(r.produce)?'selected':''}>TRANSENNA (prodotto finito)</option></select></td>
      <td><input class="cifre cella-editabile" type="number" step="0.01" min="0" value="${r.oreStandard}"
            onchange="const v = parseFloat(this.value); if(!(v >= 0)){ mostraToast('⚠️ Le ore standard devono essere un numero non negativo', true); this.value = STATO.distintaBase.ciclo[${i}].oreStandard; return; } STATO.distintaBase.ciclo[${i}].oreStandard = v; ricalcolaDistintaBase()"></td>
      <td class="num cifre">${euro(tp)}</td>
      <td class="num cifre">${euro(tg)}</td>
      <td class="num cifre">${euro((tp + tg) * (Number(r.oreStandard) || 0))}</td>
    </tr>`;
  }).join('');
  const v = validaCiclo(), box = document.getElementById('ciclo-avvisi');
  if(box) box.innerHTML = v.errori.concat(v.avvisi).length ? `<div class="riquadro" style="border-color:${v.errori.length ? 'var(--rosso)' : 'var(--oro)'};padding:9px;margin-bottom:12px">
    ${v.errori.map(e => `<div>⛔ ${e}</div>`).join('')}${v.avvisi.map(e => `<div>⚠️ ${e}</div>`).join('')}
    ${v.errori.length ? '<div class="aiuto">Finché ci sono errori nel ciclo la dichiarazione di produzione è bloccata.</div>' : ''}</div>` : '';
}
// Legge PRIMA i valori scritti dall'utente, li valida e solo dopo aggiorna stato e interfaccia
function ricalcolaDistintaBase(){
  const inKg = document.getElementById('dm-kg-ferro'), inPr = document.getElementById('dm-costo-ferro');
  const leggi = (el, attuale) => (el && String(el.value).trim() !== '') ? Number(el.value) : NaN;
  const kg = leggi(inKg), pr = leggi(inPr);
  if(!isFinite(kg) || kg < 0 || !isFinite(pr) || pr < 0){
    mostraToast('⚠️ Kg per transenna e costo standard del ferro devono essere numeri non negativi: valore non accettato.', true);
  }else{
    STATO.distintaBase.kgFerro = kg;
    STATO.distintaBase.costoFerro = pr;
  }
  if(inKg) inKg.value = STATO.distintaBase.kgFerro;
  if(inPr) inPr.value = STATO.distintaBase.costoFerro;
  aggiornaVersioneDistinta();

  const d = costoStandardDettaglio();
  document.getElementById('dm-costo-materiale').textContent = euro(d.materiale.costoStdPezzo);
  document.getElementById('riep-costo-materiale').textContent = euro(d.materiale.costoStdPezzo);
  document.getElementById('riep-costo-lavorazione').textContent = euro(d.costoLavorazionePezzo);
  document.getElementById('riep-costo-standard').textContent = euro(d.costoUnitario);
  const comp = document.getElementById('riep-composizione');
  if(comp) comp.innerHTML = `Distinta <b>v.${d.versione}</b>${d.dataVersione ? ' del ' + d.dataVersione.split('-').reverse().join('/') : ''} · composizione: materiale ${euro(d.materiale.costoStdPezzo)}`
    + d.operazioni.map(o => ` + ${o.opId} ${o.centroNome} ${euro(o.costoPezzo)} <span class="aiuto">(personale ${euro(o.costoPersonalePezzo)} + generali ${euro(o.costoGeneraliPezzo)})</span>`).join('')
    + ` = <b>${euro(d.costoUnitario)}</b> per pezzo. Le produzioni già registrate conservano il costo della propria versione.`;
  renderCicloLavoro();
  salvaStato();
  renderStatoPatrimonialeIniziale();
}
function costoStandardTransenna(){
  return costoStandardDettaglio().costoUnitario;
}

function inizializzaImpostazioni(){
  document.getElementById('dm-kg-ferro').value = STATO.distintaBase.kgFerro;
  document.getElementById('dm-costo-ferro').value = STATO.distintaBase.costoFerro;
  renderPianoDeiConti(); renderCentriCosto(); renderCentriRicavo(); renderCommesse(); renderStatoPatrimonialeIniziale(); ricalcolaDistintaBase();
}

// ── Stato Patrimoniale Iniziale ─────────────────────────────────────────
function renderStatoPatrimonialeIniziale(){
  const spi = STATO.statoPatrimonialeIniziale;
  document.getElementById('spi-cassa').value = spi.cassa0 || '';
  document.getElementById('spi-clienti').value = spi.clienti0 || '';
  document.getElementById('spi-mp-kg').value = spi.magazzinoMP_kg0 || '';
  document.getElementById('spi-pf-unita').value = spi.magazzinoPF_unita0 || '';
  document.getElementById('spi-fornitori').value = spi.fornitori0 || '';

  const attivo = (spi.cassa0||0) + (spi.clienti0||0) + (spi.magazzinoMP_kg0||0)*STATO.distintaBase.costoFerro + (spi.magazzinoPF_unita0||0)*(Number(spi.costoUnitarioPF0) > 0 ? Number(spi.costoUnitarioPF0) : costoStandardTransenna());
  const passivo = spi.fornitori0 || 0;
  document.getElementById('spi-attivo').textContent = euro(attivo);
  document.getElementById('spi-passivo').textContent = euro(passivo);
  document.getElementById('spi-netto').textContent = euro(attivo - passivo);
}
function salvaStatoPatrimonialeIniziale(){if(STATO.fi?.annual?.years?.length){mostraToast('Saldi iniziali congelati dopo la chiusura annuale: non modificarli retroattivamente.',true);return;}
  const spi = STATO.statoPatrimonialeIniziale;
  spi.cassa0 = parseFloat(document.getElementById('spi-cassa').value) || 0;
  spi.clienti0 = parseFloat(document.getElementById('spi-clienti').value) || 0;
  spi.magazzinoMP_kg0 = parseFloat(document.getElementById('spi-mp-kg').value) || 0;
  spi.magazzinoPF_unita0 = parseFloat(document.getElementById('spi-pf-unita').value) || 0;
  spi.fornitori0 = parseFloat(document.getElementById('spi-fornitori').value) || 0;
  salvaStato(); renderStatoPatrimonialeIniziale();
}

// ── Commesse ──────────────────────────────────────────────────────────────
function renderCommesse(){
  const tab = document.getElementById('tab-commesse');
  if(!STATO.commesse.length){ tab.innerHTML = '<tr><td class="vuoto">Nessuna commessa ancora: si aprono da PP → CO01.</td></tr>'; return; }
  tab.innerHTML = '<thead><tr><th>Codice</th><th>Descrizione</th><th class="num">Quantità pianificata</th><th>Stato</th><th></th></tr></thead><tbody>' +
    STATO.commesse.map(c => {
      const chiusa = c.stato === 'chiusa';
      return `<tr>
        <td class="cifre">${c.codice}</td><td>${c.descrizione}</td><td class="num cifre">${c.quantitaPianificata}</td>
        <td>${chiusa ? '<span class="badge no">🔒 Chiusa</span>' : '<span class="badge ok">🔓 Aperta</span>'}</td>
        <td><button class="azione secondaria" style="padding:3px 10px;font-size:12px" onclick="toggleStatoCommessa(${c.id})">${chiusa ? 'Riapri' : 'Chiudi'}</button> <button class="azione secondaria" style="padding:3px 10px;font-size:12px;border-color:var(--rosso);color:var(--rosso)" onclick="eliminaCommessa(${c.id})">Elimina</button></td>
      </tr>`;
    }).join('') +
    '</tbody>';
}
function aggiungiCommessa(){
  const codice = document.getElementById('com-codice').value.trim();
  const descrizione = document.getElementById('com-descrizione').value.trim();
  const quantita = parseFloat(document.getElementById('com-quantita').value) || 0;
  if(window.Fabbisogno){const err=Fabbisogno.errore(quantita,true);if(err){mostraToast(err,true);return;}}
  if(!codice){ mostraToast('⚠️ Dai un codice alla commessa', true); return; }
  STATO.commesse.push({id: STATO.prossimoIdCommessa++, codice, descrizione, quantitaPianificata: quantita, stato:'aperta'});
  document.getElementById('com-codice').value = ''; document.getElementById('com-descrizione').value = ''; document.getElementById('com-quantita').value = '';
  salvaStato(); renderCommesse(); mostraToast('✅ Commessa aggiunta');
}
// Chiudere una commessa la toglie dalle scelte per NUOVE Dichiarazioni di
// Produzione e Fatture di Vendita (resta comunque nello storico e nel
// Report Commesse) — è il modo per dire "questo lotto è concluso, non ci
// registro più sopra nulla". Riapribile in ogni momento.
function toggleStatoCommessa(id){
  const c = STATO.commesse.find(x => x.id === id);
  if(!c) return;
  c.stato = (c.stato === 'chiusa') ? 'aperta' : 'chiusa';
  salvaStato(); renderCommesse(); cambiaTipoRegistrazione();
  mostraToast(c.stato === 'chiusa' ? `🔒 Commessa ${c.codice} chiusa` : `🔓 Commessa ${c.codice} riaperta`);
}
function commesseAperte(){
  return STATO.commesse.filter(c => c.stato !== 'chiusa');
}

// ── Budget Annuo di Produzione ────────────────────────────────────────────
// La tabella "Capacità" non si limita a segnalare lo sforamento (LTP di
// SAP: Capacity Evaluation) — quando la saturazione supera il 100% calcola
// anche QUANTO PERSONALE IN PIÙ servirebbe per reggere il volume pianificato
// (ore mancanti ÷ ore standard/anno di un singolo addetto, arrotondate per
// eccesso: una persona parziale non esiste) e, da lì, lo stipendio mensile
// standard di quel centro dà il costo annuo aggiuntivo — la stessa identica
// logica del Long Term Planning: capacità e costo del personale nascono
// insieme dallo stesso numero di teste, non si stimano separatamente.
function renderBudgetAnnuo(){
  document.getElementById('bud-volume').value = STATO.budgetAnnuo.volumeAnnuoPianificato || '';
  document.getElementById('bud-prezzo').value = STATO.budgetAnnuo.prezzoVenditaStandard || '';
  document.getElementById('bud-spese-generali').value = STATO.budgetAnnuo.speseGeneraliAnnue || '';
  document.getElementById('bud-rimanenza-mp').value = STATO.budgetAnnuo.rimanenzaFinaleDesiderataMP_kg || '';
  document.getElementById('bud-giorni-incasso').value = STATO.budgetAnnuo.giorniIncassoClienti || '';
  document.getElementById('bud-giorni-pagamento').value = STATO.budgetAnnuo.giorniPagamentoFornitori || '';
  document.getElementById('bud-aliquota-iva').value = STATO.budgetAnnuo.aliquotaIva ?? 22;
  const volume = STATO.budgetAnnuo.volumeAnnuoPianificato || 0;

  const righe = STATO.distintaBase.ciclo.map(r => {
    const centro = STATO.centriDiCosto.find(c => c.id === r.centroCostoId);
    if(!centro) return '';
    const oreRichieste = volume * r.oreStandard;
    const oreDisponibili = centro.oreAnnuePreviste || 0;
    const saturazione = oreDisponibili > 0 ? (oreRichieste / oreDisponibili * 100) : 0;
    const sforato = saturazione > 100;

    let rigaLTP = '';
    if(sforato){
      const oreMancanti = oreRichieste - oreDisponibili;
      const oreStdPersona = centro.oreStandardAnnuePerAddetto || 0;
      if(oreStdPersona > 0){
        const personeAggiuntive = Math.ceil(oreMancanti / oreStdPersona);
        const nuovoNumeroAddetti = (centro.numeroAddetti||0) + personeAggiuntive;
        const nuoveOreDisponibili = nuovoNumeroAddetti * oreStdPersona;
        const nuovaSaturazione = nuoveOreDisponibili > 0 ? (oreRichieste / nuoveOreDisponibili * 100) : 0;
        const costoAggiuntivoAnnuo = personeAggiuntive * (centro.stipendioMensileStandard||0) * 12;
        rigaLTP = `<tr>
          <td colspan="4" style="background:rgba(156,59,59,.06);border-top:none;padding-top:2px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap">
              <div>
                📋 <b>LTP — pianificazione capacità:</b> mancano ${oreMancanti.toFixed(0)} ore/anno a
                ${oreStdPersona.toFixed(0)} ore standard/persona servono
                <b>+${personeAggiuntive} addett${personeAggiuntive===1?'o':'i'}</b>
                (da ${centro.numeroAddetti||0} a ${nuovoNumeroAddetti}) →
                costo personale aggiuntivo <b class="cifre">${euro(costoAggiuntivoAnnuo)}/anno</b>
                (stipendio std. ${euro(centro.stipendioMensileStandard)}/mese × ${personeAggiuntive} × 12) —
                nuova saturazione <b class="cifre">${nuovaSaturazione.toFixed(0)}%</b>.
              </div>
              <button class="azione secondaria" style="white-space:nowrap" onclick="applicaPianificazioneCapacita(${centro.id})">
                👥 Assumi ${personeAggiuntive} e aggiorna il budget
              </button>
            </div>
          </td>
        </tr>`;
      } else {
        rigaLTP = `<tr><td colspan="4" style="background:rgba(156,59,59,.06)">
          ⚠️ Imposta le "Ore standard/anno per addetto" di ${centro.nome} (in Impostazioni → Centri di Costo) per far
          calcolare a LTP quante persone in più servono.
        </td></tr>`;
      }
    }

    return `<tr>
      <td>${centro.nome}</td>
      <td class="num cifre">${oreRichieste.toFixed(0)}</td>
      <td class="num cifre">${oreDisponibili.toFixed(0)}</td>
      <td class="num cifre" style="font-weight:700;color:${sforato?'var(--rosso)':'var(--verde)'}">${saturazione.toFixed(0)}%${sforato?' ⚠️':''}</td>
    </tr>${rigaLTP}`;
  }).join('');
  document.getElementById('tab-capacita-centri').innerHTML = `
    <thead><tr><th>Centro di costo</th><th class="num">Ore richieste dal budget</th><th class="num">Ore annue previste</th><th class="num">Saturazione</th></tr></thead>
    <tbody>${righe || '<tr><td class="vuoto" colspan="4">Configura prima la Distinta Base in Impostazioni.</td></tr>'}</tbody>`;

  renderBudgetAcquisti();
}

// Applica la proposta LTP: assume le persone mancanti nel centro di costo
// (ricalcolando costo personale e ore annue previste con lo stesso standard
// già in uso) e ridisegna tutto ciò che dipende da quel centro.
function applicaPianificazioneCapacita(centroId){
  const centro = STATO.centriDiCosto.find(c => c.id === centroId);
  if(!centro) return;
  const volume = STATO.budgetAnnuo.volumeAnnuoPianificato || 0;
  const riga = STATO.distintaBase.ciclo.find(r => r.centroCostoId === centroId);
  if(!riga){ mostraToast('⚠️ Nessuna riga di ciclo per questo centro', true); return; }
  const oreRichieste = volume * riga.oreStandard;
  const oreMancanti = oreRichieste - (centro.oreAnnuePreviste||0);
  const oreStdPersona = centro.oreStandardAnnuePerAddetto || 0;
  if(oreMancanti <= 0 || oreStdPersona <= 0) return;
  const personeAggiuntive = Math.ceil(oreMancanti / oreStdPersona);
  centro.numeroAddetti = (centro.numeroAddetti||0) + personeAggiuntive;
  ricalcolaCentroCosto(centro);
  ricalcolaDistintaBase();
  renderBudgetAnnuo(); renderCentriCosto();
  mostraToast(`✅ ${centro.nome}: assunte ${personeAggiuntive} persona/e, ora ${centro.numeroAddetti} addetti`);
}

// Reset incondizionato dell'organico a 1 addetto — utile per far
// ripartire l'esercizio da zero con un altro studente/gruppo senza dover
// ricostruire l'azienda: ricalcola costo personale e ore annue previste di
// conseguenza. Sempre disponibile, senza bisogno di nessuno storico.
function resetOrganicoUnAddetto(centroId){
  const centro = STATO.centriDiCosto.find(c => c.id === centroId);
  if(!centro) return;
  if(!confirm(`Riportare ${centro.nome} a 1 addetto (era ${centro.numeroAddetti})? Ricalcola costo personale e ore annue previste di conseguenza. Operazione irreversibile.`)) return;
  centro.numeroAddetti = 1;
  ricalcolaCentroCosto(centro);
  ricalcolaDistintaBase();
  renderBudgetAnnuo(); renderCentriCosto();
  mostraToast(`🔄 ${centro.nome}: organico riportato a 1 addetto`);
}

function salvaBudgetAnnuo(conferma){
  STATO.budgetAnnuo.volumeAnnuoPianificato = parseFloat(document.getElementById('bud-volume').value) || 0;
  STATO.budgetAnnuo.prezzoVenditaStandard = parseFloat(document.getElementById('bud-prezzo').value) || 0;
  STATO.budgetAnnuo.speseGeneraliAnnue = parseFloat(document.getElementById('bud-spese-generali').value) || 0;
  STATO.budgetAnnuo.rimanenzaFinaleDesiderataMP_kg = parseFloat(document.getElementById('bud-rimanenza-mp').value) || 0;
  STATO.budgetAnnuo.giorniIncassoClienti = parseFloat(document.getElementById('bud-giorni-incasso').value) || 0;
  STATO.budgetAnnuo.giorniPagamentoFornitori = parseFloat(document.getElementById('bud-giorni-pagamento').value) || 0;
  STATO.budgetAnnuo.aliquotaIva = parseFloat(document.getElementById('bud-aliquota-iva').value) || 0;
  salvaStato(); renderBudgetAnnuo();
  if(conferma) mostraToast('✅ Budget salvato — Capacità, Acquisti e Bilancio Previsionale aggiornati');
}

// ── Budget Acquisti — la formula classica: consumo previsto + rimanenza
// finale desiderata − rimanenza già in magazzino (dallo Stato
// Patrimoniale Iniziale) ────────────────────────────────────────────────
function renderBudgetAcquisti(){
  const volume = STATO.budgetAnnuo.volumeAnnuoPianificato || 0;
  const consumoPrevistoKg = STATO.distintaBase.kgFerro * volume;
  const rimanenzaFinaleKg = STATO.budgetAnnuo.rimanenzaFinaleDesiderataMP_kg || 0;
  const rimanenzaInizialeKg = STATO.statoPatrimonialeIniziale.magazzinoMP_kg0 || 0;
  const acquistiKg = consumoPrevistoKg + rimanenzaFinaleKg - rimanenzaInizialeKg;
  const acquistiEuro = acquistiKg * STATO.distintaBase.costoFerro;
  document.getElementById('tab-budget-acquisti').innerHTML = `
    <tbody>
      <tr><td>Consumo previsto dalla produzione</td><td class="num cifre">${consumoPrevistoKg.toFixed(1)} kg</td></tr>
      <tr><td>+ Rimanenza finale desiderata</td><td class="num cifre">${rimanenzaFinaleKg.toFixed(1)} kg</td></tr>
      <tr><td>− Rimanenza già in magazzino (Stato Patr. Iniziale)</td><td class="num cifre">${rimanenzaInizialeKg.toFixed(1)} kg</td></tr>
      <tr><td style="font-weight:700">= Acquisti da fare quest'anno</td><td class="num cifre" style="font-weight:700">${acquistiKg.toFixed(1)} kg — ${euro(acquistiEuro)}</td></tr>
    </tbody>`;
}

// ═══════════════════════════════════════════════════════════════════════
// BILANCIO PREVISIONALE — il "master budget" completo: dal Budget Annuo e
// dallo Stato Patrimoniale Iniziale, il conto economico e lo stato
// patrimoniale attesi a fine anno. Le formule sono state verificate a
// parte prima di scriverle qui (devono quadrare: Attivo = Passivo + Netto).
// ═══════════════════════════════════════════════════════════════════════
function renderBilancioPrevisionale(){
  const bud = STATO.budgetAnnuo, spi = STATO.statoPatrimonialeIniziale;
  const volume = bud.volumeAnnuoPianificato || 0;
  const prezzo = bud.prezzoVenditaStandard || 0;
  const costoStdUnit = costoStandardTransenna();

  const fatturato = volume * prezzo;
  const costoDelVenduto = volume * costoStdUnit;
  const margineIndustriale = fatturato - costoDelVenduto;

  // Variance di Capacità — la differenza tra quanto costa TENERE APERTO
  // un centro per un anno (il suo budget fisso) e quanto di quel costo
  // il volume pianificato riesce ad "assorbire" nel costo del venduto.
  // Se il volume supera la capacità reale (saturazione > 100%), il
  // costo assorbito supererebbe il budget fisso — un risultato che sulla
  // carta sembra un guadagno, ma è FISICAMENTE IRRAGGIUNGIBILE: da qui
  // l'avviso, non un numero silenzioso.
  const {varianceTotale: varianceCapacitaTotale, sforato: capacitaSforata} = calcolaVarianceCapacita(volume, 1);

  const speseGenerali = bud.speseGeneraliAnnue || 0;
  const redditoOperativo = margineIndustriale - varianceCapacitaTotale - speseGenerali;

  document.getElementById('avviso-capacita-previsionale').innerHTML = capacitaSforata ? `
    <div class="riquadro" style="border-color:var(--rosso);background:rgba(156,59,59,.08)">
      ⚠️ <b>Il volume pianificato supera la capacità reale di almeno un centro di costo</b> (vedi Budget Annuo → Capacità).
      Questo conto economico resta teorico: senza più ore disponibili (personale, straordinari), il volume pianificato non
      è fisicamente raggiungibile — la Variance di Capacità qui sotto lo mette in evidenza in numeri.
    </div>` : '';

  document.getElementById('tab-conto-economico-previsionale').innerHTML = `
    <tbody>
      <tr><td>Ricavi</td><td class="num cifre">${euro(fatturato)}</td></tr>
      <tr><td>− Costo del Venduto (a costo standard)</td><td class="num cifre">${euro(costoDelVenduto)}</td></tr>
      <tr><td style="font-weight:700">= Margine Industriale Lordo</td><td class="num cifre" style="font-weight:700">${euro(margineIndustriale)}</td></tr>
      <tr><td>${varianceCapacitaTotale<0?'+':'−'} Variance di Capacità (non sfruttata/sforata)</td>
        <td class="num cifre" style="color:${varianceCapacitaTotale<0?'var(--rosso)':'inherit'}">${euro(Math.abs(varianceCapacitaTotale))}</td></tr>
      <tr><td>− Spese Generali</td><td class="num cifre">${euro(speseGenerali)}</td></tr>
      <tr><td style="font-weight:700">= Reddito Operativo Previsionale</td>
        <td class="num cifre" style="font-weight:700;color:${redditoOperativo<0?'var(--rosso)':'var(--verde)'}">${euro(redditoOperativo)}</td></tr>
    </tbody>`;

  // Stato Patrimoniale Iniziale — ricalcolato qui per mostrarlo accanto al
  // Conto Economico, così il punto di partenza dell'anno resta sempre
  // visibile insieme al risultato che lo farà muovere.
  const attivo0 = (spi.cassa0||0) + (spi.clienti0||0) + (spi.magazzinoMP_kg0||0)*STATO.distintaBase.costoFerro + (spi.magazzinoPF_unita0||0)*costoStdUnit;
  const passivo0 = spi.fornitori0 || 0;
  const patrimonioNetto0 = attivo0 - passivo0;
  const quadra0 = Math.abs(attivo0 - (passivo0 + patrimonioNetto0)) < 1; // vero per costruzione: il Netto è il plug

  document.getElementById('tab-stato-patrimoniale-iniziale-previsionale').innerHTML = `
    <tbody>
      <tr><td style="font-weight:700" colspan="2">ATTIVO</td></tr>
      <tr><td>Cassa e Banche</td><td class="num cifre">${euro(spi.cassa0||0)}</td></tr>
      <tr><td>Clienti</td><td class="num cifre">${euro(spi.clienti0||0)}</td></tr>
      <tr><td>Magazzino Materie Prime</td><td class="num cifre">${euro((spi.magazzinoMP_kg0||0)*STATO.distintaBase.costoFerro)}</td></tr>
      <tr><td>Magazzino Prodotti Finiti</td><td class="num cifre">${euro((spi.magazzinoPF_unita0||0)*costoStdUnit)}</td></tr>
      <tr><td style="font-weight:700">Totale Attivo</td><td class="num cifre" style="font-weight:700">${euro(attivo0)}</td></tr>
      <tr><td style="font-weight:700;padding-top:14px" colspan="2">PASSIVO E NETTO</td></tr>
      <tr><td>Fornitori</td><td class="num cifre">${euro(passivo0)}</td></tr>
      <tr><td>Patrimonio Netto</td><td class="num cifre">${euro(patrimonioNetto0)}</td></tr>
      <tr><td style="font-weight:700">Totale Passivo + Netto</td><td class="num cifre" style="font-weight:700">${euro(passivo0+patrimonioNetto0)}</td></tr>
      <tr><td colspan="2" style="padding-top:10px">${quadra0 ? '<span class="badge ok">✓ Quadra</span>' : '<span class="badge no">⚠ Non quadra</span>'}</td></tr>
    </tbody>`;

  // Budget Acquisti (stessa formula di renderBudgetAcquisti, ricalcolata qui)
  const consumoPrevistoKg = STATO.distintaBase.kgFerro * volume;
  const rimanenzaFinaleKg = bud.rimanenzaFinaleDesiderataMP_kg || 0;
  const acquistiKg = consumoPrevistoKg + rimanenzaFinaleKg - (spi.magazzinoMP_kg0||0);
  const acquistiEuro = acquistiKg * STATO.distintaBase.costoFerro;

  // Stato Patrimoniale Previsionale (fine anno)
  const magazzinoMP_euro_finale = rimanenzaFinaleKg * STATO.distintaBase.costoFerro;
  const magazzinoPF_unita_finale = spi.magazzinoPF_unita0 || 0; // semplificazione: produzione = vendite nell'anno
  const magazzinoPF_euro_finale = magazzinoPF_unita_finale * costoStdUnit;

  const giorniIncasso = bud.giorniIncassoClienti || 0;
  const clienti_finale = fatturato * (giorniIncasso/365);
  const incassiAnno = (spi.clienti0||0) + fatturato - clienti_finale;

  const giorniPagamento = bud.giorniPagamentoFornitori || 0;
  const fornitori_finale = acquistiEuro * (giorniPagamento/365);
  const pagamentiFornitoriAnno = (spi.fornitori0||0) + acquistiEuro - fornitori_finale;

  const costoPersonaleAnnoPagato = STATO.centriDiCosto.reduce((s,c)=>s+(c.costoPersonaleAnnuo||0)+(c.costoGeneraleAnnuo||0), 0);
  const cassa_finale = (spi.cassa0||0) + incassiAnno - pagamentiFornitoriAnno - costoPersonaleAnnoPagato - speseGenerali;

  const patrimonioNetto_finale = patrimonioNetto0 + redditoOperativo;
  const attivo_finale = cassa_finale + clienti_finale + magazzinoMP_euro_finale + magazzinoPF_euro_finale;
  const passivoPiuNetto_finale = fornitori_finale + patrimonioNetto_finale;
  const quadra = Math.abs(attivo_finale - passivoPiuNetto_finale) < 1;

  // Il PONTE — ogni riga: da dove partiva, cosa l'ha mossa durante l'anno,
  // dove arriva. "movimenti" è un elenco di {segno, label, valore}: le
  // frecce di un vero cash-flow/riconciliazione patrimoniale, non un
  // numero calato dall'alto.
  const rigaPonte = (nome, iniziale, movimenti, finale, evidenzia) => `
    <tr>
      <td${evidenzia?' style="font-weight:700"':''}>${nome}</td>
      <td class="num cifre"${evidenzia?' style="font-weight:700"':''}>${euro(iniziale)}</td>
      <td>${movimenti.map(m => `<div style="font-size:12.5px;${m.attenua===false?'':'color:var(--testo-attenuato);'}white-space:nowrap">
            ${m.segno} ${m.label}: <span class="cifre">${euro(m.valore)}</span></div>`).join('') || '<span class="aiuto">— nessun movimento —</span>'}</td>
      <td class="num cifre"${evidenzia?' style="font-weight:700"':''}>${euro(finale)}</td>
    </tr>`;

  document.getElementById('tab-ponte-patrimoniale').innerHTML = `
    <thead><tr><th>Voce</th><th class="num">Iniziale</th><th>Movimento durante l'anno</th><th class="num">Finale (previsionale)</th></tr></thead>
    <tbody>
      <tr><td style="font-weight:700" colspan="4">ATTIVO</td></tr>
      ${rigaPonte('Cassa e Banche', spi.cassa0||0, [
        {segno:'+', label:'Incassato dai clienti', valore: incassiAnno},
        {segno:'−', label:'Pagato ai fornitori', valore: pagamentiFornitoriAnno},
        {segno:'−', label:'Costo del personale (centri di costo)', valore: costoPersonaleAnnoPagato},
        {segno:'−', label:'Spese generali', valore: speseGenerali},
      ], cassa_finale)}
      ${rigaPonte('Clienti', spi.clienti0||0, [
        {segno:'+', label:"Fatturato dell'anno (nuovi crediti)", valore: fatturato},
        {segno:'−', label:'Incassato dai clienti', valore: incassiAnno},
      ], clienti_finale)}
      ${rigaPonte('Magazzino Materie Prime', (spi.magazzinoMP_kg0||0)*STATO.distintaBase.costoFerro, [
        {segno:'+', label:"Acquisti dell'anno", valore: acquistiEuro},
        {segno:'−', label:'Consumato in produzione', valore: consumoPrevistoKg*STATO.distintaBase.costoFerro},
      ], magazzinoMP_euro_finale)}
      ${rigaPonte('Magazzino Prodotti Finiti', (spi.magazzinoPF_unita0||0)*costoStdUnit, [
        {segno:'+', label:"Prodotto nell'anno (a costo standard)", valore: costoDelVenduto},
        {segno:'−', label:"Venduto nell'anno (a costo standard)", valore: costoDelVenduto, attenua:false},
      ], magazzinoPF_euro_finale)}
      <tr><td colspan="4" class="aiuto" style="padding:2px 8px 10px">Produzione = vendite nell'anno per semplificazione: quanto entra in magazzino a costo standard è
        esattamente quanto ne esce, quindi il Magazzino Prodotti Finiti non si muove.</td></tr>
      ${rigaPonte('Totale Attivo', attivo0, [
        {segno: attivo_finale>=attivo0?'+':'−', label:"Variazione netta dell'Attivo", valore: Math.abs(attivo_finale-attivo0)},
      ], attivo_finale, true)}
      <tr><td style="font-weight:700;padding-top:14px" colspan="4">PASSIVO E NETTO</td></tr>
      ${rigaPonte('Fornitori', passivo0, [
        {segno:'+', label:"Acquisti dell'anno", valore: acquistiEuro},
        {segno:'−', label:'Pagato ai fornitori', valore: pagamentiFornitoriAnno},
      ], fornitori_finale)}
      ${rigaPonte('Patrimonio Netto', patrimonioNetto0, [
        {segno: redditoOperativo>=0?'+':'−', label:"Reddito Operativo Previsionale dell'anno", valore: Math.abs(redditoOperativo)},
      ], patrimonioNetto_finale)}
      ${rigaPonte('Totale Passivo + Netto', passivo0+patrimonioNetto0, [
        {segno: passivoPiuNetto_finale>=(passivo0+patrimonioNetto0)?'+':'−', label:'Variazione netta di Passivo + Netto', valore: Math.abs(passivoPiuNetto_finale-(passivo0+patrimonioNetto0))},
      ], passivoPiuNetto_finale, true)}
      <tr><td colspan="4" style="padding-top:10px">
        Iniziale: ${quadra0 ? '<span class="badge ok">✓ Quadra</span>' : '<span class="badge no">⚠ Non quadra</span>'} &nbsp;·&nbsp;
        Finale: ${quadra ? '<span class="badge ok">✓ Quadra</span>' : '<span class="badge no">⚠ Non quadra</span>'}
      </td></tr>
    </tbody>`;
}

// ═══════════════════════════════════════════════════════════════════════
// NUOVA REGISTRAZIONE — la vera partita doppia
// ═══════════════════════════════════════════════════════════════════════
let righeScritturaCorrente = [];
