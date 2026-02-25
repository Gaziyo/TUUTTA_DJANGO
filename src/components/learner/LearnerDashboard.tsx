import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Enrollment, Course, EnrollmentStatus, Certificate, AnalyticsRecommendation } from '../../types/lms';
import {
  BookOpen,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  PlayCircle,
  Calendar,
  BarChart2,
  Trophy,
  Brain,
  AlertTriangle,
  Activity,
  Gauge
} from 'lucide-react';
import cognitiveProfileService from '../../services/cognitiveProfileService';
import gapMatrixService from '../../services/gapMatrixService';
import adaptiveRecommendationService from '../../services/adaptiveRecommendationService';

type TabType = 'all' | 'in_progress' | 'completed' | 'overdue';

const STATUS_CONFIG: Record<EnrollmentStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: 'Not Started', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900' },
  completed: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900' },
  failed: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900' },
  overdue: { label: 'Overdue', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900' },
  expired: { label: 'Expired', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900' }
};

interface LearnerDashboardProps {
  isDarkMode?: boolean;
  onStartCourse?: (enrollment: Enrollment, course: Course) => void;
  onViewCertificate?: (certificate: Certificate) => void;
}

export const LearnerDashboard: React.FC<LearnerDashboardProps> = ({
  onStartCourse = () => {},
  onViewCertificate: _onViewCertificate = () => {}
}) => {
  const { user } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const {
    currentOrg,
    enrollments,
    courses,
    loadEnrollments,
    loadCourses,
    isLoading
  } = useLMSStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendations, setRecommendations] = useState<AnalyticsRecommendation[]>([]);
  const [cognitiveProfile, setCognitiveProfile] = useState<any>(null);
  const [gapEntries, setGapEntries] = useState<any[]>([]);
  const [failureRisks, setFailureRisks] = useState<any[]>([]);

  useEffect(() => {
    if (currentOrg?.id) {
      loadEnrollments();
      loadCourses();
    }
  }, [currentOrg?.id, loadEnrollments, loadCourses]);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!currentOrg?.id || !user?.id) return;
      // Analytics recommendations — Django endpoint pending; use empty list for now
      setRecommendations([]);
    };
    void loadRecommendations();
  }, [currentOrg?.id, user?.id]);

  useEffect(() => {
    const loadCognitive = async () => {
      if (!currentOrg?.id || !user?.id) return;
      const profile = await cognitiveProfileService.getForCurrentUser(currentOrg.id);
      setCognitiveProfile(profile);
      const gaps = await gapMatrixService.listForUser(currentOrg.id, user.id);
      setGapEntries(gaps);
      const risks = await adaptiveRecommendationService.listFailureRisks(currentOrg.id);
      setFailureRisks(risks);
    };
    void loadCognitive();
  }, [currentOrg?.id, user?.id]);

  // Get user's enrollments
  const myEnrollments = useMemo(() => {
    if (!user) return [];
    return enrollments.filter(e => e.userId === user.id);
  }, [enrollments, user]);

  // Create course lookup
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach(c => map.set(c.id, c));
    return map;
  }, [courses]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = Date.now();
    const total = myEnrollments.length;
    const completed = myEnrollments.filter(e => e.status === 'completed').length;
    const inProgress = myEnrollments.filter(e => e.status === 'in_progress').length;
    const overdue = myEnrollments.filter(e =>
      e.status === 'overdue' || (e.dueDate && e.dueDate < now && e.status !== 'completed')
    ).length;

    const totalProgress = myEnrollments.reduce((sum, e) => sum + e.progress, 0);
    const avgProgress = total > 0 ? Math.round(totalProgress / total) : 0;

    const scores = myEnrollments.filter(e => e.score !== undefined);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((sum, e) => sum + (e.score || 0), 0) / scores.length)
      : 0;

    const totalTime = myEnrollments.reduce((sum, e) => {
      const course = courseMap.get(e.courseId);
      return sum + ((course?.estimatedDuration || 0) * (e.progress / 100));
    }, 0);

    return { total, completed, inProgress, overdue, avgProgress, avgScore, totalTime: Math.round(totalTime) };
  }, [myEnrollments, courseMap]);

  const dominantBloom = cognitiveProfile ? cognitiveProfileService.getDominantBloomLevel(cognitiveProfile) : null;
  const dominantModality = cognitiveProfile ? cognitiveProfileService.getDominantModality(cognitiveProfile) : null;
  const engagementIndex = cognitiveProfile
    ? Math.min(100, Math.round((cognitiveProfile.totalQuestionsAnswered || 0) / 5))
    : 0;

  const topGaps = useMemo(() => {
    return [...gapEntries].sort((a, b) => (b.gapScore ?? 0) - (a.gapScore ?? 0)).slice(0, 5);
  }, [gapEntries]);

  const highRisk = useMemo(() => {
    const sorted = [...failureRisks].sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
    return sorted[0] || null;
  }, [failureRisks]);

  // Filter enrollments
  const filteredEnrollments = useMemo(() => {
    const now = Date.now();
    return myEnrollments.filter(enrollment => {
      // Tab filter
      if (activeTab === 'in_progress' && enrollment.status !== 'in_progress' && enrollment.status !== 'not_started') {
        return false;
      }
      if (activeTab === 'completed' && enrollment.status !== 'completed') {
        return false;
      }
      if (activeTab === 'overdue') {
        const isOverdue = enrollment.status === 'overdue' ||
          (enrollment.dueDate && enrollment.dueDate < now && enrollment.status !== 'completed');
        if (!isOverdue) return false;
      }

      // Search filter
      if (searchQuery) {
        const course = courseMap.get(enrollment.courseId);
        if (!course?.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [myEnrollments, activeTab, searchQuery, courseMap]);

  // Get upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return myEnrollments
      .filter(e => e.dueDate && e.dueDate > now && e.dueDate < now + sevenDays && e.status !== 'completed')
      .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))
      .slice(0, 3);
  }, [myEnrollments]);

  // Get recently completed
  const recentlyCompleted = useMemo(() => {
    return myEnrollments
      .filter(e => e.status === 'completed' && e.completedAt)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
      .slice(0, 3);
  }, [myEnrollments]);

  const getDaysUntilDue = (dueDate?: number) => {
    if (!dueDate) return null;
    const days = Math.ceil((dueDate - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleRecommendationAction = async (rec: AnalyticsRecommendation, status: 'followed' | 'ignored') => {
    if (!currentOrg?.id || !user?.id || !rec.id) return;
    // Feedback persistence — Django endpoint pending; update local state only
    setRecommendations(prev => prev.map(item => (item.id === rec.id ? { ...item, status } : item)));
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Learning</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Track your training progress and continue learning
            </p>
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className={`mb-6 rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-500">AI Recommendations</h2>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Suggestions based on your learning progress
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {recommendations.map(rec => (
                <div
                  key={rec.id}
                  className={`rounded-lg border p-3 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{rec.title}</div>
                      <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {rec.message}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRecommendationAction(rec, 'followed')}
                        className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-500"
                      >
                        Followed
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecommendationAction(rec, 'ignored')}
                        className={`text-xs px-3 py-1.5 rounded-md ${
                          isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                  {rec.status && (
                    <div className={`mt-2 text-[11px] uppercase tracking-wide ${
                      rec.status === 'followed' ? 'text-green-500' : 'text-orange-500'
                    }`}
                    >
                      {rec.status}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className={`p-4 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-semibold">Cognitive Profile</h2>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Dominant Bloom: {dominantBloom ? `L${dominantBloom}` : '—'}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Strongest modality: {dominantModality ?? '—'}
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Engagement index</span>
                <span className={isDarkMode ? 'text-gray-200' : 'text-gray-700'}>{engagementIndex}%</span>
              </div>
              <progress
                className={`progress-base ${isDarkMode ? 'progress-track-dark' : 'progress-track-light'} progress-fill-indigo`}
                value={engagementIndex}
                max={100}
                aria-label="Engagement index"
              />
            </div>
            <p className={`text-xs mt-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              Avg response time: {cognitiveProfile?.avgResponseTimeMs ? `${Math.round(cognitiveProfile.avgResponseTimeMs)}ms` : '—'}
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold">Competency Matrix</h2>
            </div>
            {topGaps.length === 0 ? (
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No active gaps detected.
              </p>
            ) : (
              <div className="space-y-2">
                {topGaps.map((gap) => (
                  <div key={gap.id} className="flex items-center justify-between text-xs">
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {gap.competencyName || 'Competency'}
                    </span>
                    <span className={isDarkMode ? 'text-amber-400' : 'text-amber-600'}>
                      Gap {Math.round((gap.gapScore ?? 0) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`p-4 rounded-xl border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-semibold">Predictive Panel</h2>
            </div>
            {highRisk ? (
              <>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Risk level: <span className="font-semibold">{highRisk.risk_level}</span>
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Risk score: {Math.round((highRisk.risk_score ?? 0) * 100)}%
                </p>
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  Reasons: {highRisk.reasons?.join(', ') || 'No details'}
                </p>
              </>
            ) : (
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No high-risk alerts.
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Gauge className="w-3 h-3 text-indigo-500" />
              Estimated mastery: {highRisk ? `${Math.max(1, Math.round((1 - (highRisk.risk_score ?? 0)) * 4))} weeks` : '—'}
            </div>
          </div>
        </div>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <StatCard
            label="Total Courses"
            value={stats.total}
            icon={<BookOpen className="w-5 h-5 text-indigo-500" />}
            isDarkMode={isDarkMode}
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon={<CheckCircle className="w-5 h-5 text-green-500" />}
            isDarkMode={isDarkMode}
          />
          <StatCard
            label="In Progress"
            value={stats.inProgress}
            icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
            isDarkMode={isDarkMode}
          />
          <StatCard
            label="Avg Score"
            value={`${stats.avgScore}%`}
            icon={<Target className="w-5 h-5 text-yellow-500" />}
            isDarkMode={isDarkMode}
          />
          <StatCard
            label="Time Spent"
            value={`${stats.totalTime}m`}
            icon={<Clock className="w-5 h-5 text-purple-500" />}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Main Content - Course List */}
            <div className="col-span-2 space-y-4">
              {/* Tabs & Search */}
              <div className="flex items-center justify-between">
                <div className={`flex rounded-lg p-1 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  {([
                    { id: 'all', label: 'All' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'overdue', label: 'Overdue' }
                  ] as { id: TabType; label: string }[]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-indigo-600 text-white'
                          : isDarkMode
                            ? 'text-gray-400 hover:text-white'
                            : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                      {tab.id === 'overdue' && stats.overdue > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                          {stats.overdue}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search courses"
                  title="Search courses"
                  className={`px-4 py-2 rounded-lg border text-sm ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              {/* Course Cards */}
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : filteredEnrollments.length === 0 ? (
                <div className={`text-center py-12 rounded-xl border ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <BookOpen className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    No courses found
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {activeTab === 'all' ? 'You have no assigned training' : `No ${activeTab.replace('_', ' ')} courses`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEnrollments.map((enrollment) => {
                    const course = courseMap.get(enrollment.courseId);
                    if (!course) return null;

                    return (
                      <CourseCard
                        key={enrollment.id}
                        enrollment={enrollment}
                        course={course}
                        isDarkMode={isDarkMode}
                        onStart={() => onStartCourse(enrollment, course)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Upcoming Deadlines */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <h3 className="font-semibold">Upcoming Deadlines</h3>
                </div>

                {upcomingDeadlines.length === 0 ? (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No upcoming deadlines
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingDeadlines.map((enrollment) => {
                      const course = courseMap.get(enrollment.courseId);
                      const daysLeft = getDaysUntilDue(enrollment.dueDate);

                      return (
                        <div
                          key={enrollment.id}
                          className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                        >
                          <p className="font-medium text-sm truncate">{course?.title}</p>
                          <p className={`text-xs ${
                            daysLeft && daysLeft <= 3 ? 'text-orange-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `${daysLeft} days left`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recently Completed */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className={`w-5 h-5 text-yellow-500`} />
                  <h3 className="font-semibold">Recently Completed</h3>
                </div>

                {recentlyCompleted.length === 0 ? (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Complete a course to see it here
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentlyCompleted.map((enrollment) => {
                      const course = courseMap.get(enrollment.courseId);

                      return (
                        <div
                          key={enrollment.id}
                          className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                        >
                          <p className="font-medium text-sm truncate">{course?.title}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatDate(enrollment.completedAt)}
                            </p>
                            {enrollment.score !== undefined && (
                              <span className="text-xs font-medium text-green-500">
                                Score: {enrollment.score}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Progress Overview */}
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart2 className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <h3 className="font-semibold">Overall Progress</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion Rate</span>
                      <span className="font-medium">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                      </span>
                    </div>
                    <progress
                      className={`progress-base ${isDarkMode ? 'progress-track-dark' : 'progress-track-light'} progress-fill-green`}
                      value={stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}
                      max={100}
                      aria-label="Completion rate"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average Progress</span>
                      <span className="font-medium">{stats.avgProgress}%</span>
                    </div>
                    <progress
                      className={`progress-base ${isDarkMode ? 'progress-track-dark' : 'progress-track-light'} progress-fill-indigo`}
                      value={stats.avgProgress}
                      max={100}
                      aria-label="Average progress"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isDarkMode: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, isDarkMode }) => (
  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      </div>
    </div>
  </div>
);

// Course Card Component
interface CourseCardProps {
  enrollment: Enrollment;
  course: Course;
  isDarkMode: boolean;
  onStart: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({
  enrollment,
  course,
  isDarkMode,
  onStart
}) => {
  const now = Date.now();
  const isOverdue = enrollment.dueDate && enrollment.dueDate < now && enrollment.status !== 'completed';
  const daysLeft = enrollment.dueDate ? Math.ceil((enrollment.dueDate - now) / (1000 * 60 * 60 * 24)) : null;
  const statusConfig = STATUS_CONFIG[enrollment.status];

  return (
    <div
      className={`p-4 rounded-xl border transition-shadow hover:shadow-lg ${
        isOverdue
          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
          : isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className={`w-24 h-16 rounded-lg flex-shrink-0 flex items-center justify-center ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          {course.thumbnail ? (
            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <BookOpen className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold truncate">{course.title}</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {course.modules.length} modules • {course.estimatedDuration} min
              </p>
            </div>

            <button
              onClick={onStart}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0"
            >
              {enrollment.status === 'completed' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Review
                </>
              ) : enrollment.status === 'in_progress' ? (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Continue
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Start
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
                {enrollment.score !== undefined && (
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Score: {enrollment.score}%
                  </span>
                )}
              </div>
              <span className={`text-xs ${
                isOverdue ? 'text-orange-500 font-medium' :
                daysLeft !== null && daysLeft <= 3 ? 'text-yellow-500' :
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {isOverdue ? `${Math.abs(daysLeft || 0)} days overdue` :
                 daysLeft === 0 ? 'Due today' :
                 daysLeft === 1 ? 'Due tomorrow' :
                 daysLeft !== null ? `${daysLeft} days left` : ''}
              </span>
            </div>
            <progress
              className={`progress-base ${isDarkMode ? 'progress-track-dark' : 'progress-track-light'} ${
                enrollment.status === 'completed'
                  ? 'progress-fill-green'
                  : isOverdue
                    ? 'progress-fill-orange'
                    : 'progress-fill-indigo'
              }`}
              value={Math.min(enrollment.progress, 100)}
              max={100}
              aria-label={`${course.name} progress`}
            />
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {enrollment.progress}% complete
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LearnerDashboardWithErrorBoundary(props: LearnerDashboardProps) {
  return (
    <ErrorBoundary title="LearnerDashboard">
      <LearnerDashboard {...props} />
    </ErrorBoundary>
  );
}
