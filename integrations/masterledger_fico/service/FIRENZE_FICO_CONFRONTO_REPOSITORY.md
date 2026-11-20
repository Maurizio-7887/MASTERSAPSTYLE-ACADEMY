# Firenze FI/CO — confronto con la repository originale

**Fonte consultata il 19/11/2026:** `Maurizio-7887/MASTERSAPSTYLE-ACADEMY`, `README.md` (tramite collegamento GitHub).

Il README distingue `dicembre-wms` (sistema integrato con ragioneria) dai percorsi `dicembre-magazzino-30` e `dicembre-magazzino` per magazzinieri. Non vanno fusi. Descrive Ferro & Transenne con costituzione il 01/12/2026 e le aree FI, CO, SD, MM, PP, WMS, tesoreria e personale.

**Limite della verifica:** il README non contiene l'elenco completo dei passaggi contabili. Il tentativo di recuperare `guida/static/esercizi/dicembre-wms.js` non ha restituito il file. Pertanto non è stata verificata la corrispondenza dei presunti 162 passi e non sono stati inventati dati, registrazioni o risultati attesi.

## Modifiche additive

- `blueprints/academy/scenarios/firenze_source_alignment.json`: matrice preliminare di nove aree, con provenienza e blocchi di sicurezza.
- `services/firenze_scenario.py`: caricamento validato della matrice.
- `blueprints/academy/routes.py`: endpoint autenticato `GET /academy-fico/firenze/allineamento`.
- `templates/academy/firenze.html`: collegamento alla matrice.
- `tests/test_firenze_source_alignment.py`: test di provenienza e blocco voti/scritture.

Non sono stati modificati modelli SQL, migrazioni, logiche di registrazione, dati aziendali o le altre route. La matrice non è una prova certificata e non può assegnare punteggi.

## Lavoro successivo

Reperire il file effettivo della guida contabile Firenze e confrontare tutti i passi con i comandi MasterLedgerLight; quindi progettare sessioni isolate per allievo e test end-to-end.
