import React from 'react';
import { RootLayout } from '../layouts/RootLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';

import { HomePage } from '../../features/home/HomePage';
import { LoginPage } from '../../features/auth/LoginPage';
import { RegisterPage } from '../../features/auth/RegisterPage';
import { UnauthorizedPage } from '../../features/auth/UnauthorizedPage';

import { LandownerDashboard } from '../../features/landowner/LandownerDashboard';
import { ContractorDashboard } from '../../features/contractor/ContractorDashboard';
import { ContractorDiscoveryPage } from '../../features/contractor/ContractorDiscoveryPage';
import { ContractorProfilePage } from '../../features/contractor/ContractorProfilePage';
import { ExecutionDashboard } from '../../features/execution/ExecutionDashboard';
import { AdminDashboard } from '../../features/admin/AdminDashboard';

import { ProtectedRoute } from '../../components/common/ProtectedRoute';
import { RoleGuard } from '../../components/common/RoleGuard';
import { ROUTES } from '../../constants/routes';
import { USER_ROLES } from '../../constants/roles';

export const routesConfig = [
  // Public Root Layout
  {
    path: ROUTES.HOME,
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: ROUTES.UNAUTHORIZED, element: <UnauthorizedPage /> },
      { path: ROUTES.CONTRACTOR_DISCOVERY, element: <ContractorDiscoveryPage /> },
    ],
  },

  // Auth Layout
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: <LoginPage /> },
      { path: ROUTES.REGISTER, element: <RegisterPage /> },
    ],
  },

  // Protected Dashboard Layout
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      // Landowner Role Routes
      {
        path: ROUTES.LANDOWNER_DASHBOARD,
        element: (
          <RoleGuard allowedRoles={[USER_ROLES.LANDOWNER, USER_ROLES.ADMIN]}>
            <LandownerDashboard />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.LANDOWNER_PROJECTS,
        element: (
          <RoleGuard allowedRoles={[USER_ROLES.LANDOWNER, USER_ROLES.ADMIN]}>
            <LandownerDashboard />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.LANDOWNER_CREATE_PROJECT,
        element: (
          <RoleGuard allowedRoles={[USER_ROLES.LANDOWNER, USER_ROLES.ADMIN]}>
            <LandownerDashboard />
          </RoleGuard>
        ),
      },

      // Contractor Role Routes
      {
        path: ROUTES.CONTRACTOR_DASHBOARD,
        element: (
          <RoleGuard allowedRoles={[USER_ROLES.CONTRACTOR, USER_ROLES.ADMIN]}>
            <ContractorDashboard />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.CONTRACTOR_PROPOSALS,
        element: (
          <RoleGuard allowedRoles={[USER_ROLES.CONTRACTOR, USER_ROLES.ADMIN]}>
            <ContractorDashboard />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.CONTRACTOR_PROFILE,
        element: (
          <RoleGuard allowedRoles={[USER_ROLES.CONTRACTOR, USER_ROLES.ADMIN]}>
            <ContractorProfilePage />
          </RoleGuard>
        ),
      },

      // Construction Execution (Shared landowner & contractor)
      {
        path: ROUTES.EXECUTION_DASHBOARD,
        element: (
          <RoleGuard allowedRoles={[USER_ROLES.LANDOWNER, USER_ROLES.CONTRACTOR, USER_ROLES.ADMIN]}>
            <ExecutionDashboard />
          </RoleGuard>
        ),
      },

      // Admin Role Routes
      {
        path: ROUTES.ADMIN_DASHBOARD,
        element: (
          <RoleGuard allowedRoles={[USER_ROLES.ADMIN]}>
            <AdminDashboard />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.ADMIN_VERIFICATIONS,
        element: (
          <RoleGuard allowedRoles={[USER_ROLES.ADMIN]}>
            <AdminDashboard />
          </RoleGuard>
        ),
      },
    ],
  },
];
