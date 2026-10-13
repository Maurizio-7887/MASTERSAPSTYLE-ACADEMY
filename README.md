# MASTERSAPSTYLE ACADEMY

Portale dei simulatori didattici in stile SAP di Maurizio Gustinicchi Consulting.
Primo simulatore: **Ferro & Transenne** — contabilità generale, controllo di gestione, vendite, acquisti e produzione a tre fasi.

## Struttura: una cartella per attività, una pagina HTML per ogni pezzo

```
app/
  __init__.py            create_app(): registra i blueprint
  pagine.py              REGISTRO di attività e pagine (menu, URL, aree FI) — si parte da qui
  simulatore.py          versione nell'URL (/vuoto/… /completo/…) e rendering comune
  templates/simulatore/base.html   shell Fiori, menu attività, caricamento ordinato dei JS
  templates/simulatore/_shell.html shell bar in stile SAP Fiori (comune a launchpad e pagine)
  static/css/fiori.css             shell, launchpad a mattonelle e pelle Fiori delle schede
  static/js/launchpad.js           indicatori delle mattonelle letti dai dati dello studente
  static/js/ponte-fantasmi.js      prima del simulatore: elementi delle altre pagine
  static/js/ponte-pagine.js        dopo il simulatore: passaggio fra pagine con coda delle azioni
  blueprints/
    portale/         pagina iniziale e launchpad a mattonelle (/<versione>/), materiali, /<versione>/tutto, motore comune (stato, avvio)
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
| `test:rotte` | tutte le 50 pagine rispondono, con la loro scheda e tutti i JS |
| `test:file-unico` | i 48 passi dell'esercizio guidato nel file originale |
| `test:blueprint` | gli stessi 48 passi con i JS spezzati (pagina /vuoto/tutto) |
| `test:multipagina` | gli stessi 48 passi passando davvero da una pagina all'altra |
| `test:ponte` | i salti fra pagine (SD → FI-AR, Fabbisogno → PP, Giornale → MIRO…) arrivano a destinazione |

I numeri di controllo della guida (varianze 476, utile 1.611,43, IRES 508,87, banca finale 74.095,13) sono verificati a ogni esecuzione: se il simulatore cambia, il test dice se la guida va aggiornata. Il sorgente della guida è `app/static/docs/guida-sorgente.html`.

## Avvio e deploy
```bash
python wsgi.py           # http://localhost:5000
```
Railway: Nixpacks + gunicorn (`railway.json`), controllo su `/health`.

## Prossimi passi
- accessi per docenti e studenti
- consegna dei backup JSON e report di correzione automatica
- altri simulatori della suite
