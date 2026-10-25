"""033_add_part1_audio_path

Revision ID: 033_add_part1_audio_path
Revises: 032_session_lang_unique
Create Date: 2026-10-18

Changes:
  - reading_results: add part1_audio_path column (String 500, nullable)
  - reading_results: add part1_audio_expires_at column (DateTime with timezone, nullable)
"""

from alembic import op
import sqlalchemy as sa

revision = "033_add_part1_audio_path"
down_revision = "032_session_lang_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reading_results",
        sa.Column("part1_audio_path", sa.String(500), nullable=True),
    )
    op.add_column(
        "reading_results",
        sa.Column("part1_audio_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("reading_results", "part1_audio_expires_at")
    op.drop_column("reading_results", "part1_audio_path")
