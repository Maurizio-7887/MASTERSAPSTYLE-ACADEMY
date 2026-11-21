"""Academy: sessioni di pratica personali e passi verificati dal server
(STYLESAPFICO, Fase C). Solo tabelle nuove: nessuna tabella esistente modificata.

Revision ID: w1x2y3z4a5b6
Revises: s6t7u8v9w0x1
"""
from alembic import op
import sqlalchemy as sa

revision = "w1x2y3z4a5b6"
down_revision = "s6t7u8v9w0x1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "academy_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("scenario_id", sa.String(40), nullable=False),
        sa.Column("scenario_version", sa.String(10), nullable=False),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("companies.id"), nullable=True),
        sa.Column("mode", sa.String(12), nullable=False, server_default="studio"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
    )
    op.create_index("ix_academy_sessions_user_id", "academy_sessions", ["user_id"])
    op.create_table(
        "academy_step_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("academy_sessions.id"), nullable=False),
        sa.Column("step_id", sa.String(20), nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="da_fare"),
        sa.Column("evidence", sa.Text()),
        sa.Column("message", sa.String(500)),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("verified_at", sa.DateTime()),
        sa.Column("updated_at", sa.DateTime()),
        sa.UniqueConstraint("session_id", "step_id", name="uq_academy_step_session"),
    )
    op.create_index("ix_academy_step_results_session_id", "academy_step_results", ["session_id"])


def downgrade():
    op.drop_index("ix_academy_step_results_session_id", table_name="academy_step_results")
    op.drop_table("academy_step_results")
    op.drop_index("ix_academy_sessions_user_id", table_name="academy_sessions")
    op.drop_table("academy_sessions")
