"""Fase 2 FI: data di storno automatico (ratei e risconti FBS1/F.81) e
registro modifiche documento (FB02).

Revision ID: r5s6t7u8v9w0
Revises: q4r5s6t7u8v9
Create Date: 2026-11-20
"""
from alembic import op
import sqlalchemy as sa

revision = "r5s6t7u8v9w0"
down_revision = "q4r5s6t7u8v9"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("journal_entries", schema=None) as batch_op:
        batch_op.add_column(sa.Column("reversal_date", sa.Date(), nullable=True))

    op.create_table(
        "journal_entry_changes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entry_id", sa.Integer(), sa.ForeignKey("journal_entries.id"), nullable=False),
        sa.Column("field", sa.String(40), nullable=False),
        sa.Column("old_value", sa.String(255)),
        sa.Column("new_value", sa.String(255)),
        sa.Column("changed_by_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("changed_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_journal_entry_changes_entry_id", "journal_entry_changes", ["entry_id"])


def downgrade():
    op.drop_index("ix_journal_entry_changes_entry_id", table_name="journal_entry_changes")
    op.drop_table("journal_entry_changes")
    with op.batch_alter_table("journal_entries", schema=None) as batch_op:
        batch_op.drop_column("reversal_date")
