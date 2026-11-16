export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  UNAUTHORIZED: '/unauthorized',

  // Landowner
  LANDOWNER_DASHBOARD: '/landowner',
  LANDOWNER_PROJECTS: '/landowner/projects',
  LANDOWNER_CREATE_PROJECT: '/landowner/projects/new',
  LANDOWNER_PROJECT_DETAIL: '/landowner/projects/:projectId',
  LANDOWNER_PACKAGE_DETAIL: '/landowner/packages/:packageId',

  // Contractor
  CONTRACTOR_DASHBOARD: '/contractor',
  CONTRACTOR_DISCOVERY: '/contractor/discovery',
  CONTRACTOR_PROPOSALS: '/contractor/proposals',
  CONTRACTOR_PROFILE: '/contractor/profile',

  // Execution
  EXECUTION_DASHBOARD: '/execution',
  EXECUTION_PACKAGE: '/execution/packages/:packageId',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  ADMIN_VERIFICATIONS: '/admin/verifications',
  ADMIN_REPORTS: '/admin/reports',
};
