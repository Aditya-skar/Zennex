# Phase 3 — Posts, Likes, Follow Graph, Uploads, and Real Feed Ranking

Status: **implemented, wired end-to-end, and verified**. Backend endpoints
were smoke-tested individually during the backend pass; a full in-process
integration check (signup → create event with `startsAt` → create post →
like → delete event → confirm cascade-deleted post) was re-run after the
frontend wiring pass below and passed on 2026-07-24.

This document records what Phase 3 built on top of Phase 2's events backend.
See [PHASE2.md](PHASE2.md) for events, and the plan this phase followed for
the full design rationale (data model, scoring formula, endpoint table).

---

## 1. What was built

### Database (4 new migrations)

| Migration | Adds |
|---|---|
| `0004_add_event_starts_at.py` | `events.starts_at` (nullable `DateTime`) — the real ISO start time, previously only ever formatted into display strings and never persisted. |
| `0005_create_posts_and_likes.py` | `posts`, `post_likes` tables |
| `0006_create_follows.py` | `follows` table (composite PK `follower_id, followee_id`) |
| `0007_create_affinity.py` | `affinity` table (composite PK `user_id, kind, key`) |

A post always backs an existing event (`posts.event_id`, required); display
fields (title, category, coordinates, date) are hydrated via a join to
`events` rather than duplicated, so they can't drift. Like counts are
`COUNT()`-computed at read time rather than a denormalized counter, same
pattern as `eventsHosted` in `app/routers/users.py`.

### New backend modules

- **`app/storage.py`** — swappable upload backend: Cloudflare R2 (via
  `boto3`, S3-compatible) when `R2_*` env vars are set in `backend/.env`,
  otherwise local disk under `backend/uploads/` served at `/uploads/*`.
  Zero code changes needed to switch once real R2 credentials are dropped
  in — see [§4](#4-still-needed-cloudflare-r2-credentials).
- **`app/affinity.py`** — the server-side weight table + bump helpers
  (`record_interaction`, `bump_category`, `bump_author`) that back
  `POST /api/affinity/track` and the automatic server-side bumps on
  like/repost.

### New routers

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/posts` | optional | Hydrated via join to `events`; `likedByMe` only populated when authenticated |
| `POST` | `/api/posts` | required | `author_id` always the authenticated user; auto-bumps affinity when `isReshared` |
| `DELETE` | `/api/posts/:id` | required | 403 if not the author |
| `POST` | `/api/posts/:id/like` | required | Toggle; affinity bumped only when turning **on** |
| `POST` | `/api/follows/:userId` | required | 400 on self-follow |
| `DELETE` | `/api/follows/:userId` | required | Unfollow |
| `GET` | `/api/follows/mine` | required | List of followed user ids |
| `POST` | `/api/affinity/track` | required | `{category, mainCategory, reason, seconds?, authorId?}` — server looks up the point value from a fixed weight table, never trusts a client-sent number |
| `GET` | `/api/affinity/mine` | required | `{categories: {...}, authors: {...}}` |
| `POST` | `/api/uploads` | required | Multipart `file`; validates type/size, returns `{url, type}` |

`app/deps.py` gained `get_optional_current_user` for `GET /api/posts`'
`likedByMe`, which should personalize when logged in without requiring it.

### Cascading delete + `starts_at` persistence (bugs fixed this pass)

Two gaps were found and fixed while wiring the frontend against these
endpoints:

1. **`POST /api/events` silently dropped `startsAt`.** `EventCreate` /
   `EventDto` had the field, but `routers/events.py` never read
   `body.startsAt` into `Event(starts_at=...)`, nor returned it in `_to_dto`.
   Every event created through the live API (as opposed to the seed script,
   which set the column directly) had a `NULL` `starts_at` — which meant
   every post backing it had no `eventDateISO`, breaking recency scoring and
   "is this event past" for anything the app itself created. Fixed.
2. **`DELETE /api/events/:id` didn't remove its post(s).** The plan calls
   for "deleting an event explicitly deletes its post in application code"
   (no DB-level `ON DELETE CASCADE` since SQLite FK pragmas aren't enabled
   here) — this symmetry existed client-side (`deletePublishedPost`) but not
   server-side, so a user deleting their event from one device would leave
   an orphaned post visible to everyone else via `GET /api/posts`. Fixed:
   `delete_event` now deletes the event's `post_likes` then `posts` rows
   before deleting the event itself.

### Frontend wiring

Unlike Phase 2 (where the frontend refactor was deliberately deferred — see
PHASE2.md §3), this phase wires all the way through:

- **`src/api/{postsApi,followApi,affinityApi,uploadApi}.ts`** + `types.ts` +
  `client.ts`'s `apiUpload` — thin facades over the endpoints above.
- **`feedAlgorithm.ts`** — follow graph and affinity now read from the
  backend behind a stale-while-revalidate cache (`getFollowing`/`getAffinity`
  return the last-known value synchronously, kick off a background refresh,
  and fire `FEED_CHANGED_EVENT` when fresh data lands), so `buildFeed` stays
  synchronous exactly as before. `toggleFollow` optimistically updates the
  cache and reverts on request failure. Mock mode (no `VITE_API_URL`) is
  untouched — same `localStorage`-backed implementation as before.
- **`homeFeed.ts`** — `mapPostDtoToHomeFeedPost` translates the backend
  `PostDto` into the existing `HomeFeedPost` shape; `hoursSincePosted` prefers
  the real `createdAtISO` over the old `postedAgo` label parser when present.
- **`feedSource.ts`** (new) — `loadFeedPosts()` is the single place that
  decides "posts from `GET /api/posts`" vs "localStorage + seed array",
  used by both `Layout.tsx` (Home) and `DiscoverPage.tsx`.
- **`HomePostCard.tsx`** — like button calls `POST /api/posts/:id/like`
  with optimistic UI + rollback on failure; Boost (follow) button already
  routed through `feedAlgorithm.ts`'s backend-aware `toggleFollow`; dwell
  time and location/join/open-profile interactions call
  `POST /api/affinity/track` via `recordDwell`/`recordInteraction`; delete
  now removes the post *and* its backing event server-side.
- **`ExplorePage.tsx`** — sub-filter chip clicks and map pin/popup opens call
  `trackCategoryInteraction(..., 'explore_subfilter' | 'explore_pin_open')`.
- **`DiscoverFeed/DiscoverPage.tsx`** — grid tile opens call
  `trackCategoryInteraction(..., 'discover_tile_open')`; posts loaded via
  `feedSource.ts` like Home.
- **`CreateEventModal.tsx`** — photo/video picked for a new event now
  uploads to `POST /api/uploads` when a backend is configured (instead of a
  base64 data URL / blob URL that never left the browser tab); the map
  pin's cover photo uses the uploaded image when available instead of the
  fixed per-category stock photo. Mock mode keeps the old
  downscale-to-base64 / blob URL behavior unchanged.
- **`ProfileView.tsx`** — the profile-photo crop flow still crops to a data
  URL locally (canvas-based crop, unchanged), but now uploads that cropped
  image via `POST /api/uploads` before saving, so `avatarUrl` becomes a real
  server URL instead of a large base64 string in the `users` row. Falls back
  to the base64 string (old behavior) if the upload request fails, so a
  profile save never hard-fails because of it.
- **`publishContent.ts`** — `submitCreateEvent`/`publishEventRemote` create
  the real post via `POST /api/posts` right after the event exists;
  `deletePublishedPost`/`isUserCreatedPost` recognize the real authenticated
  user id (`getCurrentViewerId()`) as "mine", not just the mock `org-me`
  placeholder, so delete/edit affordances show up correctly once a backend
  is configured.
- **`homeFeed.ts`'s `isMe()`** (new) — centralizes "is this authorId the
  current user" across mock and backend modes; used by `getPostAuthor`,
  `isFollowedPost`, and `HomePostCard`'s own-post checks so a backend user's
  own posts render as "You" instead of falling through to a mismatched
  mock organizer lookup.

---

## 2. Verified (2026-07-24)

Individual endpoints (posts CRUD, like toggle, follow/unfollow, affinity
track/read, uploads via `curl.exe -F`) were smoke-tested against the running
dev server during the backend implementation pass.

After the frontend wiring pass, an in-process integration check (FastAPI
ASGI transport against an isolated temp SQLite DB — no shared state, no real
credentials) re-verified the two bugs fixed above:

| Check | Result |
|---|---|
| `POST /api/events` with `startsAt` | Returned `EventDto.startsAt` matches what was sent (previously always `null`) |
| `POST /api/posts` for that event | `eventDateISO` populated from the event's `starts_at` |
| `POST /api/posts/:id/like` | `{"liked": true, "likes": 1}` |
| `DELETE /api/events/:id` | `{"ok": true}` |
| `GET /api/posts` after the delete | The post backing the deleted event is gone (cascade-deleted, not orphaned) |

`npm run build` (Vite) passes with the full frontend wiring in place; the
project has no `tsc`/type-check script configured (no `typescript`
dev-dependency), so this build (esbuild-based transform + bundle) is the
extent of automated frontend verification available in this environment —
there's no browser tool here to click through Create Event → like → follow
→ feed-reorder manually. That pass is worth doing by hand next:

1. Open the app with `VITE_API_URL` set, sign in.
2. Create an event with a real photo — confirm the upload progress indicator,
   then confirm it posts to Home with a real (non-blob, non-base64) image
   URL and shows up on the Explore map with that same photo as its pin cover.
3. Like a post, refresh, confirm the like persisted.
4. Follow someone from a post's Boost button, confirm their posts move into
   the "Boosting" section.
5. Click into a few categories on Explore/Discover repeatedly, confirm that
   category starts surfacing more in "Suggested for you" over time.
6. Edit your profile photo, confirm `avatarUrl` in `GET /api/me` is a short
   `/uploads/...` (or R2) URL, not a multi-KB base64 string.

---

## 3. Deliberately out of scope (per the plan)

- **Comments** — already dead code client-side, not resurrected.
- **Join/RSVP persistence** — stays `localStorage`-only; joining still
  contributes to affinity via an explicit `POST /api/affinity/track` call
  (`reason: "join"`), it just isn't synced across devices.
- **Dab-ups / private-map graph** — separate concept from "follow" (public
  boost graph), untouched.
- **Feed pagination** — `GET /api/posts` returns everything; fine at demo
  scale.
- **Repost as a real post-creation flow** — `HomePostCard`'s Repost button
  is still a lightweight, ephemeral affinity signal (it doesn't create a new
  shared post via `POST /api/posts` with `isReshared: true`). The backend
  *does* support and auto-bump affinity for real reposts created that way —
  wiring an actual "repost to your followers" flow that creates one is a
  follow-up feature, not part of this pass's file list.

---

## 4. Still needed: Cloudflare R2 credentials

Uploads work today via the local-disk fallback (`backend/uploads/`, served
at `/uploads/*`). To switch to R2 with zero code changes, add to
`backend/.env`:

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL_BASE=...   # bucket's r2.dev subdomain, or a custom domain
```

`app/config.py`'s `r2_configured` flips on once all of these are set, and
`app/storage.py` starts writing through `boto3`'s S3-compatible client
instead of local disk.
