import type { LearningPath } from '../types/lms';
import { serviceEvents } from './events';

// Learning paths are not yet implemented in the Django backend.
// These stubs prevent Firebase crashes during migration.
export const learningPathService = {
  create: async (learningPath: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningPath> => {
    const stub: LearningPath = {
      id: `lp_${Date.now()}`,
      ...learningPath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    serviceEvents.emit('learningPath.created', { learningPathId: stub.id, orgId: stub.orgId });
    return stub;
  },

  get: async (_pathId: string): Promise<LearningPath | null> => null,

  list: async (
    _orgId: string,
    _options?: { status?: 'draft' | 'published' | 'archived'; limit?: number }
  ): Promise<LearningPath[]> => [],

  update: async (pathId: string, _updates: Partial<LearningPath>): Promise<void> => {
    serviceEvents.emit('learningPath.updated', { learningPathId: pathId });
  },

  publish: async (pathId: string): Promise<void> => {
    serviceEvents.emit('learningPath.published', { learningPathId: pathId });
  },

  archive: async (pathId: string): Promise<void> => {
    serviceEvents.emit('learningPath.archived', { learningPathId: pathId });
  },

  remove: async (pathId: string): Promise<void> => {
    serviceEvents.emit('learningPath.deleted', { learningPathId: pathId });
  },
};
