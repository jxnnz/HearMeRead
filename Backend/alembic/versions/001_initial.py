"""create teachers and students tables

Revision ID: 001_initial
Revises: 
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "teachers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_teachers_id", "teachers", ["id"])
    op.create_index("ix_teachers_email", "teachers", ["email"], unique=True)

    op.create_table(
        "students",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column(
            "grade_level",
            sa.Enum(
                "kindergarten", "grade_1", "grade_2", "grade_3",
                "grade_4", "grade_5", "grade_6",
                name="gradelevel",
            ),
            nullable=False,
        ),
        sa.Column("section", sa.String(100), nullable=True),
        sa.Column("lrn", sa.String(12), nullable=True),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lrn"),
    )
    op.create_index("ix_students_id", "students", ["id"])
    op.create_index("ix_students_teacher_id", "students", ["teacher_id"])


def downgrade() -> None:
    op.drop_table("students")
    op.drop_table("teachers")
    op.execute("DROP TYPE IF EXISTS gradelevel")
