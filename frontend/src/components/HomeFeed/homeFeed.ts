import {
  EVENT_ORGANIZERS,
  ORGANIZER_BY_ID,
  ME_AUTHOR_ID,
  getCurrentUserOrganizer,
  type EventOrganizer,
} from '../ExplorePage/exploreEvents';

export { ME_AUTHOR_ID, getCurrentUserOrganizer };

export type HomePostType = 'poster' | 'text' | 'video';
export type HomePostVisibility = 'public' | 'private';
export type HomeMainCategory = 'Sports' | 'Entertainment';

/**
 * How people can register:
 *  - 'open'    → join anytime until the event starts (post shows a start-time countdown)
 *  - 'limited' → capped slots with a host-defined joining deadline (post shows a deadline countdown + slots left)
 */
export type RegistrationType = 'open' | 'limited';

export type HomeFeedPost = {
  id: string;
  type: HomePostType;
  /** Who created / shared this post. */
  authorId: string;
  caption: string;
  /** Poster image (only for `poster` posts). */
  image?: string;
  /** Video source (only for `video` posts). */
  videoUrl?: string;
  visibility: HomePostVisibility;
  /** True when the author reshared another host's event. */
  isReshared: boolean;
  /** The actual event host – only present when `isReshared`. */
  originalHostId?: string;
  /** Linked Explore event id so "View location" can focus the map. */
  eventId: string;
  eventTitle: string;
  /** Category used for interest matching + affinity. */
  category: string;
  mainCategory: HomeMainCategory;
  /** ISO datetime used to decide if the event already happened. */
  eventDateISO: string;
  eventDateLabel: string;
  eventLocation: string;
  coordinates: [number, number];
  postedAgo: string;
  likes: number;
  comments: number;
  /** Registration model – defaults to 'open' when omitted. */
  registrationType?: RegistrationType;
  /** Total slots (only for 'limited'). */
  slotsTotal?: number;
  /** Slots already taken (only for 'limited'). */
  slotsFilled?: number;
  /** ISO time when slot joining closes (only for 'limited'). */
  registrationDeadlineISO?: string;
};

/** The datetime a post's countdown ticks toward, and what it represents. */
export function getCountdownTarget(
  post: HomeFeedPost,
): { iso: string; kind: 'start' | 'deadline' } {
  if (post.registrationType === 'limited' && post.registrationDeadlineISO) {
    return { iso: post.registrationDeadlineISO, kind: 'deadline' };
  }
  return { iso: post.eventDateISO, kind: 'start' };
}

/** Remaining slots for a limited-registration event (never negative). */
export function slotsLeft(post: HomeFeedPost): number {
  if (post.registrationType !== 'limited' || post.slotsTotal == null) return Infinity;
  return Math.max(0, post.slotsTotal - (post.slotsFilled ?? 0));
}

/**
 * Deterministic host rating derived from the author id, so each host shows a
 * stable star rating + rating count (4.2–4.9 stars, 30–430 raters).
 */
export function getHostRating(post: HomeFeedPost): { rating: number; count: number } {
  const author = getPostAuthor(post);
  let h = 0;
  for (let i = 0; i < author.id.length; i += 1) {
    h = (h * 31 + author.id.charCodeAt(i)) >>> 0;
  }
  const rating = 4.2 + (h % 8) / 10;
  const count = 30 + (h % 400);
  return { rating: Math.round(rating * 10) / 10, count };
}

export function getPostAuthor(post: HomeFeedPost): EventOrganizer {
  if (post.authorId === ME_AUTHOR_ID) return getCurrentUserOrganizer();
  return ORGANIZER_BY_ID[post.authorId] ?? EVENT_ORGANIZERS[0];
}

export function getPostHost(post: HomeFeedPost): EventOrganizer | null {
  if (!post.isReshared || !post.originalHostId) return null;
  return ORGANIZER_BY_ID[post.originalHostId] ?? null;
}

export function isEventPast(post: HomeFeedPost, now: Date = new Date()): boolean {
  const eventTime = new Date(post.eventDateISO).getTime();
  if (Number.isNaN(eventTime)) return false;
  return eventTime < now.getTime();
}

/** Convert a "2h" / "1d" / "now" style label to hours-ago for recency scoring. */
export function postedAgoHours(postedAgo: string): number {
  const trimmed = postedAgo.trim().toLowerCase();
  if (trimmed === 'now' || trimmed === 'just now') return 0;
  const match = /^(\d+)\s*([hd])$/.exec(trimmed);
  if (!match) return 48;
  const value = Number(match[1]);
  return match[2] === 'd' ? value * 24 : value;
}

/** Organizers the user follows by default on first load. */
export const DEFAULT_FOLLOWING = ['org-rahul', 'org-dj-kiran'];

/** Fallback poster shown when a post image fails to load (prevents blank cards). */
export const FALLBACK_POST_IMAGE =
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80';

export const HOME_FEED_POSTS: HomeFeedPost[] = [
  {
    id: 'post-cricket-poster',
    type: 'poster',
    authorId: 'org-rahul',
    caption: 'Slots filling fast for the Sunday Premier Cricket Tournament. Register your squad now!',
    image:
      'https://images.unsplash.com/photo-1531415080290-bc98545ab3ef?auto=format&fit=crop&w=800&q=80',
    visibility: 'public',
    isReshared: false,
    eventId: 'evt-cricket',
    eventTitle: 'Cricket Tournament',
    category: 'Cricket',
    mainCategory: 'Sports',
    eventDateISO: '2026-07-05T09:00:00',
    eventDateLabel: 'Sun, July 5 · 9:00 AM',
    eventLocation: 'Miyapur Play Ground, Miyapur',
    coordinates: [17.4968, 78.3614],
    postedAgo: '2h',
    likes: 128,
    comments: 24,
    registrationType: 'limited',
    slotsTotal: 16,
    slotsFilled: 12,
    registrationDeadlineISO: '2026-07-05T08:00:00',
  },
  {
    id: 'post-music-reshare',
    type: 'poster',
    authorId: 'org-ananya',
    caption: 'Resharing this rooftop sundowner — my favourite DJ night in the city. See you all there!',
    image:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
    visibility: 'public',
    isReshared: true,
    originalHostId: 'org-dj-kiran',
    eventId: 'evt-music',
    eventTitle: 'Sunset DJ Session',
    category: 'Music',
    mainCategory: 'Entertainment',
    eventDateISO: '2026-07-11T18:00:00',
    eventDateLabel: 'Sat, July 11 · 6:00 PM',
    eventLocation: 'Over the Moon, Gachibowli',
    coordinates: [17.4358, 78.3634],
    postedAgo: '5h',
    likes: 342,
    comments: 58,
  },
  {
    id: 'post-run-text',
    type: 'text',
    authorId: 'org-vikram',
    caption:
      'Private run this Saturday for the core crew 🏃 — 10K along the lake trail, hydration stops sorted. Ping me if you want in.',
    visibility: 'private',
    isReshared: false,
    eventId: 'evt-running',
    eventTitle: 'Sunrise Run Club',
    category: 'Running',
    mainCategory: 'Sports',
    eventDateISO: '2026-07-04T06:00:00',
    eventDateLabel: 'Sat, July 4 · 6:00 AM',
    eventLocation: 'Durgam Cheruvu Lake Trail',
    coordinates: [17.4312, 78.4065],
    postedAgo: '8h',
    likes: 46,
    comments: 12,
  },
  {
    id: 'post-dj-live',
    type: 'poster',
    authorId: 'org-dj-kiran',
    caption: 'New set dropping this weekend 🎧 House, techno and a surprise live act. Limited entry!',
    image:
      'https://images.unsplash.com/photo-1571266028247-e4733b0f0bb0?auto=format&fit=crop&w=800&q=80',
    visibility: 'public',
    isReshared: false,
    eventId: 'evt-clubbing',
    eventTitle: 'Warehouse Rave',
    category: 'Clubbing',
    mainCategory: 'Entertainment',
    eventDateISO: '2026-07-12T21:00:00',
    eventDateLabel: 'Sun, July 12 · 9:00 PM',
    eventLocation: 'Cyber Towers, Hitech City',
    coordinates: [17.4482, 78.3812],
    postedAgo: '10h',
    likes: 512,
    comments: 74,
    registrationType: 'limited',
    slotsTotal: 80,
    slotsFilled: 80,
    registrationDeadlineISO: '2026-07-12T20:00:00',
  },
  {
    id: 'post-basketball-reshare-text',
    type: 'text',
    authorId: 'org-arjun',
    caption:
      "Resharing Priya's 3v3 league — one of the best-run street tournaments around. Highly recommend signing up.",
    visibility: 'public',
    isReshared: true,
    originalHostId: 'org-priya',
    eventId: 'evt-basketball',
    eventTitle: '3v3 Basketball League',
    category: 'Basketball',
    mainCategory: 'Sports',
    eventDateISO: '2026-07-08T18:00:00',
    eventDateLabel: 'Wed, July 8 · 6:00 PM',
    eventLocation: 'Gachibowli Indoor Arena',
    coordinates: [17.4401, 78.3489],
    postedAgo: '1d',
    likes: 89,
    comments: 9,
    registrationType: 'limited',
    slotsTotal: 24,
    slotsFilled: 24,
    registrationDeadlineISO: '2026-07-08T17:00:00',
  },
  {
    id: 'post-pickleball',
    type: 'poster',
    authorId: 'org-sneha',
    caption: 'Morning pickleball doubles this Friday 🏓 Paddles on rent, all levels welcome!',
    image:
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80',
    visibility: 'public',
    isReshared: false,
    eventId: 'evt-pickleball',
    eventTitle: 'Pickleball Social',
    category: 'Pickleball',
    mainCategory: 'Sports',
    eventDateISO: '2026-07-10T07:00:00',
    eventDateLabel: 'Fri, July 10 · 7:00 AM',
    eventLocation: 'Kondapur Sports Complex',
    coordinates: [17.4622, 78.3578],
    postedAgo: '1d',
    likes: 63,
    comments: 7,
    registrationType: 'limited',
    slotsTotal: 12,
    slotsFilled: 12,
    registrationDeadlineISO: '2026-07-10T06:00:00',
  },
  {
    id: 'post-football-upcoming',
    type: 'text',
    authorId: 'org-arjun',
    caption: 'Sunday 11-a-side is on ⚽ Two spots left, first come first served. Turf booked till 7.',
    visibility: 'public',
    isReshared: false,
    eventId: 'evt-football',
    eventTitle: 'Sunday Football Match',
    category: 'Football',
    mainCategory: 'Sports',
    eventDateISO: '2026-07-05T17:00:00',
    eventDateLabel: 'Sun, July 5 · 5:00 PM',
    eventLocation: 'Madhapur Turf, Hyderabad',
    coordinates: [17.4485, 78.3912],
    postedAgo: '2d',
    likes: 74,
    comments: 15,
    registrationType: 'limited',
    slotsTotal: 22,
    slotsFilled: 20,
    registrationDeadlineISO: '2026-07-05T16:00:00',
  },
  {
    id: 'post-tennis-past',
    type: 'poster',
    authorId: 'org-sneha',
    caption: 'What a turnout at the Open Doubles! Thanks to everyone who came out. Next edition soon 🎾',
    image:
      'https://images.unsplash.com/photo-1622163642999-958948900c39?auto=format&fit=crop&w=800&q=80',
    visibility: 'public',
    isReshared: false,
    eventId: 'evt-tennis',
    eventTitle: 'Tennis Open Doubles',
    category: 'Tennis',
    mainCategory: 'Sports',
    eventDateISO: '2026-06-18T16:00:00',
    eventDateLabel: 'Wed, June 18 · 4:00 PM',
    eventLocation: 'Banjara Hills Tennis Club',
    coordinates: [17.4156, 78.4347],
    postedAgo: '3d',
    likes: 210,
    comments: 33,
  },
  {
    id: 'post-football-past-reshare',
    type: 'poster',
    authorId: 'org-vikram',
    caption: "Throwback to last Sunday's football match — resharing Arjun's recap. Great game, lads!",
    image:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
    visibility: 'public',
    isReshared: true,
    originalHostId: 'org-arjun',
    eventId: 'evt-football',
    eventTitle: 'Sunday Football Match',
    category: 'Football',
    mainCategory: 'Sports',
    eventDateISO: '2026-06-21T17:00:00',
    eventDateLabel: 'Sun, June 21 · 5:00 PM',
    eventLocation: 'Madhapur Turf, Hyderabad',
    coordinates: [17.4485, 78.3912],
    postedAgo: '6d',
    likes: 156,
    comments: 21,
  },
];
