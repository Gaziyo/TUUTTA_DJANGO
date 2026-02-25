import { apiClient } from '../lib/api';

export interface GNNInsight {
  id: string;
  organization: string;
  name: string;
  insight_type: string;
  metrics: Record<string, unknown>;
  created_at?: string;
}

export const gnnInsightService = {
  listForOrg: async (orgId: string): Promise<GNNInsight[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/gnn-insights/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as GNNInsight[];
  },

  refresh: async (orgId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/gnn-insights/refresh/`, { organization: orgId });
  },
};

export default gnnInsightService;
