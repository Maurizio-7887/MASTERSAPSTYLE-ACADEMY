/* «Scopri i codici SAP»: pulsante in basso a sinistra su ogni pagina; i codici SAP restano nascosti finché non si preme. */
(function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
  function avvia() {
  (function () {
    if (typeof document === 'undefined' || !document.body || document.getElementById('msa-sap-btn')) return;
    var CHIAVE = 'msa-sap', MODULI = [['Ciclo attivo (vendite)', 'SD · Sales and Distribution'], ['Ciclo passivo e magazzino', 'MM · Materials Management'], ['Produzione', 'PP · Production Planning'],
      ['Contabilità generale', 'FI · Financial Accounting'], ['Controllo di gestione e centri di costo', 'CO · Controlling'], ['Magazzino operativo', 'WM / EWM · Warehouse Management'], ['Analisi di redditività', 'CO-PA · Profitability Analysis']];
    var st = document.createElement('style');
    st.textContent = '.sap{display:none}body.msa-sap .sap{display:inline;color:#0a6ed1;font-weight:600}.lab-card header .tc.sap{display:none}body.msa-sap .lab-card header .tc.sap{display:inline}' +
      '#msa-sap-btn{position:fixed;left:14px;bottom:14px;z-index:60;background:#0a6ed1;color:#fff;border:0;border-radius:20px;padding:9px 15px;font:600 13px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}' +
      '#msa-sap-btn[aria-pressed=true]{background:#354a5f}#msa-sap-pan{position:fixed;left:14px;bottom:58px;z-index:60;width:min(380px,calc(100vw - 28px));max-height:60vh;overflow:auto;background:#fff;border:1px solid #c9d3de;border-radius:10px;padding:12px 14px;box-shadow:0 4px 18px rgba(0,0,0,.25);font:13px/1.4 system-ui,sans-serif;color:#1d2d3e}' +
      '#msa-sap-pan h3{margin:10px 0 4px;font-size:13px}#msa-sap-pan h3:first-child{margin-top:0}#msa-sap-pan table{border-collapse:collapse;width:100%}#msa-sap-pan td{padding:3px 6px;border-bottom:1px solid #eef2f6;vertical-align:top}#msa-sap-pan td:last-child{font-weight:600;color:#0a6ed1;white-space:nowrap}' +
      '.lab-scelte{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}.lab-scelta{display:flex;flex-direction:column;gap:4px;text-align:left;padding:12px 14px;border:2px solid #c9d3de;border-radius:10px;background:#fff;cursor:pointer;font:inherit;color:inherit}' +
      '.lab-scelta .ic{font-size:22px}.lab-scelta small{color:#5b6b7c}.lab-scelta.att{border-color:#0a6ed1;background:#eef5fc}.lab-dett{margin:12px 0;background:#fff;border:1px solid #dde4ec;border-radius:8px;padding:8px 14px}.lab-dett summary{cursor:pointer;font-weight:600}';
    document.head.appendChild(st);
    var attivo = false; try { attivo = localStorage.getItem(CHIAVE) === '1'; } catch (e) { /* senza memoria locale */ }
    var btn = document.createElement('button'); btn.type = 'button'; btn.id = 'msa-sap-btn';
    var pan = null;
    function applica() { document.body.classList.toggle('msa-sap', attivo); btn.setAttribute('aria-pressed', attivo ? 'true' : 'false'); btn.textContent = attivo ? '🔎 Nascondi i codici SAP' : '🔎 Scopri i codici SAP'; }
    function elenco() {
      var righe = [].map.call(document.querySelectorAll('.lab-card'), function (c) {
        var t = c.querySelector('header .tc.sap'), h = c.querySelector('header h2'); return t && h ? '<tr><td>' + esc(h.textContent) + '</td><td>' + esc(t.textContent) + '</td></tr>' : '';
      }).join('');
      var extra = [].map.call(document.querySelectorAll('.sap:not(.tc)'), function (x) { var p = x.parentElement; return '<tr><td>' + esc((p ? p.textContent.replace(x.textContent, '') : '').trim().slice(0, 70)) + '</td><td>' + esc(x.textContent.replace(/[()]/g, '').trim()) + '</td></tr>'; }).join('');
      return '<h3>Moduli: nome nel corso → sigla SAP</h3><table>' + MODULI.map(function (m) { return '<tr><td>' + m[0] + '</td><td>' + m[1] + '</td></tr>'; }).join('') + '</table>' +
        (righe || extra ? '<h3>In questa pagina: attività → codice SAP</h3><table>' + righe + extra + '</table>' : '');
    }
    btn.onclick = function () {
      attivo = !attivo; try { localStorage.setItem(CHIAVE, attivo ? '1' : '0'); } catch (e) { /* ok */ }
      applica();
      if (pan) { pan.remove(); pan = null; }
      if (attivo) { pan = document.createElement('div'); pan.id = 'msa-sap-pan'; pan.innerHTML = '<p style="margin:0 0 8px"><b>Corrispondenze con SAP</b> — i codici ora compaiono accanto ai nomi.</p>' + elenco(); document.body.appendChild(pan); }
    };
    document.body.appendChild(btn); applica();
  })();

  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
