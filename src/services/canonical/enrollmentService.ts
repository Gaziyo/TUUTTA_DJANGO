/**
 * Enrollment Service — Canonical Implementation
 *
 * Collection: /enrollments/{orgId}_{userId}_{courseId}
 *
 * Uses deterministic compound IDs to prevent duplicate enrollments.
 * All enrollment operations go through this service.
 * Components NEVER call Firestore directly.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  collection,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Enrollment, EnrollmentStatus, ProgressSummary } from '../../types/schema';
import { activity } from './activityService';
import { observabilityService } from '../observabilityService';

export class EnrollmentNotFoundError extends Error {
  constructor(enrollmentId: string) {
    super(`Enrollment not found: ${enrollmentId}`);
    this.name = 'EnrollmentNotFoundError';
  }
}

export class AlreadyEnrolledError extends Error {
  constructor(userId: string, courseId: string) {
    super(`User ${userId} is already enrolled in course ${courseId}`);
    this.name = 'AlreadyEnrolledError';
  }
}

/**
 * Generate deterministic enrollment ID.
 * Format: {orgId}_{userId}_{courseId}
 */
export function generateEnrollmentId(orgId: string, userId: string, courseId: string): string {
  return `${orgId}_${userId}_${courseId}`;
}

/**
 * Generate deterministic progress summary ID.
 * Format: {userId}_{courseId}
 */
export function generateProgressId(userId: string, courseId: string): string {
  return `${userId}_${courseId}`;
}

/**
 * Enroll a user in a course.
 *
 * This is idempotent — enrolling the same user twice is a no-op.
 * Creates both the enrollment doc and the progress summary doc atomically
 * using a Firestore transaction to prevent orphaned documents.
 */
export async function enroll(
  orgId: string,
  userId: string,
  courseId: string,
  enrolledBy: string,
  options?: {
    dueDate?: Date;
  }
): Promise<Enrollment> {
  const enrollmentId = generateEnrollmentId(orgId, userId, courseId);
  const progressId = generateProgressId(userId, courseId);

  const enrollmentRef = doc(db, 'enrollments', enrollmentId);
  const progressRef = doc(db, 'progress', progressId);

  // Use transaction to atomically create both enrollment and progress docs
  const result = await runTransaction(db, async (transaction) => {
    // Check if already enrolled (within transaction for consistency)
    const existingEnrollment = await transaction.get(enrollmentRef);
    if (existingEnrollment.exists()) {
      // Idempotent: return existing enrollment
      return { enrollment: existingEnrollment.data() as Enrollment, isNew: false };
    }

    // Create timestamp once for consistency
    const now = Timestamp.now();

    const enrollment: Enrollment = {
      id: enrollmentId,
      orgId,
      userId,
      courseId,
      enrolledBy,
      status: 'active',
      enrolledAt: now as any,
      completedAt: null,
      dueDate: options?.dueDate ? Timestamp.fromDate(options.dueDate) as any : null,
      certificateId: null,
    };

    const progressSummary: ProgressSummary = {
      id: progressId,
      userId,
      courseId,
      orgId,
      enrollmentId,
      completedLessonIds: [],
      completedModuleIds: [],
      lastLessonId: null,
      percentComplete: 0,
      totalTimeSpentSeconds: 0,
      updatedAt: now as any,
    };

    // Both writes happen atomically within the transaction
    transaction.set(enrollmentRef, enrollment);
    transaction.set(progressRef, progressSummary);

    return { enrollment, isNew: true };
  });

  // Only log activity and observability for new enrollments (outside transaction)
  if (result.isNew) {
    // Log activity (non-blocking)
    activity.courseEnroll(orgId, userId, courseId, enrolledBy).catch(() => {});

    // Observability: Critical path event (non-blocking)
    observabilityService.logUserAction({
      orgId,
      actorId: enrolledBy,
      action: 'enrollment_created',
      status: 'success',
      entityType: 'enrollment',
      entityId: enrollmentId,
      metadata: { userId, courseId },
    }).catch(() => {});
  }

  return result.enrollment;
}

/**
 * Get an enrollment by ID.
 */
export async function getEnrollment(enrollmentId: string): Promise<Enrollment | null> {
  const enrollmentRef = doc(db, 'enrollments', enrollmentId);
  const snapshot = await getDoc(enrollmentRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Enrollment;
}

/**
 * Get enrollment by org, user, and course (convenience method).
 */
export async function getEnrollmentForUserCourse(
  orgId: string,
  userId: string,
  courseId: string
): Promise<Enrollment | null> {
  const enrollmentId = generateEnrollmentId(orgId, userId, courseId);
  return getEnrollment(enrollmentId);
}

/**
 * Get an enrollment by ID, throwing if not found.
 */
export async function getEnrollmentOrThrow(enrollmentId: string): Promise<Enrollment> {
  const enrollment = await getEnrollment(enrollmentId);
  if (!enrollment) {
    throw new EnrollmentNotFoundError(enrollmentId);
  }
  return enrollment;
}

/**
 * Get all enrollments for a user in an organization.
 */
export async function getEnrollmentsForUser(orgId: string, userId: string): Promise<Enrollment[]> {
  const enrollmentsRef = collection(db, 'enrollments');
  const q = query(
    enrollmentsRef,
    where('orgId', '==', orgId),
    where('userId', '==', userId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Enrollment);
}

/**
 * Get all enrollments for a course.
 */
export async function getEnrollmentsForCourse(orgId: string, courseId: string): Promise<Enrollment[]> {
  const enrollmentsRef = collection(db, 'enrollments');
  const q = query(
    enrollmentsRef,
    where('orgId', '==', orgId),
    where('courseId', '==', courseId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Enrollment);
}

/**
 * Get all enrollments in an organization.
 */
export async function getEnrollmentsForOrg(orgId: string): Promise<Enrollment[]> {
  const enrollmentsRef = collection(db, 'enrollments');
  const q = query(enrollmentsRef, where('orgId', '==', orgId));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Enrollment);
}

/**
 * Get enrollments by status.
 */
export async function getEnrollmentsByStatus(
  orgId: string,
  status: EnrollmentStatus
): Promise<Enrollment[]> {
  const enrollmentsRef = collection(db, 'enrollments');
  const q = query(
    enrollmentsRef,
    where('orgId', '==', orgId),
    where('status', '==', status)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as Enrollment);
}

/**
 * Update enrollment status.
 */
export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentStatus
): Promise<void> {
  const enrollment = await getEnrollmentOrThrow(enrollmentId);
  const enrollmentRef = doc(db, 'enrollments', enrollmentId);

  const updates: Partial<Enrollment> = { status };

  if (status === 'completed') {
    updates.completedAt = serverTimestamp() as any;
  }

  await updateDoc(enrollmentRef, updates);

  if (status === 'completed') {
    await activity.courseComplete(enrollment.orgId, enrollment.userId, enrollment.courseId);

    // Observability: Critical path event
    observabilityService.logUserAction({
      orgId: enrollment.orgId,
      actorId: enrollment.userId,
      action: 'enrollment_completed',
      status: 'success',
      entityType: 'enrollment',
      entityId: enrollmentId,
      metadata: { courseId: enrollment.courseId },
    }).catch(() => {}); // Non-blocking
  }
}

/**
 * Mark an enrollment as completed.
 */
export async function completeEnrollment(enrollmentId: string): Promise<void> {
  await updateEnrollmentStatus(enrollmentId, 'completed');
}

/**
 * Withdraw from an enrollment.
 */
export async function withdrawEnrollment(
  enrollmentId: string,
  reason?: string
): Promise<void> {
  const enrollment = await getEnrollmentOrThrow(enrollmentId);
  await updateEnrollmentStatus(enrollmentId, 'withdrawn');

  await activity.enrollmentWithdraw(
    enrollment.orgId,
    enrollment.userId,
    enrollmentId,
    reason
  );
}

/**
 * Link a certificate to an enrollment.
 */
export async function linkCertificate(
  enrollmentId: string,
  certificateId: string
): Promise<void> {
  await getEnrollmentOrThrow(enrollmentId);
  const enrollmentRef = doc(db, 'enrollments', enrollmentId);

  await updateDoc(enrollmentRef, { certificateId });
}

/**
 * Bulk enroll multiple users in a course.
 * Returns list of created enrollments (skips already enrolled users).
 */
export async function bulkEnroll(
  orgId: string,
  userIds: string[],
  courseId: string,
  enrolledBy: string,
  options?: {
    dueDate?: Date;
  }
): Promise<Enrollment[]> {
  const enrollments: Enrollment[] = [];

  for (const userId of userIds) {
    const enrollment = await enroll(orgId, userId, courseId, enrolledBy, options);
    enrollments.push(enrollment);
  }

  return enrollments;
}

/**
 * Check if a user is enrolled in a course.
 */
export async function isEnrolled(
  orgId: string,
  userId: string,
  courseId: string
): Promise<boolean> {
  const enrollment = await getEnrollmentForUserCourse(orgId, userId, courseId);
  return enrollment !== null && enrollment.status !== 'withdrawn';
}

export const enrollmentService = {
  generateEnrollmentId,
  generateProgressId,
  enroll,
  getEnrollment,
  getEnrollmentForUserCourse,
  getEnrollmentOrThrow,
  getEnrollmentsForUser,
  getEnrollmentsForCourse,
  getEnrollmentsForOrg,
  getEnrollmentsByStatus,
  updateEnrollmentStatus,
  completeEnrollment,
  withdrawEnrollment,
  linkCertificate,
  bulkEnroll,
  isEnrolled,
};

export default enrollmentService;
