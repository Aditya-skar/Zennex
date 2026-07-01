import L from 'leaflet';

export const SPORTS_CATEGORIES = [
  'Cricket',
  'Basketball',
  'Football',
  'Pickleball',
  'Tennis',
  'Badminton',
  'Running',
  'Skateboard',
  'Swimming',
] as const;

export const ENTERTAINMENT_CATEGORIES = [
  'Music',
  'Screening',
  'Clubbing',
  'Cosplaying',
] as const;

export type SportsCategory = (typeof SPORTS_CATEGORIES)[number];
export type EntertainmentCategory = (typeof ENTERTAINMENT_CATEGORIES)[number];
export type EventCategory = SportsCategory | EntertainmentCategory;

type PinGroup = 'sports' | 'entertainment';

type PinStyle = {
  slug: string;
  group: PinGroup;
  iconSrc: string;
};

const ICON_BASE = '/icons/3d';
// Bump when icon images are replaced so browsers/PWA caches fetch fresh assets.
const ICON_VERSION = '2';
const icon = (name: string) => `${ICON_BASE}/${name}.png?v=${ICON_VERSION}`;

const PIN_STYLES: Record<string, PinStyle> = {
  cricket: { slug: 'cricket', group: 'sports', iconSrc: icon('cricket') },
  basketball: { slug: 'basketball', group: 'sports', iconSrc: icon('basketball') },
  football: { slug: 'football', group: 'sports', iconSrc: icon('football') },
  pickleball: { slug: 'pickleball', group: 'sports', iconSrc: icon('pickleball') },
  tennis: { slug: 'tennis', group: 'sports', iconSrc: icon('tennis') },
  badminton: { slug: 'badminton', group: 'sports', iconSrc: icon('badminton') },
  running: { slug: 'running', group: 'sports', iconSrc: icon('running') },
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
  running: 'running',
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
  'food events': 'default',
};

export function normalizeEventCategory(category: string): keyof typeof PIN_STYLES {
  const key = category.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? 'default';
}

export function getEventPinStyle(category: string): PinStyle {
  const slug = normalizeEventCategory(category);
  return PIN_STYLES[slug] ?? PIN_STYLES.default;
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
          width="30"
          height="30"
          loading="lazy"
          draggable="false"
        />
        ${countBadge}
      </div>
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
