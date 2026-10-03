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

---

## Users

### `GET /api/users?q=&limit=` → `PublicUserProfile[]`

Directory for starting a chat, excludes the caller. `q` matches username or full name (case-insensitive substring).

### `GET /api/users/:id/public` → `PublicUserProfile`

`PublicUserProfile`: `id`, `username`, `fullName`, `avatarUrl`, `bio`, `location`, `eventsHosted`.

---

## Chat (Chat Phase — DM + group only)

Event group chats and communities are NOT part of this API; they stay client-side (`eventChats.ts` / `communitiesStore.ts`). New messages/prefs are also pushed live over Supabase Realtime (`postgres_changes` on `messages`/`conversation_members`/`message_reactions`) — see `backend/CHAT_SETUP.md`. This section only covers the REST surface.

### `GET /api/conversations` → `ConversationDto[]`

The caller's DMs + groups (excludes ones they've soft-deleted), pinned first then by last activity.

### `POST /api/conversations`

Body: `{ "type": "dm"|"group", "memberIds": string[], "name"?: string }` (`name` required for `group`; `memberIds` must have exactly one id for `dm`). Creating a `dm` that already exists between the same two users returns the existing conversation instead of a duplicate. Response: `ConversationDto`.

### `GET /api/conversations/:id/messages?before=&limit=` → `MessageDto[]`

Oldest-first. `before` (ISO datetime) paginates further back; `limit` defaults to 50, max 100. 404 if the caller isn't a member.

### `POST /api/conversations/:id/messages`

Body: `{ "kind": "text"|"image"|"video"|"post", "text"?, "mediaUrl"?, "sharedPostId"? }`. Response: `MessageDto`.

### `POST /api/conversations/:id/members` `{ "userId" }` → `ConversationDto`

Group admin only.

### `DELETE /api/conversations/:id/members/:userId` → `{ "ok": true }`

Group admin only; an admin can't remove themselves.

### `PATCH /api/conversations/:id/read` → `{ "ok": true }`

### `PATCH /api/conversations/:id/prefs`

Body: any subset of `{ "pinned", "muted", "hidden" }` (booleans). Response: `{ "ok": true, "pinned", "muted", "hidden" }`.

### `DELETE /api/conversations/:id` → `{ "ok": true }`

Soft-delete: hides the conversation for the caller only, never for other members.

### `POST /api/messages/:id/reactions` `{ "emoji" }` → `ChatReactionDto[]`

Toggles: reacting with the same emoji you already used removes it; a different emoji replaces it (one reaction per user per message). Returns the message's full reaction list.

`ConversationDto`: `id`, `type`, `name`, `avatarUrl`, `adminId?`, `members: ChatMemberDto[]`, `lastMessage?: MessageDto`, `unread`, `pinned`, `muted`, `createdAt`, `updatedAt`.
`ChatMemberDto`: `id`, `name`, `avatarUrl`, `role` (`admin`|`member`).
`MessageDto`: `id`, `conversationId`, `authorId`, `kind`, `text?`, `mediaUrl?`, `sharedPost?`, `reactions: ChatReactionDto[]`, `createdAt`.
`ChatReactionDto`: `emoji`, `userId`, `userName`.

---

## Errors

```json
{ "detail": "Human readable message" }
```

Use `401` for auth failures (app clears token).
