# SIMSOR Backend

The mobile/web app talks to this API when `VITE_API_URL` is set in `frontend/.env`.

Until then the app runs on **local mocks** — no backend required.

**Phase 1 (real Postgres/SQLite-backed auth + profile) and the events part of
Phase 2 are implemented and verified.** See [PHASE1.md](./PHASE1.md) and
[PHASE2.md](./PHASE2.md) for full details on what was built, why, and what's
next.

## Deploy (Phase 1 — production foundation)

Hosted Postgres + R2 + HTTPS API for store builds: **[DEPLOY_PHASE1.md](./DEPLOY_PHASE1.md)**.

Check readiness: `python scripts/check_deploy_ready.py --production`

## Quick start

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Defaults use a local SQLite file (`backend/simsor.db`, auto-created) — no
Postgres install needed for dev. Then in `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Restart the Vite / Capacitor app. Auth and profile now hit this API instead of mocks.

### Switching to real Postgres (Neon/Supabase)

Set `DATABASE_URL` in `backend/.env` (see `.env.example`), then run:

```bash
alembic upgrade head
```

## Contract

See [API_CONTRACT.md](./API_CONTRACT.md) — keep backend responses aligned with `frontend/src/api/types.ts`.

## App integration points

| Feature | Frontend module | Route |
|---------|-----------------|-------|
| Login / signup | `frontend/src/api/auth.ts` | `/api/auth/*` |
| Profile | `frontend/src/api/profileApi.ts` | `/api/me` |
| Events | `frontend/src/api/eventsApi.ts` | `/api/events` |
| Dab ups / chat | `frontend/src/api/socialApi.ts` | `/api/dab-ups`, `/api/conversations` |
