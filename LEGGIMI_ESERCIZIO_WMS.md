# Esercitazione Ragioneria con WMS — revisione 15/10/2026

## Per iniziare la lezione
1. Usare un account didattico senza documenti. Se c'è lavoro da conservare, scaricare il backup JSON e usare un account separato. Non azzerare e non caricare situazioni pronte.
2. Dal launchpad scegliere **Esercitazione ragioneria con WMS**. Il pannello si apre automaticamente a destra: un passaggio alla volta. Se è stato ridotto volontariamente, riaprirlo con **Esercizio**.
3. Seguire le date indicate: apertura 02/01/2027, operazioni a febbraio, pagamento fornitore e banca ad aprile.
4. La guida stampabile è nel launchpad e in `app/static/docs/Esercitazione_Ragioneria_con_WMS.pdf`.
5. Al termine: area allievo → Consegna → Sistema integrato → Ragioneria con WMS.

## Cosa cambia
Il WMS è attivo dall'apertura: ricevimento e messa a dimora del ferro, staging alla linea, consumo 261, entrata del prodotto 101, messa a dimora, picking, SSCC, carico, partenza 601, DDT e fattura. Gli spostamenti non duplicano le scritture contabili. Il percorso comprende incassi parziali, chiusura costi/ML, pagamento fornitore a scadenza e riconciliazione bancaria.

Il pannello riconosce l'operazione completata. Se questa genera documenti contabili, prima di mostrare il passo seguente propone **Ricostruisci la scrittura**: conti già indicati, scelta Dare/Avere e importo per ogni riga. Nessuna sezione o cifra è precompilata. Nell'esercizio WMS le scritture attese non vengono anticipate dal pannello prima dell'operazione. I controlli confrontano la risposta con il documento effettivamente registrato al centesimo, non soltanto con il pareggio.

Una fattura che genera anche una provvigione propone i documenti uno dopo l'altro. Dopo la risposta corretta premere **Prosegui con l'esercizio**. Dopo almeno un tentativo è disponibile **Mostra soluzione (con aiuto)**: il risultato è distinto da una risposta autonoma corretta. Durante la domanda frecce e selettore della guida sono sospesi; si può comunque consultare il giornale dalle normali schermate. Le risposte non generano mai nuove scritture.

Bozze, tentativi, aiuti ed esiti sono conservati nello stesso stato dell'azienda e inclusi nel backup JSON e nella fotografia di consegna. Il quiz riprende anche cambiando schermata. I documenti già presenti all'installazione non producono domande retroattive; eventuali domande in sospeso restano tali. Il confronto con il documento reale è un controllo didattico, non una certificazione della correttezza contabile del modello.

Spostamenti WMS senza scritture, operazioni non riuscite e compiti RF parziali non producono domande contabili. Per le sole letture e verifiche visive premere **Fatto**. Il pulsante **Apri** porta alla funzione richiesta; il pannello non cambia pagina al posto dell'allievo. Il PDF è una copia stampabile di supporto con risultati attesi, non il quiz interattivo.

La nuova guida è predefinita; dal launchpad resta selezionabile il precedente percorso integrato gennaio–dicembre. **Cambiare guida non cambia i dati**: tutti i moduli condividono un solo salvataggio. La preferenza della guida è ricordata nella sessione; un nuovo accesso può richiedere di riselezionarla.

Il vecchio esercizio classico è conservato, non convertito integralmente: questo scenario NON comprende cespiti, Ri.Ba., factoring, liquidazioni fiscali o chiusura annuale. Il ciclo produttivo è aggregato, non tre ordini separati per semilavorati. Il programma è didattico e non è SAP.

## Verifiche
Superata la suite completa `npm test`, incluse 48 verifiche specifiche del quiz, 298 controlli del ciclo attraverso pagine e pulsanti (ora comprendenti le domande sui documenti effettivi), 33 spunte automatiche della guida, 37 collegamenti e 18 indicatori di consegna. Verificati anche risposta errata in pareggio, importi italiani, più documenti, rientro pagina, bozza, aiuto, salvataggio fallito e assenza di doppie registrazioni. Prove automatiche in ambiente isolato, non sul sito pubblicato né su Windows; nessun collaudo visuale manuale in browser dichiarato. Nessun deploy effettuato.

Installazione e avvio: seguire il README esistente. Non sostituire database o cartelle dati durante l'aggiornamento. Prima di aggiornare un'installazione esistente salvare database, configurazione e backup JSON.
