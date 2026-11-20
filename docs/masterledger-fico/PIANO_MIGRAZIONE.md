# MasterLedger FI/CO — integrazione nella Academy Firenze

## Stato
Fase di migrazione avviata su branch dedicato. **Il codice MasterLedger non è ancora copiato né distribuito**. Non modificare la branch principale prima dei test.

## Origine
Archivio fornito dall'autore: `MasterLedgerLight-main (1).zip` (251 elementi ZIP). Applicazione Flask con entrypoint `app.py`, blueprint separati per GL, AP, AR, assets, costs, SD, MM, materials, logistics, parties, payroll e bank_advances.

## Obiettivo
Percorso evolutivo per ragionieri:
1. ERP integrato esistente, esercizio Firenze.
2. MasterLedger FI/CO autonomo, stessa traccia contabile e risultati attesi.
3. Confronto, verifica e valutazione senza interferire con il percorso originale.

## Vincoli non negoziabili
- Conservare tutte le funzionalità del gestionale originale e della Academy.
- Non importare dati, credenziali, database, file .env, chiavi o sessioni del cliente.
- Evitare collisioni tra factory Flask, blueprint, migrazioni e tabelle SQL.
- Isolare i dati di ogni allievo e impedire reset globali.
- Mantenere separate le operazioni reali del gestionale dalle simulazioni e dalla valutazione.
- Non inventare la sequenza dei 162 passi: estrarla dalla sorgente originale, con test sui numeri di controllo.

## Architettura proposta
- Montaggio come servizio Flask separato, con URL dedicato o proxy `/fico/`, anziché importare `app.py` nella factory esistente.
- Database e segreti dedicati, con utenti federati solo dopo una verifica di sicurezza.
- `/academy/fico`: pagina di ingresso dal portale Firenze, solo dopo verifica dei percorsi reali.
- Manifest di esercizio versionato: ID passo, area, comando, precondizioni, azione, attesi, criteri di verifica.
- Rubrica: quattro indicatori da 25 punti, valutati solo da verifiche reali.

## Passaggi necessari prima del merge
1. Importazione controllata dell'archivio sorgente in `integrations/masterledger_fico/`, esclusi segreti e artefatti generati.
2. Identificazione della guida `dicembre-wms` e delle sue varianti; ricostruzione fedele dei passi contabili.
3. Test di avvio Flask, migrazioni su DB vuoto, isolamento utenti e percorsi contabili.
4. Collegamento UI con URL e autorizzazioni verificate.
5. PR e revisione prima di ogni merge in main.

Questo documento è il punto di partenza della migrazione e **non certifica il funzionamento dell'integrazione**.
