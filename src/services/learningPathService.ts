import type { LearningPath } from '../types/lms';
import { apiClient } from '../lib/api';
import { serviceEvents } from './events';

function mapLearningPath(raw: Record<string, unknown>, orgIdFallback?: string): LearningPath {
  const coursesRaw = Array.isArray(raw.path_courses) ? raw.path_courses : [];
  return {
    id: raw.id as string,
    orgId: (raw.organization as string) || orgIdFallback || '',
    title: (raw.title as string) || '',
    description: (raw.description as string) || '',
    thumbnail: (raw.thumbnail_url as string) || undefined,
    courses: coursesRaw.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        courseId: (row.course as string) || '',
        order: (row.order_index as number) ?? 0,
        isRequired: Boolean(row.is_required ?? true),
        unlockAfter: (row.unlock_after as string) || undefined,
      };
    }),
    certification: undefined,
    estimatedDuration: (raw.estimated_duration as number) ?? 0,
    status: ((raw.status as LearningPath['status']) || 'draft'),
    createdBy: (raw.created_by as string) || '',
    createdAt: raw.created_at ? new Date(raw.created_at as string).getTime() : Date.now(),
    updatedAt: raw.updated_at ? new Date(raw.updated_at as string).getTime() : Date.now(),
  };
}

export const learningPathService = {
  create: async (learningPath: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningPath> => {
    const payload = {
      organization: learningPath.orgId,
      title: learningPath.title,
      description: learningPath.description,
      thumbnail_url: learningPath.thumbnail || '',
      estimated_duration: learningPath.estimatedDuration,
      status: learningPath.status,
      courses: (learningPath.courses || []).map((course) => ({
        course_id: course.courseId,
        order_index: course.order,
        is_required: course.isRequired,
        unlock_after: course.unlockAfter || null,
      })),
    };

    const { data } = await apiClient.post(`/organizations/${learningPath.orgId}/learning-paths/`, payload);
    const created = mapLearningPath(data, learningPath.orgId);
    serviceEvents.emit('learningPath.created', { learningPathId: created.id, orgId: created.orgId });
    return created;
  },

  get: async (pathId: string, orgId?: string): Promise<LearningPath | null> => {
    if (!orgId) return null;
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/learning-paths/${pathId}/`);
      return mapLearningPath(data, orgId);
    } catch {
      return null;
    }
  },

  list: async (
    orgId: string,
    options?: { status?: 'draft' | 'published' | 'archived'; limit?: number }
  ): Promise<LearningPath[]> => {
    try {
      const params: Record<string, string | number> = {};
      if (options?.status) params.status = options.status;
      if (options?.limit) params.limit = options.limit;
      const { data } = await apiClient.get(`/organizations/${orgId}/learning-paths/`, { params });
      const rows: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      return rows.map((row) => mapLearningPath(row, orgId));
    } catch {
      return [];
    }
  },

  update: async (pathId: string, updates: Partial<LearningPath>): Promise<void> => {
    const orgId = updates.orgId;
    if (!orgId) {
      throw new Error('orgId is required to update a learning path');
    }
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.thumbnail !== undefined) payload.thumbnail_url = updates.thumbnail || '';
    if (updates.estimatedDuration !== undefined) payload.estimated_duration = updates.estimatedDuration;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.courses !== undefined) {
      payload.courses = updates.courses.map((course) => ({
        course_id: course.courseId,
        order_index: course.order,
        is_required: course.isRequired,
        unlock_after: course.unlockAfter || null,
      }));
    }
    await apiClient.patch(`/organizations/${orgId}/learning-paths/${pathId}/`, payload);
    serviceEvents.emit('learningPath.updated', { learningPathId: pathId });
  },

  publish: async (pathId: string, orgId?: string): Promise<void> => {
    if (!orgId) {
      throw new Error('orgId is required to publish a learning path');
    }
    await apiClient.post(`/organizations/${orgId}/learning-paths/${pathId}/publish/`, {});
    serviceEvents.emit('learningPath.published', { learningPathId: pathId });
  },

  archive: async (pathId: string, orgId?: string): Promise<void> => {
    if (!orgId) {
      throw new Error('orgId is required to archive a learning path');
    }
    await apiClient.post(`/organizations/${orgId}/learning-paths/${pathId}/archive/`, {});
    serviceEvents.emit('learningPath.archived', { learningPathId: pathId });
  },

  remove: async (pathId: string, orgId?: string): Promise<void> => {
    if (!orgId) {
      throw new Error('orgId is required to delete a learning path');
    }
    await apiClient.delete(`/organizations/${orgId}/learning-paths/${pathId}/`);
    serviceEvents.emit('learningPath.deleted', { learningPathId: pathId });
  },
};
