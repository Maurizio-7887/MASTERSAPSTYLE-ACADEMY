/* Mette nella nuvoletta «COSA STIAMO FACENDO» la spiegazione scritta a mano di ogni passo
   che non ne ha già una (p.grande). Le frasi sono nei file di questa cartella, per titolo esatto. */
(function () {
  var E = window.MSA_ESERCIZIO, SP = window.MSA_SPIEGAZIONI;
  if (!E || !E.passi || !SP || !SP[E.codice]) return;
  var S = SP[E.codice], GENERICO = /^ESEGUI: .*Apri la schermata indicata e completa UNA azione alla volta/, n = 0;
  E.passi.forEach(function (p) {
    var t = S[p.titolo];
    if (t && (!p.grande || GENERICO.test(p.grande))) { p.grande = t; n++; }
  });
  E.spiegazioniScritte = n;
})();
