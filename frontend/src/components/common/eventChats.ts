export type EventChatMessage = {
  id: number;
  sender: 'me' | 'other';
  text: string;
  time: string;
};

export type EventGroupChat = {
  eventId: string;
  title: string;
  category: string;
  avatar: string;
  hostName: string;
  joinedAt: number;
  messages: EventChatMessage[];
};

const EVENT_CHATS_KEY = 'zenex-event-chats-v1';
export const EVENT_CHATS_CHANGED_EVENT = 'zenex-event-chats-changed';

function nowLabel(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getEventChats(): EventGroupChat[] {
  try {
    const raw = localStorage.getItem(EVENT_CHATS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as EventGroupChat[]) : [];
  } catch {
    return [];
  }
}

function save(chats: EventGroupChat[]): void {
  localStorage.setItem(EVENT_CHATS_KEY, JSON.stringify(chats));
  window.dispatchEvent(new CustomEvent(EVENT_CHATS_CHANGED_EVENT));
}

export function hasEventChat(eventId: string): boolean {
  return getEventChats().some((c) => c.eventId === eventId);
}

type EnsureInput = {
  eventId: string;
  title: string;
  category: string;
  avatar: string;
  hostName: string;
};

/**
 * Create the temporary group chat for an event the user just joined.
 * No-op if it already exists (keeps existing messages).
 */
export function ensureEventChat(input: EnsureInput): void {
  const chats = getEventChats();
  if (chats.some((c) => c.eventId === input.eventId)) return;

  const chat: EventGroupChat = {
    eventId: input.eventId,
    title: input.title,
    category: input.category,
    avatar: input.avatar,
    hostName: input.hostName,
    joinedAt: Date.now(),
    messages: [
      {
        id: 1,
        sender: 'other',
        text: `Welcome to the ${input.title} group chat! 🎉 You're in — say hi to everyone joining.`,
        time: nowLabel(),
      },
    ],
  };

  // Newest joined chat first.
  save([chat, ...chats]);
}

/** Remove the group chat when the user leaves the event. */
export function removeEventChat(eventId: string): void {
  const chats = getEventChats();
  const next = chats.filter((c) => c.eventId !== eventId);
  if (next.length !== chats.length) save(next);
}

export function appendEventChatMessage(eventId: string, text: string): void {
  const chats = getEventChats();
  let changed = false;
  const next = chats.map((c) => {
    if (c.eventId !== eventId) return c;
    changed = true;
    return {
      ...c,
      messages: [
        ...c.messages,
        {
          id: c.messages.length + 1,
          sender: 'me' as const,
          text,
          time: nowLabel(),
        },
      ],
    };
  });
  if (changed) save(next);
}
