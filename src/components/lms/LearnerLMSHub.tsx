import React, { useState } from 'react';
import { LMSLayout, LMSPage } from './LMSLayout';
import { LMSPages } from './LMSPages';
import { LMSProvider, useLMSContext } from './LMSContext';

interface LearnerLMSHubInnerProps {
  isDarkMode?: boolean;
  userName?: string;
  userAvatar?: string;
  onClose?: () => void;
}

const LearnerLMSHubInner: React.FC<LearnerLMSHubInnerProps> = ({
  isDarkMode = false,
  userName = 'Learner',
  userAvatar,
  onClose: _onClose
}) => {
  const { currentPage, navigateTo, selectedCourse, unreadCount } = useLMSContext();

  return (
    <LMSLayout
      currentPage={currentPage}
      onNavigate={navigateTo}
      userRole="learner"
      isDarkMode={isDarkMode}
      userName={userName}
      userAvatar={userAvatar}
      notificationCount={unreadCount}
    >
      <LMSPages
        currentPage={currentPage}
        userRole="learner"
        isDarkMode={isDarkMode}
        onNavigate={navigateTo}
        courseId={selectedCourse?.id}
        moduleId={selectedCourse?.moduleId}
        lessonId={selectedCourse?.lessonId}
      />
    </LMSLayout>
  );
};

interface LearnerLMSHubProps {
  isDarkMode?: boolean;
  userName?: string;
  userAvatar?: string;
  userId?: string;
  onClose?: () => void;
}

export const LearnerLMSHub: React.FC<LearnerLMSHubProps> = ({
  isDarkMode = false,
  userName = 'Learner',
  userAvatar,
  userId,
  onClose
}) => {
  return (
    <LMSProvider
      initialPage="learner-dashboard"
      initialRole="learner"
      initialDarkMode={isDarkMode}
      userId={userId}
      userName={userName}
      userAvatar={userAvatar}
    >
      <LearnerLMSHubInner
        isDarkMode={isDarkMode}
        userName={userName}
        userAvatar={userAvatar}
        onClose={onClose}
      />
    </LMSProvider>
  );
};

// Standalone Learner LMS Hub that manages its own state
interface StandaloneLearnerLMSHubProps {
  isDarkMode?: boolean;
  userName?: string;
  userAvatar?: string;
  userId?: string;
  initialPage?: LMSPage;
}

export const StandaloneLearnerLMSHub: React.FC<StandaloneLearnerLMSHubProps> = ({
  isDarkMode = false,
  userName = 'Learner',
  userAvatar,
  userId: _userId,
  initialPage = 'learner-dashboard'
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
      userRole="learner"
      isDarkMode={isDarkMode}
      userName={userName}
      userAvatar={userAvatar}
      notificationCount={2}
    >
      <LMSPages
        currentPage={currentPage}
        userRole="learner"
        isDarkMode={isDarkMode}
        onNavigate={handleNavigate}
        courseId={selectedCourse?.id}
        moduleId={selectedCourse?.moduleId}
        lessonId={selectedCourse?.lessonId}
      />
    </LMSLayout>
  );
};

// Instructor variant
interface InstructorLMSHubProps {
  isDarkMode?: boolean;
  userName?: string;
  userAvatar?: string;
  userId?: string;
  onClose?: () => void;
}

export const InstructorLMSHub: React.FC<InstructorLMSHubProps> = ({
  isDarkMode = false,
  userName = 'Instructor',
  userAvatar,
  userId: _userId,
  onClose: _onClose
}) => {
  const [currentPage, setCurrentPage] = useState<LMSPage>('instructor-dashboard');
  const [selectedCourse] = useState<{ id: string; moduleId?: string; lessonId?: string } | null>(null);

  const handleNavigate = (page: LMSPage) => {
    setCurrentPage(page);
  };

  return (
    <LMSLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      userRole="instructor"
      isDarkMode={isDarkMode}
      userName={userName}
      userAvatar={userAvatar}
      notificationCount={5}
    >
      <LMSPages
        currentPage={currentPage}
        userRole="instructor"
        isDarkMode={isDarkMode}
        onNavigate={handleNavigate}
        courseId={selectedCourse?.id}
        moduleId={selectedCourse?.moduleId}
        lessonId={selectedCourse?.lessonId}
      />
    </LMSLayout>
  );
};
