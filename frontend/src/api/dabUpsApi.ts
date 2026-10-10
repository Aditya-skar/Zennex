import { apiGet, isBackendEnabled } from './client';
import { API_ROUTES } from './types';

let dabbedUpIds: string[] = [];

export async function hydrateDabUps(): Promise<void> {
  if (!isBackendEnabled()) return;
  const res = await apiGet<{ userIds: string[] }>(API_ROUTES.dabUpsMine);
  dabbedUpIds = res.userIds;
}

export function getServerDabbedUpIds(): string[] {
  return dabbedUpIds;
}
