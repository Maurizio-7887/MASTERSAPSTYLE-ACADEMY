/* Etichette con codice a barre (Code 128) e QR per ubicazioni e unità di carico: si stampano su A4 adesive. */
window.S4Etichette = (function () {
  'use strict';
  function code128(testo, gs1) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    window.JsBarcode(svg, gs1 ? '00' + testo : testo, {format: 'CODE128', ean128: !!gs1, width: gs1 ? 1.5 : 2, height: 56, displayValue: false, margin: 0});   // GS1-128 con FNC1 per l'SSCC
    return svg.outerHTML;
  }
  function qr(testo) { var q = window.qrcode(0, 'M'); q.addData(testo); q.make(); return q.createSvgTag({cellSize: 3, margin: 0, scalable: true}); }
  function etichetta(codice, titolo, sotto, gs1) {
    return '<div class="s4-et"><div class="s4-et-t">' + titolo + '</div><div class="s4-et-cod' + (gs1 ? ' s4-et-sscc' : '') + '">' + (gs1 ? '(00) ' : '') + codice + '</div><div class="s4-et-bc">' + code128(codice, gs1) + '</div><div class="s4-et-qr">' + qr(codice) + '</div>' + (sotto ? '<div class="s4-et-s">' + sotto + '</div>' : '') + '</div>';
  }
  return {etichetta: etichetta, code128: code128, qr: qr};
})();
