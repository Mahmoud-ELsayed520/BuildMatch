import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabase, storageService } = vi.hoisted(() => ({
  supabase: { from: vi.fn() },
  storageService: { uploadFile: vi.fn(), deleteFile: vi.fn(), createSignedUrl: vi.fn() },
}));
vi.mock('../supabase/client', () => ({ supabase }));
vi.mock('../storage/storageService', () => ({
  BUCKETS: { PROJECT_FILES: 'project-files' },
  storageService,
}));

import { projectFileService } from './projectFileService';

describe('projectFileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageService.deleteFile.mockResolvedValue(undefined);
  });

  it('uploads to a project-scoped private object path and inserts metadata', async () => {
    const file = { name: 'plan final.pdf', size: 2048, type: 'application/pdf' };
    const uploaded = { path: 'project-1/object-plan_final.pdf' };
    const saved = { id: 'file-1', project_id: 'project-1', file_path: uploaded.path, is_public: false };
    const single = vi.fn().mockResolvedValue({ data: saved, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabase.from.mockReturnValue({ insert });
    storageService.uploadFile.mockResolvedValue(uploaded);

    await expect(projectFileService.uploadProjectFile('project-1', 'architectural_drawing', file)).resolves.toEqual(saved);
    expect(storageService.uploadFile).toHaveBeenCalledWith('project-files', expect.stringMatching(/^project-1\/.+-plan_final\.pdf$/), file);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      project_id: 'project-1',
      file_category: 'architectural_drawing',
      file_path: uploaded.path,
      is_public: false,
    }));
  });

  it('removes the uploaded object if metadata insertion fails', async () => {
    const error = new Error('metadata denied');
    const single = vi.fn().mockResolvedValue({ data: null, error });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabase.from.mockReturnValue({ insert });
    storageService.uploadFile.mockResolvedValue({ path: 'project-1/file.pdf' });

    await expect(projectFileService.uploadProjectFile('project-1', 'other', { name: 'file.pdf', size: 1, type: 'application/pdf' })).rejects.toBe(error);
    expect(storageService.deleteFile).toHaveBeenCalledWith('project-files', 'project-1/file.pdf');
  });

  it('rejects unknown categories before uploading', async () => {
    await expect(projectFileService.uploadProjectFile('project-1', 'private', { name: 'file.pdf' })).rejects.toThrow(/Unsupported project file category/);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('uses the private signed URL service for file viewing', async () => {
    storageService.createSignedUrl.mockResolvedValue('https://signed.example/file');
    await expect(projectFileService.getProjectFileUrl('project-1/file.pdf')).resolves.toBe('https://signed.example/file');
    expect(storageService.createSignedUrl).toHaveBeenCalledWith('project-files', 'project-1/file.pdf', 300);
  });
});
