/**
 * Supabase Realtime client — live chat delivery only (Chat Phase).
 *
 * We do NOT use Supabase Auth: the app keeps its own JWT login
 * (see backend/app/security.py). `syncRealtimeAuth` bridges that token into
 * Supabase Realtime so Row Level Security on the chat tables can evaluate
 * `request.jwt.claims` (see backend/alembic/versions/0008_create_chat_tables.py
 * and backend/CHAT_SETUP.md) — this only works once `JWT_SECRET` on the
 * backend is set to the Supabase project's own JWT secret.
 *
 * Safe to import in mock/demo mode: `getSupabaseClient()` returns null when
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY aren't set, and every caller in
 * this codebase is expected to handle that (no realtime, no crash).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export function isRealtimeConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let client: SupabaseClient | null = null;

/** Returns the singleton Supabase client, or null if unconfigured. */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isRealtimeConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
  }
  return client;
}

/**
 * Bridges our own access token into Supabase Realtime's auth so RLS on the
 * chat tables can identify the caller. Call this:
 *  - right after a successful login/signup (with the new token)
 *  - once on app boot if a token is already stored
 *  - with `null` on logout
 * No-op in mock/demo mode or if Supabase env vars aren't set.
 */
export function syncRealtimeAuth(token: string | null): void {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  void supabase.realtime.setAuth(token ?? undefined).catch(() => {
    /* best-effort — a failed handshake just means no live updates until the next sync */
  });
}
