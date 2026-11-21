"""Academy: biglietti monouso per l'accesso unico dal portale (STYLESAPFICO, Fase B).

Revision ID: x2y3z4a5b6c7
Revises: w1x2y3z4a5b6
"""
from alembic import op
import sqlalchemy as sa

revision = "x2y3z4a5b6c7"
down_revision = "w1x2y3z4a5b6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "academy_bridge_tickets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nonce", sa.String(64), nullable=False, unique=True),
        sa.Column("portal_user_id", sa.Integer(), nullable=False),
        sa.Column("used_at", sa.DateTime()),
    )


def downgrade():
    op.drop_table("academy_bridge_tickets")
