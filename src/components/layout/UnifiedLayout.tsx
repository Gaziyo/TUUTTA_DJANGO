// ============================================================================
// UNIFIED LAYOUT COMPONENT
// Main layout that adapts based on app context
// ============================================================================

import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import {
  GraduationCap,
  Settings,
  LogIn,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Crown,
  Bell,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useStore } from '../../store';
import { useAuthStore } from '../../lib/authStore';
import { useAppContext } from '../../context/AppContext';
import LeftNavigation from './LeftNavigation';
import AppFooter from './AppFooter';

// Lazy load components
const FloatingAIAssistant = lazy(() => import('../FloatingAIAssistant'));

interface UnifiedLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  initialRightPanelOpen?: boolean;
  onAuthModalOpen?: (mode: 'login' | 'register') => void;
  onSettingsOpen?: () => void;
  onGamificationOpen?: () => void;
}

export default function UnifiedLayout({
  children,
  rightPanel,
  initialRightPanelOpen = true,
  onAuthModalOpen,
  onSettingsOpen,
  onGamificationOpen
}: UnifiedLayoutProps) {
  const {
    currentContext,
    currentRoute,
    isLeftNavCollapsed,
    isLeftNavPinned,
    isRightPanelOpen,
    aiTutorConfig,
    isAITutorMinimized,
    orgContext,
    courseContext,
    pathContext,
    breadcrumbs,
    navigate,
    toggleLeftNav,
    toggleLeftNavPinned,
    toggleRightPanel,
    toggleAITutor,
    canAccessAdmin,
    openAdmin,
    exitAdmin,
    exitCourse,
    exitPath
  } = useAppContext();

  const {
    user,
    setUser,
    getUserLevel,
    getUserXP
  } = useStore();

  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';
  const userLevel = getUserLevel();
  const userXP = getUserXP();

  // Local state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [hasInitializedRightPanel, setHasInitializedRightPanel] = useState(false);

  // Refs
  const userMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0 });
    }
  }, [currentRoute]);

  useEffect(() => {
    if (!hasInitializedRightPanel) {
      if (rightPanel && !initialRightPanelOpen && isRightPanelOpen) {
        toggleRightPanel();
      }
      setHasInitializedRightPanel(true);
    }
  }, [hasInitializedRightPanel, initialRightPanelOpen, isRightPanelOpen, rightPanel, toggleRightPanel]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get context label
  const getContextLabel = () => {
    switch (currentContext) {
      case 'course':
        return courseContext?.courseName || 'Course';
      case 'path':
        return pathContext?.pathName || 'Learning Path';
      case 'admin':
        return 'Admin';
      case 'org':
        return orgContext?.orgName || 'Organization';
      default:
        return 'Personal';
    }
  };

  // Handle logout
  const handleLogout = () => {
    useAuthStore.getState().logout();
    setUser(null);
    navigate('/');
    setShowUserMenu(false);
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <header className={`h-16 flex items-center justify-between px-4 border-b ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } z-50`}>
        {/* Left: Logo + Menu Toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className={`md:hidden p-2 rounded-lg ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Desktop Nav Toggle */}
          <div className="hidden md:flex items-center gap-1" />

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-bold hidden sm:block ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Tuutta
            </span>
          </div>

          {/* Context Indicator / Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="hidden md:flex items-center gap-1 ml-4">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                  )}
                  {crumb.route ? (
                    <button
                      onClick={() => {
                        if (crumb.route === '/courses') exitCourse();
                        else if (crumb.route === '/paths') exitPath();
                        else if (crumb.route === '/') exitAdmin();
                      }}
                      className={`text-sm ${
                        isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Context Selector (when no breadcrumbs) */}
          {breadcrumbs.length === 0 && orgContext && (
            <div className="relative ml-4" ref={contextMenuRef}>
              <button
                onClick={() => setShowContextMenu(!showContextMenu)}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{getContextLabel()}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showContextMenu && (
                <div className={`absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg border ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowContextMenu(false);
                        // Switch to personal context would go here
                      }}
                      className={`w-full px-4 py-2 text-left text-sm ${
                        isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Personal
                    </button>
                    {orgContext && (
                      <button
                        onClick={() => setShowContextMenu(false)}
                        className={`w-full px-4 py-2 text-left text-sm ${
                          isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {orgContext.orgName}
                      </button>
                    )}
                    {canAccessAdmin && (
                      <>
                        <div className={`border-t my-1 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
                        <button
                          onClick={() => {
                            setShowContextMenu(false);
                            openAdmin();
                          }}
                          className={`w-full px-4 py-2 text-left text-sm ${
                            isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          Admin Portal
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-2">
          {/* Gamification (logged in users) */}
          {user && (
            <button
              onClick={onGamificationOpen}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                isDarkMode
                  ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 text-amber-400 hover:from-amber-900/40 hover:to-orange-900/40'
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-600 hover:from-amber-100 hover:to-orange-100'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">Level {userLevel.level}</span>
              <span className={`text-xs ${isDarkMode ? 'text-amber-500' : 'text-amber-500'}`}>
                {userXP} XP
              </span>
            </button>
          )}

          {/* Notifications */}
          {user && (
            <button
              className={`p-2 rounded-lg relative ${
                isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          )}

          {/* Settings */}
          <button
            onClick={onSettingsOpen}
            className={`p-2 rounded-lg ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Right Panel Toggle */}
          <div className="hidden md:flex items-center gap-1" />

          {/* User Menu / Login */}
          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 p-1.5 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                  {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <ChevronDown className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>

              {showUserMenu && (
                <div className={`absolute right-0 top-full mt-1 w-56 rounded-lg shadow-lg border ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {user.displayName || 'User'}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {user.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onSettingsOpen?.();
                      }}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                        isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    {canAccessAdmin && currentContext !== 'admin' && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          openAdmin();
                        }}
                        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                          isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Crown className="w-4 h-4" />
                        Admin Portal
                      </button>
                    )}
                    <div className={`border-t my-1 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
                    <button
                      onClick={handleLogout}
                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                        isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'
                      }`}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onAuthModalOpen?.('login')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN LAYOUT */}
      {/* ================================================================== */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Navigation */}
        <LeftNavigation
          isCollapsed={isLeftNavCollapsed}
          isMobileOpen={showMobileMenu}
          onMobileClose={() => setShowMobileMenu(false)}
          isDarkMode={isDarkMode}
          isPinned={isLeftNavPinned}
          onToggleCollapse={toggleLeftNav}
          onTogglePin={toggleLeftNavPinned}
        />

        {/* Main Content Area */}
        <main
          ref={mainRef}
          className={`flex-1 h-full overflow-auto min-h-0 ${
          isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}
        >
          <div className="min-h-full flex flex-col">
            {children}
            <AppFooter isDarkMode={isDarkMode} onNavigate={navigate} />
          </div>
        </main>

        {/* Right Panel */}
        {isRightPanelOpen && rightPanel && (
          <aside className={`hidden md:block w-80 lg:w-96 border-l overflow-auto ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            {rightPanel}
          </aside>
        )}

        {rightPanel && (
          <button
            onClick={toggleRightPanel}
            className={`hidden md:flex items-center justify-center w-8 h-10 rounded-l-lg border shadow-sm fixed top-1/2 -translate-y-1/2 ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
            style={{ right: isRightPanelOpen ? 'var(--right-panel-width)' : '0px' }}
            title={isRightPanelOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {isRightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* ================================================================== */}
      {/* FLOATING AI ASSISTANT */}
      {/* ================================================================== */}
      {aiTutorConfig.floating && (
        <Suspense fallback={null}>
          <FloatingAIAssistant
            isMinimized={isAITutorMinimized}
            onToggle={toggleAITutor}
            isDarkMode={isDarkMode}
            contextAware={aiTutorConfig.contextAware}
          />
        </Suspense>
      )}
    </div>
  );
}
