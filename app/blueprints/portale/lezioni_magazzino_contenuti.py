"""Lezioni di Magazziniere 5.0 in MASTER SAP STYLE. Dati di esempio simulati, non SAP originale."""
LEZIONI = {
  "fondamenti": {
    "id": "fondamenti",
    "uf": "UF 10",
    "titolo": "Che cosa sono ERP, WMS e Magazzino 5.0",
    "teoria": "Un magazzino non è un insieme di scaffali indipendenti: collega fornitori, clienti e produzione. Nell'ERP si registrano le richieste e i documenti, nel WMS si gestiscono ubicazioni, pallet e attività fisiche. SD significa vendite, MM acquisti e movimentazioni, PP produzione. L'ordine cliente non scarica la merce. L'ordine fornitore non la carica. MIGO registra l'entrata; il putaway RF sposta fisicamente il pallet dal ricevimento allo scaffale senza creare altra giacenza.",
    "esempio": "Ferro & Transenne inizia con 200 TR-STD, 200 TR-ALTA e 300 TR-PED, mentre il ferro è a zero. La quantità fisica deve coincidere con la quantità del gestionale.",
    "operativo": "Apri il Launchpad e scegli il corso giusto; avvia il percorso logistico una sola volta; verifica i saldi iniziali e il messaggio di conferma.",
    "quiz": "Perché un ordine cliente non riduce automaticamente la giacenza?|Perché è una richiesta commerciale: l'uscita della merce è un movimento successivo."
  },
  "mappa": {
    "id": "mappa",
    "uf": "UF 10",
    "titolo": "Ubicazioni, pallet e mappatura del deposito",
    "teoria": "Un'ubicazione è un indirizzo. Nell'esempio 01-03-1, 01 è la corsia, 03 la campata e 1 il livello. L'articolo è diverso dall'ubicazione e dall'unità di carico (UdC), che identifica uno specifico pallet. Le aree speciali sono GR-ZONE (ricevimento), GI-ZONE (spedizione), Q-ZONE (quarantena), PSA-L1 (bordo linea) e le cataste ferro F-01/F-02. Una mappa precisa riduce i tempi di ricerca e gli errori. Quando una UdC si muove, il WMS deve conoscere la nuova posizione.",
    "esempio": "All'avvio di W100 ci sono 41 ubicazioni e 14 UdC: quattro pallet TR-STD, quattro TR-ALTA e sei TR-PED, ciascuno da 50 pezzi.",
    "operativo": "Entra in WMS → Struttura e attivazione; imposta 04/01/2027; attiva W100 una sola volta; apri Mappa; cerca TR-ALTA e leggi le quattro UdC.",
    "quiz": "Che differenza c'è tra TR-ALTA e 01-03-1?|TR-ALTA identifica il prodotto, 01-03-1 indica un luogo fisico."
  },
  "rf": {
    "id": "rf",
    "uf": "UF 10 / UF 11",
    "titolo": "Barcode, QR e pistola RF",
    "teoria": "Le etichette di ubicazione stanno sugli scaffali, quelle di UdC sui pallet. Barcode e QR permettono di identificare rapidamente ciò che l'operatore ha davanti. La pistola RF è una schermata di lavoro: la funzione Interroga legge i dati senza modificarli; la funzione Conferma compito registra un trasferimento, un prelievo o un carico. Si deve leggere prima origine, UdC, quantità e destinazione: una scansione sbagliata può generare un movimento sbagliato. Per i nuovi allievi, la regola è non confermare nulla finché non si è compreso il dato visualizzato.",
    "esempio": "In W100 interroga 01-03-1, poi un codice UdC reale letto dalla mappa, infine TR-PED: dovrebbero risultare sei pallet da 50 pezzi.",
    "operativo": "Apri WMS → Etichette barcode e QR; osserva un'etichetta di ubicazione e una UdC; entra in Pistola RF → Interroga; digita 01-03-1 e leggi il risultato.",
    "quiz": "Interroga RF modifica il magazzino?|No. La consultazione è differente da un compito confermato."
  },
  "ordini": {
    "id": "ordini",
    "uf": "UF 10",
    "titolo": "Ordini clienti e disponibilità (SD / VA01)",
    "teoria": "Il magazziniere deve capire da dove arrivano le richieste. L'ordine di vendita riporta cliente, articolo, quantità, data e riferimento. VA01 è la funzione didattica per inserirlo. ATP è il controllo della quantità promettibile: se un cliente richiede più pezzi di quelli disponibili, il sistema deve evidenziare la mancanza e collegarla a una decisione di approvvigionamento o produzione. Una riga d'ordine non è ancora un picking e non modifica il saldo fisico.",
    "esempio": "Beta chiede 350 TR-STD e il sistema parte con 200 TR-STD. La disponibilità iniziale è insufficiente, quindi servirà altra produzione.",
    "operativo": "Apri SD → Ordini cliente; seleziona C100 Beta Costruzioni; TR-STD; quantità 350; riferimento BETA-350; salva una sola volta; controlla ATP e numero documento.",
    "quiz": "Quando Beta ordina 350 pezzi, il magazzino perde subito 350 pezzi?|No, registra un impegno ma non un'uscita fisica."
  },
  "acquisti": {
    "id": "acquisti",
    "uf": "UF 8 / UF 10",
    "titolo": "Ordini fornitori, ricevimento MIGO e documenti MIRO",
    "teoria": "Quando mancano componenti la funzione acquisti emette un ordine fornitore. ME21N crea il documento, ma la merce è ancora in viaggio. Al ricevimento si confrontano ordine, DDT e quantità realmente arrivate: con MIGO si registra il carico, dopo il quale il WMS assegna i pallet all'area corretta. Se una parte è danneggiata deve restare bloccata in quarantena. MIRO rappresenta il documento fattura collegato all'ordine e al ricevimento; nel corso logistico serve a comprendere la tracciabilità e l'eventuale differenza di prezzo, non a gestire mutui o imposte.",
    "esempio": "Ferro & Transenne ordina 3.000 kg di ferro. L'ordine da solo non aumenta le scorte: l'aumento nasce all'entrata MIGO.",
    "operativo": "Apri MM → Ordini fornitori; usa ME21N e i valori del tutor; verifica il numero ordine; registra l'entrata MIGO; conferma putaway RF e l'eventuale quarantena; controlla la giacenza.",
    "quiz": "Perché MIGO e putaway non sono la stessa cosa?|MIGO registra il carico; putaway registra dove viene messa la merce già ricevuta."
  },
  "produzione": {
    "id": "produzione",
    "uf": "UF 10",
    "titolo": "Produzione: distinta, ordine, staging e consumi",
    "teoria": "Anche il magazziniere deve conoscere PP: la produzione consuma materiali e genera prodotti finiti. La distinta base indica quanto ferro serve; l'ordine CO01 pianifica il lotto; lo staging porta il materiale a bordo linea senza consumarlo; il movimento 261 registra il consumo; le conferme delle fasi dimostrano l'avanzamento; il versamento finale aumenta le giacenze di transenne. Confondere trasferimento e consumo può sottrarre due volte lo stesso materiale. Ogni documento va confrontato con quello precedente.",
    "esempio": "Un ordine di 300 TR-STD usa nel caso didattico 2.400 kg di ferro e attraversa Taglio, Piegatura e Saldatura.",
    "operativo": "Apri PP → Ordini produzione; controlla distinta e fabbisogno; usa RF per lo staging; registra il consumo 261 previsto; conferma le tre fasi; verifica il versamento a finito in WMS.",
    "quiz": "Lo staging è già il consumo dei materiali?|No, indica il trasferimento a bordo linea; il consumo è un movimento distinto."
  },
  "spedizioni": {
    "id": "spedizioni",
    "uf": "UF 10",
    "titolo": "Picking, packing, ondate, SSCC e DDT",
    "teoria": "Il picking preleva dalle ubicazioni il materiale destinato alla consegna. Un'ondata può raggruppare compiti relativi a più ordini per evitare percorsi inutili. Il packing compone i colli; l'SSCC è un codice univoco di 18 cifre per identificare ciascun pallet, non coincide con il numero ordine o consegna. Il carico RF verifica che il pallet giusto salga sul camion giusto. Il DDT descrive il materiale trasportato; l'uscita merci è distinta dalla preparazione. Il controllo finale confronta pezzi, colli, destinazione e trasporto.",
    "esempio": "Per Beta si imballano sette pallet da 50 TR-STD, ciascuno con un proprio SSCC.",
    "operativo": "Apri Spedizione → Consegne; crea e verifica il picking; usa RF per confermare; entra in Imballo e crea i colli; leggi gli SSCC; conferma il carico RF; verifica DDT e uscita.",
    "quiz": "Un SSCC identifica il cliente?|No, identifica precisamente il singolo collo o pallet."
  },
  "inventario": {
    "id": "inventario",
    "uf": "UF 9",
    "titolo": "Inventari fisici, contabili, conte cieche e rettifiche",
    "teoria": "L'inventario fisico conta ciò che è realmente sugli scaffali. L'inventario contabile di magazzino ricostruisce il saldo da carichi e scarichi. Le differenze si cercano con documenti, ubicazioni e riconta, non con un'aggiunta arbitraria di quantità. La conta cieca evita che l'operatore copi il saldo previsto. Il documento inventariale definisce cosa contare, la riconta verifica gli scostamenti e la rettifica autorizzata corregge il sistema. L'inventario ABC concentra la frequenza di controllo sugli articoli più rilevanti.",
    "esempio": "Se un'ubicazione contiene 12 kg meno del saldo registrato, si esegue una riconta e si ricerca la causa prima di confermare una differenza negativa.",
    "operativo": "Apri Inventario → Documento LI01N; avvia la conta; registra la quantità; effettua la riconta LI14 se richiesta; verifica la differenza; registra la rettifica una sola volta.",
    "quiz": "Perché la conta cieca è preferibile quando possibile?|Perché evita che la quantità prevista influenzi la misurazione reale."
  },
  "valori": {
    "id": "valori",
    "uf": "UF 8 / UF 9",
    "titolo": "Contabilità di magazzino: FIFO, LIFO, medio, standard",
    "teoria": "La contabilità DI magazzino non coincide con la contabilità generale: risponde a due domande, quanti materiali ci sono e quanto valgono. FIFO attribuisce agli scarichi prima i costi dei lotti più vecchi; LIFO, usato qui come confronto didattico, parte dai lotti più recenti; il costo medio ponderato utilizza il rapporto fra valore e quantità complessiva; il costo standard è prefissato e può differire dal prezzo effettivo. Questi metodi non cambiano il numero di pezzi: cambiano il costo associato ai movimenti e alla rimanenza. La corretta applicazione in bilancio dei diversi criteri dipende dai principi contabili vigenti.",
    "esempio": "Compro 100 kg a 1,00 € e 100 kg a 1,20 €. Escono 120 kg, restano 80. FIFO rimanenza 96 €; LIFO 80 €; costo medio 88 €. Nel simulatore il ferro può essere valorizzato allo standard di 0,95 €/kg: 438 kg valgono 416,10 €.",
    "operativo": "Apri Inventario → Valorizzazione; leggi quantità e costo del ferro; svolgi su carta il confronto tra due lotti; confronta FIFO, LIFO, medio e standard, senza creare una seconda fattura.",
    "quiz": "Perché con FIFO e LIFO il valore finale cambia pur con 80 kg in entrambi i casi?|Perché gli 80 kg residui sono attribuiti a lotti con costi unitari differenti."
  },
  "innovazione": {
    "id": "innovazione",
    "uf": "UF 11",
    "titolo": "Magazzino 5.0: RFID, slotting, KPI e automazione",
    "teoria": "Innovare non significa comprare macchine senza conoscere i problemi. Lo slotting sceglie le ubicazioni più adatte per ridurre gli spostamenti; un articolo molto richiesto dovrebbe essere facile da prelevare, compatibilmente con sicurezza e vincoli. L'RFID identifica via radio gli oggetti etichettati e consente controlli di passaggio ai varchi. Le ondate ottimizzano l'organizzazione del picking. I KPI trasformano le sensazioni in numeri: errori di prelievo, accuratezza inventariale, tempo medio, saturazione, giacenza e rotazione. Per dimostrare un miglioramento si misura una situazione iniziale, si interviene e si confrontano dati omogenei.",
    "esempio": "Un varco RFID deve segnalare eventuali colli non attesi sul camion. Uno slotting ben progettato può ridurre i metri percorsi senza cambiare la quantità in deposito.",
    "operativo": "Apri Innovazione → Slotting; leggi i suggerimenti; misura prima/dopo; prova il varco RFID sui colli previsti; apri KPI e annota tre indicatori da presentare al docente.",
    "quiz": "Qual è la prima cosa da fare prima di comprare un nuovo sistema RFID?|Misurare il processo attuale e identificare il problema che la tecnologia dovrebbe risolvere."
  },
  "qualita": {
    "id": "qualita",
    "uf": "UF 9 / UF 11",
    "titolo": "Resi, quarantena, tracciabilità e qualità",
    "teoria": "Il reso cliente non è una vendita al contrario senza controllo. La merce rientrata può essere integra, riparabile, danneggiata o da rottamare: ogni stato produce una destinazione fisica diversa. La quarantena impedisce il prelievo di materiale in attesa di verifica. Lotto, seriale o UdC aiutano a risalire al fornitore, alla produzione e alle spedizioni coinvolte. Il WMS deve distinguere giacenza libera, bloccata e in transito. La qualità dell'informazione è fondamentale quanto la quantità fisica.",
    "esempio": "Un pallet reso da Beta torna nell'area di controllo: non può diventare immediatamente disponibile per Gamma senza una valutazione.",
    "operativo": "Apri la funzione Resi; collega il documento originale; registra il rientro; verifica lo stato in WMS; conferma la destinazione prevista dal tutor.",
    "quiz": "Un reso rientrato è subito disponibile?|Non necessariamente: prima va verificata la sua condizione e lo stato autorizzato."
  }
}
PERCORSI = {
  "firenze": {
    "titolo": "Firenze · Innovazione digitale del magazzino · 30 ore",
    "descrizione": "Percorso sintetico e operativo, centrato sulla digitalizzazione; FIFO/LIFO solo a livello di valorizzazione di magazzino, niente partita doppia.",
    "esercizio": "firenze-30",
    "ordine": [
      "fondamenti",
      "mappa",
      "rf",
      "ordini",
      "acquisti",
      "produzione",
      "spedizioni",
      "inventario",
      "valori",
      "innovazione"
    ]
  },
  "pistoia": {
    "titolo": "Pistoia · Magazziniere 5.0 · UF 8, 9, 10, 11",
    "descrizione": "Percorso approfondito: contabilità di magazzino, inventari, sistemi informativi e innovazione, con esercitazioni complete.",
    "esercizio": "magazziniere-5",
    "ordine": [
      "fondamenti",
      "ordini",
      "acquisti",
      "produzione",
      "mappa",
      "rf",
      "spedizioni",
      "inventario",
      "valori",
      "qualita",
      "innovazione"
    ]
  }
}
