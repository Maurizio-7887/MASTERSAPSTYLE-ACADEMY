/* SISTEMA INTEGRATO — Finanza e adempimenti: cambiali e bolli, assegni, mutui, leasing, ritenute d'acconto, imposta di bollo,
   crediti dubbi, scambi intracomunitari. Ogni pagina: moduli a sinistra e a destra, registro sotto, una nota con la scrittura. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, F = window.FIN4, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, fd = L.fd, S = function () { return N.S; };
  var ultima = function () { return S().registrazioni.reduce(function (d, r) { return r.data > d ? r.data : d; }, S().avviato || '2027-01-01'); };
  var banche = function () { return N.contiBancari().map(function (c) { return [c.codice, c.codice + ' · ' + c.nome]; }); };
  var nota = function (t) { return '<p class="lab-nota">' + t + '</p>'; };
  var etPart = function (p) { return p.doc + ' · ' + p.nome + ' · ' + eur(p.aperto) + ' · scade ' + fd(p.scadenza); };
  var vuota = function (arr, testo) { return arr.length ? arr : [['', testo]]; };
  var fornitori = function (filtro) { return Object.keys(S().fornitori).filter(function (k) { return !filtro || filtro(S().fornitori[k]); }).map(function (k) { return [k, k + ' — ' + S().fornitori[k].nome]; }); };
  var clienti = function (filtro) { return Object.keys(S().clienti).filter(function (k) { return !filtro || filtro(S().clienti[k]); }).map(function (k) { return [k, k + ' — ' + S().clienti[k].nome]; }); };
  var info = function (html) { return '<!--info-->' + html; };
  var PAGINE = {};

  // ─────────────── CAMBIALI ───────────────
  PAGINE.cambiali = function () {
    var X = F.X(), att = X.cambiali.filter(function (c) { return c.verso === 'attiva'; }), pas = X.cambiali.filter(function (c) { return c.verso === 'passiva'; });
    var lib = F.partiteClienti(), debiti = F.partiteFornitori();
    var et = function (c) { return c.numero + ' · ' + c.nome + ' · ' + eur(c.importo) + ' · scade ' + fd(c.scadenza); };
    radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
      L.scheda('📜', 'Il cliente paga con una cambiale', 'pagherò · tratta accettata', L.modulo('rc', [['fattura', 'Fattura del cliente', 'select', '', vuota(lib.map(function (p) { return [p.doc, etPart(p)]; }), '— nessuna partita aperta libera —')],
        ['tipo', 'Tipo di cambiale', 'select', 'tratta', [['tratta', 'tratta: la emettiamo noi, il cliente la accetta (bollo 12‰ nostro)'], ['paghero', 'pagherò: lo firma il cliente (bollo 11‰ suo)']]],
        ['scadenza', 'Scadenza della cambiale', 'date'], ['importo', 'Importo € (vuoto = tutta la fattura)', 'num'], ['banca', 'Banca per la marca da bollo', 'select', '10', banche()], ['data', 'Data di emissione', 'date']], [['rc', 'Registra la cambiale']]) +
        nota('La fattura si chiude e il credito cambia forma: <b>D 11.10 Cambiali attive / A 11 Cliente</b>. La cambiale è un <b>titolo esecutivo</b>: se non viene pagata si può andare subito al pignoramento, dopo il protesto. Bollo: tratta 12‰ (la paga chi la emette), pagherò 11‰ (la paga chi lo firma); minimo 0,50 €.')) +
      L.scheda('🏦', 'Sconto in banca', 'cambiali allo sconto', L.modulo('sc', [['cambiale', 'Cambiale in portafoglio', 'select', '', U.lista(att.filter(function (c) { return c.stato === 'portafoglio'; }), et, '— nessuna cambiale in portafoglio —')],
        ['tasso', 'Tasso di sconto annuo %', 'num', 6], ['commissione', 'Commissione €', 'num', 3], ['banca', 'Banca', 'select', '10', banche()], ['data', 'Data dello sconto', 'date']], [['sc', 'Sconta la cambiale']]) +
        nota('La banca anticipa l\'importo meno gli interessi fino alla scadenza: <b>D 10 netto + D 60 interessi di sconto + D 58 commissione / A 11.10</b>. Interessi = importo × tasso × giorni / 365. Se alla scadenza il debitore non paga, la banca ci riaddebita la cambiale (rischio di regresso).')) + '</div>' +
      '<div class="lab-griglia">' +
      L.scheda('📬', 'Alla scadenza', 'incasso · insoluto e protesto', L.modulo('es', [['cambiale', 'Cambiale', 'select', '', U.lista(att.filter(function (c) { return c.stato === 'portafoglio' || c.stato === 'scontata'; }), function (c) { return et(c) + ' · ' + c.stato; }, '— nessuna cambiale in attesa —')],
        ['risultato', 'Esito', 'select', 'pagata', [['pagata', 'pagata'], ['insoluta', 'insoluta (protesto)']]], ['spese', 'Spese di incasso o di protesto €', 'num'], ['banca', 'Banca', 'select', '10', banche()], ['data', 'Data', 'date']], [['es', 'Registra l\'esito']]) +
        nota('In portafoglio e pagata: D 10 / A 11.10. Scontata e pagata: nessuna scrittura. Insoluta: <b>D 11.20 Crediti insoluti</b> / A 11.10 (o A 10 se era scontata: la banca la riaddebita) + spese di protesto, che si chiedono al debitore. Se poi il credito è perso: Finanza → Crediti dubbi.')) +
      L.scheda('✍️', 'Paghiamo un fornitore con una cambiale', 'cambiale passiva', L.modulo('cp', [['fattura', 'Fattura del fornitore', 'select', '', vuota(debiti.map(function (p) { return [p.doc, etPart(p)]; }), '— nessun debito aperto —')],
        ['tipo', 'Tipo', 'select', 'paghero', [['paghero', 'pagherò: lo firmiamo noi (bollo 11‰ nostro)'], ['tratta', 'tratta del fornitore, accettata da noi (bollo suo)']]], ['scadenza', 'Scadenza', 'date'], ['importo', 'Importo € (vuoto = tutto)', 'num'], ['banca', 'Banca per il bollo', 'select', '10', banche()], ['data', 'Data', 'date']], [['cp', 'Emetti la cambiale']]) +
        L.modulo('pc', [['cambiale', 'Cambiale passiva da pagare', 'select', '', U.lista(pas.filter(function (c) { return c.stato === 'da pagare'; }), et, '— nessuna cambiale passiva —')], ['banca', 'Banca', 'select', '10', banche()], ['data', 'Data', 'date']], [['pc', 'Paga alla scadenza']]) +
        nota('D 20 Fornitore / A 20.10 Cambiali passive; alla scadenza D 20.10 / A 10. Un pagherò non pagato ci espone al protesto: va nel registro informatico dei protesti.')) + '</div>' +
      L.scheda('📋', 'Portafoglio cambiali', 'registro effetti', L.tabella(['Cambiale', 'Tipo', 'Verso', 'Partner', 'Fattura', 'Importo›', 'Emessa', 'Scadenza', 'Bollo›', 'Stato'], X.cambiali.map(function (c) {
        return [c.numero, c.tipo === 'paghero' ? 'pagherò' : 'tratta', c.verso, e(c.nome), c.fattura, eur(c.importo), fd(c.emissione), fd(c.scadenza), eur(c.bollo) + (c.bolloNostro ? ' (nostro)' : ''), c.stato + (c.sconto ? ' · netto ' + eur(c.sconto.netto) : '')]; }), 'Nessuna cambiale.') +
        nota('Cambiali attive (11.10): ' + eur(N.saldo('11.10')) + ' € · Crediti insoluti (11.20): ' + eur(N.saldo('11.20')) + ' € · Cambiali passive (20.10): ' + eur(-N.saldo('20.10')) + ' €.'));
    L.collega(radice, 'rc', {rc: F.riceviCambiale}, rendi); L.collega(radice, 'sc', {sc: F.scontaCambiale}, rendi);
    L.collega(radice, 'es', {es: function (v) { return v.risultato === 'insoluta' ? F.insolutaCambiale(v) : F.incassaCambiale(v); }}, rendi);
    L.collega(radice, 'cp', {cp: F.emettiCambialePassiva}, rendi); L.collega(radice, 'pc', {pc: F.pagaCambialePassiva}, rendi);
  };

  // ─────────────── ASSEGNI ───────────────
  PAGINE.assegni = function () {
    var X = F.X(), circ = X.assegni.filter(function (a) { return a.verso === 'emesso' && a.stato === 'in circolazione'; }), dav = X.assegni.filter(function (a) { return a.verso === 'ricevuto' && a.stato === 'da versare'; });
    radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
      L.scheda('🖋️', 'Emetti un assegno a un fornitore', 'bancario · circolare', L.modulo('ae', [['fornitore', 'Fornitore', 'select', '', fornitori()], ['fattura', 'Fattura che paghi (numero)', 'text'],
        ['tipo', 'Tipo di assegno', 'select', 'bancario', [['bancario', 'bancario (lo firmiamo noi sul nostro conto)'], ['circolare', 'circolare (lo emette la banca)']]], ['importo', 'Importo € (vuoto = la fattura o tutto il debito)', 'num'],
        ['numero', 'Numero dell\'assegno', 'text'], ['commissione', 'Commissione € (solo circolare)', 'num'], ['banca', 'Conto', 'select', '10', banche()], ['data', 'Data', 'date']], [['ae', 'Emetti l\'assegno']]) +
        nota('Bancario: <b>D 20 / A 18.10 Assegni emessi in circolazione</b>; la banca lo addebita solo quando il fornitore lo versa (D 18.10 / A 10). Nel frattempo il saldo dell\'estratto conto è più alto del saldo «vero»: per questo si riconcilia. Circolare: la banca lo emette subito con i nostri soldi (D 20 / A 10). Sopra 1.000 € l\'assegno deve essere «non trasferibile».')) +
      L.scheda('🏦', 'La banca addebita l\'assegno', 'estratto conto', L.modulo('ad', [['assegno', 'Assegno in circolazione', 'select', '', U.lista(circ, function (a) { return a.numero + ' · ' + a.nome + ' · ' + eur(a.importo) + ' · del ' + fd(a.data); }, '— nessun assegno in circolazione —')], ['data', 'Data dell\'addebito', 'date']], [['ad', 'Registra l\'addebito']]) +
        nota('D 18.10 / A 10: l\'assegno esce dalla «circolazione» e il conto corrente scende.')) + '</div>' +
      '<div class="lab-griglia">' +
      L.scheda('📥', 'Un cliente paga con un assegno', 'assegni ricevuti', L.modulo('ar', [['cliente', 'Cliente', 'select', '', clienti()], ['fattura', 'Fattura incassata (numero)', 'text'], ['importo', 'Importo € (vuoto = tutto il credito)', 'num'], ['numero', 'Numero dell\'assegno', 'text'], ['data', 'Data', 'date']], [['ar', 'Registra l\'assegno ricevuto']]) +
        nota('D 11.30 Assegni da versare / A 11 Cliente.')) +
      L.scheda('🏧', 'Versa gli assegni in banca', 'distinta di versamento', L.modulo('av', [['banca', 'Conto', 'select', '10', banche()], ['data', 'Data del versamento', 'date']], [['av', 'Versa tutti gli assegni']]) +
        nota('Da versare: ' + (dav.length ? dav.map(function (a) { return a.numero + ' ' + eur(a.importo); }).join(', ') : 'nessuno') + '. D 10 / A 11.30.')) + '</div>' +
      L.scheda('📋', 'Registro assegni', '', L.tabella(['Assegno', 'Verso', 'Tipo', 'Partner', 'Fattura', 'Importo›', 'Data', 'Stato'], X.assegni.map(function (a) {
        return [a.numero, a.verso, a.tipo, e(a.nome), a.fattura || '', eur(a.importo), fd(a.data), a.stato + (a.addebito && a.tipo === 'bancario' ? ' il ' + fd(a.addebito) : '') + (a.versamento ? ' il ' + fd(a.versamento) : '')]; }), 'Nessun assegno.') +
        nota('Assegni emessi in circolazione (18.10): ' + eur(-N.saldo('18.10')) + ' € · Assegni da versare (11.30): ' + eur(N.saldo('11.30')) + ' € · Banca 10 contabile: ' + eur(N.saldo('10')) + ' €.'));
    L.collega(radice, 'ae', {ae: F.emettiAssegno}, rendi); L.collega(radice, 'ad', {ad: F.addebitaAssegno}, rendi); L.collega(radice, 'ar', {ar: F.riceviAssegno}, rendi); L.collega(radice, 'av', {av: F.versaAssegni}, rendi);
  };

  // ─────────────── MUTUI ───────────────
  var tabPiano = function (piano, max) { return L.tabella(['Rata', 'Scadenza', 'Rata›', 'Quota capitale›', 'Interessi›', 'Debito residuo›', 'Pagata'], piano.slice(0, max || 999).map(function (q) {
    return [q.n, fd(q.scadenza), eur(q.rata), eur(q.capitale), eur(q.interessi), eur(q.residuo), q.pagata ? fd(q.pagata) : '']; })); };
  PAGINE.mutui = function () {
    var X = F.X(), m = X.mutui.find(function (x) { return x.numero === radice.dataset.mutuo; }) || X.mutui.slice(-1)[0], alla = ultima();
    var et = function (x) { return x.numero + ' · ' + e(x.ente) + ' · ' + eur(x.importo) + ' al ' + x.tasso + '%'; };
    var dq = m ? F.scadenzeDebito(m, alla) : null, im = m ? F.interessiMaturati(m, alla) : null, pr = m ? F.prossimaRata(m) : null;
    radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
      L.scheda('🏠', 'Chiedi un mutuo', 'erogazione · piano di ammortamento', L.modulo('mu', [['ente', 'Banca che concede il mutuo', 'text', 'Banca Popolare dell\'Umbria'], ['importo', 'Importo €', 'num'], ['tasso', 'Tasso annuo %', 'num'], ['rate', 'Numero di rate', 'num'],
        ['periodicita', 'Rate', 'select', '1', [['1', 'mensili'], ['3', 'trimestrali'], ['6', 'semestrali'], ['12', 'annuali']]], ['primaRata', 'Prima rata (vuoto = dopo un periodo)', 'date'], ['spese', 'Spese di istruttoria €', 'num'], ['banca', 'Conto di accredito', 'select', '10', banche()], ['data', 'Data di erogazione', 'date']],
        [['calcola', 'Calcola il piano', 'sec'], ['mu', 'Eroga il mutuo']]) +
        nota('Ammortamento <b>francese</b>: rata costante = C × i / (1 − (1 + i)<sup>−n</sup>), con i = tasso annuo × mesi / 12. All\'inizio la rata è quasi tutta interessi, alla fine quasi tutta capitale. Erogazione: <b>D 10 / A 37.10 Mutui passivi</b>; spese di istruttoria D 58 / A 10.')) +
      L.scheda('💶', 'Paga la rata', 'quota capitale + interessi', L.modulo('mr', [['mutuo', 'Mutuo', 'select', m ? m.numero : '', U.lista(X.mutui, et, '— nessun mutuo —')], ['data', 'Data dell\'addebito', 'date']], [['mr', 'Paga la rata in scadenza']]) +
        nota('<b>D 37.10 quota capitale + D 74 Interessi passivi su mutui / A 10 rata</b>. Solo gli interessi sono un costo: la quota capitale restituisce il debito.' + (pr ? ' Prossima: rata n. ' + pr.n + ' del ' + fd(pr.scadenza) + ', ' + eur(pr.rata) + ' (capitale ' + eur(pr.capitale) + ', interessi ' + eur(pr.interessi) + ').' : '')) +
        L.modulo('mt', [['mutuo', 'Mutuo', 'select', m ? m.numero : '', U.lista(X.mutui, et, '— nessun mutuo —')], ['data', 'Data di bilancio', 'date', alla.slice(0, 4) + '-12-31']], [['mt', 'Registra il rateo di interessi']]) +
        nota('Al 31/12 gli interessi della rata in corso sono maturati in parte ma si pagheranno l\'anno dopo: <b>rateo passivo</b> (D 74 / A 39), a giorni. Si storna il 1° gennaio con gli altri ratei.' + (im ? ' Oggi (' + fd(alla) + '): interessi della rata ' + im.rata + ' ' + eur(im.interessi) + ' × ' + im.maturati + '/' + im.giorni + ' giorni = <b>' + eur(im.quota) + '</b>.' : ''))) + '</div>' +
      '<div id="mu-anteprima"></div>' +
      (m ? L.scheda('📈', 'Piano del mutuo ' + m.numero, e(m.ente) + ' · rata ' + eur(m.rata), '<div class="lab-filtro"><label>Mutuo <select id="mu-scelta">' + X.mutui.map(function (x) { return '<option value="' + x.numero + '"' + (x === m ? ' selected' : '') + '>' + x.numero + '</option>'; }).join('') + '</select></label></div>' + tabPiano(m.piano) +
        nota('Al ' + fd(alla) + ': debito residuo <b>' + eur(dq.residuo) + '</b>, di cui <b>entro 12 mesi ' + eur(dq.entro) + '</b> e <b>oltre 12 mesi ' + eur(dq.oltre) + '</b> (art. 2424 c.c., voce D4 «debiti verso banche»: va indicata la parte esigibile oltre l\'esercizio successivo). Interessi totali del piano: ' + eur(m.totaleInteressi) + '.')) : '');
    var sel = radice.querySelector('#mu-scelta'); if (sel) sel.onchange = function () { radice.dataset.mutuo = this.value; rendi(); };
    L.collega(radice, 'mu', {calcola: function (v) { var c = F.calcolaMutuo(v); radice.querySelector('#mu-anteprima').innerHTML = L.scheda('🧮', 'Anteprima del piano', 'rata ' + eur(c.rata), tabPiano(c.piano) + nota('Interessi totali ' + eur(c.totaleInteressi) + '. Niente è ancora registrato.')); return info('Piano calcolato: rata ' + eur(c.rata) + ', interessi totali ' + eur(c.totaleInteressi) + '.'); }, mu: F.accendiMutuo}, rendi);
    L.collega(radice, 'mr', {mr: F.pagaRata}, rendi); L.collega(radice, 'mt', {mt: F.rateoMutuo}, rendi);
  };

  // ─────────────── LEASING ───────────────
  PAGINE.leasing = function () {
    var X = F.X(), et = function (x) { return x.numero + ' · ' + e(x.bene) + ' · ' + e(x.nome); }, x = X.leasing.slice(-1)[0];
    radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
      L.scheda('🚜', 'Firma il contratto di leasing', 'maxicanone · canoni · riscatto', L.modulo('ls', [['societa', 'Società di leasing', 'select', 'F810', fornitori()], ['bene', 'Bene', 'text'], ['valore', 'Valore del bene €', 'num'], ['maxicanone', 'Maxicanone iniziale €', 'num'],
        ['canone', 'Canone mensile €', 'num'], ['canoni', 'Numero di canoni', 'num', 35], ['riscatto', 'Prezzo di riscatto €', 'num'], ['durata', 'Durata del contratto in mesi', 'num', 36], ['iva', 'IVA %', 'num', 22],
        ['classe', 'Classe del bene al riscatto', 'select', 'MEZ', [['MEZ', 'Mezzi di movimentazione interna'], ['IMP', 'Impianti e macchinari']]], ['banca', 'Conto per l\'SDD', 'select', '10', banche()], ['data', 'Data di consegna del bene', 'date']], [['ls', 'Firma e paga il maxicanone']]) +
        nota('Metodo <b>patrimoniale</b> (codice civile, OIC 12): il bene NON entra tra i cespiti finché non lo riscatti; maxicanone e canoni sono costi per godimento di beni di terzi: <b>D 88 Canoni di leasing + D 14 IVA / A 10</b> (addebito SDD).')) +
      L.scheda('📅', 'Canoni, risconto e riscatto', '', L.modulo('lc', [['leasing', 'Contratto', 'select', '', U.lista(X.leasing, et, '— nessun contratto —')], ['data', 'Data dell\'addebito', 'date']], [['lc', 'Paga il canone in scadenza']]) +
        L.modulo('lr', [['leasing', 'Contratto', 'select', '', U.lista(X.leasing, et, '— nessun contratto —')], ['data', 'Data di bilancio', 'date', ultima().slice(0, 4) + '-12-31']], [['lr', 'Risconta il maxicanone']]) +
        nota('Il maxicanone paga in anticipo una parte di tutto il contratto: al 31/12 la quota dei giorni futuri diventa <b>risconto attivo</b> (D 06 / A 88), a giorni sulla durata. Si storna il 1° gennaio e si ricalcola ogni fine anno.') +
        L.modulo('lx', [['leasing', 'Contratto', 'select', '', U.lista(X.leasing.filter(function (y) { return !y.riscattato; }), et, '— nessun contratto da riscattare —')], ['data', 'Data del riscatto', 'date']], [['lx', 'Riscatta il bene']]) +
        nota('Riscatto = acquisto di un cespite usato al prezzo di riscatto: entra in Cespiti e si ammortizza da lì.')) + '</div>' +
      L.scheda('📋', 'Contratti di leasing', '', L.tabella(['Contratto', 'Bene', 'Società', 'Valore›', 'Maxicanone›', 'Canone›', 'Canoni pagati', 'Riscatto›', 'Dal', 'Al', 'Stato'], X.leasing.map(function (y) {
        return [y.numero, e(y.bene), e(y.nome), eur(y.valore), eur(y.maxicanone), eur(y.canone), y.canoni.filter(function (c) { return c.pagato; }).length + '/' + y.canoni.length, eur(y.riscatto), fd(y.inizio), fd(y.fine), y.riscattato ? 'riscattato il ' + fd(y.riscattato) : 'in corso']; }), 'Nessun contratto.')) +
      (x ? (function () { var f = F.finanziario(x); return L.scheda('🔍', 'Lo stesso contratto con il metodo finanziario', 'IFRS 16 · nota integrativa', L.tabella(['Anno', 'Interessi impliciti›', 'Quota capitale›'], f.perAnno.map(function (r) { return [r.anno, eur(r.interessi), eur(r.capitale)]; })) +
        nota('Con il metodo finanziario (principi IFRS 16, e in nota integrativa per chi usa il codice civile) il bene ' + e(x.bene) + ' andrebbe all\'attivo per ' + eur(x.valore) + ' e si ammortizzerebbe; il debito verso la società di leasing partirebbe da ' + eur(f.debitoIniziale) + ' (valore − maxicanone); ogni canone sarebbe in parte interessi e in parte rimborso. Tasso implicito ' + f.tassoAnnuo + '% annuo. Qui si legge soltanto: in contabilità resta il metodo patrimoniale.')); })() : '');
    L.collega(radice, 'ls', {ls: F.contrattoLeasing}, rendi); L.collega(radice, 'lc', {lc: F.pagaCanone}, rendi); L.collega(radice, 'lr', {lr: F.riscontoMaxicanone}, rendi); L.collega(radice, 'lx', {lx: F.riscatta}, rendi);
  };

  // ─────────────── RITENUTE ───────────────
  PAGINE.ritenute = function () {
    var X = F.X(), daPagare = X.parcelle.filter(function (p) { return !p.pagata; }), mesi = {};
    X.parcelle.filter(function (p) { return p.pagata && !p.versata; }).forEach(function (p) { mesi[p.pagata.slice(0, 7)] = 1; });
    var meseDef = Object.keys(mesi).sort()[0] || ultima().slice(0, 7);
    radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
      L.scheda('🧑‍💼', 'Registra la parcella del professionista', 'onorario · cassa · IVA · ritenuta', L.modulo('rp', [['professionista', 'Professionista', 'select', 'F800', fornitori(function (f) { return f.professionista; })], ['rif', 'Numero della parcella', 'text'], ['testo', 'Prestazione', 'text', 'assistenza alla costituzione della società'],
        ['onorario', 'Onorario €', 'num'], ['cassa', 'Contributo cassa previdenza %', 'num', 4], ['iva', 'IVA %', 'num', 22], ['ritenuta', 'Ritenuta d\'acconto %', 'num', 20], ['data', 'Data della parcella', 'date']], [['rp', 'Registra la parcella']]) +
        nota('Il costo è onorario + cassa (D 54); l\'IVA si calcola anche sulla cassa. Il debito verso il professionista è il <b>totale</b>: D 54 + D 14 / A 20. La ritenuta (20% del solo onorario, non della cassa né dell\'IVA) si toglie <b>quando si paga</b>.')) +
      L.scheda('💸', 'Paga la parcella al netto', 'sostituto d\'imposta', L.modulo('pp', [['parcella', 'Parcella da pagare', 'select', '', U.lista(daPagare, function (p) { return p.rif + ' · ' + p.nome + ' · totale ' + eur(p.totale) + ' · netto ' + eur(p.netto); }, '— nessuna parcella da pagare —', function (p) { return p.rif; })],
        ['mezzo', 'Mezzo di pagamento', 'select', 'bonifico', [['bonifico', 'bonifico'], ['assegno', 'assegno bancario']]], ['numero', 'Numero dell\'assegno', 'text'], ['banca', 'Conto', 'select', '10', banche()], ['data', 'Data del pagamento', 'date']], [['pp', 'Paga la parcella']]) +
        nota('L\'azienda fa da <b>sostituto d\'imposta</b>: paga al professionista il netto e trattiene la ritenuta per conto dello Stato. <b>D 20 totale / A 29.10 Erario c/ritenute / A 10 netto</b> (con l\'assegno: A 18.10).') +
        L.modulo('vr', [['mese', 'Mese dei pagamenti (AAAA-MM)', 'text', meseDef], ['banca', 'Conto', 'select', '10', banche()], ['data', 'Data del versamento', 'date']], [['vr', 'Versa con F24 (1040)']]) +
        nota('Entro il <b>16 del mese dopo il pagamento</b> la ritenuta si versa con F24, codice tributo <b>1040</b>: D 29.10 / A 10. Nella Certificazione Unica di marzo si certifica al professionista.')) + '</div>' +
      L.scheda('📋', 'Parcelle e ritenute', '', L.tabella(['Parcella', 'Professionista', 'Data', 'Onorario›', 'Cassa›', 'IVA›', 'Totale›', 'Ritenuta›', 'Netto›', 'Pagata', 'F24 1040'], X.parcelle.map(function (p) {
        return [p.rif, e(p.nome), fd(p.data), eur(p.onorario), eur(p.cassa), eur(p.iva), eur(p.totale), eur(p.ritenuta), eur(p.netto), p.pagata ? fd(p.pagata) + ' (' + p.mezzo + ')' : '', p.versata ? fd(p.versata) : p.pagata ? 'entro il ' + fd(F.scadenzaF24(p.pagata.slice(0, 7))) : '']; }), 'Nessuna parcella.') +
        nota('Erario c/ritenute lavoro autonomo (29.10): ' + eur(-N.saldo('29.10')) + ' €.'));
    L.collega(radice, 'rp', {rp: F.registraParcella}, rendi); L.collega(radice, 'pp', {pp: F.pagaParcella}, rendi); L.collega(radice, 'vr', {vr: F.versaRitenute}, rendi);
  };

  // ─────────────── BOLLI ───────────────
  PAGINE.bolli = function () {
    var a = ultima().slice(0, 4), q = Math.ceil(+ultima().slice(5, 7) / 3), per = radice.dataset.trim || a + '-T' + q, b;
    try { b = F.riepilogoBolli(per); } catch (err) { b = F.riepilogoBolli(a + '-T' + q); per = b.periodo; }
    radice.innerHTML = U.avviso(S()) + '<div class="lab-filtro"><label>Trimestre <input id="bo-per" type="text" value="' + per + '"></label></div>' + '<div class="lab-griglia">' +
      L.scheda('🔖', 'Bollo virtuale sulle fatture del ' + b.periodo, 'F24 ' + b.tributo + ' · scadenza ' + fd(b.scadenza), L.tabella(['Fattura', 'Data', 'Cliente', 'Totale senza IVA›'], b.fatture.map(function (f) { return [f.doc, fd(f.data), e(U.nome(S(), f.cliente)), eur(f.totale)]; }), 'Nessuna fattura senza IVA oltre 77,47 € nel trimestre.') +
        nota('Ogni fattura <b>senza IVA</b> (esente art. 10, non imponibile export art. 8, fuori campo) di importo superiore a <b>77,47 €</b> sconta <b>2 €</b> di bollo. Con la fattura elettronica il bollo si paga in modo virtuale con F24 per trimestre (codici 2521-2524). Spesso si riaddebita al cliente in fattura. Le cessioni intracomunitarie (art. 41) non pagano bollo.') +
        L.modulo('bv', [['banca', 'Conto', 'select', '10', banche()], ['data', 'Data del versamento', 'date']], [['bv', 'Versa ' + eur(b.bolloFatture) + ' con F24 ' + b.tributo]]) + (b.versato ? nota('✓ Versato il ' + fd(b.versato.data) + '.') : '')) +
      L.scheda('📜', 'Bollo sulle cambiali del trimestre', 'marca da bollo', L.tabella(['Cambiale', 'Tipo', 'Importo›', 'Aliquota', 'Bollo›'], b.cambiali.map(function (c) { return [c.numero, c.tipo === 'paghero' ? 'pagherò' : 'tratta', eur(c.importo), F.ALIQ_BOLLO[c.tipo] + '‰', eur(c.bollo)]; }), 'Nessuna cambiale con bollo a nostro carico.') +
        nota('Sulle cambiali il bollo si paga <b>prima</b> di firmarle, con le marche da bollo per cambiali (oppure il modulo già bollato): è già registrato insieme alla cambiale (D 87 / A 10). Totale del trimestre: ' + eur(b.bolloCambiali) + '. Una cambiale senza bollo non è titolo esecutivo.')) + '</div>' +
      L.scheda('📋', 'Bolli virtuali versati', '', L.tabella(['Trimestre', 'Fatture', 'Importo›', 'Versato il'], F.X().bolli.map(function (x) { return [x.periodo, x.fatture, eur(x.importo), fd(x.data)]; }), 'Nessun versamento.') + nota('Imposta di bollo a conto economico (87): ' + eur(N.saldo('87')) + ' €.'));
    radice.querySelector('#bo-per').onchange = function () { radice.dataset.trim = this.value.trim().toUpperCase(); rendi(); };
    L.collega(radice, 'bv', {bv: function (v) { v.trimestre = b.periodo; return F.versaBolloVirtuale(v); }}, rendi);
  };

  // ─────────────── CREDITI DUBBI ───────────────
  PAGINE.crediti = function () {
    var a = ultima().slice(0, 4), l = F.limiteSvalutazione(a), cr = F.crediteInesigibili(ultima());
    radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
      L.scheda('⚠️', 'Accantona al fondo svalutazione crediti', 'art. 106 TUIR · OIC 15', L.tabella(['Voce', 'Importo›'], [['Crediti verso clienti al 31/12/' + a + ' (11 + 11.10 + 11.20)', eur(l.crediti)], ['Fondo all\'inizio', eur(l.fondoPrima)],
        ['Limite fiscale dell\'anno: 0,5% dei crediti', eur(l.limiteAnnuo)], ['Tetto del fondo: 5% dei crediti', eur(l.tetto)], ['Accantonabile in deduzione IRES', '<b>' + eur(l.deducibile) + '</b>'], ['Già accantonato nell\'anno', eur(l.accantonato)]]) +
        L.modulo('sv', [['importo', 'Accantonamento € (vuoto = il limite fiscale)', 'num'], ['data', 'Data', 'date', a + '-12-31']], [['sv', 'Registra la svalutazione']]) +
        nota('Prudenza (art. 2426 c.c. n. 8): i crediti vanno al <b>presumibile valore di realizzo</b>. <b>D 89 Svalutazione crediti / A 11.90 Fondo svalutazione crediti</b>. Per l\'IRES si deduce lo 0,5% dei crediti finché il fondo non arriva al 5%: oltre, variazione in aumento. Per l\'IRAP le svalutazioni e le perdite su crediti non sono mai deducibili. Il programma le mette da solo nel calcolo delle imposte.')) +
      L.scheda('🗑️', 'Il credito è perso: stralcialo', 'perdite su crediti', L.modulo('pe', [['credito', 'Credito', 'select', '', vuota(cr.map(function (x) { return [x.id, x.nome + ' · ' + x.etichetta + ' · ' + eur(x.aperto)]; }), '— nessun credito aperto —')], ['motivo', 'Motivo', 'text', 'cliente fallito, procedura chiusa senza riparto'], ['data', 'Data', 'date']], [['pe', 'Stralcia il credito']]) +
        nota('Prima si usa il fondo: <b>D 11.90</b> fino a capienza, il resto <b>D 62 Perdite su crediti</b> / A 11 (o A 11.20 per una cambiale insoluta). La perdita è deducibile se ci sono «elementi certi e precisi» (procedura concorsuale, credito modesto scaduto da 6 mesi, prescrizione). Con la procedura concorsuale si recupera anche l\'IVA con una nota di variazione.')) + '</div>' +
      L.scheda('📋', 'Movimenti', '', L.tabella(['Data', 'Operazione', 'Importo›'], F.X().svalutazioni.map(function (s) { return [fd(s.data), 'accantonamento ' + s.anno, eur(s.importo)]; }).concat(F.X().perdite.map(function (p) { return [fd(p.data), 'stralcio ' + e(p.nome) + ' (fondo ' + eur(p.fondo) + ', perdita ' + eur(p.perdita) + ')', eur(p.importo)]; })), 'Nessun movimento.') +
        nota('Fondo svalutazione crediti (11.90): ' + eur(-N.saldo('11.90')) + ' € · Crediti verso clienti al netto del fondo: ' + eur(N.saldo('11') + N.saldo('11.10') + N.saldo('11.20') + N.saldo('11.90')) + ' €.'));
    L.collega(radice, 'sv', {sv: F.svaluta}, rendi); L.collega(radice, 'pe', {pe: F.perdita}, rendi);
  };

  // ─────────────── INTRACOMUNITARI ───────────────
  PAGINE.intra = function () {
    var X = F.X(), mese = radice.dataset.mese || ultima().slice(0, 7), el = F.intrastat(mese);
    var costi = S().pianoDeiConti.filter(function (c) { return c.tipo === 'COSTO' && ['54', '58', '86', '83', '70'].indexOf(c.codice) >= 0; }).map(function (c) { return [c.codice, c.codice + ' ' + c.nome]; });
    radice.innerHTML = U.avviso(S()) + '<div class="lab-griglia">' +
      L.scheda('🇪🇺', 'Acquisto da un fornitore UE', 'integrazione TD18 · reverse charge', L.modulo('ia', [['fornitore', 'Fornitore UE', 'select', '', vuota(fornitori(function (f) { return f.ue; }), '— nessun fornitore UE —')], ['rif', 'Numero della fattura', 'text'], ['conto', 'Conto di costo', 'select', '54', costi],
        ['testo', 'Descrizione', 'text'], ['imponibile', 'Imponibile €', 'num'], ['iva', 'Aliquota IVA italiana %', 'num', 22], ['scadenza', 'Scadenza', 'date'], ['data', 'Data di ricezione', 'date']], [['ia', 'Registra e integra']]) +
        nota('Il fornitore UE fattura <b>senza IVA</b>: l\'IVA la applichiamo noi integrando la fattura (documento TD18 allo SdI) e la registriamo sia a debito sia a credito: <b>D costo + D 14 / A 20 imponibile + A 21 IVA</b>. Effetto netto zero, ma l\'operazione resta tracciata.')) +
      L.scheda('🚚', 'Vendita a un cliente UE', 'non imponibile art. 41', L.modulo('ic', [['cliente', 'Cliente UE', 'select', '', vuota(clienti(function (c) { return c.ue; }), '— nessun cliente UE —')], ['testo', 'Descrizione', 'text', 'transenne'], ['imponibile', 'Imponibile €', 'num'], ['scadenza', 'Scadenza', 'date'], ['data', 'Data', 'date']], [['ic', 'Emetti la fattura']]) +
        nota('Cessione intracomunitaria: <b>D 11 / A 40</b> senza IVA (art. 41 DL 331/93), purché il cliente abbia la partita IVA comunitaria valida su VIES e la merce esca davvero dall\'Italia (prova del trasporto). Nessun bollo.')) + '</div>' +
      L.scheda('📑', 'Elenchi Intrastat del mese', 'modelli INTRA-1 e INTRA-2', '<div class="lab-filtro"><label>Mese <input id="ic-mese" type="month" value="' + mese + '"></label></div>' + L.tabella(['Elenco', 'Partner', 'Paese', 'Fattura', 'Data', 'Imponibile›'], el.map(function (x) {
        return [x.verso === 'acquisto' ? 'INTRA-2 acquisti' : 'INTRA-1 cessioni', e(x.nome), x.paese, x.rif, fd(x.data), eur(x.imponibile)]; }), 'Nessuna operazione intracomunitaria nel mese.') +
        nota('Gli elenchi Intrastat si presentano entro il 25 del mese successivo (mensili sopra le soglie di legge). In questo esercizio gli scambi UE sono solo da provare: li useremo nelle esercitazioni di più mesi.'));
    radice.querySelector('#ic-mese').onchange = function () { radice.dataset.mese = this.value; rendi(); };
    L.collega(radice, 'ia', {ia: F.acquistoIntra}, rendi); L.collega(radice, 'ic', {ic: F.cessioneIntra}, rendi);
  };

  function rendi() { (PAGINE[C.pagina] || PAGINE.cambiali)(); }
  rendi();
})();
