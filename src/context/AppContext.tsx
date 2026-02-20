// ============================================================================
// APP CONTEXT PROVIDER
// Central state management for the unified architecture
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLMSStore } from '../store/lmsStore';
import {
  AppContextType,
  UserRole,
  ContextConfig,
  NavigationItem,
  RightPanelTab,
  AITutorConfig,
  contextConfigs,
  getNavItemsForContext,
  getRightPanelTabsForContext,
  canAccessContext,
  shouldShowNavItem,
  navigationItems
} from '../config/appContext';
import { logger } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

interface CourseContext {
  courseId: string;
  courseName: string;
  moduleId?: string;
  lessonId?: string;
}

interface PathContext {
  pathId: string;
  pathName: string;
  currentCourseId?: string;
}

interface OrgContext {
  orgId: string;
  orgName: string;
  memberRole: UserRole;
}

interface AppContextState {
  // Current context
  currentContext: AppContextType;
  previousContext: AppContextType | null;

  // Context-specific data
  orgContext: OrgContext | null;
  courseContext: CourseContext | null;
  pathContext: PathContext | null;

  // User role
  userRole: UserRole;

  // UI State
  isLeftNavCollapsed: boolean;
  isLeftNavPinned: boolean;
  isRightPanelOpen: boolean;
  activeRightPanelTab: string;
  isAITutorMinimized: boolean;

  // Current route
  currentRoute: string;

  // Breadcrumbs
  breadcrumbs: { label: string; route?: string }[];
}

interface AppContextActions {
  // Context switching
  switchContext: (context: AppContextType) => void;

  // Specific context openers
  openCourse: (courseId: string, courseName: string) => void;
  exitCourse: () => void;
  openPath: (pathId: string, pathName: string) => void;
  exitPath: () => void;
  openAdmin: () => void;
  exitAdmin: () => void;
  joinOrg: (orgId: string, orgName: string, role: UserRole) => void;
  leaveOrg: () => void;

  // UI actions
  toggleLeftNav: () => void;
  setLeftNavCollapsed: (collapsed: boolean) => void;
  toggleLeftNavPinned: () => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setActiveRightPanelTab: (tab: string) => void;
  toggleAITutor: () => void;
  setAITutorMinimized: (minimized: boolean) => void;

  // Navigation
  navigate: (route: string) => void;
  setRouteFromUrl: (route: string) => void;
  setContextFromUrl: (context: AppContextType) => void;
  setCourseFromUrl: (courseId: string, courseName?: string) => void;
  setPathFromUrl: (pathId: string, pathName?: string) => void;

  // Lesson/Module navigation (for course context)
  openModule: (moduleId: string) => void;
  openLesson: (lessonId: string) => void;
}

interface AppContextValue extends AppContextState, AppContextActions {
  // Computed values
  contextConfig: ContextConfig;
  navItems: NavigationItem[];
  rightPanelTabs: RightPanelTab[];
  aiTutorConfig: AITutorConfig;
  canAccessAdmin: boolean;
  isInLearningContext: boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AppContext = createContext<AppContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface AppContextProviderProps {
  children: React.ReactNode;
  onNavigate?: (route: string) => void;
}

export function AppContextProvider({ children, onNavigate }: AppContextProviderProps) {
  const { currentOrg, currentMember } = useLMSStore();
  const lmsContextActiveRef = useRef(false);

  // ============================================================================
  // STATE
  // ============================================================================

  const [state, setState] = useState<AppContextState>({
    currentContext: 'personal',
    previousContext: null,
    orgContext: null,
    courseContext: null,
    pathContext: null,
    userRole: 'learner',
    isLeftNavCollapsed: false,
    isLeftNavPinned: true,
    isRightPanelOpen: true,
    activeRightPanelTab: 'notes',
    isAITutorMinimized: false,
    currentRoute: '/',
    breadcrumbs: []
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Restore context from localStorage on mount
  useEffect(() => {
    const savedContext = localStorage.getItem('tuutta_app_context');
    if (savedContext) {
      try {
        const parsed = JSON.parse(savedContext);
        setState(prev => ({
          ...prev,
          currentContext: parsed.currentContext || 'personal',
          orgContext: parsed.orgContext || null,
          userRole: parsed.userRole || 'learner',
          isLeftNavCollapsed: parsed.isLeftNavCollapsed ?? false,
          isLeftNavPinned: parsed.isLeftNavPinned ?? true,
          isRightPanelOpen: parsed.isRightPanelOpen ?? true
        }));
      } catch (e) {
        console.error('Failed to restore app context:', e);
      }
    }
  }, []);

  // Save context to localStorage on change
  useEffect(() => {
    const toSave = {
      currentContext: state.currentContext,
      orgContext: state.orgContext,
      userRole: state.userRole,
      isLeftNavCollapsed: state.isLeftNavCollapsed,
      isLeftNavPinned: state.isLeftNavPinned,
      isRightPanelOpen: state.isRightPanelOpen
    };
    localStorage.setItem('tuutta_app_context', JSON.stringify(toSave));
  }, [state.currentContext, state.orgContext, state.userRole, state.isLeftNavCollapsed, state.isLeftNavPinned, state.isRightPanelOpen]);

  // Sync context from LMS store when available
  useEffect(() => {
    const hasLmsContext = Boolean(currentOrg || currentMember);

    if (hasLmsContext) {
      lmsContextActiveRef.current = true;
      setState(prev => {
        const nextOrgContext = currentOrg
          ? { orgId: currentOrg.id, orgName: currentOrg.name, memberRole: currentMember?.role ?? prev.userRole }
          : prev.orgContext;
        const nextUserRole = currentMember?.role ?? prev.userRole;

        return {
          ...prev,
          orgContext: nextOrgContext,
          userRole: nextUserRole,
          currentContext: prev.currentContext === 'personal' && currentOrg ? 'org' : prev.currentContext
        };
      });
      return;
    }

    if (lmsContextActiveRef.current) {
      lmsContextActiveRef.current = false;
      setState(prev => ({
        ...prev,
        currentContext: ['org', 'admin', 'course', 'path'].includes(prev.currentContext) ? 'personal' : prev.currentContext,
        orgContext: null,
        courseContext: null,
        pathContext: null,
        userRole: 'learner',
        breadcrumbs: []
      }));
    }
  }, [currentOrg, currentMember]);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setState(prev => ({
          ...prev,
          isLeftNavCollapsed: true,
          isRightPanelOpen: false
        }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const switchContext = useCallback((context: AppContextType) => {
    if (!canAccessContext(state.userRole, context)) {
      logger.warn(`User role ${state.userRole} cannot access context ${context}`);
      return;
    }

    const resolveRoute = (route: string) => {
      if (route.startsWith('/')) return route;
      return navigationItems[route]?.route || `/${route}`;
    };

    setState(prev => ({
      ...prev,
      previousContext: prev.currentContext,
      currentContext: context,
      activeRightPanelTab: contextConfigs[context].rightPanelTabs[0] || 'notes',
      breadcrumbs: [],
      currentRoute: resolveRoute(contextConfigs[context].defaultRoute)
    }));

    // Navigate to default route for context
    const defaultRoute = resolveRoute(contextConfigs[context].defaultRoute);
    if (onNavigate) {
      onNavigate(defaultRoute);
    }
  }, [state.userRole, onNavigate]);

  const openCourse = useCallback((courseId: string, courseName: string) => {
    setState(prev => ({
      ...prev,
      previousContext: prev.currentContext,
      currentContext: 'course',
      courseContext: { courseId, courseName },
      activeRightPanelTab: 'notes',
      currentRoute: `/course/${courseId}/home`,
      breadcrumbs: [
        { label: prev.orgContext?.orgName || 'Workspace', route: '/' },
        { label: 'My Courses', route: '/courses' },
        { label: courseName }
      ]
    }));
    if (onNavigate) {
      onNavigate(`/course/${courseId}/home`);
    }
  }, [onNavigate]);

  const exitCourse = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentContext: prev.orgContext ? 'org' : 'personal',
      courseContext: null,
      breadcrumbs: []
    }));
    if (onNavigate) {
      onNavigate('/courses');
    }
  }, [onNavigate]);

  const openPath = useCallback((pathId: string, pathName: string) => {
    setState(prev => ({
      ...prev,
      previousContext: prev.currentContext,
      currentContext: 'path',
      pathContext: { pathId, pathName },
      activeRightPanelTab: 'progress',
      currentRoute: `/path/${pathId}/overview`,
      breadcrumbs: [
        { label: prev.orgContext?.orgName || 'Workspace', route: '/' },
        { label: 'Learning Paths', route: '/paths' },
        { label: pathName }
      ]
    }));
    if (onNavigate) {
      onNavigate(`/path/${pathId}/overview`);
    }
  }, [onNavigate]);

  const exitPath = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentContext: prev.orgContext ? 'org' : 'personal',
      pathContext: null,
      breadcrumbs: []
    }));
    if (onNavigate) {
      onNavigate('/paths');
    }
  }, [onNavigate]);

  const openAdmin = useCallback(() => {
    if (!canAccessContext(state.userRole, 'admin')) {
      logger.warn('User does not have admin access');
      return;
    }

    setState(prev => ({
      ...prev,
      previousContext: prev.currentContext,
      currentContext: 'admin',
      activeRightPanelTab: 'analytics',
      currentRoute: '/admin/get-started',
      breadcrumbs: [
        { label: prev.orgContext?.orgName || 'Workspace', route: '/' },
        { label: 'Admin' }
      ]
    }));
  }, [state.userRole]);

  const exitAdmin = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentContext: prev.orgContext ? 'org' : 'personal',
      breadcrumbs: []
    }));
  }, []);

  const joinOrg = useCallback((orgId: string, orgName: string, role: UserRole) => {
    setState(prev => ({
      ...prev,
      currentContext: 'org',
      orgContext: { orgId, orgName, memberRole: role },
      userRole: role,
      breadcrumbs: []
    }));
  }, []);

  const leaveOrg = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentContext: 'personal',
      orgContext: null,
      courseContext: null,
      pathContext: null,
      userRole: 'learner',
      breadcrumbs: []
    }));
  }, []);

  const toggleLeftNav = useCallback(() => {
    setState(prev => {
      if (prev.isLeftNavPinned && !prev.isLeftNavCollapsed) {
        return { ...prev, isLeftNavPinned: false, isLeftNavCollapsed: true };
      }
      return { ...prev, isLeftNavCollapsed: !prev.isLeftNavCollapsed };
    });
  }, []);

  const setLeftNavCollapsed = useCallback((collapsed: boolean) => {
    setState(prev => ({ ...prev, isLeftNavCollapsed: collapsed }));
  }, []);

  const toggleLeftNavPinned = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLeftNavPinned: !prev.isLeftNavPinned,
      isLeftNavCollapsed: prev.isLeftNavPinned ? prev.isLeftNavCollapsed : false
    }));
  }, []);

  const toggleRightPanel = useCallback(() => {
    setState(prev => ({ ...prev, isRightPanelOpen: !prev.isRightPanelOpen }));
  }, []);

  const setRightPanelOpen = useCallback((open: boolean) => {
    setState(prev => ({ ...prev, isRightPanelOpen: open }));
  }, []);

  const setActiveRightPanelTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeRightPanelTab: tab }));
  }, []);

  const toggleAITutor = useCallback(() => {
    setState(prev => ({ ...prev, isAITutorMinimized: !prev.isAITutorMinimized }));
  }, []);

  const setAITutorMinimized = useCallback((minimized: boolean) => {
    setState(prev => ({ ...prev, isAITutorMinimized: minimized }));
  }, []);

  const normalizeRoute = useCallback((route: string) => {
    if (route.startsWith('/')) return route;
    return navigationItems[route]?.route || `/${route}`;
  }, []);

  const navigate = useCallback((route: string) => {
    let targetRoute = normalizeRoute(route);
    if (targetRoute.startsWith('/course/') && state.courseContext?.courseId) {
      const suffix = targetRoute.replace('/course', '');
      targetRoute = `/course/${state.courseContext.courseId}${suffix}`;
    }
    if (targetRoute.startsWith('/path/') && state.pathContext?.pathId) {
      const suffix = targetRoute.replace('/path', '');
      targetRoute = `/path/${state.pathContext.pathId}${suffix}`;
    }
    setState(prev => ({ ...prev, currentRoute: targetRoute }));
    if (onNavigate) {
      onNavigate(targetRoute);
    }
  }, [onNavigate, normalizeRoute, state.courseContext, state.pathContext]);

  const setRouteFromUrl = useCallback((route: string) => {
    const nextRoute = route || '/';
    setState(prev => (prev.currentRoute === nextRoute ? prev : { ...prev, currentRoute: nextRoute }));
  }, []);

  const setContextFromUrl = useCallback((context: AppContextType) => {
    if (!canAccessContext(state.userRole, context)) {
      return;
    }
    setState(prev => {
      const allowedTabs = contextConfigs[context].rightPanelTabs;
      if (prev.currentContext === context && allowedTabs.includes(prev.activeRightPanelTab)) {
        return prev;
      }
      const nextTab = allowedTabs.includes(prev.activeRightPanelTab)
        ? prev.activeRightPanelTab
        : (allowedTabs[0] || prev.activeRightPanelTab);
      return {
        ...prev,
        currentContext: context,
        activeRightPanelTab: nextTab
      };
    });
  }, [state.userRole]);

  const setCourseFromUrl = useCallback((courseId: string, courseName?: string) => {
    setState(prev => {
      const nextCourseName = courseName || prev.courseContext?.courseName || 'Course';
      const isSameCourse = prev.currentContext === 'course' && prev.courseContext?.courseId === courseId;
      const allowedTabs = contextConfigs.course.rightPanelTabs;
      const nextTab = allowedTabs.includes(prev.activeRightPanelTab)
        ? prev.activeRightPanelTab
        : 'notes';

      if (isSameCourse && prev.courseContext?.courseName === nextCourseName && prev.activeRightPanelTab === nextTab) {
        return prev;
      }

      return {
        ...prev,
        currentContext: 'course',
        courseContext: {
          courseId,
          courseName: nextCourseName
        },
        activeRightPanelTab: nextTab
      };
    });
  }, []);

  const setPathFromUrl = useCallback((pathId: string, pathName?: string) => {
    setState(prev => {
      const nextPathName = pathName || prev.pathContext?.pathName || 'Learning Path';
      const isSamePath = prev.currentContext === 'path' && prev.pathContext?.pathId === pathId;
      const allowedTabs = contextConfigs.path.rightPanelTabs;
      const nextTab = allowedTabs.includes(prev.activeRightPanelTab)
        ? prev.activeRightPanelTab
        : 'progress';

      if (isSamePath && prev.pathContext?.pathName === nextPathName && prev.activeRightPanelTab === nextTab) {
        return prev;
      }

      return {
        ...prev,
        currentContext: 'path',
        pathContext: {
          pathId,
          pathName: nextPathName
        },
        activeRightPanelTab: nextTab
      };
    });
  }, []);

  const openModule = useCallback((moduleId: string) => {
    setState(prev => ({
      ...prev,
      courseContext: prev.courseContext
        ? { ...prev.courseContext, moduleId, lessonId: undefined }
        : null
    }));
  }, []);

  const openLesson = useCallback((lessonId: string) => {
    setState(prev => ({
      ...prev,
      courseContext: prev.courseContext
        ? { ...prev.courseContext, lessonId }
        : null
    }));
  }, []);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const contextConfig = useMemo(() =>
    contextConfigs[state.currentContext],
    [state.currentContext]
  );

  const navItems = useMemo(() => {
    const items = getNavItemsForContext(state.currentContext);
    const filtered = items.filter(item =>
      item.divider || shouldShowNavItem(item.id, state.userRole)
    );

    // Keep admin tabs visible for admins while in org context.
    let merged = filtered;
    if (state.currentContext === 'org' && canAccessContext(state.userRole, 'admin')) {
      const existingIds = new Set(filtered.map(item => item.id));
      const adminItems = getNavItemsForContext('admin')
        .filter(item => item.id !== 'back_to_workspace')
        .filter(item => item.divider || shouldShowNavItem(item.id, state.userRole))
        .filter(item => !existingIds.has(item.id));
      merged = [...filtered, ...adminItems];
    }

    // Final pass to ensure unique ids (prevents duplicate key warnings).
    const seen = new Set<string>();
    return merged.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [state.currentContext, state.userRole]);

  const rightPanelTabs = useMemo(() =>
    getRightPanelTabsForContext(state.currentContext),
    [state.currentContext]
  );

  const aiTutorConfig = useMemo(() =>
    contextConfig.aiTutor,
    [contextConfig]
  );

  const canAccessAdmin = useMemo(() =>
    canAccessContext(state.userRole, 'admin'),
    [state.userRole]
  );

  const isInLearningContext = useMemo(() =>
    state.currentContext === 'course' || state.currentContext === 'path',
    [state.currentContext]
  );

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================

  const value: AppContextValue = useMemo(() => ({
    // State
    ...state,

    // Actions
    switchContext,
    openCourse,
    exitCourse,
    openPath,
    exitPath,
    openAdmin,
    exitAdmin,
    joinOrg,
    leaveOrg,
    toggleLeftNav,
    setLeftNavCollapsed,
    toggleLeftNavPinned,
    toggleRightPanel,
    setRightPanelOpen,
    setActiveRightPanelTab,
    toggleAITutor,
    setAITutorMinimized,
    navigate,
    setRouteFromUrl,
    setContextFromUrl,
    setCourseFromUrl,
    setPathFromUrl,
    openModule,
    openLesson,

    // Computed
    contextConfig,
    navItems,
    rightPanelTabs,
    aiTutorConfig,
    canAccessAdmin,
    isInLearningContext
  }), [
    state,
    switchContext,
    openCourse,
    exitCourse,
    openPath,
    exitPath,
    openAdmin,
    exitAdmin,
    joinOrg,
    leaveOrg,
    toggleLeftNav,
    setLeftNavCollapsed,
    toggleLeftNavPinned,
    toggleRightPanel,
    setRightPanelOpen,
    setActiveRightPanelTab,
    toggleAITutor,
    setAITutorMinimized,
    navigate,
    setRouteFromUrl,
    setContextFromUrl,
    setCourseFromUrl,
    setPathFromUrl,
    openModule,
    openLesson,
    contextConfig,
    navItems,
    rightPanelTabs,
    aiTutorConfig,
    canAccessAdmin,
    isInLearningContext
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
}

// ============================================================================
// SELECTOR HOOKS (for performance optimization)
// ============================================================================

export function useCurrentContext(): AppContextType {
  const { currentContext } = useAppContext();
  return currentContext;
}

export function useNavItems(): NavigationItem[] {
  const { navItems } = useAppContext();
  return navItems;
}

export function useRightPanelTabs(): RightPanelTab[] {
  const { rightPanelTabs } = useAppContext();
  return rightPanelTabs;
}

export function useAITutorConfig(): AITutorConfig {
  const { aiTutorConfig } = useAppContext();
  return aiTutorConfig;
}

export function useCourseContext() {
  const { courseContext, currentContext } = useAppContext();
  return currentContext === 'course' ? courseContext : null;
}

export function usePathContext() {
  const { pathContext, currentContext } = useAppContext();
  return currentContext === 'path' ? pathContext : null;
}

export function useOrgContext() {
  const { orgContext } = useAppContext();
  return orgContext;
}
