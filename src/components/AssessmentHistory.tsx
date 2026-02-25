import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Clock,
  BarChart3,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2
} from 'lucide-react';
import { useStore } from '../store';
import * as clientPersistenceService from '../lib/clientPersistenceService';

interface AssessmentQuestion {
  id: string;
  question?: string;
  correctAnswer?: string;
  alternativeAnswers?: string[];
}

interface AssessmentResult {
  id: string;
  title: string;
  score: number;
  percentage: number;
  totalQuestions: number;
  completedAt: number;
  questions: AssessmentQuestion[];
  userAnswers: Record<string, string>;
}

const AssessmentHistory: React.FC = () => {
  const { user } = useStore();
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentResult | null>(null);

  const isDarkMode = user?.settings?.theme === 'dark';

  const loadAssessments = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const results = await clientPersistenceService.getAssessments(user.id) as AssessmentResult[];
      // Sort by completion date (newest first)
      const sorted = [...results].sort((a, b) => b.completedAt - a.completedAt);
      setAssessments(sorted);
    } catch (error) {
      console.error('Error loading assessments:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const handleDelete = async (assessmentId: string) => {
    if (!user || !confirm('Are you sure you want to delete this assessment?')) return;

    try {
      await clientPersistenceService.deleteAssessment(user.id, assessmentId);
      setAssessments(prev => prev.filter(a => a.id !== assessmentId));
      if (selectedAssessment?.id === assessmentId) {
        setSelectedAssessment(null);
      }
    } catch (error) {
      console.error('Error deleting assessment:', error);
    }
  };

  const calculateStats = () => {
    if (assessments.length === 0) {
      return {
        averageScore: 0,
        totalCompleted: 0,
        highestScore: 0,
        lowestScore: 0,
        trend: 0
      };
    }

    const percentages = assessments.map(a => a.percentage);
    const averageScore = Math.round(
      percentages.reduce((sum, p) => sum + p, 0) / percentages.length
    );

    // Calculate trend (last 3 vs previous 3)
    let trend = 0;
    if (assessments.length >= 6) {
      const recent = percentages.slice(0, 3).reduce((sum, p) => sum + p, 0) / 3;
      const older = percentages.slice(3, 6).reduce((sum, p) => sum + p, 0) / 3;
      trend = recent - older;
    }

    return {
      averageScore,
      totalCompleted: assessments.length,
      highestScore: Math.max(...percentages),
      lowestScore: Math.min(...percentages),
      trend
    };
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (selectedAssessment) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedAssessment(null)}
          className={`text-sm ${
            isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
          }`}
        >
          ← Back to History
        </button>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {selectedAssessment.title}
          </h3>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Completed: {formatDate(selectedAssessment.completedAt)}
          </p>

          <div className={`mb-4 p-3 rounded-lg ${
            selectedAssessment.percentage >= 70
              ? 'bg-green-100 dark:bg-green-900/30'
              : selectedAssessment.percentage >= 40
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${
                selectedAssessment.percentage >= 70
                  ? 'text-green-700 dark:text-green-400'
                  : selectedAssessment.percentage >= 40
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-red-700 dark:text-red-400'
              }`}>
                {selectedAssessment.percentage}%
              </span>
              <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                {selectedAssessment.score} / {selectedAssessment.totalQuestions}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {selectedAssessment.questions.map((question, index) => {
              const userAnswer = selectedAssessment.userAnswers[question.id];
              const isCorrect = userAnswer === question.correctAnswer ||
                (question.alternativeAnswers || []).includes(userAnswer);

              return (
                <div
                  key={question.id}
                  className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                >
                  <div className="flex items-start space-x-2">
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {index + 1}. {question.question}
                      </p>
                      {userAnswer && (
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Your answer: {userAnswer}
                        </p>
                      )}
                      {!isCorrect && question.correctAnswer && (
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          Correct answer: {question.correctAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center space-x-2 mb-1">
            <BarChart3 className={`h-4 w-4 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Average
            </span>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.averageScore}%
          </p>
        </div>

        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center space-x-2 mb-1">
            <Trophy className={`h-4 w-4 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Best
            </span>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.highestScore}%
          </p>
        </div>

        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center space-x-2 mb-1">
            <Clock className={`h-4 w-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total
            </span>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.totalCompleted}
          </p>
        </div>

        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="flex items-center space-x-2 mb-1">
            {stats.trend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Trend
            </span>
          </div>
          <p className={`text-2xl font-bold ${
            stats.trend >= 0
              ? 'text-green-500'
              : 'text-red-500'
          }`}>
            {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Assessment List */}
      {assessments.length === 0 ? (
        <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>No assessments completed yet.</p>
          <p className="text-sm mt-2">Complete an assessment to see your history here!</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
            Recent Assessments
          </h3>
          {assessments.map((assessment) => (
            <div
              key={assessment.id}
              className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} transition-colors`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {assessment.title}
                </span>
                <span className={`text-lg font-bold ${
                  assessment.percentage >= 70
                    ? 'text-green-500'
                    : assessment.percentage >= 40
                      ? 'text-amber-500'
                      : 'text-red-500'
                }`}>
                  {assessment.percentage}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formatDate(assessment.completedAt)}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedAssessment(assessment)}
                    className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-500' : 'hover:bg-gray-200'}`}
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(assessment.id)}
                    className={`p-1 rounded ${isDarkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-100'} text-red-500`}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssessmentHistory;
