"""File storage for uploaded post/event/avatar media.

Preference order:
  1. Cloudflare R2 when all R2_* env vars are set
  2. Supabase Storage when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
  3. Local disk under upload_dir (dev only; not durable across deploys)

Callers always get a public URL back from `save_upload`.
"""
import json
import os
import uuid
import urllib.error
import urllib.request
from functools import lru_cache

from app.config import get_settings

settings = get_settings()


class UploadTooLarge(Exception):
    def __init__(self, max_mb: int):
        self.max_mb = max_mb
        super().__init__(f"File exceeds the {max_mb}MB limit")


class UnsupportedMediaType(Exception):
    pass


class StorageUploadError(Exception):
    pass


def _kind_for_content_type(content_type: str) -> str:
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("video/"):
        return "video"
    raise UnsupportedMediaType(f"Unsupported content type: {content_type}")


def _extension_for(content_type: str, fallback_name: str) -> str:
    guessed = content_type.split("/")[-1].lower()
    if guessed in {"jpeg", "jpg", "png", "gif", "webp", "mp4", "webm", "quicktime", "mov"}:
        return "jpg" if guessed == "jpeg" else ("mov" if guessed == "quicktime" else guessed)
    _, _, ext = fallback_name.rpartition(".")
    return ext.lower() or "bin"


@lru_cache
def _r2_client():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=settings.r2_endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
    )


def _save_to_r2(data: bytes, key: str, content_type: str) -> str:
    client = _r2_client()
    client.put_object(Bucket=settings.r2_bucket_name, Key=key, Body=data, ContentType=content_type)
    base = settings.r2_public_url_base.rstrip("/")
    return f"{base}/{key}"


def _save_to_supabase(data: bytes, key: str, content_type: str) -> str:
    """Upload via Storage REST API using the service role key."""
    bucket = settings.supabase_storage_bucket.strip() or "media"
    base = settings.supabase_url_normalized
    url = f"{base}/storage/v1/object/{bucket}/{key}"
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "true",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise StorageUploadError(f"Supabase Storage upload failed ({exc.code}): {body}") from exc
    except urllib.error.URLError as exc:
        raise StorageUploadError(f"Supabase Storage unreachable: {exc}") from exc

    return f"{base}/storage/v1/object/public/{bucket}/{key}"


def ensure_supabase_media_bucket() -> None:
    """Create the public media bucket if it does not exist (idempotent)."""
    if not settings.supabase_storage_configured:
        raise StorageUploadError("Supabase Storage is not configured")

    base = settings.supabase_url_normalized
    bucket = settings.supabase_storage_bucket.strip() or "media"
    payload = json.dumps({"name": bucket, "public": True}).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/storage/v1/bucket",
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "apikey": settings.supabase_service_role_key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            resp.read()
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        # Already exists is fine
        if exc.code in {409, 400} and ("already" in body.lower() or "duplicate" in body.lower() or "exists" in body.lower()):
            return
        if exc.code == 409:
            return
        raise StorageUploadError(f"Could not create bucket '{bucket}' ({exc.code}): {body}") from exc


def _save_to_local_disk(data: bytes, key: str) -> str:
    path = os.path.join(settings.upload_dir, *key.split("/"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return f"/uploads/{key}"


def save_upload(data: bytes, filename: str, content_type: str) -> tuple[str, str]:
    """Validates and stores an uploaded file. Returns (url, kind)."""
    kind = _kind_for_content_type(content_type)

    max_mb = settings.max_image_upload_mb if kind == "image" else settings.max_video_upload_mb
    if len(data) > max_mb * 1024 * 1024:
        raise UploadTooLarge(max_mb)

    key = f"{kind}s/{uuid.uuid4().hex}.{_extension_for(content_type, filename)}"

    if settings.r2_configured:
        url = _save_to_r2(data, key, content_type)
    elif settings.supabase_storage_configured:
        url = _save_to_supabase(data, key, content_type)
    else:
        url = _save_to_local_disk(data, key)

    return url, kind
