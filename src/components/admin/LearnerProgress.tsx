import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { remediationService } from '../../services';
import { OrgMember, Enrollment, Course, EnrollmentStatus, RemediationAssignment } from '../../types/lms';
import {
  User,
  Search,
  Filter,
  BookOpen,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Download,
  Mail,
  BarChart2,
  Target,
  Trophy,
  Star
} from 'lucide-react';

type ViewMode = 'list' | 'detail';

const STATUS_CONFIG: Record<EnrollmentStatus, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  overdue: { label: 'Overdue', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  expired: { label: 'Expired', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
};

export const LearnerProgress: React.FC = () => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const {
    currentOrg,
    members,
    enrollments,
    courses,
    competencyScores,
    competencyBadges,
    remediationAssignments,
    loadMembers,
    loadEnrollments,
    loadCourses,
    loadCompetencyScores,
    loadCompetencyBadges,
    loadRemediationAssignments,
    updateRemediationAssignment,
    isLoading
  } = useLMSStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'at_risk' | 'completed'>('all');
  const [selectedRemediationEnrollment, setSelectedRemediationEnrollment] = useState<string>('');
  const [remediationReason, setRemediationReason] = useState('');
  const [remediationMessage, setRemediationMessage] = useState<string | null>(null);
  const [remediationStatusFilter, setRemediationStatusFilter] = useState<'all' | 'assigned' | 'completed' | 'dismissed'>('all');
  const [remediationSearch, setRemediationSearch] = useState('');
  const [remediationFrom, setRemediationFrom] = useState('');
  const [remediationTo, setRemediationTo] = useState('');
  const [globalRemediationSearch, setGlobalRemediationSearch] = useState('');
  const [globalRemediationStatus, setGlobalRemediationStatus] = useState<'all' | 'assigned' | 'completed' | 'dismissed'>('all');
  const [globalRemediationFrom, setGlobalRemediationFrom] = useState('');
  const [globalRemediationTo, setGlobalRemediationTo] = useState('');

  const competencyByUser = useMemo(() => {
    const map = new Map<string, { avgScore: number; total: number }>();
    const grouped = new Map<string, number[]>();
    competencyScores.forEach((score) => {
      const list = grouped.get(score.userId) || [];
      list.push(score.score || 0);
      grouped.set(score.userId, list);
    });
    grouped.forEach((scores, userId) => {
      const avg = scores.length ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;
      map.set(userId, { avgScore: avg, total: scores.length });
    });
    return map;
  }, [competencyScores]);

  const remediationByUser = useMemo(() => {
    const map = new Map<string, { assigned: number; total: number }>();
    remediationAssignments.forEach((assignment) => {
      const entry = map.get(assignment.userId) || { assigned: 0, total: 0 };
      entry.total += 1;
      if (assignment.status === 'assigned') entry.assigned += 1;
      map.set(assignment.userId, entry);
    });
    return map;
  }, [remediationAssignments]);

  useEffect(() => {
    if (currentOrg?.id) {
      loadMembers();
      loadEnrollments();
      loadCourses();
      loadCompetencyScores();
      loadCompetencyBadges();
      loadRemediationAssignments();
    }
  }, [currentOrg?.id, loadMembers, loadEnrollments, loadCourses, loadCompetencyScores, loadCompetencyBadges, loadRemediationAssignments]);

  // Create lookup maps
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach(c => map.set(c.id, c));
    return map;
  }, [courses]);

  // Calculate learner stats
  const learnerStats = useMemo(() => {
    const stats = new Map<string, {
      totalEnrollments: number;
      completed: number;
      inProgress: number;
      overdue: number;
      avgProgress: number;
      avgScore: number;
      totalTime: number;
    }>();

    members.forEach(member => {
      const memberEnrollments = enrollments.filter(e => e.userId === member.id);
      const completed = memberEnrollments.filter(e => e.status === 'completed').length;
      const inProgress = memberEnrollments.filter(e => e.status === 'in_progress').length;
      const overdue = memberEnrollments.filter(e => e.status === 'overdue' ||
        (e.dueDate && e.dueDate < Date.now() && e.status !== 'completed')).length;

      const progressSum = memberEnrollments.reduce((sum, e) => sum + e.progress, 0);
      const scoresWithValue = memberEnrollments.filter(e => e.score !== undefined);
      const scoreSum = scoresWithValue.reduce((sum, e) => sum + (e.score || 0), 0);

      // Estimate time based on course durations and progress
      const totalTime = memberEnrollments.reduce((sum, e) => {
        const course = courseMap.get(e.courseId);
        return sum + ((course?.estimatedDuration || 0) * (e.progress / 100));
      }, 0);

      stats.set(member.id, {
        totalEnrollments: memberEnrollments.length,
        completed,
        inProgress,
        overdue,
        avgProgress: memberEnrollments.length > 0 ? Math.round(progressSum / memberEnrollments.length) : 0,
        avgScore: scoresWithValue.length > 0 ? Math.round(scoreSum / scoresWithValue.length) : 0,
        totalTime: Math.round(totalTime)
      });
    });

    return stats;
  }, [members, enrollments, courseMap]);

  // Filter learners
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const stats = learnerStats.get(member.id);
      if (!stats) return statusFilter === 'all';

      switch (statusFilter) {
        case 'active':
          return stats.inProgress > 0;
        case 'at_risk':
          return stats.overdue > 0;
        case 'completed':
          return stats.completed > 0 && stats.inProgress === 0 && stats.overdue === 0;
        default:
          return true;
      }
    });
  }, [members, searchQuery, statusFilter, learnerStats]);

  // Overall stats
  const overallStats = useMemo(() => {
    let totalCompleted = 0;
    let totalEnrollments = 0;

    learnerStats.forEach(stats => {
      totalCompleted += stats.completed;
      totalEnrollments += stats.totalEnrollments;
    });

    return {
      totalLearners: members.filter(m => m.role === 'learner').length,
      activeLearners: Array.from(learnerStats.values()).filter(s => s.inProgress > 0).length,
      atRiskLearners: Array.from(learnerStats.values()).filter(s => s.overdue > 0).length,
      completionRate: totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0
    };
  }, [members, learnerStats]);

  const handleViewDetails = (member: OrgMember) => {
    setSelectedMember(member);
    setViewMode('detail');
  };

  if (viewMode === 'detail' && selectedMember) {
    const memberEnrollments = enrollments.filter(e => e.userId === selectedMember.id);
    const stats = learnerStats.get(selectedMember.id);
    const competencyStats = competencyByUser.get(selectedMember.id);
    const remediationStats = remediationByUser.get(selectedMember.id);
    const memberRemediations = remediationAssignments.filter((assignment) => assignment.userId === selectedMember.id);
    const memberBadges = competencyBadges.filter((badge) => badge.userId === selectedMember.id);
    const filterByDate = (assignment: { createdAt?: number }, from: string, to: string) => {
      if (!from && !to) return true;
      const createdAt = assignment.createdAt || 0;
      if (from) {
        const fromTime = new Date(from).getTime();
        if (createdAt < fromTime) return false;
      }
      if (to) {
        const toTime = new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (createdAt > toTime) return false;
      }
      return true;
    };

    const filteredRemediations = memberRemediations.filter((assignment) => {
      if (remediationStatusFilter !== 'all' && assignment.status !== remediationStatusFilter) return false;
      if (!filterByDate(assignment, remediationFrom, remediationTo)) return false;
      if (!remediationSearch.trim()) return true;
      const courseTitle = courses.find((course) => course.id === assignment.courseId)?.title || '';
      const haystack = `${courseTitle} ${assignment.reason || ''}`.toLowerCase();
      return haystack.includes(remediationSearch.toLowerCase());
    });

    return (
      <LearnerDetail
        member={selectedMember}
        enrollments={memberEnrollments}
        courses={courses}
        stats={stats}
        competencyStats={competencyStats}
        remediationStats={remediationStats}
        remediations={filteredRemediations}
        competencyBadges={memberBadges}
        onCreateRemediation={async (payload) => {
          if (!currentOrg?.id) return;
          try {
            await remediationService.create({
              orgId: currentOrg.id,
              userId: selectedMember.id,
              enrollmentId: payload.enrollmentId,
              courseId: payload.courseId,
              moduleId: payload.moduleId,
              lessonId: payload.lessonId,
              status: 'assigned',
              reason: payload.reason || 'Manual remediation assigned',
              scheduledReassessmentAt: payload.scheduleAt
            });
            setRemediationMessage('Remediation assigned.');
            loadRemediationAssignments();
          } catch (error) {
            setRemediationMessage((error as Error).message);
          }
        }}
        onUpdateRemediation={updateRemediationAssignment}
        remediationDraft={{
          selectedEnrollmentId: selectedRemediationEnrollment,
          reason: remediationReason
        }}
        onRemediationDraftChange={(draft) => {
          setSelectedRemediationEnrollment(draft.selectedEnrollmentId);
          setRemediationReason(draft.reason);
        }}
        remediationMessage={remediationMessage}
        remediationStatusFilter={remediationStatusFilter}
        remediationSearch={remediationSearch}
        remediationFrom={remediationFrom}
        remediationTo={remediationTo}
        onRemediationFilterChange={(nextStatus, nextSearch, nextFrom, nextTo) => {
          setRemediationStatusFilter(nextStatus);
          setRemediationSearch(nextSearch);
          setRemediationFrom(nextFrom);
          setRemediationTo(nextTo);
        }}
        isDarkMode={isDarkMode}
        onBack={() => setViewMode('list')}
      />
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Learner Progress</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Track individual learner performance and training completion
            </p>
          </div>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              isDarkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <StatCard
            label="Total Learners"
            value={overallStats.totalLearners}
            icon={<User className="w-5 h-5 text-indigo-500" />}
            isDarkMode={isDarkMode}
          />
          <StatCard
            label="Active Learners"
            value={overallStats.activeLearners}
            icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
            isDarkMode={isDarkMode}
          />
          <StatCard
            label="At Risk"
            value={overallStats.atRiskLearners}
            icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
            isDarkMode={isDarkMode}
            highlight={overallStats.atRiskLearners > 0}
          />
          <StatCard
            label="Completion Rate"
            value={`${overallStats.completionRate}%`}
            icon={<Target className="w-5 h-5 text-green-500" />}
            isDarkMode={isDarkMode}
          />
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Remediation Overview</h2>
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {remediationAssignments.length} total
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</label>
              <select
                value={globalRemediationStatus}
                onChange={(e) => setGlobalRemediationStatus(e.target.value as typeof globalRemediationStatus)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <option value="all">All</option>
                <option value="assigned">Assigned</option>
                <option value="completed">Completed</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>From</label>
              <input
                type="date"
                value={globalRemediationFrom}
                onChange={(e) => setGlobalRemediationFrom(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                }`}
              />
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>To</label>
              <input
                type="date"
                value={globalRemediationTo}
                onChange={(e) => setGlobalRemediationTo(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                }`}
              />
            </div>
            <div className="md:col-span-1">
              <label className={`block text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Search</label>
              <input
                value={globalRemediationSearch}
                onChange={(e) => setGlobalRemediationSearch(e.target.value)}
                placeholder="Learner, course, reason"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                }`}
              />
            </div>
          </div>
          <div className={`overflow-hidden rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full text-sm">
              <thead className={isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-600'}>
                <tr>
                  <th className="text-left px-4 py-2">Learner</th>
                  <th className="text-left px-4 py-2">Course</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {remediationAssignments
                  .filter((assignment) => {
                    if (globalRemediationStatus !== 'all' && assignment.status !== globalRemediationStatus) return false;
                    const createdAt = assignment.createdAt || 0;
                    if (globalRemediationFrom) {
                      const fromTime = new Date(globalRemediationFrom).getTime();
                      if (createdAt < fromTime) return false;
                    }
                    if (globalRemediationTo) {
                      const toTime = new Date(globalRemediationTo).getTime() + 24 * 60 * 60 * 1000 - 1;
                      if (createdAt > toTime) return false;
                    }
                    if (!globalRemediationSearch.trim()) return true;
                    const member = members.find((m) => m.id === assignment.userId);
                    const course = courses.find((c) => c.id === assignment.courseId);
                    const haystack = `${member?.name || ''} ${member?.email || ''} ${course?.title || ''} ${assignment.reason || ''}`.toLowerCase();
                    return haystack.includes(globalRemediationSearch.toLowerCase());
                  })
                  .slice(0, 10)
                  .map((assignment) => {
                    const member = members.find((m) => m.id === assignment.userId);
                    const course = courses.find((c) => c.id === assignment.courseId);
                    return (
                      <tr key={assignment.id} className={isDarkMode ? 'border-t border-gray-800' : 'border-t border-gray-200'}>
                        <td className="px-4 py-2">
                          {member ? (
                            <button
                              onClick={() => handleViewDetails(member)}
                              className="text-indigo-500 hover:underline"
                            >
                              {member.name}
                            </button>
                          ) : (
                            <span>{assignment.userId}</span>
                          )}
                        </td>
                        <td className="px-4 py-2">{course?.title || assignment.courseId}</td>
                        <td className="px-4 py-2">{assignment.status}</td>
                        <td className="px-4 py-2">{assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : '-'}</td>
                      </tr>
                    );
                  })}
                {remediationAssignments.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`px-4 py-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      No remediation assignments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search learners..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'at_risk' | 'completed')}
              className={`px-3 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-indigo-500`}
            >
              <option value="all">All Learners</option>
              <option value="active">Active</option>
              <option value="at_risk">At Risk</option>
              <option value="completed">All Complete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Learner List */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No learners found</p>
            <p className="text-sm">Add learners to your organization to track their progress</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMembers.map((member) => {
              const stats = learnerStats.get(member.id);
              return (
                <LearnerCard
                  key={member.id}
                  member={member}
                  stats={stats}
                  isDarkMode={isDarkMode}
                  onViewDetails={() => handleViewDetails(member)}
                />
              );
            })}
          </div>
        )}
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
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, isDarkMode, highlight }) => (
  <div className={`p-4 rounded-xl border ${
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
    <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-orange-600' : ''}`}>{value}</p>
  </div>
);

// Learner Card Component
interface LearnerCardProps {
  member: OrgMember;
  stats?: {
    totalEnrollments: number;
    completed: number;
    inProgress: number;
    overdue: number;
    avgProgress: number;
    avgScore: number;
    totalTime: number;
  };
  isDarkMode: boolean;
  onViewDetails: () => void;
}

const LearnerCard: React.FC<LearnerCardProps> = ({
  member,
  stats,
  isDarkMode,
  onViewDetails
}) => {
  const hasOverdue = stats && stats.overdue > 0;

  return (
    <div
      onClick={onViewDetails}
      className={`p-4 rounded-xl border cursor-pointer transition-shadow hover:shadow-lg ${
        hasOverdue
          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10'
          : isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium ${
          hasOverdue ? 'bg-orange-500' : 'bg-indigo-600'
        }`}>
          {member.name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{member.name}</h3>
            {hasOverdue && (
              <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            )}
          </div>
          <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {member.email}
          </p>
        </div>

        {/* Stats */}
        {stats && stats.totalEnrollments > 0 ? (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Progress</p>
              <p className="text-lg font-bold">{stats.avgProgress}%</p>
            </div>
            <div className="text-center">
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Completed</p>
              <p className="text-lg font-bold text-green-500">{stats.completed}/{stats.totalEnrollments}</p>
            </div>
            {stats.overdue > 0 && (
              <div className="text-center">
                <p className={`text-xs text-orange-500`}>Overdue</p>
                <p className="text-lg font-bold text-orange-500">{stats.overdue}</p>
              </div>
            )}
            <div className="text-center">
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Time</p>
              <p className={`text-lg font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {stats.totalTime}m
              </p>
            </div>
          </div>
        ) : (
          <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            No enrollments
          </span>
        )}

        <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
      </div>
    </div>
  );
};

// Learner Detail View
interface LearnerDetailProps {
  member: OrgMember;
  enrollments: Enrollment[];
  courses: Course[];
  stats?: {
    totalEnrollments: number;
    completed: number;
    inProgress: number;
    overdue: number;
    avgProgress: number;
    avgScore: number;
    totalTime: number;
  };
  competencyStats?: {
    avgScore: number;
    total: number;
  };
  remediationStats?: {
    assigned: number;
    total: number;
  };
  competencyBadges: Array<{
    id: string;
    courseId: string;
    moduleId: string;
    title: string;
    issuedAt: number;
  }>;
  remediations: RemediationAssignment[];
  remediationDraft: {
    selectedEnrollmentId: string;
    reason: string;
  };
  remediationMessage: string | null;
  remediationStatusFilter: 'all' | 'assigned' | 'completed' | 'dismissed';
  remediationSearch: string;
  remediationFrom: string;
  remediationTo: string;
  onRemediationFilterChange: (
    status: 'all' | 'assigned' | 'completed' | 'dismissed',
    search: string,
    from: string,
    to: string
  ) => void;
  onRemediationDraftChange: (draft: { selectedEnrollmentId: string; reason: string }) => void;
  onCreateRemediation: (payload: {
    enrollmentId: string;
    courseId: string;
    moduleId?: string;
    lessonId?: string;
    reason?: string;
    scheduleAt?: number;
  }) => Promise<void>;
  onUpdateRemediation: (assignmentId: string, updates: Partial<RemediationAssignment>) => Promise<void>;
  isDarkMode: boolean;
  onBack: () => void;
}

const LearnerDetail: React.FC<LearnerDetailProps> = ({
  member,
  enrollments,
  courses,
  stats,
  competencyStats,
  remediationStats,
  remediations,
  competencyBadges,
  remediationDraft,
  remediationMessage,
  remediationStatusFilter,
  remediationSearch,
  remediationFrom,
  remediationTo,
  onRemediationFilterChange,
  onRemediationDraftChange,
  onCreateRemediation,
  onUpdateRemediation,
  isDarkMode,
  onBack
}) => {
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach(c => map.set(c.id, c));
    return map;
  }, [courses]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const enrollmentOptions = enrollments.map((enrollment) => ({
    id: enrollment.id,
    courseId: enrollment.courseId,
    title: courseMap.get(enrollment.courseId)?.title || enrollment.courseId
  }));

  const _activeRemediations = remediations.filter((assignment) => assignment.status === 'assigned');

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-medium bg-indigo-600`}>
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{member.name}</h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {member.email}
              </p>
            </div>
          </div>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              isDarkMode ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Mail className="w-5 h-5" />
            Send Reminder
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enrollments</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalEnrollments || 0}</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{stats?.completed || 0}</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>In Progress</span>
              </div>
              <p className="text-2xl font-bold text-blue-500">{stats?.inProgress || 0}</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <BarChart2 className="w-5 h-5 text-indigo-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Score</span>
              </div>
              <p className="text-2xl font-bold">{stats?.avgScore || 0}%</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Time Spent</span>
              </div>
              <p className="text-2xl font-bold">{stats?.totalTime || 0}m</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-emerald-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Competency</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">{competencyStats?.avgScore || 0}%</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{competencyStats?.total || 0} scores</p>
            </div>
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Remediation</span>
              </div>
              <p className="text-2xl font-bold text-amber-500">{remediationStats?.assigned || 0}</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{remediationStats?.total || 0} total</p>
            </div>
          </div>

          {/* Competency Badges */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Competency Badges</h2>
            {competencyBadges.length === 0 && (
              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No competency badges yet.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {competencyBadges.map((badge) => {
                const courseTitle = courseMap.get(badge.courseId)?.title || badge.courseId;
                return (
                  <div key={badge.id} className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className="font-medium">{badge.title}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {courseTitle} • {badge.moduleId}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Issued {badge.issuedAt ? new Date(badge.issuedAt).toLocaleDateString() : '-'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Remediation Workflow */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Remediation Workflow</h2>
            {remediationMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
              }`}>
                {remediationMessage}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status filter</label>
                <select
                  value={remediationStatusFilter}
                  onChange={(e) => onRemediationFilterChange(
                    e.target.value as typeof remediationStatusFilter,
                    remediationSearch,
                    remediationFrom,
                    remediationTo
                  )}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <option value="all">All</option>
                  <option value="assigned">Assigned</option>
                  <option value="completed">Completed</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>From</label>
                <input
                  type="date"
                  value={remediationFrom}
                  onChange={(e) => onRemediationFilterChange(remediationStatusFilter, remediationSearch, e.target.value, remediationTo)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>To</label>
                <input
                  type="date"
                  value={remediationTo}
                  onChange={(e) => onRemediationFilterChange(remediationStatusFilter, remediationSearch, remediationFrom, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                />
              </div>
              <div className="md:col-span-1">
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Search</label>
                <input
                  value={remediationSearch}
                  onChange={(e) => onRemediationFilterChange(remediationStatusFilter, e.target.value, remediationFrom, remediationTo)}
                  placeholder="Search course or reason..."
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Enrollment</label>
                <select
                  value={remediationDraft.selectedEnrollmentId}
                  onChange={(e) => onRemediationDraftChange({ ...remediationDraft, selectedEnrollmentId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  <option value="">Select enrollment</option>
                  {enrollmentOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.title}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Reason</label>
                <input
                  value={remediationDraft.reason}
                  onChange={(e) => onRemediationDraftChange({ ...remediationDraft, reason: e.target.value })}
                  placeholder="e.g. Low assessment score"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  const enrollmentId = remediationDraft.selectedEnrollmentId || enrollmentOptions[0]?.id;
                  if (!enrollmentId) return;
                  const enrollment = enrollments.find((item) => item.id === enrollmentId);
                  if (!enrollment) return;
                  await onCreateRemediation({
                    enrollmentId,
                    courseId: enrollment.courseId,
                    reason: remediationDraft.reason,
                    scheduleAt: Date.now() + 7 * 24 * 60 * 60 * 1000
                  });
                }}
                className="px-4 py-2 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-700"
              >
                Assign remediation + schedule re‑assessment
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {remediations.length === 0 && (
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  No remediation assignments yet.
                </p>
              )}
              {remediations.map((assignment) => {
                const courseTitle = courseMap.get(assignment.courseId)?.title || assignment.courseId;
                return (
                  <div key={assignment.id} className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{courseTitle}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Status: {assignment.status} • {assignment.reason || 'No reason provided'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateRemediation(assignment.id, {
                            status: 'completed',
                            updatedAt: Date.now()
                          })}
                          className={`px-3 py-1.5 rounded-lg text-xs ${
                            assignment.status === 'completed'
                              ? 'bg-green-600 text-white'
                              : isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-600' : 'bg-white border border-gray-200 hover:bg-gray-100'
                          }`}
                          disabled={assignment.status === 'completed'}
                        >
                          Mark completed
                        </button>
                        <button
                          onClick={() => onUpdateRemediation(assignment.id, {
                            scheduledReassessmentAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
                            updatedAt: Date.now()
                          })}
                          className={`px-3 py-1.5 rounded-lg text-xs ${
                            isDarkMode ? 'bg-gray-800 text-gray-200 hover:bg-gray-600' : 'bg-white border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          Re‑schedule
                        </button>
                      </div>
                    </div>
                    {assignment.scheduledReassessmentAt && (
                      <p className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Re‑assessment: {formatDate(assignment.scheduledReassessmentAt)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enrollments */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Training Enrollments</h2>

            {enrollments.length === 0 ? (
              <p className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No training assigned yet
              </p>
            ) : (
              <div className="space-y-3">
                {enrollments.map((enrollment) => {
                  const course = courseMap.get(enrollment.courseId);
                  const statusConfig = STATUS_CONFIG[enrollment.status];
                  const isOverdue = enrollment.dueDate && enrollment.dueDate < Date.now() && enrollment.status !== 'completed';

                  return (
                    <div
                      key={enrollment.id}
                      className={`p-4 rounded-lg ${
                        isOverdue
                          ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-500'
                          : isDarkMode
                            ? 'bg-gray-700'
                            : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                          }`}>
                            <BookOpen className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          </div>
                          <div>
                            <h4 className="font-medium">{course?.title || 'Unknown Course'}</h4>
                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {course?.estimatedDuration || 0} min • {course?.modules.length || 0} modules
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          {enrollment.score !== undefined && (
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Score: {enrollment.score}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{enrollment.progress}% complete</span>
                          {enrollment.dueDate && (
                            <span className={isOverdue ? 'text-orange-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                              Due: {formatDate(enrollment.dueDate)}
                            </span>
                          )}
                        </div>
                        <div className={`h-2 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                          <div
                            className={`h-full rounded-full transition-all ${
                              enrollment.status === 'completed' ? 'bg-green-500' :
                              isOverdue ? 'bg-orange-500' :
                              'bg-indigo-500'
                            }`}
                            style={{ width: `${Math.min(enrollment.progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className={`flex items-center gap-6 mt-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span>Assigned: {formatDate(enrollment.assignedAt)}</span>
                        {enrollment.startedAt && <span>Started: {formatDate(enrollment.startedAt)}</span>}
                        {enrollment.completedAt && <span>Completed: {formatDate(enrollment.completedAt)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Achievements & Certificates</h2>

            {stats && stats.completed > 0 ? (
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-lg flex items-center gap-3 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  <div>
                    <p className="font-medium">{stats.completed} Courses Completed</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Keep up the great work!
                    </p>
                  </div>
                </div>
                {stats.avgScore >= 80 && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <Star className="w-8 h-8 text-indigo-500" />
                    <div>
                      <p className="font-medium">High Performer</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Average score above 80%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Complete training to earn achievements
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearnerProgress;
