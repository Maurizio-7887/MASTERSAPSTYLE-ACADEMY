"""services/azienda_corrente.py — Azienda corrente di Angelo (Fase 3
multi-azienda, portale Ledger).

A differenza di Maria Grazia (due riquadri distinti, 6 link ciascuno —
gestibile perché sono pochi), il portale Ledger ha 12 sezioni: duplicarle
tutte sarebbe ingestibile. Si usa invece un SELETTORE in sessione: Angelo
sceglie l'azienda una volta, da lì in poi ogni scrittura nuova (Prima
Nota, Fatture, Pagamenti, Incassi, Scadenzario) la eredita in automatico,
e gli elenchi si filtrano su quella sola — finché non la cambia o sceglie
"Tutte le aziende".

Sessione, non URL: a differenza di Maria Grazia (dove ?azienda=IRSE sta
nel link cliccato), qui la scelta vale per tutta la sessione di lavoro di
Angelo, non pagina per pagina — coerente con come lavora davvero un
contabile (resta "dentro" un'azienda per tutta la sessione di
registrazione, non salta avanti e indietro documento per documento).
"""
from flask import session
from models import Company

SESSION_KEY = "azienda_corrente_id"


def get_azienda_corrente():
    """Ritorna l'oggetto Company scelto in sessione, o None se non
    impostato (= 'Tutte le aziende', comportamento di sempre)."""
    azienda_id = session.get(SESSION_KEY)
    if not azienda_id:
        return None
    return Company.query.get(azienda_id)


def set_azienda_corrente(company_id):
    """Imposta l'azienda corrente in sessione. None/0/'' -> 'Tutte le
    aziende' (rimuove il filtro)."""
    if company_id:
        session[SESSION_KEY] = int(company_id)
    else:
        session.pop(SESSION_KEY, None)
