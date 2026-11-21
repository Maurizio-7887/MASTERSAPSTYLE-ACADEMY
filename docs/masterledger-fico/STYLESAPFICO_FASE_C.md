# STYLESAPFICO — verifica del piano e Fase C (primo percorso verticale)

Data: 21 novembre 2026. Ramo: `stylesapfico-fase-c-percorso-b8`.

## 1. Verifica del piano Tasklet (21/11/2026)
Controllato sul codice reale del repository (non sull'archivio zip):
- Confermato: il FI/CO è un'app Flask separata (`integrations/masterledger_fico/service`), montata solo con `MASTERLEDGER_FICO_ENABLED=1`.
- Confermato: KP06, KO01, KE51, KSU5, KSV5, CK11N, F-03 sono «previsti», non realizzati; OX02 e OB62 assenti; F110 rimanda allo scadenzario.
- Confermato: piano dei conti, soggetti e centri di costo sono condivisi; prima di questa fase non c'era isolamento tra allievi.
- Confermato: F-28/F-53 chiudono solo documenti interi; il parziale è nello Scadenzario.
- Confermati i due errori del Blocco 7 p. 4: residuo clienti **4.880** (non 6.100); saldo estratto conto **18.400** (non 19.400). Errata corrige aggiunta alla pagina del manuale.
- Ricalcolati tutti i risultati del Blocco 8: corretti (51.500 per lato, banca 50.000, crediti 26.000, debiti 18.000, impianti netti 23.500, risultato 1.500, totale 99.500, CC-PROD 13.500 / CC-AMM 3.000).
- Precisazione al piano: i testi degli 8 PDF sono già in `blueprints/academy/manual.json`; la Fase A può procedere senza altro materiale.

### Difetti trovati in più rispetto al piano
1. **Numerazione documenti**: DR e DZ usano lo stesso prefisso «14» con sequenze separate. Con un'azienda valorizzata, il secondo documento violava il vincolo `(doc_number, company_id)`. Corretto in `services/posting.py`: si avanza al primo numero libero, senza cambiare i prefissi.
2. **Data dei pagamenti parziali**: lo Scadenzario registrava sempre alla data di oggi. Aggiunto il campo facoltativo «Data di registrazione» (vuoto = oggi, comportamento invariato).
3. **Deploy unico senza migrazioni FI/CO**: `gunicorn wsgi:app` non esegue `service/start.sh`. Il loader ora applica le migrazioni del solo database FI/CO all'avvio (disattivabile con `MASTERLEDGER_FICO_AUTO_UPGRADE=0`); un errore viene registrato senza fermare il portale. Il seed NON viene eseguito automaticamente: crea utenti demo con password note.
4. Lo storno (FB08) registra sempre alla data odierna, non nel periodo del documento: da trattare nella Fase D (Blocco 2/7).
5. I periodi contabili sono globali (campo `company` testuale), non per azienda didattica: la chiusura del Blocco 7 dovrà gestirli per sessione.

## 2. Realizzato in questa fase
- **Sessione di pratica personale** (`AcademySession`): ogni persona, docente compreso, ha un'azienda didattica propria (`AC000001`, …) con le 3 scritture di apertura (crediti e debiti iniziali attribuiti a partner iniziali dedicati, conto di apertura che si azzera).
- **Catalogo versionato** `blueprints/academy/percorsi/b8_settembre_2028.json`: 12 passi obbligatori con ID stabili, fonte (blocco/pagine), struttura guida in 10 punti e criterio di verifica.
- **Validatori server** (`services/academy_percorso.py`): leggono documenti e righe della sola azienda della sessione; controllano soggetto, data, conti per ruolo, Dare/Avere, centro di costo, righe non previste (es. IVA), doppioni, residuo della partita, saldi, costi per centro, quadratura del mese, risultato, totale patrimoniale.
- **Avanzamento nel database** (`AcademyStepResult`): conteggio idempotente, ripresa da altro dispositivo, rivalutazione automatica dopo storni (passo «non più valido»).
- **Pagina guida** `/fico/academy-fico/percorso/<id>`: contatore «C / N — P%», «Apri la funzione» in seconda scheda, «Verifica il mio passo», tre modalità (studio, allenamento, prova autonoma senza dettagli), banner «AMBIENTE FORMATIVO — DATI SIMULATI».
- **Vista docente** in sola lettura `/fico/academy-fico/percorso/classe` (ruolo commercialista), aggiornamento ogni 60 secondi.

## 3. Test
`cd integrations/masterledger_fico/service && pytest -q` → 103 passati (95 preesistenti + 8 nuovi): percorso completo al 100% dalle schermate reali, errori diagnosticati, doppio clic non conteggiato, IVA e centro di costo, storno che invalida, isolamento tra allievi, prova autonoma, coerenza del catalogo. Migrazioni verificate su database vuoto.

## 4. Per andare online
1. Su Railway: database PostgreSQL dedicato e variabili `MASTERLEDGER_FICO_ENABLED=1`, `MASTERLEDGER_FICO_DATABASE_URL`, `MASTERLEDGER_FICO_SECRET_KEY` (diverse da quelle del portale).
2. Primo avvio: le migrazioni partono da sole. Una volta sola, creare piano dei conti e mappature (`flask --app app seed` dalla shell del servizio) e **cambiare subito le password degli utenti demo** o disattivarli.
3. Creare gli utenti allievi nel FI/CO (accesso coordinato con il portale: Fase B, da fare).

## 5. Prossime fasi (dal piano)
- Fase B: accesso unico portale → /fico, utenti allievi, CSRF/logout coordinati.
- Fase D: blocchi 1–4 (OX02/OB62 didattici, F-02, storni nel periodo, aging/DSO, cespiti con run simulato e dismissioni).
- Fase E: blocchi 5–6 (profit center, ordini interni, ripartizioni, versioni di budget, forecast 9+3) riusando la logica BPC del portale.
- Fase F: blocchi 7–8 completi (checklist di chiusura per sessione, varianti con errori intenzionali, variante 800).
