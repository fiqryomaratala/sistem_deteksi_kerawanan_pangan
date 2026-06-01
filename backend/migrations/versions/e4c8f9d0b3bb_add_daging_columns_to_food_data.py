"""add daging columns to food data

Revision ID: e4c8f9d0b3bb
Revises: 8100e007209e
Create Date: 2026-06-02 02:50:00.000000
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e4c8f9d0b3bb'
down_revision = '8100e007209e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('food_data', sa.Column('daging_sapi_tersedia', sa.Float(), nullable=False, server_default='0'))
    op.add_column('food_data', sa.Column('daging_sapi_kebutuhan', sa.Float(), nullable=False, server_default='0'))
    op.add_column('food_data', sa.Column('daging_ayam_tersedia', sa.Float(), nullable=False, server_default='0'))
    op.add_column('food_data', sa.Column('daging_ayam_kebutuhan', sa.Float(), nullable=False, server_default='0'))
    
    # Remove server_default after adding columns
    op.alter_column('food_data', 'daging_sapi_tersedia', server_default=None)
    op.alter_column('food_data', 'daging_sapi_kebutuhan', server_default=None)
    op.alter_column('food_data', 'daging_ayam_tersedia', server_default=None)
    op.alter_column('food_data', 'daging_ayam_kebutuhan', server_default=None)


def downgrade() -> None:
    op.drop_column('food_data', 'daging_ayam_kebutuhan')
    op.drop_column('food_data', 'daging_ayam_tersedia')
    op.drop_column('food_data', 'daging_sapi_kebutuhan')
    op.drop_column('food_data', 'daging_sapi_tersedia')
