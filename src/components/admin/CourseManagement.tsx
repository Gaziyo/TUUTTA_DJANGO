import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { useAppContext } from '../../context/AppContext';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Course, CourseModule, Lesson, LessonType, CourseSettings } from '../../types/lms';
import { LessonEditor } from './LessonEditor';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import {
  BookOpen,
  Plus,
  Filter,
  Edit,
  Trash2,
  Eye,
  Copy,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Video,
  FileAudio,
  FileText,
  HelpCircle,
  Link,
  Upload,
  GripVertical,
  Save,
  X,
  Clock,
  Users,
  BarChart2,
  CheckCircle,
  Archive
} from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit';
type CourseStatus = 'all' | 'draft' | 'published' | 'archived';

const LESSON_TYPE_ICONS: Record<LessonType, React.ReactNode> = {
  video: <Video className="w-4 h-4" />,
  audio: <FileAudio className="w-4 h-4" />,
  document: <FileText className="w-4 h-4" />,
  text: <FileText className="w-4 h-4" />,
  quiz: <HelpCircle className="w-4 h-4" />,
  assignment: <Upload className="w-4 h-4" />,
  scorm: <BookOpen className="w-4 h-4" />,
  external_link: <Link className="w-4 h-4" />,
  interactive: <BarChart2 className="w-4 h-4" />
};

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  archived: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
};

interface CourseManagementProps {
  isDarkMode?: boolean;
}

export const CourseManagement: React.FC<CourseManagementProps> = () => {
  const { user } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const {
    currentOrg,
    courses,
    loadCourses,
    createCourse,
    updateCourse,
    publishCourse,
    archiveCourse,
    deleteCourse,
    isLoading,
    setSelectedCourseId
  } = useLMSStore();
  const { openCourse, navigate } = useAppContext();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<CourseStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrg?.id) {
      loadCourses();
    }
  }, [currentOrg?.id, loadCourses]);

  const filteredCourses = courses.filter(course => {
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateCourse = () => {
    setSelectedCourse(null);
    setViewMode('create');
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setViewMode('edit');
  };

  const handleDeleteCourse = async (courseId: string) => {
    await deleteCourse(courseId);
    setShowDeleteConfirm(null);
  };

  const handleDuplicateCourse = async (course: Course) => {
    if (!currentOrg || !user) return;

    const duplicatedCourse: Omit<Course, 'id' | 'createdAt' | 'updatedAt'> = {
      ...course,
      title: `${course.title} (Copy)`,
      status: 'draft',
      publishedAt: undefined,
      createdBy: user.id,
      version: 1
    };

    await createCourse(duplicatedCourse);
  };

  const handlePublishCourse = async (course: Course) => {
    await publishCourse(course.id);
  };

  const handleArchiveCourse = async (course: Course) => {
    await archiveCourse(course.id);
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <CourseEditor
        course={selectedCourse}
        isDarkMode={isDarkMode}
        onSave={async (courseData) => {
          let savedCourse: Course | null = null;
          if (selectedCourse) {
            await updateCourse(selectedCourse.id, courseData);
            savedCourse = { ...selectedCourse, ...courseData } as Course;
          } else if (currentOrg && user) {
            const created = await createCourse({
              ...courseData,
              orgId: currentOrg.id,
              createdBy: user.id,
              status: 'draft',
              version: 1
            });
            savedCourse = created;
          }
          setViewMode('list');
          return savedCourse;
        }}
        onSaveAndDisplay={async (courseData) => {
          let savedCourse: Course | null = null;
          if (selectedCourse) {
            await updateCourse(selectedCourse.id, courseData);
            savedCourse = { ...selectedCourse, ...courseData } as Course;
          } else if (currentOrg && user) {
            savedCourse = await createCourse({
              ...courseData,
              orgId: currentOrg.id,
              createdBy: user.id,
              status: 'draft',
              version: 1
            });
          }
          setViewMode('list');
          if (savedCourse) {
            openCourse(savedCourse.id, savedCourse.title);
          }
          return savedCourse;
        }}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      <AdminPageHeader
        title="Course Management"
        subtitle="Create, manage, and publish training courses"
        isDarkMode={isDarkMode}
        badge="Content"
        actions={(
          <button
            onClick={handleCreateCourse}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Course
          </button>
        )}
      />

      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <AdminSection title="Filters" isDarkMode={isDarkMode} minHeight="72px">
          <AdminToolbar
            isDarkMode={isDarkMode}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search courses..."
            rightContent={(
              <>
                <Filter className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as CourseStatus)}
                  aria-label="Filter by status"
                  className={`px-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-indigo-500`}
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </>
            )}
          />
        </AdminSection>
      </div>

      {/* Course List */}
      <div className="flex-1 overflow-auto p-6">
        <AdminSection title="Courses" isDarkMode={isDarkMode} minHeight="240px">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No courses found</p>
              <p className="text-sm">Create your first course to get started</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  isDarkMode={isDarkMode}
                  onView={() => openCourse(course.id, course.title)}
                  onEnroll={() => {
                    setSelectedCourseId(course.id);
                    navigate('/admin/enrollments');
                  }}
                  onEdit={() => handleEditCourse(course)}
                  onDelete={() => setShowDeleteConfirm(course.id)}
                  onDuplicate={() => handleDuplicateCourse(course)}
                  onPublish={() => handlePublishCourse(course)}
                  onArchive={() => handleArchiveCourse(course)}
                />
              ))}
            </div>
          )}
        </AdminSection>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-xl max-w-md w-full mx-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-semibold mb-2">Delete Course?</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This action cannot be undone. All enrollments and progress data will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCourse(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Course Card Component
interface CourseCardProps {
  course: Course;
  isDarkMode: boolean;
  onView: () => void;
  onEnroll: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPublish: () => void;
  onArchive: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  isDarkMode,
  onView,
  onEnroll,
  onEdit,
  onDelete,
  onDuplicate,
  onPublish,
  onArchive
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);

  return (
    <div className={`p-4 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } hover:shadow-lg transition-shadow`}>
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className={`w-32 h-20 rounded-lg flex-shrink-0 flex items-center justify-center ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          {course.thumbnail ? (
            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <BookOpen className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold truncate">{course.title}</h3>
              <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {course.shortDescription || course.description}
              </p>
            </div>

            {/* Actions Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                aria-label="Course actions menu"
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className={`absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border z-20 ${
                    isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <button
                      onClick={() => { onView(); setShowMenu(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Eye className="w-4 h-4" /> View course
                    </button>
                    <button
                      onClick={() => { onEnroll(); setShowMenu(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Users className="w-4 h-4" /> Enrol users
                    </button>
                    <button
                      onClick={() => { onEdit(); setShowMenu(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={() => { onDuplicate(); setShowMenu(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Copy className="w-4 h-4" /> Duplicate
                    </button>
                    {course.status === 'draft' && (
                      <button
                        onClick={() => { onPublish(); setShowMenu(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-left text-green-600 ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" /> Publish
                      </button>
                    )}
                    {course.status === 'published' && (
                      <button
                        onClick={() => { onArchive(); setShowMenu(false); }}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-left text-orange-600 ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <Archive className="w-4 h-4" /> Archive
                      </button>
                    )}
                    <hr className={isDarkMode ? 'border-gray-700' : 'border-gray-200'} />
                    <button
                      onClick={() => { onDelete(); setShowMenu(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 mt-3">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[course.status]}`}>
              {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${DIFFICULTY_COLORS[course.difficulty]}`}>
              {course.difficulty.charAt(0).toUpperCase() + course.difficulty.slice(1)}
            </span>
            <span className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <BookOpen className="w-4 h-4" />
              {course.modules.length} modules
            </span>
            <span className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <FileText className="w-4 h-4" />
              {totalLessons} lessons
            </span>
            <span className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Clock className="w-4 h-4" />
              {course.estimatedDuration} min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Course Editor Component
interface CourseEditorProps {
  course: Course | null;
  isDarkMode: boolean;
  onSave: (course: Partial<Course>) => Promise<Course | null>;
  onSaveAndDisplay: (course: Partial<Course>) => Promise<Course | null>;
  onCancel: () => void;
}

const CourseEditor: React.FC<CourseEditorProps> = ({
  course,
  isDarkMode,
  onSave,
  onSaveAndDisplay,
  onCancel
}) => {
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [shortDescription, setShortDescription] = useState(course?.shortDescription || '');
  const [category, setCategory] = useState(course?.category || '');
  const [difficulty, setDifficulty] = useState<Course['difficulty']>(course?.difficulty || 'beginner');
  const [estimatedDuration, setEstimatedDuration] = useState(course?.estimatedDuration || 60);
  const [modules, setModules] = useState<CourseModule[]>(course?.modules || []);
  const [tags, setTags] = useState<string[]>(course?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lessonId: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const defaultSettings: CourseSettings = {
    allowSelfEnrollment: false,
    allowGuestAccess: false,
    allowCohortSync: false,
    requireSequentialProgress: true,
    showProgressBar: true,
    enableDiscussions: false,
    enableCertificate: true,
    passingScore: 70,
    maxAttempts: 3
  };
  const [courseSettings, setCourseSettings] = useState<CourseSettings>(() => ({
    ...defaultSettings,
    ...(course?.settings || {})
  }));

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      title,
      description,
      shortDescription,
      category,
      difficulty,
      estimatedDuration,
      modules,
      tags,
      settings: courseSettings
    });
    setSaving(false);
  };

  const handleSaveAndDisplay = async () => {
    setSaving(true);
    await onSaveAndDisplay({
      title,
      description,
      shortDescription,
      category,
      difficulty,
      estimatedDuration,
      modules,
      tags,
      settings: courseSettings
    });
    setSaving(false);
  };

  const addModule = () => {
    const newModule: CourseModule = {
      id: `module-${Date.now()}`,
      title: `Module ${modules.length + 1}`,
      order: modules.length,
      lessons: []
    };
    setModules([...modules, newModule]);
    setExpandedModules(new Set([...expandedModules, newModule.id]));
  };

  const updateModule = (moduleId: string, updates: Partial<CourseModule>) => {
    setModules(modules.map(m => m.id === moduleId ? { ...m, ...updates } : m));
  };

  const moveModule = (moduleId: string, direction: 'up' | 'down') => {
    const index = modules.findIndex(m => m.id === moduleId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;
    const reordered = [...modules];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setModules(reordered.map((m, i) => ({ ...m, order: i })));
  };

  const deleteModule = (moduleId: string) => {
    setModules(modules.filter(m => m.id !== moduleId));
  };

  const addLesson = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const newLesson: Lesson = {
      id: `lesson-${Date.now()}`,
      title: `Lesson ${module.lessons.length + 1}`,
      type: 'text',
      content: {},
      duration: 10,
      order: module.lessons.length,
      isRequired: true
    };

    updateModule(moduleId, {
      lessons: [...module.lessons, newLesson]
    });
  };

  const updateLesson = (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    updateModule(moduleId, {
      lessons: module.lessons.map(l => l.id === lessonId ? { ...l, ...updates } : l)
    });
  };

  const moveLesson = (moduleId: string, lessonId: string, direction: 'up' | 'down') => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;
    const index = module.lessons.findIndex(l => l.id === lessonId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= module.lessons.length) return;
    const reordered = [...module.lessons];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    updateModule(moduleId, {
      lessons: reordered.map((l, i) => ({ ...l, order: i }))
    });
  };

  const deleteLesson = (moduleId: string, lessonId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    updateModule(moduleId, {
      lessons: module.lessons.filter(l => l.id !== lessonId)
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const toggleModuleExpanded = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{course ? 'Edit course settings' : 'Add a new course'}</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {course ? 'Update course details, content, and enrolment options' : 'Define the course and start building content'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${
                isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save and return'}
            </button>
            <button
              onClick={handleSaveAndDisplay}
              disabled={saving || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eye className="w-5 h-5" />
              Save and display
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Info */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Course Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter course title"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Short Description
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Brief summary (displayed in course cards)"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Full Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed course description"
                  rows={4}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Compliance, Sales"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Course['difficulty'])}
                    aria-label="Difficulty"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-indigo-500`}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 0)}
                    min={0}
                    aria-label="Duration (minutes)"
                    placeholder="0"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-indigo-500`}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Tags
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag"
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:ring-2 focus:ring-indigo-500`}
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Enrolment Methods */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Enrolment Methods</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={courseSettings.allowSelfEnrollment}
                  onChange={(e) => setCourseSettings({
                    ...courseSettings,
                    allowSelfEnrollment: e.target.checked
                  })}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-sm">Self enrolment</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Learners can join this course without admin assignment.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={courseSettings.allowCohortSync}
                  onChange={(e) => setCourseSettings({
                    ...courseSettings,
                    allowCohortSync: e.target.checked
                  })}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-sm">Cohort sync</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Auto-enrol users from synced cohorts or teams.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={courseSettings.allowGuestAccess}
                  onChange={(e) => setCourseSettings({
                    ...courseSettings,
                    allowGuestAccess: e.target.checked
                  })}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-sm">Guest access</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Allow read-only preview access for guests.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Modules & Lessons */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Course Content</h2>
              <button
                onClick={addModule}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Add Module
              </button>
            </div>

            {modules.length === 0 ? (
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No modules yet. Add your first module to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((module, moduleIndex) => (
                  <div
                    key={module.id}
                    className={`border rounded-lg ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    {/* Module Header */}
                    <div
                      className={`flex items-center gap-3 p-3 cursor-pointer ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleModuleExpanded(module.id)}
                    >
                      <GripVertical className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      {expandedModules.has(module.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <input
                        type="text"
                        value={module.title}
                        onChange={(e) => updateModule(module.id, { title: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Module title"
                        placeholder="Module title"
                        className={`flex-1 px-2 py-1 rounded border ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:ring-2 focus:ring-indigo-500`}
                      />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {module.lessons.length} lessons
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModule(module.id, 'up'); }}
                          disabled={moduleIndex === 0}
                          aria-label="Move module up"
                          title="Move module up"
                          className={`p-1 rounded ${
                            moduleIndex === 0
                              ? 'opacity-40 cursor-not-allowed'
                              : isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                          }`}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModule(module.id, 'down'); }}
                          disabled={moduleIndex === modules.length - 1}
                          aria-label="Move module down"
                          title="Move module down"
                          className={`p-1 rounded ${
                            moduleIndex === modules.length - 1
                              ? 'opacity-40 cursor-not-allowed'
                              : isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                          }`}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteModule(module.id); }}
                        aria-label="Delete module"
                        title="Delete module"
                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Lessons */}
                    {expandedModules.has(module.id) && (
                      <div className={`p-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        {module.lessons.length === 0 ? (
                          <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            No lessons in this module
                          </p>
                        ) : (
                          <div className="space-y-2 mb-3">
                            {module.lessons.map((lesson, lessonIndex) => {
                              const isEditing = editingLesson?.moduleId === module.id && editingLesson.lessonId === lesson.id;
                              if (isEditing) {
                                return (
                                  <LessonEditor
                                    key={lesson.id}
                                    lesson={lesson}
                                    isDarkMode={isDarkMode}
                                    onSave={(updates) => {
                                      updateLesson(module.id, lesson.id, updates);
                                      setEditingLesson(null);
                                    }}
                                    onCancel={() => setEditingLesson(null)}
                                  />
                                );
                              }

                              return (
                                <div
                                  key={lesson.id}
                                  className={`flex items-center gap-3 p-2 rounded-lg ${
                                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                                  }`}
                                >
                                  <GripVertical className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                    {LESSON_TYPE_ICONS[lesson.type]}
                                  </span>
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => moveLesson(module.id, lesson.id, 'up')}
                                      disabled={lessonIndex === 0}
                                      aria-label="Move lesson up"
                                      title="Move lesson up"
                                      className={`p-1 rounded ${
                                        lessonIndex === 0
                                          ? 'opacity-40 cursor-not-allowed'
                                          : isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                                      }`}
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => moveLesson(module.id, lesson.id, 'down')}
                                      disabled={lessonIndex === module.lessons.length - 1}
                                      aria-label="Move lesson down"
                                      title="Move lesson down"
                                      className={`p-1 rounded ${
                                        lessonIndex === module.lessons.length - 1
                                          ? 'opacity-40 cursor-not-allowed'
                                          : isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
                                      }`}
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={lesson.title}
                                    onChange={(e) => updateLesson(module.id, lesson.id, { title: e.target.value })}
                                    aria-label="Lesson title"
                                    placeholder="Lesson title"
                                    className={`flex-1 px-2 py-1 rounded border text-sm ${
                                      isDarkMode
                                        ? 'bg-gray-600 border-gray-500 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    } focus:ring-2 focus:ring-indigo-500`}
                                  />
                                  <select
                                    value={lesson.type}
                                    onChange={(e) => updateLesson(module.id, lesson.id, { type: e.target.value as LessonType })}
                                    aria-label="Lesson type"
                                    className={`px-2 py-1 rounded border text-sm ${
                                      isDarkMode
                                        ? 'bg-gray-600 border-gray-500 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    } focus:ring-2 focus:ring-indigo-500`}
                                  >
                                    <option value="video">Video</option>
                                    <option value="document">Document</option>
                                    <option value="text">Text</option>
                                    <option value="quiz">Quiz</option>
                                    <option value="assignment">Assignment</option>
                                    <option value="scorm">SCORM</option>
                                    <option value="interactive">Interactive</option>
                                    <option value="external_link">Link</option>
                                  </select>
                                  <input
                                    type="number"
                                    value={lesson.duration}
                                    onChange={(e) => updateLesson(module.id, lesson.id, { duration: parseInt(e.target.value) || 0 })}
                                    aria-label="Lesson duration (minutes)"
                                    className={`w-16 px-2 py-1 rounded border text-sm ${
                                      isDarkMode
                                        ? 'bg-gray-600 border-gray-500 text-white'
                                        : 'bg-white border-gray-300 text-gray-900'
                                    } focus:ring-2 focus:ring-indigo-500`}
                                    title="Duration (min)"
                                  />
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>min</span>
                                  <label className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    <input
                                      type="checkbox"
                                      checked={lesson.isRequired}
                                      onChange={(e) => updateLesson(module.id, lesson.id, { isRequired: e.target.checked })}
                                    />
                                    Required
                                  </label>
                                  <button
                                    onClick={() => setEditingLesson({ moduleId: module.id, lessonId: lesson.id })}
                                    aria-label="Edit lesson"
                                    className={`p-1 rounded ${
                                      isDarkMode ? 'text-indigo-300 hover:bg-gray-600' : 'text-indigo-600 hover:bg-gray-200'
                                    }`}
                                    title="Edit lesson content"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteLesson(module.id, lesson.id)}
                                    aria-label="Delete lesson"
                                    title="Delete lesson"
                                    className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <button
                          onClick={() => addLesson(module.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg w-full justify-center ${
                            isDarkMode
                              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          }`}
                        >
                          <Plus className="w-4 h-4" />
                          Add Lesson
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CourseManagementWithErrorBoundary(props: React.ComponentProps<typeof CourseManagement>) {
  return (
    <ErrorBoundary title="CourseManagement">
      <CourseManagement {...props} />
    </ErrorBoundary>
  );
}
