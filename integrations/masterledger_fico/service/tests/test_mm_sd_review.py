"""Test di regressione — Turno 3 (MM + SD)."""
from decimal import Decimal

from extensions import db
from models import (Account, CostCenter, EconomicSubject, GoodsReceipt, JournalEntry, Material,
                     PurchaseOrder, PurchaseOrderLine, InvoiceInstallment, SalesOrder,
                     SalesOrderLine, Delivery)


def _prepare_mm_order():
    for code, name, account_type in [
        ("150000", "Magazzino materie prime", "patrimoniale_attivo"),
        ("165000", "Ricevimenti da fatturare", "patrimoniale_passivo"),
        ("460000", "Varianze prezzo", "costo"),
        ("154000", "IVA a credito", "patrimoniale_attivo"),
        ("210000", "Debiti fornitori", "patrimoniale_passivo"),
    ]:
        if not Account.query.filter_by(code=code).first():
            db.session.add(Account(code=code, name=name, account_type=account_type))
    supplier = EconomicSubject.query.filter_by(code="F0001").one()
    material = Material(code="MP-T3", description="Materia prima test", material_type="ROH",
                        purchase_destination="wms")
    po = PurchaseOrder(doc_number="4500000099", economic_subject_id=supplier.id)
    db.session.add_all([material, po])
    db.session.flush()
    line = PurchaseOrderLine(po_id=po.id, material_id=material.id, qty=Decimal("10"), price=Decimal("5"))
    db.session.add(line)
    db.session.commit()
    return po.id, line.id, material.id


def test_invoice_verification_creates_installments_for_scadenzario(login, app):
    """Bug: le fatture create dal three-way match MM non generavano mai rate
    (InvoiceInstallment) — restavano invisibili allo Scadenzario, a
    differenza di ogni altra fattura fornitore (AP manuale, import XML)."""
    with app.app_context():
        po_id, line_id, mat_id = _prepare_mm_order()

    login.post("/mm/goods-receipts", data={
        "po_ids[]": po_id, "ddt_vendor_ref": "DDT-T3", "ddt_date": "2026-08-01",
        "posting_date": "2026-08-01", f"recv_qty_{line_id}": "10.000",
    })
    resp = login.post("/mm/invoice-verification", data={
        "po_id": po_id, "invoice_ref": "FT-T3-1", "invoice_date": "2026-08-05",
        "posting_date": "2026-08-05", "vat_rate": "22",
        f"inv_qty_{line_id}": "10.000", f"inv_price_{line_id}": "5.00",
    })
    assert resp.status_code == 302

    with app.app_context():
        invoice = JournalEntry.query.filter_by(doc_type="KR", reference="FT-T3-1").one()
        installments = InvoiceInstallment.query.filter_by(entry_id=invoice.id).all()
        assert len(installments) == 1
        assert installments[0].amount == invoice.gross_amount
        entry_id = invoice.id

    resp2 = login.post(f"/mm/invoice-verification/{entry_id}/elimina")
    assert resp2.status_code == 302
    with app.app_context():
        assert InvoiceInstallment.query.filter_by(entry_id=entry_id).count() == 0
        assert JournalEntry.query.get(entry_id) is None


def _prepare_sd_order():
    for code, name, typ in [
        ("160000", "Magazzino Prodotti Finiti", "patrimoniale_attivo"),
        ("450000", "Costo del Venduto", "costo"),
        ("300000", "Crediti clienti", "patrimoniale_attivo"),
        ("470000", "IVA a debito", "patrimoniale_passivo"),
        ("4000", "Ricavi Vendita Prodotti", "ricavo"),
    ]:
        if not Account.query.filter_by(code=code).first():
            db.session.add(Account(code=code, name=name, account_type=typ))
    db.session.flush()
    customer = EconomicSubject.query.filter_by(code="C0001").one()
    rev_acc = Account.query.filter_by(code="4000").one()
    cc = CostCenter.query.filter_by(code="CC-TEST-ASA").first()
    if cc is None:
        cc = CostCenter(code="CC-TEST-ASA", name="ASA Test", revenue_account_id=rev_acc.id)
        db.session.add(cc); db.session.flush()
    mat = Material(code="SD-T3", description="Prodotto", material_type="FERT",
                   standard_cost=Decimal("5"), sales_price=Decimal("10"), revenue_center_id=cc.id)
    db.session.add(mat); db.session.flush()
    so = SalesOrder(doc_number="SO-T3-1", economic_subject_id=customer.id)
    db.session.add(so); db.session.flush()
    line = SalesOrderLine(order_id=so.id, material_id=mat.id, qty=Decimal("10"), price=Decimal("10"))
    db.session.add(line); db.session.commit()
    return so.id, mat.id


def test_billing_from_delivery_creates_installments(login, app):
    """Bug: la fattura generata da DDT (Fatturazione DDT) non creava mai le
    rate — stesso bug del three-way match MM, lato SD."""
    with app.app_context():
        so_id, mat_id = _prepare_sd_order()
    login.post("/sd/deliveries", data={"order_ids[]": so_id})
    with app.app_context():
        delivery = Delivery.query.one()
        delivery_id = delivery.id

    resp = login.post("/sd/billing", data={"delivery_id": delivery_id})
    assert resp.status_code == 302
    with app.app_context():
        invoice = JournalEntry.query.filter_by(doc_type="DR", source_module="VENDITE").one()
        installments = InvoiceInstallment.query.filter_by(entry_id=invoice.id).all()
        assert len(installments) == 1
        assert installments[0].amount == invoice.gross_amount
