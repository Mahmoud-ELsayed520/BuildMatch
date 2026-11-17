import { supabase } from '../supabase/client';

export const BUCKETS = {
  PROJECT_FILES: 'project-files',
  VERIFICATION_DOCS: 'verification-docs',
  PROGRESS_PHOTOS: 'progress-photos',
};

const BUCKET_RULES = {
  [BUCKETS.PROJECT_FILES]: { maxBytes: 25 * 1024 * 1024, types: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/acad', 'application/x-dwg', 'image/vnd.dwg'] },
  [BUCKETS.VERIFICATION_DOCS]: { maxBytes: 10 * 1024 * 1024, types: ['application/pdf', 'image/jpeg', 'image/png'] },
  [BUCKETS.PROGRESS_PHOTOS]: { maxBytes: 15 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] },
};

/** Validate a file against the private bucket's configured client-side constraints. */
export function validateStorageFile(bucket, file) {
  const rules = BUCKET_RULES[bucket];
  if (!rules) throw new Error(`Unsupported storage bucket: ${bucket}`);
  if (!file || !rules.types.includes(file.type)) throw new Error('This file type is not allowed for the selected bucket.');
  if (file.size > rules.maxBytes) throw new Error(`File exceeds the ${Math.floor(rules.maxBytes / 1024 / 1024)} MiB limit.`);
  return true;
}

export const storageService = {
  async uploadFile(bucket, path, file) {
    validateStorageFile(bucket, file);
    if (typeof path !== 'string' || path.startsWith('/') || path.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error('Storage path must be a relative, non-empty object path.');
    }
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;
    return data;
  },

  async createSignedUrl(bucket, path, expiresInSeconds = 3600) {
    if (!BUCKET_RULES[bucket]) throw new Error(`Unsupported storage bucket: ${bucket}`);
    if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1 || expiresInSeconds > 3600) {
      throw new Error('Signed URL expiry must be between 1 and 3600 seconds.');
    }
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  },

  async deleteFile(bucket, paths) {
    const filePaths = Array.isArray(paths) ? paths : [paths];
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (error) throw error;
    return data;
  },
};
