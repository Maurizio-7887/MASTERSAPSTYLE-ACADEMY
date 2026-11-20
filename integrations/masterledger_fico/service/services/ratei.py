"""Ratei e risconti (FBS1) con storno automatico (F.81).

| Tipo              | Quando                                   | Scrittura                         |
| rateo attivo      | ricavo maturato, incasso futuro          | Ratei attivi a Ricavo             |
| rateo passivo     | costo maturato, pagamento futuro         | Costo a Ratei passivi             |
| risconto attivo   | costo già registrato, competenza futura  | Risconti attivi a Costo           |
| risconto passivo  | ricavo già registrato, competenza futura | Ricavo a Risconti passivi         |

La scrittura (documento RR) porta la data di storno: F.81 genera lo storno con
quella data, di norma il 1° gennaio dell'esercizio successivo.
"""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from extensions import db
from models import Account, AccountMapping, JournalEntry
from services.co import validate_co_assignment, COValidationError

ZERO = Decimal("0.00")
CENT = Decimal("0.01")
SOURCE = "RATEI"

TIPI = {
    # tipo: (etichetta, natura conto economico, concetto conto patrimoniale, il conto patrimoniale va in Dare?)
    "rateo_attivo": ("Rateo attivo", "ricavo", "ratei_attivi", True),
    "rateo_passivo": ("Rateo passivo", "costo", "ratei_passivi", False),
    "risconto_attivo": ("Risconto attivo", "costo", "risconti_attivi", True),
    "risconto_passivo": ("Risconto passivo", "ricavo", "risconti_passivi", False),
}


class RateiError(ValueError):
    pass


def quota_giorni(totale, inizio, fine, competenza_al, quota="futura"):
    """Quota di un importo per giorni: 'futura' = giorni dopo competenza_al
    (risconti), 'maturata' = giorni fino a competenza_al inclusa (ratei)."""
    totale = Decimal(str(totale))
    if fine < inizio:
        raise RateiError("Il periodo di riferimento non è valido.")
    giorni = (fine - inizio).days + 1
    maturati = min(max((competenza_al - inizio).days + 1, 0), giorni)
    g = giorni - maturati if quota == "futura" else maturati
    return (totale * g / giorni).quantize(CENT, ROUND_HALF_UP), g, giorni


def registra(tipo, data, data_storno, conto_ce_id, importo, descrizione, cost_center_id=None,
             company_id=None, created_by_id=None):
    from services.posting import post_journal_entry
    if tipo not in TIPI:
        raise RateiError("Tipo non valido.")
    etichetta, natura, concetto, sp_in_dare = TIPI[tipo]
    importo = Decimal(str(importo or 0)).quantize(CENT)
    if importo <= 0:
        raise RateiError("L'importo deve essere positivo.")
    if not data_storno or data_storno <= data:
        raise RateiError("La data di storno deve essere successiva alla data di registrazione.")
    conto_ce = db.session.get(Account, conto_ce_id) if conto_ce_id else None
    if conto_ce is None or conto_ce.account_type != natura:
        raise RateiError(f"Per un {etichetta.lower()} serve un conto di {'ricavo' if natura == 'ricavo' else 'costo'}.")
    try:
        _, center = validate_co_assignment(conto_ce.id, cost_center_id)
    except COValidationError as exc:
        raise RateiError(str(exc))
    conto_sp = AccountMapping.get(concetto)
    if conto_sp is None:
        raise RateiError(f"Conto '{concetto}' non configurato nella determinazione automatica (OBYC).")
    riga_sp = {"account_id": conto_sp.id, "description": descrizione}
    riga_ce = {"account_id": conto_ce.id, "description": descrizione,
               "cost_center_id": center.id if center else None}
    if sp_in_dare:
        riga_sp.update(dare=importo, avere=ZERO)
        riga_ce.update(dare=ZERO, avere=importo)
    else:
        riga_sp.update(dare=ZERO, avere=importo)
        riga_ce.update(dare=importo, avere=ZERO)
    entry = post_journal_entry("RR", "26", data, f"{etichetta}: {descrizione}"[:255], [riga_sp, riga_ce],
                               source_module=SOURCE, reference=etichetta, created_by_id=created_by_id,
                               posting_date=data, commit=False, company_id=company_id)
    entry.reversal_date = data_storno
    db.session.commit()
    return entry


def da_stornare(fino_al, company_id=None):
    q = JournalEntry.query.filter(JournalEntry.doc_type == "RR", JournalEntry.reversal_date.isnot(None),
                                  JournalEntry.reversal_date <= fino_al, JournalEntry.is_reversed.is_(False),
                                  JournalEntry.reverses_id.is_(None))
    if company_id:
        q = q.filter(JournalEntry.company_id == company_id)
    return q.order_by(JournalEntry.reversal_date, JournalEntry.doc_number).all()


def esegui_storni(fino_al, company_id=None, created_by_id=None):
    """F.81: storna ogni rateo/risconto con data di storno fino a `fino_al`,
    registrando lo storno alla sua data di storno."""
    from services.posting import post_journal_entry
    fatti = []
    for e in da_stornare(fino_al, company_id):
        righe = [{"account_id": l.account_id, "dare": l.avere, "avere": l.dare,
                  "description": f"STORNO {l.description or ''}"[:255], "cost_center_id": l.cost_center_id}
                 for l in e.lines]
        s = post_journal_entry("RR", "26", e.reversal_date, f"Storno {e.description or e.doc_number}"[:255], righe,
                               source_module=SOURCE, reference=e.doc_number, created_by_id=created_by_id,
                               posting_date=e.reversal_date, commit=False, allow_inactive_accounts=True,
                               company_id=e.company_id)
        e.is_reversed = True
        e.reversed_by_id = s.id
        s.reverses_id = e.id
        fatti.append((e, s))
    db.session.commit()
    return fatti
