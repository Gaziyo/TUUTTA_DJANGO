import type { AdminDashboardStats, DepartmentStats, CourseStats } from '../types/lms';
import * as lmsService from '../lib/lmsService';

export const statsService = {
  getAdminDashboardStats: (orgId: string): Promise<AdminDashboardStats> =>
    lmsService.getAdminDashboardStats(orgId),
  getDepartmentStats: (orgId: string): Promise<DepartmentStats[]> =>
    lmsService.getDepartmentStats(orgId),
  getCourseStats: (orgId: string): Promise<CourseStats[]> =>
    lmsService.getCourseStats(orgId),
};
