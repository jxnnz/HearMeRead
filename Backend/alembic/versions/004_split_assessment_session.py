"""split assessment_sessions into reading_results and session_observations

Revision ID: 004_split_assessment_sessions
Revises: 003_assessment_sessions
Create Date: 2025-04-18

Changes:
- Adds `language` column to assessment_sessions (drives Whisper model + passage filter)
- Removes reading metrics + observation columns from assessment_sessions
- Creates `reading_results`      (session_id PK/FK, reading_time, words, miscues, cwpm)
- Creates `session_observations` (session_id PK/FK, comprehension, fluency, experience, remarks)
"""

from alembic import op
import sqlalchemy as sa

revision = "004_split_assessment_sessions"
down_revision = "003_assessment_sessions"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ------------------------------------------------------------------ #
    # 1. Add `language` to assessment_sessions                            #
    #    Reuse the existing `language` enum created by 002_passages       #
    # ------------------------------------------------------------------ #
    op.add_column(
        "assessment_sessions",
        sa.Column(
            "language",
            sa.Enum("en", "fil", name="language", create_type=False),
            nullable=False,
            server_default="en",
        ),
    )

    # ------------------------------------------------------------------ #
    # 2. Drop reading metric columns from assessment_sessions             #
    # ------------------------------------------------------------------ #
    op.drop_column("assessment_sessions", "reading_time_seconds")
    op.drop_column("assessment_sessions", "total_words")
    op.drop_column("assessment_sessions", "miscue_count")
    op.drop_column("assessment_sessions", "cwpm")

    # ------------------------------------------------------------------ #
    # 3. Drop observation columns from assessment_sessions                #
    # ------------------------------------------------------------------ #
    op.drop_column("assessment_sessions", "comprehension_correct")
    op.drop_column("assessment_sessions", "comprehension_total")
    op.drop_column("assessment_sessions", "fluency_level")
    op.drop_column("assessment_sessions", "learner_experience")
    op.drop_column("assessment_sessions", "teacher_remarks")

    # ------------------------------------------------------------------ #
    # 4. Create `reading_results`                                         #
    #    Populated when the teacher completes the recording step.         #
    #    CWPM is auto-computed: (total_words - miscue_count) /            #
    #                           (reading_time_seconds / 60)              #
    # ------------------------------------------------------------------ #
    op.create_table(
        "reading_results",
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("assessment_sessions.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("reading_time_seconds", sa.Float(),   nullable=True),
        sa.Column("total_words",          sa.Integer(), nullable=True),
        sa.Column("miscue_count",         sa.Integer(), nullable=True, server_default="0"),
        sa.Column("cwpm",                 sa.Float(),   nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_reading_results_session_id", "reading_results", ["session_id"])

    # ------------------------------------------------------------------ #
    # 5. Create `session_observations`                                    #
    #    Populated after the comprehension check + teacher rating step.   #
    # ------------------------------------------------------------------ #
    op.create_table(
        "session_observations",
        sa.Column(
            "session_id",
            sa.Integer(),
            sa.ForeignKey("assessment_sessions.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        # Comprehension
        sa.Column("comprehension_correct", sa.Integer(), nullable=True),
        sa.Column("comprehension_total",   sa.Integer(), nullable=True),
        # Teacher ratings
        sa.Column("fluency_level",      sa.Integer(), nullable=True),
        sa.Column("learner_experience", sa.Integer(), nullable=True),
        sa.Column("teacher_remarks",    sa.Text(),    nullable=True),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_session_observations_session_id",
        "session_observations",
        ["session_id"],
    )


def downgrade() -> None:
    # ------------------------------------------------------------------ #
    # Reverse order: drop new tables, restore columns, drop language      #
    # ------------------------------------------------------------------ #
    op.drop_index("ix_session_observations_session_id", table_name="session_observations")
    op.drop_table("session_observations")

    op.drop_index("ix_reading_results_session_id", table_name="reading_results")
    op.drop_table("reading_results")

    # Restore reading metric columns
    op.add_column("assessment_sessions", sa.Column("reading_time_seconds", sa.Float(),   nullable=True))
    op.add_column("assessment_sessions", sa.Column("total_words",          sa.Integer(), nullable=True))
    op.add_column("assessment_sessions", sa.Column("miscue_count",         sa.Integer(), nullable=True, server_default="0"))
    op.add_column("assessment_sessions", sa.Column("cwpm",                 sa.Float(),   nullable=True))

    # Restore observation columns
    op.add_column("assessment_sessions", sa.Column("comprehension_correct", sa.Integer(), nullable=True))
    op.add_column("assessment_sessions", sa.Column("comprehension_total",   sa.Integer(), nullable=True))
    op.add_column("assessment_sessions", sa.Column("fluency_level",         sa.Integer(), nullable=True))
    op.add_column("assessment_sessions", sa.Column("learner_experience",    sa.Integer(), nullable=True))
    op.add_column("assessment_sessions", sa.Column("teacher_remarks",       sa.Text(),    nullable=True))

    op.drop_column("assessment_sessions", "language")