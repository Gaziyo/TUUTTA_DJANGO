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

import React, { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, hasRoleAccess } from './useAuth';
import type { UserRole } from '../../types/schema';

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
  unauthorizedRedirect = '/home',
}: RouteGuardProps) {
  const { role, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return <FullPageSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Prevent redirect loops if guard is ever rendered on the login route.
    if (location.pathname === loginRedirect) {
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
    if (location.pathname === unauthorizedRedirect) {
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
    <RouteGuard allowedRoles={['superadmin', 'admin']}>
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

export default RouteGuard;
