"""
Readiness check for Deploy Phase 1. Run from backend/ with venv active:

  python scripts/check_deploy_ready.py
  python scripts/check_deploy_ready.py --production
"""
from __future__ import annotations

import argparse
import os
import sys

# Allow `python scripts/check_deploy_ready.py` from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import Settings  # noqa: E402
from app.startup_checks import DEV_JWT_PLACEHOLDER  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="SIMSOR backend deploy readiness")
    parser.add_argument(
        "--production",
        action="store_true",
        help="Apply production rules (same as ENVIRONMENT=production on the server)",
    )
    args = parser.parse_args()

    settings = Settings()
    if args.production:
        settings = Settings(environment="production")

    ok = True
    def fail(msg: str) -> None:
        nonlocal ok
        ok = False
        print(f"  [FAIL] {msg}")

    def pass_(msg: str) -> None:
        print(f"  [ OK ] {msg}")

    def warn(msg: str) -> None:
        print(f"  [WARN] {msg}")

    prod = settings.is_production or args.production
    print(f"Mode: {'production' if prod else 'development'}")
    print()

    if settings.is_sqlite:
        if prod:
            fail("DATABASE_URL is SQLite — set Postgres (Supabase/Neon).")
        else:
            pass_("DATABASE_URL is SQLite (fine for local dev).")
    else:
        pass_("DATABASE_URL is Postgres-compatible.")

    if settings.jwt_secret.strip() == DEV_JWT_PLACEHOLDER:
        if prod:
            fail("JWT_SECRET is still the dev placeholder.")
        else:
            warn("JWT_SECRET is dev placeholder (OK locally).")
    elif len(settings.jwt_secret.strip()) < 32 and prod:
        fail("JWT_SECRET should be at least 32 characters in production.")
    else:
        pass_("JWT_SECRET looks configured.")

    if settings.cors_origins.strip() == "*":
        if prod:
            fail("CORS_ORIGINS is '*' — set real origins for production.")
        else:
            warn("CORS_ORIGINS is '*' (OK for local dev).")
    else:
        pass_("CORS_ORIGINS is restricted.")

    if settings.r2_configured:
        pass_("R2 media storage is configured.")
    elif settings.supabase_storage_configured:
        pass_("Supabase Storage is configured.")
    elif prod:
        fail("Need Supabase Storage (SUPABASE_URL + SERVICE_ROLE) or all R2_* vars.")
    else:
        warn("No durable media — using local disk /uploads (dev only).")

    if settings.redis_url.strip():
        pass_("REDIS_URL set — rate limits are shared across instances.")
    else:
        warn("REDIS_URL not set — rate limits are per-process (OK for a single instance).")

    if settings.resend_api_key.strip():
        pass_("RESEND_API_KEY set — reset/verification emails will be delivered.")
    else:
        warn("RESEND_API_KEY not set — emails are only logged (no password reset in prod).")

    if settings.fcm_configured:
        pass_("FCM configured — push notifications enabled.")
    else:
        warn("FCM_SERVICE_ACCOUNT_JSON not set — push notifications disabled.")

    if settings.admin_username_list:
        pass_("ADMIN_USERNAMES set — moderation endpoints usable.")
    else:
        warn("ADMIN_USERNAMES empty — set it (or users.is_admin) to use /api/admin.")

    print()
    if prod and ok:
        print("Ready for production deploy. Next: host Docker image + set env on platform.")
        return 0
    if prod and not ok:
        print("Not ready for production. Fix [FAIL] items — see DEPLOY_PHASE1.md.")
        return 1
    print("Local dev OK. For production checklist: python scripts/check_deploy_ready.py --production")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
