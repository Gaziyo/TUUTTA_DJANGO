/**
 * Activity Service — Canonical Implementation
 *
 * Delegates all event logging to observabilityService (Django Audit Log).
 * Fire-and-forget: never throws, never blocks.
 */

import { observabilityService } from '../observabilityService';
import type { ActivityEvent, ActivityAction } from '../../types/schema';

/**
 * Log an activity event. Fire-and-forget — errors are swallowed.
 */
export async function logEvent(
  orgId: string,
  userId: string,
  action: ActivityAction,
  resourceId: string,
  resourceType: ActivityEvent['resourceType'],
  metadata: Record<string, unknown> = {}
): Promise<void> {
  observabilityService.logUserAction({
    orgId,
    actorId: userId,
    action,
    status: 'success',
    entityType: resourceType,
    entityId: resourceId,
    metadata,
  }).catch(() => {});
}

/**
 * Get recent activity events for an organization.
 * Stubbed — wire to a Django analytics endpoint in a future phase.
 */
export async function getRecentEvents(
  _orgId: string,
  _limitCount = 50
): Promise<ActivityEvent[]> {
  return [];
}

/**
 * Convenience functions for common actions
 */
export const activity = {
  logEvent,
  getRecentEvents,

  // Lesson events
  lessonView: (orgId: string, userId: string, lessonId: string) =>
    logEvent(orgId, userId, 'lesson_view', lessonId, 'lesson'),

  lessonComplete: (orgId: string, userId: string, lessonId: string, duration?: number) =>
    logEvent(orgId, userId, 'lesson_complete', lessonId, 'lesson', { duration }),

  // Course events
  courseEnroll: (orgId: string, userId: string, courseId: string, enrolledBy: string) =>
    logEvent(orgId, userId, 'course_enroll', courseId, 'course', { enrolledBy }),

  courseComplete: (orgId: string, userId: string, courseId: string) =>
    logEvent(orgId, userId, 'course_complete', courseId, 'course'),

  coursePublish: (orgId: string, userId: string, courseId: string) =>
    logEvent(orgId, userId, 'course_publish', courseId, 'course'),

  // Quiz events
  quizSubmit: (orgId: string, userId: string, assessmentId: string, score: number, passed: boolean) =>
    logEvent(orgId, userId, 'quiz_submit', assessmentId, 'assessment', { score, passed }),

  // User events
  userLogin: (orgId: string, userId: string) =>
    logEvent(orgId, userId, 'user_login', userId, 'user'),

  userRoleChange: (orgId: string, userId: string, oldRole: string, newRole: string, changedBy: string) =>
    logEvent(orgId, userId, 'user_role_change', userId, 'user', { oldRole, newRole, changedBy }),

  // Enrollment events
  enrollmentWithdraw: (orgId: string, userId: string, enrollmentId: string, reason?: string) =>
    logEvent(orgId, userId, 'enrollment_withdraw', enrollmentId, 'enrollment', { reason }),
};

export default activity;
