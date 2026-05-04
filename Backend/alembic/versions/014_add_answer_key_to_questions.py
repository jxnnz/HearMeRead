"""014_add_answer_key_to_questions

Revision ID: 014_add_answer_key_to_questions
Revises: 013_add_school_year_to_students
Create Date: 2026-05-04

Changes:
  - Adds nullable answer_key column (Text) to questions table
"""
from alembic import op
import sqlalchemy as sa

revision = "014_add_answer_key_to_questions"
down_revision = "013_add_school_year_to_students"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("questions", sa.Column("answer_key", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("questions", "answer_key")
