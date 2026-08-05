"""add middle_name to students

Revision ID: 029_add_student_middle_name
Revises: 028_add_story_number
Create Date: 2026-07-15
"""
from alembic import op
import sqlalchemy as sa


revision = "029_add_student_middle_name"
down_revision = "028_add_story_number"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "students",
        sa.Column("middle_name", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("students", "middle_name")
