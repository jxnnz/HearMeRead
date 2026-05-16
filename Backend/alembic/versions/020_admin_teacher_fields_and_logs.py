"""020_admin_teacher_fields_and_logs

Revision ID: 020_admin_teacher_fields_and_logs
Revises: 019_add_deped_school_id
Create Date: 2026-05-14

Adds:
- employee_id (nullable) to teachers
- grade_level (nullable) to teachers
- section (nullable) to teachers
- activity_logs table
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "020_teacher_fields_and_logs"
down_revision = "019_add_deped_school_id"
branch_labels = None
depends_on = None

gradelevel_enum = postgresql.ENUM(
    "kindergarten", "grade_1", "grade_2", "grade_3",
    "grade_4", "grade_5", "grade_6",
    name="gradelevel",
    create_type=False,
)


def upgrade() -> None:
    # Teacher profile fields
    op.add_column("teachers", sa.Column("employee_id", sa.String(50), nullable=True))
    op.add_column("teachers", sa.Column("grade_level", gradelevel_enum, nullable=True))
    op.add_column("teachers", sa.Column("section", sa.String(100), nullable=True))

    # Activity logs table
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "teacher_id",
            sa.Integer(),
            sa.ForeignKey("teachers.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "school_id",
            sa.Integer(),
            sa.ForeignKey("schools.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_activity_logs_id", "activity_logs", ["id"])
    op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_activity_logs_created_at", table_name="activity_logs")
    op.drop_index("ix_activity_logs_id", table_name="activity_logs")
    op.drop_table("activity_logs")
    op.drop_column("teachers", "section")
    op.drop_column("teachers", "grade_level")
    op.drop_column("teachers", "employee_id")
