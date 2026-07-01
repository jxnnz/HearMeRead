"""add story_number to passages

Revision ID: 028_add_story_number
Revises: 027_add_original_passage_id 
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa

revision = "028_add_story_number"
down_revision = "027_add_original_passage_id"   
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "passages",
        sa.Column("story_number", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("passages", "story_number")