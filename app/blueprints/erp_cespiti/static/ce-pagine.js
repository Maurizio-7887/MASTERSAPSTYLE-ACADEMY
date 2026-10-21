/* SISTEMA INTEGRATO — Cespiti: registro dei beni, acquisto con fattura, ammortamenti, cessione. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, CE = window.CE4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, fd = L.fd, S = function () { return N.S; };
  var attivi = function () { return CE.elenco().filter(function (c) { return !c.cessione; }); };
  var etC = function (c) { return c.codice + ' · ' + c.descrizione + ' · costo ' + eur(c.costo); };
  var campiMacchina = function (c) { c = c || {}; return [
    ['codiceInterno', 'Codice interno macchinario (facoltativo, univoco)', 'text', c.codiceInterno || ''],
    ['matricola', 'Matricola del costruttore', 'text', c.matricola || ''],
    ['modello', 'Modello', 'text', c.modello || ''],
    ['ubicazione', 'Ubicazione / reparto', 'text', c.ubicazione || ''],
    ['centro', 'Centro di costo (etichetta, nessuna imputazione)', 'text', c.centro || '']
  ]; };
  var registro = function () {
    var q = (radice.dataset.cerca || '').toLowerCase();
    return L.tabella(['Cespite / codice interno', 'Descrizione / matricola', 'Ubicazione / centro', 'Classe', 'Acquisto / in funzione', 'Costo storico›', 'Aliquota civile / coeff. fiscale›', 'Fondo›', 'Valore netto›', 'Stato'], CE.registro(radice.dataset.alla || undefined).filter(function (c) {
      return [c.codice, c.codiceInterno, c.descrizione, c.matricola, c.ubicazione, c.centro].join(' ').toLowerCase().indexOf(q) >= 0;
    }).map(function (c) {
      return ['<b>' + e(c.codice) + '</b><br>' + e(c.codiceInterno || '—'), e(c.descrizione) + '<br>Matricola: ' + e(c.matricola || '—'), e(c.ubicazione || '—') + '<br>' + e(c.centro || '—'), e(c.classe), fd(c.acquisto) + '<br>' + fd(c.inFunzione), eur(c.costo), c.aliquota + '% / ' + c.coeffFiscale + '%', eur(c.fondo), '<b>' + eur(c.netto) + '</b>', e(c.stato)]; }), 'Nessun cespite corrispondente.');
  };
  function schedaMacchina() {
    var lista = CE.elenco(); if (!lista.length) return '';
    var c = lista.find(function (x) { return x.codice === radice.dataset.macchina; }) || lista[0];
    var opzioni = lista.map(function (x) { return '<option value="' + e(x.codice) + '"' + (x.codice === c.codice ? ' selected' : '') + '>' + e(x.codice + ' · ' + x.descrizione) + '</option>'; }).join('');
    return L.scheda('🔧', 'Scheda macchinario e manutenzioni didattiche', 'Anagrafica tecnica · separata dalla contabilità',
      '<label>Seleziona il cespite <select id="macchina">' + opzioni + '</select></label>' +
      '<figure aria-label="Segnaposto fotografico simulato"><div style="padding:1rem;border:1px dashed #777">🏭 IMMAGINE SIMULATA — ' + e(c.descrizione) + '</div><figcaption>Segnaposto didattico: nessuna fotografia reale caricata o generata da servizi esterni.</figcaption></figure>' +
      L.modulo('mc', [['cespite', 'Codice cespite automatico (non modificabile)', 'select', c.codice, [[c.codice, c.codice]]]].concat(campiMacchina(c)), [['mc', 'Salva solo i dati tecnici']]) +
      '<p class="lab-nota">Il codice CE- è assegnato automaticamente all’acquisto. Il codice interno è facoltativo e distinto dalla matricola. I dati tecnici e gli interventi non cambiano costo, fondo, aliquote, fatture o libro giornale. Usa solo dati sintetici.</p>' +
      L.modulo('mt', [['cespite', 'Cespite', 'select', c.codice, [[c.codice, c.codice]]], ['data', 'Data intervento simulato', 'date'], ['tipo', 'Tipo intervento', 'select', 'Controllo', [['Controllo', 'Controllo'], ['Preventiva', 'Preventiva'], ['Correttiva', 'Correttiva']]], ['nota', 'Descrizione sintetica (nessun costo contabilizzato)', 'text']], [['mt', 'Aggiungi intervento didattico']]) +
      L.tabella(['Data', 'Tipo', 'Intervento simulato'], (c.manutenzioni || []).slice().sort(function (a, b) { return b.data.localeCompare(a.data); }).map(function (m) { return [fd(m.data), e(m.tipo), e(m.nota)]; }), 'Nessun intervento didattico.'));
  }
  var PAGINE = {
    registro: function () {
      var r = CE.registro(radice.dataset.alla || undefined), tot = r.reduce(function (t, c) { return {costo: t.costo + (c.cessione ? 0 : c.costo), fondo: t.fondo + c.fondo, netto: t.netto + c.netto}; }, {costo: 0, fondo: 0, netto: 0});
      radice.innerHTML = U.avviso(S()) + L.scheda('🏭', 'Registro dei beni ammortizzabili', 'AW01N · AR01 · simulazione didattica',
          '<div class="lab-filtro"><label>Cerca codice, bene, matricola, ubicazione o centro <input id="cerca" type="search" value="' + e(radice.dataset.cerca || '') + '"></label> <label>Situazione al (vuoto = tutti) <input id="alla" type="date" value="' + e(radice.dataset.alla || '') + '"></label></div>' + registro() +
          '<p class="lab-nota">In uso: costo storico ' + eur(tot.costo) + ' € − fondo ' + eur(tot.fondo) + ' € = valore netto ' + eur(tot.netto) + ' €. Il costo resta sul conto del bene (01 / 03), gli ammortamenti si accumulano nel fondo (02 / 04): in bilancio il bene vale costo − fondo.</p>') +
        L.scheda('📜', 'Quote civilistiche registrate nella simulazione', 'AW01N · nessuna registrazione automatica', L.tabella(['Cespite', 'Anno', 'Mesi›', 'Quota›', 'Registrata il', 'Documento'], r.reduce(function (o, c) {
          return o.concat(c.quote.map(function (a) { return [e(c.codice), a.anno, a.mesi, eur(a.importo), fd(a.data), e(a.doc)]; })); }, []), 'Nessuna quota registrata alla data selezionata.')) + schedaMacchina();
      radice.querySelector('#cerca').onchange = function () { radice.dataset.cerca = this.value; rendi(); };
      radice.querySelector('#alla').onchange = function () { radice.dataset.alla = this.value; rendi(); };
      if (radice.querySelector('#macchina')) {
        radice.querySelector('#macchina').onchange = function () { radice.dataset.macchina = this.value; rendi(); };
        L.collega(radice, 'mc', {mc: CE.aggiornaMacchina}, rendi);
        L.collega(radice, 'mt', {mt: CE.manutenzione}, rendi);
      }
    },
    acquisto: function () {
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🆕', 'Nuovo cespite con la fattura del fornitore', 'AS01 + F-90', L.modulo('ac', [['descrizione', 'Descrizione del bene', 'text'], ['classe', 'Classe', 'select', 'IMP', Object.keys(CE.CLASSI).map(function (k) { return [k, CE.CLASSI[k].nome + ' (' + CE.CLASSI[k].aliquota + '%)']; })],
          ['fornitore', 'Fornitore', 'select', 'F300', U.fornitori(S())], ['rif', 'Numero fattura del fornitore', 'text'], ['importo', 'Costo (imponibile) €', 'num'], ['iva', 'IVA %', 'num', 22],
          ['aliquota', 'Aliquota civilistica annua % (vuoto = classe; massimo 100)', 'num'], ['inFunzione', 'Entrata in funzione', 'date'], ['data', 'Data della fattura', 'date']].concat(campiMacchina()), [['ac', 'Registra il cespite e la fattura']]) +
          '<p class="lab-nota">D 01 / 03 bene al costo (con gli oneri accessori) · D 14 IVA a credito / A 20 fornitore. L\'ammortamento parte dal mese di entrata in funzione, non dalla data della fattura.</p>') +
        L.scheda('📚', 'Classi e coefficienti', 'valori didattici · non consulenza fiscale', '<ul class="lab-elenco"><li><b>Impianti e macchinari</b>: aliquota civile predefinita 10%; coefficiente fiscale simulato 10%.</li><li><b>Mezzi di movimentazione interna</b>: aliquota civile predefinita 20%; coefficiente fiscale simulato 20%.</li>' +
          '<li>Codice cespite CE- automatico e progressivo; matricola e codice interno sono dati tecnici distinti.</li><li>Civilistico: quote costanti pro rata per mesi, con aliquota personalizzabile. Fiscale: coefficiente della classe, ridotto alla metà nel primo anno nella simulazione fiscale della pagina Ammortamenti. I valori sono esemplificativi, non universali per ogni macchinario o settore.</li></ul>') + '</div>' +
        L.scheda('🏭', 'Registro', 'AW01N', registro());
      L.collega(radice, 'ac', {ac: CE.acquista}, rendi);
    },
    ammortamenti: function () {
      var al = radice.dataset.al || (new Date().getFullYear() >= 2027 ? '2027-12-31' : '2027-12-31');
      var prev = attivi().map(function (c) { var q = CE.quota(c, al); return [c.codice, e(c.descrizione), fd(c.inFunzione), eur(c.costo), c.aliquota + '%', q.mesi, '<b>' + eur(q.importo) + '</b>']; });
      radice.innerHTML = U.avviso(S()) + L.scheda('🧮', 'Ammortamento dei cespiti', 'AFAB', '<div class="lab-filtro"><label>Anteprima fino al <input type="date" id="al" value="' + al + '"></label></div>' +
          L.tabella(['Cespite', 'Descrizione', 'In funzione', 'Costo›', 'Aliquota›', 'Mesi›', 'Quota›'], prev, 'Nessun cespite in uso.') +
          L.modulo('af', [['data', 'Data di registrazione (fine periodo)', 'date', al]], [['af', 'Registra gli ammortamenti (AFAB)']]) +
          '<p class="lab-nota">Anteprima civilistica simulata: quota = costo × aliquota × mesi / 12, limitata al valore netto residuo. Include il mese di entrata in funzione. Non registra nulla finché non premi il pulsante AFAB. D 50 Ammortamenti / A 02 / 04 Fondo ammortamento. La data del modulo determina la registrazione; le quote già registrate non si ripetono.</p>') +
        L.scheda('⚖️', 'Ammortamento civilistico e fiscale ' + al.slice(0, 4), 'doppio binario · art. 102 TUIR · DM 31/12/1988', (function () { var f = CE.fiscale(al.slice(0, 4));
          return L.tabella(['Cespite', 'Civilistico›', 'Coefficiente fiscale', 'Massimo deducibile›', 'Deducibile›', 'Variazione›', 'Eccedenza da recuperare›'], f.righe.map(function (x) {
            return [x.codice + (x.ceduto ? ' (ceduto)' : ''), eur(x.civile), x.coeff + '%' + (x.primoAnno ? ' a metà (primo anno)' : ''), eur(x.massimo), eur(x.deducibile),
              x.aumento ? '+ ' + eur(x.aumento) : x.diminuzione ? '− ' + eur(x.diminuzione) : '—', eur(x.eccedenzaFine) + (x.recuperoCessione ? ' (recuperati ' + eur(x.recuperoCessione) + ' alla cessione)' : '')]; }), 'Nessuna quota nell\'anno.') +
            '<p class="lab-nota">Prospetto fiscale didattico calcolato sulle sole quote civilistiche già registrate nell’anno, non sull’anteprima AFAB. Coefficienti esemplificativi con dimezzamento nel primo anno; recupero delle eccedenze simulato. Non determina imposte reali né la deducibilità effettiva IRES/IRAP del singolo caso e non genera scritture. SIMULAZIONE DIDATTICA — NON VALIDO AI FINI FISCALI O COMMERCIALI.</p>'; })()) +
        L.scheda('🏭', 'Registro', 'AW01N', registro());
      radice.querySelector('#al').onchange = function () { radice.dataset.al = this.value; rendi(); };
      L.collega(radice, 'af', {af: CE.ammortizza}, rendi);
    },
    cessione: function () {
      radice.innerHTML = U.avviso(S()) + L.scheda('🔁', 'Cessione di un cespite', 'ABAVN · F-92', L.modulo('cs', [['cespite', 'Cespite', 'select', '', U.lista(attivi(), etC, '— nessun cespite in uso —', function (c) { return c.codice; })],
          ['cliente', 'Acquirente', 'select', 'C600', U.clienti(S())], ['prezzo', 'Prezzo di vendita (imponibile) €', 'num'], ['iva', 'IVA %', 'num', 22], ['data', 'Data della cessione', 'date']], [['cs', 'Registra la cessione']]) +
          '<p class="lab-nota">Prima il sistema registra la quota di ammortamento fino al mese di cessione (incluso), poi la vendita: D 11 acquirente (prezzo + IVA) · D fondo / A bene al costo storico · A 21 IVA; la differenza tra prezzo e valore netto è una <b>plusvalenza</b> (A 45) o una <b>minusvalenza</b> (D 46).</p>') +
        L.scheda('🏭', 'Registro', 'AW01N', registro());
      L.collega(radice, 'cs', {cs: CE.cedi}, rendi);
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.registro)(); }
  rendi();
})();
