# Magazziniere 5.0 — guida docente per la prima lezione

## Verifiche prima di entrare in aula

Il corso usa lo scenario fittizio Ferro & Transenne S.r.l. **gennaio 2027**. Non cambiare le date in base al calendario reale. Il percorso contiene 82 passi; UF 8 contabilità di magazzino, UF 9 inventario, UF 10 WMS e sistemi informativi, UF 11 innovazione, RFID, slotting, ondate e KPI.

1. Accedi con un account ALLIEVO DI PROVA dedicato e scegli sul Launchpad «Magazziniere 5.0: un mese di magazzino».
2. Entra in Sistema integrato → Avvio e dati di base → Avvio del sistema. Scegli la scheda **Percorso logistico · Magazziniere 5.0**. NON scegliere «Nuova azienda vuota (costituzione)».
3. Se l'account contiene già documenti, NON usare «Azzera» per ripristinare la prova: passa a un account vuoto. Le tile integrate condividono la stessa azienda.
4. Stabilisci con la classe, PRIMA di iniziare, se attivare «Ricostruzione delle scritture» = sì (completo) o no (solo operatività WMS).
5. Verifica le pagine WMS Struttura, Mappa, Etichette, Pistola RF; e che il pannello 📘 Esercizio passo passo mostri Magazziniere 5.0.
6. Dopo le attività prova «💾 Salva il lavoro fino a qui» e la ripresa. La sincronizzazione del cursore dipende da PostgreSQL.

## Prima dimostrazione: 60–90 minuti

**0–15 minuti.** Spiega la differenza: IM registra quantità e valore; WMS registra ubicazione e unità di carico (UdC); la RF interroga o conferma movimenti; la partita doppia serve solo per operazioni contabili.

**15–35 minuti. Passo 1, avvio.** Data 04/01/2027; «Avvia il percorso logistico» UNA VOLTA. Atteso: Banca 50.000 euro; prodotti finiti 22.785 euro; 200 TR-STD, 200 TR-ALTA, 300 TR-PED; ferro 0. Se la ricostruzione è attiva, completa Dare/Avere di apertura prima di avanzare. Non registrare una seconda apertura.

**35–50 minuti. Passo 2, attivazione WMS.** Magazzino → Struttura e attivazione, data 04/01/2027, attiva W100. Atteso: 41 ubicazioni e 14 UdC: quattro TR-STD, quattro TR-ALTA, sei TR-PED, da 50 pezzi ciascuna.

**50–70 minuti. Passi 3–4, mappa.** Magazzino → Mappa delle ubicazioni; leggere la posizione 01-03-1 come corsia/campata/livello. Ricorda GR-ZONE ricevimento; GI-ZONE spedizione; Q-ZONE quarantena; PSA-L1 bordo linea. Nel filtro «Dove si trova?» seleziona TR-ALTA: quattro pallet da 50, 200 pezzi disponibili. Sono controlli di LETTURA e richiedono la spunta esplicita «✓ Fatto».

**70–90 minuti. Passi 5–6, etichette e RF.** Magazzino → Etichette barcode e QR: differenza etichetta ubicazione e UdC. Pistola RF → «🔎 Interroga»: prova 01-03-1, poi un codice UdC presente sulla mappa, poi TR-PED (sei pallet da 50). Premere Invio. Nessun movimento contabile; dopo i controlli premere «✓ Fatto».

Se avanza tempo, apri SD → Ordini cliente: VA01 Beta 350 TR-STD contro una disponibilità di 200; poi Delta 150 TR-ALTA e Gamma 150 TR-STD. Spiega ATP e fabbisogno netto.

## Trappole successive e controlli da ricordare

- Scorta FERRO minimo 500 kg, massimo 3.000. Il sistema suggerisce il riordino, non emette automaticamente l'ordine ME21N.
- MIGO riceve merce; MIRO registra la fattura. I 150 kg di ferro danneggiato vanno in quarantena e non a scaffale.
- In RF PUTAWAY/PICK/STAGING/DEPOSITO, copiare origine, UdC, quantità e destinazione REALI dal compito; non inventare codici.
- Gli SSCC nascono in Spedizione → Imballo, dopo il prelievo; Beta 7 pallet e Delta 3, con 10 numeri SSCC diversi. Etichette GS1-128, poi Carico RF; il varco RFID simula il caricamento dei tre pallet Delta.
- Per il deposito esterno D200: trasferimento UB → conferma RF di due pallet → uscita 351, merce in viaggio → entrata 101 in D200. Non sono vendita né nuovo acquisto.
- Inventario: conta, riconta, chiusura WMS LI20, differenze contabili LI21.
- Alla fine controllare quadratura IM/WMS, FI Libro giornale, KPI e consegna al docente.

## Quando una spunta manca

Attività che genera un documento: deve risultare realmente registrata, verificata dal tutor. Un'attività di osservazione va invece confermata con «✓ Fatto». Non ripetere un movimento già contabilizzato per far apparire una spunta; controllare il documento e la verifica Dare/Avere. Il docente può ispezionare l'avanzamento e validare dopo verifica.

## Limite della verifica

Il repository contiene un test end-to-end (npm run test:magazziniere), ma questa guida non sostituisce il collaudo reale con un account vuoto su Railway. Il salvataggio finale storico nella cartella tests non comprende alcune aggiunte successive (scorte, regole imballo, piano camion, deposito D200): non è una prova definitiva di tutte le 82 attività.
