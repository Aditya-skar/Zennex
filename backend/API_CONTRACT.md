# SIMSOR API Contract

Base URL: value of `VITE_API_URL` (no trailing slash).

Auth: `Authorization: Bearer <token>` on protected routes.

All JSON. Mirror types in `frontend/src/api/types.ts`.

---

## Health

`GET /api/health` → `{ "ok": true }`

---

## Auth

### `POST /api/auth/login`

Body:
```json
{ "username": "admin", "password": "••••" }
```

Response `200`:
```json
{
  "token": "jwt-or-session-token",
  "user": {
    "id": "usr_1",
    "username": "admin",
    "fullName": "Admin User",
    "bio": "",
    "location": "Hyderabad, India",
    "avatarUrl": "https://…",
    "sports": ["Cricket", "Football"],
    "entertainment": ["Music"]
  }
}
```

### `POST /api/auth/signup`

Body: `{ "username", "password", "fullName", "email?" }`  
Response: same as login.

### `POST /api/auth/logout`

Protected. Response: `{ "ok": true }`

---

## Profile

### `GET /api/me` → `UserProfile`

### `PATCH /api/me`

Body: any subset of `UserProfile` fields.  
Response: full `UserProfile`.

---

## Events

### `GET /api/events?lat=&lng=&radiusKm=&mainCategory=`

Response: `EventDto[]`

### `POST /api/events`

Body: event fields without `id`.  
Response: created `EventDto`.

### `DELETE /api/events/:id`

Response: `{ "ok": true }`

`EventDto` fields: `id`, `title`, `category`, `mainCategory` (`Sports`|`Entertainment`), `date`, `time`, `venue`, `location`, `description`, `coordinates` `[lat,lng]`, `attendees`, `image`, `organizerId`, `gameAccess?`.

---

## Social

### `POST /api/dab-ups/request` `{ "userId" }` → `{ "status": "pending" }`

### `GET /api/dab-ups/:userId` → `{ "status": "none"|"pending"|"dabbed_up" }`

### `GET /api/conversations` → `ConversationPreview[]`

### `GET /api/conversations/:id/messages` → message list (define when chat backend starts)

---

## Errors

```json
{ "detail": "Human readable message" }
```

Use `401` for auth failures (app clears token).
