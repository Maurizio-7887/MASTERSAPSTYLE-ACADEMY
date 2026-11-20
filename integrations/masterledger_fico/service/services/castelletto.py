"""services/castelletto.py — Esposizione totale su fornitori e clienti.

Il "castelletto" (EconomicSubject.credit_limit) è il limite di esposizione
dato dal fornitore/cliente stesso o stimato internamente. Le funzioni qui
sotto calcolano l'esposizione ATTUALE da confrontare con quel limite, prima
di creare un nuovo Ordine Fornitore/Cliente — esposizione totale, non solo
il non pagato: ordini aperti non ancora fatturati CONTANO ANCHE LORO, sono
un impegno preso anche se non c'è ancora una fattura.

Precisione: PurchaseOrderLine.qty_invoiced è tracciato per riga (three-way
match), quindi il "non ancora fatturato" sugli acquisti è ESATTO, non
stimato. Sulle vendite SalesOrderLine non ha un equivalente qty_invoiced
diretto — si usa qty_delivered come proxy: in questo sistema la consegna
genera subito il rateo di fatturazione (vedi blueprints/sd/routes.py::
_genera_rateo_ddt), quindi "consegnato" e "fatturato a breve" coincidono
nella pratica.

Multi-azienda: un fornitore/cliente può essere condiviso tra Iron
Segnaletica e Iron Wood (EconomicSubject non è per-azienda), ma
l'esposizione va sempre confrontata separatamente — sono due libri
contabili legalmente distinti, un debito verso Iron Segnaletica non ha
nulla a che fare col castelletto verso Iron Wood. company_id filtra
correttamente la parte "ordini aperti" (SalesOrder/PurchaseOrder hanno
company_id). LIMITE NOTO: la parte "fatture non pagate" (_non_pagato)
resta ancora GLOBALE — JournalEntry non ha ancora company_id (arriverà
con la contabilità multi-azienda vera di Angelo, non ancora costruita).
Finché quella parte non è tracciata per azienda, l'esposizione da fatture
aperte resta un dato aggregato tra le due aziende — da tenere a mente,
non un errore silenzioso: è documentato qui.
"""
from decimal import Decimal

from extensions import db
from models import PurchaseOrder, SalesOrder, InvoiceInstallment, JournalEntry


def _non_pagato(economic_subject_id):
    """Somma dei residui (InvoiceInstallment.residual_amount > 0) delle
    fatture — clienti o fornitori, la query è la stessa — legate a questo
    soggetto tramite JournalEntry.economic_subject_id.
    NOTA: non ancora filtrabile per azienda, vedi docstring di modulo."""
    tot = (
        db.session.query(db.func.coalesce(db.func.sum(InvoiceInstallment.residual_amount), 0))
        .join(JournalEntry, InvoiceInstallment.entry_id == JournalEntry.id)
        .filter(JournalEntry.economic_subject_id == economic_subject_id,
               InvoiceInstallment.residual_amount > 0)
        .scalar()
    )
    return Decimal(str(tot or 0))


def esposizione_fornitore(vendor_id, company_id=None):
    """Esposizione totale su un fornitore: valore degli Ordini d'Acquisto
    aperti non ancora fatturati (per riga, esatto: qty - qty_invoiced) +
    residuo delle Fatture Fornitore non ancora pagate. Se company_id è
    dato, gli ordini aperti sono filtrati su quell'azienda soltanto."""
    aperti = Decimal("0")
    query = PurchaseOrder.query.filter_by(economic_subject_id=vendor_id)
    if company_id is not None:
        query = query.filter_by(company_id=company_id)
    for po in query.all():
        for l in po.lines:
            residuo_qty = Decimal(str(l.qty)) - Decimal(str(l.qty_invoiced or 0))
            if residuo_qty > 0:
                aperti += residuo_qty * Decimal(str(l.price))
    return aperti + _non_pagato(vendor_id)


def esposizione_cliente(customer_id, company_id=None):
    """Esposizione totale su un cliente: valore degli Ordini Cliente
    aperti non ancora consegnati (per riga: qty - qty_delivered, proxy di
    'non ancora fatturato' — vedi nota di modulo) + residuo delle Fatture
    Cliente non ancora incassate. Se company_id è dato, gli ordini aperti
    sono filtrati su quell'azienda soltanto."""
    aperti = Decimal("0")
    query = SalesOrder.query.filter_by(economic_subject_id=customer_id)
    if company_id is not None:
        query = query.filter_by(company_id=company_id)
    for so in query.all():
        for l in so.lines:
            residuo_qty = Decimal(str(l.qty)) - Decimal(str(l.qty_delivered or 0))
            if residuo_qty > 0:
                aperti += residuo_qty * Decimal(str(l.price))
    return aperti + _non_pagato(customer_id)
