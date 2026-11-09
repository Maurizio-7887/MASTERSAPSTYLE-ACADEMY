/* Solo istruzioni didattiche CPM: nessuna attivazione o modifica automatica dello stato. */
(function () {
  'use strict';
  var centri = ['Taglio','Piegatura','Saldatura'];
  var modello = function(h){return (h.S.costing || {}).cpm;};
  var attivo = function(h){var m=modello(h);return !!m && m.versione==='cpm-centri-v1';};
  var circa = function(a,b){return Math.abs(Number(a)-b)<0.00001;};
  var stima = function(h,mat){return ((h.S.costing || {}).stime || {})[mat];};
  var snapshot = function(h,mat){var s=stima(h,mat);return s && s.elementi && s.elementi.par && s.elementi.par.snapshot;};
  var piano0 = function(h,cdc){var m=modello(h);return ((m && m.piano && m.piano['0']) || {})[cdc] || {};};
  // 4200: va bene il dettaglio della guida (fitto 12.000 + ammortamenti 2.900 + servizi 3.100) oppure il valore proposto dal programma
  // (18.000 su una sola classe): conta il totale dei costi comuni, senza personale.
  var ok4200 = function(h){var p=piano0(h,'4200')||{},n=function(k){return Number(p[k])||0;};
    if(circa(n('86'),12000)&&circa(n('50'),2900)&&circa(n('54'),3100))return true;
    var tot=Object.keys(p).reduce(function(t,k){return t+(Number(p[k])||0);},0);
    return circa(tot,18000)&&!n('80')&&!n('81')&&!n('82')&&!n('83');};
  var CO = function(ep,percorso){return {dove:{ep:'erp_controllo.'+ep},percorso:percorso};};
  var bpc = function(h){return (h.S.costing || {}).bpc;};
  var CDC6 = ['4100','4200','4210','4220','4230','4300'];
  var STAGIONE = [400,350,300,200,150,150,200,100,200,300,350,400];
  var passo = function(id,titolo,campi,extra){return Object.assign({id:id,g:'2 · Preparazione: budget e standard',data:'01/12/2026',titolo:titolo,dove:{ep:'erp_controllo.centri'},percorso:'CO → Controllo di gestione → 1 · Centri, attività e classi di costo',campi:campi},extra || {});};
  window.MSA_CPM_FORMAS = {
    passiPreparazione:[
      passo('cpm-attivazione','Passo 1 del ciclo CO: apri il piano 2026 e leggi le anagrafiche',[
        ['Prerequisiti','Società costituita, capitale versato, WMS vuoto e cinque cespiti acquistati; nessun ordine PP o movimento materiali'],
        ['Leggi prima','Il riquadro «Passo 1 · Apri il piano CO 2026»: che cosa crea (sei centri con i codici delle paghe, tipo attività ORE, ciclo TR-STD) e che cosa NON fa (nessuna scrittura FI, nessun ordine)'],
        ['Per confermare scrivi ATTIVA','ATTIVA'],['Pulsante','Apri il piano CO'],
        ['Poi leggi','Gerarchia H-FT: 4100 Magazzino e 4200 Produzione (centri di servizio), 4210 Taglio, 4220 Piegatura, 4230 Saldatura (produttivi), 4300 Amministrazione · tipi di attività ORE-TAG/ORE-PIE/ORE-SAL · classi di costo primarie 80, 81, 82, 50, 54, 83, 86 e secondarie 943000/944000 · tabella OKB9'],
        ['Barra in alto','Il ciclo di pianificazione: 1 anagrafiche → 2 KP06 → 3 KP26 → 4 ribaltamento → 5 KSPI → 6 CK11N/CK24 → 7 consuntivo. Il pallino giallo è la prossima cosa da fare'],
        ['Regola contabile fondamentale','Centro di costo = responsabilità di consumo delle risorse; ordine produttivo/commessa = oggetto che riceve il costo industriale; centro di ricavo = responsabilità commerciale gestionale, NON automaticamente uno dei sei centri di costo. I centri di profitto collegano ricavi e costi di competenza per misurare il risultato. Nel simulatore il ricavo si analizza tramite cliente, materiale, regione e canale in CO-PA: non inventare un campo centro di ricavo che non esiste.']
      ],{attesa:'Piano CO 2026 aperto (versione 0, revisione 1). Nessuna scrittura FI, nessun ordine cliente o PP creato; gli ordini esistenti non cambiano.',nota:'I codici dei centri sono gli stessi delle paghe (PA30): i costi del personale registrati con le paghe arriveranno da soli sul loro centro.',fatto:attivo}),
      passo('cpm-budget','KP06: pianifica i costi annui dei centri (versione 0)',[
        ['Versione','0 · Piano/consuntivo (operativa)'],
        ['Centro 4210 Taglio','80 Salari e stipendi 36000; tutte le altre classi 0 → Salva il piano del centro'],
        ['Centro 4220 Piegatura','80 Salari e stipendi 36000 → Salva il piano del centro'],
        ['Centro 4230 Saldatura','80 Salari e stipendi 36000 → Salva il piano del centro'],
        ['Centro 4200 Produzione','86 Fitti passivi 12000 (capannone: 3.000 a trimestre) · 50 Ammortamenti 2900 (taglierina 1.500 + piegatubi 800 + saldatrice 600, quota annua a regime) · 54 Consulenze e servizi 3100 (energia e manutenzioni); 80, 81, 82, 83 a 0 → Salva il piano del centro: sono costi previsti del centro comune, non costi da aggiungere direttamente alle commesse'],
        ['Centri 4100 Magazzino e 4300 Amministrazione','Lasciali a 0 nella versione di piano 0 per mantenere i valori didattici del caso. NON significa che siano centri senza costi reali: le paghe di Marco e Giulia saranno imputate ai rispettivi centri nel consuntivo. In una pianificazione aziendale completa vanno stimati anche questi costi e definito se sono industriali, logistici o di periodo.'],
        ['Controlla la tabella','Piano versione 0: 4210, 4220, 4230 36.000 ciascuno; 4200 18.000; totale 126.000']
      ],{dove:{ep:'erp_controllo.kp06'},percorso:'CO → Controllo di gestione → 2 · Pianificazione costi per centro',attesa:'Piano 126.000 € = 108.000 di personale dei reparti + 18.000 di costi comuni di stabilimento. È un piano annuo, non il costo di dicembre, e non registra niente in contabilità.',nota:'Ogni centro si salva da solo: scegli il centro in alto, scrivi gli importi annui, premi «Salva il piano del centro». Ogni salvataggio crea una nuova revisione del piano.',
        fatto:function(h){var m=modello(h);return attivo(h) && m.anno===2026 && centri.every(function(k){var c=m.centri[k];return c && circa(c.personale,36000) && circa(c.indiretti,0);}) && ok4200(h) && circa(m.generale.produttivi,18000) && circa(m.generale.amministrativi,0);}}),
      passo('cpm-paghe','Tabella di controllo del budget del personale: confronta il piano con le paghe',[
        ['Riquadro','Riprendi i costi del personale dalle paghe (PCP)'],['Versione di destinazione','1 · confronto (non toccare la versione 0)'],['Pulsante','Trasferisci dalle paghe'],
        ['Leggi la tabella di controllo','4100 Magazzino (Marco Rossi) 37.807,06 · 4200 Produzione (Sara Bianchi) 40.507,57 · 4300 Amministrazione (Giulia Verdi) 46.808,74 di paghe a regime'],
        ['Differenze','4210, 4220, 4230: piano 36.000 e paghe 0 → differenza positiva: il budget prevede personale dei reparti da assumere. 4100, 4200, 4300: piano 0 e paghe a regime → differenza negativa da spiegare'],
        ['Consuntivo registro paghe','Zero finché non registri le paghe di dicembre (passo 13): dopo la registrazione la colonna si riempie da sola con il centro di ogni dipendente']
      ],{dove:{ep:'erp_controllo.kp06'},percorso:'CO → Controllo di gestione → 2 · Pianificazione costi per centro → Tabella di controllo del budget del personale',attesa:'La versione 1 contiene il costo annuo dei tre dipendenti per centro (classi 80, 81, 82): 125.123,37 €. La versione 0, le tariffe e il costo standard non cambiano.',nota:'Paghe a regime = retribuzione × 13 (80) + INPS ditta 29,58% e INAIL 1,50% (81) + TFR retribuzione / 13,5 (82). Il budget non si corregge per far tornare le paghe: le differenze si spiegano.',
        fatto:function(h){var m=modello(h);return attivo(h) && !!(m.piano && m.piano['1'] && m.piano['1']['4100'] && m.piano['1']['4100']['80']>0);}}),
      passo('cpm-kp26','KP26 e LTP: ore dei reparti e volume annuo',[
        ['Ore dei reparti (KP26)','4210 Taglio, 4220 Piegatura, 4230 Saldatura: capacità 1500 e ore pianificate 1500 ciascuno → Salva le attività pianificate'],
        ['Volumi annui (LTP)','TR-STD 1200; tutti gli altri prodotti 0 → Salva i volumi'],
        ['Leggi la tabella','Ore richieste dal volume 300 / 240 / 480; saturazione 20% / 16% / 32%']
      ],Object.assign(CO('kp26','CO → Controllo di gestione → 3 · Pianificazione attività e volumi'),{attesa:'Le ore pianificate sono la base della tariffa (1.500 per reparto); le ore richieste dal volume (1.020 in tutto) misurano solo la saturazione.',nota:'1.200 sono i pezzi dell’anno, non il lotto di un ordine (300). Spunta con «Fatto» dopo aver salvato e letto la tabella.'})),
      passo('cpm-ciclo','KSU1: ribaltamento dei costi comuni sui reparti',[
        ['Regola del ciclo','Ore pianificate dei centri ricevitori (KP26)'],['Pulsante','Salva il ciclo'],
        ['Leggi il ribaltamento di piano (KSU8)','Mittenti 4100 + 4200 = 18.000 → 6.000 a 4210, 6.000 a 4220, 6.000 a 4230'],
        ['4300 Amministrazione','Non partecipa: resta fuori dal costo del prodotto']
      ],Object.assign(CO('ksu','CO → Controllo di gestione → 4 · Ribaltamento dei costi comuni'),{attesa:'18.000 × 1.500 / 4.500 = 6.000 € per reparto. Il ribaltamento è solo CO: nessuna scrittura FI.',nota:'Spunta con «Fatto» dopo aver salvato il ciclo.'})),
      passo('cpm-standard-tr','Salva distinta e ciclo della transenna sui tre centri',[
        ['Pagina','CO → Distinta, ciclo e scheda di calcolo · riquadro «Distinta e ciclo standard»'],['Prodotto da modificare','TR-STD'],['Componente','FERRO'],['Quantità componente per pezzo','8'],['Taglio h/pz','0,25'],['Piegatura h/pz','0,20'],['Saldatura h/pz','0,40'],['Setup h/lotto','0'],['Centro del setup','Taglio (nessun costo perché setup zero)'],['Pulsante','Salva distinta/ciclo versionati']
      ],{dove:{ep:'erp_costi.scheda'},percorso:'CO → Controllo di gestione → Distinta, ciclo e scheda di calcolo',attesa:'Standard unitario: 8 × 0,95 + 0,25 × 28 + 0,20 × 28 + 0,40 × 28 = 31,40. Le tre fasi appartengono a un solo ordine; nessun HALB intermedio.',nota:'I tempi per pezzo e le tariffe sono dati standard; le conferme successive sono ore effettive. Ogni modifica crea una revisione; non modificare budget o ciclo fra calcolo/rilascio e i due ordini del caso.'}),
      passo('cpm-standard-halb','Salva il solo HALB autonomo: 20 kit non sono fasi',[
        ['Prodotto da modificare','SL-TAGLIO'],['Componente / Quantità per pezzo','FERRO / 8'],['Taglio h/pz','0,25'],['Piegatura h/pz / Saldatura h/pz','0 / 0'],['Setup h/lotto / Centro del setup','0 / Taglio'],['Pulsante','Salva distinta/ciclo versionati']
      ],{dove:{ep:'erp_costi.scheda'},percorso:'CO → Controllo di gestione → Distinta, ciclo e scheda di calcolo',attesa:'7,60 materiale + 7,00 Taglio = 14,60 €/kit. Ordine autonomo futuro: 20 kit, 160 kg, 5 h, valore 292. Non creare SL-PIEGA né consumare questi kit nella transenna.'}),
      passo('bpc-modello','BPC · Modello e Data Manager: porta il piano KP06 nel modello di budget',[
        ['Pagina','Launchpad → Pianificazione e budget → Modello e Data Manager'],
        ['Leggi prima','Il modello COSTI_CENTRI ha cinque dimensioni: CONTO (classi di costo), CENTRO (i sei centri), CATEGORIA (ACTUAL, BUDGET, FORECAST), VERSIONE, TEMPO (12 mesi del 2026)'],
        ['Per confermare scrivi CREA','CREA'],['Pulsante','Crea il modello'],
        ['Controlla','BUDGET V1 = piano KP06 versione 0 diviso in 12 mesi uguali: 4210, 4220, 4230 3.000 al mese di classe 80; 4200 fitto 1.000 al mese']
      ],{dove:{ep:'erp_bpc.modello'},percorso:'BPC → Pianificazione e budget → 1 · Modello e Data Manager',attesa:'Ambiente FT_PLAN, modello COSTI_CENTRI 2026 creato. Nessuna scrittura contabile, nessuna modifica al piano di S/4.',nota:'In SAP il budget di dettaglio si prepara in BPC (Business Planning and Consolidation) e poi torna in S/4. Qui il punto di partenza è il piano che hai appena scritto in KP06.',
        fatto:function(h){var b=bpc(h);return !!b && !!b.dati && Object.keys(b.dati).some(function(k){return k.indexOf('BUDGET|V1|')===0;});}}),
      passo('bpc-input','BPC · Modulo di inserimento: l’energia del centro 4200 mese per mese',[
        ['Pagina','Pianificazione e budget → 2 · Modulo di inserimento (EPM)'],['Categoria / Versione / Centro','BUDGET / V1 / 4200 Produzione'],
        ['Riga 54 Consulenze e servizi (energia e manutenzioni)','Gen 400 · Feb 350 · Mar 300 · Apr 200 · Mag 150 · Giu 150 · Lug 200 · Ago 100 · Set 200 · Ott 300 · Nov 350 · Dic 400'],
        ['Altre righe','Lasciale come sono: 50 Ammortamenti 241,67 al mese (dicembre 241,63 per l’arrotondamento), 86 Fitti passivi 1.000 al mese'],['Pulsante','Salva nel modello'],
        ['Controlla','Totale riga 54 = 3.100,00 come in KP06; totale centro 4200 = 18.000,00']
      ],{dove:{ep:'erp_bpc.input'},percorso:'BPC → Pianificazione e budget → 2 · Modulo di inserimento (EPM)',attesa:'Il budget annuo non cambia (3.100 di energia e servizi): cambia solo la distribuzione nei mesi, più alta d’inverno. Quindi le tariffe restano 28 €/h.',nota:'Il fitto è un costo di competenza di 1.000 al mese anche se si paga a trimestre: nel budget dei costi conta la competenza, non il pagamento.',
        fatto:function(h){var b=bpc(h),r=b && b.dati && b.dati['BUDGET|V1|4200|54'];return !!r && STAGIONE.every(function(v,k){return circa(r[k],v);});}}),
      passo('bpc-processo','BPC · Approvazione: ogni centro invia, il controller approva, poi ritrasferisci in S/4',[
        ['Pagina','Pianificazione e budget → 3 · Approvazione e ritrasferimento in S/4'],
        ['Per ognuno dei sei centri (4100, 4200, 4210, 4220, 4230, 4300)','Centro → Azione «Invia al controller» → Esegui'],
        ['Poi, per ognuno dei sei centri','Centro → Azione «Approva (controller)» → Nota «ok» → Esegui'],
        ['Prova facoltativa','Prima di approvare puoi respingere un centro: la nota è obbligatoria e il centro torna modificabile. Poi invialo di nuovo'],
        ['Ritrasferimento','Quando i sei centri sono verdi: scrivi TRASFERISCI → Ritrasferisci in S/4']
      ],{dove:{ep:'erp_bpc.processo'},percorso:'BPC → Pianificazione e budget → 3 · Approvazione e ritrasferimento in S/4',attesa:'Il budget approvato diventa il piano KP06 versione 0 con una nuova revisione. Gli importi annui sono gli stessi (126.000), quindi dopo KSPI le tariffe restano 28 €/h. Nessuna scrittura FI.',nota:'Un budget inviato o approvato è bloccato (work status): per correggerlo il controller deve respingerlo. Dopo il ritrasferimento la barra del ciclo CO torna sul passo 5: le tariffe vanno ricalcolate.',
        fatto:function(h){var b=bpc(h);return !!b && (b.retract || []).length>0 && CDC6.every(function(c){return ((b.stato || {})['BUDGET|V1|'+c] || {}).stato==='approvato';});}}),
      passo('cpm-kspi','KSPI: calcola le tariffe orarie dei reparti',[
        ['Prima','Controlla che il pallino giallo della barra sia sul passo 5: KP06, KP26, ciclo, distinte/cicli e ritrasferimento dal BPC sono fatti'],
        ['Data di esecuzione','01/12/2026'],['Pulsante','Esegui il calcolo delle tariffe'],
        ['Leggi','4210, 4220, 4230: personale 36.000 + altri costi 0 + ribaltato 6.000 = 42.000 € / 1.500 h = 28 €/h']
      ],Object.assign(CO('kspi','CO → Controllo di gestione → 5 · Calcolo delle tariffe'),{attesa:'Tariffe di piano 28 €/h per ORE-TAG, ORE-PIE, ORE-SAL. Senza questo passo CK11N si ferma: non saprebbe quanto vale un’ora.',nota:'Ogni nuova revisione del piano (anche una distinta o un ciclo salvati di nuovo) richiede di rieseguire KSPI.',fatto:function(h){var m=modello(h);return attivo(h) && !!m.kspi && m.kspi.revisione===m.revisione && centri.every(function(k){return circa(m.kspi.tariffe[k],28);});}})),
      passo('cpm-tariffe','Riconcilia quattro centri, tariffe e capacità annuale',[
        ['Centri di servizio 4100 + 4200','18.000 di costi comuni × 1.500 / 4.500 = 6.000 a ciascuno dei tre reparti; nulla resta sui mittenti dopo il ribaltamento'],
        ['Ciascun centro produttivo','36.000 personale + 0 indiretti propri + 6.000 allocati = 42.000; 42.000 / 1.500 h = 28 €/h'],
        ['Taglio · ore del volume e saturazione','1.200 × 0,25 = 300 h; 300 / 1.500 = 20%'],['Piegatura · ore del volume e saturazione','1.200 × 0,20 = 240 h; 16%'],['Saldatura · ore del volume e saturazione','1.200 × 0,40 = 480 h; 32%'],
        ['Amministrativi','Esclusi dal costo prodotto; qui zero. Non confonderli con il Generale produttivo ripartito'],
        ['Imputazione a una commessa mensile','Dicembre, 300 transenne: 75/60/120 h × 28 = 7140 attività; ferro 2400 kg × 0,95 = 2280; totale 9420 = 31,40 €/pz. Non imputare tutto il budget annuo né aggiungere i primari una seconda volta. La tariffa è costo standard, non prezzo di vendita']
      ],{dove:{ep:'erp_controllo.kspi'},percorso:'CO → Controllo di gestione → 5 · Calcolo delle tariffe e 3 · Pianificazione attività',attesa:'Il volume richiede 1.020 ore variabili annue; la capacità è 4.500 ore. Non trasformare capacità inutilizzata in pezzi prodotti o movimenti di magazzino.',nota:'Setup zero in questo caso. Per altri cicli il fabbisogno annuo di setup richiede anche il numero dei lotti. Il budget annuo/12 è solo un confronto indicativo se si assume esplicitamente assenza di stagionalità. Spunta dopo il confronto con la tabella.'}),
      passo('cpm-calcolo','CK11N: calcola entrambi gli standard dopo il budget',[
        ['Pagina','CO → Calcola il costo standard'],['Materiale / Data di calcolo','TR-STD / 01/12/2026 → Calcola'],['Ripeti il calcolo','SL-TAGLIO / 01/12/2026 → Calcola'],['Controlli','TR-STD 31,40 e SL-TAGLIO 14,60; snapshot della revisione CPM corrente; setup e sovraccosti aggiuntivi zero']
      ],{dove:{ep:'erp_costi.calcolo'},percorso:'CO → Calcola il costo standard → Calcola il costo standard',attesa:'Le tariffe per centro incorporano già il Generale produttivo: non aggiungere un altro sovraccosto del 6.000 per centro. La scheda storica con tariffa comune non sostituisce il modello CPM.',fatto:function(h){var m=modello(h);return attivo(h) && ['TR-STD','SL-TAGLIO'].every(function(mat){var s=snapshot(h,mat);return s && s.versione===m.versione && s.revisione===m.revisione;});}}),
      passo('cpm-rilascio','CK24: marca e rilascia gli standard prima dei materiali',[
        ['Data di rilascio','01/12/2026'],['Prima','Marca tutte le stime calcolate'],['Solo primo CPM su azienda vuota','Scrivi SOSTITUISCI nel campo dedicato per sostituire il bootstrap di costituzione; è un consenso al primo standard CPM, NON un reset azienda'],['Poi','Rilascia'],['Verifica','Stato FR per TR-STD e SL-TAGLIO, standard 31,40 e 14,60; magazzino ancora vuoto']
      ],{dove:{ep:'erp_costi.calcolo'},percorso:'CO → Calcola il costo standard → Marca e rilascia',attesa:'Nessuna rivalutazione FI: non ci sono giacenze. Il primo standard CPM sostituisce solo l’inizializzazione della nuova costituzione; non modifica saldi o ordini storici.',nota:'Prima salva budget e i due cicli, poi calcola e rilascia entrambi. Una revisione successiva richiede un nuovo calcolo/rilascio; non cambiare i parametri durante questo caso.',fatto:function(h){var m=modello(h);return attivo(h) && ['TR-STD','SL-TAGLIO'].every(function(mat){var s=stima(h,mat),snap=snapshot(h,mat);return s && s.stato==='FR' && snap && snap.revisione===m.revisione && snap.versione===m.versione;});}})
    ],
    passiConsuntivo:[
      {id:'cpm-attivita',g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'Confronta budget, attività assorbite e WIP senza duplicazioni',dove:{ep:'erp_controllo.report'},percorso:'CO → Controllo di gestione → Piano/consuntivo e scostamenti (la pagina si legge in 4 riquadri, dall’alto in basso)',
       campi:[['Periodo','dicembre 2026: 1 mese su 12, quindi il budget del periodo è il budget annuo ÷ 12 (reparti 42.000 → 3.500; ore 1.500 → 125)'],
        ['1 · Attività','Taglio 75 h transenne + 5 h kit = 80 h × 28 = 2.240 · Piegatura 60 h × 28 = 1.680 · Saldatura 120 h × 28 = 3.360 · totale 260 h = 7.280, uguale al conto 72 (D 72 / A 75): la pagina mostra ✓. Var. efficienza 0'],
        ['2 · Costi effettivi','Consuntivo letto da solo dalla contabilità: c’è solo 4300 Amministrazione 1.200 (polizza, via OKB9). Reparti, 4100 e 4200 a zero: le paghe di dicembre non sono ancora registrate (riquadro giallo). Le 7.280 di attività NON si sommano qui'],
        ['3 · Residuo dei reparti','Consuntivo 0 − attività 2.240 / 1.680 / 3.360 = residuo −2.240 / −1.680 / −3.360: gli ordini hanno già ricevuto il costo delle ore, i costi veri arriveranno con le paghe e le scritture di fine mese. Spesa −3.500 e assorbimento 1.260 / 1.820 / 140 si leggono a fine mese'],
        ['4 · Ordini e WIP','Transenne: materiali 2.280 + attività 7.140 = 9.420 · kit HALB: 152 + 140 = 292 · versato a magazzino 9.712, WIP 0: ogni euro contato una volta'],
        ['Da dove vengono i numeri','Tariffa 28 €/h = costo annuo del reparto (36.000 personale KP06 + 6.000 costi comuni ribaltati KSU1 = 42.000) ÷ 1.500 ore pianificate (KP26). Ore = pezzi × tempo del ciclo: Taglio 300 × 0,25 = 75 + 20 kit × 0,25 = 5; Piegatura 300 × 0,20 = 60; Saldatura 300 × 0,40 = 120. Ferro: 300 × 8 kg = 2.400 kg × 0,95 = 2.280; kit 20 × 8 kg = 160 kg × 0,95 = 152. Attività transenne 7.140 = (75 + 60 + 120) × 28; kit 140 = 5 × 28'],
        ['Scostamenti del riquadro 3, reparto per reparto','Taglio: spesa = consuntivo 0 − budget del periodo 3.500 = −3.500; assorbimento = 3.500 − 2.240 = 1.260; somma −2.240 = residuo. Piegatura: −3.500 + (3.500 − 1.680 = 1.820) = −1.680. Saldatura: −3.500 + (3.500 − 3.360 = 140) = −3.360. Efficienza 0: ore dichiarate = ore standard dei pezzi confermati']],
       attesa:'Le attività valorizzate (7.280) sono costo dei centri spostato sugli ordini, non un secondo costo del personale: compaiono nel riquadro 1 e nel 4, mai nel consuntivo del riquadro 2. A metà mese il residuo negativo è normale.',nota:'Residuo = consuntivo − attività assorbite = scostamento di spesa + scostamento di assorbimento; non è automaticamente inefficienza. Nel menu «Periodo» puoi scegliere il mese: il budget del periodo cambia con i mesi trascorsi. Il dettaglio delle righe del consuntivo è in Consuntivo dei centri (KSB1).'}
    ],
    passiRiconciliazione:[
      {id:'cpm-fonti-fine-mese',g:'14 · Controllo costi di fine mese',data:'31/12/2026',titolo:'KSB1: leggi i costi effettivi dei centri prima di interpretare i residui',dove:{ep:'erp_controllo.ksb1'},percorso:'CO → Controllo di gestione → Consuntivo dei centri (KSB1); poi 2 · Pianificazione costi per centro → Tabella di controllo; poi Piano/consuntivo e scostamenti',
       campi:[['Consuntivo automatico','Scegli il centro 4200: trovi la paga di Sara Bianchi (80, 81, 82 con origine «riga FI»), il fitto del rateo (86) e gli ammortamenti (50) con origine «OKB9». Nessun costo va riportato a mano'],
         ['Tabella di controllo del personale (KP06)','La colonna «Consuntivo registro paghe» ora contiene la paga di dicembre di ogni dipendente sul suo centro; Consumo % = consuntivo / piano'],
         ['Riattribuzione KB11N — solo con evidenza','NON spostare la paga di Sara dal 4200 al 4230 per far tornare il budget o riempire artificialmente il centro Saldatura. Usa KB11N solo quando hai una rettifica documentata della destinazione effettiva del lavoro: causale, periodo, ore o percentuale giustificate, centro cedente/ricevente e importo della SOLA quota attribuibile. Nel caso base limitati a leggere il consuntivo, senza eseguire KB11N.'],
         ['Lettura del report','Residuo = consuntivo − assorbito = scostamento di spesa + scostamento di assorbimento. Efficienza confronta ore effettive e ore standard dei pezzi confermati. Report cumulativo dell’anno, non del solo mese'],
         ['Attenzione','Il piano è annuo e l’azienda ha lavorato solo dicembre: piano/12 è un confronto indicativo solo se dichiari che non c’è stagionalità. OKB9 assegna i costi privi di centro in base a una regola, ma non sostituisce la verifica della loro competenza e destinazione. I ricavi non vanno imputati automaticamente a 4200/4210/4220/4230.']],
       attesa:'Il consuntivo dei centri coincide con le scritture FI dell’anno: paghe sul centro del dipendente, gli altri costi con la tabella OKB9. Nessuna scrittura aggiuntiva, il risultato FI del caso non cambia.',nota:'In S/4HANA FI e CO stanno nello stesso libro giornale (ACDOCA): per questo il consuntivo non si ricopia. Non concludere «inefficienza» dal solo residuo e non generare scritture FI di WIP.'}
      ,{id:'cpm-centri-ricavi',g:'14 · Controllo costi di fine mese',data:'31/12/2026',titolo:'Controllo di gestione: separa centri di costo, responsabilità di ricavo e margini',dove:{ep:'erp_copa.ke30'},percorso:'CO → Redditività (CO-PA) → Redditività per segmento (KE30); confronta con KSB1, ordini PP e contabilità FI',
       campi:[['1 · Mappa dei costi','Costi primari: conto FI + centro di costo effettivo (paghe 80/81/82 sul centro dipendente, fitti 86, ammortamenti 50, servizi 54 con regola OKB9 verificata). 4200 è un centro comune, 4210/4220/4230 sono produttivi, 4100 è logistico, 4300 amministrativo.'],
         ['2 · Attribuzione alle commesse','I costi indiretti vengono ribaltati secondo un driver motivato; le ore dei reparti sono valorizzate con KSPI e addebitate agli ordini tramite CO11N. Il materiale è addebitato tramite 261. Nessun costo primario viene registrato una seconda volta quando è assorbito da un ordine.'],
         ['3 · Responsabilità di ricavo','Nel modulo CO-PA → KE30 apri la configurazione centri di profitto e assegna TR-STD a PC-TR e SL-TAGLIO a PC-SL; seleziona poi Analizza per Centro di profitto. Non registrare ricavi delle vendite su 4210 Taglio, 4220 Piegatura o 4230 Saldatura: sono centri di costo. I ricavi vengono contabilizzati in FI/SD alla fatturazione e letti in CO-PA con cliente, materiale, regione, canale e gruppo cliente. Un centro di ricavo commerciale è una responsabilità distinta; i centri di profitto PC-TR/PC-SL sono ora configurabili per materiale in CO-PA, ma non sostituiscono una contabilità FI per profit center.'],
         ['4 · Centro di profitto e commessa','Un centro di profitto misura ricavi e costi attribuibili alla medesima responsabilità; una commessa/ordine raccoglie i costi della produzione specifica. Non confondere ordine produttivo con ordine cliente e non attribuire due volte il costo del prodotto al passaggio 101 → vendita. L’esercizio non dispone di una contabilità completa per centro di profitto: la vista KE30 è per segmenti commerciali, non una prova di profit center registrato.'],
         ['5 · Controllo margine','Apri KE30: scegli Cliente e poi Materiale; leggi ricavi lordi, sconti, trasporti, resi e abbuoni, costo del venduto standard, eventuali differenze Material Ledger e provvigioni. Ricavi netti rettificati − costo del venduto − differenze di prezzo = MdC I; meno provvigioni = MdC II. Non chiamare il MdC II utile netto: restano da considerare costi amministrativi, commerciali, finanziari e altri costi di periodo.'],
         ['6 · Riconciliazione finale','Controlla che: vendite FI/SD ↔ ricavi CO-PA; consumi 261 + ore CO11N + ribaltamenti ↔ costi ordini; KO88/Material Ledger ↔ varianze; costo del venduto in CO-PA ↔ prodotti effettivamente venduti. Evidenzia separatamente scostamento di spesa, saturazione, efficienza e margine commerciale; non forzare i saldi.']],
       attesa:'L’allievo sa distinguere dove nasce il costo, chi ne è responsabile, su quale ordine è assorbito e quale mercato/cliente genera il ricavo; sa leggere margine di contribuzione senza duplicazioni e senza attribuire ricavi ai centri di costo.',
       nota:'Attività di lettura e riconciliazione: nessuna registrazione FI, nessuna rettifica KB11N obbligatoria, nessun nuovo centro di ricavo o di profitto creato dal simulatore.'}
      ,{id:'bpc-consuntivo',g:'14 · Controllo costi di fine mese',data:'31/12/2026',titolo:'BPC · carica il consuntivo di dicembre e crea il forecast 11+1',dove:{ep:'erp_bpc.modello'},percorso:'BPC → Pianificazione e budget → 1 · Modello e Data Manager; poi 4 · Budget, forecast e consuntivo',
       campi:[['Carica il consuntivo da S/4','Fino al mese 12 → Carica il consuntivo'],['Crea un forecast','Nome della versione F1 · Mesi a consuntivo 11 → Crea il forecast'],
         ['Leggi il report (fino a Dic, forecast F1)','Per ogni centro: budget dell’anno, consuntivo, forecast. Il forecast F1 = gennaio–novembre a consuntivo (zero: la società non esisteva) + dicembre a budget'],
         ['Centro 4200 a dicembre','Forecast F1 = budget di dicembre: 400 energia + 241,63 ammortamenti + 1.000 fitto = 1.641,63. Consuntivo 4.867,30 = paga di Sara Bianchi 2.437,50 + oneri 757,57 + TFR 180,56 + fitto del rateo 1.033,33 + ammortamenti di dicembre 458,34'],['Centri 4100 e 4300','Consuntivo 3.150,60 (Marco Rossi) e 4.002,65 (Giulia Verdi) contro forecast 0: il budget versione 0 non prevede personale su questi centri. È la stessa differenza della tabella di controllo del personale'],['Reparti 4210, 4220, 4230','Forecast 3.000 ciascuno (dicembre del budget), consuntivo 0: il personale dei reparti è ancora da assumere']],
       attesa:'Il consuntivo nel BPC è lo stesso del KSB1: viene dalle righe del libro giornale con il loro centro o con OKB9. Il forecast 11+1 mostra il costo atteso per il 2026 di un’azienda che ha lavorato solo a dicembre.',nota:'Il confronto giusto è dicembre con dicembre: il budget annuo contro un solo mese di consuntivo non dice niente. Il BPC non registra niente in contabilità.',
       fatto:function(h){var b=bpc(h);return !!b && b.actualFino===12 && b.versioni.FORECAST.indexOf('F1')>=0;}}
    ]
  };

  /* Versione semplice dei passi CO: in una frase, cosa fai clic per clic, cosa devi vedere.
     I testi completi (campi, attesa, nota) restano disponibili nel pannello sotto «Perché?» e «Tutti i dati». */
  var SEMPLICE = {
    'cpm-attivazione': {idea:'Apri il controllo di gestione: l’azienda viene divisa in 6 «centri di costo», cioè i reparti a cui attribuire i costi.',
      fai:['Premi «Apri ➜» qui sopra se non sei già sulla pagina',['Nel riquadro «Passo 1» scrivi','ATTIVA'],'Premi «Apri il piano CO»'],
      vedi:['6 centri: 4100 Magazzino · 4200 Produzione · 4210 Taglio · 4220 Piegatura · 4230 Saldatura · 4300 Amministrazione','Nella barra in alto il pallino giallo passa al passo 2'],
      perche:'Taglio, Piegatura e Saldatura sono i reparti che lavorano le transenne; Magazzino e Produzione sono servizi comuni; Amministrazione resta fuori dal costo del prodotto. Questo passo non registra niente in contabilità.'},
    'cpm-budget': {idea:'Scrivi quanto costerà ogni reparto in un anno (il budget). Si fa un centro alla volta.',
      fai:['In alto scegli il centro 4210 Taglio',['Riga 80 Salari e stipendi','36000'],'Premi «Salva il piano del centro»','Ripeti uguale per 4220 Piegatura e 4230 Saldatura (36000 ciascuno)','Scegli il centro 4200 Produzione',['Riga 86 Fitti passivi','12000'],['Riga 50 Ammortamenti','2900'],['Riga 54 Consulenze e servizi','3100'],'Premi «Salva il piano del centro»','Non toccare 4100 e 4300: restano a zero'],
      vedi:['Totale del piano: 126.000 €','4210, 4220, 4230: 36.000 ciascuno · 4200: 18.000'],
      perche:'36.000 è lo stipendio annuo previsto per ogni reparto. 18.000 sono i costi comuni dello stabilimento: fitto 12.000 + ammortamenti 2.900 + energia e manutenzioni 3.100. È solo un piano: in contabilità non si registra niente.'},
    'cpm-paghe': {idea:'Confronta il budget con le paghe vere dei tre dipendenti, senza toccare il budget.',
      fai:['Scendi al riquadro «Riprendi i costi del personale dalle paghe»','Versione di destinazione: «1 · confronto» (NON la 0)','Premi «Trasferisci dalle paghe»','Leggi la tabella di controllo'],
      vedi:['4100 Magazzino 37.807,06 · 4200 Produzione 40.507,57 · 4300 Amministrazione 46.808,74','Totale delle paghe a regime: 125.123,37'],
      perche:'Il budget mette il personale sui reparti (da assumere), le paghe vere stanno su Magazzino, Produzione e Amministrazione: la tabella mostra la differenza. Non si corregge il budget per farlo tornare: la differenza si spiega.'},
    'cpm-kp26': {idea:'Scrivi quante ore lavora ogni reparto in un anno e quante transenne pensi di fare.',
      fai:['Righe 4210, 4220, 4230: capacità 1500 e ore pianificate 1500','Premi «Salva le attività pianificate»',['Volume annuo TR-STD','1200'],'Tutti gli altri prodotti: 0','Premi «Salva i volumi»','Poi premi «✓ Fatto» qui sotto'],
      vedi:['Ore richieste dal volume: Taglio 300 · Piegatura 240 · Saldatura 480','Saturazione: 20% · 16% · 32%'],
      perche:'Le 1.500 ore servono per calcolare quanto costa un’ora di reparto. 1.200 sono le transenne dell’anno (non il lotto di 300 di dicembre): 1.200 × 0,25 h = 300 ore di taglio, e così via.'},
    'cpm-ciclo': {idea:'Dividi i costi comuni (18.000) fra i tre reparti.',
      fai:['Regola del ciclo: «Ore pianificate dei centri ricevitori (KP26)»','Premi «Salva il ciclo»','Poi premi «✓ Fatto» qui sotto'],
      vedi:['6.000 a Taglio · 6.000 a Piegatura · 6.000 a Saldatura','4300 Amministrazione resta fuori'],
      perche:'18.000 × 1.500 ore del reparto / 4.500 ore totali = 6.000 a ciascuno. Anche questo è solo controllo di gestione: niente in contabilità.'},
    'cpm-standard-tr': {idea:'Scrivi la «ricetta» della transenna: quanto ferro e quante ore di ogni reparto per un pezzo.',
      fai:['Prodotto da modificare: TR-STD · componente FERRO',['Quantità di ferro per pezzo','8'],['Taglio h/pz','0,25'],['Piegatura h/pz','0,20'],['Saldatura h/pz','0,40'],['Setup h/lotto','0'],'Premi «Salva distinta/ciclo versionati»'],
      vedi:['La ricetta salvata: 8 kg di ferro e 0,25 + 0,20 + 0,40 ore'],
      perche:'Una transenna costerà 8 kg × 0,95 = 7,60 di ferro + 0,85 ore × 28 = 23,80 di lavoro = 31,40 € (lo vedrai al calcolo).'},
    'cpm-standard-halb': {idea:'Scrivi la ricetta del kit tagliato (semilavorato): solo ferro e taglio.',
      fai:['Prodotto da modificare: SL-TAGLIO · componente FERRO',['Quantità di ferro per pezzo','8'],['Taglio h/pz','0,25'],['Piegatura e Saldatura h/pz','0'],['Setup h/lotto','0'],'Premi «Salva distinta/ciclo versionati»'],
      vedi:['La ricetta salvata: 8 kg di ferro e 0,25 ore di taglio'],
      perche:'Un kit costerà 7,60 di ferro + 7,00 di taglio = 14,60 €. I 20 kit restano a scorta: non sono una fase della transenna.'},
    'bpc-modello': {idea:'Porta il budget annuo nel modulo di pianificazione mese per mese (BPC).',
      fai:[['Nel campo di conferma scrivi','CREA'],'Premi «Crea il modello»'],
      vedi:['Il budget diviso in 12 mesi uguali: 3.000 al mese per Taglio, Piegatura e Saldatura; per 4200 il fitto 1.000 al mese'],
      perche:'Nelle aziende il budget di dettaglio si prepara mese per mese in un modulo apposito e poi torna nel gestionale. Il punto di partenza è il piano annuo che hai appena scritto.'},
    'bpc-input': {idea:'L’energia costa di più d’inverno: scrivi la spesa mese per mese del centro 4200.',
      fai:['In alto scegli: BUDGET · V1 · 4200 Produzione',['Riga 54, da gennaio a dicembre','400 · 350 · 300 · 200 · 150 · 150 · 200 · 100 · 200 · 300 · 350 · 400'],'Le altre righe lasciale come sono','Premi «Salva nel modello»'],
      vedi:['Totale riga 54 = 3.100','Totale centro 4200 = 18.000 (come prima)'],
      perche:'Il totale dell’anno non cambia, cambia solo come si distribuisce nei mesi: per questo il costo orario resterà 28 €/h.'},
    'bpc-processo': {idea:'Ogni centro manda il budget, tu (controller) lo approvi, poi lo rimandi al gestionale.',
      fai:['Per ognuno dei 6 centri: scegli il centro → azione «Invia al controller» → Esegui','Poi per ognuno dei 6: azione «Approva (controller)» → nota «ok» → Esegui',['Quando sono tutti verdi scrivi','TRASFERISCI'],'Premi «Ritrasferisci in S/4»'],
      vedi:['I 6 centri verdi (approvati)','Nella pagina del controllo di gestione il pallino giallo torna al passo 5: ora si calcolano le tariffe'],
      perche:'Un budget inviato o approvato è bloccato: per cambiarlo il controller deve respingerlo. Il trasferimento crea una nuova versione del piano con gli stessi totali (126.000).'},
    'cpm-kspi': {idea:'Il programma calcola quanto costa un’ora di lavoro di ogni reparto.',
      fai:[['Data di esecuzione','01/12/2026'],'Premi «Esegui il calcolo delle tariffe»'],
      vedi:['Taglio, Piegatura e Saldatura: 28 €/h'],
      perche:'Costo del reparto in un anno: 36.000 di personale + 6.000 di costi comuni = 42.000 €. Diviso 1.500 ore = 28 € l’ora. Se cambi di nuovo budget o ricette, questo calcolo va rifatto.'},
    'cpm-tariffe': {idea:'Passo di sola lettura: controlla che i numeri tornino, poi spunta.',
      fai:['Confronta la tabella delle tariffe con i numeri qui sotto','Premi «✓ Fatto» qui sotto'],
      vedi:['Ogni reparto: 42.000 € / 1.500 h = 28 €/h','Ore del volume annuo: 300 / 240 / 480 (saturazione 20% / 16% / 32%)','Le 300 transenne di dicembre: ferro 2.280 + ore 7.140 = 9.420 € = 31,40 al pezzo'],
      perche:'Il costo orario è un costo standard (quanto dovrebbe costare), non il prezzo di vendita. Le ore non usate non diventano pezzi né magazzino.'},
    'cpm-calcolo': {idea:'Calcola il costo standard dei due prodotti.',
      fai:['Materiale TR-STD · data 01/12/2026 → «Calcola»','Materiale SL-TAGLIO · data 01/12/2026 → «Calcola»'],
      vedi:['TR-STD 31,40 €','SL-TAGLIO 14,60 €'],
      perche:'Il costo orario contiene già i costi comuni: non si aggiunge nessun altro sovraccosto.'},
    'cpm-rilascio': {idea:'Rendi ufficiali i due costi standard prima di comprare il ferro.',
      fai:[['Data di rilascio','01/12/2026'],'Premi «Marca tutte le stime calcolate»',['Solo la prima volta, nel campo dedicato scrivi','SOSTITUISCI'],'Premi «Rilascia»'],
      vedi:['TR-STD e SL-TAGLIO con stato FR (rilasciato)','Il magazzino è ancora vuoto'],
      perche:'Da adesso ogni chilo di ferro e ogni pezzo prodotto si valorizza a questi costi. SOSTITUISCI vale solo per il primo standard di un’azienda nuova: non azzera niente.'},
    'cpm-attivita': {idea:'Leggi il report a metà mese: è un passo di sola lettura, in 4 riquadri dall’alto in basso.',
      fai:['In «Periodo» lascia dicembre 2026','Leggi i 4 riquadri e confrontali con «Cosa devi vedere»','Premi «✓ Fatto» qui sotto'],
      vedi:['1 · Attività: 260 ore × 28 = 7.280 € (con ✓: uguale al conto 72)','2 · Costi effettivi: solo 4300 Amministrazione 1.200 € (le paghe di dicembre non sono ancora registrate)','3 · Residuo: Taglio −2.240 · Piegatura −1.680 · Saldatura −3.360 (a metà mese è normale)','4 · Ordini e WIP: transenne 9.420 + kit 292 = 9.712 a magazzino, WIP 0'],
      perche:'Le tre domande del report: 1) quanto hanno lavorato i reparti (ore × 28 €)? 2) quanto sono costati davvero (dalla contabilità)? 3) la differenza: residuo = costi veri − ore valorizzate. Le 7.280 di ore sono costo spostato sugli ordini, non un secondo costo: non si sommano ai costi effettivi. Ore: Taglio 300 × 0,25 = 75 + 20 kit × 0,25 = 5; Piegatura 300 × 0,20 = 60; Saldatura 300 × 0,40 = 120.'},
    'cpm-fonti-fine-mese': {idea:'A fine mese guarda i costi veri di ogni centro: arrivano da soli dalla contabilità.',
      fai:['Scegli il centro 4200','Leggi le righe: paga di Sara Bianchi (80, 81, 82), fitto (86), ammortamenti (50)','Non usare KB11N per spostare la paga senza ore o documenti comprovanti la destinazione effettiva','Premi «✓ Fatto» qui sotto'],
      vedi:['Ogni costo ha l’origine «riga FI» o «OKB9»: nessun importo scritto a mano','Nel report il residuo ora tiene conto delle paghe'],
      perche:'Contabilità e controllo di gestione leggono lo stesso libro giornale: per questo i costi non si ricopiano. Un residuo non vuol dire automaticamente inefficienza. Le paghe si imputano al centro del dipendente; l’eventuale rettifica richiede prove. I ricavi sono analizzati per segmento commerciale in CO-PA, non caricati sui reparti produttivi.'},
    'cpm-centri-ricavi': {idea:'Non confondere CHI consuma le risorse (centro di costo), QUALE prodotto assorbe il costo (ordine PP) e CHI genera il ricavo (cliente, prodotto e canale commerciale).',
      fai:['Apri KE30 — Redditività per segmento','Scegli prima Cliente e poi Materiale: confronta ricavi, sconti, resi, costo del venduto e provvigioni','Confronta i costi con KSB1 e con gli ordini di produzione','Non caricare ricavi sui centri produttivi e non spostare costi fra centri senza evidenza','Premi «✓ Fatto»'],
      vedi:['Ricavi e margini classificati per segmento commerciale, non per reparto di produzione','Costo industriale e costo del venduto distinti; costi di periodo non confusi con il MdC'],
      perche:'Il centro di costo misura la spesa del reparto; il centro di ricavo, quando configurato, la responsabilità commerciale; il centro di profitto unisce ricavi e costi attribuibili. Nel programma i ricavi si leggono in CO-PA per cliente/materiale/regione/canale: non c’è un campo centro di ricavo separato.'},
    'bpc-consuntivo': {idea:'Porta i costi veri di dicembre nel BPC e crea la previsione dell’anno (forecast).',
      fai:['Fino al mese 12 → «Carica il consuntivo»',['Nome della versione','F1'],['Mesi a consuntivo','11'],'Premi «Crea il forecast»','Leggi il report fino a dicembre con il forecast F1'],
      vedi:['4200: forecast 1.641,63 · consuntivo 4.867,30','4100 consuntivo 3.150,60 · 4300 consuntivo 4.002,65 (forecast 0)','Taglio, Piegatura, Saldatura: forecast 3.000 · consuntivo 0'],
      perche:'Si confronta dicembre con dicembre: il budget di un anno contro un solo mese non dice niente. Il personale di Magazzino e Amministrazione non era nel budget, quello dei reparti non è ancora assunto.'}
  };
  ['passiPreparazione','passiConsuntivo','passiRiconciliazione'].forEach(function (k) {
    (window.MSA_CPM_FORMAS[k] || []).forEach(function (p) { if (SEMPLICE[p.id]) Object.assign(p, SEMPLICE[p.id]); });
  });

  /* Mappa del ciclo CPM e budget: 8 tappe nell'ordine dell'esercizio. Ogni passo CO mostra in quale tappa sei,
     a che cosa serve e che cosa porta alla tappa dopo; il passo introduttivo spiega tutta la catena. */
  var TAPPE = [
    {nome:'Apri il controllo di gestione', serve:'Dividi l’azienda in centri di costo: chi spende (i reparti e i servizi).', porta:'I centri su cui scriverai il budget.', passi:['cpm-attivazione']},
    {nome:'Budget annuo dei centri', serve:'Quanto spenderà ogni centro in un anno: 36.000 per reparto, 18.000 di costi comuni. Lo confronti con le paghe vere.', porta:'Gli euro da trasformare in costo orario.', passi:['cpm-budget','cpm-paghe']},
    {nome:'Ore e ripartizione dei costi comuni', serve:'Quante ore lavora un reparto in un anno (1.500) e come i 18.000 comuni si dividono fra i reparti (6.000 ciascuno).', porta:'Euro e ore di ogni reparto: servono per il costo orario.', passi:['cpm-kp26','cpm-ciclo']},
    {nome:'Ricette dei prodotti', serve:'Quanto ferro e quante ore di ogni reparto servono per una transenna e per un kit.', porta:'Le quantità che, moltiplicate per il costo orario, danno il costo del prodotto.', passi:['cpm-standard-tr','cpm-standard-halb']},
    {nome:'Budget mese per mese e approvazione (BPC)', serve:'Lo stesso budget annuo diviso nei 12 mesi (l’energia costa di più d’inverno), inviato dai centri e approvato dal controller, poi rimandato al gestionale.', porta:'Un budget ufficiale e approvato: solo ora ha senso calcolare il costo orario.', passi:['bpc-modello','bpc-input','bpc-processo']},
    {nome:'Costo orario dei reparti', serve:'42.000 € (36.000 + 6.000) ÷ 1.500 ore = 28 € per ogni ora di Taglio, Piegatura e Saldatura.', porta:'Il prezzo interno di un’ora, da usare nelle ricette.', passi:['cpm-kspi','cpm-tariffe']},
    {nome:'Costo standard dei prodotti', serve:'Ricetta × costo orario + ferro: transenna 31,40 €, kit 14,60 €. Lo rendi ufficiale prima di comprare il ferro.', porta:'Il valore con cui il magazzino e la produzione registrano ogni pezzo.', passi:['cpm-calcolo','cpm-rilascio']},
    {nome:'Controllo: budget contro realtà', serve:'Durante e a fine mese confronti ore lavorate, costi veri e budget: residui, scostamenti e forecast.', porta:'Le decisioni del controller: dove si spende più del previsto e perché.', passi:['cpm-attivita','cpm-fonti-fine-mese','cpm-centri-ricavi','bpc-consuntivo']}
  ];
  var MAPPA = {};
  TAPPE.forEach(function (t, i) { t.passi.forEach(function (id) { MAPPA[id] = i; }); });
  var introduzione = {id:'cpm-mappa',g:'2 · Preparazione: budget e standard',data:'01/12/2026',titolo:'Prima del controllo di gestione: la mappa delle 8 tappe',dove:{ep:'erp_controllo.centri'},percorso:'CO → Controllo di gestione',
    campi:[['Domanda di fondo','Quanto costa davvero una transenna?'],['Costo orario','(36.000 + 6.000) € ÷ 1.500 h = 28 €/h'],['Costo standard TR-STD','0,85 h × 28 + 7,60 di ferro = 31,40 €'],['In contabilità','nessuna registrazione: è il piano']],
    idea:'Prima di cominciare leggi la mappa: tutto il budget serve a rispondere a una sola domanda, «quanto costa davvero una transenna?».',
    fai:['Leggi la catena qui sotto, dall’alto in basso','Apri «Perché?» per l’esempio con i numeri','Premi «✓ Fatto» qui sotto'],
    vedi:TAPPE.slice(0, 7).map(function (t, i) { return (i + 1) + ' · ' + t.nome + ': ' + t.serve; }).concat(['Dopo, durante il mese: 8 · ' + TAPPE[7].nome + '. Il ricavo si attribuisce a segmenti commerciali in CO-PA, non ai centri produttivi.']),
    perche:'La catena in una riga: budget in euro (tappa 2) ÷ ore dei reparti (tappa 3) = costo orario 28 €/h (tappa 6); ricetta (tappa 4) × costo orario + ferro = costo standard 31,40 € (tappa 7). Esempio: Taglio 0,25 h + Piegatura 0,20 h + Saldatura 0,40 h = 0,85 h × 28 = 23,80 € di lavoro + 8 kg × 0,95 = 7,60 € di ferro = 31,40 €. Il BPC (tappa 5) non cambia i totali: li distribuisce nei mesi e li fa approvare; per questo dopo l’approvazione il costo orario va ricalcolato. Nessuna di queste tappe registra niente in contabilità: sono il piano. La contabilità arriva con gli acquisti, la produzione e le paghe, e alla tappa 8 confronti il piano con la realtà.'};
  window.MSA_CPM_FORMAS.passiPreparazione.unshift(introduzione);
  window.MSA_CPM_FORMAS.tappe = TAPPE;
  ['passiPreparazione','passiConsuntivo','passiRiconciliazione'].forEach(function (k) {
    (window.MSA_CPM_FORMAS[k] || []).forEach(function (p) { if (MAPPA[p.id] != null) p.mappa = {tappe: TAPPE, attuale: MAPPA[p.id]}; else if (p.id === 'cpm-mappa') p.mappa = {tappe: TAPPE, attuale: -1}; });
  });

  /* Spiegazione a grandi lettere, per chi non ha mai fatto controllo di gestione: il codice SAP resta nel titolo,
     qui si dice con parole di tutti i giorni a che cosa serve il passo nel quadro d'insieme. */
  var GRANDE = {
    'cpm-mappa': 'Vogliamo sapere QUANTO COSTA FARE UNA TRANSENNA. Per saperlo servono tre cose: quanto spende ogni reparto, quante ore lavora, quanto ferro e quante ore servono per un pezzo. Le 8 tappe servono a mettere insieme queste tre cose.',
    'cpm-attivazione': 'Prima di contare i soldi bisogna dire DOVE si spendono. Qui dividi l’azienda in «cassetti»: un cassetto per ogni reparto (Taglio, Piegatura, Saldatura) e uno per i servizi comuni.',
    'cpm-budget': 'Scrivi QUANTO PENSI DI SPENDERE in un anno in ogni cassetto. È come il budget di casa per l’anno: stipendi dei reparti, affitto del capannone, energia. Non si paga niente: è una previsione.',
    'cpm-paghe': 'CONTROLLA LA PREVISIONE CON LE PAGHE VERE. Il programma prende gli stipendi veri dei dipendenti e li mette accanto al budget: così vedi dove la previsione è diversa dalla realtà.',
    'cpm-kp26': 'Scrivi QUANTE ORE LAVORA OGNI REPARTO in un anno e QUANTE TRANSENNE pensi di fare. Le ore servono dopo: per sapere quanto costa UN’ORA di reparto.',
    'cpm-ciclo': 'L’affitto e l’energia non sono di un solo reparto: sono di tutti. Qui li DIVIDI FRA I TRE REPARTI in parti uguali alle loro ore: 6.000 € a testa.',
    'cpm-standard-tr': 'Scrivi la RICETTA DELLA TRANSENNA: quanti kg di ferro e quanti minuti in ogni reparto servono per fare UN pezzo. È come la ricetta di una torta: ingredienti e tempi.',
    'cpm-standard-halb': 'Scrivi la RICETTA DEL KIT TAGLIATO (il pezzo a metà lavorazione che teniamo a scorta): solo ferro e taglio.',
    'bpc-modello': 'Prendi il budget dell’anno e lo DIVIDI NEI 12 MESI. Serve per sapere ogni mese se stiamo spendendo più o meno del previsto.',
    'bpc-input': 'Non tutti i mesi sono uguali: d’INVERNO L’ENERGIA COSTA DI PIÙ. Qui sistemi l’energia mese per mese. Il totale dell’anno resta lo stesso.',
    'bpc-processo': 'Il budget deve essere APPROVATO DAL CAPO: ogni reparto lo invia, il controller dice «ok», poi il budget approvato torna nel gestionale. Come un preventivo firmato.',
    'cpm-kspi': 'Adesso il programma calcola QUANTO COSTA UN’ORA DI LAVORO in ogni reparto: soldi del reparto in un anno diviso ore dell’anno = 28 € all’ora.',
    'cpm-tariffe': 'CONTROLLA CHE I CONTI TORNINO: 42.000 € diviso 1.500 ore fa davvero 28 € l’ora? Qui non si scrive niente, si verifica soltanto.',
    'cpm-calcolo': 'Ora metti insieme tutto: RICETTA × COSTO DI UN’ORA + FERRO = QUANTO COSTA UN PEZZO. La transenna costa 31,40 €, il kit 14,60 €.',
    'cpm-rilascio': 'Rendi UFFICIALE il costo dei pezzi. Da questo momento ogni transenna che entra o esce dal magazzino vale 31,40 €: è il valore che vedi nel magazzino.',
    'cpm-attivita': 'A metà mese guardi IL PIANO CONTRO LA REALTÀ: quante ore hanno lavorato i reparti, quanto è costato davvero, se c’è una differenza. Qui si legge soltanto.',
    'cpm-fonti-fine-mese': 'A fine mese guardi I COSTI VERI DI OGNI REPARTO: stipendi, affitto, ammortamenti. Arrivano da soli dalla contabilità, non si scrive niente a mano.',
    'bpc-consuntivo': 'Metti i COSTI VERI DI DICEMBRE accanto al budget e fai una PREVISIONE DI FINE ANNO: è il lavoro che il controller porta alla direzione.'
  };
  ['passiPreparazione','passiConsuntivo','passiRiconciliazione'].forEach(function (k) {
    (window.MSA_CPM_FORMAS[k] || []).forEach(function (p) { if (GRANDE[p.id]) p.grande = GRANDE[p.id]; });
  });

  /* Istruzioni punto per punto, una sola azione per riga: DOVE guardare sullo schermo e COSA fare,
     con il valore da scrivere (si copia con un clic). Ogni riga si spunta mentre si lavora. */
  var R = function (dove, fai, valore) { return {dove: dove, fai: fai, valore: valore}; };
  var PUNTI = {
    'cpm-mappa': [R('Qui nel pannello','Leggi il riquadro giallo e la mappa viola'),R('Qui nel pannello, in basso','Premi «✓ Fatto»')],
    'cpm-attivazione': [R('Qui nel pannello, in alto','Premi il pulsante blu «Apri ➜»'),R('Nella pagina, riquadro «Passo 1 · Apri il piano CO»','Clicca nella casella «Per confermare scrivi ATTIVA» e scrivi','ATTIVA'),R('Sotto la casella','Premi il pulsante «Apri il piano CO»'),R('In cima alla pagina','Guarda la barra dei passi: il pallino giallo è passato al 2')],
    'cpm-budget': [R('Qui nel pannello','Premi «Apri ➜»'),R('In alto, menu «Versione»','Lascia «0 · Piano/consuntivo»'),R('In alto, menu «Centro di costo»','Scegli «4210 Taglio»'),R('Riquadro «Pianifica il centro», casella «80 Salari e stipendi €/anno»','Scrivi','36000'),R('In fondo al riquadro','Premi «Salva il piano del centro»'),R('In alto, menu «Centro di costo»','Scegli «4220 Piegatura»'),R('Casella «80 Salari e stipendi €/anno»','Scrivi','36000'),R('In fondo al riquadro','Premi «Salva il piano del centro»'),R('In alto, menu «Centro di costo»','Scegli «4230 Saldatura»'),R('Casella «80 Salari e stipendi €/anno»','Scrivi','36000'),R('In fondo al riquadro','Premi «Salva il piano del centro»'),R('Menu «Centro di costo»','Scegli «4200 Produzione»'),R('Casella «86 Fitti passivi €/anno»','Scrivi','12000'),R('Casella «50 Ammortamenti €/anno»','Scrivi','2900'),R('Casella «54 Consulenze e servizi €/anno»','Scrivi','3100'),R('In fondo al riquadro','Premi «Salva il piano del centro»'),R('Tabella «Piano della versione 0»','Controlla il totale: 126.000')],
    'cpm-paghe': [R('Stessa pagina, scendi','Trova il riquadro «Riprendi i costi del personale dalle paghe»'),R('Menu «Versione di destinazione»','Scegli «1 · confronto» (ATTENZIONE: non la 0)'),R('Sotto','Premi «Trasferisci dalle paghe»'),R('Riquadro «Tabella di controllo del budget del personale»','Leggi le paghe: 4100 37.807,06 · 4200 40.507,57 · 4300 46.808,74')],
    'cpm-kp26': [R('Qui nel pannello','Premi «Apri ➜»'),R('Riquadro «Pianifica le ore dei centri produttivi»','In tutte e 6 le caselle (capacità e ore pianificate di Taglio, Piegatura, Saldatura) scrivi','1500'),R('In fondo al riquadro','Premi «Salva le attività pianificate»'),R('Riquadro «Volumi annui dei prodotti», casella «TR-STD · pezzi/anno»','Scrivi','1200'),R('Le altre caselle dei prodotti','Lascia 0'),R('In fondo al riquadro','Premi «Salva i volumi»'),R('Tabella «Ore richieste dal volume e saturazione»','Controlla: 300 · 240 · 480 ore'),R('Qui nel pannello, in basso','Premi «✓ Fatto»')],
    'cpm-ciclo': [R('Qui nel pannello','Premi «Apri ➜»'),R('Riquadro «Ciclo di ribaltamento FT-STAB», menu «Regola del ciclo»','Scegli «Ore pianificate dei centri ricevitori (KP26)»'),R('Le caselle «quota %»','Non toccarle (servono solo con le percentuali)'),R('In fondo al riquadro','Premi «Salva il ciclo»'),R('Riquadro «Ribaltamento di piano»','Controlla: 6.000 a Taglio, 6.000 a Piegatura, 6.000 a Saldatura'),R('Qui nel pannello, in basso','Premi «✓ Fatto»')],
    'cpm-standard-tr': [R('Qui nel pannello','Premi «Apri ➜»'),R('Riquadro «Distinta e ciclo standard», menu «Materiale»','Scegli','TR-STD'),R('Menu «Componente»','Scegli','FERRO'),R('Casella «Quantità componente per pezzo»','Scrivi','8'),R('Casella «4210 Taglio h/pz»','Scrivi','0,25'),R('Casella «4220 Piegatura h/pz»','Scrivi','0,20'),R('Casella «4230 Saldatura h/pz»','Scrivi','0,40'),R('Casella «Setup h/lotto»','Scrivi','0'),R('In fondo al riquadro','Premi «Salva distinta/ciclo versionati»')],
    'cpm-standard-halb': [R('Stessa pagina, riquadro «Distinta e ciclo standard», menu «Materiale»','Scegli','SL-TAGLIO'),R('Menu «Componente»','Scegli','FERRO'),R('Casella «Quantità componente per pezzo»','Scrivi','8'),R('Casella «4210 Taglio h/pz»','Scrivi','0,25'),R('Caselle «4220 Piegatura h/pz» e «4230 Saldatura h/pz»','Scrivi in tutte e due','0'),R('Casella «Setup h/lotto»','Scrivi','0'),R('In fondo al riquadro','Premi «Salva distinta/ciclo versionati»')],
    'bpc-modello': [R('Qui nel pannello','Premi «Apri ➜»'),R('Riquadro «Crea il modello di pianificazione», casella «Per confermare scrivi CREA»','Scrivi','CREA'),R('Sotto la casella','Premi «Crea il modello»'),R('Riquadro «Modello COSTI_CENTRI»','Guarda che il modello c’è')],
    'bpc-input': [R('Qui nel pannello','Premi «Apri ➜»'),R('In alto, menu «Categoria»','Scegli «BUDGET»'),R('Menu «Versione»','Scegli «V1»'),R('Menu «Centro»','Scegli «4200 Produzione»'),R('Tabella, riga «54 Consulenze e servizi»: gennaio, febbraio, marzo','Scrivi 400, 350, 300'),R('Stessa riga: aprile, maggio, giugno','Scrivi 200, 150, 150'),R('Stessa riga: luglio, agosto, settembre','Scrivi 200, 100, 200'),R('Stessa riga: ottobre, novembre, dicembre','Scrivi 300, 350, 400'),R('Le altre righe','Non toccarle'),R('Sotto la tabella','Premi «Salva nel modello»'),R('Totale della riga 54','Controlla: 3.100')],
    'bpc-processo': [R('Qui nel pannello','Premi «Apri ➜»'),R('Riquadro «Azioni sul budget di un centro»: menu «Centro» → 4100, menu «Azione» → «Invia al controller»','Premi «Esegui»'),R('Stesso riquadro','Ripeti «Invia al controller» per 4200, 4210, 4220, 4230, 4300'),R('Stesso riquadro: menu «Centro» → 4100, «Azione» → «Approva (controller)», «Nota / motivo»','Scrivi ok e premi «Esegui»','ok'),R('Stesso riquadro','Ripeti «Approva (controller)» per gli altri 5 centri'),R('Riquadro «Stato del budget per centro»','Controlla: tutti e 6 verdi'),R('Riquadro «Ritrasferisci il budget approvato in S/4», casella «Per confermare scrivi TRASFERISCI»','Scrivi','TRASFERISCI'),R('Sotto la casella','Premi «Ritrasferisci in S/4»')],
    'cpm-kspi': [R('Qui nel pannello','Premi «Apri ➜»'),R('Riquadro «Calcolo delle tariffe di piano», casella «Data di esecuzione»','Scrivi','01/12/2026'),R('Sotto','Premi «Esegui il calcolo delle tariffe»'),R('Tabella delle tariffe','Controlla: 28 €/h per Taglio, Piegatura e Saldatura')],
    'cpm-tariffe': [R('Stessa pagina, tabella delle tariffe','Controlla per ogni reparto: 42.000 € e 1.500 ore'),R('Con la calcolatrice','42.000 ÷ 1.500 = 28'),R('Qui nel pannello, in basso','Premi «✓ Fatto»')],
    'cpm-calcolo': [R('Qui nel pannello','Premi «Apri ➜»'),R('Riquadro «Calcola il costo standard», menu «Materiale»','Scegli','TR-STD'),R('Casella «Data di calcolo»','Scrivi','01/12/2026'),R('Sotto','Premi «Calcola»'),R('Menu «Materiale»','Scegli','SL-TAGLIO'),R('Casella «Data di calcolo»','Scrivi','01/12/2026'),R('Sotto','Premi «Calcola»'),R('Tabella «Stime dei costi»','Controlla: TR-STD 31,40 · SL-TAGLIO 14,60')],
    'cpm-rilascio': [R('Nel pannello, riquadro azzurro «🔎 Che cosa manca»','Leggi le righe con ❌: ti dicono che cosa fare, dall’alto in basso'),R('Se c’è scritto «va ricalcolato»','Riquadro a SINISTRA «Calcola il costo standard»: scegli il materiale, data 01/12/2026, premi «Calcola». Fallo per TR-STD e poi per SL-TAGLIO'),R('Riquadro a DESTRA «Marca e rilascia», casella «Data di rilascio»','Scrivi','01/12/2026'),R('Casella a destra, sotto la scritta «Solo primo CPM…»','Scrivi (non fa danni anche se non serve)','SOSTITUISCI'),R('Pulsante BIANCO','Premi «Marca tutte le stime calcolate»'),R('Pulsante BLU','Premi «Rilascia»'),R('Tabella «Stime dei costi» in fondo alla pagina','Controlla: tutti e due in stato FR (31,40 e 14,60). La spunta arriva da sola')],
    'cpm-attivita': [R('Qui nel pannello','Premi «Apri ➜»'),R('In alto, menu «Periodo»','Lascia dicembre'),R('Riquadro «1 · Attività»','Leggi il totale: 7.280 € con la spunta ✓'),R('Riquadro «2 · Costi effettivi dei centri»','Leggi: c’è solo 4300 Amministrazione 1.200'),R('Riquadro «3 · Centri produttivi: residuo»','Leggi: −2.240 · −1.680 · −3.360'),R('Riquadro «4 · Ordini e WIP»','Leggi: WIP 0'),R('Qui nel pannello, in basso','Premi «✓ Fatto»')],
    'cpm-fonti-fine-mese': [R('Qui nel pannello','Premi «Apri ➜»'),R('In alto, menu «Centro di costo»','Scegli «4200 Produzione»'),R('Riquadro «Partite singole effettive: costi primari»','Leggi le righe: paga di Sara Bianchi, fitto, ammortamenti'),R('Riquadro «Riattribuisci un costo fra centri»','NON spostare la paga di Sara senza evidenza della destinazione del lavoro: la rettifica è facoltativa e documentata'),R('Qui nel pannello, in basso','Premi «✓ Fatto»')],
    'cpm-centri-ricavi': [R('Qui nel pannello','Premi «Apri ➜»'),R('Pagina CO-PA, sezione «Configurazione centri di profitto»','Associa TR-STD al centro PC-TR e SL-TAGLIO a PC-SL'),R('Menu «Analizza per»','Scegli «Centro di profitto»'),R('Tabella KE30','Leggi ricavi, costo del venduto, differenze ML e margine per centro; verifica l’eventuale colonna NON-ASSEGNATO'),R('Poi torna a KSB1','Confronta i costi primari per CDC con i margini del CO-PA, senza sommarli una seconda volta'),R('Qui nel pannello','Premi «✓ Fatto»')],
    'bpc-consuntivo': [R('Qui nel pannello','Premi «Apri ➜»'),R('Riquadro «Data Manager · carica il consuntivo da S/4», casella «Fino al mese (1–12)»','Scrivi','12'),R('Sotto','Premi «Carica il consuntivo»'),R('Riquadro «Data Manager · crea un forecast», casella «Nome della versione»','Scrivi','F1'),R('Casella «Mesi a consuntivo»','Scrivi','11'),R('Sotto','Premi «Crea il forecast»'),R('Pagina «4 · Budget, forecast e consuntivo», tabella dei centri','Leggi: 4200 forecast 1.641,63 e consuntivo 4.867,30')]
  };
  ['passiPreparazione','passiConsuntivo','passiRiconciliazione'].forEach(function (k) {
    (window.MSA_CPM_FORMAS[k] || []).forEach(function (p) { if (PUNTI[p.id]) p.fai = PUNTI[p.id]; });
  });

  /* ── GUIDA «ORA TOCCA A TE» ──────────────────────────────────────────────────────────────────────────
     Per ogni passo del budget: l'elenco ordinato dei punti in cui l'allievo scrive, sceglie o preme.
     Il pannello fa BRILLARE il bordo del campo vero, mostra un fumetto («Scrivi 36000») e spiega a che cosa serve.
     campo = si scrive · scelta = si sceglie da un elenco · pulsante = si preme · leggi = si controlla (casella già compilata o tabella). */
  var G = {
    campo: function (sel, nome, valore, serve, x) { return Object.assign({t: 'campo', sel: sel, nome: nome, valore: valore, serve: serve}, x || {}); },
    scelta: function (sel, nome, valore, serve, x) { return Object.assign({t: 'scelta', sel: sel, nome: nome, valore: valore, serve: serve}, x || {}); },
    premi: function (sel, nome, serve, x) { return Object.assign({t: 'pulsante', sel: sel, nome: nome, serve: serve}, x || {}); },
    leggi: function (sel, nome, serve, x) { return Object.assign({t: 'leggi', sel: sel, nome: nome, serve: serve}, x || {}); },
    btn: function (pref, az) { return '[data-prefisso="' + pref + '"] [data-azione="' + az + '"]'; },
    cdc: function (c) { return function () { var q = document.getElementById('cdc'); return !!q && q.value === c; }; }
  };
  var NOMI_CDC = {'4100': 'Magazzino', '4200': 'Produzione', '4210': 'Taglio', '4220': 'Piegatura', '4230': 'Saldatura', '4300': 'Amministrazione'};
  var kpSalv = function (c, cl, v) { return function (h) { return circa((piano0(h, c) || {})[cl] || 0, v); }; };
  var kpPunti = [G.scelta('#ver', 'Versione', '0', 'La versione 0 è quella «operativa»: è dal piano 0 che il programma ricava le tariffe orarie. Le altre versioni servono solo per confronti.')];
  ['4210', '4220', '4230'].forEach(function (c) {
    var salv = kpSalv(c, '80', 36000);
    kpPunti.push(
      G.scelta('#cdc', 'Centro di costo', c, 'Il piano si scrive un reparto alla volta: ogni centro è un «cassetto» di costi. Ora apri il cassetto ' + c + ' ' + NOMI_CDC[c] + '.'),
      G.campo('#kp06-k80', '80 Salari e stipendi €/anno', '36000', 'Quanto pensi di spendere in un anno per i dipendenti del reparto ' + NOMI_CDC[c] + ': 3.000 € al mese × 12. È il costo che, diviso per le ore, darà il costo di un’ora di lavoro. Le altre classi restano a 0. Il programma l’ha già proposto: controlla che ci sia, altrimenti scrivilo.', {controlla: true}),
      G.premi(G.btn('kp06', 'kp06'), 'Salva il piano del centro', 'Memorizza il piano di ' + NOMI_CDC[c] + '. Finché non salvi, il numero scritto non conta: se cambi centro senza salvare lo perdi.'));
  });
  var fit = kpSalv('4200', '86', 12000), amm = kpSalv('4200', '50', 2900), ser = kpSalv('4200', '54', 3100);
  kpPunti.push(
    G.scelta('#cdc', 'Centro di costo', '4200', 'Ora il centro «Produzione»: contiene i costi comuni di tutto lo stabilimento (affitto, ammortamenti, energia), non di un solo reparto.', {fatto: function (h) { return fit(h) && amm(h) && ser(h); }}),
    G.campo('#kp06-k86', '86 Fitti passivi €/anno', '12000', 'L’affitto del capannone: 3.000 € a trimestre × 4. È un costo comune: più avanti verrà diviso fra i tre reparti.', {ctx: G.cdc('4200'), fatto: fit}),
    G.campo('#kp06-k50', '50 Ammortamenti €/anno', '2900', 'La quota annua di ammortamento delle macchine: taglierina 1.500 + piegatubi 800 + saldatrice 600. Non è un’uscita di cassa ma è un costo di competenza.', {ctx: G.cdc('4200'), fatto: amm}),
    G.campo('#kp06-k54', '54 Consulenze e servizi €/anno', '3100', 'Energia e manutenzioni dello stabilimento per tutto l’anno. Con l’affitto e gli ammortamenti fa 18.000 € di costi comuni.', {ctx: G.cdc('4200'), fatto: ser}),
    G.premi(G.btn('kp06', 'kp06'), 'Salva il piano del centro', 'Memorizza il piano di Produzione (18.000 €). I centri 4100 Magazzino e 4300 Amministrazione restano a 0: il loro costo non entra nel prodotto.', {fatto: function (h) { return fit(h) && amm(h) && ser(h); }}),
    G.leggi(null, 'Tabella del piano in fondo alla pagina', 'Controllo finale: 4210, 4220 e 4230 devono valere 36.000 ciascuno, 4200 18.000, totale 126.000. Se un numero non torna, scegli quel centro e correggilo.'));

  var STAT_B = function (h, c) { var b = bpc(h); return b && b.stato && b.stato['BUDGET|V1|' + c] ? b.stato['BUDGET|V1|' + c].stato : 'aperto'; };
  var bpcPunti = [];
  CDC6.forEach(function (c) {
    var fa = function (h) { var x = STAT_B(h, c); return x === 'inviato' || x === 'approvato'; };
    bpcPunti.push(
      G.scelta('#bpf-cdc', 'Centro', c, 'Ogni responsabile di centro invia il proprio budget: ora tocca a ' + c + ' ' + NOMI_CDC[c] + '.', {fatto: fa}),
      G.scelta('#bpf-azione', 'Azione', 'invia', 'Inviare = dire al controller «il mio budget è pronto». Da quel momento il centro è bloccato e non si può più modificare.', {fatto: fa}),
      G.premi(G.btn('bpf', 'bpf'), 'Esegui', 'Esegue l’invio del budget del centro ' + c + '.', {fatto: fa}));
  });
  CDC6.forEach(function (c) {
    var fa = function (h) { return STAT_B(h, c) === 'approvato'; };
    bpcPunti.push(
      G.scelta('#bpf-cdc', 'Centro', c, 'Ora il controller approva, un centro alla volta: tocca a ' + c + ' ' + NOMI_CDC[c] + '.', {fatto: fa}),
      G.scelta('#bpf-azione', 'Azione', 'approva', 'Approvare = il controller dice «ok, questo budget vale». Solo i budget approvati possono tornare nel gestionale.', {fatto: fa}),
      G.campo('#bpf-nota', 'Nota / motivo', 'ok', 'Il motivo resta nello storico del centro: chi ha deciso, quando e perché. Qui basta «ok».', {fatto: fa}),
      G.premi(G.btn('bpf', 'bpf'), 'Esegui', 'Registra l’approvazione del centro ' + c + '.', {fatto: fa}));
  });
  bpcPunti.push(
    G.campo('#retract-conferma', 'Per confermare scrivi TRASFERISCI', 'TRASFERISCI', 'Il ritrasferimento SOSTITUISCE il piano KP06 versione 0 con il budget approvato: è una conferma voluta, per questo bisogna scriverla.', {fatto: function (h) { var b = bpc(h); return !!b && (b.retract || []).length > 0; }}),
    G.premi(G.btn('retract', 'retract'), 'Ritrasferisci in S/4', 'Riporta nel gestionale i numeri approvati: da qui partono le tariffe.', {finale: true}));

  var epm = [G.scelta('#cat', 'Categoria', 'BUDGET', 'Il modulo contiene più «famiglie» di numeri: BUDGET = previsione, ACTUAL = realtà, FORECAST = previsione aggiornata. Oggi lavori sul budget.'),
    G.scelta('#ver', 'Versione', 'V1', 'Un budget può avere più versioni (V1, V2…): lavoriamo sulla V1.'),
    G.scelta('#cdc', 'Centro', '4200', 'L’energia è un costo comune dello stabilimento: sta nel centro 4200 Produzione.')];
  STAGIONE.forEach(function (v, k) {
    var mese = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'][k];
    epm.push(G.campo('#epm-m54_' + (k + 1), '54 Consulenze e servizi · ' + mese, String(v), k === 0 ? 'Energia e manutenzioni non costano uguale tutti i mesi: d’inverno si consuma di più. Compili la riga 54 mese per mese; il totale dell’anno deve restare 3.100 €.' : 'Stessa riga 54, mese di ' + mese.toLowerCase() + '. Il totale a destra deve arrivare a 3.100,00.', {fatto: function (h) { var b = bpc(h), r = b && b.dati && b.dati['BUDGET|V1|4200|54']; return !!r && circa(r[k], v); }}));
  });
  epm.push(G.premi(G.btn('epm', 'salva'), 'Salva nel modello', 'Scrive nel modello BPC i dodici importi. Se il centro 4200 è già approvato, il pulsante è nascosto correttamente: i dati già memorizzati si verificano automaticamente. Se sono diversi da quelli richiesti, vai in BPC → Approvazione e fai respingere il centro al controller prima di modificarlo.', {finale: true, fatto: function (h) {
    var b = bpc(h), r = b && b.dati && b.dati['BUDGET|V1|4200|54'];
    return !!r && STAGIONE.every(function (v, k) { return circa(r[k], v); });
  }}));

  var ckOk = function (mat) { return function (h) { return !!stima(h, mat); }; };
  var GUIDA = {
    'cpm-attivazione': [
      G.leggi('[data-prefisso="cpm-start"]', 'Riquadro «Passo 1 · Apri il piano CO 2026»', 'Prima di premere, leggi cosa crea il passo (sei centri di costo, i tipi di attività, il ciclo TR-STD) e cosa NON fa (nessuna scrittura contabile, nessun ordine).'),
      G.campo('#cpm-start-conferma', 'Per confermare scrivi ATTIVA', 'ATTIVA', 'È una conferma voluta: apri il piano del controllo di gestione solo se sei sicuro. Senza questa parola il programma non parte (è un’abitudine di sicurezza, come il «confermi?» prima di cancellare).', {fatto: function (h) { return attivo(h); }}),
      G.premi(G.btn('cpm-start', 'start'), 'Apri il piano CO', 'Crea i «cassetti» (centri di costo) in cui, nei passi dopo, scriverai i costi di ogni reparto.', {finale: true})],
    'cpm-budget': kpPunti,
    'cpm-paghe': [
      G.scelta('#pcp-versione', 'Versione di destinazione', '1', 'Le paghe vanno nella versione 1, che serve solo per CONFRONTO. NON scegliere la 0: sostituirebbe il tuo budget.'),
      G.premi(G.btn('pcp', 'pcp'), 'Trasferisci dalle paghe', 'Prende gli stipendi veri dei dipendenti e li mette accanto al budget, per vedere dove la previsione si discosta dalla realtà.', {fatto: function (h) { var m = modello(h); return !!(m && m.piano && m.piano['1'] && m.piano['1']['4100'] && m.piano['1']['4100']['80'] > 0); }}),
      G.leggi(null, 'Tabella di controllo del personale', 'Leggi le differenze: i reparti 4210/4220/4230 hanno piano 36.000 ma paghe 0 (il budget prevede personale da assumere), mentre 4100/4200/4300 hanno paghe e piano 0. Non si scrive niente.')],
    'cpm-kp26': [
      G.leggi('#kp26-Taglio_capacita', 'Taglio · capacità e ore pianificate', 'Capacità = ore che il reparto può lavorare in un anno. Ore pianificate = ore su cui dividerai i costi per avere il costo di un’ora. Per il Taglio sono già 1500 e 1500: controllale.'),
      G.leggi('#kp26-Piegatura_capacita', 'Piegatura · capacità e ore pianificate', 'Stesso controllo: 1500 e 1500. Le ore pianificate non possono superare la capacità.'),
      G.leggi('#kp26-Saldatura_capacita', 'Saldatura · capacità e ore pianificate', 'Stesso controllo: 1500 e 1500.'),
      G.premi(G.btn('kp26', 'kp26'), 'Salva le attività pianificate', 'Memorizza le ore dei tre reparti: sono il denominatore del costo orario (costo annuo ÷ ore).'),
      G.campo('#ltp-vol_TR-STD', 'TR-STD · pezzi/anno', '1200', 'Quante transenne pensi di fare nell’anno (1.200, non il lotto di 300 di un ordine). Servono a calcolare quanto saranno saturi i reparti.'),
      G.premi(G.btn('ltp', 'ltp'), 'Salva i volumi', 'Memorizza il volume annuo. Poi leggi la tabella: ore richieste 300 / 240 / 480 e saturazione 20% / 16% / 32%.', {finale: true})],
    'cpm-ciclo': [
      G.leggi('#ksu1-driver', 'Regola del ciclo', 'Scegli come dividere i costi comuni (18.000 €) fra i tre reparti: «Ore pianificate dei centri ricevitori». Più ore ha un reparto, più quota si prende. Qui è già impostata: controlla.'),
      G.premi(G.btn('ksu1', 'ksu1'), 'Salva il ciclo', 'Registra la regola: 18.000 € × 1.500 / 4.500 = 6.000 € a ciascun reparto. È una ripartizione solo del controllo di gestione, non muove la contabilità.', {finale: true})],
    'cpm-standard-tr': [
      G.scelta('#cpm-materiale', 'Prodotto da modificare', 'TR-STD', 'La ricetta si scrive un prodotto alla volta: prima la transenna TR-STD.'),
      G.scelta('#cpm-standard-componente', 'Componente', 'FERRO', 'Il materiale con cui è fatta la transenna.'),
      G.campo('#cpm-standard-quantita', 'Quantità componente per pezzo', '8', 'Quanti kg di ferro servono per UN pezzo: 8. Con il prezzo standard 0,95 €/kg dà 7,60 € di materiale.'),
      G.campo('#cpm-standard-Taglio', '4210 Taglio h/pz', '0,25', 'Ore di Taglio per UN pezzo: 0,25 h (15 minuti). Moltiplicate per 28 €/h danno 7 € di lavoro.'),
      G.campo('#cpm-standard-Piegatura', '4220 Piegatura h/pz', '0,20', 'Ore di Piegatura per UN pezzo: 0,20 h (12 minuti).'),
      G.campo('#cpm-standard-Saldatura', '4230 Saldatura h/pz', '0,40', 'Ore di Saldatura per UN pezzo: 0,40 h (24 minuti). In tutto 0,85 h per transenna.'),
      G.campo('#cpm-standard-attrezzaggio', 'Setup h/lotto', '0', 'Ore di attrezzaggio per preparare le macchine: in questo caso zero.'),
      G.premi(G.btn('cpm-standard', 'standard'), 'Salva distinta/ciclo versionati', 'Memorizza la ricetta: crea una nuova revisione del piano, che userà il costo orario per calcolare il costo del pezzo.', {finale: true})],
    'cpm-standard-halb': [
      G.scelta('#cpm-materiale', 'Prodotto da modificare', 'SL-TAGLIO', 'Ora la ricetta del kit tagliato (il semilavorato a scorta): solo ferro e taglio.'),
      G.scelta('#cpm-standard-componente', 'Componente', 'FERRO', 'Anche il kit è fatto di ferro.'),
      G.campo('#cpm-standard-quantita', 'Quantità componente per pezzo', '8', 'Kg di ferro per UN kit: 8.'),
      G.campo('#cpm-standard-Taglio', '4210 Taglio h/pz', '0,25', 'Il kit passa solo dal Taglio: 0,25 h.'),
      G.campo('#cpm-standard-Piegatura', '4220 Piegatura h/pz', '0', 'Il kit NON passa dalla Piegatura: zero. Lasciare 0 vuol dire «fase assente».'),
      G.campo('#cpm-standard-Saldatura', '4230 Saldatura h/pz', '0', 'Il kit NON passa dalla Saldatura: zero.'),
      G.premi(G.btn('cpm-standard', 'standard'), 'Salva distinta/ciclo versionati', 'Memorizza la ricetta del kit: 7,60 € di ferro + 7 € di taglio = 14,60 €.', {finale: true})],
    'bpc-modello': [
      G.campo('#bpc-crea-conferma', 'Per confermare scrivi CREA', 'CREA', 'Il modello BPC è il «foglio di budget» mensile. Si crea una volta sola, e per questo il programma chiede conferma.', {fatto: function (h) { var b = bpc(h); return !!b && !!b.dati; }}),
      G.premi(G.btn('bpc-crea', 'crea'), 'Crea il modello', 'Crea il modello con il budget annuo già diviso in 12 mesi uguali (3.000 al mese per i reparti, 1.000 di fitto). Nessuna scrittura contabile.', {finale: true})],
    'bpc-input': epm,
    'bpc-processo': bpcPunti,
    'cpm-kspi': [
      G.campo('#kspi-data', 'Data di esecuzione', '2026-12-01', 'La data dalla quale vale la tariffa oraria. Usa il primo giorno del periodo (01/12/2026): così vale per tutto dicembre.'),
      G.premi(G.btn('kspi', 'kspi'), 'Esegui il calcolo delle tariffe', 'Calcola quanto costa UN’ORA di ogni reparto: (36.000 personale + 6.000 costi comuni) ÷ 1.500 ore = 28 €/h. Senza questo passo CK11N non sa quanto vale un’ora.', {finale: true})],
    'cpm-tariffe': [G.leggi(null, 'Tabella delle tariffe', 'Qui non si scrive: controlla che ogni reparto abbia costi 42.000 €, ore 1.500 e tariffa 28 €/h. Poi 42.000 ÷ 1.500 con la calcolatrice: deve fare 28.')],
    'cpm-calcolo': [
      G.scelta('#ck-materiale', 'Materiale', 'TR-STD', 'Il prodotto di cui vuoi sapere il costo: la transenna.', {fatto: ckOk('TR-STD')}),
      G.campo('#ck-data', 'Data di calcolo', '2026-12-01', 'La data a cui calcoli il costo: 01/12/2026, inizio del periodo.', {fatto: ckOk('TR-STD')}),
      G.premi(G.btn('ck', 'ck'), 'Calcola', 'Mette insieme ricetta × costo orario + ferro: la transenna deve costare 31,40 €.', {fatto: ckOk('TR-STD')}),
      G.scelta('#ck-materiale', 'Materiale', 'SL-TAGLIO', 'Ora ripeti il calcolo per il kit tagliato.', {fatto: ckOk('SL-TAGLIO')}),
      G.premi(G.btn('ck', 'ck'), 'Calcola', 'Deve venire 14,60 € per kit (7,60 ferro + 7 taglio). Controlla la data: sempre 01/12/2026.', {fatto: ckOk('SL-TAGLIO')})],
    'cpm-rilascio': [
      G.campo('#cr-data', 'Data di rilascio', '2026-12-01', 'Il nuovo costo vale da questa data: deve essere l’inizio del periodo, prima di qualsiasi movimento di magazzino.'),
      G.premi(G.btn('cr', 'marca'), 'Marca tutte le stime calcolate', 'Prima si «marca» (segna) i costi calcolati che vuoi rendere ufficiali: è il controllo prima del rilascio.'),
      G.campo('#cr-sostituisciBootstrap', 'Solo primo CPM: scrivi SOSTITUISCI', 'SOSTITUISCI', 'Solo se il programma lo chiede (casella presente): è il consenso a sostituire i costi iniziali di costituzione con i nuovi. NON è un reset dell’azienda.'),
      G.premi(G.btn('cr', 'cr'), 'Rilascia', 'Rende UFFICIALI i costi standard: da qui ogni pezzo in magazzino vale 31,40 € (transenna) e 14,60 € (kit).', {finale: true})]
  };
  ['passiPreparazione', 'passiConsuntivo', 'passiRiconciliazione'].forEach(function (k) {
    (window.MSA_CPM_FORMAS[k] || []).forEach(function (p) { if (GUIDA[p.id]) p.punti = GUIDA[p.id]; });
  });
  GUIDA['cpm-centri-ricavi'] = [
    G.scelta('[data-pc-materiale="TR-STD"]','Linea transenne → PC-TR','PC-TR','Attribuisci le vendite della transenna alla responsabilità economica PC-TR: non al centro produttivo Taglio.'),
    G.scelta('[data-pc-materiale="SL-TAGLIO"]','Semilavorati → PC-SL','PC-SL','Assegna la linea semilavorati al proprio centro di profitto: serve per tenere distinto il margine della linea.'),
    G.scelta('#dim','Analizza per','profitCenter','Il report CO-PA confronta i ricavi netti e i costi del venduto per centro di profitto, senza creare ricavi aggiuntivi.'),
    G.leggi(null,'Margine di contribuzione per centro','Controlla in KE30 ricavi, rettifiche, costo del venduto, differenze ML e provvigioni; i costi amministrativi di periodo restano separati.')
  ];
  // Convalida didattica CPM: lo stato salvato, non il clic, decide il completamento.
  // La verifica usa le stesse fonti CO/BPC/CO-PC da cui leggono i report del simulatore.
  var validatori = {
    'cpm-attivazione': function(h){return attivo(h);},
    'cpm-budget': function(h){var m=modello(h);return !!m && ['4210','4220','4230','4200'].every(function(c){return !!(m.fattiPerCentro&&m.fattiPerCentro[c]);}) && ['4210','4220','4230'].every(function(c){return circa((piano0(h,c)||{})['80']||0,36000);}) &&
      ok4200(h);},
    'cpm-paghe': function(h){var m=modello(h);return !!(m && m.piano && m.piano['1'] && m.piano['1']['4100'] && m.piano['1']['4100']['80']>0);},
    'cpm-kp26': function(h){var m=modello(h);return !!m && ['Taglio','Piegatura','Saldatura'].every(function(c){return m.centri[c] && circa(m.centri[c].capacita,1500) && circa(m.centri[c].orePiano,1500);}) && circa(m.volumi['TR-STD'],1200) && !!(m.fatti && m.fatti.kp26 && m.fatti.ltp);},
    'cpm-ciclo': function(h){var m=modello(h);return !!(m && m.fatti && m.fatti.ksu && m.generale.driver==='ore' && circa(m.generale.produttivi,18000) && centri.every(function(c){return circa(m.centri[c].orePiano,1500);}));},
    'cpm-standard-tr': function(h){var m=modello(h),a=m && m.standard && m.standard['TR-STD'];return !!a && !!(m.fattiStandard&&m.fattiStandard['TR-STD']) && a.componente.mat==='FERRO' && circa(a.componente.q,8) && circa(a.ore.Taglio,0.25) && circa(a.ore.Piegatura,0.2) && circa(a.ore.Saldatura,0.4) && circa(a.attrezzaggio,0);},
    'cpm-standard-halb': function(h){var m=modello(h),a=m && m.standard && m.standard['SL-TAGLIO'];return !!a && !!(m.fattiStandard&&m.fattiStandard['SL-TAGLIO']) && a.componente.mat==='FERRO' && circa(a.componente.q,8) && circa(a.ore.Taglio,0.25) && circa(a.ore.Piegatura||0,0) && circa(a.ore.Saldatura||0,0) && circa(a.attrezzaggio,0);},
    'bpc-modello': function(h){var b=bpc(h);return !!(b && b.modello==='COSTI_CENTRI' && b.dati);},
    // Salvato nel modello, oppure già inviato/approvato con i 12 importi stagionali giusti (che non sono quelli
    // precompilati, piatti): in quel caso il pulsante «Salva» è nascosto e non si deve far respingere niente.
    'bpc-input': function(h){var b=bpc(h),a=b&&b.dati&&b.dati['BUDGET|V1|4200|54'],st=((b&&b.stato)||{})['BUDGET|V1|4200']||{};
      var registrato=!!(b&&b.inputSalvati&&b.inputSalvati['BUDGET|V1|4200'])||st.stato==='inviato'||st.stato==='approvato';
      return !!a && registrato && STAGIONE.every(function(v,i){return circa(a[i],v);});},
    'bpc-processo': function(h){var b=bpc(h);return !!b && CDC6.every(function(c){return ((b.stato||{})['BUDGET|V1|'+c]||{}).stato==='approvato';}) && (b.retract||[]).length>0;},
    'cpm-kspi': function(h){var m=modello(h);return !!(m&&m.kspi&&m.kspi.revisione===m.revisione) && centri.every(function(c){return circa(m.kspi.tariffe[c],28);});},
    'cpm-tariffe': function(h){var m=modello(h);return !!(m&&m.kspi&&m.kspi.revisione===m.revisione) && centri.every(function(c){return circa(m.kspi.tariffe[c],28);});},
    'cpm-calcolo': function(h){var m=modello(h),tr=stima(h,'TR-STD'),sl=stima(h,'SL-TAGLIO');return !!tr&&!!sl&&circa(tr.unitario,31.4)&&circa(sl.unitario,14.6)&&[tr,sl].every(function(x){var snap=x.elementi&&x.elementi.par&&x.elementi.par.snapshot;return !!snap&&!!m&&snap.revisione===m.revisione;});},
    'cpm-rilascio': function(h){var m=modello(h);return ['TR-STD','SL-TAGLIO'].every(function(c){var x=stima(h,c),snap=x&&x.elementi&&x.elementi.par&&x.elementi.par.snapshot;return !!x&&x.stato==='FR'&&!!snap&&!!m&&snap.revisione===m.revisione;});},
    'cpm-centri-ricavi': function(h){var pc=h.S.copaProfit&&h.S.copaProfit.materiale;return !!pc&&pc['TR-STD']==='PC-TR'&&pc['SL-TAGLIO']==='PC-SL';}
  };
  var verificaPulsanti = {
    'cpm-attivazione': [validatori['cpm-attivazione']],
    'cpm-paghe': [validatori['cpm-paghe']],
    'cpm-kp26': [function(h){var m=modello(h);return !!(m&&m.fatti&&m.fatti.kp26);},function(h){var m=modello(h);return !!(m&&m.fatti&&m.fatti.ltp)&&circa(m.volumi['TR-STD'],1200);}],
    'cpm-ciclo': [validatori['cpm-ciclo']],
    'cpm-standard-tr': [validatori['cpm-standard-tr']],
    'cpm-standard-halb': [validatori['cpm-standard-halb']],
    'bpc-modello': [validatori['bpc-modello']],
    'bpc-input': [validatori['bpc-input']],
    'bpc-processo': Array.from({length:13},function(_,i){if(i===12)return validatori['bpc-processo'];var c=CDC6[i%6],approva=i>=6;return function(h){var st=STAT_B(h,c);return approva?st==='approvato':st==='inviato'||st==='approvato';};}),
    'cpm-kspi': [validatori['cpm-kspi']],
    'cpm-calcolo': [function(h){var x=stima(h,'TR-STD');return !!x&&circa(x.unitario,31.4)&&!!(x.elementi&&x.elementi.par&&x.elementi.par.snapshot)&&x.elementi.par.snapshot.revisione===modello(h).revisione;},function(h){var x=stima(h,'SL-TAGLIO');return !!x&&circa(x.unitario,14.6)&&!!(x.elementi&&x.elementi.par&&x.elementi.par.snapshot)&&x.elementi.par.snapshot.revisione===modello(h).revisione;}],
    'cpm-rilascio': [function(h){return ['TR-STD','SL-TAGLIO'].every(function(c){var x=stima(h,c);return !!x&&(x.stato==='VO'||x.stato==='FR');});},validatori['cpm-rilascio']]
  };
  // Il budget salva più volte lo stesso modulo: ogni salvataggio è attribuito a un centro preciso.
  verificaPulsanti['cpm-budget']=['4210','4220','4230','4200'].map(function(c){return function(h){
    if(!(modello(h)&&modello(h).fattiPerCentro&&modello(h).fattiPerCentro[c]))return false;
    if(c==='4200')return ok4200(h);
    return circa((piano0(h,c)||{})['80']||0,36000);
  };});
  // Diagnosi punto per punto: che cosa manca per la spunta, letto dai dati salvati dell'allievo.
  var eur=function(v){v=Number(v||0);return v.toLocaleString('it-IT',{minimumFractionDigits:v%1?2:0,maximumFractionDigits:2});};
  var diagnosiStandard=function(h,soloCalcolo){
    var m=modello(h),out=[];
    var t=(m&&m.kspi&&m.kspi.tariffe)||{},tOk=centri.every(function(c){return circa(t[c],28);});
    out.push([tOk,'Costo di un’ora dei reparti = 28 €/h'+(tOk?'':' (ora: '+centri.map(function(c){return c+' '+eur(t[c]);}).join(', ')+') → il budget del passo 12 non è quello del caso: torna al passo 12 e guarda il suo riquadro «Che cosa manca»')]);
    [['TR-STD','Transenna',31.4],['SL-TAGLIO','Kit tagliato',14.6]].forEach(function(x){
      var s=stima(h,x[0]),snap=snapshot(h,x[0]),aggiornato=!!(s&&snap&&m&&snap.revisione===m.revisione);
      out.push([aggiornato&&circa(s.unitario,x[2]), x[0]+' ('+x[1]+'): calcolato con il budget di adesso = '+eur(x[2])+' €'+(aggiornato?'':' → va ricalcolato: riquadro a sinistra, Materiale «'+x[0]+'», data 01/12/2026, premi «Calcola»')]);
      if(soloCalcolo)return;
      var st=s&&s.stato;
      out.push([st==='VO'||st==='FR', x[0]+': marcato'+(st==='VO'||st==='FR'?'':' → riquadro a destra, premi il pulsante bianco «Marca tutte le stime calcolate»')]);
      out.push([st==='FR'&&aggiornato, x[0]+': rilasciato (stato FR)'+(st==='FR'&&aggiornato?'':' → data 01/12/2026, scrivi SOSTITUISCI, premi il pulsante blu «Rilascia»')]);
    });
    return out;
  };
  var diagnosi={
    'cpm-calcolo':function(h){return diagnosiStandard(h,true);},
    'cpm-rilascio':function(h){return diagnosiStandard(h,false);},
    'cpm-budget':function(h){
      var m=modello(h),out=[];
      out.push([attivo(h),'Piano CO 2026 aperto (passo precedente «apri il piano 2026»)']);
      var salvato=function(c){return !!(m&&m.fattiPerCentro&&m.fattiPerCentro[c]);};
      [['4210','Taglio'],['4220','Piegatura'],['4230','Saldatura']].forEach(function(x){
        var v=(piano0(h,x[0])||{})['80']||0;
        out.push([salvato(x[0])&&circa(v,36000),'Centro '+x[0]+' '+x[1]+': classe 80 Salari = 36.000'+(circa(v,36000)?'':' (ora c\u2019è '+eur(v)+')')+(salvato(x[0])?'':' → scegli il centro e premi «Salva il piano del centro»')]);
      });
      var p42=piano0(h,'4200')||{},tot42=Object.keys(p42).reduce(function(t,k){return t+(Number(p42[k])||0);},0);
      out.push([ok4200(h),'Centro 4200 Produzione: costi comuni 18.000 in tutto (fitto 12.000 + ammortamenti 2.900 + servizi 3.100)'+(ok4200(h)?'':' (ora in tutto '+eur(tot42)+')')]);
      out.push([salvato('4200'),'Centro 4200 Produzione salvato con «Salva il piano del centro»']);
      return out;
    }
  };
  ['passiPreparazione','passiConsuntivo','passiRiconciliazione'].forEach(function(k){
    (window.MSA_CPM_FORMAS[k]||[]).forEach(function(p){
      if(!validatori[p.id] || !GUIDA[p.id])return;
      p.cpmVerificato=true;
      p.fatto=validatori[p.id];
      if(diagnosi[p.id])p.diagnosi=diagnosi[p.id];
      var idx=0, checks=verificaPulsanti[p.id]||[];
      p.punti=GUIDA[p.id].map(function(d){
        var x=Object.assign({},d);
        if(x.t==='pulsante') {
          var verifica=checks[idx++];
          if(verifica){x.fatto=verifica;x.richiedeSalvataggio=true;}
        }
        return x;
      });
    });
  });
  // I passi di sola lettura sono confermati esplicitamente dall'allievo;
  // non vengono falsamente presentati come registrazioni automaticamente verificate.

})();
