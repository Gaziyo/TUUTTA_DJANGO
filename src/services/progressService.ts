/**
 * Progress Service — Migration Adapter
 *
 * This service bridges the legacy progress tracking with the canonical
 * progressService (canonical/progressService.ts).
 *
 * Canonical architecture:
 *   /progress/{userId}_{courseId} — Summary document
 *   /progress/{userId}_{courseId}/events/{eventId} — Event subcollection
 */

import type { LessonProgressRecord } from '../types/lms';
import type { ProgressSummary, ProgressEvent } from '../types/schema';
import {
  progressService as canonical,
  courseService as canonicalCourse,
} from './canonical';
import * as lmsService from '../lib/lmsService';
import { serviceEvents } from './events';

/**
 * Convert canonical ProgressSummary to legacy format.
 */
function toLegacyProgress(
  progress: ProgressSummary,
  lessonId?: string
): LessonProgressRecord {
  return {
    id: progress.id,
    orgId: progress.orgId,
    enrollmentId: progress.enrollmentId,
    userId: progress.userId,
    courseId: progress.courseId,
    lessonId: lessonId || progress.lastLessonId || '',
    status: progress.percentComplete === 100 ? 'completed' : 'in_progress',
    progress: progress.percentComplete,
    startedAt: undefined, // Would need to look up from events
    completedAt: progress.percentComplete === 100
      ? (progress.updatedAt as any)?.toMillis?.() || Date.now()
      : undefined,
    timeSpent: progress.totalTimeSpentSeconds,
  };
}

export const progressService = {
  /**
   * Get progress summary for a user's course enrollment.
   */
  getProgress: async (userId: string, courseId: string): Promise<ProgressSummary | null> => {
    try {
      return canonical.getProgress(userId, courseId);
    } catch (error) {
      console.warn('[progressService] Error getting progress:', error);
      return null;
    }
  },

  /**
   * Get all progress records for a user.
   */
  getProgressForUser: async (userId: string): Promise<ProgressSummary[]> => {
    try {
      return canonical.getProgressForUser(userId);
    } catch (error) {
      console.warn('[progressService] Error getting progress for user:', error);
      return [];
    }
  },

  /**
   * Record lesson start.
   */
  startLesson: async (userId: string, courseId: string, lessonId: string): Promise<void> => {
    try {
      await canonical.recordLessonStart(userId, courseId, lessonId);
      serviceEvents.emit('lesson.started', { userId, courseId, lessonId });
    } catch (error) {
      console.warn('[progressService] Error recording lesson start:', error);
    }
  },

  /**
   * Record lesson completion.
   * This is the core progress tracking function.
   */
  completeLesson: async (
    userId: string,
    courseId: string,
    lessonId: string,
    moduleId: string,
    durationSeconds: number
  ): Promise<{
    percentComplete: number;
    moduleCompleted: boolean;
    courseCompleted: boolean;
  }> => {
    try {
      // Get course structure to compute completion
      const modules = await canonicalCourse.getModules(courseId);
      const allModuleIds = modules.map(m => m.id);

      // Get all lessons for this module
      const moduleLessons = await canonicalCourse.getLessons(courseId, moduleId);
      const moduleLessonIds = moduleLessons.map(l => l.id);

      // Count total lessons
      const totalLessons = await canonicalCourse.countLessons(courseId);

      const result = await canonical.recordLessonComplete(
        userId,
        courseId,
        lessonId,
        moduleId,
        durationSeconds,
        totalLessons,
        modules.length,
        moduleLessonIds,
        allModuleIds
      );

      serviceEvents.emit('lesson.completed', {
        userId,
        courseId,
        lessonId,
        percentComplete: result.percentComplete,
      });

      if (result.moduleCompleted) {
        serviceEvents.emit('module.completed', { userId, courseId, moduleId });
      }

      if (result.courseCompleted) {
        serviceEvents.emit('course.completed', { userId, courseId });
      }

      return result;
    } catch (error) {
      console.warn('[progressService] Error recording lesson complete:', error);
      return {
        percentComplete: 0,
        moduleCompleted: false,
        courseCompleted: false,
      };
    }
  },

  /**
   * Get the next uncompleted lesson for "Continue" button.
   */
  getNextLesson: async (
    userId: string,
    courseId: string
  ): Promise<string | null> => {
    try {
      // Get all lessons in order
      const allLessons = await canonicalCourse.getAllLessonsForCourse(courseId);
      const allLessonIds = allLessons.map(l => l.id);

      return canonical.getNextLesson(userId, courseId, allLessonIds);
    } catch (error) {
      console.warn('[progressService] Error getting next lesson:', error);
      return null;
    }
  },

  /**
   * Get progress events for a course.
   */
  getEvents: async (userId: string, courseId: string): Promise<ProgressEvent[]> => {
    try {
      return canonical.getProgressEvents(userId, courseId);
    } catch (error) {
      console.warn('[progressService] Error getting events:', error);
      return [];
    }
  },

  /**
   * Add time spent (for background tracking).
   */
  addTimeSpent: async (
    userId: string,
    courseId: string,
    seconds: number
  ): Promise<void> => {
    try {
      await canonical.addTimeSpent(userId, courseId, seconds);
    } catch (error) {
      console.warn('[progressService] Error adding time spent:', error);
    }
  },

  // ─── LEGACY COMPATIBILITY ────────────────────────────────────────────────────
  // These methods maintain compatibility with existing components

  /**
   * Legacy: Upsert lesson progress record.
   * Maps to canonical progress tracking.
   */
  upsert: async (
    record: Omit<LessonProgressRecord, 'id'> & { id?: string }
  ): Promise<LessonProgressRecord> => {
    // Use legacy service for direct upserts during migration
    const saved = await lmsService.upsertLessonProgress(record);
    serviceEvents.emit('progress.upserted', {
      enrollmentId: saved.enrollmentId,
      lessonId: saved.lessonId,
    });
    return saved;
  },

  /**
   * Legacy: Upsert module completion record.
   */
  upsertModuleCompletion: async (record: {
    orgId: string;
    enrollmentId: string;
    userId: string;
    userAuthId?: string;
    courseId: string;
    moduleId: string;
    status: 'completed';
    completedAt: number;
  }): Promise<void> => {
    serviceEvents.emit('module.completed', {
      enrollmentId: record.enrollmentId,
      moduleId: record.moduleId,
    });
    await lmsService.upsertModuleProgress(record);
  },
};

export default progressService;
