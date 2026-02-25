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
import { apiClient } from '../lib/api';
import {
  enrollmentService as canonical,
  generateEnrollmentId,
} from './canonical';
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
    const canonicalEnrollment = await canonical.enroll(
      orgId,
      enrollment.userId,
      enrollment.courseId,
      enrollment.assignedBy,
      { dueDate: enrollment.dueDate ? new Date(enrollment.dueDate) : undefined }
    );
    serviceEvents.emit('enrollment.created', {
      enrollmentId: canonicalEnrollment.id,
      orgId: canonicalEnrollment.orgId,
    });
    return toLegacyEnrollment(canonicalEnrollment);
  },

  /**
   * Get an enrollment by ID.
   */
  get: async (enrollmentId: string): Promise<LegacyEnrollment | null> => {
    try {
      const enrollment = await canonical.getEnrollment(enrollmentId);
      return enrollment ? toLegacyEnrollment(enrollment) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get enrollments for a user in an organization.
   */
  listForUser: async (orgId: string, userId: string): Promise<LegacyEnrollment[]> => {
    try {
      const enrollments = await canonical.getEnrollmentsForUser(orgId, userId);
      return enrollments.map(toLegacyEnrollment);
    } catch {
      return [];
    }
  },

  /**
   * Get enrollments for a course.
   */
  listForCourse: async (orgId: string, courseId: string): Promise<LegacyEnrollment[]> => {
    try {
      const enrollments = await canonical.getEnrollmentsForCourse(orgId, courseId);
      return enrollments.map(toLegacyEnrollment);
    } catch {
      return [];
    }
  },

  /**
   * Get enrollments by status.
   */
  listByStatus: async (orgId: string, status: LegacyEnrollmentStatus): Promise<LegacyEnrollment[]> => {
    try {
      const canonicalStatus = toCanonicalStatus(status);
      if (!canonicalStatus) return [];
      const enrollments = await canonical.getEnrollmentsByStatus(orgId, canonicalStatus);
      return enrollments.map(toLegacyEnrollment);
    } catch {
      return [];
    }
  },

  /**
   * Get all enrollments for an organization.
   */
  listForOrg: async (orgId: string): Promise<LegacyEnrollment[]> => {
    try {
      const enrollments = await canonical.getEnrollmentsForOrg(orgId);
      return enrollments.map(toLegacyEnrollment);
    } catch {
      return [];
    }
  },

  /**
   * Get enrollments for org with pagination.
   * Uses Django API — admin org-level query (server enforces role check).
   */
  listForOrgPage: async (orgId: string, _options: { limitCount: number; cursor?: unknown }) => {
    try {
      const enrollments = await canonical.getEnrollmentsForOrg(orgId);
      return { enrollments: enrollments.map(toLegacyEnrollment), lastDoc: null };
    } catch (error) {
      console.warn('[enrollmentService] listForOrgPage failed:', error);
      return { enrollments: [], lastDoc: null };
    }
  },

  /**
   * Update an enrollment.
   */
  update: async (enrollmentId: string, updates: Partial<LegacyEnrollment>): Promise<void> => {
    if (updates.status) {
      const canonicalStatus = toCanonicalStatus(updates.status);
      if (canonicalStatus) {
        await canonical.updateEnrollmentStatus(enrollmentId, canonicalStatus);
      }
    }
    serviceEvents.emit('enrollment.updated', { enrollmentId });
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
      await apiClient.post('/enrollments/bulk-enroll/', {
        organization: orgId,
        course: courseId,
        user_ids: userIds,
        due_days: options?.dueDate ? Math.max(1, Math.round((options.dueDate - Date.now()) / (1000 * 60 * 60 * 24))) : 30
      });
      return userIds.map((userId) => ({
        id: generateEnrollmentId(orgId, userId, courseId),
        odId: orgId,
        orgId,
        userId,
        userAuthId: options?.userAuthIdMap?.[userId] ?? userId,
        courseId,
        assignedBy,
        assignedAt: Date.now(),
        dueDate: options?.dueDate,
        role: options?.role || 'student',
        priority: options?.priority || 'required',
        status: 'not_started',
        progress: 0,
        attempts: 0,
        moduleProgress: {},
      }));
    } catch {
      const enrollments = await canonical.bulkEnroll(
        orgId,
        userIds,
        courseId,
        assignedBy,
        { dueDate: options?.dueDate ? new Date(options.dueDate) : undefined }
      );
      return enrollments.map(toLegacyEnrollment);
    }
  },

  /**
   * Remove/withdraw an enrollment.
   */
  remove: async (enrollmentId: string): Promise<void> => {
    await canonical.withdrawEnrollment(enrollmentId);
    serviceEvents.emit('enrollment.deleted', { enrollmentId });
  },

  /**
   * Check if a user is enrolled in a course.
   */
  isEnrolled: async (orgId: string, userId: string, courseId: string): Promise<boolean> => {
    try {
      return canonical.isEnrolled(orgId, userId, courseId);
    } catch {
      return false;
    }
  },

  /**
   * Generate deterministic enrollment ID.
   * Useful for checking existence without querying.
   */
  generateId: generateEnrollmentId,
};

export default enrollmentService;
