/**
 * Enrollment Service — Migration Adapter
 *
 * This service bridges the legacy Enrollment type (lms.ts) with the canonical
 * enrollmentService (canonical/enrollmentService.ts) during the migration period.
 *
 * Key difference: Canonical uses deterministic IDs {orgId}_{userId}_{courseId}
 * to prevent duplicate enrollments.
 */

import type { Enrollment as LegacyEnrollment, EnrollmentStatus as LegacyEnrollmentStatus } from '../types/lms';
import type { Enrollment as CanonicalEnrollment, EnrollmentStatus } from '../types/schema';
import {
  enrollmentService as canonical,
  generateEnrollmentId,
} from './canonical';
import * as lmsService from '../lib/lmsService';
import { serviceEvents } from './events';

/**
 * Convert canonical Enrollment to legacy format.
 */
function toLegacyEnrollment(enrollment: CanonicalEnrollment): LegacyEnrollment {
  return {
    id: enrollment.id,
    odId: enrollment.orgId, // Legacy field
    orgId: enrollment.orgId,
    userId: enrollment.userId,
    userAuthId: enrollment.userId, // Map to same for now
    courseId: enrollment.courseId,
    assignedBy: enrollment.enrolledBy,
    assignedAt: enrollment.enrolledAt ? (enrollment.enrolledAt as any).toMillis?.() || Date.now() : Date.now(),
    dueDate: enrollment.dueDate ? (enrollment.dueDate as any).toMillis?.() || undefined : undefined,
    role: 'student' as const,
    priority: 'required' as const,
    status: mapEnrollmentStatus(enrollment.status),
    progress: 0, // Progress is now in separate progress collection
    completedAt: enrollment.completedAt ? (enrollment.completedAt as any).toMillis?.() || undefined : undefined,
    attempts: 0,
    moduleProgress: {},
  };
}

/**
 * Map canonical status to legacy status.
 */
function mapEnrollmentStatus(status: EnrollmentStatus): LegacyEnrollmentStatus {
  switch (status) {
    case 'active':
      return 'not_started';
    case 'completed':
      return 'completed';
    case 'withdrawn':
      return 'dropped';
    case 'expired':
      return 'expired';
    default:
      // Preserve unexpected persisted values (e.g. legacy "failed"/"overdue")
      return status as unknown as LegacyEnrollmentStatus;
  }
}

/**
 * Map legacy status to canonical status.
 */
function toCanonicalStatus(status: LegacyEnrollmentStatus): EnrollmentStatus | null {
  switch (status) {
    case 'not_started':
    case 'in_progress':
      return 'active';
    case 'completed':
      return 'completed';
    case 'dropped':
    case 'suspended':
      return 'withdrawn';
    case 'expired':
      return 'expired';
    case 'failed':
    case 'overdue':
      // Canonical schema does not currently model these statuses
      return null;
    default:
      return null;
  }
}

export const enrollmentService = {
  /**
   * Create an enrollment using deterministic ID.
   * Prevents duplicate enrollments automatically.
   */
  create: async (enrollment: Omit<LegacyEnrollment, 'id'>): Promise<LegacyEnrollment> => {
    const orgId = enrollment.orgId || enrollment.odId;

    try {
      const canonicalEnrollment = await canonical.enroll(
        orgId,
        enrollment.userId,
        enrollment.courseId,
        enrollment.assignedBy,
        {
          dueDate: enrollment.dueDate ? new Date(enrollment.dueDate) : undefined,
        }
      );

      serviceEvents.emit('enrollment.created', {
        enrollmentId: canonicalEnrollment.id,
        orgId: canonicalEnrollment.orgId,
      });

      return toLegacyEnrollment(canonicalEnrollment);
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy service for create:', error);
      const created = await lmsService.createEnrollment(enrollment);
      serviceEvents.emit('enrollment.created', { enrollmentId: created.id, orgId: created.orgId });
      return created;
    }
  },

  /**
   * Get an enrollment by ID.
   */
  get: async (enrollmentId: string): Promise<LegacyEnrollment | null> => {
    try {
      const enrollment = await canonical.getEnrollment(enrollmentId);
      return enrollment ? toLegacyEnrollment(enrollment) : null;
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy service for get:', error);
      return lmsService.getEnrollment(enrollmentId);
    }
  },

  /**
   * Get enrollments for a user in an organization.
   */
  listForUser: async (orgId: string, userId: string): Promise<LegacyEnrollment[]> => {
    try {
      const enrollments = await canonical.getEnrollmentsForUser(orgId, userId);
      return enrollments.map(toLegacyEnrollment);
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy service for listForUser:', error);
      return lmsService.getUserEnrollments(orgId, userId);
    }
  },

  /**
   * Get enrollments for a course.
   */
  listForCourse: async (orgId: string, courseId: string): Promise<LegacyEnrollment[]> => {
    try {
      const enrollments = await canonical.getEnrollmentsForCourse(orgId, courseId);
      return enrollments.map(toLegacyEnrollment);
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy service for listForCourse:', error);
      return lmsService.getCourseEnrollments(orgId, courseId);
    }
  },

  /**
   * Get enrollments by status.
   */
  listByStatus: async (orgId: string, status: LegacyEnrollmentStatus): Promise<LegacyEnrollment[]> => {
    try {
      const canonicalStatus = toCanonicalStatus(status);
      if (!canonicalStatus) {
        return lmsService.getEnrollmentsByStatus(orgId, status);
      }
      const enrollments = await canonical.getEnrollmentsByStatus(orgId, canonicalStatus);
      return enrollments.map(toLegacyEnrollment);
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy service for listByStatus:', error);
      return lmsService.getEnrollmentsByStatus(orgId, status);
    }
  },

  /**
   * Get all enrollments for an organization.
   */
  listForOrg: async (orgId: string): Promise<LegacyEnrollment[]> => {
    try {
      const enrollments = await canonical.getEnrollmentsForOrg(orgId);
      return enrollments.map(toLegacyEnrollment);
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy service for listForOrg:', error);
      return lmsService.getOrgEnrollments(orgId);
    }
  },

  /**
   * Get enrollments for org with pagination.
   * Note: Canonical service doesn't support pagination yet, falls back to legacy.
   */
  listForOrgPage: (orgId: string, options: { limitCount: number; cursor?: unknown }) =>
    lmsService.getOrgEnrollmentsPage(orgId, options),

  /**
   * Update an enrollment.
   */
  update: async (enrollmentId: string, updates: Partial<LegacyEnrollment>): Promise<void> => {
    try {
      const { status, ...passthroughUpdates } = updates;

      // Map status if canonical supports it
      if (status) {
        const canonicalStatus = toCanonicalStatus(status);
        if (canonicalStatus) {
          await canonical.updateEnrollmentStatus(enrollmentId, canonicalStatus);
        } else {
          // Preserve legacy-only statuses such as failed/overdue.
          await lmsService.updateEnrollment(enrollmentId, { status });
        }
      }

      // Persist remaining legacy fields (attempts, startedAt, lastAccessedAt, etc.)
      if (Object.keys(passthroughUpdates).length > 0) {
        await lmsService.updateEnrollment(enrollmentId, passthroughUpdates);
      }

      serviceEvents.emit('enrollment.updated', { enrollmentId });
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy service for update:', error);
      await lmsService.updateEnrollment(enrollmentId, updates);
      serviceEvents.emit('enrollment.updated', { enrollmentId });
    }
  },

  /**
   * Update enrollment progress.
   * Note: In canonical architecture, progress is tracked in separate /progress collection.
   * This method is for backward compatibility with legacy code.
   */
  updateProgress: async (
    enrollmentId: string,
    progress: number,
    moduleProgress?: Record<string, unknown>
  ): Promise<void> => {
    // For now, use legacy service for progress updates
    // TODO: Migrate to canonical progressService
    await lmsService.updateEnrollmentProgress(enrollmentId, progress, moduleProgress);
    serviceEvents.emit('enrollment.progress_updated', { enrollmentId, progress });
  },

  /**
   * Bulk enroll multiple users in a course.
   */
  bulkEnroll: async (
    orgId: string,
    userIds: string[],
    courseId: string,
    assignedBy: string,
    options?: {
      dueDate?: number;
      priority?: 'required' | 'recommended' | 'optional';
      role?: 'student' | 'teacher';
      userAuthIdMap?: Record<string, string | undefined>;
    }
  ): Promise<LegacyEnrollment[]> => {
    try {
      const enrollments = await canonical.bulkEnroll(
        orgId,
        userIds,
        courseId,
        assignedBy,
        {
          dueDate: options?.dueDate ? new Date(options.dueDate) : undefined,
        }
      );

      return enrollments.map(toLegacyEnrollment);
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy service for bulkEnroll:', error);
      return lmsService.bulkEnroll(orgId, userIds, courseId, assignedBy, options);
    }
  },

  /**
   * Remove/withdraw an enrollment.
   */
  remove: async (enrollmentId: string): Promise<void> => {
    try {
      await canonical.withdrawEnrollment(enrollmentId);
      serviceEvents.emit('enrollment.deleted', { enrollmentId });
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy service for remove:', error);
      await lmsService.deleteEnrollment(enrollmentId);
      serviceEvents.emit('enrollment.deleted', { enrollmentId });
    }
  },

  /**
   * Check if a user is enrolled in a course.
   */
  isEnrolled: async (orgId: string, userId: string, courseId: string): Promise<boolean> => {
    try {
      return canonical.isEnrolled(orgId, userId, courseId);
    } catch (error) {
      console.warn('[enrollmentService] Falling back to legacy for isEnrolled:', error);
      const enrollments = await lmsService.getUserEnrollments(orgId, userId);
      return enrollments.some(e => e.courseId === courseId && e.status !== 'dropped');
    }
  },

  /**
   * Generate deterministic enrollment ID.
   * Useful for checking existence without querying.
   */
  generateId: generateEnrollmentId,
};

export default enrollmentService;
