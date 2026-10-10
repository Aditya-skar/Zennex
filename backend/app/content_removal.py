"""Shared helpers to delete content (and everything that hangs off it) safely.

No DB-level cascades are relied on (SQLite FK pragmas are off in dev), so
dependent rows are removed explicitly and in FK-safe order.
"""
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Message, MessageReaction, Post, PostLike


async def purge_messages(db: AsyncSession, condition) -> int:
    """Deletes all messages matching `condition` plus their reactions."""
    ids = (await db.execute(select(Message.id).where(condition))).scalars().all()
    if ids:
        await db.execute(delete(MessageReaction).where(MessageReaction.message_id.in_(ids)))
        await db.execute(delete(Message).where(Message.id.in_(ids)))
    return len(ids)


async def remove_post(db: AsyncSession, post_id: str) -> bool:
    """Deletes a post, its likes and any chat messages that shared it. No commit."""
    post = await db.get(Post, post_id)
    if post is None:
        return False
    await purge_messages(db, Message.shared_post_id == post_id)
    await db.execute(delete(PostLike).where(PostLike.post_id == post_id))
    await db.execute(delete(Post).where(Post.id == post_id))
    return True


async def remove_message(db: AsyncSession, message_id: str) -> bool:
    """Deletes one chat message and its reactions. No commit."""
    return await purge_messages(db, Message.id == message_id) > 0
