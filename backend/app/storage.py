"""File storage for uploaded post/event/avatar media (Phase 3).

Uses Cloudflare R2 (S3-compatible, via boto3) when `R2_*` env vars are
configured (see app/config.py::Settings.r2_configured). Otherwise falls back
to saving files on local disk under `upload_dir`, served by the StaticFiles
mount in app/main.py — the same "sensible free default, swap via env var"
pattern already used for `DATABASE_URL`. Callers don't need to know which
backend is active; `save_upload` returns a public URL either way.
"""
import os
import uuid
from functools import lru_cache

from app.config import get_settings

settings = get_settings()


class UploadTooLarge(Exception):
    def __init__(self, max_mb: int):
        self.max_mb = max_mb
        super().__init__(f"File exceeds the {max_mb}MB limit")


class UnsupportedMediaType(Exception):
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


def _save_to_local_disk(data: bytes, key: str) -> str:
    # `key` includes a kind subfolder (e.g. "images/<uuid>.png"), so create the
    # full parent path, not just `upload_dir` itself.
    path = os.path.join(settings.upload_dir, *key.split("/"))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    return f"/uploads/{key}"


def save_upload(data: bytes, filename: str, content_type: str) -> tuple[str, str]:
    """Validates and stores an uploaded file. Returns (url, kind) where kind
    is 'image' or 'video'. Raises UnsupportedMediaType / UploadTooLarge."""
    kind = _kind_for_content_type(content_type)

    max_mb = settings.max_image_upload_mb if kind == "image" else settings.max_video_upload_mb
    if len(data) > max_mb * 1024 * 1024:
        raise UploadTooLarge(max_mb)

    key = f"{kind}s/{uuid.uuid4().hex}.{_extension_for(content_type, filename)}"

    if settings.r2_configured:
        url = _save_to_r2(data, key, content_type)
    else:
        url = _save_to_local_disk(data, key)

    return url, kind
