/* SISTEMA INTEGRATO — CO-PA: KE30 conto economico per segmento e KE24 righe singole. */
(function () {
  'use strict';
  var L = window.LabMotore, U = window.S4UI, SD = window.SD4, K = window.COPA, C = window.LAB_PAGINA || {};
  var N = SD.avvia(C.chiave), radice = document.getElementById('lab');
  if (!radice) return;
  var e = L.esc, eur = L.eur, n0 = L.n0, fd = L.fd, S = function () { return N.S; };
  var etichetta = function (dim, k) { return dim === 'cliente' ? k + ' ' + e(U.nome(S(), k)) : dim === 'profitCenter' && k !== 'NON-ASSEGNATO' ? k + ' ' + e((K.impianto(S()).centri.find(function(c){return c.codice === k;}) || {}).nome || '') : e(k); };
  var PAGINE = {
    ke30: function () {
      // stesso margine per centro di profitto letto dalle righe FI: deve coincidere con CO-PA (KE30)
      var fiPc = function () {
        var anni = {}; S().copa.forEach(function (r) { anni[r.data.slice(0, 4)] = 1; });
        var anno = per ? per.slice(0, 4) : (Object.keys(anni).sort().pop() || '');
        var fi = K.fiPerProfitCenter(S(), anno), co = K.report(S(), 'profitCenter', anno ? {dal: anno + '-01-01', al: anno + '-12-31'} : {}).righe;
        if (!fi.length) return '<p class="lab-nota">Nessun ricavo in FI per l’anno ' + e(anno) + '.</p>';
        var tornano = fi.every(function (g) { var c = co.find(function (x) { return x.chiave === g.chiave; }) || {mdc2: 0, ricaviRettificati: 0, costoVenduto: 0};
          return Math.abs(g.ricaviNetti - c.ricaviRettificati) < 0.005 && Math.abs(g.costoVenduto - c.costoVenduto) < 0.005 && Math.abs(g.mdc2 - c.mdc2) < 0.005; });
        return '<p><b>Lo stesso margine letto nelle righe FI ' + e(anno) + '</b> (ricavi, sconti, trasporti, resi, costo del venduto, differenze di prezzo e provvigioni: il materiale viene dalla fattura o dalla consegna d’origine).</p>' +
          '<table class="lab-tabella"><thead><tr><th>Centro di profitto</th><th>Ricavi lordi (conto 40)</th><th>Ricavi netti dopo resi e abbuoni</th><th>Costo del venduto</th><th>MdC I</th><th>MdC II</th></tr></thead><tbody>' +
          fi.map(function (g) { return '<tr><td>' + e(g.chiave) + '</td><td>' + eur(g.ricaviLordi) + '</td><td>' + eur(g.ricaviNetti) + '</td><td>' + eur(g.costoVenduto) + '</td><td>' + eur(g.mdc1) + '</td><td>' + eur(g.mdc2) + '</td></tr>'; }).join('') +
          '</tbody></table><p class="lab-esito ' + (tornano ? 'ok' : 'ko') + '">' + (tornano ? '✓ FI e CO-PA danno gli stessi ricavi netti, costo del venduto e margini per centro di profitto.' : '⚠️ FI e CO-PA non coincidono per centro di profitto: controlla fatture, consegne e note di credito dell’anno.') + '</p>' +
          '<p class="lab-nota">I ricavi lordi possono differire da KE30: in FI un reso va sul conto 49 «Resi e abbuoni», in CO-PA riduce i ricavi lordi. I ricavi netti dopo resi e abbuoni e i margini devono invece coincidere. I costi di periodo (personale, affitto, ammortamenti, spese generali) restano sui centri di costo e non sono attribuiti ai centri di profitto: il MdC II non è l’utile.</p>';
      };
      var dim = radice.dataset.dim || 'cliente', per = radice.dataset.per || '';
      var mesi = [], viste = {};
      S().copa.forEach(function (r) { var m = r.data.slice(0, 7); if (!viste[m]) { viste[m] = 1; mesi.push(m); } });
      var rep = K.report(S(), dim, per ? {dal: per + '-01', al: L.fineMese(per)} : {});
      var col = rep.righe.concat([rep.totale]);
      var pc = K.impianto(S()), mpc = Object.keys(S().materiali || {}).filter(function(m){return (S().materiali[m] || {}).tipo === 'FERT' || (S().materiali[m] || {}).tipo === 'HALB';});
      var assegnazione = '<details class="lab-nota" '+(dim === 'profitCenter'?'open':'')+'><summary><b>Configurazione centri di profitto (CO-PA)</b></summary>'+
        '<p>Un centro di profitto è responsabile di ricavi e costi attribuibili a una linea di business; NON coincide automaticamente con un centro di costo. Assegna i materiali ai centri di profitto prima del report. L’assegnazione classifica i dati CO-PA già presenti senza creare scritture FI.</p>'+
        '<table class="lab-tabella"><thead><tr><th>Materiale</th><th>Centro di profitto responsabile</th></tr></thead><tbody>'+
        mpc.map(function(m){return '<tr><td>'+e(m)+'</td><td><select data-pc-materiale="'+e(m)+'"><option value="">Non assegnato</option>'+
          pc.centri.map(function(c){return '<option value="'+e(c.codice)+'"'+(pc.materiale[m] === c.codice?' selected':'')+'>'+e(c.codice+' · '+c.nome)+'</option>';}).join('')+
          '</select></td></tr>';}).join('')+'</tbody></table>'+
        fiPc() + '</details>';
      var riga = function (nomeR, campo, segno, cls) { return {cls: cls || '', celle: [nomeR].concat(col.map(function (x) { return (segno && x[campo] ? '−' : '') + eur(Math.abs(x[campo]) * (segno ? 1 : Math.sign(x[campo]) || 1)); }))}; };
      var righe = [riga('Quantità (pz)', 'qta'), riga('Ricavi lordi (PR00)', 'ricaviLordi'), riga('Sconti quantità (ZSCA)', 'scontiQuantita', true), riga('Sconti cliente (K007)', 'scontiCliente', true),
        riga('Trasporti addebitati (KF00)', 'trasporti'), riga('= Ricavi netti', 'ricaviNetti', false, 'tot'), riga('Resi e abbuoni (G2)', 'abbuoni'), riga('= Ricavi netti dopo rettifiche', 'ricaviRettificati', false, 'tot'),
        riga('Costo del venduto a standard (VPRS)', 'costoVenduto', true), riga('= MdC I a costo standard', 'mdc1Std', false, 'tot'),
        riga('Differenze di prezzo (Material Ledger)', 'diffPrezzo', true), riga('= MARGINE DI CONTRIBUZIONE I (costo effettivo)', 'mdc1', false, 'tot'),
        {celle: ['  MdC I in % dei ricavi'].concat(col.map(function (x) { return n0(x.mdc1Perc) + ' %'; }))},
        riga('Provvigioni agenti (ERB1)', 'provvigioni', true), riga('= MARGINE DI CONTRIBUZIONE II', 'mdc2', false, 'tot'),
        {celle: ['  MdC II in % dei ricavi'].concat(col.map(function (x) { return n0(x.mdc2Perc) + ' %'; }))}];
      righe[0] = {celle: ['Quantità (pz)'].concat(col.map(function (x) { return n0(x.qta); }))};
      radice.innerHTML = U.avviso(S()) +
        '<div class="lab-filtro"><label>Analizza per <select id="dim">' + Object.keys(K.DIMENSIONI).map(function (k) { return '<option value="' + k + '"' + (k === dim ? ' selected' : '') + '>' + K.DIMENSIONI[k] + '</option>'; }).join('') + '</select></label> <label>Periodo <select id="per"><option value="">tutti</option>' + mesi.map(function (m) { return '<option value="' + m + '"' + (m === per ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label>' +
        '<span class="lab-nota">Il conto economico per segmento: stesse fatture, viste per ' + K.DIMENSIONI[dim].toLowerCase() + '.</span></div>' +
        assegnazione + L.scheda('📊', 'Margine di contribuzione per ' + K.DIMENSIONI[dim].toLowerCase(), 'KE30', L.tabella(['Voce'].concat(col.map(function (x) { return (x.chiave === 'Totale' ? '<b>Totale</b>' : etichetta(dim, x.chiave)) + '›'; })), righe, 'Nessuna fattura ancora.') +
          '<p class="lab-nota">Il CO-PA è calcolatorio: legge i campi valore scritti dalle fatture (ricavi, sconti, costo standard VPRS). Il costo del venduto è a standard; con la chiusura del Material Ledger (CKMLCP) arrivano le differenze di prezzo del venduto, per cliente: il MdC I diventa a costo effettivo.</p>');
      radice.querySelectorAll('[data-pc-materiale]').forEach(function(el){el.onchange=function(){
        K.salvaAssegnazione(S(),el.getAttribute('data-pc-materiale'),el.value);
        N.salva();
        radice.dataset.dim='profitCenter';rendi();
      };});
      radice.querySelector('#dim').onchange = function () { radice.dataset.dim = this.value; rendi(); };
      radice.querySelector('#per').onchange = function () { radice.dataset.per = this.value; rendi(); };
    },
    ke24: function () {
      radice.innerHTML = U.avviso(S()) + L.scheda('🧾', 'Righe singole CO-PA', 'KE24', L.tabella(['Data', 'Documento', 'Tipo', 'Cliente', 'Materiale', 'Regione', 'Canale', 'Q.tà›', 'Ricavi lordi›', 'Sconti›', 'Trasporti›', 'Abbuoni›', 'Costo venduto›', 'Diff. prezzo ML›', 'Provvigioni›', 'Centro di profitto'],
        S().copa.map(function (r) { return [fd(r.data), r.doc, r.tipo, etichetta('cliente', r.cliente), r.materiale, r.regione, r.canale, n0(r.qta), eur(r.ricaviLordi), eur(r.scontiQuantita + r.scontiCliente), eur(r.trasporti), eur(r.abbuoni), eur(r.costoVenduto), eur(r.diffPrezzo || 0), eur(r.provvigioni), K.profitCenter(S(),r)]; }), 'Nessuna riga.'));
    },
  };
  function rendi() { (PAGINE[C.pagina] || PAGINE.ke30)(); }
  rendi();
})();
