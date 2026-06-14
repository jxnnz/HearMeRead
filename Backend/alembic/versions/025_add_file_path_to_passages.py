"""add file_path to passages

Revision ID: 025
Revises: 024
Create Date: 2026-06-14 20:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '025_add_file_path_to_passages'
down_revision: Union[str, None] = '024_unique_employee_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('passages', sa.Column('file_path', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('passages', 'file_path')
