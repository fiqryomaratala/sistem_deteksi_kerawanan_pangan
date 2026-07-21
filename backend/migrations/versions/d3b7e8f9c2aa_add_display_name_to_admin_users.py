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
depends_on = '5d6a8c7b9e10'


def upgrade() -> None:
    op.execute(
        "ALTER TABLE admin_users "
        "ADD COLUMN IF NOT EXISTS display_name VARCHAR"
    )


def downgrade() -> None:
    op.drop_column('admin_users', 'display_name')
