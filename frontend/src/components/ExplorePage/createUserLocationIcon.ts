import L from 'leaflet';

export function createUserLocationIcon(heading: number, theme: 'light' | 'dark'): L.DivIcon {
  const themeClass = theme === 'dark' ? 'user-location-marker--dark' : 'user-location-marker--light';
  // Chevron points east; offset so 0° = north.
  const rotation = heading - 90;

  return L.divIcon({
    className: 'user-location-marker-icon',
    html: `
      <div class="user-location-marker ${themeClass}" aria-hidden="true">
        <span class="user-location-ripple user-location-ripple--1"></span>
        <span class="user-location-ripple user-location-ripple--2"></span>
        <span class="user-location-ripple user-location-ripple--3"></span>
        <span class="user-location-core">
          <span class="user-location-ring">
            <span class="user-location-dot">
              <span class="user-location-arrow" style="transform: rotate(${rotation}deg)">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8.5 6.5L16 12L8.5 17.5"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </span>
          </span>
        </span>
      </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
  });
}
