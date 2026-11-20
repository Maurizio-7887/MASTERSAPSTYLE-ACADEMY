"""Multi-azienda: numerazione documenti VERAMENTE separata per azienda (vincoli unicita composita)

Bug reale trovato testando due Prime Note vere per due aziende diverse:
IntegrityError su doc_number duplicato. Causa: i vincoli di unicità su
doc_number/rfq_number erano GLOBALI su 7 tabelle (JournalEntry, Quotation,
SalesOrder, Delivery, PurchaseOrder, GoodsReceipt, RequestForQuotation),
ma ora due aziende possono generare lo stesso numero formattato (ciascuna
riparte da 1 con DocumentSequence company_id-scoped) — serve lo stesso
vincolo "numero + azienda" già usato per document_sequences in Fase 1.

Trovato anche, scavando: NESSUNA delle chiamate reali nei blueprint di
Preventivi/Ordini/DDT/RFQ/EM (Fase 2) passava company_id alla
numerazione — i documenti erano taggati per azienda ma la numerazione
restava condivisa, mai davvero separata come richiesto per legge. Non è
mai collassato per puro caso (mai capitato che due aziende creassero il
"primo documento" nello stesso momento nei test precedenti). Corretto
insieme a questa migration (9 chiamate nei blueprint, non in questo file).

Nota: come nelle migration precedenti, l'autogenerate segnala anche
index/FK di journal_entries/journal_lines e la rimozione di
journal_entries.customer_id/vendor_id — drift preesistente indipendente,
escluso di proposito da questa migration.

Revision ID: 44190d8245ee
Revises: e2e515fef7ac
Create Date: 2026-08-19 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '44190d8245ee'
down_revision = 'e2e515fef7ac'
branch_labels = None
depends_on = None

# (tabella, vecchio_nome_vincolo_postgres, colonna_numero, nuovo_nome_vincolo)
_TARGETS = [
    ('journal_entries', 'journal_entries_doc_number_key', 'doc_number', 'uq_journal_entries_docnum_company'),
    ('quotations', 'quotations_doc_number_key', 'doc_number', 'uq_quotations_docnum_company'),
    ('sales_orders', 'sales_orders_doc_number_key', 'doc_number', 'uq_sales_orders_docnum_company'),
    ('deliveries', 'deliveries_doc_number_key', 'doc_number', 'uq_deliveries_docnum_company'),
    ('purchase_orders', 'purchase_orders_doc_number_key', 'doc_number', 'uq_purchase_orders_docnum_company'),
    ('goods_receipts', 'goods_receipts_doc_number_key', 'doc_number', 'uq_goods_receipts_docnum_company'),
    ('requests_for_quotation', 'requests_for_quotation_rfq_number_key', 'rfq_number', 'uq_rfq_docnum_company'),
]


def upgrade():
    from sqlalchemy import inspect
    bind = op.get_bind()
    insp = inspect(bind)
    for table, old_name_guess, column, new_name in _TARGETS:
        # Come già in 0d51f4f42b5e: il nome del vincolo può differire per
        # dialetto (Postgres lo nomina da solo, SQLite no) — si ispeziona
        # lo schema reale invece di assumere un nome fisso.
        old_name = None
        for uc in insp.get_unique_constraints(table):
            if uc['column_names'] == [column]:
                old_name = uc['name']
                break
        with op.batch_alter_table(table, schema=None) as batch_op:
            if old_name:
                batch_op.drop_constraint(old_name, type_='unique')
            batch_op.create_unique_constraint(new_name, [column, 'company_id'])


def downgrade():
    for table, old_name_guess, column, new_name in _TARGETS:
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.drop_constraint(new_name, type_='unique')
            batch_op.create_unique_constraint(old_name_guess, [column])
