import { describe, expect, it } from 'vitest';
import { parseSupabaseError } from './errors';

describe('parseSupabaseError', () => {
  it('maps common database constraint errors to user-safe messages', () => {
    expect(parseSupabaseError({ code: '23503', message: 'private constraint details' })).toMatch(/السجل المرتبط/);
    expect(parseSupabaseError({ code: '23502', message: 'private column details' })).toMatch(/الحقول المطلوبة/);
    expect(parseSupabaseError({ code: '42501', message: 'private policy details' })).toMatch(/الصلاحيات/);
  });

  it('does not expose unknown backend messages or arbitrary strings', () => {
    expect(parseSupabaseError({ message: 'postgres.internal_table leaked' })).not.toContain('postgres.internal_table');
    expect(parseSupabaseError('postgres.internal_table leaked')).not.toContain('postgres.internal_table');
  });
});
