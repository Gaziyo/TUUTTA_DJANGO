import { apiClient } from '../lib/api';

export interface BaselineDiagnostic {
  id: string;
  organization: string;
  name: string;
  target_type: string;
  target_id?: string;
  role_name?: string;
  assessment?: string;
  status: string;
  results: Record<string, unknown>;
  scheduled_for?: string;
  completed_at?: string;
}

export const baselineDiagnosticService = {
  listForOrg: async (orgId: string): Promise<BaselineDiagnostic[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/baseline-diagnostics/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as BaselineDiagnostic[];
  },

  create: async (orgId: string, payload: Partial<BaselineDiagnostic>): Promise<BaselineDiagnostic> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/baseline-diagnostics/`, {
      organization: orgId,
      ...payload,
    });
    return data as BaselineDiagnostic;
  },

  run: async (orgId: string, diagnosticId: string): Promise<void> => {
    await apiClient.post(`/organizations/${orgId}/baseline-diagnostics/${diagnosticId}/run/`);
  },
};

export default baselineDiagnosticService;
