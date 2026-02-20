import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  HelpCircle,
  CheckSquare,
  ToggleLeft,
  Type,
  Link2,
  MessageSquare
} from 'lucide-react';
import { QuizQuestion, ModuleQuiz } from '../../types/lms';

interface QuizBuilderProps {
  quiz?: ModuleQuiz;
  questions?: QuizQuestion[];
  onSave?: (questions: QuizQuestion[], quizSettings?: Partial<ModuleQuiz>) => void;
  onCancel?: () => void;
  isDarkMode?: boolean;
}

type QuestionType = QuizQuestion['type'];

const QUESTION_TYPE_CONFIG: Record<QuestionType, {
  label: string;
  icon: React.ElementType;
  description: string;
}> = {
  multiple_choice: {
    label: 'Multiple Choice',
    icon: CheckSquare,
    description: 'Single correct answer from multiple options'
  },
  true_false: {
    label: 'True/False',
    icon: ToggleLeft,
    description: 'Binary true or false question'
  },
  fill_blank: {
    label: 'Fill in the Blank',
    icon: Type,
    description: 'Type the correct answer'
  },
  matching: {
    label: 'Matching',
    icon: Link2,
    description: 'Match items from two columns'
  },
  short_answer: {
    label: 'Short Answer',
    icon: MessageSquare,
    description: 'Free text response'
  }
};

export function QuizBuilder({
  quiz,
  questions: initialQuestions = [],
  onSave = () => {},
  onCancel = () => {},
  isDarkMode = false
}: QuizBuilderProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(
    initialQuestions.length > 0 ? initialQuestions[0].id : null
  );
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  // Quiz settings
  const [passingScore, setPassingScore] = useState(quiz?.passingScore || 70);
  const [maxAttempts, setMaxAttempts] = useState(quiz?.maxAttempts || 3);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(quiz?.timeLimit);
  const [shuffleQuestions, setShuffleQuestions] = useState(quiz?.shuffleQuestions || false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(quiz?.showCorrectAnswers ?? true);

  const addQuestion = (type: QuestionType) => {
    const newQuestion: QuizQuestion = {
      id: `q-${Date.now()}`,
      type,
      question: '',
      options: type === 'multiple_choice' ? ['', '', '', ''] : type === 'matching' ? [':', ':'] : undefined,
      correctAnswer: type === 'true_false' ? 'true' : type === 'matching' ? [] : '',
      points: 10,
      explanation: ''
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestion(newQuestion.id);
    setShowAddQuestion(false);
  };

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    setQuestions(questions.map(q => q.id === questionId ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    if (expandedQuestion === questionId) {
      setExpandedQuestion(null);
    }
  };

  const duplicateQuestion = (question: QuizQuestion) => {
    const newQuestion: QuizQuestion = {
      ...question,
      id: `q-${Date.now()}`,
      question: `${question.question} (Copy)`
    };
    const index = questions.findIndex(q => q.id === question.id);
    const newQuestions = [...questions];
    newQuestions.splice(index + 1, 0, newQuestion);
    setQuestions(newQuestions);
    setExpandedQuestion(newQuestion.id);
  };

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === questionId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }

    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const handleSave = () => {
    const validQuestions = questions.filter(q => q.question.trim());
    onSave(validQuestions, {
      passingScore,
      maxAttempts,
      timeLimit,
      shuffleQuestions,
      showCorrectAnswers
    });
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div>
          <h2 className="text-lg font-semibold">Quiz Builder</h2>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {questions.length} questions • {totalPoints} total points
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Check size={18} />
            Save Quiz
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Quiz Settings */}
          <div className={`p-4 rounded-xl border mb-6 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className="font-medium mb-4">Quiz Settings</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  } focus:ring-2 focus:ring-indigo-500 outline-none`}
                />
              </div>
              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Max Attempts
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  } focus:ring-2 focus:ring-indigo-500 outline-none`}
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>0 = Unlimited</p>
              </div>
              <div>
                <label className={`block text-sm mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Time Limit (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={timeLimit || ''}
                  onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="No limit"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  } focus:ring-2 focus:ring-indigo-500 outline-none`}
                />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="text-sm">Shuffle questions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showCorrectAnswers}
                    onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="text-sm">Show correct answers</span>
                </label>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {questions.map((question, index) => (
              <QuestionEditor
                key={question.id}
                question={question}
                index={index}
                isExpanded={expandedQuestion === question.id}
                onToggle={() => setExpandedQuestion(
                  expandedQuestion === question.id ? null : question.id
                )}
                onChange={(updates) => updateQuestion(question.id, updates)}
                onDelete={() => deleteQuestion(question.id)}
                onDuplicate={() => duplicateQuestion(question)}
                onMoveUp={() => moveQuestion(question.id, 'up')}
                onMoveDown={() => moveQuestion(question.id, 'down')}
                isFirst={index === 0}
                isLast={index === questions.length - 1}
                isDarkMode={isDarkMode}
              />
            ))}
          </div>

          {/* Add Question */}
          {showAddQuestion ? (
            <div className={`mt-4 p-4 rounded-xl border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Select Question Type</h4>
                <button
                  onClick={() => setShowAddQuestion(false)}
                  className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(QUESTION_TYPE_CONFIG) as QuestionType[]).map(type => {
                  const config = QUESTION_TYPE_CONFIG[type];
                  return (
                    <button
                      key={type}
                      onClick={() => addQuestion(type)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        isDarkMode
                          ? 'border-gray-700 hover:border-indigo-500 hover:bg-gray-700'
                          : 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50'
                      }`}
                    >
                      <config.icon size={24} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                      <p className="font-medium mt-2">{config.label}</p>
                      <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {config.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddQuestion(true)}
              className={`w-full mt-4 py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 font-medium transition-colors ${
                isDarkMode
                  ? 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400'
                  : 'border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600'
              }`}
            >
              <Plus size={20} />
              Add Question
            </button>
          )}

          {questions.length === 0 && (
            <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <HelpCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No questions yet</p>
              <p className="text-sm">Click "Add Question" to start building your quiz</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Question Editor
interface QuestionEditorProps {
  question: QuizQuestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<QuizQuestion>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isDarkMode: boolean;
}

function QuestionEditor({
  question,
  index,
  isExpanded,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isDarkMode
}: QuestionEditorProps) {
  const config = QUESTION_TYPE_CONFIG[question.type];
  const Icon = config.icon;

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[optionIndex] = value;
    onChange({ options: newOptions });
  };

  const addOption = () => {
    onChange({ options: [...(question.options || []), ''] });
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = question.options?.filter((_, i) => i !== optionIndex);
    onChange({ options: newOptions });
  };

  // For matching questions
  const addMatchPair = () => {
    onChange({ options: [...(question.options || []), ':'] });
  };

  const updateMatchPair = (pairIndex: number, side: 'left' | 'right', value: string) => {
    const newOptions = [...(question.options || [])];
    const [left, right] = newOptions[pairIndex].split(':');
    newOptions[pairIndex] = side === 'left' ? `${value}:${right || ''}` : `${left || ''}:${value}`;
    onChange({ options: newOptions });
    // Update correct answer
    onChange({ correctAnswer: newOptions });
  };

  return (
    <div className={`rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div
        className={`flex items-center gap-3 p-4 cursor-pointer ${
          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
        }`}
        onClick={onToggle}
      >
        <GripVertical size={18} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />

        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <Icon size={16} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Q{index + 1}
            </span>
            <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {config.label}
            </span>
          </div>
          <p className="truncate font-medium">
            {question.question || 'Untitled question'}
          </p>
        </div>

        <span className={`px-2 py-1 rounded text-sm ${
          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
        }`}>
          {question.points} pts
        </span>

        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* Question Text */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Question *
            </label>
            <textarea
              value={question.question}
              onChange={(e) => onChange({ question: e.target.value })}
              placeholder="Enter your question"
              rows={2}
              className={`w-full px-3 py-2 rounded-lg border ${
                isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
              } focus:ring-2 focus:ring-indigo-500 outline-none resize-none`}
            />
          </div>

          {/* Question Type Specific Editor */}
          {question.type === 'multiple_choice' && (
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Options (select correct answer)
              </label>
              <div className="space-y-2">
                {question.options?.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={question.correctAnswer === option}
                      onChange={() => onChange({ correctAnswer: option })}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className={`flex-1 px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                      } focus:ring-2 focus:ring-indigo-500 outline-none`}
                    />
                    {(question.options?.length || 0) > 2 && (
                      <button
                        onClick={() => removeOption(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {(question.options?.length || 0) < 6 && (
                <button
                  onClick={addOption}
                  className={`mt-2 text-sm flex items-center gap-1 ${
                    isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                  }`}
                >
                  <Plus size={16} />
                  Add Option
                </button>
              )}
            </div>
          )}

          {question.type === 'true_false' && (
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Correct Answer
              </label>
              <div className="flex gap-4">
                {['true', 'false'].map(value => (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`tf-${question.id}`}
                      checked={question.correctAnswer === value}
                      onChange={() => onChange({ correctAnswer: value })}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="capitalize">{value}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {question.type === 'fill_blank' && (
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Correct Answer
              </label>
              <input
                type="text"
                value={question.correctAnswer as string}
                onChange={(e) => onChange({ correctAnswer: e.target.value })}
                placeholder="The correct answer"
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              />
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Answer matching is case-insensitive
              </p>
            </div>
          )}

          {question.type === 'matching' && (
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Matching Pairs
              </label>
              <div className="space-y-2">
                {question.options?.map((pair, idx) => {
                  const [left, right] = pair.split(':');
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={left || ''}
                        onChange={(e) => updateMatchPair(idx, 'left', e.target.value)}
                        placeholder="Left item"
                        className={`flex-1 px-3 py-2 rounded-lg border ${
                          isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                        } focus:ring-2 focus:ring-indigo-500 outline-none`}
                      />
                      <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>↔</span>
                      <input
                        type="text"
                        value={right || ''}
                        onChange={(e) => updateMatchPair(idx, 'right', e.target.value)}
                        placeholder="Right item"
                        className={`flex-1 px-3 py-2 rounded-lg border ${
                          isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                        } focus:ring-2 focus:ring-indigo-500 outline-none`}
                      />
                      {(question.options?.length || 0) > 2 && (
                        <button
                          onClick={() => removeOption(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={addMatchPair}
                className={`mt-2 text-sm flex items-center gap-1 ${
                  isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                }`}
              >
                <Plus size={16} />
                Add Pair
              </button>
            </div>
          )}

          {question.type === 'short_answer' && (
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Acceptable Answers (comma-separated)
              </label>
              <input
                type="text"
                value={Array.isArray(question.correctAnswer)
                  ? question.correctAnswer.join(', ')
                  : question.correctAnswer}
                onChange={(e) => onChange({
                  correctAnswer: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                })}
                placeholder="answer1, answer2, answer3"
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              />
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Multiple correct answers can be separated by commas
              </p>
            </div>
          )}

          {/* Points and Explanation */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Points
              </label>
              <input
                type="number"
                min="1"
                value={question.points}
                onChange={(e) => onChange({ points: Number(e.target.value) })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Explanation (shown after answer)
              </label>
              <input
                type="text"
                value={question.explanation || ''}
                onChange={(e) => onChange({ explanation: e.target.value })}
                placeholder="Why this answer is correct"
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center justify-between mt-4 pt-4 border-t ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <button
                onClick={onMoveUp}
                disabled={isFirst}
                className={`p-2 rounded ${
                  isFirst
                    ? 'opacity-30 cursor-not-allowed'
                    : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                }`}
                title="Move up"
              >
                <ChevronUp size={18} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast}
                className={`p-2 rounded ${
                  isLast
                    ? 'opacity-30 cursor-not-allowed'
                    : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                }`}
                title="Move down"
              >
                <ChevronDown size={18} />
              </button>
              <button
                onClick={onDuplicate}
                className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                title="Duplicate"
              >
                <Copy size={18} />
              </button>
            </div>
            <button
              onClick={onDelete}
              className="p-2 rounded text-red-500 hover:bg-red-50"
              title="Delete question"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizBuilder;
