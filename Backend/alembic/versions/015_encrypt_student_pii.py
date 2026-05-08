"""015_encrypt_student_pii

Revision ID: 015_encrypt_student_pii
Revises: 014_add_answer_key_to_questions
Create Date: 2026-05-07

Changes:
  - Widens first_name, last_name, lrn columns on students table to hold Fernet ciphertext
  - Adds lrn_hash column (HMAC-SHA256, deterministic) for uniqueness enforcement
  - Drops unique constraint on lrn; adds unique constraint on lrn_hash
  - Backfills all existing student rows by encrypting plaintext PII
"""
import os
import hashlib
import hmac

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from cryptography.fernet import Fernet

revision = "015_encrypt_student_pii"
down_revision = "014_add_answer_key_to_questions"
branch_labels = None
depends_on = None

# ---------------------------------------------------------------------------
# Helpers — loaded once at migration time so we don't depend on app code
# ---------------------------------------------------------------------------

def _get_encryption_key() -> str:
    key = os.environ.get("ENCRYPTION_KEY") or ""
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY environment variable is required to run migration 015. "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return key


def _fernet_encrypt(fernet: Fernet, value: str | None) -> str | None:
    if not value:
        return value
    return fernet.encrypt(value.encode()).decode()


def _hmac_lrn(key: str, lrn: str | None) -> str | None:
    if not lrn:
        return None
    return hmac.new(key.encode(), lrn.encode(), hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------

def upgrade() -> None:
    # 1. Widen columns to hold ciphertext
    with op.batch_alter_table("students") as batch_op:
        batch_op.alter_column("first_name", type_=sa.String(500), existing_nullable=False)
        batch_op.alter_column("last_name",  type_=sa.String(500), existing_nullable=False)
        batch_op.alter_column("lrn",        type_=sa.String(500), existing_nullable=True)

    # 2. Add lrn_hash column (nullable initially for backfill)
    op.add_column("students", sa.Column("lrn_hash", sa.String(64), nullable=True))

    # 3. Backfill — encrypt existing rows
    enc_key = _get_encryption_key()
    fernet  = Fernet(enc_key.encode())

    conn = op.get_bind()
    rows = conn.execute(text("SELECT id, first_name, last_name, lrn FROM students")).fetchall()
    for row in rows:
        new_first = _fernet_encrypt(fernet, row.first_name)
        new_last  = _fernet_encrypt(fernet, row.last_name)
        new_lrn   = _fernet_encrypt(fernet, row.lrn)
        new_hash  = _hmac_lrn(enc_key, row.lrn)
        conn.execute(
            text(
                "UPDATE students SET first_name=:fn, last_name=:ln, lrn=:lrn, lrn_hash=:lh WHERE id=:id"
            ),
            {"fn": new_first, "ln": new_last, "lrn": new_lrn, "lh": new_hash, "id": row.id},
        )

    # 4. Drop old unique constraint on lrn (IF EXISTS — name varies by DB); add unique constraint on lrn_hash
    conn.execute(text("DROP INDEX IF EXISTS ix_students_lrn"))
    conn.execute(text("ALTER TABLE students DROP CONSTRAINT IF EXISTS students_lrn_key"))
    op.create_index("ix_students_lrn_hash", "students", ["lrn_hash"], unique=True)


def downgrade() -> None:
    # NOTE: downgrade decrypts rows back to plaintext.
    # Only safe if the original data was ≤ 100 chars — which it was before this migration.
    enc_key = _get_encryption_key()
    fernet  = Fernet(enc_key.encode())

    def _dec(v):
        if not v:
            return v
        try:
            return fernet.decrypt(v.encode()).decode()
        except Exception:
            return v

    conn = op.get_bind()
    rows = conn.execute(text("SELECT id, first_name, last_name, lrn FROM students")).fetchall()
    for row in rows:
        conn.execute(
            text("UPDATE students SET first_name=:fn, last_name=:ln, lrn=:lrn WHERE id=:id"),
            {"fn": _dec(row.first_name), "ln": _dec(row.last_name), "lrn": _dec(row.lrn), "id": row.id},
        )

    with op.batch_alter_table("students") as batch_op:
        batch_op.drop_index("ix_students_lrn_hash")
        batch_op.alter_column("first_name", type_=sa.String(100), existing_nullable=False)
        batch_op.alter_column("last_name",  type_=sa.String(100), existing_nullable=False)
        batch_op.alter_column("lrn",        type_=sa.String(12),  existing_nullable=True)
        batch_op.create_index("ix_students_lrn", ["lrn"], unique=True)

    op.drop_column("students", "lrn_hash")
