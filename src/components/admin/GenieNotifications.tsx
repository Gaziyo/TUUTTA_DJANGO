import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, Shield, Users } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import GenieTutorPanel from './GenieTutorPanel';
import { buildGenieTutorContext } from '../../lib/genieTutorContext';

interface GenieNotificationsProps {
  isDarkMode?: boolean;
  embedded?: boolean;
}

type DateRange = '7d' | '30d' | '90d';

const GenieNotifications: React.FC<GenieNotificationsProps> = ({ isDarkMode = false, embedded = false }) => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';

  const {
    currentOrg,
    members,
    courses,
    enrollments,
    genieSources,
    genieDrafts,
    genieAssessments,
    reportSchedules,
    reportRuns,
    loadMembers,
    loadCourses,
    loadEnrollments,
    loadReportSchedules,
    loadReportRuns,
    runReportNow,
    loadManagerDigestRuns,
    runManagerDigestNow,
    managerDigestRuns
  } = useLMSStore();

  const [alertRange, setAlertRange] = useState<DateRange>('30d');
  const [managerSearch, setManagerSearch] = useState('');
  const [completionSearch, setCompletionSearch] = useState('');
  const tutorContext = buildGenieTutorContext({
    step: 'manager_portal',
    sources: genieSources,
    drafts: genieDrafts,
    assessments: genieAssessments
  });

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadMembers();
    loadCourses();
    loadEnrollments();
    loadReportSchedules();
    loadReportRuns();
    loadManagerDigestRuns();
  }, [currentOrg?.id, loadMembers, loadCourses, loadEnrollments, loadReportSchedules, loadReportRuns, loadManagerDigestRuns]);

  const completionAlerts = useMemo(() => {
    const now = Date.now();
    const ranges: Record<DateRange, number> = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    const since = now - ranges[alertRange];

    return enrollments
      .filter(e => e.status === 'completed' && (e.completedAt ?? 0) >= since)
      .map(e => {
        const member = members.find(m => m.userId === e.userId);
        const course = courses.find(c => c.id === e.courseId);
        return {
          id: e.id,
          learner: member?.name || 'Learner',
          email: member?.email || '-',
          course: course?.title || 'Course',
          completedAt: e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '-',
          managerId: member?.managerId
        };
      })
      .filter(item => {
        if (!completionSearch.trim()) return true;
        const q = completionSearch.toLowerCase();
        return (
          item.learner.toLowerCase().includes(q) ||
          item.email.toLowerCase().includes(q) ||
          item.course.toLowerCase().includes(q)
        );
      });
  }, [enrollments, members, courses, alertRange, completionSearch]);

  const managerDashboards = useMemo(() => {
    const managerRoles = new Set(['team_lead', 'ld_manager', 'org_admin']);
    return members
      .filter(m => managerRoles.has(m.role))
      .map(manager => {
        const directReports = members.filter(m => m.managerId === manager.id || m.managerId === manager.userId);
        const teamReports = manager.teamId
          ? members.filter(m => m.teamId === manager.teamId && m.id !== manager.id)
          : [];
        const reportIds = new Set([...directReports, ...teamReports].map(m => m.userId || m.id));
        const relevantEnrollments = enrollments.filter(e => reportIds.has(e.userId));
        const completed = relevantEnrollments.filter(e => e.status === 'completed').length;
        const overdue = relevantEnrollments.filter(e => e.status === 'overdue').length;
        const inProgress = relevantEnrollments.filter(e => e.status === 'in_progress').length;
        return {
          id: manager.id,
          name: manager.name,
          role: manager.role.replace('_', ' '),
          teamSize: reportIds.size,
          completed,
          inProgress,
          overdue
        };
      })
      .filter(item => {
        if (!managerSearch.trim()) return true;
        const q = managerSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.role.toLowerCase().includes(q);
      });
  }, [members, enrollments, managerSearch]);

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
  const latestScheduleId = scheduleSummary[0]?.id;
  const tutorActions = [
    {
      label: 'Run scheduled report',
      description: 'Trigger the latest schedule now.',
      onClick: () => {
        if (latestScheduleId) runReportNow(latestScheduleId);
      },
      disabled: !latestScheduleId,
      variant: 'primary' as const
    },
    {
      label: 'Queue manager digest',
      description: 'Send an updated manager digest.',
      onClick: () => runManagerDigestNow(),
      disabled: !currentOrg?.settings?.notifications?.managerDigestEnabled
    }
  ];

  const digestSummary = useMemo(() => {
    return managerDigestRuns.map(run => ({
      ...run,
      createdAtLabel: new Date(run.createdAt).toLocaleDateString()
    }));
  }, [managerDigestRuns]);

  return (
    <div className={`${embedded ? '' : 'h-full'} flex flex-col bg-app-bg text-app-text`}>
      {!embedded && (
        <AdminPageHeader
        title="Genie Notifications & Reports"
        subtitle="Completion alerts, scheduled reports, and manager insights."
        isDarkMode={themeDark}
        badge="Genie"
        actions={(
          <div className="text-xs px-3 py-1 rounded-full border border-indigo-500/40 text-indigo-500">
            Manager Updates
          </div>
        )}
        />
      )}

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AdminSection title="AI Tutor" subtitle="Guidance for manager updates and alerts." isDarkMode={themeDark} minHeight="200px">
          <GenieTutorPanel context={tutorContext} actions={tutorActions} isDarkMode={themeDark} />
        </AdminSection>

        <AdminSection title="Scheduled Report Generation" subtitle="Automated report cadence and recent runs." isDarkMode={themeDark} minHeight="200px">
          {scheduleSummary.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No schedules yet. Configure them in Genie Analytics.
            </p>
          ) : (
            <div className="space-y-2">
              {scheduleSummary.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`rounded-lg border p-3 flex flex-wrap items-center justify-between gap-4 ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{schedule.frequency} report</p>
                    <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Recipients: {schedule.recipients}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <p className="font-semibold">{schedule.latestStatus}</p>
                      <p className={`${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
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

        <AdminSection title="Manager Digest Emails" subtitle="Queue digest runs (stub) for manager updates." isDarkMode={themeDark} minHeight="200px">
          <div className="flex items-center justify-between mb-3">
            <div className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Enabled: {currentOrg?.settings?.notifications?.managerDigestEnabled ? 'Yes' : 'No'} •
              Frequency: {currentOrg?.settings?.notifications?.managerDigestFrequency || 'weekly'}
            </div>
            <button
              onClick={() => runManagerDigestNow()}
              className="px-3 py-1 rounded-lg border text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={!currentOrg?.settings?.notifications?.managerDigestEnabled}
            >
              Queue digest now
            </button>
          </div>
          {digestSummary.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No digest runs yet.
            </p>
          ) : (
            <div className="space-y-2">
              {digestSummary.slice(0, 6).map((run) => (
                <div
                  key={run.id}
                  className={`rounded-lg border p-3 flex items-center justify-between ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{run.status}</p>
                    <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {run.frequency || 'weekly'} • {run.createdAtLabel}
                    </p>
                  </div>
                  <span className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Roles: {run.roles?.join(', ') || '-'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Completion Alerts" subtitle="Recently completed training for managers." isDarkMode={themeDark} minHeight="240px">
          <AdminToolbar
            isDarkMode={themeDark}
            searchValue={completionSearch}
            onSearchChange={setCompletionSearch}
            searchPlaceholder="Search learner or course..."
            rightContent={(
              <select
                value={alertRange}
                onChange={(e) => setAlertRange(e.target.value as DateRange)}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            )}
          />
          <div className="mt-4 space-y-2">
            {completionAlerts.length === 0 ? (
              <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No completions in this period.
              </p>
            ) : (
              completionAlerts.slice(0, 20).map(alert => (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-3 flex items-center justify-between ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{alert.learner} • {alert.course}</p>
                    <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Completed {alert.completedAt} • {alert.email}
                    </p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
              ))
            )}
          </div>
        </AdminSection>

        <AdminSection title="Manager Dashboards" subtitle="Progress snapshots for team leads and managers." isDarkMode={themeDark} minHeight="240px">
          <AdminToolbar
            isDarkMode={themeDark}
            searchValue={managerSearch}
            onSearchChange={setManagerSearch}
            searchPlaceholder="Search manager..."
          />
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {managerDashboards.length === 0 ? (
              <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No manager dashboards found.
              </p>
            ) : (
              managerDashboards.map(manager => (
                <div
                  key={manager.id}
                  className={`rounded-xl border p-4 ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{manager.name}</p>
                      <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {manager.role} • {manager.teamSize} reports
                      </p>
                    </div>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>{manager.completed} completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span>{manager.inProgress} in progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-500" />
                      <span>{manager.overdue} overdue</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminSection>
      </div>
    </div>
  );
};

export default GenieNotifications;
