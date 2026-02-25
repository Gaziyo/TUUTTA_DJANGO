/**
 * ELS Design Service — Phase 3: Course Design
 * Design blueprints are stored in ELSProjectPhase(design).output_data.
 * When finalised they create real Course + CourseModule objects.
 */
import { apiClient } from '@/lib/api';
import type { ELSCourseDesign } from '@/types/els';

export const elsDesignService = {
  create: async (
    orgId: string,
    projectId: string,
    _userId: string,
    data: Partial<ELSCourseDesign>
  ): Promise<ELSCourseDesign> => {
    await apiClient.post(
      `/organizations/${orgId}/els-projects/${projectId}/phases/design/complete/`,
      {
        output_data: data,
        bloom_distribution: (data as Record<string, unknown>).taxonomyDistribution ?? {},
      }
    );
    return { id: projectId, orgId, projectId, ...data } as ELSCourseDesign;
  },

  get: async (orgId: string, projectId: string): Promise<ELSCourseDesign | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/${projectId}/`);
      const phaseRec = (data.phase_records as Record<string, unknown>[])?.find(
        (r: Record<string, unknown>) => r.phase === 'design'
      );
      if (!phaseRec?.output_data) return null;
      return { id: projectId, orgId, projectId, ...(phaseRec.output_data as object) } as ELSCourseDesign;
    } catch {
      return null;
    }
  },

  update: async (
    orgId: string,
    projectId: string,
    _designId: string,
    _userId: string,
    updates: Partial<ELSCourseDesign>
  ): Promise<void> => {
    await apiClient.post(
      `/organizations/${orgId}/els-projects/${projectId}/phases/design/complete/`,
      { output_data: updates }
    );
  },

  delete: async (_orgId: string, _designId: string): Promise<void> => {},
  subscribe: (_orgId: string, _projectId: string, _cb: (d: ELSCourseDesign | null) => void) => () => {},
};
