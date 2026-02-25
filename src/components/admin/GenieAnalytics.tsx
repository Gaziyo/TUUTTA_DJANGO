import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, AlertTriangle, Users, Target, TrendingUp, Download } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { apiClient } from '../../lib/api';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import type { EnrollmentStatus, RiskScore, AnalyticsRecommendation, AssessmentResult, Enrollment } from '../../types/lms';
import { exportToCSV, exportToExcel, exportToPDF } from '../../lib/reportExport';
import GenieTutorPanel from './GenieTutorPanel';
import { buildGenieTutorContext } from '../../lib/genieTutorContext';
import { assessmentService } from '../../services/assessmentService';
import { useToast } from '../ui/toast-provider';

type AnalyticsJob = {
  id: string;
  mode: string;
  status: string;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
};

type ModuleAnalyticsItem = {
  id: string;
  courseId: string;
  moduleId: string;
  dropOffRate: number;
  started: number;
  completed: number;
};

type QuestionAnalyticsItem = {
  id: string;
  questionId: string;
  incorrectRate: number;
  attempts: number;
};

type RiskModel = {
  version?: string;
  threshold?: number;
  precision?: number;
  recall?: number;
  f1?: number;
};

type CopilotSuggestion = { action?: string; followed?: boolean };

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const toRiskModel = (value: unknown): RiskModel | null => {
  const data = asRecord(value);
  if (Object.keys(data).length === 0) return null;
  return {
    version: typeof data.version === 'string' ? data.version : undefined,
    threshold: typeof data.threshold === 'number' ? data.threshold : undefined,
    precision: typeof data.precision === 'number' ? data.precision : undefined,
    recall: typeof data.recall === 'number' ? data.recall : undefined,
    f1: typeof data.f1 === 'number' ? data.f1 : undefined
  };
};

const toAnalyticsJob = (id: string, value: unknown): AnalyticsJob => {
  const data = asRecord(value);
  return {
    id,
    mode: typeof data.mode === 'string' ? data.mode : 'unknown',
    status: typeof data.status === 'string' ? data.status : 'unknown',
    startedAt: typeof data.startedAt === 'number' ? data.startedAt : undefined,
    completedAt: typeof data.completedAt === 'number' ? data.completedAt : undefined,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined
  };
};

const toModuleAnalytics = (id: string, value: unknown): ModuleAnalyticsItem => {
  const data = asRecord(value);
  return {
    id,
    courseId: typeof data.courseId === 'string' ? data.courseId : '',
    moduleId: typeof data.moduleId === 'string' ? data.moduleId : '',
    dropOffRate: typeof data.dropOffRate === 'number' ? data.dropOffRate : 0,
    started: typeof data.started === 'number' ? data.started : 0,
    completed: typeof data.completed === 'number' ? data.completed : 0
  };
};

const toQuestionAnalytics = (id: string, value: unknown): QuestionAnalyticsItem => {
  const data = asRecord(value);
  return {
    id,
    questionId: typeof data.questionId === 'string' ? data.questionId : '',
    incorrectRate: typeof data.incorrectRate === 'number' ? data.incorrectRate : 0,
    attempts: typeof data.attempts === 'number' ? data.attempts : 0
  };
};

const getDraftSuggestions = (draft: unknown): CopilotSuggestion[] => {
  const data = asRecord(draft);
  const copilot = asRecord(data.copilot);
  const raw = copilot.suggestions;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const suggestion = asRecord(item);
    return {
      action: typeof suggestion.action === 'string' ? suggestion.action : undefined,
      followed: typeof suggestion.followed === 'boolean' ? suggestion.followed : undefined
    };
  });
};

const GenieAnalytics: React.FC<{ isDarkMode?: boolean; embedded?: boolean }> = ({
  isDarkMode = false,
  embedded = false
}) => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const currentUserId = useStore(state => state.user?.id || '');
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    currentOrg,
    courses,
    enrollments,
    members,
    genieSources,
    genieDrafts,
    genieAssessments,
    competencyScores,
    competencyBadges: _competencyBadges,
    remediationAssignments,
    reportSchedules,
    reportRuns,
    loadCourses,
    loadEnrollments,
    loadMembers,
    loadReportSchedules,
    loadReportRuns,
    loadCompetencyScores,
    loadCompetencyBadges,
    loadRemediationAssignments,
    runReportNow
  } = useLMSStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EnrollmentStatus>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [_defaultRecipients, setDefaultRecipients] = useState('');
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [recommendations, setRecommendations] = useState<AnalyticsRecommendation[]>([]);
  const [recalcStatus, setRecalcStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const toast = useToast();
  const [timeSeries, setTimeSeries] = useState<Array<{ date: string; completions: number; passRate: number }>>([]);
  const [moduleAnalytics, setModuleAnalytics] = useState<ModuleAnalyticsItem[]>([]);
  const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalyticsItem[]>([]);
  const [riskModel, setRiskModel] = useState<RiskModel | null>(null);
  const [analyticsJobs, setAnalyticsJobs] = useState<AnalyticsJob[]>([]);
  const [moduleCourseFilter, setModuleCourseFilter] = useState<string>('all');
  const tutorContext = buildGenieTutorContext({
    step: 'evaluate',
    sources: genieSources,
    drafts: genieDrafts,
    assessments: genieAssessments
  });

  useEffect(() => {
    if (currentOrg?.id) {
      loadCourses();
      loadEnrollments();
      loadMembers();
      loadReportSchedules();
      loadReportRuns();
      loadCompetencyScores();
      loadCompetencyBadges();
      loadRemediationAssignments();
    }
  }, [currentOrg?.id, loadCourses, loadEnrollments, loadMembers, loadReportSchedules, loadReportRuns, loadCompetencyScores, loadCompetencyBadges, loadRemediationAssignments]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (!section) return;
    const el = document.querySelector(`[data-section="${section}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('section-highlight');
      window.setTimeout(() => el.classList.remove('section-highlight'), 1600);
    }
  }, [searchParams]);

  const jumpTo = (section: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('section', section);
      return next;
    });
  };

  useEffect(() => {
    if (!currentOrg?.id) return;
    let active = true;
    assessmentService.listForOrg(currentOrg.id, 500).then((results) => {
      if (!active) return;
      setAssessmentResults(results);
    });
    const loadAnalyticsDocs = async () => {
      // Analytics collections not yet available via Django — use empty state
      if (active) {
        setRiskScores([]);
        setRecommendations([]);
        setTimeSeries([]);
        setAnalyticsJobs([]);
        setModuleAnalytics([]);
        setQuestionAnalytics([]);
      }
    };
    void loadAnalyticsDocs();
    return () => { active = false; };
  }, [currentOrg?.id]);

  const refreshAnalyticsDocs = async () => {
    if (!currentOrg?.id) return;
    // Refresh assessments from Django; analytics collections pending backend migration
    const assessment = await assessmentService.listForOrg(currentOrg.id, 500);
    setAssessmentResults(assessment);
    setRiskScores([]);
    setRecommendations([]);
    setAnalyticsJobs([]);
    setModuleAnalytics([]);
    setQuestionAnalytics([]);
  };

  const recalcAnalytics = async () => {
    if (!currentOrg?.id) return;
    setRecalcStatus('running');
    try {
      await apiClient.post(`/organizations/${currentOrg.id}/analytics-jobs/recalculate/`, {
        organization: currentOrg.id,
      });
      await refreshAnalyticsDocs();
      setRecalcStatus('success');
      toast.success('Analytics updated', 'Metrics have been refreshed.');
    } catch {
      setRecalcStatus('error');
      toast.error('Analytics failed', 'Unable to recalculate analytics.');
    }
  };

  useEffect(() => {
    // Report schedule loading pending backend migration — no-op
  }, [currentOrg?.id]);

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
      label: 'Export CSV',
      description: 'Download enrollment analytics.',
      onClick: () => exportGenieReport('csv'),
      variant: 'primary' as const
    },
    {
      label: 'Export PDF',
      description: 'Share a printable report.',
      onClick: () => exportGenieReport('pdf')
    },
    {
      label: 'Run scheduled report',
      description: 'Trigger the latest schedule now.',
      onClick: () => {
        if (latestScheduleId) runReportNow(latestScheduleId);
      },
      disabled: !latestScheduleId
    }
  ];

  useEffect(() => {
    // Default recipients loading pending backend migration — no-op
  }, [currentOrg?.id]);

  const memberMap = useMemo(() => {
    const map = new Map<string, typeof members[number]>();
    members.forEach(member => map.set(member.id, member));
    return map;
  }, [members]);

  const competencyLeaderboard = useMemo(() => {
    const buckets = new Map<string, { userId: string; avgScore: number; count: number }>();
    competencyScores.forEach((score) => {
      const entry = buckets.get(score.userId) || { userId: score.userId, avgScore: 0, count: 0 };
      entry.avgScore = entry.avgScore + (score.score || 0);
      entry.count += 1;
      buckets.set(score.userId, entry);
    });
    return Array.from(buckets.values())
      .map((entry) => ({
        ...entry,
        avgScore: entry.count ? Math.round(entry.avgScore / entry.count) : 0,
        member: memberMap.get(entry.userId)
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 10);
  }, [competencyScores, memberMap]);

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((enrollment) => {
      const member = memberMap.get(enrollment.userId);
      const course = courses.find((c) => c.id === enrollment.courseId);
      const matchesSearch = searchQuery.trim().length === 0 ||
        member?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course?.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;
      const matchesCourse = courseFilter === 'all' || enrollment.courseId === courseFilter;
      return matchesSearch && matchesStatus && matchesCourse;
    });
  }, [enrollments, memberMap, searchQuery, statusFilter, courseFilter, courses]);

  const stats = useMemo(() => {
    const total = enrollments.length;
    const completed = enrollments.filter((e) => e.status === 'completed').length;
    const inProgress = enrollments.filter((e) => e.status === 'in_progress').length;
    const overdue = enrollments.filter((e) => e.status === 'overdue').length;
    const avgProgress = total > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / total)
      : 0;
    return { total, completed, inProgress, overdue, avgProgress };
  }, [enrollments]);

  const analyticsMetrics = useMemo(() => {
    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    const completedDurations = enrollments
      .filter(e => e.completedAt && e.assignedAt)
      .map(e => e.completedAt - e.assignedAt);
    const avgTimeToCompleteDays = completedDurations.length
      ? Math.round((completedDurations.reduce((sum, v) => sum + v, 0) / completedDurations.length) / (1000 * 60 * 60 * 24))
      : 0;
    const passRate = assessmentResults.length
      ? Math.round(assessmentResults.filter((a) => a.passed).length / assessmentResults.length * 100)
      : 0;
    const avgAssessmentScore = assessmentResults.length
      ? Math.round(assessmentResults.reduce((sum, a) => sum + (a.score || 0), 0) / assessmentResults.length)
      : 0;
    const atRiskCount = riskScores.filter((r) => r.riskLevel === 'high' || r.riskLevel === 'medium').length;
    const complianceRiskScore = stats.total > 0
      ? Math.round(((stats.overdue + atRiskCount) / stats.total) * 100)
      : 0;
    const contentEffectiveness = Math.round((completionRate * avgAssessmentScore) / 100);
    return {
      completionRate,
      avgTimeToCompleteDays,
      passRate,
      complianceRiskScore,
      avgAssessmentScore,
      contentEffectiveness
    };
  }, [stats, enrollments, assessmentResults, riskScores]);

  const moduleChartData = useMemo(() => {
    const filtered = moduleCourseFilter === 'all'
      ? moduleAnalytics
      : moduleAnalytics.filter((entry) => entry.courseId === moduleCourseFilter);
    return filtered.map((entry) => ({
      name: entry.moduleId,
      dropOffRate: entry.dropOffRate,
      started: entry.started,
      completed: entry.completed
    }));
  }, [moduleAnalytics, moduleCourseFilter]);

  const suggestionStats = useMemo(() => {
    const actionableSuggestions = (genieDrafts || [])
      .flatMap((draft) => getDraftSuggestions(draft))
      .filter((entry) => Boolean(entry.action));
    const followed = actionableSuggestions.filter((entry: { followed?: boolean }) => entry.followed).length;
    const ignored = actionableSuggestions.filter((entry: { followed?: boolean }) => !entry.followed).length;
    const total = actionableSuggestions.length;
    const followRate = total > 0 ? Math.round((followed / total) * 100) : 0;
    return { total, followed, ignored, followRate };
  }, [genieDrafts]);

  const competencySummary = useMemo(() => {
    const total = competencyScores.length;
    const avgScore = total > 0
      ? Math.round(competencyScores.reduce((sum, score) => sum + (score.score || 0), 0) / total)
      : 0;
    const expiringSoon = competencyScores.filter((score) => {
      if (!score.expiresAt) return false;
      const days = (score.expiresAt - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;
    return { total, avgScore, expiringSoon };
  }, [competencyScores]);

  const remediationSummary = useMemo(() => {
    const total = remediationAssignments.length;
    const assigned = remediationAssignments.filter((assignment) => assignment.status === 'assigned').length;
    const completed = remediationAssignments.filter((assignment) => assignment.status === 'completed').length;
    return { total, assigned, completed };
  }, [remediationAssignments]);

  const riskAlerts = useMemo<Array<RiskScore | Enrollment>>(() => {
    if (riskScores.length > 0) {
      return riskScores.filter((risk) => risk.riskLevel === 'high');
    }
    return enrollments.filter((enrollment) => enrollment.status === 'overdue' || (enrollment.progress ?? 0) < 30);
  }, [enrollments, riskScores]);

  const exportGenieReport = (format: 'csv' | 'excel' | 'pdf') => {
    if (!currentOrg) return;
    const data = filteredEnrollments.map((enrollment) => {
      const member = memberMap.get(enrollment.userId);
      const course = courses.find((c) => c.id === enrollment.courseId);
      return {
        learner: member?.name || 'Unknown user',
        email: member?.email || '-',
        course: course?.title || 'Course',
        status: enrollment.status.replace('_', ' '),
        progress: enrollment.progress,
        score: enrollment.score ?? '-',
        assignedAt: enrollment.assignedAt ? new Date(enrollment.assignedAt).toLocaleDateString() : '-',
        completedAt: enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString() : '-',
        dueDate: enrollment.dueDate ? new Date(enrollment.dueDate).toLocaleDateString() : '-'
      };
    });

    const options = {
      filename: `genie_analytics_${new Date().toISOString().slice(0, 10)}`,
      title: 'Genie Analytics',
      subtitle: `Org: ${currentOrg.name}`,
      columns: [
        { id: 'learner', label: 'Learner' },
        { id: 'email', label: 'Email' },
        { id: 'course', label: 'Course' },
        { id: 'status', label: 'Status' },
        { id: 'progress', label: 'Progress (%)' },
        { id: 'score', label: 'Score' },
        { id: 'assignedAt', label: 'Assigned' },
        { id: 'completedAt', label: 'Completed' },
        { id: 'dueDate', label: 'Due Date' }
      ]
    };

    if (format === 'csv') exportToCSV(data, options);
    if (format === 'excel') exportToExcel(data, options);
    if (format === 'pdf') exportToPDF(data, options);
  };

  const exportCompetencyLeaderboard = (format: 'csv' | 'excel' | 'pdf') => {
    const rows = competencyLeaderboard.map((entry, index) => ({
      rank: index + 1,
      learner: entry.member?.name || 'Unknown',
      email: entry.member?.email || '-',
      avgScore: entry.avgScore,
      assessments: entry.count
    }));
    const options = {
      filename: `competency_leaderboard_${new Date().toISOString().slice(0, 10)}`,
      title: 'Competency Leaderboard',
      subtitle: `Org: ${currentOrg?.name || '-'}`,
      columns: [
        { id: 'rank', label: 'Rank' },
        { id: 'learner', label: 'Learner' },
        { id: 'email', label: 'Email' },
        { id: 'avgScore', label: 'Avg Score' },
        { id: 'assessments', label: 'Assessments' }
      ]
    };
    if (format === 'csv') exportToCSV(rows, options);
    if (format === 'excel') exportToExcel(rows, options);
    if (format === 'pdf') exportToPDF(rows, options);
  };

  const handleScheduleReport = () => {
    if (!scheduleRecipients.trim()) {
      setScheduleMessage('Add at least one recipient email.');
      return;
    }
    if (!currentOrg?.id) return;
    const payload = {
      orgId: currentOrg.id,
      enabled: scheduleEnabled,
      frequency: scheduleFrequency,
      recipients: scheduleRecipients,
      updatedAt: Date.now(),
    };

    // Report schedule persistence pending backend migration
    setScheduleMessage(`Scheduled ${scheduleFrequency} report to ${scheduleRecipients}.`);
  };

  return (
    <div className={`${embedded ? '' : 'h-full'} flex flex-col bg-app-bg text-app-text`} data-section="impact">
      {!embedded && (
        <>
          <AdminPageHeader
            title="Genie Analytics"
            subtitle="Monitor learner progress, completion, and risk alerts."
            isDarkMode={themeDark}
            badge="Genie"
            actions={(
              <div className="flex items-center gap-2">
                <button
                  onClick={recalcAnalytics}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                    themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {recalcStatus === 'running' ? 'Recalculating…' : 'Recalculate'}
                </button>
                <button
                  onClick={() => exportGenieReport('csv')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                    themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={() => exportGenieReport('excel')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                    themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
                <button
                  onClick={() => exportGenieReport('pdf')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                    themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
              </div>
            )}
          />
          <div className="px-6 pb-4">
            <div className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs">
              <button
                type="button"
                onClick={() => jumpTo('impact')}
                className="rounded-full px-3 py-1 font-medium text-muted-foreground hover:text-foreground"
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => jumpTo('impact')}
                className="rounded-full px-3 py-1 font-medium text-muted-foreground hover:text-foreground"
              >
                Impact
              </button>
            </div>
          </div>
        </>
      )}


      <div className="flex-1 overflow-auto p-6 space-y-6">
        <AdminSection title="Copilot Follow‑Through" subtitle="How often teams act on AI guidance." isDarkMode={themeDark} minHeight="120px">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`rounded-xl border p-4 ${themeDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Follow rate</p>
              <p className="text-2xl font-semibold mt-2">{suggestionStats.followRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">Suggestions followed</p>
            </div>
            <div className={`rounded-xl border p-4 ${themeDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Followed</p>
              <p className="text-2xl font-semibold mt-2">{suggestionStats.followed}</p>
              <p className="text-xs text-muted-foreground mt-1">Out of {suggestionStats.total} total</p>
            </div>
            <div className={`rounded-xl border p-4 ${themeDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ignored</p>
              <p className="text-2xl font-semibold mt-2">{suggestionStats.ignored}</p>
              <p className="text-xs text-muted-foreground mt-1">Needs review by admins</p>
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Competency & Remediation" subtitle="Skill mastery and remediation workload." isDarkMode={themeDark} minHeight="120px">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`rounded-xl border p-4 ${themeDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg competency score</p>
              <p className="text-2xl font-semibold mt-2">{competencySummary.avgScore}%</p>
              <p className="text-xs text-muted-foreground mt-1">{competencySummary.total} scores recorded</p>
            </div>
            <div className={`rounded-xl border p-4 ${themeDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Expiring soon</p>
              <p className="text-2xl font-semibold mt-2">{competencySummary.expiringSoon}</p>
              <p className="text-xs text-muted-foreground mt-1">Within 30 days</p>
            </div>
            <div className={`rounded-xl border p-4 ${themeDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Remediation assigned</p>
              <p className="text-2xl font-semibold mt-2">{remediationSummary.assigned}</p>
              <p className="text-xs text-muted-foreground mt-1">{remediationSummary.completed} completed</p>
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Competency Leaderboard" subtitle="Top learners by competency score." isDarkMode={themeDark} minHeight="160px">
          <div className="flex items-center justify-between mb-3">
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Ranked by average competency score.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportCompetencyLeaderboard('csv')}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                Export CSV
              </button>
              <button
                onClick={() => exportCompetencyLeaderboard('excel')}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                Export Excel
              </button>
              <button
                onClick={() => exportCompetencyLeaderboard('pdf')}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  themeDark ? 'border-gray-600 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                Export PDF
              </button>
            </div>
          </div>
          <div className={`overflow-hidden rounded-xl border ${themeDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <table className="w-full text-sm">
              <thead className={themeDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-600'}>
                <tr>
                  <th className="text-left px-4 py-2">Rank</th>
                  <th className="text-left px-4 py-2">Learner</th>
                  <th className="text-left px-4 py-2">Avg Score</th>
                  <th className="text-left px-4 py-2">Assessments</th>
                </tr>
              </thead>
              <tbody>
                {competencyLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`px-4 py-3 ${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      No competency scores yet.
                    </td>
                  </tr>
                )}
                {competencyLeaderboard.map((entry, index) => (
                  <tr key={entry.userId} className={themeDark ? 'border-t border-gray-800' : 'border-t border-gray-200'}>
                    <td className="px-4 py-2 font-semibold">{index + 1}</td>
                    <td className="px-4 py-2">
                      <div className="font-medium">{entry.member?.name || 'Unknown'}</div>
                      <div className={`text-xs ${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>{entry.member?.email || '-'}</div>
                    </td>
                    <td className="px-4 py-2">{entry.avgScore}%</td>
                    <td className="px-4 py-2">{entry.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>

        <AdminSection title="AI Tutor" subtitle="Guidance for evaluating outcomes and analytics." isDarkMode={themeDark} minHeight="200px">
          <GenieTutorPanel context={tutorContext} actions={tutorActions} isDarkMode={themeDark} />
        </AdminSection>

        <AdminSection title="Overview" isDarkMode={themeDark} minHeight="120px">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Enrollments', value: stats.total, icon: Users },
              { label: 'In Progress', value: stats.inProgress, icon: TrendingUp },
              { label: 'Completed', value: stats.completed, icon: Target },
              { label: 'Overdue', value: stats.overdue, icon: AlertTriangle },
              { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: BarChart3 }
            ].map((card) => (
              <div key={card.label} className={`p-4 rounded-xl border ${
                themeDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
                  <card.icon className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
            ))}
          </div>
        </AdminSection>

        <AdminSection title="Outcome Metrics" subtitle="Phase 7 KPI rollups." isDarkMode={themeDark} minHeight="120px">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Completion Rate', value: `${analyticsMetrics.completionRate}%`, icon: Target },
              { label: 'Avg Time to Complete', value: `${analyticsMetrics.avgTimeToCompleteDays} days`, icon: TrendingUp },
              { label: 'Assessment Pass Rate', value: `${analyticsMetrics.passRate}%`, icon: BarChart3 },
              { label: 'Compliance Risk Score', value: `${analyticsMetrics.complianceRiskScore}%`, icon: AlertTriangle },
              { label: 'Content Effectiveness', value: `${analyticsMetrics.contentEffectiveness}%`, icon: Users }
            ].map((card) => (
              <div key={card.label} className={`p-4 rounded-xl border ${
                themeDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>{card.label}</p>
                  <card.icon className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-xl font-bold mt-1">{card.value}</p>
              </div>
            ))}
          </div>
          {riskModel && (
            <div className={`mt-4 rounded-xl border p-3 text-xs ${themeDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <p className="font-semibold">Risk Model</p>
              <p className={`${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Version {riskModel.version || 'v1'} • Threshold {riskModel.threshold ?? '-'} • Precision {riskModel.precision ?? '-'} • Recall {riskModel.recall ?? '-'} • F1 {riskModel.f1 ?? '-'}
              </p>
            </div>
          )}
        </AdminSection>

        <AdminSection title="Trends (Last 30 Days)" subtitle="Completion volume and pass rate." isDarkMode={themeDark} minHeight="200px">
          {timeSeries.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>No time‑series data yet.</p>
          ) : (
            <div className={`h-56 rounded-xl border p-3 ${themeDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeries}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="completions" stroke="#6366f1" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="passRate" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminSection>

        <AdminSection title="Analytics Job Logs" subtitle="Recalculate runs and their status." isDarkMode={themeDark} minHeight="200px">
          {analyticsJobs.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>No analytics jobs yet.</p>
          ) : (
            <div className="space-y-2">
              {analyticsJobs.map((job) => (
                <div
                  key={job.id}
                  className={`rounded-lg border p-3 text-xs flex items-center justify-between ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{job.mode === 'manual' ? 'Manual' : 'Scheduled'} run</p>
                    <p className={`${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Started {job.startedAt ? new Date(job.startedAt).toLocaleString() : '-'}
                    </p>
                    {job.errorMessage && (
                      <p className="text-rose-500 mt-1">{job.errorMessage}</p>
                    )}
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${
                    job.status === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : job.status === 'failed'
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Module Drop‑Off" subtitle="Modules with highest drop‑off rates." isDarkMode={themeDark} minHeight="200px">
          <div className="flex items-center justify-end mb-3">
            <select
              value={moduleCourseFilter}
              onChange={(e) => setModuleCourseFilter(e.target.value)}
              aria-label="Filter module analytics by course"
              title="Filter module analytics by course"
              className={`px-3 py-2 rounded-lg border text-sm ${
                themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>
          {moduleAnalytics.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>No module analytics yet.</p>
          ) : (
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4`}>
              <div className={`overflow-hidden rounded-xl border ${themeDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <table className="w-full text-sm">
                  <thead className={themeDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-600'}>
                    <tr>
                      <th className="text-left px-4 py-2">Course</th>
                      <th className="text-left px-4 py-2">Module</th>
                      <th className="text-left px-4 py-2">Started</th>
                      <th className="text-left px-4 py-2">Completed</th>
                      <th className="text-left px-4 py-2">Drop‑off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(moduleCourseFilter === 'all' ? moduleAnalytics : moduleAnalytics.filter((entry) => entry.courseId === moduleCourseFilter)).map((entry) => {
                      const course = courses.find((c) => c.id === entry.courseId);
                      return (
                        <tr key={entry.id} className={themeDark ? 'border-t border-gray-800' : 'border-t border-gray-200'}>
                          <td className="px-4 py-2">{course?.title || entry.courseId}</td>
                          <td className="px-4 py-2">{entry.moduleId}</td>
                          <td className="px-4 py-2">{entry.started}</td>
                          <td className="px-4 py-2">{entry.completed}</td>
                          <td className="px-4 py-2">{entry.dropOffRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={`h-64 rounded-xl border p-3 ${themeDark ? 'border-gray-700 bg-gray-900/60' : 'border-gray-200 bg-white'}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="dropOffRate" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </AdminSection>

        <AdminSection title="Question Difficulty" subtitle="Highest incorrect‑rate assessment questions." isDarkMode={themeDark} minHeight="200px">
          {questionAnalytics.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>No question analytics yet.</p>
          ) : (
            <div className={`overflow-hidden rounded-xl border ${themeDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <table className="w-full text-sm">
                <thead className={themeDark ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-600'}>
                  <tr>
                    <th className="text-left px-4 py-2">Question</th>
                    <th className="text-left px-4 py-2">Attempts</th>
                    <th className="text-left px-4 py-2">Incorrect Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {questionAnalytics.map((entry) => (
                    <tr key={entry.id} className={themeDark ? 'border-t border-gray-800' : 'border-t border-gray-200'}>
                      <td className="px-4 py-2">{entry.questionId}</td>
                      <td className="px-4 py-2">{entry.attempts}</td>
                      <td className="px-4 py-2">{entry.incorrectRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminSection>

        <AdminSection title="AI Recommendations" subtitle="Learner, manager, and L&D interventions." isDarkMode={themeDark} minHeight="200px">
          {recommendations.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>No recommendations yet.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {recommendations.map((rec) => (
                <div key={rec.id} className={`rounded-xl border p-3 ${
                  themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{rec.audience}</p>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${
                      rec.severity === 'high'
                        ? 'bg-rose-500/10 text-rose-500'
                        : rec.severity === 'medium'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                    }`}>
                      {rec.severity}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-2">{rec.title}</p>
                  <p className={`text-xs mt-1 ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>{rec.message}</p>
                  {rec.status && (
                    <p className={`text-[10px] mt-2 ${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      Status: {rec.status}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'followed', respondedAt: Date.now() } : r));
                      }}
                      className="px-2 py-1 rounded-lg border text-xs"
                    >
                      Mark Followed
                    </button>
                    <button
                      onClick={() => {
                        setRecommendations(prev => prev.map(r => r.id === rec.id ? { ...r, status: 'ignored', respondedAt: Date.now() } : r));
                      }}
                      className="px-2 py-1 rounded-lg border text-xs"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Filters" isDarkMode={themeDark} minHeight="72px">
          <AdminToolbar
            isDarkMode={themeDark}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search learner or course..."
            rightContent={(
              <>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  aria-label="Filter enrollments by status"
                  title="Filter enrollments by status"
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All status</option>
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  aria-label="Filter enrollments by course"
                  title="Filter enrollments by course"
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </>
            )}
          />
        </AdminSection>

        <AdminSection title="Scheduled Reports" subtitle="Automate Genie analytics updates." isDarkMode={themeDark} minHeight="160px">
          <div className="flex flex-wrap gap-4 items-end">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="accent-indigo-500"
              />
              Enable scheduling
            </label>
            <select
              value={scheduleFrequency}
              onChange={(e) => setScheduleFrequency(e.target.value as typeof scheduleFrequency)}
              aria-label="Report schedule frequency"
              title="Report schedule frequency"
              className={`px-3 py-2 rounded-lg border text-sm ${
                themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
              disabled={!scheduleEnabled}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input
              type="text"
              value={scheduleRecipients}
              onChange={(e) => setScheduleRecipients(e.target.value)}
              placeholder="Recipients (comma-separated emails)"
              aria-label="Report schedule recipients"
              title="Report schedule recipients"
              className={`px-3 py-2 rounded-lg border text-sm min-w-[260px] ${
                themeDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
              disabled={!scheduleEnabled}
            />
            <button
              onClick={handleScheduleReport}
              disabled={!scheduleEnabled}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              Save schedule
            </button>
            {scheduleMessage && (
              <span className={`text-xs ${scheduleMessage.includes('Scheduled') ? 'text-emerald-500' : 'text-red-500'}`}>
                {scheduleMessage}
              </span>
            )}
          </div>
          <p className={`mt-3 text-xs ${themeDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Scheduler is handled by Cloud Functions. Reports run automatically based on saved schedules.
          </p>
          {scheduleSummary.length > 0 && (
            <div className="mt-4 space-y-2">
              {scheduleSummary.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`rounded-lg border p-3 flex items-center justify-between ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{schedule.frequency} schedule</p>
                    <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {schedule.recipients}
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

        <AdminSection title="Risk Alerts" subtitle="Low progress, overdue, or predicted at-risk learners." isDarkMode={themeDark} minHeight="200px">
          {riskAlerts.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No risk alerts at the moment.
            </p>
          ) : (
            <div className="space-y-2">
              {riskAlerts.slice(0, 8).map((item) => {
                const enrollmentId = 'enrollmentId' in item ? item.enrollmentId : item.id;
                const member = memberMap.get(item.userId);
                const course = courses.find((c) => c.id === item.courseId);
                return (
                  <div
                    key={enrollmentId}
                    className={`rounded-lg border p-3 text-xs ${
                      themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <p className="font-semibold">{member?.name || 'Learner'} • {course?.title || 'Course'}</p>
                    <p className={`${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.riskLevel
                        ? `Risk: ${item.riskLevel.toUpperCase()} • Score: ${item.riskScore}`
                        : `Status: ${item.status.replace('_', ' ')} • Progress: ${item.progress}%`}
                    </p>
                    {item.reasons && item.reasons.length > 0 && (
                      <p className={`${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {item.reasons.slice(0, 2).join(' • ')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AdminSection>

        <AdminSection title="Learner Progress" isDarkMode={themeDark} minHeight="240px">
          {filteredEnrollments.length === 0 ? (
            <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No enrollments found.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredEnrollments.slice(0, 20).map((enrollment) => {
                const member = memberMap.get(enrollment.userId);
                const course = courses.find((c) => c.id === enrollment.courseId);
                return (
                  <div
                    key={enrollment.id}
                    className={`rounded-lg border p-3 flex items-center justify-between ${
                      themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{member?.name || 'Learner'}</p>
                      <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>{course?.title || 'Course'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{enrollment.progress}%</p>
                      <p className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>{enrollment.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminSection>
      </div>
    </div>
  );
};

export default GenieAnalytics;
