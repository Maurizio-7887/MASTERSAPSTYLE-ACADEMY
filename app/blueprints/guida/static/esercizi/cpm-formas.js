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
        ['Barra in alto','Il ciclo di pianificazione: 1 anagrafiche → 2 KP06 → 3 KP26 → 4 ribaltamento → 5 KSPI → 6 CK11N/CK24 → 7 consuntivo. Il pallino giallo è la prossima cosa da fare']
      ],{attesa:'Piano CO 2026 aperto (versione 0, revisione 1). Nessuna scrittura FI, nessun ordine cliente o PP creato; gli ordini esistenti non cambiano.',nota:'I codici dei centri sono gli stessi delle paghe (PA30): i costi del personale registrati con le paghe arriveranno da soli sul loro centro.',fatto:attivo}),
      passo('cpm-budget','KP06: pianifica i costi annui dei centri (versione 0)',[
        ['Versione','0 · Piano/consuntivo (operativa)'],
        ['Centro 4210 Taglio','80 Salari e stipendi 36000; tutte le altre classi 0 → Salva il piano del centro'],
        ['Centro 4220 Piegatura','80 Salari e stipendi 36000 → Salva il piano del centro'],
        ['Centro 4230 Saldatura','80 Salari e stipendi 36000 → Salva il piano del centro'],
        ['Centro 4200 Produzione','86 Fitti passivi 12000 (capannone: 3.000 a trimestre) · 50 Ammortamenti 2900 (taglierina 1.500 + piegatubi 800 + saldatrice 600, quota annua a regime) · 54 Consulenze e servizi 3100 (energia e manutenzioni); 80, 81, 82, 83 a 0 → Salva il piano del centro'],
        ['Centri 4100 Magazzino e 4300 Amministrazione','Lasciali a 0 nella versione 0: in questo caso il loro costo non entra nel prodotto'],
        ['Controlla la tabella','Piano versione 0: 4210, 4220, 4230 36.000 ciascuno; 4200 18.000; totale 126.000']
      ],{dove:{ep:'erp_controllo.kp06'},percorso:'CO → Controllo di gestione → 2 · Pianificazione costi per centro',attesa:'Piano 126.000 € = 108.000 di personale dei reparti + 18.000 di costi comuni di stabilimento. È un piano annuo, non il costo di dicembre, e non registra niente in contabilità.',nota:'Ogni centro si salva da solo: scegli il centro in alto, scrivi gli importi annui, premi «Salva il piano del centro». Ogni salvataggio crea una nuova revisione del piano.',
        fatto:function(h){var m=modello(h);return attivo(h) && m.anno===2026 && centri.every(function(k){var c=m.centri[k];return c && circa(c.personale,36000) && circa(c.indiretti,0);}) && circa(piano0(h,'4200')['86'],12000) && circa(piano0(h,'4200')['50'],2900) && circa(piano0(h,'4200')['54'],3100) && circa(m.generale.produttivi,18000) && circa(m.generale.amministrativi,0);}}),
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
        ['4 · Ordini e WIP','Transenne: materiali 2.280 + attività 7.140 = 9.420 · kit HALB: 152 + 140 = 292 · versato a magazzino 9.712, WIP 0: ogni euro contato una volta']],
       attesa:'Le attività valorizzate (7.280) sono costo dei centri spostato sugli ordini, non un secondo costo del personale: compaiono nel riquadro 1 e nel 4, mai nel consuntivo del riquadro 2. A metà mese il residuo negativo è normale.',nota:'Residuo = consuntivo − attività assorbite = scostamento di spesa + scostamento di assorbimento; non è automaticamente inefficienza. Nel menu «Periodo» puoi scegliere il mese: il budget del periodo cambia con i mesi trascorsi. Il dettaglio delle righe del consuntivo è in Consuntivo dei centri (KSB1).'}
    ],
    passiRiconciliazione:[
      {id:'cpm-fonti-fine-mese',g:'14 · Controllo costi di fine mese',data:'31/12/2026',titolo:'KSB1: leggi i costi effettivi dei centri prima di interpretare i residui',dove:{ep:'erp_controllo.ksb1'},percorso:'CO → Controllo di gestione → Consuntivo dei centri (KSB1); poi 2 · Pianificazione costi per centro → Tabella di controllo; poi Piano/consuntivo e scostamenti',
       campi:[['Consuntivo automatico','Scegli il centro 4200: trovi la paga di Sara Bianchi (80, 81, 82 con origine «riga FI»), il fitto del rateo (86) e gli ammortamenti (50) con origine «OKB9». Nessun costo va riportato a mano'],
         ['Tabella di controllo del personale (KP06)','La colonna «Consuntivo registro paghe» ora contiene la paga di dicembre di ogni dipendente sul suo centro; Consumo % = consuntivo / piano'],
         ['Riattribuzione facoltativa (KB11N)','Se Sara Bianchi lavora tutta in saldatura puoi spostare il suo costo dal 4200 al 4230: data 31/12/2026, classe 80, importo della sua retribuzione → Registra la riattribuzione. Solo CO: il giornale non cambia'],
         ['Lettura del report','Residuo = consuntivo − assorbito = scostamento di spesa + scostamento di assorbimento. Efficienza confronta ore effettive e ore standard dei pezzi confermati. Report cumulativo dell’anno, non del solo mese'],
         ['Attenzione','Il piano è annuo e l’azienda ha lavorato solo dicembre: piano/12 è un confronto indicativo solo se dichiari che non c’è stagionalità']],
       attesa:'Il consuntivo dei centri coincide con le scritture FI dell’anno: paghe sul centro del dipendente, gli altri costi con la tabella OKB9. Nessuna scrittura aggiuntiva, il risultato FI del caso non cambia.',nota:'In S/4HANA FI e CO stanno nello stesso libro giornale (ACDOCA): per questo il consuntivo non si ricopia. Non concludere «inefficienza» dal solo residuo e non generare scritture FI di WIP.'}
      ,{id:'bpc-consuntivo',g:'14 · Controllo costi di fine mese',data:'31/12/2026',titolo:'BPC · carica il consuntivo di dicembre e crea il forecast 11+1',dove:{ep:'erp_bpc.modello'},percorso:'BPC → Pianificazione e budget → 1 · Modello e Data Manager; poi 4 · Budget, forecast e consuntivo',
       campi:[['Carica il consuntivo da S/4','Fino al mese 12 → Carica il consuntivo'],['Crea un forecast','Nome della versione F1 · Mesi a consuntivo 11 → Crea il forecast'],
         ['Leggi il report (fino a Dic, forecast F1)','Per ogni centro: budget dell’anno, consuntivo, forecast. Il forecast F1 = gennaio–novembre a consuntivo (zero: la società non esisteva) + dicembre a budget'],
         ['Centro 4200 a dicembre','Forecast F1 = budget di dicembre: 400 energia + 241,63 ammortamenti + 1.000 fitto = 1.641,63. Consuntivo 4.867,30 = paga di Sara Bianchi 2.437,50 + oneri 757,57 + TFR 180,56 + fitto del rateo 1.033,33 + ammortamenti di dicembre 458,34'],['Centri 4100 e 4300','Consuntivo 3.150,60 (Marco Rossi) e 4.002,65 (Giulia Verdi) contro forecast 0: il budget versione 0 non prevede personale su questi centri. È la stessa differenza della tabella di controllo del personale'],['Reparti 4210, 4220, 4230','Forecast 3.000 ciascuno (dicembre del budget), consuntivo 0: il personale dei reparti è ancora da assumere']],
       attesa:'Il consuntivo nel BPC è lo stesso del KSB1: viene dalle righe del libro giornale con il loro centro o con OKB9. Il forecast 11+1 mostra il costo atteso per il 2026 di un’azienda che ha lavorato solo a dicembre.',nota:'Il confronto giusto è dicembre con dicembre: il budget annuo contro un solo mese di consuntivo non dice niente. Il BPC non registra niente in contabilità.',
       fatto:function(h){var b=bpc(h);return !!b && b.actualFino===12 && b.versioni.FORECAST.indexOf('F1')>=0;}}
    ]
  };
})();