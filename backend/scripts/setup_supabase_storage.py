"""
Create the public `media` bucket on Supabase Storage.

  cd backend
  .\\.venv\\Scripts\\python.exe scripts\\setup_supabase_storage.py
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.storage import StorageUploadError, ensure_supabase_media_bucket


def main() -> int:
    settings = get_settings()
    if not settings.supabase_storage_configured:
        print("Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in backend/.env")
        print("Supabase → Settings → API → Project URL + service_role (secret) key")
        return 1
    try:
        ensure_supabase_media_bucket()
    except StorageUploadError as exc:
        print(f"FAIL: {exc}")
        return 1
    bucket = settings.supabase_storage_bucket or "media"
    print(f"OK — public bucket '{bucket}' is ready.")
    print(f"Public files: {settings.supabase_url_normalized}/storage/v1/object/public/{bucket}/...")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
