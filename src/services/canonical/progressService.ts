/**
 * Progress Service — Canonical Implementation
 *
 * Delegates to Django REST API:
 *   GET/PATCH /progress/      — ProgressRecord list (scoped to current user)
 *   GET/PATCH /progress/{id}/ — individual record (with nested lesson/module progress)
 *
 * All progress tracking goes through this service.
 * Components should not bypass this layer.
 */

import { apiClient } from '../../lib/api';
import type { ProgressSummary, ProgressEvent } from '../../types/schema';
import { activity } from './activityService';
import { enrollmentService } from './enrollmentService';
import { observabilityService } from '../observabilityService';

export class ProgressNotFoundError extends Error {
  constructor(progressId: string) {
    super(`Progress not found: ${progressId}`);
    this.name = 'ProgressNotFoundError';
  }
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapProgressRecord(r: Record<string, unknown>): ProgressSummary {
  const lessonProgressList = (r.lesson_progress as Record<string, unknown>[]) ?? [];
  const moduleProgressList = (r.module_progress as Record<string, unknown>[]) ?? [];

  const completedLessonIds = lessonProgressList
    .filter(lp => lp.status === 'completed')
    .map(lp => lp.lesson as string);

  const completedModuleIds = moduleProgressList
    .filter(mp => mp.status === 'completed')
    .map(mp => mp.module as string);

  // Derive lastLessonId from most recently accessed lesson
  const sortedLessons = [...lessonProgressList].sort((a, b) => {
    const aTime = a.last_accessed_at ? new Date(a.last_accessed_at as string).getTime() : 0;
    const bTime = b.last_accessed_at ? new Date(b.last_accessed_at as string).getTime() : 0;
    return bTime - aTime;
  });
  const lastLessonId = sortedLessons.length ? (sortedLessons[0].lesson as string) : undefined;

  return {
    id: r.id as string,
    orgId: '',
    userId: r.user as string,
    courseId: r.course as string,
    enrollmentId: (r.enrollment as string) || '',
    completedLessonIds,
    completedModuleIds,
    percentComplete: parseFloat(r.completion_percentage as string) || 0,
    totalTimeSpentSeconds: (r.total_time_spent as number) || 0,
    lastLessonId,
    updatedAt: r.updated_at ? new Date(r.updated_at as string).getTime() : Date.now(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateProgressId(userId: string, courseId: string): string {
  return `${userId}_${courseId}`;
}

async function fetchProgressList(): Promise<Record<string, unknown>[]> {
  const { data } = await apiClient.get('/progress/');
  return Array.isArray(data) ? data : (data.results ?? []);
}

// ─── Read operations ──────────────────────────────────────────────────────────

/**
 * Get progress summary for a user's course enrollment.
 */
export async function getProgress(userId: string, courseId: string): Promise<ProgressSummary | null> {
  try {
    const records = await fetchProgressList();
    const record = records.find(r => (r.course as string) === courseId);
    return record ? mapProgressRecord(record) : null;
  } catch {
    return null;
  }
}

/**
 * Get progress summary, throwing if not found.
 */
export async function getProgressOrThrow(userId: string, courseId: string): Promise<ProgressSummary> {
  const progress = await getProgress(userId, courseId);
  if (!progress) throw new ProgressNotFoundError(generateProgressId(userId, courseId));
  return progress;
}

/**
 * Get all progress records for a user.
 */
export async function getProgressForUser(_userId: string): Promise<ProgressSummary[]> {
  try {
    const records = await fetchProgressList();
    return records.map(mapProgressRecord);
  } catch {
    return [];
  }
}

/**
 * Get all progress records for a course.
 * Scoped to the current user — cross-user data requires admin endpoints.
 */
export async function getProgressForCourse(courseId: string): Promise<ProgressSummary[]> {
  try {
    const records = await fetchProgressList();
    return records
      .filter(r => (r.course as string) === courseId)
      .map(mapProgressRecord);
  } catch {
    return [];
  }
}

/**
 * Get progress events. Stubbed — Django ProgressEvent records are
 * not yet exposed via a list endpoint.
 */
export async function getProgressEvents(
  _userId: string,
  _courseId: string,
  _limitCount = 50
): Promise<ProgressEvent[]> {
  return [];
}

// ─── Write operations ─────────────────────────────────────────────────────────

/**
 * Record a lesson start event.
 */
export async function recordLessonStart(
  userId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  try {
    const records = await fetchProgressList();
    const record = records.find(r => (r.course as string) === courseId);
    if (!record) return;

    await apiClient.patch(`/progress/${record.id}/`, {
      last_accessed_at: new Date().toISOString(),
    });

    const progress = mapProgressRecord(record);
    await activity.lessonView(progress.orgId || '', userId, lessonId);
  } catch {
    // Fire-and-forget: progress tracking should not block the learner.
  }
}

/**
 * Record a lesson completion event.
 *
 * Updates completion_percentage and total_time_spent on the Django ProgressRecord.
 * Checks for module and course completion based on provided lesson/module ID lists.
 */
export async function recordLessonComplete(
  userId: string,
  courseId: string,
  lessonId: string,
  moduleId: string,
  durationSeconds: number,
  totalLessons: number,
  _totalModules: number,
  moduleLessonIds: string[],
  allModuleIds: string[]
): Promise<{
  percentComplete: number;
  moduleCompleted: boolean;
  courseCompleted: boolean;
}> {
  const progress = await getProgressOrThrow(userId, courseId);

  // Guard: already completed
  if (progress.completedLessonIds.includes(lessonId)) {
    return { percentComplete: progress.percentComplete, moduleCompleted: false, courseCompleted: false };
  }

  const newCompletedLessonIds = [...progress.completedLessonIds, lessonId];
  const newCompletedModuleIds = [...progress.completedModuleIds];

  // Check module completion
  let moduleCompleted = false;
  const moduleLessonsComplete = moduleLessonIds.every(id => newCompletedLessonIds.includes(id));
  if (moduleLessonsComplete && !progress.completedModuleIds.includes(moduleId)) {
    moduleCompleted = true;
    newCompletedModuleIds.push(moduleId);
  }

  // Compute new percentage
  const percentComplete = Math.round((newCompletedLessonIds.length / totalLessons) * 100);

  // Check course completion
  let courseCompleted = false;
  const allModulesComplete = allModuleIds.every(id => newCompletedModuleIds.includes(id));
  if (allModulesComplete && percentComplete === 100) {
    courseCompleted = true;
  }

  // Persist updated stats to Django
  try {
    const payload: Record<string, unknown> = {
      completion_percentage: percentComplete,
      total_time_spent: progress.totalTimeSpentSeconds + durationSeconds,
      last_accessed_at: new Date().toISOString(),
    };
    if (courseCompleted) payload.completed_at = new Date().toISOString();
    await apiClient.patch(`/progress/${progress.id}/`, payload);
  } catch {
    // Non-blocking
  }

  // Complete enrollment if course is done
  if (courseCompleted) {
    await enrollmentService.completeEnrollment(progress.enrollmentId).catch(() => {});
    await activity.courseComplete(progress.orgId || '', userId, courseId);
  }

  // Log activity
  await activity.lessonComplete(progress.orgId || '', userId, lessonId, durationSeconds);

  observabilityService.logUserAction({
    orgId: progress.orgId || '',
    actorId: userId,
    action: 'lesson_completed',
    status: 'success',
    entityType: 'lesson',
    entityId: lessonId,
    metadata: { courseId, moduleId, percentComplete },
  }).catch(() => {});

  if (moduleCompleted) {
    observabilityService.logUserAction({
      orgId: progress.orgId || '',
      actorId: userId,
      action: 'module_completed',
      status: 'success',
      entityType: 'module',
      entityId: moduleId,
      metadata: { courseId },
    }).catch(() => {});
  }

  if (courseCompleted) {
    observabilityService.logUserAction({
      orgId: progress.orgId || '',
      actorId: userId,
      action: 'course_completed',
      status: 'success',
      entityType: 'course',
      entityId: courseId,
      metadata: { enrollmentId: progress.enrollmentId },
    }).catch(() => {});
  }

  return { percentComplete, moduleCompleted, courseCompleted };
}

/**
 * Add time spent to progress.
 */
export async function addTimeSpent(
  userId: string,
  courseId: string,
  seconds: number
): Promise<void> {
  try {
    const progress = await getProgressOrThrow(userId, courseId);
    await apiClient.patch(`/progress/${progress.id}/`, {
      total_time_spent: progress.totalTimeSpentSeconds + seconds,
    });
  } catch {
    // Non-blocking
  }
}

/**
 * Get the next uncompleted lesson for "Continue" functionality.
 */
export async function getNextLesson(
  userId: string,
  courseId: string,
  allLessonIds: string[]
): Promise<string | null> {
  const progress = await getProgress(userId, courseId);

  if (!progress) return allLessonIds[0] || null;

  if (progress.lastLessonId && !progress.completedLessonIds.includes(progress.lastLessonId)) {
    return progress.lastLessonId;
  }

  return allLessonIds.find(id => !progress.completedLessonIds.includes(id)) || null;
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
