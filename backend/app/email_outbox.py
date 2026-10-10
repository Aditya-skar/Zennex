"""Outbound email — Resend when configured, otherwise log (dev-safe)."""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request

from app.config import get_settings

logger = logging.getLogger("simsor.email")


def send_email(*, to_email: str, subject: str, text: str) -> bool:
    """Sends via Resend. Returns True if handed to the provider, False when
    no provider is configured (the message is logged instead — dev only)."""
    settings = get_settings()

    if not settings.resend_api_key.strip():
        logger.warning("RESEND_API_KEY unset — email NOT sent. to=%s subject=%s\n%s", to_email, subject, text)
        return False

    payload = {
        "from": settings.email_from,
        "to": [to_email],
        "subject": subject,
        "text": text,
    }
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.resend_api_key.strip()}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            resp.read()
    except urllib.error.HTTPError as exc:
        err = exc.read().decode("utf-8", errors="replace")
        logger.error("Resend failed (%s): %s", exc.code, err)
        raise RuntimeError("Failed to send email") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        logger.error("Resend unreachable: %s", exc)
        raise RuntimeError("Failed to send email") from exc
    return True


def send_password_reset_email(*, to_email: str, reset_token: str) -> None:
    body_text = (
        f"Use this code in the app to reset your password (expires soon):\n\n"
        f"{reset_token}\n\n"
        f"If you did not request this, ignore this email."
    )
    send_email(to_email=to_email, subject="Reset your SIMSOR password", text=body_text)


def send_verification_email(*, to_email: str, token: str) -> None:
    settings = get_settings()
    link = ""
    base = settings.public_app_url.strip().rstrip("/")
    if base:
        link = f"Or open this link: {base}/verify-email?token={token}\n\n"
    body_text = (
        "Welcome to SIMSOR! Confirm your email address by entering this code in the app:\n\n"
        f"{token}\n\n"
        f"{link}"
        "If you did not create an account, ignore this email."
    )
    send_email(to_email=to_email, subject="Verify your SIMSOR email", text=body_text)
