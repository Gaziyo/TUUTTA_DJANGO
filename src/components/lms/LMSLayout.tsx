import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  Award,
  BarChart3,
  Settings,
  Bell,
  Calendar,
  FileText,
  FolderOpen,
  Target,
  MessageSquare,
  ClipboardList,
  UserCheck,
  Briefcase,
  Building2,
  Megaphone,
  Clock,
  Star,
  Download,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Trophy,
  Compass,
  Heart
} from 'lucide-react';

export type UserRole = 'admin' | 'instructor' | 'learner';

export type LMSPage =
  // Admin Pages
  | 'admin-dashboard'
  | 'course-management'
  | 'user-management'
  | 'enrollment-management'
  | 'assignment-rules'
  | 'training-assignment'
  | 'learner-progress'
  | 'reports-dashboard'
  | 'report-builder'
  | 'course-builder'
  | 'module-editor'
  | 'lesson-editor'
  | 'quiz-builder'
  | 'gradebook'
  | 'learning-path-builder'
  | 'compliance-dashboard'
  | 'bulk-import'
  | 'instructor-dashboard'
  | 'skills-manager'
  | 'integration-settings'
  | 'content-library'
  | 'survey-builder'
  | 'ilt-sessions'
  | 'teams-management'
  | 'announcements'
  | 'waitlist-management'
  | 'lms-settings'
  // Learner Pages
  | 'learner-dashboard'
  | 'course-catalog'
  | 'my-courses'
  | 'course-player'
  | 'learning-paths'
  | 'certificates'
  | 'discussions'
  | 'notifications'
  | 'training-calendar'
  | 'learner-profile'
  | 'course-reviews'
  | 'resource-library'
  | 'mentoring'
  | 'gamification';

interface NavItem {
  id: LMSPage;
  label: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface LMSLayoutProps {
  children: React.ReactNode;
  currentPage: LMSPage;
  onNavigate: (page: LMSPage) => void;
  userRole: UserRole;
  isDarkMode?: boolean;
  userName?: string;
  userAvatar?: string;
  notificationCount?: number;
}

export const LMSLayout: React.FC<LMSLayoutProps> = ({
  children,
  currentPage,
  onNavigate,
  userRole,
  isDarkMode = false,
  userName = 'User',
  userAvatar,
  notificationCount = 0
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['main', 'courses', 'management']));

  const adminNavSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { id: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: notificationCount },
        { id: 'training-calendar', label: 'Calendar', icon: Calendar }
      ]
    },
    {
      title: 'Courses',
      items: [
        { id: 'course-management', label: 'All Courses', icon: BookOpen },
        { id: 'course-builder', label: 'Course Builder', icon: FileText },
        { id: 'content-library', label: 'Content Library', icon: FolderOpen },
        { id: 'learning-path-builder', label: 'Learning Paths', icon: Target },
        { id: 'quiz-builder', label: 'Quiz Builder', icon: ClipboardList },
        { id: 'survey-builder', label: 'Survey Builder', icon: MessageSquare }
      ]
    },
    {
      title: 'Users & Teams',
      items: [
        { id: 'user-management', label: 'Users', icon: Users },
        { id: 'teams-management', label: 'Teams', icon: Building2 },
        { id: 'enrollment-management', label: 'Enrollments', icon: UserCheck },
        { id: 'waitlist-management', label: 'Waitlists', icon: Clock },
        { id: 'skills-manager', label: 'Skills', icon: Award }
      ]
    },
    {
      title: 'Training',
      items: [
        { id: 'training-assignment', label: 'Assignments', icon: Briefcase },
        { id: 'assignment-rules', label: 'Assignment Rules', icon: Target },
        { id: 'ilt-sessions', label: 'ILT Sessions', icon: Users },
        { id: 'gradebook', label: 'Gradebook', icon: FileText }
      ]
    },
    {
      title: 'Reports',
      items: [
        { id: 'reports-dashboard', label: 'Reports', icon: BarChart3 },
        { id: 'report-builder', label: 'Report Builder', icon: FileText },
        { id: 'learner-progress', label: 'Learner Progress', icon: GraduationCap },
        { id: 'compliance-dashboard', label: 'Compliance', icon: ClipboardList }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'bulk-import', label: 'Bulk Import', icon: Download },
        { id: 'integration-settings', label: 'Integrations', icon: Settings },
        { id: 'lms-settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  const instructorNavSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { id: 'instructor-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: notificationCount },
        { id: 'training-calendar', label: 'Calendar', icon: Calendar }
      ]
    },
    {
      title: 'My Courses',
      items: [
        { id: 'course-management', label: 'My Courses', icon: BookOpen },
        { id: 'course-builder', label: 'Course Builder', icon: FileText },
        { id: 'gradebook', label: 'Gradebook', icon: ClipboardList },
        { id: 'discussions', label: 'Discussions', icon: MessageSquare }
      ]
    },
    {
      title: 'Sessions',
      items: [
        { id: 'ilt-sessions', label: 'ILT Sessions', icon: Users },
        { id: 'learner-progress', label: 'Learner Progress', icon: GraduationCap }
      ]
    }
  ];

  const learnerNavSections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { id: 'learner-dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: notificationCount },
        { id: 'training-calendar', label: 'Calendar', icon: Calendar }
      ]
    },
    {
      title: 'Learning',
      items: [
        { id: 'course-catalog', label: 'Course Catalog', icon: Compass },
        { id: 'my-courses', label: 'My Courses', icon: BookOpen },
        { id: 'learning-paths', label: 'Learning Paths', icon: Target },
        { id: 'course-reviews', label: 'Reviews', icon: Star }
      ]
    },
    {
      title: 'Resources',
      items: [
        { id: 'resource-library', label: 'Resources', icon: Download },
        { id: 'discussions', label: 'Discussions', icon: MessageSquare },
        { id: 'mentoring', label: 'Mentoring', icon: Heart }
      ]
    },
    {
      title: 'Achievements',
      items: [
        { id: 'certificates', label: 'Certificates', icon: Award },
        { id: 'gamification', label: 'Achievements', icon: Trophy },
        { id: 'learner-profile', label: 'My Profile', icon: Users }
      ]
    }
  ];

  const getNavSections = (): NavSection[] => {
    switch (userRole) {
      case 'admin': return adminNavSections;
      case 'instructor': return instructorNavSections;
      case 'learner': return learnerNavSections;
      default: return learnerNavSections;
    }
  };

  const navSections = getNavSections();

  const toggleSection = (title: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(title)) {
      newExpanded.delete(title);
    } else {
      newExpanded.add(title);
    }
    setExpandedSections(newExpanded);
  };

  const handleNavClick = (page: LMSPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const isActive = currentPage === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
          isActive
            ? 'bg-indigo-600 text-white'
            : isDarkMode
            ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        } ${depth > 0 ? 'ml-4' : ''}`}
        style={{ paddingLeft: sidebarCollapsed ? '12px' : `${12 + depth * 16}px` }}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-red-500 text-white'
              }`}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  const renderSidebar = () => (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r`}
    >
      {/* Header */}
      <div className={`h-16 flex items-center justify-between px-4 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <GraduationCap className={`w-8 h-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              LMS
            </span>
          </div>
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`p-2 rounded-lg ${
            isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navSections.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? 'mt-6' : ''}>
            {!sidebarCollapsed && (
              <button
                onClick={() => toggleSection(section.title)}
                className={`w-full flex items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {section.title}
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${
                    expandedSections.has(section.title) ? 'rotate-90' : ''
                  }`}
                />
              </button>
            )}
            {(sidebarCollapsed || expandedSections.has(section.title)) && (
              <div className="mt-1 space-y-1">
                {section.items.map(item => renderNavItem(item))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-full h-full rounded-full object-cover" />
            ) : (
              userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {userName}
              </p>
              <p className={`text-xs capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {userRole}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  const renderMobileMenu = () => (
    <>
      {/* Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
      >
        {/* Header */}
        <div className={`h-16 flex items-center justify-between px-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <GraduationCap className={`w-8 h-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              LMS
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className={`p-2 rounded-lg ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navSections.map((section, idx) => (
            <div key={section.title} className={idx > 0 ? 'mt-6' : ''}>
              <p className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
                {section.title}
              </p>
              <div className="mt-1 space-y-1">
                {section.items.map(item => renderNavItem(item))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
              {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {userName}
              </p>
              <p className={`text-xs capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {userRole}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        {renderSidebar()}
      </div>

      {/* Mobile Menu */}
      {renderMobileMenu()}

      {/* Mobile Header */}
      <header className={`lg:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-20 border-b ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`p-2 rounded-lg ${
            isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <GraduationCap className={`w-7 h-7 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>LMS</span>
        </div>
        <button
          onClick={() => handleNavClick('notifications')}
          className={`p-2 rounded-lg relative ${
            isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <Bell className="w-6 h-6" />
          {notificationCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
      </header>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        } pt-16 lg:pt-0`}
      >
        {children}
      </main>
    </div>
  );
};
