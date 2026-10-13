/* Generato da tools/split_simulatore.py (vuoto) — non modificare a mano: modifica sorgenti/ e rilancia. */
inizializzaImpostazioni();
inizializzaSelettoreMastro();
document.getElementById('reg-data').value = new Date().toISOString().slice(0,10);
cambiaTipoRegistrazione();
SDMM.init();
PP.init();
if(window.__migrazioneCostoEseguita){ salvaStato(); mostraToast('✅ Dati aggiornati al costo standard per centro (backup del salvataggio precedente conservato).'); }
if(window.__anomaliaMigrazione) mostraToast('⚠️ ' + window.__anomaliaMigrazione, true);
