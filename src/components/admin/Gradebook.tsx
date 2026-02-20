import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Clock,
  User,
  BookOpen,
  Edit3,
} from 'lucide-react';
import { Course, Enrollment, OrgMember, ModuleProgress } from '../../types/lms';

interface GradebookProps {
  course: Course;
  enrollments: Enrollment[];
  members: OrgMember[];
  onGradeSubmission: (enrollmentId: string, moduleId: string, score: number, feedback?: string) => Promise<void>;
  onExport: () => void;
  isDarkMode?: boolean;
}

interface SubmissionData {
  enrollmentId: string;
  learner: OrgMember;
  enrollment: Enrollment;
  moduleProgress: ModuleProgress[];
}

type FilterStatus = 'all' | 'needs_grading' | 'graded' | 'not_started';

export function Gradebook({
  course,
  enrollments,
  members,
  onGradeSubmission,
  onExport,
  isDarkMode = false
}: GradebookProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedLearner, setExpandedLearner] = useState<string | null>(null);
  const [gradingItem, setGradingItem] = useState<{
    enrollmentId: string;
    moduleId: string;
    currentScore?: number;
  } | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Process data
  const submissions: SubmissionData[] = useMemo(() => {
    return enrollments.map(enrollment => {
      const learner = members.find(m => m.id === enrollment.userId);
      const moduleProgress = Object.values(enrollment.moduleProgress || {});
      return {
        enrollmentId: enrollment.id,
        learner: learner || {
          id: enrollment.userId,
          odId: '',
          email: 'unknown@email.com',
          name: 'Unknown Learner',
          role: 'learner' as const,
          status: 'active' as const
        },
        enrollment,
        moduleProgress
      };
    });
  }, [enrollments, members]);

  // Filter and search
  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!sub.learner.name.toLowerCase().includes(query) &&
            !sub.learner.email.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== 'all') {
        const hasUngraded = sub.moduleProgress.some(mp =>
          mp.status === 'completed' && mp.quizScore === undefined
        );
        const allGraded = sub.moduleProgress.every(mp =>
          mp.status !== 'completed' || mp.quizScore !== undefined
        );
        const notStarted = sub.enrollment.status === 'not_started';

        switch (filterStatus) {
          case 'needs_grading':
            if (!hasUngraded) return false;
            break;
          case 'graded':
            if (!allGraded || notStarted) return false;
            break;
          case 'not_started':
            if (!notStarted) return false;
            break;
        }
      }

      return true;
    });
  }, [submissions, searchQuery, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = enrollments.length;
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const inProgress = enrollments.filter(e => e.status === 'in_progress').length;
    const avgScore = enrollments
      .filter(e => e.score !== undefined)
      .reduce((sum, e, _, arr) => sum + (e.score || 0) / arr.length, 0);
    const needsGrading = submissions.filter(sub =>
      sub.moduleProgress.some(mp => mp.status === 'completed' && mp.quizScore === undefined)
    ).length;

    return { total, completed, inProgress, avgScore, needsGrading };
  }, [enrollments, submissions]);

  const handleGrade = async () => {
    if (!gradingItem || !gradeInput) return;

    const score = Number(gradeInput);
    if (isNaN(score) || score < 0 || score > 100) return;

    setSaving(true);
    try {
      await onGradeSubmission(
        gradingItem.enrollmentId,
        gradingItem.moduleId,
        score,
        feedbackInput || undefined
      );
      setGradingItem(null);
      setGradeInput('');
      setFeedbackInput('');
    } catch (error) {
      console.error('Failed to save grade:', error);
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 90) return isDarkMode ? 'bg-green-900/30' : 'bg-green-50';
    if (score >= 70) return isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50';
    if (score >= 50) return isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50';
    return isDarkMode ? 'bg-red-900/30' : 'bg-red-50';
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Gradebook</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {course.title}
            </p>
          </div>
          <button
            onClick={onExport}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <Download size={18} />
            Export Grades
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Enrolled</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completed</p>
            <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>In Progress</p>
            <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg Score</p>
            <p className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
              {stats.avgScore ? `${Math.round(stats.avgScore)}%` : '-'}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${
            stats.needsGrading > 0
              ? (isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50')
              : (isDarkMode ? 'bg-gray-800' : 'bg-gray-50')
          }`}>
            <p className={`text-sm ${
              stats.needsGrading > 0
                ? (isDarkMode ? 'text-orange-400' : 'text-orange-600')
                : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
            }`}>
              Needs Grading
            </p>
            <p className={`text-2xl font-bold ${
              stats.needsGrading > 0 ? 'text-orange-500' : ''
            }`}>
              {stats.needsGrading}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex items-center gap-4 p-4 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex-1 relative">
          <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            placeholder="Search learners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
            } focus:ring-2 focus:ring-indigo-500 outline-none`}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
          } focus:ring-2 focus:ring-indigo-500 outline-none`}
        >
          <option value="all">All Learners</option>
          <option value="needs_grading">Needs Grading</option>
          <option value="graded">Graded</option>
          <option value="not_started">Not Started</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredSubmissions.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <User size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No learners found</p>
            <p className="text-sm">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'No learners are enrolled in this course'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Module Headers */}
            <div className={`hidden lg:flex items-center gap-4 p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <div className="w-64 font-medium">Learner</div>
              <div className="flex-1 grid gap-2" style={{
                gridTemplateColumns: `repeat(${course.modules.length}, 1fr)`
              }}>
                {course.modules.map(module => (
                  <div key={module.id} className="text-center text-sm truncate" title={module.title}>
                    {module.title}
                  </div>
                ))}
              </div>
              <div className="w-24 text-center font-medium">Overall</div>
            </div>

            {/* Learner Rows */}
            {filteredSubmissions.map(sub => {
              const isExpanded = expandedLearner === sub.enrollmentId;

              return (
                <div
                  key={sub.enrollmentId}
                  className={`rounded-xl border ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Learner Header */}
                  <div
                    className={`flex items-center gap-4 p-4 cursor-pointer ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setExpandedLearner(isExpanded ? null : sub.enrollmentId)}
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}

                    <div className="w-56 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <User size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{sub.learner.name}</p>
                        <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {sub.learner.email}
                        </p>
                      </div>
                    </div>

                    {/* Module Scores (Desktop) */}
                    <div className="hidden lg:flex flex-1 gap-2" style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${course.modules.length}, 1fr)`
                    }}>
                      {course.modules.map(module => {
                        const progress = sub.enrollment.moduleProgress?.[module.id];
                        const score = progress?.quizScore;
                        const status = progress?.status || 'not_started';

                        return (
                          <div key={module.id} className="flex justify-center">
                            {status === 'not_started' ? (
                              <span className={`px-3 py-1 rounded text-sm ${
                                isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                              }`}>
                                -
                              </span>
                            ) : score !== undefined ? (
                              <span className={`px-3 py-1 rounded text-sm font-medium ${getScoreBg(score)} ${getScoreColor(score)}`}>
                                {score}%
                              </span>
                            ) : status === 'completed' ? (
                              <span className={`px-3 py-1 rounded text-sm ${
                                isDarkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700'
                              }`}>
                                Grade
                              </span>
                            ) : (
                              <span className={`px-3 py-1 rounded text-sm ${
                                isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                              }`}>
                                <Clock size={14} />
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Overall Score */}
                    <div className="w-24 flex justify-center">
                      {sub.enrollment.score !== undefined ? (
                        <span className={`px-4 py-1.5 rounded-lg font-bold ${getScoreBg(sub.enrollment.score)} ${getScoreColor(sub.enrollment.score)}`}>
                          {sub.enrollment.score}%
                        </span>
                      ) : (
                        <span className={`px-4 py-1.5 rounded-lg ${
                          isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                        }`}>
                          -
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="p-4">
                        {/* Progress Info */}
                        <div className="flex items-center gap-6 mb-4">
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Progress: <span className="font-medium">{sub.enrollment.progress}%</span>
                          </div>
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Status: <span className={`font-medium capitalize ${
                              sub.enrollment.status === 'completed' ? 'text-green-500' :
                              sub.enrollment.status === 'in_progress' ? 'text-blue-500' :
                              sub.enrollment.status === 'overdue' ? 'text-red-500' : ''
                            }`}>
                              {sub.enrollment.status.replace('_', ' ')}
                            </span>
                          </div>
                          {sub.enrollment.startedAt && (
                            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Started: {new Date(sub.enrollment.startedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Module Details */}
                        <div className="space-y-3">
                          {course.modules.map(module => {
                            const progress = sub.enrollment.moduleProgress?.[module.id];
                            const isGrading = gradingItem?.enrollmentId === sub.enrollmentId &&
                                              gradingItem?.moduleId === module.id;

                            return (
                              <div
                                key={module.id}
                                className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <BookOpen size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                                    <div>
                                      <p className="font-medium">{module.title}</p>
                                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {progress?.completedLessons?.length || 0} / {module.lessons.length} lessons
                                        {progress?.quizAttempts ? ` • ${progress.quizAttempts} quiz attempts` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    {/* Status/Score */}
                                    {!progress || progress.status === 'not_started' ? (
                                      <span className={`px-3 py-1 rounded text-sm ${
                                        isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'
                                      }`}>
                                        Not Started
                                      </span>
                                    ) : progress.quizScore !== undefined ? (
                                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                                        getScoreBg(progress.quizScore)} ${getScoreColor(progress.quizScore)
                                      }`}>
                                        Score: {progress.quizScore}%
                                      </span>
                                    ) : progress.status === 'completed' ? (
                                      isGrading ? (
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={gradeInput}
                                            onChange={(e) => setGradeInput(e.target.value)}
                                            placeholder="Score"
                                            className={`w-20 px-2 py-1 rounded border ${
                                              isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'
                                            } outline-none`}
                                            autoFocus
                                          />
                                          <button
                                            onClick={handleGrade}
                                            disabled={saving || !gradeInput}
                                            className="p-1 text-green-500 hover:bg-green-50 rounded"
                                          >
                                            <Check size={18} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              setGradingItem(null);
                                              setGradeInput('');
                                            }}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                          >
                                            <X size={18} />
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setGradingItem({
                                              enrollmentId: sub.enrollmentId,
                                              moduleId: module.id
                                            });
                                            setGradeInput('');
                                          }}
                                          className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                                            isDarkMode
                                              ? 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50'
                                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                          }`}
                                        >
                                          <Edit3 size={14} />
                                          Grade
                                        </button>
                                      )
                                    ) : (
                                      <span className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                                        isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                      }`}>
                                        <Clock size={14} />
                                        In Progress
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Feedback input when grading */}
                                {isGrading && (
                                  <div className="mt-3">
                                    <input
                                      type="text"
                                      value={feedbackInput}
                                      onChange={(e) => setFeedbackInput(e.target.value)}
                                      placeholder="Optional feedback for the learner..."
                                      className={`w-full px-3 py-2 rounded-lg border ${
                                        isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'
                                      } outline-none`}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Gradebook;
