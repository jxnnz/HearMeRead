"""add part1 scoring and reading profile columns to reading_results

Revision ID: 007_add_part1_scoring_columns
Revises: 006_audio_storage
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa

revision = "007_add_part1_scoring_columns"
down_revision = "006_audio_storage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("reading_results", sa.Column("part1_task1_correct",         sa.Integer(), nullable=True))
    op.add_column("reading_results", sa.Column("part1_task2_correct",         sa.Integer(), nullable=True))
    op.add_column("reading_results", sa.Column("part1_total_score",           sa.Integer(), nullable=True))
    op.add_column("reading_results", sa.Column("part1_classification",        sa.String(30), nullable=True))
    op.add_column("reading_results", sa.Column("part1_route",                 sa.String(10), nullable=True))
    op.add_column("reading_results", sa.Column("part1_task1_alignments_json", sa.Text(), nullable=True))
    op.add_column("reading_results", sa.Column("part1_task2_alignments_json", sa.Text(), nullable=True))
    op.add_column("reading_results", sa.Column("part2_alignments_json",       sa.Text(), nullable=True))
    op.add_column("reading_results", sa.Column("reading_profile",             sa.String(30), nullable=True))


def downgrade() -> None:
    op.drop_column("reading_results", "reading_profile")
    op.drop_column("reading_results", "part2_alignments_json")
    op.drop_column("reading_results", "part1_task2_alignments_json")
    op.drop_column("reading_results", "part1_task1_alignments_json")
    op.drop_column("reading_results", "part1_route")
    op.drop_column("reading_results", "part1_classification")
    op.drop_column("reading_results", "part1_total_score")
    op.drop_column("reading_results", "part1_task2_correct")
    op.drop_column("reading_results", "part1_task1_correct")
