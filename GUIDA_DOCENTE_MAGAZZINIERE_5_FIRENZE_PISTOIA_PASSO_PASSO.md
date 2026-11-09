# MASTER SAP STYLE — GUIDA DOCENTE MAGAZZINIERE 5.0
## Manuale operativo passo per passo per Firenze (30 ore) e Pistoia (percorso completo)
**Aggiornamento 9 novembre 2026.** Scenario didattico: Ferro & Transenne S.r.l., gennaio 2027.

> **IMPORTANTISSIMO**: questa guida riguarda SOLO il simulatore in **MASTER SAP STYLE**. **MasterSupplyChain Academy** resta un corso autonomo e non va confuso con questo esercizio.

### Scelta della lezione
- **Firenze, corso innovazione digitale 30 ore:** dal Launchpad scegli **«🚀 FIRENZE · Innovazione digitale nel magazzino · 30 ore»**. Tutor dedicato, **81 attività**, ricostruzione scritture **NO**. Si osservano comunque scorte, valorizzazione FIFO/LIFO/costo medio, inventari e tutti i documenti operativi.
- **Pistoia, corso completo:** scegli **«📦 Magazziniere 5.0: un mese di magazzino»**. Tutor completo, **82 attività**, ricostruzione scritture **SI** se prevista per l'allievo. L'esercizio copre magazzino, contabilità **di magazzino**, inventari, WMS, integrazione SD/MM/PP e innovazione.
- **Non invertire le classi nello stesso account**: il motore ERP conserva i dati dell'azienda simulata per account, anche se la guida cambia. Usa un account nuovo per ogni studente.
- La corrispondenza formale «UFC 7, 8 e 9» di Pistoia NON è verificata nei file: la guida interna etichetta UF 8–11. Prima di presentare gli obiettivi ufficiali, confrontarli con il programma dell'ente.

### Cinque domande che il tutor deve sempre risolvere
1. **Dove vado?** Indicare il nome esatto del menu e, se disponibile, premere **«Apri ➜»** nel tutor.
2. **Cosa faccio adesso?** Spiegare un campo o un pulsante alla volta, con il valore da inserire.
3. **Perché?** Collegare il dato al lavoro del magazziniere e al movimento precedente/successivo.
4. **Come capisco di aver finito?** Descrivere documento, giacenza, ubicazione e spunta attesa.
5. **Se non funziona?** Non ripetere una transazione che potrebbe essere già registrata; controllare documento e messaggio prima di chiedere al docente.

### Accesso prima di tutto (da leggere ad alta voce)
1. Entra nel **portale MASTER SAP STYLE** con il tuo utente e la tua password.
2. Apri **«Entra nel sistema integrato»**.
3. Nel **Launchpad**, individua la tessera **Firenze 30 ore** oppure **Magazziniere 5.0**, secondo la classe.
4. Trova il tutor **«Esercizio passo passo»**. Lascia acceso il suggeritore giallo **«ORA TOCCA A TE»**.
5. Se il tutor ti mostra **«Apri ➜»**, clicca lì per aprire la funzione corretta. Non navigare a tentativi.
6. Completa un campo alla volta. Quando vedi il messaggio di salvataggio, aspetta la **✓**.
7. Se il passo è una lettura senza registrazione, controlla davvero la schermata e poi premi **«✓ Fatto»**.
8. **Non fare mai «Azzera»**, non creare due volte lo stesso documento e non premere «Avanti» finché manca la spunta.

### Regola fondamentale per l'aula
**Ordine cliente** = richiesta; non scarica merci. **Ordine fornitore** = merce in arrivo; non carica scorte. **MIGO** = entrata fisica e movimento di magazzino. **RF/putaway** = mette la merce nell'ubicazione, senza crearla due volte. **Ordine di produzione** = pianifica; prelievi e conferme movimentano i materiali. **Picking e uscita merci** = preparano e fanno uscire la merce. **Inventario e valorizzazione** = confronto fisico/contabile e valore delle rimanenze.

---

## ISTRUZIONI DI OGNI PASSAGGIO
**Legenda:** i numeri sono quelli della guida completa **Pistoia (82 passaggi)**. Firenze segue lo stesso ordine, ma **non presenta il passaggio n. 80, «Libro giornale»**; i passi successivi nel tutor Firenze scalano di uno. Le date indicate sono quelle della simulazione, non quelle delle lezioni.

### Passaggio 1 — Avvia il percorso logistico
**Dove entrare:** Launchpad → Avvio e dati di base → Nuova azienda / Avvio → scheda «Percorso logistico · Magazziniere 5.0». Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 04/01/2027.
**Cosa fare, lentamente:**
1. Seleziona la tessera del corso corretta nel Launchpad.
2. Non creare una nuova azienda con costituzione: usa «Percorso logistico · Magazziniere 5.0».
3. Data dello scenario: 04/01/2027. Firenze: scritture NO; Pistoia: SI, se previsto dal docente.
4. Premi «Avvia il percorso logistico» UNA SOLA VOLTA.
5. Scorte iniziali: TR-STD 200, TR-ALTA 200, TR-PED 300, FERRO 0. Non premere Azzera.
**Perché:** COSA IMPARI: Avvia il percorso logistico. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Saldi di apertura (561): D 10 Banca 50.000 + D 13 Prodotti finiti 22.785 / A 30 Capitale 72.785. A scaffale contabile: 200 TR-STD × 31,40 = 6.280; 200 TR-ALTA × 36,94 = 7.388; 300 TR-PED × 30,39 = 9.117. Ferro: zero.
**Attenzione:** Il magazzino ha un valore: quantità × costo standard. Il conto 13 è la «fotografia in euro» di quello che c’è sugli scaffali.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 2 — Attiva il magazzino a ubicazioni W100
**Dove entrare:** WMS → Struttura e attivazione. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 04/01/2027.
**Cosa fare, lentamente:**
1. Apri il modulo WMS → Struttura e attivazione.
2. Scrivi 04/01/2027.
3. Premi «Attiva il magazzino W100» UNA SOLA VOLTA.
4. Conferma 41 ubicazioni e 14 UdC: 4 pallet TR-STD, 4 TR-ALTA, 6 TR-PED. Non si caricano nuove scorte.
**Perché:** COSA IMPARI: Attiva il magazzino a ubicazioni W100. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 41 ubicazioni; le giacenze esistenti diventano 14 unità di carico (UdC) da 50 pezzi: 4 pallet TR-STD, 4 TR-ALTA, 6 TR-PED negli scaffali delle corsie 01 e 02. Nessuna scrittura: cambia solo il «dove», non il «quanto».
**Attenzione:** Gestione delle scorte (IM): quanti pezzi e quanti euro. WMS: in quale ubicazione e su quale UdC. Le due viste devono sempre quadrare.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 3 — Leggi la mappa: corsie, ubicazioni, aree di servizio
**Dove entrare:** WMS → Mappa delle ubicazioni. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Apri «WMS → Mappa delle ubicazioni».
2. Leggi i codici: 01-03-1 = corsia 01, campata 03, livello 1.
3. Clicca un'ubicazione e leggi articolo, quantità e UdC.
4. Distingui GR-ZONE (ricevimento), GI-ZONE (spedizione), Q-ZONE (quarantena), PSA-L1 (bordo linea).
5. Questo è controllo di lettura: premi «✓ Fatto» solo dopo aver verificato.
**Perché:** COSA IMPARI: Leggi la mappa: corsie, ubicazioni, aree di servizio. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Lettura: spunta a mano con «Fatto». Il codice dell’ubicazione è un indirizzo: chi lo legge sa dove andare senza chiedere.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 4 — Dove si trova? Cerca le TR-ALTA
**Dove entrare:** WMS → Mappa delle ubicazioni → menu «🔎 Dove si trova?» in alto. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Apri la ricerca «🔎 Dove si trova?» nella mappa.
2. Seleziona TR-ALTA.
3. Devi trovare 4 pallet da 50 pezzi = 200 disponibili.
4. Leggi e annota i codici UdC REALI; non inventarli.
5. Dopo la verifica premi «✓ Fatto».
**Perché:** COSA IMPARI: Dove si trova? Cerca le TR-ALTA. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Risultato da controllare:** 4 pallet da 50 TR-ALTA, tutti ✅ «LIBERA a scaffale». In alto: 200 libere da prelevare = 200 nelle ubicazioni = 200 in contabilità; 0 bloccate.
**Attenzione:** Lettura: spunta a mano. È la domanda che il magazziniere si fa ogni giorno: «dove prendo questo articolo?». Il sistema mette prima le ubicazioni da cui si può prelevare.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 5 — Stampa le etichette di un’ubicazione e di una UdC
**Dove entrare:** WMS → Etichette barcode e QR. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Apri WMS → Etichette barcode e QR.
2. Scegli un'etichetta ubicazione (es. 01-03-1).
3. Scegli una UdC reale dalla mappa.
4. Confronta il codice ubicazione con il codice pallet, che sono diversi.
5. Stampa o salva la prova; poi premi «✓ Fatto».
**Perché:** COSA IMPARI: Stampa le etichette di un’ubicazione e di una UdC. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Lettura: spunta a mano. Etichetta dell’ubicazione sullo scaffale, etichetta della UdC sul pallet: la pistola legge entrambe.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 6 — RF Interroga: che cosa c’è in 01-03-1?
**Dove entrare:** WMS → Pistola RF → scheda 🔎 Interroga. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Apri WMS → Pistola RF → «🔎 Interroga».
2. Digita 01-03-1 e premi Invio; leggi il contenuto.
3. Interroga una UdC realmente presente sulla mappa.
4. Digita TR-PED: devono risultare 6 pallet da 50 pezzi.
5. Non stai muovendo merci: dopo la lettura premi «✓ Fatto».
**Perché:** COSA IMPARI: RF Interroga: che cosa c’è in 01-03-1?. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Risultato da controllare:** Materiale, quantità e UdC dell’ubicazione. Con il codice articolo la pistola elenca tutte le ubicazioni delle TR-PED (6 pallet). Interrogare non cambia nulla.
**Attenzione:** Lettura: spunta a mano.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 7 — VA01: Beta ordina 350 TR-STD
**Dove entrare:** SD → Ordini cliente. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 05/01/2027.
**Cosa fare, lentamente:**
1. Apri SD → Ordini cliente (VA01).
2. Committente: C100 Beta Costruzioni.
3. Materiale: TR-STD; quantità 350.
4. Riferimento BETA-350; ordine 05/01/2027; consegna richiesta 15/01/2027.
5. Salva una sola volta. Disponibilità iniziale: 200 su 350. Un ordine NON scarica il magazzino.
**Perché:** COSA IMPARI: VA01: Beta ordina 350 TR-STD. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Ordine 10000001. Disponibilità (ATP): a scaffale ci sono solo 200 TR-STD → confermabili 200 su 350 (semaforo giallo). Nessuna scrittura: un ordine non muove merce.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 8 — VA01: Delta ordina 150 TR-ALTA
**Dove entrare:** SD → Ordini cliente. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 05/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Committente» e inserisci o verifica: **C200 Delta Noleggi**.
2. Cerca «Materiale» e inserisci o verifica: **TR-ALTA**.
3. Cerca «Quantità» e inserisci o verifica: **150**.
4. Cerca «Riferimento cliente» e inserisci o verifica: **DELTA-150**.
5. Cerca «Data» e inserisci o verifica: **05/01/2027**.
6. Cerca «Data di consegna richiesta» e inserisci o verifica: **15/01/2027**.
**Perché:** COSA IMPARI: VA01: Delta ordina 150 TR-ALTA. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Ordine 10000002: 150 su 200 disponibili, semaforo verde.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 9 — VA01: il Comune di Gamma ordina 150 TR-STD
**Dove entrare:** SD → Ordini cliente. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 05/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Committente» e inserisci o verifica: **C300 Comune di Gamma**.
2. Cerca «Materiale» e inserisci o verifica: **TR-STD**.
3. Cerca «Quantità» e inserisci o verifica: **150**.
4. Cerca «Riferimento cliente» e inserisci o verifica: **GAMMA-150**.
5. Cerca «Data» e inserisci o verifica: **05/01/2027**.
6. Cerca «Data di consegna richiesta» e inserisci o verifica: **22/01/2027**.
**Perché:** COSA IMPARI: VA01: il Comune di Gamma ordina 150 TR-STD. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Ordine 10000003. I 200 TR-STD sono già promessi a Beta (chi ordina prima è servito prima): Gamma aspetta la produzione.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 10 — VA05 e CO09: quanto manca? Il fabbisogno
**Dove entrare:** SD → Ordini cliente (VA05, colonna Disponibilità); SD → Gestione crediti e disponibilità → CO09. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «Domanda TR-STD» e inserisci o verifica: **Beta 350 + Gamma 150 = 500; a scaffale 200 → mancano 300 transenne da produrre**.
2. Cerca «Fabbisogno di ferro» e inserisci o verifica: **300 × 8 kg = 2.400 kg; a magazzino 0**.
3. Cerca «Decisione» e inserisci o verifica: **ordinare 3.000 kg di ferro (2.400 per l’ordine, il resto è scorta) e un ordine di produzione da 300**.
**Perché:** COSA IMPARI: VA05 e CO09: quanto manca? Il fabbisogno. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Lettura e calcolo: spunta a mano. È il ragionamento dell’MRP: domanda − disponibile = fabbisogno netto, poi distinta base × quantità.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 11 — Scorta minima del ferro: 500 kg
**Dove entrare:** WMS → Scorta minima e riordino → Imposta la scorta minima. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 05/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Materiale» e inserisci o verifica: **FERRO**.
2. Cerca «Scorta minima (punto di riordino)» e inserisci o verifica: **500**.
3. Cerca «Scorta massima» e inserisci o verifica: **3000**.
4. Cerca «Pulsante» e premi/seleziona: **Salva la scorta minima**.
**Perché:** COSA IMPARI: Scorta minima del ferro: 500 kg. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Riga FERRO: libera 0 + in arrivo 0 = 0 kg, sotto il minimo di 500 → 🔴 SOTTO SCORTA, proposta di riordino 3.000 kg (massima 3.000 − 0). È proprio la quantità che ordini nel passo dopo. Nessun movimento e nessuna scrittura: la scorta minima è un parametro del materiale.
**Attenzione:** Il sistema PROPONE, non ordina: la richiesta d’acquisto o l’ordine li fa una persona. Dopo l’ordine la riga diventa 🟡 (sotto il minimo ma in arrivo); dopo l’entrata merci 🟢.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 12 — ME21N: ordina 3.000 kg di ferro a 1,00 €/kg
**Dove entrare:** MM → Ordini d’acquisto e rilascio. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 05/01/2027.
**Cosa fare, lentamente:**
1. Apri MM → Ordini d'acquisto e rilascio (ME21N).
2. Acquista 3.000 kg di FERRO a 1,00 €/kg con i dati del passaggio.
3. Salva una sola volta, poi leggi numero ordine e data prevista.
4. Finché non esegui MIGO, la giacenza reale del FERRO non aumenta.
**Perché:** COSA IMPARI: ME21N: ordina 3.000 kg di ferro a 1,00 €/kg. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Ordine 4500000001 da 3.000 €, consegna prevista il 07/01. Nessuna scrittura: l’ordine è un impegno, non un costo. Attenzione al prezzo: il costo standard del ferro è 0,95 €/kg, l’ordine è a 1,00. Poi, nella stessa pagina, riquadro «Conferma d’ordine del fornitore»: il fornitore deve rispedirti la sua conferma. Scegli l’ordine, scrivi il riferimento (es. CONF-001) e premi «Registra la conferma tornata»: finché non torna, l’ordine resta «⏳ in attesa». Non cambia la contabilità, ma ti dice che il fornitore ha accettato prezzo e quantità.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 13 — MIGO 101: ricevi il ferro, 150 kg sono piegati
**Dove entrare:** MM → Entrata merci. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 07/01/2027.
**Cosa fare, lentamente:**
1. Apri MM → Entrata merci (MIGO 101).
2. Seleziona l'ordine da 3.000 kg e segui i dati del tutor.
3. Identifica i 150 kg piegati/danneggiati; non considerarli subito disponibili.
4. Premi registra una sola volta; annota il documento e controlla i compiti di ricevimento.
**Perché:** COSA IMPARI: MIGO 101: ricevi il ferro, 150 kg sono piegati. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Movimento 101 a costo standard: D 12 Materie prime 2.850 (3.000 × 0,95) + D 63 Differenze prezzo 150 (3.000 × 0,05) / A 22 Fatture da ricevere 3.000 (al prezzo dell’ordine). WMS: 2.850 kg buoni in tre fasci (1.000 + 1.000 + 850) in GR-ZONE con 3 compiti di messa a posto; i 150 kg piegati entrano BLOCCATI in Q-ZONE.
**Attenzione:** Ragioneria di magazzino: la merce entra al prezzo standard, la differenza con il prezzo d’acquisto va subito in un conto a parte (63). Il conto 22 è il «ponte» tra merce arrivata e fattura non ancora ricevuta.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 14 — Merce da mettere a posto: che cosa aspetta in ricevimento?
**Dove entrare:** WMS → Merce da mettere a posto. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 07/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data di oggi» e inserisci o verifica: **07/01/2027**.
2. Cerca «Leggi» e inserisci o verifica: **le righe della tabella: articolo, quantità, UdC, «Da dove arriva» e «Va in (proposta)»**.
3. Cerca «Pulsante» e premi/seleziona: **«▶ Metti a posto» sulla prima riga: si apre la pistola RF con quel compito (continua nel passo dopo)**.
**Perché:** COSA IMPARI: Merce da mettere a posto: che cosa aspetta in ricevimento?. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Risultato da controllare:** 3 UdC di FERRO da mettere a posto, 2.850 kg arrivati oggi in ricevimento: 1.000 e 1.000 kg verso F-01, 850 kg verso F-02. I 150 kg piegati NON sono qui: sono bloccati in quarantena.
**Attenzione:** Lettura: spunta a mano. Merce in ricevimento = già nostra e già in contabilità, ma non ancora prelevabile: finché non è a scaffale intasa la zona di scarico.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 15 — RF: metti a dimora i 3 fasci buoni
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 07/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data di lavoro» e inserisci o verifica: **07/01/2027**.
2. Cerca «Risorsa» e inserisci o verifica: **MAG01 Marco**.
3. Cerca «Compiti» e inserisci o verifica: **i 3 PUTAWAY del ferro (GR-ZONE → F-01, F-01, F-02)**.
**Perché:** COSA IMPARI: RF: metti a dimora i 3 fasci buoni. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** F-01 con due fasci da 1.000, F-02 con quello da 850. Nessuna scrittura: il ferro era già in contabilità con la MIGO.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 16 — Quarantena: rottama i 150 kg piegati (555)
**Dove entrare:** WMS → Merce bloccata e danneggiata → Decidi sulla merce in quarantena. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 07/01/2027.
**Cosa fare, lentamente:**
1. Cerca «UdC in quarantena» e inserisci o verifica: **quella da 150 kg di FERRO**.
2. Cerca «Esito del controllo» e inserisci o verifica: **fasci piegati, non recuperabili**.
3. Cerca «Pulsante» e premi/seleziona: **Rottama: da buttare (555)**.
4. Cerca «Data» e inserisci o verifica: **07/01/2027**.
**Perché:** COSA IMPARI: Quarantena: rottama i 150 kg piegati (555). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** D 69 Rottamazioni / A 12 Materie prime 142,50 (150 × 0,95). Il ferro esce dal magazzino e diventa un costo.
**Attenzione:** In alternativa si poteva rendere al fornitore o sbloccare (343) se il controllo fosse stato positivo: la decisione la prende la qualità, il magazziniere la esegue.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 17 — MIRO: la fattura arriva a 1,02 €/kg
**Dove entrare:** MM → Fatture fornitore. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 08/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine» e inserisci o verifica: **4500000001**.
2. Cerca «Numero fattura» e inserisci o verifica: **FR-2027-014**.
3. Cerca «Quantità» e inserisci o verifica: **vuoto = quella ricevuta**.
4. Cerca «Prezzo» e inserisci o verifica: **1,02 (il fornitore applica un adeguamento)**.
5. Cerca «Accetto la differenza di prezzo» e inserisci o verifica: **SPUNTA la casella: è proprio la differenza di 0,02 €/kg che stai studiando**.
6. Cerca «Data» e inserisci o verifica: **08/01/2027**.
**Perché:** COSA IMPARI: MIRO: la fattura arriva a 1,02 €/kg. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** D 22 Fatture da ricevere 3.000 + D 63 Differenze prezzo 60 + D 14 IVA a credito 673,20 / A 20 Acciaierie Umbre 3.733,20. Il conto 22 torna a zero; la nuova differenza (0,02 × 3.000 = 60) si somma ai 150 della MIGO: 210 € pagati sopra lo standard.
**Attenzione:** Controllo a tre vie (three-way match): ordine, entrata merci, fattura. Quantità e prezzo devono tornare; se non tornano, la differenza si vede e si spiega.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 18 — CO01: ordine di produzione per 300 TR-STD
**Dove entrare:** PP → Ordini di produzione. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 08/01/2027.
**Cosa fare, lentamente:**
1. Apri PP → Ordini di produzione (CO01).
2. Materiale TR-STD; quantità 300; usa distinta base e ciclo.
3. Il fabbisogno di ferro è 2.400 kg.
4. Conferma l'ordine e verifica che esista una sola registrazione.
**Perché:** COSA IMPARI: CO01: ordine di produzione per 300 TR-STD. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Ordine 1000001: 2.400 kg di ferro, Taglio 75 h, Piegatura 60 h, Saldatura 120 h, tutte sullo stesso ordine. Beta e Gamma diventano confermabili alla data di fine.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 19 — WMS: approvvigiona la linea (staging) con 2.400 kg
**Dove entrare:** WMS → Compiti → Approvvigionamento della produzione. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 08/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine» e inserisci o verifica: **1000001 TR-STD**.
2. Cerca «Quantità» e inserisci o verifica: **vuoto = 2.400 kg**.
3. Cerca «Data» e inserisci o verifica: **08/01/2027**.
**Perché:** COSA IMPARI: WMS: approvvigiona la linea (staging) con 2.400 kg. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 3 compiti STAGING in ordine FIFO: F-01 1.000 + 1.000, F-02 400 → PSA-L1 (bordo linea).
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 20 — RF: porta il ferro a bordo linea
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 08/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data di lavoro» e inserisci o verifica: **08/01/2027**.
2. Cerca «Compiti» e inserisci o verifica: **i 3 STAGING**.
**Perché:** COSA IMPARI: RF: porta il ferro a bordo linea. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 2.400 kg in PSA-L1; F-02 conserva 450 kg. Nessun consumo e nessuna scrittura: il ferro ha solo cambiato posto.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 21 — 261: preleva 2.400 kg per l’ordine
**Dove entrare:** PP → Prelievi, conferme, entrate → Prelievo. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 08/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine» e inserisci o verifica: **1000001**.
2. Cerca «Quantità» e inserisci o verifica: **2400**.
3. Cerca «Data» e inserisci o verifica: **08/01/2027**.
**Perché:** COSA IMPARI: 261: preleva 2.400 kg per l’ordine. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** D 70 Consumi di materie / A 12 Materie prime 2.280 (2.400 × 0,95). Il ferro passa dal magazzino all’ordine: è un costo di produzione (WIP).
**Attenzione:** Senza staging il programma rifiuta il prelievo: il ferro deve essere davvero a bordo linea.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 22 — CO11N: conferma il Taglio (75 ore)
**Dove entrare:** PP → Conferma delle ore. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 09/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine» e inserisci o verifica: **1000001**.
2. Cerca «Fase» e inserisci o verifica: **Taglio**.
3. Cerca «Attrezzaggio» e inserisci o verifica: **0**.
4. Cerca «Ore» e inserisci o verifica: **75**.
5. Cerca «Quantità fase» e inserisci o verifica: **300**.
6. Cerca «Data» e inserisci o verifica: **09/01/2027**.
**Perché:** COSA IMPARI: CO11N: conferma il Taglio (75 ore). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 75 × 28 €/h = 2.100: D 72 / A 75. Nessun pezzo entra a magazzino tra una fase e l’altra.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 23 — CO11N: conferma la Piegatura (60 ore)
**Dove entrare:** PP → Conferma delle ore. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 11/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine» e inserisci o verifica: **1000001**.
2. Cerca «Fase» e inserisci o verifica: **Piegatura**.
3. Cerca «Attrezzaggio» e inserisci o verifica: **0**.
4. Cerca «Ore» e inserisci o verifica: **60**.
5. Cerca «Quantità fase» e inserisci o verifica: **300**.
6. Cerca «Data» e inserisci o verifica: **11/01/2027**.
**Perché:** COSA IMPARI: CO11N: conferma la Piegatura (60 ore). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 60 × 28 = 1.680: D 72 / A 75.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 24 — CO11N: conferma la Saldatura (120 ore)
**Dove entrare:** PP → Conferma delle ore. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 12/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine» e inserisci o verifica: **1000001**.
2. Cerca «Fase» e inserisci o verifica: **Saldatura**.
3. Cerca «Attrezzaggio» e inserisci o verifica: **0**.
4. Cerca «Ore» e inserisci o verifica: **120**.
5. Cerca «Quantità fase» e inserisci o verifica: **300**.
6. Cerca «Data» e inserisci o verifica: **12/01/2027**.
**Perché:** COSA IMPARI: CO11N: conferma la Saldatura (120 ore). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 120 × 28 = 3.360: D 72 / A 75. WIP dell’ordine: 2.280 + 2.100 + 1.680 + 3.360 = 9.420.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 25 — 101: versa a magazzino le 300 transenne
**Dove entrare:** PP → Entrata del prodotto. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine» e inserisci o verifica: **1000001**.
2. Cerca «Pezzi» e inserisci o verifica: **vuoto = 300**.
3. Cerca «Data» e inserisci o verifica: **13/01/2027**.
**Perché:** COSA IMPARI: 101: versa a magazzino le 300 transenne. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** D 13 Prodotti finiti / A 73 Variazione per produzione interna 9.420 (300 × 31,40). Il WIP va a zero; 6 pallet da 50 in GR-ZONE.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 26 — RF: metti a scaffale i 6 pallet
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data di lavoro» e inserisci o verifica: **13/01/2027**.
2. Cerca «Compiti» e inserisci o verifica: **i 6 PUTAWAY di TR-STD**.
**Perché:** COSA IMPARI: RF: metti a scaffale i 6 pallet. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 500 TR-STD a scaffale (200 + 300).
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 27 — Tracciabilità: da quale colata vengono le transenne?
**Dove entrare:** WMS → Lotti, numeri di serie e tracciabilità. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «A monte» e inserisci o verifica: **lotto delle TR-STD dell’ordine 1000001 → ferro colata COL-0107, Acciaierie Umbre, DDT-AU-0107**.
2. Cerca «A valle» e inserisci o verifica: **«Traccia» sulla colata COL-0107: ordine 1000001, poi le consegne quando partiranno**.
**Perché:** COSA IMPARI: Tracciabilità: da quale colata vengono le transenne?. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Lettura: spunta a mano. Se la colata fosse difettosa sapremmo in un minuto quali transenne e quali clienti coinvolge.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 28 — Blocca un pallet di TR-ALTA urtato dal carrello (344)
**Dove entrare:** WMS → Merce bloccata e danneggiata → Metti in quarantena. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Unità di carico» e inserisci o verifica: **il primo pallet TR-ALTA dell’elenco**.
2. Cerca «Quantità» e inserisci o verifica: **vuoto = tutto il pallet (50)**.
3. Cerca «Motivo» e inserisci o verifica: **pallet urtato dal carrello, da controllare**.
4. Cerca «Data» e inserisci o verifica: **13/01/2027**.
5. Cerca «Pulsante» e premi/seleziona: **Metti in quarantena e crea il compito RF**.
**Perché:** COSA IMPARI: Blocca un pallet di TR-ALTA urtato dal carrello (344). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Movimento 344: 50 TR-ALTA da liberi a bloccati, non vendibili. Compito BLOCCO verso Q-ZONE. Nessuna scrittura: la merce resta nostra e a bilancio.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 29 — RF: porta il pallet in quarantena
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **13/01/2027**.
2. Cerca «Compito» e inserisci o verifica: **il BLOCCO verso Q-ZONE**.
**Perché:** COSA IMPARI: RF: porta il pallet in quarantena. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Il pallet è in Q-ZONE; il suo scaffale è libero.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 30 — Controllo superato: sblocca il pallet (343)
**Dove entrare:** WMS → Merce bloccata e danneggiata → Decidi sulla merce in quarantena. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «UdC in quarantena» e inserisci o verifica: **il pallet TR-ALTA**.
2. Cerca «Esito del controllo» e inserisci o verifica: **imballo integro, merce buona**.
3. Cerca «Pulsante» e premi/seleziona: **Sblocca: è buona (343)**.
4. Cerca «Data» e inserisci o verifica: **13/01/2027**.
**Perché:** COSA IMPARI: Controllo superato: sblocca il pallet (343). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Movimento 343: i 50 TR-ALTA tornano liberi; nasce un PUTAWAY da Q-ZONE.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 31 — RF: rimetti a scaffale il pallet sbloccato
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **13/01/2027**.
2. Cerca «Compito» e inserisci o verifica: **il PUTAWAY da Q-ZONE**.
**Perché:** COSA IMPARI: RF: rimetti a scaffale il pallet sbloccato. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Q-ZONE vuota; 200 TR-ALTA disponibili.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 32 — LT10: sposta un pallet di TR-PED in fondo al magazzino
**Dove entrare:** WMS → Compiti → Trasferimento. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Unità di carico» e inserisci o verifica: **il primo pallet TR-PED (in 01-05-1)**.
2. Cerca «Destinazione» e inserisci o verifica: **03-04-1**.
3. Cerca «Motivo» e inserisci o verifica: **riordino della corsia 01**.
4. Cerca «Data» e inserisci o verifica: **13/01/2027**.
**Perché:** COSA IMPARI: LT10: sposta un pallet di TR-PED in fondo al magazzino. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Un compito TRASF verso 03-04-1. Nessuna scrittura.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 33 — RF: conferma lo spostamento
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **13/01/2027**.
2. Cerca «Compito» e inserisci o verifica: **il TRASF verso 03-04-1**.
**Perché:** COSA IMPARI: RF: conferma lo spostamento. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Il pallet TR-PED è in 03-04-1.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 34 — Slotting: ogni pallet al posto giusto
**Dove entrare:** WMS → Innovazione → Slotting. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Leggi» e inserisci o verifica: **classe ABC per righe di prelievo e proposta: quali pallet, da dove, a dove, quanti metri risparmiati**.
2. Cerca «Data» e inserisci o verifica: **13/01/2027**.
3. Cerca «Pulsante» e premi/seleziona: **Crea i compiti di trasferimento proposti**.
**Perché:** COSA IMPARI: Slotting: ogni pallet al posto giusto. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 3 compiti TRASF: il TR-PED rientra vicino alla porta, due pallet TR-STD di scorta vanno nella corsia 03. Nessuna scrittura: cambia solo il posto.
**Attenzione:** Lo slotting si fa prima dei prelievi: ciò che esce più spesso vicino alla spedizione, la scorta lenta in fondo. Meno metri = meno tempo e meno rischi.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 35 — RF: conferma i trasferimenti dello slotting
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 13/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **13/01/2027**.
2. Cerca «Compiti» e inserisci o verifica: **tutti i TRASF dello slotting**.
**Perché:** COSA IMPARI: RF: conferma i trasferimenti dello slotting. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Guarda la mappa: TR-PED di nuovo in 01-05-1.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 36 — Attiva il prelievo a ondate
**Dove entrare:** WMS → Innovazione → Prelievo a ondate → Impostazioni. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «Prelievo a ondate» e inserisci o verifica: **sì: le consegne aspettano l’ondata**.
2. Cerca «Cross-docking» e inserisci o verifica: **no**.
3. Cerca «Pulsante» e premi/seleziona: **Salva**.
**Perché:** COSA IMPARI: Attiva il prelievo a ondate. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Da ora le consegne non creano subito i compiti: il capo magazzino le raggruppa in un unico giro.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 37 — Arretrato e scadenze: chi aspetta la merce?
**Dove entrare:** WMS → Arretrato e scadenze. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 14/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data di oggi» e inserisci o verifica: **14/01/2027**.
2. Cerca «1 · Clienti» e inserisci o verifica: **Beta 350 TR-STD e Delta 150 TR-ALTA: 🟡 «scade fra 1 giorno» (promessi il 15/01); Gamma 150 TR-STD: 🟢 in tempo (22/01)**.
3. Cerca «2, 3, 4» e inserisci o verifica: **fornitori, produzione e compiti di magazzino: nessuna riga rossa (ferro arrivato, ordine 1000001 versato, compiti confermati)**.
4. Cerca «Prova» e inserisci o verifica: **scrivi 16/01/2027 come data di oggi: Beta e Delta diventano 🔴 IN RITARDO di 1 giorno. Poi rimetti 14/01/2027**.
**Perché:** COSA IMPARI: Arretrato e scadenze: chi aspetta la merce?. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Risultato da controllare:** In alto 0 consegne in ritardo con la data di oggi: Beta e Delta vanno spedite entro domani. Per questo oggi si fanno consegne, ondata e prelievo.
**Attenzione:** Lettura: spunta a mano. L’arretrato si guarda ogni mattina: prima le righe rosse, poi arancio e gialle.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 38 — VL01N: consegna per Beta
**Dove entrare:** SD → Consegne. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 14/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine» e inserisci o verifica: **10000001 Beta 350 TR-STD**.
2. Cerca «Data» e inserisci o verifica: **14/01/2027**.
**Perché:** COSA IMPARI: VL01N: consegna per Beta. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Consegna 80000001 in attesa dell’ondata. Nessuna uscita merci e nessuna scrittura.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 39 — VL01N: consegna per Delta
**Dove entrare:** SD → Consegne. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 14/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine» e inserisci o verifica: **10000002 Delta 150 TR-ALTA**.
2. Cerca «Data» e inserisci o verifica: **14/01/2027**.
**Perché:** COSA IMPARI: VL01N: consegna per Delta. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Consegna 80000002, anche lei in attesa.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 40 — Rilascia l’ondata ONDA-1
**Dove entrare:** WMS → Innovazione → Prelievo a ondate → Rilascia l’ondata. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 14/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **14/01/2027**.
2. Cerca «Pulsante» e premi/seleziona: **Rilascia l’ondata**.
**Perché:** COSA IMPARI: Rilascia l’ondata ONDA-1. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** ONDA-1: 2 consegne, 10 compiti PICK (7 pallet TR-STD e 3 TR-ALTA) in un solo giro a serpentina: 56 m invece di 80 m con un giro per ordine (−30%).
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 41 — Stampa la lista di prelievo
**Dove entrare:** WMS → Spedizione → Lista di prelievo. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «Leggi» e inserisci o verifica: **ubicazione, UdC e quantità di ogni riga, nell’ordine del percorso**.
2. Cerca «Stampa» e inserisci o verifica: **🖨️ per chi lavora senza pistola**.
**Perché:** COSA IMPARI: Stampa la lista di prelievo. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Lettura: spunta a mano.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 42 — RF: preleva i 10 pallet (FIFO)
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 14/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data di lavoro» e inserisci o verifica: **14/01/2027**.
2. Cerca «Compiti» e inserisci o verifica: **i 10 PICK, senza differenze di quantità**.
**Perché:** COSA IMPARI: RF: preleva i 10 pallet (FIFO). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 500 pezzi in GI-ZONE. Giacenza contabile invariata: nessun costo del venduto finché la merce non parte.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 43 — Misure del pallet EUR e regole: quante transenne per collo
**Dove entrare:** WMS → Spedizione → Imballi, regole e veicoli. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 14/01/2027.
**Cosa fare, lentamente:**
1. Cerca «1 · Imballo EUR» e inserisci o verifica: **120 × 80 × 15 cm, tara 25 kg, portata 1000 kg, impilabile sì, regge sopra 700 kg → Salva l’imballo**.
2. Cerca «Prova l’errore» e inserisci o verifica: **regola TR-STD su EUR con 90 pezzi: il programma la rifiuta, 90 × 12 kg + 25 = 1.105 kg supera i 1.000 kg del pallet**.
3. Cerca «2 · Regola TR-STD» e inserisci o verifica: **su pallet EUR: 50 pezzi, collo alto 125 cm → Salva la regola**.
4. Cerca «2 · Regola TR-ALTA» e inserisci o verifica: **su pallet EUR: 50 pezzi, collo alto 140 cm → Salva la regola**.
**Perché:** COSA IMPARI: Misure del pallet EUR e regole: quante transenne per collo. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Collo TR-STD: 50 × 12 kg + 25 = 625 kg; collo TR-ALTA: 50 × 15 kg + 25 = 775 kg. Nella tabella delle regole le due righe hanno «✏️ tu». Nessuna scrittura.
**Attenzione:** Senza misure non si può progettare il carico: il camion si riempie per spazio (cm) e per peso (kg). La regola dice anche all’imballo quanti pezzi proporre.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 44 — Imballa Beta in colli SSCC
**Dove entrare:** WMS → Imballo e etichette SSCC. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 14/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Consegna» e inserisci o verifica: **80000001**.
2. Cerca «Imballo» e inserisci o verifica: **EUR**.
3. Cerca «Pezzi per collo» e inserisci o verifica: **50**.
4. Cerca «Data» e inserisci o verifica: **14/01/2027**.
**Perché:** COSA IMPARI: Imballa Beta in colli SSCC. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 7 colli da 50 con SSCC univoco (codice GS1 a 18 cifre). Nessuna scrittura.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 45 — Imballa Delta in colli SSCC
**Dove entrare:** WMS → Imballo e etichette SSCC. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 14/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Consegna» e inserisci o verifica: **80000002**.
2. Cerca «Imballo» e inserisci o verifica: **EUR**.
3. Cerca «Pezzi per collo» e inserisci o verifica: **50**.
4. Cerca «Data» e inserisci o verifica: **14/01/2027**.
**Perché:** COSA IMPARI: Imballa Delta in colli SSCC. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 3 colli da 50.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 46 — VT01N: un camion per le due consegne
**Dove entrare:** WMS → Trasporti e carico → Crea il trasporto. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 15/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Consegne» e inserisci o verifica: **80000001, 80000002**.
2. Cerca «Vettore» e inserisci o verifica: **V10**.
3. Cerca «Targa fittizia» e inserisci o verifica: **AB123CD**.
4. Cerca «Autista fittizio» e inserisci o verifica: **Mario Esempio**.
5. Cerca «Porto» e inserisci o verifica: **franco**.
6. Cerca «Data di carico» e inserisci o verifica: **15/01/2027**.
**Perché:** COSA IMPARI: VT01N: un camion per le due consegne. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Un trasporto, due clienti, 10 colli da caricare.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 47 — Piano di carico: quale camion per Beta e Delta?
**Dove entrare:** WMS → Spedizione → Piano di carico del camion. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 15/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Trasporto» e inserisci o verifica: **quello appena creato (consegne Beta e Delta)**.
2. Cerca «Prova il furgone» e inserisci o verifica: **Veicolo «Furgone 3,5 t»: ci sta 1 collo su 10, porta solo 1.200 kg**.
3. Cerca «Scegli la motrice» e inserisci o verifica: **Veicolo «Motrice 10 t», criterio «per fermate»**.
4. Cerca «Guarda il disegno» e inserisci o verifica: **Delta (scende per ultima) vicino alla CABINA nei posti 1-3, Beta verso le PORTE con 3 pile da due**.
5. Cerca «Camion in 3D» e inserisci o verifica: **premi «🧊 Camion in 3D»: gira il camion con il mouse, prova «dalle porte» e passa sopra un collo per leggere posto, articolo e peso**.
6. Cerca «Prova di nuovo il furgone in 3D» e inserisci o verifica: **i colli che non ci stanno compaiono rossi dietro al camion con la scritta NON ALLOCATI; poi rimetti la motrice**.
7. Cerca «Pulsante» e premi/seleziona: **Salva il piano sul trasporto**.
**Perché:** COSA IMPARI: Piano di carico: quale camion per Beta e Delta?. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 10 colli su 10 in 7 posti a terra (3 pile da due colli di TR-STD), 6.700 kg = 84% della portata. Le TR-ALTA non si impilano: 775 kg pesano più dei 700 che il pallet regge sopra. Nessuna scrittura.
**Attenzione:** Si carica dal posto 1 (cabina) verso le porte: chi scende per primo deve essere vicino alle porte. Con la pistola RF → Carico ogni collo ti dice il suo posto.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 48 — RF Carico: carica i 7 colli di Beta con la pistola
**Dove entrare:** WMS → Pistola RF → scheda 🚛 Carico. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 15/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **15/01/2027**.
2. Cerca «SSCC» e inserisci o verifica: **leggi uno alla volta i 7 SSCC della consegna 80000001 (copiali da Imballo) e premi Invio**.
**Perché:** COSA IMPARI: RF Carico: carica i 7 colli di Beta con la pistola. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 7 colli di Beta caricati. Un collo letto due volte viene rifiutato.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 49 — Varco RFID: carica i 3 colli di Delta in un passaggio
**Dove entrare:** WMS → Innovazione → Varco RFID. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 15/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Trasporto» e inserisci o verifica: **quello appena creato**.
2. Cerca «Data» e inserisci o verifica: **15/01/2027**.
3. Cerca «Pulsante» e premi/seleziona: **Fai passare il carrello dal varco**.
**Perché:** COSA IMPARI: Varco RFID: carica i 3 colli di Delta in un passaggio. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 3 tag letti in un solo passaggio: 10/10 colli caricati. La pagina mostra il codice EPC derivato da ogni SSCC.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 50 — Partenza: uscita merci 601 e DDT
**Dove entrare:** WMS → Trasporti e carico → Fine carico e uscita merci. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 15/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Trasporto» e inserisci o verifica: **quello appena creato**.
2. Cerca «Data di partenza» e inserisci o verifica: **15/01/2027**.
**Perché:** COSA IMPARI: Partenza: uscita merci 601 e DDT. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Due scritture 601: D 41 Costo del venduto / A 13 Prodotti finiti 10.990 (350 × 31,40, Beta) e 5.541 (150 × 36,94, Delta). Nascono i DDT. Solo adesso la merce esce dalla contabilità.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 51 — Monitor delle consegne e DDT
**Dove entrare:** WMS → Spedizione → Monitor delle consegne (VL06O); poi DDT. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «Monitor» e inserisci o verifica: **prelievo, imballo, trasporto, carico e uscita merci completati**.
2. Cerca «DDT» e inserisci o verifica: **mittente, destinatario, causale, vettore, colli e SSCC**.
3. Cerca «Stampa» e inserisci o verifica: **🖨️ oppure salva in PDF**.
**Perché:** COSA IMPARI: Monitor delle consegne e DDT. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Lettura: spunta a mano. Il DDT accompagna la merce sul camion.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 52 — VF01: l’ufficio fattura Beta
**Dove entrare:** SD → Fatturazione. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 15/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Consegna» e inserisci o verifica: **80000001**.
2. Cerca «Data» e inserisci o verifica: **15/01/2027**.
**Perché:** COSA IMPARI: VF01: l’ufficio fattura Beta. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** D 11 Beta 24.595,20 + D 47 Sconti 840 / A 40 Ricavi 21.000 + A 21 IVA 4.435,20; provvigione dell’agente D 57 / A 26 604,80. Il magazzino ha generato il ricavo con la consegna: la fattura parte dal DDT.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 53 — Beta rende 10 transenne difettose
**Dove entrare:** SD → Resi e note di credito → Ordine di reso. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 18/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Con riferimento alla fattura» e inserisci o verifica: **90000001 Beta**.
2. Cerca «Quantità» e inserisci o verifica: **10**.
3. Cerca «Motivo» e inserisci o verifica: **transenne con saldatura difettosa**.
4. Cerca «Data» e inserisci o verifica: **18/01/2027**.
**Perché:** COSA IMPARI: Beta rende 10 transenne difettose. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Ordine di reso 60000001: la merce deve ancora tornare. Nessuna scrittura.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 54 — Entrata del reso (651)
**Dove entrare:** SD → Resi e note di credito → Entrata merci del reso. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 19/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Ordine di reso» e inserisci o verifica: **60000001**.
2. Cerca «Data» e inserisci o verifica: **19/01/2027**.
**Perché:** COSA IMPARI: Entrata del reso (651). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** D 13 Prodotti finiti / A 41 Costo del venduto 314 (10 × 31,40): la merce torna nostra. WMS: una UdC da 10 in GR-ZONE con un PUTAWAY.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 55 — RF: metti a posto il reso
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 19/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **19/01/2027**.
2. Cerca «Compito» e inserisci o verifica: **il PUTAWAY da 10 TR-STD**.
**Perché:** COSA IMPARI: RF: metti a posto il reso. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 56 — Blocca il reso: va controllato
**Dove entrare:** WMS → Merce bloccata e danneggiata → Metti in quarantena. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 19/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Unità di carico» e inserisci o verifica: **la UdC da 10 TR-STD del reso**.
2. Cerca «Quantità» e inserisci o verifica: **vuoto = tutta**.
3. Cerca «Motivo» e inserisci o verifica: **reso cliente: saldature difettose**.
4. Cerca «Data» e inserisci o verifica: **19/01/2027**.
**Perché:** COSA IMPARI: Blocca il reso: va controllato. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 344 e compito BLOCCO verso Q-ZONE: un reso difettoso non deve finire in una nuova spedizione.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 57 — RF: porta il reso in quarantena
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 19/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **19/01/2027**.
2. Cerca «Compito» e inserisci o verifica: **il BLOCCO del reso**.
**Perché:** COSA IMPARI: RF: porta il reso in quarantena. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 58 — Rottama il reso non riparabile (555)
**Dove entrare:** WMS → Merce bloccata e danneggiata → Decidi sulla merce in quarantena. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 19/01/2027.
**Cosa fare, lentamente:**
1. Cerca «UdC in quarantena» e inserisci o verifica: **il reso da 10 TR-STD**.
2. Cerca «Esito del controllo» e inserisci o verifica: **saldature non riparabili**.
3. Cerca «Pulsante» e premi/seleziona: **Rottama: da buttare (555)**.
4. Cerca «Data» e inserisci o verifica: **19/01/2027**.
**Perché:** COSA IMPARI: Rottama il reso non riparabile (555). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** D 69 Rottamazioni / A 13 Prodotti finiti 314.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 59 — Spegni le ondate: consegna per Gamma
**Dove entrare:** WMS → Innovazione → Prelievo a ondate (no); poi SD → Consegne. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 20/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Prelievo a ondate» e inserisci o verifica: **no**.
2. Cerca «Poi VL01N» e inserisci o verifica: **ordine 10000003 Comune di Gamma, data 20/01/2027**.
**Perché:** COSA IMPARI: Spegni le ondate: consegna per Gamma. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Senza ondate la consegna crea subito i suoi compiti: 3 PICK di TR-STD verso GI-ZONE.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 60 — RF: preleva i 3 pallet di Gamma
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 20/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data di lavoro» e inserisci o verifica: **20/01/2027**.
2. Cerca «Compiti» e inserisci o verifica: **i 3 PICK**.
**Perché:** COSA IMPARI: RF: preleva i 3 pallet di Gamma. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 61 — Imballa Gamma in 3 colli
**Dove entrare:** WMS → Imballo e etichette SSCC. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 20/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Consegna» e inserisci o verifica: **quella di Gamma**.
2. Cerca «Imballo» e inserisci o verifica: **EUR**.
3. Cerca «Pezzi per collo» e inserisci o verifica: **50**.
4. Cerca «Data» e inserisci o verifica: **20/01/2027**.
**Perché:** COSA IMPARI: Imballa Gamma in 3 colli. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 62 — Trasporto e carico da scrivania
**Dove entrare:** WMS → Trasporti e carico. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 21/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Crea il trasporto» e inserisci o verifica: **consegna di Gamma, vettore V20, targa CD456EF, autista Luca Esempio, porto assegnato, 21/01/2027**.
2. Cerca «Carico (da scrivania)» e inserisci o verifica: **scrivi uno alla volta i 3 SSCC dei colli di Gamma, data 21/01/2027**.
**Perché:** COSA IMPARI: Trasporto e carico da scrivania. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Trasporto con 3 colli caricati senza pistola: stesso risultato, più lento e con più rischio di errore di battitura.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 63 — Partenza di Gamma (601)
**Dove entrare:** WMS → Trasporti e carico → Fine carico e uscita merci. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 21/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Trasporto» e inserisci o verifica: **quello di Gamma**.
2. Cerca «Data di partenza» e inserisci o verifica: **21/01/2027**.
**Perché:** COSA IMPARI: Partenza di Gamma (601). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** D 41 / A 13 4.710 (150 × 31,40). TR-STD a magazzino: zero.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 64 — Classificazione ABC: che cosa contare più spesso
**Dove entrare:** WMS → Inventari → Classificazione ABC. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «Criterio» e inserisci o verifica: **valore dei consumi e delle vendite del mese a costo standard**.
2. Cerca «Leggi» e inserisci o verifica: **classe di TR-STD, TR-ALTA, TR-PED e FERRO e quante conte all’anno prevede l’inventario a rotazione**.
**Perché:** COSA IMPARI: Classificazione ABC: che cosa contare più spesso. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Lettura: spunta a mano. Classe A = pochi codici, molto valore: si contano spesso.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 65 — LI01N: documento d’inventario per F-01, F-02 e 01-05-1
**Dove entrare:** WMS → Inventari → Documenti d’inventario → Crea. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 29/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Tipo» e inserisci o verifica: **ubicazioni scelte**.
2. Cerca «Ubicazioni» e inserisci o verifica: **F-01, F-02, 01-05-1**.
3. Cerca «Tolleranza» e inserisci o verifica: **10 (euro)**.
4. Cerca «Data» e inserisci o verifica: **29/01/2027**.
**Perché:** COSA IMPARI: LI01N: documento d’inventario per F-01, F-02 e 01-05-1. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Documento con 3 posizioni: F-01 vuota, F-02 450 kg di FERRO, 01-05-1 50 TR-PED. Nessuna scrittura.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 66 — Attiva l’inventario e stampa la lista di conta cieca
**Dove entrare:** WMS → Inventari → Documenti → Attiva; poi Lista di conta. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 29/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data di riferimento» e inserisci o verifica: **29/01/2027**.
2. Cerca «Lista» e inserisci o verifica: **conta cieca: le quantità a sistema non si vedono**.
**Perché:** COSA IMPARI: Attiva l’inventario e stampa la lista di conta cieca. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Ubicazioni bloccate: niente prelievi né messe a posto fino alla chiusura (cut-off).
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 67 — RF Inventario: conta F-01 con la pistola
**Dove entrare:** WMS → Pistola RF → scheda 📝 Inventario. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 29/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Leggi l’ubicazione» e inserisci o verifica: **F-01 (Invio)**.
2. Cerca «Conta» e inserisci o verifica: **0: la catasta è vuota (il ferro è andato in produzione)**.
3. Cerca «Pulsante» e premi/seleziona: **Registra la conta**.
**Perché:** COSA IMPARI: RF Inventario: conta F-01 con la pistola. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Conta salvata per F-01: anche un’ubicazione vuota si conta, per essere sicuri che lo sia davvero.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 68 — LI11N: alla catasta F-02 mancano 12 kg
**Dove entrare:** WMS → Inventari → Documenti → Registra la conta. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 29/01/2027.
**Cosa fare, lentamente:**
1. Cerca «F-02 FERRO» e inserisci o verifica: **438 (la bilancia dice 12 kg in meno)**.
2. Cerca «01-05-1 TR-PED» e inserisci o verifica: **50**.
3. Cerca «Contato da» e inserisci o verifica: **il tuo nome**.
**Perché:** COSA IMPARI: LI11N: alla catasta F-02 mancano 12 kg. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Differenza −12 kg × 0,95 = 11,40 €: supera la tolleranza di 10 €, il documento chiede la riconta.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 69 — LI14: riconta F-02
**Dove entrare:** WMS → Inventari → Documenti → Registra la riconta. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 29/01/2027.
**Cosa fare, lentamente:**
1. Cerca «F-02 FERRO» e inserisci o verifica: **438 (un collega ripesa e conferma)**.
**Perché:** COSA IMPARI: LI14: riconta F-02. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Stato «contato»: la differenza è confermata da due conteggi indipendenti.
**Attenzione:** La riconta la fa un’altra persona: un errore di conta non deve diventare una scrittura.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 70 — LI20: chiudi l’inventario nel WMS
**Dove entrare:** WMS → Inventari → Documenti → Chiudi nel WMS. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 29/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **29/01/2027**.
**Perché:** COSA IMPARI: LI20: chiudi l’inventario nel WMS. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** F-02 ora riporta 438 kg; i 12 kg mancanti vanno nella zona differenze 999. Ubicazioni sbloccate. Ancora nessuna scrittura.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 71 — LI21: registra la differenza in contabilità (711)
**Dove entrare:** WMS → Inventari → Differenze inventariali → Registra. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 29/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data» e inserisci o verifica: **29/01/2027**.
**Perché:** COSA IMPARI: LI21: registra la differenza in contabilità (711). Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Movimento 711: D 65 Differenze inventariali / A 12 Materie prime 11,40. Contabilità e scaffale dicono la stessa cosa: 438 kg.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 72 — Trasferimento: 100 TR-PED al deposito esterno D200
**Dove entrare:** WMS → Deposito esterno e merce in viaggio → 1 · Crea il trasferimento. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 30/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Da dove parte» e inserisci o verifica: **dal magazzino W100 al deposito esterno D200**.
2. Cerca «Materiale» e inserisci o verifica: **TR-PED**.
3. Cerca «Quantità da trasferire» e inserisci o verifica: **100**.
4. Cerca «Data» e inserisci o verifica: **30/01/2027**.
5. Cerca «Arrivo previsto» e inserisci o verifica: **31/01/2027**.
6. Cerca «Pulsante» e premi/seleziona: **Crea il trasferimento**.
**Perché:** COSA IMPARI: Trasferimento: 100 TR-PED al deposito esterno D200. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Trasferimento UB001 e 2 compiti di prelievo per il deposito (2 pallet da 50, i più vecchi) verso la banchina GI-ZONE. Nessuna scrittura: la merce resta nostra.
**Attenzione:** La filiale vicino ai cantieri vuole avere le transenne pedonali a portata di mano. In SAP è un ordine di trasferimento (tipo UB) tra due depositi della stessa azienda.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 73 — RF: preleva i 2 pallet per il deposito
**Dove entrare:** WMS → Pistola RF → Compiti. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 30/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Data di lavoro» e inserisci o verifica: **30/01/2027**.
2. Cerca «Compiti» e inserisci o verifica: **i 2 «Prelievo per il deposito esterno» verso GI-ZONE**.
**Perché:** COSA IMPARI: RF: preleva i 2 pallet per il deposito. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** 100 TR-PED in banchina GI-ZONE: stato del trasferimento «prelevato, pronto da spedire».
**Attenzione:** Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Destinazioni e UdC si leggono dalla schermata, non si inventano.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 74 — Uscita 351: il camion parte, la merce è in viaggio
**Dove entrare:** WMS → Deposito esterno e merce in viaggio → 2 · Carica il camion. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 30/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Trasferimento» e inserisci o verifica: **UB001 · W100 → D200 · 100 TR-PED**.
2. Cerca «Data di partenza» e inserisci o verifica: **30/01/2027**.
3. Cerca «Pulsante» e premi/seleziona: **Registra l’uscita 351 (merce in viaggio)**.
**Perché:** COSA IMPARI: Uscita 351: il camion parte, la merce è in viaggio. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Stato 🚚 «IN VIAGGIO: non è né qua né là». Tabella per luogo, TR-PED: W100 200 + in viaggio 100 + D200 0 = 300 contabili. Nessuna scrittura.
**Attenzione:** La merce sul camion è nostra e a bilancio, ma non si può vendere da W100 e non è ancora nel deposito: per questo il sistema la mette in un posto a parte.
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 75 — Dove si trova? Le TR-PED sul camion
**Dove entrare:** WMS → Mappa delle ubicazioni → «🔎 Dove si trova?» TR-PED; poi WMS → Arretrato e scadenze. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 30/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Dove si trova» e inserisci o verifica: **TR-PED: 200 ✅ libere a scaffale; 100 ⛔ «SUL CAMION tra due depositi»**.
2. Cerca «Mappa» e inserisci o verifica: **in fondo il riquadro «Fuori dal magazzino W100»: IN-VIAGGIO con 100 TR-PED**.
3. Cerca «Arretrato» e inserisci o verifica: **data di oggi 30/01/2027: riquadro «5 · Merce in viaggio tra depositi», UB001 🟡 scade fra 1 giorno; con 01/02/2027 diventa 🔴 in ritardo**.
**Perché:** COSA IMPARI: Dove si trova? Le TR-PED sul camion. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Risultato da controllare:** 300 TR-PED in contabilità, ma solo 200 prelevabili da W100: le altre 100 non sono né qua né là.
**Attenzione:** Lettura: spunta a mano. È lo «stock in transito» della rete dei depositi che si studia nella MasterSupplyChain Academy.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 76 — Entrata 101 al deposito: il viaggio è finito
**Dove entrare:** WMS → Deposito esterno e merce in viaggio → 3 · Ricevi all’arrivo. Usa **«Apri ➜»** nel tutor.
**Data dello scenario:** 31/01/2027.
**Cosa fare, lentamente:**
1. Cerca «Trasferimento» e inserisci o verifica: **UB001 in viaggio**.
2. Cerca «Quantità contata all’arrivo» e inserisci o verifica: **vuoto = tutte le 100**.
3. Cerca «Data di arrivo» e inserisci o verifica: **31/01/2027**.
4. Cerca «Pulsante» e premi/seleziona: **Registra l’entrata 101**.
**Perché:** COSA IMPARI: Entrata 101 al deposito: il viaggio è finito. Esegui un comando reale nel gestionale: il tutor conferma soltanto quando trova l’operazione salvata.
**Risultato da controllare:** Stato «arrivato il 31/01/2027». TR-PED: W100 200 + in viaggio 0 + D200 100 = 300. Nessuna scrittura.
**Attenzione:** Se all’arrivo ne mancassero, la differenza andrebbe nella zona 999 e si registrerebbe con l’inventario (LI21).
**Spunta:** automatica dopo la transazione correttamente salvata; se non appare, verificare prima di ripetere.

### Passaggio 77 — Valorizza la rimanenza di ferro: FIFO, LIFO, costo medio, standard
**Dove entrare:** WMS → Inventari → Valorizzazione delle rimanenze. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Apri WMS → Inventario → Valorizzazione delle rimanenze.
2. Seleziona FERRO e controlla la giacenza finale dell'esercizio.
3. Confronta costo standard, FIFO, LIFO e costo medio.
4. Un unico prezzo d'acquisto rende uguali FIFO/LIFO/medio; prezzi diversi li differenziano.
5. Firenze: niente Dare/Avere; Pistoia: gli aspetti contabili si affrontano solo nei passaggi che li richiedono.
**Perché:** COSA IMPARI: Valorizza la rimanenza di ferro: FIFO, LIFO, costo medio, standard. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Lettura e ragionamento: spunta a mano. In questo sistema il magazzino è a costo standard; le differenze verso il prezzo pagato sono nel conto 63 (150 alla MIGO + 60 alla MIRO).
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 78 — Monitor: quadratura scorte contabili (IM) e WMS
**Dove entrare:** WMS → Monitor del magazzino. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «Confronto» e inserisci o verifica: **per ogni materiale quantità IM = somma delle UdC nel WMS**.
2. Cerca «Aree di passaggio» e inserisci o verifica: **GR-ZONE, GI-ZONE, Q-ZONE e PSA vuote; differenze 999 registrate**.
**Perché:** COSA IMPARI: Monitor: quadratura scorte contabili (IM) e WMS. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Risultato da controllare:** Tutte le righe «quadra»: TR-STD 0, TR-ALTA 50, TR-PED 300 (200 in W100 e 100 nel deposito D200), FERRO 438.
**Attenzione:** Lettura: spunta a mano.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 79 — Scorta minima: il ferro è sotto il minimo
**Dove entrare:** WMS → Scorta minima e riordino (l’avviso rosso compare anche nel Monitor). Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «Riga FERRO» e inserisci o verifica: **libera 438 + in arrivo 0 = 438 kg, minima 500, massima 3.000**.
2. Cerca «Stato» e inserisci o verifica: **🔴 SOTTO SCORTA: riordina**.
3. Cerca «Proposta» e inserisci o verifica: **3.000 − 438 = 2.562 kg**.
4. Cerca «Decisione» e inserisci o verifica: **la richiesta d’acquisto si farà a febbraio: in questo esercizio NON crearla**.
**Perché:** COSA IMPARI: Scorta minima: il ferro è sotto il minimo. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Risultato da controllare:** Avviso rosso in alto: «1 materiale sotto la scorta minima: FERRO → riordina 2.562 kg». Le transenne non hanno un minimo impostato: riga grigia.
**Attenzione:** Lettura: spunta a mano. Il ferro è sceso sotto il minimo dopo il prelievo per la produzione e i 12 kg mancanti all’inventario.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 80 — Libro giornale: la storia contabile del magazzino
**SOLO PISTOIA.** Questo è il controllo del libro giornale. Firenze lo salta: non si chiede agli allievi il Dare/Avere.

### Passaggio 81 — KPI di magazzino del mese
**Dove entrare:** WMS → Innovazione → KPI di magazzino. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «Leggi» e inserisci o verifica: **accuratezza dell’inventario, ordini perfetti, tempo dal ricevimento allo scaffale, compiti per risorsa**.
2. Cerca «Commenta» e inserisci o verifica: **quale KPI miglioreresti per primo e con quale tecnologia (RFID, ondate, slotting)?**.
**Perché:** COSA IMPARI: KPI di magazzino del mese. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Lettura: spunta a mano. Un KPI vale se dichiari perimetro, unità e denominatore.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

### Passaggio 82 — Consegna l’esercitazione al docente
**Dove entrare:** La mia area → Consegna il lavoro. Usa **«Apri ➜»** nel tutor.
**Cosa fare, lentamente:**
1. Cerca «Esercizio» e inserisci o verifica: **Magazziniere 5.0: un mese di magazzino**.
2. Cerca «Nota» e inserisci o verifica: **eventuali dubbi, errori corretti e la tua risposta sui KPI**.
**Perché:** COSA IMPARI: Consegna l’esercitazione al docente. Osserva e interpreta la schermata, poi spunta «✓ Fatto» quando hai davvero completato la verifica.
**Attenzione:** Il docente vede tutti i documenti, i compiti RF e le scritture. Spunta a mano dopo la consegna.
**Spunta:** manuale «✓ Fatto» dopo la verifica effettiva.

---
## Checklist prima della lezione
- [ ] Gli studenti di Firenze sono nuovi utenti e usano la tessera Firenze 30 ore.
- [ ] La ricostruzione contabile è **NO** a Firenze.
- [ ] Gli studenti di Pistoia usano la tessera completa e l'opzione contabile prevista dal docente.
- [ ] Il primo avvio mostra 200 TR-STD, 200 TR-ALTA, 300 TR-PED, FERRO zero.
- [ ] W100 attivato: 41 ubicazioni e 14 UdC.
- [ ] La mappa mostra TR-ALTA: 4 pallet × 50.
- [ ] La RF Interroga mostra TR-PED: 6 pallet × 50.
- [ ] Il docente sa distinguere spunta automatica da spunta manuale.
- [ ] Niente reset di account esistenti.
- [ ] La disponibilità delle UFC 7–9 va confrontata con il programma ufficiale Pistoia.

## Documento di controllo
Questa è una trascrizione didattica strutturata dei titoli, percorsi, campi e risultati presenti nel codice dell'esercizio. **Non sostituisce un collaudo end-to-end nel portale Railway**. Se un pulsante reale ha una denominazione diversa, fare riferimento alla schermata e segnalare la differenza invece di procedere a tentativi.
