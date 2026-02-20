/**
 * Course Service — Migration Adapter
 *
 * This service bridges the legacy Course type (lms.ts) with the canonical
 * courseService (canonical/courseService.ts) during the migration period.
 *
 * Components continue to use the legacy Course interface, while this adapter
 * translates to/from the canonical Firestore structure.
 *
 * TODO: After migration is complete, update components to use canonical types
 * and remove this adapter.
 */

import type { Course as LegacyCourse } from '../types/lms';
import type { Course as CanonicalCourse, CourseStatus } from '../types/schema';
import {
  courseService as canonical,
  activity,
} from './canonical';
import * as lmsService from '../lib/lmsService';
import { serviceEvents } from './events';

/**
 * Convert canonical Course to legacy Course format.
 * Adds default values for fields not in canonical schema.
 */
function tolegacyCourse(course: CanonicalCourse): LegacyCourse {
  return {
    id: course.id,
    orgId: course.orgId,
    title: course.title,
    description: course.description,
    shortDescription: course.description.slice(0, 150),
    thumbnail: course.thumbnailUrl || undefined,
    category: 'General', // Default category
    tags: course.tags,
    difficulty: 'intermediate' as const, // Default
    estimatedDuration: course.estimatedDuration,
    modules: [], // Modules loaded separately from subcollection
    status: course.status,
    version: 1,
    prerequisites: [],
    learningObjectives: [],
    createdBy: course.createdBy,
    instructorId: course.instructorId || undefined,
    publishedAt: course.publishedAt ? (course.publishedAt as any).toMillis?.() || Date.now() : undefined,
    createdAt: course.createdAt ? (course.createdAt as any).toMillis?.() || Date.now() : Date.now(),
    updatedAt: course.updatedAt ? (course.updatedAt as any).toMillis?.() || Date.now() : Date.now(),
  } as LegacyCourse;
}

/**
 * Convert legacy Course input to canonical format for creation.
 */
function toCanonicalInput(course: Omit<LegacyCourse, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Omit<CanonicalCourse, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'> {
  return {
    orgId: course.orgId,
    title: course.title,
    description: course.description,
    status: course.status as CourseStatus,
    createdBy: course.createdBy || '',
    instructorId: course.instructorId || null,
    thumbnailUrl: course.thumbnail || null,
    estimatedDuration: course.estimatedDuration || 0,
    tags: course.tags || [],
  };
}

export const courseService = {
  /**
   * Create a new course.
   * Uses canonical service for Firestore write, returns legacy format.
   */
  create: async (course: Omit<LegacyCourse, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<LegacyCourse> => {
    try {
      // Use canonical service for the actual Firestore write
      const canonicalCourse = await canonical.createCourse(toCanonicalInput(course));

      // Emit event for reactivity
      serviceEvents.emit('course.created', {
        courseId: canonicalCourse.id,
        orgId: canonicalCourse.orgId,
      });

      // Return legacy format for existing components
      return tolegacyCourse(canonicalCourse);
    } catch (error) {
      // Fallback to legacy service during migration
      console.warn('[courseService] Falling back to legacy service for create:', error);
      const created = await lmsService.createCourse(course);
      serviceEvents.emit('course.created', { courseId: created.id, orgId: created.orgId });
      return created;
    }
  },

  /**
   * Get a course by ID.
   */
  get: async (courseId: string): Promise<LegacyCourse | null> => {
    try {
      const course = await canonical.getCourse(courseId);
      return course ? tolegacyCourse(course) : null;
    } catch (error) {
      console.warn('[courseService] Falling back to legacy service for get:', error);
      return lmsService.getCourse(courseId);
    }
  },

  /**
   * List courses for an organization.
   */
  list: async (
    orgId: string,
    options?: { status?: 'draft' | 'published' | 'archived'; category?: string; limit?: number }
  ): Promise<LegacyCourse[]> => {
    try {
      const courses = await canonical.getCoursesByOrg(orgId, {
        status: options?.status as CourseStatus,
      });

      let result = courses.map(tolegacyCourse);

      // Apply limit if specified
      if (options?.limit) {
        result = result.slice(0, options.limit);
      }

      return result;
    } catch (error) {
      console.warn('[courseService] Falling back to legacy service for list:', error);
      return lmsService.getCourses(orgId, options);
    }
  },

  /**
   * Get published courses for learner catalog.
   */
  getPublished: async (orgId: string): Promise<LegacyCourse[]> => {
    try {
      const courses = await canonical.getPublishedCourses(orgId);
      return courses.map(tolegacyCourse);
    } catch (error) {
      console.warn('[courseService] Falling back to legacy service for getPublished:', error);
      return lmsService.getCourses(orgId, { status: 'published' });
    }
  },

  /**
   * Update a course.
   */
  update: async (courseId: string, updates: Partial<LegacyCourse>): Promise<void> => {
    try {
      // Convert updates to canonical format
      const canonicalUpdates: Partial<CanonicalCourse> = {};

      if (updates.title !== undefined) canonicalUpdates.title = updates.title;
      if (updates.description !== undefined) canonicalUpdates.description = updates.description;
      if (updates.status !== undefined) canonicalUpdates.status = updates.status as CourseStatus;
      if (updates.instructorId !== undefined) canonicalUpdates.instructorId = updates.instructorId || null;
      if (updates.thumbnail !== undefined) canonicalUpdates.thumbnailUrl = updates.thumbnail || null;
      if (updates.estimatedDuration !== undefined) canonicalUpdates.estimatedDuration = updates.estimatedDuration;
      if (updates.tags !== undefined) canonicalUpdates.tags = updates.tags;

      await canonical.updateCourse(courseId, canonicalUpdates);
      serviceEvents.emit('course.updated', { courseId });
    } catch (error) {
      console.warn('[courseService] Falling back to legacy service for update:', error);
      await lmsService.updateCourse(courseId, updates);
      serviceEvents.emit('course.updated', { courseId });
    }
  },

  /**
   * Publish a course.
   */
  publish: async (courseId: string, publishedBy?: string): Promise<void> => {
    try {
      await canonical.publishCourse(courseId, publishedBy || '');
      serviceEvents.emit('course.published', { courseId });
    } catch (error) {
      console.warn('[courseService] Falling back to legacy service for publish:', error);
      await lmsService.publishCourse(courseId);
      serviceEvents.emit('course.published', { courseId });
    }
  },

  /**
   * Archive a course.
   */
  archive: async (courseId: string): Promise<void> => {
    try {
      await canonical.archiveCourse(courseId);
      serviceEvents.emit('course.archived', { courseId });
    } catch (error) {
      console.warn('[courseService] Falling back to legacy service for archive:', error);
      await lmsService.archiveCourse(courseId);
      serviceEvents.emit('course.archived', { courseId });
    }
  },

  /**
   * Delete a course.
   */
  remove: async (courseId: string): Promise<void> => {
    try {
      await canonical.deleteCourse(courseId);
      serviceEvents.emit('course.deleted', { courseId });
    } catch (error) {
      console.warn('[courseService] Falling back to legacy service for remove:', error);
      await lmsService.deleteCourse(courseId);
      serviceEvents.emit('course.deleted', { courseId });
    }
  },

  // ─── MODULE OPERATIONS ───────────────────────────────────────────────────────
  // These use canonical service directly since modules are now in subcollections

  /**
   * Get all modules for a course.
   */
  getModules: async (courseId: string) => {
    return canonical.getModules(courseId);
  },

  /**
   * Create a module in a course.
   */
  createModule: async (courseId: string, data: Parameters<typeof canonical.createModule>[1]) => {
    return canonical.createModule(courseId, data);
  },

  /**
   * Update a module.
   */
  updateModule: async (courseId: string, moduleId: string, updates: Parameters<typeof canonical.updateModule>[2]) => {
    return canonical.updateModule(courseId, moduleId, updates);
  },

  /**
   * Delete a module.
   */
  deleteModule: async (courseId: string, moduleId: string) => {
    return canonical.deleteModule(courseId, moduleId);
  },

  // ─── LESSON OPERATIONS ───────────────────────────────────────────────────────

  /**
   * Get all lessons for a module.
   */
  getLessons: async (courseId: string, moduleId: string) => {
    return canonical.getLessons(courseId, moduleId);
  },

  /**
   * Get all lessons for a course (across all modules).
   */
  getAllLessons: async (courseId: string) => {
    return canonical.getAllLessonsForCourse(courseId);
  },

  /**
   * Create a lesson in a module.
   */
  createLesson: async (courseId: string, moduleId: string, data: Parameters<typeof canonical.createLesson>[2]) => {
    return canonical.createLesson(courseId, moduleId, data);
  },

  /**
   * Update a lesson.
   */
  updateLesson: async (courseId: string, moduleId: string, lessonId: string, updates: Parameters<typeof canonical.updateLesson>[3]) => {
    return canonical.updateLesson(courseId, moduleId, lessonId, updates);
  },

  /**
   * Delete a lesson.
   */
  deleteLesson: async (courseId: string, moduleId: string, lessonId: string) => {
    return canonical.deleteLesson(courseId, moduleId, lessonId);
  },

  /**
   * Count total lessons in a course.
   */
  countLessons: async (courseId: string) => {
    return canonical.countLessons(courseId);
  },
};

export default courseService;
