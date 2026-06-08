import React, { useEffect, useState } from 'react';
import { Signal, Wifi, BatteryFull } from 'lucide-react';
import './MobileAppFrame.css';

interface MobileAppFrameProps {
  children: React.ReactNode;
}

export const MobileAppFrame: React.FC<MobileAppFrameProps> = ({ children }) => {
  const [isNativeMobile, setIsNativeMobile] = useState(() =>
    window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsNativeMobile(event.matches);
    };

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  if (isNativeMobile) {
    return <div className="mobile-app-screen mobile-app-mode mobile-fullscreen">{children}</div>;
  }

  return (
    <div className="mobile-app-viewport">
      <div className="mobile-device-frame">
        <div className="mobile-status-bar" aria-hidden="true">
          <span className="mobile-status-time">9:41</span>
          <div className="mobile-dynamic-island" />
          <div className="mobile-status-icons">
            <Signal size={14} strokeWidth={2.5} />
            <Wifi size={14} strokeWidth={2.5} />
            <BatteryFull size={16} strokeWidth={2.5} />
          </div>
        </div>

        <div className="mobile-app-screen mobile-app-mode">{children}</div>

        <div className="mobile-home-indicator" aria-hidden="true" />
      </div>
    </div>
  );
};

export default MobileAppFrame;
