import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Users,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  Target,
  MessageSquare
} from 'lucide-react';
import { useGeniePipeline } from '../../../context/GeniePipelineContext';
import AdminSection from '../AdminSection';
import { useLMSStore } from '../../../store/lmsStore';
import type { UserRole } from '../../../types/lms';

interface GenieStageEvaluateProps {
  isDarkMode: boolean;
}

const GenieStageEvaluate: React.FC<GenieStageEvaluateProps> = ({ isDarkMode }) => {
  const { project, updateProject, markStageComplete, markStageInProgress, registerStageActions, autopilotEnabled, setAutopilotStatus } = useGeniePipeline();
  const { updateOrganization, currentOrg } = useLMSStore();

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    project?.evaluation?.metrics || ['completion', 'scores', 'time']
  );
  const [feedbackEnabled, setFeedbackEnabled] = useState(
    project?.evaluation?.feedbackEnabled ?? true
  );
  const [reportSchedule, setReportSchedule] = useState<'daily' | 'weekly' | 'monthly' | undefined>(
    project?.evaluation?.reportSchedule
  );
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    markStageInProgress('evaluate');
  }, [markStageInProgress]);

  useEffect(() => {
    updateProject({
      evaluation: {
        metrics: selectedMetrics,
        feedbackEnabled,
        reportSchedule
      }
    });

    if (selectedMetrics.length > 0) {
      markStageComplete('evaluate');
    }
  }, [selectedMetrics, feedbackEnabled, reportSchedule, updateProject, markStageComplete]);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  const handleGenerateReport = useCallback(async () => {
    setIsGeneratingReport(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGeneratingReport(false);
    alert('Report generated! In production, this would download a PDF or open a dashboard.');
  }, []);

  useEffect(() => {
    registerStageActions('evaluate', {
      runReport: handleGenerateReport,
      enableManagerDigest: async () => {
        if (!currentOrg) return;
        const digestRoles: UserRole[] = ['team_lead', 'ld_manager'];
        await updateOrganization({
          settings: {
            ...(currentOrg.settings || {}),
            notifications: {
              ...(currentOrg.settings?.notifications || {}),
              managerDigestEnabled: true,
              managerDigestFrequency: 'weekly',
              managerDigestRoles: digestRoles
            }
          }
        });
      }
    });
  }, [registerStageActions, handleGenerateReport, updateOrganization, currentOrg]);

  useEffect(() => {
    if (!autopilotEnabled) return;
    if (project?.stageApprovals.evaluate !== 'approved') {
      setAutopilotStatus('blocked');
      return;
    }
    if (selectedMetrics.length > 0 && !isGeneratingReport) {
      setAutopilotStatus('running');
      handleGenerateReport().finally(() => setAutopilotStatus('idle'));
    }
  }, [autopilotEnabled, selectedMetrics.length, project?.stageApprovals.evaluate, isGeneratingReport, setAutopilotStatus, handleGenerateReport]);

  const availableMetrics = [
    { id: 'completion', label: 'Completion Rate', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'scores', label: 'Assessment Scores', icon: <Target className="w-4 h-4" /> },
    { id: 'time', label: 'Time Spent', icon: <Clock className="w-4 h-4" /> },
    { id: 'engagement', label: 'Engagement Rate', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'feedback', label: 'Learner Feedback', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'certificates', label: 'Certifications', icon: <Award className="w-4 h-4" /> }
  ];

  // Sample analytics data (would come from backend in production)
  const analyticsData = {
    enrolled: 150,
    completed: 98,
    inProgress: 42,
    notStarted: 10,
    averageScore: 85,
    averageTime: 45,
    passRate: 92,
    feedbackScore: 4.2
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stage Header */}
      <div
        className={`rounded-2xl p-6 ${
          isDarkMode
            ? 'bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border border-cyan-500/20'
            : 'bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-600'
            }`}
          >
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Evaluate (ADDIE + Outcomes)
            </h2>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Track learning outcomes, measure effectiveness, and gather feedback for continuous
              improvement. Configure metrics and automated reporting.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isGeneratingReport
                    ? 'bg-cyan-500/50 text-white cursor-wait'
                    : 'bg-cyan-600 text-white hover:bg-cyan-700'
                }`}
              >
                {isGeneratingReport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating report...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`p-4 rounded-xl border ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className={`w-4 h-4 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Enrolled</span>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {analyticsData.enrolled}
          </p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>learners</p>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed</span>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {Math.round((analyticsData.completed / analyticsData.enrolled) * 100)}%
          </p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {analyticsData.completed} learners
          </p>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Score</span>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {analyticsData.averageScore}%
          </p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>pass rate: {analyticsData.passRate}%</p>
        </div>

        <div
          className={`p-4 rounded-xl border ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className={`w-4 h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Feedback</span>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {analyticsData.feedbackScore}/5
          </p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>satisfaction</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Breakdown */}
        <AdminSection title="Progress Breakdown" isDarkMode={isDarkMode} minHeight="250px">
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Overall Progress</span>
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {Math.round((analyticsData.completed / analyticsData.enrolled) * 100)}%
                </span>
              </div>
              <div className={`h-4 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div className="h-full flex">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(analyticsData.completed / analyticsData.enrolled) * 100}%` }}
                  />
                  <div
                    className="bg-amber-500"
                    style={{ width: `${(analyticsData.inProgress / analyticsData.enrolled) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              <div
                className={`p-3 rounded-lg text-center ${
                  isDarkMode ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'
                }`}
              >
                <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <p className={`text-lg font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                  {analyticsData.completed}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600'}`}>Completed</p>
              </div>
              <div
                className={`p-3 rounded-lg text-center ${
                  isDarkMode ? 'bg-amber-900/20 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
                }`}
              >
                <Clock className={`w-5 h-5 mx-auto mb-1 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                <p className={`text-lg font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                  {analyticsData.inProgress}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-amber-400/70' : 'text-amber-600'}`}>In Progress</p>
              </div>
              <div
                className={`p-3 rounded-lg text-center ${
                  isDarkMode ? 'bg-red-900/20 border border-red-500/30' : 'bg-red-50 border border-red-200'
                }`}
              >
                <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                <p className={`text-lg font-bold ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                  {analyticsData.notStarted}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-red-400/70' : 'text-red-600'}`}>Not Started</p>
              </div>
            </div>

            {/* Time Stats */}
            <div
              className={`p-3 rounded-lg flex items-center justify-between ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Average Time to Complete
                </span>
              </div>
              <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {analyticsData.averageTime} minutes
              </span>
            </div>
          </div>
        </AdminSection>

        {project?.design?.adultLearningChecklist && (
          <AdminSection
            title="Adult Learning Alignment"
            subtitle="Checklist from the Design phase."
            isDarkMode={isDarkMode}
            minHeight="140px"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {[
                { label: 'Practical Relevance', value: project.design.adultLearningChecklist.practicalRelevance },
                { label: 'Self-Directed Pathways', value: project.design.adultLearningChecklist.selfDirected },
                { label: 'Experiential / Reflective', value: project.design.adultLearningChecklist.reflectiveActivities }
              ].map((item) => (
                <div key={item.label} className={`rounded-lg border px-3 py-2 ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.value ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className={`w-4 h-4 ${isDarkMode ? 'text-amber-400' : 'text-amber-500'}`} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AdminSection>
        )}

        {/* Metrics Configuration */}
        <AdminSection title="Tracking Metrics" subtitle="Select metrics to monitor" isDarkMode={isDarkMode} minHeight="250px">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {availableMetrics.map((metric) => (
                <button
                  key={metric.id}
                  onClick={() => toggleMetric(metric.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
                    selectedMetrics.includes(metric.id)
                      ? isDarkMode
                        ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                        : 'bg-cyan-50 border border-cyan-300 text-cyan-700'
                      : isDarkMode
                        ? 'bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700'
                        : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {metric.icon}
                  <span className="text-sm font-medium">{metric.label}</span>
                </button>
              ))}
            </div>

            {/* Feedback Toggle */}
            <div
              className={`p-4 rounded-xl border ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className={`w-5 h-5 ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <div>
                    <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Collect Feedback
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Survey learners after completion
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFeedbackEnabled(!feedbackEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    feedbackEnabled
                      ? 'bg-cyan-500'
                      : isDarkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      feedbackEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </AdminSection>
      </div>

      {/* Automated Reports */}
      <AdminSection title="Automated Reports" subtitle="Schedule regular reports" isDarkMode={isDarkMode} minHeight="150px">
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'daily' as const, label: 'Daily', desc: 'Every morning at 8 AM' },
            { id: 'weekly' as const, label: 'Weekly', desc: 'Every Monday' },
            { id: 'monthly' as const, label: 'Monthly', desc: 'First of each month' }
          ].map((schedule) => (
            <button
              key={schedule.id}
              onClick={() => setReportSchedule(reportSchedule === schedule.id ? undefined : schedule.id)}
              className={`flex-1 min-w-[150px] p-4 rounded-xl border text-left transition-colors ${
                reportSchedule === schedule.id
                  ? isDarkMode
                    ? 'bg-cyan-500/20 border-cyan-500/50'
                    : 'bg-cyan-50 border-cyan-300'
                  : isDarkMode
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calendar className={`w-4 h-4 ${
                  reportSchedule === schedule.id
                    ? isDarkMode ? 'text-cyan-400' : 'text-cyan-600'
                    : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {schedule.label}
                </span>
              </div>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {schedule.desc}
              </p>
            </button>
          ))}
        </div>
      </AdminSection>

      {/* Improvement Suggestions */}
      <div
        className={`rounded-xl p-4 border ${
          isDarkMode ? 'border-amber-500/30 bg-amber-900/20' : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
          <div>
            <p className={`text-sm font-medium ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>
              AI Improvement Suggestions
            </p>
            <ul className={`text-xs mt-2 space-y-1 ${isDarkMode ? 'text-amber-400/80' : 'text-amber-700'}`}>
              <li>• Module 2 has lower completion rates - consider breaking into smaller lessons</li>
              <li>• Quiz question 3 has high failure rate - review difficulty level</li>
              <li>• Learners spend less time on video content - add interactive elements</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stage Summary */}
      <div
        className={`rounded-xl border p-4 ${
          isDarkMode ? 'border-emerald-500/30 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
        }`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
            Pipeline Complete! Your course is live and being tracked.
          </span>
        </div>
        <p className={`text-xs mt-1 ml-7 ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600'}`}>
          Continue monitoring progress and use insights to improve future iterations
        </p>
      </div>
    </div>
  );
};

export default GenieStageEvaluate;
