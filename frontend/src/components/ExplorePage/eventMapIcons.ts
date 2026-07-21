import L from 'leaflet';

export const SPORTS_CATEGORIES = [
  'Cricket',
  'Basketball',
  'Football',
  'Volleyball',
  'Pickleball',
  'Tennis',
  'Badminton',
  'Running',
  'Hiking',
  'Yoga',
  'Pilates',
  'Weightlifting',
  'Calisthenics',
  'Skateboard',
  'Swimming',
] as const;

export const ENTERTAINMENT_CATEGORIES = [
  'Music',
  'Screening',
  'Clubbing',
  'Cosplaying',
] as const;

/**
 * "Weightlifting" doubles as an umbrella for heavy-lifting styles. These share
 * the weightlifting pin/icon, but each stays a distinct event category.
 */
export const WEIGHTLIFTING_SUBCATEGORIES = [
  'CrossFit',
  'Bodybuilding',
] as const;

export type SportsCategory = (typeof SPORTS_CATEGORIES)[number];
export type EntertainmentCategory = (typeof ENTERTAINMENT_CATEGORIES)[number];
export type EventCategory = SportsCategory | EntertainmentCategory;

/** True when a category belongs to the Weightlifting umbrella (incl. itself). */
export function isWeightliftingCategory(category: string): boolean {
  const key = category.trim().toLowerCase();
  if (key === 'weightlifting' || key === 'gym') return true;
  return (WEIGHTLIFTING_SUBCATEGORIES as readonly string[]).some(
    (c) => c.toLowerCase() === key
  );
}

const ALLOWED_SPORTS = new Set<string>([
  ...SPORTS_CATEGORIES,
  ...WEIGHTLIFTING_SUBCATEGORIES,
]);

const ALLOWED_ENTERTAINMENT = new Set<string>([...ENTERTAINMENT_CATEGORIES]);

/** Categories that belong in Discover / Explore sports or entertainment sections. */
export function isAllowedFeedCategory(category: string): boolean {
  return ALLOWED_SPORTS.has(category) || ALLOWED_ENTERTAINMENT.has(category);
}

type PinGroup = 'sports' | 'entertainment';

type PinStyle = {
  slug: string;
  group: PinGroup;
  iconSrc: string;
};

const ICON_BASE = '/icons/3d';
// Bump when icon images are replaced so browsers/PWA caches fetch fresh assets.
const ICON_VERSION = '18';
const icon = (name: string) => `${ICON_BASE}/${name}.png?v=${ICON_VERSION}`;

const PIN_STYLES: Record<string, PinStyle> = {
  cricket: { slug: 'cricket', group: 'sports', iconSrc: icon('cricket') },
  basketball: { slug: 'basketball', group: 'sports', iconSrc: icon('basketball') },
  football: { slug: 'football', group: 'sports', iconSrc: icon('football') },
  pickleball: { slug: 'pickleball', group: 'sports', iconSrc: icon('pickleball') },
  tennis: { slug: 'tennis', group: 'sports', iconSrc: icon('tennis') },
  badminton: { slug: 'badminton', group: 'sports', iconSrc: icon('badminton') },
  volleyball: { slug: 'volleyball', group: 'sports', iconSrc: icon('volleyball') },
  running: { slug: 'running', group: 'sports', iconSrc: icon('running') },
  hiking: { slug: 'hiking', group: 'sports', iconSrc: icon('hiking') },
  yoga: { slug: 'yoga', group: 'sports', iconSrc: icon('yoga') },
  pilates: { slug: 'pilates', group: 'sports', iconSrc: icon('pilates') },
  weightlifting: { slug: 'weightlifting', group: 'sports', iconSrc: icon('weightlifting') },
  calisthenics: { slug: 'calisthenics', group: 'sports', iconSrc: icon('calisthenics') },
  cycling: { slug: 'cycling', group: 'sports', iconSrc: icon('running') },
  skateboard: { slug: 'skateboard', group: 'sports', iconSrc: icon('skateboard') },
  swimming: { slug: 'swimming', group: 'sports', iconSrc: icon('swimming') },
  music: { slug: 'music', group: 'entertainment', iconSrc: icon('music') },
  screening: { slug: 'screening', group: 'entertainment', iconSrc: icon('screening') },
  clubbing: { slug: 'clubbing', group: 'entertainment', iconSrc: icon('clubbing') },
  cosplaying: { slug: 'cosplaying', group: 'entertainment', iconSrc: icon('cosplaying') },
  default: { slug: 'default', group: 'sports', iconSrc: icon('default') },
};

const CATEGORY_ALIASES: Record<string, keyof typeof PIN_STYLES> = {
  cricket: 'cricket',
  basketball: 'basketball',
  football: 'football',
  pickleball: 'pickleball',
  tennis: 'tennis',
  badminton: 'badminton',
  volleyball: 'volleyball',
  running: 'running',
  hiking: 'hiking',
  trek: 'hiking',
  trekking: 'hiking',
  yoga: 'yoga',
  pilates: 'pilates',
  weightlifting: 'weightlifting',
  'weight lifting': 'weightlifting',
  gym: 'weightlifting',
  calisthenics: 'calisthenics',
  // Heavy-lifting styles share the weightlifting icon.
  crossfit: 'weightlifting',
  bodybuilding: 'weightlifting',
  'body building': 'weightlifting',
  skateboard: 'skateboard',
  skating: 'skateboard',
  swimming: 'swimming',
  swim: 'swimming',
  music: 'music',
  dj: 'music',
  'dj events': 'music',
  'music events': 'music',
  screening: 'screening',
  movies: 'screening',
  theatre: 'screening',
  'open mic': 'music',
  clubbing: 'clubbing',
  clubs: 'clubbing',
  cosplaying: 'cosplaying',
  cosplay: 'cosplaying',
  boxing: 'weightlifting',
  cycling: 'cycling',
  golf: 'tennis',
  karaoke: 'music',
  comedy: 'music',
  art: 'cosplaying',
  food: 'screening',
  esports: 'clubbing',
  dance: 'clubbing',
  photography: 'screening',
  'food events': 'screening',
};

export function normalizeEventCategory(category: string): keyof typeof PIN_STYLES {
  const key = category.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? 'football';
}

export function getEventPinStyle(category: string): PinStyle {
  const slug = normalizeEventCategory(category);
  return PIN_STYLES[slug] ?? PIN_STYLES.default;
}

export function getEventCategoryIconSrc(category: string): string {
  return getEventPinStyle(category).iconSrc;
}

/** Icons with dark subjects that need inverting on dark map/chip discs (light theme). */
export function isDarkSubjectPin(category: string): boolean {
  const slug = getEventPinStyle(category).slug;
  return slug === 'music';
}

export function getEventCategoryIconClassName(category: string): string {
  return isDarkSubjectPin(category)
    ? 'home-post-event-chip-category is-dark-subject'
    : 'home-post-event-chip-category';
}

export function createEventMapPinHtml(
  category: string,
  isSelected: boolean,
  eventCount = 1
): string {
  const style = getEventPinStyle(category);
  const selectedClass = isSelected ? ' selected' : '';
  const label = category.replace(/"/g, '&quot;');
  const countBadge =
    eventCount > 1
      ? `<span class="event-pin-count" aria-label="${eventCount} events">${eventCount}</span>`
      : '';

  return `
    <div class="event-map-pin event-pin-3d event-pin-${style.group} event-pin-${style.slug}${selectedClass}">
      <div class="event-pin-head">
        <img
          class="event-pin-3d-img"
          src="${style.iconSrc}"
          alt="${label}"
          loading="lazy"
          draggable="false"
        />
      </div>
      ${countBadge}
      <span class="event-pin-ground"></span>
      <span class="event-pin-pulse"></span>
    </div>
  `;
}

export function createEventMapIcon(
  category: string,
  isSelected: boolean,
  eventCount = 1
): L.DivIcon {
  return L.divIcon({
    html: createEventMapPinHtml(category, isSelected, eventCount),
    className: 'custom-marker-icon',
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -46],
  });
}
