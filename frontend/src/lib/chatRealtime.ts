/**
 * Live delivery for the Chat Phase — one Supabase Realtime channel per open
 * DM/group conversation, combining:
 *  - `postgres_changes` on `messages` (new messages pushed to other clients)
 *  - `presence` (who's currently got this conversation open → "online" dot)
 *  - `broadcast` (typing indicator — ephemeral, not persisted)
 *
 * Reactions are NOT pushed live here (message_reactions has no
 * conversation_id column to filter on server-side, and it's a small enough
 * UX gap to accept for v1 — see backend/CHAT_SETUP.md): the reacting client
 * updates its own view immediately from the REST response, other clients
 * pick it up next time they re-open/re-fetch the conversation.
 *
 * No-ops everywhere if Supabase isn't configured (mock/demo mode, or the
 * backend user hasn't set up a Supabase project yet).
 */
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { getSupabaseClient, isRealtimeConfigured } from './supabaseClient';

export type ChatPresenceState = {
  onlineUserIds: string[];
  typingUserIds: string[];
};

export type ConversationRealtimeHandlers = {
  onMessageInsert: (row: Record<string, unknown>) => void;
  onPresenceChange?: (state: ChatPresenceState) => void;
};

type ActiveChannel = {
  channel: ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']>;
  typingTimers: Map<string, number>;
};

const active = new Map<string, ActiveChannel>();

const TYPING_TIMEOUT_MS = 4000;

/** Opens (or re-opens) the realtime channel for a conversation. Returns an
 * unsubscribe function — always call it when the conversation is closed /
 * the component unmounts to avoid leaking open sockets. */
export function subscribeToConversation(
  conversationId: string,
  myId: string,
  myName: string,
  handlers: ConversationRealtimeHandlers,
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase || !isRealtimeConfigured()) return () => {};

  unsubscribeFromConversation(conversationId);

  const channel = supabase.channel(`chat:${conversationId}`, {
    config: { presence: { key: myId } },
  });
  const typingTimers = new Map<string, number>();

  const emitPresence = () => {
    if (!handlers.onPresenceChange) return;
    const state = channel.presenceState<{ userId: string }>();
    const onlineUserIds = Object.values(state)
      .flat()
      .map((p) => p.userId)
      .filter((id) => id !== myId);
    handlers.onPresenceChange({ onlineUserIds, typingUserIds: [...typingTimers.keys()] });
  };

  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
    (payload: RealtimePostgresInsertPayload<Record<string, unknown>>) => handlers.onMessageInsert(payload.new),
  );

  channel.on('presence', { event: 'sync' }, emitPresence);
  channel.on('presence', { event: 'join' }, emitPresence);
  channel.on('presence', { event: 'leave' }, emitPresence);

  channel.on('broadcast', { event: 'typing' }, (payload) => {
    const senderId = (payload.payload as { userId?: string } | undefined)?.userId;
    if (!senderId || senderId === myId) return;
    const existing = typingTimers.get(senderId);
    if (existing) window.clearTimeout(existing);
    typingTimers.set(
      senderId,
      window.setTimeout(() => {
        typingTimers.delete(senderId);
        emitPresence();
      }, TYPING_TIMEOUT_MS),
    );
    emitPresence();
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      void channel.track({ userId: myId, name: myName });
    }
  });

  active.set(conversationId, { channel, typingTimers });
  return () => unsubscribeFromConversation(conversationId);
}

export function unsubscribeFromConversation(conversationId: string): void {
  const entry = active.get(conversationId);
  if (!entry) return;
  for (const timer of entry.typingTimers.values()) window.clearTimeout(timer);
  const supabase = getSupabaseClient();
  supabase?.removeChannel(entry.channel);
  active.delete(conversationId);
}

/** Broadcasts a "typing" ping on an already-open conversation channel.
 * No-op if the conversation isn't currently subscribed (e.g. realtime is
 * unconfigured) — callers don't need to check first. */
export function broadcastTyping(conversationId: string, myId: string): void {
  const entry = active.get(conversationId);
  if (!entry) return;
  void entry.channel.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } });
}
