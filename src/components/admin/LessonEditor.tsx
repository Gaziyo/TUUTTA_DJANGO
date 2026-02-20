import React, { useState } from 'react';
import {
  X,
  Video,
  FileAudio,
  Check,
  ExternalLink,
  Youtube,
  AlertCircle
} from 'lucide-react';
import { Lesson, LessonContent } from '../../types/lms';
import { QuizBuilder } from './QuizBuilder';

interface LessonEditorProps {
  lesson: Lesson;
  onSave: (updates: Partial<Lesson>) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
  moduleOptions?: Array<{ id: string; title: string }>;
}

export function LessonEditor({
  lesson,
  onSave,
  onCancel,
  isDarkMode = false,
  moduleOptions = []
}: LessonEditorProps) {
  const [title, setTitle] = useState(lesson.title);
  const [duration, setDuration] = useState(lesson.duration);
  const [isRequired, setIsRequired] = useState(lesson.isRequired);
  const [content, setContent] = useState<LessonContent>(lesson.content);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assessmentRole, setAssessmentRole] = useState(lesson.assessmentMeta?.role || 'lesson');
  const [competencyTags, setCompetencyTags] = useState((lesson.assessmentMeta?.competencyTags || []).join(', '));
  const [topicTags, setTopicTags] = useState((lesson.assessmentMeta?.topicTags || []).join(', '));
  const [remediationModuleId, setRemediationModuleId] = useState(lesson.assessmentMeta?.remediationModuleId || '');
  const [remediationLessonId, setRemediationLessonId] = useState(lesson.assessmentMeta?.remediationLessonId || '');
  const [recertifyDays, setRecertifyDays] = useState(lesson.assessmentMeta?.recertifyDays?.toString() || '');
  const [skipModuleIds, setSkipModuleIds] = useState((lesson.assessmentMeta?.skipModuleIds || []).join(', '));
  const [skipModuleSelection, setSkipModuleSelection] = useState<string[]>(lesson.assessmentMeta?.skipModuleIds || []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (duration < 1) {
      newErrors.duration = 'Duration must be at least 1 minute';
    }

    // Content-specific validation
    switch (lesson.type) {
      case 'video':
        if (!content.videoUrl?.trim()) {
          newErrors.videoUrl = 'Video URL is required';
        }
        break;
      case 'audio':
        if (!content.audioUrl?.trim()) {
          newErrors.audioUrl = 'Audio URL is required';
        }
        break;
      case 'document':
        if (!content.documentUrl?.trim()) {
          newErrors.documentUrl = 'Document URL is required';
        }
        break;
      case 'text':
        if (!content.htmlContent?.trim()) {
          newErrors.htmlContent = 'Content is required';
        }
        break;
      case 'external_link':
        if (!content.externalUrl?.trim()) {
          newErrors.externalUrl = 'URL is required';
        }
        break;
      case 'quiz':
        if (!content.questions || content.questions.length === 0) {
          newErrors.questions = 'At least one question is required';
        }
        break;
      case 'assignment':
        if (!content.assignmentPrompt?.trim()) {
          newErrors.assignmentPrompt = 'Assignment prompt is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const competencyList = competencyTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const topicList = topicTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    const parsedRecertify = Number(recertifyDays);
    const skipModuleList = moduleOptions.length > 0
      ? skipModuleSelection
      : skipModuleIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    const assessmentMeta = lesson.type === 'quiz' || lesson.type === 'assignment'
      ? {
        role: assessmentRole as Lesson['assessmentMeta']['role'],
        competencyTags: competencyList.length > 0 ? competencyList : undefined,
        topicTags: topicList.length > 0 ? topicList : undefined,
        remediationModuleId: remediationModuleId.trim() || undefined,
        remediationLessonId: remediationLessonId.trim() || undefined,
        recertifyDays: Number.isFinite(parsedRecertify) && parsedRecertify > 0 ? parsedRecertify : undefined,
        skipModuleIds: skipModuleList.length > 0 ? skipModuleList : undefined
      }
      : undefined;

    onSave({
      title: title.trim(),
      duration,
      isRequired,
      content,
      assessmentMeta
    });
  };

  const updateContent = (updates: Partial<LessonContent>) => {
    setContent({ ...content, ...updates });
  };

  // Detect video provider from URL
  const detectVideoProvider = (url: string): 'youtube' | 'vimeo' | 'uploaded' | 'external' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('firebasestorage') || url.includes('cloudinary') || url.includes('s3.amazonaws')) return 'uploaded';
    return 'external';
  };

  const renderContentEditor = () => {
    switch (lesson.type) {
      case 'video':
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Video URL *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={content.videoUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    updateContent({
                      videoUrl: url,
                      videoProvider: detectVideoProvider(url)
                    });
                  }}
                  placeholder="YouTube, Vimeo, or direct video URL"
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    errors.videoUrl
                      ? 'border-red-500'
                      : (isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white')
                  } focus:ring-2 focus:ring-indigo-500 outline-none`}
                />
              </div>
              {errors.videoUrl && (
                <p className="mt-1 text-sm text-red-500">{errors.videoUrl}</p>
              )}
              {content.videoUrl && (
                <div className={`mt-2 flex items-center gap-2 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {content.videoProvider === 'youtube' && <Youtube size={16} className="text-red-500" />}
                  {content.videoProvider === 'vimeo' && <Video size={16} className="text-blue-400" />}
                  Detected: {content.videoProvider || 'Unknown'}
                </div>
              )}
            </div>

            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <strong>Supported formats:</strong>
              </p>
              <ul className={`text-sm mt-2 space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <li>• YouTube: https://youtube.com/watch?v=... or https://youtu.be/...</li>
                <li>• Vimeo: https://vimeo.com/...</li>
                <li>• Direct MP4/WebM links</li>
              </ul>
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Audio URL *
              </label>
              <input
                type="url"
                value={content.audioUrl || ''}
                onChange={(e) => updateContent({ audioUrl: e.target.value })}
                placeholder="Direct MP3, WAV, or OGG URL"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.audioUrl
                    ? 'border-red-500'
                    : (isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white')
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              />
              {errors.audioUrl && (
                <p className="mt-1 text-sm text-red-500">{errors.audioUrl}</p>
              )}
            </div>

            {content.audioUrl && (
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 text-sm">
                  <FileAudio className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Audio preview</span>
                </div>
                <audio controls className="mt-2 w-full">
                  <source src={content.audioUrl} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Document URL *
              </label>
              <input
                type="url"
                value={content.documentUrl || ''}
                onChange={(e) => updateContent({ documentUrl: e.target.value })}
                placeholder="URL to PDF, PowerPoint, or Word document"
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.documentUrl
                    ? 'border-red-500'
                    : (isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white')
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              />
              {errors.documentUrl && (
                <p className="mt-1 text-sm text-red-500">{errors.documentUrl}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Document Type
              </label>
              <select
                value={content.documentType || 'pdf'}
                onChange={(e) => updateContent({ documentType: e.target.value as LessonContent['documentType'] })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              >
                <option value="pdf">PDF</option>
                <option value="ppt">PowerPoint</option>
                <option value="doc">Word Document</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Content (HTML supported) *
              </label>
              <textarea
                value={content.htmlContent || ''}
                onChange={(e) => updateContent({ htmlContent: e.target.value })}
                placeholder="Enter lesson content. HTML tags are supported for formatting."
                rows={12}
                className={`w-full px-3 py-2 rounded-lg border font-mono text-sm ${
                  errors.htmlContent
                    ? 'border-red-500'
                    : (isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white')
                } focus:ring-2 focus:ring-indigo-500 outline-none resize-none`}
              />
              {errors.htmlContent && (
                <p className="mt-1 text-sm text-red-500">{errors.htmlContent}</p>
              )}
            </div>

            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                HTML Quick Reference:
              </p>
              <div className={`text-sm font-mono space-y-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <p>&lt;h2&gt;Heading&lt;/h2&gt;</p>
                <p>&lt;p&gt;Paragraph&lt;/p&gt;</p>
                <p>&lt;strong&gt;Bold&lt;/strong&gt;</p>
                <p>&lt;em&gt;Italic&lt;/em&gt;</p>
                <p>&lt;ul&gt;&lt;li&gt;List item&lt;/li&gt;&lt;/ul&gt;</p>
                <p>&lt;a href="url"&gt;Link&lt;/a&gt;</p>
              </div>
            </div>
          </div>
        );

      case 'external_link':
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                External URL *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={content.externalUrl || ''}
                  onChange={(e) => updateContent({ externalUrl: e.target.value })}
                  placeholder="https://example.com/resource"
                  className={`flex-1 px-3 py-2 rounded-lg border ${
                    errors.externalUrl
                      ? 'border-red-500'
                      : (isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white')
                  } focus:ring-2 focus:ring-indigo-500 outline-none`}
                />
                {content.externalUrl && (
                  <a
                    href={content.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-3 py-2 rounded-lg ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title="Open link"
                  >
                    <ExternalLink size={18} />
                  </a>
                )}
              </div>
              {errors.externalUrl && (
                <p className="mt-1 text-sm text-red-500">{errors.externalUrl}</p>
              )}
            </div>

            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'
            }`}>
              <AlertCircle size={18} className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'} />
              <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                External links will open in a new tab. Ensure the linked resource is accessible to all learners.
              </p>
            </div>
          </div>
        );

      case 'assignment':
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Assignment Prompt *
              </label>
              <textarea
                value={content.assignmentPrompt || ''}
                onChange={(e) => updateContent({ assignmentPrompt: e.target.value })}
                placeholder="Describe what learners need to submit for this assignment..."
                rows={6}
                className={`w-full px-3 py-2 rounded-lg border ${
                  errors.assignmentPrompt
                    ? 'border-red-500'
                    : (isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white')
                } focus:ring-2 focus:ring-indigo-500 outline-none resize-none`}
              />
              {errors.assignmentPrompt && (
                <p className="mt-1 text-sm text-red-500">{errors.assignmentPrompt}</p>
              )}
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Submission Type
              </label>
              <select
                value={content.submissionType || 'text'}
                onChange={(e) => updateContent({ submissionType: e.target.value as LessonContent['submissionType'] })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              >
                <option value="text">Text Response</option>
                <option value="file">File Upload</option>
                <option value="link">URL/Link</option>
              </select>
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50'
            }`}>
              <p className={`text-sm ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                <strong>Quiz Configuration</strong>
              </p>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                {content.questions?.length || 0} questions configured.
                Use the Quiz Builder to create and edit questions.
              </p>
            </div>

            {errors.questions && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'
              }`}>
                <AlertCircle size={18} />
                {errors.questions}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowQuizBuilder(true)}
              className={`w-full py-3 rounded-lg font-medium ${
                isDarkMode
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {content.questions?.length ? 'Edit Quiz Questions' : 'Create Quiz Questions'}
            </button>

            {content.questions && content.questions.length > 0 && (
              <div className="space-y-2">
                {content.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-lg ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{q.question}</p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {q.type.replace('_', ' ')} • {q.points} points
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showQuizBuilder && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className={`w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                  <QuizBuilder
                    quiz={{
                      id: lesson.id,
                      title: lesson.title,
                      questions: content.questions || [],
                      passingScore: content.quizSettings?.passingScore ?? 70,
                      maxAttempts: content.quizSettings?.maxAttempts ?? 3,
                      timeLimit: content.quizSettings?.timeLimit,
                      shuffleQuestions: content.quizSettings?.shuffleQuestions ?? false,
                      showCorrectAnswers: content.quizSettings?.showCorrectAnswers ?? true
                    }}
                    questions={content.questions || []}
                    onSave={(questions, quizSettings) => {
                      updateContent({
                        questions,
                        quizSettings: quizSettings ?? content.quizSettings
                      });
                      setShowQuizBuilder(false);
                    }}
                    onCancel={() => setShowQuizBuilder(false)}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'scorm':
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                SCORM Package URL
              </label>
              <input
                type="url"
                value={content.scormPackageUrl || ''}
                onChange={(e) => updateContent({ scormPackageUrl: e.target.value })}
                placeholder="URL to SCORM package"
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                SCORM Version
              </label>
              <select
                value={content.scormVersion || '1.2'}
                onChange={(e) => updateContent({ scormVersion: e.target.value as LessonContent['scormVersion'] })}
                className={`w-full px-3 py-2 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              >
                <option value="1.2">SCORM 1.2</option>
                <option value="2004">SCORM 2004</option>
              </select>
            </div>

            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
            }`}>
              <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                SCORM packages allow you to import interactive e-learning content created in authoring tools like Articulate Storyline, Adobe Captivate, or iSpring.
              </p>
            </div>
          </div>
        );

      case 'interactive':
        return (
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Interactive Content (HTML/Embed)
              </label>
              <textarea
                value={content.htmlContent || ''}
                onChange={(e) => updateContent({ htmlContent: e.target.value })}
                placeholder="Paste embed code or HTML for interactive content (H5P, Genially, etc.)"
                rows={8}
                className={`w-full px-3 py-2 rounded-lg border font-mono text-sm ${
                  isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none resize-none`}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              Content editor not available for this lesson type.
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${
      isDarkMode ? 'bg-gray-800 border-indigo-500' : 'bg-white border-indigo-300'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h5 className="font-medium">Edit Lesson</h5>
        <button
          onClick={onCancel}
          className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Lesson Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter lesson title"
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.title
                  ? 'border-red-500'
                  : (isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white')
              } focus:ring-2 focus:ring-indigo-500 outline-none`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Duration (min)
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={`w-full px-3 py-2 rounded-lg border ${
                errors.duration
                  ? 'border-red-500'
                  : (isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white')
              } focus:ring-2 focus:ring-indigo-500 outline-none`}
            />
            {errors.duration && (
              <p className="mt-1 text-sm text-red-500">{errors.duration}</p>
            )}
          </div>
        </div>

        {/* Required Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="w-5 h-5 rounded text-indigo-600"
          />
          <div>
            <p className="font-medium">Required Lesson</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Learners must complete this lesson to finish the course
            </p>
          </div>
        </label>

        {/* Content Editor */}
        <div className={`pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h6 className={`font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Lesson Content
          </h6>
          {renderContentEditor()}
        </div>

        {(lesson.type === 'quiz' || lesson.type === 'assignment') && (
          <div className={`pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h6 className={`font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Assessment Metadata
            </h6>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Assessment Role
                </label>
                <select
                  value={assessmentRole}
                  onChange={(e) => setAssessmentRole(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <option value="pre">Pre‑assessment</option>
                  <option value="lesson">Lesson quiz</option>
                  <option value="module">Module assessment</option>
                  <option value="final">Final exam</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Recertify (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={recertifyDays}
                  onChange={(e) => setRecertifyDays(e.target.value)}
                  placeholder="e.g. 365"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  }`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Competency Tags (comma‑separated)
                </label>
                <input
                  type="text"
                  value={competencyTags}
                  onChange={(e) => setCompetencyTags(e.target.value)}
                  placeholder="e.g. compliance, privacy, safety"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  }`}
                />
              </div>
              {assessmentRole === 'pre' && (
                <div className="sm:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Skip Module IDs (comma‑separated)
                  </label>
                  {moduleOptions.length > 0 ? (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border p-3 ${
                      isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                    }`}>
                      {moduleOptions.map((option) => (
                        <label key={option.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={skipModuleSelection.includes(option.id)}
                            onChange={(e) => {
                              setSkipModuleSelection((prev) =>
                                e.target.checked
                                  ? [...prev, option.id]
                                  : prev.filter((id) => id !== option.id)
                              );
                            }}
                            className="accent-indigo-500"
                          />
                          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                            {option.title}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={skipModuleIds}
                      onChange={(e) => setSkipModuleIds(e.target.value)}
                      placeholder="e.g. module-1, module-3"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                      }`}
                    />
                  )}
                </div>
              )}
              <div className="sm:col-span-2">
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Topic Tags (comma‑separated)
                </label>
                <input
                  type="text"
                  value={topicTags}
                  onChange={(e) => setTopicTags(e.target.value)}
                  placeholder="e.g. data handling, onboarding"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Remediation Module ID
                </label>
                <input
                  type="text"
                  value={remediationModuleId}
                  onChange={(e) => setRemediationModuleId(e.target.value)}
                  placeholder="Optional module ID"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Remediation Lesson ID
                </label>
                <input
                  type="text"
                  value={remediationLessonId}
                  onChange={(e) => setRemediationLessonId(e.target.value)}
                  placeholder="Optional lesson ID"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-lg ${
              isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Check size={18} />
            Save Lesson
          </button>
        </div>
      </div>
    </div>
  );
}

export default LessonEditor;
