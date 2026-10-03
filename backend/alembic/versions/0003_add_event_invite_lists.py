"""add invite_list_ids / invited_member_ids to events

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("invite_list_ids", sa.JSON(), nullable=True))
    op.add_column("events", sa.Column("invited_member_ids", sa.JSON(), nullable=True))
    # Backfill existing rows, then keep the columns non-nullable going forward
    # at the application layer (SQLAlchemy always writes a list, never NULL).
    op.execute("UPDATE events SET invite_list_ids = '[]' WHERE invite_list_ids IS NULL")
    op.execute("UPDATE events SET invited_member_ids = '[]' WHERE invited_member_ids IS NULL")


def downgrade() -> None:
    op.drop_column("events", "invited_member_ids")
    op.drop_column("events", "invite_list_ids")
