# MASTERSAPSTYLE ACADEMY

Portale dei simulatori didattici in stile SAP di Maurizio Gustinicchi Consulting.
Primo simulatore: **Ferro & Transenne** — contabilità generale, controllo di gestione, vendite, acquisti e produzione a tre fasi.

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
    erp_dati/        SISTEMA INTEGRATO S/4 · Dati di base: avvio (saldi di apertura), clienti e materiali, condizioni VK11/VK13 e procedura ZFT001 (V/08)
    erp_vendite/     S/4 · Vendite: VA01 con determinazione prezzi, acconti F-37/F-29 (CoGe speciale, AZWB), VL01N 601, VF01, resi RE/651, abbuoni G2 con blocco, F-28/FBL5N, flusso documenti
    erp_copa/        S/4 · CO-PA: KE30 margine di contribuzione I e II per cliente/materiale/regione/canale, KE24 righe singole
    erp_acquisti/    S/4 · Acquisti: ME21N, MIGO 101 a standard con differenza prezzo (conto 63), MIRO con WE/RE
    erp_produzione/  S/4 · Produzione: CO01 con costi pianificati, 261, CO11N (attrezzaggio + lavorazione), 101, TECO
    erp_costi/       S/4 · CO-PC: scheda di calcolo con sovraccosti, CK11N/CK24 con rivalutazione, KGI2, KKS2 (anche varianza di lotto), KO88, Material Ledger CKM3/CKMLCP a più livelli
    erp_magazzino/   S/4 · WMS in logica SAP: W100, tipi magazzino 902/001/002/100/916/999, ubicazioni, quanti, UdC, compiti con strategie, pistola RF (pistola vera in modalità tastiera o fotocamera), monitor, etichette Code 128 / QR
    erp_inventario/  S/4 · Inventari fisici e contabili (UF 9): documenti annuale / a rotazione ABC / ubicazione vuota, lista cieca, conta e riconta, 999, LI21, valorizzazione FIFO-LIFO-CMP-standard
    erp_fi/          S/4 · Contabilità: libro giornale e bilancio di verifica del sistema integrato
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
- corso FORMAS (Pistoia): UF 10 spedizione con WMS (prelievo, imballo, DDT, carico) · UF 11 innovazione (slotting, ondate, KPI, RFID)
- corso FORMAS (Pistoia): UF 10 spedizione con WMS (prelievo, imballo, DDT, carico) · UF 11 innovazione (slotting, ondate, KPI, RFID)
- sistema integrato S/4, tappe successive: tesoreria, valute, infragruppo e consolidato, cedolino
- altri esercizi con i loro numeri di controllo (`app/esercizi.py`)
- altri simulatori della suite
