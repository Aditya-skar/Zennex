"""Shared FastAPI dependencies: DB session + Bearer-token auth."""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import RevokedToken, User
from app.security import TokenClaims, decode_token_claims

DbSession = Annotated[AsyncSession, Depends(get_db)]

_bearer_scheme = HTTPBearer(auto_error=False)


def _as_utc(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; treat them as UTC."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


async def _resolve_user(db: AsyncSession, token: str) -> tuple[User | None, str | None]:
    """Returns (user, None) on success or (None, reason) when the token is unusable.

    Checks signature/expiry, the `jti` denylist, and the per-user
    `tokens_valid_after` cutoff ("log out everywhere" / password reset).
    """
    claims = decode_token_claims(token)
    if claims is None:
        return None, "Invalid or expired token"

    if claims.jti and await db.get(RevokedToken, claims.jti) is not None:
        return None, "Token has been revoked"

    user = await db.get(User, claims.subject)
    if user is None:
        return None, "User no longer exists"

    if user.tokens_valid_after is not None:
        cutoff_ms = int(_as_utc(user.tokens_valid_after).timestamp() * 1000)
        if claims.issued_ms is None or claims.issued_ms < cutoff_ms:
            return None, "Session expired — please sign in again"

    return user, None


async def get_bearer_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
) -> str | None:
    return credentials.credentials if credentials else None


BearerToken = Annotated[str | None, Depends(get_bearer_token)]


async def get_current_user(db: DbSession, token: BearerToken) -> User:
    """Validates the Bearer token and loads the user. Raises 401 on any failure
    so the frontend's client.ts interceptor clears the token and redirects to login."""
    if token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    user, reason = await _resolve_user(db, token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=reason or "Invalid token")
    if user.is_suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_token_claims(token: BearerToken) -> TokenClaims:
    claims = decode_token_claims(token) if token else None
    if claims is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    return claims


CurrentClaims = Annotated[TokenClaims, Depends(get_token_claims)]


async def get_optional_current_user(db: DbSession, token: BearerToken) -> User | None:
    """Like get_current_user, but returns None instead of raising when there's
    no (or an invalid) token — for endpoints that are public but personalize
    their response when the caller happens to be logged in (e.g. `likedByMe`
    on GET /api/posts)."""
    if token is None:
        return None

    user, _reason = await _resolve_user(db, token)
    if user is None or user.is_suspended:
        return None
    return user


OptionalCurrentUser = Annotated[User | None, Depends(get_optional_current_user)]


def is_admin_user(user: User) -> bool:
    return bool(user.is_admin or user.username.lower() in get_settings().admin_username_list)


async def get_admin_user(current_user: CurrentUser) -> User:
    if not is_admin_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


AdminUser = Annotated[User, Depends(get_admin_user)]
