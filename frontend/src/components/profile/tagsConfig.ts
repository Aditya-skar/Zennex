/**
 * Interest tag taxonomy — shared list used by the profile tag picker.
 * Mirrors the section/interest lists already used across the app
 * (Explore sub-filters + profile interests). Tune here without touching UI code.
 */

export type InterestTag = {
  id: string;
  label: string;
  emoji: string;
  group: 'Sports' | 'Entertainment' | 'Lifestyle';
};

export const MAX_PROFILE_TAGS = 6;

export const INTEREST_TAGS: InterestTag[] = [
  // Sports (matches Explore/interest lists)
  { id: 'cricket', label: 'Cricket', emoji: '🏏', group: 'Sports' },
  { id: 'football', label: 'Football', emoji: '⚽', group: 'Sports' },
  { id: 'badminton', label: 'Badminton', emoji: '🏸', group: 'Sports' },
  { id: 'running', label: 'Running', emoji: '🏃', group: 'Sports' },
  { id: 'pickleball', label: 'Pickleball', emoji: '🎾', group: 'Sports' },
  { id: 'tennis', label: 'Tennis', emoji: '🎾', group: 'Sports' },
  { id: 'basketball', label: 'Basketball', emoji: '🏀', group: 'Sports' },
  { id: 'skateboard', label: 'Skateboard', emoji: '🛹', group: 'Sports' },
  { id: 'swimming', label: 'Swimming', emoji: '🏊', group: 'Sports' },
  { id: 'gym', label: 'Gym', emoji: '🏋️', group: 'Sports' },
  { id: 'yoga', label: 'Yoga', emoji: '🧘', group: 'Sports' },

  // Entertainment (matches profile interests)
  { id: 'music', label: 'Music', emoji: '🎵', group: 'Entertainment' },
  { id: 'open-mic', label: 'Open Mic', emoji: '🎤', group: 'Entertainment' },
  { id: 'food-events', label: 'Foodie', emoji: '🍜', group: 'Entertainment' },
  { id: 'theatre', label: 'Theatre', emoji: '🎭', group: 'Entertainment' },
  { id: 'movies', label: 'Movies', emoji: '🎬', group: 'Entertainment' },
  { id: 'dj-events', label: 'DJ Events', emoji: '🎧', group: 'Entertainment' },
  { id: 'comedy', label: 'Comedy', emoji: '😂', group: 'Entertainment' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮', group: 'Entertainment' },

  // Lifestyle / social
  { id: 'networking', label: 'Networking', emoji: '🤝', group: 'Lifestyle' },
  { id: 'travel', label: 'Travel', emoji: '✈️', group: 'Lifestyle' },
  { id: 'photography', label: 'Photography', emoji: '📸', group: 'Lifestyle' },
];

export const TAG_BY_ID = Object.fromEntries(
  INTEREST_TAGS.map((tag) => [tag.id, tag]),
) as Record<string, InterestTag>;
