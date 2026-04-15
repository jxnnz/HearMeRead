"""create passages and questions tables

Revision ID: 002_passages_questions
Revises: 001_initial  (update this to match your actual previous revision ID)
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "002_passages_questions"
down_revision = "001_initial"  # ← replace with your actual previous revision ID
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "passages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("teacher_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "language",
            sa.Enum("en", "fil", name="language"),
            nullable=False,
        ),
        sa.Column(
            "grade_level",
            sa.Enum(
                "kindergarten", "grade_1", "grade_2", "grade_3",
                "grade_4", "grade_5", "grade_6",
                name="gradelevel",
                create_type=False,  # reuse enum already created by students table
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
    op.drop_table("questions")
    op.drop_table("passages")
    op.execute("DROP TYPE IF EXISTS language")