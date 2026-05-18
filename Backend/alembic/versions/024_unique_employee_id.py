"""unique employee_id per school on teachers

Revision ID: 024
Revises: 023
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = '024_unique_employee_id'
down_revision: Union[str, None] = '023_profile_picture_url'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Partial unique index — allows multiple NULL values, enforces uniqueness only for real IDs
    op.create_index(
        'uix_teacher_employee_id',
        'teachers',
        ['employee_id'],
        unique=True,
        postgresql_where="employee_id IS NOT NULL",
    )


def downgrade() -> None:
    op.drop_index('uix_teacher_employee_id', table_name='teachers')
