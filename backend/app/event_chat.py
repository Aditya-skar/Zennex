"""Event-linked group conversations (type=event)."""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation, ConversationMember, Event


async def ensure_event_conversation(db: AsyncSession, event: Event, user_id: str) -> Conversation:
    result = await db.execute(select(Conversation).where(Conversation.event_id == event.id))
    conv = result.scalar_one_or_none()
    if conv is None:
        conv = Conversation(
            type="event",
            name=event.title,
            avatar_url=event.image or "",
            created_by=event.organizer_id,
            event_id=event.id,
        )
        db.add(conv)
        await db.flush()
        db.add(
            ConversationMember(
                conversation_id=conv.id,
                user_id=event.organizer_id,
                role="admin",
            )
        )

    membership = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conv.id,
            ConversationMember.user_id == user_id,
        )
    )
    if membership.scalar_one_or_none() is None:
        db.add(
            ConversationMember(
                conversation_id=conv.id,
                user_id=user_id,
                role="member",
            )
        )
    return conv
