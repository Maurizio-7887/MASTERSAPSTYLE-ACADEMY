# Piano «Guida luminosa» per tutti i corsi

**Obiettivo:** in ogni corso l'allievo ha sempre davanti **la casella o il pulsante da usare che brilla** e una
**nuvoletta che spiega cosa stiamo facendo**, passo per passo, come nell'esercizio di Firenze (Dicembre ERP).
Senza la guida gli allievi non sanno cosa fare.

> **Come si usa questo file.** È il documento di lavoro comune: ogni volta che sistemiamo un corso si aggiorna
> la tabella «Stato», si spuntano le caselle del corso e si aggiunge una riga in fondo al «Diario».
> Ultimo aggiornamento: **22/11/2026**.

---

## 1. Lo standard (quando un corso è «fatto»)

Un corso è fatto solo se **tutte** queste caselle sono vere:

- [ ] **Luce:** su ogni passo brilla la casella, la scelta o il pulsante da usare adesso (bordo arancione che pulsa).
- [ ] **Nuvoletta** accanto alla casella con due parti:
  - **📌 COSA STIAMO FACENDO · PASSO n DI N**: titolo del passo e una frase che spiega il perché
    (stile: *«ARRIVA LA FATTURA. Chiude le "fatture da ricevere" e fa nascere il debito vero…»*);
  - **🎯 ORA TOCCA A TE**: cosa scrivere o scegliere, con il valore.
- [ ] La nuvoletta **non copre il lavoro**: si fa trasparente se ci passi sopra; si mette sotto, sopra o di lato.
- [ ] **Pannello del passo** con tutte le caselle, spuntate man mano.
- [ ] Se il passo è in un'altra pagina brilla **«Vai alla pagina →»**.
- [ ] Il passo avanza quando il programma **vede davvero** l'operazione (controllo del server), non con un clic qualsiasi.
- [ ] Pulsante **«Spegni il suggeritore»** per chi vuole provare da solo.
- [ ] Ogni passo ha la sua spiegazione scritta a mano (niente frasi generiche).
- [ ] **Prova del robot:** un browser automatico che segue **solo la guida** su un'azienda nuova arriva in fondo
      a tutti gli esercizi senza errori JS.
- [ ] Test del progetto: nessun test in più che fallisce rispetto a `main`.
- [ ] Pubblicato su Railway **fuori dall'orario di lezione**.

## 2. I due motori già pronti (da riusare, non da riscrivere)

| Motore | Dove | Quando usarlo |
|---|---|---|
| **Guida MASTERSAPSTYLE** (`pannello.js` + `luce-automatica.js` + `spiegazioni/*.js`) | MASTERSAPSTYLE-ACADEMY, `app/blueprints/guida/static/` | Corsi con passi già scritti come `{titolo, dove, campi, attesa}`: la luce si genera dai campi, le spiegazioni si aggiungono per titolo. |
| **Guida PMI** (`guida-passi.js` + `guida-passi-esercizi.js` + `guida-passi.css`) | MASTERERP-PMI-ACADEMY, `app/blueprints/pmi/static/` | Corsi con moduli HTML classici (`<form>` con `name=`): ogni passo dice pagina, caselle `[nome, valore]`, pulsante e condizione del server. È il motore **di riferimento per i corsi nuovi**. |

Formato di un passo (motore PMI):

```js
{t: 'Titolo del passo', p: 'area/voce', c: 0, b: 'Testo del pulsante', r: 'testo della riga giusta',
 s: 'MAIUSCOLO: COSA STIAMO FACENDO. Spiegazione del perché.',
 f: [['nome_casella', 'valore', 'Etichetta'], ['fornitore', '~Ferriera'], ['nome', '*', 'Etichetta', 'istruzione']]}
```

## 3. Procedura per ogni corso

1. Elenco degli esercizi e delle pagine che usano (moduli, nomi delle caselle, pulsanti).
2. Scrivere i passi con le spiegazioni «cosa stiamo facendo», usando le date e i valori delle tracce.
3. Collegare ogni passo alla **condizione vera** del server (quella che usa «Verifica» o il correttore).
4. Inserire il motore nel template base del corso.
5. Prova del robot dall'inizio alla fine + test del progetto.
6. Ramo `guida-luminosa-nuvoletta` → pull request → merge **fuori orario lezione** → controllo del deploy su Railway.
7. Aggiornare questo file (Stato + Diario).

## 4. Stato dei corsi

Legenda: ✅ fatto · 🟡 guida presente, mancano luce/nuvoletta · 🔴 guida da scrivere · ⏸️ in sospeso

| # | Corso (repository) | Stato | Cosa c'è oggi | Cosa manca | Stima | Priorità |
|---|---|---|---|---|---|---|
| 1 | Master ERP Enterprise / Firenze / Executive ERP (`MASTERSAPSTYLE-ACADEMY`) | ✅ | 9 esercizi, tutti i passi con luce e spiegazione (PR #50) | — | — | — |
| 2 | Master ERP PMI (`MASTERERP-PMI-ACADEMY`) | ✅ | 22 esercizi, 91 passi, robot fino in fondo (PR #1, #2) | — | — | — |
| 3 | Laboratorio 0 e Blocco 2 (file HTML Firenze) | ✅ | Luce, nuvoletta, pannello docente | — | — | — |
| 4 | MasterExecutive (`MASTEREXECUTIVE-ASSISTANT`) | 🟡 | Virgilio dice cosa fare; laboratorio documenti commerciali con campo che brilla in giallo | Nuvoletta «cosa stiamo facendo»; luce nei simulatori di fatturazione e negli scenari | 1 sessione | **1** (allievi Regione Umbria) |
| 5 | MasterPayroll UF4 (`MASTERPAYROLL-ACADEMY`) | 🟡 | 2 esercizi guidati, 75 passi con caselle (`passi` con `campi`) | Luce + nuvoletta + spiegazioni | 1 sessione | **2** |
| 6 | MasterSupplyChain (`MASTERSUPPLYCHAIN-ACADEMY`) | 🟡 | Esercitazione «30 giorni» con finestrella guida (`app/scm/guida.py`, ~20 passi) | Luce + nuvoletta; passi dentro le pagine del simulatore | 1 sessione | **3** |
| 7 | MASTER-PROJECT (`MASTER-PROJECT`) | ✅ | Tutor con 19 passi: luce automatica + nuvoletta + spiegazioni (PR #11) | Merge e controllo del deploy | — | — |
| 8 | MasterLedger Academy (`MasterLedger-Academy`) | 🔴 | 299 blocchi in 16 percorsi; esercizio 2026/2027; laboratori automotive (14 pagine), BPC (9), chiusura (7), libro (7), qualità (5), autoimpiego, prova | Guida passo passo da scrivere; partire da ragioneria base e avanzato | 3–4 sessioni | **5** |
| 9 | MASTER-ACADEMY (`MASTER-ACADEMY`) | 🔴 | 5 schede di esercitazione (mese di Ferro & Transenne) su 5 programmi collegati | Passi con luce dentro i 5 programmi | 2 sessioni | 6 |
| 10 | Simulatore AHR (`Simulatore-AHR`) | 🔴 | 25 pagine di gestionale, nessun esercizio | Prima l'esercizio, poi la guida | 1 sessione | 7 |
| 11 | CRM Academy (`Crm_Gustinicchi_Academy`) | 🔴 | CRM vero con registro esercitazioni, nessun esercizio guidato | Esercizio guidato (se lo vogliamo) | 1 sessione | 8 |
| 12 | Master Automation Academy (`MASTER-AUTOMATION-ACADEMY`) | ⏸️ | 6 moduli con quiz; simulatori non ancora caricati | Caricare i simulatori, poi la guida | dopo l'import | — |
| 13 | PowerAutomate-and-Fabric | ⏸️ | Repository vuoto | — | — | — |

**Totale stimato:** 11 sessioni (gruppo 🟡: 3 sessioni; gruppo 🔴: 7–8 sessioni).

## 5. Lista di controllo per corso

### 4 · MasterExecutive
- [ ] Nuvoletta nel laboratorio documenti commerciali (introduzione ed esercitazione)
- [ ] Luce + nuvoletta nei simulatori (fatturazione, scenari)
- [ ] Spiegazioni «cosa stiamo facendo» per ogni passo
- [ ] Prova del robot · test · deploy

### 5 · MasterPayroll UF4
- [ ] Luce automatica dai `campi` dei 75 passi
- [ ] Nuvoletta + spiegazioni per «ottobre–dicembre 2026» (35 passi) e «esercizio completo» (40 passi)
- [ ] Prova del robot · test · deploy

### 6 · MasterSupplyChain
- [ ] Luce + nuvoletta sui passi di `app/scm/guida.py`
- [ ] Prova del robot · test · deploy

### 7 · MASTER-PROJECT
- [x] Luce automatica (prima solo con «Mostrami dove») + nuvoletta sui 19 passi
- [x] Test (84 passano) · prova nel browser sui passi 1–11
- [ ] Merge della PR #11 e controllo del deploy

### 8 · MasterLedger Academy
- [ ] Ragioneria base (R1–R6, E1–E7)
- [ ] Ragioneria avanzato (R7–R19, esercizio 2027)
- [ ] Laboratori: chiusura, libro, BPC, automotive, qualità, autoimpiego
- [ ] Altri percorsi dei 299 blocchi (da decidere quali hanno parte pratica)
- [ ] Prova del robot · test · deploy

### 9 · MASTER-ACADEMY
- [ ] 5 schede di esercitazione → passi con luce nei 5 programmi
- [ ] Prova del robot · test · deploy

### 10 · Simulatore AHR
- [ ] Scrivere l'esercizio
- [ ] Guida con luce e nuvoletta
- [ ] Prova del robot · deploy

### 11 · CRM Academy
- [ ] Decidere l'esercizio guidato
- [ ] Guida con luce e nuvoletta
- [ ] Prova del robot · deploy

## 6. Diario

| Data | Corso | Cosa è stato fatto |
|---|---|---|
| 22/11/2026 | MASTERSAPSTYLE | Luce su ogni passo e nuvoletta che ripete il suggeritore; 473 spiegazioni scritte a mano; copertura 100% sui 9 esercizi (PR #50, pubblicato) |
| 22/11/2026 | Master ERP PMI | Guida luminosa sui 22 esercizi (91 passi), robot fino in fondo (PR #1, pubblicato) |
| 22/11/2026 | Master ERP PMI | «Verifica E12» severa: serve il risconto dell'assicurazione, non basta quello del leasing (PR #2, pubblicato) |
| 22/11/2026 | Tutti | Inventario dei corsi e creazione di questo piano |
| 22/11/2026 | MASTER-PROJECT | Luce automatica e nuvoletta sui 19 passi del tutor, 19 spiegazioni (PR #11, da unire) |
