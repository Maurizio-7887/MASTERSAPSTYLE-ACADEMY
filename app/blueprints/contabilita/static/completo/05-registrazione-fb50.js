/* Generato da tools/split_simulatore.py (completo) — non modificare a mano: modifica sorgenti/ e rilancia. */
function opzioniConti(){
  return STATO.pianoDeiConti.map(c => `<option value="${c.codice}">${c.codice} — ${c.nome}</option>`).join('');
}
function opzioniCentriCosto(vuoto){
  return (vuoto ? '<option value="">—</option>' : '') +
    STATO.centriDiCosto.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}
function opzioniCentriRicavo(vuoto){
  return (vuoto ? '<option value="">—</option>' : '') +
    STATO.centriDiRicavo.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
}

function cambiaTipoRegistrazione(){
  const tipo = document.getElementById('reg-tipo').value;
  const campoDesc = document.getElementById('reg-descrizione');
  if(campoDesc && tipo !== 'CARICAMENTO_CENTRI' && eDescrizioneAutomatica(campoDesc.value)) campoDesc.value = '';
  if(campoDesc) campoDesc.placeholder = tipo === 'PRODUZIONE' ? 'automatica: Dichiarazione di produzione – N pezzi – Produzione/addebito commessa (qui puoi aggiungere una nota)' : 'es. Fattura fornitore Acciaierie Rossi n. 118';
  const box = document.getElementById('reg-campi-specifici');
  if(!document.getElementById('reg-data').value){
    document.getElementById('reg-data').value = new Date().toISOString().slice(0,10);
  }
  if(tipo === 'CARICAMENTO_CENTRI'){
    const periodo = (document.getElementById('reg-data').value || new Date().toISOString().slice(0,10)).slice(0,7);
    const centri = STATO.centriDiCosto.filter(c => (c.costoPersonaleAnnuo||0) > 0 || (c.costoGeneraleAnnuo||0) > 0);
    box.innerHTML = `
      <div class="campo" style="max-width:260px"><label>Mese di competenza</label>
        <input type="month" id="car-periodo" value="${periodo}" onchange="proponiRigheCaricamentoCentri()"></div>
      <p class="aiuto">Prima si caricano in <b>DARE</b> i costi realmente maturati nel mese: conto 51 per i dipendenti e
        conto 52 per i costi generali di produzione. Le dichiarazioni di produzione li scaricheranno poi in <b>AVERE</b>,
        centro per centro, attribuendoli alle commesse. I valori proposti sono gli standard mensili, ma puoi sostituirli con
        i costi reali del cedolino o del periodo.</p>
      <table class="registro"><thead><tr><th>Centro di costo</th><th class="num">Pool personale semplificato PP (€) — NON cedolini</th><th class="num">Generali reali (€)</th></tr></thead>
        <tbody>${centri.map(c => `<tr><td>${c.nome}</td>
          <td><input class="cifre cella-editabile" type="number" step="0.01" id="car-pers-${c.id}" value="${((c.costoPersonaleAnnuo||0)/12).toFixed(2)}" oninput="proponiRigheCaricamentoCentri()"></td>
          <td><input class="cifre cella-editabile" type="number" step="0.01" id="car-gen-${c.id}" value="${((c.costoGeneraleAnnuo||0)/12).toFixed(2)}" oninput="proponiRigheCaricamentoCentri()"></td></tr>`).join('')}</tbody></table>
      <div id="car-avviso" style="margin-top:10px"></div>${guidaCentriHtml('CARICAMENTO')}`;
    if(!document.getElementById('reg-descrizione').value.trim()) document.getElementById('reg-descrizione').value = `Caricamento costi centri ${periodo}`;
    righeScritturaCorrente = [];
    proponiRigheCaricamentoCentri();
  }else if(tipo === 'ACQUISTO'){
    box.innerHTML = `
      <div class="riga-campi">
        <div class="campo"><label>Kg di ferro acquistati</label><input class="cifre" type="number" id="acq-kg" oninput="proponiRigheAcquisto()"></div>
        <div class="campo"><label>Prezzo REALE per kg (€)</label><input class="cifre" type="number" step="0.01" id="acq-prezzo" oninput="proponiRigheAcquisto()"></div>
      </div>
      <p class="aiuto">Il Magazzino Materie Prime entra sempre al prezzo STANDARD (${euro(STATO.distintaBase.costoFerro)}/kg, da Impostazioni →
        Distinta Base) sulla quantità realmente acquistata — mai al prezzo pagato. La differenza tra prezzo standard e prezzo
        reale diventa una riga di Variance Prezzo Acquisto separata, così il Magazzino resta sempre confrontabile con il
        costo standard usato ovunque nel simulatore (Budget Acquisti, Bilancio Previsionale). Nota bene: questa scrittura non
        addebita NESSUN centro di costo — il ferro è ancora fermo a magazzino, non consumato da nessun processo. Il centro di
        costo entra in gioco solo con la manodopera, e la Variance Materiale (conto 60) solo alla Dichiarazione di Produzione,
        quando il ferro viene davvero impiegato.</p>
      <button class="piccolo" onclick="proponiRigheAcquisto()">↻ Proponi le righe</button>
      <div id="acq-riepilogo-varianza" style="margin-top:10px"></div>`;
    righeScritturaCorrente = [];
  }else if(tipo === 'VENDITA'){
    box.innerHTML = `
      <div class="riga-campi">
        <div class="campo"><label>Commessa collegata (opzionale)</label><select id="ven-commessa" onchange="proponiRigheVendita()">
          <option value="">— nessuna, vendita generica —</option>
          ${commesseAperte().map(c => `<option value="${c.id}">${c.codice} — ${c.descrizione}</option>`).join('')}
        </select></div>
        <div class="campo"><label>Transenne vendute (pezzi)</label><input class="cifre" type="number" id="ven-pezzi" oninput="proponiRigheVendita()"></div>
        <div class="campo"><label>Prezzo REALE di vendita per pezzo (€)</label><input class="cifre" type="number" step="0.01" id="ven-prezzo" oninput="proponiRigheVendita()"></div>
      </div>
      <div class="riga-campi">
        <div class="campo"><label>Centro di ricavo</label><select id="ven-centro-ricavo" onchange="proponiRigheVendita()">${opzioniCentriRicavo()}</select></div>
      </div>
      <p class="aiuto">I Ricavi entrano sempre al prezzo STANDARD (${euro(STATO.budgetAnnuo.prezzoVenditaStandard||0)}/pezzo, da Budget Annuo) sui pezzi
        realmente venduti — i Clienti, invece, restano sempre al prezzo REALE (è quello che ci devono davvero pagare). La
        differenza è la Variance Prezzo di Vendita: se colleghi una commessa, quando i pezzi venduti coprono quelli
        pianificati puoi chiuderla da Impostazioni → Commesse.</p>
      <button class="piccolo" onclick="proponiRigheVendita()">↻ Proponi le righe</button>
      <div id="ven-riepilogo-varianza" style="margin-top:10px"></div>`;
    righeScritturaCorrente = [];
  }else if(tipo === 'PRODUZIONE'){
    if(!commesseAperte().length){
      box.innerHTML = formCommessaRapidaHtml('prod');
      righeScritturaCorrente = [];
    }else{
      box.innerHTML = `
        <div class="riga-campi">
          <div class="campo"><label>Commessa</label><select id="prod-commessa" onchange="proponiRigheProduzione()">
            ${commesseAperte().map(c => `<option value="${c.id}">${c.codice} — ${c.descrizione}</option>`).join('')}
          </select></div>
          <div class="campo"><label>Pezzi buoni prodotti</label><input class="cifre" type="text" inputmode="decimal" id="prod-quantita" placeholder="es. 3.700" oninput="proponiRigheProduzione()"></div>
          <div class="campo"><label>Kg di ferro REALMENTE usati</label><input class="cifre" type="text" inputmode="decimal" id="prod-kg-reale" placeholder="es. 29.600" oninput="proponiRigheProduzione()"></div>
        </div>
        <div class="riga-campi" id="prod-ore-centri"></div>
        ${guidaCentriHtml('PRODUZIONE')}
        <div id="prod-riepilogo-varianze" style="margin-top:10px"></div>
        <button class="piccolo" onclick="proponiRigheProduzione()">↻ Calcola varianze e proponi le righe</button>`;
      // Solo i centri COLLEGATI al ciclo di lavorazione hanno senso qui
      // (ore reali per pezzo prodotto) — un centro come "Spese Generali",
      // senza una riga nel ciclo, non produce nulla e non deve comparire.
      document.getElementById('prod-ore-centri').innerHTML = centriDelCiclo().map(c => {
        const ops = STATO.distintaBase.ciclo.filter(r => String(r.centroCostoId) === String(c.id)).map(r => r.opId).join(', ');
        return `<div class="campo"><label>Ore reali — ${c.nome} <span class="aiuto">(${ops})</span></label>
          <input class="cifre" type="text" inputmode="decimal" id="prod-ore-${c.id}" placeholder="es. 925" oninput="proponiRigheProduzione()"></div>`;
      }).join('');
      const vc = validaCiclo();
      if(vc.errori.length) document.getElementById('prod-riepilogo-varianze').innerHTML = `<div class="riquadro" style="border-color:var(--rosso);padding:9px">${vc.errori.map(e => `<div>⛔ ${e}</div>`).join('')}<div class="aiuto">Correggi il ciclo in Impostazioni → Distinta Base: finché ci sono errori la produzione non si registra.</div></div>`;
      window.__prodChiave = nuovaChiaveProduzione();   // chiave idempotente di QUESTA dichiarazione
      righeScritturaCorrente = [];
    }
  }else{
    box.innerHTML = '';
    righeScritturaCorrente = [{conto:'', dareAvere:'DARE', importo:0, centroCostoId:'', centroRicavoId:''},
                              {conto:'', dareAvere:'AVERE', importo:0, centroCostoId:'', centroRicavoId:''}];
  }
  renderRigheScrittura();
}

// ── Caricamento mensile dei costi sui centri ────────────────────────────
function proponiRigheCaricamentoCentri(){
  const periodo = document.getElementById('car-periodo')?.value || '';
  const righe = [];
  let totalePersonale = 0, totaleGenerali = 0;
  STATO.centriDiCosto.forEach(c => {
    const personale = Math.max(0, parseFloat(document.getElementById(`car-pers-${c.id}`)?.value) || 0);
    const generali = Math.max(0, parseFloat(document.getElementById(`car-gen-${c.id}`)?.value) || 0);
    if(personale > 0){ righe.push({conto:'51', dareAvere:'DARE', importo:personale, centroCostoId:c.id, centroRicavoId:''}); totalePersonale += personale; }
    if(generali > 0){ righe.push({conto:'52', dareAvere:'DARE', importo:generali, centroCostoId:c.id, centroRicavoId:''}); totaleGenerali += generali; }
  });
  if(totalePersonale > 0) righe.push({conto:'22', dareAvere:'AVERE', importo:totalePersonale, centroCostoId:'', centroRicavoId:''});
  if(totaleGenerali > 0) righe.push({conto:'23', dareAvere:'AVERE', importo:totaleGenerali, centroCostoId:'', centroRicavoId:''});
  righeScritturaCorrente = righe;
  renderRigheScrittura();
  const avviso = document.getElementById('car-avviso');
  if(avviso) avviso.innerHTML = caricamentoPeriodoEsistente(periodo)
    ? '<div class="riquadro" style="border-color:var(--rosso);background:rgba(156,59,59,.08);padding:9px">⚠️ Questo mese è già stato caricato. Elimina prima la registrazione precedente dal Libro Giornale per evitare duplicati.</div>'
    : `<span class="badge ok">Pool da caricare: ${euro(totalePersonale + totaleGenerali)}</span> &nbsp; Dipendenti ${euro(totalePersonale)} · Generali ${euro(totaleGenerali)}`;
}

// ── Fattura di Acquisto — anche qui, come in Produzione, il Magazzino non
// entra mai al prezzo pagato: entra SEMPRE al prezzo standard di Distinta
// Base, sulla quantità realmente ricevuta. La differenza tra quanto
// dobbiamo davvero al fornitore (prezzo reale) e quanto abbiamo valorizzato
// a magazzino (prezzo standard) è la Variance Prezzo Acquisto — se abbiamo
// pagato più dello standard è sfavorevole (a DEBITO, un costo in più), se
// abbiamo pagato meno è favorevole (a CREDITO) — la classica Purchase
// Price Variance di un sistema a costo standard (SAP CO-PC), separata dalla
// Variance di quantità/efficienza, che invece si vede solo al momento del
// CONSUMO in produzione (conto 60), non qui in acquisto: quanto si compra
// oggi rispetto al fabbisogno del mese è una scelta di scorta (Budget
// Acquisti), non un errore da segnalare come varianza.
function proponiRigheAcquisto(){
  const kgReale = parseFloat(document.getElementById('acq-kg').value) || 0;
  const prezzoReale = parseFloat(document.getElementById('acq-prezzo').value) || 0;
  const prezzoStandard = STATO.distintaBase.costoFerro || 0;
  const aliquotaIva = (STATO.budgetAnnuo.aliquotaIva || 0) / 100;
  if(kgReale <= 0){ righeScritturaCorrente = []; renderRigheScrittura(); document.getElementById('acq-riepilogo-varianza').innerHTML=''; return; }

  const importoMagazzinoStd = kgReale * prezzoStandard;   // Dare 12 — sempre a standard, l'IVA non entra MAI a magazzino
  const imponibileFornitori = kgReale * prezzoReale;      // quanto dobbiamo davvero al fornitore, IMPONIBILE (senza IVA)
  const ivaACredito = imponibileFornitori * aliquotaIva;  // Dare 14 — IVA che possiamo detrarre
  const importoFornitori = imponibileFornitori + ivaACredito; // Avere 20 — il DEBITO verso il fornitore è imponibile + IVA
  const varianzaPrezzo = (prezzoStandard - prezzoReale) * kgReale; // >0 = favorevole (pagato meno dello standard) — SEMPRE sull'imponibile, l'IVA non è mai un costo/ricavo

  // Nessuna riga qui porta un centroCostoId: l'acquisto valorizza solo il
  // magazzino, non è ancora un costo di nessun centro (vedi Report Centri
  // di Costo, che somma solo ciò che è taggato con un centro — la
  // manodopera in Produzione, non gli acquisti di materiale).
  const righe = [
    {conto:'12', dareAvere:'DARE', importo: importoMagazzinoStd, centroCostoId:'', centroRicavoId:''},
    {conto:'20', dareAvere:'AVERE', importo: importoFornitori, centroCostoId:'', centroRicavoId:''},
  ];
  if(Math.abs(varianzaPrezzo) > 0.005){
    righe.push({conto:'62', dareAvere: varianzaPrezzo < 0 ? 'DARE' : 'AVERE', importo: Math.abs(varianzaPrezzo), centroCostoId:'', centroRicavoId:''});
  }
  if(ivaACredito > 0.005){
    righe.push({conto:'14', dareAvere:'DARE', importo: ivaACredito, centroCostoId:'', centroRicavoId:''});
  }
  righeScritturaCorrente = righe;
  renderRigheScrittura();

  // Riepilogo leggibile PRIMA di registrare — stessa logica della Produzione
  const rigaVarianza = (etichetta, valore) => `<tr><td>${etichetta}</td>
    <td class="num cifre" style="color:${valore<0?'var(--rosso)':valore>0?'var(--verde)':'inherit'};font-weight:700">
      ${valore<0?'−':valore>0?'+':''}${euro(Math.abs(valore))} ${valore!==0 ? (valore<0?'(sfavorevole)':'(favorevole)') : ''}</td></tr>`;
  document.getElementById('acq-riepilogo-varianza').innerHTML = `
    <div class="riquadro" style="background:var(--carta-scura)">
      <h3 style="margin-bottom:8px">Standard vs Reale per questo acquisto</h3>
      <table class="registro">
        <tbody>
          <tr><td>Prezzo standard</td><td class="num cifre">${euro(prezzoStandard)}/kg</td></tr>
          <tr><td>Prezzo reale pagato</td><td class="num cifre">${euro(prezzoReale)}/kg</td></tr>
          <tr><td>Quantità acquistata</td><td class="num cifre">${kgReale.toFixed(1)} kg</td></tr>
          <tr><td>Magazzino valorizzato (a standard)</td><td class="num cifre">${euro(importoMagazzinoStd)}</td></tr>
          <tr><td>Imponibile dovuto al fornitore (a reale)</td><td class="num cifre">${euro(imponibileFornitori)}</td></tr>
          <tr><td>+ IVA a Credito (${(aliquotaIva*100).toFixed(0)}%)</td><td class="num cifre">${euro(ivaACredito)}</td></tr>
          <tr><td style="font-weight:700">= Totale dovuto al fornitore (imponibile + IVA)</td><td class="num cifre" style="font-weight:700">${euro(importoFornitori)}</td></tr>
          ${rigaVarianza('Variance Prezzo Acquisto (sull\'imponibile)', varianzaPrezzo)}
        </tbody>
      </table>
    </div>`;
}
// ── Fattura di Vendita — simmetrica all'Acquisto: i Clienti restano SEMPRE
// al prezzo REALE (è quanto ci devono davvero pagare, non si tocca), i
// Ricavi entrano SEMPRE al prezzo STANDARD di Budget — la differenza è la
// Variance Prezzo di Vendita: se abbiamo venduto sopra lo standard è
// favorevole (a CREDITO, ricavo in più), se abbiamo venduto sotto è
// sfavorevole (a DEBITO, ricavo mancato). A differenza della Variance
// Materiale/Manodopera (legittime nella contabilità reale di un sistema a
// costo standard), questa è soprattutto un dispositivo didattico: nella
// pratica i ricavi si registrano sempre al prezzo reale e l'analisi
// standard-vs-reale si fa in un report, non nel Libro Giornale — qui
// serve a far vedere la stessa logica anche sul lato vendite.
// ── Fattura di Vendita — simmetrica all'Acquisto: i Clienti restano SEMPRE
// al prezzo REALE (è quanto ci devono davvero pagare, non si tocca), i
// Ricavi entrano SEMPRE al prezzo STANDARD di Budget — la differenza è la
// Variance Prezzo di Vendita: se abbiamo venduto sopra lo standard è
// favorevole (a CREDITO, ricavo in più), se abbiamo venduto sotto è
// sfavorevole (a DEBITO, ricavo mancato). A differenza della Variance
// Materiale/Manodopera (legittime nella contabilità reale di un sistema a
// costo standard), questa è soprattutto un dispositivo didattico: nella
// pratica i ricavi si registrano sempre al prezzo reale e l'analisi
// standard-vs-reale si fa in un report, non nel Libro Giornale — qui
// serve a far vedere la stessa logica anche sul lato vendite.
//
// In più, OGNI vendita scarica il Magazzino Prodotti Finiti al Costo del
// Venduto standard (conto 41) — senza questa scrittura il Magazzino PF non
// si muoverebbe mai in vendita e non esisterebbe un vero Conto Economico
// REALE da leggere nel Libro Giornale: sarebbe solo ricavo, senza il costo
// da confrontarci. È la stessa identica logica standard-costing della
// Dichiarazione di Produzione, sul lato opposto del magazzino.
function proponiRigheVendita(){
  const pezzi = parseFloat(document.getElementById('ven-pezzi').value) || 0;
  const prezzoReale = parseFloat(document.getElementById('ven-prezzo').value) || 0;
  const centroRicavoId = document.getElementById('ven-centro-ricavo').value;
  const prezzoStandard = STATO.budgetAnnuo.prezzoVenditaStandard || 0;
  const costoStdUnit = costoStandardTransenna();
  const aliquotaIva = (STATO.budgetAnnuo.aliquotaIva || 0) / 100;
  const box = document.getElementById('ven-riepilogo-varianza');
  if(pezzi <= 0){ righeScritturaCorrente = []; renderRigheScrittura(); if(box) box.innerHTML=''; return; }

  const costoDelVenduto = pezzi * costoStdUnit; // Dare 41 / Avere 13 — sempre, a prescindere dal prezzo

  if(prezzoStandard <= 0){
    // Niente prezzo standard impostato: niente varianza di prezzo calcolabile,
    // si registra il ricavo al prezzo reale (comportamento precedente) ma lo
    // storno di magazzino a costo standard si fa comunque. L'IVA a Debito si
    // applica comunque sull'imponibile reale: il Cliente deve SEMPRE
    // imponibile + IVA, mai solo l'imponibile.
    const imponibile = pezzi * prezzoReale;
    const ivaADebito = imponibile * aliquotaIva;
    const totaleCliente = imponibile + ivaADebito;
    righeScritturaCorrente = [
      {conto:'11', dareAvere:'DARE', importo: totaleCliente, centroCostoId:'', centroRicavoId},
      {conto:'40', dareAvere:'AVERE', importo: imponibile, centroCostoId:'', centroRicavoId},
      {conto:'41', dareAvere:'DARE', importo: costoDelVenduto, centroCostoId:'', centroRicavoId:''},
      {conto:'13', dareAvere:'AVERE', importo: costoDelVenduto, centroCostoId:'', centroRicavoId:''},
    ];
    if(ivaADebito > 0.005){
      righeScritturaCorrente.push({conto:'21', dareAvere:'AVERE', importo: ivaADebito, centroCostoId:'', centroRicavoId:''});
    }
    renderRigheScrittura();
    if(box) box.innerHTML = `<p class="aiuto">⚠️ Imposta prima il "Prezzo di vendita standard" nel Budget Annuo, altrimenti qui
      l'intero ricavo apparirebbe come varianza.</p>`;
    return;
  }

  const imponibileClienti = pezzi * prezzoReale;                 // quanto ci deve davvero il cliente, IMPONIBILE (senza IVA)
  const ivaADebito = imponibileClienti * aliquotaIva;            // Avere 21 — IVA che dobbiamo allo Stato
  const importoClienti = imponibileClienti + ivaADebito;         // Dare 11 — il CREDITO verso il cliente è imponibile + IVA
  const importoRicaviStd = pezzi * prezzoStandard;               // Avere 40 — sempre a prezzo standard, l'IVA non entra MAI nei ricavi
  const varianzaPrezzo = (prezzoReale - prezzoStandard) * pezzi; // >0 = favorevole (venduto sopra standard) — SEMPRE sull'imponibile

  const righe = [
    {conto:'11', dareAvere:'DARE', importo: importoClienti, centroCostoId:'', centroRicavoId},
    {conto:'40', dareAvere:'AVERE', importo: importoRicaviStd, centroCostoId:'', centroRicavoId},
    {conto:'41', dareAvere:'DARE', importo: costoDelVenduto, centroCostoId:'', centroRicavoId:''},
    {conto:'13', dareAvere:'AVERE', importo: costoDelVenduto, centroCostoId:'', centroRicavoId:''},
  ];
  if(Math.abs(varianzaPrezzo) > 0.005){
    righe.push({conto:'63', dareAvere: varianzaPrezzo < 0 ? 'DARE' : 'AVERE', importo: Math.abs(varianzaPrezzo), centroCostoId:'', centroRicavoId});
  }
  if(ivaADebito > 0.005){
    righe.push({conto:'21', dareAvere:'AVERE', importo: ivaADebito, centroCostoId:'', centroRicavoId:''});
  }
  righeScritturaCorrente = righe;
  renderRigheScrittura();

  const margineIndustriale = importoRicaviStd - costoDelVenduto;
  const rigaVarianza = (etichetta, valore) => `<tr><td>${etichetta}</td>
    <td class="num cifre" style="color:${valore<0?'var(--rosso)':valore>0?'var(--verde)':'inherit'};font-weight:700">
      ${valore<0?'−':valore>0?'+':''}${euro(Math.abs(valore))} ${valore!==0 ? (valore<0?'(sfavorevole)':'(favorevole)') : ''}</td></tr>`;
  if(box) box.innerHTML = `
    <div class="riquadro" style="background:var(--carta-scura)">
      <h3 style="margin-bottom:8px">Standard vs Reale per questa vendita</h3>
      <table class="registro">
        <tbody>
          <tr><td>Prezzo standard (da Budget)</td><td class="num cifre">${euro(prezzoStandard)}/pezzo</td></tr>
          <tr><td>Prezzo reale applicato</td><td class="num cifre">${euro(prezzoReale)}/pezzo</td></tr>
          <tr><td>Pezzi venduti</td><td class="num cifre">${pezzi.toFixed(0)}</td></tr>
          <tr><td>Ricavi contabilizzati (a standard)</td><td class="num cifre">${euro(importoRicaviStd)}</td></tr>
          <tr><td>Imponibile dovuto dal cliente (a reale)</td><td class="num cifre">${euro(imponibileClienti)}</td></tr>
          <tr><td>+ IVA a Debito (${(aliquotaIva*100).toFixed(0)}%)</td><td class="num cifre">${euro(ivaADebito)}</td></tr>
          <tr><td style="font-weight:700">= Totale dovuto dal cliente (imponibile + IVA)</td><td class="num cifre" style="font-weight:700">${euro(importoClienti)}</td></tr>
          <tr><td>− Costo del Venduto (a standard)</td><td class="num cifre">${euro(costoDelVenduto)}</td></tr>
          <tr><td style="font-weight:700">= Margine Industriale (a standard)</td><td class="num cifre" style="font-weight:700">${euro(margineIndustriale)}</td></tr>
          ${rigaVarianza('Variance Prezzo di Vendita (sull\'imponibile)', varianzaPrezzo)}
        </tbody>
      </table>
    </div>`;
}

// ── Dichiarazione di Produzione — il cuore della varianza standard/reale ──
// Costo Standard sempre applicato al Magazzino Prodotti Finiti (così i
// prodotti finiti restano valorizzati a uno stesso costo coerente,
// indipendentemente da quanto sia andata bene o male QUESTA commessa) —
// la differenza tra standard e reale, invece di sparire, diventa una riga
// di VARIANZA separata: se abbiamo speso più del previsto (sfavorevole)
// va a DEBITO (è un costo in più), se abbiamo speso meno (favorevole) va
// a CREDITO — la stessa identica logica di un vero sistema di costo
// standard (SAP CO-PC).
function proponiRigheProduzione(){
  righeScritturaCorrente=[];renderRigheScrittura();const notice=document.getElementById('prod-riepilogo-varianze');if(notice)notice.innerHTML='<div class="riquadro">Percorso storico non utilizzabile per nuove produzioni. Apri PP: Taglio, poi Piegatura, poi Saldatura, ciascuno con 261 / CO11N / 101. Le vecchie dichiarazioni restano nel giornale.</div>';return;

  const inp = leggiInputProduzione();
  const box = document.getElementById('prod-riepilogo-varianze');
  const dsc = document.getElementById('reg-descrizione'); if(dsc) dsc.placeholder = descrizioneProduzione(inp, '');
  if(isNaN(inp.quantita)){ righeScritturaCorrente = []; renderRigheScrittura(); if(box) box.innerHTML = '<div class="riquadro" style="border-color:var(--rosso);padding:9px">⛔ Pezzi prodotti non validi.</div>'; return; }
  if(!(inp.quantita > 0)){ righeScritturaCorrente = []; renderRigheScrittura(); if(box) box.innerHTML = ''; return; }
  const calc = calcolaProduzione(inp);
  righeScritturaCorrente = calc.righe.map(r => ({...r}));
  renderRigheScrittura();
  // Controllo dei pool: stesso riquadro di prima, ora alimentato dallo snapshot (per centro e per conto, mai compensati)
  const dettagliPool = calc.snapshot.centri.map(c => ({id: c.centroCostoId, nome: c.centroNome, oreReale: c.oreReali, addebitoPersonale: c.assorbitoPersonale, addebitoGenerali: c.assorbitoGenerali}));
  const errori = calc.errori.filter(e => e !== 'Indica i pezzi buoni prodotti.');
  const n = (x, d) => isNaN(x) ? '<b style="color:var(--rosso)">non valido</b>' : Number(x).toLocaleString('it-IT', {minimumFractionDigits:d, maximumFractionDigits:d});
  const letti = `<div class="riquadro" style="padding:9px;margin-bottom:10px"><b>Valori letti:</b> ${n(inp.quantita, 0)} pezzi · ${n(inp.kgReale, 2)} kg di ferro (standard ${n(calc.snapshot ? calc.snapshot.materiale.kgStdTot : 0, 2)} kg)
    ${centriDelCiclo().map(c => { const s = calc.snapshot && calc.snapshot.centri.find(x => String(x.centroCostoId) === String(c.id)); return ` · ${c.nome} ${n(inp.oreReali[c.id], 2)} h (standard ${n(s ? s.oreStd : 0, 2)} h)`; }).join('')}
    <br>Voce nel Libro Giornale: <b>${descrizioneProduzione(inp, (dsc || {}).value || '')}</b></div>`;
  if(!calc.snapshot){ if(box) box.innerHTML = letti; return; }
  if(box) box.innerHTML = letti + (errori.length ? `<div class="riquadro" style="border-color:var(--rosso);background:rgba(156,59,59,.08);padding:9px;margin-bottom:10px">${errori.map(e => `<div>⛔ ${e}</div>`).join('')}</div>` : '')
    + (calc.avvisi.length ? `<div class="riquadro" style="border-color:var(--oro);padding:9px;margin-bottom:10px">${calc.avvisi.map(e => `<div>⚠️ ${e}</div>`).join('')}</div>` : '')
    + controlloPoolProduzione(dettagliPool, inp.data) + tabellaCostoProduzioneHtml(calc.snapshot);
}

function aggiungiRigaScrittura(){
  righeScritturaCorrente.push({conto:'', dareAvere:'DARE', importo:0, centroCostoId:'', centroRicavoId:''});
  renderRigheScrittura();
}
function eliminaRigaScrittura(i){ righeScritturaCorrente.splice(i,1); renderRigheScrittura(); }

function renderRigheScrittura(){
  const box = document.getElementById('reg-righe');
  box.innerHTML = righeScritturaCorrente.map((r, i) => `
    <div class="riga-scrittura">
      <select onchange="righeScritturaCorrente[${i}].conto=this.value">
        <option value="">— scegli conto —</option>${opzioniConti()}
      </select>
      <select style="max-width:100px" onchange="righeScritturaCorrente[${i}].dareAvere=this.value; aggiornaQuadratura()">
        <option value="DARE" ${r.dareAvere==='DARE'?'selected':''}>Dare</option>
        <option value="AVERE" ${r.dareAvere==='AVERE'?'selected':''}>Avere</option>
      </select>
      <input class="cifre num-col" type="number" step="0.01" value="${r.importo}" placeholder="importo"
             oninput="righeScritturaCorrente[${i}].importo=parseFloat(this.value)||0; aggiornaQuadratura()">
      <select onchange="righeScritturaCorrente[${i}].centroCostoId=this.value">${opzioniCentriCosto(true)}</select>
      <select onchange="righeScritturaCorrente[${i}].centroRicavoId=this.value">${opzioniCentriRicavo(true)}</select>
      <button class="piccolo" onclick="eliminaRigaScrittura(${i})" style="flex:0 0 auto">✕</button>
    </div>`).join('');
  // Riapplica i valori già scelti nei <select> (altrimenti il render li resetta al primo valore)
  righeScritturaCorrente.forEach((r, i) => {
    const riga = box.children[i];
    if(!riga) return;
    riga.children[0].value = r.conto;
    riga.children[3].value = r.centroCostoId;
    riga.children[4].value = r.centroRicavoId;
  });
  aggiornaQuadratura();
}
function aggiornaQuadratura(){
  const totDare = righeScritturaCorrente.filter(r=>r.dareAvere==='DARE').reduce((s,r)=>s+(r.importo||0),0);
  const totAvere = righeScritturaCorrente.filter(r=>r.dareAvere==='AVERE').reduce((s,r)=>s+(r.importo||0),0);
  document.getElementById('reg-tot-dare').textContent = euro(totDare);
  document.getElementById('reg-tot-avere').textContent = euro(totAvere);
  const quadra = Math.abs(totDare - totAvere) < 0.005 && totDare > 0;
  document.getElementById('reg-quadratura').innerHTML = quadra
    ? '<span class="badge ok">✓ Quadra</span>' : '<span class="badge no">Non quadra</span>';
  return quadra;
}
function registraScrittura(){
  if(document.getElementById('reg-tipo').value==='PRODUZIONE'){mostraToast('Nuove produzioni: usa PP, tre ordini distinti e 261 → CO11N → 101 per ogni fase. La dichiarazione diretta storica è solo consultabile.',true);return;}
  let calcProd = null;
  if(document.getElementById('reg-tipo').value === 'PRODUZIONE'){
    const inp = leggiInputProduzione();
    if(!inp.chiave){ mostraToast('⚠️ Dichiarazione non inizializzata: riapri il tipo «Dichiarazione di produzione».', true); return; }
    if(STATO.registrazioni.some(r => r.snapshotCosto && r.snapshotCosto.chiave === inp.chiave)){ mostraToast('⚠️ Questa dichiarazione di produzione è già stata registrata (chiave idempotente): nessuna seconda scrittura.', true); return; }
    calcProd = calcolaProduzione(inp);
    if(calcProd.errori.length){ mostraToast('⚠️ ' + calcProd.errori.join(' '), true); return; }
    // le righe si rigenerano sempre dal calcolo: la produzione non si registra con righe ritoccate a mano
    righeScritturaCorrente = calcProd.righe.map(r => ({...r})); renderRigheScrittura();
    const uguale = STATO.registrazioni.find(r => r.tipo === 'PRODUZIONE' && r.dettaglioProduzione && r.data === inp.data && String(r.dettaglioProduzione.commessaId) === String(inp.commessaId)
      && r.dettaglioProduzione.quantita === inp.quantita && r.dettaglioProduzione.kgReale === inp.kgReale
      && centriDelCiclo().every(c => { const o = (r.dettaglioProduzione.ore || []).find(x => String(x.centroCostoId) === String(c.id)); return o && o.oreReale === (inp.oreReali[c.id] || 0); }));
    if(uguale && !confirm(`Esiste già una produzione identica (scrittura n° ${uguale.id}: stessa commessa, data, pezzi, kg e ore). Registrarne un'altra?`)) return;
  }
  if(!aggiornaQuadratura()){ mostraToast('⚠️ Il Dare deve essere uguale all\'Avere prima di registrare.', true); return; }
  const righeValide = righeScritturaCorrente.filter(r => r.conto && r.importo > 0);
  if(!righeValide.length){ mostraToast('⚠️ Compila almeno due righe con conto e importo.', true); return; }
  const tipo = document.getElementById('reg-tipo').value;
  const inpProd = tipo === 'PRODUZIONE' ? leggiInputProduzione() : null;
  const descrizione = tipo === 'PRODUZIONE' ? descrizioneProduzione(inpProd, document.getElementById('reg-descrizione').value) : document.getElementById('reg-descrizione').value.trim();
  if(!descrizione){ mostraToast('⚠️ Scrivi una descrizione per la scrittura.', true); return; }
  if(tipo === 'CARICAMENTO_CENTRI'){
    const periodo = document.getElementById('car-periodo')?.value || '';
    if(!periodo){ mostraToast('⚠️ Seleziona il mese di competenza.', true); return; }
    if(document.getElementById('reg-data').value.slice(0,7) !== periodo){ mostraToast('⚠️ La data contabile deve essere nel mese di competenza selezionato.', true); return; }
    if(caricamentoPeriodoEsistente(periodo)){ mostraToast('⚠️ Costi del mese già caricati: elimina prima la registrazione precedente.', true); return; }
  }
  if(tipo !== 'CARICAMENTO_CENTRI'){
    const data = document.getElementById('reg-data').value;
    const richiesti = {};
    righeValide.filter(r => (r.conto === '51' || r.conto === '52' || (r.conto==='75'&&r.poolConto)) && r.dareAvere === 'AVERE' && r.centroCostoId)
      .forEach(r => { const k = `${r.centroCostoId}|${r.poolConto||r.conto}`; richiesti[k] = (richiesti[k]||0) + r.importo; });
    const mancanze = {};
    Object.keys(richiesti).forEach(k => {
      const [centroId, conto] = k.split('|');
      const disponibile = saldoMinimoPool(centroId, conto, data);
      if(richiesti[k] > disponibile + 0.005) mancanze[centroId] = (mancanze[centroId] || 0) + (richiesti[k] - disponibile);
    });
    if(Object.keys(mancanze).length){
      const testi = Object.keys(mancanze).map(id => {
        const c = STATO.centriDiCosto.find(x => String(x.id) === String(id)) || {}, tar = tariffaOraria(c) || 0, mensile = ((c.costoPersonaleAnnuo||0) + (c.costoGeneraleAnnuo||0)) / 12;
        return `${c.nome || id}: mancano ${euro(mancanze[id])}${tar > 0 ? ` (≈ ${Math.ceil(mancanze[id] / tar)} ore)` : ''}${mensile > 0 ? ` = ${(mancanze[id] / mensile).toLocaleString('it-IT', {maximumFractionDigits:1})} mesi di costi` : ''}`;
      });
      mostraToast(`⚠️ Costi dei centri insufficienti al ${data.split('-').reverse().join('/')}. ${Object.keys(richiesti).filter(k=>{const [centro,conto]=k.split('|');return richiesti[k]>saldoMinimoPool(centro,conto,data)+0.005;}).map(k=>{const [centro,conto]=k.split('|');return spiegaPoolInsufficiente(centro,conto,data,richiesti[k]);}).join(' · ')}. Vedi Ragioneria FI → Disponibilità dei costi per commesse.`, true);
      const el = document.getElementById('prod-controllo-pool'); if(el && el.scrollIntoView) el.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }
    if(tipo === 'PRODUZIONE'){
      const cid = document.getElementById('prod-commessa')?.value, com = STATO.commesse.find(x => String(x.id) === String(cid)), Qp = inpProd.quantita;
      if(com){ const tot = pezziGiaProdotti(cid) + Qp; if(tot > (com.quantitaPianificata || 0) && !confirm(`La commessa ${com.codice} prevede ${com.quantitaPianificata} pezzi: con questa produzione arrivi a ${tot} (${tot - com.quantitaPianificata} oltre il piano). Registrare comunque?`)) return; }
    }
  }

  const registrazione = {
    id: STATO.prossimoIdRegistrazione++,
    data: document.getElementById('reg-data').value,
    descrizione, tipo,
    righe: righeValide.map(r => ({...r})),
  };

  if(tipo === 'CARICAMENTO_CENTRI'){
    registrazione.dettaglioCaricamentoCentri = { periodo: document.getElementById('car-periodo').value };
  }

  // Per la Dichiarazione di Produzione, salva anche un riepilogo
  // standard/reale legato alla commessa — è quello che il Report
  // Commesse rilegge poi per aggregare più dichiarazioni sulla stessa
  // commessa nel tempo (non solo l'ultima).
  if(tipo === 'PRODUZIONE'){
    const Q = calcProd.snapshot.quantita;
    const kgReale = calcProd.snapshot.materiale.kgReale;
    registrazione.dettaglioProduzione = {
      commessaId: calcProd.snapshot.commessaId,
      quantita: Q,
      kgStandard: calcProd.snapshot.materiale.kgStdTot,
      kgReale,
      ore: calcProd.snapshot.centri.map(c => ({centroCostoId: c.centroCostoId, oreStandard: c.oreStd, oreReale: c.oreReali})),   // una riga per centro
    };
    registrazione.snapshotCosto = congelaProfondo(JSON.parse(JSON.stringify(calcProd.snapshot)));   // costo standard congelato: immutabile
  }
  // Per la Fattura di Vendita, se collegata a una commessa, salva anche qui
  // un riepilogo standard/reale — è quello che il Report Commesse rilegge
  // per mostrare, accanto a produzione, quanto di quel lotto è già stato
  // venduto e a quale prezzo (serve a decidere se e quando chiuderla).
  if(tipo === 'VENDITA'){
    const commessaId = document.getElementById('ven-commessa')?.value || '';
    if(commessaId){
      registrazione.dettaglioVendita = {
        commessaId,
        pezzi: parseFloat(document.getElementById('ven-pezzi').value) || 0,
        prezzoStandard: STATO.budgetAnnuo.prezzoVenditaStandard || 0,
        prezzoReale: parseFloat(document.getElementById('ven-prezzo').value) || 0,
      };
    }
  }

  STATO.registrazioni.push(registrazione);
  // la produzione entra subito nella disponibilità ATP degli ordini SD: backorder riconfermati in automatico
  const esitoATP = (tipo === 'PRODUZIONE' && window.SDMM && SDMM.ricalcolaATP) ? SDMM.ricalcolaATP(`produzione n° ${registrazione.id} del ${(registrazione.data || '').split('-').reverse().join('/')}`) : [];
  salvaStato();
  mostraToast((tipo === 'PRODUZIONE' ? `✅ ${descrizione} — magazzino prodotti finiti +${Number(registrazione.dettaglioProduzione.quantita).toLocaleString('it-IT')} pz` : '✅ Scrittura registrata nel Libro Giornale') + (esitoATP.length ? ` · ATP ordini SD aggiornata: ${esitoATP.join(' · ')}` : ''));
  document.getElementById('reg-descrizione').value = '';
  cambiaTipoRegistrazione();
}
