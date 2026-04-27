"""006_audio_storage

Revision ID: 006_audio_storage
Revises: 005_email_verification
Create Date: 2026-04-26

Changes:
  - reading_results: add audio_path column (String 500, nullable)
  - reading_results: add audio_expires_at column (DateTime with timezone, nullable)
"""

from alembic import op
import sqlalchemy as sa

revision = "006_audio_storage"
down_revision = "005_email_verification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "reading_results",
        sa.Column("audio_path", sa.String(500), nullable=True),
    )
    op.add_column(
        "reading_results",
        sa.Column("audio_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("reading_results", "audio_expires_at")
    op.drop_column("reading_results", "audio_path")
