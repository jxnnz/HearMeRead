"""create assessment_sessions table

Revision ID: 003_assessment_sessions
Revises: 002_passages_questions
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "003_assessment_sessions"
down_revision = "002_passages_questions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum safely — no-op if it already exists
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE assessmentperiod AS ENUM ('beginning', 'middle', 'end');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.create_table(
        "assessment_sessions",
        sa.Column("id",         sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("passage_id", sa.Integer(), nullable=False),

        # When
        sa.Column("school_year", sa.String(9), nullable=False),
        sa.Column("period", sa.Enum("beginning", "middle", "end", name="assessmentperiod", create_type=False), nullable=False),

        # Reading metrics
        sa.Column("reading_time_seconds", sa.Float(),   nullable=True),
        sa.Column("total_words",          sa.Integer(), nullable=True),
        sa.Column("miscue_count",         sa.Integer(), nullable=True, server_default="0"),
        sa.Column("cwpm",                 sa.Float(),   nullable=True),

        # Comprehension
        sa.Column("comprehension_correct", sa.Integer(), nullable=True),
        sa.Column("comprehension_total",   sa.Integer(), nullable=True),

        # Teacher observations
        sa.Column("fluency_level",      sa.Integer(), nullable=True),
        sa.Column("learner_experience", sa.Integer(), nullable=True),
        sa.Column("teacher_remarks",    sa.Text(),    nullable=True),

        # Status
        sa.Column("is_completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_archived",  sa.Boolean(), nullable=False, server_default="false"),

        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),

        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["passage_id"], ["passages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_assessment_sessions_id",         "assessment_sessions", ["id"])
    op.create_index("ix_assessment_sessions_teacher_id", "assessment_sessions", ["teacher_id"])
    op.create_index("ix_assessment_sessions_student_id", "assessment_sessions", ["student_id"])
    op.create_index("ix_assessment_sessions_passage_id", "assessment_sessions", ["passage_id"])
    op.create_index(
        "ix_assessment_sessions_duplicate_check",
        "assessment_sessions",
        ["teacher_id", "student_id", "school_year", "period"],
    )


def downgrade() -> None:
    op.drop_index("ix_assessment_sessions_duplicate_check", table_name="assessment_sessions")
    op.drop_index("ix_assessment_sessions_passage_id",      table_name="assessment_sessions")
    op.drop_index("ix_assessment_sessions_student_id",      table_name="assessment_sessions")
    op.drop_index("ix_assessment_sessions_teacher_id",      table_name="assessment_sessions")
    op.drop_index("ix_assessment_sessions_id",              table_name="assessment_sessions")
    op.drop_table("assessment_sessions")
    op.execute("DROP TYPE IF EXISTS assessmentperiod")