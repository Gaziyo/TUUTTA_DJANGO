import React, { useMemo, useState } from 'react';
import {
  User,
  Mail,
  Building,
  Calendar,
  Award,
  BookOpen,
  Clock,
  TrendingUp,
  Target,
  Star,
  ChevronRight,
  Edit2,
  Camera,
  Trophy,
  Flame,
  CheckCircle,
  BarChart2,
  FileText
} from 'lucide-react';
import type { Course, Certificate, Enrollment } from '../../types/lms';

interface Skill {
  id: string;
  name: string;
  level: number; // 0-100
  category: string;
  endorsements: number;
}

interface LearningActivity {
  id: string;
  type: 'course_completed' | 'badge_earned' | 'certificate_earned' | 'skill_improved' | 'milestone';
  title: string;
  description?: string;
  timestamp: Date;
  courseId?: string;
  badgeId?: string;
}

interface LearnerStats {
  totalCoursesCompleted: number;
  totalLearningHours: number;
  currentStreak: number;
  longestStreak: number;
  averageScore: number;
  certificatesEarned: number;
  badgesEarned: number;
  skillsGained: number;
  rank?: number;
  totalLearners?: number;
}

interface LearnerProfileProps {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    department?: string;
    jobTitle?: string;
    joinDate: Date;
    bio?: string;
  };
  stats: LearnerStats;
  skills: Skill[];
  recentActivity: LearningActivity[];
  enrolledCourses: (Enrollment & { course: Course })[];
  certificates: Certificate[];
  competencyScores?: Array<{ competencyTag: string; score: number; expiresAt?: number }>;
  remediationAssignments?: Array<{ status: 'assigned' | 'completed' | 'dismissed'; scheduledReassessmentAt?: number }>;
  competencyBadges?: Array<{ title: string; courseId?: string; moduleId?: string; issuedAt?: number }>;
  onEditProfile: () => void;
  onCourseClick: (courseId: string) => void;
  onCertificateClick: (certificateId: string) => void;
  isDarkMode?: boolean;
}

type Tab = 'overview' | 'courses' | 'skills' | 'certificates' | 'activity';

export const LearnerProfile: React.FC<LearnerProfileProps> = ({
  user,
  stats,
  skills,
  recentActivity,
  enrolledCourses,
  certificates,
  competencyScores = [],
  remediationAssignments = [],
  competencyBadges = [],
  onEditProfile,
  onCourseClick,
  onCertificateClick,
  isDarkMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'skills', label: 'Skills', icon: <Target className="w-4 h-4" /> },
    { id: 'certificates', label: 'Certificates', icon: <Award className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity', icon: <Clock className="w-4 h-4" /> },
  ];

  const getSkillLevelLabel = (level: number) => {
    if (level >= 90) return 'Expert';
    if (level >= 70) return 'Advanced';
    if (level >= 50) return 'Intermediate';
    if (level >= 30) return 'Developing';
    return 'Beginner';
  };

  const getActivityIcon = (type: LearningActivity['type']) => {
    switch (type) {
      case 'course_completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'badge_earned': return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'certificate_earned': return <Award className="w-4 h-4 text-indigo-500" />;
      case 'skill_improved': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'milestone': return <Star className="w-4 h-4 text-purple-500" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return formatDate(date);
  };

  const competencySummary = useMemo(() => {
    if (competencyScores.length === 0) return { avg: 0, total: 0 };
    const avg = Math.round(competencyScores.reduce((sum, item) => sum + (item.score || 0), 0) / competencyScores.length);
    return { avg, total: competencyScores.length };
  }, [competencyScores]);

  const remediationSummary = useMemo(() => {
    const assigned = remediationAssignments.filter((item) => item.status === 'assigned').length;
    return { assigned, total: remediationAssignments.length };
  }, [remediationAssignments]);

  const recentBadges = useMemo(() => competencyBadges.slice(0, 6), [competencyBadges]);

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Profile Header */}
      <div className={`p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
              {user.avatar ? (
                <img src={user.avatar} alt={user.firstName} className="w-full h-full object-cover" />
              ) : (
                `${user.firstName[0]}${user.lastName[0]}`
              )}
            </div>
            <button
              onClick={onEditProfile}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{user.firstName} {user.lastName}</h1>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {user.jobTitle || 'Learner'}
                </p>
              </div>
              <button
                onClick={onEditProfile}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            </div>

            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Mail className="w-4 h-4" />
                {user.email}
              </div>
              {user.department && (
                <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Building className="w-4 h-4" />
                  {user.department}
                </div>
              )}
              <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Calendar className="w-4 h-4" />
                Joined {formatDate(user.joinDate)}
              </div>
            </div>

            {user.bio && (
              <p className={`mt-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {user.bio}
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-6 gap-4 mt-6">
          {[
            { label: 'Courses Completed', value: stats.totalCoursesCompleted, icon: BookOpen, color: 'text-indigo-500' },
            { label: 'Learning Hours', value: stats.totalLearningHours, icon: Clock, color: 'text-blue-500' },
            { label: 'Current Streak', value: `${stats.currentStreak} days`, icon: Flame, color: 'text-orange-500' },
            { label: 'Avg. Score', value: `${stats.averageScore}%`, icon: BarChart2, color: 'text-green-500' },
            { label: 'Certificates', value: stats.certificatesEarned, icon: Award, color: 'text-purple-500' },
            { label: 'Badges', value: stats.badgesEarned, icon: Trophy, color: 'text-yellow-500' },
          ].map((stat, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
            >
              <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
              <div className="text-xl font-bold">{stat.value}</div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className={`px-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : `border-transparent ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Courses */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                Current Courses
              </h3>
              <div className="space-y-3">
                {enrolledCourses.slice(0, 3).map(enrollment => (
                  <div
                    key={enrollment.id}
                    onClick={() => onCourseClick(enrollment.courseId)}
                    className={`p-3 rounded-lg cursor-pointer ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{enrollment.course.title}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`flex-1 h-2 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${enrollment.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm">{enrollment.progress || 0}%</span>
                    </div>
                  </div>
                ))}
                {enrolledCourses.length === 0 && (
                  <p className={`text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No courses in progress
                  </p>
                )}
              </div>
            </div>

            {/* Competency & Remediation */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                Competency & Remediation
              </h3>
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Avg competency score</p>
                  <p className="text-2xl font-semibold">{competencySummary.avg}%</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{competencySummary.total} assessments tagged</p>
                </div>
                <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-xs uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Remediation assigned</p>
                  <p className="text-2xl font-semibold">{remediationSummary.assigned}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{remediationSummary.total} total cases</p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Recent Activity
              </h3>
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map(activity => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <p className={`text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No recent activity
                  </p>
                )}
              </div>
            </div>

            {/* Top Skills */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-500" />
                Top Skills
              </h3>
              <div className="space-y-3">
                {skills.slice(0, 5).map(skill => (
                  <div key={skill.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{skill.name}</span>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {getSkillLevelLabel(skill.level)}
                      </span>
                    </div>
                    <div className={`h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${skill.level}%` }}
                      />
                    </div>
                  </div>
                ))}
                {skills.length === 0 && (
                  <p className={`text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No skills recorded yet
                  </p>
                )}
              </div>
            </div>

            {/* Certificates */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Recent Certificates
              </h3>
              <div className="space-y-3">
                {certificates.slice(0, 3).map(cert => (
                  <div
                    key={cert.id}
                    onClick={() => onCertificateClick(cert.id)}
                    className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 ${
                      isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{cert.courseName}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Earned {formatDate(cert.issuedAt)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                ))}
                {certificates.length === 0 && (
                  <p className={`text-center py-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No certificates earned yet
                  </p>
                )}
              </div>
            </div>

            {/* Competency Badges */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Competency Badges
              </h3>
              {recentBadges.length === 0 && (
                <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  No competency badges yet.
                </p>
              )}
              <div className="space-y-3">
                {recentBadges.map((badge, index) => (
                  <div key={`${badge.title}-${index}`} className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <p className="font-medium">{badge.title}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {badge.moduleId || badge.courseId || 'Module badge'}
                    </p>
                    {badge.issuedAt && (
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Issued {new Date(badge.issuedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            {/* In Progress */}
            <div>
              <h3 className="font-semibold mb-4">In Progress</h3>
              <div className="grid grid-cols-2 gap-4">
                {enrolledCourses
                  .filter(e => e.status === 'in_progress')
                  .map(enrollment => (
                    <div
                      key={enrollment.id}
                      onClick={() => onCourseClick(enrollment.courseId)}
                      className={`p-4 rounded-lg cursor-pointer ${
                        isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <h4 className="font-medium mb-2">{enrollment.course.title}</h4>
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                          {enrollment.course.category}
                        </span>
                        {enrollment.dueDate && (
                          <span className={`${new Date(enrollment.dueDate) < new Date() ? 'text-red-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Due: {formatDate(enrollment.dueDate)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex-1 h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${enrollment.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{enrollment.progress || 0}%</span>
                      </div>
                    </div>
                  ))}
              </div>
              {enrolledCourses.filter(e => e.status === 'in_progress').length === 0 && (
                <p className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  No courses in progress
                </p>
              )}
            </div>

            {/* Completed */}
            <div>
              <h3 className="font-semibold mb-4">Completed</h3>
              <div className="grid grid-cols-2 gap-4">
                {enrolledCourses
                  .filter(e => e.status === 'completed')
                  .map(enrollment => (
                    <div
                      key={enrollment.id}
                      onClick={() => onCourseClick(enrollment.courseId)}
                      className={`p-4 rounded-lg cursor-pointer ${
                        isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{enrollment.course.title}</h4>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center gap-4 text-sm mt-2">
                        <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                          {enrollment.course.category}
                        </span>
                        {enrollment.completedAt && (
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                            Completed: {formatDate(enrollment.completedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              {enrolledCourses.filter(e => e.status === 'completed').length === 0 && (
                <p className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  No completed courses yet
                </p>
              )}
            </div>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div>
            <div className="grid grid-cols-2 gap-6">
              {/* Skills by Category */}
              {Array.from(new Set(skills.map(s => s.category))).map(category => (
                <div key={category} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <h3 className="font-semibold mb-4">{category}</h3>
                  <div className="space-y-4">
                    {skills
                      .filter(s => s.category === category)
                      .map(skill => (
                        <div key={skill.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{skill.name}</span>
                              {skill.endorsements > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  isDarkMode ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                                }`}>
                                  {skill.endorsements} endorsements
                                </span>
                              )}
                            </div>
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {skill.level}%
                            </span>
                          </div>
                          <div className={`h-3 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                              className={`h-full rounded-full ${
                                skill.level >= 90 ? 'bg-green-500' :
                                skill.level >= 70 ? 'bg-blue-500' :
                                skill.level >= 50 ? 'bg-yellow-500' :
                                'bg-orange-500'
                              }`}
                              style={{ width: `${skill.level}%` }}
                            />
                          </div>
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {getSkillLevelLabel(skill.level)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            {skills.length === 0 && (
              <div className="text-center py-12">
                <Target className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className="text-lg font-medium mb-2">No Skills Yet</h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Complete courses to develop and track your skills
                </p>
              </div>
            )}
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <div className="grid grid-cols-3 gap-4">
            {certificates.map(cert => (
              <div
                key={cert.id}
                onClick={() => onCertificateClick(cert.id)}
                className={`p-4 rounded-lg cursor-pointer ${
                  isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-medium">{cert.courseName}</h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatDate(cert.issuedAt)}
                    </p>
                  </div>
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Certificate ID: {cert.certificateNumber}
                </div>
                {cert.expiresAt && (
                  <div className={`text-xs mt-1 ${
                    new Date(cert.expiresAt) < new Date() ? 'text-red-500' : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {new Date(cert.expiresAt) < new Date() ? 'Expired' : 'Expires'}: {formatDate(cert.expiresAt)}
                  </div>
                )}
              </div>
            ))}
            {certificates.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <Award className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className="text-lg font-medium mb-2">No Certificates Yet</h3>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Complete courses to earn certificates
                </p>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {activity.description}
                          </p>
                        )}
                      </div>
                      <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="text-center py-12">
                  <Clock className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Start learning to see your activity here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
