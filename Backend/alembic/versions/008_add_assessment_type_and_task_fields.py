"""add assessment_type and task fields to passages

Revision ID: 008_add_assessment_type_and_task_fields
Revises: 007_add_part1_scoring_columns
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa

revision = "008_assessment_tasks"
down_revision = "007_add_part1_scoring_columns"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Allow title and content to be NULL (Assessment 1 passages have neither)
    op.alter_column("passages", "title",       nullable=True)
    op.alter_column("passages", "content",     nullable=True)
    op.alter_column("passages", "grade_level", nullable=True)

    # New columns for assessment type routing and Assessment 1 task content
    op.add_column("passages", sa.Column("assessment_type",  sa.Integer(), nullable=True))
    op.add_column("passages", sa.Column("task1_content",    sa.Text(),    nullable=True))
    op.add_column("passages", sa.Column("task2_words",      sa.Text(),    nullable=True))
    op.add_column("passages", sa.Column("task2_sentences",  sa.Text(),    nullable=True))


def downgrade() -> None:
    op.drop_column("passages", "task2_sentences")
    op.drop_column("passages", "task2_words")
    op.drop_column("passages", "task1_content")
    op.drop_column("passages", "assessment_type")

    op.alter_column("passages", "grade_level", nullable=False)
    op.alter_column("passages", "content",     nullable=False)
    op.alter_column("passages", "title",       nullable=False)
