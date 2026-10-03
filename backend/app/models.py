"""SQLAlchemy ORM models."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _new_user_id() -> str:
    return f"usr_{uuid.uuid4().hex[:12]}"


def _new_event_id() -> str:
    return f"evt_{uuid.uuid4().hex[:12]}"


def _new_post_id() -> str:
    return f"pst_{uuid.uuid4().hex[:12]}"


def _new_conversation_id() -> str:
    return f"conv_{uuid.uuid4().hex[:12]}"


def _new_message_id() -> str:
    return f"msg_{uuid.uuid4().hex[:12]}"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """Mirrors `UserProfile` in frontend/src/api/types.ts, plus auth fields."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_user_id)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    full_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    bio: Mapped[str] = mapped_column(Text, nullable=False, default="")
    location: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    avatar_url: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Stored as JSON arrays of strings — fine at this scale; normalize into
    # tables later if you need to query/filter by interest at the DB level.
    sports: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    entertainment: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class Event(Base):
    """Mirrors `EventDto` in frontend/src/api/types.ts.

    `date`/`time` are stored as the free-text display strings the frontend
    already sends (e.g. "Sun, June 14" / "09:00 AM"), matching the existing
    contract rather than introducing a stricter format that would require a
    frontend change.
    """

    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_event_id)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    main_category: Mapped[str] = mapped_column(String(20), nullable=False)  # 'Sports' | 'Entertainment'
    date: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    time: Mapped[str] = mapped_column(String(40), nullable=False, default="")
    venue: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    location: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    attendees: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image: Mapped[str] = mapped_column(Text, nullable=False, default="")
    organizer_id: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    game_access: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 'public' | 'invite'

    # Invite-only access control. `invite_list_ids` are the frontend's local
    # people-list ids (not a server-side table yet); `invited_member_ids` is
    # the resolved snapshot of who's invited, taken at publish time — mirrors
    # `inviteListIds`/`invitedMemberIds` on the frontend's ExploreEvent type.
    invite_list_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    invited_member_ids: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)

    # Real event start time. Added in Phase 3 — the client already computes this
    # (before formatting it into the `date`/`time` display strings above) but it
    # was never persisted, so "is this event past" had no real timestamp to check
    # server-side. Nullable so older rows (pre-Phase-3) degrade gracefully; feed
    # ranking falls back to parsing `date`/`time` when this is absent.
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class Post(Base):
    """Mirrors `HomeFeedPost` in frontend/src/components/HomeFeed/homeFeed.ts.

    Every post backs an existing `Event` (1:1, created right after the event
    itself) — event-derived display fields (title, category, coordinates, ...)
    are NOT duplicated here; the API hydrates them via a join at read time so
    they can never drift from the event's own record.
    """

    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_post_id)
    author_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), index=True, nullable=False)
    event_id: Mapped[str] = mapped_column(String(32), ForeignKey("events.id"), index=True, nullable=False)

    type: Mapped[str] = mapped_column(String(20), nullable=False, default="text")  # 'poster' | 'text' | 'video'
    caption: Mapped[str] = mapped_column(Text, nullable=False, default="")
    image_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    video_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="public")  # 'public' | 'private'

    is_reshared: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    original_host_id: Mapped[str | None] = mapped_column(String(32), nullable=True)

    registration_type: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 'open' | 'limited'
    slots_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    slots_filled: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    registration_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # No comment feature exists client-side yet (dead code in the old scoring
    # formula too) — kept static at 0 purely so the DTO shape matches
    # HomeFeedPost.comments without lying about a feature that doesn't exist.
    comments_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class PostLike(Base):
    """One row per (user, post) like. Counts are computed via COUNT() at read
    time (see routers/posts.py) rather than a denormalized counter, so a bug
    or crash mid-request can never leave the count out of sync."""

    __tablename__ = "post_likes"

    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), primary_key=True)
    post_id: Mapped[str] = mapped_column(String(32), ForeignKey("posts.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Follow(Base):
    """Directed follow edge: `follower_id` follows `followee_id`."""

    __tablename__ = "follows"

    follower_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), primary_key=True)
    followee_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Affinity(Base):
    """Per-user interest score, ported from the client's `zenex-feed-affinity-v1`
    localStorage store (see frontend/src/components/HomeFeed/feedAlgorithm.ts)
    plus new signals from Explore/Discover clicks — see app/affinity.py for the
    full list of reasons and weights that write to this table.

    `kind` is 'category' or 'author'. For 'category', `key` is either an exact
    category name (e.g. "Cricket") or a main-category name ("Sports" /
    "Entertainment") — both live in the same bucket, matching how the old
    client-side store blended a 0.4x main-category bonus into the same dict
    rather than keeping a separate one. For 'author', `key` is a user id.
    """

    __tablename__ = "affinity"

    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), primary_key=True)
    kind: Mapped[str] = mapped_column(String(10), primary_key=True)
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class Conversation(Base):
    """A DM (exactly 2 members) or a user-created group chat.

    Event group chats and communities are NOT modeled here — they stay on the
    client (`eventChats.ts` / `communitiesStore.ts`) per the Chat Phase scope.
    Real-time delivery of new rows in `messages` (and pref changes in
    `conversation_members`) is pushed to clients via Supabase Realtime's
    `postgres_changes` feed — see the 0008 migration for the publication +
    RLS setup this depends on.
    """

    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_conversation_id)
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # 'dm' | 'group'
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="")  # group name only; DMs compute display name client-side
    avatar_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_by: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class ConversationMember(Base):
    """One row per (conversation, user). Also where pin/mute/hidden/last-read
    state now lives — replacing the client's per-device `zenex-chat-pins-v1` /
    `zenex-chat-mutes-v1` / `zenex-chat-hidden-v1` localStorage keys for
    dm/group chats with real, per-account state."""

    __tablename__ = "conversation_members"

    conversation_id: Mapped[str] = mapped_column(String(32), ForeignKey("conversations.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), primary_key=True)

    role: Mapped[str] = mapped_column(String(10), nullable=False, default="member")  # 'admin' | 'member'
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    muted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    hidden: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Message(Base):
    """A single chat message. `shared_post_id` powers the "share a post to
    chat" message kind (full parity with the old client-only store)."""

    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_new_message_id)
    conversation_id: Mapped[str] = mapped_column(String(32), ForeignKey("conversations.id"), index=True, nullable=False)
    author_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), nullable=False)

    kind: Mapped[str] = mapped_column(String(10), nullable=False, default="text")  # 'text' | 'image' | 'video' | 'post'
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    shared_post_id: Mapped[str | None] = mapped_column(String(32), ForeignKey("posts.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


class MessageReaction(Base):
    """One row per (message, user) — a user can only have one active emoji
    reaction per message, matching the old client store's toggle behavior."""

    __tablename__ = "message_reactions"

    message_id: Mapped[str] = mapped_column(String(32), ForeignKey("messages.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(32), ForeignKey("users.id"), primary_key=True)
    emoji: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
