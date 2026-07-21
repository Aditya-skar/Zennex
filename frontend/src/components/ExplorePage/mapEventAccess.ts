import { resolveMemberIdsFromLists } from '../HomeFeed/audienceLists';
import type { ExploreEvent } from './exploreEvents';

/** All member IDs invited to an invite-only event (lists + stored snapshot). */
export function getEventInvitedMemberIds(event: ExploreEvent): string[] {
  const fromLists = event.inviteListIds?.length
    ? resolveMemberIdsFromLists(event.inviteListIds)
    : [];
  const stored = event.invitedMemberIds ?? [];
  return [...new Set([...fromLists, ...stored])];
}

/** Public map — open events only (never invite-only). */
export function canViewOnPublicMap(event: ExploreEvent): boolean {
  return event.gameAccess !== 'invite';
}

/**
 * Private map —
 * - Public events from anyone you're Dabbed Up with (and your own)
 * - Invite-only events from Dabbed Up hosts when you're on their invite lists
 */
export function canViewOnPrivateMap(
  event: ExploreEvent,
  viewerId: string,
  dabbedOrganizerIds: Set<string>,
): boolean {
  const isHost = event.organizerId === viewerId;
  const isDabbedHost = dabbedOrganizerIds.has(event.organizerId);

  if (event.gameAccess !== 'invite') {
    return isHost || isDabbedHost;
  }

  if (isHost) return true;
  if (!isDabbedHost) return false;
  return getEventInvitedMemberIds(event).includes(viewerId);
}
