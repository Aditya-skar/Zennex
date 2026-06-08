export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Strava-style minimal dark map with subtle road labels */
export function getMinimalMapTileUrl(theme: 'light' | 'dark'): string {
  return theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
}

export const MINIMAL_MAP_TILE_OPTIONS = {
  subdomains: 'abcd',
  maxZoom: 20,
  detectRetina: true,
} as const;
