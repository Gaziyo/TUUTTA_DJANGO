/**
 * RouteGuard Component — Canonical Implementation
 *
 * Protects routes based on user authentication and role.
 * Uses the schema.ts UserRole type.
 *
 * Usage:
 *   <Route element={<RouteGuard allowedRoles={['admin']}><AdminPage /></RouteGuard>} />
 *
 * Or with Outlet for nested routes:
 *   <Route element={<RouteGuard allowedRoles={['admin', 'manager']} />}>
 *     <Route path="dashboard" element={<Dashboard />} />
 *     <Route path="users" element={<Users />} />
 *   </Route>
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth, hasRoleAccess } from './useAuth';
import type { UserRole } from '../../types/schema';
import { resolveWorkspaceAccess } from '../../services';

const normalizePath = (path: string): string => {
  if (!path) return '/';
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
};

// Full-page spinner for loading state
const FullPageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

interface RouteGuardProps {
  /** Roles that are allowed to access this route */
  allowedRoles: UserRole[];

  /** Children to render if authorized (alternative to using Outlet) */
  children?: ReactNode;

  /** Custom redirect path for unauthenticated users (default: /login) */
  loginRedirect?: string;

  /** Custom redirect path for unauthorized users (default: /home) */
  unauthorizedRedirect?: string;
}

/**
 * RouteGuard protects routes based on authentication and role.
 *
 * Behavior:
 * - If loading: shows full-page spinner
 * - If not authenticated: redirects to /login
 * - If authenticated but wrong role: redirects to /home with reason state
 * - If authorized: renders children or Outlet
 */
export function RouteGuard({
  allowedRoles,
  children,
  loginRedirect = '/login',
  unauthorizedRedirect = '/403',
}: RouteGuardProps) {
  const { role, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const currentPath = normalizePath(location.pathname);
  const normalizedLoginRedirect = normalizePath(loginRedirect);
  const normalizedUnauthorizedRedirect = normalizePath(unauthorizedRedirect);

  // Show loading spinner while auth state is being determined
  if (loading) {
    return <FullPageSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Prevent redirect loops if guard is ever rendered on the login route.
    if (currentPath === normalizedLoginRedirect) {
      return <>{children || <Outlet />}</>;
    }
    return (
      <Navigate
        to={loginRedirect}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Check role access
  if (!hasRoleAccess(role, allowedRoles)) {
    // Prevent infinite replaceState loops when redirect target is the current route.
    if (currentPath === normalizedUnauthorizedRedirect) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access unavailable</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your account role is not mapped to this route. Please sign out and sign in again, or contact an administrator.
            </p>
          </div>
        </div>
      );
    }
    return (
      <Navigate
        to={unauthorizedRedirect}
        state={{ reason: 'unauthorized', from: location.pathname }}
        replace
      />
    );
  }

  // User is authenticated and has the right role
  // Render children if provided, otherwise render Outlet for nested routes
  return <>{children || <Outlet />}</>;
}

/**
 * Convenience component for routes accessible by any authenticated user.
 */
export function AuthenticatedRoute({ children }: { children?: ReactNode }) {
  return (
    <RouteGuard
      allowedRoles={['superadmin', 'admin', 'manager', 'instructor', 'learner']}
    >
      {children}
    </RouteGuard>
  );
}

/**
 * Convenience component for admin-only routes.
 */
export function AdminRoute({ children }: { children?: ReactNode }) {
  return (
    <RouteGuard allowedRoles={['superadmin', 'admin', 'manager']}>
      {children}
    </RouteGuard>
  );
}

/**
 * Convenience component for manager-and-above routes.
 */
export function ManagerRoute({ children }: { children?: ReactNode }) {
  return (
    <RouteGuard allowedRoles={['superadmin', 'admin', 'manager']}>
      {children}
    </RouteGuard>
  );
}

/**
 * Convenience component for instructor-and-above routes.
 */
export function InstructorRoute({ children }: { children?: ReactNode }) {
  return (
    <RouteGuard allowedRoles={['superadmin', 'admin', 'manager', 'instructor']}>
      {children}
    </RouteGuard>
  );
}

/**
 * Convenience component for learner-and-above routes (all authenticated users).
 */
export function LearnerRoute({ children }: { children?: ReactNode }) {
  return (
    <RouteGuard
      allowedRoles={['superadmin', 'admin', 'manager', 'instructor', 'learner']}
    >
      {children}
    </RouteGuard>
  );
}

export function PersonalWorkspaceRoute({ children }: { children?: ReactNode }) {
  return (
    <RouteGuard
      allowedRoles={['superadmin', 'admin', 'manager', 'instructor', 'learner']}
      unauthorizedRedirect="/403"
    >
      {children}
    </RouteGuard>
  );
}

function OrgWorkspaceGuardBase({
  requireOrgAdmin = false,
  children,
}: {
  requireOrgAdmin?: boolean;
  children?: ReactNode;
}) {
  const { loading, isAuthenticated } = useAuth();
  const { orgSlug } = useParams();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      if (!isAuthenticated || !orgSlug) {
        if (!cancelled) {
          setAllowed(false);
          setChecking(false);
        }
        return;
      }
      const access = await resolveWorkspaceAccess(orgSlug);
      const pass = requireOrgAdmin ? access.canAccessOrgAdmin : access.canAccessOrg;
      if (!cancelled) {
        setAllowed(pass);
        setChecking(false);
      }
    };

    checkAccess();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, orgSlug, requireOrgAdmin]);

  if (loading || checking) {
    return <FullPageSpinner />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!allowed) {
    return <Navigate to="/403" state={{ reason: 'unauthorized', from: location.pathname }} replace />;
  }
  return <>{children || <Outlet />}</>;
}

export function OrgWorkspaceRoute({ children }: { children?: ReactNode }) {
  return <OrgWorkspaceGuardBase>{children}</OrgWorkspaceGuardBase>;
}

export function OrgAdminWorkspaceRoute({ children }: { children?: ReactNode }) {
  return <OrgWorkspaceGuardBase requireOrgAdmin>{children}</OrgWorkspaceGuardBase>;
}

export function MasterWorkspaceRoute({ children }: { children?: ReactNode }) {
  const { loading, isAuthenticated, isMaster } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isMaster) {
    return <Navigate to="/403" state={{ reason: 'unauthorized', from: location.pathname }} replace />;
  }
  return <>{children || <Outlet />}</>;
}

export default RouteGuard;
