"""010_password_reset_tokens

Revision ID: 010_password_reset_tokens
Revises: 009_add_sex_to_students
Create Date: 2026-05-02

Changes:
  - new table: password_reset_tokens
"""

from alembic import op
import sqlalchemy as sa


revision = "010_password_reset_tokens"
down_revision = "009_add_sex_to_students"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "password_reset_tokens",
        sa.Column("id",         sa.Integer(),     primary_key=True),
        sa.Column("teacher_id", sa.Integer(),     sa.ForeignKey("teachers.id", ondelete="CASCADE"),
                  nullable=False, index=True),
        sa.Column("token",      sa.String(64),    nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at",    sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("password_reset_tokens")
