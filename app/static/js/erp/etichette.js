/* Etichette con codice a barre (Code 128) e QR per ubicazioni e unità di carico: si stampano su A4 adesive. */
window.S4Etichette = (function () {
  'use strict';
  function code128(testo) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    window.JsBarcode(svg, testo, {format: 'CODE128', width: 2, height: 56, displayValue: false, margin: 0});
    return svg.outerHTML;
  }
  function qr(testo) { var q = window.qrcode(0, 'M'); q.addData(testo); q.make(); return q.createSvgTag({cellSize: 3, margin: 0, scalable: true}); }
  function etichetta(codice, titolo, sotto) {
    return '<div class="s4-et"><div class="s4-et-t">' + titolo + '</div><div class="s4-et-cod">' + codice + '</div><div class="s4-et-bc">' + code128(codice) + '</div><div class="s4-et-qr">' + qr(codice) + '</div>' + (sotto ? '<div class="s4-et-s">' + sotto + '</div>' : '') + '</div>';
  }
  return {etichetta: etichetta, code128: code128, qr: qr};
})();
