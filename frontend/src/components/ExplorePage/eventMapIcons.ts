import L from 'leaflet';

export const SPORTS_CATEGORIES = [
  'Cricket',
  'Basketball',
  'Football',
  'Pickleball',
  'Tennis',
  'Badminton',
  'Running',
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

const PIN_STYLES: Record<string, PinStyle> = {
  cricket: { slug: 'cricket', group: 'sports', iconSrc: `${ICON_BASE}/cricket.png` },
  basketball: { slug: 'basketball', group: 'sports', iconSrc: `${ICON_BASE}/basketball.png` },
  football: { slug: 'football', group: 'sports', iconSrc: `${ICON_BASE}/football.png` },
  pickleball: { slug: 'pickleball', group: 'sports', iconSrc: `${ICON_BASE}/pickleball.png` },
  tennis: { slug: 'tennis', group: 'sports', iconSrc: `${ICON_BASE}/tennis.png` },
  badminton: { slug: 'badminton', group: 'sports', iconSrc: `${ICON_BASE}/badminton.png` },
  running: { slug: 'running', group: 'sports', iconSrc: `${ICON_BASE}/running.png` },
  music: { slug: 'music', group: 'entertainment', iconSrc: `${ICON_BASE}/music.png` },
  screening: { slug: 'screening', group: 'entertainment', iconSrc: `${ICON_BASE}/screening.png` },
  clubbing: { slug: 'clubbing', group: 'entertainment', iconSrc: `${ICON_BASE}/clubbing.png` },
  cosplaying: { slug: 'cosplaying', group: 'entertainment', iconSrc: `${ICON_BASE}/cosplaying.png` },
  default: { slug: 'default', group: 'sports', iconSrc: `${ICON_BASE}/default.png` },
};

const CATEGORY_ALIASES: Record<string, keyof typeof PIN_STYLES> = {
  cricket: 'cricket',
  basketball: 'basketball',
  football: 'football',
  pickleball: 'pickleball',
  tennis: 'tennis',
  badminton: 'badminton',
  running: 'running',
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

export function createEventMapPinHtml(category: string, isSelected: boolean): string {
  const style = getEventPinStyle(category);
  const selectedClass = isSelected ? ' selected' : '';
  const label = category.replace(/"/g, '&quot;');

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
      </div>
      <span class="event-pin-ground"></span>
      <span class="event-pin-pulse"></span>
    </div>
  `;
}

export function createEventMapIcon(category: string, isSelected: boolean): L.DivIcon {
  return L.divIcon({
    html: createEventMapPinHtml(category, isSelected),
    className: 'custom-marker-icon',
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -46],
  });
}
