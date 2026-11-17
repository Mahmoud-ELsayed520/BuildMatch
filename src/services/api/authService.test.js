import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabase } = vi.hoisted(() => ({
  supabase: { auth: { signUp: vi.fn() }, from: vi.fn() },
}));
vi.mock('../supabase/client', () => ({ supabase }));

import { authService } from './authService';

describe('authService.register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes profile metadata to Auth and works when email confirmation returns no session', async () => {
    const result = { user: { id: 'user-1' }, session: null };
    supabase.auth.signUp.mockResolvedValue({ data: result, error: null });

    await expect(authService.register({
      email: 'contractor@example.test',
      password: 'password',
      fullName: 'Example Contractor',
      role: 'contractor',
      phone: '01000000000',
      city: 'Cairo',
    })).resolves.toEqual(result);

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'contractor@example.test',
      password: 'password',
      options: { data: {
        full_name: 'Example Contractor',
        role: 'contractor',
        phone: '01000000000',
        city: 'Cairo',
        business_name: 'Example Contractor',
      } },
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propagates signup errors without attempting profile writes', async () => {
    const error = new Error('signup unavailable');
    supabase.auth.signUp.mockResolvedValue({ data: null, error });

    await expect(authService.register({
      email: 'owner@example.test', password: 'password', fullName: 'Owner', role: 'landowner', city: 'Cairo',
    })).rejects.toBe(error);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
