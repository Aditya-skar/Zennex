# Deploy Phase 1 — Production foundation

Status checklist for hosted HTTPS API + Postgres + R2. Code in this repo is ready;
you fill in cloud accounts (free tiers are enough for beta).

## What Phase 1 delivers

- Postgres (Supabase or Neon) instead of SQLite
- Durable media on Cloudflare R2
- API on HTTPS for Android/iOS store builds
- Safe production startup (refuses dev secrets / SQLite / missing R2)

## Step-by-step

### 1. Supabase Postgres (recommended: same project for Phase 2 chat Realtime)

1. [supabase.com](https://supabase.com) → New project.
2. **Settings → Database → Connection string → URI** (direct, not pooler).
3. Convert to async driver and add to host secrets:

   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
   ```

4. From your machine (with that URL in a temporary env or `.env`):

   ```bash
   cd backend
   .venv\Scripts\activate
   alembic upgrade head
   ```

### 2. JWT secret

```bash
python scripts/generate_jwt_secret.py
```

Set `JWT_SECRET` on the host. **Keep using this same value** when you wire Supabase Realtime in Phase 2 (or replace with Supabase’s JWT secret then — see `CHAT_SETUP.md`).

### 3. Cloudflare R2

1. Cloudflare dashboard → R2 → Create bucket.
2. Create API token with read/write on that bucket.
3. Enable public access (r2.dev subdomain or custom domain).
4. Set all five vars (see `.env.production.example`):

   `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL_BASE`

### 4. CORS

```env
ENVIRONMENT=production
CORS_ORIGINS=https://your-marketing-site.com
```

Capacitor native origins are still allowed via regex in `app/main.py`.

### 5. Deploy the API

**Option A — Docker (any host)**

```bash
cd backend
docker build -t simsor-api .
docker run --env-file .env.production -p 8000:8000 simsor-api
```

**Option B — Render / Railway / Fly**

- Root directory: `backend`
- Build: Docker or `pip install -r requirements.txt`
- Start: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Attach env vars from `.env.production.example`

Map a hostname with TLS, e.g. `https://api.yourdomain.com`.

### 6. Point mobile builds at prod

In `frontend/.env` **before** `npm run build:mobile` / `release:sync`:

```env
VITE_API_URL=https://api.yourdomain.com
```

Rebuild native projects. Never ship a dead trycloudflare URL in store builds.

### 7. Verify

```bash
curl https://api.yourdomain.com/api/health
python scripts/check_deploy_ready.py --production   # locally, with prod .env
```

Manual: signup → login → upload avatar → create event with photo → confirm image URL is `https://…r2.dev/…`.

## Readiness script

```bash
cd backend
python scripts/check_deploy_ready.py              # local dev
python scripts/check_deploy_ready.py --production # same rules as ENVIRONMENT=production
```

## Phase 1 exit criteria

- [ ] `ENVIRONMENT=production` API running on HTTPS
- [ ] Postgres via `alembic upgrade head` (all 8 migrations)
- [ ] R2 URLs on uploads
- [ ] Strong `JWT_SECRET`, `CORS_ORIGINS` not `*`
- [ ] `VITE_API_URL` in release mobile builds

Next: **Phase 2** — Supabase Realtime keys on frontend + JWT bridge (`CHAT_SETUP.md`).
