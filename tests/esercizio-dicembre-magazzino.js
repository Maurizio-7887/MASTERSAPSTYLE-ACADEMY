// «Dicembre in magazzino» (magazzinieri, senza ragioneria): tutto l'esercizio dalle pagine, come lo fa l'allieva.
// Controlla: i passi di magazzino della versione con ragioneria ci sono tutti; nessun passo contabile;
// nessuna domanda Dare/Avere; spunte automatiche della guida; IM = WMS; numeri di controllo della consegna.
const fs = require('fs'), path = require('path'), {JSDOM} = require('jsdom');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
let errori = 0, controlli = 0;
const ok = (c, m) => { controlli++; if (!c) { errori++; console.log('✗ ' + m); } };
const vicino = (a, b, m) => ok(Math.abs(a - b) < 0.006, m + ': atteso ' + b + ', ottenuto ' + a);
const CHIAVE = 'ferro-transenne-fi-2026-erp-ft-civilistico';
// stesse pagine e stessa logica del collaudo di Dicembre con ragioneria
const righe = R('tests/esercizio-dicembre-wms.js').split('\n');
const inizio = righe.findIndex(r => r.startsWith('const PAGINE')), fine = righe.findIndex((r, i) => i > inizio && /etichette\.js'\];/.test(r));
const {PAGINE, LOGICA} = new Function(righe.slice(inizio, fine + 1).join('\n') + '; return {PAGINE, LOGICA};')();
// node tests/esercizio-dicembre-magazzino.js     → Pistoia 80 ore, completo
// node tests/esercizio-dicembre-magazzino.js 30  → Firenze 30 ore, essenziale
const S30 = process.argv[2] === '30', CODICE = S30 ? 'dicembre-magazzino-30' : 'dicembre-magazzino';
const GUIDA = ['dicembre-wms.js', 'dicembre-wms-semplice.js', 'dicembre-magazzino.js'].concat(S30 ? ['dicembre-magazzino-30.js'] : []);
const completo = f => { if (!S30) f(); };

// 0 · la guida da sola: elenco dei passi, niente ragioneria nei testi
{
  const w = new JSDOM('<!doctype html><body></body>', {url: 'https://sim.local/', runScripts: 'outside-only'}).window;
  GUIDA.forEach(f => w.eval(R('app/blueprints/guida/static/esercizi/' + f)));
  const E = w.MSA_ESERCIZIO;
  ok(E.codice === CODICE && E.verificaRagioneria === false, 'esercizio magazzino senza verifica di ragioneria');
  ok(E.mancanti.length === 0, 'tutti i passi di magazzino trovati nella versione con ragioneria: ' + E.mancanti.join(' | '));
  ok(S30 ? E.passi.length >= 45 && E.passi.length <= 60 : E.passi.length >= 88, 'passi di magazzino: ' + E.passi.length);
  const rag = E.passi.filter(p => p.ragioneria);
  ok(S30 ? rag.length === 0 : rag.length === 8, 'libro giornale spiegato: ' + (S30 ? 'assente a Firenze' : '8 passi di lettura a Pistoia') + ' (' + rag.length + ')');
  ok(rag.every(p => !p.fatto && p.dove.ep === 'erp_magazzino.giornale'), 'i passi del libro giornale sono letture sulla pagina giusta');
  ok(E.passi.every(p => !p.contabile), 'nessun passo contabile');
  const vietati = /F-90|FB60|F-53|F-28|MIRO|VF01|SdI|mutuo|leasing|stipend|paghe|ratei|risconti|AFAB|IRES|IRAP|chiudi l.esercizio|Riapri i conti|KO88|giornale|mastrin/i, iva = /\bIVA\b/;
  const ragioneria = x => !x.ragioneria && (vietati.test(x.titolo) || iva.test(x.titolo));
  ok(!E.passi.some(ragioneria), 'nessun passo di ragioneria: ' + E.passi.filter(ragioneria).map(p => p.titolo).join(' | '));
  const testo = p => [p.attesa, p.nota, p.grande].concat((p.campi || []).map(c => c.join(' ')), p.vedi || [], (p.punti || []).map(q => q.serve)).join(' ');
  const contabile = /\b[DA] \d{2}\b|scrittur|Dare\b|Avere\b|\bconto \d|giornale|ricostruisci|\bIVA\b|€/;
  const sporchi = E.passi.filter(p => !p.ragioneria && !(!S30 && p.titolo === 'Consegna il lavoro al docente') && contabile.test(testo(p).replace(/Prezzo netto €\/unità/g, '')));
  ok(sporchi.length === 0, 'testi senza conti, Dare/Avere ed euro: ' + sporchi.map(p => p.titolo + ' → ' + (testo(p).match(contabile) || [])[0]).join(' | '));
  ok(E.passi.every(p => p.g && p.titolo), 'ogni passo ha gruppo e titolo');
  ok(new Set(E.passi.map(p => p.titolo)).size === E.passi.length, 'titoli unici (il progresso si salva per titolo)');
  w.close();
}

let memoria = null, ultima = null, codaMax = 0;
function apri(bp, pagina, corso) {
  if (ultima) memoria = ultima.localStorage.getItem(CHIAVE) || memoria;
  if (ultima) ultima.close();
  // di solito l'allieva arriva dai menu, senza il corso nell'indirizzo: il divieto del quiz deve stare nell'azienda salvata
  const w = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/' + (corso ? '?esercizio_guida=' + CODICE : ''), runScripts: 'outside-only'}).window;
  ultima = w;
  if (memoria) w.localStorage.setItem(CHIAVE, memoria);
  w.confirm = () => true;
  w.LAB_PAGINA = {chiave: CHIAVE, pagina: pagina, slot: 'erp-ft'};
  w.MSA_CORSO_GUIDA = CODICE;
  w.MSA_GUIDA = {esercizio: CODICE, chiave: CHIAVE, versione: 'vuoto', url: {}};
  LOGICA.concat(bp === 'erp_magazzino' ? ['app/blueprints/erp_magazzino/static/giornale-magazzino.js'] : [], ['app/blueprints/' + bp + '/static/' + PAGINE[bp]]).forEach(f => w.eval(R(f)));
  GUIDA.forEach(f => w.eval(R('app/blueprints/guida/static/esercizi/' + f)));
  w.eval(R('app/blueprints/guida/static/ragioneria.js'));
  w.eval(R('app/blueprints/guida/static/pannello.js'));
  const lab = w.document.getElementById('lab');
  const P = {w, lab, S: () => w.MSA_STATO_CORRENTE(),
    fai(pref, valori, azione) {
      Object.entries(valori).forEach(([k, v]) => {
        const el = lab.querySelector('#' + pref + '-' + k); if (!el) throw Error('campo ' + pref + '-' + k + ' assente in ' + pagina);
        el.value = v;
      });
      const b = lab.querySelector('[data-prefisso="' + pref + '"] [data-azione="' + (azione || pref) + '"]'); if (!b) throw Error('pulsante ' + pref + ' assente in ' + pagina);
      b.click();
      const es = lab.querySelector('#' + pref + '-esito');
      senzaQuiz(w);
      memoria = w.localStorage.getItem(CHIAVE);
      return es ? es.className + ' ' + es.textContent : '';
    },
    testo: () => lab.textContent};
  return P;
}
function senzaQuiz(w) {
  const S = w.MSA_STATO_CORRENTE();
  codaMax = Math.max(codaMax, ((S.msaRagioneria || {}).coda || []).length);
  ok(!((S.msaRagioneria || {}).coda || []).length, 'nessuna domanda Dare/Avere in coda');
  ok(!w.document.querySelector('.msa-q-verifica'), 'nessun riquadro «Verifica la mia scrittura»');
}
const bene = (r, m) => ok(/lab-esito ok/.test(r) || / ok /.test(' ' + r.split(' ')[1] + ' '), m + ' → ' + r.slice(0, 160));
let p;
function fino(pezzo) {
  const passi = p.w.MSA_ESERCIZIO.passi, k = passi.findIndex(x => x.titolo.indexOf(pezzo) >= 0);
  ok(k >= 0, 'passo della guida «' + pezzo + '»');
  for (let i = 0; i <= k; i++) if (passi[i].fatto) ok(passi[i].fatto({S: p.S()}), 'guida spuntata: ' + passi[i].titolo + ' (a «' + pezzo + '»)');
  const dopo = passi.slice(k + 1).find(x => x.fatto);
  if (dopo && k > 0) ok(!dopo.fatto({S: p.S()}), 'guida non ancora spuntata: ' + dopo.titolo + ' (dopo «' + pezzo + '»)');
}
const quadra = nome => { if (p.S().wm && p.S().wm.attivo) ok(p.w.WM4.quadratura().every(x => x.ok), nome + ' IM=WMS'); };
function rfTutti(data, tipo, n) {
  p = apri('erp_magazzino', 'rf');
  let fatti = 0;
  while (p.w.WM4.aperti().length) {
    const t = p.w.WM4.aperti()[0];
    if (tipo) ok(t.tipo === tipo, 'tipo compito ' + tipo + ' (trovato ' + t.tipo + ')');
    p.lab.querySelector('#rf-data').value = data;
    for (const [id, value] of [['rf-da', t.da], ['rf-udc', t.udc || t.mat], ['rf-qta', String(t.qta)], ['rf-a', t.a]]) p.lab.querySelector('#' + id).value = value;
    p.lab.querySelector('#rf-ok').click();
    ok(p.S().wm.compiti.find(x => x.numero === t.numero).stato === 'confermato', 'RF confermato ' + t.numero);
    senzaQuiz(p.w);
    memoria = p.w.localStorage.getItem(CHIAVE); fatti++;
  }
  if (n != null) ok(fatti === n, 'RF ' + tipo + ': attesi ' + n + ' compiti, confermati ' + fatti);
}
const invio = (pp, id, v) => { const el = pp.lab.querySelector('#' + id); el.value = v; el.dispatchEvent(new pp.w.KeyboardEvent('keydown', {key: 'Enter', bubbles: true})); };
const scheda = (pp, s) => { pp.lab.querySelector('.rf-schede button[data-s="' + s + '"]').click(); };
const ordineDi = mat => p.S().produzione.find(o => o.materiale === mat).numero;

// 0-1 · l'azienda nasce dal riquadro «Dicembre in magazzino», senza quiz
p = apri('erp_dati', 'avvio', true); fino('Prima di cominciare');
ok(/Dicembre in magazzino/.test(p.testo()) && !!p.lab.querySelector('[data-prefisso="cs"]'), 'riquadro «Dicembre in magazzino» con il pulsante di creazione');
ok(!p.lab.querySelector('#cs-capitale'), 'il magazziniere non scrive il capitale');
p.fai('cs', {data: '2026-12-01'}); ok(!!p.S().costituzione && p.S().costituzione.data === '2026-12-01', 'azienda creata il 01/12/2026'); fino('Crea l’azienda');
ok(p.S().quizContabile === false && p.S().corsoMagazzino === 'dicembre-magazzino', 'azienda marcata: niente quiz anche fuori dall’indirizzo del corso');
ok(p.S().produzioneModello === 'wip-fasi-v1' && p.S().giacenze['TR-STD'] === 0, 'stessa azienda di Dicembre: modello a fasi, magazzino vuoto');
p = apri('erp_dati', 'avvio', true); ok(/Azienda creata il 01\/12\/2026/.test(p.testo()) && !p.lab.querySelector('[data-prefisso="cs"]'), 'ripresa: niente seconda creazione');
p = apri('erp_magazzino', 'struttura'); p.fai('at', {data: '2026-12-01'}); fino('Attiva il magazzino'); ok(p.S().wm.quant.length === 0, 'magazzino vuoto');

// 3 · vendite
p = apri('erp_vendite', 'ordini');
bene(p.fai('va', {cliente: 'C100', materiale: 'TR-STD', qta: '180', rif: 'BETA-180', data: '2026-12-02', consegna: '2026-12-14'}), 'VA01 Beta');
bene(p.fai('va', {cliente: 'C200', materiale: 'TR-STD', qta: '120', rif: 'DELTA-120', data: '2026-12-02', consegna: '2026-12-14'}), 'VA01 Delta'); fino('Delta ordina');
ok(p.S().ordini.every(o => p.w.SD4.confermabilita(o).stato === 'rosso'), 'ATP rosso senza merce');
// 5 · acquisti e ricevimento
p = apri('erp_acquisti', 'ordini'); bene(p.fai('me', {fornitore: 'F100', materiale: 'FERRO', qta: '3000', prezzo: '1', data: '2026-12-03'}), 'ME21N'); fino('ordina 3.000');
const oa = p.S().acquisti[0].numero;
p = apri('erp_acquisti', 'entrate'); bene(p.fai('mi', {ordine: oa, ddt: 'DDT-AU-5512', lotto: 'COL-1204', danneggiati: '200', danno: 'tubi schiacciati nel trasporto', data: '2026-12-04'}), 'MIGO con danneggiati'); fino('200 kg sono schiacciati');
ok(p.w.WM4.bloccato('FERRO') === 200, '200 kg in quarantena');
rfTutti('2026-12-04', 'PUTAWAY', 3); fino('3 fasci buoni');
p = apri('erp_magazzino', 'bloccato'); { const qz = p.w.WM4.bloccati()[0]; bene(p.fai('dq', {udc: qz.udc, motivo: 'tubi schiacciati, non riparabili', data: '2026-12-05'}, 'ro'), 'rottamazione 555'); } fino('decidi sui 200 kg');
p = apri('erp_acquisti', 'ordini'); bene(p.fai('me', {fornitore: 'F100', materiale: 'FERRO', qta: '500', prezzo: '1,08', data: '2026-12-05'}), 'riordino'); fino('riordino urgente');
const oa2 = p.S().acquisti[1].numero;
p = apri('erp_acquisti', 'entrate'); bene(p.fai('mi', {ordine: oa2, ddt: 'DDT-AU-5530', lotto: 'COL-1206', data: '2026-12-06'}), 'MIGO riordino'); fino('500 kg urgenti');
rfTutti('2026-12-06', 'PUTAWAY', 1); fino('fascio urgente'); quadra('Ferro');
ok(!p.S().fattureFornitore || !p.S().fattureFornitore.length, 'nessuna fattura fornitore: non è lavoro del magazziniere');
// 6 · produzione transenne
p = apri('erp_produzione', 'ordini'); bene(p.fai('co', {materiale: 'TR-STD', qta: '300', data: '2026-12-07', fine: '2026-12-12'}), 'CO01 TR-STD'); fino('un ordine per 300');
const op = ordineDi('TR-STD');
p = apri('erp_magazzino', 'compiti'); bene(p.fai('sg', {ordine: op, data: '2026-12-07'}), 'staging'); fino('porta il ferro delle transenne');
rfTutti('2026-12-07', 'STAGING', 3); fino('approvvigionamento del ferro delle transenne');
p = apri('erp_produzione', 'avanzamento'); bene(p.fai('pr', {ordine: op, kg: '2400', data: '2026-12-07'}), '261'); fino('consuma 2.400');
[['Taglio', 75, '2026-12-07'], ['Piegatura', 60, '2026-12-09'], ['Saldatura', 120, '2026-12-11']].forEach(([fase, ore, data]) => {
  p = apri('erp_produzione', 'avanzamento'); bene(p.fai('cf', {ordine: op, fase, attrezzaggio: '0', ore: String(ore), qta: '300', data}), 'CO11N ' + fase); fino('ore di ' + fase);
});
p = apri('erp_produzione', 'avanzamento'); bene(p.fai('en', {ordine: op, data: '2026-12-12'}), '101 transenne'); fino('carica a magazzino le 300');
rfTutti('2026-12-12', 'PUTAWAY', 6); fino('6 pallet');
// 7 · kit a scorta
p = apri('erp_produzione', 'ordini'); bene(p.fai('co', {materiale: 'SL-TAGLIO', qta: '20', data: '2026-12-12'}), 'CO01 kit'); fino('ordine autonomo per 20');
const oh = ordineDi('SL-TAGLIO');
p = apri('erp_magazzino', 'compiti'); bene(p.fai('sg', {ordine: oh, data: '2026-12-12'}), 'staging kit'); fino('approvvigiona il ferro dei 20');
rfTutti('2026-12-12', 'STAGING', 1); fino('porta alla linea il ferro dei kit');
p = apri('erp_produzione', 'avanzamento'); bene(p.fai('pr', {ordine: oh, kg: '160', data: '2026-12-12'}), '261 kit'); fino('consuma 160');
bene(p.fai('cf', {ordine: oh, fase: '', attrezzaggio: '0', ore: '5', data: '2026-12-12'}), 'CO11N kit'); fino('5 ore di Taglio dei kit');
bene(p.fai('en', {ordine: oh, data: '2026-12-12'}), '101 kit'); fino('20 kit autonomi');
rfTutti('2026-12-12', 'PUTAWAY', 1); fino('cassone SL-TAGLIO');
const c20 = p.S().wm.quant.find(q => q.mat === 'SL-TAGLIO' && q.qta === 20);
p = apri('erp_magazzino', 'compiti'); bene(p.fai('tr', {udc: c20.udc, a: '03-05-2', motivo: 'resti in fondo al magazzino', data: '2026-12-12'}), 'LT10 cassone'); fino('sposta il cassone');
rfTutti('2026-12-12', 'TRASF', 1); fino('conferma lo spostamento del cassone');
{ const g = p.S().giacenze; ok(g.FERRO === 740 && g['SL-TAGLIO'] === 20 && g['TR-STD'] === 300, 'scorte dopo la produzione: ' + JSON.stringify(g)); } quadra('Produzione');
// 8 · RF, quarantena e slotting
completo(() => { p = apri('erp_magazzino', 'rf'); scheda(p, 'interroga'); invio(p, 'rf-q', '03-05-2'); ok(/SL-TAGLIO/.test(p.testo()), 'RF interroga');
{ const udcTR = p.w.WM4.quanti(q => q.mat === 'TR-STD')[0].udc;
  p = apri('erp_magazzino', 'bloccato'); bene(p.fai('bl', {udc: udcTR, qta: '', motivo: 'pallet urtato dal carrello, da controllare', data: '2026-12-13'}), 'blocca 344'); fino('Blocca un pallet');
  rfTutti('2026-12-13', 'BLOCCO', 1); fino('porta il pallet in quarantena');
  p = apri('erp_magazzino', 'bloccato'); bene(p.fai('dq', {udc: udcTR, motivo: 'imballo integro, transenne non danneggiate', data: '2026-12-13'}, 'sb'), 'sblocca 343'); fino('sblocca il pallet');
  rfTutti('2026-12-13', 'PUTAWAY', 1); fino('rimetti a scaffale il pallet sbloccato');
  p = apri('erp_magazzino', 'compiti'); bene(p.fai('tr', {udc: udcTR, a: '03-04-1', motivo: 'lavori al pavimento davanti alla corsia 01', data: '2026-12-13'}), 'LT10 in fondo'); fino('lavori al pavimento');
  rfTutti('2026-12-13', 'TRASF', 1); fino('spostamento in fondo'); }
p = apri('erp_innovazione', 'slotting'); bene(p.fai('sl', {data: '2026-12-13'}), 'slotting'); fino('Slotting: avvicina');
rfTutti('2026-12-13', 'TRASF'); fino('trasferimenti dello slotting'); quadra('Slotting'); });
// 9 · spedizione
p = apri('erp_innovazione', 'ondate'); bene(p.fai('mo', {ondate: 'si', crossDock: 'no'}), 'ondate attive'); fino('Attiva il prelievo a ondate');
p = apri('erp_vendite', 'consegne'); const ob = p.S().ordini[0].numero, od = p.S().ordini[1].numero;
bene(p.fai('vl', {ordine: ob, data: '2026-12-14'}), 'consegna Beta'); bene(p.fai('vl', {ordine: od, data: '2026-12-14'}), 'consegna Delta'); fino('consegna per Delta');
p = apri('erp_innovazione', 'ondate'); bene(p.fai('on', {data: '2026-12-14'}), 'ONDA-1'); fino('Rilascia l’ondata');
rfTutti('2026-12-14', 'PICK', 7); fino('preleva i 7');
const cb = p.S().consegne[0].numero, cd = p.S().consegne[1].numero;
p = apri('erp_spedizione', 'imballi');
bene(p.fai('ib', {imballo: 'EUR', lung: '120', larg: '80', alt: '15', tara: '25', portata: '1000', impilabile: 'si', sopra: '700'}), 'misure EUR');
bene(p.fai('rc', {materiale: 'TR-STD', imballo: 'EUR', pezzi: '50', alt: '125'}), 'regola TR-STD'); fino('Misure del pallet EUR');
p = apri('erp_spedizione', 'imballo'); bene(p.fai('im', {consegna: cb, imballo: 'EUR', perCollo: '50', data: '2026-12-14'}), 'imballo Beta'); fino('Beta in 4 colli');
p = apri('erp_spedizione', 'imballo'); bene(p.fai('im', {consegna: cd, imballo: 'EUR', perCollo: '40', data: '2026-12-14'}), 'imballo Delta'); fino('Delta in 3 colli');
p = apri('erp_spedizione', 'trasporti'); bene(p.fai('vt', {consegne: cb + ', ' + cd, vettore: 'V10', targa: 'AA000AA', autista: 'Mario Esempio', porto: 'franco', data: '2026-12-15'}), 'trasporto'); fino('Crea un trasporto');
completo(() => { p = apri('erp_spedizione', 'piano'); { const t = p.S().sped.trasporti[0].numero; bene(p.fai('ps', {trasporto: t, veicolo: 'MOTRICE', criterio: 'fermate'}), 'piano di carico'); } fino('Piano di carico'); });
const tr = p.S().sped.trasporti[0].numero;
p = apri('erp_magazzino', 'rf');
for (const x of p.S().sped.colli.filter(c => c.consegna === cb)) { scheda(p, 'carico'); p.lab.querySelector('#rf-data').value = '2026-12-15'; invio(p, 'rf-sscc', x.sscc); memoria = p.w.localStorage.getItem(CHIAVE); }
fino('RF Carico');
p = apri('erp_innovazione', 'rfid'); bene(p.fai('rf', {trasporto: tr, data: '2026-12-15'}), 'varco RFID'); fino('Varco RFID');
p = apri('erp_spedizione', 'trasporti'); bene(p.fai('pt', {trasporto: tr, data: '2026-12-15'}), 'partenza 601'); fino('Partenza');
ok(p.S().giacenze['TR-STD'] === 0, 'transenne spedite'); quadra('Spedizione');
ok(!(p.S().fatture || []).length, 'nessuna fattura di vendita: la fa l’amministrazione');
// 10 · inventario e deposito esterno
p = apri('erp_inventario', 'documenti'); bene(p.fai('in', {tipo: 'ubicazioni', selezione: 'F-02, 03-05-2', tolleranza: '10', data: '2026-12-31'}), 'LI01N'); fino('ubicazioni occupate');
p = apri('erp_inventario', 'documenti'); p.fai('ia', {data: '2026-12-31'}); fino('Attiva l’inventario');
p = apri('erp_magazzino', 'rf'); scheda(p, 'inventario'); invio(p, 'rf-inv', 'F-02');
{ const d = p.S().wm.inventari[0]; d.righe.forEach((r, k) => { const c = p.lab.querySelector('#rf-c' + k); if (c) c.value = String(r.libro); }); p.lab.querySelector('#rf-conta').click(); memoria = p.w.localStorage.getItem(CHIAVE); } fino('RF Inventario');
p = apri('erp_inventario', 'documenti'); { const d = p.S().wm.inventari[0], v = {contatore: 'Allieva'}; d.righe.forEach((r, k) => { if (r.ubic === '03-05-2') v['r' + k] = '19'; }); p.fai('ic', v); } fino('LI11N');
p = apri('erp_inventario', 'documenti'); { const d = p.S().wm.inventari[0], v = {}; d.righe.forEach((r, k) => { if (r.riconta) v['r' + k] = '19'; }); p.fai('ic', v); } fino('LI14');
p = apri('erp_inventario', 'documenti'); p.fai('ix', {data: '2026-12-31'}); fino('LI20');
p = apri('erp_inventario', 'differenze'); bene(p.fai('rg', {data: '2026-12-31'}), 'LI21 / 711'); fino('LI21'); ok(p.S().giacenze['SL-TAGLIO'] === 19, '19 kit dopo l’inventario'); quadra('Inventario');
{ const v = p.w.IV4.valuta(p.w.IV4.movimentiDi('FERRO'), 0.95); vicino(v.fifo, 780, 'FIFO'); vicino(v.lifo, 740, 'LIFO'); vicino(v.cmp, 748.97, 'costo medio'); }
completo(() => {
p = apri('erp_magazzino', 'scorte'); bene(p.fai('sm', {materiale: 'FERRO', minimo: '1000', massimo: '3000'}), 'scorta minima'); fino('Scorta minima');
p = apri('erp_magazzino', 'depositi'); bene(p.fai('ub', {da: 'W100', materiale: 'SL-TAGLIO', qta: '10', data: '2026-12-31', consegna: '2027-01-02'}), 'trasferimento UB'); fino('10 kit al deposito');
rfTutti('2026-12-31', 'DEPOSITO', 1); fino('preleva i 10 kit per il deposito');
p = apri('erp_magazzino', 'depositi'); bene(p.fai('us', {trasferimento: 'UB001', data: '2026-12-31'}), 'uscita 351'); fino('i kit sono in viaggio');
// 11 · gennaio: arrivo al deposito, senza chiudere l'esercizio
p = apri('erp_magazzino', 'depositi'); bene(p.fai('er', {trasferimento: 'UB001', qta: '', data: '2027-01-02'}), 'entrata 101 al deposito'); fino('i kit sono arrivati');
{ const x = p.w.WM4.perLuogo().find(y => y.mat === 'SL-TAGLIO'); ok(x.w100 === 9 && x.d200 === 10 && x.viaggio === 0, 'kit: 9 in W100 + 10 in D200'); }
});
if (S30) ok(p.w.WM4.inUbic('03-05-2')[0].qta === 19, 'essenziale: 19 kit nel cassone in 03-05-2');
quadra('Fine');
ok(p.w.WM4.aperti().length === 0, 'nessun compito RF aperto');
ok(codaMax === 0, 'in tutto l’esercizio nessuna domanda di ragioneria');
// Pistoia: la pagina del libro giornale spiegato mostra le scritture vere, una per una, con il «Perché»
completo(() => {
  p = apri('erp_magazzino', 'giornale');
  const n = p.S().registrazioni.length, schede = p.lab.querySelectorAll('.gm-scrittura');
  ok(n === 15 && schede.length === 15, 'libro giornale: 15 scritture mostrate (' + schede.length + ')');
  ok([...schede].every(x => /Perché:/.test(x.textContent) && x.querySelector('table')), 'ogni scrittura ha conti, importi e spiegazione');
  ok(/✅ uguali/.test(p.testo()), 'totale Dare = totale Avere');
  ok(/Rimanenze di magazzino: 980,40/.test(p.testo()), 'rimanenze 980,40 nei saldi finali: ' + (p.testo().match(/Rimanenze di magazzino: [\d.,]+/) || [])[0]);
  ok(/NON scrivono niente/.test(p.testo()), 'elenco di ciò che non scrive');
  const tipi = [...schede].map(x => x.dataset.tipo);
  ['COSTITUZIONE', 'ENTRATA_ACQUISTO', 'ROTTAMAZIONE', 'PRELIEVO_261', 'CONFERMA', 'ENTRATA_PRODUZIONE', 'USCITA_MERCI', 'DIFFERENZA_INVENTARIO'].forEach(t => ok(tipi.includes(t), 'scrittura spiegata: ' + t));
  ok(!/Altre scritture/.test(p.testo()), 'nessuna scrittura senza spiegazione');
  ok(p.S().registrazioni.length === n, 'la pagina non registra niente');
  // filtro per fase
  const w2 = new JSDOM('<!doctype html><body><div id="lab"></div></body>', {url: 'https://sim.local/vuoto/s4/magazzino/giornale?fase=produzione', runScripts: 'outside-only'}).window;
  w2.localStorage.setItem(CHIAVE, memoria); w2.LAB_PAGINA = {chiave: CHIAVE, pagina: 'giornale', slot: 'erp-ft'};
  LOGICA.concat(['app/blueprints/erp_magazzino/static/giornale-magazzino.js', 'app/blueprints/erp_magazzino/static/wm-pagine.js']).forEach(f => w2.eval(R(f)));
  ok(w2.document.querySelectorAll('.gm-scrittura').length === 8, 'fase produzione: 8 scritture');
  w2.close();
});
// il programma ha comunque tenuto la sua contabilità, in pareggio (per il docente)
{ const tot = p.S().registrazioni.reduce((v, r) => { r.righe.forEach(x => v[x.dareAvere === 'DARE' ? 0 : 1] += x.importo); return v; }, [0, 0]); vicino(tot[0], tot[1], 'giornale automatico in pareggio'); }
// tutti i passi automatici spuntati
{ const passi = p.w.MSA_ESERCIZIO.passi; passi.forEach(x => { if (x.fatto) ok(x.fatto({S: p.S()}), 'spunta finale: ' + x.titolo); }); }
fs.writeFileSync(path.join(__dirname, 'fixtures', CODICE + '-finale.json'), JSON.stringify(p.S()));
if (errori) { console.log('✗ dicembre in magazzino: ' + errori + ' errori su ' + controlli + ' controlli'); process.exit(1); }
console.log('✓ ' + CODICE + ' (senza ragioneria): ' + controlli + ' controlli, ' + p.w.MSA_ESERCIZIO.passi.length + ' passi');
ultima.close(); process.exit(0);   // i timer del pannello terrebbero vivo il processo
