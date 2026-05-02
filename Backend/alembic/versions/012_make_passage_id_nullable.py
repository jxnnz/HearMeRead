"""make passage_id nullable in assessment_sessions

Revision ID: 012_make_passage_id_nullable
Revises: 011_fix_grade_level_case
Create Date: 2026-05-03

Changes:
  - Makes passage_id nullable so imported historical sessions
    can exist without a linked passage in the system.
  - Changes ON DELETE from CASCADE to SET NULL.
"""
from alembic import op

revision = "012_make_passage_id_nullable"
down_revision = "011_fix_grade_level_case"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the existing FK constraint (CASCADE)
    op.execute(
        "ALTER TABLE assessment_sessions "
        "DROP CONSTRAINT IF EXISTS assessment_sessions_passage_id_fkey"
    )
    # Allow NULL
    op.execute(
        "ALTER TABLE assessment_sessions "
        "ALTER COLUMN passage_id DROP NOT NULL"
    )
    # Re-add FK with SET NULL on delete
    op.execute(
        "ALTER TABLE assessment_sessions "
        "ADD CONSTRAINT assessment_sessions_passage_id_fkey "
        "FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE SET NULL"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE assessment_sessions "
        "DROP CONSTRAINT IF EXISTS assessment_sessions_passage_id_fkey"
    )
    op.execute(
        "UPDATE assessment_sessions SET passage_id = "
        "(SELECT MIN(id) FROM passages) WHERE passage_id IS NULL"
    )
    op.execute(
        "ALTER TABLE assessment_sessions "
        "ALTER COLUMN passage_id SET NOT NULL"
    )
    op.execute(
        "ALTER TABLE assessment_sessions "
        "ADD CONSTRAINT assessment_sessions_passage_id_fkey "
        "FOREIGN KEY (passage_id) REFERENCES passages(id) ON DELETE CASCADE"
    )
