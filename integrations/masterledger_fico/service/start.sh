#!/bin/sh
# Aggiorna lo schema prima di avviare l'app. Se l'aggiornamento non riesce,
# l'avvio si interrompe: è più sicuro che lavorare con uno schema incompleto.
set -e
flask --app app db upgrade
# Popola/completa il Piano dei Conti, gli utenti demo e la configurazione
# Paghe. È idempotente (salta tutto ciò che esiste già, vedi seed.py), quindi
# è sicuro rilanciarlo ad ogni deploy — senza questo passo, gli account che
# vivono SOLO in seed.py (banca, cassa, crediti, debiti, IVA, personale,
# utenze...) non venivano mai creati in produzione, restando dipendenti da
# un comando manuale che nessuno lanciava più dopo il primo giro.
flask --app app seed
# --workers 3 --threads 4: senza questo, gunicorn parte con UN SOLO worker
# sincrono di default — l'intera app gestisce una richiesta alla volta.
# Con un solo worker, una singola chiamata lenta verso un servizio esterno
# (MasterLogistic-WMS, IronProduction, OpenAI) blocca TUTTI gli altri
# utenti e TUTTE le altre pagine finché non finisce, anche se quella
# chiamata ha un timeout — per la durata del timeout, l'intero sistema è
# fermo per chiunque. Con più worker/thread, una richiesta lenta rallenta
# solo se stessa, non tutte le altre.
# --timeout 30: se un worker non risponde entro 30s viene riavviato da
# gunicorn — rete di sicurezza contro un blocco totale anche se qualche
# chiamata esterna dovesse restare appesa oltre il suo timeout previsto.
exec gunicorn --bind "0.0.0.0:${PORT:-8080}" --workers 3 --worker-class gthread --threads 4 --timeout 30 app:app
