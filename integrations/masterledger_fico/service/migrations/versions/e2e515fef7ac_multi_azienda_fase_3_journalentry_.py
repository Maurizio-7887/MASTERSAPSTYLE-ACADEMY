"""Multi-azienda Fase 3: JournalEntry.company_id e Asset.company_id (contabilità vera per Angelo)

La contabilità VERA (Prima Nota, Fatture, Pagamenti, Incassi, Scadenzario,
Cespiti, Paghe) inizia a taggarsi per azienda — prima erano taggati solo
i documenti commerciali pre-fattura di Maria Grazia (Fase 2: Preventivi/
Ordini/DDT/EM). Nullable: le scritture/cespiti già esistenti restano
"nessuna azienda", nessuna rottura — comportamento identico a prima per
chi non seleziona un'azienda nel nuovo selettore di Angelo.

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' e index/FK di journal_entries/journal_lines
— drift preesistente indipendente, escluso di proposito da questa
migration.

Revision ID: e2e515fef7ac
Revises: dd7c099aabc6
Create Date: 2026-08-19 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'e2e515fef7ac'
down_revision = 'dd7c099aabc6'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('assets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_assets_company_id', 'companies', ['company_id'], ['id'])
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_journal_entries_company_id', 'companies', ['company_id'], ['id'])


def downgrade():
    with op.batch_alter_table('journal_entries', schema=None) as batch_op:
        batch_op.drop_constraint('fk_journal_entries_company_id', type_='foreignkey')
        batch_op.drop_column('company_id')
    with op.batch_alter_table('assets', schema=None) as batch_op:
        batch_op.drop_constraint('fk_assets_company_id', type_='foreignkey')
        batch_op.drop_column('company_id')
