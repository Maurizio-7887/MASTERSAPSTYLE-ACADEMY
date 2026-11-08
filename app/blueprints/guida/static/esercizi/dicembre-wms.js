/* Esercitazione «Dicembre: dalla costituzione alla riapertura» sul sistema integrato S/4 con il WMS attivo.
   L'azienda nasce il 01/12/2026 da zero: capitale, macchinari, assicurazione, ferro, un ordine transenna
   con tre fasi e WIP analitico, un semilavorato autonomo a scorta, consegna con picking WMS, fatture,
   anticipo su fatture, pagamenti, sopravvenienza, cessioni con plus e minusvalenza, stipendi, ratei e risconti,
   ammortamenti, IVA, imposte, chiusura, riapertura e primi giorni di gennaio 2027.
   Date e numeri appartengono all'azienda didattica. */
(function () {
  'use strict';
  // guida punto per punto: MIGO 101 (entrata del ferro) e F-53 (pagamento al fornitore). Vedi pannello.js: p.punti
  function PMIGO(riga, fatto) {
    var f = function (x) { return Object.assign({fatto: fatto}, x); };
    return [
      f({t: 'scelta', sel: '#mi-ordine', nome: 'Ordine d’acquisto', valore: '4500000001', serve: 'La merce si riceve sempre «contro un ordine»: scegli quello del ferro. Così il programma sa fornitore, prezzo e quantità attesi.'}),
      f({t: 'leggi', sel: '#mi-qta', nome: 'Quantità contata', serve: 'Lasciala VUOTA se è arrivato tutto come da DDT: il programma carica l’intero residuo. Scrivi un numero solo se il magazziniere ha contato di meno.'}),
      f({t: 'campo', sel: '#mi-ddt', nome: 'Numero DDT del fornitore', valore: riga.ddt, serve: 'Il documento di trasporto che accompagna la merce: è la prova di che cosa è arrivato e da chi. Serve per ritrovare il carico se c’è un reclamo.'}),
      f({t: 'campo', sel: '#mi-lotto', nome: 'Lotto (colata)', valore: riga.lotto, serve: 'Il numero di colata del certificato del fornitore: tiene la tracciabilità del materiale (da quale colata viene ogni pezzo).'}),
      f({t: 'campo', sel: '#mi-danneggiati', nome: 'Di cui danneggiati', valore: riga.dann, serve: 'Quanti kg sono arrivati rovinati. Sono DENTRO i 3.000 ricevuti, non in più. Entrano in stock bloccato (quarantena) e non si useranno finché non c’è il reclamo.'}),
      f({t: 'campo', sel: '#mi-danno', nome: 'Descrizione del danno', valore: riga.danno, serve: 'Che cosa è successo: resta scritto e servirà per il reclamo al fornitore.'}),
      f({t: 'campo', sel: '#mi-data', nome: 'Data di registrazione', valore: riga.data, serve: 'Il giorno in cui la merce è arrivata davvero: da qui decide la competenza del magazzino.'}),
      f({t: 'pulsante', sel: '[data-prefisso="mi"] [data-azione="mi"]', nome: 'Registra entrata', serve: 'Registra il carico: il magazzino sale e nasce il debito presunto verso il fornitore (conto 22 «fatture da ricevere»).', finale: true})
    ];
  }
  // VF01: stesso tutor contestuale usato dai pagamenti, senza rivelare la soluzione contabile.
  // I selettori corrispondono ai campi reali di erp_vendite/static/sd-pagine.js.
  function PVF(rif, numero, cliente) {
    var completata = function(h) { return !!fattura(h, rif); };
    return [
      {t:'scelta',sel:'#vf-consegna',nome:'Consegna da fatturare',valore:numero,
       serve:'Scegli la consegna '+numero+' di '+cliente+'. La fattura deve partire da questa consegna già uscita dal magazzino, non da una consegna dell’altro cliente.',fatto:completata},
      {t:'campo',sel:'#vf-data',nome:'Data della fattura',valore:'2026-12-15',
       serve:'Imposta il 15/12/2026. È la data contabile della fattura e deve essere coerente con la consegna e il periodo dell’esercizio.',fatto:completata},
      {t:'pulsante',sel:'[data-prefisso="vf"] [data-azione="vf"]',nome:'Crea e contabilizza',
       serve:'Premi una volta dopo aver verificato consegna e data. Il sistema genera la fattura e la registrazione contabile; poi ricostruisci personalmente Dare, Avere e importi nel laboratorio di ragioneria.',fatto:completata,finale:true}
    ];
  }

  function PPAGA(forn, nome, doc, data, fatto, nota) {
    var f = function (x) { return Object.assign({fatto: fatto}, x); }, p = [
      f({t: 'scelta', sel: '#pg-fornitore', nome: 'Fornitore', valore: forn, serve: 'Scegli ' + forn + ' ' + nome + '. ATTENZIONE: il modulo propone da solo il primo fornitore con debiti aperti, che spesso NON è quello giusto. Se sbagli fornitore, paghi un debito che non è quello della fattura.'})];
    if (doc) p.push(f({t: 'campo', sel: '#pg-documento', nome: 'Fattura da pagare', valore: doc, serve: 'Il numero della fattura che stai pagando: chiude proprio quella voce nel debito del fornitore. Deve essere una fattura di ' + nome + '.'}));
    p.push(f({t: 'leggi', sel: '#pg-importo', nome: 'Importo', serve: nota || 'Lascialo vuoto: il programma paga tutto il debito aperto verso questo fornitore.'}),
      f({t: 'campo', sel: '#pg-data', nome: 'Data del bonifico', valore: data, serve: 'Il giorno in cui la banca addebita: la banca scende da quella data.'}),
      f({t: 'pulsante', sel: '[data-prefisso="pg"] [data-azione="pg"]', nome: 'Registra il pagamento', serve: 'Registra: D 20 Debiti verso fornitori / A 10 Banca. Controlla poi che il debito del fornitore scenda a zero.', finale: true}));
    return p;
  }

  // guida punto per punto del passo «ordina il ferro» + conferma d'ordine del fornitore (vedi pannello.js: p.punti)
  function PME(data, qta, prezzo, trova) {
    var ord = function (h) { try { return trova(h); } catch (e) { return null; } }, conf = function (h) { var o = ord(h); return !!o && !!o.conferma && o.conferma.stato !== 'revocata'; }, esiste = function (h) { return !!ord(h); };
    var c = function (sel, nome, valore, serve, x) { return Object.assign({t: 'campo', sel: sel, nome: nome, valore: valore, serve: serve, fatto: esiste}, x || {}); };
    return [
      {t: 'scelta', sel: '#me-fornitore', nome: 'Fornitore', valore: 'F100', serve: 'F100 Acciaierie Umbre è il fornitore del ferro: l’ordine è un impegno verso di lui.', fatto: esiste, controlla: true},
      {t: 'scelta', sel: '#me-materiale', nome: 'Materiale', valore: 'FERRO', serve: 'Cosa stai comprando: il ferro è la materia prima di transenne e kit.', fatto: esiste, controlla: true},
      c('#me-qta', 'Quantità', String(qta), 'Quanti kg ordini. È una quantità d’ordine: la merce non è ancora arrivata e non scrivi nulla in contabilità.'),
      c('#me-prezzo', 'Prezzo netto €/unità', prezzo, 'Il prezzo pattuito al kg. Il ferro ha controllo prezzo standard: la differenza col prezzo standard andrà al conto 63, non al magazzino.'),
      c('#me-data', 'Data', data, 'La data dell’ordine: serve alla competenza e per stabilire gli eventi successivi (consegna, fattura).'),
      {t: 'pulsante', sel: '[data-prefisso="me"] [data-azione="me"]', nome: 'Salva ordine', serve: 'Crea l’ordine d’acquisto e gli dà il numero 4500000001.', fatto: esiste},
      {t: 'scelta', sel: '#cf-ordine', nome: 'Ordine inviato', valore: '4500000001', serve: 'Ora simula la risposta del fornitore: scegli l’ordine di cui ti è tornata la conferma.', fatto: conf},
      {t: 'campo', sel: '#cf-rif', nome: 'Riferimento della conferma', valore: 'CONF-001', serve: 'Il numero (o la data) del documento con cui il fornitore ti conferma che accetta ordine, prezzo e quantità.', fatto: conf},
      {t: 'pulsante', sel: '[data-prefisso="cf"] [data-azione="cf"]', nome: 'Registra la conferma tornata', serve: 'Da questo momento l’ordine non è più «⏳ in attesa»: il fornitore lo ha accettato. Se prezzo o quantità confermati fossero diversi, il programma te lo segnalerebbe prima che arrivi la merce.', fatto: conf, finale: true}
    ];
  }

  // Non reinterpretare le aziende già costituite con il precedente modello a tre ordini.
  var corrente = null;
  try {
    corrente = typeof window.MSA_STATO_CORRENTE === 'function' ? window.MSA_STATO_CORRENTE() : window.MSA_STATO_CORRENTE;
    if (!corrente && window.MSA_GUIDA && window.MSA_GUIDA.chiave) corrente = JSON.parse(window.localStorage.getItem(window.MSA_GUIDA.chiave) || 'null');
  } catch (e) { /* Un salvataggio non leggibile non va alterato dalla guida. */ }
  if (corrente && corrente.costituzione && corrente.produzioneModello !== 'wip-fasi-v1' && window.MSA_ESERCIZIO_DICEMBRE_LEGACY) {
    window.MSA_ESERCIZIO = window.MSA_ESERCIZIO_DICEMBRE_LEGACY;
    return;
  }
  var D='erp_dati.', M='erp_magazzino.', A='erp_acquisti.', P='erp_produzione.', C='erp_costi.', V='erp_vendite.', X='erp_spedizione.', T='erp_tesoreria.', F='erp_fi.', K='erp_cespiti.', H='erp_chiusura.', Y='erp_paghe.', I='erp_inventario.', Z='erp_innovazione.';
  var regs = function(h) { return h.S.registrazioni || []; };
  var reg = function(h,tipo,data) { return regs(h).some(function(r){return r.tipo===tipo && (!data || r.data===data);}); };
  var saldo = function(h,c,alla,partner) { return Math.round(regs(h).reduce(function(s,r){if(alla && r.data>alla)return s;if(r.chiusura==='stato patrimoniale'||r.chiusura==='epilogo'||r.chiusura==='riapertura')return s;return s+(r.righe || []).filter(function(x){return x.conto===c && (!partner || x.partner===partner);}).reduce(function(t,x){return t+(x.dareAvere==='DARE'?x.importo:-x.importo);},0);},0)*100)/100; };
  var cesp = function(h,d) { return (h.S.cespiti || []).find(function(c){return c.descrizione===d;}); };
  // l'ordine si riconosce dal riferimento cliente (senza badare a maiuscole, spazi e trattini) oppure, se l'allievo lo ha scritto diverso o vuoto,
  // da cliente + materiale + quantità: un riferimento scritto a modo suo non deve fermare l'esercizio
  var ORDINI_ATTESI = {'BETA-180': ['C100', 'TR-STD', 180], 'DELTA-120': ['C200', 'TR-STD', 120]};
  var norm = function(t) { return String(t == null ? '' : t).toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  var ordine = function(h,rif) {
    var lista = h.S.ordini || [], a = ORDINI_ATTESI[rif];
    return lista.find(function(o){return norm(o.rif)===norm(rif);}) ||
      (a && lista.find(function(o){return o.cliente===a[0] && o.materiale===a[1] && Number(o.qta)===a[2];}));
  };
  var consegna = function(h,rif) { var o=ordine(h,rif); return o && (h.S.consegne || []).find(function(c){return c.ordine===o.numero && c.wm;}); };
  var fattura = function(h,rif) { var c=consegna(h,rif); return c && (h.S.fatture || []).find(function(f){return f.tipo==='F2' && f.consegna===c.numero;}); };
  var prod = function(h,mat) { return (h.S.produzione || []).find(function(o){return o.materiale===mat && o.data.slice(0,7)==='2026-12';}); };
  var evento = function(h,mat,tipo) { var o=prod(h,mat); return !!o && o.eventi.some(function(e){return e.tipo===tipo && !e.stornato;}); };
  var fase = function(h,nome) { var o=prod(h,'TR-STD');return !!o && o.eventi.filter(function(e){return e.tipo==='CO11N' && e.fase===nome && !e.stornato;}).reduce(function(q,e){return q+(e.qta || 0);},0)>=o.qta; };
  var compiti = function(h,tipo,f) { return ((h.S.wm || {}).compiti || []).filter(function(t){return t.tipo===tipo && t.stato!=='annullato' && (!f || f(t));}); };
  var trasfKit = function(h){return ((h.S.wm||{}).trasferimenti||[]).filter(function(t){return t.mat==='SL-TAGLIO';})[0];};
  var fatti = function(ts,n) { return ts.length>=n && ts.every(function(t){return t.stato==='confermato' && Math.abs(t.qtaEff-t.qta)<1e-6;}); };
  var diOrdine = function(h,mat) { var o=prod(h,mat); return function(t){return !!o && t.ordine===o.numero;}; };
  var entrataDi = function(h,mat) { var o=prod(h,mat), docs=o?o.eventi.filter(function(e){return e.tipo==='101';}).map(function(e){return e.doc;}):[]; return function(t){return t.mat===mat && docs.indexOf(t.rif)>=0;}; };
  var acquisto = function(h) { return (h.S.acquisti || []).find(function(o){return o.materiale==='FERRO' && o.qta===3000 && o.data==='2026-12-03';}); };
  var riordino = function(h) { return (h.S.acquisti || []).find(function(o){return o.materiale==='FERRO' && o.qta===500 && o.data==='2026-12-05';}); };
  var entrataAcq = function(o) { var docs=o?(o.entrate || []).map(function(e){return e.doc;}):[]; return function(t){return t.mat==='FERRO' && docs.indexOf(t.rif)>=0;}; };
  var trasp = function(h) { return (((h.S.sped || {}).trasporti) || [])[0]; };
  var colliDi = function(h,rif) { var c=consegna(h,rif); return c ? (((h.S.sped || {}).colli) || []).filter(function(x){return x.consegna===c.numero;}) : []; };
  var bloccoTR = function(t){return t.mat==='TR-STD';};
  var rientroTR = function(t){return t.mat==='TR-STD' && t.da==='Q-ZONE';};
  var slot = function(t){return /slotting/.test(t.motivo || '');};
  var inv = function(h) { return (((h.S.wm || {}).inventari) || []).find(function(d){return d.data==='2026-12-31';}); };
  var paga = function(h,f,data) { return regs(h).some(function(r){return r.tipo==='PAGAMENTO_FORNITORE' && r.data===data && r.righe.some(function(x){return x.conto==='20' && x.partner===f;});}); };
  var ass = function(h,tipo,conto) { return ((h.S.chiusura || {}).assestamenti || []).find(function(x){return x.tipo===tipo && x.data==='2026-12-31' && (!conto || x.conto===conto);}); };
  // finanza: mutuo, parcella con ritenuta, cambiale di Edil Sigma, leasing del carrello
  var FIN = function(h) { return h.S.fin || {}; };
  var mutuo = function(h) { return (FIN(h).mutui || []).find(function(m){return m.importo===30000;}); };
  var parcella = function(h) { return (FIN(h).parcelle || []).find(function(p){return p.fornitore==='F800';}); };
  var noleggio = function(h) { return (h.S.fattureServizi || []).find(function(f){return f.cliente==='C400' && f.data==='2026-12-20';}); };
  var tratta = function(h) { return (FIN(h).cambiali || []).find(function(c){return c.verso==='attiva' && c.partner==='C400';}); };
  var leasing = function(h) { return (FIN(h).leasing || []).find(function(x){return /carrello/i.test(x.bene);}); };
  var assegnoComm = function(h) { return (FIN(h).assegni || []).find(function(a){return a.verso==='emesso' && a.partner==='F800';}); };
  var W='erp_finanza.';
  var rf = 'Per OGNI compito aperto: imposta la data di lavoro; copia nel campo 1 l’origine mostrata, nel 2 l’UdC mostrata (oppure il codice materiale), lascia la quantità intera, copia nel 4 la destinazione proposta e premi «Conferma il compito». Ripeti fino a coda vuota. Le destinazioni e le UdC si leggono dalla schermata, non si inventano.';
  var passi = [
    {id:'dicembre-avvio-vuoto',g:'0 · Preparazione azienda',titolo:'Prima di cominciare: un sistema vuoto',dove:{ep:D+'avvio'},percorso:'Launchpad → Avvio e dati di base → Avvio del sistema',
     campi:[['Ambiente','Sistema integrato, guida «Dicembre: dalla costituzione alla riapertura», azienda didattica vuota dedicata a questo caso'],['Se l’account è già vuoto','Usa la scheda «Nuova azienda · parti da zero»: nessun backup o reset necessario; costituisci la società al passo seguente'],['Se in alto c’è il riquadro rosso «In questo account c’è già un’azienda»','Solo con autorizzazione del docente: premi «♻️ RICOMINCIA DA ZERO» e conferma con OK. Il programma salva da solo una copia di sicurezza sul computer, svuota l’azienda e ricarica la pagina: compare la scheda «Nuova azienda · parti da zero». Se invece vuoi continuare il lavoro, non premere niente'],['Ordine del percorso','Prima società e capitale, WMS vuoto, acquisto beni e standard; poi gli ordini cliente aprono il CICLO OPERATIVO'],['Durata orientativa','Percorso su più lezioni: il lavoro resta salvato; il percorso completo comprende ulteriori laboratori']],
     nota:'Preserva i lavori precedenti: cambiare guida non crea una nuova azienda. Account e password restano invariati se ricominci nello stesso account. Non scegliere la modalità con saldi/scorte pronti. Nessun reset viene eseguito automaticamente dalla guida.',
     fatto:function(h){return !h.S.avviato || !!h.S.costituzione;}},
    // ── 1 · costituzione ──
    {g:'1 · Costituzione',data:'01/12/2026',titolo:'Costituisci la società con 80.000 € di capitale',contabile:true,dove:{ep:D+'avvio'},percorso:'Avvio e dati di base → Avvio del sistema → scheda «Nuova azienda · parti da zero»',
     campi:[['Data di costituzione','01/12/2026'],['Capitale sociale sottoscritto','80000'],['Pulsante','Crea nuova azienda vuota (costituzione); NON usare l’avvio con saldi pronti, che caricherebbe scorte e banca già valorizzate']],
     attesa:'D 08 Crediti verso soci per versamenti ancora dovuti / A 30 Capitale sociale 80.000. Banca a zero, magazzino vuoto. Il sistema prepara la TR-STD con tre fasi sullo stesso ordine, un solo HALB autonomo SL-TAGLIO, i costi standard e i tre dipendenti assunti oggi.',
     nota:'Con l’atto costitutivo i soci si impegnano a versare: nasce un credito della società verso i soci. Il denaro arriva con il passo dopo.',fatto:function(h){return !!h.S.costituzione && h.S.costituzione.data==='2026-12-01';}},
    {g:'1 · Costituzione',data:'01/12/2026',titolo:'I soci versano il capitale in banca',contabile:true,dove:{ep:D+'avvio'},percorso:'Avvio e dati di base → Avvio del sistema → riquadro dell’azienda nuova',campi:[['Importo versato','vuoto = tutto il sottoscritto (80.000)'],['Data del versamento','01/12/2026']],
     attesa:'D 10 Banca / A 08 Crediti verso soci 80.000. Il credito verso i soci va a zero; banca 80.000.',fatto:function(h){return reg(h,'VERSAMENTO_SOCI') && saldo(h,'08')===0;}},
    {id:'dicembre-wms-vuoto',g:'1 · Preparazione: WMS',data:'01/12/2026',titolo:'Attiva il magazzino W100 (vuoto)',dove:{ep:M+'struttura'},percorso:'WMS → Struttura e attivazione',campi:[['Prerequisito','Società costituita e capitale versato, ma nessuna scorta; questa è configurazione logistica, non acquisto né produzione'],['Data di attivazione','01/12/2026']],
     attesa:'41 ubicazioni create, nessuna unità di carico: il magazzino è vuoto come la contabilità. Nessuna scrittura.',
     nota:'Attiva W100 dopo la costituzione e prima del primo ricevimento di materiali, ancora senza merci: il passo non registra capitale e non carica scorte. In seguito entrate, spostamenti e uscite sono governati dai relativi compiti RF.',fatto:function(h){return (h.S.wm || {}).attivo==='2026-12-01';}},
    {id:'dicembre-lettura-standard',g:'2 · Preparazione: budget e standard',data:'01/12/2026',titolo:'Leggi il ciclo a fasi e il semilavorato autonomo',dove:{ep:P+'ordini'},percorso:'PP → Ordini di produzione → Distinta e ciclo; poi CO → Calcolo del costo standard',
     campi:[['TR-STD','8 kg ferro × 0,95 = 7,60; Taglio 0,25 h + Piegatura 0,20 h + Saldatura 0,40 h, a 28 €/h: standard 31,40 €/pz'],['Un solo ordine','Il ferro e le ore delle tre fasi si accumulano nello stesso WIP analitico. Nessuna entrata merci tra le fasi; un solo 101 del finito alla fine'],['HALB autonomo','SL-TAGLIO: 8 kg ferro 7,60 + Taglio 0,25 h × 28 = 7,00 → 14,60 €/pz. Un ordine separato produce 20 kit a scorta, non alimenta l’ordine TR-STD'],['Scheda di calcolo','sovraccosti 0%, tariffa 28 €/h, lotto 100']],
     nota:'Prima della produzione acquista e metti in funzione i beni strumentali; verifica poi budget, distinta e tempi. WIP analitico = costi addebitati all’ordine meno output accreditato: non è una scorta IM/WMS e non genera da solo una capitalizzazione FI. I vecchi salvataggi mantengono il percorso precedente.'},
    // ── 2 · macchinari ──
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra la taglierina a nastro',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Taglierina a nastro'],['Classe','IMP Impianti e macchinari (10%)'],['Fornitore','F300 Macchine Alfa'],['Imponibile','15000'],['IVA %','22'],['Numero fattura','MA-101'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'Cespite CE-0001. D 01 Impianti e macchinari 15.000 + D 14 IVA a credito 3.300 / A 20 Fornitore 18.300.',fatto:function(h){return !!cesp(h,'Taglierina a nastro');}},
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra la piegatubi idraulica',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Piegatubi idraulica'],['Classe','IMP'],['Fornitore','F300'],['Imponibile','8000'],['IVA %','22'],['Numero fattura','MA-102'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'CE-0002. D 01 8.000 + D 14 1.760 / A 20 9.760.',fatto:function(h){return !!cesp(h,'Piegatubi idraulica');}},
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra la saldatrice a filo',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Saldatrice a filo'],['Classe','IMP'],['Fornitore','F300'],['Imponibile','6000'],['IVA %','22'],['Numero fattura','MA-103'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'CE-0003. D 01 6.000 + D 14 1.320 / A 20 7.320. Le tre fasi hanno le proprie macchine: gli acquisti precedono il loro uso produttivo.',fatto:function(h){return !!cesp(h,'Saldatrice a filo');}},
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra il carrello elevatore del magazzino',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Carrello elevatore elettrico'],['Classe','MEZ Mezzi di movimentazione interna (20%)'],['Fornitore','F300'],['Imponibile','12000'],['IVA %','22'],['Numero fattura','MA-104'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'CE-0004. D 03 Mezzi di movimentazione 12.000 + D 14 2.640 / A 20 14.640.',fatto:function(h){return !!cesp(h,'Carrello elevatore elettrico');}},
    {g:'2 · Macchinari',data:'01/12/2026',titolo:'F-90: compra una sega circolare d’occasione',contabile:true,dove:{ep:K+'acquisto'},percorso:'FI → Cespiti → Acquisto di un cespite',
     campi:[['Descrizione','Sega circolare'],['Classe','IMP'],['Fornitore','F300'],['Imponibile','2000'],['IVA %','22'],['Numero fattura','MA-105'],['Entrata in funzione','01/12/2026'],['Data','01/12/2026']],
     attesa:'CE-0005. D 01 2.000 + D 14 440 / A 20 2.440. Debito verso Macchine Alfa: 52.460.',
     nota:'Tutti e cinque gli acquisti F-90 registrano direttamente fattura e cespite: non creare anche un ordine MM per gli stessi beni. La data di entrata in funzione è 01/12/2026; uso, ammortamento e cessione sono successivi. La sega sarà rivenduta con plusvalenza; il carrello con minusvalenza.',fatto:function(h){return !!cesp(h,'Sega circolare');}},
    // ── 3 · assicurazione ──
    {g:'3 · Assicurazione',data:'01/12/2026',titolo:'FB60: registra la polizza annuale',contabile:true,dove:{ep:F+'passive'},percorso:'FI → Contabilità → Fatture passive di servizi e pagamenti',
     campi:[['Fornitore','F400 Assicurazioni Omega'],['Numero','POL-2026-118'],['Conto di costo','83 Assicurazioni'],['Descrizione','premio annuo polizza incendio e furto'],['Imponibile','1200'],['IVA %','0 (assicurazioni esenti)'],['Competenza','dal 01/12/2026 al 30/11/2027'],['Scadenza','02/12/2026'],['Data','01/12/2026']],
     attesa:'D 83 Assicurazioni / A 20 Fornitore 1.200, senza IVA. Il premio copre 12 mesi, ma solo dicembre è del 2026: lo sistemeremo a fine anno con il risconto.',
     fatto:function(h){return (h.S.fatturePassive || []).some(function(f){return f.rif==='POL-2026-118';});}},
    {g:'3 · Assicurazione',data:'02/12/2026',titolo:'F-53: paga la polizza',contabile:true,dove:{ep:F+'passive'},percorso:'FI → Contabilità → Fatture passive e pagamenti → Pagamento a un fornitore',
     campi:[['Fornitore','F400 Assicurazioni Omega: cambialo, il modulo propone il primo fornitore con debiti aperti'],['Fattura','POL-2026-118'],['Importo','vuoto = tutto il debito'],['Data','02/12/2026']],punti:PPAGA('F400','Assicurazioni Omega','POL-2026-118','2026-12-02',function(h){return paga(h,'F400','2026-12-02');}),attesa:'D 20 / A 10 Banca 1.200. Banca 78.800.',fatto:function(h){return paga(h,'F400','2026-12-02');}},
    // ── 4 · ordini cliente ──
    {id:'dicembre-inizio-ciclo-operativo',g:'4 · CICLO OPERATIVO: ordini dei clienti',data:'02/12/2026',titolo:'VA01: Beta ordina 180 TR-STD',dove:{ep:V+'ordini'},percorso:'SD → Ordini cliente',
     campi:[['Committente','C100 Beta Costruzioni'],['Materiale','TR-STD'],['Quantità','180'],['Riferimento cliente','BETA-180'],['Data','02/12/2026'],['Data di consegna richiesta','14/12/2026']],
     attesa:'Lordo 10.800 − sconto quantità 2% 216 = netto 10.584; IVA 2.328,48; totale 12.912,48. Controllo di disponibilità (ATP): giacenza 0 e niente in arrivo → confermati 0 su 180, l’ordine aspetta la produzione. Nessuna scrittura.',nota:'Qui inizia il ciclo operativo su domanda cliente: ordini → fabbisogni → acquisto materie → ricevimento e fattura → produzione → consegna → fattura cliente. La precedente costituzione e gli acquisti dei macchinari erano preparazione dell’azienda, non ordini dei clienti. Produrre per scorta è un’alternativa: la userai solo per i 20 kit autonomi.',fatto:function(h){return !!ordine(h,'BETA-180');}},
    {g:'4 · CICLO OPERATIVO: ordini dei clienti',data:'02/12/2026',titolo:'VA01: Delta ordina 120 TR-STD',dove:{ep:V+'ordini'},percorso:'SD → Ordini cliente',
     campi:[['Committente','C200 Delta Noleggi'],['Materiale','TR-STD'],['Quantità','120'],['Riferimento cliente','DELTA-120'],['Data','02/12/2026'],['Data di consegna richiesta','14/12/2026']],
     attesa:'Netto 7.056 (7.200 − 2%); IVA 1.552,32; totale 8.608,32. Confermati 0 su 120. Totale da produrre: 300 transenne.',fatto:function(h){return !!ordine(h,'DELTA-120');}},
    {id:'dicembre-atp-ordini',g:'4 · CICLO OPERATIVO: ordini dei clienti',data:'02/12/2026',titolo:'VA05: leggi il semaforo di disponibilità dei due ordini',dove:{ep:V+'ordini'},percorso:'SD → Ordini cliente → elenco VA05, colonna Disponibilità; poi SD → Gestione crediti e disponibilità → CO09',
     campi:[['Colonna Disponibilità','Beta 180 e Delta 120: semaforo rosso «non confermabile: niente a magazzino né in arrivo»; data confermabile vuota'],['Legenda','Verde: confermabile per intero alla data richiesta · giallo: confermabile più tardi o solo in parte · rosso: niente a magazzino né in arrivo'],['CO09 · materiale TR-STD','Giacenza 0, nessuna entrata pianificata: le righe di schedulazione sono vuote e lo scoperto è 300']],
     attesa:'Il controllo di disponibilità guarda la giacenza libera e le entrate pianificate (ordini di produzione e d’acquisto). Oggi non c’è nessuna delle due: per questo serve un ordine di produzione.',nota:'Chi ha ordinato prima è servito prima: a parità di data vale il numero d’ordine, quindi Beta prima di Delta. Spunta con «Fatto» dopo la lettura.'},
    {id:'dicembre-fabbisogni',g:'4 · CICLO OPERATIVO: fabbisogni',data:'02/12/2026',titolo:'Dalla domanda ai fabbisogni: 300 transenne e 20 kit a scorta',dove:{ep:P+'ordini'},percorso:'SD → Ordini cliente; PP → Ordini di produzione → Distinta e ciclo',
     campi:[['Domanda acquisita','Beta 180 + Delta 120 = 300 TR-STD, giacenza finito zero'],['Fabbisogno TR-STD','300 × 8 = 2.400 kg FERRO; Taglio 75 h, Piegatura 60 h, Saldatura 120 h'],['Scorta HALB separata','20 SL-TAGLIO: 160 kg FERRO + 5 h Taglio; non è un componente delle 300 transenne'],['Acquisti da pianificare','2.560 kg netti per i due ordini; primo acquisto 3.000 kg, poi reintegro urgente di 500 kg dopo i 200 kg danneggiati'],['Non creare ancora','Nessun ordine PP aggiuntivo, nessuna entrata merci e nessuna scrittura per questo calcolo']],
     attesa:'Riconcilia domanda cliente, distinta e fabbisogni prima dell’ordine MM del 03/12. Il budget annuo da 1.200 TR-STD è un piano annuale, non sostituisce questi 300 pezzi né genera automaticamente un ordine.',nota:'È un controllo ragionato della distinta consultabile: non viene promesso un lancio MRP automatico. Spunta dopo aver documentato il calcolo.'},
    // ── 5 · ferro ──
    {g:'5 · Acquisto del ferro',data:'03/12/2026',titolo:'ME21N: ordina 3.000 kg di ferro',dove:{ep:A+'ordini'},percorso:'MM → Ordini d’acquisto e rilascio',campi:[['Fornitore','F100 Acciaierie Umbre'],['Materiale','FERRO'],['Quantità','3000'],['Prezzo','1,00'],['Data','03/12/2026']],
     attesa:'Ordine 4500000001 da 3.000 €. Ne servono 2.560 kg (300 transenne × 8 + 20 kit autonomi × 8): il resto è scorta. Nessuna scrittura. Poi, nella stessa pagina, riquadro «Conferma d’ordine del fornitore»: il fornitore deve rispedirti la sua conferma. Scegli l’ordine, scrivi il riferimento (es. CONF-001) e premi «Registra la conferma tornata»: finché non torna, l’ordine resta «⏳ in attesa». Non cambia la contabilità, ma ti dice che il fornitore ha accettato prezzo e quantità.',punti:PME('2026-12-03',3000,'1,00',function(h){return acquisto(h);}),fatto:function(h){return !!acquisto(h);}},
    {g:'5 · Acquisto del ferro',data:'04/12/2026',titolo:'MIGO 101: ricevi il ferro, 200 kg sono schiacciati',contabile:true,dove:{ep:A+'entrate'},percorso:'MM → Entrata merci (anche da WMS)',
     campi:[['Ordine','4500000001'],['Quantità contata','vuoto = 3.000 come sul DDT'],['Numero DDT','DDT-AU-5512'],['Lotto (colata dal certificato)','COL-1204'],['Di cui danneggiati','200'],['Descrizione del danno','tubi schiacciati nel trasporto'],['Data','04/12/2026']],
     punti:PMIGO({ddt:'DDT-AU-5512',lotto:'COL-1204',dann:'200',danno:'tubi schiacciati nel trasporto',data:'2026-12-04'},function(h){var o=acquisto(h);return !!o && o.entrato===3000;}),attesa:'D 12 Ferro 2.850 (a standard 0,95) + D 63 Differenza prezzo 150 / A 22 Fatture da ricevere 3.000: la merce è arrivata tutta ed è nostra. WMS: 2.800 kg buoni in 3 fasci (1.000 + 1.000 + 800) in GR-ZONE con 3 compiti di messa a posto; i 200 kg danneggiati vanno in stock BLOCCATO nella quarantena Q-ZONE.',
     nota:'Al ricevimento il magazziniere conta, confronta con il DDT e controlla lo stato della merce prima di firmare.',fatto:function(h){var o=acquisto(h);return !!o && o.entrato===3000 && ((h.S.wm || {}).blocchi || []).length>0;}},
    {g:'5 · Acquisto del ferro',data:'04/12/2026',titolo:'Merce da mettere a posto: che cosa aspetta in ricevimento?',dove:{ep:M+'allocare'},percorso:'WMS → Merce da mettere a posto',
     campi:[['Data di oggi','04/12/2026'],['Leggi','articolo, quantità, UdC, «Da dove arriva» e «Va in (proposta)» di ogni riga'],['Pulsante','«▶ Metti a posto» sulla prima riga: si apre la pistola RF con quel compito (continua nel passo dopo)']],
     attesa:'3 UdC di FERRO, 2.800 kg arrivati oggi: 1.000 e 1.000 kg verso F-01, 800 kg verso F-02. I 200 kg schiacciati NON sono qui: sono bloccati in quarantena.',nota:'Lettura: spunta a mano. La merce in ricevimento è già nostra e già in contabilità, ma finché non è a scaffale non si può prelevare.'},
    {g:'5 · Acquisto del ferro',data:'04/12/2026',titolo:'RF: metti a dimora i 3 fasci buoni in catasta',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','04/12/2026'],['Risorsa','MAG01 Marco'],['Compiti','i 3 PUTAWAY del ferro']],
     attesa:'F-01 con due fasci, F-02 con quello da 800. GR-ZONE vuota; i 200 kg restano in Q-ZONE. Nessuna scrittura: il ferro era già in contabilità.',nota:rf,fatto:function(h){return fatti(compiti(h,'PUTAWAY',entrataAcq(acquisto(h))),3);}},
    {g:'5 · Acquisto del ferro',data:'05/12/2026',titolo:'Quarantena: decidi sui 200 kg schiacciati',contabile:true,dove:{ep:M+'bloccato'},percorso:'WMS → Merce bloccata e danneggiata → 3 · Decidi sulla merce arrivata in quarantena',
     campi:[['UdC in quarantena','quella da 200 kg di FERRO'],['Esito del controllo','tubi schiacciati, non riparabili'],['Pulsante','Rottama: da buttare (555)'],['Data','05/12/2026']],
     attesa:'D 69 Rottamazioni e merce danneggiata / A 12 Ferro 190 (200 × 0,95). Il ferro esce dal magazzino e diventa un costo. Se il controllo avesse detto «buona», si sbloccava (343) e tornava a scaffale.',
     nota:'Questi 200 kg sono già entrati bloccati in Q-ZONE al ricevimento: non premere «Metti in quarantena e crea il compito RF» su altri fasci. Quel comando serve quando una UdC prima libera deve diventare bloccata e richiede poi conferma RF. Qui devi solo decidere sulla merce già in quarantena. Non confondere con il blocco delle ubicazioni durante l’inventario. Il trasporto era a nostro rischio (franco partenza): il fornitore fattura tutti i 3.000 kg.',fatto:function(h){return reg(h,'ROTTAMAZIONE','2026-12-05');}},
    {g:'5 · Acquisto del ferro',data:'05/12/2026',titolo:'MIRO: registra la fattura del ferro',contabile:true,dove:{ep:A+'fatture'},percorso:'MM → Fatture fornitore',campi:[['Ordine','4500000001'],['Numero fattura','FR-2026-871'],['Prezzo','vuoto = quello dell’ordine'],['Data','05/12/2026']],
     attesa:'D 22 3.000 + D 14 IVA 660 / A 20 Acciaierie Umbre 3.660. Il conto 22 torna a zero.',fatto:function(h){return (h.S.fattureFornitore || []).some(function(f){return f.rif==='FR-2026-871';});}},
    {g:'5 · Acquisto del ferro',data:'05/12/2026',titolo:'ME21N: riordino urgente di 500 kg',dove:{ep:A+'ordini'},percorso:'MM → Ordini d’acquisto e rilascio',campi:[['Fornitore','F100'],['Materiale','FERRO'],['Quantità','500'],['Prezzo','1,08 (consegna urgente)'],['Data','05/12/2026']],
     attesa:'Ordine 4500000002 da 540 €. Con 2.800 kg buoni ne restano solo 240 dopo i due ordini: si ricostituisce la scorta di sicurezza. Nessuna scrittura.',fatto:function(h){return !!riordino(h);}},
    {g:'5 · Acquisto del ferro',data:'06/12/2026',titolo:'MIGO 101: ricevi i 500 kg urgenti',contabile:true,dove:{ep:A+'entrate'},percorso:'MM → Entrata merci',campi:[['Ordine','4500000002'],['Numero DDT','DDT-AU-5530'],['Lotto (colata)','COL-1206'],['Danneggiati','0'],['Data','06/12/2026']],
     attesa:'D 12 475 + D 63 65 / A 22 540. Un fascio da 500 kg in GR-ZONE.',fatto:function(h){var o=riordino(h);return !!o && o.entrato===500;}},
    {g:'5 · Acquisto del ferro',data:'06/12/2026',titolo:'RF: metti a dimora il fascio urgente',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','06/12/2026'],['Compiti','il PUTAWAY del ferro']],
     attesa:'Strategia «aggiunta a scorta esistente»: il fascio va in F-02, accanto a quello da 800. Le due colate restano distinte.',nota:rf,fatto:function(h){return fatti(compiti(h,'PUTAWAY',entrataAcq(riordino(h))),1);}},
    {g:'5 · Acquisto del ferro',data:'06/12/2026',titolo:'MIRO: fattura del riordino',contabile:true,dove:{ep:A+'fatture'},percorso:'MM → Fatture fornitore',campi:[['Ordine','4500000002'],['Numero fattura','FR-2026-902'],['Data','06/12/2026']],
     attesa:'D 22 540 + D 14 118,80 / A 20 658,80.',fatto:function(h){return (h.S.fattureFornitore || []).some(function(f){return f.rif==='FR-2026-902';});}},
    // ── 6 · un ordine, tre fasi: nessuna scorta intermedia ──
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'CO01: un ordine per 300 transenne',dove:{ep:P+'ordini'},percorso:'PP → Ordini di produzione',campi:[['Materiale','TR-STD'],['Quantità','300'],['Data','07/12/2026'],['Data di fine pianificata','12/12/2026']],
     attesa:'Ordine 1000001: 2.400 kg di ferro, Taglio 75 h, Piegatura 60 h, Saldatura 120 h; costo pianificato 9.420. Non creare ordini per ogni fase.',fatto:function(h){var o=prod(h,'TR-STD');return !!o && o.qta===300;}},
    {id:'dicembre-atp-produzione',g:'6 · Ordine transenne',data:'07/12/2026',titolo:'CO09: le 300 transenne in arrivo rendono confermabili i due ordini',dove:{ep:V+'crediti'},percorso:'SD → Gestione crediti e disponibilità → Disponibilità per materiale (CO09), materiale TR-STD; poi SD → Ordini cliente',
     campi:[['Righe di schedulazione di Beta','180 · 12/12/2026 · ordine di produzione 1000001'],['Righe di schedulazione di Delta','120 · 12/12/2026 · ordine di produzione 1000001'],['Semaforo VA05','Tutti e due verdi: confermabili per intero alla data richiesta 14/12, data confermabile 12/12/2026']],
     attesa:'L’ordine di produzione è un’entrata pianificata alla sua data di fine: 300 pezzi il 12/12, prima del 14/12 richiesto dai clienti. Niente è ancora a magazzino: la quantità «Confermata da giacenza» resta 0 finché non registri il 101.',nota:'Se la data di fine fosse dopo il 14/12 il semaforo sarebbe giallo («confermabile per intero dal …»). Spunta con «Fatto» dopo la lettura.'},
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'WMS: porta il ferro delle transenne alla linea',dove:{ep:M+'compiti'},percorso:'WMS → Compiti → Approvvigionamento della produzione',campi:[['Ordine','1000001 TR-STD'],['Quantità','vuoto = 2.400 kg'],['Data','07/12/2026']],
     attesa:'3 STAGING FIFO: F-01 1.000 + 1.000, F-02 400 → PSA-L1.',fatto:function(h){return compiti(h,'STAGING',diOrdine(h,'TR-STD')).length===3;}},
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'RF: conferma l’approvvigionamento del ferro delle transenne',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','07/12/2026'],['Compiti','i 3 STAGING']],
     attesa:'2.400 kg nella PSA; F-02 conserva 400 kg COL-1204 e 500 kg COL-1206. IM resta 3.300 kg: nessun consumo.',nota:rf,fatto:function(h){return fatti(compiti(h,'STAGING',diOrdine(h,'TR-STD')),3);}},
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'261: consuma 2.400 kg sullo stesso ordine',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Prelievi, conferme, entrate → Prelievo',campi:[['Ordine','1000001'],['Quantità','2400'],['Data','07/12/2026']],
     attesa:'D 70 / A 12 2.280 (2.400 × 0,95). Costo sul solo ordine 1000001; PSA vuota. Nessun semilavorato a magazzino.',fatto:function(h){return evento(h,'TR-STD','261');}},
    {g:'6 · Ordine transenne',data:'07/12/2026',titolo:'CO11N: Taglio 75 ore, WIP 4.380',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Conferma delle ore',campi:[['Ordine','1000001'],['Fase','Taglio'],['Attrezzaggio','0'],['Ore','75'],['Quantità fase','300 (oppure vuoto = residuo)'],['Data','07/12/2026']],
     attesa:'75 × 28 = 2.100: D 72 / A 75. WIP analitico 2.280 + 2.100 = 4.380. Nessun 101, nessun PUTAWAY e nessuna scorta tagliata: la lavorazione resta sull’ordine.',fatto:function(h){return fase(h,'Taglio');}},
    // ── 7 · avanzamento sul medesimo ordine ──
    {g:'7 · Fasi sullo stesso ordine',data:'09/12/2026',titolo:'CO11N: Piegatura 60 ore, WIP 6.060',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Conferma delle ore',campi:[['Ordine','1000001, lo stesso del taglio'],['Fase','Piegatura'],['Attrezzaggio','0'],['Ore','60'],['Quantità fase','300 (oppure vuoto)'],['Data','09/12/2026']],
     attesa:'60 × 28 = 1.680: D 72 / A 75. WIP analitico 4.380 + 1.680 = 6.060. Nessun prelievo di SL-TAGLIO, nessun ordine SL-PIEGA e nessun 101 intermedio.',fatto:function(h){return fase(h,'Piegatura');}},
    {g:'7 · Fasi sullo stesso ordine',data:'11/12/2026',titolo:'CO11N: Saldatura 120 ore, WIP 9.420',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Conferma delle ore',campi:[['Ordine','1000001'],['Fase','Saldatura'],['Attrezzaggio','0'],['Ore','120'],['Quantità fase','300 (oppure vuoto)'],['Data','11/12/2026']],
     attesa:'120 × 28 = 3.360: D 72 / A 75. WIP analitico 6.060 + 3.360 = 9.420; le tre fasi sono complete. La merce non è ancora entrata nello stock.',fatto:function(h){return fase(h,'Saldatura');}},
    {g:'7 · Fasi sullo stesso ordine',data:'12/12/2026',titolo:'101: carica a magazzino le 300 transenne',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Entrata del prodotto',campi:[['Ordine','1000001'],['Pezzi','vuoto = 300'],['Data','12/12/2026']],
     attesa:'Unico 101 dell’ordine: D 13 / A 73 9.420. WIP residuo zero, 6 pallet da 50 in GR-ZONE. Beta e Delta confermati per intero. Prima del completamento delle tre fasi il programma rifiuta il 101.',fatto:function(h){return evento(h,'TR-STD','101');}},
    {g:'7 · Fasi sullo stesso ordine',data:'12/12/2026',titolo:'RF: metti a scaffale i 6 pallet di transenne',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','12/12/2026'],['Compiti','i 6 PUTAWAY di TR-STD']],
     attesa:'300 TR-STD a scaffale. Nessun’altra entrata contabile.',nota:rf,fatto:function(h){return fatti(compiti(h,'PUTAWAY',entrataDi(h,'TR-STD')),6);}},
    // ── 8 · un vero HALB a scorta, indipendente dal finito ──
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'CO01: ordine autonomo per 20 kit SL-TAGLIO',dove:{ep:P+'ordini'},percorso:'PP → Ordini di produzione',campi:[['Materiale','SL-TAGLIO'],['Quantità','20'],['Data','12/12/2026']],
     attesa:'Ordine 1000002, 160 kg ferro + 5 h Taglio: 292 euro pianificati. È produzione autonoma a stock, non una fase dell’ordine delle transenne.',fatto:function(h){var o=prod(h,'SL-TAGLIO');return !!o && o.qta===20;}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'WMS: approvvigiona il ferro dei 20 kit',dove:{ep:M+'compiti'},percorso:'WMS → Compiti → Approvvigionamento',campi:[['Ordine','1000002 SL-TAGLIO'],['Quantità','vuoto = 160 kg'],['Data','12/12/2026']],
     attesa:'Un STAGING per 160 kg COL-1204 da F-02 alla PSA-L1.',fatto:function(h){return compiti(h,'STAGING',diOrdine(h,'SL-TAGLIO')).length===1;}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'RF: porta alla linea il ferro dei kit',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data','12/12/2026'],['Compito','lo STAGING da 160 kg']],attesa:'PSA 160 kg; F-02 conserva 240 + 500 kg.',nota:rf,fatto:function(h){return fatti(compiti(h,'STAGING',diOrdine(h,'SL-TAGLIO')),1);}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'261: consuma 160 kg per il HALB',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Prelievo',campi:[['Ordine','1000002'],['Quantità','160'],['Data','12/12/2026']],attesa:'D 70 / A 12 152. In totale i due ordini consumano 2.560 kg; ferro finale 740 kg.',fatto:function(h){return evento(h,'SL-TAGLIO','261');}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'CO11N: conferma 5 ore del HALB',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Conferma',campi:[['Ordine','1000002'],['Fase','Taglio nel percorso CPM: anche l’ordine autonomo conserva la propria operazione nello snapshot. Il campo resta vuoto solo nel precedente ciclo aggregato senza CPM'],['Attrezzaggio','0'],['Ore','5'],['Data','12/12/2026']],attesa:'5 × 28 = 140: D 72 / A 75. Costo dell’ordine HALB 152 + 140 = 292.',fatto:function(h){return evento(h,'SL-TAGLIO','CO11N');}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'101: versa a magazzino i 20 kit autonomi',contabile:true,dove:{ep:P+'avanzamento'},percorso:'PP → Entrata del prodotto',campi:[['Ordine','1000002'],['Pezzi','vuoto = 20'],['Data','12/12/2026']],attesa:'D 07 Magazzino semilavorati / A 73 292. Un cassone da 20 in GR-ZONE, un solo PUTAWAY.',fatto:function(h){return evento(h,'SL-TAGLIO','101');}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'RF: metti a scaffale il cassone SL-TAGLIO',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF',campi:[['Data','12/12/2026'],['Compito','il PUTAWAY del cassone da 20']],attesa:'20 kit a scaffale, disponibili come vero stock HALB. Non sono WIP delle transenne.',nota:rf,fatto:function(h){return fatti(compiti(h,'PUTAWAY',entrataDi(h,'SL-TAGLIO')),1);}},
    {g:'8 · HALB autonomo a scorta',titolo:'Leggi la mappa delle ubicazioni',dove:{ep:M+'mappa'},percorso:'WMS → Mappa',campi:[['Ferro','F-02: 240 kg COL-1204 e 500 kg COL-1206'],['HALB','trova il cassone da 20 SL-TAGLIO; copia ubicazione e UdC dalla mappa']],nota:'Non inventare l’ubicazione iniziale: dipende dai posti già occupati dai finiti. Spunta a mano.'},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'Dove si trova? Cerca il ferro',dove:{ep:M+'mappa'},percorso:'WMS → Mappa delle ubicazioni → menu «🔎 Dove si trova?» in alto',
     campi:[['Articolo','FERRO'],['Guarda la mappa','la catasta F-02 ha il bordo arancione, il resto si sbiadisce'],['Leggi la tabella','due righe in F-02, una per colata, entrambe ✅ «LIBERA a scaffale»'],['Lotti','sotto la tabella: COL-1204 e COL-1206, dal più vecchio']],
     attesa:'740 kg liberi da prelevare = 740 nelle ubicazioni = 740 in contabilità: 240 kg COL-1204 e 500 kg COL-1206, tutti in F-02. 0 bloccati.',nota:'Lettura: spunta a mano. Puoi cercare anche SL-TAGLIO: trovi il cassone dei kit. Dalla pistola RF (Interroga) basta leggere il codice articolo.'},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'LT10: sposta il cassone da 20 in fondo al magazzino',dove:{ep:M+'compiti'},percorso:'WMS → Compiti → Trasferimento',campi:[['UdC','il cassone da 20 SL-TAGLIO appena messo a scaffale'],['Destinazione','03-05-2'],['Motivo','resti in fondo al magazzino'],['Data','12/12/2026']],attesa:'Un TRASF verso 03-05-2, nessuna scrittura contabile.',fatto:function(h){return compiti(h,'TRASF',function(t){return t.mat==='SL-TAGLIO';}).length>=1;}},
    {g:'8 · HALB autonomo a scorta',data:'12/12/2026',titolo:'RF: conferma lo spostamento del cassone',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF',campi:[['Data','12/12/2026'],['Compito','il TRASF del cassone']],attesa:'03-05-2 contiene 20 SL-TAGLIO.',nota:rf,fatto:function(h){return fatti(compiti(h,'TRASF',function(t){return t.mat==='SL-TAGLIO';}),1);}},
    {g:'8 · HALB autonomo a scorta',titolo:'Stampa le etichette del cassone e dell’ubicazione',dove:{ep:M+'etichette'},percorso:'WMS → Etichette barcode e QR',campi:[['Etichette','UdC del cassone e ubicazione 03-05-2'],['Stampa','🖨️ oppure salva in PDF']],nota:'Spunta a mano dopo aver controllato i codici.'},
    {g:'8 · HALB autonomo a scorta',titolo:'Controlla WIP e stock: due concetti distinti',dove:{ep:M+'monitor'},percorso:'WMS → Monitor; PP → Ordini; FI → Bilancio',campi:[['Ferro','740 kg → conto 12: 703'],['HALB autonomo','20 SL-TAGLIO → conto 07: 292'],['Finito','300 TR-STD → conto 13: 9.420'],['WIP transenne','zero dopo il solo 101 finale; nessuno stock SL-PIEGA'],['Quadratura','IM = WMS; aree interim vuote']],nota:'Le fasi non creano stock. Solo il HALB autonomo e il finito ricevono un proprio 101.'},
    // ── 8b · merce bloccata, interrogazione e slotting (13/12) ──
    {g:'8b · Pistola RF, quarantena e slotting',data:'13/12/2026',titolo:'RF Interroga: che cosa c’è in un’ubicazione?',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → scheda 🔎 Interroga',
     campi:[['Leggi','03-05-2 (premi Invio)'],['Poi leggi','l’UdC di un pallet di transenne, copiata dalla Mappa'],['Guarda','materiale, quantità, lotto e ubicazione del pallet']],
     attesa:'03-05-2 contiene il cassone da 20 SL-TAGLIO; il pallet letto mostra 50 TR-STD e la sua ubicazione. Interrogare non cambia nulla.',nota:'È il comando che il carrellista usa davanti allo scaffale quando un’etichetta non torna. Spunta a mano.'},
    {g:'8b · Pistola RF, quarantena e slotting',data:'13/12/2026',titolo:'Blocca un pallet di transenne urtato dal carrello',dove:{ep:M+'bloccato'},percorso:'WMS → Merce bloccata e danneggiata → Metti in quarantena',
     campi:[['Unità di carico','il primo pallet TR-STD dell’elenco'],['Quantità','lascia vuoto: tutto il pallet (50)'],['Motivo','pallet urtato dal carrello, da controllare'],['Data','13/12/2026'],['Pulsante','Metti in quarantena e crea il compito RF']],
     attesa:'Movimento 344: 50 TR-STD da liberi a bloccati, non più disponibili per le consegne. Nasce un compito BLOCCO verso Q-ZONE. Nessuna scrittura: la giacenza contabile resta 300.',
     nota:'Bloccare è diverso da rottamare: la merce resta nostra e nel bilancio, solo non si può vendere finché non la controlli.',fatto:function(h){return compiti(h,'BLOCCO',bloccoTR).length>=1;}},
    {g:'8b · Pistola RF, quarantena e slotting',data:'13/12/2026',titolo:'RF: porta il pallet in quarantena',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data','13/12/2026'],['Compito','il BLOCCO del pallet verso Q-ZONE']],
     attesa:'Il pallet è in Q-ZONE; lo scaffale che occupava è libero.',nota:rf,fatto:function(h){return fatti(compiti(h,'BLOCCO',bloccoTR),1);}},
    {g:'8b · Pistola RF, quarantena e slotting',data:'13/12/2026',titolo:'Controllo superato: sblocca il pallet (343)',dove:{ep:M+'bloccato'},percorso:'WMS → Merce bloccata e danneggiata → Decidi sulla merce in quarantena',
     campi:[['UdC in quarantena','il pallet TR-STD'],['Esito del controllo','imballo integro, transenne non danneggiate'],['Pulsante','Sblocca: è buona (343)'],['Data','13/12/2026']],
     attesa:'Movimento 343: i 50 TR-STD tornano liberi. Nasce un compito PUTAWAY da Q-ZONE verso uno scaffale libero. Nessuna scrittura.',fatto:function(h){return compiti(h,'PUTAWAY',rientroTR).length>=1;}},
    {g:'8b · Pistola RF, quarantena e slotting',data:'13/12/2026',titolo:'RF: rimetti a scaffale il pallet sbloccato',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data','13/12/2026'],['Compito','il PUTAWAY da Q-ZONE']],
     attesa:'Q-ZONE vuota; di nuovo 300 TR-STD disponibili a scaffale.',nota:rf,fatto:function(h){return fatti(compiti(h,'PUTAWAY',rientroTR),1);}},
    {g:'8b · Pistola RF, quarantena e slotting',data:'13/12/2026',titolo:'LT10: lavori al pavimento, sposta un pallet di transenne in fondo',dove:{ep:M+'compiti'},percorso:'WMS → Compiti → Trasferimento',
     campi:[['Unità di carico','il pallet TR-STD appena sbloccato'],['Destinazione','03-04-1'],['Motivo','lavori al pavimento davanti alla corsia 01'],['Data','13/12/2026']],
     attesa:'Un compito TRASF verso 03-04-1, in fondo al magazzino. Nessuna scrittura.',fatto:function(h){return compiti(h,'TRASF',function(t){return t.mat==='TR-STD' && t.a==='03-04-1';}).length>=1;}},
    {g:'8b · Pistola RF, quarantena e slotting',data:'13/12/2026',titolo:'RF: conferma lo spostamento in fondo',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data','13/12/2026'],['Compito','il TRASF verso 03-04-1']],
     attesa:'Il pallet è in 03-04-1, lontano dalla porta di spedizione.',nota:rf,fatto:function(h){return fatti(compiti(h,'TRASF',function(t){return t.mat==='TR-STD' && t.a==='03-04-1';}),1);}},
    {g:'8b · Pistola RF, quarantena e slotting',data:'13/12/2026',titolo:'Slotting: avvicina le transenne alla porta di spedizione',dove:{ep:Z+'slotting'},percorso:'WMS → Innovazione → Slotting',
     campi:[['Leggi','classe ABC per righe di prelievo e proposta: quali pallet, da dove, a dove, quanti metri risparmiati'],['Data','13/12/2026'],['Pulsante','Crea i compiti di trasferimento proposti']],
     attesa:'Finiti i lavori, la proposta riporta vicino alla porta il pallet di classe A rimasto in 03-04-1: un compito TRASF verso uno scaffale libero più vicino, con i metri risparmiati per ogni giro. Nessuna scrittura: cambia solo il posto.',
     nota:'Lo slotting si fa prima dei prelievi: i materiali che escono più spesso vanno vicino alla spedizione, così ogni giro è più corto.',fatto:function(h){return compiti(h,'TRASF',slot).length>=1;}},
    {g:'8b · Pistola RF, quarantena e slotting',data:'13/12/2026',titolo:'RF: conferma i trasferimenti dello slotting',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data','13/12/2026'],['Compiti','tutti i TRASF dello slotting']],
     attesa:'I pallet di transenne sono più vicini alla porta: guardalo sulla Mappa.',nota:rf,fatto:function(h){var t=compiti(h,'TRASF',slot);return t.length>=1 && fatti(t,t.length);}},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'Arretrato e scadenze: chi aspetta la merce?',dove:{ep:M+'arretrato'},percorso:'WMS → Arretrato e scadenze',
     campi:[['Data di oggi','14/12/2026'],['1 · Clienti','Beta 180 TR-STD e Delta 120 TR-STD: 🟠 «SCADE OGGI» (consegna richiesta il 14/12)'],['2, 3, 4','fornitori, produzione e compiti di magazzino: nessuna riga (ferro arrivato, ordini versati, compiti confermati)'],
       ['Prova','scrivi 15/12/2026: Beta e Delta diventano 🔴 IN RITARDO di 1 giorno. È quello che succederà: il camion parte domani. Poi rimetti 14/12/2026']],
     attesa:'Oggi nessuna riga rossa, due arancioni: le transenne vanno preparate subito. Partiranno il 15/12, un giorno dopo la data richiesta: in un’azienda vera si avvisano i clienti.',nota:'Lettura: spunta a mano. L’arretrato si guarda ogni mattina: prima le righe rosse, poi arancio e gialle.'},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'Attiva il prelievo a ondate',dove:{ep:Z+'ondate'},percorso:'WMS → Innovazione → Prelievo a ondate → Impostazioni',
     campi:[['Prelievo a ondate','sì: le consegne aspettano l’ondata'],['Cross-docking','no'],['Pulsante','Salva']],
     attesa:'Da adesso una consegna non crea subito i compiti: aspetta che il capo magazzino rilasci l’ondata.',fatto:function(h){return (h.S.wm || {}).ondate===true;}},
    // ── 9 · consegna ──
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'VL01N: consegna per Beta',dove:{ep:V+'consegne'},percorso:'SD → Consegne',campi:[['Ordine','10000001 Beta 180 TR-STD'],['Data','14/12/2026']],
     attesa:'Consegna 80000001 in attesa dell’ondata: ancora nessun compito di prelievo. Nessuna uscita merci e nessuna scrittura.',fatto:function(h){return !!consegna(h,'BETA-180');}},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'VL01N: consegna per Delta',dove:{ep:V+'consegne'},percorso:'SD → Consegne',campi:[['Ordine','10000002 Delta 120 TR-STD'],['Data','14/12/2026']],
     attesa:'Consegna 80000002 anche lei in attesa dell’ondata.',fatto:function(h){return !!consegna(h,'DELTA-120');}},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'Rilascia l’ondata ONDA-1',dove:{ep:Z+'ondate'},percorso:'WMS → Innovazione → Prelievo a ondate → Rilascia l’ondata',campi:[['Data','14/12/2026'],['Pulsante','Rilascia l’ondata (compiti in ordine di percorso)']],
     attesa:'ONDA-1: 2 consegne, 7 compiti PICK (Beta 50+50+50+30; Delta 20 dal pallet già toccato da Beta, poi 50+50) in un solo giro a serpentina. La pagina confronta i metri del giro unico con un giro per ordine.',
     fatto:function(h){return (((h.S.wm || {}).ondateRilasciate) || []).length>=1;}},
    {g:'9 · Consegna con picking',titolo:'Stampa la lista di prelievo',dove:{ep:X+'prelievo'},percorso:'WMS → Spedizione → Lista di prelievo',campi:[['Consegne','80000001 Beta e 80000002 Delta'],['Leggi','ubicazione, UdC e quantità di ogni riga, nell’ordine del percorso'],['Stampa','🖨️ (il carrellista la porta con sé)']],
     nota:'Spunta a mano. Con la lista o con la pistola il risultato è lo stesso: ogni riga è un compito PICK da confermare.'},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'RF: preleva i 7 pallet (FIFO)',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','14/12/2026'],['Compiti','i 7 PICK, nessuna differenza di quantità']],
     attesa:'300 TR-STD in GI-ZONE, scaffali vuoti di transenne. Giacenza contabile ancora 300: nessun costo del venduto finché la merce non parte.',nota:rf,
     fatto:function(h){var b=consegna(h,'BETA-180'),d=consegna(h,'DELTA-120');return !!b && !!d && fatti(compiti(h,'PICK',function(t){return t.consegna===b.numero || t.consegna===d.numero;}),7);}},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'Misure del pallet EUR e regola: quante transenne per collo',dove:{ep:X+'imballi'},percorso:'WMS → Spedizione → Imballi, regole e veicoli',
     campi:[['1 · Imballo EUR','120 × 80 × 15 cm, tara 25 kg, portata 1000 kg, impilabile sì, regge sopra 700 kg → Salva l’imballo'],['2 · Regola TR-STD','su pallet EUR: 50 pezzi, collo alto 125 cm → Salva la regola']],
     attesa:'Collo pieno di TR-STD: 50 × 12 kg + 25 kg di pallet = 625 kg. Nella tabella delle regole la riga TR-STD su pallet EUR ha «✏️ tu». Nessuna scrittura.',
     nota:'Senza misure non si progetta il carico: il camion si riempie per spazio (cm) e per peso (kg). La regola dice anche all’imballo quanti pezzi proporre.',fatto:function(h){var r=(h.S.sped||{}).regole||{};return !!r['TR-STD|EUR'];}},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'Imballa Beta in 4 colli SSCC',dove:{ep:X+'imballo'},percorso:'WMS → Imballo e etichette SSCC',campi:[['Consegna','80000001'],['Imballo','EUR'],['Pezzi per collo','50'],['Data','14/12/2026']],
     attesa:'4 colli (50+50+50+30) con SSCC univoci. Nessuna scrittura.',fatto:function(h){var c=consegna(h,'BETA-180');return !!c && ((h.S.sped || {}).colli || []).filter(function(x){return x.consegna===c.numero;}).length===4;}},
    {g:'9 · Consegna con picking',data:'14/12/2026',titolo:'Imballa Delta in 3 colli SSCC',dove:{ep:X+'imballo'},percorso:'WMS → Imballo e etichette SSCC',campi:[['Consegna','80000002'],['Imballo','EUR'],['Pezzi per collo','40'],['Data','14/12/2026']],
     attesa:'3 colli da 40.',fatto:function(h){var c=consegna(h,'DELTA-120');return !!c && ((h.S.sped || {}).colli || []).filter(function(x){return x.consegna===c.numero;}).length===3;}},
    {g:'9 · Consegna con picking',data:'15/12/2026',titolo:'Crea un trasporto per le due consegne',dove:{ep:X+'trasporti'},percorso:'WMS → Trasporti e carico → Crea il trasporto',campi:[['Consegne','80000001, 80000002'],['Vettore','V10 Trasporti Toscani'],['Targa fittizia','AA000AA'],['Autista fittizio','Mario Esempio'],['Data di carico','15/12/2026']],
     attesa:'Un camion, due clienti. Nessuna scrittura.',fatto:function(h){var b=consegna(h,'BETA-180');return !!b && ((h.S.sped || {}).trasporti || []).some(function(t){return t.consegne.indexOf(b.numero)>=0;});}},
    {g:'9 · Consegna con picking',data:'15/12/2026',titolo:'Piano di carico e camion 3D: quale camion per Beta e Delta?',dove:{ep:X+'piano'},percorso:'WMS → Spedizione → Piano di carico del camion',
     campi:[['Trasporto','quello appena creato (consegne Beta e Delta)'],['Prova il furgone','Veicolo «Furgone 3,5 t»: ci stanno 2 colli su 7, porta solo 1.200 kg; poi torna alla motrice'],['Scegli la motrice','Veicolo «Motrice 10 t», criterio «per fermate»'],
       ['Camion in 3D','premi «🧊 Camion in 3D», gira il camion con il mouse e guardalo «dalle porte»'],['Pulsante','Salva il piano sul trasporto']],
     attesa:'7 colli su 7 in 4 posti a terra (3 pile da due), 3.775 kg = 47% della portata. Delta scende per ultima: posti 1 e 2 vicino alla CABINA; Beta verso le PORTE nei posti 3 e 4. Nessuna scrittura.',nota:'Si carica dal posto 1 (cabina) verso le porte. Con la pistola RF → Carico ogni collo ti dice il suo posto; un collo che nel piano resta a terra viene rifiutato.',
     fatto:function(h){var t=((h.S.sped||{}).trasporti||[])[0];return !!(t&&t.piano&&t.piano.veicolo==='MOTRICE');}},
    {g:'9 · Consegna con picking',data:'15/12/2026',titolo:'RF Carico: carica i 4 colli di Beta con la pistola',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → scheda 🚛 Carico',campi:[['Data','15/12/2026'],['SSCC','leggi uno alla volta i 4 SSCC della consegna 80000001 (copiali da Imballo e SSCC) e premi Invio'],['Ripetizioni','4']],
     attesa:'4 colli di Beta caricati (✅). Un collo letto due volte viene rifiutato.',fatto:function(h){var c=colliDi(h,'BETA-180');return c.length===4 && c.every(function(x){return !!x.caricato;});}},
    {g:'9 · Consegna con picking',data:'15/12/2026',titolo:'Varco RFID: carica i 3 colli di Delta in un passaggio',dove:{ep:Z+'rfid'},percorso:'WMS → Innovazione → Varco RFID',campi:[['Trasporto','quello appena creato'],['Data','15/12/2026'],['Pulsante','Fai passare il carrello dal varco']],
     attesa:'3 tag letti in un solo passaggio, senza girare i pallet: 7/7 colli caricati. La pagina mostra il codice EPC derivato da ogni SSCC.',fatto:function(h){var t=trasp(h),c=((h.S.sped || {}).colli || []);return !!t && (t.rfid || 0)>=3 && c.length>=7 && c.every(function(x){return !!x.caricato;});}},
    {g:'9 · Consegna con picking',data:'15/12/2026',titolo:'Partenza: uscita merci 601 e DDT',contabile:true,dove:{ep:X+'trasporti'},percorso:'WMS → Trasporti e carico → Fine carico e uscita merci',campi:[['Trasporto','quello appena creato'],['Data di partenza','15/12/2026']],
     attesa:'Due scritture: D 41 Costo del venduto / A 13 Prodotti finiti 5.652 (Beta, 180 × 31,40) e 3.768 (Delta, 120 × 31,40). Nascono i DDT. Transenne a magazzino: 0.',
     fatto:function(h){var b=consegna(h,'BETA-180'),d=consegna(h,'DELTA-120');return !!b && !!d && b.pgi==='2026-12-15' && d.pgi==='2026-12-15';}},
    {g:'9 · Consegna con picking',titolo:'VL06O: controlla il monitor della spedizione',dove:{ep:X+'monitor'},percorso:'WMS → Spedizione → Monitor delle consegne',campi:[['Consegne','80000001 e 80000002'],['Leggi','prelievo completato, colli, trasporto, uscita merci 15/12']],nota:'Il monitor è la schermata del capo spedizioni: si vede subito se una consegna è ferma. Spunta a mano.'},
    {g:'9 · Consegna con picking',titolo:'Stampa i DDT delle due consegne',dove:{ep:X+'ddt'},percorso:'WMS → Spedizione → DDT',campi:[['DDT','uno per consegna: mittente, destinatario, vettore, colli e SSCC'],['Stampa','🖨️ oppure salva in PDF']],nota:'Il DDT accompagna la merce sul camion. Spunta a mano.'},
    {g:'9 · Consegna con picking',titolo:'Reclamo simulato: da quale ferro vengono le transenne di Beta?',dove:{ep:M+'lotti'},percorso:'WMS → Lotti, numeri di serie e tracciabilità → Reclamo di un cliente',
     campi:[['Consegna','80000001 Beta'],['Risali','TR-STD lotto L1000001 → ferro colata COL-1204, Acciaierie Umbre (direttamente dal 261 dell’ordine 1000001)'],['Poi a valle','premi «Traccia» sulla colata COL-1204: arriva a Beta e a Delta']],
     nota:'Se la colata fosse difettosa, sapremmo subito quali clienti avvisare. La colata COL-1206 non è nelle transenne: è ancora in catasta. Spunta a mano.'},
    // ── 10 · fatture e banca ──
    {g:'10 · Fatture e anticipo',data:'15/12/2026',titolo:'VF01: fattura Beta',contabile:true,dove:{ep:V+'fatture'},percorso:'SD → Fatturazione',campi:[['Consegna','80000001'],['Data','15/12/2026']],
      punti:PVF('BETA-180','80000001','Beta Costruzioni'),
     attesa:'D 11 Beta 12.912,48 + D 47 Sconti 216 / A 40 Ricavi 10.800 + A 21 IVA 2.328,48. Provvigione all’agente 3%: D 57 / A 26 317,52.',fatto:function(h){return !!fattura(h,'BETA-180');}},
    {g:'10 · Fatture e anticipo',data:'15/12/2026',titolo:'VF01: fattura Delta',contabile:true,dove:{ep:V+'fatture'},percorso:'SD → Fatturazione',campi:[['Consegna','80000002'],['Data','15/12/2026']],
      punti:PVF('DELTA-120','80000002','Delta Noleggi'),
     attesa:'D 11 Delta 8.608,32 + D 47 144 / A 40 7.200 + A 21 1.552,32. Provvigione D 57 / A 26 211,68.',fatto:function(h){return !!fattura(h,'DELTA-120');}},
    {g:'10 · Fatture e anticipo',data:'15/12/2026',titolo:'Trasmetti le due fatture allo SdI',dove:{ep:F+'sdi'},percorso:'FI → Fattura elettronica (SdI)',campi:[['Documento','prima la fattura Beta, poi quella Delta'],['Data di invio','15/12/2026']],
      punti:[
        {t:'leggi',sel:'#sd-fattura',nome:'Documento da trasmettere: Beta prima, Delta poi',serve:'Apri il menu «Documento di vendita» e scegli la fattura di Beta. Dopo la trasmissione, ripeti sulla fattura di Delta; i numeri documento sono quelli emessi realmente da VF01.'},
        {t:'campo',sel:'#sd-data',nome:'Data di invio',valore:'2026-12-15',serve:'Imposta 15/12/2026 per la trasmissione di ciascuna delle due fatture.'},
        {t:'pulsante',sel:'[data-prefisso="sd"] [data-azione="sd"]',nome:'Invia allo SdI',serve:'Controlla che il documento selezionato sia di Beta, premi «Invia allo SdI», poi seleziona Delta e ripeti. Il controllo finale richiede due ricevute, non soltanto un clic.',fatto:function(h){var b=fattura(h,'BETA-180'),d=fattura(h,'DELTA-120');return !!b&&!!d&&!!b.sdi&&!!d.sdi;},finale:true}
      ],
     attesa:'Due ricevute di consegna. Da ora una fattura sbagliata non si storna più: serve la nota di credito.',fatto:function(h){var b=fattura(h,'BETA-180'),d=fattura(h,'DELTA-120');return !!b && !!d && !!b.sdi && !!d.sdi;}},
    {g:'10 · Fatture e anticipo',data:'16/12/2026',titolo:'Anticipo su fattura: la banca anticipa l’80% di Beta',contabile:true,dove:{ep:T+'anticipi'},percorso:'Tesoreria → Anticipo su fatture',campi:[['Fattura','quella di Beta (12.912,48, scade il 14/01/2027)'],['Percentuale','80'],['Commissione','30'],['Data','16/12/2026']],
      punti:[
        {t:'leggi',sel:'#an-fattura',nome:'Fattura del cliente Beta',serve:'Nel menu scegli la fattura di Beta emessa il 15/12, totale 12.912,48 €. Questo anticipo riguarda Beta, non Delta.'},
        {t:'campo',sel:'#an-percentuale',nome:'Percentuale anticipata',valore:'80',serve:'L’80% della fattura diventa un finanziamento a breve termine; non è un incasso definitivo del cliente.'},
        {t:'campo',sel:'#an-commissione',nome:'Commissione',valore:'30',serve:'La banca trattiene 30 € di commissione: l’accredito netto sarà inferiore all’anticipo lordo.'},
        {t:'campo',sel:'#an-data',nome:'Data accredito',valore:'2026-12-16',serve:'Registra il finanziamento alla data effettiva del 16 dicembre 2026.'},
        {t:'pulsante',sel:'[data-prefisso="an"] [data-azione="an"]',nome:'Registra l’anticipo',serve:'Verifica cliente, fattura, percentuale, commissione e data. Premi una sola volta; il tutor controlla che l’anticipo sia registrato.',fatto:function(h){return (((h.S.tes||{}).anticipi)||[]).some(function(x){return x.data==='2026-12-16';});},finale:true}
      ],
     attesa:'Anticipo 10.329,98: D 10 Banca 10.299,98 + D 58 Commissione 30 / A 38 Banca c/anticipi su fatture 10.329,98. Il credito verso Beta resta aperto: la fattura è la garanzia del prestito.',
     fatto:function(h){return (((h.S.tes || {}).anticipi) || []).some(function(x){return x.data==='2026-12-16';});}},
    {g:'10 · Fatture e anticipo',data:'17/12/2026',titolo:'F-53: paga il ferro',contabile:true,dove:{ep:F+'passive'},percorso:'FI → Fatture passive e pagamenti → Pagamento a un fornitore',campi:[['Fornitore','F100 Acciaierie Umbre'],['Importo','vuoto = 4.318,80 (le due fatture del ferro)'],['Data','17/12/2026']],
     punti:PPAGA('F100','Acciaierie Umbre','','2026-12-17',function(h){return paga(h,'F100','2026-12-17');},'Lascialo vuoto: paga le due fatture del ferro, 4.318,80 in tutto.'),attesa:'D 20 / A 10 4.318,80 (3.660 + 658,80). Si paga prima della scadenza (60 giorni) grazie all’anticipo.',fatto:function(h){return paga(h,'F100','2026-12-17');}},
    {g:'10 · Fatture e anticipo',data:'18/12/2026',titolo:'F-53: paga i macchinari',contabile:true,dove:{ep:F+'passive'},percorso:'FI → Fatture passive e pagamenti → Pagamento a un fornitore',campi:[['Fornitore','F300 Macchine Alfa'],['Importo','vuoto = 52.460'],['Data','18/12/2026']],
     punti:PPAGA('F300','Macchine Alfa','','2026-12-18',function(h){return paga(h,'F300','2026-12-18');},'Lascialo vuoto: paga tutto il debito verso Macchine Alfa, 52.460.'),attesa:'D 20 / A 10 52.460. Debiti verso fornitori a zero; banca 32.321,18.',fatto:function(h){return paga(h,'F300','2026-12-18');}},
    // ── 10 · finanza: mutuo, professionista con ritenuta, cambiale ──
    {g:'10 · Finanza: mutuo, ritenuta, cambiale',data:'18/12/2026',titolo:'Mutuo: la banca presta 30.000 € per le macchine',contabile:true,dove:{ep:W+'mutui'},percorso:'Tesoreria e finanza → Mutui e rate → Chiedi un mutuo',
     campi:[['Banca','Banca Popolare dell’Umbria'],['Importo','30000'],['Tasso annuo %','4,8'],['Numero di rate','24'],['Rate','mensili'],['Prima rata','vuoto = 18/01/2027'],['Spese di istruttoria','200'],['Data','18/12/2026'],['Prima','«Calcola il piano» per vedere la rata (1.313,46) senza registrare nulla']],
     attesa:'D 10 Banca / A 37.10 Mutui passivi 30.000 · D 58 Spese / A 10 200. La banca risale a 62.121,18. Il mutuo NON è un ricavo: è un debito da restituire in 24 rate da 1.313,46.',
     nota:'Le macchine si usano per anni: si finanziano con un debito a medio termine, non con il conto corrente. Così l’anticipo su fatture resta per il circolante.',fatto:function(h){return !!mutuo(h);}},
    {g:'10 · Finanza: mutuo, ritenuta, cambiale',titolo:'Leggi il piano di ammortamento del mutuo',dove:{ep:W+'mutui'},percorso:'Tesoreria e finanza → Mutui e rate → Piano del mutuo',
     campi:[['Rata 1 (18/01/2027)','1.313,46 = capitale 1.193,46 + interessi 120 (30.000 × 4,8% / 12)'],['Rata 24 (18/12/2028)','quasi tutta capitale'],['Al 31/12/2026','debito 30.000: entro 12 mesi la parte delle rate 1–12, oltre 12 mesi il resto (bilancio, voce D4)']],
     nota:'Ammortamento francese: la rata è sempre uguale, cambia la composizione. Solo gli interessi sono un costo. Spunta a mano.'},
    {g:'10 · Finanza: mutuo, ritenuta, cambiale',data:'19/12/2026',titolo:'Parcella del commercialista con ritenuta d’acconto',contabile:true,dove:{ep:W+'ritenute'},percorso:'Tesoreria e finanza → Ritenute d’acconto → Registra la parcella',
     campi:[['Professionista','F800 Studio Rossi Commercialisti Associati'],['Numero','FT 45/2026'],['Prestazione','assistenza alla costituzione della società'],['Onorario','1000'],['Cassa previdenza %','4'],['IVA %','22'],['Ritenuta %','20'],['Data','19/12/2026']],
     attesa:'Onorario 1.000 + cassa 40 = 1.040 di costo (D 54) + IVA 22% su 1.040 = 228,80 (D 14) / A 20 Studio Rossi 1.268,80. La ritenuta non si scrive adesso: si trattiene al pagamento.',fatto:function(h){return !!parcella(h);}},
    {g:'10 · Finanza: mutuo, ritenuta, cambiale',data:'20/12/2026',titolo:'FB70: noleggio di transenne a Edil Sigma',contabile:true,dove:{ep:F+'fatture'},percorso:'FI → Fatture di servizi',
     campi:[['Cliente','C400 Edil Sigma'],['Descrizione','noleggio transenne per cantiere'],['Imponibile','1000'],['IVA %','22'],['Scadenza','20/02/2027'],['Data','20/12/2026']],
     attesa:'D 11 Edil Sigma 1.220 / A 44 Ricavi per servizi 1.000 + A 21 IVA 220.',nota:'Edil Sigma ha rischio C: prima di concedere 60 giorni chiediamo una cambiale, che è un titolo esecutivo.',fatto:function(h){return !!noleggio(h);}},
    {g:'10 · Finanza: mutuo, ritenuta, cambiale',data:'20/12/2026',titolo:'Edil Sigma accetta una cambiale tratta',contabile:true,dove:{ep:W+'cambiali'},percorso:'Tesoreria e finanza → Cambiali e bolli → Il cliente paga con una cambiale',
     campi:[['Fattura','quella del noleggio a Edil Sigma (1.220)'],['Tipo','tratta: la emettiamo noi, il cliente la accetta'],['Scadenza','20/02/2027'],['Importo','vuoto = tutta la fattura'],['Data','20/12/2026']],
     attesa:'D 11.10 Cambiali attive / A 11 Edil Sigma 1.220: la fattura si chiude, il credito cambia forma. Bollo 12‰ della tratta a nostro carico: D 87 Imposta di bollo / A 10 14,64.',fatto:function(h){return !!tratta(h);}},
    // ── 11 · sopravvenienza ──
    {g:'11 · Sopravvenienza',data:'21/12/2026',titolo:'L’assicurazione riconosce un indennizzo',contabile:true,dove:{ep:F+'sopravvenienze'},percorso:'FI → Sopravvenienze attive',
     campi:[['Compagnia','F400 Assicurazioni Omega'],['Riferimento','LIQ-4471'],['Evento','indennizzo per il sinistro del 10/12'],['Importo','500'],['Data','21/12/2026']],
     attesa:'D 09 Crediti verso compagnie di assicurazione / A 84 Sopravvenienze attive 500. Fuori campo IVA: nessuna fattura.',
     nota:'È un provento che non nasce dalla gestione caratteristica e non era previsto: per questo è una sopravvenienza attiva (nel bilancio, «altri ricavi e proventi» A5).',fatto:function(h){return (h.S.sopravvenienze || []).some(function(x){return x.rif==='LIQ-4471';});}},
    {g:'11 · Sopravvenienza',data:'21/12/2026',titolo:'Paga il commercialista con un assegno: trattieni la ritenuta',contabile:true,dove:{ep:W+'ritenute'},percorso:'Tesoreria e finanza → Ritenute d’acconto → Paga la parcella al netto',
     campi:[['Parcella','FT 45/2026'],['Mezzo','assegno bancario'],['Numero dell’assegno','AB-1234567'],['Data','21/12/2026']],
     attesa:'D 20 Studio Rossi 1.268,80 / A 29.10 Erario c/ritenute 200 (20% del solo onorario) / A 18.10 Assegni emessi in circolazione 1.068,80. La banca non scende ancora: l’assegno sarà addebitato quando il commercialista lo versa.',
     nota:'L’azienda è sostituto d’imposta: trattiene 200 € di IRPEF del professionista e li verserà allo Stato con l’F24 (codice 1040) entro il 16 gennaio.',fatto:function(h){var p=parcella(h);return !!p && !!p.pagata;}},
    {g:'11 · Sopravvenienza',data:'28/12/2026',titolo:'Incassa l’indennizzo',contabile:true,dove:{ep:F+'sopravvenienze'},percorso:'FI → Sopravvenienze attive → Incasso dell’indennizzo',campi:[['Indennizzo','LIQ-4471'],['Data','28/12/2026']],
     attesa:'D 10 / A 09 500. Il ricavo era già nel conto 84: l’incasso non lo raddoppia.',fatto:function(h){return (h.S.sopravvenienze || []).some(function(x){return x.rif==='LIQ-4471' && x.incassato;});}},
    // ── 12 · cessioni ──
    {g:'12 · Rivendita dei macchinari',data:'22/12/2026',titolo:'Vendi il carrello elevatore: minusvalenza',contabile:true,dove:{ep:K+'cessione'},percorso:'FI → Cespiti → Cessione di un cespite',campi:[['Cespite','CE-0004 Carrello elevatore elettrico'],['Acquirente','C600 Usato Epsilon'],['Prezzo','10500'],['IVA %','22'],['Data','22/12/2026']],
     attesa:'Prima la quota di dicembre: 12.000 × 20% × 1/12 = 200 (D 50 / A 04). Poi la vendita: D 11 12.810 + D 04 200 + D 46 Minusvalenza 1.300 / A 03 12.000 + A 21 2.310. Valore netto 11.800 > prezzo 10.500.',
     fatto:function(h){var c=cesp(h,'Carrello elevatore elettrico');return !!c && !!c.cessione && !!c.cessione.contabile;}},
    {g:'12 · Rivendita dei macchinari',data:'22/12/2026',titolo:'Vendi la sega circolare: plusvalenza',contabile:true,dove:{ep:K+'cessione'},percorso:'FI → Cespiti → Cessione di un cespite',campi:[['Cespite','CE-0005 Sega circolare'],['Acquirente','C600'],['Prezzo','2800'],['IVA %','22'],['Data','22/12/2026']],
     attesa:'Quota di dicembre 2.000 × 10% × 1/12 = 16,67 (D 50 / A 02). Vendita: D 11 3.416 + D 02 16,67 / A 01 2.000 + A 21 616 + A 45 Plusvalenza 816,67. Prezzo 2.800 > valore netto 1.983,33.',
     fatto:function(h){var c=cesp(h,'Sega circolare');return !!c && !!c.cessione && !!c.cessione.contabile;}},
    {g:'12 · Leasing e assegno',data:'23/12/2026',titolo:'Leasing: il nuovo carrello elevatore a batteria',contabile:true,dove:{ep:W+'leasing'},percorso:'Tesoreria e finanza → Leasing e canoni → Firma il contratto',
     campi:[['Società','F810 Leasing Umbria'],['Bene','Carrello elevatore a batteria (nuovo)'],['Valore','18000'],['Maxicanone','1800'],['Canone mensile','480'],['Numero di canoni','35'],['Riscatto','180'],['Durata','36 mesi'],['IVA %','22'],['Classe al riscatto','Mezzi di movimentazione'],['Data','23/12/2026']],
     attesa:'D 88 Canoni di leasing 1.800 + D 14 IVA 396 / A 10 2.196 (addebito SDD). Il carrello NON entra tra i cespiti: lo si usa, ma è della società di leasing fino al riscatto.',
     nota:'Abbiamo venduto il carrello usato (minusvalenza) e ne prendiamo uno nuovo senza immobilizzare 18.000 €: il leasing è un modo di finanziare un bene.',fatto:function(h){return !!leasing(h);}},
    {g:'12 · Leasing e assegno',data:'23/12/2026',titolo:'La banca addebita l’assegno del commercialista',contabile:true,dove:{ep:W+'assegni'},percorso:'Tesoreria e finanza → Assegni → La banca addebita l’assegno',
     campi:[['Assegno','AB-1234567 Studio Rossi 1.068,80'],['Data','23/12/2026']],
     attesa:'D 18.10 Assegni emessi in circolazione / A 10 Banca 1.068,80. Ora l’estratto conto e la contabilità tornano uguali.',fatto:function(h){var a=assegnoComm(h);return !!a && a.stato==='addebitato';}},
    {g:'12 · Leasing e assegno',data:'28/12/2026',titolo:'Sconta in banca la cambiale di Edil Sigma',contabile:true,dove:{ep:W+'cambiali'},percorso:'Tesoreria e finanza → Cambiali e bolli → Sconto in banca',
     campi:[['Cambiale','CA-001 Edil Sigma 1.220, scade il 20/02/2027'],['Tasso di sconto','6'],['Commissione','3'],['Data','28/12/2026']],
     attesa:'Interessi 1.220 × 6% × 54/365 = 10,83. D 10 1.206,17 + D 60 Interessi 10,83 + D 58 Commissione 3 / A 11.10 Cambiali attive 1.220. Se Edil Sigma non pagherà, la banca ci riaddebiterà la cambiale.',fatto:function(h){var c=tratta(h);return !!c && c.stato==='scontata';}},
    {g:'12 · Rivendita dei macchinari',data:'29/12/2026',titolo:'F-28: incassa le due cessioni',contabile:true,dove:{ep:V+'incassi'},percorso:'SD → Incassi e partite',campi:[['Cliente','C600 Usato Epsilon'],['Importo','16226'],['Riferimento','CESSIONI CARRELLO E SEGA'],['Data valuta','29/12/2026']],
     attesa:'D 10 / A 11 16.226 (12.810 + 3.416).',fatto:function(h){return reg(h,'INCASSO','2026-12-29');}},
    {g:'12 · Rivendita dei macchinari',data:'30/12/2026',titolo:'F-28: Delta paga in anticipo',contabile:true,dove:{ep:V+'incassi'},percorso:'SD → Incassi e partite',campi:[['Cliente','C200 Delta Noleggi'],['Importo','8608,32'],['Riferimento','SALDO FATTURA DELTA'],['Data valuta','30/12/2026']],
     attesa:'D 10 / A 11 8.608,32. Resta aperto solo il credito verso Beta (anticipato dalla banca).',nota:'Per i centesimi usa la virgola.',fatto:function(h){return reg(h,'INCASSO','2026-12-30');}},
    // ── 13 · stipendi ──
    {g:'13 · Stipendi',data:'31/12/2026',titolo:'Calcola le paghe di dicembre',dove:{ep:Y+'cedolino'},percorso:'Paghe → Presenze e cedolino → Calcolo',campi:[['Periodo','2026-12']],
     attesa:'3 cedolini (assunti il 01/12: un solo mese). Con la tredicesima di 1/12 e il conguaglio IRPEF: netti 5.865,08; costo per l’azienda 10.426,96. Nessuna addizionale trattenuta a dicembre. Nessuna scrittura.',
     nota:'Leggi un cedolino: la 13ª matura per i mesi lavorati, le detrazioni per lavoro dipendente si rapportano al periodo di lavoro. Leggi anche il riquadro delle addizionali: la regionale della Toscana (1,42% fino a 15.000 €) e la comunale di Firenze (0,20%, esente fino a 25.000 €) del 2026 si calcolano al conguaglio sull’imponibile dell’anno, ma si trattengono nel 2027 in 11 rate da gennaio a novembre. Assunti a dicembre, in busta non c’è nessuna rata: regionale 27,25 + 29,20 + 33,74 = 90,19 € da trattenere nel 2027, comunale zero (sotto i 25.000 €).',fatto:function(h){return ((h.S.hr || {}).cedolini || []).some(function(c){return c.periodo==='2026-12';});}},
    {g:'13 · Stipendi',data:'31/12/2026',titolo:'Registra le paghe in contabilità',contabile:true,dove:{ep:Y+'contabilita'},percorso:'Paghe → Registrazione, stipendi e F24',campi:[['Periodo','2026-12'],['Data','31/12/2026']],
     attesa:'D 80 Salari 7.529,17 + D 81 Oneri sociali 2.340,07 + D 82 TFR 557,72 / A 27 Netti 5.865,08 + A 28 INPS 2.956,71 + A 24 INAIL 112,94 + A 29 Ritenute 972,16 + A 31 Fondo TFR 520,07.',
     dopo:'Nel giornale il programma scrive una riga per dipendente, con il centro di costo: 80, 81 e 82 compaiono tre volte (es. Salari 2.275,00 + 2.437,50 + 2.816,67 = 7.529,17). La somma per conto è quella qui sopra. Nel laboratorio di ragioneria puoi ricostruirla riga per riga oppure con un’unica riga per conto.',
     fatto:function(h){return reg(h,'PAGHE','2026-12-31');}},
    {g:'13 · Stipendi',data:'31/12/2026',titolo:'Paga gli stipendi',contabile:true,dove:{ep:Y+'contabilita'},percorso:'Paghe → Registrazione, stipendi e F24 → Pagamento dei netti',campi:[['Periodo','2026-12'],['Data','31/12/2026']],
     attesa:'D 27 / A 10 5.865,08. Ritenute e contributi si versano con l’F24 a gennaio: a fine anno sono debiti. Le addizionali 2026 no: non sono ancora state trattenute, quindi al 31/12 non sono un debito dell’azienda.',fatto:function(h){return reg(h,'PAGAMENTO_STIPENDI','2026-12-31');}},
    // ── 14 · assestamenti ──
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'Risconto attivo sull’assicurazione',contabile:true,dove:{ep:H+'assestamenti'},percorso:'FI → IVA, imposte, chiusura → Ratei e risconti',
     campi:[['Tipo','Risconto attivo'],['Conto','83 Assicurazioni'],['Descrizione','polizza POL-2026-118'],['Importo','1200'],['Periodo','dal 01/12/2026 al 30/11/2027'],['Data','31/12/2026'],['Prima','«Calcola la quota» per vedere il conto']],
     attesa:'1.200 × 334 / 365 giorni = 1.098,08 di competenza del 2027: D 06 Risconti attivi / A 83 Assicurazioni 1.098,08. Nel 2026 resta un costo di 101,92 (31 giorni).',fatto:function(h){return !!ass(h,'risconto-attivo','83');}},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'Rateo passivo sul fitto del capannone',contabile:true,dove:{ep:H+'assestamenti'},percorso:'FI → IVA, imposte, chiusura → Ratei e risconti',
     campi:[['Tipo','Rateo passivo'],['Conto','86 Fitti passivi'],['Descrizione','fitto capannone, trimestre posticipato'],['Importo','3000'],['Periodo','dal 01/12/2026 al 28/02/2027'],['Data','31/12/2026']],
     attesa:'Il fitto del trimestre dicembre–febbraio si paga a fine febbraio, ma dicembre è del 2026: 3.000 × 31 / 90 = 1.033,33. D 86 Fitti passivi / A 39 Ratei passivi.',fatto:function(h){return !!ass(h,'rateo-passivo','86');}},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'Rateo passivo sugli interessi del mutuo',contabile:true,dove:{ep:W+'mutui'},percorso:'Tesoreria e finanza → Mutui e rate → Registra il rateo di interessi',
     campi:[['Mutuo','MU-001'],['Data di bilancio','31/12/2026']],
     attesa:'La prima rata (18/01/2027) paga 120 € di interessi per il periodo 18/12/2026 – 17/01/2027 (31 giorni); 14 giorni sono del 2026: 120 × 14 / 31 = 54,19. D 74 Interessi passivi su mutui / A 39 Ratei passivi 54,19.',fatto:function(h){return !!ass(h,'rateo-passivo','74');}},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'Risconto attivo sul maxicanone del leasing',contabile:true,dove:{ep:W+'leasing'},percorso:'Tesoreria e finanza → Leasing e canoni → Risconta il maxicanone',
     campi:[['Contratto','LS-001 carrello'],['Data di bilancio','31/12/2026']],
     attesa:'Il maxicanone paga in anticipo tutto il contratto (23/12/2026 – 22/12/2029, 1.096 giorni): 1.800 × 1.087 / 1.096 = 1.785,22 di competenza futura. D 06 Risconti attivi / A 88 Canoni di leasing 1.785,22. Nel 2026 restano 14,78 (9 giorni).',fatto:function(h){return !!ass(h,'risconto-attivo','88');}},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'Svalutazione crediti: lo 0,5% dei crediti verso clienti',contabile:true,dove:{ep:W+'crediti'},percorso:'Tesoreria e finanza → Crediti dubbi e perdite → Accantona',
     campi:[['Importo','vuoto = il limite fiscale'],['Data','31/12/2026']],
     attesa:'Crediti al 31/12: solo Beta 12.912,48 (la cambiale di Edil Sigma è scontata, Delta e Usato Epsilon hanno pagato). 0,5% = 64,56: D 89 Svalutazione crediti / A 11.90 Fondo svalutazione crediti 64,56. Deducibile IRES, non deducibile IRAP.',
     fatto:function(h){return (FIN(h).svalutazioni || []).some(function(s){return s.anno==='2026';});}},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'Imposta di bollo del 4° trimestre',dove:{ep:W+'bolli'},percorso:'Tesoreria e finanza → Imposta di bollo',
     campi:[['Trimestre','2026-T4'],['Fatture senza IVA oltre 77,47 €','nessuna: tutte le nostre fatture hanno l’IVA'],['Cambiali','tratta CA-001: bollo 14,64 già pagato con la marca']],
     nota:'Se avessimo fatture esenti o export, ognuna pagherebbe 2 € con l’F24 (codice 2524 entro il 28/02/2027). Spunta a mano.'},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'AFAB: ammortamenti di dicembre',contabile:true,dove:{ep:K+'ammortamenti'},percorso:'FI → Cespiti → Ammortamenti',campi:[['Data di registrazione','31/12/2026']],
     attesa:'Una mensilità per le tre macchine rimaste: taglierina 15.000 × 10% / 12 = 125 · piegatubi 66,67 · saldatrice 50 = 241,67 (D 50 / A 02). Carrello e sega sono già ammortizzati fino alla cessione.',
     nota:'Il fisco ammette nel primo anno metà del coefficiente: 750, 400, 300. La quota di bilancio è più bassa: nessuna variazione fiscale.',dopo:'Nel giornale il programma scrive una coppia di righe per cespite (D 50 125 / A 02 125, poi 66,67 e 50); nel laboratorio di ragioneria puoi ricostruirla così oppure con un’unica riga D 50 241,67 / A 02 241,67. Se trovi 20% invece di 10% hai scritto un’aliquota diversa all’acquisto.',fatto:function(h){var c=cesp(h,'Taglierina a nastro');return !!c && c.ammortamenti.some(function(a){return a.data==='2026-12-31';});}},
    {g:'14 · Inventario di fine anno',titolo:'Classificazione ABC dei materiali',dove:{ep:I+'abc'},percorso:'WMS → Inventari → Classificazione ABC',campi:[['Criterio','valore dei consumi e delle vendite di dicembre a costo standard'],['Risultato','TR-STD in classe A; leggi la classe dei semilavorati e del ferro e quante conte l’anno prevede']],
     nota:'Si contano più spesso i materiali di classe A. Spunta a mano.'},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'LI01N: documento d’inventario delle ubicazioni occupate',dove:{ep:I+'documenti'},percorso:'WMS → Inventari → Documenti d’inventario → Crea',
     campi:[['Tipo','Inventario per ubicazioni scelte'],['Ubicazioni','F-02, 03-05-2 (le due occupate: controllale sulla mappa)'],['Tolleranza','10'],['Data','31/12/2026']],
     attesa:'Documento con 3 posizioni: F-02 due fasci (colate COL-1204 e COL-1206), 03-05-2 un cassone SL-TAGLIO. Nessuna scrittura.',fatto:function(h){return !!inv(h);}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'Attiva l’inventario e stampa la lista di conta',dove:{ep:I+'documenti'},percorso:'WMS → Inventari → Documenti → Attiva; poi Lista di conta da stampare',campi:[['Data di riferimento','31/12/2026'],['Lista','conta cieca: le quantità a sistema non si vedono']],
     attesa:'Le due ubicazioni sono bloccate: niente prelievi né messe a posto finché non si chiude.',fatto:function(h){var d=inv(h);return !!d && d.stato!=='creato';}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'RF Inventario: conta la catasta F-02 con la pistola',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → scheda 📝 Inventario',
     campi:[['Leggi l’ubicazione','F-02 (Invio)'],['Colata COL-1204','240'],['Colata COL-1206','500'],['Pulsante','Registra la conta']],
     attesa:'Conta cieca salvata per F-02: manca ancora 03-05-2.',fatto:function(h){var d=inv(h);return !!d && d.righe.filter(function(r){return r.ubic==='F-02';}).every(function(r){return r.conta1!==null;});}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'LI11N: registra alla scrivania la conta del cassone (manca un kit)',dove:{ep:I+'documenti'},percorso:'WMS → Inventari → Documenti → Registra la conta',
     campi:[['03-05-2 SL-TAGLIO','19 (ne trovi uno in meno)'],['F-02','già contata con la pistola: lascia com’è'],['Contato da','il tuo nome']],
     attesa:'Differenza −1 SL-TAGLIO × 14,60 = 14,60 €: supera la tolleranza di 10, quindi il documento chiede una riconta (stato «riconta»).',fatto:function(h){var d=inv(h);return !!d && ['riconta','contato','chiuso'].indexOf(d.stato)>=0;}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'LI14: riconta il cassone',dove:{ep:I+'documenti'},percorso:'WMS → Inventari → Documenti → Registra la riconta',
     campi:[['03-05-2 SL-TAGLIO','19 (il secondo conteggio conferma il primo)']],
     attesa:'Riconta registrata: stato «contato». La differenza è confermata da due conteggi.',nota:'In azienda la riconta la fa un’altra persona: un errore di conta non deve diventare una scrittura.',fatto:function(h){var d=inv(h);return !!d && ['contato','chiuso'].indexOf(d.stato)>=0 && d.righe.some(function(r){return r.conta2!==null;});}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'LI20: chiudi l’inventario nel WMS',dove:{ep:I+'documenti'},percorso:'WMS → Inventari → Documenti → Chiudi nel WMS',campi:[['Data','31/12/2026']],
     attesa:'03-05-2 ora riporta 19 pezzi; il pezzo mancante va nella zona differenze 999. Ubicazioni sbloccate. Ancora nessuna scrittura.',fatto:function(h){var d=inv(h);return !!d && d.stato==='chiuso';}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'LI21: registra la differenza in contabilità',contabile:true,dove:{ep:I+'differenze'},percorso:'WMS → Inventari → Differenze inventariali → Registra',campi:[['Data','31/12/2026']],
     attesa:'Movimento 711: D 65 Differenze inventariali / A 07 Magazzino semilavorati 14,60. Ora la contabilità dice quello che c’è davvero: 19 SL-TAGLIO.',fatto:function(h){return reg(h,'DIFFERENZA_INVENTARIO','2026-12-31');}},
    {g:'14 · Inventario di fine anno',titolo:'Valorizza la rimanenza di ferro con i quattro metodi',dove:{ep:I+'valorizzazione'},percorso:'WMS → Inventari → Valorizzazione delle rimanenze',
     campi:[['Materiale','FERRO, 740 kg'],['FIFO','restano gli acquisti più recenti: 240 × 1,00 + 500 × 1,08 = 780'],['LIFO','restano i più vecchi: 740 × 1,00 = 740'],['Costo medio ponderato','748,97 (prezzo medio (2.800 × 1,00 + 500 × 1,08) ÷ 3.300 kg = 1,0121 €/kg)'],['Costo standard (in bilancio)','740 × 0,95 = 703']],
     nota:'Il bilancio di questo sistema tiene il magazzino a costo standard: le differenze verso il prezzo pagato sono nel conto 63. Spunta a mano.'},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'Scorta minima del ferro: è ora di riordinare?',dove:{ep:M+'scorte'},percorso:'WMS → Scorta minima e riordino → Imposta la scorta minima',
     campi:[['Materiale','FERRO'],['Scorta minima (punto di riordino)','1000'],['Scorta massima','3000'],['Pulsante','Salva la scorta minima']],
     attesa:'Riga FERRO: libera 740 + in arrivo 0 = 740 kg, sotto il minimo di 1.000 → 🔴 SOTTO SCORTA, proposta di riordino 2.260 kg (3.000 − 740). L’avviso rosso compare anche nel Monitor. Nessun movimento e nessuna scrittura.',
     nota:'Il sistema PROPONE, non ordina: la richiesta d’acquisto si farà a gennaio, in questo esercizio NON crearla. Le transenne e i kit non hanno un minimo: riga grigia.',fatto:function(h){return !!(h.S.scorte && h.S.scorte.FERRO && h.S.scorte.FERRO.min===1000);}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'Trasferimento: 10 kit al deposito esterno D200',dove:{ep:M+'depositi'},percorso:'WMS → Deposito esterno e merce in viaggio → 1 · Crea il trasferimento',
     campi:[['Da dove parte','dal magazzino W100 al deposito esterno D200'],['Materiale','SL-TAGLIO'],['Quantità da trasferire','10'],['Data','31/12/2026'],['Arrivo previsto','02/01/2027'],['Pulsante','Crea il trasferimento']],
     attesa:'Trasferimento UB001 e 1 compito «Prelievo per il deposito esterno»: 10 kit dal cassone in 03-05-2 alla banchina GI-ZONE. Nessuna scrittura: la merce resta nostra.',
     nota:'La filiale vicina ai cantieri vuole 10 kit pronti per gennaio. In SAP è un ordine di trasferimento (tipo UB) tra due depositi della stessa azienda.',fatto:function(h){return !!trasfKit(h);}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'RF: preleva i 10 kit per il deposito',dove:{ep:M+'rf'},percorso:'WMS → Pistola RF → Compiti',campi:[['Data di lavoro','31/12/2026'],['Compito','il «Prelievo per il deposito esterno» da 03-05-2 a GI-ZONE']],
     attesa:'10 kit in banchina GI-ZONE, 9 restano nel cassone in 03-05-2. Il trasferimento è «prelevato, pronto da spedire».',nota:rf,fatto:function(h){return fatti(compiti(h,'DEPOSITO'),1);}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'Uscita 351: il camion parte, i kit sono in viaggio',dove:{ep:M+'depositi'},percorso:'WMS → Deposito esterno e merce in viaggio → 2 · Carica il camion',
     campi:[['Trasferimento','UB001 · W100 → D200 · 10 SL-TAGLIO'],['Data di partenza','31/12/2026'],['Pulsante','Registra l’uscita 351 (merce in viaggio)']],
     attesa:'Stato 🚚 «IN VIAGGIO: non è né qua né là». Tabella per luogo, SL-TAGLIO: W100 9 + in viaggio 10 + D200 0 = 19 contabili. Nessuna scrittura.',
     nota:'Il camion parte l’ultimo giorno dell’anno e arriva il 2 gennaio: a fine anno questi 10 kit sono sulla strada.',fatto:function(h){var t=trasfKit(h);return !!t && !!t.partito;}},
    {g:'14 · Inventario di fine anno',data:'31/12/2026',titolo:'Dove si trova? I kit sul camion a fine anno',dove:{ep:M+'mappa'},percorso:'WMS → Mappa delle ubicazioni → «🔎 Dove si trova?» SL-TAGLIO; poi WMS → Arretrato e scadenze',
     campi:[['Dove si trova','SL-TAGLIO: 9 ✅ libere in 03-05-2; 10 ⛔ «SUL CAMION tra due depositi»'],['Mappa','in fondo il riquadro «Fuori dal magazzino W100»: IN-VIAGGIO con 10 SL-TAGLIO'],['Arretrato','data di oggi 31/12/2026: «5 · Merce in viaggio tra depositi», UB001 🟡 scade fra 2 giorni']],
     attesa:'19 kit in contabilità, ma solo 9 prelevabili da W100. Al 31/12 anche i 10 sul camion sono nelle rimanenze di bilancio (conto 07): sono nostri, anche se non sono né qua né là.',
     nota:'Lettura: spunta a mano. È lo «stock in transito» della rete dei depositi che si studia nella MasterSupplyChain Academy.'},
    {g:'14 · Inventario di fine anno',titolo:'KPI di magazzino di dicembre',dove:{ep:Z+'kpi'},percorso:'WMS → Innovazione → KPI di magazzino',campi:[['Leggi','accuratezza dell’inventario, ordini perfetti, tempo dal ricevimento allo scaffale, compiti per risorsa']],
     nota:'Facoltativo: spunta a mano dopo la lettura.'},
    {g:'14 · Ratei, risconti, ammortamenti',data:'31/12/2026',titolo:'KO88: chiudi i due ordini indipendenti',dove:{ep:C+'chiusura'},percorso:'CO → Chiusura degli ordini e varianze → Varianze e liquidazione',campi:[['Data','31/12/2026']],
     attesa:'Varianza zero sui due ordini: ferro e ore effettivi uguali allo standard. Gli ordini passano a CLSD. Nessuna scrittura.',
     nota:'Se avessimo confermato ore in più, la differenza andrebbe sul conto 61 Varianze di produzione.',fatto:function(h){return ['TR-STD','SL-TAGLIO'].every(function(m){var o=prod(h,m);return !!o && !!o.liquidazione;});}},
    {id:'dicembre-giornale',g:'14 · Controllo contabile',data:'31/12/2026',titolo:'Rileggi il giornale dopo il tentativo di ragioneria',dove:{ep:F+'giornale'},percorso:'Laboratorio di ragioneria → invia un tentativo completo; FI → Libro giornale',
     campi:[['Prima della soluzione','Per ogni domanda compila conti, sezioni Dare/Avere e importi e invia un tentativo valutabile; un clic senza dati non vale'],['Dopo il tentativo','Confronta il documento nel giornale: data, numero, descrizione, righe Dare e righe Avere, totale del documento e quadratura'],['Evidenza','Conserva il numero di una fattura cespite, di un consumo 261 e di una conferma CO11N; distingui i rispettivi conti e gli importi']],
     attesa:'Un solo libro giornale integrato. Gli errori del tentativo rimangono evidenze didattiche: consultare la soluzione non trasforma il tentativo in risposta corretta.',nota:'Se ci sono documenti ancora bloccati dal quiz, viste e totali consultabili possono essere parziali. Completa il tentativo prima di cercare le scritture nelle viste derivate.'},
    {id:'dicembre-mastrini',g:'14 · Controllo contabile',data:'31/12/2026',titolo:'Apri i mastrini e riconciliali con il giornale',dove:{ep:F+'mastro'},percorso:'FI → Mastrini per conto; oppure dal conto del documento nel giornale',
     campi:[['Conto','Scegli un conto nel selettore e premi Mostra mastrino: prova 10 Banca, 12 Ferro, 07 Semilavorati, 72 e 75 Attività'],['Lettura','Data, documento, descrizione, Dare, Avere e saldo progressivo con sezione Dare/Avere esplicita'],['Collegamenti','Apri dal mastrino il documento del giornale; dal conto del giornale torna al relativo mastrino'],['Quadratura','Somma i movimenti dello stesso conto nel giornale e confronta Dare, Avere e saldo finale; non registrare altre scritture per ottenere il mastrino']],
     attesa:'Il mastrino è una vista delle medesime registrazioni, non una seconda contabilità. Sul conto 75 gli accrediti delle attività dei due ordini sommano 7.280.',nota:'La protezione del quiz vale anche qui. Un saldo residuo di centro non dimostra da solo inefficienza e non genera automaticamente WIP patrimoniale FI.'},
    // ── 15 · IVA, imposte, chiusura ──
    {g:'15 · IVA, imposte e chiusura',data:'31/12/2026',titolo:'Liquida l’IVA di dicembre',contabile:true,dove:{ep:H+'iva'},percorso:'FI → IVA, imposte, chiusura → Liquidazione IVA',campi:[['Periodo','2026-12'],['Data','31/12/2026']],
     attesa:'A debito 7.026,80 (vendite 3.880,80 + cessioni 2.926 + noleggio 220) − a credito 10.863,60 (macchine 9.460 + ferro 660 + riordino 118,80 + commercialista 228,80 + maxicanone 396) = credito 3.836,80 riportato al 2027. Si chiudono i due conti IVA contro l’Erario: D 21 7.026,80 / A 14 10.863,60 / D 25 Erario c/IVA 3.836,80 (il credito sta sull’Erario, non resta sul 14).',fatto:function(h){return ((h.S.chiusura || {}).iva || []).some(function(x){return x.periodo==='2026-12';});}},
    {g:'15 · IVA, imposte e chiusura',data:'31/12/2026',titolo:'Calcola e registra IRES e IRAP',contabile:true,dove:{ep:H+'imposte'},percorso:'FI → IVA, imposte, chiusura → Imposte',campi:[['Esercizio','2026'],['Altre variazioni','0 e 0'],['Aliquote','IRES 24 · IRAP 3,9'],['Data','31/12/2026']],
     attesa:'Risultato prima delle imposte 2.115,32. IRES 24% = 507,68 (D 56 / A 23): la svalutazione crediti sta nello 0,5%, nessuna variazione. IRAP 3,9% sul valore della produzione 2.244,90 = 87,55 (D 52 / A 35): per l’IRAP si tolgono gli interessi (sconto 10,83 + mutuo 54,19) e la svalutazione crediti 64,56, che non si deducono. Utile netto 1.520,09.',
     fatto:function(h){return ((h.S.chiusura || {}).imposte || []).some(function(x){return x.anno==='2026';});}},
    {g:'15 · IVA, imposte e chiusura',titolo:'Leggi il conto economico di dicembre',dove:{ep:H+'chiusura'},percorso:'FI → IVA, imposte, chiusura → Chiusura dell’esercizio (prospetti)',
     campi:[['Vendite','ricavi 18.000 − sconti 360 = 17.640; costo del venduto 9.420'],['Produzione','due ordini indipendenti: ferro 2.432 + attività 7.280 = output 9.712 (9.420 finiti + 292 HALB), varianza zero; le attività accreditate ai centri (75: 7.280) compensano in parte il costo vero del personale. WIP analitico non capitalizzato in FI'],['Magazzino','rottamazione del ferro schiacciato 190 · differenza inventariale 14,60 · differenze prezzo del ferro 215 (150 + 65)'],['Altro','paghe 10.426,96 · ammortamenti 458,34 · minusvalenza 1.300 · plusvalenza 816,67 · sopravvenienza 500 · fitto 1.033,33 · assicurazione 101,92 · provvigioni 529,20'],['Finanza','noleggio 1.000 · commercialista 1.040 · spese e commissioni bancarie 233 (anticipo 30, mutuo 200, sconto 3) · interessi di sconto 10,83 · interessi sul mutuo 54,19 · bollo 14,64 · leasing 14,78 · svalutazione crediti 64,56'],['Risultato','prima delle imposte 2.115,32 − IRES 507,68 − IRAP 87,55 = utile 1.520,09']],
     nota:'Spunta a mano dopo aver letto. I controlli prima della chiusura devono essere tutti verdi.'},
    {g:'15 · IVA, imposte e chiusura',data:'31/12/2026',titolo:'Chiudi l’esercizio 2026',contabile:true,dove:{ep:H+'chiusura'},percorso:'FI → IVA, imposte, chiusura → Chiusura dell’esercizio',campi:[['Esercizio','2026'],['Chiudi anche con avvertenze','no']],
     attesa:'Epilogo dei costi e dei ricavi nel conto 90; utile: D 90 / A 32 Utile d’esercizio 1.520,09; chiusura delle attività e passività nel 91. Dopo, nessuna scrittura con data 2026.',
     nota:'Il pannello chiede di ricostruire tutti e tre i documenti della chiusura: l’epilogo dei costi e dei ricavi, la rilevazione dell’utile e la chiusura delle attività e passività nello stato patrimoniale finale. Per epilogo e chiusura puoi scrivere una riga per conto oppure una riga riepilogativa per lato (totale costi, totale ricavi; totale attività, totale passività): conta che la scrittura quadri con i saldi. Poi confronta con il libro giornale.',fatto:function(h){return !!(h.S.chiusure || {})['2026'];}},
    // ── 16 · riapertura e gennaio ──
    {g:'16 · Riapertura e gennaio',data:'01/01/2027',titolo:'Riapri i conti al 1° gennaio 2027',contabile:true,dove:{ep:H+'riapertura'},percorso:'FI → IVA, imposte, chiusura → Riapertura',campi:[['Nuovo esercizio','2027'],['Data','01/01/2027']],
     attesa:'D attività / A 92 e D 92 / A passività per 129.130,13: macchine 29.000 (fondo 241,67), risconti 2.883,30, semilavorati 277,40, ferro 703, banca 79.517,15, credito Beta 12.912,48 (fondo svalutazione 64,56), IVA a credito 3.836,80; capitale 80.000, utile 1.520,09, mutuo 30.000, anticipo bancario 10.329,98, ratei 1.087,52, ritenuta del commercialista 200, debiti verso INPS, Erario, INAIL, agenti, TFR e imposte.',
     fatto:function(h){var c=(h.S.chiusure || {})['2026'];return !!c && !!c.riapertura;}},
    {g:'16 · Riapertura e gennaio',data:'01/01/2027',titolo:'Storna i risconti e i ratei',contabile:true,dove:{ep:H+'assestamenti'},percorso:'FI → IVA, imposte, chiusura → Ratei e risconti → Storno al 1° gennaio',campi:[['Data dello storno','01/01/2027']],
     attesa:'D 83 Assicurazioni / A 06 1.098,08 · D 88 Canoni di leasing / A 06 1.785,22 · D 39 / A 86 Fitti passivi 1.033,33 · D 39 / A 74 Interessi su mutui 54,19. Il 2027 ha così 11 mesi di polizza e la sua parte di maxicanone; quando a febbraio arriverà la fattura del fitto (3.000) al 2027 resteranno 1.966,67, e degli interessi della prima rata (120) solo 65,81.',
     fatto:function(h){return reg(h,'STORNO_ASSESTAMENTI','2027-01-01');}},
    {g:'16 · Riapertura e gennaio',data:'02/01/2027',titolo:'Entrata 101 al deposito: i kit sono arrivati',dove:{ep:M+'depositi'},percorso:'WMS → Deposito esterno e merce in viaggio → 3 · Ricevi all’arrivo',
     campi:[['Trasferimento','UB001 in viaggio'],['Quantità contata all’arrivo','vuoto = tutti i 10'],['Data di arrivo','02/01/2027'],['Pulsante','Registra l’entrata 101']],
     attesa:'Stato «arrivato il 02/01/2027». SL-TAGLIO: W100 9 + in viaggio 0 + D200 10 = 19. Nessuna scrittura.',nota:'Se all’arrivo ne mancasse uno, la differenza andrebbe nella zona 999 e si registrerebbe con l’inventario (LI21).',fatto:function(h){var t=trasfKit(h);return !!t && !!t.arrivato;}},
    {g:'16 · Riapertura e gennaio',data:'14/01/2027',titolo:'F-28: Beta paga la fattura alla scadenza',contabile:true,dove:{ep:V+'incassi'},percorso:'SD → Incassi e partite',campi:[['Cliente','C100 Beta Costruzioni'],['Importo','12912,48'],['Riferimento','SALDO FATTURA BETA'],['Data valuta','14/01/2027']],
     attesa:'D 10 / A 11 12.912,48. Il credito verso Beta va a zero.',fatto:function(h){return reg(h,'INCASSO','2027-01-14');}},
    {g:'16 · Riapertura e gennaio',data:'14/01/2027',titolo:'La banca si ripaga l’anticipo con gli interessi',contabile:true,dove:{ep:T+'anticipi'},percorso:'Tesoreria → Anticipo su fatture → Estingui l’anticipo',campi:[['Anticipo','ANT-001 Beta'],['Interessi','25'],['Data','14/01/2027']],
     attesa:'D 38 Banca c/anticipi 10.329,98 + D 60 Interessi passivi 25 / A 10 10.354,98. Il debito verso la banca è chiuso.',fatto:function(h){return (((h.S.tes || {}).anticipi) || []).some(function(x){return !!x.estinto;});}},
    {g:'16 · Riapertura e gennaio',data:'18/01/2027',titolo:'F24: versa ritenute e contributi di dicembre',contabile:true,dove:{ep:Y+'contabilita'},percorso:'Paghe → Registrazione, stipendi e F24 → F24',campi:[['Periodo','2026-12'],['Data di versamento','18/01/2027']],
     attesa:'D 29 Erario 972,16 + D 28 INPS 2.956,71 / A 10 3.928,87. Banca 78.145,78.',nota:'Il 16 gennaio 2027 è sabato: la scadenza slitta al lunedì 18. Nell’F24 c’è solo il codice 1001 (IRPEF): le addizionali regionali (3802) e comunali (3848, acconto 3847) compariranno negli F24 del 2027, dopo ogni rata trattenuta in busta.',fatto:function(h){return reg(h,'F24');}},
    {g:'16 · Riapertura e gennaio',data:'18/01/2027',titolo:'F24 codice 1040: versa la ritenuta del commercialista',contabile:true,dove:{ep:W+'ritenute'},percorso:'Tesoreria e finanza → Ritenute d’acconto → Versa con F24 (1040)',
     campi:[['Mese dei pagamenti','2026-12'],['Data','18/01/2027']],
     attesa:'D 29.10 Erario c/ritenute / A 10 200. Il 16/01/2027 è sabato: la scadenza va a lunedì 18.',fatto:function(h){return (FIN(h).f24 || []).some(function(x){return x.tributo==='1040' && x.mese==='2026-12';});}},
    {g:'16 · Riapertura e gennaio',data:'18/01/2027',titolo:'Paga la prima rata del mutuo',contabile:true,dove:{ep:W+'mutui'},percorso:'Tesoreria e finanza → Mutui e rate → Paga la rata',
     campi:[['Mutuo','MU-001'],['Data','18/01/2027']],
     attesa:'D 37.10 Mutui passivi 1.193,46 + D 74 Interessi 120 / A 10 1.313,46. Dopo lo storno del rateo del 1° gennaio, al 2027 restano 65,81 di interessi: proprio i 17 giorni di gennaio.',
     fatto:function(h){var m=mutuo(h);return !!m && !!m.piano[0].pagata;}},
    {g:'16 · Riapertura e gennaio',data:'23/01/2027',titolo:'Primo canone del leasing',contabile:true,dove:{ep:W+'leasing'},percorso:'Tesoreria e finanza → Leasing e canoni → Paga il canone',
     campi:[['Contratto','LS-001'],['Data','23/01/2027']],
     attesa:'D 88 Canoni di leasing 480 + D 14 IVA 105,60 / A 10 585,60.',fatto:function(h){var x=leasing(h);return !!x && !!x.canoni[0].pagato;}},
    {g:'16 · Riapertura e gennaio',data:'30/04/2027',titolo:'L’assemblea approva il bilancio e destina l’utile',contabile:true,dove:{ep:H+'riapertura'},percorso:'FI → IVA, imposte, chiusura → Riapertura → Destinazione dell’utile',campi:[['A riserva legale %','5'],['Data della delibera','30/04/2027']],
     attesa:'D 32 Utile 1.520,09 / A 33 Riserva legale 76 + A 30 Riserve 1.444,09.',fatto:function(h){return reg(h,'DESTINAZIONE_UTILE');}},
    // Controller: analisi di un ordine prima della consegna finale, senza riscrivere la contabilità.
    {id:'dicembre-co-commessa-fert',g:'16 · Controllo economico e decisioni',titolo:'Controller: verifica il costo della commessa TR-STD',
     dove:{ep:C+'commessa'},percorso:'CO → Costi del prodotto → Scheda economica di commessa (KKBC / KKS2)',
     campi:[['Seleziona l’ordine','1000001 · TR-STD · 300 transenne'],['Controlla il budget','9.420,00 € per il lotto: ferro 2.280, lavorazioni Taglio 2.100, Piegatura 1.680, Saldatura 3.360'],['Controlla il consuntivo','Somma dei movimenti 261, CO11N e degli eventuali sovraccosti KGI2'],['Controlla la chiusura','Il 101 accredita il valore standard. KKS2 confronta costi effettivi e accredito; KO88 liquida la varianza dopo DLV/TECO'],['Interpretazione','Se il saldo è zero: coincidenza standard/effettivo; se è diverso da zero, individua la categoria che ha prodotto lo scostamento']],
     idea:'Sei il controller. Non devi inserire nuovi costi: devi leggere e interpretare ciò che gli operai, il magazzino e le paghe hanno già registrato.',
     fai:[['Apri','CO → Costi del prodotto → Scheda economica di commessa'],['Ordine','Seleziona 1000001 TR-STD'],['Budget / effettivo','Leggi i cinque componenti di costo e confronta la colonna degli scostamenti'],['Varianza','Apri il dettaglio KKS2: distingui quantità materiale, ore, attrezzaggio e costi indiretti'],['Conclusione','Spiega se l’ordine ha assorbito i costi previsti e se KO88 risulta già eseguito']],
     punti:[
       {t:'scelta',sel:'#co-commessa-ordine',nome:'Ordine da controllare',valore:'1000001',serve:'Scegli l’ordine di produzione del lotto da 300 transenne. La scheda legge il budget congelato quando hai rilasciato CO01: non lo ricostruisce dalla tariffa attuale.'},
       {t:'leggi',sel:'#co-commessa-kpi-costi',nome:'Budget, consuntivo, entrata 101 e saldo',serve:'Confronta quanto era previsto col costo realmente imputato. Finché l’ordine non è terminato, il saldo è WIP analitico, non una perdita; evita di contare due volte il personale.'},
       {t:'leggi',sel:'#co-commessa-varianze',nome:'Cause della varianza KKS2',serve:'Leggi una per una le cause: materiali, lavorazioni, attrezzaggio, sovraccosti e lotto. Se lo scostamento è nullo, spiega che il caso ha rispettato lo standard. Conferma la lettura qui nel tutor.'}
     ],
     nota:'Non registrare un altro 261/CO11N per far tornare il conto: la scheda è di sola lettura. Nel caso standard un ordine completato con costi 9.420 e accredito 9.420 presenta varianza zero.'},
    {id:'dicembre-co-commessa-halb',g:'16 · Controllo economico e decisioni',titolo:'Controller: controlla il lotto HALB e distingui il margine commerciale',
     dove:{ep:C+'commessa'},percorso:'CO → Costi del prodotto → Scheda economica di commessa; CO-PA → KE30',
     campi:[['Seleziona','1000002 · SL-TAGLIO · 20 semilavorati a scorta'],['Costo previsto del lotto','20 × 14,60 = 292,00 €'],['Costo effettivo','Ferro 152 € + lavorazione Taglio 140 € = 292 €, se non ci sono scostamenti'],['Controllo liquidazione','Ordine DLV/TECO: se varianza zero, KKS2 e KO88 non devono inventare differenze'],['Perché il margine non è qui','Il lotto HALB è prodotto per magazzino: non è una fattura di vendita. I ricavi commerciali non sono attribuibili automaticamente al singolo ordine produttivo'],['Dove leggere i margini','La sezione CO-PA mostra margini per materiale/periodo, separati dal costo di questo specifico lotto']],
     idea:'Un buon controller distingue il risultato produttivo di un lotto dalla redditività di una vendita: non sono lo stesso oggetto contabile.',
     fai:[['Ordine','Seleziona 1000002 SL-TAGLIO'],['Verifica','Confronta 292 € di piano con costi e accredito 101 effettivamente registrati'],['Causa','Leggi la categoria KKS2 e il risultato dell’eventuale KO88'],['Redditività','Leggi la sezione CO-PA separata: sono margini delle vendite del materiale, non profitti imputati a questa commessa'],['Conclusione','Spiega la differenza fra costo di fabbricazione, WIP, varianza e margine commerciale']],
     punti:[
       {t:'scelta',sel:'#co-commessa-ordine',nome:'Ordine HALB da controllare',valore:'1000002',serve:'Seleziona il lotto autonomo di 20 kit SL-TAGLIO. È una produzione a magazzino distinta dall’ordine 1000001.'},
       {t:'leggi',sel:'#co-commessa-kpi-costi',nome:'Costo lotto 20 pezzi, entrata e saldo',serve:'Controlla i 292 € attesi, non confondere la quantità HALB con le 300 transenne TR-STD.'},
       {t:'leggi',sel:'#co-commessa-copa',nome:'Differenza fra ordine produttivo e CO-PA',serve:'Non sottrarre ricavi di Beta/Delta ai costi del lotto HALB. I ricavi non sono univocamente legati a questo ordine; il margine commerciale va studiato separatamente in KE30.'}
     ],
     nota:'Il tutor chiede una lettura ragionata, non un nuovo movimento contabile. Spunta il passo come svolto solo dopo aver verificato le tre sezioni.'},
    {g:'16 · Riapertura e gennaio',titolo:'Verifica finale',dove:{ep:F+'bilancio'},percorso:'FI → Contabilità → Bilancio di verifica; WMS → Monitor',
     campi:[['Banca','31/12/2026: 79.517,15 · dopo il 23/01/2027: 76.046,72'],['Finanza','mutuo residuo 28.806,54 · leasing: 1 canone su 35 · ritenuta 1040 versata · cambiale scontata in attesa della scadenza 20/02/2027'],['Scorte','FERRO 740 kg · SL-TAGLIO 19 · TR-STD 0; IM = WMS; nessun compito aperto'],['Cespiti','01 29.000 − fondo 02 241,67'],['Controllo','Dare = Avere; conti 90, 91 e 92 a zero']],
     nota:'Spunta a mano dopo il controllo.'},
    {g:'16 · Riapertura e gennaio',titolo:'Consegna il lavoro al docente',dove:{ep:'allievo.consegna'},percorso:'La mia area → Consegna il lavoro',campi:[['Lavoro','Sistema integrato'],['Esercizio','Dicembre: dalla costituzione alla riapertura'],['Nota','Spiega la differenza tra la minusvalenza del carrello e la plusvalenza della sega']]},
  ];
  // Riordino esclusivamente didattico: nessuna esecuzione di operazioni o mutazione dello stato.
  // Le cessioni del 22/12 precedono l'incasso assicurativo del 28/12, senza cambiare le date.
  var indennizzo = passi.splice(passi.findIndex(function(p){return p.titolo==='Incassa l’indennizzo';}),1)[0];
  var incassi = passi.findIndex(function(p){return p.titolo==='F-28: incassa le due cessioni';});
  passi.splice(incassi,0,indennizzo);
  var lettura = passi.splice(passi.findIndex(function(p){return p.id==='dicembre-lettura-standard';}),1)[0];
  var preparazione = passi.findIndex(function(p){return p.g==='3 · Assicurazione';});
  var cpm = window.MSA_CPM_FORMAS;
  var standard = cpm && Array.isArray(cpm.passiPreparazione) ? cpm.passiPreparazione : [];
  passi.splice.apply(passi,[preparazione,0].concat(standard,[lettura]));
  if(cpm && Array.isArray(cpm.passiConsuntivo)) {
    var controllo = passi.findIndex(function(p){return p.titolo==='Leggi la mappa delle ubicazioni';});
    passi.splice.apply(passi,[controllo,0].concat(cpm.passiConsuntivo));
  }
  if(cpm && Array.isArray(cpm.passiRiconciliazione)) {
    var fineMese = passi.findIndex(function(p){return p.titolo==='KO88: chiudi i due ordini indipendenti';});
    passi.splice.apply(passi,[fineMese,0].concat(cpm.passiRiconciliazione));
  }
  // Dalle fatture in poi, mostra sempre istruzioni operative anche per i
  // passi privi di un tutor contestuale specifico. Non modificare la sequenza,
  // gli ID, i controlli automatici né il lavoro già salvato dagli allievi.
  var daFatture = passi.findIndex(function(p){return p.titolo==='VF01: fattura Beta';});
  if (daFatture >= 0) passi.slice(daFatture).forEach(function(p){
    if (p.fai && p.fai.length) return; // conserva le guide specialistiche esistenti
    var azioni = ['Apri il modulo indicato nel percorso in alto, con «Apri ➜» se necessario.'];
    (p.campi || []).forEach(function(c) {
      azioni.push([c[0], String(c[1])]);
    });
    if (p.fatto) azioni.push('Controlla tutti i dati, esegui il comando previsto dal modulo e attendi la conferma effettiva del sistema. Il tutor passerà avanti solo quando l’operazione sarà registrata.');
    else azioni.push('Leggi il risultato nella schermata, confrontalo con i valori richiesti e poi premi «✓ Fatto» nel tutor.');
    p.fai = azioni;
    if (!p.idea) p.idea = 'Esegui questo passaggio nel programma: le caselle e i valori da utilizzare sono elencati qui sotto, senza anticipare la soluzione dell’eventuale esercizio contabile.';
    if (!p.vedi && p.attesa && !p.contabile) p.vedi = [p.attesa];
  });
  window.MSA_ESERCIZIO = {codice:'dicembre-wms',titolo:'Dicembre: dalla costituzione alla riapertura',versione:'erp-ft',pannelloAutomatico:true,verificaRagioneria:true,passi:passi};
})();
