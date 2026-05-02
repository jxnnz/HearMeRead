"""add sex column to students

Revision ID: 009_add_sex_to_students
Revises: 008_assessment_tasks
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "009_add_sex_to_students"
down_revision = "008_assessment_tasks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    sex_enum = postgresql.ENUM("female", "male", name="sex", create_type=False)
    sex_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "students",
        sa.Column("sex", sex_enum, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("students", "sex")
    op.execute("DROP TYPE IF EXISTS sex")
