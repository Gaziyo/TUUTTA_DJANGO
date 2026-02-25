import type { AdminDashboardStats, DepartmentStats, CourseStats } from '../types/lms';
import { apiClient } from '../lib/api';

function emptyDashboardStats(): AdminDashboardStats {
  return {
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
}

export const statsService = {
  getAdminDashboardStats: async (orgId: string): Promise<AdminDashboardStats> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/stats/`);
      return {
        totalLearners: data.total_learners ?? 0,
        activeLearners: data.active_learners ?? 0,
        totalCourses: data.total_courses ?? 0,
        publishedCourses: data.published_courses ?? 0,
        totalEnrollments: data.total_enrollments ?? 0,
        completionRate: data.completion_rate ?? 0,
        overdueCount: data.overdue_count ?? 0,
        averageScore: data.average_score ?? 0,
        trainingHoursThisMonth: data.training_hours_this_month ?? 0,
        certificatesIssued: data.certificates_issued ?? 0,
      };
    } catch {
      return emptyDashboardStats();
    }
  },

  getDepartmentStats: async (_orgId: string): Promise<DepartmentStats[]> => [],

  getCourseStats: async (_orgId: string): Promise<CourseStats[]> => [],
};
