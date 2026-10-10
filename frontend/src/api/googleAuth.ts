import { apiPost } from './client';
import { API_ROUTES, type AuthSession, type UserProfile } from './types';
import { applyAuthSession } from './auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (res: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google Sign-In'));
    document.head.appendChild(script);
  });
}

export function getGoogleClientId(): string | null {
  const id = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  return id || null;
}

export async function signInWithGoogle(): Promise<UserProfile> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Set VITE_GOOGLE_CLIENT_ID in frontend/.env (same OAuth client as GOOGLE_CLIENT_ID on API)');
  }
  await loadGoogleScript();

  const idToken = await new Promise<string>((resolve, reject) => {
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-9999px';
    document.body.appendChild(host);

    const cleanup = () => {
      host.remove();
    };

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (res) => {
        cleanup();
        if (res.credential) resolve(res.credential);
        else reject(new Error('Google sign-in cancelled'));
      },
    });
    window.google!.accounts.id.renderButton(host, { type: 'standard', size: 'large' });
    const btn = host.querySelector('[role="button"]') as HTMLElement | null;
    if (!btn) {
      cleanup();
      reject(new Error('Google Sign-In button failed to render'));
      return;
    }
    btn.click();
  });

  const session = await apiPost<AuthSession>(API_ROUTES.googleAuth, { idToken });
  return applyAuthSession(session);
}
