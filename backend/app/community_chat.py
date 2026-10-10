"""Create/link a group conversation for a community."""
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.models import Community, Conversation, ConversationMember


async def ensure_community_conversation(
    db: AsyncSession,
    community: Community,
    member_user_ids: list[str],
) -> Conversation:
    if community.conversation_id:
        conv = await db.get(Conversation, community.conversation_id)
        if conv is not None:
            return conv

    conv = Conversation(
        type="group",
        name=community.name,
        avatar_url=community.avatar_url or "",
        created_by=community.created_by,
    )
    db.add(conv)
    await db.flush()
    community.conversation_id = conv.id

    unique_ids = list(dict.fromkeys([community.created_by, *member_user_ids]))
    for uid in unique_ids:
        db.add(
            ConversationMember(
                conversation_id=conv.id,
                user_id=uid,
                role="admin" if uid == community.created_by else "member",
            )
        )
    return conv


async def add_member_to_community_chat(
    db: AsyncSession, community: Community, user_id: str
) -> None:
    if not community.conversation_id:
        return
    existing = await db.execute(
        select(ConversationMember).where(
            ConversationMember.conversation_id == community.conversation_id,
            ConversationMember.user_id == user_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        return
    db.add(
        ConversationMember(
            conversation_id=community.conversation_id,
            user_id=user_id,
            role="member",
        )
    )
