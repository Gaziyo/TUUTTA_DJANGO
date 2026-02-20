/**
 * Progress Service — Canonical Implementation
 *
 * Collections:
 *   /progress/{userId}_{courseId} — Summary document
 *   /progress/{userId}_{courseId}/events/{eventId} — Event subcollection
 *
 * All progress tracking goes through this service.
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
  orderBy,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type {
  ProgressSummary,
  ProgressEvent,
} from '../../types/schema';
import { activity } from './activityService';
import { enrollmentService } from './enrollmentService';
import { observabilityService } from '../observabilityService';

export class ProgressNotFoundError extends Error {
  constructor(progressId: string) {
    super(`Progress not found: ${progressId}`);
    this.name = 'ProgressNotFoundError';
  }
}

/**
 * Generate progress summary ID.
 * Format: {userId}_{courseId}
 */
export function generateProgressId(userId: string, courseId: string): string {
  return `${userId}_${courseId}`;
}

/**
 * Get progress summary for a user's course enrollment.
 */
export async function getProgress(userId: string, courseId: string): Promise<ProgressSummary | null> {
  const progressId = generateProgressId(userId, courseId);
  const progressRef = doc(db, 'progress', progressId);
  const snapshot = await getDoc(progressRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as ProgressSummary;
}

/**
 * Get progress summary, throwing if not found.
 */
export async function getProgressOrThrow(userId: string, courseId: string): Promise<ProgressSummary> {
  const progress = await getProgress(userId, courseId);
  if (!progress) {
    throw new ProgressNotFoundError(generateProgressId(userId, courseId));
  }
  return progress;
}

/**
 * Get all progress records for a user.
 */
export async function getProgressForUser(userId: string): Promise<ProgressSummary[]> {
  const progressRef = collection(db, 'progress');
  const q = query(progressRef, where('userId', '==', userId));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as ProgressSummary);
}

/**
 * Get all progress records for a course.
 */
export async function getProgressForCourse(courseId: string): Promise<ProgressSummary[]> {
  const progressRef = collection(db, 'progress');
  const q = query(progressRef, where('courseId', '==', courseId));

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as ProgressSummary);
}

/**
 * Record a lesson start event.
 */
export async function recordLessonStart(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  const progress = await getProgressOrThrow(userId, courseId);
  const progressId = progress.id;

  // Write event to subcollection
  const eventRef = doc(collection(db, 'progress', progressId, 'events'));
  const event: ProgressEvent = {
    id: eventRef.id,
    type: 'lesson_start',
    lessonId,
    moduleId: null,
    durationSeconds: 0,
    timestamp: serverTimestamp() as any,
  };

  await setDoc(eventRef, event);

  // Update summary with last lesson
  const progressRef = doc(db, 'progress', progressId);
  await updateDoc(progressRef, {
    lastLessonId: lessonId,
    updatedAt: serverTimestamp(),
  });

  // Log activity
  await activity.lessonView(progress.orgId, userId, lessonId);
}

/**
 * Record a lesson completion event.
 *
 * This is the core progress tracking function. It:
 * 1. Writes a lesson_complete event
 * 2. Updates completedLessonIds
 * 3. Recomputes percentComplete
 * 4. Checks for module completion
 * 5. Checks for course completion
 */
export async function recordLessonComplete(
  userId: string,
  courseId: string,
  lessonId: string,
  moduleId: string,
  durationSeconds: number,
  totalLessons: number,
  _totalModules: number, // Kept for API consistency
  moduleLessonIds: string[], // All lesson IDs in this module
  allModuleIds: string[] // All module IDs in the course
): Promise<{
  percentComplete: number;
  moduleCompleted: boolean;
  courseCompleted: boolean;
}> {
  const progress = await getProgressOrThrow(userId, courseId);
  const progressId = progress.id;

  // Check if already completed
  if (progress.completedLessonIds.includes(lessonId)) {
    return {
      percentComplete: progress.percentComplete,
      moduleCompleted: false,
      courseCompleted: false,
    };
  }

  // Write lesson_complete event
  const eventRef = doc(collection(db, 'progress', progressId, 'events'));
  const event: ProgressEvent = {
    id: eventRef.id,
    type: 'lesson_complete',
    lessonId,
    moduleId,
    durationSeconds,
    timestamp: serverTimestamp() as any,
  };
  await setDoc(eventRef, event);

  // Update completed lessons
  const newCompletedLessonIds = [...progress.completedLessonIds, lessonId];

  // Check for module completion
  let moduleCompleted = false;
  const newCompletedModuleIds = [...progress.completedModuleIds];

  const moduleLessonsComplete = moduleLessonIds.every(id =>
    newCompletedLessonIds.includes(id)
  );

  if (moduleLessonsComplete && !progress.completedModuleIds.includes(moduleId)) {
    moduleCompleted = true;
    newCompletedModuleIds.push(moduleId);

    // Write module_complete event
    const moduleEventRef = doc(collection(db, 'progress', progressId, 'events'));
    const moduleEvent: ProgressEvent = {
      id: moduleEventRef.id,
      type: 'module_complete',
      lessonId: null,
      moduleId,
      durationSeconds: 0,
      timestamp: serverTimestamp() as any,
    };
    await setDoc(moduleEventRef, moduleEvent);
  }

  // Calculate new percentage
  const percentComplete = Math.round((newCompletedLessonIds.length / totalLessons) * 100);

  // Check for course completion
  let courseCompleted = false;
  const allModulesComplete = allModuleIds.every(id =>
    newCompletedModuleIds.includes(id)
  );

  if (allModulesComplete && percentComplete === 100) {
    courseCompleted = true;

    // Write course_complete event
    const courseEventRef = doc(collection(db, 'progress', progressId, 'events'));
    const courseEvent: ProgressEvent = {
      id: courseEventRef.id,
      type: 'course_complete',
      lessonId: null,
      moduleId: null,
      durationSeconds: 0,
      timestamp: serverTimestamp() as any,
    };
    await setDoc(courseEventRef, courseEvent);

    // Update enrollment status
    await enrollmentService.completeEnrollment(progress.enrollmentId);
  }

  // Update summary doc
  const progressRef = doc(db, 'progress', progressId);
  await updateDoc(progressRef, {
    completedLessonIds: newCompletedLessonIds,
    completedModuleIds: newCompletedModuleIds,
    lastLessonId: lessonId,
    percentComplete,
    totalTimeSpentSeconds: progress.totalTimeSpentSeconds + durationSeconds,
    updatedAt: serverTimestamp(),
  });

  // Log activity
  await activity.lessonComplete(progress.orgId, userId, lessonId, durationSeconds);

  // Observability: Critical path events
  observabilityService.logUserAction({
    orgId: progress.orgId,
    actorId: userId,
    action: 'lesson_completed',
    status: 'success',
    entityType: 'lesson',
    entityId: lessonId,
    metadata: { courseId, moduleId, percentComplete },
  }).catch(() => {}); // Non-blocking

  if (moduleCompleted) {
    observabilityService.logUserAction({
      orgId: progress.orgId,
      actorId: userId,
      action: 'module_completed',
      status: 'success',
      entityType: 'module',
      entityId: moduleId,
      metadata: { courseId },
    }).catch(() => {}); // Non-blocking
  }

  if (courseCompleted) {
    await activity.courseComplete(progress.orgId, userId, courseId);

    observabilityService.logUserAction({
      orgId: progress.orgId,
      actorId: userId,
      action: 'course_completed',
      status: 'success',
      entityType: 'course',
      entityId: courseId,
      metadata: { enrollmentId: progress.enrollmentId },
    }).catch(() => {}); // Non-blocking
  }

  return {
    percentComplete,
    moduleCompleted,
    courseCompleted,
  };
}

/**
 * Get progress events for a user's course.
 */
export async function getProgressEvents(
  userId: string,
  courseId: string,
  limitCount = 50
): Promise<ProgressEvent[]> {
  const progressId = generateProgressId(userId, courseId);
  const eventsRef = collection(db, 'progress', progressId, 'events');
  const q = query(eventsRef, orderBy('timestamp', 'desc'));

  const snapshot = await getDocs(q);
  const events = snapshot.docs.map(doc => doc.data() as ProgressEvent);

  return events.slice(0, limitCount);
}

/**
 * Add time spent to progress (for background tracking).
 */
export async function addTimeSpent(
  userId: string,
  courseId: string,
  seconds: number
): Promise<void> {
  const progress = await getProgressOrThrow(userId, courseId);
  const progressRef = doc(db, 'progress', progress.id);

  await updateDoc(progressRef, {
    totalTimeSpentSeconds: progress.totalTimeSpentSeconds + seconds,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get the next uncompleted lesson for "Continue" functionality.
 */
export async function getNextLesson(
  userId: string,
  courseId: string,
  allLessonIds: string[] // Ordered list of all lesson IDs
): Promise<string | null> {
  const progress = await getProgress(userId, courseId);

  if (!progress) {
    // Not enrolled or no progress — return first lesson
    return allLessonIds[0] || null;
  }

  // Return the last viewed lesson, or the first uncompleted lesson
  if (progress.lastLessonId && !progress.completedLessonIds.includes(progress.lastLessonId)) {
    return progress.lastLessonId;
  }

  // Find first uncompleted lesson
  const nextLesson = allLessonIds.find(id => !progress.completedLessonIds.includes(id));
  return nextLesson || null;
}

export const progressService = {
  generateProgressId,
  getProgress,
  getProgressOrThrow,
  getProgressForUser,
  getProgressForCourse,
  recordLessonStart,
  recordLessonComplete,
  getProgressEvents,
  addTimeSpent,
  getNextLesson,
};

export default progressService;
