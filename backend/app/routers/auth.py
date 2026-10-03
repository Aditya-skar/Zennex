"""POST /api/auth/login, /api/auth/signup, /api/auth/logout."""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models import User
from app.schemas import AuthSession, LoginBody, SignupBody, UserProfile
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=AuthSession)
async def signup(body: SignupBody, db: DbSession) -> AuthSession:
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    if body.email:
        existing_email = await db.execute(select(User).where(User.email == body.email))
        if existing_email.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.fullName.strip(),
        bio="",
        location="",
        avatar_url="",
        sports=[],
        entertainment=[],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return AuthSession(token=token, user=_to_profile(user))


@router.post("/login", response_model=AuthSession)
async def login(body: LoginBody, db: DbSession) -> AuthSession:
    username = body.username.strip().lower()
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        # Same error for "no such user" and "wrong password" — don't leak which one.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    token = create_access_token(user.id)
    return AuthSession(token=token, user=_to_profile(user))


@router.post("/logout")
async def logout(_current_user: CurrentUser) -> dict:
    # JWTs are stateless and short-lived; nothing to invalidate server-side yet.
    # If you need immediate revocation, add a token-denylist table backed by Redis.
    return {"ok": True}


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
