"""Pareggio partite (F-32 clienti, F-44 fornitori): compensa una nota di credito
con le rate aperte delle fatture dello stesso soggetto, senza movimento di cassa.

Non serve una scrittura: fattura e nota di credito sono già registrate sullo
stesso conto clienti (o fornitori) e si annullano a vicenda. Il pareggio chiude
le partite: riduce il residuo delle rate e segna come pagati i documenti chiusi.

La nota di credito si usa per intero (residuo zero), così non può essere
riutilizzata anche in un incasso o in un pagamento.
"""
from decimal import Decimal

from extensions import db
from models import InvoiceInstallment, JournalEntry
from services.payments import reverse_payment_allocations
from models import PaymentAllocation

ZERO = Decimal("0.00")
CENT = Decimal("0.01")
LATI = {
    # lato: (tipo fattura, filtro nota di credito)
    "clienti": ("DR", lambda q: q.filter(JournalEntry.doc_type == "DG")),
    "fornitori": ("KR", lambda q: q.filter(JournalEntry.doc_type == "KR", JournalEntry.gross_amount < 0)),
}


class PareggioError(ValueError):
    pass


def _base(company_id):
    q = JournalEntry.query.filter(JournalEntry.is_paid.is_(False), JournalEntry.is_reversed.is_(False),
                                  JournalEntry.reverses_id.is_(None))
    return q.filter(JournalEntry.company_id == company_id) if company_id else q


def note_aperte(lato, company_id=None):
    _tipo, filtro = LATI[lato]
    return filtro(_base(company_id)).order_by(JournalEntry.doc_date).all()


def rate_aperte(lato, economic_subject_id, company_id=None):
    tipo, _ = LATI[lato]
    q = (InvoiceInstallment.query.join(JournalEntry, InvoiceInstallment.entry_id == JournalEntry.id)
         .filter(JournalEntry.doc_type == tipo, JournalEntry.economic_subject_id == economic_subject_id,
                 JournalEntry.is_reversed.is_(False), JournalEntry.reverses_id.is_(None),
                 InvoiceInstallment.residual_amount > 0))
    if tipo == "KR":
        q = q.filter(JournalEntry.gross_amount > 0)
    if company_id:
        q = q.filter(JournalEntry.company_id == company_id)
    return q.order_by(InvoiceInstallment.due_date).all()


def importo_nota(nota):
    return abs(Decimal(str(nota.gross_amount or 0))).quantize(CENT)


def pareggia(lato, nota_id, importi, created_by_id=None, company_id=None):
    """importi: {installment_id: importo}. Il totale deve essere pari alla nota."""
    nota = db.session.get(JournalEntry, nota_id)
    if nota is None or nota not in note_aperte(lato, company_id):
        raise PareggioError("Nota di credito non trovata o già pareggiata.")
    totale_nota = importo_nota(nota)
    ammesse = {r.id: r for r in rate_aperte(lato, nota.economic_subject_id, company_id)}
    totale = ZERO
    for inst_id, raw in importi.items():
        try:
            imp = Decimal(str(raw or 0)).quantize(CENT)
        except Exception:
            raise PareggioError("Importo non valido.")
        if imp == ZERO:
            continue
        inst = ammesse.get(inst_id)
        if inst is None:
            raise PareggioError("Rata non aperta o di un altro soggetto.")
        if imp < 0 or imp > inst.residual_amount:
            raise PareggioError(f"Rata {inst.numero_rata} di {inst.entry.doc_number}: importo oltre il residuo.")
        inst.residual_amount = (Decimal(str(inst.residual_amount)) - imp).quantize(CENT)
        inst.version += 1
        db.session.add(PaymentAllocation(payment_entry_id=nota.id, installment_id=inst.id,
                                         cash_amount=imp, abbuono_amount=ZERO))
        totale += imp
        if inst.residual_amount == ZERO:
            altre = InvoiceInstallment.query.filter(InvoiceInstallment.entry_id == inst.entry_id,
                                                    InvoiceInstallment.id != inst.id,
                                                    InvoiceInstallment.residual_amount > 0).first()
            if altre is None:
                inst.entry.is_paid = True
                inst.entry.paid_by_entry_id = nota.id
    if totale != totale_nota:
        db.session.rollback()
        raise PareggioError(f"La nota di credito vale {totale_nota} €: va pareggiata per intero "
                            f"(indicati {totale} €).")
    nota.is_paid = True
    db.session.commit()
    return totale


def annulla(nota_id, created_by_id=None):
    nota = db.session.get(JournalEntry, nota_id)
    if nota is None or not PaymentAllocation.query.filter_by(payment_entry_id=nota_id, reversed=False).first():
        raise PareggioError("Nessun pareggio da annullare per questo documento.")
    reverse_payment_allocations(nota_id, created_by_id)
    nota.is_paid = False
    db.session.commit()
