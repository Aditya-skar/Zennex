/**
 * Profile service — localStorage today, PATCH /api/me when backend is on.
 */
import { apiGet, apiPatch, isBackendEnabled } from './client';
import { getLocalProfile } from './auth';
import { API_ROUTES, type UserProfile } from './types';
import { notifyUserInterestsChanged } from '../components/ExplorePage/profileExploreInterests';

export async function fetchProfile(): Promise<UserProfile> {
  if (isBackendEnabled()) {
    return apiGet<UserProfile>(API_ROUTES.me);
  }
  return getLocalProfile();
}

export async function saveProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  if (isBackendEnabled()) {
    const updated = await apiPatch<UserProfile>(API_ROUTES.updateMe, patch);
    if (updated.fullName) localStorage.setItem('zenex-fullname', updated.fullName);
    if (updated.username) localStorage.setItem('zenex-username', updated.username);
    if (updated.bio != null) localStorage.setItem('zenex-bio', updated.bio);
    if (updated.location != null) localStorage.setItem('zenex-location', updated.location);
    if (updated.avatarUrl) localStorage.setItem('zenex-avatar', updated.avatarUrl);
    if (updated.sports) localStorage.setItem('zenex-sports', JSON.stringify(updated.sports));
    if (updated.entertainment) {
      localStorage.setItem('zenex-ent', JSON.stringify(updated.entertainment));
    }
    notifyUserInterestsChanged();
    return updated;
  }

  const current = getLocalProfile();
  const next: UserProfile = { ...current, ...patch };
  localStorage.setItem('zenex-fullname', next.fullName);
  localStorage.setItem('zenex-username', next.username);
  localStorage.setItem('zenex-bio', next.bio);
  localStorage.setItem('zenex-location', next.location);
  localStorage.setItem('zenex-avatar', next.avatarUrl);
  localStorage.setItem('zenex-sports', JSON.stringify(next.sports));
  localStorage.setItem('zenex-ent', JSON.stringify(next.entertainment));
  notifyUserInterestsChanged();
  return next;
}
