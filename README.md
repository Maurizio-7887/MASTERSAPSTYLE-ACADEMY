# MASTERSAPSTYLE ACADEMY

Portale dei simulatori didattici in stile SAP di Maurizio Gustinicchi Consulting.

## Cosa contiene
| Percorso | Contenuto |
|---|---|
| `/` | Pagina iniziale con simulatori e materiali |
| `/simulatori/ferro-transenne-vuoto` | Simulatore Ferro & Transenne, versione vuota (per l'esercizio) |
| `/simulatori/ferro-transenne-completo` | Stessa azienda con clienti di esempio |
| `/materiali/Guida-esercizio-integrato.pdf` | Esercizio guidato passo passo |
| `/health` | Controllo di Railway |

I simulatori sono file HTML autonomi: tutta la logica gira nel browser e i dati restano nel `localStorage` dello studente. Il server Flask li serve e basta.

## Avvio locale
```bash
pip install -r requirements.txt
python app.py            # http://localhost:5000
```

## Test di regressione dell'esercizio
`tests/esercizio.js` carica il simulatore in jsdom ed esegue i 48 passi della guida (dal preset del 01/12/2026 al saldo IRES del 30/06/2027), poi confronta i numeri di controllo (varianze 476, utile 1.611,43, IRES 508,87, banca finale 74.095,13). Se si modifica il simulatore, il test dice subito se la guida va aggiornata.
```bash
npm install
npm test
```
Il sorgente della guida è in `static/docs/guida-sorgente.html`.

## Deploy
Railway, da questo repository (Nixpacks + gunicorn, vedi `railway.json`).

## Prossimi passi
- accessi per docenti e studenti, classi
- consegna dei backup JSON e report di correzione automatica
- altri simulatori della suite
