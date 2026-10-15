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

## Seconda parte (capitoli 10–16, maggio 2027 – gennaio 2028)
Dopo la consegna della prima parte la guida prosegue sugli stessi dati:
- **Cespiti** (FI → Cespiti): acquisto con fattura di una saldatrice (12.000, 10%) e di un carrello elevatore (8.000, 20%) da Macchine Alfa; registro AW01N; ammortamento AFAB pro rata per mesi; cessione del carrello a novembre con minusvalenza 566,67.
- **Fatture di servizi** (FI → Fatture di servizi, FB70) a Delta e Beta, trasmesse allo SdI.
- **Ri.Ba. salvo buon fine** (TES → Ri.Ba.): distinta con anticipo 80%, esito a buon fine a scadenza; insoluto disponibile.
- **Factoring** (TES → Factoring): cessione pro soluto con anticipo 90% e commissione 2%; pro solvendo disponibile.
- **IVA trimestrale** (FI → IVA, imposte, chiusura): liquidazioni T1 (a debito, F24 con interessi 1%), T2 (a credito, riporto), T4 (credito 110 riportato al 2028).
- **Ammortamento con doppio binario**: in bilancio pro rata per mesi; fiscalmente al massimo il coefficiente tabellare, ridotto alla metà nell'anno di entrata in funzione (art. 102 TUIR). L'eccedenza è una variazione in aumento che si recupera negli anni dopo o alla cessione.
- **IRES** 24%: 26.424,67 + 333,33 − 133,33 = 26.624,67 → 6.389,92. **IRAP** 3,9% sul valore della produzione (senza area finanziaria) 26.882,97 → 1.048,44. **Imposte anticipate** sulla differenza temporanea di 200: 55,80 (OIC 25). Utile netto 19.042,11.
- **Chiusura dell'esercizio 2027**: controlli, epilogo nel conto economico (90), utile 19.042,11 al conto 32, chiusura dei conti patrimoniali (91); dopo la chiusura non si registra più con data 2027.
- **Riapertura al 1° gennaio 2028** dallo Stato patrimoniale iniziale (92); destinazione dell'utile facoltativa.
Il pannello chiede di ricostruire tutte le scritture tranne epilogo, chiusura e riapertura (riporti meccanici). La consegna «Ragioneria con WMS — seconda parte» ha 14 numeri di controllo; quelli della prima parte restano giusti anche dopo la chiusura. La guida PDF copre ancora solo la prima parte.

Il ciclo produttivo è aggregato, non tre ordini separati per semilavorati. Il programma è didattico e non è SAP.

## Verifiche
Superata la suite completa `npm test`, incluse 48 verifiche specifiche del quiz, 298 controlli del ciclo attraverso pagine e pulsanti (ora comprendenti le domande sui documenti effettivi), 33 spunte automatiche della guida, 37 collegamenti e 18 indicatori di consegna. Verificati anche risposta errata in pareggio, importi italiani, più documenti, rientro pagina, bozza, aiuto, salvataggio fallito e assenza di doppie registrazioni. Prove automatiche in ambiente isolato, non sul sito pubblicato né su Windows; nessun collaudo visuale manuale in browser dichiarato. Nessun deploy effettuato.

Installazione e avvio: seguire il README esistente. Non sostituire database o cartelle dati durante l'aggiornamento. Prima di aggiornare un'installazione esistente salvare database, configurazione e backup JSON.
