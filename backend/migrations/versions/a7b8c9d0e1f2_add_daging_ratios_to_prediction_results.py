"""add daging ratios to prediction results

Revision ID: a7b8c9d0e1f2
Revises: f1a2b3c4d5e6
Create Date: 2026-07-16 00:05:00.000000
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = 'a7b8c9d0e1f2'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE prediction_results "
        "ADD COLUMN IF NOT EXISTS daging_sapi_ratio DOUBLE PRECISION NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE prediction_results "
        "ADD COLUMN IF NOT EXISTS daging_ayam_ratio DOUBLE PRECISION NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE prediction_results "
        "ALTER COLUMN daging_sapi_ratio DROP DEFAULT"
    )
    op.execute(
        "ALTER TABLE prediction_results "
        "ALTER COLUMN daging_ayam_ratio DROP DEFAULT"
    )


def downgrade() -> None:
    op.drop_column('prediction_results', 'daging_ayam_ratio')
    op.drop_column('prediction_results', 'daging_sapi_ratio')
