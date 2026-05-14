"""019_add_deped_school_id

Revision ID: 019_add_deped_school_id
Revises: 018_schools_and_roles
Create Date: 2026-05-13

Adds deped_school_id column to schools table.
This is the official DepEd-issued school identifier,
distinct from the auto-generated school_code used for teacher-admin linking.
"""
from alembic import op
import sqlalchemy as sa

revision = "019_add_deped_school_id"
down_revision = "018_schools_and_roles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "schools",
        sa.Column("deped_school_id", sa.String(20), nullable=True),
    )
    op.create_index(
        "ix_schools_deped_school_id",
        "schools",
        ["deped_school_id"],
        unique=True,
        postgresql_where=sa.text("deped_school_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_schools_deped_school_id", table_name="schools")
    op.drop_column("schools", "deped_school_id")
