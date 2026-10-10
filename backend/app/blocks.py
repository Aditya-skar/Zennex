"""Block-list helpers — a block hides/blocks interaction in BOTH directions."""
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import UserBlock


async def is_blocked_between(db: AsyncSession, user_a: str, user_b: str) -> bool:
    result = await db.execute(
        select(UserBlock.blocker_id).where(
            or_(
                (UserBlock.blocker_id == user_a) & (UserBlock.blocked_id == user_b),
                (UserBlock.blocker_id == user_b) & (UserBlock.blocked_id == user_a),
            )
        )
    )
    return result.first() is not None


async def blocked_ids_for(db: AsyncSession, user_id: str) -> set[str]:
    """Every user who has blocked `user_id` or whom `user_id` has blocked."""
    result = await db.execute(
        select(UserBlock.blocker_id, UserBlock.blocked_id).where(
            or_(UserBlock.blocker_id == user_id, UserBlock.blocked_id == user_id)
        )
    )
    ids: set[str] = set()
    for blocker, blocked in result.all():
        ids.add(blocked if blocker == user_id else blocker)
    return ids
