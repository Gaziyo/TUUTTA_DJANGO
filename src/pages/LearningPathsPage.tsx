// ============================================================================
// LEARNING PATHS PAGE
// Shows learning paths with progress and click-to-open functionality
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
  Map,
  Clock,
  Play,
  Search,
  BookOpen,
  CheckCircle,
  Circle,
  ChevronRight,
  Award,
  TrendingUp,
  Layers
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useLMSStore } from '../store/lmsStore';

interface LearningPathsPageProps {
  isDarkMode: boolean;
}

type FilterStatus = 'all' | 'in_progress' | 'completed' | 'not_started';

export default function LearningPathsPage({ isDarkMode }: LearningPathsPageProps) {
  const { openPath } = useAppContext();
  const {
    learningPaths,
    courses,
    enrollments,
    loadLearningPaths,
    loadEnrollments,
    currentOrg,
    currentMember
  } = useLMSStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrg) {
      loadLearningPaths();
      loadEnrollments();
    }
  }, [currentOrg, loadLearningPaths, loadEnrollments]);

  const userEnrollments = useMemo(() => {
    if (!currentMember) return [];
    return enrollments.filter(enrollment => enrollment.userId === currentMember.id);
  }, [enrollments, currentMember]);

  const learningPathCards = useMemo(() => {
    return learningPaths.map(path => {
      const pathEnrollments = userEnrollments.filter(enrollment => enrollment.learningPathId === path.id);
      const coursesCompleted = pathEnrollments.filter(enrollment => enrollment.status === 'completed').length;
      const totalCourses = path.courses.length || pathEnrollments.length || 0;
      const progress = totalCourses > 0 ? Math.round((coursesCompleted / totalCourses) * 100) : 0;
      const status: FilterStatus =
        progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started';
      const pathCourses = path.courses.map((courseItem) => {
        const course = courses.find(c => c.id === courseItem.courseId);
        const enrollment = userEnrollments.find(e => e.courseId === courseItem.courseId);
        return {
          name: course?.title || 'Course',
          completed: enrollment?.status === 'completed',
          current: false
        };
      });
      const currentIndex = pathCourses.findIndex(course => !course.completed);
      if (currentIndex >= 0) {
        pathCourses[currentIndex].current = true;
      }
      return {
        id: path.id,
        name: path.title,
        description: path.description,
        progress,
        coursesCompleted,
        totalCourses,
        estimatedTime: `${Math.max(1, Math.round(path.estimatedDuration / 60))} hours`,
        status,
        courses: pathCourses,
        certificate: path.certification?.enabled ?? false
      };
    });
  }, [learningPaths, courses, userEnrollments]);

  const filteredPaths = learningPathCards.filter(path => {
    const matchesSearch = path.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      path.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || path.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: learningPathCards.length,
    inProgress: learningPathCards.filter(p => p.status === 'in_progress').length,
    completed: learningPathCards.filter(p => p.status === 'completed').length,
    certificates: learningPathCards.filter(p => p.certificate).length
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Play className="w-5 h-5 text-blue-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className={`min-h-full p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Learning Paths
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Structured paths to master new skills and earn certificates
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
          <div className="flex items-center gap-3">
            <Map className={`w-8 h-8 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <div className="text-left">
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.total}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Total Paths
              </p>
            </div>
          </div>
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
          <div className="flex items-center gap-3">
            <TrendingUp className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div className="text-left">
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.inProgress}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                In Progress
              </p>
            </div>
          </div>
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
          <div className="flex items-center gap-3">
            <CheckCircle className={`w-8 h-8 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            <div className="text-left">
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.completed}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Completed
              </p>
            </div>
          </div>
        </button>

        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <Award className={`w-8 h-8 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            <div className="text-left">
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.certificates}
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Certificates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search learning paths..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-indigo-500'
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-indigo-500'
            } focus:outline-none focus:ring-2 focus:ring-indigo-500/20`}
          />
        </div>
      </div>

      {/* Paths List */}
      {filteredPaths.length === 0 ? (
        <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No learning paths found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPaths.map(path => (
            <div
              key={path.id}
              className={`rounded-xl overflow-hidden transition-all ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              } shadow-sm`}
            >
              {/* Path Header - Clickable */}
              <div
                onClick={() => openPath(path.id, path.name)}
                className="flex gap-4 p-4 cursor-pointer hover:bg-opacity-80 transition-colors"
              >
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
                  <Map className="w-6 h-6 text-gray-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(path.status)}
                        {path.certificate && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Award className="w-3 h-3" />
                            Certificate
                          </span>
                        )}
                      </div>
                      <h3 className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {path.name}
                      </h3>
                      <p className={`text-sm mt-1 line-clamp-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {path.description}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className={`text-2xl font-bold ${
                        path.progress === 100
                          ? isDarkMode ? 'text-green-400' : 'text-green-600'
                          : isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                      }`}>
                        {path.progress}%
                      </div>
                      {path.status !== 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPath(path.id, path.name);
                          }}
                          className="tuutta-button-primary text-sm px-4 py-2"
                        >
                          <Play className="w-4 h-4" />
                          {path.status === 'in_progress' ? 'Continue' : 'Start'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center gap-4 mt-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {path.coursesCompleted}/{path.totalCourses} courses
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {path.estimatedTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={`px-4 pb-2 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className={`h-2 rounded-full transition-all ${
                      path.progress === 100
                        ? 'bg-green-500'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`}
                    style={{ width: `${path.progress}%` }}
                  />
                </div>
              </div>

              {/* Expandable Course List */}
              <button
                onClick={() => setExpandedPath(expandedPath === path.id ? null : path.id)}
                className={`w-full px-4 py-3 flex items-center justify-between border-t ${
                  isDarkMode
                    ? 'border-gray-700 hover:bg-gray-700 text-gray-300'
                    : 'border-gray-100 hover:bg-gray-50 text-gray-600'
                } transition-colors`}
              >
                <span className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  View course outline
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${
                  expandedPath === path.id ? 'rotate-90' : ''
                }`} />
              </button>

              {expandedPath === path.id && (
                <div className={`px-4 pb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="space-y-2">
                    {path.courses.map((course, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          course.current
                            ? isDarkMode
                              ? 'bg-indigo-900/30 border border-indigo-500/50'
                              : 'bg-indigo-50 border border-indigo-200'
                            : isDarkMode
                              ? 'bg-gray-700/50'
                              : 'bg-gray-50'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          course.completed
                            ? 'bg-green-500 text-white'
                            : course.current
                              ? isDarkMode
                                ? 'bg-indigo-600 text-white'
                                : 'bg-indigo-500 text-white'
                              : isDarkMode
                                ? 'bg-gray-600 text-gray-400'
                                : 'bg-gray-200 text-gray-500'
                        }`}>
                          {course.completed ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-medium">{index + 1}</span>
                          )}
                        </div>
                        <span className={`flex-1 text-sm ${
                          course.completed
                            ? isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            : course.current
                              ? isDarkMode ? 'text-white font-medium' : 'text-gray-900 font-medium'
                              : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {course.name}
                        </span>
                        {course.current && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isDarkMode
                              ? 'bg-indigo-600 text-white'
                              : 'bg-indigo-500 text-white'
                          }`}>
                            Current
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
