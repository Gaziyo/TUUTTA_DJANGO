import React, { useState } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Save,
  Settings,
  Star,
  MessageSquare,
  ListChecks,
  ToggleLeft,
  AlignLeft,
  Hash,
  Calendar,
  Scale,
  Send,
  CheckCircle,
  X
} from 'lucide-react';

type QuestionType =
  | 'rating'
  | 'multiple_choice'
  | 'checkbox'
  | 'text'
  | 'textarea'
  | 'scale'
  | 'yes_no'
  | 'date'
  | 'nps';

interface SurveyQuestion {
  id: string;
  type: QuestionType;
  text: string;
  description?: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  ratingStyle?: 'stars' | 'numbers';
}

interface Survey {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  settings: {
    anonymous: boolean;
    allowMultipleResponses: boolean;
    showProgressBar: boolean;
    randomizeQuestions: boolean;
    requiredCompletion: boolean;
  };
  linkedCourseId?: string;
  triggerPoint?: 'before_course' | 'after_course' | 'after_module' | 'manual';
  status: 'draft' | 'active' | 'closed';
  responseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SurveyBuilderProps {
  survey?: Survey;
  courses: { id: string; title: string }[];
  onSave: (survey: Omit<Survey, 'id' | 'responseCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onPublish: (surveyId: string) => Promise<void>;
  onPreview: () => void;
  isDarkMode?: boolean;
}

export const SurveyBuilder: React.FC<SurveyBuilderProps> = ({
  survey,
  courses,
  onSave,
  onPublish,
  onPreview,
  isDarkMode = false,
}) => {
  const [title, setTitle] = useState(survey?.title || '');
  const [description, setDescription] = useState(survey?.description || '');
  const [questions, setQuestions] = useState<SurveyQuestion[]>(survey?.questions || []);
  const [settings, setSettings] = useState(survey?.settings || {
    anonymous: true,
    allowMultipleResponses: false,
    showProgressBar: true,
    randomizeQuestions: false,
    requiredCompletion: false,
  });
  const [linkedCourseId, setLinkedCourseId] = useState(survey?.linkedCourseId || '');
  const [triggerPoint, setTriggerPoint] = useState(survey?.triggerPoint || 'after_course');
  const [activeTab, setActiveTab] = useState<'questions' | 'settings'>('questions');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedQuestion, setDraggedQuestion] = useState<string | null>(null);

  const questionTypes: { type: QuestionType; icon: React.ElementType; label: string }[] = [
    { type: 'rating', icon: Star, label: 'Rating' },
    { type: 'nps', icon: Scale, label: 'NPS Score' },
    { type: 'multiple_choice', icon: ListChecks, label: 'Multiple Choice' },
    { type: 'checkbox', icon: CheckCircle, label: 'Checkboxes' },
    { type: 'text', icon: AlignLeft, label: 'Short Text' },
    { type: 'textarea', icon: MessageSquare, label: 'Long Text' },
    { type: 'scale', icon: Hash, label: 'Linear Scale' },
    { type: 'yes_no', icon: ToggleLeft, label: 'Yes/No' },
    { type: 'date', icon: Calendar, label: 'Date' },
  ];

  const addQuestion = (type: QuestionType) => {
    const newQuestion: SurveyQuestion = {
      id: `q-${Date.now()}`,
      type,
      text: '',
      required: false,
      ...(type === 'multiple_choice' || type === 'checkbox' ? { options: ['Option 1', 'Option 2'] } : {}),
      ...(type === 'rating' ? { ratingStyle: 'stars' } : {}),
      ...(type === 'scale' ? { scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Low', scaleMaxLabel: 'High' } : {}),
      ...(type === 'nps' ? { scaleMin: 0, scaleMax: 10 } : {}),
    };
    setQuestions([...questions, newQuestion]);
    setExpandedQuestion(newQuestion.id);
  };

  const updateQuestion = (questionId: string, updates: Partial<SurveyQuestion>) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const duplicateQuestion = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const duplicate = { ...question, id: `q-${Date.now()}`, text: `${question.text} (copy)` };
      const index = questions.findIndex(q => q.id === questionId);
      const newQuestions = [...questions];
      newQuestions.splice(index + 1, 0, duplicate);
      setQuestions(newQuestions);
    }
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const newQuestions = [...questions];
    const [moved] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, moved);
    setQuestions(newQuestions);
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      updateQuestion(questionId, {
        options: [...question.options, `Option ${question.options.length + 1}`]
      });
    }
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const deleteOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question && question.options && question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== optionIndex);
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        title,
        description,
        questions,
        settings,
        linkedCourseId: linkedCourseId || undefined,
        triggerPoint,
        status: 'draft',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getQuestionIcon = (type: QuestionType) => {
    const config = questionTypes.find(qt => qt.type === type);
    return config?.icon || MessageSquare;
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Survey Title"
              className={`text-2xl font-bold bg-transparent border-none outline-none w-full ${
                isDarkMode ? 'placeholder-gray-600' : 'placeholder-gray-400'
              }`}
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description (optional)"
              className={`mt-2 text-sm bg-transparent border-none outline-none w-full ${
                isDarkMode ? 'text-gray-400 placeholder-gray-600' : 'text-gray-600 placeholder-gray-400'
              }`}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onPreview}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isDarkMode
                  ? 'bg-gray-800 hover:bg-gray-700'
                  : 'bg-white hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !title}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            {survey && (
              <button
                onClick={() => onPublish(survey.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'questions'
                ? 'bg-indigo-600 text-white'
                : isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Questions ({questions.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white'
                : isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'questions' ? (
          <div className="flex gap-6">
            {/* Question Types Sidebar */}
            <div className={`w-64 flex-shrink-0 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="font-medium mb-4">Add Question</h3>
              <div className="space-y-2">
                {questionTypes.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => addQuestion(type)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm ${
                      isDarkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-500" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div className="flex-1 space-y-4">
              {questions.length === 0 ? (
                <div className={`p-12 text-center rounded-lg border-2 border-dashed ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-300'
                }`}>
                  <ClipboardList className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <h3 className="text-lg font-medium mb-2">No questions yet</h3>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Click a question type to add your first question
                  </p>
                </div>
              ) : (
                questions.map((question, index) => {
                  const QuestionIcon = getQuestionIcon(question.type);
                  const isExpanded = expandedQuestion === question.id;

                  return (
                    <div
                      key={question.id}
                      draggable
                      onDragStart={() => setDraggedQuestion(question.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedQuestion && draggedQuestion !== question.id) {
                          const fromIndex = questions.findIndex(q => q.id === draggedQuestion);
                          moveQuestion(fromIndex, index);
                        }
                        setDraggedQuestion(null);
                      }}
                      className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} ${
                        draggedQuestion === question.id ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Question Header */}
                      <div
                        className={`p-4 flex items-center gap-4 cursor-pointer ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                        } rounded-t-lg`}
                        onClick={() => setExpandedQuestion(isExpanded ? null : question.id)}
                      >
                        <GripVertical className={`w-5 h-5 cursor-grab ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          {index + 1}
                        </span>
                        <QuestionIcon className="w-5 h-5 text-indigo-500" />
                        <div className="flex-1">
                          <span className={question.text ? '' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                            {question.text || 'Untitled question'}
                          </span>
                          {question.required && (
                            <span className="ml-2 text-red-500">*</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateQuestion(question.id);
                            }}
                            className={`p-1.5 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteQuestion(question.id);
                            }}
                            className={`p-1.5 rounded text-red-500 ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* Question Editor */}
                      {isExpanded && (
                        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Question Text</label>
                              <input
                                type="text"
                                value={question.text}
                                onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                                placeholder="Enter your question"
                                className={`w-full px-3 py-2 rounded-lg border ${
                                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium mb-1">Description (optional)</label>
                              <input
                                type="text"
                                value={question.description || ''}
                                onChange={(e) => updateQuestion(question.id, { description: e.target.value })}
                                placeholder="Add helper text"
                                className={`w-full px-3 py-2 rounded-lg border ${
                                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                }`}
                              />
                            </div>

                            {/* Options for multiple choice / checkbox */}
                            {(question.type === 'multiple_choice' || question.type === 'checkbox') && question.options && (
                              <div>
                                <label className="block text-sm font-medium mb-2">Options</label>
                                <div className="space-y-2">
                                  {question.options.map((option, optIndex) => (
                                    <div key={optIndex} className="flex items-center gap-2">
                                      {question.type === 'multiple_choice' ? (
                                        <div className={`w-4 h-4 rounded-full border-2 ${
                                          isDarkMode ? 'border-gray-500' : 'border-gray-400'
                                        }`} />
                                      ) : (
                                        <div className={`w-4 h-4 rounded border-2 ${
                                          isDarkMode ? 'border-gray-500' : 'border-gray-400'
                                        }`} />
                                      )}
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                        className={`flex-1 px-3 py-1.5 rounded border ${
                                          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                        }`}
                                      />
                                      {question.options!.length > 2 && (
                                        <button
                                          onClick={() => deleteOption(question.id, optIndex)}
                                          className="p-1 text-red-500"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => addOption(question.id)}
                                  className={`mt-2 flex items-center gap-2 text-sm ${
                                    isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                                  }`}
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Option
                                </button>
                              </div>
                            )}

                            {/* Rating settings */}
                            {question.type === 'rating' && (
                              <div>
                                <label className="block text-sm font-medium mb-2">Rating Style</label>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`rating-style-${question.id}`}
                                      checked={question.ratingStyle === 'stars'}
                                      onChange={() => updateQuestion(question.id, { ratingStyle: 'stars' })}
                                    />
                                    <span className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map(i => (
                                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                      ))}
                                    </span>
                                  </label>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`rating-style-${question.id}`}
                                      checked={question.ratingStyle === 'numbers'}
                                      onChange={() => updateQuestion(question.id, { ratingStyle: 'numbers' })}
                                    />
                                    <span>1-5 Numbers</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Scale settings */}
                            {question.type === 'scale' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Min Value</label>
                                  <input
                                    type="number"
                                    value={question.scaleMin}
                                    onChange={(e) => updateQuestion(question.id, { scaleMin: parseInt(e.target.value) })}
                                    className={`w-full px-3 py-2 rounded-lg border ${
                                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Max Value</label>
                                  <input
                                    type="number"
                                    value={question.scaleMax}
                                    onChange={(e) => updateQuestion(question.id, { scaleMax: parseInt(e.target.value) })}
                                    className={`w-full px-3 py-2 rounded-lg border ${
                                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Min Label</label>
                                  <input
                                    type="text"
                                    value={question.scaleMinLabel}
                                    onChange={(e) => updateQuestion(question.id, { scaleMinLabel: e.target.value })}
                                    placeholder="e.g., Not likely"
                                    className={`w-full px-3 py-2 rounded-lg border ${
                                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                    }`}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Max Label</label>
                                  <input
                                    type="text"
                                    value={question.scaleMaxLabel}
                                    onChange={(e) => updateQuestion(question.id, { scaleMaxLabel: e.target.value })}
                                    placeholder="e.g., Very likely"
                                    className={`w-full px-3 py-2 rounded-lg border ${
                                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                    }`}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Required toggle */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-sm">Required</span>
                              <button
                                onClick={() => updateQuestion(question.id, { required: !question.required })}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                  question.required ? 'bg-indigo-600' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                                  question.required ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Settings Tab */
          <div className={`max-w-2xl mx-auto p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="font-semibold mb-6">Survey Settings</h3>

            <div className="space-y-6">
              {/* Course Link */}
              <div>
                <label className="block text-sm font-medium mb-2">Link to Course (optional)</label>
                <select
                  value={linkedCourseId}
                  onChange={(e) => setLinkedCourseId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">No course link</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              {linkedCourseId && (
                <div>
                  <label className="block text-sm font-medium mb-2">When to show survey</label>
                  <select
                    value={triggerPoint}
                    onChange={(e) => setTriggerPoint(e.target.value as Survey['triggerPoint'])}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="before_course">Before starting the course</option>
                    <option value="after_course">After completing the course</option>
                    <option value="after_module">After each module</option>
                    <option value="manual">Manual trigger only</option>
                  </select>
                </div>
              )}

              {/* Toggle Settings */}
              <div className="space-y-4">
                {[
                  { key: 'anonymous', label: 'Anonymous Responses', description: 'Hide respondent identities' },
                  { key: 'allowMultipleResponses', label: 'Allow Multiple Responses', description: 'Let users submit more than once' },
                  { key: 'showProgressBar', label: 'Show Progress Bar', description: 'Display completion progress to respondents' },
                  { key: 'randomizeQuestions', label: 'Randomize Questions', description: 'Show questions in random order' },
                  { key: 'requiredCompletion', label: 'Required for Completion', description: 'Must complete survey to finish course' },
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {description}
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof typeof settings] })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings[key as keyof typeof settings] ? 'bg-indigo-600' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
                        settings[key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyBuilder;
