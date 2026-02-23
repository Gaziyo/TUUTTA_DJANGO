/**
 * LMS Notifications — stub (Firebase removed, use Django API instead)
 * All notification logic should be handled server-side via Django.
 */

import type { LMSNotification, NotificationChannel, Enrollment, Course, OrgMember } from '../types/lms';

export async function createNotification(
  _notification: Omit<LMSNotification, 'id' | 'createdAt'>
): Promise<string> {
  return '';
}

export async function getUserNotifications(
  _orgId: string,
  _userId: string,
  _limitCount?: number
): Promise<LMSNotification[]> {
  return [];
}

export async function getUnreadCount(_orgId: string, _userId: string): Promise<number> {
  return 0;
}

export async function markAsRead(_notificationId: string): Promise<void> {}

export async function markAllAsRead(_orgId: string, _userId: string): Promise<void> {}

export async function notifyTrainingAssigned(
  _orgId: string,
  _enrollment: Enrollment,
  _course: Course,
  _assignedBy: OrgMember,
  _channelsOverride?: NotificationChannel[]
): Promise<string> {
  return '';
}

export async function notifyDeadlineReminder(
  _orgId: string,
  _enrollment: Enrollment,
  _course: Course,
  _daysRemaining: number,
  _channelsOverride?: NotificationChannel[]
): Promise<string> {
  return '';
}

export async function notifyTrainingOverdue(
  _orgId: string,
  _enrollment: Enrollment,
  _course: Course,
  _daysOverdue: number,
  _channelsOverride?: NotificationChannel[]
): Promise<string> {
  return '';
}

export async function notifyCourseCompleted(
  _orgId: string,
  _enrollment: Enrollment,
  _course: Course,
  _channelsOverride?: NotificationChannel[]
): Promise<string> {
  return '';
}

export async function notifyCertificateIssued(
  _orgId: string,
  _userId: string,
  _certificateId: string,
  _courseName: string,
  _expiresAt?: number,
  _channelsOverride?: NotificationChannel[]
): Promise<string> {
  return '';
}

export async function notifyCertificateExpiring(
  _orgId: string,
  _userId: string,
  _certificateId: string,
  _courseName: string,
  _daysUntilExpiry: number,
  _channelsOverride?: NotificationChannel[]
): Promise<string> {
  return '';
}

export async function sendAnnouncement(
  _orgId: string,
  _userIds: string[],
  _title: string,
  _message: string,
  _data?: Record<string, unknown>,
  _channelsOverride?: NotificationChannel[]
): Promise<string[]> {
  return [];
}

export async function notifyFeedbackReceived(
  _orgId: string,
  _userId: string,
  _courseId: string,
  _courseName: string,
  _feedbackType: 'assignment' | 'quiz',
  _score?: number,
  _channelsOverride?: NotificationChannel[]
): Promise<string> {
  return '';
}

export async function getEnrollmentsNeedingReminders(
  _orgId: string,
  _reminderDays?: number[]
): Promise<{ enrollment: Enrollment; daysRemaining: number }[]> {
  return [];
}

export async function getOverdueEnrollments(_orgId: string): Promise<Enrollment[]> {
  return [];
}

export async function getExpiringCertificates(
  _orgId: string,
  _daysThreshold?: number
): Promise<{ certificateId: string; userId: string; courseName: string; daysUntilExpiry: number }[]> {
  return [];
}

export const NOTIFICATION_TEMPLATES = {
  enrollment_new: { icon: '📚', color: 'blue', actionLabel: 'Start Learning' },
  enrollment_reminder: { icon: '⏰', color: 'yellow', actionLabel: 'Continue' },
  enrollment_overdue: { icon: '⚠️', color: 'red', actionLabel: 'Complete Now' },
  course_completed: { icon: '🎉', color: 'green', actionLabel: 'View Certificate' },
  certificate_issued: { icon: '🏆', color: 'gold', actionLabel: 'Download' },
  certificate_expiring: { icon: '📋', color: 'orange', actionLabel: 'Renew' },
  announcement: { icon: '📢', color: 'blue', actionLabel: 'View' },
  feedback_received: { icon: '✅', color: 'green', actionLabel: 'View Feedback' },
} as const;

export type NotificationTemplate = keyof typeof NOTIFICATION_TEMPLATES;
