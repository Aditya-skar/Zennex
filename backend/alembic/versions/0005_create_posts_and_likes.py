"""create posts and post_likes tables

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "posts",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("author_id", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("event_id", sa.String(length=32), sa.ForeignKey("events.id"), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False, server_default="text"),
        sa.Column("caption", sa.Text(), nullable=False, server_default=""),
        sa.Column("image_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("video_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("visibility", sa.String(length=20), nullable=False, server_default="public"),
        sa.Column("is_reshared", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("original_host_id", sa.String(length=32), nullable=True),
        sa.Column("registration_type", sa.String(length=20), nullable=True),
        sa.Column("slots_total", sa.Integer(), nullable=True),
        sa.Column("slots_filled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("registration_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("comments_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_posts_author_id", "posts", ["author_id"])
    op.create_index("ix_posts_event_id", "posts", ["event_id"])

    op.create_table(
        "post_likes",
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("post_id", sa.String(length=32), sa.ForeignKey("posts.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("post_likes")
    op.drop_index("ix_posts_event_id", table_name="posts")
    op.drop_index("ix_posts_author_id", table_name="posts")
    op.drop_table("posts")
