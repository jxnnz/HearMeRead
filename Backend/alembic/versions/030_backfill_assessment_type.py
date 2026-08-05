"""backfill assessment_type for passages

Revision ID: 030_backfill_assessment_type
Revises: 029_add_student_middle_name
Create Date: 2026-07-21
"""
from alembic import op
import sqlalchemy as sa


revision = "030_backfill_assessment_type"
down_revision = "029_add_student_middle_name"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Backfill assessment_type = 1 for passages that have task1_content set and assessment_type is NULL
    op.execute(
        "UPDATE passages SET assessment_type = 1 WHERE assessment_type IS NULL AND task1_content IS NOT NULL"
    )
    # Backfill assessment_type = 2 for remaining passages with NULL assessment_type
    op.execute(
        "UPDATE passages SET assessment_type = 2 WHERE assessment_type IS NULL"
    )


def downgrade() -> None:
    pass
