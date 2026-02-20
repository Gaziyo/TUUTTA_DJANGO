import React, { useState } from 'react';
import {
  BookOpen,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Star,
  MessageSquare,
  Calendar,
  BarChart2,
  ChevronRight,
  Play,
  FileText,
  Eye,
  Edit,
  Bell
} from 'lucide-react';
import type { Course } from '../../types/lms';

interface CourseStats {
  courseId: string;
  courseName: string;
  totalEnrolled: number;
  activeThisWeek: number;
  completionRate: number;
  averageScore: number;
  averageRating: number;
  pendingGrading: number;
  pendingQuestions: number;
}

interface StudentActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  courseId: string;
  courseName: string;
  type: 'enrollment' | 'completion' | 'submission' | 'question';
  message: string;
  timestamp: Date;
  requiresAction?: boolean;
}

interface UpcomingSession {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  type: 'live' | 'office_hours' | 'webinar';
  startTime: Date;
  duration: number;
  enrolledCount: number;
}

interface InstructorDashboardProps {
  instructor: {
    id: string;
    name: string;
    avatar?: string;
  };
  courses: Course[];
  courseStats: CourseStats[];
  recentActivity: StudentActivity[];
  upcomingSessions: UpcomingSession[];
  onCourseClick: (courseId: string) => void;
  onStudentClick: (userId: string) => void;
  onGradeSubmissions: (courseId: string) => void;
  onViewQuestions: (courseId: string) => void;
  onStartSession: (sessionId: string) => void;
  isDarkMode?: boolean;
}

export const InstructorDashboard: React.FC<InstructorDashboardProps> = ({
  instructor,
  courses: _courses,
  courseStats,
  recentActivity,
  upcomingSessions,
  onCourseClick,
  onStudentClick,
  onGradeSubmissions,
  onViewQuestions,
  onStartSession,
  isDarkMode = false,
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('week');

  const totalEnrolled = courseStats.reduce((sum, c) => sum + c.totalEnrolled, 0);
  const averageCompletionRate = courseStats.length > 0
    ? Math.round(courseStats.reduce((sum, c) => sum + c.completionRate, 0) / courseStats.length)
    : 0;
  const totalPendingGrading = courseStats.reduce((sum, c) => sum + c.pendingGrading, 0);
  const totalPendingQuestions = courseStats.reduce((sum, c) => sum + c.pendingQuestions, 0);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(date);
  };

  const getSessionTypeColor = (type: UpcomingSession['type']) => {
    switch (type) {
      case 'live': return 'bg-red-500';
      case 'office_hours': return 'bg-green-500';
      case 'webinar': return 'bg-purple-500';
    }
  };

  const getActivityIcon = (type: StudentActivity['type']) => {
    switch (type) {
      case 'enrollment': return <Users className="w-4 h-4 text-blue-500" />;
      case 'completion': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'submission': return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'question': return <MessageSquare className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Welcome back, {instructor.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as 'week' | 'month' | 'all')}
              className={`px-3 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Students',
              value: totalEnrolled,
              icon: Users,
              color: 'text-blue-500',
              bgColor: isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50',
            },
            {
              label: 'Avg. Completion',
              value: `${averageCompletionRate}%`,
              icon: TrendingUp,
              color: 'text-green-500',
              bgColor: isDarkMode ? 'bg-green-900/30' : 'bg-green-50',
            },
            {
              label: 'Pending Grading',
              value: totalPendingGrading,
              icon: FileText,
              color: 'text-yellow-500',
              bgColor: isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50',
              alert: totalPendingGrading > 0,
            },
            {
              label: 'Unanswered Questions',
              value: totalPendingQuestions,
              icon: MessageSquare,
              color: 'text-red-500',
              bgColor: isDarkMode ? 'bg-red-900/30' : 'bg-red-50',
              alert: totalPendingQuestions > 0,
            },
          ].map((stat, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${stat.bgColor} relative`}
            >
              {stat.alert && (
                <div className="absolute top-2 right-2">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                </div>
              )}
              <stat.icon className={`w-8 h-8 ${stat.color} mb-2`} />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* My Courses */}
          <div className={`col-span-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                My Courses
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {courseStats.map(stats => (
                <div
                  key={stats.courseId}
                  className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{stats.courseName}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Users className="w-4 h-4" />
                          {stats.totalEnrolled} enrolled
                        </span>
                        <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Star className="w-4 h-4 text-yellow-400" />
                          {stats.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onCourseClick(stats.courseId)}
                        className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                        title="View Course"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onCourseClick(stats.courseId)}
                        className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                        title="Edit Course"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Completion</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`flex-1 h-2 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${stats.completionRate}%` }}
                          />
                        </div>
                        <span className="font-medium">{stats.completionRate}%</span>
                      </div>
                    </div>
                    <div>
                      <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Avg. Score</div>
                      <div className="font-medium mt-1">{stats.averageScore}%</div>
                    </div>
                    <div>
                      <div className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Active This Week</div>
                      <div className="font-medium mt-1">{stats.activeThisWeek} students</div>
                    </div>
                    <div className="flex gap-2">
                      {stats.pendingGrading > 0 && (
                        <button
                          onClick={() => onGradeSubmissions(stats.courseId)}
                          className="flex items-center gap-1 px-2 py-1 bg-yellow-500 text-white rounded text-xs"
                        >
                          <FileText className="w-3 h-3" />
                          {stats.pendingGrading} to grade
                        </button>
                      )}
                      {stats.pendingQuestions > 0 && (
                        <button
                          onClick={() => onViewQuestions(stats.courseId)}
                          className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white rounded text-xs"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {stats.pendingQuestions} questions
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {courseStats.length === 0 && (
                <div className="text-center py-8">
                  <BookOpen className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    No courses assigned
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                Upcoming Sessions
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {upcomingSessions.map(session => {
                const isStartingSoon = new Date(session.startTime).getTime() - Date.now() < 15 * 60 * 1000;
                return (
                  <div
                    key={session.id}
                    className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${getSessionTypeColor(session.type)}`} />
                      <span className="text-xs capitalize">{session.type.replace('_', ' ')}</span>
                    </div>
                    <h4 className="font-medium text-sm">{session.title}</h4>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {session.courseName}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <div>{formatDate(session.startTime)}</div>
                        <div>{session.enrolledCount} registered</div>
                      </div>
                      {isStartingSoon && (
                        <button
                          onClick={() => onStartSession(session.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                        >
                          <Play className="w-3 h-3" />
                          Start Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {upcomingSessions.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    No upcoming sessions
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`mt-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              Recent Student Activity
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivity.slice(0, 10).map(activity => (
              <div
                key={activity.id}
                className={`p-4 flex items-start gap-4 ${activity.requiresAction ? (isDarkMode ? 'bg-yellow-900/10' : 'bg-yellow-50') : ''}`}
              >
                <div className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onStudentClick(activity.userId)}
                      className="font-medium hover:text-indigo-500"
                    >
                      {activity.userName}
                    </button>
                    {activity.requiresAction && (
                      <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                        Action needed
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {activity.message}
                  </p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {activity.courseName} • {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="p-8 text-center">
                <Clock className={`w-12 h-12 mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  No recent activity
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[
            { label: 'Create Course', icon: BookOpen, color: 'bg-indigo-500', onClick: () => {} },
            { label: 'Grade Submissions', icon: FileText, color: 'bg-yellow-500', onClick: () => onGradeSubmissions('') },
            { label: 'View Analytics', icon: BarChart2, color: 'bg-green-500', onClick: () => {} },
            { label: 'Answer Questions', icon: MessageSquare, color: 'bg-blue-500', onClick: () => onViewQuestions('') },
          ].map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`p-4 rounded-lg ${action.color} text-white hover:opacity-90 transition-opacity flex items-center gap-3`}
            >
              <action.icon className="w-6 h-6" />
              <span className="font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
