/* Esercitazione «Dicembre: dalla costituzione alla riapertura» sul sistema integrato S/4 con il WMS attivo.
   L'azienda nasce il 01/12/2026 da zero: capitale, macchinari, assicurazione, ferro, un ordine transenna
   con tre fasi e WIP analitico, un semilavorato autonomo a scorta, consegna con picking WMS, fatture,
   anticipo su fatture, pagamenti, sopravvenienza, cessioni con plus e minusvalenza, stipendi, ratei e risconti,
   ammortamenti, IVA, imposte, chiusura, riapertura e primi giorni di gennaio 2027.
   Date e numeri appartengono all'azienda didattica. */
(function () {
  'use strict';
  // Non reinterpretare le aziende già costituite con il precedente modello a tre ordini.
  var corrente = null;
  try {
    corrente = typeof window.MSA_STATO_CORRENTE === 'function' ? window.MSA_STATO_CORRENTE() : window.MSA_STATO_CORRENTE;
    if (!corrente && window.MSA_GUIDA && window.MSA_GUIDA.chiave) corrente = JSON.parse(window.localStorage.getItem(window.MSA_GUIDA.chiave) || 'null');
  } catch (e) { /* Un salvataggio non leggibile non va alterato dalla guida. */ }
  if (corrente && corrente.costituzione && corrente.produzioneModello !== 'wip-fasi-v1' && window.MSA_ESERCIZIO_DICEMBRE_LEGACY) {
    window.MSA_ESERCIZIO = window.MSA_ESERCIZIO_DICEMBRE_LEGACY;
    return;
  }
  var D='erp_dati.', M='erp_magazzino.', A='erp_acquisti.', P='erp_produzione.', C='erp_costi.', V='erp_vendite.', X='erp_spedizione.', T='erp_tesoreria.', F='erp_fi.', K='erp_cespiti.', H='erp_chiusura.', Y='erp_paghe.', I='erp_inventario.', Z='erp_innovazione.';
  var regs = function(h) { return h.S.registrazioni || []; };
  var reg = function(h,tipo,data) { return regs(h).some(function(r){return r.tipo===tipo && (!data || r.data===data);}); };
  var saldo = function(h,c,alla,partner) { return Math.round(regs(h).reduce(function(s,r){if(alla && r.data>alla)return s;if(r.chiusura==='stato patrimoniale'||r.chiusura==='epilogo'||r.chiusura==='riapertura')return s;return s+(r.righe || []).filter(function(x){return x.conto===c && (!partner || x.partner===partner);}).reduce(function(t,x){return t+(x.dareAvere==='DARE'?x.importo:-x.importo);},0);},0)*100)/100; };
  var cesp = function(h,d) { return (h.S.cespiti || []).find(function(c){return c.descrizione===d;}); };
  var ordine = function(h,rif) { return (h.S.ordini || []).find(function(o){return o.rif===rif;}); };
  var consegna = function(h,rif) { var o=ordine(h,rif); return o && (h.S.consegne || []).find(function(c){return c.ordine===o.numero && c.wm;}); };
  var fattura = function(h,rif) { var c=consegna(h,rif); return c && (h.S.fatture || []).find(function(f){return f.tipo==='F2' && f.consegna===c.numero;}); };
  var prod = function(h,mat) { return (h.S.produzione || []).find(function(o){return o.materiale===mat && o.data.slice(0,7)==='2026-12';}); };
  var evento = function(h,mat,tipo) { var o=prod(h,mat); return !!o && o.eventi.some(function(e){return e.tipo===tipo && !e.stornato;}); };
  var fase = function(h,nome) { var o=prod(h,'TR-STD');return !!o && o.eventi.filter(function(e){return e.tipo==='CO11N' && e.fase===nome && !e.stornato;}).reduce(function(q,e){return q+(e.qta || 0);},0)>=o.qta; };
  var compiti = function(h,tipo,f) { return ((h.S.wm || {}).compiti || []).filter(function(t){return t.tipo===tipo && t.stato!=='annullato' && (!f || f(t));}); };
  var fatti = function(ts,n) { return ts.length>=n && ts.every(function(t){return t.stato==='confermato' && Math.abs(t.qtaEff-t.qta)<1e-6;}); };
  var diOrdine = function(h,mat) { var o=prod(h,mat); return function(t){return !!o && t.ordine===o.numero;}; };
  var entrataDi = function(h,mat) { var o=prod(h,mat), docs=o?o.eventi.filter(function(e){return e.tipo==='101';}).map(function(e){return e.doc;}):[]; return function(t){return t.mat===mat && docs.indexOf(t.rif)>=0;}; };
  var acquisto = function(h) { return (h.S.acquisti || []).find(function(o){return o.materiale==='FERRO' && o.qta===3000 && o.data==='2026-12-03';}); };
  var riordino = function(h) { return (h.S.acquisti || []).find(function(o){return o.materiale==='FERRO' && o.qta===500 && o.data==='2026-12-05';}); };
  var entrataAcq = function(o) { var docs=o?(o.entrate || []).map(function(e){return e.doc;}):[]; return function(t){return t.mat==='FERRO' && docs.indexOf(t.rif)>=0;}; };
  var inv = function(h) { return (((h.S.wm || {}).inventari) || []).find(function(d){return d.data==='2026-12-31';}); };
  var paga = function(h,f,data) { return regs(h).some(function(r){return r.tipo==='PAGAMENTO_FORNITORE' && r.data===data && r.righe.some(function(x){return x.conto==='20' && x.partner===f;});}); };
  var ass = function(h,tipo) { return ((h.S.chiusura || {}).assestamenti || []).find(function(x){return x.tipo===tipo && x.data==='2026-12-31';}); };
  var rf = 'Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Le destinazioni e le UdC si leggono dalla schermata, non si inventano.';
  var passi = [
    {g:'0 · Preparazione',titolo:'Prima di cominciare: un sistema vuoto',dove:{ep:D+'avvio'},percorso:'Launchpad → Avvio e dati di base → Avvio del sistema',
     campi:[['Ambiente','Sistema integrato, guida «Dicembre: dalla costituzione alla riapertura»'],['Condizione iniziale','Nessun documento: se c’è lavoro vecchio, in fondo alla pagina premi «Azzera il sistema integrato» e conferma'],['Durata orientativa','5–6 ore, in due o tre lezioni: il lavoro resta salvato']],
     nota:'Azzerare cancella i documenti del sistema integrato: se servono, prima scarica il backup. L’esercizio si può rifare da capo quante volte si vuole: «Azzera» e si riparte dal passo 1. Le altre guide (Ragioneria con WMS, percorso gennaio–dicembre) usano gli stessi dati: cambiare guida non crea una nuova azienda.',
     fatto:function(h){return !h.S.avviato || !!h.S.costituzione;}},
    // ── 1 · costituzione ──
    {g:'1 · Costituzione',data:'01/12/2026',titolo:'Costituisci la società con 80.000 € di capitale',contabile:true,dove:{ep:D+'avvio'},percorso:'Avvio e dati di base → Avvio del sistema → riquadro «Oppure: azienda nuova (costituzione)»',
     campi:[['Data di costituzione','01/12/2026'],['Capitale sociale sottoscritto','80000'],['Pulsante','Costituisci la società (NON «Avvia il sistema», che caricherebbe scorte e banca già pronte)']],
     attesa:'D 08 Crediti verso soci per versamenti ancora dovuti / A 30 Capitale sociale 80.000. Banca a zero, magazzino vuoto. Il sistema prepara la TR-STD con tre fasi sullo stesso ordine, un solo HALB autonomo SL-TAGLIO, i costi standard e i tre dipendenti assunti oggi.',
     nota:'Con l’atto costitutivo i soci si impegnano a versare: nasce un credito della società verso i soci. Il denaro arriva con il passo dopo.',fatto:function(h){return !!h.S.costituzione && h.S.costituzione.data==='2026-12-01';}},
    {g:'1 · Costituzione',data:'01/12/2026',titolo:'I soci versano il capitale in banca',contabile:true,dove:{ep:D+'avvio'},percorso:'Avvio e dati di base → Avvio del sistema → riquadro dell’azienda nuova',campi:[['Importo versato','vuoto = tutto il sottoscritto (80.000)'],['Data del versamento','01/12/2026']],
     attesa:'D 10 Banca / A 08 Crediti verso soci 80.000. Il credito verso i soci va a zero; banca 80.000.',fatto:function(h){return reg(h,'VERSAMENTO_SOCI') && saldo(h,'08')===0;}},
    {g:'1 · Costituzione',data:'01/12/2026',titolo:'Attiva il magazzino W100 (vuoto)',dove:{ep:M+'struttura'},percorso:'WMS → Struttura e attivazione',campi:[['Data di attivazione','01/12/2026']],
     attesa:'41 ubicazioni create, nessuna unità di carico: il magazzino è vuoto come la contabilità. Nessuna scrittura.',
     nota:'Da qui in poi ogni merce che entra, si sposta o esce passa da un compito di magazzino confermato con la pistola RF.',fatto:function(h){return (h.S.wm || {}).attivo==='2026-12-01';}},
    {g:'1 · Costituzione',titolo:'Leggi il ciclo a fasi e il semilavorato autonomo',dove:{ep:P+'ordini'},percorso:'PP → Ordini di produzione → Distinta e ciclo; poi CO → Calcolo del costo standard',
     campi:[['TR-STD','8 kg ferro × 0,95 = 7,60; Taglio 0,25 h + Piegatura 0,20 h + Saldatura 0,40 h, a 28 €/h: standard 31,40 €/pz'],['Un solo ordine','Il ferro e le ore delle tre fasi si accumulano nello stesso WIP analitico. Nessuna entrata merci tra le fasi; un solo 101 del finito alla fine'],['HALB autonomo','SL-TAGLIO: 8 kg ferro 7,60 + Taglio 0,25 h × 28 = 7,00 → 14,60 €/pz. Un ordine separato produce 20 kit a scorta, non alimenta l’ordine TR-STD'],['Scheda di calcolo','sovraccosti 0%, tariffa 28 €/h, lotto 100']],
     nota:'WIP analitico = costi addebitati all’ordine meno output accreditato: non è una scorta IM/WMS e non genera da solo una capitalizzazione FI. I vecchi salvataggi mantengono il percorso precedente.'},
    // ── 2 · macchinari ──
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra la taglierina a nastro',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Taglierina a nastro'],['Classe','IMP Impianti e macchinari (10%)'],['Fornitore','F300 Macchine Alfa'],['Imponibile','15000'],['IVA %','22'],['Numero fattura','MA-101'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'Cespite CE-0001. D 01 Impianti e macchinari 15.000 + D 14 IVA a credito 3.300 / A 20 Fornitore 18.300.',fatto:function(h){return !!cesp(h,'Taglierina a nastro');}},
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra la piegatubi idraulica',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Piegatubi idraulica'],['Classe','IMP'],['Fornitore','F300'],['Imponibile','8000'],['IVA %','22'],['Numero fattura','MA-102'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'CE-0002. D 01 8.000 + D 14 1.760 / A 20 9.760.',fatto:function(h){return !!cesp(h,'Piegatubi idraulica');}},
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra la saldatrice a filo',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Saldatrice a filo'],['Classe','IMP'],['Fornitore','F300'],['Imponibile','6000'],['IVA %','22'],['Numero fattura','MA-103'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'CE-0003. D 01 6.000 + D 14 1.320 / A 20 7.320. Ora ogni stadio ha la sua macchina.',fatto:function(h){return !!cesp(h,'Saldatrice a filo');}},
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra il carrello elevatore del magazzino',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Carrello elevatore elettrico'],['Classe','MEZ Mezzi di movimentazione interna (20%)'],['Fornitore','F300'],['Imponibile','12000'],['IVA %','22'],['Numero fattura','MA-104'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'CE-0004. D 03 Mezzi di movimentazione 12.000 + D 14 2.640 / A 20 14.640.',fatto:function(h){return !!cesp(h,'Carrello elevatore elettrico');}},
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra una sega circolare d’occasione',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Sega circolare'],['Classe','IMP'],['Fornitore','F300'],['Imponibile','2000'],['IVA %','22'],['Numero fattura','MA-105'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'CE-0005. D 01 2.000 + D 14 440 / A 20 2.440. Debito verso Macchine Alfa: 52.460.',
     nota:'È un acquisto a buon prezzo: a fine mese la rivenderemo con una plusvalenza.',fatto:function(h){return !!cesp(h,'Sega circolare');}},
    // ── 3 · assicurazione ──
    {g:'3 · Assicurazione',data:'01/12/2026',titolo:'FB60: registra la polizza annuale',contabile:true,dove:{ep:F+'passive'},percorso:'FI → Contabilità → Fatture passive di servizi e pagamenti',
     campi:[['Fornitore','F400 Assicurazioni Omega'],['Numero','POL-2026-118'],['Conto di costo','83 Assicurazioni'],['Descrizione','premio annuo polizza incendio e furto'],['Imponibile','1200'],['IVA %','0 (assicurazioni esenti)'],['Competenza','dal 01/12/2026 al 30/11/2027'],['Scadenza','02/12/2026'],['Data','01/12/2026']],
     attesa:'D 83 Assicurazioni / A 20 Fornitore 1.200, senza IVA. Il premio copre 12 mesi, ma solo dicembre è del 2026: lo sistemeremo a fine anno con il risconto.',
     fatto:function(h){return (h.S.fatturePassive || []).some(function(f){return f.rif==='POL-2026-118';});}},
    {g:'3 · Assicurazione',data:'02/12/2026',titolo:'F-53: paga la polizza',contabile:true,dove:{ep:F+'passive'},percorso:'FI → Contabilità → Fatture passive e pagamenti → Pagamento a un fornitore',
     campi:[['Fornitore','F400'],['Fattura','POL-2026-118'],['Importo','vuoto = tutto il debito'],['Data','02/12/2026']],attesa:'D 20 / A 10 Banca 1.200. Banca 78.800.',fatto:function(h){return paga(h,'F400','2026-12-02');}},
    // ── 4 · ordini cliente ──
    {g:'4 · Ordini dei clienti',data:'02/12/2026',titolo:'VA01: Beta ordina 180 TR-STD',dove:{ep:V+'ordini'},percorso:'SD → Ordini cliente',
     campi:[['Committente','C100 Beta Costruzioni'],['Materiale','TR-STD'],['Quantità','180'],['Riferimento cliente','BETA-180'],['Data','02/12/2026']],
     attesa:'Lordo 10.800 − sconto quantità 2% 216 = netto 10.584; IVA 2.328,48; totale 12.912,48. ATP: giacenza 0 → confermati 0 su 180, l’ordine aspetta la produzione. Nessuna scrittura.',fatto:function(h){return !!ordine(h,'BETA-180');}},
    {g:'4 · Ordini dei clienti',data:'02/12/2026',titolo:'VA01: Delta ordina 120 TR-STD',dove:{ep:V+'ordini'},percorso:'SD → Ordini cliente',
     campi:[['Committente','C200 Delta Noleggi'],['Materiale','TR-STD'],['Quantità','120'],['Riferimento cliente','DELTA-120'],['Data','02/12/2026']],
     attesa:'Netto 7.056 (7.200 − 2%); IVA 1.552,32; totale 8.608,32. Confermati 0 su 120. Totale da produrre: 300 transenne.',fatto:function(h){return !!ordine(h,'DELTA-120');}},
    // ── 5 · ferro ──
    {g:'5 · Acquisto del ferro',data:'03/12/2026',titolo:'ME21N: ordina 3.000 kg di ferro',dove:{ep:A+'ordini'},percorso:'MM → Ordini d’acquisto e rilascio',campi:[['Fornitore','F100 Acciaierie Umbre'],['Materiale','FERRO'],['Quantità','3000'],['Prezzo','1,00'],['Data','03/12/2026']],
     attesa:'Ordine 4500000001 da 3.000 €. Ne servono 2.560 kg (300 transenne × 8 + 20 kit autonomi × 8): il resto è scorta. Nessuna scrittura.',fatto:function(h){return !!acquisto(h);}},
    {g:'5 · Acquisto del ferro',data:'04/12/2026',titolo:'MIGO 101: ricevi il ferro, 200 kg sono schiacciati',contabile:true,dove:{ep:A+'entrate'},percorso:'MM → Entrata merci (anche da WMS)',
     campi:[['Ordine','4500000001'],['Quantità contata','vuoto = 3.000 come sul DDT'],['Numero DDT','DDT-AU-5512'],['Lotto (colata dal certificato)','COL-1204'],['Di cui danneggiati','200'],['Descrizione del danno','tubi schiacciati nel trasporto'],['Data','04/12/2026']],
     attesa:'D 12 Ferro 2.850 (a standard 0,95) + D 63 Differenza prezzo 150 / A 22 Fatture da ricevere 3.000: la merce è arrivata tutta ed è nostra. WMS: 2.800 kg buoni in 3 fasci (1.000 + 1.000 + 800) in GR-ZONE con 3 compiti di messa a posto; i 200 kg danneggiati vanno in stock BLOCCATO nella quarantena Q-ZONE.',
     nota:'Al ricevimento il magazziniere conta, confronta con il DDT e controlla lo stato della merce prima di firmare.',fatto:function(h){var o=acquisto(h);return !!o && o.entrato===3000 && ((h.S.wm || {}).blocchi || []).length>0;}},
    {g:'5 · Acquisto del ferro',data:'04/12/2026',titolo:'RF: metti a dimora i 3 fasci buoni in catasta',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','04/12/2026'],['Risorsa','MAG01 Marco'],['Compiti','i 3 PUTAWAY del ferro']],
     attesa:'F-01 con due fasci, F-02 con quello da 800. GR-ZONE vuota; i 200 kg restano in Q-ZONE. Nessuna scrittura: il ferro era già in contabilità.',nota:rf,fatto:function(h){return fatti(compiti(h,'PUTAWAY',entrataAcq(acquisto(h))),3);}},
    {g:'5 · Acquisto del ferro',data:'05/12/2026',titolo:'Quarantena: decidi sui 200 kg schiacciati',contabile:true,dove:{ep:M+'bloccato'},percorso:'WMS → Merce bloccata e danneggiata → Decisione sulla merce in quarantena',
     campi:[['UdC in quarantena','quella da 200 kg di FERRO'],['Esito del controllo','tubi schiacciati, non riparabili'],['Pulsante','Rottama: da buttare (555)'],['Data','05/12/2026']],
     attesa:'D 69 Rottamazioni e merce danneggiata / A 12 Ferro 190 (200 × 0,95). Il ferro esce dal magazzino e diventa un costo. Se il controllo avesse detto «buona», si sbloccava (343) e tornava a scaffale.',
     nota:'Il trasporto era a nostro rischio (franco partenza): il fornitore fattura tutti i 3.000 kg.',fatto:function(h){return reg(h,'ROTTAMAZIONE','2026-12-05');}},
    {g:'5 · Acquisto del ferro',data:'05/12/2026',titolo:'MIRO: registra la fattura del ferro',contabile:true,dove:{ep:A+'fatture'},percorso:'MM → Fatture fornitore',campi:[['Ordine','4500000001'],['Numero fattura','FR-2026-871'],['Prezzo','vuoto = quello dell’ordine'],['Data','05/12/2026']],
     attesa:'D 22 3.000 + D 14 IVA 660 / A 20 Acciaierie Umbre 3.660. Il conto 22 torna a zero.',fatto:function(h){return (h.S.fattureFornitore || []).some(function(f){return f.rif==='FR-2026-871';});}},
    {g:'5 · Acquisto del ferro',data:'05/12/2026',titolo:'ME21N: riordino urgente di 500 kg',dove:{ep:A+'ordini'},percorso:'MM → Ordini d’acquisto e rilascio',campi:[['Fornitore','F100'],['Materiale','FERRO'],['Quantità','500'],['Prezzo','1,08 (consegna urgente)'],['Data','05/12/2026']],
     attesa:'Ordine 4500000002 da 540 €. Con 2.800 kg buoni ne restano solo 240 dopo i due ordini: si ricostituisce la scorta di sicurezza. Nessuna scrittura.',fatto:function(h){return !!riordino(h);}},
    {g:'5 · Acquisto del ferro',data:'06/12/2026',titolo:'MIGO 101: ricevi i 500 kg urgenti',contabile:true,dove:{ep:A+'entrate'},percorso:'MM → Entrata merci',campi:[['Ordine','4500000002'],['Numero DDT','DDT-AU-5530'],['Lotto (colata)','COL-1206'],['Danneggiati','0'],['Data','06/12/2026']],
     attesa:'D 12 475 + D 63 65 / A 22 540. Un fascio da 500 kg in GR-ZONE.',fatto:function(h){var o=riordino(h);return !!o && o.entrato===500;}},
    {g:'5 · Acquisto del ferro',data:'06/12/2026',titolo:'RF: metti a dimora il fascio urgente',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','06/12/2026'],['Compiti','il PUTAWAY del ferro']],
     attesa:'Strategia «aggiunta a scorta esistente»: il fascio va in F-02, accanto a quello da 800. Le due colate restano distinte.',nota:rf,fatto:function(h){return fatti(compiti(h,'PUTAWAY',entrataAcq(riordino(h))),1);}},
    {g:'5 · Acquisto del ferro',data:'06/12/2026',titolo:'MIRO: fattura del riordino',contabile:true,dove:{ep:A+'fatture'},percorso:'MM → Fatture fornitore',campi:[['Ordine','4500000002'],['Numero fattura','FR-2026-902'],['Data','06/12/2026']],
     attesa:'D 22 540 + D 14 118,80 / A 20 658,80.',fatto:function(h){return (h.S.fattureFornitore || []).some(function(f){return f.rif==='FR-2026-902';});}},
    // ── 6 · un ordine, tre fasi: nessuna scorta intermedia ──
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'CO01: un ordine per 300 transenne',dove:{ep:P+'ordini'},percorso:'PP → Ordini di produzione',campi:[['Materiale','TR-STD'],['Quantità','300'],['Data','07/12/2026']],
     attesa:'Ordine 1000001: 2.400 kg di ferro, Taglio 75 h, Piegatura 60 h, Saldatura 120 h; costo pianificato 9.420. Non creare ordini per ogni fase.',fatto:function(h){var o=prod(h,'TR-STD');return !!o && o.qta===300;}},
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'WMS: porta il ferro delle transenne alla linea',dove:{ep:M+'compiti'},percorso:'WMS → Compiti → Approvvigionamento della produzione',campi:[['Ordine','1000001 TR-STD'],['Quantità','vuoto = 2.400 kg'],['Data','07/12/2026']],
     attesa:'3 STAGING FIFO: F-01 1.000 + 1.000, F-02 400 → PSA-L1.',fatto:function(h){return compiti(h,'STAGING',diOrdine(h,'TR-STD')).length===3;}},
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'RF: conferma l’approvvigionamento del ferro delle transenne',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','07/12/2026'],['Compiti','i 3 STAGING']],
     attesa:'2.400 kg nella PSA; F-02 conserva 400 kg COL-1204 e 500 kg COL-1206. IM resta 3.300 kg: nessun consumo.',nota:rf,fatto:function(h){return fatti(compiti(h,'STAGING',diOrdine(h,'TR-STD')),3);}},
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'261: consuma 2.400 kg sullo stesso ordine',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Prelievi, conferme, entrate → Prelievo',campi:[['Ordine','1000001'],['Quantità','2400'],['Data','07/12/2026']],
     attesa:'D 70 / A 12 2.280 (2.400 × 0,95). Costo sul solo ordine 1000001; PSA vuota. Nessun semilavorato a magazzino.',fatto:function(h){return evento(h,'TR-STD','261');}},
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'CO11N: Taglio 75 ore, WIP 4.380',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Conferma delle ore',campi:[['Ordine','1000001'],['Fase','Taglio'],['Attrezzaggio','0'],['Ore','75'],['Quantità fase','300 (oppure vuoto = residuo)'],['Data','07/12/2026']],
     attesa:'75 × 28 = 2.100: D 72 / A 75. WIP analitico 2.280 + 2.100 = 4.380. Nessun 101, nessun PUTAWAY e nessuna scorta tagliata: la lavorazione resta sull’ordine.',fatto:function(h){return fase(h,'Taglio');}},
    // ── 7 · avanzamento sul medesimo ordine ──
    {g:'7 · Fasi sullo stesso ordine',data:'09/12/2026',titolo:'CO11N: Piegatura 60 ore, WIP 6.060',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Conferma delle ore',campi:[['Ordine','1000001, lo stesso del taglio'],['Fase','Piegatura'],['Attrezzaggio','0'],['Ore','60'],['Quantità fase','300 (oppure vuoto)'],['Data','09/12/2026']],
     attesa:'60 × 28 = 1.680: D 72 / A 75. WIP analitico 4.380 + 1.680 = 6.060. Nessun prelievo di SL-TAGLIO, nessun ordine SL-PIEGA e nessun 101 intermedio.',fatto:function(h){return fase(h,'Piegatura');}},
    {g:'7 · Fasi sullo stesso ordine',data:'11/12/2026',titolo:'CO11N: Saldatura 120 ore, WIP 9.420',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Conferma delle ore',campi:[['Ordine','1000001'],['Fase','Saldatura'],['Attrezzaggio','0'],['Ore','120'],['Quantità fase','300 (oppure vuoto)'],['Data','11/12/2026']],
     attesa:'120 × 28 = 3.360: D 72 / A 75. WIP analitico 6.060 + 3.360 = 9.420; le tre fasi sono complete. La merce non è ancora entrata nello stock.',fatto:function(h){return fase(h,'Saldatura');}},
    {g:'7 · Fasi sullo stesso ordine',data:'12/12/2026',titolo:'101: carica a magazzino le 300 transenne',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Entrata del prodotto',campi:[['Ordine','1000001'],['Pezzi','vuoto = 300'],['Data','12/12/2026']],
     attesa:'Unico 101 dell’ordine: D 13 / A 73 9.420. WIP residuo zero, 6 pallet da 50 in GR-ZONE. Beta e Delta confermati per intero. Prima del completamento delle tre fasi il programma rifiuta il 101.',fatto:function(h){return evento(h,'TR-STD','101');}},
    {g:'7 · Fasi sullo stesso ordine',data:'12/12/2026',titolo:'RF: metti a scaffale i 6 pallet di transenne',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','12/12/2026'],['Compiti','i 6 PUTAWAY di TR-STD']],
     attesa:'300 TR-STD a scaffale. Nessun’altra entrata contabile.',nota:rf,fatto:function(h){return fatti(compiti(h,'PUTAWAY',entrataDi(h,'TR-STD')),6);}},
    // ── 8 · un vero HALB a scorta, indipendente dal finito ──
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'CO01: ordine autonomo per 20 kit SL-TAGLIO',dove:{ep:P+'ordini'},percorso:'PP → Ordini di produzione',campi:[['Materiale','SL-TAGLIO'],['Quantità','20'],['Data','12/12/2026']],
     attesa:'Ordine 1000002, 160 kg ferro + 5 h Taglio: 292 euro pianificati. È produzione autonoma a stock, non una fase dell’ordine delle transenne.',fatto:function(h){var o=prod(h,'SL-TAGLIO');return !!o && o.qta===20;}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'WMS: approvvigiona il ferro dei 20 kit',dove:{ep:M+'compiti'},percorso:'WMS → Compiti → Approvvigionamento',campi:[['Ordine','1000002 SL-TAGLIO'],['Quantità','vuoto = 160 kg'],['Data','12/12/2026']],
     attesa:'Un STAGING per 160 kg COL-1204 da F-02 alla PSA-L1.',fatto:function(h){return compiti(h,'STAGING',diOrdine(h,'SL-TAGLIO')).length===1;}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'RF: porta alla linea il ferro dei kit',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data','12/12/2026'],['Compito','lo STAGING da 160 kg']],attesa:'PSA 160 kg; F-02 conserva 240 + 500 kg.',nota:rf,fatto:function(h){return fatti(compiti(h,'STAGING',diOrdine(h,'SL-TAGLIO')),1);}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'261: consuma 160 kg per il HALB',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Prelievo',campi:[['Ordine','1000002'],['Quantità','160'],['Data','12/12/2026']],attesa:'D 70 / A 12 152. In totale i due ordini consumano 2.560 kg; ferro finale 740 kg.',fatto:function(h){return evento(h,'SL-TAGLIO','261');}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'CO11N: conferma 5 ore del HALB',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Conferma',campi:[['Ordine','1000002'],['Fase','lascia vuoto: ordine autonomo a ciclo singolo'],['Attrezzaggio','0'],['Ore','5'],['Data','12/12/2026']],attesa:'5 × 28 = 140: D 72 / A 75. Costo dell’ordine HALB 152 + 140 = 292.',fatto:function(h){return evento(h,'SL-TAGLIO','CO11N');}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'101: versa a magazzino i 20 kit autonomi',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Entrata del prodotto',campi:[['Ordine','1000002'],['Pezzi','vuoto = 20'],['Data','12/12/2026']],attesa:'D 07 Magazzino semilavorati / A 73 292. Un cassone da 20 in GR-ZONE, un solo PUTAWAY.',fatto:function(h){return evento(h,'SL-TAGLIO','101');}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'RF: metti a scaffale il cassone SL-TAGLIO',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF',campi:[['Data','12/12/2026'],['Compito','il PUTAWAY del cassone da 20']],attesa:'20 kit a scaffale, disponibili come vero stock HALB. Non sono WIP delle transenne.',nota:rf,fatto:function(h){return fatti(compiti(h,'PUTAWAY',entrataDi(h,'SL-TAGLIO')),1);}},
    {g:'8 · HALB autonomo a scorta',titolo:'Leggi la mappa delle ubicazioni',dove:{ep:M+'mappa'},percorso:'WMS → Mappa',campi:[['Ferro','F-02: 240 kg COL-1204 e 500 kg COL-1206'],['HALB','trova il cassone da 20 SL-TAGLIO; copia ubicazione e UdC dalla mappa']],nota:'Non inventare l’ubicazione iniziale: dipende dai posti già occupati dai finiti. Spunta a mano.'},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'LT10: sposta il cassone da 20 in fondo al magazzino',dove:{ep:M+'compiti'},percorso:'WMS → Compiti → Trasferimento',campi:[['UdC','il cassone da 20 SL-TAGLIO appena messo a scaffale'],['Destinazione','03-05-2'],['Motivo','resti in fondo al magazzino'],['Data','12/12/2026']],attesa:'Un TRASF verso 03-05-2, nessuna scrittura contabile.',fatto:function(h){return compiti(h,'TRASF',function(t){return t.mat==='SL-TAGLIO';}).length>=1;}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'RF: conferma lo spostamento del cassone',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF',campi:[['Data','12/12/2026'],['Compito','il TRASF del cassone']],attesa:'03-05-2 contiene 20 SL-TAGLIO.',nota:rf,fatto:function(h){return fatti(compiti(h,'TRASF',function(t){return t.mat==='SL-TAGLIO';}),1);}},
    {g:'8 · HALB autonomo a scorta',titolo:'Stampa le etichette del cassone e dell’ubicazione',dove:{ep:M+'etichette'},percorso:'WMS → Etichette barcode e QR',campi:[['Etichette','UdC del cassone e ubicazione 03-05-2'],['Stampa','🖨️ oppure salva in PDF']],nota:'Spunta a mano dopo aver controllato i codici.'},
    {g:'8 · HALB autonomo a scorta',titolo:'Controlla WIP e stock: due concetti distinti',dove:{ep:M+'monitor'},percorso:'WMS → Monitor; PP → Ordini; FI → Bilancio',campi:[['Ferro','740 kg → conto 12: 703'],['HALB autonomo','20 SL-TAGLIO → conto 07: 292'],['Finito','300 TR-STD → conto 13: 9.420'],['WIP transenne','zero dopo il solo 101 finale; nessuno stock SL-PIEGA'],['Quadratura','IM = WMS; aree interim vuote']],nota:'Le fasi non creano stock. Solo il HALB autonomo e il finito ricevono un proprio 101.'},
    // ── 9 · consegna ──
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'VL01N: consegna per Beta',dove:{ep:V+'consegne'},percorso:'SD → Consegne',campi:[['Ordine','10000001 Beta 180 TR-STD'],['Data','14/12/2026']],
     attesa:'Consegna 80000001: 4 compiti PICK (50+50+50+30) verso GI-ZONE. Nessuna uscita merci e nessuna scrittura.',fatto:function(h){return !!consegna(h,'BETA-180');}},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'VL01N: consegna per Delta',dove:{ep:V+'consegne'},percorso:'SD → Consegne',campi:[['Ordine','10000002 Delta 120 TR-STD'],['Data','14/12/2026']],
     attesa:'Consegna 80000002: 3 compiti PICK (20 dal pallet già toccato da Beta, poi 50 + 50).',fatto:function(h){return !!consegna(h,'DELTA-120');}},
    {g:'9 · Consegna con picking',titolo:'Stampa la lista di prelievo',dove:{ep:X+'prelievo'},percorso:'WMS → Spedizione → Lista di prelievo',campi:[['Consegne','80000001 Beta e 80000002 Delta'],['Leggi','ubicazione, UdC e quantità di ogni riga, nell’ordine del percorso'],['Stampa','🖨️ (il carrellista la porta con sé)']],
     nota:'Spunta a mano. Con la lista o con la pistola il risultato è lo stesso: ogni riga è un compito PICK da confermare.'},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'RF: preleva i 7 pallet (FIFO)',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','14/12/2026'],['Compiti','i 7 PICK, nessuna differenza di quantità']],
     attesa:'300 TR-STD in GI-ZONE, scaffali vuoti di transenne. Giacenza contabile ancora 300: nessun costo del venduto finché la merce non parte.',nota:rf,
     fatto:function(h){var b=consegna(h,'BETA-180'),d=consegna(h,'DELTA-120');return !!b && !!d && fatti(compiti(h,'PICK',function(t){return t.consegna===b.numero || t.consegna===d.numero;}),7);}},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'Imballa Beta in 4 colli SSCC',dove:{ep:X+'imballo'},percorso:'WMS → Imballo e etichette SSCC',campi:[['Consegna','80000001'],['Imballo','EUR'],['Pezzi per collo','50'],['Data','14/12/2026']],
     attesa:'4 colli (50+50+50+30) con SSCC univoci. Nessuna scrittura.',fatto:function(h){var c=consegna(h,'BETA-180');return !!c && ((h.S.sped || {}).colli || []).filter(function(x){return x.consegna===c.numero;}).length===4;}},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'Imballa Delta in 3 colli SSCC',dove:{ep:X+'imballo'},percorso:'WMS → Imballo e etichette SSCC',campi:[['Consegna','80000002'],['Imballo','EUR'],['Pezzi per collo','40'],['Data','14/12/2026']],
     attesa:'3 colli da 40.',fatto:function(h){var c=consegna(h,'DELTA-120');return !!c && ((h.S.sped || {}).colli || []).filter(function(x){return x.consegna===c.numero;}).length===3;}},
    {g:'9 · Consegna con picking',data:'15/12/2026',titolo:'Crea un trasporto per le due consegne',dove:{ep:X+'trasporti'},percorso:'WMS → Trasporti e carico → Crea il trasporto',campi:[['Consegne','80000001, 80000002'],['Vettore','V10 Trasporti Toscani'],['Targa fittizia','AA000AA'],['Autista fittizio','Mario Esempio'],['Data di carico','15/12/2026']],
     attesa:'Un camion, due clienti. Nessuna scrittura.',fatto:function(h){var b=consegna(h,'BETA-180');return !!b && ((h.S.sped || {}).trasporti || []).some(function(t){return t.consegne.indexOf(b.numero)>=0;});}},
    {g:'9 · Consegna con picking',data:'15/12/2026',titolo:'Carica i 7 colli leggendo gli SSCC',dove:{ep:X+'trasporti'},percorso:'WMS → Trasporti e carico → Carico (oppure Pistola RF → Carico)',campi:[['SSCC','copia un codice alla volta dalla tabella Imballo e SSCC'],['Data','15/12/2026'],['Ripetizioni','7, una per collo']],
     attesa:'7/7 colli caricati. Un collo letto due volte viene rifiutato.',fatto:function(h){var cs=((h.S.sped || {}).colli || []);return cs.length>=7 && cs.every(function(x){return !!x.caricato;});}},
    {g:'9 · Consegna con picking',data:'15/12/2026',titolo:'Partenza: uscita merci 601 e DDT',contabile:true,dove:{ep:X+'trasporti'},percorso:'WMS → Trasporti e carico → Fine carico e uscita merci',campi:[['Trasporto','quello appena creato'],['Data di partenza','15/12/2026']],
     attesa:'Due scritture: D 41 Costo del venduto / A 13 Prodotti finiti 5.652 (Beta, 180 × 31,40) e 3.768 (Delta, 120 × 31,40). Nascono i DDT. Transenne a magazzino: 0.',
     fatto:function(h){var b=consegna(h,'BETA-180'),d=consegna(h,'DELTA-120');return !!b && !!d && b.pgi==='2026-12-15' && d.pgi==='2026-12-15';}},
    {g:'9 · Consegna con picking',titolo:'Reclamo simulato: da quale ferro vengono le transenne di Beta?',dove:{ep:M+'lotti'},percorso:'WMS → Lotti, numeri di serie e tracciabilità → Reclamo di un cliente',
     campi:[['Consegna','80000001 Beta'],['Risali','TR-STD lotto L1000001 → ferro colata COL-1204, Acciaierie Umbre (direttamente dal 261 dell’ordine 1000001)'],['Poi a valle','premi «Traccia» sulla colata COL-1204: arriva a Beta e a Delta']],
     nota:'Se la colata fosse difettosa, sapremmo subito quali clienti avvisare. La colata COL-1206 non è nelle transenne: è ancora in catasta. Spunta a mano.'},
    // ── 10 · fatture e banca ──
    {g:'10 · Fatture e anticipo',data:'15/12/2026',titolo:'VF01: fattura Beta',contabile:true,dove:{ep:V+'fatture'},percorso:'SD → Fatturazione',campi:[['Consegna','80000001'],['Data','15/12/2026']],
     attesa:'D 11 Beta 12.912,48 + D 47 Sconti 216 / A 40 Ricavi 10.800 + A 21 IVA 2.328,48. Provvigione all’agente 3%: D 57 / A 26 317,52.',fatto:function(h){return !!fattura(h,'BETA-180');}},
    {g:'10 · Fatture e anticipo',data:'15/12/2026',titolo:'VF01: fattura Delta',contabile:true,dove:{ep:V+'fatture'},percorso:'SD → Fatturazione',campi:[['Consegna','80000002'],['Data','15/12/2026']],
     attesa:'D 11 Delta 8.608,32 + D 47 144 / A 40 7.200 + A 21 1.552,32. Provvigione D 57 / A 26 211,68.',fatto:function(h){return !!fattura(h,'DELTA-120');}},
    {g:'10 · Fatture e anticipo',data:'15/12/2026',titolo:'Trasmetti le due fatture allo SdI',dove:{ep:F+'sdi'},percorso:'FI → Fattura elettronica (SdI)',campi:[['Documento','prima la fattura Beta, poi quella Delta'],['Data di invio','15/12/2026']],
     attesa:'Due ricevute di consegna. Da ora una fattura sbagliata non si storna più: serve la nota di credito.',fatto:function(h){var b=fattura(h,'BETA-180'),d=fattura(h,'DELTA-120');return !!b && !!d && !!b.sdi && !!d.sdi;}},
    {g:'10 · Fatture e anticipo',data:'16/12/2026',titolo:'Anticipo su fattura: la banca anticipa l’80% di Beta',contabile:true,dove:{ep:T+'anticipi'},percorso:'Tesoreria → Anticipo su fatture',campi:[['Fattura','quella di Beta (12.912,48, scade il 14/01/2027)'],['Percentuale','80'],['Commissione','30'],['Data','16/12/2026']],
     attesa:'Anticipo 10.329,98: D 10 Banca 10.299,98 + D 58 Commissione 30 / A 38 Banca c/anticipi su fatture 10.329,98. Il credito verso Beta resta aperto: la fattura è la garanzia del prestito.',
     fatto:function(h){return (((h.S.tes || {}).anticipi) || []).some(function(x){return x.data==='2026-12-16';});}},
    {g:'10 · Fatture e anticipo',data:'17/12/2026',titolo:'F-53: paga il ferro',contabile:true,dove:{ep:F+'passive'},percorso:'FI → Fatture passive e pagamenti → Pagamento a un fornitore',campi:[['Fornitore','F100 Acciaierie Umbre'],['Importo','vuoto = 4.318,80 (le due fatture del ferro)'],['Data','17/12/2026']],
     attesa:'D 20 / A 10 4.318,80 (3.660 + 658,80). Si paga prima della scadenza (60 giorni) grazie all’anticipo.',fatto:function(h){return paga(h,'F100','2026-12-17');}},
    {g:'10 · Fatture e anticipo',data:'18/12/2026',titolo:'F-53: paga i macchinari',contabile:true,dove:{ep:F+'passive'},percorso:'FI → Fatture passive e pagamenti → Pagamento a un fornitore',campi:[['Fornitore','F300 Macchine Alfa'],['Importo','vuoto = 52.460'],['Data','18/12/2026']],
     attesa:'D 20 / A 10 52.460. Debiti verso fornitori a zero; banca 32.321,18.',fatto:function(h){return paga(h,'F300','2026-12-18');}},
    // ── 11 · sopravvenienza ──
    {g:'11 · Sopravvenienza',data:'21/12/2026',titolo:'L’assicurazione riconosce un indennizzo',contabile:true,dove:{ep:F+'sopravvenienze'},percorso:'FI → Sopravvenienze attive',
     campi:[['Compagnia','F400 Assicurazioni Omega'],['Riferimento','LIQ-4471'],['Evento','indennizzo per il sinistro del furgone del 10/12'],['Importo','500'],['Data','21/12/2026']],
     attesa:'D 09 Crediti verso compagnie di assicurazione / A 84 Sopravvenienze attive 500. Fuori campo IVA: nessuna fattura.',
     nota:'È un provento che non nasce dalla gestione caratteristica e non era previsto: per questo è una sopravvenienza attiva (nel bilancio, «altri ricavi e proventi» A5).',fatto:function(h){return (h.S.sopravvenienze || []).some(function(x){return x.rif==='LIQ-4471';});}},
    {g:'11 · Sopravvenienza',data:'28/12/2026',titolo:'Incassa l’indennizzo',contabile:true,dove:{ep:F+'sopravvenienze'},percorso:'FI → Sopravvenienze attive → Incasso dell’indennizzo',campi:[['Indennizzo','LIQ-4471'],['Data','28/12/2026']],
     attesa:'D 10 / A 09 500. Il ricavo era già nel conto 84: l’incasso non lo raddoppia.',fatto:function(h){return (h.S.sopravvenienze || []).some(function(x){return x.rif==='LIQ-4471' && x.incassato;});}},
    // ── 12 · cessioni ──
    {g:'12 · Rivendita dei macchinari',data:'22/12/2026',titolo:'Vendi il carrello elevatore: minusvalenza',contabile:true,dove:{ep:K+'cessione'},percorso:'FI → Cespiti → Cessione di un cespite',campi:[['Cespite','CE-0004 Carrello elevatore elettrico'],['Acquirente','C600 Usato Epsilon'],['Prezzo','10500'],['IVA %','22'],['Data','22/12/2026']],
     attesa:'Prima la quota di dicembre: 12.000 × 20% × 1/12 = 200 (D 50 / A 04). Poi la vendita: D 11 12.810 + D 04 200 + D 46 Minusvalenza 1.300 / A 03 12.000 + A 21 2.310. Valore netto 11.800 > prezzo 10.500.',
     fatto:function(h){var c=cesp(h,'Carrello elevatore elettrico');return !!c && !!c.cessione && !!c.cessione.contabile;}},
    {g:'12 · Rivendita dei macchinari',data:'22/12/2026',titolo:'Vendi la sega circolare: plusvalenza',contabile:true,dove:{ep:K+'cessione'},percorso:'FI → Cespiti → Cessione di un cespite',campi:[['Cespite','CE-0005 Sega circolare'],['Acquirente','C600'],['Prezzo','2800'],['IVA %','22'],['Data','22/12/2026']],
     attesa:'Quota di dicembre 2.000 × 10% × 1/12 = 16,67 (D 50 / A 02). Vendita: D 11 3.416 + D 02 16,67 / A 01 2.000 + A 21 616 + A 45 Plusvalenza 816,67. Prezzo 2.800 > valore netto 1.983,33.',
     fatto:function(h){var c=cesp(h,'Sega circolare');return !!c && !!c.cessione && !!c.cessione.contabile;}},
    {g:'12 · Rivendita dei macchinari',data:'29/12/2026',titolo:'F-28: incassa le due cessioni',contabile:true,dove:{ep:V+'incassi'},percorso:'SD → Incassi e partite',campi:[['Cliente','C600 Usato Epsilon'],['Importo','16226'],['Riferimento','CESSIONI CARRELLO E SEGA'],['Data valuta','29/12/2026']],
     attesa:'D 10 / A 11 16.226 (12.810 + 3.416).',fatto:function(h){return reg(h,'INCASSO','2026-12-29');}},
    {g:'12 · Rivendita dei macchinari',data:'30/12/2026',titolo:'F-28: Delta paga in anticipo',contabile:true,dove:{ep:V+'incassi'},percorso:'SD → Incassi e partite',campi:[['Cliente','C200 Delta Noleggi'],['Importo','8608,32'],['Riferimento','SALDO FATTURA DELTA'],['Data valuta','30/12/2026']],
     attesa:'D 10 / A 11 8.608,32. Resta aperto solo il credito verso Beta (anticipato dalla banca).',nota:'Per i centesimi usa la virgola.',fatto:function(h){return reg(h,'INCASSO','2026-12-30');}},
    // ── 13 · stipendi ──
    {g:'13 · Stipendi',data:'31/12/2026',titolo:'Calcola le paghe di dicembre',dove:{ep:Y+'cedolino'},percorso:'Paghe → Presenze e cedolino → Calcolo',campi:[['Periodo','2026-12']],
     attesa:'3 cedolini (assunti il 01/12: un solo mese). Con la tredicesima di 1/12 e il conguaglio IRPEF: netti 5.769,08; costo per l’azienda 10.426,96. Nessuna scrittura.',
     nota:'Leggi un cedolino: la 13ª matura per i mesi lavorati, le detrazioni per lavoro dipendente si rapportano al periodo di lavoro.',fatto:function(h){return ((h.S.hr || {}).cedolini || []).some(function(c){return c.periodo==='2026-12';});}},
    {g:'13 · Stipendi',data:'31/12/2026',titolo:'Registra le paghe in contabilità',contabile:true,dove:{ep:Y+'contabilita'},percorso:'Paghe → Registrazione, stipendi e F24',campi:[['Periodo','2026-12'],['Data','31/12/2026']],
     attesa:'D 80 Salari 7.529,17 + D 81 Oneri sociali 2.340,07 + D 82 TFR 557,72 / A 27 Netti 5.769,08 + A 28 INPS 2.956,71 + A 24 INAIL 112,94 + A 29 Ritenute 1.068,16 + A 31 Fondo TFR 520,07.',
     fatto:function(h){return reg(h,'PAGHE','2026-12-31');}},
    {g:'13 · Stipendi',data:'31/12/2026',titolo:'Paga gli stipendi',contabile:true,dove:{ep:Y+'contabilita'},percorso:'Paghe → Registrazione, stipendi e F24 → Pagamento dei netti',campi:[['Periodo','2026-12'],['Data','31/12/2026']],
     attesa:'D 27 / A 10 5.769,08. Ritenute e contributi si versano con l’F24 a gennaio: a fine anno sono debiti.',fatto:function(h){return reg(h,'PAGAMENTO_STIPENDI','2026-12-31');}},
    // ── 14 · assestamenti ──
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'Risconto attivo sull’assicurazione',contabile:true,dove:{ep:H+'assestamenti'},percorso:'FI → IVA, imposte, chiusura → Ratei e risconti',
     campi:[['Tipo','Risconto attivo'],['Conto','83 Assicurazioni'],['Descrizione','polizza POL-2026-118'],['Importo','1200'],['Periodo','dal 01/12/2026 al 30/11/2027'],['Data','31/12/2026'],['Prima','«Calcola la quota» per vedere il conto']],
     attesa:'1.200 × 334 / 365 giorni = 1.098,08 di competenza del 2027: D 06 Risconti attivi / A 83 Assicurazioni 1.098,08. Nel 2026 resta un costo di 101,92 (31 giorni).',fatto:function(h){var x=ass(h,'risconto-attivo');return !!x && x.conto==='83';}},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'Rateo passivo sul fitto del capannone',contabile:true,dove:{ep:H+'assestamenti'},percorso:'FI → IVA, imposte, chiusura → Ratei e risconti',
     campi:[['Tipo','Rateo passivo'],['Conto','86 Fitti passivi'],['Descrizione','fitto capannone, trimestre posticipato'],['Importo','3000'],['Periodo','dal 01/12/2026 al 28/02/2027'],['Data','31/12/2026']],
     attesa:'Il fitto del trimestre dicembre–febbraio si paga a fine febbraio, ma dicembre è del 2026: 3.000 × 31 / 90 = 1.033,33. D 86 Fitti passivi / A 39 Ratei passivi.',fatto:function(h){var x=ass(h,'rateo-passivo');return !!x && x.conto==='86';}},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'AFAB: ammortamenti di dicembre',contabile:true,dove:{ep:K+'ammortamenti'},percorso:'FI → Cespiti → Ammortamenti',campi:[['Data di registrazione','31/12/2026']],
     attesa:'Una mensilità per le tre macchine rimaste: taglierina 15.000 × 10% / 12 = 125 · piegatubi 66,67 · saldatrice 50 = 241,67 (D 50 / A 02). Carrello e sega sono già ammortizzati fino alla cessione.',
     nota:'Il fisco ammette nel primo anno metà del coefficiente: 750, 400, 300. La quota di bilancio è più bassa: nessuna variazione fiscale.',fatto:function(h){var c=cesp(h,'Taglierina a nastro');return !!c && c.ammortamenti.some(function(a){return a.data==='2026-12-31';});}},
    {g:'14 · Inventario di fine anno',titolo:'Classificazione ABC dei materiali',dove:{ep:I+'abc'},percorso:'WMS → Inventari → Classificazione ABC',campi:[['Criterio','valore dei consumi e delle vendite di dicembre a costo standard'],['Risultato','TR-STD in classe A; leggi la classe dei semilavorati e del ferro e quante conte l’anno prevede']],
     nota:'Si contano più spesso i materiali di classe A. Spunta a mano.'},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'LI01N: documento d’inventario delle ubicazioni occupate',dove:{ep:I+'documenti'},percorso:'WMS → Inventari → Documenti d’inventario → Crea',
     campi:[['Tipo','Inventario per ubicazioni scelte'],['Ubicazioni','F-02, 03-05-2 (le due occupate: controllale sulla mappa)'],['Tolleranza','20'],['Data','31/12/2026']],
     attesa:'Documento con 3 posizioni: F-02 due fasci (colate COL-1204 e COL-1206), 03-05-2 un cassone SL-TAGLIO. Nessuna scrittura.',fatto:function(h){return !!inv(h);}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'Attiva l’inventario e stampa la lista di conta',dove:{ep:I+'documenti'},percorso:'WMS → Inventari → Documenti → Attiva; poi Lista di conta da stampare',campi:[['Data di riferimento','31/12/2026'],['Lista','conta cieca: le quantità a sistema non si vedono']],
     attesa:'Le due ubicazioni sono bloccate: niente prelievi né messe a posto finché non si chiude.',fatto:function(h){var d=inv(h);return !!d && d.stato!=='creato';}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'LI11N: registra la conta (manca un kit tagliato)',dove:{ep:I+'documenti'},percorso:'WMS → Inventari → Documenti → Registra la conta',
     campi:[['F-02 colata COL-1204','240'],['F-02 colata COL-1206','500'],['03-05-2 SL-TAGLIO','19 (ne trovi uno in meno)'],['Contato da','il tuo nome']],
     attesa:'Differenza −1 SL-TAGLIO × 14,60 = 14,60 €: sotto la tolleranza di 20, nessuna riconta.',fatto:function(h){var d=inv(h);return !!d && ['contato','chiuso'].indexOf(d.stato)>=0;}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'LI20: chiudi l’inventario nel WMS',dove:{ep:I+'documenti'},percorso:'WMS → Inventari → Documenti → Chiudi nel WMS',campi:[['Data','31/12/2026']],
     attesa:'03-05-2 ora riporta 19 pezzi; il pezzo mancante va nella zona differenze 999. Ubicazioni sbloccate. Ancora nessuna scrittura.',fatto:function(h){var d=inv(h);return !!d && d.stato==='chiuso';}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'LI21: registra la differenza in contabilità',contabile:true,dove:{ep:I+'differenze'},percorso:'WMS → Inventari → Differenze inventariali → Registra',campi:[['Data','31/12/2026']],
     attesa:'Movimento 711: D 65 Differenze inventariali / A 07 Magazzino semilavorati 14,60. Ora la contabilità dice quello che c’è davvero: 19 SL-TAGLIO.',fatto:function(h){return reg(h,'DIFFERENZA_INVENTARIO','2026-12-31');}},
    {g:'14 · Inventario di fine anno',titolo:'Valorizza la rimanenza di ferro con i quattro metodi',dove:{ep:I+'valorizzazione'},percorso:'WMS → Inventari → Valorizzazione delle rimanenze',
     campi:[['Materiale','FERRO, 740 kg'],['FIFO','restano gli acquisti più recenti: 240 × 1,00 + 500 × 1,08 = 780'],['LIFO','restano i più vecchi: 740 × 1,00 = 740'],['Costo medio ponderato','748,97 (prezzo medio (2.800 × 1,00 + 500 × 1,08) ÷ 3.300 kg = 1,0121 €/kg)'],['Costo standard (in bilancio)','740 × 0,95 = 703']],
     nota:'Il bilancio di questo sistema tiene il magazzino a costo standard: le differenze verso il prezzo pagato sono nel conto 63. Spunta a mano.'},
    {g:'14 · Inventario di fine anno',titolo:'KPI di magazzino di dicembre',dove:{ep:Z+'kpi'},percorso:'WMS → Innovazione → KPI di magazzino',campi:[['Leggi','accuratezza dell’inventario, ordini perfetti, tempo dal ricevimento allo scaffale, compiti per risorsa']],
     nota:'Facoltativo: spunta a mano dopo la lettura.'},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'KO88: chiudi i due ordini indipendenti',dove:{ep:C+'chiusura'},percorso:'CO → Chiusura degli ordini e varianze → Varianze e liquidazione',campi:[['Data','31/12/2026']],
     attesa:'Varianza zero sui due ordini: ferro e ore effettivi uguali allo standard. Gli ordini passano a CLSD. Nessuna scrittura.',
     nota:'Se avessimo confermato ore in più, la differenza andrebbe sul conto 61 Varianze di produzione.',fatto:function(h){return ['TR-STD','SL-TAGLIO'].every(function(m){var o=prod(h,m);return !!o && !!o.liquidazione;});}},
    // ── 15 · IVA, imposte, chiusura ──
    {g:'15 · IVA, imposte e chiusura',data:'31/12/2026',titolo:'Liquida l’IVA di dicembre',contabile:true,dove:{ep:H+'iva'},percorso:'FI → IVA, imposte, chiusura → Liquidazione IVA',campi:[['Periodo','2026-12'],['Data','31/12/2026']],
     attesa:'A debito 6.806,80 (vendite 3.880,80 + cessioni 2.926) − a credito 10.238,80 (macchine 9.460 + ferro 660 + riordino 118,80) = credito 3.432 riportato al 2027. D 21 / A 14 6.806,80.',fatto:function(h){return ((h.S.chiusura || {}).iva || []).some(function(x){return x.periodo==='2026-12';});}},
    {g:'15 · IVA, imposte e chiusura',data:'31/12/2026',titolo:'Calcola e registra IRES e IRAP',contabile:true,dove:{ep:H+'imposte'},percorso:'FI → IVA, imposte, chiusura → Imposte',campi:[['Esercizio','2026'],['Altre variazioni','0 e 0'],['Aliquote','IRES 24 · IRAP 3,9'],['Data','31/12/2026']],
     attesa:'Risultato prima delle imposte 2.517,32. IRES 24% = 604,16 (D 56 / A 23). IRAP 3,9% sul valore della produzione 2.517,32 = 98,18 (D 52 / A 35). Utile netto 1.814,98.',
     fatto:function(h){return ((h.S.chiusura || {}).imposte || []).some(function(x){return x.anno==='2026';});}},
    {g:'15 · IVA, imposte e chiusura',titolo:'Leggi il conto economico di dicembre',dove:{ep:H+'chiusura'},percorso:'FI → IVA, imposte, chiusura → Chiusura dell’esercizio (prospetti)',
     campi:[['Vendite','ricavi 18.000 − sconti 360 = 17.640; costo del venduto 9.420'],['Produzione','due ordini indipendenti: ferro 2.432 + attività 7.280 = output 9.712 (9.420 finiti + 292 HALB), varianza zero; le attività accreditate ai centri (75: 7.280) compensano in parte il costo vero del personale. WIP analitico non capitalizzato in FI'],['Magazzino','rottamazione del ferro schiacciato 190 · differenza inventariale 14,60 · differenze prezzo del ferro 215 (150 + 65)'],['Altro','paghe 10.426,96 · ammortamenti 458,34 · minusvalenza 1.300 · plusvalenza 816,67 · sopravvenienza 500 · fitto 1.033,33 · assicurazione 101,92 · provvigioni 529,20 · commissione 30'],['Risultato','prima delle imposte 2.517,32 − IRES 604,16 − IRAP 98,18 = utile 1.814,98']],
     nota:'Spunta a mano dopo aver letto. I controlli prima della chiusura devono essere tutti verdi.'},
    {g:'15 · IVA, imposte e chiusura',data:'31/12/2026',titolo:'Chiudi l’esercizio 2026',contabile:true,dove:{ep:H+'chiusura'},percorso:'FI → IVA, imposte, chiusura → Chiusura dell’esercizio',campi:[['Esercizio','2026'],['Chiudi anche con avvertenze','no']],
     attesa:'Epilogo dei costi e dei ricavi nel conto 90; utile: D 90 / A 32 Utile d’esercizio 1.814,98; chiusura delle attività e passività nel 91. Dopo, nessuna scrittura con data 2026.',
     nota:'Il pannello chiede di ricostruire solo il documento dell’utile: epilogo e chiusura dei conti patrimoniali sono riporti meccanici. Leggili nel libro giornale.',fatto:function(h){return !!(h.S.chiusure || {})['2026'];}},
    // ── 16 · riapertura e gennaio ──
    {g:'16 · Riapertura e gennaio',data:'01/01/2027',titolo:'Riapri i conti al 1° gennaio 2027',dove:{ep:H+'riapertura'},percorso:'FI → IVA, imposte, chiusura → Riapertura',campi:[['Nuovo esercizio','2027'],['Data','01/01/2027']],
     attesa:'D attività / A 92 e D 92 / A passività per 99.309,38: macchine 29.000 (fondo 241,67), risconto 1.098,08, semilavorati 277,40, ferro 703, banca 51.886,42, credito Beta 12.912,48, IVA a credito 3.432; capitale 80.000, utile 1.814,98, anticipo bancario 10.329,98, rateo 1.033,33, debiti verso INPS, Erario, INAIL, agenti, TFR e imposte.',
     fatto:function(h){var c=(h.S.chiusure || {})['2026'];return !!c && !!c.riapertura;}},
    {g:'16 · Riapertura e gennaio',data:'01/01/2027',titolo:'Storna il risconto e il rateo',contabile:true,dove:{ep:H+'assestamenti'},percorso:'FI → IVA, imposte, chiusura → Ratei e risconti → Storno al 1° gennaio',campi:[['Data dello storno','01/01/2027']],
     attesa:'D 83 Assicurazioni / A 06 Risconti attivi 1.098,08 · D 39 Ratei passivi / A 86 Fitti passivi 1.033,33. Il 2027 ha così 11 mesi di polizza; quando a febbraio arriverà la fattura del fitto (3.000), al 2027 resteranno 1.966,67.',
     fatto:function(h){return reg(h,'STORNO_ASSESTAMENTI','2027-01-01');}},
    {g:'16 · Riapertura e gennaio',data:'14/01/2027',titolo:'F-28: Beta paga la fattura alla scadenza',contabile:true,dove:{ep:V+'incassi'},percorso:'SD → Incassi e partite',campi:[['Cliente','C100 Beta Costruzioni'],['Importo','12912,48'],['Riferimento','SALDO FATTURA BETA'],['Data valuta','14/01/2027']],
     attesa:'D 10 / A 11 12.912,48. Il credito verso Beta va a zero.',fatto:function(h){return reg(h,'INCASSO','2027-01-14');}},
    {g:'16 · Riapertura e gennaio',data:'14/01/2027',titolo:'La banca si ripaga l’anticipo con gli interessi',contabile:true,dove:{ep:T+'anticipi'},percorso:'Tesoreria → Anticipo su fatture → Estingui l’anticipo',campi:[['Anticipo','ANT-001 Beta'],['Interessi','25'],['Data','14/01/2027']],
     attesa:'D 38 Banca c/anticipi 10.329,98 + D 60 Interessi passivi 25 / A 10 10.354,98. Il debito verso la banca è chiuso.',fatto:function(h){return (((h.S.tes || {}).anticipi) || []).some(function(x){return !!x.estinto;});}},
    {g:'16 · Riapertura e gennaio',data:'18/01/2027',titolo:'F24: versa ritenute e contributi di dicembre',contabile:true,dove:{ep:Y+'contabilita'},percorso:'Paghe → Registrazione, stipendi e F24 → F24',campi:[['Periodo','2026-12'],['Data di versamento','18/01/2027']],
     attesa:'D 29 Erario 1.068,16 + D 28 INPS 2.956,71 / A 10 4.024,87. Banca 50.419,05.',nota:'Il 16 gennaio 2027 è sabato: la scadenza slitta al lunedì 18.',fatto:function(h){return reg(h,'F24');}},
    {g:'16 · Riapertura e gennaio',data:'30/04/2027',titolo:'L’assemblea approva il bilancio e destina l’utile',contabile:true,dove:{ep:H+'riapertura'},percorso:'FI → IVA, imposte, chiusura → Riapertura → Destinazione dell’utile',campi:[['A riserva legale %','5'],['Data della delibera','30/04/2027']],
     attesa:'D 32 Utile 1.814,98 / A 33 Riserva legale 90,75 + A 30 Riserve 1.724,23.',fatto:function(h){return reg(h,'DESTINAZIONE_UTILE');}},
    {g:'16 · Riapertura e gennaio',titolo:'Verifica finale',dove:{ep:F+'bilancio'},percorso:'FI → Contabilità → Bilancio di verifica; WMS → Monitor',
     campi:[['Banca','31/12/2026: 51.886,42 · dopo il 18/01/2027: 50.419,05'],['Scorte','FERRO 740 kg · SL-TAGLIO 19 · TR-STD 0; IM = WMS; nessun compito aperto'],['Cespiti','01 29.000 − fondo 02 241,67'],['Controllo','Dare = Avere; conti 90, 91 e 92 a zero']],
     nota:'Spunta a mano dopo il controllo.'},
    {g:'16 · Riapertura e gennaio',titolo:'Consegna il lavoro al docente',dove:{ep:'allievo.consegna'},percorso:'La mia area → Consegna il lavoro',campi:[['Lavoro','Sistema integrato'],['Esercizio','Dicembre: dalla costituzione alla riapertura'],['Nota','Spiega la differenza tra la minusvalenza del carrello e la plusvalenza della sega']]},
  ];
  window.MSA_ESERCIZIO = {codice:'dicembre-wms',titolo:'Dicembre: dalla costituzione alla riapertura',versione:'erp-ft',pannelloAutomatico:true,verificaRagioneria:true,passi:passi};
})();
