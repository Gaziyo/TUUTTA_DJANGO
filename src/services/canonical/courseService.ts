/**
 * Course Service — Django REST API implementation.
 *
 * All course operations go through this service using the Django backend.
 */

import { apiClient } from '../../lib/api';
import type { Course, Module, Lesson, CourseStatus } from '../../types/schema';

export class CourseNotFoundError extends Error {
  constructor(courseId: string) {
    super(`Course not found: ${courseId}`);
    this.name = 'CourseNotFoundError';
  }
}

export class ModuleNotFoundError extends Error {
  constructor(moduleId: string) {
    super(`Module not found: ${moduleId}`);
    this.name = 'ModuleNotFoundError';
  }
}

export class LessonNotFoundError extends Error {
  constructor(lessonId: string) {
    super(`Lesson not found: ${lessonId}`);
    this.name = 'LessonNotFoundError';
  }
}

// ─── COURSE OPERATIONS ────────────────────────────────────────────────────────

export async function createCourse(
  data: Omit<Course, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt'>
): Promise<Course> {
  const { data: course } = await apiClient.post('/courses/', {
    organization: data.orgId,
    title: data.title,
    description: data.description,
    status: data.status ?? 'draft',
    thumbnail_url: data.thumbnailUrl,
    estimated_duration: data.estimatedDuration ?? 0,
    tags: data.tags ?? [],
  });
  return _mapCourse(course);
}

export async function getCourse(courseId: string): Promise<Course | null> {
  try {
    const { data } = await apiClient.get(`/courses/${courseId}/`);
    return _mapCourse(data);
  } catch (e: any) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

export async function getCourseOrThrow(courseId: string): Promise<Course> {
  const course = await getCourse(courseId);
  if (!course) throw new CourseNotFoundError(courseId);
  return course;
}

export async function getCoursesByOrg(
  orgId: string,
  options?: { status?: CourseStatus }
): Promise<Course[]> {
  const params: Record<string, string> = { organization: orgId };
  if (options?.status) params.status = options.status;
  const { data } = await apiClient.get('/courses/', { params });
  const results = data.results ?? data;
  return results.map(_mapCourse);
}

export async function getPublishedCourses(orgId: string): Promise<Course[]> {
  return getCoursesByOrg(orgId, { status: 'published' });
}

export async function updateCourse(
  courseId: string,
  updates: Partial<Omit<Course, 'id' | 'orgId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.thumbnailUrl !== undefined) payload.thumbnail_url = updates.thumbnailUrl;
  if (updates.estimatedDuration !== undefined) payload.estimated_duration = updates.estimatedDuration;
  if (updates.tags !== undefined) payload.tags = updates.tags;
  await apiClient.patch(`/courses/${courseId}/`, payload);
}

export async function publishCourse(courseId: string, _publishedBy: string): Promise<void> {
  await apiClient.post(`/courses/${courseId}/publish/`);
}

export async function archiveCourse(courseId: string): Promise<void> {
  await apiClient.post(`/courses/${courseId}/archive/`);
}

export async function deleteCourse(courseId: string): Promise<void> {
  await apiClient.delete(`/courses/${courseId}/`);
}

// ─── MODULE OPERATIONS ────────────────────────────────────────────────────────

export async function createModule(
  courseId: string,
  data: Omit<Module, 'id' | 'courseId'>
): Promise<Module> {
  const { data: module } = await apiClient.post(`/courses/${courseId}/modules/`, {
    title: data.title,
    order_index: data.order,
    is_published: data.isPublished ?? false,
  });
  return _mapModule(module, courseId);
}

export async function getModule(courseId: string, moduleId: string): Promise<Module | null> {
  try {
    const { data } = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/`);
    return _mapModule(data, courseId);
  } catch (e: any) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

export async function getModules(courseId: string): Promise<Module[]> {
  const { data } = await apiClient.get(`/courses/${courseId}/modules/`);
  const results = data.results ?? data;
  return results.map((m: any) => _mapModule(m, courseId));
}

export async function updateModule(
  courseId: string,
  moduleId: string,
  updates: Partial<Omit<Module, 'id' | 'courseId' | 'orgId'>>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.order !== undefined) payload.order_index = updates.order;
  if (updates.isPublished !== undefined) payload.is_published = updates.isPublished;
  await apiClient.patch(`/courses/${courseId}/modules/${moduleId}/`, payload);
}

export async function deleteModule(courseId: string, moduleId: string): Promise<void> {
  await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/`);
}

// ─── LESSON OPERATIONS ────────────────────────────────────────────────────────

export async function createLesson(
  courseId: string,
  moduleId: string,
  data: Omit<Lesson, 'id' | 'courseId' | 'moduleId'>
): Promise<Lesson> {
  const { data: lesson } = await apiClient.post(
    `/courses/${courseId}/modules/${moduleId}/lessons/`,
    {
      title: data.title,
      lesson_type: data.type,
      order_index: data.order,
      content: data.content ?? {},
      estimated_duration: data.estimatedDuration ?? 0,
      is_published: data.isPublished ?? false,
    }
  );
  return _mapLesson(lesson, courseId, moduleId);
}

export async function getLesson(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<Lesson | null> {
  try {
    const { data } = await apiClient.get(
      `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`
    );
    return _mapLesson(data, courseId, moduleId);
  } catch (e: any) {
    if (e.response?.status === 404) return null;
    throw e;
  }
}

export async function getLessons(courseId: string, moduleId: string): Promise<Lesson[]> {
  const { data } = await apiClient.get(`/courses/${courseId}/modules/${moduleId}/lessons/`);
  const results = data.results ?? data;
  return results.map((l: any) => _mapLesson(l, courseId, moduleId));
}

export async function getAllLessonsForCourse(courseId: string): Promise<Lesson[]> {
  const modules = await getModules(courseId);
  const allLessons: Lesson[] = [];
  for (const module of modules) {
    const lessons = await getLessons(courseId, module.id);
    allLessons.push(...lessons);
  }
  return allLessons.sort((a, b) => {
    const moduleA = modules.find(m => m.id === a.moduleId);
    const moduleB = modules.find(m => m.id === b.moduleId);
    const orderA = moduleA?.order ?? 0;
    const orderB = moduleB?.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return a.order - b.order;
  });
}

export async function updateLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
  updates: Partial<Omit<Lesson, 'id' | 'courseId' | 'moduleId' | 'orgId'>>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.type !== undefined) payload.lesson_type = updates.type;
  if (updates.order !== undefined) payload.order_index = updates.order;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.estimatedDuration !== undefined) payload.estimated_duration = updates.estimatedDuration;
  await apiClient.patch(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`, payload);
}

export async function deleteLesson(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<void> {
  await apiClient.delete(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`);
}

export async function countLessons(courseId: string): Promise<number> {
  const lessons = await getAllLessonsForCourse(courseId);
  return lessons.length;
}

// ─── PRIVATE MAPPERS ──────────────────────────────────────────────────────────

function _mapCourse(d: any): Course {
  return {
    id: d.id,
    orgId: d.organization,
    title: d.title,
    description: d.description ?? '',
    status: d.status as CourseStatus,
    createdBy: d.created_by ?? '',
    instructorId: d.created_by ?? '',
    thumbnailUrl: d.thumbnail_url ?? '',
    estimatedDuration: d.estimated_duration ?? 0,
    tags: d.tags ?? [],
    publishedAt: d.published_at ?? null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function _mapModule(d: any, courseId: string): Module {
  return {
    id: d.id,
    courseId,
    orgId: d.organization ?? '',
    title: d.title,
    order: d.order_index ?? 0,
    isPublished: d.is_required ?? true,
  };
}

function _mapLesson(d: any, courseId: string, moduleId: string): Lesson {
  return {
    id: d.id,
    courseId,
    moduleId,
    orgId: '',
    title: d.title,
    type: d.lesson_type as any,
    order: d.order_index ?? 0,
    content: d.content ?? {},
    estimatedDuration: d.estimated_duration ?? 0,
    isPublished: d.is_required ?? true,
  };
}

export const courseService = {
  createCourse,
  getCourse,
  getCourseOrThrow,
  getCoursesByOrg,
  getPublishedCourses,
  updateCourse,
  publishCourse,
  archiveCourse,
  deleteCourse,
  createModule,
  getModule,
  getModules,
  updateModule,
  deleteModule,
  createLesson,
  getLesson,
  getLessons,
  getAllLessonsForCourse,
  updateLesson,
  deleteLesson,
  countLessons,
};

export default courseService;
