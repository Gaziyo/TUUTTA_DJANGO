import type { GeniePipelineProject } from '../types/lms';
import * as lmsService from '../lib/lmsService';

export const pipelineService = {
  list: (orgId: string, limitCount?: number) => lmsService.getGeniePipelineProjects(orgId, limitCount),
  create: (project: Omit<GeniePipelineProject, 'id'>) => lmsService.createGeniePipelineProject(project),
  update: (projectId: string, updates: Partial<GeniePipelineProject>) =>
    lmsService.updateGeniePipelineProject(projectId, updates),
};
