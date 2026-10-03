"""create events table

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("main_category", sa.String(length=20), nullable=False),
        sa.Column("date", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("time", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("venue", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("location", sa.String(length=200), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lng", sa.Float(), nullable=False),
        sa.Column("attendees", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("image", sa.Text(), nullable=False, server_default=""),
        sa.Column("organizer_id", sa.String(length=32), nullable=False),
        sa.Column("game_access", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_events_organizer_id", "events", ["organizer_id"])


def downgrade() -> None:
    op.drop_index("ix_events_organizer_id", table_name="events")
    op.drop_table("events")
