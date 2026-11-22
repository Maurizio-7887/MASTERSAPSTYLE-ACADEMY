/* «Cosa stiamo facendo e perché» per i 32 passi di «Pianificazione e forecast 2027». */
(function () {
  var S = {
    'Sei il controller: che cosa farai in questa esercitazione': 'CAPIAMO IL NOSTRO RUOLO. Siamo il controller: a ottobre scriviamo il budget dell’anno, poi ogni tre mesi confrontiamo con il consuntivo e aggiorniamo la previsione.',
    'Crea l’azienda 2027 per la pianificazione': 'PREPARIAMO L’AZIENDA DEL 2027. Serve un anno nuovo, con i suoi centri di costo, su cui scrivere il budget.',
    'Apri il piano CO 2027 e leggi i sei centri di costo': 'APRIAMO IL PIANO E CONOSCIAMO I SEI CENTRI. Magazzino, produzione comune, tre reparti, amministrazione: ognuno avrà il suo budget.',
    'KP06: budget annuo del centro 4100 Magazzino': 'SCRIVIAMO IL BUDGET DEL MAGAZZINO. Solo stipendi: 30.000 € nell’anno.',
    'KP06: budget annuo del centro 4200 Produzione (costi comuni)': 'BUDGET DEI COSTI COMUNI DELLA PRODUZIONE. Affitto, ammortamenti ed energia: costi che servono a tutti i reparti insieme.',
    'KP06: budget annuo del reparto 4210 Taglio': 'BUDGET DEL REPARTO TAGLIO: 3.000 € di stipendi al mese.',
    'KP06: budget annuo del reparto 4220 Piegatura': 'BUDGET DEL REPARTO PIEGATURA: stessa cifra del taglio.',
    'KP06: budget annuo del reparto 4230 Saldatura': 'BUDGET DEL REPARTO SALDATURA: lo guarderemo con attenzione nei forecast.',
    'KP06: budget annuo del centro 4300 Amministrazione': 'BUDGET DELL’AMMINISTRAZIONE. Con questo centro il piano dei sei centri è completo: 197.200 €.',
    'BPC: crea il modello di budget dal piano KP06': 'PORTIAMO IL BUDGET NELLO STRUMENTO DI PIANIFICAZIONE. Il piano annuo viene diviso in 12 mesi uguali: è il punto di partenza da correggere.',
    'BPC: l’energia del centro 4200 mese per mese (stagionalità)': 'DISTRIBUIAMO L’ENERGIA SECONDO LE STAGIONI. D’inverno si consuma di più: dividere in dodici parti uguali sarebbe sbagliato.',
    'BPC: ogni responsabile invia il budget del suo centro': 'OGNI RESPONSABILE FIRMA IL SUO BUDGET. Il budget è un impegno: chi guida il centro lo invia al controller.',
    'BPC: approva i sei centri e blocca il budget V1': 'APPROVIAMO E BLOCCHIAMO IL BUDGET. La versione V1 non si tocca più: sarà il metro di paragone per tutto l’anno.',
    'L’amministrazione chiude gennaio, febbraio e marzo': 'PASSANO TRE MESI. L’amministrazione registra i costi veri di gennaio, febbraio e marzo.',
    'KSB1: leggi i costi effettivi dei centri di gennaio–marzo': 'CONFRONTIAMO IL VERO CON IL BUDGET. L’energia del centro 4200 è costata 210 € più del previsto: è il primo segnale.',
    'BPC Data Manager: carica il consuntivo fino a marzo': 'PORTIAMO I COSTI VERI NELLA PIANIFICAZIONE. Il consuntivo dei primi tre mesi entra accanto al budget.',
    'BPC Data Manager: crea il forecast F3 (3+9)': 'CREIAMO LA PRIMA PREVISIONE: 3 MESI VERI + 9 PREVISTI. Il budget resta com’è; il forecast dice dove arriveremo davvero.',
    'Forecast F3: energia +10% da aprile a dicembre (4200)': 'CORREGGIAMO LA PREVISIONE DELL’ENERGIA. Il contratto è più caro del 10%: lo mettiamo nei mesi che restano.',
    'Forecast F3: straordinari in Saldatura da aprile (4230)': 'METTIAMO GLI STRAORDINARI DELLA SALDATURA. Gli ordini crescono: 300 € in più al mese da aprile.',
    'Report: V1, consuntivo e F3 a confronto': 'LEGGIAMO IL REPORT PER LA DIREZIONE. Quanto siamo fuori budget a oggi e dove chiuderà l’anno se non cambia niente.',
    'L’amministrazione chiude aprile, maggio e giugno': 'PASSANO ALTRI TRE MESI: aprile, maggio e giugno vengono chiusi.',
    'BPC Data Manager: carica il consuntivo fino a giugno': 'CARICHIAMO IL CONSUNTIVO DEL PRIMO SEMESTRE.',
    'BPC Data Manager: crea il forecast F6 (6+6)': 'NUOVA PREVISIONE: 6 MESI VERI + 6 PREVISTI. F3 resta salvato: ogni forecast è una fotografia.',
    'Forecast F6: 4230 Saldatura da luglio a dicembre': 'GLI STRAORDINARI DELLA SALDATURA CONTINUANO: li riportiamo nei mesi che restano.',
    'Forecast F6: 4210 Taglio da luglio a dicembre': 'IL TAGLIO RISPARMIA. Un addetto passa part-time da luglio: il costo dei mesi che restano scende.',
    'Report: V1, F3 e F6 a confronto': 'CONFRONTIAMO LE PREVISIONI. Il rischio di aprile si è ridotto: la Direzione vede l’effetto delle decisioni prese.',
    'L’amministrazione chiude luglio, agosto e settembre': 'PASSANO ALTRI TRE MESI: chiusi luglio, agosto e settembre.',
    'BPC Data Manager: carica il consuntivo fino a settembre': 'CARICHIAMO IL CONSUNTIVO DEI NOVE MESI.',
    'BPC Data Manager: crea il forecast F9 (9+3)': 'ULTIMA PREVISIONE: 9 MESI VERI + 3 PREVISTI. Ormai l’anno è quasi scritto.',
    'Forecast F9: 4230 Saldatura da ottobre a dicembre': 'GLI ULTIMI TRE MESI DI STRAORDINARI IN SALDATURA.',
    'Forecast F9: 4210 Taglio da ottobre a dicembre': 'GLI ULTIMI TRE MESI DEL TAGLIO PART-TIME.',
    'Lettura finale: quattro versioni, un solo budget': 'TIRIAMO LE SOMME PER LA DIREZIONE. Un budget fermo e tre previsioni: l’anno chiuderà a circa 198.960 € di costi, poco sopra il budget.'
  };
  (window.MSA_SPIEGAZIONI = window.MSA_SPIEGAZIONI || {})['pianificazione-forecast'] = S;
})();
