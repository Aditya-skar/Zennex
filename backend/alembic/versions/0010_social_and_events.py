"""dab_ups, event_attendees, people_lists, communities, oauth, event chats

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("auth_provider", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("auth_subject", sa.String(length=255), nullable=True))
    op.create_index("ix_users_auth_subject", "users", ["auth_subject"])

    op.add_column("conversations", sa.Column("event_id", sa.String(length=32), nullable=True))
    op.create_foreign_key(
        "fk_conversations_event_id",
        "conversations",
        "events",
        ["event_id"],
        ["id"],
    )
    op.create_index("ix_conversations_event_id", "conversations", ["event_id"])

    op.create_table(
        "dab_ups",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("requester_id", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("target_id", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_dab_ups_requester_id", "dab_ups", ["requester_id"])
    op.create_index("ix_dab_ups_target_id", "dab_ups", ["target_id"])

    op.create_table(
        "event_attendees",
        sa.Column("event_id", sa.String(length=32), sa.ForeignKey("events.id"), primary_key=True),
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "people_lists",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("member_ids", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_people_lists_user_id", "people_lists", ["user_id"])

    op.create_table(
        "communities",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("avatar_url", sa.Text(), nullable=False),
        sa.Column("created_by", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "community_members",
        sa.Column("community_id", sa.String(length=32), sa.ForeignKey("communities.id"), primary_key=True),
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("role", sa.String(length=10), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "user_device_tokens",
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("platform", sa.String(length=10), primary_key=True),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("user_device_tokens")
    op.drop_table("community_members")
    op.drop_table("communities")
    op.drop_index("ix_people_lists_user_id", table_name="people_lists")
    op.drop_table("people_lists")
    op.drop_table("event_attendees")
    op.drop_index("ix_dab_ups_target_id", table_name="dab_ups")
    op.drop_index("ix_dab_ups_requester_id", table_name="dab_ups")
    op.drop_table("dab_ups")
    op.drop_index("ix_conversations_event_id", table_name="conversations")
    op.drop_constraint("fk_conversations_event_id", "conversations", type_="foreignkey")
    op.drop_column("conversations", "event_id")
    op.drop_index("ix_users_auth_subject", table_name="users")
    op.drop_column("users", "auth_subject")
    op.drop_column("users", "auth_provider")
