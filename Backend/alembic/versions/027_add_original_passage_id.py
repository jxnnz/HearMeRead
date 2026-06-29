"""add original_passage_id to passages

Revision ID: 027
Revises: 026_teacher_pending_deped_id
Create Date: 2026-06-29
"""

from alembic import op
import sqlalchemy as sa

revision = "027_add_original_passage_id"
down_revision = "026_teacher_pending_deped_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "passages",
        sa.Column(
            "original_passage_id",
            sa.Integer(),
            sa.ForeignKey("passages.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("passages", "original_passage_id")
