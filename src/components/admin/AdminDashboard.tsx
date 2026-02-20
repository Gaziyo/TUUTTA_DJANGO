import React, { useEffect } from 'react';
import {
  Users,
  BookOpen,
  CheckCircle2,
  BarChart3,
  GraduationCap,
  RefreshCw,
  Settings,
  UserPlus,
  Layers,
  Shield
} from 'lucide-react';
import { useLMSStore } from '../../store/lmsStore';
import { useStore } from '../../store';
import { useAppContext } from '../../context/AppContext';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import AdminPageHeader from './AdminPageHeader';

interface AdminDashboardProps {
  isDarkMode?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const {
    currentOrg,
    dashboardStats,
    loadDashboardStats,
    loadDepartmentStats,
    loadCourseStats,
    isLoading,
  } = useLMSStore();

  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';
  const { navigate } = useAppContext();

  useEffect(() => {
    if (currentOrg) {
      loadDashboardStats();
      loadDepartmentStats();
      loadCourseStats();
    }
  }, [currentOrg, loadDashboardStats, loadDepartmentStats, loadCourseStats]);

  const handleRefresh = () => {
    loadDashboardStats();
    loadDepartmentStats();
    loadCourseStats();
  };

  const stats = dashboardStats || {
    totalLearners: 0,
    activeLearners: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalEnrollments: 0,
    completionRate: 0,
    overdueCount: 0,
    averageScore: 0,
    trainingHoursThisMonth: 0,
    certificatesIssued: 0,
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color: _color = 'indigo'
  }: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    color?: string;
  }) => (
    <div className="card-min p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-app-surface-2">
          <Icon className="h-5 w-5 text-app-muted" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-app-text">
          {value}
        </p>
        <p className="text-sm text-app-muted">
          {title}
        </p>
      </div>
    </div>
  );

  const laneCardClass = 'card-min p-5';
  const laneButtonClass = 'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border border-app-border hover:bg-app-surface-2';

  return (
    <div className="min-h-screen bg-app-bg">
      <AdminPageHeader
        title="Admin Home"
        subtitle={currentOrg?.name || 'Organization Overview'}
        isDarkMode={isDarkMode}
        badge="Overview"
        actions={(
          <>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className={`p-2 rounded-lg transition-colors hover:bg-app-surface-2 text-app-muted ${isLoading ? 'animate-spin' : ''}`}
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate('/admin/settings')}
              className="p-2 rounded-lg transition-colors hover:bg-app-surface-2 text-app-muted"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </>
        )}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Learners"
            value={stats.totalLearners}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Active Learners"
            value={stats.activeLearners}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Published Courses"
            value={stats.publishedCourses}
            icon={BookOpen}
            color="purple"
          />
          <StatCard
            title="Completion Rate"
            value={`${stats.completionRate}%`}
            icon={CheckCircle2}
            color="indigo"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className={laneCardClass}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-app-muted" />
              <h3 className="text-lg font-semibold text-app-text">People</h3>
            </div>
            <p className="text-sm mb-4 text-app-muted">
              Manage users, roles, and teams.
            </p>
            <div className="space-y-2">
              <button onClick={() => navigate('/admin/users')} className={laneButtonClass}>
                Users
                <UserPlus className="h-4 w-4 text-app-muted" />
              </button>
              <button onClick={() => navigate('/admin/teams')} className={laneButtonClass}>
                Teams
                <Users className="h-4 w-4 text-app-muted" />
              </button>
              <button onClick={() => navigate('/admin/departments')} className={laneButtonClass}>
                Departments
                <Layers className="h-4 w-4 text-app-muted" />
              </button>
            </div>
          </div>

          <div className={laneCardClass}>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-app-muted" />
              <h3 className="text-lg font-semibold text-app-text">Learning</h3>
            </div>
            <p className="text-sm mb-4 text-app-muted">
              Build courses, assign training, and track progress.
            </p>
            <div className="space-y-2">
              <button onClick={() => navigate('/admin/courses')} className={laneButtonClass}>
                Courses
                <GraduationCap className="h-4 w-4 text-app-muted" />
              </button>
              <button onClick={() => navigate('/admin/paths')} className={laneButtonClass}>
                Learning Paths
                <Layers className="h-4 w-4 text-app-muted" />
              </button>
              <button onClick={() => navigate('/admin/enrollments')} className={laneButtonClass}>
                Enrollments
                <Users className="h-4 w-4 text-app-muted" />
              </button>
            </div>
          </div>

          <div className={laneCardClass}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-app-muted" />
              <h3 className="text-lg font-semibold text-app-text">Insights</h3>
            </div>
            <p className="text-sm mb-4 text-app-muted">
              Monitor completion, compliance, and reports.
            </p>
            <div className="space-y-2">
              <button onClick={() => navigate('/admin/reports')} className={laneButtonClass}>
                Reports
                <BarChart3 className="h-4 w-4 text-app-muted" />
              </button>
              <button onClick={() => navigate('/admin/genie/compliance')} className={laneButtonClass}>
                Compliance
                <Shield className="h-4 w-4 text-app-muted" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboardWithErrorBoundary() {
  return (
    <ErrorBoundary title="AdminDashboard">
      <AdminDashboard />
    </ErrorBoundary>
  );
}
