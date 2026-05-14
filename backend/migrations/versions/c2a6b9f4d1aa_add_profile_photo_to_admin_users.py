"""add profile photo to admin users

Revision ID: c2a6b9f4d1aa
Revises: 5d6a8c7b9e10
Create Date: 2026-05-14 10:30:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c2a6b9f4d1aa'
down_revision = '5d6a8c7b9e10'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('admin_users', sa.Column('profile_photo_path', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('admin_users', 'profile_photo_path')
