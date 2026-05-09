"""017_unique_session_per_student_period

Revision ID: 017_unique_session_per_student_period
Revises: 016_reencrypt_student_pii
Create Date: 2026-05-09

Adds a partial unique index enforcing one active (non-archived) assessment
session per student per school_year + period.  Archived sessions are excluded
so that a new session can be started after archiving the old one.
"""
from alembic import op
from sqlalchemy import text

revision = "017_unique_session_period"
down_revision = "016_reencrypt_student_pii"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # For each group of duplicates, keep the most recently created session
    # and archive the rest. This clears the way for the unique index.
    conn.execute(text("""
        UPDATE assessment_sessions
        SET is_archived = TRUE
        WHERE is_archived = FALSE
          AND id NOT IN (
              SELECT DISTINCT ON (student_id, school_year, period) id
              FROM assessment_sessions
              WHERE is_archived = FALSE
              ORDER BY student_id, school_year, period, created_at DESC
          )
    """))

    # Partial unique index: only active (non-archived) sessions must be unique.
    conn.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_session_student_year_period_active
        ON assessment_sessions (student_id, school_year, period)
        WHERE is_archived = FALSE
    """))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text(
        "DROP INDEX IF EXISTS uq_session_student_year_period_active"
    ))
