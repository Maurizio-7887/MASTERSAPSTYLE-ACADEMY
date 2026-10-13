/* Indicatori delle mattonelle del launchpad: letti (solo lettura) dallo stato del simulatore
   portato nel browser dal portale (sincronia.js). */
(function () {
  'use strict';
  let S = null;
  try { S = JSON.parse(localStorage.getItem(window.MSA_CHIAVE) || 'null'); } catch (e) { S = null; }
  const n = x => (Number(x) || 0).toLocaleString('it-IT', {maximumFractionDigits: 0});
  const eur = x => (Number(x) || 0).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const regs = () => (S && S.registrazioni) || [];
  const conto = (c, filtro) => regs().filter(filtro || (() => true)).flatMap(r => r.righe || []).filter(x => x.conto === c)
    .reduce((t, x) => t + (x.dareAvere === 'DARE' ? 1 : -1) * (Number(x.importo) || 0), 0);
  const tecnica = r => /^(CHIUSURA_CE|CHIUSURA_SP|APERTURA_SP)$/.test(r.tipo || '');
  const tipo = c => ((S && S.pianoDeiConti) || []).find(p => p.codice === c)?.tipo;
  const K = {
    registrazioni: () => [n(regs().length), 'scritture'],
    banca: () => [eur(conto('10') + ((S.statoPatrimonialeIniziale || {}).cassa0 || 0)), '€ in banca'],
    risultato: () => {
      const anno = String((S.fi && S.fi.annual && S.fi.annual.activeYear) || '');
      let r = 0;
      regs().filter(x => !tecnica(x) && (!anno || (x.data || '').startsWith(anno))).forEach(x => (x.righe || []).forEach(y => {
        const t = tipo(y.conto); if (t === 'RICAVO' || t === 'COSTO') r += (y.dareAvere === 'AVERE' ? 1 : -1) * (Number(y.importo) || 0);
      }));
      return [eur(r), '€ risultato ' + anno];
    },
    cespiti: () => [n(regs().filter(r => r.fi && (r.fi.cespite || r.fi.cespiteDisposto)).length), 'cespiti'],
    clienti: () => [n(((S.sdmm || {}).clienti || []).length), 'clienti'],
    fornitori: () => [n(((S.sdmm || {}).fornitori || []).length), 'fornitori'],
    iva: () => { const v = conto('14') + conto('21') + conto('28'); return [eur(Math.abs(v)), v >= 0 ? '€ IVA a credito' : '€ IVA a debito']; },
    costituzione: () => [(S.fi && S.fi.costituzione) ? S.fi.costituzione.split('-').reverse().join('/') : '—', 'costituzione'],
    budget: () => [n((S.budgetAnnuo || {}).volumeAnnuoPianificato), 'pz a budget'],
    budgetCO: () => [n(((S.fi || {}).budgetPool || []).length), 'mesi di budget'],
    centri: () => [n((S.centriDiCosto || []).length), 'centri di costo'],
    commesse: () => [n((S.commesse || []).length), 'commesse'],
    dipendenti: () => [n(((S.fi || {}).dipendenti || []).length), 'dipendenti'],
    ordiniSD: () => [n(((S.sdmm || {}).ordini || []).length), 'ordini di vendita'],
    ddt: () => [n(((S.sdmm || {}).ddt || []).length), 'DDT'],
    fatture: () => [n(((S.sdmm || {}).fatture || []).length), 'fatture emesse'],
    rfq: () => [n(((S.sdmm || {}).rfq || []).length), 'richieste di offerta'],
    po: () => [n(((S.sdmm || {}).po || []).length), 'ordini di acquisto'],
    migo: () => [n(((S.sdmm || {}).migo || []).length), 'entrate merci'],
    miro: () => [n(((S.sdmm || {}).miro || []).length), 'fatture fornitore'],
    ordiniPP: () => [n(((S.pp || {}).ordini || []).length), 'ordini di produzione'],
    quadratura: () => {
      let d = 0, a = 0; regs().forEach(r => (r.righe || []).forEach(x => { if (x.dareAvere === 'DARE') d += Number(x.importo) || 0; else a += Number(x.importo) || 0; }));
      return [Math.abs(d - a) < 0.005 ? '✓' : '✗', Math.abs(d - a) < 0.005 ? 'Dare = Avere' : 'non quadra'];
    },
  };
  document.querySelectorAll('[data-kpi]').forEach(el => {
    const f = K[el.dataset.kpi];
    if (!f) { el.hidden = true; return; }
    let v = ['—', 'nessun dato ancora'];
    if (S) { try { v = f(); } catch (e) { v = ['—', '']; } }
    el.querySelector('strong').textContent = v[0];
    el.querySelector('span').textContent = v[1];
  });
})();
