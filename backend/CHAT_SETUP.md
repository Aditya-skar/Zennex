# Chat Setup — Supabase Realtime

Status: **backend + frontend code complete and verified against local
SQLite** (REST CRUD, auth, RLS-shaped queries, dedupe, soft-delete, group
membership — see the "Verified" table below). The one thing that can't be
verified from here is the actual live push over Supabase Realtime and
presence/typing, since that needs a real Supabase Postgres project with
logical replication enabled. This doc is the checklist to set that project up
and the manual test to run once it's live.

Until you do this, chat still works — DMs/groups just won't get instant
live updates in a second open tab/device without a manual refresh, and
online/typing indicators won't appear. Everything else (REST send/receive,
history, reactions, pins/mutes) works over plain HTTP regardless.

---

## Why Supabase

- Free tier Postgres with logical replication already turned on, so
  `postgres_changes` (row inserts streamed to websocket subscribers) works
  out of the box — no separate WebSocket server to run or pay for.
- We don't use Supabase Auth. Your existing FastAPI JWT login is reused as-is
  (see "Auth bridge" below) — there's no second signup/login flow, no
  Supabase user table, nothing for end users to notice.

## What moves to Supabase vs. what stays as-is

| Piece | Where |
|---|---|
| All tables (users, events, posts, chat, etc.) | Supabase **Postgres** (`DATABASE_URL`) |
| Writes (send message, create conversation, ...) | Still your **FastAPI backend** — Supabase is just the database underneath it |
| Live delivery of new messages to open chats | **Supabase Realtime** (`postgres_changes` over websocket) |
| Presence (online dot) / typing indicator | **Supabase Realtime Presence + Broadcast** |
| Login/signup/password/JWT issuing | **Unchanged** — still `backend/app/routers/auth.py` |

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier is
   enough to start).
2. Pick a region close to wherever the backend will run, set a database
   password (you won't need to remember it — it's embedded in the connection
   string you copy in step 2).
3. Wait for provisioning to finish (~2 minutes).

## 2. Point the backend at Supabase Postgres

Project → **Settings → Database → Connection string** → copy the **URI**
(direct connection, not the pooler one) tab. It looks like:

```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

Convert the scheme for our async driver and put it in `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

(If your project enforces SSL — most do — `asyncpg` negotiates it
automatically against Supabase; no extra query params needed.)

## 3. Bridge your existing JWTs into Supabase's auth

Project → **Settings → API → JWT Settings** → copy the **JWT Secret**.

```env
# backend/.env
JWT_SECRET=<paste the Supabase JWT secret here>
```

This is the only auth change. `create_access_token`
(`backend/app/security.py`) already adds `role: "authenticated"` and
`aud: "authenticated"` to every token it issues — once the token is *signed*
with Supabase's own secret, Supabase's Realtime server verifies the
signature and treats the connection as the `authenticated` Postgres role,
which is exactly what the RLS policies below check against. **No separate
Supabase Auth signup/login and no new user table** — your existing
`/api/auth/login` and `/api/auth/signup` are untouched.

⚠️ Rotating `JWT_SECRET` invalidates every previously-issued token —
existing logged-in users will need to log in again after you deploy this.

## 4. Give the frontend the Realtime connection details

Project → **Settings → API** → copy the **Project URL** and the **anon
public** key.

```env
# frontend/.env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon public key>
```

The anon key is safe to ship to the client — it has no privileges on its
own; every table it can touch is gated by the RLS policies from step 5.
Leaving these two blank keeps chat fully working over REST, just without
live push/presence (see `frontend/src/lib/supabaseClient.ts`, `isRealtimeConfigured()`).

## 5. Run the migration against Supabase

```bash
cd backend
.venv\Scripts\activate        # Windows — or source .venv/bin/activate
alembic upgrade head
```

Migration `0008_create_chat_tables.py` creates the four chat tables
(`conversations`, `conversation_members`, `messages`, `message_reactions`)
and, when it detects it's running against Postgres, also:

- Runs `ALTER PUBLICATION supabase_realtime ADD TABLE messages,
  conversation_members, message_reactions;` so Supabase streams inserts on
  those three tables to subscribed clients.
- Enables **Row Level Security** on all four chat tables and adds `SELECT`
  policies scoped to conversation membership (read the policy SQL directly
  in the migration file if you want the exact predicates). These only gate
  what the **browser's Realtime websocket** can see (connected as
  `authenticated` via the bridged JWT) — your FastAPI backend connects with
  the full Postgres role via `DATABASE_URL` and bypasses RLS entirely for
  all normal reads/writes, same as before.

### If the `ALTER PUBLICATION` step doesn't take

Some Supabase plans/roles don't allow altering `supabase_realtime` from a
plain migration connection. The migration swallows that specific error so
the rest of the migration still succeeds — check whether it worked, and fix
it manually if not:

1. Dashboard → **Database → Replication**.
2. Under the `supabase_realtime` publication, confirm `messages`,
   `conversation_members`, and `message_reactions` are toggled **on**. If
   any are missing, toggle them on by hand.

### If you're starting from scratch (no existing users/data)

Just run the migration — nothing else to do. If you already have real
users, they were created in your old (SQLite/other) database, so plan an
export/import if you need to keep them; that's outside the scope of this
chat setup.

## 6. (Optional) Re-seed demo data

```bash
python seed_demo_events.py
```

Re-run against the new `DATABASE_URL` if you want the demo events/posts to
exist in the Supabase project too. Chat conversations are created by users
through the app, not by the seed script, so there's nothing chat-specific to
seed.

---

## 7. Manual test once your project is live

REST behavior (send/receive/history/reactions/pins/mutes/group membership)
was already verified end-to-end against local SQLite and doesn't depend on
Supabase at all — see the table below. The one thing that genuinely needs
your live project + two browser sessions to confirm:

1. Deploy/run the backend with the new `DATABASE_URL` + `JWT_SECRET`, and the
   frontend with the new `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
2. Log in as **User A** in one browser (or a normal + incognito window) and
   **User B** in another. Have them already be in a DM together (send one
   message from either side first via the UI, which creates the
   conversation if it doesn't exist).
3. Open the same conversation in both windows.
4. Send a message as User A → it should appear in User B's window
   **without a refresh**, within a second or two.
5. Start typing as User A (don't send) → User B's window should show a
   "Typing…" indicator under the conversation title, which disappears a few
   seconds after A stops.
6. Check the online dot: with both users' chat windows open, each should
   show the other as online; closing B's tab should eventually flip A's view
   of B to offline.

If step 4 doesn't work but everything else does, it's almost always the
`ALTER PUBLICATION` step from §5 — check Database → Replication first.

---

## Verified without a Supabase project (local SQLite fallback)

All REST behavior below is driver-agnostic (same models/routers run against
SQLite or Postgres) and was smoke-tested end-to-end locally:

| Check | Result |
|---|---|
| `POST /api/conversations` (dm) | Creates a conversation; calling it again with the same two users returns the *same* conversation (dedupe) |
| `POST /api/conversations` (group) | Creates a group with the given members + name |
| `GET /api/conversations` | Lists the caller's conversations, hydrated with last message, unread count, pin/mute/hidden flags |
| `GET /api/conversations/:id/messages` | Paginated history, newest-first |
| `POST /api/conversations/:id/messages` | Sends text / image / video / shared-post messages; 403s for non-members |
| `PATCH /api/conversations/:id/read` | Clears unread count for the caller |
| `PATCH /api/conversations/:id/prefs` | Persists pinned/muted/hidden per-user |
| `DELETE /api/conversations/:id` | Soft-deletes (hides) only for the caller, not the other participant |
| `POST /api/messages/:id/reactions` | Toggles a reaction (add → change emoji → remove) |
| `GET /api/users` | Lists/searches users for the "New chat" contact picker, excludes self |
| `POST /api/conversations/:id/members` | Admin-only; adds a member to a group |
| `DELETE /api/conversations/:id/members/:userId` | Admin-only; removes a member (can't remove self) |
| JWT with `role`/`aud` claims | Decodes fine via `decode_access_token`; doesn't break existing auth |

---

## Rollback

Chat degrades gracefully at every layer if you want to back out:

- Leave `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` empty → frontend never
  opens a Realtime connection; DMs/groups keep working over REST only.
- Leave `VITE_API_URL` empty (demo mode) → chat is 100% local `localStorage`
  again, same as before this phase, no backend/Supabase involved at all.
- `alembic downgrade -1` from head drops the four chat tables and reverses
  the publication/RLS changes if you need to fully undo migration `0008`.
