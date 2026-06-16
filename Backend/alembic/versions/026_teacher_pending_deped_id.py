"""add pending_deped_school_id to teachers

Revision ID: 026
Revises: 025
Create Date: 2025-06-16
"""

from alembic import op
import sqlalchemy as sa

revision = "026_teacher_pending_deped_id"
down_revision = "025_add_file_path_to_passages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "teachers",
        sa.Column(
            "pending_deped_school_id",
            sa.String(20),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("teachers", "pending_deped_school_id")
