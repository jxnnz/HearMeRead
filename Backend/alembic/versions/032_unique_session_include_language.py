"""032_unique_session_include_language

Revision ID: 032_unique_session_include_language
Revises: 031_add_is_archived_to_students
Create Date: 2026-10-03

Updates the partial unique index on assessment_sessions to include `language`.
This ensures a student can have one active assessment per school year, per period,
PER LANGUAGE (e.g. both Filipino and English assessments for BoSY).
"""
from alembic import op
from sqlalchemy import text

revision = "032_session_lang_unique"
down_revision = "031_add_is_archived_to_students"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # Drop old partial index which only covered (student_id, school_year, period)
    conn.execute(text(
        "DROP INDEX IF EXISTS uq_session_student_year_period_active"
    ))

    # Create new partial unique index including language
    conn.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_session_student_year_period_lang_active
        ON assessment_sessions (student_id, school_year, period, language)
        WHERE is_archived = FALSE
    """))


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(text(
        "DROP INDEX IF EXISTS uq_session_student_year_period_lang_active"
    ))

    conn.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_session_student_year_period_active
        ON assessment_sessions (student_id, school_year, period)
        WHERE is_archived = FALSE
    """))
