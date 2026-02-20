// ============================================================================
// HOME DASHBOARD
// Unified home page showing courses, paths, activity, and quick stats
// ============================================================================

import React, { useEffect, useMemo } from 'react';
import {
  BookOpen,
  Map as MapIcon,
  Trophy,
  Flame,
  TrendingUp,
  Clock,
  Play,
  ChevronRight,
  Star,
  Users,
  Award,
  Target,
  Sparkles,
  Calendar,
  Bell
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useStore } from '../store';
import { useLMSStore } from '../store/lmsStore';

interface HomeDashboardProps {
  isDarkMode: boolean;
}

export default function HomeDashboard({ isDarkMode }: HomeDashboardProps) {
  const { openCourse, openPath, currentContext, orgContext, navigate } = useAppContext();
  const { getUserLevel, getUserXP, getLearningStreak, getAchievements } = useStore();
  const {
    courses,
    enrollments,
    learningPaths,
    loadCourses,
    loadEnrollments,
    loadLearningPaths,
    currentOrg,
    currentMember
  } = useLMSStore();

  const userLevel = getUserLevel();
  const userXP = getUserXP();
  const streak = getLearningStreak();
  const achievements = getAchievements();

  useEffect(() => {
    if (currentOrg) {
      loadCourses();
      loadEnrollments();
      loadLearningPaths();
    }
  }, [currentOrg, loadCourses, loadEnrollments, loadLearningPaths]);

  const userEnrollments = useMemo(() => {
    if (!currentMember) return [];
    return enrollments.filter(enrollment => enrollment.userId === currentMember.id);
  }, [enrollments, currentMember]);

  const enrollmentByCourseId = useMemo(() => {
    const map = new Map<string, typeof userEnrollments[number]>();
    userEnrollments.forEach((enrollment) => map.set(enrollment.courseId, enrollment));
    return map;
  }, [userEnrollments]);

  const enrichedCourses = useMemo(() => {
    return courses.map(course => {
      const enrollment = enrollmentByCourseId.get(course.id);
      const totalLessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
      return {
        id: course.id,
        name: course.title,
        description: course.description || course.shortDescription || 'No description provided.',
        progress: enrollment?.progress ?? 0,
        thumbnail: course.thumbnail,
        duration: `${Math.max(1, Math.round(course.estimatedDuration / 60))} hours`,
        lessonsCompleted: 0,
        totalLessons,
        category: course.category || 'General'
      };
    });
  }, [courses, enrollmentByCourseId]);

  const inProgressCourses = enrichedCourses.filter(c => c.progress > 0 && c.progress < 100);
  const recommendedCourses = enrichedCourses.filter(c => c.progress === 0);

  const pathSummaries = useMemo(() => {
    return learningPaths.map(path => {
      const pathEnrollments = userEnrollments.filter(enrollment => enrollment.learningPathId === path.id);
      const coursesCompleted = pathEnrollments.filter(enrollment => enrollment.status === 'completed').length;
      const totalCourses = path.courses.length || pathEnrollments.length || 0;
      const progress = totalCourses > 0 ? Math.round((coursesCompleted / totalCourses) * 100) : 0;
      return {
        id: path.id,
        name: path.title,
        description: path.description,
        progress,
        coursesCompleted,
        totalCourses,
        estimatedTime: `${Math.max(1, Math.round(path.estimatedDuration / 60))} hours`,
        skills: []
      };
    });
  }, [learningPaths, userEnrollments]);

  return (
    <div className={`min-h-full p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Welcome back! 👋
        </h1>
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {currentContext === 'org' && orgContext
            ? `Continue your learning journey at ${orgContext.orgName}`
            : 'Ready to continue your learning journey?'}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-indigo-900/50' : 'bg-indigo-100'
            }`}>
              <Trophy className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {userLevel.level}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Level
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-amber-900/50' : 'bg-amber-100'
            }`}>
              <Star className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {userXP}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Total XP
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-orange-900/50' : 'bg-orange-100'
            }`}>
              <Flame className={`w-5 h-5 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {streak.currentStreak}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Day Streak
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isDarkMode ? 'bg-green-900/50' : 'bg-green-100'
            }`}>
              <Award className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {achievements.filter(a => a.unlockedAt).length}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Achievements
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Learning */}
          {inProgressCourses.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Continue Learning
                </h2>
                <button className={`text-sm flex items-center gap-1 ${
                  isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                }`}>
                  View All <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {inProgressCourses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => openCourse(course.id, course.name)}
                    className={`flex gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${
                      isDarkMode
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-white hover:shadow-md'
                    } shadow-sm`}
                  >
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
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
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isDarkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                          }`}>
                            {course.category}
                          </span>
                          <h3 className={`font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {course.name}
                          </h3>
                        </div>
                        <button className={`p-2 rounded-lg ${
                          isDarkMode
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : 'bg-indigo-500 hover:bg-indigo-600'
                        } text-white`}>
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                      <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {course.lessonsCompleted} of {course.totalLessons} lessons completed
                      </p>
                      <div className="mt-2">
                        <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {course.progress}% complete
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recommended Courses */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <Sparkles className="w-5 h-5 inline mr-2 text-amber-500" />
                Recommended for You
              </h2>
            </div>

            {recommendedCourses.length === 0 ? (
              <div className={`p-6 rounded-xl border ${
                isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'
              }`}>
                No recommended courses yet. Enroll in a course or ask an admin to assign one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedCourses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => openCourse(course.id, course.name)}
                    className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                      isDarkMode
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-white hover:shadow-md'
                    } shadow-sm`}
                  >
                    <div className="w-full h-32 rounded-lg overflow-hidden mb-3 bg-gray-200 flex items-center justify-center">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <BookOpen className="w-5 h-5" />
                          Course Preview
                        </div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'
                    }`}>
                      New
                    </span>
                    <h3 className={`font-semibold mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {course.name}
                    </h3>
                    <p className={`text-sm mt-1 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {course.description}
                    </p>
                    <div className={`flex items-center gap-4 mt-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {course.totalLessons} lessons
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Learning Paths */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <MapIcon className="w-5 h-5 inline mr-2 text-blue-500" />
                Your Learning Paths
              </h2>
              <button className={`text-sm flex items-center gap-1 ${
                isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
              }`}>
                Browse Paths <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {pathSummaries.length === 0 ? (
              <div className={`p-6 rounded-xl border ${
                isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'
              }`}>
                No learning paths available yet. Ask an admin to publish a path.
              </div>
            ) : (
              <div className="space-y-4">
                {pathSummaries.map(path => (
                  <div
                    key={path.id}
                    onClick={() => openPath(path.id, path.name)}
                    className={`p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${
                      isDarkMode
                        ? 'bg-gray-800 hover:bg-gray-700'
                        : 'bg-white hover:shadow-md'
                    } shadow-sm`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {path.name}
                        </h3>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {path.description}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-2xl font-bold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                          {path.progress}%
                        </div>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {path.coursesCompleted}/{path.totalCourses} courses
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          style={{ width: `${path.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Announcements */}
          <section className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Bell className="w-5 h-5 text-amber-500" />
              Announcements
            </h3>
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
              No announcements yet.
            </div>
          </section>

          {/* Upcoming Events */}
          <section className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Calendar className="w-5 h-5 text-purple-500" />
              Upcoming
            </h3>
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border-l-4 border-purple-500 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Live Q&A Session
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Tomorrow at 2:00 PM
                </p>
              </div>
              <div className={`p-3 rounded-lg border-l-4 border-green-500 ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Assignment Due: ML Basics
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Friday, 11:59 PM
                </p>
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/paths')}
                className={`w-full p-3 rounded-lg text-left text-sm flex items-center gap-3 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-200'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
              >
                <Target className="w-5 h-5 text-indigo-500" />
                Set Learning Goals
              </button>
              <button
                onClick={() => navigate('/discussions')}
                className={`w-full p-3 rounded-lg text-left text-sm flex items-center gap-3 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-200'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
              >
                <Users className="w-5 h-5 text-green-500" />
                Join Study Group
              </button>
              <button
                onClick={() => navigate('/analytics')}
                className={`w-full p-3 rounded-lg text-left text-sm flex items-center gap-3 transition-colors ${
                isDarkMode
                  ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-200'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
              >
                <TrendingUp className="w-5 h-5 text-amber-500" />
                View Progress Report
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
