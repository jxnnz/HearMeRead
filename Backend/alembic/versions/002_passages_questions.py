"""create passages and questions tables

Revision ID: 002_passages_questions
Revises: 001_initial
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "002_passages_questions"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum safely — no-op if it already exists
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE language AS ENUM ('english', 'filipino');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.create_table(
        "passages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "language",
            sa.Enum("english", "filipino", name="language", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "grade_level",
            sa.Enum(
                "kindergarten", "grade_1", "grade_2", "grade_3",
                "grade_4", "grade_5", "grade_6",
                name="gradelevel",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("word_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_passages_id", "passages", ["id"])
    op.create_index("ix_passages_teacher_id", "passages", ["teacher_id"])

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("passage_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["passage_id"], ["passages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_questions_id", "questions", ["id"])
    op.create_index("ix_questions_passage_id", "questions", ["passage_id"])


def downgrade() -> None:
    op.drop_index("ix_questions_passage_id", table_name="questions")
    op.drop_index("ix_questions_id", table_name="questions")
    op.drop_table("questions")
    op.drop_index("ix_passages_teacher_id", table_name="passages")
    op.drop_index("ix_passages_id", table_name="passages")
    op.drop_table("passages")
    op.execute("DROP TYPE IF EXISTS language")