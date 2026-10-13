/* Generato da tools/split_simulatore.py (vuoto) — non modificare a mano: modifica sorgenti/ e rilancia. */
// ═══════════════════════════════════════════════════════════════════════
// STATO — tutto vive qui, salvato in localStorage. Nessun server, nessuna
// chiamata di rete: un file HTML, completamente offline.
// ═══════════════════════════════════════════════════════════════════════
const CHIAVE_STORAGE = 'ferro-transenne-fi-2026-vuoto-civilistico';

function statoDiDefault(){
  return {
    pianoDeiConti: [
      {codice:'10', nome:'Cassa e Banche', tipo:'ATTIVO'},
      {codice:'11', nome:'Clienti', tipo:'ATTIVO'},
      {codice:'12', nome:'Magazzino Materie Prime (Ferro)', tipo:'ATTIVO'},
      {codice:'13', nome:'Magazzino Prodotti Finiti (Transenne)', tipo:'ATTIVO'},
      {codice:'14', nome:'IVA a Credito', tipo:'ATTIVO'},
      {codice:'20', nome:'Fornitori', tipo:'PASSIVO'},
      {codice:'21', nome:'IVA a Debito', tipo:'PASSIVO'},
      {codice:'22', nome:'Debiti verso Dipendenti', tipo:'PASSIVO'},
      {codice:'23', nome:'Debiti per Costi da Liquidare', tipo:'PASSIVO'},
      {codice:'40', nome:'Ricavi di Vendita', tipo:'RICAVO'},
      {codice:'41', nome:'Costo del Venduto (a standard)', tipo:'COSTO'},
      {codice:'51', nome:'Costo del Personale', tipo:'COSTO'},
      {codice:'52', nome:'Costi Generali di Produzione', tipo:'COSTO'},
      {codice:'53', nome:'Spese Generali Amministrative', tipo:'COSTO'},
      {codice:'60', nome:'Variance Materiale (Ferro)', tipo:'COSTO'},
      {codice:'61', nome:'Varianza efficienza attività (personale e generali)', tipo:'COSTO'},
      {codice:'62', nome:'Variance Prezzo Acquisto (Ferro)', tipo:'COSTO'},
      {codice:'63', nome:'Variance Prezzo di Vendita', tipo:'RICAVO'},
    ],
    centriDiCosto: [
      {id:1, nome:'Taglio', numeroAddetti:1, stipendioMensileStandard:3000, oreStandardAnnuePerAddetto:1500, costoGeneraleAnnuo:6000, costoPersonaleAnnuo:36000, oreAnnuePreviste:1500},
      {id:2, nome:'Saldatura', numeroAddetti:1, stipendioMensileStandard:3000, oreStandardAnnuePerAddetto:1500, costoGeneraleAnnuo:6000, costoPersonaleAnnuo:36000, oreAnnuePreviste:1500},
      // Non è un centro "a lavorazione" come Taglio/Saldatura: nessuna riga
      // nel ciclo di lavorazione lo collega alla transenna (niente ore per
      // pezzo), quindi non entra mai nel costo standard di prodotto né
      // nella tabella Capacità/LTP — resta fuori da quei calcoli per
      // costruzione, senza bisogno di nessun filtro speciale. Il suo costo
      // (qui €100.000/anno) vive come "costoGeneraleAnnuo" puro; il
      // confronto Standard(0) vs Reale nel Report Centri di Costo si
      // popola solo se ci registri sopra una Scrittura Generica sul conto
      // 53 con questo centro taggato.
      {id:4, nome:'Piegatura', numeroAddetti:1, stipendioMensileStandard:3000, oreStandardAnnuePerAddetto:1500, costoGeneraleAnnuo:6000, costoPersonaleAnnuo:36000, oreAnnuePreviste:1500},
      {id:3, nome:'Spese Generali', numeroAddetti:0, stipendioMensileStandard:0, oreStandardAnnuePerAddetto:0, costoGeneraleAnnuo:0, costoPersonaleAnnuo:0, oreAnnuePreviste:0},
    ],
    regolaProduzione:'FABBISOGNO_NETTO_CLIENTI',
    centriDiRicavo: [
      {id:1, nome:'Vendite Italia'},
    ],
    distintaBase: {
      kgFerro: 8, costoFerro: 0.95,
      ciclo: [{opId:'OP0010', descrizione:'Taglio', centroCostoId:1, oreStandard:0.25, produce:'SL'}, {opId:'OP0015', descrizione:'Piegatura', centroCostoId:4, oreStandard:0.20, produce:'PIEGA'}, {opId:'OP0020', descrizione:'Saldatura', centroCostoId:2, oreStandard:0.4, produce:'PF'}],
      versione: 1,
    },
    commesse: [],
    budgetAnnuo: {
      // Volutamente vuoto: il Budget Annuo è compito dello studente, non un
      // dato di partenza come lo Stato Patrimoniale Iniziale — lo si scrive
      // a mano nella scheda "Budget Annuo di Produzione", e da lì nascono in
      // automatico Capacità, Budget Acquisti e Bilancio Previsionale.
      volumeAnnuoPianificato: 0, prezzoVenditaStandard: 0,
      rimanenzaFinaleDesiderataMP_kg: 0, speseGeneraliAnnue: 0,
      giorniIncassoClienti: 0, giorniPagamentoFornitori: 0,
      // Aliquota IVA standard applicata sia agli acquisti (IVA a Credito)
      // sia alle vendite (IVA a Debito) nelle scritture del Libro Giornale —
      // 22% di default (aliquota ordinaria italiana), modificabile qui.
      aliquotaIva: 22,
      // Mensilizzazione: quota percentuale dell'anno assegnata a ciascun
      // mese (Gen…Dic). Parte a quote costanti (100/12 ognuno) — modificabile
      // mese per mese in "Controllo Mensile" per modellare la stagionalità.
      pesiMensili: Array(12).fill(100/12),
    },
    statoPatrimonialeIniziale: { cassa0:0, clienti0:0, magazzinoMP_kg0:0, magazzinoPF_unita0:0, fornitori0:0 },
    registrazioni: [],
    prossimoIdCentroCosto: 5, prossimoIdCentroRicavo: 2, prossimoIdRegistrazione: 1, prossimoIdCommessa: 1,
  };
}

let STATO = caricaStato();
function caricaStato(){
  try{
    const salvato = localStorage.getItem(CHIAVE_STORAGE);
    if(salvato){
      const s = JSON.parse(salvato);
      // Migrazione morbida per chi ha salvato con una versione precedente di
      // questo file, prima di Commesse/Budget/Variance — aggiunge SOLO i
      // campi mancanti, senza mai toccare i dati già inseriti.
      if(!s.commesse) s.commesse = [];
      if(!s.budgetAnnuo) s.budgetAnnuo = {volumeAnnuoPianificato:0, prezzoVenditaStandard:0};
      if(s.budgetAnnuo.rimanenzaFinaleDesiderataMP_kg === undefined) s.budgetAnnuo.rimanenzaFinaleDesiderataMP_kg = 500;
      if(s.budgetAnnuo.speseGeneraliAnnue === undefined) s.budgetAnnuo.speseGeneraliAnnue = 45000;
      if(s.budgetAnnuo.giorniIncassoClienti === undefined) s.budgetAnnuo.giorniIncassoClienti = 60;
      if(s.budgetAnnuo.giorniPagamentoFornitori === undefined) s.budgetAnnuo.giorniPagamentoFornitori = 30;
      if(s.budgetAnnuo.aliquotaIva === undefined) s.budgetAnnuo.aliquotaIva = 22;
      if(!Array.isArray(s.budgetAnnuo.pesiMensili) || s.budgetAnnuo.pesiMensili.length !== 12) s.budgetAnnuo.pesiMensili = Array(12).fill(100/12);
      if(!s.statoPatrimonialeIniziale) s.statoPatrimonialeIniziale = {cassa0:50000, clienti0:30000, magazzinoMP_kg0:300, magazzinoPF_unita0:200, fornitori0:20000};
      if(!s.prossimoIdCommessa) s.prossimoIdCommessa = (s.commesse.reduce((m,c)=>Math.max(m,c.id),0) || 0) + 1;
      ['41','53','60','61','62','63','14','21','22','23'].forEach((codice) => {
        if(!s.pianoDeiConti.find(c => c.codice === codice)){
          const nomi = {'41':'Costo del Venduto (a standard)', '53':'Spese Generali Amministrative', '60':'Variance Materiale (Ferro)', '61':'Varianza efficienza attività (personale e generali)', '62':'Variance Prezzo Acquisto (Ferro)', '63':'Variance Prezzo di Vendita', '14':'IVA a Credito', '21':'IVA a Debito', '22':'Debiti verso Dipendenti', '23':'Debiti per Costi da Liquidare'};
          const tipi = {'63':'RICAVO', '14':'ATTIVO', '21':'PASSIVO', '22':'PASSIVO', '23':'PASSIVO'};
          s.pianoDeiConti.push({codice, nome: nomi[codice], tipo: tipi[codice] || 'COSTO'});
        }
      });
      // Migrazione morbida — Commesse: chi ha commesse salvate prima del
      // concetto di apertura/chiusura le riceve tutte "aperte" di default,
      // così restano selezionabili come prima.
      (s.commesse||[]).forEach(c => { if(!c.stato) c.stato = 'aperta'; });
      // Migrazione morbida — Centro di Costo "Spese Generali": chi ha un
      // salvataggio con solo i due centri di lavorazione lo riceve in
      // aggiunta, senza toccare Taglio/Saldatura.
      if(!s.centriDiCosto.find(c => c.nome === 'Spese Generali')){
        s.centriDiCosto.push({id: s.prossimoIdCentroCosto++, nome:'Spese Generali', numeroAddetti:0, stipendioMensileStandard:0, oreStandardAnnuePerAddetto:0, costoGeneraleAnnuo:0, costoPersonaleAnnuo:0, oreAnnuePreviste:0});
      }
      // Migrazione morbida — LTP capacità: chi ha centri di costo salvati con
      // il vecchio modello (solo costoPersonaleAnnuo + oreAnnuePreviste inseriti
      // a mano) riceve i nuovi campi driver senza perdere i numeri già inseriti:
      // si presume 1 addetto e si retrocalcola lo stipendio mensile e le ore
      // standard/persona da quello che c'era già, così tariffaOraria() e i
      // totali restano identici a prima finché non si tocca nulla.
      (s.centriDiCosto||[]).forEach(c => {
        if(c.numeroAddetti === undefined){
          c.numeroAddetti = 1;
          c.oreStandardAnnuePerAddetto = c.oreAnnuePreviste || 0;
          c.stipendioMensileStandard = Math.round(((c.costoPersonaleAnnuo||0) / 12) * 100) / 100;
        }
      });
      return migraPP(migraCostoStandard(SDMM.migra(s), salvato), salvato);
    }
  }catch(e){ /* localStorage non disponibile o dato corrotto: riparte da zero */ }
  return migraPP(migraCostoStandard(SDMM.migra(statoDiDefault()), null), null);
}
function salvaStato(){
  try{ aggiornaVersioneDistinta(); sincronizzaCostoGiacenzaIniziale(); }catch(e){ /* mai bloccare il salvataggio */ }
  try{ localStorage.setItem(CHIAVE_STORAGE, JSON.stringify(STATO)); }
  catch(e){ mostraToast('⚠️ Impossibile salvare (memoria locale piena o non disponibile)', true); }
}

// Cancella tutto quello che questo browser ha salvato e riparte dalla
// configurazione di default — serve a chi (docente o studente) vuole
// rifare un'esercitazione da zero senza gli effetti di assunzioni,
// budget o registrazioni lasciati da una sessione precedente. Distruttivo
// e irreversibile: chiede sempre conferma prima.
function ripristinaDatiDiDefault(){
  if(!confirm('Sicuro? Tutti i dati inseriti in QUESTO browser (centri di costo, budget, registrazioni, commesse...) verranno cancellati e si tornerà alla configurazione di partenza. Operazione irreversibile.')) return;
  try{ localStorage.removeItem(CHIAVE_STORAGE); }catch(e){ /* localStorage non disponibile: pazienza */ }
  location.reload();
}

// ── Nuovo giro — svuota SOLO Libro Giornale e Budget, lascia intatta
// l'azienda già configurata (piano dei conti, centri di costo, distinta
// base, commesse). Pensato per essere premuto PRIMA di ogni nuova
// esercitazione/sessione: evita che scritture di un giro precedente
// restino mescolate a quelle nuove, gonfiando produzione/vendite/costi
// senza che nessuno se ne accorga finché non guarda i Report.
function nuovoGiroStudente(){
  if(!confirm('NUOVO GIRO — si ripulisce tutto il lavoro fatto:\n• Libro Giornale, Budget Annuo\n• ordini di produzione PP, chiusure di periodo, MRP, documenti materiale\n• ordini di vendita, DDT, fatture, acquisti, MIGO, MIRO\n• tutte le commesse\n\nRESTANO: Centri di Costo, Distinta Base e ciclo (tempi di routing), Piano dei Conti, clienti e fornitori, Stato Patrimoniale Iniziale.\n\nOperazione irreversibile. Procedere?')) return;
  // Versione vuota: le commesse le crea lo studente, quindi il nuovo giro le cancella tutte
  const base = statoDiDefault().commesse;
  STATO.commesse = base.map(b => { const c = STATO.commesse.find(x => x.codice === b.codice); return c ? Object.assign(c, {stato:'aperta'}) : Object.assign({}, b); });
  STATO.prossimoIdCommessa = STATO.commesse.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0) + 1;
  STATO.registrazioni = [];
  STATO.prossimoIdRegistrazione = 1;
  STATO.budgetAnnuo.volumeAnnuoPianificato = 0;
  STATO.budgetAnnuo.prezzoVenditaStandard = 0;
  STATO.budgetAnnuo.speseGeneraliAnnue = 0;
  STATO.budgetAnnuo.rimanenzaFinaleDesiderataMP_kg = 0;
  STATO.budgetAnnuo.giorniIncassoClienti = 0;
  STATO.budgetAnnuo.giorniPagamentoFornitori = 0;
  STATO.commesse.forEach(c => { c.stato = 'aperta'; });
  if(window.PP) PP.reset();   // ordini di produzione, periodi e documenti materiale: le scritture sono già state svuotate qui sopra
  SDMM.resetDocumenti(); // documenti SD/MM (ordini, DDT, fatture, MIGO, MIRO...): le scritture sono già state svuotate qui sopra
  salvaStato();
  location.reload();
}

function mostraToast(msg, errore){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast mostra' + (errore ? ' errore' : '');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.className = 'toast', 2600);
}
function euro(n){ return '€ ' + (Number(n)||0).toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2}); }

// ═══════════════════════════════════════════════════════════════════════
// NAVIGAZIONE
// ═══════════════════════════════════════════════════════════════════════
document.querySelectorAll('nav.tabs button').forEach(btn => {
  btn.addEventListener('click', () => cambiaVista(btn.dataset.vista));
});
function cambiaVista(nome){
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('attivo', b.dataset.vista === nome));
  document.querySelectorAll('section.vista').forEach(s => s.classList.toggle('attiva', s.dataset.vista === nome));
  if(nome === 'giornale') renderGiornale();
  if(nome === 'mastro') renderMastro(true);
  if(nome === 'bilancio') renderBilancio();
  if(nome === 'centri-costo') renderReportCentriCosto();
  if(nome === 'commesse-report') renderReportCommesse();
  if(nome === 'mensile') renderControlloMensile();
  if(nome === 'budget') renderBudgetAnnuo();
  if(nome === 'previsionale') renderBilancioPrevisionale();
  if(nome === 'registrazione') cambiaTipoRegistrazione();
  if(nome === 'sdmm') SDMM.render();
  if(nome === 'pp') PP.render();
}

// ═══════════════════════════════════════════════════════════════════════
// TARIFFA ORARIA STANDARD di un centro di costo — costo annuo totale
// diviso le ore annue previste. Stessa identica logica di un centro di
// costo SAP CO: lo standard si fissa UNA VOLTA all'anno (in sede di
// budget), poi si usa tutto l'anno per valorizzare le ore lavorate.
// ═══════════════════════════════════════════════════════════════════════
function tariffaOraria(centro){
  const costoTotale = (centro.costoPersonaleAnnuo||0) + (centro.costoGeneraleAnnuo||0);
  const ore = centro.oreAnnuePreviste || 0;
  return ore > 0 ? costoTotale / ore : 0;
}

// ═══════════════════════════════════════════════════════════════════════
// LTP — Long Term Planning: la capacità e il costo del personale di un
// centro NON si inseriscono più a mano, si CALCOLANO da tre numeri
// "driver": quante persone ci lavorano oggi, quante ore standard fa
// ciascuna in un anno, e quanto costa al mese ciascuna a standard.
// Da qui nascono costoPersonaleAnnuo e oreAnnuePreviste, che restano gli
// unici due campi letti da tutto il resto del simulatore (tariffaOraria,
// capacità di budget, conto economico previsionale) — cambia solo COME
// nascono, non chi li usa. Va richiamata ogni volta che numeroAddetti,
// stipendioMensileStandard o oreStandardAnnuePerAddetto cambiano.
// ═══════════════════════════════════════════════════════════════════════
function ricalcolaCentroCosto(centro){
  centro.costoPersonaleAnnuo = (centro.numeroAddetti||0) * (centro.stipendioMensileStandard||0) * 12;
  centro.oreAnnuePreviste = (centro.numeroAddetti||0) * (centro.oreStandardAnnuePerAddetto||0);
}

// Componenti della tariffa: servono per scaricare separatamente dal centro
// il pool del personale (conto 51) e quello dei generali (conto 52).
function tariffaPersonale(centro){
  const ore = centro.oreAnnuePreviste || 0;
  return ore > 0 ? (centro.costoPersonaleAnnuo||0) / ore : 0;
}
function tariffaGenerali(centro){
  const ore = centro.oreAnnuePreviste || 0;
  return ore > 0 ? (centro.costoGeneraleAnnuo||0) / ore : 0;
}

// Saldo disponibile nel “malloppo” di un centro fino alla data indicata:
// DARE carica costi, AVERE li attribuisce alle commesse.
// Collegamento contabile HR -> pool -> commesse. Il giornale rimane l'unica fonte.
function diagnosiPoolCentro(centroId, conto, data){
  let caricato=0,assorbito=0,futuroHR=0,prossimaPaga='';
  STATO.registrazioni.forEach(reg=>{(reg.righe||[]).forEach(r=>{
    if(String(r.centroCostoId)!==String(centroId)||!(String(r.conto)===String(conto)||(r.conto==='75'&&r.poolConto===conto)))return;
    const n=c2(r.importo);
    if(!data||!reg.data||reg.data<=data){if(r.dareAvere==='DARE')caricato+=n;else assorbito+=n;}
    else if(reg.fi?.cedolini&&conto==='51'&&r.dareAvere==='DARE'){
      futuroHR+=n;if(!prossimaPaga||reg.data<prossimaPaga)prossimaPaga=reg.data;
    }
  });});
  return {centroId,conto,data,caricato:e2(caricato),assorbito:e2(assorbito),residuo:e2(caricato-assorbito),
    disponibile:e2(c2(saldoMinimoPool(centroId,conto,data||null))),futuroHR:e2(futuroHR),prossimaPaga};
}
function spiegaPoolInsufficiente(centroId,conto,data,richiesto){
  const d=diagnosiPoolCentro(centroId,conto,data),nome=nomeCentroCosto(centroId)||centroId;
  let s=`${nome} · ${conto} ${conto==='51'?'manodopera':'costi generali'}: richiesti ${euro(richiesto)}, caricati alla data ${euro(d.caricato)}, già attribuiti ${euro(d.assorbito)}, residuo ${euro(d.residuo)}, disponibile per nuovi addebiti ${euro(d.disponibile)}`;
  if(d.futuroHR>0)s+=`. Paghe HR già registrate per ${euro(d.futuroHR)}, ma successive alla produzione (prima data ${d.prossimaPaga}): non si anticipano costi futuri`;
  else if(conto==='51'&&d.caricato>0)s+='. Le paghe alimentano il pool: il costo residuo non basta. Non ricaricare le stesse paghe; verifica ore, centro e nuovi costi effettivi';
  else if(conto==='51')s+='. Registra/conferma le paghe in Ragioneria FI per questo centro, con data non successiva alla produzione';
  else s+='. Le paghe HR non caricano il conto 52: registra i costi generali effettivi separatamente, senza duplicare quelli già presenti';
  if(d.disponibile<d.residuo-0.005)s+='. Una parte del residuo è necessaria per addebiti con data successiva già registrati';
  return s;
}
function escPoolHR(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function renderDisponibilitaHR(){
  const box=document.getElementById('fi-pool-body'),input=document.getElementById('fi-pool-data');if(!box||!input)return;
  const data=input.value;if(!data){box.textContent='Seleziona una data di disponibilità.';return;}
  const rows=STATO.centriDiCosto.filter(c=>(STATO.distintaBase.ciclo||[]).some(o=>String(o.centroCostoId)===String(c.id))||STATO.fi.dipendenti.some(e=>String(e.centro)===String(c.id)));
  box.innerHTML='<table class="registro"><thead><tr><th>Centro</th><th>Conto</th><th>Caricato entro la data</th><th>Già attribuito</th><th>Residuo</th><th>Disponibile per nuove commesse</th><th>Paghe HR successive</th></tr></thead><tbody>'+rows.map(c=>['51','52'].map(conto=>{const d=diagnosiPoolCentro(c.id,conto,data);return `<tr><td>${escPoolHR(c.nome)}</td><td>${conto} ${conto==='51'?'Personale':'Generali'}</td><td>${euro(d.caricato)}</td><td>${euro(d.assorbito)}</td><td>${euro(d.residuo)}</td><td>${euro(d.disponibile)}</td><td>${d.futuroHR?euro(d.futuroHR)+' dal '+d.prossimaPaga:'—'}</td></tr>`;}).join('')).join('')+'</tbody></table><p class="aiuto">Il costo pieno delle paghe è caricato una sola volta in Dare 51. Ogni commessa lo assorbe progressivamente in Avere 51, sullo stesso centro. Il conto 52 è separato: non si copre con il residuo della manodopera. La disponibilità riserva anche quanto necessario per produzioni successive già registrate.</p>';
}
function vaiCostiGeneraliHR(){cambiaVista('registrazione');document.getElementById('reg-tipo').value='GENERICA';cambiaTipoRegistrazione();mostraToast('Costi generali effettivi: usa Dare 52 con il centro corretto e la contropartita del documento. Non inserire di nuovo le paghe sul 51.');}

function saldoPoolCentro(centroId, conto, finoData){
  let saldo = 0;
  STATO.registrazioni.forEach(reg => {
    if(finoData && reg.data && reg.data > finoData) return;
    (reg.righe||[]).forEach(r => {
      if(String(r.centroCostoId) !== String(centroId) || !(r.conto===conto||(r.conto==='75'&&r.poolConto===conto))) return;
      saldo += r.dareAvere === 'DARE' ? (r.importo||0) : -(r.importo||0);
    });
  });
  return saldo;
}

// ── Pool ("malloppo") dei centri: cosa è caricato alla data e quanto serve a una produzione
function statoPoolCentri(finoData){
  return STATO.centriDiCosto.filter(c => (c.costoPersonaleAnnuo||0) + (c.costoGeneraleAnnuo||0) > 0).map(c => {
    const pers = saldoPoolCentro(c.id, '51', finoData), gen = saldoPoolCentro(c.id, '52', finoData), tar = tariffaOraria(c) || 0;
    return {centro:c, pers, gen, tariffa:tar, oreCoperte: tar > 0 ? (pers + gen) / tar : 0, mensile: ((c.costoPersonaleAnnuo||0) + (c.costoGeneraleAnnuo||0)) / 12};
  });
}

// Saldo minimo del "malloppo" di un centro/conto da una data in avanti: uno scarico datato oggi non deve mandare in negativo
// nemmeno gli scarichi già registrati con data successiva (produzioni retrodatate, caricamenti eliminati…).
function saldoMinimoPool(centroId, conto, dalData, escludiIds){
  const ev = [];
  STATO.registrazioni.forEach(reg => {
    if(escludiIds && escludiIds.includes(reg.id)) return;
    (reg.righe || []).forEach(r => { if(String(r.centroCostoId) !== String(centroId) || !(r.conto===conto||(r.conto==='75'&&r.poolConto===conto))) return; ev.push({d: reg.data || '', v: r.dareAvere === 'DARE' ? (r.importo || 0) : -(r.importo || 0)}); });
  });
  ev.sort((a, b) => a.d.localeCompare(b.d));
  let saldo = 0, i = 0;
  const limite = dalData === null ? '' : (dalData || '9999-99-99');   // null = dall'inizio dei tempi · '' = tutte le date
  while(i < ev.length && ev[i].d <= limite) saldo += ev[i++].v;
  let min = saldo;
  while(i < ev.length){ const d = ev[i].d; while(i < ev.length && ev[i].d === d) saldo += ev[i++].v; if(saldo < min) min = saldo; }
  return min;
}
function pezziGiaProdotti(commessaId){
  return STATO.registrazioni.filter(r => r.tipo === 'PRODUZIONE' && r.dettaglioProduzione && !r.annullataDa && String(r.dettaglioProduzione.commessaId) === String(commessaId)).reduce((t, r) => t + (r.dettaglioProduzione.quantita || 0), 0);
}
// ═══════════════════════════════════════════════════════════════════════
// COSTO STANDARD IN STILE SAP (CO-PC) — distinta versionata + snapshot
// ───────────────────────────────────────────────────────────────────────
// • Il costo standard della transenna = materiale (ferro) + una riga per
//   ogni OPERAZIONE del ciclo (ID stabile, centro di costo, ore/pezzo),
//   valorizzata con la tariffa PERSONALE (pool conto 51) e la tariffa
//   GENERALI (pool conto 52) del SUO centro. Nessuna tariffa è fissa nel
//   codice: tutto si legge da STATO.centriDiCosto e STATO.distintaBase.
// • Ogni dichiarazione di produzione congela uno SNAPSHOT immutabile di
//   questi componenti (registrazione.snapshotCosto): è l'unica fonte dei
//   report storici e del costo dei lotti. Cambiare tariffe, tempi o
//   prezzo del ferro DOPO non modifica né la produzione né il COGS.
// • Solo dichiarazioni di funzione qui (niente const/let): caricaStato()
//   gira prima che il resto dello script sia eseguito.
// ═══════════════════════════════════════════════════════════════════════
function schemaCostoStandard(){ return 2; }
function c2(x){ x = Number(x) || 0; return Math.round(x * 100 + (x >= 0 ? 1e-7 : -1e-7)); }   // euro → centesimi interi
function e2(c){ return Math.round(c) / 100; }                                                  // centesimi → euro
function oggiIso(){ return new Date().toISOString().slice(0, 10); }
function congelaProfondo(o){ if(o && typeof o === 'object' && !Object.isFrozen(o)){ Object.values(o).forEach(congelaProfondo); Object.freeze(o); } return o; }
function centroDi(st, id){ return (st.centriDiCosto || []).find(c => String(c.id) === String(id)); }

// Distinta base dettagliata: materiale + operazioni, tutto per UN pezzo
function costoStandardDettaglio(st){
  st = st || STATO;
  const db = st.distintaBase || {}, kg = Number(db.kgFerro) || 0, pr = Number(db.costoFerro) || 0;
  const operazioni = (db.ciclo || []).map(r => {
    const c = centroDi(st, r.centroCostoId), ore = Number(r.oreStandard) || 0;
    const tp = c ? tariffaPersonale(c) : 0, tg = c ? tariffaGenerali(c) : 0;
    return {produce: r.produce === 'SL' ? 'SL' : r.produce==='PIEGA' ? 'PIEGA' : 'PF', opId: r.opId || '', descrizione: r.descrizione || (c ? c.nome : ''), centroCostoId: c ? c.id : r.centroCostoId, centroNome: c ? c.nome : '?', centroValido: !!c,
      oreStdPezzo: ore, tariffaPersonale: tp, tariffaGenerali: tg, costoPersonalePezzo: ore * tp, costoGeneraliPezzo: ore * tg, costoPezzo: ore * tp + ore * tg};
  });
  const materiale = {kgStdPezzo: kg, prezzoStdKg: pr, costoStdPezzo: kg * pr};
  const lavorazione = operazioni.reduce((t, o) => t + o.costoPezzo, 0);
  return {versione: db.versione || 1, dataVersione: db.dataVersione || '', materiale, operazioni, costoLavorazionePezzo: lavorazione, costoUnitario: materiale.costoStdPezzo + lavorazione};
}
function firmaDistinta(st){
  const d = costoStandardDettaglio(st);
  return JSON.stringify([d.materiale.kgStdPezzo, d.materiale.prezzoStdKg, d.operazioni.map(o => [o.opId, o.produce, String(o.centroCostoId), o.oreStdPezzo, Math.round(o.tariffaPersonale * 1e6), Math.round(o.tariffaGenerali * 1e6)])]);
}
// Nuova versione della distinta ogni volta che cambia un suo elemento (kg, prezzo, ore, centro, tariffe dei centri)
function aggiornaVersioneDistinta(st){
  st = st || STATO;
  const db = st.distintaBase, f = firmaDistinta(st);
  if(!db.firma){ db.versione = db.versione || 1; db.firma = f; db.dataVersione = db.dataVersione || oggiIso(); return; }
  if(db.firma !== f){ db.versione = (db.versione || 1) + 1; db.firma = f; db.dataVersione = oggiIso(); }
}
// Controlli sul ciclo: ID operazione e centro validi, niente ID duplicati
function validaCiclo(st){
  st = st || STATO;
  const errori = [], avvisi = [], visti = {}, ciclo = (st.distintaBase && st.distintaBase.ciclo) || [];
  if(!ciclo.length) errori.push('Il ciclo di lavorazione è vuoto: nessuna operazione da valorizzare.');
  ciclo.forEach((r, i) => {
    const pos = `Riga ${i + 1} del ciclo`;
    if(!r.opId || !String(r.opId).trim()) errori.push(`${pos}: manca l'ID operazione.`);
    else{ const k = String(r.opId).trim().toUpperCase(); if(visti[k] !== undefined) errori.push(`ID operazione ${r.opId} duplicato (righe ${visti[k] + 1} e ${i + 1}): ogni operazione deve avere un ID proprio.`); else visti[k] = i; }
    const c = centroDi(st, r.centroCostoId);
    if(!c) errori.push(`${pos} (${r.opId || '?'}): centro di costo non valido o eliminato.`);
    else if(!(tariffaOraria(c) > 0)) avvisi.push(`${r.opId}: il centro ${c.nome} ha tariffa zero (nessun costo annuo o nessuna ora prevista).`);
    const ore = Number(r.oreStandard);
    if(!isFinite(ore) || ore < 0) errori.push(`${pos} (${r.opId || '?'}): ore standard non valide.`);
  });
  const perCentro = {};
  ciclo.forEach(r => { perCentro[r.centroCostoId] = (perCentro[r.centroCostoId] || 0) + 1; });
  Object.keys(perCentro).filter(k => perCentro[k] > 1).forEach(k => { const c = centroDi(st, k); avvisi.push(`Il centro ${c ? c.nome : k} compare in ${perCentro[k]} operazioni: se non è voluto è un doppione (in produzione le ore reali si dichiarano per centro).`); });
  return {errori, avvisi};
}
// Centri di lavorazione del ciclo, ognuno una sola volta
function centriDelCiclo(){
  const out = [];
  (STATO.distintaBase.ciclo || []).forEach(r => { const c = centroDi(STATO, r.centroCostoId); if(c && !out.includes(c)) out.push(c); });
  return out;
}
// Numeri scritti all'italiana nei campi della produzione: "3.700" → 3700, "29.600,5" → 29600.5, "0,25" → 0.25.
// (Con un campo type="number" il browser leggeva "3.700" come 3,7 pezzi.)
function numeroIt(v){
  let s = String(v == null ? '' : v).trim().replace(/\s|€/g, '');
  if(s === '') return 0;
  if(s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if(/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}
function nuovaChiaveProduzione(){ return 'PRD-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
function leggiInputProduzione(){
  const v = id => (document.getElementById(id) || {}).value;
  const oreReali = {};
  centriDelCiclo().forEach(c => { oreReali[c.id] = numeroIt(v(`prod-ore-${c.id}`)); });
  return {commessaId: v('prod-commessa') || '', quantita: numeroIt(v('prod-quantita')), kgReale: numeroIt(v('prod-kg-reale')),
    oreReali, data: v('reg-data') || '', chiave: window.__prodChiave || ''};
}
// Calcolo PURO della dichiarazione di produzione: righe contabili + snapshot. Tutto in centesimi interi,
// così la somma dei componenti coincide al centesimo con il Dare 13 e la scrittura quadra sempre.
function calcolaProduzione(inp){
  const errori = [], Q = inp.quantita, val = validaCiclo();
  if(window.Fabbisogno){const err=Fabbisogno.errore(Q);if(err)errori.push(err);}
  errori.push(...val.errori);
  if(!(Q > 0)) errori.push('Indica i pezzi buoni prodotti.');
  else if(!Number.isInteger(Q)) errori.push(`Pezzi prodotti non interi (${String(Q).replace('.', ',')}): scrivi il numero senza decimali, es. 3700 oppure 3.700.`);
  if(isNaN(inp.kgReale) || inp.kgReale < 0) errori.push('Kg di ferro reali non validi.');
  else if(Q > 0 && !(inp.kgReale > 0)) errori.push('Indica i kg di ferro realmente consumati.');
  if(Object.values(inp.oreReali).some(o => isNaN(o) || o < 0)) errori.push('Ore reali non valide (numero non negativo, es. 925 o 1.480).');
  if(!inp.data) errori.push('Imposta la data della produzione.');
  aggiornaVersioneDistinta();
  const std = costoStandardDettaglio();
  if(isNaN(Q)) return {errori: ['Pezzi prodotti non validi.'], avvisi: [], righe: [], snapshot: null};
  const kgStdTot = std.materiale.kgStdPezzo * Q;
  const cMatStd = c2(kgStdTot * std.materiale.prezzoStdKg), cMatReal = c2(inp.kgReale * std.materiale.prezzoStdKg);
  const operazioni = std.operazioni.map(o => Object.assign({}, o, {oreStdTot: o.oreStdPezzo * Q, cStdPers: c2(o.costoPersonalePezzo * Q), cStdGen: c2(o.costoGeneraliPezzo * Q)}));
  const centri = centriDelCiclo().map(c => {
    const ops = operazioni.filter(o => String(o.centroCostoId) === String(c.id));
    const oreStd = ops.reduce((t, o) => t + o.oreStdTot, 0), oreReali = inp.oreReali[c.id] || 0, tp = tariffaPersonale(c), tg = tariffaGenerali(c);
    const cStdP = ops.reduce((t, o) => t + o.cStdPers, 0), cStdG = ops.reduce((t, o) => t + o.cStdGen, 0), cAssP = c2(oreReali * tp), cAssG = c2(oreReali * tg);
    return {centroCostoId: c.id, centroNome: c.nome, operazioni: ops.map(o => o.opId), oreStd, oreReali, tariffaPersonale: tp, tariffaGenerali: tg,
      stdPersonale: e2(cStdP), stdGenerali: e2(cStdG), assorbitoPersonale: e2(cAssP), assorbitoGenerali: e2(cAssG),
      varPersonale: e2(cStdP - cAssP), varGenerali: e2(cStdG - cAssG), varianza: e2(cStdP + cStdG - cAssP - cAssG),
      poolPersonalePrima: saldoPoolCentro(c.id, '51', inp.data), poolGeneraliPrima: saldoPoolCentro(c.id, '52', inp.data),
      poolPersonaleDisponibile: saldoMinimoPool(c.id, '51', inp.data), poolGeneraliDisponibile: saldoMinimoPool(c.id, '52', inp.data),
      _c: {cStdP, cStdG, cAssP, cAssG}};
  });
  const cLavStd = operazioni.reduce((t, o) => t + o.cStdPers + o.cStdGen, 0), cTot = cMatStd + cLavStd;
  const R = (conto, da, cent, centro) => ({conto, dareAvere: da, importo: e2(Math.abs(cent)), centroCostoId: centro || '', centroRicavoId: ''});
  const righe = [R('13', 'DARE', cTot), R('12', 'AVERE', cMatReal)];
  centri.forEach(c => { righe.push(R('51', 'AVERE', c._c.cAssP, c.centroCostoId)); righe.push(R('52', 'AVERE', c._c.cAssG, c.centroCostoId)); });
  const dMat = cMatStd - cMatReal;   // > 0 favorevole (Avere), < 0 sfavorevole (Dare)
  if(dMat !== 0) righe.push(R('60', dMat > 0 ? 'AVERE' : 'DARE', dMat));
  centri.forEach(c => { const d = c._c.cStdP + c._c.cStdG - c._c.cAssP - c._c.cAssG; if(d !== 0) righe.push(R('61', d > 0 ? 'AVERE' : 'DARE', d, c.centroCostoId)); });   // variance manodopera PER CENTRO
  const righeValide = righe.filter(r => r.importo > 0);
  const dare = righeValide.filter(r => r.dareAvere === 'DARE').reduce((t, r) => t + c2(r.importo), 0), avere = righeValide.filter(r => r.dareAvere === 'AVERE').reduce((t, r) => t + c2(r.importo), 0);
  if(dare !== avere) errori.push(`Errore interno di quadratura (Dare ${euro(e2(dare))} ≠ Avere ${euro(e2(avere))}): nessuna registrazione.`);
  const snapshot = {
    schema: schemaCostoStandard(), legacy: false, chiave: inp.chiave, dataCalcolo: new Date().toISOString(), dataProduzione: inp.data, commessaId: inp.commessaId,
    versioneDistinta: std.versione, dataVersioneDistinta: std.dataVersione, quantita: Q,
    materiale: {kgStdPezzo: std.materiale.kgStdPezzo, prezzoStdKg: std.materiale.prezzoStdKg, costoStdPezzo: std.materiale.costoStdPezzo,
      kgStdTot, kgReale: inp.kgReale, costoStdTot: e2(cMatStd), costoRealeTot: e2(cMatReal), varianza: e2(dMat)},
    operazioni: operazioni.map(o => ({opId: o.opId, descrizione: o.descrizione, centroCostoId: o.centroCostoId, centroNome: o.centroNome, oreStdPezzo: o.oreStdPezzo,
      tariffaPersonale: o.tariffaPersonale, tariffaGenerali: o.tariffaGenerali, costoPersonalePezzo: o.costoPersonalePezzo, costoGeneraliPezzo: o.costoGeneraliPezzo, costoPezzo: o.costoPezzo,
      oreStdTot: o.oreStdTot, costoStdPersonaleTot: e2(o.cStdPers), costoStdGeneraliTot: e2(o.cStdGen)})),
    centri: centri.map(c => { const x = Object.assign({}, c); delete x._c; return x; }),
    costoUnitario: std.costoUnitario, costoTotale: e2(cTot), costoUnitarioLotto: Q > 0 ? e2(cTot) / Q : 0, arrotondamento: e2(cTot) - std.costoUnitario * Q,
    varianze: {materiale: e2(dMat), manodopera: e2(centri.reduce((t, c) => t + c._c.cStdP + c._c.cStdG - c._c.cAssP - c._c.cAssG, 0))},
  };
  return {errori, avvisi: val.avvisi, righe: window.BudgetPool?BudgetPool.convert(righeValide,inp.data):righeValide, snapshot};
}

// Voce del Libro Giornale: "Dichiarazione di produzione – 3.700 pezzi – Produzione/addebito commessa COM-002"
function eDescrizioneAutomatica(s){ s = String(s || '').trim(); return !s || /^Caricamento costi centri \d{4}-\d{2}/.test(s) || /^Dichiarazione di produzione/.test(s); }
function descrizioneProduzione(inp, nota){
  const com = STATO.commesse.find(c => String(c.id) === String(inp.commessaId));
  const q = isNaN(inp.quantita) ? '?' : Number(inp.quantita).toLocaleString('it-IT', {maximumFractionDigits:0});
  return `Dichiarazione di produzione – ${q} pezzi – Produzione/addebito commessa ${com ? com.codice : '—'}` + (eDescrizioneAutomatica(nota) ? '' : ` — ${String(nota).trim()}`);
}
// Tabella leggibile della dichiarazione di produzione (anteprima)
function tabellaCostoProduzioneHtml(s){
  const n = (x, d) => (Number(x) || 0).toLocaleString('it-IT', {minimumFractionDigits: d, maximumFractionDigits: d});
  const col = v => v < -0.004 ? 'var(--rosso)' : v > 0.004 ? 'var(--verde)' : 'inherit';
  const segno = v => `${v < -0.004 ? '−' : v > 0.004 ? '+' : ''}${euro(Math.abs(v))} ${v < -0.004 ? '(sfavorevole)' : v > 0.004 ? '(favorevole)' : ''}`;
  const righeOp = s.operazioni.map(o => `<tr><td><b>${o.opId}</b> ${o.descrizione} <span class="aiuto">— centro ${o.centroNome}</span></td>
      <td class="num cifre">${n(o.oreStdPezzo, 2)} h</td><td class="num cifre">${euro(o.tariffaPersonale)}/h</td><td class="num cifre">${euro(o.tariffaGenerali)}/h</td>
      <td class="num cifre">${n(o.costoPersonalePezzo, 5)}</td><td class="num cifre">${n(o.costoGeneraliPezzo, 5)}</td><td class="num cifre"><b>${n(o.costoPezzo, 5)}</b></td>
      <td class="num cifre">${euro(o.costoStdPersonaleTot + o.costoStdGeneraliTot)}</td></tr>`).join('');
  const pool = s.centri.map(c => [['51', 'Personale', c.poolPersonaleDisponibile, c.assorbitoPersonale], ['52', 'Generali', c.poolGeneraliDisponibile, c.assorbitoGenerali]].map(([conto, nome, disp, ass]) => {
    const res = disp - ass, ok = res > -0.005;
    return `<tr><td>${c.centroNome}</td><td>${conto} — ${nome}</td><td class="num cifre">${n(c.oreReali, 2)} h × ${euro(conto === '51' ? c.tariffaPersonale : c.tariffaGenerali)}</td>
      <td class="num cifre">${euro(disp)}</td><td class="num cifre">${euro(ass)}</td><td class="num cifre" style="font-weight:700;color:${ok ? 'var(--verde)' : 'var(--rosso)'}">${euro(res)}</td>
      <td>${ok ? '<span class="badge ok">✓</span>' : '<span class="badge no">pool insufficiente</span>'}</td></tr>`; }).join('')).join('');
  const varCentri = s.centri.map(c => `<tr><td>Variance manodopera ${c.centroNome} <span class="aiuto">(std ${n(c.oreStd, 2)} h − reali ${n(c.oreReali, 2)} h · personale ${segno(c.varPersonale)} · generali ${segno(c.varGenerali)})</span></td>
      <td class="num cifre" style="font-weight:700;color:${col(c.varianza)}">${segno(c.varianza)}</td><td>61 — centro ${c.centroNome}</td></tr>`).join('');
  return `<div class="riquadro" style="background:var(--carta-scura)">
    <h3 style="margin-bottom:6px">Costo standard congelato per questa produzione — distinta v.${s.versioneDistinta}${s.dataVersioneDistinta ? ' del ' + s.dataVersioneDistinta.split('-').reverse().join('/') : ''}</h3>
    <p class="aiuto" style="margin-bottom:6px">Ogni operazione usa SOLO le ore e le tariffe del proprio centro. Il materiale compare una volta sola. Questi valori vengono congelati nel lotto: se in futuro cambi tariffe, tempi o prezzo del ferro, questa produzione e il suo costo del venduto non cambiano.</p>
    <table class="registro"><thead><tr><th>Componente per pezzo</th><th class="num">Quantità std</th><th class="num">Tariffa personale</th><th class="num">Tariffa generali</th><th class="num">Personale €/pz</th><th class="num">Generali €/pz</th><th class="num">Totale €/pz</th><th class="num">Totale ${n(s.quantita, 0)} pz</th></tr></thead>
    <tbody><tr><td><b>Materiale</b> ferro grezzo</td><td class="num cifre">${n(s.materiale.kgStdPezzo, 2)} kg</td><td class="num cifre" colspan="2">${euro(s.materiale.prezzoStdKg)}/kg</td><td></td><td></td><td class="num cifre"><b>${n(s.materiale.costoStdPezzo, 5)}</b></td><td class="num cifre">${euro(s.materiale.costoStdTot)}</td></tr>
      ${righeOp}
      <tr><td style="font-weight:700;border-top:1px solid var(--riga)">Costo standard unitario</td><td colspan="5" style="border-top:1px solid var(--riga)"></td><td class="num cifre" style="font-weight:700;border-top:1px solid var(--riga)">${n(s.costoUnitario, 5)}</td>
        <td class="num cifre" style="font-weight:700;border-top:1px solid var(--riga)">${euro(s.costoTotale)}</td></tr></tbody></table>
    <p class="aiuto" style="margin:4px 0 12px">Dare 13 — Magazzino prodotti finiti: <b>${euro(s.costoTotale)}</b> = somma dei componenti arrotondati al centesimo${Math.abs(s.arrotondamento) >= 0.005 ? ` (costo unitario × pezzi = ${euro(s.costoUnitario * s.quantita)}: arrotondamento ${euro(s.arrotondamento)} riconciliato)` : ''} · costo del lotto ${n(s.costoUnitarioLotto, 5)} €/pz.</p>
    <h3 style="margin-bottom:6px">Pool dei centri: disponibile e assorbito, conto per conto</h3>
    <table class="registro"><thead><tr><th>Centro</th><th>Conto (Avere)</th><th class="num">Ore reali × tariffa</th><th class="num">Pool disponibile</th><th class="num">Assorbito ora</th><th class="num">Residuo</th><th>Esito</th></tr></thead><tbody>${pool}</tbody></table>
    <p class="aiuto" style="margin:4px 0 12px">Ogni pool si scarica da solo: il deficit di un centro o di un conto non viene mai coperto con un altro centro o con l'altro conto.</p>
    <h3 style="margin-bottom:6px">Varianze</h3>
    <table class="registro"><tbody>
      <tr><td>Variance materiale <span class="aiuto">(std ${n(s.materiale.kgStdTot, 2)} kg − reali ${n(s.materiale.kgReale, 2)} kg) × ${euro(s.materiale.prezzoStdKg)}</span></td><td class="num cifre" style="font-weight:700;color:${col(s.materiale.varianza)}">${segno(s.materiale.varianza)}</td><td>60</td></tr>
      ${varCentri}</tbody></table></div>`;
}

// Anomalie sul costo storico: nulla viene ricalcolato in silenzio con lo standard corrente
function anomalieCostoStorico(){
  const out = [], fdt = d => (d || '').split('-').reverse().join('/');
  if(window.__anomaliaMigrazione) out.push(window.__anomaliaMigrazione);
  STATO.registrazioni.filter(r => r.tipo === 'PRODUZIONE').forEach(r => {
    const s = r.snapshotCosto;
    if(!s) out.push(`Produzione n° ${r.id} del ${fdt(r.data)}: nessun costo storico congelato.`);
    else if(s.anomalia) out.push(`Produzione n° ${r.id} del ${fdt(r.data)}: ${s.anomalia}`);
  });
  const spi = STATO.statoPatrimonialeIniziale || {};
  if((spi.magazzinoPF_unita0 || 0) > 0 && !(Number(spi.costoUnitarioPF0) > 0)) out.push('Giacenza iniziale di prodotti finiti senza costo unitario congelato.');
  STATO.registrazioni.filter(r => r.origineSD && (r.origineSD.tipo === 'DDT' || r.origineSD.tipo === 'FATT')).forEach(r => {
    if((r.righe || []).some(x => x.conto === '41' && x.centroCostoId)) out.push(`Scrittura n° ${r.id}: costo del venduto con un centro produttivo (va registrato senza centro).`);
  });
  return out;
}
// Chi ha già fatto uscire prodotti finiti? Finché nessuno, la giacenza iniziale segue lo standard corrente
function ciSonoUscitePF(){
  return STATO.registrazioni.some(r => r.tipo === 'VENDITA') || !!(STATO.sdmm && STATO.sdmm.ddt && STATO.sdmm.ddt.length);
}
function sincronizzaCostoGiacenzaIniziale(){
  const spi = STATO.statoPatrimonialeIniziale; if(!spi) return;
  if(spi.costoUnitarioPF0CongelatoMigrazione && Number(spi.costoUnitarioPF0)>0)return;
  if(!ciSonoUscitePF() || !(Number(spi.costoUnitarioPF0) > 0)){ spi.costoUnitarioPF0 = costoStandardTransenna(); spi.costoUnitarioPF0Versione = STATO.distintaBase.versione || 1; }
}

// ── Modulo PP e registro MM: conti, stato ordini, documenti materiale, ciclo a due livelli ──────────
function migraPP(s, rawSalvato){
  try{
    const giaV2 = s.pp && s.pp.versione === 2 && s.mm;
    if(!giaV2 && rawSalvato){
      const k = `${CHIAVE_STORAGE}-backup-pre-PP2`;
      try{ if(!localStorage.getItem(k)) localStorage.setItem(k, rawSalvato); }catch(e){ window.__anomaliaMigrazione = 'Modulo PP non attivato: impossibile salvare il backup preventivo (memoria del browser piena).'; return s; }
    }
    const conti = s.pianoDeiConti || (s.pianoDeiConti = []);
    const agg = (dopo, c) => { if(conti.find(x => x.codice === c.codice)) return; const i = conti.findIndex(x => x.codice === dopo); conti.splice(i >= 0 ? i + 1 : conti.length, 0, c); };
    agg('14', {codice:'15', nome:'Prodotti in Corso di Lavorazione (WIP)', tipo:'ATTIVO'});
    agg('15', {codice:'16', nome:'Magazzino Semilavorati (SL-TAGLIO)', tipo:'ATTIVO'});
    agg('63', {codice:'64', nome:'Variance Scarti di Produzione', tipo:'COSTO'});
    agg('64', {codice:'70', nome:'Consumi di Materie Prime (261)', tipo:'COSTO'});
    agg('70', {codice:'71', nome:'Consumi di Semilavorati (261)', tipo:'COSTO'});
    agg('71', {codice:'72', nome:'Costi Interni Addebitati agli Ordini (attività)', tipo:'COSTO'});
    agg('72', {codice:'73', nome:'Output di Produzione (variazione rimanenze SL e PF)', tipo:'RICAVO'});
    agg('73', {codice:'74', nome:'Variazione Rimanenze Prodotti in Corso (WIP)', tipo:'RICAVO'});
    const c15 = conti.find(x => x.codice === '15'); if(c15) c15.nome = 'Prodotti in Corso di Lavorazione (WIP)';
    if(!s.mm) s.mm = {documenti:[], cnt:4900000001, magazzini:[{lgort:'0010', nome:'Materie prime', lgnum:null}, {lgort:'0020', nome:'Semilavorati', lgnum:null}, {lgort:'0001', nome:'Prodotti finiti', lgnum:null}]};
    if(!s.pp || s.pp.versione !== 2){ if(s.pp && (s.pp.ordini || []).length) s.ppArchivioV1 = s.pp; s.pp = {versione:2, ordini:[], cnt:1000001, periodi:[]}; if(rawSalvato) window.__migrazioneCostoEseguita = true; }
    // ciclo: quale operazione produce il semilavorato (la prima, se il ciclo ne ha più di una)
    const ciclo = (s.distintaBase && s.distintaBase.ciclo) || [];
    if(ciclo.length && ciclo.every(r => !r.produce)) ciclo.forEach((r, i) => { r.produce = ciclo.length > 1 && i === 0 ? 'SL' : 'PF'; });
    (s.pp.ordini || []).forEach(o => { if(o.std) congelaProfondo(o.std); });
  }catch(e){ window.__anomaliaMigrazione = 'Attivazione del modulo PP interrotta (' + e.message + ').'; }
  return s;
}
// ── Migrazione localStorage (idempotente, con backup preventivo) ──────────────────
function migraCostoStandard(originale, rawSalvato){
  if((originale.schemaCostoStandard || 0) >= schemaCostoStandard()){ (originale.registrazioni || []).forEach(r => { if(r.snapshotCosto) congelaProfondo(r.snapshotCosto); }); return originale; }
  let s = originale;
  try{
    s = JSON.parse(JSON.stringify(originale));   // si lavora su una copia: se qualcosa va storto l'originale resta intatto
    let chiaveBackup = '';
    if(rawSalvato){
      chiaveBackup = `${CHIAVE_STORAGE}-backup-pre-schema${schemaCostoStandard()}`;
      try{ if(!localStorage.getItem(chiaveBackup)) localStorage.setItem(chiaveBackup, rawSalvato); }
      catch(e){ window.__anomaliaMigrazione = 'Migrazione dei costi storici NON eseguita: impossibile salvare il backup preventivo (memoria del browser piena). Libera spazio e ricarica la pagina.'; return s; }
    }
    const oggi = oggiIso(), db = s.distintaBase || (s.distintaBase = {kgFerro: 0, costoFerro: 0, ciclo: []});
    // 1. ID operazione stabili e descrizione sulle righe del ciclo (quelli esistenti non si toccano)
    const usati = new Set((db.ciclo || []).map(r => r.opId).filter(Boolean));
    (db.ciclo || []).forEach((r, i) => {
      if(!r.opId){ let k = (i + 1) * 10, id; do{ id = 'OP' + String(k).padStart(4, '0'); k += 10; }while(usati.has(id)); r.opId = id; usati.add(id); }
      if(!r.descrizione){ const c = centroDi(s, r.centroCostoId); r.descrizione = c ? c.nome : 'Operazione'; }
    });
    db.versione = db.versione || 1; aggiornaVersioneDistinta(s);
    // 2. costo unitario congelato della giacenza iniziale di prodotti finiti
    const spi = s.statoPatrimonialeIniziale || {};
    if(!(Number(spi.costoUnitarioPF0) > 0)){ spi.costoUnitarioPF0 = costoStandardDettaglio(s).costoUnitario; spi.costoUnitarioPF0Versione = db.versione; }
    // 3. produzioni storiche: snapshot "legacy" letto DAL LIBRO GIORNALE (mai ricostruito con le tariffe di oggi)
    let nLegacy = 0, nCogs = 0;
    (s.registrazioni || []).filter(r => r.tipo === 'PRODUZIONE' && !r.snapshotCosto).forEach(r => {
      const dp = r.dettaglioProduzione || {}, Q = Number(dp.quantita) || 0, righe = r.righe || [];
      const tot = (conto, da, cc) => righe.filter(x => x.conto === conto && (!da || x.dareAvere === da) && (cc === undefined || String(x.centroCostoId) === String(cc))).reduce((t, x) => t + (x.importo || 0), 0);
      const netto = (conto, cc) => righe.filter(x => x.conto === conto && (cc === undefined || String(x.centroCostoId) === String(cc))).reduce((t, x) => t + (x.dareAvere === 'AVERE' ? 1 : -1) * (x.importo || 0), 0);
      const r13 = tot('13', 'DARE'), ok = r13 > 0 && Q > 0;
      const ids = []; righe.forEach(x => { if((x.conto === '51' || x.conto === '52') && x.dareAvere === 'AVERE' && x.centroCostoId && !ids.some(y => String(y) === String(x.centroCostoId))) ids.push(x.centroCostoId); });
      (dp.ore || []).forEach(o => { if(!ids.some(y => String(y) === String(o.centroCostoId))) ids.push(o.centroCostoId); });
      const centri = ids.map(id => {
        const c = centroDi(s, id), ore = (dp.ore || []).filter(o => String(o.centroCostoId) === String(id));
        return {centroCostoId: id, centroNome: c ? c.nome : String(id), oreStd: ore.length ? ore[0].oreStandard || 0 : 0, oreReali: ore.length ? ore[0].oreReale || 0 : 0,
          assorbitoPersonale: e2(c2(tot('51', 'AVERE', id))), assorbitoGenerali: e2(c2(tot('52', 'AVERE', id))),
          stdPersonale: null, stdGenerali: null, varPersonale: null, varGenerali: null, varianza: netto('61', id) !== 0 ? e2(c2(netto('61', id))) : null};
      });
      r.snapshotCosto = {schema: schemaCostoStandard(), legacy: true, motivoLegacy: 'Produzione registrata prima della distinta versionata: la ripartizione dello standard fra Taglio e Saldatura non è verificabile e non viene ricostruita con le tariffe di oggi.',
        dataMigrazione: oggi, dataProduzione: r.data || '', commessaId: dp.commessaId || '', quantita: Q, versioneDistinta: null,
        costoTotale: ok ? e2(c2(r13)) : null, costoUnitario: ok ? r13 / Q : null, costoUnitarioLotto: ok ? r13 / Q : null,
        materiale: {kgStdTot: dp.kgStandard || 0, kgReale: dp.kgReale || 0, costoRealeTot: e2(c2(tot('12', 'AVERE'))), varianza: e2(c2(netto('60')))},
        operazioni: null, centri, varianze: {materiale: e2(c2(netto('60'))), manodopera: e2(c2(netto('61')))},
        anomalia: ok ? '' : 'costo storico non verificabile (manca la riga Dare 13 o la quantità prodotta): il lotto non può essere valorizzato.'};
      nLegacy++;
    });
    // 4. COGS da DDT/SD: via SOLO il centro produttivo errato. Importo, data, documento e riferimenti restano identici.
    (s.registrazioni || []).filter(r => r.origineSD && (r.origineSD.tipo === 'DDT' || r.origineSD.tipo === 'FATT')).forEach(r => {
      (r.righe || []).forEach(x => { if((x.conto === '41' || x.conto === '13') && x.centroCostoId){ x.centroCostoId = ''; nCogs++; } });
      if(r.origineSD.tipo === 'DDT' && !r.riferimentiCOGS && s.sdmm){
        const d = (s.sdmm.ddt || []).find(y => y.id === r.origineSD.id), o = d && (s.sdmm.ordini || []).find(y => y.id === d.ordId);
        if(d) r.riferimentiCOGS = {ordine: d.ordId, commessaId: o && o.commessaId ? String(o.commessaId) : '', ddt: [d.id], lotti: null, nota: 'DDT precedente alla migrazione: costo FIFO già memorizzato nel documento, lotti non dettagliati'};
      }
    });
    s.schemaCostoStandard = schemaCostoStandard();
    if(rawSalvato){
      s.migrazioniCosto = (s.migrazioniCosto || []).concat([{schema: schemaCostoStandard(), data: new Date().toISOString(), backup: chiaveBackup, produzioniLegacy: nLegacy, righeCogsCorrette: nCogs}]);
      window.__migrazioneCostoEseguita = true;
    }
    (s.registrazioni || []).forEach(r => { if(r.snapshotCosto) congelaProfondo(r.snapshotCosto); });
  }catch(e){
    window.__anomaliaMigrazione = 'Migrazione dei costi storici interrotta (' + e.message + '): i dati salvati non sono stati modificati.';
    window.__migrazioneCostoEseguita = false;
    return originale;
  }
  return s;
}

function guidaCentriHtml(tipo){
  const data = (document.getElementById('reg-data') || {}).value || '';
  const st = statoPoolCentri(data);
  const righe = st.map(x => `<tr><td>${x.centro.nome}</td><td class="num cifre">${euro(x.pers)}</td><td class="num cifre">${euro(x.gen)}</td>
    <td class="num cifre">${x.oreCoperte.toFixed(0)} h</td><td class="num cifre">${(x.centro.oreAnnuePreviste||0).toFixed(0)} h</td></tr>`).join('');
  return `<details id="guida-centri" class="riquadro" ${tipo === 'PRODUZIONE' ? 'open' : ''} style="margin-top:10px">
    <summary style="cursor:pointer"><b>Quando servono i centri di costo</b> — promemoria per registrare una commessa</summary>
    <ol style="margin:8px 0 8px 18px;line-height:1.5">
      <li><b>Prima: Ragioneria FI → 3a Budget mensile dei centri</b> (preventivo gestionale senza scrittura FI). Il vecchio percorso contabile qui descritto resta solo per dati preesistenti: è il &laquo;bloccone&raquo; delle buste paga. In <b>DARE</b> i conti 51 (buste paga) e 52 (costi generali) <b>su ogni centro</b>: Taglio, Saldatura… È qui che il centro di costo si indica per la prima volta: riempie il &laquo;malloppo&raquo; del centro. La data della scrittura deve essere <b>non successiva</b> alla data della produzione.</li>
      <li><b>Poi: Dichiarazione di produzione</b> della commessa. In <b>AVERE</b> gli stessi conti 51 e 52 sugli stessi centri (le righe si propongono da sole: ore &times; tariffa): il bloccone si scarica <b>blocchino per blocchino</b>, commessa dopo commessa. Consuma il malloppo: se non ne hai caricato abbastanza, la scrittura non si registra.</li>
      <li><b>Acquisti, vendite, DDT, incassi, pagamenti:</b> nessun centro di costo. Sulle vendite c'&egrave; solo il centro di ricavo.</li>
    </ol>
    <p class="aiuto" style="margin-bottom:6px"><b>Regola pratica:</b> i costi caricati fino alla data di produzione devono coprire le ore lavorate. Le ore coperte sono costi caricati &divide; tariffa oraria del centro; la capacit&agrave; annua &egrave; il limite massimo.</p>
    <table class="registro"><thead><tr><th>Centro</th><th class="num">Buste paga caricate (51)</th><th class="num">Generali caricati (52)</th><th class="num">Ore coperte oggi</th><th class="num">Capacit&agrave; annua</th></tr></thead>
    <tbody>${righe || '<tr><td colspan="5" class="vuoto">Nessun centro con costi previsti.</td></tr>'}</tbody></table></details>`;
}

// Piano di caricamento automatico dei mesi di costi che mancano ai centri per registrare la produzione corrente
function pianoCaricoMancante(righeIn, dataIn){
  const data = dataIn || (document.getElementById('reg-data') || {}).value || '';
  if(!data) return {errore:'Imposta prima la data della produzione.'};
  // I costi HR si leggono dal giornale; verifica prima se il fabbisogno è già coperto.
  const richiesti = {};
  (righeIn || righeScritturaCorrente).filter(r => (r.conto === '51' || r.conto === '52') && r.dareAvere === 'AVERE' && r.centroCostoId)
    .forEach(r => { const k = `${r.centroCostoId}|${r.conto}`; richiesti[k] = (richiesti[k] || 0) + r.importo; });
  if(!Object.keys(richiesti).length) return {errore:'Inserisci prima pezzi, ferro e ore della produzione.'};
  const disp = {}; Object.keys(richiesti).forEach(k => { const [c, conto] = k.split('|'); disp[k] = saldoMinimoPool(c, conto, data); });
  const coperto = () => Object.keys(richiesti).every(k => disp[k] + 0.005 >= richiesti[k]);
  if(coperto()) return {gia:true, data};
  if(window.FI && (STATO.fi.preset==='nuova'||STATO.registrazioni.some(r=>r.fi?.cedolini))){
    const dettagli=Object.keys(richiesti).filter(k=>disp[k]+0.005<richiesti[k]).map(k=>{const [centro,conto]=k.split('|');return spiegaPoolInsufficiente(centro,conto,data,richiesti[k]);});
    return {errore:dettagli.join(' · ')+'. Nessun costo automatico inventato: completa soltanto i documenti effettivi mancanti.'};
  }
  const centri = STATO.centriDiCosto.filter(c => (c.costoPersonaleAnnuo || 0) + (c.costoGeneraleAnnuo || 0) > 0);
  const r2 = x => Math.round(x * 100) / 100, anno = data.slice(0, 4), meseProd = +data.slice(5, 7), mesi = [];
  // solo mesi già maturati: da gennaio fino al mese della produzione compreso, MAI mesi futuri
  for(let m = 1; m <= meseProd && !coperto(); m++){
    const periodo = `${anno}-${String(m).padStart(2, '0')}`;
    if(caricamentoPeriodoEsistente(periodo)) continue;
    if(STATO.registrazioni.some(r=>r.fi?.cedolini?.some(e=>e.mese===periodo))) return {errore:'Paghe analitiche presenti: non usare il caricamento automatico del personale. Completa i costi mancanti senza duplicare il conto 51.'};
    const righe = []; let totP = 0, totG = 0;
    centri.forEach(c => {
      const p = r2((c.costoPersonaleAnnuo || 0) / 12), g = r2((c.costoGeneraleAnnuo || 0) / 12);
      if(p > 0){ righe.push({conto:'51', dareAvere:'DARE', importo:p, centroCostoId:c.id, centroRicavoId:''}); totP += p; if(('' + c.id + '|51') in disp) disp[c.id + '|51'] += p; }
      if(g > 0){ righe.push({conto:'52', dareAvere:'DARE', importo:g, centroCostoId:c.id, centroRicavoId:''}); totG += g; if(('' + c.id + '|52') in disp) disp[c.id + '|52'] += g; }
    });
    if(totP > 0) righe.push({conto:'22', dareAvere:'AVERE', importo:r2(totP), centroCostoId:'', centroRicavoId:''});
    if(totG > 0) righe.push({conto:'23', dareAvere:'AVERE', importo:r2(totG), centroCostoId:'', centroRicavoId:''});
    // data della scrittura: fine del mese di competenza, mai oltre la data della produzione (che resta il limite superiore)
    const fineMese = new Date(Date.UTC(+anno, +periodo.slice(5, 7), 0)).toISOString().slice(0, 10);
    const dataScrittura = fineMese < data ? fineMese : data;
    mesi.push({periodo, righe, data: dataScrittura});
  }
  if(!coperto()){
    const resto = Object.keys(richiesti).filter(k => disp[k] + 0.005 < richiesti[k]).reduce((o, k) => { const id = k.split('|')[0]; o[id] = (o[id] || 0) + (richiesti[k] - disp[k]); return o; }, {});
    const testi = Object.keys(resto).map(id => { const c = STATO.centriDiCosto.find(x => String(x.id) === String(id)) || {}, tar = tariffaOraria(c) || 0; return `${c.nome || id}: mancherebbero ancora ${euro(resto[id])}${tar > 0 ? ` (≈ ${Math.ceil(resto[id] / tar)} ore)` : ''}`; });
    return {errore:`Non basta nemmeno caricando tutti i mesi da gennaio a ${String(meseProd).padStart(2, '0')}/${anno} (i mesi futuri non si caricano): ${testi.join(' · ')}. Riduci i pezzi, sposta la produzione a una data successiva oppure aumenta addetti/ore del centro (Budget Annuo → Capacità). Non ho caricato nulla.`};
  }
  return {data, mesi};
}
// 1° passo: mostra le scritture che verrebbero registrate (nessuna scrittura nel Libro Giornale finché non confermi)
function caricaCostiMancantiProduzione(){
  const p = pianoCaricoMancante();
  if(p.errore){ mostraToast('⚠️ ' + p.errore, true); return; }
  if(p.gia){ mostraToast('I costi caricati coprono già questa produzione.'); proponiRigheProduzione(); return; }
  window.__pianoCarico = p;
  const aggr = {}; let dare = 0, avere = 0;
  p.mesi.forEach(m => m.righe.forEach(r => { const k = `${r.dareAvere}|${r.conto}|${r.centroCostoId}`; aggr[k] = aggr[k] || {...r, importo:0}; aggr[k].importo += r.importo; if(r.dareAvere === 'DARE') dare += r.importo; else avere += r.importo; }));
  const righe = Object.values(aggr).sort((a, b) => (a.dareAvere === 'DARE' ? 0 : 1) - (b.dareAvere === 'DARE' ? 0 : 1) || a.conto.localeCompare(b.conto));
  const box = document.getElementById('prod-carico-auto'); if(!box) return;
  const nomi = p.mesi.map(m => m.periodo.split('-').reverse().join('/')).join(', ');
  box.innerHTML = `<div class="riquadro" style="margin-top:10px;background:var(--carta-scura);border-color:var(--oro)">
    <h3 style="margin-bottom:6px">Anteprima: ${p.mesi.length} caricamenti mensili di costi dei centri</h3>
    <p class="aiuto" style="margin-bottom:6px">Mesi: <b>${nomi}</b> · solo mesi già maturati, nessun mese futuro · valori standard del Budget · ogni scrittura è datata a fine del proprio mese (mai oltre il ${p.data.split('-').reverse().join('/')} della produzione) · verranno registrate ${p.mesi.length} scritture, ciascuna quadrata. Somma delle scritture:</p>
    <table class="registro"><thead><tr><th>Conto</th><th>Centro</th><th class="num">Dare</th><th class="num">Avere</th></tr></thead><tbody>
      ${righe.map(r => `<tr><td>${nomeConto(r.conto)}</td><td class="aiuto">${nomeCentroCosto(r.centroCostoId) || ''}</td><td class="num cifre dare">${r.dareAvere === 'DARE' ? euro(r.importo) : ''}</td><td class="num cifre avere">${r.dareAvere === 'AVERE' ? euro(r.importo) : ''}</td></tr>`).join('')}
      <tr><td><b>Totale</b> ${Math.abs(dare - avere) < 0.005 ? '<span class="badge ok">✓ quadra</span>' : '<span class="badge no">non quadra</span>'}</td><td></td><td class="num cifre"><b>${euro(dare)}</b></td><td class="num cifre"><b>${euro(avere)}</b></td></tr></tbody></table>
    <div style="margin-top:10px;display:flex;gap:8px"><button class="azione" onclick="confermaCaricoAutomatico()">✅ Conferma e registra nel Libro Giornale</button><button class="azione secondaria" onclick="annullaCaricoAutomatico()">Annulla</button></div></div>`;
  if(box.scrollIntoView) box.scrollIntoView({behavior:'smooth', block:'center'});
}
function annullaCaricoAutomatico(){ window.__pianoCarico = null; const b = document.getElementById('prod-carico-auto'); if(b) b.innerHTML = ''; }
// 2° passo: registra davvero (ricalcola il piano: se nel frattempo qualcosa è cambiato, non registra un piano vecchio)
function confermaCaricoAutomatico(){
  const p = pianoCaricoMancante();
  if(p.errore){ mostraToast('⚠️ ' + p.errore, true); return; }
  if(p.gia){ annullaCaricoAutomatico(); mostraToast('I costi caricati coprono già questa produzione.'); proponiRigheProduzione(); return; }
  p.mesi.forEach(m => STATO.registrazioni.push({id: STATO.prossimoIdRegistrazione++, data:m.data, descrizione:`Caricamento costi centri ${m.periodo} (automatico)`, tipo:'CARICAMENTO_CENTRI', righe:m.righe, dettaglioCaricamentoCentri:{periodo:m.periodo}}));
  salvaStato(); window.__pianoCarico = null;
  const nomi = p.mesi.map(m => m.periodo.split('-').reverse().join('/')).join(', ');
  mostraToast(`✅ Caricati ${p.mesi.length} mesi di costi dei centri (${nomi}). Ora puoi registrare la produzione.`);
  const g = document.getElementById('guida-centri'); if(g) g.outerHTML = guidaCentriHtml('PRODUZIONE');
  proponiRigheProduzione();
}

function controlloPoolProduzione(dettagli, data){
  const righe = dettagli.map(d => {
    const centro = STATO.centriDiCosto.find(c => c.id === d.id) || {};
    const pP = saldoMinimoPool(d.id, '51', data), pG = saldoMinimoPool(d.id, '52', data);
    const richiesto = d.addebitoPersonale + d.addebitoGenerali, disponibile = pP + pG;
    const manca = Math.max(0, d.addebitoPersonale - pP) + Math.max(0, d.addebitoGenerali - pG);
    const tar = tariffaOraria(centro) || 0, mensile = ((centro.costoPersonaleAnnuo||0) + (centro.costoGeneraleAnnuo||0)) / 12;
    const esito = manca <= 0.005 ? '<span class="badge ok">✓ coperto</span>'
      : `<span class="badge no">mancano ${euro(manca)}${tar > 0 ? ` (≈ ${Math.ceil(manca / tar)} h)` : ''}${mensile > 0 ? ` = ${(manca / mensile).toLocaleString('it-IT', {maximumFractionDigits:1})} mesi di costi` : ''}</span>`;
    return {ok: manca <= 0.005, html: `<tr><td>${d.nome}</td><td class="num cifre">${d.oreReale.toLocaleString('it-IT', {maximumFractionDigits:1})} h</td><td class="num cifre">${euro(richiesto)}</td><td class="num cifre">${euro(disponibile)}</td>
      <td class="num cifre">${tar > 0 ? (Math.max(0, disponibile) / tar).toFixed(0) + ' h' : '—'}</td><td>${esito}</td></tr>`};
  });
  const tutto = righe.every(r => r.ok);
  // pezzi della commessa: si avvisa se la produzione cumulata supera quanto pianificato (assorbimento oltre il piano)
  const cid = (document.getElementById('prod-commessa') || {}).value, com = STATO.commesse.find(x => String(x.id) === String(cid));
  const Q = numeroIt((document.getElementById('prod-quantita') || {}).value) || 0;
  let avvisoPezzi = '';
  if(com && Q > 0){
    const gia = pezziGiaProdotti(cid), tot = gia + Q, oltre = tot - (com.quantitaPianificata || 0);
    avvisoPezzi = `<p class="aiuto" style="margin-top:6px">Commessa ${com.codice}: pianificati ${com.quantitaPianificata} pz · già prodotti ${gia} · con questa produzione ${tot}${oltre > 0 ? ` — <b style="color:var(--rosso)">${oltre} pz oltre il piano</b>: la manodopera scaricata su questa commessa supera quella prevista` : ' — entro il piano'}.</p>`;
  }
  return `<div class="riquadro" id="prod-controllo-pool" style="margin-bottom:10px;border-color:${tutto ? 'var(--verde)' : 'var(--rosso)'}">
    <h3 style="margin-bottom:6px">Controllo costi dei centri ${tutto ? '<span class="badge ok">✓ la produzione si può registrare</span>' : '<span class="badge no">costi caricati insufficienti</span>'}</h3>
    <table class="registro"><thead><tr><th>Centro</th><th class="num">Ore da lavorare</th><th class="num">Costo da addebitare</th><th class="num">Costi caricati${data ? ' al ' + data.split('-').reverse().join('/') : ''}</th><th class="num">Ore coperte</th><th>Esito</th></tr></thead>
    <tbody>${righe.map(r => r.html).join('')}</tbody></table>${avvisoPezzi}
    ${tutto ? '' : '<p class="aiuto" style="margin:6px 0">Verifica il <b>Budget mensile dei centri in Ragioneria FI (3a)</b> e i costi effettivi mancanti. Nessun caricamento contabile automatico e nessuna paga duplicata:</p><button class="azione" onclick="caricaCostiMancantiProduzione()">📋 Istruzioni budget mensile</button><div id="prod-carico-auto"></div>'}</div>`;
}

// ── Commesse create dallo studente: creazione rapida (dal flusso ordini/produzione) ed eliminazione
function formCommessaRapidaHtml(pfx){
  const sugg = 'COM-' + String(STATO.prossimoIdCommessa || 1).padStart(3, '0');
  return `<div class="riquadro" style="border-color:var(--oro)">
    <h3 style="margin-bottom:6px">Crea la tua commessa</h3>
    <p class="aiuto">${STATO.commesse.length ? 'Nessuna commessa APERTA: riaprine una in Impostazioni oppure creane una nuova qui.' : 'Non ci sono ancora commesse: ogni commessa è un lotto di produzione (un ordine del tuo cliente da produrre). Creane una qui.'}</p>
    <div class="riga-campi">
      <div class="campo"><label>Codice</label><input type="text" id="${pfx}-com-codice" value="${sugg}"></div>
      <div class="campo"><label>Descrizione (cliente / lavoro)</label><input type="text" id="${pfx}-com-descrizione" placeholder="es. Fornitura cliente X"></div>
      <div class="campo"><label>Quantità pianificata (pezzi)</label><input class="cifre" type="number" min="1" id="${pfx}-com-quantita"></div>
      <div style="flex:0 0 auto;align-self:flex-end"><button class="azione" onclick="creaCommessaRapida('${pfx}')">➕ Crea commessa</button></div>
    </div></div>`;
}
function creaCommessaRapida(pfx){
  // i campi del modulo ordini stanno nello Shadow DOM di SD/MM, quelli della produzione nel documento
  const host = document.getElementById('sdmm-host'), sh = host && host.shadowRoot;
  const hp = document.getElementById('pp-host'), shp = hp && hp.shadowRoot;
  const v = id => ((document.getElementById(`${pfx}-com-${id}`) || (sh && sh.getElementById(`${pfx}-com-${id}`)) || (shp && shp.getElementById(`${pfx}-com-${id}`))) || {}).value || '';
  const codice = v('codice').trim(), descrizione = v('descrizione').trim(), quantita = parseFloat(v('quantita')) || 0;
  if(window.Fabbisogno){const err=Fabbisogno.errore(quantita,true);if(err){mostraToast(err,true);return null;}}
  if(!codice){ mostraToast('⚠️ Dai un codice alla commessa', true); return null; }
  if(STATO.commesse.some(c => c.codice.toLowerCase() === codice.toLowerCase())){ mostraToast(`⚠️ Esiste già una commessa con codice ${codice}`, true); return null; }
  if(!(quantita > 0)){ mostraToast('⚠️ Indica la quantità pianificata (pezzi, maggiore di zero)', true); return null; }
  const c = {id: STATO.prossimoIdCommessa++, codice, descrizione, quantitaPianificata: quantita, stato:'aperta'};
  STATO.commesse.push(c); salvaStato();
  if(document.getElementById('tab-commesse')) renderCommesse();
  mostraToast(`✅ Commessa ${codice} creata`);
  if(pfx === 'prod') cambiaTipoRegistrazione();
  if(pfx === 'pp' && window.PP && PP.dopoCommessa) PP.dopoCommessa(c);
  if(window.SDMM && SDMM.dopoCommessa) SDMM.dopoCommessa(c.id);
  return c;
}
function eliminaCommessa(id){
  const c = STATO.commesse.find(x => x.id === id); if(!c) return;
  const usata = STATO.registrazioni.some(r => (r.dettaglioProduzione && String(r.dettaglioProduzione.commessaId) === String(id)) || (r.dettaglioVendita && String(r.dettaglioVendita.commessaId) === String(id)))
    || ((STATO.sdmm && STATO.sdmm.ordini) || []).some(o => String(o.commessaId) === String(id));
  if(usata){ mostraToast(`⚠️ La commessa ${c.codice} ha già ordini o registrazioni collegati: non si elimina (puoi chiuderla).`, true); return; }
  if(!confirm(`Eliminare la commessa ${c.codice}?`)) return;
  STATO.commesse = STATO.commesse.filter(x => x.id !== id); salvaStato(); renderCommesse(); cambiaTipoRegistrazione(); mostraToast('Commessa eliminata');
}
// Liquidazioni degli ordini di produzione (CO88): dalle scritture PP_KO88 e, per gli ordini chiusi senza nessuna
// varianza (nessuna scrittura da registrare), dal dettaglio salvato sull'ordine, così i report mostrano comunque ore e costi
function liquidazioniPP(){
  const out = STATO.registrazioni.filter(r => r.tipo === 'PP_KO88' && r.dettaglioKO88 && !r.annullataDa);
  ((STATO.pp && STATO.pp.ordini) || []).forEach(o => {
    if(o.liquidazione && o.liquidazione.dettaglio && !o.liquidazione.regId) out.push({data:o.liquidazione.data, dettaglioKO88:o.liquidazione.dettaglio});
  });
  return out;
}
function caricamentoPeriodoEsistente(periodo){
  return STATO.registrazioni.some(r => r.tipo === 'CARICAMENTO_CENTRI' && r.dettaglioCaricamentoCentri?.periodo === periodo);
}

// Variance di Capacità (costo fisso dei centri − costo assorbito dalla
// produzione) per l'anno intero (pesoFrazione=1) o per una sua quota
// mensile (pesoFrazione=peso del mese, 0..1) — usata sia dal Bilancio
// Previsionale (annuale) sia dal Controllo Mensile (quota del mese).
// "sforato" resta sempre riferito alla capacità ANNUALE: la saturazione
// di un centro è una domanda sull'intero anno, non sul singolo mese.
function calcolaVarianceCapacita(volumeAnnuo, pesoFrazione){
  let varianceTotale = 0, sforato = false;
  const perCentro = {}; // id centro -> {costoFissoPeriodo, costoAssorbitoPeriodo, varianceCentro}
  STATO.distintaBase.ciclo.forEach(r => {
    const centro = STATO.centriDiCosto.find(c => c.id === r.centroCostoId);
    if(!centro) return;
    const oreRichiesteAnnue = r.oreStandard * volumeAnnuo;
    if(centro.oreAnnuePreviste > 0 && oreRichiesteAnnue > centro.oreAnnuePreviste) sforato = true;
    const costoFissoPeriodo = ((centro.costoPersonaleAnnuo||0) + (centro.costoGeneraleAnnuo||0)) * pesoFrazione;
    const costoAssorbitoPeriodo = (oreRichiesteAnnue * pesoFrazione) * tariffaOraria(centro);
    varianceTotale += costoFissoPeriodo - costoAssorbitoPeriodo;
    perCentro[centro.id] = { costoFissoPeriodo, costoAssorbitoPeriodo, varianceCentro: costoFissoPeriodo - costoAssorbitoPeriodo };
  });
  return {varianceTotale, sforato, perCentro};
}
