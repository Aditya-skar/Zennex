/**
 * @deprecated Prefer `import { ... } from '../api'` or `'../../api'`.
 * Kept so older imports of ./endpoints keep typechecking.
 */
export { isBackendEnabled } from './client';
export type { AuthSession, EventDto, UserProfile as AuthUser } from './types';
export { loginWithPassword as login, signupAccount as signup } from './auth';
export { fetchProfile as fetchMe, saveProfile as updateProfile } from './profileApi';
export { createEventRemote as createEvent, deleteEventRemote as deleteEvent, listEvents as fetchNearbyEvents } from './eventsApi';
