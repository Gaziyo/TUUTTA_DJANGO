import React, { useState, useCallback, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  BookOpen,
  Clock,
  Award,
  Lock,
  Image,
  Target,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';
import { LearningPath, LearningPathCourse, Course, CertificationConfig } from '../../types/lms';

interface LearningPathBuilderProps {
  learningPath?: LearningPath;
  availableCourses?: Course[];
  orgId?: string;
  userId?: string;
  onSave?: (learningPath: Partial<LearningPath>) => Promise<void>;
  onCancel?: () => void;
  isDarkMode?: boolean;
}

type TabType = 'details' | 'courses' | 'certification';

const DEFAULT_CERTIFICATION: CertificationConfig = {
  enabled: true,
  title: '',
  description: '',
  validityPeriod: 365,
  renewalRequired: false,
  badgeImage: ''
};

export function LearningPathBuilder({
  learningPath,
  availableCourses = [],
  orgId = '',
  userId = '',
  onSave = async () => {},
  onCancel = () => {},
  isDarkMode = false
}: LearningPathBuilderProps) {
  const isEditing = !!learningPath;

  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [title, setTitle] = useState(learningPath?.title || '');
  const [description, setDescription] = useState(learningPath?.description || '');
  const [thumbnail, setThumbnail] = useState(learningPath?.thumbnail || '');
  const [courses, setCourses] = useState<LearningPathCourse[]>(learningPath?.courses || []);
  const [certification, setCertification] = useState<CertificationConfig>(
    learningPath?.certification || DEFAULT_CERTIFICATION
  );

  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  // Get course details
  const getCourse = useCallback((courseId: string): Course | undefined => {
    return availableCourses.find(c => c.id === courseId);
  }, [availableCourses]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return courses.reduce((sum, lpc) => {
      const course = getCourse(lpc.courseId);
      return sum + (course?.estimatedDuration || 0);
    }, 0);
  }, [courses, getCourse]);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Learning path title is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (courses.length < 2) {
      newErrors.courses = 'A learning path must contain at least 2 courses';
    }
    if (certification.enabled && !certification.title.trim()) {
      newErrors.certTitle = 'Certification title is required when enabled';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, courses, certification]);

  // Course management
  const addCourse = (courseId: string) => {
    if (courses.some(c => c.courseId === courseId)) return;

    const newCourse: LearningPathCourse = {
      courseId,
      order: courses.length,
      isRequired: true,
      unlockAfter: courses.length > 0 ? courses[courses.length - 1].courseId : undefined
    };
    setCourses([...courses, newCourse]);
    setShowCourseSelector(false);
    setCourseSearch('');
  };

  const removeCourse = (courseId: string) => {
    // Remove course and update unlockAfter references
    const updatedCourses = courses
      .filter(c => c.courseId !== courseId)
      .map((c, i) => ({
        ...c,
        order: i,
        unlockAfter: c.unlockAfter === courseId ? undefined : c.unlockAfter
      }));
    setCourses(updatedCourses);
  };

  const updateCourse = (courseId: string, updates: Partial<LearningPathCourse>) => {
    setCourses(courses.map(c => c.courseId === courseId ? { ...c, ...updates } : c));
  };

  const moveCourse = (courseId: string, direction: 'up' | 'down') => {
    const index = courses.findIndex(c => c.courseId === courseId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === courses.length - 1)
    ) {
      return;
    }

    const newCourses = [...courses];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newCourses[index], newCourses[targetIndex]] = [newCourses[targetIndex], newCourses[index]];
    setCourses(newCourses.map((c, i) => ({ ...c, order: i })));
  };

  // Filter available courses
  const filteredAvailableCourses = useMemo(() => {
    const addedIds = new Set(courses.map(c => c.courseId));
    return availableCourses
      .filter(c => c.status === 'published' && !addedIds.has(c.id))
      .filter(c => {
        if (!courseSearch) return true;
        const query = courseSearch.toLowerCase();
        return c.title.toLowerCase().includes(query) ||
               c.category.toLowerCase().includes(query);
      });
  }, [availableCourses, courses, courseSearch]);

  // Save handler
  const handleSave = async (publish: boolean = false) => {
    if (!validate()) {
      if (errors.courses) setActiveTab('courses');
      else if (errors.certTitle) setActiveTab('certification');
      else setActiveTab('details');
      return;
    }

    setSaving(true);
    try {
      const pathData: Partial<LearningPath> = {
        ...(learningPath?.id && { id: learningPath.id }),
        orgId,
        title: title.trim(),
        description: description.trim(),
        thumbnail,
        courses: courses.map((c, i) => ({ ...c, order: i })),
        certification: certification.enabled ? certification : undefined,
        estimatedDuration: totalDuration,
        status: publish ? 'published' : (learningPath?.status || 'draft'),
        createdBy: learningPath?.createdBy || userId
      };

      await onSave(pathData);
    } catch (error) {
      console.error('Failed to save learning path:', error);
    } finally {
      setSaving(false);
    }
  };

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
              {isEditing ? 'Edit Learning Path' : 'Create Learning Path'}
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {courses.length} courses • {Math.round(totalDuration / 60)} hours total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {learningPath?.status === 'draft' && (
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
          { id: 'details', label: 'Path Details', icon: BookOpen },
          { id: 'courses', label: 'Courses', icon: Target },
          { id: 'certification', label: 'Certification', icon: Award }
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
                Learning Path Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., New Employee Onboarding"
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

            {/* Description */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what learners will achieve by completing this learning path..."
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
                Thumbnail Image
              </label>
              <div className="flex items-start gap-4">
                {thumbnail ? (
                  <div className="relative">
                    <img
                      src={thumbnail}
                      alt="Path thumbnail"
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
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <h3 className="font-medium mb-3">Learning Path Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Courses</p>
                  <p className="text-2xl font-bold">{courses.length}</p>
                </div>
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Estimated Duration</p>
                  <p className="text-2xl font-bold">{Math.round(totalDuration / 60)}h</p>
                </div>
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Certification</p>
                  <p className="text-2xl font-bold">{certification.enabled ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="max-w-4xl mx-auto">
            {errors.courses && (
              <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'
              }`}>
                <AlertCircle size={20} />
                {errors.courses}
              </div>
            )}

            {/* Course List */}
            <div className="space-y-3">
              {courses.map((lpc, index) => {
                const course = getCourse(lpc.courseId);
                if (!course) return null;

                const prerequisite = lpc.unlockAfter ? getCourse(lpc.unlockAfter) : null;

                return (
                  <div
                    key={lpc.courseId}
                    className={`p-4 rounded-xl border ${
                      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical size={20} className={isDarkMode ? 'text-gray-600' : 'text-gray-400'} />

                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${
                        isDarkMode ? 'bg-indigo-900 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {index + 1}
                      </div>

                      {course.thumbnail && (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-16 h-10 object-cover rounded"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{course.title}</h4>
                        <div className={`flex items-center gap-3 text-sm ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {course.estimatedDuration} min
                          </span>
                          <span>{course.category}</span>
                          {prerequisite && (
                            <span className="flex items-center gap-1 text-yellow-500">
                              <Lock size={14} />
                              After: {prerequisite.title}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lpc.isRequired}
                            onChange={(e) => updateCourse(lpc.courseId, { isRequired: e.target.checked })}
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <span className="text-sm">Required</span>
                        </label>

                        <select
                          value={lpc.unlockAfter || ''}
                          onChange={(e) => updateCourse(lpc.courseId, {
                            unlockAfter: e.target.value || undefined
                          })}
                          className={`px-2 py-1 rounded border text-sm ${
                            isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <option value="">No prerequisite</option>
                          {courses
                            .filter(c => c.courseId !== lpc.courseId && c.order < index)
                            .map(c => {
                              const prereqCourse = getCourse(c.courseId);
                              return (
                                <option key={c.courseId} value={c.courseId}>
                                  After: {prereqCourse?.title}
                                </option>
                              );
                            })}
                        </select>

                        <button
                          onClick={() => moveCourse(lpc.courseId, 'up')}
                          disabled={index === 0}
                          className={`p-1 rounded ${
                            index === 0 ? 'opacity-30' : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                          }`}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveCourse(lpc.courseId, 'down')}
                          disabled={index === courses.length - 1}
                          className={`p-1 rounded ${
                            index === courses.length - 1 ? 'opacity-30' : (isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                          }`}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeCourse(lpc.courseId)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Course */}
            {showCourseSelector ? (
              <div className={`mt-4 p-4 rounded-xl border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Add Course to Path</h4>
                  <button
                    onClick={() => {
                      setShowCourseSelector(false);
                      setCourseSearch('');
                    }}
                    className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="relative mb-4">
                  <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Search courses..."
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                    } focus:ring-2 focus:ring-indigo-500 outline-none`}
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredAvailableCourses.length === 0 ? (
                    <p className={`text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      No available courses found
                    </p>
                  ) : (
                    filteredAvailableCourses.map(course => (
                      <button
                        key={course.id}
                        onClick={() => addCourse(course.id)}
                        className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                          isDarkMode
                            ? 'border-gray-700 hover:border-indigo-500 hover:bg-gray-700'
                            : 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50'
                        }`}
                      >
                        {course.thumbnail && (
                          <img
                            src={course.thumbnail}
                            alt={course.title}
                            className="w-12 h-8 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{course.title}</p>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {course.category} • {course.estimatedDuration} min
                          </p>
                        </div>
                        <Plus size={18} className="text-indigo-500" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCourseSelector(true)}
                className={`w-full mt-4 py-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 font-medium transition-colors ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400'
                    : 'border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600'
                }`}
              >
                <Plus size={20} />
                Add Course
              </button>
            )}
          </div>
        )}

        {/* Certification Tab */}
        {activeTab === 'certification' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Enable Toggle */}
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Award size={24} className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                  <div>
                    <p className="font-medium">Issue Certification</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Award a certificate when learners complete all courses
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={certification.enabled}
                  onChange={(e) => setCertification({ ...certification, enabled: e.target.checked })}
                  className="w-6 h-6 rounded text-indigo-600"
                />
              </label>
            </div>

            {certification.enabled && (
              <>
                {/* Certification Title */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Certification Title *
                  </label>
                  <input
                    type="text"
                    value={certification.title}
                    onChange={(e) => setCertification({ ...certification, title: e.target.value })}
                    placeholder="e.g., Certified Product Specialist"
                    className={`w-full px-4 py-3 rounded-lg border ${
                      errors.certTitle
                        ? 'border-red-500'
                        : (isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white')
                    } focus:ring-2 focus:ring-indigo-500 outline-none`}
                  />
                  {errors.certTitle && (
                    <p className="mt-1 text-sm text-red-500">{errors.certTitle}</p>
                  )}
                </div>

                {/* Certification Description */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Description (optional)
                  </label>
                  <textarea
                    value={certification.description || ''}
                    onChange={(e) => setCertification({ ...certification, description: e.target.value })}
                    placeholder="Description that appears on the certificate..."
                    rows={3}
                    className={`w-full px-4 py-3 rounded-lg border ${
                      isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                    } focus:ring-2 focus:ring-indigo-500 outline-none resize-none`}
                  />
                </div>

                {/* Validity Period */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Validity Period
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="0"
                      value={certification.validityPeriod || ''}
                      onChange={(e) => setCertification({
                        ...certification,
                        validityPeriod: e.target.value ? Number(e.target.value) : undefined
                      })}
                      placeholder="365"
                      className={`w-32 px-4 py-2 rounded-lg border ${
                        isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                      } focus:ring-2 focus:ring-indigo-500 outline-none`}
                    />
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                      days (0 or empty = never expires)
                    </span>
                  </div>
                </div>

                {/* Renewal Required */}
                <div className={`p-4 rounded-xl border ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium">Require Renewal</p>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Learners must recomplete the path to maintain certification
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={certification.renewalRequired}
                      onChange={(e) => setCertification({ ...certification, renewalRequired: e.target.checked })}
                      className="w-5 h-5 rounded text-indigo-600"
                    />
                  </label>
                </div>

                {/* Badge Image */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Badge Image (optional)
                  </label>
                  <div className="flex items-center gap-4">
                    {certification.badgeImage ? (
                      <div className="relative">
                        <img
                          src={certification.badgeImage}
                          alt="Badge"
                          className="w-20 h-20 object-contain rounded-lg"
                        />
                        <button
                          onClick={() => setCertification({ ...certification, badgeImage: '' })}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center ${
                        isDarkMode ? 'border-gray-600 text-gray-500' : 'border-gray-300 text-gray-400'
                      }`}>
                        <Award size={24} />
                      </div>
                    )}
                    <input
                      type="url"
                      value={certification.badgeImage || ''}
                      onChange={(e) => setCertification({ ...certification, badgeImage: e.target.value })}
                      placeholder="Enter badge image URL"
                      className={`flex-1 px-4 py-2 rounded-lg border ${
                        isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                      } focus:ring-2 focus:ring-indigo-500 outline-none`}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LearningPathBuilder;
