// Il passo «VA01: Beta ordina 180 TR-STD» non si ferma se l'allievo scrive il riferimento cliente a modo suo.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'app/blueprints/guida/static/esercizi/dicembre-wms.js'), 'utf8');
const ctx = {window: {MSA_STATO_CORRENTE: null}, document: {}, console, setTimeout, localStorage: {getItem: () => null}}; ctx.window.window = ctx.window; vm.createContext(ctx);
vm.runInContext(src, ctx);
const passi = ctx.window.MSA_ESERCIZIO.passi, beta = passi.find(p => /VA01: Beta ordina/.test(p.titolo)), delta = passi.find(p => /VA01: Delta ordina/.test(p.titolo));
const st = ordini => ({S: {ordini}});
const o = (rif, cliente, qta) => ({rif, cliente, materiale: 'TR-STD', qta});
assert.ok(beta.fatto(st([o('BETA-180', 'C100', 180)])), 'riferimento esatto');
assert.ok(beta.fatto(st([o('beta 180', 'C100', 180)])), 'maiuscole, spazio al posto del trattino');
assert.ok(beta.fatto(st([o('', 'C100', 180)])), 'riferimento vuoto: basta cliente, materiale e quantità');
assert.ok(beta.fatto(st([o('B-180/2026', 'C100', 180)])), 'riferimento diverso: basta cliente, materiale e quantità');
assert.ok(!beta.fatto(st([o('X', 'C100', 18)])), 'quantità sbagliata: non basta');
assert.ok(!beta.fatto(st([o('X', 'C200', 180)])), 'cliente sbagliato: non basta');
assert.ok(!beta.fatto(st([o('DELTA-120', 'C200', 120)])), 'l\'ordine Delta non vale per Beta');
assert.ok(delta.fatto(st([o('delta120', 'C200', 120)])), 'Delta con riferimento a modo suo');
console.log('OK ordini cliente: riferimento tollerante');
