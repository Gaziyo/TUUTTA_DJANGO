import { apiClient } from '../lib/api';

export interface BloomAnalyticsSnapshot {
  id: string;
  bloom_level: number;
  average_score: number;
  pass_rate: number;
  attempts_count: number;
  created_at?: string;
}

export interface GapClosureSnapshot {
  id: string;
  average_gap_score: number;
  total_open: number;
  total_closed: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export const evaluateAnalyticsService = {
  listBloomSnapshots: async (orgId: string): Promise<BloomAnalyticsSnapshot[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/bloom-analytics/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as BloomAnalyticsSnapshot[];
  },

  recalcBloomSnapshots: async (orgId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/bloom-analytics/recalculate/`, { organization: orgId });
  },

  listGapClosureSnapshots: async (orgId: string): Promise<GapClosureSnapshot[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/gap-closure-snapshots/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as GapClosureSnapshot[];
  },

  recalcGapClosureSnapshots: async (orgId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/gap-closure-snapshots/recalculate/`, { organization: orgId });
  },
};

export default evaluateAnalyticsService;
