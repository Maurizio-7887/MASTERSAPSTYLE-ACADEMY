# Firenze FI/CO — Fase 1: struttura additiva

- Nuovo percorso `/academy-fico/firenze`, accessibile solo agli utenti Ledger autenticati.
- Dati preparatori in `blueprints/academy/scenarios/firenze_template.json`.
- Tutor a tre colonne, note locali per singolo passo e pulsante successivo.
- Quattro indicatori di valutazione da 25 punti. **Nessun voto assegnato senza risultati attesi verificati.**
- Endpoint JSON `/academy-fico/firenze/dati` e verifica `/academy-fico/firenze/verifica/<step_id>`; controllo solo su evidenze verificate.
- Nessuna modifica ai modelli, alle migrazioni o alle registrazioni contabili.

## Passaggio obbligatorio prima dell'esame Firenze

La repository Firenze con la consegna completa dei circa 162 passaggi **non è stata fornita in questo ZIP**. Le 12 attività sono una traccia di predisposizione e **non sostituiscono** i passi originali. Importare e confrontare l'esercizio originale, associare ciascun passo alle funzioni ERP, verificare conti e dati iniziali, predisporre una società didattica isolata, implementare i moduli FI/CO mancanti e solo allora abilitare la valutazione certificata.

## Test

`python -m pytest -q tests/test_firenze_preparazione.py tests/test_academy_fico.py`
