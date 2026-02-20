import React, { useMemo } from 'react';
import { CheckCircle, Lock, PlayCircle } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { ModuleProgress } from '../../types/lms';
import { useAppContext } from '../../context/AppContext';

interface CourseOutlineProps {
  courseId: string;
  isDarkMode?: boolean;
}

const CourseOutline: React.FC<CourseOutlineProps> = ({ courseId, isDarkMode: isDarkModeProp }) => {
  const { user } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = isDarkModeProp ?? (settings?.theme ?? 'light') === 'dark';
  const { courses, enrollments } = useLMSStore();
  const { navigate, openLesson, openModule } = useAppContext();

  const course = courses.find((c) => c.id === courseId) ?? null;
  const enrollment = enrollments.find((e) =>
    e.courseId === courseId && (!user || e.userId === user.id)
  ) ?? null;
  const moduleProgress = useMemo<Record<string, ModuleProgress>>(
    () => enrollment?.moduleProgress ?? {},
    [enrollment?.moduleProgress]
  );

  const modules = useMemo(
    () => course?.modules ?? [],
    [course?.modules]
  );

  const isLessonCompleted = (moduleId: string, lessonId: string) => {
    return moduleProgress[moduleId]?.completedLessons?.includes(lessonId) || false;
  };

  const isLessonAccessible = (moduleId: string, lessonId: string) => {
    if (!course?.settings?.requireSequentialProgress) return true;
    for (const module of modules) {
      for (const lesson of module.lessons) {
        if (module.id === moduleId && lesson.id === lessonId) {
          return true;
        }
        if (!isLessonCompleted(module.id, lesson.id)) {
          return false;
        }
      }
    }
    return true;
  };

  const totalLessons = useMemo(
    () => modules.reduce((sum, mod) => sum + mod.lessons.length, 0),
    [modules]
  );
  const completedLessons = useMemo(
    () => Object.values(moduleProgress).reduce((sum, mp) => sum + (mp.completedLessons?.length || 0), 0),
    [moduleProgress]
  );

  if (!course) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <p className="text-sm">Course not found.</p>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Course outline</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {course.title} • {completedLessons}/{totalLessons} lessons completed
            </p>
          </div>
          <button
            onClick={() => navigate('/course/player')}
            className="tuutta-button-primary text-sm px-4 py-2"
          >
            <PlayCircle className="w-4 h-4" />
            Resume course
          </button>
        </div>

        <div className="space-y-4">
          {modules.map((module, moduleIndex) => (
            <div
              key={module.id}
              className={`rounded-xl border p-4 ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold">{moduleIndex + 1}. {module.title}</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {module.lessons.length} lessons
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  moduleProgress[module.id]?.status === 'completed'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                    : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}>
                  {moduleProgress[module.id]?.status === 'completed' ? 'Completed' : 'In progress'}
                </span>
              </div>
              <div className="space-y-2">
                {module.lessons.map((lesson) => {
                  const completed = isLessonCompleted(module.id, lesson.id);
                  const accessible = isLessonAccessible(module.id, lesson.id);
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => {
                        if (!accessible) return;
                        openModule(module.id);
                        openLesson(lesson.id);
                        const query = new URLSearchParams({
                          moduleId: module.id,
                          lessonId: lesson.id
                        });
                        navigate(`/course/player?${query.toString()}`);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                        completed
                          ? isDarkMode ? 'bg-green-900/30 text-green-200' : 'bg-green-50 text-green-700'
                          : !accessible
                            ? isDarkMode ? 'bg-gray-900/40 text-gray-500' : 'bg-gray-100 text-gray-400'
                            : isDarkMode ? 'bg-gray-900/60 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {completed ? <CheckCircle className="w-4 h-4" /> : !accessible ? <Lock className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        {lesson.title}
                      </span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {lesson.duration}m
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {modules.length === 0 && (
            <div className={`rounded-xl border p-6 text-center ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No modules have been added yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseOutline;
