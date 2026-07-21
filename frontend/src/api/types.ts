/**
 * Shared API / domain types for SIMSOR.
 * Backend should return JSON matching these shapes.
 */

export type MainCategory = 'Sports' | 'Entertainment';

export type UserProfile = {
  id: string;
  username: string;
  fullName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  sports: string[];
  entertainment: string[];
};

export type AuthSession = {
  token: string;
  user: UserProfile;
};

export type EventDto = {
  id: string;
  title: string;
  category: string;
  mainCategory: MainCategory;
  date: string;
  time: string;
  venue: string;
  location: string;
  description: string;
  coordinates: [number, number];
  attendees: number;
  image: string;
  organizerId: string;
  gameAccess?: 'public' | 'invite';
};

export type DabUpStatus = 'none' | 'pending' | 'dabbed_up';

export type ConversationPreview = {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  lastMessage: string;
  updatedAt: string;
  unread: number;
};

/** Canonical REST paths the backend should implement. */
export const API_ROUTES = {
  health: '/api/health',
  login: '/api/auth/login',
  signup: '/api/auth/signup',
  logout: '/api/auth/logout',
  me: '/api/me',
  updateMe: '/api/me',
  events: '/api/events',
  eventById: (id: string) => `/api/events/${id}`,
  dabUps: '/api/dab-ups',
  dabUpRequest: '/api/dab-ups/request',
  conversations: '/api/conversations',
  messages: (conversationId: string) => `/api/conversations/${conversationId}/messages`,
} as const;
