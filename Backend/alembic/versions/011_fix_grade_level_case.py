"""011_fix_grade_level_case

Revision ID: 011_fix_grade_level_case
Revises: 010_password_reset_tokens
Create Date: 2026-05-03

Changes:
  - Drops the old gradelevel enum (which had uppercase values like GRADE_2)
  - Recreates it with lowercase values (grade_2, kindergarten, etc.)
  - Normalizes existing row data to match
"""
from alembic import op

revision = "011_fix_grade_level_case"
down_revision = "010_password_reset_tokens"
branch_labels = None
depends_on = None

TABLES = ("students", "passages")

OLD_TO_NEW = {
    "KINDERGARTEN": "kindergarten",
    "GRADE_1": "grade_1",
    "GRADE_2": "grade_2",
    "GRADE_3": "grade_3",
    "GRADE_4": "grade_4",
    "GRADE_5": "grade_5",
    "GRADE_6": "grade_6",
}


def upgrade() -> None:
    # 1. Convert columns to plain text so we can drop the enum type
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN grade_level TYPE varchar")

    # 2. Update row data to lowercase values
    for table in TABLES:
        for old, new in OLD_TO_NEW.items():
            op.execute(f"UPDATE {table} SET grade_level = '{new}' WHERE grade_level = '{old}'")

    # 3. Drop old enum type (it had uppercase values)
    op.execute("DROP TYPE IF EXISTS gradelevel")

    # 4. Recreate enum with lowercase values
    op.execute(
        "CREATE TYPE gradelevel AS ENUM "
        "('kindergarten', 'grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6')"
    )

    # 5. Convert columns back to the new enum type
    for table in TABLES:
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN grade_level "
            f"TYPE gradelevel USING grade_level::gradelevel"
        )


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN grade_level TYPE varchar")

    for table in TABLES:
        for old, new in OLD_TO_NEW.items():
            op.execute(f"UPDATE {table} SET grade_level = '{old}' WHERE grade_level = '{new}'")

    op.execute("DROP TYPE IF EXISTS gradelevel")
    op.execute(
        "CREATE TYPE gradelevel AS ENUM "
        "('KINDERGARTEN', 'GRADE_1', 'GRADE_2', 'GRADE_3', 'GRADE_4', 'GRADE_5', 'GRADE_6')"
    )

    for table in TABLES:
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN grade_level "
            f"TYPE gradelevel USING grade_level::gradelevel"
        )
