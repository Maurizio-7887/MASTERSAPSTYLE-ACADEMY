"""Gestione multi-azienda Fase 1: modello Company, numerazione documenti per azienda

Fondazione additiva e retrocompatibile per gestire più aziende
legalmente separate (P.IVA diverse) dallo stesso front-end — la legge
impone numerazione documenti sequenziale separata per ciascuna, non si
può mescolare in un unico Libro Giornale.

- Nuova tabella companies: anagrafica azienda (P.IVA, dati fiscali).
- document_sequences.company_id: nullable, così ogni sequenza esistente
  oggi (comportamento a azienda unica) resta company_id=NULL — identica
  a prima. Solo il codice futuro (Fase 2) passerà un company_id esplicito.
  Vincolo di unicità cambiato da (doc_type) a (doc_type, company_id).

Nessun tag "quale azienda" sui documenti (Preventivi, Ordini, Fatture...)
né selettore in interfaccia: quello è Fase 2, non in questa migration.

Nota: come nelle migration precedenti, l'autogenerate segnala anche il
drop di 'vendors'/'customers' — drift preesistente indipendente, escluso
di proposito da questa migration.

Revision ID: 0d51f4f42b5e
Revises: 637c4e567d3b
Create Date: 2026-08-18 10:00:00.000000

"""
from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa

revision = '0d51f4f42b5e'
down_revision = '637c4e567d3b'
branch_labels = None
depends_on = None

# Il vincolo UNIQUE(doc_type) originale ha un nome DIVERSO a seconda del
# database: Postgres lo nomina da solo 'document_sequences_doc_type_key',
# SQLite lo lascia senza nome esplicito (batch mode non riesce a droppare
# per nome indovinato lì). Invece di indovinare un solo nome per entrambi
# (bug reale scoperto testando su entrambi i database, non solo uno),
# questa migration ISPEZIONA lo schema reale e si comporta di conseguenza.
_naming_convention = {"uq": "uq_%(table_name)s_%(column_0_name)s"}


def upgrade():
    op.create_table('companies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=10), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('piva', sa.String(length=20), nullable=True),
        sa.Column('codice_fiscale', sa.String(length=20), nullable=True),
        sa.Column('regime_fiscale', sa.String(length=10), nullable=True),
        sa.Column('indirizzo', sa.String(length=200), nullable=True),
        sa.Column('cap', sa.String(length=10), nullable=True),
        sa.Column('comune', sa.String(length=100), nullable=True),
        sa.Column('provincia', sa.String(length=5), nullable=True),
        sa.Column('nazione', sa.String(length=5), nullable=True),
        sa.Column('codice_destinatario', sa.String(length=10), nullable=True),
        sa.Column('pec_destinatario', sa.String(length=120), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )

    bind = op.get_bind()
    insp = inspect(bind)
    old_uc_name = None
    for uc in insp.get_unique_constraints('document_sequences'):
        if uc['column_names'] == ['doc_type']:
            old_uc_name = uc['name']
            break

    if old_uc_name:
        # Nome reale trovato via ispezione (es. Postgres) — droppiamo
        # direttamente quello, nessuna convenzione di naming necessaria.
        with op.batch_alter_table('document_sequences', schema=None) as batch_op:
            batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
            batch_op.drop_constraint(old_uc_name, type_='unique')
            batch_op.create_unique_constraint('uq_document_sequences_type_company', ['doc_type', 'company_id'])
            batch_op.create_foreign_key('fk_document_sequences_company_id', 'companies', ['company_id'], ['id'])
    else:
        # Vincolo senza nome esplicito (SQLite) — serve la naming_convention
        # perché Alembic in batch mode possa individuarlo e droppare.
        with op.batch_alter_table('document_sequences', schema=None,
                                  naming_convention=_naming_convention) as batch_op:
            batch_op.add_column(sa.Column('company_id', sa.Integer(), nullable=True))
            batch_op.drop_constraint('uq_document_sequences_doc_type', type_='unique')
            batch_op.create_unique_constraint('uq_document_sequences_type_company', ['doc_type', 'company_id'])
            batch_op.create_foreign_key('fk_document_sequences_company_id', 'companies', ['company_id'], ['id'])


def downgrade():
    with op.batch_alter_table('document_sequences', schema=None,
                              naming_convention=_naming_convention) as batch_op:
        batch_op.drop_constraint('fk_document_sequences_company_id', type_='foreignkey')
        batch_op.drop_constraint('uq_document_sequences_type_company', type_='unique')
        batch_op.create_unique_constraint('uq_document_sequences_doc_type', ['doc_type'])
        batch_op.drop_column('company_id')
    op.drop_table('companies')
