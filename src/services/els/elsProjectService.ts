import { apiClient } from '@/lib/api';
import type { ELSProject, ELSPhase, ELSPhaseStatus } from '@/types/els';

// ─── Mappers ─────────────────────────────────────────────────────────────────

function buildPhaseMap(phaseRecords: Record<string, unknown>[]): ELSProject['phases'] {
  const PHASE_NAMES: ELSPhase[] = ['ingest', 'analyze', 'design', 'develop', 'implement', 'evaluate', 'personalize', 'portal', 'govern'];
  const phases = {} as ELSProject['phases'];
  for (const name of PHASE_NAMES) {
    const rec = (phaseRecords ?? []).find((r: Record<string, unknown>) => r.phase === name) as Record<string, unknown> | undefined;
    phases[name] = rec
      ? {
          status: (rec.status as ELSPhaseStatus['status']) ?? 'pending',
          startedAt: rec.started_at ? new Date(rec.started_at as string).getTime() : undefined,
          completedAt: rec.completed_at ? new Date(rec.completed_at as string).getTime() : undefined,
          data: (rec.output_data as unknown) ?? undefined,
        }
      : { status: 'pending' };
  }
  return phases;
}

function mapProject(data: Record<string, unknown>): ELSProject {
  return {
    id: data.id as string,
    orgId: data.organization as string,
    name: data.name as string,
    description: (data.description as string) || '',
    status: (data.status as ELSProject['status']) || 'draft',
    currentPhase: (data.current_phase as ELSPhase) || 'ingest',
    phases: buildPhaseMap((data.phase_records as Record<string, unknown>[]) ?? []),
    createdCourseIds: (data.created_course_ids as string[]) ?? [],
    createdLearningPathIds: (data.created_learning_path_ids as string[]) ?? [],
    createdAssessmentIds: (data.created_assessment_ids as string[]) ?? [],
    createdBy: (data.created_by as string) || '',
    lastModifiedBy: (data.last_modified_by as string) || '',
    createdAt: data.created_at ? new Date(data.created_at as string).getTime() : Date.now(),
    updatedAt: data.updated_at ? new Date(data.updated_at as string).getTime() : Date.now(),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const elsProjectService = {
  create: async (
    orgId: string,
    _userId: string,
    data: { name: string; description?: string }
  ): Promise<ELSProject> => {
    const { data: res } = await apiClient.post(
      `/organizations/${orgId}/els-projects/`,
      { organization: orgId, name: data.name, description: data.description ?? '' }
    );
    return mapProject(res);
  },

  get: async (orgId: string, projectId: string): Promise<ELSProject | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/${projectId}/`);
      return mapProject(data);
    } catch {
      return null;
    }
  },

  getMany: async (orgId: string, projectIds: string[]): Promise<ELSProject[]> => {
    if (!projectIds.length) return [];
    const results = await Promise.allSettled(
      projectIds.map(id => elsProjectService.get(orgId, id))
    );
    return results.flatMap(r => (r.status === 'fulfilled' && r.value ? [r.value] : []));
  },

  list: async (orgId: string, options?: { status?: ELSProject['status']; limit?: number }): Promise<ELSProject[]> => {
    try {
      const params: Record<string, string> = {};
      if (options?.status) params.status = options.status;
      const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/`, { params });
      const results: Record<string, unknown>[] = Array.isArray(data) ? data : (data.results ?? []);
      const projects = results.map(mapProject);
      return options?.limit ? projects.slice(0, options.limit) : projects;
    } catch {
      return [];
    }
  },

  update: async (
    orgId: string,
    projectId: string,
    _userId: string,
    updates: Partial<Omit<ELSProject, 'id' | 'orgId' | 'createdAt' | 'createdBy'>>
  ): Promise<void> => {
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    await apiClient.patch(`/organizations/${orgId}/els-projects/${projectId}/`, payload);
  },

  updatePhase: async (
    orgId: string,
    projectId: string,
    _userId: string,
    phase: ELSPhase,
    phaseStatus: Partial<ELSPhaseStatus>
  ): Promise<void> => {
    if (phaseStatus.status === 'in_progress') {
      await apiClient.post(`/organizations/${orgId}/els-projects/${projectId}/phases/${phase}/start/`);
    } else if (phaseStatus.status === 'completed') {
      await apiClient.post(`/organizations/${orgId}/els-projects/${projectId}/phases/${phase}/complete/`, {
        output_data: phaseStatus.data ?? {},
      });
    }
  },

  startPhase: async (orgId: string, projectId: string, _userId: string, phase: ELSPhase): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/els-projects/${projectId}/phases/${phase}/start/`);
  },

  completePhase: async (
    orgId: string,
    projectId: string,
    _userId: string,
    phase: ELSPhase,
    phaseData?: unknown
  ): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/els-projects/${projectId}/phases/${phase}/complete/`, {
      output_data: phaseData ?? {},
    });
  },

  delete: async (orgId: string, projectId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/els-projects/${projectId}/`);
  },

  linkCourse: async (orgId: string, projectId: string, courseId: string, _userId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/els-projects/${projectId}/link-course/`, { course_id: courseId });
  },

  linkLearningPath: async (orgId: string, projectId: string, learningPathId: string, _userId: string): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/els-projects/${projectId}/`, {
      created_learning_path_ids: [learningPathId],
    });
  },

  linkAssessment: async (orgId: string, projectId: string, assessmentId: string, _userId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/els-projects/${projectId}/link-assessment/`, { assessment_id: assessmentId });
  },

  archive: async (orgId: string, projectId: string, _userId: string): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/els-projects/${projectId}/`, { status: 'archived' });
  },

  activate: async (orgId: string, projectId: string, _userId: string): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/els-projects/${projectId}/`, { status: 'active' });
  },

  // Real-time subscriptions are not supported over REST — return a no-op unsubscribe.
  subscribe: (_orgId: string, _projectId: string, _callback: (p: ELSProject | null) => void) => () => {},
  subscribeToList: (_orgId: string, _callback: (p: ELSProject[]) => void) => () => {},
};
