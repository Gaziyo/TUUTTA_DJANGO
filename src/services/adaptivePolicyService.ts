import { apiClient } from '../lib/api';

export interface AdaptivePolicy {
  id: string;
  organization: string;
  name: string;
  description?: string;
  status: string;
  current_version?: string;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface AdaptiveDecisionLog {
  id: string;
  organization: string;
  user: string;
  policy?: string;
  action_type: string;
  payload: Record<string, unknown>;
  reward?: number | null;
  created_at?: string;
}

export const adaptivePolicyService = {
  listPolicies: async (orgId: string): Promise<AdaptivePolicy[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/adaptive-policies/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as AdaptivePolicy[];
  },

  listDecisionLogs: async (orgId: string): Promise<AdaptiveDecisionLog[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/adaptive-decisions/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as AdaptiveDecisionLog[];
  },

  optimize: async (orgId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/adaptive-policies/optimize/`, { organization: orgId });
  },

  simulate: async (orgId: string, episodes: number = 30): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/adaptive-policies/simulate/`, {
      organization: orgId,
      episodes,
    });
  }
};

export default adaptivePolicyService;
