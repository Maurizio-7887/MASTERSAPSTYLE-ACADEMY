// Esporta il testo corrente della sola guida principale, senza inizializzare l'ERP.
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),window={MSA_STATO_CORRENTE:()=>null};
const ctx=vm.createContext({window});
for(const f of ['dicembre-wms-legacy','cpm-formas','dicembre-wms'])vm.runInContext(fs.readFileSync(path.join(root,'app/blueprints/guida/static/esercizi',f+'.js'),'utf8'),ctx,{filename:f});
const E=window.MSA_ESERCIZIO;
const header=`# Percorso FORMAS/Dicembre — implementazione e testo corrente

SIMULAZIONE DIDATTICA — DATI SINTETICI, NON VALIDA AI FINI FISCALI O COMMERCIALI.

## Stato e perimetro

Completati riordino didattico, istruzioni laterali e collaudo locale della preparazione. Confronto con la copia source: conservati tutti i93 passi originari e tutti i loro controlli automatici;105 passi principali dopo le aggiunte.
Nessun reset del database, account, salvataggio o archivio online; nessun servizio esterno o PDF modificato da questo intervento.
Le modifiche al motore CPM, alla UI contabile/quiz e alla scheda Nuova azienda sono di altri sviluppatori e sono richiamate, non replicate, dalle guide.

## Sequenza implementata

1. Entrare nell'azienda vuota. Se esiste lavoro, conservarlo: la ripartenza nello stesso account è distruttiva, autorizzata dal docente, preceduta da backup JSON scaricato e conferma NUOVA AZIENDA. Non è isolamento in un secondo spazio. Nessuna operazione di questo tipo è eseguita dai test o dalla guida.
2. Costituzione 01/12/2026 e versamento 80.000; poi WMS W100 senza stock, prima di qualsiasi ricevimento.
3. Acquisto esplicito dei cinque cespiti F-90 il 01/12, entrata in funzione nella stessa data. Gli acquisti esistevano già: sono mantenuti con tutti i campi, non sostituiti da preset né duplicati in MM. Precedono uso, ammortamento e cessione.
4. Attivazione CPM esplicita ATTIVA; budget annuale e quattro centri; distinta/ciclo TR-STD e SL-TAGLIO; CK11N, marca e CK24 con consenso SOSTITUISCI per il solo bootstrap vuoto della costituzione.
5. Ordini cliente Beta/Delta del 02/12: qui inizia il CICLO OPERATIVO. Domanda 300 TR-STD → fabbisogni → ordini MM → ricevimento/fatture → produzione → consegna/fatture cliente.
6. Un ordine transenne da 300: prelievo 2.400 kg, Taglio75/Piegatura60/Saldatura120 h, WIP analitico4.380/6.060/9.420, unico101 finale9.420. Poi HALB autonomo20 kit, 160kg e5h, stock292. Nessuna catena di tre HALB e nessuna capitalizzazione FI automatica del WIP.
7. Incasso assicurativo28/12 spostato dopo cessioni22/12: nessuna data cambiata. Tolto riferimento a un furgone mai acquistato nel caso; importo/causale economica dell'indennizzo restano invariati.
8. Chiusura: fonti CO, giornale e mastrini integrati; conservate tutte le operazioni e i controlli precedenti, chiusura e riapertura comprese. Il percorso completo eredita il principale senza duplicare CPM.

## Riconciliazioni numeriche

- Budget annuo TR-STD1.200, non ordine300; ore variabili annue300/240/480 e saturazioni20/16/32%.
- Personale36.000 per reparto, indiretti propri0, Generale produttivo18.000 →6.000 per reparto;42.000/1.500h=28€/h. I18.000 sostituiscono, non si sommano, ai vecchi6.000 per reparto. Amministrativi esclusi0.
- Standard TR31,40 e kit14,60; setup0. I dati operativi originari e le attese di bilancio restano invariati.
- Attività consuntivate Taglio2.240/Piegatura1.680/Saldatura3.360=7.280. Non costituiscono un secondo costo del personale.
- Residuo centro=consuntivo−assorbito=varianza spesa+varianza assorbimento. NON implica automaticamente inefficienza; quest'ultima confronta ore effettive e standard dei pezzi confermati.
- Nessun costo primario inventato o doppia FI. Le fonti reali del caso richiedono attribuzione documentata ai centri: payroll Produzione non equivale automaticamente ai tre reparti. Consuntivi mancanti non significano costi zero. Budget annuo/12 è solo indicativo assumendo assenza di stagionalità.
- Quarantena: i200kg entrano già bloccati inQ-ZONE da MIGO; il passo usa «3 · Decidi sulla merce arrivata in quarantena», non crea un secondo blocco344. Il comando aggiornato «Metti in quarantena e crea il compito RF» è spiegato per il caso diverso di merce inizialmente libera.

## File modificati

- app/blueprints/guida/static/esercizi/dicembre-wms.js
- app/blueprints/guida/static/esercizi/completo-formas.js
- app/blueprints/guida/static/esercizi/cpm-formas.js (nuovo modulo di sole istruzioni)
- tests/percorso-ordinato.js e tests/percorso-ordinato-export.js (nuovi)
- tests/guida-completa.js, tests/test_guida_completa.py, tests/test_dicembre_wms.py (preload, rotte e aspettative aggiornati senza rimuovere controlli)

## Collaudi e rigenerazione

Eseguiti: percorso-ordinato.js,425 controlli; guida-completa.js,1.990 controlli/250 passi; test_guida_completa.py,185 controlli rotte/guide/materiali. I test browser usano soltanto stato sintetico in memoria; Python usa il database temporaneo di tests._client, non il database online.
Il test E2E dicembre è di proprietà del collega FI: deve seguire la lettura ciclo dopo i cespiti/CPM e le cessioni22/12 prima dell'incasso28/12. La sua regressione finale e la generazione PDF sono coordinate dal parent.

Dalla radice del repository:

~~~sh
node tests/guida-completa.js
node tests/percorso-ordinato.js
python tests/test_guida_completa.py
node tests/percorso-ordinato-export.js
~~~

Per jsdom installare le dipendenze del repository, oppure in questo sandbox usare NODE_PATH=/tmp/academy-wip/node_modules. Python disponibile in /tmp/academy-wip-venv/bin/python.
guida-completa.js rigenera tests/_completo/esercizio.json e endpoints.json: il JSON contiene il testo completo dei250 passi per la rigenerazione coordinata del PDF/MD. Le funzioni fatto non sono serializzate nel JSON: il controllo eseguibile resta nei sorgenti JS. Questo script rigenera il presente report e la versione testuale integrale del caso principale qui sotto.

## Compatibilità e limiti

Il vecchio marker di produzione seleziona la guida legacy prima di applicare i nuovi passi; nessuna conversione automatica dei vecchi lavori. Scegliere una guida non separa archivi. I laboratori B/C richiedono account separati e non vanno eseguiti come modifiche alternative del caso principale da consegnare.
Le spunte verificano dati correnti dove esiste un fatto automatico; le letture, attribuzioni ragionate e controlli manuali richiedono evidenze e non sono certificazioni di correttezza.

---

# Testo laterale corrente — caso principale completo

`;
// Le tre tilde evitano collisioni con fence già contenute nelle consegne.
let out=header;
let group='';
for(const [i,p]of E.passi.entries()){
 if(group!==p.g){group=p.g;out+='## '+group+'\n\n';}
 out+='### '+(i+1)+'. '+p.titolo+'\n\n';
 if(p.data)out+='**Data:** '+p.data+'\n\n';
 out+='**Dove:** '+p.percorso+' (\x60'+p.dove.ep+'\x60)\n\n';
 for(const [k,v]of p.campi)out+='- **'+k+':** '+v+'\n';
 if(p.attesa)out+='\n**Risultato atteso:** '+p.attesa+'\n';
 if(p.nota)out+='\n**Nota:** '+p.nota+'\n';
 out+='\n**Verifica:** '+(p.fatto?'controllo automatico dei dati correnti, oltre alle evidenze richieste.':'lettura/controllo manuale documentato.')+'\n\n';
}
const target=path.resolve(root,'..','percorso-implementation.md');fs.writeFileSync(target,out);console.log('Esportati '+E.passi.length+' passi principali in '+target);
