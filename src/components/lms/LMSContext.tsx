import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { LMSPage, UserRole } from './LMSLayout';

interface LMSNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface LMSBreadcrumb {
  label: string;
  page?: LMSPage;
  onClick?: () => void;
}

interface SelectedCourse {
  id: string;
  title: string;
  moduleId?: string;
  lessonId?: string;
}

interface LMSContextValue {
  // Navigation
  currentPage: LMSPage;
  navigateTo: (page: LMSPage) => void;
  goBack: () => void;
  navigationHistory: LMSPage[];
  breadcrumbs: LMSBreadcrumb[];
  setBreadcrumbs: (breadcrumbs: LMSBreadcrumb[]) => void;

  // User & Role
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  userId: string | null;
  userName: string;
  userAvatar?: string;

  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Selected Items
  selectedCourse: SelectedCourse | null;
  setSelectedCourse: (course: SelectedCourse | null) => void;
  selectedUserId: string | null;
  setSelectedUserId: (userId: string | null) => void;

  // Notifications
  notifications: LMSNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<LMSNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;

  // UI State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Modal State
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;

  // Refresh Triggers
  refreshKey: number;
  triggerRefresh: () => void;
}

const LMSContext = createContext<LMSContextValue | undefined>(undefined);

interface LMSProviderProps {
  children: ReactNode;
  initialPage?: LMSPage;
  initialRole?: UserRole;
  initialDarkMode?: boolean;
  userId?: string | null;
  userName?: string;
  userAvatar?: string;
}

export const LMSProvider: React.FC<LMSProviderProps> = ({
  children,
  initialPage = 'learner-dashboard',
  initialRole = 'learner',
  initialDarkMode = false,
  userId = null,
  userName = 'User',
  userAvatar
}) => {
  // Navigation State
  const [currentPage, setCurrentPage] = useState<LMSPage>(initialPage);
  const [navigationHistory, setNavigationHistory] = useState<LMSPage[]>([initialPage]);
  const [breadcrumbs, setBreadcrumbs] = useState<LMSBreadcrumb[]>([]);

  // User State
  const [userRole, setUserRole] = useState<UserRole>(initialRole);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(initialDarkMode);

  // Selected Items
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<LMSNotification[]>([
    {
      id: 'notif-1',
      type: 'info',
      title: 'Welcome to the LMS',
      message: 'Explore courses and start learning today!',
      timestamp: new Date(),
      read: false
    }
  ]);

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Navigation Methods
  const navigateTo = useCallback((page: LMSPage) => {
    setNavigationHistory(prev => [...prev, page]);
    setCurrentPage(page);
  }, []);

  const goBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop();
      setNavigationHistory(newHistory);
      setCurrentPage(newHistory[newHistory.length - 1]);
    }
  }, [navigationHistory]);

  // Theme Methods
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Notification Methods
  const addNotification = useCallback((notification: Omit<LMSNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: LMSNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Modal Methods
  const openModal = useCallback((modalId: string) => {
    setActiveModal(modalId);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  // Refresh Trigger
  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const value: LMSContextValue = {
    // Navigation
    currentPage,
    navigateTo,
    goBack,
    navigationHistory,
    breadcrumbs,
    setBreadcrumbs,

    // User & Role
    userRole,
    setUserRole,
    userId,
    userName,
    userAvatar,

    // Theme
    isDarkMode,
    toggleDarkMode,

    // Selected Items
    selectedCourse,
    setSelectedCourse,
    selectedUserId,
    setSelectedUserId,

    // Notifications
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,

    // UI State
    sidebarCollapsed,
    setSidebarCollapsed,
    isLoading,
    setIsLoading,

    // Modal State
    activeModal,
    openModal,
    closeModal,

    // Refresh Triggers
    refreshKey,
    triggerRefresh
  };

  return (
    <LMSContext.Provider value={value}>
      {children}
    </LMSContext.Provider>
  );
};

export const useLMSContext = (): LMSContextValue => {
  const context = useContext(LMSContext);
  if (context === undefined) {
    throw new Error('useLMSContext must be used within an LMSProvider');
  }
  return context;
};

// Convenience hooks for specific parts of the context
export const useLMSNavigation = () => {
  const { currentPage, navigateTo, goBack, navigationHistory, breadcrumbs, setBreadcrumbs } = useLMSContext();
  return { currentPage, navigateTo, goBack, navigationHistory, breadcrumbs, setBreadcrumbs };
};

export const useLMSUser = () => {
  const { userRole, setUserRole, userId, userName, userAvatar } = useLMSContext();
  return { userRole, setUserRole, userId, userName, userAvatar };
};

export const useLMSTheme = () => {
  const { isDarkMode, toggleDarkMode } = useLMSContext();
  return { isDarkMode, toggleDarkMode };
};

export const useLMSNotifications = () => {
  const { notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications } = useLMSContext();
  return { notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotifications };
};

export const useLMSSelection = () => {
  const { selectedCourse, setSelectedCourse, selectedUserId, setSelectedUserId } = useLMSContext();
  return { selectedCourse, setSelectedCourse, selectedUserId, setSelectedUserId };
};

export const useLMSUI = () => {
  const { sidebarCollapsed, setSidebarCollapsed, isLoading, setIsLoading, activeModal, openModal, closeModal, refreshKey, triggerRefresh } = useLMSContext();
  return { sidebarCollapsed, setSidebarCollapsed, isLoading, setIsLoading, activeModal, openModal, closeModal, refreshKey, triggerRefresh };
};
