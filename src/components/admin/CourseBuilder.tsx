import { useState, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Settings,
  Image,
  BookOpen,
  Target,
  Tag,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Course, CourseModule, CourseSettings } from '../../types/lms';
import { ModuleEditor } from './ModuleEditor';

interface CourseBuilderProps {
  course?: Course;
  orgId: string;
  userId: string;
  onSave: (course: Partial<Course>) => Promise<void>;
  onPublish?: (courseId: string) => Promise<void>;
  onCancel: () => void;
  isDarkMode?: boolean;
}

type TabType = 'details' | 'content' | 'settings';

const DEFAULT_SETTINGS: CourseSettings = {
  allowSelfEnrollment: false,
  allowGuestAccess: false,
  allowCohortSync: false,
  requireSequentialProgress: true,
  showProgressBar: true,
  enableDiscussions: false,
  enableCertificate: true,
  passingScore: 70,
  maxAttempts: 3,
  timeLimit: undefined
};

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', color: 'green' },
  { value: 'intermediate', label: 'Intermediate', color: 'yellow' },
  { value: 'advanced', label: 'Advanced', color: 'red' }
] as const;

const CATEGORY_OPTIONS = [
  'Compliance',
  'Safety',
  'Technical Skills',
  'Soft Skills',
  'Leadership',
  'Onboarding',
  'Product Training',
  'Sales',
  'Customer Service',
  'Other'
];

export function CourseBuilder({
  course,
  orgId,
  userId,
  onSave,
  onPublish,
  onCancel,
  isDarkMode = false
}: CourseBuilderProps) {
  const isEditing = !!course;

  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [shortDescription, setShortDescription] = useState(course?.shortDescription || '');
  const [thumbnail, setThumbnail] = useState(course?.thumbnail || '');
  const [category, setCategory] = useState(course?.category || 'Other');
  const [tags, setTags] = useState<string[]>(course?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    course?.difficulty || 'beginner'
  );
  const [estimatedDuration] = useState(course?.estimatedDuration || 30);
  const [learningObjectives, setLearningObjectives] = useState<string[]>(
    course?.learningObjectives || ['']
  );
  const [modules, setModules] = useState<CourseModule[]>(course?.modules || []);
  const [settings, setSettings] = useState<CourseSettings>(course?.settings || DEFAULT_SETTINGS);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Course title is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Course description is required';
    }
    if (estimatedDuration < 1) {
      newErrors.estimatedDuration = 'Duration must be at least 1 minute';
    }
    if (modules.length === 0) {
      newErrors.modules = 'At least one module is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, estimatedDuration, modules]);

  // Calculate total duration from modules
  const calculateTotalDuration = useCallback((): number => {
    return modules.reduce((total, module) => {
      return total + module.lessons.reduce((lessonTotal, lesson) => lessonTotal + lesson.duration, 0);
    }, 0);
  }, [modules]);

  // Tag management
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Learning objectives management
  const addObjective = () => {
    setLearningObjectives([...learningObjectives, '']);
  };

  const updateObjective = (index: number, value: string) => {
    const updated = [...learningObjectives];
    updated[index] = value;
    setLearningObjectives(updated);
  };

  const removeObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  // Module management
  const addModule = () => {
    const newModule: CourseModule = {
      id: `module-${Date.now()}`,
      title: `Module ${modules.length + 1}`,
      description: '',
      order: modules.length,
      lessons: []
    };
    setModules([...modules, newModule]);
    setExpandedModules(new Set([...expandedModules, newModule.id]));
    setEditingModuleId(newModule.id);
  };

  const updateModule = (moduleId: string, updates: Partial<CourseModule>) => {
    setModules(modules.map(m => m.id === moduleId ? { ...m, ...updates } : m));
  };

  const deleteModule = (moduleId: string) => {
    setModules(modules.filter(m => m.id !== moduleId).map((m, i) => ({ ...m, order: i })));
  };

  const moveModule = (moduleId: string, direction: 'up' | 'down') => {
    const index = modules.findIndex(m => m.id === moduleId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === modules.length - 1)
    ) {
      return;
    }

    const newModules = [...modules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newModules[index], newModules[targetIndex]] = [newModules[targetIndex], newModules[index]];
    setModules(newModules.map((m, i) => ({ ...m, order: i })));
  };

  const toggleModuleExpand = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // Save handler
  const handleSave = async (publish: boolean = false) => {
    if (!validate()) {
      setActiveTab('details');
      return;
    }

    setSaving(true);
    try {
      const courseData: Partial<Course> = {
        ...(course?.id && { id: course.id }),
        orgId,
        title: title.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        thumbnail,
        category,
        tags,
        difficulty,
        estimatedDuration: calculateTotalDuration() || estimatedDuration,
        modules: modules.map((m, i) => ({ ...m, order: i })),
        learningObjectives: learningObjectives.filter(o => o.trim()),
        settings,
        status: publish ? 'published' : (course?.status || 'draft'),
        createdBy: course?.createdBy || userId,
        version: (course?.version || 0) + 1
      };

      await onSave(courseData);

      if (publish && onPublish && course?.id) {
        await onPublish(course.id);
      }
    } catch (error) {
      console.error('Failed to save course:', error);
    } finally {
      setSaving(false);
    }
  };

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalDuration = calculateTotalDuration();

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">
              {isEditing ? 'Edit Course' : 'Create New Course'}
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {modules.length} modules • {totalLessons} lessons • {totalDuration} min
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {course?.status === 'draft' && (
            <span className={`px-3 py-1 rounded-full text-sm ${
              isDarkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
            }`}>
              Draft
            </span>
          )}

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium ${
              isDarkMode
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } disabled:opacity-50`}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle size={18} />
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {[
          { id: 'details', label: 'Course Details', icon: BookOpen },
          { id: 'content', label: 'Content', icon: Settings },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === tab.id
                ? (isDarkMode
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-indigo-600 border-b-2 border-indigo-600')
                : (isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.id === 'details' && errors.title && (
              <AlertCircle size={16} className="text-red-500" />
            )}
            {tab.id === 'content' && errors.modules && (
              <AlertCircle size={16} className="text-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Title */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Course Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter course title"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.title
                    ? 'border-red-500'
                    : (isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white')
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            {/* Short Description */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Short Description
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief summary (shown in course cards)"
                maxLength={200}
                className={`w-full px-4 py-3 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                } focus:ring-2 focus:ring-indigo-500 outline-none`}
              />
              <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {shortDescription.length}/200 characters
              </p>
            </div>

            {/* Full Description */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Full Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed course description"
                rows={5}
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.description
                    ? 'border-red-500'
                    : (isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white')
                } focus:ring-2 focus:ring-indigo-500 outline-none resize-none`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description}</p>
              )}
            </div>

            {/* Thumbnail */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Course Thumbnail
              </label>
              <div className="flex items-start gap-4">
                {thumbnail ? (
                  <div className="relative">
                    <img
                      src={thumbnail}
                      alt="Course thumbnail"
                      className="w-40 h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setThumbnail('')}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className={`w-40 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center ${
                    isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'
                  }`}>
                    <Image size={24} />
                    <span className="text-xs mt-1">No image</span>
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="url"
                    value={thumbnail}
                    onChange={(e) => setThumbnail(e.target.value)}
                    placeholder="Enter image URL"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                    } focus:ring-2 focus:ring-indigo-500 outline-none`}
                  />
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Recommended: 1280x720 pixels (16:9 ratio)
                  </p>
                </div>
              </div>
            </div>

            {/* Category and Difficulty */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                  } focus:ring-2 focus:ring-indigo-500 outline-none`}
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Difficulty Level
                </label>
                <div className="flex gap-2">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDifficulty(opt.value)}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 font-medium transition-colors ${
                        difficulty === opt.value
                          ? opt.color === 'green'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : opt.color === 'yellow'
                              ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                              : 'border-red-500 bg-red-50 text-red-700'
                          : (isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300')
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                      isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Tag size={14} />
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag"
                  className={`flex-1 px-4 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                  } focus:ring-2 focus:ring-indigo-500 outline-none`}
                />
                <button
                  onClick={addTag}
                  className={`px-4 py-2 rounded-lg ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Learning Objectives */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Learning Objectives
              </label>
              <div className="space-y-2">
                {learningObjectives.map((objective, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Target size={18} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => updateObjective(index, e.target.value)}
                        placeholder={`Objective ${index + 1}`}
                        className={`flex-1 px-4 py-2 rounded-lg border ${
                          isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                        } focus:ring-2 focus:ring-indigo-500 outline-none`}
                      />
                    </div>
                    {learningObjectives.length > 1 && (
                      <button
                        onClick={() => removeObjective(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addObjective}
                className={`mt-2 flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDarkMode ? 'text-indigo-400 hover:bg-gray-800' : 'text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                <Plus size={18} />
                Add Objective
              </button>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="max-w-4xl mx-auto">
            {errors.modules && (
              <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'
              }`}>
                <AlertCircle size={20} />
                {errors.modules}
              </div>
            )}

            {/* Module List */}
            <div className="space-y-4">
              {modules.map((module, index) => (
                <div
                  key={module.id}
                  className={`rounded-xl border ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  {/* Module Header */}
                  <div
                    className={`flex items-center gap-3 p-4 cursor-pointer ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleModuleExpand(module.id)}
                  >
                    <GripVertical size={20} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />

                    {expandedModules.has(module.id) ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}

                    <div className="flex-1">
                      <h3 className="font-medium">{module.title}</h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {module.lessons.length} lessons • {
                          module.lessons.reduce((sum, l) => sum + l.duration, 0)
                        } min
                      </p>
                    </div>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => moveModule(module.id, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded ${
                          index === 0
                            ? 'opacity-30'
                            : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveModule(module.id, 'down')}
                        disabled={index === modules.length - 1}
                        className={`p-1 rounded ${
                          index === modules.length - 1
                            ? 'opacity-30'
                            : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => setEditingModuleId(module.id)}
                        className={`p-2 rounded-lg ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                        title="Edit module"
                      >
                        <Settings size={18} />
                      </button>
                      <button
                        onClick={() => deleteModule(module.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                        title="Delete module"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Module Content (Expanded) */}
                  {expandedModules.has(module.id) && (
                    <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      {editingModuleId === module.id ? (
                        <ModuleEditor
                          module={module}
                          onSave={(updates) => {
                            updateModule(module.id, updates);
                            setEditingModuleId(null);
                          }}
                          onCancel={() => setEditingModuleId(null)}
                          isDarkMode={isDarkMode}
                        />
                      ) : (
                        <div className="p-4">
                          {module.lessons.length === 0 ? (
                            <div className={`text-center py-8 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              <p>No lessons in this module yet.</p>
                              <button
                                onClick={() => setEditingModuleId(module.id)}
                                className={`mt-2 text-indigo-500 hover:underline`}
                              >
                                Add lessons
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {module.lessons.map((lesson, lIndex) => (
                                <div
                                  key={lesson.id}
                                  className={`flex items-center gap-3 p-3 rounded-lg ${
                                    isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                                  }`}
                                >
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                                  }`}>
                                    {lIndex + 1}
                                  </span>
                                  <div className="flex-1">
                                    <p className="font-medium">{lesson.title}</p>
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {lesson.type} • {lesson.duration} min
                                      {lesson.isRequired && ' • Required'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => setEditingModuleId(module.id)}
                                className={`w-full mt-2 py-2 text-center rounded-lg border-2 border-dashed ${
                                  isDarkMode
                                    ? 'border-gray-600 text-gray-400 hover:border-gray-500'
                                    : 'border-gray-300 text-gray-500 hover:border-gray-400'
                                }`}
                              >
                                Edit lessons
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Module Button */}
            <button
              onClick={addModule}
              className={`w-full mt-4 py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 font-medium transition-colors ${
                isDarkMode
                  ? 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400'
                  : 'border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600'
              }`}
            >
              <Plus size={20} />
              Add Module
            </button>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Enrollment Settings */}
            <div className={`p-6 rounded-xl border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="font-semibold mb-4">Enrollment Settings</h3>

              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Allow Self-Enrollment</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Learners can enroll themselves without assignment
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowSelfEnrollment}
                  onChange={(e) => setSettings({ ...settings, allowSelfEnrollment: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600"
                />
              </label>
            </div>

            {/* Progress Settings */}
            <div className={`p-6 rounded-xl border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="font-semibold mb-4">Progress Settings</h3>

              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Sequential Progress</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Require learners to complete lessons in order
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requireSequentialProgress}
                  onChange={(e) => setSettings({ ...settings, requireSequentialProgress: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Show Progress Bar</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Display progress indicator to learners
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showProgressBar}
                  onChange={(e) => setSettings({ ...settings, showProgressBar: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600"
                />
              </label>
            </div>

            {/* Assessment Settings */}
            <div className={`p-6 rounded-xl border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="font-semibold mb-4">Assessment Settings</h3>

              <div className="py-3">
                <label className="block font-medium mb-2">Passing Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.passingScore}
                  onChange={(e) => setSettings({ ...settings, passingScore: Number(e.target.value) })}
                  className={`w-32 px-4 py-2 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                  } focus:ring-2 focus:ring-indigo-500 outline-none`}
                />
              </div>

              <div className="py-3">
                <label className="block font-medium mb-2">Maximum Attempts</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    value={settings.maxAttempts}
                    onChange={(e) => setSettings({ ...settings, maxAttempts: Number(e.target.value) })}
                    className={`w-32 px-4 py-2 rounded-lg border ${
                      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                    } focus:ring-2 focus:ring-indigo-500 outline-none`}
                  />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    0 = Unlimited
                  </span>
                </div>
              </div>

              <div className="py-3">
                <label className="block font-medium mb-2">Time Limit (minutes)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    value={settings.timeLimit || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      timeLimit: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="No limit"
                    className={`w-32 px-4 py-2 rounded-lg border ${
                      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                    } focus:ring-2 focus:ring-indigo-500 outline-none`}
                  />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Leave empty for no time limit
                  </span>
                </div>
              </div>
            </div>

            {/* Completion Settings */}
            <div className={`p-6 rounded-xl border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className="font-semibold mb-4">Completion Settings</h3>

              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Issue Certificate</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Generate certificate upon course completion
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableCertificate}
                  onChange={(e) => setSettings({ ...settings, enableCertificate: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Enable Discussions</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Allow learners to discuss course content
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableDiscussions}
                  onChange={(e) => setSettings({ ...settings, enableDiscussions: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseBuilder;
