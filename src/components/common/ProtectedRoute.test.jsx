import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useAuth', () => ({ useAuth }));

import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';

function renderRoutes(authState) {
  useAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/login" element={<h1>Login</h1>} />
        <Route path="/unauthorized" element={<h1>Unauthorized</h1>} />
        <Route path="/private" element={(
          <ProtectedRoute>
            <RoleGuard allowedRoles={['landowner']}><h1>Private</h1></RoleGuard>
          </ProtectedRoute>
        )} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('route access guards', () => {
  it('redirects logged-out users to login after auth initialization', () => {
    renderRoutes({ user: null, role: null, loading: false });
    expect(screen.getByRole('heading', { name: 'Login' })).toBeTruthy();
  });

  it('redirects a signed-in user with the wrong role to unauthorized', () => {
    renderRoutes({ user: { id: 'user-1' }, role: 'contractor', loading: false });
    expect(screen.getByRole('heading', { name: 'Unauthorized' })).toBeTruthy();
  });

  it('waits for auth initialization before deciding access', () => {
    renderRoutes({ user: null, role: null, loading: true });
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Login' })).toBeNull();
  });
});
