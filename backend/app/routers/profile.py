"""GET/PATCH /api/me — the authenticated user's own profile."""
from fastapi import APIRouter

from app.deps import CurrentUser, DbSession
from app.models import User
from app.schemas import ProfilePatch, UserProfile

router = APIRouter(prefix="/api/me", tags=["profile"])


@router.get("", response_model=UserProfile)
async def get_me(current_user: CurrentUser) -> UserProfile:
    return _to_profile(current_user)


@router.patch("", response_model=UserProfile)
async def update_me(patch: ProfilePatch, current_user: CurrentUser, db: DbSession) -> UserProfile:
    updates = patch.model_dump(exclude_unset=True, exclude_none=True)

    if "fullName" in updates:
        current_user.full_name = updates["fullName"]
    if "bio" in updates:
        current_user.bio = updates["bio"]
    if "location" in updates:
        current_user.location = updates["location"]
    if "avatarUrl" in updates:
        current_user.avatar_url = updates["avatarUrl"]
    if "sports" in updates:
        current_user.sports = updates["sports"]
    if "entertainment" in updates:
        current_user.entertainment = updates["entertainment"]

    await db.commit()
    await db.refresh(current_user)
    return _to_profile(current_user)


def _to_profile(user: User) -> UserProfile:
    return UserProfile(
        id=user.id,
        username=user.username,
        fullName=user.full_name,
        bio=user.bio,
        location=user.location,
        avatarUrl=user.avatar_url,
        sports=user.sports,
        entertainment=user.entertainment,
    )
