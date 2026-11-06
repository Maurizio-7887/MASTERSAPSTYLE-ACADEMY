/* Esercitazione «Executive Assistant: il primo mese di un negozio di informatica» sul sistema integrato S/4 con il WMS.
   Corso breve per segreteria e assistenti di direzione: niente produzione (PP), un'azienda commerciale che compra e rivende.
   Pixel & Bit S.r.l. apre il 01/09/2026: capitale 20.000 €, 4 fornitori (PC, stampanti, monitor, mouse e cavi), 2 clienti, 1 dipendente.
   Settembre: ordini ai fornitori, entrate merci con la pistola RF, fatture passive, ordini dei clienti, consegne con prelievo,
   fatture e SdI, stipendio, pagamenti, incassi, liquidazione IVA; il 16/10 l'F24. Nomi, date e numeri sono di fantasia. */
(function () {
  'use strict';
  var D = 'erp_dati.', M = 'erp_magazzino.', A = 'erp_acquisti.', V = 'erp_vendite.', F = 'erp_fi.', H = 'erp_chiusura.', Y = 'erp_paghe.';
  var regs = function (h) { return h.S.registrazioni || []; };
  var reg = function (h, tipo, data) { return regs(h).some(function (r) { return r.tipo === tipo && (!data || r.data === data); }); };
  var saldo = function (h, c, partner) { return Math.round(regs(h).reduce(function (s, r) { return s + (r.righe || []).filter(function (x) { return x.conto === c && (!partner || x.partner === partner); }).reduce(function (t, x) { return t + (x.dareAvere === 'DARE' ? x.importo : -x.importo); }, 0); }, 0) * 100) / 100; };
  var wm = function (h) { return h.S.wm || {}; };
  var compiti = function (h, tipo) { return (wm(h).compiti || []).filter(function (t) { return t.tipo === tipo && t.stato !== 'annullato'; }); };
  var confermati = function (h, tipo, n) { var c = compiti(h, tipo); return c.length >= n && c.every(function (t) { return t.stato === 'confermato'; }); };
  var acquisto = function (h, mat) { return (h.S.acquisti || []).find(function (o) { return o.materiale === mat && o.data === '2026-09-02'; }); };
  var entrato = function (h, mat) { var o = acquisto(h, mat); return !!o && o.entrato >= o.qta; };
  var fatturato = function (h, mat) { var o = acquisto(h, mat); return !!o && o.fatturato >= o.qta; };
  // l'ordine del cliente si riconosce dal riferimento (senza badare a maiuscole e trattini) oppure da cliente + merce + quantità
  var ATTESI = {'AURORA-PC': ['C100', 'PC-UFF', 4], 'AURORA-MON': ['C100', 'MON-24', 4], 'AURORA-MOUSE': ['C100', 'MOUSE', 4], 'GIRASOLE-STAMP': ['C200', 'STAMP-LAS', 3], 'GIRASOLE-CAVI': ['C200', 'CAVO-HDMI', 15]};
  var RIF = Object.keys(ATTESI);
  var norm = function (t) { return String(t == null ? '' : t).toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  var ordine = function (h, rif) { var l = h.S.ordini || [], a = ATTESI[rif]; return l.find(function (o) { return norm(o.rif) === norm(rif); }) || l.find(function (o) { return o.cliente === a[0] && o.materiale === a[1] && Number(o.qta) === a[2]; }); };
  var consegna = function (h, rif) { var o = ordine(h, rif); return o && (h.S.consegne || []).find(function (c) { return c.ordine === o.numero; }); };
  var tutte = function (h, f) { return RIF.every(function (r) { return f(r); }); };
  var fattura = function (h, rif) { var c = consegna(h, rif); return c && (h.S.fatture || []).find(function (f) { return f.consegna === c.numero; }); };
  var pagato = function (h, f) { return regs(h).some(function (r) { return r.tipo === 'PAGAMENTO_FORNITORE' && r.righe.some(function (x) { return x.conto === '20' && x.partner === f; }); }) && saldo(h, '20', f) === 0; };
  var incassato = function (h, c) { return regs(h).some(function (r) { return r.tipo === 'INCASSO' && r.righe.some(function (x) { return x.conto === '11' && x.partner === c; }); }) && saldo(h, '11', c) === 0; };
  var RF = 'Per OGNI compito: imposta la data di lavoro; nel campo 1 copia l’ubicazione «Da», nel 2 la UdC (oppure il codice della merce), lascia la quantità, nel 4 copia la destinazione «A» e premi «Conferma il compito». Ripeti fino a «Nessun compito aperto».';

  var ME = function (titolo, f, nome, mat, qta, prezzo, tot) {
    return {g: '2 · Ordini ai fornitori', data: '02/09/2026', titolo: titolo, dove: {ep: A + 'ordini'}, percorso: 'MM → Ordini d’acquisto e rilascio → Crea ordine d’acquisto',
      campi: [['Fornitore', f + ' ' + nome], ['Materiale', mat], ['Quantità', String(qta)], ['Prezzo netto €/unità', prezzo], ['Data', '02/09/2026']],
      attesa: 'Ordine d’acquisto salvato: ' + qta + ' pz × ' + prezzo + ' € = ' + tot + ' €. È un impegno con il fornitore: la merce non è ancora arrivata, quindi NESSUNA scrittura in contabilità.',
      fatto: function (h) { var o = acquisto(h, mat); return !!o && o.qta === qta && o.fornitore === f; }};
  };
  var MIGO = function (titolo, mat, ddt, imp) {
    return {g: '3 · Arriva la merce', data: '04/09/2026', titolo: titolo, contabile: true, dove: {ep: A + 'entrate'}, percorso: 'MM → Entrata merci (MIGO 101)',
      campi: [['Ordine', 'l’ordine d’acquisto di ' + mat], ['Quantità contata', 'vuota = è arrivato tutto quello che c’è sul DDT'], ['Numero DDT del fornitore', ddt], ['Data di registrazione', '04/09/2026']],
      attesa: 'D 13 Magazzino merci / A 22 Fatture da ricevere ' + imp + '. La merce entra nella zona di ricevimento GR-ZONE con un compito di messa a scaffale. La fattura non c’è ancora: per questo il debito va nel conto «fatture da ricevere».',
      fatto: function (h) { return entrato(h, mat); }};
  };
  var MIRO = function (titolo, mat, rif, f, imp, iva, tot) {
    return {g: '4 · Fatture dei fornitori', data: '07/09/2026', titolo: titolo, contabile: true, dove: {ep: A + 'fatture'}, percorso: 'MM → Fatture fornitore (MIRO)',
      campi: [['Ordine', 'l’ordine d’acquisto di ' + mat], ['Numero fattura del fornitore', rif], ['Prezzo fatturato', 'vuoto = quello dell’ordine'], ['Data', '07/09/2026']],
      attesa: 'D 22 Fatture da ricevere ' + imp + ' + D 14 IVA a credito ' + iva + ' / A 20 Debiti verso ' + f + ' ' + tot + '. Controllo a tre vie: ordine, merce arrivata e fattura dicono la stessa cosa.',
      fatto: function (h) { return fatturato(h, mat); }};
  };
  var VA = function (titolo, c, nome, mat, qta, rif, netto, iva, tot) {
    return {g: '5 · Ordini dei clienti', data: '10/09/2026', titolo: titolo, dove: {ep: V + 'ordini'}, percorso: 'SD → Ordini cliente → Crea ordine cliente (VA01)',
      campi: [['Committente', c + ' ' + nome], ['Materiale', mat], ['Quantità (pz)', String(qta)], ['Riferimento cliente', rif], ['Data documento', '10/09/2026'], ['Data di consegna richiesta', '15/09/2026']],
      attesa: 'Ordine salvato: netto ' + netto + ' €, IVA 22% ' + iva + ' €, totale ' + tot + ' €. Semaforo verde: la merce è a scaffale. Nessuna scrittura: l’ordine non sposta merce.',
      fatto: function (h) { return !!ordine(h, rif); }};
  };
  var PAGA = function (titolo, f, nome, tot) {
    return {g: '9 · Pagamenti e incassi', data: '30/09/2026', titolo: titolo, contabile: true, dove: {ep: F + 'passive'}, percorso: 'FI → Fatture passive e pagamenti → Pagamento a un fornitore (F-53)',
      campi: [['Fornitore', f + ' ' + nome + ' (attenzione: il modulo propone il primo fornitore con debiti, controlla che sia quello giusto)'], ['Fattura da pagare', 'vuoto = tutte quelle aperte'], ['Importo', 'vuoto = tutto il debito'], ['Data del bonifico', '30/09/2026']],
      attesa: 'D 20 Debiti verso ' + f + ' / A 10 Banca ' + tot + '. Il debito verso ' + nome + ' scende a zero.',
      fatto: function (h) { return pagato(h, f); }};
  };

  var passi = [
    // ══════════ 0 · prima di cominciare ══════════
    {id: 'ea-avvio-vuoto', g: '0 · Prima di cominciare', titolo: 'Prima di cominciare: un account vuoto', dove: {ep: D + 'avvio'}, percorso: 'Launchpad → Avvio e dati di base → Nuova azienda / Avvio',
     campi: [['Ambiente', 'Sistema integrato in un account dedicato a questo esercizio'], ['Se l’account è vuoto', 'vai al passo seguente: apri il negozio dalla scheda «Executive Assistant · negozio di informatica»'],
       ['Se c’è già un’azienda', 'solo con il permesso del docente: «♻️ RICOMINCIA DA ZERO» (il programma salva prima una copia di sicurezza)']],
     nota: 'Un account = un’azienda. Il negozio non si mescola con Ferro & Transenne: serve un account vuoto.',
     fatto: function (h) { return !h.S.avviato || !!h.S.negozio; }},
    // ══════════ 1 · apertura del negozio ══════════
    {id: 'ea-costituzione', g: '1 · Il negozio apre', data: '01/09/2026', titolo: 'Apri il negozio: costituisci Pixel & Bit con 20.000 € di capitale', contabile: true, dove: {ep: D + 'avvio'},
     percorso: 'Avvio e dati di base → Nuova azienda / Avvio → «Parti da zero» → scheda «Executive Assistant · negozio di informatica»',
     campi: [['Data di apertura (costituzione)', '01/09/2026'], ['Capitale sociale sottoscritto €', '20000'], ['Pulsante', 'Apri il negozio Pixel & Bit (costituzione)']],
     attesa: 'D 08 Crediti verso soci / A 30 Capitale sociale 20.000. Dal notaio i soci PROMETTONO di versare: nasce un credito della società verso i soci. Banca e magazzino a zero; il programma carica le anagrafiche: 5 merci, 4 fornitori, 2 clienti e la dipendente Chiara Fontana.',
     nota: 'Da qui il pannello ti chiede di ricostruire ogni scrittura: conti, Dare/Avere e importi. È il cuore del lavoro amministrativo.',
     fatto: function (h) { return !!h.S.negozio && !!h.S.costituzione && h.S.costituzione.data === '2026-09-01'; }},
    {g: '1 · Il negozio apre', data: '01/09/2026', titolo: 'I soci versano il capitale in banca', contabile: true, dove: {ep: D + 'avvio'}, percorso: 'Avvio e dati di base → Nuova azienda / Avvio → riquadro «Versa in banca il capitale sottoscritto»',
     campi: [['Importo versato', 'vuoto = tutto il sottoscritto (20.000)'], ['Data del versamento', '01/09/2026']],
     attesa: 'D 10 Banca / A 08 Crediti verso soci 20.000. Ora il credito verso i soci è zero e in banca ci sono 20.000 €.',
     fatto: function (h) { return reg(h, 'VERSAMENTO_SOCI') && saldo(h, '08') === 0; }},
    {g: '1 · Il negozio apre', titolo: 'Leggi le anagrafiche: merci, fornitori e clienti', dove: {ep: D + 'anagrafiche'}, percorso: 'Avvio e dati di base → Clienti e materiali',
     campi: [['Clienti', 'C100 Studio Commerciale Aurora · C200 Agenzia Viaggi Girasole Srl'], ['Fornitori', 'F100 Distribuzione PC Italia (PC) · F200 Stampa Facile (stampanti) · F300 Video Schermi (monitor) · F400 Accessori Digitali (mouse e cavi)'],
       ['Merci (HAWA)', 'PC-UFF 450 € · STAMP-LAS 120 € · MON-24 95 € · MOUSE 6 € · CAVO-HDMI 3 €: è il prezzo d’acquisto, giacenze a zero']],
     nota: 'Lettura: spunta a mano con «Fatto». Prima di fare un documento il sistema deve conoscere CHI (cliente o fornitore) e CHE COSA (la merce): sono le anagrafiche.'},
    {g: '1 · Il negozio apre', titolo: 'Leggi il listino di vendita', dove: {ep: D + 'condizioni'}, percorso: 'Avvio e dati di base → Condizioni di prezzo (VK13)',
     campi: [['Prezzi PR00', 'PC-UFF 690 · STAMP-LAS 189 · MON-24 149 · MOUSE 14 · CAVO-HDMI 9 € (IVA esclusa)'], ['Ricarico', 'un PC si compra a 450 e si vende a 690: margine 240 € a pezzo']],
     nota: 'Lettura: spunta a mano. Il prezzo di vendita lo prende l’ordine del cliente dal listino: nessuno lo riscrive a mano, così non si sbaglia.'},
    {g: '1 · Il negozio apre', titolo: 'Leggi la scheda della dipendente', dove: {ep: Y + 'dipendenti'}, percorso: 'Paghe → Dipendenti e parametri (PA30)',
     campi: [['Matricola', '00001 Chiara Fontana, addetta alle vendite e al magazzino'], ['Contratto', 'CCNL commercio, 4° livello (didattico), tempo indeterminato, assunta il 01/09/2026'], ['Lordo mensile', '1.800 €']],
     nota: 'Lettura: spunta a mano. Lo stipendio si calcola a fine mese: il lordo non è quello che la dipendente riceve in banca.'},
    {id: 'ea-wms', g: '1 · Il negozio apre', data: '01/09/2026', titolo: 'Attiva il magazzino W100 (vuoto)', dove: {ep: M + 'struttura'}, percorso: 'WMS → Struttura e attivazione',
     campi: [['Data di attivazione', '01/09/2026'], ['Pulsante', 'Attiva il magazzino W100']],
     attesa: '41 ubicazioni create e tutte vuote: gli scaffali hanno un indirizzo (01-03-2 = corsia 01, campata 03, piano 2). Nessuna scrittura: è organizzazione, non merce.',
     fatto: function (h) { return wm(h).attivo === '2026-09-01'; }},
    // ══════════ 2 · ordini ai fornitori ══════════
    ME('ME21N: ordina 10 PC desktop', 'F100', 'Distribuzione PC Italia', 'PC-UFF', 10, '450', '4.500'),
    ME('ME21N: ordina 6 stampanti laser', 'F200', 'Stampa Facile', 'STAMP-LAS', 6, '120', '720'),
    ME('ME21N: ordina 10 monitor', 'F300', 'Video Schermi', 'MON-24', 10, '95', '950'),
    ME('ME21N: ordina 30 mouse', 'F400', 'Accessori Digitali', 'MOUSE', 30, '6', '180'),
    ME('ME21N: ordina 40 cavi HDMI', 'F400', 'Accessori Digitali', 'CAVO-HDMI', 40, '3', '120'),
    {g: '2 · Ordini ai fornitori', titolo: 'ME2N: controlla gli ordini aperti', dove: {ep: A + 'ordini'}, percorso: 'MM → Ordini d’acquisto e rilascio → elenco degli ordini (ME2N)',
     campi: [['Conta', '5 ordini, 4 fornitori (Accessori Digitali ne ha due)'], ['Totale', '4.500 + 720 + 950 + 180 + 120 = 6.470 € IVA esclusa'], ['Stato', 'tutti «da ricevere»']],
     nota: 'Lettura: spunta a mano. È la lista che l’assistente controlla ogni mattina: che cosa abbiamo ordinato e che cosa deve ancora arrivare.'},
    // ══════════ 3 · arriva la merce ══════════
    MIGO('MIGO 101: ricevi i PC', 'PC-UFF', 'DDT-DPC-0412', '4.500'),
    MIGO('MIGO 101: ricevi le stampanti', 'STAMP-LAS', 'DDT-SF-118', '720'),
    MIGO('MIGO 101: ricevi i monitor', 'MON-24', 'DDT-VS-2290', '950'),
    MIGO('MIGO 101: ricevi i mouse', 'MOUSE', 'DDT-AD-077', '180'),
    MIGO('MIGO 101: ricevi i cavi HDMI', 'CAVO-HDMI', 'DDT-AD-078', '120'),
    {g: '3 · Arriva la merce', titolo: 'Merce da mettere a posto: che cosa aspetta in ricevimento?', dove: {ep: M + 'allocare'}, percorso: 'WMS → Merce da mettere a posto',
     campi: [['Data di oggi', '04/09/2026'], ['Tabella', '5 righe: un pallet per ogni merce, tutti nella zona GR-ZONE'], ['Colonna «Va in (proposta)»', 'lo scaffale che il sistema propone per ogni pallet']],
     nota: 'Lettura: spunta a mano. Finché la merce resta nella zona di scarico non si può vendere: va messa a scaffale.'},
    {id: 'ea-rf-putaway', g: '3 · Arriva la merce', data: '04/09/2026', titolo: 'RF: metti a scaffale i 5 pallet', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → scheda «📦 Compiti»',
     campi: [['Risorsa', 'MAG01'], ['Data di lavoro', '04/09/2026'], ['Procedura', RF]],
     attesa: '5 compiti di messa a posto confermati: PC, stampanti, monitor, mouse e cavi sugli scaffali della corsia 01. Nessuna scrittura: cambia il POSTO della merce, non il suo valore.',
     fatto: function (h) { return confermati(h, 'PUTAWAY', 5); }},
    {g: '3 · Arriva la merce', titolo: 'Dove si trova? Cerca i monitor', dove: {ep: M + 'mappa'}, percorso: 'WMS → Mappa delle ubicazioni → «🔎 Dove si trova?»',
     campi: [['Articolo', 'MON-24'], ['Leggi', 'l’ubicazione, la UdC e la quantità: 10 monitor'], ['Controlla', 'magazzino (WMS) 10 = contabilità 10']],
     nota: 'Lettura: spunta a mano. È la domanda di ogni giorno quando un cliente telefona: «ce l’avete? dov’è?».'},
    // ══════════ 4 · fatture dei fornitori ══════════
    MIRO('MIRO: registra la fattura dei PC', 'PC-UFF', 'DPC-2026-1520', 'F100', '4.500', '990', '5.490'),
    MIRO('MIRO: registra la fattura delle stampanti', 'STAMP-LAS', 'SF-0931', 'F200', '720', '158,40', '878,40'),
    MIRO('MIRO: registra la fattura dei monitor', 'MON-24', 'VS-4410', 'F300', '950', '209', '1.159'),
    MIRO('MIRO: registra la fattura dei mouse', 'MOUSE', 'AD-301', 'F400', '180', '39,60', '219,60'),
    MIRO('MIRO: registra la fattura dei cavi HDMI', 'CAVO-HDMI', 'AD-302', 'F400', '120', '26,40', '146,40'),
    {g: '4 · Fatture dei fornitori', titolo: 'Leggi i debiti verso i fornitori', dove: {ep: F + 'passive'}, percorso: 'FI → Fatture passive e pagamenti → partite aperte dei fornitori',
     campi: [['Debiti', 'F100 5.490 · F200 878,40 · F300 1.159 · F400 366 (due fatture) = 7.893,40'], ['Conto 22', 'Fatture da ricevere a zero: tutte le merci arrivate sono state fatturate'], ['IVA a credito', '1.423,40']],
     nota: 'Lettura: spunta a mano. Lo scadenziario dei fornitori: chi dobbiamo pagare, quanto e quando.'},
    // ══════════ 5 · ordini dei clienti ══════════
    VA('VA01: lo Studio Aurora ordina 4 PC', 'C100', 'Studio Commerciale Aurora', 'PC-UFF', 4, 'AURORA-PC', '2.760', '607,20', '3.367,20'),
    VA('VA01: lo Studio Aurora ordina 4 monitor', 'C100', 'Studio Commerciale Aurora', 'MON-24', 4, 'AURORA-MON', '596', '131,12', '727,12'),
    VA('VA01: lo Studio Aurora ordina 4 mouse', 'C100', 'Studio Commerciale Aurora', 'MOUSE', 4, 'AURORA-MOUSE', '56', '12,32', '68,32'),
    VA('VA01: l’Agenzia Girasole ordina 3 stampanti', 'C200', 'Agenzia Viaggi Girasole', 'STAMP-LAS', 3, 'GIRASOLE-STAMP', '567', '124,74', '691,74'),
    VA('VA01: l’Agenzia Girasole ordina 15 cavi HDMI', 'C200', 'Agenzia Viaggi Girasole', 'CAVO-HDMI', 15, 'GIRASOLE-CAVI', '135', '29,70', '164,70'),
    {g: '5 · Ordini dei clienti', titolo: 'VA05: controlla gli ordini e il semaforo', dove: {ep: V + 'ordini'}, percorso: 'SD → Ordini cliente → tabella «Ordini cliente»',
     campi: [['Conta', '5 ordini: 3 dello Studio Aurora, 2 dell’Agenzia Girasole'], ['Colonna «Disponibilità»', 'tutti VERDI: la merce è a scaffale'], ['Totale da fatturare', 'netto 4.114 €, con IVA 5.019,08 €']],
     nota: 'Lettura: spunta a mano. Prima di promettere una data al cliente si guarda il semaforo.'},
    // ══════════ 6 · consegne ══════════
    {id: 'ea-consegne', g: '6 · Consegne', data: '14/09/2026', titolo: 'VL01N: crea le 5 consegne', dove: {ep: V + 'consegne'}, percorso: 'SD → Consegne → Crea consegna (VL01N)',
     campi: [['Ordine', 'uno alla volta i 5 ordini del 10/09'], ['Data', '14/09/2026']],
     attesa: '5 consegne create e 5 compiti di prelievo (PICK) per il magazzino. Con il WMS la merce non esce ancora: prima va prelevata dallo scaffale. Nessuna scrittura.',
     fatto: function (h) { return tutte(h, function (r) { return !!consegna(h, r); }); }},
    {id: 'ea-rf-pick', g: '6 · Consegne', data: '14/09/2026', titolo: 'RF: preleva la merce delle 5 consegne', dove: {ep: M + 'rf'}, percorso: 'WMS → Pistola RF → scheda «📦 Compiti»',
     campi: [['Data di lavoro', '14/09/2026'], ['Procedura', RF]],
     attesa: '5 compiti di prelievo confermati: la merce va dallo scaffale alla zona di spedizione GI-ZONE. Nessuna scrittura.',
     fatto: function (h) { return confermati(h, 'PICK', 5); }},
    {id: 'ea-pgi', g: '6 · Consegne', data: '14/09/2026', titolo: 'Uscita merci: registra le 5 partenze', contabile: true, dove: {ep: V + 'consegne'}, percorso: 'SD → Consegne → Uscita merci della consegna prelevata (VL02N · 601)',
     campi: [['Consegna', 'una alla volta le 5 consegne'], ['Data', '14/09/2026']],
     attesa: 'Una scrittura per consegna: D 41 Costo del venduto / A 13 Magazzino merci al prezzo d’acquisto. PC 1.800 · monitor 380 · mouse 24 · stampanti 360 · cavi 45 = 2.609 €.',
     nota: 'La merce che esce non è più nostra: il suo costo passa dal magazzino (attività) al costo del venduto (conto economico).',
     fatto: function (h) { return tutte(h, function (r) { var c = consegna(h, r); return !!c && !!c.pgi; }); }},
    // ══════════ 7 · fatture ai clienti ══════════
    {id: 'ea-fatture', g: '7 · Fatture ai clienti', data: '15/09/2026', titolo: 'VF01: fattura le 5 consegne', contabile: true, dove: {ep: V + 'fatture'}, percorso: 'SD → Fatturazione → Crea fattura (VF01)',
     campi: [['Consegna', 'una alla volta le 5 consegne'], ['Data', '15/09/2026']],
     attesa: 'Per ogni fattura D 11 Crediti verso il cliente / A 40 Ricavi + A 21 IVA a debito. Studio Aurora 3.367,20 + 727,12 + 68,32 = 4.162,64; Agenzia Girasole 691,74 + 164,70 = 856,44. Ricavi 4.114, IVA 905,08.',
     fatto: function (h) { return tutte(h, function (r) { return !!fattura(h, r); }); }},
    {id: 'ea-sdi', g: '7 · Fatture ai clienti', data: '15/09/2026', titolo: 'Trasmetti le 5 fatture allo SdI', dove: {ep: F + 'sdi'}, percorso: 'FI → Fattura elettronica (SdI)',
     campi: [['Documento di vendita', 'una alla volta le 5 fatture (il menu propone la prima da trasmettere)'], ['Data di invio', '15/09/2026']],
     attesa: '5 ricevute di consegna dello SdI. Da ora una fattura sbagliata non si cancella più: si corregge con una nota di credito.',
     fatto: function (h) { return tutte(h, function (r) { var f = fattura(h, r); return !!f && !!f.sdi; }); }},
    {g: '7 · Fatture ai clienti', titolo: 'Leggi una fattura elettronica (XML)', dove: {ep: F + 'sdi'}, percorso: 'FI → Fattura elettronica (SdI) → Anteprima del file XML',
     campi: [['Documento', 'la fattura dei 4 PC allo Studio Aurora'], ['Trova', 'cedente (Pixel & Bit), cessionario (Studio Aurora), descrizione, quantità, prezzo, aliquota IVA 22 e totale']],
     nota: 'Lettura: spunta a mano. È il file che arriva al commercialista e all’Agenzia delle Entrate.'},
    // ══════════ 8 · stipendio ══════════
    {g: '8 · Stipendio', data: '30/09/2026', titolo: 'Calcola il cedolino di settembre', dove: {ep: Y + 'cedolino'}, percorso: 'Paghe → Presenze e cedolino → Calcolo',
     campi: [['Periodo', '2026-09']],
     attesa: 'Un cedolino. Lordo 1.800 − INPS a carico della dipendente 9,19% 165,42 − IRPEF 81,96 = NETTO 1.552,62 € (quello che arriva in banca). Costo per l’azienda: lordo 1.800 + contributi della ditta 532,44 + INAIL 27 + TFR 133,33 = 2.492,77 €. Nessuna scrittura: il calcolo non è ancora in contabilità.',
     nota: 'Leggi il cedolino: lordo, contributi INPS a carico della dipendente, IRPEF trattenuta, netto in busta. Poi il costo per l’azienda: lordo + contributi della ditta + INAIL + TFR.',
     fatto: function (h) { return ((h.S.hr || {}).cedolini || []).some(function (c) { return c.periodo === '2026-09'; }); }},
    {g: '8 · Stipendio', data: '30/09/2026', titolo: 'Registra lo stipendio in contabilità', contabile: true, dove: {ep: Y + 'contabilita'}, percorso: 'Paghe → Registrazione, stipendi e F24 → Registrazione',
     campi: [['Periodo', '2026-09'], ['Data', '30/09/2026']],
     attesa: 'D 80 Salari e stipendi 1.800 + D 81 Oneri sociali 559,44 (INPS ditta 532,44 + INAIL 27) + D 82 TFR 133,33 / A 27 Debiti verso dipendenti 1.552,62 + A 28 INPS 706,86 (dipendente 165,42 + ditta 532,44 + contributo TFR 9) + A 24 INAIL 27 + A 29 Erario c/ritenute 81,96 + A 31 Fondo TFR 124,33.',
     fatto: function (h) { return reg(h, 'PAGHE', '2026-09-30'); }},
    {g: '8 · Stipendio', data: '30/09/2026', titolo: 'Paga lo stipendio', contabile: true, dove: {ep: Y + 'contabilita'}, percorso: 'Paghe → Registrazione, stipendi e F24 → Pagamento dei netti',
     campi: [['Periodo', '2026-09'], ['Data', '30/09/2026']],
     attesa: 'D 27 Debiti verso dipendenti / A 10 Banca 1.552,62: il bonifico dello stipendio. Ritenute e contributi restano debiti fino all’F24 del 16 ottobre.',
     fatto: function (h) { return reg(h, 'PAGAMENTO_STIPENDI', '2026-09-30'); }},
    // ══════════ 9 · pagamenti e incassi ══════════
    PAGA('F-53: paga Distribuzione PC Italia', 'F100', 'Distribuzione PC Italia', '5.490'),
    PAGA('F-53: paga Stampa Facile', 'F200', 'Stampa Facile', '878,40'),
    PAGA('F-53: paga Video Schermi', 'F300', 'Video Schermi', '1.159'),
    PAGA('F-53: paga Accessori Digitali (due fatture)', 'F400', 'Accessori Digitali', '366'),
    {g: '9 · Pagamenti e incassi', data: '30/09/2026', titolo: 'F-28: incassa dallo Studio Aurora', contabile: true, dove: {ep: V + 'incassi'}, percorso: 'SD → Incassi e partite (F-28)',
     campi: [['Cliente', 'C100 Studio Commerciale Aurora'], ['Importo', '4162,64'], ['Riferimento', 'SALDO FATTURE AURORA'], ['Data valuta', '30/09/2026']],
     attesa: 'D 10 Banca / A 11 Crediti verso Studio Aurora 4.162,64: chiude le tre fatture.', nota: 'Per i centesimi usa la virgola.',
     fatto: function (h) { return incassato(h, 'C100'); }},
    {g: '9 · Pagamenti e incassi', data: '30/09/2026', titolo: 'F-28: incassa dall’Agenzia Girasole', contabile: true, dove: {ep: V + 'incassi'}, percorso: 'SD → Incassi e partite (F-28)',
     campi: [['Cliente', 'C200 Agenzia Viaggi Girasole'], ['Importo', '856,44'], ['Riferimento', 'SALDO FATTURE GIRASOLE'], ['Data valuta', '30/09/2026']],
     attesa: 'D 10 Banca / A 11 Crediti verso Agenzia Girasole 856,44. Nessun cliente ha più debiti verso di noi.',
     fatto: function (h) { return incassato(h, 'C200'); }},
    // ══════════ 10 · IVA e F24 ══════════
    {g: '10 · IVA e F24', data: '30/09/2026', titolo: 'Liquida l’IVA di settembre', contabile: true, dove: {ep: H + 'iva'}, percorso: 'FI → IVA, imposte, chiusura → Liquidazione IVA',
     campi: [['Periodo', '2026-09'], ['Data', '30/09/2026']],
     attesa: 'IVA a debito sulle vendite 905,08 − IVA a credito sugli acquisti 1.423,40 = CREDITO di 518,32: questo mese non si versa niente, il credito passa a ottobre. D 21 905,08 + D 25 Erario c/IVA 518,32 / A 14 1.423,40.',
     nota: 'Il primo mese di un negozio di solito è a credito: si compra la merce per riempire gli scaffali prima di venderla.',
     fatto: function (h) { return ((h.S.chiusura || {}).iva || []).some(function (x) { return x.periodo === '2026-09'; }); }},
    {g: '10 · IVA e F24', data: '16/10/2026', titolo: 'F24 del 16 ottobre: versa ritenute e contributi', contabile: true, dove: {ep: Y + 'contabilita'}, percorso: 'Paghe → Registrazione, stipendi e F24 → F24',
     campi: [['Periodo', '2026-09'], ['Data di versamento', '16/10/2026']],
     attesa: 'D 29 Erario c/ritenute 81,96 + D 28 INPS 706,86 / A 10 Banca 788,82. L’INAIL (27) non è nell’F24 mensile: si paga con l’autoliquidazione annuale. Banca finale 14.784,24 €.',
     nota: 'Il 16 del mese dopo si versano allo Stato l’IRPEF trattenuta in busta e all’INPS i contributi (della dipendente e della ditta). È una scadenza da segnare in agenda.',
     fatto: function (h) { return reg(h, 'F24', '2026-10-16'); }},
    // ══════════ 11 · controlli finali ══════════
    {g: '11 · Controlli finali', titolo: 'Monitor: il magazzino quadra con la contabilità', dove: {ep: M + 'monitor'}, percorso: 'WMS → Monitor del magazzino',
     campi: [['Rimasti a scaffale', 'PC-UFF 6 · STAMP-LAS 3 · MON-24 6 · MOUSE 26 · CAVO-HDMI 25'], ['Valore', '2.700 + 360 + 570 + 156 + 75 = 3.861 € = conto 13 Magazzino merci'], ['Quadratura', 'tutte le righe «quadra»; zone di passaggio vuote']],
     nota: 'Lettura: spunta a mano. Acquistato 6.470 − venduto al costo 2.609 = 3.861: il magazzino fisico e quello contabile dicono la stessa cosa.'},
    {g: '11 · Controlli finali', titolo: 'Bilancio di verifica: com’è andato settembre', dove: {ep: F + 'bilancio'}, percorso: 'FI → Bilancio di verifica (F.08)',
     campi: [['Margine sulle merci', 'ricavi 4.114 − costo del venduto 2.609 = 1.505'], ['Costo del personale', 'stipendio 1.800 + oneri sociali 559,44 + TFR 133,33 = 2.492,77'], ['Banca', '20.000 − fornitori 7.893,40 − stipendio 1.552,62 + clienti 5.019,08 − F24 788,82 = 14.784,24'], ['Quadratura', 'totale Dare = totale Avere']],
     nota: 'Lettura e ragionamento: spunta a mano. Il primo mese è in perdita di 987,77 €: lo stipendio costa più del margine sulle merci vendute. Quanti PC in più (240 € di margine l’uno) servirebbero per pareggiare?'},
    {id: 'ea-consegna', g: 'Consegna', titolo: 'Consegna l’esercitazione al docente', dove: {ep: 'allievo.consegna'}, percorso: 'La mia area → Consegna il lavoro',
     campi: [['Esercizio', 'Executive Assistant: il primo mese di un negozio di informatica'], ['Nota', 'eventuali dubbi e la tua risposta sul pareggio']],
     nota: 'Il docente vede tutti i documenti, i compiti RF e le scritture. Spunta a mano dopo la consegna.'}
  ];
  window.MSA_ESERCIZIO = {codice: 'executive-assistant', titolo: 'Executive Assistant: il primo mese di un negozio di informatica (settembre 2026)', versione: 'erp-ft', pannelloAutomatico: true, verificaRagioneria: true, passi: passi};
})();
