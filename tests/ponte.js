// Test del ponte fra pagine: le azioni che portano a un'altra pagina arrivano a destinazione
// e vengono completate lì (coda in sessionStorage). Usa lo stato finale dell'esercizio.
// Uso: node tests/ponte.js tests/_pagine   (dopo npm run test:multipagina)
process.argv[2] = process.argv[2] || __dirname + '/_pagine';
const H = require('./harness'), fs = require('fs');
const stato = JSON.parse(fs.readFileSync(__dirname + '/stato-finale.json', 'utf8')).stato;
H.store = {'ferro-transenne-fi-2026-vuoto-civilistico': JSON.stringify(stato)};
let W, ko = 0;
const go = (url, js) => { W = H.boot(url); W.eval(js); W = H.segui(); return W; };
const ok = (cond, msg) => { console.log((cond ? '✅ ' : '❌ ') + msg); if(!cond) ko++; };
const pp = () => W.document.getElementById('pp-host').shadowRoot, sd = () => W.document.getElementById('sdmm-host').shadowRoot;

go('/vuoto/pianificazione/fabbisogno', "FabbisognoPM.openDocument('pp','1000002')");
ok(H.url === '/vuoto/produzione/' && /Ordine 1000002/.test(pp().textContent), 'Fabbisogno → PP: apre l\'ordine 1000002 in CO03');

go('/vuoto/reportistica/giornale', "cambiaVista('sdmm');SDMM.vai('miro')");
ok(H.url === '/vuoto/vendite-acquisti/' && /MIRO — Registrazione fattura fornitore/.test(sd().textContent), 'Giornale → SD/MM: apre la MIRO');

const f = stato.sdmm.fatture[0].id;
go('/vuoto/vendite-acquisti/', `SDMM.vai('fatt');Treasury.openSD('INC','${f}','2027-01-20')`);
ok(H.url === '/vuoto/contabilita/fi-ar' && W.FIModules.active === 'ar', 'SD/MM incasso → FI-AR (modulo clienti aperto)');

go('/vuoto/contabilita/fi-gl', "FIModules.go('bl')");
ok(H.url === '/vuoto/contabilita/fi-gl' && W.FIModules.active === 'bl', 'FI-GL → FI-BL nella stessa pagina FI');

go('/vuoto/impostazioni/', "cambiaVista('pp'); PP.vai('co01')");
ok(H.url === '/vuoto/produzione/' && /Crea UN ordine della fase scelta/.test(pp().textContent), 'Impostazioni → PP CO01');

const errJS = H.log.filter(x => !/Not implemented/.test(x));
ok(!errJS.length, 'nessun errore JS' + (errJS.length ? ': ' + errJS.slice(0,5).join(' | ') : ''));
process.exit(ko ? 1 : 0);
