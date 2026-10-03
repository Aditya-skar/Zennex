/**
 * Media upload API facade (Phase 3) — real file storage (R2 or local disk on
 * the backend, see backend/app/storage.py) replacing base64 data URLs / blob
 * URLs for post media, event photos, and avatars.
 */
import { apiUpload } from './client';
import { API_ROUTES, type UploadResponseDto } from './types';

export async function uploadFile(file: File | Blob, filename?: string): Promise<UploadResponseDto> {
  return apiUpload<UploadResponseDto>(API_ROUTES.uploads, file, filename);
}
