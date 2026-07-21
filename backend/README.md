# SIMSOR Backend

The mobile/web app talks to this API when `VITE_API_URL` is set in `frontend/.env`.

Until then the app runs on **local mocks** — no backend required.

## Quick start (when you begin backend work)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Then in `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Restart the Vite / Capacitor app. Auth, profile, and events will hit this API instead of mocks.

## Contract

See [API_CONTRACT.md](./API_CONTRACT.md) — keep backend responses aligned with `frontend/src/api/types.ts`.

## App integration points

| Feature | Frontend module | Route |
|---------|-----------------|-------|
| Login / signup | `frontend/src/api/auth.ts` | `/api/auth/*` |
| Profile | `frontend/src/api/profileApi.ts` | `/api/me` |
| Events | `frontend/src/api/eventsApi.ts` | `/api/events` |
| Dab ups / chat | `frontend/src/api/socialApi.ts` | `/api/dab-ups`, `/api/conversations` |
