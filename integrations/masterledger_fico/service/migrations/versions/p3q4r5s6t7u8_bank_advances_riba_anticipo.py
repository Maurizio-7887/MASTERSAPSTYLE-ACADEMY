"""Banche — RiBa salvo buon fine e Anticipo Fatture: tabelle
bank_advances/bank_advance_lines, 2 nuovi conti (181000 Banca c/anticipi
SBF, 182000 Debiti v/Banche per Anticipi Fatture) e 3 AccountMapping
(banca_anticipi_sbf, debiti_anticipi_fatture, oneri_finanziari_bancari
→ 070018 Commissioni e Oneri Bancari, già esistente).

Revision ID: p3q4r5s6t7u8
Revises: 44190d8245ee
Create Date: 2026-08-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import table, column
from datetime import datetime

revision = "p3q4r5s6t7u8"
down_revision = "44190d8245ee"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "bank_advances",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("company_id", sa.Integer, sa.ForeignKey("companies.id"), nullable=True),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("doc_number", sa.String(20), nullable=False, unique=True),
        sa.Column("doc_date", sa.Date, nullable=False),
        sa.Column("bank_account_id", sa.Integer, sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("gross_amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("bank_charges_amount", sa.Numeric(14, 2), nullable=False, server_default="0"),
        sa.Column("advance_entry_id", sa.Integer, sa.ForeignKey("journal_entries.id"), nullable=False),
        sa.Column("created_by_id", sa.Integer, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=True),
    )
    with op.batch_alter_table("bank_advances", schema=None) as batch_op:
        batch_op.alter_column("bank_charges_amount", server_default=None)

    op.create_table(
        "bank_advance_lines",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("advance_id", sa.Integer, sa.ForeignKey("bank_advances.id"), nullable=False),
        sa.Column("installment_id", sa.Integer, sa.ForeignKey("invoice_installments.id"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("esito", sa.String(15), nullable=False, server_default="in_corso"),
        sa.Column("esito_entry_id", sa.Integer, sa.ForeignKey("journal_entries.id"), nullable=True),
        sa.Column("esito_at", sa.DateTime, nullable=True),
    )
    with op.batch_alter_table("bank_advance_lines", schema=None) as batch_op:
        batch_op.alter_column("esito", server_default=None)

    # ── 2 nuovi conti di bilancio ──
    accounts_t = table(
        "accounts",
        column("code", sa.String), column("name", sa.String),
        column("account_type", sa.String), column("cost_relevant", sa.Boolean),
        column("cost_relevant_type", sa.String), column("active", sa.Boolean),
    )
    op.bulk_insert(accounts_t, [
        {"code": "181000", "name": "Banca c/anticipi SBF", "account_type": "patrimoniale_passivo",
         "cost_relevant": False, "cost_relevant_type": None, "active": True},
        {"code": "182000", "name": "Debiti v/Banche per Anticipi Fatture", "account_type": "patrimoniale_passivo",
         "cost_relevant": False, "cost_relevant_type": None, "active": True},
    ])

    # ── 3 AccountMapping, solo se non già presenti (idempotente) ──
    conn = op.get_bind()
    acc_ids = dict(conn.execute(sa.text(
        "SELECT code, id FROM accounts WHERE code IN ('181000','182000','070018')"
    )).fetchall())

    mappings_t = table(
        "account_mappings",
        column("concept_key", sa.String), column("account_id", sa.Integer),
        column("label", sa.String), column("category", sa.String), column("updated_at", sa.DateTime),
    )
    existing = {r[0] for r in conn.execute(sa.text(
        "SELECT concept_key FROM account_mappings WHERE concept_key IN "
        "('banca_anticipi_sbf','debiti_anticipi_fatture','oneri_finanziari_bancari')"
    )).fetchall()}

    to_insert = []
    if "banca_anticipi_sbf" not in existing and "181000" in acc_ids:
        to_insert.append({"concept_key": "banca_anticipi_sbf", "account_id": acc_ids["181000"],
                           "label": "Banca c/anticipi SBF", "category": "banca", "updated_at": datetime.utcnow()})
    if "debiti_anticipi_fatture" not in existing and "182000" in acc_ids:
        to_insert.append({"concept_key": "debiti_anticipi_fatture", "account_id": acc_ids["182000"],
                           "label": "Debiti v/Banche per Anticipi Fatture", "category": "banca",
                           "updated_at": datetime.utcnow()})
    if "oneri_finanziari_bancari" not in existing and "070018" in acc_ids:
        to_insert.append({"concept_key": "oneri_finanziari_bancari", "account_id": acc_ids["070018"],
                           "label": "Commissioni e Oneri Bancari", "category": "banca",
                           "updated_at": datetime.utcnow()})
    if to_insert:
        op.bulk_insert(mappings_t, to_insert)


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text(
        "DELETE FROM account_mappings WHERE concept_key IN "
        "('banca_anticipi_sbf','debiti_anticipi_fatture','oneri_finanziari_bancari')"
    ))
    op.drop_table("bank_advance_lines")
    op.drop_table("bank_advances")
    conn.execute(sa.text("DELETE FROM accounts WHERE code IN ('181000','182000')"))
