import type { LearningPath } from '../types/lms';
import * as lmsService from '../lib/lmsService';
import { serviceEvents } from './events';

export const learningPathService = {
  create: async (learningPath: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await lmsService.createLearningPath(learningPath);
    serviceEvents.emit('learningPath.created', { learningPathId: created.id, orgId: created.orgId });
    return created;
  },
  get: (pathId: string) => lmsService.getLearningPath(pathId),
  list: (orgId: string, options?: { status?: 'draft' | 'published' | 'archived'; limit?: number }) =>
    lmsService.getLearningPaths(orgId, options),
  update: async (pathId: string, updates: Partial<LearningPath>) => {
    await lmsService.updateLearningPath(pathId, updates);
    serviceEvents.emit('learningPath.updated', { learningPathId: pathId });
  },
  publish: async (pathId: string) => {
    await lmsService.publishLearningPath(pathId);
    serviceEvents.emit('learningPath.published', { learningPathId: pathId });
  },
  archive: async (pathId: string) => {
    await lmsService.archiveLearningPath(pathId);
    serviceEvents.emit('learningPath.archived', { learningPathId: pathId });
  },
  remove: async (pathId: string) => {
    await lmsService.deleteLearningPath(pathId);
    serviceEvents.emit('learningPath.deleted', { learningPathId: pathId });
  },
};
