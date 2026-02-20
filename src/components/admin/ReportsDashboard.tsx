import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { Enrollment, Course, OrgMember } from '../../types/lms';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import {
  BarChart2,
  Download,
  FileText,
  Users,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Target,
  Building,
  Award,
  ArrowUp,
  ArrowDown,
  Calendar
} from 'lucide-react';

type ReportType = 'overview' | 'completion' | 'compliance' | 'learner' | 'course';
type DateRange = '7d' | '30d' | '90d' | '12m' | 'all';

interface ReportsDashboardProps {
  isDarkMode?: boolean;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = () => {
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
    departments,
    reportSchedules,
    reportRuns,
    loadEnrollments,
    loadCourses,
    loadMembers,
    loadDepartments,
    loadReportSchedules,
    loadReportRuns,
    runReportNow,
    isLoading
  } = useLMSStore();

  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedDepartment, _setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    if (currentOrg?.id) {
      loadEnrollments();
      loadCourses();
      loadMembers();
      loadDepartments();
      loadReportSchedules();
      loadReportRuns();
    }
  }, [currentOrg?.id, loadEnrollments, loadCourses, loadMembers, loadDepartments, loadReportSchedules, loadReportRuns]);

  // Filter data by date range
  const filteredEnrollments = useMemo(() => {
    const now = Date.now();
    const ranges: Record<DateRange, number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
      '12m': 365 * 24 * 60 * 60 * 1000,
      'all': Infinity
    };

    return enrollments.filter(e => {
      const withinRange = dateRange === 'all' || (now - e.assignedAt) <= ranges[dateRange];
      const matchesDept = selectedDepartment === 'all' ||
        members.find(m => m.id === e.userId)?.departmentId === selectedDepartment;
      return withinRange && matchesDept;
    });
  }, [enrollments, dateRange, selectedDepartment, members]);

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    const total = filteredEnrollments.length;
    const completed = filteredEnrollments.filter(e => e.status === 'completed').length;
    const inProgress = filteredEnrollments.filter(e => e.status === 'in_progress').length;
    const notStarted = filteredEnrollments.filter(e => e.status === 'not_started').length;
    const overdue = filteredEnrollments.filter(e =>
      e.status === 'overdue' || (e.dueDate && e.dueDate < Date.now() && e.status !== 'completed')
    ).length;

    const avgProgress = total > 0
      ? Math.round(filteredEnrollments.reduce((sum, e) => sum + e.progress, 0) / total)
      : 0;

    const scoresWithValue = filteredEnrollments.filter(e => e.score !== undefined);
    const avgScore = scoresWithValue.length > 0
      ? Math.round(scoresWithValue.reduce((sum, e) => sum + (e.score || 0), 0) / scoresWithValue.length)
      : 0;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate trend (compare with previous period)
    const trendUp = completionRate >= 50; // Simplified trend

    return {
      total,
      completed,
      inProgress,
      notStarted,
      overdue,
      avgProgress,
      avgScore,
      completionRate,
      trendUp,
      activeLearners: new Set(filteredEnrollments.filter(e => e.status === 'in_progress').map(e => e.userId)).size
    };
  }, [filteredEnrollments]);

  // Course completion stats
  const courseStats = useMemo(() => {
    const stats = new Map<string, {
      courseId: string;
      title: string;
      enrollments: number;
      completed: number;
      avgProgress: number;
      avgScore: number;
    }>();

    courses.forEach(course => {
      const courseEnrollments = filteredEnrollments.filter(e => e.courseId === course.id);
      const completed = courseEnrollments.filter(e => e.status === 'completed').length;
      const scores = courseEnrollments.filter(e => e.score !== undefined);

      stats.set(course.id, {
        courseId: course.id,
        title: course.title,
        enrollments: courseEnrollments.length,
        completed,
        avgProgress: courseEnrollments.length > 0
          ? Math.round(courseEnrollments.reduce((sum, e) => sum + e.progress, 0) / courseEnrollments.length)
          : 0,
        avgScore: scores.length > 0
          ? Math.round(scores.reduce((sum, e) => sum + (e.score || 0), 0) / scores.length)
          : 0
      });
    });

    return Array.from(stats.values()).sort((a, b) => b.enrollments - a.enrollments);
  }, [courses, filteredEnrollments]);

  // Department stats
  const departmentStats = useMemo(() => {
    const stats = new Map<string, {
      departmentId: string;
      name: string;
      learners: number;
      enrollments: number;
      completed: number;
      overdue: number;
      completionRate: number;
    }>();

    departments.forEach(dept => {
      const deptMembers = members.filter(m => m.departmentId === dept.id);
      const deptMemberIds = new Set(deptMembers.map(m => m.id));
      const deptEnrollments = filteredEnrollments.filter(e => deptMemberIds.has(e.userId));
      const completed = deptEnrollments.filter(e => e.status === 'completed').length;
      const overdue = deptEnrollments.filter(e =>
        e.status === 'overdue' || (e.dueDate && e.dueDate < Date.now() && e.status !== 'completed')
      ).length;

      stats.set(dept.id, {
        departmentId: dept.id,
        name: dept.name,
        learners: deptMembers.length,
        enrollments: deptEnrollments.length,
        completed,
        overdue,
        completionRate: deptEnrollments.length > 0
          ? Math.round((completed / deptEnrollments.length) * 100)
          : 0
      });
    });

    return Array.from(stats.values()).sort((a, b) => b.enrollments - a.enrollments);
  }, [departments, members, filteredEnrollments]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    return [
      { status: 'Completed', count: overviewStats.completed, color: '#22c55e' },
      { status: 'In Progress', count: overviewStats.inProgress, color: '#3b82f6' },
      { status: 'Not Started', count: overviewStats.notStarted, color: '#9ca3af' },
      { status: 'Overdue', count: overviewStats.overdue, color: '#f97316' }
    ].filter(s => s.count > 0);
  }, [overviewStats]);

  const scheduleSummary = useMemo(() => {
    return reportSchedules.map(schedule => {
      const latestRun = reportRuns.find(run => run.scheduleId === schedule.id);
      return {
        ...schedule,
        latestStatus: latestRun?.status || 'queued',
        latestAt: latestRun?.createdAt ? new Date(latestRun.createdAt).toLocaleDateString() : '-'
      };
    });
  }, [reportSchedules, reportRuns]);

  const handleExport = (format: 'csv' | 'pdf') => {
    // Generate export based on active report
    const reportData = generateReportData();
    if (format === 'csv') {
      downloadCSV(reportData, `${activeReport}-report`);
    } else {
      // PDF export would require a library like jsPDF
      alert('PDF export coming soon!');
    }
  };

  const generateReportData = () => {
    switch (activeReport) {
      case 'completion':
        return courseStats.map(c => ({
          Course: c.title,
          Enrollments: c.enrollments,
          Completed: c.completed,
          'Completion Rate': `${c.enrollments > 0 ? Math.round((c.completed / c.enrollments) * 100) : 0}%`,
          'Avg Progress': `${c.avgProgress}%`,
          'Avg Score': `${c.avgScore}%`
        }));
      case 'compliance':
        return departmentStats.map(d => ({
          Department: d.name,
          Learners: d.learners,
          Enrollments: d.enrollments,
          Completed: d.completed,
          Overdue: d.overdue,
          'Completion Rate': `${d.completionRate}%`
        }));
      default:
        return [overviewStats];
    }
  };

  const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reportTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'completion', label: 'Completion', icon: CheckCircle },
    { id: 'compliance', label: 'Compliance', icon: Target },
    { id: 'learner', label: 'Learner', icon: Users },
    { id: 'course', label: 'Course', icon: BookOpen }
  ] as const;

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      <AdminPageHeader
        title="Reports & Analytics"
        subtitle="Comprehensive training analytics and insights"
        isDarkMode={isDarkMode}
        badge="Analytics"
        actions={(
          <>
            <button
              onClick={() => handleExport('csv')}
              className="btn-secondary-min flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="btn-secondary-min flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          </>
        )}
      />

      <div className="p-6 border-b border-app-border">
        <AdminSection title="Filters" isDarkMode={isDarkMode} minHeight="88px">
          <AdminToolbar
            isDarkMode={isDarkMode}
            showSearch={false}
            leftContent={(
              <div className="flex rounded-lg p-1 bg-app-surface2">
                {reportTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveReport(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeReport === tab.id
                        ? 'bg-app-accent text-app-bg'
                        : 'text-app-muted hover:text-app-text'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            rightContent={(
              <>
                <Calendar className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="input-min"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="12m">Last 12 months</option>
                  <option value="all">All time</option>
                </select>
              </>
            )}
          />
        </AdminSection>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <AdminSection title="Scheduled Reports" subtitle="Automated report cadence." isDarkMode={isDarkMode} minHeight="140px">
              {scheduleSummary.length === 0 ? (
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No report schedules configured yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {scheduleSummary.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`rounded-lg border p-3 flex items-center justify-between ${
                        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{schedule.frequency} schedule</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Recipients: {schedule.recipients}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <p className="font-semibold">{schedule.latestStatus}</p>
                          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Last run: {schedule.latestAt}
                          </p>
                        </div>
                        <button
                          onClick={() => runReportNow(schedule.id)}
                          className="px-3 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Run now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminSection>

            {/* Overview Report */}
            {activeReport === 'overview' && (
              <OverviewReport
                stats={overviewStats}
                statusDistribution={statusDistribution}
                courseStats={courseStats.slice(0, 5)}
                departmentStats={departmentStats.slice(0, 5)}
                isDarkMode={isDarkMode}
              />
            )}

            {/* Completion Report */}
            {activeReport === 'completion' && (
              <CompletionReport
                courseStats={courseStats}
                isDarkMode={isDarkMode}
              />
            )}

            {/* Compliance Report */}
            {activeReport === 'compliance' && (
              <ComplianceReport
                departmentStats={departmentStats}
                overallStats={overviewStats}
                isDarkMode={isDarkMode}
              />
            )}

            {/* Learner Report */}
            {activeReport === 'learner' && (
              <LearnerReport
                enrollments={filteredEnrollments}
                members={members}
                courses={courses}
                isDarkMode={isDarkMode}
              />
            )}

            {/* Course Report */}
            {activeReport === 'course' && (
              <CourseReport
                courseStats={courseStats}
                courses={courses}
                isDarkMode={isDarkMode}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Overview Report Component
interface OverviewReportProps {
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    overdue: number;
    avgProgress: number;
    avgScore: number;
    completionRate: number;
    trendUp: boolean;
    activeLearners: number;
  };
  statusDistribution: { status: string; count: number; color: string }[];
  courseStats: { courseId: string; title: string; enrollments: number; completed: number; avgProgress: number }[];
  departmentStats: { departmentId: string; name: string; completionRate: number; overdue: number }[];
  isDarkMode: boolean;
}

const OverviewReport: React.FC<OverviewReportProps> = ({
  stats,
  statusDistribution,
  courseStats,
  departmentStats,
  isDarkMode
}) => {
  const total = statusDistribution.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          label="Total Enrollments"
          value={stats.total}
          icon={<BookOpen className="w-6 h-6 text-indigo-500" />}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={<Target className="w-6 h-6 text-green-500" />}
          trend={stats.trendUp ? 'up' : 'down'}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label="Active Learners"
          value={stats.activeLearners}
          icon={<Users className="w-6 h-6 text-blue-500" />}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label="Avg Score"
          value={`${stats.avgScore}%`}
          icon={<Award className="w-6 h-6 text-yellow-500" />}
          isDarkMode={isDarkMode}
        />
        <MetricCard
          label="Overdue"
          value={stats.overdue}
          icon={<AlertTriangle className="w-6 h-6 text-orange-500" />}
          highlight={stats.overdue > 0}
          isDarkMode={isDarkMode}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4">Enrollment Status</h3>
          <div className="flex items-center gap-8">
            {/* Simple Pie Chart Visualization */}
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {statusDistribution.reduce((acc, item, _index) => {
                  const percentage = total > 0 ? (item.count / total) * 100 : 0;
                  const previousTotal = acc.offset;
                  acc.offset += percentage;
                  acc.elements.push(
                    <circle
                      key={item.status}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={item.color}
                      strokeWidth="20"
                      strokeDasharray={`${percentage * 2.51} 251`}
                      strokeDashoffset={`${-previousTotal * 2.51}`}
                    />
                  );
                  return acc;
                }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold">{stats.completionRate}%</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Complete</p>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              {statusDistribution.map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {item.status}
                  </span>
                  <span className="font-medium">{item.count}</span>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    ({total > 0 ? Math.round((item.count / total) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Courses */}
        <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4">Top Courses by Enrollment</h3>
          <div className="space-y-3">
            {courseStats.map((course, index) => (
              <div key={course.courseId} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm">{course.title}</p>
                  <div className={`h-2 rounded-full mt-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${course.avgProgress}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{course.enrollments}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {course.completed} done
                  </p>
                </div>
              </div>
            ))}
            {courseStats.length === 0 && (
              <p className={`text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No course data available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Department Overview */}
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className="text-lg font-semibold mb-4">Department Performance</h3>
        <div className="grid grid-cols-5 gap-4">
          {departmentStats.map((dept) => (
            <div
              key={dept.departmentId}
              className={`p-4 rounded-lg ${
                dept.overdue > 0
                  ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-500'
                  : isDarkMode
                    ? 'bg-gray-700'
                    : 'bg-gray-50'
              }`}
            >
              <p className="font-medium truncate">{dept.name}</p>
              <p className="text-2xl font-bold mt-1">{dept.completionRate}%</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Completion Rate
              </p>
              {dept.overdue > 0 && (
                <p className="text-xs text-orange-500 mt-1">
                  {dept.overdue} overdue
                </p>
              )}
            </div>
          ))}
          {departmentStats.length === 0 && (
            <p className={`col-span-5 text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              No department data available
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  highlight?: boolean;
  isDarkMode: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, trend, highlight, isDarkMode }) => (
  <div className={`p-5 rounded-xl border ${
    highlight
      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
      : isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
  }`}>
    <div className="flex items-center justify-between mb-2">
      {icon}
      {trend && (
        <span className={`flex items-center gap-1 text-sm ${
          trend === 'up' ? 'text-green-500' : 'text-red-500'
        }`}>
          {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
        </span>
      )}
    </div>
    <p className={`text-3xl font-bold ${highlight ? 'text-orange-600' : ''}`}>{value}</p>
    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
  </div>
);

// Completion Report Component
interface CompletionReportProps {
  courseStats: {
    courseId: string;
    title: string;
    enrollments: number;
    completed: number;
    avgProgress: number;
    avgScore: number;
  }[];
  isDarkMode: boolean;
}

const CompletionReport: React.FC<CompletionReportProps> = ({ courseStats, isDarkMode }) => (
  <div className="card-min overflow-hidden">
    <table className="w-full">
      <thead className="bg-app-surface2">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
            Course
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
            Enrollments
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
            Completed
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
            Completion Rate
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
            Avg Progress
          </th>
          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
            Avg Score
          </th>
        </tr>
      </thead>
      <tbody className="bg-app-surface">
        {courseStats.map((course) => {
          const completionRate = course.enrollments > 0
            ? Math.round((course.completed / course.enrollments) * 100)
            : 0;

          return (
            <tr key={course.courseId} className="border-t border-app-border">
              <td className="px-4 py-3">
                <p className="font-medium">{course.title}</p>
              </td>
              <td className="px-4 py-3 text-center">{course.enrollments}</td>
              <td className="px-4 py-3 text-center text-green-500">{course.completed}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-24 h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full ${completionRate >= 80 ? 'bg-green-500' : completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <span className="text-sm">{completionRate}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">{course.avgProgress}%</td>
              <td className="px-4 py-3 text-center">{course.avgScore}%</td>
            </tr>
          );
        })}
        {courseStats.length === 0 && (
          <tr>
            <td colSpan={6} className={`px-4 py-8 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              No course data available
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

// Compliance Report Component
interface ComplianceReportProps {
  departmentStats: {
    departmentId: string;
    name: string;
    learners: number;
    enrollments: number;
    completed: number;
    overdue: number;
    completionRate: number;
  }[];
  overallStats: { completionRate: number; overdue: number };
  isDarkMode: boolean;
}

const ComplianceReport: React.FC<ComplianceReportProps> = ({ departmentStats, overallStats, isDarkMode }) => (
  <div className="space-y-6">
    {/* Compliance Summary */}
    <div className="grid grid-cols-3 gap-4">
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-6 h-6 text-green-500" />
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Overall Compliance</span>
        </div>
        <p className={`text-4xl font-bold ${
          overallStats.completionRate >= 80 ? 'text-green-500' :
          overallStats.completionRate >= 50 ? 'text-yellow-500' : 'text-red-500'
        }`}>
          {overallStats.completionRate}%
        </p>
      </div>
      <div className={`p-6 rounded-xl border ${
        overallStats.overdue > 0
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
          : isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Overdue Trainings</span>
        </div>
        <p className="text-4xl font-bold text-orange-500">{overallStats.overdue}</p>
      </div>
      <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-2">
          <Building className="w-6 h-6 text-indigo-500" />
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Departments Tracked</span>
        </div>
        <p className="text-4xl font-bold">{departmentStats.length}</p>
      </div>
    </div>

    {/* Department Breakdown */}
    <div className="card-min overflow-hidden">
      <table className="w-full">
        <thead className="bg-app-surface2">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
              Department
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Learners
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Enrollments
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Completed
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Overdue
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Compliance Rate
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-app-surface">
          {departmentStats.map((dept) => (
            <tr
              key={dept.departmentId}
              className={`border-t border-app-border ${
                dept.overdue > 0 ? 'bg-orange-50/60 dark:bg-orange-900/10' : ''
              }`}
            >
              <td className="px-4 py-3">
                <p className="font-medium">{dept.name}</p>
              </td>
              <td className="px-4 py-3 text-center">{dept.learners}</td>
              <td className="px-4 py-3 text-center">{dept.enrollments}</td>
              <td className="px-4 py-3 text-center text-green-500">{dept.completed}</td>
              <td className={`px-4 py-3 text-center ${dept.overdue > 0 ? 'text-orange-500 font-medium' : ''}`}>
                {dept.overdue}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-center gap-2">
                  <div className={`w-24 h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full ${
                        dept.completionRate >= 80 ? 'bg-green-500' :
                        dept.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dept.completionRate}%` }}
                    />
                  </div>
                  <span className="text-sm">{dept.completionRate}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  dept.completionRate >= 80
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : dept.completionRate >= 50
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {dept.completionRate >= 80 ? 'Compliant' : dept.completionRate >= 50 ? 'At Risk' : 'Non-Compliant'}
                </span>
              </td>
            </tr>
          ))}
          {departmentStats.length === 0 && (
            <tr>
              <td colSpan={7} className={`px-4 py-8 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No department data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// Learner Report Component
interface LearnerReportProps {
  enrollments: Enrollment[];
  members: OrgMember[];
  courses: Course[];
  isDarkMode: boolean;
}

const LearnerReport: React.FC<LearnerReportProps> = ({ enrollments, members, courses, isDarkMode }) => {
  const learnerData = useMemo(() => {
    const data = new Map<string, {
      member: OrgMember;
      enrollments: number;
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
      const overdue = memberEnrollments.filter(e =>
        e.status === 'overdue' || (e.dueDate && e.dueDate < Date.now() && e.status !== 'completed')
      ).length;

      const progressSum = memberEnrollments.reduce((sum, e) => sum + e.progress, 0);
      const scoresWithValue = memberEnrollments.filter(e => e.score !== undefined);
      const scoreSum = scoresWithValue.reduce((sum, e) => sum + (e.score || 0), 0);

      const totalTime = memberEnrollments.reduce((sum, e) => {
        const course = courses.find(c => c.id === e.courseId);
        return sum + ((course?.estimatedDuration || 0) * (e.progress / 100));
      }, 0);

      if (memberEnrollments.length > 0) {
        data.set(member.id, {
          member,
          enrollments: memberEnrollments.length,
          completed,
          inProgress,
          overdue,
          avgProgress: Math.round(progressSum / memberEnrollments.length),
          avgScore: scoresWithValue.length > 0 ? Math.round(scoreSum / scoresWithValue.length) : 0,
          totalTime: Math.round(totalTime)
        });
      }
    });

    return Array.from(data.values()).sort((a, b) => b.enrollments - a.enrollments);
  }, [members, enrollments, courses]);

  return (
    <div className="card-min overflow-hidden">
      <table className="w-full">
        <thead className="bg-app-surface2">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
              Learner
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Enrollments
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Completed
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              In Progress
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Overdue
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Avg Progress
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Avg Score
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-app-muted">
              Time Spent
            </th>
          </tr>
        </thead>
        <tbody className="bg-app-surface">
          {learnerData.map((data) => (
            <tr
              key={data.member.id}
              className={`border-t border-app-border ${
                data.overdue > 0 ? 'bg-orange-50/60 dark:bg-orange-900/10' : ''
              }`}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                    data.overdue > 0 ? 'bg-orange-500' : 'bg-indigo-600'
                  }`}>
                    {data.member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{data.member.name}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {data.member.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">{data.enrollments}</td>
              <td className="px-4 py-3 text-center text-green-500">{data.completed}</td>
              <td className="px-4 py-3 text-center text-blue-500">{data.inProgress}</td>
              <td className={`px-4 py-3 text-center ${data.overdue > 0 ? 'text-orange-500 font-medium' : ''}`}>
                {data.overdue}
              </td>
              <td className="px-4 py-3 text-center">{data.avgProgress}%</td>
              <td className="px-4 py-3 text-center">{data.avgScore}%</td>
              <td className="px-4 py-3 text-center">{data.totalTime}m</td>
            </tr>
          ))}
          {learnerData.length === 0 && (
            <tr>
              <td colSpan={8} className={`px-4 py-8 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                No learner data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// Course Report Component
interface CourseReportProps {
  courseStats: {
    courseId: string;
    title: string;
    enrollments: number;
    completed: number;
    avgProgress: number;
    avgScore: number;
  }[];
  courses: Course[];
  isDarkMode: boolean;
}

const CourseReport: React.FC<CourseReportProps> = ({ courseStats, courses, isDarkMode }) => {
  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach(c => map.set(c.id, c));
    return map;
  }, [courses]);

  return (
    <div className="grid gap-4">
      {courseStats.map((stat) => {
        const course = courseMap.get(stat.courseId);
        if (!course) return null;

        const completionRate = stat.enrollments > 0
          ? Math.round((stat.completed / stat.enrollments) * 100)
          : 0;

        return (
          <div
            key={stat.courseId}
            className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">{course.title}</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {course.modules.length} modules • {course.estimatedDuration} min
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                course.status === 'published'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : course.status === 'draft'
                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
              }`}>
                {course.status}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enrollments</p>
                <p className="text-2xl font-bold">{stat.enrollments}</p>
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed</p>
                <p className="text-2xl font-bold text-green-500">{stat.completed}</p>
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completion Rate</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`flex-1 h-3 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full ${
                        completionRate >= 80 ? 'bg-green-500' :
                        completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <span className="font-bold">{completionRate}%</span>
                </div>
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Progress</p>
                <p className="text-2xl font-bold">{stat.avgProgress}%</p>
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Score</p>
                <p className="text-2xl font-bold">{stat.avgScore}%</p>
              </div>
            </div>
          </div>
        );
      })}
      {courseStats.length === 0 && (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No course data available</p>
        </div>
      )}
    </div>
  );
};

export default ReportsDashboard;
