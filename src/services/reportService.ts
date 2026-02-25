/**
 * Report Service — Migration Adapter
 *
 * This service provides reporting functionality by aggregating data
 * from canonical services.
 *
 * Reports:
 *   - Admin: Org-wide enrollment and completion data
 *   - Manager: Team progress and assignments
 *   - Learner: Personal progress overview
 */

import type { Enrollment, ProgressSummary } from '../types/schema';
import {
  enrollmentService,
  progressService,
  userService,
  courseService,
} from './canonical';

// ─── REPORT TYPES ────────────────────────────────────────────────────────────

export interface EnrollmentReportRow {
  enrollmentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseTitle: string;
  enrolledAt: Date;
  dueDate: Date | null;
  status: string;
  percentComplete: number;
  completedAt: Date | null;
}

export interface CompletionSummary {
  totalEnrollments: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  completionRate: number;
  averageProgress: number;
}

export interface CourseCompletionReport {
  courseId: string;
  courseTitle: string;
  totalEnrolled: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
}

export interface TeamMemberProgress {
  userId: string;
  userName: string;
  email: string;
  role: string;
  totalEnrollments: number;
  completedCourses: number;
  inProgressCourses: number;
  averageProgress: number;
  lastActivity: Date | null;
}

export const reportService = {
  // ─── ADMIN REPORTS ───────────────────────────────────────────────────────────

  /**
   * Get enrollment report for an organization.
   * Admin view: all learner completions.
   */
  getEnrollmentReport: async (orgId: string): Promise<EnrollmentReportRow[]> => {
    try {
      // Get all enrollments
      const enrollments = await enrollmentService.getEnrollmentsForOrg(orgId);

      // Get users and courses for enrichment
      const [users, courses] = await Promise.all([
        userService.getUsersByOrg(orgId),
        courseService.getCoursesByOrg(orgId),
      ]);

      const userMap = new Map(users.map(u => [u.uid, u]));
      const courseMap = new Map(courses.map(c => [c.id, c]));

      // Get progress summaries
      const progressPromises = enrollments.map(e =>
        progressService.getProgress(e.userId, e.courseId)
      );
      const progressList = await Promise.all(progressPromises);
      const progressMap = new Map<string, ProgressSummary>();
      progressList.forEach((p, i) => {
        if (p) {
          progressMap.set(enrollments[i].id, p);
        }
      });

      // Build report rows
      return enrollments.map(enrollment => {
        const user = userMap.get(enrollment.userId);
        const course = courseMap.get(enrollment.courseId);
        const progress = progressMap.get(enrollment.id);

        return {
          enrollmentId: enrollment.id,
          userId: enrollment.userId,
          userName: user?.displayName || 'Unknown',
          userEmail: user?.email || '',
          courseId: enrollment.courseId,
          courseTitle: course?.title || 'Unknown Course',
          enrolledAt: toDate(enrollment.enrolledAt),
          dueDate: enrollment.dueDate ? toDate(enrollment.dueDate) : null,
          status: enrollment.status,
          percentComplete: progress?.percentComplete || 0,
          completedAt: enrollment.completedAt ? toDate(enrollment.completedAt) : null,
        };
      });
    } catch (error) {
      console.error('[reportService] Error getting enrollment report:', error);
      return [];
    }
  },

  /**
   * Get completion summary for an organization.
   */
  getCompletionSummary: async (orgId: string): Promise<CompletionSummary> => {
    try {
      const enrollments = await enrollmentService.getEnrollmentsForOrg(orgId);

      const completedCount = enrollments.filter(e => e.status === 'completed').length;
      const activeEnrollments = enrollments.filter(e => e.status === 'active');

      // Get progress for active enrollments
      const progressPromises = activeEnrollments.map(e =>
        progressService.getProgress(e.userId, e.courseId)
      );
      const progressList = await Promise.all(progressPromises);

      let inProgressCount = 0;
      let notStartedCount = 0;
      let totalProgress = 0;

      progressList.forEach(p => {
        if (p) {
          if (p.percentComplete > 0) {
            inProgressCount++;
          } else {
            notStartedCount++;
          }
          totalProgress += p.percentComplete;
        } else {
          notStartedCount++;
        }
      });

      const totalEnrollments = enrollments.length;

      return {
        totalEnrollments,
        completedCount,
        inProgressCount,
        notStartedCount,
        completionRate: totalEnrollments > 0
          ? Math.round((completedCount / totalEnrollments) * 100)
          : 0,
        averageProgress: totalEnrollments > 0
          ? Math.round(totalProgress / totalEnrollments)
          : 0,
      };
    } catch (error) {
      console.error('[reportService] Error getting completion summary:', error);
      return {
        totalEnrollments: 0,
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 0,
        completionRate: 0,
        averageProgress: 0,
      };
    }
  },

  /**
   * Get course completion report.
   */
  getCourseCompletionReport: async (orgId: string): Promise<CourseCompletionReport[]> => {
    try {
      const [courses, enrollments] = await Promise.all([
        courseService.getCoursesByOrg(orgId, { status: 'published' }),
        enrollmentService.getEnrollmentsForOrg(orgId),
      ]);

      // Group enrollments by course
      const enrollmentsByCourse = new Map<string, Enrollment[]>();
      enrollments.forEach(e => {
        const list = enrollmentsByCourse.get(e.courseId) || [];
        list.push(e);
        enrollmentsByCourse.set(e.courseId, list);
      });

      return courses.map(course => {
        const courseEnrollments = enrollmentsByCourse.get(course.id) || [];
        const completed = courseEnrollments.filter(e => e.status === 'completed').length;
        const total = courseEnrollments.length;

        return {
          courseId: course.id,
          courseTitle: course.title,
          totalEnrolled: total,
          completed,
          inProgress: courseEnrollments.filter(e => e.status === 'active').length,
          notStarted: 0, // Would need progress data
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });
    } catch (error) {
      console.error('[reportService] Error getting course completion report:', error);
      return [];
    }
  },

  // ─── MANAGER REPORTS ─────────────────────────────────────────────────────────

  /**
   * Get team progress report for a manager.
   * Manager view: only direct reports.
   */
  getTeamProgressReport: async (
    orgId: string,
    managerId: string
  ): Promise<TeamMemberProgress[]> => {
    try {
      // Get direct reports
      const directReports = await userService.getDirectReports(orgId, managerId);

      // Get enrollments and progress for each team member
      const reportPromises = directReports.map(async user => {
        const enrollments = await enrollmentService.getEnrollmentsForUser(orgId, user.uid);
        const progressList = await progressService.getProgressForUser(user.uid);

        const completedCourses = enrollments.filter(e => e.status === 'completed').length;
        const inProgressCourses = enrollments.filter(e => e.status === 'active').length;

        // Calculate average progress
        let totalProgress = 0;
        progressList.forEach(p => {
          totalProgress += p.percentComplete;
        });
        const averageProgress = progressList.length > 0
          ? Math.round(totalProgress / progressList.length)
          : 0;

        // Find last activity
        let lastActivity: Date | null = null;
        progressList.forEach(p => {
          const updatedAt = toDate(p.updatedAt);
          if (!lastActivity || updatedAt > lastActivity) {
            lastActivity = updatedAt;
          }
        });

        return {
          userId: user.uid,
          userName: user.displayName,
          email: user.email,
          role: user.role,
          totalEnrollments: enrollments.length,
          completedCourses,
          inProgressCourses,
          averageProgress,
          lastActivity,
        };
      });

      return Promise.all(reportPromises);
    } catch (error) {
      console.error('[reportService] Error getting team progress report:', error);
      return [];
    }
  },

  // ─── LEARNER REPORTS ─────────────────────────────────────────────────────────

  /**
   * Get personal progress report for a learner.
   */
  getPersonalProgressReport: async (
    orgId: string,
    userId: string
  ): Promise<{
    enrollments: EnrollmentReportRow[];
    summary: CompletionSummary;
  }> => {
    try {
      const enrollments = await enrollmentService.getEnrollmentsForUser(orgId, userId);
      const courses = await courseService.getCoursesByOrg(orgId);
      const courseMap = new Map(courses.map(c => [c.id, c]));

      // Get progress for each enrollment
      const progressPromises = enrollments.map(e =>
        progressService.getProgress(userId, e.courseId)
      );
      const progressList = await Promise.all(progressPromises);

      const completedCount = enrollments.filter(e => e.status === 'completed').length;
      let inProgressCount = 0;
      let notStartedCount = 0;
      let totalProgress = 0;

      const rows: EnrollmentReportRow[] = enrollments.map((enrollment, i) => {
        const course = courseMap.get(enrollment.courseId);
        const progress = progressList[i];
        const percentComplete = progress?.percentComplete || 0;

        if (enrollment.status === 'active') {
          if (percentComplete > 0) {
            inProgressCount++;
          } else {
            notStartedCount++;
          }
        }
        totalProgress += percentComplete;

        return {
          enrollmentId: enrollment.id,
          userId,
          userName: '',
          userEmail: '',
          courseId: enrollment.courseId,
          courseTitle: course?.title || 'Unknown Course',
          enrolledAt: toDate(enrollment.enrolledAt),
          dueDate: enrollment.dueDate ? toDate(enrollment.dueDate) : null,
          status: enrollment.status,
          percentComplete,
          completedAt: enrollment.completedAt ? toDate(enrollment.completedAt) : null,
        };
      });

      return {
        enrollments: rows,
        summary: {
          totalEnrollments: enrollments.length,
          completedCount,
          inProgressCount,
          notStartedCount,
          completionRate: enrollments.length > 0
            ? Math.round((completedCount / enrollments.length) * 100)
            : 0,
          averageProgress: enrollments.length > 0
            ? Math.round(totalProgress / enrollments.length)
            : 0,
        },
      };
    } catch (error) {
      console.error('[reportService] Error getting personal progress report:', error);
      return {
        enrollments: [],
        summary: {
          totalEnrollments: 0,
          completedCount: 0,
          inProgressCount: 0,
          notStartedCount: 0,
          completionRate: 0,
          averageProgress: 0,
        },
      };
    }
  },

};

// Helper to convert Firestore timestamp to Date
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp.toMillis) return new Date(timestamp.toMillis());
  if (typeof timestamp === 'number') return new Date(timestamp);
  return new Date(timestamp);
}

export default reportService;
