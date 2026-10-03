"""
Centralized settings, read from environment variables (or backend/.env).

Local dev needs zero setup: DATABASE_URL defaults to a SQLite file so you can
run the API without installing Postgres. Point DATABASE_URL at Neon/Supabase
Postgres for staging/production — the rest of the code is driver-agnostic.
"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # `development` (default): SQLite OK, auto-create tables on SQLite.
    # `production`: Postgres + Alembic only, R2 required — see DEPLOY_PHASE1.md.
    environment: str = "development"

    # Async SQLAlchemy URL. Examples:
    #   sqlite+aiosqlite:///./simsor.db                          (local dev, default)
    #   postgresql+asyncpg://user:pass@host/dbname?ssl=require   (Neon/Supabase)
    database_url: str = "sqlite+aiosqlite:///./simsor.db"

    # JWT
    jwt_secret: str = "dev-secret-change-me-before-deploying"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 30  # 30 days — mobile apps stay logged in

    # CORS: comma-separated list of allowed origins for the production web/app build.
    # "*" is fine for local dev only.
    cors_origins: str = "*"

    # --- Media storage (Phase 3) ---
    # Cloudflare R2 is S3-compatible, so the same boto3 client works for both R2
    # and plain S3. Leave these unset for local dev: app/storage.py falls back
    # to saving files on disk under `upload_dir`, served at /uploads — same
    # "swap via env var, no code change" pattern as `database_url`. Set all
    # five R2_* values in backend/.env to switch a deployment to real R2.
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_public_url_base: str = ""

    upload_dir: str = "./uploads"
    max_image_upload_mb: int = 15
    max_video_upload_mb: int = 50

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() in {"production", "prod"}

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def should_auto_create_tables(self) -> bool:
        """SQLite dev convenience only — never in production."""
        return self.is_sqlite and not self.is_production

    @property
    def r2_configured(self) -> bool:
        return bool(
            self.r2_account_id
            and self.r2_access_key_id
            and self.r2_secret_access_key
            and self.r2_bucket_name
            and self.r2_public_url_base
        )

    @property
    def r2_endpoint_url(self) -> str:
        return f"https://{self.r2_account_id}.r2.cloudflarestorage.com"

    @property
    def cors_origin_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
