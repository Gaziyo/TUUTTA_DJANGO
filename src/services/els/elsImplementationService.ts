/**
 * ELS Implementation Service — Phase 5: Implementation
 * Creates enrollments via Django enrollments API.
 * Implementation config stored in ELSProjectPhase(implement).output_data.
 */
import { apiClient } from '@/lib/api';
import type { ELSImplementation } from '@/types/els';

export const elsImplementationService = {
  create: async (
    orgId: string,
    projectId: string,
    _userId: string,
    data: Partial<ELSImplementation>
  ): Promise<ELSImplementation> => {
    await apiClient.post(
      `/organizations/${orgId}/els-projects/${projectId}/phases/implement/complete/`,
      { output_data: data }
    );
    return { id: projectId, orgId, projectId, ...data } as ELSImplementation;
  },

  get: async (orgId: string, projectId: string): Promise<ELSImplementation | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/${projectId}/`);
      const phaseRec = (data.phase_records as Record<string, unknown>[])?.find(
        (r: Record<string, unknown>) => r.phase === 'implement'
      );
      if (!phaseRec?.output_data) return null;
      return { id: projectId, orgId, projectId, ...(phaseRec.output_data as object) } as ELSImplementation;
    } catch {
      return null;
    }
  },

  getByProject: async (orgId: string, projectId: string): Promise<ELSImplementation | null> => {
    return elsImplementationService.get(orgId, projectId);
  },

  update: async (
    orgId: string,
    projectId: string,
    _implId: string,
    _userId: string,
    updates: Partial<ELSImplementation>
  ): Promise<void> => {
    await apiClient.post(
      `/organizations/${orgId}/els-projects/${projectId}/phases/implement/complete/`,
      { output_data: updates }
    );
  },

  enrollLearners: async (
    orgId: string,
    courseId: string,
    userIds: string[],
    dueDate?: number
  ): Promise<void> => {
    await Promise.allSettled(
      userIds.map(userId =>
        apiClient.post('/enrollments/', {
          organization: orgId,
          course: courseId,
          user: userId,
          ...(dueDate ? { due_date: new Date(dueDate).toISOString() } : {}),
        })
      )
    );
  },

  delete: async (_orgId: string, _implId: string): Promise<void> => {},
  subscribe: (_orgId: string, _projectId: string, _cb: (i: ELSImplementation | null) => void) => () => {},
};
