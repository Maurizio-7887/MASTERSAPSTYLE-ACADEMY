/* Ponte 2/2 — caricato DOPO il simulatore.
 *
 * 1. cambiaVista('xxx') del simulatore: se la scheda non è in questa pagina,
 *    apre la pagina del blueprint che la contiene.
 * 2. Le chiamate che seguono un cambio pagina (es. cambiaVista('pp');
 *    PP.vai('co03'); PP.sel(id)) vengono messe in coda e rieseguite nella
 *    pagina di arrivo: il flusso dell'utente non si interrompe.
 * 3. All'apertura, la pagina mostra la sua scheda e l'area FI/CO/HR giusta;
 *    cambiando area dentro la pagina FI l'indirizzo si aggiorna.
 * Nessun dato contabile passa di qui: lo stato resta nel localStorage del simulatore.
 */
(function () {
  'use strict';
  const P = window.PAGINA;
  if (!P) return;
  const CHIAVE = 'msa-coda-' + P.versione;
  let coda = [], inUscita = false;

  const haScheda = nome => !!document.querySelector('main section.vista[data-vista="' + nome + '"]');
  const salvaCoda = () => { try { sessionStorage.setItem(CHIAVE, JSON.stringify(coda)); } catch (e) { /* senza coda si apre solo la pagina */ } };
  function vai(url) { inUscita = true; salvaCoda(); (window.__msaNaviga || (u => window.location.assign(u)))(url); }   // __msaNaviga: aggancio per il test multipagina

  // 1 · cambio scheda
  const cambiaVistaSimulatore = window.cambiaVista;
  window.cambiaVista = function (nome) {
    if (inUscita) { coda.push(['', 'cambiaVista', [nome]]); salvaCoda(); return; }
    if (haScheda(nome) || !P.urlVista[nome] || P.urlVista[nome] === window.location.pathname) return cambiaVistaSimulatore(nome);
    coda = []; vai(P.urlVista[nome]);
  };

  // 2 · chiamate da rieseguire dopo il cambio pagina
  function accoda(nomeOggetto, metodo) {
    const obj = window[nomeOggetto];
    if (!obj || typeof obj[metodo] !== 'function') return;
    const vecchio = obj[metodo];
    obj[metodo] = function (...args) {
      if (inUscita) { coda.push([nomeOggetto, metodo, args]); salvaCoda(); return; }
      return vecchio.apply(this, args);
    };
  }
  [['SDMM', 'vai'], ['SDMM', 'selRFQ'], ['SDMM', 'selPO'], ['SDMM', 'selOrd'], ['SDMM', 'tcode'],
   ['PP', 'vai'], ['PP', 'sel'], ['PP', 'apri'], ['PP', 'prev'], ['FabbisognoPM', 'render']].forEach(x => accoda(...x));

  // Incasso/pagamento lanciato da SD/MM: si completa nella pagina FI-AR / FI-AP
  if (window.Treasury && !haScheda('fi')) {
    window.Treasury.openSD = function (kind, id, data) {
      coda = [['Treasury', 'openSD', [kind, id, data]]];
      vai(P.urlModulo[String(kind).toUpperCase() === 'INC' ? 'ar' : 'ap']);
    };
  }

  // Fabbisogno PP / MM → «Apri CO01»: compila i campi dell'ordine nella pagina PP, con la stessa data di pianificazione
  window.__msaApriFase = function (id, asof) {
    const d = document.getElementById('fp-asof'); if (d && asof) d.value = asof;
    return window.FabbisognoPM.openPhase(id);
  };
  if (window.FabbisognoPM && !haScheda('pp')) {
    window.FabbisognoPM.openPhase = function (id) {
      const asof = (document.getElementById('fp-asof') || {}).value || '';
      coda = [['', '__msaApriFase', [id, asof]]];
      vai(P.urlVista.pp);
    };
  }

  // 3 · aree FI/CO/HR: indirizzo e menu seguono l'area aperta
  if (window.FIModules) {
    const vaiModulo = window.FIModules.go;
    window.FIModules.go = function (chiave) {
      if (inUscita) { coda.push(['FIModules', 'go', [chiave]]); salvaCoda(); return; }
      if (!haScheda('fi') && P.urlModulo[chiave]) { coda = []; return vai(P.urlModulo[chiave]); }
      const r = vaiModulo.apply(this, arguments);
      const url = P.urlModulo[chiave];
      if (url && url !== window.location.pathname) { try { history.replaceState(null, '', url); } catch (e) { /* ok */ } }
      document.querySelectorAll('.msa-pagine a[data-modulo]').forEach(a => a.classList.toggle('attivo', a.dataset.modulo === chiave));
      return r;
    };
  }

  function avvia() {
    let arrivo = [];
    try { arrivo = JSON.parse(sessionStorage.getItem(CHIAVE) || '[]'); sessionStorage.removeItem(CHIAVE); } catch (e) { arrivo = []; }
    if (P.vista) window.cambiaVista(P.vista);
    if (P.vista === 'fi' && window.FIModules) window.FIModules.go(P.modulo || 'home');
    if (P.vista === 'fabbisogno-pm' && window.FabbisognoPM) window.FabbisognoPM.render();
    if (P.sd && window.SDMM) window.SDMM.vai(P.sd);
    if (P.pp && window.PP) window.PP.vai(P.pp);
    for (const [oggetto, metodo, args] of arrivo) {
      try {
        const bersaglio = oggetto ? window[oggetto] : window;
        if (bersaglio && typeof bersaglio[metodo] === 'function') bersaglio[metodo](...args);
      } catch (e) { console.error('Ponte pagine:', oggetto + '.' + metodo, e); }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
  else avvia();
})();
