import {
  appendExploreEvent,
  type ExploreEvent,
  type GameAccess,
} from '../ExplorePage/exploreEvents';
import {
  type HomeFeedPost,
  type HomeMainCategory,
  type HomePostType,
  type RegistrationType,
  ME_AUTHOR_ID,
} from './homeFeed';

const USER_POSTS_KEY = 'zenex-user-posts-v1';
export const USER_POSTS_CHANGED_EVENT = 'zenex-user-posts-changed';

export type CreateMedia = { type: 'image' | 'video'; url: string } | null;

/** Raw payload emitted by the Create Event modal. */
export type CreateEventPayload = {
  id: string;
  title: string;
  category: string;
  mainCategory: HomeMainCategory;
  gameAccess: GameAccess;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  venue: string;
  location: string;
  description: string;
  coordinates: [number, number];
  attendees: number;
  image: string; // category cover for the map event
  media?: CreateMedia;
  registrationType?: RegistrationType;
  slotsTotal?: number;
  registrationDeadline?: string; // yyyy-mm-ddTHH:mm (local)
};

/* ---------- User post storage ---------- */

export function loadUserPosts(): HomeFeedPost[] {
  try {
    const raw = localStorage.getItem(USER_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HomeFeedPost[]) : [];
  } catch {
    return [];
  }
}

export function addUserPost(post: HomeFeedPost): void {
  const next = [post, ...loadUserPosts()];
  localStorage.setItem(USER_POSTS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(USER_POSTS_CHANGED_EVENT));
}

/* ---------- Join / RSVP tracking (current user) ---------- */

const JOINED_KEY = 'zenex-joined-v1';

function getJoined(): string[] {
  try {
    const raw = localStorage.getItem(JOINED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function isJoined(postId: string): boolean {
  return getJoined().includes(postId);
}

/** Join / leave an event; returns the new joined state. */
export function toggleJoin(postId: string): boolean {
  const joined = getJoined();
  const has = joined.includes(postId);
  const next = has ? joined.filter((id) => id !== postId) : [...joined, postId];
  localStorage.setItem(JOINED_KEY, JSON.stringify(next));
  return !has;
}

/* ---------- Date helpers ---------- */

function formatEventDateTime(date: string, time: string) {
  const start = new Date(`${date}T${time}`);
  const valid = !Number.isNaN(start.getTime());

  const dateLabel = valid
    ? start.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })
    : date;
  const timeLabel = valid
    ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : time;

  return {
    dateLabel,
    timeLabel,
    iso: valid ? start.toISOString() : `${date}T${time}:00`,
    combinedLabel: `${dateLabel} · ${timeLabel}`,
  };
}

/* ---------- Builders ---------- */

function buildExploreEvent(data: CreateEventPayload): ExploreEvent {
  const { dateLabel, timeLabel } = formatEventDateTime(data.date, data.time);
  return {
    id: data.id,
    title: data.title,
    category: data.category,
    mainCategory: data.mainCategory,
    date: dateLabel,
    time: timeLabel,
    venue: data.venue,
    location: data.location || data.venue,
    description: data.description,
    coordinates: data.coordinates,
    attendees: data.attendees ?? 1,
    image: data.image,
    organizerId: ME_AUTHOR_ID,
    gameAccess: data.gameAccess,
  };
}

function buildHomePost(data: CreateEventPayload): HomeFeedPost {
  const { iso, combinedLabel } = formatEventDateTime(data.date, data.time);
  const media = data.media ?? null;

  let type: HomePostType = 'text';
  let image: string | undefined;
  let videoUrl: string | undefined;
  if (media?.type === 'image') {
    type = 'poster';
    image = media.url;
  } else if (media?.type === 'video') {
    type = 'video';
    videoUrl = media.url;
  }

  const caption =
    data.description.trim() ||
    `I'm hosting ${data.title} at ${data.venue}. Come join! 🎉`;

  const isLimited = data.registrationType === 'limited';
  const deadline = data.registrationDeadline
    ? new Date(data.registrationDeadline)
    : null;
  const registrationDeadlineISO =
    deadline && !Number.isNaN(deadline.getTime()) ? deadline.toISOString() : undefined;

  return {
    id: `user-${data.id}`,
    type,
    authorId: ME_AUTHOR_ID,
    caption,
    image,
    videoUrl,
    visibility: data.gameAccess === 'public' ? 'public' : 'private',
    isReshared: false,
    eventId: data.id,
    eventTitle: data.title,
    category: data.category,
    mainCategory: data.mainCategory,
    eventDateISO: iso,
    eventDateLabel: combinedLabel,
    eventLocation: data.venue,
    coordinates: data.coordinates,
    postedAgo: 'now',
    likes: 0,
    comments: 0,
    registrationType: isLimited ? 'limited' : 'open',
    slotsTotal: isLimited ? data.slotsTotal : undefined,
    slotsFilled: isLimited ? 0 : undefined,
    registrationDeadlineISO: isLimited ? registrationDeadlineISO : undefined,
  };
}

/**
 * Publish a created event to BOTH surfaces:
 *  - Explore map (persisted event)
 *  - Home feed (a post authored by the current user)
 * Location (coordinates) is mandatory upstream in the modal.
 */
export function publishEvent(data: CreateEventPayload): {
  event: ExploreEvent;
  post: HomeFeedPost;
} {
  const event = buildExploreEvent(data);
  const post = buildHomePost(data);
  appendExploreEvent(event);
  addUserPost(post);
  return { event, post };
}
