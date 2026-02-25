// ============================================================================
// APP CONTEXT CONFIGURATION
// Unified context model that drives the entire UI behavior
// ============================================================================

import { isEnterpriseFeatureEnabled, navFeatureMap } from './featureFlags';

export type AppContextType = 'personal' | 'org' | 'course' | 'path' | 'admin';

export type UserRole =
  | 'learner'
  | 'instructor'
  | 'team_lead'
  | 'ld_manager'
  | 'org_admin'
  | 'super_admin';

export interface AITutorConfig {
  mode: 'primary' | 'assistant' | 'hidden';
  floating: boolean;
  contextAware?: boolean;
  minimized?: boolean;
}

export interface ContextConfig {
  label: string;
  icon: string;
  nav: string[];
  defaultRoute: string;
  rightPanelTabs: string[];
  aiTutor: AITutorConfig;
  homeBlends?: string[];
  subContext?: {
    type: 'module' | 'lesson' | 'milestone';
    id?: string;
  };
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  divider?: boolean;
  badge?: string | number;
  children?: NavigationItem[];
}

export interface BreadcrumbConfig {
  [key: string]: string[];
}

export interface ContextSwitchTriggers {
  openCourse: AppContextType;
  exitCourse: AppContextType;
  openPath: AppContextType;
  exitPath: AppContextType;
  switchOrg: AppContextType;
  openAdmin: AppContextType;
  exitAdmin: AppContextType;
  logout: AppContextType;
}

export interface NavVisibilityRule {
  visibleIfRoleIn: UserRole[];
}

export interface NavigationRules {
  defaultContext: AppContextType;
  contextSwitchTriggers: ContextSwitchTriggers;
  navVisibility: {
    [key: string]: NavVisibilityRule;
  };
  rightPanelRules: {
    contextOverrides: {
      [key: string]: string[];
    };
  };
  breadcrumbs: BreadcrumbConfig;
}

// ============================================================================
// CONTEXT CONFIGURATIONS
// ============================================================================

export const contextConfigs: Record<AppContextType, ContextConfig> = {
  personal: {
    label: 'Personal',
    icon: 'user',
    nav: ['home', 'ai_tutor', 'divider_learning', 'my_notes', 'files', 'assessments', 'progress', 'divider_org', 'join_org'],
    defaultRoute: 'home',
    rightPanelTabs: ['notes', 'files', 'assessments', 'progress'],
    aiTutor: { mode: 'primary', floating: false },
    homeBlends: ['recent_chats', 'achievements', 'recommended_courses', 'learning_streak']
  },
  org: {
    label: 'Organization',
    icon: 'building',
    nav: ['home', 'ai_tutor', 'divider_learning', 'my_courses', 'paths', 'progress', 'analytics', 'divider_social', 'discussions', 'announcements', 'divider_admin', 'admin'],
    defaultRoute: 'home',
    rightPanelTabs: ['notes', 'files', 'assessments', 'progress', 'analytics'],
    aiTutor: { mode: 'primary', floating: false },
    homeBlends: ['enrolled_courses', 'learning_paths', 'achievements', 'org_announcements', 'team_progress']
  },
  course: {
    label: 'Course',
    icon: 'book-open',
    nav: ['back_to_courses', 'course_home', 'course_player', 'course_outline', 'course_resources', 'discussions', 'divider_tools', 'notes', 'assessments'],
    defaultRoute: 'course_home',
    rightPanelTabs: ['notes', 'materials', 'assessments', 'progress', 'discussions'],
    aiTutor: { mode: 'assistant', floating: true, contextAware: true }
  },
  path: {
    label: 'Learning Path',
    icon: 'map',
    nav: ['back_to_paths', 'path_overview', 'current_course', 'milestones', 'discussions'],
    defaultRoute: 'path_overview',
    rightPanelTabs: ['notes', 'progress', 'milestones', 'certificates'],
    aiTutor: { mode: 'assistant', floating: true, contextAware: true }
  },
  admin: {
    label: 'Admin',
    icon: 'settings',
    nav: [
      'back_to_workspace',
      'dashboard',
      'divider_people',
      'users',
      'teams',
      'departments',
      'divider_learning',
      'courses',
      'paths',
      'content_library',
      'enrollments',
      'assignments',
      'quizzes',
      'divider_reports',
      'reports',
      'audit_logs',
      'exports',
      'divider_security',
      'integrations',
      'security',
      'bulk_import',
      'divider_ai',
      'genie',
      'ai_bot',
      'els_studio',
      'divider_intelligence',
      'competencies',
      'gap_engine',
      'digital_twins',
      'predictions',
      'forecasting',
      'divider_system',
      'route_map',
      'settings',
      'governance'
    ],
    defaultRoute: 'dashboard',
    rightPanelTabs: ['analytics', 'reports', 'audit_log', 'quick_actions'],
    aiTutor: { mode: 'assistant', floating: false }
  }
};

// ============================================================================
// ROLE TO CONTEXT MAPPING
// ============================================================================

export const roleContextAccess: Record<UserRole, AppContextType[]> = {
  learner: ['personal', 'org', 'course', 'path'],
  instructor: ['personal', 'org', 'course', 'path'],
  team_lead: ['personal', 'org', 'course', 'path'],
  ld_manager: ['personal', 'org', 'course', 'path', 'admin'],
  org_admin: ['personal', 'org', 'course', 'path', 'admin'],
  super_admin: ['personal', 'org', 'course', 'path', 'admin']
};

// ============================================================================
// NAVIGATION RULES
// ============================================================================

export const navigationRules: NavigationRules = {
  defaultContext: 'personal',
  contextSwitchTriggers: {
    openCourse: 'course',
    exitCourse: 'org',
    openPath: 'path',
    exitPath: 'org',
    switchOrg: 'org',
    openAdmin: 'admin',
    exitAdmin: 'org',
    logout: 'personal'
  },
  navVisibility: {
    admin: {
      visibleIfRoleIn: ['ld_manager', 'org_admin', 'super_admin']
    },
    enrollments: {
      visibleIfRoleIn: ['ld_manager', 'org_admin', 'super_admin']
    },
    assignments: {
      visibleIfRoleIn: ['ld_manager', 'org_admin', 'super_admin']
    },
    join_org: {
      visibleIfRoleIn: ['learner', 'instructor', 'team_lead', 'ld_manager', 'org_admin', 'super_admin']
    }
  },
  rightPanelRules: {
    contextOverrides: {
      course: ['notes', 'materials', 'assessments', 'progress', 'discussions'],
      path: ['notes', 'progress', 'milestones', 'certificates'],
      admin: ['analytics', 'reports', 'audit_log', 'quick_actions']
    }
  },
  breadcrumbs: {
    course: ['org', 'my_courses', '{course_name}'],
    path: ['org', 'paths', '{path_name}'],
    admin: ['org', 'admin', '{section}']
  }
};

// ============================================================================
// NAVIGATION ITEMS DEFINITIONS
// ============================================================================

export const navigationItems: Record<string, NavigationItem> = {
  // Common
  home: { id: 'home', label: 'Home', icon: 'home', route: '/' },
  ai_tutor: { id: 'ai_tutor', label: 'AI Tutor', icon: 'message-square', route: '/chat' },

  // Dividers
  divider_learning: { id: 'divider_learning', label: 'Learning', icon: '', divider: true },
  divider_org: { id: 'divider_org', label: 'Organization', icon: '', divider: true },
  divider_social: { id: 'divider_social', label: 'Community', icon: '', divider: true },
  divider_content: { id: 'divider_content', label: 'Content', icon: '', divider: true },
  divider_users: { id: 'divider_users', label: 'People', icon: '', divider: true },
  divider_people: { id: 'divider_people', label: 'People', icon: '', divider: true },
  divider_analytics: { id: 'divider_analytics', label: 'Analytics', icon: '', divider: true },
  divider_security: { id: 'divider_security', label: 'Security', icon: '', divider: true },
  divider_system: { id: 'divider_system', label: 'System', icon: '', divider: true },
  divider_intelligence: { id: 'divider_intelligence', label: 'Intelligence', icon: '', divider: true },
  divider_tools: { id: 'divider_tools', label: 'Tools', icon: '', divider: true },
  divider_ai: { id: 'divider_ai', label: 'AI Studio', icon: '', divider: true },
  divider_admin: { id: 'divider_admin', label: 'Administration', icon: '', divider: true },

  // Personal context
  my_notes: { id: 'my_notes', label: 'My Notes', icon: 'file-text', route: '/notes' },
  files: { id: 'files', label: 'Files', icon: 'folder', route: '/files' },
  assessments: { id: 'assessments', label: 'Assessments', icon: 'clipboard-check', route: '/assessments' },
  progress: { id: 'progress', label: 'Progress', icon: 'trending-up', route: '/progress' },
  join_org: { id: 'join_org', label: 'Join Organization', icon: 'user-plus', route: '/join-org' },
  admin: { id: 'admin', label: 'Admin', icon: 'shield', route: '/admin/dashboard' },

  // Org context
  my_courses: { id: 'my_courses', label: 'My Courses', icon: 'book-open', route: '/courses' },
  paths: { id: 'paths', label: 'Learning Paths', icon: 'map', route: '/paths' },
  analytics: { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2', route: '/analytics' },
  discussions: { id: 'discussions', label: 'Discussions', icon: 'message-circle', route: '/discussions' },
  announcements: { id: 'announcements', label: 'Announcements', icon: 'megaphone', route: '/announcements' },

  // Course context
  back_to_courses: { id: 'back_to_courses', label: 'Back to Courses', icon: 'arrow-left', route: '/courses' },
  course_home: { id: 'course_home', label: 'Course Home', icon: 'home', route: '/course/home' },
  course_player: { id: 'course_player', label: 'Course Player', icon: 'play-circle', route: '/course/player' },
  course_outline: { id: 'course_outline', label: 'Outline', icon: 'list', route: '/course/outline' },
  course_resources: { id: 'course_resources', label: 'Resources', icon: 'folder-open', route: '/course/resources' },
  notes: { id: 'notes', label: 'Notes', icon: 'edit-3', route: '/course/notes' },

  // Path context
  back_to_paths: { id: 'back_to_paths', label: 'Back to Paths', icon: 'arrow-left', route: '/paths' },
  path_overview: { id: 'path_overview', label: 'Overview', icon: 'layout', route: '/path/overview' },
  current_course: { id: 'current_course', label: 'Current Course', icon: 'book-open', route: '/path/current' },
  milestones: { id: 'milestones', label: 'Milestones', icon: 'flag', route: '/path/milestones' },

  // Admin context
  back_to_workspace: { id: 'back_to_workspace', label: 'Back to Workspace', icon: 'arrow-left', route: '/' },
  get_started: { id: 'get_started', label: 'Get Started', icon: 'compass', route: '/admin/get-started' },
  dashboard: { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', route: '/admin/dashboard' },
  courses: { id: 'courses', label: 'Courses', icon: 'graduation-cap', route: '/admin/courses' },
  content_library: { id: 'content_library', label: 'Content Library', icon: 'library', route: '/admin/content' },
  genie: { id: 'genie', label: 'Genie', icon: 'brain', route: '/admin/genie', badge: 'AI' },
  ai_bot: { id: 'ai_bot', label: 'AI Bot', icon: 'bot', route: '/admin/genie/ai-bot' },
  genie_guided: {
    id: 'genie_guided',
    label: 'Guided ADDIE',
    icon: 'flag',
    route: '/admin/genie-guided',
    badge: 'Primary'
  },
  genie_studio: {
    id: 'genie_studio',
    label: 'Genie Studio',
    icon: 'layout',
    route: '/admin/genie/studio',
    badge: 'Beta'
  },
  genie_sources: {
    id: 'genie_sources',
    label: 'Genie Sources',
    icon: 'folder-open',
    route: '/admin/genie/sources',
    badge: 'Beta'
  },
  els_studio: { id: 'els_studio', label: 'ELS Studio', icon: 'sparkles', route: '/admin/enterprise' },
  genie_ingestion: { id: 'genie_ingestion', label: 'Content Ingestion & Preprocessing', icon: 'folder-open', route: '/admin/genie/ingestion', badge: 'Beta' },
  genie_analyze: { id: 'genie_analyze', label: 'Analyze (ADDIE)', icon: 'bar-chart-2', route: '/admin/genie/analyze', badge: 'Beta' },
  genie_design: { id: 'genie_design', label: 'Design (ADDIE + Adult Learning + Learning Pyramid)', icon: 'layout', route: '/admin/genie/design', badge: 'Beta' },
  genie_develop: { id: 'genie_develop', label: 'Develop (ADDIE + AI Content + Assessment)', icon: 'edit-3', route: '/admin/genie/develop', badge: 'Beta' },
  genie_implement: { id: 'genie_implement', label: 'Implement (ADDIE + Delivery)', icon: 'play-circle', route: '/admin/genie/implement', badge: 'Beta' },
  genie_evaluate: { id: 'genie_evaluate', label: 'Evaluate (ADDIE + Outcomes)', icon: 'trending-up', route: '/admin/genie/evaluate', badge: 'Beta' },
  genie_personalisation: { id: 'genie_personalisation', label: 'Personalisation & Adaptivity', icon: 'map', route: '/admin/genie/personalisation', badge: 'Internal' },
  genie_manager_portal: { id: 'genie_manager_portal', label: 'Manager & Stakeholder Portal', icon: 'users', route: '/admin/genie/manager-portal', badge: 'Internal' },
  genie_governance: { id: 'genie_governance', label: 'System Governance & Monitoring', icon: 'shield', route: '/admin/genie/governance', badge: 'Internal' },
  competencies: { id: 'competencies', label: 'Competency Framework', icon: 'brain', route: '/admin/competencies' },
  gap_engine: { id: 'gap_engine', label: 'Gap Intelligence', icon: 'zap', route: '/admin/gap-engine' },
  digital_twins: { id: 'digital_twins', label: 'Digital Twins', icon: 'users-2', route: '/admin/digital-twins' },
  predictions: { id: 'predictions', label: 'Predictive Analytics', icon: 'bar-chart-2', route: '/admin/predictions' },
  forecasting: { id: 'forecasting', label: 'Org Forecasting', icon: 'trending-up', route: '/admin/forecasting' },
  governance: { id: 'governance', label: 'AI Governance', icon: 'shield-check', route: '/admin/governance' },
  users: { id: 'users', label: 'Users', icon: 'users', route: '/admin/users' },
  teams: { id: 'teams', label: 'Teams', icon: 'users-2', route: '/admin/teams' },
  departments: { id: 'departments', label: 'Departments', icon: 'building-2', route: '/admin/departments' },
  reports: { id: 'reports', label: 'Reports', icon: 'file-bar-chart', route: '/admin/reports' },
  audit_logs: { id: 'audit_logs', label: 'Audit Logs', icon: 'scroll-text', route: '/admin/audit-logs' },
  exports: { id: 'exports', label: 'Data Exports', icon: 'download', route: '/admin/exports' },
  integrations: { id: 'integrations', label: 'Integrations', icon: 'link-2', route: '/admin/integrations' },
  security: { id: 'security', label: 'Security & MFA', icon: 'shield-check', route: '/admin/security' },
  bulk_import: { id: 'bulk_import', label: 'Bulk Import', icon: 'user-plus', route: '/admin/bulk-import' },
  enrollments: { id: 'enrollments', label: 'Enrollments', icon: 'clipboard-check', route: '/admin/enrollments' },
  assignments: { id: 'assignments', label: 'Assignments', icon: 'file-text', route: '/admin/assignments' },
  quizzes: { id: 'quizzes', label: 'Assessments', icon: 'clipboard-check', route: '/admin/quizzes' },
  route_map: { id: 'route_map', label: 'Route Map', icon: 'map', route: '/admin/route-map' },
  settings: { id: 'settings', label: 'Settings', icon: 'settings', route: '/admin/settings' }
};

// ============================================================================
// RIGHT PANEL TAB DEFINITIONS
// ============================================================================

export interface RightPanelTab {
  id: string;
  label: string;
  icon: string;
}

export const rightPanelTabs: Record<string, RightPanelTab> = {
  notes: { id: 'notes', label: 'Notes', icon: 'file-text' },
  files: { id: 'files', label: 'Files', icon: 'folder' },
  assessments: { id: 'assessments', label: 'Assessments', icon: 'clipboard-check' },
  progress: { id: 'progress', label: 'Progress', icon: 'trending-up' },
  analytics: { id: 'analytics', label: 'Analytics', icon: 'bar-chart-2' },
  materials: { id: 'materials', label: 'Materials', icon: 'folder-open' },
  discussions: { id: 'discussions', label: 'Discussions', icon: 'message-circle' },
  milestones: { id: 'milestones', label: 'Milestones', icon: 'flag' },
  certificates: { id: 'certificates', label: 'Certificates', icon: 'award' },
  reports: { id: 'reports', label: 'Reports', icon: 'file-bar-chart' },
  audit_log: { id: 'audit_log', label: 'Audit Log', icon: 'scroll-text' },
  quick_actions: { id: 'quick_actions', label: 'Quick Actions', icon: 'zap' }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getNavItemsForContext(context: AppContextType): NavigationItem[] {
  const config = contextConfigs[context];
  return config.nav
    .map(id => navigationItems[id])
    .filter(Boolean);
}

export function getRightPanelTabsForContext(context: AppContextType): RightPanelTab[] {
  const config = contextConfigs[context];
  return config.rightPanelTabs
    .map(id => rightPanelTabs[id])
    .filter(Boolean);
}

export function canAccessContext(role: UserRole, context: AppContextType): boolean {
  return roleContextAccess[role]?.includes(context) ?? false;
}

export function getDefaultContextForRole(role: UserRole): AppContextType {
  return roleContextAccess[role]?.[0] ?? 'personal';
}

export function shouldShowNavItem(itemId: string, role: UserRole): boolean {
  const featureKey = navFeatureMap[itemId];
  if (featureKey && !isEnterpriseFeatureEnabled(featureKey)) {
    return false;
  }
  const rule = navigationRules.navVisibility[itemId];
  if (!rule) return true;
  return rule.visibleIfRoleIn.includes(role);
}
