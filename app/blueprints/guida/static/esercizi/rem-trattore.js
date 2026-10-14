/* Laboratorio «Produzione ripetitiva» — il modello del costruttore di trattori applicato alle transenne:
   budget 4.000 pezzi nei tre tipi, linea unica, niente ordini, collettore per prodotto, conferma a consuntivo. */
(function () {
  var R = 'ripetitiva.';
  var c = function (h, m) { return (h.S.collettori || {})[m]; };
  var eventi = function (h, m, modo, data) { var x = c(h, m); return x ? x.eventi.filter(function (e) { return (!modo || e.modo === modo) && (!data || e.data === data); }) : []; };
  var chiuso = function (h, p) { return (h.S.periodi || []).some(function (x) { return x.periodo === p; }); };
  var mfbf = function (data, df, q, nota) {
    return {g: (df.slice(3, 5) === '01' ? 'Gennaio' : 'Febbraio') + ' — conferme a consuntivo', data: df, titolo: 'MFBF del ' + df.slice(0, 5) + ': ' + q.map(function (x) { return x[1] + ' ' + x[0]; }).join(' · '),
      dove: {ep: R + 'consuntivazione'}, percorso: 'Produzione ripetitiva → Conferma a consuntivo (MFBF)',
      campi: q.map(function (x) { return [x[0], String(x[1]) + ' pz — conferma completa']; }).concat([['Data', df]]),
      attesa: 'Per ogni conferma: D 70 / A 12 ferro a standard · D 72 / A 75 ore a standard · D 13 / A 73 prodotto finito a standard', nota: nota || '',
      fatto: function (h) { return q.every(function (x) { return eventi(h, x[0], 'completa', data).length > 0; }); }};
  };
  window.MSA_ESERCIZIO = {
    codice: 'rem-trattore', titolo: 'Produzione ripetitiva: il modello trattore (4.000 transenne)', versione: 'lab-rem',
    passi: [
      {g: 'Prima di cominciare', data: '', titolo: 'Perché la «ripetitiva»', dove: {ep: R + 'pianificazione'}, percorso: 'Produzione ripetitiva → Budget, piano e versioni',
       campi: [['Il caso', 'come un costruttore di trattori: pochi modelli, volumi stabili, una linea'], ['Oggetto di costo', 'il collettore costi del prodotto, non l\'ordine'],
               ['Controllo', 'per periodo: varianze ogni mese, il collettore non si chiude mai']],
       nota: 'È il contrario del laboratorio Alta varietà. Spunta il passo e cominciamo.'},
      {g: 'Pianificazione', data: '01/01/2027', titolo: 'Budget 2027: 4.000 transenne', dove: {ep: R + 'pianificazione'}, percorso: 'Budget, piano e versioni · Budget annuo',
       campi: [['Anno', '2027'], ['TR-STD', '2000'], ['TR-ALTA', '1200'], ['TR-PED', '800']], attesa: 'Piano mensile della linea: 167 · 100 · 67 pezzi',
       fatto: function (h) { return !!(h.S.budget && h.S.budget.totale === 4000); }},
      {g: 'Pianificazione', data: '01/01/2027', titolo: 'Versioni di produzione sulla linea L1', dove: {ep: R + 'pianificazione'}, percorso: 'Budget, piano e versioni · Versione di produzione (C223)',
       campi: [['Per TR-STD, TR-ALTA, TR-PED', 'Linea L1 · profilo REM · punto di conteggio Piegatura']], attesa: 'Nessuna scrittura: anagrafica.',
       fatto: function (h) { return ['TR-STD', 'TR-ALTA', 'TR-PED'].every(function (m) { return (h.S.versioni || {})[m]; }); }},
      {g: 'Pianificazione', data: '01/01/2027', titolo: 'Tre collettori costi di prodotto (KKF6N)', dove: {ep: R + 'collettori'}, percorso: 'Produzione ripetitiva → Collettori costi (KKF6N)',
       campi: [['Collettori', 'PCC-TR-STD · PCC-TR-ALTA · PCC-TR-PED']], nota: 'Si creano una volta sola e restano aperti per sempre.',
       fatto: function (h) { return ['TR-STD', 'TR-ALTA', 'TR-PED'].every(function (m) { return c(h, m); }); }},
      {g: 'Gennaio — conferme a consuntivo', data: '02/01/2027', titolo: 'Entrata del ferro di gennaio', dove: {ep: R + 'consuntivazione'}, percorso: 'Conferma a consuntivo · Acquisti: entrata ferro',
       campi: [['Data', '02/01/2027'], ['Kg', '3500'], ['Riferimento', 'DDT-FERRO-01']], attesa: 'D 12 / A 20 € 3.325',
       fatto: function (h) { return (h.S.registrazioni || []).filter(function (r) { return r.tipo === 'MIGO_ACQUISTO'; }).length >= 1; }},
      mfbf('2027-01-15', '15/01/2027', [['TR-STD', 80], ['TR-ALTA', 50], ['TR-PED', 30]], 'Niente prelievi né conferme a mano: il backflush scarica ferro e ore della distinta e del ciclo standard.'),
      mfbf('2027-01-31', '31/01/2027', [['TR-STD', 85], ['TR-ALTA', 48], ['TR-PED', 37]]),
      {g: 'Gennaio — fine mese', data: '31/01/2027', titolo: '20 TR-STD fermi al punto di conteggio', dove: {ep: R + 'consuntivazione'}, percorso: 'Conferma a consuntivo · MFBF',
       campi: [['Materiale', 'TR-STD'], ['Quantità', '20'], ['Tipo di conferma', 'fino al punto di conteggio Piegatura'], ['Data', '31/01/2027']],
       attesa: 'Scarica ferro, taglio e piegatura; nessun prodotto finito: 20 telai restano in linea (WIP).', fatto: function (h) { return eventi(h, 'TR-STD', 'punto').length > 0; }},
      {g: 'Gennaio — fine mese', data: '31/01/2027', titolo: 'Scarto: 3 TR-STD rovinati in saldatura', dove: {ep: R + 'consuntivazione'}, percorso: 'Conferma a consuntivo · MFBF',
       campi: [['Materiale', 'TR-STD'], ['Quantità', '3'], ['Tipo di conferma', 'scarto'], ['Data', '31/01/2027']], attesa: 'Consumi e ore senza prodotto: 3 × 31,40 = 94,20 resteranno come varianza.',
       fatto: function (h) { return eventi(h, 'TR-STD', 'scarto').length > 0; }},
      {g: 'Gennaio — fine mese', data: '31/01/2027', titolo: 'Sfrido: 40 kg di ferro in più sulle prolunghe', dove: {ep: R + 'consuntivazione'}, percorso: 'Conferma a consuntivo · Prelievo extra al collettore (MB1A)',
       campi: [['Collettore', 'TR-ALTA'], ['Kg', '40'], ['Motivo', 'sfrido prolunghe'], ['Data', '31/01/2027']], attesa: 'D 70 / A 12 € 38',
       fatto: function (h) { return eventi(h, 'TR-ALTA', 'extra').length > 0; }},
      {g: 'Gennaio — fine mese', data: '31/01/2027', titolo: 'Chiusura di gennaio: WIP al target e varianze di periodo', dove: {ep: R + 'chiusura'}, percorso: 'Produzione ripetitiva → Chiusura di periodo',
       campi: [['Periodo', '2027-01']],
       attesa: 'WIP al target 20 × 20,20 = 404 (D 15 / A 74). Varianze: TR-STD 94,20 (lo scarto) · TR-ALTA 38 (lo sfrido) · TR-PED 0.',
       nota: 'I collettori NON si chiudono: a febbraio continuano a raccogliere costi.', fatto: function (h) { return chiuso(h, '2027-01'); }},
      {g: 'Febbraio — conferme a consuntivo', data: '03/02/2027', titolo: 'Entrata del ferro di febbraio', dove: {ep: R + 'consuntivazione'}, percorso: 'Conferma a consuntivo · Acquisti: entrata ferro',
       campi: [['Data', '03/02/2027'], ['Kg', '3000'], ['Riferimento', 'DDT-FERRO-02']], attesa: 'D 12 / A 20 € 2.850',
       fatto: function (h) { return (h.S.registrazioni || []).filter(function (r) { return r.tipo === 'MIGO_ACQUISTO'; }).length >= 2; }},
      {g: 'Febbraio — conferme a consuntivo', data: '05/02/2027', titolo: 'Completa i 20 telai fermi in linea', dove: {ep: R + 'consuntivazione'}, percorso: 'Conferma a consuntivo · MFBF',
       campi: [['Materiale', 'TR-STD'], ['Quantità', '20'], ['Tipo di conferma', 'dal punto di conteggio al prodotto finito'], ['Data', '05/02/2027']],
       attesa: 'Solo la saldatura: 8 h = 224 € · entrata 20 × 31,40 = 628 €', fatto: function (h) { return eventi(h, 'TR-STD', 'dalPunto').length > 0; }},
      mfbf('2027-02-20', '20/02/2027', [['TR-STD', 150], ['TR-ALTA', 90], ['TR-PED', 60]]),
      {g: 'Febbraio — conferme a consuntivo', data: '28/02/2027', titolo: 'Chiusura di febbraio', dove: {ep: R + 'chiusura'}, percorso: 'Chiusura di periodo',
       campi: [['Periodo', '2027-02']], attesa: 'WIP 0: storno di 404 (D 74 / A 15). Varianze di periodo a zero su tutti e tre i collettori.',
       fatto: function (h) { return chiuso(h, '2027-02'); }},
      {g: 'Confronto', data: '', titolo: 'Cruscotto: trattori contro alta varietà', dove: {ep: R + 'cruscotto'}, percorso: 'Produzione ripetitiva → Cruscotto',
       campi: [['Aderenza al piano', 'pezzi prodotti / piano del mese'], ['Varianza per pezzo', 'stabile e confrontabile mese su mese'], ['Se i codici fossero 2.000', 'collettori quasi vuoti: varianze di periodo senza significato']],
       nota: 'Spunta il passo quando hai letto il confronto.'},
      {g: 'Fine', data: '', titolo: 'Consegna il laboratorio al docente', dove: {ep: 'allievo.consegna'}, percorso: '👤 La mia area → Consegna il lavoro',
       campi: [['Lavoro', 'Laboratorio Produzione ripetitiva'], ['Esercizio', 'Produzione ripetitiva: il modello trattore']]},
    ],
  };
})();
