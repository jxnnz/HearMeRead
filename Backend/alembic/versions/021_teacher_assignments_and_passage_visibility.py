"""021_teacher_assignments_and_passage_visibility

Revision ID: 021_assignments_visibility
Revises: 020_teacher_fields_and_logs
Create Date: 2026-05-16

Adds:
- teacher_assignments table (admin-managed grade+section per school year)
- visibility column on passages (private/public, default private)
- Backfills existing teacher grade/section data into teacher_assignments
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "021_assignments_visibility"
down_revision = "020_teacher_fields_and_logs"
branch_labels = None
depends_on = None

# Re-use the existing gradelevel enum (already created in migration 020)
gradelevel_enum = postgresql.ENUM(
    "kindergarten", "grade_1", "grade_2", "grade_3",
    "grade_4", "grade_5", "grade_6",
    name="gradelevel",
    create_type=False,
)

passagevisibility_enum = postgresql.ENUM(
    "private", "public",
    name="passagevisibility",
    create_type=True,
)


def upgrade() -> None:
    # 1. Create the passagevisibility enum type
    passagevisibility_enum.create(op.get_bind(), checkfirst=True)

    # 2. Add visibility column to passages (default = private)
    op.add_column(
        "passages",
        sa.Column(
            "visibility",
            passagevisibility_enum,
            nullable=False,
            server_default="private",
        ),
    )

    # 3. Create teacher_assignments table
    op.create_table(
        "teacher_assignments",
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
        sa.Column("grade_level", gradelevel_enum, nullable=False),
        sa.Column("section", sa.String(100), nullable=False),
        sa.Column("school_year", sa.String(9), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_teacher_assignments_id", "teacher_assignments", ["id"])
    op.create_index(
        "ix_teacher_assignments_school_year",
        "teacher_assignments",
        ["school_year"],
    )

    # 4. Backfill: create assignments from existing teacher grade/section data
    #    Uses the current school year "2025-2026" as the default
    op.execute(
        """
        INSERT INTO teacher_assignments
            (teacher_id, school_id, grade_level, section, school_year, is_active)
        SELECT id, school_id, grade_level, section, '2025-2026', TRUE
        FROM teachers
        WHERE grade_level IS NOT NULL
          AND section IS NOT NULL
          AND school_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_teacher_assignments_school_year", table_name="teacher_assignments")
    op.drop_index("ix_teacher_assignments_id", table_name="teacher_assignments")
    op.drop_table("teacher_assignments")
    op.drop_column("passages", "visibility")
    passagevisibility_enum.drop(op.get_bind(), checkfirst=True)
