# Verifica MASTER SAP STYLE — CO/BPC, PP, costi, chiusura (7 novembre 2026)

## Riscontro dal codice esistente
- **Piano iniziale CO:** `erp_controllo/static/co-pagine.js` e `erp_costi/static/copc-logica.js`: KS03/KA03/OKB9 → KP06 (classe × centro) → KP26/LTP (ore) → KSU (ribaltamenti) → KSPI (tariffe) → CK11N/CK24 (standard).
- **Budget:** `erp_bpc/static/bpc-logica.js`: modello BPC alimentato dal KP06 versione 0; approvazione e trasferimento alla pianificazione CO, non registrazione FI. Il consuntivo ACTUAL è letto dalle scritture FI già esistenti.
- **Personale e fissi:** `erp_paghe/static/py-logica.js`: i conti 80, 81, 82 (retribuzioni, contributi e TFR) nascono con `cdc` per dipendente all’atto della contabilizzazione paga. `erp_costi/static/copc-logica.js` legge le righe FI, applica OKB9 quando manca il CdC, assegna gli altri costi primari, calcola quote ribaltate e tariffe. La pianificazione personale da paghe può essere copiata nel KP06 con `trasferisciPaghe`; non è un pagamento, né un secondo costo.
- **Rilevazione produzione:** `erp_produzione/static/pp-logica.js` contiene i 261 (consumo ferro o HALB, rif. ordine, D70/71 A magazzino), CO11N (ore e attrezzaggio con costo centro, D72/A75, trasferimento secondario), 101 (versamento prodotto, D magazzino/A73), TECO. La logica blocca il 101 di un ciclo con fasi incomplete.
- **HALB e FERT:** `app/static/js/erp/nucleo.js` contiene materiali HALB `SL-TAGLIO`, `SL-PIEGA` e FERT `TR-STD`. Il nuovo caso `wip-fasi-v1` usa un solo ordine TR-STD con fasi e non genera movimenti tra operazioni; casi pregressi possono avere veri semilavorati con ordini e stock separati. Distinguere il flusso in base allo scenario **senza creare falsi 101/261 intermedi**.
- **Chiusura:** `erp_chiusura/static/ch-logica.js` gestisce IVA, imposte e chiusura **annuale** del libro FI; `erp_costi/static/copc-logica.js` gestisce KGI2, KKS2, KO88 e Material Ledger per periodo. Le due chiusure non sono intercambiabili.

## Criticità architetturale riscontrata
Il motore comune `app/static/js/erp/nucleo.js` conserva `S.registrazioni` con documento e righe `conto`, `dareAvere`, `importo`, `cdc` eventuale e `partner` eventuale; `salva()` serializza lo stato nel `localStorage` e la shell del corso utilizza il layer di sincronizzazione quando configurato. Questo **non dimostra** che costi, ricavi e riclassifiche siano scritti in un nuovo database PostgreSQL con un'unica riga universale ACDOCA-like; non è stato individuato un motore denominato “AHSANA”.

La semplificazione **«tre colonne»** va chiarita: SAP S/4HANA non implementa ACDOCA con tre colonne fisiche. Una eventuale vista didattica a tre colonne (conto | oggetto FI/CO/commessa | importo) è una **proiezione**, non la struttura sufficiente di un Universal Journal. Servono ID movimento/documento, data/periodo, società, chiave di imputazione, segno D/A, contropartita, centro di costo, ordine, profit center, origine movimento e vincoli anti-duplicazione.

## Modifica effettuata in questa PR
Aggiunto `app/static/js/erp/tutor-laterale.js` con tutor per singolo campo/azione, guida fissa laterale, illuminazione widget, navigazione, accesso autonomo reversibile e preferenza memorizzata localmente. Integrato nella shell condivisa senza introdurre una seconda fonte dei conti e senza alterare il libro giornale.

## Lavori ancora necessari, da non considerare conclusi
1. Modellazione database relazionale/versionato del *universal journal*, mapping CO e CO-PA, unica origine dei movimenti e migrazione sicura dei progressi salvati.
2. Riconciliazione quantitativa per ogni commessa: salari e costi fissi FI → attribuzione CdC → ribaltamento → tariffa → ore CO11N + materiali 261 → costi ordine, 101 → accredito e giacenze → differenza/KO88; test di integrità per evitare costo duplicato.
3. Controllo delle riclassifiche costo/ricavo e margini (centro profitto, ordine cliente, centro di costo vero/statistico) nel medesimo schema contabile; test DB e UI.
4. Procedura di close **mensile** completa con prerequisiti bloccanti, registrazioni assestamento e riconciliazioni FI/CO/PP/MM; non confonderla con la chiusura annuale già presente.
5. Tutor progressivo con completamento verificato su evento salvato per ogni campo/passaggio: il tutor attuale è una guida manuale non un valutatore automatico dell'esito di ciascun passaggio.
