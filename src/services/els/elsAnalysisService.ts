/**
 * ELS Analysis Service — Phase 2: Needs Analysis
 * Phase output data is stored in ELSProjectPhase.output_data via the
 * phase complete endpoint. No dedicated client-side data store needed.
 */
import { apiClient } from '@/lib/api';
import type { ELSNeedsAnalysis } from '@/types/els';

export const elsAnalysisService = {
  create: async (
    orgId: string,
    projectId: string,
    _userId: string,
    data: Partial<ELSNeedsAnalysis>
  ): Promise<ELSNeedsAnalysis> => {
    // Persist analysis as phase output_data
    await apiClient.post(
      `/organizations/${orgId}/els-projects/${projectId}/phases/analyze/complete/`,
      { output_data: data }
    );
    return { id: projectId, orgId, projectId, ...data } as ELSNeedsAnalysis;
  },

  get: async (orgId: string, projectId: string): Promise<ELSNeedsAnalysis | null> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/els-projects/${projectId}/`);
      const phaseRec = (data.phase_records as Record<string, unknown>[])?.find(
        (r: Record<string, unknown>) => r.phase === 'analyze'
      );
      if (!phaseRec?.output_data) return null;
      return { id: projectId, orgId, projectId, ...(phaseRec.output_data as object) } as ELSNeedsAnalysis;
    } catch {
      return null;
    }
  },

  update: async (
    orgId: string,
    projectId: string,
    _analysisId: string,
    _userId: string,
    updates: Partial<ELSNeedsAnalysis>
  ): Promise<void> => {
    await apiClient.post(
      `/organizations/${orgId}/els-projects/${projectId}/phases/analyze/complete/`,
      { output_data: updates }
    );
  },

  delete: async (_orgId: string, _analysisId: string): Promise<void> => {},
  subscribe: (_orgId: string, _projectId: string, _cb: (a: ELSNeedsAnalysis | null) => void) => () => {},
};
