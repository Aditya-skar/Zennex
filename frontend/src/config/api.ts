import { Capacitor } from '@capacitor/core';

/** API base URL for mobile builds. Override with VITE_API_URL in .env */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (Capacitor.isNativePlatform()) {
    // Android emulator loopback to host machine
    return 'http://10.0.2.2:8000';
  }

  return '';
}
