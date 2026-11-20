"""Termini di Pagamento strutturati: PaymentTerm/PaymentTermInstallment, EconomicSubject.payment_term_id

payment_terms (testo libero) non ha mai calcolato davvero le scadenze:
ogni fattura, a prescindere da cosa diceva, prendeva sempre una rata
unica a 30 giorni fissi (create_installments_for_invoice senza schedule,
chiamata così da tutti e 5 i punti dove nasce una fattura). Questa
migration introduce l'anagrafica strutturata che guida il calcolo VERO
(più rate, giorni, regola fine mese) — payment_term_id è opzionale,
nullable: senza impostarlo il comportamento resta identico a prima.

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' e index/FK di journal_entries/journal_lines
— drift preesistente indipendente, escluso di proposito da questa
migration.

Revision ID: dd7c099aabc6
Revises: 02ed5215fe87
Create Date: 2026-08-18 20:55:02.033776

"""
from alembic import op
import sqlalchemy as sa

revision = 'dd7c099aabc6'
down_revision = '02ed5215fe87'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('payment_terms_master',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('description', sa.String(length=80), nullable=False),
        sa.Column('payment_type', sa.String(length=30), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_table('payment_term_installments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('payment_term_id', sa.Integer(), nullable=False),
        sa.Column('numero_rata', sa.Integer(), nullable=False),
        sa.Column('percentuale', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('giorni', sa.Integer(), nullable=False),
        sa.Column('fine_mese', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['payment_term_id'], ['payment_terms_master.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('economic_subjects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('payment_term_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_economic_subjects_payment_term_id', 'payment_terms_master', ['payment_term_id'], ['id'])


def downgrade():
    with op.batch_alter_table('economic_subjects', schema=None) as batch_op:
        batch_op.drop_constraint('fk_economic_subjects_payment_term_id', type_='foreignkey')
        batch_op.drop_column('payment_term_id')
    op.drop_table('payment_term_installments')
    op.drop_table('payment_terms_master')
