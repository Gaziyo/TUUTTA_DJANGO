import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Award,
  RefreshCw,
  Eye,
  Flag,
  List
} from 'lucide-react';
import { QuizQuestion, ModuleQuiz } from '../../types/lms';

interface QuizPlayerProps {
  quiz: ModuleQuiz;
  previousAttempts: number;
  previousBestScore?: number;
  onComplete: (score: number, passed: boolean, answers: Record<string, string | string[]>, results?: Record<string, boolean>) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
  onStart?: () => void;
}

interface QuizState {
  status: 'intro' | 'in_progress' | 'review' | 'completed';
  currentQuestionIndex: number;
  answers: Record<string, string | string[]>;
  flaggedQuestions: Set<string>;
  timeRemaining: number | null;
  startedAt: number | null;
  completedAt: number | null;
  score: number | null;
  passed: boolean | null;
}

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function QuizPlayer({
  quiz,
  previousAttempts,
  previousBestScore,
  onComplete,
  onCancel,
  isDarkMode = false,
  onStart
}: QuizPlayerProps) {
  // Shuffle questions if configured
  const questions = useMemo(() => {
    return quiz.shuffleQuestions ? shuffleArray(quiz.questions) : quiz.questions;
  }, [quiz.questions, quiz.shuffleQuestions]);

  const [state, setState] = useState<QuizState>({
    status: 'intro',
    currentQuestionIndex: 0,
    answers: {},
    flaggedQuestions: new Set(),
    timeRemaining: quiz.timeLimit ? quiz.timeLimit * 60 : null,
    startedAt: null,
    completedAt: null,
    score: null,
    passed: null
  });

  const [showQuestionNav, setShowQuestionNav] = useState(false);

  const currentQuestion = questions[state.currentQuestionIndex];
  const canAttempt = quiz.maxAttempts === 0 || previousAttempts < quiz.maxAttempts;
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  // Timer effect
  useEffect(() => {
    if (state.status !== 'in_progress' || state.timeRemaining === null) return;

    const timer = setInterval(() => {
      setState(prev => {
        if (prev.timeRemaining === null || prev.timeRemaining <= 0) {
          clearInterval(timer);
          return prev;
        }
        const newTime = prev.timeRemaining - 1;
        if (newTime <= 0) {
          // Auto-submit when time runs out
          return { ...prev, timeRemaining: 0 };
        }
        return { ...prev, timeRemaining: newTime };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.status, state.timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startQuiz = () => {
    setState(prev => ({
      ...prev,
      status: 'in_progress',
      startedAt: Date.now()
    }));
    onStart?.();
  };

  const handleAnswer = (questionId: string, answer: string | string[]) => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer }
    }));
  };

  const toggleFlag = (questionId: string) => {
    setState(prev => {
      const newFlagged = new Set(prev.flaggedQuestions);
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId);
      } else {
        newFlagged.add(questionId);
      }
      return { ...prev, flaggedQuestions: newFlagged };
    });
  };

  const goToQuestion = (index: number) => {
    setState(prev => ({ ...prev, currentQuestionIndex: index }));
    setShowQuestionNav(false);
  };

  const calculateScore = useCallback((): { score: number; earnedPoints: number; results: Record<string, boolean> } => {
    let earnedPoints = 0;
    const results: Record<string, boolean> = {};

    questions.forEach(question => {
      const userAnswer = state.answers[question.id];
      let isCorrect = false;

      if (userAnswer !== undefined) {
        if (Array.isArray(question.correctAnswer)) {
          // Multiple correct answers (matching, multiple select)
          if (Array.isArray(userAnswer)) {
            isCorrect =
              userAnswer.length === question.correctAnswer.length &&
              userAnswer.every(a => question.correctAnswer.includes(a));
          }
        } else {
          // Single answer
          const normalizedUser = String(userAnswer).toLowerCase().trim();
          const normalizedCorrect = String(question.correctAnswer).toLowerCase().trim();
          isCorrect = normalizedUser === normalizedCorrect;
        }
      }

      results[question.id] = isCorrect;
      if (isCorrect) {
        earnedPoints += question.points;
      }
    });

    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    return { score, earnedPoints, results };
  }, [questions, state.answers, totalPoints]);

  const handleSubmit = useCallback(() => {
    const { score, results } = calculateScore();
    const passed = score >= quiz.passingScore;

    setState(prev => ({
      ...prev,
      status: 'completed',
      completedAt: Date.now(),
      score,
      passed
    }));

    onComplete(score, passed, state.answers, results);
  }, [calculateScore, onComplete, quiz.passingScore, state.answers]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (state.status === 'in_progress' && state.timeRemaining === 0) {
      handleSubmit();
    }
  }, [state.status, state.timeRemaining, handleSubmit]);

  const handleReview = () => {
    setState(prev => ({ ...prev, status: 'review', currentQuestionIndex: 0 }));
  };

  const answeredCount = Object.keys(state.answers).length;
  const progressPercent = (answeredCount / questions.length) * 100;

  // Intro screen
  if (state.status === 'intro') {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-8 ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className={`max-w-md w-full p-8 rounded-xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white shadow-lg'
        }`}>
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isDarkMode ? 'bg-indigo-900' : 'bg-indigo-100'
            }`}>
              <Play className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">{quiz.title}</h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Complete this quiz to test your knowledge
            </p>
          </div>

          <div className={`space-y-3 mb-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Questions</span>
              <span className="font-medium">{questions.length}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total Points</span>
              <span className="font-medium">{totalPoints}</span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Passing Score</span>
              <span className="font-medium">{quiz.passingScore}%</span>
            </div>
            {quiz.timeLimit && (
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Time Limit</span>
                <span className="font-medium">{quiz.timeLimit} minutes</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Attempts</span>
              <span className="font-medium">
                {previousAttempts} / {quiz.maxAttempts === 0 ? 'Unlimited' : quiz.maxAttempts}
              </span>
            </div>
            {previousBestScore !== undefined && (
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Best Score</span>
                <span className="font-medium text-green-500">{previousBestScore}%</span>
              </div>
            )}
          </div>

          {!canAttempt ? (
            <div className={`p-4 rounded-lg mb-4 ${
              isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <span>You have used all available attempts for this quiz.</span>
              </div>
            </div>
          ) : (
            <button
              onClick={startQuiz}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <Play size={20} />
              Start Quiz
            </button>
          )}

          <button
            onClick={onCancel}
            className={`w-full mt-3 py-3 px-4 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Completed screen
  if (state.status === 'completed') {
    const { results } = calculateScore();
    const correctCount = Object.values(results).filter(r => r).length;

    return (
      <div className={`h-full flex flex-col items-center justify-center p-8 ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className={`max-w-md w-full p-8 rounded-xl ${
          isDarkMode ? 'bg-gray-800' : 'bg-white shadow-lg'
        }`}>
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              state.passed
                ? (isDarkMode ? 'bg-green-900' : 'bg-green-100')
                : (isDarkMode ? 'bg-red-900' : 'bg-red-100')
            }`}>
              {state.passed ? (
                <Award className={isDarkMode ? 'text-green-400' : 'text-green-600'} size={40} />
              ) : (
                <XCircle className={isDarkMode ? 'text-red-400' : 'text-red-600'} size={40} />
              )}
            </div>

            <h2 className="text-2xl font-bold mb-2">
              {state.passed ? 'Congratulations!' : 'Quiz Completed'}
            </h2>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {state.passed
                ? 'You have passed this quiz!'
                : `You need ${quiz.passingScore}% to pass. Keep trying!`}
            </p>

            <div className={`text-5xl font-bold mb-2 ${
              state.passed ? 'text-green-500' : 'text-red-500'
            }`}>
              {state.score}%
            </div>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {correctCount} of {questions.length} questions correct
            </p>
          </div>

          <div className={`space-y-3 mb-6 p-4 rounded-lg ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Status</span>
              <span className={`font-medium ${state.passed ? 'text-green-500' : 'text-red-500'}`}>
                {state.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Correct Answers</span>
              <span className="font-medium">{correctCount} / {questions.length}</span>
            </div>
            {state.startedAt && state.completedAt && (
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Time Taken</span>
                <span className="font-medium">
                  {formatTime(Math.floor((state.completedAt - state.startedAt) / 1000))}
                </span>
              </div>
            )}
          </div>

          {quiz.showCorrectAnswers && (
            <button
              onClick={handleReview}
              className={`w-full py-3 px-4 rounded-lg font-medium mb-3 transition-colors flex items-center justify-center gap-2 ${
                isDarkMode
                  ? 'bg-gray-700 text-white hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              <Eye size={20} />
              Review Answers
            </button>
          )}

          {!state.passed && canAttempt && (
            <button
              onClick={() => {
                setState({
                  status: 'intro',
                  currentQuestionIndex: 0,
                  answers: {},
                  flaggedQuestions: new Set(),
                  timeRemaining: quiz.timeLimit ? quiz.timeLimit * 60 : null,
                  startedAt: null,
                  completedAt: null,
                  score: null,
                  passed: null
                });
              }}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} />
              Try Again
            </button>
          )}

          <button
            onClick={onCancel}
            className={`w-full mt-3 py-3 px-4 rounded-lg font-medium transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Review mode
  if (state.status === 'review') {
    const { results } = calculateScore();
    const question = questions[state.currentQuestionIndex];
    const isCorrect = results[question.id];
    const userAnswer = state.answers[question.id];

    return (
      <div className={`h-full flex flex-col ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <h3 className="font-semibold">Review: {quiz.title}</h3>
          <button
            onClick={() => setState(prev => ({ ...prev, status: 'completed' }))}
            className={`px-4 py-2 rounded-lg text-sm ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Back to Results
          </button>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isCorrect
                  ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')
                  : (isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700')
              }`}>
                {isCorrect ? 'Correct' : 'Incorrect'}
              </span>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Question {state.currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>

            <h4 className="text-xl font-medium mb-6">{question.question}</h4>

            <QuestionRenderer
              question={question}
              answer={userAnswer}
              onChange={() => {}}
              disabled
              showCorrect
              isDarkMode={isDarkMode}
            />

            {question.explanation && (
              <div className={`mt-6 p-4 rounded-lg ${
                isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
              }`}>
                <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                  Explanation
                </h5>
                <p className={isDarkMode ? 'text-blue-200' : 'text-blue-800'}>
                  {question.explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className={`flex items-center justify-between p-4 border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <button
            onClick={() => goToQuestion(state.currentQuestionIndex - 1)}
            disabled={state.currentQuestionIndex === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              state.currentQuestionIndex === 0
                ? (isDarkMode ? 'text-gray-600' : 'text-gray-400')
                : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
            }`}
          >
            <ChevronLeft size={20} />
            Previous
          </button>
          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {state.currentQuestionIndex + 1} / {questions.length}
          </span>
          <button
            onClick={() => goToQuestion(state.currentQuestionIndex + 1)}
            disabled={state.currentQuestionIndex === questions.length - 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              state.currentQuestionIndex === questions.length - 1
                ? (isDarkMode ? 'text-gray-600' : 'text-gray-400')
                : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
            }`}
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // In Progress
  return (
    <div className={`h-full flex flex-col ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">{quiz.title}</h3>
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Question {state.currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {state.timeRemaining !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              state.timeRemaining < 60
                ? (isDarkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700')
                : state.timeRemaining < 300
                  ? (isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                  : (isDarkMode ? 'bg-gray-700' : 'bg-gray-100')
            }`}>
              <Clock size={18} />
              <span className="font-mono font-medium">{formatTime(state.timeRemaining)}</span>
            </div>
          )}

          <button
            onClick={() => setShowQuestionNav(!showQuestionNav)}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            title="Question Navigator"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question Navigator Sidebar */}
      {showQuestionNav && (
        <div className={`absolute right-0 top-16 bottom-0 w-64 z-10 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        } shadow-lg border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="p-4">
            <h4 className="font-medium mb-4">Questions</h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = state.answers[q.id] !== undefined;
                const isFlagged = state.flaggedQuestions.has(q.id);
                const isCurrent = idx === state.currentQuestionIndex;

                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium relative ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : isAnswered
                          ? (isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700')
                          : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <Flag
                        size={10}
                        className="absolute -top-1 -right-1 text-orange-500"
                        fill="currentColor"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${isDarkMode ? 'bg-green-900' : 'bg-green-100'}`} />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-orange-500" fill="currentColor" />
                <span>Flagged for review</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-sm ${
              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}>
              {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => toggleFlag(currentQuestion.id)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
                state.flaggedQuestions.has(currentQuestion.id)
                  ? (isDarkMode ? 'bg-orange-900 text-orange-300' : 'bg-orange-100 text-orange-700')
                  : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
              }`}
            >
              <Flag
                size={16}
                fill={state.flaggedQuestions.has(currentQuestion.id) ? 'currentColor' : 'none'}
              />
              {state.flaggedQuestions.has(currentQuestion.id) ? 'Flagged' : 'Flag for review'}
            </button>
          </div>

          <h4 className="text-xl font-medium mb-6">{currentQuestion.question}</h4>

          <QuestionRenderer
            question={currentQuestion}
            answer={state.answers[currentQuestion.id]}
            onChange={(answer) => handleAnswer(currentQuestion.id, answer)}
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {/* Footer Navigation */}
      <div className={`flex items-center justify-between p-4 border-t ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <button
          onClick={() => goToQuestion(state.currentQuestionIndex - 1)}
          disabled={state.currentQuestionIndex === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            state.currentQuestionIndex === 0
              ? (isDarkMode ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed')
              : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
          }`}
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        <div className="flex items-center gap-4">
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {answeredCount} of {questions.length} answered
          </span>

          {state.currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <CheckCircle size={20} />
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={() => goToQuestion(state.currentQuestionIndex + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Next
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Question Type Renderers
interface QuestionRendererProps {
  question: QuizQuestion;
  answer: string | string[] | undefined;
  onChange: (answer: string | string[]) => void;
  disabled?: boolean;
  showCorrect?: boolean;
  isDarkMode?: boolean;
}

function QuestionRenderer({
  question,
  answer,
  onChange,
  disabled = false,
  showCorrect = false,
  isDarkMode = false
}: QuestionRendererProps) {
  switch (question.type) {
    case 'multiple_choice':
      return (
        <MultipleChoiceQuestion
          question={question}
          answer={answer as string}
          onChange={onChange}
          disabled={disabled}
          showCorrect={showCorrect}
          isDarkMode={isDarkMode}
        />
      );

    case 'true_false':
      return (
        <TrueFalseQuestion
          question={question}
          answer={answer as string}
          onChange={onChange}
          disabled={disabled}
          showCorrect={showCorrect}
          isDarkMode={isDarkMode}
        />
      );

    case 'fill_blank':
      return (
        <FillBlankQuestion
          question={question}
          answer={answer as string}
          onChange={onChange}
          disabled={disabled}
          showCorrect={showCorrect}
          isDarkMode={isDarkMode}
        />
      );

    case 'matching':
      return (
        <MatchingQuestion
          question={question}
          answer={answer as string[]}
          onChange={onChange}
          disabled={disabled}
          showCorrect={showCorrect}
          isDarkMode={isDarkMode}
        />
      );

    case 'short_answer':
      return (
        <ShortAnswerQuestion
          question={question}
          answer={answer as string}
          onChange={onChange}
          disabled={disabled}
          showCorrect={showCorrect}
          isDarkMode={isDarkMode}
        />
      );

    default:
      return <div>Unsupported question type</div>;
  }
}

function MultipleChoiceQuestion({
  question,
  answer,
  onChange,
  disabled,
  showCorrect,
  isDarkMode
}: {
  question: QuizQuestion;
  answer: string | undefined;
  onChange: (answer: string) => void;
  disabled: boolean;
  showCorrect: boolean;
  isDarkMode: boolean;
}) {
  return (
    <div className="space-y-3">
      {question.options?.map((option, idx) => {
        const isSelected = answer === option;
        const isCorrect = question.correctAnswer === option;

        let bgClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
        if (isSelected && !showCorrect) {
          bgClass = isDarkMode ? 'bg-indigo-900 border-indigo-600' : 'bg-indigo-50 border-indigo-500';
        }
        if (showCorrect && isCorrect) {
          bgClass = isDarkMode ? 'bg-green-900 border-green-600' : 'bg-green-50 border-green-500';
        }
        if (showCorrect && isSelected && !isCorrect) {
          bgClass = isDarkMode ? 'bg-red-900 border-red-600' : 'bg-red-50 border-red-500';
        }

        return (
          <button
            key={idx}
            onClick={() => !disabled && onChange(option)}
            disabled={disabled}
            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${bgClass} ${
              !disabled ? 'hover:border-indigo-400 cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500'
                  : (isDarkMode ? 'border-gray-600' : 'border-gray-300')
              }`}>
                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className="flex-1">{option}</span>
              {showCorrect && isCorrect && (
                <CheckCircle className="text-green-500" size={20} />
              )}
              {showCorrect && isSelected && !isCorrect && (
                <XCircle className="text-red-500" size={20} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseQuestion({
  question,
  answer,
  onChange,
  disabled,
  showCorrect,
  isDarkMode
}: {
  question: QuizQuestion;
  answer: string | undefined;
  onChange: (answer: string) => void;
  disabled: boolean;
  showCorrect: boolean;
  isDarkMode: boolean;
}) {
  const options = ['True', 'False'];

  return (
    <div className="flex gap-4">
      {options.map((option) => {
        const isSelected = answer?.toLowerCase() === option.toLowerCase();
        const isCorrect = String(question.correctAnswer).toLowerCase() === option.toLowerCase();

        let bgClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
        if (isSelected && !showCorrect) {
          bgClass = isDarkMode ? 'bg-indigo-900 border-indigo-600' : 'bg-indigo-50 border-indigo-500';
        }
        if (showCorrect && isCorrect) {
          bgClass = isDarkMode ? 'bg-green-900 border-green-600' : 'bg-green-50 border-green-500';
        }
        if (showCorrect && isSelected && !isCorrect) {
          bgClass = isDarkMode ? 'bg-red-900 border-red-600' : 'bg-red-50 border-red-500';
        }

        return (
          <button
            key={option}
            onClick={() => !disabled && onChange(option.toLowerCase())}
            disabled={disabled}
            className={`flex-1 p-6 rounded-lg border-2 text-center font-medium text-lg transition-all ${bgClass} ${
              !disabled ? 'hover:border-indigo-400 cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {option}
              {showCorrect && isCorrect && (
                <CheckCircle className="text-green-500" size={20} />
              )}
              {showCorrect && isSelected && !isCorrect && (
                <XCircle className="text-red-500" size={20} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function FillBlankQuestion({
  question,
  answer,
  onChange,
  disabled,
  showCorrect,
  isDarkMode
}: {
  question: QuizQuestion;
  answer: string | undefined;
  onChange: (answer: string) => void;
  disabled: boolean;
  showCorrect: boolean;
  isDarkMode: boolean;
}) {
  const isCorrect = answer?.toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={answer || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer..."
        className={`w-full p-4 rounded-lg border-2 text-lg ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700 focus:border-indigo-500'
            : 'bg-white border-gray-200 focus:border-indigo-500'
        } ${
          showCorrect
            ? isCorrect
              ? (isDarkMode ? 'border-green-600 bg-green-900/30' : 'border-green-500 bg-green-50')
              : (isDarkMode ? 'border-red-600 bg-red-900/30' : 'border-red-500 bg-red-50')
            : ''
        } outline-none transition-colors`}
      />
      {showCorrect && !isCorrect && (
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
          <span className={isDarkMode ? 'text-green-300' : 'text-green-700'}>
            Correct answer: <strong>{question.correctAnswer}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

function MatchingQuestion({
  question,
  answer,
  onChange,
  disabled,
  showCorrect,
  isDarkMode
}: {
  question: QuizQuestion;
  answer: string[] | undefined;
  onChange: (answer: string[]) => void;
  disabled: boolean;
  showCorrect: boolean;
  isDarkMode: boolean;
}) {
  // For matching questions, options format: ["A:1", "B:2"] where A matches 1
  // Answer format: ["A:1", "B:2"] etc.
  const pairs = question.options?.map(opt => {
    const [left, right] = opt.split(':');
    return { left, right };
  }) || [];

  const leftItems = pairs.map(p => p.left);
  const rightItems = shuffleArray(pairs.map(p => p.right));

  const currentMatches = answer || [];

  const handleMatch = (left: string, right: string) => {
    const newMatches = currentMatches.filter(m => !m.startsWith(`${left}:`));
    newMatches.push(`${left}:${right}`);
    onChange(newMatches);
  };

  const getMatchForLeft = (left: string): string | undefined => {
    const match = currentMatches.find(m => m.startsWith(`${left}:`));
    return match ? match.split(':')[1] : undefined;
  };

  return (
    <div className="space-y-4">
      <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Match each item on the left with the corresponding item on the right.
      </p>
      {leftItems.map((left, idx) => {
        const currentMatch = getMatchForLeft(left);
        const correctMatch = pairs.find(p => p.left === left)?.right;
        const isCorrectMatch = currentMatch === correctMatch;

        return (
          <div key={idx} className="flex items-center gap-4">
            <div className={`flex-1 p-3 rounded-lg ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              {left}
            </div>
            <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>→</span>
            <select
              value={currentMatch || ''}
              onChange={(e) => handleMatch(left, e.target.value)}
              disabled={disabled}
              className={`flex-1 p-3 rounded-lg border-2 ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-200'
              } ${
                showCorrect && currentMatch
                  ? isCorrectMatch
                    ? (isDarkMode ? 'border-green-600' : 'border-green-500')
                    : (isDarkMode ? 'border-red-600' : 'border-red-500')
                  : ''
              }`}
            >
              <option value="">Select...</option>
              {rightItems.map((right, ridx) => (
                <option key={ridx} value={right}>{right}</option>
              ))}
            </select>
            {showCorrect && currentMatch && !isCorrectMatch && (
              <span className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                ({correctMatch})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ShortAnswerQuestion({
  question,
  answer,
  onChange,
  disabled,
  showCorrect,
  isDarkMode
}: {
  question: QuizQuestion;
  answer: string | undefined;
  onChange: (answer: string) => void;
  disabled: boolean;
  showCorrect: boolean;
  isDarkMode: boolean;
}) {
  // Short answer might have multiple acceptable answers
  const acceptableAnswers = Array.isArray(question.correctAnswer)
    ? question.correctAnswer
    : [question.correctAnswer];

  const isCorrect = acceptableAnswers.some(
    a => answer?.toLowerCase().trim() === String(a).toLowerCase().trim()
  );

  return (
    <div className="space-y-4">
      <textarea
        value={answer || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type your answer..."
        rows={4}
        className={`w-full p-4 rounded-lg border-2 resize-none ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700 focus:border-indigo-500'
            : 'bg-white border-gray-200 focus:border-indigo-500'
        } ${
          showCorrect
            ? isCorrect
              ? (isDarkMode ? 'border-green-600 bg-green-900/30' : 'border-green-500 bg-green-50')
              : (isDarkMode ? 'border-red-600 bg-red-900/30' : 'border-red-500 bg-red-50')
            : ''
        } outline-none transition-colors`}
      />
      {showCorrect && !isCorrect && (
        <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
          <span className={isDarkMode ? 'text-green-300' : 'text-green-700'}>
            Acceptable answers: <strong>{acceptableAnswers.join(' / ')}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

export default QuizPlayer;
