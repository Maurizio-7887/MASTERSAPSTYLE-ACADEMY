/* Testo didattico composto: nessuna inizializzazione, importazione o modifica dei documenti. */
(function () {
  'use strict';
  var E = window.MSA_ESERCIZIO;
  if (!E || !window.MSA_MAGAZZINO_FORMAS || !window.MSA_LABORATORI_COMPLETI || !window.MSA_USO_PROGRAMMA) return;
  var premessa = {
    id:'completo-sicurezza',g:'Come usare il percorso completo',titolo:'Tre percorsi, salvataggi separati e prove documentate',
    dove:{ep:'erp_dati.avvio'},percorso:'Launchpad → Esercitazione completa',
    campi:[['A · Preparazione azienda','Azienda vuota → costituzione e capitale → configurazione WMS → acquisto/entrata in funzione beni strumentali → budget annuo, quattro centri, distinta/ciclo e costo standard. Non è ancora il ciclo operativo commerciale.'],['A · Ciclo operativo','Ordini cliente → fabbisogni → ordini di acquisto → ricevimento e fattura → 300 transenne sullo stesso ordine con tre dichiarazioni e WIP → 20 kit HALB autonomi a scorta → consegna e fattura cliente → contabilità, chiusura e riapertura. Conserva questi risultati.'],['B · Magazzino FORMAS','UF 8, 9, 10 e 11: approfondimenti e prove dedicate. Esegui le operazioni alternative solo nello spazio di prova indicato.'],['C · Laboratori dei comandi','Account didattici separati dal caso principale. Il docente prepara gli accessi; cambiare guida o computer NON separa i dati. Nuova azienda nello stesso account sostituisce lo slot: non è un laboratorio separato.'],['Regola di sicurezza','Non usare Azzera, Carica situazione, Ripristina o un preset sul caso da consegnare. La ripartenza Nuova azienda, solo prima di iniziare e autorizzata dal docente, richiede backup JSON se ci sono dati. Prima dei laboratori consegna il caso principale e conserva le evidenze; prove distruttive solo in account sacrificabili.'],['Evidenze','Per ogni fase conserva numero documento, data, quantità, valore e risposta motivata. Una spunta manuale attesta la tua dichiarazione, non un collaudo automatico.']],
    attesa:'Distinguere avanzamento di produzione, movimento fisico, movimento contabile e valorizzazione. Nessun collegamento con magazzini, hardware, SdI, banche o automazioni reali.',
    nota:'Il PDF FORMAS è un calendario con titoli UF, non il programma analitico. I dettagli degli esercizi sono una proposta didattica verificata sul codice Academy. Non è SAP e non è una procedura fiscale o professionale certificata.'
  };
  var storico = E === window.MSA_ESERCIZIO_DICEMBRE_LEGACY;
  var base = E.passi.slice();
  if (storico) {
    base = [{id:'completo-storico',g:'Lavoro storico da conservare',titolo:'Questo salvataggio usa la produzione storica: non convertirlo',dove:{ep:'erp_dati.avvio'},percorso:'Launchpad → Dicembre: dalla costituzione alla riapertura',campi:[['Lavoro precedente','Torna alla guida Dicembre per continuarlo senza modifiche.'],['Nuovo percorso','Per il caso WIP richiedi al docente un account didattico separato e vuoto. Non azzerare o reimportare il lavoro storico.']],nota:'La guida completa non riscrive i vecchi ordini e non applica loro il nuovo modello WIP.'}];
  } else if (base[0]) {
    base[0] = Object.assign({},base[0],{
      campi:[['Ambiente','Sistema integrato, azienda dedicata al caso principale e priva di documenti precedenti.'],['Se trovi lavoro esistente','Solo se il docente autorizza la ripartenza: scarica e conserva il backup JSON, poi conferma NUOVA AZIENDA nella scheda di avvio. Sostituisce lo stesso slot, non separa i casi. Per conservarli entrambi operativi richiedi un account separato.'],['Prima fase','Costituisci la società e versa il capitale; attiva WMS vuoto; acquista i cinque cespiti prima di usarli; prepara budget annuo, quattro centri e standard.'],['Inizio del ciclo operativo','Sono gli ordini cliente Beta e Delta a dare avvio a fabbisogni, acquisti di ferro, produzione e consegne.'],['Durata','Percorso esteso su più lezioni. Il caso principale e i laboratori non sono una singola prova da 5–6 ore.']],
      nota:'Cambiare guida non separa gli archivi: stesso account = stesso sistema integrato. Preserva i documenti e le consegne precedenti.'
    });
  }
  // Arricchisci copie dei passi: il caso originale e i suoi controlli restano invariati.
  var macchine = [
    ['Taglierina a nastro','MAC-TAG-01','SIM-TAG-001','Taglio','IMP','10'],
    ['Piegatubi idraulica','MAC-PIE-01','SIM-PIE-001','Piegatura','IMP','10'],
    ['Saldatrice a filo','MAC-SAL-01','SIM-SAL-001','Saldatura','IMP','10'],
    ['Carrello elevatore elettrico','MAC-MAG-01','SIM-CAR-001','Magazzino','MEZ','20'],
    ['Sega circolare','MAC-SEG-01','SIM-SEG-001','Taglio','IMP','10']
  ];
  var wms = {
    'erp_magazzino.struttura':'Prerequisiti WMS: società costituita e capitale versato, nessuna scorta nel caso. Attiva W100 una sola volta: crea la struttura, non merci o scritture. Leggi la guida Ingresso → Campi → Conferma → Risultato e gli aiuti sotto ogni campo.',
    'erp_acquisti.entrate':'Prima del MIGO 101 serve l’ordine acquisto corretto e rilasciato. Quantità = totale arrivato, danni inclusi; danneggiati = parte del totale, non quantità aggiuntiva. Il 101 valorizza IM; con WMS attivo la parte buona arriva in GR-ZONE. Solo dopo conferma tutti i PUTAWAY in RF: ricevimento non significa merce a scaffale.',
    'erp_magazzino.compiti':'Prima dei compiti STAGING: standard CK11N/CK24 rilasciato, ordine PP aperto/rilasciato e componenti messi a posto. Controlla prelievi già fatti, compiti aperti e scorta PSA-L1 condivisa fra ordini, NON riserva esclusiva dell’ordine scelto. Quantità vuota = fabbisogno TOTALE, non residuo: per integrare scrivi solo quanto manca. Creare un compito impegna la merce; confermarlo in RF cambia il dove, non consuma.',
    'erp_produzione.avanzamento':'Prerequisiti 261: STAGING confermato in RF e componente disponibile in PSA-L1. Il 261 consuma e addebita l’ordine; non ripetere il consumo dopo lo spostamento. Il 101 del prodotto richiede le fasi completate e crea GR-ZONE/PUTAWAY: conferma poi la messa a posto.',
    'erp_vendite.consegne':'Prima: ordine cliente e disponibilità confermata, finiti messi a posto. La consegna con WMS crea PICK, non ancora il 601. Conferma i PICK in RF fino a GI-ZONE; se sono attive le ondate, rilasciale prima.',
    'erp_spedizione.imballo':'Prerequisito: tutti i PICK confermati in GI-ZONE. Pezzi per collo non è numero colli; SSCC identifica il collo, non l’UdC. Packing non scarica IM.',
    'erp_spedizione.trasporti':'Prima preleva e imballa. Assegna le consegne libere al trasporto e carica tutti gli SSCC. Il trasporto creato non è ancora partito.',
    'erp_spedizione.partenza':'Prima tutti i colli devono essere caricati. La partenza registra 601 e DDT simulati: non ripetere una uscita merci diretta sulla stessa consegna.',
    'erp_inventario.documenti':'Prerequisiti inventario: completa i compiti delle ubicazioni, poi crea e attiva il documento. Conta cieca: zero significa ubicazione vuota, campo vuoto significa conta mancante. Riconta se richiesta; LI20 chiude WMS e sposta lo scarto in DIFF/999, LI21 registra 711/712 in IM solo se esistono differenze. Non correggere con un nuovo ricevimento.'
  };
  function arricchisci(p) {
    var q = Object.assign({},p), campi = (p.campi || []).slice(), note = [];
    var bene = macchine.find(function(m){return p.titolo.indexOf('F-90:')===0 && campi.some(function(r){return r[0]==='Descrizione' && r[1]===m[0];});});
    if (bene) {
      campi = campi.concat([['Codice interno macchinario',bene[1]],['Matricola del costruttore',bene[2]],['Modello','SIM Academy'],['Ubicazione / reparto',bene[3]],['Centro di costo (etichetta)',bene[3]],['Aliquota civilistica annua %','Lascia vuoto: classe '+bene[4]+' = '+bene[5]+'%, come nel caso originale']]);
      note.push('Il codice cespite CE- è automatico; codice interno univoco e matricola sintetica sono identificativi distinti, non il numero fattura. Centro è una sola etichetta: non imputa costi al budget CPM. Non riacquistare un bene già salvato: puoi completare solo i dati tecnici nel Registro.');
    }
    if (p.dove && wms[p.dove.ep]) note.push(wms[p.dove.ep]);
    if (/F-53:/.test(p.titolo)) campi.push(['Conto bancario di addebito','10 Banca c/c (predefinito): non scegliere 10.02 nel caso principale']);
    if (p.id==='dicembre-giornale' || p.id==='uso-quiz') note.push('Nel quiz cerca ciascun conto per codice o descrizione e selezionalo dall’elenco. Le righe sono in ordine libero: conta l’insieme completo di conto, Dare/Avere e importo, incluse eventuali righe ripetute; non la posizione. La prova non registra una seconda volta la scrittura. Un clic senza risposta completa non è un tentativo valutabile.');
    q.campi=campi; q.nota=[p.nota || ''].concat(note).filter(Boolean).join(' '); return q;
  }
  if (!storico) {
    base=base.map(arricchisci);
    base[0].campi=base[0].campi.concat([['Banca del caso principale','Mantieni conto 10 Banca c/c per tutti i pagamenti e gli estratti; il conto 10.02 non ha saldi aggiuntivi. Nessun giroconto richiesto nel caso.'],['Budget campo per campo','Dopo i cinque cespiti segui i passi CPM già inclusi: personale e indiretti annui, capacità, ore tariffa, volume annuo, driver e riparto. Non aggiungere acquisti cespiti o manutenzioni tecniche ai costi una seconda volta.']]);
    // Lettura del registro prima del budget, senza nuove registrazioni nel caso.
    var ultimoBene=base.findIndex(function(p){return p.titolo.indexOf('F-90: compra una sega')===0;});
    if (ultimoBene>=0) base.splice(ultimoBene+1,0,{
      id:'completo-macchine-registro',g:'2 · Macchinari',data:'01/12/2026',titolo:'Leggi il registro e distingui anagrafica tecnica e costo',dove:{ep:'erp_cespiti.registro'},percorso:'FI → Cespiti → Registro dei beni ammortizzabili',
      campi:[['Ricerca','Cerca MAC-TAG-01 o SIM-TAG-001; se il bene esisteva già e non hai inserito i dati tecnici, cercalo per descrizione senza ricomprarlo.'],['Registro','Confronta codice CE-, codice interno, matricola, classe, costo, fondo e netto. Il registro è ricercabile anche per ubicazione e centro.'],['Aliquote','IMP 10% e MEZ 20% sono valori didattici. Nel caso lascia l’aliquota civile predefinita: modificarla cambierebbe le quote attese. Civilistico = costo × aliquota × mesi/12 dall’entrata in funzione, mese incluso, entro il netto residuo.'],['Fiscale','Il coefficiente fiscale della classe è distinto dall’aliquota civile; nella simulazione è dimezzato nel primo anno. Il prospetto fiscale usa le sole quote civilistiche già registrate, non l’anteprima AFAB. Non determina imposte reali.'],['Manutenzione','La scheda tecnica registra solo data, tipo e nota: NON registra spese, fatture, pagamenti né costi CPM. In questo passo leggi soltanto; la prova di inserimento è nel laboratorio separato.'],['Budget','Gli ammortamenti nel budget sono quote annue previste, non il prezzo del bene o il pagamento F-53. Se già compresi negli indiretti/Generale non aggiungerli di nuovo.']],
      attesa:'Sola lettura: cinque beni acquistati, stessi costi e stessi documenti del caso. Nessun nuovo AFAB o acquisto.',nota:'Per i vecchi lavori non cambiare aliquote, costi, date o documenti. Gli ammortamenti saranno registrati solo al passo AFAB previsto.'
    });
  }
  var aggiunte = [{
    id:'lab-migliorie-manutenzione',g:'E · Laboratori opzionali separati',titolo:'Scheda macchina: prova una manutenzione senza contabilizzare spese',dove:{ep:'erp_cespiti.registro'},percorso:'Account di laboratorio cespiti → Cespiti → Registro',
    campi:[['Account','Solo account didattico separato già usato per il laboratorio cespiti, mai il caso principale. Serve un cespite già acquistato. Non creare un altro bene per questa prova.'],['Dati tecnici','Seleziona il cespite; codice interno facoltativo univoco LAB-MAC-01, matricola sintetica LAB-SIM-001, modello SIM, ubicazione Laboratorio, centro etichetta Taglio → Salva solo i dati tecnici. Non sovrascrivere identificativi già assegnati.'],['Intervento','Data non anteriore all’acquisto e non successiva all’eventuale cessione; Tipo Preventiva; Nota «SIM controllo protezioni» → Aggiungi intervento didattico.'],['Verifica','Cerca la matricola e ritrova la scheda. Confronta prima/dopo il giornale, costo, fondo e aliquote: invariati. Il registro interventi contiene data/tipo/nota, NON un importo.']],
    attesa:'Nessuna spesa o scrittura FI: manutenzione tecnica non equivale a fattura. Una eventuale fattura reale nella simulazione richiederebbe un documento contabile distinto, non richiesto qui.',nota:'Nessun reset, collegamento a macchinari o servizio di manutenzione reale.'
  },{
    id:'lab-migliorie-banche-avvio',g:'E · Laboratori opzionali separati',titolo:'Due banche: prepara un account sacrificabile da capitale 10.000',dove:{ep:'erp_dati.avvio'},percorso:'Account LAB-DUE-BANCHE → Avvio → Nuova azienda vuota',
    campi:[['Isolamento','Consegna e conserva prima il caso principale. Il docente fornisce un account sintetico separato, vuoto e sacrificabile LAB-DUE-BANCHE. Cambiare guida o scheda non separa i dati. Se contiene lavoro, fermati: NON azzerare e NON caricare preset.'],['Costituzione','Data 01/05/2027, capitale sottoscritto 10000 → Crea nuova azienda vuota (costituzione). NON Avvia il sistema con saldi pronti.'],['Versamento soci','Data 01/05/2027, Importo versato 10000 → Versa il capitale. Non attivare WMS né riacquistare i cinque beni del caso.'],['Verifica','Conto 10 = 10000, conto 10.02 = 0. Nessun saldo iniziale inventato o importato per la seconda banca.']],
    attesa:'Questi numeri valgono solo per LAB-DUE-BANCHE, non sostituiscono il capitale 80.000 del caso principale.',nota:'Ogni passaggio successivo continua esclusivamente in questo account.'
  },{
    id:'lab-migliorie-banche-giroconto',g:'E · Laboratori opzionali separati',titolo:'Alimenta la seconda banca con un giroconto interno',dove:{ep:'erp_tesoreria.posizione'},percorso:'Tesoreria → Posizione di cassa → Giroconto tra banche simulate',
    campi:[['Prerequisito','Solo LAB-DUE-BANCHE costituito e capitale 10000 già versato.'],['Previsione dal','02/05/2027 (per leggere la posizione alla data del giroconto)'],['Dal conto / Al conto','10 / 10.02'],['Importo € / Data','3000 / 02/05/2027 → Registra il giroconto'],['Controllo','D 10.02 / A 10 per 3000: conto 10 = 7000, conto 10.02 = 3000; totale 10000. Il trasferimento non è ricavo né costo.']],
    attesa:'Il conto di origine deve avere disponibilità: non ripetere il giroconto e non usare saldi negativi come liquidità.',nota:'Nessun bonifico bancario reale.'
  },{
    id:'lab-migliorie-banche-pagamenti',g:'E · Laboratori opzionali separati',titolo:'Una fattura esente, due pagamenti da banche diverse',dove:{ep:'erp_fi.passive'},percorso:'FI → Fatture passive di servizi e pagamenti',
    campi:[['Fattura FB60','Fornitore F400; Numero LAB-DUE-POL; Conto 83; Descrizione Polizza simulata due banche; Imponibile 1200; IVA 0; Competenza dal/al vuota; Scadenza 03/05/2027; Data 03/05/2027 → Registra la fattura.'],['Primo F-53','Fornitore F400; Conto bancario di addebito 10.02; Fattura da pagare LAB-DUE-POL; Importo 400; Data 04/05/2027 → Registra il pagamento. Conserva il numero contabile.'],['Secondo F-53','Stessa fattura e fornitore; Conto bancario di addebito 10; Importo 800; Data 05/05/2027 → Registra il pagamento.'],['Controllo','Fornitore a zero; 10 = 6200; 10.02 = 2600; totale 8800. D20/A10.02 400 e D20/A10 800: la fattura non si registra di nuovo.']],
    attesa:'Il selettore F-53 sceglie il conto di addebito per quel pagamento; non cambia la banca predefinita degli altri processi.',nota:'F110, incassi, paghe, Ri.Ba., factoring e fisco mantengono il conto 10. Questa prova non promette una scelta banca generalizzata.'
  },{
    id:'lab-migliorie-banche-estratto',g:'E · Laboratori opzionali separati',titolo:'Riconcilia il conto 10.02 senza pagare due volte',dove:{ep:'erp_tesoreria.estratti'},percorso:'Tesoreria → Estratto conto',
    campi:[['Conto bancario / Data estratto','10.02 / 06/05/2027'],['Movimenti (una riga ciascuno)','2027-05-04;-400;PAGAMENTO LAB-DUE-POL\n2027-05-06;-5;COMMISSIONI SIMULATE'],['Caricamento','Carica estratto una sola volta, poi Abbina e registra l’estratto. Nel testo dei movimenti usa date ISO aaaa-mm-gg. Il pagamento da 400 già registrato si riconosce per stessa banca, data e importo univoci. Non contiene il giroconto del 02/05: il saldo iniziale è ricavato prima della prima riga (3000).'],['Se il pagamento resta da abbinare','Abbinamento manuale: seleziona la riga -400, inserisci il Contabile F-53 già registrato del primo pagamento; lascia vuoti cliente, fattura da chiudere, fornitore e conto. Registra la riga: associa soltanto, non ripagare F400.'],['Verifica finale','Commissione D58/A10.02 5; nessun secondo addebito di 400. Conto 10 = 6200, 10.02 = 2595, totale = 8795. Estratto riconciliato con il solo conto 10.02, non col totale banche.']],
    attesa:'La riconciliazione confronta saldi dello stesso conto e data. Conserva estratto e contabili effettivi; non importare l’esempio di giugno del copione originario.',nota:'Solo dati simulati. Il saldo 2595 deriva da capitale e giroconto documentati, non da una disponibilità precompilata.'
  }];
  var uso=window.MSA_USO_PROGRAMMA.passi.map(arricchisci);
  window.MSA_ESERCIZIO = Object.assign({}, E, {
    codice:'completo-formas',titolo:'Esercitazione completa — azienda, magazzino e innovazione',
    passi:[premessa].concat(base,window.MSA_MAGAZZINO_FORMAS.passi,window.MSA_LABORATORI_COMPLETI.passi,uso,aggiunte),
    casoStorico:storico
  });
})();
