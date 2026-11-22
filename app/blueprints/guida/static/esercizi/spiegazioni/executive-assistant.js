/* «Cosa stiamo facendo e perché» per i 110 passi di «Executive Assistant: quattro mesi di un negozio di informatica».
   Chiave = titolo esatto del passo. I mesi da ottobre a dicembre ripetono lo stesso ciclo: le frasi sono costruite una volta sola. */
(function () {
  var S = {
    'Prima di cominciare: un account vuoto': 'CONTROLLIAMO DI PARTIRE DA ZERO. Il negozio deve nascere in un account vuoto: se c’è già un’azienda, si ricomincia solo con il permesso del docente.',
    'Apri il negozio: costituisci Pixel & Bit con 30.000 € di capitale': 'FACCIAMO NASCERE IL NEGOZIO DAL NOTAIO. I soci promettono 30.000 € di capitale: nasce un credito verso i soci. Il programma carica anche merci, fornitori, clienti e la dipendente.',
    'I soci versano il capitale in banca': 'I SOCI MANTENGONO LA PROMESSA. Versano i 30.000 €: il credito verso i soci si chiude e i soldi sono in banca, pronti per comprare la merce.',
    'Leggi le anagrafiche: merci, fornitori e clienti': 'CONOSCIAMO CON CHI LAVORIAMO. Cinque merci da rivendere, quattro fornitori di merce, tre di servizi, due clienti: sono i dati che useremo in ogni documento.',
    'Leggi il listino di vendita': 'GUARDIAMO I PREZZI DI VENDITA. Un PC si compra a 450 € e si vende a 750 €: il listino lo applica l’ordine da solo, nessuno lo riscrive a mano.',
    'Leggi la scheda della dipendente': 'CONOSCIAMO CHIARA, L’UNICA DIPENDENTE. Contratto del commercio, 1.800 € lordi al mese: a fine mese vedremo che il netto è meno e il costo per l’azienda è di più.',
    'Attiva il magazzino W100 (vuoto)': 'ORGANIZZIAMO IL MAGAZZINO PRIMA CHE ARRIVI LA MERCE. 41 scaffali con un indirizzo (corsia, campata, piano). Nessuna scrittura: è organizzazione, non merce.',
    'AS01 + F-90: compra banco, scaffali e vetrine del negozio': 'COMPRIAMO GLI ARREDI DEL NEGOZIO. Non sono merce da vendere né un costo dell’anno: sono un cespite che dura anni e si ammortizza al 15%.',
    'AS01 + F-90: compra il PC e il registratore di cassa telematico del banco': 'COMPRIAMO PC E CASSA PER IL BANCO. Anche questi sono cespiti (macchine d’ufficio, 20%): li usiamo, non li rivendiamo.',
    'ME21N: ordina 10 PC desktop': 'ORDINIAMO I PRIMI PC AL FORNITORE. L’ordine è un impegno: la merce non è ancora arrivata, quindi in contabilità non succede niente.',
    'ME21N: ordina 6 stampanti laser': 'ORDINIAMO LE STAMPANTI. Un ordine per ogni fornitore: così si controlla cosa deve arrivare e da chi.',
    'ME21N: ordina 10 monitor': 'ORDINIAMO I MONITOR al terzo fornitore. Ancora nessuna scrittura: è solo un impegno.',
    'ME21N: ordina 30 mouse': 'ORDINIAMO I MOUSE. Accessori Digitali riceverà due ordini: mouse e cavi.',
    'ME21N: ordina 40 cavi HDMI': 'ORDINIAMO I CAVI HDMI, secondo ordine allo stesso fornitore.',
    'ME2N: controlla gli ordini aperti': 'CONTROLLIAMO COSA DEVE ARRIVARE. È la lista che l’assistente guarda ogni mattina: 5 ordini, 6.470 €, tutti «da ricevere».',
    'MIGO 101: ricevi i PC': 'ARRIVANO I PC. Con l’entrata merci la merce entra nel magazzino in contabilità e nasce un debito «fatture da ricevere»: la fattura arriverà dopo.',
    'MIGO 101: ricevi le stampanti': 'ARRIVANO LE STAMPANTI. Stessa regola: merce in magazzino, debito in attesa di fattura.',
    'MIGO 101: ricevi i monitor': 'ARRIVANO I MONITOR. Il DDT del fornitore accompagna la merce: lo registriamo per poterlo ritrovare.',
    'MIGO 101: ricevi i mouse': 'ARRIVANO I MOUSE.',
    'MIGO 101: ricevi i cavi HDMI': 'ARRIVANO I CAVI HDMI. Tutta la merce di settembre è entrata: ora va messa sugli scaffali.',
    'Merce da mettere a posto: che cosa aspetta in ricevimento?': 'GUARDIAMO LA MERCE ANCORA ALLA PORTA. Cinque pallet aspettano nella zona di scarico: finché non sono a scaffale non si possono prelevare.',
    'RF: metti a scaffale i 5 pallet': 'METTIAMO LA MERCE SUGLI SCAFFALI CON LA PISTOLA. Cambia il POSTO della merce, non il suo valore: nessuna scrittura contabile.',
    'Dove si trova? Cerca i monitor': 'RISPONDIAMO ALLA DOMANDA DI OGNI GIORNO: «CE L’AVETE? DOV’È?». Il magazzino e la contabilità devono dire lo stesso numero: 10 monitor.',
    'MIRO: registra la fattura dei PC': 'REGISTRIAMO LA FATTURA DEI PC. Il sistema controlla che ordine, entrata e fattura coincidano (tre vie): il debito «da ricevere» diventa debito vero verso il fornitore, con l’IVA.',
    'MIRO: registra la fattura delle stampanti': 'FATTURA DELLE STAMPANTI: stesso controllo a tre vie, nasce il debito verso Stampa Facile.',
    'MIRO: registra la fattura dei monitor': 'FATTURA DEI MONITOR: debito verso Video Schermi e IVA a credito.',
    'MIRO: registra la fattura dei mouse': 'FATTURA DEI MOUSE.',
    'MIRO: registra la fattura dei cavi HDMI': 'FATTURA DEI CAVI. Il conto «fatture da ricevere» torna a zero: tutte le merci arrivate sono state fatturate.',
    'Leggi i debiti verso i fornitori': 'LEGGIAMO QUANTO DOBBIAMO E A CHI. Lo scadenziario dei fornitori dice chi pagare e quando: l’IVA pagata sugli acquisti è un credito verso lo Stato.',
    'VA01: lo Studio Aurora ordina 4 PC': 'IL PRIMO CLIENTE ORDINA. L’ordine prende il prezzo dal listino e calcola IVA e totale. Non è ancora una vendita: nessuna scrittura.',
    'VA01: lo Studio Aurora ordina 4 monitor': 'SECONDO ORDINE DELLO STUDIO AURORA: i monitor.',
    'VA01: lo Studio Aurora ordina 4 mouse': 'TERZO ORDINE DELLO STUDIO AURORA: i mouse.',
    'VA01: l’Agenzia Girasole ordina 3 stampanti': 'IL SECONDO CLIENTE ORDINA LE STAMPANTI.',
    'VA01: l’Agenzia Girasole ordina 15 cavi HDMI': 'L’AGENZIA GIRASOLE ORDINA ANCHE I CAVI.',
    'VA05: controlla gli ordini e il semaforo': 'CONTROLLIAMO SE POSSIAMO CONSEGNARE. Il semaforo verde dice che la merce è a scaffale: prima di promettere una data si guarda sempre qui.',
    'VL01N: crea le 5 consegne': 'PREPARIAMO LE CONSEGNE. Con il magazzino a scaffali la merce non esce subito: prima nascono i compiti di prelievo. Nessuna scrittura.',
    'RF: preleva la merce delle 5 consegne': 'PRELEVIAMO DAGLI SCAFFALI CON LA PISTOLA. La merce va nella zona di spedizione. Ancora nessuna scrittura.',
    'Uscita merci: registra le 5 partenze': 'LA MERCE ESCE DAL NEGOZIO. Ora nasce il costo del venduto, al prezzo a cui l’avevamo comprata: il magazzino scende di 2.609 €.',
    'VF01: fattura le 5 consegne': 'FATTURIAMO AI CLIENTI. Nascono il credito verso i clienti, i ricavi e l’IVA da versare allo Stato.',
    'Trasmetti le 5 fatture allo SdI': 'INVIAMO LE FATTURE ELETTRONICHE. Da questo momento una fattura sbagliata non si cancella più: si corregge con una nota di credito.',
    'Leggi una fattura elettronica (XML)': 'GUARDIAMO DENTRO UNA FATTURA ELETTRONICA. È il file che arriva al commercialista e all’Agenzia delle Entrate: chi vende, chi compra, cosa, quanto.',
    'Calcola il cedolino di settembre': 'CALCOLIAMO LO STIPENDIO DI CHIARA. Dai 1.800 € lordi si tolgono contributi e IRPEF: le arrivano 1.552,62 €. All’azienda costa di più, perché paga anche i contributi suoi.',
    'Registra lo stipendio in contabilità': 'PORTIAMO LO STIPENDIO IN CONTABILITÀ. Costi del personale da una parte, debiti verso Chiara, INPS ed Erario dall’altra.',
    'Paga lo stipendio': 'FACCIAMO IL BONIFICO A CHIARA. Il debito verso la dipendente si chiude; ritenute e contributi restano da pagare con l’F24 del 16.',
    'F-53: paga Distribuzione PC Italia (merce e registratore di cassa)': 'PAGHIAMO IL FORNITORE DEI PC. Un solo bonifico chiude sia la fattura della merce sia quella del registratore di cassa.',
    'F-53: paga Stampa Facile': 'PAGHIAMO IL FORNITORE DELLE STAMPANTI.',
    'F-53: paga Video Schermi': 'PAGHIAMO IL FORNITORE DEI MONITOR.',
    'F-53: paga Accessori Digitali (due fatture)': 'PAGHIAMO ACCESSORI DIGITALI: un bonifico chiude le due fatture di mouse e cavi.',
    'F-53: paga Arredo Negozi': 'PAGHIAMO GLI ARREDI DEL NEGOZIO. Ora a settembre non dobbiamo più niente ai fornitori.',
    'F-28: incassa dallo Studio Aurora': 'LO STUDIO AURORA CI PAGA. Il bonifico chiude le sue tre fatture: la banca sale, il credito va a zero.',
    'F-28: incassa dall’Agenzia Girasole': 'ANCHE L’AGENZIA GIRASOLE PAGA. Nessun cliente ci deve più niente.',
    'Liquida l’IVA di settembre': 'CALCOLIAMO L’IVA DEL MESE. Abbiamo pagato più IVA sugli acquisti (merce e arredi) di quanta ne abbiamo incassata: è un credito che passa al mese dopo, niente da versare.',
    'FB60: registra la polizza annuale del negozio': 'REGISTRIAMO L’ASSICURAZIONE DEL NEGOZIO. È un servizio, non merce: va nel conto assicurazioni. Copre un anno intero, a dicembre ne rinvieremo una parte.',
    'F-53: paga la polizza': 'PAGHIAMO L’ASSICURAZIONE: 960 € dalla banca.',
    'Novembre · FB60: la fattura dell’affitto (trimestre posticipato)': 'REGISTRIAMO L’AFFITTO DEL NEGOZIO. Il padrone di casa fattura il trimestre alla fine: settembre, ottobre e novembre in una sola fattura.',
    'Risconto attivo: la parte 2027 della polizza': 'RINVIAMO AL 2027 LA PARTE DI POLIZZA NON ANCORA USATA. Abbiamo pagato da ottobre a settembre: nove mesi sono dell’anno prossimo e diventano un’attività (risconto).',
    'Rateo passivo: l’affitto di dicembre non ancora fatturato': 'REGISTRIAMO L’AFFITTO DI DICEMBRE CHE ARRIVERÀ IN FATTURA DOPO. Il costo è di quest’anno anche se la fattura arriva a febbraio: è un rateo passivo.',
    'Ammortamenti di arredi e registratore di cassa (AFAB)': 'CALCOLIAMO GLI AMMORTAMENTI. Arredi e cassa li usiamo da settembre: quattro mesi di quota diventano costo di quest’anno (400 € in tutto).',
    'Monitor: le merci in magazzino al 31/12': 'CONTIAMO COSA RESTA A FINE ANNO. Le rimanenze valgono 5.481 € e devono coincidere con il conto magazzino: tutte le righe «quadra».',
    'IRES e IRAP dell’anno': 'CALCOLIAMO LE IMPOSTE DEL PRIMO ANNO. Dal margine sulle merci togliamo personale, affitto, polizza e ammortamenti: sull’utile si pagano IRES e IRAP.',
    'Bilancio di verifica: com’è andato il primo anno': 'LEGGIAMO COM’È ANDATO IL PRIMO ANNO. Ricavi, banca, debiti di fine anno: totale Dare uguale totale Avere.',
    'Chiudi l’esercizio 2026': 'CHIUDIAMO L’ANNO. Costi e ricavi vanno nel conto economico, l’utile (7.656,32 €) nel patrimonio netto, attività e passività nello stato patrimoniale finale.',
    'Riapri i conti al 1° gennaio 2027': 'RIAPRIAMO I CONTI NEL 2027. Banca, magazzino, arredi e debiti ripartono dai saldi di fine anno: il negozio continua.',
    'Storna ratei e risconti': 'RIMETTIAMO I COSTI NELL’ANNO GIUSTO. La parte di polizza rinviata torna costo del 2027; l’affitto di dicembre già registrato non si conterà due volte quando arriverà la fattura.',
    'F24 del 16 gennaio (lunedì 18): paghe e IVA di dicembre': 'VERSIAMO LE TASSE DI DICEMBRE. Ritenute e contributi della dipendente e l’IVA a debito: il 16 è sabato, si paga lunedì 18.',
    'Consegna l’esercitazione al docente': 'CONSEGNIAMO I QUATTRO MESI DEL NEGOZIO. Il docente vede documenti, compiti di magazzino e scritture e può correggere.'
  };
  // ottobre, novembre e dicembre: stesso ciclo del negozio
  var MESI = {Ottobre: 'ottobre', Novembre: 'novembre', Dicembre: 'dicembre'};
  Object.keys(MESI).forEach(function (M) {
    var m = MESI[M];
    S[M + ' · ordini ai fornitori (ME21N)'] = 'RIFORNIAMO IL NEGOZIO PER ' + m.toUpperCase() + '. Gli ordini ai fornitori sono impegni: nessuna scrittura finché la merce non arriva.';
    S[M + ' · entrate merci (MIGO 101)'] = 'ARRIVA LA MERCE DI ' + m.toUpperCase() + '. Entra in magazzino e nasce il debito «fatture da ricevere», in attesa della fattura del fornitore.';
    S[M + ' · RF: metti a scaffale la merce arrivata'] = 'METTIAMO A SCAFFALE LA MERCE ARRIVATA. Con la pistola: cambia il posto, non il valore. Nessuna scrittura.';
    S[M + ' · fatture dei fornitori (MIRO)'] = 'REGISTRIAMO LE FATTURE DEI FORNITORI DI ' + m.toUpperCase() + '. Controllo a tre vie: il debito «da ricevere» diventa debito vero, con l’IVA a credito.';
    S[M + ' · ordini dei clienti (VA01)'] = 'I CLIENTI ORDINANO A ' + m.toUpperCase() + '. Prezzi dal listino, IVA calcolata: ancora nessuna scrittura.';
    S[M + ' · consegne (VL01N)'] = 'PREPARIAMO LE CONSEGNE DI ' + m.toUpperCase() + '. Nascono i compiti di prelievo per il magazzino: la merce non è ancora uscita.';
    S[M + ' · RF: preleva la merce delle consegne'] = 'PRELEVIAMO DAGLI SCAFFALI con la pistola: la merce va nella zona di spedizione.';
    S[M + ' · uscita merci delle consegne'] = 'LA MERCE DI ' + m.toUpperCase() + ' ESCE. Nasce il costo del venduto al prezzo d’acquisto: il magazzino scende.';
    S[M + ' · fatture ai clienti (VF01)'] = 'FATTURIAMO LE VENDITE DI ' + m.toUpperCase() + '. Crediti verso i clienti, ricavi e IVA a debito.';
    S[M + ' · SdI: trasmetti le fatture'] = 'INVIAMO LE FATTURE ELETTRONICHE DI ' + m.toUpperCase() + ' allo SdI: una ricevuta per ogni fattura.';
    S[M + ' · stipendio: cedolino, registrazione e bonifico'] = M === 'Dicembre'
      ? 'LO STIPENDIO DI DICEMBRE, CON LA TREDICESIMA. Cedolino, registrazione in contabilità e bonifico: dicembre pesa di più perché arriva la mensilità aggiuntiva.'
      : 'LO STIPENDIO DI ' + m.toUpperCase() + '. Cedolino, registrazione in contabilità e bonifico a Chiara: come a settembre.';
    S[M + ' · pagamenti ai fornitori e incassi dai clienti'] = 'PAGHIAMO E INCASSIAMO A FINE ' + m.toUpperCase() + '. Bonifici ai fornitori, incassi dai clienti: lo scadenziario si svuota e la banca si muove.';
    S[M + ' · liquida l’IVA'] = 'CALCOLIAMO L’IVA DI ' + m.toUpperCase() + '. IVA sulle vendite meno IVA sugli acquisti (e l’eventuale credito del mese prima): si vede se c’è da versare.';
    S[M + ' · ME29N: fai rilasciare l’ordine dei PC (sopra i 10.000 €)'] = 'UN ORDINE GROSSO HA BISOGNO DI UNA SECONDA FIRMA. Sopra i 10.000 € l’ordine nasce bloccato: il responsabile lo rilascia. È un controllo interno.';
  });
  S['Ottobre · F24 del 16: ritenute e contributi di settembre'] = 'VERSIAMO CON L’F24 LE RITENUTE E I CONTRIBUTI DI SETTEMBRE. Quello che abbiamo trattenuto a Chiara va all’Erario e all’INPS entro il 16.';
  S['Novembre · F24 del 16: ritenute e contributi di ottobre'] = 'F24 DI NOVEMBRE: ritenute e contributi di ottobre. L’IVA di ottobre è a credito, quindi qui non c’è.';
  S['Dicembre · F24 del 16: ritenute, contributi e IVA di novembre'] = 'F24 DI DICEMBRE: ritenute, contributi e, per la prima volta, l’IVA di novembre che è a debito.';
  (window.MSA_SPIEGAZIONI = window.MSA_SPIEGAZIONI || {})['executive-assistant'] = S;
})();
