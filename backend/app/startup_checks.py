"""Production startup validation (Deploy Phase 1).

Fails fast when ENVIRONMENT=production but SQLite, dev JWT, etc. are still set.
"""
import logging
import sys

from app.config import Settings

logger = logging.getLogger("simsor.startup")

DEV_JWT_PLACEHOLDER = "dev-secret-change-me-before-deploying"


def validate_settings(settings: Settings) -> None:
    if not settings.is_production:
        if settings.is_sqlite:
            logger.info("Development mode: SQLite + optional auto-create tables.")
        else:
            logger.info("Development mode: Postgres — prefer `alembic upgrade head` for schema.")
        return

    errors: list[str] = []
    if settings.is_sqlite:
        errors.append("DATABASE_URL must be Postgres in production (SQLite is dev-only).")
    if settings.jwt_secret.strip() == DEV_JWT_PLACEHOLDER or len(settings.jwt_secret.strip()) < 32:
        errors.append("JWT_SECRET must be a strong secret (32+ chars), not the dev placeholder.")
    if settings.cors_origins.strip() == "*":
        errors.append("CORS_ORIGINS must list real origins in production (not '*').")
    if not settings.r2_configured:
        errors.append(
            "R2_* env vars must all be set in production (local /uploads disk is not deploy-safe)."
        )

    for msg in errors:
        logger.error("Production config: %s", msg)

    if errors:
        sys.exit(
            "Refusing to start in production with invalid config. "
            "See backend/DEPLOY_PHASE1.md and backend/.env.production.example."
        )

    logger.info("Production config checks passed (Postgres, JWT, CORS, R2).")
