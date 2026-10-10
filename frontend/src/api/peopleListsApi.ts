import { apiDelete, apiGet, apiPatch, apiPost, isBackendEnabled } from './client';
import { API_ROUTES, type PeopleListDto } from './types';
import {
  PEOPLE_LISTS_CHANGED_EVENT,
  createPeopleList,
  deletePeopleList,
  loadPeopleLists,
  updatePeopleList,
  type PeopleList,
} from '../components/HomeFeed/audienceLists';

import { getPeopleListsCache, setPeopleListsCache } from './peopleListsCache';

export async function fetchPeopleLists(): Promise<PeopleList[]> {
  if (!isBackendEnabled()) return loadPeopleLists();
  const rows = await apiGet<PeopleListDto[]>(API_ROUTES.peopleLists);
  const mapped = rows.map((r) => ({
    id: r.id,
    name: r.name,
    memberIds: r.memberIds,
    updatedAt: r.updatedAt,
  }));
  setPeopleListsCache(mapped);
  window.dispatchEvent(new CustomEvent(PEOPLE_LISTS_CHANGED_EVENT));
  return mapped;
}

export async function createPeopleListRemote(name: string, memberIds: string[] = []): Promise<PeopleList> {
  if (!isBackendEnabled()) return createPeopleList(name, memberIds);
  const row = await apiPost<PeopleListDto>(API_ROUTES.peopleLists, { name, memberIds });
  const mapped = { id: row.id, name: row.name, memberIds: row.memberIds, updatedAt: row.updatedAt };
  setPeopleListsCache([mapped, ...getPeopleListsCache()]);
  window.dispatchEvent(new CustomEvent(PEOPLE_LISTS_CHANGED_EVENT));
  return mapped;
}

export async function updatePeopleListRemote(
  id: string,
  patch: Partial<Pick<PeopleList, 'name' | 'memberIds'>>,
): Promise<PeopleList | undefined> {
  if (!isBackendEnabled()) return updatePeopleList(id, patch);
  const row = await apiPatch<PeopleListDto>(API_ROUTES.peopleListById(id), patch);
  const mapped = { id: row.id, name: row.name, memberIds: row.memberIds, updatedAt: row.updatedAt };
  setPeopleListsCache(getPeopleListsCache().map((l) => (l.id === id ? mapped : l)));
  window.dispatchEvent(new CustomEvent(PEOPLE_LISTS_CHANGED_EVENT));
  return mapped;
}

export async function deletePeopleListRemote(id: string): Promise<void> {
  if (!isBackendEnabled()) {
    deletePeopleList(id);
    return;
  }
  await apiDelete(API_ROUTES.peopleListById(id));
  setPeopleListsCache(getPeopleListsCache().filter((l) => l.id !== id));
  window.dispatchEvent(new CustomEvent(PEOPLE_LISTS_CHANGED_EVENT));
}
