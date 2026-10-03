"""Password hashing and JWT helpers.

Uses `bcrypt` directly (not passlib) — passlib's bcrypt backend has known
version-detection issues with bcrypt>=4.1, and the direct API is tiny enough
not to need the wrapper.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.config import get_settings

settings = get_settings()

# bcrypt has a hard 72-byte input limit; truncate defensively so long
# passwords don't raise instead of silently degrading security.
_MAX_PASSWORD_BYTES = 72


def hash_password(password: str) -> str:
    truncated = password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
    return bcrypt.hashpw(truncated, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    truncated = password.encode("utf-8")[:_MAX_PASSWORD_BYTES]
    try:
        return bcrypt.checkpw(truncated, password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    # `role`/`aud` are extra claims Supabase Realtime expects on any JWT it's
    # asked to trust (see backend/CHAT_SETUP.md — "bring your own auth"): once
    # JWT_SECRET is set to the project's own secret, Supabase verifies the
    # signature and treats the connection as the `authenticated` Postgres
    # role, which is what the chat tables' RLS policies check against. They're
    # inert extra fields for our own `decode_access_token` below.
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "role": "authenticated",
        "aud": "authenticated",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> str | None:
    """Returns the user id (subject) if the token is valid, else None."""
    try:
        # `options={"verify_aud": False}`: the `aud` claim on the token is
        # only there for Supabase Realtime's benefit (see create_access_token
        # above) — jose otherwise demands an `audience=` argument here just
        # because the claim is present, which we don't care to check ourselves.
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], options={"verify_aud": False}
        )
    except JWTError:
        return None
    subject = payload.get("sub")
    return subject if isinstance(subject, str) else None
