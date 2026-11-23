# Piano «Guida luminosa» per tutti i corsi

**Obiettivo:** in ogni corso l'allievo ha sempre davanti **la casella o il pulsante da usare che brilla** e una
**nuvoletta che spiega cosa stiamo facendo**, passo per passo, come nell'esercizio di Firenze (Dicembre ERP).
Senza la guida gli allievi non sanno cosa fare.

> **Come si usa questo file.** È il documento di lavoro comune: ogni volta che sistemiamo un corso si aggiorna
> la tabella «Stato», si spuntano le caselle del corso e si aggiunge una riga in fondo al «Diario».
> Ultimo aggiornamento: **23/11/2026**.

---

## 1. Lo standard (quando un corso è «fatto»)

Un corso è fatto solo se **tutte** queste caselle sono vere:

- [ ] **Luce:** su ogni passo brilla la casella, la scelta o il pulsante da usare adesso (bordo arancione che pulsa).
- [ ] **Nuvoletta** accanto alla casella con due parti:
  - **📌 COSA STIAMO FACENDO · PASSO n DI N**: titolo del passo e una frase che spiega il perché
    (stile: *«ARRIVA LA FATTURA. Chiude le "fatture da ricevere" e fa nascere il debito vero…»*);
  - **🔘 A CHE COSA SERVE «pulsante»**: a che cosa serve il pulsante o la casella che brilla
    (es. *«▷ Test: esegue il flusso su dati di prova e mostra passo per passo che cosa succede»*);
  - **🧰 LO STRUMENTO «nome»** (quando il passo usa uno strumento): che cos'è e quando si usa;
  - **🎯 ORA TOCCA A TE**: cosa scrivere o scegliere, con il valore.
  > Regola aggiunta il 23/11/2026: **ogni pulsante va spiegato**, non basta dire di premerlo.
  > Oggi ce l'ha il Master Automation Academy; negli altri corsi fatti va aggiunta (vedi §5 «Da rifinire»).
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
| 4 | MasterExecutive (`MASTEREXECUTIVE-ASSISTANT`) | ✅ | Laboratorio documenti commerciali (PR #11) + 9 simulatori con passi, luce e nuvoletta, spenta in esame (PR #12, pubblicato) | «A che cosa serve» sui pulsanti | — | — |
| 5 | MasterPayroll UF4 (`MASTERPAYROLL-ACADEMY`) | ✅ | 2 esercizi guidati, 75 passi: casella che brilla e nuvoletta «cosa stiamo facendo» (PR #3, pubblicato) | «A che cosa serve» sui pulsanti | — | — |
| 6 | MasterSupplyChain (`MASTERSUPPLYCHAIN-ACADEMY`) | ✅ | Esercitazione «30 giorni», 20 passi: «cosa stiamo facendo» + azione che brilla + nuvoletta (PR #4, pubblicato) | — | — | — |
| 7 | MASTER-PROJECT (`MASTER-PROJECT`) | ✅ | Tutor con 19 passi: luce automatica + nuvoletta + spiegazioni (PR #11, pubblicato) | — | — | — |
| 8 | MasterLedger Academy (`MasterLedger-Academy`) | 🔴 | 299 blocchi in 16 percorsi; esercizio 2026/2027; laboratori automotive (14 pagine), BPC (9), chiusura (7), libro (7), qualità (5), autoimpiego, prova | Guida passo passo da scrivere; partire da ragioneria base e avanzato | 3–4 sessioni | **5** |
| 9 | MASTER-ACADEMY (`MASTER-ACADEMY`) | 🔴 | 5 schede di esercitazione (mese di Ferro & Transenne) su 5 programmi collegati | Passi con luce dentro i 5 programmi | 2 sessioni | 6 |
| 10 | Simulatore AHR (`Simulatore-AHR`) | 🔴 | 25 pagine di gestionale, nessun esercizio | Prima l'esercizio, poi la guida | 1 sessione | 7 |
| 11 | CRM Academy (`Crm_Gustinicchi_Academy`) | 🔴 | CRM vero con registro esercitazioni, nessun esercizio guidato | Esercizio guidato (se lo vogliamo) | 1 sessione | 8 |
| 12 | Master Automation Academy (`MASTER-AUTOMATION-ACADEMY`) | ✅ | Power Automate, Fabric, Power BI, DevOps, **GitHub** e caso quadro: luce + nuvoletta + «a che cosa serve» su ogni pulsante e campo (PR #7, #8, #9) | Merge della PR #9 (GitHub) e controllo del deploy; luce nelle missioni della teoria su MasterLedger (W1–W12) | — | — |
| 13 | PowerAutomate-and-Fabric | ⏸️ | Repository vuoto: **non è un corso**. Il corso vero è il Master Automation Academy (n. 12) | Da cancellare quando lo decide Maurizio | — | — |

**Totale stimato:** 11 sessioni (gruppo 🟡: 3 sessioni; gruppo 🔴: 7–8 sessioni).

## 5. Lista di controllo per corso

### 4 · MasterExecutive
- [x] Nuvoletta nel laboratorio documenti commerciali (introduzione ed esercitazione) — PR #11, pubblicato
- [x] Passi guidati per i 9 simulatori (`app/simulatori/guida.py`, 49 passi con i valori dei casi)
- [x] Luce + nuvoletta nei simulatori, **spenta in modalità esame** (test automatico)
- [x] Robot che segue solo la luce: 9 simulatori su 9 al 100% su database nuovo · 36 test passano
- [x] Merge della PR #12 e controllo del deploy
- [ ] Da rifinire: «🔘 a che cosa serve» su ogni pulsante

### 5 · MasterPayroll UF4
- [x] Luce automatica dai `campi` dei 75 passi
- [x] Nuvoletta + spiegazioni per «ottobre–dicembre 2026» (35 passi) e «esercizio completo» (40 passi)
- [x] Prova del robot · test · deploy (PR #3)
- [ ] Da rifinire: «🔘 a che cosa serve» su ogni pulsante

### 6 · MasterSupplyChain
- [x] Luce + nuvoletta sui passi di `app/scm/guida.py`
- [x] Prova del robot · test · deploy (PR #4)
- [ ] Da rifinire: «🔘 a che cosa serve» su ogni pulsante

### 7 · MASTER-PROJECT
- [x] Luce automatica (prima solo con «Mostrami dove») + nuvoletta sui 19 passi
- [x] Test (84 passano) · prova nel browser sui passi 1–11
- [x] Merge della PR #11 e controllo del deploy

### 12 · Master Automation Academy
- [x] Power Automate: schede, domande, «+», catalogo, ogni campo dei parametri, «Applica», «▷ Test» — robot: 15 esercizi
- [x] Fabric e DevOps: lezione, verifica, 7 fasi del designer — robot: Fabric 6, DevOps 17 esercizi
- [x] Laboratorio BI: passaggi in ordine, controllo, aggiornamento, risposta — robot: 12 missioni
- [x] Caso quadro: la tappa che brilla, la luce porta all'esercizio della tappa e poi torna al caso — robot: 5 tappe su 5
- [x] Corretto: le tappe bloccate facevano ripetere il test all'infinito, ora la luce manda al caso quadro
- [x] Merge della PR #7 e controllo del deploy
- [x] Nuvoletta con «🔘 A CHE COSA SERVE» e «🧰 LO STRUMENTO» su ogni pulsante e campo; spiegati i 32 campi di Power Automate per desktop — robot: ~130 pulsanti, nessuno senza spiegazione (PR #8, pubblicato)
- [x] **Simulatore GitHub** (`/github/ui`): lezione su 9 strumenti + verifica, 7 missioni con i pulsanti veri (issue, branch, commit, pull request, GitHub Actions, revisione, merge, protezione del ramo, revisione della PR di un collega) — robot: 7 missioni su 7, 52 pulsanti spiegati (PR #9)
- [ ] Merge della PR #9 e controllo del deploy
- [ ] Luce + nuvoletta anche nelle missioni della teoria (MasterLedger, percorso Automazione W1–W12)

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
| 22/11/2026 | MasterSupplyChain · MasterPayroll | Azione che brilla e nuvoletta nelle esercitazioni guidate (SupplyChain PR #4, Payroll PR #3, pubblicati) |
| 23/11/2026 | MasterExecutive | Nuvoletta nel laboratorio documenti (PR #11) e guida nei 9 simulatori, spenta in esame (PR #12, pubblicati) |
| 23/11/2026 | Master Automation | Luce + nuvoletta in Power Automate, Fabric, DevOps, laboratorio BI e caso quadro (PR #7, pubblicato) |
| 23/11/2026 | Master Automation | Nuova regola: la nuvoletta spiega **a che cosa serve** ogni pulsante e ogni campo, più la scheda dello strumento (PR #8, pubblicato) |
| 23/11/2026 | Master Automation | Nuovo simulatore GitHub con 7 missioni guidate dalla luce (PR #9) |
| 23/11/2026 | PowerAutomate-and-Fabric | Verificato: repository vuoto, non è un corso |
