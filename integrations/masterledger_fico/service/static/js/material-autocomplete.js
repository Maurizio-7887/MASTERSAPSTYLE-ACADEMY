/*
 * material-autocomplete.js — widget di ricerca-mentre-scrivi per gli
 * articoli, riutilizzabile in Preventivi/Ordini Cliente/RFQ/Ordini
 * Fornitore. Sostituisce il <select> con tutti gli articoli dentro
 * (inutilizzabile con centinaia/migliaia di prodotti) con una casella di
 * testo che propone via /materials/api/search mentre si scrive, per
 * codice o descrizione.
 *
 * USO — un elemento <div class="material-autocomplete"> con dentro:
 *   - <input type="text" class="ma-search"> (quello che l'utente vede/digita)
 *   - <input type="hidden" class="ma-value" name="material_id_N">
 *          (quello che arriva al server — stesso nome che aveva il <select>
 *           prima, così il backend non cambia)
 * Il widget si attiva da solo su ogni .material-autocomplete presente
 * nella pagina al caricamento, e su quelli aggiunti dopo via
 * window.initMaterialAutocomplete(container) — utile per righe aggiunte
 * dinamicamente (es. addLine() in Ordini Fornitore).
 *
 * Evento personalizzato 'material-selected' (bubbles) sul contenitore,
 * con detail = {id, code, description, uom, sales_price, standard_cost}
 * — usalo per precompilare il prezzo riga, come già faceva il vecchio
 * <select> con data-price.
 */
(function () {
  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function initOne(container) {
    if (container.dataset.maInit === "1") return;
    container.dataset.maInit = "1";

    const searchInput = container.querySelector(".ma-search");
    const valueInput = container.querySelector(".ma-value");
    if (!searchInput || !valueInput) return;

    const dropdown = document.createElement("div");
    dropdown.className = "ma-dropdown";
    dropdown.style.cssText =
      "position:absolute; z-index:50; background:var(--ml-bg,#0f1420); border:1px solid var(--ml-border,#2a3550); " +
      "border-radius:4px; max-height:240px; overflow-y:auto; display:none; min-width:280px; box-shadow:0 4px 12px rgba(0,0,0,.4);";
    container.style.position = "relative";
    container.appendChild(dropdown);

    let results = [];
    let activeIndex = -1;

    function renderResults() {
      dropdown.innerHTML = "";
      if (results.length === 0) {
        dropdown.style.display = "none";
        return;
      }
      results.forEach((m, i) => {
        const item = document.createElement("div");
        item.className = "ma-item";
        item.style.cssText = "padding:6px 10px; cursor:pointer;" + (i === activeIndex ? " background:var(--ml-blue-dark,#1e2c4d);" : "");
        item.innerHTML = `<span class="mono" style="font-weight:700;">${m.code}</span> — ${m.description} <small style="opacity:.7;">(${m.uom})</small>`;
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          select(m);
        });
        dropdown.appendChild(item);
      });
      dropdown.style.display = "block";
    }

    function select(m) {
      valueInput.value = m.id;
      searchInput.value = `${m.code} — ${m.description}`;
      dropdown.style.display = "none";
      results = [];
      activeIndex = -1;
      container.dispatchEvent(new CustomEvent("material-selected", { detail: m, bubbles: true }));
    }

    const doSearch = debounce(function () {
      const q = searchInput.value.trim();
      if (q.length < 2) {
        results = [];
        renderResults();
        return;
      }
      fetch(`/materials/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          results = data;
          activeIndex = -1;
          renderResults();
        })
        .catch(() => {});
    }, 200);

    searchInput.addEventListener("input", function () {
      // Se l'utente riscrive, la selezione precedente non è più valida
      // finché non ne sceglie una nuova.
      valueInput.value = "";
      doSearch();
    });

    searchInput.addEventListener("keydown", function (e) {
      if (dropdown.style.display === "none") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, results.length - 1);
        renderResults();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        renderResults();
      } else if (e.key === "Enter") {
        if (activeIndex >= 0 && results[activeIndex]) {
          e.preventDefault();
          select(results[activeIndex]);
        }
      } else if (e.key === "Escape") {
        dropdown.style.display = "none";
      }
    });

    searchInput.addEventListener("blur", function () {
      // Piccolo ritardo per lasciar passare il mousedown sull'item.
      setTimeout(() => { dropdown.style.display = "none"; }, 150);
    });
  }

  function initAll(root) {
    (root || document).querySelectorAll(".material-autocomplete").forEach(initOne);
  }

  window.initMaterialAutocomplete = initAll;
  document.addEventListener("DOMContentLoaded", function () { initAll(document); });
})();
