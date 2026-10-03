# Phase 2 (started) — Events

Status: **events backend implemented and verified**. Frontend wiring deferred
— see [Frontend wiring: deferred](#frontend-wiring-deferred-and-why) below.

---

## 1. What was built

### Database
New `events` table (`app/models.py::Event`), migration
`alembic/versions/0002_create_events_table.py`. Fields mirror `EventDto` in
`frontend/src/api/types.ts`:

`id, title, category, main_category, date, time, venue, location,
description, lat, lng, attendees, image, organizer_id, game_access,
created_at, updated_at`.

`date`/`time` are stored as the free-text display strings the frontend
already sends (e.g. `"Sun, June 14"`, `"09:00 AM"`) — matching the existing
contract rather than forcing a stricter format that would require a frontend
change.

### Endpoints (`app/routers/events.py`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/events` | none | Query params: `lat`, `lng`, `radiusKm`, `mainCategory`. Radius filter only applies when all three of `lat`/`lng`/`radiusKm` are present. |
| `POST` | `/api/events` | Bearer required | `organizerId` is **always** taken from the authenticated user — any `organizerId` in the request body is ignored, so a user can't create events attributed to someone else. |
| `DELETE` | `/api/events/:id` | Bearer required | `404` if the event doesn't exist, `403` if the caller isn't the organizer. |

### Radius filtering (`app/geo.py`)
Plain-Python haversine distance, computed after fetching the (optionally
category-filtered) rows. Fine at low event counts. When you outgrow this
(per the roadmap's Phase 4 scale helpers), switch to a PostGIS
`ST_DWithin` query on Neon — the API shape (`lat`/`lng`/`radiusKm` query
params) doesn't need to change, only the implementation of `list_events`.

---

## 2. Verified (2026-07-24)

| Check | Result |
|---|---|
| `GET /api/events` with no events | `[]` |
| `POST /api/events` with valid token | Creates event, `organizerId` == token's user id |
| `POST /api/events` with a spoofed `organizerId` in the body | Ignored — server used the real authenticated user id instead |
| `POST /api/events` with no token | `401` |
| `GET /api/events?mainCategory=Sports` | Only Sports events returned |
| `GET /api/events?lat=&lng=&radiusKm=50` | Correctly excluded an event >1000km away (Hyderabad vs Delhi) |
| `DELETE /api/events/:id` as the organizer | `{"ok": true}`, event removed from subsequent list |
| `DELETE /api/events/:id` again (already deleted) | `404` |
| `DELETE /api/events/:id` as a different user | `403` |

---

## 3. Frontend wiring: deferred, and why

The roadmap's next step was "wire `ExplorePage` and `CreateEventModal` to
`eventsApi.ts`." I did **not** do this yet, deliberately:

- `frontend/src/api/eventsApi.ts` **already exists and is already correct**
  — it calls the live API when `isBackendEnabled()` (i.e. `VITE_API_URL` is
  set) and falls back to the local `exploreEvents.ts` store otherwise. No
  changes were needed there.
- `ExplorePage.tsx` (985 lines) and `CreateEventModal.tsx` (739 lines) are
  large, stateful components deeply coupled to **local-only concepts that
  don't exist in `EventDto`**: full `EventOrganizer` objects (name, avatar,
  bio, `eventsHosted`, etc. — the API only has `organizerId`), invite-list
  mechanics (`inviteListIds`, `invitedMemberIds` — not in the contract at
  all yet), and demo organizer seed data.
- Refactoring these to consume the async API instead of the synchronous
  local store is a real UI refactor (loading states, error states, optimistic
  updates), not a mechanical swap — and this environment has no browser to
  visually verify a change of that size. Doing it blind risks regressing a
  working, shippable mobile UI for no immediate benefit, since
  `frontend/.env` doesn't set `VITE_API_URL` yet anyway (the app is still in
  mock mode).

**Recommended next step when you're ready:** do this as its own focused
pass, with the dev server running so changes can be checked in the browser
as they're made. Suggested approach:
1. Add an `organizerId → EventOrganizer` lookup that first checks the
   existing `ORGANIZER_BY_ID`/`getCurrentUserOrganizer()` map, then (for
   users the client doesn't already know about) fetches `GET /api/me`-style
   public profile data — this needs a small `GET /api/users/:id` endpoint
   that doesn't exist yet.
2. Decide where invite-list data lives: either keep it purely client-side
   for now (fine — it's not in the contract), or add it to the `events`
   table as a JSON column in a follow-up migration.
3. Convert `ExplorePage`'s event loading to `useQuery` (React Query is
   already installed but unused) wrapping `listEvents()`, with the existing
   `loadExploreEvents()` result as `initialData`/fallback.

---

## 4. Next steps (rest of Phase 2)

1. Frontend wiring above.
2. `posts` table + `GET/POST /api/posts`, `POST /api/posts/:id/like`.
3. R2 upload endpoint for event images / avatars.
4. Follow graph (`follows` table) + dab-ups endpoints.
