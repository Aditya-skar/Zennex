import React, { useEffect, useState } from 'react';
import { Signal, Wifi, BatteryFull } from 'lucide-react';
import { isMobileWebDevice, useNativeMobileShell } from '../../mobile/initMobileApp';
import './MobileAppFrame.css';

interface MobileAppFrameProps {
  children: React.ReactNode;
}

function useMobileShellMode() {
  const [shellMode, setShellMode] = useState<'native' | 'phone'>(() =>
    useNativeMobileShell() ? 'native' : 'phone',
  );

  useEffect(() => {
    const syncShellMode = () => {
      const native = useNativeMobileShell();
      setShellMode(native ? 'native' : 'phone');
      document.documentElement.classList.toggle('simsor-mobile-web', isMobileWebDevice());
      document.documentElement.dataset.shell = native ? 'native' : 'preview';
    };

    syncShellMode();
    window.addEventListener('resize', syncShellMode);
    const coarsePointer = window.matchMedia('(pointer: coarse)');
    const noHover = window.matchMedia('(hover: none)');
    coarsePointer.addEventListener('change', syncShellMode);
    noHover.addEventListener('change', syncShellMode);

    return () => {
      window.removeEventListener('resize', syncShellMode);
      coarsePointer.removeEventListener('change', syncShellMode);
      noHover.removeEventListener('change', syncShellMode);
    };
  }, []);

  return shellMode;
}

/** Mobile-only shell: native fullscreen on device, phone frame on desktop browser */
export const MobileAppFrame: React.FC<MobileAppFrameProps> = ({ children }) => {
  const shellMode = useMobileShellMode();

  if (shellMode === 'native') {
    return (
      <div className="mobile-app-screen mobile-app-mode mobile-fullscreen">
        <div className="mobile-app-content">{children}</div>
      </div>
    );
  }

  return (
    <div className="mobile-app-viewport">
      <div className="mobile-device-frame">
        <div className="mobile-app-screen mobile-app-mode">
          <div className="mobile-status-bar" aria-hidden="true">
            <span className="mobile-status-time">9:41</span>
            <div className="mobile-dynamic-island" />
            <div className="mobile-status-icons">
              <Signal size={14} strokeWidth={2.5} />
              <Wifi size={14} strokeWidth={2.5} />
              <BatteryFull size={16} strokeWidth={2.5} />
            </div>
          </div>

          <div className="mobile-app-content">{children}</div>
        </div>

        <div className="mobile-home-indicator" aria-hidden="true" />
      </div>
    </div>
  );
};

export default MobileAppFrame;
