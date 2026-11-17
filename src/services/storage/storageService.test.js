import { describe, expect, it } from 'vitest';
import { BUCKETS, validateStorageFile } from './storageService';

describe('storage file validation', () => {
  it('accepts allowed progress images within the bucket limit', () => {
    expect(validateStorageFile(BUCKETS.PROGRESS_PHOTOS, { type: 'image/jpeg', size: 1024 })).toBe(true);
  });

  it('rejects unsupported MIME types and oversized files', () => {
    expect(() => validateStorageFile(BUCKETS.VERIFICATION_DOCS, { type: 'image/webp', size: 100 })).toThrow(/type is not allowed/);
    expect(() => validateStorageFile(BUCKETS.PROJECT_FILES, { type: 'application/pdf', size: 25 * 1024 * 1024 + 1 })).toThrow(/25 MiB/);
  });

  it('rejects unknown buckets', () => {
    expect(() => validateStorageFile('public-assets', { type: 'image/png', size: 1 })).toThrow(/Unsupported storage bucket/);
  });
});
