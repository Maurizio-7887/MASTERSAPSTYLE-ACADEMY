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
      passo('cpm-kspi','KSPI: calcola le tariffe orarie dei reparti',[
        ['Prima','Controlla che il pallino giallo della barra sia sul passo 5: KP06, KP26, ciclo e distinte/cicli sono salvati'],
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
      {id:'cpm-attivita',g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'Confronta budget, attività assorbite e WIP senza duplicazioni',dove:{ep:'erp_controllo.report'},percorso:'CO → Controllo di gestione → Piano/consuntivo e scostamenti; poi Consuntivo dei centri (KSB1)',
       campi:[['Taglio','75 h transenne + 5 h kit = 80 h × 28 = 2.240'],['Piegatura','60 h × 28 = 1.680'],['Saldatura','120 h × 28 = 3.360'],['Totale attività','260 h e 7.280, coincidenti con le conferme D72/A75 dei due ordini (KSB1, classe 944000)'],['Piano annuale / consuntivo ordini','Ore annuali 300/240/480 contro ore effettivamente dichiarate 80/60/120; il budget non rappresenta produzione già avvenuta'],['Costi primari','Arrivano da soli dalla contabilità: a metà dicembre ci sono solo i costi già registrati (per esempio nessuna paga). Zero non significa personale gratuito: la paga di dicembre non è ancora registrata']],
       attesa:'Le attività valorizzate sono costi attribuiti agli ordini, non un secondo costo del personale. Le ore coincidono con lo standard dei pezzi confermati: varianza di efficienza zero in questo caso.',nota:'Residuo centro = costi primari effettivi più costi comuni effettivi ribaltati meno attività assorbite: non equivale automaticamente a inefficienza. Gli output dei due ordini sono 9.420 + 292 = 9.712; WIP analitico residuo zero dopo i 101, senza capitalizzazione FI automatica.'}
    ],
    passiRiconciliazione:[
      {id:'cpm-fonti-fine-mese',g:'14 · Controllo costi di fine mese',data:'31/12/2026',titolo:'KSB1: leggi i costi effettivi dei centri prima di interpretare i residui',dove:{ep:'erp_controllo.ksb1'},percorso:'CO → Controllo di gestione → Consuntivo dei centri (KSB1); poi 2 · Pianificazione costi per centro → Tabella di controllo; poi Piano/consuntivo e scostamenti',
       campi:[['Consuntivo automatico','Scegli il centro 4200: trovi la paga di Sara Bianchi (80, 81, 82 con origine «riga FI»), il fitto del rateo (86) e gli ammortamenti (50) con origine «OKB9». Nessun costo va riportato a mano'],
         ['Tabella di controllo del personale (KP06)','La colonna «Consuntivo registro paghe» ora contiene la paga di dicembre di ogni dipendente sul suo centro; Consumo % = consuntivo / piano'],
         ['Riattribuzione facoltativa (KB11N)','Se Sara Bianchi lavora tutta in saldatura puoi spostare il suo costo dal 4200 al 4230: data 31/12/2026, classe 80, importo della sua retribuzione → Registra la riattribuzione. Solo CO: il giornale non cambia'],
         ['Lettura del report','Residuo = consuntivo − assorbito = scostamento di spesa + scostamento di assorbimento. Efficienza confronta ore effettive e ore standard dei pezzi confermati. Report cumulativo dell’anno, non del solo mese'],
         ['Attenzione','Il piano è annuo e l’azienda ha lavorato solo dicembre: piano/12 è un confronto indicativo solo se dichiari che non c’è stagionalità']],
       attesa:'Il consuntivo dei centri coincide con le scritture FI dell’anno: paghe sul centro del dipendente, gli altri costi con la tabella OKB9. Nessuna scrittura aggiuntiva, il risultato FI del caso non cambia.',nota:'In S/4HANA FI e CO stanno nello stesso libro giornale (ACDOCA): per questo il consuntivo non si ricopia. Non concludere «inefficienza» dal solo residuo e non generare scritture FI di WIP.'}
    ]
  };
})();