import { apiClient } from '../lib/api';

export interface RemediationTrigger {
  id: string;
  organization: string;
  competency?: string | null;
  competency_name?: string | null;
  assessment?: string | null;
  assessment_title?: string | null;
  remediation_course: string;
  remediation_course_title?: string;
  min_gap_score?: number;
  max_attempts?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export const remediationTriggerService = {
  listForOrg: async (orgId: string): Promise<RemediationTrigger[]> => {
    const { data } = await apiClient.get(`/organizations/${orgId}/remediation-triggers/`);
    const results = Array.isArray(data) ? data : (data.results ?? []);
    return results as RemediationTrigger[];
  },

  create: async (orgId: string, payload: Partial<RemediationTrigger>): Promise<RemediationTrigger> => {
    const { data } = await apiClient.post(`/organizations/${orgId}/remediation-triggers/`, {
      organization: orgId,
      ...payload,
    });
    return data as RemediationTrigger;
  },

  update: async (orgId: string, id: string, payload: Partial<RemediationTrigger>): Promise<void> => {
    await apiClient.patch(`/organizations/${orgId}/remediation-triggers/${id}/`, payload);
  },

  remove: async (orgId: string, id: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/remediation-triggers/${id}/`);
  },
};

export default remediationTriggerService;
