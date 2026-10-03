"""add is_archived column to students

Revision ID: 031_add_is_archived_to_students
Revises: 030_backfill_assessment_type
Create Date: 2026-10-03
"""
from alembic import op
import sqlalchemy as sa


revision = "031_add_is_archived_to_students"
down_revision = "030_backfill_assessment_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text("ALTER TABLE students ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false")
    )


def downgrade() -> None:
    op.drop_column("students", "is_archived")
