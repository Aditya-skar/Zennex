import {
  EVENT_ORGANIZERS,
  ME_AUTHOR_ID,
  ORGANIZER_BY_ID,
  getCurrentUserOrganizer,
  type EventOrganizer,
} from '../ExplorePage/exploreEvents';
import {
  getEventChats,
  appendEventChatMessage,
  EVENT_CHATS_CHANGED_EVENT,
} from '../common/eventChats';
import type { HomeFeedPost } from '../HomeFeed/homeFeed';

export const CHAT_STORE_CHANGED = 'zenex-chat-store-changed';
export const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👏', '🔥'] as const;

export type MessageKind = 'text' | 'post' | 'video' | 'image';

export type ChatReaction = {
  emoji: string;
  userId: string;
  userName: string;
};

export type SharedPostRef = {
  postId: string;
  caption: string;
  eventTitle: string;
  image?: string;
  videoUrl?: string;
  authorName: string;
  authorAvatar: string;
  postType: HomeFeedPost['type'];
};

export type ChatMessage = {
  id: string;
  authorId: string;
  authorName: string;
  sender: 'me' | 'other';
  kind: MessageKind;
  text?: string;
  sharedPost?: SharedPostRef;
  mediaUrl?: string;
  time: string;
  createdAt: number;
  reactions: ChatReaction[];
};

export type ChatMember = {
  id: string;
  name: string;
  avatar: string;
  role?: string;
};

export type ChatConversation = {
  id: string;
  type: 'dm' | 'group' | 'event';
  name: string;
  avatar: string;
  subtitle: string;
  online?: boolean;
  eventId?: string;
  adminId?: string;
  members: ChatMember[];
  messages: ChatMessage[];
  createdAt: number;
};

type StoredMessage = Omit<ChatMessage, 'sender' | 'time'>;

type StoredConversation = {
  id: string;
  type: 'dm' | 'group';
  name: string;
  avatar: string;
  subtitle: string;
  online?: boolean;
  adminId?: string;
  memberIds: string[];
  messages: StoredMessage[];
  createdAt: number;
};

const STORE_KEY = 'zenex-chat-store-v2';
const REACTIONS_KEY = 'zenex-chat-reactions-v1';

function formatTime(createdAt: number): string {
  const diff = Date.now() - createdAt;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function organizerToMember(org: EventOrganizer): ChatMember {
  return { id: org.id, name: org.name, avatar: org.avatar, role: org.role };
}

function meMember(): ChatMember {
  const me = getCurrentUserOrganizer();
  return { id: me.id, name: me.name, avatar: me.avatar, role: 'You' };
}

function loadStore(): StoredConversation[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return seedConversations();
    return parsed;
  } catch {
    return seedConversations();
  }
}

function saveStore(conversations: StoredConversation[]): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(conversations));
  window.dispatchEvent(new CustomEvent(CHAT_STORE_CHANGED));
}

function loadReactionOverlay(): Record<string, Record<string, ChatReaction[]>> {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveReactionOverlay(overlay: Record<string, Record<string, ChatReaction[]>>): void {
  localStorage.setItem(REACTIONS_KEY, JSON.stringify(overlay));
  window.dispatchEvent(new CustomEvent(CHAT_STORE_CHANGED));
}

function seedConversations(): StoredConversation[] {
  const rahul = EVENT_ORGANIZERS.find((o) => o.name.includes('Rahul')) ?? EVENT_ORGANIZERS[0];
  const neha = EVENT_ORGANIZERS.find((o) => o.name.includes('Neha')) ?? EVENT_ORGANIZERS[1];
  const aisha = EVENT_ORGANIZERS.find((o) => o.name.includes('Aisha')) ?? EVENT_ORGANIZERS[2];

  const now = Date.now();
  return [
    {
      id: 'dm-rahul',
      type: 'dm',
      name: rahul.name,
      avatar: rahul.avatar,
      subtitle: rahul.role,
      online: true,
      memberIds: [ME_AUTHOR_ID, rahul.id],
      createdAt: now - 86400000 * 3,
      messages: [
        {
          id: 'dm-rahul-1',
          authorId: rahul.id,
          authorName: rahul.name,
          kind: 'text',
          text: 'Hey, are you down for the cricket match this Sunday?',
          createdAt: now - 86400000,
          reactions: [],
        },
        {
          id: 'dm-rahul-2',
          authorId: ME_AUTHOR_ID,
          authorName: getCurrentUserOrganizer().name,
          kind: 'text',
          text: 'Yeah, definitely! What time does it start?',
          createdAt: now - 86400000 + 180000,
          reactions: [{ emoji: '👏', userId: rahul.id, userName: rahul.name }],
        },
        {
          id: 'dm-rahul-3',
          authorId: rahul.id,
          authorName: rahul.name,
          kind: 'text',
          text: 'We start at 9 AM in Gachibowli. See you there!',
          createdAt: now - 86400000 + 300000,
          reactions: [],
        },
      ],
    },
    {
      id: 'dm-neha',
      type: 'dm',
      name: neha.name,
      avatar: neha.avatar,
      subtitle: neha.role,
      online: true,
      memberIds: [ME_AUTHOR_ID, neha.id],
      createdAt: now - 86400000 * 5,
      messages: [
        {
          id: 'dm-neha-1',
          authorId: neha.id,
          authorName: neha.name,
          kind: 'text',
          text: 'Hi! Thanks for attending the open mic night!',
          createdAt: now - 86400000 * 2,
          reactions: [],
        },
        {
          id: 'dm-neha-2',
          authorId: ME_AUTHOR_ID,
          authorName: getCurrentUserOrganizer().name,
          kind: 'text',
          text: 'It was amazing! The performances were great.',
          createdAt: now - 86400000 * 2 + 120000,
          reactions: [{ emoji: '❤️', userId: neha.id, userName: neha.name }],
        },
      ],
    },
    {
      id: 'dm-aisha',
      type: 'dm',
      name: aisha.name,
      avatar: aisha.avatar,
      subtitle: aisha.role,
      online: false,
      memberIds: [ME_AUTHOR_ID, aisha.id],
      createdAt: now - 86400000 * 7,
      messages: [
        {
          id: 'dm-aisha-1',
          authorId: aisha.id,
          authorName: aisha.name,
          kind: 'text',
          text: 'Group yoga session is scheduled for Saturday morning.',
          createdAt: now - 86400000 * 3,
          reactions: [],
        },
      ],
    },
  ];
}

function hydrateMessage(msg: StoredMessage, reactionOverlay: ChatReaction[]): ChatMessage {
  const reactions = [...(msg.reactions ?? []), ...reactionOverlay];
  return {
    ...msg,
    reactions,
    sender: msg.authorId === ME_AUTHOR_ID ? 'me' : 'other',
    time: formatTime(msg.createdAt),
  };
}

function membersFromIds(ids: string[]): ChatMember[] {
  const unique = [...new Set(ids)];
  return unique.map((id) => {
    if (id === ME_AUTHOR_ID) return meMember();
    const org = EVENT_ORGANIZERS.find((o) => o.id === id);
    if (org) return organizerToMember(org);
    return { id, name: 'Member', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', role: 'Member' };
  });
}

function hydrateConversation(stored: StoredConversation): ChatConversation {
  const overlay = loadReactionOverlay()[stored.id] ?? {};
  return {
    id: stored.id,
    type: stored.type,
    name: stored.name,
    avatar: stored.avatar,
    subtitle: stored.subtitle,
    online: stored.online,
    adminId: stored.adminId,
    members: membersFromIds(stored.memberIds),
    createdAt: stored.createdAt,
    messages: stored.messages.map((m) => hydrateMessage(m, overlay[m.id] ?? [])),
  };
}

const EVENT_DEMO_MEMBERS = [
  { id: 'org-priya', name: 'Priya Reddy' },
  { id: 'org-arjun', name: 'Arjun Mehta' },
  { id: 'org-sneha', name: 'Sneha Kapoor' },
];

function eventChatToConversation(
  eventChat: ReturnType<typeof getEventChats>[number],
): ChatConversation {
  const overlay = loadReactionOverlay()[`event-${eventChat.eventId}`] ?? {};
  const hostMember: ChatMember = {
    id: 'event-host',
    name: eventChat.hostName,
    avatar: eventChat.avatar,
    role: 'Host',
  };
  const demoMembers = EVENT_DEMO_MEMBERS.map((m) => {
    const org = EVENT_ORGANIZERS.find((o) => o.id === m.id);
    return org
      ? organizerToMember(org)
      : { id: m.id, name: m.name, avatar: eventChat.avatar, role: 'Member' };
  });

  return {
    id: `event-${eventChat.eventId}`,
    type: 'event',
    name: eventChat.title,
    avatar: eventChat.avatar,
    subtitle: `Event group · hosted by ${eventChat.hostName}`,
    online: true,
    eventId: eventChat.eventId,
    adminId: 'event-host',
    members: [meMember(), hostMember, ...demoMembers],
    createdAt: eventChat.joinedAt,
    messages: eventChat.messages.map((msg) => {
      const authorId = msg.sender === 'me' ? ME_AUTHOR_ID : 'event-member';
      const stored: StoredMessage = {
        id: String(msg.id),
        authorId,
        authorName: msg.authorName ?? (msg.sender === 'me' ? getCurrentUserOrganizer().name : 'Member'),
        kind: 'text',
        text: msg.text,
        createdAt: Date.now(),
        reactions: overlay[String(msg.id)] ?? [],
      };
      return hydrateMessage(stored, []);
    }),
  };
}

export function getAllConversations(): ChatConversation[] {
  const stored = loadStore().map(hydrateConversation);
  const events = getEventChats().map(eventChatToConversation);
  return [...events, ...stored].sort((a, b) => {
    const aTime = a.messages[a.messages.length - 1]?.createdAt ?? a.createdAt;
    const bTime = b.messages[b.messages.length - 1]?.createdAt ?? b.createdAt;
    return bTime - aTime;
  });
}

export function getAvailableContacts(): ChatMember[] {
  const me = meMember();
  return [
    me,
    ...EVENT_ORGANIZERS.filter((o) => o.id !== ME_AUTHOR_ID).map(organizerToMember),
  ];
}

export function messagePreview(msg: ChatMessage): string {
  if (msg.kind === 'post') return `📎 ${msg.sharedPost?.eventTitle ?? 'Shared a post'}`;
  if (msg.kind === 'video') return '🎬 Shared a video';
  if (msg.kind === 'image') return '📷 Photo';
  return msg.text ?? '';
}

function updateStoredConversation(
  chatId: string,
  updater: (conv: StoredConversation) => StoredConversation,
): void {
  const store = loadStore();
  const idx = store.findIndex((c) => c.id === chatId);
  if (idx === -1) return;
  store[idx] = updater(store[idx]);
  saveStore(store);
}

function appendStoredMessage(chatId: string, message: StoredMessage): void {
  updateStoredConversation(chatId, (conv) => ({
    ...conv,
    messages: [...conv.messages, message],
  }));
}

export function sendTextMessage(chatId: string, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;

  if (chatId.startsWith('event-')) {
    const eventId = chatId.replace('event-', '');
    appendEventChatMessage(eventId, trimmed);
    return;
  }

  const me = getCurrentUserOrganizer();
  appendStoredMessage(chatId, {
    id: `${chatId}-${Date.now()}`,
    authorId: ME_AUTHOR_ID,
    authorName: me.name,
    kind: 'text',
    text: trimmed,
    createdAt: Date.now(),
    reactions: [],
  });
}

export function sendSharedPost(chatId: string, post: HomeFeedPost): void {
  if (chatId.startsWith('event-')) {
    const eventId = chatId.replace('event-', '');
    appendEventChatMessage(eventId, `📎 Shared: ${post.eventTitle} — ${post.caption.slice(0, 80)}`);
    return;
  }

  const me = getCurrentUserOrganizer();
  const author = ORGANIZER_BY_ID[post.authorId] ?? me;
  const ref: SharedPostRef = {
    postId: post.id,
    caption: post.caption,
    eventTitle: post.eventTitle,
    image: post.image,
    videoUrl: post.videoUrl,
    authorName: author.name,
    authorAvatar: author.avatar,
    postType: post.type,
  };

  appendStoredMessage(chatId, {
    id: `${chatId}-${Date.now()}`,
    authorId: ME_AUTHOR_ID,
    authorName: me.name,
    kind: 'post',
    sharedPost: ref,
    createdAt: Date.now(),
    reactions: [],
  });
}

export function sendVideoMessage(chatId: string, videoUrl: string, caption?: string): void {
  if (chatId.startsWith('event-')) {
    const eventId = chatId.replace('event-', '');
    appendEventChatMessage(eventId, caption ? `🎬 ${caption}` : '🎬 Shared a video');
    return;
  }

  const me = getCurrentUserOrganizer();
  appendStoredMessage(chatId, {
    id: `${chatId}-${Date.now()}`,
    authorId: ME_AUTHOR_ID,
    authorName: me.name,
    kind: 'video',
    mediaUrl: videoUrl,
    text: caption,
    createdAt: Date.now(),
    reactions: [],
  });
}

export function toggleReaction(chatId: string, messageId: string, emoji: string): void {
  const me = getCurrentUserOrganizer();

  if (chatId.startsWith('event-')) {
    const overlay = loadReactionOverlay();
    const key = chatId;
    const msgReactions = overlay[key]?.[messageId] ?? [];
    const existing = msgReactions.find((r) => r.userId === ME_AUTHOR_ID && r.emoji === emoji);
    if (existing) {
      overlay[key] = {
        ...overlay[key],
        [messageId]: msgReactions.filter((r) => !(r.userId === ME_AUTHOR_ID && r.emoji === emoji)),
      };
    } else {
      const withoutMine = msgReactions.filter((r) => r.userId !== ME_AUTHOR_ID);
      overlay[key] = {
        ...overlay[key],
        [messageId]: [...withoutMine, { emoji, userId: ME_AUTHOR_ID, userName: me.name }],
      };
    }
    saveReactionOverlay(overlay);
    return;
  }

  updateStoredConversation(chatId, (conv) => ({
    ...conv,
    messages: conv.messages.map((msg) => {
      if (msg.id !== messageId) return msg;
      const existing = msg.reactions.find((r) => r.userId === ME_AUTHOR_ID && r.emoji === emoji);
      if (existing) {
        return {
          ...msg,
          reactions: msg.reactions.filter((r) => !(r.userId === ME_AUTHOR_ID && r.emoji === emoji)),
        };
      }
      const withoutMine = msg.reactions.filter((r) => r.userId !== ME_AUTHOR_ID);
      return {
        ...msg,
        reactions: [...withoutMine, { emoji, userId: ME_AUTHOR_ID, userName: me.name }],
      };
    }),
  }));
}

export function createGroup(name: string, memberIds: string[]): ChatConversation | null {
  const trimmed = name.trim();
  if (!trimmed || memberIds.length === 0) return null;

  const me = getCurrentUserOrganizer();
  const allIds = [ME_AUTHOR_ID, ...memberIds.filter((id) => id !== ME_AUTHOR_ID)];
  const id = `group-${Date.now()}`;
  const members = membersFromIds(allIds);
  const avatar =
    members.find((m) => m.id !== ME_AUTHOR_ID)?.avatar ??
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150';

  const conv: StoredConversation = {
    id,
    type: 'group',
    name: trimmed,
    avatar,
    subtitle: `${members.length} members`,
    adminId: ME_AUTHOR_ID,
    memberIds: allIds,
    createdAt: Date.now(),
    messages: [
      {
        id: `${id}-welcome`,
        authorId: ME_AUTHOR_ID,
        authorName: me.name,
        kind: 'text',
        text: `Created group "${trimmed}". Say hi! 👋`,
        createdAt: Date.now(),
        reactions: [],
      },
    ],
  };

  saveStore([conv, ...loadStore()]);
  return hydrateConversation(conv);
}

export function addGroupMember(chatId: string, memberId: string): boolean {
  const conv = loadStore().find((c) => c.id === chatId);
  if (!conv || conv.type !== 'group' || conv.adminId !== ME_AUTHOR_ID) return false;
  if (conv.memberIds.includes(memberId)) return false;

  const member = EVENT_ORGANIZERS.find((o) => o.id === memberId);
  if (!member) return false;

  updateStoredConversation(chatId, (c) => ({
    ...c,
    memberIds: [...c.memberIds, memberId],
    subtitle: `${c.memberIds.length + 1} members`,
    messages: [
      ...c.messages,
      {
        id: `${chatId}-sys-${Date.now()}`,
        authorId: ME_AUTHOR_ID,
        authorName: getCurrentUserOrganizer().name,
        kind: 'text',
        text: `Added ${member.name} to the group`,
        createdAt: Date.now(),
        reactions: [],
      },
    ],
  }));
  return true;
}

export function removeGroupMember(chatId: string, memberId: string): boolean {
  const conv = loadStore().find((c) => c.id === chatId);
  if (!conv || conv.type !== 'group' || conv.adminId !== ME_AUTHOR_ID) return false;
  if (memberId === ME_AUTHOR_ID) return false;
  if (!conv.memberIds.includes(memberId)) return false;

  const member = EVENT_ORGANIZERS.find((o) => o.id === memberId);

  updateStoredConversation(chatId, (c) => ({
    ...c,
    memberIds: c.memberIds.filter((id) => id !== memberId),
    subtitle: `${c.memberIds.length - 1} members`,
    messages: [
      ...c.messages,
      {
        id: `${chatId}-sys-${Date.now()}`,
        authorId: ME_AUTHOR_ID,
        authorName: getCurrentUserOrganizer().name,
        kind: 'text',
        text: `Removed ${member?.name ?? 'member'} from the group`,
        createdAt: Date.now(),
        reactions: [],
      },
    ],
  }));
  return true;
}

export function isGroupAdmin(chat: ChatConversation): boolean {
  return chat.adminId === ME_AUTHOR_ID;
}

export function subscribeChatStore(onChange: () => void): () => void {
  const handler = () => onChange();
  window.addEventListener(CHAT_STORE_CHANGED, handler);
  window.addEventListener(EVENT_CHATS_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener(CHAT_STORE_CHANGED, handler);
    window.removeEventListener(EVENT_CHATS_CHANGED_EVENT, handler);
  };
}

/** Sample videos users can share in chat */
export const SAMPLE_VIDEOS = [
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    label: 'Workout clip',
  },
  {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    label: 'Event highlight',
  },
];
