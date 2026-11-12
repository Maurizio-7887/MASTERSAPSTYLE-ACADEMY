/* SISTEMA INTEGRATO — Magazzino WMS: «La ragioneria del tuo magazzino · il libro giornale spiegato».
   Pagina di SOLA LETTURA per i magazzinieri (Pistoia 80 ore, fine esercitazione): prende le scritture che il programma
   ha registrato da solo durante il lavoro e le spiega operazione per operazione, a parole semplici, con i conti e gli
   importi veri dell'allieva. Raggruppa per fase (?fase=nascita|acquisti|scarti|produzione|spedizione|inventario),
   mostra che cosa NON scrive niente e i saldi finali dei conti di magazzino. Non registra, non corregge, non fa quiz. */
window.WMGiornale = (function () {
  'use strict';
  var FASI = [
    {k: 'nascita', ic: '🏛️', t: 'La nascita dell’azienda', tipi: ['COSTITUZIONE', 'VERSAMENTO_SOCI', 'APERTURA']},
    {k: 'acquisti', ic: '🚛', t: 'Gli acquisti: il ferro entra in magazzino', tipi: ['ENTRATA_ACQUISTO', 'FATTURA_FORNITORE']},
    {k: 'scarti', ic: '🗑️', t: 'Il ferro schiacciato: la rottamazione', tipi: ['ROTTAMAZIONE']},
    {k: 'produzione', ic: '🏭', t: 'La produzione: consumi, ore dei reparti e prodotti finiti', tipi: ['PRELIEVO_261', 'CONFERMA', 'ENTRATA_PRODUZIONE']},
    {k: 'spedizione', ic: '🚚', t: 'La spedizione: il costo del venduto', tipi: ['USCITA_MERCI']},
    {k: 'inventario', ic: '📝', t: 'L’inventario: la differenza trovata alla conta', tipi: ['DIFFERENZA_INVENTARIO']}
  ];
  var OPERAZIONE = {
    COSTITUZIONE: 'Costituzione della società', VERSAMENTO_SOCI: 'Versamento del capitale', APERTURA: 'Saldi di apertura',
    ENTRATA_ACQUISTO: 'MIGO 101 · entrata merci da ordine d’acquisto', FATTURA_FORNITORE: 'MIRO · fattura del fornitore',
    ROTTAMAZIONE: 'Movimento 555 · rottamazione', PRELIEVO_261: 'MIGO 261 · prelievo del ferro per la produzione',
    CONFERMA: 'CO11N · conferma delle ore di un reparto', ENTRATA_PRODUZIONE: 'MIGO 101 · entrata dalla produzione',
    USCITA_MERCI: 'Movimento 601 · uscita merci per la consegna', DIFFERENZA_INVENTARIO: 'Movimento 711 · differenza inventariale'
  };

  function render(radice, N, L) {
    var e = L.esc, eur = L.eur, fd = L.fd, S = N.S;
    var conti = {};
    (S.pianoDeiConti || []).forEach(function (c) { conti[c.codice] = c.nome; });
    var nome = function (c) { return conti[c] || ''; };
    var regs = (S.registrazioni || []).slice();
    var importo = function (r, conto, lato) {
      return (r.righe || []).filter(function (x) { return x.conto === conto && (!lato || x.dareAvere === lato); })
        .reduce(function (t, x) { return t + x.importo; }, 0);
    };
    var num = function (testo, re) { var m = re.exec(testo || ''); return m ? m[1] : ''; };

    // ── la spiegazione di una scrittura, con i suoi numeri ──
    function perche(r) {
      var d = r.descrizione || '';
      switch (r.tipo) {
        case 'COSTITUZIONE':
          return 'Nasce l’azienda: i soci si impegnano a versare ' + eur(importo(r, '30')) + ' €. <b>Dare 08</b> = la società vanta un credito verso i soci; <b>Avere 30</b> = il capitale sociale. Non è un’operazione di magazzino: è il punto di partenza di tutti i conti.';
        case 'VERSAMENTO_SOCI':
          return 'I soci versano i soldi in banca: <b>Dare 10 Banca</b>, <b>Avere 08</b> (il credito verso i soci si chiude).';
        case 'ENTRATA_ACQUISTO': {
          var kg = num(d, /entrata ([\d.,]+) kg/), dp = importo(r, '63', 'DARE') - importo(r, '63', 'AVERE');
          return 'Arriva il camion e registri la MIGO: ' + (kg ? kg + ' kg di ferro ' : 'il ferro ') + 'entrano in magazzino. ' +
            '<b>Dare 12 Magazzino ferro ' + eur(importo(r, '12', 'DARE')) + '</b>: il ferro si valuta sempre al <b>costo standard</b> (0,95 €/kg). ' +
            (Math.abs(dp) > 0.004 ? '<b>Dare 63 Differenze prezzo ' + eur(dp) + '</b>: il fornitore lo vende più caro dello standard; la differenza non gonfia il magazzino, va in un conto a parte. ' : '') +
            '<b>Avere 22 Fatture da ricevere ' + eur(importo(r, '22', 'AVERE')) + '</b>: è il debito verso il fornitore al prezzo dell’ordine, in attesa della fattura. ' +
            'Anche i kg schiacciati sono entrati: sono nostri, solo bloccati in quarantena.';
        }
        case 'FATTURA_FORNITORE':
          return 'L’amministrazione registra la fattura (MIRO): il debito «presunto» del conto 22 diventa un debito vero verso il fornitore (conto 20), con l’IVA a credito (14). Il magazzino non cambia.';
        case 'ROTTAMAZIONE':
          return 'Il ferro schiacciato non si ripara: esce dal magazzino come rottame. <b>Avere 12 ' + eur(importo(r, '12', 'AVERE')) + '</b> (il magazzino diminuisce, sempre al costo standard) e <b>Dare 69 Rottamazioni</b>: quel valore diventa un costo, una perdita per l’azienda.';
        case 'PRELIEVO_261': {
          var kg2 = num(d, /— ([\d.,]+) kg/);
          return 'Il ferro lascia la zona di produzione ed entra nella lavorazione' + (kg2 ? ' (' + kg2 + ' kg × 0,95)' : '') + '. <b>Avere 12</b>: esce dal magazzino. <b>Dare 70 Consumi di materie prime</b>: diventa un costo dell’ordine di produzione. Prima, con la pistola RF, lo avevi solo spostato: quello non scriveva niente.';
        }
        case 'CONFERMA': {
          var ore = num(d, /lavorazione ([\d.,]+) h/);
          return 'Il reparto dichiara le ore lavorate' + (ore ? ' (' + ore + ' h × 28 €/h)' : '') + ': il costo del lavoro passa dal reparto all’ordine. <b>Dare 72 Attività addebitate agli ordini</b> e <b>Avere 75 Attività accreditate dai centri</b>: è contabilità industriale, dice <b>quanto costa davvero</b> fare le transenne. Nessuna merce si muove.';
        }
        case 'ENTRATA_PRODUZIONE': {
          var semi = importo(r, '07', 'DARE') > 0;
          return (semi ? 'I kit tagliati' : 'Le transenne finite') + ' entrano in magazzino al costo standard. <b>Dare ' + (semi ? '07 Magazzino semilavorati' : '13 Magazzino prodotti finiti') + ' ' + eur(importo(r, semi ? '07' : '13', 'DARE')) + '</b>: il magazzino aumenta. <b>Avere 73 Output di produzione</b>: l’ordine viene «scaricato» del valore prodotto. ' +
            (semi ? '20 kit × 14,60 €.' : '300 transenne × 31,40 € = ferro (2.280) + ore dei tre reparti (2.100 + 1.680 + 3.360).');
        }
        case 'USCITA_MERCI':
          return 'Il camion parte e la merce esce dal magazzino. <b>Avere 13 ' + eur(importo(r, '13', 'AVERE')) + '</b>: il magazzino prodotti finiti diminuisce. <b>Dare 41 Costo del venduto</b>: quanto ci sono costate le transenne vendute (pezzi × 31,40). Il <b>ricavo</b> nascerà con la fattura di vendita, che fa l’amministrazione: il magazzino registra solo l’uscita.';
        case 'DIFFERENZA_INVENTARIO':
          return 'Alla conta manca un pezzo: con il 711 il gestionale si allinea agli scaffali. <b>Avere 07 ' + eur(importo(r, '07', 'AVERE')) + '</b>: il valore esce dal magazzino. <b>Dare 65 Differenze inventariali</b>: è un costo. Se avessimo trovato un pezzo in più, la scrittura sarebbe al contrario (712).';
        default:
          return e(d);
      }
    }

    function scheda(r) {
      var righe = (r.righe || []).slice().sort(function (a, b) { return (a.dareAvere === 'DARE' ? 0 : 1) - (b.dareAvere === 'DARE' ? 0 : 1); });
      var td = righe.reduce(function (t, x) { return t + (x.dareAvere === 'DARE' ? x.importo : 0); }, 0);
      var ta = righe.reduce(function (t, x) { return t + (x.dareAvere === 'AVERE' ? x.importo : 0); }, 0);
      return '<article class="gm-scrittura" data-tipo="' + e(r.tipo) + '" style="border:1px solid #cfdbe5;border-radius:8px;padding:10px 12px;margin:0 0 10px;background:#fff">' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline"><b>' + fd(r.data) + '</b><span class="lab-bd blu">' + e(OPERAZIONE[r.tipo] || r.tipo) + '</span><small>n. ' + e(r.numero || r.id || '') + '</small></div>' +
        '<p style="margin:6px 0;color:#456">' + e(r.descrizione || '') + '</p>' +
        L.tabella(['', 'Conto', 'Dare›', 'Avere›'], righe.map(function (x) {
          return [x.dareAvere === 'DARE' ? 'D' : 'A', '<b>' + e(x.conto) + '</b> ' + e(nome(x.conto)) + (x.testo ? ' <small>· ' + e(x.testo) + '</small>' : ''),
            x.dareAvere === 'DARE' ? eur(x.importo) : '', x.dareAvere === 'AVERE' ? eur(x.importo) : ''];
        }).concat([['', '<b>Totale</b>', '<b>' + eur(td) + '</b>', '<b>' + eur(ta) + '</b>']])) +
        '<p class="gm-perche" style="margin:8px 0 0;padding:8px 10px;background:#F1FDF6;border-left:4px solid #1d8168;border-radius:4px">💡 <b>Perché:</b> ' + perche(r) + '</p></article>';
    }

    var fase = (/(?:[?&])fase=(\w+)/.exec(location.search) || [])[1] || '';
    var tutti = FASI.map(function (f) { return f.tipi; }).reduce(function (a, b) { return a.concat(b); }, []);
    var altre = regs.filter(function (r) { return tutti.indexOf(r.tipo) < 0; });
    var totD = 0, totA = 0;
    regs.forEach(function (r) { (r.righe || []).forEach(function (x) { if (x.dareAvere === 'DARE') totD += x.importo; else totA += x.importo; }); });

    var link = function (k, t) {
      var q = new URLSearchParams(location.search);
      if (k) q.set('fase', k); else q.delete('fase');
      return '<a href="?' + e(q.toString()) + '" class="lab-bd ' + (fase === k ? 'verde' : 'grigio') + '" style="text-decoration:none">' + t + '</a>';
    };
    var h = '<div class="lab-esito ok" style="font-size:14px"><b>📒 LA RAGIONERIA DEL TUO MAGAZZINO.</b> Mentre lavoravi, il programma ha scritto da solo il <b>libro giornale</b>: ogni volta che la merce <b>cambia valore per l’azienda</b> (entra, esce, si consuma, si produce, si butta, manca alla conta) nasce una <b>scrittura</b>. ' +
      'Ogni scrittura ha due lati: <b>Dare</b> (a sinistra) e <b>Avere</b> (a destra), e i due totali sono <b>sempre uguali</b>: è la <b>partita doppia</b>. Qui sotto trovi le TUE scritture, una per una, con la spiegazione. Non devi scrivere niente: leggi e confronta con quello che hai fatto.</div>' +
      '<div class="kpi4"><div><b>' + regs.length + '</b><span>scritture nel libro giornale</span></div><div><b>' + eur(totD) + '</b><span>totale Dare</span></div><div><b>' + eur(totA) + '</b><span>totale Avere</span></div><div><b>' + (Math.abs(totD - totA) < 0.01 ? '✅ uguali' : '⚠️ diversi') + '</b><span>partita doppia</span></div></div>' +
      '<p>' + link('', 'Tutte') + ' ' + FASI.map(function (f) { return link(f.k, f.ic + ' ' + f.t.split(':')[0]); }).join(' ') + ' ' + link('niente', '🚫 Che cosa NON scrive') + ' ' + link('saldi', '📊 Saldi finali') + '</p>';

    FASI.forEach(function (f, i) {
      if (fase && fase !== f.k) return;
      var lista = regs.filter(function (r) { return f.tipi.indexOf(r.tipo) >= 0; });
      h += L.scheda(f.ic, (i + 1) + ' · ' + f.t, lista.length + (lista.length === 1 ? ' scrittura' : ' scritture'),
        lista.length ? lista.map(scheda).join('') : '<p class="lab-nota">Nessuna scrittura di questa fase: non hai ancora fatto queste operazioni.</p>');
    });
    if (!fase && altre.length) h += L.scheda('📄', 'Altre scritture', altre.length + ' scritture', altre.map(scheda).join(''));

    if (!fase || fase === 'niente') {
      h += L.scheda('🚫', 'Le operazioni che NON scrivono niente nel libro giornale', 'cambia il posto, non il valore',
        '<ul class="lab-elenco"><li><b>Ordini dei clienti e ordini d’acquisto</b>: sono impegni, non c’è ancora merce che si muove.</li>' +
        '<li><b>Pistola RF</b>: messe a scaffale, approvvigionamento della linea, prelievi, trasferimenti, slotting. La merce cambia <b>scaffale</b>, non proprietario né valore.</li>' +
        '<li><b>Quarantena 344 e sblocco 343</b>: la merce resta nostra e vale uguale; cambia solo se si può usare.</li>' +
        '<li><b>Deposito esterno (351 e 101 del trasferimento)</b>: i kit sul camion sono sempre nostri; W100 + in viaggio + D200 = stesso valore.</li>' +
        '<li><b>Imballo, SSCC, camion, RFID, inventario contato</b>: sono informazioni di magazzino. Scrive solo la <b>differenza</b> trovata alla conta (711).</li></ul>' +
        '<p class="lab-nota">Regola semplice: <b>scrive</b> quello che fa salire o scendere il valore del magazzino o crea un costo; <b>non scrive</b> quello che sposta soltanto la merce.</p>');
    }

    if (!fase || fase === 'saldi') {
      var saldo = function (c) { return N.saldo(c); };
      var righeSaldi = [['12', 'quanto vale il ferro rimasto (kg × 0,95)'], ['07', 'quanto valgono i kit tagliati (pezzi × 14,60)'], ['13', 'quanto valgono le transenne a magazzino (pezzi × 31,40)'],
        ['22', 'debito verso il fornitore del ferro, in attesa delle fatture'], ['41', 'costo delle transenne spedite'], ['63', 'quanto abbiamo pagato il ferro più dello standard'],
        ['69', 'valore del ferro buttato'], ['65', 'valore del kit mancante'], ['70', 'ferro consumato dagli ordini'], ['72', 'ore dei reparti addebitate agli ordini'],
        ['75', 'ore accreditate dai reparti'], ['73', 'valore prodotto accreditato agli ordini']].filter(function (x) { return Math.abs(saldo(x[0])) > 0.004; });
      var rim = saldo('12') + saldo('07') + saldo('13');
      h += L.scheda('📊', 'I saldi finali: il magazzino in euro', 'mastrini sintetici dei conti di magazzino',
        L.tabella(['Conto', 'Che cosa vuol dire', 'Saldo›'], righeSaldi.map(function (x) {
          var s = saldo(x[0]);
          return ['<b>' + x[0] + '</b> ' + e(nome(x[0])), x[1], eur(Math.abs(s)) + ' ' + (s >= 0 ? 'Dare' : 'Avere')]; }), 'Nessun saldo.') +
        '<div class="lab-esito ok"><b>Rimanenze di magazzino: ' + eur(rim) + ' €</b> (ferro ' + eur(saldo('12')) + ' + kit ' + eur(saldo('07')) + ' + transenne ' + eur(saldo('13')) + '). È lo stesso valore che trovi contando la merce negli scaffali e moltiplicando per il costo standard: magazzino e contabilità dicono la stessa cosa.</div>' +
        '<p class="lab-nota">I conti 70, 72, 73 e 75 sono della <b>contabilità industriale</b>: costi messi sugli ordini (ferro + ore) e valore prodotto. Quando gli ordini sono chiusi senza scarti si pareggiano: ' + eur(saldo('70') + saldo('72')) + ' di costi = ' + eur(-saldo('73')) + ' di prodotto.</p>');
    }
    radice.innerHTML = h;
  }
  return {render: render, FASI: FASI};
})();
