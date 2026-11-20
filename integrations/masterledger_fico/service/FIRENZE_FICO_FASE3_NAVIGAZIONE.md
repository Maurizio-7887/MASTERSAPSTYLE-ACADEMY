# Firenze FI/CO — Fase 3: collegamenti ERP, non importazione esercizio

Aggiunti dodici collegamenti di navigazione alle funzioni **esistenti** di MasterLedgerLight. Il laboratorio presenta un collegamento contestuale al modulo operativo in una nuova scheda. L'endpoint autenticato `GET /academy-fico/firenze/navigazione` restituisce gli endpoint e gli URL risolti dal routing Flask.

## Limiti espliciti
- I dodici passi `PREP-*` sono preparatori, **non** sono i circa 162 passi del percorso contabile originale `dicembre-wms`.
- Il report costi **non** equivale a un modulo budget; il giornale **non** equivale alla riconciliazione bancaria.
- La navigazione non registra operazioni, non importa aziende, non assegna voti, non certifica prove.
- Le schermate ERP di destinazione possono invece effettuare registrazioni se usate: occorre un'azienda didattica isolata e autorizzata, ancora da realizzare/verificare.
- Non sono state alterate tabelle, migrazioni, registrazioni o funzioni preesistenti.

## Prossime attività
Recuperare il sorgente esatto di `dicembre-wms` nella repository originale, ricostruire la sequenza e i risultati attesi, progettare istanze isolate per allievo, testare permessi e operazioni end-to-end prima di abilitare la prova.
