"""POST /api/auth/* — login, signup, logout, sessions, passwords, email verification, OAuth."""
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, select, update

from app.config import get_settings
from app.deps import CurrentClaims, CurrentUser, DbSession, _as_utc
from app.email_outbox import send_password_reset_email, send_verification_email
from app.mappers import to_profile as _to_profile
from app.models import EmailVerification, PasswordReset, RevokedToken, User
from app.schemas import (
    AppleAuthBody,
    AuthSession,
    ChangePasswordBody,
    ForgotPasswordBody,
    ForgotPasswordResponse,
    GoogleAuthBody,
    LoginBody,
    OkResponse,
    PasswordChangedResponse,
    ResetPasswordBody,
    SignupBody,
    VerificationResponse,
    VerifyEmailBody,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
logger = logging.getLogger("simsor.auth")
settings = get_settings()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.strip().encode("utf-8")).hexdigest()


def _include_dev_token() -> bool:
    """Local/dev convenience when Resend isn't configured yet."""
    return not settings.resend_api_key.strip() and not settings.is_production


# ---------------------------------------------------------------------------
# Signup / login / logout / sessions
# ---------------------------------------------------------------------------


@router.post("/signup", response_model=AuthSession)
async def signup(body: SignupBody, db: DbSession) -> AuthSession:
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    email = str(body.email).strip().lower() if body.email else None
    if email:
        existing_email = await db.execute(select(User).where(User.email == email))
        if existing_email.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        username=body.username,
        email=email,
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

    if user.email:
        raw = await _issue_verification(db, user)
        _try_send_verification(user.email, raw)

    token = create_access_token(user.id)
    return AuthSession(token=token, user=_to_profile(user))


@router.post("/login", response_model=AuthSession)
async def login(body: LoginBody, db: DbSession) -> AuthSession:
    username = body.username.strip().lower()
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")

    if user.is_suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")
    if settings.require_email_verification and user.email and not user.email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Verify your email to sign in")

    token = create_access_token(user.id)
    return AuthSession(token=token, user=_to_profile(user))


@router.post("/logout")
async def logout(claims: CurrentClaims, db: DbSession) -> dict:
    """Revokes the presented token server-side (its `jti` goes on the denylist)."""
    now = _utcnow()
    if claims.jti and await db.get(RevokedToken, claims.jti) is None:
        db.add(
            RevokedToken(
                jti=claims.jti,
                user_id=claims.subject,
                expires_at=claims.expires_at or now + timedelta(days=30),
            )
        )
    # Opportunistic cleanup — expired tokens would be rejected by signature anyway.
    await db.execute(delete(RevokedToken).where(RevokedToken.expires_at < now))
    await db.commit()
    return {"ok": True}


@router.post("/logout-all", response_model=OkResponse)
async def logout_all(current_user: CurrentUser, db: DbSession) -> OkResponse:
    """Invalidates every token issued to this user up to now (all devices)."""
    current_user.tokens_valid_after = _utcnow()
    await db.commit()
    return OkResponse(ok=True)


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(body: ForgotPasswordBody, db: DbSession) -> ForgotPasswordResponse:
    """Always returns ok — never reveals whether the email exists."""
    email = str(body.email).strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        return ForgotPasswordResponse(ok=True)

    raw_token = secrets.token_urlsafe(32)
    expires = _utcnow() + timedelta(minutes=settings.password_reset_expire_minutes)

    db.add(PasswordReset(user_id=user.id, token_hash=_hash_token(raw_token), expires_at=expires))
    await db.commit()

    try:
        send_password_reset_email(to_email=email, reset_token=raw_token)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send reset email",
        ) from None

    include_token = _include_dev_token()
    if include_token:
        logger.info("Dev reset token for %s issued (email not sent)", email)

    return ForgotPasswordResponse(ok=True, resetToken=raw_token if include_token else None)


@router.post("/reset-password", response_model=OkResponse)
async def reset_password(body: ResetPasswordBody, db: DbSession) -> OkResponse:
    result = await db.execute(
        select(PasswordReset).where(
            PasswordReset.token_hash == _hash_token(body.token),
            PasswordReset.used_at.is_(None),
        )
    )
    row = result.scalar_one_or_none()
    now = _utcnow()
    if row is None or _as_utc(row.expires_at) < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user = await db.get(User, row.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")

    user.password_hash = hash_password(body.newPassword)
    # The reset link went to the account's own inbox → ownership is proven.
    user.email_verified = True
    # A reset usually means the old credentials may be compromised: kill all sessions.
    user.tokens_valid_after = now
    row.used_at = now
    await db.commit()
    return OkResponse(ok=True)


@router.post("/change-password", response_model=PasswordChangedResponse)
async def change_password(
    body: ChangePasswordBody, current_user: CurrentUser, db: DbSession
) -> PasswordChangedResponse:
    """Changes the password, signs every other device out, and returns a fresh
    token for the caller's device."""
    if not verify_password(body.currentPassword, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is wrong")
    current_user.password_hash = hash_password(body.newPassword)
    current_user.tokens_valid_after = _utcnow()
    await db.commit()
    return PasswordChangedResponse(ok=True, token=create_access_token(current_user.id))


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------


async def _issue_verification(db: DbSession, user: User) -> str:
    """Creates a fresh single-use token (and retires any earlier unused ones)."""
    now = _utcnow()
    await db.execute(
        update(EmailVerification)
        .where(EmailVerification.user_id == user.id, EmailVerification.used_at.is_(None))
        .values(used_at=now)
    )
    raw = secrets.token_urlsafe(24)
    db.add(
        EmailVerification(
            user_id=user.id,
            email=user.email or "",
            token_hash=_hash_token(raw),
            expires_at=now + timedelta(minutes=settings.email_verify_expire_minutes),
        )
    )
    await db.commit()
    return raw


def _try_send_verification(email: str, raw: str) -> bool:
    try:
        send_verification_email(to_email=email, token=raw)
        return True
    except RuntimeError:
        logger.warning("Verification email to %s could not be sent", email)
        return False


@router.post("/send-verification", response_model=VerificationResponse)
async def send_verification(current_user: CurrentUser, db: DbSession) -> VerificationResponse:
    if not current_user.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Add an email address first")
    if current_user.email_verified:
        return VerificationResponse(ok=True, alreadyVerified=True)

    raw = await _issue_verification(db, current_user)
    try:
        send_verification_email(to_email=current_user.email, token=raw)
    except RuntimeError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not send verification email"
        ) from None

    return VerificationResponse(ok=True, verificationToken=raw if _include_dev_token() else None)


@router.post("/verify-email", response_model=OkResponse)
async def verify_email(body: VerifyEmailBody, db: DbSession) -> OkResponse:
    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.token_hash == _hash_token(body.token),
            EmailVerification.used_at.is_(None),
        )
    )
    row = result.scalar_one_or_none()
    now = _utcnow()
    if row is None or _as_utc(row.expires_at) < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")

    user = await db.get(User, row.user_id)
    # The token is only valid for the exact address it was mailed to.
    if user is None or (user.email or "").lower() != row.email.lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification token")

    user.email_verified = True
    row.used_at = now
    await db.commit()
    return OkResponse(ok=True)


# ---------------------------------------------------------------------------
# OAuth
# ---------------------------------------------------------------------------


def _truthy(value: object) -> bool:
    if isinstance(value, str):
        return value.strip().lower() == "true"
    return bool(value)


@router.post("/google", response_model=AuthSession)
async def google_sign_in(body: GoogleAuthBody, db: DbSession) -> AuthSession:
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Set GOOGLE_CLIENT_ID on the API to enable Google sign-in",
        )
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token

        info = id_token.verify_oauth2_token(
            body.idToken, google_requests.Request(), settings.google_client_id
        )
    except Exception as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token") from exc

    sub = str(info.get("sub", ""))
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    user = await _oauth_user(
        db,
        provider="google",
        subject=sub,
        email=info.get("email"),
        email_verified=_truthy(info.get("email_verified")),
        full_name=(info.get("name") or "").strip(),
    )
    _ensure_can_sign_in(user)
    token = create_access_token(user.id)
    return AuthSession(token=token, user=_to_profile(user))


@router.post("/apple", response_model=AuthSession)
async def apple_sign_in(body: AppleAuthBody, db: DbSession) -> AuthSession:
    if not settings.apple_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Set APPLE_CLIENT_ID on the API to enable Apple sign-in",
        )
    try:
        from app.apple_auth import verify_apple_id_token

        info = verify_apple_id_token(body.idToken, settings.apple_client_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Apple token") from exc

    sub = str(info.get("sub", ""))
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Apple token")

    user = await _oauth_user(
        db,
        provider="apple",
        subject=sub,
        email=info.get("email"),
        email_verified=_truthy(info.get("email_verified")),
        full_name=(body.fullName or "").strip(),
    )
    _ensure_can_sign_in(user)
    token = create_access_token(user.id)
    return AuthSession(token=token, user=_to_profile(user))


def _ensure_can_sign_in(user: User) -> None:
    if user.is_suspended:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")


async def _oauth_user(
    db: DbSession,
    *,
    provider: str,
    subject: str,
    email: str | None,
    email_verified: bool,
    full_name: str,
) -> User:
    result = await db.execute(
        select(User).where(User.auth_provider == provider, User.auth_subject == subject)
    )
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    email = email.strip().lower() if email else None

    # Only link to an existing account by email when the provider vouches for it.
    if email and email_verified:
        by_email = await db.execute(select(User).where(User.email == email))
        linked = by_email.scalar_one_or_none()
        if linked is not None:
            if not linked.email_verified:
                # The local account claimed this address without ever proving it —
                # whoever registered it may not own it. Lock out their credentials
                # and sessions before handing the account to the verified owner.
                linked.password_hash = hash_password(secrets.token_urlsafe(32))
                linked.tokens_valid_after = _utcnow()
            linked.auth_provider = provider
            linked.auth_subject = subject
            linked.email_verified = True
            await db.commit()
            await db.refresh(linked)
            return linked

    # Don't attach an unverified provider email: it could collide with (or squat
    # on) someone else's address.
    store_email = email if (email and email_verified) else None

    base_username = (email.split("@")[0] if email else f"{provider}{subject[:8]}").lower()
    base_username = "".join(ch for ch in base_username if ch.isalnum() or ch in "-_")[:40] or "user"
    username = base_username
    suffix = 0
    while True:
        taken = await db.execute(select(User).where(User.username == username))
        if taken.scalar_one_or_none() is None:
            break
        suffix += 1
        username = f"{base_username}{suffix}"

    user = User(
        username=username,
        email=store_email,
        email_verified=bool(store_email),
        password_hash=hash_password(secrets.token_urlsafe(32)),
        full_name=full_name or username,
        auth_provider=provider,
        auth_subject=subject,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
