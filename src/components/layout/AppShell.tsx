/**
 * AppShell — Canonical Navigation Shell
 *
 * Single source of truth for navigation. Replaces:
 * - LMSLayout.tsx
 * - AdminLMSHub.tsx
 * - LearnerLMSHub.tsx
 *
 * Structure:
 *   AppShell
 *   ├── TopBar (logo, org name, breadcrumb, search, notifications, user avatar)
 *   ├── Sidebar (role-based navigation from NAV_CONFIG)
 *   └── <Outlet /> (page content)
 */

import React, { useState, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Bot,
  TrendingUp,
  Trophy,
  ClipboardList,
  Users,
  BarChart,
  Layers,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  LogOut,
  User as UserIcon,
  Building2,
  Menu,
} from 'lucide-react';
import { useAuthStore } from '../../lib/authStore';
import { useAuth } from '../auth/useAuth';
import type { UserRole } from '../../types/schema';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  divider?: boolean;
}

interface NavConfig {
  [role: string]: NavItem[];
}

// ─── NAVIGATION CONFIG ───────────────────────────────────────────────────────

const NAV_CONFIG: NavConfig = {
  learner: [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'My Courses', path: '/courses', icon: BookOpen },
    { label: 'AI Tutor', path: '/chat', icon: Bot },
    { label: 'Progress', path: '/progress', icon: TrendingUp },
    { label: 'Achievements', path: '/achievements', icon: Trophy },
  ],
  instructor: [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'My Courses', path: '/courses', icon: BookOpen },
    { label: 'Gradebook', path: '/gradebook', icon: ClipboardList },
    { label: 'AI Tutor', path: '/chat', icon: Bot },
  ],
  manager: [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'My Courses', path: '/courses', icon: BookOpen },
    { label: 'My Team', path: '/team', icon: Users },
    { label: 'Reports', path: '/team/reports', icon: BarChart },
    { label: 'AI Tutor', path: '/chat', icon: Bot },
  ],
  admin: [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Courses', path: '/courses', icon: BookOpen },
    { label: 'AI Tutor', path: '/chat', icon: Bot },
    { label: '', path: '', icon: Home, divider: true },
    { label: 'Course Builder', path: '/admin/courses', icon: Layers },
    { label: 'Genie AI', path: '/admin/genie', icon: Sparkles },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Reports', path: '/admin/reports', icon: BarChart },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ],
  superadmin: [
    { label: 'Home', path: '/home', icon: Home },
    { label: 'Courses', path: '/courses', icon: BookOpen },
    { label: 'AI Tutor', path: '/chat', icon: Bot },
    { label: '', path: '', icon: Home, divider: true },
    { label: 'Course Builder', path: '/admin/courses', icon: Layers },
    { label: 'Genie AI', path: '/admin/genie', icon: Sparkles },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Reports', path: '/admin/reports', icon: BarChart },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
    { label: '', path: '', icon: Home, divider: true },
    { label: 'Organizations', path: '/superadmin/orgs', icon: Building2 },
  ],
};

// ─── BREADCRUMB HELPERS ──────────────────────────────────────────────────────

function generateBreadcrumbs(pathname: string): { label: string; path?: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; path?: string }[] = [];

  // Always start with Home
  if (segments[0] !== 'home') {
    breadcrumbs.push({ label: 'Home', path: '/home' });
  }

  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Map segment to human-readable label
    let label = segment.charAt(0).toUpperCase() + segment.slice(1);

    // Handle known routes
    if (segment === 'admin') label = 'Admin';
    if (segment === 'courses') label = 'Courses';
    if (segment === 'users') label = 'Users';
    if (segment === 'reports') label = 'Reports';
    if (segment === 'genie') label = 'Genie AI';
    if (segment === 'team') label = 'Team';
    if (segment === 'settings') label = 'Settings';

    // Skip duplicate Home
    if (segment === 'home' && index === 0) {
      breadcrumbs.push({ label: 'Home' });
      return;
    }

    // Last segment has no link
    if (index === segments.length - 1) {
      breadcrumbs.push({ label });
    } else {
      breadcrumbs.push({ label, path: currentPath });
    }
  });

  return breadcrumbs;
}

// ─── APPSHELL COMPONENT ──────────────────────────────────────────────────────

interface AppShellProps {
  /** Organization name to display in header */
  orgName?: string;
}

export function AppShell({ orgName }: AppShellProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get nav items for current role
  const navItems = useMemo(() => {
    if (!role) return NAV_CONFIG.learner;
    return NAV_CONFIG[role] || NAV_CONFIG.learner;
  }, [role]);

  // Generate breadcrumbs
  const breadcrumbs = useMemo(
    () => generateBreadcrumbs(location.pathname),
    [location.pathname]
  );

  // Handle sign out
  const handleSignOut = () => {
    useAuthStore.getState().logout();
    navigate('/login');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* ═══ SIDEBAR ═══ */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30
          flex flex-col
          bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {!sidebarCollapsed && (
            <Link to="/home" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">Tuutta</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hidden lg:flex"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={`divider-${index}`}
                  className="my-2 border-t border-gray-200 dark:border-gray-700"
                />
              );
            }

            const isActive = location.pathname === item.path ||
              (item.path !== '/home' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {!sidebarCollapsed && user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <UserIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {role}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg w-full
              text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50
              transition-colors
            `}
            title={sidebarCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <div
        className={`
          flex-1 flex flex-col min-h-screen
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        `}
      >
        {/* ═══ TOP BAR ═══ */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          {/* Left: Mobile menu button + Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              title="Open navigation menu"
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Org name (if provided) */}
            {orgName && (
              <span className="hidden md:inline text-sm font-medium text-gray-500 dark:text-gray-400">
                {orgName}
              </span>
            )}

            {/* Breadcrumb */}
            <nav className="hidden md:flex items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <span className="text-gray-400 dark:text-gray-500">/</span>
                  )}
                  {crumb.path ? (
                    <Link
                      to={crumb.path}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-gray-900 dark:text-white font-medium">
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Right: Search + Notifications + Avatar */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <button
              aria-label="Search"
              title="Search"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              aria-label="Notifications"
              title="Notifications"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 relative"
            >
              <Bell className="w-5 h-5" />
              {/* Notification badge */}
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* User dropdown (simplified for now) */}
            <button
              onClick={handleSignOut}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                {user?.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user?.displayName || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
            </button>
          </div>
        </header>

        {/* ═══ PAGE CONTENT ═══ */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
