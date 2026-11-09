"""Materiale avanzato per docenti e allievi, relativo al simulatore ERP Ferro & Transenne.
Le definizioni e gli esempi di software sono didattici; non sostituiscono norme o manuali SAP.
"""
TEORIA_PROFESSIONALE = {
  "fondamenti": {
    "ob": "Inquadrare l'architettura operativa di un ERP integrato con un WMS, distinguere documenti di processo, movimenti fisici e variazioni delle giacenze, interpretare il dato logistico come informazione controllata.",
    "sections": [
      [
        "Architettura funzionale e governo del dato",
        "Un sistema ERP integra processi che in molte aziende sono gestiti da reparti e documenti diversi. SD governa la domanda commerciale, MM l'approvvigionamento e i movimenti di materiali, PP l'esecuzione della produzione; il WMS organizza ubicazioni, unità di carico, code operative e conferme mediante terminali RF. L'integrazione non consiste nel mettere tutti gli archivi nello stesso computer, bensì nel mantenere relazioni verificabili fra ordine, materiale, quantità, luogo, data e responsabile. Nel simulatore le denominazioni delle transazioni sono ispirate a SAP, ma non implicano che il prodotto sia SAP originale."
      ],
      [
        "Principio di unicità del movimento",
        "Una medesima quantità di merce può attraversare stati differenti senza dover essere caricata più volte. L'ordine cliente produce fabbisogno; la consegna e l'uscita merci producono la diminuzione della giacenza. L'ordine fornitore produce una quantità attesa; l'entrata MIGO produce una quantità disponibile o bloccata; il successivo putaway ne cambia la posizione. Per un addetto al magazzino è essenziale sapere quali attività modificano le quantità e quali modificano solo indirizzo, destinazione o stato di disponibilità."
      ],
      [
        "Controllo interno e responsabilità",
        "Una transazione completa deve poter essere ricostruita a partire dal documento che l'ha originata. Numero documento, data, riferimento, articolo, quantità e stato formano un insieme di evidenze. Prima di ripetere un comando si controlla se il documento esista già. Un'operazione doppia non è semplicemente una svista: può produrre un errore di stock che si riflette su riordini, promesse ai clienti e piani produttivi. La regola professionale è identificare l'evento, registrarlo una volta e riconciliare gli effetti nei sistemi collegati."
      ],
      [
        "Applicazione in aula",
        "Mostrare il Launchpad e chiedere agli allievi di associare ogni operazione a SD, MM, PP oppure WMS. Aprire lo scenario logistico su un account nuovo, leggere le giacenze iniziali e spiegare perché i prodotti finiti possono essere già presenti prima del primo ordine della simulazione. Far annotare in un prospetto le quantità iniziali senza creare movimenti aggiuntivi."
      ]
    ],
    "kpi": "Coerenza giacenza ERP/WMS, percentuale movimenti con documento valido, numero di rettifiche non motivate.",
    "error": "Confondere documento commerciale, movimento fisico e movimento WMS; ripetere l'avvio o un carico già registrato."
  },
  "ordini": {
    "ob": "Gestire il collegamento fra domanda del cliente, disponibilità verificata, fabbisogno produttivo e promessa di consegna.",
    "sections": [
      [
        "Dal fabbisogno commerciale alla promessa",
        "L'ordine cliente è la formalizzazione di una richiesta: cliente, articolo, quantità, riferimento, data e termine richiesto. Nel simulatore la funzione VA01 crea il documento commerciale. Il controllo ATP confronta la richiesta con la disponibilità secondo le regole impostate; non va confuso con una conta fisica, né con l'uscita merci. Un ordine può essere valido anche quando la disponibilità immediata è insufficiente: è il segnale che il sistema deve coordinare approvvigionamento, produzione o nuova pianificazione."
      ],
      [
        "Priorità e impegni concorrenti",
        "La quantità libera sullo scaffale non è necessariamente interamente promettibile se esistono altri ordini già impegnati. In un flusso professionale occorre distinguere giacenza fisica, giacenza libera, prenotata, bloccata e quantità in produzione. La data richiesta dal cliente rappresenta un vincolo commerciale; il magazzino deve confrontarla con le date realistiche di disponibilità, preparazione e trasporto. Il rispetto della data promessa richiede dati affidabili sullo stato dei materiali."
      ],
      [
        "Tracciabilità del ciclo attivo",
        "Il numero ordine creato dal gestionale si collega alla consegna, al picking, al DDT e alla successiva fatturazione amministrativa. Nel corso del magazziniere la fattura viene osservata come documento di continuità, non come esercizio di fiscalità. Il magazziniere deve saper risalire dalla consegna all'ordine e identificare articolo, quantità e destinatario. Una consegna senza prelievo, oppure il prelievo di un articolo diverso da quello ordinato, richiede una verifica prima dell'uscita."
      ],
      [
        "Esercizio ragionato",
        "Beta richiede 350 TR-STD quando la giacenza iniziale è di 200. Lo scarto iniziale è di 150 pezzi. Chiedere agli allievi se l'ordine debba essere rifiutato, evaso parzialmente oppure completato attraverso la produzione. Registrare VA01 una volta, consultare la disponibilità e annotare il numero documento. Poi confrontare le esigenze di Delta e Gamma senza trattare ogni ordine come se fosse l'unico presente."
      ]
    ],
    "kpi": "Ordini consegnati puntualmente (OTIF), disponibilità promettibile, righe d'ordine senza differenze.",
    "error": "Interpretare ATP come scarico merce o promettere quantità bloccate e già assegnate."
  },
  "acquisti": {
    "ob": "Distinguere richiesta, ordine fornitore, ricevimento, ubicazione e fattura collegata; governare quantità e qualità delle materie prime.",
    "sections": [
      [
        "Ciclo passivo operativo",
        "Il bisogno di materiali deriva dal piano produttivo e dalle scorte disponibili. Con ME21N si crea l'ordine al fornitore, che descrive ciò che si attende, non ciò che è fisicamente presente. Il ricevimento è il momento in cui l'addetto confronta DDT del fornitore, materiale, quantità effettiva e stato dei colli. MIGO rappresenta il documento di entrata: l'operazione deve essere eseguita solo dopo l'accertamento del materiale ricevuto, secondo il flusso previsto dal sistema."
      ],
      [
        "Separazione delle disponibilità",
        "La merce può essere ricevuta e contemporaneamente non utilizzabile. Se parte del ferro è deformata o in attesa di ispezione, deve essere identificata e segregata nell'area di quarantena. Il WMS deve conservare il riferimento alla UdC e lo stato del materiale, impedendo che la quota bloccata sia proposta a una linea produttiva. La successiva messa a dimora sposta la merce buona dalla zona di ricevimento alle ubicazioni fisiche, senza eseguire un secondo carico contabile."
      ],
      [
        "Confronto documentale e differenze prezzo",
        "MIRO è il riferimento didattico al documento fattura del fornitore. L'importo fatturato può differire dal prezzo d'ordine; la differenza di prezzo è un problema di valorizzazione e riconciliazione del ciclo di acquisto, distinto dalla quantità effettivamente ricevuta. Un controllo a tre riferimenti confronta ordine, ricevuta e fattura. Gli allievi devono riconoscere che non si corregge una quantità fisica solo per rendere uguale un totale economico."
      ],
      [
        "Applicazione",
        "Per 3.000 kg di ferro l'allievo osserva l'ordine al prezzo didattico di 1,00 €/kg; il ricevimento individua 150 kg danneggiati. Registrare separatamente i fatti previsti dal tutor, verificare che la merce buona raggiunga la corretta ubicazione e che la parte danneggiata non risulti liberamente prelevabile. Osservare quindi la fattura a 1,02 €/kg e discutere come nascono le differenze rispetto al prezzo d'ordine."
      ]
    ],
    "kpi": "Accuratezza ricevimento, quantità bloccata per difetti, differenze ordine/ricevuta/fattura, tempo dock-to-stock.",
    "error": "Confondere ME21N con la ricezione, registrare due volte MIGO o trasferire materiale danneggiato nelle scorte libere."
  },
  "produzione": {
    "ob": "Comprendere la trasformazione delle materie prime attraverso le fasi produttive, il WIP, i consumi e il versamento del prodotto finito.",
    "sections": [
      [
        "Distinta base e ciclo produttivo",
        "La distinta base definisce quali materiali sono necessari per produrre un articolo. Il ciclo stabilisce le lavorazioni e le risorse coinvolte. CO01 genera l'ordine di produzione: è un'autorizzazione a pianificare e tracciare la lavorazione, non la prova che il prodotto sia già disponibile. Un magazzino integrato con PP deve rendere visibili i materiali necessari, le scorte utilizzabili e le ubicazioni dalle quali prelevarli."
      ],
      [
        "Staging e consumo: due eventi diversi",
        "Lo staging porta le materie prime a bordo linea, in un'area come PSA-L1, senza necessariamente considerarle già consumate. Il movimento 261 nel simulatore rappresenta il consumo attribuito all'ordine produttivo; è questo passaggio a collegare l'uso dei materiali alla produzione. Se l'operatore registra sia un prelievo fisico sia un consumo senza distinguere i due eventi, rischia di contabilizzare due diminuzioni della giacenza. Ogni fase deve essere riconosciuta dal proprio documento."
      ],
      [
        "Semilavorati e lavoro in corso",
        "Dopo il Taglio e prima della Piegatura esiste materiale in lavorazione: non è più semplice ferro disponibile, ma non è ancora una transenna finita pronta per una consegna. Il lavoro in corso, WIP, rappresenta questo stato intermedio. Il corso Magazziniere 5.0 segue le tre fasi attraverso le conferme di lavorazione e la tracciabilità dell'ordine; non introduce autonomamente un secondo ciclo HALB di semilavorati a scorta. La distinzione è importante perché il magazzino può gestire semilavorati reali con ubicazioni e movimenti specifici, ma non bisogna attribuire all'esercizio transazioni non previste."
      ],
      [
        "Versamento a finito e collegamento a SD",
        "Solo dopo il completamento previsto dalle conferme di produzione e dal relativo versamento si ottiene una giacenza di prodotti finiti. I pallet possono quindi essere identificati, trasferiti a scaffale e impiegati per gli ordini cliente. Il collegamento è circolare: la domanda SD genera fabbisogno, MM rende disponibili i componenti, PP li trasforma, WMS localizza i finiti e la spedizione li preleva. Ogni documento deve potersi riconciliare con le quantità delle fasi precedenti."
      ],
      [
        "Applicazione",
        "Nel caso Ferro & Transenne il tutor propone la produzione di 300 TR-STD con uno staging di 2.400 kg di ferro e le tre conferme Taglio, Piegatura e Saldatura. Far disegnare agli allievi una tabella a quattro colonne: fase, materiale fisicamente presente, materiale ancora utilizzabile e documento che certifica la transizione. Solo dopo completamento e versamento verificare i sei pallet di finiti da 50 pezzi."
      ]
    ],
    "kpi": "Accuratezza consumi per ordine, materiale in WIP, quantità versata a finito, errori di staging.",
    "error": "Considerare CO01 come produzione già eseguita; confondere trasferimento, consumo e versamento."
  },
  "mappa": {
    "ob": "Progettare e utilizzare indirizzi di deposito, unità di carico, aree funzionali e quadratura IM/WMS.",
    "sections": [
      [
        "Struttura fisica del deposito",
        "Un indirizzo di ubicazione è una coordinata stabile composta da corsia, campata e livello. Il codice 01-03-1 descrive dove si trova la merce, non che cosa contiene. L'articolo identifica il prodotto; la UdC identifica una specifica unità logistica, tipicamente un pallet. Le ubicazioni possono avere capacità e vincoli dimensionali. Una gestione corretta evita che un pallet occupi uno spazio inadatto o che un addetto cerchi merci in un luogo ormai vuoto."
      ],
      [
        "Aree di servizio e stato operativo",
        "La zona di ricevimento GR-ZONE, la spedizione GI-ZONE, la quarantena Q-ZONE e il bordo linea PSA-L1 hanno funzioni differenti. Lo stesso articolo può transitare fra aree senza che cambi la quantità complessiva posseduta dall'azienda. Ogni transizione deve essere giustificata da una missione o da un documento. Separare aree di servizio e scaffali ordinari consente di distinguere merci in attesa di controllo, in preparazione, in transito e immediatamente disponibili."
      ],
      [
        "Quadratura delle scorte",
        "La coerenza fra gestione quantità ERP e quantità distribuite nel WMS è un controllo fondamentale. Quando un carico crea nuova giacenza, occorre sapere dove essa sia fisicamente collocata. Quando una UdC cambia ubicazione, l'operazione non deve far crescere il saldo ERP. Le differenze possono dipendere da compiti non completati, errori di identificazione, movimenti non registrati oppure differenze inventariali. Il primo intervento corretto è ricostruire i documenti, non modificare arbitrariamente la giacenza."
      ],
      [
        "Applicazione",
        "Dopo l'attivazione di W100 verificare 41 ubicazioni e 14 UdC: quattro pallet TR-STD, quattro TR-ALTA e sei TR-PED. Cercare TR-ALTA e leggere per ogni pallet indirizzo, identificativo, quantità e stato. Ripetere la ricerca per ubicazione e per articolo per comprendere come cambia il punto di osservazione."
      ]
    ],
    "kpi": "Accuratezza delle ubicazioni, tempo medio di ricerca, occupazione posti pallet, quadratura IM/WMS.",
    "error": "Usare un codice articolo al posto di un indirizzo, o registrare come entrata un semplice spostamento."
  },
  "rf": {
    "ob": "Usare identificazione automatica e conferme RF per garantire tracciabilità e affidabilità dei movimenti.",
    "sections": [
      [
        "Identificazione e data capture",
        "Barcode e QR sono rappresentazioni leggibili con strumenti ottici; non producono da soli una giacenza né sostituiscono il documento che giustifica il movimento. L'etichetta della scaffalatura identifica un indirizzo; quella del pallet identifica una UdC, che può contenere articolo, lotto e quantità. La scansione riduce la trascrizione manuale, ma resta necessario verificare che il codice corrisponda alla posizione, al materiale e alla missione assegnata."
      ],
      [
        "Interrogazione e conferma",
        "La funzione RF Interroga recupera informazioni. È una lettura e non modifica i saldi. La funzione Compiti richiede invece di verificare origine, destinazione, UdC e quantità prima della conferma. In un flusso putaway, la conferma attesta che la merce sia stata posta nell'ubicazione proposta; in un flusso picking, attesta che sia stata prelevata. Un errore di destinazione può non alterare il totale ERP ma rendere impossibile trovare il pallet in deposito."
      ],
      [
        "Controlli e gestione degli errori",
        "La conferma deve essere eseguita una volta per ogni compito valido. In caso di rifiuto bisogna leggere il messaggio, verificare se il compito sia ancora aperto e controllare codici reali mostrati dal proprio account. Non si inventano UdC, lotti, numeri SSCC o documenti. I sistemi professionali adottano controlli su quantità, stato di blocco, ubicazioni e autorizzazioni; il simulatore propone un insieme di questi principi in chiave didattica."
      ],
      [
        "Applicazione",
        "Interrogare l'ubicazione 01-03-1, una UdC realmente presente e il codice TR-PED. Far descrivere ciò che cambia tra le tre ricerche. Successivamente eseguire un compito previsto dal tutor e verificare che il pallet abbia cambiato indirizzo senza generare una quantità aggiuntiva."
      ]
    ],
    "kpi": "Errori di scansione, compiti confermati correttamente, tempo per missione RF, movimenti senza tracciabilità.",
    "error": "Confondere lettura e conferma, inserire codici inventati o ripetere una missione già chiusa."
  },
  "spedizioni": {
    "ob": "Governare prelievo, consolidamento, identificazione dei colli, carico, documenti e consegna al destinatario.",
    "sections": [
      [
        "Dalla domanda alla missione di prelievo",
        "Una consegna è il documento logistico che indica ciò che deve essere preparato per un ordine cliente. Il picking localizza e preleva gli articoli richiesti; il FIFO operativo tende a favorire il prelievo delle unità di stock più vecchie quando le regole aziendali lo richiedono. Il WMS può raggruppare più consegne in un'ondata per ottimizzare percorsi e assegnare incarichi compatibili. L'operatore deve comunque verificare materiale, quantità e cliente."
      ],
      [
        "Imballo e identificazione univoca",
        "Il packing trasforma le quantità prelevate in colli fisici identificabili. L'SSCC è un identificatore seriale dell'unità logistica, normalmente rappresentato con 18 cifre; serve a distinguere i pallet anche quando contengono lo stesso articolo. Non è il numero dell'ordine, della consegna o del DDT. Se 350 transenne sono organizzate in pallet da 50, il numero atteso è 7 colli e ciascuno deve avere il proprio identificativo."
      ],
      [
        "Controllo del carico e documentazione",
        "Prima della partenza occorre verificare che gli SSCC caricati corrispondano a quelli previsti per trasporto e consegne. La scansione RF o il varco RFID possono supportare il controllo, ma la decisione finale si fonda sulla coerenza di articoli, quantità, colli e destinatario. Il DDT accompagna il trasferimento secondo il processo simulato. L'uscita merci rappresenta un evento diverso dalla sola preparazione: non va registrata se il carico non è completo e coerente."
      ],
      [
        "Indicatori e miglioramento",
        "L'accuratezza del picking misura quanti prelievi sono corretti rispetto a quelli effettuati. L'OTIF valuta consegne puntuali e complete. Gli errori di colli sono una causa diretta di reclami e ritorni; per individuarli bisogna riconciliare ordine, consegna, packing, carico e DDT. Un controllo tecnologico è utile se modifica realmente il tasso di errore, non solo perché adotta un lettore moderno."
      ],
      [
        "Applicazione",
        "Nel caso Beta sono previsti 7 pallet da 50 pezzi e per Delta 3. Preparare le due consegne, associare 10 SSCC distinti, verificare l'abbinamento al trasporto e confrontare il numero totale dei pallet caricati con il risultato atteso. Far spiegare cosa accadrebbe se un SSCC venisse letto due volte oppure sul camion sbagliato."
      ]
    ],
    "kpi": "Accuratezza picking, spedizioni OTIF, colli mancanti, errori al carico, tempo ordine-camion.",
    "error": "Scambiare SSCC con numero consegna, effettuare uscita prima del controllo carico, duplicare DDT."
  },
  "inventario": {
    "ob": "Condurre una procedura inventariale documentata, distinguere quantità attesa, conta fisica, scostamento e rettifica.",
    "sections": [
      [
        "Inventario fisico e logico",
        "La disponibilità che il sistema mostra è il risultato delle movimentazioni registrate. La conta fisica accerta invece quante unità sono effettivamente presenti. Quando le due grandezze non coincidono è necessario individuare articolo, ubicazione, UdC e differenza, evitando di nascondere l'errore con una compensazione generica. La contabilità di magazzino raccoglie i carichi e gli scarichi; l'inventario confronta questa ricostruzione con la realtà del deposito."
      ],
      [
        "Procedura e separazione delle responsabilità",
        "Il documento inventariale delimita quali posizioni contare e quando. La conta cieca non mostra preventivamente la quantità teorica all'operatore e riduce il rischio di adeguare la misura al numero atteso. La riconta interviene dove gli scostamenti richiedono conferma, eventualmente con un secondo addetto. La rettifica deve essere autorizzata e tracciabile; non sostituisce l'analisi delle cause, che possono includere prelievi non confermati, resi, scarti, trasferimenti o unità di misura non coerenti."
      ],
      [
        "Inventario rotativo e classificazione ABC",
        "L'inventario annuale verifica una situazione a una data. Le conte cicliche distribuiscono il controllo nel corso dell'anno e possono concentrarsi sugli articoli più critici o a più alta rotazione. L'analisi ABC classifica gli articoli in funzione del criterio adottato, per esempio valore di consumo. Articoli di classe A richiedono spesso un presidio più frequente, ma la frequenza dipende anche da rischio, criticità e caratteristiche del processo."
      ],
      [
        "Dalla quantità al valore",
        "Una differenza di -12 kg non significa automaticamente un valore economico uguale a -12 euro. Occorre applicare un criterio di valorizzazione delle scorte. Per questo la funzione inventariale dialoga con la contabilità di magazzino, pur non richiedendo al magazziniere di registrare mutui, stipendi o imposte. La rettifica deve avere un fondamento documentale e un responsabile."
      ],
      [
        "Applicazione",
        "Il tutor prevede LI01N per creare il documento, RF per la conta, LI14 per la riconta e LI20/LI21 per la chiusura e registrazione della differenza. Far annotare per F-01 e F-02 quantità teorica, quantità contata, differenza e motivazione, senza procedere alla rettifica finché non siano state eseguite le verifiche previste."
      ]
    ],
    "kpi": "Accuratezza inventariale, numero differenze per ubicazione, valore delle rettifiche, percentuale conte completate.",
    "error": "Correggere il saldo senza riconta, usare valori attesi nella conta cieca, modificare la quantità per far quadrare il report."
  },
  "valori": {
    "ob": "Calcolare e interpretare il valore delle rimanenze con FIFO, LIFO, costo medio e costo standard, distinguendo il calcolo didattico dalla disciplina di bilancio.",
    "sections": [
      [
        "La scheda di magazzino come documento di valore",
        "Il magazziniere deve distinguere la quantità disponibile dal costo attribuito alle quantità in giacenza. La scheda registra per ogni articolo giacenza iniziale, entrate, uscite, rettifiche e saldo finale. In un esercizio di valorizzazione si associano ai movimenti prezzi o costi unitari secondo il criterio richiesto; lo stesso saldo fisico può generare valori diversi se le entrate sono avvenute a prezzi differenti. Il valore delle scorte non si deduce dal prezzo di vendita al cliente."
      ],
      [
        "FIFO e LIFO: ipotesi di attribuzione dei costi",
        "FIFO attribuisce alle uscite prima i costi dei lotti più antichi, lasciando alla rimanenza i costi più recenti. LIFO, presentato nel corso come metodo di confronto teorico, attribuisce alle uscite prima i costi più recenti, lasciando alla rimanenza i costi più antichi. Non si deve confondere questo criterio economico con una regola fisica obbligatoria di prelievo: un'azienda può effettuare la movimentazione fisica secondo propri vincoli e attribuire i costi con regole contabili specifiche. La liceità del metodo ai fini del bilancio dipende dai principi contabili applicabili; il LIFO non è ammesso dagli IFRS."
      ],
      [
        "Costo medio ponderato e costo standard",
        "Il costo medio ponderato divide il costo complessivo delle quantità considerate per la quantità totale e attribuisce un valore medio omogeneo alle unità. Il costo standard utilizza invece un costo di riferimento predefinito, utile per controllo e confronto con gli effettivi; la differenza fra standard e prezzo effettivo può generare una varianza. Il criterio standard deve essere interpretato secondo le impostazioni del gestionale e non confuso con un prezzo realmente pagato."
      ],
      [
        "Esempio numerico integrale",
        "Lotto A: 100 kg a 1,00 euro = 100 euro. Lotto B: 100 kg a 1,20 euro = 120 euro. Sono disponibili 200 kg per 220 euro. Dopo un consumo di 120 kg rimangono 80 kg. Con FIFO il consumo utilizza 100 kg del lotto A e 20 del lotto B: rimanenza 80 kg a 1,20 euro = 96 euro. Con LIFO il consumo utilizza 100 kg del lotto B e 20 del lotto A: rimanenza 80 kg a 1,00 euro = 80 euro. Con costo medio 220/200 = 1,10 euro/kg, rimanenza 80 × 1,10 = 88 euro. Il numero di kg è identico nei tre casi."
      ],
      [
        "Applicazione nel simulatore",
        "La prova comprende una rimanenza di ferro di 438 kg e un costo standard didattico di 0,95 euro/kg: il valore teorico standard è 416,10 euro. Prima di compilare un prospetto, verificare quale quantità sia effettivamente registrata e se i movimenti siano tutti presenti. Non inventare un secondo acquisto per ottenere valori FIFO e LIFO differenti: il confronto a due lotti si può svolgere su carta come esercizio separato."
      ]
    ],
    "kpi": "Valore rimanenze, costo medio, differenze prezzo-standard, coerenza tra quantità e valore.",
    "error": "Confondere valore a magazzino e prezzo vendita, presentare LIFO come metodo universalmente consentito, variare quantità per modificare il valore."
  },
  "qualita": {
    "ob": "Gestire resi, quarantena, blocchi, identificazione delle non conformità e ricostruzione della filiera.",
    "sections": [
      [
        "Qualità e disponibilità delle scorte",
        "La quantità presente non è sempre una quantità utilizzabile. Una merce danneggiata o restituita può essere fisicamente in deposito ma bloccata in attesa di valutazione. Un WMS professionale distingue stati liberi, bloccati, in transito e in preparazione. La segregazione impedisce che un pallet non conforme sia proposto per un ordine cliente o per la linea di produzione."
      ],
      [
        "Processo di reso e gestione causale",
        "Un reso richiede il riferimento all'operazione originaria, una quantità verificata e una causale motivata. Dopo il ricevimento, il materiale deve essere controllato: può essere recuperabile, da riparare, da scartare o da rottamare. In nessun caso la mera presenza del collo equivale automaticamente al ripristino della sua disponibilità commerciale. Ogni cambio di stato deve lasciare traccia."
      ],
      [
        "Tracciabilità e richiamo",
        "Collegare identificativo della UdC, eventuale lotto, documento di entrata, ordine di produzione e spedizione permette di ricostruire la storia di un prodotto. In caso di difetto si deve individuare quali colli e clienti siano coinvolti. Una tracciabilità incompleta può causare un richiamo troppo esteso o, peggio, non individuare merce che avrebbe richiesto un controllo. La qualità del dato è quindi una parte della qualità del prodotto."
      ],
      [
        "Applicazione",
        "Il tutor descrive il reso di 10 transenne da Beta. Aprire il documento di rientro, verificare la quantità, spostare la UdC in area corretta, applicare il blocco e registrare l'esito della valutazione. Chiedere a un allievo di spiegare perché il sistema non deve proporre quelle transenne per un nuovo ordine prima della decisione sulla loro conformità."
      ]
    ],
    "kpi": "Resi per cliente, percentuale scarti, tempo di quarantena, completezza della tracciabilità.",
    "error": "Rimettere subito il reso nelle scorte libere o perdere il legame con la consegna originaria."
  },
  "innovazione": {
    "ob": "Valutare investimenti e miglioramenti digitali attraverso misure iniziali, benefici verificabili e rischi operativi.",
    "sections": [
      [
        "Innovazione orientata al processo",
        "Il concetto di Magazzino 5.0 non equivale a sostituire operatori con dispositivi più costosi. La digitalizzazione deve migliorare affidabilità dei dati, sicurezza, efficienza, tracciabilità e capacità di adattamento delle persone. Prima della tecnologia si definisce il problema: eccessivi metri percorsi per picking, errori di collo, tempi di ricerca, differenze inventariali o eccessive attese nei trasferimenti."
      ],
      [
        "Slotting e organizzazione dei flussi",
        "Lo slotting assegna ubicazioni agli articoli in base a frequenza di prelievo, volume, peso, compatibilità, rischi e capacità disponibile. Posizionare gli articoli molto movimentati in aree accessibili può ridurre gli spostamenti, ma non autorizza a superare i vincoli di portata e sicurezza. Il WMS può suggerire trasferimenti: solo la conferma RF documenta che la merce sia stata effettivamente spostata."
      ],
      [
        "RFID e gestione per eventi",
        "A differenza della lettura ottica che richiede il corretto inquadramento del codice, l'RFID può consentire l'identificazione tramite radiofrequenza nelle condizioni compatibili con lettori e tag. Un varco sul percorso di carico confronta gli identificativi letti con il trasporto previsto. L'utilità dipende dalla qualità dei dati: un tag non associato alla UdC giusta può automatizzare un errore anziché eliminarlo. Non bisogna considerare una lettura radio come prova infallibile in qualsiasi contesto."
      ],
      [
        "KPI e misurazione del miglioramento",
        "Un progetto professionale inizia con baseline, obiettivo, attività, responsabile e misurazione successiva. Se prima dello slotting un operatore percorre 2.000 metri al giorno e dopo ne percorre 1.500 in giornate confrontabili, la riduzione è del 25%. Questo dato va collegato al tempo, alla sicurezza e alla precisione di prelievo; un indicatore isolato non basta a dimostrare un beneficio aziendale. Ulteriori KPI sono accuratezza inventariale, righe di picking corrette, saturazione e puntualità delle consegne."
      ],
      [
        "Scelta tecnologica responsabile",
        "Per scegliere fra barcode, RF, RFID e automazione si devono valutare requisiti funzionali, investimento, manutenzione, competenze, integrazione con ERP/WMS e affidabilità operativa. La formazione degli addetti è parte del progetto: se un messaggio di errore non è interpretabile, una tecnologia corretta può comunque produrre scarti e tempi morti. Il docente può chiedere un mini business case con problema, KPI iniziale, soluzione, costo indicativo e verifica a distanza di un mese."
      ]
    ],
    "kpi": "Metri per riga prelevata, accuratezza picking, scansioni riuscite, tempi e costi di processo, sicurezza.",
    "error": "Comprare tecnologia senza baseline o ritenere RFID sufficiente anche se i codici logistici sono errati."
  }
}

# Lezione trasversale, esclusiva del percorso Firenze: i processi sono osservati
# dal punto di vista dell'innovazione e della continuità digitale dei dati.
TEORIA_PROFESSIONALE["flussi"] = {
 "ob": "Riconoscere le interfacce informative fra vendite, acquisti, produzione e WMS e capire quando un evento modifica disponibilità, ubicazione o stato di lavorazione.",
 "sections": [
  ["Dal cliente alla disponibilità","Nel modello integrato la richiesta del cliente entra in SD e genera un fabbisogno da confrontare con la disponibilità. La promessa non significa che il materiale sia già stato prelevato. MM pianifica e registra gli approvvigionamenti: ME21N descrive la merce ordinata, MIGO quella effettivamente ricevuta. Il WMS localizza le unità di carico senza duplicarne il saldo. La continuità informativa si realizza quando ogni documento può essere collegato a un evento precedente e a uno successivo."],
  ["Dalla materia prima ai prodotti finiti","PP collega i materiali all'ordine di produzione, prepara lo staging e riconosce il consumo effettivo. Taglio, Piegatura e Saldatura rappresentano le transizioni del lavoro in corso (WIP). Solo al versamento finale la merce entra nella disponibilità dei prodotti finiti. Il WMS assegna i pallet a ubicazioni, il picking li destina a una consegna e la scansione in uscita verifica l'identità dei colli. Nessuna di queste transizioni deve essere ricostruita con un nuovo carico fittizio."],
  ["Che cosa rende digitale il ciclo","La tecnologia non è soltanto la presenza di un lettore RF: è la capacità di mantenere coerenti identità, quantità, tempo, luogo e stato lungo tutti i passaggi. Il docente mostri una singola transenna dalla domanda iniziale all'SSCC del pallet spedito e chieda quale dato permetta di ricostruire ogni collegamento. Le anomalie, come una UdC inesistente o un carico duplicato, rivelano perché la qualità del dato viene prima dell'automazione."]
 ],
 "kpi":"Coerenza documentale tra SD/MM/PP/WMS, tempo ciclo ordine-consegna, errori di movimentazione e tracciabilità.",
 "error":"Trattare come eventi indipendenti i movimenti dello stesso prodotto oppure ripetere un carico perché non si ritrova un pallet."
}
