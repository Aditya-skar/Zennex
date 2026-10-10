import { apiGet, apiPost, isBackendEnabled } from './client';
import { API_ROUTES } from './types';
import type { Community } from '../components/profile/communitiesStore';
import { getCurrentViewerId } from '../components/ExplorePage/exploreEvents';

export type CommunityDto = {
  id: string;
  name: string;
  avatarUrl: string;
  memberCount: number;
  role: 'admin' | 'member';
  creatorId: string;
  conversationId?: string | null;
  createdAt?: string | null;
};

function mapDto(dto: CommunityDto): Community {
  return {
    id: dto.id,
    name: dto.name,
    description: '',
    visibility: 'public',
    creatorId: dto.creatorId,
    chatId: dto.conversationId ?? `community-chat-${dto.id}`,
    avatar: dto.avatarUrl,
    createdAt: dto.createdAt ? new Date(dto.createdAt).getTime() : Date.now(),
  };
}

let membershipCache: Community[] = [];

export async function hydrateCommunities(): Promise<void> {
  if (!isBackendEnabled()) return;
  const rows = await apiGet<CommunityDto[]>(API_ROUTES.communities);
  membershipCache = rows.map(mapDto);
}

export function getMembershipCommunitiesCache(): Community[] {
  return membershipCache;
}

export async function fetchCommunitiesByCreator(userId: string): Promise<Community[]> {
  if (!isBackendEnabled()) return [];
  const rows = await apiGet<CommunityDto[]>(API_ROUTES.communitiesByCreator(userId));
  return rows.map(mapDto);
}

export async function createCommunityRemote(input: {
  name: string;
  avatarUrl?: string;
  memberIds?: string[];
}): Promise<Community> {
  const dto = await apiPost<CommunityDto>(API_ROUTES.communities, {
    name: input.name,
    avatarUrl: input.avatarUrl ?? '',
    memberIds: input.memberIds ?? [],
  });
  const mapped = mapDto(dto);
  membershipCache = [mapped, ...membershipCache];
  return mapped;
}

export async function joinCommunityRemote(communityId: string): Promise<void> {
  await apiPost(API_ROUTES.communityJoin(communityId));
  await hydrateCommunities();
}

export function canCreateCommunityRemote(): boolean {
  const me = getCurrentViewerId();
  return membershipCache.filter((c) => c.creatorId === me).length < 1;
}
