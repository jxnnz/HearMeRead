"""013_add_school_year_to_students

Revision ID: 013_add_school_year_to_students
Revises: 012_make_passage_id_nullable
Create Date: 2026-05-03

Changes:
  - Adds nullable school_year column (VARCHAR 9) to students table
    e.g. "2025-2026"
"""
from alembic import op
import sqlalchemy as sa

revision = "013_add_school_year_to_students"
down_revision = "012_make_passage_id_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("school_year", sa.String(9), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "school_year")
