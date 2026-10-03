"""create affinity table

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "affinity",
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("kind", sa.String(length=10), primary_key=True),
        sa.Column("key", sa.String(length=80), primary_key=True),
        sa.Column("score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("affinity")
