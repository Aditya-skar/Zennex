# Phase 4 — Hardening

Migration: `0012_hardening` (applied to the Supabase DB). All features below are covered by
`backend/tests` (`python -m pytest`).

## What was added

| Area | Behaviour |
|------|-----------|
| **Email verification** | `POST /api/auth/send-verification`, `/verify-email`. Single-use, sha256-hashed tokens bound to the mailed address. Signup with an email auto-sends one. Password reset and Google/Apple also mark the email verified. Optional gate: `REQUIRE_EMAIL_VERIFICATION=true`. |
| **Session revocation** | Every JWT has a `jti` + millisecond `iat_ms`. `/logout` denylists one token (`revoked_tokens`); `/logout-all`, password change/reset and suspension set `users.tokens_valid_after`, killing all older tokens. |
| **Push (FCM v1)** | New DM/group message, follow, dab-up request/accept, event join, report resolved. Fire-and-forget, dead tokens pruned, muted chats / blocked senders skipped. iOS is delivered through Firebase (APNs). |
| **Moderation** | `/api/admin/*`: stats, report queue, triage (`open → reviewing → resolved/dismissed`), remove post/message, suspend/unsuspend users. |
| **Blocks** | Enforced both ways for DMs, follows, dab-ups, and the user directory. |
| **Rate limiting** | Redis fixed window when `REDIS_URL` is set; per-process memory otherwise or if Redis errors. `Retry-After` on 429. More endpoints covered. |
| **Geo** | `GET /api/events` narrows with an indexed lat/lng bounding box (antimeridian/pole safe) before the exact haversine check; optional `limit`/`offset`. No PostGIS required. |
| **Cleanup** | Account deletion and content removal now delete message reactions first (no FK failures on Postgres). |

## One-time setup

1. **Admin** — set `ADMIN_USERNAMES=yourusername` on the host (or `UPDATE users SET is_admin = true WHERE username = '…'`). Then call `/api/admin/*` with that user's token.
2. **Email** — create a [Resend](https://resend.com) key → `RESEND_API_KEY`, and verify your sending domain → `EMAIL_FROM`. Set `PUBLIC_APP_URL` for a clickable link.
3. **Push** — Firebase console → Project settings → Service accounts → *Generate new private key*. Put the JSON in `FCM_SERVICE_ACCOUNT_JSON` (raw JSON or a file path). For iOS also upload your APNs key under Cloud Messaging. The app must call `POST /api/me/device-token` with its FCM token after login and `DELETE /api/me/device-token` on logout.
4. **Redis** — create an Upstash (or any Redis) database → `REDIS_URL=rediss://…`. Needed only when running more than one API instance.

## Notes / limits

- Rate limiting is per client IP (first `X-Forwarded-For` hop). Make sure your proxy sets it; otherwise all users share one bucket.
- The geo prefilter scales to tens of thousands of events. Past that, move to PostGIS (`ST_DWithin` on a `geography` column) — `app/geo.py` is the only place that needs to change.
- The `revoked_tokens` denylist is pruned opportunistically on logout (expired rows are useless anyway).
- Earlier migrations (0001–0011) target Postgres; `alembic upgrade head` is not supported on SQLite (dev uses `create_all`).
