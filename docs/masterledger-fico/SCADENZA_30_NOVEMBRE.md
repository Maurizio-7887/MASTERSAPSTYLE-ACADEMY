# Nuova scadenza operativa — 30 novembre 2026

Richiesta: anticipare il rilascio dell'integrazione MasterLedger FI/CO nella Academy Firenze al **30 novembre 2026**.

## Priorità
1. 20–22 novembre: importazione completa e sicura del codice MasterLedgerLight sul ramo dedicato.
2. 23–25 novembre: integrazione compatibile con un solo servizio Railway; gestione separata di sessioni, database, migrazioni e URL.
3. 26–27 novembre: test funzionali contabili, accessi e regressione Firenze.
4. 28–29 novembre: staging, correzioni e piano di rollback.
5. 30 novembre: obiettivo deploy controllato e smoke test.

## Criteri di accettazione
- L'esercizio Firenze originale continua a funzionare.
- MasterLedger FI/CO è raggiungibile e utilizzabile, non solo una pagina ponte.
- Nessun dato o segreto del cliente trasferito.
- Sessioni e database isolati, utenti distinti senza contaminazione.
- Test contabili e percorso docente/allievo verificati.
- Possibilità di rollback immediato.

**Stato:** calendario aggiornato. La scadenza è un obiettivo, non una certificazione di deploy completato. Se l'integrazione non supera i test, non esporre il gestionale agli allievi.
