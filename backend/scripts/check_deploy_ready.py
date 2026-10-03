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
    elif prod:
        fail("R2_* vars not all set — required for production uploads.")
    else:
        warn("R2 not set — using local disk /uploads (dev only).")

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
