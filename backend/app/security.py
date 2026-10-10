"""Password hashing and JWT helpers.

Uses `bcrypt` directly (not passlib) — passlib's bcrypt backend has known
version-detection issues with bcrypt>=4.1, and the direct API is tiny enough
not to need the wrapper.
"""
import uuid
from dataclasses import dataclass
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


@dataclass(frozen=True)
class TokenClaims:
    subject: str
    jti: str | None
    # Millisecond issue time (custom `iat_ms` claim). Standard `iat` is only
    # second-granular, which can't order a login against a same-second
    # "log out everywhere".
    issued_ms: int | None
    expires_at: datetime | None


def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_expire_minutes)
    # `role`/`aud` are extra claims Supabase Realtime expects on any JWT it's
    # asked to trust (see backend/CHAT_SETUP.md — "bring your own auth"): once
    # JWT_SECRET is set to the project's own secret, Supabase verifies the
    # signature and treats the connection as the `authenticated` Postgres
    # role, which is what the chat tables' RLS policies check against. They're
    # inert extra fields for our own `decode_access_token` below.
    payload: dict[str, Any] = {
        "sub": subject,
        "exp": expire,
        "jti": uuid.uuid4().hex,
        "iat_ms": int(now.timestamp() * 1000),
        "role": "authenticated",
        "aud": "authenticated",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token_claims(token: str) -> TokenClaims | None:
    """Verifies signature + expiry and returns the claims we care about."""
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
    if not isinstance(subject, str):
        return None

    jti = payload.get("jti")
    issued = payload.get("iat_ms")
    exp = payload.get("exp")
    return TokenClaims(
        subject=subject,
        jti=jti if isinstance(jti, str) else None,
        issued_ms=int(issued) if isinstance(issued, (int, float)) else None,
        expires_at=datetime.fromtimestamp(exp, tz=timezone.utc) if isinstance(exp, (int, float)) else None,
    )


def decode_access_token(token: str) -> str | None:
    """Returns the user id (subject) if the token is valid, else None."""
    claims = decode_token_claims(token)
    return claims.subject if claims else None
