/* Passo rimasto senza spunta (caso Paulina: al 92, manca il 12): «Vai al passo 12», lo sistema, torna al 92.
   Run: node tests/guida_torna_al_mancante.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const js = fs.readFileSync(path.join(__dirname, '../app/blueprints/guida/static/pannello.js'), 'utf8');
const a = js.indexOf('  var RIT = ');
const b = js.indexOf('  function disegnaElenco(', a);
assert(a >= 0 && b > a);
const blocco = js.slice(a, b);
const mk = new Function('stati', `
  var E = {codice: 'x'}, N = stati.length, pos = 91, POS = 'p', mem = {}, disegni = 0;
  var ls = function (k, v) { if (v === undefined) return mem[k] == null ? null : mem[k]; mem[k] = v; };
  var ss = function () {}; function programmaProgresso() {} function disegna() { disegni++; }
  var corpo = {scrollTop: 0};
  function primoBlocco(fino) { for (var i = 0; i < fino; i++) if (!stati[i]) return i; return -1; }
  var document = {createElement: function () { return {style: {}, setAttribute: function () {}}; }};
  ${blocco}
  return {vai: vaiAlMancante, torna: tornaAlRitorno, rit: ritornoAttivo, pos: function () { return pos; }, stati: stati};
`);
const stati = Array.from({length: 110}, (_, i) => i < 91 ? 'auto' : '');
stati[11] = '';
const g = mk(stati);
g.vai(11);
assert.equal(g.pos(), 11, 'porta al passo 12');
assert.equal(g.rit(), 91, 'ricorda il passo 92');
assert.equal(g.torna(), false, 'finché il 12 non ha la spunta resta lì');
assert.equal(g.pos(), 11);
g.stati[11] = 'auto';
assert.equal(g.torna(), true, 'con la spunta torna al 92');
assert.equal(g.pos(), 91);
assert.equal(g.rit(), -1, 'il ritorno si cancella');
// due passi mancanti: prima il 12, poi il 30, poi il 92
const s2 = Array.from({length: 110}, (_, i) => i < 91 ? 'auto' : '');
s2[11] = ''; s2[29] = '';
const h = mk(s2);
h.vai(11); h.stati[11] = 'mano';
assert.equal(h.torna(), true); assert.equal(h.pos(), 29, 'passa al prossimo mancante');
assert.equal(h.rit(), 91);
h.stati[29] = 'auto';
h.torna(); assert.equal(h.pos(), 91);
assert(js.includes("if (!prima && stati[pos] && ritornoAttivo() >= 0) { tornaAlRitorno(); return; }"), 'ritorno automatico appena compare la spunta');
console.log('OK: dal passo bloccato al passo mancante e ritorno automatico al punto di partenza.');
