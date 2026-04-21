"""005_email_verification

Revision ID: 005_email_verification
Revises: 004_split_assessment_sessions
Create Date: 2026-04-21

Changes:
  - teachers: add first_name, last_name columns, drop full_name
  - teachers: add is_verified column (default False)
  - new table: email_verification_tokens
"""

from alembic import op
import sqlalchemy as sa


revision = "005_email_verification"
down_revision = "004_split_assessment_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Split full_name into first_name + last_name on teachers ────────────
    # Add both new columns as nullable first so existing rows don't fail
    op.add_column("teachers", sa.Column("first_name", sa.String(75), nullable=True))
    op.add_column("teachers", sa.Column("last_name",  sa.String(75), nullable=True))

    # Copy existing full_name data into the new columns
    # split_part is PostgreSQL-specific; adjusts if you ever move DBs
    op.execute("""
        UPDATE teachers
        SET
            first_name = SPLIT_PART(full_name, ' ', 1),
            last_name  = CASE
                             WHEN POSITION(' ' IN full_name) > 0
                             THEN SUBSTR(full_name, POSITION(' ' IN full_name) + 1)
                             ELSE ''
                         END
    """)

    # Now make them non-nullable and drop old column
    op.alter_column("teachers", "first_name", nullable=False)
    op.alter_column("teachers", "last_name",  nullable=False)
    op.drop_column("teachers", "full_name")

    # ── 2. Add is_verified to teachers ───────────────────────────────────────
    op.add_column(
        "teachers",
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default="false"),
    )

    # ── 3. Create email_verification_tokens table ─────────────────────────────
    op.create_table(
        "email_verification_tokens",
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
    op.drop_table("email_verification_tokens")

    op.drop_column("teachers", "is_verified")

    op.add_column("teachers", sa.Column("full_name", sa.String(150), nullable=True))
    op.execute("""
        UPDATE teachers
        SET full_name = first_name || ' ' || last_name
    """)
    op.alter_column("teachers", "full_name", nullable=False)
    op.drop_column("teachers", "first_name")
    op.drop_column("teachers", "last_name")