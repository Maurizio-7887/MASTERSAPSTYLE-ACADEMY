/* In stampa le risposte alle domande si aprono tutte. */
window.addEventListener('beforeprint', function () { document.querySelectorAll('.lez-domande details').forEach(function (d) { d.dataset.era = d.open ? '1' : ''; d.open = true; }); });
window.addEventListener('afterprint', function () { document.querySelectorAll('.lez-domande details').forEach(function (d) { d.open = !!d.dataset.era; }); });
