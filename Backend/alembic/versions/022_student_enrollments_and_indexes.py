"""022_student_enrollments_and_indexes

Revision ID: 022_enrollments_indexes
Revises: 021_assignments_visibility
Create Date: 2026-05-16

Adds:
- student_enrollments table (links students to classes per school year)
- Composite index on assessment_sessions for (student_id, school_year, period, language)
- Backfills enrollments from existing student data for 2025-2026
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "022_enrollments_indexes"
down_revision = "021_assignments_visibility"
branch_labels = None
depends_on = None

# Reuse existing enum
gradelevel_enum = postgresql.ENUM(
    "kindergarten", "grade_1", "grade_2", "grade_3",
    "grade_4", "grade_5", "grade_6",
    name="gradelevel",
    create_type=False,
)


def upgrade() -> None:
    # 1. Create student_enrollments table
    op.create_table(
        "student_enrollments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "student_id",
            sa.Integer(),
            sa.ForeignKey("students.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
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
        ),
        sa.Column("grade_level", gradelevel_enum, nullable=True),
        sa.Column("section", sa.String(100), nullable=True),
        sa.Column("school_year", sa.String(9), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        # Unique: one enrollment per student per teacher per school year
        sa.UniqueConstraint("student_id", "teacher_id", "school_year",
                            name="uq_enrollment_student_teacher_year"),
    )

    # 2. Composite index on assessment_sessions for admin class record queries
    op.create_index(
        "ix_sessions_student_year_period_lang",
        "assessment_sessions",
        ["student_id", "school_year", "period", "language"],
    )

    # 3. Backfill: enroll all existing students for 2025-2026 using their
    #    current teacher_id and the teacher's school_id/grade/section
    op.execute(
        """
        INSERT INTO student_enrollments
            (student_id, teacher_id, school_id, grade_level, section, school_year)
        SELECT
            s.id,
            s.teacher_id,
            t.school_id,
            COALESCE(s.grade_level, t.grade_level),
            COALESCE(s.section, t.section),
            '2025-2026'
        FROM students s
        JOIN teachers t ON t.id = s.teacher_id
        WHERE t.school_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_index("ix_sessions_student_year_period_lang",
                  table_name="assessment_sessions")
    op.drop_table("student_enrollments")
