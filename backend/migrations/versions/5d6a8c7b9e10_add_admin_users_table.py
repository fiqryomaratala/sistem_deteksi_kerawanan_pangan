"""add admin users table

Revision ID: 5d6a8c7b9e10
Revises: 8100e007209e
Create Date: 2026-04-28 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5d6a8c7b9e10'
down_revision = '8100e007209e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'admin_users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_users_id'), 'admin_users', ['id'], unique=False)
    op.create_index(op.f('ix_admin_users_username'), 'admin_users', ['username'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_admin_users_username'), table_name='admin_users')
    op.drop_index(op.f('ix_admin_users_id'), table_name='admin_users')
    op.drop_table('admin_users')
