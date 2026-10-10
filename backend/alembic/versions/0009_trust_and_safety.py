"""password_resets, user_blocks, user_reports (Phase 3 trust)

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "password_resets",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_password_resets_user_id", "password_resets", ["user_id"])
    op.create_index("ix_password_resets_token_hash", "password_resets", ["token_hash"], unique=True)

    op.create_table(
        "user_blocks",
        sa.Column("blocker_id", sa.String(length=32), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("blocked_id", sa.String(length=32), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "user_reports",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("reporter_id", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("target_type", sa.String(length=20), nullable=False),
        sa.Column("target_id", sa.String(length=64), nullable=False),
        sa.Column("reason", sa.String(length=80), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_reports_reporter_id", "user_reports", ["reporter_id"])
    op.create_index("ix_user_reports_target_id", "user_reports", ["target_id"])


def downgrade() -> None:
    op.drop_table("user_reports")
    op.drop_table("user_blocks")
    op.drop_table("password_resets")
