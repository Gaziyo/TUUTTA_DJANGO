/**
 * Enrollment Service — Canonical Implementation (Django API)
 *
 * Replaces the Firestore implementation.
 * Uses apiClient to call the Django REST API.
 */

import { apiClient } from '../../lib/api';
import type { Enrollment, EnrollmentStatus } from '../../types/schema';

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

/** Generate deterministic enrollment ID (kept for ID-based lookups). */
export function generateEnrollmentId(orgId: string, userId: string, courseId: string): string {
  return `${orgId}_${userId}_${courseId}`;
}

/** Generate deterministic progress summary ID. */
export function generateProgressId(userId: string, courseId: string): string {
  return `${userId}_${courseId}`;
}

function mapEnrollment(data: Record<string, unknown>): Enrollment {
  return {
    id: data.id as string,
    orgId: (data.organization as string) ?? '',
    userId: (data.user as string) ?? '',
    courseId: (data.course as string) ?? '',
    enrolledBy: (data.assigned_by as string) ?? '',
    status: (data.status as EnrollmentStatus) ?? 'active',
    enrolledAt: data.enrolled_at as any,
    completedAt: data.completed_at as any ?? null,
    dueDate: data.due_date as any ?? null,
    certificateId: null,
  };
}

/**
 * Enroll a user in a course (idempotent — returns existing if already enrolled).
 */
export async function enroll(
  orgId: string,
  userId: string,
  courseId: string,
  enrolledBy: string,
  options?: { dueDate?: Date }
): Promise<Enrollment> {
  const payload: Record<string, unknown> = {
    organization: orgId,
    user: userId,
    course: courseId,
    assigned_by: enrolledBy,
    status: 'active',
  };
  if (options?.dueDate) {
    payload.due_date = options.dueDate.toISOString();
  }
  try {
    const { data } = await apiClient.post('/enrollments/', payload);
    return mapEnrollment(data);
  } catch (err: unknown) {
    // If already enrolled, fetch the existing enrollment
    const axiosErr = err as { response?: { status: number; data?: unknown } };
    if (axiosErr?.response?.status === 400) {
      const existing = await getEnrollmentForUserCourse(orgId, userId, courseId);
      if (existing) return existing;
    }
    throw err;
  }
}

/**
 * Get an enrollment by ID.
 */
export async function getEnrollment(enrollmentId: string): Promise<Enrollment | null> {
  try {
    const { data } = await apiClient.get(`/enrollments/${enrollmentId}/`);
    return mapEnrollment(data);
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number } };
    if (axiosErr?.response?.status === 404) return null;
    throw err;
  }
}

/**
 * Get enrollment by org, user, and course.
 */
export async function getEnrollmentForUserCourse(
  orgId: string,
  userId: string,
  courseId: string
): Promise<Enrollment | null> {
  try {
    const { data } = await apiClient.get(
      `/enrollments/?organization=${orgId}&user=${userId}&course=${courseId}`
    );
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    return results[0] ? mapEnrollment(results[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Get an enrollment by ID, throwing if not found.
 */
export async function getEnrollmentOrThrow(enrollmentId: string): Promise<Enrollment> {
  const enrollment = await getEnrollment(enrollmentId);
  if (!enrollment) throw new EnrollmentNotFoundError(enrollmentId);
  return enrollment;
}

/**
 * Get all enrollments for a user in an organization.
 */
export async function getEnrollmentsForUser(orgId: string, userId: string): Promise<Enrollment[]> {
  try {
    const { data } = await apiClient.get(`/enrollments/?organization=${orgId}&user=${userId}`);
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    return results.map(mapEnrollment);
  } catch {
    return [];
  }
}

/**
 * Get all enrollments for a course.
 */
export async function getEnrollmentsForCourse(orgId: string, courseId: string): Promise<Enrollment[]> {
  try {
    const { data } = await apiClient.get(`/enrollments/?organization=${orgId}&course=${courseId}`);
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    return results.map(mapEnrollment);
  } catch {
    return [];
  }
}

/**
 * Get all enrollments in an organization.
 */
export async function getEnrollmentsForOrg(orgId: string): Promise<Enrollment[]> {
  try {
    const { data } = await apiClient.get(`/enrollments/?organization=${orgId}`);
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    return results.map(mapEnrollment);
  } catch {
    return [];
  }
}

/**
 * Get enrollments by status.
 */
export async function getEnrollmentsByStatus(
  orgId: string,
  status: EnrollmentStatus
): Promise<Enrollment[]> {
  try {
    const { data } = await apiClient.get(`/enrollments/?organization=${orgId}&status=${status}`);
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    return results.map(mapEnrollment);
  } catch {
    return [];
  }
}

/**
 * Update enrollment status.
 */
export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentStatus
): Promise<void> {
  await apiClient.patch(`/enrollments/${enrollmentId}/`, { status });
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
export async function withdrawEnrollment(enrollmentId: string, _reason?: string): Promise<void> {
  await updateEnrollmentStatus(enrollmentId, 'withdrawn');
}

/**
 * Link a certificate to an enrollment (stored server-side; no-op client-side).
 */
export async function linkCertificate(_enrollmentId: string, _certificateId: string): Promise<void> {
  // Certificate linking is handled server-side by the Django backend.
}

/**
 * Bulk enroll multiple users in a course.
 */
export async function bulkEnroll(
  orgId: string,
  userIds: string[],
  courseId: string,
  enrolledBy: string,
  options?: { dueDate?: Date }
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
export async function isEnrolled(orgId: string, userId: string, courseId: string): Promise<boolean> {
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
