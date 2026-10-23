// Genera il Word di un esercizio leggendo gli STESSI passi della finestra «Esercizio passo passo».
// Uso: node tools/esercizio_docx.js dicembre|ragioneria <file.docx>
// Numeri, titoli, percorsi, campi, risultati e note sono quelli del pannello a destra dello schermo.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const {Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, HeadingLevel, AlignmentType,
  BorderStyle, Footer, Header, PageNumber, PageBreak, LevelFormat, TableOfContents} = require('docx');

const root = path.join(__dirname, '..'), dir = path.join(root, 'app/blueprints/guida/static/esercizi');
const ESERCIZI = {
  dicembre: {file: ['cpm-formas.js', 'dicembre-wms.js'], titolo: 'Dicembre 2026: dalla costituzione alla riapertura',
    sottotitolo: 'Azienda nuova con magazzino WMS, ciclo di pianificazione CO (CPM), budget BPC, controllo di disponibilità, produzione, vendita, chiusura dell’esercizio e riapertura di gennaio 2027',
    intro: [
      ['Che cosa fai', 'Parti da un sistema vuoto il 01/12/2026: costituisci la Ferro & Transenne S.r.l., attivi il magazzino, compri i macchinari, prepari il piano dei costi dei centri (ciclo CO come in SAP S/4HANA e budget BPC), ricevi gli ordini dei clienti, compri il ferro, produci 300 transenne con un ordine e tre fasi, consegni, fatturi, registri le paghe, chiudi i conti al 31/12/2026 e li riapri a gennaio 2027.'],
      ['Come si usa questo testo', 'Ogni passo ha lo stesso numero e lo stesso titolo della finestra «Esercizio passo passo» a destra dello schermo. Dove indica la pagina da aprire; la tabella dice che cosa scrivere campo per campo; il risultato atteso è il controllo da fare. Nei passi contabili il programma mostra il risultato atteso solo dopo che hai registrato e ricostruito la scrittura: prima prova, poi confronta.'],
      ['Spunta dei passi', 'I passi «automatici» si spuntano da soli quando l’operazione è registrata. I passi di lettura si spuntano a mano con «Fatto» dopo aver letto e controllato.'],
      ['Regole', 'Usa un’azienda vuota (Launchpad → Avvio e dati di base → Nuova azienda). Non caricare situazioni pronte e non premere «Azzera» su un lavoro da conservare. Il lavoro si salva da solo sul portale. Le date sono quelle aziendali simulate, non quelle della lezione. Dati esclusivamente sintetici.'],
      ['Ciclo di pianificazione CO', 'Passo 1 anagrafiche → KP06 costi per centro → tabella di controllo del personale → KP26/LTP ore e volumi → KSU1 ribaltamento → distinta e ciclo → BPC (modello, inserimento mensile, approvazione e ritrasferimento) → KSPI tariffe → CK11N/CK24 costo standard → KSB1 consuntivo e BPC di fine mese.']]},
  ragioneria: {file: ['ragioneria-wms.js'], titolo: 'Ragioneria con WMS — dall’apertura alla chiusura e riapertura',
    sottotitolo: 'Apertura 02/01/2027, costo standard con il ciclo CO, acquisto, produzione, vendita, banca; seconda parte: cespiti, Ri.Ba., factoring, IVA, imposte, chiusura 2027 e riapertura 2028',
    intro: [
      ['Che cosa fai', 'Apri l’azienda didattica con saldi e scorte iniziali, attivi subito il magazzino, calcoli il costo standard con lo stesso ciclo CO dell’esercizio di dicembre (piano dei centri, tariffe KSPI, scheda dei sovraccosti), compri e ricevi il ferro, produci 100 transenne dichiarando le tre fasi, vendi 550 transenne con picking e trasporto, incassi e paghi. Nella seconda parte: cespiti, fatture di servizi, Ri.Ba., factoring, IVA, imposte, chiusura 2027 e riapertura al 1° gennaio 2028.'],
      ['Come si usa questo testo', 'Ogni passo ha lo stesso numero e lo stesso titolo della finestra «Esercizio passo passo» a destra dello schermo (scegli l’esercizio «Ragioneria con WMS» dal launchpad). Nei passi contabili il programma mostra il risultato atteso solo dopo che hai registrato e ricostruito la scrittura.'],
      ['Spunta dei passi', 'I passi automatici si spuntano da soli; quelli di lettura con «Fatto».'],
      ['Regole', 'Usa un account di prova senza documenti. Non caricare situazioni pronte e non premere «Azzera» su un lavoro da conservare. Dati esclusivamente sintetici.']]}
};

function passi(chi) {
  const w = new JSDOM('', {runScripts: 'outside-only', url: 'https://x.local/'}).window;
  ESERCIZI[chi].file.forEach(f => w.eval(fs.readFileSync(path.join(dir, f), 'utf8')));
  return w.MSA_ESERCIZIO.passi;
}

const FONT = 'Calibri', BLU = '1F3A5F', GRIGIO = 'D5DCE6';
const t = (text, o = {}) => new TextRun({text, font: FONT, size: o.size || 21, bold: o.bold, italics: o.italics, color: o.color});
const par = (runs, o = {}) => new Paragraph({children: Array.isArray(runs) ? runs : [t(runs)], spacing: {after: o.after == null ? 80 : o.after, before: o.before || 0}, keepNext: o.keepNext, alignment: o.align});
const etichetta = (k, v, o = {}) => par([t(k + ': ', {bold: true}), t(v, o)], {after: 60, keepNext: true});
const bordo = {style: BorderStyle.SINGLE, size: 4, color: 'B8C4D6'};
const bordi = {top: bordo, bottom: bordo, left: bordo, right: bordo};
const LARG = 9638, C1 = 3000, C2 = LARG - C1;   // A4 con margini di 2 cm
function cella(text, w, o = {}) {
  return new TableCell({width: {size: w, type: WidthType.DXA}, borders: bordi, margins: {top: 50, bottom: 50, left: 90, right: 90},
    shading: o.fill ? {fill: o.fill, type: ShadingType.CLEAR, color: 'auto'} : undefined,
    children: [new Paragraph({children: [t(text, {bold: o.bold, size: 20})]})]});
}
function tabella(righe, testa) {
  const rows = [];
  if (testa) rows.push(new TableRow({tableHeader: true, cantSplit: true, children: [cella(testa[0], C1, {bold: true, fill: 'E8EEF6'}), cella(testa[1], C2, {bold: true, fill: 'E8EEF6'})]}));
  righe.forEach(r => rows.push(new TableRow({cantSplit: true, children: [cella(r[0], C1, {bold: true}), cella(r[1], C2)]})));
  return new Table({width: {size: LARG, type: WidthType.DXA}, columnWidths: [C1, C2], rows});
}

function documento(chi) {
  const E = ESERCIZI[chi], P = passi(chi), tot = P.length, out = [];
  out.push(par([t('MASTERSAPSTYLE ACADEMY · Ferro & Transenne S.r.l.', {bold: true, color: BLU, size: 22})], {after: 200}));
  out.push(new Paragraph({heading: HeadingLevel.TITLE, children: [new TextRun({text: E.titolo, font: FONT, size: 44, bold: true, color: BLU})], spacing: {after: 160}}));
  out.push(par([t(E.sottotitolo, {italics: true, size: 22})], {after: 200}));
  out.push(par([t('Esercizio passo passo identico alla finestra del programma · ' + tot + ' passi · ' + P.filter(p => p.fatto).length + ' con spunta automatica', {size: 20})]));
  out.push(par([t('SIMULAZIONE DIDATTICA — DATI SIMULATI, NON VALIDO AI FINI FISCALI O COMMERCIALI', {bold: true, size: 18, color: '8A1C1C'})], {after: 240}));
  E.intro.forEach(([k, v]) => { out.push(new Paragraph({heading: HeadingLevel.HEADING_2, children: [new TextRun({text: k, font: FONT})], spacing: {before: 160, after: 60}})); out.push(par(v)); });
  out.push(new Paragraph({heading: HeadingLevel.HEADING_2, children: [new TextRun({text: 'Indice delle fasi', font: FONT})], spacing: {before: 160, after: 60}}));
  let g = null;
  P.forEach((p, i) => { if (p.g !== g) { g = p.g; out.push(par([t(g, {bold: true}), t('  ·  dal passo ' + (i + 1))], {after: 30})); } });
  g = null; let primo = true;
  P.forEach((p, i) => {
    if (p.g !== g) {
      g = p.g;
      out.push(new Paragraph({heading: HeadingLevel.HEADING_1, pageBreakBefore: primo, keepNext: true, children: [new TextRun({text: g, font: FONT})], spacing: {before: primo ? 0 : 360, after: 120}})); primo = false;
    }
    out.push(new Paragraph({heading: HeadingLevel.HEADING_2, keepNext: true, children: [new TextRun({text: (i + 1) + ' / ' + tot + ' · ' + p.titolo, font: FONT})], spacing: {before: 240, after: 80},
      border: {bottom: {style: BorderStyle.SINGLE, size: 6, color: GRIGIO, space: 2}}}));
    if (p.percorso) out.push(etichetta('Dove', p.percorso));
    if (p.data) out.push(etichetta('Data aziendale', p.data));
    out.push(etichetta('Spunta', p.fatto ? 'automatica, quando l’operazione è registrata' : 'a mano con «Fatto», dopo la lettura e il controllo', {italics: true}));
    if (p.campi && p.campi.length) { out.push(par('', {after: 20})); out.push(tabella(p.campi, ['Campo / riquadro', 'Che cosa scrivere o fare'])); }
    if (p.attesa) out.push(par([t((p.contabile ? 'Scrittura / controllo atteso' : 'Controllo atteso') + ': ', {bold: true}), t(p.attesa)], {before: 100}));
    if (p.dopo) out.push(par([t('Dopo il tentativo: ', {bold: true}), t(p.dopo)], {before: 60}));
    if (p.attesa && p.contabile) out.push(par([t('Nel programma la soluzione compare dopo che hai registrato e ricostruito la scrittura.', {italics: true, size: 18, color: '555555'})]));
    if (p.nota) out.push(par([t('Attenzione: ', {bold: true}), t(p.nota)], {before: 60}));
    out.push(par([t('Evidenza: documento ________  ·  prima/dopo ________  ·  spiegazione ________', {size: 18, color: '555555'})], {before: 60}));
  });
  return new Document({
    creator: 'Maurizio Gustinicchi Consulting', title: E.titolo,
    styles: {default: {document: {run: {font: FONT, size: 21}}},
      paragraphStyles: [
        {id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: {size: 32, bold: true, color: BLU, font: FONT}, paragraph: {spacing: {before: 0, after: 120}, outlineLevel: 0}},
        {id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: {size: 24, bold: true, color: BLU, font: FONT}, paragraph: {spacing: {before: 200, after: 80}, outlineLevel: 1}}]},
    sections: [{properties: {page: {size: {width: 11906, height: 16838}, margin: {top: 1134, bottom: 1134, left: 1134, right: 1134}}},
      headers: {default: new Header({children: [par([t('MASTERSAPSTYLE ACADEMY · ' + E.titolo, {size: 16, color: '556677'})])]})},
      footers: {default: new Footer({children: [new Paragraph({alignment: AlignmentType.CENTER, children: [t('Simulazione didattica — pagina ', {size: 16, color: '556677'}), new TextRun({children: [PageNumber.CURRENT], size: 16, color: '556677', font: FONT})]})]})},
      children: out}]});
}

const [chi, dest] = process.argv.slice(2);
if (!ESERCIZI[chi] || !dest) { console.error('uso: node tools/esercizio_docx.js dicembre|ragioneria file.docx'); process.exit(1); }
Packer.toBuffer(documento(chi)).then(b => { fs.writeFileSync(dest, b); console.log(dest, passi(chi).length + ' passi'); });
