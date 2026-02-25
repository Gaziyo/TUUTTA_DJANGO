import type { GeniePipelineProject } from '../types/lms';
import { elsProjectService } from './els/elsProjectService';

function toLegacyProject(p: unknown): GeniePipelineProject {
  const project = p as Record<string, unknown>;
  return {
    id: project.id as string,
    orgId: project.orgId as string,
    name: project.name as string,
    description: (project.description as string) || '',
    status: (project.status as GeniePipelineProject['status']) || 'draft',
    phases: (project.phases as GeniePipelineProject['phases']) || {},
    currentPhase: (project.currentPhase as string) || 'ingest',
    createdBy: (project.createdBy as string) || '',
    createdAt: (project.createdAt as number) || Date.now(),
    updatedAt: (project.updatedAt as number) || Date.now(),
  };
}

export const pipelineService = {
  list: async (orgId: string, limitCount?: number): Promise<GeniePipelineProject[]> => {
    const projects = await elsProjectService.list(orgId, { limit: limitCount });
    return projects.map(toLegacyProject);
  },

  create: async (project: Omit<GeniePipelineProject, 'id'>): Promise<GeniePipelineProject> => {
    const created = await elsProjectService.create(project.orgId, '', {
      name: project.name,
      description: project.description,
    });
    return toLegacyProject(created);
  },

  update: async (projectId: string, updates: Partial<GeniePipelineProject>): Promise<void> => {
    if (updates.orgId) {
      await elsProjectService.update(updates.orgId, projectId, '', updates);
    }
  },
};
