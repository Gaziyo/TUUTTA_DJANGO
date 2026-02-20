import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { LMSNotification, NotificationType, NotificationChannel, Enrollment, Course, OrgMember } from '../types/lms';

// Collection reference
const notificationsRef = collection(db, 'lmsNotifications');

/**
 * Create a new LMS notification
 */
export async function createNotification(
  notification: Omit<LMSNotification, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(notificationsRef, {
    ...notification,
    createdAt: Date.now()
  });
  return docRef.id;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  orgId: string,
  userId: string,
  limitCount: number = 50
): Promise<LMSNotification[]> {
  const q = query(
    notificationsRef,
    where('orgId', '==', orgId),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as LMSNotification));
}

/**
 * Get unread notifications count
 */
export async function getUnreadCount(orgId: string, userId: string): Promise<number> {
  const q = query(
    notificationsRef,
    where('orgId', '==', orgId),
    where('userId', '==', userId),
    where('status', 'in', ['pending', 'sent'])
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const docRef = doc(db, 'lmsNotifications', notificationId);
  await updateDoc(docRef, {
    status: 'read',
    readAt: Date.now()
  });
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(orgId: string, userId: string): Promise<void> {
  const q = query(
    notificationsRef,
    where('orgId', '==', orgId),
    where('userId', '==', userId),
    where('status', 'in', ['pending', 'sent'])
  );

  const snapshot = await getDocs(q);
  const batch = snapshot.docs.map(doc =>
    updateDoc(doc.ref, { status: 'read', readAt: Date.now() })
  );
  await Promise.all(batch);
}

// ============ Notification Generators ============

/**
 * Send notification when training is assigned
 */
export async function notifyTrainingAssigned(
  orgId: string,
  enrollment: Enrollment,
  course: Course,
  assignedBy: OrgMember,
  channelsOverride?: NotificationChannel[]
): Promise<string> {
  const dueText = enrollment.dueDate
    ? `Due by ${new Date(enrollment.dueDate).toLocaleDateString()}`
    : 'No deadline';

  return createNotification({
    orgId,
    userId: enrollment.userId,
    type: 'enrollment_new',
    title: 'New Training Assigned',
    message: `You have been assigned to complete "${course.title}". ${dueText}.`,
    data: {
      courseId: course.id,
      enrollmentId: enrollment.id,
      assignedBy: assignedBy.name,
      dueDate: enrollment.dueDate
    },
    channels: channelsOverride || ['in_app', 'email'],
    status: 'pending'
  });
}

/**
 * Send reminder for upcoming deadline
 */
export async function notifyDeadlineReminder(
  orgId: string,
  enrollment: Enrollment,
  course: Course,
  daysRemaining: number,
  channelsOverride?: NotificationChannel[]
): Promise<string> {
  const urgency = daysRemaining <= 1 ? 'urgent' : daysRemaining <= 3 ? 'warning' : 'info';

  return createNotification({
    orgId,
    userId: enrollment.userId,
    type: 'enrollment_reminder',
    title: daysRemaining === 0
      ? 'Training Due Today!'
      : daysRemaining === 1
        ? 'Training Due Tomorrow!'
        : `Training Due in ${daysRemaining} Days`,
    message: `"${course.title}" is ${daysRemaining === 0 ? 'due today' : `due in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}`}. You are ${enrollment.progress}% complete.`,
    data: {
      courseId: course.id,
      enrollmentId: enrollment.id,
      daysRemaining,
      progress: enrollment.progress,
      urgency
    },
    channels: channelsOverride || ['in_app', 'email'],
    status: 'pending'
  });
}

/**
 * Send notification when training is overdue
 */
export async function notifyTrainingOverdue(
  orgId: string,
  enrollment: Enrollment,
  course: Course,
  daysOverdue: number,
  channelsOverride?: NotificationChannel[]
): Promise<string> {
  return createNotification({
    orgId,
    userId: enrollment.userId,
    type: 'enrollment_overdue',
    title: 'Training Overdue',
    message: `"${course.title}" was due ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} ago. Please complete it as soon as possible.`,
    data: {
      courseId: course.id,
      enrollmentId: enrollment.id,
      daysOverdue,
      progress: enrollment.progress
    },
    channels: channelsOverride || ['in_app', 'email'],
    status: 'pending'
  });
}

/**
 * Send notification when course is completed
 */
export async function notifyCourseCompleted(
  orgId: string,
  enrollment: Enrollment,
  course: Course,
  channelsOverride?: NotificationChannel[]
): Promise<string> {
  const scoreText = enrollment.score !== undefined
    ? ` with a score of ${enrollment.score}%`
    : '';

  return createNotification({
    orgId,
    userId: enrollment.userId,
    type: 'course_completed',
    title: 'Congratulations! Course Completed',
    message: `You have successfully completed "${course.title}"${scoreText}.`,
    data: {
      courseId: course.id,
      enrollmentId: enrollment.id,
      score: enrollment.score,
      completedAt: enrollment.completedAt
    },
    channels: channelsOverride || ['in_app'],
    status: 'pending'
  });
}

/**
 * Send notification when certificate is issued
 */
export async function notifyCertificateIssued(
  orgId: string,
  userId: string,
  certificateId: string,
  courseName: string,
  expiresAt?: number,
  channelsOverride?: NotificationChannel[]
): Promise<string> {
  const expiryText = expiresAt
    ? ` Valid until ${new Date(expiresAt).toLocaleDateString()}.`
    : '';

  return createNotification({
    orgId,
    userId,
    type: 'certificate_issued',
    title: 'Certificate Issued',
    message: `Your certificate for "${courseName}" is now available.${expiryText}`,
    data: {
      certificateId,
      courseName,
      expiresAt
    },
    channels: channelsOverride || ['in_app', 'email'],
    status: 'pending'
  });
}

/**
 * Send notification when certificate is about to expire
 */
export async function notifyCertificateExpiring(
  orgId: string,
  userId: string,
  certificateId: string,
  courseName: string,
  daysUntilExpiry: number,
  channelsOverride?: NotificationChannel[]
): Promise<string> {
  return createNotification({
    orgId,
    userId,
    type: 'certificate_expiring',
    title: 'Certificate Expiring Soon',
    message: `Your certificate for "${courseName}" will expire in ${daysUntilExpiry} days. Consider renewing it.`,
    data: {
      certificateId,
      courseName,
      daysUntilExpiry
    },
    channels: channelsOverride || ['in_app', 'email'],
    status: 'pending'
  });
}

/**
 * Send announcement to multiple users
 */
export async function sendAnnouncement(
  orgId: string,
  userIds: string[],
  title: string,
  message: string,
  data?: Record<string, unknown>,
  channelsOverride?: NotificationChannel[]
): Promise<string[]> {
  const notificationIds: string[] = [];

  for (const userId of userIds) {
    const id = await createNotification({
      orgId,
      userId,
      type: 'announcement',
      title,
      message,
      data,
      channels: channelsOverride || ['in_app'],
      status: 'pending'
    });
    notificationIds.push(id);
  }

  return notificationIds;
}

/**
 * Send notification for feedback received (on assignments, quizzes)
 */
export async function notifyFeedbackReceived(
  orgId: string,
  userId: string,
  courseId: string,
  courseName: string,
  feedbackType: 'assignment' | 'quiz',
  score?: number,
  channelsOverride?: NotificationChannel[]
): Promise<string> {
  const scoreText = score !== undefined ? ` Score: ${score}%` : '';

  return createNotification({
    orgId,
    userId,
    type: 'feedback_received',
    title: 'Feedback Available',
    message: `Your ${feedbackType} in "${courseName}" has been graded.${scoreText}`,
    data: {
      courseId,
      feedbackType,
      score
    },
    channels: channelsOverride || ['in_app'],
    status: 'pending'
  });
}

// ============ Notification Scheduler Helpers ============

/**
 * Get enrollments that need reminder notifications
 * Call this from a scheduled function (e.g., daily cron job)
 */
export async function getEnrollmentsNeedingReminders(
  orgId: string,
  reminderDays: number[] = [7, 3, 1]
): Promise<{ enrollment: Enrollment; daysRemaining: number }[]> {
  const now = Date.now();
  const results: { enrollment: Enrollment; daysRemaining: number }[] = [];

  // This would typically be called with enrollments fetched from Firestore
  // The actual implementation would query enrollments with due dates

  // For each reminder day threshold, find matching enrollments
  // This is a placeholder - actual implementation would query Firestore

  return results;
}

/**
 * Get enrollments that are overdue
 */
export async function getOverdueEnrollments(orgId: string): Promise<Enrollment[]> {
  // This would query Firestore for enrollments past their due date
  // that are not completed
  return [];
}

/**
 * Get certificates about to expire
 */
export async function getExpiringCertificates(
  orgId: string,
  daysThreshold: number = 30
): Promise<{ certificateId: string; userId: string; courseName: string; daysUntilExpiry: number }[]> {
  // This would query Firestore for certificates expiring soon
  return [];
}

// ============ Notification Templates ============

export const NOTIFICATION_TEMPLATES = {
  enrollment_new: {
    icon: '📚',
    color: 'blue',
    actionLabel: 'Start Learning'
  },
  enrollment_reminder: {
    icon: '⏰',
    color: 'yellow',
    actionLabel: 'Continue'
  },
  enrollment_overdue: {
    icon: '⚠️',
    color: 'red',
    actionLabel: 'Complete Now'
  },
  course_completed: {
    icon: '🎉',
    color: 'green',
    actionLabel: 'View Certificate'
  },
  certificate_issued: {
    icon: '🏆',
    color: 'gold',
    actionLabel: 'Download'
  },
  certificate_expiring: {
    icon: '📋',
    color: 'orange',
    actionLabel: 'Renew'
  },
  announcement: {
    icon: '📢',
    color: 'blue',
    actionLabel: 'View'
  },
  feedback_received: {
    icon: '✅',
    color: 'green',
    actionLabel: 'View Feedback'
  }
} as const;

export type NotificationTemplate = keyof typeof NOTIFICATION_TEMPLATES;
