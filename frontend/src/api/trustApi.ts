import { apiDelete, apiPost, isBackendEnabled } from './client';
import { API_ROUTES } from './types';
import { clearLocalSession, logout, replaceAuthToken } from './auth';
import { unregisterPush } from '../lib/pushNotifications';

export async function deleteMyAccount(): Promise<void> {
  if (!isBackendEnabled()) {
    throw new Error('Account deletion requires the live API');
  }
  await apiDelete(API_ROUTES.me);
  await logout();
}

export async function forgotPassword(email: string): Promise<{ resetToken?: string }> {
  return apiPost(API_ROUTES.forgotPassword, { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiPost(API_ROUTES.resetPassword, { token, newPassword });
}

/**
 * Changes the password. The server signs every OTHER device out and returns a
 * fresh token for this one, which replaces the stored token.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  if (!isBackendEnabled()) throw new Error('Changing your password requires the live API');
  const res = await apiPost<{ ok: boolean; token: string }>(API_ROUTES.changePassword, {
    currentPassword,
    newPassword,
  });
  replaceAuthToken(res.token);
}

/** Signs out every device (including this one). */
export async function logoutEverywhere(): Promise<void> {
  if (!isBackendEnabled()) throw new Error('Requires the live API');
  await unregisterPush(); // while the token is still valid
  await apiPost(API_ROUTES.logoutAll);
  clearLocalSession();
}

/** Emails a verification code to the account's address. */
export async function sendEmailVerification(): Promise<{ alreadyVerified?: boolean; verificationToken?: string }> {
  return apiPost(API_ROUTES.sendVerification);
}

export async function verifyEmail(token: string): Promise<void> {
  await apiPost(API_ROUTES.verifyEmail, { token: token.trim() });
}

export async function reportContent(payload: {
  targetType: 'user' | 'post' | 'message' | 'event';
  targetId: string;
  reason?: string;
  details?: string;
}): Promise<void> {
  if (!isBackendEnabled()) return;
  await apiPost(API_ROUTES.reports, payload);
}

export async function blockUser(userId: string): Promise<void> {
  if (!isBackendEnabled()) return;
  await apiPost(API_ROUTES.blockUser(userId));
}

export async function unblockUser(userId: string): Promise<void> {
  if (!isBackendEnabled()) return;
  await apiDelete(API_ROUTES.blockUser(userId));
}
