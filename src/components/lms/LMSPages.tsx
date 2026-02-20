import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import type { LMSPage, UserRole } from './LMSLayout';
import { logger } from '../../lib/logger';

// Lazy load admin components
const AdminDashboard = lazy(() => import('../admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const CourseManagement = lazy(() => import('../admin/CourseManagement').then(m => ({ default: m.CourseManagement })));
const UserManagement = lazy(() => import('../admin/UserManagement').then(m => ({ default: m.UserManagement })));
const EnrollmentManagement = lazy(() => import('../admin/EnrollmentManagement').then(m => ({ default: m.EnrollmentManagement })));
const AssignmentRules = lazy(() => import('../admin/AssignmentRules').then(m => ({ default: m.AssignmentRules })));
const TrainingAssignment = lazy(() => import('../admin/TrainingAssignment').then(m => ({ default: m.TrainingAssignment })));
const LearnerProgress = lazy(() => import('../admin/LearnerProgress').then(m => ({ default: m.LearnerProgress })));
const ReportsDashboard = lazy(() => import('../admin/ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
const ReportBuilder = lazy(() => import('../admin/ReportBuilder').then(m => ({ default: m.ReportBuilder })));
const CourseBuilder = lazy(() => import('../admin/CourseBuilder').then(m => ({ default: m.CourseBuilder })));
const ModuleEditor = lazy(() => import('../admin/ModuleEditor').then(m => ({ default: m.ModuleEditor })));
const LessonEditor = lazy(() => import('../admin/LessonEditor').then(m => ({ default: m.LessonEditor })));
const QuizBuilder = lazy(() => import('../admin/QuizBuilder').then(m => ({ default: m.QuizBuilder })));
const Gradebook = lazy(() => import('../admin/Gradebook').then(m => ({ default: m.Gradebook })));
const LearningPathBuilder = lazy(() => import('../admin/LearningPathBuilder').then(m => ({ default: m.LearningPathBuilder })));
const ComplianceDashboard = lazy(() => import('../admin/ComplianceDashboard').then(m => ({ default: m.ComplianceDashboard })));
const BulkImport = lazy(() => import('../admin/BulkImport').then(m => ({ default: m.BulkImport })));
const InstructorDashboard = lazy(() => import('../admin/InstructorDashboard').then(m => ({ default: m.InstructorDashboard })));
const SkillsManager = lazy(() => import('../admin/SkillsManager').then(m => ({ default: m.SkillsManager })));
const IntegrationSettings = lazy(() => import('../admin/IntegrationSettings').then(m => ({ default: m.IntegrationSettings })));
const ContentLibrary = lazy(() => import('../admin/ContentLibrary').then(m => ({ default: m.ContentLibrary })));
const SurveyBuilder = lazy(() => import('../admin/SurveyBuilder').then(m => ({ default: m.SurveyBuilder })));
const ILTSessionManager = lazy(() => import('../admin/ILTSessionManager').then(m => ({ default: m.ILTSessionManager })));
const TeamsManagement = lazy(() => import('../admin/TeamsManagement').then(m => ({ default: m.TeamsManagement })));
const AnnouncementsCenter = lazy(() => import('../admin/AnnouncementsCenter').then(m => ({ default: m.AnnouncementsCenter })));
const WaitlistManagement = lazy(() => import('../admin/WaitlistManagement').then(m => ({ default: m.WaitlistManagement })));
const LMSSettings = lazy(() => import('../admin/LMSSettings').then(m => ({ default: m.LMSSettings })));

// Lazy load learner components
const LearnerDashboard = lazy(() => import('../learner/LearnerDashboard').then(m => ({ default: m.LearnerDashboard })));
const CourseCatalog = lazy(() => import('../learner/CourseCatalog').then(m => ({ default: m.CourseCatalog })));
const CoursePlayer = lazy(() => import('../learner/CoursePlayer').then(m => ({ default: m.CoursePlayer })));
const LearningPathsPage = lazy(() => import('../../pages/LearningPathsPage').then(m => ({ default: m.default })));
const CertificateViewer = lazy(() => import('../learner/CertificateViewer').then(m => ({ default: m.CertificateViewer })));
const DiscussionForum = lazy(() => import('../learner/DiscussionForum').then(m => ({ default: m.DiscussionForum })));
const LMSGamification = lazy(() => import('../learner/LMSGamification').then(m => ({ default: m.LMSGamification })));
const NotificationsCenter = lazy(() => import('../learner/NotificationsCenter').then(m => ({ default: m.NotificationsCenter })));
const TrainingCalendar = lazy(() => import('../learner/TrainingCalendar').then(m => ({ default: m.TrainingCalendar })));
const LearnerProfile = lazy(() => import('../learner/LearnerProfile').then(m => ({ default: m.LearnerProfile })));
const CourseReviews = lazy(() => import('../learner/CourseReviews').then(m => ({ default: m.CourseReviews })));
const ResourceLibrary = lazy(() => import('../learner/ResourceLibrary').then(m => ({ default: m.ResourceLibrary })));
const MentoringSystem = lazy(() => import('../learner/MentoringSystem').then(m => ({ default: m.MentoringSystem })));

interface LMSPagesProps {
  currentPage: LMSPage;
  userRole: UserRole;
  isDarkMode?: boolean;
  onNavigate?: (page: LMSPage) => void;
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
}

const LoadingFallback: React.FC<{ isDarkMode?: boolean }> = ({ isDarkMode }) => (
  <div className={`flex items-center justify-center h-full min-h-[400px] ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
    <div className="flex flex-col items-center gap-3">
      <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading...</p>
    </div>
  </div>
);

export const LMSPages: React.FC<LMSPagesProps> = ({
  currentPage,
  userRole: _userRole,
  isDarkMode = false,
  onNavigate: _onNavigate,
  courseId,
  moduleId,
  lessonId
}) => {
  const handleCourseSelect = (id: string) => {
    // Handle course selection - could set courseId and navigate
    logger.debug('Course selected:', id);
  };

  const handleEnroll = (id: string) => {
    logger.debug('Enroll in course:', id);
  };

  const handleModuleSelect = (id: string) => {
    logger.debug('Module selected:', id);
  };

  const handleLessonSelect = (id: string) => {
    logger.debug('Lesson selected:', id);
  };

  const renderPage = () => {
    switch (currentPage) {
      // Admin Pages
      case 'admin-dashboard':
        return <AdminDashboard isDarkMode={isDarkMode} />;
      case 'course-management':
        return <CourseManagement isDarkMode={isDarkMode} />;
      case 'user-management':
        return <UserManagement isDarkMode={isDarkMode} />;
      case 'enrollment-management':
        return <EnrollmentManagement isDarkMode={isDarkMode} />;
      case 'assignment-rules':
        return <AssignmentRules isDarkMode={isDarkMode} />;
      case 'training-assignment':
        return <TrainingAssignment isDarkMode={isDarkMode} />;
      case 'learner-progress':
        return <LearnerProgress isDarkMode={isDarkMode} />;
      case 'reports-dashboard':
        return <ReportsDashboard isDarkMode={isDarkMode} />;
      case 'report-builder':
        return <ReportBuilder isDarkMode={isDarkMode} />;
      case 'course-builder':
        return <CourseBuilder isDarkMode={isDarkMode} courseId={courseId} />;
      case 'module-editor':
        return <ModuleEditor isDarkMode={isDarkMode} courseId={courseId || ''} moduleId={moduleId} />;
      case 'lesson-editor':
        return <LessonEditor isDarkMode={isDarkMode} courseId={courseId || ''} moduleId={moduleId || ''} lessonId={lessonId} />;
      case 'quiz-builder':
        return <QuizBuilder isDarkMode={isDarkMode} />;
      case 'gradebook':
        return <Gradebook isDarkMode={isDarkMode} />;
      case 'learning-path-builder':
        return <LearningPathBuilder isDarkMode={isDarkMode} />;
      case 'compliance-dashboard':
        return <ComplianceDashboard isDarkMode={isDarkMode} />;
      case 'bulk-import':
        return <BulkImport isDarkMode={isDarkMode} />;
      case 'instructor-dashboard':
        return <InstructorDashboard isDarkMode={isDarkMode} />;
      case 'skills-manager':
        return <SkillsManager isDarkMode={isDarkMode} />;
      case 'integration-settings':
        return <IntegrationSettings isDarkMode={isDarkMode} />;
      case 'content-library':
        return <ContentLibrary isDarkMode={isDarkMode} />;
      case 'survey-builder':
        return <SurveyBuilder isDarkMode={isDarkMode} />;
      case 'ilt-sessions':
        return <ILTSessionManager isDarkMode={isDarkMode} />;
      case 'teams-management':
        return <TeamsManagement isDarkMode={isDarkMode} />;
      case 'announcements':
        return <AnnouncementsCenter isDarkMode={isDarkMode} />;
      case 'waitlist-management':
        return <WaitlistManagement isDarkMode={isDarkMode} />;
      case 'lms-settings':
        return <LMSSettings isDarkMode={isDarkMode} />;

      // Learner Pages
      case 'learner-dashboard':
        return <LearnerDashboard isDarkMode={isDarkMode} />;
      case 'course-catalog':
        return <CourseCatalog isDarkMode={isDarkMode} onCourseSelect={handleCourseSelect} onEnroll={handleEnroll} />;
      case 'my-courses':
        return <CourseCatalog isDarkMode={isDarkMode} onCourseSelect={handleCourseSelect} onEnroll={handleEnroll} />;
      case 'course-player':
        return <CoursePlayer isDarkMode={isDarkMode} courseId={courseId || ''} onModuleSelect={handleModuleSelect} onLessonSelect={handleLessonSelect} />;
      case 'learning-paths':
        return <LearningPathsPage isDarkMode={isDarkMode} />;
      case 'certificates':
        return <CertificateViewer isDarkMode={isDarkMode} />;
      case 'discussions':
        return <DiscussionForum isDarkMode={isDarkMode} />;
      case 'gamification':
        return <LMSGamification isDarkMode={isDarkMode} />;
      case 'notifications':
        return <NotificationsCenter isDarkMode={isDarkMode} />;
      case 'training-calendar':
        return <TrainingCalendar isDarkMode={isDarkMode} />;
      case 'learner-profile':
        return <LearnerProfile isDarkMode={isDarkMode} />;
      case 'course-reviews':
        return <CourseReviews isDarkMode={isDarkMode} courseId={courseId} />;
      case 'resource-library':
        return <ResourceLibrary isDarkMode={isDarkMode} />;
      case 'mentoring':
        return <MentoringSystem isDarkMode={isDarkMode} />;

      default:
        return (
          <div className={`flex items-center justify-center h-full min-h-[400px] ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="text-center">
              <p className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Page not found
              </p>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                The requested page "{currentPage}" does not exist.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Suspense fallback={<LoadingFallback isDarkMode={isDarkMode} />}>
      {renderPage()}
    </Suspense>
  );
};
