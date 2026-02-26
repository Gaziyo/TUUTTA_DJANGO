import type { AppContextType } from './appContext';

export type WorkspaceRole = 'learner' | 'instructor' | 'org_admin' | 'master';

const PERSONAL_NAV = ['home', 'ai_tutor', 'my_notes', 'files', 'assessments', 'progress', 'join_org'];
const ORG_LEARNER_NAV = ['home', 'ai_tutor', 'my_courses', 'paths', 'progress', 'analytics', 'discussions', 'announcements'];
const ORG_ADMIN_NAV = [...ORG_LEARNER_NAV, 'admin'];
const COURSE_NAV = ['back_to_courses', 'course_home', 'course_player', 'course_outline', 'course_resources', 'discussions', 'notes', 'assessments'];
const PATH_NAV = ['back_to_paths', 'path_overview', 'current_course', 'milestones', 'discussions'];
const ADMIN_NAV = [
  'dashboard',
  'courses',
  'paths',
  'users',
  'teams',
  'departments',
  'reports',
  'governance',
  'settings',
  'genie',
  'ai_bot',
  'els_studio',
  'integrations',
  'security',
  'audit_logs',
];

export const masterNavItems = [
  { id: 'master_dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: '/master/dashboard' },
  { id: 'master_organizations', label: 'Organizations', icon: 'building-2', route: '/master/organizations' },
  { id: 'master_requests', label: 'Org Requests', icon: 'clipboard-check', route: '/master/requests' },
  { id: 'master_users', label: 'Users', icon: 'users', route: '/master/users' },
  { id: 'master_billing', label: 'Billing', icon: 'file-bar-chart', route: '/master/billing' },
  { id: 'master_compliance', label: 'Compliance', icon: 'shield-check', route: '/master/compliance' },
  { id: 'master_system', label: 'System Health', icon: 'compass', route: '/master/system' },
];

export function normalizeWorkspaceRole(role: string | null | undefined, isMaster: boolean): WorkspaceRole {
  if (isMaster) return 'master';
  if (role === 'instructor') return 'instructor';
  if (role === 'admin' || role === 'manager' || role === 'superadmin') return 'org_admin';
  return 'learner';
}

export function getAllowedNavIds(context: AppContextType, role: WorkspaceRole): string[] {
  if (context === 'admin') {
    return role === 'org_admin' || role === 'master' ? ADMIN_NAV : [];
  }
  if (context === 'course') {
    return COURSE_NAV;
  }
  if (context === 'path') {
    return PATH_NAV;
  }
  if (context === 'org') {
    return role === 'org_admin' || role === 'master' ? ORG_ADMIN_NAV : ORG_LEARNER_NAV;
  }
  return PERSONAL_NAV;
}
