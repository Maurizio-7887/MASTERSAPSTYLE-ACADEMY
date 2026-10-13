/* Ponte 1/2 — caricato PRIMA del simulatore.
 *
 * Il simulatore nasce come pagina unica: all'avvio disegna tutte le schede
 * (impostazioni, budget, giornale...). Ora ogni scheda è una pagina diversa,
 * quindi molti elementi non esistono nella pagina corrente.
 *
 * Quando il codice chiede un elemento che esisteva nel file originale ma non è
 * in questa pagina, ne creiamo uno "fantasma" invisibile dello stesso tipo:
 * il codice continua a funzionare e nulla compare a video. Gli elementi che il
 * simulatore crea da sé (anteprime, riquadri FI...) NON vengono mai inventati:
 * l'elenco ammesso è solo quello degli id statici del file originale.
 */
(function () {
  'use strict';
  const ammessi = (window.PAGINA && window.PAGINA.idStatici) || {};
  const originale = Document.prototype.getElementById;
  let scatola = null;
  document.getElementById = function (id) {
    const el = originale.call(this, id);
    if (el || !Object.prototype.hasOwnProperty.call(ammessi, id)) return el;
    if (!scatola) {
      scatola = document.createElement('div');
      scatola.id = 'ponte-fantasmi';
      scatola.hidden = true;
      scatola.setAttribute('aria-hidden', 'true');
      (document.body || document.documentElement).appendChild(scatola);
    }
    const fantasma = document.createElement(ammessi[id] || 'div');
    fantasma.id = id;
    scatola.appendChild(fantasma);
    return fantasma;
  };
})();
