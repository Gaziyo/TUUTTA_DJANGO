/**
 * Auth Components — Canonical Exports
 */

export {
  RouteGuard,
  AuthenticatedRoute,
  AdminRoute,
  ManagerRoute,
  InstructorRoute,
  LearnerRoute,
} from './RouteGuard';

export {
  useAuth,
  hasRoleAccess,
  meetsMinimumRole,
  ROLE_HIERARCHY,
} from './useAuth';
