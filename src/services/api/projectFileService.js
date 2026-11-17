import { supabase } from '../supabase/client';
import { BUCKETS, storageService } from '../storage/storageService';

export const PROJECT_FILE_CATEGORIES = [
  'architectural_drawing',
  'structural_drawing',
  'site_photo',
  'soil_report',
  'license_permit',
  'other',
];

function sanitizeFileName(fileName) {
  const safeName = String(fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  return safeName || 'file';
}

export const projectFileService = {
  async getProjectFiles(projectId) {
    const { data, error } = await supabase
      .from('project_files')
      .select('id, project_id, file_category, file_path, file_name, file_size_bytes, is_public, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async uploadProjectFile(projectId, category, file) {
    if (!PROJECT_FILE_CATEGORIES.includes(category)) throw new Error('Unsupported project file category.');
    if (!projectId) throw new Error('A project ID is required to upload a project file.');

    const filePath = `${projectId}/${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}-${sanitizeFileName(file?.name)}`;
    const uploaded = await storageService.uploadFile(BUCKETS.PROJECT_FILES, filePath, file);
    const { data, error } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        file_category: category,
        file_path: uploaded.path,
        file_name: file.name,
        file_size_bytes: file.size,
        is_public: false,
      })
      .select('id, project_id, file_category, file_path, file_name, file_size_bytes, is_public, created_at')
      .single();

    if (error) {
      await storageService.deleteFile(BUCKETS.PROJECT_FILES, uploaded.path).catch(() => {});
      throw error;
    }
    return data;
  },

  async getProjectFileUrl(filePath, expiresInSeconds = 300) {
    return storageService.createSignedUrl(BUCKETS.PROJECT_FILES, filePath, expiresInSeconds);
  },
};
