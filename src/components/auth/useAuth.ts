/**
 * useAuth Hook — Django JWT Implementation
 *
 * Replaces the Firebase Auth + Firestore implementation.
 * Uses the authStore (Zustand) which reads JWT tokens from localStorage.
 */

import { useEffect } from 'react';
import { useAuthStore } from '../../lib/authStore';
import { useLMSStore } from '../../store/lmsStore';
import type { UserRole as LmsUserRole } from '../../types/lms';
import type { UserRole } from '../../types/schema';
import { ROLE_HIERARCHY, getRoleLevel, hasMinRole } from '../../types/schema';

interface AuthState {
  uid: string | null;
  user: ReturnType<typeof useAuthStore>['user'];
  role: UserRole | null;
  orgId: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  isInstructorOrAbove: boolean;
  isMaster: boolean;
}

function mapLmsRoleToCanonical(role: LmsUserRole | null | undefined): UserRole | null {
  if (!role) return null;
  switch (role) {
    case 'super_admin': return 'superadmin';
    case 'org_admin': return 'admin';
    case 'ld_manager':
    case 'team_lead': return 'manager';
    case 'instructor': return 'instructor';
    case 'learner': return 'learner';
    default: return null;
  }
}

export function useAuth(): AuthState {
  const { user, isAuthenticated, isLoading, fetchCurrentUser } = useAuthStore();
  const lmsMemberRole = useLMSStore((state) => state.currentMember?.role ?? null);
  const lmsOrgId = useLMSStore((state) => state.currentOrg?.id ?? null);
  const hasAccessToken =
    typeof window !== 'undefined' && !!window.localStorage.getItem('accessToken');

  // Keep persisted auth state consistent with token presence.
  // This prevents "ghost login" UI when user data was persisted but tokens are missing/expired.
  useEffect(() => {
    if (!hasAccessToken && (isAuthenticated || user)) {
      useAuthStore.setState({ user: null, isAuthenticated: false });
      return;
    }
    if (hasAccessToken && isAuthenticated && !user) {
      fetchCurrentUser();
    }
  }, [hasAccessToken, isAuthenticated, user, fetchCurrentUser]);

  const isMaster = Boolean(user?.is_superuser);
  const role = isMaster ? 'superadmin' : (mapLmsRoleToCanonical(lmsMemberRole) ?? 'learner');
  const orgId = lmsOrgId ?? null;
  const uid = user?.id ?? null;
  const loading = isLoading || (hasAccessToken && isAuthenticated && !user);
  const authenticated = hasAccessToken && isAuthenticated && !!user;

  const isAdmin = role === 'admin' || role === 'superadmin';
  const isManagerOrAbove = isAdmin || role === 'manager';
  const isInstructorOrAbove = isManagerOrAbove || role === 'instructor';

  return {
    uid,
    user,
    role,
    orgId,
    loading,
    isAuthenticated: authenticated,
    isAdmin,
    isManagerOrAbove,
    isInstructorOrAbove,
    isMaster,
  };
}

export function hasRoleAccess(userRole: UserRole | null, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

export { ROLE_HIERARCHY, getRoleLevel, hasMinRole };

export function meetsMinimumRole(userRole: UserRole | null, minimumRole: UserRole): boolean {
  return hasMinRole(userRole, minimumRole);
}

export default useAuth;
