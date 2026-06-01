"""add display name to admin users

Revision ID: d3b7e8f9c2aa
Revises: e4c8f9d0b3bb
Create Date: 2026-06-02 02:40:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd3b7e8f9c2aa'
down_revision = 'e4c8f9d0b3bb'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('admin_users', sa.Column('display_name', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('admin_users', 'display_name')
