import React, { useEffect, useMemo } from 'react';
import { BookOpen, CheckCircle2, Clock3, TrendingUp } from 'lucide-react';
import { useStore } from '../store';
import { useLMSStore } from '../store/lmsStore';
import type { Course, Enrollment } from '../types/lms';

interface ProgressPanelProps {
  isDarkMode: boolean;
}

const ProgressPanel: React.FC<ProgressPanelProps> = ({ isDarkMode }) => {
  const { user } = useStore();
  const { currentOrg, enrollments, courses, loadEnrollments, loadCourses, loading } = useLMSStore();

  useEffect(() => {
    if (!currentOrg?.id) return;
    loadEnrollments();
    loadCourses();
  }, [currentOrg?.id, loadEnrollments, loadCourses]);

  const myEnrollments = useMemo(
    () => enrollments.filter((item) => item.userId === user?.id),
    [enrollments, user?.id]
  );

  const courseMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach((course) => map.set(course.id, course));
    return map;
  }, [courses]);

  const stats = useMemo(() => {
    const total = myEnrollments.length;
    const completed = myEnrollments.filter((item) => item.status === 'completed').length;
    const inProgress = myEnrollments.filter((item) =>
      item.status === 'in_progress' || item.status === 'not_started'
    ).length;
    const avgProgress = total > 0
      ? Math.round(myEnrollments.reduce((sum, item) => sum + item.progress, 0) / total)
      : 0;
    return { total, completed, inProgress, avgProgress };
  }, [myEnrollments]);

  const topEnrollments = useMemo(() => {
    return [...myEnrollments]
      .sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0))
      .slice(0, 6);
  }, [myEnrollments]);

  return (
    <div className="h-full flex flex-col gap-4">
      <section
        className={`rounded-xl border p-4 ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}
      >
        <h2 className="text-base font-semibold">Progress</h2>
        <p className={`mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Snapshot of your current learning status.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniStat
            label="Courses"
            value={stats.total}
            icon={<BookOpen className="h-4 w-4 text-indigo-500" />}
            isDarkMode={isDarkMode}
          />
          <MiniStat
            label="Done"
            value={stats.completed}
            icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            isDarkMode={isDarkMode}
          />
          <MiniStat
            label="Active"
            value={stats.inProgress}
            icon={<Clock3 className="h-4 w-4 text-amber-500" />}
            isDarkMode={isDarkMode}
          />
          <MiniStat
            label="Avg"
            value={`${stats.avgProgress}%`}
            icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
            isDarkMode={isDarkMode}
          />
        </div>
      </section>

      <section
        className={`flex-1 min-h-0 rounded-xl border p-4 ${
          isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Recent Courses</h3>
          <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {topEnrollments.length}
          </span>
        </div>

        <div className="mt-3 h-full overflow-y-auto pr-1 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : topEnrollments.length === 0 ? (
            <p className={`py-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No course progress yet.
            </p>
          ) : (
            topEnrollments.map((enrollment) => (
              <EnrollmentRow
                key={enrollment.id}
                enrollment={enrollment}
                courseTitle={courseMap.get(enrollment.courseId)?.title || 'Untitled Course'}
                isDarkMode={isDarkMode}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

function MiniStat({
  label,
  value,
  icon,
  isDarkMode
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isDarkMode: boolean;
}) {
  return (
    <div className={`rounded-lg border p-2 ${isDarkMode ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-lg font-semibold leading-none">{value}</div>
    </div>
  );
}

function EnrollmentRow({
  enrollment,
  courseTitle,
  isDarkMode
}: {
  enrollment: Enrollment;
  courseTitle: string;
  isDarkMode: boolean;
}) {
  const progress = Math.max(0, Math.min(100, enrollment.progress || 0));

  return (
    <div className={`rounded-lg border p-2.5 ${isDarkMode ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'}`}>
      <p className="truncate text-sm font-medium">{courseTitle}</p>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{enrollment.status.replace('_', ' ')}</span>
        <span className="font-semibold">{progress}%</span>
      </div>
      <div className={`mt-1.5 h-1.5 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressPanel;
