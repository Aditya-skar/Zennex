/**
 * Events API facade.
 * Until VITE_API_URL is set, delegates to existing exploreEvents local store.
 */
import { apiDelete, apiGet, apiPost, isBackendEnabled } from './client';
import { API_ROUTES, type EventDto } from './types';
import { loadExploreEvents, type ExploreEvent } from '../components/ExplorePage/exploreEvents';

function toDto(e: ExploreEvent): EventDto {
  return { ...e };
}

export async function listEvents(params?: {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  mainCategory?: string;
}): Promise<EventDto[]> {
  if (isBackendEnabled()) {
    return apiGet<EventDto[]>(API_ROUTES.events, { params });
  }
  return loadExploreEvents().map(toDto);
}

export async function createEventRemote(
  payload: Omit<EventDto, 'id' | 'attendees'> & { attendees?: number },
): Promise<EventDto> {
  if (isBackendEnabled()) {
    return apiPost<EventDto>(API_ROUTES.events, payload);
  }
  throw new Error('Use publishEvent() while backend is offline');
}

export async function deleteEventRemote(eventId: string): Promise<void> {
  if (isBackendEnabled()) {
    await apiDelete(API_ROUTES.eventById(eventId));
    return;
  }
  throw new Error('Use removeExploreEvent() while backend is offline');
}
