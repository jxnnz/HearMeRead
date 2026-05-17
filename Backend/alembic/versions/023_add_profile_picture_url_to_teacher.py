"""add profile_picture_url to teacher

Revision ID: 023
Revises: 022
Create Date: 2026-05-17 18:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '023_profile_picture_url'
down_revision: Union[str, None] = '022_enrollments_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('teachers', sa.Column('profile_picture_url', sa.String(length=500), nullable=True))

def downgrade() -> None:
    op.drop_column('teachers', 'profile_picture_url')
