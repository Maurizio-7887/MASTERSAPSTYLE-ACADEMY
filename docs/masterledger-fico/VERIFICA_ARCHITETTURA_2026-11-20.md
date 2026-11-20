# Verifica tecnica integrazione FI/CO — 20 novembre 2026

**Scadenza richiesta:** 10 dicembre 2026. **Stato: non pubblicabile ancora.**

## Fatti verificati
- Firenze: `Procfile` e `railway.json` avviano `gunicorn wsgi:app --workers 2 --threads 4 --preload`; health check `/health`.
- Firenze: `app/__init__.py` crea una factory Flask, registra numerosi blueprint e applica `app.before_request(accesso.controlla_accesso)`; la gestione accessi è proprietaria.
- MasterLedgerLight (archivio consegnato, fase FI/CO 3): `app.py` crea un'altra factory Flask, con Flask-Login, Flask-Migrate, CSRF e blueprint GL/AP/AR/assets/costs/SD/MM ecc.; il Procfile usa `start.sh` e la sua installazione ha dipendenze aggiuntive.
- Il bridge precedentemente aggiunto usa `flask_login.login_required`: **non è compatibile direttamente** con il modello di sessione del portale Firenze. Non registrarlo in produzione.

## Decisione architetturale
Un solo servizio Railway è plausibile, ma non è ancora verificato. Non importare MasterLedger come blueprint di Firenze. Una soluzione da provare in staging è un dispatcher WSGI per montare la seconda app sotto `/fico`, con prefissi URL, cookie/sessioni, migrazioni e configurazioni indipendenti. Alternative: adattamento modulare a blueprint solo dopo un audit approfondito. Il database FI/CO deve essere isolato da quello Firenze e dal database del cliente.

## Blocchi prima della pubblicazione
1. Trasferire il codice sorgente completo nel ramo dedicato (il solo bridge non basta).
2. Implementare il dispatcher WSGI e correggere redirect, static, CSRF, cookie e login.
3. Risolvere dipendenze e comando di avvio, eseguire migrazioni su DB di staging.
4. Verificare accesso, esercizio Firenze originale, MasterLedger, persistenza, multiutenza e test automatici.
5. Integrare i passi contabili effettivi del percorso `dicembre-wms`, senza inventare 162 passi.
6. Verificare permessi e configurazione Railway, creare staging, poi rilasciare con piano rollback.

## Piano a scadenza
- 20–24 novembre: audit sorgenti, import completo e isolamento dati.
- 25–29 novembre: dispatcher, login, asset statici, migrazioni.
- 30 novembre–4 dicembre: percorso FI/CO, test contabili e multiutenza.
- 5–8 dicembre: collaudo integrato, staging e correzioni.
- 9–10 dicembre: deploy controllato, smoke test e rollback pronto.

**Nota:** Questo è un piano tecnico, non una dichiarazione di test superati o deploy effettuato.
