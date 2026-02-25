import { apiClient } from '../lib/api';

export interface InterventionLog {
  id: string;
  organization: string;
  user: string;
  action_type: string;
  status: string;
  outcome: Record<string, unknown>;
  created_at?: string;
}

export const interventionService = {
  listForOrg: async (orgId: string): Promise<InterventionLog[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/intervention-logs/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as InterventionLog[];
  },

  create: async (
    orgId: string,
    payload: Partial<InterventionLog> & { user: string; action_type: string }
  ): Promise<InterventionLog> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/intervention-logs/`, {
      organization: orgId,
      ...payload,
    });
    return data as InterventionLog;
  },
};

export default interventionService;
