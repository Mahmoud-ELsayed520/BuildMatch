import React from 'react';
import { RootLayout } from '../layouts/RootLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';

const HomePage = React.lazy(() => import('../../features/home/HomePage').then((module) => ({ default: module.HomePage })));
const LoginPage = React.lazy(() => import('../../features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = React.lazy(() => import('../../features/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const UnauthorizedPage = React.lazy(() => import('../../features/auth/UnauthorizedPage').then((module) => ({ default: module.UnauthorizedPage })));
const NotFoundPage = React.lazy(() => import('../../features/auth/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

const LandownerDashboard = React.lazy(() => import('../../features/landowner/LandownerDashboard').then((module) => ({ default: module.LandownerDashboard })));
const CreateProjectPage = React.lazy(() => import('../../features/landowner/CreateProjectPage').then((module) => ({ default: module.CreateProjectPage })));
const ProjectDetailPage = React.lazy(() => import('../../features/landowner/ProjectDetailPage').then((module) => ({ default: module.ProjectDetailPage })));
const ProposalComparisonPage = React.lazy(() => import('../../features/landowner/ProposalComparisonPage').then((module) => ({ default: module.ProposalComparisonPage })));
const ContractorDashboard = React.lazy(() => import('../../features/contractor/ContractorDashboard').then((module) => ({ default: module.ContractorDashboard })));
const ContractorDiscoveryPage = React.lazy(() => import('../../features/contractor/ContractorDiscoveryPage').then((module) => ({ default: module.ContractorDiscoveryPage })));
const ContractorProfilePage = React.lazy(() => import('../../features/contractor/ContractorProfilePage').then((module) => ({ default: module.ContractorProfilePage })));
const ExecutionDashboard = React.lazy(() => import('../../features/execution/ExecutionDashboard').then((module) => ({ default: module.ExecutionDashboard })));
const AdminDashboard = React.lazy(() => import('../../features/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));

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
      {
        path: ROUTES.CONTRACTOR_DISCOVERY,
        element: <ProtectedRoute><RoleGuard allowedRoles={[USER_ROLES.CONTRACTOR, USER_ROLES.LANDOWNER, USER_ROLES.ADMIN]}><ContractorDiscoveryPage /></RoleGuard></ProtectedRoute>,
      },
      { path: '*', element: <NotFoundPage /> },
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
            <CreateProjectPage />
          </RoleGuard>
        ),
      },
      {
        path: ROUTES.LANDOWNER_PROJECT_DETAIL,
        element: <RoleGuard allowedRoles={[USER_ROLES.LANDOWNER, USER_ROLES.ADMIN]}><ProjectDetailPage /></RoleGuard>,
      },
      {
        path: ROUTES.LANDOWNER_PACKAGE_DETAIL,
        element: <RoleGuard allowedRoles={[USER_ROLES.LANDOWNER, USER_ROLES.ADMIN]}><ProposalComparisonPage /></RoleGuard>,
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
      {
        path: ROUTES.EXECUTION_PACKAGE,
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
