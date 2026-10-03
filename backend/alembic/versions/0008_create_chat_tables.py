"""create chat tables (conversations, conversation_members, messages, message_reactions)

Also enables Supabase Realtime replication on `messages` +
`conversation_members`, and Row Level Security so the browser's Realtime
websocket (connected as the `authenticated` role via a bridged JWT — see
app/security.py) can only see rows for conversations it's a member of.
FastAPI itself connects with the DB owner role via DATABASE_URL and bypasses
RLS as normal, so none of this affects the backend's own reads/writes.

The two `ALTER PUBLICATION` / RLS blocks are wrapped so this migration still
succeeds unchanged against plain Postgres/SQLite in local dev (no
`supabase_realtime` publication exists there) — see backend/CHAT_SETUP.md for
what to check if they don't apply cleanly against your Supabase project.

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-25
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "conversations",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("avatar_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_by", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "conversation_members",
        sa.Column("conversation_id", sa.String(length=32), sa.ForeignKey("conversations.id"), primary_key=True),
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("role", sa.String(length=10), nullable=False, server_default="member"),
        sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("muted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "messages",
        sa.Column("id", sa.String(length=32), primary_key=True),
        sa.Column("conversation_id", sa.String(length=32), sa.ForeignKey("conversations.id"), nullable=False),
        sa.Column("author_id", sa.String(length=32), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False, server_default="text"),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("media_url", sa.Text(), nullable=True),
        sa.Column("shared_post_id", sa.String(length=32), sa.ForeignKey("posts.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
    op.create_index("ix_messages_created_at", "messages", ["created_at"])

    op.create_table(
        "message_reactions",
        sa.Column("message_id", sa.String(length=32), sa.ForeignKey("messages.id"), primary_key=True),
        sa.Column("user_id", sa.String(length=32), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("emoji", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Stream INSERTs on these two tables to Supabase Realtime subscribers.
        # No-op (and harmless) on plain Postgres without Supabase's Realtime
        # extension installed — guarded so local/staging Postgres without
        # Supabase doesn't fail the migration.
        try:
            op.execute(
                "ALTER PUBLICATION supabase_realtime "
                "ADD TABLE messages, conversation_members, message_reactions;"
            )
        except Exception:
            pass

        op.execute("ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE messages ENABLE ROW LEVEL SECURITY;")
        op.execute("ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;")

        # `current_setting('request.jwt.claims', true)::json->>'sub'` reads the
        # calling user's id straight off the bridged JWT (see
        # app/security.py). Deliberately NOT using Supabase's built-in
        # `auth.uid()` helper — it casts to `uuid`, and our ids look like
        # "usr_xxxxxxxxxxxx", not UUIDs.
        op.execute(
            """
            create policy "members read own conversation_members"
            on conversation_members for select
            using (
              conversation_members.user_id
                = (current_setting('request.jwt.claims', true)::json ->> 'sub')
            );
            """
        )
        op.execute(
            """
            create policy "members read own messages"
            on messages for select
            using (
              exists (
                select 1 from conversation_members cm
                where cm.conversation_id = messages.conversation_id
                and cm.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
              )
            );
            """
        )
        op.execute(
            """
            create policy "members read own message_reactions"
            on message_reactions for select
            using (
              exists (
                select 1 from conversation_members cm
                join messages m on m.conversation_id = cm.conversation_id
                where m.id = message_reactions.message_id
                and cm.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
              )
            );
            """
        )
        op.execute(
            """
            create policy "members read own conversations"
            on conversations for select
            using (
              exists (
                select 1 from conversation_members cm
                where cm.conversation_id = conversations.id
                and cm.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
              )
            );
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        for table in ("conversations", "conversation_members", "messages", "message_reactions"):
            try:
                op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
            except Exception:
                pass
        try:
            op.execute(
                "ALTER PUBLICATION supabase_realtime "
                "DROP TABLE messages, conversation_members, message_reactions;"
            )
        except Exception:
            pass

    op.drop_table("message_reactions")
    op.drop_index("ix_messages_created_at", table_name="messages")
    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_table("messages")
    op.drop_table("conversation_members")
    op.drop_table("conversations")
