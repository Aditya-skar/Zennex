import {
  type HomeFeedPost,
  isEventPast,
  postedAgoHours,
  DEFAULT_FOLLOWING,
  ME_AUTHOR_ID,
} from './homeFeed';

/* ============================================================
   ZENEX Home feed ranking
   ------------------------------------------------------------
   Instagram-style feed: posts from people you follow come first
   (freshest at the top). Everything else is ranked into a
   "Suggested for you" section using a lightweight relevance
   score built from:
     - explicit interests (profile Sports/Entertainment tags)
     - learned affinity from dwell time (how long you actually
       looked at posts of a category / creator)
     - interactions (likes, opening the location)
     - popularity + recency, with a penalty for past events
   All state is persisted in localStorage (no backend needed).
   ============================================================ */

const FOLLOWING_KEY = 'zenex-following-v1';
const AFFINITY_KEY = 'zenex-feed-affinity-v1';
const SEED_FLAG_KEY = 'zenex-following-seeded-v1';

export const FEED_CHANGED_EVENT = 'zenex-feed-changed';

type AffinityStore = {
  categories: Record<string, number>;
  authors: Record<string, number>;
};

export type FeedReason =
  | { kind: 'following' }
  | { kind: 'interest'; label: string }
  | { kind: 'affinity'; label: string }
  | { kind: 'popular' };

export type RankedPost = {
  post: HomeFeedPost;
  score: number;
  reason: FeedReason;
};

export type BuiltFeed = {
  following: HomeFeedPost[];
  suggested: RankedPost[];
  hasFollowing: boolean;
};

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ---------- Follow graph ---------- */

export function getFollowing(): string[] {
  // Seed a couple of follows once so the "Following" feed isn't empty.
  if (!localStorage.getItem(SEED_FLAG_KEY)) {
    localStorage.setItem(SEED_FLAG_KEY, '1');
    if (!localStorage.getItem(FOLLOWING_KEY)) {
      localStorage.setItem(FOLLOWING_KEY, JSON.stringify(DEFAULT_FOLLOWING));
    }
  }
  return readJSON<string[]>(FOLLOWING_KEY, []);
}

export function isFollowing(authorId: string): boolean {
  return getFollowing().includes(authorId);
}

export function toggleFollow(authorId: string): boolean {
  const current = getFollowing();
  const next = current.includes(authorId)
    ? current.filter((id) => id !== authorId)
    : [...current, authorId];
  localStorage.setItem(FOLLOWING_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(FEED_CHANGED_EVENT));
  return next.includes(authorId);
}

/** A post "belongs" to the following feed if it's yours, or you follow the author/reshared host. */
export function isFollowedPost(post: HomeFeedPost): boolean {
  if (post.authorId === ME_AUTHOR_ID) return true;
  if (isFollowing(post.authorId)) return true;
  if (post.isReshared && post.originalHostId) return isFollowing(post.originalHostId);
  return false;
}

/* ---------- Interests (from profile) ---------- */

export function getUserInterests(): Set<string> {
  const sports = readJSON<string[]>('zenex-sports', ['Cricket', 'Football']);
  const ent = readJSON<string[]>('zenex-ent', ['Music']);
  return new Set([...sports, ...ent].map((s) => s.toLowerCase()));
}

/* ---------- Affinity (learned from behaviour) ---------- */

function getAffinity(): AffinityStore {
  return readJSON<AffinityStore>(AFFINITY_KEY, { categories: {}, authors: {} });
}

function saveAffinity(store: AffinityStore) {
  localStorage.setItem(AFFINITY_KEY, JSON.stringify(store));
}

function bump(store: AffinityStore, post: HomeFeedPost, points: number) {
  const cat = post.category.toLowerCase();
  store.categories[cat] = (store.categories[cat] ?? 0) + points;
  store.categories[post.mainCategory.toLowerCase()] =
    (store.categories[post.mainCategory.toLowerCase()] ?? 0) + points * 0.4;
  store.authors[post.authorId] = (store.authors[post.authorId] ?? 0) + points;
}

/** Record how many ms the user actually spent looking at a post. */
export function recordDwell(post: HomeFeedPost, ms: number) {
  if (ms < 600) return; // ignore quick scroll-bys
  const seconds = Math.min(ms / 1000, 20); // cap a single view's weight
  const store = getAffinity();
  bump(store, post, seconds);
  saveAffinity(store);
  // Dwell shouldn't reorder the feed mid-scroll; consumers re-read on next visit.
}

export type InteractionType =
  | 'like'
  | 'comment'
  | 'location'
  | 'openProfile'
  | 'repost'
  | 'join';

const INTERACTION_POINTS: Record<InteractionType, number> = {
  like: 10,
  comment: 8,
  location: 6,
  openProfile: 5,
  repost: 12,
  join: 16,
};

export function recordInteraction(post: HomeFeedPost, type: InteractionType) {
  const store = getAffinity();
  bump(store, post, INTERACTION_POINTS[type]);
  saveAffinity(store);
}

/* ---------- Scoring ---------- */

function recencyScore(post: HomeFeedPost): number {
  const hours = postedAgoHours(post.postedAgo);
  // 0h -> 30, ~72h -> ~0
  return Math.max(0, 30 - (hours / 72) * 30);
}

function scoreSuggested(
  post: HomeFeedPost,
  interests: Set<string>,
  affinity: AffinityStore,
): RankedPost {
  const cat = post.category.toLowerCase();
  const main = post.mainCategory.toLowerCase();

  let score = 0;
  let reason: FeedReason = { kind: 'popular' };

  // Explicit interest match (strongest signal after following).
  const interestHit = interests.has(cat);
  const mainHit = interests.has(main);
  if (interestHit) {
    score += 45;
    reason = { kind: 'interest', label: post.category };
  } else if (mainHit) {
    score += 18;
    reason = { kind: 'interest', label: post.mainCategory };
  }

  // Learned affinity from dwell + interactions.
  const catAffinity = affinity.categories[cat] ?? 0;
  const authorAffinity = affinity.authors[post.authorId] ?? 0;
  const catAffinityScore = Math.min(catAffinity, 60) / 60 * 40;
  const authorAffinityScore = Math.min(authorAffinity, 60) / 60 * 25;
  score += catAffinityScore + authorAffinityScore;

  // If affinity is the dominant signal, surface that as the reason.
  if (!interestHit && catAffinityScore >= 20) {
    reason = { kind: 'affinity', label: post.category };
  }

  // Popularity (likes) + recency.
  score += Math.min(post.likes, 500) / 500 * 12;
  score += recencyScore(post);

  // Past events still show up, but sink down the feed.
  if (isEventPast(post)) score -= 28;

  return { post, score, reason };
}

/* ---------- Feed assembly ---------- */

export function buildFeed(posts: HomeFeedPost[]): BuiltFeed {
  getFollowing(); // ensures default follows are seeded on first load
  const interests = getUserInterests();
  const affinity = getAffinity();

  const followingPosts: HomeFeedPost[] = [];
  const rest: HomeFeedPost[] = [];

  for (const post of posts) {
    if (isFollowedPost(post)) followingPosts.push(post);
    else rest.push(post);
  }

  // Following feed: freshest first (chronological-ish), past events last.
  followingPosts.sort((a, b) => {
    const pastA = isEventPast(a) ? 1 : 0;
    const pastB = isEventPast(b) ? 1 : 0;
    if (pastA !== pastB) return pastA - pastB;
    return postedAgoHours(a.postedAgo) - postedAgoHours(b.postedAgo);
  });

  const suggested = rest
    .map((post) => scoreSuggested(post, interests, affinity))
    .sort((a, b) => b.score - a.score);

  return {
    following: followingPosts,
    suggested,
    hasFollowing: followingPosts.length > 0,
  };
}
