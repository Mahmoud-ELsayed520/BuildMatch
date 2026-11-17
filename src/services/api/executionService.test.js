import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../supabase/client', () => ({ supabase: { rpc } }));

import { executionService } from './executionService';

describe('executionService.updateMilestoneStatus', () => {
  beforeEach(() => rpc.mockReset());

  it('uses the status RPC and passes only status workflow inputs', async () => {
    const updated = { id: 'milestone-1', status: 'rework_required' };
    rpc.mockResolvedValue({ data: updated, error: null });

    await expect(executionService.updateMilestoneStatus('milestone-1', 'rework_required', 'Fix the joint.')).resolves.toEqual(updated);
    expect(rpc).toHaveBeenCalledWith('update_milestone_status', {
      p_milestone_id: 'milestone-1',
      p_status: 'rework_required',
      p_rework_notes: 'Fix the joint.',
    });
  });

  it('preserves an intentional empty note and normalizes omitted notes to null', async () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    await executionService.updateMilestoneStatus('milestone-1', 'approved', '');
    expect(rpc.mock.calls[0][1].p_rework_notes).toBe('');
    await executionService.updateMilestoneStatus('milestone-1', 'in_progress');
    expect(rpc.mock.calls[1][1].p_rework_notes).toBeNull();
  });

  it('rejects unsupported targets before making a request', async () => {
    await expect(executionService.updateMilestoneStatus('milestone-1', 'pending')).rejects.toThrow(/Unsupported milestone status/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('propagates Supabase RPC errors', async () => {
    const error = new Error('not authorized');
    rpc.mockResolvedValue({ data: null, error });
    await expect(executionService.updateMilestoneStatus('milestone-1', 'approved')).rejects.toBe(error);
  });
});
