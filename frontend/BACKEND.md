# Backend readiness for the SIMSOR frontend

## Mode switch

| `VITE_API_URL` | App behavior |
|----------------|--------------|
| empty / unset | **Mocks** (localStorage) — current default |
| set (e.g. `http://localhost:8000`) | **Live API** via Axios |

## Frontend modules (use these)

```
frontend/src/api/
  index.ts        ← import from here
  client.ts       ← Axios + Bearer token
  types.ts        ← DTOs + route constants
  auth.ts         ← login / signup / logout
  profileApi.ts   ← get/save profile
  eventsApi.ts    ← list/create/delete events
  socialApi.ts    ← dab ups / conversations
```

Example:

```ts
import { loginWithPassword, saveProfile, isBackendEnabled } from '../api';
```

## Already wired to the service layer

- Login / signup
- Logout
- Edit profile save
- Auth gate in `App.tsx`

Other screens still use local stores; migrate them to `api/*` as you implement each backend route.

## Backend stub

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Contract: `backend/API_CONTRACT.md`
