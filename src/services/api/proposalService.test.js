import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabase } = vi.hoisted(() => ({
  supabase: { auth: { getUser: vi.fn() }, from: vi.fn(), rpc: vi.fn() },
}));
vi.mock('../supabase/client', () => ({ supabase }));

import { proposalService } from './proposalService';

describe('proposalService write contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'contractor-1' } } });
  });

  it('submits only caller-owned documented fields and leaves submission timestamp to Postgres', async () => {
    const row = { id: 'proposal-1', contractor_id: 'contractor-1', status: 'submitted' };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    supabase.from.mockReturnValue({ insert });

    await expect(proposalService.submitProposal('package-1', {
      total_price: 1000, proposed_duration_days: 20, scope_summary: 'Scope', payment_schedule_terms: 'Terms',
      status: 'accepted', contractor_id: 'victim', submitted_at: '1900-01-01', version: 99,
    })).resolves.toEqual(row);
    expect(insert).toHaveBeenCalledWith({
      total_price: 1000, proposed_duration_days: 20, scope_summary: 'Scope', payment_schedule_terms: 'Terms',
      package_id: 'package-1', contractor_id: 'contractor-1', status: 'submitted',
    });
  });

  it('updates only documented proposal fields for the current contractor', async () => {
    const row = { id: 'proposal-1', total_price: 1200 };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn(() => ({ single }));
    const eqContractor = vi.fn(() => ({ select }));
    const eqId = vi.fn(() => ({ eq: eqContractor }));
    const update = vi.fn(() => ({ eq: eqId }));
    supabase.from.mockReturnValue({ update });

    await expect(proposalService.updateMyProposal('proposal-1', {
      total_price: 1200, status: 'accepted', package_id: 'other-package',
    })).resolves.toEqual(row);
    expect(update).toHaveBeenCalledWith({ total_price: 1200 });
    expect(eqId).toHaveBeenCalledWith('id', 'proposal-1');
    expect(eqContractor).toHaveBeenCalledWith('contractor_id', 'contractor-1');
  });

  it('withdraws through the database RPC', async () => {
    const row = { id: 'proposal-1', status: 'withdrawn' };
    supabase.rpc.mockResolvedValue({ data: row, error: null });
    await expect(proposalService.withdrawProposal('proposal-1')).resolves.toEqual(row);
    expect(supabase.rpc).toHaveBeenCalledWith('withdraw_proposal', { p_proposal_id: 'proposal-1' });
  });
});
