# Academy FI/CO — integrazione additiva (8 blocchi)

## Modifiche effettuate
- Nuovo blueprint `/academy-fico` con manuale integrale per pagina, tutor e progresso nel browser.
- Mappa di copertura dei moduli già presenti e delle funzioni ancora da sviluppare.
- Un solo collegamento aggiuntivo nel menu Ledger.
- Nessuna modifica a `models.py`, `services`, migrazioni, scritture contabili, autorizzazioni esistenti o dati aziendali.
- Accesso riservato a utenti autenticati Ledger tramite gli stessi decorator del programma.

## Limiti
- Questa **prima integrazione** NON implementa i motori SAP mancanti (budget, forecast, profit center, ordini interni, simulazione delle transazioni).
- I contenuti del manuale sono fittizi/didattici e non vanno usati per contabilizzazioni reali.
- Il progresso è locale al browser (`localStorage`), non condiviso fra dispositivi.
- Il tutor apre funzioni MasterLedger esistenti; non esegue clic o registrazioni per l'utente.

## Test
`python -m compileall -q app.py blueprints/academy` e `pytest -q tests/test_academy_fico.py`.

## Prossima fase
Realizzare in modo additivo i moduli budget/versioni/scostamenti, forecast 9+3, ordini interni, profit center, allocazioni, checklist chiusure e prova pratica con 4 indicatori da 25 punti; per ciascuno introdurre test e migrazioni non distruttive.
