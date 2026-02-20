// ============================================================================
// MY COURSES PAGE
// Shows enrolled courses with progress and click-to-open functionality
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Clock,
  Play,
  Search,
  Filter,
  Grid,
  List,
  ChevronDown,
  Star,
  Users,
  CheckCircle,
  Circle,
  MoreVertical
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useLMSStore } from '../store/lmsStore';

interface MyCoursesPageProps {
  isDarkMode: boolean;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'in_progress' | 'completed' | 'not_started';

export default function MyCoursesPage({ isDarkMode }: MyCoursesPageProps) {
  const { openCourse } = useAppContext();
  const { courses, enrollments, loadCourses, loadEnrollments, currentOrg, currentMember } = useLMSStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (currentOrg) {
      loadCourses();
      loadEnrollments();
    }
  }, [currentOrg, loadCourses, loadEnrollments]);

  const userEnrollments = useMemo(() => {
    if (!currentMember) return [];
    return enrollments.filter(enrollment => enrollment.userId === currentMember.id);
  }, [enrollments, currentMember]);

  const courseCards = useMemo(() => {
    return userEnrollments.map(enrollment => {
      const course = courses.find(c => c.id === enrollment.courseId);
      if (!course) return null;
      const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
      const durationHours = Math.max(1, Math.round(course.estimatedDuration / 60));
      return {
        id: course.id,
        name: course.title,
        description: course.description || course.shortDescription || 'No description provided.',
        progress: enrollment.progress,
        thumbnail: course.thumbnail,
        duration: `${durationHours} hours`,
        lessonsCompleted: 0,
        totalLessons,
        category: course.category || 'General',
        status: enrollment.status === 'completed'
          ? 'completed'
          : enrollment.progress > 0
            ? 'in_progress'
            : 'not_started',
        lastAccessed: enrollment.lastAccessedAt ? new Date(enrollment.lastAccessedAt).toLocaleDateString() : null,
        dueDate: enrollment.dueDate ? new Date(enrollment.dueDate).toLocaleDateString() : null
      };
    }).filter((course): course is NonNullable<typeof course> => Boolean(course));
  }, [courses, userEnrollments]);

  // Filter courses
  const filteredCourses = courseCards.filter(course => {
    const matchesSearch = course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || course.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: courseCards.length,
    inProgress: courseCards.filter(c => c.status === 'in_progress').length,
    completed: courseCards.filter(c => c.status === 'completed').length,
    notStarted: courseCards.filter(c => c.status === 'not_started').length
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'
          }`}>
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700'
          }`}>
            <Play className="w-3 h-3" />
            In Progress
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
          }`}>
            <Circle className="w-3 h-3" />
            Not Started
          </span>
        );
    }
  };

  return (
    <div className={`min-h-full p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          My Courses
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {stats.total} courses enrolled
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-xl transition-all ${
            filterStatus === 'all'
              ? isDarkMode
                ? 'bg-indigo-600/20 border-2 border-indigo-500'
                : 'bg-indigo-50 border-2 border-indigo-500'
              : isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700'
                : 'bg-white hover:shadow-md'
          } shadow-sm`}
        >
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.total}
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            All Courses
          </p>
        </button>

        <button
          onClick={() => setFilterStatus('in_progress')}
          className={`p-4 rounded-xl transition-all ${
            filterStatus === 'in_progress'
              ? isDarkMode
                ? 'bg-blue-600/20 border-2 border-blue-500'
                : 'bg-blue-50 border-2 border-blue-500'
              : isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700'
                : 'bg-white hover:shadow-md'
          } shadow-sm`}
        >
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {stats.inProgress}
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            In Progress
          </p>
        </button>

        <button
          onClick={() => setFilterStatus('completed')}
          className={`p-4 rounded-xl transition-all ${
            filterStatus === 'completed'
              ? isDarkMode
                ? 'bg-green-600/20 border-2 border-green-500'
                : 'bg-green-50 border-2 border-green-500'
              : isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700'
                : 'bg-white hover:shadow-md'
          } shadow-sm`}
        >
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
            {stats.completed}
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Completed
          </p>
        </button>

        <button
          onClick={() => setFilterStatus('not_started')}
          className={`p-4 rounded-xl transition-all ${
            filterStatus === 'not_started'
              ? isDarkMode
                ? 'bg-gray-600/20 border-2 border-gray-500'
                : 'bg-gray-100 border-2 border-gray-400'
              : isDarkMode
                ? 'bg-gray-800 hover:bg-gray-700'
                : 'bg-white hover:shadow-md'
          } shadow-sm`}
        >
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {stats.notStarted}
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Not Started
          </p>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-indigo-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <div className={`flex rounded-xl border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-l-xl ${
                viewMode === 'grid'
                  ? isDarkMode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 hover:text-white'
                    : 'bg-white text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-r-xl ${
                viewMode === 'list'
                  ? isDarkMode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-500 text-white'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 hover:text-white'
                    : 'bg-white text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Course Grid/List */}
      {filteredCourses.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No courses found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              onClick={() => openCourse(course.id, course.name)}
              className={`rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
                isDarkMode ? 'bg-gray-800 hover:shadow-xl' : 'bg-white hover:shadow-lg'
              } shadow-sm`}
            >
              <div className="relative h-40 bg-gray-200 flex items-center justify-center">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-8 h-8 text-gray-500" />
                )}
                <div className="absolute top-3 left-3">
                  {getStatusBadge(course.status)}
                </div>
                {course.status !== 'completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCourse(course.id, course.name);
                    }}
                    className="absolute bottom-3 right-3 p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-lg"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="p-4">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {course.category}
                </span>

                <h3 className={`font-semibold mt-2 line-clamp-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {course.name}
                </h3>

                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {course.duration}
                </p>

                <div className={`flex items-center gap-3 mt-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    {course.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {course.duration}
                  </span>
                </div>

                {course.status !== 'not_started' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                        Progress
                      </span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                        {course.progress}%
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-2 rounded-full ${
                          course.progress === 100
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {course.dueDate && (
                  <p className={`text-xs mt-3 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    Due: {course.dueDate}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              onClick={() => openCourse(course.id, course.name)}
              className={`flex gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.005] ${
                isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:shadow-md'
              } shadow-sm`}
            >
              <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookOpen className="w-6 h-6 text-gray-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(course.status)}
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {course.category}
                      </span>
                    </div>
                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {course.name}
                    </h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {course.duration}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {course.status !== 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCourse(course.id, course.name);
                        }}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          isDarkMode
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : 'bg-indigo-500 hover:bg-indigo-600'
                        } text-white`}
                      >
                        <Play className="w-4 h-4" />
                        {course.status === 'in_progress' ? 'Continue' : 'Start'}
                      </button>
                    )}
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className={`p-2 rounded-lg ${
                        isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {course.status !== 'not_started' && (
                  <div className="mt-3 max-w-md">
                    <div className="flex justify-between text-sm mb-1">
                      <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                        {course.lessonsCompleted}/{course.totalLessons} lessons
                      </span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                        {course.progress}%
                      </span>
                    </div>
                    <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-2 rounded-full ${
                          course.progress === 100
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        }`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
