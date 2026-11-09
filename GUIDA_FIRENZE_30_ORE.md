# FIRENZE — Innovazione digitale nel magazzino · 30 ore

## DUE CORSI DISTINTI, STESSO MOTORE OPERATIVO

- **Firenze 30 ore**: esercizio «firenze-30», 81 attività operative simulate di SD, MM, PP, WMS,
  Spedizioni, Innovazione e valorizzazione FIFO/LIFO/costo medio/standard; **nessuna ricostruzione Dare/Avere**.
- **Pistoia 60 ore**: esercizio originale «magazziniere-5», invariato, 82 attività e possibilità
  di ricostruire le scritture del libro giornale.

Ogni esercizio ha **titolo, sequenza di spunte e avanzamento PostgreSQL separati**.
I dati del gestionale integrato sono invece condivisi **all'interno dello stesso account**:
assegnare account allievo diversi a Firenze e Pistoia; NON scambiare guida nello stesso
account come se fossero due aziende indipendenti. Le guide non cancellano dati.

## COME SI ENTRA (DOPO DEPLOY RAILWAY)

1. Aprire il portale MASTER SAP STYLE ed effettuare il login con un **account vuoto Firenze**.
2. Cliccare «Entra nel sistema integrato».
3. Nel Launchpad, cercare la tessera **🚀 FIRENZE · Innovazione digitale nel magazzino · 30 ore**.
4. La tessera apre **Avvio e dati di base** con il tutor Firenze selezionato.
5. Nel riquadro «Da dove vuoi partire?» è selezionato **Azienda già avviata**: trovare
   «Percorso logistico · Magazziniere 5.0».
6. Data di avvio: **04/01/2027** (data dello SCENARIO, non della lezione).
7. «Firenze · SOLO OPERATIVITÀ» deve indicare **NO** alla ricostruzione delle scritture.
   La modalità NO è preimpostata e forzata all'invio del modulo.
8. Premere **Avvia il percorso logistico** UNA sola volta.
9. Nel pannello «📘 Esercizio passo passo» comparirà il titolo
   **Firenze · Innovazione digitale nel magazzino — 30 ore**.
   Seguire i passaggi nell'ordine, con spunta obbligatoria prima di «Avanti».

**Primo risultato:** 200 TR-STD, 200 TR-ALTA, 300 TR-PED, ferro 0.
Attivare poi **WMS W100**, data 04/01/2027: 41 ubicazioni, 14 pallet
(4 TR-STD, 4 TR-ALTA, 6 TR-PED).
Interrogare la mappa, cercare TR-ALTA (4 pallet) e usare RF → Interroga.
I passaggi di sola lettura richiedono «✓ Fatto».

## PROGRAMMA 30 ORE — 6 MODULI DA 5 ORE

| Modulo | Ore | Competenze |
|---|---:|---|
| 1. Dal cliente al magazzino digitale | 5 | SD, ordini Beta/Delta/Gamma, ATP, ubicazioni, dati articolo |
| 2. Acquisti e ricevimento | 5 | Scorta minima, ME21N, MIGO, RF putaway, danni e quarantena, MIRO come documento |
| 3. Produzione e movimentazioni | 5 | PP, ordine di produzione, staging, prelievi 261, tre fasi, prodotti finiti, tracciabilità |
| 4. Ottimizzazione WMS | 5 | RF, spostamenti, quarantena, slotting, ondate, FIFO |
| 5. Spedizione intelligente | 5 | Consegne, packing, 10 SSCC Beta/Delta, piano di carico, RF, varco RFID, DDT |
| 6. Inventario, KPI e deposito esterno | 5 | Resi, inventario RF, riconta, ABC, deposito D200, monitor IM/WMS, KPI |

**Sequenza tecnica:** la guida operativa riutilizza l'ordine delle **81 attività** del
percorso logistico originale, per non rompere dipendenze tra documenti. La tabella
sopra raggruppa gli argomenti delle 30 ore; non è un nuovo ordinamento dei comandi.

## COME SPIEGARE IL GESTIONALE

Si tratta di un **simulatore didattico in stile SAP**, NON SAP originale,
NON collegato a un magazzino industriale.
Le operazioni modificano davvero lo stato simulato, con registrazioni di magazzino,
ordini, compiti RF, SSCC e vincoli tra processi. Il motore continua a tenere
la contabilità tecnica necessaria alla quadratura, ma a Firenze **non si insegna
né si valuta la partita doppia**.

## SE QUALCOSA NON SI SPUNTA

- Operazione automatica: verificare che il documento sia **già registrato**;
  NON ripetere il movimento. Verificare numero e stato del documento.
- Attività di lettura: premere **✓ Fatto** nel tutor, che sblocca «Avanti».
- Se appare un esercizio Dare/Avere a Firenze: l'account è stato avviato con
  la ricostruzione contabile attiva. **NON azzerare**: usare un account vuoto,
  selezionare Firenze e avviare con quiz NO.
- Il docente può controllare e convalidare i documenti nel monitoraggio
  degli allievi dopo una verifica effettiva.

## TEST DA ESEGUIRE PRIMA DELL'AULA

\`npm run test:magazziniere\`

Include lo smoke test della guida Firenze e i test storici di magazzino.
Un test che passa sul codice NON garantisce il corretto deploy Railway:
aprire la tessera Firenze, iniziare con un account di prova, compiere i primi sei
passi e verificare le spunte, la pistola RF e il salvataggio in PostgreSQL.
