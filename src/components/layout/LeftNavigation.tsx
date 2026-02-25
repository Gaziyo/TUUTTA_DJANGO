// ============================================================================
// LEFT NAVIGATION COMPONENT
// Context-aware navigation sidebar
// ============================================================================

import React from 'react';
import {
  Home,
  MessageSquare,
  FileText,
  Folder,
  ClipboardCheck,
  TrendingUp,
  UserPlus,
  BookOpen,
  Map,
  BarChart2,
  MessageCircle,
  Megaphone,
  ArrowLeft,
  PlayCircle,
  List,
  FolderOpen,
  Edit3,
  Layout,
  Flag,
  LayoutDashboard,
  GraduationCap,
  Library,
  Users,
  Users2,
  Building2,
  FileBarChart,
  Bot,
  Settings,
  Award,
  ScrollText,
  Zap,
  Shield,
  ShieldCheck,
  Compass,
  Brain,
  Sparkles,
  Link2,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff
} from 'lucide-react';
import { useAppContext, useNavItems } from '../../context/AppContext';
import { NavigationItem } from '../../config/appContext';

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  'message-square': MessageSquare,
  'file-text': FileText,
  folder: Folder,
  'clipboard-check': ClipboardCheck,
  'trending-up': TrendingUp,
  'user-plus': UserPlus,
  'book-open': BookOpen,
  map: Map,
  'bar-chart-2': BarChart2,
  'message-circle': MessageCircle,
  megaphone: Megaphone,
  'arrow-left': ArrowLeft,
  'play-circle': PlayCircle,
  list: List,
  'folder-open': FolderOpen,
  'edit-3': Edit3,
  layout: Layout,
  flag: Flag,
  'layout-dashboard': LayoutDashboard,
  'graduation-cap': GraduationCap,
  library: Library,
  users: Users,
  'users-2': Users2,
  'building-2': Building2,
  'file-bar-chart': FileBarChart,
  bot: Bot,
  settings: Settings,
  award: Award,
  'scroll-text': ScrollText,
  zap: Zap,
  shield: Shield,
  'shield-check': ShieldCheck,
  compass: Compass,
  brain: Brain,
  sparkles: Sparkles,
  'link-2': Link2,
  download: Download
};

interface LeftNavigationProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isDarkMode: boolean;
  isPinned: boolean;
  onToggleCollapse: () => void;
  onTogglePin: () => void;
}

export default function LeftNavigation({
  isCollapsed,
  isMobileOpen,
  onMobileClose,
  isDarkMode,
  isPinned,
  onToggleCollapse,
  onTogglePin
}: LeftNavigationProps) {
  const {
    currentContext,
    contextConfig,
    currentRoute,
    navigate,
    courseContext,
    pathContext,
    orgContext,
    exitCourse,
    exitPath,
    exitAdmin,
    openAdmin
  } = useAppContext();
  const navItems = useNavItems();
  const isAdminContext = currentContext === 'admin';

  const adminQuickActions = [
    { label: 'Genie', icon: Brain, route: '/admin/genie' },
    { label: 'AI Bot', icon: Bot, route: '/admin/genie/ai-bot' },
    { label: 'ELS Studio', icon: Sparkles, route: '/admin/enterprise' }
  ];

  // Handle navigation click
  const handleNavClick = (item: NavigationItem) => {
    if (item.divider) return;

    // Handle back navigation
    if (item.id === 'back_to_courses') {
      exitCourse();
      return;
    }
    if (item.id === 'back_to_paths') {
      exitPath();
      return;
    }
    if (item.id === 'back_to_workspace') {
      exitAdmin();
      return;
    }
    if (item.id === 'admin') {
      openAdmin();
      return;
    }

    // Regular navigation
    if (item.route) {
      navigate(item.route);
    }

    // Close mobile menu
    onMobileClose();
  };

  // Check if item is active
  const isActive = (item: NavigationItem) => {
    if (!item.route) return false;
    const normalizeRoute = (route: string) => {
      if (route.startsWith('/course/')) {
        const parts = route.split('/').filter(Boolean);
        if (parts.length >= 3) {
          return `/course/${parts.slice(2).join('/')}`;
        }
      }
      if (route.startsWith('/path/')) {
        const parts = route.split('/').filter(Boolean);
        if (parts.length >= 3) {
          return `/path/${parts.slice(2).join('/')}`;
        }
      }
      return route;
    };

    const normalizedCurrent = normalizeRoute(currentRoute);
    const normalizedItem = normalizeRoute(item.route);
    return normalizedCurrent === normalizedItem || normalizedCurrent.startsWith(normalizedItem + '/');
  };

  // Get icon component
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName];
    return IconComponent || Home;
  };

  // Render nav item
  const renderNavItem = (item: NavigationItem) => {
    if (item.divider) {
      return (
        <div
          key={item.id}
          className={`px-3 py-2 ${isCollapsed ? 'hidden' : ''}`}
        >
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {item.label}
          </span>
        </div>
      );
    }

    const IconComponent = getIcon(item.icon);
    const active = isActive(item);
    const isGenie = item.id === 'genie';
    const isGenieSub =
      item.id.startsWith('genie_') && item.id !== 'genie' && item.id !== 'genie_guided';
    const isBackButton = item.id.startsWith('back_to_');

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item)}
        aria-label={item.label}
        className={`w-full flex items-center gap-3 rounded-lg transition-all ${
          isCollapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'
        } ${
          active
            ? isDarkMode
              ? 'bg-indigo-600/20 text-indigo-400'
              : 'bg-indigo-50 text-indigo-600'
            : isBackButton
              ? isDarkMode
                ? 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              : isDarkMode
                ? 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        } ${!isCollapsed && isGenieSub ? 'pl-8' : ''}`}
        title={isCollapsed ? item.label : undefined}
      >
        <span
          className={`flex items-center justify-center flex-shrink-0 rounded-lg ${
            isCollapsed ? 'w-9 h-9' : 'w-8 h-8'
          } ${isGenie ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : ''}`}
        >
          <IconComponent
            className={`w-5 h-5 ${
              active
                ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                : isGenie
                  ? 'text-white'
                  : ''
            }`}
          />
        </span>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
            {item.badge && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                isDarkMode
                  ? 'bg-indigo-600/30 text-indigo-400'
                  : 'bg-indigo-100 text-indigo-600'
              }`}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  // Desktop sidebar
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Context Header */}
      {!isCollapsed && (
        <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              currentContext === 'admin'
                ? 'bg-purple-500/20 text-purple-500'
                : currentContext === 'course'
                  ? 'bg-green-500/20 text-green-500'
                  : currentContext === 'path'
                    ? 'bg-blue-500/20 text-blue-500'
                    : currentContext === 'org'
                      ? 'bg-indigo-500/20 text-indigo-500'
                      : 'bg-gray-500/20 text-gray-500'
            }`}>
              {(() => {
                const ContextIcon = getIcon(contextConfig.icon);
                return <ContextIcon className="w-4 h-4" />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentContext === 'course'
                  ? courseContext?.courseName
                  : currentContext === 'path'
                    ? pathContext?.pathName
                    : currentContext === 'org'
                      ? orgContext?.orgName
                      : contextConfig.label}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {contextConfig.label}
              </p>
            </div>
            {isAdminContext && (
              <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${
                isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
              }`}>
                Admin Portal
              </span>
            )}
          </div>
        </div>
      )}

      {isAdminContext && !isCollapsed && (
        <div className={`px-3 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            Quick Actions
          </p>
          <div className="grid grid-cols-1 gap-2">
            {adminQuickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  navigate(action.route);
                  onMobileClose();
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isDarkMode
                    ? 'bg-gray-900/50 text-gray-200 hover:bg-gray-700'
                    : 'bg-gray-50 text-gray-700 hover:bg-white border border-gray-200'
                }`}
              >
                <action.icon
                  className={`w-4 h-4 ${
                    action.label === 'Genie'
                      ? 'text-indigo-500'
                      : isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                  }`}
                />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map(renderNavItem)}
      </nav>

      <div className={`px-2 py-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`flex ${isCollapsed ? 'flex-col' : 'flex-row'} items-center gap-2`}>
          <button
            onClick={onToggleCollapse}
            className={`flex items-center justify-center rounded-lg border ${
              isDarkMode
                ? 'border-gray-700 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            } ${isCollapsed ? 'w-10 h-10' : 'w-10 h-9'}`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={onTogglePin}
            className={`flex items-center justify-center rounded-lg border ${
              isDarkMode
                ? 'border-gray-700 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
            } ${isCollapsed ? 'w-10 h-10' : 'w-10 h-9'}`}
            title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
          {!isCollapsed && (
            <span className={`text-xs ml-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Sidebar
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      {!isCollapsed && (
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Tuutta Learning Platform
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r transition-all duration-300 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } ${isCollapsed ? 'w-16' : 'w-64'}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
          />

          {/* Sidebar */}
          <aside
            className={`absolute left-0 top-0 bottom-0 flex flex-col ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } ${isCollapsed ? 'w-20' : 'w-72'}`}
          >
            {/* Mobile Header */}
            <div className={`h-16 flex items-center justify-between px-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              {!isCollapsed && (
                <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Menu
                </span>
              )}
              <button
                onClick={onMobileClose}
                aria-label="Close menu"
                title="Close menu"
                className={`p-2 rounded-lg ml-auto ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {sidebarContent}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
