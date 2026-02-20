import React, { useMemo } from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Lock,
  Play,
  Target,
  Trophy
} from 'lucide-react';
import { LearningPath, Course, Enrollment, Certificate } from '../../types/lms';
import { useAppContext } from '../../context/AppContext';

type LearningPathView = 'overview' | 'current' | 'milestones';

interface LearningPathViewerProps {
  learningPath: LearningPath;
  courses: Course[];
  enrollments: Enrollment[];
  pathCertificate?: Certificate;
  onStartCourse: (courseId: string) => void;
  onContinueCourse: (courseId: string, enrollmentId: string) => void;
  onViewCertificate: (certificate: Certificate) => void;
  onBack: () => void;
  isDarkMode?: boolean;
  view?: LearningPathView;
}

interface CourseProgressInfo {
  course: Course;
  enrollment?: Enrollment;
  isLocked: boolean;
  prerequisiteCourse?: Course;
}

export function LearningPathViewer({
  learningPath,
  courses,
  enrollments,
  pathCertificate,
  onStartCourse,
  onContinueCourse,
  onViewCertificate,
  onBack,
  isDarkMode = false,
  view = 'overview'
}: LearningPathViewerProps) {
  const { navigate } = useAppContext();
  // Process courses with their progress
  const courseProgress: CourseProgressInfo[] = useMemo(() => {
    return learningPath.courses.map(lpc => {
      const course = courses.find(c => c.id === lpc.courseId);
      const enrollment = enrollments.find(e => e.courseId === lpc.courseId);

      // Check if locked
      let isLocked = false;
      let prerequisiteCourse: Course | undefined;

      if (lpc.unlockAfter) {
        const prereqEnrollment = enrollments.find(e => e.courseId === lpc.unlockAfter);
        if (!prereqEnrollment || prereqEnrollment.status !== 'completed') {
          isLocked = true;
          prerequisiteCourse = courses.find(c => c.id === lpc.unlockAfter);
        }
      }

      return {
        course: course!,
        enrollment,
        isLocked,
        prerequisiteCourse
      };
    }).filter(cp => cp.course);
  }, [learningPath.courses, courses, enrollments]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const totalCourses = courseProgress.length;
    const completedCourses = courseProgress.filter(
      cp => cp.enrollment?.status === 'completed'
    ).length;
    const inProgressCourses = courseProgress.filter(
      cp => cp.enrollment?.status === 'in_progress'
    ).length;
    const totalProgress = courseProgress.reduce(
      (sum, cp) => sum + (cp.enrollment?.progress || 0),
      0
    );

    return {
      totalCourses,
      completedCourses,
      inProgressCourses,
      percentComplete: totalCourses > 0 ? Math.round(totalProgress / totalCourses) : 0,
      isComplete: completedCourses === totalCourses && totalCourses > 0
    };
  }, [courseProgress]);

  const totalDuration = learningPath.estimatedDuration || courseProgress.reduce(
    (sum, cp) => sum + (cp.course?.estimatedDuration || 0),
    0
  );

  const currentCourse = courseProgress.find(cp => cp.enrollment?.status === 'in_progress')
    || courseProgress.find(cp => !cp.enrollment && !cp.isLocked)
    || courseProgress[0];

  const renderOverview = () => {
    if (courseProgress.length === 0) {
      return (
        <div className={`rounded-xl border p-6 text-center ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No courses have been added to this learning path yet.
          </p>
        </div>
      );
    }

    return (
      <>
        <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          Course Progress
        </h2>

        <div className="relative">
          <div className={`absolute left-6 top-10 bottom-10 w-0.5 ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`} />

          <div className="space-y-4">
            {courseProgress.map((cp, index) => {
              const { course, enrollment, isLocked, prerequisiteCourse } = cp;
              const isCompleted = enrollment?.status === 'completed';
              const isInProgress = enrollment?.status === 'in_progress';
            return (
              <div
                key={course.id}
                className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  isLocked
                    ? (isDarkMode ? 'bg-gray-800/50 border-gray-700 opacity-60' : 'bg-gray-50 border-gray-200 opacity-60')
                    : isCompleted
                      ? (isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200')
                      : isInProgress
                        ? (isDarkMode ? 'bg-indigo-900/20 border-indigo-700' : 'bg-indigo-50 border-indigo-200')
                        : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')
                }`}
              >
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                  isLocked
                    ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')
                    : isCompleted
                      ? 'bg-green-500'
                      : isInProgress
                        ? 'bg-indigo-500'
                        : (isDarkMode ? 'bg-gray-700' : 'bg-gray-200')
                }`}>
                  {isLocked ? (
                    <Lock size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                  ) : isCompleted ? (
                    <Check size={20} className="text-white" />
                  ) : isInProgress ? (
                    <Play size={20} className="text-white" />
                  ) : (
                    <span className={`font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {index + 1}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{course.title}</h3>
                      <div className={`flex items-center gap-3 text-sm mt-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        <span>{course.category}</span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {course.estimatedDuration} min
                        </span>
                        <span className={`capitalize ${
                          isCompleted ? 'text-green-500' :
                          isInProgress ? 'text-indigo-500' :
                          isLocked ? '' : 'text-gray-400'
                        }`}>
                          {isLocked ? 'Locked' :
                           isCompleted ? 'Completed' :
                           isInProgress ? 'In Progress' :
                           'Not Started'}
                        </span>
                      </div>

                      {isLocked && prerequisiteCourse && (
                        <p className={`text-sm mt-2 flex items-center gap-1 ${
                          isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                        }`}>
                          <Lock size={14} />
                          Complete "{prerequisiteCourse.title}" first
                        </p>
                      )}
                    </div>

                    <div>
                      {isLocked ? (
                        <div className={`px-4 py-2 rounded-lg text-sm ${
                          isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Lock size={16} />
                        </div>
                      ) : isCompleted ? (
                        <button
                          onClick={() => onContinueCourse(course.id, enrollment!.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                            isDarkMode
                              ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          <CheckCircle size={16} />
                          Review
                        </button>
                      ) : isInProgress ? (
                        <button
                          onClick={() => onContinueCourse(course.id, enrollment!.id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                        >
                          <Play size={16} />
                          Continue
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartCourse(course.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                            isDarkMode
                              ? 'bg-gray-700 text-white hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Start
                          <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {(isInProgress || isCompleted) && enrollment && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                          Progress
                        </span>
                        <span className={`font-medium ${
                          isCompleted ? 'text-green-500' : 'text-indigo-500'
                        }`}>
                          {enrollment.progress}%
                        </span>
                      </div>
                      <div className={`h-2 rounded-full ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <div
                          className={`h-full rounded-full transition-all ${
                            isCompleted ? 'bg-green-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </>
    );
  };

  const renderCurrent = () => {
    if (!currentCourse) {
      return (
        <div className={`rounded-xl border p-6 text-center ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            No courses available in this path yet.
          </p>
        </div>
      );
    }

    const { course, enrollment, isLocked, prerequisiteCourse } = currentCourse;
    const progress = enrollment?.progress || 0;
    const canContinue = enrollment && enrollment.status !== 'not_started';

    return (
      <div className={`rounded-2xl border p-6 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} shadow-sm`}>
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <p className={`text-xs uppercase tracking-[0.2em] ${isDarkMode ? 'text-indigo-300' : 'text-indigo-500'}`}>
              Current focus
            </p>
            <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {course.title}
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {course.description}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Progress</p>
            <p className={`text-2xl font-semibold ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              {progress}%
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {isLocked && prerequisiteCourse ? (
            <div className={`rounded-xl p-4 ${isDarkMode ? 'bg-gray-900/60' : 'bg-gray-50'}`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Unlocks after completing {prerequisiteCourse.title}.
              </p>
            </div>
          ) : (
            <>
              <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {enrollment?.status === 'completed' ? 'Completed' : 'In progress'}
                </p>
                <button
                  onClick={() => {
                    if (canContinue) {
                      onContinueCourse(course.id, enrollment?.id || '');
                    } else {
                      onStartCourse(course.id);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    isDarkMode
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
                >
                  {canContinue ? 'Continue course' : 'Start course'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderMilestones = () => (
    <div className="space-y-3">
      {courseProgress.map((cp, index) => {
        const isCompleted = cp.enrollment?.status === 'completed';
        const isInProgress = cp.enrollment?.status === 'in_progress';
        return (
          <div
            key={cp.course.id}
            className={`flex items-center justify-between rounded-xl p-4 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            } shadow-sm`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted
                  ? 'bg-green-500 text-white'
                  : isInProgress
                    ? 'bg-indigo-600 text-white'
                    : cp.isLocked
                      ? isDarkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                      : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
                {isCompleted ? <CheckCircle size={18} /> : cp.isLocked ? <Lock size={18} /> : <Target size={18} />}
              </div>
              <div>
                <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Milestone {index + 1}: {cp.course.title}
                </p>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {cp.isLocked && cp.prerequisiteCourse
                    ? `Unlocks after ${cp.prerequisiteCourse.title}`
                    : isCompleted
                      ? 'Completed'
                      : isInProgress
                        ? 'In progress'
                        : 'Not started'}
                </p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${
              isCompleted
                ? 'text-green-500'
                : isInProgress
                  ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                  : isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {cp.enrollment?.progress || 0}%
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`relative ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-90" />

        {/* Content */}
        <div className="relative p-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to My Learning
          </button>

          <div className="flex items-start gap-6">
            {/* Thumbnail */}
            {learningPath.thumbnail ? (
              <img
                src={learningPath.thumbnail}
                alt={learningPath.title}
                className="w-32 h-24 object-cover rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-32 h-24 rounded-lg bg-white/20 flex items-center justify-center">
                <Target size={32} className="text-white" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">{learningPath.title}</h1>
              <p className="text-white/80 mb-4 line-clamp-2">{learningPath.description}</p>

              <div className="flex items-center gap-6 text-white/80 text-sm">
                <span className="flex items-center gap-2">
                  <BookOpen size={16} />
                  {overallProgress.totalCourses} courses
                </span>
                <span className="flex items-center gap-2">
                  <Clock size={16} />
                  {Math.round(totalDuration / 60)} hours
                </span>
                {learningPath.certification?.enabled && (
                  <span className="flex items-center gap-2">
                    <Award size={16} />
                    Certificate included
                  </span>
                )}
              </div>
            </div>

            {/* Progress Circle */}
            <div className="text-center">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke="white"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${overallProgress.percentComplete * 2.64} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {overallProgress.percentComplete}%
                  </span>
                </div>
              </div>
              <p className="text-white/80 text-sm mt-2">
                {overallProgress.completedCourses}/{overallProgress.totalCourses} Complete
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full bg-white/15 p-1 backdrop-blur-sm">
              {([
                { id: 'overview', label: 'Overview' },
                { id: 'current', label: 'Current' },
                { id: 'milestones', label: 'Milestones' }
              ] as const).map((tab) => {
                const isActive = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigate(`/path/${learningPath.id}/${tab.id}`)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <span className="text-xs text-white/70">
              Deep links update the URL for easy sharing.
            </span>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {overallProgress.isComplete && (
        <div className={`p-4 flex items-center justify-between ${
          isDarkMode ? 'bg-green-900/30' : 'bg-green-50'
        }`}>
          <div className="flex items-center gap-3">
            <Trophy size={24} className="text-green-500" />
            <div>
              <p className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                Congratulations! You've completed this learning path!
              </p>
              {pathCertificate && (
                <p className={`text-sm ${isDarkMode ? 'text-green-400/80' : 'text-green-600'}`}>
                  Your certificate is ready to download.
                </p>
              )}
            </div>
          </div>
          {pathCertificate && (
            <button
              onClick={() => onViewCertificate(pathCertificate)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
            >
              <Award size={18} />
              View Certificate
            </button>
          )}
        </div>
      )}

      {/* Course List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {view === 'overview' && renderOverview()}
          {view === 'current' && renderCurrent()}
          {view === 'milestones' && renderMilestones()}

          {view === 'overview' && learningPath.certification?.enabled && (
            <div className={`p-6 rounded-xl border ${
              overallProgress.isComplete
                ? (isDarkMode ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200')
                : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  overallProgress.isComplete
                    ? 'bg-green-500'
                    : (isDarkMode ? 'bg-gray-700' : 'bg-gray-100')
                }`}>
                  <Award size={28} className={overallProgress.isComplete ? 'text-white' : (
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  )} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{learningPath.certification.title}</h3>
                  {learningPath.certification.description && (
                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {learningPath.certification.description}
                    </p>
                  )}
                  <div className={`flex items-center gap-4 mt-3 text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {learningPath.certification.validityPeriod ? (
                      <span>Valid for {learningPath.certification.validityPeriod} days</span>
                    ) : (
                      <span>Never expires</span>
                    )}
                    {learningPath.certification.renewalRequired && (
                      <span className="text-yellow-500">Renewal required</span>
                    )}
                  </div>
                </div>
                {overallProgress.isComplete && pathCertificate && (
                  <button
                    onClick={() => onViewCertificate(pathCertificate)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                  >
                    View Certificate
                  </button>
                )}
              </div>

              {!overallProgress.isComplete && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Complete all {overallProgress.totalCourses} courses to earn this certification.
                    You have completed {overallProgress.completedCourses} so far.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LearningPathViewer;
