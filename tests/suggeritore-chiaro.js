// «Dicembre: dalla costituzione alla riapertura»: ogni riga del suggeritore giallo è un'azione chiara
// (✍️ scrivi nella casella X · 👆 scegli · 🖱️ premi «pulsante»), mai il vecchio «Leggi… esegui questa azione nella pagina».
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const ctx = {window: {}, console}; vm.createContext(ctx);
for (const f of ['dicembre-wms.js', 'dicembre-wms-semplice.js']) vm.runInContext('var window=this.window;' + R('app/blueprints/guida/static/esercizi/' + f), ctx);
const E = ctx.window.MSA_ESERCIZIO;
let n = 0; const ok = (c, m) => { n++; if (!c) throw Error(m); };

const auto = E.passi.filter(p => p.punti && p.punti[0] && p.punti[0].auto);
ok(auto.length > 100, 'quasi tutti i passi usano il suggeritore automatico: ' + auto.length);
auto.forEach(p => {
  p.punti.forEach(d => {
    ok(!/Esegui questa azione nella pagina|Ho letto, vai avanti|esegui il comando previsto dal modulo/i.test((d.nome || '') + ' ' + (d.serve || '')), 'istruzione generica nel passo «' + p.titolo + '»');
    ok(!/«Apri ➜»/.test(d.nome || ''), '«Apri ➜» non è una riga: è fisso in cima al pannello («' + p.titolo + '»)');
    if (d.t === 'campo') ok(d.etichetta, 'casella senza nome nel passo «' + p.titolo + '»');
    if (d.t === 'pulsante') ok(d.bottone || d.modulo, 'pulsante senza nome nel passo «' + p.titolo + '»');
  });
  // un'operazione che il programma verifica deve dire QUALE pulsante premere (o farlo trovare dal riquadro)
  if (p.fatto && p.punti.some(d => d.etichetta)) ok(p.punti.some(d => d.t === 'pulsante'), 'manca il pulsante nel passo «' + p.titolo + '»');
});

const passo = t => E.passi.find(p => p.titolo === t);
const w100 = passo('Attiva il magazzino W100 (vuoto)').punti;
ok(w100.length === 2 && w100[0].t === 'campo' && w100[0].etichetta === 'Data di attivazione' && w100[0].valore === '2026-12-01', 'passo W100: la data di attivazione');
ok(w100[1].t === 'pulsante' && /^Attiva il magazzino W100/.test(w100[1].bottone), 'passo W100: il pulsante «Attiva il magazzino W100»');
const taglierina = passo('F-90: compra la taglierina a nastro').punti;
ok(taglierina.some(d => d.etichetta === 'Descrizione del bene' && d.valore === 'Taglierina a nastro'), 'F-90: descrizione del bene');
ok(taglierina.some(d => d.etichetta === 'Classe' && /^IMP/.test(d.testo)), 'F-90: classe IMP');
ok(taglierina.some(d => d.t === 'pulsante' && d.bottone === 'Registra il cespite e la fattura'), 'F-90: pulsante di registrazione');
const paghe = passo('Calcola le paghe di dicembre').punti;
ok(paghe.some(d => d.t === 'pulsante' && d.modulo && d.fine === 'Calcolo'), 'paghe: il pulsante si trova dal riquadro «Calcolo»');
const rf = passo('RF: metti a dimora i 3 fasci buoni in catasta').punti;
ok(rf.some(d => d.libero && /ORIGINE/.test(d.etichetta)), 'pistola RF: la casella di origine si riempie con quello che si legge sulla pagina');

// il pannello: intestazione fissa con «Apri ➜» e ricerca della casella per nome
const pan = R('app/blueprints/guida/static/pannello.js');
ok(/class="msa-g-testa"/.test(pan) && /\.msa-g-testa\{position:sticky/.test(R('app/blueprints/guida/static/pannello.css')), 'intestazione del passo fissa con «Apri ➜»');
ok(/function trovaTesto/.test(pan) && /data-msa-g/.test(pan), 'il pannello cerca la casella per nome e la fa brillare');
console.log('✓ suggeritore chiaro: ' + n + ' controlli su ' + auto.length + ' passi');
