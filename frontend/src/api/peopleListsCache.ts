import type { PeopleList } from '../components/HomeFeed/audienceLists';

let listsCache: PeopleList[] = [];

export function getPeopleListsCache(): PeopleList[] {
  return listsCache;
}

export function setPeopleListsCache(lists: PeopleList[]): void {
  listsCache = lists;
}
