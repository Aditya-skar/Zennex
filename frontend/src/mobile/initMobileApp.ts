import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNativeMobileApp = (): boolean => Capacitor.isNativePlatform();

export async function initMobileApp(): Promise<void> {
  document.documentElement.classList.add('zenex-mobile-app');

  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0B1020' });
  } catch {
    // Status bar plugin unavailable in web preview
  }
}
