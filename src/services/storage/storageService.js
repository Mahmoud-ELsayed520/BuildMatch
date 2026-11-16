import { supabase } from '../supabase/client';

export const BUCKETS = {
  PROJECT_FILES: 'project-files',
  VERIFICATION_DOCS: 'verification-docs',
  PROGRESS_PHOTOS: 'progress-photos',
};

export const storageService = {
  async uploadFile(bucket, path, file) {
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
