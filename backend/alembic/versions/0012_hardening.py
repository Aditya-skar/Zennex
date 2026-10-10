"""email verification, report triage, session revocation, geo index

Revision ID: 0012
Revises: 0011
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users: verification / admin / suspension / session cutoff ---
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("is_suspended", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("tokens_valid_after", sa.DateTime(timezone=True), nullable=True))
    # Google/Apple already proved ownership of the email address.
    op.execute(
        sa.text("UPDATE users SET email_verified = :v WHERE auth_provider IS NOT NULL").bindparams(v=True)
    )

    # --- user_reports: triage workflow ---
    op.add_column("user_reports", sa.Column("status", sa.String(length=20), nullable=False, server_default="open"))
    op.add_column("user_reports", sa.Column("resolved_by", sa.String(length=32), nullable=True))
    op.add_column("user_reports", sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("user_reports", sa.Column("resolution_note", sa.Text(), nullable=False, server_default=""))
    op.create_index("ix_user_reports_status", "user_reports", ["status"])

    # --- email_verifications ---
    op.create_table(
        "email_verifications",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_email_verifications_user_id", "email_verifications", ["user_id"])
    op.create_index("ix_email_verifications_token_hash", "email_verifications", ["token_hash"], unique=True)

    # --- revoked_tokens (JWT denylist) ---
    op.create_table(
        "revoked_tokens",
        sa.Column("jti", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_revoked_tokens_user_id", "revoked_tokens", ["user_id"])
    op.create_index("ix_revoked_tokens_expires_at", "revoked_tokens", ["expires_at"])

    # --- events: bounding-box prefilter for radius search ---
    op.create_index("ix_events_lat_lng", "events", ["lat", "lng"])


def downgrade() -> None:
    op.drop_index("ix_events_lat_lng", table_name="events")

    op.drop_index("ix_revoked_tokens_expires_at", table_name="revoked_tokens")
    op.drop_index("ix_revoked_tokens_user_id", table_name="revoked_tokens")
    op.drop_table("revoked_tokens")

    op.drop_index("ix_email_verifications_token_hash", table_name="email_verifications")
    op.drop_index("ix_email_verifications_user_id", table_name="email_verifications")
    op.drop_table("email_verifications")

    op.drop_index("ix_user_reports_status", table_name="user_reports")
    op.drop_column("user_reports", "resolution_note")
    op.drop_column("user_reports", "resolved_at")
    op.drop_column("user_reports", "resolved_by")
    op.drop_column("user_reports", "status")

    op.drop_column("users", "tokens_valid_after")
    op.drop_column("users", "is_suspended")
    op.drop_column("users", "is_admin")
    op.drop_column("users", "email_verified")
