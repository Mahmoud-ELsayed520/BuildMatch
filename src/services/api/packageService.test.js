import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabase } = vi.hoisted(() => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('../supabase/client', () => ({ supabase }));

import { packageService } from './packageService';

describe('packageService write contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates only a draft package with documented editable fields', async () => {
    const row = { id: 'package-1', project_id: 'project-1', status: 'draft' };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabase.from.mockReturnValue({ insert });

    await expect(packageService.createPackage('project-1', {
      title: 'Masonry', category: 'masonry', description: 'Walls', scope_of_work: 'Build walls',
      status: 'assigned', assigned_contractor_id: 'attacker', project_id: 'other-project',
    })).resolves.toEqual(row);
    expect(insert).toHaveBeenCalledWith({
      title: 'Masonry', category: 'masonry', description: 'Walls', scope_of_work: 'Build walls', project_id: 'project-1',
    });
  });

  it('publishes through the owner-authorized database RPC', async () => {
    const row = { id: 'package-1', status: 'open' };
    supabase.rpc.mockResolvedValue({ data: row, error: null });
    await expect(packageService.publishPackage('package-1')).resolves.toEqual(row);
    expect(supabase.rpc).toHaveBeenCalledWith('publish_project_package', { p_package_id: 'package-1' });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
