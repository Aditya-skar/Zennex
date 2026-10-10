"""Rate limiting for write endpoints.

* With `REDIS_URL` set (Redis / Upstash), counters live in Redis so every API
  instance shares the same limits (fixed window: INCR + EXPIRE).
* Without it — or if Redis is unreachable — a per-process in-memory sliding
  window is used. Redis errors never take the API down (fail-open to memory).
"""
from __future__ import annotations

import logging
import math
import time
from collections import defaultdict, deque
from threading import Lock
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

logger = logging.getLogger("simsor.rate_limit")

# path prefix → (max_requests, window_seconds). First match wins, so keep more
# specific prefixes above broader ones.
_RULES: list[tuple[str, int, int]] = [
    ("/api/auth/login", 20, 60),
    ("/api/auth/signup", 10, 60),
    ("/api/auth/forgot-password", 5, 60),
    ("/api/auth/reset-password", 10, 60),
    ("/api/auth/change-password", 10, 60),
    ("/api/auth/send-verification", 5, 60),
    ("/api/auth/verify-email", 10, 60),
    ("/api/auth/google", 20, 60),
    ("/api/auth/apple", 20, 60),
    ("/api/uploads", 30, 60),
    ("/api/reports", 10, 60),
    ("/api/dab-ups", 30, 60),
    ("/api/follows", 60, 60),
    ("/api/posts", 60, 60),
    ("/api/me/device-token", 20, 60),
    ("/api/conversations", 300, 60),
]

_MUTATING = {"POST", "PUT", "PATCH", "DELETE"}


class _Window:
    def __init__(self) -> None:
        self.hits: deque[float] = deque()
        self.lock = Lock()


_buckets: dict[str, _Window] = defaultdict(_Window)
_redis: Any = None
_redis_url_in_use: str | None = None


def reset_memory() -> None:
    """Clears in-memory counters (used by tests)."""
    _buckets.clear()


def set_redis_client(client: Any | None) -> None:
    """Injects a Redis-compatible async client (tests) or clears it (None)."""
    global _redis, _redis_url_in_use
    _redis = client
    _redis_url_in_use = "__injected__" if client is not None else None


def _get_redis() -> Any | None:
    global _redis, _redis_url_in_use
    if _redis_url_in_use == "__injected__":
        return _redis

    url = get_settings().redis_url.strip()
    if not url:
        _redis, _redis_url_in_use = None, None
        return None
    if _redis is not None and _redis_url_in_use == url:
        return _redis

    try:
        import redis.asyncio as aioredis

        _redis = aioredis.from_url(
            url, socket_timeout=1.0, socket_connect_timeout=1.0, decode_responses=True
        )
        _redis_url_in_use = url
    except Exception:  # pragma: no cover - missing package / bad URL
        logger.warning("Redis rate limiting unavailable; falling back to memory", exc_info=True)
        _redis, _redis_url_in_use = None, None
    return _redis


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _match_rule(path: str) -> tuple[str, int, int] | None:
    return next((r for r in _RULES if path.startswith(r[0])), None)


def _check_memory(key: str, max_hits: int, window: int) -> int:
    """Returns 0 when allowed, otherwise seconds until the caller may retry."""
    bucket = _buckets[key]
    now = time.monotonic()
    with bucket.lock:
        while bucket.hits and bucket.hits[0] <= now - window:
            bucket.hits.popleft()
        if len(bucket.hits) >= max_hits:
            return max(1, math.ceil(bucket.hits[0] + window - now))
        bucket.hits.append(now)
    return 0


async def _check_redis(client: Any, key: str, max_hits: int, window: int) -> int:
    redis_key = f"rl:{key}"
    pipe = client.pipeline(transaction=True)
    pipe.incr(redis_key)
    pipe.ttl(redis_key)
    count, ttl = await pipe.execute()
    if ttl is None or int(ttl) < 0:
        # Fresh key (or one that lost its expiry): (re)arm the window.
        await client.expire(redis_key, window)
        ttl = window
    if int(count) > max_hits:
        return max(1, int(ttl))
    return 0


async def check_rate_limit(request: Request) -> int:
    """Returns 0 if the request may proceed, else the Retry-After seconds."""
    if not get_settings().rate_limit_enabled:
        return 0

    rule = _match_rule(request.url.path)
    if rule is None:
        return 0

    prefix, max_hits, window = rule
    key = f"{_client_ip(request)}:{prefix}"

    client = _get_redis()
    if client is not None:
        try:
            return await _check_redis(client, key, max_hits, window)
        except Exception:
            logger.warning("Redis rate-limit check failed; using in-memory limiter", exc_info=True)
    return _check_memory(key, max_hits, window)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.method in _MUTATING:
            retry_after = await check_rate_limit(request)
            if retry_after:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests — try again shortly"},
                    headers={"Retry-After": str(retry_after)},
                )
        return await call_next(request)
