/* SISTEMA INTEGRATO — Cespiti: registro dei beni, acquisto con fattura, ammortamenti, cessione. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, CE = window.CE4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, fd = L.fd, S = function () { return N.S; };
  var attivi = function () { return CE.elenco().filter(function (c) { return !c.cessione; }); };
  var etC = function (c) { return c.codice + ' · ' + c.descrizione + ' · costo ' + eur(c.costo); };
  var registro = function () {
    return L.tabella(['Cespite', 'Descrizione', 'Classe', 'In funzione', 'Costo storico›', 'Aliquota›', 'Fondo›', 'Valore netto›', 'Stato'], CE.registro().map(function (c) {
      return ['<b>' + c.codice + '</b>', e(c.descrizione), e(c.classe), fd(c.inFunzione), eur(c.costo), c.aliquota + '%', eur(c.fondo), '<b>' + eur(c.netto) + '</b>', c.stato]; }), 'Nessun cespite.');
  };
  var PAGINE = {
    registro: function () {
      var r = CE.registro(), tot = r.reduce(function (t, c) { return {costo: t.costo + (c.cessione ? 0 : c.costo), fondo: t.fondo + c.fondo, netto: t.netto + c.netto}; }, {costo: 0, fondo: 0, netto: 0});
      radice.innerHTML = U.avviso(S()) + L.scheda('🏭', 'Registro dei beni ammortizzabili', 'AW01N · AR01', registro() +
          '<p class="lab-nota">In uso: costo storico ' + eur(tot.costo) + ' € − fondo ' + eur(tot.fondo) + ' € = valore netto ' + eur(tot.netto) + ' €. Il costo resta sul conto del bene (01 / 03), gli ammortamenti si accumulano nel fondo (02 / 04): in bilancio il bene vale costo − fondo.</p>') +
        L.scheda('📜', 'Quote di ammortamento', 'AW01N · valori pianificati e registrati', L.tabella(['Cespite', 'Anno', 'Mesi›', 'Quota›', 'Registrata il', 'Documento'], CE.registro().reduce(function (o, c) {
          return o.concat(c.quote.map(function (a) { return [c.codice, a.anno, a.mesi, eur(a.importo), fd(a.data), a.doc]; })); }, []), 'Nessuna quota registrata.'));
    },
    acquisto: function () {
      radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
        L.scheda('🆕', 'Nuovo cespite con la fattura del fornitore', 'AS01 + F-90', L.modulo('ac', [['descrizione', 'Descrizione del bene', 'text'], ['classe', 'Classe', 'select', 'IMP', Object.keys(CE.CLASSI).map(function (k) { return [k, CE.CLASSI[k].nome + ' (' + CE.CLASSI[k].aliquota + '%)']; })],
          ['fornitore', 'Fornitore', 'select', 'F300', U.fornitori(S())], ['rif', 'Numero fattura del fornitore', 'text'], ['importo', 'Costo (imponibile) €', 'num'], ['iva', 'IVA %', 'num', 22],
          ['aliquota', 'Aliquota di ammortamento % (vuoto = quella della classe)', 'num'], ['inFunzione', 'Entrata in funzione', 'date'], ['data', 'Data della fattura', 'date']], [['ac', 'Registra il cespite e la fattura']]) +
          '<p class="lab-nota">D 01 / 03 bene al costo (con gli oneri accessori) · D 14 IVA a credito / A 20 fornitore. L\'ammortamento parte dal mese di entrata in funzione, non dalla data della fattura.</p>') +
        L.scheda('📚', 'Classi e coefficienti', 'tabelle didattiche (DM 31/12/1988)', '<ul class="lab-elenco"><li><b>Impianti e macchinari</b>: 10% annuo (es. saldatrice, piegatrice).</li><li><b>Mezzi di movimentazione interna</b>: 20% annuo (carrelli elevatori).</li>' +
          '<li>Civilistico: quote costanti pro rata per mesi di utilizzo. Fiscale: nel primo anno il coefficiente è ridotto alla metà (qui non applicato: semplificazione).</li></ul>') + '</div>' +
        L.scheda('🏭', 'Registro', 'AW01N', registro());
      L.collega(radice, 'ac', {ac: CE.acquista}, rendi);
    },
    ammortamenti: function () {
      var al = radice.dataset.al || (new Date().getFullYear() >= 2027 ? '2027-12-31' : '2027-12-31');
      var prev = attivi().map(function (c) { var q = CE.quota(c, al); return [c.codice, e(c.descrizione), fd(c.inFunzione), eur(c.costo), c.aliquota + '%', q.mesi, '<b>' + eur(q.importo) + '</b>']; });
      radice.innerHTML = U.avviso(S()) + L.scheda('🧮', 'Ammortamento dei cespiti', 'AFAB', '<div class="lab-filtro"><label>Anteprima fino al <input type="date" id="al" value="' + al + '"></label></div>' +
          L.tabella(['Cespite', 'Descrizione', 'In funzione', 'Costo›', 'Aliquota›', 'Mesi›', 'Quota›'], prev, 'Nessun cespite in uso.') +
          L.modulo('af', [['data', 'Data di registrazione (fine periodo)', 'date', al]], [['af', 'Registra gli ammortamenti (AFAB)']]) +
          '<p class="lab-nota">Quota = costo × aliquota × mesi / 12. D 50 Ammortamenti / A 02 / 04 Fondo ammortamento. Si registra di solito una volta l\'anno al 31/12: le quote già registrate non si ripetono.</p>') +
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
