import { apiClient } from '../lib/api';

export interface AdaptiveRecommendation {
  id: string;
  organization: string;
  user: string;
  action_type: string;
  score: number;
  reason: string;
  payload: Record<string, unknown>;
  updated_at?: string;
}

export interface FailureRiskSnapshot {
  id: string;
  organization: string;
  user: string;
  course: string;
  risk_score: number;
  risk_level: string;
  reasons: string[];
  created_at?: string;
}

export const adaptiveRecommendationService = {
  listForOrg: async (orgId: string): Promise<AdaptiveRecommendation[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/adaptive-recommendations/`);
      const results = Array.isArray(data) ? data : (data.results ?? []);
      return results as AdaptiveRecommendation[];
    } catch {
      return [];
    }
  },

  recalcForOrg: async (orgId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/adaptive-recommendations/recalculate/`, {
      organization: orgId,
    });
  },

  listFailureRisks: async (orgId: string): Promise<FailureRiskSnapshot[]> => {
    try {
      const { data } = await apiClient.get(`/organizations/${orgId}/failure-risks/`);
      const results = Array.isArray(data) ? data : (data.results ?? []);
      return results as FailureRiskSnapshot[];
    } catch {
      return [];
    }
  },

  recalcFailureRisks: async (orgId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/failure-risks/recalculate/`, {
      organization: orgId,
    });
  },
};

export default adaptiveRecommendationService;
