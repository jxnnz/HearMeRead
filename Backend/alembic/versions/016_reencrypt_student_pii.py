"""016_reencrypt_student_pii

Revision ID: 016_reencrypt_student_pii
Revises: 015_encrypt_student_pii
Create Date: 2026-05-08

Re-encrypts student PII that was written back as plaintext by a SQLAlchemy
auto-flush bug (decrypt modified ORM objects in-place → dirty tracking →
UPDATE with plaintext on the next SELECT). Rows that are already encrypted
(Fernet tokens start with 'gAAAAA') are left untouched.
"""
import os

from alembic import op
from sqlalchemy import text
from cryptography.fernet import Fernet

revision = "016_reencrypt_student_pii"
down_revision = "015_encrypt_student_pii"
branch_labels = None
depends_on = None


def _get_fernet() -> Fernet:
    key = os.environ.get("ENCRYPTION_KEY") or ""
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY environment variable is required to run migration 016."
        )
    return Fernet(key.encode())


def _enc(fernet: Fernet, value: str | None) -> str | None:
    """Encrypt only if the value is not already Fernet ciphertext."""
    if not value:
        return value
    if value.startswith("gAAAAA"):
        return value  # already encrypted
    return fernet.encrypt(value.encode()).decode()


def upgrade() -> None:
    fernet = _get_fernet()
    conn = op.get_bind()

    rows = conn.execute(
        text("SELECT id, first_name, last_name, lrn FROM students")
    ).fetchall()

    updated = 0
    for row in rows:
        new_fn  = _enc(fernet, row.first_name)
        new_ln  = _enc(fernet, row.last_name)
        new_lrn = _enc(fernet, row.lrn)

        if (new_fn, new_ln, new_lrn) != (row.first_name, row.last_name, row.lrn):
            conn.execute(
                text(
                    "UPDATE students SET first_name=:fn, last_name=:ln, lrn=:lrn WHERE id=:id"
                ),
                {"fn": new_fn, "ln": new_ln, "lrn": new_lrn, "id": row.id},
            )
            updated += 1

    import sys
    print(f"016: re-encrypted {updated}/{len(rows)} student rows", file=sys.stderr)


def downgrade() -> None:
    pass  # intentional no-op: re-encryption is not reversible here
