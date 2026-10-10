# Phase 3 — Trust & safety (store-ready auth extras)

Status: **implemented in API** (2026-10-10). Wire frontend screens when ready.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `DELETE` | `/api/me` | Bearer | Hard-delete account + owned content |
| `POST` | `/api/auth/forgot-password` | no | Email a reset token (`{ "email" }`) |
| `POST` | `/api/auth/reset-password` | no | `{ "token", "newPassword" }` |
| `POST` | `/api/auth/change-password` | Bearer | `{ "currentPassword", "newPassword" }` |
| `POST` | `/api/reports` | Bearer | Report user/post/message/event |
| `POST` | `/api/blocks/:userId` | Bearer | Block user |
| `DELETE` | `/api/blocks/:userId` | Bearer | Unblock |
| `GET` | `/api/blocks/mine` | Bearer | List blocked user ids |
| `GET` | `/api/blocks/:userId` | Bearer | `{ "blocked": true/false }` |

Rate limits (in-memory): login/signup/forgot/reset/uploads.

## Email

Set `RESEND_API_KEY` + `EMAIL_FROM` in `backend/.env` for real mail.  
Without Resend, forgot-password **logs** the token and returns `resetToken` in **development** only.

## Migration

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Creates `password_resets`, `user_blocks`, `user_reports` (`0009`).
