import React, { useState } from 'react';
import { LMSLayout, LMSPage } from './LMSLayout';
import { LMSPages } from './LMSPages';
import { LMSProvider, useLMSContext } from './LMSContext';

interface AdminLMSHubInnerProps {
  isDarkMode?: boolean;
  userName?: string;
  userAvatar?: string;
  onClose?: () => void;
}

const AdminLMSHubInner: React.FC<AdminLMSHubInnerProps> = ({
  isDarkMode = false,
  userName = 'Admin User',
  userAvatar,
  onClose: _onClose
}) => {
  const { currentPage, navigateTo, selectedCourse, unreadCount } = useLMSContext();

  return (
    <LMSLayout
      currentPage={currentPage}
      onNavigate={navigateTo}
      userRole="admin"
      isDarkMode={isDarkMode}
      userName={userName}
      userAvatar={userAvatar}
      notificationCount={unreadCount}
    >
      <LMSPages
        currentPage={currentPage}
        userRole="admin"
        isDarkMode={isDarkMode}
        onNavigate={navigateTo}
        courseId={selectedCourse?.id}
        moduleId={selectedCourse?.moduleId}
        lessonId={selectedCourse?.lessonId}
      />
    </LMSLayout>
  );
};

interface AdminLMSHubProps {
  isDarkMode?: boolean;
  userName?: string;
  userAvatar?: string;
  userId?: string;
  onClose?: () => void;
}

export const AdminLMSHub: React.FC<AdminLMSHubProps> = ({
  isDarkMode = false,
  userName = 'Admin User',
  userAvatar,
  userId,
  onClose
}) => {
  return (
    <LMSProvider
      initialPage="admin-dashboard"
      initialRole="admin"
      initialDarkMode={isDarkMode}
      userId={userId}
      userName={userName}
      userAvatar={userAvatar}
    >
      <AdminLMSHubInner
        isDarkMode={isDarkMode}
        userName={userName}
        userAvatar={userAvatar}
        onClose={onClose}
      />
    </LMSProvider>
  );
};

// Standalone Admin LMS Hub that manages its own state
interface StandaloneAdminLMSHubProps {
  isDarkMode?: boolean;
  userName?: string;
  userAvatar?: string;
  userId?: string;
  initialPage?: LMSPage;
}

export const StandaloneAdminLMSHub: React.FC<StandaloneAdminLMSHubProps> = ({
  isDarkMode = false,
  userName = 'Admin User',
  userAvatar,
  userId: _userId,
  initialPage = 'admin-dashboard'
}) => {
  const [currentPage, setCurrentPage] = useState<LMSPage>(initialPage);
  const [selectedCourse] = useState<{ id: string; moduleId?: string; lessonId?: string } | null>(null);

  const handleNavigate = (page: LMSPage) => {
    setCurrentPage(page);
  };

  return (
    <LMSLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      userRole="admin"
      isDarkMode={isDarkMode}
      userName={userName}
      userAvatar={userAvatar}
      notificationCount={3}
    >
      <LMSPages
        currentPage={currentPage}
        userRole="admin"
        isDarkMode={isDarkMode}
        onNavigate={handleNavigate}
        courseId={selectedCourse?.id}
        moduleId={selectedCourse?.moduleId}
        lessonId={selectedCourse?.lessonId}
      />
    </LMSLayout>
  );
};
