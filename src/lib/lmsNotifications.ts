/**
 * LMS Notifications — stub (Firebase removed, use Django API instead)
 * All notification logic should be handled server-side via Django.
 */

import type { LMSNotification, NotificationChannel, Enrollment, Course, OrgMember } from '../types/lms';
import { apiClient } from './api';

function mapNotification(n: Record<string, unknown>): LMSNotification {
  return {
    id: n.id as string,
    orgId: (n.organization as string) || '',
    userId: (n.user as string) || '',
    type: (n.notification_type as LMSNotification['type']) || 'announcement',
    title: (n.title as string) || '',
    message: (n.message as string) || '',
    data: (n.data as Record<string, unknown>) || {},
    channels: ['in_app'],
    status: (n.is_read ? 'read' : 'sent') as LMSNotification['status'],
    scheduledAt: undefined,
    sentAt: undefined,
    readAt: n.read_at ? new Date(n.read_at as string).getTime() : undefined,
    createdAt: n.created_at ? new Date(n.created_at as string).getTime() : Date.now(),
  };
}

export async function createNotification(
  notification: Omit<LMSNotification, 'id' | 'createdAt'>
): Promise<string> {
  const { data } = await apiClient.post(`/organizations/${notification.orgId}/notification-outbox/`, {
    organization: notification.orgId,
    user: notification.userId,
    notification_type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data ?? {},
    channels: notification.channels ?? ['in_app'],
  });
  return (data as { id?: string })?.id || '';
}

export async function getUserNotifications(
  orgId: string,
  _userId: string,
  _limitCount?: number
): Promise<LMSNotification[]> {
  try {
    const { data } = await apiClient.get(`/organizations/${orgId}/notifications/`);
    const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
    return results.map(mapNotification);
  } catch {
    return [];
  }
}

export async function getUnreadCount(orgId: string, _userId: string): Promise<number> {
  const notifications = await getUserNotifications(orgId, _userId);
  return notifications.filter(n => n.status !== 'read').length;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await apiClient.post(`/notifications/${notificationId}/mark_read/`);
}

export async function markAllAsRead(orgId: string, _userId: string): Promise<void> {
  await apiClient.post(`/organizations/${orgId}/notifications/mark_all_read/`, { organization: orgId });
}

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
