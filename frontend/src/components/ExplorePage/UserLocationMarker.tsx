import { useEffect, useMemo, useRef } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { createUserLocationIcon } from './createUserLocationIcon';
import { type UserPosition } from './useUserLocation';
import './userLocationMarker.css';

type UserLocationMarkerProps = {
  theme: 'light' | 'dark';
  position: UserPosition;
  heading: number;
};

export function UserLocationMarker({ theme, position, heading }: UserLocationMarkerProps) {
  const markerRef = useRef<L.Marker>(null);

  const icon = useMemo(
    () => createUserLocationIcon(heading, theme),
    [heading, theme]
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setIcon(icon);
    marker.setLatLng([position.lat, position.lng]);
  }, [icon, position.lat, position.lng]);

  return (
    <Marker
      ref={markerRef}
      position={[position.lat, position.lng]}
      icon={icon}
      zIndexOffset={2500}
      interactive={false}
    />
  );
}
