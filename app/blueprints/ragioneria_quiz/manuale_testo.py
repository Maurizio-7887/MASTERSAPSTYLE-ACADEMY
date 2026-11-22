"""Manuale di ragioneria — trattato in ordine logico, dalla costituzione alla riapertura.

Il testo è scritto qui; le scritture d'esempio sono quelle CORRETTE della banca domande
(riferite per ID), così manuale e quiz restano sempre coerenti.
Ogni sezione: (titolo, html del testo, [ID delle scritture d'esempio]).
"""

PARTI = [
# ══════════════════════════════════════════════════════════════════════════════
{"parte": "Parte prima — I fondamenti", "capitoli": [

{"titolo": "L'azienda, il patrimonio e il reddito", "unita": ["C01"], "sezioni": [
("Che cosa misura la contabilità", """
<p>L'azienda è un'organizzazione di persone e di beni che produce o scambia beni e servizi per soddisfare dei bisogni e ottenere un guadagno. Per governarla occorre sapere, in ogni momento, <b>che cosa possiede, che cosa deve e quanto ha guadagnato</b>. La contabilità generale (o contabilità «in partita doppia») è il sistema che registra tutti i fatti di gestione per rispondere a queste tre domande.</p>
<p>I fatti che si registrano sono le <b>operazioni con l'esterno</b>: acquisti, vendite, pagamenti, incassi, stipendi, finanziamenti, imposte. A fine anno si aggiungono le <b>scritture di assestamento</b>, che adeguano i conti al principio di competenza (parte quarta).</p>
""", []),
("Il patrimonio", """
<p>Il <b>patrimonio</b> è l'insieme dei beni e dei diritti a disposizione dell'azienda in un certo momento, con gli impegni che gravano su di essi.</p>
<ul>
<li><b>Attività</b>: ciò che l'azienda possiede o ha diritto di ricevere — denaro in cassa e in banca, crediti verso clienti, merci, macchinari, automezzi.</li>
<li><b>Passività</b>: ciò che l'azienda deve ad altri — debiti verso fornitori, verso banche, verso l'Erario, verso i dipendenti.</li>
<li><b>Patrimonio netto</b>: la differenza tra attività e passività. Rappresenta i mezzi propri: il capitale apportato dai soci, le riserve, l'utile non ancora distribuito.</li>
</ul>
<p class="rq-man-formula">Attività − Passività = Patrimonio netto</p>
<p>Ne deriva che il patrimonio netto non è denaro in banca: la banca è soltanto una delle attività. Un'azienda può avere un patrimonio netto elevato e la banca vuota, perché la ricchezza è investita in macchinari e merci.</p>
""", []),
("Il reddito e il principio di competenza", """
<p>Il <b>reddito d'esercizio</b> è l'aumento (utile) o la diminuzione (perdita) del patrimonio netto prodotto dalla gestione in un periodo, normalmente l'anno solare.</p>
<p class="rq-man-formula">Ricavi − Costi = Utile (se positivo) o Perdita (se negativo)</p>
<p>Costi e ricavi si attribuiscono all'esercizio secondo il <b>principio di competenza economica</b>: un costo appartiene all'anno in cui si consuma il bene o si riceve il servizio, un ricavo all'anno in cui si realizza la vendita o si presta il servizio, <b>indipendentemente dal momento del pagamento o dell'incasso</b>.</p>
<p>Per questo vanno sempre tenuti distinti due aspetti di ogni operazione:</p>
<ul>
<li>l'<b>aspetto finanziario</b>: entrate e uscite di denaro, nascita ed estinzione di crediti e debiti;</li>
<li>l'<b>aspetto economico</b>: nascita di costi e di ricavi, cioè variazioni del reddito.</li>
</ul>
<p>Una vendita a 60 giorni fa nascere subito il ricavo (aspetto economico) e un credito (aspetto finanziario); l'incasso, due mesi dopo, è solo finanziario. Allo stesso modo il pagamento di una fattura fornitore non è un nuovo costo: estingue un debito.</p>
""", []),
("Operazioni permutative e modificative", """
<p>Le operazioni si possono classificare in base all'effetto sul patrimonio netto:</p>
<ul>
<li><b>permutative</b>: cambiano la composizione del patrimonio ma non il netto. Esempi: prelievo dalla banca per la cassa, incasso di un credito, pagamento di un debito, accensione di un mutuo.</li>
<li><b>modificative</b>: cambiano il patrimonio netto. Possono passare dal reddito (costi e ricavi) oppure derivare da rapporti con i soci (apporti di capitale, distribuzione di dividendi).</li>
</ul>
<p>Saper riconoscere il tipo di operazione è il primo passo per scegliere i conti giusti.</p>
""", []),
]},

{"titolo": "Il conto e il metodo della partita doppia", "unita": ["C02"], "sezioni": [
("Il conto", """
<p>Il <b>conto</b> è lo strumento che registra le variazioni di un singolo elemento: la banca, i crediti verso clienti, il costo dell'energia. Ha due sezioni affiancate: a sinistra il <b>Dare</b>, a destra l'<b>Avere</b>. La differenza tra il totale Dare e il totale Avere è il <b>saldo</b>: «saldo dare» se prevale il Dare, «saldo avere» se prevale l'Avere.</p>
""", []),
("Le regole del Dare e dell'Avere", """
<p>Ogni conto ha una <b>natura</b> che stabilisce in quale sezione aumenta:</p>
<table class="rq-scr rq-man-tab">
<thead><tr><th>Natura del conto</th><th>Aumenta in</th><th>Diminuisce in</th><th>Saldo normale</th></tr></thead>
<tbody>
<tr><td>Attività (cassa, banca, crediti, beni)</td><td><b>Dare</b></td><td>Avere</td><td>dare</td></tr>
<tr><td>Costi</td><td><b>Dare</b></td><td>Avere</td><td>dare</td></tr>
<tr><td>Passività (debiti)</td><td><b>Avere</b></td><td>Dare</td><td>avere</td></tr>
<tr><td>Patrimonio netto</td><td><b>Avere</b></td><td>Dare</td><td>avere</td></tr>
<tr><td>Ricavi</td><td><b>Avere</b></td><td>Dare</td><td>avere</td></tr>
<tr><td>Fondi rettificativi dell'attivo (ammortamento, svalutazione crediti)</td><td><b>Avere</b></td><td>Dare</td><td>avere</td></tr>
</tbody></table>
<p>Un costo si registra in Dare perché riduce il patrimonio netto (che aumenta in Avere); un ricavo in Avere perché lo aumenta. Un costo si scrive in Avere solo per rettificarlo o per chiuderlo a fine anno; lo stesso vale, all'inverso, per i ricavi.</p>
""", []),
("La partita doppia", """
<p>Ogni operazione si registra con <b>almeno due conti</b>, in modo che il totale Dare sia uguale al totale Avere. È la regola della <b>partita doppia</b>: se entra denaro in banca (Dare), da qualche parte c'è una contropartita in Avere (un credito che si estingue, un capitale versato, un ricavo, un debito che nasce).</p>
<p>Il pareggio è <b>necessario ma non sufficiente</b>: anche una scrittura con le sezioni tutte invertite, o con un conto sbagliato, pareggia. Per controllare una scrittura bisogna chiedersi, riga per riga, se il conto è quello giusto e se si muove nel verso giusto.</p>
<p>Il metodo di lavoro è sempre lo stesso:</p>
<ol>
<li>che cosa è successo (fattura, incasso, pagamento, maturazione di un costo)?</li>
<li>quali conti sono coinvolti? Scegli il conto più preciso;</li>
<li>ciascun conto aumenta o diminuisce? Applica la tabella;</li>
<li>i totali Dare e Avere sono uguali?</li>
</ol>
""", ["Q01-09", "Q01-10", "Q01-11", "Q01-12"]),
]},

{"titolo": "Il piano dei conti", "unita": ["C03"], "sezioni": [
("Struttura del piano dei conti", """
<p>Il <b>piano dei conti</b> è l'elenco ordinato dei conti che l'azienda utilizza. Si divide in:</p>
<ul>
<li><b>conti patrimoniali</b>: attività, passività e patrimonio netto. Restano aperti da un anno all'altro e a fine esercizio confluiscono nello <b>Stato patrimoniale</b>;</li>
<li><b>conti economici</b>: costi e ricavi. Misurano il reddito di un solo esercizio, a fine anno si chiudono nel <b>Conto economico</b> e ripartono da zero;</li>
<li><b>conti di rettifica</b>: i fondi ammortamento e il fondo svalutazione crediti, che riducono indirettamente il valore di un'attività, e i conti che rettificano i ricavi come i resi su vendite;</li>
<li><b>variazioni delle rimanenze</b>: componenti economici di fine anno (rimanenze iniziali in Dare, finali in Avere), che entrano nel Conto economico;</li>
<li><b>conti tecnici</b>: Conto economico, Stato patrimoniale finale e iniziale, usati solo per epilogo, chiusura e riapertura;</li>
<li><b>rettifiche</b>: dei costi (resi, ribassi e abbuoni su acquisti, in Avere), dei ricavi (resi, ribassi e abbuoni su vendite, in Dare), delle attività (fondi ammortamento e svalutazione); le <b>perdite</b> hanno saldo Dare e riducono il patrimonio netto; <b>Erario c/IVA</b> può essere a credito o a debito secondo il saldo.</li>
</ul>
<p>L'elenco completo usato in questo manuale è nell'appendice.</p>
""", []),
("Scegliere il conto giusto", """
<p>Il conto deve descrivere la <b>natura</b> dell'operazione. Gli errori più frequenti nascono dall'uso di conti generici:</p>
<ul>
<li>«Merci c/acquisti» è riservato ai beni acquistati per essere rivenduti. Energia, assicurazioni, consulenze, cancelleria, canoni hanno conti propri;</li>
<li>un bene che dura più anni (macchinario, mobile, automezzo) è un'<b>immobilizzazione</b>, non un costo dell'anno;</li>
<li>gli interessi attivi bancari, i fitti attivi e le plusvalenze sono ricavi diversi dalle vendite e hanno conti propri;</li>
<li>il credito non è il ricavo, il debito non è il costo: sono conti diversi, anche quando nascono nella stessa scrittura.</li>
</ul>
<p>Clienti e fornitori hanno un conto <b>generale</b> (Crediti v/clienti, Debiti v/fornitori) e un <b>partitario</b> per ciascuna controparte; la somma dei partitari è sempre uguale al saldo del conto generale.</p>
""", ["Q02-12", "Q02-11"]),
("Raccordo con il piano dei conti del gestionale SAP", """
<p>Nell'esercitazione «Dicembre» i conti hanno un <b>codice</b>. La tabella collega i codici del gestionale ai conti del manuale e alla voce del bilancio civilistico (art. 2424 e 2425 c.c.). Dove c'è una lineetta il conto esiste solo perché il gestionale tiene il magazzino a valore (metodo permanente) o fa contabilità analitica.</p>
<div style="overflow-x:auto"><table class="rq-man-tab"><tr><th>Gestionale SAP</th><th>Manuale (metodo italiano)</th><th>Natura · voce di bilancio</th></tr><tr><td>01 Impianti e macchinari</td><td>Impianti e macchinari</td><td>Attività · B.II.2</td></tr><tr><td>02 Fondo ammortamento impianti e macchinari</td><td>F.do amm. impianti e macchinari</td><td>Rettifica di attività</td></tr><tr><td>06 Risconti attivi</td><td>Risconti attivi</td><td>Attività · D</td></tr><tr><td>07 Magazzino semilavorati</td><td>Prodotti in lavorazione e semilavorati</td><td>Attività · C.I.2</td></tr><tr><td>08 Crediti verso soci</td><td>Soci c/sottoscrizione</td><td>Attività · A</td></tr><tr><td>10 Banca c/c</td><td>Banca c/c</td><td>Attività · C.IV.1</td></tr><tr><td>11 Crediti verso clienti</td><td>Crediti v/clienti</td><td>Attività · C.II.1</td></tr><tr><td>12 Magazzino ferro (materie prime)</td><td>Materie prime</td><td>Attività · C.I.1</td></tr><tr><td>13 Magazzino prodotti finiti</td><td>Prodotti finiti</td><td>Attività · C.I.4</td></tr><tr><td>14 IVA a credito</td><td>IVA ns/credito</td><td>Attività · C.II.5-bis</td></tr><tr><td>20 Debiti verso fornitori</td><td>Debiti v/fornitori</td><td>Passività · D.7</td></tr><tr><td>21 IVA a debito</td><td>IVA ns/debito</td><td>Passività · D.12</td></tr><tr><td>22 Fatture da ricevere (WE/RE)</td><td>Fatture da ricevere</td><td>Passività · D.7 (nel gestionale fa da ponte tra MIGO e MIRO)</td></tr><tr><td>25 Erario c/IVA</td><td>Erario c/IVA</td><td>a credito o a debito secondo il saldo</td></tr><tr><td>27 Debiti verso dipendenti</td><td>Personale c/retribuzioni</td><td>Passività · D.14</td></tr><tr><td>28 Debiti verso INPS · 24 INAIL</td><td>Istituti previdenziali</td><td>Passività · D.13</td></tr><tr><td>29 Erario c/ritenute</td><td>Erario c/ritenute</td><td>Passività · D.12</td></tr><tr><td>30 Capitale e riserve · 33 Riserva legale</td><td>Capitale sociale · Riserva legale</td><td>Patrimonio netto · A.I, A.IV</td></tr><tr><td>31 Fondo TFR</td><td>Debiti per TFR</td><td>Passività · C</td></tr><tr><td>32 Utile (perdita) d'esercizio</td><td>Utile d'esercizio / Perdita d'esercizio</td><td>Patrimonio netto · A.IX</td></tr><tr><td>37.10 Mutui passivi</td><td>Mutui passivi</td><td>Passività · D.4</td></tr><tr><td>38 Banca c/anticipi su fatture</td><td>Banche c/anticipi su fatture</td><td>Passività · D.4</td></tr><tr><td>39 Ratei passivi</td><td>Ratei passivi</td><td>Passività · E</td></tr><tr><td>40 Ricavi di vendita · 47 Sconti su vendite</td><td>Prodotti c/vendite (al netto degli sconti)</td><td>Ricavo · A.1</td></tr><tr><td>41 Costo del venduto a standard</td><td>— (nel metodo italiano: acquisti ± variazione rimanenze)</td><td>Costo · nel CE civilistico si riparte per natura</td></tr><tr><td>50 Ammortamenti</td><td>Ammortamento …</td><td>Costo · B.10</td></tr><tr><td>54 Consulenze e servizi</td><td>Consulenze</td><td>Costo · B.7</td></tr><tr><td>63 Differenze prezzo materiali</td><td>— (non esiste: il ferro è a costo effettivo)</td><td>Costo · B.6</td></tr><tr><td>65 Differenze inventariali · 69 Rottamazioni</td><td>— (entrano nel valore delle rimanenze finali)</td><td>Costo · B.11 / B.14</td></tr><tr><td>70 Consumi di materie prime</td><td>— (acquisti ± variazione rimanenze)</td><td>Costo · B.6 e B.11</td></tr><tr><td>72 / 75 Attività addebitate e accreditate</td><td>— (contabilità analitica)</td><td>si compensano: non cambiano l'utile</td></tr><tr><td>80 · 81 · 82 Salari, oneri sociali, TFR</td><td>Salari e stipendi · Oneri sociali · TFR</td><td>Costo · B.9</td></tr><tr><td>90 · 91 · 92</td><td>Conto economico · Stato patrimoniale finale · Stato patrimoniale iniziale</td><td>Conti tecnici</td></tr></table></div>
""", []),
]},

{"titolo": "I libri contabili: giornale, mastro, partitari e bilancio di verifica", "unita": ["C04"], "sezioni": [
("Quattro modi di registrare le stesse operazioni", """
<p>Le regole della partita doppia sono le stesse ovunque; cambia <b>dove</b> e <b>quando</b> il programma scrive. In questo manuale ogni operazione è mostrata in quattro modi:</p>
<div style="overflow-x:auto"><table class="rq-man-tab"><tr><th></th><th>📗 Metodo italiano (manuale)</th><th>🟧 ad hoc Revolution (Zucchetti)</th><th>🟦 Dynamics 365 Business Central (localizzazione italiana)</th><th>🟪 SAP S/4HANA (esercitazione)</th></tr>
<tr><td>Dove si registra</td><td>Libro giornale</td><td>Prima Nota con causali contabili (FA fattura acquisti, FV fattura vendite, IN incasso…): la causale propone i conti</td><td>Documenti (fatture, ordini) e registrazioni C/G</td><td>Documenti di logistica (MIGO, consegne) e di contabilità (MIRO, FB60, F-28…)</td></tr>
<tr><td>Magazzino in contabilità</td><td>Solo a fine anno: rimanenze finali e iniziali</td><td>Come il metodo italiano: rimanenze registrate a fine anno dal valore dell'inventario</td><td>Sempre a valore (permanente); con il piano dei conti italiano la contropartita è la variazione delle rimanenze</td><td>Sempre a valore (permanente), a costo standard; costo del venduto a ogni consegna</td></tr>
<tr><td>Acquisto di merce</td><td>Con la fattura: Acquisti / Debiti</td><td>Con la fattura, in Primanota</td><td>Con la fattura: Acquisti / Debiti e insieme Magazzino / Variazione rimanenze</td><td>All'entrata merce (Magazzino / Fatture da ricevere), poi la fattura chiude il ponte</td></tr>
<tr><td>Ratei e risconti</td><td>Scritture del 31/12, storno o chiusura nel nuovo anno</td><td>Scritture di assestamento in Primanota</td><td>Modelli di differimento (risconti) e registrazioni periodiche con storno automatico (ratei)</td><td>Registrazioni con storno automatico (FBS1 e F.81) o gestione ratei</td></tr>
<tr><td>Chiusura</td><td>Epilogo nel Conto economico, chiusura nello Stato patrimoniale finale</td><td>Procedura Chiusura/apertura conti: Profitti e perdite, Bilancio di chiusura</td><td>«Chiusura conto economico» e «Chiusura/apertura stato patrimoniale»</td><td>Registrazioni di chiusura e apertura per l'Italia (conti 90, 91)</td></tr>
<tr><td>Riapertura</td><td>Dallo Stato patrimoniale iniziale, poi giro a costo delle rimanenze iniziali</td><td>Dal Bilancio di apertura, poi rimanenze iniziali a costo in Primanota</td><td>Dal conto di apertura; nessun giro delle rimanenze</td><td>Dal conto 92; nessun giro delle rimanenze</td></tr></table></div>
<p>I nomi dei conti di ad hoc Revolution e di Business Central dipendono dal piano dei conti dell'azienda: qui usiamo quelli del manuale. Le schermate dei programmi nel manuale sono <b>ricostruzioni didattiche</b>, non immagini originali.</p>
""", []),
("Il libro giornale", """
<p>Il <b>libro giornale</b> registra tutte le operazioni in <b>ordine cronologico</b>. Ogni registrazione (articolo) riporta data, descrizione, conti movimentati, importi in Dare e in Avere. È la fonte da cui derivano tutti gli altri prospetti.</p>
""", []),
("Il libro mastro e i saldi", """
<p>Il <b>libro mastro</b> raccoglie le stesse registrazioni ordinate <b>per conto</b>: ogni conto ha il suo mastrino con tutti i movimenti in Dare e in Avere. Il saldo si calcola sottraendo il totale minore dal maggiore.</p>
<p class="rq-man-formula">Esempio — Banca c/c: Dare 10.000 + 9.760 = 19.760; Avere 6.100 + 3.000 = 9.100 → saldo dare 10.660</p>
<p>Un <b>saldo anomalo</b> è un campanello d'allarme: la Cassa non può avere saldo avere (non si spendono più contanti di quelli presenti); i Crediti v/clienti con saldo avere fanno pensare a un incasso registrato due volte o a un anticipo registrato nel conto sbagliato.</p>
""", []),
("I partitari clienti e fornitori", """
<p>Il <b>partitario</b> mostra, per ogni cliente o fornitore, fatture, note di credito, incassi o pagamenti e il <b>residuo</b> ancora aperto. Un incasso parziale chiude solo una parte della fattura.</p>
<p class="rq-man-formula">Fattura 1.220 − incasso 700 = residuo 520 (saldo dare: il cliente deve ancora pagare)</p>
<p class="rq-man-formula">Fattura 2.440 − pagamento 1.000 − nota di credito 244 = debito residuo 1.196</p>
<p>Se un cliente paga più del dovuto, il suo partitario va in saldo avere: è un debito verso di lui da rimborsare o compensare, non un ricavo.</p>
""", ["Q03-09"]),
("Il bilancio di verifica", """
<p>Il <b>bilancio di verifica</b> è l'elenco dei saldi di tutti i conti: il totale dei saldi dare deve uguagliare il totale dei saldi avere. Si prepara durante l'anno e prima delle scritture di chiusura.</p>
<p>Il pareggio scopre gli errori aritmetici (una scrittura sbilanciata, un saldo riportato male, un conto dimenticato) ma <b>non</b> gli errori di conto o di sezione in scritture che pareggiano: quelli si trovano controllando mastrini e partitari.</p>
""", []),
("La correzione degli errori", """
<p>Il giornale non si cancella. Un errore si corregge con lo <b>storno</b>, cioè la stessa scrittura con le sezioni invertite, seguito dalla registrazione corretta; oppure con un'unica scrittura di rettifica che sposta solo la differenza. Ogni correzione resta visibile, con data e descrizione.</p>
""", ["Q03-11", "Q20-08"]),
]},
]},

# ══════════════════════════════════════════════════════════════════════════════
{"parte": "Parte seconda — La costituzione dell'azienda", "capitoli": [

{"titolo": "La costituzione e il capitale sociale", "unita": ["C05"], "sezioni": [
("Sottoscrizione e versamento", """
<p>Con l'atto costitutivo i soci <b>sottoscrivono</b> il capitale, cioè si impegnano a conferirlo. Nasce un credito della società verso i soci e il capitale sociale, voce del patrimonio netto.</p>
<p>Con il <b>versamento</b> il denaro entra in banca e il credito verso i soci si chiude. Se sottoscrizione e versamento sono contestuali, la scrittura si fa in un solo passaggio: Banca c/c a Capitale sociale.</p>
<p>Il capitale sociale <b>non è un ricavo</b> (non nasce dalla gestione) e <b>non è un debito</b> (resta vincolato nella società). Si modifica solo con una delibera dell'assemblea.</p>
""", ["Q04-01", "Q04-02"]),
("Aumenti di capitale e finanziamenti dei soci", """
<p>Un <b>aumento di capitale</b> deliberato e versato si registra come la costituzione: entra liquidità e aumenta il capitale.</p>
<p>Diverso è il <b>finanziamento dei soci</b>: se il socio presta denaro da restituire, nasce un debito, non capitale. Le riserve non si trasformano «da sole» in capitale: serve una delibera di aumento gratuito.</p>
""", ["Q04-10"]),
]},
]},

# ══════════════════════════════════════════════════════════════════════════════
{"parte": "Parte terza — Le operazioni di gestione", "capitoli": [

{"titolo": "Il meccanismo dell'IVA", "unita": ["C06"], "sezioni": [
("IVA a credito e IVA a debito", """
<p>L'IVA è un'imposta sui consumi che l'azienda <b>incassa dai clienti per conto dello Stato</b> e <b>paga ai fornitori</b> sui propri acquisti.</p>
<ul>
<li>L'IVA sulle vendite è un <b>debito verso l'Erario</b>: conto <b>IVA ns/debito</b>, in Avere.</li>
<li>L'IVA sugli acquisti, se detraibile, è un <b>credito verso l'Erario</b>: conto <b>IVA ns/credito</b>, in Dare.</li>
</ul>
<p>Per l'azienda l'IVA detraibile <b>non è né un costo né un ricavo</b>: il costo d'acquisto e il ricavo di vendita si registrano per l'imponibile, l'IVA in un conto a parte. L'IVA ns/debito non si chiude quando il cliente paga, ma con la liquidazione periodica (capitolo 10).</p>
""", []),
("Operazioni esenti e IVA indetraibile", """
<p>Alcune operazioni sono <b>esenti</b> (ad esempio i premi di assicurazione): l'IVA non si applica e il costo si registra per l'importo intero.</p>
<p>Se invece l'IVA è <b>indetraibile</b>, in tutto o in parte, la quota che non si può detrarre diventa un costo; se riguarda un bene strumentale si aggiunge al suo costo e si ammortizza con il bene.</p>
""", []),
]},

{"titolo": "Gli acquisti e i rapporti con i fornitori", "unita": ["C07"], "sezioni": [
("La fattura di acquisto", """
<p>Con la fattura del fornitore si registrano il <b>costo</b> (per natura: merci, servizi, utenze), l'<b>IVA a credito</b> e il <b>debito</b> verso il fornitore per il totale. Attenzione: la fattura è il documento, ma la <b>competenza</b> dipende dal fatto economico. Un ordine non è ancora un costo; per i beni conta il passaggio sostanziale di rischi e benefici (di norma la consegna), per i servizi il momento in cui sono resi (OIC 19, OIC 34). Se il bene è arrivato a dicembre e la fattura arriva a gennaio, il costo è di dicembre (Fatture da ricevere, capitolo 18).</p>
<p class="rq-man-formula">Costo (D) + IVA ns/credito (D) = Debiti v/fornitori (A)</p>
<p>Il costo nasce con la fattura o con la consegna, anche se il pagamento avviene dopo: principio di competenza.</p>
""", ["Q05-01", "Q05-11"]),
("Resi e note di credito del fornitore", """
<p>Se restituiamo merce o il fornitore riduce il prezzo, emette una <b>nota di credito</b>: il debito diminuisce (Dare) e si rettificano costo e IVA a credito (Avere). Il conto «Resi su acquisti» rettifica in diminuzione gli acquisti: non è un ricavo, e nel Conto economico gli acquisti si espongono al netto dei resi (OIC 12).</p>
""", ["Q05-04"]),
("Acconti ai fornitori", """
<p>Se paghiamo prima della consegna e riceviamo una fattura d'acconto, l'anticipo è un <b>credito transitorio</b> verso il fornitore (Fornitori c/anticipi) con la sua IVA. Alla fattura finale si registra il costo intero, l'IVA solo sulla parte non ancora fatturata e si chiude l'anticipo: resta da pagare il residuo.</p>
""", ["Q05-05", "Q05-06"]),
("Abbuoni ottenuti", """
<p>L'abbuono concesso dal fornitore dopo la fattura riduce il debito (o entra in banca se la fattura era già pagata) e si registra in Avere in <b>Ribassi e abbuoni attivi</b>: è una rettifica del costo d'acquisto, non un ricavo autonomo. Gli sconti di natura finanziaria (per pagamento anticipato) sono un'altra cosa e stanno nella gestione finanziaria.</p>
""", ["Q05-07"]),
("Registrazioni doppie", """
<p>Una fattura registrata due volte raddoppia costo, IVA detraibile e debito. Si corregge con lo storno della seconda registrazione: Debiti v/fornitori in Dare, costo e IVA in Avere.</p>
""", []),
]},

{"titolo": "Le vendite e i rapporti con i clienti", "unita": ["C08"], "sezioni": [
("La fattura di vendita", """
<p>Con la fattura al cliente si registrano il <b>credito</b> per il totale, il <b>ricavo</b> per l'imponibile e l'<b>IVA a debito</b>. Se il cliente paga subito, al posto del credito si muove la cassa o la banca. Il ricavo dei beni è di competenza dell'esercizio della consegna (passaggio di rischi e benefici, OIC 34), non necessariamente di quello della fattura; un acconto ricevuto non è un ricavo.</p>
<p class="rq-man-formula">Crediti v/clienti (D) = Merci c/vendite (A) + IVA ns/debito (A)</p>
<p>Il ricavo nasce con la vendita, non con l'incasso.</p>
""", ["Q06-01", "Q06-02"]),
("Note di credito e abbuoni ai clienti", """
<p>La <b>nota di credito</b> per reso o sconto riduce il credito (Avere) e rettifica ricavo e IVA a debito (Dare), tramite il conto «Resi su vendite». Un abbuono concesso senza variazione IVA è un componente negativo: <b>Ribassi e abbuoni passivi</b>.</p>
""", ["Q06-03", "Q06-10"]),
("Acconti dai clienti", """
<p>L'acconto ricevuto prima della consegna non è ancora un ricavo: è un <b>debito verso il cliente</b> (Clienti c/anticipi). Con la fattura d'acconto nasce anche l'IVA a debito. Alla fattura finale si registra il ricavo intero, l'IVA sulla parte non ancora fatturata e si chiude l'anticipo.</p>
""", ["Q06-04", "Q06-08"]),
]},

{"titolo": "Il regolamento: incassi, pagamenti, cassa e banca", "unita": ["C09"], "sezioni": [
("Incassi e pagamenti", """
<p>Incassi e pagamenti sono operazioni <b>solo finanziarie</b>: non creano costi né ricavi.</p>
<ul>
<li>Incasso: Banca c/c (o Cassa) in Dare, Crediti v/clienti in Avere.</li>
<li>Pagamento: Debiti v/fornitori in Dare, Banca c/c (o Cassa) in Avere.</li>
</ul>
<p>Si registra sempre quanto entra o esce davvero: un pagamento parziale riduce solo una parte del debito. Un pagamento cumulativo chiude più partite dello stesso fornitore. Se la banca trattiene commissioni, il credito si chiude per intero e la differenza è un costo bancario.</p>
""", ["Q05-02", "Q03-10", "Q07-02", "Q07-10", "Q07-12"]),
("Cassa, banca e girofondi", """
<p>Cassa e banca sono conti separati. Il prelievo dalla banca per la cassa, o il versamento di contanti in banca, è un <b>girofondo</b>: cambia la forma della liquidità, non il reddito.</p>
""", ["Q07-03"]),
("La riconciliazione bancaria", """
<p>Periodicamente si confronta il mastrino Banca c/c con l'estratto conto. Le differenze nascono da voci note solo alla banca (spese, interessi, commissioni) o da operazioni non ancora contabilizzate da una delle due parti. Le voci note solo dall'estratto si registrano in contabilità; l'estratto della banca non si «corregge».</p>
""", []),
("Gli insoluti", """
<p>Se alla scadenza il cliente non paga, il credito si evidenzia in <b>Crediti insoluti</b> per seguirne il recupero. Non è ancora una perdita: lo diventerà solo se il credito risulterà definitivamente inesigibile (capitolo 18).</p>
""", ["Q07-05"]),
]},

{"titolo": "La liquidazione e il versamento dell'IVA", "unita": ["C10"], "sezioni": [
("La liquidazione periodica", """
<p>Alla fine del periodo (mese o trimestre) si confrontano IVA a debito e IVA a credito. I due conti si chiudono e la differenza passa in <b>Erario c/IVA</b>:</p>
<ul>
<li>se prevale il debito, Erario c/IVA va in <b>Avere</b>: è l'IVA da versare;</li>
<li>se prevale il credito, Erario c/IVA va in <b>Dare</b>: il credito si riporta alla liquidazione successiva.</li>
</ul>
<p class="rq-man-formula">IVA a debito 900 − IVA a credito 1.300 − credito precedente 200 = credito 600 da riportare</p>
""", ["Q08-01", "Q08-03"]),
("Il versamento con F24", """
<p>Il versamento con il modello F24 estingue il debito Erario c/IVA: <b>non è un costo</b>. Nello stesso F24 si possono versare più debiti (IVA, ritenute dei dipendenti, contributi): ciascuno si chiude con il proprio conto.</p>
""", ["Q08-02", "Q08-11"]),
("Il reverse charge", """
<p>Per gli acquisti di servizi da fornitori di altri Paesi UE il fornitore fattura senza IVA e l'IVA la deve chi compra (inversione contabile). L'acquirente integra la fattura registrando l'IVA <b>sia a credito sia a debito</b>: se è detraibile l'effetto netto è zero. Il debito verso il fornitore è per il solo imponibile.</p>
""", ["Q08-04"]),
("L'IVA parzialmente indetraibile", """
<p>Per alcuni beni (ad esempio le autovetture) l'IVA è detraibile solo in parte. La quota detraibile va in IVA ns/credito, la quota indetraibile si aggiunge al costo del bene.</p>
""", ["Q08-05"]),
]},

{"titolo": "Il personale", "unita": ["C11"], "sezioni": [
("Il costo del lavoro e la busta paga", """
<p>Il costo del lavoro per l'azienda è la <b>retribuzione lorda</b> (Salari e stipendi) più i <b>contributi a carico dell'azienda</b> (Oneri sociali).</p>
<p>Dal lordo l'azienda trattiene l'<b>IRPEF</b> (come sostituto d'imposta) e i <b>contributi a carico del dipendente</b>: diventano debiti verso l'Erario (Erario c/ritenute) e verso gli enti previdenziali (Istituti previdenziali). Al dipendente spetta il <b>netto</b> (Personale c/retribuzioni).</p>
<p class="rq-man-formula">Netto = lordo − IRPEF trattenuta − contributi a carico del dipendente</p>
<p class="rq-man-nota">Gli importi delle buste paga di questo manuale sono dati del caso, non un calcolo paghe reale. Per il 2026 l'IRPEF ha tre scaglioni: 23% fino a 28.000 €, 33% da 28.000 a 50.000 €, 43% oltre (L. 199/2025).</p>
""", ["Q09-01", "Q09-02"]),
("Pagamento degli stipendi e versamenti", """
<p>Il bonifico al dipendente chiude il debito Personale c/retribuzioni: registrare di nuovo «Salari e stipendi» conterebbe il costo due volte. Ritenute e contributi si versano con F24 entro il 16 del mese successivo; il versamento estingue i debiti.</p>
""", ["Q09-03", "Q09-04"]),
("Il trattamento di fine rapporto", """
<p>Ogni anno matura una quota di TFR, che è un costo dell'esercizio e aumenta il debito verso i dipendenti (Debiti per TFR). Si paga alla fine del rapporto: in quel momento si chiude il debito accantonato e la ritenuta fiscale diventa un debito verso l'Erario. L'accantonamento annuo è trattato tra le scritture di assestamento (capitolo 18).</p>
""", ["Q09-11"]),
]},

{"titolo": "I beni strumentali: acquisto e costo", "unita": ["C12"], "sezioni": [
("Le immobilizzazioni materiali", """
<p>I beni destinati a restare in azienda per più esercizi (impianti e macchinari, automezzi, arredamento) sono <b>immobilizzazioni</b>. Si iscrivono nell'attivo e il loro costo si distribuisce negli anni di utilizzo con l'<b>ammortamento</b> (capitolo 18).</p>
""", ["Q05-03", "Q03-12"]),
("Il costo da iscrivere", """
<p>Il cespite si iscrive al <b>costo d'acquisto più gli oneri accessori</b> necessari a renderlo utilizzabile: trasporto, montaggio, collaudo. Non fanno parte del costo l'IVA detraibile, le manutenzioni ordinarie successive e gli interessi del finanziamento degli anni seguenti.</p>
<p>L'ammortamento parte da quando il bene è <b>disponibile e pronto per l'uso</b>, non dalla data della fattura né dal pagamento (OIC 16). La quota dipende da costo ammortizzabile, valore residuo e vita utile. La <b>metà dell'aliquota</b> nel primo anno è un'approssimazione ammessa solo se non si discosta molto dalla quota effettiva: per un bene pronto il 1° dicembre la quota corretta è un mese, non sei. L'ammortamento civilistico e quello deducibile fiscalmente sono due calcoli distinti.</p>
""", ["Q13-02", "Q13-10"]),
]},

{"titolo": "Il leasing", "unita": ["C13"], "sezioni": [
("Il leasing con il metodo patrimoniale", """
<p>Con il leasing l'azienda usa un bene che resta di proprietà della società di leasing, pagando dei canoni, con la facoltà di riscattarlo alla fine. Nei bilanci redatti con i principi contabili italiani (OIC) si usa il <b>metodo patrimoniale</b>:</p>
<ul>
<li>il bene <b>non</b> si iscrive tra le immobilizzazioni e <b>non</b> si ammortizza finché non è riscattato;</li>
<li>ogni canone fatturato è un costo (Canoni di leasing) con IVA a credito;</li>
<li>il <b>maxicanone</b> iniziale paga in anticipo il godimento per tutta la durata del contratto: a fine anno la parte futura si rinvia con un risconto attivo (capitolo 18);</li>
<li>il <b>deposito cauzionale</b> eventualmente versato è un credito, non un costo;</li>
<li>al <b>riscatto</b> il bene entra tra le immobilizzazioni al prezzo di riscatto e da quel momento si ammortizza.</li>
</ul>
<p>Rispetto al mutuo: con il mutuo il bene è subito dell'azienda (cespite + debito); con il leasing patrimoniale l'azienda registra canoni a costo e il bene diventa suo solo con il riscatto.</p>
""", ["Q11-04", "Q11-02", "Q11-01", "Q11-05"]),
]},

{"titolo": "I finanziamenti bancari: mutuo, anticipo fatture, factoring", "unita": ["C14"], "sezioni": [
("Il mutuo", """
<p>All'<b>erogazione</b> entra denaro in banca e nasce il debito (Mutui passivi) per il valore nominale; le spese trattenute dalla banca sono un costo. Il patrimonio netto non cambia.</p>
<p>La <b>rata</b> ha due parti: la <b>quota capitale</b> rimborsa il debito, la <b>quota interessi</b> è un costo. La rata intera non è un costo.</p>
<p class="rq-man-formula">Debito residuo = erogato − quote capitale rimborsate (20.000 − 4 × 500 = 18.000)</p>
<p>In bilancio il debito residuo si divide tra la parte da rimborsare entro 12 mesi e quella oltre. Gli interessi maturati e non ancora pagati a fine anno si rilevano con un rateo passivo (capitolo 18).</p>
""", ["Q10-01", "Q10-03", "Q10-02", "Q10-10"]),
("L'anticipo su fatture", """
<p>Con l'anticipo su fatture la banca presta una percentuale del credito verso il cliente. <b>Il credito resta all'azienda</b>: nasce un debito verso la banca (Banche c/anticipi su fatture).</p>
<ul>
<li>Erogazione: Banca c/c in Dare, Banche c/anticipi su fatture in Avere.</li>
<li>Pagamento del cliente alla banca: si chiudono il debito per l'anticipo e il credito verso il cliente; l'eccedenza entra in conto.</li>
<li>Interessi e commissioni: costi.</li>
<li>Insoluto: la banca riaddebita l'anticipo e il credito passa tra gli insoluti.</li>
</ul>
<p>Registrare l'anticipo come un movimento Dare e Avere sullo stesso conto («conti d'ordine») non rileva né il denaro ricevuto né il debito verso la banca: è un errore.</p>
""", ["Q12-01", "Q12-02", "Q12-03", "Q12-04", "Q12-05"]),
("Il factoring", """
<p>Nel <b>factoring pro soluto</b> il credito viene ceduto a titolo definitivo e il rischio di mancato pagamento passa al factor: il credito esce dal bilancio. Nell'anticipo su fatture, invece, il credito resta all'azienda fino all'incasso.</p>
""", []),
]},

{"titolo": "La cessione e la dismissione dei cespiti", "unita": ["C15"], "sezioni": [
("Valore netto contabile, plusvalenze e minusvalenze", """
<p>Il <b>valore netto contabile</b> di un cespite è il costo storico meno il fondo ammortamento. Alla vendita si confronta con il prezzo:</p>
<ul>
<li>prezzo &gt; valore netto → <b>plusvalenza</b> (ricavo);</li>
<li>prezzo &lt; valore netto → <b>minusvalenza</b> (costo).</li>
</ul>
<p class="rq-man-formula">Costo 3.000 − fondo 2.200 = valore netto 800; prezzo 1.100 → plusvalenza 300</p>
<p>Prima della vendita, se il caso lo prevede, si registra l'ammortamento fino alla data di cessione.</p>
""", []),
("La scrittura di vendita", """
<p>La vendita si fattura con IVA. Nella stessa scrittura si eliminano dal bilancio il <b>costo storico</b> (Avere) e il <b>fondo ammortamento</b> (Dare), si rileva il credito verso il compratore e la plus o minusvalenza. Non basta scrivere «Banca a Impianti» per il prezzo: resterebbero in bilancio il residuo del costo e il fondo.</p>
""", ["Q14-01", "Q14-02", "Q14-06"]),
("Rottamazione e cessione gratuita", """
<p>Un bene interamente ammortizzato che si rottama si elimina chiudendo costo e fondo: nessun effetto sul reddito. Se il bene ceduto senza corrispettivo non è del tutto ammortizzato, il valore residuo è una minusvalenza.</p>
""", ["Q14-03", "Q14-11"]),
]},

{"titolo": "Ritenute e imposte durante l'anno", "unita": ["C16"], "sezioni": [
("La ritenuta d'acconto sui professionisti", """
<p>La parcella del professionista si registra come una fattura di servizi, con IVA. Al pagamento l'azienda trattiene la <b>ritenuta d'acconto</b> (20% dell'imponibile, non del totale con IVA) e la versa all'Erario con F24 entro il 16 del mese successivo.</p>
<p class="rq-man-formula">Imponibile 2.000 + IVA 440 − ritenuta 400 = 2.040 pagati al professionista</p>
""", ["Q18-05", "Q18-06", "Q18-07"]),
("Gli acconti d'imposta", """
<p>Gli acconti sulle imposte versati durante l'anno sono un <b>credito verso l'Erario</b>, non un costo. A fine anno si compensano con il debito per le imposte di competenza (capitolo 18).</p>
""", ["Q18-02"]),
]},

{"titolo": "Il magazzino e la produzione", "unita": ["C17"], "sezioni": [
("Le scorte", """
<p>Le rimanenze di magazzino comprendono <b>merci</b> (acquistate per la rivendita), <b>materie prime</b> (da trasformare), <b>semilavorati</b> (prodotti che hanno fatto una parte della lavorazione), <b>prodotti finiti</b> (pronti per la vendita) e <b>prodotti in corso di lavorazione</b> (WIP).</p>
<p>Il magazzino si misura in <b>quantità</b> e in <b>valore</b>: quantità × costo unitario. Un trasferimento tra depositi cambia l'ubicazione, non il valore totale. Le differenze tra inventario fisico e giacenza a sistema si rettificano: prevale la conta fisica.</p>
<p class="rq-man-formula">120 pezzi × 5,50 € = 660 €; mancano 5 pezzi da 4 € → differenza inventariale 20 €</p>
""", []),
("L'inventario fisico di fine anno: la procedura", """
<p>L'<b>inventario fisico</b> conta, pesa o misura ciò che c'è davvero; l'<b>inventario contabile</b> (giacenza a sistema) si calcola dai movimenti: <b>giacenza iniziale + entrate − uscite</b>. Il codice civile (art. 2217) obbliga a redigere l'inventario ogni anno. La procedura ha sempre gli stessi passi:</p>
<ol><li><b>Perimetro</b>: si contano solo i beni dell'azienda, ovunque siano (anche presso terzisti); non i beni di terzi in deposito né la merce già venduta in attesa di ritiro.</li>
<li><b>Cut-off</b>: data e ora oltre le quali nessun movimento entra nel conteggio (31/12 ore 18:00); si annotano l'ultimo DDT d'entrata e d'uscita.</li>
<li><b>Documento d'inventario</b>: l'elenco delle <b>posizioni</b> da contare. Una posizione è un articolo (o un lotto) in un'ubicazione: una catasta con due colate fa due posizioni; un'ubicazione vuota è una posizione da confermare a zero.</li>
<li><b>Conta cieca</b>: la lista non riporta la quantità a sistema, così chi conta non è influenzato.</li>
<li><b>Differenza = contato − contabile</b>, valorizzata al costo del magazzino. Si confronta, <b>posizione per posizione</b>, con la <b>tolleranza</b> fissata dall'azienda: sopra la soglia si riconta.</li>
<li><b>Riconta</b> da parte di un'altra persona e <b>ricerca della causa</b> nei documenti. Una causa si dimostra con un documento: se non c'è, si scrive «ammanco verificato con riconta».</li>
<li><b>Rettifica autorizzata</b> dal responsabile, con una causale che cita articolo, riconteggio, documento e autorizzazione.</li></ol>
<p>Nell'esercitazione «Dicembre», al 31/12 il ferro a sistema è 740 kg (colata COL-1204 240 kg, COL-1206 500 kg) ma la bilancia ne trova 728: nella COL-1206 ci sono 488 kg. La riconta lo conferma e salta fuori il buono di prelievo <b>BP-2912</b> del 29/12: 12 kg presi dalla manutenzione e mai registrati. Nel cassone dei kit SL-TAGLIO se ne contano 19 invece di 20, senza documenti. Tolleranza 10 € per posizione: −12 × 0,95 = −11,40 € e −1 × 14,60 = −14,60 €, entrambe da ricontare. Il responsabile autorizza con <b>AUT-2026-12</b>.</p>
<p class="rq-man-formula">Ferro: 728 − 740 = −12 kg × 0,95 = −11,40 € · Kit: 19 − 20 = −1 × 14,60 = −14,60 € · totale differenze 26,00 €</p>
""", []),
("Le differenze inventariali in contabilità", """
<p><b>Metodo italiano (periodico)</b>: la differenza non ha una scrittura propria. L'inventario fisico dà direttamente il valore delle rimanenze finali: se manca merce, le rimanenze sono più basse e il costo del venduto più alto.</p>
<p><b>Gestionale (permanente)</b>: il magazzino è già nei conti, quindi la differenza va registrata. Il movimento <b>711</b> scarica il magazzino al costo standard e porta il costo al conto <b>65 Differenze inventariali</b>:</p>
<table class="rq-man-tab"><tr><th>Documento</th><th>Dare</th><th>Avere</th><th>Importo</th></tr>
<tr><td>711 ferro, 12 kg × 0,95</td><td>65 Differenze inventariali</td><td>12 Magazzino ferro</td><td>11,40</td></tr>
<tr><td>711 kit SL-TAGLIO, 1 × 14,60</td><td>65 Differenze inventariali</td><td>07 Magazzino semilavorati</td><td>14,60</td></tr></table>
<p>Un'<b>eccedenza</b> (merce trovata in più) fa il contrario: Magazzino in Dare, differenze inventariali positive in Avere. In ogni caso la rettifica si registra <b>dopo</b> riconta e autorizzazione, una volta sola.</p>
""", []),
("Due modi di tenere il magazzino in contabilità", """
<table class="rq-man-tab"><tr><th></th><th>Metodo italiano (periodico) · quello dei quiz</th><th>Gestionale SAP (permanente) · quello dell'esercitazione</th></tr>
<tr><td>Acquisto</td><td>Merci c/acquisti (costo) in Dare</td><td>MIGO 101: 12 Magazzino ferro (attività) in Dare</td></tr>
<tr><td>Consumo / vendita</td><td>nessuna scrittura</td><td>MIGO 261 o uscita 601: il magazzino scende, nasce il costo (70 Consumi, 41 Costo del venduto)</td></tr>
<tr><td>Prodotto finito</td><td>nessuna scrittura</td><td>MIGO 101 da produzione: 13 Magazzino prodotti finiti in Dare</td></tr>
<tr><td>31 dicembre</td><td>si conta il magazzino e si rileva il valore con «Variazione rimanenze»</td><td>il saldo dei conti 12, 07, 13 è già la rimanenza: nessuna rilevazione</td></tr>
<tr><td>Chiusura e riapertura</td><td>Merci nello Stato patrimoniale finale; il 1/1 riapertura e giro a costo</td><td>12, 07, 13 nello Stato patrimoniale finale; il 1/1 solo riapertura</td></tr></table>
<p class="rq-man-formula">Costo del venduto (periodico) = rimanenze iniziali + acquisti − rimanenze finali (2.000 + 10.000 − 3.000 = 9.000)</p>
<p>I due metodi arrivano allo <b>stesso utile</b> e allo <b>stesso magazzino</b> di fine anno: cambia solo <b>quando</b> nasce il costo. Rimanenze finali più alte, a parità di tutto il resto, aumentano l'utile.</p>
""", []),
("Metodo italiano: la chiusura delle scorte finali (31/12)", """
<p>Con il metodo periodico gli acquisti dell'anno sono tutti tra i costi. Il 31 dicembre si fa l'<b>inventario</b> (quantità × costo) e si eseguono <b>tre scritture</b>, sempre in quest'ordine:</p>
<ol><li><b>Rilevazione</b> (assestamento): Merci in Dare, Variazione rimanenze merci in Avere. Le merci non vendute diventano un'attività e smettono di pesare sui costi.</li>
<li><b>Epilogo</b>: Variazione rimanenze merci in Dare, Conto economico in Avere. Il conto della variazione si azzera e il suo valore entra nel reddito.</li>
<li><b>Chiusura patrimoniale</b>: Stato patrimoniale finale in Dare, Merci in Avere. Le merci, un'attività con saldo dare, si chiudono in Avere.</li></ol>
<p>Lo stesso schema vale per le <b>materie prime</b> (Materie prime / Variazione rimanenze materie prime) e per i <b>prodotti finiti</b> (Prodotti finiti / Variazione rimanenze prodotti finiti): i prodotti che fabbrichi non sono merci.</p>
""", ["Q15-01",
      {"testo": "31/12, metodo periodico: dopo la rilevazione, chiudi nel Conto economico la variazione delle rimanenze di merci di 3.000 €.",
       "righe": [("Variazione rimanenze merci", "D", 3000), ("Conto economico", "A", 3000)],
       "spiegazione": "Epilogo: la variazione delle rimanenze ha saldo avere e si chiude in Dare; nel Conto economico va in Avere, tra i componenti positivi."},
      {"testo": "31/12, chiusura patrimoniale: chiudi il conto Merci (saldo dare 3.000 €).",
       "righe": [("Stato patrimoniale finale", "D", 3000), ("Merci", "A", 3000)],
       "spiegazione": "Le merci sono un'attività: si chiudono in Avere e passano in Dare dello Stato patrimoniale finale."},
      "Q15-03"]),
("Metodo italiano: la riapertura delle scorte (1/1)", """
<p>Il 1° gennaio le scritture sono <b>due</b>, e l'ordine conta:</p>
<ol><li><b>Riapertura</b>: Merci in Dare, Stato patrimoniale iniziale in Avere. È il giro opposto della chiusura, come per la banca o i debiti.</li>
<li><b>Giro a costo delle rimanenze iniziali</b>: Variazione rimanenze merci in Dare, Merci in Avere. Quelle merci saranno vendute nel nuovo anno: diventano costo del nuovo anno e il conto Merci torna a zero fino al prossimo inventario.</li></ol>
<p>A fine anno il conto Variazione rimanenze ha le <b>iniziali in Dare</b> e le <b>finali in Avere</b>: il suo saldo è proprio la variazione. Iniziali 2.000, finali 3.000 → saldo avere 1.000, il costo del venduto scende di 1.000.</p>
""", [{"testo": "1/1: riapri il conto Merci, chiuso al 31/12 con 3.000 €.",
       "righe": [("Merci", "D", 3000), ("Stato patrimoniale iniziale", "A", 3000)],
       "spiegazione": "Giro opposto alla chiusura: l'attività torna con il suo saldo dare."},
      "Q15-02"]),
("Il valore delle rimanenze: costo medio ponderato", """
<p>In questo manuale, e nel Simulatore ad hoc del corso, le rimanenze si valorizzano al <b>costo medio ponderato</b> (OIC 13): si sommano i valori di tutti i carichi del periodo, rimanenza iniziale compresa, e si dividono per le quantità caricate.</p>
<p class="rq-man-formula">Ferro: (2.800 kg × 1,00 + 500 kg × 1,08) ÷ 3.300 kg = 1,0121 €/kg → 728 kg × 1,0121 = 736,82 €</p>
<p>Si valorizzano i <b>728 kg contati</b>, non i 740 a sistema: la conta fisica prevale. I 200 kg rottamati non si contano: non sono più in magazzino. Attenzione: la media si pesa con le quantità, non si fa (1,00 + 1,08) ÷ 2. Il kit tagliato, fatto da noi, vale il suo <b>costo di produzione</b> (19 × 14,60 = 277,40). Rimanenze finali totali: <b>1.014,22 €</b>.</p>
<p>Altri metodi ammessi: <b>FIFO</b> (restano i lotti più recenti: 500 × 1,08 + 228 × 1,00 = 768) e <b>LIFO</b> (restano i più vecchi: 728 × 1,00 = 728). Il gestionale SAP dell'esercitazione usa invece il <b>costo standard</b> (0,95 €/kg: 728 × 0,95 = 691,60 €) e mette la differenza con il prezzo pagato nel conto 63 «Differenze prezzo», già a costo: per questo il suo magazzino vale 45,22 € meno e il suo utile ante imposte è più basso della stessa cifra. Business Central, con il metodo di costo «Medio» sull'articolo, arriva allo stesso valore del costo medio ponderato.</p>
<table class="rq-man-tab"><tr><th>Metodo</th><th>Che cosa resta in magazzino</th><th>Ferro, 728 kg</th></tr>
<tr><td>FIFO</td><td>i lotti più recenti</td><td>768,00</td></tr>
<tr><td>Costo medio ponderato</td><td>tutto al costo medio 1,0121</td><td>736,82</td></tr>
<tr><td>LIFO</td><td>i lotti più vecchi</td><td>728,00</td></tr>
<tr><td>Costo standard (gestionale)</td><td>tutto a 0,95</td><td>691,60</td></tr></table>
<p>Chi sceglie il metodo lo indica in nota integrativa e lo mantiene negli anni; se il valore di mercato è più basso del costo, le rimanenze si svalutano al minore.</p>
""", []),
("Le merci in viaggio al 31 dicembre", """
<p>Una merce che al 31/12 è in viaggio appartiene a chi ne ha i <b>rischi e i benefici</b> in quel momento (OIC 13), non a chi la ha fisicamente né a chi l'ha già pagata. Lo dice la <b>resa</b> del contratto:</p>
<ul><li><b>franco partenza</b> (EXW, FCA, FOB): i rischi passano all'acquirente alla consegna al vettore. Per l'acquirente la merce in viaggio è sua: va tra le rimanenze;</li>
<li><b>franco destino</b> (DAP, DPU, DDP): i rischi passano all'arrivo. Al 31/12 la merce è ancora del venditore: l'acquirente la esclude.</li></ul>
<p>Se la merce in viaggio è già nostra si valorizza al <b>costo d'acquisto più gli oneri accessori</b> a nostro carico (trasporto, assicurazione, dazi), si indica a parte e <b>non</b> si somma al conteggio delle ubicazioni.</p>
<p class="rq-man-formula">Fascio da 1.000 kg a 1,00 €/kg spedito il 30/12: resa DAP → escluso · resa EXW con trasporto nostro di 30 € → incluso a 1.000 + 30 = 1.030 €</p>
""", []),
("L'inventario inframese", """
<p>Oltre all'inventario di fine anno si possono fare <b>conte di controllo durante il mese</b> sui materiali di più valore o più a rischio: si bloccano solo le posizioni contate, si confronta conta e sistema e, se serve, si rettifica. <b>Non</b> si fanno scritture di assestamento: quelle sono solo di fine anno.</p>
<p>Una conta inframese che torna restringe il periodo in cui cercare una differenza futura. Al 15/12 la COL-1204 doveva avere 2.800 − 1.900 = 900 kg e la COL-1206 500 kg, e la conta ha trovato proprio questo: i 12 kg mancanti al 31/12 sono spariti dopo il 15/12, e infatti il buono BP-2912 è del 29/12.</p>
""", []),
("Nel gestionale SAP: il magazzino a valore, movimento per movimento", """
<p>Nell'esercitazione «Dicembre» il gestionale registra <b>ogni movimento di magazzino a valore</b> (metodo permanente, al costo standard):</p>
<table class="rq-man-tab"><tr><th>Movimento</th><th>Transazione</th><th>Dare</th><th>Avere</th></tr>
<tr><td>Entrata del ferro dal fornitore</td><td>MIGO 101</td><td>12 Magazzino ferro (a standard) · 63 Differenze prezzo</td><td>22 Fatture da ricevere (WE/RE)</td></tr>
<tr><td>Fattura del fornitore</td><td>MIRO</td><td>22 Fatture da ricevere · 14 IVA a credito</td><td>20 Debiti verso fornitori</td></tr>
<tr><td>Ferro all'ordine di produzione</td><td>MIGO 261</td><td>70 Consumi di materie prime</td><td>12 Magazzino ferro</td></tr>
<tr><td>Ore lavorate sull'ordine</td><td>CO11N</td><td>72 Attività addebitate agli ordini</td><td>75 Attività accreditate dai centri</td></tr>
<tr><td>Transenne finite a magazzino</td><td>MIGO 101 da produzione</td><td>13 Magazzino prodotti finiti</td><td>73 Output di produzione</td></tr>
<tr><td>Consegna al cliente</td><td>uscita merci 601</td><td>41 Costo del venduto</td><td>13 Magazzino prodotti finiti</td></tr>
<tr><td>Rottamazione / differenza inventariale</td><td>555 / 711</td><td>69 Rottamazioni · 65 Differenze inventariali</td><td>12 o 07 Magazzino</td></tr></table>
<p>Per questo al 31/12 <b>non si fa</b> la scrittura «Merci / Variazione rimanenze»: il saldo dei conti 12, 07 e 13 è già la rimanenza, a costo standard (ferro 728 kg = 691,60 €, semilavorati 277,40 €), dopo le due differenze inventariali 711. Si chiudono nello Stato patrimoniale finale (91) e il 1/1 si riaprono dallo Stato patrimoniale iniziale (92), senza giro a costo: il costo nascerà al prossimo 261 o alla prossima consegna. Le scritture complete sono nel riquadro «Nel gestionale SAP» qui sotto.</p>
""", []),
]},
]},

# ══════════════════════════════════════════════════════════════════════════════
{"parte": "Parte quarta — L'assestamento di fine esercizio", "capitoli": [

{"titolo": "Le scritture di assestamento", "unita": ["C18"], "sezioni": [
("Perché si assesta", """
<p>Al 31 dicembre i conti contengono le operazioni con l'esterno registrate durante l'anno. Per determinare il reddito di competenza e il patrimonio di fine anno occorre <b>adeguarli</b>:</p>
<ul>
<li><b>scritture di completamento</b>: fatture da ricevere e da emettere, TFR, imposte dell'esercizio;</li>
<li><b>scritture di integrazione</b>: ratei attivi e passivi, svalutazione dei crediti;</li>
<li><b>scritture di rettifica</b>: risconti attivi e passivi, rimanenze finali;</li>
<li><b>scritture di ammortamento</b>.</li>
</ul>
<p>Si fanno dopo il bilancio di verifica e prima dell'epilogo dei conti.</p>
""", []),
("Fatture da ricevere e da emettere", """
<p>Se a dicembre abbiamo ricevuto un bene o un servizio ma la fattura arriverà a gennaio, il costo è dell'anno: si rileva in contropartita a <b>Fatture da ricevere</b> (debito), senza IVA, che nascerà con la fattura. All'arrivo della fattura si chiude il debito stimato senza registrare di nuovo il costo.</p>
<p>Simmetricamente, la merce consegnata e non ancora fatturata genera un ricavo dell'anno in contropartita a <b>Fatture da emettere</b> (credito). Per i <b>beni consegnati con DDT</b> a dicembre e fatturati in modo <b>differito</b> entro il 15 gennaio, l'IVA è comunque esigibile nel mese della consegna e va nella liquidazione di dicembre: si rileva subito anche l'IVA a debito. La fattura di gennaio riclassifica il credito (Crediti v/clienti in Dare, Fatture da emettere in Avere) senza registrare di nuovo ricavo e IVA. Per gli acquisti non c'è simmetria: l'IVA si detrae solo con la fattura ricevuta e registrata, per questo Fatture da ricevere è senza IVA.</p>
""", ["Q17-01", "Q17-02"]),
("I ratei", """
<p>Il <b>rateo</b> rileva la quota maturata nell'anno di un costo o di un ricavo <b>comune a due o più esercizi</b>, il cui importo <b>varia con il tempo</b> (interessi, fitti, canoni) e la cui manifestazione finanziaria avverrà nell'anno successivo. Nulla è ancora stato registrato: il rateo aggiunge la parte di competenza (OIC 18). Non ogni costo da pagare è un rateo: un bene o servizio già ricevuto in attesa della fattura va in Fatture da ricevere; un debito certo è un debito; una passività incerta è un fondo.</p>
<ul>
<li><b>Rateo passivo</b>: costo maturato da pagare (interessi del mutuo, fitto pagato posticipato). È un debito.</li>
<li><b>Rateo attivo</b>: ricavo maturato da incassare (interessi attivi liquidati in seguito). È un credito.</li>
</ul>
<p>Il calcolo si fa in mesi o giorni: interessi di 360 € per 1/10–31/3 → maturati ottobre–dicembre = 360 × 3/6 = 180.</p>
""", ["Q16-03", "Q16-04", "Q10-04"]),
("I risconti", """
<p>Il <b>risconto</b> rinvia all'anno successivo la parte di un costo o di un ricavo <b>già registrato per intero</b> ma di competenza futura.</p>
<ul>
<li><b>Risconto attivo</b>: costo rinviato (premio assicurativo pagato in anticipo, maxicanone di leasing).</li>
<li><b>Risconto passivo</b>: ricavo rinviato (fitto attivo incassato in anticipo).</li>
</ul>
<p class="rq-man-formula">Premio 1.200 € pagato il 1/10 per un anno → 9 mesi futuri: 1.200 × 9/12 = 900 di risconto attivo</p>
<p>Ratei e risconti si distinguono così: il rateo <b>aggiunge</b> una parte di costo o ricavo non ancora registrato; il risconto <b>toglie</b> una parte di un importo già registrato.</p>
""", ["Q16-01", "Q16-02", "Q11-03"]),
("Gli ammortamenti", """
<p>L'ammortamento ripartisce il costo dei cespiti sugli anni di utilizzo. La quota dell'anno è un costo (Ammortamento) e si accumula nel fondo ammortamento, che riduce indirettamente il valore del bene: il cespite resta al costo storico.</p>
<p class="rq-man-formula">12.800 × 15% ÷ 2 (primo anno, ipotesi del caso: bene in uso da metà anno) = 960 · bene in uso dal 1° dicembre: 12.800 × 15% × 1/12 = 160</p>
<p>L'ammortamento è un costo che non comporta uscite di denaro; il fondo non è un deposito in banca né un debito.</p>
""", ["Q13-01", "Q13-08"]),
("Svalutazione e perdite su crediti", """
<p>A fine anno si stima la parte dei crediti che non sarà incassata: la stima è un costo (Svalutazione crediti) e alimenta il <b>Fondo svalutazione crediti</b>, che rettifica i crediti senza toccarne il valore nominale.</p>
<p class="rq-man-formula">Crediti 20.000 − fondo 800 = valore di presunto realizzo 19.200</p>
<p>Quando un credito diventa definitivamente inesigibile si usa prima il fondo; la parte eccedente è una <b>perdita su crediti</b>. Se in seguito si recupera qualcosa di un credito già eliminato, è una sopravvenienza attiva.</p>
""", ["Q17-03", "Q17-04", "Q17-10"]),
("Il TFR", """
<p>La quota di TFR maturata nell'anno è un costo di competenza e aumenta il debito verso i dipendenti; non si paga oggi.</p>
""", ["Q09-05"]),
("Le rimanenze finali", """
<p>Con il metodo periodico le merci e i prodotti non venduti si iscrivono tra le attività e rettificano i costi dell'anno attraverso le variazioni delle rimanenze: <b>Merci (o Materie prime, Prodotti finiti) in Dare, Variazione rimanenze in Avere</b>, per il valore dell'inventario. È una scrittura di rettifica: toglie dai costi dell'anno quello che non è stato venduto né consumato. I prodotti fabbricati dall'azienda sono prodotti finiti, non merci.</p>
<p>Il ciclo completo (rilevazione, epilogo, chiusura, riapertura e giro a costo) è nel capitolo 17. Nel gestionale SAP questa scrittura <b>non si fa</b>: il magazzino è già a valore nei conti 12, 07 e 13.</p>
""", []),
("Le imposte dell'esercizio", """
<p>Le imposte sul reddito di competenza dell'anno si rilevano come costo (Imposte dell'esercizio) in contropartita a Debiti tributari. Gli acconti già versati si compensano con il debito: resta da pagare il saldo, che si versa l'anno successivo.</p>
<p class="rq-man-formula">Imposta 3.000 − acconti 2.200 = saldo 800</p>
""", ["Q18-01", "Q18-03", "Q18-04"]),
]},
]},

# ══════════════════════════════════════════════════════════════════════════════
{"parte": "Parte quinta — La chiusura e la riapertura dei conti", "capitoli": [

{"titolo": "La chiusura dei conti e il bilancio d'esercizio", "unita": ["C19"], "sezioni": [
("L'ordine delle operazioni", """
<ol>
<li>bilancio di verifica;</li>
<li>scritture di assestamento;</li>
<li>bilancio di verifica dopo l'assestamento;</li>
<li><b>epilogo</b> dei conti economici nel Conto economico e rilevazione del risultato;</li>
<li><b>chiusura</b> dei conti patrimoniali nello Stato patrimoniale finale.</li>
</ol>
<p>Gli importi di chiusura si prendono dai <b>saldi reali</b> dei conti, non da totali stimati.</p>
""", []),
("L'epilogo dei conti economici", """
<p>Ogni conto economico si chiude con il proprio saldo: i <b>costi</b> (saldo dare) si chiudono in Avere e passano in Dare del Conto economico; i <b>ricavi</b> (saldo avere) si chiudono in Dare e passano in Avere del Conto economico. Dopo l'epilogo i conti di costo e ricavo hanno saldo zero; il loro valore resta leggibile nel Conto economico.</p>
""", ["Q19-01", "Q19-02"]),
("Il risultato d'esercizio", """
<p>Se nel Conto economico prevale l'Avere (ricavi &gt; costi) il saldo è un <b>utile</b>: Conto economico in Dare, Utile d'esercizio in Avere. Se prevale il Dare è una <b>perdita</b>: Perdita d'esercizio in Dare, Conto economico in Avere.</p>
<p>La destinazione dell'utile non si fa ora: la decide l'assemblea dopo l'approvazione del bilancio (capitolo 20).</p>
""", ["Q19-03", "Q19-04"]),
("La chiusura dei conti patrimoniali", """
<p>Le <b>attività</b> (saldo dare) si chiudono in Avere, con lo Stato patrimoniale finale in Dare; le <b>passività</b> e il <b>patrimonio netto</b>, compreso l'utile, si chiudono in Dare, con lo Stato patrimoniale finale in Avere. I conti patrimoniali non passano mai dal Conto economico.</p>
<p>Le <b>rimanenze</b> sono attività come le altre: Merci (o Materie prime, Prodotti finiti) si chiudono in Avere verso lo Stato patrimoniale finale, mentre Variazione rimanenze, che è un componente di reddito, è già stato chiuso nell'epilogo. Nel gestionale SAP si chiudono allo stesso modo i conti di magazzino 12, 07 e 13 (conto 91).</p>
""", ["Q19-05", "Q19-06"]),
("Il bilancio d'esercizio", """
<p>Dai conti chiusi si redige il <b>bilancio d'esercizio</b>: Stato patrimoniale, Conto economico, nota integrativa (e, quando richiesto, rendiconto finanziario). Nello Stato patrimoniale i debiti si distinguono tra quelli esigibili entro e oltre l'esercizio successivo; i crediti si espongono al netto del fondo svalutazione, i cespiti al netto dei fondi ammortamento.</p>
<p class="rq-man-formula">Attività 50.000 − passività 32.000 = patrimonio netto 18.000; con capitale 15.000 l'utile è 3.000</p>
""", []),
]},

{"titolo": "La riapertura dei conti e la destinazione dell'utile", "unita": ["C20"], "sezioni": [
("La riapertura dei conti patrimoniali", """
<p>Il 1° gennaio si riaprono <b>solo i conti patrimoniali</b>, con il giro opposto alla chiusura e in contropartita allo Stato patrimoniale iniziale: le attività tornano in Dare, passività e patrimonio netto in Avere. I conti di costo e di ricavo ripartono da zero: il Conto economico del nuovo anno misura solo il nuovo reddito.</p>
""", ["Q20-01", "Q20-02", "Q20-03", "Q20-09"]),
("Lo storno delle scritture di assestamento", """
<p>Le rettifiche di fine anno si riversano nel nuovo esercizio:</p>
<ul>
<li>le <b>rimanenze</b>: prima si riapre il conto Merci dallo Stato patrimoniale iniziale, poi le rimanenze iniziali tornano a costo (Variazione rimanenze in Dare, Merci in Avere), come al capitolo 17; nel gestionale SAP c'è solo la riapertura dei conti 12, 07, 13;</li>
<li>i <b>risconti</b> riportano nel nuovo anno il costo o il ricavo rinviato;</li>
<li>i <b>ratei</b> e le <b>fatture da ricevere/emettere</b> si chiudono quando arriva il pagamento, l'incasso o il documento, senza registrare di nuovo la parte già rilevata: alla rata del mutuo, ad esempio, Ratei passivi in Dare per gli interessi dell'anno precedente e Interessi in Dare solo per il nuovo periodo. In alternativa, come fanno i gestionali, il rateo si storna il 1° gennaio e il documento si registra per intero: i due metodi e gli esempi completi sono nel paragrafo «Ratei e risconti nel nuovo anno: mai contati due volte».</li>
</ul>
""", ["Q16-09", "Q11-11"]),
("Fine anno voce per voce: chiusura e riapertura", """
<p>La tabella riassume, per ogni voce, che cosa si scrive il 31 dicembre e il 1° gennaio con il metodo italiano (Dare / Avere). <b>Assestamento</b> prima, <b>epilogo</b> dei componenti economici, <b>chiusura</b> dei patrimoniali; al 1° gennaio <b>riapertura</b> dei patrimoniali e poi <b>giroconto o storno</b> delle voci di assestamento.</p>
<div style="overflow-x:auto"><table class="rq-man-tab"><tr><th>Voce</th><th>31/12 assestamento</th><th>31/12 epilogo</th><th>31/12 chiusura</th><th>1/1 riapertura</th><th>Nel nuovo anno</th></tr><tr><td>Rimanenze (merci, materie, prodotti)</td><td>Rilevazione: Merci / Variazione rimanenze</td><td>Variazione rimanenze → Conto economico</td><td>SP finale / Merci</td><td>Merci / SP iniziale</td><td>Variazione rimanenze / Merci (a costo)</td></tr><tr><td>Risconti attivi</td><td>Risconti attivi / costo</td><td>—</td><td>SP finale / Risconti attivi</td><td>Risconti attivi / SP iniziale</td><td>Costo / Risconti attivi (il costo torna nell'anno)</td></tr><tr><td>Risconti passivi</td><td>Ricavo / Risconti passivi</td><td>—</td><td>Risconti passivi / SP finale</td><td>SP iniziale / Risconti passivi</td><td>Risconti passivi / Ricavo</td></tr><tr><td>Ratei passivi</td><td>Costo / Ratei passivi</td><td>—</td><td>Ratei passivi / SP finale</td><td>SP iniziale / Ratei passivi</td><td>Al pagamento: Ratei passivi + costo nuovo / Banca (oppure storno al 1/1)</td></tr><tr><td>Ratei attivi</td><td>Ratei attivi / Ricavo</td><td>—</td><td>SP finale / Ratei attivi</td><td>Ratei attivi / SP iniziale</td><td>All'incasso: Banca / Ratei attivi + ricavo nuovo (oppure storno)</td></tr><tr><td>Fatture da ricevere</td><td>Costo / Fatture da ricevere</td><td>—</td><td>Fatture da ricevere / SP finale</td><td>SP iniziale / Fatture da ricevere</td><td>All'arrivo: Fatture da ricevere + IVA / Debiti (nessun nuovo costo)</td></tr><tr><td>Fatture da emettere</td><td>Fatture da emettere / Ricavo (+ IVA se DDT a dicembre)</td><td>—</td><td>SP finale / Fatture da emettere</td><td>Fatture da emettere / SP iniziale</td><td>All'emissione: Crediti / Fatture da emettere</td></tr><tr><td>Fondi ammortamento</td><td>Ammortamento / Fondo</td><td>Ammortamento → Conto economico</td><td>Fondo / SP finale</td><td>SP iniziale / Fondo</td><td>Il fondo continua a crescere</td></tr><tr><td>Fondo svalutazione crediti</td><td>Svalutazione / Fondo</td><td>Svalutazione → Conto economico</td><td>Fondo / SP finale</td><td>SP iniziale / Fondo</td><td>Si usa quando un credito è perso</td></tr><tr><td>Debiti per TFR</td><td>TFR / Debiti per TFR</td><td>TFR → Conto economico</td><td>Debiti per TFR / SP finale</td><td>SP iniziale / Debiti per TFR</td><td>Si paga alla fine del rapporto</td></tr><tr><td>Imposte</td><td>Imposte / Debiti tributari (acconti compensati)</td><td>Imposte → Conto economico</td><td>Debiti tributari / SP finale</td><td>SP iniziale / Debiti tributari</td><td>Saldo con F24</td></tr><tr><td>IVA</td><td>Liquidazione: IVA conti / Erario c/IVA</td><td>—</td><td>Erario c/IVA: chiuso secondo il saldo</td><td>Riaperto con lo stesso saldo</td><td>Credito riportato o versamento</td></tr><tr><td>Crediti, debiti, banca, capitale</td><td>—</td><td>—</td><td>Attività in Avere, passività e PN in Dare</td><td>Giro opposto</td><td>Le partite aperte continuano</td></tr><tr><td>Utile d'esercizio</td><td>Conto economico / Utile</td><td>—</td><td>Utile / SP finale</td><td>SP iniziale / Utile</td><td>Delibera: Utile / Riserve, dividendi</td></tr></table></div>
<p><b>Nei programmi.</b> ad hoc Revolution segue la tabella: assestamenti in Primanota e procedura Chiusura/apertura conti. Business Central fa chiusura e riapertura con le funzioni di fine esercizio; i risconti con modello di differimento e i ratei con storno automatico non richiedono il passaggio del 1° gennaio; il magazzino non si rileva perché è già a valore. SAP fa chiusura e riapertura con le registrazioni per l'Italia (conti 91 e 92); ratei e risconti si stornano con F.81; anche qui il magazzino è già a valore.</p>
""", [{"testo": "31/12: chiudi il risconto attivo di 900 € sul premio assicurativo.", "righe": [("Stato patrimoniale finale", "D", 900), ("Risconti attivi", "A", 900)],
       "spiegazione": "Il risconto attivo è un'attività: si chiude in Avere verso lo Stato patrimoniale finale."},
      {"testo": "1/1: riapri il risconto attivo di 900 €.", "righe": [("Risconti attivi", "D", 900), ("Stato patrimoniale iniziale", "A", 900)],
       "spiegazione": "Riapertura: l'attività torna con il suo saldo dare."},
      "Q16-09",
      {"testo": "31/12: chiudi il rateo passivo di 160 € sugli interessi del mutuo.", "righe": [("Ratei passivi", "D", 160), ("Stato patrimoniale finale", "A", 160)],
       "spiegazione": "Il rateo passivo è un debito: si chiude in Dare verso lo Stato patrimoniale finale."},
      {"testo": "1/1: riapri il rateo passivo di 160 €.", "righe": [("Stato patrimoniale iniziale", "D", 160), ("Ratei passivi", "A", 160)],
       "spiegazione": "Riapertura: il debito torna con il suo saldo avere."},
      {"testo": "31/1: paghi la rata con 240 € di interessi; 160 € erano già nel rateo passivo dell'anno prima.", "righe": [("Ratei passivi", "D", 160), ("Interessi passivi su mutui", "D", 80), ("Banca c/c", "A", 240)],
       "spiegazione": "Il pagamento chiude il rateo; solo 80 € sono costo del nuovo anno. Con lo storno al 1/1 (come fanno SAP e Business Central) si registrerebbero 240 € di interessi e il risultato sarebbe lo stesso."},
      {"testo": "1/1: riapri le fatture da ricevere di 300 € per l'energia di dicembre.", "righe": [("Stato patrimoniale iniziale", "D", 300), ("Fatture da ricevere", "A", 300)],
       "spiegazione": "È un debito: si riapre in Avere. Quando arriva la bolletta si chiude senza registrare di nuovo il costo."},
      {"testo": "15/1: arriva la bolletta dell'energia di dicembre: 300 € + IVA 66 €.", "righe": [("Fatture da ricevere", "D", 300), ("IVA ns/credito", "D", 66), ("Debiti v/fornitori", "A", 366)],
       "spiegazione": "La fattura chiude il debito stimato: nessun nuovo costo; nasce solo l'IVA detraibile."}]),
("Ratei e risconti nel nuovo anno: mai contati due volte", """
<p>È il passaggio più delicato della riapertura. Ratei e risconti <b>non creano</b> costi o ricavi nuovi: <b>spostano</b> una parte di un importo da un anno all'altro. La regola di controllo è una sola:</p>
<p class="rq-man-formula">quota dell'anno vecchio + quota dell'anno nuovo = importo del documento (né un euro in più, né uno in meno)</p>
<p>Se la somma dei due anni supera la fattura, l'importo è stato <b>contato due volte</b>.</p>
<p><b>Due metodi corretti — se ne usa UNO solo.</b></p>
<ul>
<li><b>Metodo A — storno al 1° gennaio</b> (quello dei gestionali: SAP con F.81, Business Central con lo storno automatico). Dopo la riapertura si gira il rateo o il risconto sul conto di costo o di ricavo, con la scrittura opposta a quella del 31/12. Quando arriva il documento si registra <b>per intero</b>, come una fattura normale.</li>
<li><b>Metodo B — chiusura all'arrivo del documento.</b> Il 1° gennaio non si fa nulla; quando arriva il documento lo si divide: una parte chiude il rateo, il resto è costo o ricavo del nuovo anno.</li>
</ul>
<p><b>Mai i due metodi insieme</b>: si toglierebbe la stessa quota due volte.</p>
<p><b>Esempio 1 — rateo passivo: la bolletta del 31 gennaio.</b> Bolletta dell'energia per il periodo 1/12–31/1 (62 giorni), che arriva il 31/1: imponibile 600 €, IVA 132 €, totale 732 €. Dicembre = 600 × 31/62 = <b>300 €</b>, gennaio = 300 €. Il rateo si calcola sull'<b>imponibile</b>: l'IVA nasce solo con la fattura.</p>
<div style="overflow-x:auto"><table class="rq-man-tab"><tr><th>Data</th><th>Scrittura</th><th>Energia elettrica</th></tr>
<tr><td>31/12</td><td>Energia elettrica / Ratei passivi 300</td><td>+300 nell'anno vecchio</td></tr>
<tr><td>31/12</td><td>Ratei passivi / Stato patrimoniale finale 300 (è un debito)</td><td>—</td></tr>
<tr><td>1/1</td><td>Stato patrimoniale iniziale / Ratei passivi 300 (riapertura)</td><td>—</td></tr>
<tr><td>1/1</td><td>Ratei passivi / Energia elettrica 300 (storno, metodo A)</td><td>−300 nell'anno nuovo</td></tr>
<tr><td>31/1</td><td>Energia elettrica 600 + IVA ns/credito 132 / Debiti v/fornitori 732</td><td>+600 nell'anno nuovo</td></tr>
<tr><td colspan="2"><b>Costo di competenza</b></td><td><b>300 + 300 = 600 ✔</b></td></tr></table></div>
<p>Senza lo storno del 1/1 il nuovo anno avrebbe 600 € di costo: i 300 € di dicembre sarebbero contati due volte.</p>
<p><b>Rateo o fattura da ricevere?</b> Se la bolletta riguardasse <b>solo dicembre</b> non sarebbe un rateo: al 31/12 si rileva una <b>fattura da ricevere</b> (paragrafo precedente). Il rateo serve quando il periodo del documento sta <b>a cavallo</b> dei due anni.</p>
<p><b>Esempio 2 — rateo attivo: gli interessi di febbraio.</b> Interessi su un deposito per il periodo 1/12–28/2 (90 giorni), accreditati il 28/2: lordo 90 €, ritenuta del 26% 23,40 €, netto 66,60 €. Dicembre = 90 × 31/90 = <b>31 €</b>, il nuovo anno = 59 €. Il rateo si calcola sul <b>lordo</b>: la ritenuta la applica la banca solo al pagamento ed è un acconto d'imposta.</p>
<div style="overflow-x:auto"><table class="rq-man-tab"><tr><th>Data</th><th>Scrittura</th><th>Interessi attivi bancari</th></tr>
<tr><td>31/12</td><td>Ratei attivi / Interessi attivi bancari 31</td><td>+31 nell'anno vecchio</td></tr>
<tr><td>31/12</td><td>Stato patrimoniale finale / Ratei attivi 31 (è un credito)</td><td>—</td></tr>
<tr><td>1/1</td><td>Ratei attivi / Stato patrimoniale iniziale 31 (riapertura)</td><td>—</td></tr>
<tr><td>1/1</td><td>Interessi attivi bancari / Ratei attivi 31 (storno, metodo A)</td><td>−31 nell'anno nuovo</td></tr>
<tr><td>28/2</td><td>Banca c/c 66,60 + Erario c/acconti d'imposta 23,40 / Interessi attivi bancari 90</td><td>+90 nell'anno nuovo</td></tr>
<tr><td colspan="2"><b>Ricavo di competenza</b></td><td><b>31 + 59 = 90 ✔</b></td></tr></table></div>
<p><b>Risconti</b>: stesso giro al contrario, e nel nuovo anno <b>non arriva nessun documento</b>. Il costo (o il ricavo) rinviato torna nel conto economico solo con lo storno del 1/1 (Premi di assicurazione / Risconti attivi). Qui il rischio non è contare due volte, ma <b>dimenticare</b> lo storno e perdere il costo del nuovo anno.</p>
<p class="rq-man-formula">Regola da ricordare: lo storno del 1° gennaio è sempre la scrittura del 31 dicembre rovesciata.</p>
<p><b>I cinque errori da evitare</b>: 1) rateo calcolato sul totale con IVA o sugli interessi netti; 2) storno del 1/1 dimenticato; 3) storno del 1/1 <b>e</b> chiusura all'arrivo del documento insieme; 4) rateo al posto della fattura da ricevere; 5) IVA o ritenuta messe nel rateo.</p>
""", [{"testo": "31/12: bolletta dell'energia 1/12–31/1 di 600 € + IVA, in arrivo il 31/1. Rileva la quota di dicembre (31 giorni su 62).", "righe": [("Energia elettrica", "D", 300), ("Ratei passivi", "A", 300)],
       "spiegazione": "Costo maturato e non ancora fatturato, a cavallo dei due anni: rateo passivo sull'imponibile, senza IVA."},
      {"testo": "1/1, dopo la riapertura: storna il rateo passivo di 300 € sulla bolletta dell'energia (metodo A).", "righe": [("Ratei passivi", "D", 300), ("Energia elettrica", "A", 300)],
       "spiegazione": "È la scrittura del 31/12 rovesciata: l'energia del nuovo anno parte con 300 € in Avere, che neutralizzano la parte di bolletta già spesata a dicembre."},
      {"testo": "31/1: arriva la bolletta 1/12–31/1: 600 € + IVA 132 €. Il rateo è già stato stornato il 1/1: registrala per intero.", "righe": [("Energia elettrica", "D", 600), ("IVA ns/credito", "D", 132), ("Debiti v/fornitori", "A", 732)],
       "spiegazione": "Con lo storno al 1/1 la fattura si registra come sempre. Costo del nuovo anno: 600 − 300 = 300 €; anno vecchio 300 €; totale 600 € = bolletta."},
      {"testo": "31/1: stessa bolletta (600 € + IVA 132 €), ma il 1/1 NON hai fatto lo storno (metodo B): chiudi il rateo di 300 €.", "righe": [("Ratei passivi", "D", 300), ("Energia elettrica", "D", 300), ("IVA ns/credito", "D", 132), ("Debiti v/fornitori", "A", 732)],
       "spiegazione": "La fattura chiude il debito di dicembre (rateo) e porta a costo solo la parte di gennaio. Il risultato è identico al metodo A."},
      {"testo": "31/12: interessi su un deposito 1/12–28/2, lordo 90 €, accreditati il 28/2. Rileva la quota di dicembre (31 giorni su 90).", "righe": [("Ratei attivi", "D", 31), ("Interessi attivi bancari", "A", 31)],
       "spiegazione": "Ricavo maturato da incassare: rateo attivo calcolato sul lordo, senza ritenuta."},
      {"testo": "1/1, dopo la riapertura: storna il rateo attivo di 31 € sugli interessi (metodo A).", "righe": [("Interessi attivi bancari", "D", 31), ("Ratei attivi", "A", 31)],
       "spiegazione": "La scrittura del 31/12 rovesciata: gli interessi del nuovo anno partono con 31 € in Dare."},
      {"testo": "28/2: la banca accredita gli interessi 1/12–28/2: lordo 90 €, ritenuta 26% 23,40 €, netto 66,60 €. Il rateo è già stornato.", "righe": [("Banca c/c", "D", 66.6), ("Erario c/acconti d'imposta", "D", 23.4), ("Interessi attivi bancari", "A", 90)],
       "spiegazione": "Si registra per intero; la ritenuta subita è un acconto d'imposta. Ricavo del nuovo anno: 90 − 31 = 59 €; con i 31 € di dicembre il totale è 90 €."}]),
("La destinazione dell'utile", """
<p>Dopo l'approvazione del bilancio l'assemblea delibera la destinazione dell'utile:</p>
<ul>
<li>almeno il <b>5%</b> alla <b>riserva legale</b>, finché questa non raggiunge un quinto del capitale sociale (art. 2430 c.c.);</li>
<li>la parte restante a <b>dividendi</b> (nasce un debito verso i soci, che si estingue con il pagamento), ad altre riserve o a <b>utili portati a nuovo</b>.</li>
</ul>
<p>La riserva legale non si distribuisce ai soci: protegge i creditori.</p>
""", ["Q04-05", "Q04-06"]),
("La copertura della perdita", """
<p>La perdita si copre per delibera dell'assemblea, utilizzando prima le riserve disponibili (come gli utili portati a nuovo) e solo dopo la riserva legale; la perdita non si gira direttamente sul capitale.</p>
""", ["Q04-07"]),
("Caso di sintesi", """
<p>Un'azienda nel corso dell'anno: 1) riceve una fattura d'acquisto di merci di 1.000 € + IVA 220 €; 2) la paga; 3) vende merci per 2.000 € + IVA 440 €; 4) incassa 1.000 € dal cliente. Nessuna rimanenza a fine anno.</p>
<ul>
<li><b>Credito residuo verso il cliente</b>: 2.440 − 1.000 = 1.440 €.</li>
<li><b>IVA da versare</b> in liquidazione: 440 − 220 = 220 €.</li>
<li><b>Utile</b>: ricavi 2.000 − costi 1.000 = 1.000 €. L'IVA non entra nel conto economico.</li>
</ul>
<p>Controllo incrociato: giornale → mastrini → partitari → bilancio. La somma dei residui dei partitari clienti deve coincidere con il saldo di Crediti v/clienti.</p>
""", []),
]},
]},
]
