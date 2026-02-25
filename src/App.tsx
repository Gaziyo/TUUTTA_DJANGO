import type { ReactElement } from 'react';
import type { Announcement } from './types/lms';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Brain,
  Layers,
  BarChart,
  FileText,
  Folder,
  ClipboardCheck,
  TrendingUp,
  MessageCircle,
  ScrollText,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useStore } from './store';
import { useLMSStore } from './store/lmsStore';
import { AppContextProvider, useAppContext } from './context/AppContext';
import { GuidedPipelineProvider } from './context/GuidedPipelineContext';
import { ToastProvider } from './components/ui/toast-provider';
import { AdminRoute, LearnerRoute } from './components/auth/RouteGuard';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Skeleton, AdminTableSkeleton } from './components/ui/skeleton';
import AppFooter from './components/layout/AppFooter';
import { isEnterpriseFeatureEnabled } from './config/featureFlags';
import { announcementService } from './services';

// Lazy load heavy components
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const NotePanel = lazy(() => import('./components/NotePanel'));
const FileUploadPanel = lazy(() => import('./components/FileUploadPanel'));
const AssessmentPanel = lazy(() => import('./components/AssessmentPanel'));
const AuditLogPanel = lazy(() => import('./components/AuditLogPanel'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const ChatSidebar = lazy(() => import('./components/ChatSidebar'));
const IntegratedLearningPanel = lazy(() => import('./components/IntegratedLearningPanel'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const ProgressPanel = lazy(() => import('./components/ProgressPanel'));
const GamificationModal = lazy(() => import('./components/GamificationModal'));
const AchievementNotification = lazy(() => import('./components/AchievementNotification'));
const StreakTracker = lazy(() => import('./components/StreakTracker'));
const LevelProgressBar = lazy(() => import('./components/LevelProgressBar'));
const SubscriptionModal = lazy(() => import('./components/SubscriptionModal'));
const QuickActionsPanel = lazy(() => import('./components/QuickActionsPanel'));
const TourGuide = lazy(() => import('./components/TourGuide'));
const UnifiedLayout = lazy(() => import('./components/layout/UnifiedLayout'));

// Lazy load page components
const HomeDashboard = lazy(() => import('./pages/HomeDashboard'));
const MyCoursesPage = lazy(() => import('./pages/MyCoursesPage'));
const LearningPathsPage = lazy(() => import('./pages/LearningPathsPage'));
const JoinOrganizationPage = lazy(() => import('./pages/JoinOrganizationPage'));
const AppAdminGuide = lazy(() => import('./pages/AppAdminGuide'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const SecurityPage = lazy(() => import('./pages/SecurityPage'));
const QuizBuilder = lazy(() => import('./components/admin/QuizBuilder'));
const SurveyBuilder = lazy(() => import('./components/admin/SurveyBuilder'));

// Lazy load LMS admin components
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const CourseManagement = lazy(() => import('./components/admin/CourseManagement'));
const CourseBuilderPage = lazy(() => import('./pages/CourseBuilderPage'));
const UserManagement = lazy(() => import('./components/admin/UserManagement'));
const ReportsDashboard = lazy(() => import('./components/admin/ReportsDashboard'));
const ContentLibrary = lazy(() => import('./components/admin/ContentLibrary').then(m => ({ default: m.ContentLibrary })));
const TeamsManagement = lazy(() => import('./components/admin/TeamsManagementPage'));
const DepartmentsManagement = lazy(() => import('./components/admin/DepartmentsManagement'));
const EnrollmentManagement = lazy(() => import('./components/admin/EnrollmentManagement'));
const AssignmentRules = lazy(() => import('./components/admin/AssignmentRules'));
const LMSSettings = lazy(() => import('./components/admin/LMSSettings'));
const AgentDashboard = lazy(() => import('./components/admin/AgentDashboard'));
const LearningPathBuilder = lazy(() => import('./components/admin/LearningPathBuilder'));
const GenieHub = lazy(() => import('./components/admin/GenieHub'));
const GeniePipeline = lazy(() => import('./components/admin/GeniePipeline'));
const GenieCourseStudio = lazy(() => import('./components/admin/GenieCourseStudio'));
const GenieSources = lazy(() => import('./components/admin/GenieSources'));
const GenieSourceDetail = lazy(() => import('./components/admin/GenieSourceDetail'));
const GenieAssessments = lazy(() => import('./components/admin/GenieAssessments'));
const GenieEnrollments = lazy(() => import('./components/admin/GenieEnrollments'));
const GenieAnalytics = lazy(() => import('./components/admin/GenieAnalytics'));
const GenieCompliance = lazy(() => import('./components/admin/GenieCompliance'));
const GenieNotifications = lazy(() => import('./components/admin/GenieNotifications'));
const ELSStudio = lazy(() => import('./components/admin/ELSStudio'));
const GenieGuidedLayout = lazy(() => import('./components/admin/genie/GenieGuidedLayout'));
const AdminCompetencies = lazy(() => import('./components/admin/AdminCompetencies'));
const AdminGapEngine = lazy(() => import('./components/admin/AdminGapEngine'));
const AdminDigitalTwins = lazy(() => import('./components/admin/AdminDigitalTwins'));
const AdminPredictions = lazy(() => import('./components/admin/AdminPredictions'));
const AdminForecasting = lazy(() => import('./components/admin/AdminForecasting'));
const AdminGovernance = lazy(() => import('./components/admin/AdminGovernance'));
const GenieGuidedWorkspace = lazy(() => import('./components/admin/genie/ProgramWorkspace'));
const GenieGuidedPreview = lazy(() => import('./components/admin/genie/PreviewPage'));
const GenieGuidedImpact = lazy(() => import('./components/admin/genie/ImpactPage'));
const AdminIntegrations = lazy(() => import('./components/admin/AdminIntegrations'));
const AdminSecurityCenter = lazy(() => import('./components/admin/AdminSecurityCenter'));
const AdminAuditLogViewer = lazy(() => import('./components/admin/AdminAuditLogViewer'));
const AdminRouteMap = lazy(() => import('./components/admin/AdminRouteMap'));
const AdminDataExports = lazy(() => import('./components/admin/AdminDataExports'));
const BulkImport = lazy(() => import('./components/admin/BulkImport').then(m => ({ default: m.BulkImport })));

// Lazy load LMS learner components
const LearnerDashboard = lazy(() => import('./components/learner/LearnerDashboard'));
const CoursePlayer = lazy(() => import('./components/learner/CoursePlayer'));
const CourseHome = lazy(() => import('./components/learner/CourseHome'));
const CourseOutline = lazy(() => import('./components/learner/CourseOutline'));
const CourseResources = lazy(() => import('./components/learner/CourseResources'));
const LearningPathViewer = lazy(() => import('./components/learner/LearningPathViewer'));
const DiscussionForum = lazy(() => import('./components/learner/DiscussionForum'));
const AnnouncementsCenter = lazy(() => import('./components/admin/AnnouncementsCenter').then(m => ({ default: m.AnnouncementsCenter })));

// Loading component
const LoadingSpinner = () => (
  <div className="w-full p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Skeleton key={idx} className="h-36 w-full" />
      ))}
    </div>
  </div>
);

// ============================================================================
// RIGHT PANEL COMPONENT
// ============================================================================

interface RightPanelProps {
  isDarkMode: boolean;
}

function RightPanel({ isDarkMode }: RightPanelProps) {
  const { rightPanelTabs, activeRightPanelTab, setActiveRightPanelTab } = useAppContext();

  // Map tab IDs to icons
  const tabIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    notes: FileText,
    files: Folder,
    assessments: ClipboardCheck,
    progress: TrendingUp,
    analytics: BarChart,
    reports: BarChart,
    materials: Folder,
    discussions: MessageCircle,
    audit_log: ScrollText,
    quick_actions: Zap
  };

  // Map tab IDs to components
  const renderTabContent = (tabId: string) => {
    switch (tabId) {
      case 'notes':
        return <NotePanel />;
      case 'files':
      case 'materials':
        return <FileUploadPanel />;
      case 'assessments':
        return <AssessmentPanel />;
      case 'progress':
        return <ProgressPanel isDarkMode={isDarkMode} />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'reports':
        return <ReportsDashboard isDarkMode={isDarkMode} />;
      case 'discussions':
        return <IntegratedLearningPanel />;
      case 'audit_log':
        return <AuditLogPanel />;
      case 'quick_actions':
        return <QuickActionsPanel />;
      default:
        return <NotePanel />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className={`flex gap-1 p-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {rightPanelTabs.map(tab => {
          const Icon = tabIcons[tab.id] || FileText;
          const isActive = activeRightPanelTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveRightPanelTab(tab.id)}
              className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-all group relative ${
                isActive
                  ? isDarkMode
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'bg-indigo-50 text-indigo-600'
                  : isDarkMode
                    ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
              title={tab.label}
            >
              <Icon className="w-5 h-5" />
              {/* Tooltip */}
              <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none z-50 ${
                isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-900 text-white'
              } shadow-lg`}>
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Suspense fallback={<LoadingSpinner />}>
          {renderTabContent(activeRightPanelTab)}
        </Suspense>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN CONTENT COMPONENT
// ============================================================================

interface MainContentProps {
  isDarkMode: boolean;
}

function MainContent({ isDarkMode }: MainContentProps) {
  const { currentContext, currentRoute, courseContext, pathContext, openCourse, exitPath } = useAppContext();
  const { getUserLevel, getUserXP, getLearningStreak, user } = useStore();
  const {
    enrollments,
    updateEnrollmentProgress,
    courses,
    teams,
    learningPaths,
    certificates,
    loadLearningPaths,
    loadCourses,
    loadEnrollments,
    currentOrg,
    currentMember
  } = useLMSStore();
  const [isGamificationModalOpen, setIsGamificationModalOpen] = useState(false);
  const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage.getItem('tuutta_chat_sidebar_collapsed');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const userLevel = getUserLevel();
  const userXP = getUserXP();
  const streak = getLearningStreak();

  useEffect(() => {
    try {
      window.localStorage.setItem('tuutta_chat_sidebar_collapsed', JSON.stringify(isChatSidebarCollapsed));
    } catch {
      // ignore localStorage write failures
    }
  }, [isChatSidebarCollapsed]);

  useEffect(() => {
    if (currentContext === 'path' && currentOrg) {
      loadLearningPaths();
      loadCourses();
      loadEnrollments();
    }
  }, [currentContext, currentOrg, loadLearningPaths, loadCourses, loadEnrollments]);

  // Render route-based content for personal/org contexts
  const renderRouteContent = () => {
    switch (currentRoute) {
      case '/':
      case '/home':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <HomeDashboard isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/courses':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <MyCoursesPage isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/paths':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LearningPathsPage isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/join-org':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <JoinOrganizationPage isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/app-admin':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AppAdminGuide isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/privacy':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivacyPage isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/terms':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <TermsPage isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/security':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SecurityPage isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/discussions':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <DiscussionForum isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/progress':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LearnerDashboard isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/analytics':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AnalyticsDashboard />
          </Suspense>
        );
      case '/announcements':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AnnouncementsCenter
              announcements={[]}
              courses={courses.map(c => ({ id: c.id, title: c.title }))}
              teams={teams.map(t => ({ id: t.id, name: t.name }))}
              onCreateAnnouncement={async () => {}}
              onUpdateAnnouncement={async () => {}}
              onDeleteAnnouncement={async () => {}}
              onPublishAnnouncement={async () => {}}
              currentUserId={user?.id || ''}
              isDarkMode={isDarkMode}
            />
          </Suspense>
        );
      case '/notes':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <NotePanel />
          </Suspense>
        );
      case '/files':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <FileUploadPanel />
          </Suspense>
        );
      case '/assessments':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AssessmentPanel />
          </Suspense>
        );
      case '/chat':
        // Chat view with sidebar gamification
        return (
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Left sidebar with chat history and gamification */}
            <div className={`relative flex-shrink-0 self-stretch min-h-0 border-r overflow-visible transition-all duration-300 ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } ${isChatSidebarCollapsed ? 'w-12' : 'w-72'}`}>
              <button
                onClick={() => setIsChatSidebarCollapsed((prev: boolean) => !prev)}
                className={`absolute top-1/2 -translate-y-1/2 -right-4 z-30 flex items-center justify-center w-8 h-12 rounded-r-lg border shadow-sm ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
                title={isChatSidebarCollapsed ? 'Expand chat sidebar' : 'Collapse chat sidebar'}
              >
                {isChatSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              {!isChatSidebarCollapsed && (
                <div className="h-full min-h-0 overflow-y-auto p-4 space-y-4">
                  <Suspense fallback={<LoadingSpinner />}>
                    <ChatSidebar />

                    {/* Streak Tracker */}
                    <StreakTracker
                      streak={streak.currentStreak}
                      onClick={() => setIsGamificationModalOpen(true)}
                      showDetails={true}
                    />

                    {/* Level Progress */}
                    <LevelProgressBar
                      level={userLevel.level}
                      currentXP={userXP}
                      nextLevelXP={userLevel.maxXP}
                      levelTitle={userLevel.title}
                      onClick={() => setIsGamificationModalOpen(true)}
                    />
                  </Suspense>
                </div>
              )}
            </div>

            {/* Main chat area */}
            <div className="flex-1 min-h-0 p-4 overflow-hidden">
              <Suspense fallback={<LoadingSpinner />}>
                <div className="h-full min-h-0">
                  <ChatInterface />
                </div>
              </Suspense>
            </div>

            {/* Gamification Modal */}
            <Suspense fallback={null}>
              <GamificationModal
                isOpen={isGamificationModalOpen}
                onClose={() => setIsGamificationModalOpen(false)}
              />
            </Suspense>
          </div>
        );
      default:
        // Default to home dashboard
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <HomeDashboard isDarkMode={isDarkMode} />
          </Suspense>
        );
    }
  };

  // Render admin routes
  const renderAdminContent = () => {
    switch (currentRoute) {
      case '/admin/dashboard':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminDashboard />
          </Suspense>
        );
      case '/admin/get-started':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AppAdminGuide isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/courses':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CourseManagement isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/courses/new':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CourseBuilderPage isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/courses/edit':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CourseBuilderPage isDarkMode={isDarkMode} courseId={currentRoute.split('/').pop()} />
          </Suspense>
        );
      case '/admin/paths':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LearningPathBuilder isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/users':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <UserManagement isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/teams':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <TeamsManagement isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/departments':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <DepartmentsManagement isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/content':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ContentLibrary isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GenieHub />
          </Suspense>
        );
      case '/admin/genie/ai-bot':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GeniePipeline isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie-guided':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GuidedPipelineProvider>
              <GenieGuidedWorkspace />
            </GuidedPipelineProvider>
          </Suspense>
        );
      case '/admin/genie-guided/preview':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GuidedPipelineProvider>
              <GenieGuidedPreview />
            </GuidedPipelineProvider>
          </Suspense>
        );
      case '/admin/genie-guided/impact':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GuidedPipelineProvider>
              <GenieGuidedImpact />
            </GuidedPipelineProvider>
          </Suspense>
        );
      case '/admin/enterprise':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ELSStudio isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie/sources':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GenieSources isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie/studio':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GenieCourseStudio isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie/assessments':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GenieAssessments isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie/enrollments':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GenieEnrollments isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie/analytics':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GenieAnalytics isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie/compliance':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GenieCompliance isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie/notifications':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <GenieNotifications isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/genie/ingestion':
        return <Navigate to="/admin/genie-guided?stage=ingest&surface=legacy-ingest" replace />;
      case '/admin/genie/analyze':
        return <Navigate to="/admin/genie-guided?stage=analyze&surface=legacy-analyze" replace />;
      case '/admin/genie/design':
        return <Navigate to="/admin/genie-guided?stage=design&surface=legacy-design" replace />;
      case '/admin/genie/develop':
        return <Navigate to="/admin/genie-guided?stage=develop&surface=legacy-develop" replace />;
      case '/admin/genie/implement':
        return <Navigate to="/admin/genie-guided?stage=implement&surface=legacy-implement" replace />;
      case '/admin/genie/evaluate':
        return <Navigate to="/admin/genie-guided?stage=evaluate&surface=legacy-evaluate" replace />;
      case '/admin/genie/personalisation':
        return <Navigate to="/admin/genie-guided?surface=personalisation-internal" replace />;
      case '/admin/genie/manager-portal':
        return <Navigate to="/admin/genie-guided?surface=manager-portal-internal" replace />;
      case '/admin/genie/governance':
        return <Navigate to="/admin/genie-guided?surface=governance-internal" replace />;
      case '/admin/enrollments':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <EnrollmentManagement />
          </Suspense>
        );
      case '/admin/assignments':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AssignmentRules />
          </Suspense>
        );
      case '/admin/reports':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ReportsDashboard isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/analytics':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ReportsDashboard isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/forums':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <DiscussionForum isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/quizzes':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <QuizBuilder isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/workshops':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <SurveyBuilder
              courses={courses.map(course => ({ id: course.id, title: course.title }))}
              onSave={async () => {}}
              onPublish={async () => {}}
              onPreview={() => {}}
              isDarkMode={isDarkMode}
            />
          </Suspense>
        );
      case '/admin/agents':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AgentDashboard isDarkMode={isDarkMode} />
          </Suspense>
        );
      case '/admin/settings':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LMSSettings isDarkMode={isDarkMode} />
          </Suspense>
        );
      default:
        if (currentRoute.startsWith('/admin/genie/sources/')) {
          const sourceId = currentRoute.split('/').pop();
          if (sourceId) {
            return (
              <Suspense fallback={<LoadingSpinner />}>
                <GenieSourceDetail isDarkMode={isDarkMode} sourceId={sourceId} />
              </Suspense>
            );
          }
        }
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminDashboard />
          </Suspense>
        );
    }
  };

  const parseCourseRoute = () => {
    const match = currentRoute.match(/^\/course\/([^/]+)(\/.*)?$/);
    if (!match) {
      return { courseId: courseContext?.courseId || '', route: currentRoute };
    }
    const route = `/course${match[2] || '/home'}`;
    return { courseId: match[1], route };
  };

  const parsePathRoute = () => {
    const match = currentRoute.match(/^\/path\/([^/]+)(\/.*)?$/);
    if (!match) {
      return { pathId: pathContext?.pathId || '', route: currentRoute };
    }
    const route = `/path${match[2] || '/overview'}`;
    return { pathId: match[1], route };
  };

  const renderCourseContent = () => {
    const { courseId, route } = parseCourseRoute();
    const currentEnrollment = enrollments.find((enrollment) =>
      enrollment.courseId === courseId && (!user || enrollment.userId === user.id)
    );
    switch (route) {
      case '/course/player':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CoursePlayer
              courseId={courseId}
              isDarkMode={isDarkMode}
              enrollment={currentEnrollment}
              initialModuleId={courseContext?.moduleId}
              initialLessonId={courseContext?.lessonId}
              onProgressUpdate={(progress, moduleProgress) => {
                if (currentEnrollment) {
                  updateEnrollmentProgress(currentEnrollment.id, progress, moduleProgress);
                }
              }}
            />
          </Suspense>
        );
      case '/course/outline':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CourseOutline
              courseId={courseId}
              isDarkMode={isDarkMode}
            />
          </Suspense>
        );
      case '/course/resources':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CourseResources
              courseId={courseId}
              isDarkMode={isDarkMode}
            />
          </Suspense>
        );
      case '/course/notes':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <NotePanel />
          </Suspense>
        );
      case '/course/home':
      default:
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CourseHome
              courseId={courseId}
              isDarkMode={isDarkMode}
            />
          </Suspense>
        );
    }
  };

  // Render content based on context
  const renderContent = () => {
    switch (currentContext) {
      case 'course':
        return renderCourseContent();

      case 'path':
        // Learning path view - use LearningPathViewer
        return (
          <Suspense fallback={<LoadingSpinner />}>
            {(() => {
              const { pathId } = parsePathRoute();
              const currentPath = learningPaths.find(path => path.id === pathId);
              if (!currentPath) {
                return (
                  <div className={`p-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Learning path not found.
                  </div>
                );
              }
              const memberEnrollments = currentMember
                ? enrollments.filter(enrollment => enrollment.userId === currentMember.id)
                : enrollments;
              const pathCertificate = certificates.find(cert =>
                cert.learningPathId === currentPath.id && (!currentMember || cert.userId === currentMember.id)
              );
              return (
                <LearningPathViewer
                  learningPath={currentPath}
                  courses={courses}
                  enrollments={memberEnrollments}
                  pathCertificate={pathCertificate}
                  onStartCourse={(courseId) => {
                    const course = courses.find(c => c.id === courseId);
                    openCourse(courseId, course?.title || 'Course');
                  }}
                  onContinueCourse={(courseId) => {
                    const course = courses.find(c => c.id === courseId);
                    openCourse(courseId, course?.title || 'Course');
                  }}
                  onViewCertificate={() => {}}
                  onBack={exitPath}
                  isDarkMode={isDarkMode}
                  view={currentRoute.includes('/milestones')
                    ? 'milestones'
                    : currentRoute.includes('/current')
                      ? 'current'
                      : 'overview'}
                />
              );
            })()}
          </Suspense>
        );

      case 'admin':
        // Admin context - route to appropriate admin component
        return renderAdminContent();

      case 'personal':
      case 'org':
      default:
        // Route-based navigation for personal/org contexts
        return renderRouteContent();
    }
  };

  return renderContent();
}

// ============================================================================
// APP CONTENT (with context)
// ============================================================================

function AppContent() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGamificationModalOpen, setIsGamificationModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showAchievement, setShowAchievement] = useState(false);

  const {
    currentContext,
    currentRoute,
    navigate,
  } = useAppContext();
  const { user } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Show achievement notification after login
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setShowAchievement(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);


  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const isLegalRoute = currentRoute === '/privacy' || currentRoute === '/terms' || currentRoute === '/security';

  // Not logged in - show legal pages or welcome screen
  if (!user) {
    if (isLegalRoute) {
      return (
        <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <Suspense fallback={<LoadingSpinner />}>
            {currentRoute === '/privacy' && <PrivacyPage isDarkMode={isDarkMode} />}
            {currentRoute === '/terms' && <TermsPage isDarkMode={isDarkMode} />}
            {currentRoute === '/security' && <SecurityPage isDarkMode={isDarkMode} />}
          </Suspense>
          <AppFooter isDarkMode={isDarkMode} onNavigate={navigate} />
        </div>
      );
    }

    return (
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex-1 bg-mesh-gradient">
          <header className="tuutta-section pt-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide">Tuutta</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Enterprise Learning Intelligence
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <button
                  onClick={() => openAuth('login')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    isDarkMode ? 'text-gray-200 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign in
                </button>
                <button
                  onClick={() => openAuth('register')}
                  className="tuutta-button-primary text-sm"
                >
                  Request demo
                </button>
              </div>
            </div>
          </header>

          <section className="tuutta-section pt-16 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
              <div className="space-y-6">
                <span className="tuutta-pill">AI-powered learning operations</span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight">
                  Turn enterprise knowledge into adaptive learning journeys in days, not quarters.
                </h1>
                <p className={`text-lg sm:text-xl ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Tuutta ingests policies, playbooks, and onboarding docs, then orchestrates AI tutors,
                  assessments, and compliance reporting across your entire workforce.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => openAuth('register')}
                    className="tuutta-button-primary"
                  >
                    Launch a demo workspace
                  </button>
                  <button
                    onClick={() => navigate('/security')}
                    className="tuutta-button-secondary"
                  >
                    See security posture
                  </button>
                </div>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="font-semibold">2.7x faster</p>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>content rollout time</p>
                  </div>
                  <div>
                    <p className="font-semibold">93% completion</p>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>across compliance tracks</p>
                  </div>
                  <div>
                    <p className="font-semibold">SOC2-ready</p>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>audit artifacts built in</p>
                  </div>
                </div>
              </div>

              <div className="tuutta-card p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-indigo-400">Live demo</p>
                    <h3 className="text-lg font-semibold">Autonomous course builder</h3>
                  </div>
                  <span className="tuutta-pill">AI running</span>
                </div>
                <div className={`rounded-2xl p-4 ${isDarkMode ? 'bg-gray-900/60' : 'bg-white'}`}>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Uploaded materials</span>
                    <span className="font-semibold">12 docs</span>
                  </div>
                  <div className="space-y-3">
                    {['Policy Handbook', 'Security Playbook', 'Sales Enablement', 'Ops SOPs'].map(item => (
                      <div key={item} className={`flex items-center justify-between p-3 rounded-xl ${
                        isDarkMode ? 'bg-gray-800/70' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <FileText className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{item}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Auto-tagged & summarized</p>
                          </div>
                        </div>
                        <span className="text-xs text-emerald-500">Ready</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Courses', value: '18' },
                    { label: 'Assessments', value: '42' },
                    { label: 'Paths', value: '6' }
                  ].map(stat => (
                    <div key={stat.label} className={`rounded-xl p-3 ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                      <p className="text-lg font-semibold">{stat.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="tuutta-section pb-16">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <p className="tuutta-eyebrow">Trusted by modern learning teams</p>
              <div className={`flex flex-wrap gap-6 text-sm font-semibold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {['Northwind', 'Atlas Bank', 'Helios Health', 'Nova Energy', 'Citrine Logistics'].map(logo => (
                  <span key={logo} className="uppercase tracking-[0.2em]">{logo}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="tuutta-section pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Brain,
                  title: 'AI tutors that stay on policy',
                  body: 'Grounded responses, competency tracking, and adaptive remediation for every role.'
                },
                {
                  icon: Layers,
                  title: 'Enterprise-ready learning ops',
                  body: 'Centralized content, multi-team governance, and cross-org reporting in one cockpit.'
                },
                {
                  icon: BarChart,
                  title: 'Proof in the metrics',
                  body: 'Live insights on skill gaps, completion risk, and compliance readiness.'
                }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="tuutta-card p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{item.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="tuutta-section pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 items-center">
              <div className="space-y-4">
                <p className="tuutta-eyebrow">How it works</p>
                <h2 className="text-3xl sm:text-4xl font-semibold">From upload to enterprise rollout</h2>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Build a compliant learning program by combining AI agents, SME reviews, and real-time rollout analytics.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { step: '01', title: 'Ingest', body: 'Drop policies, playbooks, and recordings. Tuutta extracts intent and tags skills.' },
                  { step: '02', title: 'Design', body: 'AI assembles courses, assessments, and learning paths aligned to competency models.' },
                  { step: '03', title: 'Deploy', body: 'Launch cohorts, automate assignments, and monitor adoption across teams.' },
                  { step: '04', title: 'Prove', body: 'Generate audit-ready reports, completion evidence, and executive dashboards.' }
                ].map(item => (
                  <div key={item.step} className="tuutta-card p-5 flex gap-4">
                    <div className="text-sm font-semibold text-indigo-500">{item.step}</div>
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="tuutta-section pb-24">
            <div className="tuutta-card p-8 lg:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
                <div className="space-y-4">
                  <p className="tuutta-eyebrow">Trust & compliance</p>
                  <h2 className="text-3xl font-semibold">Enterprise governance baked in</h2>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Role-based permissions, audit trails, and exportable evidence to satisfy IT, Legal, and HR.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['SOC 2', 'GDPR', 'ISO 27001', 'SCORM', 'SAML'].map(item => (
                      <span key={item} className="tuutta-pill">{item}</span>
                    ))}
                  </div>
                </div>
                <div className={`rounded-2xl p-6 ${isDarkMode ? 'bg-gray-900/60' : 'bg-white'}`}>
                  <div className="space-y-4">
                    {[
                      { label: 'Audit log coverage', value: '100%' },
                      { label: 'Learner exports', value: '< 5 min' },
                      { label: 'Policy attestations', value: 'Automated' }
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{item.label}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="tuutta-section pb-20">
            <div className="tuutta-card p-10 text-center space-y-4">
              <h2 className="text-3xl font-semibold">Ready to elevate your learning operations?</h2>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Get a tailored walkthrough of Tuutta’s AI learning infrastructure in under 30 minutes.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button onClick={() => openAuth('register')} className="tuutta-button-primary">
                  Book a demo
                </button>
                <button onClick={() => openAuth('login')} className="tuutta-button-secondary">
                  Sign in to workspace
                </button>
              </div>
            </div>
          </section>
        </div>

        <AppFooter isDarkMode={isDarkMode} onNavigate={navigate} />

        {/* Auth Modal */}
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authMode}
          />
        </Suspense>
      </div>
    );
  }

  // Logged in - show unified layout
  const isCourseRoute = currentRoute.startsWith('/course/');
  const shouldShowRightPanel = currentContext !== 'admin' && isCourseRoute;
  const shouldShowChatRightPanel = currentContext !== 'admin' && currentRoute === '/chat';
  const rightPanelContent = shouldShowChatRightPanel
    ? <RightPanel isDarkMode={isDarkMode} />
    : shouldShowRightPanel
      ? <RightPanel isDarkMode={isDarkMode} />
      : null;

  // Allow users to open the right panel on chat via the toggle.

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <UnifiedLayout
        rightPanel={rightPanelContent}
        initialRightPanelOpen={isCourseRoute}
        onAuthModalOpen={openAuth}
        onSettingsOpen={() => setIsSettingsModalOpen(true)}
        onGamificationOpen={() => setIsGamificationModalOpen(true)}
      >
        <AppRoutes isDarkMode={isDarkMode} />
      </UnifiedLayout>

      {/* Modals */}
      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authMode}
        />
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />
        <GamificationModal
          isOpen={isGamificationModalOpen}
          onClose={() => setIsGamificationModalOpen(false)}
        />
        <SubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
        />
        <TourGuide />

        {/* Achievement notification */}
        {showAchievement && (
          <AchievementNotification
            title="First Conversation"
            description="You've completed your first chat with the AI tutor!"
            xp={10}
            onClose={() => setShowAchievement(false)}
          />
        )}
      </Suspense>
    </Suspense>
  );
}

// ============================================================================
// APP ROOT
// ============================================================================

function RouterSync() {
  const location = useLocation();
  const {
    currentRoute,
    setRouteFromUrl,
    setContextFromUrl,
    setCourseFromUrl,
    setPathFromUrl,
    openModule,
    openLesson,
    orgContext
  } = useAppContext();
  const { currentOrg, courses, learningPaths, loadCourses, loadLearningPaths, loadEnrollments } = useLMSStore();

  useEffect(() => {
    const path = location.pathname || '/';
    const searchParams = new URLSearchParams(location.search);
    if (path !== currentRoute) {
      setRouteFromUrl(path);
    }
    const orgRoutes = new Set([
      '/',
      '/home',
      '/chat',
      '/notes',
      '/files',
      '/assessments',
      '/courses',
      '/paths',
      '/discussions',
      '/announcements',
      '/analytics',
      '/progress',
      '/join-org'
    ]);
    if (path.startsWith('/admin')) {
      setContextFromUrl('admin');
    } else if (path.startsWith('/course/')) {
      const match = path.match(/^\/course\/([^/]+)(?:\/|$)/);
      const courseId = match?.[1];
      if (courseId) {
        if (courses.length === 0 && currentOrg) {
          loadCourses();
        }
        if (currentOrg) {
          loadEnrollments();
        }
        const courseName = courses.find(c => c.id === courseId)?.title;
        setCourseFromUrl(courseId, courseName);
        const moduleId = searchParams.get('moduleId');
        const lessonId = searchParams.get('lessonId');
        if (moduleId) {
          openModule(moduleId);
        }
        if (lessonId) {
          openLesson(lessonId);
        }
      } else {
        setContextFromUrl('course');
      }
    } else if (path.startsWith('/path/')) {
      const match = path.match(/^\/path\/([^/]+)(?:\/|$)/);
      const pathId = match?.[1];
      if (pathId) {
        if (learningPaths.length === 0 && currentOrg) {
          loadLearningPaths();
        }
        const pathName = learningPaths.find(p => p.id === pathId)?.title;
        setPathFromUrl(pathId, pathName);
      } else {
        setContextFromUrl('path');
      }
    } else if ((currentOrg || orgContext) && orgRoutes.has(path)) {
      setContextFromUrl('org');
    } else {
      setContextFromUrl('personal');
    }
  }, [
    location.pathname,
    location.search,
    currentRoute,
    setRouteFromUrl,
    setContextFromUrl,
    setCourseFromUrl,
    setPathFromUrl,
    openModule,
    openLesson,
    currentOrg,
    courses,
    learningPaths,
    loadCourses,
    loadLearningPaths,
    loadEnrollments,
    orgContext
  ]);

  return null;
}

function AppRoutes({ isDarkMode }: { isDarkMode: boolean }) {
  const { openCourse, exitPath, currentRoute } = useAppContext();
  const { user } = useStore();
  const {
    courses,
    enrollments,
    teams,
    learningPaths,
    certificates,
    loadLearningPaths,
    loadCourses,
    loadEnrollments,
    currentOrg,
    currentMember,
    updateEnrollmentProgress
  } = useLMSStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const loadAnnouncements = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const data = await announcementService.list(currentOrg.id);
      setAnnouncements(data);
    } catch (error) {
      console.warn('Failed to load announcements:', error);
      setAnnouncements([]);
    }
  }, [currentOrg]);

  const handleCreateAnnouncement = useCallback(async (payload: Omit<Announcement, 'id' | 'viewCount' | 'createdAt' | 'updatedAt' | 'orgId'>) => {
    if (!currentOrg) return;
    await announcementService.create({
      ...payload,
      orgId: currentOrg.id
    });
    await loadAnnouncements();
  }, [currentOrg, loadAnnouncements]);

  const handleUpdateAnnouncement = useCallback(async (announcementId: string, updates: Partial<Announcement>) => {
    if (!currentOrg) return;
    await announcementService.update(announcementId, updates);
    await loadAnnouncements();
  }, [currentOrg, loadAnnouncements]);

  const handleDeleteAnnouncement = useCallback(async (announcementId: string) => {
    if (!currentOrg) return;
    await announcementService.remove(announcementId);
    await loadAnnouncements();
  }, [currentOrg, loadAnnouncements]);

  const handlePublishAnnouncement = useCallback(async (announcementId: string) => {
    if (!currentOrg) return;
    await announcementService.publish(announcementId);
    await loadAnnouncements();
  }, [currentOrg, loadAnnouncements]);

  const handleBulkImportUsers = async (data: Record<string, string>[]) => ({
    success: 0,
    failed: 0,
    skipped: data.length,
    errors: []
  });

  const handleBulkImportEnrollments = async (data: Record<string, string>[]) => ({
    success: 0,
    failed: 0,
    skipped: data.length,
    errors: []
  });

  const handleBulkImportCourses = async (data: Record<string, string>[]) => ({
    success: 0,
    failed: 0,
    skipped: data.length,
    errors: []
  });

  useEffect(() => {
    if (currentOrg) {
      loadAnnouncements();
    }
  }, [currentOrg, loadAnnouncements]);

  const CoursePlayerRoute = () => {
    const params = useParams();
    const [searchParams] = useSearchParams();
    const courseId = params.courseId || '';
    const moduleId = searchParams.get('moduleId') || undefined;
    const lessonId = searchParams.get('lessonId') || undefined;
    const currentEnrollment = enrollments.find((enrollment) =>
      enrollment.courseId === courseId && (!user || enrollment.userId === user.id)
    );

    return (
      <CoursePlayer
        courseId={courseId}
        isDarkMode={isDarkMode}
        enrollment={currentEnrollment}
        initialModuleId={moduleId}
        initialLessonId={lessonId}
        onProgressUpdate={(progress, moduleProgress) => {
          if (currentEnrollment) {
            updateEnrollmentProgress(currentEnrollment.id, progress, moduleProgress);
          }
        }}
      />
    );
  };

  const CourseHomeRoute = () => {
    const params = useParams();
    return <CourseHome courseId={params.courseId || ''} isDarkMode={isDarkMode} />;
  };

  const CourseOutlineRoute = () => {
    const params = useParams();
    return <CourseOutline courseId={params.courseId || ''} isDarkMode={isDarkMode} />;
  };

  const CourseResourcesRoute = () => {
    const params = useParams();
    return <CourseResources courseId={params.courseId || ''} isDarkMode={isDarkMode} />;
  };

  const AdminCourseEditRoute = ({ isDarkMode }: { isDarkMode: boolean }) => {
    const params = useParams();
    return <CourseBuilderPage isDarkMode={isDarkMode} courseId={params.courseId} />;
  };

  const GenieSourceDetailRoute = ({ isDarkMode }: { isDarkMode: boolean }) => {
    const params = useParams();
    if (!params.sourceId) {
      return <Navigate to="/admin/genie/sources" replace />;
    }
    return <GenieSourceDetail isDarkMode={isDarkMode} sourceId={params.sourceId} />;
  };

  type PathView = 'overview' | 'current' | 'milestones';
  const PathViewerRoute = ({ view = 'overview' }: { view?: PathView }) => {
    const params = useParams();
    const pathId = params.pathId || '';
    const currentPath = learningPaths.find(path => path.id === pathId);
    if (!currentPath) {
      return (
        <div className={`p-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Learning path not found.
        </div>
      );
    }
    const memberEnrollments = currentMember
      ? enrollments.filter(enrollment => enrollment.userId === currentMember.id)
      : enrollments;
    const pathCertificate = certificates.find(cert =>
      cert.learningPathId === currentPath.id && (!currentMember || cert.userId === currentMember.id)
    );
    return (
      <LearningPathViewer
        learningPath={currentPath}
        courses={courses}
        enrollments={memberEnrollments}
        pathCertificate={pathCertificate}
        onStartCourse={(courseId) => {
          const course = courses.find(c => c.id === courseId);
          openCourse(courseId, course?.title || 'Course');
        }}
        onContinueCourse={(courseId) => {
          const course = courses.find(c => c.id === courseId);
          openCourse(courseId, course?.title || 'Course');
        }}
        onViewCertificate={() => {}}
        onBack={exitPath}
        isDarkMode={isDarkMode}
        view={view}
      />
    );
  };

  const EnterpriseRoute = ({
    flag,
    element
  }: {
    flag: Parameters<typeof isEnterpriseFeatureEnabled>[0];
    element: ReactElement;
  }) => (isEnterpriseFeatureEnabled(flag) ? element : <Navigate to="/admin/dashboard" replace />);

  const AuthRoutePage = ({ mode }: { mode: 'login' | 'register' }) => (
    <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-950' : 'bg-gray-100'}`}>
      <AuthModal
        isOpen
        onClose={() => {}}
        initialMode={mode}
      />
    </div>
  );

  // ensure learning path data is ready for deep links
  useEffect(() => {
    if (currentRoute.startsWith('/path/') && currentOrg) {
      loadLearningPaths();
      loadCourses();
      loadEnrollments();
    }
  }, [currentRoute, currentOrg, loadLearningPaths, loadCourses, loadEnrollments]);

  return (
    <ErrorBoundary title="Application">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<AuthRoutePage mode="login" />} />
        <Route path="/signup" element={<AuthRoutePage mode="register" />} />
        <Route element={<LearnerRoute />}>
          <Route path="/" element={<HomeDashboard isDarkMode={isDarkMode} />} />
          <Route path="/home" element={<HomeDashboard isDarkMode={isDarkMode} />} />
          <Route path="/courses" element={<MyCoursesPage isDarkMode={isDarkMode} />} />
          <Route path="/paths" element={<LearningPathsPage isDarkMode={isDarkMode} />} />
          <Route path="/join-org" element={<JoinOrganizationPage isDarkMode={isDarkMode} />} />
          <Route path="/app-admin" element={<AppAdminGuide isDarkMode={isDarkMode} />} />
          <Route path="/discussions" element={<DiscussionForum isDarkMode={isDarkMode} />} />
          <Route path="/progress" element={<LearnerDashboard isDarkMode={isDarkMode} />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route
            path="/announcements"
            element={
              <AnnouncementsCenter
                announcements={announcements}
                courses={courses.map(c => ({ id: c.id, title: c.title }))}
                teams={teams.map(t => ({ id: t.id, name: t.name }))}
                onCreateAnnouncement={handleCreateAnnouncement}
                onUpdateAnnouncement={handleUpdateAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
                onPublishAnnouncement={handlePublishAnnouncement}
                currentUserId={user?.id || ''}
                isDarkMode={isDarkMode}
              />
            }
          />
          <Route path="/chat" element={<MainContent isDarkMode={isDarkMode} />} />
          <Route path="/notes" element={<NotePanel />} />
          <Route path="/files" element={<FileUploadPanel />} />
          <Route path="/assessments" element={<AssessmentPanel />} />
          <Route path="/privacy" element={<PrivacyPage isDarkMode={isDarkMode} />} />
          <Route path="/terms" element={<TermsPage isDarkMode={isDarkMode} />} />
          <Route path="/security" element={<SecurityPage isDarkMode={isDarkMode} />} />

          <Route path="/course/:courseId" element={<Navigate to="home" replace />} />
          <Route path="/course/:courseId/home" element={<CourseHomeRoute />} />
          <Route path="/course/:courseId/player" element={<CoursePlayerRoute />} />
          <Route path="/course/:courseId/outline" element={<CourseOutlineRoute />} />
          <Route path="/course/:courseId/resources" element={<CourseResourcesRoute />} />
          <Route path="/course/:courseId/notes" element={<NotePanel />} />

          <Route path="/path/:pathId" element={<Navigate to="overview" replace />} />
          <Route path="/path/:pathId/overview" element={<PathViewerRoute view="overview" />} />
          <Route path="/path/:pathId/current" element={<PathViewerRoute view="current" />} />
          <Route path="/path/:pathId/milestones" element={<PathViewerRoute view="milestones" />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route
            path="/admin/dashboard"
            element={
              <Suspense fallback={<AdminTableSkeleton />}>
                <AdminDashboard />
              </Suspense>
            }
          />
          <Route path="/admin/get-started" element={<AppAdminGuide isDarkMode={isDarkMode} />} />
          <Route path="/admin/courses" element={<CourseManagement isDarkMode={isDarkMode} />} />
          <Route path="/admin/courses/new" element={<CourseBuilderPage isDarkMode={isDarkMode} />} />
          <Route path="/admin/courses/:courseId/edit" element={<AdminCourseEditRoute isDarkMode={isDarkMode} />} />
          <Route path="/admin/paths" element={<LearningPathBuilder isDarkMode={isDarkMode} />} />
          <Route path="/admin/users" element={<UserManagement isDarkMode={isDarkMode} />} />
          <Route path="/admin/teams" element={<TeamsManagement isDarkMode={isDarkMode} />} />
          <Route path="/admin/departments" element={<DepartmentsManagement isDarkMode={isDarkMode} />} />
          <Route path="/admin/content" element={<ContentLibrary isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie" element={<GenieHub />} />
          <Route path="/admin/genie/ai-bot" element={<GeniePipeline isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie-guided" element={<GenieGuidedLayout />}>
            <Route index element={<GenieGuidedWorkspace />} />
            <Route path="preview" element={<GenieGuidedPreview />} />
            <Route path="impact" element={<GenieGuidedImpact />} />
          </Route>
          <Route path="/admin/enterprise" element={<ELSStudio isDarkMode={isDarkMode} />} />
          <Route
            path="/admin/integrations"
            element={<EnterpriseRoute flag="sso" element={<AdminIntegrations isDarkMode={isDarkMode} />} />}
          />
          <Route
            path="/admin/security"
            element={<EnterpriseRoute flag="mfa" element={<AdminSecurityCenter isDarkMode={isDarkMode} />} />}
          />
          <Route
            path="/admin/audit-logs"
            element={<EnterpriseRoute flag="auditLogs" element={<AdminAuditLogViewer isDarkMode={isDarkMode} />} />}
          />
          <Route path="/admin/route-map" element={<AdminRouteMap isDarkMode={isDarkMode} />} />
          <Route
            path="/admin/exports"
            element={<EnterpriseRoute flag="dataExports" element={<AdminDataExports isDarkMode={isDarkMode} />} />}
          />
          <Route
            path="/admin/bulk-import"
            element={
              <EnterpriseRoute
                flag="bulkImport"
                element={
                  <BulkImport
                    isDarkMode={isDarkMode}
                    onImportUsers={handleBulkImportUsers}
                    onImportEnrollments={handleBulkImportEnrollments}
                    onImportCourses={handleBulkImportCourses}
                  />
                }
              />
            }
          />
          <Route path="/admin/genie/sources" element={<GenieSources isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie/sources/:sourceId" element={<GenieSourceDetailRoute isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie/ingestion" element={<Navigate to="/admin/genie-guided?stage=ingest&surface=legacy-ingest" replace />} />
          <Route path="/admin/genie/analyze" element={<Navigate to="/admin/genie-guided?stage=analyze&surface=legacy-analyze" replace />} />
          <Route path="/admin/genie/design" element={<Navigate to="/admin/genie-guided?stage=design&surface=legacy-design" replace />} />
          <Route path="/admin/genie/develop" element={<Navigate to="/admin/genie-guided?stage=develop&surface=legacy-develop" replace />} />
          <Route path="/admin/genie/implement" element={<Navigate to="/admin/genie-guided?stage=implement&surface=legacy-implement" replace />} />
          <Route path="/admin/genie/evaluate" element={<Navigate to="/admin/genie-guided?stage=evaluate&surface=legacy-evaluate" replace />} />
          <Route path="/admin/genie/studio" element={<GenieCourseStudio isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie/assessments" element={<GenieAssessments isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie/enrollments" element={<GenieEnrollments isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie/analytics" element={<GenieAnalytics isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie/compliance" element={<GenieCompliance isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie/notifications" element={<GenieNotifications isDarkMode={isDarkMode} />} />
          <Route path="/admin/genie/personalisation" element={<Navigate to="/admin/genie-guided?surface=personalisation-internal" replace />} />
          <Route path="/admin/genie/manager-portal" element={<Navigate to="/admin/genie-guided?surface=manager-portal-internal" replace />} />
          <Route path="/admin/genie/governance" element={<Navigate to="/admin/genie-guided?surface=governance-internal" replace />} />
          <Route path="/admin/genie/*" element={<Navigate to="/admin/genie" replace />} />
          <Route path="/admin/competencies" element={<AdminCompetencies isDarkMode={isDarkMode} />} />
          <Route path="/admin/gap-engine" element={<AdminGapEngine isDarkMode={isDarkMode} />} />
          <Route path="/admin/digital-twins" element={<AdminDigitalTwins isDarkMode={isDarkMode} />} />
          <Route path="/admin/predictions" element={<AdminPredictions isDarkMode={isDarkMode} />} />
          <Route path="/admin/forecasting" element={<AdminForecasting isDarkMode={isDarkMode} />} />
          <Route path="/admin/governance" element={<AdminGovernance isDarkMode={isDarkMode} />} />
          <Route path="/admin/enrollments" element={<EnrollmentManagement />} />
          <Route path="/admin/assignments" element={<AssignmentRules />} />
          <Route
            path="/admin/reports"
            element={
              <Suspense fallback={<AdminTableSkeleton />}>
                <ReportsDashboard isDarkMode={isDarkMode} />
              </Suspense>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <Suspense fallback={<AdminTableSkeleton />}>
                <ReportsDashboard isDarkMode={isDarkMode} />
              </Suspense>
            }
          />
          <Route path="/admin/forums" element={<DiscussionForum isDarkMode={isDarkMode} />} />
          <Route path="/admin/quizzes" element={<QuizBuilder isDarkMode={isDarkMode} />} />
          <Route
            path="/admin/workshops"
            element={
              <SurveyBuilder
                courses={courses.map(course => ({ id: course.id, title: course.title }))}
                onSave={async () => {}}
                onPublish={async () => {}}
                onPreview={() => {}}
                isDarkMode={isDarkMode}
              />
            }
          />
          <Route path="/admin/agents" element={<AgentDashboard isDarkMode={isDarkMode} />} />
          <Route path="/admin/settings" element={<LMSSettings isDarkMode={isDarkMode} />} />
        </Route>

        <Route path="*" element={<HomeDashboard isDarkMode={isDarkMode} />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  const navigate = useNavigate();

  return (
    <AppContextProvider onNavigate={(route) => {
      if (route && route !== window.location.pathname) {
        navigate(route);
      }
    }}>
      <ToastProvider>
        <RouterSync />
        <AppContent />
      </ToastProvider>
    </AppContextProvider>
  );
}

export default App;
