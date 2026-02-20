import React, { useEffect, useMemo, useState } from 'react';
import { Users, BarChart2, ClipboardList, FileText, Download, Sparkles, X } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { exportToCSV, exportToExcel, exportToPDF } from '../../lib/reportExport';
import type { EnrollmentStatus } from '../../types/lms';
import ChatInterface from '../ChatInterface';

type CourseHomeTab = 'overview' | 'participants' | 'grades' | 'reports';

interface CourseHomeProps {
  courseId: string;
  isDarkMode?: boolean;
}

const TABS: { id: CourseHomeTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <FileText className="w-4 h-4" /> },
  { id: 'participants', label: 'Participants', icon: <Users className="w-4 h-4" /> },
  { id: 'grades', label: 'Grades', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'reports', label: 'Reports', icon: <BarChart2 className="w-4 h-4" /> }
];

const formatDate = (timestamp?: number) => {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const CourseHome: React.FC<CourseHomeProps> = ({ courseId, isDarkMode = false }) => {
  const [activeTab, setActiveTab] = useState<CourseHomeTab>('overview');
  const [statusFilter, setStatusFilter] = useState<'all' | EnrollmentStatus>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showTutorPanel, setShowTutorPanel] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(`tuutta_genie_tutor_${courseId}`) === 'open';
    } catch {
      return false;
    }
  });
  const { createNewChat, addMessage } = useStore(state => ({
    createNewChat: state.createNewChat,
    addMessage: state.addMessage
  }));
  const { currentOrg, currentMember, isAdmin, courses, enrollments, members, loadCourses, loadMembers, loadEnrollments } = useLMSStore();

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadCourses();
    loadMembers();
    loadEnrollments();
  }, [currentOrg?.id, loadCourses, loadMembers, loadEnrollments]);

  useEffect(() => {
    try {
      window.localStorage.setItem(`tuutta_genie_tutor_${courseId}`, showTutorPanel ? 'open' : 'closed');
    } catch {
      // ignore localStorage errors
    }
  }, [courseId, showTutorPanel]);

  const course = useMemo(() => courses.find(c => c.id === courseId), [courses, courseId]);
  const courseEnrollments = useMemo(() => {
    const scoped = enrollments.filter((enrollment) => enrollment.courseId === courseId);
    if (isAdmin) return scoped;
    if (!currentMember) return [];
    return scoped.filter((enrollment) => enrollment.userId === currentMember.id);
  }, [enrollments, courseId, isAdmin, currentMember]);
  const memberMap = useMemo(() => {
    const map = new Map<string, typeof members[number]>();
    members.forEach(member => map.set(member.id, member));
    return map;
  }, [members]);

  const stats = useMemo(() => {
    const total = courseEnrollments.length;
    const completed = courseEnrollments.filter(e => e.status === 'completed').length;
    const overdue = courseEnrollments.filter(e => e.status === 'overdue').length;
    const scored = courseEnrollments.filter(e => e.score !== undefined);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((sum, e) => sum + (e.score || 0), 0) / scored.length)
      : 0;
    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      overdue,
      avgScore
    };
  }, [courseEnrollments]);

  const reportEnrollments = useMemo(() => {
    if (!isAdmin) return courseEnrollments;
    const fromTimestamp = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTimestamp = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return courseEnrollments.filter((enrollment) => {
      if (statusFilter !== 'all' && enrollment.status !== statusFilter) return false;
      if (roleFilter !== 'all' && enrollment.role !== roleFilter) return false;

      if (fromTimestamp || toTimestamp) {
        const assignedAt = enrollment.assignedAt || 0;
        if (fromTimestamp && assignedAt < fromTimestamp) return false;
        if (toTimestamp && assignedAt > toTimestamp) return false;
      }

      return true;
    });
  }, [courseEnrollments, dateFrom, dateTo, isAdmin, roleFilter, statusFilter]);

  const exportReport = (format: 'csv' | 'excel' | 'pdf') => {
    if (!course || !currentOrg) return;
    const data = reportEnrollments.map((enrollment) => {
      const member = memberMap.get(enrollment.userId);
      return {
        learner: member?.name || 'Unknown user',
        email: member?.email || '-',
        role: enrollment.role === 'teacher' ? 'Teacher' : 'Student',
        status: enrollment.status.replace('_', ' '),
        progress: enrollment.progress,
        score: enrollment.score ?? '-',
        assignedAt: formatDate(enrollment.assignedAt),
        completedAt: formatDate(enrollment.completedAt),
        dueDate: formatDate(enrollment.dueDate)
      };
    });

    const options = {
      filename: `${course.title.replace(/\s+/g, '_').toLowerCase()}_analytics_${new Date().toISOString().slice(0, 10)}`,
      title: `${course.title} • Course Analytics`,
      subtitle: `Org: ${currentOrg.name}`,
      columns: [
        { id: 'learner', label: 'Learner' },
        { id: 'email', label: 'Email' },
        { id: 'role', label: 'Role' },
        { id: 'status', label: 'Status' },
        { id: 'progress', label: 'Progress (%)' },
        { id: 'score', label: 'Score (%)' },
        { id: 'assignedAt', label: 'Assigned' },
        { id: 'completedAt', label: 'Completed' },
        { id: 'dueDate', label: 'Due Date' }
      ],
      data,
      dateRange: dateFrom || dateTo
        ? {
            start: new Date(`${(dateFrom || dateTo)!}T00:00:00`),
            end: new Date(`${(dateTo || dateFrom)!}T23:59:59`)
          }
        : undefined,
      generatedBy: currentMember?.name
    };

    if (format === 'csv') exportToCSV(options);
    if (format === 'excel') exportToExcel(options);
    if (format === 'pdf') exportToPDF(options);
  };

  const openGenieTutor = () => {
    if (!course) return;
    createNewChat();
    const moduleTitles = course.modules?.map((module) => module.title).join(', ') || 'No modules yet';
    addMessage({
      role: 'assistant',
      content: `Genie Tutor is ready for **${course.title}**.\nModules: ${moduleTitles}\nAsk me questions about this course, policies, or scenarios.`
    });
    setShowTutorPanel(true);
  };

  if (!course) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Course not found</h2>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            Select a course to view its homepage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="px-6 py-5">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {course.shortDescription || course.description}
          </p>
        </div>
        <div className="px-6 pb-4 flex flex-wrap gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enrollments</p>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completion rate</p>
                <p className="text-2xl font-bold mt-1">{stats.completionRate}%</p>
              </div>
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Average score</p>
                <p className="text-2xl font-bold mt-1">{stats.avgScore}%</p>
              </div>
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Overdue</p>
                <p className="text-2xl font-bold mt-1">{stats.overdue}</p>
              </div>
            </div>

            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className="text-lg font-semibold mb-3">Course Overview</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {course.description}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Modules</p>
                  <p className="font-medium">{course.modules?.length || 0}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Estimated duration</p>
                  <p className="font-medium">{course.estimatedDuration} minutes</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Self enrolment</p>
                  <p className="font-medium">{course.settings.allowSelfEnrollment ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Guest access</p>
                  <p className="font-medium">{course.settings.allowGuestAccess ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Genie Tutor</h2>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Ask questions, get explanations, and request practice scenarios tied to this course.
                  </p>
                </div>
                <button
                  onClick={openGenieTutor}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Sparkles className="w-4 h-4" />
                  Ask Genie
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {['Summarize key policies', 'Give a scenario quiz', 'Explain a difficult step'].map((chip) => (
                  <span
                    key={chip}
                    className={`px-3 py-1 rounded-full ${
                      isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Participants</h2>
            {courseEnrollments.length === 0 ? (
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No enrolled users yet.</p>
            ) : (
              <div className="space-y-3">
                {courseEnrollments.map(enrollment => {
                  const member = memberMap.get(enrollment.userId);
                  return (
                    <div
                      key={enrollment.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm">{member?.name || 'Unknown user'}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{member?.email || '-'}</p>
                        <div className="mt-2 w-48">
                          <div className={`h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                              className="h-full rounded-full bg-indigo-500"
                              style={{ width: `${Math.min(enrollment.progress, 100)}%` }}
                            />
                          </div>
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Progress {enrollment.progress}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{enrollment.role === 'teacher' ? 'Teacher' : 'Student'}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Assigned {formatDate(enrollment.assignedAt)}</p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Status: {enrollment.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'grades' && (
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Grades</h2>
            {courseEnrollments.length === 0 ? (
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No grades yet.</p>
            ) : (
              <div className="space-y-3">
                {courseEnrollments.map(enrollment => {
                  const member = memberMap.get(enrollment.userId);
                  return (
                    <div
                      key={enrollment.id}
                      className={`grid grid-cols-3 gap-3 p-3 rounded-lg border ${
                        isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm">{member?.name || 'Unknown user'}</p>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{member?.email || '-'}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Progress</p>
                        <p className="font-medium">{enrollment.progress}%</p>
                      </div>
                      <div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Score</p>
                        <p className="font-medium">{enrollment.score ?? '-'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            {isAdmin && (
              <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Status
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | EnrollmentStatus)}
                        className={`px-3 py-2 rounded-lg border text-sm ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white border-gray-200 text-gray-900'
                        }`}
                      >
                        <option value="all">All</option>
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="overdue">Overdue</option>
                        <option value="failed">Failed</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Role
                      </label>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as 'all' | 'student' | 'teacher')}
                        className={`px-3 py-2 rounded-lg border text-sm ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white border-gray-200 text-gray-900'
                        }`}
                      >
                        <option value="all">All</option>
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Assigned from
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className={`px-3 py-2 rounded-lg border text-sm ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Assigned to
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className={`px-3 py-2 rounded-lg border text-sm ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-white border-gray-200 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportReport('csv')}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                        isDarkMode
                          ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      CSV
                    </button>
                    <button
                      onClick={() => exportReport('excel')}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                        isDarkMode
                          ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      Excel
                    </button>
                    <button
                      onClick={() => exportReport('pdf')}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                        isDarkMode
                          ? 'border-gray-600 text-gray-200 hover:bg-gray-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className="text-lg font-semibold mb-4">Engagement Summary</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Learners started</p>
                  <p className="font-medium">
                    {reportEnrollments.filter(e => e.status !== 'not_started').length} of {reportEnrollments.length}
                  </p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>In progress</p>
                  <p className="font-medium">{reportEnrollments.filter(e => e.status === 'in_progress').length}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Completed</p>
                  <p className="font-medium">{reportEnrollments.filter(e => e.status === 'completed').length}</p>
                </div>
                <div>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Overdue</p>
                  <p className="font-medium">{reportEnrollments.filter(e => e.status === 'overdue').length}</p>
                </div>
              </div>
            </div>

            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h2 className="text-lg font-semibold mb-4">Assessment health</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Average score is {
                  reportEnrollments.filter(e => e.score !== undefined).length > 0
                    ? Math.round(
                        reportEnrollments.reduce((sum, e) => sum + (e.score || 0), 0) /
                          reportEnrollments.filter(e => e.score !== undefined).length
                      )
                    : 0
                }% across {reportEnrollments.length} enrollments.
              </p>
            </div>
          </div>
        )}
      </div>

      {showTutorPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowTutorPanel(false)}
          />
          <aside className={`relative w-full max-w-2xl h-full shadow-xl border-l ${
            isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div>
                <p className="text-sm font-semibold">Genie Tutor</p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {course?.title || 'Course'}
                </p>
              </div>
              <button
                onClick={() => setShowTutorPanel(false)}
                className={`p-2 rounded-lg ${
                  isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-[calc(100%-64px)]">
              <ChatInterface />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default CourseHome;
