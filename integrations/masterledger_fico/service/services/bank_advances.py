"""
services/bank_advances.py — RiBa "salvo buon fine" e Anticipo Fatture.

Tre operazioni, tutte atomiche (una sola scrittura di prima nota ciascuna):

1. presenta_distinta(): crea la distinta (BankAdvance + righe) e la
   scrittura di ACCREDITO. Non tocca le rate cliente (InvoiceInstallment):
   il credito resta aperto, si apre solo un debito verso la banca.

     Dare Banca c/c            (net_credited = gross - oneri bancari)
     Dare Oneri Finanziari      (oneri bancari, se > 0)
     Avere Banca c/anticipi SBF / Debiti v/Banche Anticipi Fatture (gross)

2. registra_buon_fine(): il cliente ha pagato — chiude INSIEME il debito
   verso la banca e il credito verso il cliente (riusa allocate_payment
   per il lato "credito cliente", esattamente come un incasso normale).

     Dare Banca c/anticipi SBF / Debiti Anticipi Fatture (amount riga)
     Avere Crediti v/Clienti                              (amount riga)

3. registra_insoluto(): il cliente NON ha pagato — si storna solo il
   debito verso la banca (che si è ripresa l'anticipo dal conto corrente);
   il credito cliente torna aperto e basta, nessuna allocazione da fare.

     Dare Banca c/anticipi SBF / Debiti Anticipi Fatture (amount riga)
     Avere Banca c/c                                      (amount riga)

Ogni riga (BankAdvanceLine) matura il proprio esito indipendentemente
dalle altre — in banca, distinta con più clienti, ognuno paga (o no) alla
sua scadenza.
"""
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from extensions import db
from models import (BankAdvance, BankAdvanceLine, InvoiceInstallment, AccountMapping)
from services.posting import post_journal_entry, UnbalancedEntryError
from services.payments import allocate_payment, PaymentAllocationError

CENT = Decimal("0.01")

TIPI_VALIDI = ("riba_sbf", "anticipo_fatture")

DOC_TYPE_PER_TIPO = {"riba_sbf": "RB", "anticipo_fatture": "AN"}
PREFIX_PER_TIPO = {"riba_sbf": "22", "anticipo_fatture": "23"}
CONCEPT_PER_TIPO = {"riba_sbf": "banca_anticipi_sbf", "anticipo_fatture": "debiti_anticipi_fatture"}


class BankAdvanceError(ValueError):
    """Violazione di un vincolo su distinte di anticipo bancario."""


def _money(value, label):
    try:
        amount = Decimal(str(value if value is not None else 0))
    except (InvalidOperation, ValueError, TypeError):
        raise BankAdvanceError(f"{label}: importo non valido.")
    if not amount.is_finite() or amount < 0:
        raise BankAdvanceError(f"{label}: l'importo deve essere un numero finito non negativo.")
    return amount.quantize(CENT)


def presenta_distinta(tipo, righe, bank_charges_amount=0,
                       doc_date=None, created_by_id=None, company_id=None):
    """Crea una distinta RiBa SBF o Anticipo Fatture e la registra in prima nota.

    righe: lista di dict {"installment_id": int, "amount": Decimal} — le
    rate cliente da anticipare (di norma amount = residual_amount della
    rata, ma può essere una quota parziale). Ogni rata deve essere ancora
    aperta (residual_amount > 0) e non già presente in un'altra distinta
    ancora aperta (non si anticipa due volte lo stesso credito).
    """
    if tipo not in TIPI_VALIDI:
        raise BankAdvanceError(f"Tipo anticipo non valido: {tipo!r}.")
    if not righe:
        raise BankAdvanceError("Seleziona almeno una rata da anticipare.")

    oneri = _money(bank_charges_amount, "Oneri bancari")
    doc_date = doc_date or date.today()

    installment_ids = [r.get("installment_id") for r in righe]
    installments = {i.id: i for i in InvoiceInstallment.query.filter(
        InvoiceInstallment.id.in_(installment_ids)).with_for_update().all()}

    normalized = []
    gross = Decimal("0")
    for r in righe:
        inst = installments.get(r.get("installment_id"))
        if inst is None:
            raise BankAdvanceError(f"Rata #{r.get('installment_id')} inesistente.")
        amount = _money(r.get("amount", inst.residual_amount), f"Rata {inst.numero_rata} di {inst.entry.doc_number}")
        if amount <= 0:
            raise BankAdvanceError(f"Rata {inst.numero_rata} di {inst.entry.doc_number}: importo da anticipare nullo.")
        if amount > _money(inst.residual_amount, "Residuo rata"):
            raise BankAdvanceError(
                f"Rata {inst.numero_rata} di {inst.entry.doc_number}: richiesti {amount:.2f} € "
                f"ma il residuo aperto è {inst.residual_amount:.2f} €."
            )
        already_advanced = (db.session.query(db.func.coalesce(db.func.sum(BankAdvanceLine.amount), 0))
                             .join(BankAdvance)
                             .filter(BankAdvanceLine.installment_id == inst.id,
                                     BankAdvanceLine.esito == "in_corso").scalar())
        if _money(already_advanced, "Già anticipato") > 0:
            raise BankAdvanceError(
                f"Rata {inst.numero_rata} di {inst.entry.doc_number} è già in una distinta di anticipo aperta."
            )
        normalized.append((inst, amount))
        gross += amount

    if oneri > gross:
        raise BankAdvanceError("Gli oneri bancari non possono superare l'importo lordo anticipato.")

    bank_account = AccountMapping.get_or_error("banca_principale")
    liability_account = AccountMapping.get_or_error(CONCEPT_PER_TIPO[tipo])
    net_credited = gross - oneri

    lines = [{"account_id": bank_account.id, "dare": net_credited, "avere": 0}]
    if oneri > 0:
        oneri_account = AccountMapping.get_or_error("oneri_finanziari_bancari")
        lines.append({"account_id": oneri_account.id, "dare": oneri, "avere": 0})
    lines.append({"account_id": liability_account.id, "dare": 0, "avere": gross})

    etichetta = "Presentazione RiBa s.b.f." if tipo == "riba_sbf" else "Anticipo fatture"
    refs = [inst.entry.doc_number for inst, _ in normalized]

    entry = post_journal_entry(
        doc_type=DOC_TYPE_PER_TIPO[tipo], prefix=PREFIX_PER_TIPO[tipo], doc_date=doc_date,
        description=f"{etichetta} — {', '.join(refs)}",
        lines=lines, source_module="LEDGER", reference=", ".join(refs),
        created_by_id=created_by_id, gross_amount=gross, commit=False, company_id=company_id,
    )
    db.session.flush()

    advance = BankAdvance(
        company_id=company_id, tipo=tipo, doc_number=entry.doc_number, doc_date=doc_date,
        bank_account_id=bank_account.id, gross_amount=gross, bank_charges_amount=oneri,
        advance_entry_id=entry.id, created_by_id=created_by_id,
    )
    db.session.add(advance)
    db.session.flush()

    for inst, amount in normalized:
        db.session.add(BankAdvanceLine(advance_id=advance.id, installment_id=inst.id, amount=amount))

    db.session.commit()
    return advance


def registra_buon_fine(line_id, created_by_id=None, doc_date=None):
    """La rata anticipata è stata incassata dal cliente: chiude insieme il
    debito verso la banca e la rata cliente (riusa allocate_payment)."""
    line = BankAdvanceLine.query.filter_by(id=line_id).with_for_update().first()
    if line is None:
        raise BankAdvanceError(f"Riga anticipo #{line_id} inesistente.")
    if line.esito != "in_corso":
        raise BankAdvanceError(f"Questa riga ha già esito '{line.esito}' — non può essere richiuso.")

    advance = line.advance
    liability_account = AccountMapping.get_or_error(CONCEPT_PER_TIPO[advance.tipo])
    ar_account = AccountMapping.get_or_error("crediti_clienti")
    amount = _money(line.amount, "Importo riga")
    inst = line.installment

    entry = post_journal_entry(
        doc_type="BF", prefix="24", doc_date=doc_date or date.today(),
        description=f"Buon fine {advance.doc_number} — rata {inst.numero_rata} {inst.entry.doc_number}",
        lines=[
            {"account_id": liability_account.id, "dare": amount, "avere": 0},
            {"account_id": ar_account.id, "dare": 0, "avere": amount},
        ],
        source_module="LEDGER", reference=advance.doc_number,
        created_by_id=created_by_id, economic_subject_id=inst.entry.economic_subject_id,
        gross_amount=amount, commit=False, company_id=advance.company_id,
    )
    db.session.flush()

    try:
        allocate_payment(entry, [{"installment_id": inst.id, "cash_amount": amount, "abbuono_amount": 0}],
                          created_by_id=created_by_id)
    except PaymentAllocationError as e:
        db.session.rollback()
        raise BankAdvanceError(str(e))

    line.esito = "buon_fine"
    line.esito_entry_id = entry.id
    line.esito_at = datetime.utcnow()
    db.session.commit()
    return entry


def registra_insoluto(line_id, created_by_id=None, doc_date=None):
    """Il cliente non ha pagato — si storna solo il debito verso la banca
    (che si riprende l'anticipo dal c/c); il credito cliente resta aperto
    esattamente come prima, senza alcuna allocazione."""
    line = BankAdvanceLine.query.filter_by(id=line_id).with_for_update().first()
    if line is None:
        raise BankAdvanceError(f"Riga anticipo #{line_id} inesistente.")
    if line.esito != "in_corso":
        raise BankAdvanceError(f"Questa riga ha già esito '{line.esito}' — non può essere richiuso.")

    advance = line.advance
    liability_account = AccountMapping.get_or_error(CONCEPT_PER_TIPO[advance.tipo])
    bank_account = AccountMapping.get_or_error("banca_principale")
    amount = _money(line.amount, "Importo riga")
    inst = line.installment

    entry = post_journal_entry(
        doc_type="IN", prefix="25", doc_date=doc_date or date.today(),
        description=f"Insoluto {advance.doc_number} — rata {inst.numero_rata} {inst.entry.doc_number}",
        lines=[
            {"account_id": liability_account.id, "dare": amount, "avere": 0},
            {"account_id": bank_account.id, "dare": 0, "avere": amount},
        ],
        source_module="LEDGER", reference=advance.doc_number,
        created_by_id=created_by_id, economic_subject_id=inst.entry.economic_subject_id,
        gross_amount=amount, commit=True, company_id=advance.company_id,
    )

    line.esito = "insoluto"
    line.esito_entry_id = entry.id
    line.esito_at = datetime.utcnow()
    db.session.commit()
    return entry
