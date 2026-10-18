# Aggiornamento Pistoia — solo sistema integrato

## Produzione: ordine unico a operazioni e semilavorato autonomo

Nelle **nuove costituzioni** (`produzioneModello: wip-fasi-v1`) l'esercizio
**Dicembre: dalla costituzione alla riapertura** distingue due percorsi:

- **TR-STD, 300 pezzi:** un ordine con le operazioni 0010 Taglio, 0020 Piegatura
  e 0030 Saldatura. Tre dichiarazioni CO11N distinte, con quantità e ore, sullo
  stesso ordine. Le fasi non generano carichi/scarichi di semilavorati.
  Dopo il prelievo di 2.400 kg, il saldo analitico cresce da 2.280 a 4.380,
  6.060 e 9.420 euro. Il 101 carica soltanto i pezzi che hanno terminato il ciclo;
  sono ammessi versamenti parziali di pezzi finiti. Il totale dell'esercizio è 300.
- **SL-TAGLIO, 20 kit:** ordine autonomo, prelievo 160 kg, 5 ore di taglio,
  versamento 101 al magazzino semilavorati per 292 euro e messa a scaffale WMS.
  Questi kit restano a scorta: non sono le fasi della transenna e non vengono
  prelevati per l'ordine TR-STD. La successiva conta dell'esercizio trova 19 kit.

Il **WIP analitico** esposto è il saldo dei costi imputati meno gli accrediti
dei versamenti per ordini ancora in lavorazione. È una rappresentazione
didattica: **non** è un calcolo SAP completo delle rimanenze di fine periodo e
non genera una capitalizzazione FI automatica. A DLV/TECO il saldo residuo è
trattato dal percorso di varianze/liquidazione, non come WIP aperto.

Gli esercizi già iniziati e le consegne storiche conservano distinta, ordini,
guida e numeri attesi precedenti. Non ci sono migrazioni o azzeramenti automatici.
Per svolgere il nuovo percorso occorre iniziare una nuova costituzione nello
spazio didattico appropriato, dopo aver conservato il lavoro precedente; non
usare «Azzera» per aggiornare un lavoro in corso. I percorsi storici/offline e
gli altri esercizi integrati non vengono convertiti in questo intervento.

Test mirati: `npm run test:dicembre-wms` (con dipendenze Python installate),
più le regressioni integrate esistenti. La fixture
`tests/fixtures/dicembre-wms-legacy.json` contiene esclusivamente dati sintetici
prodotti dal test della versione precedente, per verificare la compatibilità.

La home e il launchpad mostrano soltanto il sistema integrato. Le tile SD, MM,
PP, WMS, FI, CO, tesoreria, valute, personale e dati di base lavorano nello
stesso slot `erp-ft`, con un solo libro giornale. Le guide avviate dalle tile
usano `s4-integrato`, non l'esercizio del vecchio sistema.

Avvio: aprire la home, scegliere **Entra nel sistema integrato**, poi **Avvio e
dati di base**. Se esiste già lavoro integrato, riprenderlo senza reinizializzare
l'azienda. Per il WMS attivare W100 da **Struttura e attivazione**, quando previsto
dall'esercizio. Restano valide le istruzioni di installazione riportate sotto.

Non sono stati cancellati né convertiti i dati classici. Codice, URL storici,
guide e materiali offline sono conservati per compatibilità, ma rimossi dal
percorso ordinario; chi possiede un vecchio URL può ancora aprirlo dopo il login.
Le consegne pregresse restano leggibili; nella nuova consegna compare prima
l'integrato e, solo se già salvati, gli archivi precedenti. Il docente conserva
gli strumenti di gestione degli archivi. Nessuna migrazione del database.

Gli URL tecnici `/vuoto/` e `/completo/` restano compatibili: per le funzioni ERP
sono due indirizzi dello stesso stato integrato, non due aziende. Nei menu non
si sceglie più una versione. Non tutte le funzioni del classico hanno un
equivalente nell'integrato: non sono state inventate o trasferite in questa
modifica. Il programma rimane un simulatore didattico, non SAP certificato.

---

# MASTERSAPSTYLE ACADEMY

Portale dei simulatori didattici in stile SAP di Maurizio Gustinicchi Consulting.
Primo simulatore: **Ferro & Transenne** — contabilità generale, controllo di gestione, vendite, acquisti e produzione a tre fasi.

## Aggiornamento navigazione WMS — 15 ottobre 2026

- I quattro moduli **SD, MM, PP e WMS** sono in evidenza nella prima sezione del launchpad, allo stesso livello. Tutti gli altri moduli restano accessibili nella sezione successiva.
- WMS ha titolo breve e colore dedicato; conserva tutte le app esistenti, raggruppate per fase operativa.
- La pagina WMS include accessi rapidi all'avvio e agli ordini SD/MM/PP del **sistema integrato**. I dati di quel sistema non sono i dati del percorso classico: non viene effettuata alcuna fusione o migrazione.
- Questo aggiornamento modifica la navigazione, non le regole contabili o di movimentazione. Nessuna migrazione del database richiesta; nessun intervento sui salvataggi.
- Il WMS era già registrato come modulo: non è stato creato un secondo WMS.
- Test mirato: `python tests/test_launchpad_wms.py`. Si aggiunge ai test esistenti.

## Struttura: una cartella per attività, una pagina HTML per ogni pezzo

```
app/
  __init__.py            create_app(): registra i blueprint
  pagine.py              REGISTRO di attività e pagine (menu, URL, aree FI) e dei MODULI del launchpad — si parte da qui
  simulatore.py          versione nell'URL (/vuoto/… /completo/…) e rendering comune
  templates/simulatore/base.html   shell Fiori, menu attività, caricamento ordinato dei JS
  templates/simulatore/_shell.html shell bar in stile SAP Fiori (comune a launchpad e pagine)
  static/css/fiori.css             shell, launchpad a mattonelle e pelle Fiori delle schede
  static/js/launchpad.js           indicatori delle mattonelle letti dai dati dello studente
  static/js/ponte-fantasmi.js      prima del simulatore: elementi delle altre pagine
  static/js/ponte-pagine.js        dopo il simulatore: passaggio fra pagine con coda delle azioni
  db.py                  database: utenti, sessioni di collegamento, lavoro salvato, consegne (PostgreSQL su Railway, SQLite in locale)
  accesso.py             chi è collegato, pagine pubbliche, protezione CSRF, solo_docente
  report.py              report del lavoro dallo stato del simulatore: confronto con i numeri attesi, controlli, verifica, giornale
  esercizi.py            esercizi consegnabili e loro numeri di controllo
  laboratori.py          pagine dei laboratori (static/js/lab-motore.js: motore comune, libro giornale proprio)
  blueprints/
    accessi/         /accesso, /esci, /password (blocco dopo 5 tentativi, cambio password al primo accesso)
    sincronia/       /api/stato/<versione> e /api/battito + static/sincronia.js (lavoro sul server, tempo di collegamento)
    allievo/         /area/: tempo, lavoro salvato, consegna, risposte del docente
    alta_varieta/    LABORATORIO Alta varietà: tre transenne sullo stesso telaio, strategia 70/50, WIP, varianze KKS2, cruscotto, buffer DDMRP, confronto con la commessa lunga
    ripetitiva/      LABORATORIO Produzione ripetitiva (modello trattore): budget 4.000, versioni di produzione, collettori KKF6N, MFBF con backflush, WIP al target, KKS6/KK87
    erp_dati/        SISTEMA INTEGRATO S/4 · Dati di base: avvio (saldi di apertura), clienti e materiali, condizioni VK11/VK13 e procedura ZFT001 (V/08), ruoli e autorizzazioni PFCG/SU53 (static/js/erp/ruoli.js)
    erp_vendite/     S/4 · Vendite: VA01 con determinazione prezzi, acconti F-37/F-29 (CoGe speciale, AZWB), VL01N 601, VF01, resi RE/651, abbuoni G2 con blocco, F-28/FBL5N, flusso documenti, controllo di disponibilità ATP (V_V2) e controllo crediti (fido, VKM1, FD32)
    erp_copa/        S/4 · CO-PA: KE30 margine di contribuzione I e II per cliente/materiale/regione/canale, KE24 righe singole
    erp_acquisti/    S/4 · Acquisti: richieste ME51N con approvazione ME54N, ME21N con rilascio ME29N sopra soglia, MIGO 101 a standard con differenza prezzo (conto 63), MIRO con WE/RE
    erp_produzione/  S/4 · Produzione: CO01 con costi pianificati, 261, CO11N (attrezzaggio + lavorazione), 101, TECO
    erp_costi/       S/4 · CO-PC: scheda di calcolo con sovraccosti, CK11N/CK24 con rivalutazione, KGI2, KKS2 (anche varianza di lotto), KO88, Material Ledger CKM3/CKMLCP a più livelli
    erp_magazzino/   S/4 · WMS in logica SAP: W100, tipi magazzino 902/001/002/100/916/999, ubicazioni, quanti, UdC, compiti con strategie, pistola RF (pistola vera in modalità tastiera o fotocamera), monitor, etichette Code 128 / QR, merce bloccata e quarantena (344 / 343 / 555), numeri di serie IQ03 (profilo Z001 sulla TR-ALTA), lotti (colata, lotto di produzione) e tracciabilità a monte e a valle
    erp_inventario/  S/4 · Inventari fisici e contabili (UF 9): documenti annuale / a rotazione ABC / ubicazione vuota, lista cieca, conta e riconta, 999, LI21, valorizzazione FIFO-LIFO-CMP-standard
    erp_spedizione/  S/4 · Spedizione (UF 10): monitor VL06O con stati A/B/C, lista di prelievo FIFO, imballo in colli con SSCC GS1 ed etichette GS1-128, trasporto VT01N, carico con lettura degli SSCC (RF), uscita merci del trasporto, DDT (D.P.R. 472/96)
    erp_innovazione/ S/4 · Innovazione logistica (UF 11): KPI di magazzino, slotting ABC per righe di prelievo, prelievo a ondate a serpentina, cross-docking, varco RFID (EPC SSCC-96)
    erp_tesoreria/   S/4 · Tesoreria: partite aperte con scadenze e anzianità, posizione e previsione di liquidità, F110 con file SEPA pain.001, estratto conto elettronico con abbinamento automatico e FEBAN, Ri.Ba. salvo buon fine e insoluti, factoring pro soluto / pro solvendo
    erp_cespiti/     S/4 · Cespiti: acquisto con fattura (AS01 + F-90), registro AW01N, ammortamento AFAB pro rata, cessione con plus/minusvalenza
    erp_chiusura/    S/4 · Liquidazione IVA mensile o trimestrale e F24, IRES, chiusura dell'esercizio (epilogo 90, risultato 32, chiusura 91) e riapertura (92)
    erp_valute/      S/4 · Valute: tassi OB08, fatture FB70/FB60 in USD (art. 7-ter, reverse charge TD17), differenze cambio realizzate, valutazione FAGL_FCV con storno
    erp_paghe/       S/4 · Paghe: dipendenti, presenze, cedolino (IRPEF 2026, detrazioni, cuneo, INPS, INAIL, TFR, ferie e ROL, ratei, progressivi, tredicesima, conguaglio di fine anno), registrazione per centro di costo, stipendi, F24
    erp_fi/          S/4 · Contabilità: libro giornale, bilancio di verifica, fattura elettronica SdI (FatturaPA), storni VF11/VL09/MBST/MR8M/CO13/LT15/FB08 (dopo lo SdI solo nota di credito)
                     (un solo stato «erp-ft» e un solo libro giornale per tutti i moduli S/4: static/js/erp/nucleo.js)
    formazione/      «Che situazione hai?»: una lezione per ogni situazione aziendale (sintomi, diagnosi, concetti, esempio, schema, SAP, domande), poi il laboratorio preparato al passo giusto (static/js/lab-copioni.js)
    guida/           finestra «Esercizio passo passo» sopra il simulatore: static/esercizi/<esercizio>.js (passi + spunta automatica), pannello.js/.css
    docente/         /docente/: allievi, tempi e costi (CSV), correzione, report stampabile, risposta (anche via email)
    portale/         pagina iniziale e launchpad a due livelli: moduli FI CO SD MM PP HR… (/<versione>/) → app del modulo (/<versione>/m/<modulo>), materiali, /<versione>/tutto, motore comune (stato, avvio)
    impostazioni/    azienda, centri di costo, distinta base, stato patrimoniale iniziale
    pianificazione/  budget annuo, bilancio previsionale, fabbisogno PP/MM
    contabilita/     FI-GL, FI-AA, FI-AR, FI-AP, FI-BL (RiBa, factoring), area fiscale, impostazioni FI, FB50
    controllo/       CO-CCA budget dei centri, report centri di costo, commesse, controllo mensile
    personale/       HR → FI/CO paghe
    vendite_acquisti/ SD/MM ordini, ATP, credito, DDT, fatture, RFQ, MIGO, MIRO
    produzione/      PP tre fasi, MRP, CO88
    reportistica/    libro giornale, mastro, bilancio di verifica
```
Ogni blueprint contiene:
- `__init__.py` — le sue rotte, una per pagina;
- `templates/<attività>/<pagina>.html` — una pagina HTML per ogni pezzo;
- `templates/<attività>/_sezioni/` — il markup della scheda originale (generato);
- `static/<versione>/NN-*.js` — il JavaScript del modulo di cui è proprietario (generato).

I file JS restano **script classici caricati nell'ordine numerico originale** (01 → 19): condividono lo stesso stato (`STATO` nel `localStorage` del browser), quindi i dati inseriti in una pagina si ritrovano in tutte le altre.

## Aggiornare il simulatore
Il programma nasce come file unico HTML (offline). Per una nuova versione:
1. sostituisci `sorgenti/simulatore-vuoto.html` e `sorgenti/simulatore-completo.html`;
2. `python tools/split_simulatore.py` rigenera JS, CSS, schede e mappa degli id;
3. `npm test`.

I due file unici sono anche scaricabili dalla pagina iniziale, per l'uso senza internet.

## Test
```bash
pip install -r requirements.txt
npm install
npm test
```
| Test | Cosa verifica |
|---|---|
| `test:rotte` | tutte le pagine rispondono, con la loro scheda e tutti i JS |
| `test:file-unico` | i 48 passi dell'esercizio guidato nel file originale |
| `test:blueprint` | gli stessi 48 passi con i JS spezzati (pagina /vuoto/tutto) |
| `test:multipagina` | gli stessi 48 passi passando davvero da una pagina all'altra |
| `test:ponte` | i salti fra pagine (SD → FI-AR, Fabbisogno → PP, Giornale → MIRO…) arrivano a destinazione |
| `test:laboratori` | i due laboratori eseguiti per intero: WIP 3.900, varianze 252, buffer 225/525/725; piano 167/100/67, WIP 404, varianze 132,20 |
| `test:s4` | il sistema integrato S/4 eseguito dalle pagine (moduli e pulsanti): gennaio (MdC I 19.946, MdC II 18.593,81) e febbraio (standard 34,47, varianze 611,73, lotto 61,60, Material Ledger 186,33 al venduto, MdC I effettivo 9.339,87), guida, lezioni |
| `test:accessi` | accesso, cambio password, blocco, tempo e costo, salvataggio del lavoro, consegna, report 15/15, stampa, risposta |
| `test:guida` | i passi della finestra si spuntano tutti sullo stato finale dell'esercizio e nessuno su un'azienda nuova |
| `test:sincronia` | sincronia.js: stato dal server, salvataggio, lavoro non ancora salvato, cambio di allievo sullo stesso browser |

I numeri di controllo della guida (varianze 476, utile 1.611,43, IRES 508,87, banca finale 74.095,13) sono verificati a ogni esecuzione: se il simulatore cambia, il test dice se la guida va aggiornata. Il sorgente della guida è `app/static/docs/guida-sorgente.html`.

## Accessi, tempo di collegamento e correzioni
- **Docente**: crea gli allievi (nome utente + password temporanea, cambiata al primo accesso), imposta il costo orario generale o per allievo, vede tempo e costo potenziale (ore × €/ora, filtrabile per periodo, CSV per Excel).
- **Tempo**: ogni pagina aperta in primo piano manda un battito al minuto; conta solo se l'allievo ha usato mouse o tastiera negli ultimi 10 minuti, un battito vale al massimo 2 minuti, dopo 5 minuti di silenzio si apre una nuova sessione.
- **Lavoro**: lo stato del simulatore (lo stesso del backup JSON) si salva sul server a ogni modifica; l'allievo lo ritrova da qualsiasi computer. Uscendo, i dati vengono tolti dal browser.
- **Esercizio passo passo**: in basso a destra il pulsante 📘 apre una finestra con il passo da fare (pagina, campi, scrittura attesa); i passi si spuntano da soli leggendo i dati e la finestra riparte dal punto giusto.
- **Passa il lavoro**: il docente passa il proprio lavoro a uno o più allievi (o prende quello di un allievo); il lavoro sostituito resta in archivio e si ripristina.
- **Consegna**: l'allievo consegna una fotografia del lavoro (o un backup JSON del file offline) scegliendo l'esercizio. Il docente apre il report — numeri attesi ✓/✗, controlli Dare = Avere, bilancio di verifica, libro giornale — lo stampa in A4 o PDF, scrive correzione e voto: l'allievo li legge nella sua area, e con un clic partono anche per email.

## Avvio e deploy
```bash
DOCENTE_PASSWORD=una-password python wsgi.py     # http://localhost:5000 — database SQLite academy.sqlite3
```
Railway: Nixpacks + gunicorn `--preload` (`railway.json`), controllo su `/health`. Variabili del servizio:

| Variabile | A cosa serve |
|---|---|
| `DATABASE_URL` | riferimento al servizio PostgreSQL (`${{Postgres.DATABASE_URL}}`) |
| `SECRET_KEY` | firma dei cookie di accesso (stringa lunga casuale) |
| `DOCENTE_USERNAME`, `DOCENTE_PASSWORD`, `DOCENTE_NOME` | primo accesso docente (creato solo se non esiste nessun docente) |
| `COSTO_ORARIO` | costo orario iniziale in € (poi si cambia dal pannello) |

## Prossimi passi
- corso FORMAS (Pistoia): percorso UF 8–11 in /<versione>/formazione/formas
- sistema integrato S/4, in attesa: infragruppo e consolidato (versione leggera con una consociata)
- altri esercizi con i loro numeri di controllo (`app/esercizi.py`)
- altri simulatori della suite
