import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Video,
  FileAudio,
  FileText,
  File,
  Link,
  HelpCircle,
  Edit3,
  Check,
  Clock,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { CourseModule, Lesson, LessonType } from '../../types/lms';
import { LessonEditor } from './LessonEditor';

interface ModuleEditorProps {
  module: CourseModule;
  onSave: (updates: Partial<CourseModule>) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

const LESSON_TYPE_ICONS: Record<LessonType, React.ElementType> = {
  video: Video,
  audio: FileAudio,
  document: File,
  text: FileText,
  quiz: HelpCircle,
  assignment: Edit3,
  scorm: File,
  external_link: Link,
  interactive: FileText
};

const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  text: 'Text/HTML',
  quiz: 'Quiz',
  assignment: 'Assignment',
  scorm: 'SCORM Package',
  external_link: 'External Link',
  interactive: 'Interactive'
};

export function ModuleEditor({
  module,
  onSave,
  onCancel,
  isDarkMode = false
}: ModuleEditorProps) {
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description || '');
  const [lessons, setLessons] = useState<Lesson[]>(module.lessons);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [showAddLesson, setShowAddLesson] = useState(false);

  const handleSave = () => {
    onSave({
      title: title.trim(),
      description: description.trim(),
      lessons: lessons.map((l, i) => ({ ...l, order: i }))
    });
  };

  // Lesson management
  const addLesson = (type: LessonType) => {
    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: `New ${LESSON_TYPE_LABELS[type]}`,
      type,
      content: {},
      duration: type === 'video' || type === 'audio' ? 10 : type === 'quiz' ? 15 : 5,
      order: lessons.length,
      isRequired: true
    };
    setLessons([...lessons, newLesson]);
    setEditingLessonId(newLesson.id);
    setShowAddLesson(false);
  };

  const updateLesson = (lessonId: string, updates: Partial<Lesson>) => {
    setLessons(lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l));
  };

  const deleteLesson = (lessonId: string) => {
    setLessons(lessons.filter(l => l.id !== lessonId).map((l, i) => ({ ...l, order: i })));
    if (editingLessonId === lessonId) {
      setEditingLessonId(null);
    }
  };

  const moveLesson = (lessonId: string, direction: 'up' | 'down') => {
    const index = lessons.findIndex(l => l.id === lessonId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === lessons.length - 1)
    ) {
      return;
    }

    const newLessons = [...lessons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];
    setLessons(newLessons.map((l, i) => ({ ...l, order: i })));
  };

  const duplicateLesson = (lesson: Lesson) => {
    const newLesson: Lesson = {
      ...lesson,
      id: `lesson-${Date.now()}`,
      title: `${lesson.title} (Copy)`,
      order: lessons.length
    };
    setLessons([...lessons, newLesson]);
  };

  const totalDuration = lessons.reduce((sum, l) => sum + l.duration, 0);

  return (
    <div className={`p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      {/* Module Details */}
      <div className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Module Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter module title"
              className={`w-full px-3 py-2 rounded-lg border ${
                isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
              } focus:ring-2 focus:ring-indigo-500 outline-none`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this module"
              className={`w-full px-3 py-2 rounded-lg border ${
                isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
              } focus:ring-2 focus:ring-indigo-500 outline-none`}
            />
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className={`font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Lessons ({lessons.length})
          </h4>
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Total: {totalDuration} min
          </span>
        </div>

        {lessons.length === 0 ? (
          <div className={`text-center py-8 rounded-lg border-2 border-dashed ${
            isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'
          }`}>
            <p className="mb-2">No lessons yet</p>
            <button
              onClick={() => setShowAddLesson(true)}
              className="text-indigo-500 hover:underline"
            >
              Add your first lesson
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {lessons.map((lesson, index) => {
              const Icon = LESSON_TYPE_ICONS[lesson.type];
              const isEditing = editingLessonId === lesson.id;

              if (isEditing) {
                return (
                  <LessonEditor
                    key={lesson.id}
                    lesson={lesson}
                    onSave={(updates) => {
                      updateLesson(lesson.id, updates);
                      setEditingLessonId(null);
                    }}
                    onCancel={() => setEditingLessonId(null)}
                    isDarkMode={isDarkMode}
                  />
                );
              }

              return (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <GripVertical
                    size={18}
                    className={`cursor-grab ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}
                  />

                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <Icon size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lesson.title}</p>
                    <div className={`flex items-center gap-3 text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span>{LESSON_TYPE_LABELS[lesson.type]}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {lesson.duration} min
                      </span>
                      {lesson.isRequired && (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          isDarkMode ? 'bg-indigo-900 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          Required
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveLesson(lesson.id, 'up')}
                      disabled={index === 0}
                      className={`p-1.5 rounded ${
                        index === 0
                          ? 'opacity-30 cursor-not-allowed'
                          : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                      }`}
                      title="Move up"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      onClick={() => moveLesson(lesson.id, 'down')}
                      disabled={index === lessons.length - 1}
                      className={`p-1.5 rounded ${
                        index === lessons.length - 1
                          ? 'opacity-30 cursor-not-allowed'
                          : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                      }`}
                      title="Move down"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      onClick={() => setEditingLessonId(lesson.id)}
                      className={`p-1.5 rounded ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                      title="Edit lesson"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => duplicateLesson(lesson)}
                      className={`p-1.5 rounded ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                      title="Duplicate"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => deleteLesson(lesson.id)}
                      className="p-1.5 rounded text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Lesson */}
      {showAddLesson ? (
        <div className={`p-4 rounded-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium">Add Lesson</h5>
            <button
              onClick={() => setShowAddLesson(false)}
              className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(LESSON_TYPE_ICONS) as LessonType[]).map(type => {
              const Icon = LESSON_TYPE_ICONS[type];
              return (
                <button
                  key={type}
                  onClick={() => addLesson(type)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    isDarkMode
                      ? 'border-gray-700 hover:border-indigo-500 hover:bg-gray-700'
                      : 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50'
                  }`}
                >
                  <Icon size={24} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {LESSON_TYPE_LABELS[type]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddLesson(true)}
          className={`w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
            isDarkMode
              ? 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400'
              : 'border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600'
          }`}
        >
          <Plus size={18} />
          Add Lesson
        </button>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
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
          disabled={!title.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Check size={18} />
          Save Module
        </button>
      </div>
    </div>
  );
}

export default ModuleEditor;
