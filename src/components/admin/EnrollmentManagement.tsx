import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '../../store';
import { useAppContext } from '../../context/AppContext';
import { useLMSStore } from '../../store/lmsStore';
import { Enrollment, EnrollmentStatus, Course, OrgMember } from '../../types/lms';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { ErrorMessage } from '../ui/AsyncButton';
import {
  BookOpen,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  User,
  Users,
  TrendingUp,
  Eye,
  Trash2,
  RefreshCw,
  Download,
  ChevronDown,
  BarChart2,
  PlayCircle,
  Loader2
} from 'lucide-react';

type StatusFilter = 'all' | EnrollmentStatus;
type ViewMode = 'list' | 'detail';

const STATUS_CONFIG: Record<EnrollmentStatus, { label: string; color: string; icon: React.ReactNode }> = {
  not_started: {
    label: 'Not Started',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    icon: <Clock className="w-4 h-4" />
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: <TrendingUp className="w-4 h-4" />
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: <CheckCircle className="w-4 h-4" />
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: <XCircle className="w-4 h-4" />
  },
  overdue: {
    label: 'Overdue',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    icon: <AlertTriangle className="w-4 h-4" />
  },
  expired: {
    label: 'Expired',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: <XCircle className="w-4 h-4" />
  }
};

const PRIORITY_COLORS = {
  required: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  recommended: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  optional: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
};

export const EnrollmentManagement: React.FC = () => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const {
    currentOrg,
    enrollments,
    courses,
    members,
    selectedCourseId,
    setSelectedCourseId,
    loadEnrollments,
    loadCourses,
    loadMembers,
    updateEnrollment,
    deleteEnrollment,
    bulkEnroll,
    isLoading
  } = useLMSStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [courseFilter, setCourseFilter] = useState<string>(selectedCourseId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollCourseId, setEnrollCourseId] = useState<string>('');
  const [enrollUserIds, setEnrollUserIds] = useState<string[]>([]);
  const [enrollPriority, setEnrollPriority] = useState<'required' | 'recommended' | 'optional'>('required');
  const [enrollDueDate, setEnrollDueDate] = useState<string>('');
  const [enrollRole, setEnrollRole] = useState<'student' | 'teacher'>('student');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Safe async action wrapper with error handling
  const safeAction = useCallback(async (
    actionId: string,
    action: () => Promise<void>,
    errorMessage: string
  ) => {
    try {
      setActionError(null);
      setActionLoading(actionId);
      await action();
    } catch (err) {
      console.error(`[EnrollmentManagement] ${errorMessage}:`, err);
      setActionError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  }, []);

  useEffect(() => {
    if (currentOrg?.id) {
      loadEnrollments();
      loadCourses();
      loadMembers();
    }
  }, [currentOrg?.id, loadEnrollments, loadCourses, loadMembers]);

  useEffect(() => {
    if (selectedCourseId) {
      setCourseFilter(selectedCourseId);
    }
  }, [selectedCourseId]);

  // Create lookup maps
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach(c => map.set(c.id, c));
    return map;
  }, [courses]);

  const memberMap = useMemo(() => {
    const map = new Map<string, OrgMember>();
    members.forEach(m => map.set(m.id, m));
    return map;
  }, [members]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: enrollments.length,
      notStarted: enrollments.filter(e => e.status === 'not_started').length,
      inProgress: enrollments.filter(e => e.status === 'in_progress').length,
      completed: enrollments.filter(e => e.status === 'completed').length,
      overdue: enrollments.filter(e => e.status === 'overdue' || (e.dueDate && e.dueDate < now && e.status !== 'completed')).length,
      avgProgress: enrollments.length > 0
        ? Math.round(enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length)
        : 0
    };
  }, [enrollments]);

  // Filter enrollments
  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(enrollment => {
      const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;
      const matchesCourse = courseFilter === 'all' || enrollment.courseId === courseFilter;

      const member = memberMap.get(enrollment.userId);
      const course = courseMap.get(enrollment.courseId);
      const matchesSearch = !searchQuery ||
        member?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course?.title.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesCourse && matchesSearch;
    });
  }, [enrollments, statusFilter, courseFilter, searchQuery, memberMap, courseMap]);

  const handleViewDetails = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setViewMode('detail');
  };

  const handleResetProgress = async (enrollmentId: string) => {
    await safeAction(
      `reset-${enrollmentId}`,
      async () => {
        await updateEnrollment(enrollmentId, {
          status: 'not_started',
          progress: 0,
          startedAt: undefined,
          completedAt: undefined,
          score: undefined,
          attempts: 0,
          moduleProgress: {}
        });
      },
      'Failed to reset progress'
    );
  };

  const handleExtendDueDate = async (enrollment: Enrollment, days: number) => {
    await safeAction(
      `extend-${enrollment.id}`,
      async () => {
        const newDueDate = (enrollment.dueDate || Date.now()) + (days * 24 * 60 * 60 * 1000);
        await updateEnrollment(enrollment.id, {
          dueDate: newDueDate,
          status: enrollment.status === 'overdue' ? 'in_progress' : enrollment.status
        });
      },
      'Failed to extend due date'
    );
  };

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    await safeAction(
      `delete-${enrollmentId}`,
      async () => {
        await deleteEnrollment(enrollmentId);
        setShowDeleteConfirm(null);
      },
      'Failed to remove enrollment'
    );
  };

  const resetEnrollForm = () => {
    setEnrollCourseId('');
    setEnrollUserIds([]);
    setEnrollPriority('required');
    setEnrollDueDate('');
    setEnrollRole('student');
  };

  const handleEnrollUsers = async () => {
    if (!enrollCourseId || enrollUserIds.length === 0) return;
    await safeAction(
      'enroll',
      async () => {
        const dueDate = enrollDueDate ? new Date(enrollDueDate).getTime() : undefined;
        await bulkEnroll(enrollUserIds, enrollCourseId, { dueDate, priority: enrollPriority, role: enrollRole });
        setShowEnrollModal(false);
        resetEnrollForm();
      },
      'Failed to enroll users'
    );
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate?: number) => {
    if (!dueDate) return null;
    const now = Date.now();
    const days = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (viewMode === 'detail' && selectedEnrollment) {
    return (
      <EnrollmentDetail
        enrollment={selectedEnrollment}
        course={courseMap.get(selectedEnrollment.courseId)}
        member={memberMap.get(selectedEnrollment.userId)}
        isDarkMode={isDarkMode}
        onBack={() => setViewMode('list')}
        onReset={() => handleResetProgress(selectedEnrollment.id)}
        onExtend={(days) => handleExtendDueDate(selectedEnrollment, days)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      <AdminPageHeader
        title="Enrollment Management"
        subtitle="Track and manage learner enrollments across all courses"
        isDarkMode={isDarkMode}
        badge="Admin"
        actions={(
          <>
            <button
              className="btn-secondary-min flex items-center gap-2"
              disabled={!!actionLoading}
            >
              <Download className="w-5 h-5" />
              Export Report
            </button>
            <button
              onClick={() => setShowEnrollModal(true)}
              className="btn-primary-min flex items-center gap-2"
              disabled={!!actionLoading}
            >
              {actionLoading === 'enroll' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <User className="w-5 h-5" />
              )}
              Enrol users
            </button>
          </>
        )}
      />

      {/* Error notification */}
      {actionError && (
        <div className="px-6 pt-4">
          <ErrorMessage
            error={actionError}
            onRetry={() => setActionError(null)}
          />
        </div>
      )}

      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="space-y-4">
          <AdminSection title="Overview" isDarkMode={isDarkMode} minHeight="120px">
            <div className="grid grid-cols-6 gap-4">
              <StatCard
                label="Total"
                value={stats.total}
                icon={<Users className="w-5 h-5" />}
                isDarkMode={isDarkMode}
              />
              <StatCard
                label="Not Started"
                value={stats.notStarted}
                icon={<Clock className="w-5 h-5 text-gray-500" />}
                isDarkMode={isDarkMode}
              />
              <StatCard
                label="In Progress"
                value={stats.inProgress}
                icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
                isDarkMode={isDarkMode}
              />
              <StatCard
                label="Completed"
                value={stats.completed}
                icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                isDarkMode={isDarkMode}
              />
              <StatCard
                label="Overdue"
                value={stats.overdue}
                icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
                isDarkMode={isDarkMode}
                highlight={stats.overdue > 0}
              />
              <StatCard
                label="Avg Progress"
                value={`${stats.avgProgress}%`}
                icon={<BarChart2 className="w-5 h-5 text-indigo-500" />}
                isDarkMode={isDarkMode}
              />
            </div>
          </AdminSection>

          <AdminSection title="Filters" isDarkMode={isDarkMode} minHeight="72px">
            <AdminToolbar
              isDarkMode={isDarkMode}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by learner or course..."
              rightContent={(
                <>
                  <Filter className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="input-min"
                  >
                    <option value="all">All Status</option>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>

                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="input-min"
                  >
                    <option value="all">All Courses</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </>
              )}
            />
          </AdminSection>
        </div>
      </div>

      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl p-6 bg-app-surface border border-app-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Enrol users</h2>
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  resetEnrollForm();
                }}
                className="p-2 rounded-lg hover:bg-app-surface2"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Course
                </label>
                <select
                  value={enrollCourseId}
                  onChange={(e) => setEnrollCourseId(e.target.value)}
                  className="input-min w-full"
                >
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Users
                </label>
                <div className="border rounded-lg p-3 max-h-48 overflow-auto border-app-border bg-app-surface2">
                  {members.map(member => (
                    <label key={member.id} className="flex items-center gap-2 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={enrollUserIds.includes(member.id)}
                        onChange={(e) => {
                          setEnrollUserIds(prev => e.target.checked
                            ? [...prev, member.id]
                            : prev.filter(id => id !== member.id));
                        }}
                      />
                      <span>{member.name}</span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {member.email}
                      </span>
                    </label>
                  ))}
                  {members.length === 0 && (
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No users found.</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Priority
                  </label>
                <select
                  value={enrollPriority}
                  onChange={(e) => setEnrollPriority(e.target.value as 'required' | 'recommended' | 'optional')}
                  className="input-min w-full"
                >
                    <option value="required">Required</option>
                    <option value="recommended">Recommended</option>
                    <option value="optional">Optional</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Due date (optional)
                  </label>
                <input
                  type="date"
                  value={enrollDueDate}
                  onChange={(e) => setEnrollDueDate(e.target.value)}
                  className="input-min w-full"
                />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Role
                </label>
                <select
                  value={enrollRole}
                  onChange={(e) => setEnrollRole(e.target.value as 'student' | 'teacher')}
                  className="input-min w-full"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowEnrollModal(false);
                  resetEnrollForm();
                }}
                className="btn-secondary-min"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleEnrollUsers();
                  setSelectedCourseId(enrollCourseId || null);
                }}
                disabled={!enrollCourseId || enrollUserIds.length === 0}
                className="btn-primary-min disabled:opacity-50"
              >
                Enrol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment List */}
      <div className="flex-1 overflow-auto p-6">
        <AdminSection title="Enrollments" isDarkMode={isDarkMode} minHeight="240px">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No enrollments found</p>
              <p className="text-sm">Assign training to learners to see enrollments here</p>
            </div>
          ) : (
            <div className="card-min overflow-hidden">
              <table className="w-full">
                <thead className="bg-app-surface2">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                      Learner
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                      Course
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                      Progress
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-app-muted">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-app-surface">
                  {filteredEnrollments.map((enrollment) => {
                    const member = memberMap.get(enrollment.userId);
                    const course = courseMap.get(enrollment.courseId);
                    const daysUntilDue = getDaysUntilDue(enrollment.dueDate);

                    return (
                      <EnrollmentRow
                        key={enrollment.id}
                        enrollment={enrollment}
                        member={member}
                        course={course}
                        daysUntilDue={daysUntilDue}
                        isDarkMode={isDarkMode}
                        formatDate={formatDate}
                        onView={() => handleViewDetails(enrollment)}
                        onReset={() => handleResetProgress(enrollment.id)}
                        onExtend={(days) => handleExtendDueDate(enrollment, days)}
                        onDelete={() => setShowDeleteConfirm(enrollment.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-xl max-w-md w-full mx-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-semibold mb-2">Remove Enrollment?</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This will permanently remove this enrollment and all progress data.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEnrollment(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isDarkMode: boolean;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, isDarkMode, highlight }) => (
  <div className={`p-3 rounded-lg border ${
    highlight
      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
      : isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
  }`}>
    <div className="flex items-center justify-between">
      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      {icon}
    </div>
    <p className={`text-xl font-bold mt-1 ${highlight ? 'text-orange-600' : ''}`}>{value}</p>
  </div>
);

// Enrollment Row Component
interface EnrollmentRowProps {
  enrollment: Enrollment;
  member?: OrgMember;
  course?: Course;
  daysUntilDue: number | null;
  isDarkMode: boolean;
  formatDate: (timestamp?: number) => string;
  onView: () => void;
  onReset: () => void;
  onExtend: (days: number) => void;
  onDelete: () => void;
}

const EnrollmentRow: React.FC<EnrollmentRowProps> = ({
  enrollment,
  member,
  course,
  daysUntilDue,
  isDarkMode,
  formatDate,
  onView,
  onReset,
  onExtend,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = STATUS_CONFIG[enrollment.status];

  return (
    <tr className="border-t border-app-border hover:bg-app-surface2">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-indigo-600`}>
            {member?.name.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-sm">{member?.name || 'Unknown User'}</p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {member?.email || '-'}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-sm truncate max-w-[200px]">{course?.title || 'Unknown Course'}</p>
        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {course?.estimatedDuration || 0} min
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[enrollment.priority]}`}>
            {enrollment.priority.charAt(0).toUpperCase() + enrollment.priority.slice(1)}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
          }`}>
            {enrollment.role === 'teacher' ? 'Teacher' : 'Student'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="w-32">
          <div className="flex items-center justify-between text-xs mb-1">
            <span>{enrollment.progress}%</span>
            {enrollment.score !== undefined && (
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                Score: {enrollment.score}%
              </span>
            )}
          </div>
          <div className={`h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className={`h-full rounded-full transition-all ${
                enrollment.progress >= 100 ? 'bg-green-500' :
                enrollment.progress >= 50 ? 'bg-blue-500' :
                'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(enrollment.progress, 100)}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="text-sm">{formatDate(enrollment.dueDate)}</p>
          {daysUntilDue !== null && (
            <p className={`text-xs ${
              daysUntilDue < 0 ? 'text-red-500' :
              daysUntilDue <= 3 ? 'text-orange-500' :
              daysUntilDue <= 7 ? 'text-yellow-500' :
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {daysUntilDue < 0
                ? `${Math.abs(daysUntilDue)} days overdue`
                : daysUntilDue === 0
                  ? 'Due today'
                  : `${daysUntilDue} days left`
              }
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="relative flex justify-end">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className={`absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border z-20 ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <button
                  onClick={() => { onView(); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button
                  onClick={() => { onExtend(7); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Extend 7 Days
                </button>
                <button
                  onClick={() => { onReset(); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left text-orange-600 ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" /> Reset Progress
                </button>
                <hr className={isDarkMode ? 'border-gray-700' : 'border-gray-200'} />
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

// Enrollment Detail View
interface EnrollmentDetailProps {
  enrollment: Enrollment;
  course?: Course;
  member?: OrgMember;
  isDarkMode: boolean;
  onBack: () => void;
  onReset: () => void;
  onExtend: (days: number) => void;
}

const EnrollmentDetail: React.FC<EnrollmentDetailProps> = ({
  enrollment,
  course,
  member,
  isDarkMode,
  onBack,
  onReset,
  onExtend
}) => {
  const { openCourse, navigate } = useAppContext();
  const statusConfig = STATUS_CONFIG[enrollment.status];
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const moduleProgressMap = enrollment.moduleProgress || {};

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      {/* Header */}
      <div className="p-6 border-b border-app-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-app-surface2"
            >
              <ChevronDown className="w-5 h-5 rotate-90" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Enrollment Details</h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {member?.name} - {course?.title} • Role: {enrollment.role === 'teacher' ? 'Teacher' : 'Student'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (course) {
                  openCourse(course.id, course.title);
                  navigate('/course/player');
                }
              }}
              className="btn-secondary-min flex items-center gap-2 border-app-accent text-app-accent"
            >
              <PlayCircle className="w-5 h-5" />
              View in course
            </button>
            <button
              onClick={() => onExtend(7)}
              className="btn-secondary-min flex items-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Extend Due Date
            </button>
            <button
              onClick={onReset}
              className="btn-primary-min flex items-center gap-2 bg-orange-600 text-white hover:bg-orange-700"
            >
              <RefreshCw className="w-5 h-5" />
              Reset Progress
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-full ${statusConfig.color}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Progress</p>
              <p className="text-2xl font-bold mt-1">{enrollment.progress}%</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Score</p>
              <p className="text-2xl font-bold mt-1">{enrollment.score ?? '-'}%</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Attempts</p>
              <p className="text-2xl font-bold mt-1">{enrollment.attempts}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>
            <div className="space-y-4">
              <TimelineItem
                label="Assigned"
                date={formatDate(enrollment.assignedAt)}
                isDarkMode={isDarkMode}
                completed
              />
              <TimelineItem
                label="Started"
                date={formatDate(enrollment.startedAt)}
                isDarkMode={isDarkMode}
                completed={!!enrollment.startedAt}
              />
              <TimelineItem
                label="Due Date"
                date={formatDate(enrollment.dueDate)}
                isDarkMode={isDarkMode}
                highlight={enrollment.dueDate && enrollment.dueDate < Date.now() && enrollment.status !== 'completed'}
              />
              <TimelineItem
                label="Completed"
                date={formatDate(enrollment.completedAt)}
                isDarkMode={isDarkMode}
                completed={!!enrollment.completedAt}
              />
            </div>
          </div>

          {/* Module Progress */}
          {course && course.modules.length > 0 && (
            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className="text-lg font-semibold mb-4">Module Progress</h2>
              <div className="space-y-3">
                {course.modules.map((module) => {
                  const moduleProgress = moduleProgressMap[module.id];
                  const completedLessons = moduleProgress?.completedLessons?.length || 0;
                  const totalLessons = module.lessons.length;
                  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                  const isExpanded = expandedModules.has(module.id);

                  return (
                    <div key={module.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleModule(module.id)}
                            className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          </button>
                          <span className="font-medium">{module.title}</span>
                        </div>
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {completedLessons}/{totalLessons} lessons
                        </span>
                      </div>
                      <div className={`h-2 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress >= 100 ? 'bg-green-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {moduleProgress?.quizScore !== undefined && (
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Quiz Score: {moduleProgress.quizScore}%
                        </p>
                      )}
                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {module.lessons.map((lesson) => {
                            const completed = moduleProgress?.completedLessons?.includes(lesson.id) || false;
                            return (
                              <div
                                key={lesson.id}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                                }`}
                              >
                                <div>
                                  <p className="text-sm font-medium">{lesson.title}</p>
                                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {lesson.type.replace('_', ' ')} • {lesson.duration} min
                                  </p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  completed
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {completed ? 'Completed' : 'Not started'}
                                </span>
                              </div>
                            );
                          })}
                          {module.lessons.length === 0 && (
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              No lessons in this module yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Timeline Item Component
interface TimelineItemProps {
  label: string;
  date: string;
  isDarkMode: boolean;
  completed?: boolean;
  highlight?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ label, date, isDarkMode, completed, highlight }) => (
  <div className="flex items-center gap-4">
    <div className={`w-3 h-3 rounded-full ${
      highlight ? 'bg-red-500' :
      completed ? 'bg-green-500' :
      isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
    }`} />
    <div className="flex-1">
      <p className={`font-medium ${highlight ? 'text-red-500' : ''}`}>{label}</p>
      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{date}</p>
    </div>
  </div>
);

// Wrap with ErrorBoundary for production resilience
const EnrollmentManagementWithErrorBoundary: React.FC = () => (
  <ErrorBoundary
    title="Enrollment Management Error"
    onRetry={() => window.location.reload()}
  >
    <EnrollmentManagement />
  </ErrorBoundary>
);

export default EnrollmentManagementWithErrorBoundary;
