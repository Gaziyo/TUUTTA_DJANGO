/**
 * Activity Service — Canonical Implementation
 *
 * Writes to: /activityLog/{orgId}/events/{eventId}
 *
 * This service is fire-and-forget, never throws, never blocks.
 * All other canonical services call this on mutations.
 */

import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
  try {
    const eventsRef = collection(db, 'activityLog', orgId, 'events');
    const eventRef = doc(eventsRef);

    const event: ActivityEvent = {
      id: eventRef.id,
      orgId,
      userId,
      action,
      resourceId,
      resourceType,
      metadata,
      timestamp: serverTimestamp() as any,
    };

    await setDoc(eventRef, event);
  } catch (error) {
    // Fire-and-forget: log but don't throw
    console.warn('[activityService] Failed to log event:', action, error);
  }
}

/**
 * Get recent activity events for an organization.
 * Read by admin/manager only.
 */
export async function getRecentEvents(
  orgId: string,
  limitCount = 50
): Promise<ActivityEvent[]> {
  const eventsRef = collection(db, 'activityLog', orgId, 'events');
  const q = query(eventsRef, orderBy('timestamp', 'desc'), limit(limitCount));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as ActivityEvent);
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
