"""035_add_content_hash_to_passages

Revision ID: 035_add_content_hash_to_passages
Revises: 034_add_part1_task2_audio_path
Create Date: 2026-10-20

Changes:
  - passages: add content_hash column (String 64, nullable, indexed)
  - backfill content_hash for all existing passages based on normalized content
"""

import re
import hashlib
from alembic import op
import sqlalchemy as sa

revision = "035_add_content_hash_to_passages"
down_revision = "034_add_part1_task2_audio_path"
branch_labels = None
depends_on = None


def _normalize_text(text: str | None) -> str:
    if not text:
        return ""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    cleaned_lines = []
    for line in normalized.split("\n"):
        line_clean = re.sub(r"[ \t]+", " ", line).strip()
        cleaned_lines.append(line_clean)
    normalized = "\n".join(cleaned_lines)
    return re.sub(r"\n{3,}", "\n\n", normalized).strip().lower()


def _compute_hash(assessment_type, content, task1, task2_words, task2_sentences) -> str | None:
    is_a1 = (assessment_type == 1) or (assessment_type is None and task1 is not None)
    if is_a1:
        n_t1 = _normalize_text(task1)
        n_t2w = _normalize_text(task2_words)
        n_t2s = _normalize_text(task2_sentences)
        if not n_t1 and not n_t2w and not n_t2s:
            return None
        payload = f"a1:{n_t1}|{n_t2w}|{n_t2s}"
    else:
        n_c = _normalize_text(content)
        if not n_c:
            return None
        payload = f"a2:{n_c}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def upgrade() -> None:
    op.add_column(
        "passages",
        sa.Column("content_hash", sa.String(64), nullable=True),
    )
    op.create_index(
        "ix_passages_content_hash",
        "passages",
        ["content_hash"],
        unique=False,
    )

    # Backfill content_hash for existing records
    bind = op.get_bind()
    passages_table = sa.table(
        "passages",
        sa.column("id", sa.Integer),
        sa.column("assessment_type", sa.Integer),
        sa.column("content", sa.Text),
        sa.column("task1_content", sa.Text),
        sa.column("task2_words", sa.Text),
        sa.column("task2_sentences", sa.Text),
        sa.column("content_hash", sa.String),
    )

    rows = bind.execute(
        sa.select(
            passages_table.c.id,
            passages_table.c.assessment_type,
            passages_table.c.content,
            passages_table.c.task1_content,
            passages_table.c.task2_words,
            passages_table.c.task2_sentences,
        )
    ).fetchall()

    for row in rows:
        h = _compute_hash(
            row.assessment_type,
            row.content,
            row.task1_content,
            row.task2_words,
            row.task2_sentences,
        )
        if h:
            bind.execute(
                passages_table.update()
                .where(passages_table.c.id == row.id)
                .values(content_hash=h)
            )


def downgrade() -> None:
    op.drop_index("ix_passages_content_hash", table_name="passages")
    op.drop_column("passages", "content_hash")
