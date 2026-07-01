import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

export type UserPosition = {
  lat: number;
  lng: number;
};

export type UserLocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable';

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

// First attempt: precise GPS fix.
const GEO_OPTIONS_HIGH: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 12000,
};

// Fallback: coarse network/IP fix, allow a recent cached position.
const GEO_OPTIONS_LOW: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60000,
  timeout: 15000,
};

function readCompassHeading(event: DeviceOrientationEvent): number | null {
  const withCompass = event as DeviceOrientationEventWithCompass;

  if (typeof withCompass.webkitCompassHeading === 'number' && !Number.isNaN(withCompass.webkitCompassHeading)) {
    return withCompass.webkitCompassHeading;
  }

  if (event.absolute && event.alpha != null && !Number.isNaN(event.alpha)) {
    return (360 - event.alpha) % 360;
  }

  return null;
}

async function requestOrientationAccess(): Promise<boolean> {
  if (typeof DeviceOrientationEvent === 'undefined') return false;

  const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };

  if (typeof orientationEvent.requestPermission === 'function') {
    try {
      const result = await orientationEvent.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  return true;
}

function applyPosition(
  geoPosition: GeolocationPosition,
  setPosition: (value: UserPosition) => void,
  setHeading: (value: number) => void
) {
  setPosition({
    lat: geoPosition.coords.latitude,
    lng: geoPosition.coords.longitude,
  });

  const gpsHeading = geoPosition.coords.heading;
  if (gpsHeading != null && !Number.isNaN(gpsHeading)) {
    setHeading(gpsHeading);
  }
}

export function useUserLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [heading, setHeading] = useState(0);
  const [status, setStatus] = useState<UserLocationStatus>('idle');
  const [orientationEnabled, setOrientationEnabled] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const toastShownRef = useRef(false);
  const requestLocationRef = useRef<(fromUser?: boolean) => void>(() => {});

  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) return;

    stopWatching();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (geoPosition) => {
        applyPosition(geoPosition, setPosition, setHeading);
        setStatus('granted');
      },
      () => {
        /* watch errors are non-fatal once we have a fix */
      },
      GEO_OPTIONS_LOW
    );
  }, [stopWatching]);

  const requestLocation = useCallback((fromUser = false) => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      toast.error('Location is not supported in this browser.');
      return;
    }

    setStatus('loading');

    const onSuccess = (geoPosition: GeolocationPosition) => {
      applyPosition(geoPosition, setPosition, setHeading);
      setStatus('granted');
      startWatching();
    };

    const handleDenied = () => {
      stopWatching();
      setPosition(null);
      setStatus('denied');
      if (fromUser || !toastShownRef.current) {
        toastShownRef.current = true;
        toast.error('Location blocked. Enable it for this site in your browser settings.');
      }
    };

    const handleUnavailable = () => {
      setPosition((prev) => {
        if (prev) {
          setStatus('granted');
          startWatching();
          return prev;
        }
        stopWatching();
        setStatus('unavailable');
        if (fromUser || !toastShownRef.current) {
          toastShownRef.current = true;
          toast.error('Could not get your location. Check your device location/GPS and try again.');
        }
        return null;
      });
    };

    // Try precise GPS first; on timeout/unavailable, retry with a coarse fix.
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      (highError) => {
        if (highError.code === highError.PERMISSION_DENIED) {
          handleDenied();
          return;
        }

        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (lowError) => {
            if (lowError.code === lowError.PERMISSION_DENIED) {
              handleDenied();
            } else {
              handleUnavailable();
            }
          },
          GEO_OPTIONS_LOW
        );
      },
      GEO_OPTIONS_HIGH
    );
  }, [startWatching, stopWatching]);

  requestLocationRef.current = requestLocation;

  useEffect(() => {
    requestLocationRef.current();
    return stopWatching;
  }, [stopWatching]);

  const enableOrientation = useCallback(async () => {
    const granted = await requestOrientationAccess();
    setOrientationEnabled(granted);
    return granted;
  }, []);

  useEffect(() => {
    if (!orientationEnabled) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const compassHeading = readCompassHeading(event);
      if (compassHeading != null) {
        setHeading(compassHeading);
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [orientationEnabled]);

  useEffect(() => {
    const requestOnGesture = () => {
      void enableOrientation();
    };

    window.addEventListener('pointerdown', requestOnGesture, { once: true, passive: true });
    window.addEventListener('touchstart', requestOnGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', requestOnGesture);
      window.removeEventListener('touchstart', requestOnGesture);
    };
  }, [enableOrientation]);

  return { position, heading, status, requestLocation };
}
