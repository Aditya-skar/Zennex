import React, { useEffect, useState } from 'react';
import { Signal, Wifi, BatteryFull } from 'lucide-react';
import { isNativeMobileApp } from '../../mobile/initMobileApp';
import './MobileAppFrame.css';

interface MobileAppFrameProps {
  children: React.ReactNode;
}

function useMobileShellMode() {
  const [shellMode, setShellMode] = useState<'native' | 'phone' | 'fullscreen'>(() => {
    if (isNativeMobileApp()) return 'native';
    if (window.matchMedia('(max-width: 767px)').matches) return 'fullscreen';
    return 'phone';
  });

  useEffect(() => {
    if (isNativeMobileApp()) {
      setShellMode('native');
      return;
    }

    const media = window.matchMedia('(max-width: 767px)');
    const update = () => {
      setShellMode(media.matches ? 'fullscreen' : 'phone');
    };

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return shellMode;
}

/** Mobile-only shell: native fullscreen on device, phone frame on desktop browser */
export const MobileAppFrame: React.FC<MobileAppFrameProps> = ({ children }) => {
  const shellMode = useMobileShellMode();

  if (shellMode === 'native' || shellMode === 'fullscreen') {
    return (
      <div className="mobile-app-screen mobile-app-mode mobile-fullscreen">
        <div className="mobile-app-content">{children}</div>
      </div>
    );
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

        <div className="mobile-app-screen mobile-app-mode">
          <div className="mobile-app-content">{children}</div>
        </div>

        <div className="mobile-home-indicator" aria-hidden="true" />
      </div>
    </div>
  );
};

export default MobileAppFrame;
